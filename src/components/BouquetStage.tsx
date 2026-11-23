import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  CardTheme,
  CardThemePalette,
  RibbonStyle,
  VoiceKeepsakeData,
  typeWrapStyle,
  BouquetItem,
  getEffectiveItemPlane,
  getStageItemDisplayTransform,
  BouquetSnapshot,
  GreetingCardData,
  FLOWER_CATALOG,
  PhotoFrameStyle,
  PHOTO_FRAME_CATALOG,
  CanvasEnvironment,
  DEFAULT_BOUQUET_POSE,
  getCardThemePalette,
} from '../types/bouquet';
import { FlowerRenderer } from './flowers/FlowerRenderer';
import { useBouquetStore } from '../store/useBouquetStore';
import {
  buildBouquetBloomPlan,
  evaluateWrapperReveal,
  evaluateKeepsakeReveal,
  evaluateStemFrame,
  createZeroRustleState,
  applyPointerRustleImpulse,
  stepRustlePhysics,
  formatPivotMotionTransform,
  computeHandTiedStemGeometry,
  computeClocheStemGeometry,
  LIVING_BREEZE_FRAME_INTERVAL_MS,
  RUSTLE_POINTER_THROTTLE_MS,
  type StemRustleState,
} from '../lib/bouquetBloomPhysics';
import { getEnvironmentPageBackdrop } from '../lib/environmentBackdrop';
import {
  STAGE_DRAG_MIN_X,
  STAGE_DRAG_MAX_X,
  STAGE_DRAG_MIN_Y,
  STAGE_DRAG_MAX_Y,
  svgToBouquetLocalCoords as mapSvgToBouquetLocal,
  clampBouquetLocalPointToStage,
  computeWrapperTuckedStemLength,
} from '../lib/stageCanvasBounds';

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
  hatbox:         { waistY: 428, halfW: 121, tailBottomY: 480, bowScale: 0.88 },
  cloche:         { waistY: 484, halfW: 32,  tailBottomY: 544, bowScale: 0.78 },
  koreanmesh:     { waistY: 488, halfW: 94,  tailBottomY: 610, bowScale: 1.0 },
  waxPaper:       { waistY: 500, halfW: 68,  tailBottomY: 614, bowScale: 0.96 },
  crepeFan:       { waistY: 486, halfW: 70,  tailBottomY: 604, bowScale: 0.96 },
  burlapSack:     { waistY: 502, halfW: 86,  tailBottomY: 612, bowScale: 0.98 },
  abacaMesh:      { waistY: 488, halfW: 84,  tailBottomY: 614, bowScale: 1.02 },
  snowNet:        { waistY: 492, halfW: 82,  tailBottomY: 614, bowScale: 1.0 },
  pearlTulle:     { waistY: 486, halfW: 84,  tailBottomY: 610, bowScale: 1.0 },
  ginghamLace:    { waistY: 496, halfW: 82,  tailBottomY: 612, bowScale: 0.98 },
  corsetSilk:     { waistY: 498, halfW: 72,  tailBottomY: 610, bowScale: 0.94 },
  chinoiserieUrn: { waistY: 438, halfW: 86,  tailBottomY: 540, bowScale: 0.92 },
};

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

      {/* 11. AKOYA PEARL STRAND & 24K GOLD STARBURST BROOCH ('pearlStrand') */}
      {ribbonStyle === 'pearlStrand' && (
        <g>
          {/* Draped Double Akoya Pearl Waist Strands */}
          <path
            d={`M${leftX},${waistY - 6} Q300,${waistY + 18} ${rightX},${waistY - 6}`}
            fill="none"
            stroke="#FFFDF9"
            strokeWidth="7.5"
            strokeDasharray="1 10.5"
            strokeLinecap="round"
          />
          <path
            d={`M${leftX + 3},${waistY + 4} Q300,${waistY + 32} ${rightX - 3},${waistY + 4}`}
            fill="none"
            stroke="#FDF4E7"
            strokeWidth="6.2"
            strokeDasharray="1 9.5"
            strokeLinecap="round"
          />
          {/* Fine Gold Chain Underlay */}
          <path
            d={`M${leftX},${waistY - 6} Q300,${waistY + 18} ${rightX},${waistY - 6} M${leftX + 3},${waistY + 4} Q300,${waistY + 32} ${rightX - 3},${waistY + 4}`}
            fill="none"
            stroke="#F59E0B"
            strokeWidth="1.2"
            opacity="0.7"
          />
          <g transform={bowTransform}>
            {/* Cascading Pearl Tassel Tails */}
            <path
              d={`M290,${waistY + 8} Q268,${waistY + 58} 252,${tailBottomY - 6}`}
              fill="none"
              stroke="#FFFDF9"
              strokeWidth="5.8"
              strokeDasharray="1 9"
              strokeLinecap="round"
            />
            <path
              d={`M310,${waistY + 8} Q332,${waistY + 58} 348,${tailBottomY - 6}`}
              fill="none"
              stroke="#FFFDF9"
              strokeWidth="5.8"
              strokeDasharray="1 9"
              strokeLinecap="round"
            />
            {/* Teardrop Pearl Drops at Ends */}
            <circle cx="252" cy={tailBottomY - 2} r="5" fill="#FFFDF9" stroke="#F59E0B" strokeWidth="1.2" />
            <circle cx="348" cy={tailBottomY - 2} r="5" fill="#FFFDF9" stroke="#F59E0B" strokeWidth="1.2" />
            {/* 24k Gold & Mother-of-Pearl Starburst Brooch */}
            <circle cx="300" cy={waistY + 5} r="16" fill={ribbonColor} stroke="#F59E0B" strokeWidth="2.2" />
            <circle cx="300" cy={waistY + 5} r="12" fill="none" stroke="#FDE68A" strokeWidth="1.1" strokeDasharray="2.5 2" />
            <path
              d={`M300,${waistY - 15} L303.5,${waistY + 1.5} L320,${waistY + 5} L303.5,${waistY + 8.5} L300,${waistY + 25} L296.5,${waistY + 8.5} L280,${waistY + 5} L296.5,${waistY + 1.5} Z`}
              fill="#FDE68A"
              stroke="#D97706"
              strokeWidth="0.9"
            />
            <circle cx="300" cy={waistY + 5} r="5.2" fill="#FFFFFF" stroke="#F59E0B" strokeWidth="1.2" />
          </g>
        </g>
      )}

      {/* 12. CELESTIAL STARLIGHT SILK & CRYSTAL PRISM DROPS ('celestialSilk') */}
      {ribbonStyle === 'celestialSilk' && (
        <g>
          {/* Shimmering Gold-Edged Silk Waistband */}
          <path
            d={`M${leftX},${waistY - 7} Q300,${waistY + 8} ${rightX},${waistY - 7} L${rightX - 3},${waistY + 10} Q300,${waistY + 25} ${leftX + 3},${waistY + 10} Z`}
            fill={ribbonColor}
            fillOpacity="0.88"
            stroke="#F59E0B"
            strokeWidth="1.6"
          />
          <path
            d={`M${leftX + 4},${waistY + 1} Q300,${waistY + 16} ${rightX - 4},${waistY + 1}`}
            fill="none"
            stroke="#FEF08A"
            strokeWidth="1.1"
            strokeDasharray="4 3"
          />
          <g transform={bowTransform}>
            {/* Billowing Iridescent Silk Tails with Gold Filigree Trim */}
            <path
              d={`M295,${waistY + 7} C270,${waistY + 46} 242,${waistY + 84} 228,${tailBottomY + 8} L258,${tailBottomY - 4} L266,${tailBottomY + 12} C278,${waistY + 76} 292,${waistY + 42} 300,${waistY + 9} Z`}
              fill={ribbonColor}
              fillOpacity="0.85"
              stroke="#F59E0B"
              strokeWidth="1.4"
            />
            <path
              d={`M305,${waistY + 7} C330,${waistY + 46} 358,${waistY + 84} 372,${tailBottomY + 8} L342,${tailBottomY - 4} L334,${tailBottomY + 12} C322,${waistY + 76} 308,${waistY + 42} 300,${waistY + 9} Z`}
              fill={ribbonColor}
              fillOpacity="0.85"
              stroke="#F59E0B"
              strokeWidth="1.4"
            />
            {/* Grand Double Winged Bow Loops */}
            <path
              d={`M296,${waistY + 3} C218,${waistY - 48} 206,${waistY + 36} 294,${waistY + 11} Z`}
              fill={ribbonColor}
              stroke="#FDE68A"
              strokeWidth="1.8"
            />
            <path
              d={`M304,${waistY + 3} C382,${waistY - 48} 394,${waistY + 36} 306,${waistY + 11} Z`}
              fill={ribbonColor}
              stroke="#FDE68A"
              strokeWidth="1.8"
            />
            {/* Inner Gold Constellation Embroidery on Loops */}
            <circle cx="254" cy={waistY - 4} r="2.2" fill="#FEF08A" />
            <circle cx="270" cy={waistY + 2} r="1.6" fill="#FFFFFF" />
            <circle cx="346" cy={waistY - 4} r="2.2" fill="#FEF08A" />
            <circle cx="330" cy={waistY + 2} r="1.6" fill="#FFFFFF" />
            {/* Hanging Faceted Crystal Prism Drop */}
            <line x1="300" y1={waistY + 12} x2="300" y2={waistY + 28} stroke="#F59E0B" strokeWidth="1.6" />
            <polygon
              points={`300,${waistY + 26} 308,${waistY + 38} 300,${waistY + 52} 292,${waistY + 38}`}
              fill="#E0F2FE"
              stroke="#F59E0B"
              strokeWidth="1.4"
            />
            {/* Center Gold Knot Medallion */}
            <ellipse cx="300" cy={waistY + 6} rx="12" ry="9.5" fill="#F59E0B" stroke="#FEF08A" strokeWidth="1.6" />
            <path
              d={`M300,${waistY - 2} L302,${waistY + 4} L308,${waistY + 6} L302,${waistY + 8} L300,${waistY + 14} L298,${waistY + 8} L292,${waistY + 6} L298,${waistY + 4} Z`}
              fill="#FFFFFF"
            />
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
function wrapCardCanvasLines(text: string, maxChars = 28, maxLines = 5): string[] {
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
            cy="6"
            r="58"
            fill="none"
            stroke={primaryColor}
            strokeWidth="1.6"
            strokeDasharray="6 4"
            opacity="0.55"
          >
            <animate attributeName="r" values="46;70;46" dur="1.8s" repeatCount="indefinite" />
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

      {/* 1. COUTURE RETRO LOVE MIXTAPE CASSETTE */}
      {style === 'mixtape' && (
        <g>
          {/* Cassette Outer Shell with Beveled Gold Trim */}
          <rect
            x="-60"
            y="-34"
            width="120"
            height="78"
            rx="10"
            fill={primaryColor}
            stroke="#fef08a"
            strokeWidth="2.2"
          />
          {/* Gilded Corner Filigree Brackets */}
          <path
            d="M-54,-22 L-54,-28 L-46,-28 M54,-22 L54,-28 L46,-28 M-54,32 L-54,38 L-46,38 M54,32 L54,38 L46,38"
            fill="none"
            stroke="#fef08a"
            strokeWidth="1.5"
            strokeLinecap="round"
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
            strokeWidth="1.1"
          />
          {/* Stripes & Botanical Flourishes on Cassette Sticker */}
          <line x1="-46" y1="-8" x2="46" y2="-8" stroke={primaryColor} strokeWidth="1.4" opacity="0.45" />
          <path d="M-44,-16 L-36,-16 M36,-16 L44,-16" stroke="#d97706" strokeWidth="1.2" strokeLinecap="round" />
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
          <rect x="-36" y="-4" width="72" height="20" rx="10" fill="#1e293b" stroke="#fbbf24" strokeWidth="1" />
          <rect x="-14" y="0" width="28" height="12" rx="2" fill="#334155" />
          {/* Center Heart Crest on Tape Window */}
          <path
            d="M0,4 C-2.5,1 -6.5,3 -3.5,7 L0,10 L3.5,7 C6.5,3 2.5,1 0,4 Z"
            fill={primaryColor}
            stroke="#fef08a"
            strokeWidth="0.7"
          />
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
            stroke="#fef08a"
            strokeWidth="1"
            strokeOpacity="0.65"
          />
          <circle cx="-48" cy="36" r="2.2" fill="#fef08a" opacity="0.85" />
          <circle cx="48" cy="36" r="2.2" fill="#fef08a" opacity="0.85" />
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
          {/* Right Front Brass Control Plate with Title & Vintage Buttons */}
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
            <ellipse cx="0" cy="0" rx="15" ry="4.2" fill={primaryColor} stroke="#fef08a" strokeWidth="1.2" />
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

      {/* 3. COUTURE CROWNED VOICE PLUSHIE (Atelier Bear Holding a Quilted Heart Speaker) */}
      {style === 'plushie' && (
        <g>
          {/* Round Teddy Ears */}
          <circle cx="-26" cy="-28" r="13" fill={primaryColor} stroke="#ffffff" strokeWidth="1.5" />
          <circle cx="-26" cy="-28" r="7" fill="#fde68a" opacity="0.8" />
          <circle cx="26" cy="-28" r="13" fill={primaryColor} stroke="#ffffff" strokeWidth="1.5" />
          <circle cx="26" cy="-28" r="7" fill="#fde68a" opacity="0.8" />
          {/* Golden Atelier Crown with Pearl Tips */}
          <polygon
            points="-12,-32 -8,-44 0,-37 8,-44 12,-32"
            fill="#fbbf24"
            stroke="#b45309"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <circle cx="-8" cy="-45" r="2" fill="#FFFDF9" stroke="#d97706" strokeWidth="0.8" />
          <circle cx="0" cy="-39" r="1.8" fill="#f43f5e" />
          <circle cx="8" cy="-45" r="2" fill="#FFFDF9" stroke="#d97706" strokeWidth="0.8" />
          {/* Plushie Body & Embroidered Foot Pads */}
          <ellipse cx="0" cy="24" rx="31" ry="26" fill={primaryColor} stroke="#ffffff" strokeWidth="1.6" />
          <circle cx="-20" cy="44" r="9.5" fill={shadeWrapHex(primaryColor, -18)} stroke="#ffffff" strokeWidth="1.2" />
          <circle cx="-20" cy="44" r="5" fill="#fffbeb" opacity="0.9" />
          <circle cx="20" cy="44" r="9.5" fill={shadeWrapHex(primaryColor, -18)} stroke="#ffffff" strokeWidth="1.2" />
          <circle cx="20" cy="44" r="5" fill="#fffbeb" opacity="0.9" />
          {/* Plushie Head */}
          <circle cx="0" cy="-10" r="25" fill={primaryColor} stroke="#ffffff" strokeWidth="1.6" />
          {/* Satin Neck Collar & Gold Bell */}
          <path d="M-18,8 Q0,15 18,8" fill="none" stroke="#fbbf24" strokeWidth="2.4" strokeLinecap="round" />
          {/* Rosy Cheeks & Snout */}
          <ellipse cx="-13" cy="-6" rx="4.5" ry="2.8" fill="#fb7185" opacity="0.55" />
          <ellipse cx="13" cy="-6" rx="4.5" ry="2.8" fill="#fb7185" opacity="0.55" />
          <ellipse cx="0" cy="-5" rx="10" ry="7.5" fill="#fffbeb" />
          <circle cx="-9" cy="-14" r="2.8" fill="#292524" />
          <circle cx="-9.8" cy="-14.8" r="1" fill="#ffffff" />
          <circle cx="9" cy="-14" r="2.8" fill="#292524" />
          <circle cx="8.2" cy="-14.8" r="1" fill="#ffffff" />
          <ellipse cx="0" cy="-7.5" rx="3.8" ry="2.6" fill="#451a03" />
          <path d="M-3.5,-3 Q0,0 3.5,-3" fill="none" stroke="#451a03" strokeWidth="1.4" strokeLinecap="round" />
          {/* Quilted Heart Voice Box Held in Paws */}
          <path
            d="M0,12 C-12,-2 -29,6 -19,24 L0,42 L19,24 C29,6 12,-2 0,12 Z"
            fill={accentColor}
            stroke="#fef08a"
            strokeWidth="2"
          />
          {/* Teddy Paws Hugging the Heart */}
          <ellipse cx="-21" cy="20" rx="8" ry="6" transform="rotate(20 -21 20)" fill={shadeWrapHex(primaryColor, -12)} stroke="#ffffff" strokeWidth="1.2" />
          <ellipse cx="21" cy="20" rx="8" ry="6" transform="rotate(-20 21 20)" fill={shadeWrapHex(primaryColor, -12)} stroke="#ffffff" strokeWidth="1.2" />
          <text
            x="0"
            y="25"
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
          <polygon
            points="-48,4 -4,-6 44,4 -4,16"
            fill={shadeWrapHex(primaryColor, 14)}
            stroke="#d97706"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <polygon
            points="-46,5 -4,16 -4,44 -46,32"
            fill={primaryColor}
            stroke="#d97706"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
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
            <path d="M-31,24 L-36,21 M-20,27 L-15,25 M-25,31 L-25,35" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" />
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
            <line x1="-1.5" y1="-12" x2="-1" y2="1" stroke="#fdba74" strokeWidth="2.2" strokeLinecap="round" />
            <line x1="1.5" y1="-12" x2="3" y2="0" stroke="#fdba74" strokeWidth="2" strokeLinecap="round" />
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
            <path
              d="M-3.5,-23 L3.5,-23 L2,-13 L-2,-13 Z"
              fill={primaryColor}
              stroke="#ffffff"
              strokeWidth="0.8"
            />
            <path
              d="M-3,-22 C-9,-28 -8,-37 -2,-40 M3,-22 L13,-17"
              fill="none"
              stroke="#fdba74"
              strokeWidth="1.9"
              strokeLinecap="round"
            />
            <circle cx="0" cy="-28.5" r="3.8" fill="#fed7aa" />
            <path d="M-3.5,-29.5 Q0,-33 3.5,-29.5" fill="#eab308" />
            <circle cx="2" cy="-32.5" r="2.2" fill="#eab308" />
          </g>
        </g>
      )}

      {/* 5. COUTURE GUILLOCHÉ HEART VOICE LOCKET */}
      {style === 'locket' && (
        <g>
          {/* Gold Chain & Crown Bail at Top */}
          <path d="M-24,-46 Q0,-26 24,-46" fill="none" stroke="#d97706" strokeWidth="1.8" strokeDasharray="3 2" />
          <polygon
            points="-8,-26 -5,-36 0,-31 5,-36 8,-26"
            fill="#fbbf24"
            stroke="#b45309"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          {/* Outer Sculpted Heart Locket with Seed-Pearl Rim */}
          <path
            d="M0,-14 C-22,-38 -54,-18 -36,14 L0,46 L36,14 C54,-18 22,-38 0,-14 Z"
            fill={primaryColor}
            stroke="#fef08a"
            strokeWidth="2.4"
          />
          <path
            d="M0,-10 C-19,-32 -48,-14 -32,14 L0,42 L32,14 C48,-14 19,-32 0,-10 Z"
            fill="none"
            stroke="#FFFDF9"
            strokeWidth="2"
            strokeDasharray="2 3.2"
            strokeLinecap="round"
          />
          {/* Inner Guilloché Enamel Heart Face */}
          <path
            d="M0,-5 C-15,-22 -38,-8 -25,14 L0,36 L25,14 C38,-8 15,-22 0,-5 Z"
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

      {/* 6. PEARL CONCH VOICE SHELL (Iridescent Nacre Scallop & Glowing Acoustic Pearl) */}
      {style === 'shell' && (
        <g>
          {/* Upper Scalloped Nacre Fan Valve */}
          <path
            d="M-42,6 C-50,-24 -26,-42 0,-42 C26,-42 50,-24 42,6 L24,14 L-24,14 Z"
            fill={primaryColor}
            stroke="#d97706"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          {/* Radial Fluted Shell Ribs */}
          <g stroke="#ffffff" strokeWidth="1.4" opacity="0.72" strokeLinecap="round">
            <line x1="0" y1="12" x2="-30" y2="-24" />
            <line x1="0" y1="12" x2="-16" y2="-34" />
            <line x1="0" y1="12" x2="0" y2="-37" />
            <line x1="0" y1="12" x2="16" y2="-34" />
            <line x1="0" y1="12" x2="30" y2="-24" />
          </g>
          {/* Gold Filigree Hinge & Pearl Studs */}
          <ellipse cx="0" cy="14" rx="26" ry="5" fill="#fbbf24" stroke="#b45309" strokeWidth="1.1" />
          {/* Lower Open Iridescent Nacre Cradle */}
          <ellipse cx="0" cy="24" rx="44" ry="18" fill={accentColor} stroke="#d97706" strokeWidth="1.8" />
          <ellipse cx="0" cy="22" rx="35" ry="12.5" fill="#fffdf9" stroke="#fde68a" strokeWidth="1" />
          {/* Glowing Acoustic Pearl in Center */}
          <g transform="translate(0, 10)">
            {isPlaying && (
              <circle cx="0" cy="0" r="18" fill={primaryColor} opacity="0.28">
                <animate attributeName="r" values="13;21;13" dur="1.4s" repeatCount="indefinite" />
              </circle>
            )}
            <circle cx="0" cy="0" r="12.5" fill="#ffffff" stroke="#fde68a" strokeWidth="1.6" />
            <circle cx="-4" cy="-4" r="3.8" fill="#fdf2f8" />
            {/* Soundwave Etched on Pearl */}
            <path
              d="M-6,1 L-6,3 M-3,-2 L-3,5 M0,-4 L0,6 M3,-2 L3,5 M6,1 L6,3"
              stroke={primaryColor}
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </g>
          {/* Engraved Ribbon Title on Lower Shell Lip */}
          <text
            x="0"
            y="34"
            textAnchor="middle"
            fill="#78350f"
            fontSize="8.8"
            fontWeight="700"
            style={{ fontFamily: "'Cormorant Garamond', serif", letterSpacing: '0.04em' }}
          >
            {displayTitle.slice(0, 14)}
          </text>
        </g>
      )}

      {/* 7. GILDED SONGBIRD CAGE (Victorian Brass Automaton Birdcage with Singing Porcelain Bird) */}
      {style === 'birdcage' && (
        <g>
          {/* Top Hanging Ring & Crown Finial */}
          <circle cx="0" cy="-48" r="5" fill="none" stroke="#b45309" strokeWidth="2" />
          <polygon points="-7,-39 0,-45 7,-39" fill={primaryColor} stroke="#92400e" strokeWidth="1.2" />
          {/* Dome Cage Silhouette & Filigree Bars */}
          <path
            d="M-34,24 L-34,-8 A34,32 0 0,1 34,-8 L34,24 Z"
            fill="#fffdf9"
            fillOpacity="0.48"
            stroke={primaryColor}
            strokeWidth="2.2"
          />
          <path
            d="M-20,24 L-20,-12 A20,28 0 0,1 20,-12 L20,24"
            fill="none"
            stroke={primaryColor}
            strokeWidth="1.3"
            opacity="0.85"
          />
          <line x1="0" y1="-39" x2="0" y2="24" stroke={primaryColor} strokeWidth="1.3" opacity="0.85" />
          <line x1="-34" y1="-6" x2="34" y2="-6" stroke={primaryColor} strokeWidth="1.4" />
          {/* Swing Perch & Singing Porcelain Songbird Inside */}
          <path d="M-16,-6 Q0,-2 16,-6" fill="none" stroke="#b45309" strokeWidth="1.2" />
          <line x1="-22" y1="8" x2="22" y2="8" stroke="#92400e" strokeWidth="2.2" strokeLinecap="round" />
          <g transform="translate(0, 4)">
            {isPlaying && (
              <animateTransform
                attributeName="transform"
                type="rotate"
                values="-5 0 0; 6 0 0; -5 0 0"
                dur="1.2s"
                repeatCount="indefinite"
                additive="sum"
              />
            )}
            {/* Songbird Tail, Wing & Body */}
            <path
              d="M-18,6 L-8,0 C-4,-10 8,-12 14,-7 C19,-3 18,4 10,6 C3,8 -4,6 -9,4 L-15,9 Z"
              fill={accentColor}
              stroke="#be185d"
              strokeWidth="1.2"
            />
            <path d="M-4,-2 C-10,-12 2,-15 6,-5 Z" fill="#ffffff" stroke="#f43f5e" strokeWidth="1" />
            <circle cx="10" cy="-4" r="1.6" fill="#1c1917" />
            <polygon points="15,-5 21,-3 15,-1" fill="#f59e0b" />
          </g>
          {/* Gilded Pedestal Base with Climbing Roses & Nameplate */}
          <rect
            x="-38"
            y="24"
            width="76"
            height="18"
            rx="5"
            fill={primaryColor}
            stroke="#92400e"
            strokeWidth="1.6"
          />
          <rect x="-26" y="27.5" width="52" height="11" rx="3" fill="#fffbeb" stroke="#d97706" strokeWidth="1" />
          <circle cx="-31" cy="33" r="3.5" fill="#f43f5e" />
          <circle cx="31" cy="33" r="3.5" fill="#f43f5e" />
          <text
            x="0"
            y="35.5"
            textAnchor="middle"
            fill="#1C1917"
            fontSize="8.2"
            fontWeight="700"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            {displayTitle.slice(0, 13)}
          </text>
        </g>
      )}

      {/* 8. MESSAGE IN A BOTTLE (Crystal Flagon with Wax-Sealed Voice Scroll & Starlight Sea) */}
      {style === 'bottle' && (
        <g>
          {/* Cork Stopper & Golden Cord */}
          <polygon
            points="-9,-46 9,-46 7,-32 -7,-32"
            fill="#b45309"
            stroke="#78350f"
            strokeWidth="1.3"
          />
          {/* Crystal Bottle Neck & Gilded Collar */}
          <rect
            x="-12"
            y="-34"
            width="24"
            height="12"
            rx="3"
            fill={primaryColor}
            fillOpacity="0.75"
            stroke="#0284c7"
            strokeWidth="1.5"
          />
          <line x1="-14" y1="-23" x2="14" y2="-23" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
          {/* Faceted Crystal Bottle Body */}
          <path
            d="M-12,-22 L-32,-6 C-36,0 -36,34 -28,42 L28,42 C36,34 36,0 32,-6 L12,-22 Z"
            fill={primaryColor}
            fillOpacity="0.72"
            stroke="#0284c7"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          {/* Shimmering Sea Waves at Base of Bottle */}
          <path
            d="M-33,26 Q-16,20 0,26 T33,26 L28,41 L-28,41 Z"
            fill="#38bdf8"
            opacity="0.45"
          />
          {/* Rolled Vellum Voice Scroll Floating Inside */}
          <g transform="translate(0, 6) rotate(-7)">
            {isPlaying && (
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0,0; 0,-4; 0,0"
                dur="1.8s"
                repeatCount="indefinite"
                additive="sum"
              />
            )}
            <rect
              x="-14"
              y="-20"
              width="28"
              height="38"
              rx="3"
              fill={accentColor}
              stroke="#d97706"
              strokeWidth="1.3"
            />
            <line x1="-9" y1="-11" x2="9" y2="-11" stroke="#92400e" strokeWidth="1" opacity="0.55" />
            <line x1="-9" y1="-6" x2="6" y2="-6" stroke="#92400e" strokeWidth="1" opacity="0.55" />
            {/* Crimson Ribbon & Gold-Embossed Wax Seal */}
            <line x1="-14" y1="2" x2="14" y2="2" stroke="#e11d48" strokeWidth="2.2" />
            <circle cx="0" cy="2" r="5.5" fill="#e11d48" stroke="#fef08a" strokeWidth="1" />
            <text
              x="0"
              y="14"
              textAnchor="middle"
              fill="#451a03"
              fontSize="6.8"
              fontWeight="700"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              {displayTitle.slice(0, 10)}
            </text>
          </g>
          {/* Specular Glass Highlight & Floating Gold Sparkles */}
          <path d="M-24,-2 L-24,28" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" opacity="0.7" />
          <circle cx="19" cy="-4" r="2" fill="#fef08a" />
          <circle cx="-18" cy="20" r="1.8" fill="#fef08a" />
        </g>
      )}

      {/* 9. CELESTIAL LYRE HARP (Sculpted Golden Winged Harp with Shimmering Strings) */}
      {style === 'harp' && (
        <g>
          {/* Left & Right Sculpted Swan-Wing Lyre Arms */}
          <path
            d="M-20,26 C-44,10 -44,-24 -22,-34 C-14,-37 -10,-28 -17,-23"
            fill="none"
            stroke={primaryColor}
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d="M20,26 C44,10 44,-24 22,-34 C14,-37 10,-28 17,-23"
            fill="none"
            stroke={primaryColor}
            strokeWidth="6"
            strokeLinecap="round"
          />
          {/* Top Celestial Crossbar & Sunburst Star Finial */}
          <line x1="-26" y1="-26" x2="26" y2="-26" stroke={primaryColor} strokeWidth="4" strokeLinecap="round" />
          <polygon
            points="0,-44 3,-35 12,-32 3,-29 0,-20 -3,-29 -12,-32 -3,-35"
            fill={accentColor}
            stroke="#b45309"
            strokeWidth="1.1"
          />
          {/* 7 Golden Acoustic Strings */}
          <g stroke={accentColor} strokeWidth="1.5" strokeLinecap="round">
            {[-14, -9.5, -4.8, 0, 4.8, 9.5, 14].map((x, idx) => (
              <line key={`harp-str-${idx}`} x1={x} y1="-24" x2={x * 0.78} y2="24">
                {isPlaying && (
                  <animate
                    attributeName="stroke-width"
                    values="1.4;2.6;1.4"
                    dur={`${0.6 + idx * 0.12}s`}
                    repeatCount="indefinite"
                  />
                )}
              </line>
            ))}
          </g>
          {/* Ornate Soundbox Pedestal Base with Rose Cartouche */}
          <path
            d="M-30,24 Q0,34 30,24 L24,44 Q0,50 -24,44 Z"
            fill={primaryColor}
            stroke="#92400e"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <rect x="-21" y="30" width="42" height="11" rx="3" fill="#fffbeb" stroke="#d97706" strokeWidth="1" />
          <text
            x="0"
            y="38"
            textAnchor="middle"
            fill="#1C1917"
            fontSize="8"
            fontWeight="700"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            {displayTitle.slice(0, 12)}
          </text>
        </g>
      )}

      {/* 10. ENCHANTED ROSE GLOBE (Glass Cloche Dome over an Eternal Rose & Musical Pedestal) */}
      {style === 'globe' && (
        <g>
          {/* Crystal Top Finial */}
          <circle cx="0" cy="-44" r="5" fill={accentColor} stroke="#b45309" strokeWidth="1.4" />
          {/* Blown-Glass Cloche Dome */}
          <path
            d="M-32,24 L-32,-10 A32,30 0 0,1 32,-10 L32,24 Z"
            fill={accentColor}
            fillOpacity="0.52"
            stroke="#d97706"
            strokeWidth="1.8"
          />
          {/* Curved Glass Highlight */}
          <path
            d="M-24,-10 A24,22 0 0,1 -6,-32"
            fill="none"
            stroke="#ffffff"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.82"
          />
          {/* Eternal Rose & Fallen Petals Inside Cloche */}
          <line x1="0" y1="-6" x2="0" y2="22" stroke="#15803d" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M0,10 C-10,6 -12,1 -5,2 Z M0,14 C10,10 12,5 5,6 Z" fill="#16a34a" />
          <g transform="translate(0, -12)">
            {isPlaying && (
              <circle cx="0" cy="0" r="19" fill={primaryColor} opacity="0.24">
                <animate attributeName="r" values="14;22;14" dur="1.6s" repeatCount="indefinite" />
              </circle>
            )}
            <circle cx="-6" cy="-2" r="8" fill={primaryColor} />
            <circle cx="6" cy="-2" r="8" fill={primaryColor} />
            <circle cx="0" cy="-7" r="8.5" fill={primaryColor} />
            <circle cx="0" cy="0" r="9.5" fill={primaryColor} stroke="#ffffff" strokeWidth="1" />
            <path d="M-5,-2 C-2,-7 4,-7 5,0 C5,5 -4,6 -5,-2 Z" fill="#fef08a" opacity="0.7" />
          </g>
          {/* Floating Gold Stardust Motes & Fallen Rose Petals */}
          <ellipse cx="-14" cy="21" rx="4.5" ry="2" fill={primaryColor} opacity="0.85" />
          <ellipse cx="15" cy="22" rx="4" ry="1.8" fill={primaryColor} opacity="0.85" />
          <circle cx="-18" cy="-4" r="1.8" fill="#fbbf24" />
          <circle cx="18" cy="-14" r="2" fill="#fbbf24" />
          <circle cx="14" cy="4" r="1.5" fill="#fbbf24" />
          {/* Gilded Musical Pedestal Base */}
          <rect
            x="-38"
            y="24"
            width="76"
            height="18"
            rx="5"
            fill="#b45309"
            stroke="#fef08a"
            strokeWidth="1.6"
          />
          <rect x="-26" y="27.5" width="52" height="11" rx="2.5" fill="#fffbeb" stroke="#d97706" strokeWidth="1" />
          <text
            x="0"
            y="35.5"
            textAnchor="middle"
            fill="#1C1917"
            fontSize="8.2"
            fontWeight="700"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            {displayTitle.slice(0, 13)}
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
  idPrefix?: string;
}> = ({ environment, isDarkMode, idPrefix = '' }) => {
  if (environment === 'studio') return null;

  return (
    <g clipPath={`url(#${idPrefix}stageArchClip)`} className="pointer-events-none select-none">
      <g transform="translate(300, 340) scale(1.105, 1.02) translate(-300, -340)">
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

      {/* 5. EVENING GLOW ('starlit' — Deep twilight night sky, luminous crescent moon & golden constellations) */}
      {environment === 'starlit' && (
        <g>
          <defs>
            <linearGradient id={`${idPrefix}envStarlitSky`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#14112A" />
              <stop offset="52%" stopColor="#221A3B" />
              <stop offset="100%" stopColor="#35234B" />
            </linearGradient>
            <radialGradient id={`${idPrefix}envStarlitMoonGlow`} cx="50%" cy="22%" r="48%">
              <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.24" />
              <stop offset="55%" stopColor="#C084FC" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#14112A" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect
            x="6"
            y="6"
            width="588"
            height="668"
            fill={`url(#${idPrefix}envStarlitSky)`}
          />
          <circle cx="300" cy="180" r="260" fill={`url(#${idPrefix}envStarlitMoonGlow)`} />
          {/* Fine Gold Celestial Arch Frame */}
          <path
            d="M36,648 L36,256 A264,234 0 0,1 564,256 L564,648 Z"
            fill="none"
            stroke="#FBBF24"
            strokeWidth="1.2"
            strokeDasharray="4 4"
            opacity="0.55"
          />
          {/* Top-Center Luminous Crescent Moon & Stars */}
          <path
            d="M292,46 A22,22 0 1,0 318,76 A17,17 0 1,1 292,46 Z"
            fill="#FDE68A"
            opacity="0.92"
          />
          <g fill="#FDE68A" opacity="0.88">
            <path d="M118,122 L121,131 L130,134 L121,137 L118,146 L115,137 L106,134 L115,131 Z" />
            <path d="M482,132 L485,141 L494,144 L485,147 L482,156 L479,147 L470,144 L479,141 Z" />
            <path d="M168,74 L170,80 L176,82 L170,84 L168,90 L166,84 L160,82 L166,80 Z" />
            <path d="M436,78 L438,84 L444,86 L438,88 L436,94 L434,88 L428,86 L434,84 Z" />
            <circle cx="88" cy="212" r="2.4" />
            <circle cx="144" cy="182" r="2" />
            <circle cx="182" cy="222" r="1.8" fill="#F472B6" />
            <circle cx="512" cy="220" r="2.4" />
            <circle cx="456" cy="190" r="2" />
            <circle cx="418" cy="228" r="1.8" fill="#C084FC" />
          </g>
          {/* Constellation Lineart */}
          <path
            d="M88,212 L118,134 L144,182 L182,222 M512,220 L482,144 L456,190 L418,228"
            fill="none"
            stroke="#FDE68A"
            strokeWidth="0.9"
            strokeDasharray="3 3"
            opacity="0.55"
          />
        </g>
      )}

      {/* 7. GILDED AURORA PRISM & GOLDEN HALO ARCH ('aurora' — Couture) */}
      {environment === 'aurora' && (
        <g>
          <defs>
            <linearGradient id={`${idPrefix}envAuroraBg`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isDarkMode ? '#2D192B' : '#FFEAF2'} />
              <stop offset="48%" stopColor={isDarkMode ? '#33251B' : '#FEF3C7'} />
              <stop offset="100%" stopColor={isDarkMode ? '#1C223A' : '#E0E7FF'} />
            </linearGradient>
            <radialGradient id={`${idPrefix}envAuroraHalo`} cx="50%" cy="42%" r="50%">
              <stop offset="0%" stopColor="#FDE68A" stopOpacity={isDarkMode ? '0.26' : '0.45'} />
              <stop offset="55%" stopColor="#F472B6" stopOpacity={isDarkMode ? '0.12' : '0.18'} />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect x="6" y="6" width="588" height="668" fill={`url(#${idPrefix}envAuroraBg)`} />
          <circle cx="300" cy="290" r="260" fill={`url(#${idPrefix}envAuroraHalo)`} />
          {/* Flowing Iridescent Aurora Ribbons */}
          <path
            d="M28,230 C160,120 280,290 420,165 C485,110 535,145 572,125"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="2.2"
            opacity="0.45"
          />
          <path
            d="M28,295 C175,185 310,340 450,210 C505,160 545,190 572,175"
            fill="none"
            stroke="#EC4899"
            strokeWidth="1.8"
            strokeDasharray="6 4"
            opacity="0.38"
          />
          {/* Gilded Cathedral Halo Arch */}
          <path
            d="M42,646 L42,260 A258,230 0 0,1 558,260 L558,646 Z"
            fill="none"
            stroke="#D97706"
            strokeWidth="1.4"
            opacity="0.65"
          />
          <path
            d="M52,638 L52,264 A248,220 0 0,1 548,264 L548,638 Z"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="0.9"
            strokeDasharray="4 4"
            opacity="0.55"
          />
          {/* Crown Starburst & Shimmering Gold Motes */}
          <g fill="#F59E0B" opacity="0.85">
            <path d="M300,40 L303.5,52.5 L316,56 L303.5,59.5 L300,72 L296.5,59.5 L284,56 L296.5,52.5 Z" />
            <path d="M112,118 L114,125 L121,127 L114,129 L112,136 L110,129 L103,127 L110,125 Z" />
            <path d="M488,118 L490,125 L497,127 L490,129 L488,136 L486,129 L479,127 L486,125 Z" />
            <circle cx="88" cy="195" r="2.5" />
            <circle cx="512" cy="195" r="2.5" />
            <circle cx="150" cy="88" r="2" />
            <circle cx="450" cy="88" r="2" />
          </g>
        </g>
      )}

      {/* 8. ROYAL VELVET SALON & 24K GOLD FILIGREE ARCH ('velvetSalon' — Couture) */}
      {environment === 'velvetSalon' && (
        <g>
          <defs>
            <radialGradient id={`${idPrefix}envVelvetBg`} cx="50%" cy="46%" r="62%">
              <stop offset="0%" stopColor={isDarkMode ? '#3B1522' : '#4A192C'} />
              <stop offset="65%" stopColor={isDarkMode ? '#240C15' : '#2D0F1B'} />
              <stop offset="100%" stopColor="#17070D" />
            </radialGradient>
          </defs>
          <rect x="6" y="6" width="588" height="668" fill={`url(#${idPrefix}envVelvetBg)`} />
          {/* Subtle Warm Spotlight Behind Bouquet */}
          <circle cx="300" cy="330" r="215" fill="#F59E0B" opacity="0.09" />
          {/* Double Gilded Filigree Frame & Corner Baroque Scrollwork */}
          <rect
            x="30"
            y="30"
            width="540"
            height="620"
            rx="26"
            fill="none"
            stroke="#D97706"
            strokeWidth="1.5"
            opacity="0.72"
          />
          <path
            d="M46,636 L46,252 A254,218 0 0,1 554,252 L554,636 Z"
            fill="none"
            stroke="#FDE68A"
            strokeWidth="1.5"
            opacity="0.75"
          />
          <path
            d="M56,628 L56,256 A244,208 0 0,1 544,256 L544,628 Z"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="0.95"
            strokeDasharray="5 3"
            opacity="0.6"
          />
          {/* Corner Gilded Rosettes & Top Crest */}
          <g fill="#FDE68A" opacity="0.88">
            <path d="M300,44 L304,58 L318,62 L304,66 L300,80 L296,66 L282,62 L296,58 Z" />
            <circle cx="300" cy="62" r="3.5" fill="#FFFFFF" />
            <circle cx="54" cy="54" r="4" />
            <circle cx="546" cy="54" r="4" />
            <circle cx="110" cy="140" r="2.2" />
            <circle cx="490" cy="140" r="2.2" />
            <circle cx="78" cy="220" r="1.8" />
            <circle cx="522" cy="220" r="1.8" />
          </g>
        </g>
      )}

      {/* 9. OPALINE SUNBEAM & MOTHER-OF-PEARL HALO ('opalMist' — Couture) */}
      {environment === 'opalMist' && (
        <g>
          <defs>
            <linearGradient id={`${idPrefix}envOpalBg`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isDarkMode ? '#1F242D' : '#FFF7ED'} />
              <stop offset="45%" stopColor={isDarkMode ? '#2B222C' : '#FCE7F3'} />
              <stop offset="100%" stopColor={isDarkMode ? '#1B2830' : '#E0F2FE'} />
            </linearGradient>
          </defs>
          <rect x="6" y="6" width="588" height="668" fill={`url(#${idPrefix}envOpalBg)`} />
          {/* Diagonal Luminous Sunbeam Rays */}
          <g opacity={isDarkMode ? '0.14' : '0.35'}>
            <polygon points="14,14 210,14 586,440 586,610" fill="#FEF08A" />
            <polygon points="240,14 370,14 586,260 586,380" fill="#BAE6FD" />
          </g>
          {/* Concentric Mother-of-Pearl & Gold Halo Rings */}
          <circle
            cx="300"
            cy="315"
            r="238"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="1.3"
            strokeDasharray="8 5"
            opacity="0.55"
          />
          <circle
            cx="300"
            cy="315"
            r="218"
            fill="none"
            stroke={isDarkMode ? '#BAE6FD' : '#D97706'}
            strokeWidth="0.9"
            opacity="0.45"
          />
          {/* Floating Opaline Motes & Sparkles */}
          <g fill="#F59E0B" opacity="0.8">
            <path d="M135,112 L137.5,120.5 L146,123 L137.5,125.5 L135,134 L132.5,125.5 L124,123 L132.5,120.5 Z" />
            <path d="M468,128 L470.5,136.5 L479,139 L470.5,141.5 L468,150 L465.5,141.5 L457,139 L465.5,136.5 Z" />
            <circle cx="96" cy="260" r="3.5" fill="#FDE68A" />
            <circle cx="508" cy="248" r="3.5" fill="#BAE6FD" />
            <circle cx="176" cy="84" r="2.2" />
            <circle cx="424" cy="88" r="2.2" />
          </g>
        </g>
      )}

      {/* 10. ROSEWATER SILK DRAPERY ('blushSilk' — Free) */}
      {environment === 'blushSilk' && (
        <g>
          <defs>
            <linearGradient id={`${idPrefix}envBlushSilkBg`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isDarkMode ? '#352229' : '#FFF0F5'} />
              <stop offset="50%" stopColor={isDarkMode ? '#2B1B22' : '#FCE7F3'} />
              <stop offset="100%" stopColor={isDarkMode ? '#24171D' : '#FFE4E6'} />
            </linearGradient>
          </defs>
          <rect x="6" y="6" width="588" height="668" fill={`url(#${idPrefix}envBlushSilkBg)`} />
          {/* Flowing Charmeuse Silk Folds */}
          <path
            d="M14,160 C180,90 290,260 586,130 L586,320 C340,420 190,240 14,350 Z"
            fill={isDarkMode ? '#4A2B36' : '#FFFFFF'}
            opacity={isDarkMode ? '0.28' : '0.52'}
          />
          <path
            d="M14,420 C210,330 360,510 586,390 L586,580 C380,640 200,490 14,590 Z"
            fill={isDarkMode ? '#5B3241' : '#FBCFE8'}
            opacity={isDarkMode ? '0.22' : '0.36'}
          />
          <rect
            x="30"
            y="30"
            width="540"
            height="620"
            rx="28"
            fill="none"
            stroke={isDarkMode ? '#F472B6' : '#F9A8D4'}
            strokeWidth="1.2"
            strokeDasharray="6 4"
            opacity="0.65"
          />
        </g>
      )}

      {/* 11. GLASS CONSERVATORY ARCH ('botanicalArch' — Free) */}
      {environment === 'botanicalArch' && (
        <g>
          <rect
            x="6"
            y="6"
            width="588"
            height="668"
            fill={isDarkMode ? '#1A2821' : '#EBF7F0'}
          />
          {/* Victorian Wrought-Iron Glasshouse Arch & Mullions */}
          <path
            d="M48,646 L48,268 A252,224 0 0,1 552,268 L552,646 Z"
            fill="none"
            stroke={isDarkMode ? '#6EE7B7' : '#6EE7B7'}
            strokeWidth="1.8"
            opacity="0.75"
          />
          <path
            d="M132,646 L132,125 M468,646 L468,125 M300,44 L300,646 M48,268 L552,268 M48,430 L552,430"
            stroke={isDarkMode ? '#6EE7B7' : '#86EFAC'}
            strokeWidth="1.2"
            opacity="0.6"
          />
          <circle
            cx="300"
            cy="268"
            r="68"
            fill="none"
            stroke={isDarkMode ? '#6EE7B7' : '#6EE7B7'}
            strokeWidth="1.4"
            opacity="0.65"
          />
        </g>
      )}

      {/* 12. WINTER SNOWFALL & FROST HALO ('nordicSnow' — Free) */}
      {environment === 'nordicSnow' && (
        <g>
          <defs>
            <linearGradient id={`${idPrefix}envNordicBg`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={isDarkMode ? '#1B263B' : '#DBEAFE'} />
              <stop offset="55%" stopColor={isDarkMode ? '#22304A' : '#EFF6FF'} />
              <stop offset="100%" stopColor={isDarkMode ? '#172032' : '#E0F2FE'} />
            </linearGradient>
          </defs>
          <rect x="6" y="6" width="588" height="668" fill={`url(#${idPrefix}envNordicBg)`} />
          {/* Frosted Arch Frame */}
          <path
            d="M44,646 L44,258 A256,220 0 0,1 556,258 L556,646 Z"
            fill="none"
            stroke={isDarkMode ? '#93C5FD' : '#60A5FA'}
            strokeWidth="1.5"
            strokeDasharray="6 4"
            opacity="0.7"
          />
          {/* Drifting Bokeh Snowflakes & Frost Crystals */}
          <g fill="#FFFFFF" opacity={isDarkMode ? '0.75' : '0.95'}>
            <circle cx="94" cy="112" r="5" />
            <circle cx="156" cy="76" r="3.5" />
            <circle cx="462" cy="88" r="5.5" />
            <circle cx="510" cy="148" r="4" />
            <circle cx="82" cy="240" r="3.8" />
            <circle cx="520" cy="264" r="4.5" />
            <circle cx="112" cy="410" r="3.2" />
            <circle cx="496" cy="428" r="3.8" />
          </g>
          <g stroke={isDarkMode ? '#BAE6FD' : '#38BDF8'} strokeWidth="1.4" strokeLinecap="round" opacity="0.75">
            <path d="M300,48 L300,72 M288,60 L312,60 M292,52 L308,68 M308,52 L292,68" />
            <path d="M118,168 L118,184 M110,176 L126,176" />
            <path d="M482,188 L482,204 M474,196 L490,196" />
          </g>
        </g>
      )}

      {/* 13. VERSAILLES CRYSTAL MIRROR HALL ('crystalPalace' — Couture) */}
      {environment === 'crystalPalace' && (
        <g>
          <defs>
            <radialGradient id={`${idPrefix}envVersaillesBg`} cx="50%" cy="38%" r="62%">
              <stop offset="0%" stopColor={isDarkMode ? '#332B22' : '#FFFBEB'} />
              <stop offset="60%" stopColor={isDarkMode ? '#261F18' : '#FEF3C7'} />
              <stop offset="100%" stopColor={isDarkMode ? '#1A1510' : '#FDE68A'} />
            </radialGradient>
          </defs>
          <rect x="6" y="6" width="588" height="668" fill={`url(#${idPrefix}envVersaillesBg)`} />
          {/* Gilded Rococo Mirror Arch & Double Molding */}
          <path
            d="M42,642 L42,248 A258,214 0 0,1 558,248 L558,642 Z"
            fill="none"
            stroke="#D97706"
            strokeWidth="1.8"
            opacity="0.75"
          />
          <path
            d="M54,632 L54,254 A246,202 0 0,1 546,254 L546,632 Z"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="1"
            strokeDasharray="6 3"
            opacity="0.65"
          />
          {/* Crystal Chandelier Swags & Prism Drops at Crown */}
          <path
            d="M170,84 Q235,132 300,76 Q365,132 430,84"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="1.4"
            strokeDasharray="3 3"
            opacity="0.8"
          />
          {[170, 235, 300, 365, 430].map((cx, idx) => (
            <polygon
              key={`cp-prism-${idx}`}
              points={`${cx},${idx === 2 ? 78 : 92} ${cx - 6},${idx === 2 ? 92 : 104} ${cx},${idx === 2 ? 106 : 116} ${cx + 6},${idx === 2 ? 92 : 104}`}
              fill="#E0F2FE"
              stroke="#F59E0B"
              strokeWidth="1.1"
            />
          ))}
        </g>
      )}

      {/* 14. NOEL PINE GARLAND & HANGING BAUBLES ('midnightNoel' — Couture) */}
      {environment === 'midnightNoel' && (
        <g>
          <defs>
            <linearGradient id={`${idPrefix}envNoelBg`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0D281D" />
              <stop offset="55%" stopColor="#133829" />
              <stop offset="100%" stopColor="#091C14" />
            </linearGradient>
          </defs>
          <rect x="6" y="6" width="588" height="668" fill={`url(#${idPrefix}envNoelBg)`} />
          {/* Soft Frosted Snowbank Drifts at Bottom */}
          <path
            d="M6,612 Q150,586 300,606 Q450,624 594,592 L594,640 Q594,674 560,674 L40,674 Q6,674 6,640 Z"
            fill="#F8FAFC"
            opacity="0.16"
          />
          {/* Warm Fairy Light Swags Across Top */}
          <path
            d="M24,64 Q162,138 300,72 Q438,138 576,64"
            fill="none"
            stroke="#FDE68A"
            strokeWidth="1.2"
            strokeDasharray="3 4"
            opacity="0.75"
          />
          {/* Draped Evergreen Pine Bough Swags at Top Crown */}
          <path
            d="M16,42 Q158,118 300,52 Q442,118 584,42 L584,14 Q584,6 560,6 L40,6 Q16,6 16,14 Z"
            fill="#164E35"
            stroke="#34D399"
            strokeWidth="1"
            strokeOpacity="0.35"
          />
          <path
            d="M32,56 Q165,126 300,66 Q435,126 568,56"
            fill="none"
            stroke="#065F46"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray="8 10"
          />
          {/* Hanging Christmas Baubles on Golden Threads (Left Ruby, Center Gold Drop, Right Emerald/Gold) */}
          <g stroke="#FBBF24" strokeWidth="1.2">
            <line x1="148" y1="84" x2="148" y2="144" />
            <line x1="300" y1="62" x2="300" y2="118" />
            <line x1="452" y1="84" x2="452" y2="144" />
          </g>
          {/* Left Ruby Glass Bauble */}
          <circle cx="148" cy="158" r="14" fill="#DC2626" stroke="#FDE68A" strokeWidth="1.5" />
          <circle cx="143" cy="153" r="4" fill="#FCA5A5" opacity="0.7" />
          {/* Center Gilded Finial Bauble */}
          <polygon points="300,116 286,136 300,162 314,136" fill="#F59E0B" stroke="#FEF08A" strokeWidth="1.5" />
          <circle cx="300" cy="136" r="4" fill="#FFFFFF" opacity="0.8" />
          {/* Right Crimson Glass Bauble */}
          <circle cx="452" cy="158" r="14" fill="#E11D48" stroke="#FDE68A" strokeWidth="1.5" />
          <circle cx="447" cy="153" r="4" fill="#FDA4AF" opacity="0.7" />
          {/* Holly Berry Clusters & Warm Twinkling Snowflakes */}
          <g fill="#EF4444">
            <circle cx="295" cy="58" r="4.5" />
            <circle cx="305" cy="58" r="4.5" />
            <circle cx="300" cy="51" r="4.5" />
            <circle cx="144" cy="82" r="3.8" />
            <circle cx="152" cy="82" r="3.8" />
            <circle cx="448" cy="82" r="3.8" />
            <circle cx="456" cy="82" r="3.8" />
          </g>
          <g fill="#FEF08A" opacity="0.85">
            <circle cx="92" cy="118" r="3" />
            <circle cx="222" cy="108" r="3.2" />
            <circle cx="378" cy="108" r="3.2" />
            <circle cx="508" cy="118" r="3" />
            <circle cx="76" cy="248" r="2.4" fill="#FFFFFF" />
            <circle cx="524" cy="248" r="2.4" fill="#FFFFFF" />
            <circle cx="96" cy="390" r="2.2" fill="#FFFFFF" />
            <circle cx="504" cy="390" r="2.2" fill="#FFFFFF" />
          </g>
        </g>
      )}

      {/* 15. CHAMPAGNE SILK DRAPERY ('champagneSilk' — Free) */}
      {environment === 'champagneSilk' && (
        <g>
          <defs>
            <linearGradient id={`${idPrefix}envChampagneSilkBg`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isDarkMode ? '#332A1F' : '#FFFBF1'} />
              <stop offset="50%" stopColor={isDarkMode ? '#272017' : '#F6E8CF'} />
              <stop offset="100%" stopColor={isDarkMode ? '#1D1710' : '#EED9B7'} />
            </linearGradient>
            <linearGradient id={`${idPrefix}envChampagneSheen`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={isDarkMode ? '#6B5536' : '#FFFFFF'} stopOpacity="0.1" />
              <stop offset="50%" stopColor={isDarkMode ? '#A68756' : '#FFFDF7'} stopOpacity={isDarkMode ? '0.26' : '0.62'} />
              <stop offset="100%" stopColor={isDarkMode ? '#524129' : '#F3DFC1'} stopOpacity="0.12" />
            </linearGradient>
          </defs>
          <rect x="6" y="6" width="588" height="668" fill={`url(#${idPrefix}envChampagneSilkBg)`} />
          {/* Luminous Draped Champagne Charmeuse Silk Folds */}
          <path
            d="M10,140 C175,70 305,245 590,115 L590,305 C330,415 185,220 10,335 Z"
            fill={`url(#${idPrefix}envChampagneSheen)`}
          />
          <path
            d="M10,415 C205,320 365,505 590,375 L590,585 C375,650 195,495 10,595 Z"
            fill={isDarkMode ? '#4A3B27' : '#EBD3AE'}
            opacity={isDarkMode ? '0.28' : '0.34'}
          />
          <path
            d="M10,275 C190,210 345,355 590,250"
            fill="none"
            stroke={isDarkMode ? '#D6B785' : '#FFFFFF'}
            strokeWidth="2.4"
            opacity={isDarkMode ? '0.18' : '0.58'}
          />
          <rect
            x="30"
            y="30"
            width="540"
            height="620"
            rx="28"
            fill="none"
            stroke={isDarkMode ? '#C9A46B' : '#D6B480'}
            strokeWidth="1.2"
            strokeDasharray="6 4"
            opacity="0.65"
          />
        </g>
      )}

      {/* 16. SUNLIT MEDITERRANEAN PLASTER WALL ('terracottaWall' — Free) */}
      {environment === 'terracottaWall' && (
        <g>
          <defs>
            <linearGradient id={`${idPrefix}envTerracottaBg`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isDarkMode ? '#38251E' : '#F8EAE0'} />
              <stop offset="52%" stopColor={isDarkMode ? '#2B1B15' : '#EDD0BD'} />
              <stop offset="100%" stopColor={isDarkMode ? '#1F130E' : '#DFB49B'} />
            </linearGradient>
            <linearGradient id={`${idPrefix}envPlasterSun`} x1="0%" y1="0%" x2="85%" y2="90%">
              <stop offset="0%" stopColor={isDarkMode ? '#FDBA74' : '#FFF7ED'} stopOpacity={isDarkMode ? '0.14' : '0.54'} />
              <stop offset="100%" stopColor={isDarkMode ? '#FDBA74' : '#FFF7ED'} stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect x="6" y="6" width="588" height="668" fill={`url(#${idPrefix}envTerracottaBg)`} />
          {/* Warm Sun-Washed Venetian Plaster Trowel Clouds */}
          <ellipse cx="145" cy="185" rx="190" ry="135" fill={isDarkMode ? '#4A2F24' : '#F4DFD1'} opacity="0.42" />
          <ellipse cx="470" cy="495" rx="200" ry="140" fill={isDarkMode ? '#3D241B' : '#D9A68A'} opacity="0.28" />
          {/* Diagonal Sunlit Mediterranean Window Beam */}
          <polygon points="18,16 335,16 584,365 584,565 18,225" fill={`url(#${idPrefix}envPlasterSun)`} />
          {/* Dappled Olive-Branch Botanical Shadow Across Top-Right Corner */}
          <g fill={isDarkMode ? '#120A07' : '#8C533B'} opacity={isDarkMode ? '0.28' : '0.11'}>
            <path
              d="M582,36 C515,72 456,118 398,176"
              fill="none"
              stroke={isDarkMode ? '#120A07' : '#8C533B'}
              strokeWidth="4.5"
              strokeLinecap="round"
            />
            <ellipse cx="526" cy="56" rx="24" ry="8" transform="rotate(-24 526 56)" />
            <ellipse cx="492" cy="96" rx="26" ry="8.5" transform="rotate(22 492 96)" />
            <ellipse cx="454" cy="108" rx="23" ry="7.5" transform="rotate(-32 454 108)" />
            <ellipse cx="430" cy="150" rx="25" ry="8" transform="rotate(18 430 150)" />
            <ellipse cx="394" cy="166" rx="20" ry="7" transform="rotate(-22 394 166)" />
            <ellipse cx="554" cy="102" rx="22" ry="7.5" transform="rotate(32 554 102)" />
          </g>
          {/* Minimal Architectural Limewash Inset Line */}
          <rect
            x="28"
            y="28"
            width="544"
            height="624"
            rx="28"
            fill="none"
            stroke={isDarkMode ? '#B4795E' : '#BA7B5E'}
            strokeWidth="1.1"
            opacity="0.45"
          />
        </g>
      )}

      {/* 17. LILAC SILK & FRESHWATER PEARLS ('lavenderSilk' — Couture) */}
      {environment === 'lavenderSilk' && (
        <g>
          <defs>
            <linearGradient id={`${idPrefix}envLilacSilkBg`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isDarkMode ? '#2D2140' : '#FAF5FF'} />
              <stop offset="50%" stopColor={isDarkMode ? '#221833' : '#EFE2FE'} />
              <stop offset="100%" stopColor={isDarkMode ? '#181126' : '#E2CCF9'} />
            </linearGradient>
            <radialGradient id={`${idPrefix}envLilacPearlHalo`} cx="50%" cy="38%" r="48%">
              <stop offset="0%" stopColor={isDarkMode ? '#A78BFA' : '#FFFFFF'} stopOpacity={isDarkMode ? '0.18' : '0.72'} />
              <stop offset="100%" stopColor={isDarkMode ? '#221833' : '#EFE2FE'} stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect x="6" y="6" width="588" height="668" fill={`url(#${idPrefix}envLilacSilkBg)`} />
          <circle cx="300" cy="275" r="240" fill={`url(#${idPrefix}envLilacPearlHalo)`} />
          {/* Iridescent Flowing Wisteria Charmeuse Silk Waves */}
          <path
            d="M10,148 C185,72 308,255 590,118 L590,315 C345,425 190,230 10,342 Z"
            fill={isDarkMode ? '#412F5E' : '#FFFFFF'}
            opacity={isDarkMode ? '0.32' : '0.56'}
          />
          <path
            d="M10,418 C215,325 368,512 590,382 L590,582 C382,645 196,490 10,592 Z"
            fill={isDarkMode ? '#4C3670' : '#DDD6FE'}
            opacity={isDarkMode ? '0.26' : '0.44'}
          />
          {/* Fine Silver-Gilded Bridal Arch Molding */}
          <path
            d="M40,642 L40,256 A260,224 0 0,1 560,256 L560,642 Z"
            fill="none"
            stroke={isDarkMode ? '#C4B5FD' : '#A78BFA'}
            strokeWidth="1.3"
            opacity="0.6"
          />
          <path
            d="M50,634 L50,260 A250,214 0 0,1 550,260 L550,634 Z"
            fill="none"
            stroke={isDarkMode ? '#EDE9FE' : '#C4B5FD'}
            strokeWidth="0.9"
            strokeDasharray="4 4"
            opacity="0.58"
          />
          {/* Scattered Iridescent Freshwater Pearl Motes & Diamond Glints */}
          <g>
            {[
              { x: 96, y: 122, r: 5.5 },
              { x: 504, y: 128, r: 5.2 },
              { x: 74, y: 242, r: 4 },
              { x: 526, y: 254, r: 4.2 },
              { x: 118, y: 468, r: 3.8 },
              { x: 486, y: 482, r: 4.4 },
              { x: 300, y: 58, r: 6 },
            ].map((p, idx) => (
              <g key={`lilac-pearl-${idx}`}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={p.r}
                  fill="#FFFDF9"
                  stroke={isDarkMode ? '#C4B5FD' : '#D8B4FE'}
                  strokeWidth="1"
                  opacity="0.92"
                />
                <circle cx={p.x - p.r * 0.28} cy={p.y - p.r * 0.28} r={p.r * 0.3} fill="#FFFFFF" />
              </g>
            ))}
            <g fill={isDarkMode ? '#EDE9FE' : '#8B5CF6'} opacity="0.65">
              <path d="M158,86 L160,92 L166,94 L160,96 L158,102 L156,96 L150,94 L156,92 Z" />
              <path d="M442,90 L444,96 L450,98 L444,100 L442,106 L440,100 L434,98 L440,96 Z" />
            </g>
          </g>
        </g>
      )}

      {/* 18. PARISIAN TWILIGHT BALCONY ('parisBalcony' — Couture) */}
      {environment === 'parisBalcony' && (
        <g>
          <defs>
            <linearGradient id={`${idPrefix}envParisSky`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={isDarkMode ? '#2B1F36' : '#FCE2EB'} />
              <stop offset="48%" stopColor={isDarkMode ? '#231D38' : '#EBD8F0'} />
              <stop offset="100%" stopColor={isDarkMode ? '#16162B' : '#CFD9F4'} />
            </linearGradient>
          </defs>
          <rect x="6" y="6" width="588" height="668" fill={`url(#${idPrefix}envParisSky)`} />
          {/* Soft Parisian Twilight Sky Horizon Glow */}
          <ellipse
            cx="300"
            cy="435"
            rx="270"
            ry="120"
            fill={isDarkMode ? '#F472B6' : '#FFF1F2'}
            opacity={isDarkMode ? '0.12' : '0.46'}
          />
          {/* Distant Haussmann Rooflines & Mansard Chimneys Silhouette */}
          <path
            d="M6,535 L58,535 L70,488 L138,488 L150,524 L218,524 L232,494 L274,494 L286,472 L314,472 L326,494 L372,494 L388,524 L452,524 L464,486 L532,486 L546,535 L594,535 L594,674 L6,674 Z"
            fill={isDarkMode ? '#141224' : '#B7AECB'}
            opacity={isDarkMode ? '0.78' : '0.36'}
          />
          {/* Haussmann French Window Arch Framing */}
          <path
            d="M36,646 L36,246 A264,218 0 0,1 564,246 L564,646 Z"
            fill="none"
            stroke={isDarkMode ? '#C4B5D8' : '#8E7FA3'}
            strokeWidth="1.6"
            opacity="0.58"
          />
          {/* Ornate Scrolling Parisian Wrought-Iron Balcony Balustrade */}
          <g
            stroke={isDarkMode ? '#433859' : '#574E6B'}
            fill="none"
            opacity={isDarkMode ? '0.75' : '0.42'}
          >
            <line x1="22" y1="538" x2="578" y2="538" strokeWidth="3.2" />
            <line x1="22" y1="548" x2="578" y2="548" strokeWidth="1.4" />
            <line x1="22" y1="636" x2="578" y2="636" strokeWidth="2.8" />
            {[64, 138, 212, 388, 462, 536].map((x) => (
              <g key={`paris-rail-${x}`}>
                <line x1={x} y1="548" x2={x} y2="636" strokeWidth="1.6" />
                <path
                  d={`M${x - 24},592 C${x - 24},566 ${x},566 ${x},592 C${x},618 ${x + 24},618 ${x + 24},592`}
                  strokeWidth="1.4"
                />
                <circle cx={x} cy="566" r="4.5" strokeWidth="1.2" />
              </g>
            ))}
          </g>
          {/* Warm Parisian Café Lantern Bokeh Orbs & Twilight Stars */}
          <g>
            <circle cx="98" cy="148" r="14" fill="#FDE68A" opacity={isDarkMode ? '0.2' : '0.35'} />
            <circle cx="506" cy="176" r="18" fill="#FDE68A" opacity={isDarkMode ? '0.18' : '0.32'} />
            <circle cx="136" cy="442" r="9" fill="#FCD34D" opacity={isDarkMode ? '0.34' : '0.42'} />
            <circle cx="468" cy="450" r="11" fill="#FCD34D" opacity={isDarkMode ? '0.3' : '0.38'} />
            <path
              d="M300,46 L302.5,54 L310,56.5 L302.5,59 L300,67 L297.5,59 L290,56.5 L297.5,54 Z"
              fill={isDarkMode ? '#FDE68A' : '#FFFFFF'}
              opacity="0.88"
            />
          </g>
        </g>
      )}

      {/* 19. SAKURA SPRING SUNBEAM ('sakuraBreeze' — Couture) */}
      {environment === 'sakuraBreeze' && (
        <g>
          <defs>
            <linearGradient id={`${idPrefix}envSakuraBg`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isDarkMode ? '#352029' : '#FFF8FA'} />
              <stop offset="50%" stopColor={isDarkMode ? '#271720' : '#FFE7F0'} />
              <stop offset="100%" stopColor={isDarkMode ? '#1C1017' : '#FCD8E5'} />
            </linearGradient>
            <linearGradient id={`${idPrefix}envSakuraRay`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFF7ED" stopOpacity={isDarkMode ? '0.14' : '0.58'} />
              <stop offset="100%" stopColor="#FFF7ED" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect x="6" y="6" width="588" height="668" fill={`url(#${idPrefix}envSakuraBg)`} />
          {/* Diagonal Morning Spring Sunbeams */}
          <polygon points="10,10 195,10 510,540 355,670 10,210" fill={`url(#${idPrefix}envSakuraRay)`} />
          <polygon points="245,10 345,10 590,340 590,460" fill={`url(#${idPrefix}envSakuraRay)`} opacity="0.7" />
          {/* Delicate Corner Cherry Blossom Boughs (Leaving Center Clear for Bouquet) */}
          <g opacity={isDarkMode ? '0.72' : '0.88'}>
            <path
              d="M12,92 C66,86 118,68 172,34 M68,80 C94,104 118,122 146,136"
              fill="none"
              stroke={isDarkMode ? '#9D7A84' : '#8C6268'}
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            <path
              d="M588,124 C534,116 486,92 436,48 M524,108 C498,132 478,150 452,162"
              fill="none"
              stroke={isDarkMode ? '#9D7A84' : '#8C6268'}
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Watercolor Sakura Blossoms on Corner Branches */}
            {[
              { x: 52, y: 84, s: 1.0 },
              { x: 112, y: 66, s: 0.9 },
              { x: 158, y: 44, s: 0.78 },
              { x: 136, y: 128, s: 0.82 },
              { x: 544, y: 116, s: 0.95 },
              { x: 486, y: 88, s: 0.85 },
              { x: 444, y: 54, s: 0.76 },
              { x: 462, y: 156, s: 0.8 },
            ].map((b, idx) => (
              <g key={`sakura-bloom-${idx}`} transform={`translate(${b.x}, ${b.y}) scale(${b.s})`}>
                {[0, 72, 144, 216, 288].map((deg) => (
                  <ellipse
                    key={deg}
                    cx="0"
                    cy="-8"
                    rx="4.6"
                    ry="7.5"
                    transform={`rotate(${deg})`}
                    fill={isDarkMode ? '#F9A8D4' : '#FBCFE8'}
                    stroke="#FFFFFF"
                    strokeWidth="0.6"
                  />
                ))}
                <circle cx="0" cy="0" r="2.8" fill="#FDE68A" />
              </g>
            ))}
          </g>
          {/* Floating Translucent Drifting Sakura Petals */}
          <g fill={isDarkMode ? '#F472B6' : '#F9A8D4'} opacity={isDarkMode ? '0.45' : '0.68'}>
            <path d="M94,218 C104,210 112,222 100,232 C92,228 88,222 94,218 Z" />
            <path d="M510,248 C520,240 526,252 514,262 C506,258 504,252 510,248 Z" />
            <path d="M78,392 C88,384 96,396 84,406 C76,402 72,396 78,392 Z" />
            <path d="M524,422 C534,414 540,426 528,436 C520,432 518,426 524,422 Z" />
            <path d="M138,548 C146,542 154,552 142,560 C136,556 134,552 138,548 Z" />
            <path d="M466,556 C474,550 482,560 470,568 C464,564 462,560 466,556 Z" />
          </g>
          {/* Delicate Rose-Gold Hairline Border */}
          <rect
            x="28"
            y="28"
            width="544"
            height="624"
            rx="28"
            fill="none"
            stroke={isDarkMode ? '#F472B6' : '#F9A8D4'}
            strokeWidth="1.1"
            opacity="0.52"
          />
        </g>
      )}
      </g>
    </g>
  );
};

/**
 * 6 Unique Botanical Photocard Keepsakes (Polaroid, Postage Stamp, Oval Cameo, Vintage Film, Pressed Frame, Arch Card)
 */
export const BouquetPhotoCardSVG: React.FC<{
  item: BouquetItem;
  idPrefix?: string;
}> = ({ item, idPrefix = '' }) => {
  const style: PhotoFrameStyle = item.photoStyle || 'polaroid';
  const frameColor = item.petalColor || '#FFFDF9';
  const accentColor = item.centerColor || '#E11D48';
  const caption = (item.photoCaption ?? 'Sweet Memory').slice(0, 22);
  const clipId = `${idPrefix}photo-frame-clip-${item.id}`;

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
  svgRef?: React.RefObject<SVGSVGElement | null> | React.RefObject<SVGSVGElement> | any;
  isPreviewMode: boolean;
  isDarkMode?: boolean;
  bloomedCount?: number;
  bloomRevealRunId?: number;
  bloomRevealActive?: boolean;
  isReducedMotion?: boolean;
  onBloomCardStageReached?: () => void;
  onBloomFinished?: () => void;
  showCardInGiftView?: boolean;
  isVoicePlaying?: boolean;
  snapshotOverride?: BouquetSnapshot;
  instanceIdPrefix?: string;
  isCardThumbnail?: boolean;
  onCardTagClick?: () => void;
  onVoiceKeepsakeClick?: () => void;
  onCardSelect?: () => void;
  onVoiceSelect?: () => void;
  onItemSelect?: (itemId: string) => void;
  onWrapperClick?: () => void;
  onRibbonClick?: () => void;
  onPhotoCardUploadClick?: (itemId: string) => void;
  onPhotoCardClick?: (item: BouquetItem) => void;
  onBouquetSelect?: () => void;
  canvasZoom?: number;
  canvasPan?: { x: number; y: number };
  onCanvasPanChange?: (pan: { x: number; y: number }) => void;
}

export const BouquetStage: React.FC<BouquetStageProps> = ({
  svgRef,
  isPreviewMode,
  isDarkMode = false,
  bloomedCount,
  bloomRevealRunId = 0,
  bloomRevealActive,
  isReducedMotion = false,
  onBloomCardStageReached,
  onBloomFinished,
  showCardInGiftView = true,
  isVoicePlaying = false,
  snapshotOverride,
  instanceIdPrefix = '',
  isCardThumbnail = false,
  onCardTagClick,
  onVoiceKeepsakeClick,
  onCardSelect,
  onVoiceSelect,
  onItemSelect,
  onWrapperClick,
  onRibbonClick,
  onPhotoCardUploadClick,
  onPhotoCardClick,
  onBouquetSelect,
  canvasZoom = 1,
  canvasPan = { x: 0, y: 0 },
  onCanvasPanChange,
}) => {
  const storeState = useBouquetStore();
  const items = snapshotOverride ? snapshotOverride.items : storeState.items;
  const selectedId = snapshotOverride ? null : storeState.selectedId;
  const wrapStyle = snapshotOverride ? snapshotOverride.wrapStyle : storeState.wrapStyle;
  const wrapColor = snapshotOverride ? snapshotOverride.wrapColor : storeState.wrapColor;
  const ribbonColor = snapshotOverride ? snapshotOverride.ribbonColor : storeState.ribbonColor;
  const ribbonStyle = snapshotOverride ? (snapshotOverride.ribbonStyle || 'satin') : storeState.ribbonStyle;
  const environment = snapshotOverride ? (snapshotOverride.environment || 'studio') : storeState.environment;
  const bouquetPose = snapshotOverride ? snapshotOverride.bouquetPose : storeState.bouquetPose;
  const card = snapshotOverride ? snapshotOverride.card : storeState.card;
  const voice = snapshotOverride ? snapshotOverride.voice : storeState.voice;
  const {
    selectItem,
    updateItem,
    updateCard,
    updateVoice,
    updateBouquetPose,
    resetBouquetPose,
    toggleWrapVisibility,
    deleteSelected,
    flipSelected,
    toggleItemLock,
    commitHistorySnapshot
  } = storeState;

  const reactInstanceId = React.useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const idPrefix = `${instanceIdPrefix || ''}${reactInstanceId}-`;
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
  const [isPanningCanvas, setIsPanningCanvas] = useState(false);
  const panDragRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startPanX: number;
    startPanY: number;
  } | null>(null);

  const prevVoiceStyleRef = useRef(voice?.style);
  const prevVoiceVisibleRef = useRef(voice?.visibleOnStage);
  const prevCardThemeRef = useRef(card.theme);

  useEffect(() => {
    if (selectedId) {
      setActiveSpecialObject(null);
    }
  }, [selectedId]);

  useEffect(() => {
    const styleChanged = prevVoiceStyleRef.current !== voice?.style;
    const becameVisible = !prevVoiceVisibleRef.current && Boolean(voice?.visibleOnStage);
    prevVoiceStyleRef.current = voice?.style;
    prevVoiceVisibleRef.current = voice?.visibleOnStage;
    if (!isPreviewMode && voice?.visibleOnStage && (styleChanged || becameVisible)) {
      setActiveSpecialObject('voice');
    }
  }, [voice?.style, voice?.visibleOnStage, isPreviewMode]);

  useEffect(() => {
    const themeChanged = prevCardThemeRef.current !== card.theme;
    prevCardThemeRef.current = card.theme;
    if (!isPreviewMode && card.visibleOnStage && themeChanged) {
      setActiveSpecialObject('card');
    }
  }, [card.theme, card.visibleOnStage, isPreviewMode]);

  const localSvgRef = useRef<SVGSVGElement | null>(null);
  const attachSvgRef = useCallback(
    (node: SVGSVGElement | null) => {
      localSvgRef.current = node;
      if (svgRef && typeof svgRef === 'object' && 'current' in svgRef) {
        svgRef.current = node;
      }
    },
    [svgRef]
  );

  // Convert client pointer coordinates to SVG viewBox (-24..624 x 0..680, 648x680) coordinates
  const clientToSvgCoords = useCallback(
    (clientX: number, clientY: number) => {
      const svg = (svgRef && svgRef.current) || localSvgRef.current;
      if (!svg) return { x: 300, y: 340 };
      const rect = svg.getBoundingClientRect();
      const vbX = -24;
      const vbY = 0;
      const vbW = 648;
      const vbH = 680;
      const scale = Math.min(rect.width / vbW, rect.height / vbH) || 1;
      const renderedW = vbW * scale;
      const renderedH = vbH * scale;
      const offsetX = rect.left + (rect.width - renderedW) / 2;
      const offsetY = rect.top + (rect.height - renderedH) / 2;
      const x = vbX + ((clientX - offsetX) / Math.max(1, renderedW)) * vbW;
      const y = vbY + ((clientY - offsetY) / Math.max(1, renderedH)) * vbH;
      return { x, y };
    },
    [svgRef]
  );

  // Convert SVG viewBox coordinates into local bouquet space (accounting for bouquetPose x, y, scale, rotation around 300,380)
  const svgToBouquetLocalCoords = useCallback(
    (svgX: number, svgY: number) => mapSvgToBouquetLocal(svgX, svgY, pose),
    [pose]
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
    onItemSelect?.(item.id);
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
    onItemSelect?.(item.id);
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
        const rawDx = localPt.x - interaction.startPointerX;
        const rawDy = localPt.y - interaction.startPointerY;
        if (Math.abs(rawDx) > 0.5 || Math.abs(rawDy) > 0.5) {
          if (!hasCommittedDragHistoryRef.current) {
            commitHistorySnapshot();
            hasCommittedDragHistoryRef.current = true;
          }
          const movingItem = items.find((it) => it.id === interaction.itemId);
          const isClocheGathered =
            wrapStyle === 'cloche' &&
            movingItem &&
            getEffectiveItemPlane(movingItem) !== 'front' &&
            !(movingItem.photoStyle && !movingItem.clippedToBouquet);
          const dx = isClocheGathered ? rawDx / 0.64 : rawDx;
          const dy = isClocheGathered ? rawDy / 0.7 : rawDy;
          const rawTargetX = interaction.startItemX + dx;
          const rawTargetY = interaction.startItemY + dy;
          let nx: number;
          let ny: number;
          if (isClocheGathered) {
            nx = Math.max(-40, Math.min(640, Math.round(rawTargetX)));
            ny = Math.max(38, Math.min(624, Math.round(rawTargetY)));
          } else {
            const clamped = clampBouquetLocalPointToStage(rawTargetX, rawTargetY, pose);
            nx = clamped.x;
            ny = clamped.y;
          }
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
          const nx = Math.max(
            STAGE_DRAG_MIN_X,
            Math.min(STAGE_DRAG_MAX_X, Math.round(interaction.startItemX + dx))
          );
          const ny = Math.max(
            STAGE_DRAG_MIN_Y,
            Math.min(STAGE_DRAG_MAX_Y, Math.round(interaction.startItemY + dy))
          );
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
          const nx = Math.max(
            STAGE_DRAG_MIN_X,
            Math.min(STAGE_DRAG_MAX_X, Math.round(interaction.startItemX + dx))
          );
          const ny = Math.max(
            STAGE_DRAG_MIN_Y,
            Math.min(STAGE_DRAG_MAX_Y, Math.round(interaction.startItemY + dy))
          );
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
      wrapStyle,
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
  const selectedDisplay = selectedItem ? getStageItemDisplayTransform(selectedItem, wrapStyle) : null;
  const wrapperBottomClipY =
    wrapStyle === 'corsetSilk'
      ? 588
      : wrapStyle === 'basket'
      ? 596
      : wrapStyle === 'crepeFan'
      ? 602
      : wrapStyle === 'vase' ||
        wrapStyle === 'chinoiserieUrn' ||
        wrapStyle === 'waxPaper' ||
        wrapStyle === 'burlapSack'
      ? 610
      : wrapStyle === 'cloche'
      ? 560
      : wrapStyle === 'plain'
      ? 650
      : 616;

  // ============================================================================
  // STAGED BOTANICAL UNWRAP CHOREOGRAPHY + LIVING BREEZE & INTERACTIVE RUSTLE
  // Zero React setState per frame: writes SVG transforms directly via DOM refs.
  // ============================================================================
  const useLivingChoreography = isPreviewMode && !isCardThumbnail && bloomRevealActive !== undefined;
  const bloomPlan = useMemo(
    () => (useLivingChoreography ? buildBouquetBloomPlan(items, wrapStyle, isReducedMotion) : null),
    [useLivingChoreography, items, wrapStyle, isReducedMotion]
  );

  const itemMotionRefs = useRef<Map<string, SVGGElement>>(new Map());
  const clocheStemRefs = useRef<Map<string, SVGGElement>>(new Map());
  const wrapperBackMotionRef = useRef<SVGGElement | null>(null);
  const wrapperStemBundleMotionRef = useRef<SVGGElement | null>(null);
  const wrapperFrontMotionRef = useRef<SVGGElement | null>(null);
  const cardMotionRef = useRef<SVGGElement | null>(null);
  const voiceMotionRef = useRef<SVGGElement | null>(null);
  const rustleStateMapRef = useRef<Map<string, StemRustleState>>(new Map());
  const lastRustlePointerRef = useRef<{ x: number; y: number; timeMs: number } | null>(null);
  const lastRustleMoveMsRef = useRef<number>(0);
  const activeRustleRef = useRef<boolean>(false);
  const bloomCallbacksRef = useRef({ onBloomCardStageReached, onBloomFinished });
  bloomCallbacksRef.current = { onBloomCardStageReached, onBloomFinished };

  const registerItemMotionRef = useCallback((id: string) => {
    return (node: SVGGElement | null) => {
      if (node) {
        itemMotionRefs.current.set(id, node);
      } else {
        itemMotionRefs.current.delete(id);
      }
    };
  }, []);

  const registerClocheStemRef = useCallback((id: string) => {
    return (node: SVGGElement | null) => {
      if (node) {
        clocheStemRefs.current.set(id, node);
      } else {
        clocheStemRefs.current.delete(id);
      }
    };
  }, []);

  const clearAllMotionTransforms = useCallback(() => {
    const resetEl = (el: SVGGElement | null) => {
      if (!el) return;
      el.removeAttribute('transform');
      el.removeAttribute('opacity');
    };
    resetEl(wrapperBackMotionRef.current);
    resetEl(wrapperStemBundleMotionRef.current);
    resetEl(wrapperFrontMotionRef.current);
    resetEl(cardMotionRef.current);
    resetEl(voiceMotionRef.current);
    itemMotionRefs.current.forEach((el) => resetEl(el));
    clocheStemRefs.current.forEach((el) => resetEl(el));
  }, []);

  useEffect(() => {
    const svgEl = (svgRef && svgRef.current) || localSvgRef.current;

    if (!useLivingChoreography || !bloomPlan) {
      clearAllMotionTransforms();
      rustleStateMapRef.current.clear();
      lastRustlePointerRef.current = null;
      activeRustleRef.current = false;
      if (svgEl) svgEl.setAttribute('data-bloom-phase', 'static');
      return;
    }

    // Keep rustle state map aligned with current bouquet items
    const validIds = new Set(bloomPlan.items.map((it) => it.id));
    rustleStateMapRef.current.forEach((_v, k) => {
      if (!validIds.has(k)) rustleStateMapRef.current.delete(k);
    });
    bloomPlan.items.forEach((it) => {
      if (!rustleStateMapRef.current.has(it.id)) {
        rustleStateMapRef.current.set(it.id, createZeroRustleState());
      }
    });

    const cardAnchorX = card.x ?? 410;
    const cardAnchorY = card.y ?? 525;
    const voiceAnchorX = voice?.x ?? 185;
    const voiceAnchorY = voice?.y ?? 525;

    // Cache last written SVG attributes per node so unchanged values never cause DOM writes
    const lastTransformMap = new WeakMap<SVGGElement, string>();
    const lastOpacityMap = new WeakMap<SVGGElement, string>();

    const writeNodeMotion = (el: SVGGElement | null, transformStr: string, opacityVal: number) => {
      if (!el) return;
      if (lastTransformMap.get(el) !== transformStr) {
        if (transformStr) {
          el.setAttribute('transform', transformStr);
        } else {
          el.removeAttribute('transform');
        }
        lastTransformMap.set(el, transformStr);
      }
      const opStr = opacityVal >= 1 ? '' : String(opacityVal);
      if (lastOpacityMap.get(el) !== opStr) {
        if (opStr) {
          el.setAttribute('opacity', opStr);
        } else {
          el.removeAttribute('opacity');
        }
        lastOpacityMap.set(el, opStr);
      }
    };

    let wrapperSettled = false;
    let cardSettled = false;
    let voiceSettled = false;

    const applyFrameAt = (elapsedMs: number, liveTimeSec: number, dtSec: number) => {
      // Beat 1: Wrapper & ribbon settle (skipped completely once settled!)
      if (!wrapperSettled) {
        const wrapEval = evaluateWrapperReveal(bloomPlan, elapsedMs);
        const wrapTransform =
          wrapEval.revealProgress >= 1 ? '' : formatPivotMotionTransform(wrapEval, 300, 465);
        writeNodeMotion(wrapperBackMotionRef.current, wrapTransform, wrapEval.opacity);
        writeNodeMotion(wrapperStemBundleMotionRef.current, wrapTransform, wrapEval.opacity);
        writeNodeMotion(wrapperFrontMotionRef.current, wrapTransform, wrapEval.opacity);
        if (wrapEval.revealProgress >= 1 && wrapEval.opacity >= 1) {
          wrapperSettled = true;
        }
      }

      // Beat 2 & Beat 3 (Photocards) + Living Breeze & Rustle
      let anyRustleEnergy = false;
      for (let i = 0; i < bloomPlan.items.length; i++) {
        const stem = bloomPlan.items[i];
        const rustle = rustleStateMapRef.current.get(stem.id);
        if (rustle && dtSec > 0 && !bloomPlan.reducedMotion) {
          if (stepRustlePhysics(rustle, stem, dtSec)) {
            anyRustleEnergy = true;
          }
        }
        const evalT = evaluateStemFrame(stem, elapsedMs, liveTimeSec, rustle, bloomPlan.reducedMotion);
        const node = itemMotionRefs.current.get(stem.id);
        if (node) {
          const tStr = formatPivotMotionTransform(evalT, stem.pivotX, stem.pivotY);
          writeNodeMotion(node, tStr, evalT.opacity);
        }
        const clocheNode = clocheStemRefs.current.get(stem.id);
        if (clocheNode) {
          const cStr = formatPivotMotionTransform(evalT, 300, 484);
          writeNodeMotion(clocheNode, cStr, evalT.opacity);
        }
      }
      activeRustleRef.current = anyRustleEnergy;

      // Beat 3: Greeting Card & Voice Keepsake (skipped completely once settled!)
      if (!cardSettled) {
        const cardNode = cardMotionRef.current;
        if (cardNode) {
          const cardEval = evaluateKeepsakeReveal(
            bloomPlan.cardDelayMs,
            bloomPlan.cardDurationMs,
            elapsedMs,
            bloomPlan.reducedMotion,
            -1
          );
          const cardTransform =
            cardEval.revealProgress >= 1
              ? ''
              : formatPivotMotionTransform(cardEval, cardAnchorX, cardAnchorY);
          writeNodeMotion(cardNode, cardTransform, cardEval.opacity);
          if (cardEval.revealProgress >= 1 && cardEval.opacity >= 1) {
            cardSettled = true;
          }
        }
      }

      if (!voiceSettled) {
        const voiceNode = voiceMotionRef.current;
        if (voiceNode) {
          const voiceEval = evaluateKeepsakeReveal(
            bloomPlan.voiceDelayMs,
            bloomPlan.voiceDurationMs,
            elapsedMs,
            bloomPlan.reducedMotion,
            1
          );
          const voiceTransform =
            voiceEval.revealProgress >= 1
              ? ''
              : formatPivotMotionTransform(voiceEval, voiceAnchorX, voiceAnchorY);
          writeNodeMotion(voiceNode, voiceTransform, voiceEval.opacity);
          if (voiceEval.revealProgress >= 1 && voiceEval.opacity >= 1) {
            voiceSettled = true;
          }
        }
      }
    };

    // Waiting behind prelude: hold tucked t=0 pose at 0Hz CPU
    if (!bloomRevealActive) {
      rustleStateMapRef.current.forEach((s) => {
        s.angleDeg = 0;
        s.angularVel = 0;
        s.pushX = 0;
        s.pushY = 0;
        s.velX = 0;
        s.velY = 0;
      });
      activeRustleRef.current = false;
      applyFrameAt(0, 0, 0);
      if (svgEl) svgEl.setAttribute('data-bloom-phase', 'hidden');
      return;
    }

    // Reset rustle on fresh unwrap / replay run
    rustleStateMapRef.current.forEach((s) => {
      s.angleDeg = 0;
      s.angularVel = 0;
      s.pushX = 0;
      s.pushY = 0;
      s.velX = 0;
      s.velY = 0;
    });
    activeRustleRef.current = false;

    let rafId = 0;
    let startTimeMs: number | null = null;
    let lastPaintMs: number | null = null;
    let pausedAtMs: number | null = null;
    let accumulatedPauseMs = 0;
    let cardNotified = false;
    let finishedNotified = false;
    let cancelled = false;

    if (svgEl) svgEl.setAttribute('data-bloom-phase', 'animating');
    applyFrameAt(0, 0, 0);

    const tick = (nowMs: number) => {
      if (cancelled) return;
      if (typeof document !== 'undefined' && document.hidden) {
        rafId = 0;
        return;
      }

      if (startTimeMs === null) {
        startTimeMs = nowMs;
        lastPaintMs = nowMs;
      }

      // Adaptive frame pacing: full refresh rate during spring emergence or active rustle,
      // calm ~30fps cadence once fully settled in gentle ambient breeze (halves SVG paint load).
      if (
        finishedNotified &&
        !activeRustleRef.current &&
        lastPaintMs !== null &&
        nowMs - lastPaintMs < LIVING_BREEZE_FRAME_INTERVAL_MS
      ) {
        rafId = window.requestAnimationFrame(tick);
        return;
      }

      const elapsedMs = Math.max(0, nowMs - startTimeMs - accumulatedPauseMs);
      const dtSec =
        lastPaintMs === null ? 0.016 : Math.min(0.032, Math.max(0.001, (nowMs - lastPaintMs) / 1000));
      lastPaintMs = nowMs;

      applyFrameAt(elapsedMs, elapsedMs / 1000, dtSec);

      if (!cardNotified && elapsedMs >= bloomPlan.cardDelayMs) {
        cardNotified = true;
        bloomCallbacksRef.current.onBloomCardStageReached?.();
      }
      if (!finishedNotified && elapsedMs >= bloomPlan.totalBloomMs) {
        finishedNotified = true;
        if (svgEl) {
          svgEl.setAttribute('data-bloom-phase', bloomPlan.reducedMotion ? 'static' : 'living');
        }
        bloomCallbacksRef.current.onBloomFinished?.();
      }

      // Reduced motion settles cleanly and stops the rAF loop completely (0Hz)
      if (bloomPlan.reducedMotion && finishedNotified) {
        rafId = 0;
        return;
      }

      rafId = window.requestAnimationFrame(tick);
    };

    const handleVisibilityChange = () => {
      if (cancelled) return;
      if (document.hidden) {
        if (rafId !== 0) {
          window.cancelAnimationFrame(rafId);
          rafId = 0;
        }
        pausedAtMs = performance.now();
        lastPaintMs = null;
      } else {
        if (pausedAtMs !== null) {
          accumulatedPauseMs += Math.max(0, performance.now() - pausedAtMs);
          pausedAtMs = null;
        }
        lastPaintMs = null;
        if (rafId === 0 && !(bloomPlan.reducedMotion && finishedNotified)) {
          rafId = window.requestAnimationFrame(tick);
        }
      }
    };

    rafId = window.requestAnimationFrame(tick);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      cancelled = true;
      if (rafId !== 0) {
        window.cancelAnimationFrame(rafId);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [
    useLivingChoreography,
    bloomPlan,
    bloomRevealActive,
    bloomRevealRunId,
    card.x,
    card.y,
    voice?.x,
    voice?.y,
    clearAllMotionTransforms,
    svgRef,
  ]);

  const triggerPresentationRustle = useCallback(
    (clientX: number, clientY: number, mode: 'move' | 'tap') => {
      if (!useLivingChoreography || !bloomRevealActive || !bloomPlan || bloomPlan.reducedMotion) return;
      const nowMs = performance.now();
      if (mode === 'move' && nowMs - lastRustleMoveMsRef.current < RUSTLE_POINTER_THROTTLE_MS) {
        return;
      }
      lastRustleMoveMsRef.current = nowMs;

      const svgPt = clientToSvgCoords(clientX, clientY);
      const localPt = svgToBouquetLocalCoords(svgPt.x, svgPt.y);

      if (mode === 'tap') {
        bloomPlan.items.forEach((stem) => {
          const st = rustleStateMapRef.current.get(stem.id);
          if (st) applyPointerRustleImpulse(st, stem, localPt.x, localPt.y, 0, 0, 'tap');
        });
        activeRustleRef.current = true;
        lastRustlePointerRef.current = { x: localPt.x, y: localPt.y, timeMs: nowMs };
        return;
      }

      const prev = lastRustlePointerRef.current;
      lastRustlePointerRef.current = { x: localPt.x, y: localPt.y, timeMs: nowMs };
      if (!prev) return;
      const dtSec = Math.max(0.008, (nowMs - prev.timeMs) / 1000);
      if (dtSec > 0.25) return;
      const vx = (localPt.x - prev.x) / dtSec;
      const vy = (localPt.y - prev.y) / dtSec;

      bloomPlan.items.forEach((stem) => {
        const st = rustleStateMapRef.current.get(stem.id);
        if (st) applyPointerRustleImpulse(st, stem, localPt.x, localPt.y, vx, vy, 'move');
      });
      activeRustleRef.current = true;
    },
    [useLivingChoreography, bloomRevealActive, bloomPlan, clientToSvgCoords, svgToBouquetLocalCoords]
  );

  const visibleRenderItems =
    !useLivingChoreography && bloomedCount !== undefined ? items.slice(0, bloomedCount) : items;

  const bouquetTransform = `translate(${pose.x}, ${pose.y}) rotate(${pose.rotation}) scale(${pose.scale}) translate(-300, -380)`;
  const softShadowFilter = isCardThumbnail ? undefined : `url(#${idPrefix}softShadow)`;
  // Skip expensive per-node SVG feDropShadow Gaussian blurs during live animated presentation mode
  // to eliminate 60fps CPU blur re-rasterization while preserving crisp vector depth & ground shadow.
  const animatedShadowFilter =
    isCardThumbnail || useLivingChoreography ? undefined : softShadowFilter;
  const envBackdrop = useMemo(
    () => getEnvironmentPageBackdrop(environment || 'studio', isDarkMode),
    [environment, isDarkMode]
  );

  const svgStageElement = (
      <svg
        ref={attachSvgRef}
        viewBox="-24 0 648 680"
        preserveAspectRatio={isCardThumbnail ? 'xMidYMid slice' : 'xMidYMid meet'}
        className={
          isCardThumbnail
            ? 'w-full h-full block pointer-events-none select-none'
            : `w-full h-full block touch-none ${
                !isPreviewMode && canvasZoom > 1
                  ? isPanningCanvas
                    ? 'cursor-grabbing'
                    : 'cursor-grab'
                  : ''
              }`
        }
        role="img"
        aria-label="Interactive Flower Bouquet Canvas"
        onPointerMove={(e) => {
          if (panDragRef.current && panDragRef.current.pointerId === e.pointerId && onCanvasPanChange) {
            const dx = e.clientX - panDragRef.current.startClientX;
            const dy = e.clientY - panDragRef.current.startClientY;
            const maxPan = Math.round(280 * Math.max(0.5, canvasZoom - 0.75));
            const nextX = Math.max(-maxPan, Math.min(maxPan, Math.round(panDragRef.current.startPanX + dx)));
            const nextY = Math.max(-maxPan, Math.min(maxPan, Math.round(panDragRef.current.startPanY + dy)));
            onCanvasPanChange({ x: nextX, y: nextY });
            return;
          }
          handleStagePointerMove(e);
          if (isPreviewMode && !isCardThumbnail) {
            triggerPresentationRustle(e.clientX, e.clientY, 'move');
          }
        }}
        onPointerUp={(e) => {
          if (panDragRef.current && panDragRef.current.pointerId === e.pointerId) {
            panDragRef.current = null;
            setIsPanningCanvas(false);
          }
          handleStagePointerUp();
        }}
        onPointerLeave={() => {
          lastRustlePointerRef.current = null;
        }}
        onPointerCancel={() => {
          if (panDragRef.current) {
            panDragRef.current = null;
            setIsPanningCanvas(false);
          }
          handleStagePointerUp();
          lastRustlePointerRef.current = null;
        }}
        onPointerDown={(e) => {
          if (!isPreviewMode && !isCardThumbnail) {
            selectItem(null);
            setActiveSpecialObject(null);
            if (canvasZoom > 1 && e.pointerType === 'mouse' && e.button === 0 && onCanvasPanChange) {
              panDragRef.current = {
                pointerId: e.pointerId,
                startClientX: e.clientX,
                startClientY: e.clientY,
                startPanX: canvasPan.x,
                startPanY: canvasPan.y,
              };
              setIsPanningCanvas(true);
              captureSvgPointer(e);
            }
          } else if (isPreviewMode && !isCardThumbnail) {
            triggerPresentationRustle(e.clientX, e.clientY, 'tap');
          }
        }}
      >
        <defs>
          {/* Stage Backdrop Gradient (Light Mode) */}
          <radialGradient id={`${idPrefix}stageBgGrad`} cx="50%" cy="42%" r="62%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="58%" stopColor="#FAFAF8" />
            <stop offset="100%" stopColor="#F5F1EB" stopOpacity={isCardThumbnail ? '1' : '0.96'} />
          </radialGradient>
          {/* Stage Backdrop Gradient (Soft Cashmere-Cocoa Dark Mode) */}
          <radialGradient id={`${idPrefix}stageBgGradDark`} cx="50%" cy="42%" r="62%">
            <stop offset="0%" stopColor="#3E3330" />
            <stop offset="58%" stopColor="#342B28" />
            <stop offset="100%" stopColor="#2B2321" stopOpacity={isCardThumbnail ? '1' : '0.98'} />
          </radialGradient>
          {/* Zero-blur soft radial studio ground shadow beneath bouquet base */}
          {!isCardThumbnail && (
            <radialGradient id={`${idPrefix}bouquetGroundShadow`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1C1917" stopOpacity={isDarkMode ? '0.26' : '0.12'} />
              <stop offset="58%" stopColor="#1C1917" stopOpacity={isDarkMode ? '0.11' : '0.05'} />
              <stop offset="100%" stopColor="#1C1917" stopOpacity="0" />
            </radialGradient>
          )}
          {/* Glass Cloche Front Sheen Gradient */}
          <linearGradient id={`${idPrefix}clocheFrontGlassGrad`} x1="0" y1="0" x2="1" y2="0.2">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.28" />
            <stop offset="35%" stopColor="#E0F2FE" stopOpacity="0.06" />
            <stop offset="75%" stopColor="#E0F2FE" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.22" />
          </linearGradient>

          {/* Kraft Paper Gradient */}
          <linearGradient id={`${idPrefix}kraftBackGrad`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#b08968" />
            <stop offset="100%" stopColor="#7f5539" />
          </linearGradient>
          <linearGradient id={`${idPrefix}kraftFrontGrad`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={wrapColor} />
            <stop offset="100%" stopColor="#b08968" />
          </linearGradient>

          {/* Soft Drop Shadow for Static Studio Edit Mode (Skipped in thumbnails & live animated presentation) */}
          {!isCardThumbnail && !useLivingChoreography && (
            <filter id={`${idPrefix}softShadow`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#1C1917" floodOpacity="0.06" />
            </filter>
          )}

          {/* Wrapper Bottom Stem Clip (Wide horizontal/top extent so stems are never cropped sideways; only trims below wrapper base) */}
          <clipPath id={`${idPrefix}bouquetWrapperBoundsClip`}>
            <rect x="-2400" y="-2400" width="5400" height={2400 + wrapperBottomClipY} />
          </clipPath>
          <clipPath id={`${idPrefix}bouquetClocheBoundsClip`}>
            <path d="M132,560 L132,276 A168,168 0 0,1 468,276 L468,560 Z" />
          </clipPath>

          {/* Stage Arch Clip for Environment Backdrops */}
          <clipPath id={`${idPrefix}stageArchClip`}>
            <rect
              x="-24"
              y="0"
              width="648"
              height="680"
              rx={isCardThumbnail ? '0' : '34'}
            />
          </clipPath>
        </defs>

        {/* 1. Arch Backdrop (Upsized within 648x680 ratio; fills 100% edge-to-edge on card thumbnails) */}
        <rect
          x="-24"
          y="0"
          width="648"
          height="680"
          rx={isCardThumbnail ? '0' : '34'}
          fill={`url(#${idPrefix}stageBgGrad)`}
        />
        <rect
          x="-24"
          y="0"
          width="648"
          height="680"
          rx={isCardThumbnail ? '0' : '34'}
          fill={`url(#${idPrefix}stageBgGradDark)`}
          style={{
            opacity: isDarkMode ? 1 : 0,
            transition: isCardThumbnail ? undefined : 'opacity 520ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
        {/* Minimalist Environment Texture / Vibe Layer */}
        <BouquetEnvironmentSVG
          environment={environment || 'studio'}
          isDarkMode={isDarkMode}
          idPrefix={idPrefix}
        />
        {/* Crisp inner rim stroke so the canvas square stays subtly legible against its blended backdrop in Gift/Preview mode */}
        {!isCardThumbnail && isPreviewMode && (
          <rect
            x="-23"
            y="1"
            width="646"
            height="678"
            rx="33"
            fill="none"
            stroke={envBackdrop.canvasInnerHighlight}
            strokeWidth="1.25"
            className="pointer-events-none"
          />
        )}
        <g>
        {(environment || 'studio') === 'studio' && (
          <>
            <circle
              cx="300"
              cy="285"
              r="248"
              fill="#ffffff"
              style={{
                opacity: isDarkMode ? 0.05 : 0.65,
                transition: isCardThumbnail ? undefined : 'opacity 520ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            />
            <circle
              cx="300"
              cy="285"
              r="248"
              fill="none"
              stroke={isDarkMode ? '#4E423E' : '#E8DDD3'}
              strokeWidth="1.5"
              strokeDasharray="6 6"
              style={{ transition: isCardThumbnail ? undefined : 'stroke 520ms cubic-bezier(0.22, 1, 0.36, 1)' }}
            />
          </>
        )}

        {/* UNIFIED DRAGGABLE, RESIZABLE & ROTATABLE BOUQUET GROUP (Pivot at 300, 380) */}
        <g transform={bouquetTransform}>
        {/* Zero-blur soft studio ground shadow ellipse under bouquet base */}
        {!isCardThumbnail && (
          <ellipse
            cx="300"
            cy="608"
            rx="118"
            ry="19"
            fill={`url(#${idPrefix}bouquetGroundShadow)`}
            className="pointer-events-none"
          />
        )}
        {/* 1A. BACK ITEMS LAYER (Behind Back Wrapping Paper — items sent all the way to 'back' plane) */}
        <g>
          {visibleRenderItems.map((item) => {
            if (item.hidden || getEffectiveItemPlane(item) !== 'back') return null;
            const isSelected = !isPreviewMode && item.id === selectedId;
            const isClickableBloomPhoto =
              isPreviewMode && !isCardThumbnail && Boolean(item.photoStyle) && Boolean(onPhotoCardClick);
            const disp = getStageItemDisplayTransform(item, wrapStyle);
            const meta = FLOWER_CATALOG.find((m) => m.type === item.type);
            return (
              <g
                key={`back-${item.id}`}
                ref={registerItemMotionRef(item.id)}
                data-bloom-motion="true"
                data-bloom-item-id={item.id}
              >
                <g
                  data-drawer-trigger={isPreviewMode ? undefined : 'true'}
                  data-testid={isClickableBloomPhoto ? `bloom-photo-${item.id}` : undefined}
                  role={isClickableBloomPhoto ? 'button' : undefined}
                  tabIndex={isClickableBloomPhoto ? 0 : undefined}
                  aria-label={
                    isClickableBloomPhoto
                      ? item.photoCaption?.trim()
                        ? `View photo: ${item.photoCaption.trim()}`
                        : 'View attached photo'
                      : undefined
                  }
                  transform={`translate(${disp.x}, ${disp.y}) rotate(${disp.rotation}) scale(${
                    item.flipX ? -disp.scale : disp.scale
                  }, ${disp.scale})`}
                  onPointerDown={isPreviewMode ? undefined : (e) => handleItemPointerDown(e, item)}
                  onClick={
                    isClickableBloomPhoto
                      ? (e) => {
                          e.stopPropagation();
                          onPhotoCardClick?.(item);
                        }
                      : undefined
                  }
                  onKeyDown={
                    isClickableBloomPhoto
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            onPhotoCardClick?.(item);
                          }
                        }
                      : undefined
                  }
                  className={
                    isPreviewMode
                      ? isClickableBloomPhoto
                        ? 'cursor-pointer select-none outline-none focus:outline-none'
                        : 'pointer-events-none cursor-default'
                      : item.locked
                      ? 'cursor-pointer'
                      : 'cursor-grab active:cursor-grabbing'
                  }
                  style={{
                    filter: isSelected
                      ? 'drop-shadow(0px 8px 14px rgba(180,132,108,0.35))'
                      : animatedShadowFilter,
                    ...(isClickableBloomPhoto
                      ? { outline: 'none', WebkitTapHighlightColor: 'transparent', WebkitTouchCallout: 'none' }
                      : {}),
                  }}
                >
                  <g
                    className={!useLivingChoreography && bloomedCount !== undefined ? 'stem-bloom-pop' : ''}
                  >
                    <circle cx="0" cy="-6" r="54" fill="transparent" />
                    {item.photoStyle ? (
                      <BouquetPhotoCardSVG item={item} idPrefix={idPrefix} />
                    ) : (
                      <FlowerRenderer
                        type={item.type}
                        petalColor={item.petalColor}
                        centerColor={item.centerColor}
                        hideStem={
                          Boolean(meta?.isOther) ||
                          wrapStyle === 'plain' ||
                          wrapStyle === 'cloche'
                        }
                        stemLength={item.stemLength ?? 1}
                      />
                    )}
                    <rect x="-60" y="-62" width="120" height="120" rx="22" fill="transparent" />
                  </g>
                </g>
              </g>
            );
          })}
        </g>

        {/* 2. BACK WRAPPING PAPER LAYER (Behind Stems & Flowers — Clickable & Draggable to move/resize bouquet) */}
        {wrapStyle !== 'plain' && (
          <g ref={wrapperBackMotionRef} data-bloom-motion="true">
          <g
            filter={animatedShadowFilter}
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

            {/* STYLE 13 BACK: DELI WAX ('waxPaper' — Free Parisian market waxed-paper diagonal cone) */}
            {wrapStyle === 'waxPaper' && (
              <g>
                <defs>
                  <pattern
                    id={`${idPrefix}waxStripePat`}
                    width="14"
                    height="14"
                    patternUnits="userSpaceOnUse"
                    patternTransform="rotate(-14)"
                  >
                    <line
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="14"
                      stroke={shadeWrapHex(wrapColor, -34)}
                      strokeWidth="1.25"
                      strokeOpacity="0.24"
                    />
                  </pattern>
                </defs>
                {/* Crisp Sculptural Parisian Waxed-Paper Diamond Sheet tapering cleanly into the ribbon waist */}
                <path
                  d="M232,500 L122,238 L294,148 L478,224 L368,500 Z"
                  fill={shadeWrapHex(wrapColor, 10)}
                  stroke={shadeWrapHex(wrapColor, -26)}
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
                <path
                  d="M232,500 L122,238 L294,148 L478,224 L368,500 Z"
                  fill={`url(#${idPrefix}waxStripePat)`}
                />
                {/* Crisp Inner Folded Translucent Parchment Liner */}
                <path
                  d="M238,500 L156,252 L298,176 L444,240 L362,500 Z"
                  fill={shadeWrapHex(wrapColor, 22)}
                  fillOpacity="0.76"
                  stroke="#FFFFFF"
                  strokeWidth="1.25"
                  strokeOpacity="0.88"
                  strokeLinejoin="round"
                />
                {/* Subtle Paper Fold Crease Lines Converging to the Cinched Waist */}
                <path
                  d="M294,148 L298,498 M156,252 L252,498 M444,240 L348,498"
                  stroke={shadeWrapHex(wrapColor, -28)}
                  strokeWidth="0.9"
                  strokeOpacity="0.24"
                  fill="none"
                />
              </g>
            )}

            {/* STYLE 14 BACK: CREPE FAN ('crepeFan' — Free ruffled accordion florist crepe halo) */}
            {wrapStyle === 'crepeFan' && (
              <g>
                {/* Wide Scalloped Accordion Crepe Fan Arch */}
                <path
                  d="M236,492 L82,272 Q96,232 132,226 Q152,188 194,194 Q224,162 266,178 Q300,154 334,178 Q376,162 406,194 Q448,188 468,226 Q504,232 518,272 L364,492 Z"
                  fill={wrapColor}
                  stroke={shadeWrapHex(wrapColor, -24)}
                  strokeWidth="1.5"
                />
                {/* Inner Lighter Scalloped Crepe Layer */}
                <path
                  d="M248,492 L118,284 Q148,242 192,238 Q232,202 276,214 Q300,196 324,214 Q368,202 408,238 Q452,242 482,284 L352,492 Z"
                  fill={shadeWrapHex(wrapColor, 18)}
                  fillOpacity="0.86"
                  stroke="#FFFFFF"
                  strokeWidth="1.4"
                  strokeOpacity="0.78"
                />
                {/* Radial Accordion Pleat Lines */}
                <g stroke={shadeWrapHex(wrapColor, -26)} strokeWidth="1.15" opacity="0.42" fill="none">
                  <line x1="274" y1="484" x2="132" y2="232" />
                  <line x1="284" y1="484" x2="196" y2="198" />
                  <line x1="294" y1="484" x2="266" y2="180" />
                  <line x1="306" y1="484" x2="334" y2="180" />
                  <line x1="316" y1="484" x2="404" y2="198" />
                  <line x1="326" y1="484" x2="468" y2="232" />
                </g>
              </g>
            )}

            {/* STYLE 15 BACK: JUTE POCKET ('burlapSack' — Free rustic woven market burlap pouch) */}
            {wrapStyle === 'burlapSack' && (
              <g>
                <defs>
                  <pattern id={`${idPrefix}burlapWeavePat`} width="10" height="10" patternUnits="userSpaceOnUse">
                    <path
                      d="M0,3 L10,3 M0,8 L10,8 M3,0 L3,10 M8,0 L8,10"
                      stroke={shadeWrapHex(wrapColor, -42)}
                      strokeWidth="1"
                      strokeOpacity="0.34"
                    />
                  </pattern>
                </defs>
                {/* Rustic Woven Linen-Burlap Back Collar (tapers cleanly behind the front pocket waist) */}
                <path
                  d="M134,252 Q216,228 300,238 Q384,228 466,252 L434,376 L380,498 L220,498 L166,376 Z"
                  fill={shadeWrapHex(wrapColor, -8)}
                  stroke={shadeWrapHex(wrapColor, -44)}
                  strokeWidth="1.6"
                />
                <path
                  d="M134,252 Q216,228 300,238 Q384,228 466,252 L434,376 L380,498 L220,498 L166,376 Z"
                  fill={`url(#${idPrefix}burlapWeavePat)`}
                />
                {/* Soft Cream Canvas Inner Lining */}
                <path
                  d="M156,266 Q300,250 444,266 L418,376 L370,494 L230,494 L182,376 Z"
                  fill="#FBF6EE"
                  fillOpacity="0.58"
                />
                {/* Raw Frayed Top Edge Fringe Ticks */}
                <path
                  d="M142,248 Q220,224 300,234 Q380,224 458,248"
                  fill="none"
                  stroke={shadeWrapHex(wrapColor, -34)}
                  strokeWidth="2.8"
                  strokeDasharray="2 5"
                  opacity="0.7"
                />
              </g>
            )}

            {/* STYLE 16 BACK: ABACA MESH ('abacaMesh' — Couture: Matte sheets + boutique tag + golden open-weave abaca net wings) */}
            {wrapStyle === 'abacaMesh' && (
              <g>
                <defs>
                  <pattern
                    id={`${idPrefix}abacaNetPat`}
                    width="12"
                    height="12"
                    patternUnits="userSpaceOnUse"
                    patternTransform="rotate(24)"
                  >
                    <path
                      d="M0,3 L12,3 M0,9 L12,9 M3,0 L3,12 M9,0 L9,12"
                      stroke="#A67C44"
                      strokeWidth="1.15"
                      strokeOpacity="0.62"
                    />
                    <path
                      d="M0,6 L12,6 M6,0 L6,12"
                      stroke="#F3DFBA"
                      strokeWidth="0.7"
                      strokeOpacity="0.75"
                    />
                  </pattern>
                </defs>
                {/* Wide Open-Weave Golden Abaca Net Side Wings */}
                <path
                  d="M276,478 L66,262 L134,192 L292,380 Z"
                  fill="#E4C896"
                  fillOpacity="0.46"
                  stroke="#B88E52"
                  strokeWidth="1.4"
                />
                <path d="M276,478 L66,262 L134,192 L292,380 Z" fill={`url(#${idPrefix}abacaNetPat)`} />
                <path
                  d="M324,478 L534,262 L466,192 L308,380 Z"
                  fill="#E4C896"
                  fillOpacity="0.46"
                  stroke="#B88E52"
                  strokeWidth="1.4"
                />
                <path d="M324,478 L534,262 L466,192 L308,380 Z" fill={`url(#${idPrefix}abacaNetPat)`} />
                {/* Tall Matte Folded Couture Outer Paper Sheets (Recolorable) */}
                <path
                  d="M286,488 L156,144 L244,126 L296,466 Z"
                  fill={shadeWrapHex(wrapColor, 6)}
                  stroke={shadeWrapHex(wrapColor, -28)}
                  strokeWidth="1.2"
                />
                <path
                  d="M244,160 L368,158 L338,488 L262,488 Z"
                  fill={wrapColor}
                  stroke={shadeWrapHex(wrapColor, -24)}
                  strokeWidth="1.1"
                />
                <path
                  d="M314,488 L354,124 L452,146 L354,488 Z"
                  fill={shadeWrapHex(wrapColor, -6)}
                  stroke={shadeWrapHex(wrapColor, -30)}
                  strokeWidth="1.2"
                />
                {/* Crisp Vertical Sheet Fold Shadow Lines */}
                <line x1="242" y1="138" x2="278" y2="460" stroke={shadeWrapHex(wrapColor, -36)} strokeWidth="1.4" opacity="0.4" />
                <line x1="358" y1="136" x2="328" y2="460" stroke={shadeWrapHex(wrapColor, -36)} strokeWidth="1.4" opacity="0.4" />
                {/* Signature Small Dark Boutique Foil Tag on Upper-Right Sheet Edge */}
                <g transform="translate(394, 146) rotate(11)">
                  <rect x="0" y="0" width="28" height="11" rx="1.8" fill="#292524" stroke="#57534E" strokeWidth="0.7" />
                  <circle cx="8" cy="5.5" r="1.6" fill="#FDE68A" opacity="0.9" />
                  <line x1="13" y1="5.5" x2="23" y2="5.5" stroke="#E7E5E4" strokeWidth="1" strokeLinecap="round" opacity="0.75" />
                </g>
                {/* Side Matte Folded Paper Rolls Framing Lower Wings */}
                <path
                  d="M262,486 L82,340 L114,296 L286,464 Z"
                  fill={shadeWrapHex(wrapColor, -10)}
                  stroke={shadeWrapHex(wrapColor, -32)}
                  strokeWidth="1.1"
                />
                <path
                  d="M338,486 L518,340 L486,296 L314,464 Z"
                  fill={shadeWrapHex(wrapColor, -12)}
                  stroke={shadeWrapHex(wrapColor, -32)}
                  strokeWidth="1.1"
                />
              </g>
            )}

            {/* STYLE 17 BACK: SNOW WEB NET ('snowNet' — Couture: Frosted double-bordered Korean sheets + lacy snow-web tulle) */}
            {wrapStyle === 'snowNet' && (
              <g>
                <defs>
                  <pattern id={`${idPrefix}snowWebPat`} width="28" height="28" patternUnits="userSpaceOnUse">
                    <path
                      d="M0,8 L11,4 L22,12 L28,7 M4,22 L15,17 L26,24 M11,4 L15,17 L9,28 M22,12 L26,24 M2,0 L11,4 M0,16 L15,17"
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                      strokeOpacity="0.96"
                    />
                    <path
                      d="M6,10 L18,9 L24,18 M12,24 L21,20"
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth="0.9"
                      strokeOpacity="0.78"
                    />
                  </pattern>
                </defs>
                {/* 5 Fanned Translucent Frosted Korean Sheets with Crisp Double White Border Lines */}
                {/* Far-Left Panel */}
                <path
                  d="M276,488 L72,278 L114,234 L296,466 Z"
                  fill={shadeWrapHex(wrapColor, 14)}
                  fillOpacity="0.86"
                  stroke={shadeWrapHex(wrapColor, -22)}
                  strokeWidth="1.1"
                />
                <path d="M78,274 L116,236" stroke="#FFFFFF" strokeWidth="2.2" opacity="0.95" />
                <path d="M84,280 L122,242" stroke="#FFFFFF" strokeWidth="1.3" opacity="0.9" />
                {/* Mid-Left Panel */}
                <path
                  d="M282,488 L120,214 L184,174 L302,464 Z"
                  fill={shadeWrapHex(wrapColor, 6)}
                  fillOpacity="0.88"
                  stroke={shadeWrapHex(wrapColor, -20)}
                  strokeWidth="1.1"
                />
                <path d="M126,212 L185,176" stroke="#FFFFFF" strokeWidth="2.2" opacity="0.95" />
                <path d="M132,219 L190,183" stroke="#FFFFFF" strokeWidth="1.3" opacity="0.9" />
                {/* Center Tall Crown Sheet */}
                <path
                  d="M242,488 L208,136 L392,136 L358,488 Z"
                  fill={wrapColor}
                  fillOpacity="0.9"
                  stroke={shadeWrapHex(wrapColor, -22)}
                  strokeWidth="1.1"
                />
                <line x1="212" y1="142" x2="388" y2="142" stroke="#FFFFFF" strokeWidth="2.4" opacity="0.95" />
                <line x1="213" y1="150" x2="387" y2="150" stroke="#FFFFFF" strokeWidth="1.3" opacity="0.9" />
                {/* Mid-Right Panel */}
                <path
                  d="M318,488 L416,174 L480,214 L298,464 Z"
                  fill={shadeWrapHex(wrapColor, 6)}
                  fillOpacity="0.88"
                  stroke={shadeWrapHex(wrapColor, -20)}
                  strokeWidth="1.1"
                />
                <path d="M415,176 L474,212" stroke="#FFFFFF" strokeWidth="2.2" opacity="0.95" />
                <path d="M410,183 L468,219" stroke="#FFFFFF" strokeWidth="1.3" opacity="0.9" />
                {/* Far-Right Panel */}
                <path
                  d="M324,488 L486,234 L528,278 L304,466 Z"
                  fill={shadeWrapHex(wrapColor, 14)}
                  fillOpacity="0.86"
                  stroke={shadeWrapHex(wrapColor, -22)}
                  strokeWidth="1.1"
                />
                <path d="M484,236 L522,274" stroke="#FFFFFF" strokeWidth="2.2" opacity="0.95" />
                <path d="M478,242 L516,280" stroke="#FFFFFF" strokeWidth="1.3" opacity="0.9" />
                {/* Ethereal Organic Snow-Web Lacy Tulle Cloud Billowing Behind Blooms */}
                <path
                  d="M232,472 C178,412 132,332 146,246 C158,186 212,162 252,182 C278,144 334,148 358,184 C402,168 456,196 458,256 C460,336 420,412 368,472 Z"
                  fill="#FFFFFF"
                  fillOpacity="0.22"
                />
                <path
                  d="M232,472 C178,412 132,332 146,246 C158,186 212,162 252,182 C278,144 334,148 358,184 C402,168 456,196 458,256 C460,336 420,412 368,472 Z"
                  fill={`url(#${idPrefix}snowWebPat)`}
                  stroke="#FFFFFF"
                  strokeWidth="1.4"
                  strokeDasharray="6 4"
                  strokeOpacity="0.8"
                />
              </g>
            )}

            {/* STYLE 18 BACK: PEARL TULLE ('pearlTulle' — Couture bridal sheer tulle net halo with freshwater pearls) */}
            {wrapStyle === 'pearlTulle' && (
              <g>
                <defs>
                  <pattern
                    id={`${idPrefix}pearlDiamondPat`}
                    width="14"
                    height="14"
                    patternUnits="userSpaceOnUse"
                    patternTransform="rotate(45)"
                  >
                    <path
                      d="M0,0 L14,0 M0,0 L0,14"
                      stroke="#FFFFFF"
                      strokeWidth="0.9"
                      strokeOpacity="0.62"
                    />
                  </pattern>
                </defs>
                {/* Outer Billowing Sheer Bridal Tulle Halo */}
                <path
                  d="M236,488 C142,438 82,346 92,248 C100,188 158,166 210,192 C248,150 352,150 390,192 C442,166 500,188 508,248 C518,346 458,438 364,488 Z"
                  fill={wrapColor}
                  fillOpacity="0.62"
                  stroke="#FFFFFF"
                  strokeWidth="2.2"
                  strokeOpacity="0.92"
                />
                <path
                  d="M236,488 C142,438 82,346 92,248 C100,188 158,166 210,192 C248,150 352,150 390,192 C442,166 500,188 508,248 C518,346 458,438 364,488 Z"
                  fill={`url(#${idPrefix}pearlDiamondPat)`}
                />
                {/* Inner Satin-Lined Organza Backing */}
                <path
                  d="M244,488 C178,434 134,354 144,268 C154,218 220,198 300,214 C380,198 446,218 456,268 C466,354 422,434 356,488 Z"
                  fill={shadeWrapHex(wrapColor, 18)}
                  fillOpacity="0.72"
                  stroke="#FFFFFF"
                  strokeWidth="1.2"
                />
                {/* Scattered Freshwater Pearls Pinned Across the Veil Halo */}
                {[
                  { x: 132, y: 244, r: 4.5 },
                  { x: 174, y: 204, r: 4 },
                  { x: 244, y: 174, r: 4.5 },
                  { x: 356, y: 174, r: 4.5 },
                  { x: 426, y: 204, r: 4 },
                  { x: 468, y: 244, r: 4.5 },
                  { x: 118, y: 318, r: 3.8 },
                  { x: 482, y: 318, r: 3.8 },
                ].map((p, idx) => (
                  <g key={`tulle-back-pearl-${idx}`}>
                    <circle cx={p.x} cy={p.y} r={p.r} fill="#FFFDF9" stroke="#E2D4C8" strokeWidth="0.9" />
                    <circle cx={p.x - 1.3} cy={p.y - 1.3} r={p.r * 0.32} fill="#FFFFFF" />
                  </g>
                ))}
              </g>
            )}

            {/* STYLE 19 BACK: GINGHAM BRODERIE ('ginghamLace' — Couture woven French gingham plaid + eyelet lace) */}
            {wrapStyle === 'ginghamLace' && (
              <g>
                <defs>
                  <pattern id={`${idPrefix}ginghamCheckPat`} width="24" height="24" patternUnits="userSpaceOnUse">
                    <rect width="24" height="24" fill="#FFFDFB" />
                    <rect x="0" y="0" width="12" height="24" fill={wrapColor} fillOpacity="0.56" />
                    <rect x="0" y="0" width="24" height="12" fill={wrapColor} fillOpacity="0.56" />
                    <rect x="0" y="0" width="12" height="12" fill={shadeWrapHex(wrapColor, -22)} fillOpacity="0.62" />
                  </pattern>
                </defs>
                {/* Tailored Gingham Folded Sheets Behind Flowers */}
                <path
                  d="M270,498 L104,244 L224,180 L300,226 L376,180 L496,244 L330,498 Z"
                  fill={`url(#${idPrefix}ginghamCheckPat)`}
                  stroke={shadeWrapHex(wrapColor, -34)}
                  strokeWidth="1.5"
                />
                {/* Scalloped Ivory Eyelet Trim Along Upper Back Edge */}
                <path
                  d="M114,244 Q168,208 224,186 Q262,212 300,228 Q338,212 376,186 Q432,208 486,244"
                  fill="none"
                  stroke="#FFFDF9"
                  strokeWidth="5"
                  strokeDasharray="2 7"
                  strokeLinecap="round"
                />
              </g>
            )}

            {/* STYLE 20 BACK: CORSET SILK ('corsetSilk' — Couture sculptural sweetheart silk wings + sheer peplum) */}
            {wrapStyle === 'corsetSilk' && (
              <g>
                <defs>
                  <linearGradient id={`${idPrefix}corsetSilkGrad`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={shadeWrapHex(wrapColor, 24)} />
                    <stop offset="50%" stopColor={wrapColor} />
                    <stop offset="100%" stopColor={shadeWrapHex(wrapColor, -28)} />
                  </linearGradient>
                </defs>
                {/* Sculptural Cathedral Silk Wings Behind Blooms */}
                <path
                  d="M242,492 C164,424 102,326 112,230 C118,178 178,164 236,204 C264,224 282,256 300,292 C318,256 336,224 364,204 C422,164 482,178 488,230 C498,326 436,424 358,492 Z"
                  fill={`url(#${idPrefix}corsetSilkGrad)`}
                  stroke="#FDE68A"
                  strokeWidth="1.6"
                  strokeOpacity="0.82"
                />
                {/* Subtle Satin Highlight Folds */}
                <path
                  d="M144,234 C178,284 222,368 268,468 M456,234 C422,284 378,368 332,468"
                  fill="none"
                  stroke="#FFFBEB"
                  strokeWidth="1.3"
                  opacity="0.34"
                />
                {/* Sheer Pleated Organza Peplum Flare Below Waist */}
                <path
                  d="M226,496 L168,608 Q234,626 300,612 Q366,626 432,608 L374,496 Z"
                  fill={shadeWrapHex(wrapColor, 26)}
                  fillOpacity="0.58"
                  stroke="#FDE68A"
                  strokeWidth="1.3"
                  strokeOpacity="0.7"
                />
              </g>
            )}

            {/* STYLE 21 BACK: WILLOW PORCELAIN URN ('chinoiserieUrn' — Couture cobalt-and-gold porcelain vessel mouth) */}
            {wrapStyle === 'chinoiserieUrn' && (
              <g>
                {/* Porcelain Urn Mouth Rim & Interior Depth */}
                <ellipse
                  cx="300"
                  cy="406"
                  rx="116"
                  ry="20"
                  fill={shadeWrapHex(wrapColor, -12)}
                  stroke="#D97706"
                  strokeWidth="2.4"
                />
                <ellipse cx="300" cy="408" rx="104" ry="14" fill="#1E3A5F" fillOpacity="0.28" />
              </g>
            )}
          </g>
          </g>
        )}

        {/* Gather Stems at the Bouquet Tie Point (Organic curved botanical stems for Glass Cloche & Hand-Tied; lower bundle for open sleeves) */}
        {wrapStyle === 'cloche' ? (
          <g clipPath={`url(#${idPrefix}bouquetClocheBoundsClip)`} opacity="0.95">
            {computeClocheStemGeometry(visibleRenderItems).map((stem) => (
              <g
                key={`cloche-stem-${stem.itemId}`}
                ref={registerClocheStemRef(stem.itemId)}
                data-bloom-motion="true"
              >
                {/* Soft Grounding Depth Shadow */}
                <path
                  d={stem.pathD}
                  stroke="#1F2E22"
                  strokeWidth={stem.strokeWidth + 1.2}
                  strokeOpacity="0.16"
                  fill="none"
                  strokeLinecap="round"
                />
                {/* Harmonized Proportional Botanical Stem */}
                <path
                  d={stem.pathD}
                  stroke={stem.strokeColor}
                  strokeWidth={stem.strokeWidth}
                  fill="none"
                  strokeLinecap="round"
                />
                {/* Directional Sunlit Stem Highlight */}
                <path
                  d={stem.highlightD}
                  stroke={stem.highlightColor}
                  strokeWidth={Math.max(1, stem.strokeWidth * 0.28)}
                  strokeOpacity="0.5"
                  fill="none"
                  strokeLinecap="round"
                />
                {/* Fresh-Trimmed Florist Cut End */}
                <ellipse
                  cx={stem.tipCx}
                  cy={stem.tipCy}
                  rx={Math.max(1.3, stem.strokeWidth * 0.42)}
                  ry={Math.max(0.85, stem.strokeWidth * 0.22)}
                  transform={`rotate(${stem.tipAngleDeg} ${stem.tipCx} ${stem.tipCy})`}
                  fill={stem.pithColor}
                  opacity="0.88"
                />
              </g>
            ))}
          </g>
        ) : wrapStyle === 'plain' ? (
          <g ref={wrapperStemBundleMotionRef} data-bloom-motion="true">
            <g clipPath={`url(#${idPrefix}bouquetWrapperBoundsClip)`}>
              {(() => {
                const handTiedStems = computeHandTiedStemGeometry(visibleRenderItems);
                if (handTiedStems.length === 0) {
                  return !isPreviewMode ? (
                    <g opacity="0.26" stroke="#5D7A67" strokeWidth="3.2" strokeLinecap="round" fill="none">
                      <path d="M292,456 Q296,482 296,504 Q295,546 286,590" />
                      <path d="M300,448 L300,594" />
                      <path d="M308,456 Q304,482 304,504 Q305,546 314,590" />
                    </g>
                  ) : null;
                }
                return handTiedStems.map((stem) => (
                  <g
                    key={`plain-stem-${stem.itemId}`}
                    ref={registerClocheStemRef(stem.itemId)}
                    data-bloom-motion="true"
                  >
                    {/* Soft Grounding Depth Shadow */}
                    <path
                      d={stem.pathD}
                      stroke="#1F2E22"
                      strokeWidth={stem.strokeWidth + 1.4}
                      strokeOpacity="0.16"
                      fill="none"
                      strokeLinecap="round"
                    />
                    {/* Harmonized Natural Botanical Stem */}
                    <path
                      d={stem.pathD}
                      stroke={stem.strokeColor}
                      strokeWidth={stem.strokeWidth}
                      fill="none"
                      strokeLinecap="round"
                    />
                    {/* Delicate Directional Sunlit Stem Highlight */}
                    <path
                      d={stem.highlightD}
                      stroke={stem.highlightColor}
                      strokeWidth={Math.max(1, stem.strokeWidth * 0.28)}
                      strokeOpacity="0.52"
                      fill="none"
                      strokeLinecap="round"
                    />
                    {/* Angled Fresh-Trimmed Florist Cut End */}
                    <ellipse
                      cx={stem.tipCx}
                      cy={stem.tipCy}
                      rx={Math.max(1.4, stem.strokeWidth * 0.44)}
                      ry={Math.max(0.9, stem.strokeWidth * 0.24)}
                      transform={`rotate(${stem.tipAngleDeg} ${stem.tipCx} ${stem.tipCy})`}
                      fill={stem.pithColor}
                      opacity="0.9"
                    />
                  </g>
                ));
              })()}
            </g>
          </g>
        ) : null}

        {/* 3. BOUQUET FLOWERS, FOLIAGE & INSIDE-PLANE ITEMS LAYER (Unclipped across the entire main canvas; lower stems tucked cleanly inside wrapper base) */}
        <g>
          {visibleRenderItems.map((item) => {
            if (item.hidden || getEffectiveItemPlane(item) !== 'inside') return null;
            const isSelected = !isPreviewMode && item.id === selectedId;
            const isClickableBloomPhoto =
              isPreviewMode && !isCardThumbnail && Boolean(item.photoStyle) && Boolean(onPhotoCardClick);
            const disp = getStageItemDisplayTransform(item, wrapStyle);
            const meta = FLOWER_CATALOG.find((m) => m.type === item.type);
            const effectiveStemLength = computeWrapperTuckedStemLength({
              itemX: disp.x,
              itemY: disp.y,
              itemScale: disp.scale,
              itemRotation: disp.rotation,
              requestedStemLength: item.stemLength ?? 1,
              wrapStyle,
              wrapperBottomClipY,
            });
            return (
              <g
                key={item.id}
                ref={registerItemMotionRef(item.id)}
                data-bloom-motion="true"
                data-bloom-item-id={item.id}
              >
                <g
                  data-drawer-trigger={isPreviewMode ? undefined : 'true'}
                  data-testid={isClickableBloomPhoto ? `bloom-photo-${item.id}` : undefined}
                  role={isClickableBloomPhoto ? 'button' : undefined}
                  tabIndex={isClickableBloomPhoto ? 0 : undefined}
                  aria-label={
                    isClickableBloomPhoto
                      ? item.photoCaption?.trim()
                        ? `View photo: ${item.photoCaption.trim()}`
                        : 'View attached photo'
                      : undefined
                  }
                  transform={`translate(${disp.x}, ${disp.y}) rotate(${disp.rotation}) scale(${
                    item.flipX ? -disp.scale : disp.scale
                  }, ${disp.scale})`}
                  onPointerDown={isPreviewMode ? undefined : (e) => handleItemPointerDown(e, item)}
                  onClick={
                    isClickableBloomPhoto
                      ? (e) => {
                          e.stopPropagation();
                          onPhotoCardClick?.(item);
                        }
                      : undefined
                  }
                  onKeyDown={
                    isClickableBloomPhoto
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            onPhotoCardClick?.(item);
                          }
                        }
                      : undefined
                  }
                  className={
                    isPreviewMode
                      ? isClickableBloomPhoto
                        ? 'cursor-pointer select-none outline-none focus:outline-none'
                        : 'pointer-events-none cursor-default'
                      : item.locked
                      ? 'cursor-pointer'
                      : 'cursor-grab active:cursor-grabbing'
                  }
                  style={{
                    filter: isSelected
                      ? 'drop-shadow(0px 8px 14px rgba(180,132,108,0.35))'
                      : animatedShadowFilter,
                    ...(isClickableBloomPhoto
                      ? { outline: 'none', WebkitTapHighlightColor: 'transparent', WebkitTouchCallout: 'none' }
                      : {}),
                  }}
                >
                  <g
                    className={!useLivingChoreography && bloomedCount !== undefined ? 'stem-bloom-pop' : ''}
                  >
                    {/* Invisible generous hit target for easy touch tapping */}
                    <circle cx="0" cy="-6" r="54" fill="transparent" />
                    {item.photoStyle ? (
                      <BouquetPhotoCardSVG item={item} idPrefix={idPrefix} />
                    ) : (
                      <FlowerRenderer
                        type={item.type}
                        petalColor={item.petalColor}
                        centerColor={item.centerColor}
                        hideStem={
                          Boolean(meta?.isOther) ||
                          wrapStyle === 'plain' ||
                          wrapStyle === 'cloche'
                        }
                        stemLength={effectiveStemLength}
                      />
                    )}
                    <rect x="-60" y="-62" width="120" height="120" rx="22" fill="transparent" />
                  </g>
                </g>
              </g>
            );
          })}
        </g>

        {/* 4. FRONT WRAPPING LAYER & UNIVERSAL RIBBON / LACE DESIGN (Overlaps Lower Stems — Clickable & Draggable to move/resize bouquet) */}
        <g ref={wrapperFrontMotionRef} data-bloom-motion="true">
        <g filter={animatedShadowFilter}>
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

            {/* STYLE 13 FRONT: DELI WAX ('waxPaper' — Free Parisian market waxed paper fold & stamp) */}
            {wrapStyle === 'waxPaper' && (
              <g>
                {/* Clean Tapered Market Wax-Paper Lower Skirt */}
                <path
                  d="M232,500 L368,500 L356,612 Q300,620 244,612 Z"
                  fill={shadeWrapHex(wrapColor, -10)}
                  stroke={shadeWrapHex(wrapColor, -28)}
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
                <path
                  d="M268,504 L264,613 M300,504 L300,616 M332,504 L336,613"
                  stroke={shadeWrapHex(wrapColor, -34)}
                  strokeWidth="0.9"
                  strokeOpacity="0.28"
                  fill="none"
                />
                {/* Left Diagonal Wax Wrap Fold — meets waist cleanly at (232, 500) */}
                <path
                  d="M150,342 L336,500 L232,500 L186,422 Z"
                  fill={shadeWrapHex(wrapColor, -6)}
                  stroke={shadeWrapHex(wrapColor, -26)}
                  strokeWidth="1.3"
                  strokeLinejoin="round"
                />
                <path
                  d="M150,342 L314,484 L302,496 L158,364 Z"
                  fill="#FFFDF9"
                  fillOpacity="0.52"
                />
                {/* Right Overlapping Fold with Crisp White Parchment Cuff — meets waist cleanly at (256..368, 500) */}
                <path
                  d="M448,328 L256,500 L368,500 L422,418 Z"
                  fill={wrapColor}
                  stroke={shadeWrapHex(wrapColor, -26)}
                  strokeWidth="1.3"
                  strokeLinejoin="round"
                />
                <path
                  d="M448,328 L272,486 L284,498 L442,354 Z"
                  fill="#FFFDF9"
                  fillOpacity="0.88"
                />
                {/* Subtle Crossover Shadow Along Right Flap */}
                <path
                  d="M448,328 L256,500"
                  stroke={shadeWrapHex(wrapColor, -42)}
                  strokeWidth="1.15"
                  strokeOpacity="0.34"
                  fill="none"
                />
                {/* Minimal Market Botanical Stamp */}
                <g transform="translate(342, 456) rotate(-18)" opacity="0.62">
                  <rect
                    x="-36"
                    y="-11"
                    width="72"
                    height="21"
                    rx="3"
                    fill="none"
                    stroke={shadeWrapHex(wrapColor, -78)}
                    strokeWidth="1"
                    strokeDasharray="3 2"
                  />
                  <text
                    x="0"
                    y="2.5"
                    textAnchor="middle"
                    fill={shadeWrapHex(wrapColor, -84)}
                    fontSize="7.2"
                    fontWeight="700"
                    style={{ fontFamily: "'Cormorant Garamond', serif", letterSpacing: '0.12em' }}
                  >
                    MARCHÉ FLORAL
                  </text>
                </g>
              </g>
            )}

            {/* STYLE 14 FRONT: CREPE FAN ('crepeFan' — Free airy ruffled crepe throat, flared skirt & scalloped collar) */}
            {wrapStyle === 'crepeFan' && (
              <g>
                {/* Flared Ruffled Crepe Skirt Below Waist (Rendered on front layer so stems stay neatly inside sleeve) */}
                <path
                  d="M236,488 L174,602 Q208,618 242,606 Q272,622 300,608 Q328,622 358,606 Q392,618 426,602 L364,488 Z"
                  fill={shadeWrapHex(wrapColor, -10)}
                  stroke="#FFFFFF"
                  strokeWidth="1.4"
                  strokeOpacity="0.72"
                />
                {/* Soft Accordion Pleat Shading on Flared Skirt */}
                <g stroke={shadeWrapHex(wrapColor, -28)} strokeWidth="1.05" opacity="0.34" fill="none">
                  <line x1="258" y1="490" x2="218" y2="608" />
                  <line x1="280" y1="490" x2="266" y2="612" />
                  <line x1="300" y1="490" x2="300" y2="608" />
                  <line x1="320" y1="490" x2="334" y2="612" />
                  <line x1="342" y1="490" x2="382" y2="608" />
                </g>
                {/* Left Ruffled Crepe Collar Fold */}
                <path
                  d="M140,356 Q174,344 198,374 Q232,374 256,410 Q282,424 306,486 L228,488 Q174,432 140,356 Z"
                  fill={shadeWrapHex(wrapColor, -6)}
                  stroke="#FFFFFF"
                  strokeWidth="1.8"
                  strokeOpacity="0.9"
                />
                {/* Right Ruffled Crepe Collar Fold */}
                <path
                  d="M460,356 Q426,344 402,374 Q368,374 344,410 Q318,424 294,486 L372,488 Q426,432 460,356 Z"
                  fill={wrapColor}
                  stroke="#FFFFFF"
                  strokeWidth="1.8"
                  strokeOpacity="0.9"
                />
                {/* Center Soft Wavy Scalloped Crepe Ruffle Collar */}
                <path
                  d="M196,422 Q226,396 254,424 Q278,400 300,426 Q322,400 346,424 Q374,396 404,422 L370,488 L230,488 Z"
                  fill={shadeWrapHex(wrapColor, 18)}
                  fillOpacity="0.92"
                  stroke="#FFFFFF"
                  strokeWidth="1.6"
                />
                {/* Pinched Gather Pleats Above Waist */}
                <g stroke={shadeWrapHex(wrapColor, -28)} strokeWidth="1.1" opacity="0.48" fill="none">
                  <line x1="254" y1="426" x2="274" y2="486" />
                  <line x1="300" y1="428" x2="300" y2="486" />
                  <line x1="346" y1="426" x2="326" y2="486" />
                </g>
              </g>
            )}

            {/* STYLE 15 FRONT: JUTE POCKET ('burlapSack' — Free rustic folded burlap cuff & twine craft tag) */}
            {wrapStyle === 'burlapSack' && (
              <g>
                {/* Main Tapered Jute Market Pocket */}
                <path
                  d="M158,366 Q300,404 442,366 L388,504 L362,612 Q300,624 238,612 L212,504 Z"
                  fill={wrapColor}
                  stroke={shadeWrapHex(wrapColor, -42)}
                  strokeWidth="1.6"
                />
                <path
                  d="M158,366 Q300,404 442,366 L388,504 L362,612 Q300,624 238,612 L212,504 Z"
                  fill={`url(#${idPrefix}burlapWeavePat)`}
                />
                {/* Folded-Down Rustic Linen Cuff */}
                <path
                  d="M152,362 Q300,398 448,362 L432,414 Q300,446 168,414 Z"
                  fill={shadeWrapHex(wrapColor, 14)}
                  stroke={shadeWrapHex(wrapColor, -36)}
                  strokeWidth="1.4"
                />
                <path
                  d="M168,404 Q300,434 432,404"
                  fill="none"
                  stroke="#FFFBF5"
                  strokeWidth="1.5"
                  strokeDasharray="6 4"
                  opacity="0.82"
                />
                {/* Tiny Herbarium Kraft Tag Tucked on Right Cuff */}
                <g transform="translate(362, 412) rotate(12)">
                  <rect x="0" y="0" width="38" height="22" rx="3" fill="#FAF2E4" stroke="#A68B6B" strokeWidth="1" />
                  <circle cx="7" cy="11" r="2" fill="#8C624C" />
                  <line x1="13" y1="8.5" x2="32" y2="8.5" stroke="#8C624C" strokeWidth="1.1" opacity="0.7" />
                  <line x1="13" y1="13.5" x2="28" y2="13.5" stroke="#8C624C" strokeWidth="1.1" opacity="0.55" />
                </g>
              </g>
            )}

            {/* STYLE 16 FRONT: ABACA MESH ('abacaMesh' — Couture: Billowing ivory tissue ruffles + golden abaca net collar & skirt) */}
            {wrapStyle === 'abacaMesh' && (
              <g>
                {/* Sculptural Gathered Open-Weave Abaca Net Skirt Below Waist */}
                <path
                  d="M226,488 C202,534 216,584 248,622 C282,630 318,630 352,622 C384,584 398,534 374,488 Z"
                  fill="#DEC08C"
                  fillOpacity="0.62"
                  stroke="#A87E45"
                  strokeWidth="1.3"
                />
                <path
                  d="M226,488 C202,534 216,584 248,622 C282,630 318,630 352,622 C384,584 398,534 374,488 Z"
                  fill={`url(#${idPrefix}abacaNetPat)`}
                />
                {/* Inner Matte Paper Skirt Core Showing Softly Through Abaca Net */}
                <path
                  d="M258,492 L342,492 L328,608 Q300,616 272,608 Z"
                  fill={shadeWrapHex(wrapColor, -14)}
                  fillOpacity="0.46"
                />
                {/* Billowing Asymmetric Layered Ivory Tissue Ruffles Tucked at Center Collar (Ref #1) */}
                <path
                  d="M214,462 C202,424 218,392 242,406 C258,416 266,442 282,474 C272,434 282,390 308,394 C332,398 338,434 328,476 C344,442 362,418 378,432 C390,444 378,472 356,484 L236,484 Z"
                  fill="#F7EEDB"
                  stroke="#DFCFAF"
                  strokeWidth="1.4"
                />
                <path
                  d="M236,472 C228,436 244,416 260,432 C272,444 278,468 292,482 C298,444 316,418 334,432 C348,444 342,468 326,484 Z"
                  fill="#E8D8BA"
                  fillOpacity="0.82"
                  stroke="#FFFDF9"
                  strokeWidth="1.1"
                />
                <path
                  d="M276,476 C284,446 300,436 312,452 C320,464 314,478 302,486 Z"
                  fill="#FBF5E8"
                  stroke="#D9C7A6"
                  strokeWidth="1"
                />
                {/* Sweeping Left & Right Golden Open-Weave Abaca Net Collar Wings */}
                <path
                  d="M84,412 C126,392 184,418 232,456 L296,488 L214,492 C152,482 104,456 84,412 Z"
                  fill="#E5CA98"
                  fillOpacity="0.62"
                  stroke="#B3894E"
                  strokeWidth="1.4"
                />
                <path
                  d="M84,412 C126,392 184,418 232,456 L296,488 L214,492 C152,482 104,456 84,412 Z"
                  fill={`url(#${idPrefix}abacaNetPat)`}
                />
                <path
                  d="M516,412 C474,392 416,418 368,456 L304,488 L386,492 C448,482 496,456 516,412 Z"
                  fill="#E5CA98"
                  fillOpacity="0.62"
                  stroke="#B3894E"
                  strokeWidth="1.4"
                />
                <path
                  d="M516,412 C474,392 416,418 368,456 L304,488 L386,492 C448,482 496,456 516,412 Z"
                  fill={`url(#${idPrefix}abacaNetPat)`}
                />
              </g>
            )}

            {/* STYLE 17 FRONT: SNOW WEB NET ('snowNet' — Couture: Pleated double-white-bordered skirt + gathered snow-web waist veil) */}
            {wrapStyle === 'snowNet' && (
              <g>
                {/* 3 Overlapping Pleated Translucent Korean Paper Skirt Panels with Double White Edge Stripes */}
                {/* Left Skirt Panel */}
                <path
                  d="M244,492 L292,492 L252,622 L176,592 Z"
                  fill={shadeWrapHex(wrapColor, -6)}
                  fillOpacity="0.92"
                  stroke={shadeWrapHex(wrapColor, -24)}
                  strokeWidth="1.1"
                />
                <path d="M188,576 L256,604" stroke="#FFFFFF" strokeWidth="2.1" opacity="0.92" />
                <path d="M194,568 L260,596" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.88" />
                {/* Right Skirt Panel */}
                <path
                  d="M356,492 L308,492 L348,622 L424,592 Z"
                  fill={shadeWrapHex(wrapColor, -6)}
                  fillOpacity="0.92"
                  stroke={shadeWrapHex(wrapColor, -24)}
                  strokeWidth="1.1"
                />
                <path d="M344,604 L412,576" stroke="#FFFFFF" strokeWidth="2.1" opacity="0.92" />
                <path d="M340,596 L406,568" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.88" />
                {/* Center Skirt Panel */}
                <path
                  d="M268,492 L332,492 L344,626 Q300,632 256,626 Z"
                  fill={wrapColor}
                  fillOpacity="0.96"
                  stroke={shadeWrapHex(wrapColor, -22)}
                  strokeWidth="1.1"
                />
                <line x1="260" y1="610" x2="340" y2="610" stroke="#FFFFFF" strokeWidth="2.2" opacity="0.95" />
                <line x1="261" y1="602" x2="339" y2="602" stroke="#FFFFFF" strokeWidth="1.2" opacity="0.9" />
                {/* Upper Crossover Frosted Collar */}
                <path
                  d="M174,404 Q300,456 426,404 L380,492 L220,492 Z"
                  fill={shadeWrapHex(wrapColor, 14)}
                  fillOpacity="0.72"
                  stroke="#FFFFFF"
                  strokeWidth="1.6"
                />
                {/* Billowing Gathered Snow-Web Lacy Net Collar & Waist Veil */}
                <path
                  d="M148,464 C186,436 244,462 300,478 C356,462 414,436 452,464 C446,506 408,540 364,552 C338,538 320,520 300,506 C280,520 262,538 236,552 C192,540 154,506 148,464 Z"
                  fill="#FFFFFF"
                  fillOpacity="0.22"
                />
                <path
                  d="M148,464 C186,436 244,462 300,478 C356,462 414,436 452,464 C446,506 408,540 364,552 C338,538 320,520 300,506 C280,520 262,538 236,552 C192,540 154,506 148,464 Z"
                  fill={`url(#${idPrefix}snowWebPat)`}
                  stroke="#FFFFFF"
                  strokeWidth="1.4"
                  strokeDasharray="5 3"
                  strokeOpacity="0.88"
                />
              </g>
            )}

            {/* STYLE 18 FRONT: PEARL TULLE ('pearlTulle' — Couture sheer ruffled tulle + draped pearl swag) */}
            {wrapStyle === 'pearlTulle' && (
              <g>
                {/* Sheer Pleated Bridal Tulle Skirt */}
                <path
                  d="M216,486 L384,486 L402,616 Q350,628 300,618 Q250,628 198,616 Z"
                  fill={wrapColor}
                  fillOpacity="0.72"
                  stroke="#FFFFFF"
                  strokeWidth="1.8"
                />
                <path
                  d="M216,486 L384,486 L402,616 Q350,628 300,618 Q250,628 198,616 Z"
                  fill={`url(#${idPrefix}pearlDiamondPat)`}
                />
                {/* Scalloped Ruffled Tulle Front Crossover */}
                <path
                  d="M150,382 Q188,366 218,396 Q258,396 294,434 Q300,440 306,434 Q342,396 382,396 Q412,366 450,382 L384,488 L216,488 Z"
                  fill={shadeWrapHex(wrapColor, 12)}
                  fillOpacity="0.82"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
                <path
                  d="M150,382 Q188,366 218,396 Q258,396 294,434 Q300,440 306,434 Q342,396 382,396 Q412,366 450,382 L384,488 L216,488 Z"
                  fill={`url(#${idPrefix}pearlDiamondPat)`}
                />
                {/* Draped Freshwater Pearl Swag Beneath Ribbon Waist */}
                <path
                  d="M226,506 Q300,564 374,506"
                  fill="none"
                  stroke="#F3E8E2"
                  strokeWidth="1.4"
                />
                {[
                  { x: 236, y: 514 },
                  { x: 252, y: 525 },
                  { x: 268, y: 533 },
                  { x: 284, y: 538 },
                  { x: 300, y: 540 },
                  { x: 316, y: 538 },
                  { x: 332, y: 533 },
                  { x: 348, y: 525 },
                  { x: 364, y: 514 },
                ].map((p, idx) => (
                  <g key={`pearl-swag-${idx}`}>
                    <circle cx={p.x} cy={p.y} r={idx === 4 ? 5.2 : 4.2} fill="#FFFDF9" stroke="#DECBB9" strokeWidth="0.9" />
                    <circle cx={p.x - 1.3} cy={p.y - 1.3} r="1.4" fill="#FFFFFF" />
                  </g>
                ))}
              </g>
            )}

            {/* STYLE 19 FRONT: GINGHAM BRODERIE ('ginghamLace' — Couture plaid cone + ivory broderie eyelet collar + wax seal) */}
            {wrapStyle === 'ginghamLace' && (
              <g>
                {/* Woven Gingham Front Cone & Skirt */}
                <path
                  d="M162,374 Q300,418 438,374 L382,496 L364,616 Q300,626 236,616 L218,496 Z"
                  fill={`url(#${idPrefix}ginghamCheckPat)`}
                  stroke={shadeWrapHex(wrapColor, -34)}
                  strokeWidth="1.5"
                />
                {/* Scalloped Ivory Broderie-Anglaise Eyelet Lace Collar */}
                <path
                  d="M154,376 Q180,352 206,378 Q232,356 258,384 Q280,362 300,386 Q320,362 342,384 Q368,356 394,378 Q420,352 446,376 L432,424 Q300,464 168,424 Z"
                  fill="#FFFDF9"
                  fillOpacity="0.95"
                  stroke="#E5D5C5"
                  strokeWidth="1.4"
                />
                {/* Broderie Eyelet Cutout Dots & Scallop Stitch */}
                <g fill={shadeWrapHex(wrapColor, -14)} opacity="0.55">
                  {[192, 228, 264, 300, 336, 372, 408].map((cx, idx) => (
                    <circle key={`eyelet-${idx}`} cx={cx} cy={idx === 3 ? 408 : 398 + Math.abs(idx - 3) * 1.5} r="3.4" />
                  ))}
                </g>
                <path
                  d="M174,418 Q300,454 426,418"
                  fill="none"
                  stroke="#D6C2AF"
                  strokeWidth="1.2"
                  strokeDasharray="4 3"
                />
                {/* Gilded Floral Wax-Seal Medallion */}
                <g transform="translate(360, 444)">
                  <circle cx="0" cy="0" r="14" fill="#D97706" opacity="0.22" />
                  <circle cx="0" cy="0" r="11.5" fill="#C98A3A" stroke="#FDE68A" strokeWidth="1.3" />
                  <circle cx="0" cy="0" r="7.5" fill="none" stroke="#FEF3C7" strokeWidth="0.9" strokeDasharray="2 1.5" />
                  <circle cx="0" cy="0" r="2.2" fill="#FFFBEB" />
                </g>
              </g>
            )}

            {/* STYLE 20 FRONT: CORSET SILK ('corsetSilk' — Couture structured silk bodice with gold eyelets & criss-cross lacing) */}
            {wrapStyle === 'corsetSilk' && (
              <g>
                {/* Sculptural Sweetheart Silk Bodice Wrap */}
                <path
                  d="M172,384 Q224,358 274,394 Q300,412 326,394 Q376,358 428,384 L374,498 L352,588 Q300,602 248,588 L226,498 Z"
                  fill={`url(#${idPrefix}corsetSilkGrad)`}
                  stroke="#FDE68A"
                  strokeWidth="1.8"
                  strokeOpacity="0.88"
                />
                {/* Tailored Vertical Corset Boning Seams */}
                <g stroke={shadeWrapHex(wrapColor, -34)} strokeWidth="1.3" opacity="0.55" fill="none">
                  <path d="M220,384 Q242,452 256,580" />
                  <path d="M262,398 Q272,460 278,584" />
                  <path d="M338,398 Q328,460 322,584" />
                  <path d="M380,384 Q358,452 344,580" />
                </g>
                {/* Criss-Cross Satin Lacing & Metallic Gold Eyelets Down Center Front */}
                <g stroke="#FEF3C7" strokeWidth="1.9" strokeLinecap="round" opacity="0.94">
                  <line x1="283" y1="426" x2="317" y2="448" />
                  <line x1="317" y1="426" x2="283" y2="448" />
                  <line x1="284" y1="448" x2="316" y2="470" />
                  <line x1="316" y1="448" x2="284" y2="470" />
                  <line x1="286" y1="522" x2="314" y2="544" />
                  <line x1="314" y1="522" x2="286" y2="544" />
                  <line x1="288" y1="544" x2="312" y2="566" />
                  <line x1="312" y1="544" x2="288" y2="566" />
                </g>
                {[426, 448, 470, 522, 544, 566].map((ey, idx) => {
                  const spread = idx < 3 ? 17 : 14 - (idx - 3) * 1;
                  return (
                    <g key={`corset-eyelet-${ey}`}>
                      <circle cx={300 - spread} cy={ey} r="3" fill="#F59E0B" stroke="#FFFBEB" strokeWidth="0.9" />
                      <circle cx={300 + spread} cy={ey} r="3" fill="#F59E0B" stroke="#FFFBEB" strokeWidth="0.9" />
                    </g>
                  );
                })}
              </g>
            )}

            {/* STYLE 21 FRONT: WILLOW PORCELAIN URN ('chinoiserieUrn' — Couture cobalt-blue & 24k gold porcelain baluster vessel) */}
            {wrapStyle === 'chinoiserieUrn' && (
              <g>
                <defs>
                  <linearGradient id={`${idPrefix}porcelainGlazeGrad`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={shadeWrapHex(wrapColor, -22)} />
                    <stop offset="28%" stopColor="#FFFFFF" />
                    <stop offset="68%" stopColor={wrapColor} />
                    <stop offset="100%" stopColor={shadeWrapHex(wrapColor, -30)} />
                  </linearGradient>
                </defs>
                {/* Flared Gilded Pedestal Foot */}
                <path
                  d="M222,598 L378,598 L390,620 Q300,630 210,620 Z"
                  fill={`url(#${idPrefix}porcelainGlazeGrad)`}
                  stroke="#1E40AF"
                  strokeWidth="1.5"
                />
                <path d="M214,616 Q300,626 386,616" fill="none" stroke="#D97706" strokeWidth="2.8" />
                {/* Curvaceous Baluster Porcelain Urn Body */}
                <path
                  d="M188,406 C198,424 214,432 216,442 C176,472 174,536 226,598 L374,598 C426,536 424,472 384,442 C386,432 402,424 412,406 Q300,424 188,406 Z"
                  fill={`url(#${idPrefix}porcelainGlazeGrad)`}
                  stroke="#1E40AF"
                  strokeWidth="1.6"
                />
                {/* 24k Gold Lip Rim & Neck Banding */}
                <path d="M188,406 Q300,424 412,406" fill="none" stroke="#D97706" strokeWidth="3.4" />
                <path d="M214,442 Q300,456 386,442" fill="none" stroke="#2563EB" strokeWidth="2" strokeDasharray="6 3" />
                {/* Cobalt Blue Shoulder Fretwork & Botanical Willow Scrollwork */}
                <g fill="none" stroke="#1D4ED8" strokeLinecap="round" opacity="0.86">
                  {/* Upper Scalloped Ruyi Collar */}
                  <path
                    d="M212,456 Q234,476 256,458 Q278,480 300,460 Q322,480 344,458 Q366,476 388,456"
                    strokeWidth="1.7"
                  />
                  {/* Central Hand-Painted Botanical Peony & Willow Vines */}
                  <path d="M234,534 C256,506 280,506 300,536 C320,506 344,506 366,534" strokeWidth="1.8" />
                  <path d="M242,562 C266,544 284,552 300,572 C316,552 334,544 358,562" strokeWidth="1.5" />
                  <circle cx="300" cy="536" r="13.5" strokeWidth="1.6" fill="#DBEAFE" fillOpacity="0.45" />
                  <circle cx="300" cy="536" r="5.5" strokeWidth="1.4" />
                  <circle cx="244" cy="536" r="8" strokeWidth="1.4" />
                  <circle cx="356" cy="536" r="8" strokeWidth="1.4" />
                  <ellipse cx="236" cy="498" rx="9" ry="4" transform="rotate(-24 236 498)" fill="#DBEAFE" fillOpacity="0.4" strokeWidth="1.2" />
                  <ellipse cx="364" cy="498" rx="9" ry="4" transform="rotate(24 364 498)" fill="#DBEAFE" fillOpacity="0.4" strokeWidth="1.2" />
                  {/* Lower Lotus Petal Band */}
                  <path
                    d="M226,584 Q244,568 262,586 Q281,568 300,588 Q319,568 338,586 Q356,568 374,584"
                    strokeWidth="1.5"
                  />
                </g>
                {/* Twin Cobalt Porcelain Shoulder Ring Handles */}
                <circle cx="196" cy="482" r="9.5" fill="none" stroke="#1E40AF" strokeWidth="2.4" />
                <circle cx="404" cy="482" r="9.5" fill="none" stroke="#1E40AF" strokeWidth="2.4" />
                {/* Glossy Ceramic Specular Reflection */}
                <path
                  d="M224,468 C208,498 212,538 236,576"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="5.5"
                  strokeLinecap="round"
                  opacity="0.58"
                />
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
                fill={`url(#${idPrefix}clocheFrontGlassGrad)`}
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
        </g>

        {/* 4A. FRONT OVERLAY ITEMS & ATTACHMENTS LAYER (Floating over the front bouquet wrapper & ribbon, unclipped by wrapper bounds) */}
        <g>
          {visibleRenderItems.map((item) => {
            if (item.hidden || getEffectiveItemPlane(item) !== 'front') return null;
            const isSelected = !isPreviewMode && item.id === selectedId;
            const isClickableBloomPhoto =
              isPreviewMode && !isCardThumbnail && Boolean(item.photoStyle) && Boolean(onPhotoCardClick);
            const disp = getStageItemDisplayTransform(item, wrapStyle);
            const meta = FLOWER_CATALOG.find((m) => m.type === item.type);
            return (
              <g
                key={`front-${item.id}`}
                ref={registerItemMotionRef(item.id)}
                data-bloom-motion="true"
                data-bloom-item-id={item.id}
              >
                <g
                  data-drawer-trigger={isPreviewMode ? undefined : 'true'}
                  data-testid={isClickableBloomPhoto ? `bloom-photo-${item.id}` : undefined}
                  role={isClickableBloomPhoto ? 'button' : undefined}
                  tabIndex={isClickableBloomPhoto ? 0 : undefined}
                  aria-label={
                    isClickableBloomPhoto
                      ? item.photoCaption?.trim()
                        ? `View photo: ${item.photoCaption.trim()}`
                        : 'View attached photo'
                      : undefined
                  }
                  transform={`translate(${disp.x}, ${disp.y}) rotate(${disp.rotation}) scale(${
                    item.flipX ? -disp.scale : disp.scale
                  }, ${disp.scale})`}
                  onPointerDown={isPreviewMode ? undefined : (e) => handleItemPointerDown(e, item)}
                  onClick={
                    isClickableBloomPhoto
                      ? (e) => {
                          e.stopPropagation();
                          onPhotoCardClick?.(item);
                        }
                      : undefined
                  }
                  onKeyDown={
                    isClickableBloomPhoto
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            onPhotoCardClick?.(item);
                          }
                        }
                      : undefined
                  }
                  className={
                    isPreviewMode
                      ? isClickableBloomPhoto
                        ? 'cursor-pointer select-none outline-none focus:outline-none'
                        : 'pointer-events-none cursor-default'
                      : item.locked
                      ? 'cursor-pointer'
                      : 'cursor-grab active:cursor-grabbing'
                  }
                  style={{
                    filter: isSelected
                      ? 'drop-shadow(0px 8px 14px rgba(180,132,108,0.35))'
                      : animatedShadowFilter,
                    ...(isClickableBloomPhoto
                      ? { outline: 'none', WebkitTapHighlightColor: 'transparent', WebkitTouchCallout: 'none' }
                      : {}),
                  }}
                >
                  <g
                    className={!useLivingChoreography && bloomedCount !== undefined ? 'stem-bloom-pop' : ''}
                  >
                    <circle cx="0" cy="-6" r="56" fill="transparent" />
                    {item.photoStyle ? (
                      <BouquetPhotoCardSVG item={item} idPrefix={idPrefix} />
                    ) : (
                      <FlowerRenderer
                        type={item.type}
                        petalColor={item.petalColor}
                        centerColor={item.centerColor}
                        hideStem={Boolean(meta?.isOther)}
                        stemLength={item.stemLength ?? 1}
                      />
                    )}
                    <rect x="-62" y="-64" width="124" height="124" rx="24" fill="transparent" />
                  </g>
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
        {card.visibleOnStage && (useLivingChoreography || showCardInGiftView) && (() => {
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
            <g ref={cardMotionRef} data-bloom-motion="true">
            <g
              transform={`translate(${cardX}, ${cardY})`}
              style={{
                filter: isCardSelected
                  ? 'drop-shadow(0px 8px 14px rgba(180,132,108,0.35))'
                  : animatedShadowFilter,
                outline: 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {/* Inner Rotated & Scaled Card Group centered around (0, 0) */}
              <g transform={`rotate(${cardRotation}) scale(${cardScale})`}>
                <g
                  data-drawer-trigger={isPreviewMode ? undefined : 'true'}
                  aria-label={isPreviewMode ? 'Open greeting card letter' : 'Drag, resize, rotate, or edit greeting card'}
                  onPointerDown={isPreviewMode ? undefined : handleCardPointerDown}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isPreviewMode && !isCardThumbnail) {
                      onCardTagClick?.();
                    }
                  }}
                  style={{
                    outline: 'none',
                    WebkitTapHighlightColor: 'transparent',
                    WebkitTouchCallout: 'none',
                  }}
                  className={
                    isCardThumbnail
                      ? 'pointer-events-none select-none'
                      : isPreviewMode
                      ? `${showCardInGiftView && !isReducedMotion ? 'bouquet-card-wiggle ' : ''}cursor-pointer select-none outline-none focus:outline-none`
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

                  {/* Recipient "Open letter" / "Read note" badge in Preview Mode (omitted on miniature card thumbnails) */}
                  {isPreviewMode && !isCardThumbnail && (
                    <g data-export-ignore="true" transform="translate(0, -76)">
                      <rect
                        x="-62"
                        y="-15"
                        width="124"
                        height="30"
                        rx="15"
                        fill={cardPalette.seal}
                        stroke="#FFFDF9"
                        strokeWidth="1.5"
                        style={{ filter: 'drop-shadow(0px 3px 6px rgba(28,25,23,0.22))' }}
                      />
                      <text
                        x="0"
                        y="4.5"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="13"
                        fontWeight="600"
                        style={{
                          fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
                          letterSpacing: '0.015em',
                        }}
                      >
                        {isUnopenedEnvelope ? 'Open letter' : 'Read note'}
                      </text>
                    </g>
                  )}
                </g>
              </g>

              {/* Upright Editor "Write note" / "Edit note" Action Badge (stays upright even when card is rotated) */}
              {!isPreviewMode && (
                <g
                  data-export-ignore="true"
                  data-drawer-trigger="true"
                  transform={`translate(0, ${Math.round(-54 * cardScale - 24)})`}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSpecialObject('card');
                    onCardTagClick?.();
                  }}
                  style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
                  className="cursor-pointer select-none outline-none focus:outline-none"
                  role="button"
                  aria-label={card.message?.trim() ? 'Edit greeting card note' : 'Write greeting card note'}
                >
                  {/* Generous invisible tap target for mobile ergonomics */}
                  <rect x="-76" y="-23" width="152" height="46" rx="23" fill="transparent" />
                  <rect
                    x="-64"
                    y="-16"
                    width="128"
                    height="32"
                    rx="16"
                    fill="#1C1917"
                    stroke="#ffffff"
                    strokeWidth="1.6"
                    style={{ filter: 'drop-shadow(0px 3px 8px rgba(28,25,23,0.28))' }}
                  />
                  {/* Crisp vector pencil icon */}
                  <path
                    d="M-46,4.5 L-44.8,0.6 L-38.4,-5.8 C-37.7,-6.5 -36.6,-6.5 -35.9,-5.8 L-34.9,-4.8 C-34.2,-4.1 -34.2,-3 -34.9,-2.3 L-41.3,4.1 L-46,4.5 Z"
                    fill="none"
                    stroke="#F4D3B8"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <text
                    x="10"
                    y="4.8"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="13.5"
                    fontWeight="600"
                    style={{
                      fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
                      letterSpacing: '0.01em',
                    }}
                  >
                    {card.message?.trim() ? 'Edit note' : 'Write note'}
                  </text>
                </g>
              )}
            </g>
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
            <g ref={voiceMotionRef} data-bloom-motion="true">
            <g
              transform={`translate(${voiceX}, ${voiceY})`}
              style={{
                filter: isVoiceSelected
                  ? 'drop-shadow(0px 8px 14px rgba(180,132,108,0.35))'
                  : animatedShadowFilter,
                outline: 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <g transform={`rotate(${voiceRotation}) scale(${voiceScale})`}>
                <g
                  data-drawer-trigger={isPreviewMode ? undefined : 'true'}
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
                    if (isPreviewMode && !isCardThumbnail) {
                      onVoiceKeepsakeClick?.();
                    }
                  }}
                  style={{
                    outline: 'none',
                    WebkitTapHighlightColor: 'transparent',
                    WebkitTouchCallout: 'none',
                  }}
                  className={
                    isCardThumbnail
                      ? 'pointer-events-none select-none'
                      : isPreviewMode
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
                  {isPreviewMode && !isCardThumbnail && (
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

              {/* Upright Editor Add Voice / Voice Saved Action Badge */}
              {!isPreviewMode && (
                <g
                  data-export-ignore="true"
                  data-drawer-trigger="true"
                  transform={`translate(0, ${Math.round(-48 * voiceScale - 24)})`}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSpecialObject('voice');
                    onVoiceKeepsakeClick?.();
                  }}
                  style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
                  className="cursor-pointer select-none outline-none focus:outline-none"
                  role="button"
                  aria-label={voice.audioDataUrl ? 'Edit recorded voice keepsake' : 'Add voice recording'}
                >
                  {/* Generous invisible tap target for mobile ergonomics */}
                  <rect x="-80" y="-23" width="160" height="46" rx="23" fill="transparent" />
                  <rect
                    x="-68"
                    y="-16"
                    width="136"
                    height="32"
                    rx="16"
                    fill={isVoicePlaying ? '#e11d48' : '#1C1917'}
                    stroke="#ffffff"
                    strokeWidth="1.6"
                    style={{ filter: 'drop-shadow(0px 3px 8px rgba(28,25,23,0.28))' }}
                  />
                  {/* Crisp vector mic / check / pause icon */}
                  {isVoicePlaying ? (
                    <g fill="#ffffff">
                      <rect x="-50" y="-5" width="3" height="10" rx="1" />
                      <rect x="-44.5" y="-5" width="3" height="10" rx="1" />
                    </g>
                  ) : voice.audioDataUrl ? (
                    <path
                      d="M-51,0.5 L-47,4.5 L-39.5,-3.5"
                      fill="none"
                      stroke="#86efac"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : (
                    <g
                      fill="none"
                      stroke="#F4D3B8"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="-49" y="-6.5" width="5" height="8.5" rx="2.5" />
                      <path d="M-52,-1 A5.5,5.5 0 0,0 -41,-1 M-46.5,4.5 L-46.5,7.2" />
                    </g>
                  )}
                  <text
                    x="10"
                    y="4.8"
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="13.5"
                    fontWeight="600"
                    style={{
                      fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
                      letterSpacing: '0.01em',
                    }}
                  >
                    {isVoicePlaying
                      ? 'Playing...'
                      : voice.audioDataUrl
                      ? 'Voice saved'
                      : 'Add voice'}
                  </text>
                </g>
              )}
            </g>
            </g>
          );
        })()}
        </g>

        {/* 5C. CORNER CONTROLS (STRAIGHTEN, HIDE X & RESIZE+ROTATE) FOR GREETING CARD */}
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
            const ringRadius = Math.max(76, 76 * cardScale);
            return (
              <g
                data-export-ignore="true"
                data-drawer-trigger="true"
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
                  <circle cx="0" cy="0" r="32" fill="transparent" />
                  <circle
                    cx="0"
                    cy="0"
                    r="18.5"
                    fill="#ffffff"
                    stroke="#B4846C"
                    strokeWidth="2.4"
                    style={{ filter: 'drop-shadow(0px 3px 6px rgba(28,25,23,0.18))' }}
                  />
                  <path
                    d="M-5.5,0 A5.5,5.5 0 1,1 3.8,-3.8 M3.8,-7.5 L3.8,-3.2 L-0.5,-3.2"
                    stroke="#1C1917"
                    strokeWidth="2.1"
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
                  <circle cx="0" cy="0" r="34" fill="transparent" />
                  <circle
                    cx="0"
                    cy="0"
                    r="19.5"
                    fill="#e11d48"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                    style={{ filter: 'drop-shadow(0px 3px 6px rgba(225,29,72,0.28))' }}
                  />
                  <path
                    d="M-5.5,-5.5 L5.5,5.5 M5.5,-5.5 L-5.5,5.5"
                    stroke="#ffffff"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                </g>

                {/* BOTTOM-RIGHT HANDLE (+45°): Drag to Resize & Rotate */}
                <g
                  transform={`translate(${Math.cos(Math.PI / 4) * ringRadius}, ${
                    Math.sin(Math.PI / 4) * ringRadius
                  })`}
                  onPointerDown={handleCardResizePointerDown}
                  style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
                  className="cursor-nwse-resize select-none outline-none focus:outline-none"
                  role="slider"
                  aria-label="Drag to resize and rotate greeting card"
                  aria-valuenow={Math.round(cardScale * 100)}
                >
                  <title>Drag corner to resize and rotate card</title>
                  <circle
                    cx="0"
                    cy="0"
                    r={interaction?.mode === 'resize-card' ? 30 : 25}
                    fill="#B4846C"
                    opacity={interaction?.mode === 'resize-card' ? 0.3 : 0.16}
                    className="pointer-events-none"
                  />
                  <circle cx="0" cy="0" r="36" fill="transparent" />
                  <circle
                    cx="0"
                    cy="0"
                    r="21"
                    fill={interaction?.mode === 'resize-card' ? '#B4846C' : '#1C1917'}
                    stroke="#ffffff"
                    strokeWidth="2.5"
                    style={{ filter: 'drop-shadow(0px 3px 8px rgba(28,25,23,0.28))' }}
                  />
                  <path
                    d="M-6.5,-6.5 L6.5,6.5 M-6.5,-1.5 L-6.5,-6.5 L-1.5,-6.5 M6.5,1.5 L6.5,6.5 L1.5,6.5"
                    stroke="#ffffff"
                    strokeWidth="2.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  <g transform="translate(0, 38)" className="pointer-events-none">
                    <rect
                      x="-72"
                      y="-15"
                      width="144"
                      height="30"
                      rx="15"
                      fill="#1C1917"
                      fillOpacity="0.92"
                      stroke="#ffffff"
                      strokeWidth="1.4"
                      strokeOpacity="0.85"
                      style={{ filter: 'drop-shadow(0px 3px 6px rgba(28,25,23,0.26))' }}
                    />
                    <text
                      x="0"
                      y="4.5"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="13"
                      fontWeight="600"
                      style={{
                        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
                      }}
                    >
                      {interaction?.mode === 'resize-card'
                        ? `${Math.round(cardScale * 100)}% · ${cardRotation}°`
                        : 'Drag to resize'}
                    </text>
                  </g>
                </g>
              </g>
            );
          })()}

        {/* 5D. CORNER CONTROLS (STRAIGHTEN, HIDE X & RESIZE+ROTATE) FOR VOICE KEEPSAKE */}
        {!isPreviewMode &&
          voice?.visibleOnStage &&
          (activeSpecialObject === 'voice' ||
            interaction?.mode === 'move-voice' ||
            interaction?.mode === 'resize-voice') && (() => {
            const voiceX = voice.x ?? 185;
            const voiceY = voice.y ?? 525;
            const voiceScale = voice.scale ?? 1.0;
            const voiceRotation = voice.rotation ?? 0;
            const ringRadius = Math.max(68, 66 * voiceScale);
            return (
              <g
                data-export-ignore="true"
                data-drawer-trigger="true"
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
                  <circle cx="0" cy="0" r="32" fill="transparent" />
                  <circle
                    cx="0"
                    cy="0"
                    r="18.5"
                    fill="#ffffff"
                    stroke="#B4846C"
                    strokeWidth="2.4"
                    style={{ filter: 'drop-shadow(0px 3px 6px rgba(28,25,23,0.18))' }}
                  />
                  <path
                    d="M-5.5,0 A5.5,5.5 0 1,1 3.8,-3.8 M3.8,-7.5 L3.8,-3.2 L-0.5,-3.2"
                    stroke="#1C1917"
                    strokeWidth="2.1"
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
                  <circle cx="0" cy="0" r="34" fill="transparent" />
                  <circle
                    cx="0"
                    cy="0"
                    r="19.5"
                    fill="#e11d48"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                    style={{ filter: 'drop-shadow(0px 3px 6px rgba(225,29,72,0.28))' }}
                  />
                  <path
                    d="M-5.5,-5.5 L5.5,5.5 M5.5,-5.5 L-5.5,5.5"
                    stroke="#ffffff"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                </g>

                {/* BOTTOM-RIGHT HANDLE (+45°): Drag to Resize & Rotate */}
                <g
                  transform={`translate(${Math.cos(Math.PI / 4) * ringRadius}, ${
                    Math.sin(Math.PI / 4) * ringRadius
                  })`}
                  onPointerDown={handleVoiceResizePointerDown}
                  style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
                  className="cursor-nwse-resize select-none outline-none focus:outline-none"
                  role="slider"
                  aria-label="Drag to resize and rotate voice keepsake"
                  aria-valuenow={Math.round(voiceScale * 100)}
                >
                  <title>Drag corner to resize and rotate voice keepsake</title>
                  <circle
                    cx="0"
                    cy="0"
                    r={interaction?.mode === 'resize-voice' ? 30 : 25}
                    fill="#B4846C"
                    opacity={interaction?.mode === 'resize-voice' ? 0.3 : 0.16}
                    className="pointer-events-none"
                  />
                  <circle cx="0" cy="0" r="36" fill="transparent" />
                  <circle
                    cx="0"
                    cy="0"
                    r="21"
                    fill={interaction?.mode === 'resize-voice' ? '#B4846C' : '#1C1917'}
                    stroke="#ffffff"
                    strokeWidth="2.5"
                    style={{ filter: 'drop-shadow(0px 3px 8px rgba(28,25,23,0.28))' }}
                  />
                  <path
                    d="M-6.5,-6.5 L6.5,6.5 M-6.5,-1.5 L-6.5,-6.5 L-1.5,-6.5 M6.5,1.5 L6.5,6.5 L1.5,6.5"
                    stroke="#ffffff"
                    strokeWidth="2.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  <g transform="translate(0, 38)" className="pointer-events-none">
                    <rect
                      x="-72"
                      y="-15"
                      width="144"
                      height="30"
                      rx="15"
                      fill="#1C1917"
                      fillOpacity="0.92"
                      stroke="#ffffff"
                      strokeWidth="1.4"
                      strokeOpacity="0.85"
                      style={{ filter: 'drop-shadow(0px 3px 6px rgba(28,25,23,0.26))' }}
                    />
                    <text
                      x="0"
                      y="4.5"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="13"
                      fontWeight="600"
                      style={{
                        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
                      }}
                    >
                      {interaction?.mode === 'resize-voice'
                        ? `${Math.round(voiceScale * 100)}% · ${voiceRotation}°`
                        : 'Drag to resize'}
                    </text>
                  </g>
                </g>
              </g>
            );
          })()}

        {/* 6. INTERACTIVE SELECTION RING, WORKING DELETE (X) BUTTON & RESIZE+ROTATE HANDLE (Inside Bouquet Transform Space) */}
        {!isPreviewMode && selectedItem && selectedDisplay && !selectedItem.hidden && (() => {
          const handleRingRadius = Math.max(66, 60 * selectedDisplay.scale);
          return (
          <g data-export-ignore="true" data-drawer-trigger="true" transform={bouquetTransform}>
          <g
            transform={`translate(${selectedDisplay.x}, ${selectedDisplay.y})`}
          >
            {/* Direct Drag-Capture Surface Inside Selection Ring (Allows dragging selected item even when overlapped by front wrapper/ribbon/card) */}
            <circle
              cx="0"
              cy="0"
              r={Math.max(44, 50 * selectedDisplay.scale)}
              fill="transparent"
              onPointerDown={(e) => handleItemPointerDown(e, selectedItem)}
              className={
                selectedItem.locked
                  ? 'cursor-pointer'
                  : 'cursor-grab active:cursor-grabbing'
              }
            />

            {/* Outer Selection Ring */}
            <circle
              cx="0"
              cy="0"
              r={handleRingRadius}
              fill="none"
              stroke={selectedItem.locked ? '#d97706' : '#B4846C'}
              strokeWidth="2"
              strokeDasharray={selectedItem.locked ? '5 5' : '7 5'}
              className="pointer-events-none"
            />

            {/* On-Canvas Upload Photo Badge for Selected Photocard */}
            {selectedItem.photoStyle && !selectedItem.locked && onPhotoCardUploadClick && (
              <g
                transform={`translate(0, ${-handleRingRadius - 24})`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onPhotoCardUploadClick(selectedItem.id);
                }}
                className="cursor-pointer select-none"
                role="button"
                aria-label="Upload photo for photocard"
              >
                <rect x="-82" y="-23" width="164" height="46" rx="23" fill="transparent" />
                <rect
                  x="-72"
                  y="-16"
                  width="144"
                  height="32"
                  rx="16"
                  fill="#1C1917"
                  stroke="#ffffff"
                  strokeWidth="1.6"
                  style={{ filter: 'drop-shadow(0px 3px 8px rgba(28,25,23,0.28))' }}
                />
                <text
                  x="0"
                  y="4.8"
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="13.5"
                  fontWeight="600"
                  style={{
                    fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
                  }}
                >
                  {selectedItem.photoDataUrl ? 'Change photo' : 'Upload photo'}
                </text>
              </g>
            )}

            {selectedItem.locked ? (
              /* Locked Indicator Badge on Ring Top — Tap to Unlock */
              <g
                transform={`translate(0, ${-handleRingRadius - 24})`}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  toggleItemLock(selectedItem.id);
                }}
                className="cursor-pointer"
                role="button"
                aria-label="Unlock flower"
              >
                <rect x="-94" y="-23" width="188" height="46" rx="23" fill="transparent" />
                <rect
                  x="-86"
                  y="-16"
                  width="172"
                  height="32"
                  rx="16"
                  fill="#1C1917"
                  stroke="#f59e0b"
                  strokeWidth="1.8"
                  style={{ filter: 'drop-shadow(0px 3px 8px rgba(28,25,23,0.28))' }}
                />
                <text
                  x="0"
                  y="4.8"
                  textAnchor="middle"
                  fill="#fde68a"
                  fontSize="13"
                  fontWeight="600"
                  style={{
                    fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
                  }}
                >
                  Locked · Tap to unlock
                </text>
              </g>
            ) : (
              <>
                {/* TOP-LEFT HANDLE (-135°): Quick Flip Button */}
                <g
                  transform={`translate(${Math.cos((-3 * Math.PI) / 4) * handleRingRadius}, ${
                    Math.sin((-3 * Math.PI) / 4) * handleRingRadius
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
                  <circle cx="0" cy="0" r="32" fill="transparent" />
                  <circle
                    cx="0"
                    cy="0"
                    r="18.5"
                    fill="#ffffff"
                    stroke="#B4846C"
                    strokeWidth="2.4"
                    style={{ filter: 'drop-shadow(0px 3px 6px rgba(28,25,23,0.18))' }}
                  />
                  <path
                    d="M-7,0 L7,0 M-7,0 L-3,-4 M-7,0 L-3,4 M7,0 L3,-4 M7,0 L3,4"
                    stroke="#1C1917"
                    strokeWidth="2.1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </g>

                {/* TOP-RIGHT HANDLE (-45°): Working Delete (X) Button */}
                <g
                  transform={`translate(${Math.cos(-Math.PI / 4) * handleRingRadius}, ${
                    Math.sin(-Math.PI / 4) * handleRingRadius
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
                  <circle cx="0" cy="0" r="34" fill="transparent" />
                  <circle
                    cx="0"
                    cy="0"
                    r="19.5"
                    fill="#e11d48"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                    style={{ filter: 'drop-shadow(0px 3px 6px rgba(225,29,72,0.28))' }}
                  />
                  <path
                    d="M-5.5,-5.5 L5.5,5.5 M5.5,-5.5 L-5.5,5.5"
                    stroke="#ffffff"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                </g>

                {/* BOTTOM-RIGHT HANDLE (+45°): Drag to Resize & Rotate */}
                <g
                  transform={`translate(${Math.cos(Math.PI / 4) * handleRingRadius}, ${
                    Math.sin(Math.PI / 4) * handleRingRadius
                  })`}
                  onPointerDown={(e) => handleGizmoPointerDown(e, selectedItem)}
                  className="cursor-nwse-resize"
                  role="slider"
                  aria-label="Drag to resize and rotate flower"
                  aria-valuenow={Math.round(selectedItem.scale * 100)}
                >
                  <title>Drag corner to resize and rotate</title>
                  {/* Radial Pull-In / Pull-Out Guide Line showing resize axis */}
                  <line
                    x1="-28"
                    y1="-28"
                    x2="28"
                    y2="28"
                    stroke="#B4846C"
                    strokeWidth="2"
                    strokeDasharray="3 3"
                    className="pointer-events-none"
                  />
                  {/* Outer pulse halo when actively resizing */}
                  <circle
                    cx="0"
                    cy="0"
                    r={interaction?.mode === 'transform' ? 30 : 25}
                    fill="#B4846C"
                    opacity={interaction?.mode === 'transform' ? 0.3 : 0.16}
                    className="pointer-events-none"
                  />
                  {/* Generous invisible touch target for effortless mobile manipulation */}
                  <circle cx="0" cy="0" r="36" fill="transparent" />
                  {/* Main Resize Handle Badge */}
                  <circle
                    cx="0"
                    cy="0"
                    r="21"
                    fill={interaction?.mode === 'transform' ? '#B4846C' : '#1C1917'}
                    stroke="#ffffff"
                    strokeWidth="2.5"
                    style={{ filter: 'drop-shadow(0px 3px 8px rgba(28,25,23,0.28))' }}
                  />
                  {/* Bidirectional Diagonal Pull-In / Pull-Out Resize Arrow Icon */}
                  <path
                    d="M-6.5,-6.5 L6.5,6.5 M-6.5,-1.5 L-6.5,-6.5 L-1.5,-6.5 M6.5,1.5 L6.5,6.5 L1.5,6.5"
                    stroke="#ffffff"
                    strokeWidth="2.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />

                  {/* Crisp High-Contrast Indicator Badge: Shows "Drag to resize" or live scale % · angle */}
                  <g transform="translate(0, 38)" className="pointer-events-none">
                    <rect
                      x="-72"
                      y="-15"
                      width="144"
                      height="30"
                      rx="15"
                      fill="#1C1917"
                      fillOpacity="0.92"
                      stroke="#ffffff"
                      strokeWidth="1.4"
                      strokeOpacity="0.85"
                      style={{ filter: 'drop-shadow(0px 3px 6px rgba(28,25,23,0.26))' }}
                    />
                    <text
                      x="0"
                      y="4.5"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="13"
                      fontWeight="600"
                      style={{
                        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
                      }}
                    >
                      {interaction?.mode === 'transform'
                        ? `${Math.round(selectedItem.scale * 100)}% · ${selectedItem.rotation}°`
                        : 'Drag to resize'}
                    </text>
                  </g>
                </g>
              </>
            )}
          </g>
          </g>
          );
        })()}
      </svg>
  );

  if (isCardThumbnail) {
    return (
      <div className="relative w-full h-full flex items-center justify-center p-0 select-none overflow-hidden">
        {svgStageElement}
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-full flex items-center justify-center p-2.5 sm:p-5 select-none overflow-hidden"
      style={{ containerType: 'size' }}
    >
      <div
        data-testid="bouquet-canvas-frame"
        className={`relative overflow-hidden ${
          isPanningCanvas
            ? 'transition-none'
            : 'transition-[transform,border-color,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]'
        }`}
        style={{
          width: 'min(100cqw, calc(100cqh * 648 / 680), 860px)',
          height: 'min(100cqh, calc(100cqw * 680 / 648), 902px)',
          borderRadius: '5.247% / 5%',
          transform:
            !isPreviewMode && (canvasZoom !== 1 || canvasPan.x !== 0 || canvasPan.y !== 0)
              ? `translate3d(${canvasPan.x}px, ${canvasPan.y}px, 0) scale(${canvasZoom})`
              : undefined,
          transformOrigin: 'center center',
          border: isPreviewMode
            ? `1.5px solid ${envBackdrop.canvasBorderColor}`
            : `1px solid ${isDarkMode ? 'rgba(251, 246, 241, 0.09)' : 'rgba(28, 25, 23, 0.07)'}`,
          boxShadow: isPreviewMode
            ? envBackdrop.canvasShadow
            : isDarkMode
              ? '0 14px 36px -14px rgba(10, 7, 6, 0.42)'
              : '0 12px 30px -14px rgba(28, 25, 23, 0.08)',
        }}
      >
        {svgStageElement}
      </div>

      {/* Screen-reader only status when canvas has 0 stems (Visual 'Start arranging' card removed per user request) */}
      {items.length === 0 && !isPreviewMode && (
        <span className="sr-only">
          Start arranging — Add flowers from the palette, or try a random arrangement.
        </span>
      )}
    </div>
  );
};


