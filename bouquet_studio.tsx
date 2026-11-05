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
  Sliders
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

export function encodeBouquetToShareUrl(snapshot: BouquetSnapshot): string {
  try {
    const json = JSON.stringify(snapshot);
    const encoded = typeof btoa === 'function'
      ? btoa(encodeURIComponent(json))
      : Buffer.from(encodeURIComponent(json)).toString('base64');
    const baseUrl = typeof window !== 'undefined' ? window.location.href : 'https://bouquet-studio.local/';
    const url = new URL(baseUrl);
    url.hash = `bouquet=${encoded}`;
    return url.toString();
  } catch {
    return typeof window !== 'undefined' ? window.location.href : '';
  }
}

export function decodeBouquetFromHash(): BouquetSnapshot | null {
  try {
    if (typeof window === 'undefined') return null;
    const hash = window.location.hash;
    if (!hash.startsWith('#bouquet=')) return null;
    const raw = hash.replace('#bouquet=', '');
    const json = decodeURIComponent(typeof atob === 'function' ? atob(raw) : Buffer.from(raw, 'base64').toString());
    return JSON.parse(json) as BouquetSnapshot;
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
    const textContent = fo.textContent || '';
    const textNode = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textNode.setAttribute('x', fo.getAttribute('x') || '-68');
    textNode.setAttribute('y', '5');
    textNode.setAttribute('fill', '#1C1917');
    textNode.setAttribute('font-size', '13');
    textNode.setAttribute('font-family', "'Cormorant Garamond', serif");
    const lines = wrapCardText(textContent, 22);
    lines.forEach((line, idx) => {
      const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
      tspan.setAttribute('x', fo.getAttribute('x') || '-68');
      tspan.setAttribute('dy', idx === 0 ? '0' : '15');
      tspan.textContent = line;
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
    if (this.isPlaying) return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.isPlaying = true;
    this.playChimeNote();
    this.timerId = window.setInterval(() => {
      if (this.isPlaying) {
        this.playChimeNote();
      }
    }, 680);
  }

  public stop(): void {
    this.isPlaying = false;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private playChimeNote(): void {
    if (!this.ctx || !this.isPlaying) return;
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
  svgRef: React.RefObject<SVGSVGElement | null> | React.RefObject<SVGSVGElement> | any;
  isPreviewMode: boolean;
  isDarkMode?: boolean;
  bloomedCount?: number;
  showCardInGiftView?: boolean;
}

export const BouquetStage: React.FC<BouquetStageProps> = ({
  svgRef,
  isPreviewMode,
  isDarkMode = false,
  bloomedCount,
  showCardInGiftView = true
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
    if (isPreviewMode) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    selectItem(item.id);
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
    if (isPreviewMode) return;
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
        {(bloomedCount !== undefined ? items.slice(0, bloomedCount) : items).map((item) => {
          const isSelected = !isPreviewMode && item.id === selectedId;
          return (
            <g
              key={item.id}
              transform={`translate(${item.x}, ${item.y}) rotate(${item.rotation}) scale(${
                item.flipX ? -item.scale : item.scale
              }, ${item.scale})`}
              onPointerDown={(e) => handleItemPointerDown(e, item)}
              className={isPreviewMode ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}
              style={{ filter: isSelected ? 'drop-shadow(0px 8px 14px rgba(180,132,108,0.35))' : 'url(#softShadow)' }}
            >
              {/* Invisible generous hit target for easy touch tapping */}
              <circle cx="0" cy="-10" r="48" fill="transparent" />
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
        {card.visibleOnStage && showCardInGiftView && (
          <g
            transform="translate(425, 520) rotate(-6)"
            filter="url(#softShadow)"
            className="pointer-events-none"
          >
            {/* Fastener cord */}
            <path d="M-115,-18 Q-55,-25 -10,-32" stroke="#B4846C" strokeWidth="1.6" fill="none" opacity="0.8" />
            <rect
              x="-85"
              y="-42"
              width="175"
              height="112"
              rx="12"
              fill={
                card.theme === 'blush'
                  ? '#FAF5F2'
                  : card.theme === 'lavender'
                  ? '#F5F3F7'
                  : '#FAF8F5'
              }
              stroke="#E8DDD3"
              strokeWidth="1.2"
            />
            <rect
              x="-79"
              y="-36"
              width="163"
              height="100"
              rx="8"
              fill="none"
              stroke="#B4846C"
              strokeWidth="0.7"
              strokeDasharray="3 3"
              opacity="0.35"
            />
            {/* Wax Seal */}
            <circle cx="-62" cy="-22" r="8" fill="#B4846C" />
            <text
              x="-46"
              y="-18"
              fill="#1C1917"
              fontSize="12"
              fontWeight="600"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              To: {card.to.slice(0, 22)}
            </text>
            <text
              x="-70"
              y="-1"
              fill="#292524"
              fontSize="13"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              {wrapCardText(card.message, 22).map((line, idx) => (
                <tspan key={idx} x="-70" dy={idx === 0 ? 0 : 15}>
                  {line}
                </tspan>
              ))}
            </text>
            <text
              x="72"
              y="58"
              textAnchor="end"
              fill="#78716C"
              fontSize="11"
              fontWeight="500"
              fontStyle="italic"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
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
              stroke="#B4846C"
              strokeWidth="1.5"
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
              {/* Invisible generous touch target (48px diameter) for easy mobile manipulation */}
              <circle cx="0" cy="0" r="24" fill="transparent" />
              <circle cx="0" cy="0" r="13" fill="#1C1917" stroke="#ffffff" strokeWidth="2" />
              <path
                d="M-4,-4 L4,4 M4,-4 L-4,4"
                stroke="#ffffff"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </g>
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
// MODULE 6: components/SelectedFlowerToolbar.tsx — FLOATING INSPECTOR & COLOR PICKER
// ============================================================================

export interface SelectedFlowerToolbarProps {
  isDrawerOpen?: boolean;
  onRequestCollapseDrawer?: () => void;
}

export const SelectedFlowerToolbar: React.FC<SelectedFlowerToolbarProps> = ({
  isDrawerOpen = false,
  onRequestCollapseDrawer
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
  const shouldMinimize = isMinimized || (isDrawerOpen && typeof window !== 'undefined' && window.innerWidth < 1024);

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
          <span className="text-[11px] text-stone-500 dark:text-stone-400 font-mono shrink-0">
            {Math.round(selected.scale * 100)}%
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={flipSelected}
            className="p-1.5 rounded-lg bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition"
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
            className="p-1.5 rounded-lg bg-stone-50 hover:bg-red-50 text-stone-500 hover:text-red-500 dark:bg-stone-800 dark:hover:bg-red-950/40 dark:text-stone-400 dark:hover:text-red-400 transition"
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
            onClick={() => selectItem(null)}
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
      {/* Top Row: Name + Scale + Minimize + Close */}
      <div className="flex items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-800 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-3.5 h-3.5 rounded-full border border-stone-300 dark:border-stone-600 shrink-0"
            style={{ backgroundColor: selected.petalColor }}
          />
          <span className="text-xs font-semibold text-[#1C1917] dark:text-stone-100 truncate">
            {meta?.name || selected.type}
          </span>
          <span className="text-[11px] text-stone-600 dark:text-stone-300 font-mono shrink-0 px-1.5 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800">
            {Math.round(selected.scale * 100)}%
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="p-1.5 sm:p-2 rounded-lg bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 transition"
            title="Minimize Inspector"
            aria-label="Minimize Flower Controls"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => selectItem(null)}
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
            className="h-8 px-2.5 rounded-lg bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-medium flex items-center gap-1.5 transition"
            title="Send Backward"
            aria-label="Send Flower Backward"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:inline">Back</span>
          </button>
          <button
            type="button"
            onClick={bringForward}
            className="h-8 px-2.5 rounded-lg bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-medium flex items-center gap-1.5 transition"
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
            className="h-8 px-2.5 rounded-lg bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-medium flex items-center gap-1.5 transition"
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
            className="h-8 px-2.5 rounded-lg bg-stone-50 hover:bg-red-50 text-stone-500 hover:text-red-500 dark:bg-stone-800 dark:hover:bg-red-950/40 dark:text-stone-400 dark:hover:text-red-400 text-xs font-medium flex items-center gap-1.5 transition"
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
          <div className="flex justify-between text-stone-700 dark:text-stone-300 mb-1 font-medium">
            <span className="flex items-center gap-1 text-stone-600 dark:text-stone-400">
              <Maximize2 className="w-3 h-3 text-stone-500 dark:text-stone-400" /> Size
            </span>
            <span>{Math.round(selected.scale * 100)}%</span>
          </div>
          <input
            type="range"
            min="45"
            max="200"
            value={Math.round(selected.scale * 100)}
            onChange={(e) =>
              handleSliderChange({ scale: Number(e.target.value) / 100 })
            }
            onPointerUp={handleSliderPointerUp}
            onPointerCancel={handleSliderPointerUp}
            onBlur={handleSliderPointerUp}
            aria-label="Flower Size"
            className="w-full accent-[#B4846C] h-2 bg-stone-100 dark:bg-stone-800 rounded-lg cursor-pointer touch-none"
          />
        </div>
        <div>
          <div className="flex justify-between text-stone-700 dark:text-stone-300 mb-1 font-medium">
            <span className="flex items-center gap-1 text-stone-600 dark:text-stone-400">
              <RotateCw className="w-3 h-3 text-stone-500 dark:text-stone-400" /> Tilt Angle
            </span>
            <span>{selected.rotation}°</span>
          </div>
          <input
            type="range"
            min="-140"
            max="140"
            value={selected.rotation}
            onChange={(e) =>
              handleSliderChange({ rotation: Number(e.target.value) })
            }
            onPointerUp={handleSliderPointerUp}
            onPointerCancel={handleSliderPointerUp}
            onBlur={handleSliderPointerUp}
            aria-label="Flower Rotation Angle"
            className="w-full accent-[#B4846C] h-2 bg-stone-100 dark:bg-stone-800 rounded-lg cursor-pointer touch-none"
          />
        </div>
      </div>

      {/* Fourth Row: Per-Flower Petal & Center Color Pickers */}
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
                onClick={() =>
                  updateItem(
                    selected.id,
                    colorTarget === 'petal' ? { petalColor: hex } : { centerColor: hex },
                    true
                  )
                }
                aria-label={`Set ${colorTarget} color ${hex}`}
                className={`w-7 h-7 sm:w-6 sm:h-6 rounded-full shrink-0 border transition-transform ${
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
  const [drawerState, setDrawerState] = useState<'collapsed' | 'peek' | 'expanded'>('peek');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isGiftView, setIsGiftView] = useState(false);
  const [bloomedCount, setBloomedCount] = useState<number | undefined>(undefined);
  const [showGiftCardReveal, setShowGiftCardReveal] = useState(true);
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
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const hasHydratedRef = useRef(false);
  const selectedId = useBouquetStore((s) => s.selectedId);
  const autoCollapsedRef = useRef(false);
  const prevSelectedIdRef = useRef<string | null>(null);

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
      // When flower is deselected, restore drawer to peek if it was auto-collapsed
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

  useEffect(() => {
    return () => {
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

  const startGiftBloomAnimation = useCallback((totalItems: number) => {
    setIsGiftView(true);
    setShowGiftCardReveal(false);
    setBloomedCount(0);
    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      setBloomedCount(current);
      if (current >= totalItems) {
        clearInterval(interval);
        setTimeout(() => {
          setShowGiftCardReveal(true);
        }, 400);
      }
    }, 120);
  }, []);

  const handleExitGiftViewToEditor = useCallback(() => {
    setIsGiftView(false);
    setIsPreviewMode(false);
    setBloomedCount(undefined);
    setShowGiftCardReveal(true);
  }, []);

  // Autosave to localStorage
  useEffect(() => {
    if (!hasHydratedRef.current) {
      hasHydratedRef.current = true;
      try {
        const hash = window.location.hash;
        if (hash.includes('view=gift')) {
          setIsGiftView(true);
        }
        const shared = decodeBouquetFromHash();
        if (shared && Array.isArray(shared.items)) {
          loadSnapshot(shared);
          triggerToast('Loaded shared bouquet');
          if (hash.includes('view=gift')) {
            startGiftBloomAnimation(shared.items.length);
          }
          return;
        } else if (hash.includes('bouquet=')) {
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
  }, [items, wrapStyle, wrapColor, ribbonColor, card, loadSnapshot, triggerToast, startGiftBloomAnimation]);

  // Global Keyboard Shortcuts
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

  const getShareUrl = (asGift = false) => {
    const snap: BouquetSnapshot = {
      items,
      wrapStyle,
      wrapColor,
      ribbonColor,
      card
    };
    let shareUrl = encodeBouquetToShareUrl(snap);
    if (asGift) {
      shareUrl += '&view=gift';
    }
    return shareUrl;
  };

  const handleShareLink = (asGift = false) => {
    const shareUrl = getShareUrl(asGift);
    window.history.replaceState(null, '', shareUrl);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).catch(() => {});
    }
    triggerToast(asGift ? 'Recipient gift link copied' : 'Bouquet link copied');
  };

  return (
    <div
      className={`min-h-[100dvh] h-[100dvh] h-screen w-full overflow-hidden flex flex-col font-sans transition-colors duration-300 ${
        isDarkMode
          ? 'dark bg-[#141211] text-stone-100'
          : 'bg-[#FAFAF8] text-[#1C1917]'
      }`}
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Google Fonts: Cormorant Garamond & Inter */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,600&family=Inter:wght@400;500;600&display=swap"
      />
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, -6px); }
          to { opacity: 1; transform: translate(-50%, 0); }
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

      {/* TOP NAVIGATION HEADER */}
      <header
        className={`h-14 shrink-0 px-2 sm:px-4 md:px-6 border-b flex items-center justify-between gap-1 sm:gap-2 z-30 transition-colors ${
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
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  autosaveStatus === 'saving' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                }`}
              />
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

      {/* MAIN RESPONSIVE WORKSPACE */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* CENTER / TOP STAGE AREA */}
        <main className="flex-1 min-h-0 min-w-0 relative flex flex-col items-center justify-between overflow-hidden order-1 lg:order-2">
          {/* Gentle Falling Petals Animation in Read-Only Gift View */}
          {(isGiftView || isPreviewMode) && <FallingPetalsOverlay items={items} />}

          {/* Desktop Floating Button to Re-open Sidebar when Collapsed */}
          {!isGiftView && !isPreviewMode && !isSidebarOpen && (
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              title="Open Botanical Studio Panel"
              aria-label="Open Botanical Studio Panel"
              className="hidden lg:flex absolute top-3 left-3 z-30 px-3 py-2 rounded-xl bg-white/95 dark:bg-[#1E1C1A]/95 backdrop-blur-md shadow-md border border-stone-200 dark:border-stone-800 text-xs font-medium text-[#1C1917] dark:text-stone-100 items-center gap-2 hover:border-[#B4846C] transition"
            >
              <PanelLeftOpen className="w-4 h-4 text-[#B4846C]" />
              <span>Studio Palette</span>
            </button>
          )}

          {/* Mobile Floating Button to Re-open Drawer when Collapsed */}
          {!isGiftView && !isPreviewMode && drawerState === 'collapsed' && !selectedId && (
            <button
              type="button"
              onClick={() => {
                autoCollapsedRef.current = false;
                setDrawerState('peek');
              }}
              title="Open Flower Palette"
              aria-label="Open Flower Palette"
              className="lg:hidden absolute bottom-16 left-3 z-30 px-3 py-1.5 rounded-full bg-white/95 dark:bg-[#1E1C1A]/95 backdrop-blur-md shadow-md border border-stone-200 dark:border-stone-800 text-xs font-medium text-[#1C1917] dark:text-stone-100 flex items-center gap-1.5 hover:border-[#B4846C] transition"
            >
              <Flower2 className="w-3.5 h-3.5 text-[#B4846C]" />
              <span>Add flowers</span>
            </button>
          )}

          {/* Interactive SVG Bouquet Stage */}
          <div className="flex-1 w-full min-h-0 flex items-center justify-center relative touch-none">
            <BouquetStage
              svgRef={svgRef}
              isPreviewMode={isPreviewMode || isGiftView}
              isDarkMode={isDarkMode}
              bloomedCount={isGiftView ? bloomedCount : undefined}
              showCardInGiftView={isGiftView ? showGiftCardReveal : true}
            />
          </div>

          {/* Floating Per-Flower Inspector or Animated Gift Presentation Banner */}
          <div className="w-full px-2 sm:px-3 pb-2 sm:pb-3 z-20 shrink-0">
            {isPreviewMode || isGiftView ? (
              <div
                className={`max-w-lg w-full max-h-[38vh] overflow-y-auto mx-auto backdrop-blur-md border rounded-2xl p-4 sm:p-6 text-center shadow-lg transition-all duration-700 ${
                  isDarkMode
                    ? 'bg-[#1E1C1A]/95 border-stone-800 text-stone-100'
                    : 'bg-white/95 border-stone-200 text-[#1C1917]'
                } ${
                  showGiftCardReveal
                    ? 'opacity-100 translate-y-0 scale-100'
                    : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
                }`}
              >
                <p
                  className="text-xl sm:text-2xl font-medium"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  Dearest {card.to || 'Someone Special'},
                </p>
                <p
                  className="text-base sm:text-lg mt-1 sm:mt-1.5 font-normal italic leading-relaxed"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  &ldquo;{card.message || 'Thinking of you with love and blossoms.'}&rdquo;
                </p>
                <p
                  className="text-sm sm:text-base mt-1.5 sm:mt-2 font-medium text-stone-500 dark:text-stone-400"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  With love, {card.from || 'Yours Always'}
                </p>
                <div
                  className={`mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t flex flex-wrap items-center justify-center gap-2 ${
                    isDarkMode ? 'border-stone-800' : 'border-stone-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={handleExitGiftViewToEditor}
                    className="px-3.5 sm:px-4 py-1.5 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white dark:bg-white dark:text-[#1C1917] dark:hover:bg-stone-200 text-xs font-medium flex items-center gap-1.5 transition shadow-sm"
                  >
                    <Flower2 className="w-3.5 h-3.5" />
                    <span>Make your own bouquet</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsShareModalOpen(true)}
                    className="px-3 sm:px-3.5 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 dark:border-stone-700 dark:bg-[#292524] dark:hover:bg-stone-700 dark:text-stone-200 text-xs font-medium flex items-center gap-1.5 transition"
                  >
                    <Send className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                    <span>Send this bouquet</span>
                  </button>
                </div>
              </div>
            ) : (
              <SelectedFlowerToolbar
                isDrawerOpen={drawerState !== 'collapsed'}
                onRequestCollapseDrawer={() => {
                  autoCollapsedRef.current = false;
                  setDrawerState('collapsed');
                }}
              />
            )}
          </div>
        </main>

        {/* LEFT / BOTTOM SIDEBAR DRAWER (Hidden in Gift Preview Mode) */}
        {!isPreviewMode && !isGiftView && (
          <aside
            className={`w-full backdrop-blur-xl border-t lg:border-t-0 lg:border-r flex flex-col order-2 lg:order-1 z-20 shrink-0 transition-all duration-300 ease-in-out ${
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
                ? 'lg:h-full lg:w-[380px] xl:w-[420px]'
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

            {/* Mobile Sheet Drag Handle & Collapse/Expand Bar */}
            <div
              onClick={() => {
                if (drawerState === 'collapsed') {
                  autoCollapsedRef.current = false;
                  setDrawerState('peek');
                }
              }}
              className={`lg:hidden flex items-center justify-between px-3 pt-1.5 pb-0.5 bg-inherit shrink-0 ${
                drawerState === 'collapsed' ? 'cursor-pointer hover:bg-stone-200/50 dark:hover:bg-stone-800/50' : ''
              }`}
            >
              {drawerState === 'collapsed' ? (
                <div className="flex-1 flex items-center justify-between py-1">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-stone-700 dark:text-stone-200">
                    <Flower2 className="w-3.5 h-3.5 text-[#B4846C]" />
                    <span>Botanical Studio Palette</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-stone-500 dark:text-stone-400">Expand</span>
                    <ChevronUp className="w-4 h-4 text-stone-500 dark:text-stone-400" />
                  </div>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      autoCollapsedRef.current = false;
                      setDrawerState((prev) =>
                        prev === 'collapsed' ? 'peek' : prev === 'peek' ? 'expanded' : 'peek'
                      );
                    }}
                    className="flex-1 flex items-center justify-center py-1 group"
                    aria-label="Toggle drawer sheet height"
                  >
                    <div className="w-9 h-1 rounded-full bg-stone-300 dark:bg-stone-600 group-hover:bg-[#B4846C] transition-colors" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      autoCollapsedRef.current = false;
                      setDrawerState('collapsed');
                    }}
                    title="Collapse studio drawer"
                    aria-label="Collapse studio drawer"
                    className="p-1 rounded-lg text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 shrink-0"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </>
              )}
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
                className={`py-2 px-2.5 sm:px-3 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                  activeTab === 'flowers'
                    ? isDarkMode
                      ? 'bg-[#292524] border border-stone-700 text-stone-100 shadow-sm'
                      : 'bg-white border border-stone-200 text-[#1C1917] shadow-sm'
                    : isDarkMode
                    ? 'text-stone-400 hover:text-stone-100'
                    : 'text-stone-600 hover:text-[#1C1917]'
                }`}
              >
                <Flower2 className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                <span>Flowers</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'wrap'}
                onClick={() => {
                  setActiveTab('wrap');
                  if (drawerState === 'collapsed') setDrawerState('peek');
                }}
                className={`py-2 px-2.5 sm:px-3 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                  activeTab === 'wrap'
                    ? isDarkMode
                      ? 'bg-[#292524] border border-stone-700 text-stone-100 shadow-sm'
                      : 'bg-white border border-stone-200 text-[#1C1917] shadow-sm'
                    : isDarkMode
                    ? 'text-stone-400 hover:text-stone-100'
                    : 'text-stone-600 hover:text-[#1C1917]'
                }`}
              >
                <Gift className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                <span>Wrapping</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'card'}
                onClick={() => {
                  setActiveTab('card');
                  if (drawerState === 'collapsed') setDrawerState('peek');
                }}
                className={`py-2 px-2.5 sm:px-3 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                  activeTab === 'card'
                    ? isDarkMode
                      ? 'bg-[#292524] border border-stone-700 text-stone-100 shadow-sm'
                      : 'bg-white border border-stone-200 text-[#1C1917] shadow-sm'
                    : isDarkMode
                    ? 'text-stone-400 hover:text-stone-100'
                    : 'text-stone-600 hover:text-[#1C1917]'
                }`}
              >
                <Mail className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                <span>Card</span>
              </button>
            </div>

            {/* Drawer Content Body */}
            <div
              className={`flex-1 overflow-y-auto p-3 sm:p-4 pb-28 sm:pb-8 space-y-4 ${
                drawerState === 'collapsed' ? 'hidden' : 'block'
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
                          className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                            isDarkMode
                              ? 'bg-[#292524] hover:bg-[#34302c] border-stone-700 hover:border-[#B4846C] text-stone-100'
                              : 'bg-white hover:bg-stone-50 border-stone-200 hover:border-[#B4846C] text-[#1C1917]'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: tpl.badgeColor }}
                            />
                            <span className="text-xs font-medium truncate text-[#1C1917] dark:text-stone-100">
                              {tpl.name}
                            </span>
                          </div>
                          <span className="text-[10px] text-stone-500 dark:text-stone-400 truncate mt-1">
                            {tpl.subtitle}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <h2 className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                        Flowers
                      </h2>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400">
                        Select any stem to add to your bouquet
                      </p>
                    </div>
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
                    {FLOWER_CATALOG.map((entry) => (
                      <button
                        key={entry.type}
                        type="button"
                        onClick={() => {
                          addFlower(entry.type);
                          triggerToast(`Added ${entry.name}`);
                        }}
                        aria-label={`Add ${entry.name} to bouquet`}
                        className={`group p-2.5 rounded-xl border transition flex items-center gap-2.5 text-left ${
                          isDarkMode
                            ? 'bg-[#292524] hover:bg-[#34302c] border-stone-700 hover:border-[#B4846C]'
                            : 'bg-white hover:bg-stone-50 border-stone-200 hover:border-[#B4846C]'
                        }`}
                      >
                        <div
                          className={`w-12 h-12 rounded-lg border flex items-center justify-center shrink-0 overflow-hidden ${
                            isDarkMode
                              ? 'bg-stone-900 border-stone-800'
                              : 'bg-stone-50 border-stone-200'
                          }`}
                        >
                          <svg viewBox="-60 -65 120 130" className="w-11 h-11">
                            <FlowerRenderer
                              type={entry.type}
                              petalColor={entry.defaultPetalColor}
                              centerColor={entry.defaultCenterColor}
                            />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-[#1C1917] dark:text-stone-100 truncate">
                              {entry.name}
                            </span>
                            <Plus className="w-3.5 h-3.5 text-stone-400 group-hover:text-[#B4846C] dark:text-stone-400 dark:group-hover:text-[#B4846C] shrink-0 transition" />
                          </div>
                          <span className="text-[11px] block truncate text-stone-500 dark:text-stone-400 mt-0.5">
                            {entry.subtitle}
                          </span>
                        </div>
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
                        {
                          id: 'kraft' as typeWrapStyle,
                          title: 'Kraft paper',
                          desc: 'Warm artisanal florist wrap'
                        },
                        {
                          id: 'tissue' as typeWrapStyle,
                          title: 'Silk tissue',
                          desc: 'Soft layered pastel pleats'
                        },
                        {
                          id: 'celestial' as typeWrapStyle,
                          title: 'Starlit wrap',
                          desc: 'Gold-flecked paper'
                        },
                        {
                          id: 'plain' as typeWrapStyle,
                          title: 'Hand-tied stems',
                          desc: 'Unwrapped natural stems & bow'
                        }
                      ].map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setWrapStyle(st.id)}
                          className={`p-3 rounded-xl border text-left transition ${
                            wrapStyle === st.id
                              ? 'border-[#B4846C] ring-1 ring-[#B4846C] bg-white dark:bg-[#292524] text-[#1C1917] dark:text-stone-100 shadow-sm'
                              : isDarkMode
                              ? 'bg-[#292524] border-stone-700 text-stone-200 hover:bg-stone-800'
                              : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                          }`}
                        >
                          <div className="text-xs font-medium flex items-center justify-between">
                            <span>{st.title}</span>
                            {wrapStyle === st.id && <Check className="w-3.5 h-3.5 text-[#B4846C]" />}
                          </div>
                          <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                            {st.desc}
                          </div>
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
                    <div>
                      <h2 className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                        Greeting card
                      </h2>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400">
                        Attached to your arrangement
                      </p>
                    </div>
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
                        {th} card
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3 p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#1E1C1A]">
                    <div>
                      <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1">
                        To (recipient)
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
                        From (sender)
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
      </div>

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
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Opens with a bloom animation for the recipient
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
                      startGiftBloomAnimation(items.length);
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
                  <div className="text-xs font-medium">Editable studio link</div>
                  <div className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
                    Allows editing and customizing stems
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleShareLink(false);
                    setIsShareModalOpen(false);
                  }}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition shrink-0 ${
                    isDarkMode
                      ? 'bg-[#1E1C1A] hover:bg-stone-800 text-stone-200 border-stone-700'
                      : 'bg-white hover:bg-stone-50 text-stone-800 border-stone-200'
                  }`}
                >
                  Copy edit link
                </button>
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
