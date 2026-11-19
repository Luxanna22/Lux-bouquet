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
import {
  OWNER_DELETED_BOUQUET_CODES,
  recordBouquetInAdminLogServer,
  registerSharedBouquetGiftOfferServer,
} from './_lib/paymentHandler.js';
import {
  collectAssetIdsFromBouquetRecordServer,
  extractOverflowAssetsFromPayloadServer,
  inspectPayloadAssetsSummaryServer,
  MAX_GARLAND_FEED_ENTRIES,
  rehydrateBouquetRecordWithAssetsServer,
  sanitizeGarlandPreviewPayloadServer,
  stripInlineAudioFromCompactPayloadServer,
  stripInlinePhotosFromCompactPayloadServer,
} from './_lib/bouquetAssetsHelper.js';

import {
  fetchBouquetFromBlob,
  fetchGarlandFeedStateWithStatusFromBlob,
  isVercelBlobConfigured,
  saveBouquetToBlob,
  saveGarlandFeedToBlob,
  upsertGarlandFeedInBlob,
} from './_lib/blobStorage.js';

const shortCodeMemory = new Map();
let garlandFeedMemoryCache = { entries: null, fetchedAt: 0 };
const GARLAND_CACHE_TTL_MS = 45_000;

const FIRESTORE_PROJECT_ID = 'amiable-alloy-sw1sf';
const FIRESTORE_DB_ID = 'ai-studio-luxbouquet-d9f38715-de7a-49d9-bccf-4493a2abc586';
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/${FIRESTORE_DB_ID}/documents/shared_bouquets`;
const FIRESTORE_ASSETS_URL = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/${FIRESTORE_DB_ID}/documents/bouquet_assets`;

export function clearShortCodeMemoryForTesting() {
  shortCodeMemory.clear();
  garlandFeedMemoryCache = { entries: null, fetchedAt: 0 };
}

export function invalidateGarlandFeedMemoryCache() {
  garlandFeedMemoryCache = { entries: null, fetchedAt: 0 };
}

function evictLocalShortPayload(code) {
  const safeCode = String(code || '').replace(/[^0-9A-Za-z_-]/g, '');
  if (!safeCode) return;
  shortCodeMemory.delete(safeCode);
  try {
    const jsonPath = path.join(os.tmpdir(), `bq_short_${safeCode}.json`);
    if (fs.existsSync(jsonPath)) fs.unlinkSync(jsonPath);
    const txtPath = path.join(os.tmpdir(), `bq_short_${safeCode}.txt`);
    if (fs.existsSync(txtPath)) fs.unlinkSync(txtPath);
  } catch {
    // Ignore tmp unlink errors
  }
}

function saveShortPayload(code, payload, extra = {}) {
  const safeCode = String(code).replace(/[^0-9A-Za-z_-]/g, '');
  if (!safeCode || !payload) return;
  const entry = {
    code: safeCode,
    payload,
    voiceAudioDataUrl: extra.voiceAudioDataUrl || null,
    voiceStyle: extra.voiceStyle || null,
    voiceTitle: extra.voiceTitle || null,
    voiceDurationSec: typeof extra.voiceDurationSec === 'number' ? extra.voiceDurationSec : null,
    isPremium: typeof extra.isPremium === 'boolean' ? extra.isPremium : undefined,
    retentionDays: typeof extra.retentionDays === 'number' ? extra.retentionDays : undefined,
    createdAt: typeof extra.createdAt === 'string' ? extra.createdAt : undefined,
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

export async function fetchFromFirestoreRest(code) {
  const safeCode = String(code).replace(/[^0-9A-Za-z_-]/g, '');
  if (!safeCode || safeCode.length < 7 || safeCode.length > 24) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    const resp = await fetch(`${FIRESTORE_BASE_URL}/${encodeURIComponent(safeCode)}`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!resp.ok) return null;
    const docJson = await resp.json();
    const fields = docJson?.fields;
    if (!fields || !fields.payload?.stringValue) return null;

    let payload = fields.payload.stringValue;
    let voiceAudioDataUrl = fields.voiceAudioDataUrl?.stringValue || null;

    // Transparently re-hydrate any overflow companion `bouquet_assets/{assetId}` docs
    const assetIds = collectAssetIdsFromBouquetRecordServer(payload, voiceAudioDataUrl);
    if (assetIds.length > 0) {
      const assetMap = {};
      await Promise.all(
        assetIds.map(async (assetId) => {
          try {
            const aCtrl = new AbortController();
            const aTimer = setTimeout(() => aCtrl.abort(), 4000);
            const aResp = await fetch(`${FIRESTORE_ASSETS_URL}/${encodeURIComponent(assetId)}`, {
              method: 'GET',
              signal: aCtrl.signal,
            });
            clearTimeout(aTimer);
            if (!aResp.ok) return;
            const aDoc = await aResp.json().catch(() => null);
            const dataUrl = aDoc?.fields?.dataUrl?.stringValue;
            if (typeof dataUrl === 'string' && dataUrl.length > 0) {
              assetMap[assetId] = dataUrl;
            }
          } catch {
            // Ignore individual asset fetch errors
          }
        })
      );
      const hydrated = rehydrateBouquetRecordWithAssetsServer(payload, voiceAudioDataUrl, assetMap);
      payload = hydrated.payload;
      voiceAudioDataUrl = hydrated.voiceAudioDataUrl;
    }

    return {
      code: safeCode,
      payload,
      voiceAudioDataUrl,
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
      repliedAt: fields.repliedAt?.stringValue || null,
      isPremium:
        fields.isPremium?.booleanValue !== undefined
          ? Boolean(fields.isPremium.booleanValue)
          : undefined,
      retentionDays:
        fields.retentionDays?.integerValue !== undefined
          ? Number(fields.retentionDays.integerValue)
          : undefined,
      createdAt: fields.createdAt?.stringValue || null,
    };
  } catch {
    return null;
  }
}

async function saveOverflowAssetToFirestoreRest(asset) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    const resp = await fetch(
      `${FIRESTORE_ASSETS_URL}/${encodeURIComponent(asset.assetId)}?currentDocument.exists=false`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            assetId: { stringValue: asset.assetId },
            bouquetCode: { stringValue: asset.bouquetCode },
            kind: { stringValue: asset.kind },
            dataUrl: { stringValue: asset.dataUrl },
            createdAt: { stringValue: asset.createdAt },
          },
        }),
        signal: controller.signal,
      }
    );
    clearTimeout(timer);
    // 409 ALREADY_EXISTS / 412 FAILED_PRECONDITION means this immutable asset was already persisted (e.g. by client SDK)
    return resp.ok || resp.status === 409 || resp.status === 412;
  } catch {
    return false;
  }
}

export async function saveToFirestoreRest(code, payload, extra = {}) {
  const safeCode = String(code).replace(/[^0-9A-Za-z_-]/g, '');
  if (!safeCode || safeCode.length < 7 || safeCode.length > 24 || safeCode.startsWith('sab_') || !payload) {
    return { ok: false, assetIds: [] };
  }
  try {
    const cleanPayload =
      extra.voiceAudioDataUrl && typeof extra.voiceAudioDataUrl === 'string'
        ? stripInlineAudioFromCompactPayloadServer(String(payload))
        : String(payload);

    // Zero-read create-once write: directly attempt create with `?currentDocument.exists=false`
    // so new bouquet shares spend 0 Firestore read units and can still persist even if daily read units are exhausted!
    const createdAt = new Date().toISOString();

    // Automatically offload overflow photos/voice into eternal companion `bouquet_assets/{assetId}` docs
    // so multi-photo + voice bouquets NEVER fail Firestore's 1 MiB document size ceiling.
    const split = extractOverflowAssetsFromPayloadServer(
      safeCode,
      cleanPayload,
      extra.voiceAudioDataUrl || null,
      { createdAt }
    );

    if (split.assets.length > 0) {
      const assetResults = await Promise.all(
        split.assets.map((asset) => saveOverflowAssetToFirestoreRest(asset))
      );
      if (assetResults.some((ok) => !ok)) {
        return { ok: false, assetIds: split.assets.map((a) => a.assetId) };
      }
    }

    const fields = {
      code: { stringValue: safeCode },
      payload: { stringValue: split.payload.slice(0, 900000) },
      createdAt: { stringValue: createdAt },
    };
    if (split.voiceAudioDataUrl && typeof split.voiceAudioDataUrl === 'string') {
      fields.voiceAudioDataUrl = { stringValue: split.voiceAudioDataUrl.slice(0, 900000) };
    }
    if (extra.voiceStyle && typeof extra.voiceStyle === 'string') {
      fields.voiceStyle = { stringValue: extra.voiceStyle.slice(0, 32) };
    }
    if (extra.voiceTitle && typeof extra.voiceTitle === 'string') {
      fields.voiceTitle = { stringValue: extra.voiceTitle.slice(0, 64) };
    }
    if (typeof extra.voiceDurationSec === 'number' && Number.isFinite(extra.voiceDurationSec)) {
      fields.voiceDurationSec = {
        integerValue: String(Math.max(0, Math.min(600, Math.round(extra.voiceDurationSec)))),
      };
    }
    if (typeof extra.isPremium === 'boolean') {
      fields.isPremium = { booleanValue: extra.isPremium };
    }
    if (typeof extra.retentionDays === 'number' && Number.isFinite(extra.retentionDays)) {
      fields.retentionDays = {
        integerValue: String(Math.max(1, Math.min(36500, Math.round(extra.retentionDays)))),
      };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    const resp = await fetch(
      `${FIRESTORE_BASE_URL}/${encodeURIComponent(safeCode)}?currentDocument.exists=false`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
        signal: controller.signal,
      }
    );
    clearTimeout(timer);
    return {
      ok: resp.ok || resp.status === 409 || resp.status === 412,
      assetIds: split.assets.map((a) => a.assetId),
    };
  } catch {
    return { ok: false, assetIds: [] };
  }
}

const GARLAND_FEED_DOC_CODE = 'sab_garland_feed_v1';
const GARLAND_FEED_IMMUTABLE_CREATED_AT = '2026-11-08T00:00:00.000Z';
const GARLAND_FEED_IMMUTABLE_PAYLOAD = '#sab_garland_feed_v1';

export async function publishToGarlandFeedRest(code, payload, garlandEntry, maxRetries = 3) {
  const safeCode = String(code).replace(/[^0-9A-Za-z_-]/g, '');
  if (
    !safeCode ||
    safeCode.startsWith('draft_') ||
    safeCode.startsWith('sab_') ||
    !garlandEntry ||
    garlandEntry.isDraft !== false ||
    garlandEntry.pinToShowcase !== true ||
    typeof garlandEntry.shareUrl !== 'string' ||
    garlandEntry.shareUrl.trim().length === 0
  ) {
    return false;
  }

  const feedUrl = `${FIRESTORE_BASE_URL}/${GARLAND_FEED_DOC_CODE}`;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4500);
      const existingResp = await fetch(feedUrl, {
        method: 'GET',
        signal: controller.signal,
      });

      // CRITICAL SAFETY GUARD: Never overwrite the Garland feed if a transient non-404 read failed!
      if (!existingResp.ok && existingResp.status !== 404) {
        clearTimeout(timer);
        return false;
      }

      let remoteExists = false;
      let remoteUpdateTime = '';
      let preservedCreatedAt = GARLAND_FEED_IMMUTABLE_CREATED_AT;
      let preservedPayload = GARLAND_FEED_IMMUTABLE_PAYLOAD;
      let existingList = [];

      if (existingResp.ok) {
        remoteExists = true;
        const existingDoc = await existingResp.json();
        remoteUpdateTime = typeof existingDoc?.updateTime === 'string' ? existingDoc.updateTime : '';
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
                  !item.code.startsWith('draft_') &&
                  !item.code.startsWith('sab_') &&
                  item.isDraft === false &&
                  item.pinToShowcase === true
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

      const cleanDraftPayload = sanitizeGarlandPreviewPayloadServer(
        String(garlandEntry.draftPayload || payload || '')
      );

      const maxExistingTime = existingList.reduce(
        (max, item) => Math.max(max, Date.parse(item?.createdAt || '') || 0),
        0
      );
      const entryTime = Date.parse(garlandEntry.createdAt || '') || 0;
      const normalizedCreatedAt = new Date(
        Math.max(entryTime, Date.now(), maxExistingTime + 1000)
      ).toISOString();

      const compactEntry = {
        code: safeCode,
        to: String(garlandEntry.to || garlandEntry.recipientName || 'Someone Special').slice(0, 80),
        from: String(garlandEntry.from || garlandEntry.senderName || 'Yours').slice(0, 80),
        recipientName: String(garlandEntry.recipientName || garlandEntry.to || 'Someone Special').slice(0, 80),
        senderName: String(garlandEntry.senderName || garlandEntry.from || 'Yours').slice(0, 80),
        createdAt: normalizedCreatedAt,
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
        if (merged.length >= MAX_GARLAND_FEED_ENTRIES) break;
      }

      // Strip inline photos from older feed index summaries (full photos remain stored eternally in
      // `shared_bouquets/{code}` + `bouquet_assets/*`) so up to 250 creations fit comfortably.
      for (let i = 3; i < merged.length; i++) {
        merged[i] = {
          ...merged[i],
          draftPayload: stripInlinePhotosFromCompactPayloadServer(merged[i].draftPayload),
        };
      }
      let jsonStr = JSON.stringify(merged);
      if (jsonStr.length > 680_000) {
        for (let i = 0; i < merged.length; i++) {
          merged[i] = {
            ...merged[i],
            draftPayload: stripInlinePhotosFromCompactPayloadServer(merged[i].draftPayload),
          };
        }
        jsonStr = JSON.stringify(merged);
      }
      while (merged.length > 20 && jsonStr.length > 860_000) {
        merged.pop();
        jsonStr = JSON.stringify(merged);
      }
      if (jsonStr.length > 880_000) {
        clearTimeout(timer);
        return false;
      }

      const fields = {
        code: { stringValue: GARLAND_FEED_DOC_CODE },
        payload: { stringValue: preservedPayload },
        createdAt: { stringValue: preservedCreatedAt },
        voiceAudioDataUrl: { stringValue: jsonStr },
      };

      let writeUrl = feedUrl;
      if (remoteExists && remoteUpdateTime) {
        writeUrl = `${feedUrl}?currentDocument.updateTime=${encodeURIComponent(remoteUpdateTime)}`;
      } else if (!remoteExists) {
        writeUrl = `${feedUrl}?currentDocument.exists=false`;
      }

      const patchResp = await fetch(writeUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (patchResp.ok) return true;
      if ((patchResp.status === 409 || patchResp.status === 412) && attempt < maxRetries) {
        continue;
      }
      return false;
    } catch {
      return false;
    }
  }
  return false;
}

async function reconcileGarlandFeedToFirestoreRest(mergedEntries, remoteMeta) {
  if (!Array.isArray(mergedEntries) || !remoteMeta || !remoteMeta.reachable) return false;
  try {
    const feedUrl = `${FIRESTORE_BASE_URL}/${GARLAND_FEED_DOC_CODE}`;
    const sanitized = mergedEntries.slice(0, MAX_GARLAND_FEED_ENTRIES).map((item, idx) =>
      idx >= 3 && item && typeof item.draftPayload === 'string'
        ? { ...item, draftPayload: stripInlinePhotosFromCompactPayloadServer(item.draftPayload) }
        : item
    );
    let jsonStr = JSON.stringify(sanitized);
    if (jsonStr.length > 680_000) {
      const stripped = sanitized.map((item) =>
        item && typeof item.draftPayload === 'string'
          ? { ...item, draftPayload: stripInlinePhotosFromCompactPayloadServer(item.draftPayload) }
          : item
      );
      jsonStr = JSON.stringify(stripped);
    }
    if (jsonStr.length > 880_000) return false;

    const fields = {
      code: { stringValue: GARLAND_FEED_DOC_CODE },
      payload: { stringValue: remoteMeta.preservedPayload || GARLAND_FEED_IMMUTABLE_PAYLOAD },
      createdAt: { stringValue: remoteMeta.preservedCreatedAt || GARLAND_FEED_IMMUTABLE_CREATED_AT },
      voiceAudioDataUrl: { stringValue: jsonStr },
    };

    let writeUrl = feedUrl;
    if (remoteMeta.exists && remoteMeta.updateTime) {
      writeUrl = `${feedUrl}?currentDocument.updateTime=${encodeURIComponent(remoteMeta.updateTime)}`;
    } else if (!remoteMeta.exists) {
      writeUrl = `${feedUrl}?currentDocument.exists=false`;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    const patchResp = await fetch(writeUrl, {
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
  const garlandParam = urlObj.searchParams.get('garland');

  // Edge-cached Shared Creations Garland Feed endpoint (`GET /api/shorten?garland=1`)
  // Eliminates per-visitor Firestore reads by merging Vercel Blob + Firestore behind a 45s CDN + RAM cache!
  if (req.method === 'GET' && garlandParam === '1') {
    const now = Date.now();
    if (
      Array.isArray(garlandFeedMemoryCache.entries) &&
      now - garlandFeedMemoryCache.fetchedAt < GARLAND_CACHE_TTL_MS
    ) {
      const filteredCached = garlandFeedMemoryCache.entries.filter(
        (item) => item && item.code && !OWNER_DELETED_BOUQUET_CODES.has(item.code)
      );
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'public, s-maxage=45, stale-while-revalidate=300');
      res.end(JSON.stringify({ ok: true, entries: filteredCached, cached: true }));
      return;
    }

    const [blobStateRes, firestoreRes] = await Promise.all([
      fetchGarlandFeedStateWithStatusFromBlob({ useCache: true }).catch(() => ({
        reachable: false,
        exists: null,
        state: null,
      })),
      (async () => {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 4500);
          const resp = await fetch(`${FIRESTORE_BASE_URL}/${GARLAND_FEED_DOC_CODE}`, {
            method: 'GET',
            signal: controller.signal,
          });
          clearTimeout(timer);
          if (resp.status === 404) {
            return {
              reachable: true,
              exists: false,
              updateTime: '',
              preservedCreatedAt: GARLAND_FEED_IMMUTABLE_CREATED_AT,
              preservedPayload: GARLAND_FEED_IMMUTABLE_PAYLOAD,
              entries: [],
            };
          }
          if (!resp.ok) return { reachable: false, exists: false, updateTime: '', entries: null };
          const doc = await resp.json().catch(() => null);
          const exFields = doc?.fields;
          const raw = exFields?.voiceAudioDataUrl?.stringValue;
          const parsed = raw ? JSON.parse(raw) : [];
          return {
            reachable: true,
            exists: true,
            updateTime: typeof doc?.updateTime === 'string' ? doc.updateTime : '',
            preservedCreatedAt:
              exFields?.createdAt?.stringValue && exFields.createdAt.stringValue.length >= 10
                ? exFields.createdAt.stringValue
                : GARLAND_FEED_IMMUTABLE_CREATED_AT,
            preservedPayload:
              exFields?.payload?.stringValue && exFields.payload.stringValue.length >= 3
                ? exFields.payload.stringValue
                : GARLAND_FEED_IMMUTABLE_PAYLOAD,
            entries: Array.isArray(parsed) ? parsed : [],
          };
        } catch {
          return { reachable: false, exists: false, updateTime: '', entries: null };
        }
      })(),
    ]);

    const blobState = blobStateRes.exists ? blobStateRes.state : null;
    const blobEntries = blobState ? blobState.entries : null;
    const blobRemovedCodes = blobState?.removedCodes || [];
    const firestoreEntries = firestoreRes.entries;

    // Combine local deleted tombstones + Blob removedCodes tombstones so unpinned/deleted bouquets
    // from a Firestore 429 outage NEVER resurrect when stale Firestore returns online!
    const removedSet = new Set([
      ...OWNER_DELETED_BOUQUET_CODES,
      ...blobRemovedCodes,
    ]);

    const byCode = new Map();
    const ingest = (list) => {
      if (!Array.isArray(list)) return;
      for (const item of list) {
        if (
          !item ||
          typeof item.code !== 'string' ||
          item.code.startsWith('draft_') ||
          item.code.startsWith('sab_') ||
          item.isDraft !== false ||
          item.pinToShowcase !== true ||
          removedSet.has(item.code)
        ) {
          continue;
        }
        // Sanitize every public Garland entry on read so legacy entries in Blob/Firestore
        // never leak lock secrets (`&l=...`), personal greeting card text, or inline media.
        const safeItem = {
          ...item,
          lockMode: 'none',
          draftPayload: sanitizeGarlandPreviewPayloadServer(String(item.draftPayload || '')).slice(
            0,
            12000
          ),
        };
        const prev = byCode.get(safeItem.code);
        if (!prev) {
          byCode.set(safeItem.code, safeItem);
        } else {
          const prevTs = Date.parse(prev.createdAt || '') || 0;
          const nextTs = Date.parse(safeItem.createdAt || '') || 0;
          if (nextTs > prevTs) byCode.set(safeItem.code, safeItem);
        }
      }
    };
    ingest(blobEntries);
    ingest(firestoreEntries);

    const merged = Array.from(byCode.values())
      .sort((a, b) => (Date.parse(b.createdAt || '') || 0) - (Date.parse(a.createdAt || '') || 0))
      .slice(0, MAX_GARLAND_FEED_ENTRIES);

    // 1. If Blob was reachable and Firestore had entries not yet mirrored to Blob, backfill Blob while preserving `removedCodes`
    if (
      isVercelBlobConfigured() &&
      blobStateRes.reachable &&
      Array.isArray(firestoreEntries) &&
      firestoreEntries.length > 0 &&
      (!Array.isArray(blobEntries) || blobEntries.length < merged.length)
    ) {
      saveGarlandFeedToBlob(merged, blobRemovedCodes).catch(() => {});
    }

    // 2. If Firestore recovered and is missing new Blob creations OR still contains unpinned/deleted tombstones,
    // heal Firestore's `sab_garland_feed_v1` automatically via CAS!
    if (firestoreRes.reachable && blobState) {
      const fsCodes = new Set(
        Array.isArray(firestoreEntries)
          ? firestoreEntries.filter((e) => e && typeof e.code === 'string').map((e) => e.code)
          : []
      );
      const hasStaleRemovedInFirestore = Array.from(fsCodes).some((c) => removedSet.has(c));
      const hasNewBlobEntriesMissingInFirestore = merged.some((e) => !fsCodes.has(e.code));
      if (hasStaleRemovedInFirestore || hasNewBlobEntriesMissingInFirestore) {
        await reconcileGarlandFeedToFirestoreRest(merged, firestoreRes).catch(() => false);
      }
    }

    if (merged.length > 0 || blobEntries !== null || firestoreEntries !== null) {
      garlandFeedMemoryCache = { entries: merged, fetchedAt: now };
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=45, stale-while-revalidate=300');
    res.end(
      JSON.stringify({
        ok: true,
        entries: merged,
        source:
          blobEntries !== null && firestoreEntries !== null
            ? 'merged'
            : blobEntries !== null
            ? 'vercel_blob'
            : firestoreEntries !== null
            ? 'firestore'
            : 'empty',
      })
    );
    return;
  }

  if (req.method === 'GET' && codeParam) {
    // 0. If this code was explicitly deleted by the owner in Admin Bouquets, evict any warm RAM / /tmp cache and return 404 immediately
    if (OWNER_DELETED_BOUQUET_CODES.has(codeParam)) {
      evictLocalShortPayload(codeParam);
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }

    // 1. Check in-memory and /tmp cache first
    let entry = loadLocalShortPayload(codeParam);

    // 2. Check Private Vercel Blob storage first (0 Firestore read units & stays 100% online during Firestore 429!)
    if ((!entry || !entry.payload) && isVercelBlobConfigured()) {
      const blobEntry = await fetchBouquetFromBlob(codeParam, { useCache: true });
      if (blobEntry && blobEntry.payload) {
        entry = blobEntry;
        saveShortPayload(codeParam, blobEntry.payload, blobEntry);
      }
    }

    // 3. Query persistent Firebase Firestore database (re-hydrates overflow bouquet_assets + voiceAudioDataUrl eternally, even after Garland expiry!)
    if (!entry || !entry.payload) {
      const firestoreEntry = await fetchFromFirestoreRest(codeParam);
      if (firestoreEntry && firestoreEntry.payload) {
        entry = firestoreEntry;
        saveShortPayload(codeParam, firestoreEntry.payload, firestoreEntry);
        // Mirror legacy Firestore bouquet into Vercel Blob in background so future opens spend 0 Firestore read units!
        if (isVercelBlobConfigured()) {
          saveBouquetToBlob(codeParam, firestoreEntry).catch(() => {});
        }
      }
    }

    // 4. Fallback to is.gd slug if needed
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
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600');
    res.end(
      JSON.stringify({
        code: codeParam,
        payload: entry.payload,
        voiceAudioDataUrl: entry.voiceAudioDataUrl || null,
        voiceStyle: entry.voiceStyle || null,
        voiceTitle: entry.voiceTitle || null,
        voiceDurationSec: entry.voiceDurationSec ?? null,
        ...(typeof entry.isPremium === 'boolean' ? { isPremium: entry.isPremium } : {}),
        ...(typeof entry.retentionDays === 'number' ? { retentionDays: entry.retentionDays } : {}),
        ...(typeof entry.createdAt === 'string' ? { createdAt: entry.createdAt } : {}),
      })
    );
    return;
  }

  if (req.method === 'POST') {
    try {
      // Allow up to 4 MB JSON bodies so multi-photo + voice bouquets are split into companion `bouquet_assets`
      const parsedBody = await readSafeJsonBody(req, 4 * 1024 * 1024);
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
          typeof bodyObj.retentionDays === 'number' ? bodyObj.retentionDays : undefined,
      };

      if (!code || !payload || code.startsWith('sab_')) {
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

      OWNER_DELETED_BOUQUET_CODES.delete(code);
      saveShortPayload(code, payload, extra);

      // 1. Dual-write eternal persistence: save to BOTH Firebase Firestore AND Private Vercel Blob in parallel!
      // Even if Firestore hits its daily free-tier read/write quota (429), Vercel Blob persists full photos + voice seamlessly.
      const cleanPayloadForBlob =
        extra.voiceAudioDataUrl && typeof extra.voiceAudioDataUrl === 'string'
          ? stripInlineAudioFromCompactPayloadServer(String(payload))
          : String(payload);

      const [firestoreResult, blobSaved] = await Promise.all([
        saveToFirestoreRest(code, payload, extra).catch(() => ({ ok: false, assetIds: [] })),
        isVercelBlobConfigured()
          ? saveBouquetToBlob(code, {
              payload: cleanPayloadForBlob,
              voiceAudioDataUrl: extra.voiceAudioDataUrl || null,
              voiceStyle: extra.voiceStyle || null,
              voiceTitle: extra.voiceTitle || null,
              voiceDurationSec: extra.voiceDurationSec ?? null,
              isPremium: extra.isPremium,
              retentionDays: extra.retentionDays,
              createdAt: new Date().toISOString(),
            }).catch(() => false)
          : Promise.resolve(false),
      ]);

      // 1a. Register 1-time Pay-It-Forward Recipient Gift Box slot if sealed with an eligible pass
      const giftSlot = await registerSharedBouquetGiftOfferServer({
        code,
        pass: coutureCheck.pass || null,
        deviceTokenHash:
          typeof bodyObj.deviceTokenHash === 'string' ? bodyObj.deviceTokenHash.trim() : '',
        visibleStemCount: coutureCheck.visibleStemCount || 0,
        noteCharCount: coutureCheck.noteCharCount || 0,
      }).catch(() => null);

      const shouldPinToGarland = Boolean(
        bodyObj.garlandEntry &&
          typeof bodyObj.garlandEntry === 'object' &&
          bodyObj.garlandEntry.isDraft === false &&
          bodyObj.garlandEntry.pinToShowcase === true
      );

      // 1b. If the user ticked "Pin to Lace Garland", persist to BOTH Firestore (CAS) AND Vercel Blob mirror
      if (shouldPinToGarland) {
        await Promise.all([
          publishToGarlandFeedRest(code, payload, bodyObj.garlandEntry).catch(() => false),
          isVercelBlobConfigured()
            ? upsertGarlandFeedInBlob(code, payload, bodyObj.garlandEntry).catch(() => false)
            : Promise.resolve(false),
        ]);
        invalidateGarlandFeedMemoryCache();
      }

      // 1c. ALWAYS log EVERY shared bouquet (both Garland-pinned AND private non-Garland links)
      // into the persistent Admin Bouquet Log (mirrored to both Firestore & Vercel Blob)
      const inspected = inspectPayloadAssetsSummaryServer(payload, extra.voiceAudioDataUrl);
      const clientMeta =
        bodyObj.bouquetMeta && typeof bodyObj.bouquetMeta === 'object' ? bodyObj.bouquetMeta : {};
      const shortUrl = origin ? `${origin}/${code}` : `/${code}`;
      const anyPersisted = Boolean(firestoreResult.ok || blobSaved);

      await recordBouquetInAdminLogServer({
        code,
        to: clientMeta.to || bodyObj.garlandEntry?.to || inspected.to,
        from: clientMeta.from || bodyObj.garlandEntry?.from || inspected.from,
        noteExcerpt: clientMeta.noteExcerpt || inspected.noteExcerpt,
        createdAt: clientMeta.createdAt || bodyObj.garlandEntry?.createdAt || new Date().toISOString(),
        shareUrl: clientMeta.shareUrl || bodyObj.garlandEntry?.shareUrl || shortUrl,
        pinnedToGarland: shouldPinToGarland || Boolean(bodyObj.pinToShowcase),
        isPremium: Boolean(extra.isPremium),
        retentionDays: typeof extra.retentionDays === 'number' ? extra.retentionDays : 30,
        isCouture: Boolean(coutureCheck.hasCoutureFeatures),
        flowerCount:
          typeof clientMeta.flowerCount === 'number' && clientMeta.flowerCount > 0
            ? clientMeta.flowerCount
            : inspected.flowerCount,
        photoCount:
          typeof clientMeta.photoCount === 'number'
            ? Math.max(clientMeta.photoCount, inspected.photoCount)
            : inspected.photoCount,
        hasVoice: Boolean(extra.voiceAudioDataUrl || clientMeta.hasVoice || inspected.hasVoice),
        voiceStyle: extra.voiceStyle || clientMeta.voiceStyle || inspected.voiceStyle,
        wrapStyle: clientMeta.wrapStyle || inspected.wrapStyle,
        ribbonStyle: clientMeta.ribbonStyle || inspected.ribbonStyle,
        environment: clientMeta.environment || inspected.environment,
        lockMode: clientMeta.lockMode || inspected.lockMode,
        payloadBytes: payload.length,
        voiceBytes: typeof extra.voiceAudioDataUrl === 'string' ? extra.voiceAudioDataUrl.length : 0,
        assetIds: firestoreResult.assetIds || [],
        persistedToFirestore: anyPersisted,
        existsInFirestore: anyPersisted,
        source: blobSaved && !firestoreResult.ok ? 'vercel_blob' : 'shorten',
      }).catch(() => {});

      // 2. Also keep secondary is.gd backup for compact payloads
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
        // Firestore / Vercel Blob and local cache already saved
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(
        JSON.stringify({
          code,
          shortUrl,
          persisted: anyPersisted,
          storage: {
            firestore: Boolean(firestoreResult.ok),
            blob: Boolean(blobSaved),
          },
          assetCount: (firestoreResult.assetIds || []).length,
          recipientGiftSpawned: Boolean(giftSlot && giftSlot.status === 'OPEN'),
        })
      );
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
