import React, { useEffect, useMemo, useState } from 'react';
import { Check, RotateCcw, ShieldCheck, Tag } from 'lucide-react';
import {
  DEFAULT_PLAN_PRICING_CONFIG,
  PlanPricingConfig,
  PlanTierPricingOverride,
  PricingRegion,
  StudioPassTier,
  formatCurrencyMinor,
  resolveEffectivePricingPlan,
  sanitizePlanPricingConfig,
} from '../lib/monetization';

interface OwnerPlanPricingSectionProps {
  adminSessionToken: string;
  deviceTokenHash: string;
  isDarkMode: boolean;
  planPricingConfig: PlanPricingConfig;
  onPlanPricingUpdated: (nextConfig: PlanPricingConfig, nextAnalytics?: unknown) => void;
  onToast: (msg: string) => void;
}

const TIER_META: Array<{
  tier: StudioPassTier;
  title: string;
  subtitle: string;
}> = [
  {
    tier: 'single',
    title: 'Single Bouquet',
    subtitle: '1 couture unlock · 90-day gallery',
  },
  {
    tier: 'pass_7d',
    title: '7-Day Pass',
    subtitle: 'Unlimited bouquets for 7 days · 90-day gallery',
  },
  {
    tier: 'pass_30d',
    title: '30-Day Eternal',
    subtitle: 'Unlimited bouquets for 30 days · Eternal showcase',
  },
];

interface DraftTierInputs {
  originalMajor: string;
  discountedMajor: string;
  discountEnabled: boolean;
  promoLabel: string;
  discountKofiCode: string;
}

type RegionDraftMap = Record<PricingRegion, Record<StudioPassTier, DraftTierInputs>>;

function minorToMajorInput(amountMinor: number, region: PricingRegion): string {
  const major = amountMinor / 100;
  if (region === 'PH') {
    return Number.isInteger(major) ? String(major) : major.toFixed(2);
  }
  return major.toFixed(2);
}

function majorInputToMinor(raw: string): number | null {
  const trimmed = raw.trim().replace(/[,₱$\s]/g, '');
  if (!trimmed) return null;
  const num = Number(trimmed);
  if (!Number.isFinite(num) || num <= 0) return null;
  return Math.round(num * 100);
}

function configToDraft(config: PlanPricingConfig): RegionDraftMap {
  const clean = sanitizePlanPricingConfig(config);
  const buildRegion = (region: PricingRegion): Record<StudioPassTier, DraftTierInputs> => {
    const out = {} as Record<StudioPassTier, DraftTierInputs>;
    for (const { tier } of TIER_META) {
      const item = clean[region][tier];
      out[tier] = {
        originalMajor: minorToMajorInput(item.originalAmountMinor, region),
        discountedMajor: minorToMajorInput(item.discountedAmountMinor, region),
        discountEnabled: Boolean(item.discountEnabled),
        promoLabel: item.promoBadge || '',
        discountKofiCode: item.discountKofiCode || '',
      };
    }
    return out;
  };
  return {
    PH: buildRegion('PH'),
    INTL: buildRegion('INTL'),
  };
}

function draftToConfig(draft: RegionDraftMap): {
  config: PlanPricingConfig;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};
  const regions: PricingRegion[] = ['PH', 'INTL'];
  const result = {} as Record<PricingRegion, Record<StudioPassTier, PlanTierPricingOverride>>;

  for (const region of regions) {
    const minMinor = region === 'PH' ? 100 : 50;
    const maxMinor = region === 'PH' ? 5000000 : 100000;
    const currencySym = region === 'PH' ? '₱' : '$';
    result[region] = {} as Record<StudioPassTier, PlanTierPricingOverride>;

    for (const { tier } of TIER_META) {
      const entry = draft[region][tier];
      const origMinor = majorInputToMinor(entry.originalMajor);
      const discMinor = majorInputToMinor(entry.discountedMajor);
      const fallback = DEFAULT_PLAN_PRICING_CONFIG[region][tier];

      if (origMinor === null || origMinor < minMinor || origMinor > maxMinor) {
        errors[`${region}.${tier}.original`] = `Enter a valid price (${currencySym}${(
          minMinor / 100
        ).toFixed(region === 'PH' ? 0 : 2)}+).`;
      }

      if (entry.discountEnabled) {
        if (discMinor === null || discMinor < minMinor || discMinor > maxMinor) {
          errors[`${region}.${tier}.discounted`] = 'Enter a valid sale price.';
        } else if (origMinor !== null && discMinor >= origMinor) {
          errors[`${region}.${tier}.discounted`] = 'Sale price must be lower than original price.';
        }
      }

      const safeOrig =
        origMinor !== null && origMinor >= minMinor && origMinor <= maxMinor
          ? origMinor
          : fallback.originalAmountMinor;
      const safeDisc =
        discMinor !== null && discMinor >= minMinor && discMinor < safeOrig
          ? discMinor
          : Math.max(minMinor, Math.min(safeOrig - 1, fallback.discountedAmountMinor));

      result[region][tier] = {
        originalAmountMinor: safeOrig,
        discountEnabled: Boolean(entry.discountEnabled && safeDisc < safeOrig),
        discountedAmountMinor: safeDisc,
        promoBadge: entry.promoLabel.trim().slice(0, 24),
        discountKofiCode:
          region === 'INTL' ? entry.discountKofiCode.trim().slice(0, 80) : '',
      };
    }
  }

  return {
    config: sanitizePlanPricingConfig({
      PH: result.PH,
      INTL: result.INTL,
    }),
    errors,
  };
}

export const OwnerPlanPricingSection: React.FC<OwnerPlanPricingSectionProps> = ({
  adminSessionToken,
  deviceTokenHash,
  isDarkMode,
  planPricingConfig,
  onPlanPricingUpdated,
  onToast,
}) => {
  const [activeRegion, setActiveRegion] = useState<PricingRegion>('PH');
  const [draft, setDraft] = useState<RegionDraftMap>(() => configToDraft(planPricingConfig));
  const [isSaving, setIsSaving] = useState(false);

  const normalizedIncoming = useMemo(
    () => sanitizePlanPricingConfig(planPricingConfig),
    [planPricingConfig]
  );

  useEffect(() => {
    setDraft(configToDraft(normalizedIncoming));
  }, [normalizedIncoming]);

  const { config: candidateConfig, errors: validationErrors } = useMemo(
    () => draftToConfig(draft),
    [draft]
  );
  const hasValidationErrors = Object.keys(validationErrors).length > 0;

  const hasUnsavedChanges = useMemo(() => {
    const normalizeComparable = (cfg: PlanPricingConfig) => ({
      PH: cfg.PH,
      INTL: cfg.INTL,
    });
    return (
      JSON.stringify(normalizeComparable(candidateConfig)) !==
      JSON.stringify(normalizeComparable(normalizedIncoming))
    );
  }, [candidateConfig, normalizedIncoming]);

  const phActiveDiscounts = TIER_META.filter(
    ({ tier }) => candidateConfig.PH[tier].discountEnabled
  ).length;
  const intlActiveDiscounts = TIER_META.filter(
    ({ tier }) => candidateConfig.INTL[tier].discountEnabled
  ).length;

  const panelClass = isDarkMode
    ? 'bg-[#352C29] border-[#5E4E49]/80'
    : 'bg-[#FFFDF9] border-[#DECBB9]';
  const hairlineBorder = isDarkMode ? 'border-[#5E4E49]/70' : 'border-[#DECBB9]/85';
  const hairlineDivide = isDarkMode ? 'divide-[#5E4E49]/70' : 'divide-[#DECBB9]/85';
  const inputClass = isDarkMode
    ? 'bg-[#2B2321] border-[#5E4E49] text-[#F5EBE6] placeholder:text-[#9A877B] focus:border-[#E6B89C]'
    : 'bg-[#FAF4EE] border-[#DECBB9] text-[#2C2523] placeholder:text-[#9A877B] focus:border-[#6E4434]';
  const primaryBtnClass = isDarkMode
    ? 'bg-[#E6B89C] text-[#231C18] hover:bg-[#F0C8AE]'
    : 'bg-[#6E4434] text-[#FFFDF9] hover:bg-[#593527]';
  const mutedText = isDarkMode ? 'text-[#C8B6AC]' : 'text-[#736258]';

  const updateTierField = <K extends keyof DraftTierInputs>(
    region: PricingRegion,
    tier: StudioPassTier,
    field: K,
    value: DraftTierInputs[K]
  ) => {
    setDraft((prev) => ({
      ...prev,
      [region]: {
        ...prev[region],
        [tier]: {
          ...prev[region][tier],
          [field]: value,
        },
      },
    }));
  };

  const handleToggleDiscount = (region: PricingRegion, tier: StudioPassTier) => {
    setDraft((prev) => {
      const current = prev[region][tier];
      const nextEnabled = !current.discountEnabled;
      let nextDiscountedMajor = current.discountedMajor;
      if (nextEnabled) {
        const origMinor = majorInputToMinor(current.originalMajor);
        const discMinor = majorInputToMinor(current.discountedMajor);
        if (origMinor !== null && (discMinor === null || discMinor >= origMinor)) {
          // Auto-suggest a sensible ~20% off sale price when enabling discount
          const suggested = Math.max(
            region === 'PH' ? 100 : 50,
            region === 'PH'
              ? Math.floor((origMinor * 0.8) / 100) * 100
              : Math.round(origMinor * 0.8)
          );
          nextDiscountedMajor = minorToMajorInput(
            suggested < origMinor ? suggested : origMinor - (region === 'PH' ? 100 : 50),
            region
          );
        }
      }
      return {
        ...prev,
        [region]: {
          ...prev[region],
          [tier]: {
            ...current,
            discountEnabled: nextEnabled,
            discountedMajor: nextDiscountedMajor,
          },
        },
      };
    });
  };

  const handleResetDefaults = () => {
    setDraft(configToDraft(DEFAULT_PLAN_PRICING_CONFIG));
  };

  const handleSave = async () => {
    if (!adminSessionToken || hasValidationErrors || isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/payments/verify-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_plan_pricing_config',
          adminSessionToken,
          deviceTokenHash,
          planPricingConfig: candidateConfig,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok && data?.planPricingConfig) {
        const saved = sanitizePlanPricingConfig(data.planPricingConfig);
        setDraft(configToDraft(saved));
        onPlanPricingUpdated(saved, data.analytics);
        onToast('Plan pricing & discounts saved.');
      } else {
        onToast(data?.message || 'Could not save plan pricing.');
      }
    } catch {
      onToast('Network error saving plan pricing.');
    } finally {
      setIsSaving(false);
    }
  };

  const currencySymbol = activeRegion === 'PH' ? '₱' : '$';

  return (
    <div data-testid="owner-plan-pricing-section" className="space-y-4">
      {/* Currency Switcher + Zero-Conflict Summary */}
      <div className={`rounded-xl border p-4 sm:p-5 space-y-4 ${panelClass}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
              className="text-xl sm:text-2xl font-medium leading-tight"
            >
              Plan Pricing &amp; Discounts
            </h2>
            <p className={`text-xs mt-0.5 ${mutedText}`}>
              Set regular or discounted prices independently for PHP and USD. Toggle off anytime to
              revert to original price.
            </p>
          </div>

          <div
            className={`w-full sm:w-auto grid grid-cols-2 sm:inline-flex rounded-lg border p-0.5 text-xs shrink-0 ${hairlineBorder}`}
            role="tablist"
            aria-label="Currency pricing region"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeRegion === 'PH'}
              data-testid="pricing-region-tab-PH"
              onClick={() => setActiveRegion('PH')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer tabular-nums ${
                activeRegion === 'PH'
                  ? `${primaryBtnClass} font-medium`
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              PHP (₱){phActiveDiscounts > 0 ? ` · ${phActiveDiscounts} on sale` : ''}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeRegion === 'INTL'}
              data-testid="pricing-region-tab-INTL"
              onClick={() => setActiveRegion('INTL')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer tabular-nums ${
                activeRegion === 'INTL'
                  ? `${primaryBtnClass} font-medium`
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              USD ($){intlActiveDiscounts > 0 ? ` · ${intlActiveDiscounts} on sale` : ''}
            </button>
          </div>
        </div>

        {/* Zero-Conflict Checkout Safeguard Banner */}
        <div
          className={`rounded-lg border border-dashed px-3.5 py-2.5 flex items-start gap-2.5 text-xs leading-relaxed ${
            isDarkMode
              ? 'bg-[#2B2321]/70 border-[#5E4E49] text-[#D8C7BE]'
              : 'bg-[#FAF4EE]/85 border-[#DECBB9] text-[#5B483F]'
          }`}
        >
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-[#5A7F64] dark:text-[#8AB89A]" />
          <div className="space-y-1 min-w-0">
            {activeRegion === 'PH' ? (
              <p>
                <span className="font-medium">Exact-amount PH checkout lock:</span> Every new
                SikatPay, BayadGate, or PayMongo checkout automatically charges the exact active
                price below and locks it for that order. Toggling a discount on or off never breaks
                buyers who are already paying.
              </p>
            ) : (
              <p>
                <span className="font-medium">USD Ko-fi sync:</span> Checkout cards immediately
                reflect your USD sale price. To charge a different USD sale amount on Ko-fi without
                changing your regular item, paste your discounted Ko-fi shop item code below
                (optional — webhooks accept both your regular and sale codes seamlessly).
              </p>
            )}
          </div>
        </div>

        {/* 3 Plan Rows */}
        <div className={`divide-y ${hairlineDivide} border ${hairlineBorder} rounded-xl overflow-hidden`}>
          {TIER_META.map(({ tier, title, subtitle }) => {
            const entry = draft[activeRegion][tier];
            const previewPlan = resolveEffectivePricingPlan(activeRegion, tier, candidateConfig);
            const origErr = validationErrors[`${activeRegion}.${tier}.original`];
            const discErr = validationErrors[`${activeRegion}.${tier}.discounted`];
            const savingsMinor = Math.max(
              0,
              (previewPlan.originalAmountMinor ?? previewPlan.amountMinor) -
                previewPlan.amountMinor
            );

            return (
              <div
                key={`${activeRegion}-${tier}`}
                data-testid={`pricing-tier-row-${activeRegion}-${tier}`}
                className="p-4 space-y-3.5"
              >
                {/* Row Header + Live Buyer Preview + Discount Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <h3
                        style={{ fontFamily: "'Cormorant Garamond', serif" }}
                        className="text-lg sm:text-xl font-medium leading-tight"
                      >
                        {title}
                      </h3>
                      <span
                        data-testid={`pricing-live-preview-${activeRegion}-${tier}`}
                        className="inline-flex items-baseline gap-1.5 text-xs font-mono tabular-nums"
                      >
                        {previewPlan.isDiscounted ? (
                          <>
                            <span className="line-through opacity-50">
                              {previewPlan.originalDisplayPrice}
                            </span>
                            <span className="font-semibold text-[#6E4434] dark:text-[#E6B89C]">
                              {previewPlan.displayPrice}
                            </span>
                            <span className="text-[11px] font-sans font-medium text-[#5A7F64] dark:text-[#8AB89A]">
                              · {previewPlan.promoBadge || `${previewPlan.discountPercent}% OFF`}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="font-semibold">{previewPlan.displayPrice}</span>
                            <span className="text-[11px] font-sans opacity-60">· Regular</span>
                          </>
                        )}
                      </span>
                    </div>
                    <p className={`text-[11px] mt-0.5 ${mutedText}`}>{subtitle}</p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={entry.discountEnabled}
                    data-testid={`pricing-discount-toggle-${activeRegion}-${tier}`}
                    onClick={() => handleToggleDiscount(activeRegion, tier)}
                    className={`self-start sm:self-center px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5 shrink-0 ${
                      entry.discountEnabled
                        ? `${primaryBtnClass} border-transparent`
                        : `${hairlineBorder} opacity-80 hover:opacity-100 hover:bg-current/5`
                    }`}
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span>{entry.discountEnabled ? 'Discount Active' : 'Apply Discount'}</span>
                  </button>
                </div>

                {/* Price & Promo Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="block space-y-1 min-w-0">
                    <span className="block text-[11px] opacity-75">
                      Original Price ({currencySymbol})
                    </span>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs opacity-55 pointer-events-none">
                        {currencySymbol}
                      </span>
                      <input
                        data-testid={`pricing-original-input-${activeRegion}-${tier}`}
                        type="number"
                        inputMode="decimal"
                        step={activeRegion === 'PH' ? '1' : '0.01'}
                        min={activeRegion === 'PH' ? '1' : '0.5'}
                        value={entry.originalMajor}
                        onChange={(e) =>
                          updateTierField(activeRegion, tier, 'originalMajor', e.target.value)
                        }
                        className={`w-full pl-7 pr-3 py-2 rounded-lg border text-xs font-mono tabular-nums focus:outline-none ${inputClass}`}
                      />
                    </div>
                    {origErr && (
                      <span className="block text-[11px] text-rose-600 dark:text-rose-400">
                        {origErr}
                      </span>
                    )}
                  </label>

                  <label className="block space-y-1 min-w-0">
                    <span className="flex items-center justify-between text-[11px] opacity-75">
                      <span>Discounted Price ({currencySymbol})</span>
                      {entry.discountEnabled && savingsMinor > 0 && !discErr && (
                        <span className="text-[#5A7F64] dark:text-[#8AB89A] font-medium tabular-nums">
                          Save {formatCurrencyMinor(savingsMinor, previewPlan.currency)}
                        </span>
                      )}
                    </span>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs opacity-55 pointer-events-none">
                        {currencySymbol}
                      </span>
                      <input
                        data-testid={`pricing-discounted-input-${activeRegion}-${tier}`}
                        type="number"
                        inputMode="decimal"
                        step={activeRegion === 'PH' ? '1' : '0.01'}
                        min={activeRegion === 'PH' ? '1' : '0.5'}
                        disabled={!entry.discountEnabled}
                        value={entry.discountedMajor}
                        onChange={(e) =>
                          updateTierField(activeRegion, tier, 'discountedMajor', e.target.value)
                        }
                        className={`w-full pl-7 pr-3 py-2 rounded-lg border text-xs font-mono tabular-nums focus:outline-none disabled:opacity-45 ${inputClass}`}
                      />
                    </div>
                    {discErr && (
                      <span className="block text-[11px] text-rose-600 dark:text-rose-400">
                        {discErr}
                      </span>
                    )}
                  </label>

                  <label className="block space-y-1 min-w-0">
                    <span className="block text-[11px] opacity-75">Promo Badge (optional)</span>
                    <input
                      data-testid={`pricing-badge-input-${activeRegion}-${tier}`}
                      type="text"
                      maxLength={24}
                      disabled={!entry.discountEnabled}
                      value={entry.promoLabel}
                      onChange={(e) =>
                        updateTierField(activeRegion, tier, 'promoLabel', e.target.value)
                      }
                      placeholder={
                        (previewPlan.discountPercent ?? 0) > 0
                          ? `Auto (${previewPlan.discountPercent}% OFF)`
                          : 'e.g. Limited Offer'
                      }
                      className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none disabled:opacity-45 ${inputClass}`}
                    />
                  </label>
                </div>

                {/* Optional Ko-fi Sale Item Code for INTL */}
                {activeRegion === 'INTL' && (
                  <div className="pt-0.5">
                    <label className="block space-y-1 max-w-sm">
                      <span className="block text-[11px] opacity-75">
                        Sale Ko-fi Item Code (optional — routes discounted USD checkout)
                      </span>
                      <input
                        data-testid={`pricing-kofi-code-input-${tier}`}
                        type="text"
                        maxLength={80}
                        value={entry.discountKofiCode}
                        onChange={(e) =>
                          updateTierField('INTL', tier, 'discountKofiCode', e.target.value)
                        }
                        placeholder="e.g. abc123def0 or https://ko-fi.com/s/..."
                        className={`w-full px-3 py-1.5 rounded-lg border text-xs font-mono focus:outline-none ${inputClass}`}
                      />
                    </label>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
          <button
            type="button"
            data-testid="owner-pricing-reset-btn"
            onClick={handleResetDefaults}
            disabled={isSaving}
            className={`px-3 py-2 rounded-lg border text-xs font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-45 ${hairlineBorder} hover:bg-current/5`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-2.5">
            {hasUnsavedChanges && (
              <span className="text-[11px] opacity-70">Unsaved changes</span>
            )}
            <button
              type="button"
              data-testid="owner-pricing-save-btn"
              onClick={handleSave}
              disabled={isSaving || hasValidationErrors || !hasUnsavedChanges}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-45 ${primaryBtnClass}`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Pricing & Discounts'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
