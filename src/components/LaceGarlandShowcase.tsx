import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  ShowcaseBouquetEntry,
} from '../lib/showcaseGallery';
import { getSavedVaultBouquets } from '../lib/firebase';
import { decodeBouquetFromHash } from '../lib/shareAndExport';

/**
 * Shared hook to merge user's locally saved/shared bouquets with the curated community showcase,
 * deduplicating identical recipient/sender entries so duplicate drafts never clutter the garland,
 * and filtering out any >30-day expired bouquets (unless marked `isPremium: true`).
 */
export function useActiveShowcaseBouquets(vaultCount: number, nowMs: number) {
  return useMemo(() => {
    const curated = buildCuratedShowcaseBouquets(nowMs);
    if (typeof window === 'undefined') {
      return filterShowcaseBouquets(curated, { nowMs });
    }

    const localVault = getSavedVaultBouquets();
    const seenRecipientSender = new Set<string>();
    const userEntries: ShowcaseBouquetEntry[] = [];

    for (let idx = 0; idx < localVault.length; idx++) {
      const v = localVault[idx];
      const dedupeKey = `${(v.to || '').trim().toLowerCase()}__${(v.from || '').trim().toLowerCase()}`;
      // Skip default unedited placeholder drafts or duplicate recipient+sender entries
      const isDefaultPlaceholder =
        (v.to || '').trim().toLowerCase() === 'my soulmate' &&
        (v.from || '').trim().toLowerCase() === 'secret admirer';
      if (isDefaultPlaceholder || seenRecipientSender.has(dedupeKey)) {
        continue;
      }
      seenRecipientSender.add(dedupeKey);

      let decodedSnap = null;
      try {
        const rawPayload = localStorage.getItem(`bq_short_${v.code}`);
        if (rawPayload) {
          decodedSnap = decodeBouquetFromHash(rawPayload);
        }
      } catch {
        // Ignore decode errors
      }
      userEntries.push(convertVaultBouquetToShowcaseEntry(v, decodedSnap, userEntries.length));
      if (userEntries.length >= 2) break;
    }

    const seenCodes = new Set<string>(userEntries.map((u) => u.code));
    const merged = [...userEntries, ...curated.filter((c) => !seenCodes.has(c.code))];
    return filterShowcaseBouquets(merged, { nowMs });
  }, [nowMs, vaultCount]);
}

/**
 * Pure Botanical Bouquet + Attached Assets SVG (just like a saved Studio PNG keepsake:
 * soft dashed halo ring, full wrapped bouquet, tucked wax-sealed letter envelope, and optional voice keepsake).
 */
export const ShowcaseBouquetIllustrationSVG: React.FC<{
  entry: ShowcaseBouquetEntry;
  isDarkMode?: boolean;
}> = React.memo(({ entry, isDarkMode = false }) => {
  const { wrapStyle, wrapColor, wrapShadow, ribbonColor, stems } = entry;
  const domeClipId = `garland-cloche-clip-${entry.id}`;

  const silhouette =
    wrapStyle === 'hatbox' || wrapStyle === 'vase' || wrapStyle === 'basket'
      ? 'hatbox'
      : wrapStyle === 'cloche'
      ? 'cloche'
      : wrapStyle === 'koreanmesh' || wrapStyle === 'lace' || wrapStyle === 'chalice'
      ? 'butterfly'
      : 'cone';

  const renderStems = (yShift = 0, scaleMul = 1) =>
    stems.map((s, i) => (
      <g
        key={`${entry.id}-stem-${i}`}
        transform={`translate(${s.x}, ${s.y + yShift}) rotate(${s.rot}) scale(${(
          s.scale * scaleMul
        ).toFixed(2)})`}
      >
        <path
          d={`M 0,10 Q ${(200 - s.x) * 0.22},66 ${(200 - s.x) * 0.52},132`}
          stroke="#2E7D32"
          strokeWidth="5.2"
          fill="none"
          strokeLinecap="round"
        />
        <FlowerRenderer
          type={s.type}
          petalColor={s.petal}
          centerColor={s.center}
          hideStem
        />
      </g>
    ));

  return (
    <svg
      viewBox="44 22 312 284"
      className="w-full h-full overflow-visible select-none"
    >
      <defs>
        <clipPath id={domeClipId}>
          <path d="M 116,238 L 116,136 A 84,84 0 0,1 284,136 L 284,238 Z" />
        </clipPath>
      </defs>

      {/* Studio Saved-PNG Dashed Botanical Halo Circle Behind the Bouquet */}
      <circle
        cx="200"
        cy="154"
        r="112"
        fill={isDarkMode ? 'rgba(255,253,249,0.03)' : 'rgba(255,253,249,0.55)'}
        stroke={isDarkMode ? '#5A4A44' : '#E2D4C5'}
        strokeWidth="1.25"
        strokeDasharray="4 4"
      />

      {/* 1. CONE SILHOUETTE */}
      {silhouette === 'cone' && (
        <g>
          <polygon
            points="92,126 200,56 308,126 244,254 156,254"
            fill={wrapShadow}
            stroke="#E5C158"
            strokeWidth="1.4"
          />
          <polygon points="116,122 200,74 284,122 200,236" fill="#FFFDF9" opacity="0.92" />
          <g>{renderStems(0, 1)}</g>
          <polygon
            points="92,126 164,192 184,264 148,264"
            fill={wrapColor}
            stroke="#E5C158"
            strokeWidth="1.2"
          />
          <polygon
            points="308,126 236,192 216,264 252,264"
            fill={wrapShadow}
            stroke="#E5C158"
            strokeWidth="1.2"
          />
          <polygon
            points="148,200 252,200 232,272 168,272"
            fill={wrapColor}
            stroke="#E5C158"
            strokeWidth="1.4"
          />
          <g transform="translate(200, 212)">
            <rect x="-38" y="-5" width="76" height="10" rx="5" fill={ribbonColor} />
            <path
              d="M 0,0 C -26,-20 -36,10 -4,6 M 0,0 C 26,-20 36,10 4,6"
              fill="none"
              stroke={ribbonColor}
              strokeWidth="5.5"
              strokeLinecap="round"
            />
            <path
              d="M -4,5 L -16,44 M 4,5 L 16,44"
              stroke={ribbonColor}
              strokeWidth="4.5"
              strokeLinecap="round"
            />
            <circle cx="0" cy="0" r="6" fill={ribbonColor} />
          </g>
        </g>
      )}

      {/* 2. GLASS CLOCHE DOME SILHOUETTE */}
      {silhouette === 'cloche' && (
        <g>
          <path
            d="M 116,238 L 116,136 A 84,84 0 0,1 284,136 L 284,238 Z"
            fill="rgba(240, 249, 255, 0.34)"
            stroke="rgba(255, 255, 255, 0.85)"
            strokeWidth="2.5"
          />
          <g clipPath={`url(#${domeClipId})`}>
            {renderStems(16, 0.88)}
            <path
              d="M 188,214 L 212,214 M 200,214 C 186,204 182,220 198,217 M 200,214 C 214,204 218,220 202,217"
              stroke={ribbonColor}
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
            />
            <ellipse cx="200" cy="238" rx="68" ry="9" fill="#86EFAC" opacity="0.45" />
          </g>
          <circle
            cx="200"
            cy="43"
            r="9.5"
            fill="rgba(240, 249, 255, 0.58)"
            stroke="#FFFFFF"
            strokeWidth="2.2"
          />
          <path
            d="M 130,224 L 130,138 A 70,70 0 0,1 182,70"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity="0.72"
          />
          <ellipse cx="200" cy="240" rx="92" ry="9" fill={wrapColor} stroke={wrapShadow} strokeWidth="1.5" />
          <path
            d="M 104,240 L 296,240 L 302,254 C 302,259 294,262 284,262 L 116,262 C 106,262 98,259 98,254 Z"
            fill={wrapShadow}
          />
        </g>
      )}

      {/* 3. PARISIAN VELVET HATBOX SILHOUETTE */}
      {silhouette === 'hatbox' && (
        <g>
          <ellipse cx="200" cy="166" rx="68" ry="14" fill={wrapShadow} />
          <ellipse cx="200" cy="164" rx="62" ry="11" fill="#FFFDF9" opacity="0.9" />
          <g>{renderStems(8, 0.94)}</g>
          <path
            d="M 132,166 L 142,262 C 142,273 258,273 258,262 L 268,166 Z"
            fill={wrapColor}
            stroke="#D97706"
            strokeWidth="1.5"
          />
          <rect
            x="127"
            y="158"
            width="146"
            height="16"
            rx="5"
            fill={wrapShadow}
            stroke="#F59E0B"
            strokeWidth="1.4"
          />
          <line
            x1="134"
            y1="166"
            x2="266"
            y2="166"
            stroke="#FDE68A"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <rect
            x="170"
            y="198"
            width="60"
            height="34"
            rx="5"
            fill="#FFFDF9"
            stroke="#D97706"
            strokeWidth="1.6"
          />
          <rect
            x="174"
            y="202"
            width="52"
            height="26"
            rx="3"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="0.9"
          />
          <line x1="184" y1="212" x2="216" y2="212" stroke="#92400E" strokeWidth="1.6" strokeLinecap="round" />
          <line x1="190" y1="220" x2="210" y2="220" stroke="#B45309" strokeWidth="1.2" strokeLinecap="round" />
        </g>
      )}

      {/* 4. KOREAN SILK BUTTERFLY WINGS SILHOUETTE */}
      {silhouette === 'butterfly' && (
        <g>
          <path
            d="M 200,204 C 138,186 78,128 96,74 C 114,44 168,78 200,148 Z"
            fill={wrapShadow}
            opacity="0.88"
            stroke="#FFFDF9"
            strokeWidth="1.4"
          />
          <path
            d="M 200,204 C 262,186 322,128 304,74 C 286,44 232,78 200,148 Z"
            fill={wrapShadow}
            opacity="0.88"
            stroke="#FFFDF9"
            strokeWidth="1.4"
          />
          <ellipse cx="200" cy="144" rx="58" ry="44" fill="#FFFDF9" opacity="0.88" />
          <g>{renderStems(2, 0.96)}</g>
          <path
            d="M 200,214 C 142,212 104,174 114,136 C 124,116 168,150 200,196 Z"
            fill={wrapColor}
            stroke="#FFFDF9"
            strokeWidth="1.4"
          />
          <path
            d="M 200,214 C 258,212 296,174 286,136 C 276,116 232,150 200,196 Z"
            fill={wrapColor}
            stroke="#FFFDF9"
            strokeWidth="1.4"
          />
          <path
            d="M 164,200 L 236,200 L 224,266 C 216,272 184,272 176,266 Z"
            fill={wrapColor}
            stroke="#FFFDF9"
            strokeWidth="1.4"
          />
          <g transform="translate(200, 208)">
            <rect x="-34" y="-5" width="68" height="10" rx="5" fill={ribbonColor} />
            <path
              d="M 0,0 C -24,-18 -32,10 -4,6 M 0,0 C 24,-18 32,10 4,6"
              fill="none"
              stroke={ribbonColor}
              strokeWidth="5"
              strokeLinecap="round"
            />
            <circle cx="0" cy="0" r="5.5" fill={ribbonColor} />
          </g>
        </g>
      )}

      {/* Tucked Wax-Sealed Keepsake Envelope Asset (Just like the Saved PNG / Recipient Studio Canvas) */}
      <g transform="translate(254, 224) rotate(-4)">
        <rect
          x="-28"
          y="-19"
          width="56"
          height="38"
          rx="5"
          fill="#FFFDF9"
          stroke="#D8C4B4"
          strokeWidth="1.4"
        />
        {/* Envelope Flap Lines */}
        <path
          d="M -26,-17 L 0,3 L 26,-17"
          fill="none"
          stroke="#DECBB9"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M -26,17 L -8,2 M 26,17 L 8,2"
          fill="none"
          stroke="#EAE0D5"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
        {/* Rose-Gold / Crimson Wax Seal */}
        <circle cx="0" cy="2" r="6.2" fill="#E11D48" stroke="#FFFDF9" strokeWidth="1.2" />
        <path
          d="M 0,4.5 C -3,2 -3.8,-0.5 -1.8,-1.8 C -0.6,-2.5 0,-1.2 0,-1.2 C 0,-1.2 0.6,-2.5 1.8,-1.8 C 3.8,-0.5 3,2 0,4.5 Z"
          fill="#FFFDF9"
        />
      </g>
    </svg>
  );
});

/**
 * Miniature Botanical Lace Clothespin + Vertical Braided Cord suspending each PNG-style bouquet keepsake from the Catenary Lace Line.
 */
export const LaceHangerClipSVG: React.FC<{
  stringLengthPx: number;
  isDarkMode: boolean;
  accentColor: string;
}> = React.memo(({ stringLengthPx, isDarkMode, accentColor }) => {
  const cordColor = isDarkMode ? '#A38B7E' : '#B48E78';
  const laceStroke = isDarkMode ? '#D8C2B5' : '#C9AE9B';
  const brassBody = isDarkMode ? '#D4A373' : '#C89666';
  const brassHighlight = isDarkMode ? '#FDE68A' : '#FEF3C7';

  const dropCordPx = stringLengthPx + 22;

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
            fill={isDarkMode ? '#2B2321' : '#FDF9F5'}
            stroke={cordColor}
            strokeWidth="1.2"
          />
        </g>
      </svg>
    </div>
  );
});

/**
 * Pure PNG-Style Hanging Bouquet Keepsake Frame:
 * Looks just like a saved Studio PNG — no text headers, no quotes, no action bars, no clutter.
 * Displays ONLY the crafted bouquet + envelope asset + optional voice keepsake asset.
 */
const HangingCreationCard: React.FC<{
  entry: ShowcaseBouquetEntry;
  isDarkMode: boolean;
  onUnwrap: (entry: ShowcaseBouquetEntry) => void;
  disableStaticTilt?: boolean;
}> = React.memo(({ entry, isDarkMode, onUnwrap, disableStaticTilt }) => {
  return (
    <div className="w-full flex flex-col items-center group">
      <LaceHangerClipSVG
        stringLengthPx={entry.stringLengthPx}
        isDarkMode={isDarkMode}
        accentColor={entry.ribbonColor}
      />

      <button
        type="button"
        onClick={() => onUnwrap(entry)}
        aria-label={`Unwrap bouquet for ${entry.to} from ${entry.from}`}
        style={disableStaticTilt ? undefined : { transform: `rotate(${entry.tiltDeg}deg)` }}
        className={`w-full aspect-[1/1.05] rounded-[26px] sm:rounded-[30px] border p-2.5 sm:p-3.5 relative flex items-center justify-center overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-0 group-hover:-translate-y-1.5 cursor-pointer focus:outline-none ${
          isDarkMode
            ? 'bg-[#28211F] border-[#4A3D39] group-hover:border-[#6A5750] shadow-[0_14px_32px_rgba(15,11,9,0.34)]'
            : 'bg-[#F7F1E8] border-[#E5D7C8] group-hover:border-[#D2B59E] shadow-[0_12px_28px_rgba(122,75,58,0.07)] group-hover:shadow-[0_18px_38px_rgba(122,75,58,0.12)]'
        }`}
      >
        {/* Subtle Inner Studio Mat Frame */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-2 sm:inset-2.5 rounded-[20px] sm:rounded-[22px] border border-dashed ${
            isDarkMode ? 'border-[#3E3330]' : 'border-[#E9DDD0]'
          }`}
        />

        {/* Bouquet + Envelope Asset SVG */}
        <div className="w-full h-full flex items-center justify-center p-1 sm:p-1.5 group-hover:scale-105 transition-transform duration-500">
          <ShowcaseBouquetIllustrationSVG entry={entry} isDarkMode={isDarkMode} />
        </div>

        {/* Attached Voice Keepsake Asset (No text, just the miniature keepsake icon asset) */}
        {entry.hasVoice && entry.voiceStyle && (
          <div
            aria-hidden="true"
            className={`absolute bottom-3 left-3 sm:bottom-3.5 sm:left-3.5 w-8 h-8 sm:w-9 sm:h-9 rounded-full border flex items-center justify-center shadow-2xs [&>svg]:w-5 [&>svg]:h-5 sm:[&>svg]:w-5.5 sm:[&>svg]:h-5.5 transition-transform duration-300 group-hover:scale-110 ${
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

        {/* Whisper-Quiet Hover/Focus Dedication Tag (Hidden at rest so the card looks like a pure saved PNG) */}
        <div
          className={`pointer-events-none absolute bottom-2.5 inset-x-3 py-1 px-2.5 rounded-full text-[11px] truncate text-center opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 group-focus-visible:opacity-100 transition-all duration-300 backdrop-blur-xs ${
            isDarkMode
              ? 'bg-[#231C18]/88 text-[#F5ECE6]'
              : 'bg-[#FFFDF9]/92 text-[#4A382E] shadow-2xs'
          }`}
          style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
        >
          <span className="italic opacity-75">For </span>
          <span className="font-semibold">{entry.to}</span>
          <span className="opacity-50"> · </span>
          <span className="italic opacity-80">from {entry.from}</span>
        </div>
      </button>
    </div>
  );
});

/**
 * Full-Bleed Sweeping Catenary Lace & Twine Curve SVG (`\_______/`).
 */
export const SweepingCatenaryLaceLineSVG: React.FC<{
  isDarkMode: boolean;
  edgeY?: number;
  midY?: number;
}> = React.memo(({ isDarkMode, edgeY = 14, midY = 86 }) => {
  const controlY = 2 * midY - edgeY;
  const viewHeight = midY + 26;

  return (
    <svg
      viewBox={`0 0 1440 ${viewHeight}`}
      preserveAspectRatio="none"
      className="w-full h-[76px] sm:h-[96px] lg:h-[112px] overflow-visible pointer-events-none select-none"
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
//    Displays 4 limited PNG-style bouquet keepsakes hanging from the sweeping
//    catenary lace line that glide along the curve with Lenis scroll, plus a
//    clean CTA below to open the dedicated All Creations page.
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
}) => {
  const [nowMs] = useState<number>(() => Date.now());
  const activeEntries = useActiveShowcaseBouquets(vaultCount, nowMs);
  const limitedEntries = useMemo(() => activeEntries.slice(0, 4), [activeEntries]);

  const sectionRef = useRef<HTMLElement | null>(null);
  // Direct DOM refs for 120fps Lenis scroll-linked movement along the catenary curve
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const wrapper = scrollContainerRef.current;

    const applyGarlandScroll = () => {
      const count = limitedEntries.length;
      const sectionEl = sectionRef.current;
      let centeredScrollTop = 450; // 450 corresponds to uShift = 0 (perfectly centered)

      if (sectionEl && typeof window !== 'undefined') {
        const rect = sectionEl.getBoundingClientRect();
        const viewportMid = window.innerHeight * 0.5;
        const sectionMid = rect.top + rect.height * 0.45;
        // As section moves through viewport, map delta (-450..+450) around 450
        const delta = viewportMid - sectionMid;
        centeredScrollTop = Math.max(0, Math.min(900, 450 + delta * 0.75));
      }

      for (let i = 0; i < count; i++) {
        const el = itemRefs.current[i];
        if (!el) continue;
        const entry = limitedEntries[i];
        const state = computeGarlandItemScrollTransform(
          i,
          count,
          centeredScrollTop,
          entry ? entry.tiltDeg : 0,
          14,
          86
        );
        el.style.transform = `translate3d(${state.xShiftPx}px, ${state.yCurvePx}px, 0) rotate(${state.rotateDeg}deg)`;
      }
    };

    applyGarlandScroll();

    if (!wrapper) return;
    const onScroll = () => {
      applyGarlandScroll();
    };
    wrapper.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      wrapper.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [limitedEntries, scrollContainerRef]);

  return (
    <section
      id="showcase"
      ref={sectionRef}
      data-testid="hero-lace-garland-section"
      className="scroll-mt-24 relative w-full pt-4 sm:pt-6 pb-8 sm:pb-12 overflow-hidden select-none"
    >
      <div className="fluid-scroll-item text-center mb-1 sm:mb-2 px-4">
        <h2
          className={`text-3xl sm:text-4xl font-semibold ${
            isDarkMode ? 'text-[#FBF6F1]' : 'text-[#1F1815]'
          }`}
          style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
        >
          Shared Creations
        </h2>
      </div>

      {/* FULL-BLEED SWEEPING CATENARY LACE GARLAND & HANGING PNG-STYLE BOUQUETS */}
      <div className="relative w-full">
        {/* The Sweeping Catenary Lace Ribbon (`\_______/`) */}
        <div className="w-full relative z-0">
          <SweepingCatenaryLaceLineSVG isDarkMode={isDarkMode} edgeY={14} midY={86} />
        </div>

        {/* Desktop (lg+): 4 Limited PNG-Style Creations Gliding Along the Catenary Curve with Lenis Scroll */}
        <div className="hidden lg:grid lg:grid-cols-4 gap-7 max-w-5xl mx-auto px-8 -mt-[112px] pb-24 relative z-10">
          {limitedEntries.map((entry, idx) => {
            const initial = computeGarlandItemScrollTransform(
              idx,
              limitedEntries.length,
              450,
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
                className="w-full max-w-[218px] mx-auto"
              >
                <HangingCreationCard
                  entry={entry}
                  isDarkMode={isDarkMode}
                  onUnwrap={onUnwrapShowcaseBouquet}
                  disableStaticTilt
                />
              </div>
            );
          })}
        </div>

        {/* Tablet (sm to lg): 3 Hanging PNG-Style Creations Properly Spaced Along the Catenary Curve */}
        <div className="hidden sm:grid lg:hidden sm:grid-cols-3 gap-5 max-w-2xl mx-auto px-6 -mt-[96px] pb-16 relative z-10">
          {limitedEntries.slice(0, 3).map((entry, idx) => {
            const u = 0.2 + (idx / 2) * 0.6;
            const curveY = evaluateCatenaryCurveY(u, 12, 68);
            return (
              <div
                key={entry.id}
                style={{
                  transform: `translate3d(0px, ${curveY}px, 0)`,
                }}
                className="w-full max-w-[196px] mx-auto"
              >
                <HangingCreationCard
                  entry={entry}
                  isDarkMode={isDarkMode}
                  onUnwrap={onUnwrapShowcaseBouquet}
                />
              </div>
            );
          })}
        </div>

        {/* Mobile (< sm): 2 Hanging PNG-Style Creations Side-by-Side Along the Catenary Curve */}
        <div className="grid sm:hidden grid-cols-2 gap-3.5 max-w-[360px] mx-auto px-4 -mt-[76px] pb-12 relative z-10">
          {limitedEntries.slice(0, 2).map((entry, idx) => {
            const u = idx === 0 ? 0.28 : 0.72;
            const curveY = evaluateCatenaryCurveY(u, 10, 50);
            return (
              <div
                key={entry.id}
                style={{
                  transform: `translate3d(0px, ${curveY}px, 0)`,
                }}
                className="w-full max-w-[162px] mx-auto"
              >
                <HangingCreationCard
                  entry={entry}
                  isDarkMode={isDarkMode}
                  onUnwrap={onUnwrapShowcaseBouquet}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* CLEAN CTA BELOW THE GARLAND TO EXPLORE ALL CREATIONS */}
      <div className="fluid-scroll-item text-center px-4 mt-1 sm:mt-2">
        <button
          type="button"
          onClick={onExploreAllCreations}
          data-testid="explore-all-creations-btn"
          className={`px-6 sm:px-7 py-2.5 sm:py-3 rounded-full border border-dashed text-xs sm:text-[13px] font-medium inline-flex items-center gap-2 transition-all duration-300 active:scale-95 cursor-pointer shadow-[0_8px_24px_rgba(122,75,58,0.05)] ${
            isDarkMode
              ? 'bg-[#362D2A] border-[#66554F] text-[#FBF6F1] hover:bg-[#433834]'
              : 'bg-[#FFFDF9] border-[#D8C4B4] text-[#4A382E] hover:bg-[#FAF3EB]'
          }`}
        >
          <span>Explore All Creations</span>
          <span aria-hidden="true" className="opacity-70">→</span>
        </button>
      </div>
    </section>
  );
};

// ============================================================================
// 2. DEDICATED "ALL CREATIONS" GALLERY PAGE
//    Rendered via Portal on `document.body` so `fixed inset-0` is never clipped
//    by any parent transform, with a silky fade+scale transition and a single
//    unified "For & From" search input (no noisy filter tabs).
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

export const CreationsGalleryPageView: React.FC<CreationsGalleryPageViewProps> = ({
  isDarkMode,
  onToggleDarkMode,
  vaultCount,
  onOpenVault,
  onBackToHome,
  onStartCrafting,
  onUnwrapShowcaseBouquet,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [nowMs] = useState<number>(() => Date.now());

  const pageScrollWrapperRef = useRef<HTMLDivElement | null>(null);
  const pageScrollContentRef = useRef<HTMLDivElement | null>(null);

  const allActiveEntries = useActiveShowcaseBouquets(vaultCount, nowMs);

  const filteredEntries = useMemo(
    () =>
      filterShowcaseBouquets(allActiveEntries, {
        searchQuery,
        nowMs,
      }),
    [allActiveEntries, searchQuery, nowMs]
  );

  // Group filtered entries into rows of 4 for the sweeping catenary garlands
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

    wrapper.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });

    const lenis = new Lenis({
      wrapper,
      content,
      lerp: 0.09,
      duration: 1.15,
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

  const triggerSmoothClose = (afterClose: () => void) => {
    setIsClosing(true);
    window.setTimeout(() => {
      afterClose();
    }, 240);
  };

  const pageContent = (
    <div
      ref={pageScrollWrapperRef}
      data-testid="creations-gallery-page"
      className={`fixed inset-0 z-[90] overflow-y-auto overflow-x-hidden transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        isClosing ? 'opacity-0 scale-[0.985]' : 'opacity-100 scale-100 animate-creations-page-enter'
      } ${isDarkMode ? 'bg-[#2B2321] text-[#FBF6F1]' : 'bg-[#FDF9F5] text-[#231C18]'}`}
      style={{
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <style>{`
        @keyframes creationsPageEnter {
          0% { opacity: 0; transform: scale(0.988) translate3d(0, 10px, 0); }
          100% { opacity: 1; transform: scale(1) translate3d(0, 0, 0); }
        }
        .animate-creations-page-enter {
          animation: creationsPageEnter 0.36s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
      `}</style>

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
              onClick={() => triggerSmoothClose(onBackToHome)}
              data-testid="creations-back-home-btn"
              className={`px-3 py-1.5 rounded-full border border-dashed text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer ${
                isDarkMode
                  ? 'bg-[#423734] border-[#66554F] text-[#FBF6F1] hover:bg-[#4D403C]'
                  : 'bg-[#FAF4EE] border-[#D8C4B4] text-[#5C4438] hover:bg-[#F3E9DF]'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={() => triggerSmoothClose(onBackToHome)}
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
              onClick={() => triggerSmoothClose(onOpenVault)}
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
              onClick={() => triggerSmoothClose(onStartCrafting)}
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
      <div ref={pageScrollContentRef} className="w-full pt-6 sm:pt-10 pb-24">
        {/* QUIET EDITORIAL HEADER & SINGLE UNIFIED "FOR / FROM" SEARCH INPUT */}
        <div className="max-w-xl mx-auto px-4 sm:px-6 text-center">
          <h1
            className={`text-3xl sm:text-5xl font-semibold tracking-tight ${
              isDarkMode ? 'text-[#FBF6F1]' : 'text-[#1F1815]'
            }`}
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            On the <span className="italic font-normal">Lace Garland</span>
          </h1>

          {/* Single Unified Search Input for both "For" (Recipient) and "From" (Sender) */}
          <label
            className={`mt-5 max-w-md mx-auto rounded-full border border-dashed px-4 py-2.5 flex items-center gap-2.5 transition-colors shadow-[0_6px_22px_rgba(122,75,58,0.04)] cursor-text ${
              isDarkMode
                ? 'bg-[#352C29]/95 border-[#574843] focus-within:border-[#8A7267]'
                : 'bg-[#FFFDF9]/95 border-[#DECBB9] focus-within:border-[#B5967E]'
            }`}
          >
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
              For / From
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search recipient or sender…"
              aria-label="Search bouquets by recipient (For) or sender (From)"
              data-testid="showcase-search-unified"
              className={`w-full min-w-0 bg-transparent text-xs focus:outline-none ${
                isDarkMode
                  ? 'text-[#FBF6F1] placeholder:text-[#9E8C82]'
                  : 'text-[#231C18] placeholder:text-[#A39084]'
              }`}
            />
            {searchQuery.trim() && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                data-testid="showcase-search-clear"
                className={`p-1 rounded-full transition cursor-pointer shrink-0 ${
                  isDarkMode
                    ? 'text-[#D8C7BE] hover:bg-[#483C38]'
                    : 'text-[#7A685D] hover:bg-[#F3ECE3]'
                }`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </label>
        </div>

        {/* MULTI-ROW SWEEPING CATENARY LACE GARLANDS WITH PURE PNG-STYLE BOUQUETS */}
        {garlandRows.length === 0 ? (
          <div
            data-testid="showcase-empty-state"
            className={`mt-12 max-w-sm mx-auto rounded-[24px] border border-dashed py-10 px-6 text-center ${
              isDarkMode
                ? 'bg-[#352C29]/80 border-[#574843]'
                : 'bg-[#FFFDF9]/90 border-[#DECBB9]'
            }`}
          >
            <p
              className={`text-xl font-semibold ${
                isDarkMode ? 'text-[#FBF6F1]' : 'text-[#231C18]'
              }`}
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              No bouquets found for “{searchQuery.trim()}”
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className={`mt-4 px-5 py-2 rounded-full border border-dashed text-xs font-medium transition cursor-pointer ${
                isDarkMode
                  ? 'border-[#66554F] bg-[#423734] text-[#FBF6F1] hover:bg-[#4D403C]'
                  : 'border-[#D8C4B4] bg-[#FAF4EE] text-[#5C4438] hover:bg-[#F3E9DF]'
              }`}
            >
              Show all creations
            </button>
          </div>
        ) : (
          <div className="mt-6 sm:mt-8 space-y-8 sm:space-y-12">
            {garlandRows.map((rowEntries, rowIdx) => (
              <div key={`garland-row-${rowIdx}`} className="relative w-full">
                {/* Sweeping Catenary Lace Cord for this Row */}
                <div className="w-full relative z-0">
                  <SweepingCatenaryLaceLineSVG isDarkMode={isDarkMode} edgeY={12} midY={68} />
                </div>

                {/* PNG-Style Bouquets Suspended Along the Row's Catenary Curve */}
                <div
                  className={`max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-[76px] sm:-mt-[96px] lg:-mt-[108px] pb-10 sm:pb-14 grid grid-cols-2 sm:grid-cols-2 ${
                    rowEntries.length === 1
                      ? 'lg:grid-cols-1 max-w-[220px]'
                      : rowEntries.length === 2
                      ? 'lg:grid-cols-2 max-w-lg'
                      : rowEntries.length === 3
                      ? 'lg:grid-cols-3 max-w-3xl'
                      : 'lg:grid-cols-4'
                  } gap-3.5 sm:gap-6 lg:gap-7 relative z-10`}
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
                        className="w-full max-w-[164px] sm:max-w-[204px] lg:max-w-[218px] mx-auto"
                      >
                        <HangingCreationCard
                          entry={entry}
                          isDarkMode={isDarkMode}
                          onUnwrap={(selected) =>
                            triggerSmoothClose(() => onUnwrapShowcaseBouquet(selected))
                          }
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

  if (typeof document !== 'undefined') {
    return createPortal(pageContent, document.body);
  }
  return pageContent;
};
