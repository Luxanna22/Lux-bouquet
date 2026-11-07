import React, { useState, useRef, useEffect } from 'react';
import {
  Trash2,
  Copy,
  FlipHorizontal,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  Palette,
  Layers,
  PenLine,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  RotateCcw,
  Sliders,
  ChevronDown,
  Maximize2,
  RotateCw,
  Plus,
} from 'lucide-react';
import {
  BouquetItem,
  FLOWER_CATALOG,
  ROMANTIC_SWATCHES,
  RIBBON_SWATCHES,
  CARD_COLOR_SWATCHES,
  getCardThemePalette,
} from '../types/bouquet';
import { FlowerRenderer } from './flowers/FlowerRenderer';
import {
  MiniWrapConeSVG,
  MiniRibbonBowSVG,
  MiniCardShapeSVG,
  MiniVoiceKeepsakeSVG,
} from './MiniThumbnails';
import { useBouquetStore } from '../store/useBouquetStore';

// ============================================================================
// MODULE 6: components/SelectedFlowerToolbar.tsx — FLOATING INSPECTOR & COLOR PICKER
// ============================================================================

export type UnifiedColorTarget =
  | 'petal'
  | 'center'
  | 'wrapper'
  | 'ribbon'
  | 'card'
  | 'cardAccent'
  | 'voicePrimary'
  | 'voiceAccent';

const CANVA_PALETTE_SWATCHES: string[] = Array.from(
  new Set([
    ...ROMANTIC_SWATCHES.map((h) => h.toLowerCase()),
    ...CARD_COLOR_SWATCHES.map((h) => h.toLowerCase()),
  ])
);

export interface SelectedFlowerToolbarProps {
  isDrawerOpen?: boolean;
  onRequestCollapseDrawer?: () => void;
  mobileSheetMode?: 'color' | 'stem' | 'layers' | 'full';
  activeColorTarget?: UnifiedColorTarget;
  onColorTargetChange?: (target: UnifiedColorTarget) => void;
  onCloseMobileSheet?: () => void;
  onOpenLayerManager?: () => void;
}

export const SelectedFlowerToolbar: React.FC<SelectedFlowerToolbarProps> = ({
  isDrawerOpen = false,
  onRequestCollapseDrawer,
  mobileSheetMode = 'full',
  activeColorTarget,
  onColorTargetChange,
  onCloseMobileSheet,
  onOpenLayerManager
}) => {
  const {
    items,
    selectedId,
    wrapStyle,
    lastNonPlainWrapStyle,
    wrapColor,
    ribbonColor,
    ribbonStyle,
    card,
    voice,
    setWrapStyle,
    setWrapColor,
    setRibbonColor,
    updateCard,
    updateVoice,
    updateItem,
    duplicateSelected,
    deleteSelected,
    flipSelected,
    bringForward,
    sendBackward,
    toggleItemLock,
    toggleItemHidden,
    selectItem,
    commitHistorySnapshot
  } = useBouquetStore();

  const [colorTarget, setColorTarget] = useState<'petal' | 'center'>('petal');
  const [unifiedTarget, setUnifiedTarget] = useState<UnifiedColorTarget>('petal');
  const [isMinimized, setIsMinimized] = useState(false);
  const isSliderDraggingRef = useRef(false);

  const effectiveUnifiedTarget = activeColorTarget ?? unifiedTarget;
  const setEffectiveUnifiedTarget = (target: UnifiedColorTarget) => {
    setUnifiedTarget(target);
    onColorTargetChange?.(target);
  };

  useEffect(() => {
    isSliderDraggingRef.current = false;
  }, [selectedId]);

  const handleSliderChange = (patch: Partial<BouquetItem>) => {
    if (!isSliderDraggingRef.current) {
      commitHistorySnapshot();
      isSliderDraggingRef.current = true;
    }
    if (selectedId) {
      updateItem(selectedId, patch, false);
    }
  };

  const handleSliderPointerUp = () => {
    isSliderDraggingRef.current = false;
  };

  const selected = items.find((i) => i.id === selectedId);
  const meta = selected ? FLOWER_CATALOG.find((m) => m.type === selected.type) : undefined;

  // Canva-Style Color Editor: Detects colors on active Flower, Card, Voice Keepsake, Wrapper & Ribbon
  if (mobileSheetMode === 'color') {
    const targetFlower =
      selected || [...items].reverse().find((i) => !i.hidden && !i.locked) || null;

    const cardPalette = getCardThemePalette(card.theme, card.customBg, card.customAccent);
    const cardBgHex = cardPalette.bg;
    const cardAccentHex = cardPalette.seal;

    const getActiveColorForTarget = (t: UnifiedColorTarget): string => {
      if (t === 'petal') return targetFlower?.petalColor || '#f43f5e';
      if (t === 'center') return targetFlower?.centerColor || '#fbbf24';
      if (t === 'wrapper') return wrapColor;
      if (t === 'ribbon') return ribbonColor;
      if (t === 'cardAccent') return cardAccentHex;
      if (t === 'voicePrimary') return voice.primaryColor || '#f43f5e';
      if (t === 'voiceAccent') return voice.accentColor || '#fef3c7';
      return cardBgHex;
    };

    const currentTargetHex = getActiveColorForTarget(effectiveUnifiedTarget);
    const isStemTargetDisabled =
      (effectiveUnifiedTarget === 'petal' || effectiveUnifiedTarget === 'center') &&
      (!targetFlower || Boolean(targetFlower.locked));

    const applyUnifiedColor = (hex: string) => {
      if (effectiveUnifiedTarget === 'wrapper') {
        if (wrapStyle === 'plain') {
          setWrapStyle(lastNonPlainWrapStyle || 'kraft');
        }
        setWrapColor(hex);
        return;
      }
      if (effectiveUnifiedTarget === 'ribbon') {
        setRibbonColor(hex);
        return;
      }
      if (effectiveUnifiedTarget === 'card') {
        updateCard({ customBg: hex, visibleOnStage: true });
        return;
      }
      if (effectiveUnifiedTarget === 'cardAccent') {
        updateCard({ customAccent: hex, visibleOnStage: true });
        return;
      }
      if (effectiveUnifiedTarget === 'voicePrimary') {
        updateVoice({ primaryColor: hex, visibleOnStage: true });
        return;
      }
      if (effectiveUnifiedTarget === 'voiceAccent') {
        updateVoice({ accentColor: hex, visibleOnStage: true });
        return;
      }
      // Detected Flower Slot 1 (petalColor) or Slot 2 (centerColor)
      if (!targetFlower || targetFlower.locked) return;
      if (!selected) {
        selectItem(targetFlower.id);
      }
      updateItem(
        targetFlower.id,
        effectiveUnifiedTarget === 'petal' ? { petalColor: hex } : { centerColor: hex },
        true
      );
    };

    const renderDetectedTile = (
      targetId: UnifiedColorTarget,
      hex: string,
      ariaName: string,
      onBeforeSelect?: () => void
    ) => {
      const isActive = effectiveUnifiedTarget === targetId;
      return (
        <button
          key={targetId}
          type="button"
          onClick={() => {
            onBeforeSelect?.();
            setEffectiveUnifiedTarget(targetId);
          }}
          aria-label={ariaName}
          aria-pressed={isActive}
          className={`w-7 h-7 rounded-full border transition-all flex items-center justify-center shrink-0 ${
            isActive
              ? 'ring-2 ring-[#1C1917] dark:ring-white ring-offset-2 dark:ring-offset-[#1E1C1A] border-white scale-105 shadow-xs'
              : 'border-stone-300/90 dark:border-stone-600 hover:scale-105'
          }`}
          style={{ backgroundColor: hex }}
        />
      );
    };

    const isFlowerMode =
      (effectiveUnifiedTarget === 'petal' || effectiveUnifiedTarget === 'center') &&
      Boolean(targetFlower);
    const isCardMode =
      effectiveUnifiedTarget === 'card' || effectiveUnifiedTarget === 'cardAccent';
    const isVoiceMode =
      effectiveUnifiedTarget === 'voicePrimary' || effectiveUnifiedTarget === 'voiceAccent';
    const isRibbonMode = effectiveUnifiedTarget === 'ribbon';
    // Default / fallback mode when not flower, card, voice, or ribbon is wrapper
    const isWrapperMode = !isFlowerMode && !isCardMode && !isVoiceMode && !isRibbonMode;

    return (
      <div className="space-y-3" role="region" aria-label="Unified Color Picker">
        {/* SINGLE DYNAMIC DETECTED-COLOR BAR (Shows just the active item's pic + its detected colors!) */}
        <div className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-2xl bg-stone-50/90 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700/80">
          {/* Left: Just the active item's miniature picture (no long name label) */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white dark:bg-[#1E1C1A] border border-stone-200/80 dark:border-stone-700 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
              {isFlowerMode && targetFlower ? (
                <svg viewBox="-55 -62 110 124" className="w-7 h-7">
                  <FlowerRenderer
                    type={targetFlower.type}
                    petalColor={targetFlower.petalColor}
                    centerColor={targetFlower.centerColor}
                  />
                </svg>
              ) : isCardMode ? (
                <MiniCardShapeSVG
                  theme={card.theme}
                  customBg={card.customBg}
                  customAccent={card.customAccent}
                />
              ) : isVoiceMode ? (
                <MiniVoiceKeepsakeSVG
                  styleType={voice.style}
                  primaryColor={voice.primaryColor}
                  accentColor={voice.accentColor}
                />
              ) : isRibbonMode ? (
                <MiniRibbonBowSVG
                  hex={ribbonColor}
                  styleType={ribbonStyle || 'satin'}
                />
              ) : (
                <MiniWrapConeSVG
                  styleType={wrapStyle}
                  color={wrapColor}
                  ribbon={ribbonColor}
                />
              )}
            </div>
          </div>

          {/* Right: Detected Color Circles for that Active Item */}
          <div className="flex items-center gap-2 shrink-0">
            {isFlowerMode && targetFlower && (
              <>
                {renderDetectedTile(
                  'petal',
                  targetFlower.petalColor,
                  `Detected flower color 1 (${targetFlower.petalColor})`,
                  () => {
                    if (!selected) selectItem(targetFlower.id);
                  }
                )}
                {renderDetectedTile(
                  'center',
                  targetFlower.centerColor,
                  `Detected flower color 2 (${targetFlower.centerColor})`,
                  () => {
                    if (!selected) selectItem(targetFlower.id);
                  }
                )}
              </>
            )}

            {isCardMode && (
              <>
                {renderDetectedTile(
                  'card',
                  cardBgHex,
                  `Detected card color 1 (${cardBgHex})`
                )}
                {renderDetectedTile(
                  'cardAccent',
                  cardAccentHex,
                  `Detected card color 2 (${cardAccentHex})`
                )}
              </>
            )}

            {isVoiceMode && (
              <>
                {renderDetectedTile(
                  'voicePrimary',
                  voice.primaryColor,
                  `Detected voice keepsake color 1 (${voice.primaryColor})`
                )}
                {renderDetectedTile(
                  'voiceAccent',
                  voice.accentColor,
                  `Detected voice keepsake color 2 (${voice.accentColor})`
                )}
              </>
            )}

            {isRibbonMode &&
              renderDetectedTile(
                'ribbon',
                ribbonColor,
                `Detected ribbon color (${ribbonColor})`
              )}

            {isWrapperMode &&
              renderDetectedTile(
                'wrapper',
                wrapColor,
                `Detected wrapper color (${wrapColor})`
              )}
          </div>
        </div>

        {/* CANVA-STYLE PALETTE GRID (First tile is the Rainbow '+' Custom Color Picker) */}
        <div className="pt-2 border-t border-stone-200/80 dark:border-stone-800">
          <div className="grid grid-cols-5 gap-2.5">
            {/* Canva-style Rainbow '+' Custom Color Tile */}
            <label
              title="Add or pick custom color"
              className="w-9 h-9 rounded-full mx-auto border border-stone-200 dark:border-stone-700 flex items-center justify-center cursor-pointer relative overflow-hidden shadow-2xs hover:scale-105 transition-transform"
              style={{
                background:
                  'conic-gradient(from 0deg, #f43f5e, #f97316, #eab308, #22c55e, #3b82f6, #a855f7, #ec4899, #f43f5e)'
              }}
            >
              <span className="w-4 h-4 rounded-full bg-white/90 dark:bg-[#1E1C1A]/90 flex items-center justify-center shadow-2xs pointer-events-none">
                <Plus className="w-3 h-3 text-[#1C1917] dark:text-white" />
              </span>
              <input
                type="color"
                disabled={isStemTargetDisabled}
                value={currentTargetHex}
                onChange={(e) => applyUnifiedColor(e.target.value)}
                aria-label={`Pick custom ${effectiveUnifiedTarget} color`}
                className="sr-only"
              />
            </label>

            {CANVA_PALETTE_SWATCHES.map((hex) => {
              const isMatch = currentTargetHex.toLowerCase() === hex.toLowerCase();
              return (
                <button
                  key={hex}
                  type="button"
                  disabled={isStemTargetDisabled}
                  onClick={() => applyUnifiedColor(hex)}
                  aria-label={`Set ${effectiveUnifiedTarget} color ${hex}`}
                  className={`w-9 h-9 rounded-full mx-auto border transition-transform disabled:opacity-40 ${
                    isMatch
                      ? 'scale-110 ring-2 ring-[#B4846C] ring-offset-2 border-white'
                      : 'border-stone-200 dark:border-stone-700 hover:scale-105'
                  }`}
                  style={{ backgroundColor: hex }}
                />
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Dedicated Stem / Object Adjust Mode (Stem Length, Size, Tilt & Quick Actions for Flowers, Cards & Voice Keepsakes)
  if (mobileSheetMode === 'stem') {
    const isCardTargetActive =
      !selected && (effectiveUnifiedTarget === 'card' || effectiveUnifiedTarget === 'cardAccent');
    const isVoiceTargetActive =
      !selected &&
      (effectiveUnifiedTarget === 'voicePrimary' || effectiveUnifiedTarget === 'voiceAccent');

    if (isCardTargetActive && card.visibleOnStage) {
      const cardScalePct = Math.round((card.scale ?? 1) * 100);
      const cardTilt = Math.round(card.rotation ?? 0);
      const cardPalette = getCardThemePalette(card.theme, card.customBg, card.customAccent);
      return (
        <div className="space-y-3" role="region" aria-label="Card Adjust Settings">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-stone-200/80 dark:border-stone-800">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-3.5 h-3.5 rounded-full border border-stone-300 dark:border-stone-600 shrink-0"
                style={{ backgroundColor: cardPalette.seal }}
              />
              <span className="text-xs font-semibold text-[#1C1917] dark:text-stone-100 truncate">
                Greeting Card
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => updateCard({ scale: 1, rotation: 0 })}
                className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200/80 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition"
                title="Reset Card Size & Tilt"
                aria-label="Reset Card Size and Tilt"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => updateCard({ visibleOnStage: false })}
                className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200/80 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition"
                title="Hide Card Tag"
                aria-label="Hide Card Tag"
              >
                <EyeOff className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between text-stone-700 dark:text-stone-300 mb-1 font-medium tabular-nums">
                <span className="text-stone-600 dark:text-stone-400">Size</span>
                <span>{cardScalePct}%</span>
              </div>
              <input
                type="range"
                min="60"
                max="175"
                value={cardScalePct}
                onChange={(e) => {
                  if (!isSliderDraggingRef.current) {
                    commitHistorySnapshot();
                    isSliderDraggingRef.current = true;
                  }
                  updateCard({ scale: Number(e.target.value) / 100 });
                }}
                onPointerUp={handleSliderPointerUp}
                onPointerCancel={handleSliderPointerUp}
                onBlur={handleSliderPointerUp}
                aria-label="Card Size"
                className="w-full accent-[#B4846C] h-2 bg-stone-100 dark:bg-stone-800 rounded-lg cursor-pointer touch-none"
              />
            </div>

            <div>
              <div className="flex justify-between text-stone-700 dark:text-stone-300 mb-1 font-medium tabular-nums">
                <span className="text-stone-600 dark:text-stone-400">Tilt</span>
                <span>{cardTilt > 0 ? `+${cardTilt}°` : `${cardTilt}°`}</span>
              </div>
              <input
                type="range"
                min="-140"
                max="140"
                value={cardTilt}
                onChange={(e) => {
                  if (!isSliderDraggingRef.current) {
                    commitHistorySnapshot();
                    isSliderDraggingRef.current = true;
                  }
                  updateCard({ rotation: Number(e.target.value) });
                }}
                onPointerUp={handleSliderPointerUp}
                onPointerCancel={handleSliderPointerUp}
                onBlur={handleSliderPointerUp}
                aria-label="Card Rotation"
                className="w-full accent-[#B4846C] h-2 bg-stone-100 dark:bg-stone-800 rounded-lg cursor-pointer touch-none"
              />
            </div>
          </div>
        </div>
      );
    }

    if (isVoiceTargetActive && voice.visibleOnStage) {
      const voiceScalePct = Math.round((voice.scale ?? 1) * 100);
      const voiceTilt = Math.round(voice.rotation ?? 0);
      return (
        <div className="space-y-3" role="region" aria-label="Voice Keepsake Adjust Settings">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-stone-200/80 dark:border-stone-800">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-3.5 h-3.5 rounded-full border border-stone-300 dark:border-stone-600 shrink-0"
                style={{ backgroundColor: voice.primaryColor }}
              />
              <span className="text-xs font-semibold text-[#1C1917] dark:text-stone-100 truncate">
                Voice Keepsake
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => updateVoice({ scale: 1, rotation: 0 })}
                className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200/80 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition"
                title="Reset Voice Keepsake Size & Tilt"
                aria-label="Reset Voice Keepsake Size and Tilt"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => updateVoice({ visibleOnStage: false })}
                className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200/80 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition"
                title="Hide Voice Keepsake"
                aria-label="Hide Voice Keepsake"
              >
                <EyeOff className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between text-stone-700 dark:text-stone-300 mb-1 font-medium tabular-nums">
                <span className="text-stone-600 dark:text-stone-400">Size</span>
                <span>{voiceScalePct}%</span>
              </div>
              <input
                type="range"
                min="60"
                max="175"
                value={voiceScalePct}
                onChange={(e) => {
                  if (!isSliderDraggingRef.current) {
                    commitHistorySnapshot();
                    isSliderDraggingRef.current = true;
                  }
                  updateVoice({ scale: Number(e.target.value) / 100 });
                }}
                onPointerUp={handleSliderPointerUp}
                onPointerCancel={handleSliderPointerUp}
                onBlur={handleSliderPointerUp}
                aria-label="Voice Keepsake Size"
                className="w-full accent-[#B4846C] h-2 bg-stone-100 dark:bg-stone-800 rounded-lg cursor-pointer touch-none"
              />
            </div>

            <div>
              <div className="flex justify-between text-stone-700 dark:text-stone-300 mb-1 font-medium tabular-nums">
                <span className="text-stone-600 dark:text-stone-400">Tilt</span>
                <span>{voiceTilt > 0 ? `+${voiceTilt}°` : `${voiceTilt}°`}</span>
              </div>
              <input
                type="range"
                min="-140"
                max="140"
                value={voiceTilt}
                onChange={(e) => {
                  if (!isSliderDraggingRef.current) {
                    commitHistorySnapshot();
                    isSliderDraggingRef.current = true;
                  }
                  updateVoice({ rotation: Number(e.target.value) });
                }}
                onPointerUp={handleSliderPointerUp}
                onPointerCancel={handleSliderPointerUp}
                onBlur={handleSliderPointerUp}
                aria-label="Voice Keepsake Rotation"
                className="w-full accent-[#B4846C] h-2 bg-stone-100 dark:bg-stone-800 rounded-lg cursor-pointer touch-none"
              />
            </div>
          </div>
        </div>
      );
    }

    if (!selected) {
      return (
        <div className="py-6 text-center space-y-1.5" role="region" aria-label="Stem Settings">
          <Sliders className="w-5 h-5 mx-auto text-[#B4846C]/70" />
          <p className="text-xs font-medium text-stone-700 dark:text-stone-200">
            No item selected
          </p>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 px-2">
            Tap any flower, greeting card, or voice keepsake on the canvas to adjust its size and tilt.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3" role="region" aria-label="Stem Settings">
        {/* Selected Stem Header + Quick Actions */}
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-stone-200/80 dark:border-stone-800">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-3.5 h-3.5 rounded-full border border-stone-300 dark:border-stone-600 shrink-0"
              style={{ backgroundColor: selected.petalColor }}
            />
            <span className="text-xs font-semibold text-[#1C1917] dark:text-stone-100 truncate">
              {meta?.name || selected.type}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={flipSelected}
              disabled={Boolean(selected.locked)}
              className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200/80 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 disabled:opacity-30 transition"
              title="Flip Horizontally"
              aria-label="Flip Flower Horizontally"
            >
              <FlipHorizontal className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={duplicateSelected}
              className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200/80 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition"
              title="Duplicate Stem"
              aria-label="Duplicate Flower"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => toggleItemLock(selected.id)}
              className={`p-1.5 rounded-lg transition ${
                selected.locked
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                  : 'bg-stone-100 hover:bg-stone-200/80 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300'
              }`}
              title={selected.locked ? 'Unlock Flower' : 'Lock Flower'}
              aria-label={selected.locked ? 'Unlock Flower' : 'Lock Flower'}
            >
              {selected.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={deleteSelected}
              disabled={Boolean(selected.locked)}
              className="p-1.5 rounded-lg bg-stone-100 hover:bg-red-50 text-stone-500 hover:text-red-500 dark:bg-stone-800 dark:hover:bg-red-950/40 dark:text-stone-400 dark:hover:text-red-400 disabled:opacity-30 transition"
              title="Remove Stem"
              aria-label="Delete Flower"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Sliders for Stem Length, Size & Tilt */}
        <div className="space-y-3 text-xs">
          <div>
            <div className="flex justify-between text-stone-700 dark:text-stone-300 mb-1 font-medium tabular-nums">
              <span className="text-stone-600 dark:text-stone-400">Stem Length</span>
              <span>{Math.round((selected.stemLength ?? 1) * 100)}%</span>
            </div>
            <input
              type="range"
              min="15"
              max="130"
              disabled={Boolean(selected.locked)}
              value={Math.round((selected.stemLength ?? 1) * 100)}
              onChange={(e) =>
                handleSliderChange({ stemLength: Number(e.target.value) / 100 })
              }
              onPointerUp={handleSliderPointerUp}
              onPointerCancel={handleSliderPointerUp}
              onBlur={handleSliderPointerUp}
              aria-label="Flower Stem Length"
              className="w-full accent-[#B4846C] h-2 bg-stone-100 dark:bg-stone-800 rounded-lg cursor-pointer touch-none disabled:opacity-40"
            />
          </div>

          <div>
            <div className="flex justify-between text-stone-700 dark:text-stone-300 mb-1 font-medium tabular-nums">
              <span className="text-stone-600 dark:text-stone-400">Size</span>
              <span>{Math.round(selected.scale * 100)}%</span>
            </div>
            <input
              type="range"
              min="45"
              max="200"
              disabled={Boolean(selected.locked)}
              value={Math.round(selected.scale * 100)}
              onChange={(e) =>
                handleSliderChange({ scale: Number(e.target.value) / 100 })
              }
              onPointerUp={handleSliderPointerUp}
              onPointerCancel={handleSliderPointerUp}
              onBlur={handleSliderPointerUp}
              aria-label="Flower Size"
              className="w-full accent-[#B4846C] h-2 bg-stone-100 dark:bg-stone-800 rounded-lg cursor-pointer touch-none disabled:opacity-40"
            />
          </div>

          <div>
            <div className="flex justify-between text-stone-700 dark:text-stone-300 mb-1 font-medium tabular-nums">
              <span className="text-stone-600 dark:text-stone-400">Tilt</span>
              <span>{selected.rotation}°</span>
            </div>
            <input
              type="range"
              min="-140"
              max="140"
              disabled={Boolean(selected.locked)}
              value={selected.rotation}
              onChange={(e) =>
                handleSliderChange({ rotation: Number(e.target.value) })
              }
              onPointerUp={handleSliderPointerUp}
              onPointerCancel={handleSliderPointerUp}
              onBlur={handleSliderPointerUp}
              aria-label="Flower Rotation Angle"
              className="w-full accent-[#B4846C] h-2 bg-stone-100 dark:bg-stone-800 rounded-lg cursor-pointer touch-none disabled:opacity-40"
            />
          </div>
        </div>
      </div>
    );
  }

  if (!selected) return null;

  const shouldMinimize = isMinimized || (isDrawerOpen && typeof window !== 'undefined' && window.innerWidth < 1024 && mobileSheetMode === 'full');

  if (shouldMinimize) {
    return (
      <div
        className="bg-white/95 dark:bg-[#1E1C1A]/95 backdrop-blur-md border border-stone-200 dark:border-stone-800 rounded-2xl p-2 sm:p-2.5 shadow-lg flex items-center justify-between gap-2 w-full max-w-sm mx-auto transition-all animate-in fade-in"
        role="region"
        aria-label="Selected Flower Quick Controls"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-3.5 h-3.5 rounded-full border border-stone-300 dark:border-stone-600 shrink-0"
            style={{ backgroundColor: selected.petalColor }}
          />
          <span className="text-xs font-semibold text-[#1C1917] dark:text-stone-100 truncate">
            {meta?.name || selected.type}
          </span>
          <span className="text-[11px] text-stone-500 dark:text-stone-400 font-mono tabular-nums shrink-0">
            {Math.round(selected.scale * 100)}%
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => toggleItemLock(selected.id)}
            className={`p-1.5 rounded-lg transition ${
              selected.locked
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                : 'bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300'
            }`}
            title={selected.locked ? 'Unlock Flower' : 'Lock Flower'}
            aria-label={selected.locked ? 'Unlock Flower' : 'Lock Flower'}
          >
            {selected.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={flipSelected}
            disabled={Boolean(selected.locked)}
            className="p-1.5 rounded-lg bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 disabled:opacity-30 transition"
            title="Flip Horizontally"
            aria-label="Flip Flower Horizontally"
          >
            <FlipHorizontal className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={duplicateSelected}
            className="p-1.5 rounded-lg bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition"
            title="Duplicate Stem"
            aria-label="Duplicate Flower"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={deleteSelected}
            disabled={Boolean(selected.locked)}
            className="p-1.5 rounded-lg bg-stone-50 hover:bg-red-50 text-stone-500 hover:text-red-500 dark:bg-stone-800 dark:hover:bg-red-950/40 dark:text-stone-400 dark:hover:text-red-400 disabled:opacity-30 transition"
            title="Remove Stem (Delete)"
            aria-label="Delete Flower"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setIsMinimized(false);
              onRequestCollapseDrawer?.();
            }}
            className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-700 dark:hover:bg-stone-600 text-[#1C1917] dark:text-stone-100 transition"
            title="Expand Controls"
            aria-label="Expand Flower Controls"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              selectItem(null);
              onCloseMobileSheet?.();
            }}
            className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition"
            title="Deselect (Close)"
            aria-label="Deselect Flower"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-white/95 dark:bg-[#1E1C1A]/95 backdrop-blur-md border border-stone-200 dark:border-stone-800 rounded-2xl p-3 sm:p-3.5 shadow-lg flex flex-col gap-2.5 w-full max-w-md mx-auto transition-all animate-in fade-in"
      role="region"
      aria-label="Selected Flower Controls"
    >
      {/* Top Row: Name + Scale + Lock/Eye + Minimize + Close */}
      <div className="flex items-center justify-between gap-2 border-b border-stone-100 dark:border-stone-800 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-3.5 h-3.5 rounded-full border border-stone-300 dark:border-stone-600 shrink-0"
            style={{ backgroundColor: selected.petalColor }}
          />
          <span className="text-xs font-semibold text-[#1C1917] dark:text-stone-100 truncate">
            {meta?.name || selected.type}
          </span>
          <span className="text-[11px] text-stone-500 dark:text-stone-400 font-mono tabular-nums shrink-0">
            {Math.round(selected.scale * 100)}%
          </span>
          {selected.locked && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
              Locked
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => toggleItemLock(selected.id)}
            className={`p-1.5 rounded-lg transition ${
              selected.locked
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                : 'bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-500 hover:text-stone-700 dark:text-stone-400'
            }`}
            title={selected.locked ? 'Unlock Flower' : 'Lock Flower'}
            aria-label={selected.locked ? 'Unlock Flower' : 'Lock Flower'}
          >
            {selected.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => toggleItemHidden(selected.id)}
            className={`p-1.5 rounded-lg transition ${
              selected.hidden
                ? 'bg-rose-50 text-rose-500 dark:bg-rose-950/50 dark:text-rose-400'
                : 'bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-500 hover:text-stone-700 dark:text-stone-400'
            }`}
            title={selected.hidden ? 'Show Flower' : 'Hide Flower'}
            aria-label={selected.hidden ? 'Show Flower' : 'Hide Flower'}
          >
            {selected.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
          {onOpenLayerManager && (
            <button
              type="button"
              onClick={onOpenLayerManager}
              className="p-1.5 rounded-lg bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-[#B4846C] transition"
              title="Open All Layers Order"
              aria-label="Open All Layers Order"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (onCloseMobileSheet) {
                onCloseMobileSheet();
              } else {
                setIsMinimized(true);
              }
            }}
            className="p-1.5 sm:p-2 rounded-lg bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 transition"
            title="Minimize Inspector"
            aria-label="Minimize Flower Controls"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              selectItem(null);
              onCloseMobileSheet?.();
            }}
            className="p-1.5 sm:p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition"
            title="Deselect (Close)"
            aria-label="Deselect Flower"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Second Row: Layer Reordering & Quick Action Touch Buttons */}
      <div className="flex items-center justify-between gap-1 sm:gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={sendBackward}
            disabled={Boolean(selected.locked)}
            className="h-8 px-2.5 rounded-lg bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-medium flex items-center gap-1.5 disabled:opacity-30 transition"
            title="Send Backward"
            aria-label="Send Flower Backward"
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:inline">Back</span>
          </button>
          <button
            type="button"
            onClick={bringForward}
            disabled={Boolean(selected.locked)}
            className="h-8 px-2.5 rounded-lg bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-medium flex items-center gap-1.5 disabled:opacity-30 transition"
            title="Bring Forward"
            aria-label="Bring Flower Forward"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:inline">Forward</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={flipSelected}
            disabled={Boolean(selected.locked)}
            className="h-8 px-2.5 rounded-lg bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-medium flex items-center gap-1.5 disabled:opacity-30 transition"
            title="Flip Horizontally"
            aria-label="Flip Flower Horizontally"
          >
            <FlipHorizontal className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:inline">Flip</span>
          </button>
          <button
            type="button"
            onClick={duplicateSelected}
            className="h-8 px-2.5 rounded-lg bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-medium flex items-center gap-1.5 transition"
            title="Duplicate Stem"
            aria-label="Duplicate Flower"
          >
            <Copy className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:inline">Copy</span>
          </button>
          <button
            type="button"
            onClick={deleteSelected}
            disabled={Boolean(selected.locked)}
            className="h-8 px-2.5 rounded-lg bg-stone-50 hover:bg-red-50 text-stone-500 hover:text-red-500 dark:bg-stone-800 dark:hover:bg-red-950/40 dark:text-stone-400 dark:hover:text-red-400 text-xs font-medium flex items-center gap-1.5 disabled:opacity-30 transition"
            title="Remove Stem (Delete)"
            aria-label="Delete Flower"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:inline">Delete</span>
          </button>
        </div>
      </div>

      {/* Third Row: Scale, Rotation & Stem Length Sliders */}
      <div className="grid grid-cols-3 gap-2.5 text-[11px]">
        <div>
          <div className="flex justify-between text-stone-700 dark:text-stone-300 mb-1 font-medium tabular-nums">
            <span className="flex items-center gap-1 text-stone-600 dark:text-stone-400">
              <Maximize2 className="w-3 h-3 text-stone-500 dark:text-stone-400" /> Size
            </span>
            <span>{Math.round(selected.scale * 100)}%</span>
          </div>
          <input
            type="range"
            min="45"
            max="200"
            disabled={Boolean(selected.locked)}
            value={Math.round(selected.scale * 100)}
            onChange={(e) =>
              handleSliderChange({ scale: Number(e.target.value) / 100 })
            }
            onPointerUp={handleSliderPointerUp}
            onPointerCancel={handleSliderPointerUp}
            onBlur={handleSliderPointerUp}
            aria-label="Flower Size"
            className="w-full accent-[#B4846C] h-2 bg-stone-100 dark:bg-stone-800 rounded-lg cursor-pointer touch-none disabled:opacity-40"
          />
        </div>
        <div>
          <div className="flex justify-between text-stone-700 dark:text-stone-300 mb-1 font-medium tabular-nums">
            <span className="flex items-center gap-1 text-stone-600 dark:text-stone-400">
              <RotateCw className="w-3 h-3 text-stone-500 dark:text-stone-400" /> Tilt
            </span>
            <span>{selected.rotation}°</span>
          </div>
          <input
            type="range"
            min="-140"
            max="140"
            disabled={Boolean(selected.locked)}
            value={selected.rotation}
            onChange={(e) =>
              handleSliderChange({ rotation: Number(e.target.value) })
            }
            onPointerUp={handleSliderPointerUp}
            onPointerCancel={handleSliderPointerUp}
            onBlur={handleSliderPointerUp}
            aria-label="Flower Rotation Angle"
            className="w-full accent-[#B4846C] h-2 bg-stone-100 dark:bg-stone-800 rounded-lg cursor-pointer touch-none disabled:opacity-40"
          />
        </div>
        <div>
          <div className="flex justify-between text-stone-700 dark:text-stone-300 mb-1 font-medium tabular-nums">
            <span className="text-stone-600 dark:text-stone-400">Stem</span>
            <span>{Math.round((selected.stemLength ?? 1) * 100)}%</span>
          </div>
          <input
            type="range"
            min="15"
            max="130"
            disabled={Boolean(selected.locked)}
            value={Math.round((selected.stemLength ?? 1) * 100)}
            onChange={(e) =>
              handleSliderChange({ stemLength: Number(e.target.value) / 100 })
            }
            onPointerUp={handleSliderPointerUp}
            onPointerCancel={handleSliderPointerUp}
            onBlur={handleSliderPointerUp}
            aria-label="Flower Stem Length"
            className="w-full accent-[#B4846C] h-2 bg-stone-100 dark:bg-stone-800 rounded-lg cursor-pointer touch-none disabled:opacity-40"
          />
        </div>
      </div>

      {/* Fourth Row: Per-Flower Petal & Center Color Pickers */}
      {mobileSheetMode !== 'layers' && (
        <div className="space-y-1.5 pt-1 border-t border-stone-100 dark:border-stone-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setColorTarget('petal')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1.5 transition ${
                  colorTarget === 'petal'
                    ? 'bg-[#1C1917] text-white dark:bg-white dark:text-[#1C1917]'
                    : 'bg-stone-50 hover:bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full border border-white/50"
                  style={{ backgroundColor: selected.petalColor }}
                />
                Petals
              </button>
              <button
                type="button"
                onClick={() => setColorTarget('center')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1.5 transition ${
                  colorTarget === 'center'
                    ? 'bg-[#1C1917] text-white dark:bg-white dark:text-[#1C1917]'
                    : 'bg-stone-50 hover:bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full border border-white/50"
                  style={{ backgroundColor: selected.centerColor }}
                />
                Center
              </button>
            </div>

            {/* Native Custom Color Input */}
            <label className="flex items-center gap-1 text-[11px] text-stone-600 dark:text-stone-300 font-medium cursor-pointer bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 dark:hover:bg-stone-700 px-2 py-0.5 rounded-full border border-stone-200 dark:border-stone-700">
              <span>Custom</span>
              <input
                type="color"
                disabled={Boolean(selected.locked)}
                value={colorTarget === 'petal' ? selected.petalColor : selected.centerColor}
                onChange={(e) =>
                  updateItem(
                    selected.id,
                    colorTarget === 'petal'
                      ? { petalColor: e.target.value }
                      : { centerColor: e.target.value },
                    true
                  )
                }
                aria-label={`Pick custom ${colorTarget} color`}
                className="w-4 h-4 rounded-full border-0 bg-transparent cursor-pointer"
              />
            </label>
          </div>

          {/* Swatch Row */}
          <div className="flex items-center gap-2 overflow-x-auto py-1 px-0.5 no-scrollbar">
            {ROMANTIC_SWATCHES.map((hex) => {
              const activeHex =
                colorTarget === 'petal' ? selected.petalColor : selected.centerColor;
              const isMatch = activeHex.toLowerCase() === hex.toLowerCase();
              return (
                <button
                  key={hex}
                  type="button"
                  disabled={Boolean(selected.locked)}
                  onClick={() =>
                    updateItem(
                      selected.id,
                      colorTarget === 'petal' ? { petalColor: hex } : { centerColor: hex },
                      true
                    )
                  }
                  aria-label={`Set ${colorTarget} color ${hex}`}
                  className={`w-7 h-7 sm:w-6 sm:h-6 rounded-full shrink-0 border transition-transform disabled:opacity-40 ${
                    isMatch
                      ? 'scale-110 ring-2 ring-[#B4846C] ring-offset-2 border-white'
                      : 'border-stone-200 dark:border-stone-700 hover:scale-105'
                  }`}
                  style={{ backgroundColor: hex }}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

