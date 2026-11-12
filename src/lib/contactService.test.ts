import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OFFICIAL_STUDIO_EMAIL,
  CONTACT_TOPICS,
  getContactTopicOption,
  validateContactSubmission,
  validateBouquetEmailDelivery,
  sendBouquetSurpriseEmail,
  generateClientContactMessageId,
} from './contactService';
import { createSignedStudioPass } from './monetization';
// @ts-expect-error Testing shared backend handler functions
import { validateContactPayload, validateBouquetEmailPayload, buildStudioNotificationEmail, buildVisitorConfirmationEmail, buildBouquetSurpriseEmail, resolveBouquetFromAddress, processBouquetEmailDelivery } from '../../api/_lib/contactHandler.js';
// @ts-expect-error Testing shared backend payment helpers
import { createSignedStudioPassServer, SERVER_PASS_STORE } from '../../api/_lib/paymentHandler.js';

test('OFFICIAL_STUDIO_EMAIL is set to hello@sendabouquet.online', () => {
  assert.equal(OFFICIAL_STUDIO_EMAIL, 'hello@sendabouquet.online');
});

test('CONTACT_TOPICS includes Flower Wish, Feedback, Order Help, and General Note', () => {
  const ids = CONTACT_TOPICS.map((t) => t.id);
  assert.deepEqual(ids, ['flower_wish', 'feedback', 'order_help', 'general']);
  assert.equal(getContactTopicOption('flower_wish').label, 'Flower Wish');
  assert.equal(getContactTopicOption('order_help').label, 'Order Help');
});

test('validateContactSubmission rejects empty or too-short messages', () => {
  const emptyRes = validateContactSubmission({ topic: 'feedback', message: '  ' });
  assert.equal(emptyRes.ok, false);
  if (!emptyRes.ok) {
    assert.match(emptyRes.error, /brief note/i);
  }
});

test('validateContactSubmission requires replyToEmail when topic is order_help', () => {
  const noEmailOrder = validateContactSubmission({
    topic: 'order_help',
    name: 'Clara',
    replyToEmail: '',
    message: 'I bought a 7-day pass on Ko-fi and need my key resent.',
  });
  assert.equal(noEmailOrder.ok, false);
  if (!noEmailOrder.ok) {
    assert.match(noEmailOrder.error, /email address/i);
  }

  const withEmailOrder = validateContactSubmission({
    topic: 'order_help',
    name: 'Clara',
    replyToEmail: 'clara@example.com',
    message: 'I bought a 7-day pass on Ko-fi and need my key resent.',
  });
  assert.equal(withEmailOrder.ok, true);
});

test('validateContactSubmission rejects malformed replyToEmail', () => {
  const badEmail = validateContactSubmission({
    topic: 'flower_wish',
    replyToEmail: 'not-an-email',
    message: 'Please add Lily of the Valley!',
  });
  assert.equal(badEmail.ok, false);
});

test('generateClientContactMessageId matches Firestore security rule pattern', () => {
  const id = generateClientContactMessageId(1700000000000);
  assert.match(id, /^msg_[0-9]{10,16}_[a-zA-Z0-9]{4,16}$/);
});

test('backend email builders include sender details, reply-to, ruled paper lines, lace, and drawn crest', () => {
  const backendCheck = validateContactPayload({
    topic: 'flower_wish',
    name: 'Mina',
    replyToEmail: 'mina@example.com',
    message: 'Would love a white gardenia stem!',
  });
  assert.equal(backendCheck.ok, true);

  const studioEmail = buildStudioNotificationEmail({
    topicLabel: 'Flower Wish',
    senderName: 'Mina',
    replyToEmail: 'mina@example.com',
    message: 'Would love a white gardenia stem!',
    createdAt: '2026-11-11T00:00:00.000Z',
    messageId: 'msg_1700000000000_abc123',
  });
  assert.match(studioEmail.subject, /Flower Wish/);
  assert.match(studioEmail.subject, /Mina/);
  assert.match(studioEmail.html, /mina@example\.com/);
  assert.match(studioEmail.html, /hero-bloom-crest\.png/);
  assert.match(studioEmail.html, /border-bottom:1px dashed #DFCEC0/);

  const visitorEmail = buildVisitorConfirmationEmail({
    topicLabel: 'Flower Wish',
    senderName: 'Mina',
    message: 'Would love a white gardenia stem!',
  });
  assert.match(visitorEmail.subject, /Send A Bouquet/);
  assert.match(visitorEmail.html, /hello@sendabouquet\.online/);
  assert.match(visitorEmail.html, /white gardenia/);
  assert.match(visitorEmail.html, /hero-bloom-crest\.png/);
  assert.match(visitorEmail.html, /border-bottom:1px dashed #DFCEC0/);
});

test('Surprise Bouquet Email delivery uses imageless minimal personal format without keepsake spoilers', () => {
  const invalidCheck = validateBouquetEmailDelivery({
    recipientEmail: 'invalid-email',
    giftUrl: 'https://www.sendabouquet.online/abc1234',
  });
  assert.equal(invalidCheck.ok, false);

  const validCheck = validateBouquetEmailPayload({
    recipientEmail: 'sophia@example.com',
    recipientName: 'Sophia',
    giftUrl: 'https://www.sendabouquet.online/abc1234',
    hasVoiceNote: true,
    hasPhotoCard: true,
    isLocked: false,
  });
  assert.equal(validCheck.ok, true);

  const surpriseMail = buildBouquetSurpriseEmail({
    recipientName: 'Sophia',
    giftUrl: 'https://www.sendabouquet.online/abc1234',
    hasVoiceNote: true,
    hasPhotoCard: true,
    isLocked: true,
  });
  assert.equal(surpriseMail.subject, 'For Sophia — someone sent you a bouquet');
  assert.match(surpriseMail.html, /<p[^>]*>For Sophia,<\/p>/);
  assert.match(surpriseMail.html, /https:\/\/www\.sendabouquet\.online\/abc1234/);
  assert.match(surpriseMail.text, /^For Sophia,\n\n[^\n]+\n\nhttps:\/\/www\.sendabouquet\.online\/abc1234$/);

  // Zero promotional/spoiler patterns
  assert.doesNotMatch(surpriseMail.html, /<img\b/i);
  assert.doesNotMatch(surpriseMail.html, /display\s*:\s*none/i);
  assert.doesNotMatch(surpriseMail.html, /Open Your Bouquet/i);
  assert.doesNotMatch(surpriseMail.html, /Voice keepsake|Photo keepsake|Secret lock reveal|Floral arrangement/i);
  assert.doesNotMatch(surpriseMail.text, /Voice keepsake|Photo keepsake|Secret lock reveal|Floral arrangement/i);
  assert.doesNotMatch(surpriseMail.html, /Julian/);
});

test('resolveBouquetFromAddress and processBouquetEmailDelivery strictly require Couture or Single-Bouquet unlock', async () => {
  assert.equal(
    resolveBouquetFromAddress({}),
    'Send A Bouquet <deliveries@sendabouquet.online>'
  );
  assert.equal(
    resolveBouquetFromAddress({ BOUQUET_FROM_EMAIL: 'Send A Bouquet <custom@sendabouquet.online>' }),
    'Send A Bouquet <custom@sendabouquet.online>'
  );

  // Client guard blocks free user (null pass) before network call
  const clientFreeResult = await sendBouquetSurpriseEmail({
    recipientEmail: 'sophia@example.com',
    recipientName: 'Sophia',
    giftUrl: 'https://www.sendabouquet.online/abc1234',
    pass: null,
  });
  assert.equal(clientFreeResult.ok, false);
  assert.match(clientFreeResult.error || '', /Couture|Single-Bouquet|Bloom Pass/i);

  const originalFetch = globalThis.fetch;
  const prevKey = process.env.RESEND_API_KEY;
  const prevBouquetFrom = process.env.BOUQUET_FROM_EMAIL;
  const capturedBodies: Array<Record<string, unknown>> = [];

  try {
    process.env.RESEND_API_KEY = 're_test_123';
    delete process.env.BOUQUET_FROM_EMAIL;

    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
      const targetUrl = String(_url || '');
      if (targetUrl.startsWith('https://api.resend.com/')) {
        capturedBodies.push(JSON.parse(String(init?.body || '{}')) as Record<string, unknown>);
        return new Response(JSON.stringify({ id: 'email_123' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    }) as typeof fetch;

    // 1. Free user (no pass) MUST be rejected on server with 403 and zero Resend calls
    const freeServerRes = await processBouquetEmailDelivery({
      recipientEmail: 'sophia@example.com',
      recipientName: 'Sophia',
      giftUrl: 'https://www.sendabouquet.online/abc1234',
    });
    assert.equal(freeServerRes.statusCode, 403);
    assert.equal(capturedBodies.length, 0);

    // 2. Client-forged pass without valid server HMAC paymentReference MUST be rejected with 403
    const devHash = 'device_hash_1234567890abcdef';
    const forgedPass = createSignedStudioPass({
      tier: 'pass_30d',
      region: 'INTL',
      deviceTokenHash: devHash,
      paymentReference: 'forged_fake_ref',
    });
    const forgedServerRes = await processBouquetEmailDelivery({
      recipientEmail: 'sophia@example.com',
      recipientName: 'Sophia',
      giftUrl: 'https://www.sendabouquet.online/abc1234',
      pass: forgedPass,
      deviceTokenHash: devHash,
      bouquetCode: 'abc1234',
    });
    assert.equal(forgedServerRes.statusCode, 403);
    assert.equal(capturedBodies.length, 0);

    // 3. Single-Bouquet pass bound to bouquet A ('abc1234') succeeds for 'abc1234', fails for 'xyz9999'
    const singlePass = createSignedStudioPassServer({
      tier: 'single',
      region: 'INTL',
      deviceTokenHash: devHash,
      boundBouquetCode: 'abc1234',
      paymentProvider: 'kofi',
    });
    SERVER_PASS_STORE.set(singlePass.passKey, singlePass);
    const wrongBouquetRes = await processBouquetEmailDelivery({
      recipientEmail: 'sophia@example.com',
      recipientName: 'Sophia',
      giftUrl: 'https://www.sendabouquet.online/xyz9999',
      pass: singlePass,
      deviceTokenHash: devHash,
      bouquetCode: 'xyz9999',
    });
    assert.equal(wrongBouquetRes.statusCode, 403);
    assert.equal(capturedBodies.length, 0);

    const validSingleRes = await processBouquetEmailDelivery({
      recipientEmail: 'sophia@example.com',
      recipientName: 'Sophia',
      giftUrl: 'https://www.sendabouquet.online/abc1234',
      pass: singlePass,
      deviceTokenHash: devHash,
      bouquetCode: 'abc1234',
    });
    assert.equal(validSingleRes.statusCode, 200);
    assert.equal(validSingleRes.body.emailDispatched, true);
    assert.equal(capturedBodies.length, 1);

    // 4. Active 7-Day Pass succeeds with deliveries@ sender and standard headers
    const pass7d = createSignedStudioPassServer({
      tier: 'pass_7d',
      region: 'INTL',
      deviceTokenHash: devHash,
      paymentProvider: 'kofi',
    });
    SERVER_PASS_STORE.set(pass7d.passKey, pass7d);
    const pass7dRes = await processBouquetEmailDelivery({
      recipientEmail: 'sophia@example.com',
      recipientName: 'Sophia',
      giftUrl: 'https://www.sendabouquet.online/xyz9999',
      pass: pass7d,
      deviceTokenHash: devHash,
      bouquetCode: 'xyz9999',
    });
    assert.equal(pass7dRes.statusCode, 200);
    assert.equal(pass7dRes.body.emailDispatched, true);
    assert.equal(capturedBodies.length, 2);
    assert.equal(capturedBodies[1].from, 'Send A Bouquet <deliveries@sendabouquet.online>');
    assert.equal(capturedBodies[1].headers, undefined);
  } finally {
    globalThis.fetch = originalFetch;
    if (prevKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = prevKey;
    if (prevBouquetFrom === undefined) delete process.env.BOUQUET_FROM_EMAIL;
    else process.env.BOUQUET_FROM_EMAIL = prevBouquetFrom;
  }
});




