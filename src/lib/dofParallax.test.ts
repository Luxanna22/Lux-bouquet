import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeForegroundPetalTransform,
  computeRecipientSlideBloomState,
  createOnDemandLenisDriver,
  shouldContinueLenisRaf,
} from './dofParallax';

test('foreground petals drift outward off screen edges and fade away on scroll without scrolling up', () => {
  const leftStart = computeForegroundPetalTransform(0, 0, 900, false);
  const leftMid = computeForegroundPetalTransform(180, 0, 900, false);
  const leftGone = computeForegroundPetalTransform(500, 0, 900, false);

  const rightStart = computeForegroundPetalTransform(0, 1, 900, false);
  const rightMid = computeForegroundPetalTransform(180, 1, 900, false);
  const rightGone = computeForegroundPetalTransform(500, 1, 900, false);

  // Never scrolls up (translateY >= 0)
  assert.ok(leftMid.translateY >= leftStart.translateY, 'Left petal should not scroll up');
  assert.ok(rightMid.translateY >= rightStart.translateY, 'Right petal should not scroll up');

  // Drifts outward off the left and right edges
  assert.ok(leftMid.translateX < -80, `Expected left petal to drift left, got ${leftMid.translateX}`);
  assert.ok(rightMid.translateX > 80, `Expected right petal to drift right, got ${rightMid.translateX}`);

  // Fades completely away after leaving hero
  assert.ok(leftMid.opacity < leftStart.opacity);
  assert.equal(leftGone.opacity, 0);
  assert.equal(rightGone.opacity, 0);
});

test('recipient slide-to-bloom progresses monotonically from closed bud to full bloom', () => {
  const closed = computeRecipientSlideBloomState(0);
  const half = computeRecipientSlideBloomState(0.5);
  const open = computeRecipientSlideBloomState(1);

  assert.ok(closed.outerScale < half.outerScale && half.outerScale < open.outerScale);
  assert.ok(closed.midScale < half.midScale && half.midScale < open.midScale);
  assert.ok(closed.innerScale < half.innerScale && half.innerScale < open.innerScale);
  assert.ok(closed.leafScale < half.leafScale && half.leafScale < open.leafScale);
  assert.equal(closed.stamenDashOffset, 130);
  assert.equal(open.stamenDashOffset, 0);
});

test('shouldContinueLenisRaf returns true only while scrolling or easing toward target', () => {
  assert.equal(
    shouldContinueLenisRaf({ isScrolling: false, velocity: 0, targetScroll: 100, animatedScroll: 100 }),
    false
  );
  assert.equal(
    shouldContinueLenisRaf({ isScrolling: 'smooth', velocity: 0, targetScroll: 100, animatedScroll: 100 }),
    true
  );
  assert.equal(
    shouldContinueLenisRaf({ isScrolling: false, velocity: 0.4, targetScroll: 100, animatedScroll: 100 }),
    true
  );
  assert.equal(
    shouldContinueLenisRaf({ isScrolling: false, velocity: 0, targetScroll: 120, animatedScroll: 100 }),
    true
  );
});

test('createOnDemandLenisDriver resets stale idle clock on wakeup so smooth scroll never snaps in 1 frame', () => {
  const scheduled = new Map<number, (time: number) => void>();
  let nextId = 1;
  const deltas: number[] = [];

  const mockLenis = {
    isScrolling: false as boolean | string,
    velocity: 0,
    targetScroll: 0,
    animatedScroll: 0,
    time: 100,
    on: () => () => {},
    raf(now: number) {
      deltas.push(Number((now - this.time).toFixed(2)));
      this.time = now;
      this.animatedScroll += (this.targetScroll - this.animatedScroll) * 0.1;
      if (Math.abs(this.targetScroll - this.animatedScroll) <= 0.25) {
        this.animatedScroll = this.targetScroll;
        this.isScrolling = false;
      }
    },
  };

  const listeners = new Map<string, Set<EventListener>>();
  const mockWrapper = {
    addEventListener(type: string, fn: EventListener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn);
    },
    removeEventListener(type: string, fn: EventListener) {
      listeners.get(type)?.delete(fn);
    },
  };

  const driver = createOnDemandLenisDriver(mockLenis, mockWrapper, {
    requestAnimationFrame: (cb) => {
      const id = nextId++;
      scheduled.set(id, cb);
      return id;
    },
    cancelAnimationFrame: (id) => {
      scheduled.delete(id);
    },
  });

  // Simulate user scrolling 5000ms after the previous idle timestamp
  mockLenis.targetScroll = 300;
  mockLenis.isScrolling = 'smooth';
  driver.wake();

  const firstFrame = scheduled.values().next().value;
  assert.ok(firstFrame, 'Expected rAF frame scheduled on wake');
  scheduled.clear();
  firstFrame(5100);

  // First woken frame must see ~16.67ms delta, NOT 5000ms
  assert.ok(deltas[0] > 15 && deltas[0] < 18, `Expected ~16.67ms delta, got ${deltas[0]}`);
  assert.ok(mockLenis.animatedScroll < 100, 'Should ease smoothly rather than snapping to 300 in 1 frame');

  // Subsequent frame uses exact elapsed frame delta
  const secondFrame = scheduled.values().next().value;
  assert.ok(secondFrame);
  scheduled.clear();
  secondFrame(5116);
  assert.equal(deltas[1], 16);

  driver.destroy();
  assert.equal(scheduled.size, 0);
});

