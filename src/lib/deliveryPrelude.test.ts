import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeStemBloomCadenceMs,
  getDeliverySceneTimings,
  getDeliverySeenStorageKey,
  hasSeenDeliveryPrelude,
  markDeliveryPreludeSeen,
  resolveInitialDeliveryScene,
} from './deliveryPrelude';

test('resolveInitialDeliveryScene plays full arrival story on first visit or replay, and shortens to threshold on return visits', () => {
  assert.equal(resolveInitialDeliveryScene({ hasSeenBefore: false }), 'arrival');
  assert.equal(resolveInitialDeliveryScene({ hasSeenBefore: true }), 'threshold');
  assert.equal(
    resolveInitialDeliveryScene({ hasSeenBefore: true, forceFullStory: true }),
    'arrival'
  );
});

test('hasSeenDeliveryPrelude and markDeliveryPreludeSeen persist once-per-link state cleanly', () => {
  const store = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
  };

  assert.equal(hasSeenDeliveryPrelude('Vu18KSuusq91', mockStorage), false);
  markDeliveryPreludeSeen('Vu18KSuusq91', mockStorage);
  assert.equal(hasSeenDeliveryPrelude('Vu18KSuusq91', mockStorage), true);
  assert.equal(hasSeenDeliveryPrelude('AnotherCode99', mockStorage), false);

  // Long hash payloads hash deterministically into compact storage keys
  const longHash = '#b=v2_long_payload_with_many_characters_and_symbols_!@#$%^&*()';
  const keyA = getDeliverySeenStorageKey(longHash);
  const keyB = getDeliverySeenStorageKey(longHash);
  assert.equal(keyA, keyB);
  assert.ok(keyA.length < 40);
});

test('getDeliverySceneTimings and computeStemBloomCadenceMs respect reduced motion and bouquet size', () => {
  const standard = getDeliverySceneTimings(false);
  const reduced = getDeliverySceneTimings(true);
  assert.ok(standard.sealBreakMs > reduced.sealBreakMs);
  assert.ok(standard.ribbonMs > reduced.ribbonMs);
  assert.ok(standard.unfurlMs > reduced.unfurlMs);

  assert.equal(computeStemBloomCadenceMs(5, false), 225);
  assert.equal(computeStemBloomCadenceMs(10, false), 185);
  assert.ok(computeStemBloomCadenceMs(25, false) >= 120);
  assert.equal(computeStemBloomCadenceMs(10, true), 85);
});
