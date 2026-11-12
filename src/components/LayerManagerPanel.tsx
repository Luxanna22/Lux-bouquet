import React, { useState, useRef } from 'react';
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  GripVertical,
  Mail,
  Package,
} from 'lucide-react';
import { useBouquetStore } from '../store/useBouquetStore';
import { FLOWER_CATALOG, PHOTO_FRAME_CATALOG, WRAPPER_CATALOG, getEffectiveItemPlane } from '../types/bouquet';
import { FlowerRenderer } from './flowers/FlowerRenderer';
import { MiniPhotoFrameSVG, LayerOrderBoxIcon } from './MiniThumbnails';

interface LayerManagerPanelProps {
  onSelectStem?: (id: string) => void;
  isEmbeddedInSidebar?: boolean;
}

export const LayerManagerPanel: React.FC<LayerManagerPanelProps> = ({
  onSelectStem,
  isEmbeddedInSidebar = false,
}) => {
  const {
    items,
    selectedId,
    wrapStyle,
    lastNonPlainWrapStyle,
    wrapColor,
    card,
    selectItem,
    reorderItems,
    moveItemLayer,
    toggleItemLock,
    toggleItemHidden,
    unlockAllItems,
    showAllItems,
    deleteItemById,
    updateCard,
    toggleWrapVisibility,
  } = useBouquetStore();

  const [draggedVisualIdx, setDraggedVisualIdx] = useState<number | null>(null);
  const [dragOverVisualIdx, setDragOverVisualIdx] = useState<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const visualRows = items.map((item, idx) => ({
    item,
    arrayIndex: idx,
  })).reverse();

  const hasLocked = items.some((i) => i.locked) || Boolean(card.locked);
  const hasHidden = items.some((i) => i.hidden) || !card.visibleOnStage || wrapStyle === 'plain';

  const commitVisualReorder = (fromVisual: number, toVisual: number) => {
    if (fromVisual === toVisual) return;
    const fromArrayIndex = items.length - 1 - fromVisual;
    const toArrayIndex = items.length - 1 - toVisual;
    reorderItems(fromArrayIndex, toArrayIndex);
  };

  const handleDragStart = (e: React.DragEvent, visualIdx: number) => {
    setDraggedVisualIdx(visualIdx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(visualIdx));
  };

  const handleDragOver = (e: React.DragEvent, visualIdx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverVisualIdx !== visualIdx) {
      setDragOverVisualIdx(visualIdx);
    }
  };

  const handleDrop = (e: React.DragEvent, toVisualIdx: number) => {
    e.preventDefault();
    if (draggedVisualIdx !== null && draggedVisualIdx !== toVisualIdx) {
      commitVisualReorder(draggedVisualIdx, toVisualIdx);
    }
    setDraggedVisualIdx(null);
    setDragOverVisualIdx(null);
  };

  const handleDragEnd = () => {
    setDraggedVisualIdx(null);
    setDragOverVisualIdx(null);
  };

  const isWrapVisible = wrapStyle !== 'plain';
  const activeWrapMeta =
    WRAPPER_CATALOG.find((w) => w.id === (isWrapVisible ? wrapStyle : lastNonPlainWrapStyle)) ||
    WRAPPER_CATALOG[0];

  return (
    <div
      className={isEmbeddedInSidebar ? 'space-y-2' : 'space-y-2.5'}
      role="region"
      aria-label="Layers"
    >
      {/* Quiet Top Summary Row (Only shown when actions are relevant or embedded) */}
      {(isEmbeddedInSidebar || hasLocked || hasHidden) && (
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-xs font-medium text-[#7D6B60] dark:text-[#C2B0A6]">
            {items.length} {items.length === 1 ? 'stem' : 'stems'}
          </span>
          <div className="flex items-center gap-1.5">
            {hasHidden && (
              <button
                type="button"
                onClick={() => {
                  showAllItems();
                  if (!card.visibleOnStage) updateCard({ visibleOnStage: true });
                  if (wrapStyle === 'plain') toggleWrapVisibility();
                }}
                className="text-[11px] font-medium px-2.5 py-0.5 rounded-full border border-dashed border-[#DECBB9] dark:border-[#5C4B47] text-[#5C4438] dark:text-[#E6D6C7] hover:bg-[#FAF4EE] dark:hover:bg-[#3A302C] transition cursor-pointer"
              >
                Show all
              </button>
            )}
            {hasLocked && (
              <button
                type="button"
                onClick={() => {
                  unlockAllItems();
                  if (card.locked) updateCard({ locked: false });
                }}
                className="text-[11px] font-medium px-2.5 py-0.5 rounded-full border border-dashed border-[#DECBB9] dark:border-[#5C4B47] text-[#5C4438] dark:text-[#E6D6C7] hover:bg-[#FAF4EE] dark:hover:bg-[#3A302C] transition cursor-pointer"
              >
                Unlock all
              </button>
            )}
          </div>
        </div>
      )}

      {/* Unified Layer Stack */}
      <div
        role="list"
        aria-label="Bouquet layers from front to back"
        className={`space-y-1.5 ${
          isEmbeddedInSidebar
            ? ''
            : 'max-h-[260px] sm:max-h-[310px] overflow-y-auto pr-0.5'
        }`}
      >
        {/* 1. Pinned Greeting Card Layer */}
        <div
          role="listitem"
          className={`group flex items-center gap-2.5 px-2.5 py-2 rounded-xl border border-dashed transition-all select-none ${
            !card.visibleOnStage ? 'opacity-50' : ''
          } bg-[#FAF4EE]/60 dark:bg-[#2E2522]/75 border-[#E2D1C1] dark:border-[#52433E]`}
        >
          <div className="w-3.5 shrink-0" aria-hidden="true" />
          <div className="w-7 h-7 rounded-lg bg-[#FFFDF9] dark:bg-[#231C19] border border-[#E6D6C7] dark:border-[#4A3C38] flex items-center justify-center shrink-0">
            <Mail className="w-3.5 h-3.5 text-[#B4846C]" />
          </div>
          <span className="flex-1 min-w-0 text-xs font-medium text-[#2A201D] dark:text-[#FBF6F1] truncate">
            Greeting Card
          </span>
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => updateCard({ locked: !card.locked })}
              aria-label={card.locked ? 'Unlock Greeting Card' : 'Lock Greeting Card'}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                card.locked
                  ? 'text-[#B4846C] bg-[#B4846C]/12'
                  : 'text-[#9A877B] hover:text-[#2A201D] dark:hover:text-[#FBF6F1]'
              }`}
            >
              {card.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => updateCard({ visibleOnStage: !card.visibleOnStage })}
              aria-label={card.visibleOnStage ? 'Hide Greeting Card' : 'Show Greeting Card'}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                !card.visibleOnStage
                  ? 'text-[#B4846C] bg-[#B4846C]/12'
                  : 'text-[#9A877B] hover:text-[#2A201D] dark:hover:text-[#FBF6F1]'
              }`}
            >
              {card.visibleOnStage ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* 2. Draggable Flower, Foliage & Photocard Stems */}
        {visualRows.map(({ item }, visualIdx) => {
          const meta = FLOWER_CATALOG.find((m) => m.type === item.type);
          const photoMeta = item.photoStyle
            ? PHOTO_FRAME_CATALOG.find((p) => p.id === item.photoStyle)
            : undefined;
          const displayLabel =
            item.photoStyle === 'raw'
              ? 'Uploaded Photo'
              : photoMeta?.label || meta?.name || item.type;
          const isSelected = item.id === selectedId;
          const isLocked = Boolean(item.locked);
          const isHidden = Boolean(item.hidden);
          const isDragging = draggedVisualIdx === visualIdx;
          const isDragOver = dragOverVisualIdx === visualIdx && draggedVisualIdx !== visualIdx;

          return (
            <div
              key={item.id}
              role="listitem"
              draggable
              onDragStart={(e) => handleDragStart(e, visualIdx)}
              onDragOver={(e) => handleDragOver(e, visualIdx)}
              onDrop={(e) => handleDrop(e, visualIdx)}
              onDragEnd={handleDragEnd}
              onTouchStart={(e) => {
                touchStartYRef.current = e.touches[0]?.clientY ?? null;
              }}
              onTouchEnd={(e) => {
                if (touchStartYRef.current === null) return;
                const endY = e.changedTouches[0]?.clientY ?? touchStartYRef.current;
                const dy = endY - touchStartYRef.current;
                if (Math.abs(dy) > 28) {
                  if (dy < 0 && visualIdx > 0) {
                    commitVisualReorder(visualIdx, visualIdx - 1);
                  } else if (dy > 0 && visualIdx < visualRows.length - 1) {
                    commitVisualReorder(visualIdx, visualIdx + 1);
                  }
                }
                touchStartYRef.current = null;
              }}
              onClick={() => {
                selectItem(item.id);
                onSelectStem?.(item.id);
              }}
              className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-xl border transition-all cursor-pointer select-none ${
                isDragging ? 'opacity-40 scale-[0.98]' : ''
              } ${
                isDragOver
                  ? 'border-[#B4846C] bg-[#B4846C]/10'
                  : isSelected
                  ? 'border-[#B4846C] bg-[#FAF4EE] dark:bg-[#3D322E]'
                  : 'border-dashed border-[#E2D1C1] dark:border-[#52433E] bg-[#FFFDF9]/90 dark:bg-[#2A221F]/80 hover:border-[#CFAF97]'
              } ${isHidden ? 'opacity-50' : ''}`}
            >
              <span
                className="text-[#B8A59B] dark:text-[#7D6B60] cursor-grab active:cursor-grabbing shrink-0"
                title="Drag to reorder"
              >
                <GripVertical className="w-3.5 h-3.5" />
              </span>

              <div className="w-7 h-7 rounded-lg bg-[#FAF4EE] dark:bg-[#231C19] border border-[#E6D6C7] dark:border-[#4A3C38] flex items-center justify-center shrink-0 overflow-hidden">
                {item.photoStyle ? (
                  <MiniPhotoFrameSVG
                    styleType={item.photoStyle}
                    frameColor={item.petalColor}
                    accentColor={item.centerColor}
                  />
                ) : (
                  <svg viewBox="-55 -62 110 124" className="w-6 h-6">
                    <FlowerRenderer
                      type={item.type}
                      petalColor={item.petalColor}
                      centerColor={item.centerColor}
                    />
                  </svg>
                )}
              </div>

              <span className="flex-1 min-w-0 text-xs font-medium text-[#2A201D] dark:text-[#FBF6F1] truncate">
                {displayLabel}
              </span>

              <div
                className="flex items-center gap-0.5 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  disabled={
                    visualIdx === visualRows.length - 1 &&
                    getEffectiveItemPlane(item) === 'back'
                  }
                  onClick={() => moveItemLayer(item.id, 'back')}
                  title="Send Behind / Inside Bouquet"
                  aria-label={`Move ${displayLabel} to most back`}
                  className="p-1 rounded-lg text-[#9A877B] hover:text-[#2A201D] dark:hover:text-[#FBF6F1] disabled:opacity-25 transition cursor-pointer"
                >
                  <LayerOrderBoxIcon direction="back" className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={
                    visualIdx === visualRows.length - 1 &&
                    getEffectiveItemPlane(item) === 'back'
                  }
                  onClick={() => moveItemLayer(item.id, 'down')}
                  title="Send Back 1 Layer"
                  aria-label={`Move ${displayLabel} backward`}
                  className="p-1 rounded-lg text-[#9A877B] hover:text-[#2A201D] dark:hover:text-[#FBF6F1] disabled:opacity-25 transition cursor-pointer"
                >
                  <LayerOrderBoxIcon direction="down" className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={
                    visualIdx === 0 &&
                    getEffectiveItemPlane(item) === 'front'
                  }
                  onClick={() => moveItemLayer(item.id, 'up')}
                  title="Bring Forward 1 Layer"
                  aria-label={`Move ${displayLabel} forward`}
                  className="p-1 rounded-lg text-[#9A877B] hover:text-[#2A201D] dark:hover:text-[#FBF6F1] disabled:opacity-25 transition cursor-pointer"
                >
                  <LayerOrderBoxIcon direction="up" className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={
                    visualIdx === 0 &&
                    getEffectiveItemPlane(item) === 'front'
                  }
                  onClick={() => moveItemLayer(item.id, 'front')}
                  title="Bring to Overlay / Front of Bouquet"
                  aria-label={`Move ${displayLabel} to most front`}
                  className="p-1 rounded-lg text-[#9A877B] hover:text-[#2A201D] dark:hover:text-[#FBF6F1] disabled:opacity-25 transition cursor-pointer"
                >
                  <LayerOrderBoxIcon direction="front" className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => toggleItemLock(item.id)}
                  aria-label={isLocked ? `Unlock ${displayLabel}` : `Lock ${displayLabel}`}
                  className={`p-1 rounded-lg transition cursor-pointer ${
                    isLocked
                      ? 'text-[#B4846C] bg-[#B4846C]/12'
                      : 'text-[#9A877B] hover:text-[#2A201D] dark:hover:text-[#FBF6F1]'
                  }`}
                >
                  {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => toggleItemHidden(item.id)}
                  aria-label={isHidden ? `Show ${displayLabel}` : `Hide ${displayLabel}`}
                  className={`p-1 rounded-lg transition cursor-pointer ${
                    isHidden
                      ? 'text-[#B4846C] bg-[#B4846C]/12'
                      : 'text-[#9A877B] hover:text-[#2A201D] dark:hover:text-[#FBF6F1]'
                  }`}
                >
                  {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => deleteItemById(item.id)}
                  aria-label={`Delete ${displayLabel}`}
                  className="p-1 rounded-lg text-[#9A877B] hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {/* 3. Base Bouquet Wrap Layer */}
        <div
          role="listitem"
          className={`group flex items-center gap-2.5 px-2.5 py-2 rounded-xl border border-dashed transition-all select-none ${
            !isWrapVisible ? 'opacity-50' : ''
          } bg-[#FAF4EE]/60 dark:bg-[#2E2522]/75 border-[#E2D1C1] dark:border-[#52433E]`}
        >
          <div className="w-3.5 shrink-0" aria-hidden="true" />
          <div
            className="w-7 h-7 rounded-lg border border-[#E6D6C7] dark:border-[#4A3C38] flex items-center justify-center shrink-0"
            style={{ backgroundColor: isWrapVisible ? wrapColor : '#E7DCD1' }}
          >
            <Package className="w-3.5 h-3.5 text-[#2A201D]/75" />
          </div>
          <span className="flex-1 min-w-0 text-xs font-medium text-[#2A201D] dark:text-[#FBF6F1] truncate">
            {isWrapVisible ? activeWrapMeta.label : 'Hand-Tied Wrap'}
          </span>
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => toggleWrapVisibility()}
              aria-label={isWrapVisible ? 'Hide Bouquet Wrap' : 'Show Bouquet Wrap'}
              className={`p-1.5 rounded-lg transition cursor-pointer ${
                !isWrapVisible
                  ? 'text-[#B4846C] bg-[#B4846C]/12'
                  : 'text-[#9A877B] hover:text-[#2A201D] dark:hover:text-[#FBF6F1]'
              }`}
            >
              {isWrapVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
