import React, { useState, useRef, useEffect, useCallback } from 'react';
import { create } from 'zustand';
import {
  Flower2,
  Sparkles,
  Undo2,
  Redo2,
  Shuffle,
  Download,
  Share2,
  Trash2,
  Copy,
  FlipHorizontal,
  ArrowUp,
  ArrowDown,
  Heart,
  Gift,
  Palette,
  Mail,
  Check,
  RotateCw,
  Maximize2,
  Layers,
  Eye,
  Edit3,
  Plus,
  X
} from 'lucide-react';

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
  | 'lavender'
  | 'hydrangea'
  | 'babysBreath'
  | 'eucalyptus'
  | 'fern';

export type typeWrapStyle = 'kraft' | 'tissue' | 'plain' | 'celestial';
export type WrapStyle = typeWrapStyle;

export interface BouquetItem {
  id: string;
  type: FlowerType;
  x: number; // SVG viewBox X (0..600)
  y: number; // SVG viewBox Y (0..680)
  scale: number; // 0.4 .. 2.2
  rotation: number; // degrees -180..180
  flipX: boolean;
  petalColor: string;
  centerColor: string;
}

export interface GreetingCardData {
  to: string;
  from: string;
  message: string;
  visibleOnStage: boolean;
  theme: 'cream' | 'blush' | 'lavender';
}

export interface BouquetSnapshot {
  items: BouquetItem[];
  wrapStyle: typeWrapStyle;
  wrapColor: string;
  ribbonColor: string;
  card: GreetingCardData;
}

export interface FlowerCatalogMeta {
  type: FlowerType;
  name: string;
  subtitle: string;
  defaultPetalColor: string;
  defaultCenterColor: string;
  defaultScale: number;
  isFoliage?: boolean;
}

export const FLOWER_CATALOG: FlowerCatalogMeta[] = [
  {
    type: 'rose',
    name: 'Garden Rose',
    subtitle: 'Velvet romantic bloom',
    defaultPetalColor: '#f43f5e',
    defaultCenterColor: '#be123c',
    defaultScale: 1.05
  },
  {
    type: 'peony',
    name: 'Blush Peony',
    subtitle: 'Lush ruffled layers',
    defaultPetalColor: '#fbcfe8',
    defaultCenterColor: '#f472b6',
    defaultScale: 1.15
  },
  {
    type: 'tulip',
    name: 'Dutch Tulip',
    subtitle: 'Graceful spring cup',
    defaultPetalColor: '#fb7185',
    defaultCenterColor: '#fde047',
    defaultScale: 1.0
  },
  {
    type: 'lily',
    name: 'Stargazer Lily',
    subtitle: 'Star-shaped elegance',
    defaultPetalColor: '#fdf2f8',
    defaultCenterColor: '#f97316',
    defaultScale: 1.12
  },
  {
    type: 'sunflower',
    name: 'Golden Sunflower',
    subtitle: 'Warm sunlit rays',
    defaultPetalColor: '#facc15',
    defaultCenterColor: '#451a03',
    defaultScale: 1.15
  },
  {
    type: 'hydrangea',
    name: 'Cloud Hydrangea',
    subtitle: 'Billowy cluster',
    defaultPetalColor: '#c4b5fd',
    defaultCenterColor: '#ede9fe',
    defaultScale: 1.18
  },
  {
    type: 'daisy',
    name: 'Chamomile Daisy',
    subtitle: 'Sweet meadow charm',
    defaultPetalColor: '#ffffff',
    defaultCenterColor: '#eab308',
    defaultScale: 0.92
  },
  {
    type: 'lavender',
    name: 'French Lavender',
    subtitle: 'Fragrant tall spikes',
    defaultPetalColor: '#a855f7',
    defaultCenterColor: '#6b21a8',
    defaultScale: 1.05
  },
  {
    type: 'babysBreath',
    name: "Baby's Breath",
    subtitle: 'Delicate cloud filler',
    defaultPetalColor: '#ffffff',
    defaultCenterColor: '#fef08a',
    defaultScale: 1.05
  },
  {
    type: 'eucalyptus',
    name: 'Silver Dollar Eucalyptus',
    subtitle: 'Muted sage foliage',
    defaultPetalColor: '#6ee7b7',
    defaultCenterColor: '#047857',
    defaultScale: 1.1,
    isFoliage: true
  },
  {
    type: 'fern',
    name: 'Woodland Fern',
    subtitle: 'Arching botanical frond',
    defaultPetalColor: '#4ade80',
    defaultCenterColor: '#15803d',
    defaultScale: 1.12,
    isFoliage: true
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
  { name: 'Ivory Lace', hex: '#f8fafc' }
];

// ============================================================================
// MODULE 2: flowers/ — 11 INLINE SVG BOTANICAL COMPONENTS
// ============================================================================

export interface FlowerSVGProps {
  petalColor: string;
  centerColor: string;
}

/** 1. Rose SVG Component */
export const RoseSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => (
  <g>
    {/* Stem & Leaves */}
    <path d="M0,18 Q-4,85 0,155" stroke="#15803d" strokeWidth="6" fill="none" strokeLinecap="round" />
    <path d="M-2,75 C-28,65 -34,42 -12,48 C-4,52 -2,66 -2,75 Z" fill="#22c55e" />
    <path d="M2,95 C28,85 34,62 12,68 C4,72 2,86 2,95 Z" fill="#16a34a" />
    {/* Outer Petals */}
    <circle cx="-18" cy="-8" r="24" fill={petalColor} opacity="0.92" />
    <circle cx="18" cy="-8" r="24" fill={petalColor} opacity="0.92" />
    <circle cx="0" cy="-24" r="25" fill={petalColor} />
    <circle cx="-14" cy="12" r="23" fill={petalColor} />
    <circle cx="14" cy="12" r="23" fill={petalColor} />
    {/* Inner layered rose cup */}
    <circle cx="0" cy="0" r="26" fill={petalColor} stroke="#ffffff" strokeWidth="1" strokeOpacity="0.4" />
    <path
      d="M-18,-4 C-12,-22 12,-22 18,-4 C22,14 -14,20 -18,-4 Z"
      fill={centerColor}
      opacity="0.45"
    />
    <path
      d="M-12,-2 C-8,-14 10,-14 12,0 C14,10 -10,12 -12,-2 Z"
      fill={petalColor}
      stroke="#ffffff"
      strokeWidth="1.2"
      strokeOpacity="0.55"
    />
    {/* Spiral Rose Heart */}
    <path
      d="M0,0 C4,-6 10,-2 8,4 C6,10 -6,10 -8,2 C-10,-8 4,-14 12,-6"
      fill="none"
      stroke={centerColor}
      strokeWidth="3.2"
      strokeLinecap="round"
    />
  </g>
);

/** 2. Tulip SVG Component */
export const TulipSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => (
  <g>
    {/* Stem & Long Clasping Leaf */}
    <path d="M0,22 Q3,90 0,160" stroke="#16a34a" strokeWidth="6.5" fill="none" strokeLinecap="round" />
    <path d="M-2,135 C-32,85 -26,35 -8,18 C-12,62 -8,100 -2,135 Z" fill="#22c55e" />
    <path d="M2,140 C30,90 28,42 10,24 C12,65 8,105 2,140 Z" fill="#15803d" />
    {/* Back Center Petal & Peek of Golden Stamen */}
    <ellipse cx="0" cy="-18" rx="18" ry="30" fill={centerColor} opacity="0.85" />
    <ellipse cx="0" cy="-14" rx="20" ry="32" fill={petalColor} opacity="0.9" />
    {/* Left & Right Cupping Petals */}
    <path
      d="M0,25 C-34,22 -36,-22 -14,-42 C-2,-24 -2,6 0,25 Z"
      fill={petalColor}
      stroke="#ffffff"
      strokeWidth="1"
      strokeOpacity="0.3"
    />
    <path
      d="M0,25 C34,22 36,-22 14,-42 C2,-24 2,6 0,25 Z"
      fill={petalColor}
      stroke="#ffffff"
      strokeWidth="1"
      strokeOpacity="0.3"
    />
    {/* Front Central Fold */}
    <path
      d="M0,26 C-20,18 -20,-26 0,-40 C20,-26 20,18 0,26 Z"
      fill={petalColor}
      stroke={centerColor}
      strokeWidth="1.2"
      strokeOpacity="0.45"
    />
  </g>
);

/** 3. Sunflower SVG Component */
export const SunflowerSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => {
  const angles = Array.from({ length: 18 }, (_, i) => i * 20);
  return (
    <g>
      <path d="M0,25 Q-3,95 0,165" stroke="#15803d" strokeWidth="7.5" fill="none" strokeLinecap="round" />
      <path d="M-3,85 C-38,70 -40,42 -12,52 Z" fill="#16a34a" />
      {/* Back Ray Ring */}
      {angles.map((deg) => (
        <ellipse
          key={`b-${deg}`}
          cx="0"
          cy="-34"
          rx="8"
          ry="22"
          fill={petalColor}
          opacity="0.85"
          transform={`rotate(${deg + 10})`}
        />
      ))}
      {/* Front Ray Ring */}
      {angles.map((deg) => (
        <ellipse
          key={`f-${deg}`}
          cx="0"
          cy="-32"
          rx="7.5"
          ry="20"
          fill={petalColor}
          stroke="#ca8a04"
          strokeWidth="0.6"
          transform={`rotate(${deg})`}
        />
      ))}
      {/* Seed Disc */}
      <circle cx="0" cy="0" r="22" fill={centerColor} stroke="#d97706" strokeWidth="2.5" />
      {/* Fibonacci Seed Dots */}
      <g fill="#fde047" opacity="0.65">
        <circle cx="-8" cy="-6" r="2" />
        <circle cx="8" cy="-6" r="2" />
        <circle cx="0" cy="-12" r="2" />
        <circle cx="-12" cy="4" r="2" />
        <circle cx="12" cy="4" r="2" />
        <circle cx="0" cy="11" r="2" />
        <circle cx="-5" cy="4" r="2" />
        <circle cx="5" cy="4" r="2" />
        <circle cx="0" cy="-2" r="2.2" />
      </g>
    </g>
  );
};

/** 4. Daisy SVG Component */
export const DaisySVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => {
  const angles = Array.from({ length: 12 }, (_, i) => i * 30);
  return (
    <g>
      <path d="M0,18 Q4,80 0,145" stroke="#22c55e" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      {angles.map((deg) => (
        <ellipse
          key={deg}
          cx="0"
          cy="-24"
          rx="7"
          ry="17"
          fill={petalColor}
          stroke="#e2e8f0"
          strokeWidth="0.8"
          transform={`rotate(${deg})`}
        />
      ))}
      <circle cx="0" cy="0" r="13" fill={centerColor} />
      <circle cx="-3" cy="-3" r="9" fill="#ffffff" opacity="0.22" />
    </g>
  );
};

/** 5. Stargazer Lily SVG Component */
export const LilySVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => {
  const angles = [0, 60, 120, 180, 240, 300];
  return (
    <g>
      <path d="M0,22 Q-3,90 0,160" stroke="#15803d" strokeWidth="5.5" fill="none" strokeLinecap="round" />
      {angles.map((deg) => (
        <g key={deg} transform={`rotate(${deg})`}>
          <path
            d="M0,0 C-15,-18 -14,-44 0,-56 C14,-44 15,-18 0,0 Z"
            fill={petalColor}
            stroke={centerColor}
            strokeWidth="1.2"
            strokeOpacity="0.4"
          />
          <path d="M0,-6 L0,-38" stroke={centerColor} strokeWidth="2" strokeLinecap="round" opacity="0.65" />
          <circle cx="-4" cy="-22" r="1.4" fill={centerColor} />
          <circle cx="4" cy="-25" r="1.4" fill={centerColor} />
          <circle cx="0" cy="-30" r="1.4" fill={centerColor} />
        </g>
      ))}
      {/* Prominent Anthers */}
      {angles.map((deg) => (
        <g key={`stamen-${deg}`} transform={`rotate(${deg + 30})`}>
          <path d="M0,0 Q3,-14 0,-22" stroke="#84cc16" strokeWidth="1.6" fill="none" />
          <ellipse cx="0" cy="-23" rx="3.5" ry="2" fill={centerColor} />
        </g>
      ))}
      <circle cx="0" cy="0" r="5" fill="#84cc16" />
    </g>
  );
};

/** 6. Lush Peony SVG Component */
export const PeonySVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => (
  <g>
    <path d="M0,25 Q2,90 0,155" stroke="#15803d" strokeWidth="6" fill="none" strokeLinecap="round" />
    {/* Outer Ruffled Cloud */}
    {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
      <circle
        key={`outer-${deg}`}
        cx="0"
        cy="-24"
        r="22"
        fill={petalColor}
        transform={`rotate(${deg})`}
      />
    ))}
    {/* Mid Ruffled Layer */}
    {[22, 82, 142, 202, 262, 322].map((deg) => (
      <circle
        key={`mid-${deg}`}
        cx="0"
        cy="-15"
        r="18"
        fill={centerColor}
        opacity="0.55"
        transform={`rotate(${deg})`}
      />
    ))}
    {/* Inner Ruffled Petals */}
    {[0, 72, 144, 216, 288].map((deg) => (
      <circle
        key={`in-${deg}`}
        cx="0"
        cy="-9"
        r="14"
        fill={petalColor}
        stroke="#ffffff"
        strokeWidth="1"
        strokeOpacity="0.5"
        transform={`rotate(${deg})`}
      />
    ))}
    <circle cx="0" cy="0" r="9" fill="#fde047" opacity="0.85" />
    <circle cx="0" cy="0" r="6" fill={centerColor} />
  </g>
);

/** 7. French Lavender Sprig SVG Component */
export const LavenderSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => (
  <g>
    {/* 3 Graceful Stems */}
    <path d="M0,150 Q-12,60 -18,-55" stroke="#4d7c0f" strokeWidth="3.5" fill="none" strokeLinecap="round" />
    <path d="M0,150 Q0,50 0,-70" stroke="#65a30d" strokeWidth="4" fill="none" strokeLinecap="round" />
    <path d="M0,150 Q12,60 18,-50" stroke="#4d7c0f" strokeWidth="3.5" fill="none" strokeLinecap="round" />
    {/* Center Spike Florets */}
    {[-68, -54, -40, -26, -12, 2, 16].map((y, idx) => (
      <g key={`c-${idx}`} transform={`translate(0, ${y})`}>
        <ellipse cx="-5" cy="0" rx="5" ry="7" fill={petalColor} transform="rotate(-28 -5 0)" />
        <ellipse cx="5" cy="0" rx="5" ry="7" fill={petalColor} transform="rotate(28 5 0)" />
        <ellipse cx="0" cy="-3" rx="4.5" ry="6.5" fill={centerColor} opacity="0.75" />
      </g>
    ))}
    {/* Left Spike Florets */}
    {[-52, -38, -24, -10, 4].map((y, idx) => (
      <g key={`l-${idx}`} transform={`translate(-15, ${y}) rotate(-8)`}>
        <ellipse cx="-4" cy="0" rx="4.5" ry="6" fill={petalColor} transform="rotate(-25 -4 0)" />
        <ellipse cx="4" cy="0" rx="4.5" ry="6" fill={centerColor} opacity="0.8" transform="rotate(25 4 0)" />
      </g>
    ))}
    {/* Right Spike Florets */}
    {[-48, -34, -20, -6, 8].map((y, idx) => (
      <g key={`r-${idx}`} transform={`translate(15, ${y}) rotate(8)`}>
        <ellipse cx="-4" cy="0" rx="4.5" ry="6" fill={centerColor} opacity="0.8" transform="rotate(-25 -4 0)" />
        <ellipse cx="4" cy="0" rx="4.5" ry="6" fill={petalColor} transform="rotate(25 4 0)" />
      </g>
    ))}
  </g>
);

/** 8. Hydrangea Cluster SVG Component */
export const HydrangeaSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => {
  const florets = [
    { x: 0, y: -26 },
    { x: -24, y: -14 },
    { x: 24, y: -14 },
    { x: -26, y: 12 },
    { x: 26, y: 12 },
    { x: 0, y: 24 },
    { x: -12, y: -2 },
    { x: 12, y: -2 },
    { x: 0, y: 4 }
  ];
  return (
    <g>
      <path d="M0,25 Q0,95 0,160" stroke="#15803d" strokeWidth="6.5" fill="none" strokeLinecap="round" />
      <ellipse cx="-26" cy="36" rx="22" ry="12" fill="#16a34a" transform="rotate(-25 -26 36)" />
      <ellipse cx="26" cy="36" rx="22" ry="12" fill="#16a34a" transform="rotate(25 26 36)" />
      {florets.map((pos, idx) => (
        <g key={idx} transform={`translate(${pos.x}, ${pos.y})`}>
          <circle cx="0" cy="-9" r="9.5" fill={idx % 2 === 0 ? petalColor : centerColor} />
          <circle cx="0" cy="9" r="9.5" fill={idx % 2 === 0 ? petalColor : centerColor} />
          <circle cx="-9" cy="0" r="9.5" fill={petalColor} />
          <circle cx="9" cy="0" r="9.5" fill={petalColor} />
          <circle cx="0" cy="0" r="3" fill="#fef08a" />
        </g>
      ))}
    </g>
  );
};

/** 9. Baby's Breath Cloud Spray SVG Component */
export const BabysBreathSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => {
  const blossoms = [
    { x: -34, y: -42, r: 7 },
    { x: -18, y: -58, r: 6.5 },
    { x: 0, y: -64, r: 7.5 },
    { x: 20, y: -56, r: 6.5 },
    { x: 35, y: -40, r: 7 },
    { x: -26, y: -20, r: 6 },
    { x: -6, y: -34, r: 7 },
    { x: 14, y: -30, r: 6.5 },
    { x: 28, y: -14, r: 6 },
    { x: -14, y: -4, r: 5.5 },
    { x: 10, y: -6, r: 5.5 }
  ];
  return (
    <g>
      {/* Delicate Branching Stems */}
      <g stroke="#65a30d" strokeWidth="2" fill="none" strokeLinecap="round">
        <path d="M0,150 L0,-62" />
        <path d="M0,65 Q-18,10 -34,-42" />
        <path d="M0,65 Q18,10 35,-40" />
        <path d="M0,25 Q-14,-20 -18,-58" />
        <path d="M0,25 Q14,-20 20,-56" />
        <path d="M0,45 Q-18,15 -26,-20" />
        <path d="M0,45 Q18,15 28,-14" />
      </g>
      {blossoms.map((b, i) => (
        <g key={i} transform={`translate(${b.x}, ${b.y})`}>
          <circle cx="-3" cy="-3" r={b.r * 0.65} fill={petalColor} />
          <circle cx="3" cy="-3" r={b.r * 0.65} fill={petalColor} />
          <circle cx="-3" cy="3" r={b.r * 0.65} fill={petalColor} />
          <circle cx="3" cy="3" r={b.r * 0.65} fill={petalColor} />
          <circle cx="0" cy="0" r={b.r * 0.4} fill={centerColor} />
        </g>
      ))}
    </g>
  );
};

/** 10. Silver Dollar Eucalyptus SVG Component */
export const EucalyptusSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => {
  const leaves = [
    { x: -18, y: 35, rx: 16, ry: 14, rot: -35 },
    { x: 18, y: 24, rx: 16, ry: 14, rot: 35 },
    { x: -20, y: 2, rx: 18, ry: 15, rot: -30 },
    { x: 20, y: -10, rx: 18, ry: 15, rot: 30 },
    { x: -17, y: -32, rx: 16, ry: 14, rot: -25 },
    { x: 17, y: -42, rx: 16, ry: 14, rot: 25 },
    { x: 0, y: -64, rx: 14, ry: 16, rot: 0 }
  ];
  return (
    <g>
      <path d="M0,150 Q-4,45 0,-60" stroke={centerColor} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      {leaves.map((lf, i) => (
        <g key={i} transform={`translate(${lf.x}, ${lf.y}) rotate(${lf.rot})`}>
          <ellipse
            cx="0"
            cy="0"
            rx={lf.rx}
            ry={lf.ry}
            fill={petalColor}
            stroke={centerColor}
            strokeWidth="1.2"
          />
          <path d={`M0,${lf.ry * 0.7} L0,${-lf.ry * 0.6}`} stroke={centerColor} strokeWidth="1" opacity="0.5" />
        </g>
      ))}
    </g>
  );
};

/** 11. Woodland Fern Frond SVG Component */
export const FernSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => {
  const pairs = [-60, -44, -28, -12, 4, 20, 36, 52];
  return (
    <g>
      <path d="M0,150 Q-6,40 0,-78" stroke={centerColor} strokeWidth="3.8" fill="none" strokeLinecap="round" />
      {pairs.map((y, idx) => {
        const w = 26 - Math.abs(idx - 3) * 2.6;
        return (
          <g key={y} transform={`translate(0, ${y})`}>
            <ellipse
              cx={-w * 0.75}
              cy="0"
              rx={w}
              ry="5.5"
              fill={petalColor}
              transform={`rotate(-28 ${-w * 0.75} 0)`}
            />
            <ellipse
              cx={w * 0.75}
              cy="0"
              rx={w}
              ry="5.5"
              fill={petalColor}
              transform={`rotate(28 ${w * 0.75} 0)`}
            />
          </g>
        );
      })}
      <ellipse cx="0" cy="-76" rx="5" ry="11" fill={petalColor} />
    </g>
  );
};

export const FlowerRenderer: React.FC<{ type: FlowerType } & FlowerSVGProps> = ({
  type,
  petalColor,
  centerColor
}) => {
  switch (type) {
    case 'rose':
      return <RoseSVG petalColor={petalColor} centerColor={centerColor} />;
    case 'tulip':
      return <TulipSVG petalColor={petalColor} centerColor={centerColor} />;
    case 'sunflower':
      return <SunflowerSVG petalColor={petalColor} centerColor={centerColor} />;
    case 'daisy':
      return <DaisySVG petalColor={petalColor} centerColor={centerColor} />;
    case 'lily':
      return <LilySVG petalColor={petalColor} centerColor={centerColor} />;
    case 'peony':
      return <PeonySVG petalColor={petalColor} centerColor={centerColor} />;
    case 'lavender':
      return <LavenderSVG petalColor={petalColor} centerColor={centerColor} />;
    case 'hydrangea':
      return <HydrangeaSVG petalColor={petalColor} centerColor={centerColor} />;
    case 'babysBreath':
      return <BabysBreathSVG petalColor={petalColor} centerColor={centerColor} />;
    case 'eucalyptus':
      return <EucalyptusSVG petalColor={petalColor} centerColor={centerColor} />;
    case 'fern':
      return <FernSVG petalColor={petalColor} centerColor={centerColor} />;
  }
};

// ============================================================================
// MODULE 3: lib/ — URL SHARE SERIALIZATION & HIGH-RES PNG EXPORT
// ============================================================================

export function encodeBouquetToShareUrl(snapshot: BouquetSnapshot): string {
  try {
    const json = JSON.stringify(snapshot);
    const encoded = btoa(encodeURIComponent(json));
    const url = new URL(window.location.href);
    url.hash = `bouquet=${encoded}`;
    return url.toString();
  } catch {
    return window.location.href;
  }
}

export function decodeBouquetFromHash(): BouquetSnapshot | null {
  try {
    const hash = window.location.hash;
    if (!hash.startsWith('#bouquet=')) return null;
    const raw = hash.replace('#bouquet=', '');
    const json = decodeURIComponent(atob(raw));
    return JSON.parse(json) as BouquetSnapshot;
  } catch {
    return null;
  }
}

export async function exportSvgElementToPng(
  svgElement: SVGSVGElement,
  filename = 'love-bouquet.png'
): Promise<string> {
  const clone = svgElement.cloneNode(true) as SVGSVGElement;
  // Strip interactive selection gizmos before exporting
  const gizmos = clone.querySelectorAll('[data-export-ignore="true"]');
  gizmos.forEach((el) => el.remove());

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 1360;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Canvas context unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
      resolve(dataUrl);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

// ============================================================================
// MODULE 4: store/useBouquetStore.ts — ZUSTAND STATE & UNDO/REDO ENGINE
// ============================================================================

const INITIAL_ITEMS: BouquetItem[] = [
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

interface BouquetStoreState extends BouquetSnapshot {
  selectedId: string | null;
  past: BouquetSnapshot[];
  future: BouquetSnapshot[];
  // Actions
  selectItem: (id: string | null) => void;
  addFlower: (type: FlowerType) => void;
  updateItem: (id: string, patch: Partial<BouquetItem>, recordHistory?: boolean) => void;
  commitHistorySnapshot: () => void;
  duplicateSelected: () => void;
  deleteSelected: () => void;
  flipSelected: () => void;
  bringForward: () => void;
  sendBackward: () => void;
  setWrapStyle: (style: typeWrapStyle) => void;
  setWrapColor: (color: string) => void;
  setRibbonColor: (color: string) => void;
  updateCard: (patch: Partial<GreetingCardData>) => void;
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
    card: { ...state.card }
  };
}

export const useBouquetStore = create<BouquetStoreState>((set, get) => ({
  items: INITIAL_ITEMS,
  wrapStyle: 'kraft',
  wrapColor: '#d6b38e',
  ribbonColor: '#e11d48',
  card: {
    to: 'My Dearest Love',
    from: 'Yours Forever',
    message: 'Every petal in this bouquet holds a reason why you make my world brighter.',
    visibleOnStage: true,
    theme: 'cream'
  },
  selectedId: 'f-14',
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
      centerColor: meta.defaultCenterColor
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
      rotation: target.rotation + 8
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
    const snap = takeSnapshot(get());
    const remaining = items.filter((i) => i.id !== selectedId);
    set((state) => ({
      past: [...state.past.slice(-29), snap],
      future: [],
      items: remaining,
      selectedId: remaining.length > 0 ? remaining[remaining.length - 1].id : null
    }));
  },

  flipSelected: () => {
    const { selectedId, items } = get();
    if (!selectedId) return;
    const target = items.find((i) => i.id === selectedId);
    if (!target) return;
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

  setWrapStyle: (wrapStyle) => {
    const snap = takeSnapshot(get());
    set((state) => ({
      past: [...state.past.slice(-29), snap],
      future: [],
      wrapStyle
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

  updateCard: (patch) => {
    set((state) => ({
      card: { ...state.card, ...patch }
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
      past: [...past, current],
      future: future.slice(1),
      selectedId: null
    });
  },

  loadSnapshot: (snap) => {
    set({
      ...snap,
      selectedId: snap.items[0]?.id ?? null,
      past: [],
      future: []
    });
  }
}));

// ============================================================================
// MODULE 5: components/BouquetStage.tsx — INTERACTIVE POINTER-EVENTS SVG STAGE
// ============================================================================

interface BouquetStageProps {
  svgRef: React.RefObject<SVGSVGElement | null>;
  isPreviewMode: boolean;
}

export const BouquetStage: React.FC<BouquetStageProps> = ({ svgRef, isPreviewMode }) => {
  const {
    items,
    selectedId,
    wrapStyle,
    wrapColor,
    ribbonColor,
    card,
    selectItem,
    updateItem,
    commitHistorySnapshot
  } = useBouquetStore();

  const [interaction, setInteraction] = useState<{
    mode: 'move' | 'transform';
    itemId: string;
    startPointerX: number;
    startPointerY: number;
    startItemX: number;
    startItemY: number;
    startScale: number;
    startRotation: number;
  } | null>(null);

  // Convert client pointer coordinates to SVG viewBox (600x680) coordinates
  const clientToSvgCoords = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return { x: 300, y: 340 };
      const rect = svg.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * 600;
      const y = ((clientY - rect.top) / rect.height) * 680;
      return { x, y };
    },
    [svgRef]
  );

  const handleItemPointerDown = (e: React.PointerEvent, item: BouquetItem) => {
    if (isPreviewMode) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    selectItem(item.id);
    commitHistorySnapshot();

    const pt = clientToSvgCoords(e.clientX, e.clientY);
    setInteraction({
      mode: 'move',
      itemId: item.id,
      startPointerX: pt.x,
      startPointerY: pt.y,
      startItemX: item.x,
      startItemY: item.y,
      startScale: item.scale,
      startRotation: item.rotation
    });
  };

  const handleGizmoPointerDown = (e: React.PointerEvent, item: BouquetItem) => {
    if (isPreviewMode) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    commitHistorySnapshot();

    const pt = clientToSvgCoords(e.clientX, e.clientY);
    setInteraction({
      mode: 'transform',
      itemId: item.id,
      startPointerX: pt.x,
      startPointerY: pt.y,
      startItemX: item.x,
      startItemY: item.y,
      startScale: item.scale,
      startRotation: item.rotation
    });
  };

  const handleStagePointerMove = (e: React.PointerEvent) => {
    if (!interaction) return;
    const pt = clientToSvgCoords(e.clientX, e.clientY);

    if (interaction.mode === 'move') {
      const dx = pt.x - interaction.startPointerX;
      const dy = pt.y - interaction.startPointerY;
      const nx = Math.max(70, Math.min(530, Math.round(interaction.startItemX + dx)));
      const ny = Math.max(95, Math.min(520, Math.round(interaction.startItemY + dy)));
      updateItem(interaction.itemId, { x: nx, y: ny }, false);
    } else if (interaction.mode === 'transform') {
      const dx = pt.x - interaction.startItemX;
      const dy = pt.y - interaction.startItemY;
      const dist = Math.hypot(dx, dy);
      const newScale = Math.max(0.45, Math.min(2.1, Number((dist / 58).toFixed(2))));
      const angleDeg = Math.round((Math.atan2(dy, dx) * 180) / Math.PI + 45);
      updateItem(
        interaction.itemId,
        {
          scale: newScale,
          rotation: Math.max(-165, Math.min(165, angleDeg))
        },
        false
      );
    }
  };

  const handleStagePointerUp = () => {
    if (interaction) {
      setInteraction(null);
    }
  };

  const selectedItem = items.find((i) => i.id === selectedId) || null;

  return (
    <div className="relative w-full h-full flex items-center justify-center p-2 sm:p-4 select-none overflow-hidden">
      <svg
        ref={svgRef as React.RefObject<SVGSVGElement>}
        viewBox="0 0 600 680"
        className="w-full h-full max-w-[560px] max-h-[650px] drop-shadow-xl touch-none"
        role="img"
        aria-label="Interactive Flower Bouquet Canvas"
        onPointerMove={handleStagePointerMove}
        onPointerUp={handleStagePointerUp}
        onPointerLeave={handleStagePointerUp}
        onPointerDown={() => {
          if (!isPreviewMode) selectItem(null);
        }}
      >
        <defs>
          {/* Soft Romantic Stage Backdrop Gradient */}
          <radialGradient id="stageBgGrad" cx="50%" cy="42%" r="60%">
            <stop offset="0%" stopColor="#fff1f2" />
            <stop offset="55%" stopColor="#fdf4ff" />
            <stop offset="100%" stopColor="#fae8ff" stopOpacity="0.45" />
          </radialGradient>

          {/* Kraft Paper Gradient */}
          <linearGradient id="kraftBackGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#b08968" />
            <stop offset="100%" stopColor="#7f5539" />
          </linearGradient>
          <linearGradient id="kraftFrontGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={wrapColor} />
            <stop offset="100%" stopColor="#b08968" />
          </linearGradient>

          {/* Soft Drop Shadow for Flowers & Card */}
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#881337" floodOpacity="0.14" />
          </filter>
        </defs>

        {/* 1. Romantic Arch Backdrop */}
        <rect x="20" y="16" width="560" height="648" rx="42" fill="url(#stageBgGrad)" />
        <circle cx="300" cy="285" r="215" fill="#ffffff" opacity="0.65" />
        <circle
          cx="300"
          cy="285"
          r="215"
          fill="none"
          stroke="#fbcfe8"
          strokeWidth="1.5"
          strokeDasharray="6 6"
        />

        {/* 2. BACK WRAPPING PAPER LAYER (Behind Stems & Flowers) */}
        {wrapStyle !== 'plain' && (
          <g filter="url(#softShadow)">
            {/* Back Paper Fan */}
            <path
              d="M300,535 L110,255 Q205,185 300,225 Q395,185 490,255 Z"
              fill={wrapStyle === 'kraft' ? 'url(#kraftBackGrad)' : wrapColor}
              opacity="0.88"
            />
            {/* Inner White Tissue Crinkle Frill */}
            <path
              d="M135,265 Q180,220 225,250 Q265,210 300,242 Q335,210 375,250 Q420,220 465,265 L300,515 Z"
              fill="#ffffff"
              opacity={wrapStyle === 'tissue' ? '0.92' : '0.78'}
            />
          </g>
        )}

        {/* Gather Stems at the Bouquet Tie Point */}
        <g opacity="0.85">
          <path d="M288,490 L262,615" stroke="#15803d" strokeWidth="6" strokeLinecap="round" />
          <path d="M296,490 L284,625" stroke="#16a34a" strokeWidth="6.5" strokeLinecap="round" />
          <path d="M304,490 L314,625" stroke="#15803d" strokeWidth="6.5" strokeLinecap="round" />
          <path d="M312,490 L338,615" stroke="#22c55e" strokeWidth="6" strokeLinecap="round" />
          <path d="M300,490 L300,630" stroke="#166534" strokeWidth="7" strokeLinecap="round" />
        </g>

        {/* 3. BOUQUET FLOWERS & FOLIAGE LAYER */}
        {items.map((item) => {
          const isSelected = !isPreviewMode && item.id === selectedId;
          return (
            <g
              key={item.id}
              transform={`translate(${item.x}, ${item.y}) rotate(${item.rotation}) scale(${
                item.flipX ? -item.scale : item.scale
              }, ${item.scale})`}
              onPointerDown={(e) => handleItemPointerDown(e, item)}
              className={isPreviewMode ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}
              style={{ filter: isSelected ? 'drop-shadow(0px 8px 14px rgba(244,63,94,0.32))' : 'url(#softShadow)' }}
            >
              {/* Invisible generous hit target for easy touch tapping */}
              <circle cx="0" cy="-10" r="44" fill="transparent" />
              <FlowerRenderer
                type={item.type}
                petalColor={item.petalColor}
                centerColor={item.centerColor}
              />
            </g>
          );
        })}

        {/* 4. FRONT WRAPPING CONE & SATIN RIBBON BOW (Overlaps Lower Stems) */}
        {wrapStyle !== 'plain' && (
          <g filter="url(#softShadow)" className="pointer-events-none">
            {/* Left Folded Lapel */}
            <path
              d="M120,275 L300,475 L252,615 L195,495 Z"
              fill="url(#kraftFrontGrad)"
              stroke="#ffffff"
              strokeWidth="1.5"
              strokeOpacity="0.45"
            />
            {/* Right Overlapping Lapel */}
            <path
              d="M480,275 L300,475 L348,615 L405,495 Z"
              fill={wrapColor}
              stroke="#ffffff"
              strokeWidth="1.5"
              strokeOpacity="0.45"
            />
            {/* Center Lower Cone Wrap */}
            <path
              d="M210,435 L300,480 L390,435 L345,612 Q300,624 255,612 Z"
              fill="url(#kraftFrontGrad)"
            />
            {wrapStyle === 'celestial' && (
              <g fill="#fbbf24" opacity="0.65">
                <circle cx="265" cy="515" r="2.5" />
                <circle cx="335" cy="535" r="3" />
                <circle cx="290" cy="565" r="2" />
                <circle cx="320" cy="495" r="2.2" />
              </g>
            )}
          </g>
        )}

        {/* Satin Ribbon & Bow */}
        <g filter="url(#softShadow)" className="pointer-events-none">
          {/* Ribbon Tails */}
          <path
            d="M295,505 Q270,565 248,622 L268,618 Q286,568 300,512 Z"
            fill={ribbonColor}
          />
          <path
            d="M305,505 Q330,565 352,622 L332,618 Q314,568 300,512 Z"
            fill={ribbonColor}
          />
          {/* Waist Band */}
          <rect x="256" y="492" width="88" height="20" rx="10" fill={ribbonColor} />
          {/* Left & Right Bow Loops */}
          <path
            d="M296,502 C250,468 236,522 288,512 Z"
            fill={ribbonColor}
            stroke="#ffffff"
            strokeWidth="1.2"
            strokeOpacity="0.35"
          />
          <path
            d="M304,502 C350,468 364,522 312,512 Z"
            fill={ribbonColor}
            stroke="#ffffff"
            strokeWidth="1.2"
            strokeOpacity="0.35"
          />
          {/* Center Knot */}
          <rect
            x="289"
            y="490"
            width="22"
            height="24"
            rx="8"
            fill={ribbonColor}
            stroke="#ffffff"
            strokeWidth="1.2"
            strokeOpacity="0.45"
          />
        </g>

        {/* 5. PINNED GREETING CARD TAG ON BOUQUET */}
        {card.visibleOnStage && (
          <g
            transform="translate(425, 520) rotate(-6)"
            filter="url(#softShadow)"
            className="pointer-events-none"
          >
            {/* Gold String */}
            <path d="M-115,-18 Q-55,-25 -10,-32" stroke="#d97706" strokeWidth="1.8" fill="none" />
            <rect
              x="-85"
              y="-42"
              width="175"
              height="112"
              rx="12"
              fill={
                card.theme === 'blush'
                  ? '#fff1f2'
                  : card.theme === 'lavender'
                  ? '#f5f3ff'
                  : '#fffbeb'
              }
              stroke="#fda4af"
              strokeWidth="1.5"
            />
            <rect
              x="-79"
              y="-36"
              width="163"
              height="100"
              rx="8"
              fill="none"
              stroke="#f43f5e"
              strokeWidth="0.7"
              strokeDasharray="3 3"
              opacity="0.5"
            />
            {/* Wax Seal Heart */}
            <circle cx="-62" cy="-22" r="9" fill="#e11d48" />
            <text
              x="-46"
              y="-18"
              fill="#be123c"
              fontSize="11"
              fontWeight="600"
              style={{ fontFamily: "'Dancing Script', 'Brush Script MT', cursive" }}
            >
              To: {card.to.slice(0, 22)}
            </text>
            <foreignObject x="-70" y="-8" width="145" height="54">
              <div
                style={{
                  fontFamily: "'Dancing Script', 'Brush Script MT', cursive",
                  fontSize: '12.5px',
                  lineHeight: '1.25',
                  color: '#4c0519',
                  overflow: 'hidden'
                }}
              >
                {card.message}
              </div>
            </foreignObject>
            <text
              x="72"
              y="56"
              textAnchor="end"
              fill="#9f1239"
              fontSize="10.5"
              fontWeight="600"
              style={{ fontFamily: "'Dancing Script', 'Brush Script MT', cursive" }}
            >
              — {card.from.slice(0, 20)}
            </text>
          </g>
        )}

        {/* 6. INTERACTIVE SELECTION RING & RESIZE/ROTATE HANDLE */}
        {!isPreviewMode && selectedItem && (
          <g
            data-export-ignore="true"
            transform={`translate(${selectedItem.x}, ${selectedItem.y})`}
          >
            <circle
              cx="0"
              cy="0"
              r={58 * selectedItem.scale}
              fill="none"
              stroke="#f43f5e"
              strokeWidth="2"
              strokeDasharray="6 5"
              className="pointer-events-none"
            />
            {/* Drag Handle on Bottom-Right Perimeter */}
            <g
              transform={`translate(${Math.cos(Math.PI / 4) * 58 * selectedItem.scale}, ${
                Math.sin(Math.PI / 4) * 58 * selectedItem.scale
              })`}
              onPointerDown={(e) => handleGizmoPointerDown(e, selectedItem)}
              className="cursor-nwse-resize"
            >
              <circle cx="0" cy="0" r="14" fill="#f43f5e" stroke="#ffffff" strokeWidth="2.5" />
              <path
                d="M-4,-4 L4,4 M4,-4 L-4,4"
                stroke="#ffffff"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </g>
          </g>
        )}
      </svg>

      {/* Empty Bouquet Prompt */}
      {items.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center p-6">
          <div className="bg-white/90 backdrop-blur-md px-6 py-4 rounded-3xl shadow-lg border border-rose-200 max-w-xs">
            <Flower2 className="w-8 h-8 text-rose-400 mx-auto mb-2 animate-bounce" />
            <p className="text-sm font-semibold text-rose-950">Your bouquet wrap is ready!</p>
            <p className="text-xs text-rose-600/80 mt-1">
              Tap any flower in the palette to add blooms, or click &ldquo;Randomize&rdquo; for instant inspiration.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MODULE 6: components/SelectedFlowerToolbar.tsx — FLOATING INSPECTOR & COLOR PICKER
// ============================================================================

export const SelectedFlowerToolbar: React.FC = () => {
  const {
    items,
    selectedId,
    updateItem,
    duplicateSelected,
    deleteSelected,
    flipSelected,
    bringForward,
    sendBackward
  } = useBouquetStore();

  const [colorTarget, setColorTarget] = useState<'petal' | 'center'>('petal');

  const selected = items.find((i) => i.id === selectedId);
  if (!selected) return null;

  const meta = FLOWER_CATALOG.find((m) => m.type === selected.type);

  return (
    <div
      className="bg-white/95 backdrop-blur-md border border-rose-200/80 rounded-3xl p-3 shadow-xl shadow-rose-900/10 flex flex-col gap-2.5 w-full max-w-md mx-auto animate-fadeIn"
      role="region"
      aria-label="Selected Flower Controls"
    >
      {/* Top Row: Name + Quick Layer/Flip/Duplicate/Delete Actions */}
      <div className="flex items-center justify-between gap-2 border-b border-rose-100 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-4 h-4 rounded-full border border-rose-300 shrink-0"
            style={{ backgroundColor: selected.petalColor }}
          />
          <span className="text-xs font-bold text-rose-950 truncate">
            {meta?.name || selected.type}
          </span>
          <span className="text-[11px] text-rose-500 font-mono">
            {Math.round(selected.scale * 100)}%
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={sendBackward}
            className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 transition"
            title="Send Backward"
            aria-label="Send Flower Backward"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={bringForward}
            className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 transition"
            title="Bring Forward"
            aria-label="Bring Flower Forward"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={flipSelected}
            className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 transition"
            title="Flip Horizontally"
            aria-label="Flip Flower Horizontally"
          >
            <FlipHorizontal className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={duplicateSelected}
            className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 transition"
            title="Duplicate Stem"
            aria-label="Duplicate Flower"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={deleteSelected}
            className="p-1.5 rounded-xl bg-rose-100 hover:bg-rose-500 text-rose-600 hover:text-white transition"
            title="Remove Stem (Delete)"
            aria-label="Delete Flower"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Second Row: Scale & Rotation Sliders */}
      <div className="grid grid-cols-2 gap-3 text-[11px]">
        <div>
          <div className="flex justify-between text-rose-800 mb-0.5 font-medium">
            <span className="flex items-center gap-1">
              <Maximize2 className="w-3 h-3 text-rose-400" /> Size
            </span>
            <span>{Math.round(selected.scale * 100)}%</span>
          </div>
          <input
            type="range"
            min="45"
            max="200"
            value={Math.round(selected.scale * 100)}
            onChange={(e) =>
              updateItem(selected.id, { scale: Number(e.target.value) / 100 }, false)
            }
            aria-label="Flower Size"
            className="w-full accent-rose-500 h-1.5 bg-rose-100 rounded-lg cursor-pointer"
          />
        </div>
        <div>
          <div className="flex justify-between text-rose-800 mb-0.5 font-medium">
            <span className="flex items-center gap-1">
              <RotateCw className="w-3 h-3 text-rose-400" /> Tilt Angle
            </span>
            <span>{selected.rotation}°</span>
          </div>
          <input
            type="range"
            min="-140"
            max="140"
            value={selected.rotation}
            onChange={(e) =>
              updateItem(selected.id, { rotation: Number(e.target.value) }, false)
            }
            aria-label="Flower Rotation Angle"
            className="w-full accent-rose-500 h-1.5 bg-rose-100 rounded-lg cursor-pointer"
          />
        </div>
      </div>

      {/* Third Row: Per-Flower Petal & Center Color Pickers */}
      <div className="space-y-1.5 pt-1 border-t border-rose-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setColorTarget('petal')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 transition ${
                colorTarget === 'petal'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full border border-white"
                style={{ backgroundColor: selected.petalColor }}
              />
              Petals
            </button>
            <button
              type="button"
              onClick={() => setColorTarget('center')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 transition ${
                colorTarget === 'center'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full border border-white"
                style={{ backgroundColor: selected.centerColor }}
              />
              Center
            </button>
          </div>

          {/* Native Custom Color Input */}
          <label className="flex items-center gap-1 text-[11px] text-rose-700 font-medium cursor-pointer bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded-full">
            <span>Custom</span>
            <input
              type="color"
              value={colorTarget === 'petal' ? selected.petalColor : selected.centerColor}
              onChange={(e) =>
                updateItem(
                  selected.id,
                  colorTarget === 'petal'
                    ? { petalColor: e.target.value }
                    : { centerColor: e.target.value },
                  true
                )
              }
              aria-label={`Pick custom ${colorTarget} color`}
              className="w-4 h-4 rounded-full border-0 bg-transparent cursor-pointer"
            />
          </label>
        </div>

        {/* Swatch Row */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {ROMANTIC_SWATCHES.map((hex) => {
            const activeHex =
              colorTarget === 'petal' ? selected.petalColor : selected.centerColor;
            const isMatch = activeHex.toLowerCase() === hex.toLowerCase();
            return (
              <button
                key={hex}
                type="button"
                onClick={() =>
                  updateItem(
                    selected.id,
                    colorTarget === 'petal' ? { petalColor: hex } : { centerColor: hex },
                    true
                  )
                }
                aria-label={`Set ${colorTarget} color ${hex}`}
                className={`w-5 h-5 rounded-full shrink-0 border transition-transform ${
                  isMatch
                    ? 'scale-125 ring-2 ring-rose-500 border-white'
                    : 'border-rose-200 hover:scale-110'
                }`}
                style={{ backgroundColor: hex }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MODULE 7: components/MainApp.tsx — BOUQUET STUDIO WORKSPACE & GIFT PREVIEW
// ============================================================================

export default function App() {
  const {
    items,
    wrapStyle,
    wrapColor,
    ribbonColor,
    card,
    past,
    future,
    addFlower,
    setWrapStyle,
    setWrapColor,
    setRibbonColor,
    updateCard,
    randomizeBouquet,
    clearBouquet,
    undo,
    redo,
    deleteSelected,
    duplicateSelected,
    loadSnapshot
  } = useBouquetStore();

  const [activeTab, setActiveTab] = useState<'flowers' | 'wrap' | 'card'>('flowers');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const triggerToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // Load shared bouquet from URL hash if present
  useEffect(() => {
    const shared = decodeBouquetFromHash();
    if (shared && Array.isArray(shared.items)) {
      loadSnapshot(shared);
      triggerToast('Loaded shared love bouquet!');
    }
  }, [loadSnapshot, triggerToast]);

  // Global Keyboard Shortcuts: Undo (Ctrl+Z), Redo (Ctrl+Shift+Z / Ctrl+Y), Delete, Duplicate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
          triggerToast('Redid action');
        } else {
          undo();
          triggerToast('Undid last change');
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        triggerToast('Redid action');
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateSelected();
        triggerToast('Duplicated flower');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, deleteSelected, duplicateSelected, triggerToast]);

  const handleExportPng = async () => {
    if (!svgRef.current) return;
    try {
      await exportSvgElementToPng(svgRef.current, 'bouquet-for-you.png');
      triggerToast('Saved high-res bouquet PNG!');
    } catch {
      triggerToast('Could not export PNG.');
    }
  };

  const handleShareLink = () => {
    const snap: BouquetSnapshot = {
      items,
      wrapStyle,
      wrapColor,
      ribbonColor,
      card
    };
    const shareUrl = encodeBouquetToShareUrl(snap);
    window.history.replaceState(null, '', shareUrl);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).catch(() => {});
    }
    triggerToast('Shareable bouquet link copied!');
  };

  return (
    <div className="min-h-screen h-screen w-screen overflow-hidden flex flex-col bg-gradient-to-br from-rose-50 via-pink-50/70 to-amber-50/60 text-rose-950 font-sans">
      {/* Inject Handwriting Google Font for the Love Note */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
      />

      {/* TOP NAVIGATION HEADER */}
      <header className="h-14 shrink-0 px-3 sm:px-5 bg-white/85 backdrop-blur-md border-b border-rose-200/70 flex items-center justify-between gap-2 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-rose-400 to-pink-600 flex items-center justify-center text-white shadow-md shadow-rose-300">
            <Heart className="w-5 h-5 fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm sm:text-base tracking-tight text-rose-950">
                Bouquet Studio
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                <Sparkles className="w-2.5 h-2.5" /> {items.length} Stems
              </span>
            </div>
            <p className="text-[11px] text-rose-600/80 hidden md:block">
              Handcraft a custom floral arrangement for someone you love
            </p>
          </div>
        </div>

        {/* Center Undo / Redo / Randomize Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              undo();
              triggerToast('Undid last change');
            }}
            disabled={past.length === 0}
            aria-label="Undo (Ctrl+Z)"
            title="Undo (Ctrl+Z)"
            className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 disabled:opacity-40 text-rose-800 border border-rose-200/70 transition"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              redo();
              triggerToast('Redid change');
            }}
            disabled={future.length === 0}
            aria-label="Redo (Ctrl+Shift+Z)"
            title="Redo (Ctrl+Shift+Z)"
            className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 disabled:opacity-40 text-rose-800 border border-rose-200/70 transition"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              randomizeBouquet();
              triggerToast('Arranged a fresh romantic bouquet!');
            }}
            className="px-3 py-1.5 rounded-xl bg-amber-100/90 hover:bg-amber-200/80 text-amber-900 border border-amber-300/70 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
          >
            <Shuffle className="w-3.5 h-3.5 text-amber-700" />
            <span className="hidden sm:inline">Randomize</span>
          </button>
        </div>

        {/* Right Gift Preview, Share & Export Actions */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition ${
              isPreviewMode
                ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-300'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200'
            }`}
          >
            {isPreviewMode ? (
              <>
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </>
            ) : (
              <>
                <Gift className="w-3.5 h-3.5 text-rose-500" />
                <span className="hidden sm:inline">Gift Preview</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleShareLink}
            aria-label="Copy Shareable Link"
            title="Copy Shareable Link"
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Share2 className="w-3.5 h-3.5 text-rose-500" />
            <span className="hidden lg:inline">Share</span>
          </button>
          <button
            type="button"
            onClick={handleExportPng}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-rose-300/60 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download PNG</span>
          </button>
        </div>
      </header>

      {/* MAIN RESPONSIVE WORKSPACE */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* CENTER / TOP STAGE AREA */}
        <main className="flex-1 h-[54vh] lg:h-full relative flex flex-col items-center justify-between overflow-hidden order-1 lg:order-2">
          {/* Interactive SVG Bouquet Stage */}
          <div className="flex-1 w-full min-h-0 flex items-center justify-center">
            <BouquetStage svgRef={svgRef} isPreviewMode={isPreviewMode} />
          </div>

          {/* Floating Per-Flower Inspector or Gift Presentation Banner */}
          <div className="w-full px-3 pb-3 z-20 shrink-0">
            {isPreviewMode ? (
              <div className="max-w-md mx-auto bg-white/90 backdrop-blur-md border border-rose-200 rounded-3xl p-4 text-center shadow-xl">
                <p
                  className="text-xl text-rose-800 font-bold"
                  style={{ fontFamily: "'Dancing Script', cursive" }}
                >
                  Dearest {card.to},
                </p>
                <p
                  className="text-base text-rose-950 mt-1"
                  style={{ fontFamily: "'Dancing Script', cursive" }}
                >
                  &ldquo;{card.message}&rdquo;
                </p>
                <p
                  className="text-sm text-rose-600 mt-1 font-semibold"
                  style={{ fontFamily: "'Dancing Script', cursive" }}
                >
                  With all my love, {card.from} ♥
                </p>
              </div>
            ) : (
              <SelectedFlowerToolbar />
            )}
          </div>
        </main>

        {/* LEFT / BOTTOM SIDEBAR DRAWER (Hidden in Gift Preview Mode) */}
        {!isPreviewMode && (
          <aside className="w-full lg:w-[390px] xl:w-[420px] h-[46vh] lg:h-full bg-white/90 backdrop-blur-xl border-t lg:border-t-0 lg:border-r border-rose-200/80 flex flex-col order-2 lg:order-1 z-20 shrink-0">
            {/* Drawer Navigation Tabs */}
            <div
              className="grid grid-cols-3 gap-1.5 p-2 bg-rose-50/80 border-b border-rose-200/60 shrink-0"
              role="tablist"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'flowers'}
                onClick={() => setActiveTab('flowers')}
                className={`py-2 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                  activeTab === 'flowers'
                    ? 'bg-white text-rose-700 shadow-sm border border-rose-200/80'
                    : 'text-rose-600/80 hover:text-rose-900'
                }`}
              >
                <Flower2 className="w-4 h-4" />
                <span>Flowers (11)</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'wrap'}
                onClick={() => setActiveTab('wrap')}
                className={`py-2 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                  activeTab === 'wrap'
                    ? 'bg-white text-rose-700 shadow-sm border border-rose-200/80'
                    : 'text-rose-600/80 hover:text-rose-900'
                }`}
              >
                <Palette className="w-4 h-4" />
                <span>Wrap &amp; Bow</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'card'}
                onClick={() => setActiveTab('card')}
                className={`py-2 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                  activeTab === 'card'
                    ? 'bg-white text-rose-700 shadow-sm border border-rose-200/80'
                    : 'text-rose-600/80 hover:text-rose-900'
                }`}
              >
                <Mail className="w-4 h-4" />
                <span>Love Card</span>
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
              {/* TAB 1: 11 BOTANICAL FLOWER PALETTE */}
              {activeTab === 'flowers' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xs font-bold uppercase tracking-wider text-rose-900">
                        Botanical Palette
                      </h2>
                      <p className="text-[11px] text-rose-600/80">
                        Tap any stem to add it to your bouquet, then drag to arrange
                      </p>
                    </div>
                    {items.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          clearBouquet();
                          triggerToast('Cleared all stems');
                        }}
                        className="text-[11px] text-rose-500 hover:text-rose-700 font-semibold underline"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2.5">
                    {FLOWER_CATALOG.map((flower) => (
                      <button
                        key={flower.type}
                        type="button"
                        onClick={() => {
                          addFlower(flower.type);
                          triggerToast(`Added ${flower.name}`);
                        }}
                        className="group relative p-2.5 rounded-3xl bg-gradient-to-b from-rose-50/70 to-white hover:from-rose-100/70 hover:to-white border border-rose-200/70 hover:border-rose-400 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center"
                      >
                        <div className="w-16 h-16 flex items-center justify-center overflow-visible group-hover:scale-110 transition-transform">
                          <svg viewBox="-65 -85 130 175" className="w-14 h-14 overflow-visible">
                            <FlowerRenderer
                              type={flower.type}
                              petalColor={flower.defaultPetalColor}
                              centerColor={flower.defaultCenterColor}
                            />
                          </svg>
                        </div>
                        <span className="text-xs font-bold text-rose-950 mt-1 leading-tight">
                          {flower.name}
                        </span>
                        <span className="text-[10px] text-rose-500 leading-tight mt-0.5">
                          {flower.subtitle}
                        </span>
                        <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-rose-500/10 group-hover:bg-rose-500 text-rose-600 group-hover:text-white flex items-center justify-center transition">
                          <Plus className="w-3 h-3" />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 2: WRAPPING PAPER & RIBBON STUDIO */}
              {activeTab === 'wrap' && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-rose-900 mb-2">
                      Wrapping Style
                    </h2>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        {
                          id: 'kraft' as typeWrapStyle,
                          title: 'Kraft Paper',
                          desc: 'Warm artisanal florist wrap'
                        },
                        {
                          id: 'tissue' as typeWrapStyle,
                          title: 'Silk Tissue',
                          desc: 'Soft layered pastel pleats'
                        },
                        {
                          id: 'celestial' as typeWrapStyle,
                          title: 'Starlit Wrap',
                          desc: 'Gold-flecked romantic paper'
                        },
                        {
                          id: 'plain' as typeWrapStyle,
                          title: 'Hand-Tied Stems',
                          desc: 'Unwrapped natural stems & bow'
                        }
                      ].map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setWrapStyle(st.id)}
                          className={`p-3 rounded-2xl border text-left transition ${
                            wrapStyle === st.id
                              ? 'bg-rose-500/10 border-rose-500 text-rose-950 shadow-sm'
                              : 'bg-rose-50/50 border-rose-200/70 text-rose-800 hover:bg-rose-100/50'
                          }`}
                        >
                          <div className="text-xs font-bold flex items-center justify-between">
                            <span>{st.title}</span>
                            {wrapStyle === st.id && <Check className="w-3.5 h-3.5 text-rose-600" />}
                          </div>
                          <div className="text-[10px] text-rose-600/80 mt-0.5">{st.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {wrapStyle !== 'plain' && (
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-rose-900 mb-2">
                        Paper Tint
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: 'Warm Kraft', hex: '#d6b38e' },
                          { label: 'Blush Pink', hex: '#fbcfe8' },
                          { label: 'Rosewater', hex: '#fda4af' },
                          { label: 'Lavender Mist', hex: '#ddd6fe' },
                          { label: 'Sage Whisper', hex: '#a7f3d0' },
                          { label: 'Cream Linen', hex: '#fef3c7' }
                        ].map((sw) => (
                          <button
                            key={sw.hex}
                            type="button"
                            onClick={() => setWrapColor(sw.hex)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 border transition ${
                              wrapColor === sw.hex
                                ? 'border-rose-500 bg-rose-50 font-bold shadow-sm'
                                : 'border-rose-200 bg-white hover:bg-rose-50/50'
                            }`}
                          >
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-rose-300"
                              style={{ backgroundColor: sw.hex }}
                            />
                            <span>{sw.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-rose-900 mb-2">
                      Satin Ribbon Bow Color
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {RIBBON_SWATCHES.map((rb) => (
                        <button
                          key={rb.hex}
                          type="button"
                          onClick={() => setRibbonColor(rb.hex)}
                          className={`p-2 rounded-2xl border text-xs font-medium flex items-center gap-2 transition ${
                            ribbonColor === rb.hex
                              ? 'border-rose-500 bg-rose-50 font-bold text-rose-950 shadow-sm'
                              : 'border-rose-200/70 bg-white hover:bg-rose-50/50 text-rose-800'
                          }`}
                        >
                          <span
                            className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                            style={{ backgroundColor: rb.hex }}
                          />
                          <span className="truncate">{rb.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: GREETING CARD EDITOR */}
              {activeTab === 'card' && (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xs font-bold uppercase tracking-wider text-rose-900">
                        Handwritten Love Note
                      </h2>
                      <p className="text-[11px] text-rose-600/80">
                        Pinned directly onto your bouquet wrap
                      </p>
                    </div>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-rose-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={card.visibleOnStage}
                        onChange={(e) => updateCard({ visibleOnStage: e.target.checked })}
                        className="accent-rose-500 rounded cursor-pointer w-4 h-4"
                      />
                      <span>Show Card</span>
                    </label>
                  </div>

                  {/* Card Stationary Theme */}
                  <div className="flex items-center gap-2">
                    {(['cream', 'blush', 'lavender'] as const).map((th) => (
                      <button
                        key={th}
                        type="button"
                        onClick={() => updateCard({ theme: th })}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-semibold capitalize border transition ${
                          card.theme === th
                            ? 'border-rose-500 bg-rose-500 text-white'
                            : 'border-rose-200 bg-rose-50/60 text-rose-800'
                        }`}
                      >
                        {th} Card
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2.5 bg-rose-50/60 p-3.5 rounded-3xl border border-rose-200/80">
                    <div>
                      <label className="block text-[11px] font-bold text-rose-800 mb-1">
                        To (Recipient)
                      </label>
                      <input
                        type="text"
                        maxLength={28}
                        value={card.to}
                        onChange={(e) => updateCard({ to: e.target.value })}
                        placeholder="My Dearest Love"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-rose-200 text-sm text-rose-950 focus:outline-none focus:border-rose-500"
                        style={{ fontFamily: "'Dancing Script', cursive", fontSize: '18px' }}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-rose-800 mb-1">
                        Heartfelt Message
                      </label>
                      <textarea
                        rows={3}
                        maxLength={130}
                        value={card.message}
                        onChange={(e) => updateCard({ message: e.target.value })}
                        placeholder="Write a sweet note..."
                        className="w-full px-3 py-2 rounded-xl bg-white border border-rose-200 text-rose-950 focus:outline-none focus:border-rose-500 resize-none"
                        style={{ fontFamily: "'Dancing Script', cursive", fontSize: '18px' }}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-rose-800 mb-1">
                        From (Sender)
                      </label>
                      <input
                        type="text"
                        maxLength={26}
                        value={card.from}
                        onChange={(e) => updateCard({ from: e.target.value })}
                        placeholder="Yours Forever"
                        className="w-full px-3 py-2 rounded-xl bg-white border border-rose-200 text-sm text-rose-950 focus:outline-none focus:border-rose-500"
                        style={{ fontFamily: "'Dancing Script', cursive", fontSize: '18px' }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* TOAST NOTIFICATION PILL */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-rose-900/90 text-white px-4 py-2 rounded-full text-xs font-semibold shadow-xl flex items-center gap-2 animate-bounce"
        >
          <Sparkles className="w-3.5 h-3.5 text-rose-300" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}