import {
  BouquetSnapshot,
  DEFAULT_BOUQUET_LOCK,
  DEFAULT_BOUQUET_POSE,
  DEFAULT_VOICE_KEEPSAKE,
} from '../types/bouquet';

export const STUDIO_CANVAS_RECOVERY_KEY = 'bouquet_studio_canvas_recovery_v1';

const DEFAULT_STUDIO_CARD = {
  to: 'My Dearest',
  from: 'Yours Always',
  message: 'Every petal in this bouquet holds a reason why you make my world brighter.',
  visibleOnStage: true,
  theme: 'sealed',
  x: 410,
  y: 525,
  scale: 0.72,
  rotation: 0,
} as const;

export interface StudioCanvasRecoveryRecord {
  version: 1;
  updatedAt: string;
  wasInStudio: boolean;
  hasUnsavedChanges: boolean;
  sourceVaultCode: string | null;
  isSourceDraft: boolean;
  snapshot: BouquetSnapshot;
}

type StorageReader = Pick<Storage, 'getItem'>;
type StorageWriter = Pick<Storage, 'setItem' | 'removeItem'>;
type StorageReadWriter = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function getBrowserLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function hasMeaningfulCanvasState(snapshot: BouquetSnapshot | null | undefined): boolean {
  if (!snapshot) return false;
  if (Array.isArray(snapshot.items) && snapshot.items.length > 0) return true;
  if ((snapshot.wrapStyle || 'chalice') !== 'chalice') return true;
  if ((snapshot.wrapColor || '#EDE0F5').toLowerCase() !== '#ede0f5') return true;
  if ((snapshot.ribbonStyle || 'satin') !== 'satin') return true;
  if ((snapshot.ribbonColor || '#C084FC').toLowerCase() !== '#c084fc') return true;
  if ((snapshot.environment || 'studio') !== 'studio') return true;

  const pose = snapshot.bouquetPose;
  if (
    pose &&
    (Math.round(pose.x ?? DEFAULT_BOUQUET_POSE.x) !== DEFAULT_BOUQUET_POSE.x ||
      Math.round(pose.y ?? DEFAULT_BOUQUET_POSE.y) !== DEFAULT_BOUQUET_POSE.y ||
      Math.abs((pose.scale ?? DEFAULT_BOUQUET_POSE.scale) - DEFAULT_BOUQUET_POSE.scale) > 0.01 ||
      Math.round(pose.rotation ?? DEFAULT_BOUQUET_POSE.rotation) !== DEFAULT_BOUQUET_POSE.rotation)
  ) {
    return true;
  }

  const c = snapshot.card;
  if (c) {
    if ((c.to ?? DEFAULT_STUDIO_CARD.to) !== DEFAULT_STUDIO_CARD.to) return true;
    if ((c.from ?? DEFAULT_STUDIO_CARD.from) !== DEFAULT_STUDIO_CARD.from) return true;
    if ((c.message ?? DEFAULT_STUDIO_CARD.message) !== DEFAULT_STUDIO_CARD.message) return true;
    if ((c.theme || DEFAULT_STUDIO_CARD.theme) !== DEFAULT_STUDIO_CARD.theme) return true;
    if (Boolean(c.customBg) || Boolean(c.customAccent)) return true;
    if (c.visibleOnStage === false) return true;
    if (
      Math.round(c.x ?? DEFAULT_STUDIO_CARD.x) !== DEFAULT_STUDIO_CARD.x ||
      Math.round(c.y ?? DEFAULT_STUDIO_CARD.y) !== DEFAULT_STUDIO_CARD.y ||
      Math.abs((c.scale ?? DEFAULT_STUDIO_CARD.scale) - DEFAULT_STUDIO_CARD.scale) > 0.01 ||
      Math.round(c.rotation ?? DEFAULT_STUDIO_CARD.rotation) !== DEFAULT_STUDIO_CARD.rotation
    ) {
      return true;
    }
  }

  if (snapshot.voice?.audioDataUrl || snapshot.voice?.visibleOnStage) return true;
  if (snapshot.lock?.mode && snapshot.lock.mode !== 'none') return true;

  return false;
}

function normalizeRecoveredSnapshot(raw: Partial<BouquetSnapshot>): BouquetSnapshot | null {
  if (!raw || !Array.isArray(raw.items) || !raw.card) return null;
  return {
    items: raw.items.map((item) => ({ ...item })),
    wrapStyle: raw.wrapStyle || 'chalice',
    wrapColor: raw.wrapColor || '#EDE0F5',
    ribbonColor: raw.ribbonColor || '#C084FC',
    ribbonStyle: raw.ribbonStyle || 'satin',
    environment: raw.environment || 'studio',
    bouquetPose: raw.bouquetPose
      ? { ...DEFAULT_BOUQUET_POSE, ...raw.bouquetPose }
      : { ...DEFAULT_BOUQUET_POSE },
    card: {
      to: raw.card.to ?? DEFAULT_STUDIO_CARD.to,
      from: raw.card.from ?? DEFAULT_STUDIO_CARD.from,
      message: raw.card.message ?? DEFAULT_STUDIO_CARD.message,
      visibleOnStage: raw.card.visibleOnStage ?? true,
      theme: raw.card.theme || 'sealed',
      customBg: raw.card.customBg,
      customAccent: raw.card.customAccent,
      x: raw.card.x ?? DEFAULT_STUDIO_CARD.x,
      y: raw.card.y ?? DEFAULT_STUDIO_CARD.y,
      scale: raw.card.scale ?? DEFAULT_STUDIO_CARD.scale,
      rotation: raw.card.rotation ?? DEFAULT_STUDIO_CARD.rotation,
    },
    voice: raw.voice
      ? { ...DEFAULT_VOICE_KEEPSAKE, ...raw.voice }
      : { ...DEFAULT_VOICE_KEEPSAKE },
    lock: raw.lock
      ? { ...DEFAULT_BOUQUET_LOCK, ...raw.lock }
      : { ...DEFAULT_BOUQUET_LOCK },
  };
}

export function loadCanvasRecoverySnapshot(
  storageOverride?: StorageReader
): StudioCanvasRecoveryRecord | null {
  const storage = storageOverride || getBrowserLocalStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(STUDIO_CANVAS_RECOVERY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StudioCanvasRecoveryRecord> | null;
    if (!parsed || parsed.version !== 1 || !parsed.snapshot) return null;
    const snapshot = normalizeRecoveredSnapshot(parsed.snapshot);
    if (!snapshot || !hasMeaningfulCanvasState(snapshot)) return null;
    return {
      version: 1,
      updatedAt:
        typeof parsed.updatedAt === 'string' && parsed.updatedAt
          ? parsed.updatedAt
          : new Date().toISOString(),
      wasInStudio: Boolean(parsed.wasInStudio),
      hasUnsavedChanges: Boolean(parsed.hasUnsavedChanges),
      sourceVaultCode:
        typeof parsed.sourceVaultCode === 'string' && parsed.sourceVaultCode
          ? parsed.sourceVaultCode
          : null,
      isSourceDraft: Boolean(parsed.isSourceDraft),
      snapshot,
    };
  } catch {
    return null;
  }
}

export function clearCanvasRecoverySnapshot(
  storageOverride?: Pick<Storage, 'removeItem'>
): void {
  const storage = storageOverride || getBrowserLocalStorage();
  if (!storage) return;
  try {
    storage.removeItem(STUDIO_CANVAS_RECOVERY_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function saveCanvasRecoverySnapshot(
  params: {
    snapshot: BouquetSnapshot;
    wasInStudio: boolean;
    hasUnsavedChanges: boolean;
    sourceVaultCode?: string | null;
    isSourceDraft?: boolean;
  },
  storageOverride?: StorageWriter
): boolean {
  const storage = storageOverride || getBrowserLocalStorage();
  if (!storage) return false;

  if (!hasMeaningfulCanvasState(params.snapshot)) {
    clearCanvasRecoverySnapshot(storage);
    return false;
  }

  const baseRecord: StudioCanvasRecoveryRecord = {
    version: 1,
    updatedAt: new Date().toISOString(),
    wasInStudio: Boolean(params.wasInStudio),
    hasUnsavedChanges: Boolean(params.hasUnsavedChanges),
    sourceVaultCode: params.sourceVaultCode || null,
    isSourceDraft: Boolean(params.isSourceDraft),
    snapshot: params.snapshot,
  };

  try {
    storage.setItem(STUDIO_CANVAS_RECOVERY_KEY, JSON.stringify(baseRecord));
    return true;
  } catch {
    // Quota fallback 1: strip inline voice recording audio while keeping arrangement, photos & card
    try {
      const noAudioRecord: StudioCanvasRecoveryRecord = {
        ...baseRecord,
        snapshot: {
          ...params.snapshot,
          voice: params.snapshot.voice
            ? { ...params.snapshot.voice, audioDataUrl: null }
            : { ...DEFAULT_VOICE_KEEPSAKE },
        },
      };
      storage.setItem(STUDIO_CANVAS_RECOVERY_KEY, JSON.stringify(noAudioRecord));
      return true;
    } catch {
      // Quota fallback 2: also strip large inline photo data URLs while preserving layout & notes
      try {
        const leanRecord: StudioCanvasRecoveryRecord = {
          ...baseRecord,
          snapshot: {
            ...params.snapshot,
            items: params.snapshot.items.map((item) =>
              item.photoDataUrl ? { ...item, photoDataUrl: undefined } : item
            ),
            voice: params.snapshot.voice
              ? { ...params.snapshot.voice, audioDataUrl: null }
              : { ...DEFAULT_VOICE_KEEPSAKE },
          },
        };
        storage.setItem(STUDIO_CANVAS_RECOVERY_KEY, JSON.stringify(leanRecord));
        return true;
      } catch {
        return false;
      }
    }
  }
}

export function setCanvasRecoveryInStudioFlag(
  wasInStudio: boolean,
  storageOverride?: StorageReadWriter
): void {
  const storage = storageOverride || getBrowserLocalStorage();
  if (!storage) return;
  const existing = loadCanvasRecoverySnapshot(storage);
  if (!existing) return;
  saveCanvasRecoverySnapshot(
    {
      snapshot: existing.snapshot,
      wasInStudio,
      hasUnsavedChanges: existing.hasUnsavedChanges,
      sourceVaultCode: existing.sourceVaultCode,
      isSourceDraft: existing.isSourceDraft,
    },
    storage
  );
}
