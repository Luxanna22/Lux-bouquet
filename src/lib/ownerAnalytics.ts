import {
  detectPricingRegion,
  getOrCreateDeviceTokenHash,
  isValidPassKeyFormat,
  normalizePassKey,
  PricingRegion,
  StudioPassRecord,
  StudioPassTier,
} from './monetization';

// ============================================================================
// 1. STEALTH GATE ROUTING & AUTO-UNLOCK VOUCHER URL HELPERS
// ============================================================================

const STEALTH_GATE_PATH_REGEX = /^\/(gk-[A-Za-z0-9_-]{18,160})$/;

export function isStealthAdminGatePath(pathname?: string): boolean {
  const raw =
    pathname !== undefined
      ? pathname
      : typeof window !== 'undefined'
      ? window.location.pathname
      : '';
  if (!raw) return false;
  const cleaned = raw.split('?')[0].split('#')[0].trim();
  return STEALTH_GATE_PATH_REGEX.test(cleaned);
}

export function extractStealthGateSlug(pathname?: string): string | null {
  const raw =
    pathname !== undefined
      ? pathname
      : typeof window !== 'undefined'
      ? window.location.pathname
      : '';
  if (!raw) return null;
  const cleaned = raw.split('?')[0].split('#')[0].trim();
  const match = cleaned.match(STEALTH_GATE_PATH_REGEX);
  return match ? match[1] : null;
}

export function extractVoucherKeyFromSearch(search?: string): string | null {
  const raw =
    search !== undefined
      ? search
      : typeof window !== 'undefined'
      ? window.location.search
      : '';
  if (!raw) return null;
  try {
    const params = new URLSearchParams(raw.startsWith('?') ? raw : `?${raw}`);
    const candidate =
      params.get('voucher') || params.get('tester') || params.get('pass') || '';
    if (!candidate) return null;
    const normalized = normalizePassKey(candidate);
    return isValidPassKeyFormat(normalized) ? normalized : null;
  } catch {
    return null;
  }
}

export function buildTesterMagicInviteUrl(passKey: string, originOverride?: string): string {
  const normalized = normalizePassKey(passKey);
  const origin =
    originOverride ||
    (typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://www.sendabouquet.online');
  return `${origin.replace(/\/+$/, '')}/?voucher=${encodeURIComponent(normalized)}`;
}

export function buildPaidPassClaimUrl(passKey: string, originOverride?: string): string {
  const normalized = normalizePassKey(passKey);
  const origin =
    originOverride ||
    (typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://www.sendabouquet.online');
  return `${origin.replace(/\/+$/, '')}/?pass=${encodeURIComponent(normalized)}`;
}

// ============================================================================
// 2. WEB & STUDIO ANALYTICS DATA STRUCTURES & PURE AGGREGATION
// ============================================================================

export type DeviceFormFactor = 'mobile' | 'tablet' | 'desktop';
export type OsFamily = 'ios' | 'android' | 'macos' | 'windows' | 'other';
export type ReferrerChannel =
  | 'direct'
  | 'recipient_viral'
  | 'tester_magic_link'
  | 'social'
  | 'qr_scan'
  | 'search';

export interface OwnerDailySeriesPoint {
  date: string; // YYYY-MM-DD
  visits: number;
  studioSessions: number;
  bouquetsSealed: number;
  recipientUnwraps: number;
  passUnlocks: number;
  revenueUsdCents?: number;
  revenuePhpCentavos?: number;
  paidSingle?: number;
  paid7d?: number;
  paid30d?: number;
}

export interface OwnerRecentEventItem {
  id: string;
  ts: string; // ISO string
  category: 'web' | 'studio' | 'recipient' | 'monetization' | 'security';
  type: string;
  summary: string;
  device: DeviceFormFactor;
  region: PricingRegion;
}

export type PaidPassChannel =
  | 'manual_gcash'
  | 'manual_maya'
  | 'manual_bank'
  | 'kofi'
  | 'sikatpay'
  | 'sikatpay_test'
  | 'bayadgate'
  | 'paymongo'
  | 'other';

export interface PaidPassLedgerItem {
  passKey: string;
  label: string;
  tier: StudioPassTier;
  region: PricingRegion;
  channel: PaidPassChannel;
  amountMinor: number;
  currency: 'PHP' | 'USD';
  retentionDays: number;
  isEternalKeepsake: boolean;
  createdAt: string;
  expiresAt: string;
  status: 'unclaimed' | 'claimed' | 'expired' | 'revoked';
  claimedDeviceHash: string;
  bouquetsCreated: number;
  blockedAttempts: number;
  boundBouquetCode?: string | null;
  isTest?: boolean;
  archivedFromIncome?: boolean;
  passRecord?: StudioPassRecord;
}

export interface TesterVoucherLedgerItem {
  passKey: string;
  label: string;
  tier: StudioPassTier;
  durationHours: number;
  retentionDays: number;
  dailyCap: number;
  createdAt: string;
  expiresAt: string;
  status: 'unclaimed' | 'claimed' | 'expired' | 'revoked';
  claimedDeviceHash: string;
  bouquetsCreated: number;
  blockedAttempts: number;
  passRecord?: StudioPassRecord;
}

export interface OwnerAnalyticsSummary {
  webVisits: number;
  uniqueVisitors: number;
  landingViews: number;
  studioSessions: number;
  showcaseViews: number;
  bouquetsCreated: number;
  coutureBouquetsCreated: number;
  freeBouquetsCreated: number;
  recipientUnwraps: number;
  voiceNotesRecorded: number;
  voicePlays: number;
  reactionsSent: number;
  repliesSent: number;
  recipientToStudioClicks: number;
  paywallOpens: number;
  checkoutsStarted: number;
  passesIssued: {
    single: number;
    pass_7d: number;
    pass_30d: number;
    tester: number;
  };
  revenueUsdCents: number;
  revenuePhpCentavos: number;
  incomePausedForTesting?: boolean;
  incomeResetAtMs?: number;
  incomeResetEpoch?: number;
  blockedShareAttempts: number;
  blockedPinAttempts: number;
  shareChannels: {
    short_link: number;
    png_download: number;
    qr_card: number;
    email_surprise: number;
    garland_pin: number;
  };
  devices: Record<DeviceFormFactor, number>;
  osBrowsers: Record<OsFamily, number>;
  regions: Record<PricingRegion, number>;
  referrers: Record<ReferrerChannel, number>;
  flowers: Record<string, number>;
  wraps: Record<string, number>;
  ribbons: Record<string, number>;
  environments: Record<string, number>;
  voiceStyles: Record<string, number>;
  photoStyles: Record<string, number>;
  lockModes: Record<string, number>;
  paywallTriggers: Record<string, number>;
  dailySeries: OwnerDailySeriesPoint[];
  recentEvents: OwnerRecentEventItem[];
  vercelAnalyticsConnected: boolean;
  updatedAt: string;
}

export function buildRolling14DayDates(nowMs: number = Date.now()): string[] {
  const dates: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(nowMs - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    dates.push(d);
  }
  return dates;
}

export function createInitialAnalyticsSummary(nowMs: number = Date.now()): OwnerAnalyticsSummary {
  const dates = buildRolling14DayDates(nowMs);
  const dailySeries: OwnerDailySeriesPoint[] = dates.map((date) => ({
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
  }));

  return {
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
    dailySeries,
    recentEvents: [],
    vercelAnalyticsConnected: true,
    updatedAt: new Date(nowMs).toISOString(),
  };
}

export interface StudioTelemetryPayload {
  eventType:
    | 'web_visit'
    | 'landing_view'
    | 'studio_session'
    | 'showcase_view'
    | 'bouquet_sealed'
    | 'recipient_unwrap'
    | 'voice_play'
    | 'recipient_reaction'
    | 'recipient_to_studio'
    | 'paywall_open'
    | 'checkout_started'
    | 'share_channel'
    | 'voucher_claimed'
    | 'voucher_share_blocked';
  device?: DeviceFormFactor;
  os?: OsFamily;
  region?: PricingRegion;
  referrer?: ReferrerChannel;
  isUniqueVisitor?: boolean;
  isCouture?: boolean;
  hasVoice?: boolean;
  hasReply?: boolean;
  flowers?: string[];
  wrapStyle?: string;
  ribbonStyle?: string;
  environment?: string;
  voiceStyle?: string;
  photoStyles?: string[];
  lockMode?: string;
  paywallFeatures?: string[];
  shareChannel?: 'short_link' | 'png_download' | 'qr_card' | 'email_surprise' | 'garland_pin';
  summary?: string;
  nowMs?: number;
}

function incrementMapKey(map: Record<string, number>, key: string | undefined | null, delta = 1) {
  if (!key) return;
  const k = String(key).trim().slice(0, 48);
  if (!k) return;
  map[k] = (map[k] || 0) + delta;
}

export function applyTelemetryEventToSummary(
  current: OwnerAnalyticsSummary,
  event: StudioTelemetryPayload
): OwnerAnalyticsSummary {
  const now = event.nowMs ?? Date.now();
  const todayIso = new Date(now).toISOString().slice(0, 10);
  const next: OwnerAnalyticsSummary = {
    ...current,
    passesIssued: { ...current.passesIssued },
    shareChannels: { ...current.shareChannels },
    devices: { ...current.devices },
    osBrowsers: { ...current.osBrowsers },
    regions: { ...current.regions },
    referrers: { ...current.referrers },
    flowers: { ...current.flowers },
    wraps: { ...current.wraps },
    ribbons: { ...current.ribbons },
    environments: { ...current.environments },
    voiceStyles: { ...current.voiceStyles },
    photoStyles: { ...current.photoStyles },
    lockModes: { ...current.lockModes },
    paywallTriggers: { ...current.paywallTriggers },
    dailySeries: current.dailySeries.map((pt) => ({ ...pt })),
    recentEvents: [...current.recentEvents],
    updatedAt: new Date(now).toISOString(),
  };

  const dev: DeviceFormFactor =
    event.device === 'mobile' || event.device === 'tablet' || event.device === 'desktop'
      ? event.device
      : 'mobile';
  const os: OsFamily =
    event.os === 'ios' ||
    event.os === 'android' ||
    event.os === 'macos' ||
    event.os === 'windows' ||
    event.os === 'other'
      ? event.os
      : 'other';
  const reg: PricingRegion = event.region === 'PH' ? 'PH' : 'INTL';

  let todayBucket = next.dailySeries.find((d) => d.date === todayIso);
  if (!todayBucket) {
    todayBucket = {
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
    next.dailySeries.push(todayBucket);
    if (next.dailySeries.length > 14) {
      next.dailySeries = next.dailySeries.slice(-14);
    }
  }

  let category: OwnerRecentEventItem['category'] = 'studio';
  let defaultSummary = '';

  switch (event.eventType) {
    case 'web_visit': {
      category = 'web';
      next.webVisits += 1;
      if (event.isUniqueVisitor) next.uniqueVisitors += 1;
      next.devices[dev] = (next.devices[dev] || 0) + 1;
      next.osBrowsers[os] = (next.osBrowsers[os] || 0) + 1;
      next.regions[reg] = (next.regions[reg] || 0) + 1;
      if (event.referrer && event.referrer in next.referrers) {
        next.referrers[event.referrer] += 1;
      }
      todayBucket.visits += 1;
      break;
    }
    case 'landing_view': {
      category = 'web';
      next.landingViews += 1;
      break;
    }
    case 'studio_session': {
      category = 'studio';
      next.studioSessions += 1;
      todayBucket.studioSessions += 1;
      defaultSummary = 'Visitor entered the Botanical Studio canvas';
      break;
    }
    case 'showcase_view': {
      category = 'web';
      next.showcaseViews += 1;
      break;
    }
    case 'bouquet_sealed': {
      category = 'studio';
      next.bouquetsCreated += 1;
      todayBucket.bouquetsSealed += 1;
      if (event.isCouture) {
        next.coutureBouquetsCreated += 1;
      } else {
        next.freeBouquetsCreated += 1;
      }
      if (event.hasVoice) {
        next.voiceNotesRecorded += 1;
        incrementMapKey(next.voiceStyles, event.voiceStyle);
      }
      if (Array.isArray(event.flowers)) {
        for (const f of event.flowers) {
          incrementMapKey(next.flowers, f);
        }
      }
      if (Array.isArray(event.photoStyles)) {
        for (const p of event.photoStyles) {
          incrementMapKey(next.photoStyles, p);
        }
      }
      incrementMapKey(next.wraps, event.wrapStyle);
      incrementMapKey(next.ribbons, event.ribbonStyle);
      incrementMapKey(next.environments, event.environment);
      incrementMapKey(next.lockModes, event.lockMode || 'none');
      defaultSummary = `${event.isCouture ? 'Couture' : 'Free'} bouquet sealed (${
        event.flowers?.length || 1
      } stems · ${event.wrapStyle || 'kraft'} wrap)`;
      break;
    }
    case 'recipient_unwrap': {
      category = 'recipient';
      next.recipientUnwraps += 1;
      todayBucket.recipientUnwraps += 1;
      defaultSummary = 'Recipient unwrapped a shared gift bouquet';
      break;
    }
    case 'voice_play': {
      category = 'recipient';
      next.voicePlays += 1;
      defaultSummary = 'Recipient played a voice keepsake recording';
      break;
    }
    case 'recipient_reaction': {
      category = 'recipient';
      next.reactionsSent += 1;
      if (event.hasReply) {
        next.repliesSent += 1;
      }
      defaultSummary = event.hasReply
        ? 'Recipient sent a reaction & thank-you note'
        : 'Recipient sent a reaction to the sender';
      break;
    }
    case 'recipient_to_studio': {
      category = 'recipient';
      next.recipientToStudioClicks += 1;
      next.referrers.recipient_viral += 1;
      defaultSummary = 'Gift recipient clicked to craft their own bouquet (viral loop)';
      break;
    }
    case 'paywall_open': {
      category = 'monetization';
      next.paywallOpens += 1;
      if (Array.isArray(event.paywallFeatures)) {
        for (const feat of event.paywallFeatures) {
          incrementMapKey(next.paywallTriggers, feat);
        }
      }
      defaultSummary = `Unlock Premium modal viewed (${
        event.paywallFeatures?.slice(0, 2).join(', ') || 'Studio Pass'
      })`;
      break;
    }
    case 'checkout_started': {
      category = 'monetization';
      next.checkoutsStarted += 1;
      defaultSummary = 'Visitor started Studio Pass checkout';
      break;
    }
    case 'share_channel': {
      category = 'studio';
      if (event.shareChannel && event.shareChannel in next.shareChannels) {
        next.shareChannels[event.shareChannel] += 1;
      }
      defaultSummary = `Gift shared via ${event.shareChannel || 'short_link'}`;
      break;
    }
    case 'voucher_claimed': {
      category = 'security';
      todayBucket.passUnlocks += 1;
      defaultSummary = 'Tester Voucher claimed & locked to 1 device';
      break;
    }
    case 'voucher_share_blocked': {
      category = 'security';
      next.blockedShareAttempts += 1;
      defaultSummary = 'Blocked multi-device sharing attempt on a locked key';
      break;
    }
  }

  const finalSummary = (event.summary || defaultSummary).trim();
  if (finalSummary) {
    next.recentEvents.unshift({
      id: `evt_${now}_${Math.random().toString(36).slice(2, 7)}`,
      ts: new Date(now).toISOString(),
      category,
      type: event.eventType,
      summary: finalSummary.slice(0, 140),
      device: dev,
      region: reg,
    });
    if (next.recentEvents.length > 40) {
      next.recentEvents = next.recentEvents.slice(0, 40);
    }
  }

  return next;
}

// ============================================================================
// 3. CLIENT TELEMETRY CONTEXT & VERCEL WEB ANALYTICS BRIDGE
// ============================================================================

const VISITOR_SEEN_KEY = 'sab_telemetry_unique_visitor_v1';
const SESSION_TRACKED_KEY = 'sab_telemetry_session_visit_v1';

export function detectClientTelemetryContext(): {
  device: DeviceFormFactor;
  os: OsFamily;
  region: PricingRegion;
  referrer: ReferrerChannel;
} {
  if (typeof window === 'undefined') {
    return {
      device: 'desktop',
      os: 'other',
      region: 'INTL',
      referrer: 'direct',
    };
  }

  const ua = (navigator.userAgent || '').toLowerCase();
  const width = window.innerWidth || screen?.width || 1024;
  let device: DeviceFormFactor = 'desktop';
  if (width < 768 || /iphone|ipod|android.*mobile|windows phone/.test(ua)) {
    device = 'mobile';
  } else if (width < 1024 || /ipad|tablet|android(?!.*mobile)/.test(ua)) {
    device = 'tablet';
  }

  let os: OsFamily = 'other';
  if (/iphone|ipad|ipod/.test(ua)) {
    os = 'ios';
  } else if (/android/.test(ua)) {
    os = 'android';
  } else if (/macintosh|mac os x/.test(ua)) {
    os = 'macos';
  } else if (/windows/.test(ua)) {
    os = 'windows';
  }

  const region = detectPricingRegion();

  const search = (window.location.search || '').toLowerCase();
  const ref = (document.referrer || '').toLowerCase();
  let referrer: ReferrerChannel = 'direct';
  if (search.includes('voucher=') || search.includes('tester=')) {
    referrer = 'tester_magic_link';
  } else if (search.includes('qr=1') || search.includes('utm_source=qr')) {
    referrer = 'qr_scan';
  } else if (search.includes('from=gift') || search.includes('studio=1')) {
    referrer = 'recipient_viral';
  } else if (/instagram|facebook|t\.co|twitter|tiktok|messenger|whatsapp|telegram|discord/.test(ref)) {
    referrer = 'social';
  } else if (/google|bing|duckduckgo|yahoo/.test(ref)) {
    referrer = 'search';
  }

  return { device, os, region, referrer };
}

declare global {
  interface Window {
    va?: (event: 'beforeSend' | 'event' | 'pageview', properties?: unknown) => void;
    vaq?: unknown[][];
    __sabVercelAnalyticsInjected?: boolean;
  }
}

/**
 * Connects Vercel Web Analytics (`/_vercel/insights/script.js` + `window.va` queue)
 * when running in the browser so Vercel's dashboard captures visitor traffic,
 * countries, referrers, and custom events alongside the in-app Owner Console.
 */
export function initVercelWebAnalytics(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__sabVercelAnalyticsInjected) return;
  window.__sabVercelAnalyticsInjected = true;

  if (!window.va) {
    window.va = function (...args: unknown[]) {
      (window.vaq = window.vaq || []).push(args);
    };
  }

  // Only inject the external `/_vercel/insights/script.js` script on production/Vercel hosts
  // so local Vite dev doesn't log a harmless 404 in the console
  const host = window.location.hostname || '';
  const isProdOrVercel =
    host.endsWith('.vercel.app') ||
    host.endsWith('sendabouquet.online') ||
    (!host.includes('localhost') && !host.includes('127.0.0.1') && !host.endsWith('.run.app'));

  if (isProdOrVercel) {
    try {
      const script = document.createElement('script');
      script.defer = true;
      script.src = '/_vercel/insights/script.js';
      script.onerror = () => {
        // Ignore if Vercel Web Analytics is not yet enabled in Vercel project settings
      };
      document.head.appendChild(script);
    } catch {
      // Ignore script injection errors
    }
  }
}

export function trackVercelCustomEvent(
  eventName: string,
  data?: Record<string, string | number | boolean>
): void {
  if (typeof window === 'undefined') return;
  try {
    initVercelWebAnalytics();
    window.va?.('event', { name: eventName, data });
  } catch {
    // Ignore
  }
}

export function trackStudioTelemetry(
  event: Omit<StudioTelemetryPayload, 'device' | 'os' | 'region' | 'referrer'> &
    Partial<Pick<StudioTelemetryPayload, 'device' | 'os' | 'region' | 'referrer'>>
): void {
  if (typeof window === 'undefined') return;
  try {
    const ctx = detectClientTelemetryContext();
    let isUniqueVisitor = false;
    if (event.eventType === 'web_visit') {
      if (window.sessionStorage.getItem(SESSION_TRACKED_KEY) === '1') {
        return;
      }
      window.sessionStorage.setItem(SESSION_TRACKED_KEY, '1');
      if (window.localStorage.getItem(VISITOR_SEEN_KEY) !== '1') {
        window.localStorage.setItem(VISITOR_SEEN_KEY, '1');
        isUniqueVisitor = true;
      }
    }

    const payload: StudioTelemetryPayload = {
      ...ctx,
      ...event,
      isUniqueVisitor: event.isUniqueVisitor ?? isUniqueVisitor,
    };

    trackVercelCustomEvent(payload.eventType, {
      region: payload.region || 'INTL',
      device: payload.device || 'mobile',
      isCouture: Boolean(payload.isCouture),
    });

    fetch('/api/payments/verify-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'telemetry_event',
        deviceTokenHash: getOrCreateDeviceTokenHash(),
        telemetry: payload,
      }),
    }).catch(() => {});
  } catch {
    // Non-blocking telemetry
  }
}

// ============================================================================
// 4. FINANCIAL, CONVERSION FUNNEL & VIRAL SCALE PROJECTION HELPERS
// ============================================================================

export interface FunnelStepMetric {
  id: 'visits' | 'studio' | 'sealed' | 'paywall' | 'checkout' | 'paid';
  label: string;
  count: number;
  pctOfVisits: number;
  stepConversionPct: number;
  exceedsBaseline?: boolean;
}

export interface TierMixMetric {
  tier: StudioPassTier;
  label: string;
  count: number;
  sharePct: number;
  priceRangeLabel: string;
}

export interface FinancialMetricsSummary {
  grossUsd: number;
  grossPhp: number;
  combinedGrossUsd: number;
  combinedGrossPhp: number;
  estGatewayFeeUsd: number;
  estNetUsd: number;
  estNetPhp: number;
  totalPaidPasses: number;
  totalAllPasses: number;
  arpuUsd: number;
  arppuUsd: number;
  overallVisitorToPaidPct: number;
  paywallToPaidPct: number;
  checkoutToPaidPct: number;
  coutureIntentPct: number;
  viralLoopPct: number;
  funnelSteps: FunnelStepMetric[];
  tierMix: TierMixMetric[];
  phAudienceSharePct: number;
  intlAudienceSharePct: number;
}

export function computeFinancialMetrics(
  analytics: OwnerAnalyticsSummary,
  phpPerUsd = 56
): FinancialMetricsSummary {
  const grossUsd = Number(((analytics.revenueUsdCents || 0) / 100).toFixed(2));
  const grossPhp = Number(((analytics.revenuePhpCentavos || 0) / 100).toFixed(2));
  const combinedGrossUsd = Number((grossUsd + grossPhp / phpPerUsd).toFixed(2));
  const combinedGrossPhp = Number((grossPhp + grossUsd * phpPerUsd).toFixed(2));

  // Conservative blended payment gateway drag estimate: ~5% on INTL Ko-fi/PayPal, ~1.5% blended on PH wallets/manual
  const estGatewayFeeUsd = Number(
    (grossUsd * 0.05 + (grossPhp / phpPerUsd) * 0.015).toFixed(2)
  );
  const estNetUsd = Math.max(0, Number((combinedGrossUsd - estGatewayFeeUsd).toFixed(2)));
  const estNetPhp = Math.max(0, Number((estNetUsd * phpPerUsd).toFixed(2)));

  const single = analytics.passesIssued?.single || 0;
  const pass7d = analytics.passesIssued?.pass_7d || 0;
  const pass30d = analytics.passesIssued?.pass_30d || 0;
  const tester = analytics.passesIssued?.tester || 0;
  const totalPaidPasses = single + pass7d + pass30d;
  const totalAllPasses = totalPaidPasses + tester;

  const visits = analytics.webVisits || 0;
  const studio = analytics.studioSessions || 0;
  const sealed = analytics.bouquetsCreated || 0;
  const paywall = analytics.paywallOpens || 0;
  const checkout = analytics.checkoutsStarted || 0;
  const unwraps = analytics.recipientUnwraps || 0;

  const denomVisitors = Math.max(1, analytics.uniqueVisitors || visits);
  const arpuUsd = combinedGrossUsd > 0 ? Number((combinedGrossUsd / denomVisitors).toFixed(3)) : 0;
  const arppuUsd = totalPaidPasses > 0 ? Number((combinedGrossUsd / totalPaidPasses).toFixed(2)) : 0;

  const pct = (num: number, den: number) =>
    den > 0 ? Number(Math.min(100, (num / den) * 100).toFixed(1)) : 0;

  const funnelSteps: FunnelStepMetric[] = [
    {
      id: 'visits',
      label: 'Web Visits',
      count: visits,
      pctOfVisits: visits > 0 ? 100 : 0,
      stepConversionPct: visits > 0 ? 100 : 0,
    },
    {
      id: 'studio',
      label: 'Opened Studio',
      count: studio,
      pctOfVisits: pct(studio, visits),
      stepConversionPct: pct(studio, visits),
      exceedsBaseline: studio > visits && visits > 0,
    },
    {
      id: 'sealed',
      label: 'Sealed Bouquet',
      count: sealed,
      pctOfVisits: pct(sealed, visits),
      stepConversionPct: pct(sealed, studio),
      exceedsBaseline: (sealed > studio && studio > 0) || (sealed > visits && visits > 0),
    },
    {
      id: 'paywall',
      label: 'Viewed Upgrade',
      count: paywall,
      pctOfVisits: pct(paywall, visits),
      stepConversionPct: pct(paywall, sealed),
    },
    {
      id: 'checkout',
      label: 'Started Checkout',
      count: checkout,
      pctOfVisits: pct(checkout, visits),
      stepConversionPct: pct(checkout, paywall),
    },
    {
      id: 'paid',
      label: 'Paid Passes',
      count: totalPaidPasses,
      pctOfVisits:
        visits > 0 ? Number(Math.min(100, (totalPaidPasses / visits) * 100).toFixed(2)) : 0,
      stepConversionPct: pct(totalPaidPasses, Math.max(checkout, paywall)),
    },
  ];

  const tierMix: TierMixMetric[] = [
    {
      tier: 'single',
      label: 'Single Bouquet',
      count: single,
      sharePct: pct(single, totalPaidPasses),
      priceRangeLabel: '₱49 / $2.99',
    },
    {
      tier: 'pass_7d',
      label: '7-Day Pass',
      count: pass7d,
      sharePct: pct(pass7d, totalPaidPasses),
      priceRangeLabel: '₱99 / $4.99',
    },
    {
      tier: 'pass_30d',
      label: '30-Day Eternal',
      count: pass30d,
      sharePct: pct(pass30d, totalPaidPasses),
      priceRangeLabel: '₱199 / $8.99',
    },
  ];

  const phReg = analytics.regions?.PH || 0;
  const intlReg = analytics.regions?.INTL || 0;
  const regTotal = phReg + intlReg;

  return {
    grossUsd,
    grossPhp,
    combinedGrossUsd,
    combinedGrossPhp,
    estGatewayFeeUsd,
    estNetUsd,
    estNetPhp,
    totalPaidPasses,
    totalAllPasses,
    arpuUsd,
    arppuUsd,
    overallVisitorToPaidPct:
      visits > 0 ? Number(((totalPaidPasses / visits) * 100).toFixed(2)) : 0,
    paywallToPaidPct: pct(totalPaidPasses, paywall),
    checkoutToPaidPct: pct(totalPaidPasses, checkout),
    coutureIntentPct: pct(analytics.coutureBouquetsCreated || 0, sealed),
    viralLoopPct: pct(analytics.recipientToStudioClicks || 0, unwraps),
    funnelSteps,
    tierMix,
    phAudienceSharePct: pct(phReg, regTotal),
    intlAudienceSharePct: pct(intlReg, regTotal),
  };
}

export interface RevenueProjectionInput {
  dailyVisitors: number;
  studioStartRatePct: number;
  paywallReachPct: number;
  paywallToPaidPct: number;
  phSharePct: number;
  singleMixPct: number;
  pass7dMixPct: number;
  pass30dMixPct: number;
  phpPerUsd?: number;
}

export interface RevenueProjectionOutput {
  monthlyVisitors: number;
  monthlyStudioSessions: number;
  monthlyPaywallOpens: number;
  monthlyPaidOrders: number;
  phOrders: number;
  intlOrders: number;
  monthlyGrossPhpOnly: number;
  monthlyGrossUsdOnly: number;
  monthlyCombinedGrossUsd: number;
  monthlyCombinedNetUsd: number;
  monthlyCombinedNetPhp: number;
  annualNetUsd: number;
  annualNetPhp: number;
  blendedOrderUsd: number;
}

export function computeRevenueProjection(input: RevenueProjectionInput): RevenueProjectionOutput {
  const phpPerUsd = input.phpPerUsd && input.phpPerUsd > 0 ? input.phpPerUsd : 56;
  const dailyVisitors = Math.max(0, input.dailyVisitors || 0);
  const monthlyVisitors = Math.round(dailyVisitors * 30);
  const studioRate = Math.max(0, Math.min(100, input.studioStartRatePct)) / 100;
  const paywallRate = Math.max(0, Math.min(100, input.paywallReachPct)) / 100;
  const paidRate = Math.max(0, Math.min(100, input.paywallToPaidPct)) / 100;
  const phShare = Math.max(0, Math.min(100, input.phSharePct)) / 100;

  const rawMixSum =
    Math.max(0, input.singleMixPct) +
    Math.max(0, input.pass7dMixPct) +
    Math.max(0, input.pass30dMixPct);
  const sW = rawMixSum > 0 ? Math.max(0, input.singleMixPct) / rawMixSum : 0.3;
  const p7W = rawMixSum > 0 ? Math.max(0, input.pass7dMixPct) / rawMixSum : 0.5;
  const p30W = rawMixSum > 0 ? Math.max(0, input.pass30dMixPct) / rawMixSum : 0.2;

  const monthlyStudioSessions = Math.round(monthlyVisitors * studioRate);
  const monthlyPaywallOpens = Math.round(monthlyStudioSessions * paywallRate);
  const monthlyPaidOrders = Math.round(monthlyPaywallOpens * paidRate);

  const phOrders = Math.round(monthlyPaidOrders * phShare);
  const intlOrders = Math.max(0, monthlyPaidOrders - phOrders);

  const avgPhPhp = sW * 49 + p7W * 99 + p30W * 199;
  const avgIntlUsd = sW * 2.99 + p7W * 4.99 + p30W * 8.99;

  const monthlyGrossPhpOnly = Number((phOrders * avgPhPhp).toFixed(2));
  const monthlyGrossUsdOnly = Number((intlOrders * avgIntlUsd).toFixed(2));
  const monthlyCombinedGrossUsd = Number(
    (monthlyGrossUsdOnly + monthlyGrossPhpOnly / phpPerUsd).toFixed(2)
  );

  // Est payment fees (~5% INTL Ko-fi/PayPal, ~2% PH wallets)
  const monthlyFeesUsd = monthlyGrossUsdOnly * 0.05 + (monthlyGrossPhpOnly / phpPerUsd) * 0.02;
  const monthlyCombinedNetUsd = Math.max(
    0,
    Number((monthlyCombinedGrossUsd - monthlyFeesUsd).toFixed(2))
  );
  const monthlyCombinedNetPhp = Number((monthlyCombinedNetUsd * phpPerUsd).toFixed(2));

  return {
    monthlyVisitors,
    monthlyStudioSessions,
    monthlyPaywallOpens,
    monthlyPaidOrders,
    phOrders,
    intlOrders,
    monthlyGrossPhpOnly,
    monthlyGrossUsdOnly,
    monthlyCombinedGrossUsd,
    monthlyCombinedNetUsd,
    monthlyCombinedNetPhp,
    annualNetUsd: Number((monthlyCombinedNetUsd * 12).toFixed(0)),
    annualNetPhp: Number((monthlyCombinedNetPhp * 12).toFixed(0)),
    blendedOrderUsd:
      monthlyPaidOrders > 0
        ? Number((monthlyCombinedGrossUsd / monthlyPaidOrders).toFixed(2))
        : Number(((phShare * avgPhPhp) / phpPerUsd + (1 - phShare) * avgIntlUsd).toFixed(2)),
  };
}

