import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isStealthAdminGatePath,
  extractStealthGateSlug,
  extractVoucherKeyFromSearch,
  buildTesterMagicInviteUrl,
  buildPaidPassClaimUrl,
  createInitialAnalyticsSummary,
  applyTelemetryEventToSummary,
  computeFinancialMetrics,
  computeRevenueProjection,
  classifyPaidPassFilterStatus,
  classifyTesterVoucherFilterStatus,
  getPaidPassDeviceBindingCount,
  countPaidPassStatuses,
  countTesterVoucherStatuses,
  filterPaidPasses,
  filterTesterVouchers,
  PaidPassLedgerItem,
  TesterVoucherLedgerItem,
} from './ownerAnalytics';
import {
  createSignedStudioPass,
  validateAndBindPassRedemption,
  verifyActiveStudioPassForAction,
  isTesterVoucherPass,
  parseTesterVoucherMeta,
  REVOKED_PASS_SENTINEL,
  TESTER_SINGLE_DEVICE_SENTINEL,
} from './monetization';
// @ts-expect-error -- Serverless handler is an untyped ESM module
import { createEncryptedAdminVisitSlug, verifyEncryptedAdminVisitSlug, verifyOwnerPinWithRateLimit, createSignedAdminSessionToken, verifySignedAdminSessionToken, mergeRemoteOwnerVaultIntoMemory, recordPaidPassIssuanceServer, mintPaidPassServer, revokePaidPassServer, validateAndBindPassRedemptionServer, verifyActiveStudioPassForActionServer, toggleIncomePauseServer, resetOwnerIncomeServer, clearTestAndRevokedPaidKeysServer, recomputePaidRevenueFromLedgerServer, OWNER_ANALYTICS_STATE, TESTER_VOUCHER_LEDGER, PAID_PASS_LEDGER } from '../../api/_lib/paymentHandler.js';
// @ts-expect-error -- Serverless handler is an untyped ESM module
import { sanitizeAnalyticsForAi, runOwnerAnalyticsAi, resetOwnerAiStateForTests, buildGeminiRequestConfig, selectDiscoveredFlashModels } from '../../api/_lib/ownerAiHandler.js';
import { detectInitialSeoRoute, extractGarlandQueryParam } from './seoMeta';
import { getShortCodeFromPathname } from './shareAndExport';

describe('Stealth Bouquet Gate & Encrypted Per-Visit URL Routing', () => {
  it('generates and verifies per-visit HMAC-signed stealth gate slugs bound to deviceTokenHash', () => {
    const deviceA = 'dev_owner_macbook_1234567890';
    const deviceB = 'dev_stranger_phone_9999999999';
    const nowMs = 1_760_000_000_000;

    const slug = createEncryptedAdminVisitSlug(deviceA, nowMs);
    assert.ok(slug.startsWith('gk-'));
    assert.equal(isStealthAdminGatePath(`/${slug}`), true);
    assert.equal(extractStealthGateSlug(`/${slug}`), slug);

    // Valid on the same device within 30 minutes
    assert.equal(verifyEncryptedAdminVisitSlug(slug, deviceA, nowMs + 5 * 60 * 1000), true);

    // Rejected if copied to another device
    assert.equal(verifyEncryptedAdminVisitSlug(slug, deviceB, nowMs + 1000), false);

    // Rejected after 30-minute expiry
    assert.equal(verifyEncryptedAdminVisitSlug(slug, deviceA, nowMs + 31 * 60 * 1000), false);

    // Rejected if tampered
    assert.equal(
      verifyEncryptedAdminVisitSlug(`${slug.slice(0, -2)}AA`, deviceA, nowMs + 1000),
      false
    );
  });

  it('never collides with normal shared bouquet short codes', () => {
    assert.equal(isStealthAdminGatePath('/Vu18KSuusq9133s'), false);
    assert.equal(extractStealthGateSlug('/Vu18KSuusq9133s'), null);
    assert.equal(isStealthAdminGatePath('/'), false);
  });

  it('enforces PIN verification and brute-force rate limiting after 5 failed attempts', () => {
    const testDevice = `test_pin_device_${Date.now()}`;
    const nowMs = Date.now();

    // 4 wrong attempts should not lock yet
    for (let i = 1; i <= 4; i++) {
      const res = verifyOwnerPinWithRateLimit('wrong-pin', testDevice, nowMs + i * 100);
      assert.equal(res.ok, false);
      assert.equal(res.locked, false);
    }

    // 5th wrong attempt triggers 15-minute lockout
    const fifth = verifyOwnerPinWithRateLimit('wrong-pin', testDevice, nowMs + 500);
    assert.equal(fifth.ok, false);
    assert.equal(fifth.locked, true);

    // Even the correct PIN is rejected while locked out
    const duringLock = verifyOwnerPinWithRateLimit('2026', testDevice, nowMs + 1000);
    assert.equal(duringLock.ok, false);
    assert.equal(duringLock.locked, true);

    // After 15 minutes, correct PIN ('2026') succeeds and clears tracker
    const afterCooldown = verifyOwnerPinWithRateLimit(
      '2026',
      testDevice,
      nowMs + 16 * 60 * 1000
    );
    assert.equal(afterCooldown.ok, true);
    assert.equal(afterCooldown.locked, false);
  });

  it('issues and verifies device-bound adminSessionTokens', () => {
    const devHash = 'owner_session_device_abc12345';
    const now = Date.now();
    const token = createSignedAdminSessionToken(devHash, now);
    assert.equal(verifySignedAdminSessionToken(token, devHash, now + 5000), true);
    assert.equal(verifySignedAdminSessionToken(token, 'other_device', now + 5000), false);
    assert.equal(verifySignedAdminSessionToken(token, devHash, now + 61 * 60 * 1000), false);
  });
});

describe('1-Device Locked Expiring Tester Vouchers & Magic Links', () => {
  it('parses ?voucher= and ?pass= BLOOM-XXXX-XXXX magic links and builds clean invite URLs', () => {
    const key = extractVoucherKeyFromSearch('?voucher=bloom-tv4k-9m2p');
    assert.equal(key, 'BLOOM-TV4K-9M2P');
    assert.equal(extractVoucherKeyFromSearch('?pass=bloom-8r2k-4p9x'), 'BLOOM-8R2K-4P9X');
    assert.equal(extractVoucherKeyFromSearch('?voucher=invalid'), null);

    const inviteUrl = buildTesterMagicInviteUrl('BLOOM-TV4K-9M2P', 'https://sendabouquet.app');
    assert.equal(inviteUrl, 'https://sendabouquet.app/?voucher=BLOOM-TV4K-9M2P');

    const paidClaimUrl = buildPaidPassClaimUrl('BLOOM-8R2K-4P9X', 'https://sendabouquet.app');
    assert.equal(paidClaimUrl, 'https://sendabouquet.app/?pass=BLOOM-8R2K-4P9X');
  });

  it('locks a Tester Voucher to the 1st claiming device and strictly blocks a 2nd device', () => {
    const nowMs = 1_760_000_000_000;
    const unclaimedVoucher = createSignedStudioPass({
      isTesterVoucher: true,
      tier: 'pass_7d',
      region: 'INTL',
      deviceTokenHash: '',
      durationHours: 24,
      testerLabel: 'Mia - iOS Test',
      testerDailyCap: 5,
      retentionDaysOverride: 30,
      nowMs,
    });

    assert.ok(unclaimedVoucher.passKey.startsWith('BLOOM-TV'));
    assert.equal(isTesterVoucherPass(unclaimedVoucher), true);
    assert.equal(unclaimedVoucher.secondaryDeviceHash, TESTER_SINGLE_DEVICE_SENTINEL);
    assert.equal(unclaimedVoucher.isEternalKeepsake, false);
    assert.equal(unclaimedVoucher.retentionDays, 30);

    const meta = parseTesterVoucherMeta(unclaimedVoucher);
    assert.equal(meta.isTester, true);
    assert.equal(meta.dailyCap, 5);
    assert.equal(meta.label, 'Mia - iOS Test');

    // Device 1 claims the voucher via Magic Link
    const claim1 = validateAndBindPassRedemption(
      unclaimedVoucher,
      'tester_phone_device_1',
      nowMs + 1000
    );
    assert.equal(claim1.valid, true);
    assert.ok(claim1.updatedPass);
    assert.equal(claim1.updatedPass?.primaryDeviceHash, 'tester_phone_device_1');
    assert.equal(claim1.updatedPass?.secondaryDeviceHash, TESTER_SINGLE_DEVICE_SENTINEL);

    // Device 2 tries to use the forwarded Magic Link -> strictly blocked!
    const claim2 = validateAndBindPassRedemption(
      claim1.updatedPass!,
      'forwarded_friend_device_2',
      nowMs + 2000
    );
    assert.equal(claim2.valid, false);
    assert.equal(claim2.status, 'DEVICE_LIMIT_EXCEEDED');

    // Device 1 can create bouquets up to its custom daily cap (5)
    let currentPass = claim1.updatedPass!;
    for (let i = 1; i <= 5; i++) {
      const check = verifyActiveStudioPassForAction({
        pass: currentPass,
        deviceTokenHash: 'tester_phone_device_1',
        incrementUsage: true,
        nowMs: nowMs + i * 1000,
      });
      assert.equal(check.valid, true);
      currentPass = check.updatedPass!;
    }

    // 6th bouquet on the same day is rate-limited by the custom tester daily cap (5)
    const sixthCheck = verifyActiveStudioPassForAction({
      pass: currentPass,
      deviceTokenHash: 'tester_phone_device_1',
      incrementUsage: true,
      nowMs: nowMs + 9000,
    });
    assert.equal(sixthCheck.valid, false);
    assert.equal(sixthCheck.status, 'DAILY_LIMIT_REACHED');

    // Revoking the voucher immediately blocks Device 1
    const revokedPass = {
      ...currentPass,
      secondaryDeviceHash: REVOKED_PASS_SENTINEL,
    };
    const revokedCheck = verifyActiveStudioPassForAction({
      pass: revokedPass,
      deviceTokenHash: 'tester_phone_device_1',
      incrementUsage: false,
      nowMs: nowMs + 10000,
    });
    assert.equal(revokedCheck.valid, false);
  });
});

describe('Direct Paid Key Generator & Revocation (PH & INTL)', () => {
  it('mints paid keys across tiers & regions, binds single bouquets only on first seal, and revokes cleanly', () => {
    const nowMs = Date.now();
    const phpBefore = OWNER_ANALYTICS_STATE.revenuePhpCentavos;
    const usdBefore = OWNER_ANALYTICS_STATE.revenueUsdCents;
    const singleCountBefore = OWNER_ANALYTICS_STATE.passesIssued.single;
    const eternalCountBefore = OWNER_ANALYTICS_STATE.passesIssued.pass_30d;

    // 1. Mint a PH Single Bouquet key (₱49) via GCash Manual
    const mintedSingle = mintPaidPassServer({
      tier: 'single',
      region: 'PH',
      channel: 'manual_gcash',
      label: 'Bianca GCash #4821',
      nowMs,
    });

    assert.ok(/^BLOOM-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(mintedSingle.pass.passKey));
    assert.equal(mintedSingle.pass.tier, 'single');
    assert.equal(mintedSingle.pass.region, 'PH');
    assert.equal(mintedSingle.pass.boundBouquetCode, null);
    assert.equal(mintedSingle.paidPass.amountMinor, 4900);
    assert.equal(mintedSingle.paidPass.currency, 'PHP');
    assert.equal(mintedSingle.paidPass.channel, 'manual_gcash');
    assert.equal(mintedSingle.paidPass.status, 'unclaimed');
    assert.equal(OWNER_ANALYTICS_STATE.revenuePhpCentavos, phpBefore + 4900);
    assert.equal(OWNER_ANALYTICS_STATE.passesIssued.single, singleCountBefore + 1);

    // Buyer claims single key, seals 1st bouquet -> binds it; 2nd bouquet -> blocked
    const redeemed = validateAndBindPassRedemptionServer(
      mintedSingle.pass,
      'buyer_gcash_phone_1',
      nowMs + 500
    );
    assert.equal(redeemed.valid, true);
    assert.equal(redeemed.updatedPass.primaryDeviceHash, 'buyer_gcash_phone_1');

    const sealFirst = verifyActiveStudioPassForActionServer({
      pass: redeemed.updatedPass,
      deviceTokenHash: 'buyer_gcash_phone_1',
      clientSessionNonce: redeemed.updatedPass.activeSessionNonce,
      bouquetCode: 'bq_first_gift_1',
      incrementUsage: true,
      nowMs: nowMs + 1000,
    });
    assert.equal(sealFirst.valid, true);
    assert.equal(sealFirst.updatedPass.boundBouquetCode, 'bq_first_gift_1');

    const sealSecond = verifyActiveStudioPassForActionServer({
      pass: sealFirst.updatedPass,
      deviceTokenHash: 'buyer_gcash_phone_1',
      clientSessionNonce: sealFirst.updatedPass.activeSessionNonce,
      bouquetCode: 'bq_second_gift_2',
      incrementUsage: true,
      nowMs: nowMs + 2000,
    });
    assert.equal(sealSecond.valid, false);
    assert.equal(sealSecond.status, 'SINGLE_BOUQUET_ALREADY_USED');

    // 2. Mint an INTL 30-Day Pass key ($6.99) -> Eternal showcase, increments USD
    const mintedEternal = mintPaidPassServer({
      tier: 'pass_30d',
      region: 'INTL',
      channel: 'kofi',
      label: 'Alex Ko-fi Direct',
      nowMs,
    });

    assert.equal(mintedEternal.pass.isEternalKeepsake, true);
    assert.equal(mintedEternal.pass.retentionDays, 36500);
    assert.equal(mintedEternal.paidPass.amountMinor, 699);
    assert.equal(mintedEternal.paidPass.currency, 'USD');
    assert.equal(OWNER_ANALYTICS_STATE.revenueUsdCents, usdBefore + 699);
    assert.equal(OWNER_ANALYTICS_STATE.passesIssued.pass_30d, eternalCountBefore + 1);

    // 3. Revoking the paid key blocks future redemptions, marks ledger revoked, and excludes its revenue
    const revRes = revokePaidPassServer(mintedEternal.pass.passKey);
    assert.equal(revRes.ok, true);
    assert.equal(PAID_PASS_LEDGER.get(mintedEternal.pass.passKey)?.status, 'revoked');
    assert.equal(OWNER_ANALYTICS_STATE.revenueUsdCents, usdBefore);
    assert.equal(OWNER_ANALYTICS_STATE.passesIssued.pass_30d, eternalCountBefore);

    const blockedRedeem = validateAndBindPassRedemptionServer(
      mintedEternal.pass,
      'buyer_dev_999',
      nowMs + 3000
    );
    assert.equal(blockedRedeem.valid, false);
    assert.equal(blockedRedeem.status, 'REVOKED');
  });

  it('isolates test webhooks, supports pause/resume live income mode, and prevents Math.max reset resurrection', () => {
    const prevEpoch = OWNER_ANALYTICS_STATE.incomeResetEpoch;
    const prevResetAtMs = OWNER_ANALYTICS_STATE.incomeResetAtMs;
    const prevPaused = OWNER_ANALYTICS_STATE.incomePausedForTesting;
    try {
      // Reset clean slate first
      resetOwnerIncomeServer({ purgeTestAndRevoked: true, nowMs: Date.now() });
      assert.equal(OWNER_ANALYTICS_STATE.revenueUsdCents, 0);
      assert.equal(OWNER_ANALYTICS_STATE.revenuePhpCentavos, 0);

      // 1. SikatPay test key (sptest_ prefix / isTest: true) issues working pass but adds $0 to gross
      const testPass = createSignedStudioPass({
        tier: 'single',
        region: 'PH',
        deviceTokenHash: 'webhook_tester_dev_1',
        paymentProvider: 'sikatpay',
        paymentReference: 'sptest_123456',
      });
      recordPaidPassIssuanceServer(testPass, { isTest: true, channel: 'sikatpay' });
      assert.equal(OWNER_ANALYTICS_STATE.revenuePhpCentavos, 0);
      assert.equal(OWNER_ANALYTICS_STATE.passesIssued.single, 0);
      assert.equal(PAID_PASS_LEDGER.get(testPass.passKey)?.isTest, true);

      // 2. Pausing live income isolates subsequent issuances even without sptest_ prefix
      toggleIncomePauseServer(true);
      assert.equal(OWNER_ANALYTICS_STATE.incomePausedForTesting, true);

      const pausedLivePass = createSignedStudioPass({
        tier: 'pass_7d',
        region: 'PH',
        deviceTokenHash: 'webhook_tester_dev_2',
        paymentProvider: 'sikatpay',
        paymentReference: 'sp_live_during_pause',
      });
      recordPaidPassIssuanceServer(pausedLivePass, { isTest: false, channel: 'sikatpay' });
      assert.equal(OWNER_ANALYTICS_STATE.revenuePhpCentavos, 0);
      assert.equal(PAID_PASS_LEDGER.get(pausedLivePass.passKey)?.isTest, true);

      // 3. Resuming live income counts real payments again
      toggleIncomePauseServer(false);
      assert.equal(OWNER_ANALYTICS_STATE.incomePausedForTesting, false);

      const realPass = createSignedStudioPass({
        tier: 'pass_7d',
        region: 'INTL',
        deviceTokenHash: 'real_buyer_dev_1',
        paymentProvider: 'kofi',
        paymentReference: 'kofi_real_001',
      });
      recordPaidPassIssuanceServer(realPass, { isTest: false, channel: 'kofi' });
      assert.equal(OWNER_ANALYTICS_STATE.revenueUsdCents, 399);
      assert.equal(OWNER_ANALYTICS_STATE.passesIssued.pass_7d, 1);

      // 4. Resetting income zeroes totals and stale remote vault sync cannot resurrect pre-reset income
      const epochBeforeReset = OWNER_ANALYTICS_STATE.incomeResetEpoch;
      resetOwnerIncomeServer({ purgeTestAndRevoked: true, nowMs: Date.now() + 5000 });
      assert.equal(OWNER_ANALYTICS_STATE.revenueUsdCents, 0);
      assert.equal(OWNER_ANALYTICS_STATE.revenuePhpCentavos, 0);
      assert.ok(OWNER_ANALYTICS_STATE.incomeResetEpoch > epochBeforeReset);

      mergeRemoteOwnerVaultIntoMemory({
        incomeResetEpoch: 0,
        analytics: {
          revenueUsdCents: 9999,
          revenuePhpCentavos: 54500,
        },
        paidPasses: [
          {
            passKey: 'BLOOM-STALE-TEST',
            label: 'Stale Pre-Reset Pass',
            tier: 'pass_30d',
            region: 'PH',
            channel: 'sikatpay',
            amountMinor: 19900,
            currency: 'PHP',
            createdAt: '2026-11-01T00:00:00.000Z',
            expiresAt: '2026-12-01T00:00:00.000Z',
            status: 'claimed',
            claimedDeviceHash: 'old_dev',
            bouquetsCreated: 0,
            blockedAttempts: 0,
          },
        ],
      });
      recomputePaidRevenueFromLedgerServer();
      assert.equal(OWNER_ANALYTICS_STATE.revenueUsdCents, 0);
      assert.equal(OWNER_ANALYTICS_STATE.revenuePhpCentavos, 0);

      // 5. Clear test/revoked helper removes any remaining test keys cleanly
      const testPass2 = createSignedStudioPass({
        tier: 'single',
        region: 'PH',
        deviceTokenHash: 'tester_clear_1',
        paymentProvider: 'sikatpay',
        paymentReference: 'sptest_clear_me',
      });
      recordPaidPassIssuanceServer(testPass2, { isTest: true });
      assert.ok(PAID_PASS_LEDGER.has(testPass2.passKey));
      const removed = clearTestAndRevokedPaidKeysServer();
      assert.ok(removed >= 1);
      assert.equal(PAID_PASS_LEDGER.has(testPass2.passKey), false);
    } finally {
      OWNER_ANALYTICS_STATE.incomeResetEpoch = prevEpoch;
      OWNER_ANALYTICS_STATE.incomeResetAtMs = prevResetAtMs;
      OWNER_ANALYTICS_STATE.incomePausedForTesting = prevPaused;
    }
  });
});

describe('First-Party Web & Studio Telemetry Aggregation', () => {
  it('increments funnel counters, botanical leaderboards, and daily series accurately', () => {
    let summary = createInitialAnalyticsSummary(1_760_000_000_000);
    const initialVisits = summary.webVisits;
    const initialBouquets = summary.bouquetsCreated;

    summary = applyTelemetryEventToSummary(summary, {
      eventType: 'web_visit',
      device: 'mobile',
      os: 'ios',
      region: 'PH',
      referrer: 'tester_magic_link',
      isUniqueVisitor: true,
    });
    assert.equal(summary.webVisits, initialVisits + 1);

    summary = applyTelemetryEventToSummary(summary, {
      eventType: 'bouquet_sealed',
      isCouture: true,
      hasVoice: true,
      flowers: ['peony', 'gardenia'],
      wrapStyle: 'linen',
      ribbonStyle: 'silk',
      environment: 'golden_hour',
      voiceStyle: 'vinyl',
      photoStyles: ['polaroid'],
      lockMode: 'passcode',
    });
    assert.equal(summary.bouquetsCreated, initialBouquets + 1);
  });

  it('persists and merges Owner Vault analytics, paid pass ledger, and tester vouchers across Vercel redeploys', () => {
    mergeRemoteOwnerVaultIntoMemory({
      analytics: {
        webVisits: 420,
        uniqueVisitors: 310,
        landingViews: 390,
        studioSessions: 215,
        showcaseViews: 95,
        bouquetsCreated: 88,
        flowers: { peony: 34, rose: 29 },
      },
      paidPasses: [
        {
          passKey: 'BLOOM-PD88-DEPLOY',
          label: 'Remote Buyer',
          tier: 'pass_30d',
          region: 'PH',
          channel: 'manual_gcash',
          amountMinor: 19900,
          currency: 'PHP',
          retentionDays: 36500,
          isEternalKeepsake: true,
          createdAt: '2026-11-10T00:00:00.000Z',
          expiresAt: '2026-12-10T00:00:00.000Z',
          status: 'claimed',
          claimedDeviceHash: 'remote_paid_dev_1',
          bouquetsCreated: 4,
          blockedAttempts: 0,
        },
      ],
      testerVouchers: [
        {
          passKey: 'BLOOM-TV99-TEST',
          label: 'QA Deploy Persistence',
          createdAt: '2026-11-10T00:00:00.000Z',
          expiresAt: '2026-11-15T00:00:00.000Z',
          durationHours: 120,
          dailyCap: 5,
          retentionDays: 30,
          status: 'claimed',
          claimedDeviceHash: 'qa_device_hash_1',
          bouquetsCreated: 3,
          blockedAttempts: 1,
          magicLinkPath: '/?voucher=BLOOM-TV99-TEST',
        },
      ],
    });

    assert.ok(OWNER_ANALYTICS_STATE.webVisits >= 420);
    assert.ok(OWNER_ANALYTICS_STATE.uniqueVisitors >= 310);
    assert.ok(OWNER_ANALYTICS_STATE.flowers.peony >= 34);
    assert.equal(TESTER_VOUCHER_LEDGER.get('BLOOM-TV99-TEST')?.bouquetsCreated, 3);
    assert.equal(PAID_PASS_LEDGER.get('BLOOM-PD88-DEPLOY')?.bouquetsCreated, 4);

    const paidPass = createSignedStudioPass({
      tier: 'pass_7d',
      region: 'PH',
      deviceTokenHash: 'buyer_dev_1',
      paymentProvider: 'paymongo',
      paymentReference: 'pm_ref_123',
    });
    const recordedFirst = recordPaidPassIssuanceServer(paidPass);
    const recordedDuplicate = recordPaidPassIssuanceServer(paidPass);
    assert.equal(recordedFirst, true);
    assert.equal(recordedDuplicate, false);
    assert.ok(OWNER_ANALYTICS_STATE.passesIssued.pass_7d >= 1);
    assert.ok(OWNER_ANALYTICS_STATE.revenuePhpCentavos >= 9900);
  });

  it('computes financial KPIs, funnel rates, and buyer scale projections accurately', () => {
    const summary = createInitialAnalyticsSummary(1_760_000_000_000);
    summary.webVisits = 1000;
    summary.uniqueVisitors = 800;
    summary.studioSessions = 600;
    summary.bouquetsCreated = 400;
    summary.coutureBouquetsCreated = 180;
    summary.paywallOpens = 200;
    summary.checkoutsStarted = 50;
    summary.recipientUnwraps = 300;
    summary.recipientToStudioClicks = 45;
    summary.passesIssued = { single: 5, pass_7d: 10, pass_30d: 5, tester: 2 };
    summary.revenueUsdCents = 5600; // $56.00
    summary.revenuePhpCentavos = 280000; // ₱2,800 -> $50.00 @ 56

    const fin = computeFinancialMetrics(summary, 56);
    assert.equal(fin.grossUsd, 56);
    assert.equal(fin.grossPhp, 2800);
    assert.equal(fin.combinedGrossUsd, 106);
    assert.equal(fin.totalPaidPasses, 20);
    assert.equal(fin.overallVisitorToPaidPct, 2);
    assert.equal(fin.paywallToPaidPct, 10);
    assert.equal(fin.checkoutToPaidPct, 40);
    assert.equal(fin.arppuUsd, 5.3);
    assert.equal(fin.viralLoopPct, 15);
    assert.ok(fin.estNetUsd > 0 && fin.estNetUsd < fin.combinedGrossUsd);

    const lowProj = computeRevenueProjection({
      dailyVisitors: 300,
      studioStartRatePct: 55,
      paywallReachPct: 35,
      paywallToPaidPct: 5,
      phSharePct: 50,
      singleMixPct: 30,
      pass7dMixPct: 50,
      pass30dMixPct: 20,
    });
    const highProj = computeRevenueProjection({
      dailyVisitors: 3000,
      studioStartRatePct: 55,
      paywallReachPct: 35,
      paywallToPaidPct: 5,
      phSharePct: 50,
      singleMixPct: 30,
      pass7dMixPct: 50,
      pass30dMixPct: 20,
    });
    assert.equal(lowProj.monthlyVisitors, 9000);
    assert.ok(highProj.monthlyCombinedNetUsd > lowProj.monthlyCombinedNetUsd * 9);
    assert.equal(highProj.annualNetUsd, Math.round(highProj.monthlyCombinedNetUsd * 12));
  });

  it('resolves indexable SEO routes (/studio, /garland) without colliding with shared bouquet short codes', () => {
    assert.equal(detectInitialSeoRoute('/'), 'landing');
    assert.equal(detectInitialSeoRoute('/studio'), 'studio');
    assert.equal(detectInitialSeoRoute('/garland'), 'garland');
    assert.equal(detectInitialSeoRoute('/creations'), 'garland');
    assert.equal(extractGarlandQueryParam('?q=Sophia'), 'Sophia');

    // Reserved SEO routes must never be mistaken for 7-20 char bouquet short codes
    assert.equal(getShortCodeFromPathname('/garland'), null);
    assert.equal(getShortCodeFromPathname('/creations'), null);
    assert.equal(getShortCodeFromPathname('/showcase'), null);
    assert.equal(getShortCodeFromPathname('/Vu18KSuusq9133s'), 'Vu18KSuusq9133s');
  });
});

describe('Admin-Only Gemini Analytics Advisor Security & Quota Protection', () => {
  it('strictly strips/excludes sensitive keys, emails, and raw event logs from AI snapshots', () => {
    const summary = createInitialAnalyticsSummary(1_760_000_000_000);
    summary.webVisits = 250;
    summary.revenueUsdCents = 899;
    summary.paywallTriggers = {
      'user@example.com': 2,
      'BLOOM-ABCD-EFGH': 3,
      couture_peony: 14,
    };

    const injectedWithSensitive = {
      ...summary,
      paidPasses: [{ passKey: 'BLOOM-9999-SECRET', label: 'secret@buyer.com' }],
      testerVouchers: [{ passKey: 'BLOOM-TV11-SECRET' }],
      recentEvents: [{ summary: 'secret@buyer.com redeemed BLOOM-8888-AAAA' }],
    };

    const sanitized = sanitizeAnalyticsForAi(injectedWithSensitive);
    const json = JSON.stringify(sanitized);
    assert.equal(json.includes('BLOOM-'), false);
    assert.equal(json.includes('secret@buyer.com'), false);
    assert.equal(json.includes('user@example.com'), false);
    assert.equal(json.includes('"recentEvents"'), false);
    assert.equal(json.includes('"paidPasses"'), false);
    assert.equal(json.includes('"testerVouchers"'), false);
    assert.equal('paidPasses' in sanitized, false);
    assert.equal('testerVouchers' in sanitized, false);
    assert.equal('recentEvents' in sanitized, false);
    assert.equal(sanitized.funnel.webVisits, 250);
    assert.equal(sanitized.topStyles.paywallTriggers[0]?.name, 'couture_peony');
  });

  it('caches identical snapshot responses for 5m, handles missing key, and enforces cooldown/rate limits', async () => {
    resetOwnerAiStateForTests();
    const summary = createInitialAnalyticsSummary(1_760_000_000_000);
    summary.webVisits = 500;
    summary.paywallOpens = 120;
    summary.passesIssued.pass_7d = 8;

    // 1. Missing API key returns clear 503
    const missingRes = await runOwnerAnalyticsAi({
      analytics: summary,
      mode: 'overview',
      apiKeyOverride: '',
      adminKey: 'admin_test_1',
      nowMs: 1_760_000_000_000,
    });
    assert.equal(missingRes.ok, false);
    assert.equal(missingRes.statusCode, 503);
    assert.equal(missingRes.code, 'AI_NOT_CONFIGURED');

    // 2. Live call invokes Gemini once and caches for repeated identical request
    let liveCallCount = 0;
    const mockClientFactory = () => ({
      models: {
        generateContent: async () => {
          liveCallCount += 1;
          return { text: 'Paywall conversion is 6.7%; focusing on 7-Day Pass upsell maximizes net margin.' };
        },
      },
    });

    const first = await runOwnerAnalyticsAi({
      analytics: summary,
      mode: 'overview',
      apiKeyOverride: 'fake_test_key',
      adminKey: 'admin_test_1',
      nowMs: 1_760_000_000_000,
      clientFactory: mockClientFactory,
    });
    assert.equal(first.ok, true);
    assert.equal(first.cached, false);
    assert.equal(liveCallCount, 1);

    const second = await runOwnerAnalyticsAi({
      analytics: summary,
      mode: 'overview',
      apiKeyOverride: 'fake_test_key',
      adminKey: 'admin_test_1',
      nowMs: 1_760_000_060_000, // 60s later -> within 5m TTL
      clientFactory: mockClientFactory,
    });
    assert.equal(second.ok, true);
    assert.equal(second.cached, true);
    assert.equal(liveCallCount, 1);

    // 3. Upstream 429 error engages 45s automatic cooldown
    resetOwnerAiStateForTests();
    let quotaCalls = 0;
    const quotaFailFactory = () => ({
      models: {
        generateContent: async () => {
          quotaCalls += 1;
          const err = new Error('RESOURCE_EXHAUSTED 429') as Error & { status?: number };
          err.status = 429;
          throw err;
        },
      },
    });

    const hit429 = await runOwnerAnalyticsAi({
      analytics: summary,
      mode: 'question',
      question: 'Why did revenue change?',
      apiKeyOverride: 'fake_test_key',
      adminKey: 'admin_test_2',
      nowMs: 1_760_000_100_000,
      clientFactory: quotaFailFactory,
    });
    assert.equal(hit429.ok, false);
    assert.equal(hit429.statusCode, 429);
    assert.equal(quotaCalls, 1);

    const duringCooldown = await runOwnerAnalyticsAi({
      analytics: summary,
      mode: 'question',
      question: 'Try again immediately?',
      apiKeyOverride: 'fake_test_key',
      adminKey: 'admin_test_2',
      nowMs: 1_760_000_110_000, // 10s later -> still in 45s cooldown
      clientFactory: quotaFailFactory,
    });
    assert.equal(duringCooldown.ok, false);
    assert.equal(duringCooldown.code, 'QUOTA_COOLDOWN');
    assert.equal(quotaCalls, 1); // Did NOT hammer Gemini

    // 4. Anti-abuse burst cooldown (2.5s min gap) + sliding window rate limit (6 live calls per 60s)
    resetOwnerAiStateForTests();
    const firstBurst = await runOwnerAnalyticsAi({
      analytics: summary,
      mode: 'question',
      question: 'Unique question #1',
      apiKeyOverride: 'fake_test_key',
      adminKey: 'admin_burst_tester',
      nowMs: 1_760_000_200_000,
      clientFactory: mockClientFactory,
    });
    assert.equal(firstBurst.ok, true);

    const rapidSpam = await runOwnerAnalyticsAi({
      analytics: summary,
      mode: 'question',
      question: 'Rapid spam 100ms later',
      apiKeyOverride: 'fake_test_key',
      adminKey: 'admin_burst_tester',
      nowMs: 1_760_000_200_100,
      clientFactory: mockClientFactory,
    });
    assert.equal(rapidSpam.ok, false);
    assert.equal(rapidSpam.code, 'RATE_LIMITED');
    assert.equal(rapidSpam.statusCode, 429);

    for (let i = 2; i <= 6; i++) {
      const okCall = await runOwnerAnalyticsAi({
        analytics: summary,
        mode: 'question',
        question: `Unique question #${i}`,
        apiKeyOverride: 'fake_test_key',
        adminKey: 'admin_burst_tester',
        nowMs: 1_760_000_200_000 + i * 3500,
        clientFactory: mockClientFactory,
      });
      assert.equal(okCall.ok, true);
    }
    const seventh = await runOwnerAnalyticsAi({
      analytics: summary,
      mode: 'question',
      question: 'Unique question #7',
      apiKeyOverride: 'fake_test_key',
      adminKey: 'admin_burst_tester',
      nowMs: 1_760_000_230_000,
      clientFactory: mockClientFactory,
    });
    assert.equal(seventh.ok, false);
    assert.equal(seventh.code, 'RATE_LIMITED');
    assert.equal(seventh.statusCode, 429);
  });

  it('seamlessly falls back to the next Gemini model when the primary model throws 404 NOT_FOUND', async () => {
    resetOwnerAiStateForTests();
    const summary = createInitialAnalyticsSummary(1_760_000_000_000);
    summary.webVisits = 320;
    summary.bouquetsCreated = 95;

    const attemptedModels: string[] = [];
    let sawThinkingConfig = false;

    const fallbackClientFactory = () => ({
      models: {
        generateContent: async (params: { model: string; config?: Record<string, unknown> }) => {
          attemptedModels.push(params.model);
          if (params.config && 'thinkingConfig' in params.config) {
            sawThinkingConfig = true;
          }
          if (attemptedModels.length === 1) {
            const err = new Error('models/not-found is not found for API version v1beta (NOT_FOUND)') as Error & {
              status?: number;
            };
            err.status = 404;
            throw err;
          }
          return { text: 'Fallback model succeeded with grounded analytics summary.' };
        },
      },
    });

    const result = await runOwnerAnalyticsAi({
      analytics: summary,
      mode: 'overview',
      apiKeyOverride: 'fake_test_key',
      adminKey: 'admin_fallback_tester',
      nowMs: 1_760_000_300_000,
      clientFactory: fallbackClientFactory,
    });

    assert.equal(result.ok, true);
    assert.equal(result.statusCode, 200);
    assert.equal(result.answer, 'Fallback model succeeded with grounded analytics summary.');
    assert.equal(attemptedModels.length, 2);
    assert.notEqual(attemptedModels[0], attemptedModels[1]);
    assert.equal(sawThinkingConfig, false);
  });

  it('builds Gemini 4 / 3 / 2.5 request configs without deprecated temperature or starved maxOutputTokens', () => {
    const g4 = buildGeminiRequestConfig('gemini-4-hydrogen', 'Analyst prompt');
    assert.equal(g4.systemInstruction, 'Analyst prompt');
    assert.equal('temperature' in g4, false);
    assert.equal('maxOutputTokens' in g4, false);
    assert.equal(g4.thinkingConfig?.thinkingLevel, 'LOW');

    const g3Lite = buildGeminiRequestConfig('gemini-3.1-flash-lite', 'Analyst prompt');
    assert.equal('temperature' in g3Lite, false);
    assert.equal(g3Lite.thinkingConfig?.thinkingLevel, 'MINIMAL');

    const g25 = buildGeminiRequestConfig('gemini-2.5-flash', 'Analyst prompt');
    assert.equal('temperature' in g25, false);
    assert.equal(g25.thinkingConfig?.thinkingBudget, 0);

    const unknown = buildGeminiRequestConfig('gemini-custom-preview', 'Analyst prompt');
    assert.equal(unknown.systemInstruction, 'Analyst prompt');
    assert.equal('thinkingConfig' in unknown, false);
  });

  it('caches 404 unavailable models and prioritizes the sticky working model on subsequent calls', async () => {
    resetOwnerAiStateForTests();
    const summary = createInitialAnalyticsSummary(1_760_000_000_000);
    summary.webVisits = 410;

    const callLog: string[] = [];
    const clientFactory = () => ({
      models: {
        generateContent: async (params: { model: string }) => {
          callLog.push(params.model);
          if (params.model === 'gemini-3.1-flash-lite') {
            const err = new Error('404 NOT_FOUND') as Error & { status?: number };
            err.status = 404;
            throw err;
          }
          return { text: `Answered via ${params.model}` };
        },
      },
    });

    const first = await runOwnerAnalyticsAi({
      analytics: summary,
      mode: 'question',
      question: 'First analytics check',
      apiKeyOverride: 'fake_test_key',
      adminKey: 'admin_sticky_test',
      nowMs: 1_760_000_400_000,
      clientFactory,
    });
    assert.equal(first.ok, true);
    assert.deepEqual(callLog, ['gemini-3.1-flash-lite', 'gemini-4-hydrogen']);

    // Second unique question 5s later should skip the 404 model and call the working model directly
    const second = await runOwnerAnalyticsAi({
      analytics: summary,
      mode: 'question',
      question: 'Second analytics check',
      apiKeyOverride: 'fake_test_key',
      adminKey: 'admin_sticky_test',
      nowMs: 1_760_000_405_000,
      clientFactory,
    });
    assert.equal(second.ok, true);
    assert.deepEqual(callLog, [
      'gemini-3.1-flash-lite',
      'gemini-4-hydrogen',
      'gemini-4-hydrogen',
    ]);
  });

  it('discovers live flash text models via models.list() when all static defaults return 404', async () => {
    resetOwnerAiStateForTests();
    const summary = createInitialAnalyticsSummary(1_760_000_000_000);
    summary.webVisits = 600;

    const filtered = selectDiscoveredFlashModels([
      { name: 'models/gemini-2.0-flash', supportedActions: ['generateContent'] },
      { name: 'models/gemini-embedding-2', supportedActions: ['embedContent'] },
      { name: 'models/gemini-3.8-flash-tts', supportedActions: ['generateContent'] },
      { name: 'models/gemini-3-flash-preview', supportedActions: ['generateContent'] },
      { name: 'models/gemini-2.5-pro', supportedActions: ['generateContent'] },
    ]);
    assert.deepEqual(filtered, ['gemini-3-flash-preview', 'gemini-2.5-pro']);

    const attempted: string[] = [];
    let listedCount = 0;
    const discoverFactory = () => ({
      models: {
        list: async () => {
          listedCount += 1;
          return [
            { name: 'models/gemini-2.0-flash', supportedActions: ['generateContent'] },
            { name: 'models/gemini-3-flash-preview', supportedActions: ['generateContent'] },
          ];
        },
        generateContent: async (params: { model: string }) => {
          attempted.push(params.model);
          if (params.model === 'gemini-3-flash-preview') {
            return { text: 'Self-healed via dynamically discovered Gemini 3 Flash model.' };
          }
          const err = new Error('models/not-found is not found (404)') as Error & { status?: number };
          err.status = 404;
          throw err;
        },
      },
    });

    const result = await runOwnerAnalyticsAi({
      analytics: summary,
      mode: 'overview',
      apiKeyOverride: 'fake_test_key',
      adminKey: 'admin_discover_test',
      nowMs: 1_760_000_500_000,
      clientFactory: discoverFactory,
    });
    assert.equal(result.ok, true);
    assert.equal(result.statusCode, 200);
    assert.equal(result.modelUsed, 'gemini-3-flash-preview');
    assert.equal(listedCount, 1);
    assert.equal(attempted.includes('gemini-3-flash-preview'), true);
  });

  it('preserves 503 AI_OVERLOADED instead of masking it behind a later 404 NOT_FOUND', async () => {
    resetOwnerAiStateForTests();
    const summary = createInitialAnalyticsSummary(1_760_000_000_000);
    summary.webVisits = 210;

    let busyAttempts = 0;
    const overloadedFactory = () => ({
      models: {
        generateContent: async (params: { model: string }) => {
          if (params.model === 'gemini-4-hydrogen') {
            busyAttempts += 1;
            const err = new Error('The model is overloaded. Please try again later. (503 UNAVAILABLE)') as Error & {
              status?: number;
            };
            err.status = 503;
            throw err;
          }
          const err = new Error('Model not found (404 NOT_FOUND)') as Error & { status?: number };
          err.status = 404;
          throw err;
        },
      },
    });

    const result = await runOwnerAnalyticsAi({
      analytics: summary,
      mode: 'question',
      question: 'Overview of initial deployment improvement',
      apiKeyOverride: 'fake_test_key',
      adminKey: 'admin_503_test',
      nowMs: 1_760_000_600_000,
      clientFactory: overloadedFactory,
    });
    assert.equal(result.ok, false);
    assert.equal(result.statusCode, 503);
    assert.equal(result.code, 'AI_OVERLOADED');
    assert.equal(busyAttempts, 2); // Initial attempt + 1 backoff retry
  });
});

describe('Owner Keys & Passes Classification and Filtering Helpers', () => {
  const nowMs = Date.parse('2026-11-16T02:00:00.000Z');
  const futureIso = '2026-11-23T02:00:00.000Z';
  const pastIso = '2026-11-10T02:00:00.000Z';

  const paidFixtures: PaidPassLedgerItem[] = [
    {
      passKey: 'BLOOM-DVW3-7KSZ',
      label: 'Atelier VIP Client',
      tier: 'pass_7d',
      region: 'PH',
      channel: 'manual_gcash',
      amountMinor: 9900,
      currency: 'PHP',
      retentionDays: 90,
      isEternalKeepsake: false,
      createdAt: '2026-11-16T00:20:55.950Z',
      expiresAt: futureIso,
      status: 'unclaimed',
      claimedDeviceHash: '',
      secondaryDeviceHash: null,
      bouquetsCreated: 0,
      blockedAttempts: 0,
    },
    {
      passKey: 'BLOOM-MM32-AFBX',
      label: 'Ko-fi Launch Free',
      tier: 'single',
      region: 'INTL',
      channel: 'kofi',
      amountMinor: 0,
      currency: 'USD',
      retentionDays: 90,
      isEternalKeepsake: false,
      createdAt: '2026-11-15T22:26:02.176Z',
      expiresAt: futureIso,
      status: 'claimed',
      claimedDeviceHash: 'bf39a229bd25fb9cea2400f0094f7c64',
      secondaryDeviceHash: null,
      bouquetsCreated: 0,
      blockedAttempts: 0,
      isFreePromo: true,
    },
    {
      passKey: 'BLOOM-2DEV-PASS',
      label: 'Clara Dual Device',
      tier: 'pass_30d',
      region: 'INTL',
      channel: 'kofi',
      amountMinor: 699,
      currency: 'USD',
      retentionDays: 36500,
      isEternalKeepsake: true,
      createdAt: '2026-11-15T10:00:00.000Z',
      expiresAt: futureIso,
      status: 'claimed',
      claimedDeviceHash: 'dev_primary_clara',
      secondaryDeviceHash: 'dev_secondary_clara',
      bouquetsCreated: 3,
      blockedAttempts: 0,
    },
    {
      passKey: 'BLOOM-USED-SING',
      label: 'Mateo Single Gift',
      tier: 'single',
      region: 'PH',
      channel: 'sikatpay',
      amountMinor: 4900,
      currency: 'PHP',
      retentionDays: 90,
      isEternalKeepsake: false,
      createdAt: '2026-11-14T10:00:00.000Z',
      expiresAt: pastIso,
      status: 'claimed',
      claimedDeviceHash: 'dev_mateo',
      secondaryDeviceHash: 'SINGLE_CONSUMED',
      boundBouquetCode: 'Mat3oBqt99',
      bouquetsCreated: 1,
      blockedAttempts: 0,
    },
    {
      passKey: 'BLOOM-EXPD-7DAY',
      label: 'Expired Buyer',
      tier: 'pass_7d',
      region: 'INTL',
      channel: 'kofi',
      amountMinor: 399,
      currency: 'USD',
      retentionDays: 90,
      isEternalKeepsake: false,
      createdAt: '2026-11-01T00:00:00.000Z',
      expiresAt: pastIso,
      status: 'claimed',
      claimedDeviceHash: 'dev_exp',
      secondaryDeviceHash: null,
      bouquetsCreated: 2,
      blockedAttempts: 0,
    },
    {
      passKey: 'BLOOM-REVK-KEY1',
      label: 'Revoked Test Buyer',
      tier: 'pass_7d',
      region: 'PH',
      channel: 'manual_maya',
      amountMinor: 9900,
      currency: 'PHP',
      retentionDays: 90,
      isEternalKeepsake: false,
      createdAt: '2026-11-15T00:00:00.000Z',
      expiresAt: pastIso,
      status: 'revoked',
      claimedDeviceHash: '',
      secondaryDeviceHash: 'REVOKED_BY_OWNER',
      bouquetsCreated: 0,
      blockedAttempts: 0,
    },
  ];

  const testerFixtures: TesterVoucherLedgerItem[] = [
    {
      passKey: 'BLOOM-TST1-UNCL',
      label: 'Sophia',
      tier: 'pass_7d',
      durationHours: 48,
      retentionDays: 30,
      dailyCap: 10,
      createdAt: '2026-11-15T12:00:00.000Z',
      expiresAt: futureIso,
      status: 'unclaimed',
      claimedDeviceHash: '',
      bouquetsCreated: 0,
      blockedAttempts: 0,
    },
    {
      passKey: 'BLOOM-TST2-BNDD',
      label: 'Liam QA',
      tier: 'pass_7d',
      durationHours: 72,
      retentionDays: 90,
      dailyCap: 20,
      createdAt: '2026-11-15T12:00:00.000Z',
      expiresAt: futureIso,
      status: 'claimed',
      claimedDeviceHash: 'dev_liam_1',
      secondaryDeviceHash: 'TESTER_SINGLE_DEVICE_LOCK',
      bouquetsCreated: 2,
      blockedAttempts: 1,
    },
    {
      passKey: 'BLOOM-TST3-EXPD',
      label: 'Old Invite',
      tier: 'pass_7d',
      durationHours: 24,
      retentionDays: 30,
      dailyCap: 5,
      createdAt: '2026-11-08T12:00:00.000Z',
      expiresAt: pastIso,
      status: 'claimed',
      claimedDeviceHash: 'dev_old',
      bouquetsCreated: 1,
      blockedAttempts: 0,
    },
    {
      passKey: 'BLOOM-TST4-REVK',
      label: 'Cancelled Invite',
      tier: 'pass_7d',
      durationHours: 48,
      retentionDays: 30,
      dailyCap: 10,
      createdAt: '2026-11-15T12:00:00.000Z',
      expiresAt: futureIso,
      status: 'revoked',
      claimedDeviceHash: '',
      secondaryDeviceHash: 'REVOKED_BY_OWNER',
      bouquetsCreated: 0,
      blockedAttempts: 0,
    },
  ];

  it('classifies paid keys across unclaimed, bound (1/2 and 2/2), consumed, expired, and revoked', () => {
    assert.equal(classifyPaidPassFilterStatus(paidFixtures[0], nowMs), 'unclaimed');
    assert.equal(classifyPaidPassFilterStatus(paidFixtures[1], nowMs), 'bound');
    assert.equal(classifyPaidPassFilterStatus(paidFixtures[2], nowMs), 'bound');
    assert.equal(classifyPaidPassFilterStatus(paidFixtures[3], nowMs), 'consumed');
    assert.equal(classifyPaidPassFilterStatus(paidFixtures[4], nowMs), 'expired');
    assert.equal(classifyPaidPassFilterStatus(paidFixtures[5], nowMs), 'revoked');

    assert.equal(getPaidPassDeviceBindingCount(paidFixtures[0]), 0);
    assert.equal(getPaidPassDeviceBindingCount(paidFixtures[1]), 1);
    assert.equal(getPaidPassDeviceBindingCount(paidFixtures[2]), 2);
    assert.equal(getPaidPassDeviceBindingCount(paidFixtures[3]), 1); // SINGLE_CONSUMED sentinel ignored

    const counts = countPaidPassStatuses(paidFixtures, nowMs);
    assert.deepEqual(counts, {
      all: 6,
      unclaimed: 1,
      bound: 2,
      consumed: 1,
      expired: 1,
      revoked: 1,
    });
  });

  it('filters paid keys by status and search query (key, hyphenless key, bouquet code, launch promo)', () => {
    assert.deepEqual(
      filterPaidPasses(paidFixtures, { status: 'bound', nowMs }).map((p) => p.passKey),
      ['BLOOM-MM32-AFBX', 'BLOOM-2DEV-PASS']
    );
    assert.deepEqual(
      filterPaidPasses(paidFixtures, { status: 'consumed', nowMs }).map((p) => p.passKey),
      ['BLOOM-USED-SING']
    );
    // Hyphen-insensitive passKey search
    assert.deepEqual(
      filterPaidPasses(paidFixtures, { search: 'dvw37ksz', nowMs }).map((p) => p.passKey),
      ['BLOOM-DVW3-7KSZ']
    );
    // Bouquet short code search
    assert.deepEqual(
      filterPaidPasses(paidFixtures, { search: 'Mat3oBqt99', nowMs }).map((p) => p.passKey),
      ['BLOOM-USED-SING']
    );
    // Free Launch search
    assert.deepEqual(
      filterPaidPasses(paidFixtures, { search: 'launch', nowMs }).map((p) => p.passKey),
      ['BLOOM-MM32-AFBX']
    );
  });

  it('classifies and filters tester keys by unclaimed, bound, expired, revoked, and label/key', () => {
    assert.equal(classifyTesterVoucherFilterStatus(testerFixtures[0], nowMs), 'unclaimed');
    assert.equal(classifyTesterVoucherFilterStatus(testerFixtures[1], nowMs), 'bound');
    assert.equal(classifyTesterVoucherFilterStatus(testerFixtures[2], nowMs), 'expired');
    assert.equal(classifyTesterVoucherFilterStatus(testerFixtures[3], nowMs), 'revoked');

    assert.deepEqual(countTesterVoucherStatuses(testerFixtures, nowMs), {
      all: 4,
      unclaimed: 1,
      bound: 1,
      expired: 1,
      revoked: 1,
    });

    assert.deepEqual(
      filterTesterVouchers(testerFixtures, { status: 'bound', search: 'liam', nowMs }).map(
        (v) => v.passKey
      ),
      ['BLOOM-TST2-BNDD']
    );
  });
});

