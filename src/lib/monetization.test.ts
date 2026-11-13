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
        type: 'callalily' as const,
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
  assert.deepEqual(coutureInspection.premiumFlowerTypes, ['callalily']);

  // Verify all photos, all visible voices (even before recording), extended card notes (> 560 chars),
  // and new luxury flowers, fillers, ribbons, and backgrounds trigger Couture inspection
  const luxurySnapshot = {
    ...freeSnapshot,
    items: [
      ...freeSnapshot.items,
      {
        id: 'lux-1',
        type: 'celestialRose' as const,
        x: 295,
        y: 230,
        scale: 1,
        rotation: 0,
        flipX: false,
        petalColor: '#FFFBF0',
        centerColor: '#F59E0B',
      },
      {
        id: 'lux-2',
        type: 'gildedFern' as const,
        x: 315,
        y: 245,
        scale: 1,
        rotation: 12,
        flipX: false,
        petalColor: '#FDE68A',
        centerColor: '#D97706',
      },
      {
        id: 'photo-1',
        type: 'rose' as const,
        x: 220,
        y: 440,
        scale: 1,
        rotation: -6,
        flipX: false,
        petalColor: '#FFFDF9',
        centerColor: '#E11D48',
        photoStyle: 'raw' as const,
        photoDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
      },
    ],
    ribbonStyle: 'pearlStrand' as const,
    environment: 'aurora' as const,
    card: {
      to: 'My Love',
      from: 'Yours',
      message:
        'Every petal in this gilded arrangement carries a memory of our favorite evenings together under the stars. '.repeat(6),
      visibleOnStage: true,
      theme: 'sealed' as const,
    },
    voice: {
      ...freeSnapshot.voice,
      visibleOnStage: true,
      audioDataUrl: null,
    },
  };

  const luxuryInspection = inspectBouquetPremiumUsage(luxurySnapshot);
  assert.equal(luxuryInspection.isPremiumBouquet, true);
  assert.equal(luxuryInspection.hasPhotoKeepsake, true);
  assert.equal(luxuryInspection.hasVoiceKeepsake, true);
  assert.equal(luxuryInspection.hasLongCardNote, true);
  assert.equal(luxuryInspection.hasCoutureRibbon, true);
  assert.equal(luxuryInspection.hasCoutureEnvironment, true);
  assert.deepEqual(luxuryInspection.premiumFlowerTypes, ['celestialRose', 'gildedFern']);
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

test('Vercel Ko-fi checkout, URL normalization, stateless token, and PASS_SIGNING_SECRET client compatibility', async () => {
  // @ts-expect-error ESM serverless handler
  const paymentLib = await import('../../api/_lib/paymentHandler.js');

  assert.equal(paymentLib.resolveKofiPageUrl('luxinnamon'), 'https://ko-fi.com/luxinnamon');
  assert.equal(paymentLib.resolveKofiPageUrl('ko-fi.com/luxinnamon'), 'https://ko-fi.com/luxinnamon');
  assert.equal(paymentLib.resolveKofiPageUrl('https://ko-fi.com/<your-handle>'), 'https://ko-fi.com/luxinnamon');

  process.env.PASS_SIGNING_SECRET = 'prod_custom_secret_xyz_999';
  process.env.KOFI_VERIFICATION_TOKEN = 'kofi_test_token_123';
  process.env.KOFI_PAGE_URL = 'ko-fi.com/luxinnamon';

  try {
    const serverIssuedPass = paymentLib.createSignedStudioPassServer({
      tier: 'pass_7d',
      region: 'PH',
      deviceTokenHash: 'dev_vercel_test_001',
      paymentProvider: 'kofi',
      paymentReference: 'kofi_tx_001',
    });

    // Must pass client-side verifyPassIntegritySignature even when PASS_SIGNING_SECRET is custom!
    assert.equal(verifyPassIntegritySignature(serverIssuedPass), true);

    const token = paymentLib.createSignedCheckoutToken({
      cid: 'chk_123',
      pk: serverIssuedPass.passKey,
      t: 'pass_7d',
      r: 'PH',
      p: 'kofi',
      d: 'dev_vercel_test_001',
      ts: Date.now(),
    });
    const decoded = paymentLib.verifySignedCheckoutToken(token);
    assert.equal(decoded?.cid, 'chk_123');
    assert.equal(decoded?.pk, serverIssuedPass.passKey);
  } finally {
    delete process.env.PASS_SIGNING_SECRET;
    delete process.env.KOFI_VERIFICATION_TOKEN;
    delete process.env.KOFI_PAGE_URL;
  }
});

test('Ko-fi Shop Order verification strictly requires type "Shop Order", matches direct_link_code to exact tier, and isolates receipts by (email, tier)', async () => {
  // @ts-expect-error ESM serverless handler
  const paymentLib = await import('../../api/_lib/paymentHandler.js');

  const shopConfig = {
    single: '1a2b3c4d5e',
    pass_7d: '7d8e9f0a1b',
    pass_30d: '30d9988776',
  };

  assert.equal(paymentLib.extractKofiShopCode('https://ko-fi.com/s/1a2b3c4d5e?ref=sab'), '1a2b3c4d5e');
  assert.equal(paymentLib.buildKofiShopItemUrl('1a2b3c4d5e', 'https://ko-fi.com/luxinnamon'), 'https://ko-fi.com/s/1a2b3c4d5e');

  // 1. Rejects generic Single Tip ("Donation") and Monthly ("Subscription") webhooks
  const donationResult = paymentLib.resolveKofiShopOrderTier(
    { type: 'Donation', amount: '5.00', email: 'buyer@example.com' },
    shopConfig,
  );
  assert.equal(donationResult.valid, false);
  assert.equal(donationResult.reason, 'NON_SHOP_ORDER_REJECTED');

  const subscriptionResult = paymentLib.resolveKofiShopOrderTier(
    { type: 'Subscription', amount: '10.00', email: 'buyer@example.com' },
    shopConfig,
  );
  assert.equal(subscriptionResult.valid, false);
  assert.equal(subscriptionResult.reason, 'NON_SHOP_ORDER_REJECTED');

  // 2. Rejects Shop Order with unrecognized direct_link_code
  const wrongCodeResult = paymentLib.resolveKofiShopOrderTier(
    {
      type: 'Shop Order',
      email: 'buyer@example.com',
      shop_items: [{ direct_link_code: 'unknown999' }],
    },
    shopConfig,
  );
  assert.equal(wrongCodeResult.valid, false);
  assert.equal(wrongCodeResult.reason, 'UNRECOGNIZED_DIRECT_LINK_CODE');

  // 3. Accepts matching Shop Order for each exact tier
  const singleOrder = paymentLib.resolveKofiShopOrderTier(
    {
      type: 'Shop Order',
      email: 'buyer@example.com',
      shop_items: [{ direct_link_code: '1a2b3c4d5e' }],
    },
    shopConfig,
  );
  assert.equal(singleOrder.valid, true);
  assert.equal(singleOrder.tier, 'single');

  const pass7dOrder = paymentLib.resolveKofiShopOrderTier(
    {
      type: 'Shop Order',
      email: 'buyer@example.com',
      shop_items: [{ direct_link_code: '7d8e9f0a1b' }],
    },
    shopConfig,
  );
  assert.equal(pass7dOrder.valid, true);
  assert.equal(pass7dOrder.tier, 'pass_7d');

  const pass30dOrder = paymentLib.resolveKofiShopOrderTier(
    {
      type: 'Shop Order',
      email: 'buyer@example.com',
      shop_items: [{ direct_link_code: '30d9988776' }],
    },
    shopConfig,
  );
  assert.equal(pass30dOrder.valid, true);
  assert.equal(pass30dOrder.tier, 'pass_30d');

  // 4. Deterministic (email, tier) slot keys are valid BLOOM-KSXX-XXXX keys and strictly distinct per tier & email
  const slotSingle = paymentLib.deriveKofiEmailTierSlotKey('Buyer@Example.com ', 'single');
  const slot7d = paymentLib.deriveKofiEmailTierSlotKey('buyer@example.com', 'pass_7d');
  const slot30d = paymentLib.deriveKofiEmailTierSlotKey('buyer@example.com', 'pass_30d');
  const slotOtherEmail = paymentLib.deriveKofiEmailTierSlotKey('someoneelse@example.com', 'single');

  assert.match(slotSingle, /^BLOOM-KS[A-Z2-9]{2}-[A-Z2-9]{4}$/);
  assert.match(slot7d, /^BLOOM-KS[A-Z2-9]{2}-[A-Z2-9]{4}$/);
  assert.match(slot30d, /^BLOOM-KS[A-Z2-9]{2}-[A-Z2-9]{4}$/);
  assert.notEqual(slotSingle, slot7d);
  assert.notEqual(slot7d, slot30d);
  assert.notEqual(slotSingle, slotOtherEmail);

  // 5. Per-tier test product keys (KOFI_SHOP_TEST_SINGLE_CODE / KOFI_SHOP_TEST_CODE, KOFI_SHOP_TEST_7D_CODE, KOFI_SHOP_TEST_30D_CODE)
  // strictly unlock ONLY their matching tier and NEVER unlock all 3 tiers!
  process.env.KOFI_SHOP_SINGLE_CODE = 'https://ko-fi.com/s/1a2b3c4d5e';
  process.env.KOFI_SHOP_7D_CODE = 'https://ko-fi.com/s/7d8e9f0a1b';
  process.env.KOFI_SHOP_30D_CODE = 'https://ko-fi.com/s/30d9988776';
  process.env.KOFI_SHOP_TEST_CODE = 'https://ko-fi.com/s/free00single';
  process.env.KOFI_SHOP_TEST_7D_CODE = 'https://ko-fi.com/s/free00pass7d';
  process.env.KOFI_SHOP_TEST_30D_CODE = 'https://ko-fi.com/s/free00pass30';

  try {
    const activeCodes = paymentLib.getActiveKofiShopCodes();
    assert.deepEqual(activeCodes.allowedByTier.single, ['1a2b3c4d5e', 'free00single']);
    assert.deepEqual(activeCodes.allowedByTier.pass_7d, ['7d8e9f0a1b', 'free00pass7d']);
    assert.deepEqual(activeCodes.allowedByTier.pass_30d, ['30d9988776', 'free00pass30']);

    // Buying the $0 Single Bouquet Test item unlocks ONLY 'single' (never 'pass_7d' or 'pass_30d')
    const singleTestOrder = paymentLib.resolveKofiShopOrderTier({
      type: 'Shop Order',
      amount: '0.00',
      currency: 'USD',
      email: 'tester@example.com',
      shop_items: [{ direct_link_code: 'free00single' }],
    });
    assert.equal(singleTestOrder.valid, true);
    assert.equal(singleTestOrder.tier, 'single');
    assert.deepEqual(singleTestOrder.matchedTiers, ['single']);
    assert.equal(singleTestOrder.directLinkCode, 'free00single');

    // Buying the $0 7-Day Pass Test item unlocks ONLY 'pass_7d'
    const pass7dTestOrder = paymentLib.resolveKofiShopOrderTier({
      type: 'Shop Order',
      amount: '0.00',
      currency: 'USD',
      email: 'tester@example.com',
      shop_items: [{ direct_link_code: 'free00pass7d' }],
    });
    assert.equal(pass7dTestOrder.valid, true);
    assert.equal(pass7dTestOrder.tier, 'pass_7d');
    assert.deepEqual(pass7dTestOrder.matchedTiers, ['pass_7d']);
    assert.equal(pass7dTestOrder.directLinkCode, 'free00pass7d');

    // Buying the $0 30-Day Eternal Test item unlocks ONLY 'pass_30d'
    const pass30dTestOrder = paymentLib.resolveKofiShopOrderTier({
      type: 'Shop Order',
      amount: '0.00',
      currency: 'USD',
      email: 'tester@example.com',
      shop_items: [{ direct_link_code: 'free00pass30' }],
    });
    assert.equal(pass30dTestOrder.valid, true);
    assert.equal(pass30dTestOrder.tier, 'pass_30d');
    assert.deepEqual(pass30dTestOrder.matchedTiers, ['pass_30d']);
    assert.equal(pass30dTestOrder.directLinkCode, 'free00pass30');

    // Unrecognized $0.00 item code is strictly rejected when shop codes are configured
    const unknownZeroOrder = paymentLib.resolveKofiShopOrderTier({
      type: 'Shop Order',
      amount: '0.00',
      currency: 'USD',
      email: 'tester@example.com',
      shop_items: [{ direct_link_code: 'unlisted00' }],
    });
    assert.equal(unknownZeroOrder.valid, false);
    assert.equal(unknownZeroOrder.reason, 'UNRECOGNIZED_DIRECT_LINK_CODE');
  } finally {
    delete process.env.KOFI_SHOP_SINGLE_CODE;
    delete process.env.KOFI_SHOP_7D_CODE;
    delete process.env.KOFI_SHOP_30D_CODE;
    delete process.env.KOFI_SHOP_TEST_CODE;
    delete process.env.KOFI_SHOP_TEST_7D_CODE;
    delete process.env.KOFI_SHOP_TEST_30D_CODE;
  }
});

test('create-checkout blocks PHP PPP arbitrage when PayMongo is hidden and locks PayMongo PH rails to e-wallets without cards', async () => {
  // @ts-expect-error ESM serverless handler
  const paymentLib = await import('../../api/_lib/paymentHandler.js');
  const { EventEmitter } = await import('node:events');

  // 1. Pure resolution rules
  assert.deepEqual(
    paymentLib.resolveCheckoutRegionAndProvider({
      requestedRegion: 'PH',
      requestedProvider: 'paymongo',
      paymongoSecret: '',
      vercelCountry: 'PH',
    }),
    { region: 'INTL', provider: 'kofi' }
  );
  assert.deepEqual(
    paymentLib.resolveCheckoutRegionAndProvider({
      requestedRegion: 'PH',
      requestedProvider: 'kofi',
      paymongoSecret: 'sk_test_live_123',
      vercelCountry: 'PH',
    }),
    { region: 'INTL', provider: 'kofi' }
  );
  assert.deepEqual(
    paymentLib.resolveCheckoutRegionAndProvider({
      requestedRegion: 'PH',
      requestedProvider: 'paymongo',
      paymongoSecret: 'sk_test_live_123',
      vercelCountry: 'US',
    }),
    { region: 'INTL', provider: 'kofi' }
  );
  assert.deepEqual(
    paymentLib.resolveCheckoutRegionAndProvider({
      requestedRegion: 'PH',
      requestedProvider: 'paymongo',
      paymongoSecret: 'sk_test_live_123',
      vercelCountry: 'PH',
    }),
    { region: 'PH', provider: 'paymongo' }
  );

  const makeReq = (body: Record<string, unknown>, headers: Record<string, string> = {}) => {
    const req = Object.assign(new EventEmitter(), {
      method: 'POST',
      url: '/api/payments/create-checkout',
      headers: { host: 'localhost:3000', ...headers },
      socket: { remoteAddress: '127.0.0.1' },
    });
    process.nextTick(() => {
      req.emit('data', Buffer.from(JSON.stringify(body)));
      req.emit('end');
    });
    return req;
  };

  const makeRes = () => {
    let statusCode = 200;
    const headers: Record<string, string> = {};
    let rawBody = '';
    return {
      get statusCode() {
        return statusCode;
      },
      set statusCode(val: number) {
        statusCode = val;
      },
      setHeader(k: string, v: string) {
        headers[k] = v;
      },
      end(chunk?: string) {
        if (chunk) rawBody += chunk;
      },
      json() {
        return JSON.parse(rawBody);
      },
    };
  };

  // 2. HTTP create-checkout forces INTL USD ($2.99) + Ko-fi when PAYMONGO_SECRET_KEY is absent,
  // even if a tampered client sends { region: 'PH', provider: 'paymongo' }
  const prevPaymongo = process.env.PAYMONGO_SECRET_KEY;
  delete process.env.PAYMONGO_SECRET_KEY;
  try {
    const req = makeReq(
      {
        tier: 'single',
        region: 'PH',
        provider: 'paymongo',
        deviceTokenHash: 'dev_spoof_test_1234',
      },
      { 'x-vercel-ip-country': 'PH' }
    );
    const res = makeRes();
    await paymentLib.handlePaymentEndpoint(req, res, '/api/payments/create-checkout');
    assert.equal(res.statusCode, 200);
    const json = res.json();
    assert.equal(json.ok, true);
    assert.equal(json.provider, 'kofi');
    assert.equal(json.plan.currency, 'USD');
    assert.equal(json.plan.displayPrice, '$2.99');
  } finally {
    if (prevPaymongo !== undefined) process.env.PAYMONGO_SECRET_KEY = prevPaymongo;
  }

  // 3. When PAYMONGO_SECRET_KEY is present for PH, PayMongo session locks payment_method_types
  // strictly to ['qrph', 'gcash', 'paymaya'] (never 'card')
  const originalFetch = globalThis.fetch;
  const paymongoRequests: Array<Record<string, unknown>> = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url.includes('api.paymongo.com/v1/checkout_sessions') && init?.body) {
      paymongoRequests.push(JSON.parse(String(init.body)));
      return new Response(
        JSON.stringify({
          data: {
            id: 'cs_test_ph_only',
            attributes: { checkout_url: 'https://checkout.paymongo.com/cs_test_ph_only' },
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response(JSON.stringify({}), { status: 404 });
  }) as typeof fetch;

  process.env.PAYMONGO_SECRET_KEY = 'sk_test_ph_rails';
  try {
    const req = makeReq(
      {
        tier: 'single',
        region: 'PH',
        provider: 'paymongo',
        deviceTokenHash: 'dev_ph_ewallet_1234',
      },
      { 'x-vercel-ip-country': 'PH' }
    );
    const res = makeRes();
    await paymentLib.handlePaymentEndpoint(req, res, '/api/payments/create-checkout');
    assert.equal(res.statusCode, 200);
    const json = res.json();
    assert.equal(json.provider, 'paymongo');
    assert.equal(json.plan.currency, 'PHP');
    assert.equal(paymongoRequests.length, 1);
    const attrs = (paymongoRequests[0].data as { attributes: { payment_method_types: string[] } })
      .attributes;
    assert.deepEqual(attrs.payment_method_types, ['qrph', 'gcash', 'paymaya']);
    assert.equal(attrs.payment_method_types.includes('card'), false);
  } finally {
    globalThis.fetch = originalFetch;
    if (prevPaymongo !== undefined) process.env.PAYMONGO_SECRET_KEY = prevPaymongo;
    else delete process.env.PAYMONGO_SECRET_KEY;
  }
});

test('server-side Bloom Key & Couture enforcement rejects client forgeries, omitted nonces, and unpaid Couture /api/shorten payloads', async () => {
  const { EventEmitter } = await import('node:events');
  // @ts-expect-error Testing backend ESM module directly
  const paymentLib = await import('../../api/_lib/paymentHandler.js');
  // @ts-expect-error Testing backend ESM Couture guard directly
  const coutureGuard = await import('../../api/_lib/coutureGuard.js');
  const { encodeBouquetToCompactPayload, computeShortCode } = await import('./shareAndExport');

  const makeReq = (url: string, body: Record<string, unknown>) => {
    const req = Object.assign(new EventEmitter(), {
      method: 'POST',
      url,
      headers: { host: 'localhost:3000' },
      socket: { remoteAddress: '127.0.0.1' },
    });
    process.nextTick(() => {
      req.emit('data', Buffer.from(JSON.stringify(body)));
      req.emit('end');
    });
    return req;
  };

  const makeRes = () => {
    let statusCode = 200;
    const headers: Record<string, string> = {};
    let rawBody = '';
    return {
      get statusCode() {
        return statusCode;
      },
      set statusCode(val: number) {
        statusCode = val;
      },
      setHeader(k: string, v: string) {
        headers[k] = v;
      },
      end(chunk?: string) {
        if (chunk) rawBody += chunk;
      },
      json() {
        return JSON.parse(rawBody);
      },
    };
  };

  const prevSecret = process.env.PASS_SIGNING_SECRET;
  const originalFetch = globalThis.fetch;
  process.env.PASS_SIGNING_SECRET = 'Mix3dS3cr3tKey18Ch';
  // Block external Firestore REST network calls inside unit tests
  globalThis.fetch = (async () => new Response(JSON.stringify({}), { status: 404 })) as typeof fetch;

  try {
    const devHash = 'device_sec_test_12345678';

    // 1. Client-forged pass (signed with client-visible CLIENT_SIGNATURE_SALT) submitted in redeem-pass or verify-action MUST fail
    const forgedPass = createSignedStudioPass({
      passKey: 'BLOOM-9F3K-7Q2M',
      tier: 'pass_30d',
      region: 'INTL',
      deviceTokenHash: devHash,
      paymentReference: 'fake_checkout_ref_001',
    });

    const redeemSpoofReq = makeReq('/api/payments/redeem-pass', {
      passKey: forgedPass.passKey,
      deviceTokenHash: devHash,
      existingRecord: forgedPass,
    });
    const redeemSpoofRes = makeRes();
    await paymentLib.handlePaymentEndpoint(redeemSpoofReq, redeemSpoofRes, '/api/payments/redeem-pass');
    assert.equal(redeemSpoofRes.statusCode, 404);

    // Even if an attacker manages to write a doc directly to Firestore/store without PASS_SIGNING_SECRET HMAC
    paymentLib.SERVER_PASS_STORE.set(forgedPass.passKey, forgedPass);
    try {
      const redeemDocTamperReq = makeReq('/api/payments/redeem-pass', {
        passKey: forgedPass.passKey,
        deviceTokenHash: devHash,
      });
      const redeemDocTamperRes = makeRes();
      await paymentLib.handlePaymentEndpoint(
        redeemDocTamperReq,
        redeemDocTamperRes,
        '/api/payments/redeem-pass'
      );
      assert.equal(redeemDocTamperRes.statusCode, 403);
      assert.equal(redeemDocTamperRes.json().status, 'TAMPERED_SIGNATURE');

      const verifyDocTamperReq = makeReq('/api/payments/verify-action', {
        action: 'verify_pass',
        passKey: forgedPass.passKey,
        activeSessionNonce: forgedPass.activeSessionNonce,
        deviceTokenHash: devHash,
      });
      const verifyDocTamperRes = makeRes();
      await paymentLib.handlePaymentEndpoint(
        verifyDocTamperReq,
        verifyDocTamperRes,
        '/api/payments/verify-action'
      );
      assert.equal(verifyDocTamperRes.statusCode, 403);
      assert.equal(verifyDocTamperRes.json().status, 'TAMPERED_SIGNATURE');
    } finally {
      paymentLib.SERVER_PASS_STORE.delete(forgedPass.passKey);
    }

    // 2. verify-action rejects clientPass fallback when absent from server store & rejects internal slot keys
    const verifyClientOnlyReq = makeReq('/api/payments/verify-action', {
      action: 'verify_pass',
      pass: forgedPass,
      deviceTokenHash: devHash,
    });
    const verifyClientOnlyRes = makeRes();
    await paymentLib.handlePaymentEndpoint(
      verifyClientOnlyReq,
      verifyClientOnlyRes,
      '/api/payments/verify-action'
    );
    assert.equal(verifyClientOnlyRes.statusCode, 403);
    assert.equal(verifyClientOnlyRes.json().status, 'NOT_FOUND');

    const slotVerifyReq = makeReq('/api/payments/verify-action', {
      action: 'verify_pass',
      passKey: 'BLOOM-KCFG-SHOP',
      deviceTokenHash: devHash,
    });
    const slotVerifyRes = makeRes();
    await paymentLib.handlePaymentEndpoint(slotVerifyReq, slotVerifyRes, '/api/payments/verify-action');
    assert.equal(slotVerifyRes.statusCode, 403);

    // 3. Genuine server-signed pass rejects OMITTED activeSessionNonce on verify-action
    const genuine7d = paymentLib.createSignedStudioPassServer({
      tier: 'pass_7d',
      region: 'INTL',
      deviceTokenHash: devHash,
      paymentProvider: 'kofi',
    });
    paymentLib.SERVER_PASS_STORE.set(genuine7d.passKey, genuine7d);
    try {
      const missingNonceReq = makeReq('/api/payments/verify-action', {
        action: 'verify_pass',
        passKey: genuine7d.passKey,
        deviceTokenHash: devHash,
        // activeSessionNonce intentionally omitted!
      });
      const missingNonceRes = makeRes();
      await paymentLib.handlePaymentEndpoint(
        missingNonceReq,
        missingNonceRes,
        '/api/payments/verify-action'
      );
      assert.equal(missingNonceRes.statusCode, 403);
      assert.equal(missingNonceRes.json().status, 'SESSION_SUPERSEDED');

      // Valid nonce passes and returns canonical pass
      const validVerifyReq = makeReq('/api/payments/verify-action', {
        action: 'verify_pass',
        passKey: genuine7d.passKey,
        activeSessionNonce: genuine7d.activeSessionNonce,
        deviceTokenHash: devHash,
        incrementUsage: false,
      });
      const validVerifyRes = makeRes();
      await paymentLib.handlePaymentEndpoint(
        validVerifyReq,
        validVerifyRes,
        '/api/payments/verify-action'
      );
      assert.equal(validVerifyRes.statusCode, 200);
      assert.equal(validVerifyRes.json().ok, true);

      // 4. Couture guard on /api/shorten enforces payment & server-clamps retention
      const baseSnap = {
        items: [
          {
            id: 'f1',
            type: 'rose' as const,
            x: 300,
            y: 250,
            scale: 1,
            rotation: 0,
            flipX: false,
            petalColor: '#e11d48',
            centerColor: '#881337',
          },
        ],
        wrapStyle: 'kraft' as const,
        wrapColor: '#d4b483',
        ribbonColor: '#e11d48',
        ribbonStyle: 'satin' as const,
        environment: 'studio' as const,
        bouquetPose: { x: 300, y: 386, scale: 0.86, rotation: 0 },
        card: {
          visibleOnStage: true,
          theme: 'cream' as const,
          to: 'Maya',
          from: 'Alex',
          message: 'Thinking of you.',
        },
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

      const freePayload = encodeBouquetToCompactPayload(baseSnap, true);
      const freeCode = computeShortCode(freePayload);

      const freeCheck = await coutureGuard.verifyShortenCouturePermission({
        code: freeCode,
        payload: freePayload,
        isPremium: false,
        retentionDays: 30,
      });
      assert.equal(freeCheck.ok, true);
      assert.equal(freeCheck.isPremium, false);
      assert.equal(freeCheck.retentionDays, 30);

      // Free user trying to spoof eternal retention fails with 403
      const spoofRetentionCheck = await coutureGuard.verifyShortenCouturePermission({
        code: freeCode,
        payload: freePayload,
        isPremium: true,
        retentionDays: 36500,
      });
      assert.equal(spoofRetentionCheck.ok, false);
      assert.equal(spoofRetentionCheck.statusCode, 403);

      // Couture payloads (bloom, wrap, environment, photo, voice, lock, long note) fail without pass
      const coutureVariants = [
        encodeBouquetToCompactPayload(
          {
            ...baseSnap,
            items: [{ ...baseSnap.items[0], type: 'celestialRose' as const }],
          },
          true
        ),
        encodeBouquetToCompactPayload({ ...baseSnap, wrapStyle: 'vase' as const }, true),
        encodeBouquetToCompactPayload({ ...baseSnap, environment: 'aurora' as const }, true),
        encodeBouquetToCompactPayload(
          {
            ...baseSnap,
            items: [
              {
                ...baseSnap.items[0],
                photoStyle: 'polaroid' as const,
                photoDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
              },
            ],
          },
          true
        ),
        encodeBouquetToCompactPayload(
          {
            ...baseSnap,
            voice: {
              ...baseSnap.voice,
              visibleOnStage: true,
              durationSec: 12,
            },
          },
          true
        ),
        encodeBouquetToCompactPayload(
          {
            ...baseSnap,
            lock: { mode: 'passcode' as const, questionPrompt: 'Cat?', passcodeAnswer: 'Mochi' },
          },
          true
        ),
        encodeBouquetToCompactPayload(
          {
            ...baseSnap,
            card: { ...baseSnap.card, message: 'A'.repeat(600) },
          },
          true
        ),
      ];

      for (const cPayload of coutureVariants) {
        const resUnpaid = await coutureGuard.verifyShortenCouturePermission({
          code: computeShortCode(cPayload),
          payload: cPayload,
        });
        assert.equal(resUnpaid.ok, false, `Expected unpaid couture payload to fail: ${cPayload}`);
        assert.equal(resUnpaid.statusCode, 403);

        // Forged client key also fails
        const resForged = await coutureGuard.verifyShortenCouturePermission({
          code: computeShortCode(cPayload),
          payload: cPayload,
          passKey: forgedPass.passKey,
          deviceTokenHash: devHash,
          activeSessionNonce: forgedPass.activeSessionNonce,
        });
        assert.equal(resForged.ok, false);
        assert.equal(resForged.statusCode, 403);
      }

      // Valid 7-Day Pass unlocks Couture payload, and server overrides retentionDays=36500 claim down to 90 days!
      const couturePayload = coutureVariants[0];
      const allowed7d = await coutureGuard.verifyShortenCouturePermission({
        code: computeShortCode(couturePayload),
        payload: couturePayload,
        isPremium: true,
        retentionDays: 36500,
        passKey: genuine7d.passKey,
        deviceTokenHash: devHash,
        activeSessionNonce: genuine7d.activeSessionNonce,
      });
      assert.equal(allowed7d.ok, true);
      assert.equal(allowed7d.isPremium, false);
      assert.equal(allowed7d.retentionDays, 90);
    } finally {
      paymentLib.SERVER_PASS_STORE.delete(genuine7d.passKey);
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (prevSecret !== undefined) process.env.PASS_SIGNING_SECRET = prevSecret;
    else delete process.env.PASS_SIGNING_SECRET;
  }
});

test('BayadGate PH integration: MD5 signing, form-urlencoded checkout, webhook callback, verify-and-issue, and geo-lock', async () => {
  // @ts-expect-error ESM serverless handler
  const paymentLib = await import('../../api/_lib/paymentHandler.js');
  // @ts-expect-error ESM couture guard
  const coutureGuard = await import('../../api/_lib/coutureGuard.js');
  const { EventEmitter } = await import('node:events');
  const cryptoMod = await import('node:crypto');

  const prevSecret = process.env.PASS_SIGNING_SECRET;
  const prevMerchantId = process.env.BAYADGATE_MERCHANT_ID;
  const prevBgSecret = process.env.BAYADGATE_SECRET_KEY;
  const originalFetch = globalThis.fetch;

  process.env.PASS_SIGNING_SECRET = 'SuperSecurePassSecret_BayadGateTest99';
  process.env.BAYADGATE_MERCHANT_ID = 'MERCH_PH_001';
  process.env.BAYADGATE_SECRET_KEY = 'bg_secret_key_xyz';

  const makeReq = (
    method: string,
    url: string,
    bodyStr?: string,
    headers: Record<string, string> = {}
  ) => {
    const req = Object.assign(new EventEmitter(), {
      method,
      url,
      headers: { host: 'www.sendabouquet.online', ...headers },
      socket: { remoteAddress: '127.0.0.1' },
    });
    process.nextTick(() => {
      if (bodyStr !== undefined) {
        req.emit('data', Buffer.from(bodyStr));
      }
      req.emit('end');
    });
    return req;
  };

  const makeRes = () => {
    let statusCode = 200;
    const headers: Record<string, string> = {};
    let rawBody = '';
    return {
      get statusCode() {
        return statusCode;
      },
      set statusCode(val: number) {
        statusCode = val;
      },
      setHeader(k: string, v: string) {
        headers[k.toLowerCase()] = v;
      },
      getHeader(k: string) {
        return headers[k.toLowerCase()];
      },
      end(chunk?: string) {
        if (chunk) rawBody += chunk;
      },
      text() {
        return rawBody;
      },
      json() {
        return JSON.parse(rawBody || '{}');
      },
    };
  };

  try {
    // 1. Verify MD5 signature spec: ASCII-sorted non-empty params + &key=SECRET
    const sampleParams = {
      payment_method: 'GCASH',
      merchant_id: 'MERCH_PH_001',
      empty_ignored: '',
      amount: '99.00',
      order_id: 'BG123456',
      redirect_url: 'https://www.sendabouquet.online/?checkout_success=chk_1',
      sign: 'should_be_ignored',
    };
    const expectedSignStr =
      'amount=99.00&merchant_id=MERCH_PH_001&order_id=BG123456&payment_method=GCASH&redirect_url=https://www.sendabouquet.online/?checkout_success=chk_1&key=bg_secret_key_xyz';
    const expectedMd5 = cryptoMod.createHash('md5').update(expectedSignStr).digest('hex');
    assert.equal(
      paymentLib.computeBayadgateSignature(sampleParams, 'bg_secret_key_xyz'),
      expectedMd5
    );
    assert.equal(
      paymentLib.verifyBayadgateSignature(
        { ...sampleParams, sign: expectedMd5.toUpperCase() },
        'bg_secret_key_xyz'
      ),
      true
    );
    assert.equal(
      paymentLib.verifyBayadgateSignature({ ...sampleParams, sign: 'deadbeef' }, 'bg_secret_key_xyz'),
      false
    );

    // 2. GET /api/payments/create-checkout capability check (PH eligible vs US blocked)
    const capPhRes = makeRes();
    await paymentLib.handlePaymentEndpoint(
      makeReq('GET', '/api/payments/create-checkout', undefined, { 'x-vercel-ip-country': 'PH' }),
      capPhRes,
      '/api/payments/create-checkout'
    );
    assert.equal(capPhRes.statusCode, 200);
    assert.equal(capPhRes.json().isPhEligible, true);
    assert.equal(capPhRes.json().phGateway, 'bayadgate');
    assert.equal(capPhRes.json().defaultRegion, 'PH');

    const capUsRes = makeRes();
    await paymentLib.handlePaymentEndpoint(
      makeReq('GET', '/api/payments/create-checkout', undefined, { 'x-vercel-ip-country': 'US' }),
      capUsRes,
      '/api/payments/create-checkout'
    );
    assert.equal(capUsRes.statusCode, 200);
    assert.equal(capUsRes.json().isPhEligible, false);
    assert.equal(capUsRes.json().defaultRegion, 'INTL');

    // 3. Anti-arbitrage: US IP requesting PH + bayadgate is forced to INTL + kofi
    const usSpoofRes = makeRes();
    await paymentLib.handlePaymentEndpoint(
      makeReq(
        'POST',
        '/api/payments/create-checkout',
        JSON.stringify({
          tier: 'pass_7d',
          region: 'PH',
          provider: 'bayadgate',
          paymentMethod: 'GCASH',
          deviceTokenHash: 'dev_us_arb_attempt_01',
        }),
        { 'x-vercel-ip-country': 'US', 'content-type': 'application/json' }
      ),
      usSpoofRes,
      '/api/payments/create-checkout'
    );
    assert.equal(usSpoofRes.statusCode, 200);
    assert.equal(usSpoofRes.json().provider, 'kofi');
    assert.equal(usSpoofRes.json().plan.currency, 'USD');

    // 4. Mock BayadGate upstream checkout.php + query_status.php + Firestore
    let capturedCheckoutBody = '';
    let capturedCheckoutContentType = '';
    let upstreamStatus = '1'; // 1 = pending initially

    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/checkout.php')) {
        capturedCheckoutBody = String(init?.body || '');
        capturedCheckoutContentType = String(
          (init?.headers as Record<string, string>)?.['Content-Type'] || ''
        );
        const form = new URLSearchParams(capturedCheckoutBody);
        return new Response(
          JSON.stringify({
            status: 'SUCCESS',
            message: 'Checkout URL generated',
            order_id: form.get('order_id'),
            amount: form.get('amount'),
            payment_url: `https://bayadgate.com/pay/${form.get('order_id')}`,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (urlStr.includes('/api/query_status.php')) {
        const form = new URLSearchParams(String(init?.body || ''));
        return new Response(
          JSON.stringify({
            status: 'SUCCESS',
            order_id: form.get('order_id'),
            payment_status: upstreamStatus,
            amount: '99.00',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(JSON.stringify({}), { status: 404 });
    }) as typeof fetch;

    // 5. PH buyer creates BayadGate Maya checkout for 7-Day Pass (₱99.00)
    const devPh = 'dev_ph_buyer_maya_8888';
    const bgCreateRes = makeRes();
    await paymentLib.handlePaymentEndpoint(
      makeReq(
        'POST',
        '/api/payments/create-checkout',
        JSON.stringify({
          tier: 'pass_7d',
          region: 'PH',
          provider: 'bayadgate',
          paymentMethod: 'MAYA',
          deviceTokenHash: devPh,
          origin: 'https://www.sendabouquet.online',
        }),
        { 'x-vercel-ip-country': 'PH', 'content-type': 'application/json' }
      ),
      bgCreateRes,
      '/api/payments/create-checkout'
    );
    assert.equal(bgCreateRes.statusCode, 200);
    const created = bgCreateRes.json();
    assert.equal(created.ok, true);
    assert.equal(created.provider, 'bayadgate');
    assert.equal(created.paymentMethod, 'MAYA');
    assert.equal(created.plan.currency, 'PHP');
    assert.equal(created.plan.amountMinor, 9900);
    assert.match(created.checkoutUrl, /^https:\/\/bayadgate\.com\/pay\/BG/);
    assert.match(capturedCheckoutContentType, /application\/x-www-form-urlencoded/i);

    const sentForm = new URLSearchParams(capturedCheckoutBody);
    assert.equal(sentForm.get('merchant_id'), 'MERCH_PH_001');
    assert.equal(sentForm.get('amount'), '99.00');
    assert.equal(sentForm.get('payment_method'), 'MAYA');
    assert.equal(
      paymentLib.verifyBayadgateSignature(
        Object.fromEntries(sentForm.entries()),
        'bg_secret_key_xyz'
      ),
      true
    );

    const slotKey = paymentLib.deriveBayadgateOrderSlotKey(created.orderId);
    assert.equal(slotKey.startsWith('BLOOM-BG'), true);

    // 6. BLOOM-BG internal order slot cannot be redeemed or used for Couture unlock
    const redeemSlotRes = makeRes();
    await paymentLib.handlePaymentEndpoint(
      makeReq(
        'POST',
        '/api/payments/redeem-pass',
        JSON.stringify({ passKey: slotKey, deviceTokenHash: devPh }),
        { 'content-type': 'application/json' }
      ),
      redeemSlotRes,
      '/api/payments/redeem-pass'
    );
    assert.equal(redeemSlotRes.statusCode, 400);

    const shortenSlotCheck = await coutureGuard.verifyShortenCouturePermission({
      code: 'c_test99',
      payload: '#c=vase',
      isPremium: true,
      passKey: slotKey,
      deviceTokenHash: devPh,
      activeSessionNonce: created.orderId,
    });
    assert.equal(shortenSlotCheck.ok, false);
    assert.equal(shortenSlotCheck.statusCode, 403);

    // 7. Before payment completes, verify-and-issue returns 402 PENDING_PAYMENT
    const verifyPendingRes = makeRes();
    await paymentLib.handlePaymentEndpoint(
      makeReq(
        'POST',
        '/api/payments/verify-and-issue',
        JSON.stringify({
          checkoutId: created.checkoutId,
          checkoutToken: created.checkoutToken,
          deviceTokenHash: devPh,
        }),
        { 'content-type': 'application/json' }
      ),
      verifyPendingRes,
      '/api/payments/verify-and-issue'
    );
    assert.equal(verifyPendingRes.statusCode, 402);
    assert.equal(verifyPendingRes.json().status, 'PENDING_PAYMENT');

    // 8. Webhook with bad signature is rejected with 401
    const badWebhookParams = {
      merchant_id: 'MERCH_PH_001',
      order_id: created.orderId,
      amount: '99.00',
      status: '5',
      sign: '00000000000000000000000000000000',
    };
    const badWhRes = makeRes();
    await paymentLib.handlePaymentEndpoint(
      makeReq('POST', '/api/webhooks/bayadgate', new URLSearchParams(badWebhookParams).toString(), {
        'content-type': 'application/x-www-form-urlencoded',
      }),
      badWhRes,
      '/api/webhooks/bayadgate'
    );
    assert.equal(badWhRes.statusCode, 401);

    // 9. Webhook with underpaid amount ('49.00' for 'pass_7d' ₱99.00) is rejected with 400
    const underpaidParams: Record<string, string> = {
      merchant_id: 'MERCH_PH_001',
      order_id: created.orderId,
      amount: '49.00',
      status: '5',
    };
    underpaidParams.sign = paymentLib.computeBayadgateSignature(underpaidParams, 'bg_secret_key_xyz');
    const underpaidWhRes = makeRes();
    await paymentLib.handlePaymentEndpoint(
      makeReq('POST', '/api/webhooks/bayadgate', new URLSearchParams(underpaidParams).toString(), {
        'content-type': 'application/x-www-form-urlencoded',
      }),
      underpaidWhRes,
      '/api/webhooks/bayadgate'
    );
    assert.equal(underpaidWhRes.statusCode, 400);
    assert.equal(underpaidWhRes.text(), 'FAIL_AMOUNT_MISMATCH');

    // 10. Valid BayadGate webhook (`status=5`, exact `99.00`) responds raw plaintext `SUCCESS` and issues pass
    const validWhParams: Record<string, string> = {
      merchant_id: 'MERCH_PH_001',
      order_id: created.orderId,
      amount: '99.00',
      status: '5',
    };
    validWhParams.sign = paymentLib.computeBayadgateSignature(validWhParams, 'bg_secret_key_xyz');
    const validWhRes = makeRes();
    await paymentLib.handlePaymentEndpoint(
      makeReq('POST', '/api/webhooks/bayadgate', new URLSearchParams(validWhParams).toString(), {
        'content-type': 'application/x-www-form-urlencoded',
      }),
      validWhRes,
      '/api/webhooks/bayadgate'
    );
    assert.equal(validWhRes.statusCode, 200);
    assert.equal(validWhRes.text(), 'SUCCESS');
    assert.match(String(validWhRes.getHeader('content-type') || ''), /text\/plain/i);

    // 11. Now verify-and-issue succeeds and returns verified PASS_SIGNING_SECRET-signed BayadGate pass
    const verifyPaidRes = makeRes();
    await paymentLib.handlePaymentEndpoint(
      makeReq(
        'POST',
        '/api/payments/verify-and-issue',
        JSON.stringify({
          checkoutId: created.checkoutId,
          checkoutToken: created.checkoutToken,
          deviceTokenHash: devPh,
        }),
        { 'content-type': 'application/json' }
      ),
      verifyPaidRes,
      '/api/payments/verify-and-issue'
    );
    assert.equal(verifyPaidRes.statusCode, 200);
    const issued = verifyPaidRes.json();
    assert.equal(issued.ok, true);
    assert.equal(issued.pass.paymentProvider, 'bayadgate');
    assert.equal(issued.pass.region, 'PH');
    assert.equal(issued.pass.tier, 'pass_7d');
    assert.equal(paymentLib.verifyPassIntegritySignature(issued.pass), true);
    assert.equal(paymentLib.verifyServerPaymentReference(issued.pass), true);

    paymentLib.SERVER_PASS_STORE.delete(slotKey);
    paymentLib.SERVER_PASS_STORE.delete(issued.pass.passKey);
  } finally {
    globalThis.fetch = originalFetch;
    if (prevSecret !== undefined) process.env.PASS_SIGNING_SECRET = prevSecret;
    else delete process.env.PASS_SIGNING_SECRET;
    if (prevMerchantId !== undefined) process.env.BAYADGATE_MERCHANT_ID = prevMerchantId;
    else delete process.env.BAYADGATE_MERCHANT_ID;
    if (prevBgSecret !== undefined) process.env.BAYADGATE_SECRET_KEY = prevBgSecret;
    else delete process.env.BAYADGATE_SECRET_KEY;
  }
});

test('SikatPay PH flow: create-checkout, HMAC-SHA256 webhook, amount/livemode guards, and verify-and-issue', async () => {
  // @ts-expect-error ESM server handler
  const paymentLib = await import('../../api/_lib/paymentHandler.js');
  // @ts-expect-error ESM couture guard
  const coutureGuard = await import('../../api/_lib/coutureGuard.js');
  const { EventEmitter } = await import('node:events');
  const cryptoMod = await import('node:crypto');

  const prevSecret = process.env.PASS_SIGNING_SECRET;
  const prevSpKey = process.env.SIKATPAY_API_KEY;
  const prevSpWhSecret = process.env.SIKATPAY_WEBHOOK_SECRET;
  const prevBgMerchant = process.env.BAYADGATE_MERCHANT_ID;
  const prevBgSecret = process.env.BAYADGATE_SECRET_KEY;
  const originalFetch = globalThis.fetch;

  process.env.PASS_SIGNING_SECRET = 'SuperSecurePassSecret_SikatPayTest99';
  process.env.SIKATPAY_API_KEY = 'mk_test_abc123def456';
  process.env.SIKATPAY_WEBHOOK_SECRET = 'whsec_test_sikatpay_secret_789';
  delete process.env.BAYADGATE_MERCHANT_ID;
  delete process.env.BAYADGATE_SECRET_KEY;

  const makeReq = (
    method: string,
    url: string,
    bodyStr?: string,
    headers: Record<string, string> = {}
  ) => {
    const req = Object.assign(new EventEmitter(), {
      method,
      url,
      headers: { host: 'www.sendabouquet.online', ...headers },
      socket: { remoteAddress: '127.0.0.1' },
    });
    process.nextTick(() => {
      if (bodyStr !== undefined) {
        req.emit('data', Buffer.from(bodyStr));
      }
      req.emit('end');
    });
    return req;
  };

  const makeRes = () => {
    let statusCode = 200;
    const headers: Record<string, string> = {};
    let rawBody = '';
    return {
      get statusCode() {
        return statusCode;
      },
      set statusCode(val: number) {
        statusCode = val;
      },
      setHeader(k: string, v: string) {
        headers[k.toLowerCase()] = v;
      },
      getHeader(k: string) {
        return headers[k.toLowerCase()];
      },
      end(chunk?: string) {
        if (chunk) rawBody += chunk;
      },
      text() {
        return rawBody;
      },
      json() {
        return JSON.parse(rawBody || '{}');
      },
    };
  };

  const signSikatpayWebhook = (rawBody: string, secret: string, tsSec: number) => {
    const sig = cryptoMod
      .createHmac('sha256', secret)
      .update(`${tsSec}.${rawBody}`, 'utf8')
      .digest('hex');
    return `t=${tsSec},v1=${sig}`;
  };

  try {
    // 1. Verify HMAC-SHA256 webhook signature helper & 300s replay guard
    const nowMs = 1_790_000_000_000;
    const nowSec = Math.floor(nowMs / 1000);
    const sampleRaw = JSON.stringify({ id: 'evt_1', type: 'ping' }) + '\n';
    const validHeader = signSikatpayWebhook(sampleRaw, 'whsec_test_sikatpay_secret_789', nowSec);
    assert.equal(
      paymentLib.verifySikatpayWebhookSignature(
        sampleRaw,
        validHeader,
        'whsec_test_sikatpay_secret_789',
        nowMs
      ),
      true
    );
    const expiredHeader = signSikatpayWebhook(
      sampleRaw,
      'whsec_test_sikatpay_secret_789',
      nowSec - 301
    );
    assert.equal(
      paymentLib.verifySikatpayWebhookSignature(
        sampleRaw,
        expiredHeader,
        'whsec_test_sikatpay_secret_789',
        nowMs
      ),
      false
    );
    assert.equal(
      paymentLib.verifySikatpayWebhookSignature(
        sampleRaw.replace('ping', 'evil'),
        validHeader,
        'whsec_test_sikatpay_secret_789',
        nowMs
      ),
      false
    );

    // 2. Capability check returns sikatpay for PH and blocks US
    const capPhRes = makeRes();
    await paymentLib.handlePaymentEndpoint(
      makeReq('GET', '/api/payments/create-checkout', undefined, { 'x-vercel-ip-country': 'PH' }),
      capPhRes,
      '/api/payments/create-checkout'
    );
    assert.equal(capPhRes.statusCode, 200);
    assert.equal(capPhRes.json().isPhEligible, true);
    assert.equal(capPhRes.json().phGateway, 'sikatpay');
    assert.equal(capPhRes.json().sikatpayTestMode, true);
    assert.equal(capPhRes.json().defaultRegion, 'PH');

    const capUsRes = makeRes();
    await paymentLib.handlePaymentEndpoint(
      makeReq('GET', '/api/payments/create-checkout', undefined, { 'x-vercel-ip-country': 'US' }),
      capUsRes,
      '/api/payments/create-checkout'
    );
    assert.equal(capUsRes.json().isPhEligible, false);

    // 3. Anti-arbitrage: US IP requesting PH + sikatpay gets forced to INTL + kofi
    const usSpoofRes = makeRes();
    await paymentLib.handlePaymentEndpoint(
      makeReq(
        'POST',
        '/api/payments/create-checkout',
        JSON.stringify({
          tier: 'single',
          region: 'PH',
          provider: 'sikatpay',
          deviceTokenHash: 'dev_us_sp_arb_attempt_01',
        }),
        { 'x-vercel-ip-country': 'US', 'content-type': 'application/json' }
      ),
      usSpoofRes,
      '/api/payments/create-checkout'
    );
    assert.equal(usSpoofRes.statusCode, 200);
    assert.equal(usSpoofRes.json().provider, 'kofi');
    assert.equal(usSpoofRes.json().plan.currency, 'USD');

    // 4. Mock SikatPay upstream API (POST /v1/payments & GET /v1/payments/:id)
    let capturedCreatePayload: Record<string, unknown> = {};
    let capturedAuthHeader = '';
    let mockPaymentStatus: 'pending' | 'paid' = 'pending';
    let mockPaymentLivemode = false;

    globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr === 'https://payment.sikatpinoy.net/api/v1/payments' && init?.method === 'POST') {
        capturedAuthHeader = String(
          (init?.headers as Record<string, string>)?.Authorization || ''
        );
        capturedCreatePayload = JSON.parse(String(init?.body || '{}'));
        return new Response(
          JSON.stringify({
            id: 'SpPay9876543210abcde',
            status: 'pending',
            amount: capturedCreatePayload.amount,
            currency: 'PHP',
            order_id: capturedCreatePayload.order_id,
            checkout_url: 'https://payment.sikatpinoy.net/pay?id=SpPay9876543210abcde',
            expires_at: new Date(Date.now() + 3600_000).toISOString(),
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (urlStr === 'https://payment.sikatpinoy.net/api/v1/payments/SpPay9876543210abcde') {
        return new Response(
          JSON.stringify({
            id: 'SpPay9876543210abcde',
            livemode: mockPaymentLivemode,
            status: mockPaymentStatus,
            amount: capturedCreatePayload.amount,
            currency: 'PHP',
            order_id: capturedCreatePayload.order_id,
            method: 'qrph',
            platform_fee: 294,
            net_amount: 4606,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(JSON.stringify({}), { status: 404 });
    }) as typeof fetch;

    // 5. PH buyer creates SikatPay checkout for Single Bouquet (₱49.00 = 4900 centavos)
    const devPh = 'dev_ph_buyer_sikatpay_01';
    const createRes = makeRes();
    await paymentLib.handlePaymentEndpoint(
      makeReq(
        'POST',
        '/api/payments/create-checkout',
        JSON.stringify({
          tier: 'single',
          region: 'PH',
          provider: 'sikatpay',
          deviceTokenHash: devPh,
          origin: 'https://www.sendabouquet.online',
        }),
        { 'x-vercel-ip-country': 'PH', 'content-type': 'application/json' }
      ),
      createRes,
      '/api/payments/create-checkout'
    );
    assert.equal(createRes.statusCode, 200);
    const created = createRes.json();
    assert.equal(created.ok, true);
    assert.equal(created.provider, 'sikatpay');
    assert.equal(created.plan.currency, 'PHP');
    assert.equal(created.plan.amountMinor, 4900);
    assert.equal(created.checkoutUrl, 'https://payment.sikatpinoy.net/pay?id=SpPay9876543210abcde');
    assert.match(created.orderId, /^SB-[A-F0-9]{12}$/);
    assert.equal(capturedAuthHeader, 'Bearer mk_test_abc123def456');
    assert.equal(capturedCreatePayload.amount, 4900);
    assert.equal(capturedCreatePayload.description, 'Send A Bouquet - Single Bouquet');
    assert.match(String(capturedCreatePayload.success_url || ''), /^https:\/\/www\.sendabouquet\.online\/\?checkout_success=/);

    const slotKey = paymentLib.deriveSikatpayOrderSlotKey(created.orderId);
    assert.equal(slotKey.startsWith('BLOOM-SP'), true);

    // 6. BLOOM-SP internal slot cannot be redeemed or used for Couture unlock
    const redeemSlotRes = makeRes();
    await paymentLib.handlePaymentEndpoint(
      makeReq(
        'POST',
        '/api/payments/redeem-pass',
        JSON.stringify({ passKey: slotKey, deviceTokenHash: devPh }),
        { 'content-type': 'application/json' }
      ),
      redeemSlotRes,
      '/api/payments/redeem-pass'
    );
    assert.equal(redeemSlotRes.statusCode, 400);

    const shortenSlotCheck = await coutureGuard.verifyShortenCouturePermission({
      code: 'c_sptest1',
      payload: '#c=vase',
      isPremium: true,
      passKey: slotKey,
      deviceTokenHash: devPh,
      activeSessionNonce: 'SpPay9876543210abcde',
    });
    assert.equal(shortenSlotCheck.ok, false);
    assert.equal(shortenSlotCheck.statusCode, 403);

    // 7. Pending check returns 402 PENDING_PAYMENT
    const pendingRes = makeRes();
    await paymentLib.handlePaymentEndpoint(
      makeReq(
        'POST',
        '/api/payments/verify-and-issue',
        JSON.stringify({
          checkoutId: created.checkoutId,
          checkoutToken: created.checkoutToken,
          deviceTokenHash: devPh,
        }),
        { 'content-type': 'application/json' }
      ),
      pendingRes,
      '/api/payments/verify-and-issue'
    );
    assert.equal(pendingRes.statusCode, 402);
    assert.equal(pendingRes.json().status, 'PENDING_PAYMENT');

    // 8. Ping webhook returns 200; invalid signature returns 401
    const liveNowSec = Math.floor(Date.now() / 1000);
    const pingRaw = JSON.stringify({ id: 'evt_ping_1', type: 'ping' });
    const pingRes = makeRes();
    await paymentLib.handlePaymentEndpoint(
      makeReq('POST', '/api/webhooks/sikatpay', pingRaw, {
        'content-type': 'application/json',
        'x-signature': signSikatpayWebhook(pingRaw, 'whsec_test_sikatpay_secret_789', liveNowSec),
      }),
      pingRes,
      '/api/webhooks/sikatpay'
    );
    assert.equal(pingRes.statusCode, 200);
    assert.equal(pingRes.json().type, 'ping');

    const badSigRes = makeRes();
    await paymentLib.handlePaymentEndpoint(
      makeReq('POST', '/api/webhooks/sikatpay', pingRaw, {
        'content-type': 'application/json',
        'x-signature': `t=${liveNowSec},v1=deadbeef`,
      }),
      badSigRes,
      '/api/webhooks/sikatpay'
    );
    assert.equal(badSigRes.statusCode, 401);

    // 9. Test-mode webhook event (livemode: false) is ignored if a LIVE mk_ key is active
    process.env.SIKATPAY_API_KEY = 'mk_live_production_key_only';
    const testEventOnLiveRaw = JSON.stringify({
      id: 'evt_test_on_live',
      type: 'payment.paid',
      livemode: false,
      created: liveNowSec,
      data: {
        id: 'SpPay9876543210abcde',
        livemode: false,
        status: 'paid',
        amount: 4900,
        currency: 'PHP',
        order_id: created.orderId,
      },
    });
    const testOnLiveRes = makeRes();
    await paymentLib.handlePaymentEndpoint(
      makeReq('POST', '/api/webhooks/sikatpay', testEventOnLiveRaw, {
        'content-type': 'application/json',
        'x-signature': signSikatpayWebhook(
          testEventOnLiveRaw,
          'whsec_test_sikatpay_secret_789',
          liveNowSec
        ),
      }),
      testOnLiveRes,
      '/api/webhooks/sikatpay'
    );
    assert.equal(testOnLiveRes.statusCode, 200);
    assert.equal(testOnLiveRes.json().ignored, true);
    assert.equal(testOnLiveRes.json().reason, 'TEST_EVENT_ON_LIVE_MODE');

    // Switch back to test key so simulated checkout can complete
    process.env.SIKATPAY_API_KEY = 'mk_test_abc123def456';

    // 10. Underpaid webhook (2000 centavos instead of 4900) is rejected with 400
    const underpaidRaw = JSON.stringify({
      id: 'evt_underpaid',
      type: 'payment.paid',
      livemode: false,
      created: liveNowSec,
      data: {
        id: 'SpPay9876543210abcde',
        livemode: false,
        status: 'paid',
        amount: 2000,
        currency: 'PHP',
        order_id: created.orderId,
      },
    });
    const underpaidRes = makeRes();
    await paymentLib.handlePaymentEndpoint(
      makeReq('POST', '/api/webhooks/sikatpay', underpaidRaw, {
        'content-type': 'application/json',
        'x-signature': signSikatpayWebhook(
          underpaidRaw,
          'whsec_test_sikatpay_secret_789',
          liveNowSec
        ),
      }),
      underpaidRes,
      '/api/webhooks/sikatpay'
    );
    assert.equal(underpaidRes.statusCode, 400);

    // 11. Valid signed payment.paid webhook with trailing newline fulfills order & is idempotent on retry
    const paidRaw =
      JSON.stringify({
        id: 'evt_paid_1',
        type: 'payment.paid',
        livemode: false,
        created: liveNowSec,
        data: {
          id: 'SpPay9876543210abcde',
          livemode: false,
          status: 'paid',
          amount: 4900,
          currency: 'PHP',
          order_id: created.orderId,
          method: 'qrph',
          platform_fee: 294,
          net_amount: 4606,
        },
      }) + '\n';
    const paidSig = signSikatpayWebhook(paidRaw, 'whsec_test_sikatpay_secret_789', liveNowSec);

    const validWhRes = makeRes();
    await paymentLib.handlePaymentEndpoint(
      makeReq('POST', '/api/webhooks/sikatpay', paidRaw, {
        'content-type': 'application/json',
        'x-signature': paidSig,
      }),
      validWhRes,
      '/api/webhooks/sikatpay'
    );
    assert.equal(validWhRes.statusCode, 200);
    assert.equal(validWhRes.json().ok, true);
    assert.equal(validWhRes.json().passKey, created.passKeyPreview);

    const retryWhRes = makeRes();
    await paymentLib.handlePaymentEndpoint(
      makeReq('POST', '/api/webhooks/sikatpay', paidRaw, {
        'content-type': 'application/json',
        'x-signature': paidSig,
      }),
      retryWhRes,
      '/api/webhooks/sikatpay'
    );
    assert.equal(retryWhRes.statusCode, 200);
    assert.equal(retryWhRes.json().duplicate, true);

    // 12. verify-and-issue returns the verified signed SikatPay pass
    const verifyPaidRes = makeRes();
    await paymentLib.handlePaymentEndpoint(
      makeReq(
        'POST',
        '/api/payments/verify-and-issue',
        JSON.stringify({
          checkoutId: created.checkoutId,
          checkoutToken: created.checkoutToken,
          deviceTokenHash: devPh,
        }),
        { 'content-type': 'application/json' }
      ),
      verifyPaidRes,
      '/api/payments/verify-and-issue'
    );
    assert.equal(verifyPaidRes.statusCode, 200);
    const issued = verifyPaidRes.json();
    assert.equal(issued.ok, true);
    assert.equal(issued.pass.paymentProvider, 'sikatpay');
    assert.equal(issued.pass.region, 'PH');
    assert.equal(issued.pass.tier, 'single');
    assert.equal(paymentLib.verifyPassIntegritySignature(issued.pass), true);
    assert.equal(paymentLib.verifyServerPaymentReference(issued.pass), true);

    paymentLib.SERVER_PASS_STORE.delete(slotKey);
    paymentLib.SERVER_PASS_STORE.delete(issued.pass.passKey);

    // 13. Also test GET /v1/payments/:id fallback path (no webhook delivered yet)
    const createFallbackRes = makeRes();
    await paymentLib.handlePaymentEndpoint(
      makeReq(
        'POST',
        '/api/payments/create-checkout',
        JSON.stringify({
          tier: 'single',
          region: 'PH',
          provider: 'sikatpay',
          deviceTokenHash: devPh,
          origin: 'https://www.sendabouquet.online',
        }),
        { 'x-vercel-ip-country': 'PH', 'content-type': 'application/json' }
      ),
      createFallbackRes,
      '/api/payments/create-checkout'
    );
    const created2 = createFallbackRes.json();
    const slotKey2 = paymentLib.deriveSikatpayOrderSlotKey(created2.orderId);
    mockPaymentStatus = 'paid';
    mockPaymentLivemode = false;

    const verifyFallbackRes = makeRes();
    await paymentLib.handlePaymentEndpoint(
      makeReq(
        'POST',
        '/api/payments/verify-and-issue',
        JSON.stringify({
          checkoutId: created2.checkoutId,
          checkoutToken: created2.checkoutToken,
          deviceTokenHash: devPh,
        }),
        { 'content-type': 'application/json' }
      ),
      verifyFallbackRes,
      '/api/payments/verify-and-issue'
    );
    assert.equal(verifyFallbackRes.statusCode, 200);
    const issued2 = verifyFallbackRes.json();
    assert.equal(issued2.pass.paymentProvider, 'sikatpay');
    assert.equal(paymentLib.verifyPassIntegritySignature(issued2.pass), true);

    paymentLib.SERVER_PASS_STORE.delete(slotKey2);
    paymentLib.SERVER_PASS_STORE.delete(issued2.pass.passKey);
  } finally {
    globalThis.fetch = originalFetch;
    if (prevSecret !== undefined) process.env.PASS_SIGNING_SECRET = prevSecret;
    else delete process.env.PASS_SIGNING_SECRET;
    if (prevSpKey !== undefined) process.env.SIKATPAY_API_KEY = prevSpKey;
    else delete process.env.SIKATPAY_API_KEY;
    if (prevSpWhSecret !== undefined) process.env.SIKATPAY_WEBHOOK_SECRET = prevSpWhSecret;
    else delete process.env.SIKATPAY_WEBHOOK_SECRET;
    if (prevBgMerchant !== undefined) process.env.BAYADGATE_MERCHANT_ID = prevBgMerchant;
    else delete process.env.BAYADGATE_MERCHANT_ID;
    if (prevBgSecret !== undefined) process.env.BAYADGATE_SECRET_KEY = prevBgSecret;
    else delete process.env.BAYADGATE_SECRET_KEY;
  }
});



