import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Trash2,
  Copy,
  FlipHorizontal,
  ArrowUp,
  ArrowDown,
  X,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  GripVertical,
  Mail,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { FLOWER_CATALOG } from '../types/bouquet';
import { FlowerRenderer } from './flowers/FlowerRenderer';
import { MiniWrapConeSVG } from './MiniThumbnails';
import { useBouquetStore } from '../store/useBouquetStore';

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

  const panelRootRef = useRef<HTMLDivElement | null>(null);
  const listScrollRef = useRef<HTMLDivElement | null>(null);
  const pointerClientYRef = useRef<number | null>(null);
  const pointerStoreIdxRef = useRef<number | null>(null);
  const itemsLengthRef = useRef<number>(items.length);
  itemsLengthRef.current = items.length;

  // Locate the nearest scrollable ancestor (either listScrollRef itself or the sidebar's overflow-y-auto container)
  const getScrollContainer = useCallback((): HTMLElement | null => {
    let el: HTMLElement | null = listScrollRef.current;
    while (el) {
      const style = window.getComputedStyle(el);
      if (
        (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
        el.scrollHeight > el.clientHeight + 2
      ) {
        return el;
      }
      el = el.parentElement;
    }
    return listScrollRef.current;
  }, []);

  // Reorder based on which layer row is currently under clientY
  const reorderAtClientY = useCallback(
    (clientY: number) => {
      const currentIdx = pointerStoreIdxRef.current;
      if (currentIdx === null || !listScrollRef.current) return;
      const rows = listScrollRef.current.querySelectorAll<HTMLElement>('[data-layer-store-index]');
      let targetIdx: number | null = null;
      rows.forEach((row) => {
        const rect = row.getBoundingClientRect();
        if (clientY >= rect.top && clientY <= rect.bottom) {
          const parsed = Number(row.getAttribute('data-layer-store-index'));
          if (!Number.isNaN(parsed)) {
            targetIdx = parsed;
          }
        }
      });

      // If pointer is above the first row or below the last row, clamp to frontmost/backmost
      if (targetIdx === null && rows.length > 0) {
        const firstRect = rows[0].getBoundingClientRect();
        const lastRect = rows[rows.length - 1].getBoundingClientRect();
        if (clientY < firstRect.top) {
          targetIdx = itemsLengthRef.current - 1;
        } else if (clientY > lastRect.bottom) {
          targetIdx = 0;
        }
      }

      if (targetIdx !== null && targetIdx !== currentIdx) {
        reorderItems(currentIdx, targetIdx);
        pointerStoreIdxRef.current = targetIdx;
        setPointerDrag((prev) =>
          prev
            ? {
                ...prev,
                storeIdx: targetIdx!,
                startY: clientY,
                currentY: clientY
              }
            : null
        );
      }
    },
    [reorderItems]
  );

  // Continuous auto-scroll loop when dragging near the top or bottom edge of the layer list
  useEffect(() => {
    const isDragging = pointerDrag !== null || draggedStoreIdx !== null;
    if (!isDragging) return;

    let rafId: number;
    const edgeThreshold = 58; // px from top/bottom edge of scroll container
    const maxScrollSpeed = 9; // px per frame

    const stepAutoScroll = () => {
      const clientY = pointerClientYRef.current;
      const scrollEl = getScrollContainer();
      if (clientY !== null && scrollEl) {
        const rect = scrollEl.getBoundingClientRect();
        let deltaY = 0;
        if (clientY < rect.top + edgeThreshold) {
          const intensity = Math.min(
            1,
            Math.max(0.15, (rect.top + edgeThreshold - clientY) / edgeThreshold)
          );
          deltaY = -Math.ceil(intensity * maxScrollSpeed);
        } else if (clientY > rect.bottom - edgeThreshold) {
          const intensity = Math.min(
            1,
            Math.max(0.15, (clientY - (rect.bottom - edgeThreshold)) / edgeThreshold)
          );
          deltaY = Math.ceil(intensity * maxScrollSpeed);
        }

        if (deltaY !== 0) {
          const prevScrollTop = scrollEl.scrollTop;
          scrollEl.scrollTop += deltaY;
          if (scrollEl.scrollTop !== prevScrollTop && pointerStoreIdxRef.current !== null) {
            reorderAtClientY(clientY);
          }
        }
      }
      rafId = requestAnimationFrame(stepAutoScroll);
    };

    rafId = requestAnimationFrame(stepAutoScroll);
    return () => cancelAnimationFrame(rafId);
  }, [pointerDrag !== null, draggedStoreIdx !== null, getScrollContainer, reorderAtClientY]);

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
    pointerClientYRef.current = e.clientY;
    pointerStoreIdxRef.current = storeIndex;
    setPointerDrag({
      storeIdx: storeIndex,
      startY: e.clientY,
      currentY: e.clientY
    });
  };

  const handleGripPointerMove = (e: React.PointerEvent) => {
    if (!pointerDrag) return;
    e.stopPropagation();
    pointerClientYRef.current = e.clientY;
    reorderAtClientY(e.clientY);
    setPointerDrag((prev) => (prev ? { ...prev, currentY: e.clientY } : null));
  };

  const handleGripPointerUp = (e: React.PointerEvent) => {
    if (!pointerDrag) return;
    e.stopPropagation();
    pointerClientYRef.current = null;
    pointerStoreIdxRef.current = null;
    setPointerDrag(null);
  };

  return (
    <div
      ref={panelRootRef}
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
        ref={listScrollRef}
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
                data-layer-store-index={storeIndex}
                draggable={!item.locked}
                onDragStart={(e) => {
                  if (item.locked) {
                    e.preventDefault();
                    return;
                  }
                  pointerClientYRef.current = e.clientY;
                  setDraggedStoreIdx(storeIndex);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  pointerClientYRef.current = e.clientY;
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
                  pointerClientYRef.current = null;
                  if (draggedStoreIdx !== null && draggedStoreIdx !== storeIndex) {
                    reorderItems(draggedStoreIdx, storeIndex);
                  }
                  setDraggedStoreIdx(null);
                  setDragOverStoreIdx(null);
                }}
                onDragEnd={() => {
                  pointerClientYRef.current = null;
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

