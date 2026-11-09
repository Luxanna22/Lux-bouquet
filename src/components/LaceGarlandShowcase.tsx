import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Lenis from 'lenis';
import { ArrowLeft, ChevronLeft, ChevronRight, Moon, Search, Sun, X } from 'lucide-react';
import { FlowerRenderer } from './flowers/FlowerRenderer';
import { MiniVoiceKeepsakeSVG } from './MiniThumbnails';
import { BrandLogoMark } from './BrandLogoMark';
import {
  buildCuratedShowcaseBouquets,
  computeSingleLaceCarouselItemTransform,
  convertVaultBouquetToShowcaseEntry,
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
 * Pure PNG-Style Hanging Bouquet Keepsake Frame (View-Only / Unwrap-Only):
 * Uses a SINGLE primary dashed border (zero double borders) and displays the crafted bouquet,
 * wax-sealed envelope asset, optional voice keepsake asset, and a quiet For/From dedication tag.
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
        aria-label={`Open bouquet for ${entry.to} from ${entry.from} (view-only)`}
        style={disableStaticTilt ? undefined : { transform: `rotate(${entry.tiltDeg}deg)` }}
        className={`w-full aspect-[1/1.05] rounded-[26px] sm:rounded-[30px] border border-dashed p-2.5 sm:p-3.5 relative flex items-center justify-center overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-0 group-hover:-translate-y-1.5 cursor-pointer focus:outline-none ${
          isDarkMode
            ? 'bg-[#28211F] border-[#5C4B45] group-hover:border-[#856D64] shadow-[0_14px_32px_rgba(15,11,9,0.34)]'
            : 'bg-[#F7F1E8] border-[#D8C5B4] group-hover:border-[#B99B84] shadow-[0_12px_28px_rgba(122,75,58,0.07)] group-hover:shadow-[0_18px_38px_rgba(122,75,58,0.12)]'
        }`}
      >
        {/* Bouquet + Envelope Asset SVG */}
        <div className="w-full h-full flex items-center justify-center p-1 sm:p-1.5 pb-4 sm:pb-5 group-hover:scale-105 transition-transform duration-500">
          <ShowcaseBouquetIllustrationSVG entry={entry} isDarkMode={isDarkMode} />
        </div>

        {/* Attached Voice Keepsake Asset (No text, just the miniature keepsake icon asset) */}
        {entry.hasVoice && entry.voiceStyle && (
          <div
            aria-hidden="true"
            className={`absolute top-2.5 right-2.5 sm:top-3 sm:right-3 w-7.5 h-7.5 sm:w-8.5 sm:h-8.5 rounded-full border border-dashed flex items-center justify-center shadow-2xs [&>svg]:w-4.5 [&>svg]:h-4.5 sm:[&>svg]:w-5 sm:[&>svg]:h-5 transition-transform duration-300 group-hover:scale-110 ${
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

        {/* Quiet Editorial Dedication Tag at Base of Card */}
        <div
          className={`pointer-events-none absolute bottom-2 sm:bottom-2.5 inset-x-2.5 sm:inset-x-3 py-0.5 sm:py-1 px-2.5 rounded-full text-[11px] sm:text-xs truncate text-center transition-all duration-300 backdrop-blur-xs ${
            isDarkMode
              ? 'bg-[#231C18]/86 text-[#F5ECE6]'
              : 'bg-[#FFFDF9]/92 text-[#4A382E] shadow-2xs'
          }`}
          style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
        >
          <span className="italic opacity-75">For </span>
          <span className="font-semibold">{entry.to}</span>
          <span className="opacity-45"> · </span>
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
// 1. HERO CATENARY LACE GARLAND PREVIEW (On the Landing Page)
//    Displays 4 limited PNG-style bouquet keepsakes hanging from the single
//    sweeping catenary lace line that glide right-to-left along the curve with
//    Lenis scroll, plus a clean CTA to open the All Creations page.
//    All creations are strictly view-only / unwrap-only.
// ============================================================================

interface HeroLaceGarlandPreviewProps {
  isDarkMode: boolean;
  vaultCount: number;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  onExploreAllCreations: () => void;
  onUnwrapShowcaseBouquet: (entry: ShowcaseBouquetEntry) => void;
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
  const previewEntries = useMemo(() => activeEntries.slice(0, 8), [activeEntries]);

  const [visibleSlots, setVisibleSlots] = useState<number>(() => {
    if (typeof window === 'undefined') return 4;
    if (window.innerWidth < 640) return 2;
    if (window.innerWidth < 1024) return 3;
    return 4;
  });

  const sectionRef = useRef<HTMLElement | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const manualOffsetRef = useRef<number>(0);
  const scrollDrivenOffsetRef = useRef<number>(0);
  const dragStartXRef = useRef<number | null>(null);
  const dragStartManualRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => {
      const w = window.innerWidth;
      setVisibleSlots(w < 640 ? 2 : w < 1024 ? 3 : 4);
    };
    onResize();
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const maxOffset = useMemo(
    () => Math.max(0.5, previewEntries.length - visibleSlots + 0.35),
    [previewEntries.length, visibleSlots]
  );

  const edgeY = visibleSlots === 2 ? 12 : 14;
  const midY = visibleSlots === 2 ? 56 : visibleSlots === 3 ? 72 : 86;

  const updateGarlandDOM = useCallback(() => {
    const count = previewEntries.length;
    const rawTotal = scrollDrivenOffsetRef.current + manualOffsetRef.current;
    // Wrap smoothly within [0, maxOffset] so both scroll and manual step/swipe cycle all creations right-to-left
    const combinedOffset = Math.max(0, Math.min(maxOffset, rawTotal));

    for (let i = 0; i < count; i++) {
      const el = itemRefs.current[i];
      if (!el) continue;
      const entry = previewEntries[i];
      const state = computeSingleLaceCarouselItemTransform(
        i,
        count,
        combinedOffset,
        visibleSlots,
        entry ? entry.tiltDeg : 0,
        edgeY,
        midY
      );
      el.style.left = `${state.xPercent}%`;
      el.style.transform = `translate3d(-50%, ${state.yCurvePx}px, 0) rotate(${state.rotateDeg}deg) scale(${state.scale})`;
      el.style.opacity = String(state.opacity);
      el.style.pointerEvents = state.isVisible ? 'auto' : 'none';
      el.style.visibility = state.isVisible ? 'visible' : 'hidden';
    }
  }, [previewEntries, visibleSlots, maxOffset, edgeY, midY]);

  useEffect(() => {
    const wrapper = scrollContainerRef.current;

    const applyGarlandScroll = () => {
      const sectionEl = sectionRef.current;
      if (sectionEl && typeof window !== 'undefined') {
        const rect = sectionEl.getBoundingClientRect();
        const vh = window.innerHeight || 800;
        // Progress from 0 when section enters bottom of viewport to 1 as it scrolls past upper viewport
        const progress = Math.max(
          0,
          Math.min(1, (vh * 0.85 - rect.top) / (vh * 0.95 + rect.height * 0.5))
        );
        scrollDrivenOffsetRef.current = progress * Math.min(maxOffset, 2.4);
      }
      updateGarlandDOM();
    };

    applyGarlandScroll();

    if (!wrapper) return;
    wrapper.addEventListener('scroll', applyGarlandScroll, { passive: true });
    window.addEventListener('resize', applyGarlandScroll, { passive: true });
    return () => {
      wrapper.removeEventListener('scroll', applyGarlandScroll);
      window.removeEventListener('resize', applyGarlandScroll);
    };
  }, [scrollContainerRef, maxOffset, updateGarlandDOM]);

  const stepPreviewCarousel = (delta: number) => {
    const currentTotal = scrollDrivenOffsetRef.current + manualOffsetRef.current;
    const nextTotal = Math.max(0, Math.min(maxOffset, Math.round(currentTotal + delta)));
    manualOffsetRef.current = nextTotal - scrollDrivenOffsetRef.current;
    updateGarlandDOM();
  };

  return (
    <section
      id="showcase"
      ref={sectionRef}
      data-testid="hero-lace-garland-section"
      className="scroll-mt-24 relative w-full pt-4 sm:pt-6 pb-10 sm:pb-14 overflow-hidden select-none"
    >
      <div className="fluid-scroll-item text-center mb-2 sm:mb-3 px-4">
        <h2
          className={`text-3xl sm:text-4xl font-semibold ${
            isDarkMode ? 'text-[#FBF6F1]' : 'text-[#1F1815]'
          }`}
          style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
        >
          Shared Creations
        </h2>
      </div>

      {/* UNIFIED SINGLE-LACE RIGHT-TO-LEFT CAROUSEL PREVIEW ACROSS MOBILE, TABLET & DESKTOP */}
      <div
        className="relative w-full h-[285px] sm:h-[330px] lg:h-[360px] touch-pan-y"
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest('button')) return;
          dragStartXRef.current = e.clientX;
          dragStartManualRef.current = manualOffsetRef.current;
        }}
        onPointerMove={(e) => {
          if (dragStartXRef.current === null) return;
          const deltaX = dragStartXRef.current - e.clientX;
          const offsetDelta = deltaX / 140;
          const nextManual = Math.max(
            -scrollDrivenOffsetRef.current,
            Math.min(maxOffset - scrollDrivenOffsetRef.current, dragStartManualRef.current + offsetDelta)
          );
          manualOffsetRef.current = nextManual;
          updateGarlandDOM();
        }}
        onPointerUp={() => {
          dragStartXRef.current = null;
        }}
        onPointerCancel={() => {
          dragStartXRef.current = null;
        }}
      >
        {/* The Single Sweeping Catenary Lace Ribbon (`\_______/`) */}
        <div className="absolute top-0 inset-x-0 z-0">
          <SweepingCatenaryLaceLineSVG isDarkMode={isDarkMode} edgeY={edgeY} midY={midY} />
        </div>

        {/* Hanging Creations Gliding From Right to Left Along the Single Catenary Curve */}
        <div className="absolute inset-0 z-10">
          {previewEntries.map((entry, idx) => {
            const initial = computeSingleLaceCarouselItemTransform(
              idx,
              previewEntries.length,
              0,
              visibleSlots,
              entry.tiltDeg,
              edgeY,
              midY
            );
            return (
              <div
                key={entry.id}
                ref={(el) => {
                  itemRefs.current[idx] = el;
                }}
                data-testid={`hero-garland-card-${entry.code}`}
                style={{
                  left: `${initial.xPercent}%`,
                  transform: `translate3d(-50%, ${initial.yCurvePx}px, 0) rotate(${initial.rotateDeg}deg) scale(${initial.scale})`,
                  opacity: initial.opacity,
                  pointerEvents: initial.isVisible ? 'auto' : 'none',
                  visibility: initial.isVisible ? 'visible' : 'hidden',
                  willChange: 'transform, left, opacity',
                }}
                className="absolute top-0 w-[154px] sm:w-[190px] lg:w-[214px] transition-[left,transform,opacity] duration-150 ease-out"
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
      </div>

      {/* GENEROUSLY SPACED STEP CONTROLS + EXPLORE ALL CREATIONS CTA BELOW THE GARLAND */}
      <div className="fluid-scroll-item text-center px-4 mt-10 sm:mt-14 pt-2 flex items-center justify-center gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={() => stepPreviewCarousel(-1)}
          aria-label="Previous shared creation"
          data-testid="hero-garland-prev"
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-dashed flex items-center justify-center transition-all duration-300 active:scale-95 cursor-pointer shrink-0 ${
            isDarkMode
              ? 'bg-[#362D2A] border-[#66554F] text-[#FBF6F1] hover:bg-[#433834]'
              : 'bg-[#FFFDF9] border-[#D8C4B4] text-[#4A382E] hover:bg-[#FAF3EB]'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

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

        <button
          type="button"
          onClick={() => stepPreviewCarousel(1)}
          aria-label="Next shared creation"
          data-testid="hero-garland-next"
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-dashed flex items-center justify-center transition-all duration-300 active:scale-95 cursor-pointer shrink-0 ${
            isDarkMode
              ? 'bg-[#362D2A] border-[#66554F] text-[#FBF6F1] hover:bg-[#433834]'
              : 'bg-[#FFFDF9] border-[#D8C4B4] text-[#4A382E] hover:bg-[#FAF3EB]'
          }`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
};

// ============================================================================
// 2. DEDICATED "ON THE LACE GARLAND" SINGLE-SCREEN, SINGLE-LACE CAROUSEL PAGE
//    - Fits 100% in ONE single screen (`100dvh`) with ONE sweeping catenary lace line.
//    - On-scroll: Smooth Lenis scroll glides every creation like a carousel from
//      RIGHT to LEFT along the single catenary lace curve (`\_______/`).
//    - Includes the unified "For / From" search bar to filter creations live.
//    - All creations are strictly view-only / unwrap-only.
// ============================================================================

interface CreationsGalleryPageViewProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  vaultCount: number;
  onOpenVault: () => void;
  onBackToHome: () => void;
  onStartCrafting: () => void;
  onUnwrapShowcaseBouquet: (entry: ShowcaseBouquetEntry) => void;
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
  const [visibleSlots, setVisibleSlots] = useState<number>(() => {
    if (typeof window === 'undefined') return 4;
    if (window.innerWidth < 640) return 2;
    if (window.innerWidth < 1024) return 3;
    return 4;
  });
  const [activeCarouselStep, setActiveCarouselStep] = useState(0);

  const pageScrollWrapperRef = useRef<HTMLDivElement | null>(null);
  const pageScrollContentRef = useRef<HTMLDivElement | null>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const currentOffsetRef = useRef<number>(0);
  const dragStartXRef = useRef<number | null>(null);
  const dragStartScrollRef = useRef<number>(0);

  const allActiveEntries = useActiveShowcaseBouquets(vaultCount, nowMs);

  const filteredEntries = useMemo(
    () =>
      filterShowcaseBouquets(allActiveEntries, {
        searchQuery,
        nowMs,
      }),
    [allActiveEntries, searchQuery, nowMs]
  );

  // Responsive slot count (2 on mobile, 3 on tablet, 4 on desktop)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => {
      const w = window.innerWidth;
      setVisibleSlots(w < 640 ? 2 : w < 1024 ? 3 : 4);
    };
    onResize();
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Maximum carousel offset in item units so scrolling moves every creation right-to-left across the single lace line
  const maxCarouselOffset = useMemo(() => {
    if (filteredEntries.length <= 1) return 0.5;
    if (filteredEntries.length <= visibleSlots) {
      return Math.max(0.65, filteredEntries.length - 1);
    }
    return filteredEntries.length - visibleSlots + 0.45;
  }, [filteredEntries.length, visibleSlots]);

  const scrollPerItemPx = 300;
  const totalScrollRangePx = Math.max(320, Math.round(maxCarouselOffset * scrollPerItemPx));

  const edgeY = visibleSlots === 2 ? 12 : 14;
  const midY = visibleSlots === 2 ? 62 : visibleSlots === 3 ? 78 : 92;

  const applySingleLaceTransforms = useCallback(
    (scrollTopPx: number) => {
      const progress =
        totalScrollRangePx > 0
          ? Math.max(0, Math.min(1, scrollTopPx / totalScrollRangePx))
          : 0;
      const scrollOffset = progress * maxCarouselOffset;
      currentOffsetRef.current = scrollOffset;

      const nextStep = Math.min(
        Math.max(0, filteredEntries.length - 1),
        Math.round(scrollOffset)
      );
      setActiveCarouselStep((prev) => (prev === nextStep ? prev : nextStep));

      for (let i = 0; i < filteredEntries.length; i++) {
        const el = itemRefs.current[i];
        if (!el) continue;
        const entry = filteredEntries[i];
        const state = computeSingleLaceCarouselItemTransform(
          i,
          filteredEntries.length,
          scrollOffset,
          visibleSlots,
          entry ? entry.tiltDeg : 0,
          edgeY,
          midY
        );
        el.style.left = `${state.xPercent}%`;
        el.style.transform = `translate3d(-50%, ${state.yCurvePx}px, 0) rotate(${state.rotateDeg}deg) scale(${state.scale})`;
        el.style.opacity = String(state.opacity);
        el.style.pointerEvents = state.isVisible ? 'auto' : 'none';
        el.style.visibility = state.isVisible ? 'visible' : 'hidden';
      }
    },
    [filteredEntries, maxCarouselOffset, totalScrollRangePx, visibleSlots, edgeY, midY]
  );

  // Initialize smooth Lenis scroll on the single-screen sticky viewport
  useEffect(() => {
    const wrapper = pageScrollWrapperRef.current;
    const content = pageScrollContentRef.current;
    if (!wrapper || !content) return;

    wrapper.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    applySingleLaceTransforms(0);

    const lenis = new Lenis({
      wrapper,
      content,
      lerp: 0.085,
      duration: 1.15,
      smoothWheel: true,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.4,
    });
    lenisRef.current = lenis;

    lenis.on('scroll', (e: { scroll: number }) => {
      applySingleLaceTransforms(e.scroll);
    });

    const handleNativeScroll = () => {
      applySingleLaceTransforms(wrapper.scrollTop);
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
  }, [applySingleLaceTransforms]);

  // Reset carousel to right-to-left start when search query changes
  useEffect(() => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true });
    } else if (pageScrollWrapperRef.current) {
      pageScrollWrapperRef.current.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
    applySingleLaceTransforms(0);
  }, [searchQuery, applySingleLaceTransforms]);

  const scrollByStep = (deltaSteps: number) => {
    const wrapper = pageScrollWrapperRef.current;
    if (!wrapper) return;
    const targetOffset = Math.max(
      0,
      Math.min(maxCarouselOffset, currentOffsetRef.current + deltaSteps)
    );
    const targetScrollTop =
      maxCarouselOffset > 0 ? (targetOffset / maxCarouselOffset) * totalScrollRangePx : 0;

    if (lenisRef.current) {
      lenisRef.current.scrollTo(targetScrollTop, {
        duration: 1.05,
        easing: (t: number) => 1 - Math.pow(1 - t, 4),
      });
    } else {
      wrapper.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
    }
  };

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
      onWheel={(e) => {
        // Also map horizontal trackpad swipes (deltaX) into smooth Lenis scroll along the single lace line
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && pageScrollWrapperRef.current) {
          const nextTop = Math.max(
            0,
            Math.min(totalScrollRangePx, pageScrollWrapperRef.current.scrollTop + e.deltaX)
          );
          if (lenisRef.current) {
            lenisRef.current.scrollTo(nextTop, { immediate: false });
          } else {
            pageScrollWrapperRef.current.scrollTop = nextTop;
          }
        }
      }}
      className={`fixed inset-0 z-[90] h-dvh overflow-y-auto overflow-x-hidden no-scrollbar transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
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

      {/* LENIS VIRTUAL SCROLL TRACK: Locks visual stage to 100dvh while enabling native smooth Lenis wheel/touch scroll */}
      <div
        ref={pageScrollContentRef}
        style={{ height: `calc(100dvh + ${totalScrollRangePx}px)` }}
        className="w-full relative"
      >
        {/* SINGLE-SCREEN LOCKED STAGE (100dvh, 1 Sweeping Catenary Lace Line Only) */}
        <div
          data-testid="single-screen-lace-stage"
          className="sticky top-0 h-dvh w-full overflow-hidden flex flex-col justify-between select-none"
        >
          {/* 1. TOP BAR + COMPACT HEADER & UNIFIED "FOR / FROM" SEARCH */}
          <div className="w-full shrink-0 z-30 pt-2 sm:pt-3 px-3 sm:px-6">
            <header
              className={`max-w-5xl mx-auto h-12 sm:h-14 px-3.5 sm:px-5 md:px-6 rounded-full border border-dashed shadow-[0_10px_30px_rgba(64,45,35,0.07)] backdrop-blur-md flex items-center justify-between gap-2 sm:gap-3 transition-colors ${
                isDarkMode
                  ? 'bg-[#352C29]/94 border-[#5E4E49] text-[#FBF6F1]'
                  : 'bg-[#FFFDF9]/94 border-[#D8C4B4] text-[#231C18]'
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

            {/* Compact Editorial Title + Unified "For / From" Search Input */}
            <div className="max-w-xl mx-auto px-2 pt-3 sm:pt-5 text-center">
              <h1
                className={`text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-none ${
                  isDarkMode ? 'text-[#FBF6F1]' : 'text-[#1F1815]'
                }`}
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                On the <span className="italic font-normal">Lace Garland</span>
              </h1>

              <label
                className={`mt-3 sm:mt-4 max-w-md mx-auto rounded-full border border-dashed px-4 py-2 sm:py-2.5 flex items-center gap-2.5 transition-colors shadow-[0_6px_22px_rgba(122,75,58,0.04)] cursor-text ${
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
          </div>

          {/* 2. MIDDLE: ONE SINGLE SWEEPING CATENARY LACE LINE & RIGHT-TO-LEFT LENIS CAROUSEL */}
          <div
            className="relative flex-1 w-full flex flex-col justify-center overflow-hidden"
            onPointerDown={(e) => {
              if ((e.target as HTMLElement).closest('button, input, label')) return;
              dragStartXRef.current = e.clientX;
              dragStartScrollRef.current = pageScrollWrapperRef.current?.scrollTop || 0;
            }}
            onPointerMove={(e) => {
              if (dragStartXRef.current === null || !pageScrollWrapperRef.current) return;
              const deltaX = dragStartXRef.current - e.clientX; // Dragging right-to-left advances scroll
              const nextTop = Math.max(
                0,
                Math.min(totalScrollRangePx, dragStartScrollRef.current + deltaX * 1.6)
              );
              if (lenisRef.current) {
                lenisRef.current.scrollTo(nextTop, { immediate: false });
              } else {
                pageScrollWrapperRef.current.scrollTop = nextTop;
              }
            }}
            onPointerUp={() => {
              dragStartXRef.current = null;
            }}
            onPointerCancel={() => {
              dragStartXRef.current = null;
            }}
          >
            {filteredEntries.length === 0 ? (
              <div
                data-testid="showcase-empty-state"
                className={`max-w-sm mx-auto rounded-[24px] border border-dashed py-9 px-6 text-center ${
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
              <div
                data-testid="single-lace-carousel-track"
                className="relative w-full h-[320px] sm:h-[370px] lg:h-[400px]"
              >
                {/* The ONE Sweeping Catenary Lace Cord Across the Screen */}
                <div className="absolute top-0 inset-x-0 z-0">
                  <SweepingCatenaryLaceLineSVG
                    isDarkMode={isDarkMode}
                    edgeY={edgeY}
                    midY={midY}
                  />
                </div>

                {/* Hanging Creations Gliding From Right to Left Along the Single Catenary Curve */}
                <div className="absolute inset-0 z-10">
                  {filteredEntries.map((entry, idx) => {
                    const initial = computeSingleLaceCarouselItemTransform(
                      idx,
                      filteredEntries.length,
                      0,
                      visibleSlots,
                      entry.tiltDeg,
                      edgeY,
                      midY
                    );
                    return (
                      <div
                        key={entry.id}
                        ref={(el) => {
                          itemRefs.current[idx] = el;
                        }}
                        data-testid={`showcase-card-${entry.code}`}
                        style={{
                          left: `${initial.xPercent}%`,
                          transform: `translate3d(-50%, ${initial.yCurvePx}px, 0) rotate(${initial.rotateDeg}deg) scale(${initial.scale})`,
                          opacity: initial.opacity,
                          pointerEvents: initial.isVisible ? 'auto' : 'none',
                          visibility: initial.isVisible ? 'visible' : 'hidden',
                          willChange: 'transform, left, opacity',
                        }}
                        className="absolute top-0 w-[154px] sm:w-[192px] lg:w-[214px]"
                      >
                        <HangingCreationCard
                          entry={entry}
                          isDarkMode={isDarkMode}
                          disableStaticTilt
                          onUnwrap={(selected) =>
                            triggerSmoothClose(() => onUnwrapShowcaseBouquet(selected))
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 3. MINIMAL BOTTOM CAROUSEL STEP CONTROLS */}
          <div className="w-full shrink-0 pb-4 sm:pb-6 px-4 z-30 flex flex-col items-center">
            {filteredEntries.length > 0 && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => scrollByStep(-1)}
                  aria-label="Glide carousel right (previous creation)"
                  data-testid="lace-carousel-prev"
                  className={`w-8 h-8 rounded-full border border-dashed flex items-center justify-center transition active:scale-95 cursor-pointer ${
                    isDarkMode
                      ? 'bg-[#352C29]/90 border-[#5E4E49] text-[#FBF6F1] hover:bg-[#433834]'
                      : 'bg-[#FFFDF9]/90 border-[#D8C4B4] text-[#4A382E] hover:bg-[#FAF3EB]'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div
                  className={`px-3.5 py-1 rounded-full border border-dashed text-xs tabular-nums ${
                    isDarkMode
                      ? 'bg-[#352C29]/85 border-[#574843] text-[#E5D6CE]'
                      : 'bg-[#FFFDF9]/90 border-[#DECBB9] text-[#5C4438]'
                  }`}
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                >
                  <span className="font-semibold">
                    {Math.min(filteredEntries.length, activeCarouselStep + 1)} / {filteredEntries.length}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => scrollByStep(1)}
                  aria-label="Glide carousel left (next creation)"
                  data-testid="lace-carousel-next"
                  className={`w-8 h-8 rounded-full border border-dashed flex items-center justify-center transition active:scale-95 cursor-pointer ${
                    isDarkMode
                      ? 'bg-[#352C29]/90 border-[#5E4E49] text-[#FBF6F1] hover:bg-[#433834]'
                      : 'bg-[#FFFDF9]/90 border-[#D8C4B4] text-[#4A382E] hover:bg-[#FAF3EB]'
                  }`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(pageContent, document.body);
  }
  return pageContent;
};
