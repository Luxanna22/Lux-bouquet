import React, { useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import {
  ChevronDown,
  Heart,
  Flower2,
  Sun,
  Moon,
} from 'lucide-react';
import { fetchStudioGlobalStats, StudioGlobalStats } from '../lib/firebase';
import { FlowerRenderer } from './flowers/FlowerRenderer';
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

interface LandingPageViewProps {
  onStartCrafting: () => void;
  onOpenVault: () => void;
  vaultCount: number;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

const FAQ_ITEMS = [
  {
    q: 'Is it free to craft bouquets?',
    a: 'Yes! You can craft unlimited custom digital bouquets and share with loved ones completely for free.',
  },
  {
    q: 'Can I record a voice message?',
    a: 'Yes! Record your voice directly into a Mixtape, Vintage Vinyl, Voice Plushie, Music Box, or Locket attached to your bouquet.',
  },
  {
    q: 'How do the date & secret locks work?',
    a: 'You can seal your bouquet, card, and voice note behind a live date countdown or a secret question only your recipient knows.',
  },
  {
    q: 'How do they receive the bouquet?',
    a: 'You get a short gift link to send anywhere—when opened, the bouquet unwraps and blooms stem-by-stem on their screen.',
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

/** Full-Proportioned Architectural Bouquet Illustration for the Hero Vitrine (Uses CSS drop-shadow so SVG never blanks out on theme toggle) */
const HeroBouquetIllustrationSVG: React.FC<{ preset: ShowcasePreset }> = ({ preset }) => {
  const { wrapStyle, wrapColor, wrapShadow, ribbonColor, stems } = preset;
  const headClipId = `hero-bloom-head-${preset.id}`;
  const domeClipId = `hero-cloche-dome-${preset.id}`;

  return (
    <svg
      viewBox="55 32 290 282"
      className="w-full h-full max-w-[235px] sm:max-w-[275px] max-h-[205px] sm:max-h-[245px] overflow-visible select-none drop-shadow-[0_8px_16px_rgba(122,75,58,0.14)]"
    >
      <defs>
        {/* Clips each FlowerRenderer's built-in straight lower stick so only the curved gathered bouquet stems show */}
        <clipPath id={headClipId}>
          <rect x="-110" y="-140" width="220" height="162" />
        </clipPath>
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
              clipPath={`url(#${headClipId})`}
            >
              <FlowerRenderer
                type={st.type}
                petalColor={st.petal}
                centerColor={st.center}
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
};

/** Cohesive Scene Illustration for Step 01: Pick & Wrap */
const StepOneSceneSVG: React.FC = () => (
  <svg viewBox="0 0 240 150" className="w-full h-full max-w-[210px] sm:max-w-[220px] max-h-[125px] sm:max-h-[140px] overflow-visible select-none drop-shadow-[0_5px_10px_rgba(122,75,58,0.1)]">
    <circle cx="120" cy="76" r="54" fill="#FDE8EF" opacity="0.55" />
    <circle cx="120" cy="76" r="40" fill="#FFFDF9" opacity="0.7" />

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
        <FlowerRenderer type="peony" petalColor="#F472B6" centerColor="#FEF08A" />
      </g>
      <g transform="translate(148, 64) rotate(16) scale(0.46)">
        <FlowerRenderer type="callalily" petalColor="#FFFBEB" centerColor="#F59E0B" />
      </g>
      <g transform="translate(120, 50) scale(0.52)">
        <FlowerRenderer type="ranunculus" petalColor="#FB7185" centerColor="#FEF3C7" />
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
);

/** Cohesive Scene Illustration for Step 02: Voice & Note */
const StepTwoSceneSVG: React.FC = () => (
  <svg viewBox="0 0 240 150" className="w-full h-full max-w-[210px] sm:max-w-[220px] max-h-[125px] sm:max-h-[140px] overflow-visible select-none drop-shadow-[0_5px_10px_rgba(122,75,58,0.1)]">
    <circle cx="120" cy="74" r="54" fill="#F5E9DE" opacity="0.65" />

    <g>
      <g transform="translate(42, 24) rotate(-6)">
        <rect x="0" y="0" width="84" height="66" rx="8" fill="#FFFDF9" stroke="#E5D6C8" strokeWidth="1.4" />
        <rect x="5" y="5" width="74" height="56" rx="5" fill="none" stroke="#F0E4D8" strokeWidth="0.9" strokeDasharray="2.5 2" />
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
);

/** Cohesive Scene Illustration for Step 03: Send or Time-Lock */
const StepThreeSceneSVG: React.FC = () => (
  <svg viewBox="0 0 240 150" className="w-full h-full max-w-[210px] sm:max-w-[220px] max-h-[125px] sm:max-h-[140px] overflow-visible select-none drop-shadow-[0_5px_10px_rgba(122,75,58,0.1)]">
    <circle cx="120" cy="76" r="54" fill="#F6EADF" opacity="0.65" />

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
);

/** Delicate Thin Rope Lace & Scallop Bow Divider Illustration */
const ThinRopeLaceDivider: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
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
};

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  onStartCrafting,
  onOpenVault,
  vaultCount,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const [stats, setStats] = useState<StudioGlobalStats>({
    bouquetsCreated: 1284,
    voiceNotesRecorded: 642,
    bouquetsOpened: 3910,
    reactionsSent: 894,
    updatedAt: '',
  });
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);
  const [activePresetIdx, setActivePresetIdx] = useState<number>(0);

  const scrollWrapperRef = useRef<HTMLDivElement | null>(null);
  const scrollContentRef = useRef<HTMLDivElement | null>(null);
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchStudioGlobalStats()
      .then((live) => {
        if (mounted && live) setStats(live);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // Initialize Lenis smooth water-like scrolling on the LandingPageView scroll container
  useEffect(() => {
    const wrapper = scrollWrapperRef.current;
    const content = scrollContentRef.current;
    if (!wrapper || !content) return;

    const lenis = new Lenis({
      wrapper,
      content,
      lerp: 0.075,
      duration: 1.35,
      smoothWheel: true,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.5,
    });
    lenisRef.current = lenis;

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    return () => {
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

  return (
    <div
      ref={scrollWrapperRef}
      className={`animate-landing-view-enter fixed inset-0 z-50 overflow-y-auto overflow-x-hidden transition-[background-color,color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] selection:bg-[#7A4B3A]/15 ${
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

      {/* STICKY FLOATING TOP NAVBAR — Soft Cashmere-Cocoa in Dark Mode */}
      <div className="sticky top-2.5 sm:top-3 z-40 px-3 sm:px-6 pt-1.5 sm:pt-2 pointer-events-none">
        <header
          className={`pointer-events-auto max-w-5xl mx-auto h-12 sm:h-14 px-3 sm:px-6 rounded-full border shadow-[0_8px_28px_rgba(35,28,24,0.06)] backdrop-blur-md flex items-center justify-between gap-2 sm:gap-3 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            isDarkMode
              ? 'bg-[#362D2A]/92 border-[#4E423E] text-[#FBF6F1]'
              : 'bg-white/92 border-[#EFE6DD] text-[#231C18]'
          }`}
        >
          {/* Brand Wordmark */}
          <button
            type="button"
            onClick={onStartCrafting}
            className="flex items-center gap-2 sm:gap-2.5 text-left cursor-pointer group min-w-0"
          >
            <span
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center group-hover:scale-105 transition-all duration-500 shrink-0 ${
                isDarkMode
                  ? 'bg-[#483C38] text-[#E6B89C]'
                  : 'bg-[#F5EBE4] text-[#7A4B3A]'
              }`}
            >
              <Flower2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </span>
            <span
              className="text-lg sm:text-2xl font-semibold tracking-tight truncate"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Flowers For You
            </span>
          </button>

          {/* Minimal Nav Actions */}
          <div className="flex items-center gap-1.5 sm:gap-5 shrink-0">
            <button
              type="button"
              onClick={() => scrollToSection('how-it-works')}
              className={`hidden md:inline text-xs font-medium transition-colors duration-300 cursor-pointer ${
                isDarkMode
                  ? 'text-[#D8C7BE] hover:text-[#FBF6F1]'
                  : 'text-stone-600 hover:text-[#7A4B3A]'
              }`}
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('faq')}
              className={`hidden md:inline text-xs font-medium transition-colors duration-300 cursor-pointer ${
                isDarkMode
                  ? 'text-[#D8C7BE] hover:text-[#FBF6F1]'
                  : 'text-stone-600 hover:text-[#7A4B3A]'
              }`}
            >
              FAQ
            </button>
            <button
              type="button"
              onClick={onOpenVault}
              className={`px-2 sm:px-0 py-1 text-xs font-medium transition-colors duration-300 inline-flex items-center gap-1 cursor-pointer ${
                isDarkMode
                  ? 'text-[#D8C7BE] hover:text-[#FBF6F1]'
                  : 'text-stone-600 hover:text-[#7A4B3A]'
              }`}
            >
              <span>History</span>
              {vaultCount > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold transition-colors duration-500 ${
                    isDarkMode
                      ? 'bg-[#E6B89C]/20 text-[#F0C8B0]'
                      : 'bg-[#7A4B3A]/15 text-[#7A4B3A]'
                  }`}
                >
                  {vaultCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={onToggleDarkMode}
              aria-label="Toggle theme"
              className={`p-1.5 sm:p-2 rounded-full transition-colors duration-500 cursor-pointer ${
                isDarkMode
                  ? 'text-[#E6B89C] hover:bg-[#483C38]'
                  : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
              }`}
            >
              <span key={isDarkMode ? 'sun' : 'moon'} className="block animate-theme-icon">
                {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-300" /> : <Moon className="w-3.5 h-3.5" />}
              </span>
            </button>

            <button
              type="button"
              onClick={onStartCrafting}
              className={`px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full text-white text-[11px] sm:text-xs font-medium shadow-xs transition-all duration-500 active:scale-95 cursor-pointer whitespace-nowrap ${
                isDarkMode
                  ? 'bg-[#9A6550] hover:bg-[#875642]'
                  : 'bg-[#7A4B3A] hover:bg-[#633B2C]'
              }`}
            >
              Start Crafting
            </button>
          </div>
        </header>
      </div>

      {/* LENIS SMOOTH SCROLL CONTENT ROOT */}
      <div ref={scrollContentRef} className="w-full">
        {/* 2. CENTERED HERO (GENEROUS TOP SPACING ABOVE TITLE + UPSIZED HEADLINE) */}
        <section className="relative overflow-hidden pt-16 sm:pt-24 md:pt-28 pb-9 sm:pb-11 px-4 sm:px-8">
          {/* Soft Pastel / Warm Rose Aura Behind Headline (Cross-fades smoothly between Light & Soft Dark Mode) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-8 sm:top-12 -translate-x-1/2 w-[340px] sm:w-[760px] h-[280px] sm:h-[360px] rounded-full blur-3xl transition-opacity duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              opacity: isDarkMode ? 0 : 0.55,
              background:
                'radial-gradient(circle at 50% 45%, #F9D8E4 0%, #E8DCF8 42%, rgba(253, 249, 245, 0) 75%)',
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-8 sm:top-12 -translate-x-1/2 w-[340px] sm:w-[760px] h-[280px] sm:h-[360px] rounded-full blur-3xl transition-opacity duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              opacity: isDarkMode ? 0.38 : 0,
              background:
                'radial-gradient(circle at 50% 45%, #8A5264 0%, #5E496E 45%, rgba(43, 35, 33, 0) 75%)',
            }}
          />

          <div className="relative max-w-5xl mx-auto text-center">
            {/* Desktop Floating Notification Card — Reverted Top-Right Position, Clear of Upsized Title */}
            <div
              className={`hidden lg:flex items-center gap-3 px-4 py-2.5 rounded-2xl border shadow-[0_8px_28px_rgba(122,75,58,0.08)] absolute -top-11 -right-4 xl:-right-16 text-left select-none z-10 animate-fluid-badge-right transition-colors ${
                isDarkMode
                  ? 'bg-[#362D2A]/95 border-[#4E423E]'
                  : 'bg-white/95 border-[#F0E4DC]'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-full border flex items-center justify-center shrink-0 overflow-hidden ${
                  isDarkMode
                    ? 'bg-[#48383B] border-[#61494E]'
                    : 'bg-[#FFF0F5] border-[#F9D5E2]'
                }`}
              >
                <svg viewBox="-55 -55 110 110" className="w-7 h-7">
                  <FlowerRenderer type="cherryBlossom" petalColor="#F472B6" centerColor="#FEF08A" />
                </svg>
              </div>
              <div>
                <div className="flex items-center justify-between gap-4">
                  <span className={`text-xs font-semibold ${isDarkMode ? 'text-[#FBF6F1]' : 'text-[#231C18]'}`}>
                    Flowers For You
                  </span>
                  <span className={`text-[10px] ${isDarkMode ? 'text-[#B8A59C]' : 'text-stone-400'}`}>now</span>
                </div>
                <p className={`text-[11px] ${isDarkMode ? 'text-[#D5C3B9]' : 'text-stone-500'}`}>
                  Someone sent you a bouquet!
                </p>
              </div>
            </div>

            {/* Desktop Floating Live Stat Card — Reverted Bottom-Left Position */}
            <div
              className={`hidden lg:flex items-center gap-3 px-4 py-2.5 rounded-2xl border shadow-[0_8px_28px_rgba(122,75,58,0.08)] absolute top-36 left-0 xl:-left-8 text-left select-none z-10 animate-fluid-badge-left transition-colors ${
                isDarkMode
                  ? 'bg-[#362D2A]/95 border-[#4E423E]'
                  : 'bg-white/95 border-[#F0E4DC]'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-full border flex items-center justify-center text-[#F43F5E] shrink-0 ${
                  isDarkMode
                    ? 'bg-[#48383B] border-[#61494E]'
                    : 'bg-[#FFF0F3] border-[#F9D5E2]'
                }`}
              >
                <Heart className="w-4 h-4 fill-current" />
              </div>
              <div>
                <div className={`text-[10px] uppercase tracking-wider font-semibold ${isDarkMode ? 'text-[#C4B0A6]' : 'text-stone-400'}`}>
                  Loved by Many
                </div>
                <div className={`text-xs font-semibold tabular-nums ${isDarkMode ? 'text-[#FBF6F1]' : 'text-[#231C18]'}`}>
                  Over {stats.bouquetsCreated.toLocaleString()}+ sent
                </div>
              </div>
            </div>

            {/* Upsized Main Centered Serif Headline & Single-Line Subtitle */}
            <div className="animate-hero-entrance">
              <h1
                className={`text-[42px] sm:text-6xl md:text-[72px] font-semibold tracking-tight leading-[1.04] sm:leading-[1.06] max-w-4xl mx-auto px-1 transition-colors ${
                  isDarkMode ? 'text-[#FBF6F1]' : 'text-[#1F1815]'
                }`}
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                Send Love in Every Bloom.
              </h1>

              {/* Single Concise Subtitle Line */}
              <p
                className={`mt-3.5 sm:mt-4 text-[13.5px] sm:text-base max-w-sm sm:max-w-xl mx-auto leading-relaxed px-2 transition-colors ${
                  isDarkMode ? 'text-[#D8C7BE]' : 'text-[#6E5D54]'
                }`}
              >
                Pick your flowers, wrap with love, attach a little voice note or letter.
              </p>

              {/* Dual Centered Pill Buttons — Side-by-Side on Mobile & Desktop, Zero Emojis/Icons */}
              <div className="mt-6 sm:mt-7 flex items-center justify-center gap-2.5 sm:gap-3.5">
                <button
                  type="button"
                  onClick={onStartCrafting}
                  className={`px-6 sm:px-8 py-3 sm:py-3.5 rounded-full text-white text-xs sm:text-sm font-medium shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer whitespace-nowrap ${
                    isDarkMode
                      ? 'bg-[#9A6550] hover:bg-[#875642]'
                      : 'bg-[#7A4B3A] hover:bg-[#633B2C]'
                  }`}
                >
                  Craft a Bouquet
                </button>

                <button
                  type="button"
                  onClick={() => scrollToSection('how-it-works')}
                  className={`px-5 sm:px-7 py-3 sm:py-3.5 rounded-full border text-xs sm:text-sm font-medium shadow-xs transition-all active:scale-95 cursor-pointer whitespace-nowrap ${
                    isDarkMode
                      ? 'bg-[#362D2A] border-[#524540] text-[#F5ECE6] hover:bg-[#423734]'
                      : 'bg-white border-[#EFE6DD] text-[#231C18] hover:bg-[#FAF5F0]'
                  }`}
                >
                  See How It Works
                </button>
              </div>

              {/* Mobile-Only Compact Social Proof Pill */}
              <div className="mt-5 flex lg:hidden items-center justify-center">
                <div
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-[11px] shadow-2xs select-none transition-colors ${
                    isDarkMode
                      ? 'bg-[#362D2A]/90 border-[#4E423E] text-[#E8D9D0]'
                      : 'bg-white/90 border-[#EFE4DC] text-[#5C4940]'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[#F43F5E] shrink-0 ${
                      isDarkMode ? 'bg-[#48383B]' : 'bg-[#FFF0F3]'
                    }`}
                  >
                    <Heart className="w-2.5 h-2.5 fill-current" />
                  </span>
                  <span className="font-medium tabular-nums">
                    {stats.bouquetsCreated.toLocaleString()}+ bouquets sent
                  </span>
                  <span className={isDarkMode ? 'text-[#6E5D55]' : 'text-stone-300'}>·</span>
                  <span className={isDarkMode ? 'text-[#C9B6AC]' : 'text-[#8C7365]'}>Free &amp; no login</span>
                </div>
              </div>
            </div>

            {/* Visual Bouquet Showcase Container — Always Visible Across Theme Toggles & Soft Warm Dusk Surface */}
            <div
              className={`animate-hero-entrance-delayed mt-7 sm:mt-11 max-w-4xl mx-auto rounded-[24px] sm:rounded-[30px] border p-2.5 sm:p-6 shadow-[0_12px_40px_rgba(122,75,58,0.08)] relative transition-colors ${
                isDarkMode
                  ? 'bg-[#352C29] border-[#4D403C]'
                  : 'bg-white border-[#EFE6DD]'
              }`}
            >
              {/* Delicate Inner Stitch / Thin Rope Lace Border */}
              <div
                className={`rounded-[18px] sm:rounded-[22px] border border-dashed p-3 sm:p-6 transition-colors ${
                  isDarkMode ? 'border-[#574944]' : 'border-[#E6D7C9]'
                }`}
              >
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 items-center">
                  {/* Left: Full-Proportioned Architectural Bouquet Stage Preview */}
                  <div
                    onClick={handleCustomizePresetInStudio}
                    title="Click to arrange this style in the studio"
                    className={`md:col-span-6 relative h-[235px] sm:h-[315px] rounded-2xl border flex items-center justify-center overflow-hidden cursor-pointer group transition-colors ${
                      isDarkMode
                        ? 'bg-[#423734] border-[#594A45]'
                        : 'bg-[#FCF8F4] border-[#F2E8DF]'
                    }`}
                  >
                    {/* Soft radial spotlight behind bouquet (Warm Blush Glow in both Light & Soft Dark Mode) */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 transition-opacity duration-300"
                      style={{
                        opacity: isDarkMode ? 0.48 : 0.68,
                        background: isDarkMode
                          ? 'radial-gradient(circle at 50% 48%, rgba(253, 216, 228, 0.42) 0%, rgba(66, 55, 52, 0) 72%)'
                          : 'radial-gradient(circle at 50% 48%, #FDE8EF 0%, rgba(252,248,244,0) 72%)',
                      }}
                    />

                    {/* Properly Proportioned Full Bouquet */}
                    <div
                      key={preset.id}
                      className="relative z-10 w-full h-full flex items-center justify-center px-4 py-3 sm:px-6 sm:py-5 animate-fluid-bouquet group-hover:scale-[1.03] transition-transform duration-300"
                    >
                      <HeroBouquetIllustrationSVG preset={preset} />
                    </div>

                    {/* Top-Left Handwritten Note Tag Pill */}
                    <div
                      className={`absolute top-2.5 left-2.5 sm:top-3.5 sm:left-3.5 z-20 px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full border text-[11px] sm:text-xs italic shadow-2xs transition-colors ${
                        isDarkMode
                          ? 'bg-[#332A27]/95 border-[#574944] text-[#F5ECE6]'
                          : 'bg-white/95 border-[#EFE6DD] text-[#5C4940]'
                      }`}
                      style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                    >
                      {preset.notePreview}
                    </div>

                    {/* Bottom-Right Voice Keepsake Badge */}
                    <div
                      className={`absolute bottom-2.5 right-2.5 sm:bottom-3.5 sm:right-3.5 z-20 pl-1.5 pr-3 sm:pl-2 sm:pr-3.5 py-1 rounded-full border text-[10px] sm:text-[11px] font-medium inline-flex items-center gap-1.5 sm:gap-2 shadow-2xs transition-colors ${
                        isDarkMode
                          ? 'bg-[#332A27]/95 border-[#574944] text-[#F5ECE6]'
                          : 'bg-white/95 border-[#EFE6DD] text-[#5C4940]'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center overflow-hidden shrink-0 [&>svg]:w-4 [&>svg]:h-4 sm:[&>svg]:w-5 sm:[&>svg]:h-5 ${
                          isDarkMode ? 'bg-[#463A36]' : 'bg-[#FAF4F0]'
                        }`}
                      >
                        <MiniVoiceKeepsakeSVG
                          styleType={preset.voiceStyle}
                          primaryColor={preset.voicePrimary}
                          accentColor={preset.voiceAccent}
                        />
                      </div>
                      <span className="whitespace-nowrap">{preset.voiceLabel}</span>
                    </div>
                  </div>

                  {/* Right: Pulled Down & Balanced with Delicate Botanical Lace Graphic Filler */}
                  <div className="md:col-span-6 flex flex-col items-center md:items-start text-center md:text-left pt-1 sm:pt-3 space-y-3 sm:space-y-4">
                    {/* Delicate Botanical & Thin Rope Lace Graphic Header Filler */}
                    <div className="w-full flex flex-col items-center md:items-start">
                      <div className="inline-flex items-center gap-2 sm:gap-2.5 mb-1.5 sm:mb-2 select-none" aria-hidden="true">
                        <span
                          className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border flex items-center justify-center overflow-hidden shrink-0 ${
                            isDarkMode
                              ? 'bg-[#48383B] border-[#61494E]'
                              : 'bg-[#FFF0F5] border-[#F5DCE6]'
                          }`}
                        >
                          <svg viewBox="-55 -55 110 110" className="w-3.5 h-3.5 sm:w-4 sm:h-4">
                            <FlowerRenderer type="cherryBlossom" petalColor="#F472B6" centerColor="#FEF08A" />
                          </svg>
                        </span>
                        <svg viewBox="0 0 96 16" className="w-14 sm:w-20 h-3 sm:h-3.5 overflow-visible">
                          <path
                            d="M 2,8 Q 24,2 48,8 T 94,8"
                            fill="none"
                            stroke={isDarkMode ? '#75625A' : '#D5C2B4'}
                            strokeWidth="1.1"
                            strokeDasharray="2.5 2.5"
                            strokeLinecap="round"
                          />
                          <circle cx="48" cy="8" r="2.2" fill={isDarkMode ? '#E0B298' : '#B4846C'} />
                        </svg>
                        <span
                          className={`text-[9.5px] sm:text-[10px] uppercase tracking-[0.18em] sm:tracking-[0.2em] font-semibold ${
                            isDarkMode ? 'text-[#DEB399]' : 'text-[#9A7B69]'
                          }`}
                        >
                          Tap to Preview Style
                        </span>
                      </div>

                      <h2
                        className={`text-xl sm:text-3xl font-semibold ${
                          isDarkMode ? 'text-[#FBF6F1]' : 'text-[#1F1815]'
                        }`}
                        style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                      >
                        Couture Wraps &amp; Keepsakes
                      </h2>
                    </div>

                    {/* 2x2 Visual Thumbnail Selector Grid */}
                    <div className="grid grid-cols-2 gap-2 sm:gap-2.5 w-full">
                      {SHOWCASE_PRESETS.map((p, i) => {
                        const active = i === activePresetIdx;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleSelectPreset(i)}
                            className={`p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border flex items-center gap-2 sm:gap-2.5 text-left transition-all cursor-pointer ${
                              active
                                ? isDarkMode
                                  ? 'border-[#D4A383] bg-[#483B37] shadow-xs ring-1 ring-[#D4A383]/35'
                                  : 'border-[#C8A996] bg-[#F5EBE2] shadow-xs'
                                : isDarkMode
                                ? 'border-[#4D403C] bg-[#2E2624] hover:bg-[#3B312E] hover:border-[#63524D]'
                                : 'border-[#EFE6DD] bg-[#FAF6F2] hover:bg-[#F5EFE8]'
                            }`}
                          >
                            <div
                              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center shrink-0 overflow-hidden [&>svg]:w-6 [&>svg]:h-6 sm:[&>svg]:w-8 sm:[&>svg]:h-8 ${
                                isDarkMode
                                  ? 'bg-[#3C322F] border-[#594B46]'
                                  : 'bg-white border-[#EFE6DD]'
                              }`}
                            >
                              <MiniWrapConeSVG
                                styleType={p.wrapStyle}
                                color={p.wrapColor}
                                ribbon={p.ribbonColor}
                              />
                            </div>
                            <div className="min-w-0">
                              <div
                                className={`text-[11px] sm:text-xs font-semibold truncate ${
                                  isDarkMode ? 'text-[#FBF6F1]' : 'text-[#231C18]'
                                }`}
                              >
                                {p.label}
                              </div>
                              <div
                                className={`hidden sm:block text-[10px] truncate ${
                                  isDarkMode ? 'text-[#C9B6AC]' : 'text-[#7D6B61]'
                                }`}
                              >
                                {p.subtitle}
                              </div>
                              <div
                                className={`block sm:hidden text-[9.5px] truncate ${
                                  isDarkMode ? 'text-[#C9B6AC]' : 'text-[#7D6B61]'
                                }`}
                              >
                                {p.mobileSubtitle}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Bottom Bar: Opens Selected Preset Directly in Studio */}
                    <button
                      type="button"
                      onClick={handleCustomizePresetInStudio}
                      className={`w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl border flex items-center justify-between gap-2 sm:gap-3 cursor-pointer transition-colors ${
                        isDarkMode
                          ? 'bg-[#2E2624] border-[#4D403C] hover:bg-[#3B312E] hover:border-[#63524D]'
                          : 'bg-[#FAF6F2] border-[#EFE6DD] hover:bg-[#F3ECE3]'
                      }`}
                    >
                      <div className="flex items-center -space-x-1.5 shrink-0">
                        <div
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border flex items-center justify-center overflow-hidden ${
                            isDarkMode ? 'bg-[#3C322F] border-[#594B46]' : 'bg-white border-[#E8DDD3]'
                          }`}
                        >
                          <svg viewBox="-55 -55 110 110" className="w-5 h-5 sm:w-6 sm:h-6">
                            <FlowerRenderer
                              type={preset.stems[preset.stems.length - 1]?.type || 'peony'}
                              petalColor={preset.stems[preset.stems.length - 1]?.petal || '#F472B6'}
                              centerColor={preset.stems[preset.stems.length - 1]?.center || '#FEF08A'}
                            />
                          </svg>
                        </div>
                        <div
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border flex items-center justify-center overflow-hidden [&>svg]:w-5 [&>svg]:h-5 sm:[&>svg]:w-6 sm:[&>svg]:h-6 ${
                            isDarkMode ? 'bg-[#3C322F] border-[#594B46]' : 'bg-white border-[#E8DDD3]'
                          }`}
                        >
                          <MiniRibbonBowSVG hex={preset.ribbonColor} styleType={preset.ribbonStyle} />
                        </div>
                        <div
                          className={`hidden xs:flex sm:flex w-7 h-7 sm:w-8 sm:h-8 rounded-full border items-center justify-center overflow-hidden [&>svg]:w-5 [&>svg]:h-5 sm:[&>svg]:w-6 sm:[&>svg]:h-6 ${
                            isDarkMode ? 'bg-[#3C322F] border-[#594B46]' : 'bg-white border-[#E8DDD3]'
                          }`}
                        >
                          <MiniCardShapeSVG theme="sealed" customBg="#FFFDF9" customAccent="#B4846C" />
                        </div>
                        <div
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border flex items-center justify-center overflow-hidden [&>svg]:w-5 [&>svg]:h-5 sm:[&>svg]:w-6 sm:[&>svg]:h-6 ${
                            isDarkMode ? 'bg-[#3C322F] border-[#594B46]' : 'bg-white border-[#E8DDD3]'
                          }`}
                        >
                          <MiniVoiceKeepsakeSVG
                            styleType={preset.voiceStyle}
                            primaryColor={preset.voicePrimary}
                            accentColor={preset.voiceAccent}
                          />
                        </div>
                      </div>
                      <span
                        className={`text-[11px] sm:text-xs font-semibold whitespace-nowrap ${
                          isDarkMode ? 'text-[#EABCA0]' : 'text-[#7A4B3A]'
                        }`}
                      >
                        Customize {preset.label} →
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <ThinRopeLaceDivider isDarkMode={isDarkMode} />

        {/* 3. COHESIVE, SINGLE-SURFACE 3-STEP "HOW IT WORKS" */}
        <section
          id="how-it-works"
          className="scroll-mt-24 max-w-4xl mx-auto px-4 sm:px-8 pt-8 sm:pt-10 pb-10 sm:pb-12"
        >
          <div className="fluid-scroll-item text-center mb-7 sm:mb-10">
            <div
              className={`text-[10.5px] sm:text-[11px] uppercase tracking-[0.22em] font-semibold mb-1 ${
                isDarkMode ? 'text-[#DEB399]' : 'text-[#9A7B69]'
              }`}
            >
              Three Little Steps
            </div>
            <h2
              className={`text-3xl sm:text-4xl font-semibold ${
                isDarkMode ? 'text-[#FBF6F1]' : 'text-[#1F1815]'
              }`}
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              How It Works
            </h2>
          </div>

          <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {/* CARD 01: Pick & Wrap */}
            <div
              onClick={onStartCrafting}
              className={`fluid-scroll-item fluid-delay-1 group rounded-[22px] sm:rounded-[24px] border overflow-hidden flex flex-col transition-all duration-500 hover:-translate-y-1 cursor-pointer ${
                isDarkMode
                  ? 'bg-[#352C29] border-[#4D403C] hover:border-[#63524D] shadow-[0_10px_28px_rgba(20,15,13,0.2)]'
                  : 'bg-white border-[#EFE6DD] shadow-[0_10px_30px_rgba(122,75,58,0.05)] hover:shadow-[0_16px_38px_rgba(122,75,58,0.09)]'
              }`}
            >
              <div
                className={`h-36 sm:h-44 w-full relative flex items-center justify-center overflow-hidden border-b ${
                  isDarkMode
                    ? 'bg-[#423734] border-[#544641]'
                    : 'bg-[#FAF5EF] border-[#F0E6DC]'
                }`}
              >
                <span
                  className={`absolute top-2.5 left-3 sm:top-3 sm:left-3.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold tracking-wider border ${
                    isDarkMode
                      ? 'bg-[#332A27] border-[#574944] text-[#E6B89C]'
                      : 'bg-white/90 border-[#EAE0D5] text-[#9A7B69]'
                  }`}
                >
                  01
                </span>
                <div className="w-full h-full flex items-center justify-center p-2 group-hover:scale-105 transition-transform duration-500">
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
                  className={`text-xs mt-0.5 sm:mt-1 leading-relaxed ${
                    isDarkMode ? 'text-[#D0BEB4]' : 'text-[#7D6B61]'
                  }`}
                >
                  Arrange 31 blooms into couture wraps, velvet hatboxes &amp; lace bows.
                </p>
              </div>
            </div>

            {/* CARD 02: Voice & Note */}
            <div
              onClick={onStartCrafting}
              className={`fluid-scroll-item fluid-delay-2 group rounded-[22px] sm:rounded-[24px] border overflow-hidden flex flex-col transition-all duration-500 hover:-translate-y-1 cursor-pointer ${
                isDarkMode
                  ? 'bg-[#352C29] border-[#4D403C] hover:border-[#63524D] shadow-[0_10px_28px_rgba(20,15,13,0.2)]'
                  : 'bg-white border-[#EFE6DD] shadow-[0_10px_30px_rgba(122,75,58,0.05)] hover:shadow-[0_16px_38px_rgba(122,75,58,0.09)]'
              }`}
            >
              <div
                className={`h-36 sm:h-44 w-full relative flex items-center justify-center overflow-hidden border-b ${
                  isDarkMode
                    ? 'bg-[#423734] border-[#544641]'
                    : 'bg-[#FAF5EF] border-[#F0E6DC]'
                }`}
              >
                <span
                  className={`absolute top-2.5 left-3 sm:top-3 sm:left-3.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold tracking-wider border ${
                    isDarkMode
                      ? 'bg-[#332A27] border-[#574944] text-[#E6B89C]'
                      : 'bg-white/90 border-[#EAE0D5] text-[#9A7B69]'
                  }`}
                >
                  02
                </span>
                <div className="w-full h-full flex items-center justify-center p-2 group-hover:scale-105 transition-transform duration-500">
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
                  className={`text-xs mt-0.5 sm:mt-1 leading-relaxed ${
                    isDarkMode ? 'text-[#D0BEB4]' : 'text-[#7D6B61]'
                  }`}
                >
                  Tuck in a handwritten letter and record a voice keepsake.
                </p>
              </div>
            </div>

            {/* CARD 03: Send or Time-Lock */}
            <div
              onClick={onStartCrafting}
              className={`fluid-scroll-item fluid-delay-3 group rounded-[22px] sm:rounded-[24px] border overflow-hidden flex flex-col transition-all duration-500 hover:-translate-y-1 cursor-pointer ${
                isDarkMode
                  ? 'bg-[#352C29] border-[#4D403C] hover:border-[#63524D] shadow-[0_10px_28px_rgba(20,15,13,0.2)]'
                  : 'bg-white border-[#EFE6DD] shadow-[0_10px_30px_rgba(122,75,58,0.05)] hover:shadow-[0_16px_38px_rgba(122,75,58,0.09)]'
              }`}
            >
              <div
                className={`h-36 sm:h-44 w-full relative flex items-center justify-center overflow-hidden border-b ${
                  isDarkMode
                    ? 'bg-[#423734] border-[#544641]'
                    : 'bg-[#FAF5EF] border-[#F0E6DC]'
                }`}
              >
                <span
                  className={`absolute top-2.5 left-3 sm:top-3 sm:left-3.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold tracking-wider border ${
                    isDarkMode
                      ? 'bg-[#332A27] border-[#574944] text-[#E6B89C]'
                      : 'bg-white/90 border-[#EAE0D5] text-[#9A7B69]'
                  }`}
                >
                  03
                </span>
                <div className="w-full h-full flex items-center justify-center p-2 group-hover:scale-105 transition-transform duration-500">
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
                  className={`text-xs mt-0.5 sm:mt-1 leading-relaxed ${
                    isDarkMode ? 'text-[#D0BEB4]' : 'text-[#7D6B61]'
                  }`}
                >
                  Share an instant gift link, date countdown or secret key lock.
                </p>
              </div>
            </div>
          </div>
        </section>

        <ThinRopeLaceDivider isDarkMode={isDarkMode} />

        {/* 4. CENTERED "GENTLE ANSWERS" FAQ CARD STACK */}
        <section
          id="faq"
          className="scroll-mt-24 max-w-2xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10 pb-10 sm:pb-12"
        >
          <div className="fluid-scroll-item text-center mb-6 sm:mb-8">
            <div
              className={`text-[10.5px] sm:text-[11px] uppercase tracking-[0.22em] font-semibold mb-1 ${
                isDarkMode ? 'text-[#DEB399]' : 'text-[#9A7B69]'
              }`}
            >
              Gentle Answers
            </div>
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
        <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-2 sm:pt-4 pb-14 sm:pb-16">
          <div
            className={`fluid-scroll-item rounded-[24px] sm:rounded-[28px] border py-9 sm:py-14 px-5 sm:px-6 text-center transition-colors ${
              isDarkMode
                ? 'bg-[#382F2C] border-[#524540]'
                : 'bg-[#F3ECE3] border-[#E5D8C9]'
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
                  <FlowerRenderer type="cherryBlossom" petalColor="#F472B6" centerColor="#FEF08A" />
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
                  <FlowerRenderer type="tulip" petalColor="#FB7185" centerColor="#FEF08A" />
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
      </div>
    </div>
  );
};
