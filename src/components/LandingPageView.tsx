import React, { useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import {
  Bookmark,
  ChevronDown,
  Heart,
  Sun,
  Moon,
} from 'lucide-react';
import { FlowerRenderer } from './flowers/FlowerRenderer';
import { BrandLogoMark } from './BrandLogoMark';
import { LegalStationeryModal } from './LegalStationeryModal';
import {
  MiniWrapConeSVG,
  MiniRibbonBowSVG,
  MiniCardShapeSVG,
  MiniVoiceKeepsakeSVG,
} from './MiniThumbnails';
import {
  FlowerType,
  typeWrapStyle,
  RibbonStyle,
  VoiceKeepsakeStyle,
  DEFAULT_VOICE_KEEPSAKE,
  DEFAULT_BOUQUET_LOCK,
} from '../types/bouquet';
import { useBouquetStore } from '../store/useBouquetStore';
import { computeForegroundPetalTransform } from '../lib/dofParallax';
import {
  HeroLaceGarlandPreview,
  CreationsGalleryPageView,
} from './LaceGarlandShowcase';
import {
  buildSnapshotFromShowcaseEntry,
  ShowcaseBouquetEntry,
} from '../lib/showcaseGallery';
import {
  OFFICIAL_STUDIO_EMAIL,
  CONTACT_TOPICS,
  getContactTopicOption,
  submitContactNote,
  type ContactTopicId,
} from '../lib/contactService';

interface LandingPageViewProps {
  onStartCrafting: () => void;
  onPreviewShowcaseBouquet?: (fromCreationsPage?: boolean) => void;
  initialCreationsPageOpen?: boolean;
  onCloseCreationsPage?: () => void;
  onOpenVault: () => void;
  vaultCount: number;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

const FAQ_ITEMS = [
  {
    q: 'Is it free to craft and share bouquets?',
    a: 'Yes! You can arrange unlimited custom digital bouquets with signature flowers, wraps, ribbons, and a personal card note completely for free. Free sealed bouquets stay active for 30 days.',
  },
  {
    q: 'What comes with a Couture Pass or Single Bouquet unlock?',
    a: 'Unlocking a Single Bouquet ($0.99), 7-Day Pass ($2.99), or 30-Day Eternal Pass ($5.99) gives you glimmering luxury blooms, couture wraps & ribbons, photocards, voice keepsakes, longer 1,500-character notes, and eternal links on 30-day passes.',
  },
  {
    q: 'Can I add photos and a recorded voice message?',
    a: 'Yes! You can upload personal photos into Polaroid, Postage, Cameo, 35mm Film, or Herbarium frames—either tucked inside the bouquet or floating freely—and record your voice into a Mixtape, Vinyl, Plushie, Music Box, or Locket.',
  },
  {
    q: 'How do gift links, QR codes, and secret locks work?',
    a: 'When you seal a bouquet, you receive a shareable link and a customizable botanical QR code with our floral emblem in the center. You can also lock the reveal behind a live date countdown or a secret question.',
  },
  {
    q: 'Do I need an account to save drafts or use my pass?',
    a: 'No account or login is ever required. Your saved bouquets live privately on your device, and your portable BLOOM-XXXX-XXXX pass key can be restored anytime across devices.',
  },
];

interface ShowcasePreset {
  id: string;
  label: string;
  subtitle: string;
  mobileSubtitle: string;
  wrapStyle: typeWrapStyle;
  wrapColor: string;
  wrapShadow: string;
  ribbonStyle: RibbonStyle;
  ribbonColor: string;
  voiceStyle: VoiceKeepsakeStyle;
  voicePrimary: string;
  voiceAccent: string;
  voiceLabel: string;
  notePreview: string;
  stems: {
    type: FlowerType;
    petal: string;
    center: string;
    x: number;
    y: number;
    rot: number;
    scale: number;
  }[];
}

const SHOWCASE_PRESETS: ShowcasePreset[] = [
  {
    id: 'blush',
    label: 'Blush Silk',
    subtitle: 'Butterfly wrap & lace',
    mobileSubtitle: 'Silk & lace',
    wrapStyle: 'tissue',
    wrapColor: '#FFD6E0',
    wrapShadow: '#F7B2C4',
    ribbonStyle: 'lace',
    ribbonColor: '#E11D48',
    voiceStyle: 'mixtape',
    voicePrimary: '#F472B6',
    voiceAccent: '#FFF1F2',
    voiceLabel: 'Side A · 0:14',
    notePreview: '“For you, always…”',
    stems: [
      { type: 'eucalyptus', petal: '#86EFAC', center: '#4ADE80', x: 145, y: 120, rot: -26, scale: 0.72 },
      { type: 'eucalyptus', petal: '#86EFAC', center: '#4ADE80', x: 255, y: 120, rot: 26, scale: 0.72 },
      { type: 'sweetpea', petal: '#FBCFE8', center: '#FCE7F3', x: 148, y: 142, rot: -20, scale: 0.75 },
      { type: 'queenanneslace', petal: '#FFFDF9', center: '#D9F99D', x: 252, y: 142, rot: 20, scale: 0.75 },
      { type: 'peony', petal: '#F472B6', center: '#FEF08A', x: 170, y: 132, rot: -12, scale: 0.85 },
      { type: 'rose', petal: '#E11D48', center: '#FDE047', x: 230, y: 134, rot: 12, scale: 0.84 },
      { type: 'ranunculus', petal: '#FB7185', center: '#FEF3C7', x: 200, y: 112, rot: 0, scale: 0.9 },
    ],
  },
  {
    id: 'hatbox',
    label: 'Velvet Box',
    subtitle: 'Couture hatbox & gold',
    mobileSubtitle: 'Hatbox & gold',
    wrapStyle: 'hatbox',
    wrapColor: '#9F1239',
    wrapShadow: '#881337',
    ribbonStyle: 'goldchain',
    ribbonColor: '#F59E0B',
    voiceStyle: 'vinyl',
    voicePrimary: '#8B5A2B',
    voiceAccent: '#D4AF37',
    voiceLabel: 'Our Song · 0:22',
    notePreview: '“Open on our anniversary…”',
    stems: [
      { type: 'pampas', petal: '#F5E6D3', center: '#E7D5C0', x: 145, y: 126, rot: -24, scale: 0.78 },
      { type: 'astilbe', petal: '#F9A8D4', center: '#F472B6', x: 255, y: 126, rot: 24, scale: 0.78 },
      { type: 'callalily', petal: '#FFFBEB', center: '#F59E0B', x: 170, y: 128, rot: -12, scale: 0.85 },
      { type: 'poppy', petal: '#F43F5E', center: '#1E293B', x: 230, y: 130, rot: 12, scale: 0.85 },
      { type: 'hydrangea', petal: '#FDA4AF', center: '#FFF1F2', x: 200, y: 112, rot: 0, scale: 0.88 },
    ],
  },
  {
    id: 'cloche',
    label: 'Glass Dome',
    subtitle: 'Keepsake bell jar',
    mobileSubtitle: 'Bell jar cloche',
    wrapStyle: 'cloche',
    wrapColor: '#D6B38E',
    wrapShadow: '#B4846C',
    ribbonStyle: 'chiffon',
    ribbonColor: '#E11D48',
    voiceStyle: 'plushie',
    voicePrimary: '#D6A87C',
    voiceAccent: '#F43F5E',
    voiceLabel: 'Press Me · 0:11',
    notePreview: '“Thinking of you today…”',
    stems: [
      { type: 'waxflower', petal: '#FBCFE8', center: '#FDE68A', x: 164, y: 140, rot: -15, scale: 0.68 },
      { type: 'babysBreath', petal: '#FFFFFF', center: '#FEF9C3', x: 236, y: 140, rot: 15, scale: 0.68 },
      { type: 'tulip', petal: '#FB7185', center: '#FEF08A', x: 178, y: 132, rot: -10, scale: 0.76 },
      { type: 'freesia', petal: '#C4B5FD', center: '#FDE047', x: 222, y: 132, rot: 10, scale: 0.76 },
      { type: 'lily', petal: '#F9A8D4', center: '#FDE047', x: 200, y: 116, rot: 0, scale: 0.8 },
    ],
  },
  {
    id: 'mesh',
    label: 'Cloud Mesh',
    subtitle: 'Sheer tulle & rosette',
    mobileSubtitle: 'Tulle & rosette',
    wrapStyle: 'koreanmesh',
    wrapColor: '#EDE0F5',
    wrapShadow: '#D8B4FE',
    ribbonStyle: 'double',
    ribbonColor: '#A855F7',
    voiceStyle: 'locket',
    voicePrimary: '#F59E0B',
    voiceAccent: '#FFE4E6',
    voiceLabel: 'Always · 0:18',
    notePreview: '“A little secret for you…”',
    stems: [
      { type: 'lavender', petal: '#A78BFA', center: '#7C3AED', x: 146, y: 134, rot: -22, scale: 0.78 },
      { type: 'eucalyptus', petal: '#A7F3D0', center: '#6EE7B7', x: 254, y: 134, rot: 22, scale: 0.78 },
      { type: 'orchid', petal: '#F5D0FE', center: '#F472B6', x: 170, y: 130, rot: -12, scale: 0.84 },
      { type: 'anemone', petal: '#FAF5FF', center: '#312E81', x: 230, y: 132, rot: 12, scale: 0.84 },
      { type: 'hydrangea', petal: '#DDD6FE', center: '#FAF5FF', x: 200, y: 112, rot: 0, scale: 0.88 },
    ],
  },
];

/** Converts a Landing Page ShowcasePreset into a full 600x650 Studio BouquetSnapshot */
function applyShowcasePresetToStudio(preset: ShowcasePreset) {
  const store = useBouquetStore.getState();
  const studioItems = preset.stems.map((st, idx) => ({
    id: `preset-${preset.id}-${idx}-${Date.now()}`,
    type: st.type,
    x: Math.round(300 + (st.x - 200) * 1.65),
    y: Math.round(245 + (st.y - 112) * 3.0),
    scale: Number((st.scale * 1.45).toFixed(2)),
    rotation: st.rot,
    flipX: st.rot > 0,
    petalColor: st.petal,
    centerColor: st.center,
    stemLength: 1,
    locked: false,
    hidden: false,
  }));

  store.loadSnapshot({
    items: studioItems,
    wrapStyle: preset.wrapStyle,
    wrapColor: preset.wrapColor,
    ribbonStyle: preset.ribbonStyle,
    ribbonColor: preset.ribbonColor,
    card: {
      ...store.card,
      message: preset.notePreview.replace(/[“”]/g, ''),
      visibleOnStage: true,
    },
    voice: {
      ...(store.voice || DEFAULT_VOICE_KEEPSAKE),
      style: preset.voiceStyle,
      primaryColor: preset.voicePrimary,
      accentColor: preset.voiceAccent,
      title: preset.voiceLabel.split('·')[0].trim(),
    },
    lock: store.lock || { ...DEFAULT_BOUQUET_LOCK },
  });
}

/** Converts a LaceGarlandShowcase entry into a full 600x680 Studio BouquetSnapshot (100% identical to the card preview) */
function applyShowcaseEntryToStudio(entry: ShowcaseBouquetEntry) {
  const store = useBouquetStore.getState();
  const exactSnap = buildSnapshotFromShowcaseEntry(entry);
  store.loadSnapshot({
    ...exactSnap,
    lock: exactSnap.lock || { ...DEFAULT_BOUQUET_LOCK },
  });
}

/** Full-Proportioned Architectural Bouquet Illustration for the Hero Vitrine (Memoized for instant theme switches) */
const HeroBouquetIllustrationSVG: React.FC<{ preset: ShowcasePreset }> = React.memo(({ preset }) => {
  const { wrapStyle, wrapColor, wrapShadow, ribbonColor, stems } = preset;
  const domeClipId = `hero-cloche-dome-${preset.id}`;

  return (
    <svg
      viewBox="48 26 304 274"
      className="w-full h-full max-w-[215px] sm:max-w-[250px] max-h-[195px] sm:max-h-[228px] overflow-visible select-none drop-shadow-[0_8px_16px_rgba(122,75,58,0.14)]"
    >
      <defs>
        {/* Strict interior contour of the Glass Dome bell jar so no bloom or stem ever passes through the glass walls */}
        <clipPath id={domeClipId}>
          <path d="M 129,246 L 129,130 A 71,71 0 0 1 271,130 L 271,246 Z" />
        </clipPath>
      </defs>
      <g>
        {/* 1. BACK WRAPPER LAYER */}
        {wrapStyle === 'tissue' && (
          <g>
            <path d="M 200,225 L 96,95 Q 145,78 200,132 Z" fill={wrapShadow} />
            <path d="M 200,225 L 304,95 Q 255,78 200,132 Z" fill={wrapColor} />
            <path d="M 200,225 L 116,115 Q 158,105 200,150 Z" fill="#FFF5F7" opacity="0.72" />
            <path d="M 200,225 L 284,115 Q 242,105 200,150 Z" fill="#FFF5F7" opacity="0.72" />
          </g>
        )}

        {wrapStyle === 'hatbox' && (
          <g>
            <path
              d="M 122,185 Q 155,120 200,145 Q 245,120 278,185 Z"
              fill="#FFFDF9"
              stroke="#F3E8E2"
              strokeWidth="1.2"
            />
            <ellipse cx="200" cy="182" rx="70" ry="12" fill="#4C0519" />
          </g>
        )}

        {wrapStyle === 'cloche' && (
          <g>
            <ellipse cx="200" cy="60" rx="10" ry="3.5" fill="#CBD5E1" opacity="0.75" />
            <circle cx="200" cy="52" r="8" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.2" />
            <path
              d="M 128,248 L 128,130 A 72,72 0 0 1 272,130 L 272,248 Z"
              fill="#E0F2FE"
              fillOpacity="0.32"
              stroke="#CBD5E1"
              strokeWidth="1.6"
            />
          </g>
        )}

        {wrapStyle === 'koreanmesh' && (
          <g>
            <path
              d="M 200,225 L 92,108 Q 140,72 200,104 Q 260,72 308,108 Z"
              fill={wrapColor}
              opacity="0.88"
            />
            <path
              d="M 200,225 L 112,120 Q 155,92 200,118 Q 245,92 288,120 Z"
              fill="#FFFFFF"
              opacity="0.65"
            />
          </g>
        )}

        {/* 2 & 3. STEMS & BLOOMS LAYER (Clipped strictly inside the bell jar when wrapStyle === 'cloche') */}
        <g clipPath={wrapStyle === 'cloche' ? `url(#${domeClipId})` : undefined}>
          {stems.map((st, idx) => {
            const bottomX = wrapStyle === 'cloche' ? Math.round(200 + (st.x - 200) * 0.22) : 200;
            const bottomY = wrapStyle === 'cloche' ? 243 : 232;
            const tieY = wrapStyle === 'cloche' ? 220 : 225;
            return (
              <g key={`stem-${idx}`}>
                <path
                  d={
                    wrapStyle === 'cloche'
                      ? `M ${st.x},${st.y + 4} Q ${(st.x + 200) / 2},${(st.y + tieY) / 2 + 6} 200,${tieY} L ${bottomX},${bottomY}`
                      : `M ${st.x},${st.y} Q ${(st.x + 200) / 2},${(st.y + 225) / 2 + 8} 200,232`
                  }
                  stroke="#4D7C5D"
                  strokeWidth="3.5"
                  fill="none"
                  strokeLinecap="round"
                />
              </g>
            );
          })}

          {stems.map((st, idx) => (
            <g
              key={`bloom-${idx}`}
              transform={`translate(${st.x}, ${st.y}) rotate(${st.rot}) scale(${st.scale})`}
            >
              <FlowerRenderer
                type={st.type}
                petalColor={st.petal}
                centerColor={st.center}
                hideStem
              />
            </g>
          ))}
        </g>

        {/* 4. FRONT WRAPPER FOLD & RIBBON BOW LAYER */}
        {wrapStyle === 'tissue' && (
          <g>
            <path
              d="M 164,228 L 236,228 L 226,282 Q 200,288 174,282 Z"
              fill={wrapColor}
            />
            <path
              d="M 122,166 Q 162,190 204,230 L 164,230 Q 142,200 122,166 Z"
              fill={wrapShadow}
            />
            <path
              d="M 278,166 Q 238,190 196,230 L 236,230 Q 258,200 278,166 Z"
              fill={wrapColor}
            />
            <path
              d="M 162,228 Q 200,236 238,228"
              fill="none"
              stroke={ribbonColor}
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <path
              d="M 200,231 C 180,216 174,238 198,233 M 200,231 C 220,216 226,238 202,233"
              fill="none"
              stroke={ribbonColor}
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M 198,233 Q 190,254 185,270 M 202,233 Q 210,254 215,270"
              fill="none"
              stroke={ribbonColor}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="200" cy="231" r="4" fill={ribbonColor} />
          </g>
        )}

        {wrapStyle === 'hatbox' && (
          <g>
            <path
              d="M 134,182 L 266,182 L 258,278 Q 200,290 142,278 Z"
              fill={wrapColor}
              stroke={wrapShadow}
              strokeWidth="1.5"
            />
            <rect
              x="128"
              y="174"
              width="144"
              height="14"
              rx="5"
              fill={wrapShadow}
              stroke="#F59E0B"
              strokeWidth="1"
            />
            <rect
              x="174"
              y="214"
              width="52"
              height="30"
              rx="6"
              fill="#FFFBEB"
              stroke="#F59E0B"
              strokeWidth="1.5"
            />
            <line x1="184" y1="226" x2="216" y2="226" stroke="#92400E" strokeWidth="1.4" strokeLinecap="round" />
            <line x1="190" y1="234" x2="210" y2="234" stroke="#B45309" strokeWidth="1.1" strokeLinecap="round" />
            <path
              d="M 136,192 Q 200,224 264,192"
              fill="none"
              stroke="#F59E0B"
              strokeWidth="2.2"
              strokeDasharray="4 3"
            />
          </g>
        )}

        {wrapStyle === 'cloche' && (
          <g>
            {/* Dainty Chiffon Bow Tied Around Gathered Stems Inside the Bell Jar */}
            <path
              d="M 188,220 Q 200,224 212,220"
              fill="none"
              stroke={ribbonColor}
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            <path
              d="M 200,221 C 185,210 182,228 198,223 M 200,221 C 215,210 218,228 202,223"
              fill="none"
              stroke={ribbonColor}
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <path
              d="M 198,223 L 191,241 M 202,223 L 209,241"
              stroke={ribbonColor}
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <circle cx="200" cy="221" r="3.2" fill={ribbonColor} />
            {/* Preserved Moss Cushion Inside Base */}
            <ellipse cx="200" cy="245" rx="54" ry="6.5" fill="#4D7C5D" opacity="0.72" />
            <ellipse cx="200" cy="244" rx="40" ry="4.5" fill="#86EFAC" opacity="0.45" />
            {/* Front Specular Glass Reflection Arcs */}
            <path
              d="M 140,132 A 60,60 0 0 1 178,74"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="3.5"
              strokeLinecap="round"
              opacity="0.82"
            />
            <line
              x1="138"
              y1="142"
              x2="138"
              y2="236"
              stroke="#FFFFFF"
              strokeWidth="2.8"
              strokeLinecap="round"
              opacity="0.62"
            />
            {/* Sculpted Walnut Wood Pedestal Base */}
            <ellipse cx="200" cy="248" rx="76" ry="9" fill={wrapColor} stroke={wrapShadow} strokeWidth="1.5" />
            <rect x="122" y="248" width="156" height="15" rx="6" fill={wrapShadow} />
          </g>
        )}

        {wrapStyle === 'koreanmesh' && (
          <g>
            <path
              d="M 160,225 L 240,225 L 234,278 Q 200,286 166,278 Z"
              fill={wrapColor}
            />
            <path
              d="M 118,162 Q 162,188 204,228 L 160,228 Q 136,196 118,162 Z"
              fill={wrapShadow}
              opacity="0.85"
            />
            <path
              d="M 282,162 Q 238,188 196,228 L 240,228 Q 264,196 282,162 Z"
              fill={wrapColor}
              opacity="0.92"
            />
            <path
              d="M 160,226 Q 170,232 180,226 Q 190,232 200,226 Q 210,232 220,226 Q 230,232 240,226"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2.2"
            />
            <path
              d="M 200,228 C 176,210 170,238 198,231 M 200,228 C 224,210 230,238 202,231"
              fill="none"
              stroke={ribbonColor}
              strokeWidth="3.2"
            />
            <circle cx="200" cy="229" r="4.5" fill={ribbonColor} />
          </g>
        )}
      </g>
    </svg>
  );
});

/** Cohesive Scene Illustration for Step 01: Pick & Wrap */
const StepOneSceneSVG: React.FC = React.memo(() => (
  <svg viewBox="0 0 240 150" className="w-full h-full max-w-[210px] sm:max-w-[220px] max-h-[125px] sm:max-h-[140px] overflow-visible select-none drop-shadow-[0_5px_10px_rgba(122,75,58,0.1)]">
    <circle cx="120" cy="76" r="54" fill="#FFFDF9" opacity="0.62" />
    <circle cx="120" cy="76" r="40" fill="#FDE8EF" opacity="0.65" />

    <path
      d="M 32,96 Q 76,58 120,84 T 208,68"
      fill="none"
      stroke="#DFCFC2"
      strokeWidth="1.2"
      strokeDasharray="3 3"
    />

    <g>
      <path d="M 120,115 L 68,48 Q 95,38 120,68 Z" fill="#F7B2C4" />
      <path d="M 120,115 L 172,48 Q 145,38 120,68 Z" fill="#FFD6E0" />
      <path d="M 120,115 L 80,58 Q 102,52 120,76 Z" fill="#FFF5F7" opacity="0.8" />
      <path d="M 120,115 L 160,58 Q 138,52 120,76 Z" fill="#FFF5F7" opacity="0.8" />

      <path d="M 92,62 Q 106,90 120,116" stroke="#4D7C5D" strokeWidth="2.8" fill="none" strokeLinecap="round" />
      <path d="M 148,62 Q 134,90 120,116" stroke="#4D7C5D" strokeWidth="2.8" fill="none" strokeLinecap="round" />
      <path d="M 120,52 L 120,116" stroke="#4D7C5D" strokeWidth="3" fill="none" strokeLinecap="round" />

      <g transform="translate(92, 62) rotate(-16) scale(0.46)">
        <FlowerRenderer type="peony" petalColor="#F472B6" centerColor="#FEF08A" hideStem />
      </g>
      <g transform="translate(148, 64) rotate(16) scale(0.46)">
        <FlowerRenderer type="callalily" petalColor="#FFFBEB" centerColor="#F59E0B" hideStem />
      </g>
      <g transform="translate(120, 50) scale(0.52)">
        <FlowerRenderer type="ranunculus" petalColor="#FB7185" centerColor="#FEF3C7" hideStem />
      </g>

      <path d="M 100,112 L 140,112 L 134,140 Q 120,144 106,140 Z" fill="#FFD6E0" />
      <path d="M 78,80 Q 100,94 122,114 L 100,114 Z" fill="#F7B2C4" />
      <path d="M 162,80 Q 140,94 118,114 L 140,114 Z" fill="#FFD6E0" />

      <path d="M 99,113 Q 120,118 141,113" fill="none" stroke="#E11D48" strokeWidth="2.5" strokeLinecap="round" />
      <path
        d="M 120,115 C 107,105 103,120 119,116 M 120,115 C 133,105 137,120 121,116"
        fill="none"
        stroke="#E11D48"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path d="M 119,116 Q 113,129 109,138 M 121,116 Q 127,129 131,138" fill="none" stroke="#E11D48" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="120" cy="115" r="2.8" fill="#E11D48" />
    </g>

    <g transform="translate(36, 42) rotate(-8)">
      <rect x="0" y="0" width="32" height="32" rx="10" fill="#FFFDF9" stroke="#EFE5DC" strokeWidth="1" />
      <circle cx="16" cy="16" r="9" fill="#9F1239" />
      <circle cx="16" cy="16" r="5" fill="#F59E0B" />
    </g>

    <g transform="translate(174, 82) rotate(8)">
      <rect x="0" y="0" width="34" height="34" rx="10" fill="#FFFDF9" stroke="#EFE5DC" strokeWidth="1" />
      <path
        d="M 17,17 C 10,10 8,20 16,18 M 17,17 C 24,10 26,20 18,18"
        fill="none"
        stroke="#B4846C"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M 16,18 L 13,25 M 18,18 L 21,25" stroke="#B4846C" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="17" cy="17" r="2" fill="#B4846C" />
    </g>
  </svg>
));

/** Cohesive Scene Illustration for Step 02: Voice & Note */
const StepTwoSceneSVG: React.FC = React.memo(() => (
  <svg viewBox="0 0 240 150" className="w-full h-full max-w-[210px] sm:max-w-[220px] max-h-[125px] sm:max-h-[140px] overflow-visible select-none drop-shadow-[0_5px_10px_rgba(122,75,58,0.1)]">
    <circle cx="120" cy="74" r="54" fill="#FFFDF9" opacity="0.62" />

    <g>
      <g transform="translate(42, 24) rotate(-6)">
        <rect x="0" y="0" width="84" height="66" rx="8" fill="#FFFDF9" stroke="#DFCFC2" strokeWidth="1.4" strokeDasharray="3.5 2.5" />
        <path
          d="M 42,18 C 42,18 38,15 38,12.8 C 38,11.5 39,10.6 40.3,10.6 C 41.1,10.6 41.7,11.1 42,11.7 C 42.3,11.1 42.9,10.6 43.7,10.6 C 45,10.6 46,11.5 46,12.8 C 46,15 42,18 42,18 Z"
          fill="#E11D48"
        />
        <path d="M 18,28 Q 30,25 42,28 T 66,27" fill="none" stroke="#8C7365" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M 18,37 Q 34,35 48,37 T 64,36" fill="none" stroke="#AE978B" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M 24,46 Q 36,44 52,46" fill="none" stroke="#C5B2A7" strokeWidth="1.4" strokeLinecap="round" />
      </g>

      <g transform="translate(122, 22) rotate(7)">
        <rect x="0" y="0" width="74" height="68" rx="14" fill="#FFFDF9" stroke="#E5D6C8" strokeWidth="1.4" />
        <circle cx="23" cy="21" r="7" fill="#D6A87C" />
        <circle cx="23" cy="21" r="3.8" fill="#F5E1CE" />
        <circle cx="51" cy="21" r="7" fill="#D6A87C" />
        <circle cx="51" cy="21" r="3.8" fill="#F5E1CE" />
        <circle cx="37" cy="31" r="15" fill="#D6A87C" />
        <ellipse cx="37" cy="34" rx="6.5" ry="5" fill="#FFFDF9" />
        <circle cx="32" cy="28" r="1.8" fill="#2A211D" />
        <circle cx="42" cy="28" r="1.8" fill="#2A211D" />
        <ellipse cx="37" cy="32.5" rx="2.3" ry="1.6" fill="#5C4033" />
        <path
          d="M 37,57 C 37,57 27,50 27,45.5 C 27,42.8 29.2,41 31.8,41 C 33.8,41 35.6,42.2 37,43.8 C 38.4,42.2 40.2,41 42.2,41 C 44.8,41 47,42.8 47,45.5 C 47,50 37,57 37,57 Z"
          fill="#F43F5E"
        />
      </g>

      <g transform="translate(56, 102)">
        <rect x="0" y="0" width="128" height="28" rx="14" fill="#FFFDF9" stroke="#E5D6C8" strokeWidth="1.3" />
        <circle cx="16" cy="14" r="4.5" fill="#F43F5E" />
        {[4, 10, 7, 13, 8, 14, 6, 11, 9, 13, 6, 8, 4].map((h, i) => (
          <rect
            key={i}
            x={30 + i * 5.2}
            y={14 - h / 2}
            width="2.6"
            height={h}
            rx="1.3"
            fill={i < 8 ? '#7A4B3A' : '#D5C2B4'}
          />
        ))}
        <text x="103" y="17.5" fontSize="8.5" fontWeight="600" fill="#8C7365" fontFamily="Inter, sans-serif">
          0:14
        </text>
      </g>
    </g>
  </svg>
));

/** Cohesive Scene Illustration for Step 03: Send or Time-Lock */
const StepThreeSceneSVG: React.FC = React.memo(() => (
  <svg viewBox="0 0 240 150" className="w-full h-full max-w-[210px] sm:max-w-[220px] max-h-[125px] sm:max-h-[140px] overflow-visible select-none drop-shadow-[0_5px_10px_rgba(122,75,58,0.1)]">
    <circle cx="120" cy="76" r="54" fill="#FFFDF9" opacity="0.62" />

    <g>
      <g transform="translate(52, 36)">
        <rect x="0" y="0" width="136" height="82" rx="10" fill="#FFFDF9" stroke="#DECBB9" strokeWidth="1.5" />
        <path
          d="M 2,3 L 68,48 L 134,3"
          fill="#F7EFE6"
          stroke="#DECBB9"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <line x1="0" y1="42" x2="136" y2="42" stroke="#B4846C" strokeWidth="1.3" strokeDasharray="3.5 2.5" />
        <line x1="68" y1="0" x2="68" y2="82" stroke="#B4846C" strokeWidth="1.3" strokeDasharray="3.5 2.5" />

        <circle cx="68" cy="42" r="14" fill="#9F3E52" />
        <circle cx="68" cy="42" r="10.5" fill="none" stroke="#FDE8EF" strokeWidth="0.9" strokeDasharray="2 1.5" />
        <path
          d="M 68,47 C 68,47 62,42.8 62,39.6 C 62,37.8 63.5,36.5 65.2,36.5 C 66.4,36.5 67.4,37.2 68,38.1 C 68.6,37.2 69.6,36.5 70.8,36.5 C 72.5,36.5 74,37.8 74,39.6 C 74,42.8 68,47 68,47 Z"
          fill="#FFFDF9"
        />
      </g>

      <g transform="translate(122, 16) rotate(4)">
        <rect x="0" y="0" width="88" height="24" rx="12" fill="#FFFDF9" stroke="#E5D6C8" strokeWidth="1.2" />
        <circle cx="13" cy="12" r="5" fill="none" stroke="#7A4B3A" strokeWidth="1.3" />
        <path d="M 13,9.5 L 13,12 L 15,13.2" fill="none" stroke="#7A4B3A" strokeWidth="1.2" strokeLinecap="round" />
        <text x="24" y="15" fontSize="8.5" fontWeight="600" fill="#5C4940" fontFamily="Inter, sans-serif">
          14d : 08h : 22m
        </text>
      </g>

      <g transform="translate(30, 94) rotate(-14)">
        <rect x="0" y="0" width="46" height="28" rx="10" fill="#FFFDF9" stroke="#E5D6C8" strokeWidth="1.2" />
        <circle cx="16" cy="14" r="5.5" fill="none" stroke="#D97706" strokeWidth="1.8" />
        <line x1="21.5" y1="14" x2="35" y2="14" stroke="#D97706" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="30" y1="14" x2="30" y2="18.5" stroke="#D97706" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="34" y1="14" x2="34" y2="19.5" stroke="#D97706" strokeWidth="1.8" strokeLinecap="round" />
      </g>
    </g>
  </svg>
));

/** Delicate Thin Rope Lace & Scallop Bow Divider Illustration */
const ThinRopeLaceDivider: React.FC<{ isDarkMode: boolean }> = React.memo(({ isDarkMode }) => {
  const stroke = isDarkMode ? '#65554E' : '#D5C2B4';
  const accent = isDarkMode ? '#D8A88E' : '#B0826C';
  return (
    <div className="w-full flex items-center justify-center py-2.5 sm:py-3 select-none" aria-hidden="true">
      <svg viewBox="0 0 420 34" className="w-56 sm:w-80 h-6 sm:h-7 overflow-visible">
        <path
          d="M 10,17 Q 55,11 100,17 T 182,17"
          fill="none"
          stroke={stroke}
          strokeWidth="1"
          strokeLinecap="round"
        />
        <path
          d="M 10,17 Q 55,23 100,17 T 182,17"
          fill="none"
          stroke={stroke}
          strokeWidth="0.85"
          strokeDasharray="2.5 2.5"
          strokeLinecap="round"
        />
        <path
          d="M 238,17 Q 280,11 325,17 T 410,17"
          fill="none"
          stroke={stroke}
          strokeWidth="1"
          strokeLinecap="round"
        />
        <path
          d="M 238,17 Q 280,23 325,17 T 410,17"
          fill="none"
          stroke={stroke}
          strokeWidth="0.85"
          strokeDasharray="2.5 2.5"
          strokeLinecap="round"
        />
        <path
          d="M 210,17 C 194,5 182,11 190,19 C 195,23 204,20 210,17 Z"
          fill="none"
          stroke={accent}
          strokeWidth="1.25"
        />
        <path
          d="M 210,17 C 226,5 238,11 230,19 C 225,23 216,20 210,17 Z"
          fill="none"
          stroke={accent}
          strokeWidth="1.25"
        />
        <path
          d="M 210,17 Q 202,25 195,30 M 210,17 Q 218,25 225,30"
          fill="none"
          stroke={accent}
          strokeWidth="1.15"
          strokeLinecap="round"
        />
        <circle cx="210" cy="17" r="2.2" fill={accent} />
      </svg>
    </div>
  );
});

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  onStartCrafting,
  onPreviewShowcaseBouquet,
  initialCreationsPageOpen = false,
  onCloseCreationsPage,
  onOpenVault,
  vaultCount,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);
  const [activePresetIdx, setActivePresetIdx] = useState<number>(0);

  // Minimal Contact, Mobile Nav & Legal modal state
  const [contactTopic, setContactTopic] = useState<ContactTopicId>('flower_wish');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [isContactSending, setIsContactSending] = useState(false);
  const [isContactSent, setIsContactSent] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [sentConfirmationEmail, setSentConfirmationEmail] = useState<string | null>(null);
  const [sentTopicLabel, setSentTopicLabel] = useState<string>('Flower Wish');
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isMaintainNoteOpen, setIsMaintainNoteOpen] = useState(false);
  const [isCreationsPageOpen, setIsCreationsPageOpen] = useState(Boolean(initialCreationsPageOpen));
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null);
  const [isNavScrolled, setIsNavScrolled] = useState(false);
  const isNavScrolledRef = useRef(false);

  const scrollWrapperRef = useRef<HTMLDivElement | null>(null);
  const scrollContentRef = useRef<HTMLDivElement | null>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const isDarkModeRef = useRef<boolean>(isDarkMode);
  isDarkModeRef.current = isDarkMode;

  // Direct DOM refs for 120fps Scroll-Linked Blooming Watercolor & Colored Lineart Flower behind Title
  const bloomRootRef = useRef<HTMLDivElement | null>(null);
  const bloomOuterRingRef = useRef<SVGGElement | null>(null);
  const bloomMidRingRef = useRef<SVGGElement | null>(null);
  const bloomInnerCorollaRef = useRef<SVGGElement | null>(null);
  const bloomBotanicalLeavesRef = useRef<SVGGElement | null>(null);

  // Direct DOM refs for Depth-of-Field Foreground Camera-Lens Petals (2.15x & 2.65x fast scroll parallax)
  const fgPetalLeftRef = useRef<HTMLDivElement | null>(null);
  const fgPetalRightRef = useRef<HTMLDivElement | null>(null);

  // Pure GPU-driven scroll bloom & foreground depth-of-field petal updater (0 React re-renders during scroll)
  const applyHeroBloomProgress = (scrollTop: number) => {
    const nextScrolled = scrollTop > 44;
    if (isNavScrolledRef.current !== nextScrolled) {
      isNavScrolledRef.current = nextScrolled;
      setIsNavScrolled(nextScrolled);
    }
    const vh = scrollWrapperRef.current?.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 900);

    // 1. Update Foreground Depth-of-Field Camera-Lens Petals across the entire scroll height
    if (fgPetalLeftRef.current) {
      const p0 = computeForegroundPetalTransform(scrollTop, 0, vh, isDarkModeRef.current);
      fgPetalLeftRef.current.style.opacity = String(p0.opacity);
      fgPetalLeftRef.current.style.transform = `translate3d(${p0.translateX}px, ${p0.translateY}px, 0) rotate(${p0.rotateDeg}deg) scale(${p0.scale})`;
    }
    if (fgPetalRightRef.current) {
      const p1 = computeForegroundPetalTransform(scrollTop, 1, vh, isDarkModeRef.current);
      fgPetalRightRef.current.style.opacity = String(p1.opacity);
      fgPetalRightRef.current.style.transform = `translate3d(${p1.translateX}px, ${p1.translateY}px, 0) rotate(${p1.rotateDeg}deg) scale(${p1.scale})`;
    }

    // 2. Update Hero Background Watercolor Bloom
    const rootEl = bloomRootRef.current;
    if (!rootEl) return;

    // Blooms from scrollTop 0 -> 420px across the Hero
    const maxScroll = 420;
    const rawP = Math.min(1, Math.max(0, scrollTop / maxScroll));
    // Smooth cubic ease-out for organic petal unfurling
    const bloomEase = 1 - Math.pow(1 - rawP, 2.2);

    const baseOpacity = isDarkModeRef.current ? 0.76 : 0.94;
    // Holds gentle presence behind the title from 0..28% scroll, then dissolves smoothly by 100%
    const fadeFactor =
      rawP <= 0.28
        ? 1
        : Math.max(0, Math.pow(1 - (rawP - 0.28) / 0.72, 1.55));
    const finalOpacity = baseOpacity * fadeFactor;

    if (finalOpacity <= 0.008) {
      rootEl.style.opacity = '0';
      rootEl.style.visibility = 'hidden';
      return;
    }

    rootEl.style.visibility = 'visible';
    rootEl.style.opacity = finalOpacity.toFixed(3);

    // Overall flower starts as a generous, lush couture blossom (1.02) and expands to full wide bloom (1.48) on scroll
    const rootScale = 1.02 + bloomEase * 0.46;
    const driftY = rawP * 36;
    rootEl.style.transform = `translate3d(-50%, calc(-63% + ${driftY.toFixed(1)}px), 0) scale(${rootScale.toFixed(3)})`;

    if (bloomOuterRingRef.current) {
      const outerScale = 0.94 + bloomEase * 0.34;
      const outerRot = bloomEase * 24;
      bloomOuterRingRef.current.setAttribute(
        'transform',
        `translate(260, 170) rotate(${outerRot.toFixed(2)}) scale(${outerScale.toFixed(3)})`
      );
    }
    if (bloomMidRingRef.current) {
      const midScale = 0.86 + bloomEase * 0.38;
      const midRot = -bloomEase * 18;
      bloomMidRingRef.current.setAttribute(
        'transform',
        `translate(260, 170) rotate(${midRot.toFixed(2)}) scale(${midScale.toFixed(3)})`
      );
    }
    if (bloomInnerCorollaRef.current) {
      const innerScale = 0.82 + bloomEase * 0.42;
      const innerRot = bloomEase * 32;
      bloomInnerCorollaRef.current.setAttribute(
        'transform',
        `translate(260, 170) rotate(${innerRot.toFixed(2)}) scale(${innerScale.toFixed(3)})`
      );
    }
    if (bloomBotanicalLeavesRef.current) {
      const spreadX = 0.96 + bloomEase * 0.36;
      const spreadY = 0.96 + bloomEase * 0.22;
      bloomBotanicalLeavesRef.current.setAttribute(
        'transform',
        `translate(260, 170) scale(${spreadX.toFixed(3)}, ${spreadY.toFixed(3)})`
      );
    }
  };

  // Re-sync bloom opacity when theme switches
  useEffect(() => {
    const wrapper = scrollWrapperRef.current;
    applyHeroBloomProgress(wrapper ? wrapper.scrollTop : 0);
  }, [isDarkMode]);

  // Initialize Lenis smooth water-like scrolling on the LandingPageView scroll container
  useEffect(() => {
    const wrapper = scrollWrapperRef.current;
    const content = scrollContentRef.current;
    if (!wrapper || !content) return;

    applyHeroBloomProgress(wrapper.scrollTop);

    const lenis = new Lenis({
      wrapper,
      content,
      lerp: 0.085,
      duration: 1.25,
      smoothWheel: true,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.5,
    });
    lenisRef.current = lenis;

    lenis.on('scroll', (e: { scroll: number }) => {
      applyHeroBloomProgress(e.scroll);
    });

    const handleNativeScroll = () => {
      applyHeroBloomProgress(wrapper.scrollTop);
    };
    wrapper.addEventListener('scroll', handleNativeScroll, { passive: true });

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    return () => {
      wrapper.removeEventListener('scroll', handleNativeScroll);
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // IntersectionObserver sets data-revealed="true" (which React never overwrites when className changes on theme toggle!)
  useEffect(() => {
    const wrapper = scrollWrapperRef.current;
    if (!wrapper) return;
    const elements = wrapper.querySelectorAll('.fluid-scroll-item');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.setAttribute('data-revealed', 'true');
          }
        });
      },
      {
        root: wrapper,
        threshold: 0.08,
        rootMargin: '0px 0px -20px 0px',
      }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    setIsMobileNavOpen(false);
    const el = document.getElementById(id);
    if (!el) return;
    if (lenisRef.current) {
      lenisRef.current.scrollTo(el, {
        offset: -96,
        duration: 1.4,
        easing: (t: number) => 1 - Math.pow(1 - t, 4),
      });
    } else {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const preset = SHOWCASE_PRESETS[activePresetIdx] || SHOWCASE_PRESETS[0];

  // Selecting a preset card updates the preview AND loads that preset into the studio store
  const handleSelectPreset = (idx: number) => {
    setActivePresetIdx(idx);
    const chosen = SHOWCASE_PRESETS[idx];
    if (chosen) {
      applyShowcasePresetToStudio(chosen);
    }
  };

  // Clicking the showcase bouquet or "Customize in Studio →" applies the active preset and opens the studio
  const handleCustomizePresetInStudio = () => {
    applyShowcasePresetToStudio(preset);
    onStartCrafting();
  };

  const handleUnwrapShowcaseEntry = (entry: ShowcaseBouquetEntry, fromCreationsPage = false) => {
    applyShowcaseEntryToStudio(entry);
    if (onPreviewShowcaseBouquet) {
      onPreviewShowcaseBouquet(fromCreationsPage);
    }
  };

  const handleCopyStudioEmail = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(OFFICIAL_STUDIO_EMAIL).catch(() => {});
    }
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2400);
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isContactSending) return;
    setContactError(null);
    setIsContactSending(true);

    const result = await submitContactNote({
      topic: contactTopic,
      name: contactName,
      replyToEmail: contactEmail,
      message: contactMessage,
    });

    setIsContactSending(false);
    if (!result.ok) {
      setContactError(result.error || 'Could not send your note right now.');
      return;
    }

    setSentTopicLabel(result.topicLabel);
    setSentConfirmationEmail(result.confirmationRecipient);
    setIsContactSent(true);
  };

  const scrollToTop = () => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, {
        duration: 1.3,
        easing: (t: number) => 1 - Math.pow(1 - t, 4),
      });
    } else if (scrollWrapperRef.current) {
      scrollWrapperRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div
      ref={scrollWrapperRef}
      className={`animate-landing-view-enter fixed inset-0 z-50 overflow-y-auto overflow-x-hidden transition-[background-color,color] duration-300 ease-out selection:bg-[#7A4B3A]/15 ${
        isDarkMode ? 'bg-[#2B2321] text-[#FBF6F1]' : 'bg-[#FDF9F5] text-[#231C18]'
      }`}
      style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        fontVariantNumeric: 'lining-nums',
      }}
    >
      {/* Fluid Water-Like Keyframes, Smooth Theme Transitions & View Switch Animations */}
      <style>{`
        @keyframes landingViewEnter {
          0% { opacity: 0; transform: scale(0.99) translate3d(0, 6px, 0); }
          100% { opacity: 1; transform: scale(1) translate3d(0, 0, 0); }
        }
        @keyframes themeIconSpring {
          0% { opacity: 0.4; transform: rotate(-75deg) scale(0.65); }
          100% { opacity: 1; transform: rotate(0deg) scale(1); }
        }
        .animate-landing-view-enter {
          animation: landingViewEnter 0.42s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .animate-theme-icon {
          animation: themeIconSpring 0.48s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes fluidFloatA {
          0%, 100% { transform: translate3d(0, 0px, 0) rotate(-3deg); }
          50% { transform: translate3d(0, -6px, 0) rotate(-1.5deg); }
        }
        @keyframes fluidFloatB {
          0%, 100% { transform: translate3d(0, 0px, 0) rotate(3deg); }
          50% { transform: translate3d(0, -7px, 0) rotate(1.5deg); }
        }
        @keyframes fluidBouquetBreathe {
          0%, 100% { transform: translate3d(0, 0px, 0) scale(1); }
          50% { transform: translate3d(0, -5px, 0) scale(1.012); }
        }
        @keyframes fluidHeroEntrance {
          0% { opacity: 0; transform: translate3d(0, 22px, 0); }
          100% { opacity: 1; transform: translate3d(0, 0, 0); }
        }
        .animate-fluid-badge-left {
          animation: fluidFloatA 6s cubic-bezier(0.45, 0, 0.55, 1) infinite;
        }
        .animate-fluid-badge-right {
          animation: fluidFloatB 6.8s cubic-bezier(0.45, 0, 0.55, 1) infinite;
        }
        .animate-fluid-bouquet {
          animation: fluidBouquetBreathe 5.4s cubic-bezier(0.45, 0, 0.55, 1) infinite;
        }
        .animate-hero-entrance {
          animation: fluidHeroEntrance 0.85s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .animate-hero-entrance-delayed {
          animation: fluidHeroEntrance 0.95s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both;
        }
        .fluid-scroll-item {
          opacity: 0;
          transform: translate3d(0, 24px, 0);
          transition:
            opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1),
            transform 0.9s cubic-bezier(0.16, 1, 0.3, 1),
            background-color 0.5s cubic-bezier(0.22, 1, 0.36, 1),
            border-color 0.5s cubic-bezier(0.22, 1, 0.36, 1),
            color 0.5s cubic-bezier(0.22, 1, 0.36, 1);
          will-change: opacity, transform;
        }
        .fluid-scroll-item[data-revealed="true"] {
          opacity: 1;
          transform: translate3d(0, 0, 0);
        }
        .fluid-delay-1 { transition-delay: 80ms; }
        .fluid-delay-2 { transition-delay: 160ms; }
        .fluid-delay-3 { transition-delay: 240ms; }
      `}</style>

      {/* STICKY TOP NAVBAR — Integrated Page Header in Hero, Smoothly Transitions to Floating Pill on Scroll */}
      <div
        className={`sticky z-40 pointer-events-none transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isNavScrolled
            ? 'top-2.5 sm:top-3.5 px-2.5 sm:px-5 md:px-6 pt-1 sm:pt-1.5'
            : 'top-0 px-0 pt-0'
        }`}
      >
        <header
          data-testid="landing-navbar"
          data-nav-mode={isNavScrolled ? 'pill' : 'integrated'}
          className={`pointer-events-auto mx-auto flex md:grid md:grid-cols-[1fr_auto_1fr] items-center justify-between gap-2 sm:gap-3 md:gap-4 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isNavScrolled
              ? `max-w-5xl h-12 sm:h-13 md:h-14 px-3 sm:px-4 md:px-6 rounded-full border border-dashed shadow-[0_10px_30px_rgba(64,45,35,0.07)] backdrop-blur-md ${
                  isDarkMode
                    ? 'bg-[#352C29]/94 border-[#5E4E49] text-[#FBF6F1]'
                    : 'bg-[#FFFDF9]/94 border-[#D8C4B4] text-[#231C18]'
                }`
              : `max-w-6xl h-14 sm:h-15 md:h-16 px-4 sm:px-8 rounded-none border-b border-dashed shadow-none backdrop-blur-xs ${
                  isDarkMode
                    ? 'bg-[#2B2321]/80 border-[#4D3F3B]/65 text-[#FBF6F1]'
                    : 'bg-[#FDF9F5]/80 border-[#E6D6C6]/75 text-[#231C18]'
                }`
          }`}
        >
          {/* Zone 1: Brand Wordmark & Official Logo */}
          <button
            type="button"
            onClick={onStartCrafting}
            className="flex items-center gap-2 text-left cursor-pointer group min-w-0 justify-self-start"
          >
            <BrandLogoMark
              className="w-6.5 h-6.5 sm:w-7 sm:h-7 md:w-7.5 md:h-7.5 group-hover:scale-105 transition-transform duration-300 shrink-0"
              isDarkMode={isDarkMode}
            />
            <span
              className="text-[18px] min-[380px]:text-[19px] sm:text-xl md:text-[22px] font-semibold tracking-tight whitespace-nowrap truncate"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Send A Bouquet
            </span>
          </button>

          {/* Zone 2: Center Editorial Navigation Links — Mathematically Centered on Tablet (md: 768px+) & Desktop */}
          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center justify-center gap-5 lg:gap-8 shrink-0 justify-self-center"
          >
            {[
              { id: 'how-it-works', label: 'How It Works' },
              { id: 'showcase', label: 'Showcase' },
              { id: 'faq', label: 'FAQ' },
              { id: 'contact', label: 'Contact' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSection(item.id)}
                className={`group relative py-1 text-[13px] lg:text-[13.5px] font-medium transition-colors duration-300 cursor-pointer whitespace-nowrap shrink-0 ${
                  isDarkMode
                    ? 'text-[#DFCFC6] hover:text-[#FBF6F1]'
                    : 'text-[#5A463B] hover:text-[#7A4B3A]'
                }`}
              >
                <span>{item.label}</span>
                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute left-1/2 -bottom-0.5 h-[1.5px] w-0 -translate-x-1/2 rounded-full transition-all duration-300 group-hover:w-4/5 ${
                    isDarkMode ? 'bg-[#E6B89C]' : 'bg-[#7A4B3A]'
                  }`}
                />
              </button>
            ))}
          </nav>

          {/* Zone 3: Right Controls — Icon-Only Theme Toggle, Saved Bouquets & Mobile Menu Trigger */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 justify-self-end">
            <button
              type="button"
              onClick={onToggleDarkMode}
              aria-label="Toggle theme"
              title="Toggle theme"
              className={`w-9 h-9 rounded-full border border-dashed flex items-center justify-center transition-colors duration-300 cursor-pointer shrink-0 ${
                isDarkMode
                  ? 'bg-[#423734]/70 border-[#66554F] text-[#E6B89C] hover:bg-[#4D403C]'
                  : 'bg-[#FAF4EE]/80 border-[#DECBB9] text-[#5C4438] hover:bg-[#F3E9DF]'
              }`}
            >
              <span key={isDarkMode ? 'sun' : 'moon'} className="block animate-theme-icon">
                {isDarkMode ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4" />}
              </span>
            </button>

            <button
              type="button"
              onClick={onOpenVault}
              aria-label="Saved Bouquets"
              title="Saved Bouquets"
              className={`h-9 ${
                vaultCount > 0 ? 'px-3' : 'w-9 justify-center'
              } rounded-full border border-dashed text-xs font-medium inline-flex items-center gap-1 transition-all duration-300 active:scale-95 cursor-pointer shrink-0 ${
                isDarkMode
                  ? 'bg-[#423734] border-[#66554F] text-[#FBF6F1] hover:bg-[#4D403C]'
                  : 'bg-[#FAF4EE] border-[#D8C4B4] text-[#5C4438] hover:bg-[#F3E9DF]'
              }`}
            >
              <Bookmark className="w-4 h-4 text-[#B4846C] shrink-0" />
              {vaultCount > 0 && (
                <span
                  className={`px-1 py-0.2 rounded-full text-[11px] font-semibold tabular-nums ${
                    isDarkMode
                      ? 'text-[#F0C8B0]'
                      : 'text-[#7A4B3A]'
                  }`}
                >
                  {vaultCount}
                </span>
              )}
            </button>

            {/* Mobile & Small Tablet Editorial Menu Trigger (< 768px) — Icon-only button */}
            <button
              type="button"
              onClick={() => setIsMobileNavOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              title={isMobileNavOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileNavOpen}
              data-testid="mobile-nav-trigger"
              className={`md:hidden w-9 h-9 rounded-full border border-dashed inline-flex items-center justify-center transition-all duration-300 active:scale-95 cursor-pointer shrink-0 ${
                isMobileNavOpen
                  ? isDarkMode
                    ? 'bg-[#9A6550] border-[#B47E68] text-white'
                    : 'bg-[#7A4B3A] border-[#7A4B3A] text-white'
                  : isDarkMode
                    ? 'bg-[#423734] border-[#66554F] text-[#FBF6F1] hover:bg-[#4D403C]'
                    : 'bg-[#FAF4EE] border-[#D8C4B4] text-[#5C4438] hover:bg-[#F3E9DF]'
              }`}
            >
              <svg
                viewBox="0 0 18 18"
                className="w-4 h-4 stroke-current"
                fill="none"
                strokeWidth="1.6"
                strokeLinecap="round"
              >
                {isMobileNavOpen ? (
                  <>
                    <path d="M 4.5,4.5 L 13.5,13.5" />
                    <path d="M 13.5,4.5 L 4.5,13.5" />
                  </>
                ) : (
                  <>
                    <path d="M 3,6.25 L 15,6.25" />
                    <path d="M 5.5,11.75 L 15,11.75" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </header>

        {/* Mobile & Small Tablet Editorial Stationery Dropdown Card (< 768px) */}
        {isMobileNavOpen && (
          <nav
            aria-label="Mobile navigation"
            data-testid="mobile-nav-dropdown"
            className={`md:hidden pointer-events-auto mt-2.5 mx-auto max-w-sm rounded-[24px] border border-dashed p-3.5 shadow-[0_18px_42px_rgba(35,28,24,0.16)] backdrop-blur-xl transition-all duration-300 animate-hero-entrance ${
              isDarkMode
                ? 'bg-[#352C29]/96 border-[#5E4E49] text-[#FBF6F1]'
                : 'bg-[#FFFDF9]/98 border-[#D8C4B4] text-[#231C18]'
            }`}
          >
            <div className="flex flex-col divide-y divide-dashed divide-[#DECBB9]/60 dark:divide-[#574843]/70">
              {[
                { id: 'how-it-works', num: '01', title: 'How It Works', sub: 'Pick blooms, wrap & attach a keepsake' },
                { id: 'showcase', num: '02', title: 'Shared Creations', sub: 'Explore bouquets on the lace garland' },
                { id: 'faq', num: '03', title: 'FAQ', sub: 'Voice notes, locks & gift links' },
                { id: 'contact', num: '04', title: 'Get in Touch', sub: 'Write a note or flower wish' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => scrollToSection(item.id)}
                  className={`w-full py-2.5 px-2.5 flex items-center justify-between gap-3 text-left rounded-xl transition-colors cursor-pointer ${
                    isDarkMode ? 'hover:bg-[#433834]/80' : 'hover:bg-[#FAF3EB]'
                  }`}
                >
                  <div className="flex items-baseline gap-2.5 min-w-0">
                    <span
                      className={`text-xs italic shrink-0 ${
                        isDarkMode ? 'text-[#E6B89C]' : 'text-[#8A4B38]'
                      }`}
                      style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                    >
                      {item.num}
                    </span>
                    <div className="min-w-0">
                      <div
                        className="text-base font-semibold leading-tight"
                        style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                      >
                        {item.title}
                      </div>
                      <div
                        className={`text-[11px] truncate ${
                          isDarkMode ? 'text-[#C2B0A6]' : 'text-[#7D6B61]'
                        }`}
                      >
                        {item.sub}
                      </div>
                    </div>
                  </div>
                  <span
                    aria-hidden="true"
                    className={`text-xs shrink-0 ${
                      isDarkMode ? 'text-[#E6B89C]' : 'text-[#7A4B3A]'
                    }`}
                  >
                    →
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-3 pt-2.5 border-t border-dashed border-[#DECBB9]/70 dark:border-[#574843] flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsMobileNavOpen(false);
                  onOpenVault();
                }}
                className={`flex-1 py-2.5 px-3 rounded-full border border-dashed text-xs font-medium inline-flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  isDarkMode
                    ? 'bg-[#423734] border-[#66554F] text-[#FBF6F1]'
                    : 'bg-[#FAF4EE] border-[#D8C4B4] text-[#5C4438]'
                }`}
              >
                <span>Saved Bouquets</span>
                {vaultCount > 0 && (
                  <span className="font-semibold tabular-nums">({vaultCount})</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMobileNavOpen(false);
                  onStartCrafting();
                }}
                className={`flex-1 py-2.5 px-3 rounded-full text-white text-xs font-medium transition cursor-pointer ${
                  isDarkMode
                    ? 'bg-[#9A6550] hover:bg-[#875642]'
                    : 'bg-[#7A4B3A] hover:bg-[#633B2C]'
                }`}
              >
                Craft a Bouquet
              </button>
            </div>
          </nav>
        )}
      </div>

      {/* DEPTH-OF-FIELD FOREGROUND CAMERA-LENS PETALS
          Large out-of-focus wind-swept petals framing the outer screen edges that part outward & fade away on scroll */}
      <div
        aria-hidden="true"
        className="pointer-events-none select-none fixed inset-0 z-20 overflow-hidden"
      >
        {/* Foreground Lens Petal 01 — Large Lower-Left Screen Edge */}
        <div
          ref={fgPetalLeftRef}
          data-testid="dof-petal-left"
          className="absolute -left-10 sm:-left-14 md:-left-16 bottom-[3%] w-56 h-40 sm:w-76 sm:h-52 md:w-92 md:h-64"
          style={{
            opacity: isDarkMode ? 0.42 : 0.62,
            transform: 'translate3d(0px, 0px, 0) rotate(-10deg) scale(1.08)',
            filter: 'blur(13px)',
            willChange: 'transform, opacity',
          }}
        >
          <svg
            viewBox="0 0 220 150"
            className="w-full h-full overflow-visible animate-fluid-badge-left"
          >
            <defs>
              <linearGradient id="dof-lens-petal-blush" x1="12%" y1="82%" x2="88%" y2="14%">
                <stop
                  offset="0%"
                  stopColor={isDarkMode ? '#D97B98' : '#F49AB9'}
                  stopOpacity={isDarkMode ? '0.68' : '0.82'}
                />
                <stop
                  offset="55%"
                  stopColor={isDarkMode ? '#F2ACC2' : '#FBD0DF'}
                  stopOpacity={isDarkMode ? '0.54' : '0.72'}
                />
                <stop
                  offset="100%"
                  stopColor={isDarkMode ? '#FCE0E9' : '#FFF4F8'}
                  stopOpacity="0.28"
                />
              </linearGradient>
            </defs>
            <path
              d="M 18,128 C 48,72 112,48 194,16 C 206,62 184,116 128,134 C 82,146 42,138 18,128 Z"
              fill="url(#dof-lens-petal-blush)"
            />
            <path
              d="M 28,122 Q 112,92 184,26"
              fill="none"
              stroke={isDarkMode ? '#FAD2DF' : '#FFF7FA'}
              strokeWidth="2.4"
              strokeOpacity="0.55"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Foreground Lens Petal 02 — Large Upper-Right Screen Edge (Below Navbar) */}
        <div
          ref={fgPetalRightRef}
          data-testid="dof-petal-right"
          className="absolute -right-10 sm:-right-14 md:-right-16 top-[11%] w-60 h-44 sm:w-80 sm:h-56 md:w-96 md:h-68"
          style={{
            opacity: isDarkMode ? 0.38 : 0.56,
            transform: 'translate3d(0px, 0px, 0) rotate(-6deg) scale(1.12)',
            filter: 'blur(15px)',
            willChange: 'transform, opacity',
          }}
        >
          <svg
            viewBox="0 0 220 150"
            className="w-full h-full overflow-visible animate-fluid-badge-right"
          >
            <defs>
              <linearGradient id="dof-lens-petal-peach" x1="15%" y1="80%" x2="88%" y2="16%">
                <stop
                  offset="0%"
                  stopColor={isDarkMode ? '#DF8E7A' : '#F5A99C'}
                  stopOpacity={isDarkMode ? '0.64' : '0.78'}
                />
                <stop
                  offset="58%"
                  stopColor={isDarkMode ? '#F4BBA8' : '#FCD5CC'}
                  stopOpacity={isDarkMode ? '0.50' : '0.68'}
                />
                <stop
                  offset="100%"
                  stopColor={isDarkMode ? '#FDE6DE' : '#FFF6F2'}
                  stopOpacity="0.24"
                />
              </linearGradient>
            </defs>
            <path
              d="M 18,128 C 48,72 112,48 194,16 C 206,62 184,116 128,134 C 82,146 42,138 18,128 Z"
              fill="url(#dof-lens-petal-peach)"
            />
            <path
              d="M 28,122 Q 112,92 184,26"
              fill="none"
              stroke={isDarkMode ? '#FDE2D6' : '#FFFDF9'}
              strokeWidth="2.4"
              strokeOpacity="0.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {/* LENIS SMOOTH SCROLL CONTENT ROOT */}
      <div ref={scrollContentRef} className="w-full">
        {/* 2. FULL-SCREEN LUXURY HERO — Grand Background Bloom, Clear 1-2-3 Typographic Hierarchy & Stationery CTAs */}
        <section className="relative min-h-[88svh] sm:min-h-[88svh] flex flex-col items-center justify-center px-4 sm:px-8 pt-8 sm:pt-12 pb-14 sm:pb-20">
          {/* Seamless GPU Radial Aura Centered Behind the Bloom */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 w-[560px] sm:w-[1040px] h-[500px] sm:h-[680px] rounded-full"
            style={{
              background: isDarkMode
                ? 'radial-gradient(closest-side at 50% 46%, rgba(164, 96, 116, 0.24) 0%, rgba(112, 82, 126, 0.10) 46%, rgba(43, 35, 33, 0) 86%)'
                : 'radial-gradient(closest-side at 50% 46%, rgba(250, 210, 225, 0.54) 0%, rgba(235, 220, 250, 0.24) 46%, rgba(253, 249, 245, 0) 86%)',
            }}
          />

          {/* SCROLL-LINKED WATERCOLOR & COLORED BOTANICAL LINEART BLOOMING FLOWER
              Positioned as a botanical crest behind the headline with a soft center parchment veil for effortless text contrast */}
          <div
            ref={bloomRootRef}
            aria-hidden="true"
            className="pointer-events-none select-none absolute left-1/2 top-[43%] sm:top-[44%] mt-8 z-0 w-[450px] sm:w-[720px] md:w-[820px] h-[310px] sm:h-[470px] md:h-[540px]"
            style={{
              marginTop: '2rem',
              opacity: isDarkMode ? 0.72 : 0.88,
              transform: 'translate3d(-50%, -63%, 0) scale(1.02)',
              willChange: 'transform, opacity',
            }}
          >
            <svg
              viewBox="0 0 520 340"
              className="w-full h-full overflow-visible"
            >
              <defs>
                {/* Soft Watercolor Wash Gradients */}
                <radialGradient id="wc-petal-blush" cx="50%" cy="35%" r="65%">
                  <stop offset="0%" stopColor={isDarkMode ? '#F4A6BE' : '#FCE4EC'} stopOpacity={isDarkMode ? '0.32' : '0.64'} />
                  <stop offset="55%" stopColor={isDarkMode ? '#D9829B' : '#F8BBD0'} stopOpacity={isDarkMode ? '0.20' : '0.38'} />
                  <stop offset="100%" stopColor={isDarkMode ? '#8E4A5E' : '#F48FB1'} stopOpacity="0.04" />
                </radialGradient>
                <radialGradient id="wc-petal-peach" cx="50%" cy="30%" r="65%">
                  <stop offset="0%" stopColor={isDarkMode ? '#F7C5A8' : '#FFF0E6'} stopOpacity={isDarkMode ? '0.32' : '0.66'} />
                  <stop offset="60%" stopColor={isDarkMode ? '#E09878' : '#FCD5CE'} stopOpacity={isDarkMode ? '0.18' : '0.38'} />
                  <stop offset="100%" stopColor={isDarkMode ? '#9A5B42' : '#F9B4AB'} stopOpacity="0.03" />
                </radialGradient>
                <radialGradient id="wc-leaf-sage" cx="50%" cy="50%" r="60%">
                  <stop offset="0%" stopColor={isDarkMode ? '#86B898' : '#E2F2E8'} stopOpacity={isDarkMode ? '0.26' : '0.58'} />
                  <stop offset="70%" stopColor={isDarkMode ? '#5E8E70' : '#C5E3D0'} stopOpacity={isDarkMode ? '0.14' : '0.28'} />
                  <stop offset="100%" stopColor="#6B9B7C" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="wc-center-gold" cx="50%" cy="50%" r="55%">
                  <stop offset="0%" stopColor="#FDE68A" stopOpacity={isDarkMode ? '0.38' : '0.62'} />
                  <stop offset="65%" stopColor="#F59E0B" stopOpacity={isDarkMode ? '0.14' : '0.20'} />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                </radialGradient>
                {/* Soft Parchment Readability Halo Over Center & Lower Petal Zone */}
                <radialGradient id="wc-text-readability-veil" cx="50%" cy="54%" r="52%">
                  <stop offset="0%" stopColor={isDarkMode ? '#2B2321' : '#FDF9F5'} stopOpacity={isDarkMode ? '0.68' : '0.72'} />
                  <stop offset="58%" stopColor={isDarkMode ? '#2B2321' : '#FDF9F5'} stopOpacity={isDarkMode ? '0.36' : '0.42'} />
                  <stop offset="100%" stopColor={isDarkMode ? '#2B2321' : '#FDF9F5'} stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* 1. Botanical Leaf Sprigs & Delicate Colored Lineart Tendrils (Spreads outward on scroll) */}
              <g ref={bloomBotanicalLeavesRef} transform="translate(260, 170) scale(0.96, 0.96)">
                {/* Left Watercolor Leaf & Lineart Veins */}
                <path
                  d="M -55,10 C -115,-28 -175,-18 -212,18 C -170,48 -110,44 -55,10 Z"
                  fill="url(#wc-leaf-sage)"
                  stroke={isDarkMode ? '#8AB89A' : '#7AA387'}
                  strokeWidth="1.2"
                  strokeOpacity={isDarkMode ? '0.55' : '0.65'}
                />
                <path
                  d="M -60,10 Q -135,4 -198,17 M -115,7 L -138,-6 M -145,10 L -168,0 M -125,11 L -148,24"
                  fill="none"
                  stroke={isDarkMode ? '#8AB89A' : '#6A9478'}
                  strokeWidth="0.9"
                  strokeLinecap="round"
                  strokeOpacity={isDarkMode ? '0.48' : '0.56'}
                />
                {/* Left Upper Bud & Thin Rope Tendril */}
                <path
                  d="M -75,-18 C -128,-58 -168,-54 -194,-32"
                  fill="none"
                  stroke={isDarkMode ? '#D8A48F' : '#C28C7A'}
                  strokeWidth="1.05"
                  strokeDasharray="3 3"
                  strokeLinecap="round"
                  strokeOpacity="0.58"
                />
                <path
                  d="M -194,-32 C -210,-46 -222,-32 -206,-22 C -196,-16 -190,-24 -194,-32 Z"
                  fill="url(#wc-petal-blush)"
                  stroke={isDarkMode ? '#E49EB3' : '#C97A90'}
                  strokeWidth="1.1"
                />

                {/* Right Watercolor Leaf & Lineart Veins */}
                <path
                  d="M 55,10 C 115,-28 175,-18 212,18 C 170,48 110,44 55,10 Z"
                  fill="url(#wc-leaf-sage)"
                  stroke={isDarkMode ? '#8AB89A' : '#7AA387'}
                  strokeWidth="1.2"
                  strokeOpacity={isDarkMode ? '0.55' : '0.65'}
                />
                <path
                  d="M 60,10 Q 135,4 198,17 M 115,7 L 138,-6 M 145,10 L 168,0 M 125,11 L 148,24"
                  fill="none"
                  stroke={isDarkMode ? '#8AB89A' : '#6A9478'}
                  strokeWidth="0.9"
                  strokeLinecap="round"
                  strokeOpacity={isDarkMode ? '0.48' : '0.56'}
                />
                {/* Right Upper Bud & Thin Rope Tendril */}
                <path
                  d="M 75,-18 C 128,-58 168,-54 194,-32"
                  fill="none"
                  stroke={isDarkMode ? '#D8A48F' : '#C28C7A'}
                  strokeWidth="1.05"
                  strokeDasharray="3 3"
                  strokeLinecap="round"
                  strokeOpacity="0.58"
                />
                <path
                  d="M 194,-32 C 210,-46 222,-32 206,-22 C 196,-16 190,-24 194,-32 Z"
                  fill="url(#wc-petal-blush)"
                  stroke={isDarkMode ? '#E49EB3' : '#C97A90'}
                  strokeWidth="1.1"
                />
              </g>

              {/* 2. Outer Ring of 8 Watercolor + Colored Lineart Peony Petals */}
              <g ref={bloomOuterRingRef} transform="translate(260, 170) rotate(0) scale(0.94)">
                {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                  <g key={`outer-petal-${angle}`} transform={`rotate(${angle})`}>
                    <path
                      d="M 0,0 C -38,-34 -52,-98 0,-126 C 52,-98 38,-34 0,0 Z"
                      fill="url(#wc-petal-blush)"
                      stroke={isDarkMode ? '#E5A3B7' : '#CD7E95'}
                      strokeWidth="1.2"
                      strokeOpacity={isDarkMode ? '0.56' : '0.66'}
                    />
                    <path
                      d="M 0,-14 Q -12,-62 -6,-106 M 0,-18 Q 12,-62 6,-106 M 0,-10 L 0,-114"
                      fill="none"
                      stroke={isDarkMode ? '#DF9BB0' : '#C67B91'}
                      strokeWidth="0.7"
                      strokeLinecap="round"
                      strokeOpacity={isDarkMode ? '0.38' : '0.44'}
                    />
                  </g>
                ))}
              </g>

              {/* 3. Middle Ring of 8 Peach-Blush Cupped Petals (Counter-rotates & unfolds on scroll) */}
              <g ref={bloomMidRingRef} transform="translate(260, 170) rotate(0) scale(0.86)">
                {[22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((angle) => (
                  <g key={`mid-petal-${angle}`} transform={`rotate(${angle})`}>
                    <path
                      d="M 0,0 C -28,-26 -38,-74 0,-94 C 38,-74 28,-26 0,0 Z"
                      fill="url(#wc-petal-peach)"
                      stroke={isDarkMode ? '#E8B298' : '#C88A74'}
                      strokeWidth="1.1"
                      strokeOpacity={isDarkMode ? '0.58' : '0.68'}
                    />
                    <path
                      d="M 0,-12 Q -8,-48 -3,-78 M 0,-12 Q 8,-48 3,-78"
                      fill="none"
                      stroke={isDarkMode ? '#E2A88B' : '#B87B65'}
                      strokeWidth="0.65"
                      strokeLinecap="round"
                      strokeOpacity="0.42"
                    />
                  </g>
                ))}
              </g>

              {/* 4. Inner Corolla & Golden Botanical Stamens */}
              <g ref={bloomInnerCorollaRef} transform="translate(260, 170) rotate(0) scale(0.82)">
                {[0, 60, 120, 180, 240, 300].map((angle) => (
                  <path
                    key={`inner-petal-${angle}`}
                    transform={`rotate(${angle})`}
                    d="M 0,0 C -18,-16 -22,-46 0,-58 C 22,-46 18,-16 0,0 Z"
                    fill="url(#wc-petal-blush)"
                    stroke={isDarkMode ? '#F0B6C8' : '#C4748B'}
                    strokeWidth="1.05"
                    strokeOpacity="0.62"
                  />
                ))}
                <circle cx="0" cy="0" r="24" fill="url(#wc-center-gold)" />
                {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
                  <g key={`stamen-${deg}`} transform={`rotate(${deg})`}>
                    <line
                      x1="0"
                      y1="-4"
                      x2="0"
                      y2="-20"
                      stroke={isDarkMode ? '#FCD34D' : '#D97706'}
                      strokeWidth="1"
                      strokeOpacity="0.58"
                      strokeLinecap="round"
                    />
                    <circle
                      cx="0"
                      cy="-21.5"
                      r="2"
                      fill={isDarkMode ? '#FDE68A' : '#F59E0B'}
                      fillOpacity="0.72"
                    />
                  </g>
                ))}
                <circle
                  cx="0"
                  cy="0"
                  r="6.5"
                  fill={isDarkMode ? '#FDE68A' : '#FEF3C7'}
                  stroke={isDarkMode ? '#F59E0B' : '#D97706'}
                  strokeWidth="1.05"
                  strokeOpacity="0.68"
                />
              </g>

              {/* 5. Soft Readability Veil Over Inner Corolla & Lower Petal Zone so Typography & Buttons Stand Out Clearly */}
              <ellipse
                cx="260"
                cy="205"
                rx="235"
                ry="125"
                fill="url(#wc-text-readability-veil)"
              />
            </svg>
          </div>

          {/* Centered Editorial Focal Block — Clear 1 -> 2 -> 3 Visual Hierarchy */}
          <div className="relative z-10 max-w-3xl mx-auto text-center animate-hero-entrance px-3 mt-4 sm:mt-8">
            {/* 1. Primary Display Lockup — Stacked 2-Line Couture Composition (Send Love in / Every Bloom.) */}
            <h1
              className="mx-auto select-none"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              <span
                className={`block whitespace-nowrap text-[48px] min-[390px]:text-[52px] sm:text-[62px] md:text-[70px] lg:text-[76px] font-medium tracking-[-0.02em] leading-[0.96] transition-colors ${
                  isDarkMode ? 'text-[#FBF6F1]' : 'text-[#231C18]'
                }`}
              >
                Send Love in{' '}
              </span>
              <span
                className={`block whitespace-nowrap mt-0.5 sm:mt-1 text-[56px] min-[390px]:text-[60px] sm:text-[74px] md:text-[86px] lg:text-[94px] italic font-normal tracking-[-0.015em] leading-[0.92] transition-colors ${
                  isDarkMode ? 'text-[#E6B89C]' : 'text-[#8A4B38]'
                }`}
              >
                Every Bloom.
              </span>
            </h1>

            {/* Delicate Fine-Line Botanical Divider Separating Display Headline from Supporting Deck */}
            <div
              aria-hidden="true"
              className="mt-5 sm:mt-6 flex items-center justify-center gap-2.5 opacity-65"
            >
              <span
                className={`h-px w-8 sm:w-12 border-t border-dashed ${
                  isDarkMode ? 'border-[#8A7267]' : 'border-[#C8B09B]'
                }`}
              />
              <span
                className={`w-1.5 h-1.5 rotate-45 border ${
                  isDarkMode
                    ? 'border-[#E6B89C] bg-[#352C29]'
                    : 'border-[#9E4757] bg-[#FFFDF9]'
                }`}
              />
              <span
                className={`h-px w-8 sm:w-12 border-t border-dashed ${
                  isDarkMode ? 'border-[#8A7267]' : 'border-[#C8B09B]'
                }`}
              />
            </div>

            {/* 2. Supporting Editorial Subtitle — Crisp Contrast & Scannable Measure */}
            <p
              className={`mt-4 sm:mt-5 text-[19px] sm:text-[21.5px] md:text-[23px] max-w-[330px] sm:max-w-[470px] md:max-w-[530px] mx-auto leading-[1.42] font-normal px-2 transition-colors ${
                isDarkMode ? 'text-[#EAE0DA]' : 'text-[#3E3029]'
              }`}
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Pick your flowers, <span className="italic font-medium">wrap with love</span>, and attach a little voice note or letter.
            </p>

            {/* 3. Action Hierarchy — Unmistakable Primary Studio Button + Lighter Secondary Pill */}
            <div className="mt-7 sm:mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-3.5">
              <button
                type="button"
                onClick={onStartCrafting}
                className={`group px-7 sm:px-9 py-3.5 sm:py-4 rounded-full text-[#FFFDF9] text-[13px] sm:text-[14px] font-medium inline-flex items-center gap-2 ring-1 ring-inset ring-[#FFFDF9]/25 shadow-[0_12px_28px_rgba(110,68,52,0.24)] hover:shadow-[0_16px_34px_rgba(110,68,52,0.32)] transition-all duration-300 hover:-translate-y-0.5 active:scale-95 cursor-pointer whitespace-nowrap ${
                  isDarkMode
                    ? 'bg-[#9A6550] hover:bg-[#875642]'
                    : 'bg-[#6E4434] hover:bg-[#5B3729]'
                }`}
              >
                <span>Craft a Bouquet</span>
                <span
                  aria-hidden="true"
                  className="text-sm leading-none transition-transform duration-300 group-hover:translate-x-0.5"
                >
                  →
                </span>
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('how-it-works')}
                className={`px-6 sm:px-7 py-3.5 sm:py-4 rounded-full border border-dashed text-[13px] sm:text-[13.5px] font-medium backdrop-blur-xs transition-all duration-300 active:scale-95 cursor-pointer whitespace-nowrap ${
                  isDarkMode
                    ? 'bg-[#352C29]/80 border-[#66554F] text-[#DFCFC6] hover:text-[#FBF6F1] hover:bg-[#423734]'
                    : 'bg-[#FFFDF9]/85 border-[#D8C4B4] text-[#5C483E] hover:text-[#231C18] hover:bg-[#FAF4EE]'
                }`}
              >
                See How It Works
              </button>
            </div>
          </div>
        </section>

        <ThinRopeLaceDivider isDarkMode={isDarkMode} />

        {/* 3. CLEAN EDITORIAL 3-CARD "HOW IT WORKS" SECTION (Informational Only — No Redirect on Click) */}
        <section
          id="how-it-works"
          className="scroll-mt-24 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-10 sm:pb-12"
        >
          <div className="fluid-scroll-item text-center mb-6 sm:mb-8">
            <h2
              className={`text-3xl sm:text-4xl font-semibold ${
                isDarkMode ? 'text-[#FBF6F1]' : 'text-[#1F1815]'
              }`}
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              How It Works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 lg:gap-7 max-w-md md:max-w-none mx-auto">
            {/* STEP 01: Pick & Wrap */}
            <div
              data-testid="how-it-works-card-1"
              className={`fluid-scroll-item fluid-delay-1 rounded-[22px] sm:rounded-[24px] border border-dashed overflow-hidden flex flex-col transition-colors duration-300 select-none ${
                isDarkMode
                  ? 'bg-[#352C29] border-[#574843] shadow-[0_12px_30px_rgba(20,15,13,0.22)]'
                  : 'bg-[#FFFDF9] border-[#DECBB9] shadow-[0_12px_30px_rgba(122,75,58,0.05)]'
              }`}
            >
              <div
                className={`h-38 sm:h-44 w-full relative flex items-center justify-center overflow-hidden border-b border-dashed ${
                  isDarkMode
                    ? 'bg-[#241D1B] border-[#4E403B]'
                    : 'bg-[#EDE2D4] border-[#DECBB9]'
                }`}
              >
                <span
                  className={`absolute top-2.5 left-3 sm:top-3 sm:left-3.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold tracking-wider border border-dashed ${
                    isDarkMode
                      ? 'bg-[#352C29] border-[#5E4E49] text-[#E6B89C]'
                      : 'bg-[#FFFDF9]/95 border-[#D8C4B4] text-[#7A5C4B]'
                  }`}
                >
                  01
                </span>
                <div className="w-full h-full flex items-center justify-center p-2">
                  <StepOneSceneSVG />
                </div>
              </div>

              <div className="px-4 py-4 sm:px-5 sm:py-5 text-center flex-1 flex flex-col justify-center">
                <h3
                  className={`text-xl sm:text-2xl font-semibold ${
                    isDarkMode ? 'text-[#FBF6F1]' : 'text-[#1F1815]'
                  }`}
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                >
                  Pick &amp; Wrap
                </h3>
                <p
                  className={`text-[13px] sm:text-[13.5px] mt-1 leading-relaxed ${
                    isDarkMode ? 'text-[#D8C7BE]' : 'text-[#6E5D54]'
                  }`}
                >
                  Arrange 31 blooms into couture wraps, velvet hatboxes &amp; lace bows.
                </p>
              </div>
            </div>

            {/* STEP 02: Voice & Note */}
            <div
              data-testid="how-it-works-card-2"
              className={`fluid-scroll-item fluid-delay-2 rounded-[22px] sm:rounded-[24px] border border-dashed overflow-hidden flex flex-col transition-colors duration-300 select-none ${
                isDarkMode
                  ? 'bg-[#352C29] border-[#574843] shadow-[0_12px_30px_rgba(20,15,13,0.22)]'
                  : 'bg-[#FFFDF9] border-[#DECBB9] shadow-[0_12px_30px_rgba(122,75,58,0.05)]'
              }`}
            >
              <div
                className={`h-38 sm:h-44 w-full relative flex items-center justify-center overflow-hidden border-b border-dashed ${
                  isDarkMode
                    ? 'bg-[#241D1B] border-[#4E403B]'
                    : 'bg-[#EDE2D4] border-[#DECBB9]'
                }`}
              >
                <span
                  className={`absolute top-2.5 left-3 sm:top-3 sm:left-3.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold tracking-wider border border-dashed ${
                    isDarkMode
                      ? 'bg-[#352C29] border-[#5E4E49] text-[#E6B89C]'
                      : 'bg-[#FFFDF9]/95 border-[#D8C4B4] text-[#7A5C4B]'
                  }`}
                >
                  02
                </span>
                <div className="w-full h-full flex items-center justify-center p-2">
                  <StepTwoSceneSVG />
                </div>
              </div>

              <div className="px-4 py-4 sm:px-5 sm:py-5 text-center flex-1 flex flex-col justify-center">
                <h3
                  className={`text-xl sm:text-2xl font-semibold ${
                    isDarkMode ? 'text-[#FBF6F1]' : 'text-[#1F1815]'
                  }`}
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                >
                  Voice &amp; Note
                </h3>
                <p
                  className={`text-[13px] sm:text-[13.5px] mt-1 leading-relaxed ${
                    isDarkMode ? 'text-[#D8C7BE]' : 'text-[#6E5D54]'
                  }`}
                >
                  Tuck in a handwritten letter and record a voice keepsake.
                </p>
              </div>
            </div>

            {/* STEP 03: Send or Time-Lock */}
            <div
              data-testid="how-it-works-card-3"
              className={`fluid-scroll-item fluid-delay-3 rounded-[22px] sm:rounded-[24px] border border-dashed overflow-hidden flex flex-col transition-colors duration-300 select-none ${
                isDarkMode
                  ? 'bg-[#352C29] border-[#574843] shadow-[0_12px_30px_rgba(20,15,13,0.22)]'
                  : 'bg-[#FFFDF9] border-[#DECBB9] shadow-[0_12px_30px_rgba(122,75,58,0.05)]'
              }`}
            >
              <div
                className={`h-38 sm:h-44 w-full relative flex items-center justify-center overflow-hidden border-b border-dashed ${
                  isDarkMode
                    ? 'bg-[#241D1B] border-[#4E403B]'
                    : 'bg-[#EDE2D4] border-[#DECBB9]'
                }`}
              >
                <span
                  className={`absolute top-2.5 left-3 sm:top-3 sm:left-3.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold tracking-wider border border-dashed ${
                    isDarkMode
                      ? 'bg-[#352C29] border-[#5E4E49] text-[#E6B89C]'
                      : 'bg-[#FFFDF9]/95 border-[#D8C4B4] text-[#7A5C4B]'
                  }`}
                >
                  03
                </span>
                <div className="w-full h-full flex items-center justify-center p-2">
                  <StepThreeSceneSVG />
                </div>
              </div>

              <div className="px-4 py-4 sm:px-5 sm:py-5 text-center flex-1 flex flex-col justify-center">
                <h3
                  className={`text-xl sm:text-2xl font-semibold ${
                    isDarkMode ? 'text-[#FBF6F1]' : 'text-[#1F1815]'
                  }`}
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                >
                  Send or Time-Lock
                </h3>
                <p
                  className={`text-[13px] sm:text-[13.5px] mt-1 leading-relaxed ${
                    isDarkMode ? 'text-[#D8C7BE]' : 'text-[#6E5D54]'
                  }`}
                >
                  Share an instant gift link, date countdown or secret key lock.
                </p>
              </div>
            </div>
          </div>
        </section>

        <ThinRopeLaceDivider isDarkMode={isDarkMode} />

        {/* 3B. SHARED CREATIONS LACE GARLAND SHOWCASE (4 Limited PNG-Style Creations Moving Right-to-Left with Lenis Scroll + CTA to Dedicated Single-Lace Page) */}
        <HeroLaceGarlandPreview
          isDarkMode={isDarkMode}
          vaultCount={vaultCount}
          scrollContainerRef={scrollWrapperRef}
          onExploreAllCreations={() => setIsCreationsPageOpen(true)}
          onUnwrapShowcaseBouquet={handleUnwrapShowcaseEntry}
        />

        <ThinRopeLaceDivider isDarkMode={isDarkMode} />

        {/* 4. CENTERED FAQ CARD STACK (No Eyebrow) */}
        <section
          id="faq"
          className="scroll-mt-24 max-w-2xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10 pb-10 sm:pb-12"
        >
          <div className="fluid-scroll-item text-center mb-6 sm:mb-8">
            <h2
              className={`text-3xl sm:text-4xl font-semibold ${
                isDarkMode ? 'text-[#FBF6F1]' : 'text-[#1F1815]'
              }`}
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Frequently Asked Questions
            </h2>
          </div>

          <div className="fluid-scroll-item fluid-delay-1 space-y-2.5 sm:space-y-3">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaqIdx === idx;
              return (
                <div
                  key={idx}
                  className={`rounded-2xl border transition-all duration-300 ${
                    isDarkMode
                      ? 'bg-[#352C29] border-[#4D403C]'
                      : 'bg-white border-[#F0E7DE] shadow-[0_4px_16px_rgba(35,28,24,0.03)]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                    className="w-full px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between gap-3 sm:gap-4 text-left cursor-pointer"
                  >
                    <span
                      className={`text-[13px] sm:text-sm font-semibold ${
                        isDarkMode ? 'text-[#FBF6F1]' : 'text-[#231C18]'
                      }`}
                    >
                      {item.q}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 shrink-0 transition-transform duration-300 ${
                        isDarkMode ? 'text-[#DEB399]' : 'text-[#7A4B3A]'
                      } ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  <div
                    className={`grid transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="px-4 sm:px-6 pb-3.5 sm:pb-4 -mt-0.5">
                        <p
                          className={`text-xs sm:text-[13px] leading-relaxed ${
                            isDarkMode ? 'text-[#D8C7BE]' : 'text-[#6E5D54]'
                          }`}
                        >
                          {item.a}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 5. UNIFIED WARM BEIGE / SOFT COCOA "MAKE SOMEONE SMILE TODAY" BOTTOM CTA CONTAINER */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-2 sm:pt-4 pb-12 sm:pb-14">
          <div
            className={`fluid-scroll-item rounded-[24px] sm:rounded-[28px] border border-dashed py-9 sm:py-14 px-5 sm:px-6 text-center transition-colors ${
              isDarkMode
                ? 'bg-[#382F2C] border-[#5E4E49]'
                : 'bg-[#F3ECE3] border-[#DAC7B6]'
            }`}
          >
            {/* Custom SVG Trio (Cherry Blossom + Voice Plushie Bear + Tulip) */}
            <div className="flex items-center justify-center gap-2.5 sm:gap-3 mb-3.5 sm:mb-4 select-none">
              <div
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full border flex items-center justify-center overflow-hidden shadow-2xs -rotate-6 ${
                  isDarkMode ? 'bg-[#463A36] border-[#5E4F49]' : 'bg-white/95 border-[#E8DDD3]'
                }`}
              >
                <svg viewBox="-58 -58 116 116" className="w-7 h-7 sm:w-8 sm:h-8">
                  <FlowerRenderer type="cherryBlossom" petalColor="#F472B6" centerColor="#FEF08A" hideStem />
                </svg>
              </div>
              <div
                className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full border flex items-center justify-center overflow-hidden shadow-xs -mt-2 [&>svg]:w-8 [&>svg]:h-8 sm:[&>svg]:w-9 sm:[&>svg]:h-9 ${
                  isDarkMode ? 'bg-[#463A36] border-[#5E4F49]' : 'bg-white/95 border-[#E8DDD3]'
                }`}
              >
                <MiniVoiceKeepsakeSVG
                  styleType="plushie"
                  primaryColor="#D6A87C"
                  accentColor="#F43F5E"
                />
              </div>
              <div
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full border flex items-center justify-center overflow-hidden shadow-2xs rotate-6 ${
                  isDarkMode ? 'bg-[#463A36] border-[#5E4F49]' : 'bg-white/95 border-[#E8DDD3]'
                }`}
              >
                <svg viewBox="-58 -58 116 116" className="w-7 h-7 sm:w-8 sm:h-8">
                  <FlowerRenderer type="tulip" petalColor="#FB7185" centerColor="#FEF08A" hideStem />
                </svg>
              </div>
            </div>

            <h2
              className={`text-3xl sm:text-4xl font-semibold tracking-tight ${
                isDarkMode ? 'text-[#FBF6F1]' : 'text-[#1F1815]'
              }`}
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Make someone smile today
            </h2>

            <p
              className={`mt-2 text-xs sm:text-sm max-w-md mx-auto leading-relaxed ${
                isDarkMode ? 'text-[#D8C7BE]' : 'text-[#6E5D54]'
              }`}
            >
              A thoughtful flower gesture that stays fresh forever in their pocket.
            </p>

            <button
              type="button"
              onClick={onStartCrafting}
              className={`mt-5 sm:mt-6 w-full sm:w-auto px-8 py-3.5 rounded-full text-white text-xs sm:text-sm font-medium shadow-sm hover:shadow-md transition-all duration-300 active:scale-95 cursor-pointer ${
                isDarkMode
                  ? 'bg-[#9A6550] hover:bg-[#875642]'
                  : 'bg-[#7A4B3A] hover:bg-[#633B2C]'
              }`}
            >
              Start Crafting Your Bouquet
            </button>
          </div>
        </section>

        {/* DELICATE THIN ROPE LACE DIVIDER BEFORE CONTACT */}
        <ThinRopeLaceDivider isDarkMode={isDarkMode} />

        {/* 6. 2-COLUMN DESKTOP & TABLET/MOBILE-OPTIMIZED STATIONERY CONTACT SECTION
            Minimal, non-text-y editorial column on left + authentic ruled stationery letter paper graphic on right */}
        <section id="contact" className="scroll-mt-24 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 pb-14 sm:pb-20">
          <div className="max-w-xl lg:max-w-none mx-auto grid grid-cols-1 lg:grid-cols-12 gap-y-7 lg:gap-y-0 lg:gap-x-12 items-start">
            {/* BLOCK 1 (Desktop Top-Left, Mobile/Tablet 1st): Concise Get in Touch + Direct Email */}
            <div className="fluid-scroll-item lg:col-span-5 lg:col-start-1 lg:row-start-1 text-center lg:text-left flex flex-col items-center lg:items-start">
              <h2
                className={`text-3xl sm:text-4xl font-semibold tracking-tight ${
                  isDarkMode ? 'text-[#FBF6F1]' : 'text-[#1F1815]'
                }`}
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                Get in Touch
              </h2>

              <p
                className={`mt-1.5 text-xs sm:text-[13.5px] max-w-xs leading-relaxed ${
                  isDarkMode ? 'text-[#D8C7BE]' : 'text-[#6E5D54]'
                }`}
              >
                Feedback, custom flower wishes, or studio help.
              </p>

              <div className="mt-3.5 inline-flex items-center gap-2 flex-wrap justify-center lg:justify-start">
                <a
                  href={`mailto:${OFFICIAL_STUDIO_EMAIL}`}
                  data-testid="official-studio-email-link"
                  className={`text-sm sm:text-[15px] font-medium underline decoration-dashed underline-offset-4 transition-colors ${
                    isDarkMode
                      ? 'text-[#FBF6F1] decoration-[#75625A] hover:text-[#E6B89C]'
                      : 'text-[#231C18] decoration-[#C8B5A6] hover:text-[#7A4B3A]'
                  }`}
                >
                  {OFFICIAL_STUDIO_EMAIL}
                </a>
                <button
                  type="button"
                  onClick={handleCopyStudioEmail}
                  aria-label={`Copy ${OFFICIAL_STUDIO_EMAIL}`}
                  className={`px-2.5 py-0.5 rounded-full border border-dashed text-[10px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    copiedEmail
                      ? isDarkMode
                        ? 'bg-[#463833] border-[#E6B89C] text-[#E6B89C]'
                        : 'bg-[#F3E7DC] border-[#7A4B3A] text-[#7A4B3A]'
                      : isDarkMode
                      ? 'bg-[#352C29] border-[#5E4E49] text-[#D8C7BE] hover:text-[#FBF6F1]'
                      : 'bg-[#FAF5EF] border-[#D8C4B4] text-[#6E5D54] hover:text-[#231C18]'
                  }`}
                >
                  {copiedEmail ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            {/* BLOCK 2 (Desktop Right Column Spanning Both Rows, Mobile/Tablet 2nd): Illustrated Ruled Stationery Note Sheet */}
            <div className="fluid-scroll-item fluid-delay-1 lg:col-span-7 lg:col-start-6 lg:row-start-1 lg:row-span-2 relative mt-2 lg:mt-0 w-full">
              {/* 1. Stacked Back Stationery Sheet & Deckled Paper Shadow */}
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute inset-0 rounded-[20px] sm:rounded-[24px] border border-dashed -rotate-[1.1deg] sm:-rotate-[1.6deg] translate-y-1 sm:translate-y-1.5 scale-[0.99] transition-colors ${
                  isDarkMode ? 'border-[#544540] bg-[#261F1D]/85' : 'border-[#DECBB9] bg-[#EFE4D6]/85'
                }`}
              />

              {/* 2. Washi-Taped Pressed Botanical Flower Sprig at Top Center-Left of the Paper */}
              <svg
                aria-hidden="true"
                viewBox="0 0 150 76"
                className="pointer-events-none select-none absolute -top-5 left-5 sm:-top-6 sm:left-8 w-28 sm:w-34 h-14 sm:h-16 overflow-visible z-20"
              >
                {/* Sage Pressed Leaves */}
                <path
                  d="M 56,42 C 36,30 22,34 26,46 C 30,56 46,52 56,42 Z"
                  fill={isDarkMode ? 'rgba(134, 184, 152, 0.25)' : 'rgba(215, 237, 223, 0.88)'}
                  stroke={isDarkMode ? '#8AB89A' : '#6A9478'}
                  strokeWidth="1.15"
                  strokeLinecap="round"
                />
                <path
                  d="M 68,36 C 84,22 102,24 104,36 C 104,45 84,46 68,36 Z"
                  fill={isDarkMode ? 'rgba(134, 184, 152, 0.25)' : 'rgba(215, 237, 223, 0.88)'}
                  stroke={isDarkMode ? '#8AB89A' : '#6A9478'}
                  strokeWidth="1.15"
                  strokeLinecap="round"
                />
                {/* Delicate Curved Stem */}
                <path
                  d="M 58,40 Q 82,52 114,48"
                  fill="none"
                  stroke={isDarkMode ? '#D8A48F' : '#9C725D'}
                  strokeWidth="1.15"
                  strokeLinecap="round"
                />
                {/* Translucent Kraft Washi Tape Strip with Serrated Edges Holding the Stem */}
                <g transform="translate(82, 39) rotate(-18)">
                  <path
                    d="M -18,-7 L 18,-7 L 16,-4 L 18,-1 L 16,2 L 18,5 L 16,7 L -18,7 L -16,4 L -18,1 L -16,-2 L -18,-5 Z"
                    fill={isDarkMode ? 'rgba(216, 168, 142, 0.28)' : 'rgba(232, 206, 182, 0.72)'}
                    stroke={isDarkMode ? '#A68676' : '#C9AE97'}
                    strokeWidth="0.8"
                  />
                </g>
                {/* Pressed Multi-Layered Blush & Peach Blossom */}
                <g transform="translate(60, 38) scale(0.72)">
                  {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
                    <path
                      key={`outer-${a}`}
                      transform={`rotate(${a})`}
                      d="M 0,0 C -8,-7 -11,-20 0,-25 C 11,-20 8,-7 0,0 Z"
                      fill={isDarkMode ? 'rgba(244, 166, 190, 0.32)' : 'rgba(252, 224, 234, 0.92)'}
                      stroke={isDarkMode ? '#E5A3B7' : '#C87A90'}
                      strokeWidth="1.25"
                    />
                  ))}
                  {[22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((a) => (
                    <path
                      key={`mid-${a}`}
                      transform={`rotate(${a})`}
                      d="M 0,0 C -6,-5 -8,-14 0,-18 C 8,-14 6,-5 0,0 Z"
                      fill={isDarkMode ? 'rgba(251, 207, 184, 0.38)' : 'rgba(254, 229, 208, 0.88)'}
                      stroke={isDarkMode ? '#E5A3B7' : '#C87A90'}
                      strokeWidth="1.05"
                    />
                  ))}
                  <circle
                    cx="0"
                    cy="0"
                    r="4"
                    fill={isDarkMode ? '#FDE68A' : '#FEF3C7'}
                    stroke={isDarkMode ? '#F59E0B' : '#D97706'}
                    strokeWidth="1.15"
                  />
                </g>
              </svg>

              {/* 3. Primary Stationery Note Paper Card (Single Dashed Border + Ruled Lines) */}
              <div
                className={`relative z-10 rounded-[20px] sm:rounded-[24px] border border-dashed p-5 sm:p-7 md:p-8 shadow-[0_14px_38px_rgba(122,75,58,0.06)] text-left transition-colors ${
                  isDarkMode
                    ? 'bg-[#352C29] border-[#5E4E49]'
                    : 'bg-[#FFFDF9] border-[#D8C3B0]'
                }`}
              >
                {/* Top Row of Letter Paper: "Dear Studio," Salutation + Drawn Botanical Brand Crest on the Right */}
                <div className="relative flex items-start justify-between gap-3 mb-2 sm:mb-3 pt-1">
                  <div className="pt-2 sm:pt-3">
                    <span
                      className={`block text-2xl sm:text-[28px] italic font-normal tracking-tight select-none ${
                        isDarkMode ? 'text-[#FBF6F1]' : 'text-[#231C18]'
                      }`}
                      style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                    >
                      Dear Studio,
                    </span>
                  </div>

                  {/* Signature Drawn Botanical Logo Crest (Replaced Postage Stamp per Screenshot) */}
                  <BrandLogoMark
                    variant="crest"
                    isDarkMode={isDarkMode}
                    className="w-24 sm:w-28 h-12 sm:h-14 shrink-0 select-none"
                  />
                </div>

                {isContactSent ? (
                  <div
                    data-testid="contact-sent-confirmation"
                    className="relative py-6 sm:py-8 text-center space-y-3"
                  >
                    {/* Animated Botanical Wax Seal Stamp Emblem */}
                    <div className="mx-auto w-14 h-14 flex items-center justify-center relative">
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 48 48"
                        className="w-14 h-14 select-none drop-shadow-xs transition-transform duration-500 scale-100"
                      >
                        <circle
                          cx="24"
                          cy="24"
                          r="20"
                          fill={isDarkMode ? '#8C4A58' : '#A64B5B'}
                          fillOpacity={isDarkMode ? '0.28' : '0.18'}
                          stroke={isDarkMode ? '#E598A6' : '#9E4757'}
                          strokeWidth="1.35"
                          strokeDasharray="3 2.2"
                        />
                        <circle
                          cx="24"
                          cy="24"
                          r="15"
                          fill={isDarkMode ? '#7A3E4B' : '#9E4757'}
                          fillOpacity={isDarkMode ? '0.32' : '0.12'}
                          stroke={isDarkMode ? '#E598A6' : '#9E4757'}
                          strokeWidth="1"
                        />
                        <path
                          d="M 24,29.5 C 24,29.5 17.5,24.8 17.5,21.2 C 17.5,19.1 19.1,17.6 21.2,17.6 C 22.5,17.6 23.5,18.4 24,19.3 C 24.5,18.4 25.5,17.6 26.8,17.6 C 28.9,17.6 30.5,19.1 30.5,21.2 C 30.5,24.8 24,29.5 24,29.5 Z"
                          fill={isDarkMode ? '#F4B4C0' : '#9E4757'}
                        />
                      </svg>
                    </div>

                    <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full border border-dashed text-[11px] font-medium tracking-wide border-[#C8B5A6] text-[#7A4B3A] dark:border-[#66554F] dark:text-[#E6B89C]">
                      Sealed • {sentTopicLabel}
                    </div>

                    <div
                      className={`text-2xl sm:text-3xl font-semibold ${
                        isDarkMode ? 'text-[#FBF6F1]' : 'text-[#1F1815]'
                      }`}
                      style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                    >
                      Your Note Is on Its Way
                    </div>

                    <p
                      className={`text-xs sm:text-sm max-w-md mx-auto leading-relaxed ${
                        isDarkMode ? 'text-[#D8C7BE]' : 'text-[#6E5D54]'
                      }`}
                    >
                      Thank you for writing{contactName ? `, ${contactName}` : ''}. Your note has been safely received, and I’ll read it soon.
                    </p>

                    {sentConfirmationEmail && (
                      <p
                        data-testid="contact-confirmation-email-notice"
                        className={`text-[11.5px] max-w-sm mx-auto px-3 py-1.5 rounded-xl border border-dashed ${
                          isDarkMode
                            ? 'bg-[#2B2321]/70 border-[#544540] text-[#E6B89C]'
                            : 'bg-[#FAF5EF] border-[#DFCFC0] text-[#7A4B3A]'
                        }`}
                      >
                        A confirmation copy was also sent to <span className="font-medium">{sentConfirmationEmail}</span> from <span className="font-medium">{OFFICIAL_STUDIO_EMAIL}</span>.
                      </p>
                    )}

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsContactSent(false);
                          setContactMessage('');
                          setContactError(null);
                          setSentConfirmationEmail(null);
                        }}
                        className={`inline-block px-5 py-2 rounded-full border border-dashed text-xs font-medium transition cursor-pointer ${
                          isDarkMode
                            ? 'bg-[#423734] border-[#66554F] text-[#FBF6F1] hover:bg-[#4D403C]'
                            : 'bg-[#FAF4EE] border-[#D5C2B4] text-[#5C4438] hover:bg-[#F3E9DF]'
                        }`}
                      >
                        Write another note
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} noValidate className="relative space-y-4">
                    {/* Quick Topic Tags Row */}
                    <div
                      role="group"
                      aria-label="Note topic"
                      className="flex flex-wrap items-center gap-1.5 pb-1"
                    >
                      {CONTACT_TOPICS.map((topicItem) => {
                        const isSelected = contactTopic === topicItem.id;
                        return (
                          <button
                            key={topicItem.id}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => {
                              setContactTopic(topicItem.id);
                              if (contactError) setContactError(null);
                            }}
                            className={`px-3 py-1 rounded-full border border-dashed text-[11px] font-medium transition-all cursor-pointer ${
                              isSelected
                                ? isDarkMode
                                  ? 'bg-[#9A6550] border-[#E6B89C] text-[#FFFDF9] shadow-2xs'
                                  : 'bg-[#7A4B3A] border-[#7A4B3A] text-[#FFFDF9] shadow-2xs'
                                : isDarkMode
                                ? 'bg-[#2B2321]/70 border-[#5E4E49] text-[#D8C7BE] hover:text-[#FBF6F1] hover:border-[#8C766C]'
                                : 'bg-[#FAF5EF]/90 border-[#D8C4B4] text-[#6E5D54] hover:text-[#231C18] hover:border-[#B89F8D]'
                            }`}
                          >
                            {topicItem.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Ruled Stationery Lines Area — Textarea Sits Directly on Illustrated Paper Rules (Zero Boxy Input Border) */}
                    <div className="relative">
                      {/* 4 Illustrated Horizontal Ruled Paper Lines */}
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 top-0 bottom-0 flex flex-col justify-between pt-[33px]"
                      >
                        {[0, 1, 2, 3].map((lineIdx) => (
                          <div
                            key={lineIdx}
                            className={`w-full border-b border-dashed ${
                              isDarkMode ? 'border-[#544641]' : 'border-[#E2D3C4]'
                            }`}
                          />
                        ))}
                      </div>

                      <textarea
                        rows={4}
                        aria-label="Write your note"
                        disabled={isContactSending}
                        value={contactMessage}
                        onChange={(e) => {
                          setContactMessage(e.target.value);
                          if (contactError) setContactError(null);
                        }}
                        placeholder={getContactTopicOption(contactTopic).placeholder}
                        className={`relative z-10 w-full px-1 py-0 bg-transparent border-0 text-[13.5px] sm:text-sm leading-[34px] resize-none focus:outline-none transition-colors disabled:opacity-60 ${
                          isDarkMode
                            ? 'text-[#FBF6F1] placeholder:text-[#9E8C83]'
                            : 'text-[#231C18] placeholder:text-[#9A897E]'
                        }`}
                        style={{ minHeight: '136px' }}
                      />
                    </div>

                    {/* Inline Validation or Network Error Banner with Retry / Direct Email Fallback */}
                    {contactError && (
                      <div
                        role="alert"
                        data-testid="contact-error-banner"
                        className={`px-3.5 py-2.5 rounded-xl border border-dashed text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                          isDarkMode
                            ? 'bg-[#462E32]/70 border-[#A66570] text-[#F9D5DC]'
                            : 'bg-[#FDF2F4] border-[#D99AA5] text-[#7D2E3D]'
                        }`}
                      >
                        <span>{contactError}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={`mailto:${OFFICIAL_STUDIO_EMAIL}?subject=${encodeURIComponent(
                              `[Send A Bouquet • ${getContactTopicOption(contactTopic).label}]`
                            )}&body=${encodeURIComponent(contactMessage)}`}
                            className="underline decoration-dashed underline-offset-2 font-medium whitespace-nowrap"
                          >
                            Email directly
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Bottom Postcard Signature Row: "From:" Underline Fields + Wax-Sealed Send Button */}
                    <div className="pt-2 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="block">
                          <span
                            className={`block text-sm italic ${
                              isDarkMode ? 'text-[#C9B6AC]' : 'text-[#7D6B61]'
                            }`}
                            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                          >
                            From
                          </span>
                          <input
                            type="text"
                            aria-label="Your name"
                            disabled={isContactSending}
                            value={contactName}
                            onChange={(e) => setContactName(e.target.value)}
                            placeholder="Your name"
                            className={`w-full h-8 px-0.5 bg-transparent border-0 border-b border-dashed text-xs sm:text-[13px] focus:outline-none transition-colors disabled:opacity-60 ${
                              isDarkMode
                                ? 'border-[#5E4E49] text-[#FBF6F1] placeholder:text-[#96837A] focus:border-[#E6B89C]'
                                : 'border-[#D5C2B2] text-[#231C18] placeholder:text-[#A39186] focus:border-[#7A4B3A]'
                            }`}
                          />
                        </label>

                        <label className="block">
                          <span
                            className={`block text-sm italic ${
                              isDarkMode ? 'text-[#C9B6AC]' : 'text-[#7D6B61]'
                            }`}
                            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                          >
                            Reply to
                          </span>
                          <input
                            type="email"
                            aria-label="Your email"
                            disabled={isContactSending}
                            value={contactEmail}
                            onChange={(e) => {
                              setContactEmail(e.target.value);
                              if (contactError) setContactError(null);
                            }}
                            placeholder={
                              contactTopic === 'order_help'
                                ? 'Your email (needed to reply)'
                                : 'Your email (optional)'
                            }
                            className={`w-full h-8 px-0.5 bg-transparent border-0 border-b border-dashed text-xs sm:text-[13px] focus:outline-none transition-colors disabled:opacity-60 ${
                              isDarkMode
                                ? 'border-[#5E4E49] text-[#FBF6F1] placeholder:text-[#96837A] focus:border-[#E6B89C]'
                                : 'border-[#D5C2B2] text-[#231C18] placeholder:text-[#A39186] focus:border-[#7A4B3A]'
                            }`}
                          />
                        </label>
                      </div>

                      {/* Botanical Wax Seal Emblem + Send Note Button */}
                      <div className="flex items-center justify-end gap-2.5 shrink-0 pt-1 sm:pt-0">
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 32 32"
                          className={`w-7 h-7 select-none shrink-0 transition-transform duration-300 ${
                            isContactSending ? 'animate-pulse scale-110' : 'opacity-90'
                          }`}
                        >
                          <circle
                            cx="16"
                            cy="16"
                            r="13"
                            fill={isDarkMode ? '#8C4A58' : '#A64B5B'}
                            fillOpacity="0.18"
                            stroke={isDarkMode ? '#D88C9A' : '#9E4757'}
                            strokeWidth="1.1"
                            strokeDasharray="2.5 2"
                          />
                          <circle
                            cx="16"
                            cy="16"
                            r="9.5"
                            fill="none"
                            stroke={isDarkMode ? '#D88C9A' : '#9E4757'}
                            strokeWidth="0.9"
                          />
                          <path
                            d="M 16,19.5 C 16,19.5 12,16.5 12,14.3 C 12,13 13,12.1 14.3,12.1 C 15.1,12.1 15.7,12.6 16,13.2 C 16.3,12.6 16.9,12.1 17.7,12.1 C 19,12.1 20,13 20,14.3 C 20,16.5 16,19.5 16,19.5 Z"
                            fill={isDarkMode ? '#E598A6' : '#9E4757'}
                          />
                        </svg>

                        <button
                          type="submit"
                          disabled={isContactSending}
                          className={`px-6 sm:px-7 py-2.5 rounded-full text-white text-xs font-medium shadow-xs transition active:scale-95 cursor-pointer whitespace-nowrap disabled:opacity-65 ${
                            isDarkMode
                              ? 'bg-[#9A6550] hover:bg-[#875642]'
                              : 'bg-[#7A4B3A] hover:bg-[#633B2C]'
                          }`}
                        >
                          {isContactSending ? 'Sealing & Sending...' : 'Seal & Send Note'}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* BLOCK 3 (Desktop Bottom-Left Under Email, Mobile/Tablet 3rd Under Form): Help Maintain the Page + Socials */}
            <div className="fluid-scroll-item lg:col-span-5 lg:col-start-1 lg:row-start-2 text-center lg:text-left flex flex-col items-center lg:items-start pt-1 lg:pt-0">
              <div
                className={`w-full max-w-[240px] mb-5 lg:my-6 border-t border-dashed ${
                  isDarkMode ? 'border-[#4E413D]' : 'border-[#E2D3C4]'
                }`}
              />

              <h3
                className={`text-2xl sm:text-[26px] font-semibold tracking-tight ${
                  isDarkMode ? 'text-[#FBF6F1]' : 'text-[#1F1815]'
                }`}
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                Help Maintain the Page
              </h3>
              <p
                className={`mt-1 text-xs leading-relaxed max-w-sm ${
                  isDarkMode ? 'text-[#C9B6AC]' : 'text-[#7D6B61]'
                }`}
              >
                Help keep this floral studio blooming and free for everyone.
              </p>

              <div className="mt-3.5 flex flex-wrap items-center justify-center lg:justify-start gap-2.5">
                <a
                  href="https://ko-fi.com/luxinnamon"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="kofi-support-link"
                  className={`px-4 py-1.5 rounded-full border border-dashed text-xs font-medium transition-all active:scale-95 cursor-pointer whitespace-nowrap ${
                    isDarkMode
                      ? 'bg-[#E6B89C] border-[#E6B89C] text-[#231C18] hover:bg-[#F0C8B0]'
                      : 'bg-[#6E4434] border-[#6E4434] text-[#FFFDF9] hover:bg-[#5B3729]'
                  }`}
                >
                  ko-fi.com/luxinnamon ↗
                </a>

                <button
                  type="button"
                  onClick={() => setIsMaintainNoteOpen((prev) => !prev)}
                  aria-expanded={isMaintainNoteOpen}
                  className={`px-3.5 py-1.5 rounded-full border border-dashed text-xs font-medium transition-all active:scale-95 cursor-pointer whitespace-nowrap ${
                    isDarkMode
                      ? 'bg-[#423734] border-[#66554F] text-[#FBF6F1] hover:bg-[#4D403C]'
                      : 'bg-[#FAF4EE] border-[#D8C4B4] text-[#5C4438] hover:bg-[#F3E9DF]'
                  }`}
                >
                  {isMaintainNoteOpen ? 'Hide Note' : 'About Support'}
                </button>

                {/* Socials Inline */}
                <div
                  className={`flex flex-wrap items-center justify-center lg:justify-start gap-x-2 text-xs font-medium ${
                    isDarkMode ? 'text-[#C9B6AC]' : 'text-[#7D6B61]'
                  }`}
                >
                  <a
                    href="https://instagram.com"
                    target="_blank"
                    rel="noreferrer"
                    className={`transition-colors hover:underline underline-offset-4 ${
                      isDarkMode ? 'hover:text-[#FBF6F1]' : 'hover:text-[#231C18]'
                    }`}
                  >
                    Instagram
                  </a>
                  <span aria-hidden="true" className="opacity-40">·</span>
                  <a
                    href="https://x.com"
                    target="_blank"
                    rel="noreferrer"
                    className={`transition-colors hover:underline underline-offset-4 ${
                      isDarkMode ? 'hover:text-[#FBF6F1]' : 'hover:text-[#231C18]'
                    }`}
                  >
                    X
                  </a>
                  <span aria-hidden="true" className="opacity-40">·</span>
                  <a
                    href="https://github.com/Luxanna22"
                    target="_blank"
                    rel="noreferrer"
                    className={`transition-colors hover:underline underline-offset-4 ${
                      isDarkMode ? 'hover:text-[#FBF6F1]' : 'hover:text-[#231C18]'
                    }`}
                  >
                    GitHub
                  </a>
                </div>
              </div>

              {isMaintainNoteOpen && (
                <p
                  className={`mt-2.5 text-[11.5px] leading-relaxed max-w-xs ${
                    isDarkMode ? 'text-[#E6B89C]' : 'text-[#7A4B3A]'
                  }`}
                >
                  Every tip or pass on{' '}
                  <a
                    href="https://ko-fi.com/luxinnamon"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 font-medium"
                  >
                    ko-fi.com/luxinnamon
                  </a>{' '}
                  helps me keep this page running and craft new blooms for everyone.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* 7. MINIMAL EDITORIAL FOOTER (With Legal: Terms & Privacy) */}
        <footer
          className={`border-t mt-2 transition-colors ${
            isDarkMode
              ? 'bg-[#261F1D] border-[#423734] text-[#D8C7BE]'
              : 'bg-[#F7EFE6]/70 border-[#EAE0D5] text-[#6E5D54]'
          }`}
        >
          <div className="max-w-5xl mx-auto px-4 sm:px-8 pt-10 pb-8">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-8 border-b border-dashed border-[#DFCFC2]/50 dark:border-[#4D403C]">
              {/* Brand Signature Column with Drawn Botanical Logo Mark */}
              <div className="md:col-span-5 space-y-2 text-left">
                <div className="flex items-center gap-2.5">
                  <BrandLogoMark isDarkMode={isDarkMode} className="w-7 h-7 shrink-0" />
                  <div
                    className={`text-2xl font-semibold tracking-tight ${
                      isDarkMode ? 'text-[#FBF6F1]' : 'text-[#231C18]'
                    }`}
                    style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                  >
                    Send A Bouquet
                  </div>
                </div>
                <p className="text-xs leading-relaxed max-w-xs">
                  Handcrafted digital bouquets, wraps, and voice keepsakes.
                </p>
              </div>

              {/* Minimal Navigation Columns: Studio, Explore, Legal */}
              <div className="md:col-span-7 grid grid-cols-3 gap-6 text-left">
                <div className="space-y-2.5">
                  <div
                    className={`text-xs font-semibold ${
                      isDarkMode ? 'text-[#FBF6F1]' : 'text-[#231C18]'
                    }`}
                  >
                    Studio
                  </div>
                  <ul className="space-y-2 text-xs">
                    <li>
                      <button
                        type="button"
                        onClick={onStartCrafting}
                        className="hover:underline cursor-pointer"
                      >
                        Craft a Bouquet
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        onClick={handleCustomizePresetInStudio}
                        className="hover:underline cursor-pointer"
                      >
                        Couture Wraps
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        onClick={onOpenVault}
                        className="hover:underline cursor-pointer"
                      >
                        Saved Bouquets
                      </button>
                    </li>
                  </ul>
                </div>

                <div className="space-y-2.5">
                  <div
                    className={`text-xs font-semibold ${
                      isDarkMode ? 'text-[#FBF6F1]' : 'text-[#231C18]'
                    }`}
                  >
                    Explore
                  </div>
                  <ul className="space-y-2 text-xs">
                    <li>
                      <button
                        type="button"
                        onClick={() => scrollToSection('how-it-works')}
                        className="hover:underline cursor-pointer"
                      >
                        How It Works
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        onClick={() => scrollToSection('faq')}
                        className="hover:underline cursor-pointer"
                      >
                        FAQ
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        onClick={() => scrollToSection('contact')}
                        className="hover:underline cursor-pointer"
                      >
                        Contact
                      </button>
                    </li>
                  </ul>
                </div>

                <div className="space-y-2.5">
                  <div
                    className={`text-xs font-semibold ${
                      isDarkMode ? 'text-[#FBF6F1]' : 'text-[#231C18]'
                    }`}
                  >
                    Legal
                  </div>
                  <ul className="space-y-2 text-xs">
                    <li>
                      <button
                        type="button"
                        data-testid="footer-terms-btn"
                        onClick={() => setLegalModal('terms')}
                        className="hover:underline cursor-pointer"
                      >
                        Terms
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        data-testid="footer-privacy-btn"
                        onClick={() => setLegalModal('privacy')}
                        className="hover:underline cursor-pointer"
                      >
                        Privacy
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Bottom Copyright Bar */}
            <div className="pt-6 flex items-center justify-between gap-3 text-[11px] opacity-75">
              <div>© {new Date().getFullYear()} Send A Bouquet</div>
              <button
                type="button"
                onClick={scrollToTop}
                className="hover:underline cursor-pointer"
              >
                Back to top
              </button>
            </div>
          </div>
        </footer>

        {/* DEDICATED STATIONERY LEGAL MODAL (Terms of Use & Privacy Policy) */}
        <LegalStationeryModal
          activeTab={legalModal}
          isDarkMode={isDarkMode}
          onSelectTab={(tab) => setLegalModal(tab)}
          onClose={() => setLegalModal(null)}
        />

        {/* DEDICATED ALL CREATIONS GALLERY PAGE (Single-Screen Single-Lace Right-to-Left Lenis Carousel) */}
        {isCreationsPageOpen && (
          <CreationsGalleryPageView
            isDarkMode={isDarkMode}
            vaultCount={vaultCount}
            onBackToHome={() => {
              setIsCreationsPageOpen(false);
              onCloseCreationsPage?.();
            }}
            onStartCrafting={() => {
              setIsCreationsPageOpen(false);
              onCloseCreationsPage?.();
              onStartCrafting();
            }}
            onOpenVault={() => {
              setIsCreationsPageOpen(false);
              onCloseCreationsPage?.();
              onOpenVault();
            }}
            onToggleDarkMode={onToggleDarkMode}
            onUnwrapShowcaseBouquet={(entry) => {
              setIsCreationsPageOpen(false);
              handleUnwrapShowcaseEntry(entry, true);
            }}
          />
        )}
      </div>
    </div>
  );
};
