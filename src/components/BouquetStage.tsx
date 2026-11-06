import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Flower2 } from 'lucide-react';
import {
  CardTheme,
  CardThemePalette,
  RibbonStyle,
  typeWrapStyle,
  BouquetItem,
  GreetingCardData,
  FLOWER_CATALOG,
  getCardThemePalette,
} from '../types/bouquet';
import { FlowerRenderer } from './flowers/FlowerRenderer';
import { useBouquetStore } from '../store/useBouquetStore';

// ============================================================================
// MODULE 5: components/BouquetStage.tsx — INTERACTIVE POINTER-EVENTS SVG STAGE
// ============================================================================

/**
 * Universal Architectural Ribbon & Lace Renderer — 7 Unique Designs that adapt to every wrapper's waist
 */
export const BouquetRibbonSVG: React.FC<{
  ribbonStyle: RibbonStyle;
  ribbonColor: string;
  wrapStyle: typeWrapStyle;
}> = ({ ribbonStyle, ribbonColor, wrapStyle }) => {
  // Compute wrapper-specific waist Y and half-width so every ribbon/lace fits every wrapper
  const waistY = wrapStyle === 'basket' ? 436 : wrapStyle === 'vase' ? 442 : 506;
  const halfW =
    wrapStyle === 'basket'
      ? 144
      : wrapStyle === 'vase'
      ? 92
      : wrapStyle === 'plain'
      ? 36
      : 80;
  const leftX = 300 - halfW;
  const rightX = 300 + halfW;
  const tailBottomY = wrapStyle === 'basket' ? 536 : wrapStyle === 'vase' ? 534 : 622;

  return (
    <g className="pointer-events-none">
      {/* 1. CLASSIC SATIN BOW (Sculpted satin loops, waist sash & dovetail streamers) */}
      {ribbonStyle === 'satin' && (
        <g>
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
          {/* Contoured Satin Waist Sash */}
          <path
            d={`M${leftX},${waistY - 6} Q300,${waistY + 8} ${rightX},${waistY - 6} L${rightX - 2},${waistY + 9} Q300,${waistY + 23} ${leftX + 2},${waistY + 9} Z`}
            fill={ribbonColor}
            stroke="#ffffff"
            strokeWidth="1"
            strokeOpacity="0.35"
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
      )}

      {/* 2. BRIDAL EYELET LACE (Scalloped pierced-eyelet lace band + floral lace bow + pearl brooch) */}
      {ribbonStyle === 'lace' && (
        <g>
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
      )}

      {/* 3. CRISS-CROSS CORSET TIE (Architectural X-laced ribbon corset waist + lower bow & tassels) */}
      {ribbonStyle === 'corset' && (
        <g>
          {/* Upper & Lower Horizontal Corset Bands */}
          <path
            d={`M${leftX + 6},${waistY - 22} Q300,${waistY - 10} ${rightX - 6},${waistY - 22}`}
            fill="none"
            stroke={ribbonColor}
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <path
            d={`M${leftX + 2},${waistY + 18} Q300,${waistY + 30} ${rightX - 2},${waistY + 18}`}
            fill="none"
            stroke={ribbonColor}
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          {/* Criss-Cross X-Lacing */}
          <path
            d={`M${300 - halfW * 0.55},${waistY - 18} L${300 + halfW * 0.52},${waistY + 2} M${300 + halfW * 0.55},${waistY - 18} L${300 - halfW * 0.52},${waistY + 2}`}
            fill="none"
            stroke={ribbonColor}
            strokeWidth="3.8"
            strokeLinecap="round"
          />
          <path
            d={`M${300 - halfW * 0.52},${waistY + 2} L${300 + halfW * 0.48},${waistY + 21} M${300 + halfW * 0.52},${waistY + 2} L${300 - halfW * 0.48},${waistY + 21}`}
            fill="none"
            stroke={ribbonColor}
            strokeWidth="3.8"
            strokeLinecap="round"
          />
          {/* Pearl Eyelet Studs at Corset Anchor Points */}
          <g fill="#FFFDF9" stroke={ribbonColor} strokeWidth="1.4">
            <circle cx={300 - halfW * 0.55} cy={waistY - 18} r="3.5" />
            <circle cx={300 + halfW * 0.55} cy={waistY - 18} r="3.5" />
            <circle cx={300 - halfW * 0.52} cy={waistY + 2} r="3.5" />
            <circle cx={300 + halfW * 0.52} cy={waistY + 2} r="3.5" />
            <circle cx={300 - halfW * 0.48} cy={waistY + 21} r="3.5" />
            <circle cx={300 + halfW * 0.48} cy={waistY + 21} r="3.5" />
          </g>
          {/* Petite Lower Tie Bow & Hanging Tassels */}
          <path
            d={`M297,${waistY + 24} C266,${waistY + 8} 262,${waistY + 42} 295,${waistY + 30} Z`}
            fill={ribbonColor}
            stroke="#ffffff"
            strokeWidth="1"
          />
          <path
            d={`M303,${waistY + 24} C334,${waistY + 8} 338,${waistY + 42} 305,${waistY + 30} Z`}
            fill={ribbonColor}
            stroke="#ffffff"
            strokeWidth="1"
          />
          <path
            d={`M296,${waistY + 26} Q284,${(waistY + tailBottomY) / 2 + 12} 276,${tailBottomY} M304,${waistY + 26} Q316,${(waistY + tailBottomY) / 2 + 12} 324,${tailBottomY}`}
            fill="none"
            stroke={ribbonColor}
            strokeWidth="3.8"
            strokeLinecap="round"
          />
          <circle cx="300" cy={waistY + 26} r="6.5" fill={ribbonColor} stroke="#ffffff" strokeWidth="1.2" />
        </g>
      )}

      {/* 4. DOUBLE COUTURE ROSETTE (Multi-looped Parisian rosette bow + wide sash + twin tails) */}
      {ribbonStyle === 'double' && (
        <g>
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
          {/* Wide Belted Waist Sash */}
          <path
            d={`M${leftX},${waistY - 8} Q300,${waistY + 6} ${rightX},${waistY - 8} L${rightX - 2},${waistY + 10} Q300,${waistY + 24} ${leftX + 2},${waistY + 10} Z`}
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
      )}

      {/* 6. SHEER CHIFFON DRAPE (Translucent billowy organza butterfly loops + gossamer trailing veils) */}
      {ribbonStyle === 'organza' && (
        <g>
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
          {/* Sheer Pleated Organza Waist Wrap */}
          <path
            d={`M${leftX - 2},${waistY - 10} Q300,${waistY + 6} ${rightX + 2},${waistY - 10} L${rightX - 1},${waistY + 12} Q300,${waistY + 28} ${leftX + 1},${waistY + 12} Z`}
            fill={ribbonColor}
            fillOpacity="0.62"
            stroke="#FFFFFF"
            strokeWidth="1.2"
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
      )}

      {/* 7. CAMEO VELVET SASH (Rich draped velvet band + gold-rimmed oval pearl cameo clasp & fringed ends) */}
      {ribbonStyle === 'velvet' && (
        <g>
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
          {/* Rich Velvet Waist Belt with Gold Piping */}
          <path
            d={`M${leftX},${waistY - 8} Q300,${waistY + 6} ${rightX},${waistY - 8} L${rightX - 2},${waistY + 10} Q300,${waistY + 24} ${leftX + 2},${waistY + 10} Z`}
            fill={ribbonColor}
            stroke="#FDE68A"
            strokeWidth="1.4"
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
      )}
    </g>
  );
};

/**
 * 7 Unique Architectural Greeting Card Tag Silhouettes for BouquetStage
 */
export const BouquetCardShapeSVG: React.FC<{
  theme: CardTheme;
  palette: CardThemePalette;
}> = ({ theme, palette }) => (
  <g>
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

export interface BouquetStageProps {
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
    ribbonStyle,
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
  const wrapperBottomClipY =
    wrapStyle === 'basket'
      ? 596
      : wrapStyle === 'vase'
      ? 610
      : wrapStyle === 'plain'
      ? 650
      : 618;

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

          {/* Wrapper Bottom Boundary Clip (Prevents stems from poking below wrapper/basket/vase) */}
          <clipPath id="bouquetWrapperBoundsClip">
            <rect x="0" y="0" width="600" height={wrapperBottomClipY} />
          </clipPath>

          {/* Per-Flower Adjustable Stem Length ClipPaths */}
          {items.map((item) => {
            const stemRatio = item.stemLength ?? 1;
            const localBottomY = Math.round(18 + 145 * stemRatio);
            return (
              <clipPath key={`stem-clip-${item.id}`} id={`stem-clip-${item.id}`}>
                <rect x="-170" y="-170" width="340" height={170 + localBottomY} />
              </clipPath>
            );
          })}
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

        {/* Gather Stems at the Bouquet Tie Point (Only shown for hand-tied or open-bottom sleeves) */}
        {wrapStyle !== 'basket' && wrapStyle !== 'vase' && (
          <g opacity="0.85" clipPath="url(#bouquetWrapperBoundsClip)">
            <path d="M288,490 L264,612" stroke="#15803d" strokeWidth="6" strokeLinecap="round" />
            <path d="M296,490 L285,616" stroke="#16a34a" strokeWidth="6.5" strokeLinecap="round" />
            <path d="M304,490 L315,616" stroke="#15803d" strokeWidth="6.5" strokeLinecap="round" />
            <path d="M312,490 L336,612" stroke="#22c55e" strokeWidth="6" strokeLinecap="round" />
            <path d="M300,490 L300,618" stroke="#166534" strokeWidth="7" strokeLinecap="round" />
          </g>
        )}

        {/* 3. BOUQUET FLOWERS & FOLIAGE LAYER (Clipped to wrapper bounds & per-stem adjustable stemLength) */}
        <g clipPath="url(#bouquetWrapperBoundsClip)">
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
                <g
                  clipPath={`url(#stem-clip-${item.id})`}
                  className={bloomedCount !== undefined ? 'stem-bloom-pop' : ''}
                >
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
        </g>

        {/* 4. FRONT WRAPPING LAYER & UNIVERSAL RIBBON / LACE DESIGN (Overlaps Lower Stems) */}
        <g filter="url(#softShadow)" className="pointer-events-none">
          {/* STYLE 1 FRONT: ORIGAMI KRAFT */}
          {wrapStyle === 'kraft' && (
            <g>
              <path d="M168,390 L265,455 L242,518 L195,512 Z" fill="#B3A296" />
              <path d="M432,390 L335,455 L358,518 L405,512 Z" fill="#B3A296" />
              <path
                d="M174,394 Q300,418 426,394 L388,512 L212,512 Z"
                fill="#CEC0B5"
                stroke="#DFD5CD"
                strokeWidth="1.2"
              />
              <path
                d="M224,508 L376,508 L360,625 L240,625 Z"
                fill="#C4B4A8"
              />
              <path d="M258,510 L248,625 L270,625 L276,510 Z" fill="#AE9D90" opacity="0.85" />
              <path d="M342,510 L352,625 L330,625 L324,510 Z" fill="#AE9D90" opacity="0.85" />
              <line x1="300" y1="510" x2="300" y2="625" stroke="#B3A296" strokeWidth="1.5" />
            </g>
          )}

          {/* STYLE 2 FRONT: BUTTERFLY PETAL */}
          {wrapStyle === 'tissue' && (
            <g>
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
              <path
                d="M150,362 Q232,415 318,518 L222,520 Q180,445 150,362 Z"
                fill="#FFC6D3"
                stroke="#FFE8EE"
                strokeWidth="1.2"
              />
              <path
                d="M450,362 Q368,415 282,518 L378,520 Q420,445 450,362 Z"
                fill="#FFD4DF"
                stroke="#FFF0F4"
                strokeWidth="1.2"
              />
            </g>
          )}

          {/* STYLE 3 FRONT: TULIP ORGANZA */}
          {wrapStyle === 'chalice' && (
            <g>
              <path
                d="M218,505 L382,505 L370,625 Q300,632 230,625 Z"
                fill="#E8D7F3"
              />
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
              <path
                d="M182,415 Q300,455 418,415 L380,508 L220,508 Z"
                fill="#F3E9FA"
                opacity="0.78"
              />
            </g>
          )}

          {/* STYLE 4 FRONT: WICKER BASKET */}
          {wrapStyle === 'basket' && (
            <g>
              <path
                d="M158,422 L442,422 L392,598 Q300,616 208,598 Z"
                fill="#C89B6E"
                stroke="#9C6F44"
                strokeWidth="2.5"
              />
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
              <path
                d="M202,594 Q300,612 398,594 L392,614 Q300,630 208,614 Z"
                fill="#8B5E34"
              />
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
            </g>
          )}

          {/* STYLE 5 FRONT: PARISIAN SCRIPT */}
          {wrapStyle === 'vintage' && (
            <g>
              <path
                d="M126,282 L310,475 L252,618 L194,492 Z"
                fill="#E5D7C3"
                stroke="#CBB99F"
                strokeWidth="1.5"
              />
              <path
                d="M474,272 L288,482 L348,618 L408,485 Z"
                fill="#F3ECE0"
                stroke="#D5C5AE"
                strokeWidth="1.5"
              />
              <path
                d="M214,432 L300,486 L388,426 L346,618 Q300,628 254,618 Z"
                fill="#EFE6D5"
                stroke="#D5C5AE"
                strokeWidth="1.2"
              />
              <g stroke="#9E8C74" strokeWidth="1.4" opacity="0.6">
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
                fill="#FCE7F3"
                stroke="#F9A8D4"
                strokeWidth="1.2"
              />
              <g stroke="#F472B6" strokeWidth="1.2" opacity="0.35">
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
                stroke="#F9A8D4"
                strokeWidth="1.5"
              />
            </g>
          )}

          {/* STYLE 7 FRONT: STARLIT NOIR */}
          {wrapStyle === 'celestial' && (
            <g>
              <path
                d="M118,272 L300,472 L250,618 L190,488 Z"
                fill="#1E293B"
                stroke="#F59E0B"
                strokeWidth="2"
              />
              <path
                d="M482,272 L300,472 L350,618 L410,488 Z"
                fill="#0F172A"
                stroke="#FBBF24"
                strokeWidth="2"
              />
              <path
                d="M210,432 L300,482 L390,432 L346,616 Q300,628 254,616 Z"
                fill="#1E293B"
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
              <path
                d="M206,408 L394,408 C382,446 426,505 384,598 L368,622 L232,622 L216,598 C174,505 218,446 206,408 Z"
                fill="#EAE0D5"
                stroke="#CBB9A8"
                strokeWidth="2"
              />
              <path
                d="M300,408 L394,408 C382,446 426,505 384,598 L368,622 L300,622 Z"
                fill="#D8C8B8"
                opacity="0.45"
              />
              <g stroke="#C4B2A0" strokeWidth="2" fill="none" opacity="0.72">
                <path d="M236,422 C215,485 222,555 246,612" />
                <path d="M266,424 C254,485 258,555 272,614" />
                <path d="M300,425 L300,615" />
                <path d="M334,424 C346,485 342,555 328,614" />
                <path d="M364,422 C385,485 378,555 354,612" />
              </g>
              <rect x="198" y="398" width="204" height="16" rx="8" fill="#F4EDE6" stroke="#CBB9A8" strokeWidth="1.8" />
              <rect x="226" y="612" width="148" height="14" rx="6" fill="#B4846C" />
            </g>
          )}

          {/* UNIVERSAL RIBBON / LACE DESIGN (Fits every wrapper!) */}
          <BouquetRibbonSVG
            ribbonStyle={ribbonStyle || 'satin'}
            ribbonColor={ribbonColor}
            wrapStyle={wrapStyle}
          />
        </g>

        {/* 5. PINNED GREETING CARD TAG ON BOUQUET (Clickable in editor to open Card Editor; wiggles & opens letter modal in preview/gift mode) */}
        {card.visibleOnStage && showCardInGiftView && (() => {
          const cardPalette = getCardThemePalette(card.theme, card.customBg);
          return (
            <g transform="translate(425, 520) rotate(-6)" filter="url(#softShadow)">
              {/* Fastener cord pinned to bouquet */}
              <path
                d="M-115,-18 Q-55,-25 -10,-32"
                stroke={cardPalette.inner}
                strokeWidth="1.6"
                fill="none"
                opacity="0.85"
                className={isPreviewMode ? 'pointer-events-none bouquet-cord-bloom' : 'pointer-events-none'}
              />
              {/* Card Group: Clickable in BOTH editor mode (opens card editor) and preview/shared mode (opens letter modal) */}
              <g
                role="button"
                tabIndex={0}
                aria-label={isPreviewMode ? 'Open greeting card letter' : 'Edit greeting card'}
                onClick={(e) => {
                  e.stopPropagation();
                  onCardTagClick?.();
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    onCardTagClick?.();
                  }
                }}
                className={
                  isPreviewMode
                    ? 'bouquet-card-wiggle cursor-pointer'
                    : 'cursor-pointer hover:brightness-[0.98] transition'
                }
              >
                <BouquetCardShapeSVG theme={card.theme} palette={cardPalette} />

                <text
                  x="-46"
                  y="-18"
                  fill={cardPalette.title}
                  fontSize="12"
                  fontWeight="600"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  {card.to.slice(0, 22)}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      onCardTagClick?.();
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    onWheel={(e) => e.stopPropagation()}
                    className="w-full h-full overflow-y-auto pr-1 select-none cursor-pointer"
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
                  {card.from ? `— ${card.from.slice(0, 20)}` : ''}
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
export const FallingPetalsOverlay: React.FC<{ items: BouquetItem[] }> = ({ items }) => {
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

