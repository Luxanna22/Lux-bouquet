import { del as vercelDel, get as vercelGet, put as vercelPut } from '@vercel/blob';
import {
  MAX_GARLAND_FEED_ENTRIES,
  stripInlineAudioFromCompactPayloadServer,
  stripInlinePhotosFromCompactPayloadServer,
} from './bouquetAssetsHelper.js';

const BOUQUET_BLOB_PREFIX = 'bouquets/';
const GARLAND_FEED_BLOB_PATH = 'system/garland_feed.json';
const ADMIN_LOG_BLOB_PATH = 'system/admin_bouquet_log.json';

let testBlobClientOverride = null;

/**
 * Allows deterministic unit tests to inject an in-memory Vercel Blob client mock.
 */
export function setBlobClientForTesting(clientOrNull) {
  testBlobClientOverride = clientOrNull || null;
}

function getBlobClient() {
  if (testBlobClientOverride) return testBlobClientOverride;
  return {
    put: vercelPut,
    get: vercelGet,
    del: vercelDel,
  };
}

/**
 * Returns true when Vercel Blob credentials (BLOB_READ_WRITE_TOKEN or Vercel OIDC BLOB_STORE_ID)
 * are configured in the server environment (or mocked in unit tests).
 */
export function isVercelBlobConfigured() {
  if (testBlobClientOverride) return true;
  if (typeof process === 'undefined' || !process.env) return false;
  return Boolean(
    (process.env.BLOB_READ_WRITE_TOKEN && process.env.BLOB_READ_WRITE_TOKEN.trim().length > 0) ||
      (process.env.BLOB_STORE_ID && process.env.BLOB_STORE_ID.trim().length > 0)
  );
}

function getPreferredBlobAccess() {
  const envVal =
    typeof process !== 'undefined' && process.env?.BLOB_ACCESS
      ? String(process.env.BLOB_ACCESS).trim().toLowerCase()
      : '';
  return envVal === 'public' ? 'public' : 'private';
}

function isBlobAccessMismatchError(err) {
  const msg = String(err?.message || err || '').toLowerCase();
  const name = String(err?.name || '').toLowerCase();
  return (
    name.includes('blobaccesserror') ||
    msg.includes('public access on a private store') ||
    msg.includes('private access on a public store') ||
    msg.includes('cannot use public access') ||
    msg.includes('cannot use private access')
  );
}

async function putJsonBlob(pathname, data) {
  if (!isVercelBlobConfigured()) return false;
  const client = getBlobClient();
  const body = JSON.stringify(data);
  const preferredAccess = getPreferredBlobAccess();
  const fallbackAccess = preferredAccess === 'private' ? 'public' : 'private';

  try {
    await client.put(pathname, body, {
      access: preferredAccess,
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json; charset=utf-8',
    });
    return true;
  } catch (err) {
    if (isBlobAccessMismatchError(err)) {
      try {
        await client.put(pathname, body, {
          access: fallbackAccess,
          addRandomSuffix: false,
          allowOverwrite: true,
          contentType: 'application/json; charset=utf-8',
        });
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}

async function getJsonBlob(pathname, options = {}) {
  if (!isVercelBlobConfigured()) return null;
  const client = getBlobClient();
  const useCache = options.useCache !== undefined ? Boolean(options.useCache) : true;
  const preferredAccess = getPreferredBlobAccess();
  const fallbackAccess = preferredAccess === 'private' ? 'public' : 'private';

  const attemptRead = async (accessMode) => {
    const result = await client.get(pathname, {
      access: accessMode,
      useCache,
    });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    const text = await new Response(result.stream).text();
    if (!text) return null;
    return JSON.parse(text);
  };

  try {
    return await attemptRead(preferredAccess);
  } catch (err) {
    if (isBlobAccessMismatchError(err)) {
      try {
        return await attemptRead(fallbackAccess);
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function deleteBlobPath(pathname) {
  if (!isVercelBlobConfigured()) return false;
  const client = getBlobClient();
  try {
    await client.del(pathname);
    return true;
  } catch {
    return false;
  }
}

/**
 * Saves a complete shared bouquet record (including full-resolution photos and voice audio — no 1 MiB ceiling)
 * to Private Vercel Blob storage under `bouquets/{code}.json`.
 */
export async function saveBouquetToBlob(code, record) {
  const safeCode = String(code || '').replace(/[^0-9A-Za-z_-]/g, '');
  if (!safeCode || safeCode.length < 7 || safeCode.length > 24 || safeCode.startsWith('sab_')) {
    return false;
  }
  if (!record || typeof record.payload !== 'string' || record.payload.length < 3) {
    return false;
  }
  const normalized = {
    code: safeCode,
    payload: record.payload,
    voiceAudioDataUrl:
      typeof record.voiceAudioDataUrl === 'string' && record.voiceAudioDataUrl.length > 0
        ? record.voiceAudioDataUrl
        : null,
    voiceStyle: typeof record.voiceStyle === 'string' ? record.voiceStyle.slice(0, 32) : null,
    voiceTitle: typeof record.voiceTitle === 'string' ? record.voiceTitle.slice(0, 64) : null,
    voiceDurationSec:
      typeof record.voiceDurationSec === 'number' && Number.isFinite(record.voiceDurationSec)
        ? Math.max(0, Math.min(600, Math.round(record.voiceDurationSec)))
        : null,
    isPremium: typeof record.isPremium === 'boolean' ? record.isPremium : false,
    retentionDays:
      typeof record.retentionDays === 'number' && Number.isFinite(record.retentionDays)
        ? Math.max(1, Math.min(36500, Math.round(record.retentionDays)))
        : 30,
    createdAt:
      typeof record.createdAt === 'string' && record.createdAt.length >= 10
        ? record.createdAt.slice(0, 64)
        : new Date().toISOString(),
  };
  return putJsonBlob(`${BOUQUET_BLOB_PREFIX}${safeCode}.json`, normalized);
}

/**
 * Fetches a full shared bouquet record from Private Vercel Blob storage.
 */
export async function fetchBouquetFromBlob(code, options = {}) {
  const safeCode = String(code || '').replace(/[^0-9A-Za-z_-]/g, '');
  if (!safeCode || safeCode.length < 7 || safeCode.length > 24 || safeCode.startsWith('sab_')) {
    return null;
  }
  const parsed = await getJsonBlob(`${BOUQUET_BLOB_PREFIX}${safeCode}.json`, options);
  if (!parsed || typeof parsed.payload !== 'string' || parsed.payload.length < 3) {
    return null;
  }
  return {
    code: safeCode,
    payload: parsed.payload,
    voiceAudioDataUrl: typeof parsed.voiceAudioDataUrl === 'string' ? parsed.voiceAudioDataUrl : null,
    voiceStyle: typeof parsed.voiceStyle === 'string' ? parsed.voiceStyle : null,
    voiceTitle: typeof parsed.voiceTitle === 'string' ? parsed.voiceTitle : null,
    voiceDurationSec: typeof parsed.voiceDurationSec === 'number' ? parsed.voiceDurationSec : null,
    isPremium: typeof parsed.isPremium === 'boolean' ? parsed.isPremium : undefined,
    retentionDays: typeof parsed.retentionDays === 'number' ? parsed.retentionDays : undefined,
    createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : null,
    source: 'vercel_blob',
  };
}

/**
 * Deletes a bouquet blob (called when the owner deletes a mock/test bouquet from Admin -> Bouquets).
 */
export async function deleteBouquetFromBlob(code) {
  const safeCode = String(code || '').replace(/[^0-9A-Za-z_-]/g, '');
  if (!safeCode || safeCode.startsWith('sab_')) return false;
  return deleteBlobPath(`${BOUQUET_BLOB_PREFIX}${safeCode}.json`);
}

/**
 * Reads the Shared Creations Garland feed mirror from Vercel Blob (`system/garland_feed.json`).
 */
export async function fetchGarlandFeedFromBlob(options = {}) {
  const parsed = await getJsonBlob(GARLAND_FEED_BLOB_PATH, options);
  if (!parsed) return null;
  const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed.entries) ? parsed.entries : null;
  if (!list) return null;
  return list.filter(
    (item) =>
      item &&
      typeof item.code === 'string' &&
      !item.code.startsWith('draft_') &&
      !item.code.startsWith('sab_') &&
      item.isDraft === false &&
      item.pinToShowcase === true
  );
}

/**
 * Persists the Shared Creations Garland feed mirror to Vercel Blob (`system/garland_feed.json`).
 */
export async function saveGarlandFeedToBlob(entries) {
  if (!Array.isArray(entries)) return false;
  const sanitized = entries
    .filter(
      (item) =>
        item &&
        typeof item.code === 'string' &&
        !item.code.startsWith('draft_') &&
        !item.code.startsWith('sab_') &&
        item.isDraft === false &&
        item.pinToShowcase === true
    )
    .slice(0, MAX_GARLAND_FEED_ENTRIES);
  return putJsonBlob(GARLAND_FEED_BLOB_PATH, {
    updatedAt: new Date().toISOString(),
    entries: sanitized,
  });
}

/**
 * Upserts a newly pinned Garland entry into Vercel Blob (`system/garland_feed.json`).
 */
export async function upsertGarlandFeedInBlob(code, payload, garlandEntry) {
  const safeCode = String(code || '').replace(/[^0-9A-Za-z_-]/g, '');
  if (
    !isVercelBlobConfigured() ||
    !safeCode ||
    safeCode.startsWith('draft_') ||
    safeCode.startsWith('sab_') ||
    !garlandEntry ||
    garlandEntry.isDraft !== false ||
    garlandEntry.pinToShowcase !== true
  ) {
    return false;
  }

  const existing = (await fetchGarlandFeedFromBlob({ useCache: false })) || [];
  const rawDraft =
    typeof garlandEntry.draftPayload === 'string' && garlandEntry.draftPayload.length > 3
      ? garlandEntry.draftPayload
      : String(payload || '');
  const cleanDraftPayload = stripInlinePhotosFromCompactPayloadServer(
    stripInlineAudioFromCompactPayloadServer(rawDraft)
  );
  const replaceCode =
    typeof garlandEntry.replaceCode === 'string' && garlandEntry.replaceCode
      ? garlandEntry.replaceCode
      : null;

  const normalizedEntry = {
    code: safeCode,
    to: String(garlandEntry.to || 'Someone Special').slice(0, 80),
    from: String(garlandEntry.from || 'Yours').slice(0, 80),
    recipientName: String(garlandEntry.recipientName || garlandEntry.to || 'Someone Special').slice(0, 80),
    senderName: String(garlandEntry.senderName || garlandEntry.from || 'Yours').slice(0, 80),
    createdAt:
      typeof garlandEntry.createdAt === 'string' && garlandEntry.createdAt.length >= 10
        ? garlandEntry.createdAt.slice(0, 64)
        : new Date().toISOString(),
    shareUrl: String(garlandEntry.shareUrl || `/${safeCode}`).slice(0, 240),
    lockMode: String(garlandEntry.lockMode || 'none').slice(0, 24),
    hasVoice: Boolean(garlandEntry.hasVoice),
    flowerCount: Math.max(0, Math.min(200, Number(garlandEntry.flowerCount) || 0)),
    isPremium: Boolean(garlandEntry.isPremium),
    retentionDays: Math.max(1, Math.min(36500, Number(garlandEntry.retentionDays) || 30)),
    isDraft: false,
    pinToShowcase: true,
    draftPayload: cleanDraftPayload.slice(0, 12000),
  };

  const merged = [
    normalizedEntry,
    ...existing.filter((item) => item.code !== safeCode && (!replaceCode || item.code !== replaceCode)),
  ].slice(0, MAX_GARLAND_FEED_ENTRIES);

  return saveGarlandFeedToBlob(merged);
}

/**
 * Removes one or more bouquet codes from the Vercel Blob Garland feed mirror.
 */
export async function removeCodesFromGarlandFeedInBlob(codes) {
  if (!isVercelBlobConfigured() || !Array.isArray(codes) || codes.length === 0) return false;
  const codeSet = new Set(codes.map((c) => String(c || '').replace(/[^0-9A-Za-z_-]/g, '')).filter(Boolean));
  if (codeSet.size === 0) return false;
  const existing = await fetchGarlandFeedFromBlob({ useCache: false });
  if (!existing) return true;
  const filtered = existing.filter((item) => !codeSet.has(item.code));
  if (filtered.length === existing.length) return true;
  return saveGarlandFeedToBlob(filtered);
}

/**
 * Reads the persistent Admin Bouquet Log mirror from Vercel Blob (`system/admin_bouquet_log.json`).
 */
export async function fetchAdminBouquetLogFromBlob() {
  const parsed = await getJsonBlob(ADMIN_LOG_BLOB_PATH, { useCache: false });
  if (!parsed || typeof parsed !== 'object') return null;
  return {
    entries: Array.isArray(parsed.entries) ? parsed.entries : [],
    deletedCodes: Array.isArray(parsed.deletedCodes) ? parsed.deletedCodes : [],
    updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
  };
}

/**
 * Persists the Admin Bouquet Log mirror to Vercel Blob (`system/admin_bouquet_log.json`).
 */
export async function saveAdminBouquetLogToBlob(state) {
  if (!isVercelBlobConfigured() || !state || typeof state !== 'object') return false;
  return putJsonBlob(ADMIN_LOG_BLOB_PATH, {
    v: 1,
    updatedAt: new Date().toISOString(),
    entries: Array.isArray(state.entries) ? state.entries : [],
    deletedCodes: Array.isArray(state.deletedCodes) ? state.deletedCodes : [],
  });
}
