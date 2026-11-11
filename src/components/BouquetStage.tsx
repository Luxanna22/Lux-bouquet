import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { ImagePlus, Paperclip } from 'lucide-react';
import {
  CardTheme,
  CardThemePalette,
  RibbonStyle,
  VoiceKeepsakeData,
  typeWrapStyle,
  BouquetItem,
  GreetingCardData,
  FLOWER_CATALOG,
  PhotoFrameStyle,
  PHOTO_FRAME_CATALOG,
  CanvasEnvironment,
  DEFAULT_BOUQUET_POSE,
  getCardThemePalette,
} from '../types/bouquet';
import { FlowerRenderer } from './flowers/FlowerRenderer';
import { LayerOrderBoxIcon } from './MiniThumbnails';
import { useBouquetStore } from '../store/useBouquetStore';

// ============================================================================
// MODULE 5: components/BouquetStage.tsx — INTERACTIVE POINTER-EVENTS SVG STAGE
// ============================================================================

function shadeWrapHex(hex: string, delta: number): string {
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

const WRAPPER_RIBBON_GEOMETRY: Record<
  typeWrapStyle,
  { waistY: number; halfW: number; tailBottomY: number; bowScale: number }
> = {
  kraft:      { waistY: 508, halfW: 76,  tailBottomY: 618, bowScale: 1.0 },
  tissue:     { waistY: 486, halfW: 66,  tailBottomY: 604, bowScale: 0.96 },
  chalice:    { waistY: 506, halfW: 82,  tailBottomY: 618, bowScale: 1.0 },
  basket:     { waistY: 436, halfW: 144, tailBottomY: 538, bowScale: 1.04 },
  vintage:    { waistY: 486, halfW: 104, tailBottomY: 608, bowScale: 1.0 },
  lace:       { waistY: 468, halfW: 100, tailBottomY: 606, bowScale: 1.0 },
  celestial:  { waistY: 486, halfW: 108, tailBottomY: 608, bowScale: 1.0 },
  vase:       { waistY: 422, halfW: 93,  tailBottomY: 530, bowScale: 0.96 },
  plain:      { waistY: 504, halfW: 34,  tailBottomY: 598, bowScale: 0.8 },
  hatbox:     { waistY: 428, halfW: 121, tailBottomY: 480, bowScale: 0.88 },
  cloche:     { waistY: 484, halfW: 32,  tailBottomY: 544, bowScale: 0.78 },
  koreanmesh: { waistY: 488, halfW: 94,  tailBottomY: 610, bowScale: 1.0 },
};

function getStageItemDisplayTransform(item: BouquetItem, wrap: typeWrapStyle) {
  if (wrap !== 'cloche' || (item.photoStyle && !item.clippedToBouquet)) {
    return {
      x: item.x,
      y: item.y,
      scale: item.scale,
      rotation: item.rotation,
    };
  }
  // When placed inside the Glass Cloche (bell jar), softly gather the arrangement
  // into the crystal dome interior so blooms never collide with or pass through the glass walls
  const dx = item.x - 300;
  const dy = item.y - 295;
  return {
    x: Math.round(300 + dx * 0.64),
    y: Math.round(Math.max(198, Math.min(392, 295 + dy * 0.7))),
    scale: Number((item.scale * 0.82).toFixed(3)),
    rotation: Math.round(item.rotation * 0.72),
  };
}

/**
 * Universal Architectural Ribbon & Lace Renderer — 10 Unique Designs that adapt to every wrapper's exact waist
 */
export const BouquetRibbonSVG: React.FC<{
  ribbonStyle: RibbonStyle;
  ribbonColor: string;
  wrapStyle: typeWrapStyle;
  isPreviewMode?: boolean;
  onRibbonClick?: () => void;
}> = ({ ribbonStyle, ribbonColor, wrapStyle, isPreviewMode = false, onRibbonClick }) => {
  // Compute wrapper-specific waist Y, half-width, tail length, and bow proportion so every ribbon fits every wrapper seamlessly
  const geom = WRAPPER_RIBBON_GEOMETRY[wrapStyle] || WRAPPER_RIBBON_GEOMETRY.kraft;
  const { waistY, halfW, tailBottomY, bowScale } = geom;
  const leftX = 300 - halfW;
  const rightX = 300 + halfW;
  const bowTransform =
    bowScale !== 1
      ? `translate(300, ${waistY}) scale(${bowScale}, 1) translate(-300, ${-waistY})`
      : undefined;

  return (
    <g
      role={isPreviewMode ? undefined : 'button'}
      aria-label={isPreviewMode ? undefined : 'Select ribbon to edit color'}
      onPointerDown={
        isPreviewMode
          ? undefined
          : (e) => {
              e.stopPropagation();
            }
      }
      onClick={
        isPreviewMode
          ? undefined
          : (e) => {
              e.stopPropagation();
              onRibbonClick?.();
            }
      }
      className={
        isPreviewMode
          ? 'pointer-events-none'
          : 'cursor-pointer hover:brightness-[1.03] transition'
      }
    >
      {/* Generous transparent hit area for clicking the ribbon on canvas */}
      {!isPreviewMode && (
        <rect
          x={leftX - 10}
          y={waistY - 32}
          width={halfW * 2 + 20}
          height={Math.max(64, tailBottomY - waistY + 24)}
          fill="transparent"
        />
      )}
      {/* 1. CLASSIC SATIN BOW (Sculpted satin loops, waist sash & dovetail streamers) */}
      {ribbonStyle === 'satin' && (
        <g>
          {/* Contoured Satin Waist Sash (Always spans exact wrapper waist leftX..rightX) */}
          <path
            d={`M${leftX},${waistY - 6} Q300,${waistY + 8} ${rightX},${waistY - 6} L${rightX - 2},${waistY + 9} Q300,${waistY + 23} ${leftX + 2},${waistY + 9} Z`}
            fill={ribbonColor}
            stroke="#ffffff"
            strokeWidth="1"
            strokeOpacity="0.35"
          />
          <g transform={bowTransform}>
            {/* Flowing Dovetail Streamers */}
            <path
              d={`M295,${waistY + 2} Q272,${(waistY + tailBottomY) / 2} 252,${tailBottomY} L264,${tailBottomY - 10} L274,${tailBottomY} Q288,${(waistY + tailBottomY) / 2} 300,${waistY + 8} Z`}
              fill={ribbonColor}
            />
            <path
              d={`M305,${waistY + 2} Q328,${(waistY + tailBottomY) / 2} 348,${tailBottomY} L336,${tailBottomY - 10} L326,${tailBottomY} Q312,${(waistY + tailBottomY) / 2} 300,${waistY + 8} Z`}
              fill={ribbonColor}
              opacity="0.92"
            />
            {/* Left & Right Sculpted Satin Bow Loops */}
            <path
              d={`M296,${waistY} C244,${waistY - 36} 230,${waistY + 24} 288,${waistY + 10} Z`}
              fill={ribbonColor}
              stroke="#ffffff"
              strokeWidth="1.2"
              strokeOpacity="0.45"
            />
            <path
              d={`M304,${waistY} C356,${waistY - 36} 370,${waistY + 24} 312,${waistY + 10} Z`}
              fill={ribbonColor}
              stroke="#ffffff"
              strokeWidth="1.2"
              strokeOpacity="0.45"
            />
            {/* Inner Loop Depth Crease */}
            <path
              d={`M288,${waistY + 1} C262,${waistY - 12} 258,${waistY + 10} 286,${waistY + 5}`}
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.2"
              opacity="0.45"
            />
            <path
              d={`M312,${waistY + 1} C338,${waistY - 12} 342,${waistY + 10} 314,${waistY + 5}`}
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.2"
              opacity="0.45"
            />
            {/* Center Pillow Knot */}
            <rect
              x="289"
              y={waistY - 11}
              width="22"
              height="23"
              rx="7"
              fill={ribbonColor}
              stroke="#ffffff"
              strokeWidth="1.2"
              strokeOpacity="0.55"
            />
          </g>
        </g>
      )}

      {/* 2. BRIDAL EYELET LACE (Scalloped pierced-eyelet lace band + floral lace bow + pearl brooch) */}
      {ribbonStyle === 'lace' && (
        <g>
          {/* Scalloped White Eyelet Trim Backing Waist Band */}
          <path
            d={`M${leftX - 2},${waistY - 11} Q300,${waistY + 5} ${rightX + 2},${waistY - 11} L${rightX},${waistY + 15} Q300,${waistY + 31} ${leftX},${waistY + 15} Z`}
            fill="#FFFFFF"
            stroke={ribbonColor}
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          {/* Inner Colored Lace Waist Band */}
          <path
            d={`M${leftX + 2},${waistY - 5} Q300,${waistY + 9} ${rightX - 2},${waistY - 5} L${rightX - 4},${waistY + 9} Q300,${waistY + 23} ${leftX + 4},${waistY + 9} Z`}
            fill={ribbonColor}
          />
          {/* Pierced Eyelet Lace Dots Along Waist */}
          <g fill="#FFFFFF" opacity="0.88">
            <circle cx={300 - halfW * 0.65} cy={waistY + 1} r="2.3" />
            <circle cx={300 - halfW * 0.35} cy={waistY + 4} r="2.3" />
            <circle cx={300 + halfW * 0.35} cy={waistY + 4} r="2.3" />
            <circle cx={300 + halfW * 0.65} cy={waistY + 1} r="2.3" />
          </g>
          <g transform={bowTransform}>
            {/* Scalloped Lace Tails */}
            <path
              d={`M294,${waistY + 4} Q272,${(waistY + tailBottomY) / 2} 254,${tailBottomY - 4} L274,${tailBottomY - 2} Q290,${(waistY + tailBottomY) / 2} 300,${waistY + 10} Z`}
              fill={ribbonColor}
              stroke="#ffffff"
              strokeWidth="1.4"
              strokeDasharray="3 2"
            />
            <path
              d={`M306,${waistY + 4} Q328,${(waistY + tailBottomY) / 2} 346,${tailBottomY - 4} L326,${tailBottomY - 2} Q310,${(waistY + tailBottomY) / 2} 300,${waistY + 10} Z`}
              fill={ribbonColor}
              stroke="#ffffff"
              strokeWidth="1.4"
              strokeDasharray="3 2"
            />
            {/* Scalloped Lace Bow Loops */}
            <path
              d={`M296,${waistY + 1} C238,${waistY - 40} 226,${waistY + 28} 290,${waistY + 12} Z`}
              fill={ribbonColor}
              stroke="#FFFFFF"
              strokeWidth="2"
              strokeDasharray="4 2.5"
            />
            <path
              d={`M304,${waistY + 1} C362,${waistY - 40} 374,${waistY + 28} 310,${waistY + 12} Z`}
              fill={ribbonColor}
              stroke="#FFFFFF"
              strokeWidth="2"
              strokeDasharray="4 2.5"
            />
            {/* Center Pearl & Gold Filigree Brooch */}
            <circle cx="300" cy={waistY + 2} r="12" fill="#FFFDF9" stroke="#FDE68A" strokeWidth="2.2" />
            <circle cx="300" cy={waistY + 2} r="7.5" fill={ribbonColor} opacity="0.25" />
            <circle cx="297" cy={waistY - 1} r="3" fill="#FFFFFF" />
          </g>
        </g>
      )}

      {/* 3. CRISS-CROSS CORSET TIE (Architectural X-laced ribbon corset waist + lower bow & tassels) */}
      {ribbonStyle === 'corset' && (
        <g>
          {/* Upper & Lower Horizontal Corset Bands */}
          <path
            d={`M${leftX + 4},${waistY - 20} Q300,${waistY - 8} ${rightX - 4},${waistY - 20}`}
            fill="none"
            stroke={ribbonColor}
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <path
            d={`M${leftX + 2},${waistY + 16} Q300,${waistY + 28} ${rightX - 2},${waistY + 16}`}
            fill="none"
            stroke={ribbonColor}
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          {/* Criss-Cross X-Lacing */}
          <path
            d={`M${300 - halfW * 0.55},${waistY - 16} L${300 + halfW * 0.52},${waistY + 2} M${300 + halfW * 0.55},${waistY - 16} L${300 - halfW * 0.52},${waistY + 2}`}
            fill="none"
            stroke={ribbonColor}
            strokeWidth="3.8"
            strokeLinecap="round"
          />
          <path
            d={`M${300 - halfW * 0.52},${waistY + 2} L${300 + halfW * 0.48},${waistY + 19} M${300 + halfW * 0.52},${waistY + 2} L${300 - halfW * 0.48},${waistY + 19}`}
            fill="none"
            stroke={ribbonColor}
            strokeWidth="3.8"
            strokeLinecap="round"
          />
          {/* Pearl Eyelet Studs at Corset Anchor Points */}
          <g fill="#FFFDF9" stroke={ribbonColor} strokeWidth="1.4">
            <circle cx={300 - halfW * 0.55} cy={waistY - 16} r="3.5" />
            <circle cx={300 + halfW * 0.55} cy={waistY - 16} r="3.5" />
            <circle cx={300 - halfW * 0.52} cy={waistY + 2} r="3.5" />
            <circle cx={300 + halfW * 0.52} cy={waistY + 2} r="3.5" />
            <circle cx={300 - halfW * 0.48} cy={waistY + 19} r="3.5" />
            <circle cx={300 + halfW * 0.48} cy={waistY + 19} r="3.5" />
          </g>
          {/* Petite Lower Tie Bow & Hanging Tassels */}
          <g transform={bowTransform}>
            <path
              d={`M297,${waistY + 22} C266,${waistY + 6} 262,${waistY + 40} 295,${waistY + 28} Z`}
              fill={ribbonColor}
              stroke="#ffffff"
              strokeWidth="1"
            />
            <path
              d={`M303,${waistY + 22} C334,${waistY + 6} 338,${waistY + 40} 305,${waistY + 28} Z`}
              fill={ribbonColor}
              stroke="#ffffff"
              strokeWidth="1"
            />
            <path
              d={`M296,${waistY + 24} Q284,${(waistY + tailBottomY) / 2 + 10} 276,${tailBottomY} M304,${waistY + 24} Q316,${(waistY + tailBottomY) / 2 + 10} 324,${tailBottomY}`}
              fill="none"
              stroke={ribbonColor}
              strokeWidth="3.8"
              strokeLinecap="round"
            />
            <circle cx="300" cy={waistY + 24} r="6.5" fill={ribbonColor} stroke="#ffffff" strokeWidth="1.2" />
          </g>
        </g>
      )}

      {/* 4. DOUBLE COUTURE ROSETTE (Multi-looped Parisian rosette bow + wide sash + twin tails) */}
      {ribbonStyle === 'double' && (
        <g>
          {/* Wide Belted Waist Sash */}
          <path
            d={`M${leftX},${waistY - 8} Q300,${waistY + 6} ${rightX},${waistY - 8} L${rightX - 2},${waistY + 10} Q300,${waistY + 24} ${leftX + 2},${waistY + 10} Z`}
            fill={ribbonColor}
          />
          <g transform={bowTransform}>
            {/* Four Layered Ribbon Tails */}
            <path
              d={`M292,${waistY + 4} L246,${tailBottomY - 6} L264,${tailBottomY} L298,${waistY + 10} Z`}
              fill={ribbonColor}
              opacity="0.88"
            />
            <path
              d={`M308,${waistY + 4} L354,${tailBottomY - 6} L336,${tailBottomY} L302,${waistY + 10} Z`}
              fill={ribbonColor}
              opacity="0.88"
            />
            <path
              d={`M296,${waistY + 6} L274,${tailBottomY} L288,${tailBottomY - 4} L300,${waistY + 12} Z`}
              fill={ribbonColor}
            />
            <path
              d={`M304,${waistY + 6} L326,${tailBottomY} L312,${tailBottomY - 4} L300,${waistY + 12} Z`}
              fill={ribbonColor}
            />
            {/* Outer Large Bow Loops */}
            <path
              d={`M295,${waistY} C228,${waistY - 46} 218,${waistY + 34} 288,${waistY + 14} Z`}
              fill={ribbonColor}
              stroke="#ffffff"
              strokeWidth="1.2"
              strokeOpacity="0.4"
            />
            <path
              d={`M305,${waistY} C372,${waistY - 46} 382,${waistY + 34} 312,${waistY + 14} Z`}
              fill={ribbonColor}
              stroke="#ffffff"
              strokeWidth="1.2"
              strokeOpacity="0.4"
            />
            {/* Upper Diagonal Rosette Loops */}
            <path
              d={`M296,${waistY - 3} C254,${waistY - 52} 248,${waistY - 6} 292,${waistY + 2} Z`}
              fill={ribbonColor}
              stroke="#ffffff"
              strokeWidth="1.3"
              strokeOpacity="0.55"
            />
            <path
              d={`M304,${waistY - 3} C346,${waistY - 52} 352,${waistY - 6} 308,${waistY + 2} Z`}
              fill={ribbonColor}
              stroke="#ffffff"
              strokeWidth="1.3"
              strokeOpacity="0.55"
            />
            {/* Inner Petite Loops */}
            <path
              d={`M297,${waistY + 2} C266,${waistY - 18} 262,${waistY + 18} 293,${waistY + 8} Z`}
              fill={ribbonColor}
              stroke="#ffffff"
              strokeWidth="1.2"
              strokeOpacity="0.65"
            />
            <path
              d={`M303,${waistY + 2} C334,${waistY - 18} 338,${waistY + 18} 307,${waistY + 8} Z`}
              fill={ribbonColor}
              stroke="#ffffff"
              strokeWidth="1.2"
              strokeOpacity="0.65"
            />
            {/* Center Gathered Rosette Knot */}
            <circle cx="300" cy={waistY + 2} r="11" fill={ribbonColor} stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.65" />
          </g>
        </g>
      )}

      {/* 5. TWINE & BOTANICAL WAX SEAL (Multi-strand artisan cord wrap + embossed wax medallion) */}
      {ribbonStyle === 'waxCord' && (
        <g>
          {/* Triple Wrapped Artisan Cord Strands */}
          <path
            d={`M${leftX + 2},${waistY - 6} Q300,${waistY + 8} ${rightX - 2},${waistY - 6}`}
            fill="none"
            stroke={ribbonColor}
            strokeWidth="4.2"
            strokeLinecap="round"
          />
          <path
            d={`M${leftX + 3},${waistY + 1} Q300,${waistY + 15} ${rightX - 3},${waistY + 1}`}
            fill="none"
            stroke="#FFFBEB"
            strokeWidth="2.4"
            strokeDasharray="6 4"
            strokeLinecap="round"
          />
          <path
            d={`M${leftX + 4},${waistY + 8} Q300,${waistY + 22} ${rightX - 4},${waistY + 8}`}
            fill="none"
            stroke={ribbonColor}
            strokeWidth="4.2"
            strokeLinecap="round"
          />
          <g transform={bowTransform}>
            {/* Delicate Twine Loops */}
            <path
              d={`M295,${waistY + 4} C254,${waistY - 22} 248,${waistY + 26} 292,${waistY + 11}`}
              fill="none"
              stroke={ribbonColor}
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d={`M305,${waistY + 4} C346,${waistY - 22} 352,${waistY + 26} 308,${waistY + 11}`}
              fill="none"
              stroke={ribbonColor}
              strokeWidth="4"
              strokeLinecap="round"
            />
            {/* Trailing Cord Ends with Beaded Tips */}
            <path
              d={`M296,${waistY + 10} Q280,${(waistY + tailBottomY) / 2} 268,${tailBottomY - 6} M304,${waistY + 10} Q320,${(waistY + tailBottomY) / 2} 332,${tailBottomY - 6}`}
              fill="none"
              stroke={ribbonColor}
              strokeWidth="3.6"
              strokeLinecap="round"
            />
            <circle cx="268" cy={tailBottomY - 5} r="4.5" fill={ribbonColor} />
            <circle cx="332" cy={tailBottomY - 5} r="4.5" fill={ribbonColor} />
            {/* Embossed Botanical Wax Seal Medallion */}
            <circle cx="300" cy={waistY + 6} r="16" fill={ribbonColor} stroke="#FFFBEB" strokeWidth="1.8" />
            <circle cx="300" cy={waistY + 6} r="11.5" fill="none" stroke="#FFFBEB" strokeWidth="1" strokeDasharray="3 2" opacity="0.85" />
            {/* Pressed Leaf Sprig Inside Wax Seal */}
            <path
              d={`M300,${waistY + 13} L300,${waistY - 1} M300,${waistY + 8} L295,${waistY + 4} M300,${waistY + 5} L305,${waistY + 1}`}
              stroke="#FFFBEB"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </g>
        </g>
      )}

      {/* 6. SHEER CHIFFON DRAPE (Translucent billowy organza butterfly loops + gossamer trailing veils) */}
      {ribbonStyle === 'organza' && (
        <g>
          {/* Sheer Pleated Organza Waist Wrap */}
          <path
            d={`M${leftX - 2},${waistY - 10} Q300,${waistY + 6} ${rightX + 2},${waistY - 10} L${rightX - 1},${waistY + 12} Q300,${waistY + 28} ${leftX + 1},${waistY + 12} Z`}
            fill={ribbonColor}
            fillOpacity="0.62"
            stroke="#FFFFFF"
            strokeWidth="1.2"
          />
          <g transform={bowTransform}>
            {/* Wide Billowy Gossamer Trailing Veils */}
            <path
              d={`M292,${waistY + 2} Q256,${(waistY + tailBottomY) / 2} 228,${tailBottomY} Q256,${tailBottomY + 6} 282,${tailBottomY - 4} Q294,${(waistY + tailBottomY) / 2} 300,${waistY + 10} Z`}
              fill={ribbonColor}
              fillOpacity="0.48"
              stroke="#FFFFFF"
              strokeWidth="1.2"
              strokeOpacity="0.65"
            />
            <path
              d={`M308,${waistY + 2} Q344,${(waistY + tailBottomY) / 2} 372,${tailBottomY} Q344,${tailBottomY + 6} 318,${tailBottomY - 4} Q306,${(waistY + tailBottomY) / 2} 300,${waistY + 10} Z`}
              fill={ribbonColor}
              fillOpacity="0.48"
              stroke="#FFFFFF"
              strokeWidth="1.2"
              strokeOpacity="0.65"
            />
            {/* Oversized Translucent Butterfly Chiffon Wings */}
            <path
              d={`M296,${waistY + 1} C216,${waistY - 56} 206,${waistY + 42} 290,${waistY + 14} Z`}
              fill={ribbonColor}
              fillOpacity="0.55"
              stroke="#FFFFFF"
              strokeWidth="1.5"
            />
            <path
              d={`M304,${waistY + 1} C384,${waistY - 56} 394,${waistY + 42} 310,${waistY + 14} Z`}
              fill={ribbonColor}
              fillOpacity="0.55"
              stroke="#FFFFFF"
              strokeWidth="1.5"
            />
            {/* Inner Shimmer Fold */}
            <path
              d={`M296,${waistY + 1} C244,${waistY - 28} 238,${waistY + 18} 290,${waistY + 8} Z`}
              fill="#FFFFFF"
              fillOpacity="0.32"
            />
            <path
              d={`M304,${waistY + 1} C356,${waistY - 28} 362,${waistY + 18} 310,${waistY + 8} Z`}
              fill="#FFFFFF"
              fillOpacity="0.32"
            />
            {/* Gathered Silk Knot */}
            <ellipse cx="300" cy={waistY + 2} rx="12" ry="10" fill={ribbonColor} stroke="#FFFFFF" strokeWidth="1.4" />
          </g>
        </g>
      )}

      {/* 7. CAMEO VELVET SASH (Rich draped velvet band + gold-rimmed oval pearl cameo clasp & fringed ends) */}
      {ribbonStyle === 'velvet' && (
        <g>
          {/* Rich Velvet Waist Belt with Gold Piping */}
          <path
            d={`M${leftX},${waistY - 8} Q300,${waistY + 6} ${rightX},${waistY - 8} L${rightX - 2},${waistY + 10} Q300,${waistY + 24} ${leftX + 2},${waistY + 10} Z`}
            fill={ribbonColor}
            stroke="#FDE68A"
            strokeWidth="1.4"
          />
          <g transform={bowTransform}>
            {/* Draped Velvet Sash Ends with Gold Fringe Trim */}
            <path
              d={`M290,${waistY + 4} L256,${tailBottomY - 8} L282,${tailBottomY - 4} L300,${waistY + 10} Z`}
              fill={ribbonColor}
            />
            <path
              d={`M310,${waistY + 4} L344,${tailBottomY - 8} L318,${tailBottomY - 4} L300,${waistY + 10} Z`}
              fill={ribbonColor}
            />
            {/* Gold Bullion Fringe on Sash Tips */}
            <path
              d={`M256,${tailBottomY - 8} L282,${tailBottomY - 4} M344,${tailBottomY - 8} L318,${tailBottomY - 4}`}
              stroke="#FBBF24"
              strokeWidth="3.5"
              strokeDasharray="2.5 2"
            />
            {/* Tailored Velvet Bow Loops */}
            <path
              d={`M294,${waistY} C242,${waistY - 30} 236,${waistY + 22} 288,${waistY + 10} Z`}
              fill={ribbonColor}
              stroke="#FDE68A"
              strokeWidth="1.3"
            />
            <path
              d={`M306,${waistY} C358,${waistY - 30} 364,${waistY + 22} 312,${waistY + 10} Z`}
              fill={ribbonColor}
              stroke="#FDE68A"
              strokeWidth="1.3"
            />
            {/* Gold-Rimmed Oval Pearl Cameo Brooch */}
            <ellipse cx="300" cy={waistY + 2} rx="12" ry="15" fill="#F59E0B" stroke="#FEF08A" strokeWidth="1.5" />
            <ellipse cx="300" cy={waistY + 2} rx="8.5" ry="11.5" fill="#FFFDF9" />
            <circle cx="298" cy={waistY - 2} r="2.8" fill="#FFFFFF" />
          </g>
        </g>
      )}

      {/* 8. CHIFFON FRINGE (Raw-edge frayed silk chiffon drape with soft organic knot) */}
      {ribbonStyle === 'chiffon' && (
        <g>
          {/* Gathered Chiffon Waist Sash */}
          <path
            d={`M${leftX},${waistY - 7} Q300,${waistY + 8} ${rightX},${waistY - 7} L${rightX - 3},${waistY + 9} Q300,${waistY + 22} ${leftX + 3},${waistY + 9} Z`}
            fill={ribbonColor}
            fillOpacity="0.78"
            stroke="#FFFFFF"
            strokeWidth="1.2"
            strokeDasharray="5 2"
          />
          <g transform={bowTransform}>
            {/* Long Flowing Frayed Chiffon Tails */}
            <path
              d={`M294,${waistY + 4} C262,${waistY + 55} 238,${tailBottomY - 12} 262,${tailBottomY + 6} C278,${tailBottomY - 10} 292,${waistY + 46} 300,${waistY + 8} Z`}
              fill={ribbonColor}
              fillOpacity="0.68"
              stroke="#FFFFFF"
              strokeWidth="1.3"
              strokeDasharray="4 2"
            />
            <path
              d={`M306,${waistY + 4} C338,${waistY + 55} 362,${tailBottomY - 12} 338,${tailBottomY + 6} C322,${tailBottomY - 10} 308,${waistY + 46} 300,${waistY + 8} Z`}
              fill={ribbonColor}
              fillOpacity="0.68"
              stroke="#FFFFFF"
              strokeWidth="1.3"
              strokeDasharray="4 2"
            />
            {/* Billowy Frayed Chiffon Loops */}
            <path
              d={`M295,${waistY} C228,${waistY - 38} 222,${waistY + 28} 290,${waistY + 10} Z`}
              fill={ribbonColor}
              fillOpacity="0.72"
              stroke="#FFFFFF"
              strokeWidth="1.4"
              strokeDasharray="4 2"
            />
            <path
              d={`M305,${waistY} C372,${waistY - 38} 378,${waistY + 28} 310,${waistY + 10} Z`}
              fill={ribbonColor}
              fillOpacity="0.72"
              stroke="#FFFFFF"
              strokeWidth="1.4"
              strokeDasharray="4 2"
            />
            <ellipse cx="300" cy={waistY + 2} rx="14" ry="10" fill={ribbonColor} stroke="#FFFFFF" strokeWidth="1.3" />
          </g>
        </g>
      )}

      {/* 9. GOLD CHAIN (Atelier golden link chain with hanging heart & pearl charms) */}
      {ribbonStyle === 'goldchain' && (
        <g>
          {/* Twin Draped Golden Curb Chains */}
          <path
            d={`M${leftX},${waistY - 4} Q300,${waistY + 16} ${rightX},${waistY - 4}`}
            fill="none"
            stroke="#D97706"
            strokeWidth="6"
            strokeDasharray="8 4"
            strokeLinecap="round"
          />
          <path
            d={`M${leftX},${waistY - 4} Q300,${waistY + 16} ${rightX},${waistY - 4}`}
            fill="none"
            stroke="#FDE047"
            strokeWidth="2.6"
            strokeDasharray="8 4"
            strokeLinecap="round"
          />
          <path
            d={`M${leftX + 5},${waistY + 4} Q300,${waistY + 28} ${rightX - 5},${waistY + 4}`}
            fill="none"
            stroke="#F59E0B"
            strokeWidth="4.2"
            strokeDasharray="6 4"
            strokeLinecap="round"
          />
          <g transform={bowTransform}>
            {/* Hanging Drop Chains */}
            <line x1="286" y1={waistY + 12} x2="286" y2={waistY + 40} stroke="#F59E0B" strokeWidth="2.5" strokeDasharray="3 2" />
            <line x1="314" y1={waistY + 12} x2="314" y2={waistY + 36} stroke="#F59E0B" strokeWidth="2.5" strokeDasharray="3 2" />
            {/* Pearl Drop & Enamel Heart Charm */}
            <circle cx="314" cy={waistY + 40} r="6" fill="#FFFDF9" stroke="#F59E0B" strokeWidth="1.5" />
            <g transform={`translate(286, ${waistY + 46})`}>
              <path
                d="M0,9 C-11,2 -11,-7 -4.5,-7 C-1.8,-7 0,-3.5 0,-3.5 C0,-3.5 1.8,-7 4.5,-7 C11,-7 11,2 0,9 Z"
                fill={ribbonColor}
                stroke="#FDE047"
                strokeWidth="1.8"
              />
            </g>
            {/* Center Golden Clasp */}
            <circle cx="300" cy={waistY + 7} r="9" fill="#F59E0B" stroke="#FEF08A" strokeWidth="1.8" />
            <circle cx="300" cy={waistY + 7} r="4" fill={ribbonColor} />
          </g>
        </g>
      )}

      {/* 10. BOTANICAL RAFFIA (Woven natural palm raffia bow with dried baby's breath sprig) */}
      {ribbonStyle === 'raffia' && (
        <g>
          {/* Multi-Strand Natural Palm Raffia Waist Wrap */}
          <path
            d={`M${leftX},${waistY - 5} Q300,${waistY + 7} ${rightX},${waistY - 5} M${leftX + 2},${waistY} Q300,${waistY + 12} ${rightX - 2},${waistY} M${leftX + 3},${waistY + 5} Q300,${waistY + 17} ${rightX - 3},${waistY + 5}`}
            fill="none"
            stroke="#C89B6E"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <g transform={bowTransform}>
            {/* Frayed Raffia Straw Loops & Whiskers */}
            <path
              d={`M296,${waistY + 2} C235,${waistY - 26} 232,${waistY + 22} 294,${waistY + 8} M304,${waistY + 2} C365,${waistY - 26} 368,${waistY + 22} 306,${waistY + 8}`}
              fill="none"
              stroke="#DFB78C"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <path
              d={`M296,${waistY + 6} L248,${tailBottomY - 12} M298,${waistY + 6} L264,${tailBottomY - 4} M304,${waistY + 6} L352,${tailBottomY - 12} M302,${waistY + 6} L336,${tailBottomY - 4}`}
              stroke="#C89B6E"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
            {/* Tucked Dried Botanical Sprig & Wax Knot */}
            <path d={`M300,${waistY + 2} L288,${waistY - 24} M300,${waistY + 2} L312,${waistY - 26}`} stroke="#65A30D" strokeWidth="1.8" />
            <circle cx="288" cy={waistY - 25} r="4" fill="#FFFDF9" />
            <circle cx="312" cy={waistY - 27} r="4" fill="#FFFDF9" />
            <circle cx="300" cy={waistY - 30} r="4.5" fill={ribbonColor} />
            <ellipse cx="300" cy={waistY + 4} rx="11" ry="8" fill="#B4846C" stroke="#DFB78C" strokeWidth="1.5" />
          </g>
        </g>
      )}
    </g>
  );
};

/**
 * Helper to wrap greeting card message into clean SVG <tspan> lines so rotated cards
 * render with 100% vector precision without browser <foreignObject> rotation artifacts.
 */
function wrapCardCanvasLines(text: string, maxChars = 25, maxLines = 4): string[] {
  const cleaned = (text || '').replace(/\r\n/g, '\n').trim();
  if (!cleaned) return [];
  const paragraphs = cleaned.split('\n');
  const lines: string[] = [];

  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      if (lines.length < maxLines) lines.push('');
      continue;
    }
    let currentLine = '';
    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (candidate.length <= maxChars) {
        currentLine = candidate;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          if (lines.length >= maxLines) {
            lines[maxLines - 1] = lines[maxLines - 1].slice(0, Math.max(0, maxChars - 1)).trimEnd() + '…';
            return lines;
          }
          currentLine = word.length > maxChars ? word.slice(0, maxChars) : word;
        } else {
          lines.push(word.slice(0, maxChars));
          if (lines.length >= maxLines) {
            lines[maxLines - 1] = lines[maxLines - 1].slice(0, Math.max(0, maxChars - 1)).trimEnd() + '…';
            return lines;
          }
          currentLine = '';
        }
      }
    }
    if (currentLine) {
      lines.push(currentLine);
      if (lines.length >= maxLines) {
        return lines.slice(0, maxLines);
      }
    }
  }
  return lines.slice(0, maxLines);
}

/**
 * 7 Unique Architectural Greeting Card Tag Silhouettes for BouquetStage
 */
export const BouquetCardShapeSVG: React.FC<{
  theme: CardTheme;
  palette: CardThemePalette;
}> = ({ theme, palette }) => (
  <g>
    {/* 0. SEALED LETTER (Default Unopened Wax-Sealed Envelope — Message stays hidden inside!) */}
    {theme === 'sealed' && (
      <g>
        {/* Envelope Outer Body */}
        <rect
          x="-84"
          y="-46"
          width="168"
          height="110"
          rx="10"
          fill={palette.bg}
          stroke={palette.border}
          strokeWidth="2.2"
        />
        {/* Subtle Inner Stitched Trim */}
        <rect
          x="-78"
          y="-40"
          width="156"
          height="98"
          rx="7"
          fill="none"
          stroke={palette.inner}
          strokeWidth="0.9"
          strokeDasharray="3 3"
          opacity="0.45"
        />
        {/* Side & Bottom Fold Flaps */}
        <path
          d="M-82,62 L0,4 L82,62"
          fill={palette.bg}
          stroke={palette.border}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M-82,-44 L-22,12 M82,-44 L22,12"
          fill="none"
          stroke={palette.border}
          strokeWidth="1.3"
          opacity="0.65"
        />
        {/* Closed Top Triangular Envelope Flap */}
        <path
          d="M-83,-44 L0,18 L83,-44 Z"
          fill={palette.bg}
          stroke={palette.border}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Inner Flap Crease Highlight */}
        <path
          d="M-74,-41 L0,12 L74,-41"
          fill="none"
          stroke={palette.inner}
          strokeWidth="0.9"
          strokeDasharray="3 2"
          opacity="0.45"
        />
        {/* Central Embossed Wax Seal with Heart */}
        <circle cx="0" cy="15" r="16" fill={palette.seal} stroke="#ffffff" strokeWidth="1.5" />
        <circle
          cx="0"
          cy="15"
          r="11.5"
          fill="none"
          stroke="#ffffff"
          strokeWidth="0.9"
          strokeDasharray="2.5 2"
          opacity="0.8"
        />
        <path
          d="M0,11.5 C-4,6.5 -10,10 -6,16.5 L0,22 L6,16.5 C10,10 4,6.5 0,11.5 Z"
          fill="#ffffff"
        />
      </g>
    )}

    {/* 1. STITCHED TAG (Classic rounded rectangle with dashed tailor-stitch frame & wax seal) */}
    {theme === 'cream' && (
      <g>
        <rect
          x="-85"
          y="-42"
          width="175"
          height="112"
          rx="12"
          fill={palette.bg}
          stroke={palette.border}
          strokeWidth="1.8"
        />
        <rect
          x="-79"
          y="-36"
          width="163"
          height="100"
          rx="8"
          fill="none"
          stroke={palette.inner}
          strokeWidth="0.9"
          strokeDasharray="3 3"
          opacity="0.6"
        />
        <circle cx="-62" cy="-22" r="8.5" fill={palette.seal} />
        <circle cx="-62" cy="-22" r="5.5" fill="none" stroke="#ffffff" strokeWidth="0.6" opacity="0.65" />
      </g>
    )}

    {/* 2. SCALLOP LACE (Romantic scalloped bridal lace card with eyelet dots & pearl stud) */}
    {theme === 'blush' && (
      <g>
        <rect
          x="-87"
          y="-44"
          width="179"
          height="116"
          rx="16"
          fill="#FFFFFF"
          stroke={palette.border}
          strokeWidth="2.2"
          strokeDasharray="6 3"
        />
        <rect
          x="-83"
          y="-40"
          width="171"
          height="108"
          rx="13"
          fill={palette.bg}
          stroke={palette.border}
          strokeWidth="1.3"
        />
        <rect
          x="-77"
          y="-34"
          width="159"
          height="96"
          rx="9"
          fill="none"
          stroke={palette.inner}
          strokeWidth="1"
          strokeDasharray="2 3"
          opacity="0.55"
        />
        <circle cx="-62" cy="-22" r="8" fill="#FFFDF9" stroke={palette.seal} strokeWidth="2" />
        <circle cx="-62" cy="-22" r="3.5" fill={palette.seal} />
      </g>
    )}

    {/* 3. CATHEDRAL ARCH (Domed arched top note with double architectural border & star emblem) */}
    {theme === 'lavender' && (
      <g>
        <path
          d="M-85,-22 Q-85,-46 -56,-46 L61,-46 Q90,-46 90,-22 L90,58 Q90,70 78,70 L-73,70 Q-85,70 -85,58 Z"
          fill={palette.bg}
          stroke={palette.border}
          strokeWidth="1.9"
        />
        <path
          d="M-79,-20 Q-79,-40 -54,-40 L59,-40 Q84,-40 84,-20 L84,54 Q84,64 74,64 L-69,64 Q-79,64 -79,54 Z"
          fill="none"
          stroke={palette.inner}
          strokeWidth="0.9"
          opacity="0.55"
        />
        <circle cx="-62" cy="-22" r="8" fill={palette.seal} />
        <path
          d="M-62,-27 L-60.5,-23.5 L-57,-22 L-60.5,-20.5 L-62,-17 L-63.5,-20.5 L-67,-22 L-63.5,-23.5 Z"
          fill="#FFFFFF"
        />
      </g>
    )}

    {/* 4. BOTANICAL FRAME (Chamfered octagon gallery plaque with corner leaf flourishes) */}
    {theme === 'sage' && (
      <g>
        <polygon
          points="-73,-42 78,-42 90,-30 90,58 78,70 -73,70 -85,58 -85,-30"
          fill={palette.bg}
          stroke={palette.border}
          strokeWidth="1.9"
          strokeLinejoin="round"
        />
        <polygon
          points="-69,-36 74,-36 84,-26 84,54 74,64 -69,64 -79,54 -79,-26"
          fill="none"
          stroke={palette.inner}
          strokeWidth="1"
          opacity="0.55"
        />
        {/* Corner Botanical Flourishes */}
        <path d="M70,-33 Q80,-33 80,-23 M-65,61 Q-75,61 -75,51" fill="none" stroke={palette.inner} strokeWidth="1.4" />
        <circle cx="-62" cy="-22" r="8.5" fill={palette.seal} />
        <path d="M-65,-19 Q-62,-26 -58,-24 Q-60,-18 -65,-19 Z" fill="#FFFFFF" opacity="0.85" />
      </g>
    )}

    {/* 5. FOLDED SCROLL (Dog-eared folded parchment note with ribbon-slit header) */}
    {theme === 'sky' && (
      <g>
        <path
          d="M-85,-42 L68,-42 L90,-20 L90,62 Q90,70 82,70 L-77,70 Q-85,70 -85,62 Z"
          fill={palette.bg}
          stroke={palette.border}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        {/* Dog-Ear Folded Top-Right Corner */}
        <path
          d="M68,-42 L68,-20 L90,-20 Z"
          fill={palette.border}
          fillOpacity="0.35"
          stroke={palette.border}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <line x1="-75" y1="-34" x2="58" y2="-34" stroke={palette.inner} strokeWidth="0.9" opacity="0.45" />
        <line x1="-75" y1="62" x2="80" y2="62" stroke={palette.inner} strokeWidth="0.9" opacity="0.45" />
        <circle cx="-62" cy="-22" r="8" fill={palette.seal} />
        <circle cx="-62" cy="-22" r="4" fill="none" stroke="#FFFFFF" strokeWidth="1" />
      </g>
    )}

    {/* 6. DOVETAIL BANNER (Swallowtail notched pennant tag with brass grommet) */}
    {theme === 'terracotta' && (
      <g>
        <path
          d="M-78,-42 L90,-42 L80,14 L90,70 L-78,70 L-88,14 Z"
          fill={palette.bg}
          stroke={palette.border}
          strokeWidth="1.9"
          strokeLinejoin="round"
        />
        <path
          d="M-73,-36 L83,-36 L75,14 L83,64 L-73,64 L-81,14 Z"
          fill="none"
          stroke={palette.inner}
          strokeWidth="0.9"
          strokeDasharray="4 2"
          opacity="0.55"
        />
        <circle cx="-62" cy="-22" r="8" fill={palette.seal} />
        <circle cx="-62" cy="-22" r="3.5" fill={palette.bg} stroke="#FFFFFF" strokeWidth="1" />
      </g>
    )}

    {/* 7. STARLIT PLAQUE (Couture scalloped-corner plaque with 4-point star filigree) */}
    {theme === 'midnight' && (
      <g>
        <path
          d="M-73,-42 L78,-42 A12,12 0 0,0 90,-30 L90,58 A12,12 0 0,0 78,70 L-73,70 A12,12 0 0,0 -85,58 L-85,-30 A12,12 0 0,0 -73,-42 Z"
          fill={palette.bg}
          stroke={palette.border}
          strokeWidth="2"
        />
        <rect
          x="-77"
          y="-35"
          width="159"
          height="98"
          rx="4"
          fill="none"
          stroke={palette.inner}
          strokeWidth="0.9"
          opacity="0.65"
        />
        <circle cx="-62" cy="-22" r="8.5" fill={palette.seal} stroke={palette.inner} strokeWidth="1" />
        <path
          d="M-62,-28 L-60,-23.5 L-55.5,-22 L-60,-20.5 L-62,-16 L-64,-20.5 L-68.5,-22 L-64,-23.5 Z"
          fill="#FEF3C7"
        />
      </g>
    )}
  </g>
);

/**
 * 5 Romantic Voice-Emitting Keepsake Objects on BouquetStage (Mixtape, Vinyl, Voice Plushie, Music Box, Heart Locket)
 */
export const BouquetVoiceKeepsakeSVG: React.FC<{
  voice: VoiceKeepsakeData;
  isPlaying?: boolean;
}> = ({ voice, isPlaying = false }) => {
  const { style, primaryColor, accentColor, title } = voice;
  const displayTitle = (title || 'For You').slice(0, 18);

  return (
    <g>
      {/* Emitted Sound Waves & Musical Notes when playing */}
      {isPlaying && (
        <g data-export-ignore="true">
          <circle
            cx="0"
            cy="8"
            r="58"
            fill="none"
            stroke={primaryColor}
            strokeWidth="1.6"
            strokeDasharray="6 4"
            opacity="0.55"
          >
            <animate attributeName="r" values="46;68;46" dur="1.8s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.65;0.1;0.65" dur="1.8s" repeatCount="indefinite" />
          </circle>
          <text x="-48" y="-38" fontSize="14" fill={primaryColor} opacity="0.85">
            ♪
            <animate attributeName="y" values="-34;-52;-34" dur="1.5s" repeatCount="indefinite" />
          </text>
          <text x="42" y="-34" fontSize="13" fill={primaryColor} opacity="0.85">
            ♫
            <animate attributeName="y" values="-30;-48;-30" dur="1.7s" repeatCount="indefinite" />
          </text>
        </g>
      )}

      {/* 1. RETRO LOVE MIXTAPE CASSETTE */}
      {style === 'mixtape' && (
        <g>
          {/* Cassette Outer Shell */}
          <rect
            x="-60"
            y="-34"
            width="120"
            height="78"
            rx="10"
            fill={primaryColor}
            stroke="#ffffff"
            strokeWidth="2"
          />
          {/* Inner Sticker Label */}
          <rect
            x="-50"
            y="-25"
            width="100"
            height="46"
            rx="5"
            fill={accentColor}
            stroke={shadeWrapHex(primaryColor, -25)}
            strokeWidth="1"
          />
          {/* Stripes on Cassette Sticker */}
          <line x1="-46" y1="-8" x2="46" y2="-8" stroke={primaryColor} strokeWidth="1.5" opacity="0.45" />
          {/* Handwritten Mixtape Title */}
          <text
            x="0"
            y="-13"
            textAnchor="middle"
            fill="#1C1917"
            fontSize="10.5"
            fontWeight="700"
            style={{ fontFamily: "'Cormorant Garamond', serif", letterSpacing: '0.03em' }}
          >
            {displayTitle}
          </text>
          {/* Center Tape Window & Twin Reels */}
          <rect x="-36" y="-4" width="72" height="20" rx="10" fill="#1e293b" />
          <rect x="-14" y="0" width="28" height="12" rx="2" fill="#334155" />
          {/* Left Reel */}
          <g transform="translate(-23, 6)">
            {isPlaying && (
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 0 0"
                to="360 0 0"
                dur="2.2s"
                repeatCount="indefinite"
                additive="sum"
              />
            )}
            <circle cx="0" cy="0" r="6.5" fill="#f8fafc" />
            <circle cx="0" cy="0" r="2.5" fill="#1e293b" />
            <line x1="-6" y1="0" x2="6" y2="0" stroke="#94a3b8" strokeWidth="1.2" />
            <line x1="0" y1="-6" x2="0" y2="6" stroke="#94a3b8" strokeWidth="1.2" />
          </g>
          {/* Right Reel */}
          <g transform="translate(23, 6)">
            {isPlaying && (
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 0 0"
                to="360 0 0"
                dur="2.2s"
                repeatCount="indefinite"
                additive="sum"
              />
            )}
            <circle cx="0" cy="0" r="6.5" fill="#f8fafc" />
            <circle cx="0" cy="0" r="2.5" fill="#1e293b" />
            <line x1="-6" y1="0" x2="6" y2="0" stroke="#94a3b8" strokeWidth="1.2" />
            <line x1="0" y1="-6" x2="0" y2="6" stroke="#94a3b8" strokeWidth="1.2" />
          </g>
          {/* Lower Cassette Trapezoid Bridge */}
          <path
            d="M-38,44 L-28,27 L28,27 L38,44 Z"
            fill={shadeWrapHex(primaryColor, -28)}
            stroke="#ffffff"
            strokeWidth="1"
            strokeOpacity="0.5"
          />
          <circle cx="-48" cy="36" r="2.2" fill="#ffffff" opacity="0.75" />
          <circle cx="48" cy="36" r="2.2" fill="#ffffff" opacity="0.75" />
          <circle cx="-18" cy="36" r="2.5" fill="#1e293b" opacity="0.6" />
          <circle cx="18" cy="36" r="2.5" fill="#1e293b" opacity="0.6" />
        </g>
      )}

      {/* 2. VINTAGE HORN GRAMOPHONE VINYL PLAYER */}
      {style === 'vinyl' && (
        <g>
          {/* Stepped Antique Wooden Base Molding */}
          <polygon
            points="-54,38 -4,54 52,40 46,35 -4,49 -48,34"
            fill={shadeWrapHex(primaryColor, -38)}
            stroke="#292524"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <polygon
            points="-51,35 -4,50 49,36 45,32 -4,46 -46,32"
            fill={shadeWrapHex(primaryColor, -18)}
            stroke={accentColor}
            strokeWidth="0.9"
            strokeLinejoin="round"
          />
          {/* Left Wooden Cabinet Face */}
          <polygon
            points="-46,8 -4,20 -4,47 -46,33"
            fill={shadeWrapHex(primaryColor, -14)}
            stroke="#292524"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          {/* Right Wooden Cabinet Face */}
          <polygon
            points="-4,20 44,8 44,34 -4,47"
            fill={primaryColor}
            stroke="#292524"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          {/* Top Cabinet Deck */}
          <polygon
            points="-48,8 -4,-2 46,8 -4,20"
            fill={shadeWrapHex(primaryColor, 18)}
            stroke={accentColor}
            strokeWidth="1.1"
            strokeLinejoin="round"
          />
          {/* Left Circular Fretwork Speaker Grille */}
          <g transform="translate(-25, 27) skewY(16)">
            <ellipse cx="0" cy="0" rx="10" ry="11" fill="#1c1917" stroke={accentColor} strokeWidth="1.8" />
            <path
              d="M0,-10 L0,10 M-9,0 L9,0 M-6,-7 L6,7 M-6,7 L6,-7"
              stroke={accentColor}
              strokeWidth="1.2"
            />
            <circle cx="0" cy="0" r="3" fill={accentColor} />
          </g>
          {/* Right Front Brass Control Plate with Vintage Buttons */}
          <polygon
            points="6,23 36,15 36,31 6,39"
            fill={accentColor}
            stroke="#78350f"
            strokeWidth="1"
            strokeLinejoin="round"
          />
          <g fill="#451a03">
            <circle cx="13" cy="31" r="1.6" />
            <circle cx="18" cy="29.6" r="1.6" />
            <circle cx="23" cy="28.2" r="1.6" />
            <circle cx="28" cy="26.8" r="1.6" />
            <circle cx="32.5" cy="25.5" r="1.6" />
          </g>
          {/* Spinning Vinyl Record Platter on Top of Cabinet */}
          <g transform="translate(-1, 7)">
            <ellipse cx="0" cy="0" rx="38" ry="10.5" fill="#18181b" stroke="#52525b" strokeWidth="1.4" />
            <ellipse
              cx="0"
              cy="0"
              rx="29"
              ry="7.8"
              fill="none"
              stroke="#52525b"
              strokeWidth="0.9"
              strokeDasharray="6 4"
            />
            <ellipse cx="0" cy="0" rx="15" ry="4.2" fill="#ffffff" stroke={accentColor} strokeWidth="1.2" />
            <ellipse cx="0" cy="0" rx="5" ry="1.5" fill="#18181b" />
            <circle cx="0" cy="-1.5" r="1.8" fill={accentColor} />
          </g>
          {/* Brass Tonearm & Horn Elbow */}
          <path
            d="M-30,4 L-30,-16 Q-30,-28 -16,-24"
            fill="none"
            stroke={accentColor}
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M-30,4 L-30,-16 Q-30,-28 -16,-24"
            fill="none"
            stroke="#fef08a"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          {/* Horizontal Tonearm Reaching Vinyl */}
          <path
            d="M-28,-8 L14,-1"
            fill="none"
            stroke={accentColor}
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <circle cx="16" cy="-1" r="4.5" fill={accentColor} stroke="#78350f" strokeWidth="1" />
          {/* Scalloped Antique Brass Morning-Glory Horn */}
          <g transform="translate(5, -30)">
            {isPlaying && (
              <animateTransform
                attributeName="transform"
                type="scale"
                values="1;1.04;1"
                dur="1.4s"
                repeatCount="indefinite"
                additive="sum"
              />
            )}
            <path
              d="M-22,6 C-30,-6 -24,-22 -12,-24 C-6,-34 10,-34 18,-24 C32,-22 36,-8 28,4 C34,14 24,26 10,24 C2,30 -12,26 -16,16 C-24,14 -24,10 -22,6 Z"
              fill={accentColor}
              stroke={shadeWrapHex(accentColor, -55)}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            {/* Radial Scalloped Brass Horn Flutes */}
            <path
              d="M-8,6 L-12,-22 M-8,6 L16,-22 M-8,6 L27,3 M-8,6 L10,23 M-8,6 L-15,15"
              stroke={shadeWrapHex(accentColor, -42)}
              strokeWidth="1.3"
              opacity="0.75"
            />
            <path
              d="M-8,6 L2,-28 M-8,6 L24,-10 M-8,6 L20,14"
              stroke="#fef9c3"
              strokeWidth="1.4"
              opacity="0.65"
            />
            {/* Dark Acoustic Horn Throat & Brass Sound Grille */}
            <circle cx="-8" cy="6" r="7.5" fill="#292524" stroke="#fef08a" strokeWidth="1.3" />
            <circle cx="-8" cy="6" r="4.5" fill="none" stroke={accentColor} strokeWidth="0.9" strokeDasharray="2 1.5" />
          </g>
        </g>
      )}

      {/* 3. VOICE PLUSHIE (Teddy Bear Holding a Romantic Heart Speaker) */}
      {style === 'plushie' && (
        <g>
          {/* Round Teddy Ears */}
          <circle cx="-26" cy="-28" r="13" fill={primaryColor} stroke="#ffffff" strokeWidth="1.5" />
          <circle cx="-26" cy="-28" r="7" fill="#fde68a" opacity="0.75" />
          <circle cx="26" cy="-28" r="13" fill={primaryColor} stroke="#ffffff" strokeWidth="1.5" />
          <circle cx="26" cy="-28" r="7" fill="#fde68a" opacity="0.75" />
          {/* Plushie Body & Foot Pads */}
          <ellipse cx="0" cy="24" rx="31" ry="26" fill={primaryColor} stroke="#ffffff" strokeWidth="1.6" />
          <circle cx="-20" cy="44" r="9.5" fill={shadeWrapHex(primaryColor, -18)} stroke="#ffffff" strokeWidth="1.2" />
          <circle cx="-20" cy="44" r="5" fill="#fffbeb" opacity="0.85" />
          <circle cx="20" cy="44" r="9.5" fill={shadeWrapHex(primaryColor, -18)} stroke="#ffffff" strokeWidth="1.2" />
          <circle cx="20" cy="44" r="5" fill="#fffbeb" opacity="0.85" />
          {/* Plushie Head */}
          <circle cx="0" cy="-10" r="25" fill={primaryColor} stroke="#ffffff" strokeWidth="1.6" />
          {/* Rosy Cheeks & Snout */}
          <ellipse cx="-13" cy="-6" rx="4.5" ry="2.8" fill="#fb7185" opacity="0.55" />
          <ellipse cx="13" cy="-6" rx="4.5" ry="2.8" fill="#fb7185" opacity="0.55" />
          <ellipse cx="0" cy="-5" rx="10" ry="7.5" fill="#fffbeb" />
          <circle cx="-9" cy="-14" r="2.8" fill="#292524" />
          <circle cx="9" cy="-14" r="2.8" fill="#292524" />
          <ellipse cx="0" cy="-7.5" rx="3.8" ry="2.6" fill="#451a03" />
          <path d="M-3.5,-3 Q0,0 3.5,-3" fill="none" stroke="#451a03" strokeWidth="1.4" strokeLinecap="round" />
          {/* Heart Voice Box Held in Paws */}
          <path
            d="M0,12 C-12,-2 -29,6 -19,24 L0,41 L19,24 C29,6 12,-2 0,12 Z"
            fill={accentColor}
            stroke="#ffffff"
            strokeWidth="1.8"
          />
          {/* Teddy Paws Hugging the Heart */}
          <ellipse cx="-21" cy="20" rx="8" ry="6" transform="rotate(20 -21 20)" fill={shadeWrapHex(primaryColor, -12)} stroke="#ffffff" strokeWidth="1.2" />
          <ellipse cx="21" cy="20" rx="8" ry="6" transform="rotate(-20 21 20)" fill={shadeWrapHex(primaryColor, -12)} stroke="#ffffff" strokeWidth="1.2" />
          <text
            x="0"
            y="24"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="8.5"
            fontWeight="700"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {displayTitle.slice(0, 11)}
          </text>
        </g>
      )}

      {/* 4. VINTAGE BALLERINA FLORAL MUSIC BOX */}
      {style === 'musicbox' && (
        <g>
          {/* Open Hinged Rococo Mirror Lid on Top Right */}
          <g>
            <polygon
              points="2,2 16,-42 52,-36 38,6"
              fill={primaryColor}
              stroke="#d97706"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <polygon
              points="7,-1 19,-37 46,-32 34,3"
              fill="#fef9c3"
              stroke={accentColor}
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            {/* Mirror Shimmer Lines */}
            <line x1="18" y1="-28" x2="28" y2="-8" stroke="#ffffff" strokeWidth="1.5" opacity="0.75" />
            <line x1="25" y1="-30" x2="33" y2="-14" stroke="#ffffff" strokeWidth="1.1" opacity="0.6" />
          </g>

          {/* Isometric Rococo Music Box Cabinet Base */}
          {/* Top Lid Deck */}
          <polygon
            points="-48,4 -4,-6 44,4 -4,16"
            fill={shadeWrapHex(primaryColor, 14)}
            stroke="#d97706"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Left Front Floral Cabinet Face */}
          <polygon
            points="-46,5 -4,16 -4,44 -46,32"
            fill={primaryColor}
            stroke="#d97706"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Right Side Floral Cabinet Face */}
          <polygon
            points="-4,16 42,5 42,32 -4,44"
            fill={shadeWrapHex(primaryColor, -12)}
            stroke="#d97706"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Left Cream Panel with Hand-Painted Vintage Roses */}
          <polygon
            points="-41,10 -9,19 -9,39 -41,29"
            fill="#fffbeb"
            stroke={accentColor}
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <g>
            {/* Leaves */}
            <path d="M-31,24 L-36,21 M-20,27 L-15,25 M-25,31 L-25,35" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" />
            {/* Painted Pink Roses Trio */}
            <circle cx="-28" cy="23" r="4.2" fill="#fda4af" />
            <circle cx="-28" cy="23" r="2.3" fill="#f43f5e" />
            <circle cx="-21" cy="26" r="4.5" fill="#fb7185" />
            <circle cx="-21" cy="26" r="2.4" fill="#e11d48" />
            <circle cx="-26" cy="29" r="3.6" fill="#fecdd3" />
            <circle cx="-26" cy="29" r="1.8" fill="#fb7185" />
          </g>
          {/* Right Cream Cartouche Panel with Painted Rose */}
          <polygon
            points="2,19 36,10 36,29 2,39"
            fill="#fffbeb"
            stroke={accentColor}
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <g>
            <path d="M15,25 L11,23 M23,25 L27,22" stroke="#16a34a" strokeWidth="1.4" strokeLinecap="round" />
            <circle cx="19" cy="24" r="4.5" fill="#fb7185" />
            <circle cx="19" cy="24" r="2.4" fill="#e11d48" />
            <circle cx="14" cy="27" r="3.2" fill="#fda4af" />
          </g>
          {/* Scalloped Cabriole Legs & Gilded Apron Base */}
          <path
            d="M-48,32 L-4,44 L44,32 L47,42 Q40,45 35,38 Q15,43 -4,55 Q-23,43 -39,38 Q-44,45 -50,42 Z"
            fill={accentColor}
            stroke="#b45309"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          {/* Tiny Rose Garland Along Cabriole Base */}
          <circle cx="-24" cy="41" r="2" fill="#fb7185" />
          <circle cx="-4" cy="48" r="2.2" fill="#f43f5e" />
          <circle cx="16" cy="41" r="2" fill="#fb7185" />

          {/* Golden Pedestal & Graceful Ballerina Figurine on Top */}
          <ellipse cx="-6" cy="4" rx="14" ry="4.5" fill={accentColor} stroke="#b45309" strokeWidth="1.2" />
          <ellipse cx="-6" cy="2.8" rx="10" ry="3" fill="#fef08a" stroke="#d97706" strokeWidth="0.9" />
          <g transform="translate(-6, 2)">
            {isPlaying && (
              <animateTransform
                attributeName="transform"
                type="scale"
                values="1,1; -1,1; 1,1"
                dur="2.8s"
                repeatCount="indefinite"
                additive="sum"
              />
            )}
            {/* Ballerina Pointe Legs */}
            <line x1="-1.5" y1="-12" x2="-1" y2="1" stroke="#fdba74" strokeWidth="2.2" strokeLinecap="round" />
            <line x1="1.5" y1="-12" x2="3" y2="0" stroke="#fdba74" strokeWidth="2" strokeLinecap="round" />
            {/* Ruffled Ballerina Tutu */}
            <ellipse
              cx="0"
              cy="-13"
              rx="13"
              ry="4.8"
              fill={primaryColor}
              stroke="#ffffff"
              strokeWidth="1.1"
            />
            <path
              d="M-12,-13 Q-6,-9 0,-13 Q6,-9 12,-13"
              fill="none"
              stroke="#ffffff"
              strokeWidth="1"
              opacity="0.8"
            />
            {/* Fitted Corset Bodice */}
            <path
              d="M-3.5,-23 L3.5,-23 L2,-13 L-2,-13 Z"
              fill={primaryColor}
              stroke="#ffffff"
              strokeWidth="0.8"
            />
            {/* Raised Ballet Arms */}
            <path
              d="M-3,-22 C-9,-28 -8,-37 -2,-40 M3,-22 L13,-17"
              fill="none"
              stroke="#fdba74"
              strokeWidth="1.9"
              strokeLinecap="round"
            />
            {/* Head & Blonde Ballet Bun */}
            <circle cx="0" cy="-28.5" r="3.8" fill="#fed7aa" />
            <path d="M-3.5,-29.5 Q0,-33 3.5,-29.5" fill="#eab308" />
            <circle cx="2" cy="-32.5" r="2.2" fill="#eab308" />
          </g>
        </g>
      )}

      {/* 5. GOLDEN HEART VOICE LOCKET */}
      {style === 'locket' && (
        <g>
          {/* Gold Chain Loop at Top */}
          <circle cx="0" cy="-34" r="6" fill="none" stroke="#d97706" strokeWidth="2.5" />
          {/* Outer Sculpted Heart Locket */}
          <path
            d="M0,-14 C-22,-38 -54,-18 -36,14 L0,46 L36,14 C54,-18 22,-38 0,-14 Z"
            fill={primaryColor}
            stroke="#ffffff"
            strokeWidth="2.2"
          />
          {/* Inner Enamel Heart Face */}
          <path
            d="M0,-6 C-16,-24 -40,-9 -26,14 L0,37 L26,14 C40,-9 16,-24 0,-6 Z"
            fill={accentColor}
            stroke={shadeWrapHex(primaryColor, -25)}
            strokeWidth="1.2"
          />
          {/* Engraved Soundwave Bars Inside Locket */}
          <g stroke={primaryColor} strokeWidth="2.2" strokeLinecap="round">
            <line x1="-14" y1="8" x2="-14" y2="14" />
            <line x1="-7" y1="3" x2="-7" y2="19" />
            <line x1="0" y1="-1" x2="0" y2="22" />
            <line x1="7" y1="3" x2="7" y2="19" />
            <line x1="14" y1="8" x2="14" y2="14" />
          </g>
          <text
            x="0"
            y="31"
            textAnchor="middle"
            fill="#1C1917"
            fontSize="8.5"
            fontWeight="700"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            {displayTitle.slice(0, 12)}
          </text>
        </g>
      )}
    </g>
  );
};

/**
 * Minimalist & Atmospheric Canvas Environment Backdrops (Clips inside the 560x648 rx=42 Stage Arch)
 */
export const BouquetEnvironmentSVG: React.FC<{
  environment: CanvasEnvironment;
  isDarkMode: boolean;
}> = ({ environment, isDarkMode }) => {
  if (environment === 'studio') return null;

  return (
    <g clipPath="url(#stageArchClip)" className="pointer-events-none select-none">
      {/* 1. PAPER TEXTURE (Handmade deckle-edge cotton rag stationery grain & botanical watermark) */}
      {environment === 'paper' && (
        <g opacity={isDarkMode ? 0.32 : 0.85}>
          <rect
            x="6"
            y="6"
            width="588"
            height="668"
            fill={isDarkMode ? '#3A2F2B' : '#F8F1E7'}
          />
          {/* Subtle Laid Paper Horizontal Ribbing Lines */}
          {Array.from({ length: 27 }, (_, idx) => {
            const y = 26 + idx * 24;
            return (
              <line
                key={`paper-rib-${idx}`}
                x1="22"
                y1={y}
                x2="578"
                y2={y}
                stroke={isDarkMode ? '#6E5A50' : '#DFCBB8'}
                strokeWidth="0.7"
                strokeDasharray={idx % 2 === 0 ? '14 8 32 6' : '24 10 12 8'}
                opacity="0.48"
              />
            );
          })}
          {/* Inner Deckle-Edge Stationery Border */}
          <rect
            x="24"
            y="24"
            width="552"
            height="632"
            rx="30"
            fill="none"
            stroke={isDarkMode ? '#8C7468' : '#C8B09B'}
            strokeWidth="1.2"
            strokeDasharray="8 4 2 4"
            opacity="0.7"
          />
          {/* Tiny Pressed Botanical Flecks in Paper Fiber */}
          <g fill={isDarkMode ? '#9A8276' : '#BFA38C'} opacity="0.45">
            <circle cx="96" cy="112" r="1.4" />
            <circle cx="488" cy="94" r="1.2" />
            <circle cx="132" cy="540" r="1.5" />
            <circle cx="512" cy="492" r="1.3" />
            <path d="M84,260 Q90,254 94,262" fill="none" stroke={isDarkMode ? '#9A8276' : '#BFA38C'} strokeWidth="1" />
            <path d="M504,290 Q510,284 514,292" fill="none" stroke={isDarkMode ? '#9A8276' : '#BFA38C'} strokeWidth="1" />
          </g>
        </g>
      )}

      {/* 2. SOFT MEADOW (Minimalist rolling hills, whisper-soft grass blades & tiny distant wildflowers) */}
      {environment === 'meadow' && (
        <g opacity={isDarkMode ? 0.38 : 0.88}>
          {/* Soft Sky Wash at Top */}
          <rect
            x="6"
            y="6"
            width="588"
            height="668"
            fill={isDarkMode ? '#28312B' : '#F4F8F2'}
            opacity="0.55"
          />
          {/* Distant & Foreground Minimalist Rolling Hills */}
          <path
            d="M6,520 Q175,472 340,510 T594,492 L594,674 L6,674 Z"
            fill={isDarkMode ? '#324236' : '#E3EFE0'}
            opacity="0.75"
          />
          <path
            d="M6,564 Q230,526 420,558 T594,545 L594,674 L6,674 Z"
            fill={isDarkMode ? '#3B4F40' : '#D4E7D0'}
            opacity="0.82"
          />
          {/* Delicate Line-Art Grass Blades & Tiny Wildflower Dots (Minimalist, edges only so center stays clean) */}
          <g
            stroke={isDarkMode ? '#86A88E' : '#739B7B'}
            strokeWidth="1.4"
            strokeLinecap="round"
            fill="none"
            opacity="0.75"
          >
            <path d="M68,595 Q62,568 54,554 M72,596 Q76,570 84,558" />
            <path d="M124,618 Q118,594 112,582 M128,618 Q134,596 140,585" />
            <path d="M478,610 Q472,586 464,572 M482,610 Q488,586 496,574" />
            <path d="M528,582 Q522,558 516,546 M532,582 Q538,560 544,548" />
          </g>
          <g opacity="0.85">
            <circle cx="54" cy="551" r="3" fill="#F9A8D4" />
            <circle cx="84" cy="555" r="2.5" fill="#FDE047" />
            <circle cx="112" cy="579" r="2.5" fill="#FFFDF9" />
            <circle cx="464" cy="569" r="3" fill="#F9A8D4" />
            <circle cx="496" cy="571" r="2.5" fill="#FFFDF9" />
            <circle cx="516" cy="543" r="2.8" fill="#FDE047" />
          </g>
        </g>
      )}

      {/* 3. SUNLIT WINDOW (Warm afternoon diagonal window light beams & floating botanical dust motes) */}
      {environment === 'sunlit' && (
        <g opacity={isDarkMode ? 0.35 : 0.85}>
          <polygon
            points="6,6 260,6 594,440 594,674 210,674 6,290"
            fill={isDarkMode ? '#FDE68A' : '#FEF3C7'}
            opacity={isDarkMode ? 0.12 : 0.42}
          />
          <polygon
            points="140,6 340,6 594,330 594,510"
            fill="#FFFBEB"
            opacity={isDarkMode ? 0.14 : 0.55}
          />
          {/* Subtle Window Mullion Shadow Lines */}
          <line
            x1="80"
            y1="6"
            x2="594"
            y2="520"
            stroke={isDarkMode ? '#FDE68A' : '#F59E0B'}
            strokeWidth="1"
            opacity="0.18"
          />
          <line
            x1="220"
            y1="6"
            x2="594"
            y2="380"
            stroke={isDarkMode ? '#FDE68A' : '#F59E0B'}
            strokeWidth="1"
            opacity="0.18"
          />
          {/* Floating Golden Sun Motes */}
          <g fill="#FBBF24" opacity="0.55">
            <circle cx="135" cy="142" r="2.5" />
            <circle cx="465" cy="168" r="2" />
            <circle cx="105" cy="340" r="1.8" />
            <circle cx="495" cy="360" r="2.4" />
            <circle cx="165" cy="490" r="2" />
          </g>
        </g>
      )}

      {/* 4. PRESSED LINEN (Woven atelier flax linen canvas crosshatch & double tailored stitch border) */}
      {environment === 'linen' && (
        <g opacity={isDarkMode ? 0.34 : 0.85}>
          <rect
            x="6"
            y="6"
            width="588"
            height="668"
            fill={isDarkMode ? '#332925' : '#F3EAE0'}
          />
          {/* Minimalist Woven Linen Cross-Stitch Corner Accents */}
          <rect
            x="22"
            y="22"
            width="556"
            height="636"
            rx="32"
            fill="none"
            stroke={isDarkMode ? '#7D685E' : '#C2AB96'}
            strokeWidth="1.3"
            strokeDasharray="5 4"
          />
          <rect
            x="30"
            y="30"
            width="540"
            height="620"
            rx="26"
            fill="none"
            stroke={isDarkMode ? '#635149' : '#D5C2B0'}
            strokeWidth="0.8"
          />
          {/* Subtle Corner Botanical Stitch Marks */}
          <g stroke={isDarkMode ? '#9C857A' : '#B4846C'} strokeWidth="1.2" fill="none" opacity="0.65">
            <path d="M44,58 L44,42 L60,42" />
            <path d="M556,58 L556,42 L540,42" />
            <path d="M44,622 L44,638 L60,638" />
            <path d="M556,622 L556,638 L540,638" />
          </g>
        </g>
      )}

      {/* 5. CELESTIAL GLOW (Soft twilight botanical arch, crescent moon & delicate constellation lineart) */}
      {environment === 'starlit' && (
        <g opacity={isDarkMode ? 0.75 : 0.85}>
          <rect
            x="6"
            y="6"
            width="588"
            height="668"
            fill={isDarkMode ? '#1F1B24' : '#F3EFFA'}
            opacity={isDarkMode ? 0.65 : 0.72}
          />
          {/* Fine Gold Arch Frame */}
          <path
            d="M34,648 L34,256 A266,236 0 0,1 566,256 L566,648 Z"
            fill="none"
            stroke={isDarkMode ? '#FBBF24' : '#B4846C'}
            strokeWidth="1.1"
            strokeDasharray="4 4"
            opacity="0.55"
          />
          {/* Top-Center Crescent Moon & Four-Point Stars */}
          <path
            d="M304,54 A14,14 0 1,0 318,72 A11,11 0 1,1 304,54 Z"
            fill={isDarkMode ? '#FDE68A' : '#D97706'}
            opacity="0.7"
          />
          <g fill={isDarkMode ? '#FDE68A' : '#D97706'} opacity="0.7">
            <path d="M118,128 L120,134 L126,136 L120,138 L118,144 L116,138 L110,136 L116,134 Z" />
            <path d="M482,138 L484,144 L490,146 L484,148 L482,154 L480,148 L474,146 L480,144 Z" />
            <circle cx="92" cy="215" r="2" />
            <circle cx="142" cy="182" r="1.6" />
            <circle cx="508" cy="224" r="2" />
            <circle cx="456" cy="192" r="1.6" />
          </g>
          <path
            d="M92,215 L118,136 L142,182 M508,224 L482,146 L456,192"
            fill="none"
            stroke={isDarkMode ? '#FDE68A' : '#B4846C'}
            strokeWidth="0.75"
            strokeDasharray="2 3"
            opacity="0.45"
          />
        </g>
      )}
    </g>
  );
};

/**
 * 6 Unique Botanical Photocard Keepsakes (Polaroid, Postage Stamp, Oval Cameo, Vintage Film, Pressed Frame, Arch Card)
 */
export const BouquetPhotoCardSVG: React.FC<{
  item: BouquetItem;
}> = ({ item }) => {
  const style: PhotoFrameStyle = item.photoStyle || 'polaroid';
  const frameColor = item.petalColor || '#FFFDF9';
  const accentColor = item.centerColor || '#E11D48';
  const caption = (item.photoCaption ?? 'Sweet Memory').slice(0, 22);
  const clipId = `photo-frame-clip-${item.id}`;

  const renderPhotoOrPlaceholder = (x: number, y: number, w: number, h: number) => {
    if (item.photoDataUrl) {
      return (
        <image
          href={item.photoDataUrl}
          x={x}
          y={y}
          width={w}
          height={h}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
        />
      );
    }
    // Delicate botanical lineart landscape/portrait placeholder when no image uploaded yet
    return (
      <g clipPath={`url(#${clipId})`}>
        <rect x={x} y={y} width={w} height={h} fill="#F5EBE1" />
        <circle cx={x + w * 0.72} cy={y + h * 0.28} r={w * 0.11} fill={accentColor} opacity="0.32" />
        <path
          d={`M${x},${y + h * 0.78} Q${x + w * 0.35},${y + h * 0.56} ${x + w * 0.68},${y + h * 0.76} T${x + w},${y + h * 0.72} L${x + w},${y + h} L${x},${y + h} Z`}
          fill="#DECBB9"
          opacity="0.7"
        />
        {/* Minimalist Pressed Flower Silhouette in Center */}
        <g transform={`translate(${x + w / 2}, ${y + h * 0.48})`}>
          <line x1="0" y1="4" x2="0" y2="24" stroke="#7D6B60" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M0,14 Q-8,10 -10,15 Q-6,19 0,14 Z M0,17 Q8,13 10,18 Q6,22 0,17 Z" fill="#84A98C" opacity="0.75" />
          <circle cx="0" cy="-2" r="5" fill={accentColor} opacity="0.65" />
          <circle cx="-6" cy="2" r="4.5" fill={accentColor} opacity="0.5" />
          <circle cx="6" cy="2" r="4.5" fill={accentColor} opacity="0.5" />
          <circle cx="-4" cy="8" r="4.5" fill={accentColor} opacity="0.55" />
          <circle cx="4" cy="8" r="4.5" fill={accentColor} opacity="0.55" />
          <circle cx="0" cy="3" r="2.8" fill="#FFFDF9" />
        </g>
      </g>
    );
  };

  return (
    <g>
      {/* Only render wooden pick handle stem when explicitly clipped into the bouquet */}
      {item.clippedToBouquet && (
        <line
          x1="0"
          y1="38"
          x2="0"
          y2="148"
          stroke="#C89B6E"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
      )}

      <defs>
        {style === 'raw' && (
          <clipPath id={clipId}>
            <rect x="-44" y="-44" width="88" height="88" rx="6" />
          </clipPath>
        )}
        {style === 'polaroid' && (
          <clipPath id={clipId}>
            <rect x="-35" y="-42" width="70" height="66" rx="3" />
          </clipPath>
        )}
        {style === 'stamp' && (
          <clipPath id={clipId}>
            <rect x="-33" y="-39" width="66" height="78" rx="3" />
          </clipPath>
        )}
        {style === 'cameo' && (
          <clipPath id={clipId}>
            <ellipse cx="0" cy="-2" rx="33" ry="42" />
          </clipPath>
        )}
        {style === 'film' && (
          <clipPath id={clipId}>
            <rect x="-31" y="-38" width="62" height="66" rx="2" />
          </clipPath>
        )}
        {style === 'pressed' && (
          <clipPath id={clipId}>
            <polygon points="-27,-42 27,-42 36,-33 36,33 27,42 -27,42 -36,33 -36,-33" />
          </clipPath>
        )}
        {style === 'arch' && (
          <clipPath id={clipId}>
            <path d="M-34,34 L-34,-10 A34,34 0 0,1 34,-10 L34,34 Z" />
          </clipPath>
        )}
      </defs>

      {/* 0. FRAMELESS DIRECT PHOTO UPLOAD (Just the uploaded picture, no frame or caption) */}
      {style === 'raw' && (
        <g>
          {renderPhotoOrPlaceholder(-44, -44, 88, 88)}
          {!item.photoDataUrl && (
            <rect
              x="-44"
              y="-44"
              width="88"
              height="88"
              rx="6"
              fill="none"
              stroke="#B4846C"
              strokeWidth="1.2"
              strokeDasharray="4 3"
              opacity="0.7"
            />
          )}
        </g>
      )}

      {/* 1. INSTANT POLAROID WITH WASHI TAPE & CAPTION */}
      {style === 'polaroid' && (
        <g>
          <rect
            x="-43"
            y="-50"
            width="86"
            height="104"
            rx="5"
            fill={frameColor}
            stroke="#D6C7B8"
            strokeWidth="1.5"
          />
          {renderPhotoOrPlaceholder(-35, -42, 70, 66)}
          <rect
            x="-35"
            y="-42"
            width="70"
            height="66"
            rx="3"
            fill="none"
            stroke="#E5D7C8"
            strokeWidth="1"
          />
          {/* Diagonal Washi Tape Strip at Top */}
          <rect
            x="-18"
            y="-56"
            width="36"
            height="12"
            rx="2"
            transform="rotate(-6 0 -50)"
            fill={accentColor}
            fillOpacity="0.78"
            stroke="#FFFDF9"
            strokeWidth="0.8"
          />
          {/* Handwritten Polaroid Caption */}
          <text
            x="0"
            y="41"
            textAnchor="middle"
            fill="#2A201D"
            fontSize="11"
            fontWeight="600"
            style={{ fontFamily: "'Caveat', 'Cormorant Garamond', cursive" }}
          >
            {caption}
          </text>
        </g>
      )}

      {/* 2. PERFORATED POSTAGE STAMP KEEPSAKE */}
      {style === 'stamp' && (
        <g>
          <rect
            x="-44"
            y="-50"
            width="88"
            height="100"
            rx="6"
            fill={frameColor}
            stroke={accentColor}
            strokeWidth="2.8"
            strokeDasharray="5 3.5"
          />
          <rect
            x="-39"
            y="-45"
            width="78"
            height="90"
            rx="3"
            fill={frameColor}
            stroke={accentColor}
            strokeWidth="1"
            strokeOpacity="0.5"
          />
          {renderPhotoOrPlaceholder(-33, -39, 66, 78)}
          {/* Postmark Cancellation Waves & Stamp Value */}
          <g stroke={accentColor} strokeWidth="1.1" fill="none" opacity="0.75">
            <circle cx="24" cy="-28" r="9" />
            <path d="M10,-30 Q18,-33 26,-30 T42,-30 M10,-25 Q18,-28 26,-25 T42,-25" />
          </g>
          {caption && (
            <rect x="-32" y="24" width="64" height="14" rx="7" fill={frameColor} fillOpacity="0.9" />
          )}
          <text
            x="0"
            y="34"
            textAnchor="middle"
            fill="#2A201D"
            fontSize="9"
            fontWeight="600"
            style={{ fontFamily: "'Cormorant Garamond', serif", letterSpacing: '0.04em' }}
          >
            {caption}
          </text>
        </g>
      )}

      {/* 3. OVAL RIBBON CAMEO LOCKET */}
      {style === 'cameo' && (
        <g>
          {/* Petite Top Ribbon Bow */}
          <path
            d="M-3,-50 C-18,-62 -22,-42 -4,-45 Z M3,-50 C18,-62 22,-42 4,-45 Z"
            fill={accentColor}
            stroke="#FFFDF9"
            strokeWidth="1"
          />
          <ellipse
            cx="0"
            cy="-2"
            rx="41"
            ry="50"
            fill={frameColor}
            stroke={accentColor}
            strokeWidth="2.2"
          />
          <ellipse
            cx="0"
            cy="-2"
            rx="37"
            ry="46"
            fill="none"
            stroke={accentColor}
            strokeWidth="1.1"
            strokeDasharray="3 2.5"
            opacity="0.75"
          />
          {renderPhotoOrPlaceholder(-33, -44, 66, 84)}
          <ellipse
            cx="0"
            cy="-2"
            rx="33"
            ry="42"
            fill="none"
            stroke="#FFFDF9"
            strokeWidth="1.4"
          />
          {caption && (
            <g transform="translate(0, 44)">
              <rect
                x="-36"
                y="-8"
                width="72"
                height="16"
                rx="8"
                fill={frameColor}
                stroke={accentColor}
                strokeWidth="1.1"
              />
              <text
                x="0"
                y="3"
                textAnchor="middle"
                fill="#2A201D"
                fontSize="9"
                fontWeight="600"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                {caption}
              </text>
            </g>
          )}
        </g>
      )}

      {/* 4. VINTAGE 35MM FILM FRAME */}
      {style === 'film' && (
        <g>
          <rect
            x="-44"
            y="-48"
            width="88"
            height="98"
            rx="4"
            fill={frameColor}
            stroke={accentColor}
            strokeWidth="1.6"
          />
          {/* Left & Right Sprocket Holes */}
          {[-36, -22, -8, 6, 20, 34].map((sy) => (
            <g key={`sprocket-${sy}`} fill="#FFFDF9" opacity="0.88">
              <rect x="-40" y={sy - 3} width="5" height="6" rx="1" />
              <rect x="35" y={sy - 3} width="5" height="6" rx="1" />
            </g>
          ))}
          {renderPhotoOrPlaceholder(-31, -38, 62, 66)}
          <rect
            x="-31"
            y="-38"
            width="62"
            height="66"
            rx="2"
            fill="none"
            stroke={accentColor}
            strokeWidth="1"
            strokeOpacity="0.6"
          />
          <text
            x="0"
            y="41"
            textAnchor="middle"
            fill={accentColor}
            fontSize="9"
            fontWeight="600"
            style={{ fontFamily: "'Inter', sans-serif", letterSpacing: '0.06em' }}
          >
            {caption || 'KODAK · 24'}
          </text>
        </g>
      )}

      {/* 5. PRESSED BOTANICAL SPECIMEN PLAQUE */}
      {style === 'pressed' && (
        <g>
          <polygon
            points="-31,-48 31,-48 42,-37 42,39 31,50 -31,50 -42,39 -42,-37"
            fill={frameColor}
            stroke={accentColor}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {renderPhotoOrPlaceholder(-36, -42, 72, 84)}
          <polygon
            points="-27,-42 27,-42 36,-33 36,33 27,42 -27,42 -36,33 -36,-33"
            fill="none"
            stroke={accentColor}
            strokeWidth="1"
            opacity="0.7"
          />
          {/* Corner Herbarium Brass Mounting Clips */}
          <path
            d="M-36,-29 L-23,-42 M23,-42 L36,-29 M-36,29 L-23,42 M23,42 L36,29"
            stroke={accentColor}
            strokeWidth="2"
            strokeLinecap="round"
          />
          {caption && (
            <g transform="translate(0, 34)">
              <rect x="-30" y="-7" width="60" height="14" rx="4" fill={frameColor} fillOpacity="0.92" />
              <text
                x="0"
                y="2.5"
                textAnchor="middle"
                fill="#2A201D"
                fontSize="8.8"
                fontWeight="600"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                {caption}
              </text>
            </g>
          )}
        </g>
      )}

      {/* 6. ATELIER ARCHED PORTRAIT CARD WITH WAX SEAL */}
      {style === 'arch' && (
        <g>
          <path
            d="M-42,48 L-42,-10 A42,42 0 0,1 42,-10 L42,48 Q42,54 36,54 L-36,54 Q-42,54 -42,48 Z"
            fill={frameColor}
            stroke={accentColor}
            strokeWidth="1.8"
          />
          {renderPhotoOrPlaceholder(-34, -44, 68, 78)}
          <path
            d="M-34,34 L-34,-10 A34,34 0 0,1 34,-10 L34,34 Z"
            fill="none"
            stroke={accentColor}
            strokeWidth="1"
            strokeDasharray="3 2"
            opacity="0.7"
          />
          {/* Petite Wax Seal on Arch Base */}
          <circle cx="-26" cy="44" r="6" fill={accentColor} stroke="#FFFDF9" strokeWidth="1" />
          <text
            x="4"
            y="47"
            textAnchor="middle"
            fill="#2A201D"
            fontSize="9.5"
            fontWeight="600"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            {caption}
          </text>
        </g>
      )}
    </g>
  );
};

export interface BouquetStageProps {
  svgRef: React.RefObject<SVGSVGElement | null> | React.RefObject<SVGSVGElement> | any;
  isPreviewMode: boolean;
  isDarkMode?: boolean;
  bloomedCount?: number;
  showCardInGiftView?: boolean;
  isVoicePlaying?: boolean;
  onCardTagClick?: () => void;
  onVoiceKeepsakeClick?: () => void;
  onCardSelect?: () => void;
  onVoiceSelect?: () => void;
  onWrapperClick?: () => void;
  onRibbonClick?: () => void;
  onPhotoCardUploadClick?: (itemId: string) => void;
  onBouquetSelect?: () => void;
}

export const BouquetStage: React.FC<BouquetStageProps> = ({
  svgRef,
  isPreviewMode,
  isDarkMode = false,
  bloomedCount,
  showCardInGiftView = true,
  isVoicePlaying = false,
  onCardTagClick,
  onVoiceKeepsakeClick,
  onCardSelect,
  onVoiceSelect,
  onWrapperClick,
  onRibbonClick,
  onPhotoCardUploadClick,
  onBouquetSelect,
}) => {
  const {
    items,
    selectedId,
    wrapStyle,
    wrapColor,
    ribbonColor,
    ribbonStyle,
    environment,
    bouquetPose,
    card,
    voice,
    selectItem,
    updateItem,
    updateCard,
    updateVoice,
    updateBouquetPose,
    resetBouquetPose,
    toggleWrapVisibility,
    moveItemLayer,
    deleteSelected,
    flipSelected,
    toggleItemLock,
    commitHistorySnapshot
  } = useBouquetStore();

  const pose = bouquetPose || DEFAULT_BOUQUET_POSE;
  const [activeSpecialObject, setActiveSpecialObject] = useState<'card' | 'voice' | 'bouquet' | null>(null);

  const [interaction, setInteraction] = useState<{
    mode:
      | 'move'
      | 'transform'
      | 'move-card'
      | 'move-voice'
      | 'resize-card'
      | 'resize-voice'
      | 'move-bouquet'
      | 'resize-bouquet';
    itemId: string;
    startPointerX: number;
    startPointerY: number;
    startItemX: number;
    startItemY: number;
    startScale: number;
    startRotation: number;
  } | null>(null);

  const hasCommittedDragHistoryRef = useRef(false);
  const hasDraggedSpecialRef = useRef(false);
  const wasSpecialAlreadyActiveRef = useRef(false);

  useEffect(() => {
    if (selectedId) {
      setActiveSpecialObject(null);
    }
  }, [selectedId]);

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

  // Convert SVG viewBox coordinates into local bouquet space (accounting for bouquetPose x, y, scale, rotation around 300,380)
  const svgToBouquetLocalCoords = useCallback(
    (svgX: number, svgY: number) => {
      const dx = (svgX - pose.x) / (pose.scale || 1);
      const dy = (svgY - pose.y) / (pose.scale || 1);
      const rad = ((-pose.rotation || 0) * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      return {
        x: 300 + dx * cos - dy * sin,
        y: 380 + dx * sin + dy * cos,
      };
    },
    [pose.x, pose.y, pose.scale, pose.rotation]
  );

  const captureSvgPointer = (e: React.PointerEvent) => {
    try {
      svgRef.current?.setPointerCapture?.(e.pointerId);
    } catch {
      try {
        (e.target as Element)?.setPointerCapture?.(e.pointerId);
      } catch {
        // Ignore pointer capture errors
      }
    }
  };

  const handleItemPointerDown = (e: React.PointerEvent, item: BouquetItem) => {
    if (isPreviewMode || item.hidden) return;
    e.stopPropagation();
    setActiveSpecialObject(null);
    selectItem(item.id);
    if (item.locked) return;
    captureSvgPointer(e);
    hasCommittedDragHistoryRef.current = false;

    const svgPt = clientToSvgCoords(e.clientX, e.clientY);
    const localPt = svgToBouquetLocalCoords(svgPt.x, svgPt.y);
    setInteraction({
      mode: 'move',
      itemId: item.id,
      startPointerX: localPt.x,
      startPointerY: localPt.y,
      startItemX: item.x,
      startItemY: item.y,
      startScale: item.scale,
      startRotation: item.rotation
    });
  };

  const handleBouquetPointerDown = (e: React.PointerEvent, source: 'wrapper' | 'ribbon') => {
    if (isPreviewMode) return;
    e.stopPropagation();
    selectItem(null);
    setActiveSpecialObject('bouquet');
    onBouquetSelect?.();
    if (source === 'ribbon') {
      onRibbonClick?.();
    } else {
      onWrapperClick?.();
    }
    captureSvgPointer(e);
    hasCommittedDragHistoryRef.current = false;
    hasDraggedSpecialRef.current = false;
    const pt = clientToSvgCoords(e.clientX, e.clientY);
    setInteraction({
      mode: 'move-bouquet',
      itemId: 'bouquet',
      startPointerX: pt.x,
      startPointerY: pt.y,
      startItemX: pose.x,
      startItemY: pose.y,
      startScale: pose.scale,
      startRotation: pose.rotation,
    });
  };

  const handleBouquetResizePointerDown = (e: React.PointerEvent) => {
    if (isPreviewMode) return;
    e.stopPropagation();
    selectItem(null);
    setActiveSpecialObject('bouquet');
    onBouquetSelect?.();
    captureSvgPointer(e);
    hasCommittedDragHistoryRef.current = false;
    hasDraggedSpecialRef.current = true;
    const pt = clientToSvgCoords(e.clientX, e.clientY);
    setInteraction({
      mode: 'resize-bouquet',
      itemId: 'bouquet',
      startPointerX: pt.x,
      startPointerY: pt.y,
      startItemX: pose.x,
      startItemY: pose.y,
      startScale: pose.scale,
      startRotation: pose.rotation,
    });
  };

  const handleCardPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (isPreviewMode) return;
    wasSpecialAlreadyActiveRef.current = activeSpecialObject === 'card';
    selectItem(null);
    setActiveSpecialObject('card');
    onCardSelect?.();
    captureSvgPointer(e);
    hasCommittedDragHistoryRef.current = false;
    hasDraggedSpecialRef.current = false;
    const pt = clientToSvgCoords(e.clientX, e.clientY);
    setInteraction({
      mode: 'move-card',
      itemId: 'card',
      startPointerX: pt.x,
      startPointerY: pt.y,
      startItemX: card.x ?? 410,
      startItemY: card.y ?? 525,
      startScale: card.scale ?? 0.72,
      startRotation: card.rotation ?? 0
    });
  };

  const handleCardResizePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (isPreviewMode) return;
    selectItem(null);
    setActiveSpecialObject('card');
    onCardSelect?.();
    captureSvgPointer(e);
    hasCommittedDragHistoryRef.current = false;
    hasDraggedSpecialRef.current = true;
    const pt = clientToSvgCoords(e.clientX, e.clientY);
    setInteraction({
      mode: 'resize-card',
      itemId: 'card',
      startPointerX: pt.x,
      startPointerY: pt.y,
      startItemX: card.x ?? 410,
      startItemY: card.y ?? 525,
      startScale: card.scale ?? 0.72,
      startRotation: card.rotation ?? 0
    });
  };

  const handleVoicePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (isPreviewMode) return;
    wasSpecialAlreadyActiveRef.current = activeSpecialObject === 'voice';
    selectItem(null);
    setActiveSpecialObject('voice');
    onVoiceSelect?.();
    captureSvgPointer(e);
    hasCommittedDragHistoryRef.current = false;
    hasDraggedSpecialRef.current = false;
    const pt = clientToSvgCoords(e.clientX, e.clientY);
    setInteraction({
      mode: 'move-voice',
      itemId: 'voice',
      startPointerX: pt.x,
      startPointerY: pt.y,
      startItemX: voice?.x ?? 185,
      startItemY: voice?.y ?? 525,
      startScale: voice?.scale ?? 1.0,
      startRotation: voice?.rotation ?? 0
    });
  };

  const handleVoiceResizePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (isPreviewMode) return;
    selectItem(null);
    setActiveSpecialObject('voice');
    onVoiceSelect?.();
    captureSvgPointer(e);
    hasCommittedDragHistoryRef.current = false;
    hasDraggedSpecialRef.current = true;
    const pt = clientToSvgCoords(e.clientX, e.clientY);
    setInteraction({
      mode: 'resize-voice',
      itemId: 'voice',
      startPointerX: pt.x,
      startPointerY: pt.y,
      startItemX: voice?.x ?? 185,
      startItemY: voice?.y ?? 525,
      startScale: voice?.scale ?? 1.0,
      startRotation: voice?.rotation ?? 0
    });
  };

  const handleGizmoPointerDown = (e: React.PointerEvent, item: BouquetItem) => {
    if (isPreviewMode || item.locked || item.hidden) return;
    e.stopPropagation();
    captureSvgPointer(e);
    hasCommittedDragHistoryRef.current = false;

    const disp = getStageItemDisplayTransform(item, wrapStyle);
    const svgPt = clientToSvgCoords(e.clientX, e.clientY);
    const localPt = svgToBouquetLocalCoords(svgPt.x, svgPt.y);
    setInteraction({
      mode: 'transform',
      itemId: item.id,
      startPointerX: localPt.x,
      startPointerY: localPt.y,
      startItemX: disp.x,
      startItemY: disp.y,
      startScale: item.scale,
      startRotation: item.rotation
    });
  };

  const applyPointerMoveAtClientCoords = useCallback(
    (clientX: number, clientY: number) => {
      if (!interaction) return;
      const pt = clientToSvgCoords(clientX, clientY);

      if (interaction.mode === 'move') {
        const localPt = svgToBouquetLocalCoords(pt.x, pt.y);
        const dx = localPt.x - interaction.startPointerX;
        const dy = localPt.y - interaction.startPointerY;
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          if (!hasCommittedDragHistoryRef.current) {
            commitHistorySnapshot();
            hasCommittedDragHistoryRef.current = true;
          }
          const movingItem = items.find((it) => it.id === interaction.itemId);
          const isUnclippedPhoto = Boolean(movingItem?.photoStyle && !movingItem?.clippedToBouquet);
          const nx = Math.max(
            isUnclippedPhoto ? 25 : 45,
            Math.min(isUnclippedPhoto ? 575 : 555, Math.round(interaction.startItemX + dx))
          );
          const ny = Math.max(
            isUnclippedPhoto ? 25 : 60,
            Math.min(isUnclippedPhoto ? 655 : 580, Math.round(interaction.startItemY + dy))
          );
          updateItem(interaction.itemId, { x: nx, y: ny }, false);
        }
      } else if (interaction.mode === 'move-bouquet') {
        const dx = pt.x - interaction.startPointerX;
        const dy = pt.y - interaction.startPointerY;
        if (Math.abs(dx) > 1.5 || Math.abs(dy) > 1.5) {
          if (Math.hypot(dx, dy) > 3) {
            hasDraggedSpecialRef.current = true;
          }
          if (!hasCommittedDragHistoryRef.current) {
            commitHistorySnapshot();
            hasCommittedDragHistoryRef.current = true;
          }
          const nx = Math.round(interaction.startItemX + dx);
          const ny = Math.round(interaction.startItemY + dy);
          updateBouquetPose({ x: nx, y: ny }, false);
        }
      } else if (interaction.mode === 'resize-bouquet') {
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
        const nextRotation = Math.max(
          -65,
          Math.min(65, Math.round(interaction.startRotation + deltaDeg))
        );

        const startDist = Math.hypot(
          interaction.startPointerX - interaction.startItemX,
          interaction.startPointerY - interaction.startItemY
        );
        const currentDist = Math.hypot(
          pt.x - interaction.startItemX,
          pt.y - interaction.startItemY
        );
        const ratio = startDist > 0 ? currentDist / startDist : 1;
        const newScale = Math.max(
          0.45,
          Math.min(2.2, Number((interaction.startScale * ratio).toFixed(2)))
        );
        if (!hasCommittedDragHistoryRef.current) {
          commitHistorySnapshot();
          hasCommittedDragHistoryRef.current = true;
        }
        updateBouquetPose({ scale: newScale, rotation: nextRotation }, false);
      } else if (interaction.mode === 'move-card') {
        const dx = pt.x - interaction.startPointerX;
        const dy = pt.y - interaction.startPointerY;
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          if (Math.hypot(dx, dy) > 2.5) {
            hasDraggedSpecialRef.current = true;
          }
          if (!hasCommittedDragHistoryRef.current) {
            commitHistorySnapshot();
            hasCommittedDragHistoryRef.current = true;
          }
          const nx = Math.max(25, Math.min(575, Math.round(interaction.startItemX + dx)));
          const ny = Math.max(25, Math.min(655, Math.round(interaction.startItemY + dy)));
          updateCard({ x: nx, y: ny });
        }
      } else if (interaction.mode === 'move-voice') {
        const dx = pt.x - interaction.startPointerX;
        const dy = pt.y - interaction.startPointerY;
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          if (Math.hypot(dx, dy) > 2.5) {
            hasDraggedSpecialRef.current = true;
          }
          if (!hasCommittedDragHistoryRef.current) {
            commitHistorySnapshot();
            hasCommittedDragHistoryRef.current = true;
          }
          const nx = Math.max(25, Math.min(575, Math.round(interaction.startItemX + dx)));
          const ny = Math.max(25, Math.min(655, Math.round(interaction.startItemY + dy)));
          updateVoice({ x: nx, y: ny });
        }
      } else if (interaction.mode === 'resize-card') {
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
        let nextRotation = Math.round(interaction.startRotation + deltaDeg);
        while (nextRotation > 180) nextRotation -= 360;
        while (nextRotation < -180) nextRotation += 360;

        const startDist = Math.hypot(
          interaction.startPointerX - interaction.startItemX,
          interaction.startPointerY - interaction.startItemY
        );
        const currentDist = Math.hypot(
          pt.x - interaction.startItemX,
          pt.y - interaction.startItemY
        );
        const ratio = startDist > 0 ? currentDist / startDist : 1;
        const newScale = Math.max(
          0.35,
          Math.min(2.4, Number((interaction.startScale * ratio).toFixed(2)))
        );
        if (!hasCommittedDragHistoryRef.current) {
          commitHistorySnapshot();
          hasCommittedDragHistoryRef.current = true;
        }
        updateCard({ scale: newScale, rotation: nextRotation });
      } else if (interaction.mode === 'resize-voice') {
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
        let nextRotation = Math.round(interaction.startRotation + deltaDeg);
        while (nextRotation > 180) nextRotation -= 360;
        while (nextRotation < -180) nextRotation += 360;

        const startDist = Math.hypot(
          interaction.startPointerX - interaction.startItemX,
          interaction.startPointerY - interaction.startItemY
        );
        const currentDist = Math.hypot(
          pt.x - interaction.startItemX,
          pt.y - interaction.startItemY
        );
        const ratio = startDist > 0 ? currentDist / startDist : 1;
        const newScale = Math.max(
          0.35,
          Math.min(2.4, Number((interaction.startScale * ratio).toFixed(2)))
        );
        if (!hasCommittedDragHistoryRef.current) {
          commitHistorySnapshot();
          hasCommittedDragHistoryRef.current = true;
        }
        updateVoice({ scale: newScale, rotation: nextRotation });
      } else if (interaction.mode === 'transform') {
        const localPt = svgToBouquetLocalCoords(pt.x, pt.y);
        const startAngle = Math.atan2(
          interaction.startPointerY - interaction.startItemY,
          interaction.startPointerX - interaction.startItemX
        );
        const currentAngle = Math.atan2(
          localPt.y - interaction.startItemY,
          localPt.x - interaction.startItemX
        );
        let deltaDeg = ((currentAngle - startAngle) * 180) / Math.PI;
        while (deltaDeg > 180) deltaDeg -= 360;
        while (deltaDeg < -180) deltaDeg += 360;
        const nextRotation = Math.max(
          -180,
          Math.min(180, Math.round(interaction.startRotation + deltaDeg))
        );

        const startDist = Math.hypot(
          interaction.startPointerX - interaction.startItemX,
          interaction.startPointerY - interaction.startItemY
        );
        const currentDist = Math.hypot(
          localPt.x - interaction.startItemX,
          localPt.y - interaction.startItemY
        );
        const ratio = startDist > 0 ? currentDist / startDist : 1;
        const newScale = Math.max(0.3, Math.min(2.8, Number((interaction.startScale * ratio).toFixed(2))));

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
    },
    [
      interaction,
      items,
      clientToSvgCoords,
      svgToBouquetLocalCoords,
      commitHistorySnapshot,
      updateItem,
      updateBouquetPose,
      updateCard,
      updateVoice,
    ]
  );

  const handleStagePointerMove = (e: React.PointerEvent) => {
    applyPointerMoveAtClientCoords(e.clientX, e.clientY);
  };

  const handleStagePointerUp = useCallback(() => {
    hasCommittedDragHistoryRef.current = false;
    if (interaction) {
      setInteraction(null);
    }
  }, [interaction]);

  // Global window pointer tracking while dragging/resizing/rotating so fast drags never drop
  useEffect(() => {
    if (!interaction || typeof window === 'undefined') return;
    const onWinMove = (ev: PointerEvent) => {
      applyPointerMoveAtClientCoords(ev.clientX, ev.clientY);
    };
    const onWinUp = () => {
      hasCommittedDragHistoryRef.current = false;
      setInteraction(null);
    };
    window.addEventListener('pointermove', onWinMove);
    window.addEventListener('pointerup', onWinUp);
    window.addEventListener('pointercancel', onWinUp);
    return () => {
      window.removeEventListener('pointermove', onWinMove);
      window.removeEventListener('pointerup', onWinUp);
      window.removeEventListener('pointercancel', onWinUp);
    };
  }, [interaction, applyPointerMoveAtClientCoords]);

  const selectedItem = items.find((i) => i.id === selectedId) || null;
  const selectedItemIndex = selectedItem ? items.findIndex((i) => i.id === selectedItem.id) : -1;
  const selectedDisplay = selectedItem ? getStageItemDisplayTransform(selectedItem, wrapStyle) : null;
  const wrapperBottomClipY =
    wrapStyle === 'basket'
      ? 596
      : wrapStyle === 'vase'
      ? 610
      : wrapStyle === 'cloche'
      ? 560
      : wrapStyle === 'plain'
      ? 650
      : 618;

  const bouquetTransform = `translate(${pose.x}, ${pose.y}) rotate(${pose.rotation}) scale(${pose.scale}) translate(-300, -380)`;

  return (
    <div className="relative w-full h-full flex items-center justify-center p-0 sm:p-1 select-none overflow-hidden">
      {/* COMPACT ICON-ONLY LAYERING & PHOTO CLIP CAPSULE (Positioned cleanly at top-left so it never covers the bouquet or greeting card) */}
      {!isPreviewMode && selectedItem && !selectedItem.hidden && (
        <div
          data-export-ignore="true"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className={`absolute top-2 left-2.5 z-30 inline-flex items-center gap-0.5 p-1 rounded-full border border-dashed shadow-[0_6px_18px_rgba(28,20,16,0.1)] backdrop-blur-md transition-all ${
            isDarkMode
              ? 'bg-[#2B2321]/95 border-[#5E4E49] text-[#FBF6F1]'
              : 'bg-[#FFFDF9]/95 border-[#DECBB9] text-[#2A201D]'
          }`}
          role="toolbar"
          aria-label="Quick layer order controls"
        >
          <button
            type="button"
            disabled={Boolean(selectedItem.locked) || selectedItemIndex <= 0}
            onClick={() => moveItemLayer(selectedItem.id, 'back')}
            title="Send to Most Back"
            aria-label="Send to Most Back"
            className="w-7 h-7 rounded-full inline-flex items-center justify-center hover:bg-[#B4846C]/15 disabled:opacity-30 transition cursor-pointer"
          >
            <LayerOrderBoxIcon direction="back" className="w-3.5 h-3.5 text-[#B4846C]" />
          </button>

          <button
            type="button"
            disabled={Boolean(selectedItem.locked) || selectedItemIndex <= 0}
            onClick={() => moveItemLayer(selectedItem.id, 'down')}
            title="Send Back 1 Layer"
            aria-label="Send Back 1 Layer"
            className="w-7 h-7 rounded-full inline-flex items-center justify-center hover:bg-[#B4846C]/15 disabled:opacity-30 transition cursor-pointer"
          >
            <LayerOrderBoxIcon direction="down" className="w-3.5 h-3.5 text-[#B4846C]" />
          </button>

          <button
            type="button"
            disabled={Boolean(selectedItem.locked) || selectedItemIndex >= items.length - 1}
            onClick={() => moveItemLayer(selectedItem.id, 'up')}
            title="Bring Forward 1 Layer"
            aria-label="Bring Forward 1 Layer"
            className="w-7 h-7 rounded-full inline-flex items-center justify-center hover:bg-[#B4846C]/15 disabled:opacity-30 transition cursor-pointer"
          >
            <LayerOrderBoxIcon direction="up" className="w-3.5 h-3.5 text-[#B4846C]" />
          </button>

          <button
            type="button"
            disabled={Boolean(selectedItem.locked) || selectedItemIndex >= items.length - 1}
            onClick={() => moveItemLayer(selectedItem.id, 'front')}
            title="Bring to Most Front"
            aria-label="Bring to Most Front"
            className="w-7 h-7 rounded-full inline-flex items-center justify-center hover:bg-[#B4846C]/15 disabled:opacity-30 transition cursor-pointer"
          >
            <LayerOrderBoxIcon direction="front" className="w-3.5 h-3.5 text-[#B4846C]" />
          </button>

          {selectedItem.photoStyle && (
            <>
              <span aria-hidden="true" className="w-px h-3.5 bg-[#DECBB9] dark:bg-[#5E4E49] mx-0.5" />
              <button
                type="button"
                disabled={Boolean(selectedItem.locked)}
                onClick={() =>
                  updateItem(
                    selectedItem.id,
                    { clippedToBouquet: !selectedItem.clippedToBouquet },
                    true
                  )
                }
                title={
                  selectedItem.clippedToBouquet
                    ? 'Tucked inside bouquet (Click to float unclipped)'
                    : 'Floating attachment (Click to clip inside bouquet)'
                }
                aria-label={
                  selectedItem.clippedToBouquet
                    ? 'Unclip photo from bouquet'
                    : 'Clip photo to bouquet'
                }
                aria-pressed={Boolean(selectedItem.clippedToBouquet)}
                className={`w-7 h-7 rounded-full inline-flex items-center justify-center transition cursor-pointer ${
                  selectedItem.clippedToBouquet
                    ? 'bg-[#B4846C] text-white'
                    : 'text-[#B4846C] hover:bg-[#B4846C]/15'
                }`}
              >
                <Paperclip className="w-3.5 h-3.5" />
              </button>

              {onPhotoCardUploadClick && (
                <button
                  type="button"
                  onClick={() => onPhotoCardUploadClick(selectedItem.id)}
                  title={selectedItem.photoDataUrl ? 'Change photo' : 'Upload photo'}
                  aria-label="Upload photo into photocard"
                  className="w-7 h-7 rounded-full inline-flex items-center justify-center bg-[#B4846C] text-white hover:bg-[#9F7058] transition cursor-pointer"
                >
                  <ImagePlus className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}
        </div>
      )}

      <svg
        ref={svgRef as React.RefObject<SVGSVGElement>}
        viewBox="0 0 600 680"
        className="w-full h-full max-w-[820px] max-h-[930px] aspect-[600/680] drop-shadow-sm touch-none"
        role="img"
        aria-label="Interactive Flower Bouquet Canvas"
        onPointerMove={handleStagePointerMove}
        onPointerUp={handleStagePointerUp}
        onPointerCancel={handleStagePointerUp}
        onPointerDown={() => {
          if (!isPreviewMode) {
            selectItem(null);
            setActiveSpecialObject(null);
          }
        }}
      >
        <defs>
          {/* Stage Backdrop Gradient (Light Mode) */}
          <radialGradient id="stageBgGrad" cx="50%" cy="42%" r="60%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="55%" stopColor="#FAFAF8" />
            <stop offset="100%" stopColor="#F5F3EF" stopOpacity="0.45" />
          </radialGradient>
          {/* Stage Backdrop Gradient (Soft Cashmere-Cocoa Dark Mode) */}
          <radialGradient id="stageBgGradDark" cx="50%" cy="42%" r="60%">
            <stop offset="0%" stopColor="#3E3330" />
            <stop offset="55%" stopColor="#342B28" />
            <stop offset="100%" stopColor="#2B2321" stopOpacity="0.88" />
          </radialGradient>
          {/* Glass Cloche Front Sheen Gradient */}
          <linearGradient id="clocheFrontGlassGrad" x1="0" y1="0" x2="1" y2="0.2">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.28" />
            <stop offset="35%" stopColor="#E0F2FE" stopOpacity="0.06" />
            <stop offset="75%" stopColor="#E0F2FE" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.22" />
          </linearGradient>

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

          {/* Wrapper Boundary Clips (Separate permanent IDs prevent Chromium SVG dirty-rect glitches on wrapper switch) */}
          <clipPath id="bouquetWrapperBoundsClip">
            <rect x="0" y="0" width="600" height={wrapperBottomClipY} />
          </clipPath>
          <clipPath id="bouquetClocheBoundsClip">
            <path d="M132,560 L132,276 A168,168 0 0,1 468,276 L468,560 Z" />
          </clipPath>

          {/* Stage Arch Clip for Environment Backdrops */}
          <clipPath id="stageArchClip">
            <rect x="6" y="6" width="588" height="668" rx="38" />
          </clipPath>

          {/* Per-Flower Adjustable Stem Length ClipPaths */}
          {items.map((item) => {
            const stemRatio = item.stemLength ?? 1;
            const localBottomY =
              wrapStyle === 'cloche'
                ? 38
                : Math.round(18 + 145 * stemRatio);
            return (
              <clipPath key={`stem-clip-${item.id}`} id={`stem-clip-${item.id}`}>
                <rect x="-170" y="-170" width="340" height={170 + localBottomY} />
              </clipPath>
            );
          })}
        </defs>

        {/* 1. Arch Backdrop (Upsized within 600x680 ratio; cross-fades smoothly between Light & Soft Dark Mode + Environment Vibe) */}
        <rect
          x="6"
          y="6"
          width="588"
          height="668"
          rx="38"
          fill="url(#stageBgGrad)"
        />
        <rect
          x="6"
          y="6"
          width="588"
          height="668"
          rx="38"
          fill="url(#stageBgGradDark)"
          style={{
            opacity: isDarkMode ? 1 : 0,
            transition: 'opacity 520ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
        {/* Minimalist Environment Texture / Vibe Layer */}
        <BouquetEnvironmentSVG environment={environment || 'studio'} isDarkMode={isDarkMode} />
        <circle
          cx="300"
          cy="285"
          r="230"
          fill="#ffffff"
          style={{
            opacity: isDarkMode ? 0.05 : 0.65,
            transition: 'opacity 520ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
        <circle
          cx="300"
          cy="285"
          r="230"
          fill="none"
          stroke={isDarkMode ? '#4E423E' : '#E8DDD3'}
          strokeWidth="1.5"
          strokeDasharray="6 6"
          style={{ transition: 'stroke 520ms cubic-bezier(0.22, 1, 0.36, 1)' }}
        />

        {/* UNIFIED DRAGGABLE, RESIZABLE & ROTATABLE BOUQUET GROUP (Pivot at 300, 380) */}
        <g transform={bouquetTransform}>
        {/* 2. BACK WRAPPING PAPER LAYER (Behind Stems & Flowers — Clickable & Draggable to move/resize bouquet) */}
        {wrapStyle !== 'plain' && (
          <g
            filter="url(#softShadow)"
            role={isPreviewMode ? undefined : 'button'}
            aria-label={isPreviewMode ? undefined : 'Select or drag bouquet wrapper'}
            onPointerDown={
              isPreviewMode
                ? undefined
                : (e) => handleBouquetPointerDown(e, 'wrapper')
            }
            className={isPreviewMode ? 'pointer-events-none' : 'cursor-grab active:cursor-grabbing'}
          >
            {/* STYLE 1: ORIGAMI KRAFT (Layered geometric sleeve + faceted side pleats) */}
            {wrapStyle === 'kraft' && (
              <g>
                {/* Main Upper Trapezoid Back Sheet with subtle concave top curve */}
                <path
                  d="M115,235 Q300,268 485,235 L430,455 L170,455 Z"
                  fill={wrapColor}
                />
                {/* Left & Right Angled Origami Side Wings (darker shaded fold) */}
                <path d="M90,260 L115,235 L185,445 L152,445 Z" fill={shadeWrapHex(wrapColor, -22)} />
                <path d="M510,260 L485,235 L415,445 L448,445 Z" fill={shadeWrapHex(wrapColor, -22)} />
                {/* Inner Crisp Parchment Liner */}
                <path
                  d="M145,252 Q300,280 455,252 L405,445 L195,445 Z"
                  fill={shadeWrapHex(wrapColor, 38)}
                  opacity="0.65"
                />
              </g>
            )}

            {/* STYLE 2: BUTTERFLY PETAL (Sculpted 4-wing Korean butterfly wrap with frosted inner silk tissue) */}
            {wrapStyle === 'tissue' && (
              <g>
                {/* Frosted Inner Silk Tissue Crown (Billowing translucent ivory petals in center V-cleft) */}
                <path
                  d="M300,476 C220,315 168,186 242,170 C280,162 295,212 300,254 C305,212 320,162 358,170 C432,186 380,315 300,476 Z"
                  fill="#FFFDF9"
                  fillOpacity="0.92"
                  stroke={shadeWrapHex(wrapColor, 18)}
                  strokeWidth="1.4"
                />
                <path
                  d="M300,472 C245,335 212,215 262,202 C288,195 297,232 300,268 C303,232 312,195 338,202 C388,215 355,335 300,472 Z"
                  fill={shadeWrapHex(wrapColor, 34)}
                  fillOpacity="0.55"
                />

                {/* Upper Left Sweeping Butterfly Forewing (Outer + Inner Scalloped Lobe) */}
                <path
                  d="M300,480 C192,438 82,348 74,238 C70,182 124,158 186,184 C242,208 276,262 300,320 Z"
                  fill={shadeWrapHex(wrapColor, -10)}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  strokeOpacity="0.85"
                />
                <path
                  d="M300,478 C212,425 118,336 112,246 C109,204 148,188 196,212 C242,235 276,286 300,348 Z"
                  fill={shadeWrapHex(wrapColor, 12)}
                  fillOpacity="0.78"
                  stroke="#FFFFFF"
                  strokeWidth="1.2"
                  strokeOpacity="0.65"
                />
                {/* Left Forewing Delicate Vein Creases */}
                <path
                  d="M286,458 C215,380 148,302 108,222 M292,464 C236,396 188,332 158,248"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="1.1"
                  opacity="0.55"
                />

                {/* Upper Right Sweeping Butterfly Forewing (Outer + Inner Scalloped Lobe) */}
                <path
                  d="M300,480 C408,438 518,348 526,238 C530,182 476,158 414,184 C358,208 324,262 300,320 Z"
                  fill={wrapColor}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                  strokeOpacity="0.85"
                />
                <path
                  d="M300,478 C388,425 482,336 488,246 C491,204 452,188 404,212 C358,235 324,286 300,348 Z"
                  fill={shadeWrapHex(wrapColor, 22)}
                  fillOpacity="0.78"
                  stroke="#FFFFFF"
                  strokeWidth="1.2"
                  strokeOpacity="0.65"
                />
                {/* Right Forewing Delicate Vein Creases */}
                <path
                  d="M314,458 C385,380 452,302 492,222 M308,464 C364,396 412,332 442,248"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="1.1"
                  opacity="0.55"
                />

                {/* Back Lower Butterfly Hindwings Flaring Out Below Waist */}
                <path
                  d="M236,478 C154,500 120,562 152,600 C178,630 232,608 264,566 L300,486 Z"
                  fill={shadeWrapHex(wrapColor, -18)}
                  stroke="#FFFFFF"
                  strokeWidth="1.6"
                  strokeOpacity="0.8"
                />
                <path
                  d="M364,478 C446,500 480,562 448,600 C422,630 368,608 336,566 L300,486 Z"
                  fill={shadeWrapHex(wrapColor, -8)}
                  stroke="#FFFFFF"
                  strokeWidth="1.6"
                  strokeOpacity="0.8"
                />
              </g>
            )}

            {/* STYLE 3: TULIP ORGANZA (Concave chalice veil with sweeping inner curves) */}
            {wrapStyle === 'chalice' && (
              <g>
                {/* Outer Translucent Chalice Bell */}
                <path
                  d="M105,215 Q300,262 495,215 Q455,390 385,500 L215,500 Q145,390 105,215 Z"
                  fill={shadeWrapHex(wrapColor, 10)}
                />
                {/* Left Parabolic Sheer Fold */}
                <path
                  d="M105,215 Q245,275 278,490 L215,500 Q145,390 105,215 Z"
                  fill={shadeWrapHex(wrapColor, -14)}
                  opacity="0.72"
                />
                {/* Right Parabolic Sheer Fold */}
                <path
                  d="M495,215 Q355,275 322,490 L385,500 Q455,390 495,215 Z"
                  fill={shadeWrapHex(wrapColor, -14)}
                  opacity="0.72"
                />
                {/* Delicate Inner Parabolic Contour Lines */}
                <path
                  d="M125,225 Q245,295 270,460 M475,225 Q355,295 330,460"
                  fill="none"
                  stroke={shadeWrapHex(wrapColor, -28)}
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
                  stroke={shadeWrapHex(wrapColor, -34)}
                  strokeWidth="16"
                  strokeLinecap="round"
                />
                <path
                  d="M168,425 C168,115 432,115 432,425"
                  fill="none"
                  stroke={shadeWrapHex(wrapColor, 14)}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray="10 8"
                />
                {/* Deep Shaded Basket Rim Interior Behind Stems */}
                <ellipse cx="300" cy="422" rx="146" ry="32" fill={shadeWrapHex(wrapColor, -85)} />
                <ellipse cx="300" cy="422" rx="136" ry="24" fill={shadeWrapHex(wrapColor, -110)} />
              </g>
            )}

            {/* STYLE 5: PARISIAN SCRIPT (Asymmetric high-back French botanical newspaper cone) */}
            {wrapStyle === 'vintage' && (
              <g>
                {/* High Asymmetric Crown Back Sheet */}
                <path
                  d="M300,520 L108,265 Q185,165 318,162 Q435,160 492,250 Z"
                  fill={shadeWrapHex(wrapColor, -6)}
                  stroke={shadeWrapHex(wrapColor, -28)}
                  strokeWidth="1.5"
                />
                {/* Inner Angled Parchment Sheet */}
                <path
                  d="M300,505 L138,245 L335,178 L468,262 Z"
                  fill={shadeWrapHex(wrapColor, 18)}
                />
                {/* Subtle Editorial Newsprint Lines on Upper Crown */}
                <g stroke={shadeWrapHex(wrapColor, -52)} strokeWidth="1.3" opacity="0.55">
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
                  fill={shadeWrapHex(wrapColor, 20)}
                  stroke={shadeWrapHex(wrapColor, -24)}
                  strokeWidth="1.8"
                />
                {/* Inner Blush Plissé Fan */}
                <path
                  d="M300,505 L128,275 Q214,225 300,248 Q386,225 472,275 Z"
                  fill={wrapColor}
                />
                {/* Pierced Eyelet Lace Dots along the Scallop Rim */}
                <g fill={shadeWrapHex(wrapColor, -35)} opacity="0.75">
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

            {/* STYLE 7: STARLIT NOIR (Couture wrap with gold-foil trim) */}
            {wrapStyle === 'celestial' && (
              <g>
                {/* High-Fashion Multi-Pointed Midnight Back Crown */}
                <path
                  d="M300,525 L95,250 L168,202 L242,226 L300,180 L358,226 L432,202 L505,250 Z"
                  fill={wrapColor}
                  stroke="#F59E0B"
                  strokeWidth="2"
                />
                {/* Inner Gold-Trimmed Velvet Liner */}
                <path
                  d="M300,505 L122,260 L176,220 L245,240 L300,202 L355,240 L424,220 L478,260 Z"
                  fill={shadeWrapHex(wrapColor, -18)}
                  stroke="#FBBF24"
                  strokeWidth="1"
                  strokeDasharray="5 4"
                />
              </g>
            )}

            {/* STYLE 8: CERAMIC VASE (Dark inner mouth of sculptural amphora behind stems) */}
            {wrapStyle === 'vase' && (
              <g>
                <ellipse cx="300" cy="408" rx="96" ry="22" fill={shadeWrapHex(wrapColor, -42)} stroke={wrapColor} strokeWidth="4" />
                <ellipse cx="300" cy="408" rx="84" ry="15" fill={shadeWrapHex(wrapColor, -110)} />
              </g>
            )}

            {/* STYLE 10: VELVET HATBOX (Deep cylindrical interior rim behind flowers) */}
            {wrapStyle === 'hatbox' && (
              <g>
                <ellipse cx="300" cy="405" rx="124" ry="26" fill={shadeWrapHex(wrapColor, -65)} stroke="#F59E0B" strokeWidth="2.5" />
                <ellipse cx="300" cy="405" rx="112" ry="18" fill={shadeWrapHex(wrapColor, -110)} />
              </g>
            )}

            {/* STYLE 11: GLASS CLOCHE (Back crystal bell jar dome, connected finial & preserved moss cushion) */}
            {wrapStyle === 'cloche' && (
              <g>
                {/* Sculpted Crystal Finial Knob (Connected directly to dome apex at y=106) */}
                <ellipse
                  cx="300"
                  cy="106"
                  rx="26"
                  ry="6.5"
                  fill="#CBD5E1"
                  fillOpacity="0.85"
                  stroke="#94A3B8"
                  strokeWidth="1.4"
                />
                <path
                  d="M288,104 Q300,96 312,104 L308,95 Q300,91 292,95 Z"
                  fill="#E2E8F0"
                  stroke="#94A3B8"
                  strokeWidth="1.2"
                />
                <circle
                  cx="300"
                  cy="82"
                  r="15"
                  fill="#F1F5F9"
                  fillOpacity="0.88"
                  stroke="#94A3B8"
                  strokeWidth="1.8"
                />
                <circle cx="294" cy="77" r="4.5" fill="#FFFFFF" fillOpacity="0.92" />
                <circle cx="305" cy="87" r="2.2" fill="#FFFFFF" fillOpacity="0.55" />

                {/* True Semicircular Crystal Bell Jar Back Wall (Apex at 300,106) */}
                <path
                  d="M130,562 L130,276 A170,170 0 0,1 470,276 L470,562 Z"
                  fill="#E0F2FE"
                  fillOpacity="0.24"
                  stroke="#94A3B8"
                  strokeWidth="2.2"
                />
                {/* Subtle Inner Glass Rim Halo */}
                <path
                  d="M136,558 L136,276 A164,164 0 0,1 464,276 L464,558"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="1.2"
                  opacity="0.45"
                />

                {/* Recessed Pedestal Deck & Preserved Botanical Moss Cushion Behind Stems */}
                <ellipse
                  cx="300"
                  cy="562"
                  rx="172"
                  ry="20"
                  fill={shadeWrapHex(wrapColor, -42)}
                />
                <ellipse
                  cx="300"
                  cy="558"
                  rx="154"
                  ry="15"
                  fill={shadeWrapHex(wrapColor, -62)}
                />
                <ellipse cx="300" cy="554" rx="134" ry="14" fill="#3B5E49" opacity="0.88" />
                <ellipse cx="300" cy="551" rx="106" ry="10.5" fill="#4D785E" opacity="0.82" />
              </g>
            )}

            {/* STYLE 12: KOREAN MESH (High airy frosted tulle mesh crown behind flowers) */}
            {wrapStyle === 'koreanmesh' && (
              <g>
                <path
                  d="M300,520 L88,245 Q165,165 300,195 Q435,165 512,245 Z"
                  fill={shadeWrapHex(wrapColor, 12)}
                  fillOpacity="0.82"
                  stroke={shadeWrapHex(wrapColor, -28)}
                  strokeWidth="1.6"
                  strokeDasharray="5 3"
                />
                <path
                  d="M300,505 L124,262 Q220,210 300,235 Q380,210 476,262 Z"
                  fill={wrapColor}
                  fillOpacity="0.88"
                />
              </g>
            )}
          </g>
        )}

        {/* Gather Stems at the Bouquet Tie Point (Organic curved botanical stems for Glass Cloche; lower bundle for open sleeves) */}
        {wrapStyle === 'cloche' ? (
          <g clipPath="url(#bouquetClocheBoundsClip)" opacity="0.94">
            {(bloomedCount !== undefined ? items.slice(0, bloomedCount) : items).map((item, idx) => {
              if (item.hidden) return null;
              const disp = getStageItemDisplayTransform(item, wrapStyle);
              const startY = disp.y + 16;
              const bottomSpreadX = Math.round(300 + (disp.x - 300) * 0.25);
              const midCtrlX = Math.round(300 + (disp.x - 300) * 0.36);
              const midCtrlY = Math.round(startY + (484 - startY) * 0.56);
              return (
                <g key={`cloche-stem-${item.id}`}>
                  <path
                    d={`M${disp.x},${startY} Q${midCtrlX},${midCtrlY} 300,484 Q${Math.round((300 + bottomSpreadX) / 2)},518 ${bottomSpreadX},550`}
                    stroke={idx % 2 === 0 ? '#15803d' : '#166534'}
                    strokeWidth="4.8"
                    fill="none"
                    strokeLinecap="round"
                  />
                  <path
                    d={`M${disp.x},${startY} Q${midCtrlX},${midCtrlY} 300,484`}
                    stroke="#4ade80"
                    strokeWidth="1.2"
                    strokeOpacity="0.45"
                    fill="none"
                    strokeLinecap="round"
                  />
                </g>
              );
            })}
          </g>
        ) : (
          wrapStyle !== 'basket' &&
          wrapStyle !== 'vase' &&
          wrapStyle !== 'hatbox' && (
            <g opacity="0.85" clipPath="url(#bouquetWrapperBoundsClip)">
              <path d="M288,490 L264,612" stroke="#15803d" strokeWidth="6" strokeLinecap="round" />
              <path d="M296,490 L285,616" stroke="#16a34a" strokeWidth="6.5" strokeLinecap="round" />
              <path d="M304,490 L315,616" stroke="#15803d" strokeWidth="6.5" strokeLinecap="round" />
              <path d="M312,490 L336,612" stroke="#22c55e" strokeWidth="6" strokeLinecap="round" />
              <path d="M300,490 L300,618" stroke="#166534" strokeWidth="7" strokeLinecap="round" />
            </g>
          )
        )}

        {/* 3. BOUQUET FLOWERS, FOLIAGE & CLIPPED PHOTOCARDS LAYER (Clipped to wrapper/dome bounds & per-stem adjustable stemLength) */}
        <g clipPath={wrapStyle === 'cloche' ? 'url(#bouquetClocheBoundsClip)' : 'url(#bouquetWrapperBoundsClip)'}>
          {(bloomedCount !== undefined ? items.slice(0, bloomedCount) : items).map((item) => {
            if (item.hidden) return null;
            if (item.photoStyle && !item.clippedToBouquet) return null;
            const isSelected = !isPreviewMode && item.id === selectedId;
            const disp = getStageItemDisplayTransform(item, wrapStyle);
            return (
              <g
                key={item.id}
                transform={`translate(${disp.x}, ${disp.y}) rotate(${disp.rotation}) scale(${
                  item.flipX ? -disp.scale : disp.scale
                }, ${disp.scale})`}
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
                <g
                  clipPath={`url(#stem-clip-${item.id})`}
                  className={bloomedCount !== undefined ? 'stem-bloom-pop' : ''}
                >
                  {/* Invisible generous hit target for easy touch tapping */}
                  <circle cx="0" cy="-10" r="48" fill="transparent" />
                  {item.photoStyle ? (
                    <BouquetPhotoCardSVG item={item} />
                  ) : (
                    <FlowerRenderer
                      type={item.type}
                      petalColor={item.petalColor}
                      centerColor={item.centerColor}
                    />
                  )}
                </g>
              </g>
            );
          })}
        </g>

        {/* 4. FRONT WRAPPING LAYER & UNIVERSAL RIBBON / LACE DESIGN (Overlaps Lower Stems — Clickable & Draggable to move/resize bouquet) */}
        <g filter="url(#softShadow)">
          <g
            role={isPreviewMode ? undefined : 'button'}
            aria-label={isPreviewMode ? undefined : 'Select or drag bouquet wrapper'}
            onPointerDown={
              isPreviewMode
                ? undefined
                : (e) => handleBouquetPointerDown(e, 'wrapper')
            }
            className={isPreviewMode ? 'pointer-events-none' : 'cursor-grab active:cursor-grabbing'}
          >
            {/* STYLE 1 FRONT: ORIGAMI KRAFT */}
            {wrapStyle === 'kraft' && (
              <g>
                <path d="M168,390 L265,455 L242,518 L195,512 Z" fill={shadeWrapHex(wrapColor, -22)} />
                <path d="M432,390 L335,455 L358,518 L405,512 Z" fill={shadeWrapHex(wrapColor, -22)} />
                <path
                  d="M174,394 Q300,418 426,394 L388,512 L212,512 Z"
                  fill={shadeWrapHex(wrapColor, 6)}
                  stroke={shadeWrapHex(wrapColor, 24)}
                  strokeWidth="1.2"
                />
                <path
                  d="M224,508 L376,508 L360,625 L240,625 Z"
                  fill={wrapColor}
                />
                <path d="M258,510 L248,625 L270,625 L276,510 Z" fill={shadeWrapHex(wrapColor, -26)} opacity="0.85" />
                <path d="M342,510 L352,625 L330,625 L324,510 Z" fill={shadeWrapHex(wrapColor, -26)} opacity="0.85" />
                <line x1="300" y1="510" x2="300" y2="625" stroke={shadeWrapHex(wrapColor, -22)} strokeWidth="1.5" />
              </g>
            )}

            {/* STYLE 2 FRONT: BUTTERFLY PETAL (Sculpted lower hindwings, pleated center tail & crossover petal waist folds) */}
            {wrapStyle === 'tissue' && (
              <g>
                {/* Flared Lower Left & Right Butterfly Hindwings (Front Layer) */}
                <path
                  d="M234,482 C168,510 144,572 174,606 C198,634 248,612 276,570 L300,486 Z"
                  fill={shadeWrapHex(wrapColor, -6)}
                  stroke="#FFFFFF"
                  strokeWidth="1.6"
                  strokeOpacity="0.88"
                />
                <path
                  d="M366,482 C432,510 456,572 426,606 C402,634 352,612 324,570 L300,486 Z"
                  fill={shadeWrapHex(wrapColor, 6)}
                  stroke="#FFFFFF"
                  strokeWidth="1.6"
                  strokeOpacity="0.88"
                />

                {/* Center Accordion-Pleated Silk Tail Fan */}
                <path
                  d="M236,484 L364,484 L348,618 Q300,632 252,618 Z"
                  fill={shadeWrapHex(wrapColor, 18)}
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
                <path
                  d="M264,486 L258,618 M282,486 L279,622 M300,486 L300,625 M318,486 L321,622 M336,486 L342,618"
                  stroke={shadeWrapHex(wrapColor, -20)}
                  strokeWidth="1.2"
                  opacity="0.48"
                />

                {/* Frosted Inner Tissue Ruffle Peeking Along Front Crossover Collar */}
                <path
                  d="M128,298 C178,325 242,395 308,480 L238,482 C185,428 134,368 128,298 Z"
                  fill="#FFFDF9"
                  fillOpacity="0.85"
                />
                <path
                  d="M472,298 C422,325 358,395 292,480 L362,482 C415,428 466,368 472,298 Z"
                  fill="#FFFDF9"
                  fillOpacity="0.85"
                />

                {/* Left Curved Butterfly Crossover Wing Fold */}
                <path
                  d="M114,312 C108,382 162,452 234,486 L316,486 C268,418 198,336 144,296 C126,283 116,292 114,312 Z"
                  fill={shadeWrapHex(wrapColor, -8)}
                  stroke="#FFFFFF"
                  strokeWidth="1.8"
                  strokeOpacity="0.9"
                />
                {/* Right Curved Butterfly Crossover Wing Fold */}
                <path
                  d="M486,312 C492,382 438,452 366,486 L284,486 C332,418 402,336 456,296 C474,283 484,292 486,312 Z"
                  fill={wrapColor}
                  stroke="#FFFFFF"
                  strokeWidth="1.8"
                  strokeOpacity="0.9"
                />
                {/* Delicate Inner Gold/White Edge Trim Along Front Wing Margins */}
                <path
                  d="M124,306 C178,346 242,418 296,482 M476,306 C422,346 358,418 304,482"
                  fill="none"
                  stroke="#FFFDF9"
                  strokeWidth="1.1"
                  strokeDasharray="4 3"
                  opacity="0.75"
                />
              </g>
            )}

            {/* STYLE 3 FRONT: TULIP ORGANZA */}
            {wrapStyle === 'chalice' && (
              <g>
                <path
                  d="M218,505 L382,505 L370,625 Q300,632 230,625 Z"
                  fill={shadeWrapHex(wrapColor, -6)}
                />
                <path
                  d="M155,375 Q245,425 345,495 L218,508 Q182,445 155,375 Z"
                  fill={shadeWrapHex(wrapColor, -18)}
                  opacity="0.92"
                />
                <path
                  d="M445,375 Q355,425 255,495 L382,508 Q418,445 445,375 Z"
                  fill={wrapColor}
                  opacity="0.92"
                />
                <path
                  d="M182,415 Q300,455 418,415 L380,508 L220,508 Z"
                  fill={shadeWrapHex(wrapColor, 16)}
                  opacity="0.78"
                />
              </g>
            )}

            {/* STYLE 4 FRONT: WICKER BASKET */}
            {wrapStyle === 'basket' && (
              <g>
                <path
                  d="M158,422 L442,422 L392,598 Q300,616 208,598 Z"
                  fill={wrapColor}
                  stroke={shadeWrapHex(wrapColor, -42)}
                  strokeWidth="2.5"
                />
                <path
                  d="M168,456 Q300,472 432,456 M178,490 Q300,506 422,490 M188,524 Q300,540 412,524 M198,558 Q300,574 402,558"
                  fill="none"
                  stroke={shadeWrapHex(wrapColor, -42)}
                  strokeWidth="3"
                  opacity="0.65"
                />
                <path
                  d="M195,428 L225,598 M235,430 L255,602 M275,432 L285,604 M325,432 L315,604 M365,430 L345,602 M405,428 L375,598"
                  fill="none"
                  stroke={shadeWrapHex(wrapColor, 24)}
                  strokeWidth="3.5"
                  strokeDasharray="9 7"
                  opacity="0.75"
                />
                <path
                  d="M202,594 Q300,612 398,594 L392,614 Q300,630 208,614 Z"
                  fill={shadeWrapHex(wrapColor, -58)}
                />
                <path
                  d="M146,416 Q300,444 454,416 L450,438 Q300,466 150,438 Z"
                  fill={shadeWrapHex(wrapColor, -22)}
                  stroke={shadeWrapHex(wrapColor, -72)}
                  strokeWidth="2"
                />
                <path
                  d="M154,426 Q300,454 446,426"
                  fill="none"
                  stroke={shadeWrapHex(wrapColor, 32)}
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray="12 8"
                />
              </g>
            )}

            {/* STYLE 5 FRONT: PARISIAN SCRIPT */}
            {wrapStyle === 'vintage' && (
              <g>
                <path
                  d="M126,282 L310,475 L252,618 L194,492 Z"
                  fill={shadeWrapHex(wrapColor, -12)}
                  stroke={shadeWrapHex(wrapColor, -34)}
                  strokeWidth="1.5"
                />
                <path
                  d="M474,272 L288,482 L348,618 L408,485 Z"
                  fill={shadeWrapHex(wrapColor, 10)}
                  stroke={shadeWrapHex(wrapColor, -26)}
                  strokeWidth="1.5"
                />
                <path
                  d="M214,432 L300,486 L388,426 L346,618 Q300,628 254,618 Z"
                  fill={wrapColor}
                  stroke={shadeWrapHex(wrapColor, -26)}
                  strokeWidth="1.2"
                />
                <g stroke={shadeWrapHex(wrapColor, -78)} strokeWidth="1.4" opacity="0.6">
                  <line x1="335" y1="382" x2="412" y2="352" />
                  <line x1="328" y1="396" x2="405" y2="366" />
                  <line x1="320" y1="410" x2="395" y2="380" />
                  <line x1="255" y1="535" x2="345" y2="535" />
                  <line x1="262" y1="548" x2="338" y2="548" />
                  <line x1="268" y1="561" x2="332" y2="561" />
                  <line x1="274" y1="574" x2="326" y2="574" />
                </g>
                <circle cx="356" cy="436" r="14" fill="none" stroke="#B4846C" strokeWidth="1.4" strokeDasharray="3 2" opacity="0.75" />
                <circle cx="356" cy="436" r="9" fill="#B4846C" opacity="0.2" />
              </g>
            )}

            {/* STYLE 6 FRONT: EYELET LACE */}
            {wrapStyle === 'lace' && (
              <g>
                <path
                  d="M172,380 L300,468 L428,380 L356,618 Q300,630 244,618 Z"
                  fill={wrapColor}
                  stroke={shadeWrapHex(wrapColor, -35)}
                  strokeWidth="1.2"
                />
                <g stroke={shadeWrapHex(wrapColor, -55)} strokeWidth="1.2" opacity="0.35">
                  <line x1="205" y1="405" x2="256" y2="618" />
                  <line x1="238" y1="428" x2="274" y2="620" />
                  <line x1="270" y1="448" x2="290" y2="622" />
                  <line x1="300" y1="468" x2="300" y2="624" />
                  <line x1="330" y1="448" x2="310" y2="622" />
                  <line x1="362" y1="428" x2="326" y2="620" />
                  <line x1="395" y1="405" x2="344" y2="618" />
                </g>
                <path
                  d="M168,376 Q192,402 216,386 Q240,414 266,398 Q284,424 300,408 Q316,424 334,398 Q360,414 384,386 Q408,402 432,376 L402,458 Q350,482 300,472 Q250,482 198,458 Z"
                  fill="#FFFFFF"
                  stroke={shadeWrapHex(wrapColor, -35)}
                  strokeWidth="1.5"
                />
              </g>
            )}

            {/* STYLE 7 FRONT: STARLIT NOIR */}
            {wrapStyle === 'celestial' && (
              <g>
                <path
                  d="M118,272 L300,472 L250,618 L190,488 Z"
                  fill={wrapColor}
                  stroke="#F59E0B"
                  strokeWidth="2"
                />
                <path
                  d="M482,272 L300,472 L350,618 L410,488 Z"
                  fill={shadeWrapHex(wrapColor, -18)}
                  stroke="#FBBF24"
                  strokeWidth="2"
                />
                <path
                  d="M210,432 L300,482 L390,432 L346,616 Q300,628 254,616 Z"
                  fill={wrapColor}
                  stroke="#F59E0B"
                  strokeWidth="1.8"
                />
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
              </g>
            )}

            {/* STYLE 8 FRONT: CERAMIC VASE */}
            {wrapStyle === 'vase' && (
              <g>
                <path
                  d="M214,442 C152,432 152,522 204,528"
                  fill="none"
                  stroke={shadeWrapHex(wrapColor, -20)}
                  strokeWidth="14"
                  strokeLinecap="round"
                />
                <path
                  d="M214,442 C152,432 152,522 204,528"
                  fill="none"
                  stroke={shadeWrapHex(wrapColor, 14)}
                  strokeWidth="5"
                  strokeLinecap="round"
                />
                <path
                  d="M386,442 C448,432 448,522 396,528"
                  fill="none"
                  stroke={shadeWrapHex(wrapColor, -34)}
                  strokeWidth="14"
                  strokeLinecap="round"
                />
                <path
                  d="M206,408 L394,408 C382,446 426,505 384,598 L368,622 L232,622 L216,598 C174,505 218,446 206,408 Z"
                  fill={wrapColor}
                  stroke={shadeWrapHex(wrapColor, -28)}
                  strokeWidth="2"
                />
                <path
                  d="M300,408 L394,408 C382,446 426,505 384,598 L368,622 L300,622 Z"
                  fill={shadeWrapHex(wrapColor, -18)}
                  opacity="0.45"
                />
                <g stroke={shadeWrapHex(wrapColor, -34)} strokeWidth="2" fill="none" opacity="0.72">
                  <path d="M236,422 C215,485 222,555 246,612" />
                  <path d="M266,424 C254,485 258,555 272,614" />
                  <path d="M300,425 L300,615" />
                  <path d="M334,424 C346,485 342,555 328,614" />
                  <path d="M364,422 C385,485 378,555 354,612" />
                </g>
                <rect x="198" y="398" width="204" height="16" rx="8" fill={shadeWrapHex(wrapColor, 16)} stroke={shadeWrapHex(wrapColor, -28)} strokeWidth="1.8" />
                <rect x="226" y="612" width="148" height="14" rx="6" fill="#B4846C" />
              </g>
            )}

            {/* STYLE 10 FRONT: VELVET HATBOX (Parisian cylindrical velvet hatbox with gold foil label) */}
            {wrapStyle === 'hatbox' && (
              <g>
                <path
                  d="M178,405 L422,405 L412,616 Q300,636 188,616 Z"
                  fill={wrapColor}
                  stroke="#F59E0B"
                  strokeWidth="2.2"
                />
                <path
                  d="M300,405 L422,405 L412,616 Q356,626 300,626 Z"
                  fill={shadeWrapHex(wrapColor, -18)}
                  opacity="0.45"
                />
                {/* Box Lid Collar Rim */}
                <rect
                  x="170"
                  y="394"
                  width="260"
                  height="26"
                  rx="8"
                  fill={shadeWrapHex(wrapColor, -12)}
                  stroke="#FBBF24"
                  strokeWidth="2"
                />
                {/* Gold Foil Framed Atelier Plaque */}
                <rect
                  x="236"
                  y="486"
                  width="128"
                  height="64"
                  rx="8"
                  fill="#FFFDF9"
                  stroke="#F59E0B"
                  strokeWidth="2"
                />
                <rect
                  x="242"
                  y="492"
                  width="116"
                  height="52"
                  rx="5"
                  fill="none"
                  stroke="#D97706"
                  strokeWidth="0.9"
                  strokeDasharray="3 2"
                />
                <text
                  x="300"
                  y="518"
                  textAnchor="middle"
                  fill="#1C1917"
                  fontSize="12"
                  fontWeight="700"
                  style={{ fontFamily: "'Cormorant Garamond', serif", letterSpacing: '0.12em' }}
                >
                  L&apos;ATELIER FLORAL
                </text>
                <text
                  x="300"
                  y="533"
                  textAnchor="middle"
                  fill="#78716C"
                  fontSize="8.5"
                  style={{ fontFamily: "'Cormorant Garamond', serif", letterSpacing: '0.18em' }}
                >
                  PARIS · FLEURS
                </text>
              </g>
            )}

            {/* STYLE 12 FRONT: KOREAN MESH (Architectural pleated frosted tulle wrap with cinched waist) */}
            {wrapStyle === 'koreanmesh' && (
              <g>
                <path
                  d="M135,345 L286,478 L238,618 L206,488 Z"
                  fill={shadeWrapHex(wrapColor, -10)}
                  fillOpacity="0.82"
                  stroke="#FFFFFF"
                  strokeWidth="1.4"
                  strokeDasharray="4 2"
                />
                <path
                  d="M465,345 L314,478 L362,618 L394,488 Z"
                  fill={shadeWrapHex(wrapColor, -10)}
                  fillOpacity="0.82"
                  stroke="#FFFFFF"
                  strokeWidth="1.4"
                  strokeDasharray="4 2"
                />
                <path
                  d="M196,422 Q300,458 404,422 L394,488 L358,620 Q300,632 242,620 L206,488 Z"
                  fill={wrapColor}
                  fillOpacity="0.9"
                  stroke="#FFFFFF"
                  strokeWidth="1.6"
                />
                <g stroke="#FFFFFF" strokeWidth="1.1" opacity="0.6" strokeDasharray="3 3">
                  <line x1="235" y1="438" x2="262" y2="618" />
                  <line x1="278" y1="448" x2="286" y2="622" />
                  <line x1="322" y1="448" x2="314" y2="622" />
                  <line x1="365" y1="438" x2="338" y2="618" />
                </g>
              </g>
            )}
          </g>

          {/* UNIVERSAL RIBBON / LACE DESIGN (Fits every wrapper — rendered inside the glass dome for cloche!) */}
          <BouquetRibbonSVG
            ribbonStyle={ribbonStyle || 'satin'}
            ribbonColor={ribbonColor}
            wrapStyle={wrapStyle}
            isPreviewMode={isPreviewMode}
            onRibbonClick={onRibbonClick}
          />

          {/* STYLE 11 FRONT: GLASS CLOCHE (Front crystal dome glaze, concentric specular reflections & turned pedestal over stems & ribbon) */}
          {wrapStyle === 'cloche' && (
            <g
              role={isPreviewMode ? undefined : 'button'}
              aria-label={isPreviewMode ? undefined : 'Select glass cloche base to edit color'}
              onPointerDown={
                isPreviewMode
                  ? undefined
                  : (e) => {
                      e.stopPropagation();
                      selectItem(null);
                      setActiveSpecialObject(null);
                    }
              }
              onClick={
                isPreviewMode
                  ? undefined
                  : (e) => {
                      e.stopPropagation();
                      onWrapperClick?.();
                    }
              }
              className={isPreviewMode ? 'pointer-events-none' : 'cursor-pointer'}
            >
              {/* Foreground Botanical Moss Tuft Cushion Over Stem Ends */}
              <path
                d="M164,558 Q215,541 268,550 Q300,542 332,550 Q385,541 436,558 Z"
                fill="#4D7C5D"
                opacity="0.82"
                className="pointer-events-none"
              />
              <path
                d="M196,558 Q248,546 300,553 Q352,546 404,558 Z"
                fill="#659A76"
                opacity="0.65"
                className="pointer-events-none"
              />

              {/* Translucent Front Crystal Bell Jar Glaze Over Flowers & Ribbon (True Semicircular Arc A170,170) */}
              <path
                d="M130,562 L130,276 A170,170 0 0,1 470,276 L470,562 Z"
                fill="url(#clocheFrontGlassGrad)"
                stroke="#CBD5E1"
                strokeWidth="2"
                strokeOpacity="0.72"
                className="pointer-events-none"
              />

              {/* Concentric Left & Right Curved Specular Glass Highlights (Always 100% Inside the Dome!) */}
              <path
                d="M148,542 L148,276 A152,152 0 0,1 268,128"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="5.5"
                strokeLinecap="round"
                opacity="0.65"
                className="pointer-events-none"
              />
              <path
                d="M158,528 L158,276 A142,142 0 0,1 242,146"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.38"
                className="pointer-events-none"
              />
              <path
                d="M452,542 L452,276 A152,152 0 0,0 348,133"
                fill="none"
                stroke="#E0F2FE"
                strokeWidth="3.5"
                strokeLinecap="round"
                opacity="0.52"
                className="pointer-events-none"
              />

              {/* Glass Rim Seated Groove Ring */}
              <ellipse
                cx="300"
                cy="562"
                rx="170"
                ry="16"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="1.8"
                opacity="0.6"
                className="pointer-events-none"
              />

              {/* Multi-Tiered Turned Pedestal Base (Responds to wrapColor with warm brass molding) */}
              <ellipse
                cx="300"
                cy="565"
                rx="180"
                ry="20"
                fill={shadeWrapHex(wrapColor, 8)}
                stroke={shadeWrapHex(wrapColor, -42)}
                strokeWidth="2"
              />
              <path
                d="M120,565 L480,565 L468,596 Q300,616 132,596 Z"
                fill={shadeWrapHex(wrapColor, -18)}
                stroke={shadeWrapHex(wrapColor, -52)}
                strokeWidth="2"
              />
              {/* Turned Lower Plinth Foot */}
              <path
                d="M136,595 Q300,614 464,595 L472,608 Q300,628 128,608 Z"
                fill={shadeWrapHex(wrapColor, -34)}
                stroke={shadeWrapHex(wrapColor, -62)}
                strokeWidth="1.8"
              />
              {/* Subtle Gold Inlay Line Along Pedestal Waist */}
              <path
                d="M128,582 Q300,601 472,582"
                fill="none"
                stroke="#FDE68A"
                strokeWidth="1.1"
                opacity="0.55"
              />

              {/* Antique Brass Atelier Plaque with Corner Rivets */}
              <rect
                x="248"
                y="578"
                width="104"
                height="20"
                rx="5"
                fill="#FEF3C7"
                stroke="#B45309"
                strokeWidth="1.3"
              />
              <circle cx="255" cy="588" r="1.3" fill="#B45309" />
              <circle cx="345" cy="588" r="1.3" fill="#B45309" />
              <text
                x="300"
                y="591"
                textAnchor="middle"
                fill="#78350F"
                fontSize="7.5"
                fontWeight="600"
                style={{ fontFamily: "'Cormorant Garamond', serif", letterSpacing: '0.18em' }}
              >
                FLEURS · ATELIER
              </text>
            </g>
          )}
        </g>

        {/* 4A. UNCLIPPED PHOTO ATTACHMENTS LAYER (Floating over the bouquet wrapper by default, not clipped by wrapper or stem bounds) */}
        <g>
          {(bloomedCount !== undefined ? items.slice(0, bloomedCount) : items).map((item) => {
            if (item.hidden || !item.photoStyle || item.clippedToBouquet) return null;
            const isSelected = !isPreviewMode && item.id === selectedId;
            const disp = getStageItemDisplayTransform(item, wrapStyle);
            return (
              <g
                key={item.id}
                transform={`translate(${disp.x}, ${disp.y}) rotate(${disp.rotation}) scale(${
                  item.flipX ? -disp.scale : disp.scale
                }, ${disp.scale})`}
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
                  <circle cx="0" cy="-10" r="48" fill="transparent" />
                  <BouquetPhotoCardSVG item={item} />
                </g>
              </g>
            );
          })}
        </g>
        </g>

        {/* 4B. BOUQUET SELECTION RING & RESIZE/ROTATE GIZMOS (When Bouquet Wrapper is clicked/dragged) */}
        {!isPreviewMode &&
          !selectedItem &&
          (activeSpecialObject === 'bouquet' ||
            interaction?.mode === 'move-bouquet' ||
            interaction?.mode === 'resize-bouquet') && (() => {
            const ringRadius = Math.max(125, Math.min(235, 185 * pose.scale));
            return (
              <g
                data-export-ignore="true"
                transform={`translate(${pose.x}, ${pose.y})`}
              >
                <circle
                  cx="0"
                  cy="0"
                  r={ringRadius}
                  fill="none"
                  stroke="#B4846C"
                  strokeWidth="1.6"
                  strokeDasharray="7 5"
                  opacity="0.85"
                  className="pointer-events-none"
                />

                {/* TOP-LEFT HANDLE (-135°): Reset Bouquet Pose */}
                <g
                  transform={`translate(${Math.cos((-3 * Math.PI) / 4) * ringRadius}, ${
                    Math.sin((-3 * Math.PI) / 4) * ringRadius
                  })`}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    resetBouquetPose();
                  }}
                  className="cursor-pointer select-none"
                  role="button"
                  aria-label="Reset bouquet position, size, and tilt"
                >
                  <title>Reset bouquet position, size &amp; tilt</title>
                  <circle cx="0" cy="0" r="22" fill="transparent" />
                  <circle cx="0" cy="0" r="12" fill="#ffffff" stroke="#B4846C" strokeWidth="1.8" />
                  <path
                    d="M-3.5,0 A3.5,3.5 0 1,1 2.5,-2.5 M2.5,-5 L2.5,-2 L-0.5,-2"
                    stroke="#1C1917"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </g>

                {/* TOP-RIGHT HANDLE (-45°): Toggle Wrapper Visibility */}
                <g
                  transform={`translate(${Math.cos(-Math.PI / 4) * ringRadius}, ${
                    Math.sin(-Math.PI / 4) * ringRadius
                  })`}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    toggleWrapVisibility();
                    setActiveSpecialObject(null);
                  }}
                  className="cursor-pointer select-none"
                  role="button"
                  aria-label="Toggle bouquet wrapper visibility"
                >
                  <title>Hide or show bouquet wrapper</title>
                  <circle cx="0" cy="0" r="24" fill="transparent" />
                  <circle cx="0" cy="0" r="13" fill="#e11d48" stroke="#ffffff" strokeWidth="2" />
                  <path
                    d="M-4,-4 L4,4 M4,-4 L-4,4"
                    stroke="#ffffff"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </g>

                {/* BOTTOM-LEFT HANDLE (+135°): Pull In / Pull Out to Resize & Rotate Entire Bouquet (Clear of Greeting Card on Bottom-Right) */}
                <g
                  transform={`translate(${Math.cos((3 * Math.PI) / 4) * ringRadius}, ${
                    Math.sin((3 * Math.PI) / 4) * ringRadius
                  })`}
                  onPointerDown={handleBouquetResizePointerDown}
                  className="cursor-nesw-resize select-none"
                  role="slider"
                  aria-label="Pull in or out to resize and rotate bouquet"
                  aria-valuenow={Math.round(pose.scale * 100)}
                >
                  <title>Drag corner to resize and rotate bouquet</title>
                  <circle
                    cx="0"
                    cy="0"
                    r={interaction?.mode === 'resize-bouquet' ? 20 : 16}
                    fill="#B4846C"
                    opacity={interaction?.mode === 'resize-bouquet' ? 0.28 : 0.15}
                    className="pointer-events-none"
                  />
                  <circle cx="0" cy="0" r="24" fill="transparent" />
                  <circle
                    cx="0"
                    cy="0"
                    r="14"
                    fill={interaction?.mode === 'resize-bouquet' ? '#B4846C' : '#1C1917'}
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                  <path
                    d="M-4.5,-4.5 L4.5,4.5 M-4.5,-1 L-4.5,-4.5 L-1,-4.5 M4.5,1 L4.5,4.5 L1,4.5"
                    stroke="#ffffff"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  <g transform="translate(0, 26)" className="pointer-events-none">
                    <rect
                      x="-58"
                      y="-9"
                      width="116"
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
                      fontSize="9.2"
                      fontWeight="600"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      {interaction?.mode === 'resize-bouquet'
                        ? `Bouquet ${Math.round(pose.scale * 100)}% · ${pose.rotation}°`
                        : '⤡ Resize / tilt bouquet'}
                    </text>
                  </g>
                </g>
              </g>
            );
          })()}

        {/* 5. DRAGGABLE, ROTATABLE & RESIZABLE GREETING CARD ON BOUQUET */}
        {card.visibleOnStage && showCardInGiftView && (() => {
          const cardPalette = getCardThemePalette(card.theme, card.customBg, card.customAccent);
          const cardX = card.x ?? 410;
          const cardY = card.y ?? 525;
          const cardScale = card.scale ?? 0.72;
          const cardRotation = card.rotation ?? 0;
          const isUnopenedEnvelope = card.theme === 'sealed';
          const isCardSelected =
            !isPreviewMode &&
            (activeSpecialObject === 'card' ||
              interaction?.mode === 'move-card' ||
              interaction?.mode === 'resize-card');
          const wrappedMessageLines = !isUnopenedEnvelope
            ? wrapCardCanvasLines(card.message, 25, 4)
            : [];
          return (
            <g
              transform={`translate(${cardX}, ${cardY})`}
              style={{
                filter: isCardSelected
                  ? 'drop-shadow(0px 8px 14px rgba(180,132,108,0.35))'
                  : 'url(#softShadow)',
                outline: 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {/* Inner Rotated & Scaled Card Group centered around (0, 0) */}
              <g transform={`rotate(${cardRotation}) scale(${cardScale})`}>
                <g
                  aria-label={isPreviewMode ? 'Open greeting card letter' : 'Drag, resize, rotate, or edit greeting card'}
                  onPointerDown={isPreviewMode ? undefined : handleCardPointerDown}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isPreviewMode) {
                      onCardTagClick?.();
                    }
                  }}
                  style={{
                    outline: 'none',
                    WebkitTapHighlightColor: 'transparent',
                    WebkitTouchCallout: 'none',
                  }}
                  className={
                    isPreviewMode
                      ? 'bouquet-card-wiggle cursor-pointer select-none outline-none focus:outline-none'
                      : 'cursor-grab active:cursor-grabbing select-none outline-none focus:outline-none'
                  }
                >
                  {/* Generous touch hit target matching flower hit ergonomics */}
                  <circle cx="0" cy="0" r="68" fill="transparent" />

                  {/* Translate (-1, -12) centers all BouquetCardShapeSVG paths (which span x:-85..88, y:-44..68) around (0, 0) */}
                  <g transform="translate(-1, -12)" className={isPreviewMode ? '' : 'pointer-events-none'}>
                    <BouquetCardShapeSVG theme={card.theme} palette={cardPalette} />

                    {/* Only render open message text when NOT using the unopened 'sealed' envelope style */}
                    {!isUnopenedEnvelope && (
                      <>
                        <text
                          x="-46"
                          y="-18"
                          fill={cardPalette.title}
                          fontSize="12"
                          fontWeight="600"
                          className="pointer-events-none"
                          style={{ fontFamily: "'Cormorant Garamond', serif" }}
                        >
                          {card.to.slice(0, 22)}
                        </text>

                        <text
                          x="-68"
                          y="-2"
                          fill={cardPalette.body}
                          fontSize="12.2"
                          className="pointer-events-none"
                          style={{ fontFamily: "'Cormorant Garamond', serif" }}
                        >
                          {wrappedMessageLines.map((line, idx) => (
                            <tspan key={idx} x="-68" dy={idx === 0 ? 0 : 13.5}>
                              {line}
                            </tspan>
                          ))}
                        </text>

                        <text
                          x="72"
                          y="58"
                          textAnchor="end"
                          fill={cardPalette.sign}
                          fontSize="11"
                          fontWeight="500"
                          fontStyle="italic"
                          className="pointer-events-none"
                          style={{ fontFamily: "'Cormorant Garamond', serif" }}
                        >
                          {card.from ? `— ${card.from.slice(0, 20)}` : ''}
                        </text>
                      </>
                    )}
                  </g>

                  {/* Top-most unified transparent hit surface centered around (0, 0) */}
                  <rect x="-94" y="-64" width="188" height="128" rx="16" fill="transparent" />

                  {/* Recipient "Open letter" / "Read note" badge in Preview Mode */}
                  {isPreviewMode && (
                    <g data-export-ignore="true" transform="translate(0, -68)">
                      <rect
                        x="-42"
                        y="-11"
                        width="84"
                        height="21"
                        rx="10.5"
                        fill={cardPalette.seal}
                        stroke="#FFFDF9"
                        strokeWidth="1"
                      />
                      <text
                        x="0"
                        y="3"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="9.5"
                        fontWeight="600"
                        style={{ fontFamily: "'Inter', sans-serif", letterSpacing: '0.02em' }}
                      >
                        {isUnopenedEnvelope ? 'Open letter' : 'Read note'}
                      </text>
                    </g>
                  )}
                </g>
              </g>

              {/* Upright Editor "✏️ Write note" Pill (stays upright even when card is rotated) */}
              {!isPreviewMode && (
                <g
                  data-export-ignore="true"
                  data-drawer-trigger="true"
                  transform={`translate(0, ${Math.round(-54 * cardScale - 14)})`}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSpecialObject('card');
                    onCardTagClick?.();
                  }}
                  style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
                  className="cursor-pointer select-none outline-none focus:outline-none"
                >
                  <rect
                    x="-42"
                    y="-11"
                    width="84"
                    height="20"
                    rx="10"
                    fill="#1C1917"
                    stroke="#ffffff"
                    strokeWidth="1"
                  />
                  <text
                    x="0"
                    y="2.5"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="9.2"
                    fontWeight="600"
                    style={{ fontFamily: "'Inter', sans-serif", letterSpacing: '0.02em' }}
                  >
                    ✏️ Write note
                  </text>
                </g>
              )}
            </g>
          );
        })()}

        {/* 5B. DRAGGABLE, ROTATABLE & RESIZABLE ROMANTIC VOICE KEEPSAKE ON BOUQUET */}
        {voice?.visibleOnStage && (() => {
          const voiceX = voice.x ?? 185;
          const voiceY = voice.y ?? 525;
          const voiceScale = voice.scale ?? 1.0;
          const voiceRotation = voice.rotation ?? 0;
          const isVoiceSelected =
            !isPreviewMode &&
            (activeSpecialObject === 'voice' ||
              interaction?.mode === 'move-voice' ||
              interaction?.mode === 'resize-voice');
          return (
            <g
              transform={`translate(${voiceX}, ${voiceY})`}
              style={{
                filter: isVoiceSelected
                  ? 'drop-shadow(0px 8px 14px rgba(180,132,108,0.35))'
                  : 'url(#softShadow)',
                outline: 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <g transform={`rotate(${voiceRotation}) scale(${voiceScale})`}>
                <g
                  aria-label={
                    isPreviewMode
                      ? isVoicePlaying
                        ? 'Pause voice keepsake'
                        : 'Play voice keepsake'
                      : 'Drag, resize, rotate, or edit voice keepsake'
                  }
                  onPointerDown={isPreviewMode ? undefined : handleVoicePointerDown}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isPreviewMode) {
                      onVoiceKeepsakeClick?.();
                    }
                  }}
                  style={{
                    outline: 'none',
                    WebkitTapHighlightColor: 'transparent',
                    WebkitTouchCallout: 'none',
                  }}
                  className={
                    isPreviewMode
                      ? 'cursor-pointer select-none outline-none focus:outline-none'
                      : 'cursor-grab active:cursor-grabbing select-none outline-none focus:outline-none'
                  }
                >
                  {/* Generous touch hit target matching flower hit ergonomics */}
                  <circle cx="0" cy="0" r="58" fill="transparent" />
                  <g className={isPreviewMode ? '' : 'pointer-events-none'}>
                    <BouquetVoiceKeepsakeSVG voice={voice} isPlaying={isVoicePlaying} />
                  </g>

                  {/* Top-most unified transparent hit surface so dragging from anywhere on the voice keepsake is effortless */}
                  <rect x="-74" y="-60" width="148" height="122" rx="16" fill="transparent" />

                  {/* Recipient Top-Right Play/Pause Icon Button in Preview/Gift Mode */}
                  {isPreviewMode && (
                    <g data-export-ignore="true" transform="translate(46, -38)">
                      <circle cx="0" cy="0" r="22" fill="transparent" />
                      <circle
                        cx="0"
                        cy="0"
                        r="13"
                        fill={isVoicePlaying ? '#e11d48' : '#1C1917'}
                        stroke="#ffffff"
                        strokeWidth="1.6"
                      />
                      {isVoicePlaying ? (
                        <g fill="#ffffff">
                          <rect x="-3.5" y="-4.5" width="2.4" height="9" rx="0.8" />
                          <rect x="1.1" y="-4.5" width="2.4" height="9" rx="0.8" />
                        </g>
                      ) : (
                        <polygon points="-2.5,-4.8 5.2,0 -2.5,4.8" fill="#ffffff" />
                      )}
                    </g>
                  )}
                </g>
              </g>

              {/* Upright Editor Record/Saved Pill in Editor Mode */}
              {!isPreviewMode && (
                <g
                  data-export-ignore="true"
                  data-drawer-trigger="true"
                  transform={`translate(0, ${Math.round(-48 * voiceScale - 14)})`}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSpecialObject('voice');
                    onVoiceKeepsakeClick?.();
                  }}
                  style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
                  className="cursor-pointer select-none outline-none focus:outline-none"
                >
                  <rect
                    x="-46"
                    y="-11"
                    width="92"
                    height="20"
                    rx="10"
                    fill={isVoicePlaying ? '#e11d48' : '#1C1917'}
                    stroke="#ffffff"
                    strokeWidth="1"
                  />
                  <text
                    x="0"
                    y="2.5"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="9.2"
                    fontWeight="600"
                    style={{ fontFamily: "'Inter', sans-serif", letterSpacing: '0.02em' }}
                  >
                    {isVoicePlaying
                      ? '⏸ Playing...'
                      : voice.audioDataUrl
                      ? '✓ Voice saved'
                      : '🎙️ Tap to record'}
                  </text>
                </g>
              )}
            </g>
          );
        })()}

        {/* 5C. CORNER CONTROLS (STRAIGHTEN, HIDE X & PULL-IN/OUT RESIZE+ROTATE) FOR GREETING CARD — NO FOCUS/OUTLINE RING */}
        {!isPreviewMode &&
          card.visibleOnStage &&
          showCardInGiftView &&
          (activeSpecialObject === 'card' ||
            interaction?.mode === 'move-card' ||
            interaction?.mode === 'resize-card') && (() => {
            const cardX = card.x ?? 410;
            const cardY = card.y ?? 525;
            const cardScale = card.scale ?? 0.72;
            const cardRotation = card.rotation ?? 0;
            const ringRadius = 72 * cardScale;
            return (
              <g
                data-export-ignore="true"
                transform={`translate(${cardX}, ${cardY})`}
              >
                {/* TOP-LEFT HANDLE (-135°): Straighten / Reset Tilt to 0° */}
                <g
                  transform={`translate(${Math.cos((-3 * Math.PI) / 4) * ringRadius}, ${
                    Math.sin((-3 * Math.PI) / 4) * ringRadius
                  })`}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    commitHistorySnapshot();
                    updateCard({ rotation: 0 });
                  }}
                  style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
                  className="cursor-pointer select-none outline-none focus:outline-none"
                  role="button"
                  aria-label="Straighten greeting card rotation"
                >
                  <title>Reset card tilt to 0°</title>
                  <circle cx="0" cy="0" r="22" fill="transparent" />
                  <circle cx="0" cy="0" r="12" fill="#ffffff" stroke="#B4846C" strokeWidth="1.8" />
                  <path
                    d="M-3.5,0 A3.5,3.5 0 1,1 2.5,-2.5 M2.5,-5 L2.5,-2 L-0.5,-2"
                    stroke="#1C1917"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </g>

                {/* TOP-RIGHT HANDLE (-45°): Hide Card Button */}
                <g
                  transform={`translate(${Math.cos(-Math.PI / 4) * ringRadius}, ${
                    Math.sin(-Math.PI / 4) * ringRadius
                  })`}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    updateCard({ visibleOnStage: false });
                    setActiveSpecialObject(null);
                  }}
                  style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
                  className="cursor-pointer select-none outline-none focus:outline-none"
                  role="button"
                  aria-label="Hide greeting card from canvas"
                >
                  <title>Hide card from canvas</title>
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
                  transform={`translate(${Math.cos(Math.PI / 4) * ringRadius}, ${
                    Math.sin(Math.PI / 4) * ringRadius
                  })`}
                  onPointerDown={handleCardResizePointerDown}
                  style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
                  className="cursor-nwse-resize select-none outline-none focus:outline-none"
                  role="slider"
                  aria-label="Pull in or out to resize greeting card"
                  aria-valuenow={Math.round(cardScale * 100)}
                >
                  <title>Drag corner to resize and rotate card</title>
                  <circle
                    cx="0"
                    cy="0"
                    r={interaction?.mode === 'resize-card' ? 20 : 16}
                    fill="#B4846C"
                    opacity={interaction?.mode === 'resize-card' ? 0.28 : 0.15}
                    className="pointer-events-none"
                  />
                  <circle cx="0" cy="0" r="24" fill="transparent" />
                  <circle
                    cx="0"
                    cy="0"
                    r="14"
                    fill={interaction?.mode === 'resize-card' ? '#B4846C' : '#1C1917'}
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                  <path
                    d="M-4.5,-4.5 L4.5,4.5 M-4.5,-1 L-4.5,-4.5 L-1,-4.5 M4.5,1 L4.5,4.5 L1,4.5"
                    stroke="#ffffff"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
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
                      {interaction?.mode === 'resize-card'
                        ? `${Math.round(cardScale * 100)}% · ${cardRotation}°`
                        : '⤡ Pull in/out to resize'}
                    </text>
                  </g>
                </g>
              </g>
            );
          })()}

        {/* 5D. CORNER CONTROLS (STRAIGHTEN, HIDE X & PULL-IN/OUT RESIZE+ROTATE) FOR VOICE KEEPSAKE — NO FOCUS/OUTLINE RING */}
        {!isPreviewMode &&
          voice?.visibleOnStage &&
          (activeSpecialObject === 'voice' ||
            interaction?.mode === 'move-voice' ||
            interaction?.mode === 'resize-voice') && (() => {
            const voiceX = voice.x ?? 185;
            const voiceY = voice.y ?? 525;
            const voiceScale = voice.scale ?? 1.0;
            const voiceRotation = voice.rotation ?? 0;
            const ringRadius = 62 * voiceScale;
            return (
              <g
                data-export-ignore="true"
                transform={`translate(${voiceX}, ${voiceY})`}
              >
                {/* TOP-LEFT HANDLE (-135°): Straighten / Reset Tilt to 0° */}
                <g
                  transform={`translate(${Math.cos((-3 * Math.PI) / 4) * ringRadius}, ${
                    Math.sin((-3 * Math.PI) / 4) * ringRadius
                  })`}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    commitHistorySnapshot();
                    updateVoice({ rotation: 0 });
                  }}
                  style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
                  className="cursor-pointer select-none outline-none focus:outline-none"
                  role="button"
                  aria-label="Straighten voice keepsake rotation"
                >
                  <title>Reset keepsake tilt to 0°</title>
                  <circle cx="0" cy="0" r="22" fill="transparent" />
                  <circle cx="0" cy="0" r="12" fill="#ffffff" stroke="#B4846C" strokeWidth="1.8" />
                  <path
                    d="M-3.5,0 A3.5,3.5 0 1,1 2.5,-2.5 M2.5,-5 L2.5,-2 L-0.5,-2"
                    stroke="#1C1917"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </g>

                {/* TOP-RIGHT HANDLE (-45°): Hide Voice Keepsake Button */}
                <g
                  transform={`translate(${Math.cos(-Math.PI / 4) * ringRadius}, ${
                    Math.sin(-Math.PI / 4) * ringRadius
                  })`}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    updateVoice({ visibleOnStage: false });
                    setActiveSpecialObject(null);
                  }}
                  style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
                  className="cursor-pointer select-none outline-none focus:outline-none"
                  role="button"
                  aria-label="Hide voice keepsake from canvas"
                >
                  <title>Hide voice keepsake from canvas</title>
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
                  transform={`translate(${Math.cos(Math.PI / 4) * ringRadius}, ${
                    Math.sin(Math.PI / 4) * ringRadius
                  })`}
                  onPointerDown={handleVoiceResizePointerDown}
                  style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
                  className="cursor-nwse-resize select-none outline-none focus:outline-none"
                  role="slider"
                  aria-label="Pull in or out to resize voice keepsake"
                  aria-valuenow={Math.round(voiceScale * 100)}
                >
                  <title>Drag corner to resize and rotate voice keepsake</title>
                  <circle
                    cx="0"
                    cy="0"
                    r={interaction?.mode === 'resize-voice' ? 20 : 16}
                    fill="#B4846C"
                    opacity={interaction?.mode === 'resize-voice' ? 0.28 : 0.15}
                    className="pointer-events-none"
                  />
                  <circle cx="0" cy="0" r="24" fill="transparent" />
                  <circle
                    cx="0"
                    cy="0"
                    r="14"
                    fill={interaction?.mode === 'resize-voice' ? '#B4846C' : '#1C1917'}
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                  <path
                    d="M-4.5,-4.5 L4.5,4.5 M-4.5,-1 L-4.5,-4.5 L-1,-4.5 M4.5,1 L4.5,4.5 L1,4.5"
                    stroke="#ffffff"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
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
                      {interaction?.mode === 'resize-voice'
                        ? `${Math.round(voiceScale * 100)}% · ${voiceRotation}°`
                        : '⤡ Pull in/out to resize'}
                    </text>
                  </g>
                </g>
              </g>
            );
          })()}

        {/* 6. INTERACTIVE SELECTION RING, WORKING DELETE (X) BUTTON & PULL-IN/OUT RESIZE HANDLE (Inside Bouquet Transform Space) */}
        {!isPreviewMode && selectedItem && selectedDisplay && !selectedItem.hidden && (
          <g data-export-ignore="true" transform={bouquetTransform}>
          <g
            transform={`translate(${selectedDisplay.x}, ${selectedDisplay.y})`}
          >
            {/* Outer Selection Ring */}
            <circle
              cx="0"
              cy="0"
              r={58 * selectedDisplay.scale}
              fill="none"
              stroke={selectedItem.locked ? '#d97706' : '#B4846C'}
              strokeWidth="1.75"
              strokeDasharray={selectedItem.locked ? '4 4' : '6 5'}
              className="pointer-events-none"
            />

            {/* On-Canvas Upload Photo Pill for Selected Photocard */}
            {selectedItem.photoStyle && !selectedItem.locked && onPhotoCardUploadClick && (
              <g
                transform={`translate(0, ${-58 * selectedDisplay.scale - 16})`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onPhotoCardUploadClick(selectedItem.id);
                }}
                className="cursor-pointer select-none"
                role="button"
                aria-label="Upload photo for photocard"
              >
                <rect
                  x="-48"
                  y="-11"
                  width="96"
                  height="21"
                  rx="10.5"
                  fill="#1C1917"
                  stroke="#ffffff"
                  strokeWidth="1.2"
                />
                <text
                  x="0"
                  y="3"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="9.2"
                  fontWeight="600"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {selectedItem.photoDataUrl ? 'Change photo' : 'Upload photo'}
                </text>
              </g>
            )}

            {selectedItem.locked ? (
              /* Locked Indicator Pill on Ring Top — Tap to Unlock */
              <g
                transform={`translate(0, ${-58 * selectedDisplay.scale - 14})`}
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
                  Locked · Tap to unlock
                </text>
              </g>
            ) : (
              <>
                {/* TOP-LEFT HANDLE (-135°): Quick Flip Button */}
                <g
                  transform={`translate(${Math.cos((-3 * Math.PI) / 4) * 58 * selectedDisplay.scale}, ${
                    Math.sin((-3 * Math.PI) / 4) * 58 * selectedDisplay.scale
                  })`}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    flipSelected();
                  }}
                  className="cursor-pointer"
                  role="button"
                  aria-label="Flip flower horizontally"
                >
                  <title>Flip horizontally</title>
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
                  transform={`translate(${Math.cos(-Math.PI / 4) * 58 * selectedDisplay.scale}, ${
                    Math.sin(-Math.PI / 4) * 58 * selectedDisplay.scale
                  })`}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    deleteSelected();
                  }}
                  className="cursor-pointer"
                  role="button"
                  aria-label="Delete selected flower"
                >
                  <title>Remove item</title>
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
                  transform={`translate(${Math.cos(Math.PI / 4) * 58 * selectedDisplay.scale}, ${
                    Math.sin(Math.PI / 4) * 58 * selectedDisplay.scale
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
          </g>
        )}
      </svg>

      {/* Screen-reader only status when canvas has 0 stems (Visual 'Start arranging' card removed per user request) */}
      {items.length === 0 && !isPreviewMode && (
        <span className="sr-only">
          Start arranging — Add flowers from the palette, or try a random arrangement.
        </span>
      )}
    </div>
  );
};

// ============================================================================

/**
 * Gentle Falling Petals Overlay for Read-Only Gift View
 */
export const FallingPetalsOverlay: React.FC<{ items: BouquetItem[] }> = ({ items }) => {
  const petals = useMemo(() => {
    const paletteColors =
      items.length > 0
        ? items.map((i) => i.petalColor)
        : ['#fb7185', '#f472b6', '#fda4af', '#fbcfe8', '#c4b5fd'];
    return Array.from({ length: 16 }, (_, idx) => ({
      id: idx,
      left: `${(idx * 6.2 + (idx % 3) * 3) % 96}%`,
      delay: `${(idx * 0.75) % 9}s`,
      duration: `${9.2 + (idx % 5) * 1.8}s`,
      size: 11 + (idx % 4) * 3.5,
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
            opacity: 0.72;
          }
          50% {
            transform: translate3d(24px, 48vh, 0) rotate(165deg);
            opacity: 0.68;
          }
          88% {
            opacity: 0.58;
          }
          100% {
            transform: translate3d(-18px, 102vh, 0) rotate(340deg);
            opacity: 0;
          }
        }
        @keyframes dofStageForegroundLeft {
          0%, 100% {
            transform: translate3d(0px, 0px, 0) rotate(-16deg) scale(1.04);
          }
          50% {
            transform: translate3d(14px, -26px, 0) rotate(-8deg) scale(1.09);
          }
        }
        @keyframes dofStageForegroundRight {
          0%, 100% {
            transform: translate3d(0px, 0px, 0) rotate(22deg) scale(1.1);
          }
          50% {
            transform: translate3d(-16px, 28px, 0) rotate(12deg) scale(1.04);
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
            fillOpacity="0.76"
          />
        </svg>
      ))}
    </div>
  );
};

