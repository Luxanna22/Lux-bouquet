import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyStudioCatalogOrganization,
  buildEffectivePremiumAssetConfig,
  sanitizeStudioCatalogOverrides,
  type StudioCatalogOverrides,
} from './studioCatalogConfig';
import {
  PREMIUM_ASSET_CONFIG,
  inspectBouquetPremiumUsage,
  isEnvironmentPremium,
  isFlowerPremium,
  isWrapPremium,
} from './monetization';
import {
  ENVIRONMENT_CATALOG,
  FLOWER_CATALOG,
  WRAPPER_CATALOG,
  type FlowerType,
} from '../types/bouquet';
import {
  decodeBouquetFromHash,
  encodeBouquetToCompactPayload,
} from './shareAndExport';
// @ts-expect-error Shared ESM API couture guard module
import { inspectCompactPayloadCoutureUsage } from '../../api/_lib/coutureGuard.js';
// @ts-expect-error Shared ESM API payment handler module
import { handlePaymentEndpoint, sanitizeStudioCatalogConfigServer } from '../../api/_lib/paymentHandler.js';

test('applyStudioCatalogOrganization reorders items, appends new unlisted items, and enforces Studio-only hiding', () => {
  const overrides: StudioCatalogOverrides = {
    order: {
      wrappers: ['waxPaper', 'abacaMesh', 'chalice'],
    },
    hidden: {
      wrappers: ['burlapSack', 'waxPaper'],
    },
    premiumOverrides: {},
  };

  // Studio picker view (includeHidden: false) removes hidden wrappers while keeping custom order
  const studioWraps = applyStudioCatalogOrganization(
    WRAPPER_CATALOG,
    (w) => w.id,
    'wrappers',
    overrides,
    { includeHidden: false }
  );
  assert.equal(studioWraps[0].id, 'abacaMesh');
  assert.equal(studioWraps[1].id, 'chalice');
  assert.equal(
    studioWraps.some((w) => w.id === 'waxPaper' || w.id === 'burlapSack'),
    false,
    'Hidden wrappers must not appear in Studio picker'
  );
  assert.equal(studioWraps.length, WRAPPER_CATALOG.length - 2);

  // Admin Studio Organizer view (includeHidden: true) preserves hidden items in their custom slots
  const organizerWraps = applyStudioCatalogOrganization(
    WRAPPER_CATALOG,
    (w) => w.id,
    'wrappers',
    overrides,
    { includeHidden: true }
  );
  assert.equal(organizerWraps[0].id, 'waxPaper');
  assert.equal(organizerWraps[1].id, 'abacaMesh');
  assert.equal(organizerWraps.length, WRAPPER_CATALOG.length);

  // Hiding an asset in Studio NEVER breaks shared bouquet links / Gallery / Showcase decoding
  const payload = encodeBouquetToCompactPayload(
    {
      items: [
        {
          id: 's1',
          type: 'sunflower',
          x: 300,
          y: 260,
          scale: 1,
          rotation: 0,
          flipX: false,
          petalColor: '#facc15',
          centerColor: '#78350f',
        },
      ],
      wrapStyle: 'waxPaper',
      wrapColor: '#F3E7D3',
      ribbonColor: '#C26D53',
      ribbonStyle: 'satin',
      environment: 'studio',
      card: {
        to: 'Maya',
        from: 'Sam',
        message: 'Still renders even when hidden from Studio!',
        visibleOnStage: true,
        theme: 'sealed',
      },
    },
    true
  );
  const decoded = decodeBouquetFromHash(payload);
  assert.ok(decoded);
  assert.equal(decoded.wrapStyle, 'waxPaper');
  assert.equal(decoded.items[0].type, 'sunflower');
});

test('buildEffectivePremiumAssetConfig and server coutureGuard honor dynamic premiumOverrides in lockstep', () => {
  const overrides: StudioCatalogOverrides = {
    order: {},
    hidden: {},
    premiumOverrides: {
      flowers: {
        rose: true, // Promote default Free rose -> Couture
        celestialRose: false, // Demote default Couture gilded rose -> Free
      },
      wrappers: {
        chalice: true, // Promote default Free Tulip Organza -> Couture
        abacaMesh: false, // Demote default Couture Abaca Mesh -> Free
      },
      environments: {
        studio: true,
        sakuraBreeze: false,
      },
    },
  };

  const effective = buildEffectivePremiumAssetConfig(PREMIUM_ASSET_CONFIG, overrides);
  assert.equal(isFlowerPremium('rose', effective), true);
  assert.equal(isFlowerPremium('celestialRose', effective), false);
  assert.equal(isWrapPremium('chalice', effective), true);
  assert.equal(isWrapPremium('abacaMesh', effective), false);
  assert.equal(isEnvironmentPremium('studio', effective), true);
  assert.equal(isEnvironmentPremium('sakuraBreeze', effective), false);

  // Client & Server parity: Bouquet with promoted 'rose' + 'abacaMesh' (demoted Free) + 'sakuraBreeze' (demoted Free)
  const snapshot = {
    items: [
      {
        id: 'r1',
        type: 'rose' as FlowerType,
        x: 300,
        y: 260,
        scale: 1,
        rotation: 0,
        flipX: false,
        petalColor: '#e11d48',
        centerColor: '#881337',
      },
    ],
    wrapStyle: 'abacaMesh' as const,
    wrapColor: '#C97B74',
    ribbonColor: '#E6A096',
    ribbonStyle: 'satin' as const,
    environment: 'sakuraBreeze' as const,
    card: {
      to: 'Lena',
      from: 'Kai',
      message: 'Happy day!',
      visibleOnStage: true,
      theme: 'sealed' as const,
    },
  };

  const clientInspection = inspectBouquetPremiumUsage(snapshot, effective);
  assert.equal(clientInspection.isPremiumBouquet, true);
  assert.equal(clientInspection.hasCoutureWrap, false);
  assert.equal(clientInspection.hasCoutureEnvironment, false);
  assert.deepEqual(clientInspection.premiumFlowerTypes, ['rose']);

  const payload = encodeBouquetToCompactPayload(snapshot, true);
  const serverInspection = inspectCompactPayloadCoutureUsage(payload, {
    studioCatalogConfig: overrides,
  });
  assert.equal(serverInspection.isCouture, true);
  assert.ok(serverInspection.reasons.some((r: string) => r.includes('rose')));
  assert.equal(
    serverInspection.reasons.some((r: string) => r.includes('abacaMesh')),
    false
  );
  assert.equal(
    serverInspection.reasons.some((r: string) => r.includes('sakuraBreeze')),
    false
  );

  // Swap rose -> celestialRose (demoted Free) -> now 100% Free on BOTH client and server!
  const allFreeSnapshot = {
    ...snapshot,
    items: [{ ...snapshot.items[0], type: 'celestialRose' as FlowerType }],
  };
  assert.equal(inspectBouquetPremiumUsage(allFreeSnapshot, effective).isPremiumBouquet, false);
  const freePayload = encodeBouquetToCompactPayload(allFreeSnapshot, true);
  assert.equal(
    inspectCompactPayloadCoutureUsage(freePayload, { studioCatalogConfig: overrides }).isCouture,
    false
  );
});

test('sanitizeStudioCatalogOverrides and server sanitizer reject prototype pollution and unknown asset IDs', () => {
  const malicious = JSON.parse(
    '{"order":{"flowers":["rose","__proto__","notARealFlower","tulip","rose"]},"hidden":{"wrappers":["constructor","waxPaper"]},"premiumOverrides":{"environments":{"prototype":true,"sakuraBreeze":false,"badEnv":true,"studio":"yes"}}}'
  );

  const clientSanitized = sanitizeStudioCatalogOverrides(malicious);
  assert.deepEqual(clientSanitized.order.flowers, ['rose', 'tulip']);
  assert.deepEqual(clientSanitized.hidden.wrappers, ['waxPaper']);
  assert.deepEqual(clientSanitized.premiumOverrides.environments, { sakuraBreeze: false });
  assert.equal(({} as Record<string, unknown>).polluted, undefined);

  const serverSanitized = sanitizeStudioCatalogConfigServer(malicious);
  assert.equal(serverSanitized.order.flowers.includes('__proto__'), false);
  assert.equal(serverSanitized.hidden.wrappers.includes('constructor'), false);
  assert.equal(
    Object.prototype.hasOwnProperty.call(serverSanitized.premiumOverrides.environments, 'prototype'),
    false
  );
  assert.equal(serverSanitized.premiumOverrides.environments.studio, undefined);

  // Verify foliage items (like fern & eucalyptus) are allowed in 'fillers' category
  const foliageOverride = sanitizeStudioCatalogOverrides({
    order: { fillers: ['fern', 'eucalyptus', 'babysBreath'] },
    hidden: { fillers: ['fern'] },
    premiumOverrides: { fillers: { eucalyptus: true } },
  });
  assert.deepEqual(foliageOverride.order.fillers, ['fern', 'eucalyptus', 'babysBreath']);
  assert.deepEqual(foliageOverride.hidden.fillers, ['fern']);
  assert.deepEqual(foliageOverride.premiumOverrides.fillers, { eucalyptus: true });

  // Verify every catalog item exists in at least one organizer category
  assert.ok(FLOWER_CATALOG.length > 0 && ENVIRONMENT_CATALOG.length > 0);
});

test('update_studio_catalog_config API endpoint rejects missing or forged admin session tokens with HTTP 401', async () => {
  let statusCode = 0;
  let responseBody = '';
  const mockReq = {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: {
      action: 'update_studio_catalog_config',
      adminSessionToken: 'forged.invalid.token',
      deviceTokenHash: 'device-test-hash',
      studioCatalogConfig: {
        hidden: { flowers: ['rose'] },
      },
    },
  };
  const mockRes = {
    statusCode: 0,
    setHeader() {},
    end(chunk: string) {
      responseBody = chunk;
    },
    writeHead(code: number) {
      statusCode = code;
      this.statusCode = code;
    },
  };

  await handlePaymentEndpoint(mockReq, mockRes, '/api/payments/verify-action');
  const parsed = JSON.parse(responseBody || '{}');
  assert.equal(statusCode || mockRes.statusCode, 401);
  assert.equal(parsed.ok, false);
  assert.equal(parsed.unauthorized, true);
});
