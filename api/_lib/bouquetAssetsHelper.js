// ============================================================================
// SERVER-SIDE BOUQUET ASSET OVERFLOW SPLITTING, REHYDRATION & PAYLOAD INSPECTOR
// Plain ESM mirror of `src/lib/bouquetPersistence.ts` for Vercel/Node API handlers.
// ============================================================================

export const ASSET_POINTER_PREFIX = 'asset:';
export const DEFAULT_MAX_COMBINED_DOC_BYTES = 750_000;
export const MAX_SINGLE_ASSET_BYTES = 850_000;
export const MAX_GARLAND_FEED_ENTRIES = 250;

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

export function toBase64UrlServer(str) {
  return Buffer.from(String(str || ''), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function fromBase64UrlServer(b64url) {
  try {
    let b64 = String(b64url || '').trim().replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4 !== 0) {
      b64 += '=';
    }
    return Buffer.from(b64, 'base64').toString('utf8');
  } catch {
    return '';
  }
}

export function isAssetPointerServer(val) {
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  if (!trimmed.startsWith(ASSET_POINTER_PREFIX)) return false;
  return VALID_ASSET_ID_REGEX.test(trimmed.slice(ASSET_POINTER_PREFIX.length));
}

export function extractAssetIdFromPointerServer(val) {
  if (!isAssetPointerServer(val)) return null;
  return val.trim().slice(ASSET_POINTER_PREFIX.length);
}

export function stripInlineAudioFromCompactPayloadServer(payload) {
  if (!payload || typeof payload !== 'string') return '';
  return payload.replace(/(&v=)([^&]*)/, (_match, prefix, vBody) => {
    const parts = vBody.split('~');
    if (parts.length >= 7 && parts[6]) {
      parts[6] = '';
    }
    return `${prefix}${parts.join('~')}`;
  });
}

/**
 * Correctly strips inline photocard base64url images (stem tilde index 7) from a compact
 * `#g=` / `#b=` payload while keeping stems, captions, coordinates, and frames intact.
 */
export function stripInlinePhotosFromCompactPayloadServer(payload) {
  if (!payload || typeof payload !== 'string') return '';
  const clean = stripInlineAudioFromCompactPayloadServer(payload);
  const ampIdx = clean.indexOf('&');
  const mainPart = ampIdx >= 0 ? clean.slice(0, ampIdx) : clean;
  const queryRest = ampIdx >= 0 ? clean.slice(ampIdx) : '';
  const prefixMatch = mainPart.match(/^(#?[gb]=)(.*)$/);
  if (!prefixMatch) return clean;
  const [, prefix, dotBody] = prefixMatch;
  const dotParts = dotBody.split('.');
  if (dotParts.length <= 2) return clean;
  const [headerPart, cardPart, ...stemParts] = dotParts;
  const slimmedStems = stemParts.map((sp) => {
    const tildeParts = sp.split('~');
    if (tildeParts.length >= 8 && tildeParts[7]) {
      tildeParts[7] = '';
    }
    return tildeParts.join('~').replace(/~+$/, '');
  });
  return `${prefix}${headerPart}.${cardPart}.${slimmedStems.join('.')}${queryRest}`;
}

/**
 * Sanitizes a compact `#g=` / `#b=` payload for the public Shared Creations Lace Garland feed:
 * - Removes lock parameters (`&l=...`) so passcodes, secret questions, and unlock timestamps are NEVER exposed.
 * - Removes personal greeting card text (`cMsg`) by replacing it with `*` (empty on decode) while preserving
 *   card theme, stage visibility, colors, and recipient/sender labels (`For ...`, `From ...`).
 * - Removes inline voice audio and inline photo base64 data & photo captions while preserving stem/wrapper/ribbon/frame geometry.
 */
export function sanitizeGarlandPreviewPayloadServer(payload) {
  if (!payload || typeof payload !== 'string') return '';
  const withoutAudioOrLock = stripInlineAudioFromCompactPayloadServer(payload).replace(
    /&l=[^&]*/g,
    ''
  );
  const ampIdx = withoutAudioOrLock.indexOf('&');
  const mainPart = ampIdx >= 0 ? withoutAudioOrLock.slice(0, ampIdx) : withoutAudioOrLock;
  const queryRest = ampIdx >= 0 ? withoutAudioOrLock.slice(ampIdx) : '';
  const prefixMatch = mainPart.match(/^(#?[gb]=)(.*)$/);
  if (!prefixMatch) return withoutAudioOrLock;

  const [, prefix, dotBody] = prefixMatch;
  const dotParts = dotBody.split('.');
  if (dotParts.length < 2) return withoutAudioOrLock;

  const [headerPart, cardPart, ...stemParts] = dotParts;
  const cardFields = cardPart.split('~');
  while (cardFields.length < 4) {
    cardFields.push('!');
  }
  // Mask private personal greeting card message in public landing-page index (full message loads via `/{code}` after lock check)
  cardFields[3] = '*';
  const safeCardPart = cardFields.join('~').replace(/~+$/, '');

  const slimmedStems = stemParts.map((sp) => {
    const tildeParts = sp.split('~');
    if (tildeParts.length >= 7 && tildeParts[6]) {
      tildeParts[6] = '';
    }
    if (tildeParts.length >= 8 && tildeParts[7]) {
      tildeParts[7] = '';
    }
    return tildeParts.join('~').replace(/~+$/, '');
  });

  const body =
    slimmedStems.length > 0
      ? `${headerPart}.${safeCardPart}.${slimmedStems.join('.')}`
      : `${headerPart}.${safeCardPart}`;
  return `${prefix}${body}${queryRest}`;
}

export function extractOverflowAssetsFromPayloadServer(
  code,
  payload,
  voiceAudioDataUrl,
  options = {}
) {
  const maxCombinedBytes = options.maxCombinedBytes ?? DEFAULT_MAX_COMBINED_DOC_BYTES;
  const createdAt = options.createdAt || new Date().toISOString();
  const safeCode = String(code || '').replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 24);

  let nextPayload =
    voiceAudioDataUrl && typeof voiceAudioDataUrl === 'string'
      ? stripInlineAudioFromCompactPayloadServer(String(payload || ''))
      : String(payload || '');
  let nextVoice =
    voiceAudioDataUrl && typeof voiceAudioDataUrl === 'string' && voiceAudioDataUrl.length > 0
      ? voiceAudioDataUrl
      : undefined;

  const assets = [];
  const currentSize = () => nextPayload.length + (nextVoice ? nextVoice.length : 0);

  if (!safeCode || !VALID_SHORT_CODE_REGEX.test(safeCode) || safeCode.startsWith('sab_')) {
    return {
      payload: nextPayload,
      voiceAudioDataUrl: nextVoice,
      assets,
      combinedBytes: currentSize(),
    };
  }

  if (
    currentSize() > maxCombinedBytes &&
    nextVoice &&
    !isAssetPointerServer(nextVoice) &&
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
        const candidates = [];

        stemParts.forEach((sp, stemIndex) => {
          const tildeParts = sp.split('~');
          if (
            tildeParts.length >= 8 &&
            tildeParts[7] &&
            !isAssetPointerServer(tildeParts[7]) &&
            tildeParts[7].length > 64
          ) {
            candidates.push({ stemIndex, b64Len: tildeParts[7].length, tildeParts });
          }
        });

        candidates.sort((a, b) => b.b64Len - a.b64Len);

        let photoCounter = 0;
        for (const cand of candidates) {
          if (currentSize() <= maxCombinedBytes) break;
          const decodedDataUrl = fromBase64UrlServer(cand.tildeParts[7]);
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

export function collectAssetIdsFromBouquetRecordServer(payload, voiceAudioDataUrl) {
  const ids = new Set();
  const voiceId = extractAssetIdFromPointerServer(voiceAudioDataUrl);
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
          const photoAssetId = extractAssetIdFromPointerServer(tildeParts[7]);
          if (photoAssetId) ids.add(photoAssetId);
        }
      }
    }
  }
  return Array.from(ids);
}

export function rehydrateBouquetRecordWithAssetsServer(payload, voiceAudioDataUrl, assetMap) {
  let nextVoice =
    typeof voiceAudioDataUrl === 'string' && voiceAudioDataUrl.length > 0
      ? voiceAudioDataUrl
      : null;

  const voiceAssetId = extractAssetIdFromPointerServer(nextVoice);
  if (voiceAssetId && assetMap[voiceAssetId]) {
    nextVoice = assetMap[voiceAssetId];
  } else if (voiceAssetId && !assetMap[voiceAssetId]) {
    nextVoice = null;
  }

  let nextPayload = String(payload || '');
  if (nextPayload.includes(ASSET_POINTER_PREFIX)) {
    const ampIdx = nextPayload.indexOf('&');
    const mainPart = ampIdx >= 0 ? nextPayload.slice(0, ampIdx) : nextPayload;
    const queryRest = ampIdx >= 0 ? nextPayload.slice(ampIdx) : '';
    const prefixMatch = mainPart.match(/^(#?[gb]=)(.*)$/);

    if (prefixMatch) {
      const [, prefix, dotBody] = prefixMatch;
      const dotParts = dotBody.split('.');
      if (dotParts.length > 2) {
        const [headerPart, cardPart, ...stemParts] = dotParts;
        const hydratedStems = stemParts.map((sp) => {
          const tildeParts = sp.split('~');
          if (tildeParts.length >= 8) {
            const photoAssetId = extractAssetIdFromPointerServer(tildeParts[7]);
            if (photoAssetId && assetMap[photoAssetId]) {
              tildeParts[7] = toBase64UrlServer(assetMap[photoAssetId]);
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

export function inspectPayloadAssetsSummaryServer(payload, voiceAudioDataUrl) {
  const defaultSummary = {
    to: 'Someone Special',
    from: 'Yours Always',
    noteExcerpt: '',
    flowerCount: 0,
    photoCount: 0,
    hasVoice: Boolean(voiceAudioDataUrl && voiceAudioDataUrl.length > 0),
    voiceStyle: undefined,
    wrapStyle: 'kraft',
    ribbonStyle: 'satin',
    environment: 'studio',
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

  const [wIdxStr = '0', , , rStyleStr = ''] = headerPart.split('~');
  const wrapStyle = WRAP_STYLE_LOOKUP[parseInt(wIdxStr, 36)] || 'kraft';
  const ribbonStyle = rStyleStr
    ? RIBBON_STYLE_LOOKUP[parseInt(rStyleStr, 36)] || 'satin'
    : 'satin';

  const [, cToB64 = '!', cFromB64 = '!', cMsgB64 = '!'] = cardPart.split('~');
  const to =
    cToB64 === '*'
      ? 'Someone Special'
      : !cToB64 || cToB64 === '!'
      ? 'My Dearest'
      : fromBase64UrlServer(cToB64) || 'Someone Special';
  const from =
    cFromB64 === '*'
      ? 'Yours'
      : !cFromB64 || cFromB64 === '!'
      ? 'Yours Always'
      : fromBase64UrlServer(cFromB64) || 'Yours Always';
  const rawMsg =
    !cMsgB64 || cMsgB64 === '!' || cMsgB64 === '*' ? '' : fromBase64UrlServer(cMsgB64) || '';
  const noteExcerpt = rawMsg.trim().slice(0, 120);

  let flowerCount = 0;
  let photoCount = 0;
  if (stemParts.length === 1 && stemParts[0].startsWith('@')) {
    flowerCount = 5;
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

  let hasVoice = Boolean(voiceAudioDataUrl && voiceAudioDataUrl.length > 0);
  let voiceStyle;
  const vSeg = querySegments.find((s) => s.startsWith('v='));
  if (vSeg) {
    const vParts = vSeg.slice(2).split('~');
    const vIdx = parseInt(vParts[0] || '0', 36);
    voiceStyle = VOICE_STYLE_LOOKUP[vIdx] || 'mixtape';
    if (vParts[6] && vParts[6].length > 0) {
      hasVoice = true;
    }
  }

  let lockMode = 'none';
  const lSeg = querySegments.find((s) => s.startsWith('l='));
  if (lSeg) {
    const modeCode = (lSeg.slice(2).split('~')[0] || 'n').trim();
    if (modeCode === 'c') lockMode = 'countdown';
    else if (modeCode === 'p') lockMode = 'passcode';
  }

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
