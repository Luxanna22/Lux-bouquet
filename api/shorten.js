import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  applySecurityHeaders,
  checkRateLimit,
  extractClientIp,
  isSuspiciousBotRequest,
  readSafeJsonBody,
} from './_lib/securityGuard.js';
import { verifyShortenCouturePermission } from './_lib/coutureGuard.js';

const shortCodeMemory = new Map();

const FIRESTORE_PROJECT_ID = 'amiable-alloy-sw1sf';
const FIRESTORE_DB_ID = 'ai-studio-luxbouquet-d9f38715-de7a-49d9-bccf-4493a2abc586';
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/${FIRESTORE_DB_ID}/documents/shared_bouquets`;

function saveShortPayload(code, payload, extra = {}) {
  const safeCode = String(code).replace(/[^0-9A-Za-z_-]/g, '');
  if (!safeCode || !payload) return;
  const entry = {
    code: safeCode,
    payload,
    voiceAudioDataUrl: extra.voiceAudioDataUrl || null,
    voiceStyle: extra.voiceStyle || null,
    voiceTitle: extra.voiceTitle || null,
    voiceDurationSec: typeof extra.voiceDurationSec === 'number' ? extra.voiceDurationSec : null
  };
  shortCodeMemory.set(safeCode, entry);
  if (shortCodeMemory.size > 1000) {
    const oldest = shortCodeMemory.keys().next().value;
    if (oldest) shortCodeMemory.delete(oldest);
  }
  try {
    const filePath = path.join(os.tmpdir(), `bq_short_${safeCode}.json`);
    fs.writeFileSync(filePath, JSON.stringify(entry), 'utf-8');
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
    const jsonPath = path.join(os.tmpdir(), `bq_short_${safeCode}.json`);
    if (fs.existsSync(jsonPath)) {
      const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      if (parsed && parsed.payload) {
        shortCodeMemory.set(safeCode, parsed);
        return parsed;
      }
    }
    const txtPath = path.join(os.tmpdir(), `bq_short_${safeCode}.txt`);
    if (fs.existsSync(txtPath)) {
      const data = fs.readFileSync(txtPath, 'utf-8').trim();
      if (data) {
        const entry = { code: safeCode, payload: data };
        shortCodeMemory.set(safeCode, entry);
        return entry;
      }
    }
  } catch {
    // Ignore tmp read errors
  }
  return null;
}

async function fetchFromFirestoreRest(code) {
  const safeCode = String(code).replace(/[^0-9A-Za-z_-]/g, '');
  if (!safeCode || safeCode.length < 7 || safeCode.length > 24) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    const resp = await fetch(`${FIRESTORE_BASE_URL}/${encodeURIComponent(safeCode)}`, {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!resp.ok) return null;
    const docJson = await resp.json();
    const fields = docJson?.fields;
    if (!fields || !fields.payload?.stringValue) return null;
    return {
      code: safeCode,
      payload: fields.payload.stringValue,
      voiceAudioDataUrl: fields.voiceAudioDataUrl?.stringValue || null,
      voiceStyle: fields.voiceStyle?.stringValue || null,
      voiceTitle: fields.voiceTitle?.stringValue || null,
      voiceDurationSec:
        fields.voiceDurationSec?.integerValue !== undefined
          ? Number(fields.voiceDurationSec.integerValue)
          : fields.voiceDurationSec?.doubleValue !== undefined
          ? Number(fields.voiceDurationSec.doubleValue)
          : null,
      openCount:
        fields.openCount?.integerValue !== undefined
          ? Number(fields.openCount.integerValue)
          : 0,
      voicePlayCount:
        fields.voicePlayCount?.integerValue !== undefined
          ? Number(fields.voicePlayCount.integerValue)
          : 0,
      reaction: fields.reaction?.stringValue || null,
      recipientReply: fields.recipientReply?.stringValue || null,
      repliedAt: fields.repliedAt?.stringValue || null
    };
  } catch {
    return null;
  }
}

function stripInlineAudioFromCompactPayload(payload) {
  if (!payload || typeof payload !== 'string') return '';
  return payload.replace(/(&v=)([^&]*)/, (_match, prefix, vBody) => {
    const parts = vBody.split('~');
    if (parts.length >= 7 && parts[6]) {
      parts[6] = '';
    }
    return `${prefix}${parts.join('~')}`;
  });
}

async function saveToFirestoreRest(code, payload, extra = {}) {
  const safeCode = String(code).replace(/[^0-9A-Za-z_-]/g, '');
  if (!safeCode || safeCode.length < 7 || safeCode.length > 24 || !payload) return false;
  try {
    const cleanPayload =
      extra.voiceAudioDataUrl && typeof extra.voiceAudioDataUrl === 'string'
        ? stripInlineAudioFromCompactPayload(String(payload))
        : String(payload);
    const fields = {
      code: { stringValue: safeCode },
      payload: { stringValue: cleanPayload.slice(0, 900000) },
      createdAt: { stringValue: new Date().toISOString() }
    };
    if (extra.voiceAudioDataUrl && typeof extra.voiceAudioDataUrl === 'string') {
      fields.voiceAudioDataUrl = { stringValue: extra.voiceAudioDataUrl.slice(0, 900000) };
    }
    if (extra.voiceStyle && typeof extra.voiceStyle === 'string') {
      fields.voiceStyle = { stringValue: extra.voiceStyle.slice(0, 32) };
    }
    if (extra.voiceTitle && typeof extra.voiceTitle === 'string') {
      fields.voiceTitle = { stringValue: extra.voiceTitle.slice(0, 64) };
    }
    if (typeof extra.voiceDurationSec === 'number' && Number.isFinite(extra.voiceDurationSec)) {
      fields.voiceDurationSec = {
        integerValue: String(Math.max(0, Math.min(600, Math.round(extra.voiceDurationSec))))
      };
    }
    if (typeof extra.isPremium === 'boolean') {
      fields.isPremium = { booleanValue: extra.isPremium };
    }
    if (typeof extra.retentionDays === 'number' && Number.isFinite(extra.retentionDays)) {
      fields.retentionDays = {
        integerValue: String(Math.max(1, Math.min(36500, Math.round(extra.retentionDays))))
      };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    // Check if document already exists so we preserve immutable createdAt and recipient engagement fields if updating
    const existingResp = await fetch(`${FIRESTORE_BASE_URL}/${encodeURIComponent(safeCode)}`, {
      method: 'GET',
      signal: controller.signal
    });
    if (existingResp.ok) {
      const existingDoc = await existingResp.json();
      const exFields = existingDoc?.fields;
      if (exFields?.createdAt?.stringValue) {
        fields.createdAt = { stringValue: exFields.createdAt.stringValue };
      }
      if (exFields?.openCount?.integerValue !== undefined) {
        fields.openCount = { integerValue: String(exFields.openCount.integerValue) };
      }
      if (exFields?.voicePlayCount?.integerValue !== undefined) {
        fields.voicePlayCount = { integerValue: String(exFields.voicePlayCount.integerValue) };
      }
      if (exFields?.reaction?.stringValue !== undefined) {
        fields.reaction = { stringValue: exFields.reaction.stringValue };
      }
      if (exFields?.recipientReply?.stringValue !== undefined) {
        fields.recipientReply = { stringValue: exFields.recipientReply.stringValue };
      }
      if (exFields?.repliedAt?.stringValue !== undefined) {
        fields.repliedAt = { stringValue: exFields.repliedAt.stringValue };
      }
      if (!fields.isPremium && exFields?.isPremium?.booleanValue !== undefined) {
        fields.isPremium = { booleanValue: Boolean(exFields.isPremium.booleanValue) };
      }
      if (!fields.retentionDays && exFields?.retentionDays?.integerValue !== undefined) {
        fields.retentionDays = { integerValue: String(exFields.retentionDays.integerValue) };
      }
    }
    const resp = await fetch(`${FIRESTORE_BASE_URL}/${encodeURIComponent(safeCode)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
      signal: controller.signal
    });
    clearTimeout(timer);
    return resp.ok;
  } catch {
    return false;
  }
}

const GARLAND_FEED_DOC_CODE = 'sab_garland_feed_v1';
const GARLAND_FEED_IMMUTABLE_CREATED_AT = '2026-11-08T00:00:00.000Z';
const GARLAND_FEED_IMMUTABLE_PAYLOAD = '#sab_garland_feed_v1';

function stripInlinePhotosFromCompactPayloadServer(payload) {
  if (!payload || typeof payload !== 'string') return '';
  return payload.replace(/(&c=)([^&]*)/, (_match, prefix, cBody) => {
    const parts = cBody.split('~');
    for (let i = 3; i < parts.length; i++) {
      if (parts[i] && parts[i].startsWith('data:image/')) {
        parts[i] = '';
      }
    }
    return `${prefix}${parts.join('~')}`;
  });
}

async function publishToGarlandFeedRest(code, payload, garlandEntry) {
  const safeCode = String(code).replace(/[^0-9A-Za-z_-]/g, '');
  if (!safeCode || !garlandEntry || garlandEntry.isDraft || garlandEntry.pinToShowcase === false) {
    return false;
  }
  if (garlandEntry.lockMode && garlandEntry.lockMode !== 'none') {
    return false;
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    const feedUrl = `${FIRESTORE_BASE_URL}/${GARLAND_FEED_DOC_CODE}`;
    const existingResp = await fetch(feedUrl, {
      method: 'GET',
      signal: controller.signal,
    });

    let preservedCreatedAt = GARLAND_FEED_IMMUTABLE_CREATED_AT;
    let preservedPayload = GARLAND_FEED_IMMUTABLE_PAYLOAD;
    let existingList = [];

    if (existingResp.ok) {
      const existingDoc = await existingResp.json();
      const exFields = existingDoc?.fields;
      if (exFields?.createdAt?.stringValue && exFields.createdAt.stringValue.length >= 10) {
        preservedCreatedAt = exFields.createdAt.stringValue;
      }
      if (exFields?.payload?.stringValue && exFields.payload.stringValue.length >= 3) {
        preservedPayload = exFields.payload.stringValue;
      }
      if (exFields?.voiceAudioDataUrl?.stringValue) {
        try {
          const parsed = JSON.parse(exFields.voiceAudioDataUrl.stringValue);
          if (Array.isArray(parsed)) {
            existingList = parsed.filter(
              (item) =>
                item &&
                typeof item.code === 'string' &&
                !item.isDraft &&
                item.pinToShowcase !== false
            );
          }
        } catch {
          existingList = [];
        }
      }
    }

    const replaceCode =
      typeof garlandEntry.replaceCode === 'string' && garlandEntry.replaceCode.trim()
        ? garlandEntry.replaceCode.trim()
        : null;

    const cleanDraftPayload = stripInlineAudioFromCompactPayload(
      String(garlandEntry.draftPayload || payload || '')
    );

    const compactEntry = {
      code: safeCode,
      to: String(garlandEntry.to || garlandEntry.recipientName || 'Someone Special').slice(0, 80),
      from: String(garlandEntry.from || garlandEntry.senderName || 'Yours').slice(0, 80),
      recipientName: String(garlandEntry.recipientName || garlandEntry.to || 'Someone Special').slice(0, 80),
      senderName: String(garlandEntry.senderName || garlandEntry.from || 'Yours').slice(0, 80),
      createdAt:
        typeof garlandEntry.createdAt === 'string' && garlandEntry.createdAt.length >= 10
          ? garlandEntry.createdAt
          : new Date().toISOString(),
      shareUrl: String(garlandEntry.shareUrl || `/${safeCode}`).slice(0, 240),
      lockMode: 'none',
      hasVoice: Boolean(garlandEntry.hasVoice),
      flowerCount: typeof garlandEntry.flowerCount === 'number' ? garlandEntry.flowerCount : 1,
      isPremium: Boolean(garlandEntry.isPremium),
      retentionDays: typeof garlandEntry.retentionDays === 'number' ? garlandEntry.retentionDays : 30,
      isDraft: false,
      pinToShowcase: true,
      draftPayload: cleanDraftPayload,
    };

    const seenCodes = new Set([safeCode]);
    const merged = [compactEntry];
    for (const item of existingList) {
      if (!item || typeof item.code !== 'string') continue;
      if (seenCodes.has(item.code)) continue;
      if (replaceCode && item.code === replaceCode) continue;
      seenCodes.add(item.code);
      merged.push(item);
      if (merged.length >= 24) break;
    }

    let jsonStr = JSON.stringify(merged);
    if (jsonStr.length > 720000) {
      for (let i = 3; i < merged.length; i++) {
        merged[i] = {
          ...merged[i],
          draftPayload: stripInlinePhotosFromCompactPayloadServer(merged[i].draftPayload),
        };
      }
      jsonStr = JSON.stringify(merged);
    }
    if (jsonStr.length > 880000) {
      for (let i = 0; i < merged.length; i++) {
        merged[i] = {
          ...merged[i],
          draftPayload: stripInlinePhotosFromCompactPayloadServer(merged[i].draftPayload),
        };
      }
      jsonStr = JSON.stringify(merged);
    }
    if (jsonStr.length > 880000) {
      clearTimeout(timer);
      return false;
    }

    const fields = {
      code: { stringValue: GARLAND_FEED_DOC_CODE },
      payload: { stringValue: preservedPayload },
      createdAt: { stringValue: preservedCreatedAt },
      voiceAudioDataUrl: { stringValue: jsonStr },
    };

    const patchResp = await fetch(feedUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    return patchResp.ok;
  } catch {
    return false;
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
    bucket: req.method === 'POST' ? 'api_shorten_write' : 'api_shorten_read',
    maxRequests: req.method === 'POST' ? 25 : 90,
    windowMs: 60_000,
  });
  res.setHeader('X-RateLimit-Remaining', String(rateCheck.remaining));
  if (!rateCheck.allowed) {
    res.statusCode = 429;
    res.setHeader('Retry-After', String(rateCheck.retryAfterSec));
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        error: 'Too many requests. Please wait a moment and try again.',
      })
    );
    return;
  }

  const urlObj = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const codeParam = (urlObj.searchParams.get('c') || '').replace(/[^0-9A-Za-z_-]/g, '');

  if (req.method === 'GET' && codeParam) {
    // 1. Check in-memory and /tmp cache first
    let entry = loadLocalShortPayload(codeParam);

    // 2. Query persistent Firebase Firestore database (preserves full voiceAudioDataUrl across Vercel cold starts)
    if (!entry || !entry.payload) {
      const firestoreEntry = await fetchFromFirestoreRest(codeParam);
      if (firestoreEntry && firestoreEntry.payload) {
        entry = firestoreEntry;
        saveShortPayload(codeParam, firestoreEntry.payload, firestoreEntry);
      }
    }

    // 3. Fallback to is.gd slug if needed
    if (!entry || !entry.payload) {
      try {
        const slug = `bq_${codeParam}`;
        const lookup = await fetch(`https://is.gd/${slug}`, { redirect: 'manual' });
        const loc = lookup.headers.get('location') || '';
        const hashIdx = loc.indexOf('#');
        if (hashIdx !== -1) {
          const payload = loc.slice(hashIdx);
          entry = { code: codeParam, payload };
          saveShortPayload(codeParam, payload);
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
    res.setHeader('Cache-Control', 'public, max-age=86400');
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
    return;
  }

  if (req.method === 'POST') {
    try {
      const parsedBody = await readSafeJsonBody(req, 1200 * 1024);
      if (!parsedBody.ok) {
        res.statusCode = parsedBody.status;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: parsedBody.error }));
        return;
      }

      const botCheck = isSuspiciousBotRequest(req, parsedBody.body);
      if (botCheck.suspicious) {
        res.statusCode = 403;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: 'Suspicious automated request blocked.' }));
        return;
      }

      const bodyObj = parsedBody.body || {};

      const code = String(bodyObj.code || '').replace(/[^0-9A-Za-z_-]/g, '');
      const payload = String(bodyObj.payload || '').trim();
      const origin = String(bodyObj.origin || '').replace(/\/+$/, '');
      const extra = {
        voiceAudioDataUrl: bodyObj.voiceAudioDataUrl || null,
        voiceStyle: bodyObj.voiceStyle || null,
        voiceTitle: bodyObj.voiceTitle || null,
        voiceDurationSec:
          typeof bodyObj.voiceDurationSec === 'number' ? bodyObj.voiceDurationSec : null,
        isPremium: typeof bodyObj.isPremium === 'boolean' ? bodyObj.isPremium : undefined,
        retentionDays:
          typeof bodyObj.retentionDays === 'number' ? bodyObj.retentionDays : undefined
      };

      if (!code || !payload) {
        res.statusCode = 400;
        res.end(JSON.stringify({ error: 'Missing code or payload' }));
        return;
      }

      const coutureCheck = await verifyShortenCouturePermission(bodyObj);
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

      extra.isPremium = coutureCheck.isPremium;
      extra.retentionDays = coutureCheck.retentionDays;

      saveShortPayload(code, payload, extra);

      // 1. Persist full bouquet & voice recording to Firebase Firestore
      await saveToFirestoreRest(code, payload, extra);

      // 1b. If the user ticked "Pin to Lace Garland", also persist to `shared_bouquets/sab_garland_feed_v1`
      // on the server so shared creations (including resumed & sealed drafts) are guaranteed to appear for all users.
      if (
        bodyObj.garlandEntry &&
        typeof bodyObj.garlandEntry === 'object' &&
        bodyObj.garlandEntry.pinToShowcase !== false &&
        (!bodyObj.garlandEntry.lockMode || bodyObj.garlandEntry.lockMode === 'none')
      ) {
        await publishToGarlandFeedRest(code, payload, bodyObj.garlandEntry).catch(() => {});
      }

      // 2. Also keep secondary is.gd backup
      const normalizedPayload = payload.startsWith('#') ? payload : `#${payload}`;
      const safeIsGdPayload =
        normalizedPayload.length > 3200
          ? normalizedPayload.replace(/&v=[^&]*/, (m) => m.split('~').slice(0, 6).join('~'))
          : normalizedPayload;
      const vaultUrl = `https://flowers-for-you.local/${safeIsGdPayload}`;
      const slug = `bq_${code}`;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 2000);
        await fetch(
          `https://is.gd/create.php?format=simple&shorturl=${encodeURIComponent(slug)}&url=${encodeURIComponent(vaultUrl)}`,
          { signal: controller.signal }
        );
        clearTimeout(timer);
      } catch {
        // Firestore and local cache already saved
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
