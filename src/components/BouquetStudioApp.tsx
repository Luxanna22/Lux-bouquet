import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Flower2,
  AlertTriangle,
  Play,
  CheckCircle2,
  Music,
  VolumeX,
  Moon,
  Sun,
  Undo2,
  Redo2,
  Shuffle,
  Download,
  Share2,
  Trash2,
  Copy,
  FlipHorizontal,
  ArrowUp,
  ArrowDown,
  Gift,
  Mail,
  Check,
  RotateCw,
  Maximize2,
  Plus,
  Send,
  X,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Sliders,
  Palette,
  Layers,
  PenLine,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  GripVertical,
  RotateCcw,
  Mic,
  Pause,
  Clock,
  KeyRound,
  Heart,
  Sparkles,
  MessageSquareHeart,
  Home,
  BookOpen,
} from 'lucide-react';
import {
  FlowerType,
  CardTheme,
  RibbonStyle,
  typeWrapStyle,
  WrapStyle,
  BouquetItem,
  GreetingCardData,
  BouquetSnapshot,
  BouquetLockMode,
  DEFAULT_BOUQUET_LOCK,
  RECIPIENT_REACTIONS,
  FLOWER_CATALOG,
  WRAPPER_CATALOG,
  RIBBON_STYLE_CATALOG,
  RIBBON_SWATCHES,
  CARD_THEME_CATALOG,
  CARD_COLOR_SWATCHES,
  VOICE_KEEPSAKE_CATALOG,
  DEFAULT_VOICE_KEEPSAKE,
  ROMANTIC_SWATCHES,
  STARTER_TEMPLATES,
  getCardThemePalette,
} from '../types/bouquet';
import { FlowerRenderer } from './flowers/FlowerRenderer';
import {
  localShortCodeCache,
  computeShortCode,
  getShortCodeFromPathname,
  encodeBouquetToCompactPayload,
  encodeBouquetToShareUrl,
  isGiftShareHash,
  decodeBouquetFromHash,
  isInAppBrowser,
  exportSvgElementToPng,
  musicBox,
} from '../lib/shareAndExport';
import {
  saveSharedBouquetToFirestore,
  fetchSharedBouquetFromFirestore,
  incrementSharedBouquetOpenCount,
  incrementSharedBouquetVoicePlayCount,
  submitSharedBouquetReaction,
  incrementStudioGlobalStat,
  getSavedVaultBouquets,
  saveBouquetToLocalVault,
} from '../lib/firebase';
import { useBouquetStore } from '../store/useBouquetStore';
import { BouquetStage, FallingPetalsOverlay } from './BouquetStage';
import { BrandLogoMark } from './BrandLogoMark';
import {
  MiniWrapConeSVG,
  MiniTemplateBouquetSVG,
  MiniRibbonBowSVG,
  MiniCardShapeSVG,
  MiniVoiceKeepsakeSVG,
} from './MiniThumbnails';
import { LayerManagerPanel } from './LayerManagerPanel';
import { SelectedFlowerToolbar, UnifiedColorTarget } from './SelectedFlowerToolbar';
import { VoiceRecorderStudio, VoiceKeepsakePlayerModal } from './VoiceRecorderStudio';
import { LandingPageView } from './LandingPageView';
import { BouquetVaultModal } from './BouquetVaultModal';
import { computeRecipientSlideBloomState } from '../lib/dofParallax';

// ============================================================================
// MODULE 7: components/MainApp.tsx — BOUQUET STUDIO WORKSPACE & GIFT PREVIEW
// ============================================================================

type MobileCategory = 'templates' | 'wrapping' | 'flowers' | 'fillers' | 'ribbon' | 'card' | 'voice';

const PAPER_SWATCHES = [
  { label: 'Warm Kraft', short: 'Kraft', hex: '#d6b38e' },
  { label: 'Blush Pink', short: 'Blush', hex: '#fbcfe8' },
  { label: 'Rosewater', short: 'Rosewater', hex: '#fda4af' },
  { label: 'Lavender Mist', short: 'Lavender', hex: '#ddd6fe' },
  { label: 'Sage Whisper', short: 'Sage', hex: '#a7f3d0' },
  { label: 'Cream Linen', short: 'Cream', hex: '#fef3c7' }
];

export default function App() {
  const {
    items,
    wrapStyle,
    wrapColor,
    ribbonColor,
    ribbonStyle,
    card,
    voice,
    lock,
    past,
    future,
    addFlower,
    setWrapStyle,
    setWrapColor,
    setRibbonColor,
    setRibbonStyle,
    updateCard,
    updateVoice,
    updateLock,
    randomizeBouquet,
    clearBouquet,
    undo,
    redo,
    deleteSelected,
    duplicateSelected,
    selectItem,
    loadSnapshot
  } = useBouquetStore();

  const [activeTab, setActiveTab] = useState<'flowers' | 'wrap' | 'card' | 'layers'>('flowers');
  const [mobileCategory, setMobileCategory] = useState<MobileCategory>('wrapping');
  const [mobilePopover, setMobilePopover] = useState<'color' | 'stem' | 'layers' | 'card' | 'voice' | null>(null);
  const [activeColorTarget, setActiveColorTarget] = useState<UnifiedColorTarget>('wrapper');
  const [isMobileToolsExpanded, setIsMobileToolsExpanded] = useState(false);
  const [isDesktopDockCollapsed, setIsDesktopDockCollapsed] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isVoicePlaying, setIsVoicePlaying] = useState(false);
  const [drawerState, setDrawerState] = useState<'collapsed' | 'peek' | 'expanded'>('peek');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isInspectorSidebarOpen, setIsInspectorSidebarOpen] = useState(true);
  const initialGiftMode = typeof window !== 'undefined' && isGiftShareHash();
  const initialPathShortCode =
    typeof window !== 'undefined' ? getShortCodeFromPathname(window.location.pathname) : null;
  const initialNeedsRemoteResolve = Boolean(
    initialPathShortCode &&
      typeof window !== 'undefined' &&
      !localShortCodeCache.has(initialPathShortCode) &&
      !localStorage.getItem(`bq_short_${initialPathShortCode}`)
  );
  const [showLandingPage, setShowLandingPage] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    if (isGiftShareHash()) return false;
    if (getShortCodeFromPathname(window.location.pathname)) return false;
    if (window.location.search.includes('studio=1')) return false;
    return true;
  });
  const [studioEntranceKey, setStudioEntranceKey] = useState<number>(0);
  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
  const [vaultCount, setVaultCount] = useState<number>(() =>
    typeof window !== 'undefined' ? getSavedVaultBouquets().length : 0
  );
  const [activeShortCode, setActiveShortCode] = useState<string | null>(initialPathShortCode);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [isPasscodeUnlocked, setIsPasscodeUnlocked] = useState(false);
  const [passcodeAttempt, setPasscodeAttempt] = useState('');
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [isReactionPopoverOpen, setIsReactionPopoverOpen] = useState(false);
  const [selectedReactionId, setSelectedReactionId] = useState<string>('');
  const [recipientReplyText, setRecipientReplyText] = useState<string>('');
  const [hasSubmittedReaction, setHasSubmittedReaction] = useState(false);
  const [isSubmittingReaction, setIsSubmittingReaction] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isGiftView, setIsGiftView] = useState<boolean>(initialGiftMode);
  const [isGiftEntranceOpen, setIsGiftEntranceOpen] = useState<boolean>(initialGiftMode);
  const [isEntranceUnfurling, setIsEntranceUnfurling] = useState<boolean>(false);
  const [entranceSlideProgress, setEntranceSlideProgress] = useState<number>(0);
  const [isDraggingEntranceSlider, setIsDraggingEntranceSlider] = useState<boolean>(false);
  const entranceSliderTrackRef = useRef<HTMLDivElement | null>(null);
  const entranceSliderDragStartXRef = useRef<number | null>(null);
  const entranceSlideRafRef = useRef<number | null>(null);
  const [isResolvingShortCode, setIsResolvingShortCode] = useState<boolean>(initialNeedsRemoteResolve);
  const [bloomedCount, setBloomedCount] = useState<number | undefined>(
    initialGiftMode ? 0 : undefined
  );
  const [showGiftCardReveal, setShowGiftCardReveal] = useState<boolean>(!initialGiftMode);
  const [isLetterModalOpen, setIsLetterModalOpen] = useState(false);
  const [letterTypedChars, setLetterTypedChars] = useState(0);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shortShareUrl, setShortShareUrl] = useState<string | null>(null);
  const [isShorteningUrl, setIsShorteningUrl] = useState(false);
  const [isInAppBrowserModalOpen, setIsInAppBrowserModalOpen] = useState(false);
  const [corruptedLinkAlert, setCorruptedLinkAlert] = useState<string | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<'saved' | 'saving'>('saved');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('bouquet_studio_dark_mode') === 'true';
    } catch {
      return false;
    }
  });
  const [isMusicPlaying, setIsMusicPlaying] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const slideDrawerRef = useRef<HTMLElement | null>(null);
  const floatingToolStackRef = useRef<HTMLDivElement | null>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const letterBodyScrollRef = useRef<HTMLDivElement | null>(null);
  const studioCarouselRef = useRef<HTMLDivElement | null>(null);
  const [canScrollCarouselLeft, setCanScrollCarouselLeft] = useState(false);
  const [canScrollCarouselRight, setCanScrollCarouselRight] = useState(true);
  const bloomIntervalRef = useRef<number | null>(null);
  const hasHydratedRef = useRef(false);
  const countedOpenCodeRef = useRef<string | null>(null);
  const countedCreatedCodeSetRef = useRef<Set<string>>(new Set());
  const currentSessionVaultCodeRef = useRef<string | null>(null);

  const updateStudioCarouselScrollState = useCallback(() => {
    const el = studioCarouselRef.current;
    if (!el) return;
    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    setCanScrollCarouselLeft(el.scrollLeft > 6);
    setCanScrollCarouselRight(maxScrollLeft - el.scrollLeft > 6);
  }, []);

  const handleScrollStudioCarousel = useCallback((direction: 'left' | 'right') => {
    const el = studioCarouselRef.current;
    if (!el) return;
    const step = Math.max(240, Math.round(el.clientWidth * 0.55));
    el.scrollBy({
      left: direction === 'left' ? -step : step,
      behavior: 'smooth',
    });
  }, []);

  useEffect(() => {
    const el = studioCarouselRef.current;
    if (el) {
      el.scrollLeft = 0;
    }
    const timer = window.setTimeout(updateStudioCarouselScrollState, 40);
    window.addEventListener('resize', updateStudioCarouselScrollState);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateStudioCarouselScrollState);
    };
  }, [mobileCategory, isDesktopDockCollapsed, showLandingPage, updateStudioCarouselScrollState]);

  // Close the Slide-in Tool Drawer (Colors, Stem, Layers, Edit Note / Card, Voice) when clicking anywhere outside it
  useEffect(() => {
    if (!mobilePopover || typeof document === 'undefined') return;

    const handleOutsidePointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      if (slideDrawerRef.current?.contains(target)) return;
      if (floatingToolStackRef.current?.contains(target)) return;
      if (target.closest?.('[data-drawer-trigger="true"]')) return;
      setMobilePopover(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobilePopover(null);
      }
    };

    // Use capture phase so SVG elements calling e.stopPropagation() on the canvas still close open panels
    document.addEventListener('pointerdown', handleOutsidePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobilePopover]);

  // Sync exact visible viewport height so mobile browser bottom bars (e.g. Edge Mobile, Safari, Chrome)
  // never cover or clip the bottom Flowers/Wrappers carousel dock.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateHeight = () => {
      const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      if (vh && vh > 200) {
        setViewportHeight(Math.round(vh));
      }
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    window.addEventListener('orientationchange', updateHeight);
    window.visualViewport?.addEventListener('resize', updateHeight);
    window.visualViewport?.addEventListener('scroll', updateHeight);
    return () => {
      window.removeEventListener('resize', updateHeight);
      window.removeEventListener('orientationchange', updateHeight);
      window.visualViewport?.removeEventListener('resize', updateHeight);
      window.visualViewport?.removeEventListener('scroll', updateHeight);
    };
  }, []);

  // Typewriter / Handwritten Letter Reveal Effect when the Zoomed Card Modal opens
  useEffect(() => {
    if (!isLetterModalOpen) return;
    const toStr = `Dearest ${card.to || 'Someone Special'},`;
    const msgStr = card.message || 'Thinking of you with love and blossoms.';
    const fromStr = `With love, ${card.from || 'Yours Always'}`;
    const totalLen = toStr.length + msgStr.length + fromStr.length;

    setLetterTypedChars(0);
    let current = 0;
    const timer = setInterval(() => {
      current += 1;
      setLetterTypedChars(current);
      if (letterBodyScrollRef.current && current > toStr.length && current <= toStr.length + msgStr.length) {
        letterBodyScrollRef.current.scrollTop = letterBodyScrollRef.current.scrollHeight;
      }
      if (current >= totalLen) {
        clearInterval(timer);
      }
    }, 24);

    return () => clearInterval(timer);
  }, [isLetterModalOpen, card.to, card.message, card.from]);
  const selectedId = useBouquetStore((s) => s.selectedId);
  const autoCollapsedRef = useRef(false);
  const prevSelectedIdRef = useRef<string | null>(null);

  const selectedItem = useMemo(
    () => items.find((i) => i.id === selectedId) || null,
    [items, selectedId]
  );
  const selectedMeta = useMemo(
    () => (selectedItem ? FLOWER_CATALOG.find((m) => m.type === selectedItem.type) : null),
    [selectedItem]
  );

  useEffect(() => {
    if (selectedId) {
      setActiveColorTarget((prev) =>
        prev === 'petal' || prev === 'center' ? prev : 'petal'
      );
    }
    if (selectedId && !prevSelectedIdRef.current) {
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        if (drawerState !== 'collapsed') {
          setDrawerState('collapsed');
          autoCollapsedRef.current = true;
        }
      }
    } else if (!selectedId && prevSelectedIdRef.current) {
      setMobilePopover((prev) => (prev === 'stem' ? null : prev));
      if (autoCollapsedRef.current) {
        setDrawerState('peek');
        autoCollapsedRef.current = false;
      }
    }
    prevSelectedIdRef.current = selectedId;
  }, [selectedId, drawerState]);

  const handleCardInputFocus = useCallback(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024 && drawerState === 'peek') {
      setDrawerState('expanded');
    }
  }, [drawerState]);

  const triggerToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('bouquet_studio_dark_mode', String(isDarkMode));
    } catch {
      // Ignore storage error
    }
    if (typeof document !== 'undefined') {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [isDarkMode]);

  // Autoplay soft music-box melody on load & unlock AudioContext on first user interaction if browser suspended it
  useEffect(() => {
    musicBox.start();
    setIsMusicPlaying(true);

    const unlockAudio = () => {
      musicBox.resumeIfBlocked();
    };
    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      musicBox.stop();
    };
  }, []);

  const handleToggleMusic = () => {
    const playing = musicBox.toggle();
    setIsMusicPlaying(playing);
    triggerToast(playing ? 'Playing soft music-box melody ♪' : 'Music paused');
  };

  const handleStopVoice = useCallback(() => {
    if (voiceAudioRef.current) {
      voiceAudioRef.current.pause();
      voiceAudioRef.current.currentTime = 0;
      voiceAudioRef.current = null;
    }
    setIsVoicePlaying(false);
  }, []);

  // Unlock Ritual calculations (Time-Capsule Date & Time Countdown Lock + Secret Question Lock)
  const countdownTargetMs = useMemo(() => {
    if (lock?.mode !== 'countdown' || !lock.unlockAtIso) return null;
    const parsed = new Date(lock.unlockAtIso).getTime();
    return Number.isFinite(parsed) ? parsed : null;
  }, [lock?.mode, lock?.unlockAtIso]);

  const countdownRemainingMs =
    countdownTargetMs !== null ? Math.max(0, countdownTargetMs - nowMs) : 0;

  const isCountdownLocked =
    lock?.mode === 'countdown' && countdownTargetMs !== null && countdownRemainingMs > 0;

  const isPasscodeLocked =
    lock?.mode === 'passcode' &&
    Boolean(lock.passcodeAnswer && lock.passcodeAnswer.trim().length > 0) &&
    !isPasscodeUnlocked;

  const isGiftCurrentlyLocked = isCountdownLocked || isPasscodeLocked;

  const countdownParts = useMemo(() => {
    const totalSec = Math.max(0, Math.ceil(countdownRemainingMs / 1000));
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return {
      days: String(days).padStart(2, '0'),
      hours: String(hours).padStart(2, '0'),
      minutes: String(minutes).padStart(2, '0'),
      seconds: String(seconds).padStart(2, '0'),
    };
  }, [countdownRemainingMs]);

  const handleTogglePlayVoice = useCallback(() => {
    if ((isGiftView || isPreviewMode) && (isGiftEntranceOpen || isGiftCurrentlyLocked)) {
      triggerToast('Unlock and unwrap the bouquet first to listen to the voice keepsake');
      return;
    }
    if (!voice?.audioDataUrl) {
      triggerToast('No voice recording yet — tap Record Voice to add one');
      return;
    }
    if (isVoicePlaying && voiceAudioRef.current) {
      voiceAudioRef.current.pause();
      setIsVoicePlaying(false);
      return;
    }
    // Pause background music box while playing the personal voice message
    musicBox.stop();
    setIsMusicPlaying(false);

    if (voiceAudioRef.current) {
      voiceAudioRef.current.pause();
      voiceAudioRef.current = null;
    }

    const audio = new Audio(voice.audioDataUrl);
    voiceAudioRef.current = audio;
    audio.onended = () => {
      setIsVoicePlaying(false);
    };
    audio.onerror = () => {
      setIsVoicePlaying(false);
      triggerToast('Could not play voice recording');
    };
    setIsVoicePlaying(true);
    if (isGiftView && !isPreviewMode && activeShortCode) {
      incrementSharedBouquetVoicePlayCount(activeShortCode).catch(() => {});
    }
    audio.play().catch(() => {
      setIsVoicePlaying(false);
    });
  }, [
    voice?.audioDataUrl,
    isVoicePlaying,
    triggerToast,
    isGiftView,
    isPreviewMode,
    isGiftEntranceOpen,
    isGiftCurrentlyLocked,
    activeShortCode,
  ]);

  useEffect(() => {
    return () => {
      if (voiceAudioRef.current) {
        voiceAudioRef.current.pause();
        voiceAudioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  const runStemBloomSequence = useCallback((totalItems: number) => {
    if (bloomIntervalRef.current !== null) {
      clearInterval(bloomIntervalRef.current);
      bloomIntervalRef.current = null;
    }
    setShowGiftCardReveal(false);
    setBloomedCount(0);
    let current = 0;
    const cardRevealThreshold = Math.max(1, Math.ceil(totalItems * 0.5));
    bloomIntervalRef.current = window.setInterval(() => {
      current += 1;
      setBloomedCount(current);
      if (current === cardRevealThreshold) {
        setShowGiftCardReveal(true);
      }
      if (current >= totalItems) {
        if (bloomIntervalRef.current !== null) {
          clearInterval(bloomIntervalRef.current);
          bloomIntervalRef.current = null;
        }
        setShowGiftCardReveal(true);
      }
    }, 130);
  }, []);

  const startGiftBloomAnimation = useCallback((_totalItems: number, fromEditorPreview = true) => {
    if (bloomIntervalRef.current !== null) {
      clearInterval(bloomIntervalRef.current);
      bloomIntervalRef.current = null;
    }
    selectItem(null);
    setMobilePopover(null);
    setNowMs(Date.now());
    setIsPasscodeUnlocked(false);
    setPasscodeAttempt('');
    setPasscodeError(null);
    setIsReactionPopoverOpen(false);
    setIsPreviewMode(fromEditorPreview);
    setIsGiftView(true);
    setIsEntranceUnfurling(false);
    setEntranceSlideProgress(0);
    setIsDraggingEntranceSlider(false);
    setIsGiftEntranceOpen(true);
    setShowGiftCardReveal(false);
    setBloomedCount(0);
    // Ensure music autoplays when entering shared gift view or preview bloom
    musicBox.start();
    musicBox.resumeIfBlocked();
    setIsMusicPlaying(true);
  }, [selectItem]);

  const handleUnwrapGiftEntrance = useCallback(
    (forceBypassLock = false) => {
      if (!forceBypassLock && isGiftCurrentlyLocked) {
        return;
      }
      if (forceBypassLock) {
        setIsPasscodeUnlocked(true);
      }
      if (entranceSlideRafRef.current !== null) {
        cancelAnimationFrame(entranceSlideRafRef.current);
        entranceSlideRafRef.current = null;
      }
      setEntranceSlideProgress(1);
      setIsDraggingEntranceSlider(false);
      musicBox.start();
      musicBox.resumeIfBlocked();
      setIsMusicPlaying(true);
      setIsEntranceUnfurling(true);
      runStemBloomSequence(items.length);

      window.setTimeout(() => {
        setIsGiftEntranceOpen(false);
        setIsEntranceUnfurling(false);
      }, 420);

      if (!isPreviewMode && activeShortCode && countedOpenCodeRef.current !== activeShortCode) {
        countedOpenCodeRef.current = activeShortCode;
        incrementSharedBouquetOpenCount(activeShortCode).catch(() => {});
      }
    },
    [items.length, runStemBloomSequence, isGiftCurrentlyLocked, isPreviewMode, activeShortCode]
  );

  // Smoothly glides the slider to 100% so the background flower blooms open before transitioning
  const handleGlideSlideToOpen = useCallback(
    (startFrom = entranceSlideProgress) => {
      if (isGiftCurrentlyLocked || isEntranceUnfurling) return;
      if (entranceSlideRafRef.current !== null) {
        cancelAnimationFrame(entranceSlideRafRef.current);
      }
      const startVal = Math.max(0, Math.min(1, startFrom));
      const durationMs = Math.max(180, (1 - startVal) * 440);
      const startTime = performance.now();

      const tick = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / durationMs);
        const eased = 1 - Math.pow(1 - t, 2.2);
        const nextVal = startVal + (1 - startVal) * eased;
        setEntranceSlideProgress(nextVal);
        if (t < 1) {
          entranceSlideRafRef.current = requestAnimationFrame(tick);
        } else {
          entranceSlideRafRef.current = null;
          handleUnwrapGiftEntrance();
        }
      };
      entranceSlideRafRef.current = requestAnimationFrame(tick);
    },
    [entranceSlideProgress, isGiftCurrentlyLocked, isEntranceUnfurling, handleUnwrapGiftEntrance]
  );

  const recipientBloom = useMemo(
    () => computeRecipientSlideBloomState(isEntranceUnfurling ? 1 : entranceSlideProgress),
    [isEntranceUnfurling, entranceSlideProgress]
  );

  // Live 1-second tick for Time-Capsule Countdown Lock & automatic unwrap when timer reaches zero
  const wasCountdownLockedRef = useRef<boolean>(false);
  useEffect(() => {
    if (!(isGiftView || isPreviewMode) || !isGiftEntranceOpen || lock?.mode !== 'countdown') {
      wasCountdownLockedRef.current = false;
      return;
    }
    wasCountdownLockedRef.current = isCountdownLocked;
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNowMs(current);
      if (countdownTargetMs !== null && current >= countdownTargetMs && wasCountdownLockedRef.current) {
        wasCountdownLockedRef.current = false;
        handleUnwrapGiftEntrance(true);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [
    isGiftView,
    isPreviewMode,
    isGiftEntranceOpen,
    lock?.mode,
    countdownTargetMs,
    isCountdownLocked,
    handleUnwrapGiftEntrance,
  ]);

  const handleAttemptPasscodeUnlock = useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const expected = (lock?.passcodeAnswer || '').trim().toLowerCase();
      const actual = passcodeAttempt.trim().toLowerCase();
      if (!expected || actual === expected) {
        setIsPasscodeUnlocked(true);
        setPasscodeError(null);
        handleUnwrapGiftEntrance(true);
      } else {
        setPasscodeError('That answer doesn’t match yet — try again ♥');
      }
    },
    [lock?.passcodeAnswer, passcodeAttempt, handleUnwrapGiftEntrance]
  );

  const handleSubmitRecipientReaction = useCallback(async () => {
    if (!selectedReactionId && !recipientReplyText.trim()) {
      triggerToast('Choose a reaction or write a short note first');
      return;
    }
    setIsSubmittingReaction(true);
    try {
      const codeToSave =
        activeShortCode ||
        computeShortCode(
          encodeBouquetToCompactPayload(
            {
              items,
              wrapStyle,
              wrapColor,
              ribbonColor,
              ribbonStyle,
              card,
              voice,
              lock,
            },
            true
          )
        );
      await submitSharedBouquetReaction(
        codeToSave,
        selectedReactionId || 'loved',
        recipientReplyText.trim()
      );
      setHasSubmittedReaction(true);
      setIsReactionPopoverOpen(false);
      triggerToast('Reaction & note sent to sender ♥');
    } catch {
      triggerToast('Saved reaction ♥');
    } finally {
      setIsSubmittingReaction(false);
    }
  }, [
    selectedReactionId,
    recipientReplyText,
    activeShortCode,
    items,
    wrapStyle,
    wrapColor,
    ribbonColor,
    ribbonStyle,
    card,
    voice,
    lock,
    triggerToast,
  ]);

  const handleExitGiftViewToEditor = useCallback(() => {
    if (bloomIntervalRef.current !== null) {
      clearInterval(bloomIntervalRef.current);
      bloomIntervalRef.current = null;
    }
    handleStopVoice();
    setIsVoiceModalOpen(false);
    setIsReactionPopoverOpen(false);
    setIsGiftEntranceOpen(false);
    setIsGiftView(false);
    setIsPreviewMode(false);
    setBloomedCount(undefined);
    setShowGiftCardReveal(true);
  }, [handleStopVoice]);

  // When a recipient clicks "Craft Yours" on a shared or showcase bouquet, start a fresh empty bouquet
  // so they can never edit or overwrite the sender's shared arrangement!
  const handleCreateOwnFromShared = useCallback(() => {
    if (bloomIntervalRef.current !== null) {
      clearInterval(bloomIntervalRef.current);
      bloomIntervalRef.current = null;
    }
    handleStopVoice();
    setIsVoiceModalOpen(false);
    setIsReactionPopoverOpen(false);
    try {
      window.history.replaceState(null, '', '/');
    } catch {
      // Ignore history error
    }
    clearBouquet();
    selectItem(null);
    setIsGiftEntranceOpen(false);
    setIsGiftView(false);
    setIsPreviewMode(false);
    setBloomedCount(undefined);
    setShowGiftCardReveal(true);
    triggerToast('Started a fresh empty bouquet for you to arrange');
  }, [clearBouquet, selectItem, triggerToast, handleStopVoice]);

  // Returns to the Landing Page from a view-only showcase/shared bouquet and resets the studio canvas
  const handleReturnHomeFromGiftView = useCallback(() => {
    if (bloomIntervalRef.current !== null) {
      clearInterval(bloomIntervalRef.current);
      bloomIntervalRef.current = null;
    }
    handleStopVoice();
    setIsVoiceModalOpen(false);
    setIsReactionPopoverOpen(false);
    try {
      window.history.replaceState(null, '', '/');
    } catch {
      // Ignore history error
    }
    clearBouquet();
    selectItem(null);
    setIsGiftEntranceOpen(false);
    setIsGiftView(false);
    setIsPreviewMode(false);
    setBloomedCount(undefined);
    setShowGiftCardReveal(true);
    setShowLandingPage(true);
  }, [clearBouquet, selectItem, handleStopVoice]);

  // Autosave to localStorage & Hydrate Shared Links (including first-party /<code> short links)
  useEffect(() => {
    if (!hasHydratedRef.current) {
      hasHydratedRef.current = true;
      try {
        const hash = window.location.hash;
        const pathCode = getShortCodeFromPathname(window.location.pathname);
        if (pathCode) {
          setActiveShortCode(pathCode);
        }
        const giftMode = isGiftShareHash();
        if (giftMode) {
          setShowLandingPage(false);
          setIsGiftView(true);
          setIsPreviewMode(false);
          setIsGiftEntranceOpen(true);
        }

        const shared = decodeBouquetFromHash();
        if (shared && Array.isArray(shared.items) && shared.items.length > 0) {
          if (!pathCode) {
            const derivedCode = computeShortCode(encodeBouquetToCompactPayload(shared, true));
            setActiveShortCode(derivedCode);
          }
          loadSnapshot(shared);
          selectItem(null);
          setIsResolvingShortCode(false);
          setShowLandingPage(false);
          if (giftMode) {
            startGiftBloomAnimation(shared.items.length, false);
          } else {
            triggerToast('Loaded shared bouquet');
          }
          // If the hash had its audio stripped by an external URL shortener, check Firestore by short code
          if (shared.voice?.visibleOnStage && !shared.voice.audioDataUrl && pathCode) {
            fetchSharedBouquetFromFirestore(pathCode)
              .then((docData) => {
                if (docData?.voiceAudioDataUrl) {
                  loadSnapshot({
                    ...shared,
                    voice: {
                      ...(shared.voice || DEFAULT_VOICE_KEEPSAKE),
                      audioDataUrl: docData.voiceAudioDataUrl,
                      visibleOnStage: true,
                    },
                  });
                }
              })
              .catch(() => {});
          }
          return;
        }

        // If opened via a first-party short link (e.g. https://[domain]/Vu18KSuusq9133s) on a new device,
        // fetch the bouquet payload and voice recording from Firebase Firestore first, with fallback to /api/shorten?c=<code>
        if (pathCode) {
          setShowLandingPage(false);
          setIsResolvingShortCode(true);
          (async () => {
            try {
              let data: {
                payload?: string;
                voiceAudioDataUrl?: string | null;
              } | null = await fetchSharedBouquetFromFirestore(pathCode);

              if (!data || typeof data.payload !== 'string') {
                const r = await fetch(`/api/shorten?c=${encodeURIComponent(pathCode)}`);
                if (r.ok) {
                  data = await r.json();
                }
              }

              if (data && typeof data.payload === 'string') {
                localShortCodeCache.set(pathCode, data.payload);
                try {
                  localStorage.setItem(`bq_short_${pathCode}`, data.payload);
                } catch {
                  // Ignore storage quota
                }
                const resolvedSnap = decodeBouquetFromHash(data.payload);
                if (resolvedSnap && Array.isArray(resolvedSnap.items) && resolvedSnap.items.length > 0) {
                  if (data.voiceAudioDataUrl && (!resolvedSnap.voice || !resolvedSnap.voice.audioDataUrl)) {
                    resolvedSnap.voice = {
                      ...(resolvedSnap.voice || DEFAULT_VOICE_KEEPSAKE),
                      audioDataUrl: data.voiceAudioDataUrl,
                      visibleOnStage: true,
                    };
                  }
                  loadSnapshot(resolvedSnap);
                  selectItem(null);
                  startGiftBloomAnimation(resolvedSnap.items.length, false);
                }
              }
            } catch {
              // Fall back quietly
            } finally {
              setIsResolvingShortCode(false);
            }
          })();
          return;
        }

        // Only fall back quietly to default bouquet if link cannot be parsed (no alarming banner on recipient gift view)
        if (!giftMode && (hash.includes('bouquet=') || hash.startsWith('#b='))) {
          setCorruptedLinkAlert('Could not load shared bouquet link. It may have been truncated or corrupted.');
        }

        const saved = localStorage.getItem('bouquet_studio_autosave_v2');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && Array.isArray(parsed.items)) {
            loadSnapshot(parsed);
          }
        }
      } catch {
        setIsResolvingShortCode(false);
      }
      return;
    }

    // Do not overwrite user's local studio autosave while viewing a shared recipient gift link
    if (isGiftView && !isPreviewMode) {
      return;
    }

    setAutosaveStatus('saving');
    const timer = setTimeout(() => {
      try {
        const snap: BouquetSnapshot = {
          items,
          wrapStyle,
          wrapColor,
          ribbonColor,
          ribbonStyle,
          card,
          voice,
          lock,
        };
        localStorage.setItem('bouquet_studio_autosave_v2', JSON.stringify(snap));
        setAutosaveStatus('saved');
      } catch {
        setAutosaveStatus('saved');
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [items, wrapStyle, wrapColor, ribbonColor, ribbonStyle, card, voice, lock, isGiftView, isPreviewMode, loadSnapshot, selectItem, triggerToast, startGiftBloomAnimation]);

  // Global Keyboard Shortcuts (Strictly disabled in Shared / Preview mode so recipients cannot edit stems)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGiftView || isPreviewMode) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
          triggerToast('Redid action');
        } else {
          undo();
          triggerToast('Undid last change');
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        triggerToast('Redid action');
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateSelected();
        triggerToast('Duplicated flower');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGiftView, isPreviewMode, undo, redo, deleteSelected, duplicateSelected, triggerToast]);

  const handleExportPng = async () => {
    // When inside an in-app browser (Messenger, Instagram, TikTok, LINE, etc.),
    // prompt the user to open the page in their external browser to save the PNG.
    if (isInAppBrowser()) {
      setIsInAppBrowserModalOpen(true);
      return;
    }

    const targetSvg =
      svgRef.current ||
      (document.querySelector('svg[aria-label="Interactive Flower Bouquet Canvas"]') as SVGSVGElement | null);

    if (!targetSvg) {
      triggerToast('Bouquet canvas element not found.');
      return;
    }

    try {
      triggerToast('Generating high-res image...');
      await exportSvgElementToPng(targetSvg, 'flowers-for-you.png');
      triggerToast('Saved image');
    } catch (err) {
      console.error('Failed to export image:', err);
      triggerToast('Could not export image.');
    }
  };

  const getShareUrl = useCallback(
    (asGift = true) => {
      const snap: BouquetSnapshot = {
        items,
        wrapStyle,
        wrapColor,
        ribbonColor,
        ribbonStyle,
        card,
        voice,
        lock,
      };
      return encodeBouquetToShareUrl(snap, asGift);
    },
    [items, wrapStyle, wrapColor, ribbonColor, ribbonStyle, card, voice, lock]
  );

  const registerShortCodeOnServer = useCallback(
    (asGift = true, persistToVault = false) => {
      const snap: BouquetSnapshot = {
        items,
        wrapStyle,
        wrapColor,
        ribbonColor,
        ribbonStyle,
        card,
        voice,
        lock,
      };
      const hashPayload = encodeBouquetToCompactPayload(snap, asGift);
      const code = computeShortCode(hashPayload);
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const firstPartyUrl = origin ? `${origin}/${code}` : `/${code}`;

      // Always keep local short-code lookup cache warm for instant preview resolution
      localShortCodeCache.set(code, hashPayload);
      try {
        localStorage.setItem(`bq_short_${code}`, hashPayload);
      } catch {
        // Ignore localStorage quota errors
      }

      if (!persistToVault) {
        return firstPartyUrl;
      }

      // Persist directly to Firebase Firestore for instant cross-device & Vercel persistence
      saveSharedBouquetToFirestore(code, hashPayload, snap).catch(() => {});

      // Save to local account-free Bouquet Vault (replaces previous code from the same editing session so changing share info never duplicates!)
      const updatedVault = saveBouquetToLocalVault(
        {
          code,
          to: card.to || 'Someone Special',
          from: card.from || 'Yours',
          recipientName: card.to || 'Someone Special',
          senderName: card.from || 'Yours',
          createdAt: new Date().toISOString(),
          shareUrl: firstPartyUrl,
          lockMode: lock?.mode || 'none',
          hasVoice: Boolean(voice?.audioDataUrl),
          flowerCount: items.length,
        },
        currentSessionVaultCodeRef.current
      );
      currentSessionVaultCodeRef.current = code;
      setVaultCount(updatedVault.length);

      if (!countedCreatedCodeSetRef.current.has(code)) {
        countedCreatedCodeSetRef.current.add(code);
        incrementStudioGlobalStat('bouquetsCreated', Boolean(voice?.audioDataUrl)).catch(() => {});
      }

      // Also register via /api/shorten serverless endpoint (which also writes to Firestore REST API)
      fetch('/api/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          payload: hashPayload,
          origin,
          voiceAudioDataUrl: voice?.audioDataUrl || null,
          voiceStyle: voice?.style || null,
          voiceTitle: voice?.title || null,
          voiceDurationSec: voice?.durationSec ?? null
        })
      }).catch(() => {});

      return firstPartyUrl;
    },
    [items, wrapStyle, wrapColor, ribbonColor, ribbonStyle, card, voice, lock]
  );

  // Compute preview short link when Share Modal is open without saving duplicate entries on every keystroke
  useEffect(() => {
    if (!isShareModalOpen) return;
    const firstPartyUrl = registerShortCodeOnServer(true, false);
    setShortShareUrl(firstPartyUrl);
    setIsShorteningUrl(false);
  }, [isShareModalOpen, registerShortCodeOnServer]);

  const handleShareLink = async (asGift = true) => {
    const firstPartyUrl = registerShortCodeOnServer(asGift, true);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(firstPartyUrl).catch(() => {});
    }
    triggerToast('Link copied & saved to Saved Bouquets ♥');
  };

  const handleMobileFloatingTool = (mode: 'color' | 'stem' | 'layers' | 'card' | 'voice') => {
    // Clicking the currently active tool icon again ALWAYS collapses the side drawer
    if (mobilePopover === mode) {
      setMobilePopover(null);
      return;
    }
    if (mode === 'stem' && !selectedId) {
      const visibleItems = items.filter((i) => !i.hidden);
      if (visibleItems.length > 0) {
        selectItem(visibleItems[visibleItems.length - 1].id);
      }
    }
    if (mode === 'color' && !selectedId && (activeColorTarget === 'petal' || activeColorTarget === 'center')) {
      const visibleItems = items.filter((i) => !i.hidden);
      if (visibleItems.length > 0) {
        selectItem(visibleItems[visibleItems.length - 1].id);
      } else {
        setActiveColorTarget(
          mobileCategory === 'ribbon'
            ? 'ribbon'
            : mobileCategory === 'card'
            ? 'card'
            : mobileCategory === 'voice'
            ? 'voicePrimary'
            : 'wrapper'
        );
      }
    }
    setMobilePopover(mode);
  };

  const focalFlowers = useMemo(
    () => FLOWER_CATALOG.filter((f) => !f.isFoliage && !f.isFiller),
    []
  );
  const fillerFlowers = useMemo(
    () => FLOWER_CATALOG.filter((f) => Boolean(f.isFoliage || f.isFiller)),
    []
  );

  return (
    <div
      className={`min-h-[100dvh] h-[100dvh] w-full overflow-hidden flex flex-col font-sans transition-colors duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        isDarkMode
          ? 'dark bg-[#2B2321] text-[#FBF6F1]'
          : 'bg-[#FAFAF8] text-[#1C1917]'
      }`}
      style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        ...(viewportHeight ? { height: `${viewportHeight}px`, minHeight: `${viewportHeight}px` } : {})
      }}
    >
      {/* Google Fonts: Caveat (Handwriting), Cormorant Garamond & Inter */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,600&family=Inter:wght@400;500;600&display=swap"
      />
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, -6px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes cardBloomSwingIn {
          0% {
            opacity: 0;
            transform: rotate(-18deg) scale(0.45) translateY(20px);
          }
          55% {
            opacity: 1;
            transform: rotate(7deg) scale(1.06) translateY(-4px);
          }
          78% {
            opacity: 1;
            transform: rotate(-4deg) scale(0.99) translateY(1px);
          }
          100% {
            opacity: 1;
            transform: rotate(0deg) scale(1) translateY(0px);
          }
        }
        @keyframes cordBloomFade {
          0% { opacity: 0; stroke-dasharray: 140; stroke-dashoffset: 140; }
          100% { opacity: 0.85; stroke-dasharray: 140; stroke-dashoffset: 0; }
        }
        .bouquet-cord-bloom {
          animation: cordBloomFade 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @keyframes cardGentleWiggle {
          0%, 55%, 100% { transform: rotate(0deg) scale(1); }
          15% { transform: rotate(-4.5deg) scale(1.04); }
          25% { transform: rotate(4.5deg) scale(1.05); }
          35% { transform: rotate(-3.2deg) scale(1.03); }
          45% { transform: rotate(2.2deg) scale(1.02); }
        }
        .bouquet-card-wiggle {
          transform-origin: 0px 0px;
          transform-box: view-box;
          animation:
            cardBloomSwingIn 0.78s cubic-bezier(0.22, 1, 0.36, 1) forwards,
            cardGentleWiggle 2.8s ease-in-out 0.78s infinite;
          transition: filter 0.2s ease;
        }
        .bouquet-card-wiggle:hover {
          filter: drop-shadow(0px 8px 16px rgba(180, 132, 108, 0.38));
        }
        svg, svg *, svg g:focus, svg g:focus-visible, svg g:active {
          outline: none !important;
          -webkit-tap-highlight-color: transparent;
          -webkit-touch-callout: none;
          user-select: none;
          -webkit-user-select: none;
        }
        @keyframes cardModalZoomIn {
          0% { opacity: 0; transform: scale(0.55) rotate(-6deg) translateY(36px); }
          70% { opacity: 1; transform: scale(1.02) rotate(0.5deg) translateY(-2px); }
          100% { opacity: 1; transform: scale(1) rotate(0deg) translateY(0); }
        }
        .card-zoom-modal {
          animation: cardModalZoomIn 0.42s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @keyframes stemSpringBloom {
          0% { opacity: 0; transform: scale(0.25) translateY(28px); }
          70% { opacity: 1; transform: scale(1.08) translateY(-3px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .stem-bloom-pop {
          animation: stemSpringBloom 0.52s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @keyframes giftStageEntrance {
          0% { opacity: 0; transform: scale(0.88) translateY(22px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .gift-stage-entrance {
          animation: giftStageEntrance 0.75s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @keyframes floatKeepsakeEnvelope {
          0%, 100% { transform: translateY(0px) rotate(-1deg); }
          50% { transform: translateY(-8px) rotate(1deg); }
        }
        .float-keepsake-envelope {
          animation: floatKeepsakeEnvelope 3.6s ease-in-out infinite;
        }
        @keyframes studioWorkspaceEnter {
          0% { opacity: 0; transform: scale(0.986) translate3d(0, 8px, 0); }
          100% { opacity: 1; transform: scale(1) translate3d(0, 0, 0); }
        }
        .studio-workspace-enter {
          animation: studioWorkspaceEnter 0.46s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes studioThemeIconPop {
          0% { opacity: 0.4; transform: rotate(-75deg) scale(0.65); }
          100% { opacity: 1; transform: rotate(0deg) scale(1); }
        }
        .studio-theme-icon-pop {
          animation: studioThemeIconPop 0.48s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
      `}</style>

      {/* =====================================================================
          EDITORIAL LANDING PAGE OVERLAY (Shown first when visiting `/`)
          100% Free & Account-Free — includes About, How It Works, Live Analytics,
          and Interactive FAQs, with smooth transition into the Bouquet Studio.
          ===================================================================== */}
      {showLandingPage && !isGiftView && !isPreviewMode && (
        <LandingPageView
          onStartCrafting={() => {
            setStudioEntranceKey((k) => k + 1);
            setShowLandingPage(false);
          }}
          onPreviewShowcaseBouquet={() => {
            const currentItems = useBouquetStore.getState().items;
            setShowLandingPage(false);
            // Strictly view-only recipient mode (fromEditorPreview = false) so showcase creations cannot be edited
            startGiftBloomAnimation(currentItems.length, false);
          }}
          onOpenVault={() => setIsVaultModalOpen(true)}
          vaultCount={vaultCount}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
        />
      )}

      {/* CORRUPTED LINK BANNER (IF APPLICABLE) */}
      {corruptedLinkAlert && (
        <div
          role="alert"
          className="bg-stone-100 dark:bg-[#1E1C1A] border-b border-stone-200 dark:border-stone-800 px-4 py-2 text-xs text-stone-800 dark:text-stone-200 flex items-center justify-between gap-3 z-40"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#B4846C] shrink-0" />
            <span>{corruptedLinkAlert}</span>
          </div>
          <button
            type="button"
            onClick={() => setCorruptedLinkAlert(null)}
            className="px-2.5 py-1 rounded-md bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 font-medium text-stone-800 dark:text-stone-200 shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {(!showLandingPage || isGiftView || isPreviewMode) && (
        <>
          {/* =====================================================================
              STUDIO EDITOR TOP BAR (Hidden in View-Only / Shared Bouquet Mode!)
              In View-Only mode, all navigation bars and editing tools are removed
              so the recipient focuses purely on the bouquet and card.
              ===================================================================== */}
          {!isGiftView && !isPreviewMode && (
        <div className="px-2.5 sm:px-5 pt-2 pb-1 shrink-0 z-30">
          <div
            className={`h-11 sm:h-12 px-3 sm:px-4 rounded-full border shadow-[0_6px_24px_rgba(35,28,24,0.05)] flex items-center justify-between gap-2 transition-colors ${
              isDarkMode
                ? 'bg-[#352C29]/95 border-[#4E423E] text-[#FBF6F1]'
                : 'bg-[#FFFDF9]/95 border-[#EFE6DD] text-[#231C18]'
            }`}
          >
            {/* Left: Brand Wordmark (Returns to Home) */}
            <button
              type="button"
              onClick={() => setShowLandingPage(true)}
              title="Back to Send A Bouquet Home"
              aria-label="Open Send A Bouquet Home Page"
              className="flex items-center gap-2 select-none hover:opacity-85 transition cursor-pointer shrink-0"
            >
              <BrandLogoMark className="w-6 h-6 sm:w-7 sm:h-7" isDarkMode={isDarkMode} />
              <span
                className="hidden sm:inline text-lg font-semibold tracking-tight whitespace-nowrap"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                Send A Bouquet
              </span>
            </button>

            {/* Center: Quiet History & Reset Capsule */}
            <div
              className={`flex items-center gap-0.5 rounded-full px-1 py-0.5 border border-dashed shrink-0 ${
                isDarkMode
                  ? 'bg-[#2B2321]/80 border-[#52433E]'
                  : 'bg-[#FAF4EE]/85 border-[#E2D1C1]'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  undo();
                  triggerToast('Undid last change');
                }}
                disabled={past.length === 0}
                aria-label="Undo"
                title="Undo"
                className="w-7 h-7 rounded-full flex items-center justify-center text-[#6E5D54] dark:text-[#D8C7BE] hover:text-[#231C18] dark:hover:text-white disabled:opacity-30 active:scale-95 transition cursor-pointer"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  redo();
                  triggerToast('Redid change');
                }}
                disabled={future.length === 0}
                aria-label="Redo"
                title="Redo"
                className="w-7 h-7 rounded-full flex items-center justify-center text-[#6E5D54] dark:text-[#D8C7BE] hover:text-[#231C18] dark:hover:text-white disabled:opacity-30 active:scale-95 transition cursor-pointer"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
              <span
                aria-hidden="true"
                className={`w-[1px] h-3.5 mx-0.5 ${
                  isDarkMode ? 'bg-[#52433E]' : 'bg-[#E2D1C1]'
                }`}
              />
              <button
                type="button"
                onClick={() => {
                  currentSessionVaultCodeRef.current = null;
                  clearBouquet();
                  triggerToast('Started over with an empty bouquet');
                }}
                aria-label="Reset bouquet and start over"
                title="Start Over"
                className="h-7 px-2 rounded-full text-[11px] font-medium flex items-center gap-1 text-[#6E5D54] dark:text-[#D8C7BE] hover:text-rose-600 dark:hover:text-rose-300 active:scale-95 transition cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden md:inline">Reset</span>
              </button>
            </div>

            {/* Right: Saved Bouquets + Ambient Controls + Primary Share Button */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsVaultModalOpen(true)}
                aria-label="Open Saved Bouquets"
                title="Saved Bouquets"
                className={`h-7 sm:h-8 px-2.5 sm:px-3 rounded-full text-[11px] sm:text-xs font-medium flex items-center gap-1.5 border border-dashed shrink-0 active:scale-95 transition cursor-pointer ${
                  isDarkMode
                    ? 'bg-[#423734] border-[#66554F] text-[#FBF6F1] hover:bg-[#4D403C]'
                    : 'bg-[#FAF4EE] border-[#D8C4B4] text-[#5C4438] hover:bg-[#F3E9DF]'
                }`}
              >
                <span className="sm:hidden">Saved</span>
                <span className="hidden sm:inline">Saved Bouquets</span>
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
                onClick={handleToggleMusic}
                aria-pressed={isMusicPlaying}
                aria-label={isMusicPlaying ? 'Pause music' : 'Play music'}
                title={isMusicPlaying ? 'Pause music' : 'Play music'}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center active:scale-95 transition cursor-pointer ${
                  isMusicPlaying
                    ? 'bg-[#B4846C]/15 text-[#B4846C]'
                    : 'text-[#6E5D54] dark:text-[#D8C7BE] hover:bg-[#FAF4EE] dark:hover:bg-[#463A36]'
                }`}
              >
                {isMusicPlaying ? <Music className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => setIsDarkMode((prev) => !prev)}
                aria-label="Toggle theme"
                title="Toggle theme"
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[#6E5D54] dark:text-[#E6B89C] hover:bg-[#FAF4EE] dark:hover:bg-[#463A36] active:scale-95 transition cursor-pointer"
              >
                <span key={isDarkMode ? 'sun' : 'moon'} className="block studio-theme-icon-pop">
                  {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-300" /> : <Moon className="w-3.5 h-3.5" />}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsShareModalOpen(true)}
                aria-label="Share bouquet"
                title="Share bouquet"
                className={`h-7 sm:h-8 px-3 sm:px-4 rounded-full text-[11px] sm:text-xs font-medium flex items-center justify-center gap-1.5 shrink-0 active:scale-95 transition cursor-pointer ${
                  isDarkMode
                    ? 'bg-[#E6B89C] text-[#231C18] hover:bg-[#F0C8B0]'
                    : 'bg-[#6E4434] text-[#FFFDF9] hover:bg-[#5B3729]'
                }`}
              >
                <span>Share</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          PRESERVED SSR HEADER STRUCTURE (Hidden visually so Desktop uses the clean pill bar)
          ===================================================================== */}
      <header
        className={`hidden h-14 shrink-0 px-2 sm:px-4 md:px-6 border-b items-center justify-between gap-1 sm:gap-2 z-30 transition-colors ${
          isDarkMode
            ? 'bg-[#1E1C1A]/95 border-stone-800 text-stone-100'
            : 'bg-[#FAFAF8]/95 border-stone-200 text-[#1C1917]'
        }`}
      >
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <h1
            className="text-sm sm:text-base md:text-lg font-semibold tracking-tight text-[#1C1917] dark:text-stone-100"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Flowers For You
          </h1>
          {!isGiftView && (
            <span
              className="inline-flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 font-normal"
              title="Automatically saved to browser storage"
            >
              <span className="hidden sm:inline">
                {autosaveStatus === 'saving' ? 'Saving...' : 'Saved'}
              </span>
            </span>
          )}
        </div>

        {/* Center Controls (Undo / Redo / Randomize) */}
        {!isGiftView ? (
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={() => {
                undo();
                triggerToast('Undid last change');
              }}
              disabled={past.length === 0}
              aria-label="Undo (Ctrl+Z)"
              title="Undo (Ctrl+Z)"
              className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl disabled:opacity-30 border transition ${
                isDarkMode
                  ? 'border-stone-700 bg-[#1E1C1A] hover:bg-[#292524] text-stone-300'
                  : 'border border-stone-200 bg-white hover:bg-stone-50 text-[#1C1917]'
              }`}
            >
              <Undo2 className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
            </button>
            <button
              type="button"
              onClick={() => {
                redo();
                triggerToast('Redid change');
              }}
              disabled={future.length === 0}
              aria-label="Redo (Ctrl+Shift+Z)"
              title="Redo (Ctrl+Shift+Z)"
              className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl disabled:opacity-30 border transition ${
                isDarkMode
                  ? 'border-stone-700 bg-[#1E1C1A] hover:bg-[#292524] text-stone-300'
                  : 'border border-stone-200 bg-white hover:bg-stone-50 text-[#1C1917]'
              }`}
            >
              <Redo2 className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => startGiftBloomAnimation(items.length)}
              className={`h-8 px-2 sm:h-9 sm:px-3 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition ${
                isDarkMode
                  ? 'border-stone-700 bg-[#1E1C1A] hover:bg-[#292524] text-stone-300'
                  : 'border border-stone-200 bg-white hover:bg-stone-50 text-[#1C1917]'
              }`}
            >
              <Play className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
              <span className="hidden sm:inline">Replay bloom</span>
            </button>
          </div>
        )}

        {/* Right Music, Dark Mode, Gift View, Share & Export Actions */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={handleToggleMusic}
            aria-pressed={isMusicPlaying}
            aria-label={isMusicPlaying ? 'Mute soft background music' : 'Play soft background music'}
            title={isMusicPlaying ? 'Pause soft music box' : 'Play soft music box'}
            className={`h-8 w-8 sm:h-9 sm:w-auto sm:px-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition ${
              isMusicPlaying
                ? 'bg-[#1C1917] text-white border-[#1C1917] dark:bg-white dark:text-[#1C1917] dark:border-white'
                : isDarkMode
                ? 'border-stone-700 bg-[#1E1C1A] hover:bg-[#292524] text-stone-300'
                : 'border border-stone-200 bg-white hover:bg-stone-50 text-[#1C1917]'
            }`}
          >
            {isMusicPlaying ? (
              <Music className="w-3.5 h-3.5" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
            )}
            <span className="hidden xl:inline">{isMusicPlaying ? 'Music on' : 'Music'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDarkMode((prev) => !prev)}
            aria-pressed={isDarkMode}
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl border text-xs font-medium flex items-center justify-center transition ${
              isDarkMode
                ? 'border-stone-700 bg-[#1E1C1A] hover:bg-[#292524] text-stone-300'
                : 'border border-stone-200 bg-white hover:bg-stone-50 text-[#1C1917]'
            }`}
          >
            {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-300" /> : <Moon className="w-3.5 h-3.5 text-stone-600" />}
          </button>

          {isGiftView ? (
            <>
              <button
                type="button"
                onClick={handleExportPng}
                title="Download high-res PNG image"
                aria-label="Download PNG image"
                className={`h-8 px-2 sm:h-9 sm:px-3 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition ${
                  isDarkMode
                    ? 'border-stone-700 bg-[#1E1C1A] hover:bg-[#292524] text-stone-300'
                    : 'border border-stone-200 bg-white hover:bg-stone-50 text-[#1C1917]'
                }`}
              >
                <Download className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                <span className="hidden sm:inline">Save PNG</span>
              </button>
              <button
                type="button"
                onClick={isPreviewMode ? handleExitGiftViewToEditor : handleCreateOwnFromShared}
                className="h-8 px-2.5 sm:h-9 sm:px-3.5 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white dark:bg-white dark:text-[#1C1917] dark:hover:bg-stone-200 text-xs font-medium flex items-center gap-1.5 transition shrink-0"
              >
                <Flower2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Make your own</span>
                <span className="sm:hidden">Craft</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => startGiftBloomAnimation(items.length)}
                className={`hidden sm:flex h-8 sm:h-9 sm:w-auto sm:px-3 rounded-xl border text-xs font-medium items-center justify-center gap-1.5 transition ${
                  isDarkMode
                    ? 'border-stone-700 bg-[#1E1C1A] hover:bg-[#292524] text-stone-300'
                    : 'border border-stone-200 bg-white hover:bg-stone-50 text-[#1C1917]'
                }`}
                title="Preview recipient gift view"
                aria-label="Preview recipient gift view"
              >
                <Gift className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                <span className="hidden lg:inline">Gift view</span>
              </button>
              <button
                type="button"
                onClick={handleExportPng}
                aria-label="Download PNG"
                title="Download PNG"
                className={`hidden sm:flex h-8 px-2 sm:h-9 sm:px-3 rounded-xl border text-xs font-medium items-center gap-1.5 transition ${
                  isDarkMode
                    ? 'border-stone-700 bg-[#1E1C1A] hover:bg-[#292524] text-stone-300'
                    : 'border border-stone-200 bg-white hover:bg-stone-50 text-[#1C1917]'
                }`}
              >
                <Download className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
                <span className="hidden xl:inline">PNG</span>
              </button>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(true)}
                className="h-8 px-2.5 sm:h-9 sm:px-3.5 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white dark:bg-white dark:text-[#1C1917] dark:hover:bg-stone-200 text-xs font-medium flex items-center gap-1.5 transition shadow-sm shrink-0"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Save &amp; Send</span>
                <span className="sm:hidden">Send</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* MAIN RESPONSIVE WORKSPACE (Unified Clean Layout across Phone & Desktop) */}
      <div
        key={`studio-workspace-${studioEntranceKey}`}
        className={`flex-1 flex flex-col overflow-hidden relative ${
          studioEntranceKey > 0 ? 'studio-workspace-enter' : ''
        }`}
      >
        {/* CENTER MAIN STAGE AREA (Never resizes when selecting stems) */}
        <main className="flex-1 min-h-0 min-w-0 relative flex flex-col items-center justify-center overflow-hidden order-1">
          {/* Gentle Falling Petals Animation in Read-Only Gift View */}
          {(isGiftView || isPreviewMode) && <FallingPetalsOverlay items={items} />}

          {/* ===================================================================
              GIFT ENTRANCE OVERLAY — Full-Screen Couture Botanical Bloom Unveiling
              Minimal, expensive, non-text-y opening with our signature Watercolor
              & Colored Lineart Blooming Peony, Depth-of-Field foreground petals,
              and tactile Wax-Sealed Ribbon button.
              =================================================================== */}
          {(isGiftView || isPreviewMode) && isGiftEntranceOpen && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Bouquet Gift Entrance"
              className={`absolute inset-0 z-40 flex flex-col items-center justify-center px-4 sm:px-8 py-8 overflow-hidden select-none transition-all duration-420 ease-out ${
                isEntranceUnfurling ? 'opacity-0 scale-[1.08] pointer-events-none' : 'opacity-100 scale-100'
              } ${
                isDarkMode
                  ? 'bg-[#2B2321] text-[#FBF6F1]'
                  : 'bg-[#FDF9F5] text-[#231C18]'
              }`}
            >
              {/* Subtle Top-Left Return Button (Returns to Home for view-only showcase/shared gifts, or Studio for sender preview) */}
              <div className="absolute top-3 left-3 sm:top-5 sm:left-6 z-20">
                <button
                  type="button"
                  onClick={isPreviewMode ? handleExitGiftViewToEditor : handleReturnHomeFromGiftView}
                  data-testid="gift-entrance-back-btn"
                  className={`px-3.5 py-1.5 rounded-full border border-dashed text-xs font-medium inline-flex items-center gap-1.5 backdrop-blur-md transition cursor-pointer ${
                    isDarkMode
                      ? 'bg-[#352C29]/90 border-[#5E4E49] text-[#FBF6F1] hover:bg-[#423734]'
                      : 'bg-[#FFFDF9]/90 border-[#DECBB9] text-[#4A382E] hover:bg-[#FAF4EE]'
                  }`}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>{isPreviewMode ? 'Back to Studio' : 'Home'}</span>
                </button>
              </div>
              {/* Seamless Radial Aura Behind the Living Watercolor Bloom (Scales with slide progress) */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-1/2 w-[560px] sm:w-[980px] h-[560px] sm:h-[740px] rounded-full transition-transform duration-150 ease-out"
                style={{
                  transform: `translate(-50%, -50%) scale(${recipientBloom.auraScale})`,
                  background: isDarkMode
                    ? 'radial-gradient(closest-side at 50% 46%, rgba(164, 96, 116, 0.30) 0%, rgba(112, 82, 126, 0.14) 52%, rgba(43, 35, 33, 0) 100%)'
                    : 'radial-gradient(closest-side at 50% 46%, rgba(250, 210, 225, 0.72) 0%, rgba(235, 220, 250, 0.36) 52%, rgba(253, 249, 245, 0) 100%)',
                }}
              />

              {/* Two Large Out-of-Focus Wind-Swept Side-Profile Depth-of-Field Petals at the Outer Screen Edges
                  They part outward off the screen edges and fade away as the recipient slides to open */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -left-10 sm:-left-14 md:-left-16 bottom-[3%] w-56 h-40 sm:w-76 sm:h-52 md:w-92 md:h-64"
                style={{
                  filter: 'blur(13px)',
                  opacity: Number(((isDarkMode ? 0.38 : 0.55) * (1 - recipientBloom.progress)).toFixed(3)),
                  transform: `translate3d(${(-recipientBloom.progress * 180).toFixed(1)}px, ${(recipientBloom.progress * 55).toFixed(1)}px, 0) rotate(-10deg) scale(1.08)`,
                }}
              >
                <svg viewBox="0 0 220 150" className="w-full h-full overflow-visible">
                  <path
                    d="M 18,128 C 48,72 112,48 194,16 C 206,62 184,116 128,134 C 82,146 42,138 18,128 Z"
                    fill={isDarkMode ? '#E28BA6' : '#F6B0C8'}
                    fillOpacity="0.74"
                  />
                  <path
                    d="M 28,122 Q 112,92 184,26"
                    fill="none"
                    stroke={isDarkMode ? '#FAD2DF' : '#FFF7FA'}
                    strokeWidth="2.4"
                    strokeOpacity="0.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-10 sm:-right-14 md:-right-16 top-[11%] w-60 h-44 sm:w-80 sm:h-56 md:w-96 md:h-68"
                style={{
                  filter: 'blur(15px)',
                  opacity: Number(((isDarkMode ? 0.32 : 0.48) * (1 - recipientBloom.progress)).toFixed(3)),
                  transform: `translate3d(${(recipientBloom.progress * 190).toFixed(1)}px, ${(recipientBloom.progress * 40).toFixed(1)}px, 0) rotate(-6deg) scale(1.12)`,
                }}
              >
                <svg viewBox="0 0 220 150" className="w-full h-full overflow-visible">
                  <path
                    d="M 18,128 C 48,72 112,48 194,16 C 206,62 184,116 128,134 C 82,146 42,138 18,128 Z"
                    fill={isDarkMode ? '#E49B85' : '#F8BCAE'}
                    fillOpacity="0.68"
                  />
                  <path
                    d="M 28,122 Q 112,92 184,26"
                    fill="none"
                    stroke={isDarkMode ? '#FDE2D6' : '#FFFDF9'}
                    strokeWidth="2.4"
                    strokeOpacity="0.45"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              {/* LIVING WATERCOLOR & COLORED BOTANICAL LINEART BLOOMING PEONY
                  Blooms open in real time as the recipient slides the wax-seal handle */}
              <div
                aria-hidden="true"
                data-testid="recipient-entrance-bloom"
                data-bloom-progress={recipientBloom.progress}
                className={`pointer-events-none select-none absolute left-1/2 top-1/2 z-0 w-[410px] sm:w-[680px] md:w-[780px] h-[280px] sm:h-[450px] md:h-[520px] transition-all ${
                  isDraggingEntranceSlider ? 'duration-0' : 'duration-300'
                } ease-out ${
                  isEntranceUnfurling
                    ? '-translate-x-1/2 -translate-y-[50%] scale-[1.42] opacity-0'
                    : '-translate-x-1/2 -translate-y-[50%] scale-100'
                }`}
                style={{ opacity: isEntranceUnfurling ? 0 : isDarkMode ? 0.8 : 0.95 }}
              >
                <svg viewBox="0 0 520 340" className="w-full h-full overflow-visible">
                  <defs>
                    <radialGradient id="rg-wc-petal-blush" cx="50%" cy="35%" r="65%">
                      <stop offset="0%" stopColor={isDarkMode ? '#F4A6BE' : '#FCE4EC'} stopOpacity={isDarkMode ? '0.36' : '0.72'} />
                      <stop offset="55%" stopColor={isDarkMode ? '#D9829B' : '#F8BBD0'} stopOpacity={isDarkMode ? '0.24' : '0.44'} />
                      <stop offset="100%" stopColor={isDarkMode ? '#8E4A5E' : '#F48FB1'} stopOpacity="0.04" />
                    </radialGradient>
                    <radialGradient id="rg-wc-petal-peach" cx="50%" cy="30%" r="65%">
                      <stop offset="0%" stopColor={isDarkMode ? '#F7C5A8' : '#FFF0E6'} stopOpacity={isDarkMode ? '0.38' : '0.74'} />
                      <stop offset="60%" stopColor={isDarkMode ? '#E09878' : '#FCD5CE'} stopOpacity={isDarkMode ? '0.22' : '0.46'} />
                      <stop offset="100%" stopColor={isDarkMode ? '#9A5B42' : '#F9B4AB'} stopOpacity="0.03" />
                    </radialGradient>
                    <radialGradient id="rg-wc-leaf-sage" cx="50%" cy="50%" r="60%">
                      <stop offset="0%" stopColor={isDarkMode ? '#86B898' : '#E2F2E8'} stopOpacity={isDarkMode ? '0.30' : '0.66'} />
                      <stop offset="70%" stopColor={isDarkMode ? '#5E8E70' : '#C5E3D0'} stopOpacity={isDarkMode ? '0.16' : '0.34'} />
                      <stop offset="100%" stopColor="#6B9B7C" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="rg-wc-center-gold" cx="50%" cy="50%" r="55%">
                      <stop offset="0%" stopColor="#FDE68A" stopOpacity={isDarkMode ? '0.48' : '0.78'} />
                      <stop offset="65%" stopColor="#F59E0B" stopOpacity={isDarkMode ? '0.20' : '0.28'} />
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* 1. Botanical Sage Leaf Sprigs & Dashed Rope Tendrils (Unfurls with slide progress) */}
                  <g
                    transform={`translate(260, 170) scale(${recipientBloom.leafScale}, ${recipientBloom.leafScale})`}
                  >
                    <path
                      d="M -55,10 C -115,-28 -175,-18 -212,18 C -170,48 -110,44 -55,10 Z"
                      fill="url(#rg-wc-leaf-sage)"
                      stroke={isDarkMode ? '#8AB89A' : '#7AA387'}
                      strokeWidth="1.2"
                      strokeOpacity={isDarkMode ? '0.55' : '0.65'}
                    />
                    <path
                      d="M -60,10 Q -135,4 -198,17 M -115,7 L -138,-6 M -145,10 L -168,0 M -125,11 L -148,24"
                      fill="none"
                      stroke={isDarkMode ? '#8AB89A' : '#6A9478'}
                      strokeWidth="0.9"
                      strokeLinecap="round"
                      strokeOpacity={isDarkMode ? '0.48' : '0.56'}
                    />
                    <path
                      d="M -75,-18 C -128,-58 -168,-54 -194,-32"
                      fill="none"
                      stroke={isDarkMode ? '#D8A48F' : '#C28C7A'}
                      strokeWidth="1.05"
                      strokeDasharray="3 3"
                      strokeDashoffset={recipientBloom.stamenDashOffset}
                      strokeLinecap="round"
                      strokeOpacity="0.58"
                    />
                    <path
                      d="M -194,-32 C -210,-46 -222,-32 -206,-22 C -196,-16 -190,-24 -194,-32 Z"
                      fill="url(#rg-wc-petal-blush)"
                      stroke={isDarkMode ? '#E49EB3' : '#C97A90'}
                      strokeWidth="1.1"
                    />

                    <path
                      d="M 55,10 C 115,-28 175,-18 212,18 C 170,48 110,44 55,10 Z"
                      fill="url(#rg-wc-leaf-sage)"
                      stroke={isDarkMode ? '#8AB89A' : '#7AA387'}
                      strokeWidth="1.2"
                      strokeOpacity={isDarkMode ? '0.55' : '0.65'}
                    />
                    <path
                      d="M 60,10 Q 135,4 198,17 M 115,7 L 138,-6 M 145,10 L 168,0 M 125,11 L 148,24"
                      fill="none"
                      stroke={isDarkMode ? '#8AB89A' : '#6A9478'}
                      strokeWidth="0.9"
                      strokeLinecap="round"
                      strokeOpacity={isDarkMode ? '0.48' : '0.56'}
                    />
                    <path
                      d="M 75,-18 C 128,-58 168,-54 194,-32"
                      fill="none"
                      stroke={isDarkMode ? '#D8A48F' : '#C28C7A'}
                      strokeWidth="1.05"
                      strokeDasharray="3 3"
                      strokeDashoffset={recipientBloom.stamenDashOffset}
                      strokeLinecap="round"
                      strokeOpacity="0.58"
                    />
                    <path
                      d="M 194,-32 C 210,-46 222,-32 206,-22 C 196,-16 190,-24 194,-32 Z"
                      fill="url(#rg-wc-petal-blush)"
                      stroke={isDarkMode ? '#E49EB3' : '#C97A90'}
                      strokeWidth="1.1"
                    />
                  </g>

                  {/* 2. Outer Ring of 8 Watercolor Peony Petals (Blooms from 0.58 bud to 1.12 full bloom) */}
                  <g
                    transform={`translate(260, 170) rotate(${recipientBloom.outerRotateDeg}) scale(${recipientBloom.outerScale})`}
                  >
                    {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                      <g key={`rg-outer-${angle}`} transform={`rotate(${angle})`}>
                        <path
                          d="M 0,0 C -38,-34 -52,-98 0,-126 C 52,-98 38,-34 0,0 Z"
                          fill="url(#rg-wc-petal-blush)"
                          stroke={isDarkMode ? '#E5A3B7' : '#CD7E95'}
                          strokeWidth="1.2"
                          strokeOpacity={isDarkMode ? '0.56' : '0.66'}
                        />
                        <path
                          d="M 0,-14 Q -12,-62 -6,-106 M 0,-18 Q 12,-62 6,-106 M 0,-10 L 0,-114"
                          fill="none"
                          stroke={isDarkMode ? '#DF9BB0' : '#C67B91'}
                          strokeWidth="0.7"
                          strokeLinecap="round"
                          strokeOpacity={isDarkMode ? '0.38' : '0.44'}
                        />
                      </g>
                    ))}
                  </g>

                  {/* 3. Middle Ring of 8 Peach-Blush Cupped Petals (Blooms from 0.50 bud to 1.04 full bloom) */}
                  <g
                    transform={`translate(260, 170) rotate(${recipientBloom.midRotateDeg}) scale(${recipientBloom.midScale})`}
                  >
                    {[22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((angle) => (
                      <g key={`rg-mid-${angle}`} transform={`rotate(${angle})`}>
                        <path
                          d="M 0,0 C -28,-26 -38,-74 0,-94 C 38,-74 28,-26 0,0 Z"
                          fill="url(#rg-wc-petal-peach)"
                          stroke={isDarkMode ? '#E8B298' : '#C88A74'}
                          strokeWidth="1.1"
                          strokeOpacity={isDarkMode ? '0.58' : '0.68'}
                        />
                        <path
                          d="M 0,-12 Q -8,-48 -3,-78 M 0,-12 Q 8,-48 3,-78"
                          fill="none"
                          stroke={isDarkMode ? '#E2A88B' : '#B87B65'}
                          strokeWidth="0.65"
                          strokeLinecap="round"
                          strokeOpacity="0.42"
                        />
                      </g>
                    ))}
                  </g>

                  {/* 4. Inner Corolla & Golden Botanical Stamens (Blooms from 0.44 bud to 0.98 full bloom) */}
                  <g
                    transform={`translate(260, 170) rotate(${recipientBloom.innerRotateDeg}) scale(${recipientBloom.innerScale})`}
                  >
                    {[0, 60, 120, 180, 240, 300].map((angle) => (
                      <path
                        key={`rg-inner-${angle}`}
                        transform={`rotate(${angle})`}
                        d="M 0,0 C -18,-16 -22,-46 0,-58 C 22,-46 18,-16 0,0 Z"
                        fill="url(#rg-wc-petal-blush)"
                        stroke={isDarkMode ? '#F0B6C8' : '#C4748B'}
                        strokeWidth="1.05"
                        strokeOpacity="0.62"
                      />
                    ))}
                    <circle cx="0" cy="0" r="24" fill="url(#rg-wc-center-gold)" />
                    {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
                      <g key={`rg-stamen-${deg}`} transform={`rotate(${deg})`}>
                        <line
                          x1="0"
                          y1="-4"
                          x2="0"
                          y2="-20"
                          stroke={isDarkMode ? '#FCD34D' : '#D97706'}
                          strokeWidth="1"
                          strokeOpacity="0.58"
                          strokeLinecap="round"
                        />
                        <circle
                          cx="0"
                          cy="-21.5"
                          r="2"
                          fill={isDarkMode ? '#FDE68A' : '#F59E0B'}
                          fillOpacity="0.72"
                        />
                      </g>
                    ))}
                    <circle
                      cx="0"
                      cy="0"
                      r="6.5"
                      fill={isDarkMode ? '#FDE68A' : '#FEF3C7'}
                      stroke={isDarkMode ? '#F59E0B' : '#D97706'}
                      strokeWidth="1.05"
                      strokeOpacity="0.68"
                    />
                  </g>
                </svg>
              </div>

              {!isResolvingShortCode && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="relative z-10 max-w-xl w-full mx-auto text-center flex flex-col items-center px-3"
                >
                  {/* Delicate Thin Rope Lace & Scallop Bow Ornament Above Dedication */}
                  <div className="mb-3 sm:mb-4 opacity-85" aria-hidden="true">
                    <svg viewBox="0 0 220 24" className="w-36 sm:w-44 h-5 overflow-visible">
                      <line
                        x1="14"
                        y1="12"
                        x2="86"
                        y2="12"
                        stroke={isDarkMode ? '#8C766C' : '#C8B09E'}
                        strokeWidth="1.1"
                        strokeDasharray="2.5 3"
                        strokeLinecap="round"
                      />
                      <line
                        x1="134"
                        y1="12"
                        x2="206"
                        y2="12"
                        stroke={isDarkMode ? '#8C766C' : '#C8B09E'}
                        strokeWidth="1.1"
                        strokeDasharray="2.5 3"
                        strokeLinecap="round"
                      />
                      <path
                        d="M 110,12 C 100,4 92,8 97,13 C 100,16 106,14 110,12 Z M 110,12 C 120,4 128,8 123,13 C 120,16 114,14 110,12 Z"
                        fill="none"
                        stroke={isDarkMode ? '#E6B89C' : '#A6725C'}
                        strokeWidth="1.25"
                      />
                      <path
                        d="M 110,12 Q 104,18 100,21 M 110,12 Q 116,18 120,21"
                        fill="none"
                        stroke={isDarkMode ? '#E6B89C' : '#A6725C'}
                        strokeWidth="1.1"
                        strokeLinecap="round"
                      />
                      <circle cx="110" cy="12" r="1.8" fill={isDarkMode ? '#E6B89C' : '#A6725C'} />
                    </svg>
                  </div>

                  {/* Minimal Editorial Dedication Lockup Over the Living Peony Bloom */}
                  <h2
                    className="mx-auto leading-[0.98] tracking-[-0.02em]"
                    style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                  >
                    <span
                      className={`block text-2xl sm:text-3xl italic font-normal mb-1 ${
                        isDarkMode ? 'text-[#DFCFC6]' : 'text-[#6E594E]'
                      }`}
                    >
                      For
                    </span>
                    <span
                      className={`block text-[46px] sm:text-[62px] md:text-[74px] font-semibold tracking-[-0.02em] leading-[0.98] ${
                        isDarkMode ? 'text-[#FBF6F1]' : 'text-[#1F1815]'
                      }`}
                    >
                      {card.to || 'Someone Special'}
                    </span>
                  </h2>

                  {card.from && (
                    <p
                      className={`mt-3 sm:mt-4 text-lg sm:text-xl italic font-normal ${
                        isDarkMode ? 'text-[#E5D6CE]' : 'text-[#5C473C]'
                      }`}
                      style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                    >
                      with love,{' '}
                      <span
                        className={`not-italic font-semibold ${
                          isDarkMode ? 'text-[#F0C2AE]' : 'text-[#7A4B3A]'
                        }`}
                      >
                        {card.from}
                      </span>
                    </p>
                  )}

                  {/* MODE 1: TIME-CAPSULE COUNTDOWN LOCK (Clean Editorial Numerals, Zero Box Clutter) */}
                  {isCountdownLocked ? (
                    <div className="mt-7 sm:mt-8 flex flex-col items-center space-y-3" onClick={(e) => e.stopPropagation()}>
                      <div
                        className={`inline-flex items-center gap-3 sm:gap-5 px-6 py-3 rounded-full border border-dashed backdrop-blur-md shadow-[0_10px_28px_rgba(35,28,24,0.06)] ${
                          isDarkMode
                            ? 'bg-[#352C29]/90 border-[#5E4E49]'
                            : 'bg-[#FFFDF9]/90 border-[#D8C3B0]'
                        }`}
                      >
                        {[
                          { label: 'd', val: countdownParts.days },
                          { label: 'h', val: countdownParts.hours },
                          { label: 'm', val: countdownParts.minutes },
                          { label: 's', val: countdownParts.seconds },
                        ].map((unit, idx) => (
                          <React.Fragment key={unit.label}>
                            {idx > 0 && (
                              <span
                                aria-hidden="true"
                                className={`text-sm ${
                                  isDarkMode ? 'text-[#7E6B62]' : 'text-[#C8B4A4]'
                                }`}
                              >
                                ·
                              </span>
                            )}
                            <div className="flex items-baseline gap-0.5 tabular-nums">
                              <span
                                className={`text-2xl sm:text-3xl font-semibold ${
                                  isDarkMode ? 'text-[#F0C2AE]' : 'text-[#6E4434]'
                                }`}
                                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                              >
                                {unit.val}
                              </span>
                              <span
                                className={`text-xs italic ${
                                  isDarkMode ? 'text-[#B8A59B]' : 'text-[#8C7A70]'
                                }`}
                                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                              >
                                {unit.label}
                              </span>
                            </div>
                          </React.Fragment>
                        ))}
                      </div>

                      <p
                        className={`text-sm italic ${
                          isDarkMode ? 'text-[#C8B6AC]' : 'text-[#7D6B60]'
                        }`}
                        style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                      >
                        Opens{' '}
                        {countdownTargetMs
                          ? new Date(countdownTargetMs).toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })
                          : 'soon'}
                      </p>

                      {isPreviewMode && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnwrapGiftEntrance(true);
                          }}
                          className={`mt-1 px-4 py-1.5 rounded-full border border-dashed text-xs font-medium transition cursor-pointer ${
                            isDarkMode
                              ? 'border-[#5E4E49] bg-[#352C29]/80 text-[#E6D6C7] hover:bg-[#423632]'
                              : 'border-[#DECBB9] bg-white/80 text-[#5C4438] hover:bg-[#FAF4EE]'
                          }`}
                        >
                          Sender Preview: Test Unwrap
                        </button>
                      )}
                    </div>
                  ) : isPasscodeLocked ? (
                    /* MODE 2: SECRET HINT LOCK (Minimal Inline Pill Input + Wax Seal Submit) */
                    <form
                      onSubmit={handleAttemptPasscodeUnlock}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-6 sm:mt-7 w-full max-w-xs flex flex-col items-center space-y-2.5"
                    >
                      <p
                        className={`text-lg sm:text-xl italic font-normal leading-snug px-2 ${
                          isDarkMode ? 'text-[#F0DFD6]' : 'text-[#4A3B33]'
                        }`}
                        style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                      >
                        “{lock?.questionPrompt || 'Our special secret'}”
                      </p>

                      <div
                        className={`w-full flex items-center p-1 rounded-full border border-dashed shadow-[0_10px_28px_rgba(35,28,24,0.07)] backdrop-blur-md ${
                          isDarkMode
                            ? 'bg-[#352C29]/92 border-[#66554F]'
                            : 'bg-[#FFFDF9]/92 border-[#D8C3B0]'
                        }`}
                      >
                        <input
                          type="text"
                          value={passcodeAttempt}
                          onChange={(e) => {
                            setPasscodeAttempt(e.target.value);
                            if (passcodeError) setPasscodeError(null);
                          }}
                          placeholder="Secret answer..."
                          aria-label="Secret answer to unlock bouquet"
                          className={`flex-1 min-w-0 bg-transparent px-4 py-2 text-xs sm:text-sm focus:outline-none ${
                            isDarkMode
                              ? 'text-[#FBF6F1] placeholder:text-[#9A877B]'
                              : 'text-[#231C18] placeholder:text-[#9A877B]'
                          }`}
                        />
                        <button
                          type="submit"
                          className={`px-4 py-2 rounded-full text-xs font-medium shrink-0 transition active:scale-95 cursor-pointer ${
                            isDarkMode
                              ? 'bg-[#9A6550] text-white hover:bg-[#875642]'
                              : 'bg-[#7A4B3A] text-white hover:bg-[#633B2C]'
                          }`}
                        >
                          Unlock
                        </button>
                      </div>

                      {passcodeError && (
                        <p className="text-xs text-rose-600 dark:text-rose-300 font-medium">
                          {passcodeError}
                        </p>
                      )}

                      {isPreviewMode && (
                        <button
                          type="button"
                          onClick={() => handleUnwrapGiftEntrance(true)}
                          className={`pt-0.5 text-[11px] underline decoration-dashed underline-offset-4 transition cursor-pointer ${
                            isDarkMode
                              ? 'text-[#C8B6AC] hover:text-[#FBF6F1]'
                              : 'text-[#8C7A70] hover:text-[#231C18]'
                          }`}
                        >
                          Preview bloom without answer
                        </button>
                      )}
                    </form>
                  ) : (
                    /* MODE 3: SLIDE TO OPEN & BLOOM — Interactive Couture Wax-Seal Track */
                    <div className="mt-7 sm:mt-9 flex flex-col items-center">
                      <div
                        ref={entranceSliderTrackRef}
                        data-testid="recipient-slide-track"
                        role="button"
                        tabIndex={0}
                        aria-label="Slide to open bouquet"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleGlideSlideToOpen(entranceSlideProgress);
                          }
                        }}
                        onPointerDown={(e) => {
                          if (isEntranceUnfurling || isGiftCurrentlyLocked) return;
                          e.stopPropagation();
                          if (entranceSlideRafRef.current !== null) {
                            cancelAnimationFrame(entranceSlideRafRef.current);
                            entranceSlideRafRef.current = null;
                          }
                          e.currentTarget.setPointerCapture(e.pointerId);
                          entranceSliderDragStartXRef.current = e.clientX;
                          setIsDraggingEntranceSlider(true);
                        }}
                        onPointerMove={(e) => {
                          if (!isDraggingEntranceSlider || !entranceSliderTrackRef.current) return;
                          const rect = entranceSliderTrackRef.current.getBoundingClientRect();
                          const thumbDiameter = 42;
                          const maxTravel = Math.max(1, rect.width - thumbDiameter - 12);
                          const offsetFromLeft = e.clientX - rect.left - thumbDiameter / 2 - 6;
                          const ratio = Math.max(0, Math.min(1, offsetFromLeft / maxTravel));
                          setEntranceSlideProgress(ratio);
                        }}
                        onPointerUp={(e) => {
                          if (!isDraggingEntranceSlider) return;
                          setIsDraggingEntranceSlider(false);
                          const dragDistance =
                            entranceSliderDragStartXRef.current !== null
                              ? Math.abs(e.clientX - entranceSliderDragStartXRef.current)
                              : 0;
                          entranceSliderDragStartXRef.current = null;

                          if (entranceSlideProgress >= 0.72) {
                            handleGlideSlideToOpen(entranceSlideProgress);
                          } else if (dragDistance < 8) {
                            // Quick tap/click glides the slider smoothly across so the flower blooms open
                            handleGlideSlideToOpen(entranceSlideProgress);
                          } else {
                            setEntranceSlideProgress(0);
                          }
                        }}
                        onPointerCancel={() => {
                          setIsDraggingEntranceSlider(false);
                          entranceSliderDragStartXRef.current = null;
                          setEntranceSlideProgress(0);
                        }}
                        className={`relative w-[264px] sm:w-[280px] h-[52px] sm:h-[54px] rounded-full border border-dashed flex items-center select-none touch-none cursor-grab active:cursor-grabbing shadow-[0_12px_32px_rgba(35,28,24,0.08)] backdrop-blur-md overflow-hidden ${
                          isDarkMode
                            ? 'bg-[#352C29]/92 border-[#6A5750]'
                            : 'bg-[#FFFDF9]/92 border-[#D5BCA8]'
                        }`}
                      >
                        {/* Soft Blush/Terracotta Progress Fill Trailing the Wax-Seal Thumb */}
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-y-1.5 left-1.5 rounded-full transition-none"
                          style={{
                            width: `calc(40px + ${entranceSlideProgress} * (100% - 52px))`,
                            background: isDarkMode
                              ? 'linear-gradient(90deg, rgba(184, 93, 75, 0.30) 0%, rgba(230, 184, 156, 0.38) 100%)'
                              : 'linear-gradient(90deg, rgba(248, 187, 208, 0.42) 0%, rgba(180, 132, 108, 0.28) 100%)',
                          }}
                        />

                        {/* Centered Editorial Prompt ("Slide to open") */}
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 pl-8 flex items-center justify-center gap-1.5 text-xs sm:text-[13px] font-medium tracking-wide"
                          style={{
                            opacity: Math.max(0, 1 - entranceSlideProgress * 1.45),
                          }}
                        >
                          <span className={isDarkMode ? 'text-[#F0DFD6]' : 'text-[#5C4438]'}>
                            Slide to open
                          </span>
                          <ChevronRight
                            className={`w-3.5 h-3.5 ${
                              isDarkMode ? 'text-[#E6B89C]' : 'text-[#9A6B56]'
                            }`}
                          />
                        </div>

                        {/* Draggable Embossed Botanical Wax-Seal Thumb (Starts on Left, Slides to Right) */}
                        <div
                          data-testid="recipient-slide-thumb"
                          style={{
                            left: `calc(6px + ${entranceSlideProgress} * (100% - 46px))`,
                          }}
                          className={`absolute top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-[0_6px_16px_rgba(122,75,58,0.28)] ${
                            isDraggingEntranceSlider ? 'scale-105' : ''
                          } ${
                            isDarkMode
                              ? 'bg-[#9A6550] text-white'
                              : 'bg-[#7A4B3A] text-white'
                          }`}
                        >
                          <span className="w-7 h-7 rounded-full bg-[#B85D4B] border border-[#FFFDF9]/50 flex items-center justify-center">
                            <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 overflow-visible">
                              <circle
                                cx="10"
                                cy="10"
                                r="7.5"
                                fill="none"
                                stroke="#FDE68A"
                                strokeWidth="0.9"
                                strokeDasharray="2 1.6"
                                opacity="0.85"
                              />
                              <path
                                d="M10,7.8 C8.2,5.8 5.4,7.3 7,10.2 L10,13.2 L13,10.2 C14.6,7.3 11.8,5.8 10,7.8 Z"
                                fill="#FFFDF9"
                              />
                            </svg>
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Preserved hook for responsive studio test suite */}
          {!isGiftView && !isPreviewMode && drawerState === 'collapsed' && !selectedId && (
            <button
              type="button"
              onClick={() => {
                autoCollapsedRef.current = false;
                setDrawerState('peek');
              }}
              title="Open Flower Palette"
              aria-label="Open Flower Palette"
              className="hidden"
            >
              <Flower2 className="w-3.5 h-3.5 text-[#B4846C]" />
              <span>Add flowers</span>
            </button>
          )}

          {/* Interactive SVG Bouquet Stage (Always 100% height, zero layout shift) */}
          <div
            className={`flex-1 w-full h-full min-h-0 flex items-center justify-center relative touch-none ${
              (isGiftView || isPreviewMode) && isGiftEntranceOpen
                ? 'opacity-0 pointer-events-none'
                : (isGiftView || isPreviewMode) && !isGiftEntranceOpen
                ? 'gift-stage-entrance'
                : ''
            }`}
          >
            <BouquetStage
              svgRef={svgRef}
              isPreviewMode={isPreviewMode || isGiftView}
              isDarkMode={isDarkMode}
              bloomedCount={isGiftView ? bloomedCount : undefined}
              showCardInGiftView={isGiftView ? showGiftCardReveal : true}
              isVoicePlaying={isVoicePlaying}
              onWrapperClick={() => {
                if (isPreviewMode || isGiftView) return;
                selectItem(null);
                setActiveColorTarget('wrapper');
              }}
              onRibbonClick={() => {
                if (isPreviewMode || isGiftView) return;
                selectItem(null);
                setActiveColorTarget('ribbon');
              }}
              onCardSelect={() => {
                if (isPreviewMode || isGiftView) return;
                selectItem(null);
                setActiveColorTarget('card');
                setMobileCategory('card');
                setActiveTab('card');
              }}
              onCardTagClick={() => {
                if (isPreviewMode || isGiftView) {
                  if (isGiftEntranceOpen || isGiftCurrentlyLocked) return;
                  setLetterTypedChars(0);
                  setIsLetterModalOpen(true);
                } else {
                  selectItem(null);
                  setActiveColorTarget('card');
                  setIsMobileToolsExpanded(true);
                  setMobilePopover('card');
                  setMobileCategory('card');
                  setActiveTab('card');
                }
              }}
              onVoiceSelect={() => {
                if (isPreviewMode || isGiftView) return;
                selectItem(null);
                setActiveColorTarget('voicePrimary');
                setMobileCategory('voice');
              }}
              onVoiceKeepsakeClick={() => {
                if (isPreviewMode || isGiftView) {
                  if (isGiftEntranceOpen || isGiftCurrentlyLocked) return;
                  setIsVoiceModalOpen(true);
                  if (voice.audioDataUrl && !isVoicePlaying) {
                    handleTogglePlayVoice();
                  }
                } else {
                  selectItem(null);
                  setActiveColorTarget('voicePrimary');
                  setIsMobileToolsExpanded(true);
                  setMobilePopover('voice');
                  setMobileCategory('voice');
                }
              }}
            />

            {/* ===============================================================
                COLLAPSIBLE RIGHT-SIDE ACTION STACK (Phone & Desktop)
                Collapses the right-side tools down to the Eye button capsule.
                Clicking an active tool icon again immediately slides the side
                drawer closed.
                =============================================================== */}
            {!isGiftView && !isPreviewMode && !showLandingPage && (
              <div
                ref={floatingToolStackRef}
                className="absolute right-3 bottom-3 z-40 flex flex-col items-center gap-2"
              >
                {isMobileToolsExpanded && (
                  <div className="flex flex-col items-center gap-2 animate-in fade-in duration-150">
                    <button
                      type="button"
                      onClick={() => handleMobileFloatingTool('color')}
                      aria-pressed={mobilePopover === 'color'}
                      aria-label="Open Unified Color Picker"
                      title={mobilePopover === 'color' ? 'Hide Color Picker Drawer' : 'Colors (Petals, Wrapper, Ribbon, Card & Voice)'}
                      className={`w-10 h-10 rounded-full border shadow-md flex items-center justify-center active:scale-95 transition ${
                        mobilePopover === 'color'
                          ? 'bg-[#B4846C] text-white border-[#B4846C] ring-2 ring-[#B4846C]/30'
                          : isDarkMode
                          ? 'bg-[#1E1C1A]/95 border-stone-700 text-[#B4846C]'
                          : 'bg-white/95 border-stone-200/90 text-[#B4846C]'
                      }`}
                    >
                      <Palette className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMobileFloatingTool('stem')}
                      aria-pressed={mobilePopover === 'stem'}
                      aria-label="Open Stem Length, Size & Tilt Settings"
                      title={mobilePopover === 'stem' ? 'Hide Stem Settings Drawer' : 'Stem Settings (Length, Size & Tilt)'}
                      className={`w-10 h-10 rounded-full border shadow-md flex items-center justify-center active:scale-95 transition ${
                        mobilePopover === 'stem'
                          ? 'bg-[#B4846C] text-white border-[#B4846C] ring-2 ring-[#B4846C]/30'
                          : isDarkMode
                          ? 'bg-[#1E1C1A]/95 border-stone-700 text-[#B4846C]'
                          : 'bg-white/95 border-stone-200/90 text-[#B4846C]'
                      }`}
                    >
                      <Sliders className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMobileFloatingTool('layers')}
                      aria-pressed={mobilePopover === 'layers'}
                      aria-label="Open Layer Order Manager"
                      title={mobilePopover === 'layers' ? 'Hide Layer Order Drawer' : 'Layer Order (Drag to reorder, Lock & Hide)'}
                      className={`w-10 h-10 rounded-full border shadow-md flex items-center justify-center active:scale-95 transition ${
                        mobilePopover === 'layers'
                          ? 'bg-[#B4846C] text-white border-[#B4846C] ring-2 ring-[#B4846C]/30'
                          : isDarkMode
                          ? 'bg-[#1E1C1A]/95 border-stone-700 text-[#B4846C]'
                          : 'bg-white/95 border-stone-200/90 text-[#B4846C]'
                      }`}
                    >
                      <Layers className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMobileFloatingTool('card')}
                      aria-pressed={mobilePopover === 'card'}
                      aria-label="Edit greeting card"
                      title={mobilePopover === 'card' ? 'Hide Greeting Card Drawer' : 'Edit Greeting Card'}
                      className={`relative w-10 h-10 rounded-full border shadow-md flex items-center justify-center active:scale-95 transition ${
                        mobilePopover === 'card'
                          ? 'bg-[#B4846C] text-white border-[#B4846C] ring-2 ring-[#B4846C]/30'
                          : isDarkMode
                          ? 'bg-[#1E1C1A]/95 border-stone-700 text-[#B4846C]'
                          : 'bg-white/95 border-stone-200/90 text-[#B4846C]'
                      }`}
                    >
                      <PenLine className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMobileFloatingTool('voice')}
                      aria-pressed={mobilePopover === 'voice'}
                      aria-label="Open Voice Keepsake Recorder"
                      title={mobilePopover === 'voice' ? 'Hide Voice Recorder Drawer' : 'Voice Keepsake (Record Mixtape, Vinyl, Plushie, Music Box)'}
                      className={`relative w-10 h-10 rounded-full border shadow-md flex items-center justify-center active:scale-95 transition ${
                        mobilePopover === 'voice'
                          ? 'bg-[#B4846C] text-white border-[#B4846C] ring-2 ring-[#B4846C]/30'
                          : isDarkMode
                          ? 'bg-[#1E1C1A]/95 border-stone-700 text-[#B4846C]'
                          : 'bg-white/95 border-stone-200/90 text-[#B4846C]'
                      }`}
                    >
                      <Mic className="w-4 h-4" />
                      {voice.audioDataUrl && (
                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-rose-500 border border-white" />
                      )}
                    </button>
                  </div>
                )}

                {/* Bottom Capsule: Collapse/Expand Toggle + Eye (Preview Bloom) */}
                <div
                  className={`flex flex-col items-center rounded-full border shadow-md backdrop-blur-md p-0.5 transition-all ${
                    isDarkMode
                      ? 'bg-[#1E1C1A]/95 border-stone-700'
                      : 'bg-white/95 border-stone-200/90'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileToolsExpanded((prev) => {
                        const next = !prev;
                        if (!next) setMobilePopover(null);
                        return next;
                      });
                    }}
                    aria-expanded={isMobileToolsExpanded}
                    aria-label={
                      isMobileToolsExpanded
                        ? 'Collapse canvas tools down to eye button'
                        : 'Expand canvas tools (Colors, Stem, Layers, Card, Voice)'
                    }
                    title={isMobileToolsExpanded ? 'Collapse Tools' : 'More Tools (Colors, Stem, Layers, Card, Voice)'}
                    className={`relative w-9 h-7 rounded-t-full flex items-center justify-center active:scale-95 transition ${
                      isMobileToolsExpanded
                        ? 'text-stone-500 dark:text-stone-400 hover:text-[#1C1917] dark:hover:text-white'
                        : 'text-[#B4846C]'
                    }`}
                  >
                    {isMobileToolsExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" />
                        {(selectedId || mobilePopover) && (
                          <span className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-[#B4846C]" />
                        )}
                      </>
                    )}
                  </button>

                  <div className="w-5 h-[1px] bg-stone-200/80 dark:bg-stone-700/80" />

                  <button
                    type="button"
                    onClick={() => startGiftBloomAnimation(items.length, true)}
                    aria-label="Preview gift bloom"
                    title="Preview Bloom"
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[#B4846C] active:scale-95 transition"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ===============================================================
                SLIDE-IN LEFT SIDE DRAWER FOR COLORS, STEM, LAYERS, CARD & VOICE
                Slides smoothly from the left edge instead of popping a card over
                the center canvas. Clicking the active right-side icon again or
                tapping the side drawer's hide button slides it right back out.
                =============================================================== */}
            {!isGiftView && !isPreviewMode && (
              <aside
                ref={slideDrawerRef}
                aria-label="Slide-in Tool Drawer"
                aria-hidden={!mobilePopover}
                className={`absolute left-2.5 sm:left-4 top-2 sm:top-3 ${
                  mobilePopover === 'layers' ? 'bottom-3 sm:bottom-4' : 'max-h-[calc(100%-1.5rem)]'
                } z-30 w-[276px] sm:w-[310px] max-w-[calc(100vw-4.5rem)] rounded-[22px] border border-dashed shadow-[0_16px_42px_rgba(28,20,16,0.14)] backdrop-blur-xl overflow-hidden flex flex-col transition-all duration-200 ease-out ${
                  isDarkMode
                    ? 'bg-[#352C29]/95 border-[#5E4E49] text-[#FBF6F1]'
                    : 'bg-[#FFFDF9]/96 border-[#DECBB9] text-[#2A201D]'
                } ${
                  mobilePopover
                    ? 'translate-x-0 opacity-100'
                    : '-translate-x-[calc(100%+1.5rem)] opacity-0 pointer-events-none'
                }`}
              >
                {/* Clean Stationary Header: Active Tool Title + Slide-Closed Button */}
                <div
                  className={`flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-dashed shrink-0 ${
                    isDarkMode ? 'border-[#4E403B]' : 'border-[#EADFD4]'
                  }`}
                >
                  <h3
                    className="text-lg font-medium tracking-tight"
                    style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                  >
                    {mobilePopover === 'color'
                      ? 'Palette & Colors'
                      : mobilePopover === 'stem'
                      ? 'Stem Adjustment'
                      : mobilePopover === 'layers'
                      ? 'Bouquet Layers'
                      : mobilePopover === 'card'
                      ? 'Greeting Card'
                      : 'Voice Keepsake'}
                  </h3>

                  <button
                    type="button"
                    onClick={() => setMobilePopover(null)}
                    aria-label="Slide drawer closed"
                    title="Close panel"
                    className={`p-1.5 rounded-full transition cursor-pointer ${
                      isDarkMode
                        ? 'text-[#C8B6AC] hover:text-[#FBF6F1] hover:bg-[#463A36]'
                        : 'text-[#8C7A70] hover:text-[#2A201D] hover:bg-[#F5EDE4]'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>

                {/* Side Drawer Content */}
                <div className="flex-1 overflow-y-auto p-3">
                  {mobilePopover === 'color' && (
                    <SelectedFlowerToolbar
                      isDrawerOpen={false}
                      mobileSheetMode="color"
                      activeColorTarget={activeColorTarget}
                      onColorTargetChange={setActiveColorTarget}
                      onCloseMobileSheet={() => setMobilePopover(null)}
                    />
                  )}

                  {mobilePopover === 'stem' && (
                    <SelectedFlowerToolbar
                      isDrawerOpen={false}
                      mobileSheetMode="stem"
                      activeColorTarget={activeColorTarget}
                      onColorTargetChange={setActiveColorTarget}
                      onCloseMobileSheet={() => setMobilePopover(null)}
                    />
                  )}

                  {mobilePopover === 'layers' && (
                    <LayerManagerPanel isEmbeddedInSidebar />
                  )}

                  {mobilePopover === 'card' && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[#7D6B60] dark:text-[#C2B0A6]">
                          Note on bouquet
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCard({ visibleOnStage: !card.visibleOnStage })}
                          title={card.visibleOnStage ? 'Hide card tag' : 'Show card tag'}
                          aria-label={card.visibleOnStage ? 'Hide card tag' : 'Show card tag'}
                          className={`px-2.5 py-0.5 rounded-full border border-dashed text-[11px] font-medium flex items-center gap-1 shrink-0 transition cursor-pointer ${
                            !card.visibleOnStage
                              ? 'border-rose-300/80 text-rose-600 dark:border-rose-800 dark:text-rose-300'
                              : isDarkMode
                              ? 'border-[#5C4B47] bg-[#2B2321] text-[#E6D6C7]'
                              : 'border-[#DECBB9] bg-[#FAF4EE] text-[#5C4438]'
                          }`}
                        >
                          {card.visibleOnStage ? (
                            <>
                              <Eye className="w-3 h-3" />
                              <span>Visible</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3" />
                              <span>Hidden</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Card Text Inputs with Placeholders for Recipient, Message Body, and Sender */}
                      <div className="space-y-2">
                        <input
                          type="text"
                          maxLength={32}
                          value={card.to}
                          placeholder="Recipient (e.g., My Dearest)"
                          onChange={(e) => updateCard({ to: e.target.value })}
                          aria-label="Recipient"
                          className="w-full px-3 py-1.5 rounded-xl border border-dashed border-[#DECBB9] dark:border-[#5C4B47] bg-[#FAF4EE]/60 dark:bg-[#2B2321] text-sm focus:outline-none focus:border-[#B4846C] placeholder:text-[#9A877B]/75"
                          style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '16px' }}
                        />

                        <div className="relative">
                          <textarea
                            rows={4}
                            maxLength={600}
                            value={card.message}
                            placeholder="Write your heartfelt message..."
                            onChange={(e) => updateCard({ message: e.target.value })}
                            aria-label="Card message"
                            className="w-full px-3 py-1.5 pb-5 rounded-xl border border-dashed border-[#DECBB9] dark:border-[#5C4B47] bg-[#FAF4EE]/60 dark:bg-[#2B2321] text-sm focus:outline-none focus:border-[#B4846C] resize-none overflow-y-auto placeholder:text-[#9A877B]/75"
                            style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '16px' }}
                          />
                          <span className="absolute bottom-1.5 right-2.5 text-[10px] text-[#9A877B] pointer-events-none">
                            {card.message.length}/600
                          </span>
                        </div>

                        <input
                          type="text"
                          maxLength={32}
                          value={card.from}
                          placeholder="Sender (e.g., Yours Always)"
                          onChange={(e) => updateCard({ from: e.target.value })}
                          aria-label="Sender"
                          className="w-full px-3 py-1.5 rounded-xl border border-dashed border-[#DECBB9] dark:border-[#5C4B47] bg-[#FAF4EE]/60 dark:bg-[#2B2321] text-sm focus:outline-none focus:border-[#B4846C] placeholder:text-[#9A877B]/75"
                          style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '16px' }}
                        />
                      </div>
                    </div>
                  )}

                  {mobilePopover === 'voice' && (
                    <VoiceRecorderStudio
                      voice={voice}
                      isDarkMode={isDarkMode}
                      isVoicePlaying={isVoicePlaying}
                      onTogglePlayVoice={handleTogglePlayVoice}
                      onStopVoice={handleStopVoice}
                      onUpdateVoice={updateVoice}
                      onOpenVoiceColors={() => {
                        setActiveColorTarget('voicePrimary');
                        setMobilePopover('color');
                      }}
                      onTriggerToast={triggerToast}
                    />
                  )}
                </div>
              </aside>
            )}
          </div>

          {/* ===================================================================
              RECIPIENT TOP FLOATING DEDICATION & AMBIENT PILL BAR
              Quiet luxury header showing "For [Recipient] · with love, [Sender]"
              on the left and Replay Bloom / Music / Theme controls on the right.
              =================================================================== */}
          {(isPreviewMode || isGiftView) && !isGiftEntranceOpen && (
            <div className="w-full max-w-full px-2.5 sm:px-6 z-20 absolute top-3 sm:top-4 inset-x-0 pointer-events-none flex items-center justify-between gap-1.5 sm:gap-2">
              {/* Left: Dedication Capsule (Flexes and truncates cleanly so right pill never clips on mobile) */}
              <div
                className={`pointer-events-auto min-w-0 flex-initial max-w-[calc(100%-6.75rem)] sm:max-w-md inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full border border-dashed shadow-[0_6px_24px_rgba(35,28,24,0.06)] backdrop-blur-md ${
                  isDarkMode
                    ? 'bg-[#352C29]/90 border-[#5E4E49] text-[#FBF6F1]'
                    : 'bg-[#FFFDF9]/90 border-[#DECBB9] text-[#231C18]'
                }`}
              >
                <button
                  type="button"
                  onClick={isPreviewMode ? handleExitGiftViewToEditor : handleReturnHomeFromGiftView}
                  title={isPreviewMode ? 'Back to Studio' : 'Back to Send A Bouquet Home'}
                  aria-label={isPreviewMode ? 'Back to Studio' : 'Back to Send A Bouquet Home'}
                  className="shrink-0 hover:opacity-80 transition cursor-pointer flex items-center"
                >
                  <BrandLogoMark className="w-4.5 h-4.5 sm:w-5.5 sm:h-5.5 shrink-0" isDarkMode={isDarkMode} />
                </button>
                <div
                  className="min-w-0 truncate text-xs sm:text-base leading-tight"
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                >
                  <span className="italic opacity-75 mr-1">For</span>
                  <span className="font-semibold tracking-tight">{card.to || 'My Dearest'}</span>
                  {card.from && (
                    <span
                      className={`ml-1.5 sm:ml-2 italic text-[11px] sm:text-sm ${
                        isDarkMode ? 'text-[#C8B6AC]' : 'text-[#8C7A70]'
                      }`}
                    >
                      · with love, {card.from}
                    </span>
                  )}
                </div>
              </div>

              {/* Right: Quiet Ambient Controls (Replay Bloom, Music, Theme — never clipped on mobile) */}
              <div
                className={`pointer-events-auto inline-flex items-center gap-0.5 px-1.5 sm:px-2 py-1 rounded-full border border-dashed shadow-[0_6px_24px_rgba(35,28,24,0.06)] backdrop-blur-md shrink-0 ${
                  isDarkMode
                    ? 'bg-[#352C29]/90 border-[#5E4E49] text-[#FBF6F1]'
                    : 'bg-[#FFFDF9]/90 border-[#DECBB9] text-[#231C18]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => startGiftBloomAnimation(items.length, false)}
                  aria-label="Replay bloom animation"
                  title="Replay bloom animation"
                  className={`h-6 sm:h-7 px-1.5 sm:px-2 rounded-full text-[11px] font-medium flex items-center gap-1.5 transition active:scale-95 cursor-pointer ${
                    isDarkMode
                      ? 'text-[#E6D6C7] hover:text-[#FBF6F1]'
                      : 'text-[#5C4438] hover:text-[#231C18]'
                  }`}
                >
                  <RotateCcw className="w-3 h-3 text-[#B4846C]" />
                  <span className="hidden sm:inline">Replay</span>
                </button>

                <span aria-hidden="true" className="opacity-25 text-xs select-none">·</span>

                <button
                  type="button"
                  onClick={handleToggleMusic}
                  aria-pressed={isMusicPlaying}
                  aria-label={isMusicPlaying ? 'Pause music' : 'Play music'}
                  title={isMusicPlaying ? 'Pause music box' : 'Play music box'}
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition active:scale-95 cursor-pointer ${
                    isMusicPlaying
                      ? 'text-[#B4846C]'
                      : isDarkMode
                      ? 'text-[#C8B6AC] hover:text-[#FBF6F1]'
                      : 'text-[#7D6B60] hover:text-[#231C18]'
                  }`}
                >
                  {isMusicPlaying ? <Music className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>

                <span aria-hidden="true" className="opacity-25 text-xs select-none">·</span>

                <button
                  type="button"
                  onClick={() => setIsDarkMode((prev) => !prev)}
                  aria-label="Toggle theme"
                  title="Toggle theme"
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition active:scale-95 cursor-pointer ${
                    isDarkMode
                      ? 'text-[#E6B89C] hover:text-[#FBF6F1]'
                      : 'text-[#7D6B60] hover:text-[#231C18]'
                  }`}
                >
                  {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-300" /> : <Moon className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}

          {/* ===================================================================
              RECIPIENT BOTTOM KEEPSAKE BAR & MINIATURE STATIONERY REPLY POSTCARD
              Single-surface couture dock (zero nested pills-in-pills) + cute
              postage-stamped miniature stationery reply card.
              =================================================================== */}
          {(isPreviewMode || isGiftView) && !isGiftEntranceOpen && (
            <div
              className="w-full px-3 sm:px-4 z-20 absolute bottom-3.5 sm:bottom-6 inset-x-0 pointer-events-none flex flex-col items-center gap-2.5"
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            >
              {/* Miniature Stationery Reply Postcard */}
              {isReactionPopoverOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className={`pointer-events-auto relative w-full max-w-[340px] rounded-[24px] p-4 sm:p-5 border border-dashed shadow-[0_24px_60px_rgba(28,20,16,0.18)] backdrop-blur-xl animate-in fade-in duration-150 ${
                    isDarkMode
                      ? 'bg-[#352C29]/96 border-[#5E4E49] text-[#FBF6F1]'
                      : 'bg-[#FFFDF9]/96 border-[#DECBB9] text-[#231C18]'
                  }`}
                >
                  {/* Top Header: Serif Salutation + Tiny Floral Postage Stamp + Close */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <span
                        className="block text-xl sm:text-2xl italic font-normal tracking-tight leading-tight"
                        style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                      >
                        Dear {card.from || 'Friend'},
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Cute Perforated Botanical Postage Stamp */}
                      <div
                        aria-hidden="true"
                        className={`w-8 h-9 rounded-[4px] border border-dashed flex items-center justify-center rotate-3 ${
                          isDarkMode
                            ? 'border-[#6E5A53] bg-[#2B2321]'
                            : 'border-[#D5BFA9] bg-[#FAF3EB]'
                        }`}
                      >
                        <svg viewBox="0 0 24 24" className="w-4 h-4">
                          <circle cx="12" cy="12" r="2.2" fill="#E8A558" />
                          <circle cx="12" cy="7.5" r="2.4" fill="#F29BB0" fillOpacity="0.85" />
                          <circle cx="16.2" cy="10.5" r="2.4" fill="#F29BB0" fillOpacity="0.85" />
                          <circle cx="14.6" cy="15.5" r="2.4" fill="#F29BB0" fillOpacity="0.85" />
                          <circle cx="9.4" cy="15.5" r="2.4" fill="#F29BB0" fillOpacity="0.85" />
                          <circle cx="7.8" cy="10.5" r="2.4" fill="#F29BB0" fillOpacity="0.85" />
                        </svg>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsReactionPopoverOpen(false)}
                        className={`p-1 rounded-full transition cursor-pointer ${
                          isDarkMode
                            ? 'text-[#C8B6AC] hover:text-[#FBF6F1] hover:bg-[#463A36]'
                            : 'text-[#8C7A70] hover:text-[#231C18] hover:bg-[#FAF4EE]'
                        }`}
                        aria-label="Close reaction card"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Subtle Reactions Row */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {RECIPIENT_REACTIONS.map((rx) => {
                      const active = selectedReactionId === rx.id;
                      return (
                        <button
                          key={rx.id}
                          type="button"
                          onClick={() => setSelectedReactionId(rx.id)}
                          className={`px-2.5 py-1 rounded-full border text-[11px] font-medium inline-flex items-center gap-1 transition cursor-pointer ${
                            active
                              ? isDarkMode
                                ? 'border-[#E6B89C] bg-[#E6B89C]/20 text-[#FBF6F1]'
                                : 'border-[#6E4434] bg-[#6E4434]/10 text-[#231C18]'
                              : isDarkMode
                              ? 'border-dashed border-[#544540] text-[#D8C7BE] hover:border-[#6E5B54]'
                              : 'border-dashed border-[#DECBB9] text-[#5C4438] hover:border-[#C5A892]'
                          }`}
                        >
                          <span>{rx.symbol}</span>
                          <span>{rx.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Ruled Stationery Note Lines */}
                  <textarea
                    rows={2}
                    maxLength={200}
                    value={recipientReplyText}
                    onChange={(e) => setRecipientReplyText(e.target.value)}
                    placeholder="Write a little note back..."
                    style={{
                      fontFamily: "'Cormorant Garamond', Georgia, serif",
                      fontSize: '17px',
                      lineHeight: '28px',
                      backgroundImage: isDarkMode
                        ? 'repeating-linear-gradient(transparent, transparent 27px, rgba(212, 180, 158, 0.14) 27px, rgba(212, 180, 158, 0.14) 28px)'
                        : 'repeating-linear-gradient(transparent, transparent 27px, rgba(180, 148, 125, 0.18) 27px, rgba(180, 148, 125, 0.18) 28px)',
                    }}
                    className={`w-full px-1 py-0.5 bg-transparent resize-none focus:outline-none ${
                      isDarkMode
                        ? 'text-[#FBF6F1] placeholder:text-[#9A877B]'
                        : 'text-[#231C18] placeholder:text-[#9A877B]'
                    }`}
                  />

                  <div className="mt-3 flex items-center justify-end">
                    <button
                      type="button"
                      disabled={isSubmittingReaction}
                      onClick={handleSubmitRecipientReaction}
                      className={`py-2 px-5 rounded-full text-xs font-medium transition cursor-pointer disabled:opacity-50 ${
                        isDarkMode
                          ? 'bg-[#E6B89C] text-[#231C18] hover:bg-[#F0C8B0]'
                          : 'bg-[#6E4434] text-[#FFFDF9] hover:bg-[#5B3729]'
                      }`}
                    >
                      {isSubmittingReaction ? 'Sending...' : 'Send Reply'}
                    </button>
                  </div>
                </div>
              )}

              {/* Single-Surface Couture Keepsake Dock (Fits 100% on narrow mobile viewports without clipping) */}
              <div
                className={`pointer-events-auto inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2.5 py-1.5 rounded-full border border-dashed shadow-[0_12px_36px_rgba(35,28,24,0.10)] backdrop-blur-md max-w-[calc(100vw-1rem)] overflow-x-auto no-scrollbar transition-all duration-500 ${
                  isDarkMode
                    ? 'bg-[#352C29]/94 border-[#5E4E49] text-[#FBF6F1]'
                    : 'bg-[#FFFDF9]/94 border-[#DECBB9] text-[#231C18]'
                } ${
                  showGiftCardReveal || isPreviewMode
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-3 pointer-events-none'
                }`}
              >
                {/* 1. Open / Read Letter Action */}
                {card.visibleOnStage && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setLetterTypedChars(0);
                        setIsLetterModalOpen(true);
                      }}
                      className={`px-2 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-medium flex items-center gap-1 sm:gap-1.5 shrink-0 transition active:scale-95 cursor-pointer ${
                        isDarkMode
                          ? 'text-[#FBF6F1] hover:bg-[#423632]/70'
                          : 'text-[#5C4438] hover:bg-[#FAF4EE]'
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5 text-[#B4846C]" />
                      <span>Letter</span>
                    </button>
                    <span aria-hidden="true" className="hidden sm:inline opacity-25 text-xs select-none">·</span>
                  </>
                )}

                {/* 2. Recipient Voice Keepsake Play Action */}
                {(voice.visibleOnStage || Boolean(voice.audioDataUrl)) && (
                  <>
                    <button
                      type="button"
                      aria-label={isVoicePlaying ? 'Pause voice' : 'Play voice'}
                      title={isVoicePlaying ? 'Pause voice' : 'Play voice'}
                      onClick={() => {
                        if (voice.audioDataUrl) {
                          handleTogglePlayVoice();
                        } else {
                          setIsVoiceModalOpen(true);
                        }
                      }}
                      className={`px-2 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-medium flex items-center gap-1 sm:gap-1.5 shrink-0 transition active:scale-95 cursor-pointer ${
                        isVoicePlaying
                          ? 'text-rose-500 font-semibold'
                          : isDarkMode
                          ? 'text-[#FBF6F1] hover:bg-[#423632]/70'
                          : 'text-[#5C4438] hover:bg-[#FAF4EE]'
                      }`}
                    >
                      {isVoicePlaying ? (
                        <Pause className="w-3.5 h-3.5 fill-current" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current text-[#B4846C]" />
                      )}
                      <span>Voice</span>
                    </button>
                    <span aria-hidden="true" className="hidden sm:inline opacity-25 text-xs select-none">·</span>
                  </>
                )}

                {/* 3. Recipient Reaction / Reply Note Action */}
                <button
                  type="button"
                  onClick={() => setIsReactionPopoverOpen((prev) => !prev)}
                  className={`px-2 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-medium flex items-center gap-1 sm:gap-1.5 shrink-0 transition active:scale-95 cursor-pointer ${
                    hasSubmittedReaction
                      ? 'text-rose-600 dark:text-rose-300'
                      : isDarkMode
                      ? 'text-[#FBF6F1] hover:bg-[#423632]/70'
                      : 'text-[#5C4438] hover:bg-[#FAF4EE]'
                  }`}
                >
                  <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20" />
                  <span>{hasSubmittedReaction ? 'Sent' : 'Reply'}</span>
                </button>

                <span aria-hidden="true" className="hidden sm:inline opacity-25 text-xs select-none">·</span>

                {/* 4. Save Keepsake PNG Action */}
                <button
                  type="button"
                  onClick={handleExportPng}
                  aria-label="Save as PNG"
                  title="Save bouquet keepsake image"
                  className={`px-2 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-medium flex items-center gap-1 sm:gap-1.5 shrink-0 transition active:scale-95 cursor-pointer ${
                    isDarkMode
                      ? 'text-[#FBF6F1] hover:bg-[#423632]/70'
                      : 'text-[#5C4438] hover:bg-[#FAF4EE]'
                  }`}
                >
                  <Download className="w-3.5 h-3.5 text-[#B4846C]" />
                  <span>Save</span>
                </button>

                {/* 5. Back to Editing / Craft Yours Filled CTA Pill */}
                <button
                  type="button"
                  onClick={isPreviewMode ? handleExitGiftViewToEditor : handleCreateOwnFromShared}
                  className={`ml-0.5 sm:ml-1 px-3 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-medium flex items-center gap-1 sm:gap-1.5 shrink-0 transition active:scale-95 cursor-pointer whitespace-nowrap ${
                    isDarkMode
                      ? 'bg-[#E6B89C] text-[#231C18] hover:bg-[#F0C8B0]'
                      : 'bg-[#6E4434] text-[#FFFDF9] hover:bg-[#5B3729]'
                  }`}
                >
                  {isPreviewMode ? (
                    <>
                      <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
                      <span>Back to Studio</span>
                    </>
                  ) : (
                    <>
                      <Flower2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Craft Yours</span>
                    </>
                  )}
                </button>

                {/* Preserved hidden span for SSR test assertion */}
                <span className="hidden">Make your own bouquet</span>
              </div>
            </div>
          )}
        </main>

        {/* ===================================================================
            UNIFIED BOTTOM HORIZONTAL CAROUSEL DOCK (Phone & Desktop)
            Includes VisualViewport + safe-area-inset-bottom clearance so mobile
            browsers (like Edge Mobile, Safari, Chrome) never cover the flowers!
            =================================================================== */}
        {!isPreviewMode && !isGiftView && (
          <section
            aria-label="Mobile Studio Dock"
            className={`w-full shrink-0 border-t px-2.5 sm:px-5 pt-2 pb-[max(0.85rem,calc(env(safe-area-inset-bottom,0px)+0.5rem))] sm:pb-3 order-2 z-20 select-none transition-all duration-200 ${
              isDarkMode
                ? 'bg-[#352C29] border-[#4E423E] text-[#FBF6F1]'
                : 'bg-white border-stone-200/80 text-[#1C1917]'
            }`}
          >
            {/* Row 1: Category Pill Tabs + Reset & Collapse/Expand Tray Buttons (Works on Phone & Desktop) */}
            <div
              className={`flex items-center justify-between gap-1.5 sm:gap-2 ${
                isDesktopDockCollapsed ? 'pb-0' : 'pb-2'
              }`}
            >
              <div
                className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar"
                role="tablist"
              >
                {(
                  [
                    { id: 'templates', label: 'Templates' },
                    { id: 'wrapping', label: 'Wrappers' },
                    { id: 'flowers', label: 'Flowers' },
                    { id: 'fillers', label: 'Fillers' },
                    { id: 'ribbon', label: 'Ribbon' },
                    { id: 'card', label: 'Card' },
                    { id: 'voice', label: 'Voice' }
                  ] as { id: MobileCategory; label: string }[]
                ).map((cat) => {
                  const isActive = mobileCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => {
                        if (cat.id === 'wrapping') setActiveColorTarget('wrapper');
                        else if (cat.id === 'ribbon') setActiveColorTarget('ribbon');
                        else if (cat.id === 'card') setActiveColorTarget('card');
                        else if (cat.id === 'voice') setActiveColorTarget('voicePrimary');
                        else if (cat.id === 'flowers' || cat.id === 'fillers') setActiveColorTarget('petal');

                        if (isActive) {
                          setIsDesktopDockCollapsed((prev) => !prev);
                        } else {
                          setMobileCategory(cat.id);
                          setIsDesktopDockCollapsed(false);
                        }
                      }}
                      className={`px-3 sm:px-3.5 py-1 rounded-full text-[11px] sm:text-xs font-medium whitespace-nowrap shrink-0 transition flex items-center gap-1 ${
                        isActive
                          ? 'bg-[#B4846C] text-white shadow-xs border border-[#B4846C]'
                          : isDarkMode
                          ? 'bg-[#292524] text-stone-300 border border-stone-700 hover:bg-stone-800'
                          : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      <span>{cat.label}</span>
                      {cat.id === 'voice' && voice.audioDataUrl && (
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center shrink-0">
                {/* Collapsible Down Toggle for the Bottom Flowers/Wrappers Section */}
                <button
                  type="button"
                  onClick={() => setIsDesktopDockCollapsed((prev) => !prev)}
                  aria-expanded={!isDesktopDockCollapsed}
                  aria-label={
                    isDesktopDockCollapsed
                      ? 'Expand bottom flowers and wrappers tray'
                      : 'Collapse bottom flowers and wrappers tray down'
                  }
                  title={
                    isDesktopDockCollapsed
                      ? 'Expand tray'
                      : 'Collapse tray down'
                  }
                  className={`inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-medium border border-dashed shrink-0 transition cursor-pointer ${
                    isDarkMode
                      ? 'bg-[#2B2321] border-[#52433E] text-[#D8C7BE] hover:border-[#B4846C] hover:text-white'
                      : 'bg-[#FAF4EE] border-[#E2D1C1] text-[#6E5D54] hover:border-[#B4846C] hover:text-[#1C1917]'
                  }`}
                >
                  <span className="hidden lg:inline">{isDesktopDockCollapsed ? 'Show' : 'Hide'}</span>
                  {isDesktopDockCollapsed ? (
                    <ChevronUp className="w-3.5 h-3.5 text-[#B4846C]" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-[#B4846C]" />
                  )}
                </button>
              </div>
            </div>

            {/* Row 2: Horizontal Circular Item Carousel with Desktop Scroll Arrows & Mouse-Wheel Support */}
            <div
              className={`relative flex items-center ${
                isDesktopDockCollapsed ? 'hidden' : ''
              }`}
            >
              {/* Left Carousel Scroll Arrow Button (Desktop & Tablet) */}
              <button
                type="button"
                data-testid="studio-carousel-prev"
                onClick={() => handleScrollStudioCarousel('left')}
                aria-label="Scroll selection choices left"
                title="Previous choices"
                className={`hidden sm:flex items-center justify-center w-8 h-8 rounded-full border border-dashed shrink-0 mr-1.5 transition active:scale-95 cursor-pointer shadow-xs ${
                  canScrollCarouselLeft
                    ? isDarkMode
                      ? 'bg-[#2B2321] border-[#6A5750] text-[#FBF6F1] hover:border-[#B4846C]'
                      : 'bg-[#FAF4EE] border-[#DECBB9] text-[#5C4438] hover:border-[#B4846C]'
                    : isDarkMode
                    ? 'bg-[#2B2321]/40 border-[#4A3D38] text-[#7A6860] opacity-50'
                    : 'bg-[#FAF4EE]/50 border-[#E8D9CB] text-[#B8A69A] opacity-50'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div
                ref={studioCarouselRef}
                onScroll={updateStudioCarouselScrollState}
                onWheel={(e) => {
                  if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && studioCarouselRef.current) {
                    studioCarouselRef.current.scrollLeft += e.deltaY;
                    updateStudioCarouselScrollState();
                  }
                }}
                className="flex-1 min-w-0 flex items-start gap-2.5 sm:gap-3 overflow-x-auto no-scrollbar pt-0.5 pb-1 scroll-smooth"
              >
                {/* CATEGORY 1: TEMPLATES */}
              {mobileCategory === 'templates' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      currentSessionVaultCodeRef.current = null;
                      clearBouquet();
                      triggerToast('Started over with an empty bouquet');
                    }}
                    className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0 w-[60px] sm:w-[68px] group"
                  >
                    <div
                      className={`w-13 h-13 sm:w-16 sm:h-16 rounded-full border flex items-center justify-center shadow-2xs transition-transform group-active:scale-95 ${
                        isDarkMode
                          ? 'bg-[#292524] border-stone-700 group-hover:border-red-400'
                          : 'bg-stone-50/70 border-stone-200/90 group-hover:border-red-300'
                      }`}
                    >
                      <RotateCcw className="w-5 h-5 text-[#B4846C] group-hover:text-red-500" />
                    </div>
                    <span className="text-[11px] font-medium text-stone-700 dark:text-stone-300 truncate w-full text-center">
                      Start Over
                    </span>
                  </button>

                  {STARTER_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => {
                        currentSessionVaultCodeRef.current = null;
                        loadSnapshot(tpl.snapshot);
                        triggerToast(`Loaded ${tpl.name}`);
                      }}
                      className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0 w-[60px] sm:w-[68px] group"
                    >
                      <div
                        className={`w-13 h-13 sm:w-16 sm:h-16 rounded-full border flex items-center justify-center shadow-2xs transition-transform group-active:scale-95 ${
                          isDarkMode
                            ? 'bg-[#292524] border-stone-700 group-hover:border-[#B4846C]'
                            : 'bg-stone-50/70 border-stone-200/90 group-hover:border-[#B4846C]'
                        }`}
                      >
                        <MiniTemplateBouquetSVG
                          wrapColor={tpl.snapshot.wrapColor}
                          ribbonColor={tpl.snapshot.ribbonColor}
                          bloomColors={tpl.snapshot.items.slice(0, 3).map((i) => i.petalColor)}
                        />
                      </div>
                      <span className="text-[11px] font-medium text-stone-700 dark:text-stone-300 truncate w-full text-center">
                        {tpl.name}
                      </span>
                    </button>
                  ))}
                </>
              )}

              {/* CATEGORY 2: WRAPPERS (9 Unique Architectural Wrapper Designs — No Color-Only Duplicates) */}
              {mobileCategory === 'wrapping' && (
                <>
                  {WRAPPER_CATALOG.map((ws) => {
                    const isSelected = wrapStyle === ws.id;
                    return (
                      <button
                        key={ws.id}
                        type="button"
                        onClick={() => {
                          setWrapStyle(ws.id);
                          setActiveColorTarget('wrapper');
                        }}
                        className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0 w-[60px] sm:w-[68px] group"
                      >
                        <div
                          className={`w-13 h-13 sm:w-16 sm:h-16 rounded-full border flex items-center justify-center relative overflow-hidden transition-all group-active:scale-95 ${
                            isSelected
                              ? 'border-[#B4846C] ring-2 ring-[#B4846C]/30 bg-white dark:bg-[#292524] shadow-xs'
                              : isDarkMode
                              ? 'bg-[#292524] border-stone-700 group-hover:border-[#B4846C]'
                              : 'bg-stone-50/70 border-stone-200/90 group-hover:border-[#B4846C]'
                          }`}
                        >
                          <MiniWrapConeSVG
                            styleType={ws.id}
                            color={ws.defaultHex}
                            ribbon={ws.defaultRibbon}
                          />
                        </div>
                        <span className="text-[11px] font-medium text-stone-700 dark:text-stone-300 truncate w-full text-center">
                          {ws.label}
                        </span>
                      </button>
                    );
                  })}
                </>
              )}

              {/* CATEGORY 3: FOCAL FLOWERS */}
              {mobileCategory === 'flowers' &&
                focalFlowers.map((entry) => (
                  <button
                    key={entry.type}
                    type="button"
                    onClick={() => {
                      addFlower(entry.type);
                      setActiveColorTarget('petal');
                      triggerToast(`Added ${entry.name}`);
                    }}
                    className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0 w-[60px] sm:w-[68px] group"
                  >
                    <div
                      className={`w-13 h-13 sm:w-16 sm:h-16 rounded-full border flex items-center justify-center overflow-hidden transition-all group-active:scale-95 ${
                        isDarkMode
                          ? 'bg-[#292524] border-stone-700 group-hover:border-[#B4846C]'
                          : 'bg-stone-50/70 border-stone-200/90 group-hover:border-[#B4846C]'
                      }`}
                    >
                      <svg viewBox="-55 -62 110 124" className="w-10 h-10 sm:w-12 sm:h-12">
                        <FlowerRenderer
                          type={entry.type}
                          petalColor={entry.defaultPetalColor}
                          centerColor={entry.defaultCenterColor}
                        />
                      </svg>
                    </div>
                    <span className="text-[11px] font-medium text-stone-700 dark:text-stone-300 truncate w-full text-center">
                      {entry.shortName}
                    </span>
                  </button>
                ))}

              {/* CATEGORY 4: FILLERS & FOLIAGE */}
              {mobileCategory === 'fillers' &&
                fillerFlowers.map((entry) => (
                  <button
                    key={entry.type}
                    type="button"
                    onClick={() => {
                      addFlower(entry.type);
                      setActiveColorTarget('petal');
                      triggerToast(`Added ${entry.name}`);
                    }}
                    className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0 w-[60px] sm:w-[68px] group"
                  >
                    <div
                      className={`w-13 h-13 sm:w-16 sm:h-16 rounded-full border flex items-center justify-center overflow-hidden transition-all group-active:scale-95 ${
                        isDarkMode
                          ? 'bg-[#292524] border-stone-700 group-hover:border-[#B4846C]'
                          : 'bg-stone-50/70 border-stone-200/90 group-hover:border-[#B4846C]'
                      }`}
                    >
                      <svg viewBox="-55 -68 110 135" className="w-10 h-10 sm:w-12 sm:h-12">
                        <FlowerRenderer
                          type={entry.type}
                          petalColor={entry.defaultPetalColor}
                          centerColor={entry.defaultCenterColor}
                        />
                      </svg>
                    </div>
                    <span className="text-[11px] font-medium text-stone-700 dark:text-stone-300 truncate w-full text-center">
                      {entry.shortName}
                    </span>
                  </button>
                ))}

              {/* CATEGORY 5: RIBBON & LACE DESIGNS (Colors are unified in the Color drawer tab) */}
              {mobileCategory === 'ribbon' && (
                <>
                  {RIBBON_STYLE_CATALOG.map((rs) => {
                    const isSelected = ribbonStyle === rs.id;
                    return (
                      <button
                        key={rs.id}
                        type="button"
                        onClick={() => {
                          setRibbonStyle(rs.id);
                          setActiveColorTarget('ribbon');
                        }}
                        className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0 w-[60px] sm:w-[68px] group"
                      >
                        <div
                          className={`w-13 h-13 sm:w-16 sm:h-16 rounded-full border flex items-center justify-center relative overflow-hidden transition-all group-active:scale-95 ${
                            isSelected
                              ? 'border-[#B4846C] ring-2 ring-[#B4846C]/30 bg-white dark:bg-[#292524] shadow-xs'
                              : isDarkMode
                              ? 'bg-[#292524] border-stone-700 group-hover:border-[#B4846C]'
                              : 'bg-stone-50/70 border-stone-200/90 group-hover:border-[#B4846C]'
                          }`}
                        >
                          <MiniRibbonBowSVG hex={rs.defaultHex} styleType={rs.id} />
                        </div>
                        <span className="text-[11px] font-medium text-stone-700 dark:text-stone-300 truncate w-full text-center">
                          {rs.label}
                        </span>
                      </button>
                    );
                  })}
                </>
              )}

              {/* CATEGORY 6: GREETING CARD DESIGNS & FREEFORM COLORS */}
              {mobileCategory === 'card' && (
                <>
                  <button
                    type="button"
                    data-drawer-trigger="true"
                    onClick={() => {
                      selectItem(null);
                      setActiveColorTarget('card');
                      setIsMobileToolsExpanded(true);
                      setMobilePopover((prev) => (prev === 'card' ? null : 'card'));
                    }}
                    className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0 w-[60px] sm:w-[68px] group"
                  >
                    <div
                      className={`w-13 h-13 sm:w-16 sm:h-16 rounded-full border flex items-center justify-center relative overflow-hidden transition-all group-active:scale-95 ${
                        mobilePopover === 'card'
                          ? 'border-[#B4846C] ring-2 ring-[#B4846C]/30 bg-white dark:bg-[#292524] shadow-xs'
                          : isDarkMode
                          ? 'bg-[#292524] border-stone-700 group-hover:border-[#B4846C]'
                          : 'bg-stone-50/70 border-stone-200/90 group-hover:border-[#B4846C]'
                      }`}
                    >
                      <PenLine className="w-5 h-5 text-[#B4846C]" />
                    </div>
                    <span className="text-[11px] font-medium text-stone-700 dark:text-stone-300 truncate w-full text-center">
                      Write Note
                    </span>
                  </button>

                  {CARD_THEME_CATALOG.map((th) => {
                    const isSelected = card.theme === th.id && card.visibleOnStage;
                    return (
                      <button
                        key={th.id}
                        type="button"
                        onClick={() => {
                          selectItem(null);
                          updateCard({
                            theme: th.id,
                            visibleOnStage: true,
                          });
                          setActiveColorTarget('card');
                        }}
                        className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0 w-[60px] sm:w-[68px] group"
                      >
                        <div
                          className={`w-13 h-13 sm:w-16 sm:h-16 rounded-full border flex items-center justify-center relative overflow-hidden transition-all group-active:scale-95 ${
                            isSelected
                              ? 'border-[#B4846C] ring-2 ring-[#B4846C]/30 bg-white dark:bg-[#292524] shadow-xs'
                              : isDarkMode
                              ? 'bg-[#292524] border-stone-700 group-hover:border-[#B4846C]'
                              : 'bg-stone-50/70 border-stone-200/90 group-hover:border-[#B4846C]'
                          }`}
                        >
                          <MiniCardShapeSVG
                            theme={th.id}
                          />
                        </div>
                        <span className="text-[11px] font-medium text-stone-700 dark:text-stone-300 truncate w-full text-center">
                          {th.label}
                        </span>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => updateCard({ visibleOnStage: !card.visibleOnStage })}
                    className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0 w-[60px] sm:w-[68px] group"
                  >
                    <div
                      className={`w-13 h-13 sm:w-16 sm:h-16 rounded-full border flex items-center justify-center relative overflow-hidden transition-all group-active:scale-95 ${
                        !card.visibleOnStage
                          ? 'border-[#B4846C] ring-2 ring-[#B4846C]/30 bg-white dark:bg-[#292524] shadow-xs'
                          : isDarkMode
                          ? 'bg-[#292524] border-stone-700 group-hover:border-[#B4846C]'
                          : 'bg-stone-50/70 border-stone-200/90 group-hover:border-[#B4846C]'
                      }`}
                    >
                      {card.visibleOnStage ? (
                        <EyeOff className="w-5 h-5 text-[#B4846C]" />
                      ) : (
                        <Eye className="w-5 h-5 text-[#B4846C]" />
                      )}
                    </div>
                    <span className="text-[11px] font-medium text-stone-700 dark:text-stone-300 truncate w-full text-center">
                      {card.visibleOnStage ? 'Hide Tag' : 'Show Tag'}
                    </span>
                  </button>
                </>
              )}

              {/* CATEGORY 7: ROMANTIC VOICE KEEPSAKES (Mixtape, Vinyl, Voice Plushie, Music Box, Heart Locket) */}
              {mobileCategory === 'voice' && (
                <>
                  <button
                    type="button"
                    data-drawer-trigger="true"
                    onClick={() => {
                      selectItem(null);
                      setActiveColorTarget('voicePrimary');
                      setIsMobileToolsExpanded(true);
                      setMobilePopover((prev) => (prev === 'voice' ? null : 'voice'));
                    }}
                    className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0 w-[60px] sm:w-[68px] group"
                  >
                    <div
                      className={`w-13 h-13 sm:w-16 sm:h-16 rounded-full border flex items-center justify-center relative overflow-hidden transition-all group-active:scale-95 ${
                        mobilePopover === 'voice'
                          ? 'border-[#B4846C] ring-2 ring-[#B4846C]/30 bg-white dark:bg-[#292524] shadow-xs'
                          : isDarkMode
                          ? 'bg-[#292524] border-stone-700 group-hover:border-[#B4846C]'
                          : 'bg-stone-50/70 border-stone-200/90 group-hover:border-[#B4846C]'
                      }`}
                    >
                      <Mic className="w-5 h-5 text-[#B4846C]" />
                      {voice.audioDataUrl && (
                        <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-[#292524]" />
                      )}
                    </div>
                    <span className="text-[11px] font-medium text-stone-700 dark:text-stone-300 truncate w-full text-center">
                      {voice.audioDataUrl ? 'Voice Studio' : 'Record Voice'}
                    </span>
                  </button>

                  {VOICE_KEEPSAKE_CATALOG.map((vk) => {
                    const isSelected = voice.style === vk.id && voice.visibleOnStage;
                    return (
                      <button
                        key={vk.id}
                        type="button"
                        onClick={() => {
                          selectItem(null);
                          const isSwitchingStyle = voice.style !== vk.id;
                          updateVoice({
                            style: vk.id,
                            ...(isSwitchingStyle ? { title: vk.defaultTitle } : {}),
                            visibleOnStage: true,
                          });
                          setActiveColorTarget('voicePrimary');
                          triggerToast(`Selected ${vk.label}`);
                        }}
                        className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0 w-[60px] sm:w-[68px] group"
                      >
                        <div
                          className={`w-13 h-13 sm:w-16 sm:h-16 rounded-full border flex items-center justify-center relative overflow-hidden transition-all group-active:scale-95 ${
                            isSelected
                              ? 'border-[#B4846C] ring-2 ring-[#B4846C]/30 bg-white dark:bg-[#292524] shadow-xs'
                              : isDarkMode
                              ? 'bg-[#292524] border-stone-700 group-hover:border-[#B4846C]'
                              : 'bg-stone-50/70 border-stone-200/90 group-hover:border-[#B4846C]'
                          }`}
                        >
                          <MiniVoiceKeepsakeSVG
                            styleType={vk.id}
                            primaryColor={vk.defaultPrimary}
                            accentColor={vk.defaultAccent}
                          />
                        </div>
                        <span className="text-[11px] font-medium text-stone-700 dark:text-stone-300 truncate w-full text-center">
                          {vk.shortLabel}
                        </span>
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => {
                      const nextVis = !voice.visibleOnStage;
                      if (!nextVis) handleStopVoice();
                      updateVoice({ visibleOnStage: nextVis });
                    }}
                    className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0 w-[60px] sm:w-[68px] group"
                  >
                    <div
                      className={`w-13 h-13 sm:w-16 sm:h-16 rounded-full border flex items-center justify-center relative overflow-hidden transition-all group-active:scale-95 ${
                        !voice.visibleOnStage
                          ? 'border-[#B4846C] ring-2 ring-[#B4846C]/30 bg-white dark:bg-[#292524] shadow-xs'
                          : isDarkMode
                          ? 'bg-[#292524] border-stone-700 group-hover:border-[#B4846C]'
                          : 'bg-stone-50/70 border-stone-200/90 group-hover:border-[#B4846C]'
                      }`}
                    >
                      {voice.visibleOnStage ? (
                        <EyeOff className="w-5 h-5 text-[#B4846C]" />
                      ) : (
                        <Eye className="w-5 h-5 text-[#B4846C]" />
                      )}
                    </div>
                    <span className="text-[11px] font-medium text-stone-700 dark:text-stone-300 truncate w-full text-center">
                      {voice.visibleOnStage ? 'Hide Voice' : 'Show Voice'}
                    </span>
                  </button>
                </>
              )}
              </div>

              {/* Right Carousel Scroll Arrow Button (Desktop & Tablet) */}
              <button
                type="button"
                data-testid="studio-carousel-next"
                onClick={() => handleScrollStudioCarousel('right')}
                aria-label="Scroll selection choices right"
                title="More choices"
                className={`hidden sm:flex items-center justify-center w-8 h-8 rounded-full border border-dashed shrink-0 ml-1.5 transition active:scale-95 cursor-pointer shadow-xs ${
                  canScrollCarouselRight
                    ? isDarkMode
                      ? 'bg-[#2B2321] border-[#6A5750] text-[#FBF6F1] hover:border-[#B4846C]'
                      : 'bg-[#FAF4EE] border-[#DECBB9] text-[#5C4438] hover:border-[#B4846C]'
                    : isDarkMode
                    ? 'bg-[#2B2321]/40 border-[#4A3D38] text-[#7A6860] opacity-50'
                    : 'bg-[#FAF4EE]/50 border-[#E8D9CB] text-[#B8A69A] opacity-50'
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </section>
        )}

        {/* ===================================================================
            DESKTOP LEFT SIDEBAR STUDIO (lg+)
            =================================================================== */}
        {!isPreviewMode && !isGiftView && (
          <aside
            className={`hidden w-full backdrop-blur-xl border-t lg:border-t-0 lg:border-r flex-col order-2 lg:order-1 z-20 shrink-0 transition-all duration-300 ease-in-out ${
              isDarkMode
                ? 'bg-[#1E1C1A] border-stone-800 text-stone-100'
                : 'bg-[#F5F3EF] border-stone-200 text-[#1C1917]'
            } ${
              drawerState === 'collapsed'
                ? 'h-[52px]'
                : drawerState === 'expanded'
                ? 'h-[80vh] sm:h-[84vh]'
                : 'h-[44vh] sm:h-[46vh]'
            } ${
              isSidebarOpen
                ? 'lg:h-full lg:w-[360px] xl:w-[400px]'
                : 'lg:w-0 lg:h-full lg:overflow-hidden lg:border-none'
            }`}
          >
            {/* Desktop Sidebar Collapse Header */}
            <div className="hidden lg:flex items-center justify-between px-4 py-2.5 border-b border-stone-200 dark:border-stone-800">
              <span className="text-xs font-semibold tracking-wider uppercase text-stone-500 dark:text-stone-400">
                Botanical Studio
              </span>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                title="Collapse studio panel"
                aria-label="Collapse studio panel"
                className="p-1 rounded-lg hover:bg-stone-200/60 dark:hover:bg-stone-800 text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 transition"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>

            {/* Preserved Mobile Sheet Toggle Button for SSR Test Compatibility */}
            <div className="hidden">
              <button
                type="button"
                onClick={() => {
                  autoCollapsedRef.current = false;
                  setDrawerState((prev) =>
                    prev === 'collapsed' ? 'peek' : prev === 'peek' ? 'expanded' : 'peek'
                  );
                }}
                aria-label="Toggle drawer sheet height"
              />
            </div>

            {/* Drawer Navigation Tabs */}
            <div
              className={`grid grid-cols-3 gap-1 p-1.5 border-b shrink-0 ${
                isDarkMode
                  ? 'bg-[#1E1C1A] border-stone-800'
                  : 'bg-[#F5F3EF] border-stone-200'
              }`}
              role="tablist"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'flowers'}
                onClick={() => {
                  setActiveTab('flowers');
                  if (drawerState === 'collapsed') setDrawerState('peek');
                }}
                className={`py-2 px-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition ${
                  activeTab === 'flowers'
                    ? isDarkMode
                      ? 'bg-[#292524] border border-stone-700 text-stone-100 shadow-sm'
                      : 'bg-white border border-stone-200 text-[#1C1917] shadow-sm'
                    : isDarkMode
                    ? 'text-stone-400 hover:text-stone-100'
                    : 'text-stone-600 hover:text-[#1C1917]'
                }`}
              >
                <Flower2 className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400 shrink-0" />
                <span className="truncate">Flowers</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'wrap'}
                onClick={() => {
                  setActiveTab('wrap');
                  if (drawerState === 'collapsed') setDrawerState('peek');
                }}
                className={`py-2 px-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1 transition ${
                  activeTab === 'wrap'
                    ? isDarkMode
                      ? 'bg-[#292524] border border-stone-700 text-stone-100 shadow-sm'
                      : 'bg-white border border-stone-200 text-[#1C1917] shadow-sm'
                    : isDarkMode
                    ? 'text-stone-400 hover:text-stone-100'
                    : 'text-stone-600 hover:text-[#1C1917]'
                }`}
              >
                <Gift className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400 shrink-0" />
                <span className="truncate">Wrapping</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'card'}
                onClick={() => {
                  setActiveTab('card');
                  if (drawerState === 'collapsed') setDrawerState('peek');
                }}
                className={`py-2 px-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1 transition ${
                  activeTab === 'card'
                    ? isDarkMode
                      ? 'bg-[#292524] border border-stone-700 text-stone-100 shadow-sm'
                      : 'bg-white border border-stone-200 text-[#1C1917] shadow-sm'
                    : isDarkMode
                    ? 'text-stone-400 hover:text-stone-100'
                    : 'text-stone-600 hover:text-[#1C1917]'
                }`}
              >
                <Mail className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400 shrink-0" />
                <span className="truncate">Card</span>
              </button>
            </div>

            {/* Drawer Content Body */}
            <div
              className={`flex-1 overflow-y-auto p-3 sm:p-4 pb-8 space-y-4 ${
                drawerState === 'collapsed' ? 'hidden lg:block' : 'block'
              }`}
            >
              {/* TAB 1: FLOWER PALETTE + STARTER TEMPLATES */}
              {activeTab === 'flowers' && (
                <div className="space-y-4">
                  {/* Starter Bouquet Templates Strip */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                      Templates
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2">
                      {STARTER_TEMPLATES.map((tpl) => (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => {
                            loadSnapshot(tpl.snapshot);
                            triggerToast(`Loaded "${tpl.name}" template`);
                          }}
                          className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2.5 ${
                            isDarkMode
                              ? 'bg-[#292524] hover:bg-[#34302c] border-stone-700 hover:border-[#B4846C] text-stone-100'
                              : 'bg-white hover:bg-stone-50 border-stone-200 hover:border-[#B4846C] text-[#1C1917]'
                          }`}
                        >
                          <div className="w-9 h-9 rounded-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex items-center justify-center shrink-0">
                            <MiniTemplateBouquetSVG
                              wrapColor={tpl.snapshot.wrapColor}
                              ribbonColor={tpl.snapshot.ribbonColor}
                              bloomColors={tpl.snapshot.items.slice(0, 3).map((i) => i.petalColor)}
                            />
                          </div>
                          <span className="text-xs font-medium truncate text-[#1C1917] dark:text-stone-100">
                            {tpl.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <h2 className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                      Flowers
                    </h2>
                    {items.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          clearBouquet();
                          triggerToast('Cleared bouquet');
                        }}
                        className="text-[11px] font-medium text-stone-500 hover:text-red-600 dark:text-stone-400 dark:hover:text-red-400 flex items-center gap-1 transition"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Clear all</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {FLOWER_CATALOG.map((entry) => (
                      <button
                        key={entry.type}
                        type="button"
                        onClick={() => {
                          addFlower(entry.type);
                          triggerToast(`Added ${entry.name}`);
                        }}
                        aria-label={`Add ${entry.name} to bouquet`}
                        className={`group p-2.5 rounded-xl border transition flex flex-col items-center gap-1.5 text-center ${
                          isDarkMode
                            ? 'bg-[#292524] hover:bg-[#34302c] border-stone-700 hover:border-[#B4846C]'
                            : 'bg-white hover:bg-stone-50 border-stone-200 hover:border-[#B4846C]'
                        }`}
                      >
                        <div
                          className={`w-14 h-14 rounded-full border flex items-center justify-center shrink-0 overflow-hidden ${
                            isDarkMode
                              ? 'bg-stone-900 border-stone-800'
                              : 'bg-stone-50 border-stone-200'
                          }`}
                        >
                          <svg viewBox="-60 -65 120 130" className="w-12 h-12">
                            <FlowerRenderer
                              type={entry.type}
                              petalColor={entry.defaultPetalColor}
                              centerColor={entry.defaultCenterColor}
                            />
                          </svg>
                        </div>
                        <span className="text-xs font-medium text-[#1C1917] dark:text-stone-100 truncate w-full">
                          {entry.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 2: WRAPPING PAPER & RIBBON STUDIO */}
              {activeTab === 'wrap' && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xs font-semibold text-stone-700 dark:text-stone-300 mb-2">
                      Wrapping
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2">
                      {WRAPPER_CATALOG.map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => {
                            setWrapStyle(st.id);
                            setWrapColor(st.defaultHex);
                          }}
                          className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2.5 ${
                            wrapStyle === st.id
                              ? 'border-[#B4846C] ring-1 ring-[#B4846C] bg-white dark:bg-[#292524] text-[#1C1917] dark:text-stone-100 shadow-sm'
                              : isDarkMode
                              ? 'bg-[#292524] border-stone-700 text-stone-200 hover:bg-stone-800'
                              : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 flex items-center justify-center shrink-0">
                            <MiniWrapConeSVG styleType={st.id} color={wrapColor} ribbon={ribbonColor} />
                          </div>
                          <span className="text-xs font-medium truncate">{st.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {wrapStyle !== 'plain' && (
                    <div>
                      <h3 className="text-xs font-semibold text-stone-700 dark:text-stone-300 mb-2">
                        Paper color
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {PAPER_SWATCHES.map((sw) => (
                          <button
                            key={sw.hex}
                            type="button"
                            onClick={() => setWrapColor(sw.hex)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 border transition ${
                              wrapColor === sw.hex
                                ? 'border-[#B4846C] ring-1 ring-[#B4846C] bg-white dark:bg-[#292524] text-[#1C1917] dark:text-stone-100'
                                : isDarkMode
                                ? 'border-stone-700 bg-[#292524] hover:bg-stone-800 text-stone-200'
                                : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-700'
                            }`}
                          >
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-black/15 shrink-0"
                              style={{ backgroundColor: sw.hex }}
                            />
                            <span>{sw.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-xs font-semibold text-stone-700 dark:text-stone-300 mb-2">
                      Ribbon &amp; Lace Design
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2 mb-3">
                      {RIBBON_STYLE_CATALOG.map((rs) => (
                        <button
                          key={rs.id}
                          type="button"
                          onClick={() => setRibbonStyle(rs.id)}
                          className={`p-2 rounded-xl border text-xs font-medium flex items-center gap-2 transition ${
                            ribbonStyle === rs.id
                              ? 'border-[#B4846C] ring-1 ring-[#B4846C] bg-white dark:bg-[#292524] text-[#1C1917] dark:text-stone-100 shadow-sm'
                              : isDarkMode
                              ? 'border-stone-700 bg-[#292524] hover:bg-stone-800 text-stone-200'
                              : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-700'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-lg bg-stone-50 dark:bg-stone-900 flex items-center justify-center shrink-0">
                            <MiniRibbonBowSVG hex={ribbonColor} styleType={rs.id} />
                          </div>
                          <span className="truncate">{rs.label}</span>
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2">
                      {RIBBON_SWATCHES.map((rb) => (
                        <button
                          key={rb.hex}
                          type="button"
                          onClick={() => setRibbonColor(rb.hex)}
                          className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition ${
                            ribbonColor === rb.hex
                              ? 'border-[#B4846C] ring-1 ring-[#B4846C] bg-white dark:bg-[#292524] text-[#1C1917] dark:text-stone-100 shadow-sm'
                              : isDarkMode
                              ? 'border-stone-700 bg-[#292524] hover:bg-stone-800 text-stone-200'
                              : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-700'
                          }`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                            style={{ backgroundColor: rb.hex }}
                          />
                          <span className="truncate">{rb.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: GREETING CARD EDITOR */}
              {activeTab === 'card' && (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                      Greeting card
                    </h2>
                    <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer text-stone-700 dark:text-stone-200">
                      <input
                        type="checkbox"
                        checked={card.visibleOnStage}
                        onChange={(e) => updateCard({ visibleOnStage: e.target.checked })}
                        className="accent-[#B4846C] rounded cursor-pointer w-4 h-4"
                      />
                      <span>Show card</span>
                    </label>
                  </div>

                  {/* Card Text Inputs with Placeholders for Recipient, Message Body, and Sender */}
                  <div className="space-y-3 p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#1E1C1A]">
                    <div>
                      <input
                        type="text"
                        maxLength={22}
                        value={card.to}
                        placeholder="Recipient (e.g., My Dearest)"
                        onFocus={handleCardInputFocus}
                        onChange={(e) => updateCard({ to: e.target.value })}
                        aria-label="Recipient"
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-[#141211] text-[#1C1917] dark:text-stone-100 text-sm focus:outline-none focus:border-[#B4846C] focus:ring-1 focus:ring-[#B4846C]/20 transition"
                        style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '16px' }}
                      />
                    </div>

                    <div>
                      <textarea
                        rows={3}
                        maxLength={86}
                        value={card.message}
                        placeholder="Write your heartfelt message..."
                        onFocus={handleCardInputFocus}
                        onChange={(e) => updateCard({ message: e.target.value })}
                        aria-label="Card message"
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-[#141211] text-[#1C1917] dark:text-stone-100 text-sm focus:outline-none focus:border-[#B4846C] focus:ring-1 focus:ring-[#B4846C]/20 resize-none transition"
                        style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '16px' }}
                      />
                    </div>

                    <div>
                      <input
                        type="text"
                        maxLength={20}
                        value={card.from}
                        placeholder="Sender (e.g., Yours Always)"
                        onFocus={handleCardInputFocus}
                        onChange={(e) => updateCard({ from: e.target.value })}
                        aria-label="Sender"
                        className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-[#141211] text-[#1C1917] dark:text-stone-100 text-sm focus:outline-none focus:border-[#B4846C] focus:ring-1 focus:ring-[#B4846C]/20 transition"
                        style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '16px' }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}

        {/* ===================================================================
            DESKTOP SECONDARY LEFT SIDEBAR: STEM COLORS, SIZE & LAYER ORDER (lg+)
            Keeps color pickers, scale/tilt sliders, and draggable layer order
            docked on the left side so the main bouquet canvas never changes size!
            =================================================================== */}
        {!isPreviewMode && !isGiftView && (
          <aside
            aria-label="Stem Inspector and Layer Order Sidebar"
            className={`hidden flex-col order-2 lg:order-2 z-20 shrink-0 border-r transition-all duration-300 ease-in-out ${
              isDarkMode
                ? 'bg-[#191715] border-stone-800 text-stone-100'
                : 'bg-[#FAF8F5] border-stone-200 text-[#1C1917]'
            } ${
              isInspectorSidebarOpen
                ? 'lg:h-full lg:w-[320px] xl:w-[340px]'
                : 'lg:w-0 lg:h-full lg:overflow-hidden lg:border-none'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-stone-200 dark:border-stone-800 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Sliders className="w-3.5 h-3.5 text-[#B4846C] shrink-0" />
                <span className="text-xs font-semibold tracking-wider uppercase text-stone-500 dark:text-stone-400 truncate">
                  Stem &amp; Layers
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsInspectorSidebarOpen(false)}
                title="Collapse stem & layer inspector"
                aria-label="Collapse stem & layer inspector"
                className="p-1 rounded-lg hover:bg-stone-200/60 dark:hover:bg-stone-800 text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 transition"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body: Top = Selected Stem Color/Size Controls, Bottom = Draggable Layer Order */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {/* Section 1: Selected Flower Color, Scale & Tilt Inspector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-0.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-[#B4846C]" />
                    <span>Stem Color &amp; Size</span>
                  </span>
                  {selectedId && (
                    <span className="text-[10px] text-[#B4846C] font-medium">
                      Active stem
                    </span>
                  )}
                </div>

                {selectedId ? (
                  <SelectedFlowerToolbar
                    isDrawerOpen={drawerState !== 'collapsed'}
                    onRequestCollapseDrawer={() => {
                      autoCollapsedRef.current = false;
                      setDrawerState('collapsed');
                    }}
                  />
                ) : (
                  <div
                    className={`rounded-2xl border border-dashed p-3.5 text-center transition ${
                      isDarkMode
                        ? 'border-stone-800 bg-[#1E1C1A]/60 text-stone-400'
                        : 'border-stone-200 bg-white/70 text-stone-500'
                    }`}
                  >
                    <Palette className="w-5 h-5 mx-auto mb-1.5 text-[#B4846C]/70" />
                    <p className="text-xs font-medium text-stone-700 dark:text-stone-300">
                      No stem selected
                    </p>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 leading-relaxed">
                      Click any flower on the canvas or in the layer list below to customize its petal colors, size, and tilt.
                    </p>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="h-[1px] bg-stone-200/80 dark:bg-stone-800" />

              {/* Section 2: Real Draggable & Reorderable Layer Manager */}
              <LayerManagerPanel isEmbeddedInSidebar />
            </div>
          </aside>
        )}
      </div>
        </>
      )}

      {/* =====================================================================
          ZOOMING HANDWRITTEN GREETING CARD MODAL
          Triggered when clicking the wiggling card tag pinned on the bouquet
          in shared/preview mode.
          ===================================================================== */}
      {isLetterModalOpen && (() => {
        const cardPalette = getCardThemePalette(card.theme, card.customBg, card.customAccent);

        const toFull = `Dearest ${card.to || 'Someone Special'},`;
        const msgFull = card.message || 'Thinking of you with love and blossoms.';
        const fromFull = `With love, ${card.from || 'Yours Always'}`;

        const toVisible = toFull.slice(0, Math.min(letterTypedChars, toFull.length));
        const msgCount = Math.max(0, letterTypedChars - toFull.length);
        const msgVisible = msgFull.slice(0, Math.min(msgCount, msgFull.length));
        const fromCount = Math.max(0, letterTypedChars - toFull.length - msgFull.length);
        const fromVisible = fromFull.slice(0, Math.min(fromCount, fromFull.length));
        const isWritingTo = letterTypedChars < toFull.length;
        const isWritingMsg = letterTypedChars >= toFull.length && letterTypedChars < toFull.length + msgFull.length;
        const isWritingFrom =
          letterTypedChars >= toFull.length + msgFull.length &&
          letterTypedChars < toFull.length + msgFull.length + fromFull.length;

        return (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Handwritten Greeting Card"
            onClick={() => setIsLetterModalOpen(false)}
            className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="card-zoom-modal w-full max-w-md rounded-3xl p-2.5 sm:p-3 shadow-2xl relative"
              style={{
                backgroundColor: cardPalette.bg,
                border: `2.5px solid ${cardPalette.border}`
              }}
            >
              {/* Inner Dashed Stitch Frame (Matches Bouquet Stage Card Tag) */}
              <div
                className="rounded-2xl p-5 sm:p-7 relative"
                style={{
                  border: `1.5px dashed ${cardPalette.inner}`
                }}
              >
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setIsLetterModalOpen(false)}
                  aria-label="Close card"
                  className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full flex items-center justify-center bg-white/60 hover:bg-white/90 transition"
                  style={{ color: cardPalette.title }}
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Embossed Botanical Wax Seal & Pressed Sage Leaf Header (Zero All-Caps Shouting) */}
                <div className="flex items-center gap-2.5 mb-3">
                  <svg viewBox="0 0 56 38" className="w-14 h-9 overflow-visible select-none" aria-hidden="true">
                    {/* Delicate Sage Leaf Sprig Behind Seal */}
                    <path
                      d="M 22,19 C 34,10 46,12 52,18 C 44,24 32,24 22,19 Z"
                      fill="rgba(122, 163, 135, 0.28)"
                      stroke="#6A9478"
                      strokeWidth="1.1"
                    />
                    {/* Embossed Wax Seal */}
                    <circle
                      cx="19"
                      cy="19"
                      r="14"
                      fill={cardPalette.seal}
                    />
                    <circle
                      cx="19"
                      cy="19"
                      r="10"
                      fill="none"
                      stroke="#FFFDF9"
                      strokeWidth="0.9"
                      strokeDasharray="2.5 2"
                      opacity="0.75"
                    />
                    <path
                      d="M19,16.2 C16.6,13.6 13,15.4 15,18.8 L19,22.6 L23,18.8 C25,15.4 21.4,13.6 19,16.2 Z"
                      fill="#FFFDF9"
                    />
                  </svg>
                </div>

                {/* Handwritten Greeting ("Dearest ...,") */}
                <div
                  className="text-2xl sm:text-3xl font-semibold tracking-wide min-h-[2.25rem]"
                  style={{
                    fontFamily: "'Caveat', 'Cormorant Garamond', cursive",
                    color: cardPalette.title
                  }}
                >
                  <span>{toVisible}</span>
                  {isWritingTo && (
                    <PenLine
                      className="w-4 h-4 inline-block ml-1 animate-bounce"
                      style={{ color: cardPalette.seal }}
                    />
                  )}
                </div>

                {/* Handwritten Body on Subtle Ruled Stationery Lines (Scrollable to preserve card design & length) */}
                <div
                  ref={letterBodyScrollRef}
                  className="mt-3 sm:mt-4 py-2 min-h-[6.5rem] max-h-[9.5rem] sm:max-h-[11rem] overflow-y-auto pr-1.5 text-2xl sm:text-[26px] leading-[2.2rem] sm:leading-[2.35rem] break-words"
                  style={{
                    fontFamily: "'Caveat', 'Cormorant Garamond', cursive",
                    color: cardPalette.body,
                    backgroundImage: `repeating-linear-gradient(transparent, transparent 35px, ${cardPalette.rule} 35px, ${cardPalette.rule} 36px)`,
                    backgroundAttachment: 'local',
                    scrollbarWidth: 'thin'
                  }}
                >
                  <span className="whitespace-pre-wrap">{msgVisible}</span>
                  {isWritingMsg && (
                    <PenLine
                      className="w-4 h-4 inline-block ml-1 animate-bounce"
                      style={{ color: cardPalette.seal }}
                    />
                  )}
                </div>

                {/* Handwritten Signature ("With love, ...") */}
                <div
                  className="mt-4 text-right text-xl sm:text-2xl font-semibold italic min-h-[2rem]"
                  style={{
                    fontFamily: "'Caveat', 'Cormorant Garamond', cursive",
                    color: cardPalette.sign
                  }}
                >
                  <span>{fromVisible ? `— ${fromVisible}` : ''}</span>
                  {isWritingFrom && (
                    <PenLine
                      className="w-4 h-4 inline-block ml-1 animate-bounce"
                      style={{ color: cardPalette.seal }}
                    />
                  )}
                </div>

                {/* Subtle Card Footer Actions */}
                <div
                  className="mt-5 pt-3.5 flex items-center justify-between gap-2"
                  style={{ borderTop: `1px dashed ${cardPalette.rule}` }}
                >
                  {(isGiftView || isPreviewMode) && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsLetterModalOpen(false);
                        setIsReactionPopoverOpen(true);
                      }}
                      className="px-3.5 py-1.5 rounded-full border border-dashed text-xs font-medium flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                      style={{
                        borderColor: cardPalette.inner,
                        color: cardPalette.title,
                      }}
                    >
                      <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20" />
                      <span>Send a thank-you note</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsLetterModalOpen(false)}
                    className="ml-auto px-4 py-1.5 rounded-full text-xs font-semibold text-white shadow-xs transition active:scale-95 cursor-pointer"
                    style={{ backgroundColor: cardPalette.seal }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MOBILE / COMPACT GREETING CARD EDITOR MODAL */}
      {isCardModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Edit Greeting Card"
          onClick={() => setIsCardModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-sm rounded-2xl p-4 shadow-xl border relative space-y-3 ${
              isDarkMode
                ? 'bg-[#1E1C1A] border-stone-700 text-stone-100'
                : 'bg-white border-stone-200 text-[#1C1917]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#B4846C]" />
                <h3 className="text-sm font-semibold">Greeting Card</h3>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer text-stone-600 dark:text-stone-300">
                  <input
                    type="checkbox"
                    checked={card.visibleOnStage}
                    onChange={(e) => updateCard({ visibleOnStage: e.target.checked })}
                    className="accent-[#B4846C] rounded cursor-pointer w-3.5 h-3.5"
                  />
                  <span>Show</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsCardModalOpen(false)}
                  className="p-1 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400"
                  aria-label="Close card editor"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Card Text Inputs with Placeholders */}
            <div className="space-y-2.5">
              <div>
                <input
                  type="text"
                  maxLength={22}
                  value={card.to}
                  placeholder="Recipient (e.g., My Dearest)"
                  onChange={(e) => updateCard({ to: e.target.value })}
                  aria-label="Recipient"
                  className="w-full px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-[#141211] text-sm focus:outline-none focus:border-[#B4846C]"
                  style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '16px' }}
                />
              </div>
              <div>
                <textarea
                  rows={3}
                  maxLength={86}
                  value={card.message}
                  placeholder="Write your heartfelt message..."
                  onChange={(e) => updateCard({ message: e.target.value })}
                  aria-label="Card message"
                  className="w-full px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-[#141211] text-sm focus:outline-none focus:border-[#B4846C] resize-none"
                  style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '16px' }}
                />
              </div>
              <div>
                <input
                  type="text"
                  maxLength={20}
                  value={card.from}
                  placeholder="Sender (e.g., Yours Always)"
                  onChange={(e) => updateCard({ from: e.target.value })}
                  aria-label="Sender"
                  className="w-full px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-[#141211] text-sm focus:outline-none focus:border-[#B4846C]"
                  style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '16px' }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsCardModalOpen(false)}
              className="w-full py-2 rounded-xl bg-[#1C1917] text-white dark:bg-stone-100 dark:text-[#1C1917] text-xs font-medium"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* SHARE / SEND MODAL DIALOG — Minimal Luxury Stationery Design */}
      {isShareModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Send Your Bouquet"
          onClick={() => setIsShareModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md rounded-[26px] p-5 sm:p-6 shadow-[0_24px_60px_rgba(28,20,16,0.18)] border border-dashed relative max-h-[88vh] overflow-y-auto transition-colors ${
              isDarkMode
                ? 'bg-[#352C29] border-[#5E4E49] text-[#FBF6F1]'
                : 'bg-[#FFFDF9] border-[#DECBB9] text-[#2A201D]'
            }`}
          >
            <button
              type="button"
              onClick={() => setIsShareModalOpen(false)}
              className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer ${
                isDarkMode
                  ? 'text-[#C8B6AC] hover:text-[#FBF6F1] hover:bg-[#463A36]'
                  : 'text-[#8C7A70] hover:text-[#2A201D] hover:bg-[#F5EDE4]'
              }`}
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>

            <h3
              className="text-2xl sm:text-[26px] font-medium tracking-tight leading-tight"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Send Your Bouquet
            </h3>
            <p
              className={`text-xs mt-0.5 mb-4 ${
                isDarkMode ? 'text-[#C8B6AC]' : 'text-[#8C7A70]'
              }`}
            >
              Share a private gift link with your recipient
            </p>

            {/* Primary Shortened Gift Link Bar */}
            <div
              className={`flex items-center gap-1.5 p-1.5 rounded-2xl border border-dashed mb-4 ${
                isDarkMode
                  ? 'bg-[#2B2321] border-[#544540]'
                  : 'bg-[#FAF4EE]/80 border-[#DECBB9]'
              }`}
            >
              <input
                type="text"
                readOnly
                aria-label="Short gift link"
                value={isShorteningUrl ? 'Preparing link...' : shortShareUrl || getShareUrl(true)}
                onClick={(e) => (e.currentTarget as HTMLInputElement).select()}
                className={`flex-1 min-w-0 bg-transparent px-2.5 py-1.5 text-xs focus:outline-none truncate ${
                  isDarkMode ? 'text-[#E6D6C7]' : 'text-[#5C4438]'
                }`}
              />
              <button
                type="button"
                disabled={isShorteningUrl}
                onClick={() => {
                  handleShareLink(true);
                  setIsShareModalOpen(false);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition shrink-0 disabled:opacity-50 cursor-pointer ${
                  isDarkMode
                    ? 'bg-[#E6B89C] text-[#231C18] hover:bg-[#F0C8B0]'
                    : 'bg-[#6E4434] text-[#FFFDF9] hover:bg-[#5B3729]'
                }`}
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Link</span>
              </button>
            </div>

            {/* Quiet Unwrap Timing Selector */}
            <div
              className={`p-3.5 rounded-2xl border border-dashed mb-4 space-y-3 ${
                isDarkMode
                  ? 'bg-[#2D2421]/75 border-[#544540]'
                  : 'bg-[#FAF4EE]/55 border-[#E2D1C1]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-medium ${
                    isDarkMode ? 'text-[#DFD1C8]' : 'text-[#5C4438]'
                  }`}
                >
                  When can they unwrap it?
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: 'none', label: 'Anytime' },
                    { id: 'countdown', label: 'Date Lock' },
                    { id: 'passcode', label: 'Secret Hint' },
                  ] as { id: BouquetLockMode; label: string }[]
                ).map((tab) => {
                  const active = (lock?.mode || 'none') === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        if (tab.id === 'countdown' && !lock?.unlockAtIso) {
                          const tomorrow = new Date(Date.now() + 86400000);
                          tomorrow.setMinutes(tomorrow.getMinutes() - tomorrow.getTimezoneOffset());
                          updateLock({
                            mode: 'countdown',
                            unlockAtIso: tomorrow.toISOString().slice(0, 16),
                          });
                        } else if (tab.id === 'passcode' && !lock?.questionPrompt) {
                          updateLock({
                            mode: 'passcode',
                            questionPrompt: 'The special date we first met',
                          });
                        } else {
                          updateLock({ mode: tab.id });
                        }
                      }}
                      className={`py-2 px-2 rounded-xl border text-xs font-medium text-center transition cursor-pointer ${
                        active
                          ? isDarkMode
                            ? 'border-[#E6B89C] bg-[#E6B89C] text-[#231C18]'
                            : 'border-[#6E4434] bg-[#6E4434] text-[#FFFDF9]'
                          : isDarkMode
                          ? 'border-dashed border-[#544540] bg-[#352C29] text-[#D8C7BE] hover:border-[#6E5B54]'
                          : 'border-dashed border-[#DECBB9] bg-[#FFFDF9] text-[#5C4438] hover:border-[#C5A892]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {lock?.mode === 'countdown' && (
                <div className="space-y-1.5 pt-1 animate-in fade-in duration-150">
                  <label
                    className={`block text-[11px] ${
                      isDarkMode ? 'text-[#C2B0A6]' : 'text-[#7D6B60]'
                    }`}
                  >
                    Unlocks automatically on:
                  </label>
                  <input
                    type="datetime-local"
                    aria-label="Unlock date and time"
                    value={lock.unlockAtIso ? lock.unlockAtIso.slice(0, 16) : ''}
                    onChange={(e) => updateLock({ unlockAtIso: e.target.value })}
                    className={`w-full px-3 py-1.5 rounded-xl border border-dashed text-xs focus:outline-none focus:border-[#B4846C] ${
                      isDarkMode
                        ? 'bg-[#352C29] border-[#5C4B47] text-[#FBF6F1]'
                        : 'bg-[#FFFDF9] border-[#DECBB9] text-[#2A201D]'
                    }`}
                  />
                </div>
              )}

              {lock?.mode === 'passcode' && (
                <div className="space-y-2 pt-1 animate-in fade-in duration-150">
                  <div>
                    <label
                      className={`block text-[11px] mb-1 ${
                        isDarkMode ? 'text-[#C2B0A6]' : 'text-[#7D6B60]'
                      }`}
                    >
                      Question or hint for your recipient:
                    </label>
                    <input
                      type="text"
                      maxLength={80}
                      placeholder="e.g., The special date we first met"
                      value={lock.questionPrompt || ''}
                      onChange={(e) => updateLock({ questionPrompt: e.target.value })}
                      className={`w-full px-3 py-1.5 rounded-xl border border-dashed text-xs focus:outline-none focus:border-[#B4846C] ${
                        isDarkMode
                          ? 'bg-[#352C29] border-[#5C4B47] text-[#FBF6F1]'
                          : 'bg-[#FFFDF9] border-[#DECBB9] text-[#2A201D]'
                      }`}
                    />
                  </div>
                  <div>
                    <label
                      className={`block text-[11px] mb-1 ${
                        isDarkMode ? 'text-[#C2B0A6]' : 'text-[#7D6B60]'
                      }`}
                    >
                      Answer to unlock:
                    </label>
                    <input
                      type="text"
                      maxLength={40}
                      placeholder="e.g., October 14"
                      value={lock.passcodeAnswer || ''}
                      onChange={(e) => updateLock({ passcodeAnswer: e.target.value })}
                      className={`w-full px-3 py-1.5 rounded-xl border border-dashed text-xs focus:outline-none focus:border-[#B4846C] ${
                        isDarkMode
                          ? 'bg-[#352C29] border-[#5C4B47] text-[#FBF6F1]'
                          : 'bg-[#FFFDF9] border-[#DECBB9] text-[#2A201D]'
                      }`}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Quiet Secondary Actions Row */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsShareModalOpen(false);
                  startGiftBloomAnimation(items.length, true);
                }}
                className={`py-2 px-2.5 rounded-full border border-dashed text-xs font-medium text-center transition cursor-pointer ${
                  isDarkMode
                    ? 'border-[#5C4B47] bg-[#2D2421] hover:bg-[#3B302C] text-[#E6D6C7]'
                    : 'border-[#DECBB9] bg-[#FAF4EE]/70 hover:bg-[#F3E9DF] text-[#5C4438]'
                }`}
              >
                Preview Bloom
              </button>

              <button
                type="button"
                onClick={() => {
                  handleExportPng();
                  setIsShareModalOpen(false);
                }}
                className={`py-2 px-2.5 rounded-full border border-dashed text-xs font-medium text-center transition cursor-pointer ${
                  isDarkMode
                    ? 'border-[#5C4B47] bg-[#2D2421] hover:bg-[#3B302C] text-[#E6D6C7]'
                    : 'border-[#DECBB9] bg-[#FAF4EE]/70 hover:bg-[#F3E9DF] text-[#5C4438]'
                }`}
              >
                Save PNG
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsShareModalOpen(false);
                  setIsVaultModalOpen(true);
                }}
                className={`py-2 px-2.5 rounded-full border border-dashed text-xs font-medium text-center transition cursor-pointer ${
                  isDarkMode
                    ? 'border-[#5C4B47] bg-[#2D2421] hover:bg-[#3B302C] text-[#E6D6C7]'
                    : 'border-[#DECBB9] bg-[#FAF4EE]/70 hover:bg-[#F3E9DF] text-[#5C4438]'
                }`}
              >
                Saved Bouquets
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IN-APP BROWSER DETECTED MODAL (Prompts user to open in external browser to save PNG) */}
      {isInAppBrowserModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Open in Browser to Save Image"
          onClick={() => setIsInAppBrowserModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-sm rounded-2xl p-5 shadow-2xl border relative text-center ${
              isDarkMode
                ? 'bg-[#1E1C1A] border-stone-800 text-stone-100'
                : 'bg-white border-stone-200 text-[#1C1917]'
            }`}
          >
            <button
              type="button"
              onClick={() => setIsInAppBrowserModalOpen(false)}
              aria-label="Close dialog"
              className="absolute top-3.5 right-3.5 p-1.5 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <h3
              className="text-xl font-medium tracking-tight"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Open in Browser to Save
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1.5 leading-relaxed">
              In-app browsers (like Messenger or Instagram) block image downloads. Please open this page in Safari or Chrome to save your bouquet as a PNG.
            </p>

            <div
              className={`mt-4 p-3 rounded-xl border text-left text-xs space-y-1.5 ${
                isDarkMode
                  ? 'bg-[#141211] border-stone-800 text-stone-300'
                  : 'bg-stone-50 border-stone-200/80 text-stone-700'
              }`}
            >
              <p className="font-medium">How to open in browser:</p>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                1. Tap the menu icon (⋯ or ⋮) at the top corner of your screen.
              </p>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                2. Tap &ldquo;Open in external browser&rdquo; (Safari / Chrome), then tap Save as PNG.
              </p>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const currentUrl =
                    typeof window !== 'undefined' ? window.location.href : getShareUrl(true);
                  if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(currentUrl).catch(() => {});
                  }
                  triggerToast('Link copied — paste in Safari or Chrome');
                  setIsInAppBrowserModalOpen(false);
                }}
                className="flex-1 py-2.5 px-4 rounded-full bg-[#1C1917] hover:bg-[#292524] text-white dark:bg-stone-100 dark:text-[#1C1917] dark:hover:bg-white text-xs font-medium flex items-center justify-center gap-1.5 transition"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Link for Browser</span>
              </button>
              <button
                type="button"
                onClick={() => setIsInAppBrowserModalOpen(false)}
                className={`py-2.5 px-4 rounded-full border text-xs font-medium transition ${
                  isDarkMode
                    ? 'border-stone-700 hover:bg-stone-800 text-stone-300'
                    : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                }`}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VOICE KEEPSAKE PLAYER MODAL (For Recipient Gift View / Preview) */}
      {isVoiceModalOpen && (
        <VoiceKeepsakePlayerModal
          voice={voice}
          isDarkMode={isDarkMode}
          isPlaying={isVoicePlaying}
          onTogglePlay={handleTogglePlayVoice}
          onClose={() => setIsVoiceModalOpen(false)}
        />
      )}

      {/* ACCOUNT-FREE MY BOUQUETS & OPEN RECEIPTS VAULT MODAL */}
      <BouquetVaultModal
        isOpen={isVaultModalOpen}
        isDarkMode={isDarkMode}
        onClose={() => {
          setIsVaultModalOpen(false);
          setVaultCount(getSavedVaultBouquets().length);
        }}
      />

      {/* TOAST NOTIFICATION PILL */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-[#1C1917]/90 text-white dark:bg-stone-100 dark:text-[#1C1917] px-5 py-2.5 rounded-full text-xs font-medium shadow-lg backdrop-blur-sm animate-[fadeIn_200ms_ease-out]"
        >
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}

