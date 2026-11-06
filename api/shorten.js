import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const shortCodeMemory = new Map();

function saveShortPayload(code, payload) {
  const safeCode = String(code).replace(/[^0-9A-Za-z_-]/g, '');
  if (!safeCode || !payload) return;
  shortCodeMemory.set(safeCode, payload);
  if (shortCodeMemory.size > 1000) {
    const oldest = shortCodeMemory.keys().next().value;
    if (oldest) shortCodeMemory.delete(oldest);
  }
  try {
    const filePath = path.join(os.tmpdir(), `bq_short_${safeCode}.txt`);
    fs.writeFileSync(filePath, payload, 'utf-8');
  } catch {
    // Ignore tmp write errors
  }
}

function loadLocalShortPayload(code) {
  const safeCode = String(code).replace(/[^0-9A-Za-z_-]/g, '');
  if (!safeCode) return null;
  if (shortCodeMemory.has(safeCode)) {
    return shortCodeMemory.get(safeCode);
  }
  try {
    const filePath = path.join(os.tmpdir(), `bq_short_${safeCode}.txt`);
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8').trim();
      if (data) {
        shortCodeMemory.set(safeCode, data);
        return data;
      }
    }
  } catch {
    // Ignore tmp read errors
  }
  return null;
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
  const codeParam = (urlObj.searchParams.get('c') || '').replace(/[^0-9A-Za-z_-]/g, '');

  if (req.method === 'GET' && codeParam) {
    // 1. Check in-memory and /tmp cache first
    let payload = loadLocalShortPayload(codeParam);

    // 2. If serverless instance cold-started, recover payload from permanent KV slug backup
    if (!payload) {
      try {
        const slug = `bq_${codeParam}`;
        const lookup = await fetch(`https://is.gd/${slug}`, { redirect: 'manual' });
        const loc = lookup.headers.get('location') || '';
        const hashIdx = loc.indexOf('#');
        if (hashIdx !== -1) {
          payload = loc.slice(hashIdx);
          saveShortPayload(codeParam, payload);
        }
      } catch {
        // Ignore network error
      }
    }

    if (!payload) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.end(JSON.stringify({ code: codeParam, payload }));
    return;
  }

  if (req.method === 'POST') {
    try {
      let bodyObj = {};
      if (req.body && typeof req.body === 'object') {
        bodyObj = req.body;
      } else {
        let raw = '';
        await new Promise((resolve, reject) => {
          req.on('data', (chunk) => {
            raw += chunk.toString();
          });
          req.on('end', resolve);
          req.on('error', reject);
        });
        bodyObj = JSON.parse(raw || '{}');
      }

      const code = String(bodyObj.code || '').replace(/[^0-9A-Za-z_-]/g, '');
      const payload = String(bodyObj.payload || '').trim();
      const origin = String(bodyObj.origin || '').replace(/\/+$/, '');

      if (!code || !payload) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Missing code or payload' }));
        return;
      }

      saveShortPayload(code, payload);

      // Persist in background KV slug so cold starts on Vercel never lose the short code
      const normalizedPayload = payload.startsWith('#') ? payload : `#${payload}`;
      const vaultUrl = `https://flowers-for-you.local/${normalizedPayload}`;
      const slug = `bq_${code}`;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 2500);
        await fetch(
          `https://is.gd/create.php?format=simple&shorturl=${encodeURIComponent(slug)}&url=${encodeURIComponent(vaultUrl)}`,
          { signal: controller.signal }
        );
        clearTimeout(timer);
      } catch {
        // Local memory and /tmp already saved
      }

      const shortUrl = origin ? `${origin}/${code}` : `/${code}`;
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ code, shortUrl }));
      return;
    } catch {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'Failed to register short code' }));
      return;
    }
  }

  res.statusCode = 405;
  res.end('Method not allowed');
}
