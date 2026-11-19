import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Lenis from 'lenis';
import { ArrowLeft, Bookmark, ChevronLeft, ChevronRight, Moon, Search, Sun, X } from 'lucide-react';
import { BouquetStage } from './BouquetStage';
import { BrandLogoMark } from './BrandLogoMark';
import {
  buildCuratedShowcaseBouquets,
  buildSnapshotFromShowcaseEntry,
  computeMountedGarlandRange,
  computeSingleLaceCarouselItemTransform,
  convertVaultBouquetToShowcaseEntry,
  evaluateCatenaryCurveY,
  filterEligiblePublicGarlandEntries,
  filterShowcaseBouquets,
  getShowcaseFrameTier,
  isEligibleGarlandFeedEntry,
  ShowcaseBouquetEntry,
  ShowcaseFrameTier,
} from '../lib/showcaseGallery';
import { createOnDemandLenisDriver } from '../lib/dofParallax';
import {
  fetchGlobalGarlandFeedFromFirestore,
  fetchSharedBouquetFromFirestore,
  SharedBouquetRecord,
  subscribeToGlobalGarlandFeed,
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

/**
 * Shared hook to merge user's locally saved/shared bouquets and the Firestore global Lace Garland feed
 * with the curated community showcase, deduplicating by short code (and collapsing older drafts),
 * hydrating full Firestore `shared_bouquets/{code}` records (including `payload` and `voiceAudioDataUrl`)
 * for 100% cross-device visual and audio consistency, and filtering out >30-day expired bouquets.
 */
export function useActiveShowcaseBouquets(vaultCount: number, nowMs: number) {
  const [hydratedRecords, setHydratedRecords] = useState<Record<string, SharedBouquetRecord>>({});
  const [remoteFeedEntries, setRemoteFeedEntries] = useState<SavedVaultBouquet[]>([]);
  const hydratedCodesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;

    const refreshFeed = () => {
      fetchGlobalGarlandFeedFromFirestore()
        .then((feed) => {
          if (!cancelled && Array.isArray(feed)) {
            setRemoteFeedEntries(feed);
          }
        })
        .catch(() => {});
    };

    refreshFeed();
    const unsubscribe = subscribeToGlobalGarlandFeed((feed) => {
      if (!cancelled && Array.isArray(feed)) {
        setRemoteFeedEntries(feed);
      }
    });

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        refreshFeed();
      }
    };
    window.addEventListener('focus', refreshFeed);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      cancelled = true;
      unsubscribe();
      window.removeEventListener('focus', refreshFeed);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [vaultCount]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;
    const eligibleFeed = filterEligiblePublicGarlandEntries(remoteFeedEntries);
    const missingEntries = eligibleFeed.filter(
      (v) => v.code && !hydratedCodesRef.current.has(v.code)
    );
    if (missingEntries.length === 0) return;

    missingEntries.forEach((v) => hydratedCodesRef.current.add(v.code));

    Promise.allSettled(
      missingEntries.map(async (v) => {
        const record = await fetchSharedBouquetFromFirestore(v.code);
        return { code: v.code, record };
      })
    ).then((results) => {
      if (cancelled) return;
      const batch: Record<string, SharedBouquetRecord> = {};
      let hasAdditions = false;
      for (const res of results) {
        if (res.status !== 'fulfilled') continue;
        const { code, record } = res.value;
        if (!record || !record.payload) {
          hydratedCodesRef.current.delete(code);
          continue;
        }
        localShortCodeCache.set(code, record.payload);
        try {
          localStorage.setItem(`bq_short_${code}`, record.payload);
        } catch {
          // Ignore localStorage quota errors
        }
        batch[code] = record;
        hasAdditions = true;
      }
      if (hasAdditions) {
        setHydratedRecords((prev) => ({ ...prev, ...batch }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [vaultCount, remoteFeedEntries]);

  return useMemo(() => {
    const curated = buildCuratedShowcaseBouquets(nowMs);
    if (typeof window === 'undefined') {
      return filterShowcaseBouquets(curated, { nowMs });
    }

    // Strictly render ONLY creations explicitly published and pinned to the global Garland feed
    // (`sab_garland_feed_v1`) — never merge private or unshared local device drafts/saves.
    const eligibleFeed = filterEligiblePublicGarlandEntries(remoteFeedEntries);
    const seenCodes = new Set<string>();
    const userEntries: ShowcaseBouquetEntry[] = [];

    for (let idx = 0; idx < eligibleFeed.length; idx++) {
      const v = eligibleFeed[idx];
      if (!isEligibleGarlandFeedEntry(v)) {
        continue;
      }
      if (seenCodes.has(v.code)) {
        continue;
      }
      seenCodes.add(v.code);

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
      userEntries.push(
        convertVaultBouquetToShowcaseEntry(
          firestoreRecord
            ? {
                ...v,
                isPremium: Boolean(v.isPremium || firestoreRecord.isPremium),
                retentionDays:
                  Math.max(v.retentionDays ?? 0, firestoreRecord.retentionDays ?? 0) ||
                  undefined,
              }
            : v,
          decodedSnap,
          userEntries.length
        )
      );
      if (userEntries.length >= 200) break;
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
  frameTier?: ShowcaseFrameTier;
}> = React.memo(({ isDarkMode, accentColor, frameTier = 'standard' }) => {
  const isSpecial = frameTier !== 'standard';
  const isEternal = frameTier === 'eternal';
  const cordColor = isSpecial
    ? isDarkMode
      ? '#CBD5E1'
      : '#8E9BAE'
    : isDarkMode
    ? '#A38B7E'
    : '#B48E78';
  const laceStroke = isSpecial
    ? isDarkMode
      ? '#F1F5F9'
      : '#E2E8F0'
    : isDarkMode
    ? '#D8C2B5'
    : '#C9AE9B';
  const brassBody = isSpecial
    ? isDarkMode
      ? '#DCE4EE'
      : '#BCC7D6'
    : isDarkMode
    ? '#D4A373'
    : '#C89666';
  const brassHighlight = isSpecial
    ? '#FFFFFF'
    : isDarkMode
    ? '#FDE68A'
    : '#FEF3C7';

  // Double-length braided cord drop so cards hang gracefully below the catenary lace line
  const dropCordPx = 22;

  return (
    <div
      className="w-full flex flex-col items-center select-none pointer-events-none -mb-1.5 z-10"
      aria-hidden="true"
    >
      <svg
        width="48"
        height={dropCordPx + 16}
        viewBox={`-2 -4 48 ${dropCordPx + 16}`}
        className="overflow-visible"
      >
        {/* Vertical Braided Lace Thread Dropping Down from the Overhead Catenary Lace Line */}
        <line
          x1="22"
          y1="-2"
          x2="22"
          y2={dropCordPx + 5}
          stroke={cordColor}
          strokeWidth={isSpecial ? '1.85' : '1.6'}
          strokeLinecap="round"
        />
        <line
          x1="22"
          y1="-2"
          x2="22"
          y2={dropCordPx + 5}
          stroke={laceStroke}
          strokeWidth="1.15"
          strokeDasharray="2.2 2.2"
          strokeLinecap="round"
        />

        {/* Dainty Pearl Bead Accents Along the Double-Length Cord for Couture / Eternal Cards */}
        {isSpecial && (
          <g>
            <circle
              cx="22"
              cy={Math.round(dropCordPx * 0.36)}
              r="1.5"
              fill={isEternal ? '#FFFDF5' : '#FFFFFF'}
              stroke={cordColor}
              strokeWidth="0.65"
            />
            <circle
              cx="22"
              cy={Math.round(dropCordPx * 0.7)}
              r="1.8"
              fill={isEternal ? '#FFFBEB' : '#FFFFFF'}
              stroke={cordColor}
              strokeWidth="0.7"
            />
          </g>
        )}

        {/* Top Knot Tied Directly onto the Overhead Lace Cord (Pearl-set Silver Clasp Knot for Holographic Cards) */}
        {isSpecial ? (
          <g transform="translate(22, -1)">
            <circle
              cx="0"
              cy="0"
              r={isEternal ? '3.8' : '3.5'}
              fill={brassBody}
              stroke={cordColor}
              strokeWidth="0.85"
            />
            <circle cx="0" cy="0" r="1.55" fill="#FFFFFF" />
          </g>
        ) : (
          <>
            <circle cx="22" cy="-1" r="3" fill={cordColor} />
            <circle cx="22" cy="-1" r="1.3" fill={brassHighlight} />
          </>
        )}

        {/* Delicate Scalloped Lace Bow & Florist Clasp at the Card Rim */}
        <g transform={`translate(22, ${dropCordPx + 4})`}>
          {isSpecial ? (
            /* Sculpted Iridescent Silver-Pearl Satin Ribbon Bow on Couture / Eternal Clasp */
            <>
              <path
                d="M 0,0.5 C -10,-6.5 -15,2.5 -1.5,2 M 0,0.5 C 10,-6.5 15,2.5 1.5,2"
                fill={isDarkMode ? '#E2E8F0' : '#E8EEF5'}
                fillOpacity="0.65"
                stroke={isDarkMode ? '#F1F5F9' : '#8592A6'}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M -1.4,1.8 Q -5.5,6.5 -8,10.2 M 1.4,1.8 Q 5.5,6.5 8,10.2"
                fill="none"
                stroke={isDarkMode ? '#F1F5F9' : '#8592A6'}
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </>
          ) : (
            <>
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
            </>
          )}
          {/* Sculpted Brass / Brushed Chrome Florist Clothespin */}
          <rect
            x="-3.8"
            y="-3.5"
            width="7.6"
            height="11.5"
            rx="2.5"
            fill={brassBody}
            stroke={cordColor}
            strokeWidth="0.95"
          />
          {isSpecial ? (
            /* Mother-of-Pearl Cabochon Jewel Set into the Silver Clasp */
            <circle
              cx="0"
              cy="1.1"
              r="1.75"
              fill="#FFFFFF"
              stroke={cordColor}
              strokeWidth="0.7"
            />
          ) : (
            <line x1="-2.2" y1="1" x2="2.2" y2="1" stroke={brassHighlight} strokeWidth="0.95" />
          )}
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
 * - Standard free creations use the classic dashed warm cardstock frame.
 * - Couture & Eternal creations wrap the warm stationery card inside a beveled,
 *   shimmering holographic silver-prism metallic foil border with animated light sweep
 *   and crisp 4-point crystal star glints along the rim.
 */
const HangingCreationCard: React.FC<{
  entry: ShowcaseBouquetEntry;
  isDarkMode: boolean;
  onUnwrap: (entry: ShowcaseBouquetEntry) => void;
  disableStaticTilt?: boolean;
  deferIllustration?: boolean;
}> = React.memo(({ entry, isDarkMode, onUnwrap, disableStaticTilt, deferIllustration = false }) => {
  const tierInfo = useMemo(() => getShowcaseFrameTier(entry), [entry]);
  const isEternal = tierInfo.tier === 'eternal';
  const isHighlighted = tierInfo.isHighlighted;

  // High-contrast metallic chrome + holographic rainbow prism bezel combined in one composite layer
  // (avoids extra mix-blend-mode full-card compositor passes on weak GPUs while preserving exact prism rim).
  const holoBezelBackground = isEternal
    ? 'repeating-linear-gradient(122deg, rgba(255,255,255,0.28) 0px, rgba(255,255,255,0) 1.5px, rgba(100,116,139,0.12) 9px, rgba(255,255,255,0.22) 17px, rgba(255,255,255,0) 25px), conic-gradient(from 32deg at 50% 50%, rgba(255,255,255,0.34) 0deg, rgba(116,220,245,0.26) 48deg, rgba(242,158,205,0.26) 105deg, rgba(255,255,255,0.38) 155deg, rgba(248,214,116,0.28) 215deg, rgba(124,226,184,0.26) 275deg, rgba(142,156,178,0.24) 325deg, rgba(255,255,255,0.34) 360deg), linear-gradient(126deg, #B6C2D2 0%, #F8FAFC 8%, #7EDDF0 16%, #C59EF8 25%, #DCE4EE 35%, #FFFFFF 42%, #F5A3CA 51%, #F6D574 61%, #99A7BA 71%, #7CE0BA 81%, #88B8F8 90%, #E2E8F0 100%)'
    : 'repeating-linear-gradient(122deg, rgba(255,255,255,0.26) 0px, rgba(255,255,255,0) 1.5px, rgba(100,116,139,0.12) 9px, rgba(255,255,255,0.20) 17px, rgba(255,255,255,0) 25px), conic-gradient(from 22deg at 50% 50%, rgba(255,255,255,0.32) 0deg, rgba(118,220,244,0.24) 54deg, rgba(196,158,248,0.24) 114deg, rgba(255,255,255,0.36) 168deg, rgba(244,162,204,0.24) 222deg, rgba(246,214,122,0.24) 278deg, rgba(126,226,186,0.24) 324deg, rgba(255,255,255,0.32) 360deg), linear-gradient(128deg, #AEBACB 0%, #F8FAFC 9%, #83DFF2 18%, #C3A0F8 28%, #CFD8E4 38%, #FFFFFF 46%, #F3A6CC 56%, #F7D87C 66%, #94A3B8 76%, #82E0BE 86%, #89BDF8 94%, #DCE4EE 100%)';

  const cardSurfaceClass = isHighlighted
    ? isDarkMode
      ? 'border border-[#C4D0DF]/75 shadow-[inset_0_1.5px_1.5px_rgba(255,255,255,0.9),inset_0_-1.5px_2px_rgba(51,65,85,0.6),0_14px_28px_-8px_rgba(148,163,184,0.34)] group-hover:border-[#F8FAFC]'
      : 'border border-[#7E8DA3]/80 shadow-[inset_0_1.5px_1.5px_rgba(255,255,255,0.96),inset_0_-1.5px_2px_rgba(71,85,105,0.48),inset_1px_0_1.5px_rgba(255,255,255,0.72),0_12px_26px_-8px_rgba(71,85,105,0.28)] group-hover:border-[#5D6D84]'
    : isDarkMode
    ? 'bg-[#28211F] border border-dashed border-[#5C4B45] group-hover:border-[#856D64] shadow-[0_10px_24px_rgba(15,11,9,0.28)]'
    : 'bg-[#F7F1E8] border border-dashed border-[#D8C5B4] group-hover:border-[#B99B84] shadow-[0_10px_22px_rgba(122,75,58,0.06)]';

  const windowClass = isHighlighted
    ? isDarkMode
      ? 'border border-[#4A3C37]/85 bg-[#221B19]'
      : 'border border-[#E5D5C5]/75 bg-[#FDF9F5]'
    : isDarkMode
    ? 'border border-[#4A3C37]/85 bg-[#221B19]'
    : 'border border-[#E5D5C5]/80 bg-[#FDF9F5]';

  const plateClass = isHighlighted
    ? isDarkMode
      ? 'bg-[#221B18] border border-dashed border-[#6A5A53] text-[#FBF6F1]'
      : 'bg-[#FFFDF9] border border-dashed border-[#D6C2B0] text-[#1F1713] shadow-2xs'
    : isDarkMode
    ? 'bg-[#221B18] border border-dashed border-[#5A4943] text-[#FBF6F1]'
    : 'bg-[#FFFDF9] border border-dashed border-[#D8C4B2] text-[#1F1713] shadow-2xs';

  return (
    <div className="w-full flex flex-col items-center group">
      <LaceHangerClipSVG
        stringLengthPx={entry.stringLengthPx}
        isDarkMode={isDarkMode}
        accentColor={entry.ribbonColor}
        frameTier={tierInfo.tier}
      />

      <button
        type="button"
        onClick={() => onUnwrap(entry)}
        data-frame-tier={tierInfo.tier}
        aria-label={`Open bouquet for ${entry.to} from ${entry.from} (view-only)`}
        style={
          isHighlighted
            ? {
                ...(disableStaticTilt ? undefined : { transform: `rotate(${entry.tiltDeg}deg)` }),
                background: holoBezelBackground,
              }
            : disableStaticTilt
            ? undefined
            : { transform: `rotate(${entry.tiltDeg}deg)` }
        }
        className={`w-full aspect-[12/15.8] sm:aspect-[12/15.6] ${
          isHighlighted
            ? 'rounded-[21px] sm:rounded-[24px] p-[7px] sm:p-[8px]'
            : 'rounded-[20px] sm:rounded-[24px] p-1.5 sm:p-2'
        } relative flex flex-col items-stretch justify-between overflow-hidden transition-transform duration-300 ease-out group-hover:rotate-0 group-hover:-translate-y-1 cursor-pointer focus:outline-none ${cardSurfaceClass}`}
      >
        {/* Holographic Shine Beam + Crystal Rim Glints (Skipped while card is far off-screen) */}
        {isHighlighted && !deferIllustration && (
          <>
            {/* Animated Diagonal Light Shine Sweeping Across the Metallic Bezel */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-y-10 -left-1/2 w-[90%] sab-holo-shine-beam"
              style={{
                background:
                  'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.34) 28%, rgba(255,255,255,0.96) 50%, rgba(212,236,255,0.58) 64%, rgba(255,255,255,0) 100%)',
                animationDelay: isEternal ? '0.6s' : '0s',
              }}
            />

            {/* Crisp Needle-Fine 4-Point Crystal Glints Pinned Along the Foil Rim (Baked SVG halo, zero CSS filter cost) */}
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="pointer-events-none absolute top-[1px] right-[17%] w-[18px] h-[18px] sab-holo-glint z-20"
            >
              <circle cx="12" cy="12" r="7" fill="rgba(226,232,240,0.42)" />
              <path
                d="M12 0.5 L12.7 11.3 L23.5 12 L12.7 12.7 L12 23.5 L11.3 12.7 L0.5 12 L11.3 11.3 Z"
                fill="#FFFFFF"
              />
            </svg>
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="pointer-events-none absolute bottom-[5px] left-[4px] w-4 h-4 sab-holo-glint z-20"
              style={{ animationDelay: '1.15s' }}
            >
              <circle cx="12" cy="12" r="7" fill="rgba(226,232,240,0.42)" />
              <path
                d="M12 0.5 L12.7 11.3 L23.5 12 L12.7 12.7 L12 23.5 L11.3 12.7 L0.5 12 L11.3 11.3 Z"
                fill="#FFFFFF"
              />
            </svg>
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="pointer-events-none absolute top-[18%] left-[1px] w-3.5 h-3.5 sab-holo-glint z-20"
              style={{ animationDelay: '2.1s' }}
            >
              <circle cx="12" cy="12" r="6.5" fill="rgba(226,232,240,0.38)" />
              <path
                d="M12 1 L12.6 11.4 L23 12 L12.6 12.6 L12 23 L11.4 12.6 L1 12 L11.4 11.4 Z"
                fill="#FFFFFF"
              />
            </svg>
          </>
        )}

        {/* Inner Stationery Card Body (When Holographic, sits cleanly inside the outer foil bezel) */}
        <div
          className={`w-full flex-1 min-h-0 flex flex-col items-stretch justify-between relative z-10 ${
            isHighlighted
              ? `rounded-[14px] sm:rounded-[16px] p-1 sm:p-1.5 border ${
                  isDarkMode
                    ? 'bg-[#261F1D] border-[#94A3B8]/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.5),0_1px_0_rgba(255,255,255,0.2)]'
                    : 'bg-[#F7F1E8] border-[#7E8DA3]/65 shadow-[inset_0_1px_2px_rgba(71,85,105,0.24),0_1px_0_rgba(255,255,255,0.88)]'
                }`
              : ''
          }`}
        >
          {/* Bouquet + Envelope + Voice Keepsake Asset SVG (Mounted only when within visible window + overscan) */}
          <div
            className={`w-full flex-1 min-h-0 ${
              isHighlighted
                ? 'rounded-[10px] sm:rounded-[11px]'
                : 'rounded-[14px] sm:rounded-[16px]'
            } overflow-hidden relative p-0 ${windowClass}`}
          >
            <div className="w-full h-full">
              {!deferIllustration && (
                <ShowcaseBouquetIllustrationSVG entry={entry} isDarkMode={isDarkMode} />
              )}
            </div>
          </div>

          {/* High-Contrast Editorial Dedication Plate at Base of Portrait Card */}
          <div
            className={`pointer-events-none mt-1.5 py-1 sm:py-1.5 px-2 sm:px-2.5 ${
              isHighlighted
                ? 'rounded-[10px] sm:rounded-[11px]'
                : 'rounded-[12px] sm:rounded-[14px]'
            } text-center shrink-0 transition-colors duration-300 relative ${plateClass}`}
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            <div className="text-[14px] sm:text-[15.5px] lg:text-[16.5px] leading-[1.1] tracking-[-0.01em] truncate">
              <span
                className={`italic font-medium ${
                  isDarkMode ? 'text-[#E6B89C]' : 'text-[#8A4B38]'
                }`}
              >
                For{' '}
              </span>
              <span className="font-bold">{entry.to}</span>
            </div>
            <div className="text-[11.5px] sm:text-[12.5px] lg:text-[13px] leading-[1.12] truncate mt-0.5">
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

  const [isSectionNearViewport, setIsSectionNearViewport] = useState(false);
  const [mountedRange, setMountedRange] = useState<{ startIdx: number; endIdx: number }>(() =>
    computeMountedGarlandRange(previewEntries.length, 0, visibleSlots, 1)
  );
  const mountedRangeRef = useRef(mountedRange);
  mountedRangeRef.current = mountedRange;

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

  // Pause holographic foil animations until #showcase approaches the viewport
  useEffect(() => {
    const wrapper = scrollContainerRef.current;
    const section = sectionRef.current;
    if (!wrapper || !section || typeof IntersectionObserver === 'undefined') {
      setIsSectionNearViewport(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const isNear = entries.some((e) => e.isIntersecting);
        setIsSectionNearViewport(isNear);
      },
      { root: wrapper, rootMargin: '180px 0px' }
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, [scrollContainerRef]);

  const maxOffset = useMemo(
    () =>
      visibleSlots === 2
        ? Math.max(0, previewEntries.length - visibleSlots)
        : Math.max(0.5, previewEntries.length - visibleSlots + 0.35),
    [previewEntries.length, visibleSlots]
  );

  const edgeY = 6;
  const midY = visibleSlots === 2 ? 32 : visibleSlots === 3 ? 60 : 82;

  const syncMountedRange = useCallback(
    (combinedOffset: number) => {
      const next = computeMountedGarlandRange(previewEntries.length, combinedOffset, visibleSlots, 1);
      if (
        next.startIdx !== mountedRangeRef.current.startIdx ||
        next.endIdx !== mountedRangeRef.current.endIdx
      ) {
        mountedRangeRef.current = next;
        setMountedRange(next);
      }
    },
    [previewEntries.length, visibleSlots]
  );

  useEffect(() => {
    syncMountedRange(scrollDrivenOffsetRef.current + manualOffsetRef.current);
  }, [syncMountedRange]);

  const updateGarlandDOM = useCallback(() => {
    const count = previewEntries.length;
    const rawTotal = scrollDrivenOffsetRef.current + manualOffsetRef.current;
    // Wrap smoothly within [0, maxOffset] so both scroll and manual step/swipe cycle all creations right-to-left
    const combinedOffset = Math.max(0, Math.min(maxOffset, rawTotal));
    syncMountedRange(combinedOffset);
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
          el.style.willChange = 'auto';
        }
        continue;
      }
      if (el.dataset.hidden !== '0') {
        el.dataset.hidden = '0';
        el.style.visibility = 'visible';
        el.style.pointerEvents = 'auto';
        el.style.willChange = 'transform, opacity';
      }
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
  }, [previewEntries, visibleSlots, maxOffset, edgeY, midY, syncMountedRange]);

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
      style={{ contain: 'layout style' }}
      className={`scroll-mt-24 relative w-full pt-5 sm:pt-8 pb-8 sm:pb-14 overflow-hidden select-none ${
        isSectionNearViewport ? '' : 'sab-holo-paused'
      }`}
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
        className="relative w-full h-[340px] sm:h-[416px] lg:h-[468px] touch-pan-y"
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
            const isWithinMountWindow =
              idx >= mountedRange.startIdx && idx <= mountedRange.endIdx;
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
                  willChange: initial.isVisible ? 'transform, opacity' : 'auto',
                  contain: 'layout style',
                }}
                className="absolute top-0 w-[166px] min-[380px]:w-[176px] sm:w-[208px] lg:w-[228px]"
              >
                <HangingCreationCard
                  entry={entry}
                  isDarkMode={isDarkMode}
                  onUnwrap={onUnwrapShowcaseBouquet}
                  disableStaticTilt
                  deferIllustration={!isWithinMountWindow}
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
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-dashed flex items-center justify-center transition-[transform,background-color] duration-200 active:scale-95 cursor-pointer shrink-0 ${
            isDarkMode
              ? 'bg-[#362D2A] border-[#66554F] text-[#FBF6F1] hover:bg-[#433834]'
              : 'bg-[#FFFDF9] border-[#D8C4B4] text-[#4A382E] hover:bg-[#FAF3EB]'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <a
          href="/garland"
          onClick={(e) => {
            if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.button === 0) {
              e.preventDefault();
              onExploreAllCreations();
            }
          }}
          data-testid="explore-all-creations-btn"
          className={`px-6 sm:px-7 py-2.5 sm:py-3 rounded-full border border-dashed text-xs sm:text-[13px] font-medium inline-flex items-center gap-2 transition-[transform,background-color] duration-200 active:scale-95 cursor-pointer no-underline shadow-[0_8px_24px_rgba(122,75,58,0.05)] ${
            isDarkMode
              ? 'bg-[#362D2A] border-[#66554F] text-[#FBF6F1] hover:bg-[#433834]'
              : 'bg-[#FFFDF9] border-[#D8C4B4] text-[#4A382E] hover:bg-[#FAF3EB]'
          }`}
        >
          <span>Explore All Creations</span>
          <span aria-hidden="true" className="opacity-70">→</span>
        </a>

        <button
          type="button"
          onClick={() => stepPreviewCarousel(1)}
          aria-label="Next shared creation"
          data-testid="hero-garland-next"
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-dashed flex items-center justify-center transition-[transform,background-color] duration-200 active:scale-95 cursor-pointer shrink-0 ${
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
  const isClosingRef = useRef(false);

  useEffect(() => {
    syncDocumentSeoMeta({ mode: 'garland' });
    return () => {
      syncDocumentSeoMeta({ mode: 'landing' });
    };
  }, []);
  const [nowMs] = useState<number>(() => Date.now());
  const [viewportMetrics, setViewportMetrics] = useState<{ slots: number; height: number }>(() => {
    if (typeof window === 'undefined') return { slots: 4, height: 900 };
    const w = window.innerWidth;
    const h = window.innerHeight || 900;
    return { slots: w < 640 ? 2 : w < 1024 ? 3 : 4, height: h };
  });
  const visibleSlots = viewportMetrics.slots;
  const isShortMobileViewport = visibleSlots === 2 && viewportMetrics.height < 640;
  const mobileCardsPerPage = isShortMobileViewport ? 2 : 4;
  const [activeCarouselStep, setActiveCarouselStep] = useState(0);

  const pageScrollWrapperRef = useRef<HTMLDivElement | null>(null);
  const pageScrollContentRef = useRef<HTMLDivElement | null>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const progressBarFillRef = useRef<HTMLDivElement | null>(null);
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

  // Responsive slot count + visualViewport height awareness (handles mobile Safari/Chrome bars & keyboards)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => {
      const w = window.innerWidth;
      const h = Math.round(window.visualViewport?.height || window.innerHeight || 900);
      const nextSlots = w < 640 ? 2 : w < 1024 ? 3 : 4;
      setViewportMetrics((prev) =>
        prev.slots === nextSlots && Math.abs(prev.height - h) < 8 ? prev : { slots: nextSlots, height: h }
      );
    };
    onResize();
    window.addEventListener('resize', onResize, { passive: true });
    window.visualViewport?.addEventListener('resize', onResize, { passive: true });
    return () => {
      window.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
    };
  }, []);

  const totalMobilePages = useMemo(
    () => Math.max(1, Math.ceil(filteredEntries.length / mobileCardsPerPage)),
    [filteredEntries.length, mobileCardsPerPage]
  );

  // Clamp active page when mobile viewport switches between 2-card and 4-card layouts
  useEffect(() => {
    if (visibleSlots === 2 && activeCarouselStep >= totalMobilePages) {
      setActiveCarouselStep(Math.max(0, totalMobilePages - 1));
    }
  }, [visibleSlots, activeCarouselStep, totalMobilePages]);

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
  const isCompactDesktopHeight = visibleSlots > 2 && viewportMetrics.height < 720;
  const midY =
    visibleSlots === 2
      ? 20
      : visibleSlots === 3
      ? isCompactDesktopHeight
        ? 36
        : 46
      : isCompactDesktopHeight
      ? 48
      : 60;

  const wakeLenisRafRef = useRef<(() => void) | null>(null);
  const [galleryMountedRange, setGalleryMountedRange] = useState<{ startIdx: number; endIdx: number }>(() =>
    computeMountedGarlandRange(filteredEntries.length, 0, visibleSlots, 1)
  );
  const galleryMountedRangeRef = useRef(galleryMountedRange);
  galleryMountedRangeRef.current = galleryMountedRange;

  const syncGalleryMountedRange = useCallback(
    (scrollOffset: number) => {
      const next = computeMountedGarlandRange(filteredEntries.length, scrollOffset, visibleSlots, 1);
      if (
        next.startIdx !== galleryMountedRangeRef.current.startIdx ||
        next.endIdx !== galleryMountedRangeRef.current.endIdx
      ) {
        galleryMountedRangeRef.current = next;
        setGalleryMountedRange(next);
      }
    },
    [filteredEntries.length, visibleSlots]
  );

  useEffect(() => {
    syncGalleryMountedRange(currentOffsetRef.current);
  }, [syncGalleryMountedRange]);

  const applySingleLaceTransforms = useCallback(
    (scrollTopPx: number) => {
      const progress =
        totalScrollRangePx > 0
          ? Math.max(0, Math.min(1, scrollTopPx / totalScrollRangePx))
          : 0;
      const scrollOffset = progress * maxCarouselOffset;
      currentOffsetRef.current = scrollOffset;
      syncGalleryMountedRange(scrollOffset);

      if (progressBarFillRef.current) {
        const minFill =
          visibleSlots === 2
            ? 1 / Math.max(1, totalMobilePages)
            : Math.min(1, visibleSlots / Math.max(1, filteredEntries.length));
        const visualScale = minFill + (1 - minFill) * progress;
        progressBarFillRef.current.style.transform = `scaleX(${Math.max(0.08, Math.min(1, visualScale)).toFixed(4)})`;
      }

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
            el.style.willChange = 'auto';
          }
          continue;
        }
        if (el.dataset.hidden !== '0') {
          el.dataset.hidden = '0';
          el.style.visibility = 'visible';
          el.style.pointerEvents = 'auto';
          el.style.willChange = 'transform, opacity';
        }
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
    [
      filteredEntries,
      maxCarouselOffset,
      totalScrollRangePx,
      visibleSlots,
      totalMobilePages,
      edgeY,
      midY,
      syncGalleryMountedRange,
    ]
  );

  // Initialize on-demand smooth Lenis scroll on the single-screen sticky viewport
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

    const driver = createOnDemandLenisDriver(lenis, wrapper);
    wakeLenisRafRef.current = driver.wake;

    return () => {
      wakeLenisRafRef.current = null;
      driver.destroy();
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [applySingleLaceTransforms]);

  // Reset carousel to right-to-left start when search query changes
  useEffect(() => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true });
      wakeLenisRafRef.current?.();
    } else if (pageScrollWrapperRef.current) {
      pageScrollWrapperRef.current.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
    applySingleLaceTransforms(0);
  }, [searchQuery, applySingleLaceTransforms]);

  const scrollByStep = useCallback(
    (deltaSteps: number) => {
      if (visibleSlots === 2) {
        const nextStep = Math.max(0, Math.min(totalMobilePages - 1, activeCarouselStep + deltaSteps));
        setActiveCarouselStep(nextStep);
        currentOffsetRef.current = nextStep;
        if (progressBarFillRef.current) {
          const ratio = totalMobilePages <= 1 ? 1 : (nextStep + 1) / totalMobilePages;
          progressBarFillRef.current.style.transform = `scaleX(${Math.max(0.08, Math.min(1, ratio)).toFixed(4)})`;
        }
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
          duration: 0.85,
          easing: (t: number) => 1 - Math.pow(1 - t, 4),
        });
        wakeLenisRafRef.current?.();
      } else {
        wrapper.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
      }
    },
    [visibleSlots, totalMobilePages, activeCarouselStep, maxCarouselOffset, totalScrollRangePx]
  );

  // Keyboard navigation (Left/Right arrows to glide the garland)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        scrollByStep(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        scrollByStep(-1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [scrollByStep]);

  const triggerSmoothClose = (afterClose: () => void) => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setIsClosing(true);
    window.setTimeout(() => {
      afterClose();
    }, 240);
  };

  const mobilePageSlice = useMemo(() => {
    const start = activeCarouselStep * mobileCardsPerPage;
    return filteredEntries.slice(start, start + mobileCardsPerPage);
  }, [filteredEntries, activeCarouselStep, mobileCardsPerPage]);

  const desktopStepCount = Math.max(1, filteredEntries.length);
  const desktopMaxStepIndex = Math.max(0, Math.round(maxCarouselOffset));
  const isAtStart = activeCarouselStep <= 0;
  const isAtEnd =
    visibleSlots === 2
      ? activeCarouselStep >= totalMobilePages - 1
      : activeCarouselStep >= desktopMaxStepIndex;

  // Dynamic card sizing formulas driven by actual remaining stage container height (`cqh`) and width (`cqw`)
  const desktopCardWidthExpr =
    visibleSlots === 3
      ? `clamp(142px, min(26.5cqw, calc((100cqh - ${midY + 52}px) / 1.32)), 214px)`
      : `clamp(144px, min(20.5cqw, calc((100cqh - ${midY + 54}px) / 1.32)), 234px)`;
  const desktopTrackHeightExpr = `min(100cqh, calc(${desktopCardWidthExpr} * 1.33 + ${midY + 46}px))`;

  const mobileCardWidthExpr = isShortMobileViewport
    ? 'clamp(132px, min(43cqw, calc((100cqh - 66px) / 1.35)), 184px)'
    : 'clamp(112px, min(41.5cqw, calc((50cqh - 60px) / 1.35)), 162px)';
  const mobileSingleRowHeightExpr = `min(100cqh, calc(${mobileCardWidthExpr} * 1.35 + 52px))`;

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
            wakeLenisRafRef.current?.();
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
        {/* SINGLE-SCREEN LOCKED STAGE (100dvh — adapts seamlessly to browser tabs, address bars & safe areas) */}
        <div
          data-testid="single-screen-lace-stage"
          className="sticky top-0 h-dvh w-full overflow-hidden flex flex-col select-none"
        >
          {/* 1. QUIET EDITORIAL TOP NAVIGATION RAIL (Steps back visually so the gallery title & bouquets lead) */}
          <header
            className={`w-full shrink-0 z-30 border-b backdrop-blur-md transition-colors ${
              isDarkMode
                ? 'bg-[#2B2321]/92 border-[#433733] text-[#FBF6F1]'
                : 'bg-[#FDF9F5]/92 border-[#ECE1D5] text-[#231C18]'
            }`}
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
          >
            <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-10 h-12 sm:h-14 flex items-center justify-between gap-3">
              {/* Left Zone: Quiet Back Link + Hairline Divider + Brand Wordmark */}
              <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 shrink-0">
                <button
                  type="button"
                  onClick={() => triggerSmoothClose(onBackToHome)}
                  data-testid="creations-back-home-btn"
                  className={`h-9 px-2 -ml-2 rounded-lg text-xs sm:text-[13px] font-medium inline-flex items-center gap-1.5 transition-colors active:scale-95 cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A67F6A]/40 ${
                    isDarkMode
                      ? 'text-[#D6C4BA] hover:text-[#FBF6F1] hover:bg-[#3A302C]'
                      : 'text-[#6A5346] hover:text-[#1F1815] hover:bg-[#F3EAE0]'
                  }`}
                >
                  <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                  <span>Back</span>
                </button>

                <span
                  aria-hidden="true"
                  className={`h-4 w-px shrink-0 ${
                    isDarkMode ? 'bg-[#4C3F3A]' : 'bg-[#E4D6C8]'
                  }`}
                />

                <button
                  type="button"
                  onClick={() => triggerSmoothClose(onBackToHome)}
                  className="flex items-center gap-2 cursor-pointer hover:opacity-85 transition-opacity shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A67F6A]/40 rounded-lg py-1"
                >
                  <BrandLogoMark className="w-5.5 h-5.5 sm:w-6 sm:h-6 shrink-0" isDarkMode={isDarkMode} />
                  <span
                    className="hidden sm:inline text-[18px] lg:text-[19px] font-semibold tracking-tight whitespace-nowrap"
                    style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                  >
                    Send A Bouquet
                  </span>
                </button>
              </div>

              {/* Right Zone: Quiet Utilities + Single Primary Focal CTA */}
              <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                <button
                  type="button"
                  onClick={onToggleDarkMode}
                  aria-label="Toggle theme"
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors active:scale-95 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A67F6A]/40 ${
                    isDarkMode
                      ? 'text-[#E6B89C] hover:bg-[#3A302C]'
                      : 'text-[#6A5346] hover:bg-[#F3EAE0]'
                  }`}
                >
                  {isDarkMode ? (
                    <Sun className="w-4 h-4 text-amber-300" />
                  ) : (
                    <Moon className="w-4 h-4" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => triggerSmoothClose(onOpenVault)}
                  aria-label="Saved Bouquets"
                  title="Saved Bouquets"
                  className={`inline-flex h-9 px-2.5 sm:px-3 rounded-lg text-xs sm:text-[13px] font-medium items-center gap-1.5 transition-colors active:scale-95 cursor-pointer shrink-0 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A67F6A]/40 ${
                    isDarkMode
                      ? 'text-[#E4D5CC] hover:text-[#FBF6F1] hover:bg-[#3A302C]'
                      : 'text-[#5C4438] hover:text-[#1F1815] hover:bg-[#F3EAE0]'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5 text-[#B4846C] shrink-0" />
                  <span className="hidden md:inline">Saved Bouquets</span>
                  {vaultCount > 0 && (
                    <span
                      className={`text-[11px] font-semibold tabular-nums ${
                        isDarkMode ? 'text-[#E6B89C]' : 'text-[#8C5B47]'
                      }`}
                    >
                      {vaultCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => triggerSmoothClose(onStartCrafting)}
                  className={`h-9 sm:h-9.5 px-4 sm:px-5 rounded-full text-white text-xs sm:text-[13px] font-medium inline-flex items-center justify-center transition-colors active:scale-95 cursor-pointer shrink-0 whitespace-nowrap shadow-[0_2px_10px_rgba(122,75,58,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#7A4B3A] ${
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

          {/* 2. EDITORIAL GALLERY MASTHEAD (Primary Title + Unboxed Context on Left, Clean Search on Right) */}
          <div className="w-full shrink-0 z-30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 pt-2.5 sm:pt-4 lg:pt-5 pb-1.5 sm:pb-2 flex flex-col md:flex-row md:items-end md:justify-between gap-2 sm:gap-3 md:gap-6">
              <div className="min-w-0">
                <h1
                  className={`text-[25px] sm:text-[34px] lg:text-[40px] font-semibold tracking-[-0.02em] leading-[1.04] ${
                    isDarkMode ? 'text-[#FBF6F1]' : 'text-[#1F1815]'
                  }`}
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                >
                  On the <span className="italic font-normal">Lace Garland</span>
                </h1>
                <div
                  className={`mt-0.5 sm:mt-1 flex items-center gap-2 text-[12px] sm:text-[13px] leading-snug ${
                    isDarkMode ? 'text-[#B5A197]' : 'text-[#7D685D]'
                  }`}
                >
                  {searchQuery.trim() ? (
                    <>
                      <span
                        className={`font-medium tabular-nums ${
                          isDarkMode ? 'text-[#E8D5CB]' : 'text-[#543E33]'
                        }`}
                      >
                        {filteredEntries.length} {filteredEntries.length === 1 ? 'match' : 'matches'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">for “{searchQuery.trim()}”</span>
                    </>
                  ) : (
                    <>
                      <span
                        className={`font-medium tabular-nums ${
                          isDarkMode ? 'text-[#E8D5CB]' : 'text-[#543E33]'
                        }`}
                      >
                        {filteredEntries.length} shared bouquets
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">
                        {visibleSlots === 2 ? 'Tap any keepsake to unwrap' : 'Click any keepsake to unwrap'}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <label
                className={`w-full md:w-[300px] lg:w-[348px] h-9.5 sm:h-10.5 rounded-full border px-3.5 sm:px-4 flex items-center gap-2.5 transition-all cursor-text shrink-0 ${
                  isDarkMode
                    ? 'bg-[#352C29] border-[#52433D] focus-within:border-[#9E8072] focus-within:ring-2 focus-within:ring-[#9E8072]/20'
                    : 'bg-[#FFFDF9] border-[#E3D5C7] focus-within:border-[#B28C76] focus-within:ring-2 focus-within:ring-[#B28C76]/15 shadow-[0_1px_2px_rgba(35,28,24,0.03)]'
                }`}
              >
                <Search
                  className={`w-4 h-4 shrink-0 ${
                    isDarkMode ? 'text-[#B59F94]' : 'text-[#9A8274]'
                  }`}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search recipient or sender…"
                  aria-label="Search bouquets by recipient (For) or sender (From)"
                  data-testid="showcase-search-unified"
                  className={`w-full min-w-0 bg-transparent text-[13px] sm:text-[13.5px] focus:outline-none ${
                    isDarkMode
                      ? 'text-[#FBF6F1] placeholder:text-[#9E8C82]'
                      : 'text-[#231C18] placeholder:text-[#9F8B7F]'
                  }`}
                />
                {searchQuery.trim() && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                    data-testid="showcase-search-clear"
                    className={`w-6 h-6 -mr-1 rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
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

          {/* 3. HERO STAGE: CONTAINER-SIZED, OPTICALLY CENTERED CATENARY LACE GARLAND */}
          <main
            className="relative flex-1 min-h-0 w-full flex flex-col items-center justify-center overflow-hidden"
            style={{ containerType: 'size' }}
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
                wakeLenisRafRef.current?.();
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
                className={`max-w-sm mx-4 rounded-2xl border py-8 px-6 text-center ${
                  isDarkMode
                    ? 'bg-[#352C29]/85 border-[#52433D]'
                    : 'bg-[#FFFDF9] border-[#E5D7C9] shadow-[0_6px_24px_rgba(35,28,24,0.04)]'
                }`}
              >
                <p
                  className={`text-2xl font-semibold ${
                    isDarkMode ? 'text-[#FBF6F1]' : 'text-[#231C18]'
                  }`}
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                >
                  No bouquets found for “{searchQuery.trim()}”
                </p>
                <p
                  className={`mt-1.5 text-xs ${
                    isDarkMode ? 'text-[#B5A197]' : 'text-[#7D685D]'
                  }`}
                >
                  Try searching by a different recipient or sender name.
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className={`mt-4 h-9 px-5 rounded-full border text-xs font-medium transition-colors cursor-pointer ${
                    isDarkMode
                      ? 'border-[#66554F] bg-[#423734] text-[#FBF6F1] hover:bg-[#4D403C]'
                      : 'border-[#D8C4B4] bg-[#FAF4EE] text-[#5C4438] hover:bg-[#F3E9DF]'
                  }`}
                >
                  Show all creations
                </button>
              </div>
            ) : visibleSlots === 2 ? (
              /* MOBILE GARLAND STAGE: Container-fitted 2 rows (4 cards/page) on standard phones, 1 generous row (2 cards/page) when height is tight */
              <div
                data-testid="single-lace-carousel-track"
                className="w-full h-full flex flex-col justify-center"
              >
                {(isShortMobileViewport
                  ? [mobilePageSlice.slice(0, 2)]
                  : [mobilePageSlice.slice(0, 2), mobilePageSlice.slice(2, 4)]
                )
                  .filter((rowEntries) => rowEntries.length > 0)
                  .map((rowEntries, rowIdx) => (
                    <div
                      key={`mobile-lace-row-${rowIdx}-${activeCarouselStep}-${isShortMobileViewport ? '1r' : '2r'}`}
                      style={isShortMobileViewport ? { height: mobileSingleRowHeightExpr } : undefined}
                      className={
                        isShortMobileViewport
                          ? 'relative w-full shrink-0'
                          : 'relative w-full flex-1 min-h-0'
                      }
                    >
                      <div className="absolute top-0 inset-x-0 z-0">
                        <SweepingCatenaryLaceLineSVG
                          isDarkMode={isDarkMode}
                          edgeY={4}
                          midY={18}
                        />
                      </div>
                      <div className="absolute inset-0 z-10">
                        {rowEntries.map((entry, colIdx) => {
                          const isSingleInRow = rowEntries.length === 1;
                          const u = isSingleInRow ? 0.5 : colIdx === 0 ? 0.26 : 0.74;
                          const yCurvePx = evaluateCatenaryCurveY(u, 4, 18);
                          const rotateDeg = isSingleInRow ? 0 : colIdx === 0 ? 0.7 : -0.7;
                          return (
                            <div
                              key={entry.id}
                              data-testid={`showcase-card-${entry.code}`}
                              style={{
                                left: `${(u * 100).toFixed(1)}%`,
                                width: mobileCardWidthExpr,
                                transform: `translate3d(-50%, ${yCurvePx.toFixed(1)}px, 0) rotate(${rotateDeg}deg)`,
                              }}
                              className="absolute top-0 transition-all duration-300"
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
            ) : (
              /* DESKTOP & TABLET SINGLE SWEEPING CATENARY LACE GARLAND */
              <div
                data-testid="single-lace-carousel-track"
                style={{ height: desktopTrackHeightExpr }}
                className="relative w-full shrink-0"
              >
                {/* The ONE Sweeping Catenary Lace Cord Across the Viewport */}
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
                    const isWithinMountWindow =
                      idx >= galleryMountedRange.startIdx && idx <= galleryMountedRange.endIdx;
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
                          width: desktopCardWidthExpr,
                          transform: `translate3d(-50%, ${initial.yCurvePx}px, 0) rotate(${initial.rotateDeg}deg) scale(${initial.scale})`,
                          opacity: initial.opacity,
                          pointerEvents: initial.isVisible ? 'auto' : 'none',
                          visibility: initial.isVisible ? 'visible' : 'hidden',
                          willChange: initial.isVisible ? 'transform, opacity' : 'auto',
                          contain: 'layout style paint',
                        }}
                        className="absolute top-0"
                      >
                        <HangingCreationCard
                          entry={entry}
                          isDarkMode={isDarkMode}
                          disableStaticTilt
                          deferIllustration={!isWithinMountWindow}
                          onUnwrap={(selected) =>
                            triggerSmoothClose(() => onUnwrapShowcaseBouquet(selected))
                          }
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Soft Edge Vignettes so Entering/Exiting Cards Dissolve Smoothly Instead of Hard Viewport Clipping */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-0 w-10 lg:w-16 z-20"
                  style={{
                    background: isDarkMode
                      ? 'linear-gradient(90deg, #2B2321 0%, rgba(43,35,33,0.55) 45%, rgba(43,35,33,0) 100%)'
                      : 'linear-gradient(90deg, #FDF9F5 0%, rgba(253,249,245,0.55) 45%, rgba(253,249,245,0) 100%)',
                  }}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 right-0 w-10 lg:w-16 z-20"
                  style={{
                    background: isDarkMode
                      ? 'linear-gradient(270deg, #2B2321 0%, rgba(43,35,33,0.55) 45%, rgba(43,35,33,0) 100%)'
                      : 'linear-gradient(270deg, #FDF9F5 0%, rgba(253,249,245,0.55) 45%, rgba(253,249,245,0) 100%)',
                  }}
                />
              </div>
            )}
          </main>

          {/* 4. GROUNDED QUIET FOOTER CONTROL RAIL (Clean Hairline Controls + Progress Track + Safe-Area Support) */}
          {filteredEntries.length > 0 && (
            <footer
              className={`w-full shrink-0 z-30 border-t transition-colors ${
                isDarkMode
                  ? 'bg-[#2B2321]/92 border-[#433733]/75'
                  : 'bg-[#FDF9F5]/92 border-[#ECE1D5]/85'
              }`}
              style={{
                paddingBottom: 'max(0.65rem, env(safe-area-inset-bottom, 0px))',
              }}
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 pt-2.5 flex items-center justify-center sm:justify-between gap-4">
                <p
                  className={`hidden sm:block text-xs w-52 whitespace-nowrap ${
                    isDarkMode ? 'text-[#A69288]' : 'text-[#8C766A]'
                  }`}
                >
                  Scroll or drag along the lace
                </p>

                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => scrollByStep(-1)}
                    disabled={isAtStart}
                    aria-label="Glide carousel right (previous creation)"
                    data-testid="lace-carousel-prev"
                    className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all cursor-pointer active:scale-95 disabled:opacity-35 disabled:cursor-default disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A67F6A]/40 ${
                      isDarkMode
                        ? 'bg-[#352C29] border-[#52433D] text-[#FBF6F1] hover:bg-[#413632]'
                        : 'bg-[#FFFDF9] border-[#DFD0C1] text-[#4A382E] hover:bg-[#F6EFE6]'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex flex-col items-center gap-1.5 min-w-[92px]">
                    <span
                      className={`text-[13px] font-medium tabular-nums tracking-[0.04em] leading-none ${
                        isDarkMode ? 'text-[#EFE3DA]' : 'text-[#4A382E]'
                      }`}
                    >
                      {visibleSlots === 2
                        ? `${Math.min(totalMobilePages, activeCarouselStep + 1)} / ${totalMobilePages}`
                        : `${Math.min(desktopStepCount, activeCarouselStep + 1)} / ${desktopStepCount}`}
                    </span>
                    <div
                      aria-hidden="true"
                      className={`w-20 sm:w-24 h-[2px] rounded-full overflow-hidden ${
                        isDarkMode ? 'bg-[#463934]' : 'bg-[#E7DACD]'
                      }`}
                    >
                      <div
                        ref={progressBarFillRef}
                        className={`h-full w-full origin-left rounded-full transition-transform duration-150 ${
                          isDarkMode ? 'bg-[#D8A88E]' : 'bg-[#8C5B47]'
                        }`}
                        style={{
                          transform: `scaleX(${Math.max(
                            0.08,
                            Math.min(
                              1,
                              visibleSlots === 2
                                ? 1 / Math.max(1, totalMobilePages)
                                : visibleSlots / Math.max(1, filteredEntries.length)
                            )
                          ).toFixed(4)})`,
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => scrollByStep(1)}
                    disabled={isAtEnd}
                    aria-label="Glide carousel left (next creation)"
                    data-testid="lace-carousel-next"
                    className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all cursor-pointer active:scale-95 disabled:opacity-35 disabled:cursor-default disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A67F6A]/40 ${
                      isDarkMode
                        ? 'bg-[#352C29] border-[#52433D] text-[#FBF6F1] hover:bg-[#413632]'
                        : 'bg-[#FFFDF9] border-[#DFD0C1] text-[#4A382E] hover:bg-[#F6EFE6]'
                    }`}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <p
                  className={`hidden sm:block text-xs text-right w-52 whitespace-nowrap ${
                    isDarkMode ? 'text-[#A69288]' : 'text-[#8C766A]'
                  }`}
                >
                  Use ← → keys to browse
                </p>
              </div>
            </footer>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(pageContent, document.body);
  }
  return pageContent;
};
