import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { handlePaymentApiMiddleware } from './src/server/paymentApiMiddleware';

const imageMemoryStore = new Map<string, Buffer>();

function extractPngBuffer(rawInput: string): Buffer | null {
  if (!rawInput) return null;
  const trimmed = rawInput.trim();
  const base64Part = trimmed.includes('base64,')
    ? trimmed.slice(trimmed.indexOf('base64,') + 7)
    : trimmed;
  if (!base64Part || base64Part.length > 7_200_000) return null;
  try {
    const buf = Buffer.from(base64Part, 'base64');
    if (
      buf.length < 16 ||
      buf.length > 5 * 1024 * 1024 ||
      buf[0] !== 0x89 ||
      buf[1] !== 0x50 ||
      buf[2] !== 0x4e ||
      buf[3] !== 0x47
    ) {
      return null;
    }
    return buf;
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

function handleShortenMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void
) {
  if (!req.url || !req.url.startsWith('/api/shorten')) {
    next();
    return;
  }

  (async () => {
    try {
      // @ts-expect-error Shared serverless handler in /api/shorten.js
      const { default: shortenHandler } = await import('./api/shorten.js');
      await shortenHandler(req, res);
    } catch {
      if (!res.writableEnded) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: 'Shorten service unavailable' }));
      }
    }
  })();
}

function handlePaymentsMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void
) {
  handlePaymentApiMiddleware(req, res)
    .then((handled) => {
      if (!handled) next();
    })
    .catch(() => {
      next();
    });
}

function handleContactMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void
) {
  const isContactRoute = Boolean(req.url && req.url.startsWith('/api/contact'));
  const isBouquetEmailRoute = Boolean(req.url && req.url.startsWith('/api/send-bouquet-email'));

  if (!isContactRoute && !isBouquetEmailRoute) {
    next();
    return;
  }

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
    return;
  }

  let rawBody = '';
  let byteCount = 0;
  let tooLarge = false;
  req.on('data', (chunk: Buffer) => {
    if (tooLarge) return;
    byteCount += chunk.length;
    if (byteCount > 32 * 1024) {
      tooLarge = true;
      return;
    }
    rawBody += chunk.toString();
  });
  req.on('end', async () => {
    if (tooLarge) {
      res.statusCode = 413;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ ok: false, error: 'Request payload exceeds maximum allowed size.' }));
      return;
    }
    try {
      // @ts-expect-error Shared ESM handler in /api/_lib/contactHandler.js
      const { processContactSubmission, processBouquetEmailDelivery } = await import('./api/_lib/contactHandler.js');
      // @ts-expect-error Shared ESM security guard in /api/_lib/securityGuard.js
      const { applySecurityHeaders, checkRateLimit, extractClientIp, isSuspiciousBotRequest, sanitizeJsonValue } = await import('./api/_lib/securityGuard.js');
      applySecurityHeaders(res);
      const clientIp = extractClientIp(req);
      const rateCheck = checkRateLimit({
        ip: clientIp,
        bucket: isBouquetEmailRoute ? 'api_send_bouquet_email' : 'api_contact',
        maxRequests: isBouquetEmailRoute ? 8 : 6,
        windowMs: 60_000,
      });
      if (!rateCheck.allowed) {
        res.statusCode = 429;
        res.setHeader('Retry-After', String(rateCheck.retryAfterSec));
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ ok: false, error: 'Too many requests in a short time. Please wait a minute and try again.' }));
        return;
      }
      const parsed = sanitizeJsonValue(JSON.parse(rawBody || '{}'));
      const botCheck = isSuspiciousBotRequest(req, parsed);
      if (botCheck.suspicious) {
        res.statusCode = 403;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ ok: false, error: 'Automated or suspicious request blocked by studio security.' }));
        return;
      }
      const result = isBouquetEmailRoute
        ? await processBouquetEmailDelivery(parsed)
        : await processContactSubmission(parsed);
      res.statusCode = result.statusCode;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(result.body));
    } catch {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ ok: false, error: 'Unable to send email right now.' }));
    }
  });
}

function bouquetImageApiPlugin(): Plugin {
  return {
    name: 'bouquet-image-api',
    configureServer(server) {
      server.middlewares.use(handlePaymentsMiddleware);
      server.middlewares.use(handleContactMiddleware);
      server.middlewares.use(handleBouquetImageMiddleware);
      server.middlewares.use(handleShortenMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handlePaymentsMiddleware);
      server.middlewares.use(handleContactMiddleware);
      server.middlewares.use(handleBouquetImageMiddleware);
      server.middlewares.use(handleShortenMiddleware);
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), bouquetImageApiPlugin()],
});


