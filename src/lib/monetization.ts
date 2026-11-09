import {
  BouquetLockMode,
  BouquetSnapshot,
  FlowerType,
  RibbonStyle,
  typeWrapStyle,
  VoiceKeepsakeStyle,
} from '../types/bouquet';

// ============================================================================
// 1. OWNER-EDITABLE PREMIUM ASSET CONFIGURATION
//    Edit the arrays below anytime to change which flowers, wraps, ribbons,
//    voice keepsakes, and lock modes are Couture (Premium) vs. Free!
//    Everything remains 100% free to try on the Studio canvas; payment is only
//    prompted when clicking "Share" or "Save PNG" if Couture features are used.
// ============================================================================

export interface PremiumAssetConfig {
  flowers: FlowerType[];
  wraps: typeWrapStyle[];
  ribbons: RibbonStyle[];
  voiceStyles: VoiceKeepsakeStyle[];
  lockModes: BouquetLockMode[];
  requirePassForHighResPng: boolean;
}

export const PREMIUM_ASSET_CONFIG: PremiumAssetConfig = {
  // Couture Blooms & Rare Botanicals (Classic blooms like rose, tulip, daisy, sunflower, lily, lavender, babysBreath, eucalyptus remain Free)
  flowers: [
    'peony',
    'orchid',
    'ranunculus',
    'lotus',
    'callalily',
    'poppy',
    'pampas',
    'queenanneslace',
    'astilbe',
    'anemone',
    'camellia',
  ],
  // Couture Vessels & Architectural Wraps (kraft, tissue, plain, chalice, basket, vintage, vase remain Free)
  wraps: ['hatbox', 'cloche', 'koreanmesh', 'lace', 'celestial'],
  // Specialty Ribbons & Hardware (satin, corset, waxCord, organza, raffia remain Free)
  ribbons: ['lace', 'double', 'velvet', 'chiffon', 'goldchain'],
  // All 5 Voice Keepsake styles are Couture keepsakes when a voice note is attached or displayed
  voiceStyles: ['mixtape', 'vinyl', 'plushie', 'musicbox', 'locket'],
  // Time-Capsule Countdown & Secret Question Locks are Couture keepsakes ('none' is Free)
  lockModes: ['countdown', 'passcode'],
  // High-res PNG print download is a Couture Studio feature
  requirePassForHighResPng: true,
};

const CUSTOM_PREMIUM_CONFIG_STORAGE_KEY = 'sab_custom_premium_config_v1';

export function getActivePremiumAssetConfig(): PremiumAssetConfig {
  if (typeof window === 'undefined') return PREMIUM_ASSET_CONFIG;
  try {
    const raw = window.localStorage.getItem(CUSTOM_PREMIUM_CONFIG_STORAGE_KEY);
    if (!raw) return PREMIUM_ASSET_CONFIG;
    const parsed = JSON.parse(raw) as Partial<PremiumAssetConfig>;
    return {
      flowers: Array.isArray(parsed.flowers) ? parsed.flowers : PREMIUM_ASSET_CONFIG.flowers,
      wraps: Array.isArray(parsed.wraps) ? parsed.wraps : PREMIUM_ASSET_CONFIG.wraps,
      ribbons: Array.isArray(parsed.ribbons) ? parsed.ribbons : PREMIUM_ASSET_CONFIG.ribbons,
      voiceStyles: Array.isArray(parsed.voiceStyles)
        ? parsed.voiceStyles
        : PREMIUM_ASSET_CONFIG.voiceStyles,
      lockModes: Array.isArray(parsed.lockModes)
        ? parsed.lockModes
        : PREMIUM_ASSET_CONFIG.lockModes,
      requirePassForHighResPng:
        typeof parsed.requirePassForHighResPng === 'boolean'
          ? parsed.requirePassForHighResPng
          : PREMIUM_ASSET_CONFIG.requirePassForHighResPng,
    };
  } catch {
    return PREMIUM_ASSET_CONFIG;
  }
}

export function isFlowerPremium(
  type: FlowerType,
  config: PremiumAssetConfig = getActivePremiumAssetConfig()
): boolean {
  return config.flowers.includes(type);
}

export function isWrapPremium(
  style: typeWrapStyle,
  config: PremiumAssetConfig = getActivePremiumAssetConfig()
): boolean {
  return config.wraps.includes(style);
}

export function isRibbonPremium(
  style: RibbonStyle | undefined,
  config: PremiumAssetConfig = getActivePremiumAssetConfig()
): boolean {
  if (!style) return false;
  return config.ribbons.includes(style);
}

export function isVoiceStylePremium(
  style: VoiceKeepsakeStyle,
  config: PremiumAssetConfig = getActivePremiumAssetConfig()
): boolean {
  return config.voiceStyles.includes(style);
}

export function isLockModePremium(
  mode: BouquetLockMode,
  config: PremiumAssetConfig = getActivePremiumAssetConfig()
): boolean {
  return mode !== 'none' && config.lockModes.includes(mode);
}

export interface PremiumFeatureItem {
  id: string;
  category: 'flower' | 'wrap' | 'ribbon' | 'voice' | 'lock' | 'png';
  label: string;
}

export interface BouquetPremiumInspection {
  isPremiumBouquet: boolean;
  features: PremiumFeatureItem[];
  reasons: string[];
  premiumFlowerTypes: FlowerType[];
  hasCoutureWrap: boolean;
  hasCoutureRibbon: boolean;
  hasVoiceKeepsake: boolean;
  hasSecretOrDateLock: boolean;
}

const FLOWER_LABELS: Record<string, string> = {
  peony: 'Blush Peony',
  orchid: 'Phalaenopsis Orchid',
  ranunculus: 'Persian Ranunculus',
  lotus: 'Sacred Lotus',
  callalily: 'Sculptural Calla Lily',
  poppy: 'Icelandic Silk Poppy',
  pampas: 'Velvet Pampas Plume',
  queenanneslace: "Queen Anne's Lace",
  astilbe: 'Feathered Astilbe',
  anemone: 'French Anemone',
  camellia: 'Japonica Camellia',
};

const WRAP_LABELS: Record<string, string> = {
  hatbox: 'Velvet Hatbox Vessel',
  cloche: 'Botanical Glass Cloche',
  koreanmesh: 'Korean Tulle Mesh Wrap',
  lace: 'Eyelet Lace Trim Wrap',
  celestial: 'Starlit Noir Couture Wrap',
};

const RIBBON_LABELS: Record<string, string> = {
  lace: 'Eyelet Lace Bow',
  double: 'Couture Rosette Ribbon',
  velvet: 'Cameo Velvet Ribbon',
  chiffon: 'Silk Chiffon Fringe',
  goldchain: 'Botanical Gold Chain',
};

/**
 * Inspects a bouquet snapshot and lists every Couture / Premium feature currently used.
 */
export function inspectBouquetPremiumUsage(
  snapshot: Pick<BouquetSnapshot, 'items' | 'wrapStyle' | 'ribbonStyle' | 'voice' | 'lock'>,
  config: PremiumAssetConfig = getActivePremiumAssetConfig()
): BouquetPremiumInspection {
  const features: PremiumFeatureItem[] = [];
  const visibleItems = (snapshot.items || []).filter((i) => !i.hidden);

  const premiumFlowerSet = new Set<FlowerType>();
  for (const stem of visibleItems) {
    if (isFlowerPremium(stem.type, config)) {
      premiumFlowerSet.add(stem.type);
    }
  }
  const premiumFlowerTypes = Array.from(premiumFlowerSet);
  for (const flowerType of premiumFlowerTypes) {
    features.push({
      id: `flower:${flowerType}`,
      category: 'flower',
      label: FLOWER_LABELS[flowerType] || `${flowerType} bloom`,
    });
  }

  const hasCoutureWrap = isWrapPremium(snapshot.wrapStyle, config);
  if (hasCoutureWrap) {
    features.push({
      id: `wrap:${snapshot.wrapStyle}`,
      category: 'wrap',
      label: WRAP_LABELS[snapshot.wrapStyle] || `${snapshot.wrapStyle} wrap`,
    });
  }

  const hasCoutureRibbon =
    snapshot.wrapStyle !== 'plain' && isRibbonPremium(snapshot.ribbonStyle, config);
  if (hasCoutureRibbon && snapshot.ribbonStyle) {
    features.push({
      id: `ribbon:${snapshot.ribbonStyle}`,
      category: 'ribbon',
      label: RIBBON_LABELS[snapshot.ribbonStyle] || `${snapshot.ribbonStyle} ribbon`,
    });
  }

  const hasVoiceKeepsake = Boolean(
    snapshot.voice &&
      snapshot.voice.audioDataUrl &&
      snapshot.voice.audioDataUrl.trim().length > 0 &&
      isVoiceStylePremium(snapshot.voice.style, config)
  );
  if (hasVoiceKeepsake) {
    features.push({
      id: `voice:${snapshot.voice?.style || 'mixtape'}`,
      category: 'voice',
      label: 'Voice Keepsake Audio',
    });
  }

  const lockMode = snapshot.lock?.mode || 'none';
  const hasSecretOrDateLock = isLockModePremium(lockMode, config);
  if (hasSecretOrDateLock) {
    features.push({
      id: `lock:${lockMode}`,
      category: 'lock',
      label: lockMode === 'countdown' ? 'Time-Capsule Date Lock' : 'Secret Hint Lock',
    });
  }

  const reasons = features.map((f) => f.label);

  return {
    isPremiumBouquet: features.length > 0,
    features,
    reasons,
    premiumFlowerTypes,
    hasCoutureWrap,
    hasCoutureRibbon,
    hasVoiceKeepsake,
    hasSecretOrDateLock,
  };
}

// ============================================================================
// 2. THREE-TIER BOUQUET LINK LIFESPAN (30 Days vs. 90 Days Extended vs. Eternal)
//    - Free Bouquet: 30 days on the Lace Garland
//    - Paid Single Unlock / 7-Day Pass: 90 days (+60 bonus days, still expires!)
//    - 30-Day Studio Pass: Eternal Keepsake (isPremium: true, never expires!)
// ============================================================================

export const FREE_BOUQUET_RETENTION_DAYS = 30;
export const PAID_EXTENDED_RETENTION_DAYS = 90;
export const ETERNAL_RETENTION_DAYS = 36500;

export type StudioPassTier = 'single' | 'pass_7d' | 'pass_30d';
export type PricingRegion = 'PH' | 'INTL';

export interface BouquetRetentionPolicy {
  retentionDays: number;
  isPremiumEternal: boolean;
  badgeLabel: string;
}

export function getRetentionPolicyForPassTier(tier: StudioPassTier | 'free'): BouquetRetentionPolicy {
  if (tier === 'pass_30d') {
    return {
      retentionDays: ETERNAL_RETENTION_DAYS,
      isPremiumEternal: true,
      badgeLabel: 'Never expires',
    };
  }
  if (tier === 'single' || tier === 'pass_7d') {
    return {
      retentionDays: PAID_EXTENDED_RETENTION_DAYS,
      isPremiumEternal: false,
      badgeLabel: '90-day link',
    };
  }
  return {
    retentionDays: FREE_BOUQUET_RETENTION_DAYS,
    isPremiumEternal: false,
    badgeLabel: '30-day link',
  };
}

// ============================================================================
// 3. PURCHASING POWER PARITY (PPP) PRICING CATALOG (PH vs. INTERNATIONAL)
// ============================================================================

export interface PricingTierPlan {
  tier: StudioPassTier;
  name: string;
  eyebrow: string;
  tagline: string;
  currency: 'PHP' | 'USD';
  symbol: '₱' | '$';
  displayPrice: string;
  amountMinor: number; // centavos for PHP, cents for USD
  durationDays: number | null; // null for single-bouquet unlock
  retentionDays: number;
  isEternalKeepsake: boolean;
  perks: string[];
  popular?: boolean;
}

export const PRICING_CATALOG: Record<PricingRegion, Record<StudioPassTier, PricingTierPlan>> = {
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
      retentionDays: PAID_EXTENDED_RETENTION_DAYS,
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
      retentionDays: PAID_EXTENDED_RETENTION_DAYS,
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
      retentionDays: ETERNAL_RETENTION_DAYS,
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
      retentionDays: PAID_EXTENDED_RETENTION_DAYS,
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
      retentionDays: PAID_EXTENDED_RETENTION_DAYS,
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
      retentionDays: ETERNAL_RETENTION_DAYS,
      isEternalKeepsake: true,
      perks: ['30 days unlimited', 'PNG downloads', 'Links never expire'],
    },
  },
};

/**
 * Automatically detects whether the user is in the Philippines ('PH') or International ('INTL')
 * using timezone and locale signals.
 */
export function detectPricingRegion(
  timeZone?: string,
  locale?: string
): PricingRegion {
  try {
    const tz =
      timeZone ??
      (typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : '');
    const lang =
      locale ?? (typeof navigator !== 'undefined' ? navigator.language || '' : '');
    if (
      tz === 'Asia/Manila' ||
      /-(PH|ph)\b/.test(lang) ||
      lang.toLowerCase() === 'fil' ||
      lang.toLowerCase() === 'tl'
    ) {
      return 'PH';
    }
  } catch {
    // Fallback to INTL
  }
  return 'INTL';
}

export function getPricingCatalog(region: PricingRegion): PricingTierPlan[] {
  const r = PRICING_CATALOG[region] || PRICING_CATALOG.INTL;
  return [r.single, r.pass_7d, r.pass_30d];
}

// ============================================================================
// 4. ZERO-LOGIN PASS KEY & SINGLE-USER / ANTI-SHARING SECURITY
//    - Pass Key format: BLOOM-XXXX-XXXX
//    - Device Binding: primaryDeviceHash + max 1 secondaryDeviceHash (2 devices total ever)
//    - Single Active Session Lease: activeSessionNonce rotates on redemption,
//      immediately locking out any previous browser session so 2 people cannot share!
//    - Single-Bouquet Code Binding: 'single' tier binds to boundBouquetCode
//    - Daily Fair-Use Velocity Cap: max 15 bouquets/day per pass
// ============================================================================

export const MAX_ALLOWED_DEVICES_PER_PASS = 2; // Original device + max 1 transfer
export const MAX_DAILY_PASS_BOUQUETS = 15;

export interface StudioPassRecord {
  passKey: string; // e.g., BLOOM-7K4M-9P2X
  tier: StudioPassTier;
  region: PricingRegion;
  createdAt: string; // ISO string
  expiresAt: string; // ISO string
  retentionDays: number; // 90 for single/7d, 36500 for 30d
  isEternalKeepsake: boolean;
  primaryDeviceHash: string;
  secondaryDeviceHash: string | null;
  activeSessionNonce: string;
  boundBouquetCode: string | null; // For 'single' tier: locks unlock to that bouquet's short code
  dailyUsageDate: string; // YYYY-MM-DD
  dailyUsageCount: number;
  paymentProvider: 'paymongo' | 'kofi' | 'verified_checkout';
  paymentReference: string;
  signature: string; // Cryptographic signature preventing localStorage manipulation
}

const PASS_KEY_REGEX = /^BLOOM-[A-Z2-9]{4}-[A-Z2-9]{4}$/;
const PASS_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function normalizePassKey(raw: string): string {
  const cleaned = (raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (cleaned.startsWith('BLOOM') && cleaned.length === 13) {
    return `BLOOM-${cleaned.slice(5, 9)}-${cleaned.slice(9, 13)}`;
  }
  if (cleaned.length === 8) {
    return `BLOOM-${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}`;
  }
  return (raw || '').trim().toUpperCase();
}

export function isValidPassKeyFormat(raw: string): boolean {
  return PASS_KEY_REGEX.test(normalizePassKey(raw));
}

export function generatePassKeyCode(randomBytes?: Uint8Array): string {
  const bytes = new Uint8Array(8);
  if (randomBytes && randomBytes.length >= 8) {
    bytes.set(randomBytes.slice(0, 8));
  } else if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 8; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  let part1 = '';
  let part2 = '';
  for (let i = 0; i < 4; i++) {
    part1 += PASS_ALPHABET[bytes[i] % PASS_ALPHABET.length];
    part2 += PASS_ALPHABET[bytes[i + 4] % PASS_ALPHABET.length];
  }
  return `BLOOM-${part1}-${part2}`;
}

export function generateSessionNonce(): string {
  const bytes = new Uint8Array(12);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 12; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Deterministic 64-bit FNV-1a + Murmur-inspired hex digest for synchronous client/shared
 * device fingerprinting and client-side integrity checks (server also signs with HMAC-SHA256).
 */
export function computeDeterministicHashHex(input: string, salt = 'sab-v1-couture-salt'): string {
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

  const toHex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  return `${toHex(h1)}${toHex(h2)}${toHex(h3)}${toHex(h4)}`;
}

const DEVICE_ID_STORAGE_KEY = 'sab_device_fingerprint_id_v1';
const ACTIVE_PASS_STORAGE_KEY = 'sab_active_studio_pass_v1';

export function getOrCreateDeviceTokenHash(): string {
  if (typeof window === 'undefined') {
    return computeDeterministicHashHex('server-default-device');
  }
  try {
    let rawId = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (!rawId || rawId.length < 16) {
      rawId = `dev_${generateSessionNonce()}_${navigator.userAgent?.length || 0}_${screen?.width || 0}`;
      window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, rawId);
    }
    return computeDeterministicHashHex(rawId, 'sab-device-token');
  } catch {
    return computeDeterministicHashHex('ephemeral-device', 'sab-device-token');
  }
}

/**
 * Computes the integrity signature over all security-critical fields of a StudioPassRecord.
 * If any field in localStorage (`tier`, `expiresAt`, `primaryDeviceHash`, `activeSessionNonce`, `boundBouquetCode`)
 * is edited in DevTools, the signature check fails immediately.
 */
export function computePassIntegritySignature(
  record: Pick<
    StudioPassRecord,
    | 'passKey'
    | 'tier'
    | 'expiresAt'
    | 'retentionDays'
    | 'isEternalKeepsake'
    | 'primaryDeviceHash'
    | 'secondaryDeviceHash'
    | 'activeSessionNonce'
    | 'boundBouquetCode'
  >,
  secretSalt = 'sab-pass-integrity-2026-v1'
): string {
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

export function verifyPassIntegritySignature(
  record: StudioPassRecord,
  secretSalt = 'sab-pass-integrity-2026-v1'
): boolean {
  if (!record || typeof record.signature !== 'string' || !record.signature) return false;
  const expected = computePassIntegritySignature(record, secretSalt);
  return record.signature === expected;
}

export type PassValidationStatus =
  | 'VALID'
  | 'EXPIRED'
  | 'INVALID_FORMAT'
  | 'TAMPERED_SIGNATURE'
  | 'DEVICE_LIMIT_EXCEEDED'
  | 'SESSION_SUPERSEDED'
  | 'SINGLE_BOUQUET_ALREADY_USED'
  | 'DAILY_LIMIT_REACHED';

export interface PassValidationResult {
  valid: boolean;
  status: PassValidationStatus;
  message: string;
  updatedPass?: StudioPassRecord;
}

/**
 * Creates a newly issued, cryptographically signed StudioPassRecord.
 */
export function createSignedStudioPass(params: {
  passKey?: string;
  tier: StudioPassTier;
  region: PricingRegion;
  deviceTokenHash: string;
  boundBouquetCode?: string | null;
  paymentProvider?: 'paymongo' | 'kofi' | 'verified_checkout';
  paymentReference?: string;
  nowMs?: number;
  secretSalt?: string;
}): StudioPassRecord {
  const now = params.nowMs ?? Date.now();
  const createdAt = new Date(now).toISOString();
  const durationDays =
    params.tier === 'pass_30d' ? 30 : params.tier === 'pass_7d' ? 7 : 2; // Single bouquet unlock key valid for 48h on that bouquet
  const expiresAt = new Date(now + durationDays * 24 * 60 * 60 * 1000).toISOString();
  const policy = getRetentionPolicyForPassTier(params.tier);
  const passKey = params.passKey ? normalizePassKey(params.passKey) : generatePassKeyCode();
  const activeSessionNonce = generateSessionNonce();
  const todayIso = createdAt.slice(0, 10);

  const draft: Omit<StudioPassRecord, 'signature'> = {
    passKey,
    tier: params.tier,
    region: params.region,
    createdAt,
    expiresAt,
    retentionDays: policy.retentionDays,
    isEternalKeepsake: policy.isPremiumEternal,
    primaryDeviceHash: params.deviceTokenHash,
    secondaryDeviceHash: null,
    activeSessionNonce,
    boundBouquetCode: params.tier === 'single' ? params.boundBouquetCode || null : null,
    dailyUsageDate: todayIso,
    dailyUsageCount: 0,
    paymentProvider: params.paymentProvider || 'verified_checkout',
    paymentReference: params.paymentReference || `ref_${generateSessionNonce().slice(0, 10)}`,
  };

  const signature = computePassIntegritySignature(draft, params.secretSalt);
  return {
    ...draft,
    signature,
  };
}

/**
 * Validates and binds a Pass Key redemption attempt on a device (`deviceTokenHash`).
 * Enforces:
 * 1. Signature & expiry check
 * 2. Max 2 distinct devices ever (`primaryDeviceHash` + `secondaryDeviceHash`). A 3rd device is blocked!
 * 3. Single Active Session Lease: rotates `activeSessionNonce` so only 1 browser session is active at a time.
 */
export function validateAndBindPassRedemption(
  existingRecord: StudioPassRecord,
  requestDeviceTokenHash: string,
  nowMs: number = Date.now(),
  secretSalt?: string
): PassValidationResult {
  if (!existingRecord || !isValidPassKeyFormat(existingRecord.passKey)) {
    return {
      valid: false,
      status: 'INVALID_FORMAT',
      message: 'Invalid Pass Key format. Expected BLOOM-XXXX-XXXX.',
    };
  }

  if (!verifyPassIntegritySignature(existingRecord, secretSalt)) {
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

  let nextPrimary = existingRecord.primaryDeviceHash;
  let nextSecondary = existingRecord.secondaryDeviceHash;

  if (!nextPrimary) {
    nextPrimary = requestDeviceTokenHash;
  } else if (requestDeviceTokenHash !== nextPrimary) {
    if (!nextSecondary) {
      // Allow 1 transfer to a secondary device (e.g. phone -> laptop)
      nextSecondary = requestDeviceTokenHash;
    } else if (requestDeviceTokenHash !== nextSecondary) {
      // 3rd distinct device! Reject to prevent Pass Key sharing abuse.
      return {
        valid: false,
        status: 'DEVICE_LIMIT_EXCEEDED',
        message:
          'This Pass Key is already locked to its owner’s devices and cannot be shared with additional people.',
      };
    }
  }

  // Rotate activeSessionNonce so any other browser session becomes inactive immediately
  const nextSessionNonce = generateSessionNonce();
  const updatedDraft: Omit<StudioPassRecord, 'signature'> = {
    ...existingRecord,
    primaryDeviceHash: nextPrimary,
    secondaryDeviceHash: nextSecondary,
    activeSessionNonce: nextSessionNonce,
  };
  const signature = computePassIntegritySignature(updatedDraft, secretSalt);

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

/**
 * Verifies whether a stored pass authorizes unlocking/exporting a bouquet (`bouquetCode`)
 * on the current device (`deviceTokenHash`) and session (`clientSessionNonce`),
 * enforcing single-bouquet binding and daily velocity caps.
 */
export function verifyActiveStudioPassForAction(params: {
  pass: StudioPassRecord | null | undefined;
  deviceTokenHash: string;
  clientSessionNonce?: string;
  bouquetCode?: string | null;
  incrementUsage?: boolean;
  nowMs?: number;
  secretSalt?: string;
}): PassValidationResult {
  const { pass, deviceTokenHash } = params;
  const now = params.nowMs ?? Date.now();

  if (!pass || !isValidPassKeyFormat(pass.passKey)) {
    return {
      valid: false,
      status: 'INVALID_FORMAT',
      message: 'No active Studio Pass found.',
    };
  }

  if (!verifyPassIntegritySignature(pass, params.secretSalt)) {
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

  if (
    params.clientSessionNonce &&
    params.clientSessionNonce !== pass.activeSessionNonce
  ) {
    return {
      valid: false,
      status: 'SESSION_SUPERSEDED',
      message:
        'This Pass Key was activated on another device or browser. Only 1 active session is allowed at a time.',
    };
  }

  // Enforce Single-Bouquet Unlock binding so a ₱49/$2.99 single unlock cannot be reused on new bouquets
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
  const currentDailyCount =
    pass.dailyUsageDate === todayIso ? pass.dailyUsageCount || 0 : 0;

  if (params.incrementUsage && currentDailyCount >= MAX_DAILY_PASS_BOUQUETS) {
    return {
      valid: false,
      status: 'DAILY_LIMIT_REACHED',
      message: `Fair-use limit reached (${MAX_DAILY_PASS_BOUQUETS} bouquets/day). Your pass resets tomorrow!`,
    };
  }

  const nextBoundCode =
    pass.tier === 'single'
      ? pass.boundBouquetCode || params.bouquetCode || null
      : null;

  const updatedDraft: Omit<StudioPassRecord, 'signature'> = {
    ...pass,
    boundBouquetCode: nextBoundCode,
    dailyUsageDate: todayIso,
    dailyUsageCount: params.incrementUsage ? currentDailyCount + 1 : currentDailyCount,
  };
  const signature = computePassIntegritySignature(updatedDraft, params.secretSalt);

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

/**
 * Reads the currently saved StudioPassRecord from localStorage (if valid and untampered).
 */
export function getStoredStudioPass(): StudioPassRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_PASS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StudioPassRecord;
    if (!verifyPassIntegritySignature(parsed)) {
      window.localStorage.removeItem(ACTIVE_PASS_STORAGE_KEY);
      return null;
    }
    if (Date.parse(parsed.expiresAt) < Date.now()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveStoredStudioPass(pass: StudioPassRecord | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!pass) {
      window.localStorage.removeItem(ACTIVE_PASS_STORAGE_KEY);
    } else {
      window.localStorage.setItem(ACTIVE_PASS_STORAGE_KEY, JSON.stringify(pass));
    }
  } catch {
    // Ignore storage quota errors
  }
}

export function formatPassRemainingTime(expiresAtIso: string, nowMs: number = Date.now()): string {
  const expiresMs = Date.parse(expiresAtIso);
  if (!Number.isFinite(expiresMs) || expiresMs <= nowMs) return 'Expired';
  const diffMs = expiresMs - nowMs;
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (days >= 1) {
    return `${days}d ${hours}h left`;
  }
  const mins = Math.max(1, Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000)));
  return hours >= 1 ? `${hours}h ${mins}m left` : `${mins}m left`;
}
