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
    if (activePass && triggerAction === 'pass_menu') {
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

  const planCoverImages: Record<StudioPassTier, string> = {
    single: '/assets/kofi-shop/single-bouquet-lineart.jpg',
    pass_7d: '/assets/kofi-shop/7-day-pass-lineart.jpg',
    pass_30d: '/assets/kofi-shop/30-day-eternal-lineart.jpg',
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

        {/* Eyebrow */}
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] font-medium text-[#B4846C]">
          <CoutureBloomSeal className="w-3.5 h-3.5" />
          <span>
            {activeView === 'pass_card'
              ? 'Active Pass'
              : activeView === 'redeem'
              ? 'Pass Key'
              : activeView === 'asset_config'
              ? 'Studio Config'
              : 'Premium'}
          </span>
        </div>

        {/* Editorial Title */}
        <h3
          className="text-2xl sm:text-[27px] font-medium tracking-tight leading-tight mt-0.5"
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

        {/* Clean Top Switcher + Currency Pill */}
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
            {activePass && activePass.tier !== 'single' && (
              <button
                type="button"
                data-testid="checkout-tab-active-pass"
                onClick={() => {
                  setActiveView('pass_card');
                  setErrorMessage(null);
                }}
                className={`px-3 py-1 rounded-full transition cursor-pointer ${
                  activeView === 'pass_card'
                    ? isDarkMode
                      ? 'bg-[#E6B89C] text-[#231C18]'
                      : 'bg-[#6E4434] text-[#FFFDF9]'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                My Key
              </button>
            )}
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
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
              {plans.map((plan) => {
                const isSelected = selectedTier === plan.tier;
                return (
                  <button
                    key={plan.tier}
                    type="button"
                    data-testid={`plan-card-${plan.tier}`}
                    onClick={() => setSelectedTier(plan.tier)}
                    className={`text-center p-2 sm:p-2.5 rounded-2xl border border-dashed transition cursor-pointer flex flex-col items-center justify-between gap-2 ${
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
                      <img
                        src={planCoverImages[plan.tier]}
                        alt={plan.name}
                        className={`w-full aspect-square rounded-xl object-cover border border-dashed ${
                          isDarkMode ? 'border-[#5E4E49]' : 'border-[#DECBB9]'
                        }`}
                      />
                      <div
                        className="text-sm sm:text-base font-semibold leading-tight"
                        style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                      >
                        {planCompactNames[plan.tier]}
                      </div>
                      <div
                        className={`text-[10px] leading-tight ${
                          isDarkMode ? 'text-[#C8B6AC]' : 'text-[#7D6B60]'
                        }`}
                      >
                        {planShortSubtitles[plan.tier]}
                      </div>
                    </div>

                    <div
                      className="text-lg sm:text-xl font-semibold tracking-tight pt-0.5"
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
                <img
                  src={planCoverImages[pendingCheckout.plan.tier]}
                  alt={pendingCheckout.plan.name}
                  className={`w-12 h-12 rounded-xl object-cover border border-dashed shrink-0 ${
                    isDarkMode ? 'border-[#5E4E49]' : 'border-[#DECBB9]'
                  }`}
                />
                <div className="text-left">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-[#B4846C] font-semibold">
                    {pendingCheckout.provider === 'paymongo'
                      ? 'QR Ph · GCash · Maya'
                      : 'Ko-fi Shop Order'}
                  </div>
                  <div
                    className="text-xl font-medium"
                    style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                  >
                    {pendingCheckout.plan.name} · {pendingCheckout.plan.displayPrice}
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
            VIEW 3: ACTIVE PASS KEEPSAKE TICKET
            =================================================================== */}
        {activeView === 'pass_card' && activePass && (
          <div className="mt-4 space-y-3 animate-in fade-in duration-150">
            <div
              data-testid="active-pass-keepsake-card"
              className={`p-4 rounded-2xl border border-dashed space-y-3 ${
                isDarkMode
                  ? 'bg-[#2B2321] border-[#E6B89C]/50'
                  : 'bg-[#FAF4EE] border-[#DECBB9]'
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-medium">
                  {activePass.tier === 'pass_30d'
                    ? '30-Day Eternal Pass'
                    : activePass.tier === 'pass_7d'
                    ? '7-Day Pass'
                    : 'Single Bouquet Pass'}
                </span>
                <span className="text-[11px] text-[#B4846C] font-medium">
                  {formatPassRemainingTime(activePass.expiresAt)}
                </span>
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

              <div className="flex items-center justify-between text-[11px] opacity-70">
                <span>
                  {activePass.isEternalKeepsake
                    ? 'Links never expire'
                    : `${activePass.retentionDays}-day extended links`}
                </span>
                <span>1 active session</span>
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
                <div className="text-[10px] uppercase tracking-wider opacity-65 mb-1.5">
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
                <div className="text-[10px] uppercase tracking-wider opacity-65 mb-1.5">
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
                <div className="text-[10px] uppercase tracking-wider opacity-65 mb-1.5">
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
              onClick={() => setActiveView('plans')}
              className={`w-full py-2 px-4 rounded-full border border-dashed text-xs font-medium transition cursor-pointer ${
                isDarkMode
                  ? 'border-[#5C4B47] text-[#D8C7BE] hover:bg-[#463A36]'
                  : 'border-[#DECBB9] text-[#5C4438] hover:bg-[#F3E9DF]'
              }`}
            >
              Back to Passes
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
