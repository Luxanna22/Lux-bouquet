import {
  SERVER_PASS_STORE,
  fetchStudioPassFromFirestoreRest,
  hydratePersistentOwnerVaultServer,
  isValidPassKeyFormat,
  normalizePassKey,
  verifyActiveStudioPassForActionServer,
} from './paymentHandler.js';

const SHARE_FLOWER_TYPES = [
  'rose',
  'tulip',
  'sunflower',
  'daisy',
  'lily',
  'peony',
  'lavender',
  'hydrangea',
  'babysBreath',
  'eucalyptus',
  'fern',
  'orchid',
  'carnation',
  'ranunculus',
  'anemone',
  'dahlia',
  'iris',
  'camellia',
  'lotus',
  'cherryBlossom',
  'waxflower',
  'billyButtons',
  'oliveBranch',
  'monstera',
  'callalily',
  'poppy',
  'sweetpea',
  'freesia',
  'pampas',
  'queenanneslace',
  'astilbe',
  'celestialRose',
  'crystalOrchid',
  'luminaPeony',
  'gildedFern',
  'starlightGypsophila',
  'cosmos',
  'magnolia',
  'hibiscus',
  'zinnia',
  'forgetMeNot',
  'lilyOfTheValley',
  'marigold',
  'morningGlory',
  'plumeria',
  'delphinium',
  'auroraGardenia',
  'velvetBaccara',
  'imperialFritillaria',
  'julietAustinRose',
  'lunariaHonesty',
  'monarchButterfly',
  'crystalButterfly',
  'velvetHeartPick',
  'doubleHeartCharm',
  'starburstSparkle',
  'cupidArrowPick',
  'lovebirdPerch',
  'waxSealCrest',
  'fairyLightGarland',
  'ribbonBowPick',
  'poinsettia',
  'hollyBerries',
  'mistletoeBough',
  'amaryllis',
  'hellebore',
  'frostedPinecone',
  'crystalSnowflake',
  'candyCanePick',
  'glassOrnament',
  'gingerbreadHeart',
  'sleighBellsPick',
  'cinnamonStarAnise',
  'sittingDog',
  'lovelyCats',
  'moon',
  'sun',
  'star',
  'clouds',
  'chocolates',
  'ringInABox',
];

const SHARE_WRAP_STYLES = [
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

const SHARE_RIBBON_STYLES = [
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

const SHARE_ENVIRONMENTS = [
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

const PREMIUM_FLOWERS = new Set([
  'celestialRose',
  'crystalOrchid',
  'luminaPeony',
  'gildedFern',
  'starlightGypsophila',
  'iris',
  'camellia',
  'lotus',
  'callalily',
  'poppy',
  'sweetpea',
  'freesia',
  'oliveBranch',
  'monstera',
  'pampas',
  'queenanneslace',
  'astilbe',
  'auroraGardenia',
  'velvetBaccara',
  'imperialFritillaria',
  'julietAustinRose',
  'lunariaHonesty',
  'poinsettia',
  'hollyBerries',
  'mistletoeBough',
  'amaryllis',
  'frostedPinecone',
  'glassOrnament',
  'cinnamonStarAnise',
]);

const PREMIUM_WRAPS = new Set(['vase', 'hatbox', 'cloche', 'koreanmesh']);
const PREMIUM_RIBBONS = new Set([
  'pearlStrand',
  'celestialSilk',
  'waxCord',
  'organza',
  'velvet',
  'chiffon',
  'goldchain',
  'raffia',
]);
const PREMIUM_ENVIRONMENTS = new Set([
  'aurora',
  'velvetSalon',
  'opalMist',
  'starlit',
  'crystalPalace',
  'midnightNoel',
]);

const FREE_CARD_NOTE_MAX_CHARS = 560;

function decodeBase64UrlUtf8(b64url) {
  try {
    let b64 = String(b64url || '').trim().replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4 !== 0) {
      b64 += '=';
    }
    const binary = Buffer.from(b64, 'base64').toString('binary');
    const percentEncoded = Array.from(binary)
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('');
    return decodeURIComponent(percentEncoded);
  } catch {
    return '';
  }
}

export function inspectCompactPayloadCoutureUsage(payload = '', extra = {}) {
  const reasons = [];
  const raw = String(payload || '').trim();

  if (extra?.voiceAudioDataUrl && String(extra.voiceAudioDataUrl).trim().length > 0) {
    reasons.push('Voice Keepsake');
  }

  if (raw.startsWith('#g=') || raw.startsWith('#b=')) {
    const fullAfterPrefix = raw.slice(3);
    const querySegments = fullAfterPrefix.split('&');
    const rawPayload = (querySegments[0] || '').trim();
    const parts = rawPayload.split('.');
    const [headerPart = '', cardPart = '', ...stemParts] = parts;

    const [wIdxStr = '0', , , rStyleStr = ''] = headerPart.split('~');
    const wrapStyle = SHARE_WRAP_STYLES[parseInt(wIdxStr, 36)] || 'chalice';
    if (PREMIUM_WRAPS.has(wrapStyle)) {
      reasons.push(`Couture wrap (${wrapStyle})`);
    }

    const ribbonStyle = rStyleStr ? SHARE_RIBBON_STYLES[parseInt(rStyleStr, 36)] || 'satin' : 'satin';
    if (wrapStyle !== 'plain' && PREMIUM_RIBBONS.has(ribbonStyle)) {
      reasons.push(`Couture ribbon (${ribbonStyle})`);
    }

    const [cMetaStr = '1', , , cMsgB64 = '!'] = cardPart.split('~');
    const cMeta = parseInt(cMetaStr, 36) || 0;
    const cardVisible = cMeta % 2 === 1;
    if (cardVisible && cMsgB64 && cMsgB64 !== '!') {
      const msg = decodeBase64UrlUtf8(cMsgB64);
      if (msg.trim().length > FREE_CARD_NOTE_MAX_CHARS) {
        reasons.push('Extended Card Note');
      }
    }

    if (!(stemParts.length === 1 && stemParts[0].startsWith('@'))) {
      for (const sp of stemParts) {
        if (!sp || sp.length < 8) continue;
        const [base, flagsStr = '0', , , , pStyleStr = ''] = sp.split('~');
        const flags = parseInt(flagsStr, 36) || 0;
        const isHidden = Boolean(flags & 4);
        if (isHidden) continue;

        if (pStyleStr !== '') {
          reasons.push('Photo Keepsake');
          continue;
        }
        const typeLen = Math.max(1, base.length - 7);
        const rawCode = parseInt(base.slice(0, typeLen), 36) || 0;
        const flowerType = SHARE_FLOWER_TYPES[rawCode] || 'rose';
        if (PREMIUM_FLOWERS.has(flowerType)) {
          reasons.push(`Couture bloom (${flowerType})`);
        }
      }
    }

    const vSegment = querySegments.find((seg) => seg.startsWith('v='));
    if (vSegment) {
      const vParts = vSegment.slice(2).split('~');
      const vVisStr = vParts[1] || '0';
      const vAudioB64 = vParts[6] || '';
      if (vVisStr === '1' || vAudioB64.trim().length > 0) {
        reasons.push('Voice Keepsake');
      }
    }

    const lSegment = querySegments.find((seg) => seg.startsWith('l='));
    if (lSegment) {
      const modeCode = lSegment.slice(2).split('~')[0] || 'n';
      if (modeCode === 'c' || modeCode === 'p') {
        reasons.push('Secret/Date Lock');
      }
    }

    const eSegment = querySegments.find((seg) => seg.startsWith('e='));
    if (eSegment) {
      const eIdx = parseInt(eSegment.slice(2), 36);
      const env = SHARE_ENVIRONMENTS[eIdx] || 'studio';
      if (PREMIUM_ENVIRONMENTS.has(env)) {
        reasons.push(`Couture background (${env})`);
      }
    }
  }

  return {
    isCouture: reasons.length > 0,
    reasons: Array.from(new Set(reasons)),
  };
}

export async function verifyShortenCouturePermission(bodyObj = {}) {
  const code = String(bodyObj.code || '').replace(/[^0-9A-Za-z_-]/g, '');
  const payload = String(bodyObj.payload || '').trim();
  const requestedPremium = Boolean(bodyObj.isPremium);
  const requestedRetention =
    typeof bodyObj.retentionDays === 'number' && Number.isFinite(bodyObj.retentionDays)
      ? bodyObj.retentionDays
      : 30;

  const inspection = inspectCompactPayloadCoutureUsage(payload, {
    voiceAudioDataUrl: bodyObj.voiceAudioDataUrl || null,
  });

  const requiresPaidPass =
    inspection.isCouture || requestedPremium || requestedRetention > 30;

  if (!requiresPaidPass) {
    return {
      ok: true,
      isPremium: false,
      retentionDays: 30,
      reasons: [],
    };
  }

  const clientPass = bodyObj.pass && typeof bodyObj.pass === 'object' ? bodyObj.pass : null;
  const rawPassKey =
    typeof bodyObj.passKey === 'string' && bodyObj.passKey
      ? bodyObj.passKey
      : clientPass?.passKey || '';
  const deviceTokenHash =
    typeof bodyObj.deviceTokenHash === 'string' ? bodyObj.deviceTokenHash.trim() : '';
  const activeSessionNonce =
    typeof bodyObj.activeSessionNonce === 'string' && bodyObj.activeSessionNonce
      ? bodyObj.activeSessionNonce
      : clientPass?.activeSessionNonce || '';

  const normKey = normalizePassKey(rawPassKey);
  if (
    !isValidPassKeyFormat(normKey) ||
    !deviceTokenHash ||
    normKey.startsWith('BLOOM-KS') ||
    normKey.startsWith('BLOOM-BG') ||
    normKey.startsWith('BLOOM-SP') ||
    normKey === 'BLOOM-KCFG-SHOP'
  ) {
    return {
      ok: false,
      statusCode: 403,
      error:
        'This bouquet uses Couture keepsakes or extended link retention and requires a verified Bloom Key.',
    };
  }

  await hydratePersistentOwnerVaultServer();

  const canonicalPass =
    SERVER_PASS_STORE.get(normKey) || (await fetchStudioPassFromFirestoreRest(normKey));

  if (!canonicalPass) {
    return {
      ok: false,
      statusCode: 403,
      error: 'Studio Pass could not be verified on the server.',
    };
  }

  const check = verifyActiveStudioPassForActionServer({
    pass: canonicalPass,
    deviceTokenHash,
    clientSessionNonce: activeSessionNonce,
    bouquetCode: code || null,
    incrementUsage: false,
  });

  if (!check.valid || !check.updatedPass) {
    return {
      ok: false,
      statusCode: 403,
      error:
        check.message ||
        'This bouquet uses Couture keepsakes and requires an active verified Bloom Key.',
    };
  }

  const isEternal = check.updatedPass.tier === 'pass_30d' && Boolean(check.updatedPass.isEternalKeepsake);
  return {
    ok: true,
    isPremium: isEternal,
    retentionDays: isEternal ? 36500 : 90,
    pass: check.updatedPass,
    reasons: inspection.reasons,
  };
}
