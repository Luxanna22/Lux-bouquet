import React, { useEffect, useMemo, useRef, useState } from 'react';
import Lenis from 'lenis';
import { ArrowLeft, Moon, Search, Sun, X } from 'lucide-react';
import { FlowerRenderer } from './flowers/FlowerRenderer';
import { MiniVoiceKeepsakeSVG } from './MiniThumbnails';
import { BrandLogoMark } from './BrandLogoMark';
import {
  buildCuratedShowcaseBouquets,
  computeGarlandItemScrollTransform,
  convertVaultBouquetToShowcaseEntry,
  evaluateCatenaryCurveY,
  filterShowcaseBouquets,
  getShowcaseFreshnessInfo,
  ShowcaseBouquetEntry,
  ShowcaseCategoryFilter,
} from '../lib/showcaseGallery';
import { getSavedVaultBouquets } from '../lib/firebase';
import { decodeBouquetFromHash } from '../lib/shareAndExport';

/**
 * Shared hook to merge user's locally saved/shared bouquets with the curated community showcase
 * and filter out any >30-day expired bouquets (unless marked `isPremium: true`).
 */
export function useActiveShowcaseBouquets(vaultCount: number, nowMs: number) {
  return useMemo(() => {
    const curated = buildCuratedShowcaseBouquets(nowMs);
    if (typeof window === 'undefined') {
      return filterShowcaseBouquets(curated, { nowMs });
    }

    const localVault = getSavedVaultBouquets();
    const userEntries: ShowcaseBouquetEntry[] = localVault.slice(0, 8).map((v, idx) => {
      let decodedSnap = null;
      try {
        const rawPayload = localStorage.getItem(`bq_short_${v.code}`);
        if (rawPayload) {
          decodedSnap = decodeBouquetFromHash(rawPayload);
        }
      } catch {
        // Ignore decode errors
      }
      return convertVaultBouquetToShowcaseEntry(v, decodedSnap, idx);
    });

    const seenCodes = new Set<string>(userEntries.map((u) => u.code));
    const merged = [...userEntries, ...curated.filter((c) => !seenCodes.has(c.code))];
    return filterShowcaseBouquets(merged, { nowMs });
  }, [nowMs, vaultCount]);
}

/**
 * Renders the full botanical bouquet inside each hanging parcel on the Lace Garland.
 */
export const ShowcaseBouquetIllustrationSVG: React.FC<{ entry: ShowcaseBouquetEntry }> = React.memo(
  ({ entry }) => {
    const { wrapStyle, wrapColor, wrapShadow, ribbonColor, stems } = entry;
    const domeClipId = `garland-cloche-clip-${entry.id}`;

    const silhouette =
      wrapStyle === 'hatbox' || wrapStyle === 'vase' || wrapStyle === 'basket'
        ? 'hatbox'
        : wrapStyle === 'cloche'
        ? 'cloche'
        : wrapStyle === 'koreanmesh' || wrapStyle === 'lace' || wrapStyle === 'chalice'
        ? 'koreanmesh'
        : 'tissue';

    return (
      <svg
        viewBox="56 32 288 264"
        className="w-full h-full max-w-[172px] sm:max-w-[188px] max-h-[146px] sm:max-h-[160px] overflow-visible select-none drop-shadow-[0_6px_14px_rgba(122,75,58,0.13)]"
      >
        <defs>
          <clipPath id={domeClipId}>
            <path d="M 129,246 L 129,130 A 71,71 0 0 1 271,130 L 271,246 Z" />
          </clipPath>
        </defs>
        <g>
          {/* 1. BACK WRAPPER LAYER */}
          {silhouette === 'tissue' && (
            <g>
              <path d="M 200,225 L 96,95 Q 145,78 200,132 Z" fill={wrapShadow} />
              <path d="M 200,225 L 304,95 Q 255,78 200,132 Z" fill={wrapColor} />
              <path d="M 200,225 L 116,115 Q 158,105 200,150 Z" fill="#FFF5F7" opacity="0.72" />
              <path d="M 200,225 L 284,115 Q 242,105 200,150 Z" fill="#FFF5F7" opacity="0.72" />
            </g>
          )}

          {silhouette === 'hatbox' && (
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

          {silhouette === 'cloche' && (
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

          {silhouette === 'koreanmesh' && (
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

          {/* 2 & 3. STEMS & BLOOMS LAYER */}
          <g clipPath={silhouette === 'cloche' ? `url(#${domeClipId})` : undefined}>
            {stems.map((st, idx) => {
              const bottomX = silhouette === 'cloche' ? Math.round(200 + (st.x - 200) * 0.22) : 200;
              const bottomY = silhouette === 'cloche' ? 243 : 232;
              const tieY = silhouette === 'cloche' ? 220 : 225;
              return (
                <path
                  key={`stem-${idx}`}
                  d={
                    silhouette === 'cloche'
                      ? `M ${st.x},${st.y + 4} Q ${(st.x + 200) / 2},${(st.y + tieY) / 2 + 6} 200,${tieY} L ${bottomX},${bottomY}`
                      : `M ${st.x},${st.y} Q ${(st.x + 200) / 2},${(st.y + 225) / 2 + 8} 200,232`
                  }
                  stroke="#4D7C5D"
                  strokeWidth="3.5"
                  fill="none"
                  strokeLinecap="round"
                />
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

          {/* 4. FRONT WRAPPER FOLD & RIBBON LAYER */}
          {silhouette === 'tissue' && (
            <g>
              <path d="M 164,228 L 236,228 L 226,282 Q 200,288 174,282 Z" fill={wrapColor} />
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

          {silhouette === 'hatbox' && (
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
              <line
                x1="184"
                y1="226"
                x2="216"
                y2="226"
                stroke="#92400E"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
              <line
                x1="190"
                y1="234"
                x2="210"
                y2="234"
                stroke="#B45309"
                strokeWidth="1.1"
                strokeLinecap="round"
              />
              <path
                d="M 136,192 Q 200,224 264,192"
                fill="none"
                stroke="#F59E0B"
                strokeWidth="2.2"
                strokeDasharray="4 3"
              />
            </g>
          )}

          {silhouette === 'cloche' && (
            <g>
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
              <ellipse cx="200" cy="245" rx="54" ry="6.5" fill="#4D7C5D" opacity="0.72" />
              <ellipse cx="200" cy="244" rx="40" ry="4.5" fill="#86EFAC" opacity="0.45" />
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
              <ellipse
                cx="200"
                cy="248"
                rx="76"
                ry="9"
                fill={wrapColor}
                stroke={wrapShadow}
                strokeWidth="1.5"
              />
              <rect x="122" y="248" width="156" height="15" rx="6" fill={wrapShadow} />
            </g>
          )}

          {silhouette === 'koreanmesh' && (
            <g>
              <path d="M 160,225 L 240,225 L 234,278 Q 200,286 166,278 Z" fill={wrapColor} />
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
  }
);

/**
 * Miniature Botanical Lace Clothespin + Vertical Braided Cord suspending each card from the Catenary Lace Line.
 * When `extendCordTopPx` is provided, the vertical string extends up to meet the catenary curve at any height.
 */
const LaceHangerClipSVG: React.FC<{
  stringLengthPx: number;
  isDarkMode: boolean;
  accentColor: string;
}> = React.memo(({ stringLengthPx, isDarkMode, accentColor }) => {
  const cordColor = isDarkMode ? '#A38B7E' : '#B48E78';
  const laceStroke = isDarkMode ? '#D8C2B5' : '#C9AE9B';
  const brassBody = isDarkMode ? '#D4A373' : '#C89666';
  const brassHighlight = isDarkMode ? '#FDE68A' : '#FEF3C7';

  const dropCordPx = stringLengthPx + 24;

  return (
    <div
      className="w-full flex flex-col items-center select-none pointer-events-none -mb-3 z-10"
      aria-hidden="true"
    >
      <svg
        width="56"
        height={dropCordPx + 26}
        viewBox={`0 -4 56 ${dropCordPx + 26}`}
        className="overflow-visible"
      >
        {/* Vertical Braided Lace Thread Dropping Down from the Overhead Catenary Lace Line */}
        <line
          x1="28"
          y1="-2"
          x2="28"
          y2={dropCordPx + 8}
          stroke={cordColor}
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        <line
          x1="28"
          y1="-2"
          x2="28"
          y2={dropCordPx + 8}
          stroke={laceStroke}
          strokeWidth="1.2"
          strokeDasharray="2.5 2.5"
          strokeLinecap="round"
        />

        {/* Top Knot Tied Directly onto the Overhead Lace Cord */}
        <circle cx="28" cy="-1" r="3.6" fill={cordColor} />
        <circle cx="28" cy="-1" r="1.6" fill={brassHighlight} />

        {/* Delicate Scalloped Lace Bow at the Clasp */}
        <g transform={`translate(28, ${dropCordPx + 6})`}>
          <path
            d="M 0,0 C -12,-9 -18,3 -2,2 M 0,0 C 12,-9 18,3 2,2"
            fill="none"
            stroke={accentColor}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M -1.5,2 Q -6,9 -9,14 M 1.5,2 Q 6,9 9,14"
            fill="none"
            stroke={accentColor}
            strokeWidth="1.35"
            strokeLinecap="round"
          />
          {/* Sculpted Brass / Wooden Florist Clothespin */}
          <rect
            x="-4.5"
            y="-4"
            width="9"
            height="15"
            rx="3"
            fill={brassBody}
            stroke={cordColor}
            strokeWidth="1"
          />
          <line x1="-3" y1="1.5" x2="3" y2="1.5" stroke={brassHighlight} strokeWidth="1" />
          {/* Punched Card Eyelet Ring */}
          <circle
            cx="0"
            cy="11"
            r="3.2"
            fill={isDarkMode ? '#2B2321' : '#FFFDF9'}
            stroke={brassBody}
            strokeWidth="1.4"
          />
        </g>
      </svg>
    </div>
  );
});

/**
 * Single Hanging Bouquet Parcel Card used on both the Hero Catenary Garland and the All Creations Gallery Page.
 */
const HangingCreationCard: React.FC<{
  entry: ShowcaseBouquetEntry;
  nowMs: number;
  isDarkMode: boolean;
  onUnwrap: (entry: ShowcaseBouquetEntry) => void;
  onCraftSimilar: (entry: ShowcaseBouquetEntry) => void;
  disableStaticTilt?: boolean;
}> = React.memo(({ entry, nowMs, isDarkMode, onUnwrap, onCraftSimilar, disableStaticTilt }) => {
  const freshness = getShowcaseFreshnessInfo(entry, nowMs);

  return (
    <div className="w-full flex flex-col items-center group">
      <LaceHangerClipSVG
        stringLengthPx={entry.stringLengthPx}
        isDarkMode={isDarkMode}
        accentColor={entry.ribbonColor}
      />

      <div
        style={disableStaticTilt ? undefined : { transform: `rotate(${entry.tiltDeg}deg)` }}
        className={`w-full rounded-[22px] sm:rounded-[24px] border overflow-hidden flex flex-col transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-0 group-hover:-translate-y-1.5 ${
          isDarkMode
            ? 'bg-[#352C29] border-[#4E403B] group-hover:border-[#6A5750] shadow-[0_14px_34px_rgba(18,13,11,0.28)]'
            : 'bg-[#FFFDF9] border-[#E5D7C8] group-hover:border-[#CFAF97] shadow-[0_12px_30px_rgba(122,75,58,0.07)] group-hover:shadow-[0_18px_40px_rgba(122,75,58,0.12)]'
        }`}
      >
        {/* Top Unboxed Freshness Line */}
        <div
          className={`px-3.5 pt-2.5 pb-2 flex items-center justify-between gap-2 text-[10.5px] sm:text-[11px] border-b border-dashed ${
            isDarkMode ? 'border-[#483B37] text-[#C8B6AC]' : 'border-[#EFE5DC] text-[#857267]'
          }`}
        >
          <span className="truncate">
            {entry.isUserCreated ? 'Your shared bouquet' : freshness.sharedAgoLabel}
          </span>
          <span
            className={`shrink-0 font-medium tabular-nums ${
              entry.isPremium
                ? isDarkMode
                  ? 'text-[#F0C8B0]'
                  : 'text-[#8A4B38]'
                : freshness.isExpiringSoon
                ? isDarkMode
                  ? 'text-amber-300'
                  : 'text-amber-700'
                : isDarkMode
                ? 'text-[#DFCFC6]'
                : 'text-[#6E5D54]'
            }`}
          >
            {entry.isPremium ? '✦ Eternal' : freshness.label}
          </span>
        </div>

        {/* Botanical Illustration Vitrine */}
        <div
          onClick={() => onUnwrap(entry)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onUnwrap(entry);
            }
          }}
          aria-label={`Unwrap bouquet for ${entry.to} from ${entry.from}`}
          className={`h-40 sm:h-44 w-full relative flex items-center justify-center overflow-hidden border-b cursor-pointer ${
            isDarkMode ? 'bg-[#241D1B] border-[#4A3D39]' : 'bg-[#EDE2D4] border-[#DFCFC0]'
          }`}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute w-32 h-32 rounded-full"
            style={{
              background: isDarkMode
                ? 'radial-gradient(circle, rgba(230,184,156,0.14) 0%, rgba(36,29,27,0) 72%)'
                : 'radial-gradient(circle, rgba(255,253,249,0.72) 0%, rgba(237,226,212,0) 72%)',
            }}
          />

          <div className="w-full h-full flex items-center justify-center p-2 group-hover:scale-105 transition-transform duration-500">
            <ShowcaseBouquetIllustrationSVG entry={entry} />
          </div>

          {entry.hasVoice && entry.voiceStyle && (
            <div
              title={entry.voiceLabel || 'Includes voice keepsake'}
              className={`absolute bottom-2 right-2.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full border flex items-center justify-center shadow-2xs [&>svg]:w-4.5 [&>svg]:h-4.5 sm:[&>svg]:w-5 sm:[&>svg]:h-5 ${
                isDarkMode
                  ? 'bg-[#352C29]/95 border-[#5E4E49]'
                  : 'bg-[#FFFDF9]/95 border-[#DECBB9]'
              }`}
            >
              <MiniVoiceKeepsakeSVG
                styleType={entry.voiceStyle}
                primaryColor="#D6A87C"
                accentColor="#F43F5E"
              />
            </div>
          )}
        </div>

        {/* Stitched Dedication Tag */}
        <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between text-left">
          <div>
            <div className="flex items-baseline justify-between gap-2 flex-wrap">
              <h3
                className={`text-lg sm:text-[21px] font-semibold tracking-tight leading-tight ${
                  isDarkMode ? 'text-[#FBF6F1]' : 'text-[#1F1815]'
                }`}
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                <span className="italic font-normal opacity-80">For </span>
                {entry.to}
              </h3>
              <span
                className={`text-xs sm:text-sm italic ${
                  isDarkMode ? 'text-[#D8C7BE]' : 'text-[#6E5D54]'
                }`}
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                from {entry.from}
              </span>
            </div>

            <p
              className={`mt-1.5 text-xs italic line-clamp-2 leading-relaxed ${
                isDarkMode ? 'text-[#C8B6AC]' : 'text-[#7A685D]'
              }`}
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '13.5px' }}
            >
              {entry.noteExcerpt}
            </p>
          </div>

          <div
            className={`mt-3 pt-2 border-t border-dashed flex items-center justify-between gap-2 ${
              isDarkMode ? 'border-[#483B37]' : 'border-[#EFE5DC]'
            }`}
          >
            <button
              type="button"
              onClick={() => onUnwrap(entry)}
              className={`text-[11.5px] sm:text-xs font-medium inline-flex items-center gap-1 transition-colors cursor-pointer ${
                isDarkMode
                  ? 'text-[#F0C8B0] hover:text-[#FBF6F1]'
                  : 'text-[#7A4B3A] hover:text-[#4A2C21]'
              }`}
            >
              <span>Unwrap Keepsake</span>
              <span aria-hidden="true">→</span>
            </button>

            <button
              type="button"
              onClick={() => onCraftSimilar(entry)}
              className={`text-[11px] transition-colors cursor-pointer ${
                isDarkMode
                  ? 'text-[#B8A59B] hover:text-[#E6D6CE]'
                  : 'text-[#8C7A70] hover:text-[#4A382E]'
              }`}
            >
              Craft Similar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

/**
 *Full-Bleed Sweeping Catenary Lace & Twine Curve SVG (`\_______/` as drawn in `screenshot_3.png`).
 * At x=0 and x=1440, y = edgeY (14). At x=720 (center), y dips down to midY (86), so control point Y = 2*86 - 14 = 158.
 */
const SweepingCatenaryLaceLineSVG: React.FC<{
  isDarkMode: boolean;
  edgeY?: number;
  midY?: number;
}> = React.memo(({ isDarkMode, edgeY = 14, midY = 86 }) => {
  const controlY = 2 * midY - edgeY; // 158 when edgeY=14, midY=86
  const viewHeight = midY + 26;

  return (
    <svg
      viewBox={`0 0 1440 ${viewHeight}`}
      preserveAspectRatio="none"
      className="w-full h-[94px] sm:h-[112px] overflow-visible pointer-events-none select-none"
      aria-hidden="true"
    >
      {/* Soft Drop Shadow Under the Draped Lace Line */}
      <path
        d={`M -30,${edgeY + 3} Q 720,${controlY + 4} 1470,${edgeY + 3}`}
        fill="none"
        stroke={isDarkMode ? 'rgba(0,0,0,0.38)' : 'rgba(122,75,58,0.10)'}
        strokeWidth="3.5"
      />
      {/* Upper Scalloped Eyelet Lace Loops */}
      <path
        d={`M -30,${edgeY - 2} Q 720,${controlY - 2} 1470,${edgeY - 2}`}
        fill="none"
        stroke={isDarkMode ? '#836E64' : '#D5C2B4'}
        strokeWidth="5.5"
        strokeDasharray="1.5 10"
        strokeLinecap="round"
      />
      {/* Main Braided Botanical Twine & Satin Ribbon Line */}
      <path
        d={`M -30,${edgeY} Q 720,${controlY} 1470,${edgeY}`}
        fill="none"
        stroke={isDarkMode ? '#D8A88E' : '#B0826C'}
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      {/* Lower Fine Embroidery Stitch Line */}
      <path
        d={`M -30,${edgeY + 4} Q 720,${controlY + 4} 1470,${edgeY + 4}`}
        fill="none"
        stroke={isDarkMode ? '#9A8276' : '#CBB5A4'}
        strokeWidth="1.2"
        strokeDasharray="4.5 4.5"
        strokeLinecap="round"
      />
    </svg>
  );
});

// ============================================================================
// 1. HERO CATENARY LACE GARLAND PREVIEW (Right Below the Hero)
//    Displays 4 limited creations hanging from the sweeping catenary lace line
//    that glide along the curve with Lenis scroll, plus a CTA below to open
//    the dedicated All Creations page!
// ============================================================================

interface HeroLaceGarlandPreviewProps {
  isDarkMode: boolean;
  vaultCount: number;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  onExploreAllCreations: () => void;
  onUnwrapShowcaseBouquet: (entry: ShowcaseBouquetEntry) => void;
  onCraftFromShowcaseBouquet: (entry: ShowcaseBouquetEntry) => void;
}

export const HeroLaceGarlandPreview: React.FC<HeroLaceGarlandPreviewProps> = ({
  isDarkMode,
  vaultCount,
  scrollContainerRef,
  onExploreAllCreations,
  onUnwrapShowcaseBouquet,
  onCraftFromShowcaseBouquet,
}) => {
  const [nowMs] = useState<number>(() => Date.now());
  const activeEntries = useActiveShowcaseBouquets(vaultCount, nowMs);
  const limitedEntries = useMemo(() => activeEntries.slice(0, 4), [activeEntries]);

  // Direct DOM refs for 120fps Lenis scroll-linked movement along the catenary curve
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const wrapper = scrollContainerRef.current;

    const applyGarlandScroll = (scrollTop: number) => {
      const count = limitedEntries.length;
      for (let i = 0; i < count; i++) {
        const el = itemRefs.current[i];
        if (!el) continue;
        const entry = limitedEntries[i];
        const state = computeGarlandItemScrollTransform(
          i,
          count,
          scrollTop,
          entry ? entry.tiltDeg : 0,
          14,
          86
        );
        // Move along the catenary curve (xShiftPx, yCurvePx) and gently sway with Lenis scroll
        el.style.transform = `translate3d(${state.xShiftPx}px, ${state.yCurvePx}px, 0) rotate(${state.rotateDeg}deg)`;
      }
    };

    applyGarlandScroll(wrapper ? wrapper.scrollTop : 0);

    if (!wrapper) return;
    const onScroll = () => {
      applyGarlandScroll(wrapper.scrollTop);
    };
    wrapper.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      wrapper.removeEventListener('scroll', onScroll);
    };
  }, [limitedEntries, scrollContainerRef]);

  return (
    <section
      id="showcase"
      data-testid="hero-lace-garland-section"
      className="relative w-full pt-0 pb-10 sm:pb-14 overflow-hidden select-none"
    >
      {/* FULL-BLEED SWEEPING CATENARY LACE GARLAND & HANGING LIMITED CREATIONS */}
      <div className="relative w-full">
        {/* The Sweeping Catenary Lace Ribbon (`\_______/`) */}
        <div className="w-full relative z-0">
          <SweepingCatenaryLaceLineSVG isDarkMode={isDarkMode} edgeY={14} midY={86} />
        </div>

        {/* Desktop & Tablet (md+): 4 Limited Creations Suspended Directly Along the Catenary Curve & Gliding with Lenis Scroll */}
        <div className="hidden md:grid md:grid-cols-4 gap-5 lg:gap-7 max-w-6xl mx-auto px-6 lg:px-10 -mt-[112px] pb-24 relative z-10">
          {limitedEntries.map((entry, idx) => {
            const initial = computeGarlandItemScrollTransform(
              idx,
              limitedEntries.length,
              0,
              entry.tiltDeg,
              14,
              86
            );
            return (
              <div
                key={entry.id}
                ref={(el) => {
                  itemRefs.current[idx] = el;
                }}
                data-testid={`hero-garland-card-${entry.code}`}
                style={{
                  transform: `translate3d(${initial.xShiftPx}px, ${initial.yCurvePx}px, 0) rotate(${initial.rotateDeg}deg)`,
                  willChange: 'transform',
                }}
                className="w-full max-w-[268px] mx-auto transition-shadow"
              >
                <HangingCreationCard
                  entry={entry}
                  nowMs={nowMs}
                  isDarkMode={isDarkMode}
                  onUnwrap={onUnwrapShowcaseBouquet}
                  onCraftSimilar={onCraftFromShowcaseBouquet}
                  disableStaticTilt
                />
              </div>
            );
          })}
        </div>

        {/* Mobile (< md): Horizontal Swipeable Catenary Garland Strip */}
        <div className="md:hidden flex items-start gap-4 overflow-x-auto no-scrollbar px-5 -mt-[82px] pb-8 snap-x snap-mandatory relative z-10">
          {limitedEntries.map((entry, idx) => {
            const mobileCurveY = idx === 1 || idx === 2 ? 36 : 18;
            return (
              <div
                key={entry.id}
                style={{
                  transform: `translate3d(0px, ${mobileCurveY}px, 0)`,
                }}
                className="snap-center shrink-0 w-[250px] pb-8"
              >
                <HangingCreationCard
                  entry={entry}
                  nowMs={nowMs}
                  isDarkMode={isDarkMode}
                  onUnwrap={onUnwrapShowcaseBouquet}
                  onCraftSimilar={onCraftFromShowcaseBouquet}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA BELOW THE GARLAND TO OPEN THE DEDICATED "ALL CREATIONS" PAGE */}
      <div className="fluid-scroll-item text-center px-4 mt-2 sm:mt-4">
        <p
          className={`text-xs sm:text-[13px] mb-3.5 ${
            isDarkMode ? 'text-[#C8B6AC]' : 'text-[#7D6B61]'
          }`}
        >
          Shared bouquets rest on the lace line for 30 days · Searchable by recipient &amp; sender
        </p>

        <button
          type="button"
          onClick={onExploreAllCreations}
          data-testid="explore-all-creations-btn"
          className={`px-7 sm:px-8 py-3 sm:py-3.5 rounded-full border border-dashed text-xs sm:text-sm font-medium inline-flex items-center gap-2 transition-all duration-300 active:scale-95 cursor-pointer shadow-[0_8px_24px_rgba(122,75,58,0.06)] ${
            isDarkMode
              ? 'bg-[#362D2A] border-[#66554F] text-[#FBF6F1] hover:bg-[#433834]'
              : 'bg-[#FFFDF9] border-[#D8C4B4] text-[#4A382E] hover:bg-[#FAF3EB]'
          }`}
        >
          <span>Explore All Creations</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold tabular-nums ${
              isDarkMode ? 'bg-[#E6B89C]/20 text-[#F0C8B0]' : 'bg-[#7A4B3A]/12 text-[#7A4B3A]'
            }`}
          >
            {activeEntries.length}
          </span>
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  );
};

// ============================================================================
// 2. DEDICATED "ALL CREATIONS" GALLERY PAGE (With For/From Search & Category Filters)
// ============================================================================

interface CreationsGalleryPageViewProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  vaultCount: number;
  onOpenVault: () => void;
  onBackToHome: () => void;
  onStartCrafting: () => void;
  onUnwrapShowcaseBouquet: (entry: ShowcaseBouquetEntry) => void;
  onCraftFromShowcaseBouquet: (entry: ShowcaseBouquetEntry) => void;
}

const CATEGORY_TABS: { id: ShowcaseCategoryFilter; label: string }[] = [
  { id: 'all', label: 'All Creations' },
  { id: 'voice', label: 'With Voice Note' },
  { id: 'cloche', label: 'Glass Dome' },
  { id: 'hatbox', label: 'Velvet Hatbox' },
  { id: 'silk', label: 'Silk & Lace' },
  { id: 'expiring_soon', label: 'Expiring Soon' },
  { id: 'eternal', label: '✦ Eternal Keepsakes' },
];

export const CreationsGalleryPageView: React.FC<CreationsGalleryPageViewProps> = ({
  isDarkMode,
  onToggleDarkMode,
  vaultCount,
  onOpenVault,
  onBackToHome,
  onStartCrafting,
  onUnwrapShowcaseBouquet,
  onCraftFromShowcaseBouquet,
}) => {
  const [forQuery, setForQuery] = useState('');
  const [fromQuery, setFromQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<ShowcaseCategoryFilter>('all');
  const [nowMs] = useState<number>(() => Date.now());

  const pageScrollWrapperRef = useRef<HTMLDivElement | null>(null);
  const pageScrollContentRef = useRef<HTMLDivElement | null>(null);

  const allActiveEntries = useActiveShowcaseBouquets(vaultCount, nowMs);

  const filteredEntries = useMemo(
    () =>
      filterShowcaseBouquets(allActiveEntries, {
        forQuery,
        fromQuery,
        category: activeCategory,
        nowMs,
      }),
    [allActiveEntries, forQuery, fromQuery, activeCategory, nowMs]
  );

  // Group filtered entries into rows of 4 so each row hangs from its own sweeping catenary lace line
  const garlandRows = useMemo(() => {
    const rows: ShowcaseBouquetEntry[][] = [];
    for (let i = 0; i < filteredEntries.length; i += 4) {
      rows.push(filteredEntries.slice(i, i + 4));
    }
    return rows;
  }, [filteredEntries]);

  // Smooth Lenis scrolling inside the dedicated Creations Page
  useEffect(() => {
    const wrapper = pageScrollWrapperRef.current;
    const content = pageScrollContentRef.current;
    if (!wrapper || !content) return;

    const lenis = new Lenis({
      wrapper,
      content,
      lerp: 0.09,
      duration: 1.2,
      smoothWheel: true,
    });

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  const isFiltering = Boolean(forQuery.trim() || fromQuery.trim() || activeCategory !== 'all');

  const handleClearFilters = () => {
    setForQuery('');
    setFromQuery('');
    setActiveCategory('all');
  };

  return (
    <div
      ref={pageScrollWrapperRef}
      data-testid="creations-gallery-page"
      className={`animate-landing-view-enter fixed inset-0 z-50 overflow-y-auto overflow-x-hidden transition-[background-color,color] duration-300 ease-out ${
        isDarkMode ? 'bg-[#2B2321] text-[#FBF6F1]' : 'bg-[#FDF9F5] text-[#231C18]'
      }`}
    >
      {/* STICKY TOP NAVBAR FOR CREATIONS GALLERY PAGE */}
      <div className="sticky top-2 sm:top-3 z-40 px-3 sm:px-6 pt-1 sm:pt-2 pointer-events-none">
        <header
          className={`pointer-events-auto max-w-5xl mx-auto h-11 sm:h-14 px-3 sm:px-5 md:px-6 rounded-full border shadow-[0_8px_28px_rgba(35,28,24,0.06)] backdrop-blur-md flex items-center justify-between gap-2 sm:gap-3 transition-colors ${
            isDarkMode
              ? 'bg-[#362D2A]/92 border-[#4E423E] text-[#FBF6F1]'
              : 'bg-white/92 border-[#EFE6DD] text-[#231C18]'
          }`}
        >
          {/* Left: Back to Home + Brand */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onBackToHome}
              data-testid="creations-back-home-btn"
              className={`px-3 py-1.5 rounded-full border border-dashed text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer ${
                isDarkMode
                  ? 'bg-[#423734] border-[#66554F] text-[#FBF6F1] hover:bg-[#4D403C]'
                  : 'bg-[#FAF4EE] border-[#D8C4B4] text-[#5C4438] hover:bg-[#F3E9DF]'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Home</span>
            </button>

            <button
              type="button"
              onClick={onBackToHome}
              className="hidden sm:flex items-center gap-2 cursor-pointer"
            >
              <BrandLogoMark className="w-6 h-6" isDarkMode={isDarkMode} />
              <span
                className="text-lg font-semibold tracking-tight whitespace-nowrap"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                Send A Bouquet
              </span>
            </button>
          </div>

          {/* Right: Theme Toggle, Saved Bouquets & Craft CTA */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <button
              type="button"
              onClick={onToggleDarkMode}
              aria-label="Toggle theme"
              className={`p-1.5 sm:p-2 rounded-full transition-colors cursor-pointer ${
                isDarkMode
                  ? 'text-[#E6B89C] hover:bg-[#483C38]'
                  : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
              }`}
            >
              {isDarkMode ? (
                <Sun className="w-3.5 h-3.5 text-amber-300" />
              ) : (
                <Moon className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              type="button"
              onClick={onOpenVault}
              className={`hidden sm:inline-flex px-3.5 py-1.5 rounded-full border border-dashed text-xs font-medium items-center gap-1.5 transition cursor-pointer ${
                isDarkMode
                  ? 'bg-[#423734] border-[#66554F] text-[#FBF6F1] hover:bg-[#4D403C]'
                  : 'bg-[#FAF4EE] border-[#D8C4B4] text-[#5C4438] hover:bg-[#F3E9DF]'
              }`}
            >
              <span>Saved Bouquets</span>
              {vaultCount > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold tabular-nums ${
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
              onClick={onStartCrafting}
              className={`px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-white text-xs font-medium transition active:scale-95 cursor-pointer whitespace-nowrap ${
                isDarkMode
                  ? 'bg-[#9A6550] hover:bg-[#875642]'
                  : 'bg-[#7A4B3A] hover:bg-[#633B2C]'
              }`}
            >
              Craft a Bouquet
            </button>
          </div>
        </header>
      </div>

      {/* MAIN CONTENT ROOT */}
      <div ref={pageScrollContentRef} className="w-full pt-8 sm:pt-12 pb-20">
        {/* PAGE HEADER & SEARCH / FILTER LEDGER */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h1
            className={`text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight ${
              isDarkMode ? 'text-[#FBF6F1]' : 'text-[#1F1815]'
            }`}
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            On the <span className="italic font-normal">Lace Garland</span>
          </h1>
          <p
            className={`mt-2.5 text-xs sm:text-sm max-w-lg mx-auto leading-relaxed ${
              isDarkMode ? 'text-[#D8C7BE]' : 'text-[#6E5D54]'
            }`}
          >
            Every shared bouquet rests on our lace drying line for 30 days before gently retiring—unless pinned as an eternal keepsake.
          </p>

          {/* Dual "For" (Recipient) and "From" (Sender) Stationery Search Capsule */}
          <div
            className={`mt-6 max-w-2xl mx-auto rounded-2xl sm:rounded-full border border-dashed p-1.5 sm:px-4 sm:py-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-3 transition-colors shadow-[0_8px_26px_rgba(122,75,58,0.05)] ${
              isDarkMode
                ? 'bg-[#352C29]/95 border-[#574843]'
                : 'bg-[#FFFDF9]/95 border-[#DECBB9]'
            }`}
          >
            {/* "For" (Recipient) Input */}
            <label className="flex-1 flex items-center gap-2 px-3 py-1.5 sm:py-1 rounded-xl sm:rounded-full focus-within:bg-[#7A4B3A]/6 dark:focus-within:bg-white/5 transition-colors cursor-text">
              <Search
                className={`w-3.5 h-3.5 shrink-0 ${
                  isDarkMode ? 'text-[#C8B2A6]' : 'text-[#9A8274]'
                }`}
              />
              <span
                className={`text-sm italic font-medium shrink-0 select-none ${
                  isDarkMode ? 'text-[#E6B89C]' : 'text-[#7A4B3A]'
                }`}
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                For
              </span>
              <input
                type="text"
                value={forQuery}
                onChange={(e) => setForQuery(e.target.value)}
                placeholder="Search recipient (e.g. Sophia, Mom)…"
                aria-label="Search bouquets by recipient (For)"
                data-testid="showcase-search-for"
                className={`w-full min-w-0 bg-transparent text-xs focus:outline-none ${
                  isDarkMode
                    ? 'text-[#FBF6F1] placeholder:text-[#9E8C82]'
                    : 'text-[#231C18] placeholder:text-[#A39084]'
                }`}
              />
            </label>

            <span
              aria-hidden="true"
              className={`hidden sm:block w-[1px] h-5 shrink-0 border-l border-dashed ${
                isDarkMode ? 'border-[#574843]' : 'border-[#DECBB9]'
              }`}
            />
            <span
              aria-hidden="true"
              className={`sm:hidden h-[1px] w-full border-t border-dashed ${
                isDarkMode ? 'border-[#4A3D39]' : 'border-[#EFE5DC]'
              }`}
            />

            {/* "From" (Sender) Input */}
            <label className="flex-1 flex items-center gap-2 px-3 py-1.5 sm:py-1 rounded-xl sm:rounded-full focus-within:bg-[#7A4B3A]/6 dark:focus-within:bg-white/5 transition-colors cursor-text">
              <span
                className={`text-sm italic font-medium shrink-0 select-none ${
                  isDarkMode ? 'text-[#E6B89C]' : 'text-[#7A4B3A]'
                }`}
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                From
              </span>
              <input
                type="text"
                value={fromQuery}
                onChange={(e) => setFromQuery(e.target.value)}
                placeholder="Search sender (e.g. Julian, Noah)…"
                aria-label="Search bouquets by sender (From)"
                data-testid="showcase-search-from"
                className={`w-full min-w-0 bg-transparent text-xs focus:outline-none ${
                  isDarkMode
                    ? 'text-[#FBF6F1] placeholder:text-[#9E8C82]'
                    : 'text-[#231C18] placeholder:text-[#A39084]'
                }`}
              />
            </label>

            {isFiltering && (
              <button
                type="button"
                onClick={handleClearFilters}
                aria-label="Clear search filters"
                data-testid="showcase-search-clear"
                className={`self-center px-3 py-1 rounded-full text-[11px] font-medium inline-flex items-center gap-1 transition cursor-pointer shrink-0 ${
                  isDarkMode
                    ? 'bg-[#463A36] text-[#F0C8B0] hover:bg-[#52443F]'
                    : 'bg-[#F3ECE3] text-[#6E4434] hover:bg-[#EAE0D3]'
                }`}
              >
                <X className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Category Filter Strip */}
          <div className="mt-4 flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap">
            {CATEGORY_TABS.map((tab) => {
              const isSelected = activeCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveCategory(tab.id)}
                  data-testid={`showcase-filter-${tab.id}`}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? isDarkMode
                        ? 'bg-[#E6B89C] text-[#231C18] shadow-xs'
                        : 'bg-[#7A4B3A] text-[#FFFDF9] shadow-xs'
                      : isDarkMode
                      ? 'bg-[#352C29] text-[#D8C7BE] border border-dashed border-[#544540] hover:bg-[#413632]'
                      : 'bg-[#FFFDF9] text-[#6E5D54] border border-dashed border-[#DECBB9] hover:bg-[#FAF3EB]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* MULTI-ROW SWEEPING CATENARY LACE GARLANDS */}
        {garlandRows.length === 0 ? (
          <div
            data-testid="showcase-empty-state"
            className={`mt-12 max-w-md mx-auto rounded-[24px] border border-dashed py-12 px-6 text-center ${
              isDarkMode
                ? 'bg-[#352C29]/80 border-[#574843]'
                : 'bg-[#FFFDF9]/90 border-[#DECBB9]'
            }`}
          >
            <p
              className={`text-2xl font-semibold ${
                isDarkMode ? 'text-[#FBF6F1]' : 'text-[#1F1815]'
              }`}
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              No bouquets on the lace line match that filter
            </p>
            <p
              className={`mt-1.5 text-xs leading-relaxed ${
                isDarkMode ? 'text-[#C8B6AC]' : 'text-[#7D6B61]'
              }`}
            >
              Shared bouquets gently fade after 30 days unless pinned as an eternal keepsake.
            </p>
            <button
              type="button"
              onClick={handleClearFilters}
              className={`mt-4 px-5 py-2 rounded-full border border-dashed text-xs font-medium transition cursor-pointer ${
                isDarkMode
                  ? 'border-[#66554F] bg-[#423734] text-[#FBF6F1] hover:bg-[#4D403C]'
                  : 'border-[#D8C4B4] bg-[#FAF4EE] text-[#5C4438] hover:bg-[#F3E9DF]'
              }`}
            >
              Reset all filters
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-6 sm:space-y-10">
            {garlandRows.map((rowEntries, rowIdx) => (
              <div key={`garland-row-${rowIdx}`} className="relative w-full">
                {/* Sweeping Catenary Lace Cord for this Row */}
                <div className="w-full relative z-0">
                  <SweepingCatenaryLaceLineSVG isDarkMode={isDarkMode} edgeY={12} midY={68} />
                </div>

                {/* Cards Suspended Along the Row's Catenary Curve */}
                <div
                  className={`max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 -mt-[94px] sm:-mt-[106px] pb-14 grid grid-cols-1 sm:grid-cols-2 ${
                    rowEntries.length === 1
                      ? 'lg:grid-cols-1 max-w-xs'
                      : rowEntries.length === 2
                      ? 'lg:grid-cols-2 max-w-2xl'
                      : rowEntries.length === 3
                      ? 'lg:grid-cols-3 max-w-4xl'
                      : 'lg:grid-cols-4'
                  } gap-6 relative z-10`}
                >
                  {rowEntries.map((entry, idxInRow) => {
                    const countInRow = rowEntries.length;
                    const u =
                      countInRow === 1
                        ? 0.5
                        : 0.21 + (idxInRow / Math.max(1, countInRow - 1)) * 0.58;
                    const curveOffsetY = evaluateCatenaryCurveY(u, 12, 68);

                    return (
                      <div
                        key={entry.id}
                        data-testid={`showcase-card-${entry.code}`}
                        style={{
                          transform: `translate3d(0px, ${curveOffsetY}px, 0)`,
                        }}
                        className="w-full max-w-[274px] mx-auto"
                      >
                        <HangingCreationCard
                          entry={entry}
                          nowMs={nowMs}
                          isDarkMode={isDarkMode}
                          onUnwrap={onUnwrapShowcaseBouquet}
                          onCraftSimilar={onCraftFromShowcaseBouquet}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
