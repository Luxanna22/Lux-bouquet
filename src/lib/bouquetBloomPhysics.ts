import {
  BouquetItem,
  FLOWER_CATALOG,
  getEffectiveItemPlane,
  getStageItemDisplayTransform,
  typeWrapStyle,
} from '../types/bouquet';

// ============================================================================
// PURE BOTANICAL UNWRAP CHOREOGRAPHY, SPRING EMERGENCE & LIVING RUSTLE ENGINE
// ============================================================================

export type BloomItemCohort = 'foliage' | 'bloom' | 'accent' | 'photo';

export interface WrapperEmergenceOrigin {
  throatX: number;
  throatY: number;
  spreadFactor: number;
  liftScale: number;
}

export interface StemChoreographyPlan {
  id: string;
  cohort: BloomItemCohort;
  plane: 'back' | 'inside' | 'front';
  anchorX: number;
  anchorY: number;
  pivotX: number;
  pivotY: number;
  delayMs: number;
  durationMs: number;
  originOffsetX: number;
  originOffsetY: number;
  originRotateDeg: number;
  originScale: number;
  omega: number;
  zeta: number;
  swayAmpDeg: number;
  swayBobPx: number;
  swayFreqHz: number;
  swayPhase: number;
  rustleSensitivity: number;
  rustleStiffness: number;
  rustleDamping: number;
  maxRustleDeg: number;
}

export interface BouquetBloomPlan {
  wrapperDelayMs: number;
  wrapperDurationMs: number;
  wrapperOriginY: number;
  wrapperOriginScale: number;
  cardDelayMs: number;
  cardDurationMs: number;
  voiceDelayMs: number;
  voiceDurationMs: number;
  totalBloomMs: number;
  reducedMotion: boolean;
  items: StemChoreographyPlan[];
  byId: Record<string, StemChoreographyPlan>;
}

export interface EvaluatedTransform {
  translateX: number;
  translateY: number;
  rotateDeg: number;
  scale: number;
  opacity: number;
  revealProgress: number;
  breezeBlend: number;
}

export interface StemRustleState {
  angleDeg: number;
  angularVel: number;
  pushX: number;
  pushY: number;
  velX: number;
  velY: number;
}

const WRAPPER_EMERGENCE_MAP: Record<typeWrapStyle, WrapperEmergenceOrigin> = {
  kraft:      { throatX: 300, throatY: 472, spreadFactor: 0.74, liftScale: 1.0 },
  tissue:     { throatX: 300, throatY: 458, spreadFactor: 0.72, liftScale: 0.96 },
  chalice:    { throatX: 300, throatY: 470, spreadFactor: 0.74, liftScale: 1.0 },
  vintage:    { throatX: 300, throatY: 462, spreadFactor: 0.72, liftScale: 0.98 },
  lace:       { throatX: 300, throatY: 452, spreadFactor: 0.72, liftScale: 0.96 },
  celestial:  { throatX: 300, throatY: 464, spreadFactor: 0.72, liftScale: 0.98 },
  koreanmesh: { throatX: 300, throatY: 464, spreadFactor: 0.74, liftScale: 1.0 },
  basket:     { throatX: 300, throatY: 420, spreadFactor: 0.64, liftScale: 0.9 },
  vase:       { throatX: 300, throatY: 408, spreadFactor: 0.68, liftScale: 0.92 },
  hatbox:     { throatX: 300, throatY: 414, spreadFactor: 0.64, liftScale: 0.9 },
  cloche:     { throatX: 300, throatY: 468, spreadFactor: 0.62, liftScale: 0.92 },
  plain:      { throatX: 300, throatY: 474, spreadFactor: 0.56, liftScale: 0.85 },
};

export function getWrapperEmergenceOrigin(wrapStyle: typeWrapStyle): WrapperEmergenceOrigin {
  return WRAPPER_EMERGENCE_MAP[wrapStyle] || WRAPPER_EMERGENCE_MAP.kraft;
}

/** Deterministic [0, 1) hash for subtle per-stem organic phase/frequency variation. */
export function hashStringUnit(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

export function classifyBloomCohort(item: BouquetItem): BloomItemCohort {
  if (item.photoStyle) return 'photo';
  const meta = FLOWER_CATALOG.find((m) => m.type === item.type);
  if (meta?.isOther) return 'accent';
  const plane = getEffectiveItemPlane(item);
  if (meta?.isFoliage || meta?.isFiller || plane === 'back') {
    return 'foliage';
  }
  return 'bloom';
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function round1(v: number): number {
  const r = Math.round(v * 10) / 10;
  return r === 0 ? 0 : r;
}

function round2(v: number): number {
  const r = Math.round(v * 100) / 100;
  return r === 0 ? 0 : r;
}

function round3(v: number): number {
  const r = Math.round(v * 1000) / 1000;
  return r === 0 ? 0 : r;
}

function round4(v: number): number {
  const r = Math.round(v * 10000) / 10000;
  return r === 0 ? 0 : r;
}

/** Frame pacing interval (ms) once fully settled into calm ambient breeze (~30fps). */
export const LIVING_BREEZE_FRAME_INTERVAL_MS = 32;

/** Pointer move throttle interval (ms) for interactive rustle to avoid high-Hz layout thrash. */
export const RUSTLE_POINTER_THROTTLE_MS = 24;

/**
 * Analytic closed-form damped harmonic spring response starting at f(0)=0, f'(0)=0
 * and settling toward 1.0. For 0 < zeta < 1 it produces a silky botanical overshoot.
 */
export function evaluateDampedSpring(
  elapsedSec: number,
  omega: number,
  zeta: number,
  durationSec: number
): number {
  if (elapsedSec <= 0) return 0;
  if (elapsedSec >= durationSec) return 1;

  const t = elapsedSec;
  let value: number;
  if (zeta < 0.999) {
    const wd = omega * Math.sqrt(1 - zeta * zeta);
    const decay = Math.exp(-zeta * omega * t);
    value = 1 - decay * (Math.cos(wd * t) + (zeta / Math.sqrt(1 - zeta * zeta)) * Math.sin(wd * t));
  } else {
    const decay = Math.exp(-omega * t);
    value = 1 - decay * (1 + omega * t);
  }

  // Smoothly blend the tiny tail residue to exact 1.0 over the final 14% of duration
  const tailStart = durationSec * 0.86;
  if (t > tailStart) {
    const u = clamp((t - tailStart) / Math.max(0.001, durationSec - tailStart), 0, 1);
    const smooth = u * u * (3 - 2 * u);
    value = value + (1 - value) * smooth;
  }
  return value;
}

/**
 * Builds the full 3-beat staged choreography plan:
 * Beat 1: Wrapper & ribbon settle (0ms..wrapperDurationMs)
 * Beat 2: Botanical stems & greenery emerge from inside wrapper throat & fan out
 * Beat 3: Photocards, Greeting Card & Voice Keepsake settle cleanly into place
 */
export function buildBouquetBloomPlan(
  items: BouquetItem[],
  wrapStyle: typeWrapStyle,
  reducedMotion = false
): BouquetBloomPlan {
  const origin = getWrapperEmergenceOrigin(wrapStyle);
  const visibleItems = items.filter((it) => !it.hidden);

  const wrapperDelayMs = 0;
  const wrapperDurationMs = reducedMotion ? 220 : 480;
  const wrapperOriginY = reducedMotion ? 8 : 34;
  const wrapperOriginScale = reducedMotion ? 0.985 : 0.935;

  // Partition items into staged cohorts
  const entries = visibleItems.map((item, idx) => {
    const disp = getStageItemDisplayTransform(item, wrapStyle);
    const plane = getEffectiveItemPlane(item);
    const cohort = classifyBloomCohort(item);
    const dxFromCenter = disp.x - origin.throatX;
    const distFromCenter = Math.hypot(dxFromCenter, (disp.y - 260) * 0.7);
    return { item, idx, disp, plane, cohort, dxFromCenter, distFromCenter };
  });

  const foliageEntries = entries
    .filter((e) => e.cohort === 'foliage')
    .sort((a, b) => a.distFromCenter - b.distFromCenter || a.idx - b.idx);
  const bloomEntries = entries
    .filter((e) => e.cohort === 'bloom')
    .sort((a, b) => a.distFromCenter - b.distFromCenter || a.idx - b.idx);
  const accentEntries = entries
    .filter((e) => e.cohort === 'accent')
    .sort((a, b) => a.distFromCenter - b.distFromCenter || a.idx - b.idx);
  const photoEntries = entries
    .filter((e) => e.cohort === 'photo')
    .sort((a, b) => a.idx - b.idx);

  const botanicalCount = foliageEntries.length + bloomEntries.length + accentEntries.length;
  const botanicalStartMs = reducedMotion ? 60 : 280;
  // Total launch window for stems stays lively even on 20+ stem bouquets
  const stemLaunchWindowMs = reducedMotion
    ? Math.min(260, Math.max(80, botanicalCount * 22))
    : botanicalCount <= 1
    ? 0
    : clamp(botanicalCount * 68, 340, 1020);

  const planned: StemChoreographyPlan[] = [];
  const orderedBotanical = [...foliageEntries, ...bloomEntries, ...accentEntries];

  let lastBotanicalLaunchMs = botanicalStartMs;
  let lastBotanicalEndMs = botanicalStartMs + (reducedMotion ? 220 : 720);

  orderedBotanical.forEach((entry, orderIdx) => {
    const { item, disp, plane, cohort, dxFromCenter } = entry;
    const u = orderedBotanical.length <= 1 ? 0 : orderIdx / (orderedBotanical.length - 1);
    const cohortBiasMs =
      cohort === 'foliage' ? 0 : cohort === 'bloom' ? (reducedMotion ? 20 : 75) : reducedMotion ? 40 : 155;
    const delayMs = Math.round(botanicalStartMs + u * stemLaunchWindowMs * 0.82 + cohortBiasMs);
    const durationMs = reducedMotion
      ? 240
      : cohort === 'accent'
      ? 780
      : cohort === 'foliage'
      ? 860
      : 920;

    // Vector from item's resting coordinates back down into the wrapper throat
    const rawDy = origin.throatY - disp.y;
    const maxLift = plane === 'front' ? 115 : 215;
    const minLift = plane === 'front' ? 38 : 64;
    const originOffsetY = reducedMotion
      ? 10
      : Math.round(clamp(rawDy * origin.liftScale, minLift, maxLift));
    const originOffsetX = reducedMotion
      ? 0
      : Math.round(clamp(-dxFromCenter * origin.spreadFactor * (plane === 'front' ? 0.48 : 0.86), -145, 145));

    // Fan-out angle: left stems start tilted inward (+), right stems tilted inward (-)
    const signedSpread = clamp(dxFromCenter / 155, -1, 1);
    const fanMag = cohort === 'accent' ? 10 : cohort === 'foliage' ? 17 : 14;
    const originRotateDeg = reducedMotion ? 0 : Number((-signedSpread * fanMag).toFixed(2));
    const originScale = reducedMotion ? 0.94 : cohort === 'accent' ? 0.56 : 0.48;

    // Pivot near stem base toward the wrapper throat so sway & rustle bend from the stem root
    const pivotX = Number((disp.x + (origin.throatX - disp.x) * 0.24).toFixed(1));
    const pivotY = Number(
      clamp(disp.y + (cohort === 'accent' ? 42 : 92) * disp.scale, disp.y + 28, origin.throatY + 18).toFixed(1)
    );

    const h1 = hashStringUnit(item.id);
    const h2 = hashStringUnit(`${item.id}:breeze`);
    const outerReach = clamp(Math.abs(dxFromCenter) / 170 + Math.max(0, 320 - disp.y) / 260, 0.35, 1.45);

    const swayAmpDeg = reducedMotion
      ? 0
      : Number(
          (
            (cohort === 'foliage' ? 2.15 : cohort === 'accent' ? 1.85 : 1.55) *
            (0.65 + outerReach * 0.42)
          ).toFixed(2)
        );
    const swayBobPx = reducedMotion
      ? 0
      : Number((cohort === 'accent' ? 2.2 : 0.9 + h2 * 0.7).toFixed(2));
    const swayFreqHz = Number((0.26 + h1 * 0.18).toFixed(3));
    const swayPhase = Number((h2 * Math.PI * 2).toFixed(3));

    const planItem: StemChoreographyPlan = {
      id: item.id,
      cohort,
      plane,
      anchorX: disp.x,
      anchorY: disp.y,
      pivotX,
      pivotY,
      delayMs,
      durationMs,
      originOffsetX,
      originOffsetY,
      originRotateDeg,
      originScale,
      // Underdamped spring constants tuned for silky organic overshoot (~4-5%)
      omega: cohort === 'accent' ? 10.6 : 9.4,
      zeta: cohort === 'accent' ? 0.66 : 0.68,
      swayAmpDeg,
      swayBobPx,
      swayFreqHz,
      swayPhase,
      rustleSensitivity: cohort === 'foliage' ? 1.15 : cohort === 'accent' ? 1.05 : 0.92,
      rustleStiffness: cohort === 'foliage' ? 42 : cohort === 'accent' ? 48 : 52,
      rustleDamping: cohort === 'foliage' ? 6.2 : 7.0,
      maxRustleDeg: cohort === 'foliage' ? 12 : 10,
    };

    planned.push(planItem);
    lastBotanicalLaunchMs = Math.max(lastBotanicalLaunchMs, delayMs);
    lastBotanicalEndMs = Math.max(lastBotanicalEndMs, delayMs + durationMs);
  });

  // Beat 3: Photocards arrive right after the floral canopy opens
  const photoBaseDelayMs =
    orderedBotanical.length > 0
      ? Math.round(botanicalStartMs + Math.max(reducedMotion ? 100 : 420, (lastBotanicalLaunchMs - botanicalStartMs) + (reducedMotion ? 60 : 210)))
      : reducedMotion
      ? 100
      : 320;

  let lastPhotoEndMs = photoBaseDelayMs;
  photoEntries.forEach((entry, photoIdx) => {
    const { item, disp, plane, dxFromCenter } = entry;
    const delayMs = photoBaseDelayMs + photoIdx * (reducedMotion ? 45 : 130);
    const durationMs = reducedMotion ? 220 : 660;
    const signedSpread = clamp(dxFromCenter / 160, -1, 1);
    const originOffsetY = reducedMotion ? 10 : Math.round(clamp(origin.throatY - disp.y, 48, 128));
    const originOffsetX = reducedMotion ? 0 : Math.round(clamp(-dxFromCenter * 0.28, -58, 58));
    const h1 = hashStringUnit(item.id);
    const h2 = hashStringUnit(`${item.id}:photo`);

    const planItem: StemChoreographyPlan = {
      id: item.id,
      cohort: 'photo',
      plane,
      anchorX: disp.x,
      anchorY: disp.y,
      pivotX: disp.x,
      pivotY: Number((disp.y + 52 * disp.scale).toFixed(1)),
      delayMs,
      durationMs,
      originOffsetX,
      originOffsetY,
      originRotateDeg: reducedMotion ? 0 : Number((-signedSpread * 7.5 + (photoIdx % 2 === 0 ? -2.5 : 2.5)).toFixed(2)),
      originScale: reducedMotion ? 0.95 : 0.76,
      // Crisper cardstock feel: slightly higher damping, minimal overshoot
      omega: 11.4,
      zeta: 0.78,
      swayAmpDeg: reducedMotion ? 0 : 0.42,
      swayBobPx: reducedMotion ? 0 : 0.45,
      swayFreqHz: Number((0.22 + h1 * 0.08).toFixed(3)),
      swayPhase: Number((h2 * Math.PI * 2).toFixed(3)),
      rustleSensitivity: 0.34,
      rustleStiffness: 78,
      rustleDamping: 10.5,
      maxRustleDeg: 3.5,
    };

    planned.push(planItem);
    lastPhotoEndMs = Math.max(lastPhotoEndMs, delayMs + durationMs);
  });

  // Greeting Card & Voice Keepsake arrive as Beat 3 finale
  const cardDelayMs =
    photoEntries.length > 0
      ? photoBaseDelayMs + Math.min(220, photoEntries.length * (reducedMotion ? 30 : 95))
      : photoBaseDelayMs;
  const cardDurationMs = reducedMotion ? 220 : 620;
  const voiceDelayMs = cardDelayMs + (reducedMotion ? 40 : 120);
  const voiceDurationMs = reducedMotion ? 220 : 580;

  const totalBloomMs = Math.max(
    wrapperDurationMs,
    lastBotanicalEndMs,
    lastPhotoEndMs,
    voiceDelayMs + voiceDurationMs
  );

  const byId: Record<string, StemChoreographyPlan> = {};
  for (const item of planned) {
    byId[item.id] = item;
  }

  return {
    wrapperDelayMs,
    wrapperDurationMs,
    wrapperOriginY,
    wrapperOriginScale,
    cardDelayMs,
    cardDurationMs,
    voiceDelayMs,
    voiceDurationMs,
    totalBloomMs,
    reducedMotion,
    items: planned,
    byId,
  };
}

/**
 * Evaluates Beat 1 wrapper/ribbon entrance transform at elapsedMs since unwrap started.
 */
export function evaluateWrapperReveal(
  plan: BouquetBloomPlan,
  elapsedMs: number
): EvaluatedTransform {
  const localMs = elapsedMs - plan.wrapperDelayMs;
  if (localMs <= 0) {
    return {
      translateX: 0,
      translateY: plan.wrapperOriginY,
      rotateDeg: 0,
      scale: plan.wrapperOriginScale,
      opacity: 0,
      revealProgress: 0,
      breezeBlend: 0,
    };
  }

  const durationSec = plan.wrapperDurationMs / 1000;
  const tSec = localMs / 1000;
  const spring = plan.reducedMotion
    ? clamp(tSec / durationSec, 0, 1)
    : evaluateDampedSpring(tSec, 10.2, 0.82, durationSec);
  const opacity = clamp(localMs / Math.max(90, plan.wrapperDurationMs * 0.42), 0, 1);

  return {
    translateX: 0,
    translateY: round1(plan.wrapperOriginY * (1 - spring)),
    rotateDeg: 0,
    scale: round4(plan.wrapperOriginScale + (1 - plan.wrapperOriginScale) * spring),
    opacity: round3(opacity),
    revealProgress: clamp(tSec / durationSec, 0, 1),
    breezeBlend: 0,
  };
}

/**
 * Evaluates Beat 3 keepsake (Greeting Card or Voice Keepsake) entrance transform.
 */
export function evaluateKeepsakeReveal(
  delayMs: number,
  durationMs: number,
  elapsedMs: number,
  reducedMotion: boolean,
  tiltSign: -1 | 1 = -1
): EvaluatedTransform {
  const localMs = elapsedMs - delayMs;
  if (localMs <= 0) {
    return {
      translateX: 0,
      translateY: reducedMotion ? 8 : 34,
      rotateDeg: reducedMotion ? 0 : tiltSign * 5.5,
      scale: reducedMotion ? 0.96 : 0.82,
      opacity: 0,
      revealProgress: 0,
      breezeBlend: 0,
    };
  }
  const durationSec = durationMs / 1000;
  const tSec = localMs / 1000;
  const spring = reducedMotion
    ? clamp(tSec / durationSec, 0, 1)
    : evaluateDampedSpring(tSec, 11.2, 0.76, durationSec);
  const opacity = clamp(localMs / Math.max(90, durationMs * 0.34), 0, 1);
  const startY = reducedMotion ? 8 : 34;
  const startScale = reducedMotion ? 0.96 : 0.82;
  const startRot = reducedMotion ? 0 : tiltSign * 5.5;

  return {
    translateX: 0,
    translateY: round1(startY * (1 - spring)),
    rotateDeg: round2(startRot * (1 - spring)),
    scale: round4(startScale + (1 - startScale) * spring),
    opacity: round3(opacity),
    revealProgress: clamp(tSec / durationSec, 0, 1),
    breezeBlend: 0,
  };
}

/**
 * Evaluates a single stem/photo/accent reveal + smoothly blended ambient breeze + interactive rustle.
 */
export function evaluateStemFrame(
  stem: StemChoreographyPlan,
  elapsedMs: number,
  liveTimeSec: number,
  rustle: StemRustleState | undefined,
  reducedMotion: boolean
): EvaluatedTransform {
  const localMs = elapsedMs - stem.delayMs;
  if (localMs <= 0) {
    return {
      translateX: stem.originOffsetX,
      translateY: stem.originOffsetY,
      rotateDeg: stem.originRotateDeg,
      scale: stem.originScale,
      opacity: 0,
      revealProgress: 0,
      breezeBlend: 0,
    };
  }

  const durationSec = stem.durationMs / 1000;
  const tSec = localMs / 1000;
  const linearProgress = clamp(tSec / durationSec, 0, 1);
  const spring = reducedMotion
    ? 1 - Math.pow(1 - linearProgress, 2.2)
    : evaluateDampedSpring(tSec, stem.omega, stem.zeta, durationSec);

  // Opacity opens quickly as the stem emerges past the wrapper rim so it never looks ghostly
  const opacity = clamp(localMs / Math.max(85, stem.durationMs * 0.26), 0, 1);

  // Smoothly blend ambient breeze in over the final 40% of reveal so there is zero seam/pop
  const breezeBlend = reducedMotion
    ? 0
    : clamp((linearProgress - 0.58) / 0.42, 0, 1);
  const smoothBreezeBlend = breezeBlend * breezeBlend * (3 - 2 * breezeBlend);

  // Multi-harmonic gentle garden breeze: global soft gust envelope + stem natural sway
  const globalWind = Math.sin(liveTimeSec * 0.85) * 0.35 + 0.65;
  const primaryWave = Math.sin(liveTimeSec * stem.swayFreqHz * Math.PI * 2 + stem.swayPhase);
  const secondaryWave = Math.sin(liveTimeSec * stem.swayFreqHz * 1.67 * Math.PI * 2 + stem.swayPhase * 1.7);
  const breezeAngleDeg =
    (primaryWave * 0.72 + secondaryWave * 0.28) * stem.swayAmpDeg * globalWind * smoothBreezeBlend;
  const breezeBobY =
    Math.cos(liveTimeSec * stem.swayFreqHz * Math.PI * 2 + stem.swayPhase) *
    stem.swayBobPx *
    smoothBreezeBlend;

  const rustleAngle = reducedMotion ? 0 : (rustle?.angleDeg ?? 0) * smoothBreezeBlend;
  const rustleX = reducedMotion ? 0 : (rustle?.pushX ?? 0) * smoothBreezeBlend;
  const rustleY = reducedMotion ? 0 : (rustle?.pushY ?? 0) * smoothBreezeBlend;

  const translateX = stem.originOffsetX * (1 - spring) + rustleX;
  const translateY = stem.originOffsetY * (1 - spring) + breezeBobY + rustleY;
  const rotateDeg = stem.originRotateDeg * (1 - spring) + breezeAngleDeg + rustleAngle;
  const scale = stem.originScale + (1 - stem.originScale) * spring;

  return {
    translateX: round1(translateX),
    translateY: round1(translateY),
    rotateDeg: round2(rotateDeg),
    scale: round4(scale),
    opacity: round3(opacity),
    revealProgress: linearProgress,
    breezeBlend: smoothBreezeBlend,
  };
}

export function createZeroRustleState(): StemRustleState {
  return {
    angleDeg: 0,
    angularVel: 0,
    pushX: 0,
    pushY: 0,
    velX: 0,
    velY: 0,
  };
}

/**
 * Injects a bounded directional angular & translational impulse into a stem
 * when the recipient brushes or taps nearby in bouquet-local SVG coordinates.
 */
export function applyPointerRustleImpulse(
  state: StemRustleState,
  stem: StemChoreographyPlan,
  pointerX: number,
  pointerY: number,
  velocityX: number,
  velocityY: number,
  mode: 'move' | 'tap' = 'move'
): void {
  const dx = stem.anchorX - pointerX;
  const dy = stem.anchorY - pointerY;
  const radius = mode === 'tap' ? 185 : 155;
  const dist = Math.hypot(dx, dy);
  if (dist >= radius) return;

  const norm = 1 - dist / radius;
  const falloff = norm * norm;
  const sens = stem.rustleSensitivity;

  if (mode === 'tap') {
    // Gentle radial petal flutter outward from tap point
    const dirX = dist > 2 ? dx / dist : (stem.anchorX >= 300 ? 1 : -1);
    const dirY = dist > 2 ? dy / dist : -1;
    const tapAngleImpulse = (dirX * 36 + (dirX === 0 ? 18 : 0)) * falloff * sens;
    state.angularVel = clamp(state.angularVel + tapAngleImpulse, -95, 95);
    state.velX = clamp(state.velX + dirX * 22 * falloff * sens, -60, 60);
    state.velY = clamp(state.velY + dirY * 14 * falloff * sens, -45, 45);
    return;
  }

  // Clamp raw pointer velocity so rapid cursor flicks stay graceful and botanical
  const clampedVx = clamp(velocityX, -520, 520);
  const clampedVy = clamp(velocityY, -420, 420);
  const speed = Math.hypot(clampedVx, clampedVy);
  if (speed < 8) return;

  const angleImpulse = (clampedVx * 0.145 + (dx >= 0 ? 1 : -1) * Math.abs(clampedVy) * 0.032) * falloff * sens;
  state.angularVel = clamp(state.angularVel + angleImpulse, -85, 85);
  state.velX = clamp(state.velX + clampedVx * 0.042 * falloff * sens, -48, 48);
  state.velY = clamp(state.velY + clampedVy * 0.026 * falloff * sens, -34, 34);
}

/**
 * Steps a single stem's damped spring-damper rustle state forward by dtSec (clamped <= 32ms).
 * Returns true if the stem still has active kinetic energy.
 */
export function stepRustlePhysics(
  state: StemRustleState,
  stem: StemChoreographyPlan,
  dtSec: number
): boolean {
  const dt = clamp(dtSec, 0.001, 0.032);
  const k = stem.rustleStiffness;
  const c = stem.rustleDamping;

  const angAccel = -k * state.angleDeg - c * state.angularVel;
  state.angularVel += angAccel * dt;
  state.angleDeg = clamp(state.angleDeg + state.angularVel * dt, -stem.maxRustleDeg, stem.maxRustleDeg);

  const kPos = k * 1.25;
  const cPos = c * 1.3;
  const ax = -kPos * state.pushX - cPos * state.velX;
  const ay = -kPos * state.pushY - cPos * state.velY;
  state.velX += ax * dt;
  state.velY += ay * dt;
  state.pushX = clamp(state.pushX + state.velX * dt, -9, 9);
  state.pushY = clamp(state.pushY + state.velY * dt, -7, 7);

  const energy =
    Math.abs(state.angleDeg) +
    Math.abs(state.angularVel) * 0.05 +
    Math.abs(state.pushX) +
    Math.abs(state.pushY);

  if (energy < 0.015) {
    state.angleDeg = 0;
    state.angularVel = 0;
    state.pushX = 0;
    state.pushY = 0;
    state.velX = 0;
    state.velY = 0;
    return false;
  }
  return true;
}

/**
 * Formats a bouquet-local SVG transform string around a custom pivot (e.g., stem base).
 * Emits minimal SVG primitives when scale === 1 (living breeze & rustle) for fast SVG compositing.
 */
export function formatPivotMotionTransform(
  t: EvaluatedTransform,
  pivotX: number,
  pivotY: number
): string {
  const hasTranslate = t.translateX !== 0 || t.translateY !== 0;
  const hasRotate = t.rotateDeg !== 0;
  const hasScale = t.scale !== 1;

  if (!hasTranslate && !hasRotate && !hasScale) return '';
  if (!hasScale) {
    if (!hasTranslate) {
      return `rotate(${t.rotateDeg} ${pivotX} ${pivotY})`;
    }
    if (!hasRotate) {
      return `translate(${t.translateX} ${t.translateY})`;
    }
    return `translate(${t.translateX} ${t.translateY}) rotate(${t.rotateDeg} ${pivotX} ${pivotY})`;
  }
  return `translate(${t.translateX} ${t.translateY}) translate(${pivotX} ${pivotY}) rotate(${t.rotateDeg}) scale(${t.scale}) translate(${-pivotX} ${-pivotY})`;
}
