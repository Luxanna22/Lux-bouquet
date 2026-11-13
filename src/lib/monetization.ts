import {
  BouquetLockMode,
  BouquetSnapshot,
  CanvasEnvironment,
  FlowerType,
  PhotoFrameStyle,
  RibbonStyle,
  typeWrapStyle,
  VoiceKeepsakeStyle,
} from '../types/bouquet';

// ============================================================================
// 1. OWNER-EDITABLE PREMIUM ASSET CONFIGURATION
//    Edit the arrays below anytime to change which flowers, wraps, ribbons,
//    backgrounds, photos, voice keepsakes, card notes, and lock modes are
//    Couture (Premium) vs. Free!
//    Everything remains 100% free to try on the Studio canvas; payment is only
//    prompted when clicking "Share" or "Save PNG" if Couture features are used.
// ============================================================================

export const FREE_CARD_NOTE_MAX_CHARS = 560;
export const PREMIUM_CARD_NOTE_MAX_CHARS = 1500;

export interface PremiumAssetConfig {
  flowers: FlowerType[];
  wraps: typeWrapStyle[];
  ribbons: RibbonStyle[];
  environments?: CanvasEnvironment[];
  photoStyles?: PhotoFrameStyle[];
  voiceStyles: VoiceKeepsakeStyle[];
  lockModes: BouquetLockMode[];
  freeCardNoteMaxChars?: number;
  requirePassForHighResPng: boolean;
}

export const PREMIUM_ASSET_CONFIG: PremiumAssetConfig = {
  // Couture Blooms & Glimmering Luxury Botanicals (17 items)
  flowers: [
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
    // Couture 'Others' Charms, Celestial Sun & Gift Keepsakes (11 items)
    'gildedSunburst',
    'sunbeamSuncatcher',
    'crystalButterfly',
    'doubleHeartCharm',
    'lovebirdPerch',
    'waxSealCrest',
    'fairyLightGarland',
    'sittingDog',
    'lovelyCats',
    'chocolates',
    'ringInABox',
  ],
  // Couture Vessels & Architectural Wraps (4 items: Ceramic Vase, Velvet Hatbox, Glass Cloche, Korean Mesh)
  wraps: ['vase', 'hatbox', 'cloche', 'koreanmesh'],
  // Specialty & Luxury Couture Ribbons (8 items)
  ribbons: [
    'pearlStrand',
    'celestialSilk',
    'waxCord',
    'organza',
    'velvet',
    'chiffon',
    'goldchain',
    'raffia',
  ],
  // Couture Atmospheric & Shimmering Backgrounds (6 items)
  environments: ['aurora', 'velvetSalon', 'opalMist', 'starlit', 'crystalPalace', 'midnightNoel'],
  // All Photo Uploads & Botanical Photocards are Couture Keepsakes
  photoStyles: ['raw', 'polaroid', 'stamp', 'cameo', 'film', 'pressed', 'arch'],
  // All 10 Voice Keepsake styles & Voice Recording are Couture Keepsakes
  voiceStyles: [
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
  ],
  // Time-Capsule Countdown & Secret Question Locks are Couture keepsakes ('none' is Free)
  lockModes: ['countdown', 'passcode'],
  // Notes longer than 560 characters (up to 1500 characters) are Couture Extended Notes
  freeCardNoteMaxChars: FREE_CARD_NOTE_MAX_CHARS,
  // High-res PNG print download is a Couture Studio feature
  requirePassForHighResPng: true,
};

export function getActivePremiumAssetConfig(): PremiumAssetConfig {
  return PREMIUM_ASSET_CONFIG;
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

export function isEnvironmentPremium(
  env: CanvasEnvironment | undefined,
  config: PremiumAssetConfig = getActivePremiumAssetConfig()
): boolean {
  if (!env) return false;
  const list = config.environments || PREMIUM_ASSET_CONFIG.environments || [];
  return list.includes(env);
}

export function isPhotoStylePremium(
  style: PhotoFrameStyle | undefined,
  config: PremiumAssetConfig = getActivePremiumAssetConfig()
): boolean {
  if (!style) return false;
  const list = config.photoStyles || PREMIUM_ASSET_CONFIG.photoStyles || [];
  return list.includes(style);
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
  category:
    | 'flower'
    | 'wrap'
    | 'ribbon'
    | 'environment'
    | 'photo'
    | 'voice'
    | 'card'
    | 'lock'
    | 'png';
  label: string;
}

export interface BouquetPremiumInspection {
  isPremiumBouquet: boolean;
  features: PremiumFeatureItem[];
  reasons: string[];
  premiumFlowerTypes: FlowerType[];
  hasCoutureWrap: boolean;
  hasCoutureRibbon: boolean;
  hasCoutureEnvironment: boolean;
  hasPhotoKeepsake: boolean;
  hasVoiceKeepsake: boolean;
  hasLongCardNote: boolean;
  hasSecretOrDateLock: boolean;
}

const FLOWER_LABELS: Record<string, string> = {
  celestialRose: 'Gilded Rose',
  crystalOrchid: 'Crystal Orchid',
  luminaPeony: 'Starlight Peony',
  gildedFern: 'Gilded Fern',
  starlightGypsophila: 'Starlight Spray',
  iris: 'Iris',
  camellia: 'Camellia',
  lotus: 'Lotus',
  callalily: 'Calla Lily',
  poppy: 'Poppy',
  sweetpea: 'Sweet Pea',
  freesia: 'Freesia',
  oliveBranch: 'Olive',
  monstera: 'Monstera',
  pampas: 'Pampas',
  queenanneslace: 'Lace Umbel',
  astilbe: 'Astilbe',
  auroraGardenia: 'Silk Gardenia',
  velvetBaccara: 'Noir Baccara',
  imperialFritillaria: 'Crown Bell',
  julietAustinRose: 'Juliet Rose',
  lunariaHonesty: 'Moonwort',
  poinsettia: 'Poinsettia',
  hollyBerries: 'Holly Berry',
  mistletoeBough: 'Mistletoe',
  amaryllis: 'Amaryllis',
  frostedPinecone: 'Pinecone',
  glassOrnament: 'Glass Bauble',
  cinnamonStarAnise: 'Spice & Anise',
  gildedSunburst: 'Gilded Sun',
  sunbeamSuncatcher: 'Sun Suncatcher',
  crystalButterfly: 'Morpho Butterfly',
  doubleHeartCharm: 'Twin Hearts',
  lovebirdPerch: 'Lovebird',
  waxSealCrest: 'Wax Seal',
  fairyLightGarland: 'Firefly Lights',
  sittingDog: 'Sitting Dog',
  lovelyCats: 'Lovely Cats',
  moon: 'Crescent Moon',
  sun: 'Radiant Sun',
  star: 'Wishing Star',
  clouds: 'Dreamy Clouds',
  chocolates: 'Chocolates',
  ringInABox: 'Ring in a Box',
};

const WRAP_LABELS: Record<string, string> = {
  vase: 'Ceramic Vase',
  hatbox: 'Velvet Hatbox',
  cloche: 'Glass Cloche',
  koreanmesh: 'Korean Mesh',
};

const RIBBON_LABELS: Record<string, string> = {
  pearlStrand: 'Akoya Pearl',
  celestialSilk: 'Starlight Silk',
  waxCord: 'Twine & Seal',
  organza: 'Sheer Chiffon',
  velvet: 'Cameo Velvet',
  chiffon: 'Chiffon Fringe',
  goldchain: 'Gold Chain',
  raffia: 'Botanical Raffia',
};

const ENVIRONMENT_LABELS: Record<string, string> = {
  aurora: 'Gilded Aurora',
  velvetSalon: 'Royal Filigree',
  opalMist: 'Opaline Sunbeam',
  starlit: 'Evening Glow',
  crystalPalace: 'Versailles Crystal',
  midnightNoel: 'Midnight Noel',
};

/**
 * Inspects a bouquet snapshot and lists every Couture / Premium feature currently used.
 */
export function inspectBouquetPremiumUsage(
  snapshot: Pick<BouquetSnapshot, 'items' | 'wrapStyle' | 'ribbonStyle' | 'voice' | 'lock'> &
    Partial<Pick<BouquetSnapshot, 'environment' | 'card'>>,
  config: PremiumAssetConfig = getActivePremiumAssetConfig()
): BouquetPremiumInspection {
  const features: PremiumFeatureItem[] = [];
  const visibleItems = (snapshot.items || []).filter((i) => !i.hidden);

  const premiumFlowerSet = new Set<FlowerType>();
  let hasPhotoKeepsake = false;
  for (const stem of visibleItems) {
    if (stem.photoStyle) {
      if (isPhotoStylePremium(stem.photoStyle, config)) {
        hasPhotoKeepsake = true;
      }
      continue;
    }
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

  if (hasPhotoKeepsake) {
    features.push({
      id: 'photo:keepsake',
      category: 'photo',
      label: 'Photo Keepsake',
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

  const hasCoutureEnvironment = isEnvironmentPremium(snapshot.environment, config);
  if (hasCoutureEnvironment && snapshot.environment) {
    features.push({
      id: `environment:${snapshot.environment}`,
      category: 'environment',
      label: ENVIRONMENT_LABELS[snapshot.environment] || `${snapshot.environment} background`,
    });
  }

  const hasVoiceKeepsake = Boolean(
    snapshot.voice &&
      (snapshot.voice.visibleOnStage ||
        (snapshot.voice.audioDataUrl && snapshot.voice.audioDataUrl.trim().length > 0)) &&
      isVoiceStylePremium(snapshot.voice.style, config)
  );
  if (hasVoiceKeepsake) {
    features.push({
      id: `voice:${snapshot.voice?.style || 'mixtape'}`,
      category: 'voice',
      label: 'Voice Keepsake',
    });
  }

  const freeNoteLimit = config.freeCardNoteMaxChars ?? FREE_CARD_NOTE_MAX_CHARS;
  const hasLongCardNote = Boolean(
    snapshot.card &&
      snapshot.card.visibleOnStage !== false &&
      (snapshot.card.message || '').trim().length > freeNoteLimit
  );
  if (hasLongCardNote) {
    features.push({
      id: 'card:longNote',
      category: 'card',
      label: 'Extended Card Note',
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
    hasCoutureEnvironment,
    hasPhotoKeepsake,
    hasVoiceKeepsake,
    hasLongCardNote,
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
export const TESTER_SINGLE_DEVICE_SENTINEL = 'TESTER_SINGLE_DEVICE_LOCK';
export const REVOKED_PASS_SENTINEL = 'REVOKED_BY_OWNER';

export interface StudioPassRecord {
  passKey: string; // e.g., BLOOM-7K4M-9P2X or BLOOM-TV4M-9P2X
  tier: StudioPassTier;
  region: PricingRegion;
  createdAt: string; // ISO string
  expiresAt: string; // ISO string
  retentionDays: number; // 90 for single/7d, 36500 for 30d
  isEternalKeepsake: boolean;
  primaryDeviceHash: string;
  secondaryDeviceHash: string | null;
  activeSessionNonce: string;
  boundBouquetCode: string | null; // For 'single' tier: locks unlock to that bouquet's short code; for tester voucher: 'TV:<cap>:<label>'
  dailyUsageDate: string; // YYYY-MM-DD
  dailyUsageCount: number;
  paymentProvider: 'sikatpay' | 'bayadgate' | 'paymongo' | 'kofi' | 'verified_checkout' | 'tester_voucher';
  paymentReference: string;
  signature: string; // Cryptographic signature preventing localStorage manipulation
}

export type BayadgatePaymentMethod = 'GCASH' | 'MAYA' | 'GOTYME';

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

export function generateTesterVoucherKeyCode(randomBytes?: Uint8Array): string {
  const base = generatePassKeyCode(randomBytes);
  // Prefix first block with TV (both T and V are valid in PASS_ALPHABET)
  return `BLOOM-TV${base.slice(8, 10)}-${base.slice(11, 15)}`;
}

export function isTesterVoucherPass(
  pass:
    | Pick<StudioPassRecord, 'passKey' | 'paymentProvider' | 'secondaryDeviceHash'>
    | null
    | undefined
): boolean {
  if (!pass) return false;
  return (
    pass.paymentProvider === 'tester_voucher' ||
    pass.secondaryDeviceHash === TESTER_SINGLE_DEVICE_SENTINEL ||
    normalizePassKey(pass.passKey).startsWith('BLOOM-TV')
  );
}

export function parseTesterVoucherMeta(
  input?: string | Pick<StudioPassRecord, 'boundBouquetCode' | 'paymentReference'> | null
): {
  isTester: boolean;
  dailyCap: number;
  label: string;
} {
  const raw =
    typeof input === 'object' && input !== null
      ? (input.boundBouquetCode || input.paymentReference || '').trim()
      : (input || '').trim();
  if (raw.startsWith('TV:')) {
    const parts = raw.split(':');
    const parsedCap = Number.parseInt(parts[1] || '10', 10);
    const dailyCap =
      Number.isFinite(parsedCap) && parsedCap >= 1 && parsedCap <= 50 ? parsedCap : 10;
    const label = parts.slice(2).join(':').trim() || 'Tester Invite';
    return { isTester: true, dailyCap, label };
  }
  if (raw.startsWith('tv_')) {
    const parts = raw.split('_');
    const parsedCap = Number.parseInt(parts[1] || '10', 10);
    const dailyCap =
      Number.isFinite(parsedCap) && parsedCap >= 1 && parsedCap <= 50 ? parsedCap : 10;
    const label = parts.slice(2).join('_').trim() || 'Tester Invite';
    return { isTester: true, dailyCap, label };
  }
  return {
    isTester: false,
    dailyCap: MAX_DAILY_PASS_BOUQUETS,
    label: raw || 'Tester Invite',
  };
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
  | 'REVOKED'
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
 * Creates a newly issued, cryptographically signed StudioPassRecord (standard paid pass or 1-device locked Tester Voucher).
 */
export function createSignedStudioPass(params: {
  passKey?: string;
  tier: StudioPassTier;
  region: PricingRegion;
  deviceTokenHash: string;
  boundBouquetCode?: string | null;
  paymentProvider?: 'sikatpay' | 'bayadgate' | 'paymongo' | 'kofi' | 'verified_checkout' | 'tester_voucher';
  paymentReference?: string;
  durationHours?: number;
  isTesterVoucher?: boolean;
  testerLabel?: string;
  testerDailyCap?: number;
  retentionDaysOverride?: number;
  nowMs?: number;
  secretSalt?: string;
}): StudioPassRecord {
  const now = params.nowMs ?? Date.now();
  const createdAt = new Date(now).toISOString();
  const isTester = Boolean(params.isTesterVoucher || params.paymentProvider === 'tester_voucher');
  const durationHours =
    typeof params.durationHours === 'number' && params.durationHours > 0
      ? params.durationHours
      : params.tier === 'pass_30d'
      ? 30 * 24
      : params.tier === 'pass_7d'
      ? 7 * 24
      : 48;
  const expiresAt = new Date(now + durationHours * 60 * 60 * 1000).toISOString();
  const policy = getRetentionPolicyForPassTier(params.tier);
  const retentionDays =
    typeof params.retentionDaysOverride === 'number' && params.retentionDaysOverride >= 1
      ? params.retentionDaysOverride
      : isTester
      ? 30
      : policy.retentionDays;
  const isEternalKeepsake = isTester ? false : policy.isPremiumEternal;
  const passKey = params.passKey
    ? normalizePassKey(params.passKey)
    : isTester
    ? generateTesterVoucherKeyCode()
    : generatePassKeyCode();
  const activeSessionNonce = generateSessionNonce();
  const todayIso = createdAt.slice(0, 10);

  let boundCode: string | null = null;
  if (isTester) {
    const cleanCap =
      typeof params.testerDailyCap === 'number' && params.testerDailyCap >= 1
        ? Math.min(50, Math.round(params.testerDailyCap))
        : 10;
    const cleanLabel = (params.testerLabel || params.boundBouquetCode || 'Tester Invite')
      .replace(/\|/g, ' ')
      .trim()
      .slice(0, 34);
    boundCode = `TV:${cleanCap}:${cleanLabel}`;
  } else if (params.tier === 'single') {
    boundCode = params.boundBouquetCode || null;
  }

  const draft: Omit<StudioPassRecord, 'signature'> = {
    passKey,
    tier: params.tier,
    region: params.region,
    createdAt,
    expiresAt,
    retentionDays,
    isEternalKeepsake,
    primaryDeviceHash: params.deviceTokenHash || '',
    secondaryDeviceHash: isTester ? TESTER_SINGLE_DEVICE_SENTINEL : null,
    activeSessionNonce,
    boundBouquetCode: boundCode,
    dailyUsageDate: todayIso,
    dailyUsageCount: 0,
    paymentProvider: isTester ? 'tester_voucher' : params.paymentProvider || 'verified_checkout',
    paymentReference:
      params.paymentReference ||
      (isTester
        ? `tv_${generateSessionNonce().slice(0, 10)}`
        : `ref_${generateSessionNonce().slice(0, 10)}`),
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
 * 1. Signature, revocation & expiry check
 * 2. Strict 1-device lock for Tester Vouchers (`TESTER_SINGLE_DEVICE_LOCK`) or max 2 devices for Paid Passes.
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
      message: 'Please enter a valid Pass Key (BLOOM-XXXX-XXXX) or switch to the Passes tab.',
    };
  }

  if (!verifyPassIntegritySignature(existingRecord, secretSalt)) {
    return {
      valid: false,
      status: 'TAMPERED_SIGNATURE',
      message:
        'We couldn’t verify this Pass Key. Please double-check your BLOOM-XXXX-XXXX code or choose a pass in the Passes tab.',
    };
  }

  if (
    existingRecord.secondaryDeviceHash === REVOKED_PASS_SENTINEL ||
    existingRecord.primaryDeviceHash === REVOKED_PASS_SENTINEL
  ) {
    return {
      valid: false,
      status: 'REVOKED',
      message:
        'This pass or order is no longer active. Please choose a Studio Pass in the Passes tab to unlock your bouquet.',
    };
  }

  const expiresMs = Date.parse(existingRecord.expiresAt);
  if (!Number.isFinite(expiresMs) || nowMs > expiresMs) {
    return {
      valid: false,
      status: 'EXPIRED',
      message:
        'This pass has reached the end of its access window. Switch to the Passes tab anytime to unlock a fresh Studio Pass.',
    };
  }

  const isTester = isTesterVoucherPass(existingRecord);
  let nextPrimary = existingRecord.primaryDeviceHash;
  let nextSecondary = existingRecord.secondaryDeviceHash;

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
          'This complimentary Tester Pass is already active on another device. Please return to the original browser where you first claimed it, or choose a Studio Pass in the Passes tab.',
      };
    }
    if (!nextSecondary) {
      // Allow 1 transfer to a secondary device (e.g. phone -> laptop) for standard paid passes
      nextSecondary = requestDeviceTokenHash;
    } else if (requestDeviceTokenHash !== nextSecondary) {
      // 3rd distinct device! Reject to prevent Pass Key sharing abuse.
      return {
        valid: false,
        status: 'DEVICE_LIMIT_EXCEEDED',
        message:
          'This Pass Key is already linked to its maximum of 2 devices. Please open the Studio on one of your linked devices, or choose a new pass in the Passes tab.',
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
    message: isTester
      ? 'Tester Voucher activated and locked to this device.'
      : 'Studio Pass verified and locked to your current session.',
    updatedPass: {
      ...updatedDraft,
      signature,
    },
  };
}

/**
 * Verifies whether a stored pass authorizes unlocking/exporting a bouquet (`bouquetCode`)
 * on the current device (`deviceTokenHash`) and session (`clientSessionNonce`),
 * enforcing single-bouquet binding, 1-device tester locks, and daily velocity caps.
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
      message: 'Please unlock a Studio Pass or enter your Pass Key under "Have a Key?" to continue.',
    };
  }

  if (!verifyPassIntegritySignature(pass, params.secretSalt)) {
    return {
      valid: false,
      status: 'TAMPERED_SIGNATURE',
      message:
        'We couldn’t verify this Pass Key. Please re-enter your BLOOM-XXXX-XXXX code under "Have a Key?" or choose a pass in the Passes tab.',
    };
  }

  if (
    pass.secondaryDeviceHash === REVOKED_PASS_SENTINEL ||
    pass.primaryDeviceHash === REVOKED_PASS_SENTINEL
  ) {
    return {
      valid: false,
      status: 'REVOKED',
      message:
        'This pass is no longer active. Please choose a Studio Pass in the Passes tab to unlock your bouquet.',
    };
  }

  const expiresMs = Date.parse(pass.expiresAt);
  if (!Number.isFinite(expiresMs) || now > expiresMs) {
    return {
      valid: false,
      status: 'EXPIRED',
      message:
        'This pass has reached the end of its access window. Switch to the Passes tab anytime to unlock a fresh Studio Pass.',
    };
  }

  const isTester = isTesterVoucherPass(pass);
  if (isTester) {
    if (deviceTokenHash !== pass.primaryDeviceHash) {
      return {
        valid: false,
        status: 'DEVICE_LIMIT_EXCEEDED',
        message:
          'This complimentary Tester Pass is already active on another device. Please return to the original browser where you first claimed it, or choose a Studio Pass in the Passes tab.',
      };
    }
  } else if (
    deviceTokenHash !== pass.primaryDeviceHash &&
    deviceTokenHash !== pass.secondaryDeviceHash
  ) {
    return {
      valid: false,
      status: 'DEVICE_LIMIT_EXCEEDED',
      message:
        'This Pass Key is already linked to its maximum of 2 devices. Please open the Studio on one of your linked devices, or choose a new pass in the Passes tab.',
    };
  }

  const hasSecondDistinctDevice =
    !isTester &&
    Boolean(
      pass.secondaryDeviceHash &&
        pass.secondaryDeviceHash !== 'SINGLE_CONSUMED' &&
        pass.secondaryDeviceHash !== 'TESTER_SINGLE_DEVICE_LOCK' &&
        pass.secondaryDeviceHash !== 'REVOKED_BY_OWNER' &&
        pass.secondaryDeviceHash !== pass.primaryDeviceHash
    );
  if (
    hasSecondDistinctDevice &&
    params.clientSessionNonce &&
    params.clientSessionNonce !== pass.activeSessionNonce
  ) {
    return {
      valid: false,
      status: 'SESSION_SUPERSEDED',
      message:
        'Your Pass Key was recently opened on another device. To continue crafting here, simply re-enter your BLOOM-XXXX-XXXX key under "Have a Key?".',
    };
  }

  // Enforce Single-Bouquet Unlock binding so a ₱49/$2.99 single unlock cannot be reused on new bouquets
  if (pass.tier === 'single' && !isTester) {
    const singleAlreadyUsed =
      pass.secondaryDeviceHash === 'SINGLE_CONSUMED' || Number(pass.dailyUsageCount || 0) >= 1;
    if (
      singleAlreadyUsed &&
      pass.boundBouquetCode &&
      params.bouquetCode &&
      pass.boundBouquetCode !== params.bouquetCode
    ) {
      return {
        valid: false,
        status: 'SINGLE_BOUQUET_ALREADY_USED',
        message:
          'This Single-Bouquet pass has already been used to seal a gift. To craft and send another Couture bouquet, choose a new Single Unlock or a 7-Day Pass in the Passes tab.',
      };
    }
    if (singleAlreadyUsed) {
      const matchesBoundBouquet = Boolean(
        !params.incrementUsage &&
          params.bouquetCode &&
          pass.boundBouquetCode &&
          params.bouquetCode === pass.boundBouquetCode
      );
      if (!matchesBoundBouquet) {
        return {
          valid: false,
          status: 'SINGLE_BOUQUET_ALREADY_USED',
          message:
            'This Single-Bouquet pass has already been used to seal a gift. To craft and send another Couture bouquet, choose a new Single Unlock or a 7-Day Pass in the Passes tab.',
        };
      }
    }
  }

  const todayIso = new Date(now).toISOString().slice(0, 10);
  const currentDailyCount =
    pass.tier === 'single' && !isTester
      ? Number(pass.dailyUsageCount || 0)
      : pass.dailyUsageDate === todayIso
      ? pass.dailyUsageCount || 0
      : 0;
  const maxDailyAllowed = isTester
    ? parseTesterVoucherMeta(pass.boundBouquetCode).dailyCap
    : pass.tier === 'single'
    ? 1
    : MAX_DAILY_PASS_BOUQUETS;

  if (params.incrementUsage && currentDailyCount >= maxDailyAllowed) {
    return {
      valid: false,
      status: pass.tier === 'single' && !isTester ? 'SINGLE_BOUQUET_ALREADY_USED' : 'DAILY_LIMIT_REACHED',
      message:
        pass.tier === 'single' && !isTester
          ? 'This Single-Bouquet pass has already been used to seal a gift. To craft and send another Couture bouquet, choose a new Single Unlock or a 7-Day Pass in the Passes tab.'
          : `You’ve reached today’s fair-use limit (${maxDailyAllowed} bouquets/day). Your pass will automatically refresh tomorrow!`,
    };
  }

  const nextBoundCode = isTester
    ? pass.boundBouquetCode
    : pass.tier === 'single'
    ? pass.boundBouquetCode || (params.incrementUsage ? params.bouquetCode || null : null)
    : null;
  const nextSecondaryDeviceHash =
    pass.tier === 'single' && !isTester && params.incrementUsage
      ? 'SINGLE_CONSUMED'
      : pass.secondaryDeviceHash;

  const updatedDraft: Omit<StudioPassRecord, 'signature'> = {
    ...pass,
    secondaryDeviceHash: nextSecondaryDeviceHash,
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

export async function verifyStudioPassOnServer(params: {
  pass: StudioPassRecord | null | undefined;
  bouquetCode?: string | null;
  incrementUsage?: boolean;
}): Promise<PassValidationResult> {
  const pass = params.pass;
  if (!pass || !isValidPassKeyFormat(pass.passKey)) {
    return {
      valid: false,
      status: 'INVALID_FORMAT',
      message: 'Please unlock a Studio Pass or enter your Pass Key under "Have a Key?" to continue.',
    };
  }
  try {
    const deviceTokenHash = getOrCreateDeviceTokenHash();
    const res = await fetch('/api/payments/verify-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'verify_pass',
        passKey: pass.passKey,
        activeSessionNonce: pass.activeSessionNonce,
        deviceTokenHash,
        bouquetCode: params.bouquetCode || null,
        incrementUsage: Boolean(params.incrementUsage),
        pass,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      status?: PassValidationStatus;
      message?: string;
      pass?: StudioPassRecord;
    };
    if (!res.ok || !data.ok || !data.pass) {
      return {
        valid: false,
        status: data.status || 'TAMPERED_SIGNATURE',
        message:
          data.message ||
          'We couldn’t verify your active pass right now. Please re-enter your BLOOM-XXXX-XXXX key under "Have a Key?".',
      };
    }
    return {
      valid: true,
      status: 'VALID',
      message: 'Studio Pass verified.',
      updatedPass: data.pass,
    };
  } catch {
    return {
      valid: false,
      status: 'TAMPERED_SIGNATURE',
      message: 'Could not verify your Studio Pass right now. Please check your connection and try again.',
    };
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

// ============================================================================
// 5. KO-FI SHOP ITEM DIRECT LINK CODES (ENV VARS + OWNER SETTINGS FALLBACK)
// ============================================================================

export interface KofiShopItemConfig {
  single: string;
  pass_7d: string;
  pass_30d: string;
}

const KOFI_SHOP_CONFIG_STORAGE_KEY = 'sab_kofi_shop_codes_v1';

export function extractKofiShopDirectLinkCode(rawInput?: string | null): string {
  const str = (rawInput || '').trim();
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

export function getStoredKofiShopConfig(): KofiShopItemConfig {
  const envMeta =
    typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string> }).env
      ? (import.meta as unknown as { env: Record<string, string> }).env
      : {};

  const defaults: KofiShopItemConfig = {
    single: extractKofiShopDirectLinkCode(envMeta.VITE_KOFI_SHOP_SINGLE_CODE),
    pass_7d: extractKofiShopDirectLinkCode(envMeta.VITE_KOFI_SHOP_7D_CODE),
    pass_30d: extractKofiShopDirectLinkCode(envMeta.VITE_KOFI_SHOP_30D_CODE),
  };

  if (typeof window === 'undefined') return defaults;
  try {
    const raw = window.localStorage.getItem(KOFI_SHOP_CONFIG_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<KofiShopItemConfig>;
    return {
      single: extractKofiShopDirectLinkCode(parsed.single) || defaults.single,
      pass_7d: extractKofiShopDirectLinkCode(parsed.pass_7d) || defaults.pass_7d,
      pass_30d: extractKofiShopDirectLinkCode(parsed.pass_30d) || defaults.pass_30d,
    };
  } catch {
    return defaults;
  }
}

export function saveStoredKofiShopConfig(config: KofiShopItemConfig): KofiShopItemConfig {
  const normalized: KofiShopItemConfig = {
    single: extractKofiShopDirectLinkCode(config.single),
    pass_7d: extractKofiShopDirectLinkCode(config.pass_7d),
    pass_30d: extractKofiShopDirectLinkCode(config.pass_30d),
  };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(KOFI_SHOP_CONFIG_STORAGE_KEY, JSON.stringify(normalized));
    } catch {
      // Ignore storage quota errors
    }
  }
  return normalized;
}

// ============================================================================
// 6. PENDING BAYADGATE / REDIRECT CHECKOUT RECOVERY STORAGE
// ============================================================================

export interface PendingCheckoutStorageRecord {
  checkoutId: string;
  checkoutToken: string;
  provider: 'sikatpay' | 'bayadgate' | 'paymongo' | 'kofi';
  orderId?: string | null;
  paymentMethod?: BayadgatePaymentMethod | null;
  checkoutUrl?: string | null;
  passKeyPreview?: string | null;
  plan?: PricingTierPlan | null;
  liveGatewayConfigured?: boolean;
  bouquetCode?: string | null;
  resumeAction: 'share' | 'png' | 'pass_menu';
  createdAtMs: number;
}

const PENDING_CHECKOUT_STORAGE_KEY = 'sab_pending_checkout_v1';
const PENDING_CHECKOUT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function savePendingCheckoutStorage(record: PendingCheckoutStorageRecord): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PENDING_CHECKOUT_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Ignore storage errors
  }
}

export function loadPendingCheckoutStorage(nowMs: number = Date.now()): PendingCheckoutStorageRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PENDING_CHECKOUT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingCheckoutStorageRecord>;
    if (!parsed || typeof parsed.checkoutId !== 'string' || typeof parsed.checkoutToken !== 'string') {
      return null;
    }
    if (
      typeof parsed.createdAtMs === 'number' &&
      nowMs - parsed.createdAtMs > PENDING_CHECKOUT_MAX_AGE_MS
    ) {
      window.localStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
      return null;
    }
    return parsed as PendingCheckoutStorageRecord;
  } catch {
    return null;
  }
}

export function clearPendingCheckoutStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}


