import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import {
  encodeBouquetToCompactPayload,
  decodeBouquetFromHash,
  hydrateSnapshotWithFirestoreRecord,
} from './shareAndExport';
import {
  classifyAdminBouquetStatus,
  collectAssetIdsFromBouquetRecord,
  countAdminBouquetStatuses,
  extractOverflowAssetsFromPayload,
  extractShortCodeFromInput,
  filterAdminBouquetLog,
  inspectPayloadAssetsSummary,
  isGarlandDisplayExpired,
  rehydrateBouquetRecordWithAssets,
  AdminBouquetLogEntry,
} from './bouquetPersistence';
import { isShowcaseBouquetExpired } from './showcaseGallery';
import { BouquetSnapshot } from '../types/bouquet';
import {
  extractOverflowAssetsFromPayloadServer,
  rehydrateBouquetRecordWithAssetsServer,
  stripInlinePhotosFromCompactPayloadServer,
  // @ts-expect-error Plain ESM server helper without .d.ts
} from '../../api/_lib/bouquetAssetsHelper.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import shortenHandler, {
  clearShortCodeMemoryForTesting,
  invalidateGarlandFeedMemoryCache,
  publishToGarlandFeedRest,
  // @ts-expect-error Plain ESM API handler without .d.ts
} from '../../api/shorten.js';
import {
  removeCodesFromGarlandFeedInBlob,
  setBlobClientForTesting,
  upsertGarlandFeedInBlob,
  // @ts-expect-error Plain ESM server helper without .d.ts
} from '../../api/_lib/blobStorage.js';
import {
  createSignedAdminSessionToken,
  createSignedStudioPassServer,
  fetchStudioPassFromFirestoreRest,
  handlePaymentEndpoint,
  hydratePersistentOwnerVaultServer,
  isPhPaymentsDisabledServer,
  mutateAndSaveOwnerVaultServer,
  OWNER_ANALYTICS_STATE,
  OWNER_BOUQUET_LOG_DOC_CODE,
  OWNER_VAULT_DOC_CODE,
  PAID_PASS_LEDGER,
  recordBouquetInAdminLogServer,
  resetOwnerBouquetLogStateForTesting,
  resetOwnerVaultInMemoryForColdStartTests,
  // @ts-expect-error Plain ESM server handler without .d.ts
} from '../../api/_lib/paymentHandler.js';

const handleVerifyAction = (req: unknown, res: unknown) =>
  handlePaymentEndpoint(req, res, '/api/payments/verify-action');

function createMockReqRes(method: string, url: string, bodyObj?: unknown) {
  const rawBody = bodyObj !== undefined ? JSON.stringify(bodyObj) : '';
  const req = Readable.from(rawBody ? [Buffer.from(rawBody, 'utf8')] : []) as Readable & {
    method: string;
    url: string;
    headers: Record<string, string>;
    socket: { remoteAddress: string };
  };
  req.method = method;
  req.url = url;
  req.headers = {
    host: 'localhost:3000',
    'content-type': 'application/json',
    'user-agent': 'Mozilla/5.0 UnitTest',
  };
  req.socket = { remoteAddress: '127.0.0.1' };

  let statusCode = 200;
  const headers: Record<string, string> = {};
  let rawOut = '';
  const res = {
    get statusCode() {
      return statusCode;
    },
    set statusCode(code: number) {
      statusCode = code;
    },
    setHeader(name: string, val: string) {
      headers[name.toLowerCase()] = val;
    },
    getHeader(name: string) {
      return headers[name.toLowerCase()];
    },
    end(chunk?: string) {
      if (chunk) rawOut += String(chunk);
    },
    json() {
      return rawOut ? JSON.parse(rawOut) : null;
    },
  };

  return { req, res };
}

/**
 * In-memory Firestore REST mock supporting GET, PATCH (with currentDocument.updateTime / exists CAS), and DELETE.
 */
function createMockFirestoreFetch(options?: { failFirstGarlandCas?: boolean }) {
  const docs = new Map<string, { fields: Record<string, unknown>; updateTime: string }>();
  let versionCounter = 1;
  let garlandCasFailRemaining = options?.failFirstGarlandCas ? 1 : 0;

  const mockFetch = async (input: unknown, init?: { method?: string; body?: string }) => {
    const urlStr = String(input);
    const method = (init?.method || 'GET').toUpperCase();

    if (urlStr.includes('is.gd')) {
      return {
        ok: false,
        status: 404,
        headers: { get: () => null },
        json: async () => ({}),
      } as unknown as Response;
    }

    const docMatch = urlStr.match(/\/documents\/((?:shared_bouquets|bouquet_assets|studio_passes)\/[^?]+)/);
    if (!docMatch) {
      return { ok: false, status: 404, json: async () => ({}) } as unknown as Response;
    }
    const docKey = decodeURIComponent(docMatch[1]);
    const urlObj = new URL(urlStr);
    const reqUpdateTime = urlObj.searchParams.get('currentDocument.updateTime');
    const reqExists = urlObj.searchParams.get('currentDocument.exists');

    if (method === 'GET') {
      const existing = docs.get(docKey);
      if (!existing) {
        return { ok: false, status: 404, json: async () => ({ error: 'NOT_FOUND' }) } as unknown as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          name: docKey,
          fields: existing.fields,
          updateTime: existing.updateTime,
        }),
      } as unknown as Response;
    }

    if (method === 'PATCH') {
      const existing = docs.get(docKey);
      if (docKey === 'shared_bouquets/sab_garland_feed_v1' && garlandCasFailRemaining > 0) {
        garlandCasFailRemaining -= 1;
        return { ok: false, status: 412, json: async () => ({ error: 'CAS_CONFLICT' }) } as unknown as Response;
      }
      if (reqExists === 'false' && existing) {
        return { ok: false, status: 409, json: async () => ({ error: 'ALREADY_EXISTS' }) } as unknown as Response;
      }
      if (reqUpdateTime && (!existing || existing.updateTime !== reqUpdateTime)) {
        return { ok: false, status: 412, json: async () => ({ error: 'FAILED_PRECONDITION' }) } as unknown as Response;
      }
      const parsed = init?.body ? JSON.parse(init.body) : {};
      const nextTime = `2026-11-19T00:00:${String(versionCounter).padStart(2, '0')}.000000Z`;
      versionCounter += 1;
      docs.set(docKey, { fields: parsed.fields || {}, updateTime: nextTime });
      return {
        ok: true,
        status: 200,
        json: async () => ({
          name: docKey,
          fields: parsed.fields || {},
          updateTime: nextTime,
        }),
      } as unknown as Response;
    }

    if (method === 'DELETE') {
      const existed = docs.delete(docKey);
      return {
        ok: existed,
        status: existed ? 200 : 404,
        json: async () => ({}),
      } as unknown as Response;
    }

    return { ok: false, status: 405, json: async () => ({}) } as unknown as Response;
  };

  return { docs, mockFetch };
}

describe('Bouquet Eternal Persistence — Lossless Asset Encoding & Overflow Splitting', () => {
  it('round-trips every bouquet asset losslessly including #E11D48 ribbon, layer planes, multiple photos, voice, pose, environment & lock', () => {
    const samplePhoto1 = 'data:image/jpeg;base64,' + 'A'.repeat(240);
    const samplePhoto2 = 'data:image/png;base64,' + 'B'.repeat(240);
    const sampleVoice = 'data:audio/webm;base64,' + 'C'.repeat(320);

    const snapshot: BouquetSnapshot = {
      items: [
        {
          id: 'fl-1',
          type: 'rose',
          x: 245,
          y: 260,
          scale: 1.15,
          rotation: -14,
          petalColor: '#b91c1c',
          centerColor: '#fbbf24',
          stemLength: 0.85,
          flipX: true,
          layerPlane: 'back',
          clippedToBouquet: false,
        },
        {
          id: 'fl-2',
          type: 'peony',
          x: 340,
          y: 230,
          scale: 1.0,
          rotation: 18,
          flipX: false,
          petalColor: '#f472b6',
          centerColor: '#fde68a',
          layerPlane: 'front',
          clippedToBouquet: false,
        },
        {
          id: 'ph-1',
          type: 'rose',
          photoStyle: 'polaroid',
          photoCaption: 'Paris 2026',
          photoDataUrl: samplePhoto1,
          x: 210,
          y: 320,
          scale: 0.95,
          rotation: -8,
          flipX: false,
          petalColor: '#ffffff',
          centerColor: '#d4a373',
          layerPlane: 'front',
          clippedToBouquet: false,
        },
        {
          id: 'ph-2',
          type: 'rose',
          photoStyle: 'cameo',
          photoCaption: 'Forever Us',
          photoDataUrl: samplePhoto2,
          x: 380,
          y: 310,
          scale: 0.85,
          rotation: 12,
          flipX: false,
          petalColor: '#fef3c7',
          centerColor: '#b45309',
          layerPlane: 'inside',
          clippedToBouquet: true,
        },
      ],
      wrapStyle: 'lace',
      wrapColor: '#f5ebe0',
      ribbonColor: '#E11D48', // Regression check: previously decoded as #C084FC!
      ribbonStyle: 'velvet',
      environment: 'sunlit',
      bouquetPose: { x: 312, y: 392, scale: 1.08, rotation: -6 },
      card: {
        to: 'Clara',
        from: 'Mateo',
        message: 'For eternity — every petal, photo, and note preserved.',
        theme: 'blush',
        visibleOnStage: true,
        customBg: '#fff5f7',
        customAccent: '#be123c',
        x: 425,
        y: 510,
        scale: 0.82,
        rotation: 4,
      },
      voice: {
        style: 'vinyl',
        visibleOnStage: true,
        title: 'Our Song',
        primaryColor: '#1f2937',
        accentColor: '#f43f5e',
        audioDataUrl: sampleVoice,
        durationSec: 18,
        x: 170,
        y: 500,
        scale: 1.05,
        rotation: -5,
      },
      lock: {
        mode: 'passcode',
        unlockAtIso: '',
        questionPrompt: 'Where did we meet?',
        passcodeAnswer: 'Kyoto',
        passcodeType: 'word',
      },
    };

    const encoded = encodeBouquetToCompactPayload(snapshot, true);
    const decoded = decodeBouquetFromHash(encoded);
    assert.ok(decoded, 'Encoded bouquet must decode cleanly');

    // Regression fix check: classic crimson ribbon MUST remain #e11d48, NOT #C084FC!
    assert.equal(decoded.ribbonColor.toLowerCase(), '#e11d48');
    assert.equal(decoded.ribbonStyle, 'velvet');
    assert.equal(decoded.wrapStyle, 'lace');
    assert.equal(decoded.wrapColor.toLowerCase(), '#f5ebe0');
    assert.equal(decoded.environment, 'sunlit');
    assert.deepEqual(decoded.bouquetPose, { x: 312, y: 392, scale: 1.08, rotation: -6 });

    assert.equal(decoded.items.length, 4);
    assert.equal(decoded.items[0].layerPlane, 'back');
    assert.equal(decoded.items[0].flipX, true);
    assert.equal(decoded.items[1].layerPlane, 'front');
    assert.equal(decoded.items[2].photoStyle, 'polaroid');
    assert.equal(decoded.items[2].photoCaption, 'Paris 2026');
    assert.equal(decoded.items[2].photoDataUrl, samplePhoto1);
    assert.equal(decoded.items[3].photoStyle, 'cameo');
    assert.equal(decoded.items[3].photoCaption, 'Forever Us');
    assert.equal(decoded.items[3].photoDataUrl, samplePhoto2);
    assert.equal(decoded.items[3].layerPlane, 'inside');

    assert.equal(decoded.card.to, 'Clara');
    assert.equal(decoded.card.from, 'Mateo');
    assert.equal(decoded.card.message, snapshot.card.message);
    assert.equal(decoded.card.customBg, '#fff5f7');
    assert.equal(decoded.card.customAccent, '#be123c');

    assert.equal(decoded.voice?.style, 'vinyl');
    assert.equal(decoded.voice?.title, 'Our Song');
    assert.equal(decoded.voice?.audioDataUrl, sampleVoice);
    assert.equal(decoded.voice?.durationSec, 18);

    assert.equal(decoded.lock?.mode, 'passcode');
    assert.equal(decoded.lock?.questionPrompt, 'Where did we meet?');
    assert.equal(decoded.lock?.passcodeAnswer, 'Kyoto');
  });

  it('splits heavy multi-photo + voice bouquets (>750 KB) into companion bouquet_assets and re-hydrates 100% identically on both client and server', () => {
    const bigPhotoA = 'data:image/jpeg;base64,' + 'A'.repeat(320_000);
    const bigPhotoB = 'data:image/jpeg;base64,' + 'B'.repeat(310_000);
    const bigVoice = 'data:audio/webm;base64,' + 'V'.repeat(280_000);

    const snapshot: BouquetSnapshot = {
      items: [
        {
          id: 'p1',
          type: 'rose',
          photoStyle: 'polaroid',
          photoCaption: 'Sunset',
          photoDataUrl: bigPhotoA,
          x: 220,
          y: 280,
          scale: 1,
          rotation: 0,
          flipX: false,
          petalColor: '#ffffff',
          centerColor: '#d4a373',
        },
        {
          id: 'p2',
          type: 'rose',
          photoStyle: 'stamp',
          photoCaption: 'Morning',
          photoDataUrl: bigPhotoB,
          x: 360,
          y: 290,
          scale: 1,
          rotation: 5,
          flipX: false,
          petalColor: '#ffffff',
          centerColor: '#d4a373',
        },
      ],
      wrapStyle: 'kraft',
      wrapColor: '#d4a373',
      ribbonColor: '#e11d48',
      ribbonStyle: 'satin',
      card: {
        to: 'Elena',
        from: 'Noah',
        message: 'Every memory saved forever.',
        theme: 'cream',
        visibleOnStage: true,
      },
      voice: {
        style: 'mixtape',
        visibleOnStage: true,
        title: 'Love Tape',
        primaryColor: '#374151',
        accentColor: '#ec4899',
        audioDataUrl: bigVoice,
        durationSec: 42,
      },
    };

    const fullPayload = encodeBouquetToCompactPayload(snapshot, true);
    const code = 'HeavyBq01234567';

    // Client split
    const clientSplit = extractOverflowAssetsFromPayload(code, fullPayload, bigVoice);
    assert.ok(clientSplit.combinedBytes <= 750_000, 'Main Firestore doc must stay safely under 750KB');
    assert.ok(clientSplit.assets.length >= 2, 'Voice and overflow photo(s) must be split into assets');
    assert.equal(clientSplit.voiceAudioDataUrl, `asset:${code}_voice`);

    // Even before asset hydration, decodeBouquetFromHash must not throw on asset: pointers
    const unhydratedDecoded = decodeBouquetFromHash(clientSplit.payload);
    assert.ok(unhydratedDecoded, 'Decoder must gracefully handle unresolved asset pointers');

    // Collect pointers and re-hydrate on client
    const collectedIds = collectAssetIdsFromBouquetRecord(
      clientSplit.payload,
      clientSplit.voiceAudioDataUrl
    );
    assert.equal(collectedIds.length, clientSplit.assets.length);
    const assetMap: Record<string, string> = {};
    for (const a of clientSplit.assets) assetMap[a.assetId] = a.dataUrl;

    const rehydrated = rehydrateBouquetRecordWithAssets(
      clientSplit.payload,
      clientSplit.voiceAudioDataUrl,
      assetMap
    );
    assert.equal(rehydrated.voiceAudioDataUrl, bigVoice);
    const finalDecoded = hydrateSnapshotWithFirestoreRecord(
      decodeBouquetFromHash(rehydrated.payload)!,
      { voiceAudioDataUrl: rehydrated.voiceAudioDataUrl }
    );
    assert.equal(finalDecoded.items[0].photoDataUrl, bigPhotoA);
    assert.equal(finalDecoded.items[1].photoDataUrl, bigPhotoB);
    assert.equal(finalDecoded.voice?.audioDataUrl, bigVoice);

    // Server split & re-hydrate parity
    const serverSplit = extractOverflowAssetsFromPayloadServer(code, fullPayload, bigVoice);
    assert.equal(serverSplit.assets.length, clientSplit.assets.length);
    const serverAssetMap: Record<string, string> = {};
    for (const a of serverSplit.assets) serverAssetMap[a.assetId] = a.dataUrl;
    const serverRehydrated = rehydrateBouquetRecordWithAssetsServer(
      serverSplit.payload,
      serverSplit.voiceAudioDataUrl,
      serverAssetMap
    );
    assert.equal(serverRehydrated.voiceAudioDataUrl, bigVoice);
    assert.equal(
      decodeBouquetFromHash(serverRehydrated.payload)?.items[0].photoDataUrl,
      bigPhotoA
    );
  });

  it('correctly strips inline photocard data from stem tilde index 7 on the server (fixing old broken &c= regex)', () => {
    const samplePhoto = 'data:image/jpeg;base64,' + 'Z'.repeat(5000);
    const snapshot: BouquetSnapshot = {
      items: [
        {
          id: 'p1',
          type: 'rose',
          photoStyle: 'polaroid',
          photoCaption: 'Keep Caption',
          photoDataUrl: samplePhoto,
          x: 260,
          y: 280,
          scale: 1,
          rotation: 0,
          flipX: false,
          petalColor: '#ffffff',
          centerColor: '#d4a373',
        },
      ],
      wrapStyle: 'kraft',
      wrapColor: '#d4a373',
      ribbonColor: '#e11d48',
      card: { to: 'A', from: 'B', message: 'Hi', theme: 'cream', visibleOnStage: true },
    };
    const encoded = encodeBouquetToCompactPayload(snapshot, true);
    assert.ok(encoded.length > 5000);
    const stripped = stripInlinePhotosFromCompactPayloadServer(encoded);
    assert.ok(stripped.length < 400, 'Server stripper must remove large base64url photo segment');
    const decoded = decodeBouquetFromHash(stripped);
    assert.ok(decoded);
    assert.equal(decoded.items[0].photoCaption, 'Keep Caption');
    assert.equal(decoded.items[0].photoDataUrl, undefined);
  });
});

describe('Server API — Eternal Persistence, CAS Garland Preservation & Admin Bouquet Log', () => {
  it('logs both Garland AND Private-only bouquets, persists overflow assets, survives Garland expiry, and supports verify/toggle/delete with tombstones', async () => {
    const origFetch = globalThis.fetch;
    const { docs, mockFetch } = createMockFirestoreFetch({ failFirstGarlandCas: true });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    try {
      clearShortCodeMemoryForTesting();
      resetOwnerBouquetLogStateForTesting();

      // 1. Seed a legacy bouquet in sab_garland_feed_v1 (simulating an older creation created before the Admin Log existed)
      const legacyCode = 'LegacyGarl00001';
      const legacyCreatedAt = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(); // 45 days old -> expired on Garland!
      const legacyPayload = encodeBouquetToCompactPayload(
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
              petalColor: '#e11d48',
              centerColor: '#fbbf24',
            },
          ],
          wrapStyle: 'kraft',
          wrapColor: '#d4a373',
          ribbonColor: '#e11d48',
          card: { to: 'Old Friend', from: 'Alex', message: 'Still here forever!', theme: 'cream', visibleOnStage: true },
        },
        true
      );
      docs.set(`shared_bouquets/${legacyCode}`, {
        fields: {
          code: { stringValue: legacyCode },
          payload: { stringValue: legacyPayload },
          createdAt: { stringValue: legacyCreatedAt },
          retentionDays: { integerValue: '30' },
          isPremium: { booleanValue: false },
        },
        updateTime: '2026-10-01T00:00:00.000000Z',
      });
      docs.set('shared_bouquets/sab_garland_feed_v1', {
        fields: {
          code: { stringValue: 'sab_garland_feed_v1' },
          payload: { stringValue: '#sab_garland_feed_v1' },
          createdAt: { stringValue: '2026-11-08T00:00:00.000Z' },
          voiceAudioDataUrl: {
            stringValue: JSON.stringify([
              {
                code: legacyCode,
                to: 'Old Friend',
                from: 'Alex',
                createdAt: legacyCreatedAt,
                shareUrl: `/${legacyCode}`,
                isDraft: false,
                pinToShowcase: true,
                retentionDays: 30,
                isPremium: false,
                draftPayload: legacyPayload,
              },
            ]),
          },
        },
        updateTime: '2026-11-08T00:00:00.000000Z',
      });

      // Verify legacy bouquet is expired for Garland display, YET GET /api/shorten?c=LegacyGarl00001 STILL serves it eternally!
      assert.equal(
        isShowcaseBouquetExpired(
          { sharedAt: legacyCreatedAt, isPremium: false, retentionDays: 30 },
          Date.now()
        ),
        true
      );
      const getLegacy = createMockReqRes('GET', `/api/shorten?c=${legacyCode}`);
      await shortenHandler(getLegacy.req, getLegacy.res);
      assert.equal(getLegacy.res.statusCode, 200);
      assert.equal(getLegacy.res.json().payload, legacyPayload);

      // 2. POST a Garland-pinned bouquet (should retry CAS conflict cleanly and NOT overwrite LegacyGarl00001)
      const garlandCode = 'GarlandNew00002';
      const garlandPayload = encodeBouquetToCompactPayload(
        {
          items: [
            {
              id: 't1',
              type: 'tulip',
              x: 290,
              y: 250,
              scale: 1,
              rotation: 0,
              flipX: false,
              petalColor: '#f43f5e',
              centerColor: '#fde047',
            },
          ],
          wrapStyle: 'tissue',
          wrapColor: '#fce7f3',
          ribbonColor: '#e11d48',
          card: { to: 'Maya', from: 'Liam', message: 'Pinned to garland!', theme: 'blush', visibleOnStage: true },
        },
        true
      );
      const postGarland = createMockReqRes('POST', '/api/shorten', {
        code: garlandCode,
        payload: garlandPayload,
        origin: 'https://sendabouquet.shop',
        pinToShowcase: true,
        bouquetMeta: {
          to: 'Maya',
          from: 'Liam',
          noteExcerpt: 'Pinned to garland!',
          flowerCount: 1,
          photoCount: 0,
          hasVoice: false,
        },
        garlandEntry: {
          code: garlandCode,
          to: 'Maya',
          from: 'Liam',
          createdAt: new Date().toISOString(),
          shareUrl: `https://sendabouquet.shop/${garlandCode}`,
          isDraft: false,
          pinToShowcase: true,
          draftPayload: garlandPayload,
        },
      });
      await shortenHandler(postGarland.req, postGarland.res);
      assert.equal(postGarland.res.statusCode, 200);
      assert.equal(postGarland.res.json().persisted, true);

      // Verify Garland feed has BOTH new AND legacy entries after CAS retry!
      const feedRaw = (docs.get('shared_bouquets/sab_garland_feed_v1')?.fields?.voiceAudioDataUrl as { stringValue: string })?.stringValue;
      const feedEntries = JSON.parse(feedRaw);
      assert.equal(feedEntries.length, 2);
      assert.ok(feedEntries.some((e: { code: string }) => e.code === legacyCode));
      assert.ok(feedEntries.some((e: { code: string }) => e.code === garlandCode));

      // 3. Mint & redeem a real Studio Pass so coutureGuard authorizes a PRIVATE-ONLY (non-Garland) Couture bouquet with heavy overflow photo + voice (>750KB)
      const deviceHash = 'dev_owner_test_hash_12345';
      const adminToken = createSignedAdminSessionToken(deviceHash);

      const mintReq = createMockReqRes('POST', '/api/payments/verify-action', {
        action: 'mint_paid_pass',
        adminSessionToken: adminToken,
        deviceTokenHash: deviceHash,
        tier: 'pass_30d',
        region: 'global',
        label: 'QA Persistence Pass',
        channel: 'test',
      });
      await handleVerifyAction(mintReq.req, mintReq.res);
      assert.equal(mintReq.res.statusCode, 200);
      const mintedPassKey = mintReq.res.json().pass?.passKey;
      assert.ok(mintedPassKey, 'Minted passKey must be returned');

      const redeemReq = createMockReqRes('POST', '/api/payments/redeem-pass', {
        passKey: mintedPassKey,
        deviceTokenHash: deviceHash,
      });
      await handlePaymentEndpoint(redeemReq.req, redeemReq.res, '/api/payments/redeem-pass');
      assert.equal(redeemReq.res.statusCode, 200);
      const redeemedPass = redeemReq.res.json().pass;
      assert.ok(redeemedPass?.activeSessionNonce, 'Redeemed pass must carry activeSessionNonce');

      const privateCode = 'PrivateMock0003';
      const bigPhoto = 'data:image/jpeg;base64,' + 'P'.repeat(420_000);
      const bigVoice = 'data:audio/webm;base64,' + 'M'.repeat(400_000);
      const privatePayload = encodeBouquetToCompactPayload(
        {
          items: [
            {
              id: 'ph-big',
              type: 'rose',
              photoStyle: 'polaroid',
              photoCaption: 'Secret',
              photoDataUrl: bigPhoto,
              x: 280,
              y: 280,
              scale: 1,
              rotation: 0,
              flipX: false,
              petalColor: '#ffffff',
              centerColor: '#d4a373',
            },
          ],
          wrapStyle: 'kraft',
          wrapColor: '#d4a373',
          ribbonColor: '#e11d48',
          card: { to: 'Mock Test', from: 'QA', message: 'Private non-garland mock', theme: 'cream', visibleOnStage: true },
          voice: {
            style: 'mixtape',
            visibleOnStage: true,
            title: 'Voice Note',
            primaryColor: '#1f2937',
            accentColor: '#ec4899',
            audioDataUrl: bigVoice,
            durationSec: 12,
          },
        },
        true
      );
      const postPrivate = createMockReqRes('POST', '/api/shorten', {
        code: privateCode,
        payload: privatePayload,
        voiceAudioDataUrl: bigVoice,
        voiceStyle: 'mixtape',
        voiceTitle: 'Voice Note',
        voiceDurationSec: 12,
        passKey: redeemedPass.passKey,
        deviceTokenHash: deviceHash,
        activeSessionNonce: redeemedPass.activeSessionNonce,
        pass: redeemedPass,
        origin: 'https://sendabouquet.shop',
        pinToShowcase: false,
        bouquetMeta: {
          to: 'Mock Test',
          from: 'QA',
          noteExcerpt: 'Private non-garland mock',
          flowerCount: 1,
          photoCount: 1,
          hasVoice: true,
          voiceStyle: 'mixtape',
        },
        garlandEntry: null,
      });
      await shortenHandler(postPrivate.req, postPrivate.res);
      assert.equal(postPrivate.res.statusCode, 200);
      assert.equal(postPrivate.res.json().persisted, true);
      assert.ok(postPrivate.res.json().assetCount >= 1, 'Heavy private bouquet must create overflow bouquet_assets');
      assert.ok(docs.has(`bouquet_assets/${privateCode}_voice`), 'Voice asset must exist in bouquet_assets');

      // Clear local memory cache and verify GET /api/shorten?c=PrivateMock0003 re-hydrates full photo + voice from Firestore!
      clearShortCodeMemoryForTesting();
      const getPrivate = createMockReqRes('GET', `/api/shorten?c=${privateCode}`);
      await shortenHandler(getPrivate.req, getPrivate.res);
      assert.equal(getPrivate.res.statusCode, 200);
      assert.equal(getPrivate.res.json().voiceAudioDataUrl, bigVoice);
      assert.equal(decodeBouquetFromHash(getPrivate.res.json().payload)?.items[0].photoDataUrl, bigPhoto);

      // 4. Verify unauthenticated admin calls are rejected with 401
      const unauthReq = createMockReqRes('POST', '/api/payments/verify-action', {
        action: 'fetch_owner_bouquet_log',
        adminSessionToken: 'forged',
        deviceTokenHash: 'dev_owner_1',
      });
      await handleVerifyAction(unauthReq.req, unauthReq.res);
      assert.equal(unauthReq.res.statusCode, 401);

      // 5. Authenticated fetch_owner_bouquet_log returns ALL 3 bouquets (Garland new, Private-only, AND backfilled Legacy!)
      const fetchLogReq = createMockReqRes('POST', '/api/payments/verify-action', {
        action: 'fetch_owner_bouquet_log',
        adminSessionToken: adminToken,
        deviceTokenHash: deviceHash,
      });
      await handleVerifyAction(fetchLogReq.req, fetchLogReq.res);
      assert.equal(fetchLogReq.res.statusCode, 200);
      const logList: AdminBouquetLogEntry[] = fetchLogReq.res.json().bouquetLog;
      assert.equal(logList.length, 3);
      assert.ok(logList.some((b) => b.code === privateCode && b.pinnedToGarland === false));
      assert.ok(logList.some((b) => b.code === garlandCode && b.pinnedToGarland === true));
      assert.ok(logList.some((b) => b.code === legacyCode && b.pinnedToGarland === true));

      // 6. Verify live persistence of the Private heavy bouquet via verify_owner_bouquet
      const verifyReq = createMockReqRes('POST', '/api/payments/verify-action', {
        action: 'verify_owner_bouquet',
        adminSessionToken: adminToken,
        deviceTokenHash: deviceHash,
        code: privateCode,
      });
      await handleVerifyAction(verifyReq.req, verifyReq.res);
      assert.equal(verifyReq.res.statusCode, 200);
      assert.equal(verifyReq.res.json().verification.existsInFirestore, true);
      assert.equal(verifyReq.res.json().verification.eternalLinkActive, true);
      assert.equal(verifyReq.res.json().verification.inGarlandFeed, false);
      assert.ok(verifyReq.res.json().verification.assetCount >= 1);

      // 7. Unpin garlandCode from Garland — verify it leaves sab_garland_feed_v1 while shared_bouquets/{code} stays eternal!
      const unpinReq = createMockReqRes('POST', '/api/payments/verify-action', {
        action: 'toggle_owner_bouquet_garland',
        adminSessionToken: adminToken,
        deviceTokenHash: deviceHash,
        code: garlandCode,
        pinned: false,
      });
      await handleVerifyAction(unpinReq.req, unpinReq.res);
      assert.equal(unpinReq.res.statusCode, 200);
      assert.ok(docs.has(`shared_bouquets/${garlandCode}`), 'Unpinning must NOT delete eternal shared_bouquets doc');
      const feedAfterUnpin = JSON.parse(
        (docs.get('shared_bouquets/sab_garland_feed_v1')?.fields?.voiceAudioDataUrl as { stringValue: string }).stringValue
      );
      assert.equal(feedAfterUnpin.some((e: { code: string }) => e.code === garlandCode), false);

      // 8. Admin manually deletes mock private bouquet + legacy bouquet (and tries deleting sab_* system docs which must be ignored!)
      const delReq = createMockReqRes('POST', '/api/payments/verify-action', {
        action: 'delete_owner_bouquets',
        adminSessionToken: adminToken,
        deviceTokenHash: deviceHash,
        codes: [privateCode, legacyCode, 'sab_garland_feed_v1', OWNER_VAULT_DOC_CODE, OWNER_BOUQUET_LOG_DOC_CODE],
      });
      await handleVerifyAction(delReq.req, delReq.res);
      assert.equal(delReq.res.statusCode, 200);
      assert.deepEqual(delReq.res.json().deletedCodes.sort(), [legacyCode, privateCode].sort());
      assert.equal(docs.has(`shared_bouquets/${privateCode}`), false, 'Deleted mock bouquet must be removed from Firestore');
      assert.equal(docs.has(`bouquet_assets/${privateCode}_voice`), false, 'Companion overflow assets must be cleaned up');
      assert.equal(docs.has(`shared_bouquets/${legacyCode}`), false);
      assert.equal(docs.has('shared_bouquets/sab_garland_feed_v1'), true, 'System docs must never be deleted');

      // Warm RAM / /tmp cache must be evicted immediately on GET after admin delete (404 without process restart)
      const getDeletedWarm = createMockReqRes('GET', `/api/shorten?c=${privateCode}`);
      await shortenHandler(getDeletedWarm.req, getDeletedWarm.res);
      assert.equal(getDeletedWarm.res.statusCode, 404, 'Admin-deleted bouquet must immediately return 404 even with warm cache');

      // Re-hydrating from Firestore after cold start must NOT resurrect deleted codes!
      resetOwnerBouquetLogStateForTesting();
      const postDeleteLogReq = createMockReqRes('POST', '/api/payments/verify-action', {
        action: 'fetch_owner_bouquet_log',
        adminSessionToken: adminToken,
        deviceTokenHash: deviceHash,
      });
      await handleVerifyAction(postDeleteLogReq.req, postDeleteLogReq.res);
      const afterDeleteList: AdminBouquetLogEntry[] = postDeleteLogReq.res.json().bouquetLog;
      assert.equal(afterDeleteList.length, 1);
      assert.equal(afterDeleteList[0].code, garlandCode);
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('preserves >24 shared creations in sab_garland_feed_v1 without silently evicting older creations', async () => {
    const origFetch = globalThis.fetch;
    const { docs, mockFetch } = createMockFirestoreFetch();
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    try {
      for (let i = 1; i <= 30; i++) {
        const code = `GarlKeep${String(i).padStart(6, '0')}`;
        const ok = await publishToGarlandFeedRest(code, '#g=0.0.@0', {
          code,
          to: `Recipient ${i}`,
          from: 'Atelier',
          createdAt: new Date(Date.now() + i * 1000).toISOString(),
          shareUrl: `https://sendabouquet.shop/${code}`,
          isDraft: false,
          pinToShowcase: true,
          draftPayload: '#g=0.0.@0',
        });
        assert.equal(ok, true);
      }

      const feedRaw = (docs.get('shared_bouquets/sab_garland_feed_v1')?.fields?.voiceAudioDataUrl as { stringValue: string }).stringValue;
      const entries = JSON.parse(feedRaw);
      assert.equal(entries.length, 30, 'All 30 creations must remain in sab_garland_feed_v1 (no 24-item truncation!)');
      assert.ok(entries.some((e: { code: string }) => e.code === 'GarlKeep000001'));
      assert.ok(entries.some((e: { code: string }) => e.code === 'GarlKeep000030'));
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});

describe('Admin Bouquet Log Pure Helpers', () => {
  it('classifies, counts, filters, and extracts short codes accurately', () => {
    const now = Date.parse('2026-11-19T12:00:00.000Z');
    const entries: AdminBouquetLogEntry[] = [
      {
        code: 'LiveGarland0001',
        to: 'Sofia',
        from: 'Marco',
        noteExcerpt: 'Happy anniversary',
        createdAt: '2026-11-15T12:00:00.000Z',
        shareUrl: '/LiveGarland0001',
        pinnedToGarland: true,
        isPremium: false,
        retentionDays: 30,
        isCouture: false,
        flowerCount: 5,
        photoCount: 1,
        hasVoice: false,
        lockMode: 'none',
        payloadBytes: 4200,
        voiceBytes: 0,
        assetIds: [],
        persistedToFirestore: true,
      },
      {
        code: 'ExpiredGarl0002',
        to: 'Hannah',
        from: 'Leo',
        noteExcerpt: 'From last month',
        createdAt: '2026-10-01T12:00:00.000Z',
        shareUrl: '/ExpiredGarl0002',
        pinnedToGarland: true,
        isPremium: false,
        retentionDays: 30,
        isCouture: false,
        flowerCount: 4,
        photoCount: 0,
        hasVoice: true,
        voiceStyle: 'vinyl',
        lockMode: 'passcode',
        payloadBytes: 1800,
        voiceBytes: 60000,
        assetIds: [],
        persistedToFirestore: true,
      },
      {
        code: 'PrivateOnly0003',
        to: 'Secret',
        from: 'Me',
        noteExcerpt: 'Not on garland',
        createdAt: '2026-11-18T12:00:00.000Z',
        shareUrl: '/PrivateOnly0003',
        pinnedToGarland: false,
        isPremium: true,
        retentionDays: 36500,
        isCouture: true,
        flowerCount: 7,
        photoCount: 2,
        hasVoice: true,
        lockMode: 'countdown',
        payloadBytes: 9000,
        voiceBytes: 80000,
        assetIds: ['PrivateOnly0003_voice'],
        persistedToFirestore: true,
      },
    ];

    assert.equal(isGarlandDisplayExpired(entries[0], now), false);
    assert.equal(isGarlandDisplayExpired(entries[1], now), true);
    assert.equal(isGarlandDisplayExpired(entries[2], now), false);

    assert.equal(classifyAdminBouquetStatus(entries[0], now), 'garland_live');
    assert.equal(classifyAdminBouquetStatus(entries[1], now), 'garland_expired');
    assert.equal(classifyAdminBouquetStatus(entries[2], now), 'private_eternal');

    const counts = countAdminBouquetStatuses(entries, now);
    assert.deepEqual(counts, {
      all: 3,
      garland: 1,
      private: 1,
      expired_garland: 1,
      with_voice: 2,
      with_photos: 2,
    });

    assert.equal(filterAdminBouquetLog(entries, { status: 'private' }, now).length, 1);
    assert.equal(filterAdminBouquetLog(entries, { status: 'expired_garland' }, now).length, 1);
    assert.equal(filterAdminBouquetLog(entries, { search: 'hannah' }, now)[0].code, 'ExpiredGarl0002');

    assert.equal(extractShortCodeFromInput('https://sendabouquet.shop/Vu18KSuusq9133s?x=1'), 'Vu18KSuusq9133s');
    assert.equal(extractShortCodeFromInput('/Vu18KSuusq9133s'), 'Vu18KSuusq9133s');
    assert.equal(extractShortCodeFromInput('sab_garland_feed_v1'), null);

    const summary = inspectPayloadAssetsSummary('#g=0.0.@0', null);
    assert.equal(summary.flowerCount, 5);
    assert.equal(summary.wrapStyle, 'kraft');
  });
});

describe('Private Vercel Blob Failover Under Firestore 429 Quota Exhaustion', () => {
  it('saves, loads, lists on Garland, verifies, unpins/re-pins, and deletes bouquets 100% via Private Vercel Blob when Firestore returns 429', async () => {
    const origFetch = globalThis.fetch;
    const blobStore = new Map<string, { body: string; access: string }>();

    // Simulate a strict Private Vercel Blob store (rejects access: 'public', supports private put/get/del)
    setBlobClientForTesting({
      put: async (pathname: string, body: string, opts: { access?: string }) => {
        if (opts?.access !== 'private') {
          const err = new Error('Cannot use public access on a private store.');
          err.name = 'BlobAccessError';
          throw err;
        }
        blobStore.set(pathname, { body: String(body), access: 'private' });
        return { url: `https://private.blob.vercel-storage.com/${pathname}`, pathname };
      },
      get: async (pathname: string, opts: { access?: string }) => {
        if (opts?.access !== 'private') {
          const err = new Error('Cannot use public access on a private store.');
          err.name = 'BlobAccessError';
          throw err;
        }
        const item = blobStore.get(pathname);
        if (!item) return null;
        return {
          statusCode: 200,
          stream: new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode(item.body));
              controller.close();
            },
          }),
        };
      },
      del: async (pathname: string) => {
        blobStore.delete(pathname);
      },
    });

    // Simulate 100% Firestore HTTP 429 Quota Exceeded outage across every Firestore REST URL
    globalThis.fetch = (async (input: string | URL) => {
      const url = String(input);
      if (url.includes('firestore.googleapis.com')) {
        return new Response(
          JSON.stringify({
            error: {
              code: 429,
              message: "Quota exceeded for quota metric 'Free daily read units per project'",
              status: 'RESOURCE_EXHAUSTED',
            },
          }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('Not Found', { status: 404 });
    }) as unknown as typeof fetch;

    resetOwnerBouquetLogStateForTesting();
    clearShortCodeMemoryForTesting();
    invalidateGarlandFeedMemoryCache();

    const code = 'BlobFailover001';
    const tmpJson = path.join(os.tmpdir(), `bq_short_${code}.json`);
    const tmpTxt = path.join(os.tmpdir(), `bq_short_${code}.txt`);

    try {
      const heavyPhoto = `data:image/jpeg;base64,${'C'.repeat(420_000)}`;
      const heavyVoice = `data:audio/webm;base64,${'D'.repeat(280_000)}`;
      const snap: BouquetSnapshot = {
        items: [
          {
            id: 'stem-rose',
            type: 'rose',
            x: 280,
            y: 340,
            scale: 1,
            rotation: -6,
            flipX: false,
            petalColor: '#e11d48',
            centerColor: '#fbbf24',
            layerPlane: 'inside',
            clippedToBouquet: true,
          },
          {
            id: 'stem-photo',
            type: 'rose',
            x: 340,
            y: 310,
            scale: 0.9,
            rotation: 8,
            flipX: false,
            petalColor: '#ffffff',
            centerColor: '#111827',
            layerPlane: 'front',
            clippedToBouquet: true,
            photoStyle: 'polaroid',
            photoDataUrl: heavyPhoto,
            photoCaption: 'Forever moment',
          },
        ],
        wrapStyle: 'kraft',
        wrapColor: '#d9b99b',
        ribbonColor: '#e11d48',
        ribbonStyle: 'satin',
        environment: 'sunlit',
        bouquetPose: { x: 300, y: 380, scale: 1, rotation: 0 },
        card: {
          to: 'Kathleen',
          from: 'Mark',
          message: 'Thinking of you always',
          theme: 'cream',
          visibleOnStage: true,
        },
        voice: {
          style: 'mixtape',
          visibleOnStage: true,
          title: 'For Kathleen',
          primaryColor: '#ec4899',
          accentColor: '#fde047',
          audioDataUrl: heavyVoice,
          durationSec: 18,
        },
        lock: { mode: 'none', unlockAtIso: '', questionPrompt: '', passcodeAnswer: '' },
      };
      const compactPayload = encodeBouquetToCompactPayload(snap, true);

      const deviceHash = 'owner-device-blob-test';
      const adminToken = createSignedAdminSessionToken(deviceHash);

      const mintReq = createMockReqRes('POST', '/api/payments/verify-action', {
        action: 'mint_paid_pass',
        adminSessionToken: adminToken,
        deviceTokenHash: deviceHash,
        tier: 'pass_30d',
        region: 'global',
        label: 'Blob Failover QA Pass',
        channel: 'test',
      });
      await handleVerifyAction(mintReq.req, mintReq.res);
      assert.equal(mintReq.res.statusCode, 200);
      const mintedPassKey = mintReq.res.json().pass?.passKey;
      assert.ok(mintedPassKey, 'Minted passKey must be returned even during Firestore 429');

      const redeemReq = createMockReqRes('POST', '/api/payments/redeem-pass', {
        passKey: mintedPassKey,
        deviceTokenHash: deviceHash,
      });
      await handlePaymentEndpoint(redeemReq.req, redeemReq.res, '/api/payments/redeem-pass');
      assert.equal(redeemReq.res.statusCode, 200);
      const redeemedPass = redeemReq.res.json().pass;
      assert.ok(redeemedPass?.activeSessionNonce);

      // 1. POST /api/shorten while Firestore returns 429 -> must succeed via Private Vercel Blob!
      const postReq = createMockReqRes('POST', '/api/shorten', {
        code,
        payload: compactPayload,
        origin: 'https://sendabouquet.online',
        voiceAudioDataUrl: heavyVoice,
        voiceStyle: 'mixtape',
        voiceTitle: 'For Kathleen',
        voiceDurationSec: 18,
        passKey: redeemedPass.passKey,
        deviceTokenHash: deviceHash,
        activeSessionNonce: redeemedPass.activeSessionNonce,
        pass: redeemedPass,
        pinToShowcase: true,
        bouquetMeta: {
          to: 'Kathleen',
          from: 'Mark',
          noteExcerpt: 'Thinking of you always',
          createdAt: '2026-11-19T10:00:00.000Z',
          shareUrl: `https://sendabouquet.online/${code}`,
          pinnedToGarland: true,
          flowerCount: snap.items.length,
          photoCount: 1,
          hasVoice: true,
        },
        garlandEntry: {
          code,
          to: 'Kathleen',
          from: 'Mark',
          createdAt: '2026-11-19T10:00:00.000Z',
          shareUrl: `https://sendabouquet.online/${code}`,
          isDraft: false,
          pinToShowcase: true,
          hasVoice: true,
          flowerCount: snap.items.length,
          draftPayload: compactPayload,
        },
      });
      await shortenHandler(postReq.req, postReq.res);
      assert.equal(postReq.res.statusCode, 200);
      const postJson = postReq.res.json();
      assert.equal(postJson.persisted, true, 'Bouquet must persist via Private Vercel Blob despite Firestore 429');
      assert.equal(postJson.storage.firestore, false);
      assert.equal(postJson.storage.blob, true);
      assert.ok(blobStore.has(`bouquets/${code}.json`), 'Bouquet blob must exist in private store');

      // 2. Evict ALL local RAM + /tmp caches to simulate a completely cold serverless instance on another continent
      clearShortCodeMemoryForTesting();
      if (fs.existsSync(tmpJson)) fs.unlinkSync(tmpJson);
      if (fs.existsSync(tmpTxt)) fs.unlinkSync(tmpTxt);

      // GET /api/shorten?c=BlobFailover001 must serve full photo + voice straight from Private Vercel Blob!
      const getReq = createMockReqRes('GET', `/api/shorten?c=${code}`);
      await shortenHandler(getReq.req, getReq.res);
      assert.equal(getReq.res.statusCode, 200);
      const getJson = getReq.res.json();
      assert.equal(getJson.voiceAudioDataUrl, heavyVoice);
      const decoded = decodeBouquetFromHash(getJson.payload);
      assert.ok(decoded);
      assert.equal(decoded!.card.to, 'Kathleen');
      assert.equal(decoded!.items.find((it) => it.photoStyle)?.photoDataUrl, heavyPhoto);

      // 3. GET /api/shorten?garland=1 must serve the Garland feed from Private Vercel Blob during Firestore 429!
      invalidateGarlandFeedMemoryCache();
      const garlandReq = createMockReqRes('GET', '/api/shorten?garland=1');
      await shortenHandler(garlandReq.req, garlandReq.res);
      assert.equal(garlandReq.res.statusCode, 200);
      const garlandJson = garlandReq.res.json();
      assert.equal(garlandJson.source, 'vercel_blob');
      assert.ok(garlandJson.entries.some((e: { code: string }) => e.code === code));

      // 4. Cold-start Admin Bouquet Log hydration must recover the bouquet from Private Vercel Blob!
      resetOwnerBouquetLogStateForTesting();

      const logReq = createMockReqRes('POST', '/api/payments/verify-action', {
        action: 'fetch_owner_bouquet_log',
        adminSessionToken: adminToken,
        deviceTokenHash: deviceHash,
      });
      await handleVerifyAction(logReq.req, logReq.res);
      assert.equal(logReq.res.statusCode, 200);
      const logged: AdminBouquetLogEntry[] = logReq.res.json().bouquetLog;
      assert.ok(logged.some((b) => b.code === code && b.to === 'Kathleen'));

      // 5. Admin verify_owner_bouquet must verify the bouquet live in Private Vercel Blob even under Firestore 429!
      const verifyReq = createMockReqRes('POST', '/api/payments/verify-action', {
        action: 'verify_owner_bouquet',
        adminSessionToken: adminToken,
        deviceTokenHash: deviceHash,
        code,
      });
      await handleVerifyAction(verifyReq.req, verifyReq.res);
      assert.equal(verifyReq.res.statusCode, 200);
      assert.equal(verifyReq.res.json().verification.existsInFirestore, false);
      assert.equal(verifyReq.res.json().verification.existsInBlob, true);
      assert.equal(verifyReq.res.json().verification.eternalLinkActive, true);
      assert.equal(verifyReq.res.json().verification.inGarlandFeed, true);

      // 6. Admin toggle_owner_bouquet_garland (unpin -> re-pin) must work purely via Private Vercel Blob!
      const unpinReq = createMockReqRes('POST', '/api/payments/verify-action', {
        action: 'toggle_owner_bouquet_garland',
        adminSessionToken: adminToken,
        deviceTokenHash: deviceHash,
        code,
        pinned: false,
      });
      await handleVerifyAction(unpinReq.req, unpinReq.res);
      assert.equal(unpinReq.res.statusCode, 200);
      invalidateGarlandFeedMemoryCache();
      const afterUnpin = createMockReqRes('GET', '/api/shorten?garland=1');
      await shortenHandler(afterUnpin.req, afterUnpin.res);
      assert.equal(afterUnpin.res.json().entries.some((e: { code: string }) => e.code === code), false);

      const repinReq = createMockReqRes('POST', '/api/payments/verify-action', {
        action: 'toggle_owner_bouquet_garland',
        adminSessionToken: adminToken,
        deviceTokenHash: deviceHash,
        code,
        pinned: true,
      });
      await handleVerifyAction(repinReq.req, repinReq.res);
      assert.equal(repinReq.res.statusCode, 200);
      invalidateGarlandFeedMemoryCache();
      const afterRepin = createMockReqRes('GET', '/api/shorten?garland=1');
      await shortenHandler(afterRepin.req, afterRepin.res);
      assert.equal(afterRepin.res.json().entries.some((e: { code: string }) => e.code === code), true);

      // 7. Admin delete_owner_bouquets must delete from Private Vercel Blob + Blob Garland + return 404 immediately!
      const delReq = createMockReqRes('POST', '/api/payments/verify-action', {
        action: 'delete_owner_bouquets',
        adminSessionToken: adminToken,
        deviceTokenHash: deviceHash,
        codes: [code],
      });
      await handleVerifyAction(delReq.req, delReq.res);
      assert.equal(delReq.res.statusCode, 200);
      assert.equal(blobStore.has(`bouquets/${code}.json`), false, 'Bouquet blob must be deleted');

      const getAfterDel = createMockReqRes('GET', `/api/shorten?c=${code}`);
      await shortenHandler(getAfterDel.req, getAfterDel.res);
      assert.equal(getAfterDel.res.statusCode, 404);
    } finally {
      setBlobClientForTesting(null);
      globalThis.fetch = origFetch;
      clearShortCodeMemoryForTesting();
      invalidateGarlandFeedMemoryCache();
      if (fs.existsSync(tmpJson)) fs.unlinkSync(tmpJson);
      if (fs.existsSync(tmpTxt)) fs.unlinkSync(tmpTxt);
    }
  });

  it('Admin Console works 100% during Firestore 429 outage AND reconciles conflict-free when stale Firestore recovers', async () => {
    const origFetch = globalThis.fetch;
    const blobStore = new Map<string, string>();
    let blobPutCount = 0;

    setBlobClientForTesting({
      async put(pathname: string, body: string) {
        blobPutCount += 1;
        blobStore.set(pathname, String(body));
        return { url: `https://private.blob.local/${pathname}`, pathname };
      },
      async get(pathname: string) {
        const val = blobStore.get(pathname);
        if (val === undefined) return null;
        return {
          statusCode: 200,
          stream: new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode(val));
              controller.close();
            },
          }),
        };
      },
      async del(pathname: string) {
        blobStore.delete(pathname);
      },
    });

    // Simulated Firestore store (offline/429 in Phase 1, comes back online with STALE pre-outage state in Phase 2)
    let firestoreExhausted = true;
    const fsDocs = new Map<string, { fields: Record<string, unknown>; updateTime: string }>();
    let fsRev = 1;

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const urlStr = String(input);
      if (!urlStr.includes('firestore.googleapis.com')) {
        return new Response('Not found', { status: 404 });
      }
      if (firestoreExhausted) {
        return new Response(
          JSON.stringify({
            error: {
              code: 429,
              message: 'Quota exceeded: Free daily read units per project',
              status: 'RESOURCE_EXHAUSTED',
            },
          }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const u = new URL(urlStr);
      const docMatch = u.pathname.match(/\/documents\/(shared_bouquets|studio_passes|studio_stats)\/([^/?]+)$/);
      if (!docMatch) return new Response('{}', { status: 404 });
      const docKey = `${docMatch[1]}/${decodeURIComponent(docMatch[2])}`;
      const method = (init?.method || 'GET').toUpperCase();

      if (method === 'GET') {
        const existing = fsDocs.get(docKey);
        if (!existing) return new Response('{}', { status: 404 });
        return new Response(
          JSON.stringify({
            name: docKey,
            fields: existing.fields,
            updateTime: existing.updateTime,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      if (method === 'PATCH') {
        const existing = fsDocs.get(docKey);
        const expectedUpdateTime = u.searchParams.get('currentDocument.updateTime');
        const expectedExists = u.searchParams.get('currentDocument.exists');
        if (expectedExists === 'false' && existing) {
          return new Response('{}', { status: 409 });
        }
        if (expectedUpdateTime && (!existing || existing.updateTime !== expectedUpdateTime)) {
          return new Response('{}', { status: 412 });
        }
        const parsedBody = JSON.parse(String(init?.body || '{}'));
        const nextUpdateTime = `2026-11-19T12:00:${String(fsRev++).padStart(2, '0')}.000000Z`;
        fsDocs.set(docKey, { fields: parsedBody.fields || {}, updateTime: nextUpdateTime });
        return new Response(
          JSON.stringify({
            name: docKey,
            fields: parsedBody.fields || {},
            updateTime: nextUpdateTime,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }

      return new Response('{}', { status: 404 });
    }) as typeof fetch;

    try {
      // =========================================================================
      // PHASE 1: FIRESTORE IS EXHAUSTED (429) — ADMIN MUST WORK 100% VIA BLOB
      // =========================================================================
      resetOwnerVaultInMemoryForColdStartTests();
      resetOwnerBouquetLogStateForTesting();
      clearShortCodeMemoryForTesting();
      invalidateGarlandFeedMemoryCache();

      const ownerDevice = 'dev_owner_failover_admin_999';
      const adminToken = createSignedAdminSessionToken(ownerDevice);

      // 1A. Toggle PH Payments Disabled ON during Firestore 429
      const disablePhReq = createMockReqRes('POST', '/api/payments/verify-action', {
        action: 'toggle_ph_payments',
        adminSessionToken: adminToken,
        deviceTokenHash: ownerDevice,
        disabled: true,
      });
      await handleVerifyAction(disablePhReq.req, disablePhReq.res);
      assert.equal(disablePhReq.res.statusCode, 200);
      assert.equal(disablePhReq.res.json().phPaymentsDisabled, true, 'PHP Disable toggle must succeed under Firestore 429');
      assert.equal(isPhPaymentsDisabledServer(), true);
      assert.ok(blobStore.has('system/owner_vault.json'), 'Owner Vault must be saved to Private Vercel Blob');

      // 1B. Toggle Income Pause, update Launch Promo limits, and change Owner PIN during Firestore 429
      const pauseReq = createMockReqRes('POST', '/api/payments/verify-action', {
        action: 'toggle_income_pause',
        adminSessionToken: adminToken,
        deviceTokenHash: ownerDevice,
        paused: true,
      });
      await handleVerifyAction(pauseReq.req, pauseReq.res);
      assert.equal(pauseReq.res.statusCode, 200);
      assert.equal(pauseReq.res.json().incomePausedForTesting, true);

      const promoReq = createMockReqRes('POST', '/api/payments/verify-action', {
        action: 'update_launch_promo_config',
        adminSessionToken: adminToken,
        deviceTokenHash: ownerDevice,
        kofiLaunchEnabled: false,
        kofiLaunchMaxLimit: 42,
        recipientGiftMaxLimit: 200,
      });
      await handleVerifyAction(promoReq.req, promoReq.res);
      assert.equal(promoReq.res.statusCode, 200);
      assert.equal(promoReq.res.json().launchPromo.kofiLaunchEnabled, false);
      assert.equal(promoReq.res.json().launchPromo.kofiLaunchMaxLimit, 42);

      const pinReq = createMockReqRes('POST', '/api/payments/verify-action', {
        action: 'update_owner_pin',
        adminSessionToken: adminToken,
        deviceTokenHash: ownerDevice,
        newPin: 'OUTAGE-PIN-7788',
      });
      await handleVerifyAction(pinReq.req, pinReq.res);
      assert.equal(pinReq.res.statusCode, 200);

      // 1C. Mint & redeem a Paid Pass during Firestore 429 -> must persist in BOTH Owner Vault Blob AND passes/{passKey}.json!
      const mintReq = createMockReqRes('POST', '/api/payments/verify-action', {
        action: 'mint_paid_pass',
        adminSessionToken: adminToken,
        deviceTokenHash: ownerDevice,
        tier: 'pass_30d',
        region: 'INTL',
        label: 'Outage Buyer Pass',
        channel: 'manual',
      });
      await handleVerifyAction(mintReq.req, mintReq.res);
      assert.equal(mintReq.res.statusCode, 200);
      const outagePassKey = mintReq.res.json().pass?.passKey;
      assert.ok(outagePassKey);
      assert.ok(blobStore.has(`passes/${outagePassKey}.json`), 'Minted pass must mirror to Private Vercel Blob');

      const buyerDevice = 'dev_buyer_outage_device_123';
      const redeemReq = createMockReqRes('POST', '/api/payments/redeem-pass', {
        passKey: outagePassKey,
        deviceTokenHash: buyerDevice,
      });
      await handlePaymentEndpoint(redeemReq.req, redeemReq.res, '/api/payments/redeem-pass');
      assert.equal(redeemReq.res.statusCode, 200);
      assert.equal(redeemReq.res.json().pass.primaryDeviceHash, buyerDevice);

      // 1D. Unpin an older historical Garland bouquet (`StaleGarland001`) during Firestore 429 -> records removedCodes tombstone in Blob!
      const unpinOldReq = createMockReqRes('POST', '/api/payments/verify-action', {
        action: 'toggle_owner_bouquet_garland',
        adminSessionToken: adminToken,
        deviceTokenHash: ownerDevice,
        code: 'StaleGarland001',
        pinned: false,
      });
      await handleVerifyAction(unpinOldReq.req, unpinOldReq.res);
      assert.equal(unpinOldReq.res.statusCode, 200);
      const garlandBlobAfterUnpin = JSON.parse(blobStore.get('system/garland_feed.json') || '{}');
      assert.ok(
        Array.isArray(garlandBlobAfterUnpin.removedCodes) &&
          garlandBlobAfterUnpin.removedCodes.includes('StaleGarland001'),
        'Unpinning during Firestore 429 must record removedCodes tombstone in Blob'
      );

      // 1E. Verify anonymous telemetry_event & read-only fetch_owner_console NEVER spend Blob put() ops!
      const putsBeforeTelemetry = blobPutCount;
      for (let i = 0; i < 5; i++) {
        const telReq = createMockReqRes('POST', '/api/payments/verify-action', {
          action: 'telemetry_event',
          telemetry: { type: 'page_view', device: 'mobile', region: 'PH' },
        });
        await handleVerifyAction(telReq.req, telReq.res);
        assert.equal(telReq.res.statusCode, 200);
      }
      const fetchConsoleReq = createMockReqRes('POST', '/api/payments/verify-action', {
        action: 'fetch_owner_console',
        adminSessionToken: adminToken,
        deviceTokenHash: ownerDevice,
      });
      await handleVerifyAction(fetchConsoleReq.req, fetchConsoleReq.res);
      assert.equal(fetchConsoleReq.res.statusCode, 200);
      assert.equal(
        blobPutCount,
        putsBeforeTelemetry,
        'Anonymous telemetry_event and read-only fetch_owner_console must spend ZERO Vercel Blob put() ops'
      );

      // 1F. Cold start while STILL in Firestore 429 -> every Admin setting must survive from Blob!
      resetOwnerVaultInMemoryForColdStartTests();
      assert.equal(isPhPaymentsDisabledServer(), false, 'Sanity check: cold start starts false');
      await hydratePersistentOwnerVaultServer();
      assert.equal(isPhPaymentsDisabledServer(), true, 'PHP Disable must survive cold start via Blob during 429');
      assert.equal(OWNER_ANALYTICS_STATE.incomePausedForTesting, true);
      assert.equal(OWNER_ANALYTICS_STATE.kofiLaunchEnabled, false);
      assert.equal(OWNER_ANALYTICS_STATE.kofiLaunchMaxLimit, 42);
      assert.ok(PAID_PASS_LEDGER.has(outagePassKey), 'Outage paid pass must survive cold start via Blob');

      // =========================================================================
      // PHASE 2: FIRESTORE RECOVERS WITH STALE PRE-OUTAGE DATA — ZERO CLOBBER!
      // =========================================================================
      const staleTs = Date.now() - 6 * 60 * 60 * 1000; // 6 hours older than Phase 1 Blob edits
      const historicalPass = createSignedStudioPassServer({
        passKey: 'BLOOM-HIST-9901',
        tier: 'pass_7d',
        region: 'INTL',
        deviceTokenHash: 'dev_historical_buyer_001',
        paymentProvider: 'kofi',
        paymentReference: 'kofi_hist_001',
      });
      const staleFirestoreVault = {
        v: 1,
        updatedAt: new Date(staleTs).toISOString(),
        phPaymentsDisabled: false,
        phDisabledUpdatedAtMs: staleTs,
        incomePausedForTesting: false,
        incomePauseUpdatedAtMs: staleTs,
        launchPromoConfigUpdatedAtMs: staleTs,
        kofiLaunchEnabled: true,
        kofiLaunchMaxLimit: 30,
        recipientGiftEnabled: true,
        recipientGiftMaxLimit: 150,
        customOwnerPin: 'STALE-OLD-PIN',
        customOwnerPinUpdatedAtMs: staleTs,
        issuedPassKeys: [historicalPass.passKey],
        paidPasses: [
          {
            passKey: historicalPass.passKey,
            tier: 'pass_7d',
            region: 'INTL',
            currency: 'USD',
            amountMinor: 399,
            status: 'claimed',
            label: 'Historical Pre-Outage Buyer',
            channel: 'kofi',
            createdAt: new Date(staleTs).toISOString(),
            expiresAt: historicalPass.expiresAt,
            claimedDeviceHash: 'dev_historical_buyer_001',
            bouquetsCreated: 1,
            isTest: false,
            passRecord: historicalPass,
          },
        ],
        testerVouchers: [],
        revokedVoucherKeys: [],
        analytics: {
          phPaymentsDisabled: false,
          incomePausedForTesting: false,
          kofiLaunchEnabled: true,
          kofiLaunchMaxLimit: 30,
          recipientGiftEnabled: true,
          recipientGiftMaxLimit: 150,
        },
      };

      fsDocs.set(`shared_bouquets/${OWNER_VAULT_DOC_CODE}`, {
        updateTime: '2026-11-19T06:00:00.000000Z',
        fields: {
          code: { stringValue: OWNER_VAULT_DOC_CODE },
          payload: { stringValue: '#sab_owner_vault_v1' },
          createdAt: { stringValue: '2026-11-08T00:00:00.000Z' },
          voiceAudioDataUrl: { stringValue: JSON.stringify(staleFirestoreVault) },
        },
      });

      // Seed stale Firestore Garland with BOTH a historical keeper AND the unpinned StaleGarland001
      fsDocs.set('shared_bouquets/sab_garland_feed_v1', {
        updateTime: '2026-11-19T06:00:00.000000Z',
        fields: {
          code: { stringValue: 'sab_garland_feed_v1' },
          payload: { stringValue: '#sab_garland_feed_v1' },
          createdAt: { stringValue: '2026-11-08T00:00:00.000Z' },
          voiceAudioDataUrl: {
            stringValue: JSON.stringify([
              {
                code: 'KeepHist000001',
                to: 'Clara',
                from: 'Noah',
                createdAt: '2026-11-18T10:00:00.000Z',
                shareUrl: '/KeepHist000001',
                isDraft: false,
                pinToShowcase: true,
                draftPayload: '#v=1',
              },
              {
                code: 'StaleGarland001',
                to: 'Unpinned',
                from: 'Owner',
                createdAt: '2026-11-18T09:00:00.000Z',
                shareUrl: '/StaleGarland001',
                isDraft: false,
                pinToShowcase: true,
                draftPayload: '#v=1',
              },
            ]),
          },
        },
      });

      // Turn Firestore back online and simulate a fresh cold-start server instance!
      firestoreExhausted = false;
      resetOwnerVaultInMemoryForColdStartTests();
      invalidateGarlandFeedMemoryCache();

      // 2A. Hydrating Owner Vault merges BOTH sources without clobbering AND auto-heals Firestore!
      await hydratePersistentOwnerVaultServer();
      assert.equal(isPhPaymentsDisabledServer(), true, 'Blob newer PHP Disable must beat stale Firestore false');
      assert.equal(OWNER_ANALYTICS_STATE.incomePausedForTesting, true, 'Blob newer Income Pause must win');
      assert.equal(OWNER_ANALYTICS_STATE.kofiLaunchEnabled, false, 'Blob newer Launch Promo config must win');
      assert.equal(OWNER_ANALYTICS_STATE.kofiLaunchMaxLimit, 42);
      assert.ok(PAID_PASS_LEDGER.has(historicalPass.passKey), 'Historical Firestore paid pass must be preserved!');
      assert.ok(PAID_PASS_LEDGER.has(outagePassKey), 'Outage Blob paid pass must be preserved!');

      // Verify Firestore OWNER_VAULT_DOC_CODE was automatically healed with merged state!
      const healedFsVaultRaw = (
        fsDocs.get(`shared_bouquets/${OWNER_VAULT_DOC_CODE}`)?.fields?.voiceAudioDataUrl as {
          stringValue: string;
        }
      )?.stringValue;
      const healedFsVault = JSON.parse(healedFsVaultRaw);
      assert.equal(healedFsVault.phPaymentsDisabled, true, 'Firestore vault must be auto-healed to phPaymentsDisabled=true');
      assert.equal(healedFsVault.customOwnerPin, 'OUTAGE-PIN-7788', 'Firestore vault must be auto-healed with newer Blob PIN');
      assert.ok(
        healedFsVault.paidPasses.some((p: { passKey: string }) => p.passKey === historicalPass.passKey) &&
          healedFsVault.paidPasses.some((p: { passKey: string }) => p.passKey === outagePassKey),
        'Auto-healed Firestore vault must contain BOTH historical and outage paid passes'
      );

      // 2B. Fetching the outage-minted Studio Pass after Firestore returns must recover it from Blob AND backfill Firestore!
      const fetchedPass = await fetchStudioPassFromFirestoreRest(outagePassKey);
      assert.ok(fetchedPass);
      assert.equal(fetchedPass.primaryDeviceHash, buyerDevice);
      // Give microtask fire-and-forget Firestore backfill a tick to complete
      await new Promise((r) => setTimeout(r, 20));
      assert.ok(
        fsDocs.has(`studio_passes/${outagePassKey}`),
        'Studio Pass created/redeemed during 429 must auto-backfill into Firestore when Firestore returns'
      );

      // 2C. GET /api/shorten?garland=1 must show historical KeepHist000001, keep StaleGarland001 REMOVED, and heal Firestore Garland!
      const garlandRecoveryReq = createMockReqRes('GET', '/api/shorten?garland=1');
      await shortenHandler(garlandRecoveryReq.req, garlandRecoveryReq.res);
      assert.equal(garlandRecoveryReq.res.statusCode, 200);
      const recoveredEntries: Array<{ code: string }> = garlandRecoveryReq.res.json().entries;
      assert.ok(recoveredEntries.some((e) => e.code === 'KeepHist000001'), 'Historical Firestore Garland bouquet must appear');
      assert.equal(
        recoveredEntries.some((e) => e.code === 'StaleGarland001'),
        false,
        'Bouquet unpinned during Firestore 429 must NEVER resurrect when stale Firestore recovers'
      );
      const healedGarlandFs = JSON.parse(
        (
          fsDocs.get('shared_bouquets/sab_garland_feed_v1')?.fields?.voiceAudioDataUrl as {
            stringValue: string;
          }
        ).stringValue
      );
      assert.equal(
        healedGarlandFs.some((e: { code: string }) => e.code === 'StaleGarland001'),
        false,
        'Firestore Garland document must be automatically reconciled to remove StaleGarland001'
      );
    } finally {
      setBlobClientForTesting(null);
      globalThis.fetch = origFetch;
      resetOwnerVaultInMemoryForColdStartTests();
      resetOwnerBouquetLogStateForTesting();
      clearShortCodeMemoryForTesting();
      invalidateGarlandFeedMemoryCache();
    }
  });

  it('Redeploy cold-start safety: NEVER overwrites Blob Garland, Owner Vault, or Admin Log when reads fail transiently', async () => {
    const origFetch = globalThis.fetch;
    const blobStore = new Map<string, string>();
    const existingGarlandJson = JSON.stringify({
      updatedAt: '2026-11-19T00:00:00.000Z',
      entries: [
        {
          code: 'ExistingKeep01',
          to: 'Diane',
          from: 'Kai',
          createdAt: '2026-11-19T00:00:00.000Z',
          shareUrl: 'https://www.sendabouquet.online/ExistingKeep01',
          lockMode: 'none',
          isDraft: false,
          pinToShowcase: true,
          draftPayload: '#g=0.0.@0',
        },
      ],
      removedCodes: [],
    });
    const existingVaultJson = JSON.stringify({
      v: 1,
      updatedAt: '2026-11-19T00:00:00.000Z',
      phPaymentsDisabled: true,
      phDisabledUpdatedAtMs: Date.now() - 1000,
      analytics: { webVisits: 777, revenuePhpCentavos: 9900 },
    });
    const existingAdminLogJson = JSON.stringify({
      v: 1,
      updatedAt: '2026-11-19T00:00:00.000Z',
      entries: [{ code: 'ExistingKeep01', to: 'Diane', from: 'Kai', createdAt: '2026-11-19T00:00:00.000Z' }],
      deletedCodes: ['OldDeleted001'],
    });
    blobStore.set('system/garland_feed.json', existingGarlandJson);
    blobStore.set('system/owner_vault.json', existingVaultJson);
    blobStore.set('system/admin_bouquet_log.json', existingAdminLogJson);

    let putCalls = 0;
    // Simulate a transient Blob outage (get throws 503) right after a Vercel redeploy (cold start)
    setBlobClientForTesting({
      async put(pathname: string, body: string) {
        putCalls += 1;
        blobStore.set(pathname, String(body));
        return { url: `https://private-blob.test/${pathname}`, pathname };
      },
      async get() {
        throw new Error('503 Service Temporarily Unavailable');
      },
      async del(pathname: string) {
        blobStore.delete(pathname);
      },
    });

    // Simulate Firestore 429 at the same time
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: { code: 429, status: 'RESOURCE_EXHAUSTED' } }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      })) as typeof fetch;

    try {
      // Simulate fresh cold start after Vercel redeploy
      resetOwnerVaultInMemoryForColdStartTests();
      resetOwnerBouquetLogStateForTesting();
      clearShortCodeMemoryForTesting();
      invalidateGarlandFeedMemoryCache();

      // 1. Garland upsert & remove MUST abort rather than wiping ExistingKeep01
      const upsertOk = await upsertGarlandFeedInBlob('NewAfterDeploy1', '#g=0.0.@0', {
        code: 'NewAfterDeploy1',
        to: 'Ace',
        from: 'Cj',
        isDraft: false,
        pinToShowcase: true,
        draftPayload: '#g=0.0.@0',
      });
      assert.equal(upsertOk, false, 'upsertGarlandFeedInBlob must abort when Blob read fails');

      const removeOk = await removeCodesFromGarlandFeedInBlob(['SomeCode12345']);
      assert.equal(removeOk, false, 'removeCodesFromGarlandFeedInBlob must abort when Blob read fails');

      // 2. Owner Vault mutation MUST abort rather than writing empty analytics/toggles
      const vaultRes = await mutateAndSaveOwnerVaultServer(() => {
        OWNER_ANALYTICS_STATE.webVisits += 1;
        return { ok: true };
      });
      assert.equal(vaultRes.saved, false, 'Owner Vault must refuse overwrite when neither Blob nor Firestore is reachable');

      // 3. Admin Bouquet Log record MUST abort rather than wiping ExistingKeep01 & OldDeleted001
      const logRes = await recordBouquetInAdminLogServer({
        code: 'NewAfterDeploy1',
        to: 'Ace',
        from: 'Cj',
        createdAt: new Date().toISOString(),
      });
      assert.equal(logRes.saved, false, 'Admin Bouquet Log must refuse overwrite when neither Blob nor Firestore is reachable');

      assert.equal(putCalls, 0, 'ZERO Blob overwrites must happen during a cold-start read outage');
      assert.equal(blobStore.get('system/garland_feed.json'), existingGarlandJson);
      assert.equal(blobStore.get('system/owner_vault.json'), existingVaultJson);
      assert.equal(blobStore.get('system/admin_bouquet_log.json'), existingAdminLogJson);
    } finally {
      setBlobClientForTesting(null);
      globalThis.fetch = origFetch;
      resetOwnerVaultInMemoryForColdStartTests();
      resetOwnerBouquetLogStateForTesting();
      clearShortCodeMemoryForTesting();
      invalidateGarlandFeedMemoryCache();
    }
  });

  it('Public Garland feed (/api/shorten?garland=1) strictly strips lock passcodes, private card notes, and photo captions while keeping /{code} intact', async () => {
    const origFetch = globalThis.fetch;
    const blobStore = new Map<string, string>();

    setBlobClientForTesting({
      async put(pathname: string, body: string) {
        blobStore.set(pathname, String(body));
        return { url: `https://private-blob.test/${pathname}`, pathname };
      },
      async get(pathname: string) {
        const val = blobStore.get(pathname);
        if (val === undefined) return null;
        return {
          statusCode: 200,
          stream: new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode(val));
              controller.close();
            },
          }),
        };
      },
      async del(pathname: string) {
        blobStore.delete(pathname);
      },
    });

    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: { code: 429, status: 'RESOURCE_EXHAUSTED' } }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      })) as typeof fetch;

    try {
      resetOwnerVaultInMemoryForColdStartTests();
      resetOwnerBouquetLogStateForTesting();
      clearShortCodeMemoryForTesting();
      invalidateGarlandFeedMemoryCache();

      const snap: BouquetSnapshot = {
        items: [
          {
            id: 'rose-1',
            type: 'rose',
            x: 300,
            y: 260,
            scale: 1.1,
            rotation: 0,
            flipX: false,
            petalColor: '#E11D48',
            centerColor: '#FDE047',
            stemLength: 1,
            locked: false,
            hidden: false,
          },
          {
            id: 'photo-1',
            type: 'rose',
            x: 360,
            y: 320,
            scale: 1.0,
            rotation: -6,
            flipX: false,
            petalColor: '#FFFDF9',
            centerColor: '#9E4757',
            stemLength: 1,
            locked: false,
            hidden: false,
            photoStyle: 'polaroid',
            photoCaption: 'Secret Paris Rooftop',
            photoDataUrl: 'data:image/jpeg;base64,' + 'A'.repeat(256),
          },
        ],
        wrapStyle: 'kraft',
        wrapColor: '#DFC4A6',
        ribbonColor: '#E11D48',
        ribbonStyle: 'satin',
        environment: 'studio',
        card: {
          to: 'Diane',
          from: 'Kai',
          message: 'My private anniversary note that must stay hidden until unlocked.',
          theme: 'sealed',
          visibleOnStage: true,
        },
        lock: {
          mode: 'passcode',
          questionPrompt: 'Where did we first meet?',
          passcodeAnswer: 'paris2026',
          passcodeType: 'word',
        },
      };

      const fullPayload = encodeBouquetToCompactPayload(snap, true);
      const code = 'SecGarland001';

      // Save full bouquet + pin to Garland via Blob
      await upsertGarlandFeedInBlob(code, fullPayload, {
        code,
        to: 'Diane',
        from: 'Kai',
        lockMode: 'passcode',
        isDraft: false,
        pinToShowcase: true,
        draftPayload: fullPayload,
      });

      invalidateGarlandFeedMemoryCache();
      const garlandReq = createMockReqRes('GET', '/api/shorten?garland=1');
      await shortenHandler(garlandReq.req, garlandReq.res);
      assert.equal(garlandReq.res.statusCode, 200);

      const garlandJson = garlandReq.res.json();
      const entry = garlandJson.entries.find((e: { code: string }) => e.code === code);
      assert.ok(entry, 'Pinned entry must be returned by /api/shorten?garland=1');
      assert.equal(entry.lockMode, 'none', 'Public Garland entry must normalize lockMode to none');
      assert.equal(
        String(entry.draftPayload).includes('&l='),
        false,
        'Public Garland draftPayload must NEVER contain &l= lock parameters or passcode answers'
      );

      // Decode the sanitized Garland draftPayload and verify zero secret leakage
      const decodedPreview = decodeBouquetFromHash(entry.draftPayload);
      assert.ok(decodedPreview, 'Sanitized Garland draftPayload must still decode cleanly for thumbnail rendering');
      assert.equal(decodedPreview?.card.to, 'Diane');
      assert.equal(decodedPreview?.card.from, 'Kai');
      assert.equal(decodedPreview?.card.message, '', 'Private greeting card message must be stripped from public Garland feed');
      assert.equal(decodedPreview?.lock?.mode, 'none', 'Lock mode/answer must be stripped from public Garland feed');
      assert.equal(decodedPreview?.lock?.passcodeAnswer || '', '');
      const previewPhoto = decodedPreview?.items.find((it) => it.photoStyle === 'polaroid');
      assert.ok(previewPhoto, 'Photocard frame geometry should remain intact for visual thumbnail');
      assert.equal(previewPhoto?.photoDataUrl, undefined, 'Inline photo data must be stripped from public Garland feed');
      assert.notEqual(
        previewPhoto?.photoCaption,
        'Secret Paris Rooftop',
        'Custom photo caption must be stripped from public Garland feed'
      );
    } finally {
      setBlobClientForTesting(null);
      globalThis.fetch = origFetch;
      resetOwnerVaultInMemoryForColdStartTests();
      resetOwnerBouquetLogStateForTesting();
      clearShortCodeMemoryForTesting();
      invalidateGarlandFeedMemoryCache();
    }
  });
});


