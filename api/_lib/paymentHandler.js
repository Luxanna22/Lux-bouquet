import crypto from 'node:crypto';
import {
  applySecurityHeaders,
  checkRateLimit,
  extractClientIp,
  sanitizeJsonValue,
} from './securityGuard.js';
import { runOwnerAnalyticsAi } from './ownerAiHandler.js';

const FIRESTORE_PROJECT_ID = 'amiable-alloy-sw1sf';
const FIRESTORE_DB_ID = 'ai-studio-luxbouquet-d9f38715-de7a-49d9-bccf-4493a2abc586';
const FIRESTORE_PASSES_URL = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/${FIRESTORE_DB_ID}/documents/studio_passes`;
const FIRESTORE_SHARED_BOUQUETS_URL = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/${FIRESTORE_DB_ID}/documents/shared_bouquets`;

// Deterministic HMAC-derived Firestore document code for persistent Owner Analytics, Vouchers, Revenue & PIN across Vercel deploys
export const OWNER_VAULT_DOC_CODE = `sab_ov_${crypto
  .createHmac('sha256', 'sab-persistent-owner-vault-key-2026-v1')
  .update('sab_owner_persistent_vault_v1')
  .digest('hex')
  .slice(0, 14)}`;
const OWNER_VAULT_IMMUTABLE_CREATED_AT = '2026-11-08T00:00:00.000Z';
const OWNER_VAULT_IMMUTABLE_PAYLOAD = '#sab_owner_vault_v1';

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
 * Resolves the Ko-fi Shop `direct_link_code`s from environment variables + owner fallback.
 * Strictly isolates production and test codes per tier (`single`, `pass_7d`, `pass_30d`):
 * - Single Bouquet (`single`): `KOFI_SHOP_SINGLE_CODE` (prod) + `KOFI_SHOP_TEST_SINGLE_CODE` / `KOFI_SHOP_TEST_CODE` (test)
 * - 7-Day Pass (`pass_7d`): `KOFI_SHOP_7D_CODE` (prod) + `KOFI_SHOP_TEST_7D_CODE` (test)
 * - 30-Day Eternal (`pass_30d`): `KOFI_SHOP_30D_CODE` (prod) + `KOFI_SHOP_TEST_30D_CODE` (test)
 */
export function getActiveKofiShopCodes(clientOverride) {
  let overrideSingle = '';
  let override7d = '';
  let override30d = '';
  let overrideTestSingle = '';
  let overrideTest7d = '';
  let overrideTest30d = '';

  if (clientOverride && typeof clientOverride === 'object') {
    overrideSingle = extractKofiShopCode(clientOverride.single);
    override7d = extractKofiShopCode(clientOverride.pass_7d);
    override30d = extractKofiShopCode(clientOverride.pass_30d);
    overrideTestSingle = extractKofiShopCode(clientOverride.test_single || clientOverride.test);
    overrideTest7d = extractKofiShopCode(clientOverride.test_pass_7d || clientOverride.test_7d);
    overrideTest30d = extractKofiShopCode(clientOverride.test_pass_30d || clientOverride.test_30d);

    if (overrideSingle) cachedOwnerShopCodes.single = overrideSingle;
    if (override7d) cachedOwnerShopCodes.pass_7d = override7d;
    if (override30d) cachedOwnerShopCodes.pass_30d = override30d;
  }

  const prodSingle =
    extractKofiShopCode(process.env.KOFI_SHOP_SINGLE_CODE) ||
    overrideSingle ||
    cachedOwnerShopCodes.single ||
    '';
  const prod7d =
    extractKofiShopCode(process.env.KOFI_SHOP_7D_CODE) ||
    override7d ||
    cachedOwnerShopCodes.pass_7d ||
    '';
  const prod30d =
    extractKofiShopCode(process.env.KOFI_SHOP_30D_CODE) ||
    override30d ||
    cachedOwnerShopCodes.pass_30d ||
    '';

  const testSingle =
    extractKofiShopCode(process.env.KOFI_SHOP_TEST_SINGLE_CODE) ||
    extractKofiShopCode(process.env.KOFI_SHOP_TEST_CODE) ||
    overrideTestSingle ||
    '';
  const test7d =
    extractKofiShopCode(process.env.KOFI_SHOP_TEST_7D_CODE) ||
    overrideTest7d ||
    '';
  const test30d =
    extractKofiShopCode(process.env.KOFI_SHOP_TEST_30D_CODE) ||
    overrideTest30d ||
    '';

  const allowedSingle = Array.from(new Set([prodSingle, testSingle].filter(Boolean)));
  const allowed7d = Array.from(new Set([prod7d, test7d].filter(Boolean)));
  const allowed30d = Array.from(new Set([prod30d, test30d].filter(Boolean)));

  return {
    single: prodSingle || testSingle || '',
    pass_7d: prod7d || test7d || '',
    pass_30d: prod30d || test30d || '',
    test: testSingle || '',
    test_single: testSingle || '',
    test_pass_7d: test7d || '',
    test_pass_30d: test30d || '',
    allowedByTier: {
      single: allowedSingle,
      pass_7d: allowed7d,
      pass_30d: allowed30d,
    },
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

/**
 * Derives a deterministic, Firestore-valid `BLOOM-BGXX-XXXX` pending/paid order slot key
 * from a BayadGate `order_id` so `create-checkout`, `/api/webhooks/bayadgate`, and
 * `/api/payments/verify-and-issue` share state cleanly across serverless instances.
 */
export function deriveBayadgateOrderSlotKey(orderId) {
  const cleanOrderId = String(orderId || '').trim();
  const digest = crypto
    .createHash('sha256')
    .update(`sab_bayadgate_order_v1:${cleanOrderId}`)
    .digest();

  let p1 = 'BG';
  for (let i = 0; i < 2; i++) {
    p1 += PASS_ALPHABET[digest[i] % PASS_ALPHABET.length];
  }
  let p2 = '';
  for (let i = 2; i < 6; i++) {
    p2 += PASS_ALPHABET[digest[i] % PASS_ALPHABET.length];
  }
  return `BLOOM-${p1}-${p2}`;
}

export const BAYADGATE_PAYMENT_METHODS = ['GCASH', 'MAYA', 'GOTYME'];

export function getBayadgateConfig() {
  const merchantId = (process.env.BAYADGATE_MERCHANT_ID || '').trim();
  const secretKey = (process.env.BAYADGATE_SECRET_KEY || '').trim();
  const baseUrl = (process.env.BAYADGATE_API_BASE_URL || 'https://BayadGate.com')
    .trim()
    .replace(/\/+$/, '');
  return {
    merchantId,
    secretKey,
    baseUrl,
    configured: Boolean(merchantId && secretKey),
  };
}

export function normalizeBayadgatePaymentMethod(rawMethod) {
  const upper = String(rawMethod || '')
    .trim()
    .toUpperCase();
  if (upper === 'MAYA' || upper === 'PAYMAYA') return 'MAYA';
  if (upper === 'GOTYME') return 'GOTYME';
  return 'GCASH';
}

/**
 * BayadGate MD5 signature:
 * - Exclude empty values ('', null, undefined) and `sign`
 * - Sort keys ASCII ascending
 * - Join as k1=v1&k2=v2&key=SECRET_KEY
 * - Lowercase MD5 hex digest
 */
export function computeBayadgateSignature(params, secretKey) {
  if (!params || typeof params !== 'object') return '';
  const keys = Object.keys(params)
    .filter((k) => {
      if (k === 'sign') return false;
      const val = params[k];
      return val !== '' && val !== null && val !== undefined;
    })
    .sort();
  const queryStr = keys.map((k) => `${k}=${String(params[k])}`).join('&');
  const stringSignTemp = `${queryStr}&key=${String(secretKey || '')}`;
  return crypto.createHash('md5').update(stringSignTemp, 'utf8').digest('hex').toLowerCase();
}

export function verifyBayadgateSignature(params, secretKey) {
  const incomingSign = String(params?.sign || '').trim().toLowerCase();
  if (!incomingSign || !secretKey) return false;
  const expected = computeBayadgateSignature(params, secretKey);
  return timingSafeMatch(expected, incomingSign);
}

export function formatBayadgateAmountForTier(tier) {
  const minor = PRICING_CATALOG.PH?.[tier]?.amountMinor;
  if (!Number.isFinite(minor)) return '99.00';
  return (minor / 100).toFixed(2);
}

export function parseBayadgateAmountToMinor(rawAmount) {
  const str = String(rawAmount ?? '').trim().replace(/,/g, '');
  if (!str) return NaN;
  const parsed = Number.parseFloat(str);
  if (!Number.isFinite(parsed) || parsed <= 0) return NaN;
  return Math.round(parsed * 100);
}

/**
 * Derives a deterministic, Firestore-valid `BLOOM-SPXX-XXXX` pending/paid order slot key
 * from a SikatPay `order_id` so `create-checkout`, `/api/webhooks/sikatpay`, and
 * `/api/payments/verify-and-issue` share state cleanly across serverless instances.
 */
export function deriveSikatpayOrderSlotKey(orderId) {
  const cleanOrderId = String(orderId || '').trim();
  const digest = crypto
    .createHash('sha256')
    .update(`sab_sikatpay_order_v1:${cleanOrderId}`)
    .digest();

  let p1 = 'SP';
  for (let i = 0; i < 2; i++) {
    p1 += PASS_ALPHABET[digest[i] % PASS_ALPHABET.length];
  }
  let p2 = '';
  for (let i = 2; i < 6; i++) {
    p2 += PASS_ALPHABET[digest[i] % PASS_ALPHABET.length];
  }
  return `BLOOM-${p1}-${p2}`;
}

export function getSikatpayConfig() {
  const apiKey = (process.env.SIKATPAY_API_KEY || '').trim();
  const webhookSecret = (process.env.SIKATPAY_WEBHOOK_SECRET || '').trim();
  const baseUrl = (process.env.SIKATPAY_API_BASE_URL || 'https://payment.sikatpinoy.net/api/v1')
    .trim()
    .replace(/\/+$/, '');
  const isTestKey = apiKey.startsWith('mk_test_');
  return {
    apiKey,
    webhookSecret,
    baseUrl,
    isTestKey,
    configured: Boolean(apiKey),
  };
}

/**
 * SikatPay webhook HMAC-SHA256 verification:
 * Header `X-Signature: t=<unix seconds>,v1=<hex>`
 * Signed payload: `${t}.${rawBody}`
 * Rejects timestamps older/newer than 300s to prevent replay attacks.
 */
export function verifySikatpayWebhookSignature(
  rawBody,
  signatureHeader,
  webhookSecret,
  nowMs = Date.now()
) {
  if (!signatureHeader || !webhookSecret || rawBody === undefined || rawBody === null) {
    return false;
  }
  const parts = {};
  for (const segment of String(signatureHeader).split(',')) {
    const eqIdx = segment.indexOf('=');
    if (eqIdx <= 0) continue;
    const k = segment.slice(0, eqIdx).trim();
    const v = segment.slice(eqIdx + 1).trim();
    if (k && v) parts[k] = v;
  }
  const timestamp = Number(parts.t);
  const candidateSig = String(parts.v1 || '').toLowerCase();
  if (!Number.isFinite(timestamp) || !candidateSig) return false;
  if (Math.abs(nowMs / 1000 - timestamp) > 300) return false;

  const expectedSig = crypto
    .createHmac('sha256', webhookSecret)
    .update(`${parts.t}.${String(rawBody)}`, 'utf8')
    .digest('hex')
    .toLowerCase();

  return timingSafeMatch(expectedSig, candidateSig);
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

export const TESTER_SINGLE_DEVICE_SENTINEL = 'TESTER_SINGLE_DEVICE_LOCK';
export const REVOKED_PASS_SENTINEL = 'REVOKED_BY_OWNER';

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

export function generateTesterVoucherKeyCodeServer() {
  const base = generatePassKeyCode();
  return `BLOOM-TV${base.slice(8, 10)}-${base.slice(11, 15)}`;
}

export function isTesterVoucherPassServer(pass) {
  if (!pass) return false;
  return (
    pass.paymentProvider === 'tester_voucher' ||
    pass.secondaryDeviceHash === TESTER_SINGLE_DEVICE_SENTINEL ||
    normalizePassKey(pass.passKey).startsWith('BLOOM-TV')
  );
}

export function parseTesterVoucherMetaServer(boundBouquetCode) {
  const raw = String(boundBouquetCode || '').trim();
  if (raw.startsWith('TV:')) {
    const parts = raw.split(':');
    const parsedCap = Number.parseInt(parts[1] || '10', 10);
    const dailyCap =
      Number.isFinite(parsedCap) && parsedCap >= 1 && parsedCap <= 50 ? parsedCap : 10;
    const label = parts.slice(2).join(':').trim() || 'Tester Invite';
    return { dailyCap, label };
  }
  return {
    dailyCap: MAX_DAILY_PASS_BOUQUETS,
    label: raw || 'Tester Invite',
  };
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

export function verifyServerPaymentReference(record) {
  if (!record || typeof record.paymentReference !== 'string') return false;
  const ref = record.paymentReference.trim();
  const lastUnderscore = ref.lastIndexOf('_');
  if (lastUnderscore <= 0) return false;
  const prefix = ref.slice(0, lastUnderscore);
  const tag = ref.slice(lastUnderscore + 1);
  if (!/^[a-f0-9]{20}$/i.test(tag)) return false;
  const expected = signServerPaymentReference(
    prefix,
    record.passKey,
    record.tier,
    record.region,
    record.createdAt,
    record.expiresAt
  );
  return timingSafeMatch(expected, ref);
}

export function createSignedStudioPassServer(params) {
  const now = params.nowMs ?? Date.now();
  const createdAt = params.createdAt || new Date(now).toISOString();
  const isTester = Boolean(params.isTesterVoucher || params.paymentProvider === 'tester_voucher');
  const durationHours =
    typeof params.durationHours === 'number' && params.durationHours > 0
      ? params.durationHours
      : params.tier === 'pass_30d'
      ? 30 * 24
      : params.tier === 'pass_7d'
      ? 7 * 24
      : 48;
  const expiresAt =
    params.expiresAt || new Date(now + durationHours * 60 * 60 * 1000).toISOString();
  const retentionDays =
    typeof params.retentionDaysOverride === 'number' && params.retentionDaysOverride >= 1
      ? params.retentionDaysOverride
      : isTester
      ? 30
      : params.tier === 'pass_30d'
      ? 36500
      : 90;
  const isEternalKeepsake = isTester ? false : params.tier === 'pass_30d';
  const passKey = params.passKey
    ? normalizePassKey(params.passKey)
    : isTester
    ? generateTesterVoucherKeyCodeServer()
    : generatePassKeyCode();
  const activeSessionNonce = generateSessionNonce();
  const todayIso = createdAt.slice(0, 10);

  let boundCode = null;
  if (isTester) {
    const cleanCap =
      typeof params.testerDailyCap === 'number' && params.testerDailyCap >= 1
        ? Math.min(50, Math.round(params.testerDailyCap))
        : 10;
    const cleanLabel = String(params.testerLabel || params.boundBouquetCode || 'Tester Invite')
      .replace(/\|/g, ' ')
      .trim()
      .slice(0, 34);
    boundCode = `TV:${cleanCap}:${cleanLabel}`;
  } else if (params.boundBouquetCode !== undefined) {
    boundCode = params.boundBouquetCode;
  } else if (params.tier === 'single') {
    boundCode = params.boundBouquetCode || null;
  }

  const paymentReference = signServerPaymentReference(
    params.paymentReference || (isTester ? 'tv' : params.paymentProvider || 'chk'),
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
    secondaryDeviceHash:
      params.secondaryDeviceHash !== undefined
        ? params.secondaryDeviceHash
        : isTester
        ? TESTER_SINGLE_DEVICE_SENTINEL
        : null,
    activeSessionNonce,
    boundBouquetCode: boundCode,
    dailyUsageDate: todayIso,
    dailyUsageCount: 0,
    paymentProvider: isTester ? 'tester_voucher' : params.paymentProvider || 'verified_checkout',
    paymentReference,
  };

  const signature = computePassIntegritySignature(draft, CLIENT_SIGNATURE_SALT);
  return {
    ...draft,
    signature,
  };
}

export const REVOKED_VOUCHER_KEYS = new Set();

export function validateAndBindPassRedemptionServer(
  existingRecord,
  requestDeviceTokenHash,
  nowMs = Date.now()
) {
  if (!existingRecord || !isValidPassKeyFormat(existingRecord.passKey)) {
    return {
      valid: false,
      status: 'INVALID_FORMAT',
      message: 'Invalid Pass Key format. Expected BLOOM-XXXX-XXXX.',
    };
  }

  const normKey = normalizePassKey(existingRecord.passKey);
  if (
    normKey.startsWith('BLOOM-KS') ||
    normKey.startsWith('BLOOM-BG') ||
    normKey.startsWith('BLOOM-SP') ||
    normKey === 'BLOOM-KCFG-SHOP'
  ) {
    return {
      valid: false,
      status: 'INVALID_FORMAT',
      message: 'Please enter a valid Pass Key (e.g., BLOOM-7K4M-9P2X).',
    };
  }

  if (!verifyPassIntegritySignature(existingRecord) || !verifyServerPaymentReference(existingRecord)) {
    return {
      valid: false,
      status: 'TAMPERED_SIGNATURE',
      message: 'This Pass Key failed server security verification.',
    };
  }
  if (
    REVOKED_VOUCHER_KEYS.has(normKey) ||
    existingRecord.secondaryDeviceHash === REVOKED_PASS_SENTINEL ||
    existingRecord.primaryDeviceHash === REVOKED_PASS_SENTINEL
  ) {
    return {
      valid: false,
      status: 'REVOKED',
      message: 'This voucher key has been revoked by the studio owner.',
    };
  }

  const expiresMs = Date.parse(existingRecord.expiresAt);
  if (!Number.isFinite(expiresMs) || nowMs > expiresMs) {
    return {
      valid: false,
      status: 'EXPIRED',
      message: isTesterVoucherPassServer(existingRecord)
        ? 'This Tester Voucher has expired.'
        : 'This Studio Pass has expired.',
    };
  }

  const isTester = isTesterVoucherPassServer(existingRecord);
  let nextPrimary = existingRecord.primaryDeviceHash || '';
  let nextSecondary = existingRecord.secondaryDeviceHash || null;

  if (!nextPrimary) {
    nextPrimary = requestDeviceTokenHash;
    if (isTester) {
      nextSecondary = TESTER_SINGLE_DEVICE_SENTINEL;
    }
  } else if (requestDeviceTokenHash !== nextPrimary) {
    if (isTester || nextSecondary === TESTER_SINGLE_DEVICE_SENTINEL) {
      return {
        valid: false,
        status: 'DEVICE_LIMIT_EXCEEDED',
        message:
          'This Tester Voucher is locked to the first device that claimed it and cannot be shared or forwarded to others.',
      };
    }
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
    message: isTester
      ? 'Tester Voucher activated and locked to this device.'
      : 'Studio Pass verified and locked to your current session.',
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

  const normKey = normalizePassKey(pass.passKey);
  if (
    normKey.startsWith('BLOOM-KS') ||
    normKey.startsWith('BLOOM-BG') ||
    normKey.startsWith('BLOOM-SP') ||
    normKey === 'BLOOM-KCFG-SHOP'
  ) {
    return {
      valid: false,
      status: 'INVALID_FORMAT',
      message: 'No valid Studio Pass found.',
    };
  }

  if (!verifyPassIntegritySignature(pass) || !verifyServerPaymentReference(pass)) {
    return {
      valid: false,
      status: 'TAMPERED_SIGNATURE',
      message: 'Studio Pass cryptographic verification failed.',
    };
  }
  if (
    REVOKED_VOUCHER_KEYS.has(normKey) ||
    pass.secondaryDeviceHash === REVOKED_PASS_SENTINEL ||
    pass.primaryDeviceHash === REVOKED_PASS_SENTINEL
  ) {
    return {
      valid: false,
      status: 'REVOKED',
      message: 'Your Tester Voucher has been revoked.',
    };
  }

  const expiresMs = Date.parse(pass.expiresAt);
  if (!Number.isFinite(expiresMs) || now > expiresMs) {
    return {
      valid: false,
      status: 'EXPIRED',
      message: isTesterVoucherPassServer(pass)
        ? 'Your Tester Voucher has expired.'
        : 'Your Studio Pass has expired.',
    };
  }

  const isTester = isTesterVoucherPassServer(pass);
  if (isTester) {
    if (deviceTokenHash !== pass.primaryDeviceHash) {
      return {
        valid: false,
        status: 'DEVICE_LIMIT_EXCEEDED',
        message: 'This Tester Voucher is locked to another device and cannot be shared.',
      };
    }
  } else if (
    deviceTokenHash !== pass.primaryDeviceHash &&
    deviceTokenHash !== pass.secondaryDeviceHash
  ) {
    return {
      valid: false,
      status: 'DEVICE_LIMIT_EXCEEDED',
      message: 'This Pass Key belongs to another device.',
    };
  }

  if (
    pass.activeSessionNonce &&
    (!params.clientSessionNonce || params.clientSessionNonce !== pass.activeSessionNonce)
  ) {
    return {
      valid: false,
      status: 'SESSION_SUPERSEDED',
      message:
        'This Pass Key was activated on another device or browser. Only 1 active session is allowed at a time.',
    };
  }

  if (pass.tier === 'single' && !isTester) {
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
  const maxDailyAllowed = isTester
    ? parseTesterVoucherMetaServer(pass.boundBouquetCode).dailyCap
    : MAX_DAILY_PASS_BOUQUETS;

  if (params.incrementUsage && currentDailyCount >= maxDailyAllowed) {
    return {
      valid: false,
      status: 'DAILY_LIMIT_REACHED',
      message: `Fair-use limit reached (${maxDailyAllowed} bouquets/day). Your pass resets tomorrow!`,
    };
  }

  const nextBoundCode = isTester
    ? pass.boundBouquetCode
    : pass.tier === 'single'
    ? pass.boundBouquetCode || params.bouquetCode || null
    : null;

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

// ============================================================================
// STEALTH EPHEMERAL GATE SLUG, PIN RATE LIMITER & OWNER ANALYTICS LEDGER
// ============================================================================

const PIN_ATTEMPT_TRACKER = new Map();
const MAX_PIN_ATTEMPTS = 5;
const PIN_LOCKOUT_MS = 15 * 60 * 1000;
let cachedCustomOwnerPin = '';

export function createEncryptedAdminVisitSlug(deviceTokenHash, nowMs = Date.now()) {
  const cleanDevice = String(deviceTokenHash || 'anon').slice(0, 64);
  const nonce = crypto.randomBytes(6).toString('hex');
  const payload = {
    d: cleanDevice,
    n: nonce,
    exp: nowMs + 25 * 60 * 1000,
  };
  const b64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = crypto
    .createHmac('sha256', getServerSigningSalt())
    .update(`gk_visit_v1:${b64}`, 'utf8')
    .digest('hex')
    .slice(0, 24);
  return `gk-${b64}_${sig}`;
}

export function verifyEncryptedAdminVisitSlug(gateSlug, deviceTokenHash, nowMs = Date.now()) {
  const cleaned = String(gateSlug || '').replace(/^\/+/, '').trim();
  if (!cleaned.startsWith('gk-') || !cleaned.includes('_')) return false;
  const body = cleaned.slice(3);
  const lastUnderscore = body.lastIndexOf('_');
  if (lastUnderscore <= 0) return false;
  const b64 = body.slice(0, lastUnderscore);
  const sig = body.slice(lastUnderscore + 1);
  const expectedSig = crypto
    .createHmac('sha256', getServerSigningSalt())
    .update(`gk_visit_v1:${b64}`, 'utf8')
    .digest('hex')
    .slice(0, 24);
  if (!timingSafeMatch(expectedSig, sig)) return false;
  try {
    const decoded = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
    if (!decoded || typeof decoded.exp !== 'number' || nowMs > decoded.exp) return false;
    if (decoded.d !== String(deviceTokenHash || 'anon').slice(0, 64)) return false;
    return true;
  } catch {
    return false;
  }
}

export function createSignedAdminSessionToken(deviceTokenHash, nowMs = Date.now()) {
  return createSignedCheckoutToken({
    role: 'owner_admin',
    d: String(deviceTokenHash || '').slice(0, 64),
    exp: nowMs + 60 * 60 * 1000,
  });
}

export function verifySignedAdminSessionToken(tokenStr, deviceTokenHash, nowMs = Date.now()) {
  const decoded = verifySignedCheckoutToken(tokenStr);
  if (!decoded || decoded.role !== 'owner_admin') return false;
  if (typeof decoded.exp !== 'number' || nowMs > decoded.exp) return false;
  if (decoded.d !== String(deviceTokenHash || '').slice(0, 64)) return false;
  return true;
}

export function getActiveOwnerPinServer() {
  if (cachedCustomOwnerPin) return cachedCustomOwnerPin;
  const envPin = String(process.env.OWNER_ADMIN_PIN || '').trim();
  return envPin || '2026';
}

export function verifyOwnerPinWithRateLimit(candidatePin, deviceTokenHash, nowMs = Date.now()) {
  const key = String(deviceTokenHash || 'default_client').slice(0, 64);
  const record = PIN_ATTEMPT_TRACKER.get(key) || { count: 0, lockedUntilMs: 0 };

  if (record.lockedUntilMs > nowMs) {
    const minsLeft = Math.max(1, Math.ceil((record.lockedUntilMs - nowMs) / 60000));
    return {
      ok: false,
      locked: true,
      message: `Too many failed passphrase attempts. Please wait ${minsLeft}m before trying again.`,
    };
  }

  const cleanCandidate = String(candidatePin || '').trim();
  const activePin = getActiveOwnerPinServer();
  const hashA = crypto.createHash('sha256').update(`pin:${cleanCandidate}`).digest('hex');
  const hashB = crypto.createHash('sha256').update(`pin:${activePin}`).digest('hex');

  if (!cleanCandidate || !timingSafeMatch(hashA, hashB)) {
    const nextCount = record.count + 1;
    const lockedUntilMs = nextCount >= MAX_PIN_ATTEMPTS ? nowMs + PIN_LOCKOUT_MS : 0;
    PIN_ATTEMPT_TRACKER.set(key, { count: nextCount, lockedUntilMs });
    return {
      ok: false,
      locked: lockedUntilMs > nowMs,
      attemptsRemaining: Math.max(0, MAX_PIN_ATTEMPTS - nextCount),
      message:
        lockedUntilMs > nowMs
          ? 'Too many incorrect attempts. Passphrase gate locked for 15 minutes.'
          : 'That secret passphrase didn’t match. Try again.',
    };
  }

  PIN_ATTEMPT_TRACKER.delete(key);
  return { ok: true, locked: false };
}

function buildRolling14DaysServer(nowMs = Date.now()) {
  const list = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(nowMs - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    list.push({
      date: d,
      visits: 0,
      studioSessions: 0,
      bouquetsSealed: 0,
      recipientUnwraps: 0,
      passUnlocks: 0,
      revenueUsdCents: 0,
      revenuePhpCentavos: 0,
      paidSingle: 0,
      paid7d: 0,
      paid30d: 0,
    });
  }
  return list;
}

export const OWNER_ANALYTICS_STATE = {
  webVisits: 0,
  uniqueVisitors: 0,
  landingViews: 0,
  studioSessions: 0,
  showcaseViews: 0,
  bouquetsCreated: 0,
  coutureBouquetsCreated: 0,
  freeBouquetsCreated: 0,
  recipientUnwraps: 0,
  voiceNotesRecorded: 0,
  voicePlays: 0,
  reactionsSent: 0,
  repliesSent: 0,
  recipientToStudioClicks: 0,
  paywallOpens: 0,
  checkoutsStarted: 0,
  passesIssued: {
    single: 0,
    pass_7d: 0,
    pass_30d: 0,
    tester: 0,
  },
  revenueUsdCents: 0,
  revenuePhpCentavos: 0,
  incomePausedForTesting: false,
  phPaymentsDisabled: false,
  incomeResetAtMs: 0,
  incomeResetEpoch: 0,
  blockedShareAttempts: 0,
  blockedPinAttempts: 0,
  shareChannels: {
    short_link: 0,
    png_download: 0,
    qr_card: 0,
    email_surprise: 0,
    garland_pin: 0,
  },
  devices: {
    mobile: 0,
    tablet: 0,
    desktop: 0,
  },
  osBrowsers: {
    ios: 0,
    android: 0,
    macos: 0,
    windows: 0,
    other: 0,
  },
  regions: {
    INTL: 0,
    PH: 0,
  },
  referrers: {
    direct: 0,
    recipient_viral: 0,
    social: 0,
    qr_scan: 0,
    search: 0,
    tester_magic_link: 0,
  },
  flowers: {},
  wraps: {},
  ribbons: {},
  environments: {},
  voiceStyles: {},
  photoStyles: {},
  lockModes: {},
  paywallTriggers: {},
  dailySeries: buildRolling14DaysServer(),
  recentEvents: [],
  vercelAnalyticsConnected: true,
  updatedAt: new Date().toISOString(),
};

let incomePauseUpdatedAtMs = 0;
let phDisabledUpdatedAtMs = 0;
let lastCheckoutFlagHydrateMs = 0;

export const TESTER_VOUCHER_LEDGER = new Map();
export const PAID_PASS_LEDGER = new Map();
export const ISSUED_PASS_KEYS = new Set();

export function mergeRemoteOwnerVaultIntoMemory(remote) {
  if (!remote || typeof remote !== 'object') return;

  const localEpoch = Number(OWNER_ANALYTICS_STATE.incomeResetEpoch || 0);
  const remoteEpoch = Number(remote.incomeResetEpoch ?? remote.analytics?.incomeResetEpoch ?? 0);
  const remoteHasNewerReset = remoteEpoch > localEpoch;
  const localHasNewerReset = localEpoch > remoteEpoch;

  const remotePauseTs = Number(remote.incomePauseUpdatedAtMs || 0);
  if (remotePauseTs > incomePauseUpdatedAtMs) {
    incomePauseUpdatedAtMs = remotePauseTs;
    OWNER_ANALYTICS_STATE.incomePausedForTesting = Boolean(
      remote.incomePausedForTesting ?? remote.analytics?.incomePausedForTesting
    );
  } else if (incomePauseUpdatedAtMs === 0 && remote.analytics?.incomePausedForTesting !== undefined) {
    OWNER_ANALYTICS_STATE.incomePausedForTesting = Boolean(remote.analytics.incomePausedForTesting);
  }

  const remotePhDisabledTs = Number(remote.phDisabledUpdatedAtMs || 0);
  if (remotePhDisabledTs > phDisabledUpdatedAtMs) {
    phDisabledUpdatedAtMs = remotePhDisabledTs;
    OWNER_ANALYTICS_STATE.phPaymentsDisabled = Boolean(
      remote.phPaymentsDisabled ?? remote.analytics?.phPaymentsDisabled
    );
  } else if (phDisabledUpdatedAtMs === 0 && remote.analytics?.phPaymentsDisabled !== undefined) {
    OWNER_ANALYTICS_STATE.phPaymentsDisabled = Boolean(remote.analytics.phPaymentsDisabled);
  }

  if (remoteHasNewerReset) {
    OWNER_ANALYTICS_STATE.incomeResetEpoch = remoteEpoch;
    OWNER_ANALYTICS_STATE.incomeResetAtMs = Number(
      remote.incomeResetAtMs ?? remote.analytics?.incomeResetAtMs ?? 0
    );
    OWNER_ANALYTICS_STATE.revenueUsdCents = 0;
    OWNER_ANALYTICS_STATE.revenuePhpCentavos = 0;
    OWNER_ANALYTICS_STATE.passesIssued.single = 0;
    OWNER_ANALYTICS_STATE.passesIssued.pass_7d = 0;
    OWNER_ANALYTICS_STATE.passesIssued.pass_30d = 0;
    for (const day of OWNER_ANALYTICS_STATE.dailySeries) {
      day.revenueUsdCents = 0;
      day.revenuePhpCentavos = 0;
      day.paidSingle = 0;
      day.paid7d = 0;
      day.paid30d = 0;
    }
    PAID_PASS_LEDGER.clear();
  }

  if (typeof remote.customOwnerPin === 'string' && remote.customOwnerPin.trim().length >= 4) {
    if (!cachedCustomOwnerPin) {
      cachedCustomOwnerPin = remote.customOwnerPin.trim();
    }
  }

  if (Array.isArray(remote.revokedVoucherKeys)) {
    for (const k of remote.revokedVoucherKeys) {
      if (k) REVOKED_VOUCHER_KEYS.add(normalizePassKey(k));
    }
  }

  if (Array.isArray(remote.issuedPassKeys)) {
    for (const k of remote.issuedPassKeys) {
      if (k) ISSUED_PASS_KEYS.add(normalizePassKey(k));
    }
  }

  if (Array.isArray(remote.pinAttemptTracker)) {
    for (const entry of remote.pinAttemptTracker) {
      if (!Array.isArray(entry) || entry.length < 2) continue;
      const [k, v] = entry;
      if (!k || !v || typeof v !== 'object') continue;
      const existing = PIN_ATTEMPT_TRACKER.get(k);
      if (
        !existing ||
        Number(v.lockedUntilMs || 0) > Number(existing.lockedUntilMs || 0) ||
        Number(v.count || 0) > Number(existing.count || 0)
      ) {
        PIN_ATTEMPT_TRACKER.set(String(k), {
          count: Number(v.count || 0),
          lockedUntilMs: Number(v.lockedUntilMs || 0),
        });
      }
    }
  }

  if (Array.isArray(remote.testerVouchers)) {
    for (const rv of remote.testerVouchers) {
      if (!rv || typeof rv !== 'object' || !rv.passKey) continue;
      const normKey = normalizePassKey(rv.passKey);
      const localV = TESTER_VOUCHER_LEDGER.get(normKey);
      if (!localV) {
        TESTER_VOUCHER_LEDGER.set(normKey, { ...rv, passKey: normKey });
        if (rv.passRecord && !SERVER_PASS_STORE.has(normKey)) {
          SERVER_PASS_STORE.set(normKey, rv.passRecord);
        }
      } else {
        const isRevoked =
          localV.status === 'revoked' ||
          rv.status === 'revoked' ||
          REVOKED_VOUCHER_KEYS.has(normKey);
        const isClaimed = !isRevoked && (localV.status === 'claimed' || rv.status === 'claimed');
        const mergedPassRecord = localV.passRecord?.primaryDeviceHash
          ? localV.passRecord
          : rv.passRecord || localV.passRecord;
        const mergedItem = {
          ...rv,
          ...localV,
          passKey: normKey,
          status: isRevoked ? 'revoked' : isClaimed ? 'claimed' : localV.status || rv.status || 'unclaimed',
          claimedDeviceHash:
            localV.claimedDeviceHash ||
            rv.claimedDeviceHash ||
            mergedPassRecord?.primaryDeviceHash ||
            '',
          bouquetsCreated: Math.max(
            Number(localV.bouquetsCreated || 0),
            Number(rv.bouquetsCreated || 0)
          ),
          blockedAttempts: Math.max(
            Number(localV.blockedAttempts || 0),
            Number(rv.blockedAttempts || 0)
          ),
          passRecord: mergedPassRecord,
        };
        TESTER_VOUCHER_LEDGER.set(normKey, mergedItem);
        if (mergedPassRecord && !SERVER_PASS_STORE.has(normKey)) {
          SERVER_PASS_STORE.set(normKey, mergedPassRecord);
        }
      }
    }
  }

  if (!localHasNewerReset && Array.isArray(remote.paidPasses)) {
    for (const rp of remote.paidPasses) {
      if (!rp || typeof rp !== 'object' || !rp.passKey) continue;
      const normKey = normalizePassKey(rp.passKey);
      const localP = PAID_PASS_LEDGER.get(normKey);
      if (!localP) {
        PAID_PASS_LEDGER.set(normKey, { ...rp, passKey: normKey });
        if (rp.passRecord && !SERVER_PASS_STORE.has(normKey)) {
          SERVER_PASS_STORE.set(normKey, rp.passRecord);
        }
      } else {
        const isRevoked =
          localP.status === 'revoked' ||
          rp.status === 'revoked' ||
          REVOKED_VOUCHER_KEYS.has(normKey);
        const isClaimed = !isRevoked && (localP.status === 'claimed' || rp.status === 'claimed');
        const mergedPassRecord = localP.passRecord?.primaryDeviceHash
          ? localP.passRecord
          : rp.passRecord || localP.passRecord;
        const mergedItem = {
          ...rp,
          ...localP,
          passKey: normKey,
          status: isRevoked
            ? 'revoked'
            : isClaimed
            ? 'claimed'
            : localP.status || rp.status || 'unclaimed',
          claimedDeviceHash:
            localP.claimedDeviceHash ||
            rp.claimedDeviceHash ||
            mergedPassRecord?.primaryDeviceHash ||
            '',
          boundBouquetCode:
            localP.boundBouquetCode ||
            rp.boundBouquetCode ||
            mergedPassRecord?.boundBouquetCode ||
            null,
          isTest: Boolean(localP.isTest || rp.isTest),
          archivedFromIncome: Boolean(localP.archivedFromIncome || rp.archivedFromIncome),
          bouquetsCreated: Math.max(
            Number(localP.bouquetsCreated || 0),
            Number(rp.bouquetsCreated || 0)
          ),
          blockedAttempts: Math.max(
            Number(localP.blockedAttempts || 0),
            Number(rp.blockedAttempts || 0)
          ),
          passRecord: mergedPassRecord,
        };
        PAID_PASS_LEDGER.set(normKey, mergedItem);
        if (mergedPassRecord && !SERVER_PASS_STORE.has(normKey)) {
          SERVER_PASS_STORE.set(normKey, mergedPassRecord);
        }
      }
    }
  }

  const ra = remote.analytics;
  if (ra && typeof ra === 'object') {
    const scalarFields = [
      'webVisits',
      'uniqueVisitors',
      'landingViews',
      'studioSessions',
      'showcaseViews',
      'bouquetsCreated',
      'coutureBouquetsCreated',
      'freeBouquetsCreated',
      'recipientUnwraps',
      'voiceNotesRecorded',
      'voicePlays',
      'reactionsSent',
      'repliesSent',
      'recipientToStudioClicks',
      'paywallOpens',
      'checkoutsStarted',
      'blockedShareAttempts',
      'blockedPinAttempts',
    ];
    for (const f of scalarFields) {
      OWNER_ANALYTICS_STATE[f] = Math.max(
        Number(OWNER_ANALYTICS_STATE[f] || 0),
        Number(ra[f] || 0)
      );
    }
    if (!localHasNewerReset) {
      for (const revField of ['revenueUsdCents', 'revenuePhpCentavos']) {
        OWNER_ANALYTICS_STATE[revField] = remoteHasNewerReset
          ? Number(ra[revField] || 0)
          : Math.max(Number(OWNER_ANALYTICS_STATE[revField] || 0), Number(ra[revField] || 0));
      }
    }

    const nestedFixedMaps = [
      'passesIssued',
      'shareChannels',
      'devices',
      'osBrowsers',
      'regions',
      'referrers',
    ];
    for (const mapKey of nestedFixedMaps) {
      if (ra[mapKey] && typeof ra[mapKey] === 'object') {
        for (const [k, val] of Object.entries(ra[mapKey])) {
          if (k in OWNER_ANALYTICS_STATE[mapKey]) {
            OWNER_ANALYTICS_STATE[mapKey][k] = Math.max(
              Number(OWNER_ANALYTICS_STATE[mapKey][k] || 0),
              Number(val || 0)
            );
          }
        }
      }
    }

    const dynamicMaps = [
      'flowers',
      'wraps',
      'ribbons',
      'environments',
      'voiceStyles',
      'photoStyles',
      'lockModes',
      'paywallTriggers',
    ];
    for (const mapKey of dynamicMaps) {
      if (ra[mapKey] && typeof ra[mapKey] === 'object') {
        for (const [k, val] of Object.entries(ra[mapKey])) {
          const clean = String(k).trim().slice(0, 48);
          if (!clean) continue;
          OWNER_ANALYTICS_STATE[mapKey][clean] = Math.max(
            Number(OWNER_ANALYTICS_STATE[mapKey][clean] || 0),
            Number(val || 0)
          );
        }
      }
    }

    if (Array.isArray(ra.dailySeries)) {
      const byDate = new Map();
      for (const pt of buildRolling14DaysServer()) {
        byDate.set(pt.date, { ...pt });
      }
      const mergePoint = (cur, pt) => ({
        date: pt.date,
        visits: Math.max(cur.visits, Number(pt.visits || 0)),
        studioSessions: Math.max(cur.studioSessions, Number(pt.studioSessions || 0)),
        bouquetsSealed: Math.max(cur.bouquetsSealed, Number(pt.bouquetsSealed || 0)),
        recipientUnwraps: Math.max(cur.recipientUnwraps, Number(pt.recipientUnwraps || 0)),
        passUnlocks: Math.max(cur.passUnlocks, Number(pt.passUnlocks || 0)),
        revenueUsdCents: Math.max(cur.revenueUsdCents || 0, Number(pt.revenueUsdCents || 0)),
        revenuePhpCentavos: Math.max(cur.revenuePhpCentavos || 0, Number(pt.revenuePhpCentavos || 0)),
        paidSingle: Math.max(cur.paidSingle || 0, Number(pt.paidSingle || 0)),
        paid7d: Math.max(cur.paid7d || 0, Number(pt.paid7d || 0)),
        paid30d: Math.max(cur.paid30d || 0, Number(pt.paid30d || 0)),
      });
      const blankPoint = (date) => ({
        date,
        visits: 0,
        studioSessions: 0,
        bouquetsSealed: 0,
        recipientUnwraps: 0,
        passUnlocks: 0,
        revenueUsdCents: 0,
        revenuePhpCentavos: 0,
        paidSingle: 0,
        paid7d: 0,
        paid30d: 0,
      });
      for (const pt of OWNER_ANALYTICS_STATE.dailySeries) {
        if (!pt || !pt.date) continue;
        const cur = byDate.get(pt.date) || blankPoint(pt.date);
        byDate.set(pt.date, mergePoint(cur, pt));
      }
      for (const pt of ra.dailySeries) {
        if (!pt || !pt.date) continue;
        const cur = byDate.get(pt.date) || blankPoint(pt.date);
        byDate.set(pt.date, mergePoint(cur, pt));
      }
      OWNER_ANALYTICS_STATE.dailySeries = Array.from(byDate.values())
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-14);
    }

    if (Array.isArray(ra.recentEvents)) {
      const seenIds = new Set();
      const combinedEvents = [];
      for (const ev of [...OWNER_ANALYTICS_STATE.recentEvents, ...ra.recentEvents]) {
        if (!ev || !ev.id || seenIds.has(ev.id)) continue;
        seenIds.add(ev.id);
        combinedEvents.push(ev);
      }
      combinedEvents.sort((a, b) => Date.parse(b.ts || '') - Date.parse(a.ts || ''));
      OWNER_ANALYTICS_STATE.recentEvents = combinedEvents.slice(0, 40);
    }
  }
}

export async function hydratePersistentOwnerVaultServer() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2800);
    const resp = await fetch(
      `${FIRESTORE_SHARED_BOUQUETS_URL}/${encodeURIComponent(OWNER_VAULT_DOC_CODE)}`,
      { method: 'GET', signal: controller.signal }
    );
    clearTimeout(timer);
    if (!resp.ok) return false;
    const docJson = await resp.json();
    const rawVaultJson = docJson?.fields?.voiceAudioDataUrl?.stringValue;
    if (!rawVaultJson) return false;
    const parsed = JSON.parse(rawVaultJson);
    mergeRemoteOwnerVaultIntoMemory(parsed);
    return true;
  } catch {
    return false;
  }
}

export async function savePersistentOwnerVaultServer() {
  try {
    const nowMs = Date.now();
    const pinEntries = [];
    for (const [k, v] of PIN_ATTEMPT_TRACKER.entries()) {
      if (v && (v.count > 0 || v.lockedUntilMs > nowMs)) {
        pinEntries.push([k, v]);
      }
    }

    const vaultPayload = {
      v: 1,
      updatedAt: new Date(nowMs).toISOString(),
      incomeResetEpoch: Number(OWNER_ANALYTICS_STATE.incomeResetEpoch || 0),
      incomeResetAtMs: Number(OWNER_ANALYTICS_STATE.incomeResetAtMs || 0),
      incomePausedForTesting: Boolean(OWNER_ANALYTICS_STATE.incomePausedForTesting),
      incomePauseUpdatedAtMs,
      phPaymentsDisabled: Boolean(OWNER_ANALYTICS_STATE.phPaymentsDisabled),
      phDisabledUpdatedAtMs,
      customOwnerPin: cachedCustomOwnerPin || '',
      revokedVoucherKeys: Array.from(REVOKED_VOUCHER_KEYS).slice(0, 500),
      issuedPassKeys: Array.from(ISSUED_PASS_KEYS).slice(-1000),
      pinAttemptTracker: pinEntries.slice(0, 200),
      testerVouchers: Array.from(TESTER_VOUCHER_LEDGER.values()).slice(0, 250),
      paidPasses: Array.from(PAID_PASS_LEDGER.values()).slice(0, 350),
      analytics: OWNER_ANALYTICS_STATE,
    };

    const jsonStr = JSON.stringify(vaultPayload);
    if (jsonStr.length > 880_000) return false;

    const fields = {
      code: { stringValue: OWNER_VAULT_DOC_CODE },
      payload: { stringValue: OWNER_VAULT_IMMUTABLE_PAYLOAD },
      createdAt: { stringValue: OWNER_VAULT_IMMUTABLE_CREATED_AT },
      voiceAudioDataUrl: { stringValue: jsonStr },
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const resp = await fetch(
      `${FIRESTORE_SHARED_BOUQUETS_URL}/${encodeURIComponent(OWNER_VAULT_DOC_CODE)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
        signal: controller.signal,
      }
    );
    clearTimeout(timer);
    return resp.ok;
  } catch {
    return false;
  }
}

function resolvePaidPassCatalogMeta(tier, region) {
  const cleanRegion = region === 'PH' ? 'PH' : 'INTL';
  const cleanTier = isValidTier(tier) ? tier : 'pass_7d';
  const entry = PRICING_CATALOG[cleanRegion]?.[cleanTier];
  if (entry) {
    return {
      region: cleanRegion,
      tier: cleanTier,
      currency: entry.currency,
      amountMinor: entry.amountMinor,
    };
  }
  return {
    region: cleanRegion,
    tier: cleanTier,
    currency: cleanRegion === 'PH' ? 'PHP' : 'USD',
    amountMinor: cleanRegion === 'PH' ? 9900 : 499,
  };
}

export function isPaidPassCountableForRevenue(normKey, ledgerItem, passRecord) {
  if (
    !normKey ||
    normKey === 'BLOOM-KCFG-SHOP' ||
    normKey.startsWith('BLOOM-KS') ||
    normKey.startsWith('BLOOM-BG') ||
    normKey.startsWith('BLOOM-SP')
  ) {
    return false;
  }
  if (
    REVOKED_VOUCHER_KEYS.has(normKey) ||
    ledgerItem?.status === 'revoked' ||
    passRecord?.secondaryDeviceHash === REVOKED_PASS_SENTINEL ||
    passRecord?.primaryDeviceHash === REVOKED_PASS_SENTINEL
  ) {
    return false;
  }
  if (
    ledgerItem?.isTest === true ||
    ledgerItem?.channel === 'sikatpay_test' ||
    String(passRecord?.paymentReference || '').startsWith('sptest_')
  ) {
    return false;
  }
  if (ledgerItem?.archivedFromIncome === true) {
    return false;
  }
  const resetAtMs = Number(OWNER_ANALYTICS_STATE.incomeResetAtMs || 0);
  if (resetAtMs > 0) {
    const createdMs = Date.parse(ledgerItem?.createdAt || passRecord?.createdAt || '');
    if (Number.isFinite(createdMs) && createdMs < resetAtMs) {
      return false;
    }
  }
  return true;
}

export function recomputePaidRevenueFromLedgerServer() {
  let singleCount = 0;
  let pass7dCount = 0;
  let pass30dCount = 0;
  let usdCents = 0;
  let phpCentavos = 0;

  const dailyRev = new Map();
  for (const pt of OWNER_ANALYTICS_STATE.dailySeries) {
    pt.revenueUsdCents = 0;
    pt.revenuePhpCentavos = 0;
    pt.paidSingle = 0;
    pt.paid7d = 0;
    pt.paid30d = 0;
    pt.passUnlocks = 0;
    dailyRev.set(pt.date, pt);
  }

  for (const tv of TESTER_VOUCHER_LEDGER.values()) {
    if (!tv || tv.status === 'revoked' || REVOKED_VOUCHER_KEYS.has(tv.passKey)) continue;
    const dayKey = String(tv.createdAt || '').slice(0, 10);
    const bucket = dailyRev.get(dayKey);
    if (bucket) bucket.passUnlocks += 1;
  }

  const seenKeys = new Set();
  const processEntry = (normKey, ledgerItem, passRecord) => {
    if (seenKeys.has(normKey)) return;
    seenKeys.add(normKey);

    const record = passRecord || ledgerItem?.passRecord;
    if (record && isTesterVoucherPassServer(record)) return;
    if (!isPaidPassCountableForRevenue(normKey, ledgerItem, record)) return;

    const rawTier = ledgerItem?.tier || record?.tier;
    const rawRegion = ledgerItem?.region || record?.region;
    const { tier, region, amountMinor } = resolvePaidPassCatalogMeta(rawTier, rawRegion);
    const finalAmount =
      typeof ledgerItem?.amountMinor === 'number' && ledgerItem.amountMinor > 0
        ? ledgerItem.amountMinor
        : amountMinor;

    const dayKey = String(ledgerItem?.createdAt || record?.createdAt || '').slice(0, 10);
    const bucket = dailyRev.get(dayKey);

    if (tier === 'single') {
      singleCount += 1;
      if (bucket) bucket.paidSingle += 1;
    } else if (tier === 'pass_7d') {
      pass7dCount += 1;
      if (bucket) bucket.paid7d += 1;
    } else if (tier === 'pass_30d') {
      pass30dCount += 1;
      if (bucket) bucket.paid30d += 1;
    }

    if (region === 'PH') {
      phpCentavos += finalAmount;
      if (bucket) bucket.revenuePhpCentavos += finalAmount;
    } else {
      usdCents += finalAmount;
      if (bucket) bucket.revenueUsdCents += finalAmount;
    }
    if (bucket) bucket.passUnlocks += 1;
  };

  for (const [key, item] of PAID_PASS_LEDGER.entries()) {
    const normKey = normalizePassKey(key);
    processEntry(normKey, item, SERVER_PASS_STORE.get(normKey) || item.passRecord);
  }

  for (const [key, pass] of SERVER_PASS_STORE.entries()) {
    const normKey = normalizePassKey(key);
    if (seenKeys.has(normKey) || PAID_PASS_LEDGER.has(normKey)) continue;
    processEntry(normKey, null, pass);
  }

  OWNER_ANALYTICS_STATE.passesIssued.single = singleCount;
  OWNER_ANALYTICS_STATE.passesIssued.pass_7d = pass7dCount;
  OWNER_ANALYTICS_STATE.passesIssued.pass_30d = pass30dCount;
  OWNER_ANALYTICS_STATE.revenueUsdCents = usdCents;
  OWNER_ANALYTICS_STATE.revenuePhpCentavos = phpCentavos;
  OWNER_ANALYTICS_STATE.updatedAt = new Date().toISOString();
}

export function toggleIncomePauseServer(paused, nowMs = Date.now()) {
  OWNER_ANALYTICS_STATE.incomePausedForTesting =
    typeof paused === 'boolean' ? paused : !OWNER_ANALYTICS_STATE.incomePausedForTesting;
  incomePauseUpdatedAtMs = Math.max(nowMs, incomePauseUpdatedAtMs + 1);
  pushAnalyticsEventServer(
    'monetization',
    OWNER_ANALYTICS_STATE.incomePausedForTesting ? 'income_paused' : 'income_resumed',
    OWNER_ANALYTICS_STATE.incomePausedForTesting
      ? 'Owner paused live income counting for webhook testing (test keys still issue)'
      : 'Owner resumed live income counting for production payments',
    'desktop',
    'INTL'
  );
  return OWNER_ANALYTICS_STATE.incomePausedForTesting;
}

export function isPhPaymentsDisabledServer() {
  const envVal = String(process.env.DISABLE_PH_PAYMENTS || '').trim().toLowerCase();
  if (envVal === 'true' || envVal === '1') return true;
  return Boolean(OWNER_ANALYTICS_STATE.phPaymentsDisabled);
}

export function togglePhPaymentsDisabledServer(disabled, nowMs = Date.now()) {
  OWNER_ANALYTICS_STATE.phPaymentsDisabled =
    typeof disabled === 'boolean' ? disabled : !OWNER_ANALYTICS_STATE.phPaymentsDisabled;
  phDisabledUpdatedAtMs = Math.max(nowMs, phDisabledUpdatedAtMs + 1);
  lastCheckoutFlagHydrateMs = Date.now();
  pushAnalyticsEventServer(
    'monetization',
    OWNER_ANALYTICS_STATE.phPaymentsDisabled ? 'ph_payments_disabled' : 'ph_payments_enabled',
    OWNER_ANALYTICS_STATE.phPaymentsDisabled
      ? 'Owner disabled PH payments (all checkouts routed to USD / Ko-fi)'
      : 'Owner enabled PH payments for eligible PH visitors',
    'desktop',
    'PH'
  );
  return OWNER_ANALYTICS_STATE.phPaymentsDisabled;
}

async function ensureCheckoutFlagsHydratedServer() {
  if (process.env.NODE_TEST_CONTEXT) return false;
  const nowMs = Date.now();
  if (nowMs - lastCheckoutFlagHydrateMs < 15_000) return false;
  lastCheckoutFlagHydrateMs = nowMs;
  return hydratePersistentOwnerVaultServer();
}

export function clearTestAndRevokedPaidKeysServer() {
  let removedCount = 0;
  for (const [key, item] of PAID_PASS_LEDGER.entries()) {
    const isRevoked =
      item.status === 'revoked' ||
      REVOKED_VOUCHER_KEYS.has(key) ||
      item.passRecord?.secondaryDeviceHash === REVOKED_PASS_SENTINEL;
    const isTest =
      Boolean(item.isTest) ||
      item.channel === 'sikatpay_test' ||
      String(item.passRecord?.paymentReference || '').startsWith('sptest_');
    if (isRevoked || isTest) {
      PAID_PASS_LEDGER.delete(key);
      ISSUED_PASS_KEYS.delete(key);
      removedCount += 1;
    }
  }
  recomputePaidRevenueFromLedgerServer();
  return removedCount;
}

export function resetOwnerIncomeServer({ purgeTestAndRevoked = true, nowMs = Date.now() } = {}) {
  OWNER_ANALYTICS_STATE.incomeResetEpoch = Number(OWNER_ANALYTICS_STATE.incomeResetEpoch || 0) + 1;
  OWNER_ANALYTICS_STATE.incomeResetAtMs = nowMs;

  for (const [key, item] of PAID_PASS_LEDGER.entries()) {
    const isRevoked =
      item.status === 'revoked' ||
      REVOKED_VOUCHER_KEYS.has(key) ||
      item.passRecord?.secondaryDeviceHash === REVOKED_PASS_SENTINEL;
    const isTest =
      Boolean(item.isTest) ||
      item.channel === 'sikatpay_test' ||
      String(item.passRecord?.paymentReference || '').startsWith('sptest_');

    if (purgeTestAndRevoked && (isRevoked || isTest)) {
      PAID_PASS_LEDGER.delete(key);
      ISSUED_PASS_KEYS.delete(key);
    } else {
      PAID_PASS_LEDGER.set(key, {
        ...item,
        archivedFromIncome: true,
      });
    }
  }

  recomputePaidRevenueFromLedgerServer();
  pushAnalyticsEventServer(
    'monetization',
    'income_reset',
    'Owner reset dashboard income to $0.00 (excluded prior test/revoked payments)',
    'desktop',
    'INTL'
  );
  return OWNER_ANALYTICS_STATE;
}

export function recordPaidPassIssuanceServer(pass, options = {}) {
  if (!pass || !pass.passKey || isTesterVoucherPassServer(pass)) return false;
  const normKey = normalizePassKey(pass.passKey);
  if (
    normKey === 'BLOOM-KCFG-SHOP' ||
    normKey.startsWith('BLOOM-KS') ||
    normKey.startsWith('BLOOM-BG') ||
    normKey.startsWith('BLOOM-SP')
  ) {
    return false;
  }
  if (ISSUED_PASS_KEYS.has(normKey)) return false;

  ISSUED_PASS_KEYS.add(normKey);
  const { tier, region, currency, amountMinor } = resolvePaidPassCatalogMeta(pass.tier, pass.region);
  const isTestIssuance = Boolean(
    options.isTest ||
      OWNER_ANALYTICS_STATE.incomePausedForTesting ||
      String(pass.paymentReference || '').startsWith('sptest_')
  );

  if (!PAID_PASS_LEDGER.has(normKey)) {
    const channel =
      typeof options.channel === 'string' && options.channel
        ? options.channel
        : pass.paymentProvider === 'sikatpay'
        ? 'sikatpay'
        : pass.paymentProvider === 'bayadgate'
        ? 'bayadgate'
        : pass.paymentProvider === 'paymongo'
        ? 'paymongo'
        : pass.paymentProvider === 'kofi'
        ? 'kofi'
        : 'manual_gcash';
    const label =
      String(options.label || '')
        .replace(/[|:]/g, ' ')
        .trim()
        .slice(0, 32) ||
      (pass.paymentProvider === 'owner_manual'
        ? 'Direct Buyer'
        : isTestIssuance
        ? `${pass.paymentProvider || 'checkout'} Test`
        : `${pass.paymentProvider || 'checkout'} Buyer`);
    PAID_PASS_LEDGER.set(normKey, {
      passKey: normKey,
      label,
      tier,
      region,
      channel,
      amountMinor,
      currency,
      retentionDays: pass.retentionDays || (tier === 'pass_30d' ? 36500 : 90),
      isEternalKeepsake: Boolean(pass.isEternalKeepsake),
      createdAt: pass.createdAt,
      expiresAt: pass.expiresAt,
      status: pass.primaryDeviceHash ? 'claimed' : 'unclaimed',
      claimedDeviceHash: pass.primaryDeviceHash || '',
      bouquetsCreated: pass.dailyUsageCount || 0,
      blockedAttempts: 0,
      boundBouquetCode: pass.boundBouquetCode || null,
      isTest: isTestIssuance,
      passRecord: pass,
    });
  }

  recomputePaidRevenueFromLedgerServer();

  const priceDisplay =
    currency === 'PHP' ? `₱${(amountMinor / 100).toFixed(0)}` : `$${(amountMinor / 100).toFixed(2)}`;
  const eventSummary =
    options.summary ||
    (isTestIssuance
      ? `[TEST] Issued ${tier} Studio Pass (${region} ${priceDisplay} excluded from live income)`
      : `Issued ${tier} Studio Pass (${region} ${priceDisplay})`);
  pushAnalyticsEventServer('monetization', 'pass_issued', eventSummary, 'mobile', region);
  return true;
}

async function syncRealAnalyticsSnapshotServer() {
  // 0. Hydrate persistent Owner Analytics, Tester Vouchers, Revenue & Custom PIN from Firestore
  await hydratePersistentOwnerVaultServer();

  // 1. Reconcile real issued Studio Passes & Tester Vouchers, strictly excluding revoked & test passes
  let testerCount = TESTER_VOUCHER_LEDGER.size;

  for (const [key, pass] of SERVER_PASS_STORE.entries()) {
    if (
      !pass ||
      key === 'BLOOM-KCFG-SHOP' ||
      key.startsWith('BLOOM-KS') ||
      key.startsWith('BLOOM-BG') ||
      key.startsWith('BLOOM-SP')
    )
      continue;
    if (isTesterVoucherPassServer(pass)) {
      if (!TESTER_VOUCHER_LEDGER.has(key)) testerCount += 1;
      continue;
    }
    ISSUED_PASS_KEYS.add(normalizePassKey(key));
  }

  OWNER_ANALYTICS_STATE.passesIssued.tester = Math.max(
    OWNER_ANALYTICS_STATE.passesIssued.tester,
    testerCount
  );
  recomputePaidRevenueFromLedgerServer();

  // 2. Sync real global counters from Firestore studio_stats/global (stripping any legacy 1284/3910 seed offset)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const statsUrl = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/${FIRESTORE_DB_ID}/documents/studio_stats/global`;
    const resp = await fetch(statsUrl, { method: 'GET', signal: controller.signal });
    clearTimeout(timer);
    if (resp.ok) {
      const docJson = await resp.json();
      const f = docJson?.fields;
      if (f) {
        const rawCreated = Number(f.bouquetsCreated?.integerValue || 0);
        const rawOpened = Number(f.bouquetsOpened?.integerValue || 0);
        const rawVoice = Number(f.voiceNotesRecorded?.integerValue || 0);
        const rawReactions = Number(f.reactionsSent?.integerValue || 0);

        const realCreated = rawCreated >= 1284 ? rawCreated - 1284 : rawCreated;
        const realOpened = rawOpened >= 3910 ? rawOpened - 3910 : rawOpened;
        const realVoice = rawVoice >= 742 ? rawVoice - 742 : rawVoice;
        const realReactions = rawReactions >= 964 ? rawReactions - 964 : rawReactions;

        OWNER_ANALYTICS_STATE.bouquetsCreated = Math.max(
          OWNER_ANALYTICS_STATE.bouquetsCreated,
          realCreated
        );
        OWNER_ANALYTICS_STATE.recipientUnwraps = Math.max(
          OWNER_ANALYTICS_STATE.recipientUnwraps,
          realOpened
        );
        OWNER_ANALYTICS_STATE.voiceNotesRecorded = Math.max(
          OWNER_ANALYTICS_STATE.voiceNotesRecorded,
          realVoice
        );
        OWNER_ANALYTICS_STATE.reactionsSent = Math.max(
          OWNER_ANALYTICS_STATE.reactionsSent,
          realReactions
        );
      }
    }
  } catch {
    // Keep in-memory telemetry state if offline
  }

  return OWNER_ANALYTICS_STATE;
}

function pushAnalyticsEventServer(category, type, summary, device = 'mobile', region = 'INTL') {
  const nowIso = new Date().toISOString();
  OWNER_ANALYTICS_STATE.recentEvents.unshift({
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ts: nowIso,
    category,
    type,
    summary: String(summary || '').slice(0, 140),
    device: device === 'tablet' || device === 'desktop' ? device : 'mobile',
    region: region === 'PH' ? 'PH' : 'INTL',
  });
  if (OWNER_ANALYTICS_STATE.recentEvents.length > 40) {
    OWNER_ANALYTICS_STATE.recentEvents = OWNER_ANALYTICS_STATE.recentEvents.slice(0, 40);
  }
  OWNER_ANALYTICS_STATE.updatedAt = nowIso;
}

function getTodayDailyBucketServer() {
  const todayIso = new Date().toISOString().slice(0, 10);
  let bucket = OWNER_ANALYTICS_STATE.dailySeries.find((d) => d.date === todayIso);
  if (!bucket) {
    bucket = {
      date: todayIso,
      visits: 0,
      studioSessions: 0,
      bouquetsSealed: 0,
      recipientUnwraps: 0,
      passUnlocks: 0,
      revenueUsdCents: 0,
      revenuePhpCentavos: 0,
      paidSingle: 0,
      paid7d: 0,
      paid30d: 0,
    };
    OWNER_ANALYTICS_STATE.dailySeries.push(bucket);
    if (OWNER_ANALYTICS_STATE.dailySeries.length > 14) {
      OWNER_ANALYTICS_STATE.dailySeries = OWNER_ANALYTICS_STATE.dailySeries.slice(-14);
    }
  }
  return bucket;
}

export function applyServerTelemetryEvent(event) {
  if (!event || typeof event !== 'object') return;
  const dev =
    event.device === 'mobile' || event.device === 'tablet' || event.device === 'desktop'
      ? event.device
      : 'mobile';
  const os =
    event.os === 'ios' ||
    event.os === 'android' ||
    event.os === 'macos' ||
    event.os === 'windows' ||
    event.os === 'other'
      ? event.os
      : 'other';
  const reg = event.region === 'PH' ? 'PH' : 'INTL';
  const bucket = getTodayDailyBucketServer();
  const incKey = (obj, k) => {
    if (!k) return;
    const clean = String(k).trim().slice(0, 48);
    if (!clean) return;
    obj[clean] = (obj[clean] || 0) + 1;
  };

  switch (event.eventType) {
    case 'web_visit':
      OWNER_ANALYTICS_STATE.webVisits += 1;
      if (event.isUniqueVisitor) OWNER_ANALYTICS_STATE.uniqueVisitors += 1;
      OWNER_ANALYTICS_STATE.devices[dev] = (OWNER_ANALYTICS_STATE.devices[dev] || 0) + 1;
      OWNER_ANALYTICS_STATE.osBrowsers[os] = (OWNER_ANALYTICS_STATE.osBrowsers[os] || 0) + 1;
      OWNER_ANALYTICS_STATE.regions[reg] = (OWNER_ANALYTICS_STATE.regions[reg] || 0) + 1;
      if (event.referrer && event.referrer in OWNER_ANALYTICS_STATE.referrers) {
        OWNER_ANALYTICS_STATE.referrers[event.referrer] += 1;
      }
      bucket.visits += 1;
      break;
    case 'landing_view':
      OWNER_ANALYTICS_STATE.landingViews += 1;
      break;
    case 'studio_session':
      OWNER_ANALYTICS_STATE.studioSessions += 1;
      bucket.studioSessions += 1;
      break;
    case 'showcase_view':
      OWNER_ANALYTICS_STATE.showcaseViews += 1;
      break;
    case 'bouquet_sealed':
      OWNER_ANALYTICS_STATE.bouquetsCreated += 1;
      bucket.bouquetsSealed += 1;
      if (event.isCouture) {
        OWNER_ANALYTICS_STATE.coutureBouquetsCreated += 1;
      } else {
        OWNER_ANALYTICS_STATE.freeBouquetsCreated += 1;
      }
      if (event.hasVoice) {
        OWNER_ANALYTICS_STATE.voiceNotesRecorded += 1;
        incKey(OWNER_ANALYTICS_STATE.voiceStyles, event.voiceStyle);
      }
      if (Array.isArray(event.flowers)) {
        for (const f of event.flowers) incKey(OWNER_ANALYTICS_STATE.flowers, f);
      }
      if (Array.isArray(event.photoStyles)) {
        for (const p of event.photoStyles) incKey(OWNER_ANALYTICS_STATE.photoStyles, p);
      }
      incKey(OWNER_ANALYTICS_STATE.wraps, event.wrapStyle);
      incKey(OWNER_ANALYTICS_STATE.ribbons, event.ribbonStyle);
      incKey(OWNER_ANALYTICS_STATE.environments, event.environment);
      incKey(OWNER_ANALYTICS_STATE.lockModes, event.lockMode || 'none');
      pushAnalyticsEventServer(
        'studio',
        'bouquet_sealed',
        event.summary ||
          `${event.isCouture ? 'Couture' : 'Free'} bouquet sealed (${
            event.flowers?.length || 1
          } stems · ${event.wrapStyle || 'kraft'} wrap)`,
        dev,
        reg
      );
      break;
    case 'recipient_unwrap':
      OWNER_ANALYTICS_STATE.recipientUnwraps += 1;
      bucket.recipientUnwraps += 1;
      pushAnalyticsEventServer(
        'recipient',
        'recipient_unwrap',
        event.summary || 'Recipient unwrapped a shared gift bouquet',
        dev,
        reg
      );
      break;
    case 'voice_play':
      OWNER_ANALYTICS_STATE.voicePlays += 1;
      pushAnalyticsEventServer(
        'recipient',
        'voice_play',
        event.summary || 'Recipient played a voice keepsake recording',
        dev,
        reg
      );
      break;
    case 'recipient_reaction':
      OWNER_ANALYTICS_STATE.reactionsSent += 1;
      if (event.hasReply) OWNER_ANALYTICS_STATE.repliesSent += 1;
      pushAnalyticsEventServer(
        'recipient',
        'recipient_reaction',
        event.summary ||
          (event.hasReply
            ? 'Recipient sent a reaction & thank-you note'
            : 'Recipient sent a reaction to sender'),
        dev,
        reg
      );
      break;
    case 'recipient_to_studio':
      OWNER_ANALYTICS_STATE.recipientToStudioClicks += 1;
      OWNER_ANALYTICS_STATE.referrers.recipient_viral += 1;
      pushAnalyticsEventServer(
        'recipient',
        'recipient_to_studio',
        'Gift recipient clicked to craft their own bouquet (viral loop)',
        dev,
        reg
      );
      break;
    case 'paywall_open':
      OWNER_ANALYTICS_STATE.paywallOpens += 1;
      if (Array.isArray(event.paywallFeatures)) {
        for (const feat of event.paywallFeatures) {
          incKey(OWNER_ANALYTICS_STATE.paywallTriggers, feat);
        }
      }
      pushAnalyticsEventServer(
        'monetization',
        'paywall_open',
        event.summary ||
          `Unlock Premium modal viewed (${
            event.paywallFeatures?.slice(0, 2).join(', ') || 'Studio Pass'
          })`,
        dev,
        reg
      );
      break;
    case 'checkout_started':
      OWNER_ANALYTICS_STATE.checkoutsStarted += 1;
      break;
    case 'share_channel':
      if (event.shareChannel && event.shareChannel in OWNER_ANALYTICS_STATE.shareChannels) {
        OWNER_ANALYTICS_STATE.shareChannels[event.shareChannel] += 1;
      }
      break;
  }
  OWNER_ANALYTICS_STATE.updatedAt = new Date().toISOString();
}

function serializeTesterVoucherList(nowMs = Date.now()) {
  const result = [];
  for (const [, item] of TESTER_VOUCHER_LEDGER.entries()) {
    const passRecord = SERVER_PASS_STORE.get(item.passKey) || item.passRecord;
    const isRevoked =
      REVOKED_VOUCHER_KEYS.has(item.passKey) ||
      item.status === 'revoked' ||
      passRecord?.secondaryDeviceHash === REVOKED_PASS_SENTINEL;
    const isExpired = !isRevoked && Date.parse(item.expiresAt) <= nowMs;
    const claimedHash = passRecord?.primaryDeviceHash || item.claimedDeviceHash || '';
    const status = isRevoked
      ? 'revoked'
      : isExpired
      ? 'expired'
      : claimedHash
      ? 'claimed'
      : 'unclaimed';

    result.push({
      ...item,
      status,
      claimedDeviceHash: claimedHash,
      bouquetsCreated: Math.max(item.bouquetsCreated || 0, passRecord?.dailyUsageCount || 0),
    });
  }
  return result.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function serializePaidPassList(nowMs = Date.now()) {
  const result = [];
  for (const [, item] of PAID_PASS_LEDGER.entries()) {
    const passRecord = SERVER_PASS_STORE.get(item.passKey) || item.passRecord;
    const isRevoked =
      REVOKED_VOUCHER_KEYS.has(item.passKey) ||
      item.status === 'revoked' ||
      passRecord?.secondaryDeviceHash === REVOKED_PASS_SENTINEL;
    const isExpired = !isRevoked && Date.parse(item.expiresAt) <= nowMs;
    const claimedHash = passRecord?.primaryDeviceHash || item.claimedDeviceHash || '';
    const status = isRevoked
      ? 'revoked'
      : isExpired
      ? 'expired'
      : claimedHash
      ? 'claimed'
      : 'unclaimed';

    result.push({
      ...item,
      status,
      claimedDeviceHash: claimedHash,
      boundBouquetCode: passRecord?.boundBouquetCode ?? item.boundBouquetCode ?? null,
      bouquetsCreated: Math.max(item.bouquetsCreated || 0, passRecord?.dailyUsageCount || 0),
    });
  }
  return result.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

const ALLOWED_MANUAL_CHANNELS = new Set([
  'manual_gcash',
  'manual_maya',
  'manual_bank',
  'kofi',
  'sikatpay',
  'bayadgate',
  'paymongo',
  'other',
]);

export function mintPaidPassServer({
  tier = 'pass_7d',
  region = 'PH',
  label = 'Direct Buyer',
  channel = 'manual_gcash',
  isTest,
  nowMs = Date.now(),
} = {}) {
  const cleanTier = isValidTier(tier) ? tier : 'pass_7d';
  const cleanRegion = isValidRegion(region) ? region : 'PH';
  const cleanLabel =
    String(label || 'Direct Buyer')
      .replace(/[|:]/g, ' ')
      .trim()
      .slice(0, 32) || 'Direct Buyer';
  const cleanChannel = ALLOWED_MANUAL_CHANNELS.has(channel) ? channel : 'manual_gcash';
  const { currency, amountMinor } = resolvePaidPassCatalogMeta(cleanTier, cleanRegion);
  const resolvedIsTest = Boolean(
    isTest !== undefined ? isTest : OWNER_ANALYTICS_STATE.incomePausedForTesting
  );

  const signedPass = createSignedStudioPassServer({
    tier: cleanTier,
    region: cleanRegion,
    deviceTokenHash: '',
    boundBouquetCode: null,
    paymentProvider: 'owner_manual',
    paymentReference: cleanChannel.replace(/[^a-z0-9_]/gi, '').slice(0, 16) || 'manual',
    nowMs,
  });

  SERVER_PASS_STORE.set(signedPass.passKey, signedPass);
  const priceText =
    currency === 'PHP'
      ? `₱${(amountMinor / 100).toFixed(0)}`
      : `$${(amountMinor / 100).toFixed(2)}`;

  recordPaidPassIssuanceServer(signedPass, {
    label: cleanLabel,
    channel: cleanChannel,
    isTest: resolvedIsTest,
    summary: resolvedIsTest
      ? `[TEST] Minted ${cleanTier} Key (${cleanRegion} ${priceText} excluded from live income) for "${cleanLabel}"`
      : `Minted Paid ${cleanTier} Key (${cleanRegion} ${priceText}) for "${cleanLabel}" via ${cleanChannel}`,
  });

  const ledgerEntry = PAID_PASS_LEDGER.get(signedPass.passKey);
  return {
    pass: signedPass,
    paidPass: ledgerEntry,
  };
}

export function revokePaidPassServer(passKey) {
  const targetKey = normalizePassKey(passKey || '');
  if (!isValidPassKeyFormat(targetKey)) {
    return { ok: false, message: 'Invalid pass key.' };
  }
  REVOKED_VOUCHER_KEYS.add(targetKey);
  const existingPass = SERVER_PASS_STORE.get(targetKey);
  if (existingPass) {
    const revokedPass = {
      ...existingPass,
      secondaryDeviceHash: REVOKED_PASS_SENTINEL,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    };
    SERVER_PASS_STORE.set(targetKey, revokedPass);
  }
  if (PAID_PASS_LEDGER.has(targetKey)) {
    const item = PAID_PASS_LEDGER.get(targetKey);
    item.status = 'revoked';
    PAID_PASS_LEDGER.set(targetKey, item);
  }
  recomputePaidRevenueFromLedgerServer();
  pushAnalyticsEventServer(
    'security',
    'paid_key_revoked',
    `Owner revoked Paid Key ${targetKey}`,
    'desktop',
    'INTL'
  );
  return { ok: true, targetKey };
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
    const rawExact = String(str || '');
    const trimmed = rawExact.trim();
    if (!trimmed) return { raw: '', rawExact, parsed: {} };
    if (trimmed.startsWith('data=')) {
      const params = new URLSearchParams(trimmed);
      const dataStr = params.get('data') || '{}';
      try {
        return { raw: trimmed, rawExact, parsed: sanitizeJsonValue(JSON.parse(dataStr)) };
      } catch {
        return { raw: trimmed, rawExact, parsed: {} };
      }
    }
    try {
      return { raw: trimmed, rawExact, parsed: sanitizeJsonValue(JSON.parse(trimmed)) };
    } catch {
      const params = new URLSearchParams(trimmed);
      const dataStr = params.get('data');
      if (dataStr) {
        try {
          return { raw: trimmed, rawExact, parsed: sanitizeJsonValue(JSON.parse(dataStr)) };
        } catch {
          return { raw: trimmed, rawExact, parsed: {} };
        }
      }
      if (trimmed.includes('=')) {
        return {
          raw: trimmed,
          rawExact,
          parsed: sanitizeJsonValue(Object.fromEntries(params.entries())),
        };
      }
      return { raw: trimmed, rawExact, parsed: {} };
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
          return { raw: req.body.data, rawExact: req.body.data, parsed: JSON.parse(req.body.data) };
        } catch {
          return { raw: req.body.data, rawExact: req.body.data, parsed: {} };
        }
      }
      const rawStr = JSON.stringify(req.body);
      return { raw: rawStr, rawExact: rawStr, parsed: req.body };
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

  const codes = getActiveKofiShopCodes(configuredShopCodes);
  const allowedSingle = codes.allowedByTier?.single || [codes.single].filter(Boolean);
  const allowed7d = codes.allowedByTier?.pass_7d || [codes.pass_7d].filter(Boolean);
  const allowed30d = codes.allowedByTier?.pass_30d || [codes.pass_30d].filter(Boolean);
  const hasAnyConfiguredCode =
    allowedSingle.length > 0 || allowed7d.length > 0 || allowed30d.length > 0;

  if (hasAnyConfiguredCode) {
    const matchedTiers = [];
    const matchedCodeByTier = {};
    let primaryDirectLinkCode = '';

    const matchedSingleCode = itemCodes.find((c) => allowedSingle.includes(c));
    if (matchedSingleCode) {
      matchedTiers.push('single');
      matchedCodeByTier.single = matchedSingleCode;
      if (!primaryDirectLinkCode) primaryDirectLinkCode = matchedSingleCode;
    }

    const matched7dCode = itemCodes.find((c) => allowed7d.includes(c));
    if (matched7dCode) {
      matchedTiers.push('pass_7d');
      matchedCodeByTier.pass_7d = matched7dCode;
      if (!primaryDirectLinkCode) primaryDirectLinkCode = matched7dCode;
    }

    const matched30dCode = itemCodes.find((c) => allowed30d.includes(c));
    if (matched30dCode) {
      matchedTiers.push('pass_30d');
      matchedCodeByTier.pass_30d = matched30dCode;
      primaryDirectLinkCode = matched30dCode;
    }

    if (matchedTiers.length > 0) {
      return {
        valid: true,
        tier: matchedTiers[matchedTiers.length - 1],
        matchedTiers,
        matchedCodeByTier,
        directLinkCode: primaryDirectLinkCode,
      };
    }

    return {
      valid: false,
      reason: 'UNRECOGNIZED_DIRECT_LINK_CODE',
      message: `Shop item direct_link_code (${itemCodes.join(', ')}) does not match configured Single, 7-Day, or 30-Day Shop items.`,
    };
  }

  // Fallback when no shop codes are configured yet: resolve strictly to a single tier by amount
  const amount = Number.isFinite(parsedAmount) ? parsedAmount : 0;
  const cur = String(parsedWebhook?.currency || 'USD').toUpperCase();
  let tier = 'single';
  if (amount > 0) {
    if (cur === 'PHP' || amount >= 35) {
      tier = amount >= 180 ? 'pass_30d' : amount >= 85 ? 'pass_7d' : 'single';
    } else {
      tier = amount >= 8.0 ? 'pass_30d' : amount >= 4.5 ? 'pass_7d' : 'single';
    }
  }
  return {
    valid: true,
    tier,
    matchedTiers: [tier],
    matchedCodeByTier: { [tier]: itemCodes[0] },
    directLinkCode: itemCodes[0],
  };
}

export function resolveCheckoutRegionAndProvider({
  requestedRegion,
  requestedProvider,
  sikatpayApiKey = '',
  paymongoSecret = '',
  bayadgateMerchantId = '',
  bayadgateSecret = '',
  vercelCountry = '',
  phDisabled = false,
} = {}) {
  const hasSikatpay = Boolean(String(sikatpayApiKey || '').trim());
  const hasPaymongo = Boolean(String(paymongoSecret || '').trim());
  const hasBayadgate = Boolean(
    String(bayadgateMerchantId || '').trim() && String(bayadgateSecret || '').trim()
  );
  const normalizedCountry = String(vercelCountry || '').trim().toUpperCase();

  // When PH payments are disabled by owner or no PH local gateway is configured, strictly enforce USD ('INTL') + Ko-fi Shop.
  if (phDisabled || (!hasSikatpay && !hasPaymongo && !hasBayadgate)) {
    return { region: 'INTL', provider: 'kofi' };
  }

  // Ko-fi Shop only operates in USD ('INTL'); never allow PHP pricing on Ko-fi/card checkouts.
  if (requestedProvider === 'kofi') {
    return { region: 'INTL', provider: 'kofi' };
  }

  // If edge geo header is present and indicates non-PH, refuse PH pricing and route to INTL Ko-fi.
  if (normalizedCountry && normalizedCountry !== 'PH') {
    return { region: 'INTL', provider: 'kofi' };
  }

  const region = requestedRegion === 'PH' ? 'PH' : 'INTL';
  if (region !== 'PH') {
    return { region: 'INTL', provider: 'kofi' };
  }

  if (requestedProvider === 'sikatpay' && hasSikatpay) {
    return { region: 'PH', provider: 'sikatpay' };
  }
  if (requestedProvider === 'bayadgate' && hasBayadgate) {
    return { region: 'PH', provider: 'bayadgate' };
  }
  if (requestedProvider === 'paymongo' && hasPaymongo) {
    return { region: 'PH', provider: 'paymongo' };
  }
  if (hasSikatpay) {
    return { region: 'PH', provider: 'sikatpay' };
  }
  if (hasBayadgate) {
    return { region: 'PH', provider: 'bayadgate' };
  }
  return { region: 'PH', provider: 'paymongo' };
}

/**
 * Resolves the visitor's 2-letter ISO country code from trusted edge proxy headers.
 * When a domain is proxied through Cloudflare (orange cloud) in front of Vercel,
 * Vercel sees Cloudflare's POP IP (often SG for PLDT visitors) in `x-vercel-ip-country`,
 * while Cloudflare forwards the visitor's real IP country in `cf-ipcountry`.
 */
export function extractEdgeCountryCode(req) {
  const headers = (req && req.headers) || {};
  const cfCountryRaw =
    typeof headers['cf-ipcountry'] === 'string' ? headers['cf-ipcountry'].trim().toUpperCase() : '';
  const hasCloudflareProxyContext = Boolean(
    (typeof headers['cf-ray'] === 'string' && headers['cf-ray'].trim()) ||
      (typeof headers['cf-connecting-ip'] === 'string' && headers['cf-connecting-ip'].trim())
  );
  if (
    hasCloudflareProxyContext &&
    /^[A-Z]{2}$/.test(cfCountryRaw) &&
    cfCountryRaw !== 'XX' &&
    cfCountryRaw !== 'T1'
  ) {
    return cfCountryRaw;
  }

  const vercelCountryRaw =
    typeof headers['x-vercel-ip-country'] === 'string'
      ? headers['x-vercel-ip-country'].trim().toUpperCase()
      : '';
  return /^[A-Z]{2}$/.test(vercelCountryRaw) ? vercelCountryRaw : '';
}

export async function handlePaymentEndpoint(req, res, forcedPathname) {
  applySecurityHeaders(res);
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

  const clientIp = extractClientIp(req);
  const rateCheck = checkRateLimit({
    ip: clientIp,
    bucket: `payment:${pathname}`,
    maxRequests: 40,
    windowMs: 60_000,
  });
  if (typeof res.setHeader === 'function') {
    res.setHeader('X-RateLimit-Remaining', String(rateCheck.remaining));
  }
  if (!rateCheck.allowed) {
    if (typeof res.setHeader === 'function') {
      res.setHeader('Retry-After', String(rateCheck.retryAfterSec));
    }
    sendJson(res, 429, {
      ok: false,
      message: 'Too many payment or pass verification attempts. Please wait a minute and try again.',
    });
    return true;
  }

  try {
    // 0. GET /api/payments/create-checkout — Server-authoritative gateway & regional capability check
    if (pathname === '/api/payments/create-checkout' && req.method === 'GET') {
      await ensureCheckoutFlagsHydratedServer();
      const phDisabled = isPhPaymentsDisabledServer();
      const sikatpay = getSikatpayConfig();
      const bayadgate = getBayadgateConfig();
      const paymongoSecret = process.env.PAYMONGO_SECRET_KEY?.trim() || '';
      const hasPaymongo = Boolean(paymongoSecret);
      const vercelCountry = extractEdgeCountryCode(req);
      const phGateway = phDisabled
        ? null
        : sikatpay.configured
        ? 'sikatpay'
        : bayadgate.configured
        ? 'bayadgate'
        : hasPaymongo
        ? 'paymongo'
        : null;
      const isCountryPhOrLocal = !vercelCountry || vercelCountry === 'PH';
      const isPhEligible = Boolean(!phDisabled && phGateway && isCountryPhOrLocal);
      const defaultRegion = !phDisabled && phGateway && vercelCountry === 'PH' ? 'PH' : 'INTL';
      const availableProviders = isPhEligible ? [phGateway, 'kofi'] : ['kofi'];

      sendJson(res, 200, {
        ok: true,
        detectedCountry: vercelCountry,
        phDisabled,
        isPhEligible,
        defaultRegion,
        phGateway,
        sikatpayTestMode: !phDisabled && sikatpay.isTestKey,
        phMethods:
          phGateway === 'sikatpay'
            ? ['QRPH', 'GCASH', 'MAYA']
            : phGateway === 'bayadgate'
            ? BAYADGATE_PAYMENT_METHODS
            : [],
        availableProviders,
      });
      return true;
    }

    // 1. POST /api/payments/create-checkout
    if (pathname === '/api/payments/create-checkout' && req.method === 'POST') {
      await ensureCheckoutFlagsHydratedServer();
      const { parsed } = await readRequestBody(req);

      // Allow owner to sync their 3 Ko-fi Shop direct_link_codes
      if (parsed.syncShopCodes && typeof parsed.syncShopCodes === 'object') {
        const synced = await syncOwnerShopCodesWithFirestore(parsed.syncShopCodes);
        sendJson(res, 200, { ok: true, shopCodes: synced });
        return true;
      }

      const tier = isValidTier(parsed.tier) ? parsed.tier : 'pass_7d';
      const sikatpay = getSikatpayConfig();
      const paymongoSecret = process.env.PAYMONGO_SECRET_KEY?.trim() || '';
      const bayadgate = getBayadgateConfig();
      const kofiVerificationToken = process.env.KOFI_VERIFICATION_TOKEN?.trim() || '';
      const vercelCountry = extractEdgeCountryCode(req);

      await syncOwnerShopCodesWithFirestore(parsed.shopCodes);
      const shopCodes = getActiveKofiShopCodes(parsed.shopCodes);
      const tierDirectLinkCode = shopCodes[tier] || '';
      const kofiShopItemUrl = buildKofiShopItemUrl(tierDirectLinkCode, process.env.KOFI_PAGE_URL);

      const isProductionEnv = Boolean(
        process.env.VERCEL ||
          sikatpay.configured ||
          paymongoSecret ||
          bayadgate.configured ||
          kofiVerificationToken ||
          process.env.KOFI_PAGE_URL ||
          tierDirectLinkCode
      );

      const { region, provider } = resolveCheckoutRegionAndProvider({
        requestedRegion: parsed.region,
        requestedProvider: parsed.provider,
        sikatpayApiKey: sikatpay.apiKey,
        paymongoSecret,
        bayadgateMerchantId: bayadgate.merchantId,
        bayadgateSecret: bayadgate.secretKey,
        vercelCountry,
        phDisabled: isPhPaymentsDisabledServer(),
      });

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
      let sikatpayPaymentId = null;
      let sikatpayOrderId = null;
      let bayadgateOrderId = null;
      let bayadgatePaymentMethod = null;
      let liveGatewayConfigured = false;

      if (provider === 'sikatpay' && sikatpay.configured && region === 'PH') {
        liveGatewayConfigured = true;
        sikatpayOrderId = `SB-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
        const rawOrigin =
          typeof parsed.origin === 'string' && parsed.origin.startsWith('http')
            ? parsed.origin.replace(/\/+$/, '')
            : 'https://www.sendabouquet.online';

        const spPayload = {
          amount: PRICING_CATALOG.PH[tier].amountMinor,
          order_id: sikatpayOrderId,
          description: `Send A Bouquet - ${plan.name}`.slice(0, 120),
        };
        if (rawOrigin.startsWith('https://')) {
          spPayload.success_url = `${rawOrigin}/?checkout_success=${encodeURIComponent(checkoutId)}`;
          spPayload.cancel_url = `${rawOrigin}/?checkout_cancelled=1`;
        }

        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 10000);
          const spRes = await fetch(`${sikatpay.baseUrl}/payments`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${sikatpay.apiKey}`,
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify(spPayload),
            signal: controller.signal,
          });
          clearTimeout(timer);

          const spJson = await spRes.json().catch(() => null);
          if ((spRes.status !== 201 && spRes.status !== 200) || !spJson?.checkout_url || !spJson?.id) {
            sendJson(res, 502, {
              ok: false,
              status: 'GATEWAY_ERROR',
              message:
                spJson?.error?.message ||
                'SikatPay checkout could not be created right now. Please try Ko-fi or try again in a moment.',
            });
            return true;
          }

          sikatpayPaymentId = String(spJson.id);
          checkoutUrl = String(spJson.checkout_url);

          const slotKey = deriveSikatpayOrderSlotKey(sikatpayOrderId);
          const pendingSlot = createSignedStudioPassServer({
            passKey: slotKey,
            tier,
            region: 'PH',
            deviceTokenHash,
            secondaryDeviceHash: 'PENDING_PAYMENT',
            boundBouquetCode: `${passKey}|${boundBouquetCode || ''}`,
            paymentProvider: 'sikatpay',
            paymentReference: `sppend_${sikatpayOrderId}`,
          });
          pendingSlot.activeSessionNonce = sikatpayPaymentId;
          pendingSlot.signature = computePassIntegritySignature(pendingSlot, CLIENT_SIGNATURE_SALT);
          SERVER_PASS_STORE.set(slotKey, pendingSlot);
          await saveStudioPassToFirestoreRest(pendingSlot);
        } catch {
          sendJson(res, 502, {
            ok: false,
            status: 'GATEWAY_UNREACHABLE',
            message: 'Could not reach SikatPay right now. Please try again in a moment.',
          });
          return true;
        }
      } else if (provider === 'bayadgate' && bayadgate.configured && region === 'PH') {
        liveGatewayConfigured = true;
        bayadgatePaymentMethod = normalizeBayadgatePaymentMethod(parsed.paymentMethod);
        bayadgateOrderId = `BG${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
        const amountStr = formatBayadgateAmountForTier(tier);
        const origin =
          typeof parsed.origin === 'string' && parsed.origin.startsWith('http')
            ? parsed.origin.replace(/\/+$/, '')
            : 'https://www.sendabouquet.online';
        const redirectUrl = `${origin}/?checkout_success=${encodeURIComponent(checkoutId)}`;

        const bgPayload = {
          merchant_id: bayadgate.merchantId,
          amount: amountStr,
          order_id: bayadgateOrderId,
          payment_method: bayadgatePaymentMethod,
          redirect_url: redirectUrl,
        };
        bgPayload.sign = computeBayadgateSignature(bgPayload, bayadgate.secretKey);

        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 10000);
          const bgRes = await fetch(`${bayadgate.baseUrl}/api/checkout.php`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
              Accept: 'application/json',
            },
            body: new URLSearchParams(bgPayload).toString(),
            signal: controller.signal,
          });
          clearTimeout(timer);

          const bgJson = await bgRes.json().catch(() => null);
          if (!bgRes.ok || !bgJson || String(bgJson.status || '').toUpperCase() !== 'SUCCESS' || !bgJson.payment_url) {
            sendJson(res, 502, {
              ok: false,
              status: 'GATEWAY_ERROR',
              message:
                bgJson?.message ||
                'BayadGate checkout could not be created right now. Please try another wallet or Ko-fi.',
            });
            return true;
          }

          checkoutUrl = String(bgJson.payment_url);

          // Persist pending order slot in Firestore so webhook / return verification works across serverless lambdas
          const slotKey = deriveBayadgateOrderSlotKey(bayadgateOrderId);
          const pendingSlot = createSignedStudioPassServer({
            passKey: slotKey,
            tier,
            region: 'PH',
            deviceTokenHash,
            secondaryDeviceHash: 'PENDING_PAYMENT',
            boundBouquetCode: `${passKey}|${boundBouquetCode || ''}`,
            paymentProvider: 'bayadgate',
            paymentReference: `bgpend_${bayadgateOrderId}`,
          });
          pendingSlot.activeSessionNonce = bayadgateOrderId;
          pendingSlot.signature = computePassIntegritySignature(pendingSlot, CLIENT_SIGNATURE_SALT);
          SERVER_PASS_STORE.set(slotKey, pendingSlot);
          await saveStudioPassToFirestoreRest(pendingSlot);
        } catch {
          sendJson(res, 502, {
            ok: false,
            status: 'GATEWAY_UNREACHABLE',
            message: 'Could not reach BayadGate right now. Please try again in a moment.',
          });
          return true;
        }
      } else if (provider === 'paymongo' && paymongoSecret && region === 'PH') {
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
                  // Lock PH PPP pricing strictly to local Philippine e-wallet / QR Ph rails (never cards)
                  payment_method_types: ['qrph', 'gcash', 'paymaya'],
                  line_items: [
                    {
                      currency: 'PHP',
                      amount: PRICING_CATALOG.PH[tier].amountMinor,
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
        spId: sikatpayPaymentId || null,
        spOid: sikatpayOrderId || null,
        bgOid: bayadgateOrderId || null,
        bgMethod: bayadgatePaymentMethod || null,
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
        sikatpayPaymentId,
        sikatpayOrderId,
        bayadgateOrderId,
        bayadgatePaymentMethod,
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
        orderId: sikatpayOrderId || bayadgateOrderId,
        sikatpayPaymentId,
        paymentMethod: bayadgatePaymentMethod,
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
          sikatpayPaymentId: decodedToken.spId || null,
          sikatpayOrderId: decodedToken.spOid || null,
          bayadgateOrderId: decodedToken.bgOid || null,
          bayadgatePaymentMethod: decodedToken.bgMethod || null,
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

      // Case A00: SikatPay Order Verification (Webhook slot OR GET /v1/payments/:id fallback)
      if (pending.provider === 'sikatpay') {
        const sikatpay = getSikatpayConfig();
        const orderId = pending.sikatpayOrderId || '';
        const slotKey = orderId ? deriveSikatpayOrderSlotKey(orderId) : '';

        // 1. Check if webhook (or prior check) already minted and persisted the final pass
        const existingPass =
          SERVER_PASS_STORE.get(pending.passKey) ||
          (await fetchStudioPassFromFirestoreRest(pending.passKey));
        if (
          existingPass &&
          verifyPassIntegritySignature(existingPass) &&
          verifyServerPaymentReference(existingPass)
        ) {
          pending.status = 'paid';
          SERVER_PASS_STORE.set(existingPass.passKey, existingPass);
          sendJson(res, 200, { ok: true, pass: existingPass });
          return true;
        }

        // 2. Check Firestore order slot status in case webhook marked PAID across serverless instances
        const orderSlot = slotKey
          ? SERVER_PASS_STORE.get(slotKey) || (await fetchStudioPassFromFirestoreRest(slotKey))
          : null;
        let confirmedPaid = orderSlot?.secondaryDeviceHash === 'PAID';
        let verifiedLivemode = !sikatpay.isTestKey;
        const paymentId = pending.sikatpayPaymentId || orderSlot?.activeSessionNonce || '';

        // 3. Fallback: Query SikatPay GET /v1/payments/:id directly
        if (!confirmedPaid && sikatpay.configured && paymentId) {
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 8000);
            const spCheckRes = await fetch(
              `${sikatpay.baseUrl}/payments/${encodeURIComponent(paymentId)}`,
              {
                method: 'GET',
                headers: {
                  Authorization: `Bearer ${sikatpay.apiKey}`,
                  Accept: 'application/json',
                },
                signal: controller.signal,
              }
            );
            clearTimeout(timer);
            if (spCheckRes.ok) {
              const pJson = await spCheckRes.json().catch(() => null);
              const expectedMinor = PRICING_CATALOG.PH[pending.tier]?.amountMinor;
              const livemodeOk = sikatpay.isTestKey || pJson?.livemode === true;
              const orderMatch = !orderId || !pJson?.order_id || pJson.order_id === orderId;
              if (
                pJson?.status === 'paid' &&
                String(pJson?.currency || '').toUpperCase() === 'PHP' &&
                Number(pJson?.amount) === expectedMinor &&
                livemodeOk &&
                orderMatch
              ) {
                confirmedPaid = true;
                verifiedLivemode = !sikatpay.isTestKey && pJson?.livemode === true;
              }
            }
          } catch {
            // Keep pending if upstream status endpoint unreachable
          }
        }

        if (!confirmedPaid) {
          sendJson(res, 402, {
            ok: false,
            status: 'PENDING_PAYMENT',
            message:
              'Payment is still awaiting confirmation from QR Ph / GCash / Maya. Complete payment and tap Verify Order again.',
          });
          return true;
        }

        await hydratePersistentOwnerVaultServer();
        const isSikatpayTest =
          sikatpay.isTestKey ||
          !verifiedLivemode ||
          Boolean(OWNER_ANALYTICS_STATE.incomePausedForTesting);

        pending.status = 'paid';
        const mintedPass = createSignedStudioPassServer({
          passKey: pending.passKey,
          tier: pending.tier,
          region: 'PH',
          deviceTokenHash: pending.deviceTokenHash,
          boundBouquetCode: pending.boundBouquetCode,
          paymentProvider: 'sikatpay',
          paymentReference: `${isSikatpayTest ? 'sptest' : 'sp'}_${orderId || pending.checkoutId}`,
        });
        SERVER_PASS_STORE.set(mintedPass.passKey, mintedPass);
        await saveStudioPassToFirestoreRest(mintedPass);

        if (orderSlot) {
          const paidSlot = { ...orderSlot, secondaryDeviceHash: 'PAID' };
          paidSlot.signature = computePassIntegritySignature(paidSlot, CLIENT_SIGNATURE_SALT);
          SERVER_PASS_STORE.set(slotKey, paidSlot);
          await saveStudioPassToFirestoreRest(paidSlot);
        }

        recordPaidPassIssuanceServer(mintedPass, {
          isTest: isSikatpayTest,
          label: isSikatpayTest ? 'SikatPay Test' : 'SikatPay Buyer',
        });
        await savePersistentOwnerVaultServer();

        sendJson(res, 200, { ok: true, pass: mintedPass });
        return true;
      }

      // Case A0: BayadGate Order Verification (Webhook slot OR server-to-server query_status.php)
      if (pending.provider === 'bayadgate') {
        const bayadgate = getBayadgateConfig();
        const orderId = pending.bayadgateOrderId || '';
        const slotKey = orderId ? deriveBayadgateOrderSlotKey(orderId) : '';

        // 1. Check if webhook (or prior check) already minted and persisted the final pass
        const existingPass =
          SERVER_PASS_STORE.get(pending.passKey) ||
          (await fetchStudioPassFromFirestoreRest(pending.passKey));
        if (
          existingPass &&
          verifyPassIntegritySignature(existingPass) &&
          verifyServerPaymentReference(existingPass)
        ) {
          pending.status = 'paid';
          SERVER_PASS_STORE.set(existingPass.passKey, existingPass);
          sendJson(res, 200, { ok: true, pass: existingPass });
          return true;
        }

        // 2. Check Firestore order slot status in case webhook marked PAID across instances
        const orderSlot = slotKey
          ? SERVER_PASS_STORE.get(slotKey) || (await fetchStudioPassFromFirestoreRest(slotKey))
          : null;
        let confirmedPaid = orderSlot?.secondaryDeviceHash === 'PAID';

        // 3. Fallback: Query BayadGate status endpoint directly
        if (!confirmedPaid && bayadgate.configured && orderId) {
          try {
            const qParams = {
              merchant_id: bayadgate.merchantId,
              order_id: orderId,
            };
            qParams.sign = computeBayadgateSignature(qParams, bayadgate.secretKey);
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 8000);
            const qRes = await fetch(`${bayadgate.baseUrl}/api/query_status.php`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
                Accept: 'application/json',
              },
              body: new URLSearchParams(qParams).toString(),
              signal: controller.signal,
            });
            clearTimeout(timer);
            if (qRes.ok) {
              const qJson = await qRes.json().catch(() => null);
              const qStatus = String(
                qJson?.payment_status ??
                  qJson?.order_status ??
                  qJson?.data?.status ??
                  qJson?.data?.payment_status ??
                  (qJson?.status === '5' || qJson?.status === 5 ? '5' : '')
              )
                .trim()
                .toUpperCase();
              const expectedMinor = PRICING_CATALOG.PH[pending.tier]?.amountMinor;
              const qAmountRaw = qJson?.amount ?? qJson?.data?.amount;
              const qAmountMinor =
                qAmountRaw !== undefined && qAmountRaw !== null && String(qAmountRaw).trim() !== ''
                  ? parseBayadgateAmountToMinor(qAmountRaw)
                  : expectedMinor;
              if (
                (qStatus === '5' || qStatus === 'PAID' || qStatus === 'COMPLETED') &&
                qAmountMinor === expectedMinor
              ) {
                confirmedPaid = true;
              }
            }
          } catch {
            // Keep pending if upstream status endpoint unreachable
          }
        }

        if (!confirmedPaid) {
          sendJson(res, 402, {
            ok: false,
            status: 'PENDING_PAYMENT',
            message:
              'Payment is still awaiting confirmation from GCash / Maya / GoTyme. Please complete your payment and tap Verify again.',
          });
          return true;
        }

        pending.status = 'paid';
        const mintedPass = createSignedStudioPassServer({
          passKey: pending.passKey,
          tier: pending.tier,
          region: 'PH',
          deviceTokenHash: pending.deviceTokenHash,
          boundBouquetCode: pending.boundBouquetCode,
          paymentProvider: 'bayadgate',
          paymentReference: `bg_${orderId || pending.checkoutId}`,
        });
        SERVER_PASS_STORE.set(mintedPass.passKey, mintedPass);
        await saveStudioPassToFirestoreRest(mintedPass);

        if (orderSlot) {
          const paidSlot = { ...orderSlot, secondaryDeviceHash: 'PAID' };
          paidSlot.signature = computePassIntegritySignature(paidSlot, CLIENT_SIGNATURE_SALT);
          SERVER_PASS_STORE.set(slotKey, paidSlot);
          await saveStudioPassToFirestoreRest(paidSlot);
        }

        await hydratePersistentOwnerVaultServer();
        recordPaidPassIssuanceServer(mintedPass);
        await savePersistentOwnerVaultServer();

        sendJson(res, 200, { ok: true, pass: mintedPass });
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

      // Case B: Ko-fi Shop Order Verification by Buyer Email + Exact Tier + Item Code
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

        const activeShopCodes = getActiveKofiShopCodes();
        const doesReceiptMatchTierCode = (slot, targetTier) => {
          if (!slot || slot.tier !== targetTier) return false;
          const allowedForTier = activeShopCodes.allowedByTier?.[targetTier] || [];
          if (allowedForTier.length > 0) {
            if (!slot.boundBouquetCode) {
              return false;
            }
            return allowedForTier.includes(slot.boundBouquetCode);
          }
          if (
            targetTier === pending.tier &&
            pending.directLinkCode &&
            slot.boundBouquetCode &&
            slot.boundBouquetCode !== pending.directLinkCode
          ) {
            return false;
          }
          return true;
        };

        const emailTierSlotKey = deriveKofiEmailTierSlotKey(buyerEmail, pending.tier);
        const receiptSlot =
          SERVER_PASS_STORE.get(emailTierSlotKey) ||
          (await fetchStudioPassFromFirestoreRest(emailTierSlotKey));

        // If no valid receipt exists for the requested tier, check if the buyer ordered a different tier
        if (!receiptSlot || !doesReceiptMatchTierCode(receiptSlot, pending.tier)) {
          const otherTiers = ['single', 'pass_7d', 'pass_30d'].filter((t) => t !== pending.tier);
          for (const otherTier of otherTiers) {
            const otherSlotKey = deriveKofiEmailTierSlotKey(buyerEmail, otherTier);
            const candidate =
              SERVER_PASS_STORE.get(otherSlotKey) ||
              (await fetchStudioPassFromFirestoreRest(otherSlotKey));
            if (
              candidate &&
              candidate.secondaryDeviceHash !== 'CLAIMED' &&
              doesReceiptMatchTierCode(candidate, otherTier)
            ) {
              sendJson(res, 403, {
                ok: false,
                status: 'TIER_MISMATCH',
                message: `Your Ko-fi Shop order was for "${PRICING_CATALOG.INTL[otherTier]?.name || otherTier}", which does not match "${pending.plan?.name || pending.tier}". Please select "${PRICING_CATALOG.INTL[otherTier]?.name || otherTier}" to unlock your order.`,
              });
              return true;
            }
          }

          if (receiptSlot && !doesReceiptMatchTierCode(receiptSlot, pending.tier)) {
            sendJson(res, 403, {
              ok: false,
              status: 'SHOP_ITEM_CODE_MISMATCH',
              message: `The purchased Ko-fi Shop item does not match "${pending.plan?.name || pending.tier}". Please select the exact plan you ordered on Ko-fi Shop.`,
            });
            return true;
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
        await hydratePersistentOwnerVaultServer();
        recordPaidPassIssuanceServer(boundPass);
        await savePersistentOwnerVaultServer();
        sendJson(res, 200, {
          ok: true,
          pass: boundPass,
        });
        return true;
      }

      // Case C: Local Sandbox Preview / Confirmed PayMongo Session
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
      await hydratePersistentOwnerVaultServer();
      recordPaidPassIssuanceServer(passRecord);
      await savePersistentOwnerVaultServer();

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
      const deviceTokenHash =
        typeof parsed.deviceTokenHash === 'string' && parsed.deviceTokenHash.length >= 8
          ? parsed.deviceTokenHash
          : '';

      // Stealth Owner Gate Trigger: ONLY when typing `admin` in "Have a Key?"
      if (rawKey.trim().toLowerCase() === 'admin') {
        const gateSlug = createEncryptedAdminVisitSlug(deviceTokenHash || 'anon');
        sendJson(res, 200, {
          ok: true,
          status: 'STEALTH_GATE',
          gateSlug,
          gatePath: `/${gateSlug}`,
        });
        return true;
      }

      const trimmedOrderCandidate = rawKey.trim().toUpperCase();
      const isSikatpayOrderLookup = /^SB-[A-F0-9]{8,16}$/.test(trimmedOrderCandidate);
      const isBayadgateOrderLookup = /^BG[A-F0-9]{8,20}$/.test(trimmedOrderCandidate);

      if ((isSikatpayOrderLookup || isBayadgateOrderLookup) && deviceTokenHash) {
        const slotKey = isSikatpayOrderLookup
          ? deriveSikatpayOrderSlotKey(trimmedOrderCandidate)
          : deriveBayadgateOrderSlotKey(trimmedOrderCandidate);
        const orderSlot =
          SERVER_PASS_STORE.get(slotKey) || (await fetchStudioPassFromFirestoreRest(slotKey));

        if (!orderSlot || !verifyServerPaymentReference(orderSlot)) {
          sendJson(res, 404, {
            ok: false,
            status: 'ORDER_NOT_FOUND',
            message: 'Order ID not found. Make sure you are on the same browser used for checkout.',
          });
          return true;
        }

        if (orderSlot.primaryDeviceHash !== deviceTokenHash) {
          sendJson(res, 403, {
            ok: false,
            status: 'DEVICE_MISMATCH',
            message: 'This Order ID belongs to another browser or device.',
          });
          return true;
        }

        const packedMeta = String(orderSlot.boundBouquetCode || '');
        const pipeIdx = packedMeta.indexOf('|');
        const decodedPassKey = pipeIdx !== -1 ? packedMeta.slice(0, pipeIdx) : '';
        const decodedBouquetCode = pipeIdx !== -1 ? packedMeta.slice(pipeIdx + 1) : '';
        const targetPassKey = isValidPassKeyFormat(decodedPassKey)
          ? decodedPassKey
          : generatePassKeyCode();

        let existingPass =
          SERVER_PASS_STORE.get(targetPassKey) ||
          (await fetchStudioPassFromFirestoreRest(targetPassKey));

        if (
          existingPass &&
          verifyPassIntegritySignature(existingPass) &&
          verifyServerPaymentReference(existingPass)
        ) {
          SERVER_PASS_STORE.set(existingPass.passKey, existingPass);
          sendJson(res, 200, { ok: true, pass: existingPass });
          return true;
        }

        let confirmedPaid = orderSlot.secondaryDeviceHash === 'PAID';
        let verifiedLivemode = isSikatpayOrderLookup ? !getSikatpayConfig().isTestKey : true;
        if (!confirmedPaid && isSikatpayOrderLookup) {
          const sikatpay = getSikatpayConfig();
          const paymentId = orderSlot.activeSessionNonce || '';
          if (sikatpay.configured && paymentId) {
            try {
              const controller = new AbortController();
              const timer = setTimeout(() => controller.abort(), 8000);
              const spCheckRes = await fetch(
                `${sikatpay.baseUrl}/payments/${encodeURIComponent(paymentId)}`,
                {
                  method: 'GET',
                  headers: {
                    Authorization: `Bearer ${sikatpay.apiKey}`,
                    Accept: 'application/json',
                  },
                  signal: controller.signal,
                }
              );
              clearTimeout(timer);
              if (spCheckRes.ok) {
                const pJson = await spCheckRes.json().catch(() => null);
                const tier = isValidTier(orderSlot.tier) ? orderSlot.tier : 'pass_7d';
                const expectedMinor = PRICING_CATALOG.PH[tier]?.amountMinor;
                const livemodeOk = sikatpay.isTestKey || pJson?.livemode === true;
                const orderMatch =
                  !pJson?.order_id || pJson.order_id === trimmedOrderCandidate;
                if (
                  pJson?.status === 'paid' &&
                  String(pJson?.currency || '').toUpperCase() === 'PHP' &&
                  Number(pJson?.amount) === expectedMinor &&
                  livemodeOk &&
                  orderMatch
                ) {
                  confirmedPaid = true;
                  verifiedLivemode = !sikatpay.isTestKey && pJson?.livemode === true;
                }
              }
            } catch {
              // Fall through to pending response
            }
          }
        }

        if (!confirmedPaid) {
          sendJson(res, 402, {
            ok: false,
            status: 'PENDING_PAYMENT',
            message:
              'Payment for this Order ID is not confirmed yet. Complete payment and try again in a few seconds.',
          });
          return true;
        }

        await hydratePersistentOwnerVaultServer();
        const isSikatpayTest =
          isSikatpayOrderLookup &&
          (getSikatpayConfig().isTestKey ||
            !verifiedLivemode ||
            Boolean(OWNER_ANALYTICS_STATE.incomePausedForTesting));

        const resolvedTier = isValidTier(orderSlot.tier) ? orderSlot.tier : 'pass_7d';
        const mintedPass = createSignedStudioPassServer({
          passKey: targetPassKey,
          tier: resolvedTier,
          region: 'PH',
          deviceTokenHash: orderSlot.primaryDeviceHash,
          boundBouquetCode: decodedBouquetCode || null,
          paymentProvider: isSikatpayOrderLookup ? 'sikatpay' : 'bayadgate',
          paymentReference: `${isSikatpayOrderLookup ? (isSikatpayTest ? 'sptest' : 'sp') : 'bg'}_${trimmedOrderCandidate}`,
        });
        SERVER_PASS_STORE.set(mintedPass.passKey, mintedPass);
        await saveStudioPassToFirestoreRest(mintedPass);

        const paidSlot = { ...orderSlot, secondaryDeviceHash: 'PAID' };
        paidSlot.signature = computePassIntegritySignature(paidSlot, CLIENT_SIGNATURE_SALT);
        SERVER_PASS_STORE.set(slotKey, paidSlot);
        await saveStudioPassToFirestoreRest(paidSlot);

        recordPaidPassIssuanceServer(mintedPass, {
          isTest: isSikatpayTest,
          label: isSikatpayTest ? 'SikatPay Test' : undefined,
        });
        await savePersistentOwnerVaultServer();

        sendJson(res, 200, { ok: true, pass: mintedPass });
        return true;
      }

      const passKey = normalizePassKey(rawKey);

      // Prevent internal Ko-fi/BayadGate/SikatPay receipt slots (`BLOOM-KS...`, `BLOOM-BG...`, `BLOOM-SP...`, `BLOOM-KCFG-SHOP`) from being redeemed directly as user keys
      if (
        !isValidPassKeyFormat(passKey) ||
        !deviceTokenHash ||
        passKey.startsWith('BLOOM-KS') ||
        passKey.startsWith('BLOOM-BG') ||
        passKey.startsWith('BLOOM-SP') ||
        passKey === 'BLOOM-KCFG-SHOP'
      ) {
        sendJson(res, 400, {
          ok: false,
          status: 'INVALID_FORMAT',
          message: 'Please enter a valid Pass Key (BLOOM-XXXX-XXXX) or Order ID (SB-...).',
        });
        return true;
      }

      await hydratePersistentOwnerVaultServer();

      const existingRecord =
        SERVER_PASS_STORE.get(passKey) || (await fetchStudioPassFromFirestoreRest(passKey));

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
        if (result.status === 'DEVICE_LIMIT_EXCEEDED') {
          OWNER_ANALYTICS_STATE.blockedShareAttempts += 1;
          if (TESTER_VOUCHER_LEDGER.has(passKey)) {
            const item = TESTER_VOUCHER_LEDGER.get(passKey);
            item.blockedAttempts = (item.blockedAttempts || 0) + 1;
            TESTER_VOUCHER_LEDGER.set(passKey, item);
          }
          pushAnalyticsEventServer(
            'security',
            'voucher_share_blocked',
            `Blocked additional device from claiming ${
              isTesterVoucherPassServer(existingRecord) ? '1-device Tester Voucher' : 'Studio Pass'
            } (${passKey})`,
            'mobile',
            existingRecord.region || 'INTL'
          );
          await savePersistentOwnerVaultServer();
        }
        sendJson(res, 403, {
          ok: false,
          status: result.status,
          message: result.message,
        });
        return true;
      }

      SERVER_PASS_STORE.set(passKey, result.updatedPass);
      await saveStudioPassToFirestoreRest(result.updatedPass);

      if (isTesterVoucherPassServer(result.updatedPass)) {
        const meta = parseTesterVoucherMetaServer(result.updatedPass.boundBouquetCode);
        const existingItem = TESTER_VOUCHER_LEDGER.get(passKey);
        const wasUnclaimed = !existingRecord.primaryDeviceHash;
        TESTER_VOUCHER_LEDGER.set(passKey, {
          passKey,
          label: existingItem?.label || meta.label || 'Tester Invite',
          durationHours:
            existingItem?.durationHours ||
            Math.max(
              1,
              Math.round(
                (Date.parse(result.updatedPass.expiresAt) -
                  Date.parse(result.updatedPass.createdAt)) /
                  3600000
              )
            ),
          dailyCap: existingItem?.dailyCap || meta.dailyCap || 10,
          retentionDays: result.updatedPass.retentionDays || 30,
          createdAt: result.updatedPass.createdAt,
          expiresAt: result.updatedPass.expiresAt,
          status: 'claimed',
          claimedDeviceHash: result.updatedPass.primaryDeviceHash,
          bouquetsCreated: Math.max(
            existingItem?.bouquetsCreated || 0,
            result.updatedPass.dailyUsageCount || 0
          ),
          blockedAttempts: existingItem?.blockedAttempts || 0,
          passRecord: result.updatedPass,
        });
        if (wasUnclaimed) {
          OWNER_ANALYTICS_STATE.referrers.tester_magic_link += 1;
          pushAnalyticsEventServer(
            'monetization',
            'voucher_claimed',
            `Tester Voucher claimed (${meta.label || passKey}) — locked to 1 device`,
            'mobile',
            result.updatedPass.region || 'INTL'
          );
        }
        await savePersistentOwnerVaultServer();
      } else {
        const existingPaid = PAID_PASS_LEDGER.get(passKey);
        const { currency, amountMinor } = resolvePaidPassCatalogMeta(
          result.updatedPass.tier,
          result.updatedPass.region
        );
        PAID_PASS_LEDGER.set(passKey, {
          passKey,
          label: existingPaid?.label || `${result.updatedPass.paymentProvider || 'Studio'} Buyer`,
          tier: result.updatedPass.tier,
          region: result.updatedPass.region === 'PH' ? 'PH' : 'INTL',
          channel:
            existingPaid?.channel ||
            (result.updatedPass.paymentProvider === 'kofi'
              ? 'kofi'
              : result.updatedPass.paymentProvider === 'sikatpay'
              ? 'sikatpay'
              : result.updatedPass.paymentProvider === 'bayadgate'
              ? 'bayadgate'
              : result.updatedPass.paymentProvider === 'paymongo'
              ? 'paymongo'
              : 'manual_gcash'),
          amountMinor: existingPaid?.amountMinor ?? amountMinor,
          currency: existingPaid?.currency || currency,
          retentionDays: result.updatedPass.retentionDays || 90,
          isEternalKeepsake: Boolean(result.updatedPass.isEternalKeepsake),
          createdAt: result.updatedPass.createdAt,
          expiresAt: result.updatedPass.expiresAt,
          status: 'claimed',
          claimedDeviceHash: result.updatedPass.primaryDeviceHash,
          bouquetsCreated: Math.max(
            existingPaid?.bouquetsCreated || 0,
            result.updatedPass.dailyUsageCount || 0
          ),
          blockedAttempts: existingPaid?.blockedAttempts || 0,
          boundBouquetCode: result.updatedPass.boundBouquetCode || null,
          passRecord: result.updatedPass,
        });
        await savePersistentOwnerVaultServer();
      }

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
      const actionType = typeof parsed.action === 'string' ? parsed.action : '';
      const deviceTokenHash =
        typeof parsed.deviceTokenHash === 'string' ? parsed.deviceTokenHash : '';

      // 4A. First-party telemetry event ingestion (Persisted to Firestore so Vercel redeploys never reset visits/analytics)
      if (actionType === 'telemetry_event') {
        await hydratePersistentOwnerVaultServer();
        applyServerTelemetryEvent(parsed.telemetry);
        await savePersistentOwnerVaultServer();
        sendJson(res, 200, { ok: true });
        return true;
      }

      // 4B. Verify Stealth Gate URL Slug (`/gk-<hmac_token>`)
      if (actionType === 'verify_gate_slug') {
        const gateSlug = typeof parsed.gateSlug === 'string' ? parsed.gateSlug : '';
        const valid = verifyEncryptedAdminVisitSlug(gateSlug, deviceTokenHash || 'anon');
        sendJson(res, 200, { ok: valid, valid });
        return true;
      }

      // 4C. Unlock Owner Console with PIN / Passphrase
      if (actionType === 'unlock_owner_console') {
        const gateSlug = typeof parsed.gateSlug === 'string' ? parsed.gateSlug : '';
        const pin = typeof parsed.pin === 'string' ? parsed.pin : '';
        const slugValid = verifyEncryptedAdminVisitSlug(gateSlug, deviceTokenHash || 'anon');
        if (!slugValid) {
          sendJson(res, 200, {
            ok: false,
            unauthorized: true,
            status: 'EXPIRED_GATE',
            message:
              'This private bouquet link has expired. Re-open "Have a Key?" in the Studio to generate a fresh link.',
          });
          return true;
        }

        // Hydrate custom PIN & lockout state from Firestore before verifying PIN
        await hydratePersistentOwnerVaultServer();

        const pinResult = verifyOwnerPinWithRateLimit(pin, deviceTokenHash || 'anon');
        if (!pinResult.ok) {
          OWNER_ANALYTICS_STATE.blockedPinAttempts += 1;
          pushAnalyticsEventServer(
            'security',
            'pin_failed',
            pinResult.locked
              ? 'Stealth gate locked for 15m after repeated incorrect passphrase attempts'
              : 'Incorrect passphrase entered on stealth bouquet gate',
            'desktop',
            'INTL'
          );
          await savePersistentOwnerVaultServer();
          sendJson(res, 200, {
            ok: false,
            unauthorized: true,
            locked: pinResult.locked,
            attemptsRemaining: pinResult.attemptsRemaining,
            message: pinResult.message,
          });
          return true;
        }

        const adminSessionToken = createSignedAdminSessionToken(deviceTokenHash || 'anon');
        await syncRealAnalyticsSnapshotServer();
        pushAnalyticsEventServer(
          'security',
          'owner_unlocked',
          'Owner unlocked the Atelier Analytics & Tester Voucher Console',
          'desktop',
          'INTL'
        );
        await savePersistentOwnerVaultServer();
        sendJson(res, 200, {
          ok: true,
          adminSessionToken,
          analytics: OWNER_ANALYTICS_STATE,
          testerVouchers: serializeTesterVoucherList(),
          paidPasses: serializePaidPassList(),
        });
        return true;
      }

      // 4D. Fetch Live Owner Console State
      if (actionType === 'fetch_owner_console') {
        const adminSessionToken =
          typeof parsed.adminSessionToken === 'string' ? parsed.adminSessionToken : '';
        if (!verifySignedAdminSessionToken(adminSessionToken, deviceTokenHash || 'anon')) {
          sendJson(res, 200, {
            ok: false,
            unauthorized: true,
            message: 'Owner session expired. Please re-enter PIN.',
          });
          return true;
        }
        await syncRealAnalyticsSnapshotServer();
        await savePersistentOwnerVaultServer();
        sendJson(res, 200, {
          ok: true,
          analytics: OWNER_ANALYTICS_STATE,
          testerVouchers: serializeTesterVoucherList(),
          paidPasses: serializePaidPassList(),
        });
        return true;
      }

      // 4D-2. Mint a Paid Studio Pass Key (`single`, `pass_7d`, or `pass_30d`) for direct/manual buyers
      if (actionType === 'mint_paid_pass') {
        const adminSessionToken =
          typeof parsed.adminSessionToken === 'string' ? parsed.adminSessionToken : '';
        if (!verifySignedAdminSessionToken(adminSessionToken, deviceTokenHash || 'anon')) {
          sendJson(res, 401, {
            ok: false,
            unauthorized: true,
            message: 'Owner session expired. Please re-enter PIN.',
          });
          return true;
        }

        await hydratePersistentOwnerVaultServer();

        const minted = mintPaidPassServer({
          tier: parsed.tier,
          region: parsed.region,
          label: parsed.label,
          channel: parsed.channel,
        });

        await saveStudioPassToFirestoreRest(minted.pass);
        await savePersistentOwnerVaultServer();

        sendJson(res, 200, {
          ok: true,
          paidPass: minted.paidPass,
          pass: minted.pass,
          analytics: OWNER_ANALYTICS_STATE,
          testerVouchers: serializeTesterVoucherList(),
          paidPasses: serializePaidPassList(),
        });
        return true;
      }

      // 4D-3. Revoke a Paid Pass Key Immediately
      if (actionType === 'revoke_paid_pass') {
        const adminSessionToken =
          typeof parsed.adminSessionToken === 'string' ? parsed.adminSessionToken : '';
        if (!verifySignedAdminSessionToken(adminSessionToken, deviceTokenHash || 'anon')) {
          sendJson(res, 401, {
            ok: false,
            unauthorized: true,
            message: 'Owner session expired. Please re-enter PIN.',
          });
          return true;
        }

        await hydratePersistentOwnerVaultServer();
        const revResult = revokePaidPassServer(parsed.passKey);
        if (!revResult.ok) {
          sendJson(res, 400, { ok: false, message: revResult.message });
          return true;
        }
        const existingPass =
          SERVER_PASS_STORE.get(revResult.targetKey) ||
          (await fetchStudioPassFromFirestoreRest(revResult.targetKey));
        if (existingPass) {
          const revokedPass = {
            ...existingPass,
            secondaryDeviceHash: REVOKED_PASS_SENTINEL,
            expiresAt: new Date(Date.now() - 1000).toISOString(),
          };
          SERVER_PASS_STORE.set(revResult.targetKey, revokedPass);
          await saveStudioPassToFirestoreRest(revokedPass);
        }
        await savePersistentOwnerVaultServer();

        sendJson(res, 200, {
          ok: true,
          analytics: OWNER_ANALYTICS_STATE,
          testerVouchers: serializeTesterVoucherList(),
          paidPasses: serializePaidPassList(),
        });
        return true;
      }

      // 4D-3b. Toggle Income Pause Mode (for safe end-to-end webhook testing without inflating revenue)
      if (actionType === 'toggle_income_pause') {
        const adminSessionToken =
          typeof parsed.adminSessionToken === 'string' ? parsed.adminSessionToken : '';
        if (!verifySignedAdminSessionToken(adminSessionToken, deviceTokenHash || 'anon')) {
          sendJson(res, 401, {
            ok: false,
            unauthorized: true,
            message: 'Owner session expired. Please re-enter PIN.',
          });
          return true;
        }

        await hydratePersistentOwnerVaultServer();
        toggleIncomePauseServer(typeof parsed.paused === 'boolean' ? parsed.paused : undefined);
        await savePersistentOwnerVaultServer();

        sendJson(res, 200, {
          ok: true,
          incomePausedForTesting: Boolean(OWNER_ANALYTICS_STATE.incomePausedForTesting),
          analytics: OWNER_ANALYTICS_STATE,
          testerVouchers: serializeTesterVoucherList(),
          paidPasses: serializePaidPassList(),
        });
        return true;
      }

      // 4D-3b2. Toggle PH Payments Disabled (forces USD / Ko-fi only while PH live gateway key verifies)
      if (actionType === 'toggle_ph_payments') {
        const adminSessionToken =
          typeof parsed.adminSessionToken === 'string' ? parsed.adminSessionToken : '';
        if (!verifySignedAdminSessionToken(adminSessionToken, deviceTokenHash || 'anon')) {
          sendJson(res, 401, {
            ok: false,
            unauthorized: true,
            message: 'Owner session expired. Please re-enter PIN.',
          });
          return true;
        }

        await hydratePersistentOwnerVaultServer();
        togglePhPaymentsDisabledServer(
          typeof parsed.disabled === 'boolean' ? parsed.disabled : undefined
        );
        await savePersistentOwnerVaultServer();

        sendJson(res, 200, {
          ok: true,
          phPaymentsDisabled: Boolean(OWNER_ANALYTICS_STATE.phPaymentsDisabled),
          analytics: OWNER_ANALYTICS_STATE,
          testerVouchers: serializeTesterVoucherList(),
          paidPasses: serializePaidPassList(),
        });
        return true;
      }

      // 4D-3c. Reset Dashboard Income to $0.00 and optionally clear revoked/test keys
      if (actionType === 'reset_owner_income') {
        const adminSessionToken =
          typeof parsed.adminSessionToken === 'string' ? parsed.adminSessionToken : '';
        if (!verifySignedAdminSessionToken(adminSessionToken, deviceTokenHash || 'anon')) {
          sendJson(res, 401, {
            ok: false,
            unauthorized: true,
            message: 'Owner session expired. Please re-enter PIN.',
          });
          return true;
        }

        await hydratePersistentOwnerVaultServer();
        resetOwnerIncomeServer({
          purgeTestAndRevoked: parsed.purgeTestAndRevoked !== false,
        });
        await savePersistentOwnerVaultServer();

        sendJson(res, 200, {
          ok: true,
          analytics: OWNER_ANALYTICS_STATE,
          testerVouchers: serializeTesterVoucherList(),
          paidPasses: serializePaidPassList(),
        });
        return true;
      }

      // 4D-3d. Clear Test & Revoked keys from Issued Paid Keys ledger
      if (actionType === 'clear_test_and_revoked_keys') {
        const adminSessionToken =
          typeof parsed.adminSessionToken === 'string' ? parsed.adminSessionToken : '';
        if (!verifySignedAdminSessionToken(adminSessionToken, deviceTokenHash || 'anon')) {
          sendJson(res, 401, {
            ok: false,
            unauthorized: true,
            message: 'Owner session expired. Please re-enter PIN.',
          });
          return true;
        }

        await hydratePersistentOwnerVaultServer();
        const removedCount = clearTestAndRevokedPaidKeysServer();
        await savePersistentOwnerVaultServer();

        sendJson(res, 200, {
          ok: true,
          removedCount,
          analytics: OWNER_ANALYTICS_STATE,
          testerVouchers: serializeTesterVoucherList(),
          paidPasses: serializePaidPassList(),
        });
        return true;
      }

      // 4D-4. Admin-Only Gemini Analytics Advisor (Sanitized Metrics Only + Quota Protection)
      if (actionType === 'owner_analytics_ai') {
        const adminSessionToken =
          typeof parsed.adminSessionToken === 'string' ? parsed.adminSessionToken : '';
        if (!verifySignedAdminSessionToken(adminSessionToken, deviceTokenHash || 'anon')) {
          sendJson(res, 401, {
            ok: false,
            unauthorized: true,
            message: 'Owner session expired. Please re-enter PIN.',
          });
          return true;
        }

        await syncRealAnalyticsSnapshotServer();
        const aiResult = await runOwnerAnalyticsAi({
          analytics: OWNER_ANALYTICS_STATE,
          mode: parsed.mode === 'overview' ? 'overview' : 'question',
          question: typeof parsed.question === 'string' ? parsed.question : '',
          history: Array.isArray(parsed.history) ? parsed.history : [],
          adminKey: deviceTokenHash || 'owner',
        });

        sendJson(res, aiResult.statusCode || (aiResult.ok ? 200 : 500), aiResult);
        return true;
      }

      // 4E. Mint a 1-Device Locked Expiring Tester Voucher
      if (actionType === 'mint_tester_voucher') {
        const adminSessionToken =
          typeof parsed.adminSessionToken === 'string' ? parsed.adminSessionToken : '';
        if (!verifySignedAdminSessionToken(adminSessionToken, deviceTokenHash || 'anon')) {
          sendJson(res, 200, {
            ok: false,
            unauthorized: true,
            message: 'Owner session expired. Please re-enter PIN.',
          });
          return true;
        }

        await hydratePersistentOwnerVaultServer();

        const label =
          String(parsed.label || 'Tester Invite')
            .replace(/[|:]/g, ' ')
            .trim()
            .slice(0, 32) || 'Tester Invite';
        const durationHours = Math.max(1, Math.min(24 * 30, Number(parsed.durationHours) || 48));
        const dailyCap = Math.max(1, Math.min(50, Number(parsed.dailyCap) || 10));
        const retentionDays = Number(parsed.retentionDays) === 90 ? 90 : 30;

        const signedPass = createSignedStudioPassServer({
          isTesterVoucher: true,
          tier: 'pass_7d',
          region: 'INTL',
          deviceTokenHash: '',
          durationHours,
          testerLabel: label,
          testerDailyCap: dailyCap,
          retentionDaysOverride: retentionDays,
        });

        SERVER_PASS_STORE.set(signedPass.passKey, signedPass);
        await saveStudioPassToFirestoreRest(signedPass);

        const voucherEntry = {
          passKey: signedPass.passKey,
          label,
          durationHours,
          dailyCap,
          retentionDays,
          createdAt: signedPass.createdAt,
          expiresAt: signedPass.expiresAt,
          status: 'unclaimed',
          claimedDeviceHash: '',
          bouquetsCreated: 0,
          blockedAttempts: 0,
          passRecord: signedPass,
        };
        TESTER_VOUCHER_LEDGER.set(signedPass.passKey, voucherEntry);
        OWNER_ANALYTICS_STATE.passesIssued.tester = Math.max(
          OWNER_ANALYTICS_STATE.passesIssued.tester + 1,
          TESTER_VOUCHER_LEDGER.size
        );
        getTodayDailyBucketServer().passUnlocks += 1;
        pushAnalyticsEventServer(
          'monetization',
          'voucher_minted',
          `Minted ${durationHours}h 1-device Tester Voucher for "${label}" (${signedPass.passKey})`,
          'desktop',
          'INTL'
        );
        await savePersistentOwnerVaultServer();

        sendJson(res, 200, {
          ok: true,
          voucher: voucherEntry,
          pass: signedPass,
          analytics: OWNER_ANALYTICS_STATE,
          testerVouchers: serializeTesterVoucherList(),
        });
        return true;
      }

      // 4F. Revoke a Tester Voucher Immediately
      if (actionType === 'revoke_tester_voucher') {
        const adminSessionToken =
          typeof parsed.adminSessionToken === 'string' ? parsed.adminSessionToken : '';
        if (!verifySignedAdminSessionToken(adminSessionToken, deviceTokenHash || 'anon')) {
          sendJson(res, 200, {
            ok: false,
            unauthorized: true,
            message: 'Owner session expired. Please re-enter PIN.',
          });
          return true;
        }

        await hydratePersistentOwnerVaultServer();

        const targetKey = normalizePassKey(parsed.passKey || '');
        if (!isValidPassKeyFormat(targetKey)) {
          sendJson(res, 400, { ok: false, message: 'Invalid voucher key.' });
          return true;
        }

        REVOKED_VOUCHER_KEYS.add(targetKey);
        const existingPass =
          SERVER_PASS_STORE.get(targetKey) || (await fetchStudioPassFromFirestoreRest(targetKey));
        if (existingPass) {
          const revokedPass = {
            ...existingPass,
            secondaryDeviceHash: REVOKED_PASS_SENTINEL,
            expiresAt: new Date(Date.now() - 1000).toISOString(),
          };
          SERVER_PASS_STORE.set(targetKey, revokedPass);
          await saveStudioPassToFirestoreRest(revokedPass);
        }

        if (TESTER_VOUCHER_LEDGER.has(targetKey)) {
          const item = TESTER_VOUCHER_LEDGER.get(targetKey);
          item.status = 'revoked';
          TESTER_VOUCHER_LEDGER.set(targetKey, item);
        }

        pushAnalyticsEventServer(
          'security',
          'voucher_revoked',
          `Owner revoked Tester Voucher ${targetKey}`,
          'desktop',
          'INTL'
        );
        await savePersistentOwnerVaultServer();

        sendJson(res, 200, {
          ok: true,
          analytics: OWNER_ANALYTICS_STATE,
          testerVouchers: serializeTesterVoucherList(),
        });
        return true;
      }

      // 4G. Update Owner Passphrase / PIN
      if (actionType === 'update_owner_pin') {
        const adminSessionToken =
          typeof parsed.adminSessionToken === 'string' ? parsed.adminSessionToken : '';
        if (!verifySignedAdminSessionToken(adminSessionToken, deviceTokenHash || 'anon')) {
          sendJson(res, 200, {
            ok: false,
            unauthorized: true,
            message: 'Owner session expired. Please re-enter PIN.',
          });
          return true;
        }

        const newPin = String(parsed.newPin || '').trim();
        if (newPin.length < 4 || newPin.length > 32) {
          sendJson(res, 400, {
            ok: false,
            message: 'Passphrase must be between 4 and 32 characters.',
          });
          return true;
        }

        await hydratePersistentOwnerVaultServer();
        cachedCustomOwnerPin = newPin;
        pushAnalyticsEventServer(
          'security',
          'owner_pin_updated',
          'Owner updated the stealth gate passphrase',
          'desktop',
          'INTL'
        );
        await savePersistentOwnerVaultServer();
        sendJson(res, 200, { ok: true, message: 'Owner passphrase updated and saved.' });
        return true;
      }

      // 4H. Standard Studio Pass Verification for Couture Actions (Strict Server-Only Authority)
      const clientPass = parsed.pass && typeof parsed.pass === 'object' ? parsed.pass : null;
      const rawPassKey =
        typeof parsed.passKey === 'string' && parsed.passKey
          ? parsed.passKey
          : clientPass?.passKey || '';
      const clientSessionNonce =
        typeof parsed.activeSessionNonce === 'string' && parsed.activeSessionNonce
          ? parsed.activeSessionNonce
          : clientPass?.activeSessionNonce || '';
      const bouquetCode =
        typeof parsed.bouquetCode === 'string' ? parsed.bouquetCode : null;
      const incrementUsage = Boolean(parsed.incrementUsage);

      const normKey = normalizePassKey(rawPassKey);
      if (
        !isValidPassKeyFormat(normKey) ||
        normKey.startsWith('BLOOM-KS') ||
        normKey.startsWith('BLOOM-BG') ||
        normKey.startsWith('BLOOM-SP') ||
        normKey === 'BLOOM-KCFG-SHOP'
      ) {
        sendJson(res, 403, {
          ok: false,
          status: 'INVALID_FORMAT',
          message: 'No valid Studio Pass found.',
        });
        return true;
      }

      await hydratePersistentOwnerVaultServer();

      const canonicalPass =
        SERVER_PASS_STORE.get(normKey) || (await fetchStudioPassFromFirestoreRest(normKey));

      if (!canonicalPass) {
        sendJson(res, 403, {
          ok: false,
          status: 'NOT_FOUND',
          message: 'Studio Pass could not be verified on the server.',
        });
        return true;
      }

      const check = verifyActiveStudioPassForActionServer({
        pass: canonicalPass,
        deviceTokenHash,
        clientSessionNonce,
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

      if (incrementUsage && TESTER_VOUCHER_LEDGER.has(normKey)) {
        const entry = TESTER_VOUCHER_LEDGER.get(normKey);
        entry.bouquetsCreated = (entry.bouquetsCreated || 0) + 1;
        entry.passRecord = check.updatedPass;
        TESTER_VOUCHER_LEDGER.set(normKey, entry);
        await savePersistentOwnerVaultServer();
      } else if (PAID_PASS_LEDGER.has(normKey)) {
        const entry = PAID_PASS_LEDGER.get(normKey);
        if (incrementUsage) {
          entry.bouquetsCreated = (entry.bouquetsCreated || 0) + 1;
        }
        entry.boundBouquetCode = check.updatedPass.boundBouquetCode || entry.boundBouquetCode || null;
        entry.passRecord = check.updatedPass;
        PAID_PASS_LEDGER.set(normKey, entry);
        await savePersistentOwnerVaultServer();
      }

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
          await hydratePersistentOwnerVaultServer();
          recordPaidPassIssuanceServer(signedPass);
          await savePersistentOwnerVaultServer();
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
          await hydratePersistentOwnerVaultServer();
          recordPaidPassIssuanceServer(signedPass);
          await savePersistentOwnerVaultServer();
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
        const tierSpecificCode =
          resolution.matchedCodeByTier?.[matchedTier] || directLinkCode;
        const slotKey = deriveKofiEmailTierSlotKey(buyerEmail, matchedTier);
        const receiptRecord = createSignedStudioPassServer({
          passKey: slotKey,
          tier: matchedTier,
          region: currency === 'PHP' ? 'PH' : 'INTL',
          deviceTokenHash: '',
          secondaryDeviceHash: null, // Unclaimed until buyer verifies with their email
          boundBouquetCode: tierSpecificCode,
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

    // 7. POST /api/webhooks/bayadgate — BayadGate Callback Notification (Returns raw plaintext "SUCCESS")
    if (pathname === '/api/webhooks/bayadgate' && req.method === 'POST') {
      const { parsed } = await readRequestBody(req);
      const bayadgate = getBayadgateConfig();

      if (!bayadgate.configured) {
        res.statusCode = 503;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('FAIL_NOT_CONFIGURED');
        return true;
      }

      const incomingMerchantId = String(parsed.merchant_id || '').trim();
      if (!timingSafeMatch(bayadgate.merchantId, incomingMerchantId)) {
        res.statusCode = 401;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('FAIL_INVALID_MERCHANT');
        return true;
      }

      if (!verifyBayadgateSignature(parsed, bayadgate.secretKey)) {
        res.statusCode = 401;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('FAIL_INVALID_SIGN');
        return true;
      }

      const txStatus = String(parsed.status || '').trim();
      const orderId = String(parsed.order_id || '').trim();
      if (!orderId) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('FAIL_MISSING_ORDER');
        return true;
      }

      // BayadGate status "5" indicates completed payment; acknowledge non-5 callbacks gracefully
      if (txStatus !== '5') {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('SUCCESS');
        return true;
      }

      const slotKey = deriveBayadgateOrderSlotKey(orderId);
      const orderSlot =
        SERVER_PASS_STORE.get(slotKey) || (await fetchStudioPassFromFirestoreRest(slotKey));

      let pendingEntry = null;
      for (const entry of PENDING_CHECKOUT_STORE.values()) {
        if (entry.bayadgateOrderId === orderId) {
          pendingEntry = entry;
          break;
        }
      }

      if (!orderSlot && !pendingEntry) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('FAIL_ORDER_NOT_FOUND');
        return true;
      }

      // Verify slot cryptographic provenance when loaded from store/Firestore
      if (orderSlot && !verifyServerPaymentReference(orderSlot)) {
        res.statusCode = 403;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('FAIL_INVALID_ORDER_RECORD');
        return true;
      }

      const tier = isValidTier(orderSlot?.tier || pendingEntry?.tier)
        ? orderSlot?.tier || pendingEntry?.tier
        : 'pass_7d';
      const expectedMinor = PRICING_CATALOG.PH[tier]?.amountMinor;
      const incomingMinor = parseBayadgateAmountToMinor(parsed.amount);
      if (!Number.isFinite(incomingMinor) || incomingMinor !== expectedMinor) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('FAIL_AMOUNT_MISMATCH');
        return true;
      }

      // Idempotent guard: already processed
      if (orderSlot?.secondaryDeviceHash === 'PAID' || pendingEntry?.status === 'paid') {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('SUCCESS');
        return true;
      }

      const packedMeta = String(orderSlot?.boundBouquetCode || '');
      const pipeIdx = packedMeta.indexOf('|');
      const decodedPassKey = pipeIdx !== -1 ? packedMeta.slice(0, pipeIdx) : '';
      const decodedBouquetCode = pipeIdx !== -1 ? packedMeta.slice(pipeIdx + 1) : '';
      const targetPassKey = isValidPassKeyFormat(decodedPassKey)
        ? decodedPassKey
        : pendingEntry?.passKey || generatePassKeyCode();
      const targetDeviceHash =
        orderSlot?.primaryDeviceHash || pendingEntry?.deviceTokenHash || 'anonymous_device_hash';
      const targetBouquetCode = decodedBouquetCode || pendingEntry?.boundBouquetCode || null;

      const mintedPass = createSignedStudioPassServer({
        passKey: targetPassKey,
        tier,
        region: 'PH',
        deviceTokenHash: targetDeviceHash,
        boundBouquetCode: targetBouquetCode,
        paymentProvider: 'bayadgate',
        paymentReference: `bg_${orderId}`,
      });

      SERVER_PASS_STORE.set(mintedPass.passKey, mintedPass);
      await saveStudioPassToFirestoreRest(mintedPass);

      if (orderSlot) {
        const paidSlot = { ...orderSlot, secondaryDeviceHash: 'PAID' };
        paidSlot.signature = computePassIntegritySignature(paidSlot, CLIENT_SIGNATURE_SALT);
        SERVER_PASS_STORE.set(slotKey, paidSlot);
        await saveStudioPassToFirestoreRest(paidSlot);
      }

      if (pendingEntry) {
        pendingEntry.status = 'paid';
      }

      await hydratePersistentOwnerVaultServer();
      recordPaidPassIssuanceServer(mintedPass);
      await savePersistentOwnerVaultServer();

      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end('SUCCESS');
      return true;
    }

    // 8. POST /api/webhooks/sikatpay — SikatPay `payment.paid` & `ping` Webhook Listener
    if (pathname === '/api/webhooks/sikatpay' && req.method === 'POST') {
      const { raw, rawExact, parsed } = await readRequestBody(req);
      const sikatpay = getSikatpayConfig();

      if (!sikatpay.webhookSecret) {
        sendJson(res, 503, { ok: false, message: 'SikatPay webhook secret not configured' });
        return true;
      }

      const sigHeader = req.headers?.['x-signature'] || req.headers?.['X-Signature'] || '';
      if (
        !verifySikatpayWebhookSignature(
          rawExact !== undefined ? rawExact : raw,
          sigHeader,
          sikatpay.webhookSecret
        )
      ) {
        sendJson(res, 401, { ok: false, message: 'Invalid SikatPay webhook signature' });
        return true;
      }

      const eventType = String(parsed?.type || '').trim();
      if (eventType === 'ping') {
        sendJson(res, 200, { ok: true, type: 'ping' });
        return true;
      }

      // Acknowledge any unknown future event types with 200 per SikatPay docs
      if (eventType !== 'payment.paid') {
        sendJson(res, 200, { ok: true, ignored: true, type: eventType });
        return true;
      }

      const data = parsed?.data && typeof parsed.data === 'object' ? parsed.data : {};
      const orderId = String(data.order_id || '').trim();
      const paymentLivemode = Boolean(parsed?.livemode ?? data?.livemode);

      // Never let test-mode or dashboard sample events unlock production passes when a live key is active
      if (
        (!sikatpay.isTestKey && !paymentLivemode) ||
        orderId.startsWith('SAMPLE-ORDER-')
      ) {
        sendJson(res, 200, {
          ok: true,
          ignored: true,
          reason: 'TEST_EVENT_ON_LIVE_MODE',
        });
        return true;
      }

      if (!orderId || String(data.status || '') !== 'paid') {
        sendJson(res, 200, { ok: true, ignored: true, reason: 'NON_PAID_OR_MISSING_ORDER' });
        return true;
      }

      const slotKey = deriveSikatpayOrderSlotKey(orderId);
      const orderSlot =
        SERVER_PASS_STORE.get(slotKey) || (await fetchStudioPassFromFirestoreRest(slotKey));

      let pendingEntry = null;
      for (const entry of PENDING_CHECKOUT_STORE.values()) {
        if (entry.sikatpayOrderId === orderId) {
          pendingEntry = entry;
          break;
        }
      }

      if (!orderSlot && !pendingEntry) {
        sendJson(res, 404, { ok: false, message: 'Order not found' });
        return true;
      }

      if (orderSlot && !verifyServerPaymentReference(orderSlot)) {
        sendJson(res, 403, { ok: false, message: 'Invalid order slot provenance' });
        return true;
      }

      const tier = isValidTier(orderSlot?.tier || pendingEntry?.tier)
        ? orderSlot?.tier || pendingEntry?.tier
        : 'pass_7d';
      const expectedMinor = PRICING_CATALOG.PH[tier]?.amountMinor;
      const incomingAmount = Number(data.amount);
      const incomingCurrency = String(data.currency || '').toUpperCase();

      if (
        incomingCurrency !== 'PHP' ||
        !Number.isInteger(incomingAmount) ||
        incomingAmount !== expectedMinor
      ) {
        sendJson(res, 400, { ok: false, message: 'Amount or currency mismatch' });
        return true;
      }

      // Idempotent guard: already fulfilled
      if (orderSlot?.secondaryDeviceHash === 'PAID' || pendingEntry?.status === 'paid') {
        sendJson(res, 200, { ok: true, duplicate: true });
        return true;
      }

      const packedMeta = String(orderSlot?.boundBouquetCode || '');
      const pipeIdx = packedMeta.indexOf('|');
      const decodedPassKey = pipeIdx !== -1 ? packedMeta.slice(0, pipeIdx) : '';
      const decodedBouquetCode = pipeIdx !== -1 ? packedMeta.slice(pipeIdx + 1) : '';
      const targetPassKey = isValidPassKeyFormat(decodedPassKey)
        ? decodedPassKey
        : pendingEntry?.passKey || generatePassKeyCode();
      const targetDeviceHash =
        orderSlot?.primaryDeviceHash || pendingEntry?.deviceTokenHash || 'anonymous_device_hash';
      const targetBouquetCode = decodedBouquetCode || pendingEntry?.boundBouquetCode || null;

      await hydratePersistentOwnerVaultServer();
      const isSikatpayTest =
        sikatpay.isTestKey ||
        !paymentLivemode ||
        Boolean(OWNER_ANALYTICS_STATE.incomePausedForTesting);

      const mintedPass = createSignedStudioPassServer({
        passKey: targetPassKey,
        tier,
        region: 'PH',
        deviceTokenHash: targetDeviceHash,
        boundBouquetCode: targetBouquetCode,
        paymentProvider: 'sikatpay',
        paymentReference: `${isSikatpayTest ? 'sptest' : 'sp'}_${orderId}`,
      });

      SERVER_PASS_STORE.set(mintedPass.passKey, mintedPass);
      await saveStudioPassToFirestoreRest(mintedPass);

      if (orderSlot) {
        const paidSlot = { ...orderSlot, secondaryDeviceHash: 'PAID' };
        paidSlot.signature = computePassIntegritySignature(paidSlot, CLIENT_SIGNATURE_SALT);
        SERVER_PASS_STORE.set(slotKey, paidSlot);
        await saveStudioPassToFirestoreRest(paidSlot);
      }

      if (pendingEntry) {
        pendingEntry.status = 'paid';
      }

      recordPaidPassIssuanceServer(mintedPass, {
        isTest: isSikatpayTest,
        label: isSikatpayTest ? 'SikatPay Test' : 'SikatPay Buyer',
      });
      await savePersistentOwnerVaultServer();

      sendJson(res, 200, { ok: true, passKey: mintedPass.passKey, isTest: isSikatpayTest });
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
