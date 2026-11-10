import React, { useState, useEffect } from 'react';
import { Check, Copy, QrCode, X } from 'lucide-react';
import {
  BouquetPremiumInspection,
  formatPassRemainingTime,
  getActivePremiumAssetConfig,
  getOrCreateDeviceTokenHash,
  getPricingCatalog,
  getStoredKofiShopConfig,
  KofiShopItemConfig,
  normalizePassKey,
  PREMIUM_ASSET_CONFIG,
  PremiumAssetConfig,
  PricingRegion,
  PricingTierPlan,
  saveStoredKofiShopConfig,
  StudioPassRecord,
  StudioPassTier,
} from '../lib/monetization';
import {
  fetchStudioPassFromFirestore,
  saveStudioPassToFirestore,
} from '../lib/firebase';
import {
  FLOWER_CATALOG,
  RIBBON_STYLE_CATALOG,
  WRAPPER_CATALOG,
} from '../types/bouquet';

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
  bouquetCode: string;
  premiumInspection: BouquetPremiumInspection;
  activePass: StudioPassRecord | null;
  onClose: () => void;
  onPassActivated: (
    pass: StudioPassRecord,
    resumeAction: 'share' | 'png' | 'pass_menu'
  ) => void;
  onPremiumConfigChanged?: (nextConfig: PremiumAssetConfig) => void;
  onToast: (msg: string) => void;
}

export const StudioCheckoutModal: React.FC<StudioCheckoutModalProps> = ({
  isOpen,
  isDarkMode,
  triggerAction,
  bouquetCode,
  premiumInspection,
  activePass,
  onClose,
  onPassActivated,
  onPremiumConfigChanged,
  onToast,
}) => {
  const [region, setRegion] = useState<PricingRegion>('INTL');
  const [selectedTier, setSelectedTier] = useState<StudioPassTier>('pass_7d');
  const [paymentGateway, setPaymentGateway] = useState<'paymongo' | 'kofi'>('kofi');
  const [activeView, setActiveView] = useState<'plans' | 'redeem' | 'pass_card' | 'asset_config'>(
    () => (activePass ? 'pass_card' : 'plans')
  );
  const [checkoutStep, setCheckoutStep] = useState<'select' | 'qr_confirm'>('select');
  const [pendingCheckout, setPendingCheckout] = useState<{
    checkoutId: string;
    checkoutToken: string;
    passKeyPreview: string;
    plan: PricingTierPlan;
    provider: 'paymongo' | 'kofi';
    checkoutUrl: string | null;
    liveGatewayConfigured: boolean;
  } | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [buyerEmail, setBuyerEmail] = useState('');
  const [redeemInput, setRedeemInput] = useState('');
  const [copiedPassKey, setCopiedPassKey] = useState(false);
  const [customConfig, setCustomConfig] = useState<PremiumAssetConfig>(() =>
    getActivePremiumAssetConfig()
  );
  const [shopConfig, setShopConfig] = useState<KofiShopItemConfig>(() =>
    getStoredKofiShopConfig()
  );

  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage(null);
    setCheckoutStep('select');
    setPendingCheckout(null);
    if (activePass) {
      setActiveView('pass_card');
    } else {
      setActiveView('plans');
    }
  }, [isOpen, activePass, triggerAction]);

  if (!isOpen) return null;

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
          provider: region === 'PH' ? 'paymongo' : paymentGateway,
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

      setPendingCheckout({
        checkoutId: data.checkoutId,
        checkoutToken: data.checkoutToken,
        passKeyPreview: data.passKeyPreview,
        plan: data.plan,
        provider: data.provider,
        checkoutUrl: data.checkoutUrl || null,
        liveGatewayConfigured: Boolean(data.liveGatewayConfigured),
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
        setErrorMessage(data.message || 'Payment not confirmed yet.');
        return;
      }

      const issuedPass = data.pass as StudioPassRecord;
      await saveStudioPassToFirestore(issuedPass).catch(() => {});
      onPassActivated(issuedPass, triggerAction);
      if (issuedPass.tier === 'single') {
        onClose();
      } else {
        setActiveView('pass_card');
      }
    } catch {
      setErrorMessage('Could not verify pass.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveShopConfig = async () => {
    const saved = saveStoredKofiShopConfig(shopConfig);
    setShopConfig(saved);
    try {
      await fetch('/api/payments/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncShopCodes: saved }),
      });
      onToast('Ko-fi Shop codes saved');
    } catch {
      onToast('Ko-fi Shop codes saved locally');
    }
  };

  const handleRedeemPassKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const cleanedKey = normalizePassKey(redeemInput);
    if (!cleanedKey) {
      setErrorMessage('Enter your BLOOM-XXXX-XXXX key.');
      return;
    }

    setIsProcessing(true);
    try {
      const deviceTokenHash = getOrCreateDeviceTokenHash();
      const remoteRecord = await fetchStudioPassFromFirestore(cleanedKey).catch(() => null);

      const res = await fetch('/api/payments/redeem-pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passKey: cleanedKey,
          deviceTokenHash,
          existingRecord: remoteRecord,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok || !data.pass) {
        setErrorMessage(data.message || 'Invalid or already bound Pass Key.');
        return;
      }

      const verifiedPass = data.pass as StudioPassRecord;
      await saveStudioPassToFirestore(verifiedPass).catch(() => {});
      onPassActivated(verifiedPass, triggerAction);
      setRedeemInput('');
      setActiveView('pass_card');
    } catch {
      setErrorMessage('Could not verify Pass Key.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyPassKey = (keyToCopy: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(keyToCopy).catch(() => {});
    }
    setCopiedPassKey(true);
    onToast('Pass Key copied');
    setTimeout(() => setCopiedPassKey(false), 2000);
  };

  const handleToggleAssetInConfig = <K extends 'flowers' | 'wraps' | 'ribbons'>(
    category: K,
    itemValue: PremiumAssetConfig[K][number]
  ) => {
    const currentList = customConfig[category] as string[];
    const exists = currentList.includes(itemValue as string);
    const nextList = exists
      ? currentList.filter((x) => x !== itemValue)
      : [...currentList, itemValue as string];
    const nextConfig: PremiumAssetConfig = {
      ...customConfig,
      [category]: nextList as PremiumAssetConfig[K],
    };
    setCustomConfig(nextConfig);
    try {
      window.localStorage.setItem('sab_custom_premium_config_v1', JSON.stringify(nextConfig));
    } catch {
      // Ignore storage quota
    }
    onPremiumConfigChanged?.(nextConfig);
  };

  const handleResetDefaultAssetConfig = () => {
    setCustomConfig(PREMIUM_ASSET_CONFIG);
    try {
      window.localStorage.removeItem('sab_custom_premium_config_v1');
    } catch {
      // Ignore
    }
    onPremiumConfigChanged?.(PREMIUM_ASSET_CONFIG);
    onToast('Couture defaults restored');
  };

  const planShortSubtitles: Record<StudioPassTier, string> = {
    single: '1 bouquet · 90d link',
    pass_7d: 'Unlimited · 90d links',
    pass_30d: 'Unlimited · Forever',
  };

  const planCompactNames: Record<StudioPassTier, string> = {
    single: 'Single',
    pass_7d: '7-Day Pass',
    pass_30d: '30-Day Eternal',
  };

  const hasActiveSubscriptionPass = Boolean(activePass && activePass.tier !== 'single');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Studio Pass"
      data-testid="studio-checkout-modal"
      onClick={onClose}
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
              : activeView === 'asset_config'
              ? 'Couture Pieces'
              : 'Unlock Premium'}
          </h3>
        </div>

        {/* Clean Top Switcher + Currency Pill — Hidden when user is already on an active pass */}
        {!hasActiveSubscriptionPass && activeView !== 'pass_card' && activeView !== 'asset_config' && (
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

            {activeView === 'plans' && checkoutStep === 'select' && (
              <div
                className={`inline-flex items-center p-0.5 rounded-full border border-dashed text-[11px] font-medium ${
                  isDarkMode
                    ? 'bg-[#2B2321] border-[#544540]'
                    : 'bg-[#FAF4EE] border-[#DECBB9]'
                }`}
              >
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  title="PHP payments temporarily unavailable"
                  data-testid="region-switch-ph"
                  className="px-2.5 py-0.5 rounded-full opacity-35 cursor-not-allowed select-none line-through"
                >
                  PHP ₱
                </button>
                <button
                  type="button"
                  data-testid="region-switch-intl"
                  onClick={() => {
                    setRegion('INTL');
                    setPaymentGateway('kofi');
                  }}
                  className={`px-2.5 py-0.5 rounded-full transition cursor-pointer ${
                    region === 'INTL'
                      ? isDarkMode
                        ? 'bg-[#E6B89C] text-[#231C18]'
                        : 'bg-[#6E4434] text-[#FFFDF9]'
                      : 'opacity-65 hover:opacity-100'
                  }`}
                >
                  USD $
                </button>
              </div>
            )}
          </div>
        )}

        {/* Compact Couture Items Pill Strip (Only when triggered by Couture items) */}
        {activeView === 'plans' &&
          checkoutStep === 'select' &&
          (premiumInspection.isPremiumBouquet || triggerAction === 'png') && (
            <div className="mt-3 flex items-center gap-1.5 flex-wrap">
              {triggerAction === 'png' && (
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] border border-dashed ${
                    isDarkMode
                      ? 'bg-[#2B2321] border-[#5E4E49] text-[#E6D6C7]'
                      : 'bg-[#FAF4EE] border-[#DECBB9] text-[#5C4438]'
                  }`}
                >
                  High-Res PNG
                </span>
              )}
              {premiumInspection.features.slice(0, 4).map((feat) => (
                <span
                  key={feat.id}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] border border-dashed ${
                    isDarkMode
                      ? 'bg-[#2B2321] border-[#5E4E49] text-[#E6D6C7]'
                      : 'bg-[#FAF4EE] border-[#DECBB9] text-[#5C4438]'
                  }`}
                >
                  {feat.label}
                </span>
              ))}
              {premiumInspection.features.length > 4 && (
                <span className="text-[11px] opacity-65">
                  +{premiumInspection.features.length - 4} more
                </span>
              )}
            </div>
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
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
              {plans.map((plan) => {
                const isSelected = selectedTier === plan.tier;
                return (
                  <button
                    key={plan.tier}
                    type="button"
                    data-testid={`plan-card-${plan.tier}`}
                    onClick={() => setSelectedTier(plan.tier)}
                    className={`text-center p-2 sm:p-2.5 rounded-2xl border border-dashed transition cursor-pointer flex flex-col items-center justify-between gap-1.5 sm:gap-2 ${
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
                      <div
                        className="text-[13px] sm:text-base font-semibold leading-tight"
                        style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                      >
                        {planCompactNames[plan.tier]}
                      </div>
                      <div
                        className={`text-[9.5px] sm:text-[10px] leading-tight ${
                          isDarkMode ? 'text-[#C8B6AC]' : 'text-[#7D6B60]'
                        }`}
                      >
                        {planShortSubtitles[plan.tier]}
                      </div>
                    </div>

                    <div
                      className="text-base sm:text-xl font-semibold tracking-tight pt-0.5"
                      style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                    >
                      {plan.displayPrice}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Region-Matched Payment Method (Single Method for PH, Ko-fi for International) */}
            {region === 'PH' ? (
              <div
                data-testid="gateway-paymongo"
                onClick={() => setPaymentGateway('paymongo')}
                className={`py-2.5 px-3.5 rounded-xl border border-dashed flex items-center justify-between cursor-pointer ${
                  isDarkMode
                    ? 'border-[#E6B89C] bg-[#3B302C]'
                    : 'border-[#6E4434] bg-[#FAF3EB]'
                }`}
              >
                <div className="text-xs font-semibold">QR Ph · GCash · Maya</div>
                <div className="text-[10.5px] opacity-75">Instant Unlock</div>
              </div>
            ) : (
              <div
                data-testid="gateway-kofi"
                onClick={() => setPaymentGateway('kofi')}
                className={`py-2.5 px-3.5 rounded-xl border border-dashed flex items-center justify-between cursor-pointer ${
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
              disabled={isProcessing}
              onClick={handleStartCheckout}
              className={`w-full py-2.5 px-4 rounded-full text-xs sm:text-sm font-medium transition active:scale-99 cursor-pointer disabled:opacity-50 ${
                isDarkMode
                  ? 'bg-[#E6B89C] text-[#231C18] hover:bg-[#F0C8B0]'
                  : 'bg-[#6E4434] text-[#FFFDF9] hover:bg-[#5B3729]'
              }`}
            >
              {isProcessing
                ? 'Preparing...'
                : `Continue · ${currentPlan.displayPrice}`}
            </button>

            {/* Quiet Footer Note + Discreet Owner Asset Link */}
            <div className="flex items-center justify-between text-[10px] opacity-65 pt-0.5">
              <span>No account needed</span>
              <button
                type="button"
                data-testid="checkout-tab-asset-config"
                onClick={() => setActiveView('asset_config')}
                className="underline hover:opacity-100 cursor-pointer"
              >
                Customize items
              </button>
            </div>
          </div>
        )}

        {/* ===================================================================
            STEP 2: CLEAN KO-FI / QR CHECKOUT CONFIRMATION
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
                    {pendingCheckout.provider === 'paymongo'
                      ? 'QR Ph · GCash · Maya'
                      : 'Ko-fi Shop Order'}
                  </div>
                </div>
              </div>

              {pendingCheckout.provider === 'kofi' ? (
                <div className="space-y-3 text-left">
                  <div className="text-center">
                    <a
                      href={pendingCheckout.checkoutUrl || 'https://ko-fi.com/luxinnamon/shop'}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="open-kofi-shop-btn"
                      className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium border border-dashed transition ${
                        isDarkMode
                          ? 'border-[#E6B89C] text-[#F0C8B0] hover:bg-[#3B302C]'
                          : 'border-[#6E4434] text-[#6E4434] bg-[#FFFDF9] hover:bg-[#F3E9DF]'
                      }`}
                    >
                      <span>Open {pendingCheckout.plan.name} on Ko-fi Shop ↗</span>
                    </a>
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="kofi-buyer-email"
                      className="block text-[10.5px] font-medium opacity-80 text-center"
                    >
                      Email typed on Ko-fi checkout (not your name)
                    </label>
                    <input
                      id="kofi-buyer-email"
                      type="email"
                      data-testid="kofi-buyer-email-input"
                      value={buyerEmail}
                      onChange={(e) => setBuyerEmail(e.target.value)}
                      placeholder="you@example.com"
                      className={`w-full px-3.5 py-2 rounded-xl border border-dashed text-xs text-center focus:outline-none focus:border-[#B4846C] ${
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

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCheckoutStep('select')}
                className={`py-2.5 px-4 rounded-full border border-dashed text-xs font-medium transition cursor-pointer ${
                  isDarkMode
                    ? 'border-[#5C4B47] text-[#D8C7BE] hover:bg-[#463A36]'
                    : 'border-[#DECBB9] text-[#5C4438] hover:bg-[#F3E9DF]'
                }`}
              >
                Back
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
                  : pendingCheckout.provider === 'kofi'
                  ? "I've Paid · Verify Order"
                  : 'Complete & Unlock'}
              </button>
            </div>
          </div>
        )}

        {/* ===================================================================
            VIEW 2: REDEEM PASS KEY
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
                placeholder="BLOOM-XXXX-XXXX"
                maxLength={18}
                className={`w-full px-3.5 py-2 rounded-xl border border-dashed font-mono text-sm tracking-wider uppercase text-center focus:outline-none focus:border-[#B4846C] ${
                  isDarkMode
                    ? 'bg-[#352C29] border-[#66554F] text-[#FBF6F1]'
                    : 'bg-[#FFFDF9] border-[#D8C4B4] text-[#231C18]'
                }`}
              />
              <p className="text-[11px] opacity-65 text-center">
                Locked to your device · 1 active session
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
                      {activePass.tier === 'pass_30d'
                        ? '30-Day Eternal Pass'
                        : activePass.tier === 'pass_7d'
                        ? '7-Day Pass'
                        : 'Single Bouquet Pass'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full border border-dashed border-[#B4846C]/60 text-[10.5px] text-[#B4846C] font-medium shrink-0">
                      {formatPassRemainingTime(activePass.expiresAt)}
                    </span>
                  </div>
                  <p className="text-[11px] opacity-75 mt-0.5">
                    {activePass.isEternalKeepsake
                      ? 'All Couture flowers, wraps, ribbons & eternal gift links unlocked'
                      : `All Couture pieces & ${activePass.retentionDays}-day extended gift links unlocked`}
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

              {/* Sweet Botanical Thank-You Message */}
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
                  “Thank you from the bottom of our hearts for supporting Send A Bouquet. Every bloom and keepsake you craft helps keep this quiet floral studio alive.”
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

            <div className="flex items-center justify-between text-[10px] opacity-65 pt-0.5">
              <span>Bound to this device · 1 active session</span>
              <button
                type="button"
                data-testid="checkout-tab-asset-config"
                onClick={() => setActiveView('asset_config')}
                className="underline hover:opacity-100 cursor-pointer"
              >
                Customize items
              </button>
            </div>
          </div>
        )}

        {/* ===================================================================
            VIEW 4: OWNER COUTURE ASSET & KO-FI SHOP CONFIGURATOR
            =================================================================== */}
        {activeView === 'asset_config' && (
          <div className="mt-3.5 space-y-3 animate-in fade-in duration-150">
            <div
              className={`p-3.5 rounded-2xl border border-dashed space-y-3 max-h-[54vh] overflow-y-auto ${
                isDarkMode
                  ? 'bg-[#2B2321]/80 border-[#544540]'
                  : 'bg-[#FAF4EE]/80 border-[#DECBB9]'
              }`}
            >
              {/* Owner Ko-fi Shop Direct Link Codes */}
              <div className="space-y-2 pb-2.5 border-b border-dashed border-[#DECBB9]/60 dark:border-[#544540]">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">Ko-fi Shop Item Links / Codes</span>
                  <button
                    type="button"
                    data-testid="save-kofi-shop-codes-btn"
                    onClick={handleSaveShopConfig}
                    className="text-[11px] font-semibold text-[#B4846C] underline cursor-pointer"
                  >
                    Save Codes
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-1.5 text-[11px]">
                  <input
                    type="text"
                    value={shopConfig.single}
                    onChange={(e) =>
                      setShopConfig((prev) => ({ ...prev, single: e.target.value }))
                    }
                    placeholder="Single Bouquet URL or direct_link_code (e.g. ko-fi.com/s/xxxx)"
                    className={`w-full px-2.5 py-1.5 rounded-lg border border-dashed font-mono text-[11px] focus:outline-none ${
                      isDarkMode
                        ? 'bg-[#352C29] border-[#66554F] text-[#FBF6F1]'
                        : 'bg-[#FFFDF9] border-[#D8C4B4] text-[#231C18]'
                    }`}
                  />
                  <input
                    type="text"
                    value={shopConfig.pass_7d}
                    onChange={(e) =>
                      setShopConfig((prev) => ({ ...prev, pass_7d: e.target.value }))
                    }
                    placeholder="7-Day Pass URL or direct_link_code (e.g. ko-fi.com/s/yyyy)"
                    className={`w-full px-2.5 py-1.5 rounded-lg border border-dashed font-mono text-[11px] focus:outline-none ${
                      isDarkMode
                        ? 'bg-[#352C29] border-[#66554F] text-[#FBF6F1]'
                        : 'bg-[#FFFDF9] border-[#D8C4B4] text-[#231C18]'
                    }`}
                  />
                  <input
                    type="text"
                    value={shopConfig.pass_30d}
                    onChange={(e) =>
                      setShopConfig((prev) => ({ ...prev, pass_30d: e.target.value }))
                    }
                    placeholder="30-Day Eternal URL or direct_link_code (e.g. ko-fi.com/s/zzzz)"
                    className={`w-full px-2.5 py-1.5 rounded-lg border border-dashed font-mono text-[11px] focus:outline-none ${
                      isDarkMode
                        ? 'bg-[#352C29] border-[#66554F] text-[#FBF6F1]'
                        : 'bg-[#FFFDF9] border-[#D8C4B4] text-[#231C18]'
                    }`}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="opacity-75">Tap to toggle Couture vs. Free</span>
                <button
                  type="button"
                  onClick={handleResetDefaultAssetConfig}
                  className="text-[11px] text-[#B4846C] underline cursor-pointer"
                >
                  Reset
                </button>
              </div>

              <div>
                <div className="text-[10px] tracking-wider opacity-65 mb-1.5">
                  Flowers ({customConfig.flowers.length})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {FLOWER_CATALOG.map((f) => {
                    const isPrem = customConfig.flowers.includes(f.type);
                    return (
                      <button
                        key={f.type}
                        type="button"
                        onClick={() => handleToggleAssetInConfig('flowers', f.type)}
                        className={`px-2.5 py-1 rounded-full text-[11px] border border-dashed flex items-center gap-1 transition cursor-pointer ${
                          isPrem
                            ? isDarkMode
                              ? 'bg-[#E6B89C] text-[#231C18] border-[#E6B89C] font-medium'
                              : 'bg-[#6E4434] text-[#FFFDF9] border-[#6E4434] font-medium'
                            : isDarkMode
                            ? 'bg-[#352C29] text-[#C8B6AC] border-[#544540]'
                            : 'bg-[#FFFDF9] text-[#6E5D54] border-[#DECBB9]'
                        }`}
                      >
                        <span>{f.shortName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="text-[10px] tracking-wider opacity-65 mb-1.5">
                  Wraps ({customConfig.wraps.length})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {WRAPPER_CATALOG.map((w) => {
                    const isPrem = customConfig.wraps.includes(w.id);
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => handleToggleAssetInConfig('wraps', w.id)}
                        className={`px-2.5 py-1 rounded-full text-[11px] border border-dashed transition cursor-pointer ${
                          isPrem
                            ? isDarkMode
                              ? 'bg-[#E6B89C] text-[#231C18] border-[#E6B89C] font-medium'
                              : 'bg-[#6E4434] text-[#FFFDF9] border-[#6E4434] font-medium'
                            : isDarkMode
                            ? 'bg-[#352C29] text-[#C8B6AC] border-[#544540]'
                            : 'bg-[#FFFDF9] text-[#6E5D54] border-[#DECBB9]'
                        }`}
                      >
                        {w.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="text-[10px] tracking-wider opacity-65 mb-1.5">
                  Ribbons ({customConfig.ribbons.length})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {RIBBON_STYLE_CATALOG.map((r) => {
                    const isPrem = customConfig.ribbons.includes(r.id);
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleToggleAssetInConfig('ribbons', r.id)}
                        className={`px-2.5 py-1 rounded-full text-[11px] border border-dashed transition cursor-pointer ${
                          isPrem
                            ? isDarkMode
                              ? 'bg-[#E6B89C] text-[#231C18] border-[#E6B89C] font-medium'
                              : 'bg-[#6E4434] text-[#FFFDF9] border-[#6E4434] font-medium'
                            : isDarkMode
                            ? 'bg-[#352C29] text-[#C8B6AC] border-[#544540]'
                            : 'bg-[#FFFDF9] text-[#6E5D54] border-[#DECBB9]'
                        }`}
                      >
                        {r.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveView(activePass ? 'pass_card' : 'plans')}
              className={`w-full py-2 px-4 rounded-full border border-dashed text-xs font-medium transition cursor-pointer ${
                isDarkMode
                  ? 'border-[#5C4B47] text-[#D8C7BE] hover:bg-[#463A36]'
                  : 'border-[#DECBB9] text-[#5C4438] hover:bg-[#F3E9DF]'
              }`}
            >
              {activePass ? 'Back to My Pass' : 'Back to Passes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
