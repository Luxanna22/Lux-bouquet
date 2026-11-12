import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Lenis from 'lenis';
import { ArrowLeft, Bookmark, ChevronLeft, ChevronRight, Moon, Search, Sun, X } from 'lucide-react';
import { BouquetStage } from './BouquetStage';
import { BrandLogoMark } from './BrandLogoMark';
import {
  buildCuratedShowcaseBouquets,
  buildSnapshotFromShowcaseEntry,
  computeSingleLaceCarouselItemTransform,
  convertVaultBouquetToShowcaseEntry,
  evaluateCatenaryCurveY,
  filterShowcaseBouquets,
  ShowcaseBouquetEntry,
} from '../lib/showcaseGallery';
import {
  fetchGlobalGarlandFeedFromFirestore,
  fetchSharedBouquetFromFirestore,
  getSavedVaultBouquets,
  SharedBouquetRecord,
} from '../lib/firebase';
import { SavedVaultBouquet } from '../types/bouquet';
import {
  decodeBouquetFromHash,
  hydrateSnapshotWithFirestoreRecord,
  localShortCodeCache,
} from '../lib/shareAndExport';
import {
  extractGarlandQueryParam,
  syncDocumentSeoMeta,
} from '../lib/seoMeta';

const DEFAULT_GARLAND_NAMES = new Set([
  '',
  'my dearest',
  'yours always',
  'someone special',
  'yours',
  'secret admirer',
]);

/**
 * Shared hook to merge user's locally saved/shared bouquets and the Firestore global Lace Garland feed
 * with the curated community showcase, deduplicating by short code (and collapsing older drafts),
 * hydrating full Firestore `shared_bouquets/{code}` records (including `payload` and `voiceAudioDataUrl`)
 * for 100% cross-device visual and audio consistency, and filtering out >30-day expired bouquets.
 */
export function useActiveShowcaseBouquets(vaultCount: number, nowMs: number) {
  const [hydratedRecords, setHydratedRecords] = useState<Record<string, SharedBouquetRecord>>({});
  const [remoteFeedEntries, setRemoteFeedEntries] = useState<SavedVaultBouquet[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;
    fetchGlobalGarlandFeedFromFirestore()
      .then((feed) => {
        if (!cancelled && Array.isArray(feed)) {
          setRemoteFeedEntries(feed);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [vaultCount]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;
    const combinedVault = [...getSavedVaultBouquets(), ...remoteFeedEntries];

    for (const v of combinedVault) {
      if (!v || v.isDraft || v.pinToShowcase === false || !v.code || v.code.startsWith('draft_')) {
        continue;
      }
      if (!hydratedRecords[v.code]) {
        fetchSharedBouquetFromFirestore(v.code)
          .then((record) => {
            if (cancelled || !record || !record.payload) return;
            localShortCodeCache.set(v.code, record.payload);
            try {
              localStorage.setItem(`bq_short_${v.code}`, record.payload);
            } catch {
              // Ignore localStorage quota errors
            }
            setHydratedRecords((prev) =>
              prev[v.code]?.payload === record.payload &&
              prev[v.code]?.voiceAudioDataUrl === record.voiceAudioDataUrl
                ? prev
                : { ...prev, [v.code]: record }
            );
          })
          .catch(() => {});
      }
    }

    return () => {
      cancelled = true;
    };
  }, [vaultCount, remoteFeedEntries, hydratedRecords]);

  return useMemo(() => {
    const curated = buildCuratedShowcaseBouquets(nowMs);
    if (typeof window === 'undefined') {
      return filterShowcaseBouquets(curated, { nowMs });
    }

    // Sort newest first so edited & re-shared bouquets always appear first with their latest state
    const combinedVault = [...getSavedVaultBouquets(), ...remoteFeedEntries].sort((a, b) => {
      const tA = Date.parse(a?.createdAt || '') || 0;
      const tB = Date.parse(b?.createdAt || '') || 0;
      return tB - tA;
    });
    const seenCodes = new Set<string>();
    const seenCustomRecipientSender = new Map<string, number>();
    const userEntries: ShowcaseBouquetEntry[] = [];

    for (let idx = 0; idx < combinedVault.length; idx++) {
      const v = combinedVault[idx];
      if (!v || v.isDraft || v.pinToShowcase === false || (v.code && v.code.startsWith('draft_'))) {
        continue;
      }
      if (v.code && seenCodes.has(v.code)) {
        continue;
      }

      const normTo = (v.to || v.recipientName || '').trim().toLowerCase();
      const normFrom = (v.from || v.senderName || '').trim().toLowerCase();
      const hasCustomNames = !DEFAULT_GARLAND_NAMES.has(normTo) || !DEFAULT_GARLAND_NAMES.has(normFrom);
      const recipientSenderKey = `${normTo}__${normFrom}`;
      const vTime = Date.parse(v.createdAt || '') || 0;

      // Only collapse rapid-fire re-shares for the exact same custom recipient/sender within 30 minutes
      if (hasCustomNames && seenCustomRecipientSender.has(recipientSenderKey)) {
        const newestTime = seenCustomRecipientSender.get(recipientSenderKey) || 0;
        if (Math.abs(newestTime - vTime) < 30 * 60 * 1000) {
          continue;
        }
      }
      if (v.code) seenCodes.add(v.code);
      if (hasCustomNames && !seenCustomRecipientSender.has(recipientSenderKey)) {
        seenCustomRecipientSender.set(recipientSenderKey, vTime);
      }

      const firestoreRecord = v.code ? hydratedRecords[v.code] : undefined;
      let decodedSnap = null;
      try {
        // Prefer the canonical Firestore record payload (which always has all photos & latest edits)
        // or the local cache / draftPayload
        const candidatePayloads = [
          firestoreRecord?.payload,
          v.code ? localShortCodeCache.get(v.code) : undefined,
          v.draftPayload,
          v.code ? localStorage.getItem(`bq_short_${v.code}`) : null,
          v.shareUrl,
        ].filter((p): p is string => Boolean(p && p.trim().length > 3));

        // Pick the richest payload (e.g. one with inline photos intact over a slimmed feed index payload)
        const bestPayload =
          candidatePayloads.sort((a, b) => b.length - a.length)[0] ||
          firestoreRecord?.payload ||
          '';

        if (bestPayload) {
          decodedSnap = decodeBouquetFromHash(bestPayload);
        }
        if (decodedSnap && firestoreRecord) {
          decodedSnap = hydrateSnapshotWithFirestoreRecord(decodedSnap, firestoreRecord);
        }
      } catch {
        // Ignore decode errors
      }
      userEntries.push(convertVaultBouquetToShowcaseEntry(v, decodedSnap, userEntries.length));
      if (userEntries.length >= 16) break;
    }

    const userCodes = new Set<string>(userEntries.map((u) => u.code));
    const merged = [...userEntries, ...curated.filter((c) => !userCodes.has(c.code))];
    return filterShowcaseBouquets(merged, { nowMs });
  }, [nowMs, vaultCount, remoteFeedEntries, hydratedRecords]);
}

/**
 * 100% Exact Studio & Recipient BouquetStage SVG Renderer for Shared Creations Cards.
 * Renders the exact BouquetSnapshot (wrapper, ribbon, flowers, photocards, on-stage voice keepsake,
 * and on-stage wax-sealed letter envelope) so the card preview matches the unwrapped bouquet 1:1.
 */
export const ShowcaseBouquetIllustrationSVG: React.FC<{
  entry: ShowcaseBouquetEntry;
  isDarkMode?: boolean;
}> = React.memo(({ entry, isDarkMode = false }) => {
  const snapshot = useMemo(() => buildSnapshotFromShowcaseEntry(entry), [entry]);
  const safeIdPrefix = useMemo(
    () => `card-${entry.id.replace(/[^a-zA-Z0-9_-]/g, '')}-`,
    [entry.id]
  );

  return (
    <div className="w-full h-full flex items-center justify-center pointer-events-none select-none">
      <BouquetStage
        isPreviewMode={true}
        isDarkMode={isDarkMode}
        snapshotOverride={snapshot}
        instanceIdPrefix={safeIdPrefix}
        isCardThumbnail={true}
      />
    </div>
  );
});

/**
 * Miniature Botanical Lace Clothespin + Vertical Braided Cord suspending each PNG-style bouquet keepsake from the Catenary Lace Line.
 */
export const LaceHangerClipSVG: React.FC<{
  stringLengthPx: number;
  isDarkMode: boolean;
  accentColor: string;
}> = React.memo(({ isDarkMode, accentColor }) => {
  const cordColor = isDarkMode ? '#A38B7E' : '#B48E78';
  const laceStroke = isDarkMode ? '#D8C2B5' : '#C9AE9B';
  const brassBody = isDarkMode ? '#D4A373' : '#C89666';
  const brassHighlight = isDarkMode ? '#FDE68A' : '#FEF3C7';

  // Uniform braided cord drop so cards at symmetric catenary positions hang at identical heights
  const dropCordPx = 10;

  return (
    <div
      className="w-full flex flex-col items-center select-none pointer-events-none -mb-1.5 z-10"
      aria-hidden="true"
    >
      <svg
        width="44"
        height={dropCordPx + 16}
        viewBox={`0 -4 44 ${dropCordPx + 16}`}
        className="overflow-visible"
      >
        {/* Vertical Braided Lace Thread Dropping Down from the Overhead Catenary Lace Line */}
        <line
          x1="22"
          y1="-2"
          x2="22"
          y2={dropCordPx + 5}
          stroke={cordColor}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <line
          x1="22"
          y1="-2"
          x2="22"
          y2={dropCordPx + 5}
          stroke={laceStroke}
          strokeWidth="1.1"
          strokeDasharray="2 2"
          strokeLinecap="round"
        />

        {/* Top Knot Tied Directly onto the Overhead Lace Cord */}
        <circle cx="22" cy="-1" r="3" fill={cordColor} />
        <circle cx="22" cy="-1" r="1.3" fill={brassHighlight} />

        {/* Delicate Scalloped Lace Bow & Florist Clasp at the Card Rim */}
        <g transform={`translate(22, ${dropCordPx + 4})`}>
          <path
            d="M 0,0 C -9,-6 -13,2 -1.5,1.5 M 0,0 C 9,-6 13,2 1.5,1.5"
            fill="none"
            stroke={accentColor}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M -1.2,1.5 Q -4.5,6 -6.5,9.5 M 1.2,1.5 Q 4.5,6 6.5,9.5"
            fill="none"
            stroke={accentColor}
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          {/* Sculpted Brass / Wooden Florist Clothespin */}
          <rect
            x="-3.5"
            y="-3.5"
            width="7"
            height="11.5"
            rx="2.4"
            fill={brassBody}
            stroke={cordColor}
            strokeWidth="0.9"
          />
          <line x1="-2.2" y1="1" x2="2.2" y2="1" stroke={brassHighlight} strokeWidth="0.9" />
          {/* Punched Card Eyelet Ring */}
          <circle
            cx="0"
            cy="7.5"
            r="2.2"
            fill={isDarkMode ? '#2B2321' : '#FDF9F5'}
            stroke={cordColor}
            strokeWidth="1"
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
        className={`w-full aspect-[12/15.8] sm:aspect-[12/15.6] rounded-[20px] sm:rounded-[24px] border border-dashed p-1.5 sm:p-2 relative flex flex-col items-stretch justify-between overflow-hidden transition-transform duration-300 ease-out group-hover:rotate-0 group-hover:-translate-y-1 cursor-pointer focus:outline-none ${
          isDarkMode
            ? 'bg-[#28211F] border-[#5C4B45] group-hover:border-[#856D64] shadow-[0_10px_24px_rgba(15,11,9,0.28)]'
            : 'bg-[#F7F1E8] border-[#D8C5B4] group-hover:border-[#B99B84] shadow-[0_10px_22px_rgba(122,75,58,0.06)]'
        }`}
      >
        {/* Bouquet + Envelope + Voice Keepsake Asset SVG (Uncropped Full Creation Window — 100% Edge-to-Edge Fill) */}
        <div
          className={`w-full flex-1 min-h-0 rounded-[14px] sm:rounded-[18px] overflow-hidden relative border p-0 ${
            isDarkMode
              ? 'border-[#4A3C37]/85 bg-[#221B19]'
              : 'border-[#E5D5C5]/80 bg-[#FDF9F5]'
          }`}
        >
          <div className="w-full h-full">
            <ShowcaseBouquetIllustrationSVG entry={entry} isDarkMode={isDarkMode} />
          </div>
        </div>

        {/* High-Contrast 2-Line Editorial Dedication Plate at Base of Portrait Card */}
        <div
          className={`pointer-events-none mt-1.5 py-1 sm:py-1.5 px-2 sm:px-2.5 rounded-[12px] sm:rounded-[14px] text-center shrink-0 transition-all duration-300 border border-dashed ${
            isDarkMode
              ? 'bg-[#221B18] border-[#5A4943] text-[#FBF6F1]'
              : 'bg-[#FFFDF9] border-[#D8C4B2] text-[#1F1713] shadow-2xs'
          }`}
          style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
        >
          <div className="text-[14.5px] sm:text-[16px] lg:text-[17px] leading-[1.12] tracking-[-0.01em] truncate">
            <span
              className={`italic font-medium ${
                isDarkMode ? 'text-[#E6B89C]' : 'text-[#8A4B38]'
              }`}
            >
              For{' '}
            </span>
            <span className="font-bold">{entry.to}</span>
          </div>
          <div className="text-[12px] sm:text-[13px] lg:text-[13.5px] leading-[1.15] truncate mt-0.5">
            <span
              className={`italic ${
                isDarkMode ? 'text-[#C8B6AC]' : 'text-[#6E584D]'
              }`}
            >
              from{' '}
            </span>
            <span
              className={`font-semibold ${
                isDarkMode ? 'text-[#F2E6DE]' : 'text-[#3B2D26]'
              }`}
            >
              {entry.from}
            </span>
          </div>
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
}> = React.memo(({ isDarkMode, edgeY = 10, midY = 64 }) => {
  const controlY = 2 * midY - edgeY;
  const viewHeight = midY + 24;

  return (
    <svg
      viewBox={`0 0 1440 ${viewHeight}`}
      preserveAspectRatio="none"
      style={{ height: `${viewHeight}px` }}
      className="w-full overflow-visible pointer-events-none select-none"
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
    () =>
      visibleSlots === 2
        ? Math.max(0, previewEntries.length - visibleSlots)
        : Math.max(0.5, previewEntries.length - visibleSlots + 0.35),
    [previewEntries.length, visibleSlots]
  );

  const edgeY = 6;
  const midY = visibleSlots === 2 ? 32 : visibleSlots === 3 ? 60 : 82;

  const updateGarlandDOM = useCallback(() => {
    const count = previewEntries.length;
    const rawTotal = scrollDrivenOffsetRef.current + manualOffsetRef.current;
    // Wrap smoothly within [0, maxOffset] so both scroll and manual step/swipe cycle all creations right-to-left
    const combinedOffset = Math.max(0, Math.min(maxOffset, rawTotal));
    const trackWidth = sectionRef.current?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 0);

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
      if (!state.isVisible) {
        if (el.dataset.hidden !== '1') {
          el.dataset.hidden = '1';
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
          el.style.visibility = 'hidden';
        }
        continue;
      }
      el.dataset.hidden = '0';
      el.style.visibility = 'visible';
      el.style.pointerEvents = 'auto';
      if (trackWidth > 0) {
        if (el.style.left !== '0px') el.style.left = '0px';
        const xPx = (state.xPercent / 100) * trackWidth;
        el.style.transform = `translate3d(calc(${xPx.toFixed(1)}px - 50%), ${state.yCurvePx.toFixed(1)}px, 0) rotate(${state.rotateDeg}deg) scale(${state.scale})`;
      } else {
        el.style.left = `${state.xPercent}%`;
        el.style.transform = `translate3d(-50%, ${state.yCurvePx}px, 0) rotate(${state.rotateDeg}deg) scale(${state.scale})`;
      }
      el.style.opacity = String(state.opacity);
    }
  }, [previewEntries, visibleSlots, maxOffset, edgeY, midY]);

  useEffect(() => {
    const wrapper = scrollContainerRef.current;
    let rafId = 0;
    let cachedSectionTop = 0;
    let cachedSectionHeight = 420;
    let cachedVh = typeof window !== 'undefined' ? window.innerHeight || 800 : 800;

    const measureSectionMetrics = () => {
      const sectionEl = sectionRef.current;
      if (sectionEl) {
        cachedSectionTop = sectionEl.offsetTop;
        cachedSectionHeight = sectionEl.offsetHeight || 420;
      }
      if (typeof window !== 'undefined') {
        cachedVh = window.innerHeight || 800;
      }
    };

    const applyGarlandScroll = () => {
      rafId = 0;
      // On 2-slot mobile, keep scrollDrivenOffset at 0 so 2 full portrait cards always frame cleanly side-by-side without edge clipping
      if (visibleSlots === 2) {
        scrollDrivenOffsetRef.current = 0;
        updateGarlandDOM();
        return;
      }
      if (wrapper && sectionRef.current) {
        if (cachedSectionTop === 0) measureSectionMetrics();
        const scrollTop = wrapper.scrollTop;
        const rectTop = cachedSectionTop - scrollTop;
        const rectBottom = rectTop + cachedSectionHeight;
        // Skip DOM updates when the section is completely outside the viewport
        if (rectBottom < -120 || rectTop > cachedVh + 120) {
          return;
        }
        // Progress from 0 when section enters bottom of viewport to 1 as it scrolls past upper viewport
        const progress = Math.max(
          0,
          Math.min(1, (cachedVh * 0.85 - rectTop) / (cachedVh * 0.95 + cachedSectionHeight * 0.5))
        );
        scrollDrivenOffsetRef.current = progress * Math.min(maxOffset, 2.4);
      }
      updateGarlandDOM();
    };

    const scheduleGarlandScroll = () => {
      if (rafId !== 0) return;
      rafId = requestAnimationFrame(applyGarlandScroll);
    };

    const onResize = () => {
      measureSectionMetrics();
      scheduleGarlandScroll();
    };

    measureSectionMetrics();
    applyGarlandScroll();

    if (!wrapper) return;
    wrapper.addEventListener('scroll', scheduleGarlandScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      if (rafId !== 0) cancelAnimationFrame(rafId);
      wrapper.removeEventListener('scroll', scheduleGarlandScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [scrollContainerRef, maxOffset, visibleSlots, updateGarlandDOM]);

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
      className="scroll-mt-24 relative w-full pt-5 sm:pt-8 pb-8 sm:pb-14 overflow-hidden select-none"
    >
      <div className="fluid-scroll-item text-center mb-1.5 sm:mb-3 px-4">
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
        className="relative w-full h-[328px] sm:h-[404px] lg:h-[456px] touch-pan-y"
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
          if (visibleSlots === 2) {
            manualOffsetRef.current = Math.max(
              0,
              Math.min(maxOffset, Math.round(manualOffsetRef.current))
            );
            updateGarlandDOM();
          }
        }}
        onPointerCancel={() => {
          dragStartXRef.current = null;
          if (visibleSlots === 2) {
            manualOffsetRef.current = Math.max(
              0,
              Math.min(maxOffset, Math.round(manualOffsetRef.current))
            );
            updateGarlandDOM();
          }
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
                data-hidden={initial.isVisible ? '0' : '1'}
                style={{
                  left: `${initial.xPercent}%`,
                  transform: `translate3d(-50%, ${initial.yCurvePx}px, 0) rotate(${initial.rotateDeg}deg) scale(${initial.scale})`,
                  opacity: initial.opacity,
                  pointerEvents: initial.isVisible ? 'auto' : 'none',
                  visibility: initial.isVisible ? 'visible' : 'hidden',
                  willChange: 'transform, opacity',
                  contain: 'layout style paint',
                }}
                className="absolute top-0 w-[166px] min-[380px]:w-[176px] sm:w-[208px] lg:w-[228px]"
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

      {/* STEP CONTROLS + EXPLORE ALL CREATIONS CTA BELOW THE GARLAND */}
      <div className="fluid-scroll-item text-center px-4 mt-3 sm:mt-6 pt-1 flex items-center justify-center gap-2.5 sm:gap-3">
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
  const [searchQuery, setSearchQuery] = useState(() => extractGarlandQueryParam());
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    syncDocumentSeoMeta({ mode: 'garland' });
    return () => {
      syncDocumentSeoMeta({ mode: 'landing' });
    };
  }, []);
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

  const totalMobilePages = useMemo(
    () => Math.max(1, Math.ceil(filteredEntries.length / 4)),
    [filteredEntries.length]
  );

  // Maximum carousel offset in item/page units so scrolling moves every creation across the lace garland
  const maxCarouselOffset = useMemo(() => {
    if (filteredEntries.length <= 1) return 0;
    if (visibleSlots === 2) {
      return Math.max(0, totalMobilePages - 1);
    }
    if (filteredEntries.length <= visibleSlots) {
      return Math.max(0.65, filteredEntries.length - 1);
    }
    return filteredEntries.length - visibleSlots + 0.45;
  }, [filteredEntries.length, visibleSlots, totalMobilePages]);

  const scrollPerItemPx = 300;
  const totalScrollRangePx = Math.max(320, Math.round(maxCarouselOffset * scrollPerItemPx));

  const edgeY = 6;
  const midY = visibleSlots === 2 ? 26 : visibleSlots === 3 ? 48 : 66;

  const applySingleLaceTransforms = useCallback(
    (scrollTopPx: number) => {
      const progress =
        totalScrollRangePx > 0
          ? Math.max(0, Math.min(1, scrollTopPx / totalScrollRangePx))
          : 0;
      const scrollOffset = progress * maxCarouselOffset;
      currentOffsetRef.current = scrollOffset;

      const maxSteps =
        visibleSlots === 2
          ? Math.max(0, totalMobilePages - 1)
          : Math.max(0, filteredEntries.length - 1);
      const nextStep = Math.min(maxSteps, Math.round(scrollOffset));
      setActiveCarouselStep((prev) => (prev === nextStep ? prev : nextStep));

      if (visibleSlots === 2) {
        return;
      }

      const trackWidth =
        pageScrollWrapperRef.current?.clientWidth ||
        (typeof window !== 'undefined' ? window.innerWidth : 0);

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
        if (!state.isVisible) {
          if (el.dataset.hidden !== '1') {
            el.dataset.hidden = '1';
            el.style.opacity = '0';
            el.style.pointerEvents = 'none';
            el.style.visibility = 'hidden';
          }
          continue;
        }
        el.dataset.hidden = '0';
        el.style.visibility = 'visible';
        el.style.pointerEvents = 'auto';
        if (trackWidth > 0) {
          if (el.style.left !== '0px') el.style.left = '0px';
          const xPx = (state.xPercent / 100) * trackWidth;
          el.style.transform = `translate3d(calc(${xPx.toFixed(1)}px - 50%), ${state.yCurvePx.toFixed(1)}px, 0) rotate(${state.rotateDeg}deg) scale(${state.scale})`;
        } else {
          el.style.left = `${state.xPercent}%`;
          el.style.transform = `translate3d(-50%, ${state.yCurvePx}px, 0) rotate(${state.rotateDeg}deg) scale(${state.scale})`;
        }
        el.style.opacity = String(state.opacity);
      }
    },
    [filteredEntries, maxCarouselOffset, totalScrollRangePx, visibleSlots, totalMobilePages, edgeY, midY]
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
      lerp: 0.095,
      duration: 1.05,
      smoothWheel: true,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.4,
    });
    lenisRef.current = lenis;

    lenis.on('scroll', (e: { scroll: number }) => {
      applySingleLaceTransforms(e.scroll);
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
    if (visibleSlots === 2) {
      const nextStep = Math.max(0, Math.min(totalMobilePages - 1, activeCarouselStep + deltaSteps));
      setActiveCarouselStep(nextStep);
      currentOffsetRef.current = nextStep;
      const wrapper = pageScrollWrapperRef.current;
      if (wrapper && maxCarouselOffset > 0) {
        const targetScrollTop = (nextStep / maxCarouselOffset) * totalScrollRangePx;
        if (lenisRef.current) {
          lenisRef.current.scrollTo(targetScrollTop, { immediate: true });
        } else {
          wrapper.scrollTo({ top: targetScrollTop, behavior: 'instant' as ScrollBehavior });
        }
      }
      return;
    }

    const wrapper = pageScrollWrapperRef.current;
    if (!wrapper) return;
    const targetOffset = Math.max(
      0,
      Math.min(maxCarouselOffset, Math.round(currentOffsetRef.current + deltaSteps))
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

  const mobilePageSlice = useMemo(() => {
    const start = activeCarouselStep * 4;
    return filteredEntries.slice(start, start + 4);
  }, [filteredEntries, activeCarouselStep]);

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
        {/* SINGLE-SCREEN LOCKED STAGE (100dvh) */}
        <div
          data-testid="single-screen-lace-stage"
          className="sticky top-0 h-dvh w-full overflow-hidden flex flex-col justify-between sm:justify-start select-none"
        >
          {/* 1. FLOATING PILL NAVBAR (Consistent with Landing & Studio Header) + COMPACT EDITORIAL TITLE & SEARCH */}
          <div className="w-full shrink-0 z-30">
            <header className="w-full max-w-5xl mx-auto px-2.5 sm:px-6 pt-2 sm:pt-3">
              <div
                className={`h-11 sm:h-12 px-2.5 sm:px-4 rounded-full border border-dashed shadow-[0_6px_24px_rgba(35,28,24,0.05)] flex items-center justify-between gap-2 transition-colors ${
                  isDarkMode
                    ? 'bg-[#352C29]/95 border-[#574843] text-[#FBF6F1]'
                    : 'bg-[#FFFDF9]/95 border-[#DECBB9] text-[#231C18]'
                }`}
              >
                {/* Left: Back to Home + Brand */}
                <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => triggerSmoothClose(onBackToHome)}
                    data-testid="creations-back-home-btn"
                    className={`h-8 sm:h-8.5 px-3 sm:px-3.5 rounded-full border border-dashed text-xs font-medium inline-flex items-center gap-1.5 transition active:scale-95 cursor-pointer shrink-0 ${
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
                    className="flex items-center gap-1.5 sm:gap-2 cursor-pointer hover:opacity-85 transition"
                  >
                    <BrandLogoMark className="w-5.5 h-5.5 sm:w-6 sm:h-6 shrink-0" isDarkMode={isDarkMode} />
                    <span
                      className="hidden sm:inline text-lg sm:text-xl font-semibold tracking-tight whitespace-nowrap"
                      style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                    >
                      Send A Bouquet
                    </span>
                  </button>
                </div>

                {/* Right: Theme Toggle, Compact Saved Bouquets Pill & Craft CTA (Never wraps on mobile) */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={onToggleDarkMode}
                    aria-label="Toggle theme"
                    className={`w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full border border-dashed flex items-center justify-center transition-colors active:scale-95 cursor-pointer shrink-0 ${
                      isDarkMode
                        ? 'bg-[#423734]/70 border-[#66554F] text-[#E6B89C] hover:bg-[#4D403C]'
                        : 'bg-[#FAF4EE]/85 border-[#DECBB9] text-[#5C4438] hover:bg-[#F3E9DF]'
                    }`}
                  >
                    {isDarkMode ? (
                      <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300" />
                    ) : (
                      <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerSmoothClose(onOpenVault)}
                    aria-label="Saved Bouquets"
                    title="Saved Bouquets"
                    className={`inline-flex h-8 sm:h-8.5 px-2.5 sm:px-3.5 rounded-full border border-dashed text-xs font-medium items-center gap-1.5 transition active:scale-95 cursor-pointer shrink-0 whitespace-nowrap ${
                      isDarkMode
                        ? 'bg-[#423734] border-[#66554F] text-[#FBF6F1] hover:bg-[#4D403C]'
                        : 'bg-[#FAF4EE] border-[#D8C4B4] text-[#5C4438] hover:bg-[#F3E9DF]'
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5 text-[#B4846C] shrink-0" />
                    <span className="hidden md:inline">Saved Bouquets</span>
                    {vaultCount > 0 && (
                      <span
                        className={`text-[11px] font-semibold tabular-nums ${
                          isDarkMode ? 'text-[#F0C8B0]' : 'text-[#7A4B3A]'
                        }`}
                      >
                        {vaultCount}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerSmoothClose(onStartCrafting)}
                    className={`h-8 sm:h-8.5 px-3.5 sm:px-4 rounded-full text-white text-xs font-medium inline-flex items-center justify-center transition active:scale-95 cursor-pointer shrink-0 whitespace-nowrap ${
                      isDarkMode
                        ? 'bg-[#9A6550] hover:bg-[#875642]'
                        : 'bg-[#7A4B3A] hover:bg-[#633B2C]'
                    }`}
                  >
                    Craft a Bouquet
                  </button>
                </div>
              </div>
            </header>

            {/* Compact Editorial Title + Unified "For / From" Search Input */}
            <div className="max-w-xl mx-auto px-3 pt-1.5 sm:pt-3 text-center">
              <h1
                className={`text-[22px] sm:text-3xl lg:text-[34px] font-semibold tracking-tight leading-none ${
                  isDarkMode ? 'text-[#FBF6F1]' : 'text-[#1F1815]'
                }`}
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                On the <span className="italic font-normal">Lace Garland</span>
              </h1>

              <label
                className={`mt-1.5 sm:mt-2 max-w-md mx-auto rounded-full border border-dashed px-3.5 sm:px-4 py-1 sm:py-2 flex items-center gap-2 transition-colors shadow-[0_6px_22px_rgba(122,75,58,0.04)] cursor-text ${
                  isDarkMode
                    ? 'bg-[#352C29]/95 border-[#574843] focus-within:border-[#8A7267]'
                    : 'bg-[#FFFDF9]/95 border-[#DECBB9] focus-within:border-[#B5967E]'
                }`}
              >
                <Search
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${
                    isDarkMode ? 'text-[#C8B2A6]' : 'text-[#9A8274]'
                  }`}
                />
                <span
                  className={`text-[13.5px] sm:text-[15px] italic font-medium shrink-0 select-none ${
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
                  className={`w-full min-w-0 bg-transparent text-[13px] sm:text-sm focus:outline-none ${
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

          {/* 2. MIDDLE: HANGING LACE GARLAND STAGE (2 Draped Lace Rows of 2 Cards on Mobile = 4 Cards/Screen; 1 Sweeping Lace Line of 4 Cards on Desktop) */}
          <div
            className="relative flex-1 min-h-0 w-full flex flex-col items-center justify-between sm:justify-start pt-1 sm:pt-2 pb-2 sm:pb-0 overflow-x-hidden overflow-y-visible"
            onPointerDown={(e) => {
              if ((e.target as HTMLElement).closest('button, input, label')) return;
              dragStartXRef.current = e.clientX;
              dragStartScrollRef.current = pageScrollWrapperRef.current?.scrollTop || 0;
            }}
            onPointerMove={(e) => {
              if (dragStartXRef.current === null || visibleSlots === 2 || !pageScrollWrapperRef.current) return;
              const deltaX = dragStartXRef.current - e.clientX;
              const nextTop = Math.max(
                0,
                Math.min(totalScrollRangePx, dragStartScrollRef.current + deltaX * 1.6)
              );
              if (lenisRef.current) {
                lenisRef.current.scrollTo(nextTop, { immediate: false });
              } else {
                pageScrollWrapperRef.current.scrollTop = nextTop;
                applySingleLaceTransforms(nextTop);
              }
            }}
            onPointerUp={(e) => {
              if (dragStartXRef.current !== null && visibleSlots === 2) {
                const deltaX = dragStartXRef.current - e.clientX;
                if (Math.abs(deltaX) > 36) {
                  scrollByStep(deltaX > 0 ? 1 : -1);
                }
              }
              dragStartXRef.current = null;
            }}
            onPointerCancel={() => {
              dragStartXRef.current = null;
            }}
          >
            {filteredEntries.length === 0 ? (
              <div
                data-testid="showcase-empty-state"
                className={`max-w-sm mx-auto mt-8 rounded-[24px] border border-dashed py-9 px-6 text-center ${
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
            ) : visibleSlots === 2 ? (
              <>
                {/* MOBILE 2-TIER DRAPED CATENARY LACE GARLAND (4 Bouquets Per Screen — Zero Wasted Viewport Space) */}
                <div
                  data-testid="single-lace-carousel-track"
                  className="w-full flex-1 min-h-0 flex flex-col justify-evenly gap-1"
                >
                  {[mobilePageSlice.slice(0, 2), mobilePageSlice.slice(2, 4)]
                    .filter((rowEntries) => rowEntries.length > 0)
                    .map((rowEntries, rowIdx) => (
                      <div
                        key={`mobile-lace-row-${rowIdx}-${activeCarouselStep}`}
                        className="relative w-full h-[246px] min-[390px]:h-[260px] shrink-0"
                      >
                        <div className="absolute top-0 inset-x-0 z-0">
                          <SweepingCatenaryLaceLineSVG
                            isDarkMode={isDarkMode}
                            edgeY={5}
                            midY={22}
                          />
                        </div>
                        <div className="absolute inset-0 z-10">
                          {rowEntries.map((entry, colIdx) => {
                            const isSingleInRow = rowEntries.length === 1;
                            const u = isSingleInRow ? 0.5 : colIdx === 0 ? 0.255 : 0.745;
                            const yCurvePx = evaluateCatenaryCurveY(u, 5, 22);
                            const rotateDeg = isSingleInRow ? 0 : colIdx === 0 ? 0.75 : -0.75;
                            return (
                              <div
                                key={entry.id}
                                data-testid={`showcase-card-${entry.code}`}
                                style={{
                                  left: `${(u * 100).toFixed(1)}%`,
                                  transform: `translate3d(-50%, ${yCurvePx.toFixed(1)}px, 0) rotate(${rotateDeg}deg)`,
                                }}
                                className="absolute top-0 w-[154px] min-[380px]:w-[164px] transition-all duration-300"
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
                    ))}
                </div>

                {/* MOBILE PAGE CONTROLS */}
                <div className="w-full shrink-0 pt-1 pb-1.5 px-4 z-30 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => scrollByStep(-1)}
                    aria-label="Glide carousel right (previous creation)"
                    data-testid="lace-carousel-prev"
                    className={`w-9 h-9 rounded-full border border-dashed flex items-center justify-center transition active:scale-95 cursor-pointer shadow-2xs ${
                      isDarkMode
                        ? 'bg-[#352C29]/95 border-[#5E4E49] text-[#FBF6F1] hover:bg-[#433834]'
                        : 'bg-[#FFFDF9]/95 border-[#D8C4B4] text-[#4A382E] hover:bg-[#FAF3EB]'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div
                    className={`px-4 py-1.5 rounded-full border border-dashed text-xs tabular-nums shadow-2xs ${
                      isDarkMode
                        ? 'bg-[#352C29]/90 border-[#574843] text-[#E5D6CE]'
                        : 'bg-[#FFFDF9]/95 border-[#DECBB9] text-[#5C4438]'
                    }`}
                    style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                  >
                    <span className="font-semibold">
                      {Math.min(totalMobilePages, activeCarouselStep + 1)} / {totalMobilePages}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => scrollByStep(1)}
                    aria-label="Glide carousel left (next creation)"
                    data-testid="lace-carousel-next"
                    className={`w-9 h-9 rounded-full border border-dashed flex items-center justify-center transition active:scale-95 cursor-pointer shadow-2xs ${
                      isDarkMode
                        ? 'bg-[#352C29]/95 border-[#5E4E49] text-[#FBF6F1] hover:bg-[#433834]'
                        : 'bg-[#FFFDF9]/95 border-[#D8C4B4] text-[#4A382E] hover:bg-[#FAF3EB]'
                    }`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <div
                  data-testid="single-lace-carousel-track"
                  className="relative w-full h-[364px] lg:h-[420px] shrink-0"
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
                          data-hidden={initial.isVisible ? '0' : '1'}
                          style={{
                            left: `${initial.xPercent}%`,
                            transform: `translate3d(-50%, ${initial.yCurvePx}px, 0) rotate(${initial.rotateDeg}deg) scale(${initial.scale})`,
                            opacity: initial.opacity,
                            pointerEvents: initial.isVisible ? 'auto' : 'none',
                            visibility: initial.isVisible ? 'visible' : 'hidden',
                            willChange: 'transform, opacity',
                            contain: 'layout style paint',
                          }}
                          className="absolute top-0 w-[clamp(172px,23.5vh,214px)] lg:w-[clamp(182px,25vh,228px)]"
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

                {/* 3. CAROUSEL STEP CONTROLS — Positioned Directly Under the Hanging Cards (Never Stranded at Bottom Edge) */}
                <div className="w-full shrink-0 mt-4 pb-2 px-4 z-30 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => scrollByStep(-1)}
                    aria-label="Glide carousel right (previous creation)"
                    data-testid="lace-carousel-prev"
                    className={`w-9.5 h-9.5 rounded-full border border-dashed flex items-center justify-center transition active:scale-95 cursor-pointer shadow-2xs ${
                      isDarkMode
                        ? 'bg-[#352C29]/95 border-[#5E4E49] text-[#FBF6F1] hover:bg-[#433834]'
                        : 'bg-[#FFFDF9]/95 border-[#D8C4B4] text-[#4A382E] hover:bg-[#FAF3EB]'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div
                    className={`px-4 py-1.5 rounded-full border border-dashed text-[13px] tabular-nums shadow-2xs ${
                      isDarkMode
                        ? 'bg-[#352C29]/90 border-[#574843] text-[#E5D6CE]'
                        : 'bg-[#FFFDF9]/95 border-[#DECBB9] text-[#5C4438]'
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
                    className={`w-9.5 h-9.5 rounded-full border border-dashed flex items-center justify-center transition active:scale-95 cursor-pointer shadow-2xs ${
                      isDarkMode
                        ? 'bg-[#352C29]/95 border-[#5E4E49] text-[#FBF6F1] hover:bg-[#433834]'
                        : 'bg-[#FFFDF9]/95 border-[#D8C4B4] text-[#4A382E] hover:bg-[#FAF3EB]'
                    }`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </>
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
