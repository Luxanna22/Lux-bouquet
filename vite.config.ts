import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import type { IncomingMessage, ServerResponse } from 'node:http';

const imageMemoryStore = new Map<string, Buffer>();

function extractPngBuffer(rawInput: string): Buffer | null {
  if (!rawInput) return null;
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

function handleBouquetImageMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void
) {
  if (!req.url || !req.url.startsWith('/api/bouquet-image')) {
    next();
    return;
  }

  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const idParam = urlObj.searchParams.get('id');
  const isDownload = urlObj.searchParams.get('download') === '1';

  if (req.method === 'GET' && idParam) {
    const buffer = imageMemoryStore.get(idParam);
    if (!buffer) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('Image not found');
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
    let rawBody = '';
    req.on('data', (chunk: Buffer) => {
      rawBody += chunk.toString();
    });
    req.on('end', () => {
      try {
        const contentType = String(req.headers['content-type'] || '');
        let imageStr = '';
        if (contentType.includes('application/json')) {
          const parsed = JSON.parse(rawBody || '{}');
          imageStr = parsed.image || '';
        } else {
          const params = new URLSearchParams(rawBody);
          imageStr = params.get('image') || '';
        }

        const buffer = extractPngBuffer(imageStr);
        if (!buffer) {
          res.statusCode = 400;
          res.end('Invalid PNG data');
          return;
        }

        const id = `bq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        imageMemoryStore.set(id, buffer);
        if (imageMemoryStore.size > 60) {
          const oldest = imageMemoryStore.keys().next().value;
          if (oldest) imageMemoryStore.delete(oldest);
        }

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
      } catch {
        res.statusCode = 500;
        res.end('Failed to process PNG');
      }
    });
    return;
  }

  next();
}

const shortCodeStore = new Map<string, string>();

function handleShortenMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void
) {
  if (!req.url || !req.url.startsWith('/api/shorten')) {
    next();
    return;
  }

  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const codeParam = urlObj.searchParams.get('c');

  if (req.method === 'GET' && codeParam) {
    const payload = shortCodeStore.get(codeParam);
    if (!payload) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ payload }));
    return;
  }

  if (req.method === 'POST') {
    let rawBody = '';
    req.on('data', (chunk: Buffer) => {
      rawBody += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(rawBody || '{}');
        const targetUrl = String(parsed.url || '').trim();
        const payload = String(parsed.payload || '').trim();
        if (!targetUrl) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Missing url' }));
          return;
        }

        const code = Math.random().toString(36).slice(2, 8);
        if (payload) {
          shortCodeStore.set(code, payload);
          if (shortCodeStore.size > 500) {
            const oldest = shortCodeStore.keys().next().value;
            if (oldest) shortCodeStore.delete(oldest);
          }
        }

        if (/^https?:\/\//i.test(targetUrl) && !targetUrl.includes('localhost')) {
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 2800);
            const resp = await fetch(
              `https://is.gd/create.php?format=simple&url=${encodeURIComponent(targetUrl)}`,
              { signal: controller.signal }
            );
            clearTimeout(timer);
            if (resp.ok) {
              const text = (await resp.text()).trim();
              if (text.startsWith('https://is.gd/')) {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({ shortUrl: text, code }));
                return;
              }
            }
          } catch {
            // Fall back to targetUrl
          }
        }

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ shortUrl: targetUrl, code }));
      } catch {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Shorten failed' }));
      }
    });
    return;
  }

  next();
}

function bouquetImageApiPlugin(): Plugin {
  return {
    name: 'bouquet-image-api',
    configureServer(server) {
      server.middlewares.use(handleBouquetImageMiddleware);
      server.middlewares.use(handleShortenMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handleBouquetImageMiddleware);
      server.middlewares.use(handleShortenMiddleware);
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), bouquetImageApiPlugin()],
});


