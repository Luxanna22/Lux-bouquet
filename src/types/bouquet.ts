// ============================================================================
// MODULE 1: types/bouquet.ts — CORE DATA STRUCTURES & DEFAULTS
// ============================================================================

export type FlowerType =
  | 'rose'
  | 'tulip'
  | 'sunflower'
  | 'daisy'
  | 'lily'
  | 'peony'
  | 'orchid'
  | 'carnation'
  | 'ranunculus'
  | 'anemone'
  | 'dahlia'
  | 'iris'
  | 'camellia'
  | 'lotus'
  | 'callalily'
  | 'poppy'
  | 'sweetpea'
  | 'freesia'
  | 'lavender'
  | 'hydrangea'
  | 'babysBreath'
  | 'eucalyptus'
  | 'fern'
  | 'cherryBlossom'
  | 'waxflower'
  | 'billyButtons'
  | 'oliveBranch'
  | 'monstera'
  | 'pampas'
  | 'queenanneslace'
  | 'astilbe';

export type CardTheme =
  | 'sealed'
  | 'cream'
  | 'blush'
  | 'lavender'
  | 'sage'
  | 'sky'
  | 'midnight'
  | 'terracotta';

export interface CardThemePalette {
  id: CardTheme;
  label: string;
  shapeName: string;
  bg: string;
  border: string;
  inner: string;
  seal: string;
  title: string;
  body: string;
  sign: string;
  rule: string;
}

export const CARD_THEME_CATALOG: CardThemePalette[] = [
  {
    id: 'sealed',
    label: 'Sealed Letter',
    shapeName: 'Unopened Wax-Sealed Envelope',
    bg: '#FFFDF7',
    border: '#D6B38E',
    inner: '#B4846C',
    seal: '#E11D48',
    title: '#1C1917',
    body: '#292524',
    sign: '#78716C',
    rule: 'rgba(180, 132, 108, 0.18)'
  },
  {
    id: 'cream',
    label: 'Stitched Tag',
    shapeName: 'Classic Stitched Tag',
    bg: '#FEF3C7',
    border: '#D97706',
    inner: '#B4846C',
    seal: '#B4846C',
    title: '#1C1917',
    body: '#292524',
    sign: '#78716C',
    rule: 'rgba(180, 132, 108, 0.18)'
  },
  {
    id: 'blush',
    label: 'Scallop Lace',
    shapeName: 'Scalloped Lace Card',
    bg: '#FCE7F3',
    border: '#F472B6',
    inner: '#E11D48',
    seal: '#E11D48',
    title: '#831843',
    body: '#9D174D',
    sign: '#BE185D',
    rule: 'rgba(225, 29, 72, 0.14)'
  },
  {
    id: 'lavender',
    label: 'Cathedral Arch',
    shapeName: 'Arched Bell Note',
    bg: '#EDE9FE',
    border: '#A78BFA',
    inner: '#7C3AED',
    seal: '#7C3AED',
    title: '#3B0764',
    body: '#4C1D95',
    sign: '#6D28D9',
    rule: 'rgba(124, 58, 237, 0.14)'
  },
  {
    id: 'sage',
    label: 'Botanical Frame',
    shapeName: 'Chamfered Leaf Plaque',
    bg: '#ECFDF5',
    border: '#6EE7B7',
    inner: '#059669',
    seal: '#047857',
    title: '#064E3B',
    body: '#065F46',
    sign: '#047857',
    rule: 'rgba(5, 150, 105, 0.14)'
  },
  {
    id: 'sky',
    label: 'Folded Scroll',
    shapeName: 'Parchment Scroll Note',
    bg: '#F0F9FF',
    border: '#7DD3FC',
    inner: '#0284C7',
    seal: '#0369A1',
    title: '#0C4A6E',
    body: '#075985',
    sign: '#0369A1',
    rule: 'rgba(2, 132, 199, 0.14)'
  },
  {
    id: 'terracotta',
    label: 'Dovetail Banner',
    shapeName: 'Notched Pennant Tag',
    bg: '#FFF7ED',
    border: '#FDBA74',
    inner: '#C2410C',
    seal: '#EA580C',
    title: '#7C2D12',
    body: '#9A3412',
    sign: '#C2410C',
    rule: 'rgba(194, 65, 12, 0.14)'
  },
  {
    id: 'midnight',
    label: 'Starlit Plaque',
    shapeName: 'Celestial Filigree Card',
    bg: '#1E293B',
    border: '#F59E0B',
    inner: '#FBBF24',
    seal: '#D97706',
    title: '#FEF3C7',
    body: '#F1F5F9',
    sign: '#FCD34D',
    rule: 'rgba(251, 191, 36, 0.18)'
  }
];

export const CARD_COLOR_SWATCHES: string[] = [
  '#FEF3C7',
  '#FCE7F3',
  '#EDE9FE',
  '#ECFDF5',
  '#F0F9FF',
  '#FFF7ED',
  '#FFFFFF',
  '#FFE4E6',
  '#F3E8FF',
  '#FEF9C3',
  '#E0E7FF',
  '#F5F5F4',
  '#1E293B',
  '#292524'
];

function adjustHexBrightness(hex: string, delta: number): string {
  const clean = hex.replace('#', '').trim();
  if (clean.length !== 6) return hex;
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) return hex;
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(((num >> 16) & 0xff) + delta);
  const g = clamp(((num >> 8) & 0xff) + delta);
  const b = clamp((num & 0xff) + delta);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function getCardThemePalette(
  theme: CardTheme,
  customBg?: string,
  customAccent?: string
): CardThemePalette {
  const base = CARD_THEME_CATALOG.find((t) => t.id === theme) || CARD_THEME_CATALOG[0];
  let result: CardThemePalette = base;

  if (customBg && /^#[0-9A-Fa-f]{6}$/.test(customBg.trim())) {
    const clean = customBg.trim();
    const r = parseInt(clean.slice(1, 3), 16);
    const g = parseInt(clean.slice(3, 5), 16);
    const b = parseInt(clean.slice(5, 7), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    if (lum < 0.42) {
      result = {
        ...base,
        bg: clean,
        border: adjustHexBrightness(clean, 65),
        inner: '#FBBF24',
        seal: '#D97706',
        title: '#FEF3C7',
        body: '#F8FAFC',
        sign: '#FDE68A',
        rule: 'rgba(251, 191, 36, 0.2)'
      };
    } else {
      result = {
        ...base,
        bg: clean,
        border: adjustHexBrightness(clean, -42),
        inner: adjustHexBrightness(clean, -78),
        seal: adjustHexBrightness(clean, -68),
        title: '#1C1917',
        body: '#292524',
        sign: '#57534E',
        rule: 'rgba(120, 113, 108, 0.16)'
      };
    }
  }

  if (customAccent && /^#[0-9A-Fa-f]{6}$/.test(customAccent.trim())) {
    const cleanAccent = customAccent.trim();
    result = {
      ...result,
      border: cleanAccent,
      inner: cleanAccent,
      seal: cleanAccent
    };
  }

  return result;
}

export type RibbonStyle =
  | 'satin'
  | 'lace'
  | 'corset'
  | 'double'
  | 'waxCord'
  | 'organza'
  | 'velvet'
  | 'chiffon'
  | 'goldchain'
  | 'raffia';

export const RIBBON_STYLE_CATALOG: {
  id: RibbonStyle;
  label: string;
  subtitle: string;
  defaultHex: string;
}[] = [
  { id: 'satin', label: 'Satin Bow', subtitle: 'Classic tailored loops', defaultHex: '#E11D48' },
  { id: 'lace', label: 'Eyelet Lace', subtitle: 'Scalloped bridal lace & pearl', defaultHex: '#F472B6' },
  { id: 'corset', label: 'Corset Tie', subtitle: 'Criss-cross ribbon waist', defaultHex: '#BE185D' },
  { id: 'double', label: 'Couture Rosette', subtitle: 'Multi-loop Parisian bow', defaultHex: '#EC4899' },
  { id: 'waxCord', label: 'Twine & Seal', subtitle: 'Artisan cord & wax emblem', defaultHex: '#B4846C' },
  { id: 'organza', label: 'Sheer Chiffon', subtitle: 'Billowy translucent veil', defaultHex: '#F9A8D4' },
  { id: 'velvet', label: 'Cameo Velvet', subtitle: 'Draped sash & pearl clasp', defaultHex: '#9F1239' },
  { id: 'chiffon', label: 'Chiffon Fringe', subtitle: 'Frayed raw-edge silk drape', defaultHex: '#D48C70' },
  { id: 'goldchain', label: 'Gold Chain', subtitle: 'Golden links & heart charm', defaultHex: '#D97706' },
  { id: 'raffia', label: 'Botanical Raffia', subtitle: 'Woven palm knot & dried sprig', defaultHex: '#C69C6D' }
];

export type typeWrapStyle =
  | 'kraft'
  | 'tissue'
  | 'chalice'
  | 'basket'
  | 'vintage'
  | 'lace'
  | 'celestial'
  | 'vase'
  | 'plain'
  | 'hatbox'
  | 'cloche'
  | 'koreanmesh';
export type WrapStyle = typeWrapStyle;

export const WRAPPER_CATALOG: {
  id: typeWrapStyle;
  label: string;
  defaultHex: string;
  defaultRibbon: string;
}[] = [
  { id: 'kraft', label: 'Origami Kraft', defaultHex: '#C8B9AE', defaultRibbon: '#F5F5F4' },
  { id: 'tissue', label: 'Butterfly Petal', defaultHex: '#FFD1DC', defaultRibbon: '#E11D48' },
  { id: 'chalice', label: 'Tulip Organza', defaultHex: '#EDE0F5', defaultRibbon: '#C084FC' },
  { id: 'basket', label: 'Wicker Basket', defaultHex: '#C69C6D', defaultRibbon: '#D97706' },
  { id: 'vintage', label: 'Parisian Script', defaultHex: '#EFE6D5', defaultRibbon: '#B4846C' },
  { id: 'lace', label: 'Eyelet Lace', defaultHex: '#FFF5F7', defaultRibbon: '#F472B6' },
  { id: 'celestial', label: 'Starlit Noir', defaultHex: '#1E293B', defaultRibbon: '#F59E0B' },
  { id: 'vase', label: 'Ceramic Vase', defaultHex: '#E7DCD1', defaultRibbon: '#B4846C' },
  { id: 'hatbox', label: 'Velvet Hatbox', defaultHex: '#9F1239', defaultRibbon: '#F59E0B' },
  { id: 'cloche', label: 'Glass Cloche', defaultHex: '#D6B38E', defaultRibbon: '#E11D48' },
  { id: 'koreanmesh', label: 'Korean Mesh', defaultHex: '#F3E8FF', defaultRibbon: '#EC4899' },
  { id: 'plain', label: 'Hand-Tied', defaultHex: '#D6B38E', defaultRibbon: '#E11D48' }
];

export type PhotoFrameStyle =
  | 'raw'
  | 'polaroid'
  | 'stamp'
  | 'cameo'
  | 'film'
  | 'pressed'
  | 'arch';

export interface PhotoFrameMeta {
  id: PhotoFrameStyle;
  label: string;
  shortLabel: string;
  subtitle: string;
  defaultFrameColor: string;
  defaultAccentColor: string;
  defaultCaption: string;
}

export const PHOTO_FRAME_CATALOG: PhotoFrameMeta[] = [
  {
    id: 'polaroid',
    label: 'Instant Polaroid',
    shortLabel: 'Polaroid',
    subtitle: 'Classic instant film & tape',
    defaultFrameColor: '#FFFDF9',
    defaultAccentColor: '#D6B38E',
    defaultCaption: 'Forever moment'
  },
  {
    id: 'stamp',
    label: 'Postage Stamp',
    shortLabel: 'Postage',
    subtitle: 'Perforated airmail keepsake',
    defaultFrameColor: '#FAF3EB',
    defaultAccentColor: '#B4846C',
    defaultCaption: 'PAR AVION'
  },
  {
    id: 'cameo',
    label: 'Lace Cameo',
    shortLabel: 'Cameo',
    subtitle: 'Scalloped oval & ribbon bow',
    defaultFrameColor: '#FCE7F3',
    defaultAccentColor: '#E11D48',
    defaultCaption: 'My dearest'
  },
  {
    id: 'film',
    label: 'Vintage Film',
    shortLabel: '35mm Film',
    subtitle: 'Cinema sprocket strip',
    defaultFrameColor: '#292524',
    defaultAccentColor: '#F59E0B',
    defaultCaption: 'BLOOM 400'
  },
  {
    id: 'pressed',
    label: 'Botanical Glass',
    shortLabel: 'Herbarium',
    subtitle: 'Brass octagon & pressed leaf',
    defaultFrameColor: '#FEF9EE',
    defaultAccentColor: '#D97706',
    defaultCaption: 'Spec. No. 1'
  },
  {
    id: 'arch',
    label: 'Cathedral Arch',
    shortLabel: 'Arch Frame',
    subtitle: 'Gilded gallery arch',
    defaultFrameColor: '#F5F0EB',
    defaultAccentColor: '#8C624C',
    defaultCaption: 'Souvenir'
  }
];

export type CanvasEnvironment =
  | 'studio'
  | 'paper'
  | 'meadow'
  | 'sunlit'
  | 'linen'
  | 'starlit';

export interface CanvasEnvironmentMeta {
  id: CanvasEnvironment;
  label: string;
  shortLabel: string;
  subtitle: string;
}

export const ENVIRONMENT_CATALOG: CanvasEnvironmentMeta[] = [
  {
    id: 'studio',
    label: 'Warm Studio',
    shortLabel: 'Studio',
    subtitle: 'Clean editorial arch'
  },
  {
    id: 'paper',
    label: 'Pressed Paper',
    shortLabel: 'Paper',
    subtitle: 'Handmade cotton deckle grain'
  },
  {
    id: 'meadow',
    label: 'Soft Meadow',
    shortLabel: 'Meadow',
    subtitle: 'Minimal grass & wildflower mist'
  },
  {
    id: 'sunlit',
    label: 'Sunlit Window',
    shortLabel: 'Sunlit',
    subtitle: 'Golden-hour window shadow'
  },
  {
    id: 'linen',
    label: 'Woven Linen',
    shortLabel: 'Linen',
    subtitle: 'Fine raw flax canvas weave'
  },
  {
    id: 'starlit',
    label: 'Evening Glow',
    shortLabel: 'Evening',
    subtitle: 'Soft twilight & stardust motes'
  }
];

export interface BouquetPose {
  x: number; // SVG viewBox center X (default 300)
  y: number; // SVG viewBox center Y (default 380)
  scale: number; // 0.45 .. 2.2 (default 1)
  rotation: number; // degrees -90 .. 90 (default 0)
}

export const DEFAULT_BOUQUET_POSE: BouquetPose = {
  x: 300,
  y: 380,
  scale: 1,
  rotation: 0
};

export interface BouquetItem {
  id: string;
  type: FlowerType;
  x: number; // SVG viewBox X (0..600)
  y: number; // SVG viewBox Y (0..680)
  scale: number; // 0.3 .. 2.8
  rotation: number; // degrees -180..180
  flipX: boolean;
  petalColor: string;
  centerColor: string;
  stemLength?: number; // 0.15 .. 1.35 (1.0 default)
  locked?: boolean;
  hidden?: boolean;
  photoStyle?: PhotoFrameStyle;
  photoDataUrl?: string;
  photoCaption?: string;
  clippedToBouquet?: boolean;
}

export interface GreetingCardData {
  to: string;
  from: string;
  message: string;
  visibleOnStage: boolean;
  theme: CardTheme;
  customBg?: string;
  customAccent?: string;
  x?: number;
  y?: number;
  scale?: number;
  rotation?: number;
  locked?: boolean;
}

export type VoiceKeepsakeStyle =
  | 'mixtape'
  | 'vinyl'
  | 'plushie'
  | 'musicbox'
  | 'locket';

export interface VoiceKeepsakeMeta {
  id: VoiceKeepsakeStyle;
  label: string;
  shortLabel: string;
  subtitle: string;
  defaultPrimary: string;
  defaultAccent: string;
  defaultTitle: string;
}

export const VOICE_KEEPSAKE_CATALOG: VoiceKeepsakeMeta[] = [
  {
    id: 'mixtape',
    label: 'Love Mixtape',
    shortLabel: 'Mixtape',
    subtitle: 'Retro cassette tape',
    defaultPrimary: '#F472B6',
    defaultAccent: '#FFF1F2',
    defaultTitle: 'Side A ♥'
  },
  {
    id: 'vinyl',
    label: 'Vintage Vinyl',
    shortLabel: 'Vinyl',
    subtitle: 'Antique horn gramophone',
    defaultPrimary: '#8B5A2B',
    defaultAccent: '#D4AF37',
    defaultTitle: 'Our Song'
  },
  {
    id: 'plushie',
    label: 'Voice Plushie',
    shortLabel: 'Plushie',
    subtitle: 'Teddy holding heart',
    defaultPrimary: '#D6A87C',
    defaultAccent: '#F43F5E',
    defaultTitle: 'Press Me ♥'
  },
  {
    id: 'musicbox',
    label: 'Music Box',
    shortLabel: 'Music Box',
    subtitle: 'Ballerina floral keepsake',
    defaultPrimary: '#93C5FD',
    defaultAccent: '#FDE68A',
    defaultTitle: 'Lullaby'
  },
  {
    id: 'locket',
    label: 'Heart Locket',
    shortLabel: 'Locket',
    subtitle: 'Golden voice pendant',
    defaultPrimary: '#F59E0B',
    defaultAccent: '#FFE4E6',
    defaultTitle: 'Always'
  }
];

export interface VoiceKeepsakeData {
  visibleOnStage: boolean;
  style: VoiceKeepsakeStyle;
  title: string;
  primaryColor: string;
  accentColor: string;
  audioDataUrl?: string | null;
  durationSec: number;
  duration?: number;
  x?: number;
  y?: number;
  scale?: number;
  rotation?: number;
}

export const DEFAULT_VOICE_KEEPSAKE: VoiceKeepsakeData = {
  visibleOnStage: false,
  style: 'mixtape',
  title: 'Side A ♥',
  primaryColor: '#F472B6',
  accentColor: '#FFF1F2',
  audioDataUrl: undefined,
  durationSec: 0,
  duration: 0,
  x: 185,
  y: 525,
  scale: 1.0,
  rotation: 0
};

export type BouquetLockMode = 'none' | 'countdown' | 'passcode';

export interface BouquetLockConfig {
  mode: BouquetLockMode;
  unlockAtIso?: string;
  questionPrompt?: string;
  passcodeAnswer?: string;
}

export const DEFAULT_BOUQUET_LOCK: BouquetLockConfig = {
  mode: 'none',
  unlockAtIso: '',
  questionPrompt: 'The special date we first met',
  passcodeAnswer: ''
};

export interface RecipientReactionOption {
  id: string;
  label: string;
  symbol: string;
}

export const RECIPIENT_REACTIONS: RecipientReactionOption[] = [
  { id: 'loved', label: 'Loved every petal', symbol: '♥' },
  { id: 'touched', label: 'Touched my heart', symbol: '✦' },
  { id: 'made_my_day', label: 'Made my whole day', symbol: '☀' },
  { id: 'sweet', label: 'So deeply sweet', symbol: '✿' }
];

export interface SavedVaultBouquet {
  code: string;
  to: string;
  from: string;
  createdAt: string;
  shareUrl: string;
  lockMode?: BouquetLockMode;
  hasVoice?: boolean;
  recipientName?: string;
  senderName?: string;
  flowerCount?: number;
  isPremium?: boolean;
  retentionDays?: number;
  isDraft?: boolean;
  draftPayload?: string;
}

export interface BouquetSnapshot {
  items: BouquetItem[];
  wrapStyle: typeWrapStyle;
  wrapColor: string;
  ribbonColor: string;
  ribbonStyle?: RibbonStyle;
  card: GreetingCardData;
  voice?: VoiceKeepsakeData;
  lock?: BouquetLockConfig;
  environment?: CanvasEnvironment;
  bouquetPose?: BouquetPose;
}

export interface FlowerCatalogMeta {
  type: FlowerType;
  name: string;
  shortName: string;
  subtitle: string;
  defaultPetalColor: string;
  defaultCenterColor: string;
  defaultScale: number;
  isFoliage?: boolean;
  isFiller?: boolean;
}

export const FLOWER_CATALOG: FlowerCatalogMeta[] = [
  // --- 15 FOCAL FLOWERS ---
  {
    type: 'rose',
    name: 'Garden Rose',
    shortName: 'Rose',
    subtitle: 'Velvet classic bloom',
    defaultPetalColor: '#f43f5e',
    defaultCenterColor: '#be123c',
    defaultScale: 1.05
  },
  {
    type: 'peony',
    name: 'Blush Peony',
    shortName: 'Peony',
    subtitle: 'Lush ruffled layers',
    defaultPetalColor: '#fbcfe8',
    defaultCenterColor: '#f472b6',
    defaultScale: 1.15
  },
  {
    type: 'tulip',
    name: 'Dutch Tulip',
    shortName: 'Tulip',
    subtitle: 'Graceful spring cup',
    defaultPetalColor: '#fb7185',
    defaultCenterColor: '#fde047',
    defaultScale: 1.0
  },
  {
    type: 'lily',
    name: 'Stargazer Lily',
    shortName: 'Lily',
    subtitle: 'Star-shaped elegance',
    defaultPetalColor: '#fdf2f8',
    defaultCenterColor: '#f97316',
    defaultScale: 1.12
  },
  {
    type: 'sunflower',
    name: 'Golden Sunflower',
    shortName: 'Sunflower',
    subtitle: 'Warm sunlit rays',
    defaultPetalColor: '#facc15',
    defaultCenterColor: '#451a03',
    defaultScale: 1.15
  },
  {
    type: 'hydrangea',
    name: 'Cloud Hydrangea',
    shortName: 'Hydrangea',
    subtitle: 'Billowy cluster',
    defaultPetalColor: '#c4b5fd',
    defaultCenterColor: '#ede9fe',
    defaultScale: 1.18
  },
  {
    type: 'daisy',
    name: 'Chamomile Daisy',
    shortName: 'Daisy',
    subtitle: 'Sweet meadow charm',
    defaultPetalColor: '#ffffff',
    defaultCenterColor: '#eab308',
    defaultScale: 0.92
  },
  {
    type: 'orchid',
    name: 'Phalaenopsis Orchid',
    shortName: 'Orchid',
    subtitle: 'Exotic winged cascade',
    defaultPetalColor: '#f0abfc',
    defaultCenterColor: '#a21caf',
    defaultScale: 1.1
  },
  {
    type: 'carnation',
    name: 'Ruffled Carnation',
    shortName: 'Carnation',
    subtitle: 'Frilled clove petals',
    defaultPetalColor: '#fda4af',
    defaultCenterColor: '#e11d48',
    defaultScale: 1.04
  },
  {
    type: 'ranunculus',
    name: 'Persian Ranunculus',
    shortName: 'Ranunculus',
    subtitle: 'Spiral paper-thin layers',
    defaultPetalColor: '#fdba74',
    defaultCenterColor: '#ea580c',
    defaultScale: 1.06
  },
  {
    type: 'anemone',
    name: 'Poppy Anemone',
    shortName: 'Anemone',
    subtitle: 'Dark-eyed velvet bloom',
    defaultPetalColor: '#f8fafc',
    defaultCenterColor: '#1e1b4b',
    defaultScale: 1.06
  },
  {
    type: 'dahlia',
    name: 'Pompon Dahlia',
    shortName: 'Dahlia',
    subtitle: 'Geometric quilled sphere',
    defaultPetalColor: '#e11d48',
    defaultCenterColor: '#881337',
    defaultScale: 1.14
  },
  {
    type: 'iris',
    name: 'Bearded Iris',
    shortName: 'Iris',
    subtitle: 'Royal cascading petals',
    defaultPetalColor: '#818cf8',
    defaultCenterColor: '#facc15',
    defaultScale: 1.12
  },
  {
    type: 'camellia',
    name: 'Japonica Camellia',
    shortName: 'Camellia',
    subtitle: 'Porcelain rosette bloom',
    defaultPetalColor: '#fb7185',
    defaultCenterColor: '#fde047',
    defaultScale: 1.06
  },
  {
    type: 'lotus',
    name: 'Sacred Lotus',
    shortName: 'Lotus',
    subtitle: 'Serene water blossom',
    defaultPetalColor: '#f9a8d4',
    defaultCenterColor: '#f59e0b',
    defaultScale: 1.14
  },
  {
    type: 'callalily',
    name: 'Sculptural Calla Lily',
    shortName: 'Calla Lily',
    subtitle: 'Architectural trumpet spathe',
    defaultPetalColor: '#fffdf9',
    defaultCenterColor: '#facc15',
    defaultScale: 1.12
  },
  {
    type: 'poppy',
    name: 'Icelandic Silk Poppy',
    shortName: 'Poppy',
    subtitle: 'Crinkled tissue-silk cup',
    defaultPetalColor: '#fb7185',
    defaultCenterColor: '#fde047',
    defaultScale: 1.08
  },
  {
    type: 'sweetpea',
    name: 'Fragrant Sweet Pea',
    shortName: 'Sweet Pea',
    subtitle: 'Fluttering butterfly petals',
    defaultPetalColor: '#e879f9',
    defaultCenterColor: '#fdf4ff',
    defaultScale: 1.04
  },
  {
    type: 'freesia',
    name: 'Bell Freesia Spray',
    shortName: 'Freesia',
    subtitle: 'Arching scented trumpets',
    defaultPetalColor: '#fde047',
    defaultCenterColor: '#f97316',
    defaultScale: 1.06
  },
  // --- 12 FILLERS & FOLIAGE ---
  {
    type: 'lavender',
    name: 'French Lavender',
    shortName: 'Lavender',
    subtitle: 'Fragrant tall spikes',
    defaultPetalColor: '#a855f7',
    defaultCenterColor: '#6b21a8',
    defaultScale: 1.05,
    isFiller: true
  },
  {
    type: 'babysBreath',
    name: "Baby's Breath",
    shortName: "Baby's Breath",
    subtitle: 'Delicate cloud filler',
    defaultPetalColor: '#ffffff',
    defaultCenterColor: '#fef08a',
    defaultScale: 1.05,
    isFiller: true
  },
  {
    type: 'eucalyptus',
    name: 'Silver Dollar Eucalyptus',
    shortName: 'Eucalyptus',
    subtitle: 'Muted sage foliage',
    defaultPetalColor: '#6ee7b7',
    defaultCenterColor: '#047857',
    defaultScale: 1.1,
    isFoliage: true,
    isFiller: true
  },
  {
    type: 'fern',
    name: 'Woodland Fern',
    shortName: 'Fern',
    subtitle: 'Arching botanical frond',
    defaultPetalColor: '#4ade80',
    defaultCenterColor: '#15803d',
    defaultScale: 1.12,
    isFoliage: true,
    isFiller: true
  },
  {
    type: 'cherryBlossom',
    name: 'Sakura Blossom Branch',
    shortName: 'Sakura',
    subtitle: 'Spring cherry twig',
    defaultPetalColor: '#fbcfe8',
    defaultCenterColor: '#db2777',
    defaultScale: 1.12,
    isFiller: true
  },
  {
    type: 'waxflower',
    name: 'Sweet Waxflower',
    shortName: 'Waxflower',
    subtitle: 'Starry woody spray',
    defaultPetalColor: '#f5d0fe',
    defaultCenterColor: '#a21caf',
    defaultScale: 1.08,
    isFiller: true
  },
  {
    type: 'billyButtons',
    name: 'Billy Buttons',
    shortName: 'Craspedia',
    subtitle: 'Golden drumstick globes',
    defaultPetalColor: '#facc15',
    defaultCenterColor: '#ca8a04',
    defaultScale: 1.08,
    isFiller: true
  },
  {
    type: 'oliveBranch',
    name: 'Olive Branch',
    shortName: 'Olive',
    subtitle: 'Mediterranean silver bough',
    defaultPetalColor: '#86efac',
    defaultCenterColor: '#3f6212',
    defaultScale: 1.12,
    isFoliage: true,
    isFiller: true
  },
  {
    type: 'monstera',
    name: 'Tropical Monstera',
    shortName: 'Monstera',
    subtitle: 'Sculptural split leaf',
    defaultPetalColor: '#22c55e',
    defaultCenterColor: '#14532d',
    defaultScale: 1.14,
    isFoliage: true,
    isFiller: true
  },
  {
    type: 'pampas',
    name: 'Velvet Pampas Plume',
    shortName: 'Pampas',
    subtitle: 'Feathery champagne grass',
    defaultPetalColor: '#fde68a',
    defaultCenterColor: '#d97706',
    defaultScale: 1.15,
    isFoliage: true,
    isFiller: true
  },
  {
    type: 'queenanneslace',
    name: "Queen Anne's Lace",
    shortName: 'Lace Umbel',
    subtitle: 'Starry filigree canopy',
    defaultPetalColor: '#ffffff',
    defaultCenterColor: '#86efac',
    defaultScale: 1.08,
    isFiller: true
  },
  {
    type: 'astilbe',
    name: 'Feathered Astilbe',
    shortName: 'Astilbe',
    subtitle: 'Blush gossamer spire',
    defaultPetalColor: '#fda4af',
    defaultCenterColor: '#e11d48',
    defaultScale: 1.1,
    isFiller: true
  }
];

export const ROMANTIC_SWATCHES = [
  '#f43f5e', // Crimson Rose
  '#fb7185', // Coral Pink
  '#fbcfe8', // Soft Blush
  '#fdf2f8', // Pearl White
  '#ffffff', // Pure White
  '#fde047', // Buttercup Yellow
  '#facc15', // Sunflower Gold
  '#fb923c', // Peach Sorbet
  '#c084fc', // Orchid Purple
  '#c4b5fd', // Pastel Lavender
  '#93c5fd', // Hydrangea Blue
  '#6ee7b7', // Eucalyptus Sage
  '#4ade80', // Fern Leaf
  '#451a03'  // Espresso Seed Center
];

export const RIBBON_SWATCHES = [
  { name: 'Crimson Satin', hex: '#e11d48' },
  { name: 'Dusty Rose', hex: '#f472b6' },
  { name: 'Champagne Gold', hex: '#d97706' },
  { name: 'Lavender Silk', hex: '#9333ea' },
  { name: 'Sage Velvet', hex: '#059669' },
  { name: 'Midnight Navy', hex: '#1e3a8a' },
  { name: 'Ivory Lace', hex: '#f8fafc' },
  { name: 'Terracotta Rust', hex: '#c2410c' },
  { name: 'Sky Organza', hex: '#38bdf8' },
  { name: 'Espresso Ribbon', hex: '#451a03' },
  { name: 'Matcha Chiffon', hex: '#84cc16' },
  { name: 'Noir Velvet', hex: '#18181b' }
];

// ============================================================================

export interface StarterTemplate {
  id: 'birthday' | 'anniversary' | 'getWell' | 'thankYou';
  name: string;
  subtitle: string;
  badgeColor: string;
  snapshot: BouquetSnapshot;
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: 'birthday',
    name: 'Birthday',
    subtitle: 'Sunflowers, tulips & confetti blooms',
    badgeColor: '#f59e0b',
    snapshot: {
      wrapStyle: 'tissue',
      wrapColor: '#fef3c7',
      ribbonColor: '#f59e0b',
      card: {
        to: 'Birthday Star',
        message: 'Wishing you sunshine, vibrant laughter, and blooms all year long!',
        from: 'With Love',
        theme: 'sealed',
        visibleOnStage: true
      },
      items: [
        { id: 'bday-1', type: 'sunflower', x: 300, y: 280, scale: 1.35, rotation: 0, flipX: false, petalColor: '#fbbf24', centerColor: '#78350f' },
        { id: 'bday-2', type: 'tulip', x: 235, y: 310, scale: 1.15, rotation: -22, flipX: false, petalColor: '#fb7185', centerColor: '#f43f5e' },
        { id: 'bday-3', type: 'tulip', x: 365, y: 310, scale: 1.15, rotation: 22, flipX: true, petalColor: '#f472b6', centerColor: '#e11d48' },
        { id: 'bday-4', type: 'daisy', x: 200, y: 245, scale: 1.05, rotation: -35, flipX: false, petalColor: '#ffffff', centerColor: '#fbbf24' },
        { id: 'bday-5', type: 'daisy', x: 400, y: 245, scale: 1.05, rotation: 35, flipX: true, petalColor: '#ffffff', centerColor: '#fbbf24' },
        { id: 'bday-6', type: 'eucalyptus', x: 175, y: 330, scale: 1.1, rotation: -42, flipX: false, petalColor: '#6ee7b7', centerColor: '#059669' },
        { id: 'bday-7', type: 'eucalyptus', x: 425, y: 330, scale: 1.1, rotation: 42, flipX: true, petalColor: '#6ee7b7', centerColor: '#059669' },
        { id: 'bday-8', type: 'babysBreath', x: 300, y: 215, scale: 1.25, rotation: 0, flipX: false, petalColor: '#ffffff', centerColor: '#a7f3d0' }
      ]
    }
  },
  {
    id: 'anniversary',
    name: 'Anniversary',
    subtitle: 'Crimson velvet roses & silk bows',
    badgeColor: '#e11d48',
    snapshot: {
      wrapStyle: 'kraft',
      wrapColor: '#d6b38e',
      ribbonColor: '#e11d48',
      card: {
        to: 'My Soulmate',
        message: 'Every moment with you has felt like spring. Happy Anniversary!',
        from: 'Yours Forever',
        theme: 'sealed',
        visibleOnStage: true
      },
      items: [
        { id: 'ann-1', type: 'rose', x: 300, y: 295, scale: 1.45, rotation: 0, flipX: false, petalColor: '#e11d48', centerColor: '#881337' },
        { id: 'ann-2', type: 'rose', x: 230, y: 290, scale: 1.2, rotation: -20, flipX: false, petalColor: '#be123c', centerColor: '#4c0519' },
        { id: 'ann-3', type: 'rose', x: 370, y: 290, scale: 1.2, rotation: 20, flipX: true, petalColor: '#be123c', centerColor: '#4c0519' },
        { id: 'ann-4', type: 'peony', x: 295, y: 230, scale: 1.3, rotation: 5, flipX: false, petalColor: '#fda4af', centerColor: '#f43f5e' },
        { id: 'ann-5', type: 'eucalyptus', x: 170, y: 260, scale: 1.2, rotation: -38, flipX: false, petalColor: '#6ee7b7', centerColor: '#047857' },
        { id: 'ann-6', type: 'eucalyptus', x: 430, y: 260, scale: 1.2, rotation: 38, flipX: true, petalColor: '#6ee7b7', centerColor: '#047857' },
        { id: 'ann-7', type: 'babysBreath', x: 220, y: 350, scale: 1.1, rotation: -15, flipX: false, petalColor: '#ffffff', centerColor: '#cbd5e1' },
        { id: 'ann-8', type: 'babysBreath', x: 380, y: 350, scale: 1.1, rotation: 15, flipX: true, petalColor: '#ffffff', centerColor: '#cbd5e1' }
      ]
    }
  },
  {
    id: 'getWell',
    name: 'Get Well Soon',
    subtitle: 'Calming lavender & pure hydrangeas',
    badgeColor: '#8b5cf6',
    snapshot: {
      wrapStyle: 'tissue',
      wrapColor: '#ede9fe',
      ribbonColor: '#8b5cf6',
      card: {
        to: 'Dear Friend',
        message: 'Sending warm floral hugs and peaceful prayers for a speedy recovery.',
        from: 'Thinking of You',
        theme: 'sealed',
        visibleOnStage: true
      },
      items: [
        { id: 'gw-1', type: 'hydrangea', x: 300, y: 265, scale: 1.35, rotation: 0, flipX: false, petalColor: '#a78bfa', centerColor: '#6d28d9' },
        { id: 'gw-2', type: 'lavender', x: 225, y: 275, scale: 1.25, rotation: -25, flipX: false, petalColor: '#c4b5fd', centerColor: '#5b21b6' },
        { id: 'gw-3', type: 'lavender', x: 375, y: 275, scale: 1.25, rotation: 25, flipX: true, petalColor: '#c4b5fd', centerColor: '#5b21b6' },
        { id: 'gw-4', type: 'daisy', x: 240, y: 345, scale: 1.05, rotation: -12, flipX: false, petalColor: '#ffffff', centerColor: '#fbbf24' },
        { id: 'gw-5', type: 'daisy', x: 360, y: 345, scale: 1.05, rotation: 12, flipX: true, petalColor: '#ffffff', centerColor: '#fbbf24' },
        { id: 'gw-6', type: 'fern', x: 175, y: 320, scale: 1.2, rotation: -40, flipX: false, petalColor: '#34d399', centerColor: '#065f46' },
        { id: 'gw-7', type: 'fern', x: 425, y: 320, scale: 1.2, rotation: 40, flipX: true, petalColor: '#34d399', centerColor: '#065f46' }
      ]
    }
  },
  {
    id: 'thankYou',
    name: 'Thank You',
    subtitle: 'Golden lilies & sweet peach peonies',
    badgeColor: '#ec4899',
    snapshot: {
      wrapStyle: 'celestial',
      wrapColor: '#fbcfe8',
      ribbonColor: '#f43f5e',
      card: {
        to: 'Someone Wonderful',
        message: 'Thank you from the bottom of my heart for your kindness and grace.',
        from: 'Gratefully Yours',
        theme: 'sealed',
        visibleOnStage: true
      },
      items: [
        { id: 'ty-1', type: 'peony', x: 300, y: 260, scale: 1.35, rotation: 0, flipX: false, petalColor: '#f472b6', centerColor: '#fbbf24' },
        { id: 'ty-2', type: 'lily', x: 235, y: 285, scale: 1.2, rotation: -22, flipX: false, petalColor: '#fef08a', centerColor: '#d97706' },
        { id: 'ty-3', type: 'lily', x: 365, y: 285, scale: 1.2, rotation: 22, flipX: true, petalColor: '#fef08a', centerColor: '#d97706' },
        { id: 'ty-4', type: 'tulip', x: 265, y: 345, scale: 1.1, rotation: -10, flipX: false, petalColor: '#fb7185', centerColor: '#e11d48' },
        { id: 'ty-5', type: 'tulip', x: 335, y: 345, scale: 1.1, rotation: 10, flipX: true, petalColor: '#fb7185', centerColor: '#e11d48' },
        { id: 'ty-6', type: 'eucalyptus', x: 180, y: 290, scale: 1.15, rotation: -35, flipX: false, petalColor: '#6ee7b7', centerColor: '#047857' },
        { id: 'ty-7', type: 'eucalyptus', x: 420, y: 290, scale: 1.15, rotation: 35, flipX: true, petalColor: '#6ee7b7', centerColor: '#047857' }
      ]
    }
  }
];


export const INITIAL_ITEMS: BouquetItem[] = [
  // Back Foliage Layer
  { id: 'f-1', type: 'fern', x: 215, y: 245, scale: 1.18, rotation: -28, flipX: false, petalColor: '#4ade80', centerColor: '#15803d' },
  { id: 'f-2', type: 'fern', x: 385, y: 245, scale: 1.18, rotation: 28, flipX: true, petalColor: '#4ade80', centerColor: '#15803d' },
  { id: 'f-3', type: 'eucalyptus', x: 185, y: 295, scale: 1.1, rotation: -38, flipX: false, petalColor: '#6ee7b7', centerColor: '#047857' },
  { id: 'f-4', type: 'eucalyptus', x: 415, y: 295, scale: 1.1, rotation: 38, flipX: true, petalColor: '#6ee7b7', centerColor: '#047857' },
  { id: 'f-5', type: 'lavender', x: 265, y: 220, scale: 1.05, rotation: -12, flipX: false, petalColor: '#c084fc', centerColor: '#7e22ce' },
  { id: 'f-6', type: 'lavender', x: 340, y: 220, scale: 1.05, rotation: 14, flipX: true, petalColor: '#c084fc', centerColor: '#7e22ce' },
  // Mid Cloud & Filler
  { id: 'f-7', type: 'babysBreath', x: 225, y: 275, scale: 1.05, rotation: -22, flipX: false, petalColor: '#ffffff', centerColor: '#fef08a' },
  { id: 'f-8', type: 'babysBreath', x: 375, y: 275, scale: 1.05, rotation: 22, flipX: true, petalColor: '#ffffff', centerColor: '#fef08a' },
  { id: 'f-9', type: 'hydrangea', x: 300, y: 255, scale: 1.2, rotation: 0, flipX: false, petalColor: '#ddd6fe', centerColor: '#f5f3ff' },
  // Focal Blooms
  { id: 'f-10', type: 'lily', x: 230, y: 305, scale: 1.08, rotation: -20, flipX: false, petalColor: '#fdf2f8', centerColor: '#f43f5e' },
  { id: 'f-11', type: 'tulip', x: 375, y: 310, scale: 1.05, rotation: 22, flipX: false, petalColor: '#fb7185', centerColor: '#fde047' },
  { id: 'f-12', type: 'peony', x: 262, y: 325, scale: 1.15, rotation: -10, flipX: false, petalColor: '#fbcfe8', centerColor: '#f472b6' },
  { id: 'f-13', type: 'rose', x: 338, y: 325, scale: 1.12, rotation: 12, flipX: false, petalColor: '#f43f5e', centerColor: '#9f1239' },
  { id: 'f-14', type: 'rose', x: 300, y: 350, scale: 1.18, rotation: 0, flipX: false, petalColor: '#e11d48', centerColor: '#881337' },
  { id: 'f-15', type: 'daisy', x: 215, y: 355, scale: 0.92, rotation: -28, flipX: false, petalColor: '#ffffff', centerColor: '#facc15' },
  { id: 'f-16', type: 'daisy', x: 385, y: 355, scale: 0.92, rotation: 28, flipX: true, petalColor: '#ffffff', centerColor: '#facc15' }
];
