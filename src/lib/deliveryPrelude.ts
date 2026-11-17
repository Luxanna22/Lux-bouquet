export type DeliveryPreludeScene = 'arrival' | 'seal_break' | 'ribbon' | 'threshold';

export interface DeliverySceneTimings {
  sealBreakMs: number;
  ribbonMs: number;
  unfurlMs: number;
}

const STANDARD_TIMINGS: DeliverySceneTimings = {
  sealBreakMs: 4850,
  ribbonMs: 2450,
  unfurlMs: 1550,
};

const REDUCED_MOTION_TIMINGS: DeliverySceneTimings = {
  sealBreakMs: 2350,
  ribbonMs: 1100,
  unfurlMs: 650,
};

const DELIVERY_SEEN_PREFIX = 'sab_delivery_seen_v1_';

export function getDeliverySceneTimings(reducedMotion = false): DeliverySceneTimings {
  return reducedMotion ? REDUCED_MOTION_TIMINGS : STANDARD_TIMINGS;
}

export function normalizeDeliveryIdentifier(raw: string | null | undefined): string {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return 'default';
  // Produce a short deterministic alphanumeric key safe for localStorage
  if (/^[a-zA-Z0-9_-]{3,32}$/.test(trimmed)) {
    return trimmed;
  }
  let hash = 2166136261;
  for (let i = 0; i < trimmed.length; i++) {
    hash ^= trimmed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `h_${(hash >>> 0).toString(36)}`;
}

export function getDeliverySeenStorageKey(identifier: string | null | undefined): string {
  return `${DELIVERY_SEEN_PREFIX}${normalizeDeliveryIdentifier(identifier)}`;
}

export function hasSeenDeliveryPrelude(
  identifier: string | null | undefined,
  storage?: Pick<Storage, 'getItem'> | null
): boolean {
  const targetStorage =
    storage !== undefined ? storage : typeof window !== 'undefined' ? window.localStorage : null;
  if (!targetStorage) return false;
  try {
    return targetStorage.getItem(getDeliverySeenStorageKey(identifier)) === '1';
  } catch {
    return false;
  }
}

export function markDeliveryPreludeSeen(
  identifier: string | null | undefined,
  storage?: Pick<Storage, 'setItem'> | null
): void {
  const targetStorage =
    storage !== undefined ? storage : typeof window !== 'undefined' ? window.localStorage : null;
  if (!targetStorage) return;
  try {
    targetStorage.setItem(getDeliverySeenStorageKey(identifier), '1');
  } catch {
    // Ignore storage quota or privacy-mode errors
  }
}

export function resolveInitialDeliveryScene(options: {
  hasSeenBefore: boolean;
  forceFullStory?: boolean;
}): DeliveryPreludeScene {
  if (options.forceFullStory || !options.hasSeenBefore) {
    return 'arrival';
  }
  return 'threshold';
}

/**
 * Computes a calm, breathing stem-by-stem rise interval (in ms) for Scene 5
 * so small and medium bouquets feel unhurried while large arrangements never drag.
 */
export function computeStemBloomCadenceMs(totalItems: number, reducedMotion = false): number {
  if (reducedMotion) return 85;
  const count = Math.max(1, totalItems);
  if (count <= 7) return 225;
  if (count <= 14) return 185;
  return Math.max(120, Math.round(2500 / count));
}

/**
 * Plays a hushed, warm celesta-like fifth + ninth harmonic when the recipient
 * breaks the crimson wax seal on Scene 1. Safe no-op when Web Audio is unavailable.
 */
export function playWaxSealUnsealChime(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;
    // Warm Fmaj9 celesta whisper (F5, C6, G6)
    const notes = [698.46, 1046.5, 1567.98];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const startAt = now + idx * 0.075;
      osc.frequency.setValueAtTime(freq, startAt);
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.linearRampToValueAtTime(0.032 - idx * 0.006, startAt + 0.035);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 1.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startAt);
      osc.stop(startAt + 1.1);
    });
    window.setTimeout(() => {
      void ctx.close().catch(() => {});
    }, 1500);
  } catch {
    // Ignore audio context restrictions
  }
}
