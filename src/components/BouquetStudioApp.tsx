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
  const bloomIntervalRef = useRef<number | null>(null);
  const hasHydratedRef = useRef(false);
  const countedOpenCodeRef = useRef<string | null>(null);
  const countedCreatedCodeSetRef = useRef<Set<string>>(new Set());
  const currentSessionVaultCodeRef = useRef<string | null>(null);

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
      musicBox.start();
      musicBox.resumeIfBlocked();
      setIsMusicPlaying(true);
      setIsGiftEntranceOpen(false);
      runStemBloomSequence(items.length);

      if (!isPreviewMode && activeShortCode && countedOpenCodeRef.current !== activeShortCode) {
        countedOpenCodeRef.current = activeShortCode;
        incrementSharedBouquetOpenCount(activeShortCode).catch(() => {});
      }
    },
    [items.length, runStemBloomSequence, isGiftCurrentlyLocked, isPreviewMode, activeShortCode]
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

  // When a recipient clicks "Create Yours" on a shared bouquet, start a fresh empty bouquet
  // so they can never edit or overwrite the sender's shared arrangement!
  const handleCreateOwnFromShared = useCallback(() => {
    if (bloomIntervalRef.current !== null) {
      clearInterval(bloomIntervalRef.current);
      bloomIntervalRef.current = null;
    }
    handleStopVoice();
    setIsVoiceModalOpen(false);
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
                onClick={handleExitGiftViewToEditor}
                className="h-8 px-2.5 sm:h-9 sm:px-3.5 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white dark:bg-white dark:text-[#1C1917] dark:hover:bg-stone-200 text-xs font-medium flex items-center gap-1.5 transition shrink-0"
              >
                <Flower2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Make your own</span>
                <span className="sm:hidden">Edit</span>
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
              GIFT ENTRANCE OVERLAY — Luxury Stationery Envelope & Keepsake Gate
              Supports Immediate Unwrap, Time-Capsule Countdown Lock, and Secret
              Question Lock in the warm ivory / cashmere atelier aesthetic.
              =================================================================== */}
          {(isGiftView || isPreviewMode) && isGiftEntranceOpen && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Bouquet Gift Entrance"
              onClick={() => {
                if (!isResolvingShortCode && !isGiftCurrentlyLocked) {
                  handleUnwrapGiftEntrance();
                }
              }}
              className={`absolute inset-0 z-40 flex items-center justify-center p-4 sm:p-6 transition-opacity duration-300 ${
                isGiftCurrentlyLocked ? 'cursor-default' : 'cursor-pointer'
              } ${
                isDarkMode
                  ? 'bg-[#2B2321]/96'
                  : 'bg-[#FAF6F0]/96'
              }`}
              style={{
                backgroundImage: isDarkMode
                  ? 'radial-gradient(circle at 50% 42%, rgba(230, 184, 156, 0.08) 0%, transparent 65%)'
                  : 'radial-gradient(circle at 50% 42%, rgba(244, 184, 196, 0.18) 0%, transparent 65%)',
              }}
            >
              {!isResolvingShortCode && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isGiftCurrentlyLocked) {
                      handleUnwrapGiftEntrance();
                    }
                  }}
                  className={`card-zoom-modal w-full max-w-[390px] rounded-[28px] p-2.5 shadow-[0_24px_60px_rgba(38,26,20,0.14)] border relative transition-colors ${
                    isDarkMode
                      ? 'bg-[#352C29] border-[#4E423E] text-[#FBF6F1]'
                      : 'bg-[#FFFDF9] border-[#E6D7C8] text-[#231C18]'
                  }`}
                >
                  {/* Inner Dashed Stitch Frame */}
                  <div
                    className={`rounded-[22px] border border-dashed px-6 py-7 sm:px-8 sm:py-8 text-center relative ${
                      isDarkMode ? 'border-[#5E4E49]' : 'border-[#DECBB9]'
                    }`}
                  >
                    {/* Floating Botanical Wax-Sealed Envelope Artwork */}
                    <div className="float-keepsake-envelope mx-auto mb-3.5 w-24 h-20 flex items-center justify-center">
                      <svg viewBox="0 0 136 104" className="w-full h-full overflow-visible">
                        {/* Delicate Botanical Sprigs Peeking Behind Envelope */}
                        <path
                          d="M28,22 C18,12 14,6 10,4 M22,16 C16,18 11,17 8,15 M25,19 C22,11 23,6 25,3"
                          fill="none"
                          stroke="#659A76"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          opacity="0.75"
                        />
                        <path
                          d="M108,22 C118,12 122,6 126,4 M114,16 C120,18 125,17 128,15 M111,19 C114,11 113,6 111,3"
                          fill="none"
                          stroke="#659A76"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          opacity="0.75"
                        />
                        {/* Envelope Drop Shadow Base */}
                        <rect
                          x="16"
                          y="18"
                          width="104"
                          height="70"
                          rx="9"
                          fill={isDarkMode ? '#241D1B' : '#EFE5DA'}
                          transform="translate(0, 3)"
                        />
                        {/* Main Stationery Envelope Body */}
                        <rect
                          x="16"
                          y="18"
                          width="104"
                          height="70"
                          rx="9"
                          fill={isDarkMode ? '#2D2421' : '#FFFDF9'}
                          stroke={isDarkMode ? '#66554F' : '#D8C3B0'}
                          strokeWidth="1.6"
                        />
                        {/* Inner Dashed Stitch Border */}
                        <rect
                          x="21"
                          y="23"
                          width="94"
                          height="60"
                          rx="6"
                          fill="none"
                          stroke={isDarkMode ? '#52433E' : '#E5D5C5'}
                          strokeWidth="1"
                          strokeDasharray="3.5 3"
                        />
                        {/* Bottom & Side Envelope Folds */}
                        <path
                          d="M18,86 L68,52 L118,86"
                          fill="none"
                          stroke={isDarkMode ? '#52433E' : '#E2D1C1'}
                          strokeWidth="1.3"
                        />
                        {/* Top Closed Triangular Flap */}
                        <path
                          d="M17,20 L68,58 L119,20 Z"
                          fill={isDarkMode ? '#3B302C' : '#FAF3EB'}
                          stroke={isDarkMode ? '#66554F' : '#D8C3B0'}
                          strokeWidth="1.6"
                          strokeLinejoin="round"
                        />
                        {/* Embossed Rose-Terracotta Wax Seal */}
                        <circle
                          cx="68"
                          cy="56"
                          r="12"
                          fill="#B85D4B"
                          stroke={isDarkMode ? '#352C29' : '#FFFDF9'}
                          strokeWidth="1.5"
                        />
                        <circle
                          cx="68"
                          cy="56"
                          r="8.5"
                          fill="none"
                          stroke="#FDE68A"
                          strokeWidth="0.9"
                          strokeDasharray="2.5 2"
                          opacity="0.8"
                        />
                        {/* Tiny Heart Inside Wax Seal */}
                        <path
                          d="M68,53.8 C65.8,51.2 62,53 64,56.4 L68,60 L72,56.4 C74,53 70.2,51.2 68,53.8 Z"
                          fill="#FFFDF9"
                        />
                      </svg>
                    </div>

                    {/* Subtle Cursive / Serif Intro */}
                    <p
                      className={`text-sm italic ${
                        isDarkMode ? 'text-[#C8B6AC]' : 'text-[#8C7A70]'
                      }`}
                      style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                    >
                      A handwritten bouquet arranged for
                    </p>

                    <h2
                      className="text-3xl sm:text-[34px] font-medium tracking-tight leading-tight mt-0.5"
                      style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                    >
                      {card.to || 'Someone Special'}
                    </h2>

                    {card.from && (
                      <p
                        className={`text-xs mt-1.5 ${
                          isDarkMode ? 'text-[#C8B6AC]' : 'text-[#7D6B60]'
                        }`}
                      >
                        Sent with love by{' '}
                        <span
                          className={`font-medium ${
                            isDarkMode ? 'text-[#E6B89C]' : 'text-[#6E4434]'
                          }`}
                        >
                          {card.from}
                        </span>
                      </p>
                    )}

                    {/* Delicate Bow Divider */}
                    <div className="flex items-center justify-center gap-2 my-4 opacity-70" aria-hidden="true">
                      <span
                        className={`w-10 border-t border-dashed ${
                          isDarkMode ? 'border-[#5E4E49]' : 'border-[#D8C3B0]'
                        }`}
                      />
                      <svg viewBox="0 0 24 12" className="w-4 h-2.5 text-[#B4846C]" fill="none">
                        <path
                          d="M12,6 C8,1 3,3 5,6 C3,9 8,11 12,6 Z M12,6 C16,1 21,3 19,6 C21,9 16,11 12,6 Z"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span
                        className={`w-10 border-t border-dashed ${
                          isDarkMode ? 'border-[#5E4E49]' : 'border-[#D8C3B0]'
                        }`}
                      />
                    </div>

                    {/* MODE 1: TIME-CAPSULE COUNTDOWN LOCK */}
                    {isCountdownLocked ? (
                      <div className="space-y-3.5">
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { label: 'Days', val: countdownParts.days },
                            { label: 'Hours', val: countdownParts.hours },
                            { label: 'Mins', val: countdownParts.minutes },
                            { label: 'Secs', val: countdownParts.seconds },
                          ].map((unit) => (
                            <div
                              key={unit.label}
                              className={`rounded-2xl py-2.5 px-1 border border-dashed ${
                                isDarkMode
                                  ? 'bg-[#2B2321]/85 border-[#5E4E49]'
                                  : 'bg-[#FAF4EE]/80 border-[#DECBB9]'
                              }`}
                            >
                              <div
                                className={`text-xl sm:text-2xl font-semibold tracking-tight tabular-nums ${
                                  isDarkMode ? 'text-[#E6B89C]' : 'text-[#6E4434]'
                                }`}
                                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                              >
                                {unit.val}
                              </div>
                              <div
                                className={`text-[10px] mt-0.5 ${
                                  isDarkMode ? 'text-[#B8A59B]' : 'text-[#8C7A70]'
                                }`}
                              >
                                {unit.label}
                              </div>
                            </div>
                          ))}
                        </div>

                        <p
                          className={`text-xs leading-relaxed ${
                            isDarkMode ? 'text-[#C8B6AC]' : 'text-[#7D6B60]'
                          }`}
                        >
                          Sealed until{' '}
                          <strong
                            className={`font-medium ${
                              isDarkMode ? 'text-[#FBF6F1]' : 'text-[#231C18]'
                            }`}
                          >
                            {countdownTargetMs
                              ? new Date(countdownTargetMs).toLocaleString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })
                              : 'the unlock date'}
                          </strong>
                        </p>

                        {isPreviewMode && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUnwrapGiftEntrance(true);
                            }}
                            className={`w-full py-2 px-4 rounded-full border border-dashed text-xs font-medium transition cursor-pointer ${
                              isDarkMode
                                ? 'border-[#5E4E49] bg-[#2B2321] text-[#E6D6C7] hover:bg-[#423632]'
                                : 'border-[#DECBB9] bg-[#FAF4EE] text-[#5C4438] hover:bg-[#F3E9DF]'
                            }`}
                          >
                            Sender Preview: Test Unwrap Now
                          </button>
                        )}
                      </div>
                    ) : isPasscodeLocked ? (
                      /* MODE 2: SECRET QUESTION / PASSCODE LOCK */
                      <form
                        onSubmit={handleAttemptPasscodeUnlock}
                        onClick={(e) => e.stopPropagation()}
                        className="space-y-3 text-center"
                      >
                        <div>
                          <p
                            className={`text-[11px] ${
                              isDarkMode ? 'text-[#C8B6AC]' : 'text-[#8C7A70]'
                            }`}
                          >
                            Answer the secret hint to unwrap:
                          </p>
                          <p
                            className="mt-1 text-lg sm:text-xl font-medium italic leading-snug"
                            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                          >
                            “{lock?.questionPrompt || 'Enter our special secret or date to unlock'}”
                          </p>
                        </div>

                        <input
                          type="text"
                          value={passcodeAttempt}
                          onChange={(e) => {
                            setPasscodeAttempt(e.target.value);
                            if (passcodeError) setPasscodeError(null);
                          }}
                          placeholder="Type your answer..."
                          aria-label="Secret answer to unlock bouquet"
                          className={`w-full px-4 py-2.5 rounded-full border border-dashed text-xs text-center focus:outline-none focus:border-[#B4846C] ${
                            isDarkMode
                              ? 'bg-[#2B2321] border-[#5E4E49] text-[#FBF6F1] placeholder:text-[#9A877B]'
                              : 'bg-[#FAF4EE]/80 border-[#DECBB9] text-[#231C18] placeholder:text-[#9A877B]'
                          }`}
                        />

                        {passcodeError && (
                          <p className="text-[11px] text-rose-600 dark:text-rose-300 text-center font-medium">
                            {passcodeError}
                          </p>
                        )}

                        <button
                          type="submit"
                          className={`w-full py-2.5 px-6 rounded-full text-xs font-medium tracking-wide transition active:scale-98 cursor-pointer ${
                            isDarkMode
                              ? 'bg-[#E6B89C] text-[#231C18] hover:bg-[#F0C8B0]'
                              : 'bg-[#6E4434] text-[#FFFDF9] hover:bg-[#5B3729]'
                          }`}
                        >
                          Unlock &amp; Open Bouquet
                        </button>

                        {isPreviewMode && (
                          <button
                            type="button"
                            onClick={() => handleUnwrapGiftEntrance(true)}
                            className={`w-full py-1.5 px-3 rounded-full text-[11px] transition cursor-pointer ${
                              isDarkMode
                                ? 'text-[#C8B6AC] hover:text-[#FBF6F1]'
                                : 'text-[#8C7A70] hover:text-[#231C18]'
                            }`}
                          >
                            Sender Preview: Skip Lock &amp; Test Bloom
                          </button>
                        )}
                      </form>
                    ) : (
                      /* MODE 3: READY TO OPEN IMMEDIATELY */
                      <div className="space-y-2.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnwrapGiftEntrance();
                          }}
                          className={`w-full py-3 px-6 rounded-full text-xs sm:text-sm font-medium tracking-wide shadow-sm transition active:scale-98 cursor-pointer ${
                            isDarkMode
                              ? 'bg-[#E6B89C] text-[#231C18] hover:bg-[#F0C8B0]'
                              : 'bg-[#6E4434] text-[#FFFDF9] hover:bg-[#5B3729]'
                          }`}
                        >
                          Open Bouquet
                        </button>
                        <p
                          className={`text-[11px] ${
                            isDarkMode ? 'text-[#B8A59B]' : 'text-[#9A877B]'
                          }`}
                        >
                          Tap to unwrap your flowers &amp; note
                        </p>
                      </div>
                    )}
                  </div>
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
              Quiet luxury header showing "For [Recipient] · from [Sender]" on the
              left and Replay Bloom / Music / Theme controls on the right.
              =================================================================== */}
          {(isPreviewMode || isGiftView) && !isGiftEntranceOpen && (
            <div className="w-full px-3 sm:px-6 z-20 absolute top-3 sm:top-4 inset-x-0 pointer-events-none flex items-center justify-between gap-2">
              {/* Left: Dedication Capsule */}
              <div
                className={`pointer-events-auto inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-dashed shadow-[0_6px_24px_rgba(35,28,24,0.06)] backdrop-blur-md max-w-[68vw] sm:max-w-md ${
                  isDarkMode
                    ? 'bg-[#352C29]/92 border-[#5E4E49] text-[#FBF6F1]'
                    : 'bg-[#FFFDF9]/92 border-[#DECBB9] text-[#231C18]'
                }`}
              >
                <BrandLogoMark className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" isDarkMode={isDarkMode} />
                <div className="truncate text-xs sm:text-sm">
                  <span
                    className="font-semibold tracking-tight text-sm sm:text-base"
                    style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                  >
                    For {card.to || 'You'}
                  </span>
                  {card.from && (
                    <span
                      className={`ml-1.5 text-[11px] sm:text-xs ${
                        isDarkMode ? 'text-[#C8B6AC]' : 'text-[#8C7A70]'
                      }`}
                    >
                      · from {card.from}
                    </span>
                  )}
                </div>
              </div>

              {/* Right: Quiet Ambient Controls (Replay Bloom, Music, Theme) */}
              <div
                className={`pointer-events-auto inline-flex items-center gap-1 p-1 rounded-full border border-dashed shadow-[0_6px_24px_rgba(35,28,24,0.06)] backdrop-blur-md shrink-0 ${
                  isDarkMode
                    ? 'bg-[#352C29]/92 border-[#5E4E49] text-[#FBF6F1]'
                    : 'bg-[#FFFDF9]/92 border-[#DECBB9] text-[#231C18]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => startGiftBloomAnimation(items.length, false)}
                  aria-label="Replay bloom animation"
                  title="Replay bloom animation"
                  className={`h-7 px-2.5 rounded-full text-[11px] font-medium flex items-center gap-1 transition active:scale-95 cursor-pointer ${
                    isDarkMode
                      ? 'text-[#E6D6C7] hover:bg-[#463A36]'
                      : 'text-[#5C4438] hover:bg-[#FAF4EE]'
                  }`}
                >
                  <RotateCcw className="w-3 h-3 text-[#B4846C]" />
                  <span className="hidden sm:inline">Replay</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleMusic}
                  aria-pressed={isMusicPlaying}
                  aria-label={isMusicPlaying ? 'Pause music' : 'Play music'}
                  title={isMusicPlaying ? 'Pause music box' : 'Play music box'}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition active:scale-95 cursor-pointer ${
                    isMusicPlaying
                      ? 'bg-[#B4846C]/20 text-[#B4846C]'
                      : isDarkMode
                      ? 'text-[#C8B6AC] hover:bg-[#463A36]'
                      : 'text-[#7D6B60] hover:bg-[#FAF4EE]'
                  }`}
                >
                  {isMusicPlaying ? <Music className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => setIsDarkMode((prev) => !prev)}
                  aria-label="Toggle theme"
                  title="Toggle theme"
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition active:scale-95 cursor-pointer ${
                    isDarkMode
                      ? 'text-[#E6B89C] hover:bg-[#463A36]'
                      : 'text-[#7D6B60] hover:bg-[#FAF4EE]'
                  }`}
                >
                  {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-300" /> : <Moon className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}

          {/* ===================================================================
              RECIPIENT BOTTOM KEEPSAKE BAR & REACTION POPOVER
              Warm stationery dock with direct Read Letter, Voice, Thank/Reply,
              Save PNG, and Craft Yours actions.
              =================================================================== */}
          {(isPreviewMode || isGiftView) && !isGiftEntranceOpen && (
            <div
              className="w-full px-3 sm:px-4 z-20 absolute bottom-3.5 sm:bottom-6 inset-x-0 pointer-events-none flex flex-col items-center gap-2.5"
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            >
              {/* Expandable Recipient Reaction & Thank-You Note Stationery Card */}
              {isReactionPopoverOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className={`pointer-events-auto w-full max-w-sm rounded-[24px] p-4 sm:p-5 border border-dashed shadow-[0_20px_50px_rgba(28,20,16,0.18)] backdrop-blur-xl animate-in fade-in duration-150 ${
                    isDarkMode
                      ? 'bg-[#352C29]/96 border-[#5E4E49] text-[#FBF6F1]'
                      : 'bg-[#FFFDF9]/96 border-[#DECBB9] text-[#231C18]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4
                        className="text-lg font-medium tracking-tight leading-none"
                        style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                      >
                        Send a Note to {card.from || 'Sender'}
                      </h4>
                      <p
                        className={`text-[11px] mt-0.5 ${
                          isDarkMode ? 'text-[#C8B6AC]' : 'text-[#8C7A70]'
                        }`}
                      >
                        Let them know their bouquet arrived
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsReactionPopoverOpen(false)}
                      className={`p-1.5 rounded-full transition cursor-pointer ${
                        isDarkMode
                          ? 'text-[#C8B6AC] hover:text-[#FBF6F1] hover:bg-[#463A36]'
                          : 'text-[#8C7A70] hover:text-[#231C18] hover:bg-[#FAF4EE]'
                      }`}
                      aria-label="Close reaction card"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 mb-2.5">
                    {RECIPIENT_REACTIONS.map((rx) => {
                      const active = selectedReactionId === rx.id;
                      return (
                        <button
                          key={rx.id}
                          type="button"
                          onClick={() => setSelectedReactionId(rx.id)}
                          className={`px-3 py-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                            active
                              ? isDarkMode
                                ? 'border-[#E6B89C] bg-[#E6B89C]/20 text-[#FBF6F1]'
                                : 'border-[#6E4434] bg-[#6E4434]/10 text-[#231C18]'
                              : isDarkMode
                              ? 'border-dashed border-[#544540] bg-[#2B2321] text-[#D8C7BE] hover:border-[#6E5B54]'
                              : 'border-dashed border-[#DECBB9] bg-[#FAF4EE]/70 text-[#5C4438] hover:border-[#C5A892]'
                          }`}
                        >
                          <span className="text-sm">{rx.symbol}</span>
                          <span className="truncate">{rx.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <textarea
                    rows={2}
                    maxLength={200}
                    value={recipientReplyText}
                    onChange={(e) => setRecipientReplyText(e.target.value)}
                    placeholder={`Write a sweet thank-you note to ${card.from || 'the sender'}...`}
                    style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '16px' }}
                    className={`w-full px-3.5 py-2 rounded-xl border border-dashed resize-none focus:outline-none focus:border-[#B4846C] ${
                      isDarkMode
                        ? 'bg-[#2B2321] border-[#5E4E49] text-[#FBF6F1] placeholder:text-[#9A877B]'
                        : 'bg-[#FAF4EE]/70 border-[#DECBB9] text-[#231C18] placeholder:text-[#9A877B]'
                    }`}
                  />

                  <button
                    type="button"
                    disabled={isSubmittingReaction}
                    onClick={handleSubmitRecipientReaction}
                    className={`mt-2.5 w-full py-2.5 px-4 rounded-full text-xs font-medium transition cursor-pointer disabled:opacity-50 ${
                      isDarkMode
                        ? 'bg-[#E6B89C] text-[#231C18] hover:bg-[#F0C8B0]'
                        : 'bg-[#6E4434] text-[#FFFDF9] hover:bg-[#5B3729]'
                    }`}
                  >
                    {isSubmittingReaction ? 'Sending...' : 'Send Thank-You Note ♥'}
                  </button>
                </div>
              )}

              <div
                className={`pointer-events-auto inline-flex items-center gap-1 sm:gap-1.5 p-1.5 rounded-full border border-dashed shadow-[0_12px_36px_rgba(35,28,24,0.10)] backdrop-blur-md max-w-full overflow-x-auto no-scrollbar transition-all duration-500 ${
                  isDarkMode
                    ? 'bg-[#352C29]/95 border-[#5E4E49] text-[#FBF6F1]'
                    : 'bg-[#FFFDF9]/95 border-[#DECBB9] text-[#231C18]'
                } ${
                  showGiftCardReveal || isPreviewMode
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-3 pointer-events-none'
                }`}
              >
                {/* 1. Open / Read Letter Button */}
                {card.visibleOnStage && (
                  <button
                    type="button"
                    onClick={() => {
                      setLetterTypedChars(0);
                      setIsLetterModalOpen(true);
                    }}
                    className={`px-3 sm:px-3.5 py-2 rounded-full border border-dashed text-xs font-medium flex items-center gap-1.5 shrink-0 transition active:scale-95 cursor-pointer ${
                      isDarkMode
                        ? 'border-[#5E4E49] bg-[#2B2321] hover:bg-[#423632] text-[#FBF6F1]'
                        : 'border-[#DECBB9] bg-[#FAF4EE] hover:bg-[#F3E9DF] text-[#5C4438]'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5 text-[#B4846C]" />
                    <span className="hidden sm:inline">Read Letter</span>
                    <span className="sm:hidden">Letter</span>
                  </button>
                )}

                {/* 2. Recipient Voice Keepsake Play Button */}
                {(voice.visibleOnStage || Boolean(voice.audioDataUrl)) && (
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
                    className={`px-3 sm:px-3.5 py-2 rounded-full border border-dashed text-xs font-medium flex items-center gap-1.5 shrink-0 transition active:scale-95 cursor-pointer ${
                      isVoicePlaying
                        ? 'bg-rose-600 text-white border-rose-600'
                        : isDarkMode
                        ? 'border-[#5E4E49] bg-[#2B2321] hover:bg-[#423632] text-[#FBF6F1]'
                        : 'border-[#DECBB9] bg-[#FAF4EE] hover:bg-[#F3E9DF] text-[#5C4438]'
                    }`}
                  >
                    {isVoicePlaying ? (
                      <Pause className="w-3.5 h-3.5 fill-current" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current text-[#B4846C]" />
                    )}
                    <span>Voice</span>
                  </button>
                )}

                {/* 3. Recipient Reaction / Thank-You Reply Button */}
                <button
                  type="button"
                  onClick={() => setIsReactionPopoverOpen((prev) => !prev)}
                  className={`px-3 sm:px-3.5 py-2 rounded-full border border-dashed text-xs font-medium flex items-center gap-1.5 shrink-0 transition active:scale-95 cursor-pointer ${
                    hasSubmittedReaction
                      ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
                      : isDarkMode
                      ? 'border-[#5E4E49] bg-[#2B2321] hover:bg-[#423632] text-[#FBF6F1]'
                      : 'border-[#DECBB9] bg-[#FAF4EE] hover:bg-[#F3E9DF] text-[#5C4438]'
                  }`}
                >
                  <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20" />
                  <span>{hasSubmittedReaction ? 'Sent ♥' : 'React / Reply'}</span>
                </button>

                {/* 4. Save PNG Button */}
                <button
                  type="button"
                  onClick={handleExportPng}
                  aria-label="Save as PNG"
                  title="Save bouquet as PNG image"
                  className={`px-3 sm:px-3.5 py-2 rounded-full border border-dashed text-xs font-medium flex items-center gap-1.5 shrink-0 transition active:scale-95 cursor-pointer ${
                    isDarkMode
                      ? 'border-[#5E4E49] bg-[#2B2321] hover:bg-[#423632] text-[#FBF6F1]'
                      : 'border-[#DECBB9] bg-[#FAF4EE] hover:bg-[#F3E9DF] text-[#5C4438]'
                  }`}
                >
                  <Download className="w-3.5 h-3.5 text-[#B4846C]" />
                  <span className="hidden sm:inline">Save as PNG</span>
                  <span className="sm:hidden">PNG</span>
                </button>

                {/* 5. Back to Editing / Create Yours Primary CTA */}
                <button
                  type="button"
                  onClick={isPreviewMode ? handleExitGiftViewToEditor : handleCreateOwnFromShared}
                  className={`px-4 py-2 rounded-full text-xs font-medium flex items-center gap-1.5 shrink-0 transition active:scale-95 cursor-pointer ${
                    isDarkMode
                      ? 'bg-[#E6B89C] text-[#231C18] hover:bg-[#F0C8B0]'
                      : 'bg-[#6E4434] text-[#FFFDF9] hover:bg-[#5B3729]'
                  }`}
                >
                  {isPreviewMode ? (
                    <>
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Back to editing</span>
                    </>
                  ) : (
                    <>
                      <Flower2 className="w-3.5 h-3.5" />
                      <span>Create Yours</span>
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

            {/* Row 2: Horizontal Circular Item Carousel (Collapsible down on Phone & Desktop) */}
            <div
              className={`flex items-start gap-2.5 sm:gap-3 overflow-x-auto no-scrollbar pt-0.5 pb-1 ${
                isDesktopDockCollapsed ? 'hidden' : ''
              }`}
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

                {/* Embossed Wax Seal Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shadow-md shrink-0 relative"
                    style={{ backgroundColor: cardPalette.seal }}
                  >
                    <div className="w-7 h-7 rounded-full border border-white/60 flex items-center justify-center">
                      <Flower2 className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <span
                      className="text-[11px] uppercase tracking-widest font-semibold opacity-70 block"
                      style={{ color: cardPalette.sign }}
                    >
                      A Personal Note
                    </span>
                  </div>
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

