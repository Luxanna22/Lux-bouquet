import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSignedStudioPass,
  detectPricingRegion,
  getPricingCatalog,
  getRetentionPolicyForPassTier,
  inspectBouquetPremiumUsage,
  isValidPassKeyFormat,
  normalizePassKey,
  validateAndBindPassRedemption,
  verifyActiveStudioPassForAction,
  verifyPassIntegritySignature,
} from './monetization';

const FIXED_NOW = Date.parse('2026-11-09T12:00:00.000Z');

test('inspectBouquetPremiumUsage distinguishes free classic bouquets from couture arrangements', () => {
  const freeSnapshot = {
    items: [
      {
        id: '1',
        type: 'rose' as const,
        x: 300,
        y: 250,
        scale: 1,
        rotation: 0,
        flipX: false,
        petalColor: '#f43f5e',
        centerColor: '#be123c',
      },
      {
        id: '2',
        type: 'tulip' as const,
        x: 280,
        y: 260,
        scale: 1,
        rotation: -10,
        flipX: false,
        petalColor: '#fb7185',
        centerColor: '#fef08a',
      },
    ],
    wrapStyle: 'kraft' as const,
    ribbonStyle: 'satin' as const,
    voice: {
      visibleOnStage: false,
      style: 'mixtape' as const,
      title: 'Side A',
      primaryColor: '#F472B6',
      accentColor: '#FFF1F2',
      audioDataUrl: null,
      durationSec: 0,
    },
    lock: { mode: 'none' as const },
  };

  const freeInspection = inspectBouquetPremiumUsage(freeSnapshot);
  assert.equal(freeInspection.isPremiumBouquet, false);
  assert.equal(freeInspection.reasons.length, 0);

  const coutureSnapshot = {
    ...freeSnapshot,
    items: [
      ...freeSnapshot.items,
      {
        id: '3',
        type: 'peony' as const,
        x: 310,
        y: 240,
        scale: 1,
        rotation: 8,
        flipX: false,
        petalColor: '#f472b6',
        centerColor: '#fef08a',
      },
    ],
    wrapStyle: 'cloche' as const,
    ribbonStyle: 'goldchain' as const,
    voice: {
      ...freeSnapshot.voice,
      visibleOnStage: true,
      audioDataUrl: 'data:audio/webm;base64,AAAA',
      durationSec: 12,
    },
    lock: {
      mode: 'passcode' as const,
      questionPrompt: 'When did we meet?',
      passcodeAnswer: 'October',
    },
  };

  const coutureInspection = inspectBouquetPremiumUsage(coutureSnapshot);
  assert.equal(coutureInspection.isPremiumBouquet, true);
  assert.equal(coutureInspection.hasCoutureWrap, true);
  assert.equal(coutureInspection.hasCoutureRibbon, true);
  assert.equal(coutureInspection.hasVoiceKeepsake, true);
  assert.equal(coutureInspection.hasSecretOrDateLock, true);
  assert.deepEqual(coutureInspection.premiumFlowerTypes, ['peony']);
});

test('PPP region detection and pricing catalog return accurate PH (PHP) and INTL (USD) tiers', () => {
  assert.equal(detectPricingRegion('Asia/Manila', 'en-US'), 'PH');
  assert.equal(detectPricingRegion('America/New_York', 'en-PH'), 'PH');
  assert.equal(detectPricingRegion('America/New_York', 'en-US'), 'INTL');

  const phCatalog = getPricingCatalog('PH');
  assert.equal(phCatalog.length, 3);
  assert.equal(phCatalog[0].displayPrice, '₱49');
  assert.equal(phCatalog[0].retentionDays, 90);
  assert.equal(phCatalog[0].isEternalKeepsake, false);
  assert.equal(phCatalog[1].displayPrice, '₱99');
  assert.equal(phCatalog[1].retentionDays, 90);
  assert.equal(phCatalog[2].displayPrice, '₱199');
  assert.equal(phCatalog[2].isEternalKeepsake, true);

  const intlCatalog = getPricingCatalog('INTL');
  assert.equal(intlCatalog[0].displayPrice, '$2.99');
  assert.equal(intlCatalog[1].displayPrice, '$4.99');
  assert.equal(intlCatalog[2].displayPrice, '$8.99');

  // Verify 3-tier retention policy
  assert.equal(getRetentionPolicyForPassTier('free').retentionDays, 30);
  assert.equal(getRetentionPolicyForPassTier('single').retentionDays, 90);
  assert.equal(getRetentionPolicyForPassTier('pass_7d').retentionDays, 90);
  assert.equal(getRetentionPolicyForPassTier('pass_30d').isPremiumEternal, true);
});

test('Single-User Pass Key security prevents tampering, blocks 3rd-device sharing, and rotates activeSessionNonce', () => {
  const device1 = 'dev_hash_owner_phone_1111';
  const device2 = 'dev_hash_owner_laptop_2222';
  const device3 = 'dev_hash_leaked_stranger_3333';

  const pass = createSignedStudioPass({
    tier: 'pass_7d',
    region: 'PH',
    deviceTokenHash: device1,
    nowMs: FIXED_NOW,
  });

  assert.equal(isValidPassKeyFormat(pass.passKey), true);
  assert.equal(normalizePassKey(pass.passKey.toLowerCase().replace(/-/g, '')), pass.passKey);
  assert.equal(verifyPassIntegritySignature(pass), true);

  // Tampering with tier or expiresAt in localStorage must fail signature verification
  const tamperedPass = { ...pass, tier: 'pass_30d' as const };
  assert.equal(verifyPassIntegritySignature(tamperedPass), false);
  const tamperedCheck = verifyActiveStudioPassForAction({
    pass: tamperedPass,
    deviceTokenHash: device1,
    nowMs: FIXED_NOW,
  });
  assert.equal(tamperedCheck.valid, false);
  assert.equal(tamperedCheck.status, 'TAMPERED_SIGNATURE');

  // Redeeming on Device 2 (owner's laptop) succeeds as the 1 allowed device transfer
  // and rotates activeSessionNonce so Device 1's old session nonce is superseded
  const oldSessionNonce = pass.activeSessionNonce;
  const redeem2 = validateAndBindPassRedemption(pass, device2, FIXED_NOW + 1000);
  assert.equal(redeem2.valid, true);
  assert.ok(redeem2.updatedPass);
  assert.equal(redeem2.updatedPass.primaryDeviceHash, device1);
  assert.equal(redeem2.updatedPass.secondaryDeviceHash, device2);
  assert.notEqual(redeem2.updatedPass.activeSessionNonce, oldSessionNonce);

  // Old session nonce on Device 1 is now superseded (only 1 active session allowed at a time)
  const supersededCheck = verifyActiveStudioPassForAction({
    pass: redeem2.updatedPass,
    deviceTokenHash: device1,
    clientSessionNonce: oldSessionNonce,
    nowMs: FIXED_NOW + 2000,
  });
  assert.equal(supersededCheck.valid, false);
  assert.equal(supersededCheck.status, 'SESSION_SUPERSEDED');

  // Redeeming on a 3rd distinct device (stranger) is blocked with DEVICE_LIMIT_EXCEEDED
  const redeem3 = validateAndBindPassRedemption(redeem2.updatedPass, device3, FIXED_NOW + 3000);
  assert.equal(redeem3.valid, false);
  assert.equal(redeem3.status, 'DEVICE_LIMIT_EXCEEDED');
});

test('Single-Bouquet Unlock binds strictly to its bouquet code and cannot unlock a different bouquet', () => {
  const device1 = 'dev_hash_single_buyer_001';
  const singlePass = createSignedStudioPass({
    tier: 'single',
    region: 'PH',
    deviceTokenHash: device1,
    boundBouquetCode: 'bq_first123',
    nowMs: FIXED_NOW,
  });

  const allowedOnFirst = verifyActiveStudioPassForAction({
    pass: singlePass,
    deviceTokenHash: device1,
    bouquetCode: 'bq_first123',
    nowMs: FIXED_NOW,
  });
  assert.equal(allowedOnFirst.valid, true);

  const blockedOnSecond = verifyActiveStudioPassForAction({
    pass: singlePass,
    deviceTokenHash: device1,
    bouquetCode: 'bq_second999',
    nowMs: FIXED_NOW,
  });
  assert.equal(blockedOnSecond.valid, false);
  assert.equal(blockedOnSecond.status, 'SINGLE_BOUQUET_ALREADY_USED');
});
