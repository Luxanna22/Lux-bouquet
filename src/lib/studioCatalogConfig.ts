import {
  CanvasEnvironment,
  ENVIRONMENT_CATALOG,
  FLOWER_CATALOG,
  FlowerType,
  PHOTO_FRAME_CATALOG,
  PhotoFrameStyle,
  RIBBON_STYLE_CATALOG,
  RibbonStyle,
  typeWrapStyle,
  VOICE_KEEPSAKE_CATALOG,
  VoiceKeepsakeStyle,
  WRAPPER_CATALOG,
} from '../types/bouquet';

export type StudioCatalogCategory =
  | 'flowers'
  | 'fillers'
  | 'others'
  | 'seasonal'
  | 'wrappers'
  | 'ribbons'
  | 'environments'
  | 'voices'
  | 'photos';

export interface StudioCatalogOverrides {
  /** Custom display order per category (asset IDs). New/unlisted catalog items append automatically. */
  order: Partial<Record<StudioCatalogCategory, string[]>>;
  /** Asset IDs hidden from the Studio creator picker ONLY. Never affects Gallery, Showcase, Vault, or Shared Links. */
  hidden: Partial<Record<StudioCatalogCategory, string[]>>;
  /** Explicit per-asset Premium (true = Couture) or Free (false = Free) overrides layered over default config. */
  premiumOverrides: Partial<Record<StudioCatalogCategory, Record<string, boolean>>>;
  /** Optional ISO timestamp from last owner update. */
  updatedAt?: string;
}

export interface StudioCatalogCategoryMeta {
  id: StudioCatalogCategory;
  label: string;
  shortLabel: string;
  description: string;
}

export const STUDIO_CATALOG_CATEGORIES: StudioCatalogCategoryMeta[] = [
  {
    id: 'flowers',
    label: 'Focal Blooms',
    shortLabel: 'Blooms',
    description: 'Primary roses, peonies, lilies, orchids & signature stems in the Studio picker.',
  },
  {
    id: 'fillers',
    label: 'Foliage & Fillers',
    shortLabel: 'Fillers',
    description: 'Greenery, eucalyptus, fern, baby’s breath & airy accent sprays.',
  },
  {
    id: 'others',
    label: 'Charms & Keepsakes',
    shortLabel: 'Accents',
    description: 'Butterflies, hearts, pets, celestial icons & romantic gift picks.',
  },
  {
    id: 'seasonal',
    label: 'Seasonal Holiday',
    shortLabel: 'Seasonal',
    description: 'Holiday blooms, holly, snowflakes & festive winter picks.',
  },
  {
    id: 'wrappers',
    label: 'Wraps & Vessels',
    shortLabel: 'Wraps',
    description: 'Bouquet papers, tulle, nets, vases, hatboxes, baskets & hand-tied.',
  },
  {
    id: 'ribbons',
    label: 'Ribbons & Ties',
    shortLabel: 'Ribbons',
    description: 'Satin bows, lace, velvet, pearls, chains & silk finishes.',
  },
  {
    id: 'environments',
    label: 'Backgrounds',
    shortLabel: 'Vibes',
    description: 'Studio lighting backdrops, silk drapes, arches & scenic vibes.',
  },
  {
    id: 'voices',
    label: 'Voice Keepsakes',
    shortLabel: 'Voice',
    description: 'Recordable cassette, vinyl, plushie, music box & locket charms.',
  },
  {
    id: 'photos',
    label: 'Photo Frames',
    shortLabel: 'Photos',
    description: 'Instant polaroid, postage stamp, cameo & botanical glass frames.',
  },
];

export const EMPTY_STUDIO_CATALOG_OVERRIDES: StudioCatalogOverrides = {
  order: {},
  hidden: {},
  premiumOverrides: {},
};

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function getCategoryAllowedIds(category: StudioCatalogCategory): string[] {
  switch (category) {
    case 'flowers':
      return FLOWER_CATALOG.filter(
        (f) => !f.isFoliage && !f.isFiller && !f.isOther && !f.isSeasonal
      ).map((f) => f.type);
    case 'fillers':
      return FLOWER_CATALOG.filter(
        (f) => Boolean(f.isFoliage || f.isFiller) && !f.isOther && !f.isSeasonal
      ).map((f) => f.type);
    case 'others':
      return FLOWER_CATALOG.filter((f) => Boolean(f.isOther)).map((f) => f.type);
    case 'seasonal':
      return FLOWER_CATALOG.filter((f) => Boolean(f.isSeasonal)).map((f) => f.type);
    case 'wrappers':
      return WRAPPER_CATALOG.map((w) => w.id);
    case 'ribbons':
      return RIBBON_STYLE_CATALOG.map((r) => r.id);
    case 'environments':
      return ENVIRONMENT_CATALOG.map((e) => e.id);
    case 'voices':
      return VOICE_KEEPSAKE_CATALOG.map((v) => v.id);
    case 'photos':
      return [...PHOTO_FRAME_CATALOG.map((p) => p.id), 'raw'];
    default:
      return [];
  }
}

export function sanitizeStudioCatalogOverrides(raw: unknown): StudioCatalogOverrides {
  const result: StudioCatalogOverrides = {
    order: {},
    hidden: {},
    premiumOverrides: {},
  };

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return result;
  }

  const src = raw as Record<string, unknown>;
  const rawOrder =
    src.order && typeof src.order === 'object' && !Array.isArray(src.order)
      ? (src.order as Record<string, unknown>)
      : {};
  const rawHidden =
    src.hidden && typeof src.hidden === 'object' && !Array.isArray(src.hidden)
      ? (src.hidden as Record<string, unknown>)
      : {};
  const rawPremium =
    src.premiumOverrides &&
    typeof src.premiumOverrides === 'object' &&
    !Array.isArray(src.premiumOverrides)
      ? (src.premiumOverrides as Record<string, unknown>)
      : {};

  for (const catMeta of STUDIO_CATALOG_CATEGORIES) {
    const cat = catMeta.id;
    const allowedSet = new Set(getCategoryAllowedIds(cat));

    const orderList = rawOrder[cat];
    if (Array.isArray(orderList)) {
      const seen = new Set<string>();
      const cleaned: string[] = [];
      for (const entry of orderList) {
        if (typeof entry !== 'string' || FORBIDDEN_KEYS.has(entry)) continue;
        if (!allowedSet.has(entry) || seen.has(entry)) continue;
        seen.add(entry);
        cleaned.push(entry);
      }
      if (cleaned.length > 0) {
        result.order[cat] = cleaned;
      }
    }

    const hiddenList = rawHidden[cat];
    if (Array.isArray(hiddenList)) {
      const seen = new Set<string>();
      const cleaned: string[] = [];
      for (const entry of hiddenList) {
        if (typeof entry !== 'string' || FORBIDDEN_KEYS.has(entry)) continue;
        if (!allowedSet.has(entry) || seen.has(entry)) continue;
        seen.add(entry);
        cleaned.push(entry);
      }
      if (cleaned.length > 0) {
        result.hidden[cat] = cleaned;
      }
    }

    const premMap = rawPremium[cat];
    if (premMap && typeof premMap === 'object' && !Array.isArray(premMap)) {
      const cleanedMap: Record<string, boolean> = Object.create(null);
      let count = 0;
      for (const [k, v] of Object.entries(premMap as Record<string, unknown>)) {
        if (FORBIDDEN_KEYS.has(k) || !allowedSet.has(k)) continue;
        if (typeof v !== 'boolean') continue;
        cleanedMap[k] = v;
        count += 1;
      }
      if (count > 0) {
        result.premiumOverrides[cat] = { ...cleanedMap };
      }
    }
  }

  if (typeof src.updatedAt === 'string' && src.updatedAt.trim().length > 0) {
    result.updatedAt = src.updatedAt.trim().slice(0, 64);
  }

  return result;
}

export interface MinimalPremiumAssetConfig {
  flowers: FlowerType[];
  wraps: typeWrapStyle[];
  ribbons: RibbonStyle[];
  environments?: CanvasEnvironment[];
  photoStyles?: PhotoFrameStyle[];
  voiceStyles: VoiceKeepsakeStyle[];
}

function applyBooleanOverrides<T extends string>(
  baseList: readonly T[],
  overrideMaps: Array<Record<string, boolean> | undefined>,
  allowedSet: Set<string>
): T[] {
  const active = new Set<string>(baseList);
  for (const map of overrideMaps) {
    if (!map) continue;
    for (const [id, isPrem] of Object.entries(map)) {
      if (FORBIDDEN_KEYS.has(id) || !allowedSet.has(id)) continue;
      if (isPrem) {
        active.add(id);
      } else {
        active.delete(id);
      }
    }
  }
  return Array.from(active) as T[];
}

/**
 * Merges Owner Studio Organizer premium/free overrides cleanly onto a base PremiumAssetConfig.
 */
export function buildEffectivePremiumAssetConfig<T extends MinimalPremiumAssetConfig>(
  baseConfig: T,
  overrides: StudioCatalogOverrides = EMPTY_STUDIO_CATALOG_OVERRIDES
): T {
  const prem = overrides?.premiumOverrides || {};
  const hasAnyOverride =
    Boolean(prem.flowers) ||
    Boolean(prem.fillers) ||
    Boolean(prem.others) ||
    Boolean(prem.seasonal) ||
    Boolean(prem.wrappers) ||
    Boolean(prem.ribbons) ||
    Boolean(prem.environments) ||
    Boolean(prem.voices) ||
    Boolean(prem.photos);

  if (!hasAnyOverride) {
    return baseConfig;
  }

  const allFlowerIds = new Set(FLOWER_CATALOG.map((f) => f.type));
  const allWrapIds = new Set(WRAPPER_CATALOG.map((w) => w.id));
  const allRibbonIds = new Set(RIBBON_STYLE_CATALOG.map((r) => r.id));
  const allEnvIds = new Set(ENVIRONMENT_CATALOG.map((e) => e.id));
  const allVoiceIds = new Set(VOICE_KEEPSAKE_CATALOG.map((v) => v.id));
  const allPhotoIds = new Set<string>([...PHOTO_FRAME_CATALOG.map((p) => p.id), 'raw']);

  return {
    ...baseConfig,
    flowers: applyBooleanOverrides<FlowerType>(
      baseConfig.flowers,
      [prem.flowers, prem.fillers, prem.others, prem.seasonal],
      allFlowerIds
    ),
    wraps: applyBooleanOverrides<typeWrapStyle>(baseConfig.wraps, [prem.wrappers], allWrapIds),
    ribbons: applyBooleanOverrides<RibbonStyle>(baseConfig.ribbons, [prem.ribbons], allRibbonIds),
    environments: applyBooleanOverrides<CanvasEnvironment>(
      baseConfig.environments || [],
      [prem.environments],
      allEnvIds
    ),
    voiceStyles: applyBooleanOverrides<VoiceKeepsakeStyle>(
      baseConfig.voiceStyles,
      [prem.voices],
      allVoiceIds
    ),
    photoStyles: applyBooleanOverrides<PhotoFrameStyle>(
      baseConfig.photoStyles || [],
      [prem.photos],
      allPhotoIds
    ),
  };
}

/**
 * Applies custom display ordering and (optionally) Studio-only visibility filtering to any catalog list.
 * When `includeHidden` is true (e.g., inside the Admin Studio Organizer), hidden items remain present.
 * When `includeHidden` is false (default, for Studio creator pickers), hidden items are omitted.
 * Note: Gallery, Showcase, Vault, and Recipient Shared Links never call this filter, so existing bouquets always render intact.
 */
export function applyStudioCatalogOrganization<T>(
  items: readonly T[],
  getId: (item: T) => string,
  category: StudioCatalogCategory,
  overrides: StudioCatalogOverrides = EMPTY_STUDIO_CATALOG_OVERRIDES,
  options: { includeHidden?: boolean } = {}
): T[] {
  const customOrder = overrides?.order?.[category] || [];
  const hiddenSet = new Set(overrides?.hidden?.[category] || []);
  const includeHidden = Boolean(options.includeHidden);

  const byId = new Map<string, T>();
  for (const item of items) {
    byId.set(getId(item), item);
  }

  const ordered: T[] = [];
  const seen = new Set<string>();

  for (const id of customOrder) {
    const match = byId.get(id);
    if (!match || seen.has(id)) continue;
    seen.add(id);
    if (!includeHidden && hiddenSet.has(id)) continue;
    ordered.push(match);
  }

  for (const item of items) {
    const id = getId(item);
    if (seen.has(id)) continue;
    seen.add(id);
    if (!includeHidden && hiddenSet.has(id)) continue;
    ordered.push(item);
  }

  return ordered;
}

export function isItemHiddenInStudio(
  category: StudioCatalogCategory,
  id: string,
  overrides: StudioCatalogOverrides = EMPTY_STUDIO_CATALOG_OVERRIDES
): boolean {
  const hidden = overrides?.hidden?.[category];
  return Array.isArray(hidden) ? hidden.includes(id) : false;
}

// ============================================================================
// REACTIVE CLIENT STORE FOR LIVE STUDIO CATALOG OVERRIDES
// ============================================================================

const LOCAL_STORAGE_KEY = 'sendabouquet_studio_catalog_overrides_v1';

let liveStudioCatalogOverrides: StudioCatalogOverrides = (() => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const cached = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        return sanitizeStudioCatalogOverrides(JSON.parse(cached));
      }
    }
  } catch {
    // Ignore storage access failures in private/sandboxed browsers
  }
  return EMPTY_STUDIO_CATALOG_OVERRIDES;
})();

const listeners = new Set<(next: StudioCatalogOverrides) => void>();

export function getLiveStudioCatalogOverrides(): StudioCatalogOverrides {
  return liveStudioCatalogOverrides;
}

export function setLiveStudioCatalogOverrides(next: unknown): StudioCatalogOverrides {
  const sanitized = sanitizeStudioCatalogOverrides(next);
  liveStudioCatalogOverrides = sanitized;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sanitized));
    }
  } catch {
    // Ignore storage quota/access issues
  }
  listeners.forEach((fn) => {
    try {
      fn(sanitized);
    } catch {
      // Ignore individual subscriber errors
    }
  });
  return sanitized;
}

export function subscribeStudioCatalogOverrides(
  listener: (next: StudioCatalogOverrides) => void
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

let inflightCatalogFetch: Promise<StudioCatalogOverrides> | null = null;

export async function fetchStudioCatalogOverridesFromServer(
  options: { force?: boolean } = {}
): Promise<StudioCatalogOverrides> {
  if (inflightCatalogFetch && !options.force) {
    return inflightCatalogFetch;
  }
  inflightCatalogFetch = (async () => {
    try {
      const res = await fetch('/api/payments/verify-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_studio_catalog_config' }),
      });
      if (!res.ok) return liveStudioCatalogOverrides;
      const data = await res.json();
      if (data?.ok && data.studioCatalogConfig) {
        return setLiveStudioCatalogOverrides(data.studioCatalogConfig);
      }
    } catch {
      // Keep cached or default catalog config when offline
    } finally {
      inflightCatalogFetch = null;
    }
    return liveStudioCatalogOverrides;
  })();
  return inflightCatalogFetch;
}
