export interface DofPetalTransform {
  translateX: number;
  translateY: number;
  rotateDeg: number;
  scale: number;
  opacity: number;
}

export interface RecipientSlideBloomState {
  progress: number;
  outerScale: number;
  outerRotateDeg: number;
  midScale: number;
  midRotateDeg: number;
  innerScale: number;
  innerRotateDeg: number;
  leafScale: number;
  stamenDashOffset: number;
  auraScale: number;
}

/**
 * Computes 120fps GPU-friendly transform values for large, highly blurred foreground
 * camera-lens petals anchored at the outer edges of the screen.
 * As the user scrolls down, the petals drift outward off the screen edges and fade
 * away completely (never scrolling up across the content).
 */
export function computeForegroundPetalTransform(
  scrollTop: number,
  petalIndex: 0 | 1,
  viewportHeight = 900,
  isDarkMode = false
): DofPetalTransform {
  const safeScroll = Math.max(0, scrollTop);
  const vh = Math.max(520, viewportHeight);
  const dismissSpan = Math.max(280, vh * 0.46);
  const progress = Math.max(0, Math.min(1, safeScroll / dismissSpan));
  const eased = 1 - Math.pow(1 - progress, 1.8);
  const fade = Math.pow(1 - progress, 1.5);

  if (petalIndex === 0) {
    // Foreground Petal 0 (Large lower-left screen edge: drifts outward left & fades away on scroll)
    const translateX = -eased * 220;
    const translateY = eased * 75;
    const rotateDeg = -10 - eased * 18;
    const scale = 1.08 + eased * 0.22;
    const peakOpacity = isDarkMode ? 0.42 : 0.62;

    return {
      translateX: Number(translateX.toFixed(2)),
      translateY: Number(translateY.toFixed(2)),
      rotateDeg: Number(rotateDeg.toFixed(2)),
      scale: Number(scale.toFixed(3)),
      opacity: Number((peakOpacity * fade).toFixed(3)),
    };
  }

  // Foreground Petal 1 (Large upper-right screen edge: drifts outward right & fades away on scroll)
  const translateX = eased * 240;
  const translateY = eased * 45;
  const rotateDeg = -6 + eased * 18;
  const scale = 1.12 + eased * 0.24;
  const peakOpacity = isDarkMode ? 0.38 : 0.56;

  return {
    translateX: Number(translateX.toFixed(2)),
    translateY: Number(translateY.toFixed(2)),
    rotateDeg: Number(rotateDeg.toFixed(2)),
    scale: Number(scale.toFixed(3)),
    opacity: Number((peakOpacity * fade).toFixed(3)),
  };
}

/**
 * Computes the real-time botanical bloom state for the Recipient Opening peony
 * as the recipient slides the wax-seal handle from 0 (budding) to 1 (full bloom).
 */
export function computeRecipientSlideBloomState(slideProgress: number): RecipientSlideBloomState {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(slideProgress) ? slideProgress : 0));
  const eased = 1 - Math.pow(1 - clamped, 1.65);

  return {
    progress: Number(clamped.toFixed(3)),
    outerScale: Number((0.58 + eased * 0.54).toFixed(3)),
    outerRotateDeg: Number((-16 + eased * 22).toFixed(2)),
    midScale: Number((0.5 + eased * 0.54).toFixed(3)),
    midRotateDeg: Number((14 - eased * 20).toFixed(2)),
    innerScale: Number((0.44 + eased * 0.54).toFixed(3)),
    innerRotateDeg: Number((-12 + eased * 20).toFixed(2)),
    leafScale: Number((0.6 + eased * 0.44).toFixed(3)),
    stamenDashOffset: Number((130 * (1 - eased)).toFixed(1)),
    auraScale: Number((0.84 + eased * 0.34).toFixed(3)),
  };
}
