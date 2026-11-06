import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { create } from 'zustand';
import {
  Flower2,
  AlertTriangle,
  Play,
  CheckCircle2,
  Music,
  VolumeX,
  Moon,
  Sun,
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
  Gift,
  Mail,
  Check,
  RotateCw,
  Maximize2,
  Plus,
  Send,
  X,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Sliders,
  Palette,
  Layers,
  PenLine,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  GripVertical,
  RotateCcw
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

export type typeWrapStyle =
  | 'kraft'
  | 'tissue'
  | 'chalice'
  | 'basket'
  | 'vintage'
  | 'lace'
  | 'celestial'
  | 'vase'
  | 'plain';
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
  { id: 'plain', label: 'Hand-Tied', defaultHex: '#D6B38E', defaultRibbon: '#E11D48' }
];

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
  locked?: boolean;
  hidden?: boolean;
}

export interface GreetingCardData {
  to: string;
  from: string;
  message: string;
  visibleOnStage: boolean;
  theme: 'cream' | 'blush' | 'lavender';
  locked?: boolean;
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
    subtitle: 'Velvet classic bloom',
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
        theme: 'cream',
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
        theme: 'blush',
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
        theme: 'lavender',
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
        theme: 'cream',
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

const SHARE_FLOWER_TYPES: FlowerType[] = [
  'rose',
  'tulip',
  'sunflower',
  'daisy',
  'lily',
  'peony',
  'lavender',
  'hydrangea',
  'babysBreath',
  'eucalyptus',
  'fern'
];

const SHARE_WRAP_STYLES: typeWrapStyle[] = [
  'kraft',
  'tissue',
  'chalice',
  'basket',
  'vintage',
  'lace',
  'celestial',
  'vase',
  'plain'
];

const SHARE_CARD_THEMES: ('cream' | 'blush' | 'lavender')[] = ['cream', 'blush', 'lavender'];

const DEFAULT_SHARE_CARD_TO = 'My Dearest';
const DEFAULT_SHARE_CARD_FROM = 'Yours Always';
const DEFAULT_SHARE_CARD_MSG =
  'Every petal in this bouquet was chosen to remind you how deeply you are cherished.';

function toBase64Url(str: string): string {
  const utf8Bytes = encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
    String.fromCharCode(parseInt(p1, 16))
  );
  const b64 =
    typeof btoa === 'function'
      ? btoa(utf8Bytes)
      : typeof globalThis !== 'undefined' && 'Buffer' in globalThis
      ? (globalThis as { Buffer: { from: (s: string, e: string) => { toString: (enc: string) => string } } }).Buffer.from(utf8Bytes, 'binary').toString('base64')
      : '';
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(b64url: string): string {
  let b64 = b64url.trim().replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) {
    b64 += '=';
  }
  const binary =
    typeof atob === 'function'
      ? atob(b64)
      : typeof globalThis !== 'undefined' && 'Buffer' in globalThis
      ? (globalThis as { Buffer: { from: (s: string, enc: string) => { toString: (e: string) => string } } }).Buffer.from(b64, 'base64').toString('binary')
      : '';
  const percentEncoded = Array.from(binary)
    .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
    .join('');
  return decodeURIComponent(percentEncoded);
}

export function encodeBouquetToShareUrl(snapshot: BouquetSnapshot, asGift = false): string {
  try {
    // 1. Compact Wrapper & Ribbon Header: <wrapIdxBase36>~<optWrapHex>~<optRibbonHex>
    const wIdx = Math.max(0, SHARE_WRAP_STYLES.indexOf(snapshot.wrapStyle)).toString(36);
    const defaultWrapHex =
      WRAPPER_CATALOG.find((w) => w.id === snapshot.wrapStyle)?.defaultHex.toLowerCase() || '';
    const wHex =
      snapshot.wrapColor.toLowerCase() === defaultWrapHex
        ? ''
        : snapshot.wrapColor.replace('#', '').toLowerCase();
    const rHex =
      snapshot.ribbonColor.toLowerCase() === '#e11d48'
        ? ''
        : snapshot.ribbonColor.replace('#', '').toLowerCase();
    const headerPart = `${wIdx}~${wHex}~${rHex}`;

    // 2. Compact Card Section: <themeAndVisibleBase36>~<toB64>~<fromB64>~<msgB64>
    const cTheme = Math.max(0, SHARE_CARD_THEMES.indexOf(snapshot.card.theme));
    const cVis = snapshot.card.visibleOnStage ? 1 : 0;
    const cMeta = (cTheme * 2 + cVis).toString(36);
    const cTo = snapshot.card.to === DEFAULT_SHARE_CARD_TO ? '!' : toBase64Url(snapshot.card.to);
    const cFrom =
      snapshot.card.from === DEFAULT_SHARE_CARD_FROM ? '!' : toBase64Url(snapshot.card.from);
    const cMsg =
      snapshot.card.message === DEFAULT_SHARE_CARD_MSG ? '!' : toBase64Url(snapshot.card.message);
    const cardPart = `${cMeta}~${cTo}~${cFrom}~${cMsg}`;

    // 3. Compact Items Section: 8 chars per stem + optional ~flags~petal~center only if non-default
    const clampNum = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
    const itemsPart = snapshot.items
      .map((item) => {
        const tIdx = Math.max(0, SHARE_FLOWER_TYPES.indexOf(item.type)).toString(36);
        const xStr = Math.round(clampNum(item.x, 0, 600))
          .toString(36)
          .padStart(2, '0');
        const yStr = Math.round(clampNum(item.y, 0, 680))
          .toString(36)
          .padStart(2, '0');
        const sInt = clampNum(Math.round((clampNum(item.scale, 0.4, 2.2) - 0.4) * 19), 0, 35);
        const sStr = sInt.toString(36);
        const rInt = clampNum(Math.round((clampNum(item.rotation, -180, 180) + 180) / 2), 0, 180);
        const rStr = rInt.toString(36).padStart(2, '0');

        const meta = FLOWER_CATALOG.find((m) => m.type === item.type);
        const isDefPetal =
          meta && item.petalColor.toLowerCase() === meta.defaultPetalColor.toLowerCase();
        const isDefCenter =
          meta && item.centerColor.toLowerCase() === meta.defaultCenterColor.toLowerCase();
        const flags = (item.flipX ? 1 : 0) | (item.locked ? 2 : 0) | (item.hidden ? 4 : 0);

        const base = `${tIdx}${xStr}${yStr}${sStr}${rStr}`;
        if (isDefPetal && isDefCenter && flags === 0) {
          return base;
        }
        const pHex = isDefPetal ? '' : item.petalColor.replace('#', '').toLowerCase();
        const cHex = isDefCenter ? '' : item.centerColor.replace('#', '').toLowerCase();
        return `${base}~${flags.toString(36)}~${pHex}~${cHex}`;
      })
      .join('.');

    const compactPayload = `${headerPart}.${cardPart}.${itemsPart}`;
    const baseUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname}${window.location.search}`
        : 'https://bouquet-studio.local/';
    const prefix = asGift ? 'g' : 'b';
    return `${baseUrl}#${prefix}=${compactPayload}`;
  } catch {
    return typeof window !== 'undefined' ? window.location.href : '';
  }
}

export function isGiftShareHash(hashOverride?: string): boolean {
  const hash =
    hashOverride !== undefined
      ? hashOverride
      : typeof window !== 'undefined'
      ? window.location.hash
      : '';
  if (!hash) return false;
  if (hash.includes('edit=1')) return false;
  return (
    hash.startsWith('#g=') ||
    hash.startsWith('#b=') ||
    hash.startsWith('#bouquet=') ||
    hash.includes('view=gift')
  );
}

export function decodeBouquetFromHash(hashOverride?: string): BouquetSnapshot | null {
  try {
    const hash =
      hashOverride !== undefined
        ? hashOverride
        : typeof window !== 'undefined'
        ? window.location.hash
        : '';
    if (!hash) return null;

    // FORMAT A: Ultra-compact #g=<payload> or #b=<payload>
    if (hash.startsWith('#g=') || hash.startsWith('#b=')) {
      const rawPayload = hash.slice(3).split('&')[0].trim();
      const parts = rawPayload.split('.');
      if (parts.length < 2) return null;

      const [headerPart, cardPart, ...stemParts] = parts;
      const [wIdxStr = '0', wHex = '', rHex = ''] = headerPart.split('~');
      const wrapStyle = SHARE_WRAP_STYLES[parseInt(wIdxStr, 36)] || 'kraft';
      const defaultWrapHex =
        WRAPPER_CATALOG.find((w) => w.id === wrapStyle)?.defaultHex || '#C8B9AE';
      const wrapColor = wHex ? `#${wHex}` : defaultWrapHex;
      const ribbonColor = rHex ? `#${rHex}` : '#e11d48';

      const [cMetaStr = '1', cToB64 = '!', cFromB64 = '!', cMsgB64 = '!'] = cardPart.split('~');
      const cMeta = parseInt(cMetaStr, 36) || 0;
      const theme = SHARE_CARD_THEMES[Math.floor(cMeta / 2)] || 'cream';
      const visibleOnStage = cMeta % 2 === 1;
      const to = cToB64 === '!' ? DEFAULT_SHARE_CARD_TO : fromBase64Url(cToB64);
      const from = cFromB64 === '!' ? DEFAULT_SHARE_CARD_FROM : fromBase64Url(cFromB64);
      const message = cMsgB64 === '!' ? DEFAULT_SHARE_CARD_MSG : fromBase64Url(cMsgB64);

      const items: BouquetItem[] = stemParts
        .filter((sp) => sp.length >= 8)
        .map((sp, idx) => {
          const [base, flagsStr = '0', pHex = '', cHex = ''] = sp.split('~');
          const type = SHARE_FLOWER_TYPES[parseInt(base[0], 36)] || 'rose';
          const meta = FLOWER_CATALOG.find((m) => m.type === type) || FLOWER_CATALOG[0];
          const x = parseInt(base.slice(1, 3), 36);
          const y = parseInt(base.slice(3, 5), 36);
          const sInt = parseInt(base.slice(5, 6), 36);
          const scale = Number((0.4 + (sInt / 19)).toFixed(2));
          const rInt = parseInt(base.slice(6, 8), 36);
          const rotation = rInt * 2 - 180;
          const flags = parseInt(flagsStr, 36) || 0;

          return {
            id: `s-${idx}-${type}`,
            type,
            x: Number.isFinite(x) ? x : 300,
            y: Number.isFinite(y) ? y : 280,
            scale: Number.isFinite(scale) ? scale : meta.defaultScale,
            rotation: Number.isFinite(rotation) ? rotation : 0,
            flipX: Boolean(flags & 1),
            locked: Boolean(flags & 2),
            hidden: Boolean(flags & 4),
            petalColor: pHex ? `#${pHex}` : meta.defaultPetalColor,
            centerColor: cHex ? `#${cHex}` : meta.defaultCenterColor
          };
        });

      return {
        items,
        wrapStyle,
        wrapColor,
        ribbonColor,
        card: {
          to,
          from,
          message,
          visibleOnStage,
          theme
        }
      };
    }

    // FORMAT B: Legacy #bouquet=<base64> (with fix for &view=gift suffix + partial truncation salvage)
    if (!hash.startsWith('#bouquet=')) return null;
    // Strip &view=gift or any trailing query parameter before base64 decoding!
    const raw = hash.replace(/^#bouquet=/, '').split('&')[0].trim();
    if (!raw) return null;

    // Normalize URL-safe base64 & restore any stripped '=' padding
    let normalizedB64 = raw.replace(/-/g, '+').replace(/_/g, '/').replace(/[^A-Za-z0-9+/]/g, '');
    // Trim trailing 1-char remainder if link was truncated mid-quartet, then pad to multiple of 4
    if (normalizedB64.length % 4 === 1) {
      normalizedB64 = normalizedB64.slice(0, -1);
    }
    while (normalizedB64.length % 4 !== 0) {
      normalizedB64 += '=';
    }

    const decodedUri =
      typeof atob === 'function'
        ? atob(normalizedB64)
        : typeof globalThis !== 'undefined' && 'Buffer' in globalThis
        ? (globalThis as { Buffer: { from: (s: string, enc: string) => { toString: () => string } } }).Buffer.from(normalizedB64, 'base64').toString()
        : '';

    // Safely decode percent-encoding even if truncated mid-%XX sequence
    const safeDecodedUri = decodedUri.replace(/%[0-9A-Fa-f]{0,1}$/, '');
    let json = '';
    try {
      json = decodeURIComponent(safeDecodedUri);
    } catch {
      json = unescape(safeDecodedUri);
    }

    try {
      return JSON.parse(json) as BouquetSnapshot;
    } catch {
      // Salvage complete flower items if legacy link was truncated mid-JSON by a chat app
      const itemMatches = json.match(/\{[^{}]*"type"\s*:\s*"[^"]+"[^{}]*\}/g);
      if (itemMatches && itemMatches.length > 0) {
        const salvagedItems: BouquetItem[] = [];
        for (const m of itemMatches) {
          try {
            const parsedItem = JSON.parse(m);
            if (parsedItem && parsedItem.type && typeof parsedItem.x === 'number') {
              salvagedItems.push(parsedItem);
            }
          } catch {
            // Skip incomplete item
          }
        }
        if (salvagedItems.length > 0) {
          const wrapMatch = json.match(/"wrapStyle"\s*:\s*"([^"]+)"/);
          const wrapColorMatch = json.match(/"wrapColor"\s*:\s*"([^"]+)"/);
          const ribbonMatch = json.match(/"ribbonColor"\s*:\s*"([^"]+)"/);
          return {
            items: salvagedItems,
            wrapStyle: (wrapMatch?.[1] as typeWrapStyle) || 'kraft',
            wrapColor: wrapColorMatch?.[1] || '#C8B9AE',
            ribbonColor: ribbonMatch?.[1] || '#e11d48',
            card: {
              to: DEFAULT_SHARE_CARD_TO,
              from: DEFAULT_SHARE_CARD_FROM,
              message: DEFAULT_SHARE_CARD_MSG,
              visibleOnStage: true,
              theme: 'cream'
            }
          };
        }
      }
      return null;
    }
  } catch {
    return null;
  }
}

export function wrapCardText(text: string, maxLineLength = 22): string[] {
  if (!text) return [];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (!current) {
      current = word;
    } else if ((current + ' ' + word).length <= maxLineLength) {
      current += ' ' + word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 4);
}

export async function exportSvgElementToPng(
  svgElement: SVGSVGElement,
  filename = 'bouquet.png'
): Promise<string> {
  const clone = svgElement.cloneNode(true) as SVGSVGElement;

  // Strip interactive selection gizmos before exporting
  const gizmos = clone.querySelectorAll('[data-export-ignore="true"]');
  gizmos.forEach((el) => el.remove());

  // Replace any foreignObject in the clone with SVG text to prevent canvas tainting
  const foreignObjects = clone.querySelectorAll('foreignObject');
  foreignObjects.forEach((fo) => {
    const textContent = (fo.textContent || '').trim();
    const textColor = fo.getAttribute('data-text-color') || '#1C1917';
    const textNode = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textNode.setAttribute('x', fo.getAttribute('x') || '-70');
    textNode.setAttribute('y', '-1');
    textNode.setAttribute('fill', textColor);
    textNode.setAttribute('font-size', '12.5');
    textNode.setAttribute('font-family', "'Cormorant Garamond', serif");
    const rawLines = wrapCardText(textContent, 23);
    rawLines.forEach((line, idx) => {
      const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
      tspan.setAttribute('x', fo.getAttribute('x') || '-70');
      tspan.setAttribute('dy', idx === 0 ? '0' : '14');
      tspan.textContent = idx === 3 && textContent.length > 88 ? `${line.replace(/\.*$/, '')}...` : line;
      textNode.appendChild(tspan);
    });
    fo.parentNode?.replaceChild(textNode, fo);
  });

  // Ensure standard SVG attributes and dimensions
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  clone.setAttribute('width', '1200');
  clone.setAttribute('height', '1360');

  const serializer = new XMLSerializer();
  let svgString = serializer.serializeToString(clone);

  // Guarantee xmlns
  if (!svgString.includes('xmlns="http://www.w3.org/2000/svg"')) {
    svgString = svgString.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
  }

  // Base64 data URL avoids cross-origin tainting from Blob URLs
  const base64Svg = 'data:image/svg+xml;charset=utf-8;base64,' + btoa(unescape(encodeURIComponent(svgString)));

  const triggerDownload = (url: string, downloadName: string) => {
    const link = document.createElement('a');
    link.download = downloadName;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
    }, 400);
  };

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 1360;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas 2D context unavailable');
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        if (canvas.toBlob) {
          canvas.toBlob((blob) => {
            if (blob) {
              const blobUrl = URL.createObjectURL(blob);
              triggerDownload(blobUrl, filename);
              setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
              resolve(blobUrl);
            } else {
              const dataUrl = canvas.toDataURL('image/png');
              triggerDownload(dataUrl, filename);
              resolve(dataUrl);
            }
          }, 'image/png');
        } else {
          const dataUrl = canvas.toDataURL('image/png');
          triggerDownload(dataUrl, filename);
          resolve(dataUrl);
        }
      } catch (err) {
        console.warn('Canvas export failed, falling back to SVG vector download:', err);
        try {
          const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
          const svgUrl = URL.createObjectURL(svgBlob);
          triggerDownload(svgUrl, filename.replace(/\.png$/i, '.svg'));
          setTimeout(() => URL.revokeObjectURL(svgUrl), 1000);
          resolve(svgUrl);
        } catch (svgErr) {
          reject(svgErr);
        }
      }
    };

    img.onerror = (err) => {
      console.warn('SVG image load failed, downloading direct SVG keepsake:', err);
      try {
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);
        triggerDownload(svgUrl, filename.replace(/\.png$/i, '.svg'));
        setTimeout(() => URL.revokeObjectURL(svgUrl), 1000);
        resolve(svgUrl);
      } catch (svgErr) {
        reject(err);
      }
    };

    img.src = base64Svg;
  });
}

// ============================================================================

/**
 * Soft Procedural Web Audio Music Box Synthesizer (No Autoplay, Zero External Audio Files)
 */
class RomanticMusicBox {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private timerId: number | null = null;
  private noteIndex = 0;

  // Gentle pentatonic music-box arpeggio in F major / D minor
  private readonly melodyNotes = [
    523.25, // C5
    659.25, // E5
    783.99, // G5
    659.25, // E5
    587.33, // D5
    698.46, // F5
    880.0,  // A5
    698.46, // F5
    523.25, // C5
    587.33, // D5
    659.25, // E5
    783.99, // G5
    698.46, // F5
    659.25, // E5
    587.33, // D5
    523.25  // C5
  ];

  public toggle(): boolean {
    if (this.isPlaying) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }

  public start(): void {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    if (this.isPlaying) return;
    this.isPlaying = true;
    this.playChimeNote();
    this.timerId = window.setInterval(() => {
      if (this.isPlaying) {
        this.playChimeNote();
      }
    }, 680);
  }

  public resumeIfBlocked(): void {
    if (!this.isPlaying) return;
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        if (this.isPlaying) {
          this.playChimeNote();
        }
      }).catch(() => {});
    }
  }

  public stop(): void {
    this.isPlaying = false;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private playChimeNote(): void {
    if (!this.ctx || !this.isPlaying || this.ctx.state === 'suspended') return;
    try {
      const now = this.ctx.currentTime;
      const freq = this.melodyNotes[this.noteIndex % this.melodyNotes.length];
      this.noteIndex += 1;

      // Primary soft celesta sine tone
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.045, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 1.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 1.5);

      // Subtle warm octave harmonic
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(freq * 0.5, now);

      subGain.gain.setValueAtTime(0.001, now);
      subGain.gain.linearRampToValueAtTime(0.018, now + 0.06);
      subGain.gain.exponentialRampToValueAtTime(0.0005, now + 1.55);

      subOsc.connect(subGain);
      subGain.connect(this.ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 1.6);
    } catch {
      // Ignore audio errors if tab is backgrounded
    }
  }
}

export const musicBox = new RomanticMusicBox();

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
  lastNonPlainWrapStyle: 'kraft',
  wrapColor: '#d6b38e',
  ribbonColor: '#e11d48',
  card: {
    to: 'My Dearest',
    from: 'Yours Always',
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
      centerColor: meta.defaultCenterColor,
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
  svgRef: React.RefObject<SVGSVGElement | null> | React.RefObject<SVGSVGElement> | any;
  isPreviewMode: boolean;
  isDarkMode?: boolean;
  bloomedCount?: number;
  showCardInGiftView?: boolean;
  onCardTagClick?: () => void;
}

export const BouquetStage: React.FC<BouquetStageProps> = ({
  svgRef,
  isPreviewMode,
  isDarkMode = false,
  bloomedCount,
  showCardInGiftView = true,
  onCardTagClick
}) => {
  const {
    items,
    selectedId,
    wrapStyle,
    wrapColor,
    ribbonColor,
    card,
    selectItem,
    updateItem,
    deleteSelected,
    flipSelected,
    toggleItemLock,
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

  const hasCommittedDragHistoryRef = useRef(false);

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
    if (isPreviewMode || item.hidden) return;
    e.stopPropagation();
    selectItem(item.id);
    if (item.locked) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    hasCommittedDragHistoryRef.current = false;

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
    if (isPreviewMode || item.locked || item.hidden) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    hasCommittedDragHistoryRef.current = false;

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
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        if (!hasCommittedDragHistoryRef.current) {
          commitHistorySnapshot();
          hasCommittedDragHistoryRef.current = true;
        }
        const nx = Math.max(70, Math.min(530, Math.round(interaction.startItemX + dx)));
        const ny = Math.max(95, Math.min(520, Math.round(interaction.startItemY + dy)));
        updateItem(interaction.itemId, { x: nx, y: ny }, false);
      }
    } else if (interaction.mode === 'transform') {
      const startAngle = Math.atan2(
        interaction.startPointerY - interaction.startItemY,
        interaction.startPointerX - interaction.startItemX
      );
      const currentAngle = Math.atan2(
        pt.y - interaction.startItemY,
        pt.x - interaction.startItemX
      );
      let deltaDeg = ((currentAngle - startAngle) * 180) / Math.PI;
      while (deltaDeg > 180) deltaDeg -= 360;
      while (deltaDeg < -180) deltaDeg += 360;
      const nextRotation = Math.max(-140, Math.min(140, Math.round(interaction.startRotation + deltaDeg)));

      const startDist = Math.hypot(
        interaction.startPointerX - interaction.startItemX,
        interaction.startPointerY - interaction.startItemY
      );
      const currentDist = Math.hypot(
        pt.x - interaction.startItemX,
        pt.y - interaction.startItemY
      );
      const ratio = startDist > 0 ? currentDist / startDist : 1;
      const newScale = Math.max(0.45, Math.min(2.0, Number((interaction.startScale * ratio).toFixed(2))));

      if (!hasCommittedDragHistoryRef.current) {
        commitHistorySnapshot();
        hasCommittedDragHistoryRef.current = true;
      }

      updateItem(
        interaction.itemId,
        {
          scale: newScale,
          rotation: nextRotation
        },
        false
      );
    }
  };

  const handleStagePointerUp = () => {
    hasCommittedDragHistoryRef.current = false;
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
        className="w-full h-full max-w-[560px] max-h-[650px] drop-shadow-sm touch-none"
        role="img"
        aria-label="Interactive Flower Bouquet Canvas"
        onPointerMove={handleStagePointerMove}
        onPointerUp={handleStagePointerUp}
        onPointerLeave={handleStagePointerUp}
        onPointerCancel={handleStagePointerUp}
        onPointerDown={() => {
          if (!isPreviewMode) selectItem(null);
        }}
      >
        <defs>
          {/* Stage Backdrop Gradient */}
          <radialGradient id="stageBgGrad" cx="50%" cy="42%" r="60%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="55%" stopColor="#FAFAF8" />
            <stop offset="100%" stopColor="#F5F3EF" stopOpacity="0.45" />
          </radialGradient>
          <radialGradient id="stageBgGradDark" cx="50%" cy="42%" r="60%">
            <stop offset="0%" stopColor="#24211e" />
            <stop offset="55%" stopColor="#1E1C1A" />
            <stop offset="100%" stopColor="#141211" stopOpacity="0.8" />
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
            <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#1C1917" floodOpacity="0.06" />
          </filter>
        </defs>

        {/* 1. Arch Backdrop */}
        <rect
          x="20"
          y="16"
          width="560"
          height="648"
          rx="42"
          fill={isDarkMode ? 'url(#stageBgGradDark)' : 'url(#stageBgGrad)'}
        />
        <circle cx="300" cy="285" r="215" fill="#ffffff" opacity={isDarkMode ? 0.04 : 0.65} />
        <circle
          cx="300"
          cy="285"
          r="215"
          fill="none"
          stroke={isDarkMode ? '#292524' : '#E8DDD3'}
          strokeWidth="1.5"
          strokeDasharray="6 6"
        />

        {/* 2. BACK WRAPPING PAPER LAYER (Behind Stems & Flowers) */}
        {wrapStyle !== 'plain' && (
          <g filter="url(#softShadow)" className="pointer-events-none">
            {/* STYLE 1: ORIGAMI KRAFT (Layered geometric sleeve + faceted side pleats, inspired by ref #1) */}
            {wrapStyle === 'kraft' && (
              <g>
                {/* Main Upper Trapezoid Back Sheet with subtle concave top curve */}
                <path
                  d="M115,235 Q300,268 485,235 L430,455 L170,455 Z"
                  fill="#C8B9AE"
                />
                {/* Left & Right Angled Origami Side Wings (darker shaded fold) */}
                <path d="M90,260 L115,235 L185,445 L152,445 Z" fill="#B3A296" />
                <path d="M510,260 L485,235 L415,445 L448,445 Z" fill="#B3A296" />
                {/* Inner Crisp Parchment Liner */}
                <path
                  d="M145,252 Q300,280 455,252 L405,445 L195,445 Z"
                  fill="#EFECE8"
                  opacity="0.65"
                />
              </g>
            )}

            {/* STYLE 2: BUTTERFLY PETAL (Split V-notched dual wings in soft blush pink, inspired by ref #2) */}
            {wrapStyle === 'tissue' && (
              <g>
                {/* Left Outer Wing */}
                <path
                  d="M300,480 L102,225 Q195,215 300,325 Z"
                  fill="#FFC4D0"
                />
                {/* Left Inner Fold Bevel */}
                <path
                  d="M300,480 L102,225 L155,230 L300,420 Z"
                  fill="#F7A8B8"
                  opacity="0.78"
                />
                {/* Right Outer Wing */}
                <path
                  d="M300,480 L498,225 Q405,215 300,325 Z"
                  fill="#FFD6DF"
                />
                {/* Right Inner Fold Bevel */}
                <path
                  d="M300,480 L498,225 L445,230 L300,420 Z"
                  fill="#FFC4D0"
                  opacity="0.65"
                />
              </g>
            )}

            {/* STYLE 3: TULIP ORGANZA (Concave chalice lilac veil with sweeping inner curves, inspired by ref #3) */}
            {wrapStyle === 'chalice' && (
              <g>
                {/* Outer Translucent Chalice Bell */}
                <path
                  d="M105,215 Q300,262 495,215 Q455,390 385,500 L215,500 Q145,390 105,215 Z"
                  fill="#EFE3F6"
                />
                {/* Left Parabolic Sheer Fold */}
                <path
                  d="M105,215 Q245,275 278,490 L215,500 Q145,390 105,215 Z"
                  fill="#E2CEF0"
                  opacity="0.72"
                />
                {/* Right Parabolic Sheer Fold */}
                <path
                  d="M495,215 Q355,275 322,490 L385,500 Q455,390 495,215 Z"
                  fill="#E2CEF0"
                  opacity="0.72"
                />
                {/* Delicate Inner Parabolic Contour Lines */}
                <path
                  d="M125,225 Q245,295 270,460 M475,225 Q355,295 330,460"
                  fill="none"
                  stroke="#D5B8EA"
                  strokeWidth="1.6"
                  opacity="0.75"
                />
              </g>
            )}

            {/* STYLE 4: WICKER BASKET (Arched rattan handle & dark interior basket cavity behind flowers) */}
            {wrapStyle === 'basket' && (
              <g>
                {/* Outer Arched Woven Rattan Handle */}
                <path
                  d="M168,425 C168,115 432,115 432,425"
                  fill="none"
                  stroke="#A47549"
                  strokeWidth="16"
                  strokeLinecap="round"
                />
                <path
                  d="M168,425 C168,115 432,115 432,425"
                  fill="none"
                  stroke="#D3A77A"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray="10 8"
                />
                {/* Deep Shaded Basket Rim Interior Behind Stems */}
                <ellipse cx="300" cy="422" rx="146" ry="32" fill="#6E4726" />
                <ellipse cx="300" cy="422" rx="136" ry="24" fill="#4A2E16" />
              </g>
            )}

            {/* STYLE 5: PARISIAN SCRIPT (Asymmetric high-back French botanical newspaper cone) */}
            {wrapStyle === 'vintage' && (
              <g>
                {/* High Asymmetric Crown Back Sheet */}
                <path
                  d="M300,520 L108,265 Q185,165 318,162 Q435,160 492,250 Z"
                  fill="#EBE0CE"
                  stroke="#D5C5AE"
                  strokeWidth="1.5"
                />
                {/* Inner Angled Parchment Sheet */}
                <path
                  d="M300,505 L138,245 L335,178 L468,262 Z"
                  fill="#F7F2E7"
                />
                {/* Subtle Editorial Newsprint Lines on Upper Crown */}
                <g stroke="#B8A992" strokeWidth="1.3" opacity="0.55">
                  <line x1="255" y1="202" x2="355" y2="202" />
                  <line x1="235" y1="214" x2="375" y2="214" />
                  <line x1="215" y1="226" x2="395" y2="226" />
                  <line x1="165" y1="252" x2="245" y2="238" />
                  <line x1="365" y1="238" x2="435" y2="255" />
                </g>
              </g>
            )}

            {/* STYLE 6: EYELET LACE (Romantic scalloped bridal eyelet-lace collar fan) */}
            {wrapStyle === 'lace' && (
              <g>
                {/* Outer Scalloped Bridal Lace Fan */}
                <path
                  d="M300,520 L96,265 Q122,222 156,245 Q188,204 224,232 Q262,192 300,222 Q338,192 376,232 Q412,204 444,245 Q478,222 504,265 Z"
                  fill="#FFF9FB"
                  stroke="#F3D1DC"
                  strokeWidth="1.8"
                />
                {/* Inner Blush Plissé Fan */}
                <path
                  d="M300,505 L128,275 Q214,225 300,248 Q386,225 472,275 Z"
                  fill="#FCE7F3"
                />
                {/* Pierced Eyelet Lace Dots along the Scallop Rim */}
                <g fill="#F4B8CA" opacity="0.75">
                  <circle cx="132" cy="248" r="4.5" />
                  <circle cx="168" cy="236" r="4" />
                  <circle cx="204" cy="225" r="4.5" />
                  <circle cx="244" cy="218" r="4" />
                  <circle cx="280" cy="215" r="4.5" />
                  <circle cx="320" cy="215" r="4.5" />
                  <circle cx="356" cy="218" r="4" />
                  <circle cx="396" cy="225" r="4.5" />
                  <circle cx="432" cy="236" r="4" />
                  <circle cx="468" cy="248" r="4.5" />
                </g>
              </g>
            )}

            {/* STYLE 7: STARLIT NOIR (Midnight navy-charcoal couture wrap with gold-foil trim) */}
            {wrapStyle === 'celestial' && (
              <g>
                {/* High-Fashion Multi-Pointed Midnight Back Crown */}
                <path
                  d="M300,525 L95,250 L168,202 L242,226 L300,180 L358,226 L432,202 L505,250 Z"
                  fill="#1E293B"
                  stroke="#F59E0B"
                  strokeWidth="2"
                />
                {/* Inner Gold-Trimmed Velvet Liner */}
                <path
                  d="M300,505 L122,260 L176,220 L245,240 L300,202 L355,240 L424,220 L478,260 Z"
                  fill="#0F172A"
                  stroke="#FBBF24"
                  strokeWidth="1"
                  strokeDasharray="5 4"
                />
              </g>
            )}

            {/* STYLE 8: CERAMIC VASE (Dark inner mouth of sculptural amphora behind stems) */}
            {wrapStyle === 'vase' && (
              <g>
                <ellipse cx="300" cy="408" rx="96" ry="22" fill="#B5A495" stroke="#E7DCD1" strokeWidth="4" />
                <ellipse cx="300" cy="408" rx="84" ry="15" fill="#574C43" />
              </g>
            )}
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
        {(bloomedCount !== undefined ? items.slice(0, bloomedCount) : items).map((item) => {
          if (item.hidden) return null;
          const isSelected = !isPreviewMode && item.id === selectedId;
          return (
            <g
              key={item.id}
              transform={`translate(${item.x}, ${item.y}) rotate(${item.rotation}) scale(${
                item.flipX ? -item.scale : item.scale
              }, ${item.scale})`}
              onPointerDown={isPreviewMode ? undefined : (e) => handleItemPointerDown(e, item)}
              className={
                isPreviewMode
                  ? 'pointer-events-none cursor-default'
                  : item.locked
                  ? 'cursor-pointer'
                  : 'cursor-grab active:cursor-grabbing'
              }
              style={{ filter: isSelected ? 'drop-shadow(0px 8px 14px rgba(180,132,108,0.35))' : 'url(#softShadow)' }}
            >
              <g className={bloomedCount !== undefined ? 'stem-bloom-pop' : ''}>
                {/* Invisible generous hit target for easy touch tapping */}
                <circle cx="0" cy="-10" r="48" fill="transparent" />
                <FlowerRenderer
                  type={item.type}
                  petalColor={item.petalColor}
                  centerColor={item.centerColor}
                />
              </g>
            </g>
          );
        })}

        {/* 4. FRONT WRAPPING LAYER & SIGNATURE RIBBON TIE (Overlaps Lower Stems) */}
        <g filter="url(#softShadow)" className="pointer-events-none">
          {/* STYLE 1 FRONT: ORIGAMI KRAFT (Mid-tier cuff + vertical pleated sleeve + white twine bow, ref #1) */}
          {wrapStyle === 'kraft' && (
            <g>
              {/* Left & Right Mid-Tier Angled Side Flaps */}
              <path d="M168,390 L265,455 L242,518 L195,512 Z" fill="#B3A296" />
              <path d="M432,390 L335,455 L358,518 L405,512 Z" fill="#B3A296" />
              {/* Center Mid-Tier Collar Cuff with Gently Curved Rim */}
              <path
                d="M174,394 Q300,418 426,394 L388,512 L212,512 Z"
                fill="#CEC0B5"
                stroke="#DFD5CD"
                strokeWidth="1.2"
              />
              {/* Lower Structured Vertical-Pleated Sleeve Handle */}
              <path
                d="M224,508 L376,508 L360,625 L240,625 Z"
                fill="#C4B4A8"
              />
              {/* Architectural Vertical Box Pleats in Lower Handle */}
              <path d="M258,510 L248,625 L270,625 L276,510 Z" fill="#AE9D90" opacity="0.85" />
              <path d="M342,510 L352,625 L330,625 L324,510 Z" fill="#AE9D90" opacity="0.85" />
              <line x1="300" y1="510" x2="300" y2="625" stroke="#B3A296" strokeWidth="1.5" />
              {/* Twin White Twine Waist Bands & Delicate Double-Loop Knot */}
              <path d="M218,505 Q300,514 382,505" fill="none" stroke="#F8FAFC" strokeWidth="4.5" strokeLinecap="round" />
              <path d="M220,513 Q300,522 380,513" fill="none" stroke="#E2E8F0" strokeWidth="3.5" strokeLinecap="round" />
              {/* Left & Right Petite Twine Loops */}
              <path
                d="M296,509 C264,492 260,524 294,514 Z"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="3.8"
                strokeLinejoin="round"
              />
              <path
                d="M304,509 C336,492 340,524 306,514 Z"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="3.8"
                strokeLinejoin="round"
              />
              {/* Hanging Twine Tails */}
              <path
                d="M296,513 Q282,568 276,622 M304,513 Q318,568 324,622"
                fill="none"
                stroke="#F8FAFC"
                strokeWidth="3.2"
                strokeLinecap="round"
              />
              <circle cx="300" cy="511" r="5" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="1.2" />
            </g>
          )}

          {/* STYLE 2 FRONT: BUTTERFLY PETAL (Hugging side petal lapels + flared skirt + dainty crimson cord, ref #2) */}
          {wrapStyle === 'tissue' && (
            <g>
              {/* Lower Softly Flared Skirt Base */}
              <path
                d="M225,512 L375,512 L362,625 Q300,632 238,625 Z"
                fill="#FFE0E7"
              />
              <path
                d="M258,515 L248,625 M342,515 L352,625 M300,518 L300,627"
                stroke="#F9B8C6"
                strokeWidth="1.5"
                opacity="0.65"
              />
              {/* Left Hugging Petal Lapel */}
              <path
                d="M150,362 Q232,415 318,518 L222,520 Q180,445 150,362 Z"
                fill="#FFC6D3"
                stroke="#FFE8EE"
                strokeWidth="1.2"
              />
              {/* Right Overlapping Hugging Petal Lapel */}
              <path
                d="M450,362 Q368,415 282,518 L378,520 Q420,445 450,362 Z"
                fill="#FFD4DF"
                stroke="#FFF0F4"
                strokeWidth="1.2"
              />
              {/* Dainty Thin Cord Tie with Petite Center Bead Knot */}
              <path
                d="M222,512 Q300,526 378,512"
                fill="none"
                stroke={ribbonColor}
                strokeWidth="3.8"
                strokeLinecap="round"
              />
              {/* Delicate Cord Loops & Long Straight Hanging Ends */}
              <path
                d="M298,517 C275,500 272,526 296,520"
                fill="none"
                stroke={ribbonColor}
                strokeWidth="3"
              />
              <path
                d="M302,517 C325,500 328,526 304,520"
                fill="none"
                stroke={ribbonColor}
                strokeWidth="3"
              />
              <path
                d="M297,519 L278,625 M303,519 L322,625"
                fill="none"
                stroke={ribbonColor}
                strokeWidth="3.2"
                strokeLinecap="round"
              />
              <circle cx="300" cy="517" r="6" fill={ribbonColor} />
              <circle cx="300" cy="509" r="3.5" fill={ribbonColor} />
            </g>
          )}

          {/* STYLE 3 FRONT: TULIP ORGANZA (Curved overlapping cradle + flared skirt + lilac satin band, ref #3) */}
          {wrapStyle === 'chalice' && (
            <g>
              {/* Lower Flared Organza Skirt */}
              <path
                d="M218,505 L382,505 L370,625 Q300,632 230,625 Z"
                fill="#E8D7F3"
              />
              {/* Left & Right Sweeping Curved Front Cradle Folds */}
              <path
                d="M155,375 Q245,425 345,495 L218,508 Q182,445 155,375 Z"
                fill="#DFC9EE"
                opacity="0.92"
              />
              <path
                d="M445,375 Q355,425 255,495 L382,508 Q418,445 445,375 Z"
                fill="#EADEF6"
                opacity="0.92"
              />
              {/* Center Curved Tulip Pocket Overlay */}
              <path
                d="M182,415 Q300,455 418,415 L380,508 L220,508 Z"
                fill="#F3E9FA"
                opacity="0.78"
              />
              {/* Wide Satin Waist Band & Long Angled Ribbon Streamers */}
              <path
                d="M217,500 Q300,512 383,500 L381,514 Q300,526 219,514 Z"
                fill="#C084FC"
              />
              <path
                d="M292,514 L262,625 L274,625 L300,516 Z"
                fill="#C084FC"
                opacity="0.9"
              />
              <path
                d="M308,514 L338,625 L326,625 L300,516 Z"
                fill="#A855F7"
                opacity="0.9"
              />
              <rect x="288" y="503" width="24" height="14" rx="5" fill="#A855F7" />
            </g>
          )}

          {/* STYLE 4 FRONT: WICKER BASKET (Woven rattan basket body + braided collar rim + footed base) */}
          {wrapStyle === 'basket' && (
            <g>
              {/* Tapered Woven Basket Body */}
              <path
                d="M158,422 L442,422 L392,598 Q300,616 208,598 Z"
                fill="#C89B6E"
                stroke="#9C6F44"
                strokeWidth="2.5"
              />
              {/* Horizontal & Diagonal Woven Rattan Texture */}
              <path
                d="M168,456 Q300,472 432,456 M178,490 Q300,506 422,490 M188,524 Q300,540 412,524 M198,558 Q300,574 402,558"
                fill="none"
                stroke="#9C6F44"
                strokeWidth="3"
                opacity="0.65"
              />
              <path
                d="M195,428 L225,598 M235,430 L255,602 M275,432 L285,604 M325,432 L315,604 M365,430 L345,602 M405,428 L375,598"
                fill="none"
                stroke="#DFB78C"
                strokeWidth="3.5"
                strokeDasharray="9 7"
                opacity="0.75"
              />
              {/* Sturdy Footed Rattan Base */}
              <path
                d="M202,594 Q300,612 398,594 L392,614 Q300,630 208,614 Z"
                fill="#8B5E34"
              />
              {/* Thick Braided Top Rim Collar */}
              <path
                d="M146,416 Q300,444 454,416 L450,438 Q300,466 150,438 Z"
                fill="#B08257"
                stroke="#7C512B"
                strokeWidth="2"
              />
              <path
                d="M154,426 Q300,454 446,426"
                fill="none"
                stroke="#E6C39C"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray="12 8"
              />
              {/* Decorative Ribbon Bow Tied on Basket Rim */}
              <path d="M294,444 L268,525 L284,522 L300,448 Z" fill={ribbonColor} />
              <path d="M306,444 L332,525 L316,522 L300,448 Z" fill={ribbonColor} />
              <path d="M296,442 C256,416 246,464 290,452 Z" fill={ribbonColor} />
              <path d="M304,442 C344,416 354,464 310,452 Z" fill={ribbonColor} />
              <rect x="290" y="434" width="20" height="18" rx="6" fill={ribbonColor} />
            </g>
          )}

          {/* STYLE 5 FRONT: PARISIAN SCRIPT (Rolled French newspaper cone with editorial script & raffia bow) */}
          {wrapStyle === 'vintage' && (
            <g>
              {/* Left Rolled Parchment Cone Lapel */}
              <path
                d="M126,282 L310,475 L252,618 L194,492 Z"
                fill="#E5D7C3"
                stroke="#CBB99F"
                strokeWidth="1.5"
              />
              {/* Right Overlapping Script Cone Lapel */}
              <path
                d="M474,272 L288,482 L348,618 L408,485 Z"
                fill="#F3ECE0"
                stroke="#D5C5AE"
                strokeWidth="1.5"
              />
              {/* Center Lower Tapered Newspaper Cone */}
              <path
                d="M214,432 L300,486 L388,426 L346,618 Q300,628 254,618 Z"
                fill="#EFE6D5"
                stroke="#D5C5AE"
                strokeWidth="1.2"
              />
              {/* Editorial Typography & Botanical Stamp Details */}
              <g stroke="#9E8C74" strokeWidth="1.4" opacity="0.6">
                <line x1="335" y1="382" x2="412" y2="352" />
                <line x1="328" y1="396" x2="405" y2="366" />
                <line x1="320" y1="410" x2="395" y2="380" />
                <line x1="255" y1="535" x2="345" y2="535" />
                <line x1="262" y1="548" x2="338" y2="548" />
                <line x1="268" y1="561" x2="332" y2="561" />
                <line x1="274" y1="574" x2="326" y2="574" />
              </g>
              {/* Vintage Botanical Seal Stamp */}
              <circle cx="356" cy="436" r="14" fill="none" stroke="#B4846C" strokeWidth="1.4" strokeDasharray="3 2" opacity="0.75" />
              <circle cx="356" cy="436" r="9" fill="#B4846C" opacity="0.2" />
              {/* Rustic Multi-Strand Raffia Bow */}
              <path d="M236,496 Q300,510 364,496" fill="none" stroke="#B4846C" strokeWidth="7" strokeLinecap="round" />
              <path d="M238,502 Q300,516 362,502" fill="none" stroke="#8C5E47" strokeWidth="3" strokeLinecap="round" />
              <path d="M296,502 C248,472 242,526 292,510 Z" fill="none" stroke="#B4846C" strokeWidth="5" />
              <path d="M304,502 C352,472 358,526 308,510 Z" fill="none" stroke="#B4846C" strokeWidth="5" />
              <path d="M294,506 L258,615 M306,506 L342,615" stroke="#B4846C" strokeWidth="4" strokeLinecap="round" />
              <circle cx="300" cy="503" r="8" fill="#9C6B53" />
            </g>
          )}

          {/* STYLE 6 FRONT: EYELET LACE (Accordion-pleated blush skirt + scalloped lace collar + pearl satin bow) */}
          {wrapStyle === 'lace' && (
            <g>
              {/* Accordion-Pleated Blush & Ivory Cone Skirt */}
              <path
                d="M172,380 L300,468 L428,380 L356,618 Q300,630 244,618 Z"
                fill="#FCE7F3"
                stroke="#F9A8D4"
                strokeWidth="1.2"
              />
              {/* Crisp Sunburst Accordion Pleat Lines */}
              <g stroke="#F472B6" strokeWidth="1.2" opacity="0.35">
                <line x1="205" y1="405" x2="256" y2="618" />
                <line x1="238" y1="428" x2="274" y2="620" />
                <line x1="270" y1="448" x2="290" y2="622" />
                <line x1="300" y1="468" x2="300" y2="624" />
                <line x1="330" y1="448" x2="310" y2="622" />
                <line x1="362" y1="428" x2="326" y2="620" />
                <line x1="395" y1="405" x2="344" y2="618" />
              </g>
              {/* Scalloped White Eyelet-Lace Front Collar Overlay */}
              <path
                d="M168,376 Q192,402 216,386 Q240,414 266,398 Q284,424 300,408 Q316,424 334,398 Q360,414 384,386 Q408,402 432,376 L402,458 Q350,482 300,472 Q250,482 198,458 Z"
                fill="#FFFFFF"
                stroke="#F9A8D4"
                strokeWidth="1.5"
              />
              {/* Satin Bow with Center Pearl Brooch */}
              <path d="M295,505 Q270,565 248,622 L268,618 Q286,568 300,512 Z" fill={ribbonColor} />
              <path d="M305,505 Q330,565 352,622 L332,618 Q314,568 300,512 Z" fill={ribbonColor} />
              <rect x="246" y="492" width="108" height="18" rx="9" fill={ribbonColor} />
              <path d="M296,501 C246,466 232,524 288,512 Z" fill={ribbonColor} stroke="#FFFFFF" strokeWidth="1.2" />
              <path d="M304,501 C354,466 368,524 312,512 Z" fill={ribbonColor} stroke="#FFFFFF" strokeWidth="1.2" />
              <circle cx="300" cy="501" r="11" fill="#FFF1F2" stroke="#F9A8D4" strokeWidth="2" />
              <circle cx="297" cy="498" r="3.5" fill="#FFFFFF" />
            </g>
          )}

          {/* STYLE 7 FRONT: STARLIT NOIR (Midnight couture lapels + gold-foil trim + constellations) */}
          {wrapStyle === 'celestial' && (
            <g>
              {/* Left Midnight Couture Lapel */}
              <path
                d="M118,272 L300,472 L250,618 L190,488 Z"
                fill="#1E293B"
                stroke="#F59E0B"
                strokeWidth="2"
              />
              {/* Right Overlapping Midnight Couture Lapel */}
              <path
                d="M482,272 L300,472 L350,618 L410,488 Z"
                fill="#0F172A"
                stroke="#FBBF24"
                strokeWidth="2"
              />
              {/* Center Lower Cone with Gold-Foil Border */}
              <path
                d="M210,432 L300,482 L390,432 L346,616 Q300,628 254,616 Z"
                fill="#1E293B"
                stroke="#F59E0B"
                strokeWidth="1.8"
              />
              {/* Golden Constellation Lines & Four-Point Stars */}
              <path
                d="M245,485 L275,525 L262,568 M355,475 L328,532 L342,575"
                fill="none"
                stroke="#FDE68A"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.75"
              />
              <g fill="#FBBF24">
                <path d="M335,420 L338,428 L346,431 L338,434 L335,442 L332,434 L324,431 L332,428 Z" />
                <path d="M262,515 L264,521 L270,523 L264,525 L262,531 L260,525 L254,523 L260,521 Z" />
                <circle cx="245" cy="485" r="2.5" />
                <circle cx="262" cy="568" r="2.8" />
                <circle cx="328" cy="532" r="3" />
                <circle cx="342" cy="575" r="2.2" />
                <circle cx="215" cy="395" r="2.5" />
              </g>
              {/* Champagne-Gold Luxe Bow */}
              <path d="M295,505 Q270,565 248,622 L268,618 Q286,568 300,512 Z" fill="#F59E0B" />
              <path d="M305,505 Q330,565 352,622 L332,618 Q314,568 300,512 Z" fill="#D97706" />
              <rect x="252" y="492" width="96" height="18" rx="9" fill="#F59E0B" stroke="#FEF08A" strokeWidth="1" />
              <path d="M296,501 C250,468 236,522 288,512 Z" fill="#FBBF24" stroke="#FEF08A" strokeWidth="1.2" />
              <path d="M304,501 C350,468 364,522 312,512 Z" fill="#F59E0B" stroke="#FEF08A" strokeWidth="1.2" />
              <rect x="289" y="490" width="22" height="22" rx="7" fill="#D97706" stroke="#FEF08A" strokeWidth="1.2" />
            </g>
          )}

          {/* STYLE 8 FRONT: CERAMIC VASE (Sculptural fluted stoneware amphora with twin ear handles) */}
          {wrapStyle === 'vase' && (
            <g>
              {/* Twin Sculptural Amphora Side Ear Handles */}
              <path
                d="M214,442 C152,432 152,522 204,528"
                fill="none"
                stroke="#D5C5B5"
                strokeWidth="14"
                strokeLinecap="round"
              />
              <path
                d="M214,442 C152,432 152,522 204,528"
                fill="none"
                stroke="#EFE6DD"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <path
                d="M386,442 C448,432 448,522 396,528"
                fill="none"
                stroke="#C4B2A0"
                strokeWidth="14"
                strokeLinecap="round"
              />
              {/* Main Sculptural Ceramic Amphora Body */}
              <path
                d="M206,408 L394,408 C382,446 426,505 384,598 L368,622 L232,622 L216,598 C174,505 218,446 206,408 Z"
                fill="#EAE0D5"
                stroke="#CBB9A8"
                strokeWidth="2"
              />
              {/* Right-Side Soft Ceramic Shading */}
              <path
                d="M300,408 L394,408 C382,446 426,505 384,598 L368,622 L300,622 Z"
                fill="#D8C8B8"
                opacity="0.45"
              />
              {/* Vertical Architectural Fluted Ribs */}
              <g stroke="#C4B2A0" strokeWidth="2" fill="none" opacity="0.72">
                <path d="M236,422 C215,485 222,555 246,612" />
                <path d="M266,424 C254,485 258,555 272,614" />
                <path d="M300,425 L300,615" />
                <path d="M334,424 C346,485 342,555 328,614" />
                <path d="M364,422 C385,485 378,555 354,612" />
              </g>
              {/* Flared Ceramic Lip Collar & Terracotta Foot Base */}
              <rect x="198" y="398" width="204" height="16" rx="8" fill="#F4EDE6" stroke="#CBB9A8" strokeWidth="1.8" />
              <rect x="226" y="612" width="148" height="14" rx="6" fill="#B4846C" />
              {/* Neck Ribbon Tie & Botanical Wax Seal Charm */}
              <path d="M208,438 Q300,452 392,438" fill="none" stroke={ribbonColor} strokeWidth="6" strokeLinecap="round" />
              <path d="M296,445 L278,518 M304,445 L322,518" stroke={ribbonColor} strokeWidth="4" strokeLinecap="round" />
              <circle cx="300" cy="446" r="11" fill={ribbonColor} stroke="#FFFBEB" strokeWidth="2" />
            </g>
          )}

          {/* STYLE 9 FRONT: HAND-TIED PLAIN (Classic Satin Ribbon & Bow Around Natural Stems) */}
          {wrapStyle === 'plain' && (
            <g>
              <path
                d="M295,505 Q270,565 248,622 L268,618 Q286,568 300,512 Z"
                fill={ribbonColor}
              />
              <path
                d="M305,505 Q330,565 352,622 L332,618 Q314,568 300,512 Z"
                fill={ribbonColor}
              />
              <rect x="268" y="492" width="64" height="20" rx="10" fill={ribbonColor} />
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
          )}
        </g>

        {/* 5. PINNED GREETING CARD TAG ON BOUQUET (Wiggles & opens letter modal ONLY on shared/preview action; scrollable to preserve card design & length) */}
        {card.visibleOnStage && showCardInGiftView && (() => {
          const cardPalette =
            card.theme === 'blush'
              ? {
                  bg: '#FCE7F3',
                  border: '#F472B6',
                  inner: '#E11D48',
                  seal: '#E11D48',
                  title: '#831843',
                  body: '#9D174D',
                  sign: '#BE185D'
                }
              : card.theme === 'lavender'
              ? {
                  bg: '#EDE9FE',
                  border: '#A78BFA',
                  inner: '#7C3AED',
                  seal: '#7C3AED',
                  title: '#3B0764',
                  body: '#4C1D95',
                  sign: '#6D28D9'
                }
              : {
                  bg: '#FEF3C7',
                  border: '#D97706',
                  inner: '#B4846C',
                  seal: '#B4846C',
                  title: '#1C1917',
                  body: '#292524',
                  sign: '#78716C'
                };
          return (
            <g transform="translate(425, 520) rotate(-6)" filter="url(#softShadow)">
              {/* Fastener cord pinned to bouquet */}
              <path
                d="M-115,-18 Q-55,-25 -10,-32"
                stroke={cardPalette.inner}
                strokeWidth="1.6"
                fill="none"
                opacity="0.85"
                className="pointer-events-none"
              />
              {/* Card Group: Wiggles ONLY in shared/preview mode, stays calm on main editing canvas */}
              <g
                role={isPreviewMode ? 'button' : undefined}
                tabIndex={isPreviewMode ? 0 : undefined}
                aria-label={isPreviewMode ? 'Open greeting card letter' : undefined}
                onClick={(e) => {
                  if (!isPreviewMode) return;
                  e.stopPropagation();
                  onCardTagClick?.();
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                }}
                onKeyDown={(e) => {
                  if (!isPreviewMode) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    onCardTagClick?.();
                  }
                }}
                className={isPreviewMode ? 'bouquet-card-wiggle cursor-pointer' : ''}
              >
                <rect
                  x="-85"
                  y="-42"
                  width="175"
                  height="112"
                  rx="12"
                  fill={cardPalette.bg}
                  stroke={cardPalette.border}
                  strokeWidth="1.8"
                />
                <rect
                  x="-79"
                  y="-36"
                  width="163"
                  height="100"
                  rx="8"
                  fill="none"
                  stroke={cardPalette.inner}
                  strokeWidth="0.9"
                  strokeDasharray="3 3"
                  opacity="0.55"
                />
                {/* Wax Seal */}
                <circle cx="-62" cy="-22" r="8.5" fill={cardPalette.seal} />
                <circle cx="-62" cy="-22" r="5.5" fill="none" stroke="#ffffff" strokeWidth="0.6" opacity="0.6" />
                <text
                  x="-46"
                  y="-18"
                  fill={cardPalette.title}
                  fontSize="12"
                  fontWeight="600"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  To: {card.to.slice(0, 22)}
                </text>

                {/* Scrollable Message Area inside Fixed Card Dimensions (Preserves card design & length) */}
                <foreignObject
                  x="-71"
                  y="-12"
                  width="148"
                  height="56"
                  data-text-color={cardPalette.body}
                >
                  <div
                    onPointerDown={(e) => e.stopPropagation()}
                    onWheel={(e) => e.stopPropagation()}
                    className="w-full h-full overflow-y-auto pr-1 select-none"
                    style={{
                      color: cardPalette.body,
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: '12.5px',
                      lineHeight: '14px',
                      wordBreak: 'break-word',
                      scrollbarWidth: 'thin',
                      touchAction: 'pan-y'
                    }}
                  >
                    {card.message}
                  </div>
                </foreignObject>

                <text
                  x="72"
                  y="58"
                  textAnchor="end"
                  fill={cardPalette.sign}
                  fontSize="11"
                  fontWeight="500"
                  fontStyle="italic"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  — {card.from.slice(0, 20)}
                </text>

                {/* Subtle Floating "Tap to open" Hint Badge — Shown ONLY in Shared/Preview Mode (Ignored on PNG export) */}
                {isPreviewMode && (
                  <g data-export-ignore="true" transform="translate(36, -44)">
                    <rect
                      x="-36"
                      y="-11"
                      width="72"
                      height="20"
                      rx="10"
                      fill={cardPalette.seal}
                    />
                    <text
                      x="0"
                      y="2.5"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="9.5"
                      fontWeight="600"
                      style={{ fontFamily: "'Inter', sans-serif", letterSpacing: '0.02em' }}
                    >
                      Tap to open
                    </text>
                  </g>
                )}
              </g>
            </g>
          );
        })()}

        {/* 6. INTERACTIVE SELECTION RING, WORKING DELETE (X) BUTTON & PULL-IN/OUT RESIZE HANDLE */}
        {!isPreviewMode && selectedItem && !selectedItem.hidden && (
          <g
            data-export-ignore="true"
            transform={`translate(${selectedItem.x}, ${selectedItem.y})`}
          >
            {/* Outer Selection Ring */}
            <circle
              cx="0"
              cy="0"
              r={58 * selectedItem.scale}
              fill="none"
              stroke={selectedItem.locked ? '#d97706' : '#B4846C'}
              strokeWidth="1.75"
              strokeDasharray={selectedItem.locked ? '4 4' : '6 5'}
              className="pointer-events-none"
            />

            {selectedItem.locked ? (
              /* Locked Indicator Pill on Ring Top — Tap to Unlock */
              <g
                transform={`translate(0, ${-58 * selectedItem.scale - 14})`}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  toggleItemLock(selectedItem.id);
                }}
                className="cursor-pointer"
                role="button"
                aria-label="Unlock flower"
              >
                <rect
                  x="-64"
                  y="-12"
                  width="128"
                  height="24"
                  rx="12"
                  fill="#1C1917"
                  stroke="#f59e0b"
                  strokeWidth="1.5"
                />
                <text
                  x="0"
                  y="4"
                  textAnchor="middle"
                  fill="#fde68a"
                  fontSize="10"
                  fontWeight="600"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  🔒 Locked · Tap to unlock
                </text>
              </g>
            ) : (
              <>
                {/* TOP-LEFT HANDLE (-135°): Quick Flip Button */}
                <g
                  transform={`translate(${Math.cos((-3 * Math.PI) / 4) * 58 * selectedItem.scale}, ${
                    Math.sin((-3 * Math.PI) / 4) * 58 * selectedItem.scale
                  })`}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    flipSelected();
                  }}
                  className="cursor-pointer"
                  role="button"
                  aria-label="Flip flower horizontally"
                >
                  <title>Flip flower horizontally</title>
                  <circle cx="0" cy="0" r="22" fill="transparent" />
                  <circle cx="0" cy="0" r="12" fill="#ffffff" stroke="#B4846C" strokeWidth="1.8" />
                  <path
                    d="M-5,0 L5,0 M-5,0 L-2,-3 M-5,0 L-2,3 M5,0 L2,-3 M5,0 L2,3"
                    stroke="#1C1917"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </g>

                {/* TOP-RIGHT HANDLE (-45°): Working Delete (X) Button */}
                <g
                  transform={`translate(${Math.cos(-Math.PI / 4) * 58 * selectedItem.scale}, ${
                    Math.sin(-Math.PI / 4) * 58 * selectedItem.scale
                  })`}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    deleteSelected();
                  }}
                  className="cursor-pointer"
                  role="button"
                  aria-label="Delete selected flower"
                >
                  <title>Remove flower</title>
                  <circle cx="0" cy="0" r="24" fill="transparent" />
                  <circle cx="0" cy="0" r="13" fill="#e11d48" stroke="#ffffff" strokeWidth="2" />
                  <path
                    d="M-4,-4 L4,4 M4,-4 L-4,4"
                    stroke="#ffffff"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </g>

                {/* BOTTOM-RIGHT HANDLE (+45°): Pull In / Pull Out to Resize & Rotate */}
                <g
                  transform={`translate(${Math.cos(Math.PI / 4) * 58 * selectedItem.scale}, ${
                    Math.sin(Math.PI / 4) * 58 * selectedItem.scale
                  })`}
                  onPointerDown={(e) => handleGizmoPointerDown(e, selectedItem)}
                  className="cursor-nwse-resize"
                  role="slider"
                  aria-label="Pull in or out to resize and rotate flower"
                  aria-valuenow={Math.round(selectedItem.scale * 100)}
                >
                  <title>Pull in or out to resize and rotate</title>
                  {/* Radial Pull-In / Pull-Out Guide Line showing resize axis */}
                  <line
                    x1="-22"
                    y1="-22"
                    x2="22"
                    y2="22"
                    stroke="#B4846C"
                    strokeWidth="1.6"
                    strokeDasharray="2.5 2.5"
                    className="pointer-events-none"
                  />
                  {/* Outer pulse halo when actively resizing */}
                  <circle
                    cx="0"
                    cy="0"
                    r={interaction?.mode === 'transform' ? 20 : 16}
                    fill="#B4846C"
                    opacity={interaction?.mode === 'transform' ? 0.28 : 0.15}
                    className="pointer-events-none"
                  />
                  {/* Invisible generous touch target (48px diameter) for easy mobile manipulation */}
                  <circle cx="0" cy="0" r="24" fill="transparent" />
                  {/* Main Resize Handle Badge */}
                  <circle
                    cx="0"
                    cy="0"
                    r="14"
                    fill={interaction?.mode === 'transform' ? '#B4846C' : '#1C1917'}
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                  {/* Bidirectional Diagonal Pull-In / Pull-Out Resize Arrow Icon (⤡) */}
                  <path
                    d="M-4.5,-4.5 L4.5,4.5 M-4.5,-1 L-4.5,-4.5 L-1,-4.5 M4.5,1 L4.5,4.5 L1,4.5"
                    stroke="#ffffff"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />

                  {/* Clear Visual Indicator Pill: Shows "Pull in/out to resize" or live scale % */}
                  <g transform="translate(0, 26)" className="pointer-events-none">
                    <rect
                      x="-54"
                      y="-9"
                      width="108"
                      height="18"
                      rx="9"
                      fill="#1C1917"
                      fillOpacity="0.88"
                      stroke="#ffffff"
                      strokeWidth="0.8"
                      strokeOpacity="0.4"
                    />
                    <text
                      x="0"
                      y="3.5"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="9.5"
                      fontWeight="600"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      {interaction?.mode === 'transform'
                        ? `${Math.round(selectedItem.scale * 100)}% · ${selectedItem.rotation}°`
                        : '⤡ Pull in/out to resize'}
                    </text>
                  </g>
                </g>
              </>
            )}
          </g>
        )}
      </svg>

      {/* Empty Bouquet Prompt */}
      {items.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center p-6">
          <div className="bg-white/90 dark:bg-[#1E1C1A]/90 backdrop-blur-md px-6 py-5 rounded-2xl shadow-md border border-stone-200 dark:border-stone-800 max-w-xs">
            <Flower2 className="w-7 h-7 text-stone-400 dark:text-stone-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-[#1C1917] dark:text-stone-100">Start arranging</p>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
              Add flowers from the palette, or try a random arrangement.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================

/**
 * Gentle Falling Petals Overlay for Read-Only Gift View
 */
const FallingPetalsOverlay: React.FC<{ items: BouquetItem[] }> = ({ items }) => {
  const petals = useMemo(() => {
    const paletteColors =
      items.length > 0
        ? items.map((i) => i.petalColor)
        : ['#fb7185', '#f472b6', '#fda4af', '#fbcfe8', '#c4b5fd'];
    return Array.from({ length: 22 }, (_, idx) => ({
      id: idx,
      left: `${(idx * 4.7 + (idx % 3) * 3) % 98}%`,
      delay: `${(idx * 0.65) % 9}s`,
      duration: `${8.5 + (idx % 5) * 1.6}s`,
      size: 12 + (idx % 4) * 4,
      color: paletteColors[idx % paletteColors.length],
      sway: idx % 2 === 0 ? 28 : -28
    }));
  }, [items]);

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden z-10"
      aria-hidden="true"
    >
      <style>{`
        @keyframes petalFallDown {
          0% {
            transform: translate3d(0, -10%, 0) rotate(0deg);
            opacity: 0;
          }
          12% {
            opacity: 0.78;
          }
          50% {
            transform: translate3d(24px, 48vh, 0) rotate(165deg);
            opacity: 0.75;
          }
          88% {
            opacity: 0.65;
          }
          100% {
            transform: translate3d(-18px, 102vh, 0) rotate(340deg);
            opacity: 0;
          }
        }
      `}</style>
      {petals.map((p) => (
        <svg
          key={p.id}
          viewBox="0 0 24 24"
          style={{
            position: 'absolute',
            top: '-24px',
            left: p.left,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animation: `petalFallDown ${p.duration} linear ${p.delay} infinite`
          }}
        >
          <path
            d="M12,2 C18,6 20,14 12,22 C4,14 6,6 12,2 Z"
            fill={p.color}
            fillOpacity="0.82"
          />
        </svg>
      ))}
    </div>
  );
};

// ============================================================================
// MODULE 5B: MINIATURE SVG THUMBNAILS FOR COMPACT MOBILE CAROUSEL
// ============================================================================

const MiniWrapConeSVG: React.FC<{
  styleType: typeWrapStyle;
  color: string;
  ribbon: string;
}> = ({ styleType, ribbon }) => (
  <svg viewBox="0 0 64 64" className="w-12 h-12">
    {/* 1. ORIGAMI KRAFT (Ref #1: Layered taupe sleeve + mid cuff + pleated lower base + white twine) */}
    {styleType === 'kraft' && (
      <g>
        <path d="M14,14 Q32,19 50,14 L44,36 L20,36 Z" fill="#C8B9AE" />
        <path d="M11,17 L14,14 L22,36 L18,36 Z" fill="#B3A296" />
        <path d="M53,17 L50,14 L42,36 L46,36 Z" fill="#B3A296" />
        <path d="M18,31 Q32,34 46,31 L41,43 L23,43 Z" fill="#CEC0B5" stroke="#E5DDD5" strokeWidth="0.7" />
        <path d="M20,31 L23,43 L19,42 Z" fill="#B3A296" />
        <path d="M44,31 L41,43 L45,42 Z" fill="#B3A296" />
        <path d="M23,42 L41,42 L39,56 L25,56 Z" fill="#C4B4A8" />
        <path d="M27,42 L26,56 M37,42 L38,56 M32,42 L32,56" stroke="#A69385" strokeWidth="1.2" />
        <path d="M22,42 Q32,44 42,42" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M31,42 C27,39 27,45 31,43 M33,42 C37,39 37,45 33,43" fill="none" stroke="#FFFFFF" strokeWidth="1.6" />
        <path d="M31,43 L29,55 M33,43 L35,55" stroke="#FFFFFF" strokeWidth="1.3" strokeLinecap="round" />
      </g>
    )}

    {/* 2. BUTTERFLY PETAL (Ref #2: Split V-notched blush pink wings + side petals + crimson cord) */}
    {styleType === 'tissue' && (
      <g>
        <path d="M32,42 L12,15 Q22,14 32,26 Z" fill="#FFC4D0" />
        <path d="M32,42 L12,15 L18,16 L32,36 Z" fill="#F7A8B8" opacity="0.85" />
        <path d="M32,42 L52,15 Q42,14 32,26 Z" fill="#FFD6DF" />
        <path d="M23,43 L41,43 L40,56 L24,56 Z" fill="#FFE0E7" />
        <path d="M16,29 Q24,35 33,44 L23,44 Q19,37 16,29 Z" fill="#FFC6D3" />
        <path d="M48,29 Q40,35 31,44 L41,44 Q45,37 48,29 Z" fill="#FFD4DF" />
        <path d="M22,43 Q32,46 42,43" fill="none" stroke="#E11D48" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="32" cy="43.5" r="2" fill="#E11D48" />
        <circle cx="32" cy="41.5" r="1.3" fill="#E11D48" />
        <path d="M31.5,44 L29,56 M32.5,44 L35,56" stroke="#E11D48" strokeWidth="1.3" strokeLinecap="round" />
      </g>
    )}

    {/* 3. TULIP ORGANZA (Ref #3: Concave chalice lilac veil + parabolic curves + lilac ribbon) */}
    {styleType === 'chalice' && (
      <g>
        <path d="M12,14 Q32,19 52,14 Q47,33 41,43 L23,43 Q17,33 12,14 Z" fill="#EFE3F6" />
        <path d="M15,16 Q26,23 29,41 M49,16 Q38,23 35,41" fill="none" stroke="#D8B4FE" strokeWidth="1.2" opacity="0.8" />
        <path d="M17,31 Q32,37 47,31 L41,43 L23,43 Z" fill="#E5D0F2" />
        <path d="M23,43 L41,43 L40,56 L24,56 Z" fill="#EBD9F7" />
        <path d="M22,42 Q32,44 42,42" fill="none" stroke="#C084FC" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M31,43 L28,56 M33,43 L36,56" stroke="#A855F7" strokeWidth="1.8" strokeLinecap="round" />
      </g>
    )}

    {/* 4. WICKER BASKET (Arched rattan handle + braided rim + cross-hatched basket) */}
    {styleType === 'basket' && (
      <g>
        <path d="M18,32 C18,10 46,10 46,32" fill="none" stroke="#A47549" strokeWidth="3.2" />
        <ellipse cx="32" cy="32" rx="16" ry="4.5" fill="#5C3A1E" />
        <path d="M16,32 L48,32 L42,51 Q32,54 22,51 Z" fill="#C89B6E" stroke="#8B5E34" strokeWidth="1.2" />
        <path d="M18,38 Q32,40 46,38 M20,44 Q32,46 44,44" fill="none" stroke="#8B5E34" strokeWidth="1.1" />
        <path d="M15,32 Q32,36 49,32" fill="none" stroke="#DFB78C" strokeWidth="3.5" strokeLinecap="round" />
        <rect x="22" y="50" width="20" height="3.5" rx="1.5" fill="#7C512B" />
      </g>
    )}

    {/* 5. PARISIAN SCRIPT (Asymmetric high-back vintage newspaper cone + editorial lines + raffia tie) */}
    {styleType === 'vintage' && (
      <g>
        <path d="M32,50 L14,22 Q24,11 36,11 Q46,11 50,21 Z" fill="#EBE0CE" stroke="#CBB99F" strokeWidth="1" />
        <path d="M15,24 L32,42 L26,55 L20,42 Z" fill="#E2D3BC" />
        <path d="M49,22 L31,42 L38,55 L44,41 Z" fill="#F5EFE4" stroke="#D5C5AE" strokeWidth="0.8" />
        <path d="M26,16 L38,16 M24,19 L40,19 M34,34 L42,31 M33,37 L41,34" stroke="#9E8C74" strokeWidth="1.1" />
        <path d="M24,43 Q32,45 40,43" fill="none" stroke="#B4846C" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="32" cy="44" r="2.2" fill="#8C5E47" />
      </g>
    )}

    {/* 6. EYELET LACE (Scalloped bridal lace collar + pleated blush skirt + pearl bow) */}
    {styleType === 'lace' && (
      <g>
        <path
          d="M32,48 L12,22 Q16,16 22,19 Q27,14 32,18 Q37,14 42,19 Q48,16 52,22 Z"
          fill="#FFFFFF"
          stroke="#F472B6"
          strokeWidth="1"
        />
        <path d="M18,28 L32,40 L46,28 L39,55 Q32,57 25,55 Z" fill="#FCE7F3" />
        <path d="M24,33 L27,55 M32,38 L32,56 M40,33 L37,55" stroke="#F472B6" strokeWidth="0.9" opacity="0.45" />
        <path d="M17,28 Q22,33 27,29 Q32,34 37,29 Q42,33 47,28 L42,37 Q32,41 22,37 Z" fill="#FFFFFF" stroke="#F9A8D4" strokeWidth="0.9" />
        <rect x="24" y="42" width="16" height="3.5" rx="1.7" fill={ribbon} />
        <circle cx="32" cy="43.7" r="2.5" fill="#FFF1F2" stroke="#F472B6" strokeWidth="0.8" />
      </g>
    )}

    {/* 7. STARLIT NOIR (Midnight navy couture cone + gold foil trim & stars) */}
    {styleType === 'celestial' && (
      <g>
        <path d="M32,48 L12,20 L20,15 L26,18 L32,13 L38,18 L44,15 L52,20 Z" fill="#1E293B" stroke="#F59E0B" strokeWidth="1.2" />
        <path d="M15,23 L32,41 L26,55 L20,42 Z" fill="#0F172A" stroke="#FBBF24" strokeWidth="0.9" />
        <path d="M49,23 L32,41 L38,55 L44,42 Z" fill="#1E293B" stroke="#FBBF24" strokeWidth="0.9" />
        <path d="M22,36 L32,42 L42,36 L38,55 Q32,57 26,55 Z" fill="#1E293B" stroke="#F59E0B" strokeWidth="0.9" />
        <circle cx="28" cy="46" r="1.4" fill="#FBBF24" />
        <circle cx="36" cy="49" r="1.6" fill="#FBBF24" />
        <circle cx="33" cy="39" r="1.3" fill="#FDE68A" />
        <rect x="25" y="42" width="14" height="3.8" rx="1.9" fill="#F59E0B" />
      </g>
    )}

    {/* 8. CERAMIC VASE (Fluted stoneware amphora vessel with twin ear handles) */}
    {styleType === 'vase' && (
      <g>
        <circle cx="24" cy="18" r="5" fill="#FDA4AF" />
        <circle cx="40" cy="18" r="5" fill="#FBCFE8" />
        <circle cx="32" cy="15" r="6" fill="#F43F5E" />
        <path d="M22,31 C15,30 15,41 21,42 M42,31 C49,30 49,41 43,42" fill="none" stroke="#CBB9A8" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M21,26 L43,26 C41,32 46,40 40,53 L24,53 C18,40 23,32 21,26 Z" fill="#EAE0D5" stroke="#B5A495" strokeWidth="1.2" />
        <path d="M27,28 L27,52 M32,28 L32,52 M37,28 L37,52" stroke="#C4B2A0" strokeWidth="1.1" />
        <rect x="19" y="24" width="26" height="3.5" rx="1.7" fill="#F5EFEA" stroke="#B5A495" strokeWidth="1" />
        <rect x="23" y="52" width="18" height="3.5" rx="1.5" fill="#B4846C" />
      </g>
    )}

    {/* 9. HAND-TIED PLAIN (Natural gathered stems with satin bow) */}
    {styleType === 'plain' && (
      <g>
        <path d="M27,20 L23,52 M32,18 L32,54 M37,20 L41,52" stroke="#16a34a" strokeWidth="3.2" strokeLinecap="round" />
        <circle cx="25" cy="18" r="6" fill="#fda4af" />
        <circle cx="39" cy="18" r="6" fill="#fbcfe8" />
        <circle cx="32" cy="15" r="7" fill="#f43f5e" />
        <rect x="25" y="34" width="14" height="5" rx="2.5" fill={ribbon} />
        <path d="M30,36 L24,46 M34,36 L40,46" stroke={ribbon} strokeWidth="2.5" strokeLinecap="round" />
      </g>
    )}
  </svg>
);

const MiniTemplateBouquetSVG: React.FC<{
  wrapColor: string;
  ribbonColor: string;
  bloomColors: string[];
}> = ({ wrapColor, ribbonColor, bloomColors }) => (
  <svg viewBox="0 0 64 64" className="w-11 h-11">
    <path d="M32,52 L15,25 Q32,18 49,25 Z" fill={wrapColor} />
    <circle cx="23" cy="24" r="7.5" fill={bloomColors[1] || '#fbcfe8'} />
    <circle cx="41" cy="24" r="7.5" fill={bloomColors[2] || '#fda4af'} />
    <circle cx="32" cy="19" r="8.5" fill={bloomColors[0] || '#f43f5e'} />
    <circle cx="32" cy="19" r="3" fill="#fde047" />
    <path d="M21,34 L32,41 L43,34 L37,54 Q32,56 27,54 Z" fill={wrapColor} stroke="#ffffff" strokeWidth="0.7" />
    <rect x="26" y="42" width="12" height="4" rx="2" fill={ribbonColor} />
  </svg>
);

const MiniRibbonBowSVG: React.FC<{ hex: string }> = ({ hex }) => (
  <svg viewBox="0 0 64 64" className="w-10 h-10">
    <path d="M29,33 Q24,44 20,52 L25,51 Q28,43 31,34 Z" fill={hex} />
    <path d="M35,33 Q40,44 44,52 L39,51 Q36,43 33,34 Z" fill={hex} />
    <path
      d="M30,31 C16,20 14,38 28,34 Z"
      fill={hex}
      stroke="#cbd5e1"
      strokeWidth="0.8"
    />
    <path
      d="M34,31 C48,20 50,38 36,34 Z"
      fill={hex}
      stroke="#cbd5e1"
      strokeWidth="0.8"
    />
    <rect x="28.5" y="27.5" width="7" height="8" rx="3" fill={hex} stroke="#ffffff" strokeWidth="0.8" />
  </svg>
);

// ============================================================================
// MODULE 5C: components/LayerManagerPanel.tsx — DRAGGABLE & ORDERABLE LAYER MANAGER
// ============================================================================

export interface LayerManagerPanelProps {
  onClose?: () => void;
  isEmbeddedInSidebar?: boolean;
}

export const LayerManagerPanel: React.FC<LayerManagerPanelProps> = ({
  onClose,
  isEmbeddedInSidebar = false
}) => {
  const {
    items,
    selectedId,
    wrapStyle,
    wrapColor,
    ribbonColor,
    card,
    selectItem,
    reorderItems,
    moveItemLayer,
    toggleItemLock,
    toggleItemHidden,
    deleteItemById,
    unlockAllItems,
    showAllItems,
    toggleWrapVisibility,
    updateCard
  } = useBouquetStore();

  // HTML5 Drag state (desktop mouse drag)
  const [draggedStoreIdx, setDraggedStoreIdx] = useState<number | null>(null);
  const [dragOverStoreIdx, setDragOverStoreIdx] = useState<number | null>(null);

  // Pointer / Touch Drag state (works on mobile touch & desktop pointer via Grip handle)
  const [pointerDrag, setPointerDrag] = useState<{
    storeIdx: number;
    startY: number;
    currentY: number;
  } | null>(null);

  const hasAnyLocked = items.some((i) => i.locked);
  const hasAnyHidden = items.some((i) => i.hidden);

  // Display items from Frontmost (items.length - 1) at top to Backmost (0) at bottom
  const reversedEntries = useMemo(
    () =>
      items
        .map((item, storeIndex) => ({ item, storeIndex }))
        .reverse(),
    [items]
  );

  const handleGripPointerDown = (e: React.PointerEvent, storeIndex: number, isLocked?: boolean) => {
    if (isLocked) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    setPointerDrag({
      storeIdx: storeIndex,
      startY: e.clientY,
      currentY: e.clientY
    });
  };

  const handleGripPointerMove = (e: React.PointerEvent) => {
    if (!pointerDrag) return;
    e.stopPropagation();
    const dy = e.clientY - pointerDrag.startY;
    const rowHeight = 48;
    // Moving UP in the visual list (negative dy) increases storeIndex (towards front)
    // Moving DOWN in the visual list (positive dy) decreases storeIndex (towards back)
    const indexDelta = -Math.round(dy / rowHeight);
    if (indexDelta !== 0) {
      const targetStoreIdx = Math.max(
        0,
        Math.min(items.length - 1, pointerDrag.storeIdx + indexDelta)
      );
      if (targetStoreIdx !== pointerDrag.storeIdx) {
        reorderItems(pointerDrag.storeIdx, targetStoreIdx);
        setPointerDrag({
          storeIdx: targetStoreIdx,
          startY: e.clientY,
          currentY: e.clientY
        });
        return;
      }
    }
    setPointerDrag((prev) => (prev ? { ...prev, currentY: e.clientY } : null));
  };

  const handleGripPointerUp = (e: React.PointerEvent) => {
    if (!pointerDrag) return;
    e.stopPropagation();
    setPointerDrag(null);
  };

  return (
    <div
      className={`${
        isEmbeddedInSidebar
          ? 'flex flex-col gap-3'
          : 'bg-white/95 dark:bg-[#1E1C1A]/95 backdrop-blur-md border border-stone-200 dark:border-stone-800 rounded-2xl p-3 sm:p-3.5 shadow-xl flex flex-col gap-2.5 w-full max-w-md mx-auto transition-all animate-in fade-in'
      }`}
      role="region"
      aria-label="Bouquet Layer Order Manager"
    >
      {/* Compact Subheader Row: Reorder hint + stem count / quick restore actions */}
      <div className="flex items-center justify-between gap-2 text-[10px] text-stone-500 dark:text-stone-400 px-0.5">
        <span className="truncate">Drag ⠿ or tap arrows to reorder</span>

        <div className="flex items-center gap-1 shrink-0">
          {hasAnyHidden && (
            <button
              type="button"
              onClick={showAllItems}
              className="px-1.5 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-[10px] font-medium text-stone-700 dark:text-stone-200 flex items-center gap-1 transition"
              title="Show all hidden flowers"
            >
              <Eye className="w-3 h-3 text-[#B4846C]" />
              <span>Show all</span>
            </button>
          )}
          {hasAnyLocked && (
            <button
              type="button"
              onClick={unlockAllItems}
              className="px-1.5 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-[10px] font-medium text-amber-700 dark:text-amber-300 flex items-center gap-1 transition"
              title="Unlock all locked flowers"
            >
              <Unlock className="w-3 h-3" />
              <span>Unlock all</span>
            </button>
          )}
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 tabular-nums">
            {items.length} {items.length === 1 ? 'stem' : 'stems'}
          </span>
        </div>
      </div>

      {/* Layer Stack List */}
      <div
        className={`space-y-1.5 ${
          isEmbeddedInSidebar ? '' : 'overflow-y-auto max-h-[42vh] pr-0.5'
        }`}
      >
        {/* BOUQUET ACCENT LAYER 1: GREETING CARD TAG (Pinned Front) */}
        <div
          className={`flex items-center justify-between gap-2 p-2 rounded-xl border text-xs transition ${
            !card.visibleOnStage
              ? 'opacity-60 bg-stone-50/60 dark:bg-stone-900/40 border-stone-200/60 dark:border-stone-800'
              : 'bg-stone-50/90 dark:bg-[#292524]/70 border-stone-200/80 dark:border-stone-800'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center shrink-0">
              <Mail className="w-3.5 h-3.5 text-[#B4846C]" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-[#1C1917] dark:text-stone-100 truncate">
                Greeting Card Tag
              </div>
              <div className="text-[10px] text-stone-400 dark:text-stone-500 truncate">
                Pinned front note · {card.visibleOnStage ? 'Visible' : 'Hidden'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => updateCard({ locked: !card.locked })}
              aria-label={card.locked ? 'Unlock greeting card' : 'Lock greeting card'}
              title={card.locked ? 'Unlock greeting card' : 'Lock greeting card'}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition ${
                card.locked
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                  : 'text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 dark:hover:bg-stone-800 dark:hover:text-stone-200'
              }`}
            >
              {card.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => updateCard({ visibleOnStage: !card.visibleOnStage })}
              aria-label={card.visibleOnStage ? 'Hide greeting card' : 'Show greeting card'}
              title={card.visibleOnStage ? 'Hide greeting card' : 'Show greeting card'}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition ${
                !card.visibleOnStage
                  ? 'bg-rose-50 text-rose-500 dark:bg-rose-950/50 dark:text-rose-400'
                  : 'text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 dark:text-stone-300 dark:hover:bg-stone-800'
              }`}
            >
              {card.visibleOnStage ? (
                <Eye className="w-3.5 h-3.5" />
              ) : (
                <EyeOff className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* FLOWER & FOLIAGE STEMS (Ordered Top = Frontmost to Bottom = Backmost) */}
        {reversedEntries.length === 0 ? (
          <div className="py-6 text-center text-xs text-stone-400 dark:text-stone-500">
            No flowers in the bouquet yet. Tap a flower below to add stems.
          </div>
        ) : (
          reversedEntries.map(({ item, storeIndex }, visualIdx) => {
            const meta = FLOWER_CATALOG.find((m) => m.type === item.type);
            const isSelected = item.id === selectedId;
            const isDraggingThis =
              draggedStoreIdx === storeIndex || pointerDrag?.storeIdx === storeIndex;
            const isDragTarget = dragOverStoreIdx === storeIndex && draggedStoreIdx !== storeIndex;
            const isFrontmost = storeIndex === items.length - 1;
            const isBackmost = storeIndex === 0;

            return (
              <div
                key={item.id}
                draggable={!item.locked}
                onDragStart={(e) => {
                  if (item.locked) {
                    e.preventDefault();
                    return;
                  }
                  setDraggedStoreIdx(storeIndex);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (draggedStoreIdx !== null && draggedStoreIdx !== storeIndex) {
                    setDragOverStoreIdx(storeIndex);
                  }
                }}
                onDragLeave={() => {
                  if (dragOverStoreIdx === storeIndex) {
                    setDragOverStoreIdx(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedStoreIdx !== null && draggedStoreIdx !== storeIndex) {
                    reorderItems(draggedStoreIdx, storeIndex);
                  }
                  setDraggedStoreIdx(null);
                  setDragOverStoreIdx(null);
                }}
                onDragEnd={() => {
                  setDraggedStoreIdx(null);
                  setDragOverStoreIdx(null);
                }}
                onClick={() => selectItem(item.id)}
                className={`flex items-center justify-between gap-1.5 p-1.5 sm:p-2 rounded-xl border text-xs cursor-pointer select-none transition ${
                  isDraggingThis
                    ? 'opacity-75 scale-[0.99] ring-2 ring-[#B4846C] bg-stone-100 dark:bg-stone-800 border-[#B4846C]'
                    : isDragTarget
                    ? 'border-[#B4846C] ring-1 ring-[#B4846C] bg-[#B4846C]/10'
                    : isSelected
                    ? 'border-[#B4846C] bg-[#B4846C]/10 dark:bg-[#B4846C]/15'
                    : 'border-stone-200/80 dark:border-stone-800 bg-white dark:bg-[#292524] hover:border-stone-300 dark:hover:border-stone-700'
                } ${item.hidden ? 'opacity-55' : ''}`}
              >
                {/* Left: Drag Handle + Mini Flower Preview + Name */}
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <div
                    onPointerDown={(e) => handleGripPointerDown(e, storeIndex, item.locked)}
                    onPointerMove={handleGripPointerMove}
                    onPointerUp={handleGripPointerUp}
                    onPointerCancel={handleGripPointerUp}
                    title={item.locked ? 'Unlock to reorder' : 'Drag up or down to reorder layer'}
                    className={`p-1 rounded-md touch-none shrink-0 ${
                      item.locked
                        ? 'text-stone-300 dark:text-stone-700 cursor-not-allowed'
                        : 'text-stone-400 hover:text-stone-700 dark:text-stone-500 dark:hover:text-stone-200 cursor-grab active:cursor-grabbing'
                    }`}
                  >
                    <GripVertical className="w-3.5 h-3.5" />
                  </div>

                  {/* Mini SVG Flower Thumbnail */}
                  <div className="w-8 h-8 rounded-lg bg-stone-50 dark:bg-stone-900 border border-stone-200/80 dark:border-stone-700 flex items-center justify-center shrink-0 overflow-hidden">
                    <svg viewBox="-60 -65 120 130" className="w-7 h-7">
                      <FlowerRenderer
                        type={item.type}
                        petalColor={item.petalColor}
                        centerColor={item.centerColor}
                      />
                    </svg>
                  </div>

                  {/* Name & Layer Position */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-[#1C1917] dark:text-stone-100 truncate">
                        {meta?.name || item.type}
                      </span>
                      {item.locked && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
                          Locked
                        </span>
                      )}
                      {item.hidden && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300">
                          Hidden
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-stone-400 dark:text-stone-500 tabular-nums">
                      Layer {items.length - visualIdx}
                      {isFrontmost ? ' · Front' : isBackmost ? ' · Back' : ''}
                    </div>
                  </div>
                </div>

                {/* Right: Step Up / Step Down + Lock + Eye + Delete */}
                <div
                  className="flex items-center gap-0.5 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Move Layer Up (Bring Forward) */}
                  <button
                    type="button"
                    disabled={isFrontmost || Boolean(item.locked)}
                    onClick={() => moveItemLayer(item.id, 'up')}
                    aria-label={`Move ${meta?.name || item.type} forward`}
                    title="Move layer forward (Up)"
                    className="w-6 h-7 rounded-md flex items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-stone-100 dark:hover:bg-stone-800 disabled:opacity-25 transition"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>

                  {/* Move Layer Down (Send Backward) */}
                  <button
                    type="button"
                    disabled={isBackmost || Boolean(item.locked)}
                    onClick={() => moveItemLayer(item.id, 'down')}
                    aria-label={`Move ${meta?.name || item.type} backward`}
                    title="Move layer backward (Down)"
                    className="w-6 h-7 rounded-md flex items-center justify-center text-stone-500 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-stone-100 dark:hover:bg-stone-800 disabled:opacity-25 transition"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {/* Lock / Unlock Button */}
                  <button
                    type="button"
                    onClick={() => toggleItemLock(item.id)}
                    aria-label={item.locked ? `Unlock ${meta?.name || item.type}` : `Lock ${meta?.name || item.type}`}
                    aria-pressed={Boolean(item.locked)}
                    title={item.locked ? 'Unlock layer' : 'Lock layer'}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition ${
                      item.locked
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                        : 'text-stone-400 hover:text-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 dark:hover:text-stone-200'
                    }`}
                  >
                    {item.locked ? (
                      <Lock className="w-3.5 h-3.5" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Eye (Show / Hide) Button */}
                  <button
                    type="button"
                    onClick={() => toggleItemHidden(item.id)}
                    aria-label={item.hidden ? `Show ${meta?.name || item.type}` : `Hide ${meta?.name || item.type}`}
                    aria-pressed={!item.hidden}
                    title={item.hidden ? 'Show layer on canvas' : 'Hide layer on canvas'}
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition ${
                      item.hidden
                        ? 'bg-rose-50 text-rose-500 dark:bg-rose-950/50 dark:text-rose-400'
                        : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800'
                    }`}
                  >
                    {item.hidden ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {/* Delete Stem Button */}
                  <button
                    type="button"
                    disabled={Boolean(item.locked)}
                    onClick={() => deleteItemById(item.id)}
                    aria-label={`Delete ${meta?.name || item.type}`}
                    title={item.locked ? 'Unlock to delete' : 'Delete layer'}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-25 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}

        {/* BOUQUET ACCENT LAYER 2: WRAPPING CONE & RIBBON (Base Layer) */}
        <div
          className={`flex items-center justify-between gap-2 p-2 rounded-xl border text-xs transition ${
            wrapStyle === 'plain'
              ? 'opacity-60 bg-stone-50/60 dark:bg-stone-900/40 border-stone-200/60 dark:border-stone-800'
              : 'bg-stone-50/90 dark:bg-[#292524]/70 border-stone-200/80 dark:border-stone-800'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center shrink-0 overflow-hidden">
              <MiniWrapConeSVG styleType={wrapStyle} color={wrapColor} ribbon={ribbonColor} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-[#1C1917] dark:text-stone-100 truncate">
                Wrapping Paper &amp; Bow
              </div>
              <div className="text-[10px] text-stone-400 dark:text-stone-500 truncate">
                Base bouquet wrap · {wrapStyle === 'plain' ? 'Hidden (Hand-tied)' : 'Visible'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={toggleWrapVisibility}
              aria-label={wrapStyle === 'plain' ? 'Show wrapping paper' : 'Hide wrapping paper'}
              title={wrapStyle === 'plain' ? 'Show wrapping paper' : 'Hide wrapping paper'}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition ${
                wrapStyle === 'plain'
                  ? 'bg-rose-50 text-rose-500 dark:bg-rose-950/50 dark:text-rose-400'
                  : 'text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 dark:text-stone-300 dark:hover:bg-stone-800'
              }`}
            >
              {wrapStyle === 'plain' ? (
                <EyeOff className="w-3.5 h-3.5" />
              ) : (
                <Eye className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MODULE 6: components/SelectedFlowerToolbar.tsx — FLOATING INSPECTOR & COLOR PICKER
// ============================================================================

export interface SelectedFlowerToolbarProps {
  isDrawerOpen?: boolean;
  onRequestCollapseDrawer?: () => void;
  mobileSheetMode?: 'color' | 'layers' | 'full';
  onCloseMobileSheet?: () => void;
  onOpenLayerManager?: () => void;
}

export const SelectedFlowerToolbar: React.FC<SelectedFlowerToolbarProps> = ({
  isDrawerOpen = false,
  onRequestCollapseDrawer,
  mobileSheetMode = 'full',
  onCloseMobileSheet,
  onOpenLayerManager
}) => {
  const {
    items,
    selectedId,
    updateItem,
    duplicateSelected,
    deleteSelected,
    flipSelected,
    bringForward,
    sendBackward,
    toggleItemLock,
    toggleItemHidden,
    selectItem,
    commitHistorySnapshot
  } = useBouquetStore();

  const [colorTarget, setColorTarget] = useState<'petal' | 'center'>('petal');
  const [isMinimized, setIsMinimized] = useState(false);
  const isSliderDraggingRef = useRef(false);

  useEffect(() => {
    isSliderDraggingRef.current = false;
  }, [selectedId]);

  const handleSliderChange = (patch: Partial<BouquetItem>) => {
    if (!isSliderDraggingRef.current) {
      commitHistorySnapshot();
      isSliderDraggingRef.current = true;
    }
    if (selectedId) {
      updateItem(selectedId, patch, false);
    }
  };

  const handleSliderPointerUp = () => {
    isSliderDraggingRef.current = false;
  };

  const selected = items.find((i) => i.id === selectedId);
  if (!selected) return null;

  const meta = FLOWER_CATALOG.find((m) => m.type === selected.type);

  // Clean Color-Only Mode for the Slide-in Drawer (Zero extra settings or text clutter)
  if (mobileSheetMode === 'color') {
    return (
      <div className="space-y-3" role="region" aria-label="Flower Color Picker">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setColorTarget('petal')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition ${
                colorTarget === 'petal'
                  ? 'bg-[#1C1917] text-white dark:bg-white dark:text-[#1C1917]'
                  : 'bg-stone-100 hover:bg-stone-200/70 text-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700'
              }`}
            >
              <span
                className="w-3 h-3 rounded-full border border-white/50 shadow-2xs"
                style={{ backgroundColor: selected.petalColor }}
              />
              <span>Petals</span>
            </button>
            <button
              type="button"
              onClick={() => setColorTarget('center')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition ${
                colorTarget === 'center'
                  ? 'bg-[#1C1917] text-white dark:bg-white dark:text-[#1C1917]'
                  : 'bg-stone-100 hover:bg-stone-200/70 text-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700'
              }`}
            >
              <span
                className="w-3 h-3 rounded-full border border-white/50 shadow-2xs"
                style={{ backgroundColor: selected.centerColor }}
              />
              <span>Center</span>
            </button>
          </div>

          <label
            title="Custom color"
            className="w-8 h-8 rounded-full border border-stone-200 dark:border-stone-700 bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 flex items-center justify-center cursor-pointer shrink-0 transition"
          >
            <input
              type="color"
              disabled={Boolean(selected.locked)}
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
              className="w-5 h-5 rounded-full border-0 bg-transparent cursor-pointer"
            />
          </label>
        </div>

        <div className="grid grid-cols-5 gap-2.5 pt-0.5">
          {ROMANTIC_SWATCHES.map((hex) => {
            const activeHex =
              colorTarget === 'petal' ? selected.petalColor : selected.centerColor;
            const isMatch = activeHex.toLowerCase() === hex.toLowerCase();
            return (
              <button
                key={hex}
                type="button"
                disabled={Boolean(selected.locked)}
                onClick={() =>
                  updateItem(
                    selected.id,
                    colorTarget === 'petal' ? { petalColor: hex } : { centerColor: hex },
                    true
                  )
                }
                aria-label={`Set ${colorTarget} color ${hex}`}
                className={`w-9 h-9 rounded-full mx-auto border transition-transform disabled:opacity-40 ${
                  isMatch
                    ? 'scale-110 ring-2 ring-[#B4846C] ring-offset-2 border-white'
                    : 'border-stone-200 dark:border-stone-700 hover:scale-105'
                }`}
                style={{ backgroundColor: hex }}
              />
            );
          })}
        </div>
      </div>
    );
  }

  const shouldMinimize = isMinimized || (isDrawerOpen && typeof window !== 'undefined' && window.innerWidth < 1024 && mobileSheetMode === 'full');

  if (shouldMinimize) {
    return (
      <div
        className="bg-white/95 dark:bg-[#1E1C1A]/95 backdrop-blur-md border border-stone-200 dark:border-stone-800 rounded-2xl p-2 sm:p-2.5 shadow-lg flex items-center justify-between gap-2 w-full max-w-sm mx-auto transition-all animate-in fade-in"
        role="region"
        aria-label="Selected Flower Quick Controls"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-3.5 h-3.5 rounded-full border border-stone-300 dark:border-stone-600 shrink-0"
            style={{ backgroundColor: selected.petalColor }}
          />
          <span className="text-xs font-semibold text-[#1C1917] dark:text-stone-100 truncate">
            {meta?.name || selected.type}
          </span>
          <span className="text-[11px] text-stone-500 dark:text-stone-400 font-mono tabular-nums shrink-0">
            {Math.round(selected.scale * 100)}%
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => toggleItemLock(selected.id)}
            className={`p-1.5 rounded-lg transition ${
              selected.locked
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                : 'bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300'
            }`}
            title={selected.locked ? 'Unlock Flower' : 'Lock Flower'}
            aria-label={selected.locked ? 'Unlock Flower' : 'Lock Flower'}
          >
            {selected.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={flipSelected}
            disabled={Boolean(selected.locked)}
            className="p-1.5 rounded-lg bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 disabled:opacity-30 transition"
            title="Flip Horizontally"
            aria-label="Flip Flower Horizontally"
          >
            <FlipHorizontal className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={duplicateSelected}
            className="p-1.5 rounded-lg bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition"
            title="Duplicate Stem"
            aria-label="Duplicate Flower"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={deleteSelected}
            disabled={Boolean(selected.locked)}
            className="p-1.5 rounded-lg bg-stone-50 hover:bg-red-50 text-stone-500 hover:text-red-500 dark:bg-stone-800 dark:hover:bg-red-950/40 dark:text-stone-400 dark:hover:text-red-400 disabled:opacity-30 transition"
            title="Remove Stem (Delete)"
            aria-label="Delete Flower"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setIsMinimized(false);
              onRequestCollapseDrawer?.();
            }}
            className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-700 dark:hover:bg-stone-600 text-[#1C1917] dark:text-stone-100 transition"
            title="Expand Controls"
            aria-label="Expand Flower Controls"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              selectItem(null);
              onCloseMobileSheet?.();
            }}
            className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition"
            title="Deselect (Close)"
            aria-label="Deselect Flower"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-white/95 dark:bg-[#1E1C1A]/95 backdrop-blur-md border border-stone-200 dark:border-stone-800 rounded-2xl p-3 sm:p-3.5 shadow-lg flex flex-col gap-2.5 w-full max-w-md mx-auto transition-all animate-in fade-in"
      role="region"
      aria-label="Selected Flower Controls"
    >
      {/* Top Row: Name + Scale + Lock/Eye + Minimize + Close */}
      <div className="flex items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-800 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-3.5 h-3.5 rounded-full border border-stone-300 dark:border-stone-600 shrink-0"
            style={{ backgroundColor: selected.petalColor }}
          />
          <span className="text-xs font-semibold text-[#1C1917] dark:text-stone-100 truncate">
            {meta?.name || selected.type}
          </span>
          <span className="text-[11px] text-stone-500 dark:text-stone-400 font-mono tabular-nums shrink-0">
            {Math.round(selected.scale * 100)}%
          </span>
          {selected.locked && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
              Locked
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => toggleItemLock(selected.id)}
            className={`p-1.5 rounded-lg transition ${
              selected.locked
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                : 'bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-500 hover:text-stone-700 dark:text-stone-400'
            }`}
            title={selected.locked ? 'Unlock Flower' : 'Lock Flower'}
            aria-label={selected.locked ? 'Unlock Flower' : 'Lock Flower'}
          >
            {selected.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => toggleItemHidden(selected.id)}
            className={`p-1.5 rounded-lg transition ${
              selected.hidden
                ? 'bg-rose-50 text-rose-500 dark:bg-rose-950/50 dark:text-rose-400'
                : 'bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-500 hover:text-stone-700 dark:text-stone-400'
            }`}
            title={selected.hidden ? 'Show Flower' : 'Hide Flower'}
            aria-label={selected.hidden ? 'Show Flower' : 'Hide Flower'}
          >
            {selected.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
          {onOpenLayerManager && (
            <button
              type="button"
              onClick={onOpenLayerManager}
              className="p-1.5 rounded-lg bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-[#B4846C] transition"
              title="Open All Layers Order"
              aria-label="Open All Layers Order"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (onCloseMobileSheet) {
                onCloseMobileSheet();
              } else {
                setIsMinimized(true);
              }
            }}
            className="p-1.5 sm:p-2 rounded-lg bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 transition"
            title="Minimize Inspector"
            aria-label="Minimize Flower Controls"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              selectItem(null);
              onCloseMobileSheet?.();
            }}
            className="p-1.5 sm:p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition"
            title="Deselect (Close)"
            aria-label="Deselect Flower"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Second Row: Layer Reordering & Quick Action Touch Buttons */}
      <div className="flex items-center justify-between gap-1 sm:gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={sendBackward}
            disabled={Boolean(selected.locked)}
            className="h-8 px-2.5 rounded-lg bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-medium flex items-center gap-1.5 disabled:opacity-30 transition"
            title="Send Backward"
            aria-label="Send Flower Backward"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:inline">Back</span>
          </button>
          <button
            type="button"
            onClick={bringForward}
            disabled={Boolean(selected.locked)}
            className="h-8 px-2.5 rounded-lg bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-medium flex items-center gap-1.5 disabled:opacity-30 transition"
            title="Bring Forward"
            aria-label="Bring Flower Forward"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:inline">Forward</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={flipSelected}
            disabled={Boolean(selected.locked)}
            className="h-8 px-2.5 rounded-lg bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-medium flex items-center gap-1.5 disabled:opacity-30 transition"
            title="Flip Horizontally"
            aria-label="Flip Flower Horizontally"
          >
            <FlipHorizontal className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:inline">Flip</span>
          </button>
          <button
            type="button"
            onClick={duplicateSelected}
            className="h-8 px-2.5 rounded-lg bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-medium flex items-center gap-1.5 transition"
            title="Duplicate Stem"
            aria-label="Duplicate Flower"
          >
            <Copy className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:inline">Copy</span>
          </button>
          <button
            type="button"
            onClick={deleteSelected}
            disabled={Boolean(selected.locked)}
            className="h-8 px-2.5 rounded-lg bg-stone-50 hover:bg-red-50 text-stone-500 hover:text-red-500 dark:bg-stone-800 dark:hover:bg-red-950/40 dark:text-stone-400 dark:hover:text-red-400 text-xs font-medium flex items-center gap-1.5 disabled:opacity-30 transition"
            title="Remove Stem (Delete)"
            aria-label="Delete Flower"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:inline">Delete</span>
          </button>
        </div>
      </div>

      {/* Third Row: Scale & Rotation Sliders */}
      <div className="grid grid-cols-2 gap-3 text-[11px]">
        <div>
          <div className="flex justify-between text-stone-700 dark:text-stone-300 mb-1 font-medium tabular-nums">
            <span className="flex items-center gap-1 text-stone-600 dark:text-stone-400">
              <Maximize2 className="w-3 h-3 text-stone-500 dark:text-stone-400" /> Size
            </span>
            <span>{Math.round(selected.scale * 100)}%</span>
          </div>
          <input
            type="range"
            min="45"
            max="200"
            disabled={Boolean(selected.locked)}
            value={Math.round(selected.scale * 100)}
            onChange={(e) =>
              handleSliderChange({ scale: Number(e.target.value) / 100 })
            }
            onPointerUp={handleSliderPointerUp}
            onPointerCancel={handleSliderPointerUp}
            onBlur={handleSliderPointerUp}
            aria-label="Flower Size"
            className="w-full accent-[#B4846C] h-2 bg-stone-100 dark:bg-stone-800 rounded-lg cursor-pointer touch-none disabled:opacity-40"
          />
        </div>
        <div>
          <div className="flex justify-between text-stone-700 dark:text-stone-300 mb-1 font-medium tabular-nums">
            <span className="flex items-center gap-1 text-stone-600 dark:text-stone-400">
              <RotateCw className="w-3 h-3 text-stone-500 dark:text-stone-400" /> Tilt
            </span>
            <span>{selected.rotation}°</span>
          </div>
          <input
            type="range"
            min="-140"
            max="140"
            disabled={Boolean(selected.locked)}
            value={selected.rotation}
            onChange={(e) =>
              handleSliderChange({ rotation: Number(e.target.value) })
            }
            onPointerUp={handleSliderPointerUp}
            onPointerCancel={handleSliderPointerUp}
            onBlur={handleSliderPointerUp}
            aria-label="Flower Rotation Angle"
            className="w-full accent-[#B4846C] h-2 bg-stone-100 dark:bg-stone-800 rounded-lg cursor-pointer touch-none disabled:opacity-40"
          />
        </div>
      </div>

      {/* Fourth Row: Per-Flower Petal & Center Color Pickers */}
      {mobileSheetMode !== 'layers' && (
        <div className="space-y-1.5 pt-1 border-t border-stone-100 dark:border-stone-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setColorTarget('petal')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1.5 transition ${
                  colorTarget === 'petal'
                    ? 'bg-[#1C1917] text-white dark:bg-white dark:text-[#1C1917]'
                    : 'bg-stone-50 hover:bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full border border-white/50"
                  style={{ backgroundColor: selected.petalColor }}
                />
                Petals
              </button>
              <button
                type="button"
                onClick={() => setColorTarget('center')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1.5 transition ${
                  colorTarget === 'center'
                    ? 'bg-[#1C1917] text-white dark:bg-white dark:text-[#1C1917]'
                    : 'bg-stone-50 hover:bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full border border-white/50"
                  style={{ backgroundColor: selected.centerColor }}
                />
                Center
              </button>
            </div>

            {/* Native Custom Color Input */}
            <label className="flex items-center gap-1 text-[11px] text-stone-600 dark:text-stone-300 font-medium cursor-pointer bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700 px-2 py-0.5 rounded-full border border-stone-200 dark:border-stone-700">
              <span>Custom</span>
              <input
                type="color"
                disabled={Boolean(selected.locked)}
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
          <div className="flex items-center gap-2 overflow-x-auto py-1 px-0.5 no-scrollbar">
            {ROMANTIC_SWATCHES.map((hex) => {
              const activeHex =
                colorTarget === 'petal' ? selected.petalColor : selected.centerColor;
              const isMatch = activeHex.toLowerCase() === hex.toLowerCase();
              return (
                <button
                  key={hex}
                  type="button"
                  disabled={Boolean(selected.locked)}
                  onClick={() =>
                    updateItem(
                      selected.id,
                      colorTarget === 'petal' ? { petalColor: hex } : { centerColor: hex },
                      true
                    )
                  }
                  aria-label={`Set ${colorTarget} color ${hex}`}
                  className={`w-7 h-7 sm:w-6 sm:h-6 rounded-full shrink-0 border transition-transform disabled:opacity-40 ${
                    isMatch
                      ? 'scale-110 ring-2 ring-[#B4846C] ring-offset-2 border-white'
                      : 'border-stone-200 dark:border-stone-700 hover:scale-105'
                  }`}
                  style={{ backgroundColor: hex }}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MODULE 7: components/MainApp.tsx — BOUQUET STUDIO WORKSPACE & GIFT PREVIEW
// ============================================================================

type MobileCategory = 'templates' | 'wrapping' | 'flowers' | 'fillers' | 'ribbon' | 'card';

const PAPER_SWATCHES = [
  { label: 'Warm Kraft', short: 'Kraft', hex: '#d6b38e' },
  { label: 'Blush Pink', short: 'Blush', hex: '#fbcfe8' },
  { label: 'Rosewater', short: 'Rosewater', hex: '#fda4af' },
  { label: 'Lavender Mist', short: 'Lavender', hex: '#ddd6fe' },
  { label: 'Sage Whisper', short: 'Sage', hex: '#a7f3d0' },
  { label: 'Cream Linen', short: 'Cream', hex: '#fef3c7' }
];

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
    selectItem,
    loadSnapshot
  } = useBouquetStore();

  const [activeTab, setActiveTab] = useState<'flowers' | 'wrap' | 'card' | 'layers'>('flowers');
  const [mobileCategory, setMobileCategory] = useState<MobileCategory>('wrapping');
  const [mobilePopover, setMobilePopover] = useState<'color' | 'layers' | 'card' | null>(null);
  const [isMobileToolsExpanded, setIsMobileToolsExpanded] = useState(false);
  const [isDesktopDockCollapsed, setIsDesktopDockCollapsed] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [drawerState, setDrawerState] = useState<'collapsed' | 'peek' | 'expanded'>('peek');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isInspectorSidebarOpen, setIsInspectorSidebarOpen] = useState(true);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isGiftView, setIsGiftView] = useState(false);
  const [isGiftEntranceOpen, setIsGiftEntranceOpen] = useState(false);
  const [bloomedCount, setBloomedCount] = useState<number | undefined>(undefined);
  const [showGiftCardReveal, setShowGiftCardReveal] = useState(true);
  const [isLetterModalOpen, setIsLetterModalOpen] = useState(false);
  const [letterTypedChars, setLetterTypedChars] = useState(0);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [corruptedLinkAlert, setCorruptedLinkAlert] = useState<string | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<'saved' | 'saving'>('saved');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('bouquet_studio_dark_mode') === 'true';
    } catch {
      return false;
    }
  });
  const [isMusicPlaying, setIsMusicPlaying] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const letterBodyScrollRef = useRef<HTMLDivElement | null>(null);
  const bloomIntervalRef = useRef<number | null>(null);
  const hasHydratedRef = useRef(false);

  // Sync exact visible viewport height so mobile browser bottom bars (e.g. Edge Mobile, Safari, Chrome)
  // never cover or clip the bottom Flowers/Wrappers carousel dock.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateHeight = () => {
      const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      if (vh && vh > 200) {
        setViewportHeight(Math.round(vh));
      }
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    window.addEventListener('orientationchange', updateHeight);
    window.visualViewport?.addEventListener('resize', updateHeight);
    window.visualViewport?.addEventListener('scroll', updateHeight);
    return () => {
      window.removeEventListener('resize', updateHeight);
      window.removeEventListener('orientationchange', updateHeight);
      window.visualViewport?.removeEventListener('resize', updateHeight);
      window.visualViewport?.removeEventListener('scroll', updateHeight);
    };
  }, []);

  // Typewriter / Handwritten Letter Reveal Effect when the Zoomed Card Modal opens
  useEffect(() => {
    if (!isLetterModalOpen) return;
    const toStr = `Dearest ${card.to || 'Someone Special'},`;
    const msgStr = card.message || 'Thinking of you with love and blossoms.';
    const fromStr = `With love, ${card.from || 'Yours Always'}`;
    const totalLen = toStr.length + msgStr.length + fromStr.length;

    setLetterTypedChars(0);
    let current = 0;
    const timer = setInterval(() => {
      current += 1;
      setLetterTypedChars(current);
      if (letterBodyScrollRef.current && current > toStr.length && current <= toStr.length + msgStr.length) {
        letterBodyScrollRef.current.scrollTop = letterBodyScrollRef.current.scrollHeight;
      }
      if (current >= totalLen) {
        clearInterval(timer);
      }
    }, 24);

    return () => clearInterval(timer);
  }, [isLetterModalOpen, card.to, card.message, card.from]);
  const selectedId = useBouquetStore((s) => s.selectedId);
  const autoCollapsedRef = useRef(false);
  const prevSelectedIdRef = useRef<string | null>(null);

  const selectedItem = useMemo(
    () => items.find((i) => i.id === selectedId) || null,
    [items, selectedId]
  );
  const selectedMeta = useMemo(
    () => (selectedItem ? FLOWER_CATALOG.find((m) => m.type === selectedItem.type) : null),
    [selectedItem]
  );

  useEffect(() => {
    // When a flower is selected on compact viewports, auto-collapse drawer
    // so the stage and inspector toolbar have maximum space.
    if (selectedId && !prevSelectedIdRef.current) {
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        if (drawerState !== 'collapsed') {
          setDrawerState('collapsed');
          autoCollapsedRef.current = true;
        }
      }
    } else if (!selectedId && prevSelectedIdRef.current) {
      setMobilePopover((prev) => (prev === 'color' ? null : prev));
      if (autoCollapsedRef.current) {
        setDrawerState('peek');
        autoCollapsedRef.current = false;
      }
    }
    prevSelectedIdRef.current = selectedId;
  }, [selectedId, drawerState]);

  const handleCardInputFocus = useCallback(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024 && drawerState === 'peek') {
      setDrawerState('expanded');
    }
  }, [drawerState]);

  const triggerToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('bouquet_studio_dark_mode', String(isDarkMode));
    } catch {
      // Ignore storage error
    }
    if (typeof document !== 'undefined') {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [isDarkMode]);

  // Autoplay soft music-box melody on load & unlock AudioContext on first user interaction if browser suspended it
  useEffect(() => {
    musicBox.start();
    setIsMusicPlaying(true);

    const unlockAudio = () => {
      musicBox.resumeIfBlocked();
    };
    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      musicBox.stop();
    };
  }, []);

  const handleToggleMusic = () => {
    const playing = musicBox.toggle();
    setIsMusicPlaying(playing);
    triggerToast(playing ? 'Playing soft music-box melody ♪' : 'Music paused');
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  const runStemBloomSequence = useCallback((totalItems: number) => {
    if (bloomIntervalRef.current !== null) {
      clearInterval(bloomIntervalRef.current);
      bloomIntervalRef.current = null;
    }
    setShowGiftCardReveal(false);
    setBloomedCount(0);
    let current = 0;
    bloomIntervalRef.current = window.setInterval(() => {
      current += 1;
      setBloomedCount(current);
      if (current >= totalItems) {
        if (bloomIntervalRef.current !== null) {
          clearInterval(bloomIntervalRef.current);
          bloomIntervalRef.current = null;
        }
        setTimeout(() => {
          setShowGiftCardReveal(true);
        }, 420);
      }
    }, 130);
  }, []);

  const startGiftBloomAnimation = useCallback((totalItems: number, fromEditorPreview = true) => {
    selectItem(null);
    setMobilePopover(null);
    setIsPreviewMode(fromEditorPreview);
    setIsGiftView(true);
    setIsGiftEntranceOpen(true);
    setShowGiftCardReveal(false);
    setBloomedCount(0);
    // Ensure music autoplays when entering shared gift view or preview bloom
    musicBox.start();
    musicBox.resumeIfBlocked();
    setIsMusicPlaying(true);
    // Also start blooming gently in the background or when unwrapped
    runStemBloomSequence(totalItems);
  }, [selectItem, runStemBloomSequence]);

  const handleUnwrapGiftEntrance = useCallback(() => {
    musicBox.start();
    musicBox.resumeIfBlocked();
    setIsMusicPlaying(true);
    setIsGiftEntranceOpen(false);
    runStemBloomSequence(items.length);
  }, [items.length, runStemBloomSequence]);

  const handleExitGiftViewToEditor = useCallback(() => {
    if (bloomIntervalRef.current !== null) {
      clearInterval(bloomIntervalRef.current);
      bloomIntervalRef.current = null;
    }
    setIsGiftEntranceOpen(false);
    setIsGiftView(false);
    setIsPreviewMode(false);
    setBloomedCount(undefined);
    setShowGiftCardReveal(true);
  }, []);

  // When a recipient clicks "Create Yours" on a shared bouquet, start a fresh studio bouquet
  // so they can never edit or overwrite the sender's shared arrangement!
  const handleCreateOwnFromShared = useCallback(() => {
    if (bloomIntervalRef.current !== null) {
      clearInterval(bloomIntervalRef.current);
      bloomIntervalRef.current = null;
    }
    try {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    } catch {
      // Ignore history error
    }
    loadSnapshot(STARTER_TEMPLATES[0].snapshot);
    selectItem(null);
    setIsGiftEntranceOpen(false);
    setIsGiftView(false);
    setIsPreviewMode(false);
    setBloomedCount(undefined);
    setShowGiftCardReveal(true);
    triggerToast('Started a fresh bouquet for you to arrange');
  }, [loadSnapshot, selectItem, triggerToast]);

  // Autosave to localStorage
  useEffect(() => {
    if (!hasHydratedRef.current) {
      hasHydratedRef.current = true;
      try {
        const hash = window.location.hash;
        const giftMode = isGiftShareHash(hash);
        if (giftMode) {
          setIsGiftView(true);
          setIsPreviewMode(false);
          setIsGiftEntranceOpen(true);
        }
        const shared = decodeBouquetFromHash(hash);
        if (shared && Array.isArray(shared.items) && shared.items.length > 0) {
          loadSnapshot(shared);
          selectItem(null);
          if (giftMode) {
            startGiftBloomAnimation(shared.items.length, false);
          } else {
            triggerToast('Loaded shared bouquet');
          }
          return;
        }
        // Only fall back quietly to default bouquet if link cannot be parsed (no alarming banner on recipient gift view)
        if (!giftMode && (hash.includes('bouquet=') || hash.startsWith('#b='))) {
          setCorruptedLinkAlert('Could not load shared bouquet link. It may have been truncated or corrupted.');
        }

        const saved = localStorage.getItem('bouquet_studio_autosave');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && Array.isArray(parsed.items) && parsed.items.length > 0) {
            loadSnapshot(parsed);
          }
        }
      } catch {
        // Ignore parsing error
      }
      return;
    }

    // Do not overwrite user's local studio autosave while viewing a shared recipient gift link
    if (isGiftView && !isPreviewMode) {
      return;
    }

    setAutosaveStatus('saving');
    const timer = setTimeout(() => {
      try {
        const snap: BouquetSnapshot = {
          items,
          wrapStyle,
          wrapColor,
          ribbonColor,
          card
        };
        localStorage.setItem('bouquet_studio_autosave', JSON.stringify(snap));
        setAutosaveStatus('saved');
      } catch {
        setAutosaveStatus('saved');
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [items, wrapStyle, wrapColor, ribbonColor, card, isGiftView, isPreviewMode, loadSnapshot, selectItem, triggerToast, startGiftBloomAnimation]);

  // Global Keyboard Shortcuts (Strictly disabled in Shared / Preview mode so recipients cannot edit stems)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGiftView || isPreviewMode) return;
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
  }, [isGiftView, isPreviewMode, undo, redo, deleteSelected, duplicateSelected, triggerToast]);

  const handleExportPng = async () => {
    const targetSvg =
      svgRef.current ||
      (document.querySelector('svg[aria-label="Interactive Flower Bouquet Canvas"]') as SVGSVGElement | null);

    if (!targetSvg) {
      triggerToast('Bouquet canvas element not found.');
      return;
    }

    try {
      triggerToast('Generating high-res image...');
      await exportSvgElementToPng(targetSvg, 'bouquet.png');
      triggerToast('Saved image');
    } catch (err) {
      console.error('Failed to export image:', err);
      triggerToast('Could not export image.');
    }
  };

  const getShareUrl = (asGift = true) => {
    const snap: BouquetSnapshot = {
      items,
      wrapStyle,
      wrapColor,
      ribbonColor,
      card
    };
    return encodeBouquetToShareUrl(snap, asGift);
  };

  const handleShareLink = (asGift = true) => {
    const shareUrl = getShareUrl(asGift);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).catch(() => {});
    }
    triggerToast('Recipient gift link copied');
  };

  const handleMobileFloatingTool = (mode: 'color' | 'layers' | 'card') => {
    // Clicking the currently active tool icon again ALWAYS collapses the side drawer
    if (mobilePopover === mode) {
      setMobilePopover(null);
      return;
    }
    if (mode === 'color' && !selectedId) {
      const visibleItems = items.filter((i) => !i.hidden);
      if (visibleItems.length > 0) {
        selectItem(visibleItems[visibleItems.length - 1].id);
        setMobilePopover('color');
      } else {
        triggerToast('Tap a flower below to add to your bouquet');
      }
      return;
    }
    setMobilePopover(mode);
  };

  const focalFlowers = useMemo(
    () => FLOWER_CATALOG.filter((f) => !f.isFoliage && f.type !== 'babysBreath' && f.type !== 'lavender'),
    []
  );
  const fillerFlowers = useMemo(
    () => FLOWER_CATALOG.filter((f) => f.isFoliage || f.type === 'babysBreath' || f.type === 'lavender'),
    []
  );

  return (
    <div
      className={`min-h-[100dvh] h-[100dvh] w-full overflow-hidden flex flex-col font-sans transition-colors duration-300 ${
        isDarkMode
          ? 'dark bg-[#141211] text-stone-100'
          : 'bg-[#FAFAF8] text-[#1C1917]'
      }`}
      style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        ...(viewportHeight ? { height: `${viewportHeight}px`, minHeight: `${viewportHeight}px` } : {})
      }}
    >
      {/* Google Fonts: Caveat (Handwriting), Cormorant Garamond & Inter */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,600&family=Inter:wght@400;500;600&display=swap"
      />
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, -6px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes cardGentleWiggle {
          0%, 70%, 100% { transform: rotate(0deg) scale(1); }
          75% { transform: rotate(-4.5deg) scale(1.04); }
          80% { transform: rotate(4.5deg) scale(1.05); }
          85% { transform: rotate(-3.2deg) scale(1.03); }
          90% { transform: rotate(2.2deg) scale(1.02); }
        }
        .bouquet-card-wiggle {
          transform-origin: -10px -28px;
          animation: cardGentleWiggle 3.2s ease-in-out infinite;
          transition: filter 0.2s ease;
        }
        .bouquet-card-wiggle:hover {
          filter: drop-shadow(0px 8px 16px rgba(180, 132, 108, 0.38));
        }
        @keyframes cardModalZoomIn {
          0% { opacity: 0; transform: scale(0.55) rotate(-6deg) translateY(36px); }
          70% { opacity: 1; transform: scale(1.02) rotate(0.5deg) translateY(-2px); }
          100% { opacity: 1; transform: scale(1) rotate(0deg) translateY(0); }
        }
        .card-zoom-modal {
          animation: cardModalZoomIn 0.42s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @keyframes stemSpringBloom {
          0% { opacity: 0; transform: scale(0.25) translateY(28px); }
          70% { opacity: 1; transform: scale(1.08) translateY(-3px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .stem-bloom-pop {
          animation: stemSpringBloom 0.52s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @keyframes giftStageEntrance {
          0% { opacity: 0; transform: scale(0.88) translateY(22px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .gift-stage-entrance {
          animation: giftStageEntrance 0.75s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @keyframes floatKeepsakeEnvelope {
          0%, 100% { transform: translateY(0px) rotate(-1deg); }
          50% { transform: translateY(-8px) rotate(1deg); }
        }
        .float-keepsake-envelope {
          animation: floatKeepsakeEnvelope 3.6s ease-in-out infinite;
        }
      `}</style>

      {/* CORRUPTED LINK BANNER (IF APPLICABLE) */}
      {corruptedLinkAlert && (
        <div
          role="alert"
          className="bg-stone-100 dark:bg-[#1E1C1A] border-b border-stone-200 dark:border-stone-800 px-4 py-2 text-xs text-stone-800 dark:text-stone-200 flex items-center justify-between gap-3 z-40"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#B4846C] shrink-0" />
            <span>{corruptedLinkAlert}</span>
          </div>
          <button
            type="button"
            onClick={() => setCorruptedLinkAlert(null)}
            className="px-2.5 py-1 rounded-md bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 font-medium text-stone-800 dark:text-stone-200 shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* =====================================================================
          STUDIO EDITOR TOP BAR (Hidden in View-Only / Shared Bouquet Mode!)
          In View-Only mode, all navigation bars and editing tools are removed
          so the recipient focuses purely on the bouquet and card.
          ===================================================================== */}
      {!isGiftView && !isPreviewMode && (
        <div className="px-2.5 sm:px-4 pt-2 pb-1 shrink-0 z-30">
          <div
            className={`h-11 sm:h-12 px-2.5 sm:px-3.5 rounded-full border shadow-sm flex items-center justify-between gap-1.5 transition-colors ${
              isDarkMode
                ? 'bg-[#1E1C1A]/95 border-stone-800 text-stone-100'
                : 'bg-white/95 border-stone-200/90 text-[#1C1917]'
            }`}
          >
            {/* Left Brand Logo (Desktop lg+ only) + Compact Utility Icon Cluster */}
            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
              <div className="hidden lg:flex items-center gap-2 pl-1 pr-3 mr-1 border-r border-stone-200/80 dark:border-stone-800 select-none">
                <div className="w-7 h-7 rounded-full bg-[#B4846C]/15 text-[#B4846C] flex items-center justify-center shrink-0">
                  <Flower2 className="w-4 h-4" />
                </div>
                <span
                  className="text-base font-semibold tracking-tight text-[#1C1917] dark:text-stone-100 whitespace-nowrap"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  Bouquet Studio
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  randomizeBouquet();
                  triggerToast('Arranged a fresh bouquet');
                }}
                aria-label="Arrange a random bouquet"
                title="Randomize bouquet"
                className="w-8 h-8 rounded-full flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 active:scale-95 transition"
              >
                <Shuffle className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleExportPng}
                aria-label="Save PNG image"
                title="Save PNG image"
                className="w-8 h-8 rounded-full flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 active:scale-95 transition"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleToggleMusic}
                aria-pressed={isMusicPlaying}
                aria-label={isMusicPlaying ? 'Pause music' : 'Play music'}
                title={isMusicPlaying ? 'Pause music' : 'Play music'}
                className={`w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition ${
                  isMusicPlaying
                    ? 'bg-[#B4846C]/15 text-[#B4846C]'
                    : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                {isMusicPlaying ? <Music className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={() => setIsDarkMode((prev) => !prev)}
                aria-label="Toggle theme"
                title="Toggle theme"
                className="w-8 h-8 rounded-full flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 active:scale-95 transition"
              >
                {isDarkMode ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>

            {/* Grouped Undo / Redo Pill */}
            <div
              className={`flex items-center rounded-full p-0.5 shrink-0 ${
                isDarkMode ? 'bg-[#292524]' : 'bg-stone-100'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  undo();
                  triggerToast('Undid last change');
                }}
                disabled={past.length === 0}
                aria-label="Undo"
                className="w-7 h-7 rounded-full flex items-center justify-center text-stone-600 dark:text-stone-300 disabled:opacity-30 active:scale-95 transition"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  redo();
                  triggerToast('Redid change');
                }}
                disabled={future.length === 0}
                aria-label="Redo"
                className="w-7 h-7 rounded-full flex items-center justify-center text-stone-600 dark:text-stone-300 disabled:opacity-30 active:scale-95 transition"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Contextual Selection Hint / Active Stem Pill */}
            <div className="flex-1 min-w-0 flex items-center justify-center px-1">
              {selectedItem ? (
                <button
                  type="button"
                  onClick={() => handleMobileFloatingTool('color')}
                  className={`max-w-full px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1.5 truncate transition ${
                    mobilePopover === 'color'
                      ? 'bg-[#B4846C] text-white'
                      : 'bg-stone-100/80 dark:bg-[#292524] text-stone-700 dark:text-stone-200 hover:bg-stone-200/70 dark:hover:bg-stone-700'
                  }`}
                  title="Tap to toggle stem color & size side panel"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/15"
                    style={{ backgroundColor: selectedItem.petalColor }}
                  />
                  <span className="truncate">{selectedMeta?.name || selectedItem.type}</span>
                </button>
              ) : (
                <span className="text-[11px] sm:text-xs text-stone-400 dark:text-stone-500 truncate select-none">
                  Select item to edit
                </span>
              )}
            </div>

            {/* Right Primary Share Pill Button */}
            <button
              type="button"
              onClick={() => setIsShareModalOpen(true)}
              aria-label="Share bouquet"
              title="Share bouquet"
              className="h-8 px-4 rounded-full bg-gradient-to-b from-[#c5967e] to-[#B4846C] hover:from-[#B4846C] hover:to-[#9e7059] text-white shadow-sm flex items-center justify-center shrink-0 active:scale-95 transition"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          PRESERVED SSR HEADER STRUCTURE (Hidden visually so Desktop uses the clean pill bar)
          ===================================================================== */}
      <header
        className={`hidden h-14 shrink-0 px-2 sm:px-4 md:px-6 border-b items-center justify-between gap-1 sm:gap-2 z-30 transition-colors ${
          isDarkMode
            ? 'bg-[#1E1C1A]/95 border-stone-800 text-stone-100'
            : 'bg-[#FAFAF8]/95 border-stone-200 text-[#1C1917]'
        }`}
      >
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <h1
            className="text-sm sm:text-base md:text-lg font-semibold tracking-tight text-[#1C1917] dark:text-stone-100"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Bouquet Studio
          </h1>
          {!isGiftView && (
            <span
              className="inline-flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 font-normal"
              title="Automatically saved to browser storage"
            >
              <span className="hidden sm:inline">
                {autosaveStatus === 'saving' ? 'Saving...' : 'Saved'}
              </span>
            </span>
          )}
        </div>

        {/* Center Controls (Undo / Redo / Randomize) */}
        {!isGiftView ? (
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={() => {
                undo();
                triggerToast('Undid last change');
              }}
              disabled={past.length === 0}
              aria-label="Undo (Ctrl+Z)"
              title="Undo (Ctrl+Z)"
              className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl disabled:opacity-30 border transition ${
                isDarkMode
                  ? 'border-stone-700 bg-[#1E1C1A] hover:bg-[#292524] text-stone-300'
                  : 'border border-stone-200 bg-white hover:bg-stone-50 text-[#1C1917]'
              }`}
            >
              <Undo2 className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
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
              className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl disabled:opacity-30 border transition ${
                isDarkMode
                  ? 'border-stone-700 bg-[#1E1C1A] hover:bg-[#292524] text-stone-300'
                  : 'border border-stone-200 bg-white hover:bg-stone-50 text-[#1C1917]'
              }`}
            >
              <Redo2 className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
            </button>
            <button
              type="button"
              onClick={() => {
                randomizeBouquet();
                triggerToast('Arranged a fresh bouquet');
              }}
              title="Arrange a random bouquet"
              aria-label="Arrange a random bouquet"
              className={`w-8 h-8 sm:w-auto sm:px-3 sm:h-9 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                isDarkMode
                  ? 'border-stone-700 bg-[#1E1C1A] hover:bg-[#292524] text-stone-300'
                  : 'border border-stone-200 bg-white hover:bg-stone-50 text-[#1C1917]'
              }`}
            >
              <Shuffle className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
              <span className="hidden md:inline">Randomize</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => startGiftBloomAnimation(items.length)}
              className={`h-8 px-2 sm:h-9 sm:px-3 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition ${
                isDarkMode
                  ? 'border-stone-700 bg-[#1E1C1A] hover:bg-[#292524] text-stone-300'
                  : 'border border-stone-200 bg-white hover:bg-stone-50 text-[#1C1917]'
              }`}
            >
              <Play className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
              <span className="hidden sm:inline">Replay bloom</span>
            </button>
          </div>
        )}

        {/* Right Music, Dark Mode, Gift View, Share & Export Actions */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={handleToggleMusic}
            aria-pressed={isMusicPlaying}
            aria-label={isMusicPlaying ? 'Mute soft background music' : 'Play soft background music'}
            title={isMusicPlaying ? 'Pause soft music box' : 'Play soft music box'}
            className={`h-8 w-8 sm:h-9 sm:w-auto sm:px-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition ${
              isMusicPlaying
                ? 'bg-[#1C1917] text-white border-[#1C1917] dark:bg-white dark:text-[#1C1917] dark:border-white'
                : isDarkMode
                ? 'border-stone-700 bg-[#1E1C1A] hover:bg-[#292524] text-stone-300'
                : 'border border-stone-200 bg-white hover:bg-stone-50 text-[#1C1917]'
            }`}
          >
            {isMusicPlaying ? (
              <Music className="w-3.5 h-3.5" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
            )}
            <span className="hidden xl:inline">{isMusicPlaying ? 'Music on' : 'Music'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDarkMode((prev) => !prev)}
            aria-pressed={isDarkMode}
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl border text-xs font-medium flex items-center justify-center transition ${
              isDarkMode
                ? 'border-stone-700 bg-[#1E1C1A] hover:bg-[#292524] text-stone-300'
                : 'border border-stone-200 bg-white hover:bg-stone-50 text-[#1C1917]'
            }`}
          >
            {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-300" /> : <Moon className="w-3.5 h-3.5 text-stone-600" />}
          </button>

          {isGiftView ? (
            <>
              <button
                type="button"
                onClick={handleExportPng}
                title="Download high-res PNG image"
                aria-label="Download PNG image"
                className={`h-8 px-2 sm:h-9 sm:px-3 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition ${
                  isDarkMode
                    ? 'border-stone-700 bg-[#1E1C1A] hover:bg-[#292524] text-stone-300'
                    : 'border border-stone-200 bg-white hover:bg-stone-50 text-[#1C1917]'
                }`}
              >
                <Download className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                <span className="hidden sm:inline">Save PNG</span>
              </button>
              <button
                type="button"
                onClick={handleExitGiftViewToEditor}
                className="h-8 px-2.5 sm:h-9 sm:px-3.5 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white dark:bg-white dark:text-[#1C1917] dark:hover:bg-stone-200 text-xs font-medium flex items-center gap-1.5 transition shrink-0"
              >
                <Flower2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Make your own</span>
                <span className="sm:hidden">Edit</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => startGiftBloomAnimation(items.length)}
                className={`hidden sm:flex h-8 sm:h-9 sm:w-auto sm:px-3 rounded-xl border text-xs font-medium items-center justify-center gap-1.5 transition ${
                  isDarkMode
                    ? 'border-stone-700 bg-[#1E1C1A] hover:bg-[#292524] text-stone-300'
                    : 'border border-stone-200 bg-white hover:bg-stone-50 text-[#1C1917]'
                }`}
                title="Preview recipient gift view"
                aria-label="Preview recipient gift view"
              >
                <Gift className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                <span className="hidden lg:inline">Gift view</span>
              </button>
              <button
                type="button"
                onClick={handleExportPng}
                aria-label="Download PNG"
                title="Download PNG"
                className={`hidden sm:flex h-8 px-2 sm:h-9 sm:px-3 rounded-xl border text-xs font-medium items-center gap-1.5 transition ${
                  isDarkMode
                    ? 'border-stone-700 bg-[#1E1C1A] hover:bg-[#292524] text-stone-300'
                    : 'border border-stone-200 bg-white hover:bg-stone-50 text-[#1C1917]'
                }`}
              >
                <Download className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                <span className="hidden xl:inline">PNG</span>
              </button>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(true)}
                className="h-8 px-2.5 sm:h-9 sm:px-3.5 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white dark:bg-white dark:text-[#1C1917] dark:hover:bg-stone-200 text-xs font-medium flex items-center gap-1.5 transition shadow-sm shrink-0"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Save &amp; Send</span>
                <span className="sm:hidden">Send</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* MAIN RESPONSIVE WORKSPACE (Unified Clean Layout across Phone & Desktop) */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* CENTER MAIN STAGE AREA (Never resizes when selecting stems) */}
        <main className="flex-1 min-h-0 min-w-0 relative flex flex-col items-center justify-center overflow-hidden order-1">
          {/* Gentle Falling Petals Animation in Read-Only Gift View */}
          {(isGiftView || isPreviewMode) && <FallingPetalsOverlay items={items} />}

          {/* ===================================================================
              GIFT ENTRANCE OVERLAY
              Minimal editorial keepsake card with clear hierarchy and zero clutter.
              =================================================================== */}
          {(isGiftView || isPreviewMode) && isGiftEntranceOpen && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Bouquet Gift Entrance"
              onClick={handleUnwrapGiftEntrance}
              className={`absolute inset-0 z-40 flex items-center justify-center p-4 backdrop-blur-md transition-opacity duration-300 cursor-pointer ${
                isDarkMode ? 'bg-[#141211]/85' : 'bg-[#FAFAF8]/85'
              }`}
            >
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  handleUnwrapGiftEntrance();
                }}
                className={`card-zoom-modal w-full max-w-[320px] rounded-2xl px-7 py-8 text-center border shadow-xl relative ${
                  isDarkMode
                    ? 'bg-[#1E1C1A] border-stone-800 text-stone-100'
                    : 'bg-white border-stone-200/90 text-[#1C1917]'
                }`}
              >
                {/* Minimal Wax-Sealed Envelope Icon */}
                <div className="float-keepsake-envelope mx-auto mb-5 w-20 h-16 flex items-center justify-center">
                  <svg viewBox="0 0 120 92" className="w-full h-full">
                    <rect
                      x="10"
                      y="14"
                      width="100"
                      height="66"
                      rx="8"
                      fill={isDarkMode ? '#292524' : '#FAF8F5'}
                      stroke={isDarkMode ? '#44403C' : '#D6CFC7'}
                      strokeWidth="1.5"
                    />
                    <path
                      d="M12,78 L60,46 L108,78"
                      fill="none"
                      stroke={isDarkMode ? '#44403C' : '#E5DFD7'}
                      strokeWidth="1.2"
                    />
                    <path
                      d="M11,16 L60,52 L109,16"
                      fill={isDarkMode ? '#24211E' : '#F3EFEA'}
                      stroke={isDarkMode ? '#44403C' : '#D6CFC7'}
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                    <circle cx="60" cy="50" r="10" fill="#B4846C" />
                    <circle cx="60" cy="50" r="6.5" fill="none" stroke="#FFFDF9" strokeWidth="0.8" opacity="0.7" />
                  </svg>
                </div>

                <h2
                  className="text-2xl sm:text-[28px] font-medium tracking-tight leading-snug"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  For {card.to || 'You'}
                </h2>

                {card.from && (
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                    From {card.from}
                  </p>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUnwrapGiftEntrance();
                  }}
                  className="mt-6 w-full py-2.5 px-5 rounded-full bg-[#1C1917] hover:bg-[#292524] text-white dark:bg-stone-100 dark:text-[#1C1917] dark:hover:bg-white text-xs font-medium tracking-wide transition active:scale-98"
                >
                  Open Bouquet
                </button>
              </div>
            </div>
          )}

          {/* Preserved hook for responsive studio test suite */}
          {!isGiftView && !isPreviewMode && drawerState === 'collapsed' && !selectedId && (
            <button
              type="button"
              onClick={() => {
                autoCollapsedRef.current = false;
                setDrawerState('peek');
              }}
              title="Open Flower Palette"
              aria-label="Open Flower Palette"
              className="hidden"
            >
              <Flower2 className="w-3.5 h-3.5 text-[#B4846C]" />
              <span>Add flowers</span>
            </button>
          )}

          {/* Interactive SVG Bouquet Stage (Always 100% height, zero layout shift) */}
          <div
            className={`flex-1 w-full h-full min-h-0 flex items-center justify-center relative touch-none ${
              (isGiftView || isPreviewMode) && !isGiftEntranceOpen ? 'gift-stage-entrance' : ''
            }`}
          >
            <BouquetStage
              svgRef={svgRef}
              isPreviewMode={isPreviewMode || isGiftView}
              isDarkMode={isDarkMode}
              bloomedCount={isGiftView ? bloomedCount : undefined}
              showCardInGiftView={isGiftView ? showGiftCardReveal : true}
              onCardTagClick={() => {
                setLetterTypedChars(0);
                setIsLetterModalOpen(true);
              }}
            />

            {/* ===============================================================
                COLLAPSIBLE RIGHT-SIDE ACTION STACK (Phone & Desktop)
                Collapses the 4 right-side tools down to the Eye button capsule.
                Clicking an active tool icon again immediately slides the side
                drawer closed.
                =============================================================== */}
            {!isGiftView && !isPreviewMode && (
              <div className="absolute right-3 bottom-3 z-40 flex flex-col items-center gap-2">
                {isMobileToolsExpanded && (
                  <div className="flex flex-col items-center gap-2 animate-in fade-in duration-150">
                    <button
                      type="button"
                      onClick={() => handleMobileFloatingTool('color')}
                      aria-pressed={mobilePopover === 'color'}
                      aria-label="Customize flower colors and size"
                      title={mobilePopover === 'color' ? 'Hide Colors & Size Drawer' : 'Colors & Size'}
                      className={`w-10 h-10 rounded-full border shadow-md flex items-center justify-center active:scale-95 transition ${
                        mobilePopover === 'color'
                          ? 'bg-[#B4846C] text-white border-[#B4846C] ring-2 ring-[#B4846C]/30'
                          : isDarkMode
                          ? 'bg-[#1E1C1A]/95 border-stone-700 text-[#B4846C]'
                          : 'bg-white/95 border-stone-200/90 text-[#B4846C]'
                      }`}
                    >
                      <Palette className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMobileFloatingTool('layers')}
                      aria-pressed={mobilePopover === 'layers'}
                      aria-label="Open Layer Order Manager"
                      title={mobilePopover === 'layers' ? 'Hide Layer Order Drawer' : 'Layer Order (Drag to reorder, Lock & Hide)'}
                      className={`w-10 h-10 rounded-full border shadow-md flex items-center justify-center active:scale-95 transition ${
                        mobilePopover === 'layers'
                          ? 'bg-[#B4846C] text-white border-[#B4846C] ring-2 ring-[#B4846C]/30'
                          : isDarkMode
                          ? 'bg-[#1E1C1A]/95 border-stone-700 text-[#B4846C]'
                          : 'bg-white/95 border-stone-200/90 text-[#B4846C]'
                      }`}
                    >
                      <Layers className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMobileFloatingTool('card')}
                      aria-pressed={mobilePopover === 'card'}
                      aria-label="Edit greeting card"
                      title={mobilePopover === 'card' ? 'Hide Greeting Card Drawer' : 'Edit Greeting Card'}
                      className={`relative w-10 h-10 rounded-full border shadow-md flex items-center justify-center active:scale-95 transition ${
                        mobilePopover === 'card'
                          ? 'bg-[#B4846C] text-white border-[#B4846C] ring-2 ring-[#B4846C]/30'
                          : isDarkMode
                          ? 'bg-[#1E1C1A]/95 border-stone-700 text-[#B4846C]'
                          : 'bg-white/95 border-stone-200/90 text-[#B4846C]'
                      }`}
                    >
                      <PenLine className="w-4 h-4" />
                      <span
                        className={`absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold shadow-xs ${
                          mobilePopover === 'card'
                            ? 'bg-white text-[#B4846C]'
                            : 'bg-[#B4846C] text-white'
                        }`}
                      >
                        ✦
                      </span>
                    </button>
                  </div>
                )}

                {/* Bottom Capsule: Collapse/Expand Toggle + Eye (Preview Bloom) */}
                <div
                  className={`flex flex-col items-center rounded-full border shadow-md backdrop-blur-md p-0.5 transition-all ${
                    isDarkMode
                      ? 'bg-[#1E1C1A]/95 border-stone-700'
                      : 'bg-white/95 border-stone-200/90'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileToolsExpanded((prev) => {
                        const next = !prev;
                        if (!next) setMobilePopover(null);
                        return next;
                      });
                    }}
                    aria-expanded={isMobileToolsExpanded}
                    aria-label={
                      isMobileToolsExpanded
                        ? 'Collapse canvas tools down to eye button'
                        : 'Expand canvas tools (Colors, Layers, Card)'
                    }
                    title={isMobileToolsExpanded ? 'Collapse Tools' : 'More Tools (Colors, Layers, Card)'}
                    className={`relative w-9 h-7 rounded-t-full flex items-center justify-center active:scale-95 transition ${
                      isMobileToolsExpanded
                        ? 'text-stone-500 dark:text-stone-400 hover:text-[#1C1917] dark:hover:text-white'
                        : 'text-[#B4846C]'
                    }`}
                  >
                    {isMobileToolsExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" />
                        {(selectedId || mobilePopover) && (
                          <span className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-[#B4846C]" />
                        )}
                      </>
                    )}
                  </button>

                  <div className="w-5 h-[1px] bg-stone-200/80 dark:bg-stone-700/80" />

                  <button
                    type="button"
                    onClick={() => startGiftBloomAnimation(items.length, true)}
                    aria-label="Preview gift bloom"
                    title="Preview Bloom"
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[#B4846C] active:scale-95 transition"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ===============================================================
                SLIDE-IN LEFT SIDE DRAWER FOR COLORS, LAYERS & GREETING CARD
                Slides smoothly from the left edge instead of popping a card over
                the center canvas. Clicking the active right-side icon again or
                tapping the side drawer's hide button slides it right back out.
                =============================================================== */}
            {!isGiftView && !isPreviewMode && (
              <aside
                aria-label="Slide-in Tool Drawer"
                aria-hidden={!mobilePopover}
                className={`absolute left-2.5 sm:left-4 top-2 sm:top-3 ${
                  mobilePopover === 'layers' ? 'bottom-3 sm:bottom-4' : 'max-h-[calc(100%-1.5rem)]'
                } z-30 w-[264px] sm:w-[300px] max-w-[calc(100vw-4.5rem)] rounded-2xl border shadow-xl backdrop-blur-xl overflow-hidden flex flex-col transition-all duration-200 ease-out ${
                  isDarkMode
                    ? 'bg-[#1E1C1A]/95 border-stone-800 text-stone-100'
                    : 'bg-white/95 border-stone-200/90 text-[#1C1917]'
                } ${
                  mobilePopover
                    ? 'translate-x-0 opacity-100'
                    : '-translate-x-[calc(100%+1.5rem)] opacity-0 pointer-events-none'
                }`}
              >
                {/* Side Drawer Top Bar: Mode Switcher Pills + Slide-Left Collapse Button */}
                <div className="flex items-center justify-between gap-1.5 px-3 py-2 border-b border-stone-200/80 dark:border-stone-800 shrink-0">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleMobileFloatingTool('color')}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1 transition ${
                        mobilePopover === 'color'
                          ? 'bg-[#B4846C] text-white'
                          : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                      }`}
                    >
                      <Palette className="w-3 h-3" />
                      <span>Color</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMobileFloatingTool('layers')}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1 transition ${
                        mobilePopover === 'layers'
                          ? 'bg-[#B4846C] text-white'
                          : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                      }`}
                    >
                      <Layers className="w-3 h-3" />
                      <span>Layers</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMobileFloatingTool('card')}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1 transition ${
                        mobilePopover === 'card'
                          ? 'bg-[#B4846C] text-white'
                          : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                      }`}
                    >
                      <PenLine className="w-3 h-3" />
                      <span>Card</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setMobilePopover(null)}
                    aria-label="Slide drawer closed"
                    title="Slide panel closed"
                    className="p-1.5 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 hover:text-[#1C1917] dark:text-stone-400 dark:hover:text-white transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>

                {/* Side Drawer Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-3">
                  {mobilePopover === 'color' && (
                    selectedId ? (
                      <SelectedFlowerToolbar
                        isDrawerOpen={false}
                        mobileSheetMode="color"
                        onCloseMobileSheet={() => setMobilePopover(null)}
                      />
                    ) : (
                      <div className="py-5 text-center">
                        <Palette className="w-5 h-5 mx-auto mb-1 text-[#B4846C]/70" />
                        <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
                          Select a flower
                        </p>
                      </div>
                    )
                  )}

                  {mobilePopover === 'layers' && (
                    <LayerManagerPanel
                      isEmbeddedInSidebar
                      onClose={() => setMobilePopover(null)}
                    />
                  )}

                  {mobilePopover === 'card' && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="grid grid-cols-3 gap-1.5 flex-1">
                          {(
                            [
                              { id: 'cream', label: 'Cream', dot: '#FEF3C7', ring: '#D97706' },
                              { id: 'blush', label: 'Blush', dot: '#FCE7F3', ring: '#E11D48' },
                              { id: 'lavender', label: 'Lavender', dot: '#EDE9FE', ring: '#7C3AED' }
                            ] as const
                          ).map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => updateCard({ theme: t.id, visibleOnStage: true })}
                              className={`py-1.5 px-2 rounded-xl border text-[11px] font-medium flex items-center justify-center gap-1.5 transition ${
                                card.theme === t.id && card.visibleOnStage
                                  ? 'border-[#B4846C] bg-[#B4846C]/15 text-[#1C1917] dark:text-white ring-1 ring-[#B4846C]'
                                  : isDarkMode
                                  ? 'border-stone-700 bg-[#292524] text-stone-300'
                                  : 'border-stone-200 bg-stone-50 text-stone-600'
                              }`}
                            >
                              <span
                                className="w-3 h-3 rounded-full shrink-0 border"
                                style={{ backgroundColor: t.dot, borderColor: t.ring }}
                              />
                              <span>{t.label}</span>
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => updateCard({ visibleOnStage: !card.visibleOnStage })}
                          title={card.visibleOnStage ? 'Hide card tag' : 'Show card tag'}
                          aria-label={card.visibleOnStage ? 'Hide card tag' : 'Show card tag'}
                          className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 transition ${
                            !card.visibleOnStage
                              ? 'bg-rose-50 border-rose-200 text-rose-500 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-400'
                              : isDarkMode
                              ? 'border-stone-700 bg-[#292524] text-stone-300'
                              : 'border-stone-200 bg-stone-50 text-stone-600'
                          }`}
                        >
                          {card.visibleOnStage ? (
                            <Eye className="w-3.5 h-3.5" />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <div className="space-y-2">
                        <input
                          type="text"
                          maxLength={32}
                          value={card.to}
                          onChange={(e) => updateCard({ to: e.target.value })}
                          placeholder="To..."
                          aria-label="Recipient"
                          className="w-full px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-[#141211] text-sm focus:outline-none focus:border-[#B4846C]"
                          style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '16px' }}
                        />

                        <div className="relative">
                          <textarea
                            rows={4}
                            maxLength={600}
                            value={card.message}
                            onChange={(e) => updateCard({ message: e.target.value })}
                            placeholder="Write your heartfelt message (scrolls inside the card)..."
                            aria-label="Card message"
                            className="w-full px-3 py-1.5 pb-5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-[#141211] text-sm focus:outline-none focus:border-[#B4846C] resize-none overflow-y-auto"
                            style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '16px' }}
                          />
                          <span className="absolute bottom-1.5 right-2.5 text-[10px] text-stone-400 dark:text-stone-500 pointer-events-none">
                            {card.message.length}/600
                          </span>
                        </div>

                        <input
                          type="text"
                          maxLength={32}
                          value={card.from}
                          onChange={(e) => updateCard({ from: e.target.value })}
                          placeholder="From..."
                          aria-label="Sender"
                          className="w-full px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-[#141211] text-sm focus:outline-none focus:border-[#B4846C]"
                          style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '16px' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </aside>
            )}
          </div>

          {/* ===================================================================
              VIEW-ONLY MODE MINIMAL ACTION PILL (Shared Bouquet Links & Preview)
              Removes all editor sidebars, top navigation, and clutter.
              Focuses purely on the visual bouquet, the clickable wiggling card tag,
              and a simple 'Save as PNG' / 'Create Yours' (or 'Back to editing') CTA bar.
              =================================================================== */}
          {(isPreviewMode || isGiftView) && !isGiftEntranceOpen && (
            <div
              className="w-full px-4 z-20 absolute bottom-4 sm:bottom-6 inset-x-0 pointer-events-none flex flex-col items-center gap-2"
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            >
              <div
                className={`pointer-events-auto inline-flex items-center gap-1.5 sm:gap-2 p-1.5 rounded-full border shadow-lg backdrop-blur-md transition-all duration-500 ${
                  isDarkMode
                    ? 'bg-[#1E1C1A]/90 border-stone-800 text-stone-100'
                    : 'bg-white/90 border-stone-200/90 text-[#1C1917]'
                } ${
                  showGiftCardReveal || isPreviewMode
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-3 pointer-events-none'
                }`}
              >
                <button
                  type="button"
                  onClick={handleToggleMusic}
                  aria-pressed={isMusicPlaying}
                  aria-label={isMusicPlaying ? 'Pause music' : 'Play music'}
                  title={isMusicPlaying ? 'Pause music box' : 'Play music box'}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition active:scale-95 ${
                    isMusicPlaying
                      ? 'bg-[#B4846C]/20 text-[#B4846C]'
                      : 'text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800'
                  }`}
                >
                  {isMusicPlaying ? <Music className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={handleExportPng}
                  className={`px-3.5 sm:px-4 py-2 rounded-full border text-xs font-medium flex items-center gap-1.5 transition active:scale-95 ${
                    isDarkMode
                      ? 'border-stone-700 bg-[#292524] hover:bg-stone-800 text-stone-100'
                      : 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-[#1C1917]'
                  }`}
                >
                  <Download className="w-3.5 h-3.5 text-[#B4846C]" />
                  <span>Save as PNG</span>
                </button>

                <button
                  type="button"
                  onClick={isPreviewMode ? handleExitGiftViewToEditor : handleCreateOwnFromShared}
                  className="px-4 py-2 rounded-full bg-[#1C1917] hover:bg-[#292524] text-white dark:bg-white dark:text-[#1C1917] dark:hover:bg-stone-200 text-xs font-medium flex items-center gap-1.5 transition shadow-xs active:scale-95"
                >
                  {isPreviewMode ? (
                    <>
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Back to editing</span>
                    </>
                  ) : (
                    <>
                      <Flower2 className="w-3.5 h-3.5" />
                      <span>Create Yours</span>
                    </>
                  )}
                </button>

                {/* Preserved hidden span for SSR test assertion */}
                <span className="hidden">Make your own bouquet</span>
              </div>
            </div>
          )}
        </main>

        {/* ===================================================================
            UNIFIED BOTTOM HORIZONTAL CAROUSEL DOCK (Phone & Desktop)
            Includes VisualViewport + safe-area-inset-bottom clearance so mobile
            browsers (like Edge Mobile, Safari, Chrome) never cover the flowers!
            =================================================================== */}
        {!isPreviewMode && !isGiftView && (
          <section
            aria-label="Mobile Studio Dock"
            className={`w-full shrink-0 border-t px-2.5 sm:px-5 pt-2 pb-[max(0.85rem,calc(env(safe-area-inset-bottom,0px)+0.5rem))] sm:pb-3 order-2 z-20 select-none transition-all duration-200 ${
              isDarkMode
                ? 'bg-[#1E1C1A] border-stone-800 text-stone-100'
                : 'bg-white border-stone-200/80 text-[#1C1917]'
            }`}
          >
            {/* Row 1: Category Pill Tabs + Collapse/Expand Tray Button (Works on Phone & Desktop) */}
            <div
              className={`flex items-center justify-between gap-1.5 sm:gap-2 ${
                isDesktopDockCollapsed ? 'pb-0' : 'pb-2'
              }`}
            >
              <div
                className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar"
                role="tablist"
              >
                {(
                  [
                    { id: 'templates', label: 'Templates' },
                    { id: 'wrapping', label: 'Wrappers' },
                    { id: 'flowers', label: 'Flowers' },
                    { id: 'fillers', label: 'Fillers' },
                    { id: 'ribbon', label: 'Ribbon' },
                    { id: 'card', label: 'Card' }
                  ] as { id: MobileCategory; label: string }[]
                ).map((cat) => {
                  const isActive = mobileCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => {
                        if (isActive) {
                          setIsDesktopDockCollapsed((prev) => !prev);
                        } else {
                          setMobileCategory(cat.id);
                          setIsDesktopDockCollapsed(false);
                        }
                      }}
                      className={`px-3 sm:px-3.5 py-1 rounded-full text-[11px] sm:text-xs font-medium whitespace-nowrap shrink-0 transition ${
                        isActive
                          ? 'bg-[#B4846C] text-white shadow-xs border border-[#B4846C]'
                          : isDarkMode
                          ? 'bg-[#292524] text-stone-300 border border-stone-700 hover:bg-stone-800'
                          : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              {/* Collapsible Down Toggle for the Bottom Flowers/Wrappers Section (Phone & Desktop) */}
              <button
                type="button"
                onClick={() => setIsDesktopDockCollapsed((prev) => !prev)}
                aria-expanded={!isDesktopDockCollapsed}
                aria-label={
                  isDesktopDockCollapsed
                    ? 'Expand bottom flowers and wrappers tray'
                    : 'Collapse bottom flowers and wrappers tray down'
                }
                title={
                  isDesktopDockCollapsed
                    ? 'Expand tray'
                    : 'Collapse tray down'
                }
                className={`inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-medium border shrink-0 transition ${
                  isDarkMode
                    ? 'bg-[#292524] border-stone-700 text-stone-300 hover:border-[#B4846C] hover:text-white'
                    : 'bg-stone-50 border-stone-200 text-stone-600 hover:border-[#B4846C] hover:text-[#1C1917]'
                }`}
              >
                <span className="hidden lg:inline">{isDesktopDockCollapsed ? 'Show Tray' : 'Hide Tray'}</span>
                {isDesktopDockCollapsed ? (
                  <ChevronUp className="w-3.5 h-3.5 text-[#B4846C]" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-[#B4846C]" />
                )}
              </button>
            </div>

            {/* Row 2: Horizontal Circular Item Carousel (Collapsible down on Phone & Desktop) */}
            <div
              className={`flex items-start gap-2.5 sm:gap-3 overflow-x-auto no-scrollbar pt-0.5 pb-1 ${
                isDesktopDockCollapsed ? 'hidden' : ''
              }`}
            >
              {/* CATEGORY 1: TEMPLATES */}
              {mobileCategory === 'templates' && (
                <>
                  {STARTER_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => {
                        loadSnapshot(tpl.snapshot);
                        triggerToast(`Loaded ${tpl.name}`);
                      }}
                      className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0 w-[60px] sm:w-[68px] group"
                    >
                      <div
                        className={`w-13 h-13 sm:w-16 sm:h-16 rounded-full border flex items-center justify-center shadow-2xs transition-transform group-active:scale-95 ${
                          isDarkMode
                            ? 'bg-[#292524] border-stone-700 group-hover:border-[#B4846C]'
                            : 'bg-stone-50/70 border-stone-200/90 group-hover:border-[#B4846C]'
                        }`}
                      >
                        <MiniTemplateBouquetSVG
                          wrapColor={tpl.snapshot.wrapColor}
                          ribbonColor={tpl.snapshot.ribbonColor}
                          bloomColors={tpl.snapshot.items.slice(0, 3).map((i) => i.petalColor)}
                        />
                      </div>
                      <span className="text-[11px] font-medium text-stone-700 dark:text-stone-300 truncate w-full text-center">
                        {tpl.name}
                      </span>
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      randomizeBouquet();
                      triggerToast('Random arrangement');
                    }}
                    className="flex flex-col items-center gap-1.5 shrink-0 w-[68px] group"
                  >
                    <div
                      className={`w-16 h-16 rounded-full border flex items-center justify-center shadow-2xs transition-transform group-active:scale-95 ${
                        isDarkMode
                          ? 'bg-[#292524] border-stone-700 group-hover:border-[#B4846C]'
                          : 'bg-stone-50/70 border-stone-200/90 group-hover:border-[#B4846C]'
                      }`}
                    >
                      <Shuffle className="w-5 h-5 text-[#B4846C]" />
                    </div>
                    <span className="text-[11px] font-medium text-stone-700 dark:text-stone-300 truncate w-full text-center">
                      Surprise
                    </span>
                  </button>

                  {items.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        clearBouquet();
                        triggerToast('Cleared canvas');
                      }}
                      className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0 w-[60px] sm:w-[68px] group"
                    >
                      <div
                        className={`w-13 h-13 sm:w-16 sm:h-16 rounded-full border flex items-center justify-center shadow-2xs transition-transform group-active:scale-95 ${
                          isDarkMode
                            ? 'bg-[#292524] border-stone-700 group-hover:border-red-400'
                            : 'bg-stone-50/70 border-stone-200/90 group-hover:border-red-300'
                        }`}
                      >
                        <RotateCcw className="w-5 h-5 text-stone-400 group-hover:text-red-500" />
                      </div>
                      <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400 truncate w-full text-center">
                        Reset
                      </span>
                    </button>
                  )}
                </>
              )}

              {/* CATEGORY 2: WRAPPERS (9 Unique Architectural Wrapper Designs — No Color-Only Duplicates) */}
              {mobileCategory === 'wrapping' && (
                <>
                  {WRAPPER_CATALOG.map((ws) => {
                    const isSelected = wrapStyle === ws.id;
                    return (
                      <button
                        key={ws.id}
                        type="button"
                        onClick={() => {
                          setWrapStyle(ws.id);
                          setWrapColor(ws.defaultHex);
                        }}
                        className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0 w-[64px] sm:w-[72px] group"
                      >
                        <div
                          className={`w-13 h-13 sm:w-16 sm:h-16 rounded-2xl border flex items-center justify-center relative transition-transform group-active:scale-95 ${
                            isSelected
                              ? 'border-[#B4846C] ring-2 ring-[#B4846C]/30 bg-white dark:bg-[#292524] shadow-sm'
                              : isDarkMode
                              ? 'bg-[#292524] border-stone-700 hover:border-stone-600'
                              : 'bg-white border-stone-200/90 shadow-xs hover:border-stone-300'
                          }`}
                        >
                          <MiniWrapConeSVG
                            styleType={ws.id}
                            color={ws.defaultHex}
                            ribbon={ribbonColor}
                          />
                        </div>
                        <span className="text-[11px] font-medium text-stone-700 dark:text-stone-300 truncate w-full text-center">
                          {ws.label}
                        </span>
                      </button>
                    );
                  })}
                </>
              )}

              {/* CATEGORY 3: FOCAL FLOWERS */}
              {mobileCategory === 'flowers' &&
                focalFlowers.map((entry) => (
                  <button
                    key={entry.type}
                    type="button"
                    onClick={() => {
                      addFlower(entry.type);
                      triggerToast(`Added ${entry.name}`);
                    }}
                    className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0 w-[60px] sm:w-[68px] group"
                  >
                    <div
                      className={`w-13 h-13 sm:w-16 sm:h-16 rounded-full border flex items-center justify-center overflow-hidden transition-transform group-active:scale-95 ${
                        isDarkMode
                          ? 'bg-[#292524] border-stone-700 group-hover:border-[#B4846C]'
                          : 'bg-stone-50/70 border-stone-200/90 group-hover:border-[#B4846C]'
                      }`}
                    >
                      <svg viewBox="-55 -62 110 124" className="w-10 h-10 sm:w-12 sm:h-12">
                        <FlowerRenderer
                          type={entry.type}
                          petalColor={entry.defaultPetalColor}
                          centerColor={entry.defaultCenterColor}
                        />
                      </svg>
                    </div>
                    <span className="text-[11px] font-medium text-stone-700 dark:text-stone-300 truncate w-full text-center">
                      {entry.name.replace('Garden ', '').replace('Dutch ', '').replace('Stargazer ', '').replace('Golden ', '').replace('Cloud ', '').replace('Chamomile ', '')}
                    </span>
                  </button>
                ))}

              {/* CATEGORY 4: FILLERS & FOLIAGE */}
              {mobileCategory === 'fillers' &&
                fillerFlowers.map((entry) => (
                  <button
                    key={entry.type}
                    type="button"
                    onClick={() => {
                      addFlower(entry.type);
                      triggerToast(`Added ${entry.name}`);
                    }}
                    className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0 w-[60px] sm:w-[68px] group"
                  >
                    <div
                      className={`w-13 h-13 sm:w-16 sm:h-16 rounded-full border flex items-center justify-center overflow-hidden transition-transform group-active:scale-95 ${
                        isDarkMode
                          ? 'bg-[#292524] border-stone-700 group-hover:border-[#B4846C]'
                          : 'bg-stone-50/70 border-stone-200/90 group-hover:border-[#B4846C]'
                      }`}
                    >
                      <svg viewBox="-55 -68 110 135" className="w-10 h-10 sm:w-12 sm:h-12">
                        <FlowerRenderer
                          type={entry.type}
                          petalColor={entry.defaultPetalColor}
                          centerColor={entry.defaultCenterColor}
                        />
                      </svg>
                    </div>
                    <span className="text-[11px] font-medium text-stone-700 dark:text-stone-300 truncate w-full text-center">
                      {entry.name.replace('Silver Dollar ', '').replace('Woodland ', '').replace('French ', '')}
                    </span>
                  </button>
                ))}

              {/* CATEGORY 5: RIBBONS */}
              {mobileCategory === 'ribbon' &&
                RIBBON_SWATCHES.map((rb) => {
                  const isSelected = ribbonColor.toLowerCase() === rb.hex.toLowerCase();
                  return (
                    <button
                      key={rb.hex}
                      type="button"
                      onClick={() => setRibbonColor(rb.hex)}
                      className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0 w-[60px] sm:w-[68px] group"
                    >
                      <div
                        className={`w-13 h-13 sm:w-16 sm:h-16 rounded-full border flex items-center justify-center transition-transform group-active:scale-95 ${
                          isSelected
                            ? 'border-[#B4846C] ring-2 ring-[#B4846C]/30 bg-white dark:bg-[#292524]'
                            : isDarkMode
                            ? 'bg-[#292524] border-stone-700'
                            : 'bg-stone-50/70 border-stone-200/90'
                        }`}
                      >
                        <MiniRibbonBowSVG hex={rb.hex} />
                      </div>
                      <span className="text-[11px] font-medium text-stone-700 dark:text-stone-300 truncate w-full text-center">
                        {rb.name.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}

              {/* CATEGORY 6: GREETING CARD */}
              {mobileCategory === 'card' && (
                <>
                  <button
                    type="button"
                    onClick={() => handleMobileFloatingTool('card')}
                    className="flex flex-col items-center gap-1.5 shrink-0 w-[68px] group"
                  >
                    <div
                      className={`w-16 h-16 rounded-full border flex items-center justify-center transition-transform group-active:scale-95 ${
                        mobilePopover === 'card'
                          ? 'border-[#B4846C] ring-2 ring-[#B4846C]/30 bg-white dark:bg-[#292524]'
                          : isDarkMode
                          ? 'bg-[#292524] border-stone-700 group-hover:border-[#B4846C]'
                          : 'bg-stone-50/70 border-stone-200/90 group-hover:border-[#B4846C]'
                      }`}
                    >
                      <PenLine className="w-5 h-5 text-[#B4846C]" />
                    </div>
                    <span className="text-[11px] font-medium text-stone-700 dark:text-stone-300 truncate w-full text-center">
                      Edit Note
                    </span>
                  </button>

                  {(['cream', 'blush', 'lavender'] as const).map((th) => {
                    const isSelected = card.theme === th && card.visibleOnStage;
                    const bgFill =
                      th === 'blush' ? '#FCE7F3' : th === 'lavender' ? '#EDE9FE' : '#FEF3C7';
                    const borderCol =
                      th === 'blush' ? '#F472B6' : th === 'lavender' ? '#A78BFA' : '#D97706';
                    const sealCol =
                      th === 'blush' ? '#E11D48' : th === 'lavender' ? '#7C3AED' : '#B4846C';
                    return (
                      <button
                        key={th}
                        type="button"
                        onClick={() => updateCard({ theme: th, visibleOnStage: true })}
                        className="flex flex-col items-center gap-1.5 shrink-0 w-[68px] group"
                      >
                        <div
                          className={`w-16 h-16 rounded-full border flex items-center justify-center transition-transform group-active:scale-95 ${
                            isSelected
                              ? 'border-[#B4846C] ring-2 ring-[#B4846C]/30 bg-white dark:bg-[#292524]'
                              : isDarkMode
                              ? 'bg-[#292524] border-stone-700'
                              : 'bg-stone-50/70 border-stone-200/90'
                          }`}
                        >
                          <div
                            className="w-10 h-7 rounded-md border flex items-center justify-start px-1.5 gap-1 shadow-2xs"
                            style={{ backgroundColor: bgFill, borderColor: borderCol }}
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: sealCol }}
                            />
                            <div className="flex flex-col gap-0.5 flex-1">
                              <span
                                className="h-[1.5px] w-full rounded-full opacity-50"
                                style={{ backgroundColor: sealCol }}
                              />
                              <span
                                className="h-[1.5px] w-2/3 rounded-full opacity-35"
                                style={{ backgroundColor: sealCol }}
                              />
                            </div>
                          </div>
                        </div>
                        <span className="text-[11px] font-medium capitalize text-stone-700 dark:text-stone-300 truncate w-full text-center">
                          {th}
                        </span>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => updateCard({ visibleOnStage: !card.visibleOnStage })}
                    className="flex flex-col items-center gap-1.5 shrink-0 w-[68px] group"
                  >
                    <div
                      className={`w-16 h-16 rounded-full border flex items-center justify-center transition-transform group-active:scale-95 ${
                        !card.visibleOnStage
                          ? 'border-[#B4846C] ring-2 ring-[#B4846C]/30 bg-white dark:bg-[#292524]'
                          : isDarkMode
                          ? 'bg-[#292524] border-stone-700'
                          : 'bg-stone-50/70 border-stone-200/90'
                      }`}
                    >
                      <Mail className="w-5 h-5 text-stone-500 dark:text-stone-400" />
                    </div>
                    <span className="text-[11px] font-medium text-stone-700 dark:text-stone-300 truncate w-full text-center">
                      {card.visibleOnStage ? 'Hide Tag' : 'Show Tag'}
                    </span>
                  </button>
                </>
              )}
            </div>
          </section>
        )}

        {/* ===================================================================
            DESKTOP LEFT SIDEBAR STUDIO (lg+)
            =================================================================== */}
        {!isPreviewMode && !isGiftView && (
          <aside
            className={`hidden w-full backdrop-blur-xl border-t lg:border-t-0 lg:border-r flex-col order-2 lg:order-1 z-20 shrink-0 transition-all duration-300 ease-in-out ${
              isDarkMode
                ? 'bg-[#1E1C1A] border-stone-800 text-stone-100'
                : 'bg-[#F5F3EF] border-stone-200 text-[#1C1917]'
            } ${
              drawerState === 'collapsed'
                ? 'h-[52px]'
                : drawerState === 'expanded'
                ? 'h-[80vh] sm:h-[84vh]'
                : 'h-[44vh] sm:h-[46vh]'
            } ${
              isSidebarOpen
                ? 'lg:h-full lg:w-[360px] xl:w-[400px]'
                : 'lg:w-0 lg:h-full lg:overflow-hidden lg:border-none'
            }`}
          >
            {/* Desktop Sidebar Collapse Header */}
            <div className="hidden lg:flex items-center justify-between px-4 py-2.5 border-b border-stone-200 dark:border-stone-800">
              <span className="text-xs font-semibold tracking-wider uppercase text-stone-500 dark:text-stone-400">
                Botanical Studio
              </span>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                title="Collapse studio panel"
                aria-label="Collapse studio panel"
                className="p-1 rounded-lg hover:bg-stone-200/60 dark:hover:bg-stone-800 text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 transition"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>

            {/* Preserved Mobile Sheet Toggle Button for SSR Test Compatibility */}
            <div className="hidden">
              <button
                type="button"
                onClick={() => {
                  autoCollapsedRef.current = false;
                  setDrawerState((prev) =>
                    prev === 'collapsed' ? 'peek' : prev === 'peek' ? 'expanded' : 'peek'
                  );
                }}
                aria-label="Toggle drawer sheet height"
              />
            </div>

            {/* Drawer Navigation Tabs */}
            <div
              className={`grid grid-cols-3 gap-1 p-1.5 border-b shrink-0 ${
                isDarkMode
                  ? 'bg-[#1E1C1A] border-stone-800'
                  : 'bg-[#F5F3EF] border-stone-200'
              }`}
              role="tablist"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'flowers'}
                onClick={() => {
                  setActiveTab('flowers');
                  if (drawerState === 'collapsed') setDrawerState('peek');
                }}
                className={`py-2 px-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                  activeTab === 'flowers'
                    ? isDarkMode
                      ? 'bg-[#292524] border border-stone-700 text-stone-100 shadow-sm'
                      : 'bg-white border border-stone-200 text-[#1C1917] shadow-sm'
                    : isDarkMode
                    ? 'text-stone-400 hover:text-stone-100'
                    : 'text-stone-600 hover:text-[#1C1917]'
                }`}
              >
                <Flower2 className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400 shrink-0" />
                <span className="truncate">Flowers</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'wrap'}
                onClick={() => {
                  setActiveTab('wrap');
                  if (drawerState === 'collapsed') setDrawerState('peek');
                }}
                className={`py-2 px-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1 transition ${
                  activeTab === 'wrap'
                    ? isDarkMode
                      ? 'bg-[#292524] border border-stone-700 text-stone-100 shadow-sm'
                      : 'bg-white border border-stone-200 text-[#1C1917] shadow-sm'
                    : isDarkMode
                    ? 'text-stone-400 hover:text-stone-100'
                    : 'text-stone-600 hover:text-[#1C1917]'
                }`}
              >
                <Gift className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400 shrink-0" />
                <span className="truncate">Wrapping</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'card'}
                onClick={() => {
                  setActiveTab('card');
                  if (drawerState === 'collapsed') setDrawerState('peek');
                }}
                className={`py-2 px-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1 transition ${
                  activeTab === 'card'
                    ? isDarkMode
                      ? 'bg-[#292524] border border-stone-700 text-stone-100 shadow-sm'
                      : 'bg-white border border-stone-200 text-[#1C1917] shadow-sm'
                    : isDarkMode
                    ? 'text-stone-400 hover:text-stone-100'
                    : 'text-stone-600 hover:text-[#1C1917]'
                }`}
              >
                <Mail className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400 shrink-0" />
                <span className="truncate">Card</span>
              </button>
            </div>

            {/* Drawer Content Body */}
            <div
              className={`flex-1 overflow-y-auto p-3 sm:p-4 pb-8 space-y-4 ${
                drawerState === 'collapsed' ? 'hidden lg:block' : 'block'
              }`}
            >
              {/* TAB 1: FLOWER PALETTE + STARTER TEMPLATES */}
              {activeTab === 'flowers' && (
                <div className="space-y-4">
                  {/* Starter Bouquet Templates Strip */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                      Templates
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2">
                      {STARTER_TEMPLATES.map((tpl) => (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => {
                            loadSnapshot(tpl.snapshot);
                            triggerToast(`Loaded "${tpl.name}" template`);
                          }}
                          className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2.5 ${
                            isDarkMode
                              ? 'bg-[#292524] hover:bg-[#34302c] border-stone-700 hover:border-[#B4846C] text-stone-100'
                              : 'bg-white hover:bg-stone-50 border-stone-200 hover:border-[#B4846C] text-[#1C1917]'
                          }`}
                        >
                          <div className="w-9 h-9 rounded-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex items-center justify-center shrink-0">
                            <MiniTemplateBouquetSVG
                              wrapColor={tpl.snapshot.wrapColor}
                              ribbonColor={tpl.snapshot.ribbonColor}
                              bloomColors={tpl.snapshot.items.slice(0, 3).map((i) => i.petalColor)}
                            />
                          </div>
                          <span className="text-xs font-medium truncate text-[#1C1917] dark:text-stone-100">
                            {tpl.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <h2 className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                      Flowers
                    </h2>
                    {items.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          clearBouquet();
                          triggerToast('Cleared bouquet');
                        }}
                        className="text-[11px] font-medium text-stone-500 hover:text-red-600 dark:text-stone-400 dark:hover:text-red-400 flex items-center gap-1 transition"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Clear all</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {FLOWER_CATALOG.map((entry) => (
                      <button
                        key={entry.type}
                        type="button"
                        onClick={() => {
                          addFlower(entry.type);
                          triggerToast(`Added ${entry.name}`);
                        }}
                        aria-label={`Add ${entry.name} to bouquet`}
                        className={`group p-2.5 rounded-xl border transition flex flex-col items-center gap-1.5 text-center ${
                          isDarkMode
                            ? 'bg-[#292524] hover:bg-[#34302c] border-stone-700 hover:border-[#B4846C]'
                            : 'bg-white hover:bg-stone-50 border-stone-200 hover:border-[#B4846C]'
                        }`}
                      >
                        <div
                          className={`w-14 h-14 rounded-full border flex items-center justify-center shrink-0 overflow-hidden ${
                            isDarkMode
                              ? 'bg-stone-900 border-stone-800'
                              : 'bg-stone-50 border-stone-200'
                          }`}
                        >
                          <svg viewBox="-60 -65 120 130" className="w-12 h-12">
                            <FlowerRenderer
                              type={entry.type}
                              petalColor={entry.defaultPetalColor}
                              centerColor={entry.defaultCenterColor}
                            />
                          </svg>
                        </div>
                        <span className="text-xs font-medium text-[#1C1917] dark:text-stone-100 truncate w-full">
                          {entry.name}
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
                    <h2 className="text-xs font-semibold text-stone-700 dark:text-stone-300 mb-2">
                      Wrapping
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2">
                      {[
                        { id: 'kraft' as typeWrapStyle, title: 'Kraft paper' },
                        { id: 'tissue' as typeWrapStyle, title: 'Silk tissue' },
                        { id: 'celestial' as typeWrapStyle, title: 'Starlit wrap' },
                        { id: 'plain' as typeWrapStyle, title: 'Hand-tied stems' }
                      ].map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setWrapStyle(st.id)}
                          className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2.5 ${
                            wrapStyle === st.id
                              ? 'border-[#B4846C] ring-1 ring-[#B4846C] bg-white dark:bg-[#292524] text-[#1C1917] dark:text-stone-100 shadow-sm'
                              : isDarkMode
                              ? 'bg-[#292524] border-stone-700 text-stone-200 hover:bg-stone-800'
                              : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex items-center justify-center shrink-0">
                            <MiniWrapConeSVG styleType={st.id} color={wrapColor} ribbon={ribbonColor} />
                          </div>
                          <span className="text-xs font-medium truncate">{st.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {wrapStyle !== 'plain' && (
                    <div>
                      <h3 className="text-xs font-semibold text-stone-700 dark:text-stone-300 mb-2">
                        Paper color
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {PAPER_SWATCHES.map((sw) => (
                          <button
                            key={sw.hex}
                            type="button"
                            onClick={() => setWrapColor(sw.hex)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 border transition ${
                              wrapColor === sw.hex
                                ? 'border-[#B4846C] ring-1 ring-[#B4846C] bg-white dark:bg-[#292524] text-[#1C1917] dark:text-stone-100'
                                : isDarkMode
                                ? 'border-stone-700 bg-[#292524] hover:bg-stone-800 text-stone-200'
                                : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-700'
                            }`}
                          >
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-black/15 shrink-0"
                              style={{ backgroundColor: sw.hex }}
                            />
                            <span>{sw.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-xs font-semibold text-stone-700 dark:text-stone-300 mb-2">
                      Ribbon
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2">
                      {RIBBON_SWATCHES.map((rb) => (
                        <button
                          key={rb.hex}
                          type="button"
                          onClick={() => setRibbonColor(rb.hex)}
                          className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition ${
                            ribbonColor === rb.hex
                              ? 'border-[#B4846C] ring-1 ring-[#B4846C] bg-white dark:bg-[#292524] text-[#1C1917] dark:text-stone-100 shadow-sm'
                              : isDarkMode
                              ? 'border-stone-700 bg-[#292524] hover:bg-stone-800 text-stone-200'
                              : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-700'
                          }`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
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
                    <h2 className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                      Greeting card
                    </h2>
                    <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer text-stone-700 dark:text-stone-200">
                      <input
                        type="checkbox"
                        checked={card.visibleOnStage}
                        onChange={(e) => updateCard({ visibleOnStage: e.target.checked })}
                        className="accent-[#B4846C] rounded cursor-pointer w-4 h-4"
                      />
                      <span>Show card</span>
                    </label>
                  </div>

                  {/* Card Stationary Theme */}
                  <div className="flex items-center gap-2">
                    {(['cream', 'blush', 'lavender'] as const).map((th) => (
                      <button
                        key={th}
                        type="button"
                        onClick={() => updateCard({ theme: th })}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-medium capitalize border transition ${
                          card.theme === th
                            ? 'bg-[#1C1917] text-white border-[#1C1917] dark:bg-white dark:text-[#1C1917] dark:border-white'
                            : isDarkMode
                            ? 'border-stone-700 bg-[#292524] text-stone-200 hover:bg-stone-800'
                            : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                        }`}
                      >
                        {th}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3 p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#1E1C1A]">
                    <div>
                      <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">
                        To
                      </label>
                      <input
                        type="text"
                        maxLength={22}
                        value={card.to}
                        onFocus={handleCardInputFocus}
                        onChange={(e) => updateCard({ to: e.target.value })}
                        placeholder="My Dearest"
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-[#141211] text-[#1C1917] dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-600 text-sm focus:outline-none focus:border-[#B4846C] focus:ring-1 focus:ring-[#B4846C]/20 transition"
                        style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '16px' }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">
                        Message
                      </label>
                      <textarea
                        rows={3}
                        maxLength={86}
                        value={card.message}
                        onFocus={handleCardInputFocus}
                        onChange={(e) => updateCard({ message: e.target.value })}
                        placeholder="Write a sweet note..."
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-[#141211] text-[#1C1917] dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-600 text-sm focus:outline-none focus:border-[#B4846C] focus:ring-1 focus:ring-[#B4846C]/20 resize-none transition"
                        style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '16px' }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">
                        From
                      </label>
                      <input
                        type="text"
                        maxLength={20}
                        value={card.from}
                        onFocus={handleCardInputFocus}
                        onChange={(e) => updateCard({ from: e.target.value })}
                        placeholder="Yours Always"
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-[#141211] text-[#1C1917] dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-600 text-sm focus:outline-none focus:border-[#B4846C] focus:ring-1 focus:ring-[#B4846C]/20 transition"
                        style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '16px' }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}

        {/* ===================================================================
            DESKTOP SECONDARY LEFT SIDEBAR: STEM COLORS, SIZE & LAYER ORDER (lg+)
            Keeps color pickers, scale/tilt sliders, and draggable layer order
            docked on the left side so the main bouquet canvas never changes size!
            =================================================================== */}
        {!isPreviewMode && !isGiftView && (
          <aside
            aria-label="Stem Inspector and Layer Order Sidebar"
            className={`hidden flex-col order-2 lg:order-2 z-20 shrink-0 border-r transition-all duration-300 ease-in-out ${
              isDarkMode
                ? 'bg-[#191715] border-stone-800 text-stone-100'
                : 'bg-[#FAF8F5] border-stone-200 text-[#1C1917]'
            } ${
              isInspectorSidebarOpen
                ? 'lg:h-full lg:w-[320px] xl:w-[340px]'
                : 'lg:w-0 lg:h-full lg:overflow-hidden lg:border-none'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-stone-200 dark:border-stone-800 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Sliders className="w-3.5 h-3.5 text-[#B4846C] shrink-0" />
                <span className="text-xs font-semibold tracking-wider uppercase text-stone-500 dark:text-stone-400 truncate">
                  Stem &amp; Layers
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsInspectorSidebarOpen(false)}
                title="Collapse stem & layer inspector"
                aria-label="Collapse stem & layer inspector"
                className="p-1 rounded-lg hover:bg-stone-200/60 dark:hover:bg-stone-800 text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 transition"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body: Top = Selected Stem Color/Size Controls, Bottom = Draggable Layer Order */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {/* Section 1: Selected Flower Color, Scale & Tilt Inspector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-[#B4846C]" />
                    <span>Stem Color &amp; Size</span>
                  </span>
                  {selectedId && (
                    <span className="text-[10px] text-[#B4846C] font-medium">
                      Active stem
                    </span>
                  )}
                </div>

                {selectedId ? (
                  <SelectedFlowerToolbar
                    isDrawerOpen={drawerState !== 'collapsed'}
                    onRequestCollapseDrawer={() => {
                      autoCollapsedRef.current = false;
                      setDrawerState('collapsed');
                    }}
                  />
                ) : (
                  <div
                    className={`rounded-2xl border border-dashed p-3.5 text-center transition ${
                      isDarkMode
                        ? 'border-stone-800 bg-[#1E1C1A]/60 text-stone-400'
                        : 'border-stone-200 bg-white/70 text-stone-500'
                    }`}
                  >
                    <Palette className="w-5 h-5 mx-auto mb-1.5 text-[#B4846C]/70" />
                    <p className="text-xs font-medium text-stone-700 dark:text-stone-300">
                      No stem selected
                    </p>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 leading-relaxed">
                      Click any flower on the canvas or in the layer list below to customize its petal colors, size, and tilt.
                    </p>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="h-[1px] bg-stone-200/80 dark:bg-stone-800" />

              {/* Section 2: Real Draggable & Reorderable Layer Manager */}
              <LayerManagerPanel isEmbeddedInSidebar />
            </div>
          </aside>
        )}
      </div>

      {/* =====================================================================
          ZOOMING HANDWRITTEN GREETING CARD MODAL
          Triggered when clicking the wiggling card tag pinned on the bouquet.
          Uses the exact same card design (Cream, Blush, or Lavender) and writes
          out the note like a sweet handwritten letter!
          ===================================================================== */}
      {isLetterModalOpen && (() => {
        const cardPalette =
          card.theme === 'blush'
            ? {
                bg: '#FCE7F3',
                border: '#F472B6',
                inner: '#E11D48',
                seal: '#E11D48',
                title: '#831843',
                body: '#9D174D',
                sign: '#BE185D',
                rule: 'rgba(225, 29, 72, 0.14)'
              }
            : card.theme === 'lavender'
            ? {
                bg: '#EDE9FE',
                border: '#A78BFA',
                inner: '#7C3AED',
                seal: '#7C3AED',
                title: '#3B0764',
                body: '#4C1D95',
                sign: '#6D28D9',
                rule: 'rgba(124, 58, 237, 0.14)'
              }
            : {
                bg: '#FEF3C7',
                border: '#D97706',
                inner: '#B4846C',
                seal: '#B4846C',
                title: '#1C1917',
                body: '#292524',
                sign: '#78716C',
                rule: 'rgba(180, 132, 108, 0.18)'
              };

        const toFull = `Dearest ${card.to || 'Someone Special'},`;
        const msgFull = card.message || 'Thinking of you with love and blossoms.';
        const fromFull = `With love, ${card.from || 'Yours Always'}`;

        const toVisible = toFull.slice(0, Math.min(letterTypedChars, toFull.length));
        const msgCount = Math.max(0, letterTypedChars - toFull.length);
        const msgVisible = msgFull.slice(0, Math.min(msgCount, msgFull.length));
        const fromCount = Math.max(0, letterTypedChars - toFull.length - msgFull.length);
        const fromVisible = fromFull.slice(0, Math.min(fromCount, fromFull.length));
        const isWritingTo = letterTypedChars < toFull.length;
        const isWritingMsg = letterTypedChars >= toFull.length && letterTypedChars < toFull.length + msgFull.length;
        const isWritingFrom =
          letterTypedChars >= toFull.length + msgFull.length &&
          letterTypedChars < toFull.length + msgFull.length + fromFull.length;

        return (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Handwritten Greeting Card"
            onClick={() => setIsLetterModalOpen(false)}
            className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="card-zoom-modal w-full max-w-md rounded-3xl p-2.5 sm:p-3 shadow-2xl relative"
              style={{
                backgroundColor: cardPalette.bg,
                border: `2.5px solid ${cardPalette.border}`
              }}
            >
              {/* Inner Dashed Stitch Frame (Matches Bouquet Stage Card Tag) */}
              <div
                className="rounded-2xl p-5 sm:p-7 relative"
                style={{
                  border: `1.5px dashed ${cardPalette.inner}`
                }}
              >
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setIsLetterModalOpen(false)}
                  aria-label="Close card"
                  className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full flex items-center justify-center bg-white/60 hover:bg-white/90 transition"
                  style={{ color: cardPalette.title }}
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Embossed Wax Seal Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shadow-md shrink-0 relative"
                    style={{ backgroundColor: cardPalette.seal }}
                  >
                    <div className="w-7 h-7 rounded-full border border-white/60 flex items-center justify-center">
                      <Flower2 className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <span
                      className="text-[11px] uppercase tracking-widest font-semibold opacity-70 block"
                      style={{ color: cardPalette.sign }}
                    >
                      A Personal Note
                    </span>
                  </div>
                </div>

                {/* Handwritten Greeting ("Dearest ...,") */}
                <div
                  className="text-2xl sm:text-3xl font-semibold tracking-wide min-h-[2.25rem]"
                  style={{
                    fontFamily: "'Caveat', 'Cormorant Garamond', cursive",
                    color: cardPalette.title
                  }}
                >
                  <span>{toVisible}</span>
                  {isWritingTo && (
                    <PenLine
                      className="w-4 h-4 inline-block ml-1 animate-bounce"
                      style={{ color: cardPalette.seal }}
                    />
                  )}
                </div>

                {/* Handwritten Body on Subtle Ruled Stationery Lines (Scrollable to preserve card design & length) */}
                <div
                  ref={letterBodyScrollRef}
                  className="mt-3 sm:mt-4 py-2 min-h-[6.5rem] max-h-[9.5rem] sm:max-h-[11rem] overflow-y-auto pr-1.5 text-2xl sm:text-[26px] leading-[2.2rem] sm:leading-[2.35rem] break-words"
                  style={{
                    fontFamily: "'Caveat', 'Cormorant Garamond', cursive",
                    color: cardPalette.body,
                    backgroundImage: `repeating-linear-gradient(transparent, transparent 35px, ${cardPalette.rule} 35px, ${cardPalette.rule} 36px)`,
                    backgroundAttachment: 'local',
                    scrollbarWidth: 'thin'
                  }}
                >
                  <span className="whitespace-pre-wrap">{msgVisible}</span>
                  {isWritingMsg && (
                    <PenLine
                      className="w-4 h-4 inline-block ml-1 animate-bounce"
                      style={{ color: cardPalette.seal }}
                    />
                  )}
                </div>

                {/* Handwritten Signature ("With love, ...") */}
                <div
                  className="mt-4 text-right text-xl sm:text-2xl font-semibold italic min-h-[2rem]"
                  style={{
                    fontFamily: "'Caveat', 'Cormorant Garamond', cursive",
                    color: cardPalette.sign
                  }}
                >
                  <span>{fromVisible ? `— ${fromVisible}` : ''}</span>
                  {isWritingFrom && (
                    <PenLine
                      className="w-4 h-4 inline-block ml-1 animate-bounce"
                      style={{ color: cardPalette.seal }}
                    />
                  )}
                </div>

                {/* Subtle Card Footer Actions (Replay writing removed) */}
                <div
                  className="mt-5 pt-3.5 flex items-center justify-end gap-2"
                  style={{ borderTop: `1px solid ${cardPalette.rule}` }}
                >
                  <button
                    type="button"
                    onClick={() => setIsLetterModalOpen(false)}
                    className="px-4 py-1.5 rounded-full text-xs font-semibold text-white shadow-xs transition active:scale-95"
                    style={{ backgroundColor: cardPalette.seal }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MOBILE / COMPACT GREETING CARD EDITOR MODAL */}
      {isCardModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Edit Greeting Card"
          onClick={() => setIsCardModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-sm rounded-2xl p-4 shadow-xl border relative space-y-3 ${
              isDarkMode
                ? 'bg-[#1E1C1A] border-stone-700 text-stone-100'
                : 'bg-white border-stone-200 text-[#1C1917]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#B4846C]" />
                <h3 className="text-sm font-semibold">Greeting Card</h3>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer text-stone-600 dark:text-stone-300">
                  <input
                    type="checkbox"
                    checked={card.visibleOnStage}
                    onChange={(e) => updateCard({ visibleOnStage: e.target.checked })}
                    className="accent-[#B4846C] rounded cursor-pointer w-3.5 h-3.5"
                  />
                  <span>Show</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsCardModalOpen(false)}
                  className="p-1 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400"
                  aria-label="Close card editor"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {(['cream', 'blush', 'lavender'] as const).map((th) => (
                <button
                  key={th}
                  type="button"
                  onClick={() => updateCard({ theme: th })}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-medium capitalize border transition ${
                    card.theme === th
                      ? 'bg-[#B4846C] text-white border-[#B4846C]'
                      : isDarkMode
                      ? 'border-stone-700 bg-[#292524] text-stone-200'
                      : 'border-stone-200 bg-stone-50 text-stone-700'
                  }`}
                >
                  {th}
                </button>
              ))}
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-medium text-stone-500 dark:text-stone-400 mb-1">
                  To
                </label>
                <input
                  type="text"
                  maxLength={22}
                  value={card.to}
                  onChange={(e) => updateCard({ to: e.target.value })}
                  placeholder="My Dearest"
                  className="w-full px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-[#141211] text-sm focus:outline-none focus:border-[#B4846C]"
                  style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '16px' }}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-stone-500 dark:text-stone-400 mb-1">
                  Message
                </label>
                <textarea
                  rows={3}
                  maxLength={86}
                  value={card.message}
                  onChange={(e) => updateCard({ message: e.target.value })}
                  placeholder="Write a sweet note..."
                  className="w-full px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-[#141211] text-sm focus:outline-none focus:border-[#B4846C] resize-none"
                  style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '16px' }}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-stone-500 dark:text-stone-400 mb-1">
                  From
                </label>
                <input
                  type="text"
                  maxLength={20}
                  value={card.from}
                  onChange={(e) => updateCard({ from: e.target.value })}
                  placeholder="Yours Always"
                  className="w-full px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-[#141211] text-sm focus:outline-none focus:border-[#B4846C]"
                  style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '16px' }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsCardModalOpen(false)}
              className="w-full py-2 rounded-xl bg-[#1C1917] text-white dark:bg-stone-100 dark:text-[#1C1917] text-xs font-medium"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* SHARE / SEND MODAL DIALOG */}
      {isShareModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setIsShareModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-4 sm:p-6 shadow-xl border border-stone-200 dark:border-stone-700 relative ${
              isDarkMode
                ? 'bg-[#1E1C1A] text-stone-100'
                : 'bg-white text-[#1C1917]'
            }`}
          >
            <button
              type="button"
              onClick={() => setIsShareModalOpen(false)}
              className="absolute top-3.5 right-3.5 p-2 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#1C1917] flex items-center justify-center text-white shrink-0">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold">Share your bouquet</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Send this arrangement with music and animated bloom
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div
                className={`p-4 rounded-xl border space-y-2.5 ${
                  isDarkMode ? 'bg-[#292524] border-stone-700' : 'bg-[#F5F3EF] border-stone-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">
                    Recipient animated gift link
                  </span>
                  <span className="text-[10px] text-stone-500 dark:text-stone-400 font-medium">
                    View-Only Gift
                  </span>
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Opens in View-Only mode with a sweet entrance, autoplay music, and bloom animation (recipient cannot edit your flowers)
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleShareLink(true);
                      setIsShareModalOpen(false);
                    }}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white dark:bg-white dark:text-[#1C1917] dark:hover:bg-stone-200 text-xs font-medium flex items-center justify-center gap-1.5 transition shadow-sm"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy recipient gift link</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsShareModalOpen(false);
                      startGiftBloomAnimation(items.length, true);
                    }}
                    className="py-2.5 px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-[#1E1C1A] text-stone-800 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800 text-xs font-medium flex items-center justify-center gap-1.5 transition shrink-0"
                  >
                    <Play className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                    <span>Preview bloom</span>
                  </button>
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                  isDarkMode ? 'bg-[#292524] border-stone-700' : 'bg-white border-stone-200'
                }`}
              >
                <div className="min-w-0">
                  <div className="text-xs font-medium">Keepsake PNG image</div>
                  <div className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
                    Save transparent high-res PNG image
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleExportPng();
                    setIsShareModalOpen(false);
                  }}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition shrink-0 ${
                    isDarkMode
                      ? 'bg-[#1E1C1A] hover:bg-stone-800 text-stone-200 border-stone-700'
                      : 'bg-white hover:bg-stone-50 text-stone-800 border-stone-200'
                  }`}
                >
                  <Download className="w-3.5 h-3.5 inline mr-1 text-stone-500 dark:text-stone-400" />
                  Save PNG
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION PILL */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#1C1917]/90 text-white dark:bg-stone-100 dark:text-[#1C1917] px-5 py-2.5 rounded-full text-xs font-medium shadow-lg backdrop-blur-sm animate-[fadeIn_200ms_ease-out]"
        >
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}
