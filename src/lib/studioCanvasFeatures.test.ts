import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { useBouquetStore } from '../store/useBouquetStore';
import {
  encodeBouquetToCompactPayload,
  decodeBouquetFromHash,
  getShortCodeFromPathname,
  MAX_UPLOAD_IMAGE_BYTES,
  detectImageMagicBytes,
  validateUploadedImageFile,
} from './shareAndExport';
import {
  getLiveStudioCatalogCounts,
  buildLiveSchemaJsonLd,
  detectInitialSeoRoute,
} from './seoMeta';
import {
  PHOTO_FRAME_CATALOG,
  ENVIRONMENT_CATALOG,
  FLOWER_CATALOG,
  WRAPPER_CATALOG,
  RIBBON_STYLE_CATALOG,
  VOICE_KEEPSAKE_CATALOG,
  DEFAULT_BOUQUET_POSE,
  getEffectiveItemPlane,
  doBouquetItemsVisuallyOverlap,
  FlowerType,
  VoiceKeepsakeStyle,
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
  isVoiceStylePremium,
} from './monetization';
// @ts-expect-error Shared ESM API security guard module
import { checkRateLimit, resetRateLimitStoreForTests, sanitizeJsonValue, isSuspiciousBotRequest, readSafeJsonBody } from '../../api/_lib/securityGuard.js';

test('PHOTO_FRAME_CATALOG (6), ENVIRONMENT_CATALOG (14), VOICE_KEEPSAKE_CATALOG (10), and FLOWER_CATALOG (83) provide unique designs with Free-first ordering and 20 Others attachments', () => {
  assert.equal(PHOTO_FRAME_CATALOG.length, 6);
  assert.equal(ENVIRONMENT_CATALOG.length, 14);
  assert.equal(VOICE_KEEPSAKE_CATALOG.length, 10);
  assert.equal(FLOWER_CATALOG.length, 83);
  const photoIds = new Set(PHOTO_FRAME_CATALOG.map((p) => p.id));
  const envIds = new Set(ENVIRONMENT_CATALOG.map((e) => e.id));
  const voiceIds = new Set(VOICE_KEEPSAKE_CATALOG.map((v) => v.id));
  const flowerIds = new Set(FLOWER_CATALOG.map((f) => f.type));
  assert.equal(photoIds.size, 6);
  assert.equal(envIds.size, 14);
  assert.equal(voiceIds.size, 10);
  assert.equal(flowerIds.size, 83);

  const expectedVoiceStyles: VoiceKeepsakeStyle[] = [
    'mixtape',
    'vinyl',
    'plushie',
    'musicbox',
    'locket',
    'shell',
    'birdcage',
    'bottle',
    'harp',
    'globe',
  ];
  for (const vs of expectedVoiceStyles) {
    assert.equal(voiceIds.has(vs), true, `Missing voice style '${vs}'`);
    assert.equal(isVoiceStylePremium(vs), true, `Expected voice style '${vs}' to be Couture`);
  }

  const others = FLOWER_CATALOG.filter((f) => Boolean(f.isOther));
  const seasonals = FLOWER_CATALOG.filter((f) => Boolean(f.isSeasonal));
  assert.equal(others.length, 20);
  assert.equal(seasonals.length, 12);

  // Verify 'sun' is prominently placed in the first 3 Free Others items, and new Couture sun assets exist
  assert.equal(others[2].type, 'sun');
  assert.equal(isFlowerPremium('sun'), false);
  assert.equal(isFlowerPremium('gildedSunburst'), true);
  assert.equal(isFlowerPremium('sunbeamSuncatcher'), true);

  const expectedNewOthers: FlowerType[] = [
    'sittingDog',
    'lovelyCats',
    'moon',
    'sun',
    'gildedSunburst',
    'sunbeamSuncatcher',
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

  // Verify Free-first ordering across Wrappers, Ribbons, Backgrounds, Others, and Seasonal
  const wrapFlags = WRAPPER_CATALOG.map((w) => isWrapPremium(w.id));
  assert.deepEqual(wrapFlags, [...wrapFlags].sort((a, b) => Number(a) - Number(b)));
  const ribbonFlags = RIBBON_STYLE_CATALOG.map((r) => isRibbonPremium(r.id));
  assert.deepEqual(ribbonFlags, [...ribbonFlags].sort((a, b) => Number(a) - Number(b)));
  const envFlags = ENVIRONMENT_CATALOG.map((e) => isEnvironmentPremium(e.id));
  assert.deepEqual(envFlags, [...envFlags].sort((a, b) => Number(a) - Number(b)));
  const othersFlags = others.map((o) => isFlowerPremium(o.type));
  assert.deepEqual(othersFlags, [...othersFlags].sort((a, b) => Number(a) - Number(b)));
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

test('shareAndExport losslessly encodes and decodes all new flowers, others (including gildedSunburst & sunbeamSuncatcher), couture voices, seasonal designs, backgrounds, and layerPlane', () => {
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
  store.addFlower('gildedSunburst');
  store.addFlower('sunbeamSuncatcher');
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
  store.updateVoice({ style: 'harp', visibleOnStage: true, title: 'Celestial' });

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
  assert.equal(decoded.voice?.style, 'harp');
  assert.equal(decoded.voice?.title, 'Celestial');
  const decButterfly = decoded.items.find((i) => i.type === 'monarchButterfly')!;
  const decCosmos = decoded.items.find((i) => i.type === 'cosmos')!;
  const decBow = decoded.items.find((i) => i.type === 'ribbonBowPick')!;
  const decDog = decoded.items.find((i) => i.type === 'sittingDog')!;
  const decCats = decoded.items.find((i) => i.type === 'lovelyCats')!;
  const decMoon = decoded.items.find((i) => i.type === 'moon')!;
  const decSun = decoded.items.find((i) => i.type === 'sun')!;
  const decGildedSun = decoded.items.find((i) => i.type === 'gildedSunburst')!;
  const decSuncatcher = decoded.items.find((i) => i.type === 'sunbeamSuncatcher')!;
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
  assert.equal(getEffectiveItemPlane(decGildedSun), 'front');
  assert.equal(getEffectiveItemPlane(decSuncatcher), 'front');
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
  // Anchor positions deterministically so overlap stepping is tested reliably
  store.updateItem(state.items[0].id, { x: 300, y: 300, rotation: 0, scale: 1 });
  store.updateItem(state.items[1].id, { x: 312, y: 305, rotation: 0, scale: 1 });
  store.updateItem(state.items[2].id, { x: 304, y: 302, rotation: 0, scale: 1 });
  state = useBouquetStore.getState();
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

test('getLiveStudioCatalogCounts, buildLiveSchemaJsonLd sitelinks, and static SEO files stay synchronized with FLOWER_CATALOG', () => {
  const counts = getLiveStudioCatalogCounts();
  assert.equal(counts.focalBloomCount, 33);
  assert.equal(counts.fillerStemCount, 18);
  assert.equal(counts.botanicalStemCount, 51);
  assert.equal(counts.otherAccentCount, 20);
  assert.equal(counts.seasonalCount, 12);
  assert.equal(counts.totalCatalogCount, 83);
  assert.equal(counts.wrapperCount, 12);
  assert.equal(counts.ribbonCount, 12);
  assert.equal(counts.voiceKeepsakeCount, 10);
  assert.equal(counts.photoFrameCount, 6);
  assert.equal(counts.environmentCount, 14);

  // Verify Sitelinks routes & short-code reservation
  assert.equal(detectInitialSeoRoute('/studio'), 'studio');
  assert.equal(detectInitialSeoRoute('/create'), 'studio');
  assert.equal(detectInitialSeoRoute('/create-bouquet'), 'studio');
  assert.equal(detectInitialSeoRoute('/garland'), 'garland');
  assert.equal(detectInitialSeoRoute('/creations'), 'garland');
  assert.equal(getShortCodeFromPathname('/studio'), null);
  assert.equal(getShortCodeFromPathname('/create'), null);
  assert.equal(getShortCodeFromPathname('/create-bouquet'), null);
  assert.equal(getShortCodeFromPathname('/garland'), null);

  // Verify Schema.org JSON-LD includes SiteNavigationElement sitelinks and live stem count
  const schema = buildLiveSchemaJsonLd(counts);
  const sitelinks = schema['@graph'].filter(
    (node: { '@type'?: string }) => node['@type'] === 'SiteNavigationElement'
  );
  assert.equal(sitelinks.length, 4);
  assert.equal(sitelinks[0].name, 'Create a Bouquet');
  assert.equal(sitelinks[0].url, 'https://www.sendabouquet.online/studio');
  assert.equal(sitelinks[1].name, 'Shared Creations');
  assert.equal(sitelinks[1].url, 'https://www.sendabouquet.online/garland');

  // Verify static SEO files reflect the live botanicalStemCount (51) and have no stale 36/31 stem copy
  const rootDir = process.cwd();
  const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  const sitemapXml = fs.readFileSync(path.join(rootDir, 'public/sitemap.xml'), 'utf8');
  const webmanifest = fs.readFileSync(path.join(rootDir, 'public/site.webmanifest'), 'utf8');
  const llmsTxt = fs.readFileSync(path.join(rootDir, 'public/llms.txt'), 'utf8');

  assert.ok(indexHtml.includes(`Arrange ${counts.botanicalStemCount} botanical stems`));
  assert.ok(!indexHtml.includes('36 botanical'));
  assert.ok(sitemapXml.includes(`Arrange ${counts.botanicalStemCount} botanical stems`));
  assert.ok(webmanifest.includes(`${counts.botanicalStemCount} botanical stems`));
  assert.ok(llmsTxt.includes(`${counts.botanicalStemCount} Botanical Stems`));
});

test('doBouquetItemsVisuallyOverlap detects head, stem, and non-overlapping flower geometry accurately', () => {
  const baseFlower = {
    type: 'daisy' as FlowerType,
    scale: 1,
    rotation: 0,
    flipX: false,
    petalColor: '#FFFFFF',
    centerColor: '#FACC15',
    stemLength: 1,
    layerPlane: 'inside' as const,
    clippedToBouquet: true,
  };

  const greenLeft = { ...baseFlower, id: 'green', x: 245, y: 260 };
  const pinkOverlapping = { ...baseFlower, id: 'pink', x: 222, y: 274 };
  const whiteFarRight = { ...baseFlower, id: 'white', x: 385, y: 265 };
  const lowerUnderGreenStem = { ...baseFlower, id: 'lower', x: 245, y: 390 };
  const clippedShortStemLeft = { ...baseFlower, id: 'short-stem', x: 245, y: 210, stemLength: 0.25 };
  const stemlessAccent = {
    ...baseFlower,
    id: 'butterfly',
    type: 'monarchButterfly' as FlowerType,
    x: 245,
    y: 210,
    layerPlane: 'front' as const,
    clippedToBouquet: false,
  };

  assert.equal(doBouquetItemsVisuallyOverlap(pinkOverlapping, greenLeft, 'kraft'), true);
  assert.equal(doBouquetItemsVisuallyOverlap(pinkOverlapping, whiteFarRight, 'kraft'), false);
  // Full stem on greenLeft (y=260 + ~155 = 415) touches lower flower head at y=390
  assert.equal(doBouquetItemsVisuallyOverlap(greenLeft, lowerUnderGreenStem, 'kraft'), true);
  // Short stem (0.25 -> ~54px) at y=210 stops around y=264, well above y=390
  assert.equal(doBouquetItemsVisuallyOverlap(clippedShortStemLeft, lowerUnderGreenStem, 'kraft'), false);
  // Stemless accent at y=210 does not have a stem reaching y=390
  assert.equal(doBouquetItemsVisuallyOverlap(stemlessAccent, lowerUnderGreenStem, 'kraft'), false);
});

test('moveItemLayer steps 1 overlapping flower at a time in 20-flower bouquets and crosses planes cleanly', () => {
  const store = useBouquetStore.getState();
  store.clearBouquet();
  store.setWrapStyle('kraft');

  // 1. Green daisy on the left at index 0
  store.addFlower('daisy');
  const greenId = useBouquetStore.getState().selectedId!;
  store.updateItem(greenId, {
    x: 245,
    y: 265,
    rotation: -6,
    scale: 1,
    petalColor: '#34D399',
    stemLength: 1,
  });

  // 2. 18 white daisies clustered on the right side (indices 1..18, not overlapping left daisies)
  const whiteIds: string[] = [];
  for (let i = 0; i < 18; i += 1) {
    store.addFlower('daisy');
    const id = useBouquetStore.getState().selectedId!;
    whiteIds.push(id);
    store.updateItem(id, {
      x: 375 + (i % 3) * 18,
      y: 235 + Math.floor(i / 3) * 16,
      rotation: 8,
      scale: 0.95,
      petalColor: '#FFFFFF',
      stemLength: 0.9,
    });
  }

  // 3. Pink daisy on the left overlapping Green daisy at index 19
  store.addFlower('daisy');
  const pinkId = useBouquetStore.getState().selectedId!;
  store.updateItem(pinkId, {
    x: 222,
    y: 278,
    rotation: -10,
    scale: 1,
    petalColor: '#F472B6',
    stemLength: 0.55,
  });

  assert.equal(useBouquetStore.getState().items.length, 20);
  assert.equal(useBouquetStore.getState().items[19].id, pinkId);

  // Single click "Send Back 1 Layer" jumps Pink past all 18 non-overlapping White daisies directly behind Green
  store.moveItemLayer(pinkId, 'down');
  let items = useBouquetStore.getState().items;
  assert.equal(items[0].id, pinkId);
  assert.equal(items[1].id, greenId);
  assert.equal(getEffectiveItemPlane(items[0]), 'inside');

  // Single click "Bring Forward 1 Layer" jumps Pink directly back in front of Green
  store.moveItemLayer(pinkId, 'up');
  items = useBouquetStore.getState().items;
  assert.equal(items[0].id, greenId);
  assert.equal(items[1].id, pinkId);
  assert.equal(getEffectiveItemPlane(items[1]), 'inside');

  // Cluster check: add a 3rd overlapping left flower (purple) at top, step down 1 overlapping flower per click
  store.addFlower('daisy');
  const purpleId = useBouquetStore.getState().selectedId!;
  store.updateItem(purpleId, {
    x: 234,
    y: 270,
    rotation: -4,
    scale: 1,
    petalColor: '#C084FC',
  });
  store.moveItemLayer(purpleId, 'down');
  items = useBouquetStore.getState().items;
  // Purple should move immediately behind Pink (index 1), still in front of Green (index 0)
  assert.equal(items.findIndex((i) => i.id === purpleId), 1);
  assert.equal(items.findIndex((i) => i.id === pinkId), 2);

  // Next 'down' puts Purple behind Green (index 0)
  store.moveItemLayer(purpleId, 'down');
  items = useBouquetStore.getState().items;
  assert.equal(items.findIndex((i) => i.id === purpleId), 0);

  // Next 'down' on Purple (now at backmost of 'inside') transitions plane from 'inside' -> 'back'
  store.moveItemLayer(purpleId, 'down');
  items = useBouquetStore.getState().items;
  assert.equal(getEffectiveItemPlane(items[0]), 'back');

  // Promote Pink to Most Front ('front') and verify stemLength is preserved on 'front' plane
  store.moveItemLayer(pinkId, 'front');
  items = useBouquetStore.getState().items;
  const pinkFront = items.find((i) => i.id === pinkId)!;
  assert.equal(getEffectiveItemPlane(pinkFront), 'front');
  assert.equal(pinkFront.stemLength, 0.55);

  // One click 'down' on Pink in 'front' tucks it into the top of 'inside' (not skipping past 'inside')
  store.moveItemLayer(pinkId, 'down');
  items = useBouquetStore.getState().items;
  const pinkInside = items.find((i) => i.id === pinkId)!;
  assert.equal(getEffectiveItemPlane(pinkInside), 'inside');
  assert.equal(items[items.length - 1].id, pinkId);
});

test('exiting a public or PIN-locked shared creation completely wipes stems, note, voice, lock, and undo history', () => {
  const store = useBouquetStore.getState();

  // Simulate opening a PIN-locked public shared creation (without unlocking it)
  store.loadSnapshot(
    {
      items: [
        {
          id: 'shared-rose-1',
          type: 'velvetBaccara',
          layerPlane: 'inside',
          clippedToBouquet: true,
          x: 300,
          y: 280,
          scale: 1.15,
          rotation: -8,
          flipX: false,
          petalColor: '#9f1239',
          centerColor: '#fde047',
        },
        {
          id: 'shared-photo-1',
          type: 'rose',
          photoStyle: 'polaroid',
          photoDataUrl: 'data:image/jpeg;base64,PRIVATE_PHOTO_DATA',
          photoCaption: 'Secret Trip',
          layerPlane: 'front',
          clippedToBouquet: false,
          x: 320,
          y: 340,
          scale: 1,
          rotation: 6,
          flipX: false,
          petalColor: '#FFFDF9',
          centerColor: '#B4846C',
        },
      ],
      wrapStyle: 'hatbox',
      wrapColor: '#9F1239',
      ribbonStyle: 'goldchain',
      ribbonColor: '#F59E0B',
      environment: 'velvetSalon',
      bouquetPose: { x: 18, y: -12, scale: 1.12, rotation: 5 },
      card: {
        to: 'Private Recipient',
        from: 'Private Sender',
        message: 'Top secret personal love letter that must never leak to studio!',
        visibleOnStage: true,
        theme: 'midnight',
        customBg: '#111827',
        customAccent: '#F59E0B',
        x: 380,
        y: 500,
        scale: 0.9,
        rotation: 12,
      },
      voice: {
        style: 'vinyl',
        visibleOnStage: true,
        title: 'Secret Voice Note',
        primaryColor: '#8B5A2B',
        accentColor: '#D4AF37',
        audioDataUrl: 'data:audio/webm;base64,PRIVATE_VOICE_AUDIO',
        durationSec: 24,
        x: 200,
        y: 510,
        scale: 1.1,
        rotation: -5,
      },
      lock: {
        mode: 'passcode',
        passcodeType: 'pin',
        unlockAtIso: '',
        questionPrompt: 'Our anniversary MMDD',
        passcodeAnswer: '0419',
      },
    },
    { isSharedView: true }
  );

  assert.equal(useBouquetStore.getState().isSharedViewSnapshot, true);
  assert.equal(useBouquetStore.getState().past.length, 0);

  // Simulate clicking "Craft Yours" or "Back" -> resets studio canvas (even if preserveHistory: true is accidentally passed!)
  store.clearBouquet({ preserveHistory: true });

  const afterClear = useBouquetStore.getState();
  assert.equal(afterClear.items.length, 0);
  assert.equal(afterClear.isSharedViewSnapshot, false);
  assert.equal(afterClear.wrapStyle, 'chalice');
  assert.equal(afterClear.environment, 'studio');
  assert.equal(afterClear.card.to, '');
  assert.equal(afterClear.card.from, '');
  assert.equal(
    afterClear.card.message,
    'Every petal in this bouquet holds a reason why you make my world brighter.'
  );
  assert.equal(afterClear.card.theme, 'sealed');
  assert.equal(afterClear.card.customBg, undefined);
  assert.equal(afterClear.card.customAccent, undefined);
  assert.equal(Boolean(afterClear.voice.audioDataUrl), false);
  assert.equal(afterClear.voice.visibleOnStage, false);
  assert.equal(afterClear.lock.mode, 'none');
  assert.equal(afterClear.lock.passcodeAnswer, '');
  // Undo stack MUST be empty so clicking Undo / Ctrl+Z can never resurrect the shared creation
  assert.equal(afterClear.past.length, 0);
  assert.equal(afterClear.future.length, 0);

  // Calling undo() must be a complete no-op and leave everything clean
  store.undo();
  const afterUndo = useBouquetStore.getState();
  assert.equal(afterUndo.items.length, 0);
  assert.equal(afterUndo.card.to, '');
  assert.equal(afterUndo.card.from, '');
  assert.equal(Boolean(afterUndo.voice.audioDataUrl), false);
  assert.equal(afterUndo.lock.mode, 'none');
});

test('creator-owned Start Over in Studio resets card note cleanly while preserving Undo for their own work', () => {
  const store = useBouquetStore.getState();
  store.clearBouquet();
  store.addFlower('rose');
  store.updateCard({ to: 'Mom', from: 'Alex', message: 'Happy Birthday Mom!' });

  // Creator clicks Start Over in Studio (preserveHistory: true on non-shared canvas)
  store.clearBouquet({ preserveHistory: true });
  const cleared = useBouquetStore.getState();
  assert.equal(cleared.items.length, 0);
  assert.equal(cleared.card.to, '');
  assert.equal(cleared.card.from, '');
  assert.equal(cleared.past.length > 0, true);

  // Creator can still undo their own accidental Start Over
  store.undo();
  const undone = useBouquetStore.getState();
  assert.equal(undone.items.length, 1);
  assert.equal(undone.card.to, 'Mom');
  assert.equal(undone.card.message, 'Happy Birthday Mom!');
});

test('share payload preserves blank optional sender instead of injecting legacy default', () => {
  const payload = encodeBouquetToCompactPayload(
    {
      items: [
        {
          id: 'r1',
          type: 'rose',
          x: 300,
          y: 260,
          scale: 1,
          rotation: 0,
          flipX: false,
          petalColor: '#f43f5e',
          centerColor: '#be123c',
        },
      ],
      wrapStyle: 'chalice',
      wrapColor: '#EDE0F5',
      ribbonColor: '#C084FC',
      ribbonStyle: 'satin',
      environment: 'studio',
      card: {
        to: 'Maya',
        from: '',
        message: 'Thinking of you today!',
        visibleOnStage: true,
        theme: 'sealed',
        x: 410,
        y: 525,
        scale: 0.72,
        rotation: 0,
      },
    },
    true
  );
  const decoded = decodeBouquetFromHash(payload);
  assert.ok(decoded);
  assert.equal(decoded.card.to, 'Maya');
  assert.equal(decoded.card.from, '');
});




