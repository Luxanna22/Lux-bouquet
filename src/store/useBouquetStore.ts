import { create } from 'zustand';
import {
  FlowerType,
  CardTheme,
  RibbonStyle,
  typeWrapStyle,
  WrapStyle,
  BouquetItem,
  GreetingCardData,
  VoiceKeepsakeData,
  DEFAULT_VOICE_KEEPSAKE,
  BouquetSnapshot,
  FLOWER_CATALOG,
  WRAPPER_CATALOG,
  STARTER_TEMPLATES,
  INITIAL_ITEMS,
} from '../types/bouquet';
import { decodeBouquetFromHash, isGiftShareHash } from '../lib/shareAndExport';

// ============================================================================
// MODULE 4: store/useBouquetStore.ts — ZUSTAND STATE & UNDO/REDO ENGINE
// ============================================================================


export interface BouquetStoreState extends BouquetSnapshot {
  selectedId: string | null;
  lastNonPlainWrapStyle: typeWrapStyle;
  past: BouquetSnapshot[];
  future: BouquetSnapshot[];
  // Actions
  selectItem: (id: string | null) => void;
  addFlower: (type: FlowerType) => void;
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
  updateCard: (patch: Partial<GreetingCardData>) => void;
  voice: VoiceKeepsakeData;
  updateVoice: (patch: Partial<VoiceKeepsakeData>) => void;
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
    voice: { ...(state.voice || DEFAULT_VOICE_KEEPSAKE) }
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
          wrapStyle: shared.wrapStyle || ('kraft' as WrapStyle),
          lastNonPlainWrapStyle:
            shared.wrapStyle && shared.wrapStyle !== 'plain'
              ? shared.wrapStyle
              : ('kraft' as Exclude<WrapStyle, 'plain'>),
          wrapColor: shared.wrapColor || '#d6b38e',
          ribbonColor: shared.ribbonColor || '#e11d48',
          ribbonStyle: shared.ribbonStyle || ('satin' as RibbonStyle),
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
            y: shared.card?.y ?? 525
          },
          voice: shared.voice ? { ...DEFAULT_VOICE_KEEPSAKE, ...shared.voice } : { ...DEFAULT_VOICE_KEEPSAKE },
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
    wrapStyle: 'kraft' as WrapStyle,
    lastNonPlainWrapStyle: 'kraft' as Exclude<WrapStyle, 'plain'>,
    wrapColor: '#d6b38e',
    ribbonColor: '#e11d48',
    ribbonStyle: 'satin' as RibbonStyle,
    card: {
      to: 'My Dearest',
      from: 'Yours Always',
      message: 'Every petal in this bouquet holds a reason why you make my world brighter.',
      visibleOnStage: true,
      theme: 'sealed' as const,
      x: 410,
      y: 525
    },
    voice: { ...DEFAULT_VOICE_KEEPSAKE },
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
  card: INITIAL_STORE_STATE.card,
  voice: INITIAL_STORE_STATE.voice,
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

    const newItem: BouquetItem = {
      id,
      type,
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
    const snap = recordHistory ? takeSnapshot(get()) : null;
    set((state) => ({
      past: snap ? [...state.past.slice(-29), snap] : state.past,
      future: snap ? [] : state.future,
      items: state.items.map((item) => (item.id === id ? { ...item, ...patch } : item))
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
    const { selectedId, items } = get();
    if (!selectedId) return;
    const idx = items.findIndex((i) => i.id === selectedId);
    if (idx === -1 || idx === items.length - 1) return;
    if (items[idx].locked) return;
    const snap = takeSnapshot(get());
    const next = [...items];
    const [picked] = next.splice(idx, 1);
    next.push(picked);
    set((state) => ({
      past: [...state.past.slice(-29), snap],
      future: [],
      items: next
    }));
  },

  sendBackward: () => {
    const { selectedId, items } = get();
    if (!selectedId) return;
    const idx = items.findIndex((i) => i.id === selectedId);
    if (idx <= 0) return;
    if (items[idx].locked) return;
    const snap = takeSnapshot(get());
    const next = [...items];
    const [picked] = next.splice(idx, 1);
    next.unshift(picked);
    set((state) => ({
      past: [...state.past.slice(-29), snap],
      future: [],
      items: next
    }));
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
    let targetIdx = idx;
    if (direction === 'up') targetIdx = Math.min(items.length - 1, idx + 1);
    else if (direction === 'down') targetIdx = Math.max(0, idx - 1);
    else if (direction === 'front') targetIdx = items.length - 1;
    else if (direction === 'back') targetIdx = 0;
    if (targetIdx === idx) return;
    const snap = takeSnapshot(get());
    const next = [...items];
    const [moved] = next.splice(idx, 1);
    next.splice(targetIdx, 0, moved);
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
        wrapStyle: lastNonPlainWrapStyle || 'kraft'
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
    set((state) => ({
      past: [...state.past.slice(-29), snap],
      future: [],
      wrapStyle,
      lastNonPlainWrapStyle: wrapStyle !== 'plain' ? wrapStyle : state.lastNonPlainWrapStyle
    }));
  },

  setWrapColor: (wrapColor) => {
    const snap = takeSnapshot(get());
    set((state) => ({
      past: [...state.past.slice(-29), snap],
      future: [],
      wrapColor
    }));
  },

  setRibbonColor: (ribbonColor) => {
    const snap = takeSnapshot(get());
    set((state) => ({
      past: [...state.past.slice(-29), snap],
      future: [],
      ribbonColor
    }));
  },

  setRibbonStyle: (ribbonStyle) => {
    const snap = takeSnapshot(get());
    set((state) => ({
      past: [...state.past.slice(-29), snap],
      future: [],
      ribbonStyle
    }));
  },

  updateCard: (patch) => {
    set((state) => ({
      card: { ...state.card, ...patch }
    }));
  },

  updateVoice: (patch) => {
    set((state) => ({
      voice: { ...(state.voice || DEFAULT_VOICE_KEEPSAKE), ...patch }
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
      selectedId: generated[generated.length - 1].id
    }));
  },

  clearBouquet: () => {
    const snap = takeSnapshot(get());
    set((state) => ({
      past: [...state.past.slice(-29), snap],
      future: [],
      items: [],
      voice: { ...DEFAULT_VOICE_KEEPSAKE },
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
      voice: previous.voice ? { ...previous.voice } : { ...DEFAULT_VOICE_KEEPSAKE },
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
      voice: next.voice ? { ...next.voice } : { ...DEFAULT_VOICE_KEEPSAKE },
      past: [...past, current],
      future: future.slice(1),
      selectedId: null
    });
  },

  loadSnapshot: (snap) => {
    set({
      ...snap,
      voice: snap.voice ? { ...DEFAULT_VOICE_KEEPSAKE, ...snap.voice } : { ...DEFAULT_VOICE_KEEPSAKE },
      selectedId: snap.items[0]?.id ?? null,
      past: [],
      future: []
    });
  }
}));

