import crypto from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  createSignedStudioPass,
  isValidPassKeyFormat,
  normalizePassKey,
  PRICING_CATALOG,
  PricingRegion,
  StudioPassRecord,
  StudioPassTier,
  validateAndBindPassRedemption,
  verifyActiveStudioPassForAction,
} from '../lib/monetization';

const SERVER_PASS_STORE = new Map<string, StudioPassRecord>();

interface PendingCheckoutRecord {
  checkoutId: string;
  checkoutToken: string;
  passKey: string;
  tier: StudioPassTier;
  region: PricingRegion;
  deviceTokenHash: string;
  boundBouquetCode: string | null;
  provider: 'paymongo' | 'kofi';
  paymongoSessionId?: string;
  checkoutUrl?: string | null;
  status: 'pending' | 'paid';
  createdAtMs: number;
}

const PENDING_CHECKOUT_STORE = new Map<string, PendingCheckoutRecord>();

function getServerSigningSalt(): string {
  return process.env.PASS_SIGNING_SECRET || 'sab-pass-integrity-2026-v1';
}

function timingSafeMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a || '', 'utf8');
  const bufB = Buffer.from(b || '', 'utf8');
  if (bufA.length !== bufB.length || bufA.length === 0) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verifies a PayMongo webhook signature header (`t=...,te=...,li=...`).
 */
export function verifyPaymongoWebhookSignature(
  rawBody: string,
  signatureHeader: string | undefined,
  webhookSecret: string
): boolean {
  if (!signatureHeader || !webhookSecret) return false;
  const parts: Record<string, string> = {};
  for (const segment of signatureHeader.split(',')) {
    const [k, v] = segment.trim().split('=');
    if (k && v) parts[k] = v;
  }
  const timestamp = parts.t;
  const candidateSig = parts.li || parts.te;
  if (!timestamp || !candidateSig) return false;

  const signedPayload = `${timestamp}.${rawBody}`;
  const expectedSig = crypto
    .createHmac('sha256', webhookSecret)
    .update(signedPayload, 'utf8')
    .digest('hex');

  return timingSafeMatch(expectedSig, candidateSig);
}

function readJsonBody(req: IncomingMessage): Promise<{ raw: string; parsed: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!raw.trim()) {
        resolve({ raw: '', parsed: {} });
        return;
      }
      try {
        // Support application/x-www-form-urlencoded for Ko-fi webhook (`data={...}`)
        if (raw.startsWith('data=')) {
          const params = new URLSearchParams(raw);
          const dataStr = params.get('data') || '{}';
          resolve({ raw, parsed: JSON.parse(dataStr) });
          return;
        }
        resolve({ raw, parsed: JSON.parse(raw) });
      } catch {
        resolve({ raw, parsed: {} });
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, statusCode: number, data: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

function isValidTier(tier: unknown): tier is StudioPassTier {
  return tier === 'single' || tier === 'pass_7d' || tier === 'pass_30d';
}

function isValidRegion(region: unknown): region is PricingRegion {
  return region === 'PH' || region === 'INTL';
}

export async function handlePaymentApiMiddleware(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const urlObj = new URL(req.url || '/', 'http://localhost');
  const pathname = urlObj.pathname;

  if (!pathname.startsWith('/api/payments/') && !pathname.startsWith('/api/webhooks/')) {
    return false;
  }

  try {
    // 1. POST /api/payments/create-checkout
    if (pathname === '/api/payments/create-checkout' && req.method === 'POST') {
      const { parsed } = await readJsonBody(req);
      const tier = isValidTier(parsed.tier) ? parsed.tier : 'pass_7d';
      const region = isValidRegion(parsed.region) ? parsed.region : 'PH';
      const provider = parsed.provider === 'kofi' ? 'kofi' : 'paymongo';
      const deviceTokenHash =
        typeof parsed.deviceTokenHash === 'string' && parsed.deviceTokenHash.length >= 8
          ? parsed.deviceTokenHash.slice(0, 64)
          : 'anonymous_device_hash';
      const boundBouquetCode =
        typeof parsed.bouquetCode === 'string' && parsed.bouquetCode.trim()
          ? parsed.bouquetCode.trim().slice(0, 48)
          : null;

      const plan = PRICING_CATALOG[region][tier];
      const checkoutId = `chk_${crypto.randomBytes(8).toString('hex')}`;
      const checkoutToken = crypto
        .createHmac('sha256', getServerSigningSalt())
        .update(`${checkoutId}:${tier}:${region}:${deviceTokenHash}`)
        .digest('hex');

      const draftPass = createSignedStudioPass({
        tier,
        region,
        deviceTokenHash,
        boundBouquetCode,
        paymentProvider: provider,
        paymentReference: checkoutId,
        secretSalt: getServerSigningSalt(),
      });

      let checkoutUrl: string | null = null;
      let paymongoSessionId: string | undefined;
      let liveGatewayConfigured = false;

      const paymongoSecret = process.env.PAYMONGO_SECRET_KEY?.trim();
      const kofiUrl = process.env.KOFI_PAGE_URL?.trim();

      if (provider === 'paymongo' && paymongoSecret) {
        liveGatewayConfigured = true;
        try {
          const authHeader = `Basic ${Buffer.from(`${paymongoSecret}:`).toString('base64')}`;
          const origin =
            typeof parsed.origin === 'string' && parsed.origin.startsWith('http')
              ? parsed.origin
              : 'http://localhost:3000';
          const pmRes = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
            method: 'POST',
            headers: {
              Authorization: authHeader,
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify({
              data: {
                attributes: {
                  send_email_receipt: false,
                  show_description: true,
                  show_line_items: true,
                  description: `Send A Bouquet — ${plan.name} (${draftPass.passKey})`,
                  reference_number: draftPass.passKey,
                  payment_method_types:
                    region === 'PH'
                      ? ['qrph', 'gcash', 'paymaya', 'card']
                      : ['card', 'gcash', 'paymaya'],
                  line_items: [
                    {
                      currency: 'PHP',
                      amount: region === 'PH' ? plan.amountMinor : PRICING_CATALOG.PH[tier].amountMinor,
                      name: `Send A Bouquet · ${plan.name}`,
                      quantity: 1,
                    },
                  ],
                  success_url: `${origin}/?checkout_success=${encodeURIComponent(checkoutId)}`,
                  cancel_url: `${origin}/?checkout_cancelled=1`,
                  metadata: {
                    checkoutId,
                    passKey: draftPass.passKey,
                    tier,
                    region,
                    deviceTokenHash,
                  },
                },
              },
            }),
          });
          if (pmRes.ok) {
            const pmJson = (await pmRes.json()) as {
              data?: { id?: string; attributes?: { checkout_url?: string } };
            };
            paymongoSessionId = pmJson.data?.id;
            checkoutUrl = pmJson.data?.attributes?.checkout_url || null;
          }
        } catch {
          // Fallback to instant preview checkout verification if network call fails
        }
      } else if (provider === 'kofi' && kofiUrl) {
        liveGatewayConfigured = true;
        checkoutUrl = kofiUrl;
      }

      PENDING_CHECKOUT_STORE.set(checkoutId, {
        checkoutId,
        checkoutToken,
        passKey: draftPass.passKey,
        tier,
        region,
        deviceTokenHash,
        boundBouquetCode,
        provider,
        paymongoSessionId,
        checkoutUrl,
        status: 'pending',
        createdAtMs: Date.now(),
      });

      sendJson(res, 200, {
        ok: true,
        checkoutId,
        checkoutToken,
        passKeyPreview: draftPass.passKey,
        plan,
        provider,
        checkoutUrl,
        liveGatewayConfigured,
      });
      return true;
    }

    // 2. POST /api/payments/verify-and-issue
    if (pathname === '/api/payments/verify-and-issue' && req.method === 'POST') {
      const { parsed } = await readJsonBody(req);
      const checkoutId = typeof parsed.checkoutId === 'string' ? parsed.checkoutId : '';
      const checkoutToken = typeof parsed.checkoutToken === 'string' ? parsed.checkoutToken : '';
      const deviceTokenHash =
        typeof parsed.deviceTokenHash === 'string' ? parsed.deviceTokenHash : '';

      const pending = PENDING_CHECKOUT_STORE.get(checkoutId);
      if (!pending) {
        sendJson(res, 404, {
          ok: false,
          message: 'Checkout session not found or expired. Please start checkout again.',
        });
        return true;
      }

      if (!timingSafeMatch(pending.checkoutToken, checkoutToken)) {
        sendJson(res, 403, {
          ok: false,
          message: 'Invalid checkout verification token.',
        });
        return true;
      }

      if (pending.deviceTokenHash !== deviceTokenHash) {
        sendJson(res, 403, {
          ok: false,
          message: 'Device mismatch during checkout verification.',
        });
        return true;
      }

      // If PayMongo live session is present, verify payment status with PayMongo API
      const paymongoSecret = process.env.PAYMONGO_SECRET_KEY?.trim();
      if (pending.paymongoSessionId && paymongoSecret && pending.status !== 'paid') {
        try {
          const authHeader = `Basic ${Buffer.from(`${paymongoSecret}:`).toString('base64')}`;
          const checkRes = await fetch(
            `https://api.paymongo.com/v1/checkout_sessions/${encodeURIComponent(
              pending.paymongoSessionId
            )}`,
            {
              headers: {
                Authorization: authHeader,
                Accept: 'application/json',
              },
            }
          );
          if (checkRes.ok) {
            const checkJson = (await checkRes.json()) as {
              data?: {
                attributes?: {
                  payment_intent?: { attributes?: { status?: string } };
                  payments?: Array<{ attributes?: { status?: string } }>;
                };
              };
            };
            const piStatus = checkJson.data?.attributes?.payment_intent?.attributes?.status;
            const hasPaidEntry = checkJson.data?.attributes?.payments?.some(
              (p) => p.attributes?.status === 'paid'
            );
            if (piStatus !== 'succeeded' && !hasPaidEntry) {
              sendJson(res, 402, {
                ok: false,
                status: 'PENDING_PAYMENT',
                message: 'Payment is still awaiting confirmation from PayMongo.',
              });
              return true;
            }
          }
        } catch {
          // Allow fallback if offline
        }
      }

      pending.status = 'paid';
      let passRecord = SERVER_PASS_STORE.get(pending.passKey);
      if (!passRecord) {
        passRecord = createSignedStudioPass({
          passKey: pending.passKey,
          tier: pending.tier,
          region: pending.region,
          deviceTokenHash: pending.deviceTokenHash,
          boundBouquetCode: pending.boundBouquetCode,
          paymentProvider: pending.provider,
          paymentReference: pending.checkoutId,
          secretSalt: getServerSigningSalt(),
        });
        SERVER_PASS_STORE.set(passRecord.passKey, passRecord);
      }

      sendJson(res, 200, {
        ok: true,
        pass: passRecord,
      });
      return true;
    }

    // 3. POST /api/payments/redeem-pass
    if (pathname === '/api/payments/redeem-pass' && req.method === 'POST') {
      const { parsed } = await readJsonBody(req);
      const rawKey = typeof parsed.passKey === 'string' ? parsed.passKey : '';
      const passKey = normalizePassKey(rawKey);
      const deviceTokenHash =
        typeof parsed.deviceTokenHash === 'string' && parsed.deviceTokenHash.length >= 8
          ? parsed.deviceTokenHash
          : '';

      if (!isValidPassKeyFormat(passKey) || !deviceTokenHash) {
        sendJson(res, 400, {
          ok: false,
          status: 'INVALID_FORMAT',
          message: 'Please enter a valid Pass Key (e.g., BLOOM-7K4M-9P2X).',
        });
        return true;
      }

      // Look up in server pass store, or accept client-supplied Firestore record if its HMAC signature is valid
      let existingRecord = SERVER_PASS_STORE.get(passKey) || null;
      if (!existingRecord && parsed.existingRecord && typeof parsed.existingRecord === 'object') {
        existingRecord = parsed.existingRecord as StudioPassRecord;
      }

      if (!existingRecord) {
        sendJson(res, 404, {
          ok: false,
          status: 'NOT_FOUND',
          message: 'Pass Key not found. Double-check your code or complete checkout first.',
        });
        return true;
      }

      const result = validateAndBindPassRedemption(
        existingRecord,
        deviceTokenHash,
        Date.now(),
        getServerSigningSalt()
      );

      if (!result.valid || !result.updatedPass) {
        sendJson(res, 403, {
          ok: false,
          status: result.status,
          message: result.message,
        });
        return true;
      }

      SERVER_PASS_STORE.set(passKey, result.updatedPass);
      sendJson(res, 200, {
        ok: true,
        status: result.status,
        message: result.message,
        pass: result.updatedPass,
      });
      return true;
    }

    // 4. POST /api/payments/verify-action
    if (pathname === '/api/payments/verify-action' && req.method === 'POST') {
      const { parsed } = await readJsonBody(req);
      const clientPass = (parsed.pass || null) as StudioPassRecord | null;
      const deviceTokenHash =
        typeof parsed.deviceTokenHash === 'string' ? parsed.deviceTokenHash : '';
      const bouquetCode =
        typeof parsed.bouquetCode === 'string' ? parsed.bouquetCode : null;
      const incrementUsage = Boolean(parsed.incrementUsage);

      if (!clientPass || !isValidPassKeyFormat(clientPass.passKey)) {
        sendJson(res, 403, {
          ok: false,
          status: 'INVALID_FORMAT',
          message: 'No valid Studio Pass found.',
        });
        return true;
      }

      const canonicalPass =
        SERVER_PASS_STORE.get(normalizePassKey(clientPass.passKey)) || clientPass;

      const check = verifyActiveStudioPassForAction({
        pass: canonicalPass,
        deviceTokenHash,
        clientSessionNonce: clientPass.activeSessionNonce,
        bouquetCode,
        incrementUsage,
        secretSalt: getServerSigningSalt(),
      });

      if (!check.valid || !check.updatedPass) {
        sendJson(res, 403, {
          ok: false,
          status: check.status,
          message: check.message,
        });
        return true;
      }

      SERVER_PASS_STORE.set(check.updatedPass.passKey, check.updatedPass);
      sendJson(res, 200, {
        ok: true,
        status: 'VALID',
        pass: check.updatedPass,
      });
      return true;
    }

    // 5. POST /api/webhooks/paymongo — Real-time PayMongo Webhook Listener
    if (pathname === '/api/webhooks/paymongo' && req.method === 'POST') {
      const { raw, parsed } = await readJsonBody(req);
      const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET?.trim() || '';
      const sigHeader = req.headers['paymongo-signature'] as string | undefined;

      if (webhookSecret && !verifyPaymongoWebhookSignature(raw, sigHeader, webhookSecret)) {
        sendJson(res, 401, { ok: false, message: 'Invalid PayMongo webhook signature' });
        return true;
      }

      const dataObj = (parsed.data || {}) as {
        attributes?: {
          type?: string;
          data?: {
            attributes?: {
              reference_number?: string;
              metadata?: Record<string, string>;
            };
          };
        };
      };
      const eventType = dataObj.attributes?.type || '';
      const resourceAttrs = dataObj.attributes?.data?.attributes || {};
      const metadata = resourceAttrs.metadata || {};
      const checkoutId = metadata.checkoutId || '';
      const passKey = normalizePassKey(
        metadata.passKey || resourceAttrs.reference_number || ''
      );

      if (
        eventType.includes('paid') ||
        eventType.includes('succeeded')
      ) {
        if (checkoutId && PENDING_CHECKOUT_STORE.has(checkoutId)) {
          const pending = PENDING_CHECKOUT_STORE.get(checkoutId)!;
          pending.status = 'paid';
          const signedPass = createSignedStudioPass({
            passKey: pending.passKey,
            tier: pending.tier,
            region: pending.region,
            deviceTokenHash: pending.deviceTokenHash,
            boundBouquetCode: pending.boundBouquetCode,
            paymentProvider: 'paymongo',
            paymentReference: checkoutId,
            secretSalt: getServerSigningSalt(),
          });
          SERVER_PASS_STORE.set(signedPass.passKey, signedPass);
        } else if (isValidPassKeyFormat(passKey)) {
          const tier = isValidTier(metadata.tier) ? metadata.tier : 'pass_7d';
          const region = isValidRegion(metadata.region) ? metadata.region : 'PH';
          const signedPass = createSignedStudioPass({
            passKey,
            tier,
            region,
            deviceTokenHash: metadata.deviceTokenHash || '',
            paymentProvider: 'paymongo',
            paymentReference: `pm_webhook_${Date.now()}`,
            secretSalt: getServerSigningSalt(),
          });
          SERVER_PASS_STORE.set(signedPass.passKey, signedPass);
        }
      }

      sendJson(res, 200, { ok: true });
      return true;
    }

    // 6. POST /api/webhooks/kofi — Real-time Ko-fi Webhook Listener
    if (pathname === '/api/webhooks/kofi' && req.method === 'POST') {
      const { parsed } = await readJsonBody(req);
      const expectedToken = process.env.KOFI_VERIFICATION_TOKEN?.trim() || '';
      const incomingToken =
        typeof parsed.verification_token === 'string' ? parsed.verification_token : '';

      if (expectedToken && !timingSafeMatch(expectedToken, incomingToken)) {
        sendJson(res, 401, { ok: false, message: 'Invalid Ko-fi verification token' });
        return true;
      }

      const amount = Number.parseFloat(String(parsed.amount || '0'));
      const message = String(parsed.message || '');
      const kofiTxId = String(parsed.kofi_transaction_id || `kofi_${Date.now()}`);

      const tier: StudioPassTier =
        amount >= 8.5 ? 'pass_30d' : amount >= 4.5 ? 'pass_7d' : 'single';

      // Extract BLOOM-XXXX-XXXX if user included their preview key in Ko-fi message, otherwise mint new
      const keyMatch = message.toUpperCase().match(/BLOOM-[A-Z2-9]{4}-[A-Z2-9]{4}/);
      const passKey = keyMatch ? keyMatch[0] : undefined;

      const signedPass = createSignedStudioPass({
        passKey,
        tier,
        region: 'INTL',
        deviceTokenHash: '', // Will bind to first device that redeems this Ko-fi Pass Key
        paymentProvider: 'kofi',
        paymentReference: kofiTxId,
        secretSalt: getServerSigningSalt(),
      });
      SERVER_PASS_STORE.set(signedPass.passKey, signedPass);

      sendJson(res, 200, {
        ok: true,
        passKey: signedPass.passKey,
        tier: signedPass.tier,
      });
      return true;
    }

    sendJson(res, 404, { ok: false, message: 'Unknown payment endpoint' });
    return true;
  } catch (err) {
    console.error('Payment API middleware error:', err);
    sendJson(res, 500, { ok: false, message: 'Internal payment processing error' });
    return true;
  }
}
