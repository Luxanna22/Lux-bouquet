import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCuratedShowcaseBouquets,
  buildSnapshotFromShowcaseEntry,
  computeGarlandItemScrollTransform,
  computeSingleLaceCarouselItemTransform,
  convertVaultBouquetToShowcaseEntry,
  evaluateCatenaryCurveY,
  filterShowcaseBouquets,
  getShowcaseFreshnessInfo,
  isShowcaseBouquetActive,
  isShowcaseBouquetExpired,
} from './showcaseGallery';
import {
  decodeBouquetFromHash,
  encodeBouquetToCompactPayload,
  hydrateSnapshotWithFirestoreRecord,
  stripInlineAudioFromCompactPayload,
  stripInlinePhotosFromCompactPayload,
} from './shareAndExport';
import { BouquetSnapshot } from '../types/bouquet';

const FIXED_NOW = Date.parse('2026-11-09T12:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

test('3-tier expiration: 30d free, 90d extended paid (+60 bonus days), and Eternal keepsakes', () => {
  const freshBouquet = {
    sharedAt: new Date(FIXED_NOW - 10 * DAY_MS).toISOString(),
    isPremium: false,
  };
  const boundaryBouquet = {
    sharedAt: new Date(FIXED_NOW - 30 * DAY_MS).toISOString(),
    isPremium: false,
  };
  const expiredFreeBouquet = {
    sharedAt: new Date(FIXED_NOW - 31 * DAY_MS).toISOString(),
    isPremium: false,
  };
  const extendedPaidActiveBouquet = {
    sharedAt: new Date(FIXED_NOW - 45 * DAY_MS).toISOString(),
    isPremium: false,
    retentionDays: 90,
  };
  const extendedPaidExpiredBouquet = {
    sharedAt: new Date(FIXED_NOW - 91 * DAY_MS).toISOString(),
    isPremium: false,
    retentionDays: 90,
  };
  const premiumOldBouquet = {
    sharedAt: new Date(FIXED_NOW - 180 * DAY_MS).toISOString(),
    isPremium: true,
  };

  assert.equal(isShowcaseBouquetActive(freshBouquet, FIXED_NOW), true);
  assert.equal(isShowcaseBouquetActive(boundaryBouquet, FIXED_NOW), true);
  assert.equal(isShowcaseBouquetExpired(expiredFreeBouquet, FIXED_NOW), true);
  assert.equal(isShowcaseBouquetActive(expiredFreeBouquet, FIXED_NOW), false);
  // Paid Single / 7-Day Pass gets 90 days (+60 bonus days) -> active at day 45, expires at day 91
  assert.equal(isShowcaseBouquetActive(extendedPaidActiveBouquet, FIXED_NOW), true);
  assert.equal(isShowcaseBouquetExpired(extendedPaidExpiredBouquet, FIXED_NOW), true);
  // 30-Day Eternal Pass never expires even after 180 days
  assert.equal(isShowcaseBouquetActive(premiumOldBouquet, FIXED_NOW), true);
});

test('getShowcaseFreshnessInfo computes remaining days for 30d, 90d extended, and eternal keepsake', () => {
  const twoDaysAgo = {
    sharedAt: new Date(FIXED_NOW - 2 * DAY_MS).toISOString(),
    isPremium: false,
  };
  const info = getShowcaseFreshnessInfo(twoDaysAgo, FIXED_NOW);
  assert.equal(info.daysLeft, 28);
  assert.equal(info.label, '28d left');
  assert.equal(info.isExpiringSoon, false);

  const extendedFortyDaysAgo = {
    sharedAt: new Date(FIXED_NOW - 40 * DAY_MS).toISOString(),
    isPremium: false,
    retentionDays: 90,
  };
  const extendedInfo = getShowcaseFreshnessInfo(extendedFortyDaysAgo, FIXED_NOW);
  assert.equal(extendedInfo.daysLeft, 50);
  assert.equal(extendedInfo.label, '50d left');
  assert.equal(extendedInfo.isExtendedPaid, true);

  const twentyEightDaysAgo = {
    sharedAt: new Date(FIXED_NOW - 28 * DAY_MS).toISOString(),
    isPremium: false,
  };
  const soonInfo = getShowcaseFreshnessInfo(twentyEightDaysAgo, FIXED_NOW);
  assert.equal(soonInfo.daysLeft, 2);
  assert.equal(soonInfo.isExpiringSoon, true);

  const eternal = {
    sharedAt: new Date(FIXED_NOW - 60 * DAY_MS).toISOString(),
    isPremium: true,
  };
  const eternalInfo = getShowcaseFreshnessInfo(eternal, FIXED_NOW);
  assert.equal(eternalInfo.daysLeft, null);
  assert.equal(eternalInfo.label, 'Eternal keepsake');
});

test('filterShowcaseBouquets filters out >30d expired bouquets and searches by For, From, and Category', () => {
  const all = buildCuratedShowcaseBouquets(FIXED_NOW);
  // Raw list has 9 items (8 active + 1 expired 35d ago)
  assert.equal(all.length, 9);

  const activeAll = filterShowcaseBouquets(all, { nowMs: FIXED_NOW });
  assert.equal(activeAll.length, 8);
  assert.equal(
    activeAll.some((b) => b.id === 'garland-expired-sample'),
    false,
    '35-day-old non-premium bouquet must be excluded'
  );
  assert.equal(
    activeAll.some((b) => b.id === 'garland-claire-theo'),
    true,
    '44-day-old premium bouquet must remain visible'
  );

  // Filter by "For" (recipient)
  const forSophia = filterShowcaseBouquets(all, { forQuery: 'soph', nowMs: FIXED_NOW });
  assert.equal(forSophia.length, 1);
  assert.equal(forSophia[0].to, 'Sophia');

  // Filter by "From" (sender)
  const fromNoah = filterShowcaseBouquets(all, { fromQuery: 'NOAH', nowMs: FIXED_NOW });
  assert.equal(fromNoah.length, 1);
  assert.equal(fromNoah[0].from, 'Noah');
  assert.equal(fromNoah[0].to, 'Mom');

  // Filter by unified single search input (matches either For or From or both)
  const unifiedRecipient = filterShowcaseBouquets(all, { searchQuery: 'Sophia', nowMs: FIXED_NOW });
  assert.equal(unifiedRecipient.length, 1);
  assert.equal(unifiedRecipient[0].to, 'Sophia');

  const unifiedSender = filterShowcaseBouquets(all, { searchQuery: 'Mateo', nowMs: FIXED_NOW });
  assert.equal(unifiedSender.length, 1);
  assert.equal(unifiedSender[0].from, 'Mateo');

  const unifiedCombined = filterShowcaseBouquets(all, {
    searchQuery: 'Elena Mateo',
    nowMs: FIXED_NOW,
  });
  assert.equal(unifiedCombined.length, 1);
  assert.equal(unifiedCombined[0].code, 'shw_elena_mt');
});

test('evaluateCatenaryCurveY and computeGarlandItemScrollTransform trace a sweeping U-curve and move right-to-left on scroll', () => {
  const edgeY = 14;
  const midY = 86;

  // At left and right edges (u=0 and u=1), Y is high (edgeY = 14)
  assert.equal(evaluateCatenaryCurveY(0, edgeY, midY), 14);
  assert.equal(evaluateCatenaryCurveY(1, edgeY, midY), 14);
  // At center (u=0.5), Y dips down to midY = 86
  assert.equal(evaluateCatenaryCurveY(0.5, edgeY, midY), 86);

  // Scroll movement shifts xShiftPx from right (+) to left (-) and updates yCurvePx along the catenary arc
  const startState = computeGarlandItemScrollTransform(1, 4, 0, -1.2, edgeY, midY);
  const scrolledState = computeGarlandItemScrollTransform(1, 4, 900, -1.2, edgeY, midY);

  assert.ok(
    scrolledState.xShiftPx < startState.xShiftPx,
    'Increasing scrollTop must glide items from right to left'
  );
  assert.notEqual(startState.yCurvePx, scrolledState.yCurvePx);
  assert.ok(startState.yCurvePx > edgeY && startState.yCurvePx <= midY);
});

test('computeSingleLaceCarouselItemTransform moves creations from right to left along one catenary lace curve as scrollOffset increases', () => {
  const item4AtStart = computeSingleLaceCarouselItemTransform(4, 8, 0, 4, -1.5, 14, 92);
  const item4AfterScroll = computeSingleLaceCarouselItemTransform(4, 8, 2, 4, -1.5, 14, 92);
  const item4FurtherScroll = computeSingleLaceCarouselItemTransform(4, 8, 4, 4, -1.5, 14, 92);

  // Item 4 starts queued on the right (u > 0.9) and glides left as scrollOffset increases
  assert.ok(item4AtStart.u > 0.9);
  assert.ok(item4AfterScroll.u < item4AtStart.u);
  assert.ok(item4FurtherScroll.u < item4AfterScroll.u);
  assert.ok(item4AfterScroll.xPercent < item4AtStart.xPercent);

  // Vertical Y follows the catenary curve: lower (larger Y) near center u=0.5 than near right edge u>0.9
  assert.ok(item4AfterScroll.yCurvePx > item4AtStart.yCurvePx);
});

test('buildSnapshotFromShowcaseEntry preserves 100% of user BouquetSnapshot or builds identical curated snapshot', () => {
  const curated = buildCuratedShowcaseBouquets(FIXED_NOW)[0]; // Sophia from Julian
  const curatedSnap = buildSnapshotFromShowcaseEntry(curated);
  assert.equal(curatedSnap.wrapStyle, 'tissue');
  assert.equal(curatedSnap.ribbonStyle, 'lace');
  assert.equal(curatedSnap.card.to, 'Sophia');
  assert.equal(curatedSnap.card.from, 'Julian');
  assert.equal(curatedSnap.voice?.visibleOnStage, true);
  assert.equal(curatedSnap.voice?.style, 'mixtape');

  const userEntry = convertVaultBouquetToShowcaseEntry(
    {
      code: 'usr123',
      to: 'Camille',
      from: 'Lucas',
      createdAt: new Date(FIXED_NOW).toISOString(),
      shareUrl: 'https://sendabouquet.online/usr123',
    },
    {
      ...curatedSnap,
      wrapStyle: 'koreanmesh',
      wrapColor: '#EDE0F5',
      ribbonStyle: 'double',
      ribbonColor: '#A855F7',
    },
    0
  );
  const userSnap = buildSnapshotFromShowcaseEntry(userEntry);
  assert.equal(userSnap.wrapStyle, 'koreanmesh');
  assert.equal(userSnap.ribbonStyle, 'double');
  assert.equal(userSnap.card.to, 'Camille');
  assert.equal(userSnap.card.from, 'Lucas');
});

test('Firestore deduplicated audio + hydration preserves 100% of edited draft assets, background, photos, notes, and voice across devices', () => {
  const sampleAudio = 'data:audio/webm;base64,GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwH/////////';
  const samplePhoto = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcU';

  const editedCreatorSnapshot: BouquetSnapshot = {
    items: [
      {
        id: 'stem-1',
        type: 'peony',
        x: 280,
        y: 230,
        scale: 1.25,
        rotation: -14,
        flipX: false,
        petalColor: '#F472B6',
        centerColor: '#FEF08A',
        stemLength: 1.1,
      },
      {
        id: 'photo-1',
        type: 'rose',
        x: 340,
        y: 260,
        scale: 1.05,
        rotation: 8,
        flipX: false,
        petalColor: '#FFFDF9',
        centerColor: '#E11D48',
        stemLength: 1,
        photoStyle: 'stamp',
        photoDataUrl: samplePhoto,
        photoCaption: 'Paris 2026',
        clippedToBouquet: true,
      },
    ],
    wrapStyle: 'cloche',
    wrapColor: '#EDE0F5',
    ribbonStyle: 'velvet',
    ribbonColor: '#9F1239',
    environment: 'velvetSalon',
    bouquetPose: { x: 12, y: -8, scale: 1.04, rotation: 3 },
    card: {
      to: 'Isabella',
      from: 'Matteo',
      message: 'Every petal, photo, background, and voice note saved for you.',
      theme: 'sealed',
      customBg: '#FFFDF9',
      customAccent: '#9F1239',
      visibleOnStage: true,
      x: 418,
      y: 520,
      scale: 0.78,
      rotation: -4,
    },
    voice: {
      style: 'vinyl',
      title: 'Our Song',
      primaryColor: '#1E1B18',
      accentColor: '#E11D48',
      durationSec: 24,
      audioDataUrl: sampleAudio,
      visibleOnStage: true,
      x: 182,
      y: 518,
      scale: 0.92,
      rotation: 5,
    },
  };

  // 1. Encode full compact payload
  const fullPayload = encodeBouquetToCompactPayload(editedCreatorSnapshot, true);
  assert.ok(fullPayload.includes('&v='));
  assert.ok(fullPayload.includes('&e='));
  assert.ok(fullPayload.includes('&bp='));

  // 2. Strip inline audio for Firestore payload field (preventing duplicate audio storage & 1 MiB overflow)
  const strippedAudioPayload = stripInlineAudioFromCompactPayload(fullPayload);
  assert.ok(strippedAudioPayload.length < fullPayload.length);
  assert.ok(strippedAudioPayload.includes('&e='), 'Environment segment must remain intact after stripping inline audio');
  assert.ok(strippedAudioPayload.includes('&bp='), 'Bouquet pose segment must remain intact after stripping inline audio');

  // 3. Simulate another device fetching from Firestore (`shared_bouquets/{code}`) and hydrating
  const decodedOnOtherDevice = decodeBouquetFromHash(strippedAudioPayload);
  assert.ok(decodedOnOtherDevice, 'Stripped payload must decode cleanly');

  const hydratedOnOtherDevice = hydrateSnapshotWithFirestoreRecord(decodedOnOtherDevice, {
    voiceAudioDataUrl: sampleAudio,
    voiceStyle: 'vinyl',
    voiceTitle: 'Our Song',
    voiceDurationSec: 24,
  });

  // 4. Verify 100% parity between creator's bouquet and hydrated bouquet on other devices / Garland
  assert.equal(hydratedOnOtherDevice.environment, 'velvetSalon');
  assert.equal(hydratedOnOtherDevice.wrapStyle, 'cloche');
  assert.equal(hydratedOnOtherDevice.ribbonStyle, 'velvet');
  assert.deepEqual(hydratedOnOtherDevice.bouquetPose, { x: 12, y: -8, scale: 1.04, rotation: 3 });
  assert.equal(hydratedOnOtherDevice.card.to, 'Isabella');
  assert.equal(hydratedOnOtherDevice.card.from, 'Matteo');
  assert.equal(hydratedOnOtherDevice.card.message, 'Every petal, photo, background, and voice note saved for you.');
  assert.equal(hydratedOnOtherDevice.card.customBg, '#fffdf9');
  assert.equal(hydratedOnOtherDevice.card.customAccent, '#9f1239');
  assert.equal(hydratedOnOtherDevice.items.length, 2);
  assert.equal(hydratedOnOtherDevice.items[1].photoDataUrl, samplePhoto);
  assert.equal(hydratedOnOtherDevice.items[1].photoCaption, 'Paris 2026');
  assert.equal(hydratedOnOtherDevice.items[1].clippedToBouquet, true);
  assert.equal(hydratedOnOtherDevice.voice?.audioDataUrl, sampleAudio);
  assert.equal(hydratedOnOtherDevice.voice?.style, 'vinyl');
  assert.equal(hydratedOnOtherDevice.voice?.title, 'Our Song');
  assert.equal(hydratedOnOtherDevice.voice?.durationSec, 24);
  assert.equal(hydratedOnOtherDevice.voice?.visibleOnStage, true);

  // 5. Verify Garland Showcase conversion & unwrap snapshot parity
  const garlandEntry = convertVaultBouquetToShowcaseEntry(
    {
      code: 'isabella99',
      to: 'Isabella',
      from: 'Matteo',
      createdAt: new Date(FIXED_NOW).toISOString(),
      shareUrl: 'https://sendabouquet.online/isabella99',
      hasVoice: true,
    },
    hydratedOnOtherDevice,
    0
  );
  const garlandStageSnapshot = buildSnapshotFromShowcaseEntry(garlandEntry);
  assert.equal(garlandStageSnapshot.environment, 'velvetSalon');
  assert.equal(garlandStageSnapshot.items[1].photoDataUrl, samplePhoto);
  assert.equal(garlandStageSnapshot.voice?.audioDataUrl, sampleAudio);
  assert.equal(garlandStageSnapshot.voice?.visibleOnStage, true);
  assert.equal(garlandStageSnapshot.card.to, 'Isabella');
  assert.equal(garlandStageSnapshot.card.from, 'Matteo');

  // 6. Verify stripInlinePhotosFromCompactPayload preserves photocard item, caption, and clip state when used for feed index summary
  const slimIndexPayload = stripInlinePhotosFromCompactPayload(fullPayload);
  const slimDecoded = decodeBouquetFromHash(slimIndexPayload);
  assert.ok(slimDecoded);
  assert.equal(slimDecoded.items.length, 2);
  assert.equal(slimDecoded.items[1].photoStyle, 'stamp');
  assert.equal(slimDecoded.items[1].photoCaption, 'Paris 2026');
  assert.equal(slimDecoded.items[1].clippedToBouquet, true);
});

