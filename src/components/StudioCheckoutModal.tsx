import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Check, Copy, QrCode, X } from 'lucide-react';
import {
  BayadgatePaymentMethod,
  BouquetPremiumInspection,
  clearPendingCheckoutStorage,
  detectPricingRegion,
  formatPassRemainingTime,
  getOrCreateDeviceTokenHash,
  getPricingCatalog,
  getStoredKofiShopConfig,
  isTesterVoucherPass,
  loadPendingCheckoutStorage,
  normalizePassKey,
  parseTesterVoucherMeta,
  PremiumAssetConfig,
  PricingRegion,
  PricingTierPlan,
  savePendingCheckoutStorage,
  StudioPassRecord,
  StudioPassTier,
} from '../lib/monetization';
import {
  saveStudioPassToFirestore,
} from '../lib/firebase';

/**
 * Bespoke 5-petal botanical wax-seal floweret icon matching Send A Bouquet's
 * lineart personality (replaces generic Sparkles or unicode symbols).
 */
export const CoutureBloomSeal: React.FC<{ className?: string }> = ({
  className = 'w-3.5 h-3.5',
}) => (
  <svg
    viewBox="0 0 20 20"
    fill="none"
    aria-hidden="true"
    className={`shrink-0 select-none ${className}`}
  >
    <circle
      cx="10"
      cy="10"
      r="8.5"
      fill="currentColor"
      fillOpacity="0.14"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeDasharray="2 1.5"
    />
    <g fill="currentColor">
      <ellipse cx="10" cy="6.1" rx="1.65" ry="2.5" />
      <ellipse cx="10" cy="6.1" rx="1.65" ry="2.5" transform="rotate(72 10 10)" />
      <ellipse cx="10" cy="6.1" rx="1.65" ry="2.5" transform="rotate(144 10 10)" />
      <ellipse cx="10" cy="6.1" rx="1.65" ry="2.5" transform="rotate(216 10 10)" />
      <ellipse cx="10" cy="6.1" rx="1.65" ry="2.5" transform="rotate(288 10 10)" />
    </g>
    <circle cx="10" cy="10" r="1.5" fill="#FFFDF9" />
  </svg>
);

/**
 * Dainty wax-seal pin rendered on the outer top-right rim of Couture items
 * in the Studio dock & catalog (never clipped by thumbnail overflow-hidden).
 */
export const CoutureItemBadge: React.FC<{ isDarkMode?: boolean; title?: string }> = ({
  isDarkMode,
  title = 'Couture piece',
}) => (
  <span
    title={title}
    aria-label={title}
    className={`pointer-events-none absolute -top-0.5 -right-0.5 z-10 w-4 h-4 rounded-full border flex items-center justify-center shadow-2xs ${
      isDarkMode
        ? 'bg-[#352C29] border-[#E6B89C]/70 text-[#E6B89C]'
        : 'bg-[#FFFDF9] border-[#C89D7C] text-[#9C6B4E]'
    }`}
  >
    <svg viewBox="0 0 14 14" fill="none" className="w-2.5 h-2.5" aria-hidden="true">
      <g fill="currentColor">
        <ellipse cx="7" cy="4.1" rx="1.2" ry="1.9" />
        <ellipse cx="7" cy="4.1" rx="1.2" ry="1.9" transform="rotate(72 7 7)" />
        <ellipse cx="7" cy="4.1" rx="1.2" ry="1.9" transform="rotate(144 7 7)" />
        <ellipse cx="7" cy="4.1" rx="1.2" ry="1.9" transform="rotate(216 7 7)" />
        <ellipse cx="7" cy="4.1" rx="1.2" ry="1.9" transform="rotate(288 7 7)" />
      </g>
      <circle cx="7" cy="7" r="1.15" fill={isDarkMode ? '#352C29' : '#FFFDF9'} />
    </svg>
  </span>
);

/**
 * Pure inline SVG botanical lineart symbol/graphic for each Studio Pass tier.
 * Replaces external raster .jpg files so cards render instantaneously with zero
 * image network requests and scale crisply at any mobile/tablet/desktop DPI.
 */
export const StudioPassLineartSymbol: React.FC<{
  tier: StudioPassTier;
  isDarkMode?: boolean;
  isSelected?: boolean;
  size?: 'card' | 'thumb';
}> = ({ tier, isDarkMode = false, isSelected = false, size = 'card' }) => {
  const strokePrimary = isDarkMode ? '#F0C8B0' : '#6E4434';
  const strokeAccent = isDarkMode ? '#D4A383' : '#B4846C';
  const softFill = isDarkMode ? 'rgba(230, 184, 156, 0.12)' : 'rgba(180, 132, 108, 0.11)';
  const blushFill = isDarkMode ? 'rgba(236, 168, 176, 0.18)' : 'rgba(229, 152, 155, 0.22)';

  return (
    <div
      data-testid={`plan-lineart-${tier}`}
      className={`${
        size === 'thumb'
          ? 'w-12 h-12 rounded-xl shrink-0'
          : 'w-full aspect-[1.15/1] sm:aspect-square rounded-xl'
      } border border-dashed flex items-center justify-center overflow-hidden transition-colors select-none ${
        isSelected
          ? isDarkMode
            ? 'bg-[#352B28] border-[#E6B89C]/80'
            : 'bg-[#FFFDF9] border-[#8A5A44]/70'
          : isDarkMode
          ? 'bg-[#261F1D] border-[#544540]'
          : 'bg-[#FAF5EF]/90 border-[#DECBB9]'
      }`}
    >
      <svg
        viewBox="0 0 88 88"
        fill="none"
        aria-hidden="true"
        className={size === 'thumb' ? 'w-10 h-10' : 'w-[76%] h-[76%] max-w-[68px] max-h-[68px]'}
      >
        {/* Outer fine botanical stationer's ring */}
        <circle
          cx="44"
          cy="44"
          r="37"
          stroke={strokeAccent}
          strokeWidth="0.9"
          strokeDasharray="2.5 2.5"
          opacity="0.55"
        />

        {tier === 'single' && (
          <g strokeLinecap="round" strokeLinejoin="round">
            {/* Soft watercolor halo behind single bloom */}
            <circle cx="44" cy="33" r="14" fill={blushFill} />
            {/* Stem */}
            <path
              d="M44 43 C44 53, 43.5 62, 44 71"
              stroke={strokePrimary}
              strokeWidth="1.45"
            />
            {/* Botanical leaves */}
            <path
              d="M44 54 C37 52, 33 47, 36 44 C39 44, 42 48, 44 54 Z"
              fill={softFill}
              stroke={strokePrimary}
              strokeWidth="1.2"
            />
            <path
              d="M44 51 C51 49, 55 44, 52 41 C49 41, 46 45, 44 51 Z"
              fill={softFill}
              stroke={strokePrimary}
              strokeWidth="1.2"
            />
            {/* Single Rosebud Chalice & Petals */}
            <path
              d="M35 33 C35 24, 53 24, 53 33 C53 39.5, 48.5 43, 44 43 C39.5 43, 35 39.5, 35 33 Z"
              fill={softFill}
              stroke={strokePrimary}
              strokeWidth="1.4"
            />
            <path
              d="M38 30 C41 26, 47 26, 50 30 C47 33, 41 33, 38 30 Z"
              stroke={strokePrimary}
              strokeWidth="1.15"
            />
            <path
              d="M41 28.5 C43 26.5, 45 26.5, 47 28.5"
              stroke={strokeAccent}
              strokeWidth="1.1"
            />
            {/* Calyx sepals */}
            <path
              d="M39 41.5 L44 44 L49 41.5"
              stroke={strokePrimary}
              strokeWidth="1.15"
            />
            {/* Dainty tied ribbon bow on stem */}
            <path
              d="M44 61 C39 58, 36 61, 40 63.5 C42 64.2, 43.2 62.2, 44 61 Z"
              fill={blushFill}
              stroke={strokeAccent}
              strokeWidth="1.15"
            />
            <path
              d="M44 61 C49 58, 52 61, 48 63.5 C46 64.2, 44.8 62.2, 44 61 Z"
              fill={blushFill}
              stroke={strokeAccent}
              strokeWidth="1.15"
            />
            <path
              d="M43 62 L40 68 M45 62 L48 68"
              stroke={strokeAccent}
              strokeWidth="1.1"
            />
            {/* Top solitaire diamond sparkle */}
            <path
              d="M44 14 L45.1 17.4 L48.5 18.5 L45.1 19.6 L44 23 L42.9 19.6 L39.5 18.5 L42.9 17.4 Z"
              fill={strokeAccent}
              opacity="0.85"
            />
          </g>
        )}

        {tier === 'pass_7d' && (
          <g strokeLinecap="round" strokeLinejoin="round">
            {/* Soft botanical aura */}
            <circle cx="44" cy="34" r="18" fill={blushFill} />
            {/* Origami paper cone wrapper */}
            <path
              d="M27 44 L44 72 L61 44 L53 40 L44 45 L35 40 Z"
              fill={softFill}
              stroke={strokePrimary}
              strokeWidth="1.35"
            />
            <path
              d="M35 44 L44 59 L53 44"
              stroke={strokeAccent}
              strokeWidth="1.05"
               opacity="0.8"
            />
            {/* Center Peony Bloom */}
            <circle
              cx="44"
              cy="31"
              r="8.2"
              fill={softFill}
              stroke={strokePrimary}
              strokeWidth="1.35"
            />
            <path
              d="M40.5 30.5 C42 27.5, 46 27.5, 47.5 30.5 C46 33.5, 42 33.5, 40.5 30.5 Z"
              stroke={strokePrimary}
              strokeWidth="1.1"
            />
            <circle cx="44" cy="30.5" r="1.4" fill={strokeAccent} />
            {/* Left Tulip Bloom */}
            <path
              d="M26 35 C24 28, 30 25, 33 30 C35 33, 32 38, 29 38 C27 38, 26.5 36.5, 26 35 Z"
              fill={softFill}
              stroke={strokePrimary}
              strokeWidth="1.25"
            />
            <path d="M31.5 37.5 L37 44" stroke={strokePrimary} strokeWidth="1.2" />
            {/* Right Lily Bloom */}
            <path
              d="M62 35 C64 28, 58 25, 55 30 C53 33, 56 38, 59 38 C61 38, 61.5 36.5, 62 35 Z"
              fill={softFill}
              stroke={strokePrimary}
              strokeWidth="1.25"
            />
            <path d="M56.5 37.5 L51 44" stroke={strokePrimary} strokeWidth="1.2" />
            {/* Ribbon bow at waist of cone */}
            <path
              d="M44 57 C38 53.5, 35 57.5, 39.5 60 C41.5 61, 43 58.5, 44 57 Z"
              fill={blushFill}
              stroke={strokeAccent}
              strokeWidth="1.2"
            />
            <path
              d="M44 57 C50 53.5, 53 57.5, 48.5 60 C46.5 61, 45 58.5, 44 57 Z"
              fill={blushFill}
              stroke={strokeAccent}
              strokeWidth="1.2"
            />
            <circle cx="44" cy="57" r="1.6" fill={strokePrimary} />
            {/* 3 Tiny stars arc at crown */}
            <circle cx="33" cy="18" r="1.3" fill={strokeAccent} />
            <path
              d="M44 12.5 L45 15.5 L48 16.5 L45 17.5 L44 20.5 L43 17.5 L40 16.5 L43 15.5 Z"
              fill={strokeAccent}
            />
            <circle cx="55" cy="18" r="1.3" fill={strokeAccent} />
          </g>
        )}

        {tier === 'pass_30d' && (
          <g strokeLinecap="round" strokeLinejoin="round">
            {/* Soft eternal glow */}
            <circle cx="44" cy="42" r="19" fill={blushFill} />
            {/* Glass Cloche Dome Arch (Eternal Keepsake Symbol) */}
            <path
              d="M26 62 L26 39 C26 27.5, 34 20, 44 20 C54 20, 62 27.5, 62 39 L62 62"
              fill={softFill}
              stroke={strokePrimary}
              strokeWidth="1.4"
            />
            {/* Cloche top finial knob */}
            <circle
              cx="44"
              cy="17"
              r="2.6"
              fill={softFill}
              stroke={strokePrimary}
              strokeWidth="1.3"
            />
            {/* Cloche pedestal base */}
            <path
              d="M22 62.5 L66 62.5 M25 66 L63 66"
              stroke={strokePrimary}
              strokeWidth="1.45"
            />
            {/* Eternal Rose inside the dome */}
            <g transform="translate(44, 38)">
              {[0, 72, 144, 216, 288].map((deg) => (
                <ellipse
                  key={deg}
                  cx="0"
                  cy="-5.2"
                  rx="3.4"
                  ry="5.2"
                  transform={`rotate(${deg})`}
                  fill={blushFill}
                  stroke={strokePrimary}
                  strokeWidth="1.15"
                />
              ))}
              <circle cx="0" cy="0" r="2.3" fill={strokeAccent} />
            </g>
            {/* Stem & leaves inside cloche */}
            <path d="M44 46 L44 62" stroke={strokePrimary} strokeWidth="1.3" />
            <path
              d="M44 55 C39 53, 36 50, 38 48 C40 48, 42.5 51, 44 55 Z"
              fill={softFill}
              stroke={strokePrimary}
              strokeWidth="1.1"
            />
            <path
              d="M44 53 C49 51, 52 48, 50 46 C48 46, 45.5 49, 44 53 Z"
              fill={softFill}
              stroke={strokePrimary}
              strokeWidth="1.1"
            />
            {/* Infinity / Eternal emblem beneath pedestal */}
            <path
              d="M44 71.5 C41.2 69, 37.5 69.2, 37.5 71.5 C37.5 73.8, 41.2 74, 44 71.5 C46.8 69, 50.5 69.2, 50.5 71.5 C50.5 73.8, 46.8 74, 44 71.5 Z"
              stroke={strokeAccent}
              strokeWidth="1.25"
            />
          </g>
        )}
      </svg>
    </div>
  );
};


export interface StudioCheckoutModalProps {
  isOpen: boolean;
  isDarkMode: boolean;
  triggerAction: 'share' | 'png' | 'pass_menu';
  initialView?: 'plans' | 'redeem';
  bouquetCode: string;
  premiumInspection: BouquetPremiumInspection;
  activePass: StudioPassRecord | null;
  onClose: () => void;
  onPassActivated: (
    pass: StudioPassRecord,
    resumeAction: 'share' | 'png' | 'pass_menu'
  ) => void;
  onStealthGateTriggered?: (gatePath: string, gateSlug: string) => void;
  onPremiumConfigChanged?: (nextConfig: PremiumAssetConfig) => void;
  onToast: (msg: string) => void;
}

export interface CheckoutCapabilityState {
  isPhEligible: boolean;
  phDisabled?: boolean;
  defaultRegion: PricingRegion;
  phGateway: 'sikatpay' | 'bayadgate' | 'paymongo' | null;
  initialGateway: 'sikatpay' | 'bayadgate' | 'paymongo' | 'kofi';
}

let cachedCheckoutCapability: CheckoutCapabilityState | null = null;
let inFlightCapabilityPromise: Promise<CheckoutCapabilityState> | null = null;

export function invalidateCheckoutCapabilityCache(): void {
  cachedCheckoutCapability = null;
  inFlightCapabilityPromise = null;
}

function resolveInitialGatewayFromConfig(cfg: {
  isPhEligible?: boolean;
  phDisabled?: boolean;
  defaultRegion?: PricingRegion;
  phGateway?: 'sikatpay' | 'bayadgate' | 'paymongo' | null;
}): CheckoutCapabilityState {
  if (cfg.phDisabled) {
    return {
      isPhEligible: false,
      phDisabled: true,
      defaultRegion: 'INTL',
      phGateway: null,
      initialGateway: 'kofi',
    };
  }
  const eligible = Boolean(cfg.isPhEligible && cfg.phGateway);
  const phGw = cfg.phGateway || null;
  let initialGateway: 'sikatpay' | 'bayadgate' | 'paymongo' | 'kofi' = 'kofi';
  if (eligible && phGw) {
    const browserLocalPh =
      cfg.defaultRegion === 'PH' ||
      (typeof navigator !== 'undefined' &&
        detectPricingRegion(
          Intl.DateTimeFormat().resolvedOptions().timeZone,
          navigator.language
        ) === 'PH');
    initialGateway = browserLocalPh ? phGw : 'kofi';
  }
  return {
    isPhEligible: eligible,
    phDisabled: false,
    defaultRegion: cfg.defaultRegion === 'PH' ? 'PH' : 'INTL',
    phGateway: phGw,
    initialGateway,
  };
}

export function fetchCheckoutCapability(): Promise<CheckoutCapabilityState> {
  if (cachedCheckoutCapability) {
    return Promise.resolve(cachedCheckoutCapability);
  }
  if (inFlightCapabilityPromise) {
    return inFlightCapabilityPromise;
  }
  inFlightCapabilityPromise = fetch('/api/payments/create-checkout', { method: 'GET' })
    .then(async (res) => {
      if (!res.ok) return null;
      return (await res.json().catch(() => null)) as {
        ok?: boolean;
        isPhEligible?: boolean;
        phDisabled?: boolean;
        defaultRegion?: PricingRegion;
        phGateway?: 'sikatpay' | 'bayadgate' | 'paymongo' | null;
      } | null;
    })
    .then((cfg) => {
      const resolved =
        cfg && cfg.ok
          ? resolveInitialGatewayFromConfig(cfg)
          : {
              isPhEligible: false,
              phDisabled: false,
              defaultRegion: 'INTL' as PricingRegion,
              phGateway: null,
              initialGateway: 'kofi' as const,
            };
      cachedCheckoutCapability = resolved;
      return resolved;
    })
    .catch(() => ({
      isPhEligible: false,
      phDisabled: false,
      defaultRegion: 'INTL' as PricingRegion,
      phGateway: null,
      initialGateway: 'kofi' as const,
    }))
    .finally(() => {
      inFlightCapabilityPromise = null;
    });
  return inFlightCapabilityPromise;
}

export const StudioCheckoutModal: React.FC<StudioCheckoutModalProps> = ({
  isOpen,
  isDarkMode,
  triggerAction,
  initialView = 'plans',
  bouquetCode,
  premiumInspection,
  activePass,
  onClose,
  onPassActivated,
  onStealthGateTriggered,
  onToast,
}) => {
  const [selectedTier, setSelectedTier] = useState<StudioPassTier>('pass_7d');
  const [isResolvingRegion, setIsResolvingRegion] = useState<boolean>(
    () => !cachedCheckoutCapability
  );
  const [isPhEligible, setIsPhEligible] = useState<boolean>(
    () => cachedCheckoutCapability?.isPhEligible ?? false
  );
  const [paymentGateway, setPaymentGateway] = useState<
    'sikatpay' | 'bayadgate' | 'paymongo' | 'kofi'
  >(() => cachedCheckoutCapability?.initialGateway ?? 'kofi');
  const [bayadgateMethod, setBayadgateMethod] = useState<BayadgatePaymentMethod>('GCASH');
  const [activeView, setActiveView] = useState<'plans' | 'redeem' | 'pass_card'>(
    () => (activePass ? 'pass_card' : initialView === 'redeem' ? 'redeem' : 'plans')
  );
  const [checkoutStep, setCheckoutStep] = useState<'select' | 'qr_confirm'>('select');
  const [pendingCheckout, setPendingCheckout] = useState<{
    checkoutId: string;
    checkoutToken: string;
    passKeyPreview: string;
    plan: PricingTierPlan;
    provider: 'sikatpay' | 'bayadgate' | 'paymongo' | 'kofi';
    orderId?: string | null;
    paymentMethod?: BayadgatePaymentMethod | null;
    checkoutUrl: string | null;
    liveGatewayConfigured: boolean;
  } | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [buyerEmail, setBuyerEmail] = useState('');
  const [redeemInput, setRedeemInput] = useState('');
  const [copiedPassKey, setCopiedPassKey] = useState(false);
  const autoVerifyInFlightRef = useRef(false);
  const shopConfig = getStoredKofiShopConfig();

  const activateVerifiedPass = useCallback(
    async (issuedPass: StudioPassRecord) => {
      clearPendingCheckoutStorage();
      setPendingCheckout(null);
      setCheckoutStep('select');
      void saveStudioPassToFirestore(issuedPass).catch(() => {});
      onPassActivated(issuedPass, triggerAction);
      if (issuedPass.tier === 'single' || triggerAction === 'share' || triggerAction === 'png') {
        onClose();
      } else {
        setActiveView('pass_card');
      }
    },
    [onPassActivated, onClose, triggerAction]
  );

  const trySilentPendingVerification = useCallback(async () => {
    if (!pendingCheckout || pendingCheckout.provider === 'kofi') return;
    if (autoVerifyInFlightRef.current) return;
    autoVerifyInFlightRef.current = true;
    try {
      const deviceTokenHash = getOrCreateDeviceTokenHash();
      const res = await fetch('/api/payments/verify-and-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkoutId: pendingCheckout.checkoutId,
          checkoutToken: pendingCheckout.checkoutToken,
          deviceTokenHash,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok && data?.pass) {
        await activateVerifiedPass(data.pass as StudioPassRecord);
      }
    } catch {
      // Silent retry continues on next poll or focus
    } finally {
      autoVerifyInFlightRef.current = false;
    }
  }, [pendingCheckout, activateVerifiedPass]);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage(null);
    if (activePass) {
      setCheckoutStep('select');
      setPendingCheckout(null);
      setActiveView('pass_card');
    } else if (initialView === 'redeem') {
      setCheckoutStep('select');
      setPendingCheckout(null);
      setActiveView('redeem');
    } else {
      setActiveView('plans');
      const storedPending = loadPendingCheckoutStorage();
      if (storedPending) {
        const fallbackRegion: PricingRegion = storedPending.provider === 'kofi' ? 'INTL' : 'PH';
        const fallbackPlan = getPricingCatalog(fallbackRegion)[1];
        setPendingCheckout({
          checkoutId: storedPending.checkoutId,
          checkoutToken: storedPending.checkoutToken,
          passKeyPreview: storedPending.passKeyPreview || 'BLOOM-••••-••••',
          plan: storedPending.plan || fallbackPlan,
          provider: storedPending.provider,
          orderId: storedPending.orderId || null,
          paymentMethod: storedPending.paymentMethod || null,
          checkoutUrl: storedPending.checkoutUrl || null,
          liveGatewayConfigured: Boolean(storedPending.liveGatewayConfigured ?? true),
        });
        setCheckoutStep('qr_confirm');
      } else {
        setCheckoutStep('select');
        setPendingCheckout(null);
      }
    }

    if (cachedCheckoutCapability) {
      setIsPhEligible(cachedCheckoutCapability.isPhEligible);
      setPaymentGateway(cachedCheckoutCapability.initialGateway);
      setIsResolvingRegion(false);
      return;
    }

    let cancelled = false;
    setIsResolvingRegion(true);
    fetchCheckoutCapability().then((resolved) => {
      if (cancelled) return;
      setIsPhEligible(resolved.isPhEligible);
      setPaymentGateway(resolved.initialGateway);
      setIsResolvingRegion(false);
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, activePass, triggerAction, initialView]);

  // Auto-poll & re-check immediately when returning from external wallet/SikatPay tab
  useEffect(() => {
    if (
      !isOpen ||
      activePass ||
      activeView !== 'plans' ||
      checkoutStep !== 'qr_confirm' ||
      !pendingCheckout ||
      pendingCheckout.provider === 'kofi'
    ) {
      return;
    }

    void trySilentPendingVerification();

    const intervalId = window.setInterval(() => {
      void trySilentPendingVerification();
    }, 3000);

    const handleReturnCheck = () => {
      if (typeof document === 'undefined' || !document.hidden) {
        void trySilentPendingVerification();
      }
    };
    window.addEventListener('focus', handleReturnCheck);
    document.addEventListener('visibilitychange', handleReturnCheck);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleReturnCheck);
      document.removeEventListener('visibilitychange', handleReturnCheck);
    };
  }, [isOpen, activePass, activeView, checkoutStep, pendingCheckout, trySilentPendingVerification]);

  if (!isOpen) return null;

  const region: PricingRegion =
    isPhEligible && paymentGateway !== 'kofi' ? 'PH' : 'INTL';
  const plans = getPricingCatalog(region);
  const currentPlan = plans.find((p) => p.tier === selectedTier) || plans[1];

  const handleStartCheckout = async () => {
    setErrorMessage(null);
    setIsProcessing(true);
    try {
      const deviceTokenHash = getOrCreateDeviceTokenHash();
      const res = await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: selectedTier,
          region,
          provider: paymentGateway,
          paymentMethod: paymentGateway === 'bayadgate' ? bayadgateMethod : undefined,
          deviceTokenHash,
          bouquetCode,
          shopCodes: shopConfig,
          origin: typeof window !== 'undefined' ? window.location.origin : '',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMessage(data.message || 'Could not start checkout.');
        return;
      }

      const nextPending = {
        checkoutId: data.checkoutId,
        checkoutToken: data.checkoutToken,
        passKeyPreview: data.passKeyPreview,
        plan: data.plan,
        provider: data.provider as 'sikatpay' | 'bayadgate' | 'paymongo' | 'kofi',
        orderId: data.orderId || null,
        paymentMethod: (data.paymentMethod || null) as BayadgatePaymentMethod | null,
        checkoutUrl: data.checkoutUrl || null,
        liveGatewayConfigured: Boolean(data.liveGatewayConfigured),
      };
      setPendingCheckout(nextPending);
      savePendingCheckoutStorage({
        checkoutId: nextPending.checkoutId,
        checkoutToken: nextPending.checkoutToken,
        provider: nextPending.provider,
        orderId: nextPending.orderId,
        paymentMethod: nextPending.paymentMethod,
        checkoutUrl: nextPending.checkoutUrl,
        passKeyPreview: nextPending.passKeyPreview,
        plan: nextPending.plan,
        liveGatewayConfigured: nextPending.liveGatewayConfigured,
        bouquetCode: bouquetCode || null,
        resumeAction: triggerAction,
        createdAtMs: Date.now(),
      });
      setCheckoutStep('qr_confirm');
    } catch {
      setErrorMessage('Connection error. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompleteVerification = async () => {
    if (!pendingCheckout) return;
    if (pendingCheckout.provider === 'kofi' && pendingCheckout.liveGatewayConfigured) {
      const trimmedEmail = buyerEmail.trim();
      if (!trimmedEmail || !trimmedEmail.includes('@')) {
        setErrorMessage('Enter the email address you typed on Ko-fi checkout (not your name).');
        return;
      }
    }
    setErrorMessage(null);
    setIsProcessing(true);
    try {
      const deviceTokenHash = getOrCreateDeviceTokenHash();
      const res = await fetch('/api/payments/verify-and-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkoutId: pendingCheckout.checkoutId,
          checkoutToken: pendingCheckout.checkoutToken,
          deviceTokenHash,
          buyerEmail: buyerEmail.trim().toLowerCase(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok || !data.pass) {
        setErrorMessage(
          data.message ||
            'Your payment is still being confirmed. Please complete payment and tap Verify Order again in a moment.'
        );
        return;
      }

      await activateVerifiedPass(data.pass as StudioPassRecord);
    } catch {
      setErrorMessage('We couldn’t reach the verification server right now. Please try again in a moment.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDiscardPendingCheckout = () => {
    clearPendingCheckoutStorage();
    setPendingCheckout(null);
    setCheckoutStep('select');
    setErrorMessage(null);
  };

  const handleRedeemPassKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const rawTrimmed = redeemInput.trim();
    // Stealth Owner Gate Trigger: typing `admin` in "Have a Key?" opens the encrypted bouquet gate URL
    if (rawTrimmed.toLowerCase() === 'admin') {
      setIsProcessing(true);
      try {
        const deviceTokenHash = getOrCreateDeviceTokenHash();
        const res = await fetch('/api/payments/redeem-pass', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            passKey: 'admin',
            deviceTokenHash,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok && data.status === 'STEALTH_GATE' && data.gatePath) {
          setRedeemInput('');
          onClose();
          onStealthGateTriggered?.(data.gatePath, data.gateSlug);
          return;
        }
        setErrorMessage('Could not open private link.');
      } catch {
        setErrorMessage('Connection error. Please try again.');
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    const upperTrimmed = rawTrimmed.toUpperCase();
    const isOrderIdLookup = /^(SB-[A-F0-9]{8,16}|BG[A-F0-9]{8,20})$/.test(upperTrimmed);
    const cleanedKey = isOrderIdLookup ? upperTrimmed : normalizePassKey(redeemInput);
    if (!cleanedKey) {
      setErrorMessage('Please enter your BLOOM-XXXX-XXXX Pass Key or SB-... Order ID.');
      return;
    }

    setIsProcessing(true);
    try {
      const deviceTokenHash = getOrCreateDeviceTokenHash();

      const res = await fetch('/api/payments/redeem-pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passKey: cleanedKey,
          deviceTokenHash,
          bouquetCode: bouquetCode || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok || !data.pass) {
        setErrorMessage(
          data.message ||
            'We couldn’t activate that key. Please double-check your code or choose a Studio Pass in the Passes tab.'
        );
        return;
      }

      clearPendingCheckoutStorage();
      setPendingCheckout(null);
      setCheckoutStep('select');
      const verifiedPass = data.pass as StudioPassRecord;
      void saveStudioPassToFirestore(verifiedPass).catch(() => {});
      onPassActivated(verifiedPass, triggerAction);
      setRedeemInput('');
      if (verifiedPass.tier !== 'single' && triggerAction !== 'share' && triggerAction !== 'png') {
        setActiveView('pass_card');
      }
    } catch {
      setErrorMessage('We couldn’t verify your Pass Key right now. Please check your connection and try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyPassKey = (keyToCopy: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(keyToCopy).catch(() => {});
    }
    setCopiedPassKey(true);
    onToast('Key copied!');
    setTimeout(() => setCopiedPassKey(false), 2000);
  };

  const planMeta: Record<
    StudioPassTier,
    {
      compactName: string;
      allowance: string;
      galleryNote: string;
      badge?: string;
    }
  > = {
    single: {
      compactName: 'Single Bouquet',
      allowance: '1 premium bouquet',
      galleryNote: '90-day gallery',
    },
    pass_7d: {
      compactName: '7-Day Pass',
      allowance: 'Unlimited · 7 days',
      galleryNote: '90-day gallery',
      badge: 'Best Value',
    },
    pass_30d: {
      compactName: '30-Day Pass',
      allowance: 'Unlimited · 30 days',
      galleryNote: 'Eternal showcase',
    },
  };

  const hasActiveSubscriptionPass = Boolean(activePass && activePass.tier !== 'single');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Studio Pass"
      data-testid="studio-checkout-modal"
      onClick={() => {
        if (checkoutStep !== 'qr_confirm') {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-5 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg rounded-[26px] p-4 sm:p-6 shadow-[0_24px_60px_rgba(28,20,16,0.2)] border border-dashed relative max-h-[90dvh] overflow-y-auto transition-colors ${
          isDarkMode
            ? 'bg-[#352C29] border-[#5E4E49] text-[#FBF6F1]'
            : 'bg-[#FFFDF9] border-[#DECBB9] text-[#231C18]'
        }`}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer ${
            isDarkMode
              ? 'text-[#C8B6AC] hover:text-[#FBF6F1] hover:bg-[#463A36]'
              : 'text-[#8C7A70] hover:text-[#231C18] hover:bg-[#F5EDE4]'
          }`}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Editorial Title (No uppercase eyebrow label per AI_CONTEXT.md) */}
        <div className="flex items-center gap-2 pr-8">
          <CoutureBloomSeal className="w-4.5 h-4.5 text-[#B4846C] shrink-0" />
          <h3
            className="text-2xl sm:text-[27px] font-medium tracking-tight leading-tight"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            {activeView === 'pass_card'
              ? 'Your Studio Pass'
              : activeView === 'redeem'
              ? 'Enter Pass Key'
              : 'Unlock Premium'}
          </h3>
        </div>

        {/* Clean Top Switcher — Hidden when user is already on an active pass */}
        {!hasActiveSubscriptionPass && activeView !== 'pass_card' && (
          <div className="mt-3 flex items-center justify-between gap-2">
            <div
              className={`inline-flex items-center p-0.5 rounded-full border border-dashed text-[11px] font-medium ${
                isDarkMode
                  ? 'bg-[#2B2321] border-[#544540]'
                  : 'bg-[#FAF4EE] border-[#DECBB9]'
              }`}
            >
              <button
                type="button"
                data-testid="checkout-tab-plans"
                onClick={() => {
                  setActiveView('plans');
                  setErrorMessage(null);
                }}
                className={`px-3 py-1 rounded-full transition cursor-pointer ${
                  activeView === 'plans'
                    ? isDarkMode
                      ? 'bg-[#E6B89C] text-[#231C18]'
                      : 'bg-[#6E4434] text-[#FFFDF9]'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                Passes
              </button>
              <button
                type="button"
                data-testid="checkout-tab-redeem"
                onClick={() => {
                  setActiveView('redeem');
                  setErrorMessage(null);
                }}
                className={`px-3 py-1 rounded-full transition cursor-pointer ${
                  activeView === 'redeem'
                    ? isDarkMode
                      ? 'bg-[#E6B89C] text-[#231C18]'
                      : 'bg-[#6E4434] text-[#FFFDF9]'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                Have a Key?
              </button>
            </div>
          </div>
        )}

        {/* Unboxed Couture Trigger Summary (Only when triggered by Couture items, High-Res PNG, or Surprise Email Delivery) */}
        {activeView === 'plans' &&
          checkoutStep === 'select' &&
          (premiumInspection.isPremiumBouquet ||
            triggerAction === 'png' ||
            triggerAction === 'share') && (
            <p
              className={`mt-2.5 text-[11px] leading-relaxed ${
                isDarkMode ? 'text-[#C8B6AC]' : 'text-[#7D6B60]'
              }`}
            >
              <span className="font-medium opacity-90">Includes in your unlock: </span>
              {[
                ...(triggerAction === 'png' ? ['High-Res PNG'] : []),
                ...(triggerAction === 'share' && !premiumInspection.isPremiumBouquet
                  ? ['Surprise Email Delivery']
                  : []),
                ...premiumInspection.features.slice(0, 4).map((f) => f.label),
                ...(premiumInspection.features.length > 4
                  ? [`+${premiumInspection.features.length - 4} more`]
                  : []),
              ].join(' · ')}
            </p>
          )}

        {/* Error Alert */}
        {errorMessage && (
          <div
            role="alert"
            className="mt-3 px-3 py-2 rounded-xl border border-dashed border-rose-400/60 bg-rose-500/10 text-xs text-rose-700 dark:text-rose-200"
          >
            {errorMessage}
          </div>
        )}

        {/* ===================================================================
            VIEW 1: 3 HORIZONTAL ILLUSTRATED LINE-ART PASS CARDS & PAYMENT
            =================================================================== */}
        {activeView === 'plans' && checkoutStep === 'select' && (
          <div className="mt-3.5 space-y-3">
            {/* 3 Horizontal Visual Line-Art Stationery Cards */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 items-stretch">
              {plans.map((plan) => {
                const isSelected = selectedTier === plan.tier;
                const meta = planMeta[plan.tier];
                return (
                  <button
                    key={plan.tier}
                    type="button"
                    data-testid={`plan-card-${plan.tier}`}
                    onClick={() => setSelectedTier(plan.tier)}
                    className={`text-center p-2 sm:p-2.5 rounded-2xl border border-dashed transition cursor-pointer flex flex-col items-center justify-between gap-2 relative ${
                      isSelected
                        ? isDarkMode
                          ? 'bg-[#423632] border-[#E6B89C] ring-1 ring-[#E6B89C]/50'
                          : 'bg-[#FAF3EB] border-[#6E4434] ring-1 ring-[#6E4434]/35'
                        : isDarkMode
                        ? 'bg-[#2B2321]/70 border-[#544540] hover:border-[#7A655D]'
                        : 'bg-[#FFFDF9] border-[#DECBB9] hover:border-[#B4846C]'
                    }`}
                  >
                    <div className="w-full space-y-1.5">
                      <StudioPassLineartSymbol
                        tier={plan.tier}
                        isDarkMode={isDarkMode}
                        isSelected={isSelected}
                        size="card"
                      />
                      <div className="pt-0.5 space-y-0.5">
                        <div className="min-h-[14px] flex items-center justify-center">
                          {meta.badge ? (
                            <span
                              className={`text-[9.5px] uppercase tracking-[0.1em] font-semibold ${
                                isDarkMode ? 'text-[#E6B89C]' : 'text-[#8A5A44]'
                              }`}
                            >
                              {meta.badge}
                            </span>
                          ) : null}
                        </div>
                        <div
                          className="text-[13px] sm:text-[16px] font-semibold leading-tight"
                          style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                        >
                          {meta.compactName}
                        </div>
                      </div>
                      <div
                        className={`pt-1 border-t border-dashed space-y-0.5 text-[9.5px] sm:text-[10.5px] leading-snug ${
                          isDarkMode
                            ? 'border-[#544540] text-[#D8C7BE]'
                            : 'border-[#E6D6C7] text-[#66544A]'
                        }`}
                      >
                        <div className="font-medium">{meta.allowance}</div>
                        <div className="opacity-80">{meta.galleryNote}</div>
                      </div>
                    </div>

                    <div
                      className="text-base sm:text-xl font-semibold tracking-tight pt-0.5 min-h-[26px] flex items-center justify-center tabular-nums"
                      style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                    >
                      {isResolvingRegion ? (
                        <span
                          aria-hidden="true"
                          className={`inline-block h-4 w-11 rounded-full animate-pulse ${
                            isDarkMode ? 'bg-[#4E3F3A]' : 'bg-[#EADCD0]'
                          }`}
                        />
                      ) : (
                        plan.displayPrice
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Clear Gallery Expiration vs. Permanent Recipient Link Note */}
            <div
              data-testid="entitlement-link-permanence-note"
              className={`px-3.5 py-2.5 rounded-xl border border-dashed text-left ${
                isDarkMode
                  ? 'bg-[#2B2321]/75 border-[#544540] text-[#E6D6C7]'
                  : 'bg-[#FAF4EE]/85 border-[#DECBB9] text-[#4E3D34]'
              }`}
            >
              <div className="flex items-start gap-2">
                <CoutureBloomSeal
                  className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                    isDarkMode ? 'text-[#E6B89C]' : 'text-[#8A5A44]'
                  }`}
                />
                <div className="space-y-0.5 text-[11px] leading-snug">
                  <p className="font-semibold">
                    Recipient gift links never expire
                  </p>
                  <p className="opacity-80">
                    Your recipient can open their bouquet link forever. Only public Shared Creations gallery listings expire (30d free · 90d Single &amp; 7-Day · Eternal on 30-Day Pass).
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Method: Server-Gated PH Local E-Wallets (SikatPay / BayadGate) vs USD Ko-fi */}
            {isResolvingRegion ? (
              <div
                aria-busy="true"
                className={`py-2.5 px-3.5 rounded-xl border border-dashed flex items-center justify-between ${
                  isDarkMode
                    ? 'border-[#544540] bg-[#2B2321]/70'
                    : 'border-[#DECBB9] bg-[#FAF4EE]'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-36 rounded-full animate-pulse ${
                    isDarkMode ? 'bg-[#4E3F3A]' : 'bg-[#EADCD0]'
                  }`}
                />
                <span
                  className={`inline-block h-3 w-16 rounded-full animate-pulse ${
                    isDarkMode ? 'bg-[#4E3F3A]' : 'bg-[#EADCD0]'
                  }`}
                />
              </div>
            ) : isPhEligible && paymentGateway === 'sikatpay' ? (
              <div
                data-testid="gateway-sikatpay"
                className={`py-2.5 px-3.5 rounded-xl border border-dashed flex items-center justify-between ${
                  isDarkMode
                    ? 'border-[#E6B89C] bg-[#3B302C]'
                    : 'border-[#6E4434] bg-[#FAF3EB]'
                }`}
              >
                <div>
                  <div className="text-xs font-semibold">QR Ph · GCash · Maya</div>
                  <div className="text-[10px] opacity-70">Any PH bank or e-wallet app</div>
                </div>
                <div className="text-[10.5px] opacity-75">Instant PH Pay</div>
              </div>
            ) : isPhEligible && paymentGateway === 'bayadgate' ? (
              <div
                data-testid="gateway-bayadgate"
                className={`p-3 rounded-xl border border-dashed space-y-2.5 ${
                  isDarkMode
                    ? 'border-[#E6B89C] bg-[#3B302C]'
                    : 'border-[#6E4434] bg-[#FAF3EB]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold">GCash · Maya · GoTyme</div>
                  <div className="text-[10.5px] opacity-75">Instant PH Wallet</div>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: 'GCASH', label: 'GCash' },
                      { id: 'MAYA', label: 'Maya' },
                      { id: 'GOTYME', label: 'GoTyme' },
                    ] as const
                  ).map((wallet) => {
                    const active = bayadgateMethod === wallet.id;
                    return (
                      <button
                        key={wallet.id}
                        type="button"
                        data-testid={`bayadgate-method-${wallet.id}`}
                        onClick={() => setBayadgateMethod(wallet.id)}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border border-dashed transition cursor-pointer ${
                          active
                            ? isDarkMode
                              ? 'bg-[#E6B89C] text-[#231C18] border-[#E6B89C]'
                              : 'bg-[#6E4434] text-[#FFFDF9] border-[#6E4434]'
                            : isDarkMode
                            ? 'bg-[#2B2321]/70 text-[#E6D6C7] border-[#5E4E49] hover:border-[#E6B89C]/60'
                            : 'bg-[#FFFDF9] text-[#5C4438] border-[#DECBB9] hover:border-[#6E4434]/60'
                        }`}
                      >
                        {wallet.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div
                data-testid="gateway-kofi"
                className={`py-2.5 px-3.5 rounded-xl border border-dashed flex items-center justify-between ${
                  isDarkMode
                    ? 'border-[#E6B89C] bg-[#3B302C]'
                    : 'border-[#6E4434] bg-[#FAF3EB]'
                }`}
              >
                <div className="text-xs font-semibold">PayPal · Card · Ko-fi</div>
                <div className="text-[10.5px] opacity-75">Instant Unlock</div>
              </div>
            )}

            {/* Primary Action Button */}
            <button
              type="button"
              data-testid="start-checkout-btn"
              disabled={isProcessing || isResolvingRegion}
              onClick={handleStartCheckout}
              className={`w-full py-2.5 px-4 rounded-full text-xs sm:text-sm font-medium transition active:scale-99 cursor-pointer disabled:opacity-50 ${
                isDarkMode
                  ? 'bg-[#E6B89C] text-[#231C18] hover:bg-[#F0C8B0]'
                  : 'bg-[#6E4434] text-[#FFFDF9] hover:bg-[#5B3729]'
              }`}
            >
              {isResolvingRegion
                ? 'Loading local pricing...'
                : isProcessing
                ? 'Preparing...'
                : `Continue · ${currentPlan.displayPrice}`}
            </button>

            {/* Quiet Footer Note */}
            <div className="flex items-center justify-center text-[10px] opacity-65 pt-0.5">
              <span>No account needed · Instant unlock</span>
            </div>
          </div>
        )}

        {/* ===================================================================
            STEP 2: CLEAN BAYADGATE / KO-FI / QR CHECKOUT CONFIRMATION
            =================================================================== */}
        {activeView === 'plans' && checkoutStep === 'qr_confirm' && pendingCheckout && (
          <div className="mt-4 space-y-3.5 animate-in fade-in duration-150">
            <div
              className={`p-4 rounded-2xl border border-dashed text-center space-y-3 ${
                isDarkMode
                  ? 'bg-[#2B2321] border-[#5E4E49]'
                  : 'bg-[#FAF4EE] border-[#DECBB9]'
              }`}
            >
              <div className="flex items-center justify-center gap-3">
                <StudioPassLineartSymbol
                  tier={pendingCheckout.plan.tier}
                  isDarkMode={isDarkMode}
                  isSelected
                  size="thumb"
                />
                <div className="text-left">
                  <div
                    className="text-xl font-medium"
                    style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                  >
                    {pendingCheckout.plan.name} · {pendingCheckout.plan.displayPrice}
                  </div>
                  <div className="text-[11px] opacity-75">
                    {pendingCheckout.provider === 'sikatpay'
                      ? 'QR Ph · GCash · Maya (SikatPay PH)'
                      : pendingCheckout.provider === 'bayadgate'
                      ? `${
                          pendingCheckout.paymentMethod === 'GOTYME'
                            ? 'GoTyme'
                            : pendingCheckout.paymentMethod === 'MAYA'
                            ? 'Maya'
                            : 'GCash'
                        } · BayadGate PH`
                      : pendingCheckout.provider === 'paymongo'
                      ? 'QR Ph · GCash · Maya'
                      : 'Ko-fi Shop Order'}
                  </div>
                </div>
              </div>

              {pendingCheckout.provider === 'sikatpay' ? (
                <div className="space-y-3 text-center pt-1">
                  {pendingCheckout.checkoutUrl && (
                    <a
                      href={pendingCheckout.checkoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="open-sikatpay-btn"
                      className={`w-full py-3 px-5 rounded-full text-xs sm:text-sm font-semibold shadow-sm ring-2 flex items-center justify-center gap-2 transition active:scale-99 cursor-pointer ${
                        isDarkMode
                          ? 'bg-[#E6B89C] text-[#231C18] ring-[#E6B89C]/35 hover:bg-[#F0C8B0]'
                          : 'bg-[#6E4434] text-[#FFFDF9] ring-[#6E4434]/25 hover:bg-[#5B3729]'
                      }`}
                    >
                      <CoutureBloomSeal className="w-4 h-4 shrink-0" />
                      <span>Pay {pendingCheckout.plan.displayPrice} via QR Ph / GCash / Maya ↗</span>
                    </a>
                  )}
                  <p className="text-[11px] opacity-75 leading-relaxed">
                    Complete payment on the secure SikatPay page (wallet apps show{' '}
                    <span className="font-semibold">PMP BONGGOT TECH</span>), then tap Verify Order below.
                  </p>
                  {pendingCheckout.orderId && (
                    <div className="inline-block px-3 py-1 rounded-full border border-dashed border-[#B4846C]/50 font-mono text-[10.5px] opacity-80">
                      Order {pendingCheckout.orderId}
                    </div>
                  )}
                </div>
              ) : pendingCheckout.provider === 'bayadgate' ? (
                <div className="space-y-3 text-center pt-1">
                  {pendingCheckout.checkoutUrl && (
                    <a
                      href={pendingCheckout.checkoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="open-bayadgate-btn"
                      className={`w-full py-3 px-5 rounded-full text-xs sm:text-sm font-semibold shadow-sm ring-2 flex items-center justify-center gap-2 transition active:scale-99 cursor-pointer ${
                        isDarkMode
                          ? 'bg-[#E6B89C] text-[#231C18] ring-[#E6B89C]/35 hover:bg-[#F0C8B0]'
                          : 'bg-[#6E4434] text-[#FFFDF9] ring-[#6E4434]/25 hover:bg-[#5B3729]'
                      }`}
                    >
                      <CoutureBloomSeal className="w-4 h-4 shrink-0" />
                      <span>
                        Pay {pendingCheckout.plan.displayPrice} via{' '}
                        {pendingCheckout.paymentMethod === 'GOTYME'
                          ? 'GoTyme'
                          : pendingCheckout.paymentMethod === 'MAYA'
                          ? 'Maya'
                          : 'GCash'}{' '}
                        ↗
                      </span>
                    </a>
                  )}
                  <p className="text-[11px] opacity-75 leading-relaxed">
                    Complete payment on the secure BayadGate page, then tap Verify Order below.
                  </p>
                  {pendingCheckout.orderId && (
                    <div className="inline-block px-3 py-1 rounded-full border border-dashed border-[#B4846C]/50 font-mono text-[10.5px] opacity-80">
                      Order {pendingCheckout.orderId}
                    </div>
                  )}
                </div>
              ) : pendingCheckout.provider === 'kofi' ? (
                <div className="space-y-3.5 text-left pt-1">
                  {/* Prominent Primary Action: Open Ko-fi Shop */}
                  <div className="space-y-1.5 text-center">
                    <a
                      href={pendingCheckout.checkoutUrl || 'https://ko-fi.com/luxinnamon/shop'}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="open-kofi-shop-btn"
                      className={`w-full py-3 px-5 rounded-full text-xs sm:text-sm font-semibold shadow-sm ring-2 flex items-center justify-center gap-2 transition active:scale-99 cursor-pointer ${
                        isDarkMode
                          ? 'bg-[#E6B89C] text-[#231C18] ring-[#E6B89C]/35 hover:bg-[#F0C8B0]'
                          : 'bg-[#6E4434] text-[#FFFDF9] ring-[#6E4434]/25 hover:bg-[#5B3729]'
                      }`}
                    >
                      <CoutureBloomSeal className="w-4 h-4 shrink-0" />
                      <span>Open {pendingCheckout.plan.name} on Ko-fi Shop ↗</span>
                    </a>
                    <p className="text-[10.5px] opacity-70">
                      1. Complete your order on Ko-fi, then verify your checkout email below
                    </p>
                  </div>

                  <div
                    className={`pt-3 border-t border-dashed space-y-1.5 ${
                      isDarkMode ? 'border-[#544540]' : 'border-[#DECBB9]'
                    }`}
                  >
                    <label
                      htmlFor="kofi-buyer-email"
                      className="block text-[11px] font-medium opacity-85 text-center"
                    >
                      2. Email typed on Ko-fi checkout (not your name)
                    </label>
                    <input
                      id="kofi-buyer-email"
                      type="email"
                      data-testid="kofi-buyer-email-input"
                      value={buyerEmail}
                      onChange={(e) => setBuyerEmail(e.target.value)}
                      placeholder="you@example.com"
                      className={`w-full px-3.5 py-2.5 rounded-xl border border-dashed text-xs text-center focus:outline-none focus:border-[#B4846C] ${
                        isDarkMode
                          ? 'bg-[#221B19] border-[#66554F] text-[#FBF6F1]'
                          : 'bg-[#FFFDF9] border-[#D8C4B4] text-[#231C18]'
                      }`}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="mx-auto w-36 h-36 rounded-2xl border border-dashed border-[#D8C4B4] bg-[#FFFDF9] text-[#231C18] p-3 flex flex-col items-center justify-center gap-1.5">
                    <QrCode className="w-20 h-20 text-[#231C18]" strokeWidth={1.35} />
                    <span className="font-mono text-[10px] tracking-wider text-[#6E4434]">
                      {pendingCheckout.passKeyPreview}
                    </span>
                  </div>

                  {pendingCheckout.checkoutUrl && (
                    <a
                      href={pendingCheckout.checkoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-3.5 py-1.5 rounded-full text-xs font-medium border border-dashed border-[#B4846C] text-[#B4846C] hover:opacity-85 transition"
                    >
                      Open Payment Page ↗
                    </a>
                  )}
                </>
              )}
            </div>

            {pendingCheckout.provider !== 'kofi' && (
              <div className="text-center text-[10.5px] opacity-70">
                Checking payment automatically · Your order stays saved if you close this window
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                data-testid="discard-pending-checkout-btn"
                onClick={handleDiscardPendingCheckout}
                className={`py-2.5 px-4 rounded-full border border-dashed text-xs font-medium transition cursor-pointer ${
                  isDarkMode
                    ? 'border-[#5C4B47] text-[#D8C7BE] hover:bg-[#463A36]'
                    : 'border-[#DECBB9] text-[#5C4438] hover:bg-[#F3E9DF]'
                }`}
              >
                Switch plan
              </button>
              <button
                type="button"
                data-testid="confirm-checkout-verify-btn"
                disabled={isProcessing}
                onClick={handleCompleteVerification}
                className={`flex-1 py-2.5 px-4 rounded-full text-xs sm:text-sm font-medium transition cursor-pointer disabled:opacity-50 ${
                  isDarkMode
                    ? 'bg-[#E6B89C] text-[#231C18] hover:bg-[#F0C8B0]'
                    : 'bg-[#6E4434] text-[#FFFDF9] hover:bg-[#5B3729]'
                }`}
              >
                {isProcessing
                  ? 'Verifying...'
                  : pendingCheckout.provider === 'kofi' ||
                    pendingCheckout.provider === 'bayadgate' ||
                    pendingCheckout.provider === 'sikatpay'
                  ? "I've Paid · Verify Order"
                  : 'Complete & Unlock'}
              </button>
            </div>
          </div>
        )}

        {/* ===================================================================
            VIEW 2: REDEEM PASS KEY OR ORDER ID
            =================================================================== */}
        {activeView === 'redeem' && (
          <form onSubmit={handleRedeemPassKey} className="mt-4 space-y-3">
            <div
              className={`p-3.5 rounded-2xl border border-dashed space-y-2 ${
                isDarkMode
                  ? 'bg-[#2B2321]/80 border-[#544540]'
                  : 'bg-[#FAF4EE]/80 border-[#DECBB9]'
              }`}
            >
              <input
                type="text"
                data-testid="redeem-pass-input"
                value={redeemInput}
                onChange={(e) => setRedeemInput(e.target.value.toUpperCase())}
                placeholder="BLOOM-XXXX-XXXX or Order ID (SB-...)"
                maxLength={24}
                className={`w-full px-3.5 py-2 rounded-xl border border-dashed font-mono text-sm tracking-wider uppercase text-center focus:outline-none focus:border-[#B4846C] ${
                  isDarkMode
                    ? 'bg-[#352C29] border-[#66554F] text-[#FBF6F1]'
                    : 'bg-[#FFFDF9] border-[#D8C4B4] text-[#231C18]'
                }`}
              />
              <p className="text-[11px] opacity-65 text-center">
                Enter your Pass Key or SikatPay Order ID · 1 active session
              </p>
            </div>

            <button
              type="submit"
              data-testid="redeem-pass-submit-btn"
              disabled={isProcessing}
              className={`w-full py-2.5 px-4 rounded-full text-xs sm:text-sm font-medium transition cursor-pointer disabled:opacity-50 ${
                isDarkMode
                  ? 'bg-[#E6B89C] text-[#231C18] hover:bg-[#F0C8B0]'
                  : 'bg-[#6E4434] text-[#FFFDF9] hover:bg-[#5B3729]'
              }`}
            >
              {isProcessing ? 'Verifying...' : 'Activate Pass Key'}
            </button>
          </form>
        )}

        {/* ===================================================================
            VIEW 3: ACTIVE PASS KEEPSAKE TICKET + SWEET THANK-YOU MESSAGE
            =================================================================== */}
        {activeView === 'pass_card' && activePass && (
          <div className="mt-3.5 space-y-3 animate-in fade-in duration-150">
            <div
              data-testid="active-pass-keepsake-card"
              className={`p-4 rounded-2xl border border-dashed space-y-3 ${
                isDarkMode
                  ? 'bg-[#2B2321] border-[#E6B89C]/50'
                  : 'bg-[#FAF4EE] border-[#DECBB9]'
              }`}
            >
              <div className="flex items-center gap-3">
                <StudioPassLineartSymbol
                  tier={activePass.tier}
                  isDarkMode={isDarkMode}
                  isSelected
                  size="thumb"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-lg sm:text-xl font-semibold leading-tight"
                      style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                    >
                      {isTesterVoucherPass(activePass)
                        ? `Couture Tester Pass (${
                            parseTesterVoucherMeta(activePass).label
                          })`
                        : activePass.tier === 'pass_30d'
                        ? '30-Day Pass'
                        : activePass.tier === 'pass_7d'
                        ? '7-Day Pass'
                        : 'Single Bouquet Pass'}
                    </span>
                    <span className="text-[11px] text-[#B4846C] font-medium shrink-0 tabular-nums">
                      {formatPassRemainingTime(activePass.expiresAt)}
                    </span>
                  </div>
                  <p className="text-[11px] opacity-75 mt-0.5">
                    {isTesterVoucherPass(activePass)
                      ? `1-device Tester Voucher · ${activePass.retentionDays}-day gallery · Permanent gift links`
                      : activePass.isEternalKeepsake
                      ? 'Unlimited for 30 days · Eternal gallery showcase · Permanent gift links'
                      : `All Couture pieces · ${activePass.retentionDays}-day gallery · Permanent gift links`}
                  </p>
                </div>
              </div>

              <div
                className={`px-3.5 py-2.5 rounded-xl border border-dashed flex items-center justify-between gap-2 ${
                  isDarkMode
                    ? 'bg-[#352C29] border-[#5E4E49]'
                    : 'bg-[#FFFDF9] border-[#DECBB9]'
                }`}
              >
                <span
                  data-testid="active-pass-key-code"
                  className="font-mono text-sm sm:text-base font-semibold tracking-wider"
                >
                  {activePass.passKey}
                </span>
                <button
                  type="button"
                  data-testid="copy-pass-key-btn"
                  onClick={() => handleCopyPassKey(activePass.passKey)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 border border-dashed transition cursor-pointer ${
                    isDarkMode
                      ? 'border-[#66554F] hover:bg-[#463A36]'
                      : 'border-[#D8C4B4] hover:bg-[#F3E9DF]'
                  }`}
                >
                  {copiedPassKey ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* Humble Solo-Dev Thank-You Note */}
              <div
                data-testid="active-pass-thank-you-note"
                className={`px-3.5 py-2.5 rounded-xl border border-dashed text-center ${
                  isDarkMode
                    ? 'bg-[#352C29]/70 border-[#544540] text-[#EBDAD0]'
                    : 'bg-[#FFFDF9]/90 border-[#E2D1C1] text-[#5C4438]'
                }`}
              >
                <p
                  className="text-sm sm:text-[15px] italic leading-snug"
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                >
                  “Thank you so much for supporting this little project. Every pass helps me keep the page running and continue crafting new blooms for everyone.”
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className={`w-full py-2.5 px-4 rounded-full text-xs sm:text-sm font-medium transition cursor-pointer ${
                isDarkMode
                  ? 'bg-[#E6B89C] text-[#231C18] hover:bg-[#F0C8B0]'
                  : 'bg-[#6E4434] text-[#FFFDF9] hover:bg-[#5B3729]'
              }`}
            >
              Done
            </button>

            <div className="flex items-center justify-between text-[10px] opacity-65 pt-0.5 px-1">
              <span>Bound to this device · 1 active session</span>
              <button
                type="button"
                data-testid="switch-pass-key-btn"
                onClick={() => {
                  setActiveView('redeem');
                  setErrorMessage(null);
                }}
                className="underline hover:opacity-100 cursor-pointer"
              >
                Have a Key?
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
