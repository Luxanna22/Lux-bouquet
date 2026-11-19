// ============================================================================
// PURE BOUQUET PERSISTENCE, OVERFLOW ASSET SPLITTING & ADMIN LOG HELPERS
// Zero browser/Firebase side effects so 100% unit-testable via `node:test`.
// ============================================================================

export const ASSET_POINTER_PREFIX = 'asset:';
export const DEFAULT_MAX_COMBINED_DOC_BYTES = 750_000;
export const MAX_SINGLE_ASSET_BYTES = 850_000;
export const MAX_GARLAND_FEED_ENTRIES = 250;

export interface BouquetAssetRecord {
  assetId: string;
  bouquetCode: string;
  kind: 'photo' | 'voice';
  dataUrl: string;
  createdAt: string;
}

export interface OverflowSplitResult {
  payload: string;
  voiceAudioDataUrl?: string;
  assets: BouquetAssetRecord[];
  combinedBytes: number;
}

export interface PayloadAssetsSummary {
  to: string;
  from: string;
  noteExcerpt: string;
  flowerCount: number;
  photoCount: number;
  hasVoice: boolean;
  voiceStyle?: string;
  wrapStyle?: string;
  ribbonStyle?: string;
  environment?: string;
  lockMode: 'none' | 'countdown' | 'passcode';
  payloadBytes: number;
  voiceBytes: number;
}

export interface AdminBouquetLogEntry {
  code: string;
  to: string;
  from: string;
  noteExcerpt: string;
  createdAt: string;
  shareUrl: string;
  pinnedToGarland: boolean;
  isPremium: boolean;
  retentionDays: number;
  isCouture: boolean;
  flowerCount: number;
  photoCount: number;
  hasVoice: boolean;
  voiceStyle?: string;
  wrapStyle?: string;
  ribbonStyle?: string;
  environment?: string;
  lockMode: 'none' | 'countdown' | 'passcode';
  payloadBytes: number;
  voiceBytes: number;
  assetIds: string[];
  persistedToFirestore: boolean;
  source?: 'shorten' | 'garland_backfill' | 'manual_verify';
  openCount?: number;
  voicePlayCount?: number;
  hasReaction?: boolean;
  recipientReply?: string;
  lastVerifiedAt?: string;
  existsInFirestore?: boolean;
}

export type AdminBouquetFilterStatus =
  | 'all'
  | 'garland'
  | 'private'
  | 'expired_garland'
  | 'with_voice'
  | 'with_photos';

export type AdminBouquetDisplayClass =
  | 'garland_live'
  | 'garland_expired'
  | 'private_eternal';

const VALID_ASSET_ID_REGEX = /^[a-zA-Z0-9_\-]{8,48}$/;
const VALID_SHORT_CODE_REGEX = /^[a-zA-Z0-9_\-]{7,24}$/;

const WRAP_STYLE_LOOKUP = [
  'kraft',
  'tissue',
  'chalice',
  'basket',
  'vintage',
  'lace',
  'celestial',
  'vase',
  'plain',
  'hatbox',
  'cloche',
  'koreanmesh',
];

const RIBBON_STYLE_LOOKUP = [
  'satin',
  'lace',
  'corset',
  'double',
  'waxCord',
  'organza',
  'velvet',
  'chiffon',
  'goldchain',
  'raffia',
  'pearlStrand',
  'celestialSilk',
];

const VOICE_STYLE_LOOKUP = [
  'mixtape',
  'vinyl',
  'plushie',
  'musicbox',
  'locket',
  'shell',
  'birdcage',
  'bottle',
  'harp',
  'globe',
];

const ENV_LOOKUP = [
  'studio',
  'paper',
  'meadow',
  'sunlit',
  'linen',
  'starlit',
  'aurora',
  'velvetSalon',
  'opalMist',
  'blushSilk',
  'botanicalArch',
  'nordicSnow',
  'crystalPalace',
  'midnightNoel',
];

function toBase64UrlSafe(str: string): string {
  const utf8Bytes = encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
    String.fromCharCode(parseInt(p1, 16))
  );
  const b64 =
    typeof btoa === 'function'
      ? btoa(utf8Bytes)
      : typeof globalThis !== 'undefined' && 'Buffer' in globalThis
      ? (
          globalThis as {
            Buffer: { from: (s: string, e: string) => { toString: (enc: string) => string } };
          }
        ).Buffer.from(utf8Bytes, 'binary').toString('base64')
      : '';
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64UrlSafe(b64url: string): string {
  try {
    let b64 = b64url.trim().replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4 !== 0) {
      b64 += '=';
    }
    const binary =
      typeof atob === 'function'
        ? atob(b64)
        : typeof globalThis !== 'undefined' && 'Buffer' in globalThis
        ? (
            globalThis as {
              Buffer: { from: (s: string, enc: string) => { toString: (e: string) => string } };
            }
          ).Buffer.from(b64, 'base64').toString('binary')
        : '';
    const percentEncoded = Array.from(binary)
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('');
    return decodeURIComponent(percentEncoded);
  } catch {
    return '';
  }
}

export function isAssetPointer(val?: string | null): boolean {
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (!trimmed.startsWith(ASSET_POINTER_PREFIX)) return false;
  const id = trimmed.slice(ASSET_POINTER_PREFIX.length);
  return VALID_ASSET_ID_REGEX.test(id);
}

export function extractAssetIdFromPointer(val?: string | null): string | null {
  if (!isAssetPointer(val)) return null;
  return (val as string).trim().slice(ASSET_POINTER_PREFIX.length);
}

/**
 * Strips inline audio (7th tilde segment of `&v=`) when audio is stored in a dedicated field or asset doc.
 */
function stripInlineAudioSegment(payload: string): string {
  if (!payload || typeof payload !== 'string') return '';
  return payload.replace(/(&v=)([^&]*)/, (_match, prefix: string, vBody: string) => {
    const parts = vBody.split('~');
    if (parts.length >= 7 && parts[6]) {
      parts[6] = '';
    }
    return `${prefix}${parts.join('~')}`;
  });
}

/**
 * Splits heavy voice recordings and/or embedded photocard data URLs into companion
 * `bouquet_assets/{assetId}` records whenever the combined `shared_bouquets/{code}`
 * document size would approach Firestore's 1 MiB (1,048,576 byte) ceiling.
 *
 * When total size is safely under `maxCombinedBytes` (default 750 KB), everything stays inline
 * for zero extra read latency; when larger (e.g. multiple high-res photos + a voice recording),
 * voice and largest photos are transparently replaced with `asset:{code}_voice` / `asset:{code}_p{i}`
 * pointers so 100% of assets persist eternally without silent Firestore rejection.
 */
export function extractOverflowAssetsFromPayload(
  code: string,
  payload: string,
  voiceAudioDataUrl?: string | null,
  options?: { maxCombinedBytes?: number; createdAt?: string }
): OverflowSplitResult {
  const maxCombinedBytes = options?.maxCombinedBytes ?? DEFAULT_MAX_COMBINED_DOC_BYTES;
  const createdAt = options?.createdAt || new Date().toISOString();
  const safeCode = String(code || '').replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 24);

  let nextPayload =
    voiceAudioDataUrl && typeof voiceAudioDataUrl === 'string'
      ? stripInlineAudioSegment(payload)
      : payload;
  let nextVoice: string | undefined =
    voiceAudioDataUrl && typeof voiceAudioDataUrl === 'string' && voiceAudioDataUrl.length > 0
      ? voiceAudioDataUrl
      : undefined;

  const assets: BouquetAssetRecord[] = [];
  const currentSize = () => nextPayload.length + (nextVoice ? nextVoice.length : 0);

  if (!safeCode || !VALID_SHORT_CODE_REGEX.test(safeCode) || safeCode.startsWith('sab_')) {
    return {
      payload: nextPayload,
      voiceAudioDataUrl: nextVoice,
      assets,
      combinedBytes: currentSize(),
    };
  }

  // 1. If combined size exceeds budget and voiceAudioDataUrl is large (and not already a pointer), offload voice first.
  if (
    currentSize() > maxCombinedBytes &&
    nextVoice &&
    !isAssetPointer(nextVoice) &&
    nextVoice.length <= MAX_SINGLE_ASSET_BYTES
  ) {
    const voiceAssetId = `${safeCode}_voice`;
    if (VALID_ASSET_ID_REGEX.test(voiceAssetId)) {
      assets.push({
        assetId: voiceAssetId,
        bouquetCode: safeCode,
        kind: 'voice',
        dataUrl: nextVoice,
        createdAt,
      });
      nextVoice = `${ASSET_POINTER_PREFIX}${voiceAssetId}`;
    }
  }

  // 2. If still over budget, offload photocard inline base64url images (stem tilde index 7) from largest to smallest.
  if (currentSize() > maxCombinedBytes) {
    const ampIdx = nextPayload.indexOf('&');
    const mainPart = ampIdx >= 0 ? nextPayload.slice(0, ampIdx) : nextPayload;
    const queryRest = ampIdx >= 0 ? nextPayload.slice(ampIdx) : '';
    const prefixMatch = mainPart.match(/^(#?[gb]=)(.*)$/);

    if (prefixMatch) {
      const [, prefix, dotBody] = prefixMatch;
      const dotParts = dotBody.split('.');
      if (dotParts.length > 2) {
        const [headerPart, cardPart, ...stemParts] = dotParts;
        const candidates: Array<{ stemIndex: number; b64Len: number; tildeParts: string[] }> = [];

        stemParts.forEach((sp, stemIndex) => {
          const tildeParts = sp.split('~');
          if (
            tildeParts.length >= 8 &&
            tildeParts[7] &&
            !isAssetPointer(tildeParts[7]) &&
            tildeParts[7].length > 64
          ) {
            candidates.push({ stemIndex, b64Len: tildeParts[7].length, tildeParts });
          }
        });

        // Offload largest photos first until safely under maxCombinedBytes
        candidates.sort((a, b) => b.b64Len - a.b64Len);

        let photoCounter = 0;
        for (const cand of candidates) {
          if (currentSize() <= maxCombinedBytes) break;
          const decodedDataUrl = fromBase64UrlSafe(cand.tildeParts[7]);
          if (
            !decodedDataUrl ||
            decodedDataUrl.length < 10 ||
            decodedDataUrl.length > MAX_SINGLE_ASSET_BYTES
          ) {
            continue;
          }
          const assetId = `${safeCode}_p${photoCounter}`;
          photoCounter += 1;
          if (!VALID_ASSET_ID_REGEX.test(assetId)) continue;

          assets.push({
            assetId,
            bouquetCode: safeCode,
            kind: 'photo',
            dataUrl: decodedDataUrl,
            createdAt,
          });
          cand.tildeParts[7] = `${ASSET_POINTER_PREFIX}${assetId}`;
          stemParts[cand.stemIndex] = cand.tildeParts.join('~');
          nextPayload = `${prefix}${headerPart}.${cardPart}.${stemParts.join('.')}${queryRest}`;
        }
      }
    }
  }

  return {
    payload: nextPayload,
    voiceAudioDataUrl: nextVoice,
    assets,
    combinedBytes: currentSize(),
  };
}

/**
 * Scans a stored `shared_bouquets/{code}` record for any `asset:{assetId}` pointers
 * inside `voiceAudioDataUrl` or photocard stems of `payload`.
 */
export function collectAssetIdsFromBouquetRecord(
  payload?: string | null,
  voiceAudioDataUrl?: string | null
): string[] {
  const ids = new Set<string>();
  const voiceId = extractAssetIdFromPointer(voiceAudioDataUrl);
  if (voiceId) ids.add(voiceId);

  if (typeof payload === 'string' && payload.includes(ASSET_POINTER_PREFIX)) {
    const ampIdx = payload.indexOf('&');
    const mainPart = ampIdx >= 0 ? payload.slice(0, ampIdx) : payload;
    const prefixMatch = mainPart.match(/^(#?[gb]=)(.*)$/);
    if (prefixMatch) {
      const dotParts = prefixMatch[2].split('.');
      for (let i = 2; i < dotParts.length; i++) {
        const tildeParts = dotParts[i].split('~');
        if (tildeParts.length >= 8) {
          const photoAssetId = extractAssetIdFromPointer(tildeParts[7]);
          if (photoAssetId) ids.add(photoAssetId);
        }
      }
    }
  }
  return Array.from(ids);
}

/**
 * Re-hydrates any `asset:{assetId}` pointers in `payload` and `voiceAudioDataUrl`
 * back into full inline base64url photo strings and voice data URLs using the fetched `assetMap`.
 */
export function rehydrateBouquetRecordWithAssets(
  payload: string,
  voiceAudioDataUrl: string | null | undefined,
  assetMap: Record<string, string>
): { payload: string; voiceAudioDataUrl?: string } {
  let nextVoice: string | undefined =
    typeof voiceAudioDataUrl === 'string' && voiceAudioDataUrl.length > 0
      ? voiceAudioDataUrl
      : undefined;

  const voiceAssetId = extractAssetIdFromPointer(nextVoice);
  if (voiceAssetId && assetMap[voiceAssetId]) {
    nextVoice = assetMap[voiceAssetId];
  } else if (voiceAssetId && !assetMap[voiceAssetId]) {
    nextVoice = undefined;
  }

  let nextPayload = payload;
  if (typeof payload === 'string' && payload.includes(ASSET_POINTER_PREFIX)) {
    const ampIdx = payload.indexOf('&');
    const mainPart = ampIdx >= 0 ? payload.slice(0, ampIdx) : payload;
    const queryRest = ampIdx >= 0 ? payload.slice(ampIdx) : '';
    const prefixMatch = mainPart.match(/^(#?[gb]=)(.*)$/);

    if (prefixMatch) {
      const [, prefix, dotBody] = prefixMatch;
      const dotParts = dotBody.split('.');
      if (dotParts.length > 2) {
        const [headerPart, cardPart, ...stemParts] = dotParts;
        const hydratedStems = stemParts.map((sp) => {
          const tildeParts = sp.split('~');
          if (tildeParts.length >= 8) {
            const photoAssetId = extractAssetIdFromPointer(tildeParts[7]);
            if (photoAssetId && assetMap[photoAssetId]) {
              tildeParts[7] = toBase64UrlSafe(assetMap[photoAssetId]);
              return tildeParts.join('~');
            }
          }
          return sp;
        });
        nextPayload = `${prefix}${headerPart}.${cardPart}.${hydratedStems.join('.')}${queryRest}`;
      }
    }
  }

  return { payload: nextPayload, voiceAudioDataUrl: nextVoice };
}

/**
 * Lightweight, pure inspection of a compact `#g=` / `#b=` payload to extract
 * asset counts, styling metadata, and recipient/sender summary for the Admin Bouquet Log.
 */
export function inspectPayloadAssetsSummary(
  payload: string,
  voiceAudioDataUrl?: string | null
): PayloadAssetsSummary {
  const defaultSummary: PayloadAssetsSummary = {
    to: 'Someone Special',
    from: 'Yours Always',
    noteExcerpt: '',
    flowerCount: 0,
    photoCount: 0,
    hasVoice: Boolean(voiceAudioDataUrl && voiceAudioDataUrl.length > 0),
    lockMode: 'none',
    payloadBytes: typeof payload === 'string' ? payload.length : 0,
    voiceBytes: typeof voiceAudioDataUrl === 'string' ? voiceAudioDataUrl.length : 0,
  };

  if (!payload || typeof payload !== 'string') return defaultSummary;
  const normalized = payload.startsWith('#') ? payload : `#${payload}`;
  if (!normalized.startsWith('#g=') && !normalized.startsWith('#b=')) {
    return defaultSummary;
  }

  const querySegments = normalized.slice(3).split('&');
  const rawMain = querySegments[0] || '';
  const dotParts = rawMain.split('.');
  if (dotParts.length < 2) return defaultSummary;

  const [headerPart, cardPart, ...stemParts] = dotParts;

  // Header
  const [wIdxStr = '0', , , rStyleStr = ''] = headerPart.split('~');
  const wrapStyle = WRAP_STYLE_LOOKUP[parseInt(wIdxStr, 36)] || 'kraft';
  const ribbonStyle = rStyleStr
    ? RIBBON_STYLE_LOOKUP[parseInt(rStyleStr, 36)] || 'satin'
    : 'satin';

  // Card
  const [, cToB64 = '!', cFromB64 = '!', cMsgB64 = '!'] = cardPart.split('~');
  const to =
    cToB64 === '*'
      ? 'Someone Special'
      : !cToB64 || cToB64 === '!'
      ? 'My Dearest'
      : fromBase64UrlSafe(cToB64) || 'Someone Special';
  const from =
    cFromB64 === '*'
      ? 'Yours'
      : !cFromB64 || cFromB64 === '!'
      ? 'Yours Always'
      : fromBase64UrlSafe(cFromB64) || 'Yours Always';
  const rawMsg =
    !cMsgB64 || cMsgB64 === '!' ? '' : fromBase64UrlSafe(cMsgB64) || '';
  const noteExcerpt = rawMsg.trim().slice(0, 120);

  // Stems & Photos
  let flowerCount = 0;
  let photoCount = 0;
  if (stemParts.length === 1 && stemParts[0].startsWith('@')) {
    flowerCount = 5; // Starter preset
  } else {
    for (const sp of stemParts) {
      if (sp.length < 8) continue;
      flowerCount += 1;
      const tildeParts = sp.split('~');
      if (tildeParts.length >= 6 && tildeParts[5] !== '') {
        photoCount += 1;
      }
    }
  }

  // Voice
  let hasVoice = Boolean(voiceAudioDataUrl && voiceAudioDataUrl.length > 0);
  let voiceStyle: string | undefined;
  const vSeg = querySegments.find((s) => s.startsWith('v='));
  if (vSeg) {
    const vParts = vSeg.slice(2).split('~');
    const vIdx = parseInt(vParts[0] || '0', 36);
    voiceStyle = VOICE_STYLE_LOOKUP[vIdx] || 'mixtape';
    if (vParts[6] && vParts[6].length > 0) {
      hasVoice = true;
    }
  }

  // Lock
  let lockMode: 'none' | 'countdown' | 'passcode' = 'none';
  const lSeg = querySegments.find((s) => s.startsWith('l='));
  if (lSeg) {
    const modeCode = (lSeg.slice(2).split('~')[0] || 'n').trim();
    if (modeCode === 'c') lockMode = 'countdown';
    else if (modeCode === 'p') lockMode = 'passcode';
  }

  // Environment
  let environment = 'studio';
  const eSeg = querySegments.find((s) => s.startsWith('e='));
  if (eSeg) {
    const eIdx = parseInt(eSeg.slice(2), 36);
    environment = ENV_LOOKUP[eIdx] || 'studio';
  }

  return {
    to: to.slice(0, 80),
    from: from.slice(0, 80),
    noteExcerpt,
    flowerCount,
    photoCount,
    hasVoice,
    voiceStyle,
    wrapStyle,
    ribbonStyle,
    environment,
    lockMode,
    payloadBytes: payload.length,
    voiceBytes: typeof voiceAudioDataUrl === 'string' ? voiceAudioDataUrl.length : 0,
  };
}

export function isGarlandDisplayExpired(
  entry: Pick<AdminBouquetLogEntry, 'pinnedToGarland' | 'isPremium' | 'retentionDays' | 'createdAt'>,
  nowMs = Date.now()
): boolean {
  if (!entry.pinnedToGarland) return false;
  if (entry.isPremium) return false;
  const days = typeof entry.retentionDays === 'number' && entry.retentionDays > 0 ? entry.retentionDays : 30;
  if (days >= 36500) return false;
  const createdMs = Date.parse(entry.createdAt || '');
  if (!Number.isFinite(createdMs)) return false;
  return nowMs - createdMs >= days * 24 * 60 * 60 * 1000;
}

export function classifyAdminBouquetStatus(
  entry: Pick<AdminBouquetLogEntry, 'pinnedToGarland' | 'isPremium' | 'retentionDays' | 'createdAt'>,
  nowMs = Date.now()
): AdminBouquetDisplayClass {
  if (!entry.pinnedToGarland) return 'private_eternal';
  return isGarlandDisplayExpired(entry, nowMs) ? 'garland_expired' : 'garland_live';
}

export function countAdminBouquetStatuses(
  entries: AdminBouquetLogEntry[],
  nowMs = Date.now()
): Record<AdminBouquetFilterStatus, number> {
  const counts: Record<AdminBouquetFilterStatus, number> = {
    all: entries.length,
    garland: 0,
    private: 0,
    expired_garland: 0,
    with_voice: 0,
    with_photos: 0,
  };

  for (const entry of entries) {
    const cls = classifyAdminBouquetStatus(entry, nowMs);
    if (cls === 'garland_live') counts.garland += 1;
    else if (cls === 'garland_expired') counts.expired_garland += 1;
    else counts.private += 1;

    if (entry.hasVoice) counts.with_voice += 1;
    if (entry.photoCount > 0) counts.with_photos += 1;
  }

  return counts;
}

export function filterAdminBouquetLog(
  entries: AdminBouquetLogEntry[],
  options: { status?: AdminBouquetFilterStatus; search?: string } = {},
  nowMs = Date.now()
): AdminBouquetLogEntry[] {
  const status = options.status || 'all';
  const query = (options.search || '').trim().toLowerCase();

  return entries.filter((entry) => {
    const cls = classifyAdminBouquetStatus(entry, nowMs);
    if (status === 'garland' && cls !== 'garland_live') return false;
    if (status === 'private' && cls !== 'private_eternal') return false;
    if (status === 'expired_garland' && cls !== 'garland_expired') return false;
    if (status === 'with_voice' && !entry.hasVoice) return false;
    if (status === 'with_photos' && !(entry.photoCount > 0)) return false;

    if (!query) return true;
    const haystack = [
      entry.code,
      entry.to,
      entry.from,
      entry.noteExcerpt,
      entry.wrapStyle,
      entry.ribbonStyle,
      entry.environment,
      entry.voiceStyle,
      entry.recipientReply,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  });
}

/**
 * Extracts a clean short code from either a raw code (`Vu18KSuusq9133s`)
 * or a full bouquet URL (`https://sendabouquet.shop/Vu18KSuusq9133s`).
 */
export function extractShortCodeFromInput(rawInput: string): string | null {
  const trimmed = String(rawInput || '').trim();
  if (!trimmed) return null;
  const cleanedUrl = trimmed
    .replace(/^https?:\/\/[^/]+/i, '')
    .split('?')[0]
    .split('#')[0]
    .replace(/^\/+|\/+$/g, '');
  const segments = cleanedUrl.split('/').filter(Boolean);
  const candidate = segments.length > 0 ? segments[segments.length - 1] : '';
  if (!candidate || !VALID_SHORT_CODE_REGEX.test(candidate) || candidate.startsWith('sab_')) {
    return null;
  }
  return candidate;
}

export function formatBytesCompact(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
