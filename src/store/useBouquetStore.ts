import { create } from 'zustand';
import {
  FlowerType,
  CardTheme,
  RibbonStyle,
  typeWrapStyle,
  WrapStyle,
  BouquetItem,
  BouquetLayerPlane,
  getEffectiveItemPlane,
  GreetingCardData,
  VoiceKeepsakeData,
  DEFAULT_VOICE_KEEPSAKE,
  BouquetLockConfig,
  DEFAULT_BOUQUET_LOCK,
  BouquetSnapshot,
  PhotoFrameStyle,
  PHOTO_FRAME_CATALOG,
  CanvasEnvironment,
  BouquetPose,
  DEFAULT_BOUQUET_POSE,
  FLOWER_CATALOG,
  WRAPPER_CATALOG,
  RIBBON_STYLE_CATALOG,
  VOICE_KEEPSAKE_CATALOG,
  STARTER_TEMPLATES,
  INITIAL_ITEMS,
} from '../types/bouquet';
import { decodeBouquetFromHash, isGiftShareHash } from '../lib/shareAndExport';

// ============================================================================
// MODULE 4: store/useBouquetStore.ts — ZUSTAND STATE & UNDO/REDO ENGINE
// ============================================================================


export interface BouquetStoreState extends BouquetSnapshot {
  selectedId: string | null;
  environment: CanvasEnvironment;
  bouquetPose: BouquetPose;
  lastNonPlainWrapStyle: typeWrapStyle;
  hasCustomWrapColor: boolean;
  hasCustomRibbonColor: boolean;
  hasCustomCardColor: boolean;
  hasCustomVoiceColor: boolean;
  past: BouquetSnapshot[];
  future: BouquetSnapshot[];
  // Actions
  selectItem: (id: string | null) => void;
  addFlower: (type: FlowerType) => void;
  addPhotoCard: (style: PhotoFrameStyle, photoDataUrl?: string, caption?: string) => void;
  updateItem: (id: string, patch: Partial<BouquetItem>, recordHistory?: boolean) => void;
  commitHistorySnapshot: () => void;
  duplicateSelected: () => void;
  deleteSelected: () => void;
  deleteItemById: (id: string) => void;
  flipSelected: () => void;
  bringForward: () => void;
  sendBackward: () => void;
  reorderItems: (fromIndex: number, toIndex: number) => void;
  moveItemLayer: (id: string, direction: 'up' | 'down' | 'front' | 'back') => void;
  toggleItemLock: (id: string) => void;
  toggleItemHidden: (id: string) => void;
  unlockAllItems: () => void;
  showAllItems: () => void;
  toggleWrapVisibility: () => void;
  setWrapStyle: (style: typeWrapStyle) => void;
  setWrapColor: (color: string) => void;
  setRibbonColor: (color: string) => void;
  setRibbonStyle: (style: RibbonStyle) => void;
  setEnvironment: (env: CanvasEnvironment) => void;
  updateBouquetPose: (patch: Partial<BouquetPose>, recordHistory?: boolean) => void;
  resetBouquetPose: () => void;
  updateCard: (patch: Partial<GreetingCardData>) => void;
  voice: VoiceKeepsakeData;
  updateVoice: (patch: Partial<VoiceKeepsakeData>) => void;
  lock: BouquetLockConfig;
  updateLock: (patch: Partial<BouquetLockConfig>) => void;
  randomizeBouquet: () => void;
  clearBouquet: () => void;
  undo: () => void;
  redo: () => void;
  loadSnapshot: (snap: BouquetSnapshot) => void;
}

function takeSnapshot(state: BouquetStoreState): BouquetSnapshot {
  return {
    items: state.items.map((i) => ({ ...i })),
    wrapStyle: state.wrapStyle,
    wrapColor: state.wrapColor,
    ribbonColor: state.ribbonColor,
    ribbonStyle: state.ribbonStyle || 'satin',
    card: { ...state.card },
    voice: { ...(state.voice || DEFAULT_VOICE_KEEPSAKE) },
    lock: { ...(state.lock || DEFAULT_BOUQUET_LOCK) },
    environment: state.environment || 'studio',
    bouquetPose: { ...(state.bouquetPose || DEFAULT_BOUQUET_POSE) }
  };
}

function getInitialStoreState() {
  if (typeof window !== 'undefined') {
    try {
      const hash = window.location.hash;
      const shared = decodeBouquetFromHash(hash);
      if (shared && Array.isArray(shared.items) && shared.items.length > 0) {
        return {
          items: shared.items,
          wrapStyle: shared.wrapStyle || ('chalice' as WrapStyle),
          lastNonPlainWrapStyle:
            shared.wrapStyle && shared.wrapStyle !== 'plain'
              ? shared.wrapStyle
              : ('chalice' as Exclude<WrapStyle, 'plain'>),
          wrapColor: shared.wrapColor || '#EDE0F5',
          ribbonColor: shared.ribbonColor || '#C084FC',
          ribbonStyle: shared.ribbonStyle || ('satin' as RibbonStyle),
          environment: (shared.environment || 'studio') as CanvasEnvironment,
          bouquetPose: shared.bouquetPose
            ? { ...DEFAULT_BOUQUET_POSE, ...shared.bouquetPose }
            : { ...DEFAULT_BOUQUET_POSE },
          card: {
            to: shared.card?.to ?? 'My Dearest',
            from: shared.card?.from ?? 'Yours Always',
            message:
              shared.card?.message ??
              'Every petal in this bouquet holds a reason why you make my world brighter.',
            visibleOnStage: shared.card?.visibleOnStage ?? true,
            theme: shared.card?.theme ?? 'sealed',
            customBg: shared.card?.customBg,
            customAccent: shared.card?.customAccent,
            x: shared.card?.x ?? 410,
            y: shared.card?.y ?? 525,
            scale: shared.card?.scale ?? 0.72,
            rotation: shared.card?.rotation ?? 0
          },
          voice: shared.voice ? { ...DEFAULT_VOICE_KEEPSAKE, ...shared.voice } : { ...DEFAULT_VOICE_KEEPSAKE },
          lock: shared.lock ? { ...DEFAULT_BOUQUET_LOCK, ...shared.lock } : { ...DEFAULT_BOUQUET_LOCK },
          selectedId: isGiftShareHash(hash)
            ? null
            : shared.items[shared.items.length - 1]?.id || null
        };
      }
    } catch {
      // Fall back to default
    }
  }
  const isBrowser = typeof window !== 'undefined';
  return {
    items: isBrowser ? [] : INITIAL_ITEMS,
    wrapStyle: 'chalice' as WrapStyle,
    lastNonPlainWrapStyle: 'chalice' as Exclude<WrapStyle, 'plain'>,
    wrapColor: '#EDE0F5',
    ribbonColor: '#C084FC',
    ribbonStyle: 'satin' as RibbonStyle,
    environment: 'studio' as CanvasEnvironment,
    bouquetPose: { ...DEFAULT_BOUQUET_POSE },
    card: {
      to: 'My Dearest',
      from: 'Yours Always',
      message: 'Every petal in this bouquet holds a reason why you make my world brighter.',
      visibleOnStage: true,
      theme: 'sealed' as const,
      x: 410,
      y: 525,
      scale: 0.72,
      rotation: 0
    },
    voice: { ...DEFAULT_VOICE_KEEPSAKE },
    lock: { ...DEFAULT_BOUQUET_LOCK },
    selectedId: isBrowser ? null : ('f-14' as string | null)
  };
}

const INITIAL_STORE_STATE = getInitialStoreState();

export const useBouquetStore = create<BouquetStoreState>((set, get) => ({
  items: INITIAL_STORE_STATE.items,
  wrapStyle: INITIAL_STORE_STATE.wrapStyle,
  lastNonPlainWrapStyle: INITIAL_STORE_STATE.lastNonPlainWrapStyle,
  wrapColor: INITIAL_STORE_STATE.wrapColor,
  ribbonColor: INITIAL_STORE_STATE.ribbonColor,
  ribbonStyle: INITIAL_STORE_STATE.ribbonStyle,
  environment: INITIAL_STORE_STATE.environment,
  bouquetPose: INITIAL_STORE_STATE.bouquetPose,
  hasCustomWrapColor: false,
  hasCustomRibbonColor: false,
  hasCustomCardColor: Boolean(INITIAL_STORE_STATE.card?.customBg || INITIAL_STORE_STATE.card?.customAccent),
  hasCustomVoiceColor: false,
  card: INITIAL_STORE_STATE.card,
  voice: INITIAL_STORE_STATE.voice,
  lock: INITIAL_STORE_STATE.lock,
  selectedId: INITIAL_STORE_STATE.selectedId,
  past: [],
  future: [],

  selectItem: (id) => set({ selectedId: id }),

  commitHistorySnapshot: () => {
    const current = takeSnapshot(get());
    set((state) => ({
      past: [...state.past.slice(-29), current],
      future: []
    }));
  },

  addFlower: (type) => {
    const meta = FLOWER_CATALOG.find((m) => m.type === type) || FLOWER_CATALOG[0];
    const snap = takeSnapshot(get());
    const id = `flw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const spreadX = 300 + (Math.random() - 0.5) * 140;
    const spreadY = meta.isFoliage ? 255 + (Math.random() - 0.5) * 45 : 305 + (Math.random() - 0.5) * 75;
    const autoTilt = ((spreadX - 300) / 140) * 24;

    const initialPlane: BouquetLayerPlane = meta.isOther ? 'front' : 'inside';
    const newItem: BouquetItem = {
      id,
      type,
      layerPlane: initialPlane,
      clippedToBouquet: initialPlane === 'inside',
      x: Math.round(spreadX),
      y: Math.round(spreadY),
      scale: meta.defaultScale,
      rotation: Math.round(autoTilt),
      flipX: Math.random() > 0.5,
      petalColor: meta.defaultPetalColor,
      centerColor: meta.defaultCenterColor,
      stemLength: 1,
      locked: false,
      hidden: false
    };

    set((state) => ({
      past: [...state.past.slice(-29), snap],
      future: [],
      // Foliage naturally tucks behind focal flowers; blooms go on top
      items: meta.isFoliage ? [newItem, ...state.items] : [...state.items, newItem],
      selectedId: id
    }));
  },

  addPhotoCard: (style, photoDataUrl, caption) => {
    const isRaw = style === 'raw';
    const meta = PHOTO_FRAME_CATALOG.find((p) => p.id === style) || PHOTO_FRAME_CATALOG[0];
    const snap = takeSnapshot(get());
    const id = `pho-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const spreadX = 300 + (Math.random() - 0.5) * 90;
    const spreadY = 305 + (Math.random() - 0.5) * 55;
    const autoTilt = Math.round(((spreadX - 300) / 90) * 14);

    const newItem: BouquetItem = {
      id,
      type: 'rose',
      photoStyle: style,
      photoDataUrl,
      photoCaption: isRaw ? '' : caption ?? meta.defaultCaption,
      layerPlane: 'front',
      clippedToBouquet: false,
      x: Math.round(spreadX),
      y: Math.round(spreadY),
      scale: isRaw ? 1.05 : 1,
      rotation: autoTilt,
      flipX: false,
      petalColor: isRaw ? '#FFFDF9' : meta.defaultFrameColor,
      centerColor: isRaw ? '#B4846C' : meta.defaultAccentColor,
      stemLength: 1,
      locked: false,
      hidden: false
    };

    set((state) => ({
      past: [...state.past.slice(-29), snap],
      future: [],
      items: [...state.items, newItem],
      selectedId: id
    }));
  },

  updateItem: (id, patch, recordHistory = false) => {
    const target = get().items.find((i) => i.id === id);
    if (!target) return;
    if (
      target.locked &&
      patch.locked === undefined &&
      patch.hidden === undefined
    ) {
      return;
    }
    const normalizedPatch: Partial<BouquetItem> =
      patch.clippedToBouquet !== undefined && patch.layerPlane === undefined
        ? { ...patch, layerPlane: patch.clippedToBouquet ? 'inside' : 'front' }
        : patch;
    const snap = recordHistory ? takeSnapshot(get()) : null;
    set((state) => ({
      past: snap ? [...state.past.slice(-29), snap] : state.past,
      future: snap ? [] : state.future,
      items: state.items.map((item) => (item.id === id ? { ...item, ...normalizedPatch } : item))
    }));
  },

  duplicateSelected: () => {
    const { selectedId, items } = get();
    if (!selectedId) return;
    const target = items.find((i) => i.id === selectedId);
    if (!target) return;
    const snap = takeSnapshot(get());
    const copyId = `flw-${Date.now()}`;
    const clone: BouquetItem = {
      ...target,
      id: copyId,
      x: Math.min(480, target.x + 24),
      y: Math.max(150, target.y - 14),
      rotation: target.rotation + 8,
      locked: false,
      hidden: false
    };
    set((state) => ({
      past: [...state.past.slice(-29), snap],
      future: [],
      items: [...state.items, clone],
      selectedId: copyId
    }));
  },

  deleteSelected: () => {
    const { selectedId, items } = get();
    if (!selectedId) return;
    const target = items.find((i) => i.id === selectedId);
    if (!target || target.locked) return;
    const snap = takeSnapshot(get());
    const remaining = items.filter((i) => i.id !== selectedId);
    const nextVisible = [...remaining].reverse().find((i) => !i.hidden);
    set((state) => ({
      past: [...state.past.slice(-29), snap],
      future: [],
      items: remaining,
      selectedId: nextVisible ? nextVisible.id : remaining.length > 0 ? remaining[remaining.length - 1].id : null
    }));
  },

  deleteItemById: (id) => {
    const { items, selectedId } = get();
    const target = items.find((i) => i.id === id);
    if (!target || target.locked) return;
    const snap = takeSnapshot(get());
    const remaining = items.filter((i) => i.id !== id);
    const nextSelected =
      selectedId === id
        ? remaining.length > 0
          ? remaining[remaining.length - 1].id
          : null
        : selectedId;
    set((state) => ({
      past: [...state.past.slice(-29), snap],
      future: [],
      items: remaining,
      selectedId: nextSelected
    }));
  },

  flipSelected: () => {
    const { selectedId, items } = get();
    if (!selectedId) return;
    const target = items.find((i) => i.id === selectedId);
    if (!target || target.locked) return;
    const snap = takeSnapshot(get());
    set((state) => ({
      past: [...state.past.slice(-29), snap],
      future: [],
      items: state.items.map((i) =>
        i.id === selectedId ? { ...i, flipX: !i.flipX, rotation: -i.rotation } : i
      )
    }));
  },

  bringForward: () => {
    const { selectedId } = get();
    if (!selectedId) return;
    get().moveItemLayer(selectedId, 'front');
  },

  sendBackward: () => {
    const { selectedId } = get();
    if (!selectedId) return;
    get().moveItemLayer(selectedId, 'back');
  },

  reorderItems: (fromIndex, toIndex) => {
    const { items } = get();
    if (
      fromIndex < 0 ||
      fromIndex >= items.length ||
      toIndex < 0 ||
      toIndex >= items.length ||
      fromIndex === toIndex
    ) {
      return;
    }
    if (items[fromIndex]?.locked) return;
    const snap = takeSnapshot(get());
    const next = [...items];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    set((state) => ({
      past: [...state.past.slice(-29), snap],
      future: [],
      items: next
    }));
  },

  moveItemLayer: (id, direction) => {
    const { items } = get();
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1 || items[idx].locked) return;
    const currentItem = items[idx];
    const currentPlane = getEffectiveItemPlane(currentItem);
    let nextPlane: BouquetLayerPlane = currentPlane;
    let targetIdx = idx;

    if (direction === 'front') {
      // If inside or back, 'To Front' brings it to the top of its plane first, or steps it forward to overlay the bouquet wrapper ('front')
      if (currentPlane === 'back') {
        nextPlane = 'inside';
      } else if (currentPlane === 'inside') {
        nextPlane = 'front';
      }
      targetIdx = items.length - 1;
    } else if (direction === 'back') {
      // 'To Back' steps an overlay ('front') inside the bouquet wrapper ('inside'), or from 'inside' behind the back wrapper ('back')
      if (currentPlane === 'front') {
        nextPlane = 'inside';
      } else if (currentPlane === 'inside') {
        nextPlane = 'back';
      }
      targetIdx = 0;
    } else if (direction === 'up') {
      if (idx < items.length - 1) {
        targetIdx = idx + 1;
      } else if (currentPlane === 'back') {
        nextPlane = 'inside';
      } else if (currentPlane === 'inside') {
        nextPlane = 'front';
      }
    } else if (direction === 'down') {
      if (idx > 0) {
        targetIdx = idx - 1;
      } else if (currentPlane === 'front') {
        nextPlane = 'inside';
      } else if (currentPlane === 'inside') {
        nextPlane = 'back';
      }
    }

    if (targetIdx === idx && nextPlane === currentPlane) return;
    const snap = takeSnapshot(get());
    const next = [...items];
    const [moved] = next.splice(idx, 1);
    const updatedMoved: BouquetItem = {
      ...moved,
      layerPlane: nextPlane,
      clippedToBouquet: nextPlane === 'inside'
    };
    next.splice(targetIdx, 0, updatedMoved);
    set((state) => ({
      past: [...state.past.slice(-29), snap],
      future: [],
      items: next
    }));
  },

  toggleItemLock: (id) => {
    const { items } = get();
    const target = items.find((i) => i.id === id);
    if (!target) return;
    const snap = takeSnapshot(get());
    set((state) => ({
      past: [...state.past.slice(-29), snap],
      future: [],
      items: state.items.map((i) => (i.id === id ? { ...i, locked: !i.locked } : i))
    }));
  },

  toggleItemHidden: (id) => {
    const { items } = get();
    const target = items.find((i) => i.id === id);
    if (!target) return;
    const snap = takeSnapshot(get());
    const nextHidden = !target.hidden;
    set((state) => ({
      past: [...state.past.slice(-29), snap],
      future: [],
      items: state.items.map((i) => (i.id === id ? { ...i, hidden: nextHidden } : i))
    }));
  },

  unlockAllItems: () => {
    const { items } = get();
    if (!items.some((i) => i.locked)) return;
    const snap = takeSnapshot(get());
    set((state) => ({
      past: [...state.past.slice(-29), snap],
      future: [],
      items: state.items.map((i) => ({ ...i, locked: false }))
    }));
  },

  showAllItems: () => {
    const { items } = get();
    if (!items.some((i) => i.hidden)) return;
    const snap = takeSnapshot(get());
    set((state) => ({
      past: [...state.past.slice(-29), snap],
      future: [],
      items: state.items.map((i) => ({ ...i, hidden: false }))
    }));
  },

  toggleWrapVisibility: () => {
    const { wrapStyle, lastNonPlainWrapStyle } = get();
    const snap = takeSnapshot(get());
    if (wrapStyle === 'plain') {
      set((state) => ({
        past: [...state.past.slice(-29), snap],
        future: [],
        wrapStyle: lastNonPlainWrapStyle || 'chalice'
      }));
    } else {
      set((state) => ({
        past: [...state.past.slice(-29), snap],
        future: [],
        lastNonPlainWrapStyle: wrapStyle,
        wrapStyle: 'plain'
      }));
    }
  },

  setWrapStyle: (wrapStyle) => {
    const snap = takeSnapshot(get());
    const meta = WRAPPER_CATALOG.find((w) => w.id === wrapStyle);
    set((state) => ({
      past: [...state.past.slice(-29), snap],
      future: [],
      wrapStyle,
      wrapColor: state.hasCustomWrapColor ? state.wrapColor : (meta?.defaultHex ?? state.wrapColor),
      ribbonColor: state.hasCustomRibbonColor ? state.ribbonColor : (meta?.defaultRibbon ?? state.ribbonColor),
      lastNonPlainWrapStyle: wrapStyle !== 'plain' ? wrapStyle : state.lastNonPlainWrapStyle
    }));
  },

  setWrapColor: (wrapColor) => {
    const snap = takeSnapshot(get());
    set((state) => ({
      past: [...state.past.slice(-29), snap],
      future: [],
      wrapColor,
      hasCustomWrapColor: true
    }));
  },

  setRibbonColor: (ribbonColor) => {
    const snap = takeSnapshot(get());
    set((state) => ({
      past: [...state.past.slice(-29), snap],
      future: [],
      ribbonColor,
      hasCustomRibbonColor: true
    }));
  },

  setRibbonStyle: (ribbonStyle) => {
    const snap = takeSnapshot(get());
    const meta = RIBBON_STYLE_CATALOG.find((r) => r.id === ribbonStyle);
    set((state) => ({
      past: [...state.past.slice(-29), snap],
      future: [],
      ribbonStyle,
      ribbonColor: state.hasCustomRibbonColor ? state.ribbonColor : (meta?.defaultHex ?? state.ribbonColor)
    }));
  },

  setEnvironment: (environment) => {
    const snap = takeSnapshot(get());
    set((state) => ({
      past: [...state.past.slice(-29), snap],
      future: [],
      environment
    }));
  },

  updateBouquetPose: (patch, recordHistory = false) => {
    const snap = recordHistory ? takeSnapshot(get()) : null;
    set((state) => ({
      past: snap ? [...state.past.slice(-29), snap] : state.past,
      future: snap ? [] : state.future,
      bouquetPose: {
        ...(state.bouquetPose || DEFAULT_BOUQUET_POSE),
        ...patch
      }
    }));
  },

  resetBouquetPose: () => {
    const snap = takeSnapshot(get());
    set((state) => ({
      past: [...state.past.slice(-29), snap],
      future: [],
      bouquetPose: { ...DEFAULT_BOUQUET_POSE }
    }));
  },

  updateCard: (patch) => {
    set((state) => {
      const nextCard = { ...state.card, ...patch };
      const touchedCustomColor = 'customBg' in patch || 'customAccent' in patch;
      const nextHasCustomCardColor = touchedCustomColor
        ? Boolean(nextCard.customBg || nextCard.customAccent)
        : state.hasCustomCardColor;
      if (patch.theme !== undefined && !nextHasCustomCardColor) {
        nextCard.customBg = undefined;
        nextCard.customAccent = undefined;
      }
      return {
        card: nextCard,
        hasCustomCardColor: nextHasCustomCardColor
      };
    });
  },

  updateVoice: (patch) => {
    set((state) => {
      const currentVoice = state.voice || DEFAULT_VOICE_KEEPSAKE;
      const nextVoice = { ...currentVoice, ...patch };
      const isStyleSwitch = patch.style !== undefined && patch.style !== currentVoice.style;
      const touchedCustomColor = !isStyleSwitch && ('primaryColor' in patch || 'accentColor' in patch);
      const nextHasCustomVoiceColor = touchedCustomColor ? true : state.hasCustomVoiceColor;
      if (patch.style !== undefined && !nextHasCustomVoiceColor) {
        const meta = VOICE_KEEPSAKE_CATALOG.find((v) => v.id === patch.style);
        if (meta) {
          nextVoice.primaryColor = meta.defaultPrimary;
          nextVoice.accentColor = meta.defaultAccent;
        }
      }
      return {
        voice: nextVoice,
        hasCustomVoiceColor: nextHasCustomVoiceColor
      };
    });
  },

  updateLock: (patch) => {
    set((state) => ({
      lock: { ...(state.lock || DEFAULT_BOUQUET_LOCK), ...patch }
    }));
  },

  randomizeBouquet: () => {
    const snap = takeSnapshot(get());
    const palettes = [
      {
        wrapStyle: 'kraft' as typeWrapStyle,
        wrapColor: '#d6b38e',
        ribbon: '#e11d48',
        petals: ['#f43f5e', '#fb7185', '#fbcfe8', '#fdf2f8', '#ffffff']
      },
      {
        wrapStyle: 'tissue' as typeWrapStyle,
        wrapColor: '#fce7f3',
        ribbon: '#9333ea',
        petals: ['#c084fc', '#c4b5fd', '#fbcfe8', '#ffffff', '#f472b6']
      },
      {
        wrapStyle: 'celestial' as typeWrapStyle,
        wrapColor: '#e0e7ff',
        ribbon: '#d97706',
        petals: ['#facc15', '#fde047', '#fb923c', '#ffffff', '#93c5fd']
      }
    ];

    const theme = palettes[Math.floor(Math.random() * palettes.length)];
    const generated: BouquetItem[] = [];

    // 1. Back Foliage Crown (5 stems)
    const foliageTypes: FlowerType[] = ['fern', 'eucalyptus', 'lavender'];
    for (let i = 0; i < 5; i++) {
      const fType = foliageTypes[i % foliageTypes.length];
      const meta = FLOWER_CATALOG.find((m) => m.type === fType)!;
      const offset = (i - 2) * 52;
      generated.push({
        id: `rnd-fol-${Date.now()}-${i}`,
        type: fType,
        x: 300 + offset,
        y: 235 + Math.abs(i - 2) * 18,
        scale: meta.defaultScale,
        rotation: (i - 2) * 16,
        flipX: i > 2,
        petalColor: meta.defaultPetalColor,
        centerColor: meta.defaultCenterColor
      });
    }

    // 2. Baby's Breath & Hydrangea Cloud (3 stems)
    generated.push({
      id: `rnd-hyd-${Date.now()}`,
      type: 'hydrangea',
      x: 300,
      y: 265,
      scale: 1.22,
      rotation: 0,
      flipX: false,
      petalColor: theme.petals[2],
      centerColor: '#ffffff'
    });
    generated.push({
      id: `rnd-bb1-${Date.now()}`,
      type: 'babysBreath',
      x: 215,
      y: 285,
      scale: 1.05,
      rotation: -24,
      flipX: false,
      petalColor: '#ffffff',
      centerColor: '#fef08a'
    });
    generated.push({
      id: `rnd-bb2-${Date.now()}`,
      type: 'babysBreath',
      x: 385,
      y: 285,
      scale: 1.05,
      rotation: 24,
      flipX: true,
      petalColor: '#ffffff',
      centerColor: '#fef08a'
    });

    // 3. Focal Blooms (7 arranged stems)
    const focalTypes: FlowerType[] = ['rose', 'peony', 'tulip', 'lily', 'sunflower', 'daisy'];
    const positions = [
      { x: 235, y: 305, rot: -22 },
      { x: 365, y: 305, rot: 22 },
      { x: 265, y: 320, rot: -12 },
      { x: 335, y: 320, rot: 12 },
      { x: 215, y: 350, rot: -28 },
      { x: 385, y: 350, rot: 28 },
      { x: 300, y: 348, rot: 0 }
    ];

    positions.forEach((pos, idx) => {
      const fType = focalTypes[Math.floor(Math.random() * focalTypes.length)];
      const meta = FLOWER_CATALOG.find((m) => m.type === fType)!;
      const chosenPetal =
        fType === 'sunflower'
          ? '#facc15'
          : theme.petals[Math.floor(Math.random() * theme.petals.length)];
      generated.push({
        id: `rnd-flw-${Date.now()}-${idx}`,
        type: fType,
        x: pos.x,
        y: pos.y,
        scale: meta.defaultScale,
        rotation: pos.rot,
        flipX: idx % 2 === 1,
        petalColor: chosenPetal,
        centerColor: meta.defaultCenterColor
      });
    });

    set((state) => ({
      past: [...state.past.slice(-29), snap],
      future: [],
      items: generated,
      wrapStyle: theme.wrapStyle,
      wrapColor: theme.wrapColor,
      ribbonColor: theme.ribbon,
      hasCustomWrapColor: false,
      hasCustomRibbonColor: false,
      selectedId: generated[generated.length - 1].id
    }));
  },

  clearBouquet: () => {
    const snap = takeSnapshot(get());
    set((state) => ({
      past: [...state.past.slice(-29), snap],
      future: [],
      items: [],
      wrapStyle: 'chalice',
      wrapColor: '#EDE0F5',
      ribbonStyle: 'satin',
      ribbonColor: '#C084FC',
      environment: 'studio',
      bouquetPose: { ...DEFAULT_BOUQUET_POSE },
      hasCustomWrapColor: false,
      hasCustomRibbonColor: false,
      hasCustomCardColor: false,
      hasCustomVoiceColor: false,
      card: {
        ...state.card,
        theme: 'sealed',
        customBg: undefined,
        customAccent: undefined,
        visibleOnStage: true
      },
      voice: { ...DEFAULT_VOICE_KEEPSAKE },
      lock: { ...DEFAULT_BOUQUET_LOCK },
      selectedId: null
    }));
  },

  undo: () => {
    const { past, future } = get();
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const current = takeSnapshot(get());
    set({
      ...previous,
      environment: previous.environment || 'studio',
      bouquetPose: previous.bouquetPose ? { ...previous.bouquetPose } : { ...DEFAULT_BOUQUET_POSE },
      voice: previous.voice ? { ...previous.voice } : { ...DEFAULT_VOICE_KEEPSAKE },
      lock: previous.lock ? { ...previous.lock } : { ...DEFAULT_BOUQUET_LOCK },
      past: past.slice(0, -1),
      future: [current, ...future],
      selectedId: null
    });
  },

  redo: () => {
    const { past, future } = get();
    if (future.length === 0) return;
    const next = future[0];
    const current = takeSnapshot(get());
    set({
      ...next,
      environment: next.environment || 'studio',
      bouquetPose: next.bouquetPose ? { ...next.bouquetPose } : { ...DEFAULT_BOUQUET_POSE },
      voice: next.voice ? { ...next.voice } : { ...DEFAULT_VOICE_KEEPSAKE },
      lock: next.lock ? { ...next.lock } : { ...DEFAULT_BOUQUET_LOCK },
      past: [...past, current],
      future: future.slice(1),
      selectedId: null
    });
  },

  loadSnapshot: (snap) => {
    set({
      ...snap,
      environment: snap.environment || 'studio',
      bouquetPose: snap.bouquetPose
        ? { ...DEFAULT_BOUQUET_POSE, ...snap.bouquetPose }
        : { ...DEFAULT_BOUQUET_POSE },
      card: {
        ...snap.card,
        theme: snap.card?.theme || 'sealed'
      },
      hasCustomWrapColor: false,
      hasCustomRibbonColor: false,
      hasCustomCardColor: Boolean(snap.card?.customBg || snap.card?.customAccent),
      hasCustomVoiceColor: false,
      voice: snap.voice ? { ...DEFAULT_VOICE_KEEPSAKE, ...snap.voice } : { ...DEFAULT_VOICE_KEEPSAKE },
      lock: snap.lock ? { ...DEFAULT_BOUQUET_LOCK, ...snap.lock } : { ...DEFAULT_BOUQUET_LOCK },
      selectedId: snap.items[0]?.id ?? null,
      past: [],
      future: []
    });
  }
}));

