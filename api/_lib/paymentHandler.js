import crypto from 'node:crypto';

const FIRESTORE_PROJECT_ID = 'amiable-alloy-sw1sf';
const FIRESTORE_DB_ID = 'ai-studio-luxbouquet-d9f38715-de7a-49d9-bccf-4493a2abc586';
const FIRESTORE_PASSES_URL = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/${FIRESTORE_DB_ID}/documents/studio_passes`;

const CLIENT_SIGNATURE_SALT = 'sab-pass-integrity-2026-v1';
const PASS_KEY_REGEX = /^BLOOM-[A-Z2-9]{4}-[A-Z2-9]{4}$/;
const PASS_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_DAILY_PASS_BOUQUETS = 15;

export const SERVER_PASS_STORE = new Map();
export const PENDING_CHECKOUT_STORE = new Map();

// In-memory cache of owner-configured Ko-fi Shop direct_link_codes (synced with Firestore BLOOM-KCFG-SHOP)
let cachedOwnerShopCodes = {
  single: '',
  pass_7d: '',
  pass_30d: '',
};

export const PRICING_CATALOG = {
  PH: {
    single: {
      tier: 'single',
      name: 'Single Bouquet',
      eyebrow: 'One Arrangement',
      tagline: 'This bouquet + PNG · 90-day link',
      currency: 'PHP',
      symbol: '₱',
      displayPrice: '₱49',
      amountMinor: 4900,
      durationDays: null,
      retentionDays: 90,
      isEternalKeepsake: false,
      perks: ['1 bouquet + PNG', '90-day link'],
    },
    pass_7d: {
      tier: 'pass_7d',
      name: '7-Day Pass',
      eyebrow: 'Week Access',
      tagline: 'Unlimited creations · 90-day links',
      currency: 'PHP',
      symbol: '₱',
      displayPrice: '₱99',
      amountMinor: 9900,
      durationDays: 7,
      retentionDays: 90,
      isEternalKeepsake: false,
      popular: true,
      perks: ['7 days unlimited', 'PNG downloads', '90-day links'],
    },
    pass_30d: {
      tier: 'pass_30d',
      name: '30-Day Eternal',
      eyebrow: 'Month Access',
      tagline: 'Unlimited creations · Never expires',
      currency: 'PHP',
      symbol: '₱',
      displayPrice: '₱199',
      amountMinor: 19900,
      durationDays: 30,
      retentionDays: 36500,
      isEternalKeepsake: true,
      perks: ['30 days unlimited', 'PNG downloads', 'Links never expire'],
    },
  },
  INTL: {
    single: {
      tier: 'single',
      name: 'Single Bouquet',
      eyebrow: 'One Arrangement',
      tagline: 'This bouquet + PNG · 90-day link',
      currency: 'USD',
      symbol: '$',
      displayPrice: '$2.99',
      amountMinor: 299,
      durationDays: null,
      retentionDays: 90,
      isEternalKeepsake: false,
      perks: ['1 bouquet + PNG', '90-day link'],
    },
    pass_7d: {
      tier: 'pass_7d',
      name: '7-Day Pass',
      eyebrow: 'Week Access',
      tagline: 'Unlimited creations · 90-day links',
      currency: 'USD',
      symbol: '$',
      displayPrice: '$4.99',
      amountMinor: 499,
      durationDays: 7,
      retentionDays: 90,
      isEternalKeepsake: false,
      popular: true,
      perks: ['7 days unlimited', 'PNG downloads', '90-day links'],
    },
    pass_30d: {
      tier: 'pass_30d',
      name: '30-Day Eternal',
      eyebrow: 'Month Access',
      tagline: 'Unlimited creations · Never expires',
      currency: 'USD',
      symbol: '$',
      displayPrice: '$8.99',
      amountMinor: 899,
      durationDays: 30,
      retentionDays: 36500,
      isEternalKeepsake: true,
      perks: ['30 days unlimited', 'PNG downloads', 'Links never expire'],
    },
  },
};

export function getServerSigningSalt() {
  return (process.env.PASS_SIGNING_SECRET || 'sab-pass-integrity-2026-v1').trim();
}

export function resolveKofiPageUrl(rawUrl) {
  const cleaned = String(rawUrl || process.env.KOFI_PAGE_URL || '').trim();
  if (!cleaned || cleaned.includes('<your-handle>') || cleaned.includes('your-handle')) {
    return 'https://ko-fi.com/luxinnamon';
  }
  if (/^[a-zA-Z0-9_.-]+$/.test(cleaned) && !cleaned.includes('.')) {
    return `https://ko-fi.com/${cleaned}`;
  }
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    return `https://${cleaned.replace(/^\/+/, '')}`;
  }
  return cleaned.replace(/\/+$/, '');
}

/**
 * Extracts a clean Ko-fi Shop `direct_link_code` from either a full URL
 * (`https://ko-fi.com/s/1a2b3c4d5e`) or a raw code (`1a2b3c4d5e`).
 */
export function extractKofiShopCode(rawInput) {
  const str = String(rawInput || '').trim();
  if (!str) return '';
  const urlMatch = str.match(/ko-fi\.com\/s\/([a-zA-Z0-9]+)/i);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1].toLowerCase();
  }
  if (/^[a-zA-Z0-9]{6,16}$/.test(str)) {
    return str.toLowerCase();
  }
  return '';
}

/**
 * Builds the direct Ko-fi Shop item checkout URL for a given tier.
 */
export function buildKofiShopItemUrl(directLinkCode, fallbackPageUrl) {
  const cleanCode = extractKofiShopCode(directLinkCode);
  if (cleanCode) {
    return `https://ko-fi.com/s/${cleanCode}`;
  }
  const basePage = resolveKofiPageUrl(fallbackPageUrl);
  if (basePage.includes('/s/')) {
    return basePage;
  }
  return `${basePage}/shop`;
}

/**
 * Resolves the 3 Ko-fi Shop `direct_link_code`s from environment variables + owner fallback.
 */
export function getActiveKofiShopCodes(clientOverride) {
  if (clientOverride && typeof clientOverride === 'object') {
    const s = extractKofiShopCode(clientOverride.single);
    const p7 = extractKofiShopCode(clientOverride.pass_7d);
    const p30 = extractKofiShopCode(clientOverride.pass_30d);
    if (s) cachedOwnerShopCodes.single = s;
    if (p7) cachedOwnerShopCodes.pass_7d = p7;
    if (p30) cachedOwnerShopCodes.pass_30d = p30;
  }

  const sharedTestCode = extractKofiShopCode(process.env.KOFI_SHOP_TEST_CODE);

  return {
    test: sharedTestCode || '',
    single:
      extractKofiShopCode(process.env.KOFI_SHOP_SINGLE_CODE) ||
      sharedTestCode ||
      cachedOwnerShopCodes.single ||
      '',
    pass_7d:
      extractKofiShopCode(process.env.KOFI_SHOP_7D_CODE) ||
      sharedTestCode ||
      cachedOwnerShopCodes.pass_7d ||
      '',
    pass_30d:
      extractKofiShopCode(process.env.KOFI_SHOP_30D_CODE) ||
      sharedTestCode ||
      cachedOwnerShopCodes.pass_30d ||
      '',
  };
}

/**
 * Derives a deterministic, Firestore-valid `BLOOM-KSXX-XXXX` receipt document key
 * from `(buyerEmail, tier)` so a Ko-fi Shop purchase can ONLY be claimed by the
 * buyer with that exact email AND for that exact tier (`single`, `pass_7d`, or `pass_30d`).
 */
export function deriveKofiEmailTierSlotKey(rawEmail, tier) {
  const cleanEmail = String(rawEmail || '').trim().toLowerCase();
  const cleanTier = String(tier || 'single').trim();
  const digest = crypto
    .createHash('sha256')
    .update(`sab_kofi_email_tier_v1:${cleanEmail}:${cleanTier}`)
    .digest();

  let p1 = 'KS';
  for (let i = 0; i < 2; i++) {
    p1 += PASS_ALPHABET[digest[i] % PASS_ALPHABET.length];
  }
  let p2 = '';
  for (let i = 2; i < 6; i++) {
    p2 += PASS_ALPHABET[digest[i] % PASS_ALPHABET.length];
  }
  return `BLOOM-${p1}-${p2}`;
}

export function timingSafeMatch(a, b) {
  const bufA = Buffer.from(String(a || ''), 'utf8');
  const bufB = Buffer.from(String(b || ''), 'utf8');
  if (bufA.length !== bufB.length || bufA.length === 0) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function computeDeterministicHashHex(input, salt = 'sab-v1-couture-salt') {
  const str = `${salt}::${input}`;
  let h1 = 0xdeadbeef ^ str.length;
  let h2 = 0x41c6ce57 ^ str.length;
  let h3 = 0x9e3779b9 ^ str.length;
  let h4 = 0x85ebca6b ^ str.length;

  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 2246822507);
    h4 = Math.imul(h4 ^ ch, 3266489909);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  h3 = Math.imul(h3 ^ (h3 >>> 16), 2246822507) ^ Math.imul(h4 ^ (h4 >>> 13), 3266489909);
  h4 = Math.imul(h4 ^ (h4 >>> 16), 2246822507) ^ Math.imul(h3 ^ (h3 >>> 13), 3266489909);

  const toHex = (n) => (n >>> 0).toString(16).padStart(8, '0');
  return `${toHex(h1)}${toHex(h2)}${toHex(h3)}${toHex(h4)}`;
}

export function normalizePassKey(raw) {
  const cleaned = String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (cleaned.startsWith('BLOOM') && cleaned.length === 13) {
    return `BLOOM-${cleaned.slice(5, 9)}-${cleaned.slice(9, 13)}`;
  }
  if (cleaned.length === 8) {
    return `BLOOM-${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}`;
  }
  return String(raw || '').trim().toUpperCase();
}

export function extractPassKeyFromText(text) {
  const upper = String(text || '').toUpperCase();
  const hyphenMatch = upper.match(/BLOOM-[A-Z2-9]{4}-[A-Z2-9]{4}/);
  if (hyphenMatch) return hyphenMatch[0];
  const compactMatch = upper.replace(/[^A-Z0-9]/g, '').match(/BLOOM([A-Z2-9]{4})([A-Z2-9]{4})/);
  if (compactMatch) return `BLOOM-${compactMatch[1]}-${compactMatch[2]}`;
  return null;
}

export function isValidPassKeyFormat(raw) {
  return PASS_KEY_REGEX.test(normalizePassKey(raw));
}

export function generatePassKeyCode() {
  const bytes = crypto.randomBytes(8);
  let part1 = '';
  let part2 = '';
  for (let i = 0; i < 4; i++) {
    part1 += PASS_ALPHABET[bytes[i] % PASS_ALPHABET.length];
    part2 += PASS_ALPHABET[bytes[i + 4] % PASS_ALPHABET.length];
  }
  return `BLOOM-${part1}-${part2}`;
}

export function generateSessionNonce() {
  return crypto.randomBytes(12).toString('hex');
}

export function computePassIntegritySignature(record, secretSalt = CLIENT_SIGNATURE_SALT) {
  const canonical = [
    record.passKey,
    record.tier,
    record.expiresAt,
    String(record.retentionDays),
    record.isEternalKeepsake ? '1' : '0',
    record.primaryDeviceHash,
    record.secondaryDeviceHash || '',
    record.activeSessionNonce,
    record.boundBouquetCode || '',
  ].join('|');
  return computeDeterministicHashHex(canonical, secretSalt);
}

export function verifyPassIntegritySignature(record) {
  if (!record || typeof record.signature !== 'string' || !record.signature) return false;
  if (record.signature === computePassIntegritySignature(record, CLIENT_SIGNATURE_SALT)) {
    return true;
  }
  const serverSalt = getServerSigningSalt();
  if (serverSalt !== CLIENT_SIGNATURE_SALT) {
    return record.signature === computePassIntegritySignature(record, serverSalt);
  }
  return false;
}

export function signServerPaymentReference(prefix, passKey, tier, region, createdAt, expiresAt) {
  const cleanPrefix = String(prefix || 'ref')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 20);
  const tag = crypto
    .createHmac('sha256', getServerSigningSalt())
    .update(`${passKey}|${tier}|${region}|${createdAt}|${expiresAt}`)
    .digest('hex')
    .slice(0, 20);
  return `${cleanPrefix}_${tag}`;
}

export function createSignedStudioPassServer(params) {
  const now = params.nowMs ?? Date.now();
  const createdAt = params.createdAt || new Date(now).toISOString();
  const durationDays =
    params.tier === 'pass_30d' ? 30 : params.tier === 'pass_7d' ? 7 : 2;
  const expiresAt =
    params.expiresAt || new Date(now + durationDays * 24 * 60 * 60 * 1000).toISOString();
  const retentionDays = params.tier === 'pass_30d' ? 36500 : 90;
  const isEternalKeepsake = params.tier === 'pass_30d';
  const passKey = params.passKey ? normalizePassKey(params.passKey) : generatePassKeyCode();
  const activeSessionNonce = generateSessionNonce();
  const todayIso = createdAt.slice(0, 10);

  const paymentReference = signServerPaymentReference(
    params.paymentReference || params.paymentProvider || 'chk',
    passKey,
    params.tier,
    params.region,
    createdAt,
    expiresAt
  );

  const draft = {
    passKey,
    tier: params.tier,
    region: params.region,
    createdAt,
    expiresAt,
    retentionDays,
    isEternalKeepsake,
    primaryDeviceHash: params.deviceTokenHash || '',
    secondaryDeviceHash: params.secondaryDeviceHash || null,
    activeSessionNonce,
    boundBouquetCode:
      params.boundBouquetCode !== undefined
        ? params.boundBouquetCode
        : params.tier === 'single'
        ? params.boundBouquetCode || null
        : null,
    dailyUsageDate: todayIso,
    dailyUsageCount: 0,
    paymentProvider: params.paymentProvider || 'verified_checkout',
    paymentReference,
  };

  const signature = computePassIntegritySignature(draft, CLIENT_SIGNATURE_SALT);
  return {
    ...draft,
    signature,
  };
}

export function validateAndBindPassRedemptionServer(existingRecord, requestDeviceTokenHash, nowMs = Date.now()) {
  if (!existingRecord || !isValidPassKeyFormat(existingRecord.passKey)) {
    return {
      valid: false,
      status: 'INVALID_FORMAT',
      message: 'Invalid Pass Key format. Expected BLOOM-XXXX-XXXX.',
    };
  }

  if (!verifyPassIntegritySignature(existingRecord)) {
    return {
      valid: false,
      status: 'TAMPERED_SIGNATURE',
      message: 'This Pass Key failed security verification.',
    };
  }

  const expiresMs = Date.parse(existingRecord.expiresAt);
  if (!Number.isFinite(expiresMs) || nowMs > expiresMs) {
    return {
      valid: false,
      status: 'EXPIRED',
      message: 'This Studio Pass has expired.',
    };
  }

  let nextPrimary = existingRecord.primaryDeviceHash || '';
  let nextSecondary = existingRecord.secondaryDeviceHash || null;

  if (!nextPrimary) {
    nextPrimary = requestDeviceTokenHash;
  } else if (requestDeviceTokenHash !== nextPrimary) {
    if (!nextSecondary) {
      nextSecondary = requestDeviceTokenHash;
    } else if (requestDeviceTokenHash !== nextSecondary) {
      return {
        valid: false,
        status: 'DEVICE_LIMIT_EXCEEDED',
        message:
          'This Pass Key is already locked to its owner’s devices and cannot be shared with additional people.',
      };
    }
  }

  const nextSessionNonce = generateSessionNonce();
  const updatedDraft = {
    ...existingRecord,
    primaryDeviceHash: nextPrimary,
    secondaryDeviceHash: nextSecondary,
    activeSessionNonce: nextSessionNonce,
  };
  const signature = computePassIntegritySignature(updatedDraft, CLIENT_SIGNATURE_SALT);

  return {
    valid: true,
    status: 'VALID',
    message: 'Studio Pass verified and locked to your current session.',
    updatedPass: {
      ...updatedDraft,
      signature,
    },
  };
}

export function verifyActiveStudioPassForActionServer(params) {
  const { pass, deviceTokenHash } = params;
  const now = params.nowMs ?? Date.now();

  if (!pass || !isValidPassKeyFormat(pass.passKey)) {
    return {
      valid: false,
      status: 'INVALID_FORMAT',
      message: 'No active Studio Pass found.',
    };
  }

  if (!verifyPassIntegritySignature(pass)) {
    return {
      valid: false,
      status: 'TAMPERED_SIGNATURE',
      message: 'Studio Pass signature verification failed.',
    };
  }

  const expiresMs = Date.parse(pass.expiresAt);
  if (!Number.isFinite(expiresMs) || now > expiresMs) {
    return {
      valid: false,
      status: 'EXPIRED',
      message: 'Your Studio Pass has expired.',
    };
  }

  if (
    deviceTokenHash !== pass.primaryDeviceHash &&
    deviceTokenHash !== pass.secondaryDeviceHash
  ) {
    return {
      valid: false,
      status: 'DEVICE_LIMIT_EXCEEDED',
      message: 'This Pass Key belongs to another device.',
    };
  }

  if (params.clientSessionNonce && params.clientSessionNonce !== pass.activeSessionNonce) {
    return {
      valid: false,
      status: 'SESSION_SUPERSEDED',
      message:
        'This Pass Key was activated on another device or browser. Only 1 active session is allowed at a time.',
    };
  }

  if (pass.tier === 'single') {
    if (
      pass.boundBouquetCode &&
      params.bouquetCode &&
      pass.boundBouquetCode !== params.bouquetCode
    ) {
      return {
        valid: false,
        status: 'SINGLE_BOUQUET_ALREADY_USED',
        message:
          'This Single-Bouquet Unlock was already used for another bouquet. Grab a 7-Day or 30-Day Pass for unlimited creations!',
      };
    }
  }

  const todayIso = new Date(now).toISOString().slice(0, 10);
  const currentDailyCount = pass.dailyUsageDate === todayIso ? pass.dailyUsageCount || 0 : 0;

  if (params.incrementUsage && currentDailyCount >= MAX_DAILY_PASS_BOUQUETS) {
    return {
      valid: false,
      status: 'DAILY_LIMIT_REACHED',
      message: `Fair-use limit reached (${MAX_DAILY_PASS_BOUQUETS} bouquets/day). Your pass resets tomorrow!`,
    };
  }

  const nextBoundCode =
    pass.tier === 'single' ? pass.boundBouquetCode || params.bouquetCode || null : null;

  const updatedDraft = {
    ...pass,
    boundBouquetCode: nextBoundCode,
    dailyUsageDate: todayIso,
    dailyUsageCount: params.incrementUsage ? currentDailyCount + 1 : currentDailyCount,
  };
  const signature = computePassIntegritySignature(updatedDraft, CLIENT_SIGNATURE_SALT);

  return {
    valid: true,
    status: 'VALID',
    message: 'Studio Pass active.',
    updatedPass: {
      ...updatedDraft,
      signature,
    },
  };
}

export function createSignedCheckoutToken(payloadObj) {
  const jsonStr = JSON.stringify(payloadObj);
  const b64 = Buffer.from(jsonStr, 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', getServerSigningSalt())
    .update(b64, 'utf8')
    .digest('base64url');
  return `${b64}.${sig}`;
}

export function verifySignedCheckoutToken(tokenStr) {
  if (!tokenStr || typeof tokenStr !== 'string' || !tokenStr.includes('.')) return null;
  const [b64, sig] = tokenStr.split('.');
  if (!b64 || !sig) return null;
  const expectedSig = crypto
    .createHmac('sha256', getServerSigningSalt())
    .update(b64, 'utf8')
    .digest('base64url');
  if (!timingSafeMatch(expectedSig, sig)) return null;
  try {
    return JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

export async function saveStudioPassToFirestoreRest(pass) {
  if (!pass || !isValidPassKeyFormat(pass.passKey)) return false;
  try {
    const fields = {
      passKey: { stringValue: String(pass.passKey) },
      tier: { stringValue: String(pass.tier) },
      region: { stringValue: String(pass.region) },
      createdAt: { stringValue: String(pass.createdAt) },
      expiresAt: { stringValue: String(pass.expiresAt) },
      retentionDays: { integerValue: String(pass.retentionDays) },
      isEternalKeepsake: { booleanValue: Boolean(pass.isEternalKeepsake) },
      primaryDeviceHash: { stringValue: String(pass.primaryDeviceHash || '') },
      secondaryDeviceHash: { stringValue: String(pass.secondaryDeviceHash || '') },
      activeSessionNonce: { stringValue: String(pass.activeSessionNonce) },
      boundBouquetCode: { stringValue: String(pass.boundBouquetCode || '') },
      dailyUsageDate: { stringValue: String(pass.dailyUsageDate) },
      dailyUsageCount: { integerValue: String(pass.dailyUsageCount || 0) },
      paymentProvider: { stringValue: String(pass.paymentProvider) },
      paymentReference: { stringValue: String(pass.paymentReference).slice(0, 64) },
      signature: { stringValue: String(pass.signature) },
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    const resp = await fetch(`${FIRESTORE_PASSES_URL}/${encodeURIComponent(pass.passKey)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    return resp.ok;
  } catch {
    return false;
  }
}

export async function fetchStudioPassFromFirestoreRest(passKey) {
  const normalized = normalizePassKey(passKey);
  if (!isValidPassKeyFormat(normalized)) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    const resp = await fetch(`${FIRESTORE_PASSES_URL}/${encodeURIComponent(normalized)}`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!resp.ok) return null;
    const docJson = await resp.json();
    const f = docJson?.fields;
    if (!f || !f.passKey?.stringValue) return null;
    return {
      passKey: f.passKey.stringValue,
      tier: f.tier?.stringValue || 'pass_7d',
      region: f.region?.stringValue || 'INTL',
      createdAt: f.createdAt?.stringValue || '',
      expiresAt: f.expiresAt?.stringValue || '',
      retentionDays: Number(f.retentionDays?.integerValue || 90),
      isEternalKeepsake: Boolean(f.isEternalKeepsake?.booleanValue),
      primaryDeviceHash: f.primaryDeviceHash?.stringValue || '',
      secondaryDeviceHash: f.secondaryDeviceHash?.stringValue || null,
      activeSessionNonce: f.activeSessionNonce?.stringValue || '',
      boundBouquetCode: f.boundBouquetCode?.stringValue || null,
      dailyUsageDate: f.dailyUsageDate?.stringValue || '',
      dailyUsageCount: Number(f.dailyUsageCount?.integerValue || 0),
      paymentProvider: f.paymentProvider?.stringValue || 'kofi',
      paymentReference: f.paymentReference?.stringValue || '',
      signature: f.signature?.stringValue || '',
    };
  } catch {
    return null;
  }
}

/**
 * Syncs owner-configured Ko-fi Shop item codes (`single:pass_7d:pass_30d`) to/from Firestore `BLOOM-KCFG-SHOP`
 * so serverless webhook invocations on Vercel can read owner-configured codes even if set via UI.
 */
async function syncOwnerShopCodesWithFirestore(newCodes) {
  if (newCodes && (newCodes.single || newCodes.pass_7d || newCodes.pass_30d)) {
    const s = extractKofiShopCode(newCodes.single) || cachedOwnerShopCodes.single || '';
    const p7 = extractKofiShopCode(newCodes.pass_7d) || cachedOwnerShopCodes.pass_7d || '';
    const p30 = extractKofiShopCode(newCodes.pass_30d) || cachedOwnerShopCodes.pass_30d || '';
    cachedOwnerShopCodes = { single: s, pass_7d: p7, pass_30d: p30 };
    const packed = `${s}:${p7}:${p30}`.slice(0, 48);
    const cfgRecord = createSignedStudioPassServer({
      passKey: 'BLOOM-KCFG-SHOP',
      tier: 'single',
      region: 'INTL',
      deviceTokenHash: 'owner_config',
      boundBouquetCode: packed,
      paymentProvider: 'kofi',
      paymentReference: 'cfg',
    });
    SERVER_PASS_STORE.set('BLOOM-KCFG-SHOP', cfgRecord);
    await saveStudioPassToFirestoreRest(cfgRecord);
    return cachedOwnerShopCodes;
  }

  if (!cachedOwnerShopCodes.single && !cachedOwnerShopCodes.pass_7d && !cachedOwnerShopCodes.pass_30d) {
    const remoteCfg =
      SERVER_PASS_STORE.get('BLOOM-KCFG-SHOP') ||
      (await fetchStudioPassFromFirestoreRest('BLOOM-KCFG-SHOP'));
    if (remoteCfg && typeof remoteCfg.boundBouquetCode === 'string' && remoteCfg.boundBouquetCode.includes(':')) {
      const [s, p7, p30] = remoteCfg.boundBouquetCode.split(':');
      cachedOwnerShopCodes = {
        single: extractKofiShopCode(s),
        pass_7d: extractKofiShopCode(p7),
        pass_30d: extractKofiShopCode(p30),
      };
    }
  }
  return cachedOwnerShopCodes;
}

export function verifyPaymongoWebhookSignature(rawBody, signatureHeader, webhookSecret) {
  if (!signatureHeader || !webhookSecret) return false;
  const parts = {};
  for (const segment of String(signatureHeader).split(',')) {
    const [k, v] = segment.trim().split('=');
    if (k && v) parts[k] = v;
  }
  const timestamp = parts.t;
  const candidateSig = parts.li || parts.te;
  if (!timestamp || !candidateSig) return false;

  const signedPayload = `${timestamp}.${rawBody}`;
  const expectedSig = crypto
    .createHmac('sha256', webhookSecret)
    .update(signedPayload, 'utf8')
    .digest('hex');

  return timingSafeMatch(expectedSig, candidateSig);
}

async function readRequestBody(req) {
  const parseStringPayload = (str) => {
    const trimmed = String(str || '').trim();
    if (!trimmed) return { raw: '', parsed: {} };
    if (trimmed.startsWith('data=')) {
      const params = new URLSearchParams(trimmed);
      const dataStr = params.get('data') || '{}';
      try {
        return { raw: trimmed, parsed: JSON.parse(dataStr) };
      } catch {
        return { raw: trimmed, parsed: {} };
      }
    }
    try {
      return { raw: trimmed, parsed: JSON.parse(trimmed) };
    } catch {
      const params = new URLSearchParams(trimmed);
      const dataStr = params.get('data');
      if (dataStr) {
        try {
          return { raw: trimmed, parsed: JSON.parse(dataStr) };
        } catch {
          return { raw: trimmed, parsed: {} };
        }
      }
      return { raw: trimmed, parsed: {} };
    }
  };

  if (req.body !== undefined && req.body !== null) {
    if (Buffer.isBuffer(req.body) || req.body instanceof Uint8Array) {
      return parseStringPayload(Buffer.from(req.body).toString('utf8'));
    }
    if (typeof req.body === 'string') {
      return parseStringPayload(req.body);
    }
    if (typeof req.body === 'object') {
      if (typeof req.body.data === 'string' && req.body.data.trim().startsWith('{')) {
        try {
          return { raw: req.body.data, parsed: JSON.parse(req.body.data) };
        } catch {
          return { raw: req.body.data, parsed: {} };
        }
      }
      const rawStr = JSON.stringify(req.body);
      return { raw: rawStr, parsed: req.body };
    }
  }

  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      resolve(parseStringPayload(raw));
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

function isValidTier(tier) {
  return tier === 'single' || tier === 'pass_7d' || tier === 'pass_30d';
}

function isValidRegion(region) {
  return region === 'PH' || region === 'INTL';
}

/**
 * Strictly maps a Ko-fi `Shop Order` webhook payload (`shop_items: [{ direct_link_code }]`)
 * to its exact tier (`single`, `pass_7d`, or `pass_30d`).
 * Returns `{ valid: false, reason }` if `type !== 'Shop Order'` or if the `direct_link_code`
 * does not match the configured Shop items!
 */
export function resolveKofiShopOrderTier(parsedWebhook, configuredShopCodes) {
  const webhookType = String(parsedWebhook?.type || '').trim();
  if (webhookType !== 'Shop Order') {
    return {
      valid: false,
      reason: 'NON_SHOP_ORDER_REJECTED',
      message: `Ignored Ko-fi "${webhookType || 'unknown'}" event — only "Shop Order" events unlock Studio Passes.`,
    };
  }

  const shopItems = Array.isArray(parsedWebhook?.shop_items) ? parsedWebhook.shop_items : [];
  if (shopItems.length === 0) {
    return {
      valid: false,
      reason: 'EMPTY_SHOP_ITEMS',
      message: 'Ko-fi Shop Order contains no shop_items.',
    };
  }

  const itemCodes = shopItems
    .map((item) => extractKofiShopCode(item?.direct_link_code))
    .filter(Boolean);

  if (itemCodes.length === 0) {
    return {
      valid: false,
      reason: 'MISSING_DIRECT_LINK_CODE',
      message: 'Ko-fi Shop Order is missing direct_link_code.',
    };
  }

  const rawAmountStr =
    parsedWebhook?.amount !== undefined && parsedWebhook?.amount !== null
      ? String(parsedWebhook.amount).trim()
      : '';
  const parsedAmount = rawAmountStr !== '' ? Number.parseFloat(rawAmountStr) : NaN;
  const isExplicitZeroDollarTest = Number.isFinite(parsedAmount) && parsedAmount <= 0;

  const codes = getActiveKofiShopCodes(configuredShopCodes);
  const hasAnyConfiguredCode = Boolean(codes.test || codes.single || codes.pass_7d || codes.pass_30d);

  if (hasAnyConfiguredCode) {
    const matchedTiers = [];
    let primaryDirectLinkCode = '';

    if (codes.single && itemCodes.includes(codes.single)) {
      matchedTiers.push('single');
      if (!primaryDirectLinkCode) primaryDirectLinkCode = codes.single;
    }
    if (codes.pass_7d && itemCodes.includes(codes.pass_7d)) {
      matchedTiers.push('pass_7d');
      if (!primaryDirectLinkCode) primaryDirectLinkCode = codes.pass_7d;
    }
    if (codes.pass_30d && itemCodes.includes(codes.pass_30d)) {
      matchedTiers.push('pass_30d');
      primaryDirectLinkCode = codes.pass_30d;
    }

    if (matchedTiers.length > 0) {
      return {
        valid: true,
        tier: matchedTiers[matchedTiers.length - 1],
        matchedTiers,
        directLinkCode: primaryDirectLinkCode,
      };
    }

    if ((codes.test && itemCodes.includes(codes.test)) || isExplicitZeroDollarTest) {
      return {
        valid: true,
        tier: 'pass_30d',
        matchedTiers: ['single', 'pass_7d', 'pass_30d'],
        directLinkCode: '',
      };
    }

    return {
      valid: false,
      reason: 'UNRECOGNIZED_DIRECT_LINK_CODE',
      message: `Shop item direct_link_code (${itemCodes.join(', ')}) does not match configured Single, 7-Day, or 30-Day Shop items.`,
    };
  }

  // Fallback when owner hasn't configured specific codes yet: still strictly requires type === 'Shop Order'
  // and a valid direct_link_code, resolving tier by amount/currency (or unlocking all 3 tiers if $0 test product)
  const amount = Number.isFinite(parsedAmount) ? parsedAmount : 0;
  const cur = String(parsedWebhook?.currency || 'USD').toUpperCase();
  if (amount <= 0) {
    return {
      valid: true,
      tier: 'pass_30d',
      matchedTiers: ['single', 'pass_7d', 'pass_30d'],
      directLinkCode: '',
    };
  }
  let tier = 'single';
  if (cur === 'PHP' || amount >= 35) {
    tier = amount >= 180 ? 'pass_30d' : amount >= 85 ? 'pass_7d' : 'single';
  } else {
    tier = amount >= 8.0 ? 'pass_30d' : amount >= 4.5 ? 'pass_7d' : 'single';
  }
  return {
    valid: true,
    tier,
    matchedTiers: [tier],
    directLinkCode: itemCodes[0],
  };
}

export async function handlePaymentEndpoint(req, res, forcedPathname) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return true;
  }

  const urlObj = new URL(req.url || '/', `http://${req.headers?.host || 'localhost'}`);
  const pathname = forcedPathname || urlObj.pathname;

  if (!pathname.startsWith('/api/payments/') && !pathname.startsWith('/api/webhooks/')) {
    return false;
  }

  try {
    // 1. POST /api/payments/create-checkout
    if (pathname === '/api/payments/create-checkout' && req.method === 'POST') {
      const { parsed } = await readRequestBody(req);

      // Allow owner to sync their 3 Ko-fi Shop direct_link_codes
      if (parsed.syncShopCodes && typeof parsed.syncShopCodes === 'object') {
        const synced = await syncOwnerShopCodesWithFirestore(parsed.syncShopCodes);
        sendJson(res, 200, { ok: true, shopCodes: synced });
        return true;
      }

      const tier = isValidTier(parsed.tier) ? parsed.tier : 'pass_7d';
      const region = isValidRegion(parsed.region) ? parsed.region : 'PH';
      const paymongoSecret = process.env.PAYMONGO_SECRET_KEY?.trim() || '';
      const kofiVerificationToken = process.env.KOFI_VERIFICATION_TOKEN?.trim() || '';

      await syncOwnerShopCodesWithFirestore(parsed.shopCodes);
      const shopCodes = getActiveKofiShopCodes(parsed.shopCodes);
      const tierDirectLinkCode = shopCodes[tier] || '';
      const kofiShopItemUrl = buildKofiShopItemUrl(tierDirectLinkCode, process.env.KOFI_PAGE_URL);

      const isProductionEnv = Boolean(
        process.env.VERCEL ||
          paymongoSecret ||
          kofiVerificationToken ||
          process.env.KOFI_PAGE_URL ||
          tierDirectLinkCode
      );

      let provider = parsed.provider === 'kofi' ? 'kofi' : 'paymongo';
      if (provider === 'paymongo' && !paymongoSecret && isProductionEnv) {
        provider = 'kofi';
      }

      const deviceTokenHash =
        typeof parsed.deviceTokenHash === 'string' && parsed.deviceTokenHash.length >= 8
          ? parsed.deviceTokenHash.slice(0, 64)
          : 'anonymous_device_hash';
      const boundBouquetCode =
        typeof parsed.bouquetCode === 'string' && parsed.bouquetCode.trim()
          ? parsed.bouquetCode.trim().slice(0, 48)
          : null;

      const plan = PRICING_CATALOG[region][tier];
      const checkoutId = `chk_${crypto.randomBytes(8).toString('hex')}`;
      const passKey = generatePassKeyCode();

      let checkoutUrl = null;
      let paymongoSessionId;
      let liveGatewayConfigured = false;

      if (provider === 'paymongo' && paymongoSecret) {
        liveGatewayConfigured = true;
        try {
          const authHeader = `Basic ${Buffer.from(`${paymongoSecret}:`).toString('base64')}`;
          const origin =
            typeof parsed.origin === 'string' && parsed.origin.startsWith('http')
              ? parsed.origin
              : 'https://www.sendabouquet.online';
          const pmRes = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
            method: 'POST',
            headers: {
              Authorization: authHeader,
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify({
              data: {
                attributes: {
                  send_email_receipt: false,
                  show_description: true,
                  show_line_items: true,
                  description: `Send A Bouquet — ${plan.name} (${passKey})`,
                  reference_number: passKey,
                  payment_method_types:
                    region === 'PH'
                      ? ['qrph', 'gcash', 'paymaya', 'card']
                      : ['card', 'gcash', 'paymaya'],
                  line_items: [
                    {
                      currency: 'PHP',
                      amount:
                        region === 'PH' ? plan.amountMinor : PRICING_CATALOG.PH[tier].amountMinor,
                      name: `Send A Bouquet · ${plan.name}`,
                      quantity: 1,
                    },
                  ],
                  success_url: `${origin}/?checkout_success=${encodeURIComponent(checkoutId)}`,
                  cancel_url: `${origin}/?checkout_cancelled=1`,
                  metadata: {
                    checkoutId,
                    passKey,
                    tier,
                    region,
                    deviceTokenHash,
                  },
                },
              },
            }),
          });
          if (pmRes.ok) {
            const pmJson = await pmRes.json();
            paymongoSessionId = pmJson.data?.id;
            checkoutUrl = pmJson.data?.attributes?.checkout_url || null;
          }
        } catch {
          // Fallback if network call fails
        }
      } else if (provider === 'kofi') {
        liveGatewayConfigured = Boolean(isProductionEnv);
        checkoutUrl = kofiShopItemUrl;
      }

      const checkoutToken = createSignedCheckoutToken({
        cid: checkoutId,
        pk: passKey,
        t: tier,
        r: region,
        p: provider,
        d: deviceTokenHash,
        b: boundBouquetCode,
        dlc: tierDirectLinkCode || null,
        pmId: paymongoSessionId || null,
        live: liveGatewayConfigured,
        ts: Date.now(),
      });

      PENDING_CHECKOUT_STORE.set(checkoutId, {
        checkoutId,
        checkoutToken,
        passKey,
        tier,
        region,
        plan,
        deviceTokenHash,
        boundBouquetCode,
        directLinkCode: tierDirectLinkCode || null,
        provider,
        paymongoSessionId,
        checkoutUrl,
        liveGatewayConfigured,
        status: 'pending',
        createdAtMs: Date.now(),
      });

      sendJson(res, 200, {
        ok: true,
        checkoutId,
        checkoutToken,
        passKeyPreview: passKey,
        plan,
        provider,
        checkoutUrl,
        directLinkCode: tierDirectLinkCode || null,
        liveGatewayConfigured,
      });
      return true;
    }

    // 2. POST /api/payments/verify-and-issue
    if (pathname === '/api/payments/verify-and-issue' && req.method === 'POST') {
      const { parsed } = await readRequestBody(req);
      const checkoutId = typeof parsed.checkoutId === 'string' ? parsed.checkoutId : '';
      const checkoutToken = typeof parsed.checkoutToken === 'string' ? parsed.checkoutToken : '';
      const deviceTokenHash =
        typeof parsed.deviceTokenHash === 'string' ? parsed.deviceTokenHash : '';
      const buyerEmail =
        typeof parsed.buyerEmail === 'string' ? parsed.buyerEmail.trim().toLowerCase() : '';

      let pending = PENDING_CHECKOUT_STORE.get(checkoutId) || null;
      const decodedToken = verifySignedCheckoutToken(checkoutToken);

      if (!pending && decodedToken && decodedToken.cid === checkoutId) {
        const resolvedRegion = isValidRegion(decodedToken.r) ? decodedToken.r : 'INTL';
        const resolvedTier = isValidTier(decodedToken.t) ? decodedToken.t : 'single';
        pending = {
          checkoutId: decodedToken.cid,
          checkoutToken,
          passKey: decodedToken.pk,
          tier: resolvedTier,
          region: resolvedRegion,
          plan: PRICING_CATALOG[resolvedRegion][resolvedTier],
          provider: decodedToken.p,
          deviceTokenHash: decodedToken.d,
          boundBouquetCode: decodedToken.b || null,
          directLinkCode: decodedToken.dlc || null,
          paymongoSessionId: decodedToken.pmId || undefined,
          liveGatewayConfigured: Boolean(decodedToken.live),
          status: 'pending',
          createdAtMs: decodedToken.ts || Date.now(),
        };
      }

      if (!pending) {
        sendJson(res, 404, {
          ok: false,
          message: 'Checkout session expired. Please start checkout again.',
        });
        return true;
      }

      if (!decodedToken && !timingSafeMatch(pending.checkoutToken, checkoutToken)) {
        sendJson(res, 403, {
          ok: false,
          message: 'Invalid checkout verification token.',
        });
        return true;
      }

      if (pending.deviceTokenHash !== deviceTokenHash) {
        sendJson(res, 403, {
          ok: false,
          message: 'Device mismatch during checkout verification.',
        });
        return true;
      }

      // Case A: Live PayMongo Session Verification
      const paymongoSecret = process.env.PAYMONGO_SECRET_KEY?.trim() || '';
      if (pending.provider === 'paymongo' && pending.paymongoSessionId && paymongoSecret && pending.status !== 'paid') {
        try {
          const authHeader = `Basic ${Buffer.from(`${paymongoSecret}:`).toString('base64')}`;
          const checkRes = await fetch(
            `https://api.paymongo.com/v1/checkout_sessions/${encodeURIComponent(
              pending.paymongoSessionId
            )}`,
            {
              headers: {
                Authorization: authHeader,
                Accept: 'application/json',
              },
            }
          );
          if (checkRes.ok) {
            const checkJson = await checkRes.json();
            const piStatus = checkJson.data?.attributes?.payment_intent?.attributes?.status;
            const hasPaidEntry = checkJson.data?.attributes?.payments?.some(
              (p) => p.attributes?.status === 'paid'
            );
            if (piStatus !== 'succeeded' && !hasPaidEntry) {
              sendJson(res, 402, {
                ok: false,
                status: 'PENDING_PAYMENT',
                message: 'Payment is still awaiting confirmation from PayMongo.',
              });
              return true;
            }
          }
        } catch {
          // Allow fallback if offline
        }
      }

      // Case B: Ko-fi Shop Order Verification by Buyer Email + Tier
      const kofiVerificationToken = process.env.KOFI_VERIFICATION_TOKEN?.trim() || '';
      const isKofiLiveRequired =
        pending.provider === 'kofi' &&
        (Boolean(kofiVerificationToken) ||
          Boolean(process.env.VERCEL) ||
          Boolean(pending.liveGatewayConfigured) ||
          Boolean(buyerEmail));

      if (isKofiLiveRequired && pending.status !== 'paid') {
        if (!buyerEmail || !buyerEmail.includes('@')) {
          sendJson(res, 400, {
            ok: false,
            status: 'EMAIL_REQUIRED',
            message: 'Please enter the same email address you used on Ko-fi Shop.',
          });
          return true;
        }

        const emailTierSlotKey = deriveKofiEmailTierSlotKey(buyerEmail, pending.tier);
        const receiptSlot =
          SERVER_PASS_STORE.get(emailTierSlotKey) ||
          (await fetchStudioPassFromFirestoreRest(emailTierSlotKey));

        // If no receipt exists in the requested tier slot, check if the buyer ordered a different tier
        if (!receiptSlot) {
          const otherTiers = ['single', 'pass_7d', 'pass_30d'].filter((t) => t !== pending.tier);
          for (const otherTier of otherTiers) {
            const otherSlotKey = deriveKofiEmailTierSlotKey(buyerEmail, otherTier);
            const candidate =
              SERVER_PASS_STORE.get(otherSlotKey) ||
              (await fetchStudioPassFromFirestoreRest(otherSlotKey));
            if (candidate && candidate.secondaryDeviceHash !== 'CLAIMED') {
              sendJson(res, 403, {
                ok: false,
                status: 'TIER_MISMATCH',
                message: `Your Ko-fi Shop order was for "${PRICING_CATALOG.INTL[otherTier]?.name || otherTier}", which does not match "${pending.plan?.name || pending.tier}". Please select the matching tier.`,
              });
              return true;
            }
          }

          sendJson(res, 402, {
            ok: false,
            status: 'PENDING_PAYMENT',
            message: `No confirmed Ko-fi Shop order for "${pending.plan?.name || pending.tier}" found for ${buyerEmail} yet. Make sure you bought the exact ${pending.plan?.name || pending.tier} item on Ko-fi Shop.`,
          });
          return true;
        }

        // Verify the Shop Order receipt matches the requested tier
        if (receiptSlot.tier !== pending.tier) {
          sendJson(res, 403, {
            ok: false,
            status: 'TIER_MISMATCH',
            message: `Your Ko-fi Shop order was for "${receiptSlot.tier}", which does not match "${pending.tier}". Please select the matching tier.`,
          });
          return true;
        }

        if (receiptSlot.secondaryDeviceHash === 'CLAIMED') {
          sendJson(res, 403, {
            ok: false,
            status: 'ORDER_ALREADY_CLAIMED',
            message:
              'This Ko-fi Shop order has already been claimed. Check "My Key" or place a new order on Ko-fi Shop.',
          });
          return true;
        }

        const activeShopCodes = getActiveKofiShopCodes();
        if (
          pending.directLinkCode &&
          receiptSlot.boundBouquetCode &&
          receiptSlot.boundBouquetCode !== pending.directLinkCode &&
          receiptSlot.boundBouquetCode !== activeShopCodes.test
        ) {
          sendJson(res, 403, {
            ok: false,
            status: 'SHOP_ITEM_CODE_MISMATCH',
            message: 'The purchased Ko-fi Shop item does not match this pass tier.',
          });
          return true;
        }

        // Mark this `(buyerEmail, tier)` receipt slot as CLAIMED so it cannot be reused
        const claimedSlot = {
          ...receiptSlot,
          primaryDeviceHash: deviceTokenHash,
          secondaryDeviceHash: 'CLAIMED',
        };
        claimedSlot.signature = computePassIntegritySignature(claimedSlot, CLIENT_SIGNATURE_SALT);
        SERVER_PASS_STORE.set(emailTierSlotKey, claimedSlot);
        await saveStudioPassToFirestoreRest(claimedSlot);

        // Issue the buyer's device-bound Pass Key (`BLOOM-XXXX-XXXX`)
        const boundPass = createSignedStudioPassServer({
          passKey: pending.passKey,
          tier: pending.tier,
          region: pending.region,
          deviceTokenHash: pending.deviceTokenHash,
          boundBouquetCode: pending.boundBouquetCode,
          paymentProvider: 'kofi',
          paymentReference: receiptSlot.paymentReference || 'kofi_shop',
        });

        SERVER_PASS_STORE.set(boundPass.passKey, boundPass);
        await saveStudioPassToFirestoreRest(boundPass);
        sendJson(res, 200, {
          ok: true,
          pass: boundPass,
        });
        return true;
      }

      // Case C: Local Sandbox Preview (only when no live tokens / Vercel env / email is active)
      pending.status = 'paid';
      let passRecord = SERVER_PASS_STORE.get(pending.passKey);
      if (!passRecord) {
        passRecord = createSignedStudioPassServer({
          passKey: pending.passKey,
          tier: pending.tier,
          region: pending.region,
          deviceTokenHash: pending.deviceTokenHash,
          boundBouquetCode: pending.boundBouquetCode,
          paymentProvider: pending.provider,
          paymentReference: pending.checkoutId,
        });
        SERVER_PASS_STORE.set(passRecord.passKey, passRecord);
      }
      await saveStudioPassToFirestoreRest(passRecord);

      sendJson(res, 200, {
        ok: true,
        pass: passRecord,
      });
      return true;
    }

    // 3. POST /api/payments/redeem-pass
    if (pathname === '/api/payments/redeem-pass' && req.method === 'POST') {
      const { parsed } = await readRequestBody(req);
      const rawKey = typeof parsed.passKey === 'string' ? parsed.passKey : '';
      const passKey = normalizePassKey(rawKey);
      const deviceTokenHash =
        typeof parsed.deviceTokenHash === 'string' && parsed.deviceTokenHash.length >= 8
          ? parsed.deviceTokenHash
          : '';

      // Prevent internal Ko-fi receipt slots (`BLOOM-KS...` or `BLOOM-KCFG-SHOP`) from being redeemed directly as user keys
      if (
        !isValidPassKeyFormat(passKey) ||
        !deviceTokenHash ||
        passKey.startsWith('BLOOM-KS') ||
        passKey === 'BLOOM-KCFG-SHOP'
      ) {
        sendJson(res, 400, {
          ok: false,
          status: 'INVALID_FORMAT',
          message: 'Please enter a valid Pass Key (e.g., BLOOM-7K4M-9P2X).',
        });
        return true;
      }

      let existingRecord =
        SERVER_PASS_STORE.get(passKey) || (await fetchStudioPassFromFirestoreRest(passKey));
      if (!existingRecord && parsed.existingRecord && typeof parsed.existingRecord === 'object') {
        existingRecord = parsed.existingRecord;
      }

      if (!existingRecord) {
        sendJson(res, 404, {
          ok: false,
          status: 'NOT_FOUND',
          message: 'Pass Key not found. Double-check your code or complete checkout first.',
        });
        return true;
      }

      const result = validateAndBindPassRedemptionServer(
        existingRecord,
        deviceTokenHash,
        Date.now()
      );

      if (!result.valid || !result.updatedPass) {
        sendJson(res, 403, {
          ok: false,
          status: result.status,
          message: result.message,
        });
        return true;
      }

      SERVER_PASS_STORE.set(passKey, result.updatedPass);
      await saveStudioPassToFirestoreRest(result.updatedPass);
      sendJson(res, 200, {
        ok: true,
        status: result.status,
        message: result.message,
        pass: result.updatedPass,
      });
      return true;
    }

    // 4. POST /api/payments/verify-action
    if (pathname === '/api/payments/verify-action' && req.method === 'POST') {
      const { parsed } = await readRequestBody(req);
      const clientPass = parsed.pass || null;
      const deviceTokenHash =
        typeof parsed.deviceTokenHash === 'string' ? parsed.deviceTokenHash : '';
      const bouquetCode =
        typeof parsed.bouquetCode === 'string' ? parsed.bouquetCode : null;
      const incrementUsage = Boolean(parsed.incrementUsage);

      if (!clientPass || !isValidPassKeyFormat(clientPass.passKey)) {
        sendJson(res, 403, {
          ok: false,
          status: 'INVALID_FORMAT',
          message: 'No valid Studio Pass found.',
        });
        return true;
      }

      const normKey = normalizePassKey(clientPass.passKey);
      const canonicalPass =
        SERVER_PASS_STORE.get(normKey) ||
        (await fetchStudioPassFromFirestoreRest(normKey)) ||
        clientPass;

      const check = verifyActiveStudioPassForActionServer({
        pass: canonicalPass,
        deviceTokenHash,
        clientSessionNonce: clientPass.activeSessionNonce,
        bouquetCode,
        incrementUsage,
      });

      if (!check.valid || !check.updatedPass) {
        sendJson(res, 403, {
          ok: false,
          status: check.status,
          message: check.message,
        });
        return true;
      }

      SERVER_PASS_STORE.set(check.updatedPass.passKey, check.updatedPass);
      await saveStudioPassToFirestoreRest(check.updatedPass);
      sendJson(res, 200, {
        ok: true,
        status: 'VALID',
        pass: check.updatedPass,
      });
      return true;
    }

    // 5. POST /api/webhooks/paymongo
    if (pathname === '/api/webhooks/paymongo' && req.method === 'POST') {
      const { raw, parsed } = await readRequestBody(req);
      const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET?.trim() || '';
      const sigHeader = req.headers?.['paymongo-signature'];

      if (webhookSecret && !verifyPaymongoWebhookSignature(raw, sigHeader, webhookSecret)) {
        sendJson(res, 401, { ok: false, message: 'Invalid PayMongo webhook signature' });
        return true;
      }

      const dataObj = parsed.data || {};
      const eventType = dataObj.attributes?.type || '';
      const resourceAttrs = dataObj.attributes?.data?.attributes || {};
      const metadata = resourceAttrs.metadata || {};
      const checkoutId = metadata.checkoutId || '';
      const passKey = normalizePassKey(
        metadata.passKey || resourceAttrs.reference_number || ''
      );

      if (eventType.includes('paid') || eventType.includes('succeeded')) {
        if (checkoutId && PENDING_CHECKOUT_STORE.has(checkoutId)) {
          const pending = PENDING_CHECKOUT_STORE.get(checkoutId);
          pending.status = 'paid';
          const signedPass = createSignedStudioPassServer({
            passKey: pending.passKey,
            tier: pending.tier,
            region: pending.region,
            deviceTokenHash: pending.deviceTokenHash,
            boundBouquetCode: pending.boundBouquetCode,
            paymentProvider: 'paymongo',
            paymentReference: checkoutId,
          });
          SERVER_PASS_STORE.set(signedPass.passKey, signedPass);
          await saveStudioPassToFirestoreRest(signedPass);
        } else if (isValidPassKeyFormat(passKey)) {
          const tier = isValidTier(metadata.tier) ? metadata.tier : 'pass_7d';
          const region = isValidRegion(metadata.region) ? metadata.region : 'PH';
          const signedPass = createSignedStudioPassServer({
            passKey,
            tier,
            region,
            deviceTokenHash: metadata.deviceTokenHash || '',
            paymentProvider: 'paymongo',
            paymentReference: `pm_${Date.now()}`,
          });
          SERVER_PASS_STORE.set(signedPass.passKey, signedPass);
          await saveStudioPassToFirestoreRest(signedPass);
        }
      }

      sendJson(res, 200, { ok: true });
      return true;
    }

    // 6. POST /api/webhooks/kofi — Strict Ko-fi Shop Order (`direct_link_code` + Buyer Email) Listener
    if (pathname === '/api/webhooks/kofi' && req.method === 'POST') {
      const { parsed } = await readRequestBody(req);
      const expectedToken = (process.env.KOFI_VERIFICATION_TOKEN || '')
        .replace(/^["']+|["']+$/g, '')
        .trim();
      const incomingToken =
        typeof parsed.verification_token === 'string'
          ? parsed.verification_token.replace(/^["']+|["']+$/g, '').trim()
          : '';

      if (expectedToken && !timingSafeMatch(expectedToken, incomingToken)) {
        sendJson(res, 401, { ok: false, message: 'Invalid Ko-fi verification token' });
        return true;
      }

      // Sync owner-configured Shop direct_link_codes from Firestore if not already cached
      const ownerCodes = await syncOwnerShopCodesWithFirestore();
      const resolution = resolveKofiShopOrderTier(parsed, ownerCodes);

      // Strictly reject non-Shop Orders (e.g. "Donation" / "Subscription" test clicks) or unknown item codes
      if (!resolution.valid) {
        sendJson(res, 200, {
          ok: false,
          ignored: true,
          reason: resolution.reason,
          message: resolution.message,
        });
        return true;
      }

      const buyerEmail = String(parsed.email || '').trim().toLowerCase();
      if (!buyerEmail || !buyerEmail.includes('@')) {
        sendJson(res, 200, {
          ok: false,
          ignored: true,
          reason: 'MISSING_BUYER_EMAIL',
          message: 'Ko-fi Shop Order is missing buyer email.',
        });
        return true;
      }

      const currency = String(parsed.currency || 'USD').toUpperCase();
      const kofiTxId = String(parsed.kofi_transaction_id || `kofi_${Date.now()}`);
      const tier = resolution.tier;
      const directLinkCode = resolution.directLinkCode || '';
      const matchedTiers =
        Array.isArray(resolution.matchedTiers) && resolution.matchedTiers.length > 0
          ? resolution.matchedTiers
          : [tier];

      // Store unclaimed receipt in deterministic `(buyerEmail, matchedTier)` slot(s) `BLOOM-KSXX-XXXX`
      const writtenSlots = [];
      for (const matchedTier of matchedTiers) {
        const slotKey = deriveKofiEmailTierSlotKey(buyerEmail, matchedTier);
        const receiptRecord = createSignedStudioPassServer({
          passKey: slotKey,
          tier: matchedTier,
          region: currency === 'PHP' ? 'PH' : 'INTL',
          deviceTokenHash: '',
          secondaryDeviceHash: null, // Unclaimed until buyer verifies with their email
          boundBouquetCode: directLinkCode,
          paymentProvider: 'kofi',
          paymentReference: `kfs_${kofiTxId.slice(0, 12)}`,
        });

        SERVER_PASS_STORE.set(slotKey, receiptRecord);
        await saveStudioPassToFirestoreRest(receiptRecord);
        writtenSlots.push(slotKey);
      }

      sendJson(res, 200, {
        ok: true,
        type: 'Shop Order',
        emailTierSlotKey: writtenSlots[0],
        writtenSlots,
        tier,
        matchedTiers,
        directLinkCode,
      });
      return true;
    }

    sendJson(res, 404, { ok: false, message: 'Unknown payment endpoint' });
    return true;
  } catch (err) {
    console.error('Payment API error:', err);
    sendJson(res, 500, { ok: false, message: 'Internal payment processing error' });
    return true;
  }
}
