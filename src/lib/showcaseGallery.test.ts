import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCuratedShowcaseBouquets,
  computeGarlandItemScrollTransform,
  evaluateCatenaryCurveY,
  filterShowcaseBouquets,
  getShowcaseFreshnessInfo,
  isShowcaseBouquetActive,
  isShowcaseBouquetExpired,
} from './showcaseGallery';

const FIXED_NOW = Date.parse('2026-11-09T12:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

test('30-day expiration hides bouquets older than 30 days unless marked premium', () => {
  const freshBouquet = {
    sharedAt: new Date(FIXED_NOW - 10 * DAY_MS).toISOString(),
    isPremium: false,
  };
  const boundaryBouquet = {
    sharedAt: new Date(FIXED_NOW - 30 * DAY_MS).toISOString(),
    isPremium: false,
  };
  const expiredBouquet = {
    sharedAt: new Date(FIXED_NOW - 31 * DAY_MS).toISOString(),
    isPremium: false,
  };
  const premiumOldBouquet = {
    sharedAt: new Date(FIXED_NOW - 90 * DAY_MS).toISOString(),
    isPremium: true,
  };

  assert.equal(isShowcaseBouquetActive(freshBouquet, FIXED_NOW), true);
  assert.equal(isShowcaseBouquetActive(boundaryBouquet, FIXED_NOW), true);
  assert.equal(isShowcaseBouquetExpired(expiredBouquet, FIXED_NOW), true);
  assert.equal(isShowcaseBouquetActive(expiredBouquet, FIXED_NOW), false);
  assert.equal(isShowcaseBouquetActive(premiumOldBouquet, FIXED_NOW), true);
});

test('getShowcaseFreshnessInfo computes remaining days and eternal keepsake label', () => {
  const twoDaysAgo = {
    sharedAt: new Date(FIXED_NOW - 2 * DAY_MS).toISOString(),
    isPremium: false,
  };
  const info = getShowcaseFreshnessInfo(twoDaysAgo, FIXED_NOW);
  assert.equal(info.daysLeft, 28);
  assert.equal(info.label, '28d left');
  assert.equal(info.isExpiringSoon, false);

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

  // Filter by category (cloche)
  const clocheOnly = filterShowcaseBouquets(all, { category: 'cloche', nowMs: FIXED_NOW });
  assert.equal(clocheOnly.length, 2);
  assert.equal(clocheOnly.every((b) => b.wrapStyle === 'cloche'), true);

  // Filter by category (eternal)
  const eternalOnly = filterShowcaseBouquets(all, { category: 'eternal', nowMs: FIXED_NOW });
  assert.equal(eternalOnly.length, 2);
  assert.equal(eternalOnly.every((b) => Boolean(b.isPremium)), true);
});

test('evaluateCatenaryCurveY and computeGarlandItemScrollTransform trace a sweeping U-curve and move on scroll', () => {
  const edgeY = 14;
  const midY = 86;

  // At left and right edges (u=0 and u=1), Y is high (edgeY = 14)
  assert.equal(evaluateCatenaryCurveY(0, edgeY, midY), 14);
  assert.equal(evaluateCatenaryCurveY(1, edgeY, midY), 14);
  // At center (u=0.5), Y dips down to midY = 86
  assert.equal(evaluateCatenaryCurveY(0.5, edgeY, midY), 86);

  // Scroll movement shifts xShiftPx and updates yCurvePx along the catenary arc
  const startState = computeGarlandItemScrollTransform(1, 4, 0, -1.2, edgeY, midY);
  const scrolledState = computeGarlandItemScrollTransform(1, 4, 450, -1.2, edgeY, midY);

  assert.notEqual(startState.xShiftPx, scrolledState.xShiftPx);
  assert.notEqual(startState.yCurvePx, scrolledState.yCurvePx);
  assert.ok(startState.yCurvePx > edgeY && startState.yCurvePx <= midY);
});
