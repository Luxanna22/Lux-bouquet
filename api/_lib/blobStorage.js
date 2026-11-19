import { del as vercelDel, get as vercelGet, put as vercelPut } from '@vercel/blob';
import {
  MAX_GARLAND_FEED_ENTRIES,
  sanitizeGarlandPreviewPayloadServer,
} from './bouquetAssetsHelper.js';

const BOUQUET_BLOB_PREFIX = 'bouquets/';
const PASS_BLOB_PREFIX = 'passes/';
const GARLAND_FEED_BLOB_PATH = 'system/garland_feed.json';
const ADMIN_LOG_BLOB_PATH = 'system/admin_bouquet_log.json';
const OWNER_VAULT_BLOB_PATH = 'system/owner_vault.json';

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

function isBlobNotFoundError(err) {
  const msg = String(err?.message || err || '').toLowerCase();
  const name = String(err?.name || '').toLowerCase();
  return (
    name.includes('blobnotfounderror') ||
    msg.includes('blob does not exist') ||
    msg.includes('not found') ||
    Number(err?.statusCode) === 404 ||
    Number(err?.status) === 404
  );
}

/**
 * Reads a JSON blob while distinguishing:
 * - `{ reachable: true, exists: true, data }` (200 OK + parsed JSON)
 * - `{ reachable: true, exists: false, data: null }` (explicit 404 / BlobNotFound)
 * - `{ reachable: false, exists: null, data: null }` (network/timeout/5xx/parse error)
 *
 * This distinction is critical across Vercel redeploys so a transient read failure on a cold start
 * NEVER causes callers to assume the store is empty and overwrite persistent data.
 */
async function getJsonBlobWithStatus(pathname, options = {}) {
  if (!isVercelBlobConfigured()) {
    return { reachable: false, exists: null, data: null };
  }
  const client = getBlobClient();
  const useCache = options.useCache !== undefined ? Boolean(options.useCache) : true;
  const preferredAccess = getPreferredBlobAccess();
  const fallbackAccess = preferredAccess === 'private' ? 'public' : 'private';

  const attemptRead = async (accessMode) => {
    const result = await client.get(pathname, {
      access: accessMode,
      useCache,
    });
    if (!result || result.statusCode === 404) {
      return { reachable: true, exists: false, data: null };
    }
    if (result.statusCode !== 200 || !result.stream) {
      return { reachable: false, exists: null, data: null };
    }
    const text = await new Response(result.stream).text();
    if (!text) {
      return { reachable: false, exists: null, data: null };
    }
    return { reachable: true, exists: true, data: JSON.parse(text) };
  };

  try {
    return await attemptRead(preferredAccess);
  } catch (err) {
    if (isBlobNotFoundError(err)) {
      return { reachable: true, exists: false, data: null };
    }
    if (isBlobAccessMismatchError(err)) {
      try {
        return await attemptRead(fallbackAccess);
      } catch (fallbackErr) {
        if (isBlobNotFoundError(fallbackErr)) {
          return { reachable: true, exists: false, data: null };
        }
        return { reachable: false, exists: null, data: null };
      }
    }
    return { reachable: false, exists: null, data: null };
  }
}

async function getJsonBlob(pathname, options = {}) {
  const res = await getJsonBlobWithStatus(pathname, options);
  return res.exists ? res.data : null;
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

function sanitizeGarlandRemovedCodes(codes) {
  if (!Array.isArray(codes)) return [];
  const seen = new Set();
  const result = [];
  for (const raw of codes) {
    const clean = String(raw || '').replace(/[^0-9A-Za-z_-]/g, '').slice(0, 24);
    if (!clean || clean.startsWith('draft_') || clean.startsWith('sab_') || seen.has(clean)) continue;
    seen.add(clean);
    result.push(clean);
  }
  return result.slice(-500);
}

function sanitizePublicGarlandEntry(item) {
  if (!item || typeof item !== 'object' || typeof item.code !== 'string') return null;
  const rawDraft = typeof item.draftPayload === 'string' ? item.draftPayload : '';
  return {
    ...item,
    lockMode: 'none',
    draftPayload: sanitizeGarlandPreviewPayloadServer(rawDraft).slice(0, 12000),
  };
}

/**
 * Reads the full Shared Creations Garland state from Vercel Blob (`system/garland_feed.json`)
 * with explicit reachability status so cold starts after redeploy never overwrite existing data
 * on transient read errors.
 */
export async function fetchGarlandFeedStateWithStatusFromBlob(options = {}) {
  const res = await getJsonBlobWithStatus(GARLAND_FEED_BLOB_PATH, options);
  if (!res.reachable) {
    return { reachable: false, exists: null, state: null };
  }
  if (!res.exists || !res.data) {
    return { reachable: true, exists: false, state: null };
  }
  const parsed = res.data;
  const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed.entries) ? parsed.entries : null;
  if (!list) {
    return { reachable: false, exists: null, state: null };
  }
  const removedCodes = sanitizeGarlandRemovedCodes(
    !Array.isArray(parsed) && Array.isArray(parsed.removedCodes) ? parsed.removedCodes : []
  );
  const removedSet = new Set(removedCodes);
  const entries = list
    .filter(
      (item) =>
        item &&
        typeof item.code === 'string' &&
        !item.code.startsWith('draft_') &&
        !item.code.startsWith('sab_') &&
        item.isDraft === false &&
        item.pinToShowcase === true &&
        !removedSet.has(item.code)
    )
    .map(sanitizePublicGarlandEntry)
    .filter(Boolean);
  return {
    reachable: true,
    exists: true,
    state: {
      entries,
      removedCodes,
      updatedAt: !Array.isArray(parsed) && typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
    },
  };
}

/**
 * Reads the full Shared Creations Garland state from Vercel Blob (`system/garland_feed.json`),
 * including `removedCodes` tombstones so bouquets unpinned/deleted during a Firestore 429 outage
 * never resurrect when Firestore recovers.
 */
export async function fetchGarlandFeedStateFromBlob(options = {}) {
  const res = await fetchGarlandFeedStateWithStatusFromBlob(options);
  return res.exists ? res.state : null;
}

/**
 * Reads the Shared Creations Garland feed mirror from Vercel Blob (`system/garland_feed.json`).
 */
export async function fetchGarlandFeedFromBlob(options = {}) {
  const state = await fetchGarlandFeedStateFromBlob(options);
  return state ? state.entries : null;
}

/**
 * Persists the Shared Creations Garland feed mirror (plus optional `removedCodes` tombstones)
 * to Vercel Blob (`system/garland_feed.json`).
 */
export async function saveGarlandFeedToBlob(entries, removedCodes = []) {
  if (!Array.isArray(entries)) return false;
  const safeRemoved = sanitizeGarlandRemovedCodes(removedCodes);
  const removedSet = new Set(safeRemoved);
  const sanitized = entries
    .filter(
      (item) =>
        item &&
        typeof item.code === 'string' &&
        !item.code.startsWith('draft_') &&
        !item.code.startsWith('sab_') &&
        item.isDraft === false &&
        item.pinToShowcase === true &&
        !removedSet.has(item.code)
    )
    .map(sanitizePublicGarlandEntry)
    .filter(Boolean)
    .slice(0, MAX_GARLAND_FEED_ENTRIES);
  return putJsonBlob(GARLAND_FEED_BLOB_PATH, {
    updatedAt: new Date().toISOString(),
    entries: sanitized,
    removedCodes: safeRemoved,
  });
}

/**
 * Upserts a newly pinned Garland entry into Vercel Blob (`system/garland_feed.json`),
 * preserving existing `removedCodes` tombstones while clearing any tombstone for `code`.
 * Refuses to overwrite if the existing Garland feed cannot be read cleanly (redeploy/transient safety).
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

  const existingRes = await fetchGarlandFeedStateWithStatusFromBlob({ useCache: false });
  if (!existingRes.reachable) {
    return false;
  }
  const existingState = existingRes.state;
  const existing = existingState?.entries || [];
  const nextRemoved = (existingState?.removedCodes || []).filter((c) => c !== safeCode);

  const rawDraft =
    typeof garlandEntry.draftPayload === 'string' && garlandEntry.draftPayload.length > 3
      ? garlandEntry.draftPayload
      : String(payload || '');
  const cleanDraftPayload = sanitizeGarlandPreviewPayloadServer(rawDraft);
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
    lockMode: 'none',
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

  return saveGarlandFeedToBlob(merged, nextRemoved);
}

/**
 * Removes one or more bouquet codes from the Vercel Blob Garland feed mirror
 * AND records them in `removedCodes` so stale Firestore entries never resurrect when Firestore recovers.
 * Refuses to overwrite if the existing Garland feed cannot be read cleanly.
 */
export async function removeCodesFromGarlandFeedInBlob(codes) {
  if (!isVercelBlobConfigured() || !Array.isArray(codes) || codes.length === 0) return false;
  const cleanCodes = sanitizeGarlandRemovedCodes(codes);
  if (cleanCodes.length === 0) return false;
  const codeSet = new Set(cleanCodes);
  const existingRes = await fetchGarlandFeedStateWithStatusFromBlob({ useCache: false });
  if (!existingRes.reachable) {
    return false;
  }
  const existingState = existingRes.state;
  const existingEntries = existingState?.entries || [];
  const existingRemoved = existingState?.removedCodes || [];
  const filtered = existingEntries.filter((item) => !codeSet.has(item.code));
  const mergedRemoved = sanitizeGarlandRemovedCodes([...existingRemoved, ...cleanCodes]);
  return saveGarlandFeedToBlob(filtered, mergedRemoved);
}

/**
 * Reads the persistent Admin Bouquet Log mirror from Vercel Blob (`system/admin_bouquet_log.json`)
 * with explicit reachability status to prevent cold-start overwrites after redeploy.
 */
export async function fetchAdminBouquetLogWithStatusFromBlob() {
  const res = await getJsonBlobWithStatus(ADMIN_LOG_BLOB_PATH, { useCache: false });
  if (!res.reachable) {
    return { reachable: false, exists: null, log: null };
  }
  if (!res.exists || !res.data || typeof res.data !== 'object') {
    return { reachable: true, exists: false, log: null };
  }
  const parsed = res.data;
  return {
    reachable: true,
    exists: true,
    log: {
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      deletedCodes: Array.isArray(parsed.deletedCodes) ? parsed.deletedCodes : [],
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
    },
  };
}

/**
 * Reads the persistent Admin Bouquet Log mirror from Vercel Blob (`system/admin_bouquet_log.json`).
 */
export async function fetchAdminBouquetLogFromBlob() {
  const res = await fetchAdminBouquetLogWithStatusFromBlob();
  return res.exists ? res.log : null;
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

/**
 * Reads the persistent Owner Admin Vault mirror from Private Vercel Blob (`system/owner_vault.json`)
 * with explicit reachability status to prevent cold-start overwrites after redeploy.
 */
export async function fetchOwnerVaultWithStatusFromBlob() {
  const res = await getJsonBlobWithStatus(OWNER_VAULT_BLOB_PATH, { useCache: false });
  if (!res.reachable) {
    return { reachable: false, exists: null, vault: null };
  }
  if (!res.exists || !res.data || typeof res.data !== 'object') {
    return { reachable: true, exists: false, vault: null };
  }
  return { reachable: true, exists: true, vault: res.data };
}

/**
 * Reads the persistent Owner Admin Vault mirror from Private Vercel Blob (`system/owner_vault.json`).
 * Keeps all Admin Console controls (PHP disable, income pause, launch promo limits, custom PIN,
 * paid passes, tester vouchers, and analytics) 100% functional even during Firestore 429 outages.
 */
export async function fetchOwnerVaultFromBlob() {
  const res = await fetchOwnerVaultWithStatusFromBlob();
  return res.exists ? res.vault : null;
}

/**
 * Persists the Owner Admin Vault snapshot to Private Vercel Blob (`system/owner_vault.json`).
 */
export async function saveOwnerVaultToBlob(vaultPayload) {
  if (!isVercelBlobConfigured() || !vaultPayload || typeof vaultPayload !== 'object') return false;
  return putJsonBlob(OWNER_VAULT_BLOB_PATH, vaultPayload);
}

function sanitizePassKeyForBlob(passKey) {
  return String(passKey || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 32);
}

/**
 * Reads a Studio Pass / Receipt Slot mirror from Private Vercel Blob (`passes/{passKey}.json`).
 */
export async function fetchStudioPassFromBlob(passKey) {
  const safeKey = sanitizePassKeyForBlob(passKey);
  if (!safeKey || safeKey.length < 8) return null;
  const parsed = await getJsonBlob(`${PASS_BLOB_PREFIX}${safeKey}.json`, { useCache: false });
  if (!parsed || typeof parsed !== 'object' || typeof parsed.passKey !== 'string') return null;
  return parsed;
}

/**
 * Persists a Studio Pass / Receipt Slot mirror to Private Vercel Blob (`passes/{passKey}.json`).
 */
export async function saveStudioPassToBlob(passKey, pass) {
  if (!isVercelBlobConfigured() || !pass || typeof pass !== 'object') return false;
  const safeKey = sanitizePassKeyForBlob(passKey || pass.passKey);
  if (!safeKey || safeKey.length < 8) return false;
  return putJsonBlob(`${PASS_BLOB_PREFIX}${safeKey}.json`, pass);
}
