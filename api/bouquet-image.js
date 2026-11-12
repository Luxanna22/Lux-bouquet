import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  applySecurityHeaders,
  checkRateLimit,
  extractClientIp,
} from './_lib/securityGuard.js';

const memoryStore = new Map();
const MAX_PNG_BUFFER_BYTES = 5 * 1024 * 1024; // 5 MB max PNG binary size

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'amiable-alloy-sw1sf';
const FIRESTORE_DATABASE_ID =
  process.env.FIRESTORE_DATABASE_ID || 'ai-studio-luxbouquet-d9f38715-de7a-49d9-bccf-4493a2abc586';
const FIRESTORE_REST_BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/${FIRESTORE_DATABASE_ID}/documents/shared_bouquets`;

async function saveBuffer(id, buffer) {
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

  // Persist to Firestore so cross-instance GET /api/bouquet-image?id=... or post-deploy downloads never 404
  try {
    const safeId = String(id).replace(/[^a-zA-Z0-9_-]/g, '');
    const b64 = buffer.toString('base64');
    if (safeId.length >= 7 && safeId.length <= 24 && b64.length > 0 && b64.length <= 880000) {
      const url = `${FIRESTORE_REST_BASE_URL}?documentId=${encodeURIComponent(safeId)}`;
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            code: { stringValue: safeId },
            payload: { stringValue: '#sab_png_stage_v1' },
            createdAt: { stringValue: new Date().toISOString() },
            voiceAudioDataUrl: { stringValue: b64 },
          },
        }),
      });
    }
  } catch {
    // Ignore Firestore fallback errors
  }
}

async function loadBuffer(id) {
  if (memoryStore.has(id)) {
    return memoryStore.get(id);
  }
  const safeId = String(id).replace(/[^a-zA-Z0-9_-]/g, '');
  try {
    const filePath = path.join(os.tmpdir(), `bouquet_${safeId}.png`);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath);
    }
  } catch {
    // Ignore tmp read errors
  }

  // Fallback to Firestore if the GET request hit a different serverless instance or followed a redeploy
  if (safeId.length >= 7 && safeId.length <= 24) {
    try {
      const response = await fetch(`${FIRESTORE_REST_BASE_URL}/${encodeURIComponent(safeId)}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      if (response.ok) {
        const doc = await response.json();
        const b64 = doc?.fields?.voiceAudioDataUrl?.stringValue;
        if (typeof b64 === 'string' && b64.length > 0) {
          const buf = Buffer.from(b64, 'base64');
          memoryStore.set(safeId, buf);
          return buf;
        }
      }
    } catch {
      // Ignore Firestore read errors
    }
  }
  return null;
}

function isPngMagicBuffer(buf) {
  if (!buf || buf.length < 16 || buf.length > MAX_PNG_BUFFER_BYTES) return false;
  return (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  );
}

function extractBase64Png(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') return null;
  const trimmed = rawInput.trim();
  const base64Part = trimmed.includes('base64,')
    ? trimmed.slice(trimmed.indexOf('base64,') + 7)
    : trimmed;
  if (!base64Part || base64Part.length > 7_200_000) return null;
  try {
    const buf = Buffer.from(base64Part, 'base64');
    return isPngMagicBuffer(buf) ? buf : null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  applySecurityHeaders(res);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const clientIp = extractClientIp(req);
  const rateCheck = checkRateLimit({
    ip: clientIp,
    bucket: req.method === 'POST' ? 'api_bouquet_image_write' : 'api_bouquet_image_read',
    maxRequests: req.method === 'POST' ? 20 : 90,
    windowMs: 60_000,
  });
  res.setHeader('X-RateLimit-Remaining', String(rateCheck.remaining));
  if (!rateCheck.allowed) {
    res.statusCode = 429;
    res.setHeader('Retry-After', String(rateCheck.retryAfterSec));
    res.end('Too many image requests. Please wait a moment and try again.');
    return;
  }

  const urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const idParam = urlObj.searchParams.get('id');
  const isDownload = urlObj.searchParams.get('download') === '1';

  if (req.method === 'GET' && idParam) {
    const buffer = await loadBuffer(idParam);
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
        const id = `bq_${Date.now()}_${Math.random().toString(36).slice(2, 8).padEnd(6, '0')}`;
        await saveBuffer(id, buffer);
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
        let totalBytes = 0;
        let tooLarge = false;
        await new Promise((resolve, reject) => {
          req.on('data', (chunk) => {
            if (tooLarge) return;
            totalBytes += chunk.length;
            if (totalBytes > 7_500_000) {
              tooLarge = true;
              resolve();
              return;
            }
            rawBody += chunk.toString();
          });
          req.on('end', resolve);
          req.on('error', reject);
        });
        if (tooLarge) {
          res.statusCode = 413;
          res.end('Image payload exceeds the 5 MB limit');
          return;
        }
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

      const id = `bq_${Date.now()}_${Math.random().toString(36).slice(2, 8).padEnd(6, '0')}`;
      await saveBuffer(id, buffer);

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
