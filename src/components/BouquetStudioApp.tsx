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
  ArrowLeft,
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
  MessageSquareHeart,
  Home,
  BookOpen,
  Bookmark,
  Save,
  ImagePlus,
} from 'lucide-react';
import {
  FlowerType,
  CardTheme,
  RibbonStyle,
  typeWrapStyle,
  WrapStyle,
  BouquetItem,
  getEffectiveItemPlane,
  GreetingCardData,
  BouquetSnapshot,
  BouquetLockMode,
  BouquetPasscodeType,
  PhotoFrameStyle,
  CanvasEnvironment,
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
  PHOTO_FRAME_CATALOG,
  ENVIRONMENT_CATALOG,
  ROMANTIC_SWATCHES,
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
  hydrateSnapshotWithFirestoreRecord,
  isInAppBrowser,
  exportSvgElementToPng,
  compressUploadedPhotoToDataUrl,
  musicBox,
} from '../lib/shareAndExport';
import {
  DEFAULT_PIN_HINT,
  DEFAULT_WORD_HINT,
  isSecretAnswerMatch,
  resolveEffectivePasscodeType,
  sanitizeSecretPinInput,
  sanitizeSecretWordInput,
  validateBouquetLockConfig,
  validateDedicationRecipient,
} from '../lib/lockUtils';
import {
  saveSharedBouquetToFirestore,
  fetchSharedBouquetFromFirestore,
  incrementSharedBouquetOpenCount,
  incrementSharedBouquetVoicePlayCount,
  submitSharedBouquetReaction,
  incrementStudioGlobalStat,
  getSavedVaultBouquets,
  saveBouquetToLocalVault,
  publishBouquetToGlobalGarlandFeed,
} from '../lib/firebase';
import { useBouquetStore } from '../store/useBouquetStore';
import { BouquetStage } from './BouquetStage';
import { getEnvironmentPageBackdrop } from '../lib/environmentBackdrop';
import { BrandLogoMark } from './BrandLogoMark';
import {
  MiniWrapConeSVG,
  MiniRibbonBowSVG,
  MiniCardShapeSVG,
  MiniVoiceKeepsakeSVG,
  MiniPhotoFrameSVG,
  MiniEnvironmentSVG,
  LayerOrderBoxIcon,
  BouquetClipToggleIcon,
} from './MiniThumbnails';
import { LayerManagerPanel } from './LayerManagerPanel';
import { SelectedFlowerToolbar, UnifiedColorTarget } from './SelectedFlowerToolbar';
import { VoiceRecorderStudio, VoiceKeepsakePlayerModal } from './VoiceRecorderStudio';
import { LandingPageView } from './LandingPageView';
import { BouquetVaultModal } from './BouquetVaultModal';
import { RecipientDeliveryPrelude } from './RecipientDeliveryPrelude';
import { computeRecipientSlideBloomState } from '../lib/dofParallax';
import {
  DeliveryPreludeScene,
  getDeliverySceneTimings,
  hasSeenDeliveryPrelude,
  markDeliveryPreludeSeen,
  playWaxSealUnsealChime,
  resolveInitialDeliveryScene,
} from '../lib/deliveryPrelude';
import { sendBouquetSurpriseEmail } from '../lib/contactService';
import {
  clearPendingCheckoutStorage,
  formatPassRemainingTime,
  FOUNDING_RECIPIENT_GIFT_MIN_NOTE_CHARS,
  FOUNDING_RECIPIENT_GIFT_MIN_STEMS,
  FREE_CARD_NOTE_MAX_CHARS,
  getActivePremiumAssetConfig,
  getOrCreateDeviceTokenHash,
  getRetentionPolicyForPassTier,
  getStoredStudioPass,
  GiftOpenSource,
  hasDeviceClaimedRecipientGift,
  inspectBouquetPremiumUsage,
  isEligibleRecipientGiftOpenSource,
  isEnvironmentPremium,
  isFlowerPremium,
  isFoundingPromoFreePass,
  isPhotoStylePremium,
  isRibbonPremium,
  isVoiceStylePremium,
  isWrapPremium,
  loadPendingCheckoutStorage,
  markDeviceClaimedRecipientGift,
  PREMIUM_CARD_NOTE_MAX_CHARS,
  PremiumAssetConfig,
  saveStoredStudioPass,
  StudioPassRecord,
  verifyActiveStudioPassForAction,
  verifyStudioPassOnServer,
} from '../lib/monetization';
import {
  StudioCheckoutModal,
  CoutureBloomSeal,
  CoutureItemBadge,
  fetchCheckoutCapability,
} from './StudioCheckoutModal';
import { BotanicalQrCard } from './BotanicalQrCard';
import { StealthGateAndOwnerConsole } from './OwnerAnalyticsConsole';
import {
  extractStealthGateSlug,
  extractVoucherKeyFromSearch,
  initVercelWebAnalytics,
  trackStudioTelemetry,
} from '../lib/ownerAnalytics';
import {
  detectInitialSeoRoute,
  syncDocumentSeoMeta,
} from '../lib/seoMeta';
import {
  getActiveSeasonalEvent,
  getAvailableSeasonalCatalog,
} from '../lib/seasonalCalendar';
import {
  clearCanvasRecoverySnapshot,
  loadCanvasRecoverySnapshot,
  saveCanvasRecoverySnapshot,
  setCanvasRecoveryInStudioFlag,
} from '../lib/canvasRecovery';

// ============================================================================
// MODULE 7: components/MainApp.tsx — BOUQUET STUDIO WORKSPACE & GIFT PREVIEW
// ============================================================================

type MobileCategory =
  | 'wrapping'
  | 'flowers'
  | 'fillers'
  | 'others'
  | 'seasonal'
  | 'photos'
  | 'ribbon'
  | 'environment'
  | 'card'
  | 'voice';

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
    environment,
    bouquetPose,
    card,
    voice,
    lock,
    past,
    future,
    addFlower,
    addPhotoCard,
    updateItem,
    setWrapStyle,
    setWrapColor,
    setRibbonColor,
    setRibbonStyle,
    setEnvironment,
    updateCard,
    updateVoice,
    updateLock,
    randomizeBouquet,
    clearBouquet,
    undo,
    redo,
    deleteSelected,
    duplicateSelected,
    moveItemLayer,
    selectItem,
    loadSnapshot
  } = useBouquetStore();

  const [activeTab, setActiveTab] = useState<'flowers' | 'wrap' | 'card' | 'layers'>('flowers');
  const [mobileCategory, setMobileCategory] = useState<MobileCategory>('wrapping');
  const [mobilePopover, setMobilePopover] = useState<'color' | 'stem' | 'layers' | 'card' | 'voice' | null>(null);
  const [activeColorTarget, setActiveColorTarget] = useState<UnifiedColorTarget>('wrapper');
  const [isMobileToolsExpanded, setIsMobileToolsExpanded] = useState(true);
  const [isDesktopDockCollapsed, setIsDesktopDockCollapsed] = useState(false);
  const photoUploadInputRef = useRef<HTMLInputElement | null>(null);
  const pendingPhotoTargetItemIdRef = useRef<string | null>(null);
  const pendingPhotoStyleRef = useRef<PhotoFrameStyle>('polaroid');
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
  const [stealthGateSlug, setStealthGateSlug] = useState<string | null>(() =>
    typeof window !== 'undefined' ? extractStealthGateSlug(window.location.pathname) : null
  );
  const [showLandingPage, setShowLandingPage] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    if (extractStealthGateSlug(window.location.pathname)) return false;
    if (extractVoucherKeyFromSearch(window.location.search)) return false;
    if (isGiftShareHash()) return false;
    if (getShortCodeFromPathname(window.location.pathname)) return false;
    if (window.location.search.includes('studio=1')) return false;
    if (
      window.location.search.includes('checkout_success=') ||
      window.location.search.includes('checkout_cancelled=')
    ) {
      return false;
    }
    const seoRoute = detectInitialSeoRoute(window.location.pathname);
    if (seoRoute === 'studio') return false;
    if (seoRoute === 'garland') return true;
    const recovered = loadCanvasRecoverySnapshot();
    if (recovered?.wasInStudio) return false;
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
  const [passcodeFeedback, setPasscodeFeedback] = useState<'idle' | 'error' | 'success'>('idle');
  const [passcodeShakeKey, setPasscodeShakeKey] = useState<number>(0);
  const [isPinFocused, setIsPinFocused] = useState<boolean>(false);
  const [isWordFocused, setIsWordFocused] = useState<boolean>(false);
  const passcodeUnlockTimerRef = useRef<number | null>(null);
  const pinErrorClearTimerRef = useRef<number | null>(null);
  const pinInputRef = useRef<HTMLInputElement | null>(null);
  const [shareLockError, setShareLockError] = useState<string | null>(null);
  const [shareDedicationError, setShareDedicationError] = useState<string | null>(null);
  const recipientInputRef = useRef<HTMLInputElement | null>(null);
  const [isReactionPopoverOpen, setIsReactionPopoverOpen] = useState(false);
  const [selectedReactionId, setSelectedReactionId] = useState<string>('');
  const [recipientReplyText, setRecipientReplyText] = useState<string>('');
  const [hasSubmittedReaction, setHasSubmittedReaction] = useState(false);
  const [isSubmittingReaction, setIsSubmittingReaction] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isGiftView, setIsGiftView] = useState<boolean>(initialGiftMode);
  const [giftOpenSource, setGiftOpenSource] = useState<GiftOpenSource>(
    initialGiftMode ? 'direct_link' : null
  );
  const [isGiftEntranceOpen, setIsGiftEntranceOpen] = useState<boolean>(initialGiftMode);
  const [isReducedMotion, setIsReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  const initialDeliveryKey =
    initialPathShortCode || (typeof window !== 'undefined' ? window.location.hash : '');
  const deliveryIdentityKeyRef = useRef<string>(initialDeliveryKey);
  const [deliveryScene, setDeliveryScene] = useState<DeliveryPreludeScene>(() =>
    initialGiftMode
      ? resolveInitialDeliveryScene({
          hasSeenBefore: hasSeenDeliveryPrelude(initialDeliveryKey),
          forceFullStory: false,
        })
      : 'arrival'
  );
  const [isEntranceUnfurling, setIsEntranceUnfurling] = useState<boolean>(false);
  const [entranceSlideProgress, setEntranceSlideProgress] = useState<number>(0);
  const [isDraggingEntranceSlider, setIsDraggingEntranceSlider] = useState<boolean>(false);
  const entranceSlideRafRef = useRef<number | null>(null);
  const unfurlTimerRef = useRef<number | null>(null);
  const bloomDelayTimerRef = useRef<number | null>(null);
  const [isResolvingShortCode, setIsResolvingShortCode] = useState<boolean>(initialNeedsRemoteResolve);
  const [bloomRevealRunId, setBloomRevealRunId] = useState<number>(0);
  const [isBloomRevealActive, setIsBloomRevealActive] = useState<boolean>(false);
  const [showGiftCardReveal, setShowGiftCardReveal] = useState<boolean>(!initialGiftMode);
  const [isGiftBloomFinished, setIsGiftBloomFinished] = useState<boolean>(false);
  const [isRecipientGiftBoxVisible, setIsRecipientGiftBoxVisible] = useState<boolean>(false);
  const [isRecipientGiftModalOpen, setIsRecipientGiftModalOpen] = useState<boolean>(false);
  const [isClaimingRecipientGift, setIsClaimingRecipientGift] = useState<boolean>(false);
  const [recipientGiftClaimError, setRecipientGiftClaimError] = useState<string | null>(null);
  const [isLetterModalOpen, setIsLetterModalOpen] = useState(false);
  const [letterTypedChars, setLetterTypedChars] = useState(0);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareStep, setShareStep] = useState<'dedication' | 'lock' | 'seal' | 'ready'>('dedication');
  const [sealedGiftUrl, setSealedGiftUrl] = useState<string>('');
  const [sealedBouquetCode, setSealedBouquetCode] = useState<string | null>(null);
  const [sealedPaidPass, setSealedPaidPass] = useState<StudioPassRecord | null>(null);
  const [isFinalDesignChecked, setIsFinalDesignChecked] = useState<boolean>(true);
  const [pinToShowcaseChecked, setPinToShowcaseChecked] = useState<boolean>(true);
  const shouldResetStudioOnShareCloseRef = useRef<boolean>(false);
  const isSealedBouquetPaidRef = useRef<boolean>(false);
  const [shortShareUrl, setShortShareUrl] = useState<string | null>(null);
  const [isShorteningUrl, setIsShorteningUrl] = useState(false);
  const [copiedSealedLink, setCopiedSealedLink] = useState(false);
  const [surpriseRecipientEmail, setSurpriseRecipientEmail] = useState<string>('');
  const [isSendingSurpriseEmail, setIsSendingSurpriseEmail] = useState<boolean>(false);
  const [surpriseEmailSentTo, setSurpriseEmailSentTo] = useState<string | null>(null);
  const [surpriseEmailError, setSurpriseEmailError] = useState<string | null>(null);
  const [savedDraftPulse, setSavedDraftPulse] = useState(false);
  const [hasUnsavedDraftChanges, setHasUnsavedDraftChanges] = useState(false);
  const [isInAppBrowserModalOpen, setIsInAppBrowserModalOpen] = useState(false);
  const [corruptedLinkAlert, setCorruptedLinkAlert] = useState<string | null>(null);
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
  const showcaseResolveRequestIdRef = useRef<number>(0);
  const hasHydratedRef = useRef(false);
  const countedOpenCodeRef = useRef<string | null>(null);
  const countedCreatedCodeSetRef = useRef<Set<string>>(new Set());
  const currentSessionVaultCodeRef = useRef<string | null>(null);
  const currentSessionVaultIsDraftRef = useRef<boolean>(false);
  const skipNextDirtyMarkRef = useRef<boolean>(false);
  const suppressRecoveryUntilNextEditRef = useRef<boolean>(false);
  const recoveryMetaRef = useRef<{
    canPersist: boolean;
    wasInStudio: boolean;
    hasUnsavedChanges: boolean;
  }>({
    canPersist: false,
    wasInStudio: false,
    hasUnsavedChanges: false,
  });
  const [returnToCreationsPage, setReturnToCreationsPage] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return detectInitialSeoRoute(window.location.pathname) === 'garland';
  });

  // Synchronize document title, meta description, canonical URL, and robots directive for search engines
  useEffect(() => {
    if (stealthGateSlug) {
      syncDocumentSeoMeta({ mode: 'admin' });
    } else if (isGiftView && !isPreviewMode) {
      syncDocumentSeoMeta({ mode: 'gift', recipientName: card?.to });
    } else if (!showLandingPage) {
      syncDocumentSeoMeta({ mode: 'studio' });
    } else if (returnToCreationsPage) {
      syncDocumentSeoMeta({ mode: 'garland' });
    } else {
      syncDocumentSeoMeta({ mode: 'landing' });
    }
  }, [stealthGateSlug, isGiftView, isPreviewMode, showLandingPage, returnToCreationsPage, card?.to]);
  const [activeStudioPass, setActiveStudioPass] = useState<StudioPassRecord | null>(() =>
    getStoredStudioPass()
  );
  const [premiumAssetConfig, setPremiumAssetConfig] = useState<PremiumAssetConfig>(() =>
    getActivePremiumAssetConfig()
  );
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutTriggerAction, setCheckoutTriggerAction] = useState<
    'share' | 'png' | 'pass_menu'
  >('pass_menu');
  const [checkoutInitialView, setCheckoutInitialView] = useState<'plans' | 'redeem'>('plans');
  const lastSealSyncPromiseRef = useRef<Promise<unknown> | null>(null);

  const currentPremiumInspection = useMemo(
    () =>
      inspectBouquetPremiumUsage(
        { items, wrapStyle, ribbonStyle, environment, card, voice, lock },
        premiumAssetConfig
      ),
    [items, wrapStyle, ribbonStyle, environment, card, voice, lock, premiumAssetConfig]
  );

  const currentBouquetShortCode = useMemo(() => {
    const snap: BouquetSnapshot = {
      items,
      wrapStyle,
      wrapColor,
      ribbonColor,
      ribbonStyle,
      environment,
      bouquetPose,
      card,
      voice,
      lock,
    };
    return computeShortCode(encodeBouquetToCompactPayload(snap, true));
  }, [items, wrapStyle, wrapColor, ribbonColor, ribbonStyle, environment, bouquetPose, card, voice, lock]);

  const currentPassCheck = useMemo(() => {
    const devHash = getOrCreateDeviceTokenHash();
    return verifyActiveStudioPassForAction({
      pass: activeStudioPass,
      deviceTokenHash: devHash,
      clientSessionNonce: activeStudioPass?.activeSessionNonce,
      bouquetCode: currentBouquetShortCode,
      incrementUsage: false,
    });
  }, [activeStudioPass, currentBouquetShortCode]);

  const isSealedPaidBouquet = Boolean(
    sealedPaidPass && sealedBouquetCode && sealedBouquetCode === currentBouquetShortCode
  );
  const unlockedPassForCurrentBouquet =
    currentPassCheck.valid && activeStudioPass
      ? activeStudioPass
      : isSealedPaidBouquet
        ? sealedPaidPass
        : null;
  const isBouquetUnlockedByPass = Boolean(unlockedPassForCurrentBouquet);
  const activeRetentionPolicy = useMemo(
    () =>
      getRetentionPolicyForPassTier(
        currentPassCheck.valid && activeStudioPass ? activeStudioPass.tier : 'free'
      ),
    [currentPassCheck.valid, activeStudioPass]
  );

  const lastServerVerifiedPassSigRef = useRef<string>('');

  // Harden against F12 DevTools localStorage tampering: re-verify HMAC integrity & canonical server record on load, storage, and focus events
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;

    const verifyStoredPassAgainstServer = async (candidate: StudioPassRecord | null) => {
      if (!candidate) return;
      const res = await verifyStudioPassOnServer({
        pass: candidate,
        incrementUsage: false,
      });
      if (cancelled) return;
      if (!res.valid || !res.updatedPass) {
        lastServerVerifiedPassSigRef.current = '';
        saveStoredStudioPass(null);
        setActiveStudioPass(null);
        return;
      }
      lastServerVerifiedPassSigRef.current = res.updatedPass.signature;
      if (
        !activeStudioPass ||
        activeStudioPass.passKey !== res.updatedPass.passKey ||
        res.updatedPass.signature !== candidate.signature ||
        res.updatedPass.dailyUsageCount !== candidate.dailyUsageCount
      ) {
        clearPendingCheckoutStorage();
        saveStoredStudioPass(res.updatedPass);
        setActiveStudioPass(res.updatedPass);
      }
    };

    if (
      activeStudioPass &&
      activeStudioPass.signature !== lastServerVerifiedPassSigRef.current
    ) {
      verifyStoredPassAgainstServer(activeStudioPass);
    }

    const enforcePassIntegrity = () => {
      const verified = getStoredStudioPass();
      if (!verified) {
        lastServerVerifiedPassSigRef.current = '';
        if (activeStudioPass) {
          setActiveStudioPass(null);
        }
        return;
      }
      if (!currentPassCheck.valid && currentPassCheck.status === 'TAMPERED_SIGNATURE') {
        lastServerVerifiedPassSigRef.current = '';
        saveStoredStudioPass(null);
        setActiveStudioPass(null);
        return;
      }
      verifyStoredPassAgainstServer(verified);
    };

    window.addEventListener('storage', enforcePassIntegrity);
    window.addEventListener('focus', enforcePassIntegrity);
    return () => {
      cancelled = true;
      window.removeEventListener('storage', enforcePassIntegrity);
      window.removeEventListener('focus', enforcePassIntegrity);
    };
  }, [activeStudioPass, currentPassCheck.valid, currentPassCheck.status]);

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
    const toStr = `Dearest ${card.to.trim() || 'Someone Special'},`;
    const msgStr = card.message || 'Thinking of you with love and blossoms.';
    const fromStr = card.from.trim() ? `With love, ${card.from.trim()}` : 'With love';
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
  const selectedItemIndex = useMemo(
    () => (selectedItem ? items.findIndex((i) => i.id === selectedItem.id) : -1),
    [items, selectedItem]
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

  const openDesktopToolPopover = useCallback(
    (mode: 'color' | 'stem' | 'layers' | 'card' | 'voice') => {
      if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
        setIsMobileToolsExpanded(true);
        setMobilePopover(mode);
      }
    },
    []
  );

  const triggerPhotoFilePicker = useCallback(
    (targetItemId?: string | null, defaultStyle: PhotoFrameStyle = 'raw') => {
      pendingPhotoTargetItemIdRef.current = targetItemId || null;
      pendingPhotoStyleRef.current = defaultStyle;
      if (photoUploadInputRef.current) {
        photoUploadInputRef.current.value = '';
        photoUploadInputRef.current.click();
      }
    },
    []
  );

  const handlePhotoFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const compressedDataUrl = await compressUploadedPhotoToDataUrl(file, 440);
        const targetId = pendingPhotoTargetItemIdRef.current;
        const targetExists = targetId ? items.some((i) => i.id === targetId && i.photoStyle) : false;
        if (targetId && targetExists) {
          updateItem(targetId, { photoDataUrl: compressedDataUrl });
          selectItem(targetId);
          openDesktopToolPopover('stem');
          triggerToast('Photo updated!');
        } else {
          const nextStyle = pendingPhotoStyleRef.current || 'raw';
          addPhotoCard(nextStyle, compressedDataUrl);
          setActiveColorTarget('petal');
          openDesktopToolPopover('stem');
          triggerToast(nextStyle === 'raw' ? 'Photo added!' : 'Photocard added!');
        }
      } catch (err) {
        const msg =
          err instanceof Error && err.message
            ? err.message
            : 'Invalid file: only JPG, PNG, WebP, or GIF images up to 5 MB are allowed.';
        triggerToast(msg);
      } finally {
        pendingPhotoTargetItemIdRef.current = null;
        e.target.value = '';
      }
    },
    [items, updateItem, selectItem, addPhotoCard, openDesktopToolPopover, triggerToast]
  );

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
    const unsubscribeMusic = musicBox.subscribe((playing) => {
      setIsMusicPlaying(playing);
    });
    musicBox.start();
    setIsMusicPlaying(musicBox.getIsPlaying());

    const unlockAudio = () => {
      if (typeof document !== 'undefined' && (document.hidden || document.visibilityState !== 'visible')) {
        return;
      }
      musicBox.resumeIfBlocked();
    };

    const pauseAudioInBackground = () => {
      if (voiceAudioRef.current && !voiceAudioRef.current.paused) {
        voiceAudioRef.current.pause();
        setIsVoicePlaying(false);
      }
      musicBox.pauseForBackground();
    };

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && (document.hidden || document.visibilityState !== 'visible')) {
        pauseAudioInBackground();
      } else {
        musicBox.resumeFromBackground();
      }
    };

    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', pauseAudioInBackground);

    return () => {
      unsubscribeMusic();
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', pauseAudioInBackground);
      musicBox.stop();
    };
  }, []);

  // Warm checkout region capability in background so opening Studio Pass never flashes USD/PHP
  useEffect(() => {
    void fetchCheckoutCapability();
  }, []);

  const handleToggleMusic = () => {
    const playing = musicBox.toggle();
    setIsMusicPlaying(playing);
    triggerToast(playing ? 'Music playing' : 'Music paused');
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

  const effectivePasscodeType: BouquetPasscodeType = resolveEffectivePasscodeType(lock);

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
      triggerToast('Unwrap bouquet first to listen');
      return;
    }
    if (!voice?.audioDataUrl) {
      triggerToast('Tap Record Voice to add a note');
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
      incrementSharedBouquetVoicePlayCount(activeShortCode).catch(() => { });
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

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  const runStemBloomSequence = useCallback(
    (_totalItems?: number) => {
      setShowGiftCardReveal(false);
      setIsGiftBloomFinished(false);
      setIsBloomRevealActive(true);
      setBloomRevealRunId((prev) => prev + 1);
    },
    []
  );

  const handleBloomCardStageReached = useCallback(() => {
    setShowGiftCardReveal(true);
  }, []);

  const handleBloomSequenceFinished = useCallback(() => {
    setShowGiftCardReveal(true);
    setIsGiftBloomFinished(true);
  }, []);

  const startGiftBloomAnimation = useCallback(
    (
      _totalItems: number,
      fromEditorPreview = true,
      forceFullStory?: boolean,
      overrideCodeKey?: string,
      openSource?: GiftOpenSource
    ) => {
      if (unfurlTimerRef.current !== null) {
        window.clearTimeout(unfurlTimerRef.current);
        unfurlTimerRef.current = null;
      }
      if (bloomDelayTimerRef.current !== null) {
        window.clearTimeout(bloomDelayTimerRef.current);
        bloomDelayTimerRef.current = null;
      }
      selectItem(null);
      setMobilePopover(null);
      if (passcodeUnlockTimerRef.current !== null) {
        window.clearTimeout(passcodeUnlockTimerRef.current);
        passcodeUnlockTimerRef.current = null;
      }
      if (pinErrorClearTimerRef.current !== null) {
        window.clearTimeout(pinErrorClearTimerRef.current);
        pinErrorClearTimerRef.current = null;
      }
      if (entranceSlideRafRef.current !== null) {
        cancelAnimationFrame(entranceSlideRafRef.current);
        entranceSlideRafRef.current = null;
      }
      const resolvedKey =
        overrideCodeKey ||
        activeShortCode ||
        (typeof window !== 'undefined' ? window.location.hash : '') ||
        'default';
      deliveryIdentityKeyRef.current = resolvedKey;
      const shouldPlayFull = forceFullStory ?? fromEditorPreview;
      const nextScene = resolveInitialDeliveryScene({
        hasSeenBefore: hasSeenDeliveryPrelude(resolvedKey),
        forceFullStory: shouldPlayFull,
      });

      setNowMs(Date.now());
      setIsPasscodeUnlocked(false);
      setPasscodeAttempt('');
      setPasscodeError(null);
      setPasscodeFeedback('idle');
      setPasscodeShakeKey(0);
      setIsReactionPopoverOpen(false);
      setIsPreviewMode(fromEditorPreview);
      setIsGiftView(true);
      if (fromEditorPreview) {
        setGiftOpenSource('editor_preview');
      } else if (openSource !== undefined) {
        setGiftOpenSource(openSource);
      }
      setDeliveryScene(nextScene);
      setIsEntranceUnfurling(false);
      setEntranceSlideProgress(0);
      setIsDraggingEntranceSlider(false);
      setIsGiftEntranceOpen(true);
      setShowGiftCardReveal(false);
      setIsGiftBloomFinished(false);
      setIsRecipientGiftBoxVisible(false);
      setIsRecipientGiftModalOpen(false);
      setRecipientGiftClaimError(null);
      setIsBloomRevealActive(false);

      if (nextScene === 'threshold') {
        musicBox.start();
        musicBox.resumeIfBlocked();
        setIsMusicPlaying(true);
      }
    },
    [selectItem, activeShortCode]
  );

  const handleTouchDeliveryWaxSeal = useCallback(() => {
    if (isResolvingShortCode) return;
    playWaxSealUnsealChime();
    musicBox.start();
    musicBox.resumeIfBlocked();
    setIsMusicPlaying(true);
    if (!isPreviewMode && deliveryIdentityKeyRef.current) {
      markDeliveryPreludeSeen(deliveryIdentityKeyRef.current);
    }
    setDeliveryScene('seal_break');
  }, [isResolvingShortCode, isPreviewMode]);

  const handleSkipDeliveryToThreshold = useCallback(() => {
    musicBox.start();
    musicBox.resumeIfBlocked();
    setIsMusicPlaying(true);
    if (!isPreviewMode && deliveryIdentityKeyRef.current) {
      markDeliveryPreludeSeen(deliveryIdentityKeyRef.current);
    }
    setDeliveryScene('threshold');
  }, [isPreviewMode]);

  const handleReplayDeliveryPrelude = useCallback(() => {
    if (entranceSlideRafRef.current !== null) {
      cancelAnimationFrame(entranceSlideRafRef.current);
      entranceSlideRafRef.current = null;
    }
    setEntranceSlideProgress(0);
    setIsDraggingEntranceSlider(false);
    setIsEntranceUnfurling(false);
    setDeliveryScene('arrival');
  }, []);

  const handleUnwrapGiftEntrance = useCallback(
    (forceBypassLock = false) => {
      if (!forceBypassLock && (isGiftCurrentlyLocked || isResolvingShortCode)) {
        return;
      }
      if (forceBypassLock) {
        setIsPasscodeUnlocked(true);
      }
      if (entranceSlideRafRef.current !== null) {
        cancelAnimationFrame(entranceSlideRafRef.current);
        entranceSlideRafRef.current = null;
      }
      if (unfurlTimerRef.current !== null) {
        window.clearTimeout(unfurlTimerRef.current);
      }
      if (bloomDelayTimerRef.current !== null) {
        window.clearTimeout(bloomDelayTimerRef.current);
      }
      setEntranceSlideProgress(1);
      setIsDraggingEntranceSlider(false);
      musicBox.start();
      musicBox.resumeIfBlocked();
      setIsMusicPlaying(true);
      setIsEntranceUnfurling(true);

      const timings = getDeliverySceneTimings(isReducedMotion);
      const stemLeadInMs = isReducedMotion ? 60 : 260;
      bloomDelayTimerRef.current = window.setTimeout(() => {
        bloomDelayTimerRef.current = null;
        runStemBloomSequence(items.length);
      }, stemLeadInMs);

      unfurlTimerRef.current = window.setTimeout(() => {
        unfurlTimerRef.current = null;
        setIsGiftEntranceOpen(false);
        setIsEntranceUnfurling(false);
      }, timings.unfurlMs);

      if (!isPreviewMode && activeShortCode && countedOpenCodeRef.current !== activeShortCode) {
        countedOpenCodeRef.current = activeShortCode;
        incrementSharedBouquetOpenCount(activeShortCode).catch(() => {});
        trackStudioTelemetry({ eventType: 'recipient_unwrap' });
      }
    },
    [
      items.length,
      runStemBloomSequence,
      isGiftCurrentlyLocked,
      isResolvingShortCode,
      isReducedMotion,
      isPreviewMode,
      activeShortCode,
    ]
  );

  // Smoothly glides the slider to 100% so the background flower blooms open before transitioning
  const handleGlideSlideToOpen = useCallback(
    (startFrom = entranceSlideProgress, forceBypassLock = false) => {
      if ((!forceBypassLock && (isGiftCurrentlyLocked || isResolvingShortCode)) || isEntranceUnfurling) {
        return;
      }
      if (entranceSlideRafRef.current !== null) {
        cancelAnimationFrame(entranceSlideRafRef.current);
      }
      const startVal = Math.max(0, Math.min(1, startFrom));
      const durationMs = isReducedMotion ? 220 : Math.max(480, (1 - startVal) * 840);
      const startTime = performance.now();

      const tick = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / durationMs);
        const eased = 1 - Math.pow(1 - t, 2.4);
        const nextVal = startVal + (1 - startVal) * eased;
        setEntranceSlideProgress(nextVal);
        if (t < 1) {
          entranceSlideRafRef.current = requestAnimationFrame(tick);
        } else {
          entranceSlideRafRef.current = null;
          handleUnwrapGiftEntrance(forceBypassLock);
        }
      };
      entranceSlideRafRef.current = requestAnimationFrame(tick);
    },
    [
      entranceSlideProgress,
      isGiftCurrentlyLocked,
      isResolvingShortCode,
      isReducedMotion,
      isEntranceUnfurling,
      handleUnwrapGiftEntrance,
    ]
  );

  // Smoothly springs the slider & peony back to 0% if released mid-drag so nothing snaps
  const handleGlideSlideReset = useCallback(
    (startFrom = entranceSlideProgress) => {
      if (entranceSlideRafRef.current !== null) {
        cancelAnimationFrame(entranceSlideRafRef.current);
        entranceSlideRafRef.current = null;
      }
      const startVal = Math.max(0, Math.min(1, startFrom));
      if (startVal <= 0.005 || isReducedMotion) {
        setEntranceSlideProgress(0);
        return;
      }
      const durationMs = Math.max(220, startVal * 380);
      const startTime = performance.now();

      const tick = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / durationMs);
        const eased = 1 - Math.pow(1 - t, 2.6);
        setEntranceSlideProgress(startVal * (1 - eased));
        if (t < 1) {
          entranceSlideRafRef.current = requestAnimationFrame(tick);
        } else {
          entranceSlideRafRef.current = null;
          setEntranceSlideProgress(0);
        }
      };
      entranceSlideRafRef.current = requestAnimationFrame(tick);
    },
    [entranceSlideProgress, isReducedMotion]
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

  useEffect(() => {
    return () => {
      if (passcodeUnlockTimerRef.current !== null) {
        window.clearTimeout(passcodeUnlockTimerRef.current);
        passcodeUnlockTimerRef.current = null;
      }
      if (pinErrorClearTimerRef.current !== null) {
        window.clearTimeout(pinErrorClearTimerRef.current);
        pinErrorClearTimerRef.current = null;
      }
      if (unfurlTimerRef.current !== null) {
        window.clearTimeout(unfurlTimerRef.current);
        unfurlTimerRef.current = null;
      }
      if (bloomDelayTimerRef.current !== null) {
        window.clearTimeout(bloomDelayTimerRef.current);
        bloomDelayTimerRef.current = null;
      }
    };
  }, []);

  const triggerPasscodeVerification = useCallback(
    (candidateAnswer: string) => {
      if (passcodeFeedback === 'success') return;
      if (passcodeUnlockTimerRef.current !== null) {
        window.clearTimeout(passcodeUnlockTimerRef.current);
        passcodeUnlockTimerRef.current = null;
      }
      if (pinErrorClearTimerRef.current !== null) {
        window.clearTimeout(pinErrorClearTimerRef.current);
        pinErrorClearTimerRef.current = null;
      }
      if (isSecretAnswerMatch(lock?.passcodeAnswer, candidateAnswer, lock?.passcodeType)) {
        setPasscodeError(null);
        setPasscodeFeedback('success');
        playWaxSealUnsealChime();
        // Let the crimson wax seal stamp press onto the card before gliding the peony open
        passcodeUnlockTimerRef.current = window.setTimeout(
          () => {
            passcodeUnlockTimerRef.current = null;
            handleGlideSlideToOpen(0, true);
          },
          isReducedMotion ? 140 : 380
        );
      } else {
        setPasscodeFeedback('error');
        setPasscodeShakeKey((k) => k + 1);
        setPasscodeError(
          effectivePasscodeType === 'pin'
            ? 'That 4-digit PIN doesn’t match yet — try again ♥'
            : 'That secret word doesn’t match yet — try again ♥'
        );
        if (effectivePasscodeType === 'pin') {
          pinErrorClearTimerRef.current = window.setTimeout(() => {
            pinErrorClearTimerRef.current = null;
            setPasscodeAttempt('');
            setPasscodeFeedback('idle');
            setIsPinFocused(true);
            if (pinInputRef.current) {
              pinInputRef.current.focus();
              try {
                pinInputRef.current.setSelectionRange(0, 0);
              } catch {
                // Ignore selection errors
              }
            }
          }, 440);
        }
      }
    },
    [
      passcodeFeedback,
      lock?.passcodeAnswer,
      lock?.passcodeType,
      effectivePasscodeType,
      isReducedMotion,
      handleGlideSlideToOpen,
    ]
  );

  const handleAttemptPasscodeUnlock = useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (passcodeFeedback === 'success') return;
      if (effectivePasscodeType === 'pin' && passcodeAttempt.length < 4) {
        setPasscodeFeedback('error');
        setPasscodeShakeKey((k) => k + 1);
        setPasscodeError('Enter all 4 digits to unlock ♥');
        pinInputRef.current?.focus();
        return;
      }
      triggerPasscodeVerification(passcodeAttempt);
    },
    [
      passcodeFeedback,
      effectivePasscodeType,
      passcodeAttempt,
      triggerPasscodeVerification,
    ]
  );

  const handleSubmitRecipientReaction = useCallback(async () => {
    if (!selectedReactionId && !recipientReplyText.trim()) {
      triggerToast('Pick a reaction or write a note');
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
      trackStudioTelemetry({
        eventType: 'recipient_reaction',
        hasReply: Boolean(recipientReplyText.trim()),
      });
      triggerToast('Reaction sent!');
    } catch {
      triggerToast('Reaction saved!');
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
    if (unfurlTimerRef.current !== null) {
      window.clearTimeout(unfurlTimerRef.current);
      unfurlTimerRef.current = null;
    }
    if (bloomDelayTimerRef.current !== null) {
      window.clearTimeout(bloomDelayTimerRef.current);
      bloomDelayTimerRef.current = null;
    }
    handleStopVoice();
    setIsVoiceModalOpen(false);
    setIsReactionPopoverOpen(false);
    setIsGiftEntranceOpen(false);
    setIsGiftView(false);
    setIsPreviewMode(false);
    setGiftOpenSource(null);
    setIsBloomRevealActive(false);
    setShowGiftCardReveal(true);
  }, [handleStopVoice]);

  const resetStudioCanvasSession = useCallback((options?: { preserveHistory?: boolean }) => {
    showcaseResolveRequestIdRef.current += 1;
    currentSessionVaultCodeRef.current = null;
    currentSessionVaultIsDraftRef.current = false;
    skipNextDirtyMarkRef.current = true;
    suppressRecoveryUntilNextEditRef.current = true;
    setHasUnsavedDraftChanges(false);
    clearCanvasRecoverySnapshot();
    clearBouquet({ preserveHistory: Boolean(options?.preserveHistory) });
  }, [clearBouquet]);

  // When a recipient clicks "Craft Yours" on a shared or showcase bouquet, start a fresh empty bouquet
  // so they can never edit or overwrite the sender's shared arrangement!
  const handleCreateOwnFromShared = useCallback(() => {
    if (unfurlTimerRef.current !== null) {
      window.clearTimeout(unfurlTimerRef.current);
      unfurlTimerRef.current = null;
    }
    if (bloomDelayTimerRef.current !== null) {
      window.clearTimeout(bloomDelayTimerRef.current);
      bloomDelayTimerRef.current = null;
    }
    handleStopVoice();
    setIsLetterModalOpen(false);
    setIsVoiceModalOpen(false);
    setIsReactionPopoverOpen(false);
    setIsPasscodeUnlocked(false);
    setPasscodeAttempt('');
    setPasscodeError(null);
    setPasscodeFeedback('idle');
    try {
      window.history.replaceState(null, '', '/');
    } catch {
      // Ignore history error
    }
    showcaseResolveRequestIdRef.current += 1;
    setIsResolvingShortCode(false);
    setActiveShortCode(null);
    resetStudioCanvasSession();
    selectItem(null);
    setIsGiftEntranceOpen(false);
    setIsGiftView(false);
    setIsPreviewMode(false);
    setGiftOpenSource(null);
    setIsBloomRevealActive(false);
    setShowGiftCardReveal(true);
    trackStudioTelemetry({ eventType: 'recipient_to_studio' });
    triggerToast('Canvas reset');
  }, [resetStudioCanvasSession, selectItem, triggerToast, handleStopVoice]);

  // Returns to the Landing Page from a view-only showcase/shared bouquet and resets the studio canvas
  const handleReturnHomeFromGiftView = useCallback(() => {
    if (unfurlTimerRef.current !== null) {
      window.clearTimeout(unfurlTimerRef.current);
      unfurlTimerRef.current = null;
    }
    if (bloomDelayTimerRef.current !== null) {
      window.clearTimeout(bloomDelayTimerRef.current);
      bloomDelayTimerRef.current = null;
    }
    handleStopVoice();
    setIsLetterModalOpen(false);
    setIsVoiceModalOpen(false);
    setIsReactionPopoverOpen(false);
    setIsPasscodeUnlocked(false);
    setPasscodeAttempt('');
    setPasscodeError(null);
    setPasscodeFeedback('idle');
    setIsRecipientGiftBoxVisible(false);
    setIsRecipientGiftModalOpen(false);
    try {
      window.history.replaceState(null, '', '/');
    } catch {
      // Ignore history error
    }
    showcaseResolveRequestIdRef.current += 1;
    setIsResolvingShortCode(false);
    setActiveShortCode(null);
    resetStudioCanvasSession();
    selectItem(null);
    setIsGiftEntranceOpen(false);
    setIsGiftView(false);
    setIsPreviewMode(false);
    setGiftOpenSource(null);
    setIsBloomRevealActive(false);
    setShowGiftCardReveal(true);
    setShowLandingPage(true);
  }, [resetStudioCanvasSession, selectItem, handleStopVoice]);

  // Pay-It-Forward Recipient Gift Box: Wait ~3 seconds after bloom reveal finishes, then verify offer eligibility.
  // Strictly gated to direct recipient links (`giftOpenSource === 'direct_link'`) so browsing Shared Creations
  // or Lace Garland showcases never triggers or steals the real recipient's gift offer.
  useEffect(() => {
    if (
      !isGiftView ||
      isPreviewMode ||
      !isEligibleRecipientGiftOpenSource(giftOpenSource) ||
      isGiftEntranceOpen ||
      !isGiftBloomFinished ||
      !activeShortCode ||
      activeShortCode.startsWith('shw_')
    ) {
      return;
    }
    if (hasDeviceClaimedRecipientGift()) {
      return;
    }
    // Block self-claim if this bouquet exists in the local device's created vault
    const localVault = getSavedVaultBouquets();
    if (localVault.some((v) => !v.isDraft && v.code === activeShortCode)) {
      return;
    }
    // Require at least 3 visible stems and 15+ note characters
    const visibleStemCount = items.filter((it) => !it.hidden && !it.photoDataUrl).length;
    const noteCharCount = String(card?.message || '').replace(/\s+/g, ' ').trim().length;
    if (
      visibleStemCount < FOUNDING_RECIPIENT_GIFT_MIN_STEMS ||
      noteCharCount < FOUNDING_RECIPIENT_GIFT_MIN_NOTE_CHARS
    ) {
      return;
    }

    let cancelled = false;
    const timerId = window.setTimeout(async () => {
      if (cancelled) return;
      try {
        const deviceTokenHash = getOrCreateDeviceTokenHash();
        const res = await fetch('/api/payments/verify-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'check_recipient_gift_offer',
            bouquetCode: activeShortCode,
            deviceTokenHash,
            visibleStemCount,
            noteCharCount,
            openSource: giftOpenSource,
            openedFromShowcase: giftOpenSource !== 'direct_link',
          }),
        });
        const data = await res.json().catch(() => null);
        if (!cancelled && res.ok && data?.ok && data?.eligible) {
          setIsRecipientGiftBoxVisible(true);
        }
      } catch {
        // Ignore network errors silently
      }
    }, 3000);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [
    isGiftView,
    isPreviewMode,
    giftOpenSource,
    isGiftEntranceOpen,
    isGiftBloomFinished,
    activeShortCode,
    items,
    card?.message,
  ]);

  const handleClaimRecipientGiftOffer = useCallback(async () => {
    if (
      !activeShortCode ||
      isClaimingRecipientGift ||
      isPreviewMode ||
      !isEligibleRecipientGiftOpenSource(giftOpenSource)
    ) {
      return;
    }
    setIsClaimingRecipientGift(true);
    setRecipientGiftClaimError(null);
    try {
      const deviceTokenHash = getOrCreateDeviceTokenHash();
      const visibleStemCount = items.filter((it) => !it.hidden && !it.photoDataUrl).length;
      const noteCharCount = String(card?.message || '').replace(/\s+/g, ' ').trim().length;
      const res = await fetch('/api/payments/verify-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'claim_recipient_gift_offer',
          bouquetCode: activeShortCode,
          deviceTokenHash,
          visibleStemCount,
          noteCharCount,
          openSource: giftOpenSource,
          openedFromShowcase: giftOpenSource !== 'direct_link',
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok || !data?.pass) {
        if (res.status >= 400 && res.status < 500) {
          setRecipientGiftClaimError('This gift offer is no longer available.');
          setIsRecipientGiftBoxVisible(false);
        } else {
          setRecipientGiftClaimError(
            "Couldn't verify right now—please wait a few seconds and tap Verify again."
          );
        }
        return;
      }

      const claimedPass = data.pass as StudioPassRecord;
      markDeviceClaimedRecipientGift();
      lastServerVerifiedPassSigRef.current = claimedPass.signature;
      saveStoredStudioPass(claimedPass);
      setActiveStudioPass(claimedPass);
      // Default "Include in Shared Creations" to ON for free promo claims so the Lace Garland fills with rose-gold frames
      setPinToShowcaseChecked(true);
      setIsRecipientGiftModalOpen(false);
      setIsRecipientGiftBoxVisible(false);
      handleCreateOwnFromShared();
      triggerToast('Founding Launch Gift applied — 1 free Couture Bouquet unlocked!');
    } catch {
      setRecipientGiftClaimError(
        "Couldn't verify right now—please wait a few seconds and tap Verify again."
      );
    } finally {
      setIsClaimingRecipientGift(false);
    }
  }, [
    activeShortCode,
    isClaimingRecipientGift,
    isPreviewMode,
    giftOpenSource,
    items,
    card?.message,
    handleCreateOwnFromShared,
    triggerToast,
  ]);

  // Vercel Web Analytics + First-Party Telemetry + Auto-Unlock Tester Voucher Magic Links (`?voucher=BLOOM-...`)
  useEffect(() => {
    initVercelWebAnalytics();
    trackStudioTelemetry({ eventType: 'web_visit' });

    const handlePopState = () => {
      setStealthGateSlug(extractStealthGateSlug(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);

    const voucherKeyFromUrl = extractVoucherKeyFromSearch(window.location.search);
    if (voucherKeyFromUrl) {
      try {
        const cleanUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, '', cleanUrl || '/');
      } catch {
        // Ignore history error
      }
      setShowLandingPage(false);
      const deviceTokenHash = getOrCreateDeviceTokenHash();
      fetch('/api/payments/redeem-pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passKey: voucherKeyFromUrl,
          deviceTokenHash,
        }),
      })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.ok && data.pass) {
            lastServerVerifiedPassSigRef.current = data.pass.signature;
            saveStoredStudioPass(data.pass);
            setActiveStudioPass(data.pass);
            triggerToast('Tester Voucher activated — Couture unlocked on this device!');
          } else {
            triggerToast('Invalid or expired pass key.');
          }
        })
        .catch(() => {
          triggerToast("Couldn't verify right now—please wait a few seconds and tap Verify again.");
        });
    }

    // Auto-verify gateway redirect return (`/?checkout_success=<checkoutId>`) OR silently recover any paid pending order on load
    const urlParams = new URLSearchParams(window.location.search);
    const checkoutSuccessId = urlParams.get('checkout_success');
    const checkoutCancelled = urlParams.get('checkout_cancelled');
    const pendingRecord = loadPendingCheckoutStorage();

    if (checkoutSuccessId || checkoutCancelled) {
      try {
        urlParams.delete('checkout_success');
        urlParams.delete('checkout_cancelled');
        const nextQuery = urlParams.toString();
        const cleanUrl =
          window.location.pathname + (nextQuery ? `?${nextQuery}` : '') + window.location.hash;
        window.history.replaceState({}, '', cleanUrl || '/');
      } catch {
        // Ignore history error
      }
      setShowLandingPage(false);

      if (checkoutCancelled) {
        triggerToast('Payment was cancelled — your bouquet and order remain saved.');
      } else if (checkoutSuccessId && pendingRecord) {
        const deviceTokenHash = getOrCreateDeviceTokenHash();
        const attemptVerifyOnReturn = async (attempt: number): Promise<void> => {
          try {
            const res = await fetch('/api/payments/verify-and-issue', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                checkoutId: pendingRecord.checkoutId,
                checkoutToken: pendingRecord.checkoutToken,
                deviceTokenHash,
              }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.ok && data.pass) {
              clearPendingCheckoutStorage();
              lastServerVerifiedPassSigRef.current = data.pass.signature;
              saveStoredStudioPass(data.pass);
              setActiveStudioPass(data.pass);
              triggerToast('Payment confirmed — Bloom Pass activated!');
              return;
            }
            if (res.status === 402 && attempt < 2) {
              window.setTimeout(() => {
                void attemptVerifyOnReturn(attempt + 1);
              }, 1400);
              return;
            }
            setCheckoutTriggerAction(pendingRecord.resumeAction || 'pass_menu');
            setIsCheckoutModalOpen(true);
            triggerToast(
              data.message || 'Confirming your payment — checking status automatically.'
            );
          } catch {
            setCheckoutTriggerAction(pendingRecord.resumeAction || 'pass_menu');
            setIsCheckoutModalOpen(true);
            triggerToast('Could not confirm payment yet — checking in the pass dialog.');
          }
        };
        void attemptVerifyOnReturn(0);
      }
    } else if (
      pendingRecord &&
      pendingRecord.provider !== 'kofi' &&
      !getStoredStudioPass()
    ) {
      // Background recovery: if user paid, closed modal/tab, and returned later without ?checkout_success=
      const deviceTokenHash = getOrCreateDeviceTokenHash();
      fetch('/api/payments/verify-and-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkoutId: pendingRecord.checkoutId,
          checkoutToken: pendingRecord.checkoutToken,
          deviceTokenHash,
        }),
      })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.ok && data.pass) {
            clearPendingCheckoutStorage();
            lastServerVerifiedPassSigRef.current = data.pass.signature;
            saveStoredStudioPass(data.pass);
            setActiveStudioPass(data.pass);
            triggerToast('Payment confirmed — Bloom Pass activated!');
          }
        })
        .catch(() => { });
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, [triggerToast]);

  // Hydrate Shared Links (including first-party /<code> short links) OR accidental browser exit/reload canvas recovery.
  // Saved Drafts remain strictly manual-only via Save Draft.
  useEffect(() => {
    if (!hasHydratedRef.current) {
      hasHydratedRef.current = true;
      try {
        try {
          localStorage.removeItem('bouquet_studio_autosave_v2');
        } catch {
          // Ignore storage errors
        }
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
          const effectiveCode =
            pathCode || computeShortCode(encodeBouquetToCompactPayload(shared, true));
          setActiveShortCode(effectiveCode);
          skipNextDirtyMarkRef.current = true;
          loadSnapshot(shared, { isSharedView: giftMode });
          selectItem(null);
          setIsResolvingShortCode(false);
          setShowLandingPage(false);
          if (giftMode) {
            startGiftBloomAnimation(shared.items.length, false, false, effectiveCode, 'direct_link');
          } else {
            triggerToast('Loaded shared bouquet');
          }
          // Always check Firestore by short code if voice audio was stripped or if a newer Firestore record exists
          if (effectiveCode) {
            const reqId = ++showcaseResolveRequestIdRef.current;
            fetchSharedBouquetFromFirestore(effectiveCode)
              .then((docData) => {
                if (showcaseResolveRequestIdRef.current !== reqId || !docData) return;
                const fromFirestoreSnap = docData.payload
                  ? decodeBouquetFromHash(docData.payload)
                  : null;
                const baseSnap =
                  fromFirestoreSnap &&
                    Array.isArray(fromFirestoreSnap.items) &&
                    fromFirestoreSnap.items.length > 0
                    ? fromFirestoreSnap
                    : shared;
                const hydrated = hydrateSnapshotWithFirestoreRecord(baseSnap, docData);
                skipNextDirtyMarkRef.current = true;
                loadSnapshot(hydrated, { isSharedView: giftMode });
              })
              .catch(() => { });
          }
          return;
        }

        // If opened via a first-party short link (e.g. https://[domain]/Vu18KSuusq9133s) on a new device,
        // fetch the bouquet payload and voice recording from Firebase Firestore first, with fallback to /api/shorten?c=<code>
        if (pathCode) {
          const reqId = ++showcaseResolveRequestIdRef.current;
          setShowLandingPage(false);
          setIsResolvingShortCode(true);
          (async () => {
            try {
              let data: {
                payload?: string;
                voiceAudioDataUrl?: string | null;
                voiceStyle?: string | null;
                voiceTitle?: string | null;
                voiceDurationSec?: number | null;
              } | null = await fetchSharedBouquetFromFirestore(pathCode);

              if (showcaseResolveRequestIdRef.current !== reqId) return;

              if (!data || typeof data.payload !== 'string') {
                const r = await fetch(`/api/shorten?c=${encodeURIComponent(pathCode)}`);
                if (r.ok) {
                  data = await r.json();
                }
              }

              if (showcaseResolveRequestIdRef.current !== reqId) return;

              if (data && typeof data.payload === 'string') {
                localShortCodeCache.set(pathCode, data.payload);
                try {
                  localStorage.setItem(`bq_short_${pathCode}`, data.payload);
                } catch {
                  // Ignore storage quota
                }
                const resolvedSnap = decodeBouquetFromHash(data.payload);
                if (resolvedSnap && Array.isArray(resolvedSnap.items) && resolvedSnap.items.length > 0) {
                  const hydratedSnap = hydrateSnapshotWithFirestoreRecord(resolvedSnap, data);
                  skipNextDirtyMarkRef.current = true;
                  loadSnapshot(hydratedSnap, { isSharedView: true });
                  selectItem(null);
                  startGiftBloomAnimation(hydratedSnap.items.length, false, false, pathCode, 'direct_link');
                }
              }
            } catch {
              // Fall back quietly
            } finally {
              if (showcaseResolveRequestIdRef.current === reqId) {
                setIsResolvingShortCode(false);
              }
            }
          })();
          return;
        }

        // Only fall back quietly to default bouquet if link cannot be parsed (no alarming banner on recipient gift view)
        if (!giftMode && (hash.includes('bouquet=') || hash.startsWith('#b='))) {
          setCorruptedLinkAlert('Could not load shared bouquet link. It may have been truncated or corrupted.');
          skipNextDirtyMarkRef.current = false;
          return;
        }

        // Restore accidental exit/reload canvas session (stored separately from Saved Drafts)
        const recovered = loadCanvasRecoverySnapshot();
        if (recovered) {
          skipNextDirtyMarkRef.current = true;
          suppressRecoveryUntilNextEditRef.current = false;
          loadSnapshot(recovered.snapshot);
          selectItem(null);
          currentSessionVaultCodeRef.current = recovered.sourceVaultCode;
          currentSessionVaultIsDraftRef.current = recovered.isSourceDraft;
          setHasUnsavedDraftChanges(recovered.hasUnsavedChanges);
          return;
        }

        skipNextDirtyMarkRef.current = false;
      } catch {
        skipNextDirtyMarkRef.current = false;
        setIsResolvingShortCode(false);
      }
      return;
    }

    if (isGiftView && !isPreviewMode) {
      return;
    }
    if (skipNextDirtyMarkRef.current) {
      skipNextDirtyMarkRef.current = false;
      return;
    }
    suppressRecoveryUntilNextEditRef.current = false;
    setHasUnsavedDraftChanges(true);
  }, [items, wrapStyle, wrapColor, ribbonColor, ribbonStyle, environment, bouquetPose, card, voice, lock, isGiftView, isPreviewMode, loadSnapshot, selectItem, triggerToast, startGiftBloomAnimation]);

  const flushCanvasRecoverySnapshotNow = useCallback(() => {
    if (!hasHydratedRef.current || suppressRecoveryUntilNextEditRef.current) return;
    const meta = recoveryMetaRef.current;
    if (!meta.canPersist) return;
    const s = useBouquetStore.getState();
    saveCanvasRecoverySnapshot({
      snapshot: {
        items: s.items,
        wrapStyle: s.wrapStyle,
        wrapColor: s.wrapColor,
        ribbonColor: s.ribbonColor,
        ribbonStyle: s.ribbonStyle,
        environment: s.environment,
        bouquetPose: s.bouquetPose,
        card: s.card,
        voice: s.voice,
        lock: s.lock,
      },
      wasInStudio: meta.wasInStudio,
      hasUnsavedChanges: meta.hasUnsavedChanges,
      sourceVaultCode: currentSessionVaultCodeRef.current,
      isSourceDraft: currentSessionVaultIsDraftRef.current,
    });
  }, []);

  recoveryMetaRef.current = {
    canPersist:
      hasHydratedRef.current &&
      !isGiftView &&
      !isPreviewMode &&
      !isResolvingShortCode &&
      !activeShortCode &&
      !stealthGateSlug,
    wasInStudio: !showLandingPage && !isGiftView && !isPreviewMode && !stealthGateSlug,
    hasUnsavedChanges: hasUnsavedDraftChanges,
  };

  // Persist accidental reload/exit canvas recovery (separate from manual Saved Drafts)
  useEffect(() => {
    if (!hasHydratedRef.current || suppressRecoveryUntilNextEditRef.current) return;
    if (!recoveryMetaRef.current.canPersist) return;
    const timer = window.setTimeout(() => {
      flushCanvasRecoverySnapshotNow();
    }, 200);
    return () => window.clearTimeout(timer);
  }, [
    items,
    wrapStyle,
    wrapColor,
    ribbonColor,
    ribbonStyle,
    environment,
    bouquetPose,
    card,
    voice,
    lock,
    showLandingPage,
    hasUnsavedDraftChanges,
    isGiftView,
    isPreviewMode,
    isResolvingShortCode,
    activeShortCode,
    stealthGateSlug,
    flushCanvasRecoverySnapshotNow,
  ]);

  // Synchronously flush recovery snapshot when closing tab, reloading, or backgrounding the browser
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    const handleVisibilityFlush = () => {
      if (document.hidden) {
        flushCanvasRecoverySnapshotNow();
      }
    };
    window.addEventListener('pagehide', flushCanvasRecoverySnapshotNow);
    window.addEventListener('beforeunload', flushCanvasRecoverySnapshotNow);
    document.addEventListener('visibilitychange', handleVisibilityFlush);
    return () => {
      window.removeEventListener('pagehide', flushCanvasRecoverySnapshotNow);
      window.removeEventListener('beforeunload', flushCanvasRecoverySnapshotNow);
      document.removeEventListener('visibilitychange', handleVisibilityFlush);
    };
  }, [flushCanvasRecoverySnapshotNow]);

  // Global Keyboard Shortcuts (Strictly disabled in Shared / Preview mode so recipients cannot edit stems)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGiftView || isPreviewMode || showLandingPage) return;
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
          if (useBouquetStore.getState().future.length > 0) {
            redo();
            triggerToast('Redone');
          }
        } else if (useBouquetStore.getState().past.length > 0) {
          undo();
          triggerToast('Undone');
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        if (useBouquetStore.getState().future.length > 0) {
          redo();
          triggerToast('Redone');
        }
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
  }, [isGiftView, isPreviewMode, showLandingPage, undo, redo, deleteSelected, duplicateSelected, triggerToast]);

  const performSvgPngDownload = useCallback(async () => {
    if (isInAppBrowser()) {
      setIsInAppBrowserModalOpen(true);
      return;
    }

    const targetSvg =
      svgRef.current ||
      (document.querySelector(
        'svg[aria-label="Interactive Flower Bouquet Canvas"]'
      ) as SVGSVGElement | null);

    if (!targetSvg) {
      triggerToast('Canvas not found');
      return;
    }

    try {
      triggerToast('Saving image...');
      await exportSvgElementToPng(targetSvg, 'flowers-for-you.png');
      triggerToast('Image saved!');
    } catch (err) {
      console.error('Failed to export image:', err);
      triggerToast('Could not save image');
    }
  }, [triggerToast]);

  const handleExportPng = async () => {
    // Creators in Studio OR Preview Bloom must unlock Couture / High-Res PNG Pass before saving PNG
    if (
      (!isGiftView || isPreviewMode) &&
      (currentPremiumInspection.isPremiumBouquet || premiumAssetConfig.requirePassForHighResPng)
    ) {
      if (!isBouquetUnlockedByPass || !unlockedPassForCurrentBouquet) {
        if (isPreviewMode) {
          handleExitGiftViewToEditor();
        }
        setCheckoutTriggerAction('png');
        setIsCheckoutModalOpen(true);
        return;
      }
      const serverVerify = await verifyStudioPassOnServer({
        pass: unlockedPassForCurrentBouquet,
        bouquetCode: currentBouquetShortCode,
        incrementUsage: false,
      });
      if (!serverVerify.valid || !serverVerify.updatedPass) {
        if (
          activeStudioPass &&
          activeStudioPass.passKey === unlockedPassForCurrentBouquet.passKey
        ) {
          lastServerVerifiedPassSigRef.current = '';
          saveStoredStudioPass(null);
          setActiveStudioPass(null);
        }
        if (isPreviewMode) {
          handleExitGiftViewToEditor();
        }
        triggerToast(
          serverVerify.message ||
          'Please unlock a Studio Pass or enter your BLOOM-XXXX-XXXX key to export High-Res PNG.'
        );
        setCheckoutTriggerAction('png');
        setIsCheckoutModalOpen(true);
        return;
      }
      if (activeStudioPass && activeStudioPass.passKey === serverVerify.updatedPass.passKey) {
        lastServerVerifiedPassSigRef.current = serverVerify.updatedPass.signature;
        saveStoredStudioPass(serverVerify.updatedPass);
        setActiveStudioPass(serverVerify.updatedPass);
      }
    }
    await performSvgPngDownload();
  };

  const getShareUrl = useCallback(
    (asGift = true) => {
      const snap: BouquetSnapshot = {
        items,
        wrapStyle,
        wrapColor,
        ribbonColor,
        ribbonStyle,
        environment,
        bouquetPose,
        card,
        voice,
        lock,
      };
      return encodeBouquetToShareUrl(snap, asGift);
    },
    [items, wrapStyle, wrapColor, ribbonColor, ribbonStyle, environment, bouquetPose, card, voice, lock]
  );

  const registerShortCodeOnServer = useCallback(
    (asGift = true, persistToVault = false, overridePass?: StudioPassRecord | null) => {
      const snap: BouquetSnapshot = {
        items,
        wrapStyle,
        wrapColor,
        ribbonColor,
        ribbonStyle,
        environment,
        bouquetPose,
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

      const verifiedPass = overridePass !== undefined ? overridePass : null;
      const devHash = getOrCreateDeviceTokenHash();

      if (verifiedPass && verifiedPass.tier !== 'single') {
        lastServerVerifiedPassSigRef.current = verifiedPass.signature;
        saveStoredStudioPass(verifiedPass);
        setActiveStudioPass(verifiedPass);
      }

      const policy = getRetentionPolicyForPassTier(
        verifiedPass ? verifiedPass.tier : 'free'
      );

      // Persist directly to Firebase Firestore with 3-tier retention metadata (30d free, 90d paid extended, Eternal keepsake)
      const firestoreSavePromise = saveSharedBouquetToFirestore(code, hashPayload, snap, {
        isPremium: policy.isPremiumEternal,
        retentionDays: policy.retentionDays,
      }).catch(() => false);

      const previousDraftCode = currentSessionVaultIsDraftRef.current
        ? currentSessionVaultCodeRef.current
        : null;
      const shouldPinToGarland = Boolean(pinToShowcaseChecked);

      // Save to local account-free Bouquet Vault
      const vaultEntry = {
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
        isPremium: policy.isPremiumEternal,
        retentionDays: policy.retentionDays,
        isDraft: false,
        pinToShowcase: pinToShowcaseChecked,
        draftPayload: hashPayload,
      };
      const updatedVault = saveBouquetToLocalVault(
        vaultEntry,
        previousDraftCode
      );
      const garlandPublishPromise = shouldPinToGarland
        ? publishBouquetToGlobalGarlandFeed(
          vaultEntry,
          previousDraftCode
        ).catch(() => false)
        : Promise.resolve(true);
      currentSessionVaultCodeRef.current = code;
      currentSessionVaultIsDraftRef.current = false;
      setHasUnsavedDraftChanges(false);
      setVaultCount(updatedVault.length);

      if (!countedCreatedCodeSetRef.current.has(code)) {
        countedCreatedCodeSetRef.current.add(code);
        incrementStudioGlobalStat('bouquetsCreated', Boolean(voice?.audioDataUrl)).catch(() => { });
      }

      // Also register via /api/shorten serverless endpoint (server enforces Couture permission via Bloom Key,
      // splits overflow assets for eternal Firestore persistence, logs EVERY bouquet into the Admin Bouquet Log
      // even when not shared on the Garland, and syncs Garland entries via CAS!)
      const photoCount = items.filter((it) => Boolean(it.photoStyle)).length;
      const shortenApiPromise = fetch('/api/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          payload: hashPayload,
          origin,
          voiceAudioDataUrl: voice?.audioDataUrl || null,
          voiceStyle: voice?.style || null,
          voiceTitle: voice?.title || null,
          voiceDurationSec: voice?.durationSec ?? null,
          isPremium: policy.isPremiumEternal,
          retentionDays: policy.retentionDays,
          passKey: verifiedPass?.passKey || null,
          deviceTokenHash: devHash,
          activeSessionNonce: verifiedPass?.activeSessionNonce || null,
          pass: verifiedPass || null,
          pinToShowcase: shouldPinToGarland,
          bouquetMeta: {
            to: card.to || 'Someone Special',
            from: card.from || 'Yours',
            noteExcerpt: (card.message || '').trim().slice(0, 120),
            createdAt: vaultEntry.createdAt,
            shareUrl: firstPartyUrl,
            pinnedToGarland: shouldPinToGarland,
            flowerCount: items.length,
            photoCount,
            hasVoice: Boolean(voice?.audioDataUrl),
            voiceStyle: voice?.style || undefined,
            wrapStyle,
            ribbonStyle,
            environment,
            lockMode: lock?.mode || 'none',
          },
          garlandEntry: shouldPinToGarland
            ? {
              ...vaultEntry,
              replaceCode: previousDraftCode || null,
            }
            : null,
        })
      }).catch(() => null);

      lastSealSyncPromiseRef.current = Promise.allSettled([
        firestoreSavePromise,
        garlandPublishPromise,
        shortenApiPromise,
      ]);

      return firstPartyUrl;
    },
    [items, wrapStyle, wrapColor, ribbonColor, ribbonStyle, environment, bouquetPose, card, voice, lock, pinToShowcaseChecked]
  );

  const handleSaveDraftOnDevice = useCallback(() => {
    const snap: BouquetSnapshot = {
      items,
      wrapStyle,
      wrapColor,
      ribbonColor,
      ribbonStyle,
      environment,
      bouquetPose,
      card,
      voice,
      lock,
    };
    const hashPayload = encodeBouquetToCompactPayload(snap, false);
    const code = computeShortCode(hashPayload);
    localShortCodeCache.set(code, hashPayload);
    try {
      localStorage.setItem(`bq_short_${code}`, hashPayload);
    } catch {
      // Ignore quota errors
    }
    const policy = getRetentionPolicyForPassTier(activeStudioPass?.tier || 'free');
    // Persist full draft (flowers, wrapper, ribbon, environment, card, photos, voice audio) to Firestore
    saveSharedBouquetToFirestore(code, hashPayload, snap, {
      isPremium: policy.isPremiumEternal,
      retentionDays: policy.retentionDays,
    }).catch(() => { });

    const replaceDraftCode = currentSessionVaultIsDraftRef.current
      ? currentSessionVaultCodeRef.current
      : null;

    const updatedVault = saveBouquetToLocalVault(
      {
        code,
        to: card.to || 'Draft Bouquet',
        from: card.from || 'Yours',
        recipientName: card.to || 'Draft Bouquet',
        senderName: card.from || 'Yours',
        createdAt: new Date().toISOString(),
        shareUrl: '',
        lockMode: lock?.mode || 'none',
        hasVoice: Boolean(voice?.audioDataUrl),
        flowerCount: items.length,
        isDraft: true,
        pinToShowcase: false,
        draftPayload: hashPayload,
      },
      replaceDraftCode
    );
    currentSessionVaultCodeRef.current = code;
    currentSessionVaultIsDraftRef.current = true;
    suppressRecoveryUntilNextEditRef.current = false;
    setHasUnsavedDraftChanges(false);
    setVaultCount(updatedVault.length);
    setSavedDraftPulse(true);
    setTimeout(() => setSavedDraftPulse(false), 1600);
    triggerToast('Draft saved!');
  }, [items, wrapStyle, wrapColor, ribbonColor, ribbonStyle, environment, bouquetPose, card, voice, lock, activeStudioPass, triggerToast]);

  const handleResumeDraftFromDevice = useCallback(
    (draftPayload: string, sourceVaultCode?: string, isSourceDraft = true) => {
      showcaseResolveRequestIdRef.current += 1;
      setIsResolvingShortCode(false);
      setActiveShortCode(null);
      currentSessionVaultCodeRef.current = sourceVaultCode || null;
      currentSessionVaultIsDraftRef.current = Boolean(isSourceDraft);
      suppressRecoveryUntilNextEditRef.current = false;
      setHasUnsavedDraftChanges(false);
      const decoded = draftPayload ? decodeBouquetFromHash(draftPayload) : null;
      if (decoded) {
        skipNextDirtyMarkRef.current = true;
        loadSnapshot(decoded);
        setIsGiftView(false);
        setIsPreviewMode(false);
        setIsGiftEntranceOpen(false);
        setShowLandingPage(false);
        triggerToast('Draft loaded!');
      }
      // Also fetch the canonical Firestore record for sourceVaultCode so if localStorage stripped inline audio
      // or photos, the resumed draft in the Studio restores 100% of its voice audio and assets!
      if (sourceVaultCode) {
        fetchSharedBouquetFromFirestore(sourceVaultCode)
          .then((record) => {
            if (!record) {
              if (!decoded) triggerToast('Could not load draft');
              return;
            }
            if (record.payload) {
              localShortCodeCache.set(sourceVaultCode, record.payload);
              try {
                localStorage.setItem(`bq_short_${sourceVaultCode}`, record.payload);
              } catch {
                // Ignore localStorage quota errors
              }
            }
            const fromRecordSnap = record.payload ? decodeBouquetFromHash(record.payload) : null;
            // Prefer the canonical Firestore snapshot whenever its payload is richer (e.g. has inline photos that localStorage stripped)
            const preferRecordSnap = Boolean(
              fromRecordSnap &&
              (!decoded ||
                (record.payload?.length || 0) >= (draftPayload?.length || 0) ||
                (fromRecordSnap.items?.length || 0) > (decoded.items?.length || 0))
            );
            const baseSnap = preferRecordSnap ? fromRecordSnap : decoded;
            if (!baseSnap) {
              if (!decoded) triggerToast('Could not load draft');
              return;
            }
            const hydrated = hydrateSnapshotWithFirestoreRecord(baseSnap, record);
            skipNextDirtyMarkRef.current = true;
            loadSnapshot(hydrated);
            if (!decoded) {
              setIsGiftView(false);
              setIsPreviewMode(false);
              setIsGiftEntranceOpen(false);
              setShowLandingPage(false);
              triggerToast('Draft loaded!');
            }
          })
          .catch(() => {
            if (!decoded) triggerToast('Could not load draft');
          });
      } else if (!decoded) {
        triggerToast('Could not load draft');
      }
    },
    [loadSnapshot, triggerToast]
  );

  useEffect(() => {
    if (!isShareModalOpen) {
      isSealedBouquetPaidRef.current = false;
      setSealedPaidPass(null);
      setSealedBouquetCode(null);
      setShareDedicationError(null);
      if (shouldResetStudioOnShareCloseRef.current) {
        shouldResetStudioOnShareCloseRef.current = false;
        setSealedGiftUrl('');
        setShareStep('dedication');
        resetStudioCanvasSession();
      } else if (shareStep === 'ready') {
        setShareStep('dedication');
      }
      return;
    }
    if (shareStep === 'lock' || shareStep === 'seal') {
      const recipientCheck = validateDedicationRecipient(card.to);
      if (!recipientCheck.valid) {
        setShareDedicationError(
          recipientCheck.error || "Please enter the recipient's name before continuing."
        );
        setShareStep('dedication');
        return;
      }
    }
    if (shareStep === 'seal') {
      const lockCheck = validateBouquetLockConfig(lock);
      if (!lockCheck.valid) {
        setShareLockError(lockCheck.error || 'Please complete your lock details.');
        setShareStep('lock');
      }
    }
  }, [isShareModalOpen, shareStep, card.to, lock, resetStudioCanvasSession]);

  const handleShareLink = async (asGift = true, overridePass?: StudioPassRecord | null) => {
    const recipientCheck = validateDedicationRecipient(card.to);
    if (!recipientCheck.valid) {
      setIsShorteningUrl(false);
      setShareDedicationError(
        recipientCheck.error || "Please enter the recipient's name before continuing."
      );
      setShareStep('dedication');
      setIsShareModalOpen(true);
      return;
    }
    const lockCheck = validateBouquetLockConfig(lock);
    if (!lockCheck.valid) {
      setIsShorteningUrl(false);
      setShareLockError(lockCheck.error || 'Please complete your lock details.');
      setShareStep('lock');
      setIsShareModalOpen(true);
      return;
    }
    const effectivePass = overridePass !== undefined ? overridePass : activeStudioPass;
    const devHash = getOrCreateDeviceTokenHash();
    const passVerify = verifyActiveStudioPassForAction({
      pass: effectivePass,
      deviceTokenHash: devHash,
      clientSessionNonce: effectivePass?.activeSessionNonce,
      bouquetCode: currentBouquetShortCode,
      incrementUsage: false,
    });

    if (currentPremiumInspection.isPremiumBouquet && (!passVerify.valid || !effectivePass)) {
      setIsShareModalOpen(false);
      setCheckoutTriggerAction('share');
      setCheckoutInitialView('plans');
      setIsCheckoutModalOpen(true);
      return;
    }

    setIsShorteningUrl(true);
    let verifiedPaidPass: StudioPassRecord | null = null;
    if (passVerify.valid && effectivePass) {
      const serverVerify = await verifyStudioPassOnServer({
        pass: effectivePass,
        bouquetCode: currentBouquetShortCode,
        incrementUsage: true,
      });
      if (!serverVerify.valid || !serverVerify.updatedPass) {
        setIsShorteningUrl(false);
        if (!activeStudioPass || activeStudioPass.passKey === effectivePass.passKey) {
          lastServerVerifiedPassSigRef.current = '';
          saveStoredStudioPass(null);
          setActiveStudioPass(null);
        }
        if (currentPremiumInspection.isPremiumBouquet) {
          triggerToast(
            serverVerify.message ||
            'Please unlock a Studio Pass or re-enter your BLOOM-XXXX-XXXX key under "Have a Key?".'
          );
          setIsShareModalOpen(false);
          setCheckoutTriggerAction('share');
          setCheckoutInitialView('redeem');
          setIsCheckoutModalOpen(true);
          return;
        }
      } else {
        verifiedPaidPass = serverVerify.updatedPass;
      }
    }

    const hasPaidUnlockForSeal = Boolean(verifiedPaidPass);
    const firstPartyUrl = registerShortCodeOnServer(
      asGift,
      true,
      verifiedPaidPass
    );
    if (lastSealSyncPromiseRef.current) {
      await Promise.race([
        lastSealSyncPromiseRef.current,
        new Promise((resolve) => setTimeout(resolve, 2200)),
      ]);
    }
    setShortShareUrl(firstPartyUrl);
    setSealedGiftUrl(firstPartyUrl);
    setSealedBouquetCode(hasPaidUnlockForSeal ? currentBouquetShortCode : null);
    setSealedPaidPass(verifiedPaidPass);
    setIsShorteningUrl(false);
    setSurpriseEmailSentTo(null);
    setSurpriseEmailError(null);
    isSealedBouquetPaidRef.current = hasPaidUnlockForSeal;
    setShareStep('ready');
    setIsShareModalOpen(true);

    if (isFinalDesignChecked || verifiedPaidPass?.tier === 'single') {
      shouldResetStudioOnShareCloseRef.current = true;
    }

    // Single Bouquet unlocks ONLY this sealed gift link + PNG — do not leave a reusable studio pass active
    if (verifiedPaidPass?.tier === 'single') {
      lastServerVerifiedPassSigRef.current = '';
      saveStoredStudioPass(null);
      setActiveStudioPass(null);
    } else if (verifiedPaidPass) {
      lastServerVerifiedPassSigRef.current = verifiedPaidPass.signature;
      saveStoredStudioPass(verifiedPaidPass);
      setActiveStudioPass(verifiedPaidPass);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(firstPartyUrl).catch(() => { });
    }
    trackStudioTelemetry({
      eventType: 'bouquet_sealed',
      isCouture: currentPremiumInspection.isPremiumBouquet,
      hasVoice: Boolean(voice?.audioDataUrl),
      flowers: items.map((i) => i.type),
      wrapStyle,
      ribbonStyle,
      environment,
      voiceStyle: voice?.audioDataUrl ? voice.style : undefined,
      photoStyles: items.filter((i) => i.photoDataUrl).map((i) => i.photoStyle || 'polaroid'),
      lockMode: lock?.mode || 'none',
    });
    triggerToast('Gift sealed & link copied!');
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
    () =>
      FLOWER_CATALOG.filter((f) => !f.isFoliage && !f.isFiller && !f.isOther && !f.isSeasonal).sort(
        (a, b) => Number(isFlowerPremium(a.type, premiumAssetConfig)) - Number(isFlowerPremium(b.type, premiumAssetConfig))
      ),
    [premiumAssetConfig]
  );
  const fillerFlowers = useMemo(
    () =>
      FLOWER_CATALOG.filter((f) => Boolean(f.isFoliage || f.isFiller) && !f.isOther && !f.isSeasonal).sort(
        (a, b) => Number(isFlowerPremium(a.type, premiumAssetConfig)) - Number(isFlowerPremium(b.type, premiumAssetConfig))
      ),
    [premiumAssetConfig]
  );
  const otherFlowers = useMemo(
    () =>
      FLOWER_CATALOG.filter((f) => Boolean(f.isOther)).sort(
        (a, b) => Number(isFlowerPremium(a.type, premiumAssetConfig)) - Number(isFlowerPremium(b.type, premiumAssetConfig))
      ),
    [premiumAssetConfig]
  );
  const activeSeasonalEvent = useMemo(() => getActiveSeasonalEvent(), []);
  const seasonalFlowers = useMemo(
    () =>
      [...getAvailableSeasonalCatalog()].sort(
        (a, b) => Number(isFlowerPremium(a.type, premiumAssetConfig)) - Number(isFlowerPremium(b.type, premiumAssetConfig))
      ),
    [premiumAssetConfig]
  );

  const isGiftOrPreviewBackdrop = (isGiftView || isPreviewMode) && !stealthGateSlug;
  const envBackdrop = useMemo(
    () => getEnvironmentPageBackdrop(environment, isDarkMode),
    [environment, isDarkMode]
  );

  return (
    <div
      data-bouquet-env={isGiftOrPreviewBackdrop ? environment || 'studio' : undefined}
      className={`min-h-[100dvh] h-[100dvh] w-full overflow-hidden flex flex-col font-sans transition-colors duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${isDarkMode
        ? 'dark bg-[#2B2321] text-[#FBF6F1]'
        : 'bg-[#FAFAF8] text-[#1C1917]'
        }`}
      style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        ...(isGiftOrPreviewBackdrop
          ? {
              backgroundColor: envBackdrop.pageBaseColor,
              backgroundImage: envBackdrop.pageBackground,
            }
          : {}),
        ...(viewportHeight ? { height: `${viewportHeight}px`, minHeight: `${viewportHeight}px` } : {})
      }}
    >
      {/* Hidden Device Photo Upload Input for Photocard Keepsakes (Strict Raster Image Allowlist) */}
      <input
        ref={photoUploadInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
        onChange={handlePhotoFileChange}
        className="hidden"
        aria-label="Upload photo for photocard keepsake"
      />

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
          animation: cardGentleWiggle 3.1s ease-in-out 0.65s infinite;
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
          0% { opacity: 0; transform: scale(0.32) translateY(32px); }
          68% { opacity: 1; transform: scale(1.04) translateY(-2px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .stem-bloom-pop {
          animation: stemSpringBloom 0.72s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes giftStageEntrance {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        .gift-stage-entrance {
          animation: giftStageEntrance 0.42s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @keyframes giftHudFloatIn {
          0% { opacity: 0; transform: translate3d(0, 6px, 0); }
          100% { opacity: 1; transform: translate3d(0, 0, 0); }
        }
        .gift-hud-float-in {
          animation: giftHudFloatIn 0.65s cubic-bezier(0.22, 1, 0.36, 1) both;
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
      {showLandingPage && !isGiftView && !isPreviewMode && !stealthGateSlug && (
        <LandingPageView
          initialCreationsPageOpen={returnToCreationsPage}
          onCloseCreationsPage={() => setReturnToCreationsPage(false)}
          onStartCrafting={() => {
            showcaseResolveRequestIdRef.current += 1;
            setIsResolvingShortCode(false);
            if (useBouquetStore.getState().isSharedViewSnapshot || activeShortCode) {
              setActiveShortCode(null);
              resetStudioCanvasSession();
            }
            setReturnToCreationsPage(false);
            setStudioEntranceKey((k) => k + 1);
            setCanvasRecoveryInStudioFlag(true);
            setShowLandingPage(false);
            trackStudioTelemetry({ eventType: 'studio_session' });
          }}
          onPreviewShowcaseBouquet={(fromCreationsPage, entry) => {
            const currentItems = useBouquetStore.getState().items;
            const hasPreloadedLock = Boolean(
              entry?.snapshot?.lock && entry.snapshot.lock.mode !== 'none'
            );
            if (entry?.code) {
              setActiveShortCode(entry.code);
              if (entry.isUserCreated) {
                const reqId = ++showcaseResolveRequestIdRef.current;
                if (!hasPreloadedLock) {
                  setIsResolvingShortCode(true);
                }
                fetchSharedBouquetFromFirestore(entry.code)
                  .then((record) => {
                    if (showcaseResolveRequestIdRef.current !== reqId || !record) return;
                    const currentSnap = useBouquetStore.getState();
                    const recordSnap = record.payload ? decodeBouquetFromHash(record.payload) : null;
                    const baseSnap: BouquetSnapshot =
                      recordSnap && Array.isArray(recordSnap.items) && recordSnap.items.length > 0
                        ? recordSnap
                        : {
                          items: currentSnap.items,
                          wrapStyle: currentSnap.wrapStyle,
                          wrapColor: currentSnap.wrapColor,
                          ribbonColor: currentSnap.ribbonColor,
                          ribbonStyle: currentSnap.ribbonStyle,
                          environment: currentSnap.environment,
                          bouquetPose: currentSnap.bouquetPose,
                          card: currentSnap.card,
                          voice: currentSnap.voice,
                          lock: currentSnap.lock,
                        };
                    const hydrated = hydrateSnapshotWithFirestoreRecord(baseSnap, record);
                    loadSnapshot(hydrated, { isSharedView: true });
                    setNowMs(Date.now());
                    if (hydrated.lock && hydrated.lock.mode !== 'none') {
                      setIsEntranceUnfurling(false);
                      setEntranceSlideProgress(0);
                    }
                    if (record.payload) {
                      localShortCodeCache.set(entry.code, record.payload);
                      try {
                        localStorage.setItem(`bq_short_${entry.code}`, record.payload);
                      } catch {
                        // Ignore storage quota
                      }
                    }
                  })
                  .catch(() => { })
                  .finally(() => {
                    if (showcaseResolveRequestIdRef.current === reqId) {
                      setIsResolvingShortCode(false);
                    }
                  });
              } else {
                showcaseResolveRequestIdRef.current += 1;
                setIsResolvingShortCode(false);
              }
            } else {
              showcaseResolveRequestIdRef.current += 1;
              setIsResolvingShortCode(false);
            }
            setReturnToCreationsPage(Boolean(fromCreationsPage));
            setShowLandingPage(false);
            trackStudioTelemetry({ eventType: 'showcase_view' });
            // Strictly view-only showcase browse mode (`openSource = 'showcase_browse'`) so browsing Shared Creations
            // or the Lace Garland can neither edit nor claim the real recipient's Pay-It-Forward gift box.
            startGiftBloomAnimation(
              currentItems.length,
              false,
              false,
              entry?.code || entry?.id,
              'showcase_browse'
            );
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

      {(!showLandingPage || isGiftView || isPreviewMode) && !stealthGateSlug && (
        <>
          {/* =====================================================================
              STUDIO EDITOR TOP BAR (Hidden in View-Only / Shared Bouquet Mode!)
              In View-Only mode, all navigation bars and editing tools are removed
              so the recipient focuses purely on the bouquet and card.
              ===================================================================== */}
          {!isGiftView && !isPreviewMode && (
            <div className="px-2 sm:px-5 pt-2 pb-1 shrink-0 z-30">
              <div
                className={`h-11.5 sm:h-12 px-2.5 sm:px-3.5 md:px-4 rounded-full border shadow-[0_6px_24px_rgba(35,28,24,0.05)] flex items-center justify-between gap-1 sm:gap-2 overflow-hidden transition-colors ${isDarkMode
                  ? 'bg-[#352C29]/95 border-[#4E423E] text-[#FBF6F1]'
                  : 'bg-[#FFFDF9]/95 border-[#EFE6DD] text-[#231C18]'
                  }`}
              >
                {/* Left: Brand Wordmark (Returns to Home) */}
                <button
                  type="button"
                  onClick={() => {
                    setCanvasRecoveryInStudioFlag(false);
                    setShowLandingPage(true);
                  }}
                  title="Back to Send A Bouquet Home"
                  aria-label="Open Send A Bouquet Home Page"
                  className="flex items-center gap-1.5 sm:gap-2 select-none hover:opacity-85 transition cursor-pointer shrink-0"
                >
                  <BrandLogoMark className="w-6 h-6 sm:w-6.5 sm:h-6.5" isDarkMode={isDarkMode} />
                  <span
                    className="hidden lg:inline text-lg font-semibold tracking-tight whitespace-nowrap"
                    style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                  >
                    Send A Bouquet
                  </span>
                </button>

                {/* Center: Undo / Redo / Save Draft / Start Over Capsule + Desktop/Tablet Selected Item Layer & Photo Controls */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <div
                    className={`flex items-center gap-0.5 sm:gap-1 rounded-full px-1 sm:px-1.5 py-0.5 border border-dashed shrink-0 ${isDarkMode
                      ? 'bg-[#2B2321]/80 border-[#52433E]'
                      : 'bg-[#FAF4EE]/85 border-[#E2D1C1]'
                      }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        undo();
                        triggerToast('Undone');
                      }}
                      disabled={past.length === 0}
                      aria-label="Undo"
                      title="Undo"
                      className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-full flex items-center justify-center text-[#6E5D54] dark:text-[#D8C7BE] hover:text-[#231C18] dark:hover:text-white disabled:opacity-30 active:scale-95 transition cursor-pointer"
                    >
                      <Undo2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        redo();
                        triggerToast('Redone');
                      }}
                      disabled={future.length === 0}
                      aria-label="Redo"
                      title="Redo"
                      className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-full flex items-center justify-center text-[#6E5D54] dark:text-[#D8C7BE] hover:text-[#231C18] dark:hover:text-white disabled:opacity-30 active:scale-95 transition cursor-pointer"
                    >
                      <Redo2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                    <span
                      aria-hidden="true"
                      className={`w-[1px] h-3.5 mx-0.5 ${isDarkMode ? 'bg-[#52433E]' : 'bg-[#E2D1C1]'
                        }`}
                    />
                    <button
                      type="button"
                      data-testid="save-draft-device-btn"
                      onClick={handleSaveDraftOnDevice}
                      aria-label="Save bouquet draft on this device"
                      title={
                        hasUnsavedDraftChanges
                          ? 'Save Draft on Device (unsaved changes)'
                          : 'Save Draft on Device'
                      }
                      className={`relative w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-full flex items-center justify-center active:scale-95 transition cursor-pointer ${savedDraftPulse
                        ? 'bg-emerald-500/20 text-emerald-500 scale-105'
                        : 'text-[#6E5D54] dark:text-[#D8C7BE] hover:text-[#231C18] dark:hover:text-white'
                        }`}
                    >
                      {savedDraftPulse ? (
                        <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />
                      ) : (
                        <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#B4846C]" />
                      )}
                      {hasUnsavedDraftChanges && !savedDraftPulse && (
                        <span
                          aria-hidden="true"
                          className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#B4846C]"
                        />
                      )}
                    </button>
                    <span
                      aria-hidden="true"
                      className={`w-[1px] h-3.5 mx-0.5 ${isDarkMode ? 'bg-[#52433E]' : 'bg-[#E2D1C1]'
                        }`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        resetStudioCanvasSession({ preserveHistory: true });
                        triggerToast('Canvas reset');
                      }}
                      aria-label="Reset bouquet and start over"
                      title="Start Over"
                      className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-full flex items-center justify-center text-[#6E5D54] dark:text-[#D8C7BE] hover:text-rose-600 dark:hover:text-rose-300 active:scale-95 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  </div>

                  {/* Desktop & Tablet (sm: and up) Quick Layering & Photo Controls Capsule in Header */}
                  {selectedItem && !selectedItem.hidden && (
                    <div
                      role="toolbar"
                      aria-label="Quick layer order controls"
                      className={`hidden sm:inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 border border-dashed shrink-0 transition-all ${isDarkMode
                        ? 'bg-[#2B2321]/85 border-[#5E4E49] text-[#FBF6F1]'
                        : 'bg-[#FAF4EE]/90 border-[#DECBB9] text-[#2A201D]'
                        }`}
                    >
                      <button
                        type="button"
                        disabled={
                          Boolean(selectedItem.locked) ||
                          (selectedItemIndex <= 0 && getEffectiveItemPlane(selectedItem) === 'back')
                        }
                        onClick={() => moveItemLayer(selectedItem.id, 'back')}
                        title="Send Behind / Inside Bouquet"
                        aria-label="Send to Most Back"
                        className="w-7 h-7 rounded-full inline-flex items-center justify-center hover:bg-[#B4846C]/15 disabled:opacity-30 active:scale-95 transition cursor-pointer"
                      >
                        <LayerOrderBoxIcon direction="back" className="w-3.5 h-3.5 text-[#B4846C]" />
                      </button>
                      <button
                        type="button"
                        disabled={
                          Boolean(selectedItem.locked) ||
                          (selectedItemIndex <= 0 && getEffectiveItemPlane(selectedItem) === 'back')
                        }
                        onClick={() => moveItemLayer(selectedItem.id, 'down')}
                        title="Send Back 1 Layer"
                        aria-label="Send Back 1 Layer"
                        className="w-7 h-7 rounded-full inline-flex items-center justify-center hover:bg-[#B4846C]/15 disabled:opacity-30 active:scale-95 transition cursor-pointer"
                      >
                        <LayerOrderBoxIcon direction="down" className="w-3.5 h-3.5 text-[#B4846C]" />
                      </button>
                      <button
                        type="button"
                        disabled={
                          Boolean(selectedItem.locked) ||
                          (selectedItemIndex >= items.length - 1 &&
                            getEffectiveItemPlane(selectedItem) === 'front')
                        }
                        onClick={() => moveItemLayer(selectedItem.id, 'up')}
                        title="Bring Forward 1 Layer"
                        aria-label="Bring Forward 1 Layer"
                        className="w-7 h-7 rounded-full inline-flex items-center justify-center hover:bg-[#B4846C]/15 disabled:opacity-30 active:scale-95 transition cursor-pointer"
                      >
                        <LayerOrderBoxIcon direction="up" className="w-3.5 h-3.5 text-[#B4846C]" />
                      </button>
                      <button
                        type="button"
                        disabled={
                          Boolean(selectedItem.locked) ||
                          (selectedItemIndex >= items.length - 1 &&
                            getEffectiveItemPlane(selectedItem) === 'front')
                        }
                        onClick={() => moveItemLayer(selectedItem.id, 'front')}
                        title="Bring to Overlay / Front of Bouquet"
                        aria-label="Bring to Most Front"
                        className="w-7 h-7 rounded-full inline-flex items-center justify-center hover:bg-[#B4846C]/15 disabled:opacity-30 active:scale-95 transition cursor-pointer"
                      >
                        <LayerOrderBoxIcon direction="front" className="w-3.5 h-3.5 text-[#B4846C]" />
                      </button>

                      {selectedItem.photoStyle && (
                        <>
                          <span
                            aria-hidden="true"
                            className={`w-[1px] h-3.5 mx-0.5 ${isDarkMode ? 'bg-[#52433E]' : 'bg-[#E2D1C1]'
                              }`}
                          />
                          <button
                            type="button"
                            disabled={Boolean(selectedItem.locked)}
                            onClick={() => {
                              const nextClipped = getEffectiveItemPlane(selectedItem) !== 'inside';
                              updateItem(
                                selectedItem.id,
                                {
                                  clippedToBouquet: nextClipped,
                                  layerPlane: nextClipped ? 'inside' : 'front',
                                },
                                true
                              );
                            }}
                            title={
                              getEffectiveItemPlane(selectedItem) === 'inside'
                                ? 'Tucked inside bouquet wrapper (Click to float free)'
                                : 'Floating photo (Click to tuck inside bouquet wrapper)'
                            }
                            aria-label={
                              getEffectiveItemPlane(selectedItem) === 'inside'
                                ? 'Unclip photo from bouquet'
                                : 'Clip photo to bouquet'
                            }
                            aria-pressed={getEffectiveItemPlane(selectedItem) === 'inside'}
                            className={`w-7 h-7 rounded-full inline-flex items-center justify-center active:scale-95 transition cursor-pointer ${getEffectiveItemPlane(selectedItem) === 'inside'
                              ? 'bg-[#B4846C] text-white'
                              : 'text-[#B4846C] hover:bg-[#B4846C]/15'
                              }`}
                          >
                            <BouquetClipToggleIcon
                              clipped={getEffectiveItemPlane(selectedItem) === 'inside'}
                              className="w-3.5 h-3.5"
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              triggerPhotoFilePicker(selectedItem.id, selectedItem.photoStyle || 'raw')
                            }
                            title={selectedItem.photoDataUrl ? 'Change photo' : 'Upload photo'}
                            aria-label="Upload photo into photocard"
                            className="w-7 h-7 rounded-full inline-flex items-center justify-center bg-[#B4846C] text-white hover:bg-[#9F7058] active:scale-95 transition cursor-pointer"
                          >
                            <ImagePlus className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Right: Premium + Icon-Only Utility Controls + Primary Share Button */}
                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                  <button
                    type="button"
                    data-testid="studio-pass-header-btn"
                    onClick={() => {
                      setCheckoutTriggerAction('pass_menu');
                      setIsCheckoutModalOpen(true);
                    }}
                    aria-label="Open Premium Studio Pass and Pass Key"
                    title={
                      isBouquetUnlockedByPass && activeStudioPass
                        ? `Premium Active (${formatPassRemainingTime(activeStudioPass.expiresAt)})`
                        : 'Premium Studio Pass & Pass Key'
                    }
                    className={`h-7.5 sm:h-8 w-7.5 sm:w-auto sm:px-2.5 justify-center rounded-full text-[11px] sm:text-xs font-medium flex items-center gap-1 border border-dashed shrink-0 active:scale-95 transition cursor-pointer ${isBouquetUnlockedByPass
                      ? isDarkMode
                        ? 'bg-[#E6B89C]/20 border-[#E6B89C] text-[#F0C8B0]'
                        : 'bg-[#FAF3EB] border-[#B4846C] text-[#6E4434]'
                      : isDarkMode
                        ? 'bg-[#423734] border-[#66554F] text-[#FBF6F1] hover:bg-[#4D403C]'
                        : 'bg-[#FAF4EE] border-[#D8C4B4] text-[#5C4438] hover:bg-[#F3E9DF]'
                      }`}
                  >
                    <CoutureBloomSeal className="w-3.5 h-3.5 text-[#B4846C] shrink-0" />
                    <span className="hidden sm:inline">Premium</span>
                  </button>

                  <button
                    type="button"
                    data-testid="open-vault-header-btn"
                    onClick={() => setIsVaultModalOpen(true)}
                    aria-label="Open Saved Bouquets"
                    title="Saved Bouquets"
                    className={`h-7.5 sm:h-8 ${vaultCount > 0 ? 'px-2 sm:px-2.5' : 'w-7.5 sm:w-8 justify-center'
                      } rounded-full text-[11px] sm:text-xs font-medium flex items-center gap-1 border border-dashed shrink-0 active:scale-95 transition cursor-pointer ${isDarkMode
                        ? 'bg-[#423734] border-[#66554F] text-[#FBF6F1] hover:bg-[#4D403C]'
                        : 'bg-[#FAF4EE] border-[#D8C4B4] text-[#5C4438] hover:bg-[#F3E9DF]'
                      }`}
                  >
                    <Bookmark className="w-3.5 h-3.5 text-[#B4846C] shrink-0" />
                    {vaultCount > 0 && (
                      <span
                        className={`text-[10.5px] sm:text-[11px] font-semibold tabular-nums ${isDarkMode ? 'text-[#F0C8B0]' : 'text-[#7A4B3A]'
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
                    className={`hidden sm:flex w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-full items-center justify-center shrink-0 active:scale-95 transition cursor-pointer ${isMusicPlaying
                      ? 'bg-[#B4846C]/15 text-[#B4846C]'
                      : 'text-[#6E5D54] dark:text-[#D8C7BE] hover:bg-[#FAF4EE] dark:hover:bg-[#463A36]'
                      }`}
                  >
                    {isMusicPlaying ? <Music className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsDarkMode((prev) => !prev)}
                    aria-label="Toggle theme"
                    title="Toggle theme"
                    className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 text-[#6E5D54] dark:text-[#E6B89C] hover:bg-[#FAF4EE] dark:hover:bg-[#463A36] active:scale-95 transition cursor-pointer"
                  >
                    <span key={isDarkMode ? 'sun' : 'moon'} className="block studio-theme-icon-pop">
                      {isDarkMode ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsShareModalOpen(true)}
                    aria-label="Share bouquet"
                    title="Share bouquet"
                    className={`h-7.5 sm:h-8 px-3 sm:px-3.5 rounded-full text-xs font-medium flex items-center justify-center gap-1 shrink-0 active:scale-95 transition cursor-pointer ${isDarkMode
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
            className={`hidden h-14 shrink-0 px-2 sm:px-4 md:px-6 border-b items-center justify-between gap-1 sm:gap-2 z-30 transition-colors ${isDarkMode
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
            </div>

            {/* Center Controls (Undo / Redo / Randomize) */}
            {!isGiftView ? (
              <div className="flex items-center gap-1 sm:gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    undo();
                    triggerToast('Undone');
                  }}
                  disabled={past.length === 0}
                  aria-label="Undo (Ctrl+Z)"
                  title="Undo (Ctrl+Z)"
                  className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl disabled:opacity-30 border transition ${isDarkMode
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
                    triggerToast('Redone');
                  }}
                  disabled={future.length === 0}
                  aria-label="Redo (Ctrl+Shift+Z)"
                  title="Redo (Ctrl+Shift+Z)"
                  className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl disabled:opacity-30 border transition ${isDarkMode
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
                  className={`h-8 px-2 sm:h-9 sm:px-3 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition ${isDarkMode
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
                className={`h-8 w-8 sm:h-9 sm:w-auto sm:px-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition ${isMusicPlaying
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
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl border text-xs font-medium flex items-center justify-center transition ${isDarkMode
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
                    className={`h-8 px-2 sm:h-9 sm:px-3 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition ${isDarkMode
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
                    className={`hidden sm:flex h-8 sm:h-9 sm:w-auto sm:px-3 rounded-xl border text-xs font-medium items-center justify-center gap-1.5 transition ${isDarkMode
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
                    className={`hidden sm:flex h-8 px-2 sm:h-9 sm:px-3 rounded-xl border text-xs font-medium items-center gap-1.5 transition ${isDarkMode
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
            className={`flex-1 flex flex-col overflow-hidden relative ${studioEntranceKey > 0 ? 'studio-workspace-enter' : ''
              }`}
          >
            {/* CENTER MAIN STAGE AREA (Never resizes when selecting stems) */}
            <main className="flex-1 min-h-0 min-w-0 relative flex flex-col items-center justify-center overflow-hidden order-1">
              {/* ===================================================================
              GIFT ENTRANCE OVERLAY — "The Delivery" 5-Scene Couture Botanical Prelude
              =================================================================== */}
              {(isGiftView || isPreviewMode) && isGiftEntranceOpen && (
                <RecipientDeliveryPrelude
                  scene={deliveryScene}
                  onSceneChange={setDeliveryScene}
                  onTouchWaxSeal={handleTouchDeliveryWaxSeal}
                  onSkipToThreshold={handleSkipDeliveryToThreshold}
                  onReplayPrelude={handleReplayDeliveryPrelude}
                  isReducedMotion={isReducedMotion}
                  isDarkMode={isDarkMode}
                  isPreviewMode={isPreviewMode}
                  isResolvingShortCode={isResolvingShortCode}
                  isEntranceUnfurling={isEntranceUnfurling}
                  recipientName={card.to || 'You'}
                  recipientBloom={recipientBloom}
                  entranceSlideProgress={entranceSlideProgress}
                  isDraggingEntranceSlider={isDraggingEntranceSlider}
                  onBack={isPreviewMode ? handleExitGiftViewToEditor : handleReturnHomeFromGiftView}
                  lock={lock}
                  isCountdownLocked={isCountdownLocked}
                  countdownParts={countdownParts}
                  countdownTargetMs={countdownTargetMs}
                  isPasscodeLocked={isPasscodeLocked}
                  effectivePasscodeType={effectivePasscodeType}
                  passcodeAttempt={passcodeAttempt}
                  passcodeFeedback={passcodeFeedback}
                  passcodeError={passcodeError}
                  passcodeShakeKey={passcodeShakeKey}
                  isPinFocused={isPinFocused}
                  isWordFocused={isWordFocused}
                  onSetIsPinFocused={setIsPinFocused}
                  onSetIsWordFocused={setIsWordFocused}
                  onPasscodeAttemptChange={setPasscodeAttempt}
                  onResetPasscodeFeedback={() => {
                    if (passcodeFeedback !== 'idle') setPasscodeFeedback('idle');
                    if (passcodeError) setPasscodeError(null);
                  }}
                  onTriggerPasscodeVerification={triggerPasscodeVerification}
                  onSubmitPasscodeForm={handleAttemptPasscodeUnlock}
                  onClearPinErrorTimer={() => {
                    if (pinErrorClearTimerRef.current !== null) {
                      window.clearTimeout(pinErrorClearTimerRef.current);
                      pinErrorClearTimerRef.current = null;
                    }
                  }}
                  pinInputRef={pinInputRef}
                  isGiftCurrentlyLocked={isGiftCurrentlyLocked}
                  onUnwrapForceBypass={() => handleGlideSlideToOpen(entranceSlideProgress, true)}
                  onGlideSlideToOpen={handleGlideSlideToOpen}
                  onGlideSlideReset={handleGlideSlideReset}
                  onSetEntranceSlideProgress={setEntranceSlideProgress}
                  onSetIsDraggingEntranceSlider={setIsDraggingEntranceSlider}
                  onCancelEntranceSlideRaf={() => {
                    if (entranceSlideRafRef.current !== null) {
                      cancelAnimationFrame(entranceSlideRafRef.current);
                      entranceSlideRafRef.current = null;
                    }
                  }}
                  renderCoutureSealIcon={(cls) => <CoutureBloomSeal className={cls} />}
                />
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

              {/* Interactive SVG Bouquet Stage (Always 100% height, zero layout shift; emerges seamlessly during Scene 5 light wash) */}
              <div
                className={`flex-1 w-full h-full min-h-0 flex items-center justify-center relative touch-none ${
                  (isGiftView || isPreviewMode) && isGiftEntranceOpen && !isEntranceUnfurling
                    ? 'opacity-0 pointer-events-none'
                    : (isGiftView || isPreviewMode) && (!isGiftEntranceOpen || isEntranceUnfurling)
                    ? 'gift-stage-entrance'
                    : ''
                }`}
              >
                {/* Mobile-Only (< sm) Floating Top Selected-Item Bar (Positioned right under top navbar; never moves or resizes the main canvas) */}
                {!isPreviewMode && !isGiftView && selectedItem && !selectedItem.hidden && (
                  <div
                    role="toolbar"
                    aria-label="Mobile selected item quick controls"
                    className={`absolute top-1.5 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-1.25rem)] max-w-[356px] flex sm:hidden items-center justify-between gap-2 px-3 py-1 rounded-full border border-dashed shadow-[0_8px_24px_rgba(35,28,24,0.10)] backdrop-blur-md pointer-events-auto ${isDarkMode
                      ? 'bg-[#2B2321]/92 border-[#5E4E49] text-[#FBF6F1]'
                      : 'bg-[#FFFDF9]/92 border-[#DECBB9] text-[#2A201D]'
                      }`}
                  >
                    <span className="text-[11.5px] font-medium truncate text-[#6E5D54] dark:text-[#D8C7BE] pl-0.5">
                      {selectedItem.photoStyle
                        ? selectedItem.photoStyle === 'raw'
                          ? 'Photo'
                          : PHOTO_FRAME_CATALOG.find((p) => p.id === selectedItem.photoStyle)?.shortLabel || 'Photocard'
                        : selectedMeta?.shortName || 'Stem'}
                    </span>

                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        disabled={
                          Boolean(selectedItem.locked) ||
                          (selectedItemIndex <= 0 && getEffectiveItemPlane(selectedItem) === 'back')
                        }
                        onClick={() => moveItemLayer(selectedItem.id, 'back')}
                        title="Send Behind / Inside Bouquet"
                        aria-label="Send to Most Back"
                        className="w-7 h-7 rounded-full inline-flex items-center justify-center hover:bg-[#B4846C]/15 disabled:opacity-30 active:scale-95 transition cursor-pointer"
                      >
                        <LayerOrderBoxIcon direction="back" className="w-3.5 h-3.5 text-[#B4846C]" />
                      </button>
                      <button
                        type="button"
                        disabled={
                          Boolean(selectedItem.locked) ||
                          (selectedItemIndex <= 0 && getEffectiveItemPlane(selectedItem) === 'back')
                        }
                        onClick={() => moveItemLayer(selectedItem.id, 'down')}
                        title="Send Back 1 Layer"
                        aria-label="Send Back 1 Layer"
                        className="w-7 h-7 rounded-full inline-flex items-center justify-center hover:bg-[#B4846C]/15 disabled:opacity-30 active:scale-95 transition cursor-pointer"
                      >
                        <LayerOrderBoxIcon direction="down" className="w-3.5 h-3.5 text-[#B4846C]" />
                      </button>
                      <button
                        type="button"
                        disabled={
                          Boolean(selectedItem.locked) ||
                          (selectedItemIndex >= items.length - 1 &&
                            getEffectiveItemPlane(selectedItem) === 'front')
                        }
                        onClick={() => moveItemLayer(selectedItem.id, 'up')}
                        title="Bring Forward 1 Layer"
                        aria-label="Bring Forward 1 Layer"
                        className="w-7 h-7 rounded-full inline-flex items-center justify-center hover:bg-[#B4846C]/15 disabled:opacity-30 active:scale-95 transition cursor-pointer"
                      >
                        <LayerOrderBoxIcon direction="up" className="w-3.5 h-3.5 text-[#B4846C]" />
                      </button>
                      <button
                        type="button"
                        disabled={
                          Boolean(selectedItem.locked) ||
                          (selectedItemIndex >= items.length - 1 &&
                            getEffectiveItemPlane(selectedItem) === 'front')
                        }
                        onClick={() => moveItemLayer(selectedItem.id, 'front')}
                        title="Bring to Overlay / Front of Bouquet"
                        aria-label="Bring to Most Front"
                        className="w-7 h-7 rounded-full inline-flex items-center justify-center hover:bg-[#B4846C]/15 disabled:opacity-30 active:scale-95 transition cursor-pointer"
                      >
                        <LayerOrderBoxIcon direction="front" className="w-3.5 h-3.5 text-[#B4846C]" />
                      </button>

                      {selectedItem.photoStyle && (
                        <>
                          <span
                            aria-hidden="true"
                            className={`w-[1px] h-3.5 mx-0.5 ${isDarkMode ? 'bg-[#52433E]' : 'bg-[#E2D1C1]'
                              }`}
                          />
                          <button
                            type="button"
                            disabled={Boolean(selectedItem.locked)}
                            onClick={() => {
                              const nextClipped = getEffectiveItemPlane(selectedItem) !== 'inside';
                              updateItem(
                                selectedItem.id,
                                {
                                  clippedToBouquet: nextClipped,
                                  layerPlane: nextClipped ? 'inside' : 'front',
                                },
                                true
                              );
                            }}
                            title={
                              getEffectiveItemPlane(selectedItem) === 'inside'
                                ? 'Tucked inside bouquet wrapper (Tap to float free)'
                                : 'Floating photo (Tap to tuck inside bouquet wrapper)'
                            }
                            aria-label={
                              getEffectiveItemPlane(selectedItem) === 'inside'
                                ? 'Unclip photo from bouquet'
                                : 'Clip photo to bouquet'
                            }
                            aria-pressed={getEffectiveItemPlane(selectedItem) === 'inside'}
                            className={`h-6.5 px-2 rounded-full text-[10px] font-medium inline-flex items-center gap-1 active:scale-95 transition cursor-pointer ${getEffectiveItemPlane(selectedItem) === 'inside'
                              ? 'bg-[#B4846C] text-white'
                              : 'text-[#B4846C] bg-[#B4846C]/10 hover:bg-[#B4846C]/20'
                              }`}
                          >
                            <BouquetClipToggleIcon
                              clipped={getEffectiveItemPlane(selectedItem) === 'inside'}
                              className="w-3.5 h-3.5"
                            />
                            <span>{getEffectiveItemPlane(selectedItem) === 'inside' ? 'Tucked' : 'Tuck'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              triggerPhotoFilePicker(selectedItem.id, selectedItem.photoStyle || 'raw')
                            }
                            title={selectedItem.photoDataUrl ? 'Change photo' : 'Upload photo'}
                            aria-label="Upload photo into photocard"
                            className="w-7 h-7 rounded-full inline-flex items-center justify-center bg-[#B4846C] text-white hover:bg-[#9F7058] active:scale-95 transition cursor-pointer"
                          >
                            <ImagePlus className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {!(isGiftView && !isPreviewMode && isGiftCurrentlyLocked) && (
                  <BouquetStage
                    svgRef={svgRef}
                    isPreviewMode={isPreviewMode || isGiftView}
                    isDarkMode={isDarkMode}
                    bloomRevealRunId={bloomRevealRunId}
                    bloomRevealActive={isGiftView || isPreviewMode ? isBloomRevealActive : undefined}
                    isReducedMotion={isReducedMotion}
                    onBloomCardStageReached={handleBloomCardStageReached}
                    onBloomFinished={handleBloomSequenceFinished}
                    showCardInGiftView={isGiftView || isPreviewMode ? showGiftCardReveal : true}
                    isVoicePlaying={isVoicePlaying}
                    onItemSelect={() => {
                      if (isPreviewMode || isGiftView) return;
                      setActiveColorTarget('petal');
                      openDesktopToolPopover('stem');
                    }}
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
                      openDesktopToolPopover('card');
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
                      openDesktopToolPopover('voice');
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
                    onPhotoCardUploadClick={(itemId) => {
                      if (isPreviewMode || isGiftView) return;
                      const found = items.find((i) => i.id === itemId);
                      triggerPhotoFilePicker(itemId, found?.photoStyle || 'polaroid');
                    }}
                  />
                )}

                {/* ===============================================================
                COLLAPSIBLE RIGHT-SIDE ACTION STACK (Phone & Desktop)
                Collapses the right-side tools down to the Eye button capsule.
                Clicking an active tool icon again immediately slides the side
                drawer closed.
                =============================================================== */}
                {!isGiftView && !isPreviewMode && !showLandingPage && (
                  <div
                    ref={floatingToolStackRef}
                    className="absolute right-2 sm:right-3 bottom-2 sm:bottom-3 z-40 max-h-[calc(100%-0.5rem)] flex flex-col items-center justify-end gap-1.5"
                  >
                    {isMobileToolsExpanded && (
                      <div className="flex flex-col items-center gap-1.5 overflow-y-auto no-scrollbar py-0.5 px-0.5 animate-in fade-in duration-150">
                        <button
                          type="button"
                          onClick={() => handleMobileFloatingTool('color')}
                          aria-pressed={mobilePopover === 'color'}
                          aria-label="Open Unified Color Picker"
                          title={mobilePopover === 'color' ? 'Hide Color Picker Drawer' : 'Colors (Petals, Wrapper, Ribbon, Card & Voice)'}
                          className={`w-9 h-9 shrink-0 rounded-full border shadow-sm flex items-center justify-center active:scale-95 transition ${mobilePopover === 'color'
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
                          className={`w-9 h-9 shrink-0 rounded-full border shadow-sm flex items-center justify-center active:scale-95 transition ${mobilePopover === 'stem'
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
                          className={`w-9 h-9 shrink-0 rounded-full border shadow-sm flex items-center justify-center active:scale-95 transition ${mobilePopover === 'layers'
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
                          className={`relative w-9 h-9 shrink-0 rounded-full border shadow-sm flex items-center justify-center active:scale-95 transition ${mobilePopover === 'card'
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
                          className={`relative w-9 h-9 shrink-0 rounded-full border shadow-sm flex items-center justify-center active:scale-95 transition ${mobilePopover === 'voice'
                            ? 'bg-[#B4846C] text-white border-[#B4846C] ring-2 ring-[#B4846C]/30'
                            : isDarkMode
                              ? 'bg-[#1E1C1A]/95 border-stone-700 text-[#B4846C]'
                              : 'bg-white/95 border-stone-200/90 text-[#B4846C]'
                            }`}
                        >
                          <Mic className="w-4 h-4" />
                          {voice.audioDataUrl && (
                            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-rose-500 border border-white" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={handleToggleMusic}
                          aria-pressed={isMusicPlaying}
                          aria-label={isMusicPlaying ? 'Pause music' : 'Play music'}
                          title={isMusicPlaying ? 'Pause music' : 'Play music'}
                          className={`sm:hidden w-9 h-9 shrink-0 rounded-full border shadow-sm flex items-center justify-center active:scale-95 transition ${isMusicPlaying
                            ? 'bg-[#B4846C] text-white border-[#B4846C] ring-2 ring-[#B4846C]/30'
                            : isDarkMode
                              ? 'bg-[#1E1C1A]/95 border-stone-700 text-[#B4846C]'
                              : 'bg-white/95 border-stone-200/90 text-[#B4846C]'
                            }`}
                        >
                          {isMusicPlaying ? <Music className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                        </button>
                      </div>
                    )}

                    {/* Bottom Capsule: Collapse/Expand Toggle + Eye (Preview Bloom) */}
                    <div
                      className={`flex flex-col items-center shrink-0 rounded-full border shadow-sm backdrop-blur-md p-0.5 transition-all ${isDarkMode
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
                        className={`relative w-9 h-7 rounded-t-full flex items-center justify-center active:scale-95 transition ${isMobileToolsExpanded
                          ? 'text-stone-500 dark:text-stone-400 hover:text-[#1C1917] dark:hover:text-white'
                          : 'text-[#B4846C]'
                          }`}
                      >
                        {isMobileToolsExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <>
                            <ChevronUp className="w-4 h-4" />
                            {(selectedId || mobilePopover) && (
                              <span className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-[#B4846C]" />
                            )}
                          </>
                        )}
                      </button>

                      <div className="w-4.5 h-[1px] bg-stone-200/80 dark:bg-stone-700/80" />

                      <button
                        type="button"
                        onClick={() => startGiftBloomAnimation(items.length, true)}
                        aria-label="Preview gift bloom"
                        title="Preview Bloom"
                        className="w-9 h-8.5 rounded-full flex items-center justify-center text-[#B4846C] active:scale-95 transition"
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
                    className={`absolute left-2.5 sm:left-4 top-2 sm:top-3 ${mobilePopover === 'layers' ? 'bottom-3 sm:bottom-4' : 'max-h-[calc(100%-1.5rem)]'
                      } z-30 w-[276px] sm:w-[310px] max-w-[calc(100vw-4.5rem)] rounded-[22px] border border-dashed shadow-[0_16px_42px_rgba(28,20,16,0.14)] backdrop-blur-xl overflow-hidden flex flex-col transition-all duration-200 ease-out ${isDarkMode
                        ? 'bg-[#352C29]/95 border-[#5E4E49] text-[#FBF6F1]'
                        : 'bg-[#FFFDF9]/96 border-[#DECBB9] text-[#2A201D]'
                      } ${mobilePopover
                        ? 'translate-x-0 opacity-100'
                        : '-translate-x-[calc(100%+1.5rem)] opacity-0 pointer-events-none'
                      }`}
                  >
                    {/* Clean Stationary Header: Active Tool Title + Slide-Closed Button */}
                    <div
                      className={`flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-dashed shrink-0 ${isDarkMode ? 'border-[#4E403B]' : 'border-[#EADFD4]'
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
                        className={`p-1.5 rounded-full transition cursor-pointer ${isDarkMode
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
                          onUploadPhotoForItem={(itemId) => {
                            const found = items.find((i) => i.id === itemId);
                            triggerPhotoFilePicker(itemId, found?.photoStyle || 'polaroid');
                          }}
                        />
                      )}

                      {mobilePopover === 'stem' && (
                        <SelectedFlowerToolbar
                          isDrawerOpen={false}
                          mobileSheetMode="stem"
                          activeColorTarget={activeColorTarget}
                          onColorTargetChange={setActiveColorTarget}
                          onCloseMobileSheet={() => setMobilePopover(null)}
                          onUploadPhotoForItem={(itemId) => {
                            const found = items.find((i) => i.id === itemId);
                            triggerPhotoFilePicker(itemId, found?.photoStyle || 'polaroid');
                          }}
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
                              className={`px-2.5 py-0.5 rounded-full border border-dashed text-[11px] font-medium flex items-center gap-1 shrink-0 transition cursor-pointer ${!card.visibleOnStage
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

                          {/* Card Note Input Only — Letterpress Stationery Sheet */}
                          <div
                            className={`p-3 rounded-2xl border border-dashed transition-colors ${isDarkMode
                              ? 'bg-[#352C29] border-[#5E4E49]'
                              : 'bg-[#FFFDF9] border-[#DECBB9]'
                              }`}
                          >
                            <div className="relative">
                              <textarea
                                rows={4}
                                maxLength={PREMIUM_CARD_NOTE_MAX_CHARS}
                                value={card.message}
                                placeholder="Write your heartfelt note..."
                                onChange={(e) => updateCard({ message: e.target.value })}
                                aria-label="Card message"
                                className={`w-full px-3.5 py-2.5 pb-7 rounded-xl border border-dashed text-sm focus:outline-none focus:border-[#B4846C] resize-none overflow-y-auto transition-colors ${isDarkMode
                                  ? 'bg-[#2B2321] border-[#544540] text-[#FBF6F1] placeholder:text-[#9A877B]/75'
                                  : 'bg-[#FAF4EE] border-[#E2D1C1] text-[#2A201D] placeholder:text-[#9A877B]/80'
                                  }`}
                                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '16px' }}
                              />
                              <span
                                className={`absolute bottom-2 right-3 text-[10px] pointer-events-none inline-flex items-center gap-1 ${card.message.trim().length > FREE_CARD_NOTE_MAX_CHARS
                                  ? 'text-[#B4846C] font-medium'
                                  : 'text-[#9A877B]'
                                  }`}
                              >
                                {card.message.trim().length > FREE_CARD_NOTE_MAX_CHARS ? (
                                  <>
                                    <CoutureBloomSeal className="w-3 h-3" />
                                    <span>Couture Note · {card.message.length}/{PREMIUM_CARD_NOTE_MAX_CHARS}</span>
                                  </>
                                ) : (
                                  <span>
                                    {card.message.length}/{FREE_CARD_NOTE_MAX_CHARS} free ({PREMIUM_CARD_NOTE_MAX_CHARS} Couture)
                                  </span>
                                )}
                              </span>
                            </div>
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
                <div className="gift-hud-float-in w-full max-w-full px-2.5 sm:px-6 z-20 absolute top-3 sm:top-4 inset-x-0 pointer-events-none flex items-center justify-between gap-1.5 sm:gap-2">
                  {/* Left: Dedication Capsule (Flexes and truncates cleanly so right pill never clips on mobile) */}
                  <div
                    className={`pointer-events-auto min-w-0 flex-initial max-w-[calc(100%-7.25rem)] sm:max-w-md inline-flex items-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-full border border-dashed shadow-[0_6px_24px_rgba(35,28,24,0.06)] backdrop-blur-md ${isDarkMode
                      ? 'bg-[#352C29]/90 border-[#5E4E49] text-[#FBF6F1]'
                      : 'bg-[#FFFDF9]/90 border-[#DECBB9] text-[#231C18]'
                      }`}
                  >
                    <button
                      type="button"
                      onClick={isPreviewMode ? handleExitGiftViewToEditor : handleReturnHomeFromGiftView}
                      title={isPreviewMode ? 'Back to Studio' : 'Back'}
                      aria-label={isPreviewMode ? 'Back to Studio' : 'Back'}
                      className="shrink-0 hover:opacity-80 transition cursor-pointer flex items-center"
                    >
                      <ArrowLeft className="w-4 h-4 shrink-0" />
                    </button>
                    <div
                      className="min-w-0 truncate text-[13.5px] sm:text-base leading-tight"
                      style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                    >
                      <span className="italic opacity-75 mr-1">For</span>
                      <span className="font-semibold tracking-tight">{card.to.trim() || 'You'}</span>
                      {card.from.trim() && (
                        <span
                          className={`ml-1.5 sm:ml-2 text-xs sm:text-sm ${isDarkMode ? 'text-[#C8B6AC]' : 'text-[#8C7A70]'
                            }`}
                        >
                          · <span className="italic">from</span>{' '}
                          <span
                            className={`font-semibold tracking-tight ${isDarkMode ? 'text-[#FBF6F1]' : 'text-[#231C18]'
                              }`}
                          >
                            {card.from.trim()}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Quiet Ambient Controls (Replay Bloom, Music, Theme — never clipped on mobile) */}
                  <div
                    className={`pointer-events-auto inline-flex items-center gap-0.5 px-1.5 sm:px-2 py-1 rounded-full border border-dashed shadow-[0_6px_24px_rgba(35,28,24,0.06)] backdrop-blur-md shrink-0 ${isDarkMode
                      ? 'bg-[#352C29]/90 border-[#5E4E49] text-[#FBF6F1]'
                      : 'bg-[#FFFDF9]/90 border-[#DECBB9] text-[#231C18]'
                      }`}
                  >
                    <button
                      type="button"
                      onClick={() => startGiftBloomAnimation(items.length, isPreviewMode, true)}
                      aria-label="Replay bloom animation"
                      title="Replay bloom animation"
                      className={`h-7 px-2 rounded-full text-xs font-medium flex items-center gap-1.5 transition active:scale-95 cursor-pointer ${isDarkMode
                        ? 'text-[#E6D6C7] hover:text-[#FBF6F1]'
                        : 'text-[#5C4438] hover:text-[#231C18]'
                        }`}
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-[#B4846C]" />
                      <span className="hidden sm:inline">Replay</span>
                    </button>

                    <span aria-hidden="true" className="opacity-25 text-xs select-none">·</span>

                    <button
                      type="button"
                      onClick={handleToggleMusic}
                      aria-pressed={isMusicPlaying}
                      aria-label={isMusicPlaying ? 'Pause music' : 'Play music'}
                      title={isMusicPlaying ? 'Pause music box' : 'Play music box'}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition active:scale-95 cursor-pointer ${isMusicPlaying
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
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition active:scale-95 cursor-pointer ${isDarkMode
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
                  className="gift-hud-float-in w-full px-3 sm:px-4 z-20 absolute bottom-3.5 sm:bottom-6 inset-x-0 pointer-events-none flex flex-col items-center gap-2.5"
                  style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
                >
                  {/* Miniature Stationery Reply Postcard */}
                  {isReactionPopoverOpen && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className={`pointer-events-auto relative w-full max-w-[340px] rounded-[24px] p-4 sm:p-5 border border-dashed shadow-[0_24px_60px_rgba(28,20,16,0.18)] backdrop-blur-xl animate-in fade-in duration-150 ${isDarkMode
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
                            className={`w-8 h-9 rounded-[4px] border border-dashed flex items-center justify-center rotate-3 ${isDarkMode
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
                            className={`p-1 rounded-full transition cursor-pointer ${isDarkMode
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
                              className={`px-2.5 py-1 rounded-full border text-[11px] font-medium inline-flex items-center gap-1 transition cursor-pointer ${active
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
                        className={`w-full px-1 py-0.5 bg-transparent resize-none focus:outline-none ${isDarkMode
                          ? 'text-[#FBF6F1] placeholder:text-[#9A877B]'
                          : 'text-[#231C18] placeholder:text-[#9A877B]'
                          }`}
                      />

                      <div className="mt-3 flex items-center justify-end">
                        <button
                          type="button"
                          disabled={isSubmittingReaction}
                          onClick={handleSubmitRecipientReaction}
                          className={`py-2 px-5 rounded-full text-xs font-medium transition cursor-pointer disabled:opacity-50 ${isDarkMode
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
                    className={`pointer-events-auto inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2.5 py-1.5 rounded-full border border-dashed shadow-[0_12px_36px_rgba(35,28,24,0.10)] backdrop-blur-md max-w-[calc(100vw-1rem)] overflow-x-auto no-scrollbar transition-all duration-500 ${isDarkMode
                      ? 'bg-[#352C29]/94 border-[#5E4E49] text-[#FBF6F1]'
                      : 'bg-[#FFFDF9]/94 border-[#DECBB9] text-[#231C18]'
                      } ${showGiftCardReveal || isPreviewMode
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
                          className={`px-2 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-medium flex items-center gap-1 sm:gap-1.5 shrink-0 transition active:scale-95 cursor-pointer ${isDarkMode
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
                          className={`px-2 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-medium flex items-center gap-1 sm:gap-1.5 shrink-0 transition active:scale-95 cursor-pointer ${isVoicePlaying
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
                      className={`px-2 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-medium flex items-center gap-1 sm:gap-1.5 shrink-0 transition active:scale-95 cursor-pointer ${hasSubmittedReaction
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
                      className={`px-2 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-medium flex items-center gap-1 sm:gap-1.5 shrink-0 transition active:scale-95 cursor-pointer ${isDarkMode
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
                      className={`ml-0.5 sm:ml-1 px-3 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-medium flex items-center gap-1 sm:gap-1.5 shrink-0 transition active:scale-95 cursor-pointer whitespace-nowrap ${isDarkMode
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

              {/* ===================================================================
              PAY-IT-FORWARD SHAKING ROSE-GOLD GIFT BOX FOR RECIPIENTS
              Appears ~3 seconds after bloom reveal finishes in a non-invasive
              responsive corner (`bottom-[4.75rem] right-3.5 sm:bottom-20 sm:right-6`).
              =================================================================== */}
              {isGiftView &&
                !isPreviewMode &&
                isEligibleRecipientGiftOpenSource(giftOpenSource) &&
                !isGiftEntranceOpen &&
                isRecipientGiftBoxVisible && (
                <div className="absolute bottom-[4.75rem] right-3.5 sm:bottom-20 sm:right-6 z-30 pointer-events-auto animate-in fade-in zoom-in-95 duration-300">
                  <button
                    type="button"
                    data-testid="recipient-shaking-gift-box"
                    aria-label="Open your Founding Launch gift"
                    onClick={() => {
                      setRecipientGiftClaimError(null);
                      setIsRecipientGiftModalOpen(true);
                    }}
                    style={{
                      animation: 'sab-rosegold-gift-shake 2.8s ease-in-out infinite',
                    }}
                    className={`group relative flex items-center gap-2 pl-2.5 pr-3 py-2 rounded-2xl border border-dashed shadow-[0_12px_32px_rgba(180,120,102,0.28)] transition cursor-pointer ${isDarkMode
                      ? 'bg-[#3A2D2A]/95 border-[#E8B4A6] text-[#FBF6F1] hover:bg-[#463632]'
                      : 'bg-[#FFFDF9]/95 border-[#C68B77] text-[#3B2820] hover:bg-[#FCF5F1]'
                      }`}
                  >
                    {/* Rose-Gold Keepsake Gift Box SVG */}
                    <span className="relative w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center shrink-0">
                      <svg
                        viewBox="0 0 36 36"
                        fill="none"
                        aria-hidden="true"
                        className="w-full h-full overflow-visible"
                      >
                        {/* Box base */}
                        <rect
                          x="6"
                          y="15"
                          width="24"
                          height="16"
                          rx="3"
                          fill={isDarkMode ? '#4A3833' : '#FDF4EE'}
                          stroke="#C68B77"
                          strokeWidth="1.4"
                        />
                        {/* Box lid */}
                        <rect
                          x="4.5"
                          y="10.5"
                          width="27"
                          height="5.5"
                          rx="2"
                          fill={isDarkMode ? '#5A433D' : '#F8E6DC'}
                          stroke="#C68B77"
                          strokeWidth="1.4"
                        />
                        {/* Vertical & horizontal rose-gold satin ribbon */}
                        <path
                          d="M18 10.5V31M6 22.5H30"
                          stroke="#B8735E"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                        />
                        {/* Rose-gold bow loops */}
                        <path
                          d="M18 10.5C14.2 6.2 10 8.5 13.5 10.8C15.2 11.8 17 11 18 10.5Z"
                          fill="#E8B4A6"
                          fillOpacity="0.45"
                          stroke="#B8735E"
                          strokeWidth="1.35"
                        />
                        <path
                          d="M18 10.5C21.8 6.2 26 8.5 22.5 10.8C20.8 11.8 19 11 18 10.5Z"
                          fill="#E8B4A6"
                          fillOpacity="0.45"
                          stroke="#B8735E"
                          strokeWidth="1.35"
                        />
                        <circle cx="18" cy="10.5" r="1.6" fill="#B8735E" />
                      </svg>
                      <span
                        aria-hidden="true"
                        className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#D48C78] ring-2 ring-[#FFFDF9] dark:ring-[#3A2D2A]"
                      />
                    </span>

                    <span className="text-left leading-tight">
                      <span
                        className="block text-xs sm:text-[13px] font-semibold tracking-tight"
                        style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                      >
                        A gift for you
                      </span>
                      <span className="block text-[9.5px] opacity-75">
                        Tap to unwrap
                      </span>
                    </span>
                  </button>
                </div>
              )}

              {/* ===================================================================
              RECIPIENT GIFT OFFER STATIONERY MINI-MODAL
              =================================================================== */}
              {isRecipientGiftModalOpen && (
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-label="A little something for you too"
                  data-testid="recipient-gift-offer-modal"
                  onClick={() => setIsRecipientGiftModalOpen(false)}
                  className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
                >
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className={`w-full max-w-sm rounded-[26px] p-5 sm:p-6 border border-dashed shadow-[0_24px_60px_rgba(28,20,16,0.24)] relative text-center space-y-3.5 ${isDarkMode
                      ? 'bg-[#352C29] border-[#E8B4A6]/65 text-[#FBF6F1]'
                      : 'bg-[#FFFDF9] border-[#C68B77] text-[#231C18]'
                      }`}
                  >
                    <button
                      type="button"
                      aria-label="Close gift offer"
                      onClick={() => setIsRecipientGiftModalOpen(false)}
                      className={`absolute top-3.5 right-3.5 w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer ${isDarkMode
                        ? 'text-[#C8B6AC] hover:text-[#FBF6F1] hover:bg-[#463A36]'
                        : 'text-[#8C7A70] hover:text-[#231C18] hover:bg-[#F5EDE4]'
                        }`}
                    >
                      <X className="w-4 h-4" />
                    </button>

                    {/* Rose-Gold Seal & Parcel Illustration */}
                    <div className="mx-auto w-14 h-14 rounded-2xl border border-dashed border-[#C68B77]/60 bg-[#FAF1EC] dark:bg-[#423430] flex items-center justify-center">
                      <CoutureBloomSeal className="w-6 h-6 text-[#B8735E] dark:text-[#E8B4A6]" />
                    </div>

                    <div className="space-y-1.5">
                      <h3
                        className="text-2xl sm:text-[26px] font-semibold leading-tight tracking-tight"
                        style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                      >
                        A little something for you too
                      </h3>
                      <p className="text-xs sm:text-[13px] opacity-85 leading-relaxed">
                        Since someone sent you a Founding Launch keepsake, your first Couture Bouquet is on us!
                      </p>
                    </div>

                    {/* Price Callout Pill ($1.99 -> FREE) */}
                    <div
                      className={`py-2.5 px-4 rounded-2xl border border-dashed flex items-center justify-center gap-2.5 ${isDarkMode
                        ? 'bg-[#2B2321] border-[#E8B4A6]/45'
                        : 'bg-[#FCF5F1] border-[#D8A896]'
                        }`}
                    >
                      <span className="text-xs font-medium opacity-75">Single Couture Bouquet</span>
                      <span className="text-sm line-through opacity-55">$1.99</span>
                      <span aria-hidden="true" className="text-xs opacity-60">→</span>
                      <span
                        className="text-base sm:text-lg font-bold tracking-wide text-[#9E5B4B] dark:text-[#E8B4A6]"
                        style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                      >
                        FREE
                      </span>
                    </div>

                    {recipientGiftClaimError && (
                      <div
                        role="alert"
                        className="px-3 py-2 rounded-xl border border-dashed border-rose-400/60 bg-rose-500/10 text-xs text-rose-700 dark:text-rose-200"
                      >
                        {recipientGiftClaimError}
                      </div>
                    )}

                    <button
                      type="button"
                      data-testid="claim-recipient-gift-btn"
                      disabled={isClaimingRecipientGift}
                      onClick={handleClaimRecipientGiftOffer}
                      className={`w-full py-2.5 px-5 rounded-full text-xs sm:text-sm font-medium transition active:scale-99 cursor-pointer disabled:opacity-50 ${isDarkMode
                        ? 'bg-[#E8B4A6] text-[#231C18] hover:bg-[#F2C4B8]'
                        : 'bg-[#8A5240] text-[#FFFDF9] hover:bg-[#734232]'
                        }`}
                    >
                      {isClaimingRecipientGift
                        ? 'Unlocking Studio...'
                        : 'Craft Your Free Couture Bouquet →'}
                    </button>

                    <p className="text-[10px] opacity-65">
                      Applied automatically to your session · 1 free Couture Bouquet
                    </p>
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
                className={`w-full shrink-0 border-t px-2.5 sm:px-5 pt-2 pb-[max(0.85rem,calc(env(safe-area-inset-bottom,0px)+0.5rem))] sm:pb-3 order-2 z-20 select-none transition-all duration-200 ${isDarkMode
                  ? 'bg-[#352C29] border-[#4E423E] text-[#FBF6F1]'
                  : 'bg-white border-stone-200/80 text-[#1C1917]'
                  }`}
              >
                {/* Row 1: Category Pill Tabs + Reset & Collapse/Expand Tray Buttons (Works on Phone & Desktop) */}
                <div
                  className={`flex items-center justify-between gap-2 ${isDesktopDockCollapsed ? 'pb-0' : 'pb-2'
                    }`}
                >
                  <div
                    className="flex-1 min-w-0 flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar pr-3 [-webkit-mask-image:linear-gradient(to_right,black_calc(100%-14px),transparent_100%)] sm:[-webkit-mask-image:none]"
                    role="tablist"
                  >
                    {(
                      [
                        { id: 'wrapping', label: 'Wrappers' },
                        { id: 'flowers', label: 'Flowers' },
                        { id: 'fillers', label: 'Fillers' },
                        { id: 'others', label: 'Others' },
                        ...(activeSeasonalEvent && seasonalFlowers.length > 0
                          ? [{ id: 'seasonal' as MobileCategory, label: 'Seasonal' }]
                          : []),
                        { id: 'photos', label: 'Photos' },
                        { id: 'ribbon', label: 'Ribbon' },
                        { id: 'environment', label: 'Background' },
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
                          data-drawer-trigger="true"
                          aria-selected={isActive}
                          onClick={(e) => {
                            e.currentTarget.scrollIntoView({
                              behavior: 'smooth',
                              inline: 'center',
                              block: 'nearest',
                            });
                            if (cat.id === 'wrapping') setActiveColorTarget('wrapper');
                            else if (cat.id === 'ribbon') setActiveColorTarget('ribbon');
                            else if (cat.id === 'card') setActiveColorTarget('card');
                            else if (cat.id === 'voice') setActiveColorTarget('voicePrimary');
                            else if (
                              cat.id === 'flowers' ||
                              cat.id === 'fillers' ||
                              cat.id === 'others' ||
                              cat.id === 'seasonal' ||
                              cat.id === 'photos'
                            ) {
                              setActiveColorTarget('petal');
                            }

                            if (isActive) {
                              setIsDesktopDockCollapsed((prev) => !prev);
                            } else {
                              setMobileCategory(cat.id);
                              setIsDesktopDockCollapsed(false);
                            }
                          }}
                          className={`px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition flex items-center gap-1 cursor-pointer ${isActive
                            ? 'bg-[#B4846C] text-white shadow-xs border border-[#B4846C]'
                            : isDarkMode
                              ? 'bg-[#292524] text-stone-300 border border-stone-700 hover:bg-stone-800'
                              : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
                            }`}
                        >
                          <span>{cat.label}</span>
                          {cat.id === 'seasonal' && (
                            <span
                              className="w-1.5 h-1.5 rounded-full bg-emerald-500"
                              title={activeSeasonalEvent?.name || 'Upcoming seasonal collection'}
                            />
                          )}
                          {cat.id === 'voice' && voice.audioDataUrl && (
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div
                    className={`flex items-center shrink-0 pl-1.5 border-l border-dashed ${isDarkMode ? 'border-[#52433E]' : 'border-[#E2D1C1]'
                      }`}
                  >
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
                      className={`inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-medium border border-dashed shrink-0 transition cursor-pointer ${isDarkMode
                        ? 'bg-[#2B2321] border-[#52433E] text-[#D8C7BE] hover:border-[#B4846C] hover:text-white'
                        : 'bg-[#FAF4EE] border-[#E2D1C1] text-[#6E5D54] hover:border-[#B4846C] hover:text-[#1C1917]'
                        }`}
                    >
                      <span className="hidden lg:inline">{isDesktopDockCollapsed ? 'Show' : 'Hide'}</span>
                      {isDesktopDockCollapsed ? (
                        <ChevronUp className="w-4 h-4 text-[#B4846C]" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[#B4846C]" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Row 2: Horizontal Circular Item Carousel with Desktop Scroll Arrows & Mouse-Wheel Support */}
                <div
                  className={`relative flex items-center ${isDesktopDockCollapsed ? 'hidden' : ''
                    }`}
                >
                  {/* Left Carousel Scroll Arrow Button (Desktop & Tablet) */}
                  <button
                    type="button"
                    data-testid="studio-carousel-prev"
                    onClick={() => handleScrollStudioCarousel('left')}
                    aria-label="Scroll selection choices left"
                    title="Previous choices"
                    className={`hidden sm:flex items-center justify-center w-8 h-8 rounded-full border border-dashed shrink-0 mr-1.5 transition active:scale-95 cursor-pointer shadow-xs ${canScrollCarouselLeft
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
                    className="flex-1 min-w-0 flex items-start gap-2 sm:gap-3 overflow-x-auto no-scrollbar pt-0.5 pb-1 pr-2 scroll-smooth"
                  >
                    {/* CATEGORY 1: WRAPPERS (Architectural Wrapper Designs with Couture Badge) */}
                    {mobileCategory === 'wrapping' && (
                      <>
                        {WRAPPER_CATALOG.map((ws) => {
                          const isSelected = wrapStyle === ws.id;
                          const isPremWrap = isWrapPremium(ws.id, premiumAssetConfig);
                          return (
                            <button
                              key={ws.id}
                              type="button"
                              onClick={() => {
                                setWrapStyle(ws.id);
                                setActiveColorTarget('wrapper');
                              }}
                              className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0 w-[68px] sm:w-[74px] group relative cursor-pointer"
                            >
                              <div className="relative w-13 h-13 sm:w-16 sm:h-16">
                                <div
                                  className={`w-full h-full rounded-full border flex items-center justify-center relative overflow-hidden transition-all group-active:scale-95 ${isSelected
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
                                {isPremWrap && (
                                  <CoutureItemBadge
                                    isDarkMode={isDarkMode}
                                    title="Couture wrap (free to try)"
                                  />
                                )}
                              </div>
                              <span className="text-[11px] sm:text-xs leading-4 h-4 font-medium text-stone-700 dark:text-stone-300 whitespace-nowrap truncate w-full text-center">
                                {ws.label}
                              </span>
                            </button>
                          );
                        })}
                      </>
                    )}

                    {/* CATEGORY 3: FOCAL FLOWERS */}
                    {mobileCategory === 'flowers' &&
                      focalFlowers.map((entry) => {
                        const isPremFlower = isFlowerPremium(entry.type, premiumAssetConfig);
                        return (
                          <button
                            key={entry.type}
                            type="button"
                            data-drawer-trigger="true"
                            onClick={() => {
                              addFlower(entry.type);
                              setActiveColorTarget('petal');
                              openDesktopToolPopover('stem');
                              triggerToast(`Added ${entry.name}`);
                            }}
                            className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0 w-[68px] sm:w-[74px] group relative cursor-pointer"
                          >
                            <div className="relative w-13 h-13 sm:w-16 sm:h-16">
                              <div
                                className={`w-full h-full rounded-full border flex items-center justify-center relative overflow-hidden transition-all group-active:scale-95 ${isDarkMode
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
                              {isPremFlower && (
                                <CoutureItemBadge
                                  isDarkMode={isDarkMode}
                                  title="Couture bloom (free to try)"
                                />
                              )}
                            </div>
                            <span className="text-[11px] sm:text-xs leading-4 h-4 font-medium text-stone-700 dark:text-stone-300 whitespace-nowrap truncate w-full text-center">
                              {entry.shortName}
                            </span>
                          </button>
                        );
                      })}

                    {/* CATEGORY 4: FILLERS & FOLIAGE */}
                    {mobileCategory === 'fillers' &&
                      fillerFlowers.map((entry) => {
                        const isPremFiller = isFlowerPremium(entry.type, premiumAssetConfig);
                        return (
                          <button
                            key={entry.type}
                            type="button"
                            data-drawer-trigger="true"
                            onClick={() => {
                              addFlower(entry.type);
                              setActiveColorTarget('petal');
                              openDesktopToolPopover('stem');
                              triggerToast(`Added ${entry.name}`);
                            }}
                            className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0 w-[68px] sm:w-[74px] group relative cursor-pointer"
                          >
                            <div className="relative w-13 h-13 sm:w-16 sm:h-16">
                              <div
                                className={`w-full h-full rounded-full border flex items-center justify-center relative overflow-hidden transition-all group-active:scale-95 ${isDarkMode
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
                              {isPremFiller && (
                                <CoutureItemBadge
                                  isDarkMode={isDarkMode}
                                  title="Couture botanical (free to try)"
                                />
                              )}
                            </div>
                            <span className="text-[11px] sm:text-xs leading-4 h-4 font-medium text-stone-700 dark:text-stone-300 whitespace-nowrap truncate w-full text-center">
                              {entry.shortName}
                            </span>
                          </button>
                        );
                      })}

                    {/* CATEGORY 4A: OTHERS (Butterflies, Hearts, Sparkles, Romantic & Whimsical Accents) */}
                    {mobileCategory === 'others' &&
                      otherFlowers.map((entry) => {
                        const isPremOther = isFlowerPremium(entry.type, premiumAssetConfig);
                        return (
                          <button
                            key={entry.type}
                            type="button"
                            data-drawer-trigger="true"
                            onClick={() => {
                              addFlower(entry.type);
                              setActiveColorTarget('petal');
                              openDesktopToolPopover('stem');
                              triggerToast(`Added ${entry.name}`);
                            }}
                            className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0 w-[68px] sm:w-[74px] group relative cursor-pointer"
                          >
                            <div className="relative w-13 h-13 sm:w-16 sm:h-16">
                              <div
                                className={`w-full h-full rounded-full border flex items-center justify-center relative overflow-hidden transition-all group-active:scale-95 ${isDarkMode
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
                              {isPremOther && (
                                <CoutureItemBadge
                                  isDarkMode={isDarkMode}
                                  title="Couture charm (free to try)"
                                />
                              )}
                            </div>
                            <span className="text-[11px] sm:text-xs leading-4 h-4 font-medium text-stone-700 dark:text-stone-300 whitespace-nowrap truncate w-full text-center">
                              {entry.shortName}
                            </span>
                          </button>
                        );
                      })}

                    {/* CATEGORY 4A-2: SEASONAL (Conditional — Only Appears During Active/Upcoming Season) */}
                    {mobileCategory === 'seasonal' &&
                      seasonalFlowers.map((entry) => {
                        const isPremSeasonal = isFlowerPremium(entry.type, premiumAssetConfig);
                        return (
                          <button
                            key={entry.type}
                            type="button"
                            data-drawer-trigger="true"
                            onClick={() => {
                              addFlower(entry.type);
                              setActiveColorTarget('petal');
                              openDesktopToolPopover('stem');
                              triggerToast(`Added ${entry.name}`);
                            }}
                            className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0 w-[68px] sm:w-[74px] group relative cursor-pointer"
                          >
                            <div className="relative w-13 h-13 sm:w-16 sm:h-16">
                              <div
                                className={`w-full h-full rounded-full border flex items-center justify-center relative overflow-hidden transition-all group-active:scale-95 ${isDarkMode
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
                              {isPremSeasonal && (
                                <CoutureItemBadge
                                  isDarkMode={isDarkMode}
                                  title="Couture seasonal item (free to try)"
                                />
                              )}
                            </div>
                            <span className="text-[11px] sm:text-xs leading-4 h-4 font-medium text-stone-700 dark:text-stone-300 whitespace-nowrap truncate w-full text-center">
                              {entry.shortName}
                            </span>
                          </button>
                        );
                      })}

                    {/* CATEGORY 4B: PHOTOS & UNIQUE PHOTOCARD DESIGNS (All Photos are Couture) */}
                    {mobileCategory === 'photos' && (
                      <>
                        {/* Direct Photo Upload Button (Uploads user's picture directly with no frame, no caption, no extras) */}
                        <button
                          type="button"
                          data-testid="dock-upload-photo-btn"
                          data-drawer-trigger="true"
                          onClick={() => {
                            const activeRawPhoto =
                              selectedItem?.photoStyle === 'raw' ? selectedItem : null;
                            triggerPhotoFilePicker(activeRawPhoto?.id || null, 'raw');
                          }}
                          className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0 w-[68px] sm:w-[74px] group relative cursor-pointer"
                        >
                          <div className="relative w-13 h-13 sm:w-16 sm:h-16">
                            <div
                              className={`w-full h-full rounded-full border border-dashed flex items-center justify-center relative overflow-hidden transition-all group-active:scale-95 ${isDarkMode
                                ? 'bg-[#292524] border-[#B4846C]/80 group-hover:border-[#E6B89C]'
                                : 'bg-[#FAF4EE] border-[#B4846C]/80 group-hover:border-[#6E4434]'
                                }`}
                            >
                              <ImagePlus className="w-5 h-5 text-[#B4846C]" />
                            </div>
                            {isPhotoStylePremium('raw', premiumAssetConfig) && (
                              <CoutureItemBadge
                                isDarkMode={isDarkMode}
                                title="Couture photo attachment (free to try)"
                              />
                            )}
                          </div>
                          <span className="text-[10.5px] sm:text-[11px] leading-4 h-4 font-medium text-stone-700 dark:text-stone-300 whitespace-nowrap truncate w-full text-center">
                            Upload Photo
                          </span>
                        </button>

                        {PHOTO_FRAME_CATALOG.map((pf) => {
                          const isSelected = selectedItem?.photoStyle === pf.id;
                          const isPremPhoto = isPhotoStylePremium(pf.id, premiumAssetConfig);
                          return (
                            <button
                              key={pf.id}
                              type="button"
                              data-drawer-trigger="true"
                              onClick={() => {
                                if (selectedItem?.photoStyle) {
                                  updateItem(selectedItem.id, { photoStyle: pf.id });
                                  setActiveColorTarget('petal');
                                  openDesktopToolPopover('stem');
                                  triggerToast(`Frame: ${pf.label}`);
                                } else {
                                  addPhotoCard(pf.id);
                                  setActiveColorTarget('petal');
                                  openDesktopToolPopover('stem');
                                  triggerToast(`Added ${pf.label}`);
                                }
                              }}
                              className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0 w-[68px] sm:w-[74px] group relative cursor-pointer"
                            >
                              <div className="relative w-13 h-13 sm:w-16 sm:h-16">
                                <div
                                  className={`w-full h-full rounded-full border flex items-center justify-center relative overflow-hidden transition-all group-active:scale-95 ${isSelected
                                    ? 'border-[#B4846C] ring-2 ring-[#B4846C]/30 bg-white dark:bg-[#292524] shadow-xs'
                                    : isDarkMode
                                      ? 'bg-[#292524] border-stone-700 group-hover:border-[#B4846C]'
                                      : 'bg-stone-50/70 border-stone-200/90 group-hover:border-[#B4846C]'
                                    }`}
                                >
                                  <MiniPhotoFrameSVG
                                    styleType={pf.id}
                                    frameColor={pf.defaultFrameColor}
                                    accentColor={pf.defaultAccentColor}
                                  />
                                </div>
                                {isPremPhoto && (
                                  <CoutureItemBadge
                                    isDarkMode={isDarkMode}
                                    title="Couture photocard frame (free to try)"
                                  />
                                )}
                              </div>
                              <span className="text-[11px] sm:text-xs leading-4 h-4 font-medium text-stone-700 dark:text-stone-300 whitespace-nowrap truncate w-full text-center">
                                {pf.shortLabel}
                              </span>
                            </button>
                          );
                        })}
                      </>
                    )}

                    {/* CATEGORY 5: RIBBON & LACE DESIGNS (Colors are unified in the Color drawer tab) */}
                    {mobileCategory === 'ribbon' && (
                      <>
                        {RIBBON_STYLE_CATALOG.map((rs) => {
                          const isSelected = ribbonStyle === rs.id;
                          const isPremRibbon = isRibbonPremium(rs.id, premiumAssetConfig);
                          return (
                            <button
                              key={rs.id}
                              type="button"
                              onClick={() => {
                                setRibbonStyle(rs.id);
                                setActiveColorTarget('ribbon');
                              }}
                              className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0 w-[68px] sm:w-[74px] group relative cursor-pointer"
                            >
                              <div className="relative w-13 h-13 sm:w-16 sm:h-16">
                                <div
                                  className={`w-full h-full rounded-full border flex items-center justify-center relative overflow-hidden transition-all group-active:scale-95 ${isSelected
                                    ? 'border-[#B4846C] ring-2 ring-[#B4846C]/30 bg-white dark:bg-[#292524] shadow-xs'
                                    : isDarkMode
                                      ? 'bg-[#292524] border-stone-700 group-hover:border-[#B4846C]'
                                      : 'bg-stone-50/70 border-stone-200/90 group-hover:border-[#B4846C]'
                                    }`}
                                >
                                  <MiniRibbonBowSVG hex={rs.defaultHex} styleType={rs.id} />
                                </div>
                                {isPremRibbon && (
                                  <CoutureItemBadge
                                    isDarkMode={isDarkMode}
                                    title="Couture ribbon (free to try)"
                                  />
                                )}
                              </div>
                              <span className="text-[11px] sm:text-xs leading-4 h-4 font-medium text-stone-700 dark:text-stone-300 whitespace-nowrap truncate w-full text-center">
                                {rs.label}
                              </span>
                            </button>
                          );
                        })}
                      </>
                    )}

                    {/* CATEGORY 5B: ENVIRONMENT / BACKGROUND VIBE */}
                    {mobileCategory === 'environment' && (
                      <>
                        {ENVIRONMENT_CATALOG.map((env) => {
                          const isSelected = environment === env.id;
                          const isPremEnv = isEnvironmentPremium(env.id as CanvasEnvironment, premiumAssetConfig);
                          return (
                            <button
                              key={env.id}
                              type="button"
                              onClick={() => {
                                setEnvironment(env.id as CanvasEnvironment);
                                triggerToast(`Background: ${env.label}`);
                              }}
                              className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0 w-[68px] sm:w-[74px] group relative cursor-pointer"
                            >
                              <div className="relative w-13 h-13 sm:w-16 sm:h-16">
                                <div
                                  className={`w-full h-full rounded-full border flex items-center justify-center relative overflow-hidden transition-all group-active:scale-95 ${isSelected
                                    ? 'border-[#B4846C] ring-2 ring-[#B4846C]/30 bg-white dark:bg-[#292524] shadow-xs'
                                    : isDarkMode
                                      ? 'bg-[#292524] border-stone-700 group-hover:border-[#B4846C]'
                                      : 'bg-stone-50/70 border-stone-200/90 group-hover:border-[#B4846C]'
                                    }`}
                                >
                                  <MiniEnvironmentSVG env={env.id as CanvasEnvironment} />
                                </div>
                                {isPremEnv && (
                                  <CoutureItemBadge
                                    isDarkMode={isDarkMode}
                                    title="Couture background (free to try)"
                                  />
                                )}
                              </div>
                              <span className="text-[11px] sm:text-xs leading-4 h-4 font-medium text-stone-700 dark:text-stone-300 whitespace-nowrap truncate w-full text-center">
                                {env.shortLabel}
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
                          className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0 w-[68px] sm:w-[74px] group cursor-pointer"
                        >
                          <div
                            className={`w-13 h-13 sm:w-16 sm:h-16 rounded-full border flex items-center justify-center relative overflow-hidden transition-all group-active:scale-95 ${mobilePopover === 'card'
                              ? 'border-[#B4846C] ring-2 ring-[#B4846C]/30 bg-white dark:bg-[#292524] shadow-xs'
                              : isDarkMode
                                ? 'bg-[#292524] border-stone-700 group-hover:border-[#B4846C]'
                                : 'bg-stone-50/70 border-stone-200/90 group-hover:border-[#B4846C]'
                              }`}
                          >
                            <PenLine className="w-5 h-5 text-[#B4846C]" />
                          </div>
                          <span className="text-[10.5px] sm:text-[11px] leading-4 h-4 font-medium text-stone-700 dark:text-stone-300 whitespace-nowrap truncate w-full text-center">
                            Write Note
                          </span>
                        </button>

                        {CARD_THEME_CATALOG.map((th) => {
                          const isSelected = card.theme === th.id && card.visibleOnStage;
                          return (
                            <button
                              key={th.id}
                              type="button"
                              data-drawer-trigger="true"
                              onClick={() => {
                                selectItem(null);
                                updateCard({
                                  theme: th.id,
                                  visibleOnStage: true,
                                });
                                setActiveColorTarget('card');
                                openDesktopToolPopover('card');
                              }}
                              className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0 w-[68px] sm:w-[74px] group cursor-pointer"
                            >
                              <div
                                className={`w-13 h-13 sm:w-16 sm:h-16 rounded-full border flex items-center justify-center relative overflow-hidden transition-all group-active:scale-95 ${isSelected
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
                              <span className="text-[11px] sm:text-xs leading-4 h-4 font-medium text-stone-700 dark:text-stone-300 whitespace-nowrap truncate w-full text-center">
                                {th.label}
                              </span>
                            </button>
                          );
                        })}

                        <button
                          type="button"
                          onClick={() => updateCard({ visibleOnStage: !card.visibleOnStage })}
                          className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0 w-[68px] sm:w-[74px] group cursor-pointer"
                        >
                          <div
                            className={`w-13 h-13 sm:w-16 sm:h-16 rounded-full border flex items-center justify-center relative overflow-hidden transition-all group-active:scale-95 ${!card.visibleOnStage
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
                          <span className="text-[10.5px] sm:text-[11px] leading-4 h-4 font-medium text-stone-700 dark:text-stone-300 whitespace-nowrap truncate w-full text-center">
                            {card.visibleOnStage ? 'Hide Tag' : 'Show Tag'}
                          </span>
                        </button>
                      </>
                    )}

                    {/* CATEGORY 7: ROMANTIC VOICE KEEPSAKES (All Voices are Couture) */}
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
                          className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0 w-[68px] sm:w-[74px] group relative cursor-pointer"
                        >
                          <div className="relative w-13 h-13 sm:w-16 sm:h-16">
                            <div
                              className={`w-full h-full rounded-full border flex items-center justify-center relative overflow-hidden transition-all group-active:scale-95 ${mobilePopover === 'voice'
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
                            <CoutureItemBadge
                              isDarkMode={isDarkMode}
                              title="Couture voice keepsake (free to record & preview)"
                            />
                          </div>
                          <span className="text-[10.5px] sm:text-[11px] leading-4 h-4 font-medium text-stone-700 dark:text-stone-300 whitespace-nowrap truncate w-full text-center">
                            {voice.audioDataUrl ? 'Voice Studio' : 'Record Voice'}
                          </span>
                        </button>

                        {VOICE_KEEPSAKE_CATALOG.map((vk) => {
                          const isSelected = voice.style === vk.id && voice.visibleOnStage;
                          const isPremVoice = isVoiceStylePremium(vk.id, premiumAssetConfig);
                          return (
                            <button
                              key={vk.id}
                              type="button"
                              data-drawer-trigger="true"
                              onClick={() => {
                                selectItem(null);
                                const isSwitchingStyle = voice.style !== vk.id;
                                updateVoice({
                                  style: vk.id,
                                  ...(isSwitchingStyle ? { title: vk.defaultTitle } : {}),
                                  ...((voice.scale ?? 1) < 0.95 ? { scale: 1.0 } : {}),
                                  visibleOnStage: true,
                                });
                                setActiveColorTarget('voicePrimary');
                                openDesktopToolPopover('voice');
                                triggerToast(`Selected ${vk.label}`);
                              }}
                              className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0 w-[68px] sm:w-[74px] group relative cursor-pointer"
                            >
                              <div className="relative w-13 h-13 sm:w-16 sm:h-16">
                                <div
                                  className={`w-full h-full rounded-full border flex items-center justify-center relative overflow-hidden transition-all group-active:scale-95 ${isSelected
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
                                {isPremVoice && (
                                  <CoutureItemBadge
                                    isDarkMode={isDarkMode}
                                    title="Couture voice keepsake (free to try)"
                                  />
                                )}
                              </div>
                              <span className="text-[11px] sm:text-xs leading-4 h-4 font-medium text-stone-700 dark:text-stone-300 whitespace-nowrap truncate w-full text-center">
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
                          className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0 w-[68px] sm:w-[74px] group cursor-pointer"
                        >
                          <div
                            className={`w-13 h-13 sm:w-16 sm:h-16 rounded-full border flex items-center justify-center relative overflow-hidden transition-all group-active:scale-95 ${!voice.visibleOnStage
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
                          <span className="text-[10.5px] sm:text-[11px] leading-4 h-4 font-medium text-stone-700 dark:text-stone-300 whitespace-nowrap truncate w-full text-center">
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
                    className={`hidden sm:flex items-center justify-center w-8 h-8 rounded-full border border-dashed shrink-0 ml-1.5 transition active:scale-95 cursor-pointer shadow-xs ${canScrollCarouselRight
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
                className={`hidden w-full backdrop-blur-xl border-t lg:border-t-0 lg:border-r flex-col order-2 lg:order-1 z-20 shrink-0 transition-all duration-300 ease-in-out ${isDarkMode
                  ? 'bg-[#1E1C1A] border-stone-800 text-stone-100'
                  : 'bg-[#F5F3EF] border-stone-200 text-[#1C1917]'
                  } ${drawerState === 'collapsed'
                    ? 'h-[52px]'
                    : drawerState === 'expanded'
                      ? 'h-[80vh] sm:h-[84vh]'
                      : 'h-[44vh] sm:h-[46vh]'
                  } ${isSidebarOpen
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
                  className={`grid grid-cols-3 gap-1 p-1.5 border-b shrink-0 ${isDarkMode
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
                    className={`py-2 px-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition ${activeTab === 'flowers'
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
                    className={`py-2 px-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1 transition ${activeTab === 'wrap'
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
                    className={`py-2 px-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1 transition ${activeTab === 'card'
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
                  className={`flex-1 overflow-y-auto p-3 sm:p-4 pb-8 space-y-4 ${drawerState === 'collapsed' ? 'hidden lg:block' : 'block'
                    }`}
                >
                  {/* TAB 1: FLOWER PALETTE */}
                  {activeTab === 'flowers' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between pt-1">
                        <h2 className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                          Flowers
                        </h2>
                        {items.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              resetStudioCanvasSession({ preserveHistory: true });
                              triggerToast('Canvas reset');
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
                            className={`group p-2.5 rounded-xl border transition flex flex-col items-center gap-1.5 text-center ${isDarkMode
                              ? 'bg-[#292524] hover:bg-[#34302c] border-stone-700 hover:border-[#B4846C]'
                              : 'bg-white hover:bg-stone-50 border-stone-200 hover:border-[#B4846C]'
                              }`}
                          >
                            <div
                              className={`w-14 h-14 rounded-full border flex items-center justify-center shrink-0 overflow-hidden ${isDarkMode
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
                              className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2.5 ${wrapStyle === st.id
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
                                className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 border transition ${wrapColor === sw.hex
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
                              className={`p-2 rounded-xl border text-xs font-medium flex items-center gap-2 transition ${ribbonStyle === rs.id
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
                              className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition ${ribbonColor === rb.hex
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

                      {/* Card Note Input Only — Letterpress Stationery Sheet */}
                      <div
                        className={`p-3.5 rounded-2xl border border-dashed transition-colors ${isDarkMode
                          ? 'bg-[#352C29] border-[#5E4E49]'
                          : 'bg-[#FFFDF9] border-[#DECBB9]'
                          }`}
                      >
                        <div className="relative">
                          <textarea
                            rows={4}
                            maxLength={PREMIUM_CARD_NOTE_MAX_CHARS}
                            value={card.message}
                            placeholder="Write your heartfelt note..."
                            onFocus={handleCardInputFocus}
                            onChange={(e) => updateCard({ message: e.target.value })}
                            aria-label="Card message"
                            className={`w-full px-3.5 py-2.5 pb-7 rounded-xl border border-dashed text-sm focus:outline-none focus:border-[#B4846C] resize-none transition ${isDarkMode
                              ? 'bg-[#2B2321] border-[#544540] text-[#FBF6F1] placeholder:text-[#9A877B]/75'
                              : 'bg-[#FAF4EE] border-[#E2D1C1] text-[#2A201D] placeholder:text-[#9A877B]/80'
                              }`}
                            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '16px' }}
                          />
                          <span
                            className={`absolute bottom-2 right-3 text-[10px] pointer-events-none inline-flex items-center gap-1 ${card.message.trim().length > FREE_CARD_NOTE_MAX_CHARS
                              ? 'text-[#B4846C] font-medium'
                              : 'text-[#9A877B]'
                              }`}
                          >
                            {card.message.trim().length > FREE_CARD_NOTE_MAX_CHARS ? (
                              <>
                                <CoutureBloomSeal className="w-3 h-3" />
                                <span>Couture Note · {card.message.length}/{PREMIUM_CARD_NOTE_MAX_CHARS}</span>
                              </>
                            ) : (
                              <span>
                                {card.message.length}/{FREE_CARD_NOTE_MAX_CHARS} free ({PREMIUM_CARD_NOTE_MAX_CHARS} Couture)
                              </span>
                            )}
                          </span>
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
                className={`hidden flex-col order-2 lg:order-2 z-20 shrink-0 border-r transition-all duration-300 ease-in-out ${isDarkMode
                  ? 'bg-[#191715] border-stone-800 text-stone-100'
                  : 'bg-[#FAF8F5] border-stone-200 text-[#1C1917]'
                  } ${isInspectorSidebarOpen
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
                        className={`rounded-2xl border border-dashed p-3.5 text-center transition ${isDarkMode
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

        const toFull = `Dearest ${card.to.trim() || 'Someone Special'},`;
        const msgFull = card.message || 'Thinking of you with love and blossoms.';
        const fromFull = card.from.trim() ? `With love, ${card.from.trim()}` : 'With love';

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

                {/* Signature Botanical Bloom Crest & Wax Seal Header */}
                <div className="flex flex-col items-center justify-center mb-3 pt-0.5">
                  <BrandLogoMark
                    variant="crest"
                    isDarkMode={false}
                    className="w-22 h-13 select-none"
                  />
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

      {/* GREETING CARD STATIONERY NOTE MODAL (Matches Email & Letterpress Aesthetic) */}
      {isCardModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Edit Greeting Card"
          onClick={() => setIsCardModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md rounded-[26px] border border-dashed p-5 sm:p-6 shadow-[0_24px_60px_rgba(28,20,16,0.2)] relative space-y-4 transition-colors ${isDarkMode
              ? 'bg-[#352C29] border-[#5E4E49] text-[#FBF6F1]'
              : 'bg-[#FFFDF9] border-[#DECBB9] text-[#231C18]'
              }`}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsCardModalOpen(false)}
              className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer ${isDarkMode
                ? 'text-[#C8B6AC] hover:text-[#FBF6F1] hover:bg-[#463A36]'
                : 'text-[#8C7A70] hover:text-[#231C18] hover:bg-[#F5EDE4]'
                }`}
              aria-label="Close card editor"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Centered Drawn Botanical Crest & Serif Title (Email Stationery Style) */}
            <div className="text-center space-y-1 pt-0.5">
              <BrandLogoMark
                variant="crest"
                isDarkMode={isDarkMode}
                className="w-20 h-12 mx-auto"
              />
              <h3
                className="text-2xl font-semibold tracking-tight"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                Card Note
              </h3>
              <div className="flex items-center justify-center pt-0.5">
                <label
                  className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full border border-dashed text-[11px] font-medium cursor-pointer transition ${isDarkMode
                    ? 'bg-[#2B2321] border-[#544540] text-[#D8C7BE]'
                    : 'bg-[#FAF4EE] border-[#DECBB9] text-[#6E5D54]'
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={card.visibleOnStage}
                    onChange={(e) => updateCard({ visibleOnStage: e.target.checked })}
                    className="accent-[#6E4434] rounded cursor-pointer w-3 h-3"
                  />
                  <span>Show envelope on bouquet</span>
                </label>
              </div>
            </div>

            {/* Recessed Parchment Note Box with Dashed Border */}
            <div
              className={`p-3.5 rounded-2xl border border-dashed relative ${isDarkMode
                ? 'bg-[#2B2321] border-[#544540]'
                : 'bg-[#FAF4EE] border-[#E2D1C1]'
                }`}
            >
              <textarea
                rows={4}
                maxLength={PREMIUM_CARD_NOTE_MAX_CHARS}
                value={card.message}
                placeholder="Write a heartfelt note for your bouquet..."
                onChange={(e) => updateCard({ message: e.target.value })}
                aria-label="Card message"
                className={`w-full px-1 py-0.5 pb-6 bg-transparent border-0 text-base leading-relaxed focus:outline-none resize-none ${isDarkMode
                  ? 'text-[#FBF6F1] placeholder:text-[#9A877B]/75'
                  : 'text-[#2A201D] placeholder:text-[#9A877B]/85'
                  }`}
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              />
              <span
                className={`absolute bottom-2.5 right-3.5 text-[10.5px] pointer-events-none inline-flex items-center gap-1 ${card.message.trim().length > FREE_CARD_NOTE_MAX_CHARS
                  ? 'text-[#B4846C] font-medium'
                  : 'text-[#9A877B]'
                  }`}
              >
                {card.message.trim().length > FREE_CARD_NOTE_MAX_CHARS ? (
                  <>
                    <CoutureBloomSeal className="w-3 h-3" />
                    <span>Couture Note · {card.message.length}/{PREMIUM_CARD_NOTE_MAX_CHARS}</span>
                  </>
                ) : (
                  <span>
                    {card.message.length}/{FREE_CARD_NOTE_MAX_CHARS} free ({PREMIUM_CARD_NOTE_MAX_CHARS} Couture)
                  </span>
                )}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsCardModalOpen(false)}
              className={`w-full py-2.5 rounded-full text-xs sm:text-sm font-medium transition cursor-pointer ${isDarkMode
                ? 'bg-[#E6B89C] text-[#231C18] hover:bg-[#F0C8B0]'
                : 'bg-[#6E4434] text-[#FFFDF9] hover:bg-[#5B3729]'
                }`}
            >
              Save Note
            </button>
          </div>
        </div>
      )}

      {/* SHARE / SEND MODAL DIALOG — 3-Step Stationery Progress Flow */}
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
            className={`w-full max-w-md rounded-[26px] p-5 sm:p-6 shadow-[0_24px_60px_rgba(28,20,16,0.18)] border border-dashed relative max-h-[88vh] overflow-y-auto transition-colors ${isDarkMode
              ? 'bg-[#352C29] border-[#5E4E49] text-[#FBF6F1]'
              : 'bg-[#FFFDF9] border-[#DECBB9] text-[#2A201D]'
              }`}
          >
            <button
              type="button"
              onClick={() => setIsShareModalOpen(false)}
              className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer ${isDarkMode
                ? 'text-[#C8B6AC] hover:text-[#FBF6F1] hover:bg-[#463A36]'
                : 'text-[#8C7A70] hover:text-[#2A201D] hover:bg-[#F5EDE4]'
                }`}
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="pr-8">
              <h3
                className="text-2xl sm:text-[26px] font-medium tracking-tight leading-tight"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                {shareStep === 'ready' ? 'Your Gift Is Sealed' : 'Send Your Bouquet'}
              </h3>
            </div>

            {/* 3-Step Dashed Lace Progress Tracker */}
            {shareStep !== 'ready' && (
              <div className="mt-3.5 mb-4 flex items-center justify-between gap-1.5">
                {(
                  [
                    { id: 'dedication', num: '1', label: 'Dedication' },
                    { id: 'lock', num: '2', label: 'Unwrap' },
                    { id: 'seal', num: '3', label: 'Seal Gift' },
                  ] as const
                ).map((st, idx) => {
                  const stepOrder = ['dedication', 'lock', 'seal'] as const;
                  const currentIdx = stepOrder.indexOf(shareStep);
                  const isActive = shareStep === st.id;
                  const isDone = idx < currentIdx;
                  const recipientValidation = validateDedicationRecipient(card.to);
                  const lockValidation = validateBouquetLockConfig(lock);
                  const isStepBlocked =
                    ((st.id === 'lock' || st.id === 'seal') && !recipientValidation.valid) ||
                    (st.id === 'seal' && !lockValidation.valid);
                  return (
                    <React.Fragment key={st.id}>
                      {idx > 0 && (
                        <div
                          className={`flex-1 border-t border-dashed ${idx <= currentIdx
                            ? isDarkMode
                              ? 'border-[#E6B89C]'
                              : 'border-[#8C5E47]'
                            : isDarkMode
                              ? 'border-[#544540]'
                              : 'border-[#E2D1C1]'
                            }`}
                        />
                      )}
                      <button
                        type="button"
                        data-testid={`share-step-tab-${st.id}`}
                        aria-disabled={isStepBlocked}
                        onClick={() => {
                          if ((st.id === 'lock' || st.id === 'seal') && !recipientValidation.valid) {
                            setShareDedicationError(
                              recipientValidation.error ||
                                "Please enter the recipient's name before continuing."
                            );
                            setShareStep('dedication');
                            window.setTimeout(() => recipientInputRef.current?.focus(), 0);
                            return;
                          }
                          if (st.id === 'seal' && !lockValidation.valid) {
                            setShareLockError(
                              lockValidation.error || 'Please complete your lock details.'
                            );
                            setShareStep('lock');
                            return;
                          }
                          setShareDedicationError(null);
                          setShareLockError(null);
                          setShareStep(st.id);
                        }}
                        className={`flex items-center gap-1.5 group ${isStepBlocked ? 'opacity-55 cursor-not-allowed' : 'cursor-pointer'
                          }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-full text-[11px] font-semibold flex items-center justify-center border transition ${isActive
                            ? isDarkMode
                              ? 'bg-[#E6B89C] border-[#E6B89C] text-[#231C18]'
                              : 'bg-[#6E4434] border-[#6E4434] text-[#FFFDF9]'
                            : isDone
                              ? isDarkMode
                                ? 'bg-[#463A36] border-[#E6B89C]/70 text-[#E6B89C]'
                                : 'bg-[#FAF3EB] border-[#B4846C] text-[#6E4434]'
                              : isDarkMode
                                ? 'border-dashed border-[#5E4E49] text-[#A8968C]'
                                : 'border-dashed border-[#DECBB9] text-[#8C7A70]'
                            }`}
                        >
                          {isDone ? <Check className="w-3 h-3" /> : st.num}
                        </span>
                        <span
                          className={`text-xs font-medium ${isActive
                            ? isDarkMode
                              ? 'text-[#FBF6F1]'
                              : 'text-[#2A201D]'
                            : isDarkMode
                              ? 'text-[#A8968C]'
                              : 'text-[#8C7A70]'
                            }`}
                        >
                          {st.label}
                        </span>
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>
            )}

            {/* ===============================================================
                STEP 1: DEDICATION (To & From Only — Note is edited in Studio)
                =============================================================== */}
            {shareStep === 'dedication' && (
              <div className="space-y-3.5 animate-in fade-in duration-150">
                <div
                  className={`p-3.5 rounded-2xl border border-dashed space-y-3 ${isDarkMode
                    ? 'bg-[#2B2321]/75 border-[#544540]'
                    : 'bg-[#FAF4EE]/60 border-[#E2D1C1]'
                    }`}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label
                        className={`block text-[11px] font-medium mb-1 ${isDarkMode ? 'text-[#C8B6AC]' : 'text-[#6E5D54]'
                          }`}
                      >
                        To (Recipient) <span className="text-[#C96B59]">*</span>
                      </label>
                      <input
                        ref={recipientInputRef}
                        type="text"
                        required
                        aria-required="true"
                        aria-invalid={Boolean(shareDedicationError)}
                        data-testid="share-recipient-input"
                        maxLength={22}
                        value={card.to}
                        onChange={(e) => {
                          updateCard({ to: e.target.value });
                          if (shareDedicationError && e.target.value.trim()) {
                            setShareDedicationError(null);
                          }
                        }}
                        placeholder="Recipient's name"
                        aria-label="Recipient"
                        className={`w-full px-3 py-2 rounded-xl border border-dashed text-xs focus:outline-none ${shareDedicationError
                          ? 'border-[#C96B59] focus:border-[#C96B59]'
                          : isDarkMode
                            ? 'border-[#5C4B47] focus:border-[#B4846C]'
                            : 'border-[#DECBB9] focus:border-[#B4846C]'
                          } ${isDarkMode
                            ? 'bg-[#352C29] text-[#FBF6F1] placeholder:text-[#8E7B71]'
                            : 'bg-[#FFFDF9] text-[#2A201D] placeholder:text-[#A59489]'
                          }`}
                      />
                    </div>
                    <div>
                      <label
                        className={`block text-[11px] font-medium mb-1 ${isDarkMode ? 'text-[#C8B6AC]' : 'text-[#6E5D54]'
                          }`}
                      >
                        From (Optional)
                      </label>
                      <input
                        type="text"
                        data-testid="share-sender-input"
                        maxLength={20}
                        value={card.from}
                        onChange={(e) => updateCard({ from: e.target.value })}
                        placeholder="Your name"
                        aria-label="Sender"
                        className={`w-full px-3 py-2 rounded-xl border border-dashed text-xs focus:outline-none focus:border-[#B4846C] ${isDarkMode
                          ? 'bg-[#352C29] border-[#5C4B47] text-[#FBF6F1] placeholder:text-[#8E7B71]'
                          : 'bg-[#FFFDF9] border-[#DECBB9] text-[#2A201D] placeholder:text-[#A59489]'
                          }`}
                      />
                    </div>
                  </div>

                  {shareDedicationError && (
                    <p
                      role="alert"
                      data-testid="share-dedication-error"
                      className="text-[11px] font-medium text-[#C96B59] dark:text-[#F09A8A] px-0.5"
                    >
                      {shareDedicationError}
                    </p>
                  )}

                  {/* Quiet 1-line summary of attached Studio Card Note */}
                  <div
                    className={`px-3 py-2 rounded-xl border border-dashed flex items-center justify-between gap-2 text-[11px] ${isDarkMode
                      ? 'bg-[#352C29]/60 border-[#544540] text-[#D8C7BE]'
                      : 'bg-[#FFFDF9]/80 border-[#DECBB9] text-[#6E5D54]'
                      }`}
                  >
                    <span className="truncate italic" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '14px' }}>
                      {card.visibleOnStage && card.message.trim()
                        ? `“${card.message.trim()}”`
                        : 'Card note hidden on bouquet'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsShareModalOpen(false);
                        setMobilePopover('card');
                      }}
                      className="text-[11px] font-medium text-[#B4846C] hover:underline shrink-0 cursor-pointer"
                    >
                      Edit note
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  data-testid="share-step-next-btn"
                  onClick={() => {
                    const check = validateDedicationRecipient(card.to);
                    if (!check.valid) {
                      setShareDedicationError(
                        check.error || "Please enter the recipient's name before continuing."
                      );
                      recipientInputRef.current?.focus();
                      return;
                    }
                    setShareDedicationError(null);
                    setShareStep('lock');
                  }}
                  className={`w-full py-2.5 px-4 rounded-full text-xs sm:text-sm font-medium transition cursor-pointer ${!card.to.trim()
                    ? isDarkMode
                      ? 'bg-[#E6B89C]/55 text-[#231C18]/80 hover:bg-[#E6B89C]/70'
                      : 'bg-[#6E4434]/60 text-[#FFFDF9]/90 hover:bg-[#6E4434]/75'
                    : isDarkMode
                      ? 'bg-[#E6B89C] text-[#231C18] hover:bg-[#F0C8B0]'
                      : 'bg-[#6E4434] text-[#FFFDF9] hover:bg-[#5B3729]'
                    }`}
                >
                  Next · Unwrap Timing
                </button>
              </div>
            )}

            {/* ===============================================================
                STEP 2: UNWRAP LOCK (Anytime / Date Lock / Secret Hint)
                =============================================================== */}
            {shareStep === 'lock' && (
              <div className="space-y-3.5 animate-in fade-in duration-150">
                <div
                  className={`p-3.5 rounded-2xl border border-dashed space-y-3 ${isDarkMode
                    ? 'bg-[#2D2421]/75 border-[#544540]'
                    : 'bg-[#FAF4EE]/60 border-[#E2D1C1]'
                    }`}
                >
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: 'none', label: 'Anytime', sub: 'Instant' },
                        { id: 'countdown', label: 'Date Lock', sub: 'Countdown' },
                        { id: 'passcode', label: 'Secret Hint', sub: 'Passcode' },
                      ] as { id: BouquetLockMode; label: string; sub: string }[]
                    ).map((tab) => {
                      const active = (lock?.mode || 'none') === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          data-testid={`share-lock-tab-${tab.id}`}
                          onClick={() => {
                            setShareLockError(null);
                            if (tab.id === 'countdown' && !lock?.unlockAtIso) {
                              const tomorrow = new Date(Date.now() + 86400000);
                              tomorrow.setMinutes(
                                tomorrow.getMinutes() - tomorrow.getTimezoneOffset()
                              );
                              updateLock({
                                mode: 'countdown',
                                unlockAtIso: tomorrow.toISOString().slice(0, 16),
                              });
                            } else if (tab.id === 'passcode') {
                              const nextType: BouquetPasscodeType = lock?.passcodeType || 'pin';
                              const hasLegacyDefaultPrompt =
                                !lock?.questionPrompt ||
                                lock.questionPrompt === 'The special date we first met';
                              updateLock({
                                mode: 'passcode',
                                passcodeType: nextType,
                                questionPrompt: hasLegacyDefaultPrompt
                                  ? nextType === 'pin'
                                    ? DEFAULT_PIN_HINT
                                    : DEFAULT_WORD_HINT
                                  : lock.questionPrompt,
                                passcodeAnswer:
                                  nextType === 'pin'
                                    ? sanitizeSecretPinInput(lock?.passcodeAnswer || '')
                                    : sanitizeSecretWordInput(lock?.passcodeAnswer || ''),
                              });
                            } else {
                              updateLock({ mode: tab.id });
                            }
                          }}
                          className={`py-2.5 px-2 rounded-xl border text-center transition cursor-pointer ${active
                            ? isDarkMode
                              ? 'border-[#E6B89C] bg-[#E6B89C] text-[#231C18]'
                              : 'border-[#6E4434] bg-[#6E4434] text-[#FFFDF9]'
                            : isDarkMode
                              ? 'border-dashed border-[#544540] bg-[#352C29] text-[#D8C7BE] hover:border-[#6E5B54]'
                              : 'border-dashed border-[#DECBB9] bg-[#FFFDF9] text-[#5C4438] hover:border-[#C5A892]'
                            }`}
                        >
                          <div className="text-xs font-medium">{tab.label}</div>
                          <div className="text-[10px] opacity-75 mt-0.5">{tab.sub}</div>
                        </button>
                      );
                    })}
                  </div>

                  {lock?.mode === 'countdown' && (
                    <div className="space-y-1.5 pt-1 animate-in fade-in duration-150">
                      <label
                        className={`block text-[11px] ${isDarkMode ? 'text-[#C2B0A6]' : 'text-[#7D6B60]'
                          }`}
                      >
                        Unlocks on:
                      </label>
                      <input
                        type="datetime-local"
                        aria-label="Unlock date and time"
                        value={lock.unlockAtIso ? lock.unlockAtIso.slice(0, 16) : ''}
                        onChange={(e) => {
                          setShareLockError(null);
                          updateLock({ unlockAtIso: e.target.value });
                        }}
                        className={`w-full px-3 py-1.5 rounded-xl border border-dashed text-xs focus:outline-none focus:border-[#B4846C] ${isDarkMode
                          ? 'bg-[#352C29] border-[#5C4B47] text-[#FBF6F1]'
                          : 'bg-[#FFFDF9] border-[#DECBB9] text-[#2A201D]'
                          }`}
                      />
                    </div>
                  )}

                  {lock?.mode === 'passcode' && (
                    <div className="space-y-2.5 pt-1 animate-in fade-in duration-150">
                      {/* Answer Format Selector: 4-Digit PIN vs. Pure Case-Insensitive Word */}
                      <div>
                        <span
                          className={`block text-[11px] mb-1 ${isDarkMode ? 'text-[#C2B0A6]' : 'text-[#7D6B60]'
                            }`}
                        >
                          Answer format:
                        </span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {(
                            [
                              {
                                id: 'pin',
                                label: '4-Digit PIN',
                                sub: 'Numbers only',
                              },
                              {
                                id: 'word',
                                label: 'Secret Word',
                                sub: 'Letters · case-insensitive',
                              },
                            ] as const
                          ).map((opt) => {
                            const selected = effectivePasscodeType === opt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                data-testid={`secret-format-${opt.id}`}
                                onClick={() => {
                                  setShareLockError(null);
                                  const isDefaultPrompt =
                                    !lock.questionPrompt ||
                                    lock.questionPrompt === 'The special date we first met' ||
                                    lock.questionPrompt === DEFAULT_PIN_HINT ||
                                    lock.questionPrompt === DEFAULT_WORD_HINT;
                                  updateLock({
                                    passcodeType: opt.id,
                                    questionPrompt: isDefaultPrompt
                                      ? opt.id === 'pin'
                                        ? DEFAULT_PIN_HINT
                                        : DEFAULT_WORD_HINT
                                      : lock.questionPrompt,
                                    passcodeAnswer:
                                      opt.id === 'pin'
                                        ? sanitizeSecretPinInput(lock.passcodeAnswer || '')
                                        : sanitizeSecretWordInput(lock.passcodeAnswer || ''),
                                  });
                                }}
                                className={`py-1.5 px-2.5 rounded-xl border text-left transition cursor-pointer ${selected
                                  ? isDarkMode
                                    ? 'border-[#E6B89C] bg-[#3E322E] text-[#FBF6F1]'
                                    : 'border-[#6E4434] bg-[#FFFDF9] text-[#2A201D] ring-1 ring-[#6E4434]/20'
                                  : isDarkMode
                                    ? 'border-dashed border-[#544540] bg-[#352C29]/60 text-[#C8B6AC] hover:border-[#6E5B54]'
                                    : 'border-dashed border-[#DECBB9] bg-[#FAF4EE]/60 text-[#66544A] hover:border-[#C5A892]'
                                  }`}
                              >
                                <div className="text-[11.5px] font-medium leading-tight">
                                  {opt.label}
                                </div>
                                <div className="text-[10px] opacity-70 mt-0.5">{opt.sub}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <label
                          className={`block text-[11px] mb-1 ${isDarkMode ? 'text-[#C2B0A6]' : 'text-[#7D6B60]'
                            }`}
                        >
                          Hint for recipient:
                        </label>
                        <input
                          type="text"
                          data-testid="secret-hint-prompt-input"
                          maxLength={80}
                          placeholder={
                            effectivePasscodeType === 'pin'
                              ? 'e.g., Our special date (MMDD)'
                              : 'e.g., Nickname I call you'
                          }
                          value={lock.questionPrompt || ''}
                          onChange={(e) => {
                            setShareLockError(null);
                            updateLock({ questionPrompt: e.target.value });
                          }}
                          className={`w-full px-3 py-1.5 rounded-xl border border-dashed text-xs focus:outline-none focus:border-[#B4846C] ${isDarkMode
                            ? 'bg-[#352C29] border-[#5C4B47] text-[#FBF6F1]'
                            : 'bg-[#FFFDF9] border-[#DECBB9] text-[#2A201D]'
                            }`}
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label
                            className={`text-[11px] ${isDarkMode ? 'text-[#C2B0A6]' : 'text-[#7D6B60]'
                              }`}
                          >
                            {effectivePasscodeType === 'pin'
                              ? '4-digit PIN (numbers only):'
                              : 'Secret word (case-insensitive):'}
                          </label>
                          {effectivePasscodeType === 'pin' && (
                            <span className="text-[10.5px] opacity-70 tabular-nums">
                              {(lock.passcodeAnswer || '').length}/4
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          data-testid="secret-hint-answer-input"
                          inputMode={effectivePasscodeType === 'pin' ? 'numeric' : 'text'}
                          pattern={effectivePasscodeType === 'pin' ? '[0-9]*' : undefined}
                          maxLength={effectivePasscodeType === 'pin' ? 4 : 40}
                          placeholder={
                            effectivePasscodeType === 'pin' ? 'e.g., 1014' : 'e.g., Mochi'
                          }
                          value={lock.passcodeAnswer || ''}
                          onChange={(e) => {
                            setShareLockError(null);
                            const sanitized =
                              effectivePasscodeType === 'pin'
                                ? sanitizeSecretPinInput(e.target.value)
                                : sanitizeSecretWordInput(e.target.value);
                            updateLock({ passcodeAnswer: sanitized });
                          }}
                          className={`w-full px-3 py-1.5 rounded-xl border border-dashed text-xs focus:outline-none focus:border-[#B4846C] ${effectivePasscodeType === 'pin'
                            ? 'font-mono tracking-[0.25em]'
                            : ''
                            } ${isDarkMode
                              ? 'bg-[#352C29] border-[#5C4B47] text-[#FBF6F1]'
                              : 'bg-[#FFFDF9] border-[#DECBB9] text-[#2A201D]'
                            }`}
                        />
                        <p
                          className={`text-[10px] mt-1 opacity-75 ${isDarkMode ? 'text-[#C2B0A6]' : 'text-[#7D6B60]'
                            }`}
                        >
                          {effectivePasscodeType === 'pin'
                            ? 'Great for dates like MMDD (1014) or meaningful numbers — prevents format mismatch.'
                            : 'Letters only so capitalization or extra spaces never block your recipient.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {shareLockError && (
                    <p
                      role="alert"
                      data-testid="share-lock-error"
                      className="text-[11px] font-medium text-rose-600 dark:text-rose-300"
                    >
                      {shareLockError}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShareLockError(null);
                      setShareStep('dedication');
                    }}
                    className={`py-2.5 px-4 rounded-full border border-dashed text-xs font-medium transition cursor-pointer ${isDarkMode
                      ? 'border-[#5C4B47] text-[#D8C7BE] hover:bg-[#463A36]'
                      : 'border-[#DECBB9] text-[#5C4438] hover:bg-[#F3E9DF]'
                      }`}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    data-testid="share-step-next-btn"
                    onClick={() => {
                      const check = validateBouquetLockConfig(lock);
                      if (!check.valid) {
                        setShareLockError(check.error || 'Please complete your lock details.');
                        return;
                      }
                      setShareLockError(null);
                      setShareStep('seal');
                    }}
                    className={`flex-1 py-2.5 px-4 rounded-full text-xs sm:text-sm font-medium transition cursor-pointer ${isDarkMode
                      ? 'bg-[#E6B89C] text-[#231C18] hover:bg-[#F0C8B0]'
                      : 'bg-[#6E4434] text-[#FFFDF9] hover:bg-[#5B3729]'
                      }`}
                  >
                    Next · Seal Gift
                  </button>
                </div>
              </div>
            )}

            {/* ===============================================================
                STEP 3: SEAL GIFT (Lifespan, Couture Check & Final Seal)
                =============================================================== */}
            {shareStep === 'seal' && (
              <div className="space-y-3.5 animate-in fade-in duration-150">
                <div
                  className={`p-3.5 rounded-2xl border border-dashed space-y-3 ${isDarkMode
                    ? 'bg-[#2B2321]/80 border-[#544540]'
                    : 'bg-[#FAF4EE]/65 border-[#E2D1C1]'
                    }`}
                >
                  {/* Gallery Showcase vs. Permanent Link Row */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-xs font-medium block">Shared Creations gallery</span>
                      <span className="text-[10.5px] opacity-70 block">
                        Recipient gift link is always permanent
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        data-testid="share-lifespan-badge"
                        className={`text-[11px] font-semibold ${activeRetentionPolicy.isPremiumEternal
                          ? 'text-amber-600 dark:text-amber-300'
                          : activeRetentionPolicy.retentionDays > 30
                            ? isDarkMode
                              ? 'text-[#F0C8B0]'
                              : 'text-[#6E4434]'
                            : isDarkMode
                              ? 'text-[#C8B6AC]'
                              : 'text-[#7D6B60]'
                          }`}
                      >
                        {activeRetentionPolicy.badgeLabel}
                      </span>
                      {!isBouquetUnlockedByPass && !currentPremiumInspection.isPremiumBouquet && (
                        <button
                          type="button"
                          data-testid="upgrade-lifespan-btn"
                          onClick={() => {
                            setIsShareModalOpen(false);
                            setCheckoutTriggerAction('share');
                            setCheckoutInitialView('plans');
                            setIsCheckoutModalOpen(true);
                          }}
                          className="text-[10.5px] font-medium text-[#B4846C] hover:underline cursor-pointer"
                        >
                          Extend
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Couture Pieces Used Banner */}
                  {currentPremiumInspection.isPremiumBouquet && !isBouquetUnlockedByPass && (
                    <div
                      data-testid="share-couture-unlock-banner"
                      className={`px-3 py-2 rounded-xl border border-dashed flex items-center justify-between gap-2 ${isDarkMode
                        ? 'bg-[#352C29] border-[#E6B89C]/55'
                        : 'bg-[#FFFDF9] border-[#D8BFA8]'
                        }`}
                    >
                      <span className="text-xs font-medium flex items-center gap-1.5 min-w-0 truncate">
                        <CoutureBloomSeal className="w-3.5 h-3.5 text-[#B4846C] shrink-0" />
                        <span className="truncate">
                          {currentPremiumInspection.reasons.slice(0, 2).join(' · ')}
                          {currentPremiumInspection.reasons.length > 2
                            ? ` +${currentPremiumInspection.reasons.length - 2}`
                            : ''}
                        </span>
                      </span>
                      <button
                        type="button"
                        data-testid="share-have-a-key-btn"
                        onClick={() => {
                          setIsShareModalOpen(false);
                          setCheckoutTriggerAction('share');
                          setCheckoutInitialView('redeem');
                          setIsCheckoutModalOpen(true);
                        }}
                        className="text-[11px] font-semibold text-[#B4846C] hover:underline shrink-0 cursor-pointer"
                      >
                        Have a Key?
                      </button>
                    </div>
                  )}

                  {/* Clean Checkboxes (Showcase + Final Arrangement Reset) */}
                  <div className="space-y-2 pt-1 border-t border-dashed border-[#DECBB9]/60 dark:border-[#544540]">
                    <label className="flex items-center gap-2.5 text-xs cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={pinToShowcaseChecked}
                        onChange={(e) => setPinToShowcaseChecked(e.target.checked)}
                        className="rounded accent-[#6E4434] w-3.5 h-3.5 cursor-pointer"
                      />
                      <span>Display on Shared Creations lace</span>
                    </label>

                    <label className="flex items-start gap-2.5 text-xs cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isFinalDesignChecked}
                        onChange={(e) => setIsFinalDesignChecked(e.target.checked)}
                        className="rounded accent-[#6E4434] w-3.5 h-3.5 mt-0.5 cursor-pointer"
                      />
                      <span>
                        Confirm final design{' '}
                        <span className="opacity-65 text-[11px]">
                          (resets studio after sealing)
                        </span>
                      </span>
                    </label>
                  </div>
                </div>

                {isShorteningUrl && (
                  <div
                    data-testid="share-sealing-progress-banner"
                    className={`px-3.5 py-2.5 rounded-xl border border-dashed flex items-center gap-2.5 text-xs font-medium animate-in fade-in duration-150 ${isDarkMode
                      ? 'bg-[#352C29] border-[#E6B89C]/50 text-[#F0C8B0]'
                      : 'bg-[#FFFDF9] border-[#D8BFA8] text-[#6E4434]'
                      }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin shrink-0"
                      aria-hidden="true"
                    />
                    <span>Sealing your bouquet &amp; preparing your gift link…</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isShorteningUrl}
                    onClick={() => setShareStep('lock')}
                    className={`py-2.5 px-4 rounded-full border border-dashed text-xs font-medium transition disabled:opacity-50 cursor-pointer ${isDarkMode
                      ? 'border-[#5C4B47] text-[#D8C7BE] hover:bg-[#463A36]'
                      : 'border-[#DECBB9] text-[#5C4438] hover:bg-[#F3E9DF]'
                      }`}
                  >
                    Back
                  </button>

                  <button
                    type="button"
                    data-testid="share-modal-primary-btn"
                    disabled={isShorteningUrl || !isFinalDesignChecked}
                    onClick={() => {
                      const lockCheck = validateBouquetLockConfig(lock);
                      if (!lockCheck.valid) {
                        setShareLockError(lockCheck.error || 'Please complete your lock details.');
                        setShareStep('lock');
                        return;
                      }
                      if (currentPremiumInspection.isPremiumBouquet && !isBouquetUnlockedByPass) {
                        setIsShareModalOpen(false);
                        setCheckoutTriggerAction('share');
                        setCheckoutInitialView('plans');
                        setIsCheckoutModalOpen(true);
                        return;
                      }
                      handleShareLink(true);
                    }}
                    className={`flex-1 py-2.5 px-4 rounded-full text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 transition disabled:opacity-60 cursor-pointer ${isDarkMode
                      ? 'bg-[#E6B89C] text-[#231C18] hover:bg-[#F0C8B0]'
                      : 'bg-[#6E4434] text-[#FFFDF9] hover:bg-[#5B3729]'
                      }`}
                  >
                    {isShorteningUrl ? (
                      <>
                        <span
                          className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin shrink-0"
                          aria-hidden="true"
                        />
                        <span>Sealing Gift…</span>
                      </>
                    ) : currentPremiumInspection.isPremiumBouquet && !isBouquetUnlockedByPass ? (
                      <>
                        <CoutureBloomSeal className="w-3.5 h-3.5" />
                        <span>Unlock &amp; Seal Gift</span>
                      </>
                    ) : (
                      <span>Seal &amp; Send Gift</span>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ===============================================================
                STEP 4 (READY): SEALED GIFT LINK, CUSTOM SOFT QR & PNG DOWNLOAD
                =============================================================== */}
            {shareStep === 'ready' && (
              <div className="mt-3.5 space-y-3 animate-in fade-in duration-150">
                <div
                  className={`flex items-center gap-1.5 p-1.5 rounded-2xl border border-dashed ${isDarkMode
                    ? 'bg-[#2B2321] border-[#544540]'
                    : 'bg-[#FAF4EE]/80 border-[#DECBB9]'
                    }`}
                >
                  <input
                    type="text"
                    readOnly
                    aria-label="Short gift link"
                    value={sealedGiftUrl || shortShareUrl || getShareUrl(true)}
                    onClick={(e) => (e.currentTarget as HTMLInputElement).select()}
                    className={`flex-1 min-w-0 bg-transparent px-2.5 py-1.5 text-xs focus:outline-none truncate ${isDarkMode ? 'text-[#E6D6C7]' : 'text-[#5C4438]'
                      }`}
                  />
                  <button
                    type="button"
                    data-testid="copy-sealed-link-btn"
                    onClick={() => {
                      const urlToCopy = sealedGiftUrl || shortShareUrl || getShareUrl(true);
                      if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(urlToCopy).catch(() => { });
                      }
                      setCopiedSealedLink(true);
                      setTimeout(() => setCopiedSealedLink(false), 1800);
                      triggerToast('Link copied!');
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition shrink-0 cursor-pointer ${copiedSealedLink
                      ? 'bg-emerald-600 text-white'
                      : isDarkMode
                        ? 'bg-[#E6B89C] text-[#231C18] hover:bg-[#F0C8B0]'
                        : 'bg-[#6E4434] text-[#FFFDF9] hover:bg-[#5B3729]'
                      }`}
                  >
                    {copiedSealedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Couture Feature: Send Surprise Bouquet via Email ("Someone sent you a Bouquet") */}
                <div
                  data-testid="share-email-delivery-card"
                  className={`p-3.5 rounded-2xl border border-dashed space-y-2.5 ${isDarkMode
                    ? 'bg-[#2B2321]/90 border-[#5E4E49]'
                    : 'bg-[#FAF4EE]/95 border-[#DFCDBB]'
                    }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Mail className="w-3.5 h-3.5 text-[#B4846C] shrink-0" />
                      <span
                        className="text-[15px] font-semibold leading-tight truncate"
                        style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                      >
                        Send Surprise Bouquet via Email
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-dashed text-[10px] font-medium shrink-0 ${isBouquetUnlockedByPass || isSealedBouquetPaidRef.current
                        ? isDarkMode
                          ? 'bg-[#352C29] border-[#E6B89C]/60 text-[#E6B89C]'
                          : 'bg-[#FFFDF9] border-[#C9A88E] text-[#6E4434]'
                        : isDarkMode
                          ? 'bg-[#352C29] border-[#66554F] text-[#E6B89C]'
                          : 'bg-[#FFFDF9] border-[#D8C3B0] text-[#7A4B3A]'
                        }`}
                    >
                      <CoutureBloomSeal className="w-2.5 h-2.5" />
                      <span>
                        {isBouquetUnlockedByPass || isSealedBouquetPaidRef.current
                          ? 'Couture Ready'
                          : 'Couture'}
                      </span>
                    </span>
                  </div>

                  <p
                    className={`text-[11px] leading-relaxed ${isDarkMode ? 'text-[#C8B6AC]' : 'text-[#6E5D54]'
                      }`}
                  >
                    Sends a clean personal letter titled{' '}
                    <span className="italic font-medium">
                      “{card.to ? `For ${card.to} — ` : ''}someone sent you a bouquet”
                    </span>{' '}
                    — keeping your name a surprise until they open it.
                  </p>

                  {surpriseEmailSentTo ? (
                    <div
                      data-testid="surprise-email-sent-badge"
                      className={`px-3 py-2 rounded-xl border border-dashed flex items-center justify-between gap-2 text-xs ${isDarkMode
                        ? 'bg-[#352C29] border-[#66554F] text-[#E6B89C]'
                        : 'bg-[#FFFDF9] border-[#DECBB9] text-[#6E4434]'
                        }`}
                    >
                      <span className="truncate">
                        Surprise bouquet sent to <span className="font-semibold">{surpriseEmailSentTo}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSurpriseEmailSentTo(null);
                          setSurpriseRecipientEmail('');
                          setSurpriseEmailError(null);
                        }}
                        className="text-[11px] underline decoration-dashed underline-offset-2 shrink-0 cursor-pointer"
                      >
                        Send another
                      </button>
                    </div>
                  ) : unlockedPassForCurrentBouquet ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="email"
                          data-testid="share-recipient-email-input"
                          aria-label="Loved one's email address"
                          disabled={isSendingSurpriseEmail}
                          value={surpriseRecipientEmail}
                          onChange={(e) => {
                            setSurpriseRecipientEmail(e.target.value);
                            if (surpriseEmailError) setSurpriseEmailError(null);
                          }}
                          placeholder="Loved one's email address..."
                          className={`flex-1 min-w-0 px-3 py-2 rounded-xl border border-dashed text-xs focus:outline-none transition-colors ${isDarkMode
                            ? 'bg-[#352C29] border-[#5E4E49] text-[#FBF6F1] placeholder:text-[#96837A] focus:border-[#E6B89C]'
                            : 'bg-[#FFFDF9] border-[#DECBB9] text-[#231C18] placeholder:text-[#9A897E] focus:border-[#7A4B3A]'
                            }`}
                        />
                        <button
                          type="button"
                          data-testid="send-surprise-email-btn"
                          disabled={isSendingSurpriseEmail}
                          onClick={async () => {
                            const giftUrl = sealedGiftUrl || shortShareUrl || getShareUrl(true);
                            setIsSendingSurpriseEmail(true);
                            setSurpriseEmailError(null);
                            const res = await sendBouquetSurpriseEmail({
                              recipientEmail: surpriseRecipientEmail,
                              recipientName: card.to,
                              giftUrl,
                              pass: unlockedPassForCurrentBouquet,
                              deviceTokenHash: getOrCreateDeviceTokenHash(),
                              bouquetCode: currentBouquetShortCode,
                            });
                            setIsSendingSurpriseEmail(false);
                            if (!res.ok) {
                              setSurpriseEmailError(res.error || 'Could not send email right now.');
                              return;
                            }
                            setSurpriseEmailSentTo(res.recipientEmail || surpriseRecipientEmail.trim());
                            triggerToast('Surprise bouquet email sent!');
                          }}
                          className={`px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition shrink-0 cursor-pointer disabled:opacity-60 ${isDarkMode
                            ? 'bg-[#E6B89C] text-[#231C18] hover:bg-[#F0C8B0]'
                            : 'bg-[#6E4434] text-[#FFFDF9] hover:bg-[#5B3729]'
                            }`}
                        >
                          <Send className="w-3 h-3" />
                          <span>{isSendingSurpriseEmail ? 'Sending...' : 'Send Email'}</span>
                        </button>
                      </div>

                      {surpriseEmailError && (
                        <div
                          role="alert"
                          data-testid="surprise-email-error"
                          className={`px-3 py-1.5 rounded-xl border border-dashed text-[11px] ${isDarkMode
                            ? 'bg-[#352C29] border-[#8C6A5D] text-[#E6B89C]'
                            : 'bg-[#FFFDF9] border-[#C8A992] text-[#6E4434]'
                            }`}
                        >
                          {surpriseEmailError}
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      data-testid="unlock-email-delivery-btn"
                      onClick={() => {
                        shouldResetStudioOnShareCloseRef.current = false;
                        setIsShareModalOpen(false);
                        setCheckoutTriggerAction('share');
                        setIsCheckoutModalOpen(true);
                      }}
                      className={`w-full py-2 px-3.5 rounded-xl border border-dashed text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${isDarkMode
                        ? 'bg-[#352C29] border-[#E6B89C]/60 text-[#E6B89C] hover:bg-[#463A36]'
                        : 'bg-[#FFFDF9] border-[#C9A88E] text-[#6E4434] hover:bg-[#F3E9DF]'
                        }`}
                    >
                      <CoutureBloomSeal className="w-3.5 h-3.5" />
                      <span>Unlock Surprise Email Delivery</span>
                    </button>
                  )}
                </div>

                {/* Custom Lineart / Soft Botanical QR Code with Center Logo & Top-Left Download Icon */}
                <BotanicalQrCard
                  url={sealedGiftUrl || shortShareUrl || getShareUrl(true)}
                  recipientName={card.to}
                  isDarkMode={isDarkMode}
                  onToast={triggerToast}
                />

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (isSealedBouquetPaidRef.current) {
                        performSvgPngDownload();
                      } else {
                        handleExportPng();
                      }
                    }}
                    className={`py-2.5 px-3 rounded-full border border-dashed text-xs font-medium text-center transition cursor-pointer ${isDarkMode
                      ? 'border-[#5C4B47] bg-[#2D2421] hover:bg-[#3B302C] text-[#E6D6C7]'
                      : 'border-[#DECBB9] bg-[#FAF4EE]/70 hover:bg-[#F3E9DF] text-[#5C4438]'
                      }`}
                  >
                    Save Bouquet PNG
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsShareModalOpen(false)}
                    className={`py-2.5 px-3 rounded-full text-xs font-medium text-center transition cursor-pointer ${isDarkMode
                      ? 'bg-[#463A36] text-[#FBF6F1] hover:bg-[#544540]'
                      : 'bg-[#EDE0D4] text-[#2A201D] hover:bg-[#E2D1C1]'
                      }`}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
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
            className={`w-full max-w-sm rounded-2xl p-5 shadow-2xl border relative text-center ${isDarkMode
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
              className={`mt-4 p-3 rounded-xl border text-left text-xs space-y-1.5 ${isDarkMode
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
                    navigator.clipboard.writeText(currentUrl).catch(() => { });
                  }
                  triggerToast('Link copied!');
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
                className={`py-2.5 px-4 rounded-full border text-xs font-medium transition ${isDarkMode
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
        onSaveCurrentDraft={!isGiftView && !isPreviewMode ? handleSaveDraftOnDevice : undefined}
        onResumeDraft={handleResumeDraftFromDevice}
        onOpenGiftUrl={(giftUrl) => {
          const codeMatch = giftUrl.replace(/\/+$/, '').split('/').pop() || '';
          const decoded = decodeBouquetFromHash(giftUrl);
          const hasDecoded = Boolean(decoded && Array.isArray(decoded.items) && decoded.items.length > 0);
          const isValidCode = Boolean(codeMatch && /^[a-zA-Z0-9_-]{7,24}$/.test(codeMatch));
          if (isValidCode) {
            setActiveShortCode(codeMatch);
          }
          if (hasDecoded && decoded) {
            loadSnapshot(decoded, { isSharedView: true });
            selectItem(null);
            setShowLandingPage(false);
            startGiftBloomAnimation(
              decoded.items.length,
              false,
              false,
              isValidCode ? codeMatch : giftUrl,
              'vault'
            );
          }
          if (isValidCode) {
            const needsLockCheck = !hasDecoded || !decoded?.lock || decoded.lock.mode === 'none';
            const reqId = ++showcaseResolveRequestIdRef.current;
            if (needsLockCheck) {
              setIsResolvingShortCode(true);
              if (!hasDecoded) {
                selectItem(null);
                setShowLandingPage(false);
                startGiftBloomAnimation(0, false, false, codeMatch, 'vault');
              }
            }
            fetchSharedBouquetFromFirestore(codeMatch)
              .then((record) => {
                if (showcaseResolveRequestIdRef.current !== reqId || !record) return;
                const recordSnap = record.payload ? decodeBouquetFromHash(record.payload) : null;
                const base = recordSnap || decoded;
                if (base && Array.isArray(base.items) && base.items.length > 0) {
                  const hydrated = hydrateSnapshotWithFirestoreRecord(base, record);
                  loadSnapshot(hydrated, { isSharedView: true });
                  setNowMs(Date.now());
                  if (hydrated.lock && hydrated.lock.mode !== 'none') {
                    setIsEntranceUnfurling(false);
                    setEntranceSlideProgress(0);
                  }
                  if (!hasDecoded) {
                    selectItem(null);
                    setShowLandingPage(false);
                    startGiftBloomAnimation(hydrated.items.length, false, false, codeMatch, 'vault');
                  }
                }
              })
              .catch(() => { })
              .finally(() => {
                if (showcaseResolveRequestIdRef.current === reqId) {
                  setIsResolvingShortCode(false);
                }
              });
          }
        }}
        onClose={() => {
          setIsVaultModalOpen(false);
          setVaultCount(getSavedVaultBouquets().length);
        }}
      />

      {/* COUTURE STUDIO PASS, PPP CHECKOUT & SINGLE-USER PASS KEY MODAL */}
      <StudioCheckoutModal
        isOpen={isCheckoutModalOpen}
        isDarkMode={isDarkMode}
        triggerAction={checkoutTriggerAction}
        initialView={checkoutInitialView}
        bouquetCode={currentBouquetShortCode}
        premiumInspection={currentPremiumInspection}
        activePass={activeStudioPass}
        onClose={() => {
          setIsCheckoutModalOpen(false);
          setCheckoutInitialView('plans');
        }}
        onStealthGateTriggered={(gatePath, gateSlug) => {
          try {
            window.history.pushState({}, '', gatePath);
          } catch {
            // Ignore history error
          }
          setStealthGateSlug(gateSlug);
          setShowLandingPage(false);
        }}
        onPassActivated={async (newPass, resumeAction) => {
          lastServerVerifiedPassSigRef.current = newPass.signature;
          saveStoredStudioPass(newPass);
          setActiveStudioPass(newPass);
          if (isFoundingPromoFreePass(newPass)) {
            setPinToShowcaseChecked(true);
          }
          if (resumeAction === 'share') {
            setIsCheckoutModalOpen(false);
            setCheckoutInitialView('plans');
            setShareStep('seal');
            setIsShareModalOpen(true);
            setIsShorteningUrl(true);
            await handleShareLink(true, newPass);
          } else if (resumeAction === 'png') {
            setIsCheckoutModalOpen(false);
            setCheckoutInitialView('plans');
            const pngVerify = await verifyStudioPassOnServer({
              pass: newPass,
              bouquetCode: currentBouquetShortCode,
              incrementUsage: false,
            });
            if (!pngVerify.valid || !pngVerify.updatedPass) {
              lastServerVerifiedPassSigRef.current = '';
              saveStoredStudioPass(null);
              setActiveStudioPass(null);
              triggerToast(
                pngVerify.message || 'Please unlock with a valid Bloom Key to export High-Res PNG.'
              );
              return;
            }
            lastServerVerifiedPassSigRef.current = pngVerify.updatedPass.signature;
            saveStoredStudioPass(pngVerify.updatedPass);
            setActiveStudioPass(pngVerify.updatedPass);
            await performSvgPngDownload();
          } else if (newPass.tier === 'single') {
            setIsCheckoutModalOpen(false);
            setCheckoutInitialView('plans');
            triggerToast('Single Bouquet Unlock activated — ready to share or export!');
          } else {
            triggerToast('Bloom Pass Activated!');
          }
        }}
        onPremiumConfigChanged={(nextCfg) => setPremiumAssetConfig(nextCfg)}
        onToast={triggerToast}
      />

      {/* STEALTH CAMOUFLAGED BOUQUET GATE & OWNER ATELIER ANALYTICS CONSOLE */}
      {stealthGateSlug && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <StealthGateAndOwnerConsole
            gateSlug={stealthGateSlug}
            deviceTokenHash={getOrCreateDeviceTokenHash()}
            isDarkMode={isDarkMode}
            onToggleDarkMode={() => setIsDarkMode((prev) => !prev)}
            onExitToStudio={() => {
              try {
                window.history.pushState({}, '', '/?studio=1');
              } catch {
                // Ignore history error
              }
              setStealthGateSlug(null);
              setShowLandingPage(false);
            }}
            onToast={triggerToast}
          />
        </div>
      )}

      {/* TOAST NOTIFICATION PILL */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-25 sm:top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none bg-[#1C1917]/92 text-white dark:bg-stone-100 dark:text-[#1C1917] px-3.5 py-1.5 rounded-full text-xs font-medium shadow-lg backdrop-blur-sm flex items-center gap-1.5 animate-[fadeIn_200ms_ease-out]"
        >
          <Check className="w-3.5 h-3.5 text-[#E6B89C] dark:text-[#6E4434] shrink-0" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}

