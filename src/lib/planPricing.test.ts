import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  DEFAULT_PLAN_PRICING_CONFIG,
  getPricingCatalog,
  resolveEffectivePricingPlan,
  sanitizePlanPricingConfig,
  type PlanPricingConfig,
} from './monetization';
import {
  PAID_PASS_LEDGER,
  createSignedAdminSessionToken,
  handlePaymentEndpoint,
  resetOwnerVaultInMemoryForColdStartTests,
  sanitizePlanPricingConfigServer,
  // @ts-expect-error Shared ESM API payment handler module
} from '../../api/_lib/paymentHandler.js';

function createMockReqRes(options: {
  method?: string;
  body?: unknown;
  rawBody?: string;
  headers?: Record<string, string>;
  url?: string;
}) {
  let statusCode = 0;
  let responseBody = '';
  const req = {
    method: options.method || 'POST',
    url: options.url || '',
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
    body: options.body,
    on(event: string, cb: (arg?: unknown) => void) {
      if (event === 'data' && options.rawBody !== undefined) {
        cb(Buffer.from(options.rawBody, 'utf8'));
      }
      if (event === 'end') {
        cb();
      }
      return this;
    },
  };
  const res = {
    statusCode: 0,
    headers: {} as Record<string, string>,
    setHeader(key: string, value: string) {
      this.headers[key.toLowerCase()] = value;
    },
    end(chunk: string) {
      responseBody = chunk;
    },
    writeHead(code: number) {
      statusCode = code;
      this.statusCode = code;
    },
  };
  return {
    req,
    res,
    getStatus: () => statusCode || res.statusCode,
    getJson: () => JSON.parse(responseBody || '{}'),
  };
}

test('DEFAULT_PLAN_PRICING_CONFIG discounts PH Eternal from ₱249 to ₱199 and reverts cleanly to ₱249 when toggled off', () => {
  const defaultPhPlans = getPricingCatalog('PH', DEFAULT_PLAN_PRICING_CONFIG);
  const eternalDefault = defaultPhPlans.find((p) => p.tier === 'pass_30d');
  assert.ok(eternalDefault);
  assert.equal(eternalDefault.originalAmountMinor, 24900);
  assert.equal(eternalDefault.originalDisplayPrice, '₱249');
  assert.equal(eternalDefault.amountMinor, 19900);
  assert.equal(eternalDefault.displayPrice, '₱199');
  assert.equal(eternalDefault.isDiscounted, true);
  assert.equal(eternalDefault.discountPercent, 20);
  assert.equal(eternalDefault.savingsDisplay, '₱50');

  // Toggle PH Eternal discount OFF -> reverts cleanly to exact ₱249 (24900)
  const revertedCfg: PlanPricingConfig = sanitizePlanPricingConfig({
    ...DEFAULT_PLAN_PRICING_CONFIG,
    PH: {
      ...DEFAULT_PLAN_PRICING_CONFIG.PH,
      pass_30d: {
        ...DEFAULT_PLAN_PRICING_CONFIG.PH.pass_30d,
        discountEnabled: false,
      },
    },
  });
  const eternalReverted = resolveEffectivePricingPlan('PH', 'pass_30d', revertedCfg);
  assert.equal(eternalReverted.amountMinor, 24900);
  assert.equal(eternalReverted.displayPrice, '₱249');
  assert.equal(eternalReverted.isDiscounted, false);
  assert.equal(eternalReverted.discountPercent, undefined);
  assert.equal(eternalReverted.savingsDisplay, undefined);
});

test('PHP and USD discounts are independent and sanitizers reject invalid prices and prototype pollution', () => {
  const malicious = JSON.parse(
    '{"__proto__":{"polluted":true},"PH":{"pass_30d":{"originalAmountMinor":24900,"discountEnabled":true,"discountedAmountMinor":30000,"promoBadge":"<b>HACK</b>"}},"INTL":{"pass_7d":{"originalAmountMinor":399,"discountEnabled":true,"discountedAmountMinor":299,"discountKofiCode":"bad!@#code"},"pass_30d":{"originalAmountMinor":699,"discountEnabled":true,"discountedAmountMinor":499,"promoBadge":"USD Launch","discountKofiCode":"https://ko-fi.com/s/Sale30d99"}}}'
  );

  const clientSanitized = sanitizePlanPricingConfig(malicious);
  const serverSanitized = sanitizePlanPricingConfigServer(malicious);
  assert.equal(({} as Record<string, unknown>).polluted, undefined);

  // PH discount >= original must auto-disable so a buyer is never overcharged
  assert.equal(clientSanitized.PH.pass_30d.discountEnabled, false);
  assert.equal(serverSanitized.PH.pass_30d.discountEnabled, false);

  // Invalid Ko-fi code is stripped to empty string on both client and server
  assert.equal(clientSanitized.INTL.pass_7d.discountKofiCode, '');
  assert.equal(serverSanitized.INTL.pass_7d.discountKofiCode, '');

  // USD discount remains active independently while PH is regular
  const usdEternal = resolveEffectivePricingPlan('INTL', 'pass_30d', clientSanitized);
  assert.equal(usdEternal.isDiscounted, true);
  assert.equal(usdEternal.originalDisplayPrice, '$6.99');
  assert.equal(usdEternal.displayPrice, '$4.99');
  assert.equal(usdEternal.promoBadge, 'USD Launch');
  assert.equal(usdEternal.discountKofiCode, 'sale30d99');
  assert.equal(serverSanitized.INTL.pass_30d.discountKofiCode, 'sale30d99');
});

test('update_plan_pricing_config rejects missing or forged admin tokens with HTTP 401', async () => {
  const { req, res, getStatus, getJson } = createMockReqRes({
    body: {
      action: 'update_plan_pricing_config',
      adminSessionToken: 'forged.invalid.token',
      deviceTokenHash: 'device-pricing-auth-test',
      planPricingConfig: DEFAULT_PLAN_PRICING_CONFIG,
    },
  });
  await handlePaymentEndpoint(req, res, '/api/payments/verify-action');
  assert.equal(getStatus(), 401);
  assert.equal(getJson().ok, false);
  assert.equal(getJson().unauthorized, true);
});

test('Zero-conflict PH SikatPay lifecycle: mid-checkout price revert still honors in-flight discounted order, charges new buyers regular price, and rejects tampered amounts', async () => {
  resetOwnerVaultInMemoryForColdStartTests();

  const prevEnv = {
    SIKATPAY_API_KEY: process.env.SIKATPAY_API_KEY,
    SIKATPAY_WEBHOOK_SECRET: process.env.SIKATPAY_WEBHOOK_SECRET,
    SIKATPAY_API_BASE_URL: process.env.SIKATPAY_API_BASE_URL,
  };
  const prevFetch = globalThis.fetch;

  const sikatpayCapturedAmounts: number[] = [];
  let sikatpayCounter = 0;

  try {
    process.env.SIKATPAY_API_KEY = 'sk_live_test_pricing_key';
    process.env.SIKATPAY_WEBHOOK_SECRET = 'whsec_test_pricing_secret';
    process.env.SIKATPAY_API_BASE_URL = 'https://sikatpay.mock.local';

    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.endsWith('/payments') && init?.method === 'POST') {
        const body = JSON.parse(String(init.body || '{}'));
        sikatpayCapturedAmounts.push(Number(body.amount));
        sikatpayCounter += 1;
        return new Response(
          JSON.stringify({
            id: `sp_pay_${sikatpayCounter}`,
            checkout_url: `https://sikatpay.mock.local/pay/${sikatpayCounter}`,
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (url.includes('firestore.googleapis.com')) {
        if (init?.method === 'GET' || !init?.method) {
          return new Response(JSON.stringify({ error: { code: 404, status: 'NOT_FOUND' } }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        return new Response(
          JSON.stringify({ name: url, updateTime: new Date().toISOString() }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(JSON.stringify({ error: 'offline-test' }), { status: 503 });
    }) as typeof fetch;

    const adminDevice = 'owner-device-pricing-e2e-1234';
    const adminToken = createSignedAdminSessionToken(adminDevice);

    // 1. Admin configures PH Eternal = ₱249 original, Discount ON at ₱199
    const setDiscount = createMockReqRes({
      body: {
        action: 'update_plan_pricing_config',
        adminSessionToken: adminToken,
        deviceTokenHash: adminDevice,
        planPricingConfig: {
          ...DEFAULT_PLAN_PRICING_CONFIG,
          PH: {
            ...DEFAULT_PLAN_PRICING_CONFIG.PH,
            pass_30d: {
              originalAmountMinor: 24900,
              discountEnabled: true,
              discountedAmountMinor: 19900,
              promoBadge: '20% OFF',
            },
          },
          INTL: {
            ...DEFAULT_PLAN_PRICING_CONFIG.INTL,
            pass_30d: {
              originalAmountMinor: 699,
              discountEnabled: true,
              discountedAmountMinor: 499,
              promoBadge: 'USD Sale',
              discountKofiCode: 'eternalsale499',
            },
          },
        },
      },
    });
    await handlePaymentEndpoint(setDiscount.req, setDiscount.res, '/api/payments/verify-action');
    assert.equal(setDiscount.getStatus(), 200);
    assert.equal(setDiscount.getJson().ok, true);

    // 2. Buyer A starts PH Eternal checkout while discount (₱199) is active
    const buyerACheckout = createMockReqRes({
      headers: { 'x-vercel-ip-country': 'PH' },
      body: {
        tier: 'pass_30d',
        region: 'PH',
        provider: 'sikatpay',
        deviceTokenHash: 'buyer-a-device-hash-1111',
        origin: 'https://www.sendabouquet.online',
      },
    });
    await handlePaymentEndpoint(
      buyerACheckout.req,
      buyerACheckout.res,
      '/api/payments/create-checkout'
    );
    assert.equal(buyerACheckout.getStatus(), 200);
    const buyerAData = buyerACheckout.getJson();
    assert.equal(buyerAData.ok, true);
    assert.equal(buyerAData.plan.amountMinor, 19900);
    assert.equal(buyerAData.plan.originalAmountMinor, 24900);
    assert.equal(buyerAData.plan.isDiscounted, true);
    assert.equal(sikatpayCapturedAmounts[0], 19900);

    // 2b. USD Buyer starts Eternal Ko-fi checkout -> routes to custom discountKofiCode
    const usdCheckout = createMockReqRes({
      headers: { 'x-vercel-ip-country': 'US' },
      body: {
        tier: 'pass_30d',
        region: 'INTL',
        provider: 'kofi',
        deviceTokenHash: 'buyer-usd-device-hash-9999',
        origin: 'https://www.sendabouquet.online',
      },
    });
    await handlePaymentEndpoint(usdCheckout.req, usdCheckout.res, '/api/payments/create-checkout');
    assert.equal(usdCheckout.getStatus(), 200);
    const usdData = usdCheckout.getJson();
    assert.equal(usdData.plan.amountMinor, 499);
    assert.equal(usdData.plan.isDiscounted, true);
    assert.ok(String(usdData.checkoutUrl || '').includes('eternalsale499'));

    // 3. Mid-checkout: Admin disables PH Eternal discount -> reverts immediately to ₱249
    const turnOffDiscount = createMockReqRes({
      body: {
        action: 'update_plan_pricing_config',
        adminSessionToken: adminToken,
        deviceTokenHash: adminDevice,
        planPricingConfig: {
          ...DEFAULT_PLAN_PRICING_CONFIG,
          PH: {
            ...DEFAULT_PLAN_PRICING_CONFIG.PH,
            pass_30d: {
              originalAmountMinor: 24900,
              discountEnabled: false,
              discountedAmountMinor: 19900,
              promoBadge: '',
            },
          },
        },
      },
    });
    await handlePaymentEndpoint(
      turnOffDiscount.req,
      turnOffDiscount.res,
      '/api/payments/verify-action'
    );
    assert.equal(turnOffDiscount.getStatus(), 200);

    // 4. Buyer B starts PH Eternal checkout after discount turned off -> invoiced exact ₱249 (24900)
    const buyerBCheckout = createMockReqRes({
      headers: { 'x-vercel-ip-country': 'PH' },
      body: {
        tier: 'pass_30d',
        region: 'PH',
        provider: 'sikatpay',
        deviceTokenHash: 'buyer-b-device-hash-2222',
        origin: 'https://www.sendabouquet.online',
      },
    });
    await handlePaymentEndpoint(
      buyerBCheckout.req,
      buyerBCheckout.res,
      '/api/payments/create-checkout'
    );
    assert.equal(buyerBCheckout.getStatus(), 200);
    const buyerBData = buyerBCheckout.getJson();
    assert.equal(buyerBData.plan.amountMinor, 24900);
    assert.equal(buyerBData.plan.isDiscounted, false);
    assert.equal(sikatpayCapturedAmounts[1], 24900);

    const signSikatpayWebhook = (rawPayload: string) => {
      const ts = Math.floor(Date.now() / 1000);
      const sig = crypto
        .createHmac('sha256', 'whsec_test_pricing_secret')
        .update(`${ts}.${rawPayload}`)
        .digest('hex');
      return `t=${ts},v1=${sig}`;
    };

    // 5. Buyer A's SikatPay webhook arrives with locked ₱199 (19900) -> MUST SUCCEED even though live price is now ₱249!
    const buyerAWebhookPayload = JSON.stringify({
      type: 'payment.paid',
      livemode: true,
      data: {
        id: 'sp_pay_1',
        order_id: buyerAData.orderId,
        amount: 19900,
        currency: 'PHP',
        status: 'paid',
        livemode: true,
      },
    });
    const buyerAWebhook = createMockReqRes({
      rawBody: buyerAWebhookPayload,
      headers: { 'x-signature': signSikatpayWebhook(buyerAWebhookPayload) },
    });
    await handlePaymentEndpoint(buyerAWebhook.req, buyerAWebhook.res, '/api/webhooks/sikatpay');
    assert.equal(buyerAWebhook.getStatus(), 200);
    const buyerAPassKey = buyerAWebhook.getJson().passKey;
    assert.ok(buyerAPassKey);
    assert.equal(PAID_PASS_LEDGER.get(buyerAPassKey)?.amountMinor, 19900);

    // 6. Tampered webhook for Buyer B paying old 19900 instead of locked 24900 -> MUST REJECT with HTTP 400!
    const tamperedBPayload = JSON.stringify({
      type: 'payment.paid',
      livemode: true,
      data: {
        id: 'sp_pay_2',
        order_id: buyerBData.orderId,
        amount: 19900,
        currency: 'PHP',
        status: 'paid',
        livemode: true,
      },
    });
    const tamperedBWebhook = createMockReqRes({
      rawBody: tamperedBPayload,
      headers: { 'x-signature': signSikatpayWebhook(tamperedBPayload) },
    });
    await handlePaymentEndpoint(
      tamperedBWebhook.req,
      tamperedBWebhook.res,
      '/api/webhooks/sikatpay'
    );
    assert.equal(tamperedBWebhook.getStatus(), 400);

    // 7. Legitimate webhook for Buyer B paying exact locked ₱249 (24900) -> SUCCEEDS and records exact 24900!
    const validBPayload = JSON.stringify({
      type: 'payment.paid',
      livemode: true,
      data: {
        id: 'sp_pay_2',
        order_id: buyerBData.orderId,
        amount: 24900,
        currency: 'PHP',
        status: 'paid',
        livemode: true,
      },
    });
    const validBWebhook = createMockReqRes({
      rawBody: validBPayload,
      headers: { 'x-signature': signSikatpayWebhook(validBPayload) },
    });
    await handlePaymentEndpoint(validBWebhook.req, validBWebhook.res, '/api/webhooks/sikatpay');
    assert.equal(validBWebhook.getStatus(), 200);
    const buyerBPassKey = validBWebhook.getJson().passKey;
    assert.ok(buyerBPassKey);
    assert.equal(PAID_PASS_LEDGER.get(buyerBPassKey)?.amountMinor, 24900);
  } finally {
    globalThis.fetch = prevFetch;
    if (prevEnv.SIKATPAY_API_KEY === undefined) delete process.env.SIKATPAY_API_KEY;
    else process.env.SIKATPAY_API_KEY = prevEnv.SIKATPAY_API_KEY;
    if (prevEnv.SIKATPAY_WEBHOOK_SECRET === undefined) delete process.env.SIKATPAY_WEBHOOK_SECRET;
    else process.env.SIKATPAY_WEBHOOK_SECRET = prevEnv.SIKATPAY_WEBHOOK_SECRET;
    if (prevEnv.SIKATPAY_API_BASE_URL === undefined) delete process.env.SIKATPAY_API_BASE_URL;
    else process.env.SIKATPAY_API_BASE_URL = prevEnv.SIKATPAY_API_BASE_URL;
    resetOwnerVaultInMemoryForColdStartTests();
  }
});
