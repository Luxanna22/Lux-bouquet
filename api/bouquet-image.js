import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const memoryStore = new Map();

function saveBuffer(id, buffer) {
  memoryStore.set(id, buffer);
  // Keep memory store bounded
  if (memoryStore.size > 60) {
    const oldestKey = memoryStore.keys().next().value;
    if (oldestKey) memoryStore.delete(oldestKey);
  }
  try {
    const filePath = path.join(os.tmpdir(), `bouquet_${id}.png`);
    fs.writeFileSync(filePath, buffer);
  } catch {
    // Ignore tmp write errors
  }
}

function loadBuffer(id) {
  if (memoryStore.has(id)) {
    return memoryStore.get(id);
  }
  try {
    const safeId = String(id).replace(/[^a-zA-Z0-9_-]/g, '');
    const filePath = path.join(os.tmpdir(), `bouquet_${safeId}.png`);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath);
    }
  } catch {
    // Ignore tmp read errors
  }
  return null;
}

function extractBase64Png(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') return null;
  const trimmed = rawInput.trim();
  const base64Part = trimmed.includes('base64,')
    ? trimmed.slice(trimmed.indexOf('base64,') + 7)
    : trimmed;
  if (!base64Part) return null;
  try {
    return Buffer.from(base64Part, 'base64');
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const idParam = urlObj.searchParams.get('id');
  const isDownload = urlObj.searchParams.get('download') === '1';

  if (req.method === 'GET' && idParam) {
    const buffer = loadBuffer(idParam);
    if (!buffer) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('Image expired or not found');
      return;
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', String(buffer.length));
    res.setHeader(
      'Content-Disposition',
      isDownload ? 'attachment; filename="bouquet.png"' : 'inline; filename="bouquet.png"'
    );
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.end(buffer);
    return;
  }

  if (req.method === 'POST') {
    try {
      let rawBody = '';
      if (typeof req.body === 'string') {
        rawBody = req.body;
      } else if (req.body && typeof req.body === 'object') {
        const imgField = req.body.image;
        const buffer = extractBase64Png(imgField);
        if (!buffer) {
          res.statusCode = 400;
          res.end('Invalid image payload');
          return;
        }
        const id = `bq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        saveBuffer(id, buffer);
        if (isDownload) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'image/png');
          res.setHeader('Content-Length', String(buffer.length));
          res.setHeader('Content-Disposition', 'attachment; filename="bouquet.png"');
          res.setHeader('Cache-Control', 'no-store');
          res.end(buffer);
          return;
        }
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(
          JSON.stringify({
            id,
            url: `/api/bouquet-image?id=${id}`,
            downloadUrl: `/api/bouquet-image?id=${id}&download=1`
          })
        );
        return;
      } else {
        await new Promise((resolve, reject) => {
          req.on('data', (chunk) => {
            rawBody += chunk.toString();
          });
          req.on('end', resolve);
          req.on('error', reject);
        });
      }

      let imageStr = '';
      const contentType = String(req.headers['content-type'] || '');
      if (contentType.includes('application/json')) {
        const parsed = JSON.parse(rawBody || '{}');
        imageStr = parsed.image || '';
      } else {
        const params = new URLSearchParams(rawBody);
        imageStr = params.get('image') || '';
      }

      const buffer = extractBase64Png(imageStr);
      if (!buffer) {
        res.statusCode = 400;
        res.end('Invalid PNG data');
        return;
      }

      const id = `bq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      saveBuffer(id, buffer);

      if (isDownload) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Length', String(buffer.length));
        res.setHeader('Content-Disposition', 'attachment; filename="bouquet.png"');
        res.setHeader('Cache-Control', 'no-store');
        res.end(buffer);
        return;
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(
        JSON.stringify({
          id,
          url: `/api/bouquet-image?id=${id}`,
          downloadUrl: `/api/bouquet-image?id=${id}&download=1`
        })
      );
      return;
    } catch (err) {
      res.statusCode = 500;
      res.end('Failed to process PNG image');
      return;
    }
  }

  res.statusCode = 405;
  res.end('Method not allowed');
}
