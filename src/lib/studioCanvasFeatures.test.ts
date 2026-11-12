import test from 'node:test';
import assert from 'node:assert/strict';
import { useBouquetStore } from '../store/useBouquetStore';
import {
  encodeBouquetToCompactPayload,
  decodeBouquetFromHash,
  MAX_UPLOAD_IMAGE_BYTES,
  detectImageMagicBytes,
  validateUploadedImageFile,
} from './shareAndExport';
import {
  PHOTO_FRAME_CATALOG,
  ENVIRONMENT_CATALOG,
  FLOWER_CATALOG,
  WRAPPER_CATALOG,
  RIBBON_STYLE_CATALOG,
  DEFAULT_BOUQUET_POSE,
  getEffectiveItemPlane,
  FlowerType,
} from '../types/bouquet';
import {
  getActiveSeasonalEvent,
  isSeasonalCategoryAvailable,
  getAvailableSeasonalCatalog,
} from './seasonalCalendar';
import {
  isFlowerPremium,
  isWrapPremium,
  isRibbonPremium,
  isEnvironmentPremium,
} from './monetization';
// @ts-expect-error Shared ESM API security guard module
import { checkRateLimit, resetRateLimitStoreForTests, sanitizeJsonValue, isSuspiciousBotRequest, readSafeJsonBody } from '../../api/_lib/securityGuard.js';

test('PHOTO_FRAME_CATALOG (6), ENVIRONMENT_CATALOG (14), and FLOWER_CATALOG (81) provide unique designs with Free-first ordering and 18 Others attachments', () => {
  assert.equal(PHOTO_FRAME_CATALOG.length, 6);
  assert.equal(ENVIRONMENT_CATALOG.length, 14);
  assert.equal(FLOWER_CATALOG.length, 81);
  const photoIds = new Set(PHOTO_FRAME_CATALOG.map((p) => p.id));
  const envIds = new Set(ENVIRONMENT_CATALOG.map((e) => e.id));
  const flowerIds = new Set(FLOWER_CATALOG.map((f) => f.type));
  assert.equal(photoIds.size, 6);
  assert.equal(envIds.size, 14);
  assert.equal(flowerIds.size, 81);

  const others = FLOWER_CATALOG.filter((f) => Boolean(f.isOther));
  const seasonals = FLOWER_CATALOG.filter((f) => Boolean(f.isSeasonal));
  assert.equal(others.length, 18);
  assert.equal(seasonals.length, 12);

  const expectedNewOthers: FlowerType[] = [
    'sittingDog',
    'lovelyCats',
    'moon',
    'sun',
    'star',
    'clouds',
    'chocolates',
    'ringInABox',
  ];
  for (const otherType of expectedNewOthers) {
    const entry = FLOWER_CATALOG.find((f) => f.type === otherType);
    assert.ok(entry, `Missing '${otherType}' in FLOWER_CATALOG`);
    assert.equal(entry.isOther, true);
  }

  // Verify default wrapper is Tulip Organza ('chalice') and default bouquet scale is slightly smaller (0.86)
  assert.equal(WRAPPER_CATALOG[0].id, 'chalice');
  assert.equal(DEFAULT_BOUQUET_POSE.scale, 0.86);

  // Verify Seasonal Free (5 items: hellebore, crystalSnowflake, candyCanePick, sleighBellsPick, gingerbreadHeart) vs Couture (7 items)
  assert.equal(isFlowerPremium('hellebore'), false);
  assert.equal(isFlowerPremium('crystalSnowflake'), false);
  assert.equal(isFlowerPremium('candyCanePick'), false);
  assert.equal(isFlowerPremium('sleighBellsPick'), false);
  assert.equal(isFlowerPremium('gingerbreadHeart'), false);
  assert.equal(isFlowerPremium('poinsettia'), true);
  assert.equal(isFlowerPremium('hollyBerries'), true);
  assert.equal(isFlowerPremium('mistletoeBough'), true);
  assert.equal(isFlowerPremium('amaryllis'), true);
  assert.equal(isFlowerPremium('frostedPinecone'), true);
  assert.equal(isFlowerPremium('glassOrnament'), true);
  assert.equal(isFlowerPremium('cinnamonStarAnise'), true);

  // Verify Free-first ordering across Wrappers, Ribbons, Backgrounds, and Seasonal
  const wrapFlags = WRAPPER_CATALOG.map((w) => isWrapPremium(w.id));
  assert.deepEqual(wrapFlags, [...wrapFlags].sort((a, b) => Number(a) - Number(b)));
  const ribbonFlags = RIBBON_STYLE_CATALOG.map((r) => isRibbonPremium(r.id));
  assert.deepEqual(ribbonFlags, [...ribbonFlags].sort((a, b) => Number(a) - Number(b)));
  const envFlags = ENVIRONMENT_CATALOG.map((e) => isEnvironmentPremium(e.id));
  assert.deepEqual(envFlags, [...envFlags].sort((a, b) => Number(a) - Number(b)));
  const seasonalFlags = seasonals.map((s) => isFlowerPremium(s.type));
  assert.deepEqual(seasonalFlags, [...seasonalFlags].sort((a, b) => Number(a) - Number(b)));

  // Verify new Couture flowers and backgrounds
  assert.equal(isFlowerPremium('auroraGardenia'), true);
  assert.equal(isFlowerPremium('velvetBaccara'), true);
  assert.equal(isFlowerPremium('imperialFritillaria'), true);
  assert.equal(isFlowerPremium('julietAustinRose'), true);
  assert.equal(isFlowerPremium('lunariaHonesty'), true);
  assert.equal(isFlowerPremium('cosmos'), false);
  assert.equal(isEnvironmentPremium('crystalPalace'), true);
  assert.equal(isEnvironmentPremium('midnightNoel'), true);
  assert.equal(isEnvironmentPremium('blushSilk'), false);
  assert.equal(isEnvironmentPremium('botanicalArch'), false);
  assert.equal(isEnvironmentPremium('nordicSnow'), false);
});

test('seasonalCalendar only exposes the Seasonal category during active or upcoming event windows', () => {
  // November 12 and December 24 are inside the Christmas & Winter Holidays window (Oct 25 – Jan 6)
  const novDate = new Date('2026-11-12T12:00:00Z');
  const decDate = new Date('2026-12-24T12:00:00Z');
  const janDate = new Date('2027-01-03T12:00:00Z');
  assert.equal(isSeasonalCategoryAvailable(novDate), true);
  assert.equal(getActiveSeasonalEvent(novDate)?.id, 'christmas_holiday');
  assert.equal(getAvailableSeasonalCatalog(decDate).length, 12);
  assert.equal(getAvailableSeasonalCatalog(janDate).length, 12);

  // Mid-summer non-event date (July 15) hides the Seasonal category
  const julyDate = new Date('2026-07-15T12:00:00Z');
  assert.equal(isSeasonalCategoryAvailable(julyDate), false);
  assert.equal(getActiveSeasonalEvent(julyDate), null);
  assert.equal(getAvailableSeasonalCatalog(julyDate).length, 0);
});

test('shareAndExport losslessly encodes and decodes all new flowers, others (sittingDog, lovelyCats, moon, sun, star, clouds, chocolates, ringInABox), seasonal designs, backgrounds, and layerPlane', () => {
  const store = useBouquetStore.getState();
  store.clearBouquet();
  assert.equal(useBouquetStore.getState().wrapStyle, 'chalice');
  store.addFlower('cosmos');
  store.addFlower('velvetBaccara');
  store.addFlower('monarchButterfly');
  store.addFlower('ribbonBowPick');
  store.addFlower('sittingDog');
  store.addFlower('lovelyCats');
  store.addFlower('moon');
  store.addFlower('sun');
  store.addFlower('star');
  store.addFlower('clouds');
  store.addFlower('chocolates');
  store.addFlower('ringInABox');
  store.addFlower('poinsettia');
  store.addFlower('cinnamonStarAnise');
  // Move monarchButterfly inside the bouquet wrapper and cosmos behind the back wrapper
  const itemsBefore = useBouquetStore.getState().items;
  const butterfly = itemsBefore.find((i) => i.type === 'monarchButterfly')!;
  const cosmos = itemsBefore.find((i) => i.type === 'cosmos')!;
  const sittingDog = itemsBefore.find((i) => i.type === 'sittingDog')!;
  const ringInABox = itemsBefore.find((i) => i.type === 'ringInABox')!;
  assert.equal(getEffectiveItemPlane(butterfly), 'front');
  assert.equal(getEffectiveItemPlane(sittingDog), 'front');
  assert.equal(getEffectiveItemPlane(ringInABox), 'front');
  store.moveItemLayer(butterfly.id, 'back'); // 'front' -> 'inside'
  store.moveItemLayer(cosmos.id, 'back'); // 'inside' -> 'back'
  store.setEnvironment('midnightNoel');

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
  assert.equal(decoded.environment, 'midnightNoel');
  assert.equal(decoded.wrapStyle, 'chalice');
  const decButterfly = decoded.items.find((i) => i.type === 'monarchButterfly')!;
  const decCosmos = decoded.items.find((i) => i.type === 'cosmos')!;
  const decBow = decoded.items.find((i) => i.type === 'ribbonBowPick')!;
  const decDog = decoded.items.find((i) => i.type === 'sittingDog')!;
  const decCats = decoded.items.find((i) => i.type === 'lovelyCats')!;
  const decMoon = decoded.items.find((i) => i.type === 'moon')!;
  const decSun = decoded.items.find((i) => i.type === 'sun')!;
  const decStar = decoded.items.find((i) => i.type === 'star')!;
  const decClouds = decoded.items.find((i) => i.type === 'clouds')!;
  const decChocolates = decoded.items.find((i) => i.type === 'chocolates')!;
  const decRing = decoded.items.find((i) => i.type === 'ringInABox')!;
  assert.equal(getEffectiveItemPlane(decButterfly), 'inside');
  assert.equal(getEffectiveItemPlane(decCosmos), 'back');
  assert.equal(getEffectiveItemPlane(decBow), 'front');
  assert.equal(getEffectiveItemPlane(decDog), 'front');
  assert.equal(getEffectiveItemPlane(decCats), 'front');
  assert.equal(getEffectiveItemPlane(decMoon), 'front');
  assert.equal(getEffectiveItemPlane(decSun), 'front');
  assert.equal(getEffectiveItemPlane(decStar), 'front');
  assert.equal(getEffectiveItemPlane(decClouds), 'front');
  assert.equal(getEffectiveItemPlane(decChocolates), 'front');
  assert.equal(getEffectiveItemPlane(decRing), 'front');
});

test('useBouquetStore supports photocards, environment, bouquetPose, and 4-way fast layering across planes (back, down, up, front)', () => {
  const store = useBouquetStore.getState();
  store.clearBouquet();

  // Add two flowers ('inside' plane) and one photocard ('front' overlay plane)
  store.addFlower('rose');
  store.addFlower('tulip');
  store.addPhotoCard('polaroid', 'data:image/jpeg;base64,abc123');

  let state = useBouquetStore.getState();
  assert.equal(state.items.length, 3);
  const [rose, tulip, photo] = state.items;
  assert.equal(photo.photoStyle, 'polaroid');
  assert.equal(photo.photoDataUrl, 'data:image/jpeg;base64,abc123');
  assert.equal(getEffectiveItemPlane(photo), 'front');

  // Test 4-way fast layering: move photocard from 'front' overlay into 'inside' bouquet plane at index 0
  store.moveItemLayer(photo.id, 'back');
  state = useBouquetStore.getState();
  assert.equal(state.items[0].id, photo.id);
  assert.equal(getEffectiveItemPlane(state.items[0]), 'inside');

  // Move photocard forward one step (index 0 -> index 1)
  store.moveItemLayer(photo.id, 'up');
  state = useBouquetStore.getState();
  assert.equal(state.items[1].id, photo.id);

  // Move photocard back one step (index 1 -> index 0)
  store.moveItemLayer(photo.id, 'down');
  state = useBouquetStore.getState();
  assert.equal(state.items[0].id, photo.id);

  // Move photocard to Most Front (index 0 -> index 2 and transitions from 'inside' back to 'front' overlay)
  store.moveItemLayer(photo.id, 'front');
  state = useBouquetStore.getState();
  assert.equal(state.items[2].id, photo.id);
  assert.equal(getEffectiveItemPlane(state.items[2]), 'front');
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

test('image upload security enforces 5MB file size limit, raster MIME/extension allowlist, and binary magic-byte header verification against disguised files', async () => {
  assert.equal(MAX_UPLOAD_IMAGE_BYTES, 5 * 1024 * 1024);

  // 1. Magic byte detection for genuine PNG, JPEG, WEBP, GIF vs disguised HTML/SVG/EXE/PDF
  const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 0]);
  const gifBytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0, 0, 0]);
  const webpBytes = new Uint8Array([
    0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
  ]);
  const disguisedHtmlBytes = new TextEncoder().encode('<!DOCTYPE html><script>alert(1)</script>');
  const disguisedExeBytes = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0, 0, 0, 0]);

  assert.equal(detectImageMagicBytes(pngBytes), 'image/png');
  assert.equal(detectImageMagicBytes(jpegBytes), 'image/jpeg');
  assert.equal(detectImageMagicBytes(gifBytes), 'image/gif');
  assert.equal(detectImageMagicBytes(webpBytes), 'image/webp');
  assert.equal(detectImageMagicBytes(disguisedHtmlBytes), null);
  assert.equal(detectImageMagicBytes(disguisedExeBytes), null);

  // 2. Rejects oversized files (> 5 MB)
  const oversizedFile = {
    name: 'huge-photo.jpg',
    type: 'image/jpeg',
    size: MAX_UPLOAD_IMAGE_BYTES + 1024,
    slice: () => new Blob([jpegBytes]),
  } as unknown as File;
  const oversizedRes = await validateUploadedImageFile(oversizedFile);
  assert.equal(oversizedRes.valid, false);
  assert.match(oversizedRes.error || '', /too large/i);

  // 3. Rejects non-raster extensions/MIMEs (e.g., .svg, .exe, .pdf, .html)
  const svgFile = {
    name: 'xss.svg',
    type: 'image/svg+xml',
    size: 512,
    slice: () => new Blob([disguisedHtmlBytes]),
  } as unknown as File;
  const svgRes = await validateUploadedImageFile(svgFile);
  assert.equal(svgRes.valid, false);
  assert.match(svgRes.error || '', /Unsupported file format/i);

  // 4. Rejects disguised script/HTML renamed to .jpg with spoofed image/jpeg MIME type
  const spoofedJpgFile = {
    name: 'evil-payload.jpg',
    type: 'image/jpeg',
    size: 256,
    slice: () => new Blob([disguisedHtmlBytes]),
  } as unknown as File;
  const spoofedRes = await validateUploadedImageFile(spoofedJpgFile);
  assert.equal(spoofedRes.valid, false);
  assert.match(spoofedRes.error || '', /not a genuine .* image/i);

  // 5. Accepts genuine PNG file with valid magic header and size
  const validPngFile = {
    name: 'memories.png',
    type: 'image/png',
    size: 2048,
    slice: () => new Blob([pngBytes]),
  } as unknown as File;
  const validRes = await validateUploadedImageFile(validPngFile);
  assert.equal(validRes.valid, true);
  assert.equal(validRes.detectedMime, 'image/png');
});

test('API securityGuard enforces sliding-window IP rate limiting, prototype-pollution sanitization, honeypot bot blocking, and payload byte caps', async () => {
  resetRateLimitStoreForTests();

  // 1. Sliding-window rate limiter blocks flood after maxRequests
  const now = 1_700_000_000_000;
  for (let i = 0; i < 3; i++) {
    const r = checkRateLimit({
      ip: '203.0.113.42',
      bucket: 'test_bucket',
      maxRequests: 3,
      windowMs: 60_000,
      nowMs: now + i * 100,
    });
    assert.equal(r.allowed, true);
  }
  const blocked = checkRateLimit({
    ip: '203.0.113.42',
    bucket: 'test_bucket',
    maxRequests: 3,
    windowMs: 60_000,
    nowMs: now + 500,
  });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);
  assert.ok(blocked.retryAfterSec >= 59);

  // 2. Prototype pollution & null-byte sanitization
  const maliciousPayload = JSON.parse(
    '{"name":"Alice\\u0000Bob","__proto__":{"polluted":true},"constructor":{"prototype":{"hacked":true}}}'
  );
  const sanitized = sanitizeJsonValue(maliciousPayload);
  assert.equal(sanitized.name, 'AliceBob');
  assert.equal(Object.prototype.hasOwnProperty.call(sanitized, '__proto__'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(sanitized, 'constructor'), false);
  assert.equal(({} as Record<string, unknown>).polluted, undefined);

  // 3. Automated scanner User-Agent & honeypot detection
  const scannerReq = { headers: { 'user-agent': 'sqlmap/1.7.2#stable' } };
  assert.equal(isSuspiciousBotRequest(scannerReq, {}).suspicious, true);
  const honeypotReq = { headers: { 'user-agent': 'Mozilla/5.0' } };
  assert.equal(
    isSuspiciousBotRequest(honeypotReq, { name: 'Bot', website_url: 'http://spam.example' }).suspicious,
    true
  );
  assert.equal(
    isSuspiciousBotRequest(honeypotReq, { name: 'Real User', message: 'Hello!' }).suspicious,
    false
  );

  // 4. Payload size limiter blocks oversized JSON bodies with HTTP 413
  const oversizedReq = {
    headers: { 'content-length': '50000' },
    body: { data: 'x'.repeat(50_000) },
  };
  const bodyCheck = await readSafeJsonBody(oversizedReq, 4096);
  assert.equal(bodyCheck.ok, false);
  assert.equal(bodyCheck.status, 413);
});

