import {
  FlowerType,
  CardTheme,
  RibbonStyle,
  VoiceKeepsakeStyle,
  VoiceKeepsakeData,
  BouquetLockConfig,
  BouquetLockMode,
  DEFAULT_BOUQUET_LOCK,
  PhotoFrameStyle,
  PHOTO_FRAME_CATALOG,
  CanvasEnvironment,
  BouquetPose,
  DEFAULT_BOUQUET_POSE,
  typeWrapStyle,
  BouquetItem,
  BouquetSnapshot,
  FLOWER_CATALOG,
  WRAPPER_CATALOG,
  VOICE_KEEPSAKE_CATALOG,
  DEFAULT_VOICE_KEEPSAKE,
  STARTER_TEMPLATES,
  INITIAL_ITEMS,
} from '../types/bouquet';

// ============================================================================
// MODULE 3: lib/ — URL SHARE SERIALIZATION & HIGH-RES PNG EXPORT
// ============================================================================

const SHARE_FLOWER_TYPES: FlowerType[] = [
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
  'starlightGypsophila'
];

const SHARE_WRAP_STYLES: typeWrapStyle[] = [
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
  'koreanmesh'
];

const SHARE_RIBBON_STYLES: RibbonStyle[] = [
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
  'celestialSilk'
];

const SHARE_CARD_THEMES: CardTheme[] = [
  'cream',
  'blush',
  'lavender',
  'sage',
  'sky',
  'midnight',
  'terracotta',
  'sealed'
];

const SHARE_VOICE_STYLES: VoiceKeepsakeStyle[] = [
  'mixtape',
  'vinyl',
  'plushie',
  'musicbox',
  'locket'
];

const SHARE_PHOTO_STYLES: PhotoFrameStyle[] = [
  'polaroid',
  'stamp',
  'cameo',
  'film',
  'pressed',
  'arch',
  'raw'
];

const SHARE_ENVIRONMENTS: CanvasEnvironment[] = [
  'studio',
  'paper',
  'meadow',
  'sunlit',
  'linen',
  'starlit',
  'aurora',
  'velvetSalon',
  'opalMist'
];

const DEFAULT_SHARE_CARD_TO = 'My Dearest';
const DEFAULT_SHARE_CARD_FROM = 'Yours Always';
const DEFAULT_SHARE_CARD_MSG =
  'Every petal in this bouquet was chosen to remind you how deeply you are cherished.';

function toBase64Url(str: string): string {
  const utf8Bytes = encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
    String.fromCharCode(parseInt(p1, 16))
  );
  const b64 =
    typeof btoa === 'function'
      ? btoa(utf8Bytes)
      : typeof globalThis !== 'undefined' && 'Buffer' in globalThis
      ? (globalThis as { Buffer: { from: (s: string, e: string) => { toString: (enc: string) => string } } }).Buffer.from(utf8Bytes, 'binary').toString('base64')
      : '';
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(b64url: string): string {
  let b64 = b64url.trim().replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) {
    b64 += '=';
  }
  const binary =
    typeof atob === 'function'
      ? atob(b64)
      : typeof globalThis !== 'undefined' && 'Buffer' in globalThis
      ? (globalThis as { Buffer: { from: (s: string, enc: string) => { toString: (e: string) => string } } }).Buffer.from(b64, 'base64').toString('binary')
      : '';
  const percentEncoded = Array.from(binary)
    .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
    .join('');
  return decodeURIComponent(percentEncoded);
}

function itemsMatchPreset(a: BouquetItem[], b: BouquetItem[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (
      x.photoStyle ||
      y.photoStyle ||
      x.type !== y.type ||
      Math.round(x.x) !== Math.round(y.x) ||
      Math.round(x.y) !== Math.round(y.y) ||
      Math.round(x.scale * 100) !== Math.round(y.scale * 100) ||
      Math.round(x.rotation) !== Math.round(y.rotation) ||
      Math.round((x.stemLength ?? 1) * 100) !== Math.round((y.stemLength ?? 1) * 100) ||
      Boolean(x.flipX) !== Boolean(y.flipX) ||
      Boolean(x.hidden) !== Boolean(y.hidden) ||
      x.petalColor.toLowerCase() !== y.petalColor.toLowerCase() ||
      x.centerColor.toLowerCase() !== y.centerColor.toLowerCase()
    ) {
      return false;
    }
  }
  return true;
}

const BASE62_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
export const localShortCodeCache = new Map<string, string>();

export function computeShortCode(payload: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  let h3 = 0x85ebca6b;
  for (let i = 0; i < payload.length; i++) {
    const c = payload.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ (c + i), 0x85ebca6b) >>> 0;
    h3 = Math.imul(h3 ^ (c * 31 + i), 0xc2b2ae35) >>> 0;
  }
  const toB62 = (n: number, len: number) => {
    let val = n >>> 0;
    let s = '';
    for (let i = 0; i < len; i++) {
      s = BASE62_CHARS[val % 62] + s;
      val = Math.floor(val / 62);
    }
    return s;
  };
  return toB62(h1, 5) + toB62(h2, 5) + toB62(h3, 5);
}

const RESERVED_ROUTE_SLUGS = new Set([
  'studio',
  'garland',
  'creations',
  'showcase',
  'faq',
  'contact',
  'how-it-works',
  'sitemap',
  'robots',
  'manifest',
]);

export function getShortCodeFromPathname(pathnameOverride?: string): string | null {
  const raw =
    pathnameOverride !== undefined
      ? pathnameOverride
      : typeof window !== 'undefined'
      ? window.location.pathname
      : '';
  if (!raw) return null;
  const cleaned = raw.replace(/^https?:\/\/[^/]+/i, '').split('?')[0].split('#')[0].trim();
  const match = cleaned.match(/^\/([0-9A-Za-z]{7,20})$/);
  if (!match) return null;
  if (RESERVED_ROUTE_SLUGS.has(match[1].toLowerCase())) return null;
  return match[1];
}

export function encodeBouquetToCompactPayload(snapshot: BouquetSnapshot, asGift = true): string {
  // 1. Compact Wrapper & Ribbon Header: <wrapIdxBase36>~<optWrapHex>~<optRibbonHex>~<optRibbonStyleIdx> (trimmed trailing ~)
  const wIdx = Math.max(0, SHARE_WRAP_STYLES.indexOf(snapshot.wrapStyle)).toString(36);
  const defaultWrapHex =
    WRAPPER_CATALOG.find((w) => w.id === snapshot.wrapStyle)?.defaultHex.toLowerCase() || '';
  const wHex =
    snapshot.wrapColor.toLowerCase() === defaultWrapHex
      ? ''
      : snapshot.wrapColor.replace('#', '').toLowerCase();
  const rHex =
    snapshot.ribbonColor.toLowerCase() === '#e11d48'
      ? ''
      : snapshot.ribbonColor.replace('#', '').toLowerCase();
  const rStyleIdx = Math.max(0, SHARE_RIBBON_STYLES.indexOf(snapshot.ribbonStyle || 'satin'));
  const rStyleStr = rStyleIdx === 0 ? '' : rStyleIdx.toString(36);
  const headerPart = `${wIdx}~${wHex}~${rHex}~${rStyleStr}`.replace(/~+$/, '');

  // 2. Compact Card Section: <themeAndVisibleBase36>~<toB64>~<fromB64>~<msgB64>~<optCustomBgHex>~<optCustomAccHex>~<optCardX>~<optCardY>~<optCardScale>
  const cTheme = Math.max(0, SHARE_CARD_THEMES.indexOf(snapshot.card.theme));
  const cVis = snapshot.card.visibleOnStage ? 1 : 0;
  const cMeta = (cTheme * 2 + cVis).toString(36);
  const cTo = snapshot.card.to === DEFAULT_SHARE_CARD_TO ? '!' : toBase64Url(snapshot.card.to);
  const cFrom =
    snapshot.card.from === DEFAULT_SHARE_CARD_FROM ? '!' : toBase64Url(snapshot.card.from);
  const cMsg =
    snapshot.card.message === DEFAULT_SHARE_CARD_MSG ? '!' : toBase64Url(snapshot.card.message);
  const cBg = snapshot.card.customBg ? snapshot.card.customBg.replace('#', '').toLowerCase() : '';
  const cAcc = snapshot.card.customAccent
    ? snapshot.card.customAccent.replace('#', '').toLowerCase()
    : '';
  const cX =
    snapshot.card.x !== undefined && Math.round(snapshot.card.x) !== 410
      ? Math.round(snapshot.card.x).toString(36)
      : '';
  const cY =
    snapshot.card.y !== undefined && Math.round(snapshot.card.y) !== 525
      ? Math.round(snapshot.card.y).toString(36)
      : '';
  const cScale =
    snapshot.card.scale !== undefined && Math.abs(snapshot.card.scale - 0.72) > 0.01
      ? Math.round(snapshot.card.scale * 100).toString(36)
      : '';
  const cRot =
    snapshot.card.rotation !== undefined && Math.round(snapshot.card.rotation) !== 0
      ? Math.round(snapshot.card.rotation + 180).toString(36)
      : '';
  const cardPart =
    cBg || cAcc || cX || cY || cScale || cRot
      ? `${cMeta}~${cTo}~${cFrom}~${cMsg}~${cBg}~${cAcc}~${cX}~${cY}~${cScale}~${cRot}`.replace(/~+$/, '')
      : `${cMeta}~${cTo}~${cFrom}~${cMsg}`.replace(/(?:~!)+$/, '');

  // 3. Compact Items Section: 2-char preset token (@0..@7) if stems match a template,
  //    or 8 chars per stem with 1-char type code (0..23 in base36) and flags in extraFlags
  let itemsPart = '';
  if (itemsMatchPreset(snapshot.items, INITIAL_ITEMS)) {
    itemsPart = '@0';
  } else {
    const matchedTplIdx = STARTER_TEMPLATES.findIndex((tpl) =>
      itemsMatchPreset(snapshot.items, tpl.snapshot.items)
    );
    if (matchedTplIdx !== -1) {
      itemsPart = `@${matchedTplIdx + 1}`;
    }
  }

  if (!itemsPart) {
    const clampNum = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
    itemsPart = snapshot.items
      .map((item) => {
        const rawTypeIdx = Math.max(0, SHARE_FLOWER_TYPES.indexOf(item.type));
        const typeChar = rawTypeIdx.toString(36);
        const xStr = Math.round(clampNum(item.x, 0, 600))
          .toString(36)
          .padStart(2, '0');
        const yStr = Math.round(clampNum(item.y, 0, 680))
          .toString(36)
          .padStart(2, '0');
        const sInt = clampNum(Math.round((clampNum(item.scale, 0.3, 2.8) - 0.3) * 14), 0, 35);
        const sStr = sInt.toString(36);
        const rInt = clampNum(Math.round((clampNum(item.rotation, -180, 180) + 180) / 2), 0, 180);
        const rStr = rInt.toString(36).padStart(2, '0');

        const meta = FLOWER_CATALOG.find((m) => m.type === item.type);
        const isDefPetal =
          !item.photoStyle &&
          meta &&
          item.petalColor.toLowerCase() === meta.defaultPetalColor.toLowerCase();
        const isDefCenter =
          !item.photoStyle &&
          meta &&
          item.centerColor.toLowerCase() === meta.defaultCenterColor.toLowerCase();
        const extraFlags =
          (item.flipX ? 1 : 0) |
          (item.locked ? 2 : 0) |
          (item.hidden ? 4 : 0) |
          (item.clippedToBouquet ? 8 : 0);
        const stemLen = item.stemLength ?? 1;
        const isDefStemLen = Math.abs(stemLen - 1) < 0.02;
        const stemLenStr = isDefStemLen ? '' : Math.round(clampNum(stemLen, 0.15, 1.35) * 20).toString(36);

        const base = `${typeChar}${xStr}${yStr}${sStr}${rStr}`;
        if (!item.photoStyle && isDefPetal && isDefCenter && extraFlags === 0 && isDefStemLen) {
          return base;
        }
        const pHex = isDefPetal ? '' : item.petalColor.replace('#', '').toLowerCase();
        const cHex = isDefCenter ? '' : item.centerColor.replace('#', '').toLowerCase();
        if (!item.photoStyle) {
          return `${base}~${extraFlags.toString(36)}~${pHex}~${cHex}~${stemLenStr}`.replace(/~+$/, '');
        }
        const pStyleIdx = Math.max(0, SHARE_PHOTO_STYLES.indexOf(item.photoStyle)).toString(36);
        const pCapB64 = item.photoCaption ? toBase64Url(item.photoCaption) : '';
        const pImgB64 = item.photoDataUrl ? toBase64Url(item.photoDataUrl) : '';
        return `${base}~${extraFlags.toString(36)}~${pHex}~${cHex}~${stemLenStr}~${pStyleIdx}~${pCapB64}~${pImgB64}`.replace(/~+$/, '');
      })
      .join('.');
  }

  const prefix = asGift ? 'g' : 'b';
  let voiceSuffix = '';
  if (snapshot.voice && (snapshot.voice.visibleOnStage || snapshot.voice.audioDataUrl)) {
    const vIdx = Math.max(0, SHARE_VOICE_STYLES.indexOf(snapshot.voice.style)).toString(36);
    const vVis = snapshot.voice.visibleOnStage ? '1' : '0';
    const vPrimaryHex = snapshot.voice.primaryColor.replace('#', '').toLowerCase();
    const vAccentHex = snapshot.voice.accentColor.replace('#', '').toLowerCase();
    const vTitleB64 = snapshot.voice.title ? toBase64Url(snapshot.voice.title) : '';
    const vDur = Math.round(snapshot.voice.durationSec || 0).toString(10);
    const vAudioB64 = snapshot.voice.audioDataUrl ? toBase64Url(snapshot.voice.audioDataUrl) : '';
    const vX =
      snapshot.voice.x !== undefined && Math.round(snapshot.voice.x) !== 185
        ? Math.round(snapshot.voice.x).toString(36)
        : '';
    const vY =
      snapshot.voice.y !== undefined && Math.round(snapshot.voice.y) !== 525
        ? Math.round(snapshot.voice.y).toString(36)
        : '';
    const vScale =
      snapshot.voice.scale !== undefined && Math.abs(snapshot.voice.scale - 1.0) > 0.01
        ? Math.round(snapshot.voice.scale * 100).toString(36)
        : '';
    const vRot =
      snapshot.voice.rotation !== undefined && Math.round(snapshot.voice.rotation) !== 0
        ? Math.round(snapshot.voice.rotation + 180).toString(36)
        : '';
    voiceSuffix = `&v=${vIdx}~${vVis}~${vPrimaryHex}~${vAccentHex}~${vTitleB64}~${vDur}~${vAudioB64}~${vX}~${vY}~${vScale}~${vRot}`.replace(/~+$/, '');
  }
  let lockSuffix = '';
  if (snapshot.lock && snapshot.lock.mode !== 'none') {
    const modeCode = snapshot.lock.mode === 'countdown' ? 'c' : snapshot.lock.mode === 'passcode' ? 'p' : 'n';
    const unlockAtB64 = snapshot.lock.unlockAtIso ? toBase64Url(snapshot.lock.unlockAtIso) : '';
    const qB64 = snapshot.lock.questionPrompt ? toBase64Url(snapshot.lock.questionPrompt) : '';
    const aB64 = snapshot.lock.passcodeAnswer ? toBase64Url(snapshot.lock.passcodeAnswer) : '';
    lockSuffix = `&l=${modeCode}~${unlockAtB64}~${qB64}~${aB64}`.replace(/~+$/, '');
  }
  let envSuffix = '';
  if (snapshot.environment && snapshot.environment !== 'studio') {
    const eIdx = Math.max(0, SHARE_ENVIRONMENTS.indexOf(snapshot.environment)).toString(36);
    envSuffix = `&e=${eIdx}`;
  }
  let poseSuffix = '';
  if (snapshot.bouquetPose) {
    const bp = snapshot.bouquetPose;
    const isDefPose =
      Math.round(bp.x) === 300 &&
      Math.round(bp.y) === 380 &&
      Math.abs(bp.scale - 1) < 0.02 &&
      Math.round(bp.rotation) === 0;
    if (!isDefPose) {
      const bx = Math.round(bp.x).toString(36);
      const by = Math.round(bp.y).toString(36);
      const bs = Math.round(bp.scale * 100).toString(36);
      const br = Math.round(bp.rotation + 180).toString(36);
      poseSuffix = `&bp=${bx}~${by}~${bs}~${br}`;
    }
  }
  return `#${prefix}=${headerPart}.${cardPart}.${itemsPart}${voiceSuffix}${lockSuffix}${envSuffix}${poseSuffix}`;
}

export function encodeBouquetToShareUrl(snapshot: BouquetSnapshot, asGift = false): string {
  try {
    const hashPayload = encodeBouquetToCompactPayload(snapshot, asGift);
    const code = computeShortCode(hashPayload);
    localShortCodeCache.set(code, hashPayload);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`bq_short_${code}`, hashPayload);
      } catch {
        // Ignore storage quota
      }
    }
    const baseOrigin =
      typeof window !== 'undefined'
        ? window.location.origin
        : 'https://bouquet-studio.local';
    return `${baseOrigin}/${code}`;
  } catch {
    return typeof window !== 'undefined' ? window.location.href : '';
  }
}

export function isGiftShareHash(hashOverride?: string): boolean {
  if (hashOverride === undefined && typeof window !== 'undefined') {
    if (getShortCodeFromPathname(window.location.pathname)) {
      return true;
    }
  }
  const hash =
    hashOverride !== undefined
      ? hashOverride
      : typeof window !== 'undefined'
      ? window.location.hash
      : '';
  if (!hash) return false;
  if (getShortCodeFromPathname(hash)) return true;
  if (hash.includes('edit=1')) return false;
  return (
    hash.startsWith('#g=') ||
    hash.startsWith('#b=') ||
    hash.startsWith('#bouquet=') ||
    hash.includes('view=gift')
  );
}

export function decodeBouquetFromHash(hashOverride?: string): BouquetSnapshot | null {
  try {
    let hash =
      hashOverride !== undefined
        ? hashOverride
        : typeof window !== 'undefined'
        ? window.location.hash
        : '';

    // Check if the URL or pathname is a first-party short code (e.g. /Vu18KSuusq9133s)
    const shortCode =
      getShortCodeFromPathname(hashOverride) ||
      (hashOverride === undefined && typeof window !== 'undefined'
        ? getShortCodeFromPathname(window.location.pathname)
        : null);

    if (shortCode && !hash.startsWith('#g=') && !hash.startsWith('#b=') && !hash.startsWith('#bouquet=')) {
      const cached =
        localShortCodeCache.get(shortCode) ||
        (typeof window !== 'undefined' ? localStorage.getItem(`bq_short_${shortCode}`) : null);
      if (cached) {
        hash = cached;
      }
    }

    if (!hash) return null;

    // FORMAT A: Ultra-compact #g=<payload> or #b=<payload>
    if (hash.startsWith('#g=') || hash.startsWith('#b=')) {
      const fullAfterPrefix = hash.slice(3);
      const querySegments = fullAfterPrefix.split('&');
      const rawPayload = querySegments[0].trim();
      const parts = rawPayload.split('.');
      if (parts.length < 2) return null;

      let voice: VoiceKeepsakeData = { ...DEFAULT_VOICE_KEEPSAKE };
      const vSegment = querySegments.find((seg) => seg.startsWith('v='));
      if (vSegment) {
        const [
          vIdxStr = '0',
          vVisStr = '0',
          vPrimaryHex = '',
          vAccentHex = '',
          vTitleB64 = '',
          vDurStr = '0',
          vAudioB64 = '',
          vXStr = '',
          vYStr = '',
          vScaleStr = '',
          vRotStr = ''
        ] = vSegment.slice(2).split('~');
        const style = SHARE_VOICE_STYLES[parseInt(vIdxStr, 36)] || 'mixtape';
        const vMeta = VOICE_KEEPSAKE_CATALOG.find((k) => k.id === style) || VOICE_KEEPSAKE_CATALOG[0];
        const parsedVX = vXStr ? parseInt(vXStr, 36) : 185;
        const parsedVY = vYStr ? parseInt(vYStr, 36) : 525;
        const parsedVScale = vScaleStr ? parseInt(vScaleStr, 36) / 100 : 1.0;
        const parsedVRot = vRotStr ? parseInt(vRotStr, 36) - 180 : 0;
        voice = {
          style,
          visibleOnStage: vVisStr === '1',
          title: vTitleB64 ? fromBase64Url(vTitleB64) : vMeta.defaultTitle,
          primaryColor: vPrimaryHex ? `#${vPrimaryHex}` : vMeta.defaultPrimary,
          accentColor: vAccentHex ? `#${vAccentHex}` : vMeta.defaultAccent,
          audioDataUrl: vAudioB64 ? fromBase64Url(vAudioB64) : null,
          durationSec: Number(vDurStr) || 0,
          x: Number.isFinite(parsedVX) ? parsedVX : 185,
          y: Number.isFinite(parsedVY) ? parsedVY : 525,
          scale:
            Number.isFinite(parsedVScale) && parsedVScale >= 0.3 && parsedVScale <= 2.6
              ? Number(parsedVScale.toFixed(2))
              : 1.0,
          rotation:
            Number.isFinite(parsedVRot) && parsedVRot >= -180 && parsedVRot <= 180
              ? Math.round(parsedVRot)
              : 0
        };
      }

      let lock: BouquetLockConfig = { ...DEFAULT_BOUQUET_LOCK };
      const lSegment = querySegments.find((seg) => seg.startsWith('l='));
      if (lSegment) {
        const [modeCode = 'n', unlockAtB64 = '', qB64 = '', aB64 = ''] = lSegment.slice(2).split('~');
        const mode: BouquetLockMode =
          modeCode === 'c' ? 'countdown' : modeCode === 'p' ? 'passcode' : 'none';
        lock = {
          mode,
          unlockAtIso: unlockAtB64 ? fromBase64Url(unlockAtB64) : '',
          questionPrompt: qB64 ? fromBase64Url(qB64) : DEFAULT_BOUQUET_LOCK.questionPrompt,
          passcodeAnswer: aB64 ? fromBase64Url(aB64) : ''
        };
      }

      let environment: CanvasEnvironment = 'studio';
      const eSegment = querySegments.find((seg) => seg.startsWith('e='));
      if (eSegment) {
        const eIdx = parseInt(eSegment.slice(2), 36);
        environment = SHARE_ENVIRONMENTS[eIdx] || 'studio';
      }

      let bouquetPose: BouquetPose = { ...DEFAULT_BOUQUET_POSE };
      const bpSegment = querySegments.find((seg) => seg.startsWith('bp='));
      if (bpSegment) {
        const [bxStr = '', byStr = '', bsStr = '', brStr = ''] = bpSegment.slice(3).split('~');
        const bx = bxStr ? parseInt(bxStr, 36) : 300;
        const by = byStr ? parseInt(byStr, 36) : 380;
        const bs = bsStr ? parseInt(bsStr, 36) / 100 : 1;
        const br = brStr ? parseInt(brStr, 36) - 180 : 0;
        bouquetPose = {
          x: Number.isFinite(bx) ? bx : 300,
          y: Number.isFinite(by) ? by : 380,
          scale: Number.isFinite(bs) && bs >= 0.4 && bs <= 2.4 ? Number(bs.toFixed(2)) : 1,
          rotation: Number.isFinite(br) && br >= -180 && br <= 180 ? Math.round(br) : 0
        };
      }

      const [headerPart, cardPart, ...stemParts] = parts;
      const [wIdxStr = '0', wHex = '', rHex = '', rStyleStr = ''] = headerPart.split('~');
      const wrapStyle = SHARE_WRAP_STYLES[parseInt(wIdxStr, 36)] || 'kraft';
      const defaultWrapHex =
        WRAPPER_CATALOG.find((w) => w.id === wrapStyle)?.defaultHex || '#C8B9AE';
      const wrapColor = wHex ? `#${wHex}` : defaultWrapHex;
      const ribbonColor = rHex ? `#${rHex}` : '#e11d48';
      const ribbonStyle = rStyleStr ? SHARE_RIBBON_STYLES[parseInt(rStyleStr, 36)] || 'satin' : 'satin';

      const [
        cMetaStr = '1',
        cToB64 = '!',
        cFromB64 = '!',
        cMsgB64 = '!',
        cBgHex = '',
        cAccHex = '',
        cXStr = '',
        cYStr = '',
        cScaleStr = '',
        cRotStr = ''
      ] = cardPart.split('~');
      const cMeta = parseInt(cMetaStr, 36) || 0;
      const theme = SHARE_CARD_THEMES[Math.floor(cMeta / 2)] || 'sealed';
      const visibleOnStage = cMeta % 2 === 1;
      const to = !cToB64 || cToB64 === '!' ? DEFAULT_SHARE_CARD_TO : fromBase64Url(cToB64);
      const from = !cFromB64 || cFromB64 === '!' ? DEFAULT_SHARE_CARD_FROM : fromBase64Url(cFromB64);
      const message =
        !cMsgB64 || cMsgB64 === '!' ? DEFAULT_SHARE_CARD_MSG : fromBase64Url(cMsgB64);
      const customBg = cBgHex && /^[0-9a-fA-F]{6}$/.test(cBgHex) ? `#${cBgHex}` : undefined;
      const customAccent = cAccHex && /^[0-9a-fA-F]{6}$/.test(cAccHex) ? `#${cAccHex}` : undefined;
      const parsedCX = cXStr ? parseInt(cXStr, 36) : 410;
      const parsedCY = cYStr ? parseInt(cYStr, 36) : 525;
      const parsedCScale = cScaleStr ? parseInt(cScaleStr, 36) / 100 : 0.72;
      const parsedCRot = cRotStr ? parseInt(cRotStr, 36) - 180 : 0;

      let items: BouquetItem[] = [];
      if (stemParts.length === 1 && stemParts[0].startsWith('@')) {
        const presetIdx = parseInt(stemParts[0].slice(1), 10);
        if (presetIdx === 0) {
          items = INITIAL_ITEMS.map((it) => ({ ...it }));
        } else if (presetIdx >= 1 && presetIdx <= STARTER_TEMPLATES.length) {
          items = STARTER_TEMPLATES[presetIdx - 1].snapshot.items.map((it) => ({ ...it }));
        }
      } else {
        items = stemParts
          .filter((sp) => sp.length >= 8)
          .map((sp, idx) => {
            const [
              base,
              flagsStr = '0',
              pHex = '',
              cHex = '',
              stemLenStr = '',
              pStyleStr = '',
              pCapB64 = '',
              pImgB64 = ''
            ] = sp.split('~');
            const rawCode = parseInt(base[0], 36) || 0;
            const type = SHARE_FLOWER_TYPES[rawCode] || 'rose';
            const meta = FLOWER_CATALOG.find((m) => m.type === type) || FLOWER_CATALOG[0];
            const x = parseInt(base.slice(1, 3), 36);
            const y = parseInt(base.slice(3, 5), 36);
            const sInt = parseInt(base.slice(5, 6), 36);
            const scale = Number((0.3 + sInt / 14).toFixed(2));
            const rInt = parseInt(base.slice(6, 8), 36);
            const rotation = rInt * 2 - 180;
            const flags = parseInt(flagsStr, 36) || 0;
            const stemLength = stemLenStr
              ? Number((parseInt(stemLenStr, 36) / 20).toFixed(2))
              : 1;
            const photoStyle =
              pStyleStr !== '' ? SHARE_PHOTO_STYLES[parseInt(pStyleStr, 36)] : undefined;
            const photoMeta = photoStyle
              ? PHOTO_FRAME_CATALOG.find((p) => p.id === photoStyle)
              : undefined;

            return {
              id: `s-${idx}-${photoStyle || type}`,
              type,
              ...(photoStyle
                ? {
                    photoStyle,
                    photoCaption:
                      photoStyle === 'raw'
                        ? ''
                        : pCapB64
                        ? fromBase64Url(pCapB64)
                        : photoMeta?.defaultCaption,
                    photoDataUrl: pImgB64 ? fromBase64Url(pImgB64) : undefined,
                    clippedToBouquet: Boolean(flags & 8)
                  }
                : {}),
              x: Number.isFinite(x) ? x : 300,
              y: Number.isFinite(y) ? y : 280,
              scale: Number.isFinite(scale) ? scale : meta.defaultScale,
              rotation: Number.isFinite(rotation) ? rotation : 0,
              flipX: Boolean(flags & 1),
              locked: Boolean(flags & 2),
              hidden: Boolean(flags & 4),
              petalColor: pHex
                ? `#${pHex}`
                : photoMeta
                ? photoMeta.defaultFrameColor
                : meta.defaultPetalColor,
              centerColor: cHex
                ? `#${cHex}`
                : photoMeta
                ? photoMeta.defaultAccentColor
                : meta.defaultCenterColor,
              stemLength: Number.isFinite(stemLength) ? stemLength : 1
            };
          });
      }

      return {
        items,
        wrapStyle,
        wrapColor,
        ribbonColor,
        ribbonStyle,
        environment,
        bouquetPose,
        card: {
          to,
          from,
          message,
          visibleOnStage,
          theme,
          customBg,
          customAccent,
          x: Number.isFinite(parsedCX) ? parsedCX : 410,
          y: Number.isFinite(parsedCY) ? parsedCY : 525,
          scale:
            Number.isFinite(parsedCScale) && parsedCScale >= 0.3 && parsedCScale <= 2.6
              ? Number(parsedCScale.toFixed(2))
              : 0.72,
          rotation:
            Number.isFinite(parsedCRot) && parsedCRot >= -180 && parsedCRot <= 180
              ? Math.round(parsedCRot)
              : 0
        },
        voice,
        lock
      };
    }

    // FORMAT B: Legacy #bouquet=<base64> (with fix for &view=gift suffix + partial truncation salvage)
    if (!hash.startsWith('#bouquet=')) return null;
    // Strip &view=gift or any trailing query parameter before base64 decoding!
    const raw = hash.replace(/^#bouquet=/, '').split('&')[0].trim();
    if (!raw) return null;

    // Normalize URL-safe base64 & restore any stripped '=' padding
    let normalizedB64 = raw.replace(/-/g, '+').replace(/_/g, '/').replace(/[^A-Za-z0-9+/]/g, '');
    // Trim trailing 1-char remainder if link was truncated mid-quartet, then pad to multiple of 4
    if (normalizedB64.length % 4 === 1) {
      normalizedB64 = normalizedB64.slice(0, -1);
    }
    while (normalizedB64.length % 4 !== 0) {
      normalizedB64 += '=';
    }

    const decodedUri =
      typeof atob === 'function'
        ? atob(normalizedB64)
        : typeof globalThis !== 'undefined' && 'Buffer' in globalThis
        ? (globalThis as { Buffer: { from: (s: string, enc: string) => { toString: () => string } } }).Buffer.from(normalizedB64, 'base64').toString()
        : '';

    // Safely decode percent-encoding even if truncated mid-%XX sequence
    const safeDecodedUri = decodedUri.replace(/%[0-9A-Fa-f]{0,1}$/, '');
    let json = '';
    try {
      json = decodeURIComponent(safeDecodedUri);
    } catch {
      json = unescape(safeDecodedUri);
    }

    try {
      return JSON.parse(json) as BouquetSnapshot;
    } catch {
      // Salvage complete flower items if legacy link was truncated mid-JSON by a chat app
      const itemMatches = json.match(/\{[^{}]*"type"\s*:\s*"[^"]+"[^{}]*\}/g);
      if (itemMatches && itemMatches.length > 0) {
        const salvagedItems: BouquetItem[] = [];
        for (const m of itemMatches) {
          try {
            const parsedItem = JSON.parse(m);
            if (parsedItem && parsedItem.type && typeof parsedItem.x === 'number') {
              salvagedItems.push(parsedItem);
            }
          } catch {
            // Skip incomplete item
          }
        }
        if (salvagedItems.length > 0) {
          const wrapMatch = json.match(/"wrapStyle"\s*:\s*"([^"]+)"/);
          const wrapColorMatch = json.match(/"wrapColor"\s*:\s*"([^"]+)"/);
          const ribbonMatch = json.match(/"ribbonColor"\s*:\s*"([^"]+)"/);
          return {
            items: salvagedItems,
            wrapStyle: (wrapMatch?.[1] as typeWrapStyle) || 'kraft',
            wrapColor: wrapColorMatch?.[1] || '#C8B9AE',
            ribbonColor: ribbonMatch?.[1] || '#e11d48',
            card: {
              to: DEFAULT_SHARE_CARD_TO,
              from: DEFAULT_SHARE_CARD_FROM,
              message: DEFAULT_SHARE_CARD_MSG,
              visibleOnStage: true,
              theme: 'sealed'
            }
          };
        }
      }
      return null;
    }
  } catch {
    return null;
  }
}

export function wrapCardText(text: string, maxLineLength = 22): string[] {
  if (!text) return [];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (!current) {
      current = word;
    } else if ((current + ' ' + word).length <= maxLineLength) {
      current += ' ' + word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 4);
}

export function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || '';
  if (
    /FBAN|FBAV|FB_IAB|FBIOS|Messenger|Instagram|Line\/|MicroMessenger|TikTok|BytedanceWebview|Musical\.ly|Snapchat|Twitter|LinkedInApp|Telegram|Threads|Pinterest|KAKAOTALK|Viber|WhatsApp/i.test(
      ua
    )
  ) {
    return true;
  }
  if (/Android/i.test(ua) && /;\s*wv\b/i.test(ua)) {
    return true;
  }
  if (
    /iPhone|iPad|iPod/i.test(ua) &&
    /AppleWebKit/i.test(ua) &&
    !/Safari\/|CriOS\/|FxiOS\/|EdgiOS\//i.test(ua)
  ) {
    return true;
  }
  return false;
}

export async function exportSvgElementToPng(
  svgElement: SVGSVGElement,
  filename = 'flowers-for-you.png'
): Promise<string> {
  const clone = svgElement.cloneNode(true) as SVGSVGElement;

  // Strip interactive selection gizmos and CSS bloom animation classes before exporting
  const gizmos = clone.querySelectorAll('[data-export-ignore="true"]');
  gizmos.forEach((el) => el.remove());
  const animatedNodes = clone.querySelectorAll('.stem-bloom-pop, .bouquet-card-wiggle, .bouquet-cord-bloom');
  animatedNodes.forEach((el) => {
    el.classList.remove('stem-bloom-pop', 'bouquet-card-wiggle', 'bouquet-cord-bloom');
  });

  // Replace any foreignObject in the clone with SVG text to prevent canvas tainting
  const foreignObjects = clone.querySelectorAll('foreignObject');
  foreignObjects.forEach((fo) => {
    const textContent = (fo.textContent || '').trim();
    const textColor = fo.getAttribute('data-text-color') || '#1C1917';
    const textNode = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textNode.setAttribute('x', fo.getAttribute('x') || '-70');
    textNode.setAttribute('y', '-1');
    textNode.setAttribute('fill', textColor);
    textNode.setAttribute('font-size', '12.5');
    textNode.setAttribute('font-family', "'Cormorant Garamond', serif");
    const rawLines = wrapCardText(textContent, 23);
    rawLines.forEach((line, idx) => {
      const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
      tspan.setAttribute('x', fo.getAttribute('x') || '-70');
      tspan.setAttribute('dy', idx === 0 ? '0' : '14');
      tspan.textContent = idx === 3 && textContent.length > 88 ? `${line.replace(/\.*$/, '')}...` : line;
      textNode.appendChild(tspan);
    });
    fo.parentNode?.replaceChild(textNode, fo);
  });

  // Ensure standard SVG attributes and dimensions
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  clone.setAttribute('width', '1200');
  clone.setAttribute('height', '1360');

  const serializer = new XMLSerializer();
  let svgString = serializer.serializeToString(clone);

  // Guarantee xmlns
  if (!svgString.includes('xmlns="http://www.w3.org/2000/svg"')) {
    svgString = svgString.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
  }

  // Base64 data URL avoids cross-origin tainting from Blob URLs
  const base64Svg = 'data:image/svg+xml;charset=utf-8;base64,' + btoa(unescape(encodeURIComponent(svgString)));

  const triggerDownload = (url: string, downloadName: string) => {
    const link = document.createElement('a');
    link.download = downloadName;
    link.href = url;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
    }, 1500);
  };

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 1360;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas 2D context unavailable');
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL('image/png');

        if (canvas.toBlob) {
          canvas.toBlob((blob) => {
            if (blob) {
              const blobUrl = URL.createObjectURL(blob);
              triggerDownload(blobUrl, filename);
              setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
              resolve(dataUrl);
            } else {
              triggerDownload(dataUrl, filename);
              resolve(dataUrl);
            }
          }, 'image/png');
        } else {
          triggerDownload(dataUrl, filename);
          resolve(dataUrl);
        }
      } catch (err) {
        console.warn('Canvas export failed, falling back to SVG vector download:', err);
        try {
          const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
          const svgUrl = URL.createObjectURL(svgBlob);
          triggerDownload(svgUrl, filename.replace(/\.png$/i, '.svg'));
          setTimeout(() => URL.revokeObjectURL(svgUrl), 10000);
          resolve(svgUrl);
        } catch (svgErr) {
          reject(svgErr);
        }
      }
    };

    img.onerror = (err) => {
      console.warn('SVG image load failed, downloading direct SVG keepsake:', err);
      try {
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);
        triggerDownload(svgUrl, filename.replace(/\.png$/i, '.svg'));
        setTimeout(() => URL.revokeObjectURL(svgUrl), 10000);
        resolve(svgUrl);
      } catch {
        reject(err);
      }
    };

    img.src = base64Svg;
  });
}

// ============================================================================

/**
 * Soft Procedural Web Audio Music Box Synthesizer (No Autoplay, Zero External Audio Files)
 */
export class RomanticMusicBox {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private timerId: number | null = null;
  private noteIndex = 0;

  // Gentle pentatonic music-box arpeggio in F major / D minor
  private readonly melodyNotes = [
    523.25, // C5
    659.25, // E5
    783.99, // G5
    659.25, // E5
    587.33, // D5
    698.46, // F5
    880.0,  // A5
    698.46, // F5
    523.25, // C5
    587.33, // D5
    659.25, // E5
    783.99, // G5
    698.46, // F5
    659.25, // E5
    587.33, // D5
    523.25  // C5
  ];

  public toggle(): boolean {
    if (this.isPlaying) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }

  public start(): void {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const hasUserGesture =
      typeof navigator !== 'undefined' &&
      Boolean(
        (navigator as Navigator & { userActivation?: { hasBeenActive?: boolean } })
          .userActivation?.hasBeenActive
      );

    if (hasUserGesture) {
      if (!this.ctx) {
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    }

    if (this.isPlaying) return;
    this.isPlaying = true;
    if (this.ctx && this.ctx.state === 'running') {
      this.playChimeNote();
    }
    this.timerId = window.setInterval(() => {
      if (this.isPlaying) {
        this.playChimeNote();
      }
    }, 680);
  }

  public resumeIfBlocked(): void {
    if (!this.isPlaying) return;
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
      if (this.ctx.state === 'running' && this.isPlaying) {
        this.playChimeNote();
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        if (this.isPlaying) {
          this.playChimeNote();
        }
      }).catch(() => {});
    }
  }

  public stop(): void {
    this.isPlaying = false;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private playChimeNote(): void {
    if (!this.ctx || !this.isPlaying || this.ctx.state === 'suspended') return;
    try {
      const now = this.ctx.currentTime;
      const freq = this.melodyNotes[this.noteIndex % this.melodyNotes.length];
      this.noteIndex += 1;

      // Primary soft celesta sine tone
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.045, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 1.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 1.5);

      // Subtle warm octave harmonic
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(freq * 0.5, now);

      subGain.gain.setValueAtTime(0.001, now);
      subGain.gain.linearRampToValueAtTime(0.018, now + 0.06);
      subGain.gain.exponentialRampToValueAtTime(0.0005, now + 1.55);

      subOsc.connect(subGain);
      subGain.connect(this.ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 1.6);
    } catch {
      // Ignore audio errors if tab is backgrounded
    }
  }
}

export const musicBox = new RomanticMusicBox();

/**
 * Downscales & compresses an uploaded image file to a compact JPEG data URL
 * so photocards render crisply, save to local drafts, and export cleanly in PNGs.
 */
export function compressUploadedPhotoToDataUrl(file: File, maxDimension = 380): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read image file'));
    reader.onload = () => {
      const rawDataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!rawDataUrl) {
        reject(new Error('Empty image data'));
        return;
      }
      if (typeof document === 'undefined') {
        resolve(rawDataUrl);
        return;
      }
      const img = new Image();
      img.onload = () => {
        try {
          let width = img.naturalWidth || img.width || 320;
          let height = img.naturalHeight || img.height || 320;
          if (width > maxDimension || height > maxDimension) {
            if (width >= height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(rawDataUrl);
            return;
          }
          ctx.fillStyle = '#FFFDF9';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressed = canvas.toDataURL('image/jpeg', 0.78);
          resolve(compressed || rawDataUrl);
        } catch {
          resolve(rawDataUrl);
        }
      };
      img.onerror = () => resolve(rawDataUrl);
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Strips only the inline base64url voice audio (`vAudioB64`, 7th tilde segment of `&v=`)
 * from a compact `#b3=` bouquet payload while preserving all voice metadata, coordinates,
 * flowers, photocards, greeting card, lock config, environment, and bouquet pose.
 */
export function stripInlineAudioFromCompactPayload(payload?: string): string {
  if (!payload) return '';
  return payload.replace(/(&v=)([^&]*)/, (_match, prefix: string, vBody: string) => {
    const parts = vBody.split('~');
    if (parts.length >= 7 && parts[6]) {
      parts[6] = '';
    }
    return `${prefix}${parts.join('~')}`;
  });
}

/**
 * Strips inline base64url photo data from photocard stems in a compact `#b3=` payload
 * while preserving the photocard item, caption, position, scale, rotation, and clip state.
 * Used only as a size-cap safeguard for the global garland feed index document when needed;
 * individual `shared_bouquets/{code}` documents always retain 100% of photos and voice audio.
 */
export function stripInlinePhotosFromCompactPayload(payload?: string): string {
  if (!payload) return '';
  const clean = stripInlineAudioFromCompactPayload(payload);
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
 * Merges a Firestore `SharedBouquetRecord` (which stores `voiceAudioDataUrl`, `voiceStyle`,
 * `voiceTitle`, and `voiceDurationSec` in dedicated fields) into a decoded `BouquetSnapshot`
 * so any bouquet hydrated from Firestore or the Lace Garland has 100% identical voice & visual state.
 */
export function hydrateSnapshotWithFirestoreRecord(
  snapshot: BouquetSnapshot,
  record?: {
    voiceAudioDataUrl?: string | null;
    voiceStyle?: string | null;
    voiceTitle?: string | null;
    voiceDurationSec?: number | null;
  } | null
): BouquetSnapshot {
  if (!record) return snapshot;
  const hasVoiceAudio = Boolean(record.voiceAudioDataUrl || snapshot.voice?.audioDataUrl);
  if (
    !hasVoiceAudio &&
    !record.voiceStyle &&
    !record.voiceTitle &&
    typeof record.voiceDurationSec !== 'number'
  ) {
    return snapshot;
  }
  const existingVoice = snapshot.voice || { ...DEFAULT_VOICE_KEEPSAKE };
  return {
    ...snapshot,
    voice: {
      ...existingVoice,
      audioDataUrl: record.voiceAudioDataUrl || existingVoice.audioDataUrl || undefined,
      style: (record.voiceStyle as VoiceKeepsakeStyle) || existingVoice.style || 'mixtape',
      title: record.voiceTitle || existingVoice.title || 'For You',
      durationSec:
        typeof record.voiceDurationSec === 'number' && record.voiceDurationSec > 0
          ? record.voiceDurationSec
          : existingVoice.durationSec || (hasVoiceAudio ? 5 : 0),
      visibleOnStage: existingVoice.visibleOnStage ?? hasVoiceAudio,
    },
  };
}


