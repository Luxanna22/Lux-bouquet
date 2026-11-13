import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearCanvasRecoverySnapshot,
  hasMeaningfulCanvasState,
  loadCanvasRecoverySnapshot,
  saveCanvasRecoverySnapshot,
  setCanvasRecoveryInStudioFlag,
  STUDIO_CANVAS_RECOVERY_KEY,
} from './canvasRecovery';
import {
  BouquetSnapshot,
  DEFAULT_BOUQUET_LOCK,
  DEFAULT_BOUQUET_POSE,
  DEFAULT_VOICE_KEEPSAKE,
} from '../types/bouquet';

function createBlankSnapshot(): BouquetSnapshot {
  return {
    items: [],
    wrapStyle: 'chalice',
    wrapColor: '#EDE0F5',
    ribbonColor: '#C084FC',
    ribbonStyle: 'satin',
    environment: 'studio',
    bouquetPose: { ...DEFAULT_BOUQUET_POSE },
    card: {
      to: 'My Dearest',
      from: 'Yours Always',
      message: 'Every petal in this bouquet holds a reason why you make my world brighter.',
      visibleOnStage: true,
      theme: 'sealed',
      x: 410,
      y: 525,
      scale: 0.72,
      rotation: 0,
    },
    voice: { ...DEFAULT_VOICE_KEEPSAKE },
    lock: { ...DEFAULT_BOUQUET_LOCK },
  };
}

function createMemoryStorage(maxBytes = Number.POSITIVE_INFINITY) {
  const map = new Map<string, string>();
  return {
    map,
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    setItem(key: string, value: string) {
      if (value.length > maxBytes) {
        throw new Error('QuotaExceededError');
      }
      map.set(key, value);
    },
    removeItem(key: string) {
      map.delete(key);
    },
  };
}

test('hasMeaningfulCanvasState rejects blank canvas and accepts edited canvas', () => {
  const blank = createBlankSnapshot();
  assert.equal(hasMeaningfulCanvasState(blank), false);

  const withFlower: BouquetSnapshot = {
    ...blank,
    items: [
      {
        id: 'stem-1',
        type: 'rose',
        x: 300,
        y: 320,
        scale: 1,
        rotation: 0,
        flipX: false,
        petalColor: '#e11d48',
        centerColor: '#fef08a',
      },
    ],
  };
  assert.equal(hasMeaningfulCanvasState(withFlower), true);

  const withCardEdit: BouquetSnapshot = {
    ...blank,
    card: {
      ...blank.card,
      to: 'Elena',
    },
  };
  assert.equal(hasMeaningfulCanvasState(withCardEdit), true);
});

test('saveCanvasRecoverySnapshot and loadCanvasRecoverySnapshot preserve canvas & studio state without touching vault keys', () => {
  const storage = createMemoryStorage();
  const snap: BouquetSnapshot = {
    ...createBlankSnapshot(),
    wrapStyle: 'kraft',
    wrapColor: '#d6b38e',
    items: [
      {
        id: 'stem-1',
        type: 'peony',
        x: 280,
        y: 310,
        scale: 1.1,
        rotation: -10,
        flipX: false,
        petalColor: '#f472b6',
        centerColor: '#fde047',
      },
    ],
  };

  const saved = saveCanvasRecoverySnapshot(
    {
      snapshot: snap,
      wasInStudio: true,
      hasUnsavedChanges: true,
      sourceVaultCode: null,
      isSourceDraft: false,
    },
    storage
  );

  assert.equal(saved, true);
  assert.equal(storage.map.has(STUDIO_CANVAS_RECOVERY_KEY), true);
  assert.equal(storage.map.has('flowers_for_you_local_vault_v1'), false);

  const loaded = loadCanvasRecoverySnapshot(storage);
  assert.ok(loaded);
  assert.equal(loaded.wasInStudio, true);
  assert.equal(loaded.hasUnsavedChanges, true);
  assert.equal(loaded.snapshot.wrapStyle, 'kraft');
  assert.equal(loaded.snapshot.items.length, 1);
  assert.equal(loaded.snapshot.items[0].type, 'peony');

  setCanvasRecoveryInStudioFlag(false, storage);
  const afterHome = loadCanvasRecoverySnapshot(storage);
  assert.ok(afterHome);
  assert.equal(afterHome.wasInStudio, false);
  assert.equal(afterHome.snapshot.items.length, 1);

  clearCanvasRecoverySnapshot(storage);
  assert.equal(loadCanvasRecoverySnapshot(storage), null);
});

test('saveCanvasRecoverySnapshot degrades gracefully on QuotaExceededError', () => {
  const largeAudio = 'data:audio/webm;base64,' + 'A'.repeat(2000);
  const snap: BouquetSnapshot = {
    ...createBlankSnapshot(),
    items: [
      {
        id: 'stem-1',
        type: 'tulip',
        x: 290,
        y: 300,
        scale: 1,
        rotation: 5,
        flipX: false,
        petalColor: '#fb7185',
        centerColor: '#fef08a',
      },
    ],
    voice: {
      ...DEFAULT_VOICE_KEEPSAKE,
      visibleOnStage: true,
      audioDataUrl: largeAudio,
    },
  };

  const storage = createMemoryStorage(1800);
  const saved = saveCanvasRecoverySnapshot(
    {
      snapshot: snap,
      wasInStudio: true,
      hasUnsavedChanges: true,
    },
    storage
  );

  assert.equal(saved, true);
  const loaded = loadCanvasRecoverySnapshot(storage);
  assert.ok(loaded);
  assert.equal(loaded.snapshot.items[0].type, 'tulip');
  assert.equal(loaded.snapshot.voice?.audioDataUrl, null);
});
