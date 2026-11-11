import test from 'node:test';
import assert from 'node:assert/strict';
import { useBouquetStore } from '../store/useBouquetStore';
import {
  encodeBouquetToCompactPayload,
  decodeBouquetFromHash,
} from './shareAndExport';
import {
  PHOTO_FRAME_CATALOG,
  ENVIRONMENT_CATALOG,
  DEFAULT_BOUQUET_POSE,
} from '../types/bouquet';

test('PHOTO_FRAME_CATALOG and ENVIRONMENT_CATALOG provide 6 unique designs each', () => {
  assert.equal(PHOTO_FRAME_CATALOG.length, 6);
  assert.equal(ENVIRONMENT_CATALOG.length, 6);
  const photoIds = new Set(PHOTO_FRAME_CATALOG.map((p) => p.id));
  const envIds = new Set(ENVIRONMENT_CATALOG.map((e) => e.id));
  assert.equal(photoIds.size, 6);
  assert.equal(envIds.size, 6);
});

test('useBouquetStore supports photocards, environment, bouquetPose, and 4-way fast layering (back, down, up, front)', () => {
  const store = useBouquetStore.getState();
  store.clearBouquet();

  // Add two flowers and one photocard
  store.addFlower('rose');
  store.addFlower('tulip');
  store.addPhotoCard('polaroid', 'data:image/jpeg;base64,abc123');

  let state = useBouquetStore.getState();
  assert.equal(state.items.length, 3);
  const [rose, tulip, photo] = state.items;
  assert.equal(photo.photoStyle, 'polaroid');
  assert.equal(photo.photoDataUrl, 'data:image/jpeg;base64,abc123');

  // Test 4-way fast layering: move photocard from top (index 2) to Most Back (index 0)
  store.moveItemLayer(photo.id, 'back');
  state = useBouquetStore.getState();
  assert.equal(state.items[0].id, photo.id);

  // Move photocard forward one step (index 0 -> index 1)
  store.moveItemLayer(photo.id, 'up');
  state = useBouquetStore.getState();
  assert.equal(state.items[1].id, photo.id);

  // Move photocard back one step (index 1 -> index 0)
  store.moveItemLayer(photo.id, 'down');
  state = useBouquetStore.getState();
  assert.equal(state.items[0].id, photo.id);

  // Move photocard to Most Front (index 0 -> index 2)
  store.moveItemLayer(photo.id, 'front');
  state = useBouquetStore.getState();
  assert.equal(state.items[2].id, photo.id);
  assert.equal(state.items[0].id, rose.id);
  assert.equal(state.items[1].id, tulip.id);

  // Test environment and whole-bouquet pose updates
  store.setEnvironment('meadow');
  store.updateBouquetPose({ x: 325, y: 365, scale: 1.18, rotation: -12 });
  state = useBouquetStore.getState();
  assert.equal(state.environment, 'meadow');
  assert.equal(state.bouquetPose.x, 325);
  assert.equal(state.bouquetPose.y, 365);
  assert.equal(state.bouquetPose.scale, 1.18);
  assert.equal(state.bouquetPose.rotation, -12);

  // Reset bouquet pose restores default centered pose
  store.resetBouquetPose();
  state = useBouquetStore.getState();
  assert.deepEqual(state.bouquetPose, DEFAULT_BOUQUET_POSE);
});

test('shareAndExport round-trips environment, bouquetPose, and photocard keepsakes cleanly', () => {
  const store = useBouquetStore.getState();
  store.clearBouquet();
  store.addFlower('peony');
  store.addPhotoCard('cameo', 'data:image/jpeg;base64,xyz987');
  const photoId = useBouquetStore.getState().selectedId!;
  store.updateItem(photoId, { photoCaption: 'Forever & Always' });
  store.setEnvironment('paper');
  store.updateBouquetPose({ x: 312, y: 372, scale: 1.12, rotation: 8 });

  const state = useBouquetStore.getState();
  const payload = encodeBouquetToCompactPayload(
    {
      items: state.items,
      wrapStyle: state.wrapStyle,
      wrapColor: state.wrapColor,
      ribbonColor: state.ribbonColor,
      ribbonStyle: state.ribbonStyle,
      environment: state.environment,
      bouquetPose: state.bouquetPose,
      card: state.card,
      voice: state.voice,
      lock: state.lock,
    },
    true
  );

  const decoded = decodeBouquetFromHash(payload);
  assert.ok(decoded);
  assert.equal(decoded.environment, 'paper');
  assert.deepEqual(decoded.bouquetPose, { x: 312, y: 372, scale: 1.12, rotation: 8 });
  assert.equal(decoded.items.length, 2);
  const decodedPhoto = decoded.items.find((i) => i.photoStyle === 'cameo');
  assert.ok(decodedPhoto);
  assert.equal(decodedPhoto.photoCaption, 'Forever & Always');
  assert.equal(decodedPhoto.photoDataUrl, 'data:image/jpeg;base64,xyz987');
  assert.equal(Boolean(decodedPhoto.clippedToBouquet), false);
});

test('frameless raw photo upload, clippedToBouquet toggle, and expanded attachment scales round-trip cleanly', () => {
  const store = useBouquetStore.getState();
  store.clearBouquet();

  // Default voice keepsake scale is 1.0 (100%)
  assert.equal(useBouquetStore.getState().voice.scale, 1.0);

  // Add a frameless 'raw' photo (default unclipped attachment) and a clipped polaroid
  store.addPhotoCard('raw', 'data:image/png;base64,rawpic');
  const rawPhoto = useBouquetStore.getState().items.find((i) => i.photoStyle === 'raw')!;
  assert.ok(rawPhoto);
  assert.equal(rawPhoto.photoCaption, '');
  assert.equal(Boolean(rawPhoto.clippedToBouquet), false);

  store.addPhotoCard('polaroid', 'data:image/png;base64,polpic');
  const polPhoto = useBouquetStore.getState().items.find((i) => i.photoStyle === 'polaroid')!;
  store.updateItem(polPhoto.id, { clippedToBouquet: true, scale: 2.35 });
  store.updateCard({ scale: 2.15, visibleOnStage: true });
  store.updateVoice({ scale: 2.1, visibleOnStage: true });

  const state = useBouquetStore.getState();
  const payload = encodeBouquetToCompactPayload(
    {
      items: state.items,
      wrapStyle: state.wrapStyle,
      wrapColor: state.wrapColor,
      ribbonColor: state.ribbonColor,
      ribbonStyle: state.ribbonStyle,
      environment: state.environment,
      bouquetPose: state.bouquetPose,
      card: state.card,
      voice: state.voice,
      lock: state.lock,
    },
    true
  );

  const decoded = decodeBouquetFromHash(payload);
  assert.ok(decoded);
  const decRaw = decoded.items.find((i) => i.photoStyle === 'raw')!;
  const decPol = decoded.items.find((i) => i.photoStyle === 'polaroid')!;
  assert.ok(decRaw);
  assert.equal(decRaw.photoCaption, '');
  assert.equal(Boolean(decRaw.clippedToBouquet), false);
  assert.ok(decPol);
  assert.equal(Boolean(decPol.clippedToBouquet), true);
  assert.ok(decPol.scale >= 2.2);
  assert.equal(decoded.card.scale, 2.15);
  assert.equal(decoded.voice?.scale, 2.1);
});
