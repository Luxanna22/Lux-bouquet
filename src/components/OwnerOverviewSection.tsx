import React, { useEffect, useMemo, useState } from 'react';
import { Globe, Pause, Play, RotateCcw } from 'lucide-react';
import {
  OwnerAnalyticsSummary,
  PaidPassLedgerItem,
  computeFinancialMetrics,
  computeRevenueProjection,
} from '../lib/ownerAnalytics';
import {
  DonutBreakdownChart,
  FunnelBarChart,
  MiniSparkline,
  TrajectoryAreaChart,
} from './OwnerAdminCharts';

interface OwnerOverviewSectionProps {
  analytics: OwnerAnalyticsSummary;
  paidPasses: PaidPassLedgerItem[];
  testerCount: number;
  isDarkMode: boolean;
  formatLabel: (raw: string) => string;
  isTogglingIncomePause?: boolean;
  isTogglingPhDisabled?: boolean;
  isResettingIncome?: boolean;
  isUpdatingLaunchPromo?: boolean;
  onToggleIncomePause?: (nextPaused: boolean) => void;
  onTogglePhDisabled?: (nextDisabled: boolean) => void;
  onResetIncome?: (purgeTestAndRevoked: boolean) => void;
  onUpdateLaunchPromoConfig?: (patch: {
    kofiLaunchEnabled?: boolean;
    kofiLaunchMaxLimit?: number;
    resetKofiLaunchClaims?: boolean;
    recipientGiftEnabled?: boolean;
    recipientGiftMaxLimit?: number;
    resetRecipientGiftClaims?: boolean;
  }) => void;
}

type ChartSeriesMode = 'traffic' | 'revenue';

const CHANNEL_NAMES: Record<string, string> = {
  manual_gcash: 'GCash Manual',
  manual_maya: 'Maya Manual',
  manual_bank: 'Bank Transfer',
  sikatpay: 'SikatPay (QR Ph / GCash / Maya)',
  bayadgate: 'BayadGate',
  paymongo: 'PayMongo',
  kofi: 'Ko-fi Shop',
  other: 'Direct Other',
};

export const OwnerOverviewSection: React.FC<OwnerOverviewSectionProps> = ({
  analytics,
  paidPasses,
  testerCount,
  isDarkMode,
  formatLabel,
  isTogglingIncomePause = false,
  isTogglingPhDisabled = false,
  isResettingIncome = false,
  isUpdatingLaunchPromo = false,
  onToggleIncomePause,
  onTogglePhDisabled,
  onResetIncome,
  onUpdateLaunchPromoConfig,
}) => {
  const [chartMode, setChartMode] = useState<ChartSeriesMode>('traffic');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [kofiLimitInput, setKofiLimitInput] = useState<string>(() =>
    String(analytics.kofiLaunchMaxLimit ?? 30)
  );
  const [recipientLimitInput, setRecipientLimitInput] = useState<string>(() =>
    String(analytics.recipientGiftMaxLimit ?? 150)
  );

  useEffect(() => {
    setKofiLimitInput(String(analytics.kofiLaunchMaxLimit ?? 30));
  }, [analytics.kofiLaunchMaxLimit]);

  useEffect(() => {
    setRecipientLimitInput(String(analytics.recipientGiftMaxLimit ?? 150));
  }, [analytics.recipientGiftMaxLimit]);

  // Interactive Growth / Buyer Scale Simulator (Projection Sandbox — separate from recorded actuals)
  const [simDailyVisitors, setSimDailyVisitors] = useState<number>(500);
  const [simStudioPct, setSimStudioPct] = useState<number>(55);
  const [simPaywallPct, setSimPaywallPct] = useState<number>(35);
  const [simConversionPct, setSimConversionPct] = useState<number>(6);
  const [simPhSharePct, setSimPhSharePct] = useState<number>(50);

  const metrics = useMemo(() => computeFinancialMetrics(analytics, 56), [analytics]);

  const projection = useMemo(
    () =>
      computeRevenueProjection({
        dailyVisitors: simDailyVisitors,
        studioStartRatePct: simStudioPct,
        paywallReachPct: simPaywallPct,
        paywallToPaidPct: simConversionPct,
        phSharePct: simPhSharePct,
        singleMixPct: 30,
        pass7dMixPct: 50,
        pass30dMixPct: 20,
      }),
    [simDailyVisitors, simStudioPct, simPaywallPct, simConversionPct, simPhSharePct]
  );

  const dailySeries = analytics.dailySeries || [];
  const activeDay =
    dailySeries.find((d) => d.date === selectedDate) ||
    dailySeries[dailySeries.length - 1] ||
    null;

  const sparklines = useMemo(() => {
    const grossUsd = dailySeries.map(
      (d) => (d.revenueUsdCents || 0) / 100 + (d.revenuePhpCentavos || 0) / 100 / 56
    );
    const estNetUsd = dailySeries.map((d) => {
      const usd = (d.revenueUsdCents || 0) / 100;
      const phpUsd = (d.revenuePhpCentavos || 0) / 100 / 56;
      return Math.max(0, usd * 0.95 + phpUsd * 0.985);
    });
    const visits = dailySeries.map((d) => d.visits || 0);
    const unlocks = dailySeries.map((d) => d.passUnlocks || 0);
    return { grossUsd, estNetUsd, visits, unlocks };
  }, [dailySeries]);

  const channelBreakdown = useMemo(() => {
    const map: Record<string, { count: number; estUsd: number }> = {};
    for (const p of paidPasses) {
      if (p.status === 'revoked' || p.isTest || p.archivedFromIncome) continue;
      const ch = p.channel || 'other';
      if (!map[ch]) map[ch] = { count: 0, estUsd: 0 };
      map[ch].count += 1;
      map[ch].estUsd +=
        p.currency === 'PHP' ? p.amountMinor / 100 / 56 : p.amountMinor / 100;
    }
    return Object.entries(map).sort((a, b) => b[1].estUsd - a[1].estUsd);
  }, [paidPasses]);

  const topTriggers = useMemo(() => {
    return Object.entries(analytics.paywallTriggers || {})
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  }, [analytics.paywallTriggers]);

  const topReferrers = useMemo(() => {
    return Object.entries(analytics.referrers || {})
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  }, [analytics.referrers]);

  // Design tokens (Parisian couture stationery)
  const cardSurface = isDarkMode
    ? 'bg-[#352C29] border-[#5E4E49]'
    : 'bg-[#FFFDF9] border-[#DECBB9]';
  const recessedSurface = isDarkMode
    ? 'bg-[#2B2321] border-[#5E4E49]'
    : 'bg-[#FAF4EE] border-[#DECBB9]';
  const mutedText = isDarkMode ? 'text-[#D8C7BE]' : 'text-[#6E5D54]';
  const dashedBorder = isDarkMode ? 'border-[#5E4E49]' : 'border-[#DECBB9]';
  const primaryBtn = isDarkMode
    ? 'bg-[#E6B89C] text-[#231C18] border-[#E6B89C] hover:bg-[#F0C8AE]'
    : 'bg-[#6E4434] text-[#FFFDF9] border-[#6E4434] hover:bg-[#593527]';
  const subtlePillBtn = isDarkMode
    ? 'border-[#5E4E49] text-[#FBF6F1] hover:bg-[#2B2321]'
    : 'border-[#DECBB9] text-[#2A201D] hover:bg-[#FAF4EE]';

  const primaryColor = isDarkMode ? '#E6B89C' : '#6E4434';
  const terracottaColor = isDarkMode ? '#C9967B' : '#B4846C';
  const sageColor = isDarkMode ? '#8AB89A' : '#5E8568';
  const roseColor = isDarkMode ? '#D47A8A' : '#9E4757';

  const isIncomePaused = Boolean(analytics.incomePausedForTesting);
  const isPhDisabled = Boolean(analytics.phPaymentsDisabled);

  const tierDonutSegments = useMemo(() => {
    const colors = [terracottaColor, primaryColor, sageColor];
    return metrics.tierMix.map((t, idx) => ({
      id: t.tier,
      label: t.label,
      sublabel: t.priceRangeLabel,
      value: t.count,
      color: colors[idx % colors.length],
    }));
  }, [metrics.tierMix, terracottaColor, primaryColor, sageColor]);

  const regionDonutSegments = useMemo(() => {
    const phCount = analytics.regions?.PH || 0;
    const intlCount = analytics.regions?.INTL || 0;
    return [
      { id: 'PH', label: 'Philippines', sublabel: 'PHP pricing', value: phCount, color: primaryColor },
      { id: 'INTL', label: 'International', sublabel: 'USD pricing', value: intlCount, color: terracottaColor },
    ];
  }, [analytics.regions, primaryColor, terracottaColor]);

  const totalRegionCount = (analytics.regions?.PH || 0) + (analytics.regions?.INTL || 0);
  const totalDevices =
    (analytics.devices?.mobile || 0) +
    (analytics.devices?.desktop || 0) +
    (analytics.devices?.tablet || 0);

  const maxChannelUsd = Math.max(1, ...channelBreakdown.map(([, s]) => s.estUsd));
  const maxTriggerCount = Math.max(1, ...topTriggers.map(([, c]) => c));

  const kofiClaimed = analytics.kofiLaunchClaimedCount ?? 0;
  const kofiCap = analytics.kofiLaunchMaxLimit ?? 30;
  const kofiPct = kofiCap > 0 ? Math.min(100, Math.round((kofiClaimed / kofiCap) * 100)) : 0;

  const recipientClaimed = analytics.recipientGiftClaimedCount ?? 0;
  const recipientCap = analytics.recipientGiftMaxLimit ?? 150;
  const recipientPct =
    recipientCap > 0 ? Math.min(100, Math.round((recipientClaimed / recipientCap) * 100)) : 0;

  return (
    <div className="space-y-6 animate-[fadeIn_180ms_ease-out]">
      {/* 1. Top Header & Compact Operational Controls */}
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div className="min-w-0">
          <h1
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            className="text-3xl sm:text-[34px] font-medium tracking-tight leading-none"
          >
            Overview
          </h1>
          <p className={`text-xs tabular-nums mt-1.5 leading-relaxed ${mutedText}`}>
            {metrics.totalPaidPasses} paid keys · {testerCount} tester invites ·{' '}
            {analytics.bouquetsCreated.toLocaleString()} bouquets sealed
            {isIncomePaused ? ' · Test mode active' : ''}
            {isPhDisabled ? ' · USD only' : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onTogglePhDisabled && (
            <button
              data-testid="toggle-ph-disabled-btn"
              type="button"
              disabled={isTogglingPhDisabled}
              onClick={() => onTogglePhDisabled(!isPhDisabled)}
              className={`px-3 py-1.5 rounded-full border border-dashed text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 ${
                isPhDisabled ? primaryBtn : subtlePillBtn
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>
                {isTogglingPhDisabled
                  ? 'Updating...'
                  : isPhDisabled
                  ? 'PH Disabled · Enable'
                  : 'PH Payments'}
              </span>
            </button>
          )}

          {onToggleIncomePause && (
            <button
              data-testid="toggle-income-pause-btn"
              type="button"
              disabled={isTogglingIncomePause}
              onClick={() => onToggleIncomePause(!isIncomePaused)}
              className={`px-3 py-1.5 rounded-full border border-dashed text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 ${
                isIncomePaused ? primaryBtn : subtlePillBtn
              }`}
            >
              {isIncomePaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              <span>
                {isTogglingIncomePause
                  ? 'Updating...'
                  : isIncomePaused
                  ? 'Resume Income'
                  : 'Income Mode'}
              </span>
            </button>
          )}

          {onResetIncome && !confirmingReset && (
            <button
              data-testid="reset-owner-income-btn"
              type="button"
              disabled={isResettingIncome}
              onClick={() => setConfirmingReset(true)}
              className={`px-3 py-1.5 rounded-full border border-dashed text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 ${subtlePillBtn}`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          {onResetIncome && confirmingReset && (
            <div className="inline-flex flex-wrap items-center gap-1.5">
              <button
                data-testid="confirm-reset-income-btn"
                type="button"
                disabled={isResettingIncome}
                onClick={() => {
                  setConfirmingReset(false);
                  onResetIncome(true);
                }}
                style={{ backgroundColor: roseColor }}
                className="px-3 py-1.5 rounded-full border border-dashed border-transparent text-[#FFFDF9] text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
              >
                {isResettingIncome ? 'Resetting...' : 'Confirm $0.00 Reset'}
              </button>
              <button
                data-testid="cancel-reset-income-btn"
                type="button"
                disabled={isResettingIncome}
                onClick={() => setConfirmingReset(false)}
                className={`px-2.5 py-1.5 rounded-full border border-dashed text-xs font-medium transition-colors cursor-pointer ${subtlePillBtn}`}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Quiet Soft Dashed Notices (Only rendered when active) */}
      {(isIncomePaused || isPhDisabled) && (
        <div className="space-y-2">
          {isIncomePaused && (
            <div
              data-testid="income-paused-banner"
              className={`rounded-xl border border-dashed px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${recessedSurface}`}
            >
              <p className="leading-relaxed">
                <span className="font-medium">Income paused for testing.</span> Webhooks still issue
                working keys tagged <span className="font-mono">Test</span> without adding to Gross
                Revenue.
              </p>
              {onToggleIncomePause && (
                <button
                  type="button"
                  disabled={isTogglingIncomePause}
                  onClick={() => onToggleIncomePause(false)}
                  className={`px-3 py-1 rounded-full border border-dashed text-xs font-medium shrink-0 cursor-pointer transition-colors ${subtlePillBtn}`}
                >
                  Resume Live Income
                </button>
              )}
            </div>
          )}

          {isPhDisabled && (
            <div
              data-testid="ph-disabled-banner"
              className={`rounded-xl border border-dashed px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${recessedSurface}`}
            >
              <p className="leading-relaxed">
                <span className="font-medium">PH Payments disabled (USD Only).</span> Visitors see
                USD pricing ($1.99 / $3.99 / $6.99) and PayPal · Card · Ko-fi.
              </p>
              {onTogglePhDisabled && (
                <button
                  type="button"
                  disabled={isTogglingPhDisabled}
                  onClick={() => onTogglePhDisabled(false)}
                  className={`px-3 py-1 rounded-full border border-dashed text-xs font-medium shrink-0 cursor-pointer transition-colors ${subtlePillBtn}`}
                >
                  Enable PH Payments
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. Hero 4-KPI Row */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        <div className={`rounded-2xl border border-dashed p-4 sm:p-5 min-w-0 ${cardSurface}`}>
          <div className={`text-xs font-medium ${mutedText}`}>Combined Gross</div>
          <div className="mt-2 flex items-end justify-between gap-2 min-w-0">
            <div
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              className="text-3xl sm:text-[34px] font-medium leading-none tabular-nums truncate"
              data-testid="kpi-combined-gross"
            >
              ${metrics.combinedGrossUsd.toFixed(2)}
            </div>
            <MiniSparkline id="gross" values={sparklines.grossUsd} color={primaryColor} />
          </div>
          <div className={`text-[11px] mt-3 tabular-nums ${mutedText}`}>
            ₱{metrics.grossPhp.toLocaleString()} PHP · ${metrics.grossUsd.toFixed(2)} USD
          </div>
        </div>

        <div className={`rounded-2xl border border-dashed p-4 sm:p-5 min-w-0 ${cardSurface}`}>
          <div className={`text-xs font-medium ${mutedText}`}>Est. Net Gain</div>
          <div className="mt-2 flex items-end justify-between gap-2 min-w-0">
            <div
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              className="text-3xl sm:text-[34px] font-medium leading-none tabular-nums truncate"
            >
              ${metrics.estNetUsd.toFixed(2)}
            </div>
            <MiniSparkline id="net" values={sparklines.estNetUsd} color={sageColor} />
          </div>
          <div className={`text-[11px] mt-3 tabular-nums ${mutedText}`}>
            ~₱{Math.round(metrics.estNetPhp).toLocaleString()} after ~$
            {metrics.estGatewayFeeUsd.toFixed(2)} fees
          </div>
        </div>

        <div className={`rounded-2xl border border-dashed p-4 sm:p-5 min-w-0 ${cardSurface}`}>
          <div className={`text-xs font-medium ${mutedText}`}>Visitors → Paid</div>
          <div className="mt-2 flex items-end justify-between gap-2 min-w-0">
            <div
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              className="text-3xl sm:text-[34px] font-medium leading-none tabular-nums truncate"
            >
              {metrics.overallVisitorToPaidPct.toFixed(2)}%
            </div>
            <MiniSparkline id="visits" values={sparklines.visits} color={terracottaColor} />
          </div>
          <div className={`text-[11px] mt-3 tabular-nums ${mutedText}`}>
            {analytics.webVisits.toLocaleString()} visits ·{' '}
            {analytics.uniqueVisitors.toLocaleString()} unique
          </div>
        </div>

        <div className={`rounded-2xl border border-dashed p-4 sm:p-5 min-w-0 ${cardSurface}`}>
          <div className={`text-xs font-medium ${mutedText}`}>Paid Passes · ARPPU</div>
          <div className="mt-2 flex items-end justify-between gap-2 min-w-0">
            <div
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              className="text-3xl sm:text-[34px] font-medium leading-none tabular-nums truncate"
            >
              {metrics.totalPaidPasses}
              <span className={`text-lg font-normal ml-2 ${mutedText}`}>
                {metrics.arppuUsd > 0 ? `$${metrics.arppuUsd.toFixed(2)}` : '—'}
              </span>
            </div>
            <MiniSparkline id="unlocks" values={sparklines.unlocks} color={roseColor} />
          </div>
          <div className={`text-[11px] mt-3 tabular-nums ${mutedText}`}>
            {analytics.bouquetsCreated.toLocaleString()} sealed · {metrics.paywallToPaidPct}%
            paywall conv.
          </div>
        </div>
      </section>

      {/* 3. Primary Graph: Full-Width 14-Day Trajectory */}
      <section className={`rounded-2xl border border-dashed p-5 sm:p-6 ${cardSurface}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              className="text-2xl font-medium leading-tight"
            >
              14-Day Trajectory
            </h2>
            {activeDay && (
              <p className={`text-xs mt-1 tabular-nums ${mutedText}`}>
                <span className="font-medium opacity-95">{activeDay.date}</span> ·{' '}
                {chartMode === 'traffic'
                  ? `${activeDay.visits} visits · ${activeDay.bouquetsSealed} sealed · ${activeDay.recipientUnwraps} unwraps`
                  : `₱${((activeDay.revenuePhpCentavos || 0) / 100).toFixed(0)} + $${(
                      (activeDay.revenueUsdCents || 0) / 100
                    ).toFixed(2)} · ${activeDay.passUnlocks} unlocks`}
              </p>
            )}
          </div>

          <div
            className={`inline-flex rounded-full border border-dashed p-0.5 text-xs self-start sm:self-auto ${recessedSurface}`}
            role="tablist"
            aria-label="Chart metric mode"
          >
            <button
              type="button"
              role="tab"
              aria-selected={chartMode === 'traffic'}
              onClick={() => setChartMode('traffic')}
              className={`px-3 py-1 rounded-full transition-colors cursor-pointer ${
                chartMode === 'traffic' ? primaryBtn : `${mutedText} hover:opacity-100`
              }`}
            >
              Traffic & Gifts
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={chartMode === 'revenue'}
              onClick={() => setChartMode('revenue')}
              className={`px-3 py-1 rounded-full transition-colors cursor-pointer ${
                chartMode === 'revenue' ? primaryBtn : `${mutedText} hover:opacity-100`
              }`}
            >
              Revenue & Keys
            </button>
          </div>
        </div>

        <TrajectoryAreaChart
          data={dailySeries}
          mode={chartMode}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          isDarkMode={isDarkMode}
          phpPerUsd={56}
        />
      </section>

      {/* 4. Analytics Visual Grid (Funnel + Recipient Engagement + Donut Breakdowns) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left: Conversion Funnel + Recipient Experience & Share Channels */}
        <div className="xl:col-span-7 space-y-5 min-w-0">
          <section className={`rounded-2xl border border-dashed p-4 sm:p-6 ${cardSurface}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-5">
              <h2
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                className="text-2xl font-medium leading-tight"
              >
                Conversion Funnel
              </h2>
              <span className={`text-xs tabular-nums ${mutedText}`}>
                Viral loop: {metrics.viralLoopPct}%
              </span>
            </div>

            <FunnelBarChart steps={metrics.funnelSteps} isDarkMode={isDarkMode} />
          </section>

          {/* Recipient Experience & Share Channels */}
          <section
            data-testid="recipient-engagement-card"
            className={`rounded-2xl border border-dashed p-4 sm:p-6 space-y-5 ${cardSurface}`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h2
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                  className="text-2xl font-medium leading-tight"
                >
                  Recipient Engagement
                </h2>
                <p className={`text-xs mt-0.5 ${mutedText}`}>
                  Keepsake opens, voice plays, replies, and export channels.
                </p>
              </div>
              <span className={`text-xs tabular-nums ${mutedText}`}>
                {analytics.landingViews.toLocaleString()} landing ·{' '}
                {analytics.showcaseViews.toLocaleString()} showcase
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
              {[
                {
                  id: 'unwraps',
                  label: 'Gift Unwraps',
                  value: analytics.recipientUnwraps,
                  sub: `${analytics.bouquetsCreated > 0 ? Math.min(100, Math.round((analytics.recipientUnwraps / analytics.bouquetsCreated) * 100)) : 0}% of sealed`,
                },
                {
                  id: 'notes',
                  label: 'Notes Opened',
                  value: analytics.noteOpens ?? 0,
                  sub: `${analytics.recipientUnwraps > 0 ? Math.min(100, Math.round(((analytics.noteOpens ?? 0) / analytics.recipientUnwraps) * 100)) : 0}% of unwraps`,
                },
                {
                  id: 'photos',
                  label: 'Photos Opened',
                  value: analytics.photoOpens ?? 0,
                  sub: `${analytics.recipientUnwraps > 0 ? Math.min(100, Math.round(((analytics.photoOpens ?? 0) / analytics.recipientUnwraps) * 100)) : 0}% of unwraps`,
                },
                {
                  id: 'voice',
                  label: 'Voice Plays',
                  value: analytics.voicePlays,
                  sub: `${analytics.voiceNotesRecorded} recorded`,
                },
                {
                  id: 'reactions',
                  label: 'Reactions & Notes',
                  value: analytics.reactionsSent,
                  sub: `${analytics.repliesSent} replies`,
                },
                {
                  id: 'viral',
                  label: 'Craft-Yours Clicks',
                  value: analytics.recipientToStudioClicks,
                  sub: `${metrics.viralLoopPct}% viral loop`,
                },
              ].map((stat) => (
                <div
                  key={stat.id}
                  data-testid={`engagement-stat-${stat.id}`}
                  className={`rounded-xl border border-dashed p-3 min-w-0 ${recessedSurface}`}
                >
                  <div className={`text-[11px] font-medium truncate ${mutedText}`}>
                    {stat.label}
                  </div>
                  <div
                    style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                    className="text-2xl font-medium mt-1 leading-none tabular-nums"
                  >
                    {stat.value.toLocaleString()}
                  </div>
                  <div className={`text-[11px] mt-1 tabular-nums truncate ${mutedText}`}>
                    {stat.sub}
                  </div>
                </div>
              ))}
            </div>

            <div className={`pt-4 border-t border-dashed ${dashedBorder} space-y-2.5`}>
              <div className="flex items-baseline justify-between gap-2">
                <h3
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                  className="text-lg font-medium leading-tight"
                >
                  Share &amp; Export Channels
                </h3>
                <span className={`text-[11px] tabular-nums ${mutedText}`}>
                  {(
                    (analytics.shareChannels?.short_link || 0) +
                    (analytics.shareChannels?.png_download || 0) +
                    (analytics.shareChannels?.qr_card || 0) +
                    (analytics.shareChannels?.email_surprise || 0) +
                    (analytics.shareChannels?.garland_pin || 0)
                  ).toLocaleString()}{' '}
                  actions
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(
                  [
                    { key: 'short_link', label: 'Short Link' },
                    { key: 'png_download', label: 'PNG Save' },
                    { key: 'qr_card', label: 'QR Card' },
                    { key: 'email_surprise', label: 'Email Gift' },
                    { key: 'garland_pin', label: 'Garland Pin' },
                  ] as const
                ).map((ch) => (
                  <div
                    key={ch.key}
                    data-testid={`share-channel-${ch.key}`}
                    className={`rounded-lg border border-dashed px-2.5 py-2 flex items-baseline justify-between sm:flex-col sm:items-start gap-1 ${recessedSurface}`}
                  >
                    <span className={`text-[11px] truncate ${mutedText}`}>{ch.label}</span>
                    <span className="font-mono text-xs font-medium tabular-nums">
                      {(analytics.shareChannels?.[ch.key] || 0).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Right: Tier Mix + Region & Devices + Channels & Triggers */}
        <div className="xl:col-span-5 space-y-4 min-w-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-1 gap-4">
            <section className={`rounded-2xl border border-dashed p-4 sm:p-5 min-w-0 ${cardSurface}`}>
              <h2
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                className="text-xl font-medium mb-4 leading-tight"
              >
                Tier Mix
              </h2>
              <DonutBreakdownChart
                segments={tierDonutSegments}
                centerValue={metrics.totalPaidPasses}
                centerLabel="paid keys"
                isDarkMode={isDarkMode}
              />
            </section>

            <section
              className={`rounded-2xl border border-dashed p-4 sm:p-5 space-y-4 min-w-0 ${cardSurface}`}
            >
              <h2
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                className="text-xl font-medium leading-tight"
              >
                Region &amp; Devices
              </h2>

              <DonutBreakdownChart
                segments={regionDonutSegments}
                centerValue={totalRegionCount > 0 ? `${metrics.phAudienceSharePct}%` : '—'}
                centerLabel={totalRegionCount > 0 ? 'PH share' : 'no visits'}
                isDarkMode={isDarkMode}
                size={104}
              />

              <div className={`pt-3.5 border-t border-dashed ${dashedBorder} space-y-2`}>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
                  <span className={mutedText}>Devices</span>
                  <span className="font-mono tabular-nums text-[11px]">
                    Mobile {analytics.devices.mobile} · Desktop {analytics.devices.desktop} ·
                    Tablet {analytics.devices.tablet}
                  </span>
                </div>
              <div
                className={`h-2 w-full rounded-full overflow-hidden flex ${
                  isDarkMode ? 'bg-[#2B2321]' : 'bg-[#FAF4EE]'
                }`}
              >
                {totalDevices > 0 && (
                  <>
                    <div
                      style={{
                        width: `${(analytics.devices.mobile / totalDevices) * 100}%`,
                        backgroundColor: primaryColor,
                      }}
                      className="h-full"
                    />
                    <div
                      style={{
                        width: `${(analytics.devices.desktop / totalDevices) * 100}%`,
                        backgroundColor: terracottaColor,
                      }}
                      className="h-full"
                    />
                    <div
                      style={{
                        width: `${(analytics.devices.tablet / totalDevices) * 100}%`,
                        backgroundColor: sageColor,
                      }}
                      className="h-full"
                    />
                  </>
                )}
              </div>
              </div>
            </section>
          </div>

          {(channelBreakdown.length > 0 || topTriggers.length > 0 || topReferrers.length > 0) && (
            <section className={`rounded-2xl border border-dashed p-4 sm:p-5 space-y-4 min-w-0 ${cardSurface}`}>
              {channelBreakdown.length > 0 && (
                <div className="space-y-2.5">
                  <h3
                    style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                    className="text-lg font-medium leading-tight"
                  >
                    Revenue by Channel
                  </h3>
                  <div className="space-y-2">
                    {channelBreakdown.slice(0, 4).map(([ch, stats]) => (
                      <div key={ch} className="space-y-1">
                        <div className="flex items-center justify-between text-xs tabular-nums">
                          <span className="truncate">{CHANNEL_NAMES[ch] || ch}</span>
                          <span className={`font-mono text-[11px] shrink-0 ${mutedText}`}>
                            {stats.count} keys · ~${stats.estUsd.toFixed(2)}
                          </span>
                        </div>
                        <div
                          className={`h-1.5 w-full rounded-full overflow-hidden ${
                            isDarkMode ? 'bg-[#2B2321]' : 'bg-[#FAF4EE]'
                          }`}
                        >
                          <div
                            style={{
                              width: `${Math.max(6, Math.round((stats.estUsd / maxChannelUsd) * 100))}%`,
                              backgroundColor: primaryColor,
                            }}
                            className="h-full rounded-full"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(topTriggers.length > 0 || topReferrers.length > 0) && (
                <div
                  className={
                    channelBreakdown.length > 0
                      ? `pt-3.5 border-t border-dashed ${dashedBorder} space-y-2.5`
                      : 'space-y-2.5'
                  }
                >
                  <h3
                    style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                    className="text-lg font-medium leading-tight"
                  >
                    Top Triggers & Referrers
                  </h3>
                  {topTriggers.length > 0 && (
                    <div className="space-y-2">
                      {topTriggers.slice(0, 3).map(([k, count]) => (
                        <div key={k} className="space-y-1">
                          <div className="flex items-center justify-between text-xs tabular-nums">
                            <span className="truncate">{formatLabel(k)}</span>
                            <span className={`font-mono text-[11px] ${mutedText}`}>{count}</span>
                          </div>
                          <div
                            className={`h-1.5 w-full rounded-full overflow-hidden ${
                              isDarkMode ? 'bg-[#2B2321]' : 'bg-[#FAF4EE]'
                            }`}
                          >
                            <div
                              style={{
                                width: `${Math.max(8, Math.round((count / maxTriggerCount) * 100))}%`,
                                backgroundColor: terracottaColor,
                              }}
                              className="h-full rounded-full"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {topReferrers.length > 0 && (
                    <p className={`text-[11px] leading-relaxed tabular-nums ${mutedText}`}>
                      Referrers:{' '}
                      {topReferrers
                        .slice(0, 3)
                        .map(([k, v]) => `${formatLabel(k)} (${v})`)
                        .join(' · ')}
                    </p>
                  )}
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      {/* Subtle Hairline Divider separating Live Analytics from Operations & Sandbox */}
      <div className={`border-t border-dashed ${dashedBorder} pt-2`} />

      {/* 5. Secondary Operations: Founding Launch Promo Controls */}
      <section
        data-testid="founding-launch-promo-controls"
        className={`rounded-2xl border border-dashed p-5 sm:p-6 space-y-4 ${cardSurface}`}
      >
        <div>
          <h2
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            className="text-2xl font-medium leading-tight"
          >
            Founding Launch Promos
          </h2>
          <p className={`text-xs mt-1 ${mutedText}`}>
            Manage the Ko-fi Starter free single bouquet cap and the Pay-It-Forward recipient gift
            box.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 1. Ko-fi Starter Limit Control */}
          <div className={`rounded-xl border border-dashed p-4 space-y-3 min-w-0 ${recessedSurface}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-medium">Ko-fi Starter Single Bouquet ($1.99 → Free)</div>
                <div className={`text-[11px] tabular-nums mt-0.5 ${mutedText}`}>
                  Claimed{' '}
                  <span className="font-mono font-medium">
                    {kofiClaimed} / {kofiCap}
                  </span>{' '}
                  · {Math.max(0, kofiCap - kofiClaimed)} remaining
                </div>
              </div>
              {onUpdateLaunchPromoConfig && (
                <button
                  type="button"
                  data-testid="toggle-kofi-launch-btn"
                  disabled={isUpdatingLaunchPromo}
                  onClick={() =>
                    onUpdateLaunchPromoConfig({
                      kofiLaunchEnabled: !(analytics.kofiLaunchEnabled ?? true),
                    })
                  }
                  className={`px-2.5 py-1 rounded-full border border-dashed text-[11px] font-medium cursor-pointer transition-colors disabled:opacity-50 ${
                    analytics.kofiLaunchEnabled ?? true ? primaryBtn : subtlePillBtn
                  }`}
                >
                  {(analytics.kofiLaunchEnabled ?? true) ? 'Active' : 'Paused'}
                </button>
              )}
            </div>

            <div
              className={`h-1.5 w-full rounded-full overflow-hidden ${
                isDarkMode ? 'bg-[#352C29]' : 'bg-[#FFFDF9]'
              }`}
            >
              <div
                style={{ width: `${kofiPct}%`, backgroundColor: primaryColor }}
                className="h-full rounded-full transition-all"
              />
            </div>

            {onUpdateLaunchPromoConfig && (
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <label className={`text-[11px] ${mutedText}`}>Cap</label>
                <input
                  type="number"
                  min={0}
                  max={10000}
                  data-testid="kofi-launch-limit-input"
                  value={kofiLimitInput}
                  onChange={(e) => setKofiLimitInput(e.target.value)}
                  className={`w-20 px-2.5 py-1 rounded-lg border border-dashed text-xs font-mono tabular-nums bg-transparent ${dashedBorder}`}
                />
                <button
                  type="button"
                  data-testid="save-kofi-launch-limit-btn"
                  disabled={isUpdatingLaunchPromo}
                  onClick={() => {
                    const parsed = Math.max(
                      0,
                      Math.min(10000, Math.round(Number(kofiLimitInput) || 0))
                    );
                    setKofiLimitInput(String(parsed));
                    onUpdateLaunchPromoConfig({ kofiLaunchMaxLimit: parsed });
                  }}
                  className={`px-2.5 py-1 rounded-lg border border-dashed text-[11px] font-medium cursor-pointer transition-colors ${subtlePillBtn}`}
                >
                  Save Cap
                </button>
                <button
                  type="button"
                  data-testid="reset-kofi-launch-claimed-btn"
                  disabled={isUpdatingLaunchPromo}
                  onClick={() => onUpdateLaunchPromoConfig({ resetKofiLaunchClaims: true })}
                  className={`px-2.5 py-1 rounded-lg border border-dashed text-[11px] cursor-pointer transition-colors ${mutedText} ${dashedBorder} hover:opacity-100`}
                >
                  Reset 0/{kofiCap}
                </button>
              </div>
            )}
          </div>

          {/* 2. Pay-It-Forward Recipient Gift Box Control */}
          <div className={`rounded-xl border border-dashed p-4 space-y-3 ${recessedSurface}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs font-medium">Recipient Gift Box (Pay-It-Forward)</div>
                <div className={`text-[11px] tabular-nums mt-0.5 ${mutedText}`}>
                  Claimed{' '}
                  <span className="font-mono font-medium">
                    {recipientClaimed} / {recipientCap}
                  </span>{' '}
                  · {Math.max(0, recipientCap - recipientClaimed)} remaining
                </div>
              </div>
              {onUpdateLaunchPromoConfig && (
                <button
                  type="button"
                  data-testid="toggle-recipient-gift-btn"
                  disabled={isUpdatingLaunchPromo}
                  onClick={() =>
                    onUpdateLaunchPromoConfig({
                      recipientGiftEnabled: !(analytics.recipientGiftEnabled ?? true),
                    })
                  }
                  className={`px-2.5 py-1 rounded-full border border-dashed text-[11px] font-medium cursor-pointer transition-colors disabled:opacity-50 ${
                    analytics.recipientGiftEnabled ?? true ? primaryBtn : subtlePillBtn
                  }`}
                >
                  {(analytics.recipientGiftEnabled ?? true) ? 'Active' : 'Paused'}
                </button>
              )}
            </div>

            <div
              className={`h-1.5 w-full rounded-full overflow-hidden ${
                isDarkMode ? 'bg-[#352C29]' : 'bg-[#FFFDF9]'
              }`}
            >
              <div
                style={{ width: `${recipientPct}%`, backgroundColor: sageColor }}
                className="h-full rounded-full transition-all"
              />
            </div>

            {onUpdateLaunchPromoConfig && (
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <label className={`text-[11px] ${mutedText}`}>Cap</label>
                <input
                  type="number"
                  min={0}
                  max={50000}
                  data-testid="recipient-gift-limit-input"
                  value={recipientLimitInput}
                  onChange={(e) => setRecipientLimitInput(e.target.value)}
                  className={`w-20 px-2.5 py-1 rounded-lg border border-dashed text-xs font-mono tabular-nums bg-transparent ${dashedBorder}`}
                />
                <button
                  type="button"
                  data-testid="save-recipient-gift-limit-btn"
                  disabled={isUpdatingLaunchPromo}
                  onClick={() => {
                    const parsed = Math.max(
                      0,
                      Math.min(50000, Math.round(Number(recipientLimitInput) || 0))
                    );
                    setRecipientLimitInput(String(parsed));
                    onUpdateLaunchPromoConfig({ recipientGiftMaxLimit: parsed });
                  }}
                  className={`px-2.5 py-1 rounded-lg border border-dashed text-[11px] font-medium cursor-pointer transition-colors ${subtlePillBtn}`}
                >
                  Save Cap
                </button>
                <button
                  type="button"
                  data-testid="reset-recipient-gift-claimed-btn"
                  disabled={isUpdatingLaunchPromo}
                  onClick={() => onUpdateLaunchPromoConfig({ resetRecipientGiftClaims: true })}
                  className={`px-2.5 py-1 rounded-lg border border-dashed text-[11px] cursor-pointer transition-colors ${mutedText} ${dashedBorder} hover:opacity-100`}
                >
                  Reset 0/{recipientCap}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 6. Scale & Revenue Simulator (Projection Sandbox — separate from recorded actuals) */}
      <section
        data-testid="revenue-projection-sandbox"
        className={`rounded-2xl border border-dashed p-5 sm:p-6 ${cardSurface}`}
      >
        <div
          className={`flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-dashed ${dashedBorder}`}
        >
          <div>
            <h2
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              className="text-2xl font-medium leading-tight"
            >
              Scale & Revenue Simulator
            </h2>
            <p className={`text-xs mt-1 ${mutedText}`}>
              What-if projection using live PH (₱49 / ₱99 / ₱199) & INTL ($1.99 / $3.99 / $6.99)
              pricing — separate from recorded actuals.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: 'Steady', visitors: 300, conv: 5 },
              { label: 'TikTok Spike', visitors: 3500, conv: 6 },
              { label: 'Viral Boom', visitors: 15000, conv: 7 },
            ].map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setSimDailyVisitors(preset.visitors);
                  setSimConversionPct(preset.conv);
                }}
                className={`px-3 py-1 rounded-full border border-dashed text-[11px] font-medium transition-colors cursor-pointer ${subtlePillBtn}`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 sm:gap-6 pt-5 items-center">
          <div className="xl:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
            <label className="block space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className={mutedText}>Daily Visitors</span>
                <span className="font-mono tabular-nums font-medium">
                  {simDailyVisitors.toLocaleString()}/day
                </span>
              </div>
              <input
                data-testid="revenue-simulator-visitors"
                type="range"
                min={50}
                max={25000}
                step={50}
                value={simDailyVisitors}
                onChange={(e) => setSimDailyVisitors(Number(e.target.value))}
                className="w-full accent-[#6E4434] dark:accent-[#E6B89C] cursor-pointer"
              />
            </label>

            <label className="block space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className={mutedText}>Paywall → Paid Conv.</span>
                <span className="font-mono tabular-nums font-medium">{simConversionPct}%</span>
              </div>
              <input
                data-testid="revenue-simulator-conversion"
                type="range"
                min={1}
                max={20}
                step={0.5}
                value={simConversionPct}
                onChange={(e) => setSimConversionPct(Number(e.target.value))}
                className="w-full accent-[#6E4434] dark:accent-[#E6B89C] cursor-pointer"
              />
            </label>

            <label className="block space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className={mutedText}>Studio Open Rate</span>
                <span className="font-mono tabular-nums font-medium">{simStudioPct}%</span>
              </div>
              <input
                type="range"
                min={15}
                max={90}
                step={5}
                value={simStudioPct}
                onChange={(e) => setSimStudioPct(Number(e.target.value))}
                className="w-full accent-[#6E4434] dark:accent-[#E6B89C] cursor-pointer"
              />
            </label>

            <label className="block space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className={mutedText}>PH Buyer Share (PPP)</span>
                <span className="font-mono tabular-nums font-medium">
                  {simPhSharePct}% PH · {100 - simPhSharePct}% INTL
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={simPhSharePct}
                onChange={(e) => setSimPhSharePct(Number(e.target.value))}
                className="w-full accent-[#6E4434] dark:accent-[#E6B89C] cursor-pointer"
              />
            </label>

            <label className="block space-y-1.5 sm:col-span-2">
              <div className="flex justify-between text-xs">
                <span className={mutedText}>Couture Upgrade Intent (Studio → Paywall)</span>
                <span className="font-mono tabular-nums font-medium">{simPaywallPct}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={80}
                step={5}
                value={simPaywallPct}
                onChange={(e) => setSimPaywallPct(Number(e.target.value))}
                className="w-full accent-[#6E4434] dark:accent-[#E6B89C] cursor-pointer"
              />
            </label>
          </div>

          <div className="xl:col-span-5 grid grid-cols-2 gap-2.5 sm:gap-3 min-w-0">
            <div className={`rounded-xl border border-dashed p-3 sm:p-3.5 min-w-0 ${recessedSurface}`}>
              <div className={`text-[11px] font-medium truncate ${mutedText}`}>Proj. Monthly Net</div>
              <div
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                className="text-xl sm:text-2xl font-medium mt-1 leading-none tabular-nums truncate"
                data-testid="sim-monthly-net-usd"
              >
                ${projection.monthlyCombinedNetUsd.toLocaleString()}
              </div>
              <div className={`text-[11px] mt-1.5 tabular-nums truncate ${mutedText}`}>
                ~₱{Math.round(projection.monthlyCombinedNetPhp).toLocaleString()}
              </div>
            </div>

            <div className={`rounded-xl border border-dashed p-3 sm:p-3.5 min-w-0 ${recessedSurface}`}>
              <div className={`text-[11px] font-medium truncate ${mutedText}`}>Annual Run Rate</div>
              <div
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                className="text-xl sm:text-2xl font-medium mt-1 leading-none tabular-nums truncate"
              >
                ${projection.annualNetUsd.toLocaleString()}
              </div>
              <div className={`text-[11px] mt-1.5 tabular-nums truncate ${mutedText}`}>
                Est. net after fees
              </div>
            </div>

            <div className={`rounded-xl border border-dashed p-3 sm:p-3.5 min-w-0 ${recessedSurface}`}>
              <div className={`text-[11px] font-medium truncate ${mutedText}`}>Monthly Orders</div>
              <div
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                className="text-xl sm:text-2xl font-medium mt-1 leading-none tabular-nums truncate"
              >
                {projection.monthlyPaidOrders.toLocaleString()}
              </div>
              <div className={`text-[11px] mt-1.5 tabular-nums truncate ${mutedText}`}>
                {projection.phOrders} PH · {projection.intlOrders} INTL
              </div>
            </div>

            <div className={`rounded-xl border border-dashed p-3 sm:p-3.5 min-w-0 ${recessedSurface}`}>
              <div className={`text-[11px] font-medium truncate ${mutedText}`}>Blended AOV</div>
              <div
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                className="text-xl sm:text-2xl font-medium mt-1 leading-none tabular-nums truncate"
              >
                ${projection.blendedOrderUsd.toFixed(2)}
              </div>
              <div className={`text-[11px] mt-1.5 tabular-nums truncate ${mutedText}`}>
                30% 1x · 50% 7d · 20% 30d
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
