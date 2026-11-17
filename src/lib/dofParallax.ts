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
    outerScale: Number((0.9 + eased * 0.36).toFixed(3)),
    outerRotateDeg: Number((-12 + eased * 22).toFixed(2)),
    midScale: Number((0.82 + eased * 0.36).toFixed(3)),
    midRotateDeg: Number((10 - eased * 20).toFixed(2)),
    innerScale: Number((0.76 + eased * 0.36).toFixed(3)),
    innerRotateDeg: Number((-8 + eased * 20).toFixed(2)),
    leafScale: Number((0.94 + eased * 0.3).toFixed(3)),
    stamenDashOffset: Number((130 * (1 - eased)).toFixed(1)),
    auraScale: Number((0.92 + eased * 0.3).toFixed(3)),
  };
}

export interface LenisActivitySnapshot {
  isScrolling: boolean | string;
  velocity: number;
  targetScroll: number;
  animatedScroll: number;
}

/**
 * Determines whether an on-demand Lenis rAF loop still has active motion/inertia
 * to animate. Allows the page to drop to 0 rAF callbacks per second when idle.
 */
export function shouldContinueLenisRaf(state: LenisActivitySnapshot): boolean {
  if (Boolean(state.isScrolling)) return true;
  if (Math.abs(state.velocity) > 0.02) return true;
  if (Math.abs(state.targetScroll - state.animatedScroll) > 0.25) return true;
  return false;
}

export interface OnDemandLenisTarget extends LenisActivitySnapshot {
  time: number;
  raf: (time: number) => void;
  on: (event: 'virtual-scroll', cb: () => void) => (() => void) | void;
}

export interface OnDemandLenisDriver {
  wake: () => void;
  destroy: () => void;
}

export interface OnDemandLenisScheduler {
  requestAnimationFrame: (cb: (time: number) => void) => number;
  cancelAnimationFrame: (id: number) => void;
}

/**
 * Drives a Lenis instance on-demand (0 background rAF callbacks when idle) while
 * resetting Lenis's internal `time` clock on wakeup so an idle pause never produces
 * a multi-second deltaTime spike that snaps animations to targetScroll in 1 frame.
 */
export function createOnDemandLenisDriver(
  lenis: OnDemandLenisTarget,
  wrapper: Pick<HTMLElement, 'addEventListener' | 'removeEventListener'>,
  scheduler: OnDemandLenisScheduler = {
    requestAnimationFrame: (cb) => window.requestAnimationFrame(cb),
    cancelAnimationFrame: (id) => window.cancelAnimationFrame(id),
  }
): OnDemandLenisDriver {
  let rafId = 0;
  let idleFrames = 0;
  let wakingFromIdle = true;
  let destroyed = false;

  const raf = (time: number) => {
    if (destroyed) return;
    if (wakingFromIdle || !lenis.time || time - lenis.time > 64 || time < lenis.time) {
      wakingFromIdle = false;
      lenis.time = time - 1000 / 60;
    }
    lenis.raf(time);
    if (shouldContinueLenisRaf(lenis)) {
      idleFrames = 0;
      rafId = scheduler.requestAnimationFrame(raf);
    } else if (idleFrames < 3) {
      idleFrames += 1;
      rafId = scheduler.requestAnimationFrame(raf);
    } else {
      rafId = 0;
    }
  };

  const wake = () => {
    if (destroyed) return;
    idleFrames = 0;
    if (rafId === 0) {
      wakingFromIdle = true;
      rafId = scheduler.requestAnimationFrame(raf);
    }
  };

  const unsubVirtualScroll = lenis.on('virtual-scroll', wake);
  wrapper.addEventListener('scroll', wake, { passive: true });
  wrapper.addEventListener('wheel', wake, { passive: true });
  wrapper.addEventListener('touchstart', wake, { passive: true });

  return {
    wake,
    destroy: () => {
      destroyed = true;
      if (typeof unsubVirtualScroll === 'function') {
        unsubVirtualScroll();
      }
      if (rafId !== 0) {
        scheduler.cancelAnimationFrame(rafId);
        rafId = 0;
      }
      wrapper.removeEventListener('scroll', wake);
      wrapper.removeEventListener('wheel', wake);
      wrapper.removeEventListener('touchstart', wake);
    },
  };
}

