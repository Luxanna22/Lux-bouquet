import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBouquetBloomPlan,
  evaluateDampedSpring,
  evaluateWrapperReveal,
  evaluateKeepsakeReveal,
  evaluateStemFrame,
  createZeroRustleState,
  applyPointerRustleImpulse,
  stepRustlePhysics,
  getWrapperEmergenceOrigin,
  formatPivotMotionTransform,
} from './bouquetBloomPhysics';
import type { BouquetItem } from '../types/bouquet';

function makeItem(overrides: Partial<BouquetItem> & { id: string }): BouquetItem {
  return {
    type: 'rose',
    x: 300,
    y: 250,
    scale: 1,
    rotation: 0,
    flipX: false,
    petalColor: '#E11D48',
    centerColor: '#FDE047',
    ...overrides,
  };
}

test('staged choreography orders Beat 1 (wrapper) -> Beat 2 (stems) -> Beat 3 (photos & card)', () => {
  const items: BouquetItem[] = [
    makeItem({ id: 'leaf-1', type: 'eucalyptus', x: 220, y: 240 }),
    makeItem({ id: 'rose-1', type: 'rose', x: 300, y: 210 }),
    makeItem({ id: 'rose-2', type: 'peony', x: 380, y: 235 }),
    makeItem({ id: 'butterfly-1', type: 'monarchButterfly', x: 350, y: 185, layerPlane: 'front' }),
    makeItem({ id: 'photo-1', type: 'rose', photoStyle: 'polaroid', x: 245, y: 270, layerPlane: 'front' }),
  ];

  const plan = buildBouquetBloomPlan(items, 'kraft', false);
  const leaf = plan.byId['leaf-1'];
  const roseCenter = plan.byId['rose-1'];
  const butterfly = plan.byId['butterfly-1'];
  const photo = plan.byId['photo-1'];

  assert.equal(plan.wrapperDelayMs, 0);
  assert.ok(leaf.delayMs > plan.wrapperDelayMs, 'foliage starts after wrapper begins');
  assert.ok(roseCenter.delayMs >= leaf.delayMs, 'focal blooms follow foliage');
  assert.ok(butterfly.delayMs > roseCenter.delayMs, 'accents trail primary blooms');
  assert.ok(photo.delayMs > butterfly.delayMs, 'photocards arrive in Beat 3 after botanicals');
  assert.ok(plan.cardDelayMs >= photo.delayMs, 'greeting card arrives in Beat 3');
  assert.ok(plan.voiceDelayMs > plan.cardDelayMs, 'voice keepsake trails greeting card slightly');
});

test('stems emerge upward from inside wrapper throat and fan outward by side', () => {
  const items: BouquetItem[] = [
    makeItem({ id: 'left-rose', x: 190, y: 240 }),
    makeItem({ id: 'right-rose', x: 410, y: 240 }),
  ];

  const kraftPlan = buildBouquetBloomPlan(items, 'kraft', false);
  const vasePlan = buildBouquetBloomPlan(items, 'vase', false);

  const left = kraftPlan.byId['left-rose'];
  const right = kraftPlan.byId['right-rose'];

  // Both start below their resting position (positive offsetY pushes down into wrapper)
  assert.ok(left.originOffsetY > 80, 'left stem starts deep inside kraft wrapper');
  assert.ok(right.originOffsetY > 80, 'right stem starts deep inside kraft wrapper');
  // Left stem starts shifted right (toward center x=300) and fans left; right stem starts shifted left and fans right
  assert.ok(left.originOffsetX > 0, 'left stem starts tucked toward center');
  assert.ok(right.originOffsetX < 0, 'right stem starts tucked toward center');
  assert.ok(left.originRotateDeg > 0 && right.originRotateDeg < 0, 'stems fan outward symmetrically');

  // Vase has a higher throat rim than kraft sleeve
  assert.ok(
    getWrapperEmergenceOrigin('vase').throatY < getWrapperEmergenceOrigin('kraft').throatY,
    'vase emergence rim sits higher than kraft waist'
  );
  assert.ok(
    vasePlan.byId['left-rose'].originOffsetY < kraftPlan.byId['left-rose'].originOffsetY,
    'vase stems rise a shorter vertical distance than deep kraft cone'
  );
});

test('damped spring starts at 0, overshoots subtly, and settles cleanly to exact 1.0', () => {
  assert.equal(evaluateDampedSpring(0, 9.4, 0.68, 0.92), 0);
  let peak = 0;
  for (let ms = 10; ms < 920; ms += 10) {
    peak = Math.max(peak, evaluateDampedSpring(ms / 1000, 9.4, 0.68, 0.92));
  }
  assert.ok(peak > 1.02 && peak < 1.12, `expected gentle botanical overshoot, got ${peak}`);
  assert.equal(evaluateDampedSpring(0.92, 9.4, 0.68, 0.92), 1);
  assert.equal(evaluateDampedSpring(2.0, 9.4, 0.68, 0.92), 1);
});

test('wrapper, keepsake, and reduced-motion stem settle cleanly at exact authored resting coordinates', () => {
  const items: BouquetItem[] = [makeItem({ id: 'rose-a', x: 310, y: 220 })];
  const reducedPlan = buildBouquetBloomPlan(items, 'lace', true);
  const stem = reducedPlan.byId['rose-a'];

  // Before delay -> invisible
  const pre = evaluateStemFrame(stem, 0, 0, undefined, true);
  assert.equal(pre.opacity, 0);

  // After totalBloomMs -> exact resting coordinates, zero sway in reduced motion
  const settledStem = evaluateStemFrame(stem, reducedPlan.totalBloomMs + 50, 5.2, undefined, true);
  assert.equal(settledStem.opacity, 1);
  assert.equal(settledStem.translateX, 0);
  assert.equal(settledStem.translateY, 0);
  assert.equal(settledStem.rotateDeg, 0);
  assert.equal(settledStem.scale, 1);

  const settledWrap = evaluateWrapperReveal(reducedPlan, reducedPlan.totalBloomMs);
  assert.equal(settledWrap.translateY, 0);
  assert.equal(settledWrap.scale, 1);
  assert.equal(settledWrap.opacity, 1);

  const settledCard = evaluateKeepsakeReveal(
    reducedPlan.cardDelayMs,
    reducedPlan.cardDurationMs,
    reducedPlan.totalBloomMs,
    true
  );
  assert.equal(settledCard.translateY, 0);
  assert.equal(settledCard.rotateDeg, 0);
  assert.equal(settledCard.scale, 1);
  assert.equal(settledCard.opacity, 1);
});

test('living breeze blends smoothly without snapping and photocards stay stiffer than foliage', () => {
  const items: BouquetItem[] = [
    makeItem({ id: 'fern-1', type: 'fern', x: 185, y: 230 }),
    makeItem({ id: 'photo-1', type: 'rose', photoStyle: 'polaroid', x: 185, y: 230 }),
  ];
  const plan = buildBouquetBloomPlan(items, 'kraft', false);
  const fern = plan.byId['fern-1'];
  const photo = plan.byId['photo-1'];

  assert.ok(fern.swayAmpDeg > photo.swayAmpDeg * 3, 'foliage sways noticeably more than rigid cardstock photo');
  assert.ok(fern.rustleSensitivity > photo.rustleSensitivity * 2, 'foliage rustles more readily than photocard');

  const justBeforeBlend = evaluateStemFrame(fern, fern.delayMs + fern.durationMs * 0.55, 2.0, undefined, false);
  const settledLiving = evaluateStemFrame(fern, fern.delayMs + fern.durationMs + 200, 2.0, undefined, false);
  assert.equal(justBeforeBlend.breezeBlend, 0);
  assert.equal(settledLiving.breezeBlend, 1);
});

test('pointer rustle impulse stays bounded under extreme flicks and decays smoothly back to rest', () => {
  const items: BouquetItem[] = [
    makeItem({ id: 'near', x: 300, y: 230 }),
    makeItem({ id: 'far', x: 560, y: 230 }),
  ];
  const plan = buildBouquetBloomPlan(items, 'kraft', false);
  const near = plan.byId['near'];
  const far = plan.byId['far'];

  const nearState = createZeroRustleState();
  const farState = createZeroRustleState();

  // Extreme cursor flick right on top of `near`
  applyPointerRustleImpulse(nearState, near, 305, 232, 99999, -99999, 'move');
  applyPointerRustleImpulse(farState, far, 305, 232, 99999, -99999, 'move');

  assert.ok(Math.abs(nearState.angularVel) > 5, 'nearby stem receives rustle velocity impulse');
  assert.equal(farState.angularVel, 0, 'distant stem outside falloff radius is unaffected');

  // Step physics with large dt spikes (simulating tab switch) and verify bounded decay to rest
  let maxAngle = 0;
  for (let i = 0; i < 240; i++) {
    stepRustlePhysics(nearState, near, i === 0 ? 5.0 : 0.016);
    maxAngle = Math.max(maxAngle, Math.abs(nearState.angleDeg));
    assert.ok(Number.isFinite(nearState.angleDeg), 'angle stays finite');
  }
  assert.ok(maxAngle > 0.5 && maxAngle <= near.maxRustleDeg, `rustle stays bounded <= ${near.maxRustleDeg}°, got ${maxAngle}`);
  assert.equal(nearState.angleDeg, 0, 'rustle damps cleanly back to exact 0');
});

test('formatPivotMotionTransform emits compact primitives for identity and settled living sway', () => {
  const identity = formatPivotMotionTransform(
    { translateX: 0, translateY: 0, rotateDeg: 0, scale: 1, opacity: 1, revealProgress: 1, breezeBlend: 1 },
    300,
    360
  );
  assert.equal(identity, '', 'identity transform returns empty string');

  const pureRotate = formatPivotMotionTransform(
    { translateX: 0, translateY: 0, rotateDeg: 1.45, scale: 1, opacity: 1, revealProgress: 1, breezeBlend: 1 },
    280,
    380
  );
  assert.equal(pureRotate, 'rotate(1.45 280 380)', 'pure pivot rotation uses single SVG rotate primitive');

  const swayBob = formatPivotMotionTransform(
    { translateX: 0, translateY: 0.8, rotateDeg: -1.2, scale: 1, opacity: 1, revealProgress: 1, breezeBlend: 1 },
    280,
    380
  );
  assert.equal(swayBob, 'translate(0 0.8) rotate(-1.2 280 380)', 'living sway uses 2 primitives without scale');

  const emerging = formatPivotMotionTransform(
    { translateX: 12, translateY: 60, rotateDeg: 6, scale: 0.65, opacity: 0.8, revealProgress: 0.3, breezeBlend: 0 },
    280,
    380
  );
  assert.ok(emerging.includes('scale(0.65)'), 'emergence includes scale around stem pivot');
});
