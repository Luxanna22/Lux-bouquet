import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeForegroundPetalTransform,
  computeRecipientSlideBloomState,
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
