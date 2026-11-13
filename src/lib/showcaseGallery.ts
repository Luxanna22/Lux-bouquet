import {
  BouquetSnapshot,
  CanvasEnvironment,
  DEFAULT_VOICE_KEEPSAKE,
  FlowerType,
  RibbonStyle,
  SavedVaultBouquet,
  typeWrapStyle,
  VoiceKeepsakeStyle,
} from '../types/bouquet';

export const SHOWCASE_EXPIRY_DAYS = 30;
export const SHOWCASE_EXTENDED_EXPIRY_DAYS = 90;
export const SHOWCASE_EXPIRY_MS = SHOWCASE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

export interface ShowcaseStem {
  type: FlowerType;
  petal: string;
  center: string;
  x: number;
  y: number;
  rot: number;
  scale: number;
}

export interface ShowcaseBouquetEntry {
  id: string;
  code: string;
  to: string; // Recipient ("For ...")
  from: string; // Sender ("From ...")
  noteExcerpt: string;
  sharedAt: string; // ISO timestamp
  isPremium?: boolean; // Eternal keepsakes (30-Day Pass) never expire
  retentionDays?: number; // 30 for standard free, 90 for paid Single Unlock / 7-Day Pass
  hasVoice?: boolean;
  voiceStyle?: VoiceKeepsakeStyle;
  voiceLabel?: string;
  wrapStyle: typeWrapStyle;
  wrapColor: string;
  wrapShadow: string;
  ribbonStyle: RibbonStyle;
  ribbonColor: string;
  environment?: CanvasEnvironment;
  stems: ShowcaseStem[];
  tiltDeg: number;
  stringLengthPx: number;
  isUserCreated?: boolean;
  snapshot?: BouquetSnapshot;
}

export type ShowcaseCategoryFilter =
  | 'all'
  | 'voice'
  | 'eternal'
  | 'expiring_soon'
  | 'cloche'
  | 'hatbox'
  | 'silk';

export interface ShowcaseFilterOptions {
  searchQuery?: string;
  forQuery?: string;
  fromQuery?: string;
  category?: ShowcaseCategoryFilter;
  nowMs?: number;
}

export interface ShowcaseFreshnessInfo {
  daysLeft: number | null;
  daysAgo: number;
  label: string;
  sharedAgoLabel: string;
  isExpiringSoon: boolean;
  isExtendedPaid?: boolean;
}

export interface GarlandCurveItemTransform {
  u: number;
  xShiftPx: number;
  yCurvePx: number;
  rotateDeg: number;
}

export interface SingleLaceCarouselItemTransform {
  u: number;
  xPercent: number;
  yCurvePx: number;
  rotateDeg: number;
  scale: number;
  opacity: number;
  isVisible: boolean;
}

/**
 * Evaluates the exact quadratic catenary curve Y coordinate at normalized horizontal position `u` (0..1).
 * Matches an SVG path `M 0,edgeY Q width/2,controlY width,edgeY` where `controlY = 2 * midY - edgeY`.
 */
export function evaluateCatenaryCurveY(u: number, edgeY = 14, midY = 86): number {
  const clampedU = Math.max(-0.25, Math.min(1.25, u));
  const sag = midY - edgeY;
  return Number((midY - 4 * sag * Math.pow(clampedU - 0.5, 2)).toFixed(2));
}

/**
 * Computes the Lenis scroll-linked position & gentle sway for a limited creation hanging
 * on the Hero catenary lace garland (gliding right-to-left as scrollTop increases).
 */
export function computeGarlandItemScrollTransform(
  index: number,
  totalCount: number,
  scrollTop: number,
  baseTiltDeg = 0,
  edgeY = 14,
  midY = 86
): GarlandCurveItemTransform {
  const safeCount = Math.max(1, totalCount);
  // Base normalized horizontal slots across the 4-column max-w-6xl garland (0.21, 0.40, 0.60, 0.79)
  const span = 0.58;
  const startU = (1 - span) / 2;
  const stepU = safeCount > 1 ? span / (safeCount - 1) : 0;
  const baseU = safeCount > 1 ? startU + index * stepU : 0.5;

  // Smooth right-to-left horizontal drift along the lace line as the user scrolls down with Lenis
  const clampedScroll = Math.max(0, Math.min(1200, scrollTop));
  const scrollProgress = clampedScroll / 900; // 0 .. 1.33
  const uShift = (0.5 - scrollProgress) * 0.14; // Glides right-to-left (+7% to -7%) across the curve
  const currentU = baseU + uShift;

  // Horizontal pixel shift for smooth compositor transform
  const xShiftPx = Number((uShift * 980).toFixed(1));
  const yCurvePx = evaluateCatenaryCurveY(currentU, edgeY, midY);

  // Subtle breeze pendulum sway linked to scroll
  const breezeSway = Math.sin(clampedScroll * 0.0085 + index * 1.55) * 1.65;
  const rotateDeg = Number((baseTiltDeg + breezeSway).toFixed(2));

  return {
    u: Number(currentU.toFixed(4)),
    xShiftPx,
    yCurvePx,
    rotateDeg,
  };
}

/**
 * Computes the single-screen, single-lace horizontal carousel transform for each creation
 * on the dedicated "On the Lace Garland" page.
 * As `scrollOffset` increases (via smooth Lenis scroll), every creation glides from RIGHT to LEFT
 * (`u` decreases from 1 -> 0) while its vertical `yCurvePx` follows the single catenary lace curve.
 */
export function computeSingleLaceCarouselItemTransform(
  index: number,
  totalCount: number,
  scrollOffset: number,
  visibleSlots = 4,
  baseTiltDeg = 0,
  edgeY = 14,
  midY = 92
): SingleLaceCarouselItemTransform {
  const safeSlots = Math.max(1, Math.min(4, visibleSlots));
  const effectiveSlots = Math.max(1, Math.min(safeSlots, totalCount));

  const slotSpan =
    effectiveSlots === 1
      ? 0
      : effectiveSlots === 2
      ? 0.48
      : effectiveSlots === 3
      ? 0.58
      : 0.66;

  const slotStepU =
    safeSlots === 1
      ? 0.36
      : safeSlots === 2
      ? 0.48
      : safeSlots === 3
      ? 0.29
      : 0.22;

  const startU = (1 - slotSpan) / 2;
  // As scrollOffset increases, `u` decreases -> creations move from right to left across the single lace line
  const u = startU + (index - scrollOffset) * slotStepU;
  const xPercent = Number((u * 100).toFixed(2));
  const yCurvePx = evaluateCatenaryCurveY(u, edgeY, midY);

  // Gentle pendulum breeze sway + subtle catenary tangent follow as the bouquet glides right-to-left
  const breezeSway = safeSlots === 2 ? 0 : Math.sin(scrollOffset * 2.35 + index * 1.45) * 1.45;
  const ropeArcTilt = Math.max(-2.5, Math.min(2.5, (0.5 - u) * (safeSlots === 2 ? 2.4 : 3.2)));
  const rotateDeg = Number(
    ((safeSlots === 2 ? 0 : baseTiltDeg * 0.45) + breezeSway + ropeArcTilt).toFixed(2)
  );

  // Slight perspective emphasis near the center dip of the catenary curve
  const distFromCenter = Math.abs(u - 0.5);
  const scale = Number(
    Math.max(0.92, Math.min(1.03, 1.02 - distFromCenter * (safeSlots === 2 ? 0.08 : 0.16))).toFixed(3)
  );

  // Smooth fade-in on the right edge and fade-out on the left edge (tighter bounds on 2-slot mobile so off-slot cards never clip at screen edges)
  let opacity = 1;
  if (safeSlots === 2) {
    if (u < 0.2) {
      opacity = Math.max(0, Math.min(1, (u - 0.06) / 0.14));
    } else if (u > 0.8) {
      opacity = Math.max(0, Math.min(1, (0.94 - u) / 0.14));
    }
  } else {
    if (u < 0.1) {
      opacity = Math.max(0, Math.min(1, (u - -0.12) / 0.22));
    } else if (u > 0.9) {
      opacity = Math.max(0, Math.min(1, (1.12 - u) / 0.22));
    }
  }
  opacity = Number(opacity.toFixed(3));

  return {
    u: Number(u.toFixed(4)),
    xPercent,
    yCurvePx,
    rotateDeg,
    scale,
    opacity,
    isVisible:
      opacity > 0.01 &&
      (safeSlots === 2 ? u >= 0.05 && u <= 0.95 : u >= -0.15 && u <= 1.15),
  };
}

/**
 * Determines whether a shared bouquet has passed its showcase lifespan window:
 * - Free bouquet (`retentionDays`: 30 default): expires after 30 days.
 * - Paid Single Unlock / 7-Day Pass (`retentionDays`: 90): gets +60 bonus days and expires after 90 days.
 * - 30-Day Eternal Pass (`isPremium: true`): never expires.
 */
export function isShowcaseBouquetExpired(
  entry: Pick<ShowcaseBouquetEntry, 'sharedAt' | 'isPremium' | 'retentionDays'>,
  nowMs: number = Date.now()
): boolean {
  if (entry.isPremium) return false;
  const sharedMs = Date.parse(entry.sharedAt);
  if (!Number.isFinite(sharedMs)) return false;
  const elapsedMs = nowMs - sharedMs;
  const retentionDays =
    typeof entry.retentionDays === 'number' && entry.retentionDays > 0
      ? entry.retentionDays
      : SHOWCASE_EXPIRY_DAYS;
  const expiryMs = retentionDays * 24 * 60 * 60 * 1000;
  return elapsedMs > expiryMs;
}

/**
 * Returns true if the bouquet should be displayed on the Lace Garland Showcase.
 */
export function isShowcaseBouquetActive(
  entry: Pick<ShowcaseBouquetEntry, 'sharedAt' | 'isPremium' | 'retentionDays'>,
  nowMs: number = Date.now()
): boolean {
  return !isShowcaseBouquetExpired(entry, nowMs);
}

/**
 * Computes human-readable freshness metadata for a bouquet on the drying line.
 */
export function getShowcaseFreshnessInfo(
  entry: Pick<ShowcaseBouquetEntry, 'sharedAt' | 'isPremium' | 'retentionDays'>,
  nowMs: number = Date.now()
): ShowcaseFreshnessInfo {
  const sharedMs = Date.parse(entry.sharedAt);
  const validSharedMs = Number.isFinite(sharedMs) ? sharedMs : nowMs;
  const elapsedMs = Math.max(0, nowMs - validSharedMs);
  const daysAgo = Math.max(0, Math.floor(elapsedMs / (24 * 60 * 60 * 1000)));

  const sharedAgoLabel =
    daysAgo === 0 ? 'Shared today' : daysAgo === 1 ? 'Shared 1d ago' : `Shared ${daysAgo}d ago`;

  if (entry.isPremium) {
    return {
      daysLeft: null,
      daysAgo,
      label: 'Eternal keepsake',
      sharedAgoLabel,
      isExpiringSoon: false,
      isExtendedPaid: true,
    };
  }

  const retentionDays =
    typeof entry.retentionDays === 'number' && entry.retentionDays > 0
      ? entry.retentionDays
      : SHOWCASE_EXPIRY_DAYS;
  const expiryMs = retentionDays * 24 * 60 * 60 * 1000;
  const remainingMs = Math.max(0, expiryMs - elapsedMs);
  const daysLeft = Math.max(1, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
  const isExtendedPaid = retentionDays > SHOWCASE_EXPIRY_DAYS;

  return {
    daysLeft,
    daysAgo,
    label: `${daysLeft}d left`,
    sharedAgoLabel,
    isExpiringSoon: daysLeft <= 5,
    isExtendedPaid,
  };
}

/**
 * Filters showcase bouquets by:
 * 1. 30-day expiration (unless `isPremium` is true)
 * 2. `forQuery` (recipient / "For")
 * 3. `fromQuery` (sender / "From")
 * 4. `category` filter on the All Creations page
 */
export function filterShowcaseBouquets(
  entries: ShowcaseBouquetEntry[],
  options: ShowcaseFilterOptions = {}
): ShowcaseBouquetEntry[] {
  const nowMs = options.nowMs ?? Date.now();
  const rawUnified = (options.searchQuery ?? '').trim().toLowerCase();
  const forQ = (options.forQuery ?? '').trim().toLowerCase();
  const fromQ = (options.fromQuery ?? '').trim().toLowerCase();
  const category = options.category ?? 'all';

  return entries.filter((entry) => {
    if (!isShowcaseBouquetActive(entry, nowMs)) {
      return false;
    }
    const toLower = entry.to.toLowerCase();
    const fromLower = entry.from.toLowerCase();

    if (rawUnified) {
      // Support optional "for: name" / "from: name" prefixes or free-text matching across For & From
      const forPrefixMatch = rawUnified.match(/^(?:for|to)\s*:?\s+(.+)$/i);
      const fromPrefixMatch = rawUnified.match(/^(?:from|by)\s*:?\s+(.+)$/i);
      if (forPrefixMatch) {
        if (!toLower.includes(forPrefixMatch[1].trim())) return false;
      } else if (fromPrefixMatch) {
        if (!fromLower.includes(fromPrefixMatch[1].trim())) return false;
      } else {
        const tokens = rawUnified.split(/[\s,·•]+/).filter(Boolean);
        const matchesAllTokens = tokens.every(
          (tok) =>
            tok === 'for' ||
            tok === 'from' ||
            toLower.includes(tok) ||
            fromLower.includes(tok)
        );
        if (!matchesAllTokens) return false;
      }
    }

    if (forQ && !toLower.includes(forQ)) {
      return false;
    }
    if (fromQ && !fromLower.includes(fromQ)) {
      return false;
    }
    if (category !== 'all') {
      const freshness = getShowcaseFreshnessInfo(entry, nowMs);
      if (category === 'voice' && !entry.hasVoice) return false;
      if (category === 'eternal' && !entry.isPremium) return false;
      if (category === 'expiring_soon' && !freshness.isExpiringSoon) return false;
      if (category === 'cloche' && entry.wrapStyle !== 'cloche') return false;
      if (
        category === 'hatbox' &&
        entry.wrapStyle !== 'hatbox' &&
        entry.wrapStyle !== 'vase' &&
        entry.wrapStyle !== 'basket'
      ) {
        return false;
      }
      if (
        category === 'silk' &&
        entry.wrapStyle !== 'tissue' &&
        entry.wrapStyle !== 'koreanmesh' &&
        entry.wrapStyle !== 'lace'
      ) {
        return false;
      }
    }
    return true;
  });
}

function darkenHex(hex: string, amount = 22): string {
  const clean = (hex || '#FFD6E0').replace('#', '').trim();
  if (clean.length !== 6) return '#E5B8C4';
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) return '#E5B8C4';
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(((num >> 16) & 0xff) - amount);
  const g = clamp(((num >> 8) & 0xff) - amount);
  const b = clamp((num & 0xff) - amount);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * Converts a user's saved/shared bouquet into a Lace Garland Showcase item.
 */
export function convertVaultBouquetToShowcaseEntry(
  vaultItem: SavedVaultBouquet,
  snapshot?: BouquetSnapshot | null,
  idx = 0
): ShowcaseBouquetEntry {
  const tilts = [-1.6, 1.3, -1.1, 1.7, -1.4, 1.1];
  const drops = [14, 22, 16, 24, 15, 20];

  const mappedStems: ShowcaseStem[] =
    snapshot && Array.isArray(snapshot.items) && snapshot.items.length > 0
      ? snapshot.items
          .filter((item) => !item.hidden)
          .slice(0, 9)
          .map((item) => ({
            type: item.type,
            petal: item.petalColor,
            center: item.centerColor,
            x: Math.round(200 + (item.x - 300) / 1.65),
            y: Math.round(115 + (item.y - 255) / 2.8),
            rot: Math.max(-35, Math.min(35, item.rotation)),
            scale: Number(Math.max(0.55, Math.min(0.95, item.scale / 1.42)).toFixed(2)),
          }))
      : [
          { type: 'eucalyptus', petal: '#86EFAC', center: '#4ADE80', x: 150, y: 122, rot: -22, scale: 0.72 },
          { type: 'eucalyptus', petal: '#86EFAC', center: '#4ADE80', x: 250, y: 122, rot: 22, scale: 0.72 },
          { type: 'peony', petal: '#F472B6', center: '#FEF08A', x: 172, y: 132, rot: -12, scale: 0.84 },
          { type: 'rose', petal: '#E11D48', center: '#FDE047', x: 228, y: 132, rot: 12, scale: 0.84 },
          { type: 'ranunculus', petal: '#FB7185', center: '#FEF3C7', x: 200, y: 112, rot: 0, scale: 0.88 },
        ];

  const wrapStyle = snapshot?.wrapStyle || 'tissue';
  const wrapColor = snapshot?.wrapColor || '#FFD6E0';
  const ribbonStyle = snapshot?.ribbonStyle || 'lace';
  const ribbonColor = snapshot?.ribbonColor || '#E11D48';
  const rawMessage = snapshot?.card?.message?.trim();

  const hasVoice = Boolean(
    vaultItem.hasVoice ||
      snapshot?.voice?.audioDataUrl ||
      (snapshot?.voice?.visibleOnStage && (snapshot?.voice?.durationSec || 0) > 0)
  );

  const defaultPlaceholders = new Set([
    '',
    'my dearest',
    'yours always',
    'draft bouquet',
    'yours',
    'someone special',
    'secret admirer',
  ]);
  const vaultTo = (vaultItem.to || vaultItem.recipientName || '').trim();
  const vaultFrom = (vaultItem.from || vaultItem.senderName || '').trim();
  const snapTo = (snapshot?.card?.to || '').trim();
  const snapFrom = (snapshot?.card?.from || '').trim();

  const resolvedTo =
    (vaultTo && !defaultPlaceholders.has(vaultTo.toLowerCase()) ? vaultTo : '') ||
    (snapTo && !defaultPlaceholders.has(snapTo.toLowerCase()) ? snapTo : '') ||
    snapTo ||
    vaultTo ||
    'Someone Special';

  const resolvedFrom =
    (vaultFrom && !defaultPlaceholders.has(vaultFrom.toLowerCase()) ? vaultFrom : '') ||
    (snapFrom && !defaultPlaceholders.has(snapFrom.toLowerCase()) ? snapFrom : '') ||
    snapFrom ||
    vaultFrom ||
    'Yours';

  return {
    id: `user-shared-${vaultItem.code}`,
    code: vaultItem.code,
    to: resolvedTo,
    from: resolvedFrom,
    noteExcerpt: rawMessage
      ? `“${rawMessage.slice(0, 68)}${rawMessage.length > 68 ? '…' : ''}”`
      : '“Wrapped by hand and hung on the lace line just for you.”',
    sharedAt: vaultItem.createdAt || new Date().toISOString(),
    isPremium: Boolean(vaultItem.isPremium),
    retentionDays: vaultItem.retentionDays ?? SHOWCASE_EXPIRY_DAYS,
    hasVoice,
    voiceStyle: snapshot?.voice?.style || 'mixtape',
    voiceLabel: snapshot?.voice?.title || 'Voice Note',
    wrapStyle,
    wrapColor,
    wrapShadow: darkenHex(wrapColor, 20),
    ribbonStyle,
    ribbonColor,
    environment: snapshot?.environment || 'studio',
    stems: mappedStems,
    tiltDeg: tilts[idx % tilts.length],
    stringLengthPx: drops[idx % drops.length],
    isUserCreated: true,
    snapshot: snapshot
      ? {
          ...snapshot,
          environment: snapshot.environment || 'studio',
          lock: { mode: 'none' },
          card: {
            ...snapshot.card,
            to: resolvedTo,
            from: resolvedFrom,
            visibleOnStage: snapshot.card?.visibleOnStage ?? true,
          },
          voice: snapshot.voice
            ? {
                ...snapshot.voice,
                visibleOnStage: snapshot.voice.visibleOnStage ?? hasVoice,
              }
            : undefined,
        }
      : undefined,
  };
}

/**
 * Builds the exact full-stage BouquetSnapshot for any ShowcaseBouquetEntry.
 * If the entry is a user-created bouquet with a saved snapshot, returns that exact snapshot
 * (preserving custom flower positions, photocards, wrapper, ribbon, card, and voice keepsake).
 * Otherwise, converts the curated showcase entry into the identical BouquetSnapshot used when unwrapping.
 */
export function buildSnapshotFromShowcaseEntry(entry: ShowcaseBouquetEntry): BouquetSnapshot {
  if (entry.snapshot && Array.isArray(entry.snapshot.items) && entry.snapshot.items.length > 0) {
    const hasVoice = Boolean(entry.hasVoice || entry.snapshot.voice?.audioDataUrl);
    return {
      ...entry.snapshot,
      environment: entry.snapshot.environment || entry.environment || 'studio',
      card: {
        ...entry.snapshot.card,
        to: entry.to || entry.snapshot.card?.to || 'Someone Special',
        from: entry.from || entry.snapshot.card?.from || 'Secret Admirer',
        visibleOnStage: entry.snapshot.card?.visibleOnStage ?? true,
      },
      voice: entry.snapshot.voice
        ? {
            ...entry.snapshot.voice,
            visibleOnStage: entry.snapshot.voice.visibleOnStage ?? hasVoice,
          }
        : entry.hasVoice
        ? {
            ...DEFAULT_VOICE_KEEPSAKE,
            style: entry.voiceStyle || 'mixtape',
            title: (entry.voiceLabel || 'Voice Keepsake').split('·')[0].trim(),
            accentColor: entry.ribbonColor || '#FB7185',
            visibleOnStage: true,
            durationSec: 18,
            x: 185,
            y: 525,
            scale: 1.0,
            rotation: 0,
          }
        : {
            ...DEFAULT_VOICE_KEEPSAKE,
            visibleOnStage: false,
            durationSec: 0,
          },
    };
  }

  return {
    items: entry.stems.map((s, idx) => ({
      id: `showcase-${entry.id}-${idx}`,
      type: s.type,
      x: Math.round(300 + (s.x - 200) * 1.65),
      y: Math.round(245 + (s.y - 112) * 3.0),
      scale: Number((s.scale * 1.45).toFixed(2)),
      rotation: s.rot,
      flipX: s.rot > 0,
      petalColor: s.petal,
      centerColor: s.center,
      stemLength: 1,
      locked: false,
      hidden: false,
    })),
    wrapStyle: entry.wrapStyle,
    wrapColor: entry.wrapColor,
    ribbonStyle: entry.ribbonStyle,
    ribbonColor: entry.ribbonColor,
    environment: entry.environment || 'studio',
    card: {
      to: entry.to,
      from: entry.from,
      message: entry.noteExcerpt.replace(/^[“"]|[”"]$/g, ''),
      theme: 'sealed',
      visibleOnStage: true,
      x: 410,
      y: 525,
      scale: 0.72,
      rotation: 0,
    },
    voice: entry.hasVoice
      ? {
          ...DEFAULT_VOICE_KEEPSAKE,
          style: entry.voiceStyle || 'mixtape',
          title: (entry.voiceLabel || 'Voice Keepsake').split('·')[0].trim(),
          accentColor: entry.ribbonColor || '#FB7185',
          visibleOnStage: true,
          durationSec: 18,
          x: 185,
          y: 525,
          scale: 1.0,
          rotation: 0,
        }
      : {
          ...DEFAULT_VOICE_KEEPSAKE,
          visibleOnStage: false,
          durationSec: 0,
        },
  };
}

/**
 * Generates the curated community showcase entries anchored relative to `nowMs`.
 * Includes active bouquets within the 30-day window, an eternal keepsake (`isPremium: true`),
 * and an expired (>30 days) non-premium bouquet that is automatically filtered out.
 */
export function buildCuratedShowcaseBouquets(nowMs: number = Date.now()): ShowcaseBouquetEntry[] {
  const daysAgoIso = (days: number) => new Date(nowMs - days * 24 * 60 * 60 * 1000).toISOString();

  return [
    {
      id: 'garland-sophia-julian',
      code: 'shw_sophia01',
      to: 'Sophia',
      from: 'Julian',
      noteExcerpt: '“For every quiet morning coffee and every laugh we share.”',
      sharedAt: daysAgoIso(2), // 28d left
      isPremium: false,
      hasVoice: true,
      voiceStyle: 'mixtape',
      voiceLabel: 'Side A · 0:18',
      wrapStyle: 'tissue',
      wrapColor: '#FFD6E0',
      wrapShadow: '#F7B2C4',
      ribbonStyle: 'lace',
      ribbonColor: '#E11D48',
      tiltDeg: -1.8,
      stringLengthPx: 14,
      stems: [
        { type: 'eucalyptus', petal: '#86EFAC', center: '#4ADE80', x: 145, y: 120, rot: -26, scale: 0.72 },
        { type: 'eucalyptus', petal: '#86EFAC', center: '#4ADE80', x: 255, y: 120, rot: 26, scale: 0.72 },
        { type: 'sweetpea', petal: '#FBCFE8', center: '#FCE7F3', x: 148, y: 142, rot: -20, scale: 0.75 },
        { type: 'queenanneslace', petal: '#FFFDF9', center: '#D9F99D', x: 252, y: 142, rot: 20, scale: 0.75 },
        { type: 'peony', petal: '#F472B6', center: '#FEF08A', x: 170, y: 132, rot: -12, scale: 0.85 },
        { type: 'rose', petal: '#E11D48', center: '#FDE047', x: 230, y: 134, rot: 12, scale: 0.84 },
        { type: 'ranunculus', petal: '#FB7185', center: '#FEF3C7', x: 200, y: 112, rot: 0, scale: 0.9 },
      ],
    },
    {
      id: 'garland-mom-noah',
      code: 'shw_mom_noah',
      to: 'Mom',
      from: 'Noah',
      noteExcerpt: '“Thank you for always being my calm harbor—love you endlessly.”',
      sharedAt: daysAgoIso(5), // 25d left
      isPremium: false,
      hasVoice: true,
      voiceStyle: 'musicbox',
      voiceLabel: 'Lullaby · 0:24',
      wrapStyle: 'cloche',
      wrapColor: '#D6B38E',
      wrapShadow: '#B4846C',
      ribbonStyle: 'chiffon',
      ribbonColor: '#E11D48',
      tiltDeg: 1.4,
      stringLengthPx: 20,
      stems: [
        { type: 'waxflower', petal: '#FBCFE8', center: '#FDE68A', x: 164, y: 140, rot: -15, scale: 0.68 },
        { type: 'babysBreath', petal: '#FFFFFF', center: '#FEF9C3', x: 236, y: 140, rot: 15, scale: 0.68 },
        { type: 'tulip', petal: '#FB7185', center: '#FEF08A', x: 178, y: 132, rot: -10, scale: 0.76 },
        { type: 'freesia', petal: '#C4B5FD', center: '#FDE047', x: 222, y: 132, rot: 10, scale: 0.76 },
        { type: 'lily', petal: '#F9A8D4', center: '#FDE047', x: 200, y: 116, rot: 0, scale: 0.8 },
      ],
    },
    {
      id: 'garland-elena-mateo',
      code: 'shw_elena_mt',
      to: 'Elena',
      from: 'Mateo',
      noteExcerpt: '“Counting down the days until I get to hold your hand again.”',
      sharedAt: daysAgoIso(9), // 21d left
      isPremium: false,
      hasVoice: true,
      voiceStyle: 'vinyl',
      voiceLabel: 'Our Song · 0:21',
      wrapStyle: 'hatbox',
      wrapColor: '#9F1239',
      wrapShadow: '#881337',
      ribbonStyle: 'goldchain',
      ribbonColor: '#F59E0B',
      tiltDeg: -1.2,
      stringLengthPx: 16,
      stems: [
        { type: 'pampas', petal: '#F5E6D3', center: '#E7D5C0', x: 145, y: 126, rot: -24, scale: 0.78 },
        { type: 'astilbe', petal: '#F9A8D4', center: '#F472B6', x: 255, y: 126, rot: 24, scale: 0.78 },
        { type: 'callalily', petal: '#FFFBEB', center: '#F59E0B', x: 170, y: 128, rot: -12, scale: 0.85 },
        { type: 'poppy', petal: '#F43F5E', center: '#1E293B', x: 230, y: 130, rot: 12, scale: 0.85 },
        { type: 'hydrangea', petal: '#FDA4AF', center: '#FFF1F2', x: 200, y: 112, rot: 0, scale: 0.88 },
      ],
    },
    {
      id: 'garland-maya-chloe',
      code: 'shw_maya_chl',
      to: 'Maya',
      from: 'Chloe',
      noteExcerpt: '“So proud of your studio opening! Sending you the biggest hug.”',
      sharedAt: daysAgoIso(14), // 16d left
      isPremium: false,
      hasVoice: false,
      wrapStyle: 'koreanmesh',
      wrapColor: '#EDE0F5',
      wrapShadow: '#D8B4FE',
      ribbonStyle: 'double',
      ribbonColor: '#A855F7',
      tiltDeg: 1.7,
      stringLengthPx: 18,
      stems: [
        { type: 'lavender', petal: '#A78BFA', center: '#7C3AED', x: 146, y: 134, rot: -22, scale: 0.78 },
        { type: 'eucalyptus', petal: '#A7F3D0', center: '#6EE7B7', x: 254, y: 134, rot: 22, scale: 0.78 },
        { type: 'orchid', petal: '#F5D0FE', center: '#F472B6', x: 170, y: 130, rot: -12, scale: 0.84 },
        { type: 'anemone', petal: '#FAF5FF', center: '#312E81', x: 230, y: 132, rot: 12, scale: 0.84 },
        { type: 'hydrangea', petal: '#DDD6FE', center: '#FAF5FF', x: 200, y: 112, rot: 0, scale: 0.88 },
      ],
    },
    {
      id: 'garland-claire-theo',
      code: 'shw_clair_th',
      to: 'Claire',
      from: 'Theo',
      noteExcerpt: '“Three years of us, preserved on the lace line forever.”',
      sharedAt: daysAgoIso(44), // Older than 30 days, kept alive because isPremium === true!
      isPremium: true,
      hasVoice: true,
      voiceStyle: 'locket',
      voiceLabel: 'Always · 0:16',
      wrapStyle: 'tissue',
      wrapColor: '#FDE8EF',
      wrapShadow: '#F5C2D4',
      ribbonStyle: 'velvet',
      ribbonColor: '#9F1239',
      tiltDeg: -1.5,
      stringLengthPx: 15,
      stems: [
        { type: 'oliveBranch', petal: '#86EFAC', center: '#4ADE80', x: 148, y: 124, rot: -24, scale: 0.74 },
        { type: 'oliveBranch', petal: '#86EFAC', center: '#4ADE80', x: 252, y: 124, rot: 24, scale: 0.74 },
        { type: 'camellia', petal: '#FDA4AF', center: '#FEF08A', x: 172, y: 132, rot: -11, scale: 0.84 },
        { type: 'dahlia', petal: '#F43F5E', center: '#FDE68A', x: 228, y: 132, rot: 11, scale: 0.84 },
        { type: 'peony', petal: '#FB7185', center: '#FEF9C3', x: 200, y: 110, rot: 0, scale: 0.9 },
      ],
    },
    {
      id: 'garland-liam-hannah',
      code: 'shw_liam_hnh',
      to: 'Liam',
      from: 'Hannah',
      noteExcerpt: '“Just a little sunshine for your desk this week.”',
      sharedAt: daysAgoIso(27), // 3d left (expiring soon!)
      isPremium: false,
      hasVoice: true,
      voiceStyle: 'plushie',
      voiceLabel: 'Press Me · 0:12',
      wrapStyle: 'tissue',
      wrapColor: '#FEF3C7',
      wrapShadow: '#FDE68A',
      ribbonStyle: 'waxCord',
      ribbonColor: '#B4846C',
      tiltDeg: 1.2,
      stringLengthPx: 18,
      stems: [
        { type: 'babysBreath', petal: '#FFFFFF', center: '#FEF08A', x: 148, y: 126, rot: -22, scale: 0.72 },
        { type: 'babysBreath', petal: '#FFFFFF', center: '#FEF08A', x: 252, y: 126, rot: 22, scale: 0.72 },
        { type: 'daisy', petal: '#FFFFFF', center: '#FACC15', x: 170, y: 132, rot: -12, scale: 0.84 },
        { type: 'tulip', petal: '#FDBA74', center: '#FEF08A', x: 230, y: 132, rot: 12, scale: 0.84 },
        { type: 'sunflower', petal: '#FACC15', center: '#78350F', x: 200, y: 112, rot: 0, scale: 0.88 },
      ],
    },
    {
      id: 'garland-ava-lucas',
      code: 'shw_ava_lucs',
      to: 'Ava',
      from: 'Lucas',
      noteExcerpt: '“Every petal reminded me of your laugh on Sunday afternoon.”',
      sharedAt: daysAgoIso(19), // 11d left
      isPremium: false,
      hasVoice: true,
      voiceStyle: 'mixtape',
      voiceLabel: 'Sunday · 0:15',
      wrapStyle: 'cloche',
      wrapColor: '#D6B38E',
      wrapShadow: '#B4846C',
      ribbonStyle: 'lace',
      ribbonColor: '#F472B6',
      tiltDeg: -1.3,
      stringLengthPx: 20,
      stems: [
        { type: 'eucalyptus', petal: '#A7F3D0', center: '#6EE7B7', x: 162, y: 136, rot: -16, scale: 0.68 },
        { type: 'eucalyptus', petal: '#A7F3D0', center: '#6EE7B7', x: 238, y: 136, rot: 16, scale: 0.68 },
        { type: 'cherryBlossom', petal: '#FBCFE8', center: '#FEF08A', x: 176, y: 128, rot: -10, scale: 0.76 },
        { type: 'sweetpea', petal: '#F472B6', center: '#FFF1F2', x: 224, y: 128, rot: 10, scale: 0.76 },
        { type: 'peony', petal: '#FB7185', center: '#FEF08A', x: 200, y: 114, rot: 0, scale: 0.82 },
      ],
    },
    {
      id: 'garland-isabelle-sora',
      code: 'shw_isab_sra',
      to: 'Isabelle',
      from: 'Sora',
      noteExcerpt: '“Wishing you the happiest birthday from across the ocean.”',
      sharedAt: daysAgoIso(29), // 1d left (expiring soon!)
      isPremium: true,
      hasVoice: false,
      wrapStyle: 'hatbox',
      wrapColor: '#881337',
      wrapShadow: '#4C0519',
      ribbonStyle: 'goldchain',
      ribbonColor: '#F59E0B',
      tiltDeg: 1.5,
      stringLengthPx: 16,
      stems: [
        { type: 'queenanneslace', petal: '#FFFDF9', center: '#D9F99D', x: 150, y: 124, rot: -20, scale: 0.74 },
        { type: 'astilbe', petal: '#FDA4AF', center: '#F43F5E', x: 250, y: 124, rot: 20, scale: 0.74 },
        { type: 'rose', petal: '#E11D48', center: '#FDE047', x: 172, y: 130, rot: -12, scale: 0.85 },
        { type: 'ranunculus', petal: '#FB7185', center: '#FEF3C7', x: 228, y: 130, rot: 12, scale: 0.85 },
        { type: 'dahlia', petal: '#BE123C', center: '#FDE68A', x: 200, y: 112, rot: 0, scale: 0.88 },
      ],
    },
    {
      id: 'garland-expired-sample',
      code: 'shw_exp_old1',
      to: 'Archived Recipient',
      from: 'Archived Sender',
      noteExcerpt: '“This bouquet was shared 35 days ago without premium and has expired.”',
      sharedAt: daysAgoIso(35), // > 30 days ago & not premium -> automatically hidden!
      isPremium: false,
      hasVoice: false,
      wrapStyle: 'tissue',
      wrapColor: '#FFD6E0',
      wrapShadow: '#F7B2C4',
      ribbonStyle: 'lace',
      ribbonColor: '#E11D48',
      tiltDeg: 0,
      stringLengthPx: 20,
      stems: [
        { type: 'rose', petal: '#E11D48', center: '#FDE047', x: 200, y: 116, rot: 0, scale: 0.85 },
      ],
    },
  ];
}
