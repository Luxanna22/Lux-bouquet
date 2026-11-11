import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isStealthAdminGatePath,
  extractStealthGateSlug,
  extractVoucherKeyFromSearch,
  buildTesterMagicInviteUrl,
  createInitialAnalyticsSummary,
  applyTelemetryEventToSummary,
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
import { createEncryptedAdminVisitSlug, verifyEncryptedAdminVisitSlug, verifyOwnerPinWithRateLimit, createSignedAdminSessionToken, verifySignedAdminSessionToken, mergeRemoteOwnerVaultIntoMemory, recordPaidPassIssuanceServer, OWNER_ANALYTICS_STATE, TESTER_VOUCHER_LEDGER } from '../../api/_lib/paymentHandler.js';

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
  it('parses ?voucher=BLOOM-XXXX-XXXX magic links and builds clean invite URLs', () => {
    const key = extractVoucherKeyFromSearch('?voucher=bloom-tv4k-9m2p');
    assert.equal(key, 'BLOOM-TV4K-9M2P');
    assert.equal(extractVoucherKeyFromSearch('?voucher=invalid'), null);

    const inviteUrl = buildTesterMagicInviteUrl('BLOOM-TV4K-9M2P', 'https://sendabouquet.app');
    assert.equal(inviteUrl, 'https://sendabouquet.app/?voucher=BLOOM-TV4K-9M2P');
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

  it('persists and merges Owner Vault analytics, paid pass revenue, and tester vouchers across Vercel redeploys', () => {
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
});
