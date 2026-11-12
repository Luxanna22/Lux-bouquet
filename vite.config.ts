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

interface ShortCodeEntry {
  code: string;
  payload: string;
  voiceAudioDataUrl?: string | null;
  voiceStyle?: string | null;
  voiceTitle?: string | null;
  voiceDurationSec?: number | null;
}

const shortCodeStore = new Map<string, ShortCodeEntry>();
const FIRESTORE_PROJECT_ID = 'amiable-alloy-sw1sf';
const FIRESTORE_DB_ID = 'ai-studio-luxbouquet-d9f38715-de7a-49d9-bccf-4493a2abc586';
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/${FIRESTORE_DB_ID}/documents/shared_bouquets`;

async function fetchFromFirestoreRest(code: string): Promise<ShortCodeEntry | null> {
  if (!code || code.length < 7 || code.length > 24) return null;
  try {
    const resp = await fetch(`${FIRESTORE_BASE_URL}/${encodeURIComponent(code)}`);
    if (!resp.ok) return null;
    const docJson = (await resp.json()) as {
      fields?: Record<string, { stringValue?: string; integerValue?: string; doubleValue?: number }>;
    };
    const fields = docJson?.fields;
    if (!fields || !fields.payload?.stringValue) return null;
    return {
      code,
      payload: fields.payload.stringValue,
      voiceAudioDataUrl: fields.voiceAudioDataUrl?.stringValue || null,
      voiceStyle: fields.voiceStyle?.stringValue || null,
      voiceTitle: fields.voiceTitle?.stringValue || null,
      voiceDurationSec:
        fields.voiceDurationSec?.integerValue !== undefined
          ? Number(fields.voiceDurationSec.integerValue)
          : fields.voiceDurationSec?.doubleValue !== undefined
          ? Number(fields.voiceDurationSec.doubleValue)
          : null
    };
  } catch {
    return null;
  }
}

async function saveToFirestoreRest(code: string, entry: ShortCodeEntry): Promise<boolean> {
  if (!code || code.length < 7 || code.length > 24 || !entry.payload) return false;
  try {
    const fields: Record<string, Record<string, string>> = {
      code: { stringValue: code },
      payload: { stringValue: entry.payload.slice(0, 900000) },
      createdAt: { stringValue: new Date().toISOString() }
    };
    if (entry.voiceAudioDataUrl) {
      fields.voiceAudioDataUrl = { stringValue: entry.voiceAudioDataUrl.slice(0, 900000) };
    }
    if (entry.voiceStyle) {
      fields.voiceStyle = { stringValue: entry.voiceStyle.slice(0, 32) };
    }
    if (entry.voiceTitle) {
      fields.voiceTitle = { stringValue: entry.voiceTitle.slice(0, 64) };
    }
    if (typeof entry.voiceDurationSec === 'number' && Number.isFinite(entry.voiceDurationSec)) {
      fields.voiceDurationSec = {
        integerValue: String(Math.max(0, Math.min(600, Math.round(entry.voiceDurationSec))))
      };
    }
    const existingResp = await fetch(`${FIRESTORE_BASE_URL}/${encodeURIComponent(code)}`);
    if (existingResp.ok) {
      const existingDoc = (await existingResp.json()) as {
        fields?: { createdAt?: { stringValue?: string } };
      };
      if (existingDoc?.fields?.createdAt?.stringValue) {
        fields.createdAt = { stringValue: existingDoc.fields.createdAt.stringValue };
      }
    }
    const resp = await fetch(`${FIRESTORE_BASE_URL}/${encodeURIComponent(code)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields })
    });
    return resp.ok;
  } catch {
    return false;
  }
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

  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const codeParam = (urlObj.searchParams.get('c') || '').replace(/[^0-9A-Za-z_-]/g, '');

  if (req.method === 'GET' && codeParam) {
    (async () => {
      let entry = shortCodeStore.get(codeParam) || null;
      if (!entry) {
        entry = await fetchFromFirestoreRest(codeParam);
        if (entry) {
          shortCodeStore.set(codeParam, entry);
        }
      }
      if (!entry) {
        try {
          const slug = `bq_${codeParam}`;
          const lookup = await fetch(`https://is.gd/${slug}`, { redirect: 'manual' });
          const loc = lookup.headers.get('location') || '';
          const hashIdx = loc.indexOf('#');
          if (hashIdx !== -1) {
            entry = { code: codeParam, payload: loc.slice(hashIdx) };
            shortCodeStore.set(codeParam, entry);
          }
        } catch {
          // Ignore network error
        }
      }
      if (!entry || !entry.payload) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: 'Not found' }));
        return;
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(
        JSON.stringify({
          code: codeParam,
          payload: entry.payload,
          voiceAudioDataUrl: entry.voiceAudioDataUrl || null,
          voiceStyle: entry.voiceStyle || null,
          voiceTitle: entry.voiceTitle || null,
          voiceDurationSec: entry.voiceDurationSec ?? null
        })
      );
    })();
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
        const code = String(parsed.code || '').replace(/[^0-9A-Za-z_-]/g, '');
        const payload = String(parsed.payload || '').trim();
        const origin = String(parsed.origin || '').replace(/\/+$/, '');
        if (!code || !payload) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Missing code or payload' }));
          return;
        }

        // @ts-expect-error Shared ESM guard in /api/_lib/coutureGuard.js
        const { verifyShortenCouturePermission } = await import('./api/_lib/coutureGuard.js');
        const coutureCheck = await verifyShortenCouturePermission(parsed);
        if (!coutureCheck.ok) {
          res.statusCode = coutureCheck.statusCode || 403;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(
            JSON.stringify({
              error:
                coutureCheck.error ||
                'This bouquet requires a verified Bloom Key before saving.',
            })
          );
          return;
        }

        const entry: ShortCodeEntry = {
          code,
          payload,
          voiceAudioDataUrl: parsed.voiceAudioDataUrl || null,
          voiceStyle: parsed.voiceStyle || null,
          voiceTitle: parsed.voiceTitle || null,
          voiceDurationSec:
            typeof parsed.voiceDurationSec === 'number' ? parsed.voiceDurationSec : null
        };

        shortCodeStore.set(code, entry);
        if (shortCodeStore.size > 1000) {
          const oldest = shortCodeStore.keys().next().value;
          if (oldest) shortCodeStore.delete(oldest);
        }

        await saveToFirestoreRest(code, entry);

        const shortUrl = origin ? `${origin}/${code}` : `/${code}`;
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ code, shortUrl }));
      } catch {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Shorten failed' }));
      }
    });
    return;
  }

  next();
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


