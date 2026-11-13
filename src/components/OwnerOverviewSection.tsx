import React, { useMemo, useState } from 'react';
import {
  OwnerAnalyticsSummary,
  PaidPassLedgerItem,
  computeFinancialMetrics,
  computeRevenueProjection,
} from '../lib/ownerAnalytics';

interface OwnerOverviewSectionProps {
  analytics: OwnerAnalyticsSummary;
  paidPasses: PaidPassLedgerItem[];
  testerCount: number;
  isDarkMode: boolean;
  formatLabel: (raw: string) => string;
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
}) => {
  const [chartMode, setChartMode] = useState<ChartSeriesMode>('traffic');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

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

  const maxDailyTraffic = Math.max(
    1,
    ...dailySeries.map((d) => Math.max(d.visits, d.bouquetsSealed, d.recipientUnwraps))
  );
  const maxDailyUsd = Math.max(
    1,
    ...dailySeries.map(
      (d) => (d.revenueUsdCents || 0) / 100 + (d.revenuePhpCentavos || 0) / 100 / 56
    )
  );

  const channelBreakdown = useMemo(() => {
    const map: Record<string, { count: number; estUsd: number }> = {};
    for (const p of paidPasses) {
      if (p.status === 'revoked') continue;
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
      .slice(0, 5);
  }, [analytics.paywallTriggers]);

  const topReferrers = useMemo(() => {
    return Object.entries(analytics.referrers || {})
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [analytics.referrers]);

  const panelClass = isDarkMode
    ? 'bg-[#352C29] border-[#5E4E49]/80'
    : 'bg-[#FFFDF9] border-[#DECBB9]';
  const cellBgClass = isDarkMode ? 'bg-[#352C29]' : 'bg-[#FFFDF9]';
  const hairlineBorder = isDarkMode ? 'border-[#5E4E49]/70' : 'border-[#DECBB9]/85';
  const hairlineDivide = isDarkMode ? 'divide-[#5E4E49]/70' : 'divide-[#DECBB9]/85';
  const gridHairlineBg = isDarkMode ? 'bg-[#5E4E49]/65' : 'bg-[#DECBB9]/85';
  const accentFill = isDarkMode ? '#E6B89C' : '#6E4434';
  const sageColor = isDarkMode ? '#8AB89A' : '#5E8568';

  return (
    <div className="space-y-6 animate-[fadeIn_180ms_ease-out]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
        <h1
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
          className="text-2xl sm:text-3xl font-normal tracking-tight"
        >
          Revenue & Studio Overview
        </h1>
        <p className="text-xs opacity-60 tabular-nums">
          Live telemetry · {metrics.totalPaidPasses} paid keys · {testerCount} tester invites
        </p>
      </div>

      {/* Top KPI Strip (Symmetrical 1px hairlines via gap-px grid across 2x2 mobile & 4-col desktop) */}
      <section className={`rounded-xl border ${hairlineBorder} overflow-hidden`}>
        <div className={`grid grid-cols-2 lg:grid-cols-4 gap-px ${gridHairlineBg}`}>
          <div className={`p-4 sm:p-5 ${cellBgClass}`}>
            <div className="text-[11px] uppercase tracking-[0.08em] opacity-60">
              Combined Gross
            </div>
            <div
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
              className="text-3xl sm:text-4xl font-medium mt-1 leading-none tabular-nums"
              data-testid="kpi-combined-gross"
            >
              ${metrics.combinedGrossUsd.toFixed(2)}
            </div>
            <div className="text-[11px] opacity-65 mt-2 tabular-nums">
              ₱{metrics.grossPhp.toLocaleString()} PHP · ${metrics.grossUsd.toFixed(2)} USD
            </div>
          </div>

          <div className={`p-4 sm:p-5 ${cellBgClass}`}>
            <div className="text-[11px] uppercase tracking-[0.08em] opacity-60">
              Est. Net Gain
            </div>
            <div
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
              className="text-3xl sm:text-4xl font-medium mt-1 leading-none tabular-nums"
            >
              ${metrics.estNetUsd.toFixed(2)}
            </div>
            <div className="text-[11px] opacity-65 mt-2 tabular-nums">
              ~₱{Math.round(metrics.estNetPhp).toLocaleString()} after ~${metrics.estGatewayFeeUsd.toFixed(2)} fees
            </div>
          </div>

          <div className={`p-4 sm:p-5 ${cellBgClass}`}>
            <div className="text-[11px] uppercase tracking-[0.08em] opacity-60">
              Visitors → Paid
            </div>
            <div
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
              className="text-3xl sm:text-4xl font-medium mt-1 leading-none tabular-nums"
            >
              {metrics.overallVisitorToPaidPct.toFixed(2)}%
            </div>
            <div className="text-[11px] opacity-65 mt-2 tabular-nums">
              {analytics.webVisits.toLocaleString()} visits · {analytics.uniqueVisitors.toLocaleString()} unique
            </div>
          </div>

          <div className={`p-4 sm:p-5 ${cellBgClass}`}>
            <div className="text-[11px] uppercase tracking-[0.08em] opacity-60">
              Paid Passes · ARPPU
            </div>
            <div
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
              className="text-3xl sm:text-4xl font-medium mt-1 leading-none tabular-nums"
            >
              {metrics.totalPaidPasses}
              <span className="text-lg font-normal opacity-60 ml-2">
                {metrics.arppuUsd > 0 ? `$${metrics.arppuUsd.toFixed(2)}` : '—'}
              </span>
            </div>
            <div className="text-[11px] opacity-65 mt-2 tabular-nums">
              {analytics.bouquetsCreated.toLocaleString()} sealed · {metrics.paywallToPaidPct}% paywall conv.
            </div>
          </div>
        </div>
      </section>

      {/* 14-Day Interactive Activity & Revenue Chart */}
      <section className={`rounded-xl border p-5 ${panelClass}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
              className="text-xl font-medium"
            >
              14-Day Trajectory
            </h2>
            {activeDay && (
              <p className="text-xs opacity-65 mt-0.5 tabular-nums">
                {activeDay.date}:{' '}
                {chartMode === 'traffic'
                  ? `${activeDay.visits} visits · ${activeDay.bouquetsSealed} sealed · ${activeDay.recipientUnwraps} unwraps`
                  : `₱${((activeDay.revenuePhpCentavos || 0) / 100).toFixed(0)} + $${((activeDay.revenueUsdCents || 0) / 100).toFixed(2)} · ${activeDay.passUnlocks} unlocks`}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            <div
              className={`inline-flex rounded-lg border p-0.5 text-xs ${hairlineBorder}`}
              role="tablist"
              aria-label="Chart metric mode"
            >
              <button
                type="button"
                role="tab"
                aria-selected={chartMode === 'traffic'}
                onClick={() => setChartMode('traffic')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  chartMode === 'traffic'
                    ? isDarkMode
                      ? 'bg-[#E6B89C] text-[#231C18] font-medium'
                      : 'bg-[#6E4434] text-[#FFFDF9] font-medium'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                Traffic & Gifts
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={chartMode === 'revenue'}
                onClick={() => setChartMode('revenue')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  chartMode === 'revenue'
                    ? isDarkMode
                      ? 'bg-[#E6B89C] text-[#231C18] font-medium'
                      : 'bg-[#6E4434] text-[#FFFDF9] font-medium'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                Revenue & Keys
              </button>
            </div>
          </div>
        </div>

        {/* Chart Legend (geometric line swatches — zero pulsing dots) */}
        <div className="flex flex-wrap items-center gap-4 text-[11px] opacity-75 mb-3">
          {chartMode === 'traffic' ? (
            <>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-1 bg-[#C88A70] inline-block" />
                Visits
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  style={{ backgroundColor: accentFill }}
                  className="w-3 h-1 inline-block"
                />
                Sealed
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  style={{ backgroundColor: sageColor }}
                  className="w-3 h-1 inline-block"
                />
                Unwraps
              </span>
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-1.5">
                <span
                  style={{ backgroundColor: accentFill }}
                  className="w-3 h-1 inline-block"
                />
                Gross USD Equiv.
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  style={{ backgroundColor: sageColor }}
                  className="w-3 h-1 inline-block"
                />
                Pass Unlocks
              </span>
            </>
          )}
        </div>

        {/* 14-day bars */}
        <div className="h-40 flex items-end gap-1.5 pt-2">
          {dailySeries.map((day) => {
            const isSelected = activeDay?.date === day.date;
            const dayUsd =
              (day.revenueUsdCents || 0) / 100 + (day.revenuePhpCentavos || 0) / 100 / 56;
            const hasTraffic =
              day.visits > 0 || day.bouquetsSealed > 0 || day.recipientUnwraps > 0;
            const hasRevenue = dayUsd > 0 || day.passUnlocks > 0;

            return (
              <button
                key={day.date}
                type="button"
                onClick={() => setSelectedDate(day.date)}
                onMouseEnter={() => setSelectedDate(day.date)}
                aria-label={`Inspect ${day.date}`}
                className={`flex-1 flex flex-col items-center gap-1.5 h-full justify-end rounded-md px-0.5 py-1 transition-colors cursor-pointer ${
                  isSelected
                    ? isDarkMode
                      ? 'bg-[#2B2321]/70'
                      : 'bg-[#FAF4EE]'
                    : 'hover:bg-current/5'
                }`}
              >
                <div className="w-full flex items-end justify-center gap-[2px] h-28">
                  {chartMode === 'traffic' ? (
                    hasTraffic ? (
                      <>
                        <div
                          style={{
                            height: `${Math.max(
                              Math.round((day.visits / maxDailyTraffic) * 100),
                              day.visits > 0 ? 8 : 2
                            )}%`,
                          }}
                          className="w-1.5 rounded-t-[2px] bg-[#C88A70]/80"
                        />
                        <div
                          style={{
                            height: `${Math.max(
                              Math.round((day.bouquetsSealed / maxDailyTraffic) * 100),
                              day.bouquetsSealed > 0 ? 8 : 2
                            )}%`,
                            backgroundColor: accentFill,
                          }}
                          className="w-1.5 rounded-t-[2px]"
                        />
                        <div
                          style={{
                            height: `${Math.max(
                              Math.round((day.recipientUnwraps / maxDailyTraffic) * 100),
                              day.recipientUnwraps > 0 ? 8 : 2
                            )}%`,
                            backgroundColor: sageColor,
                          }}
                          className="w-1.5 rounded-t-[2px]"
                        />
                      </>
                    ) : (
                      <div className="w-full h-[2px] bg-current opacity-15" />
                    )
                  ) : hasRevenue ? (
                    <>
                      <div
                        style={{
                          height: `${Math.max(
                            Math.round((dayUsd / maxDailyUsd) * 100),
                            dayUsd > 0 ? 12 : 2
                          )}%`,
                          backgroundColor: accentFill,
                        }}
                        className="w-2 rounded-t-[2px]"
                      />
                      <div
                        style={{
                          height: `${Math.max(
                            Math.min(100, day.passUnlocks * 18),
                            day.passUnlocks > 0 ? 10 : 2
                          )}%`,
                          backgroundColor: sageColor,
                        }}
                        className="w-1.5 rounded-t-[2px]"
                      />
                    </>
                  ) : (
                    <div className="w-full h-[2px] bg-current opacity-15" />
                  )}
                </div>
                <span className="text-[10px] opacity-55 font-mono tabular-nums">
                  {day.date.slice(8)}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Conversion Funnel + Tier Mix & Geography */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Funnel Drop-off Waterfall */}
        <section className={`lg:col-span-7 rounded-xl border p-5 ${panelClass}`}>
          <div className="flex items-baseline justify-between mb-4">
            <h2
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
              className="text-xl font-medium"
            >
              Conversion Funnel
            </h2>
            <span className="text-xs opacity-60 tabular-nums">
              Viral recipient → studio: {metrics.viralLoopPct}%
            </span>
          </div>

          <div className={`divide-y ${hairlineDivide}`}>
            {metrics.funnelSteps.map((step, idx) => {
              const widthPct = step.exceedsBaseline
                ? 100
                : metrics.funnelSteps[0].count > 0
                ? Math.max(
                    step.count > 0 ? 4 : 0,
                    Math.min(100, Math.round((step.count / metrics.funnelSteps[0].count) * 100))
                  )
                : step.count > 0
                ? 100
                : 0;
              return (
                <div key={step.id} className="py-2.5 flex items-center gap-3">
                  <div className="w-32 shrink-0">
                    <div className="text-xs font-medium">{step.label}</div>
                    <div className="text-[11px] opacity-55 tabular-nums">
                      {idx === 0
                        ? 'Baseline'
                        : step.exceedsBaseline
                        ? 'All-time cumulative'
                        : `${step.stepConversionPct}% step conv.`}
                    </div>
                  </div>
                  <div className="flex-1 h-2 rounded-sm bg-current/10 overflow-hidden">
                    <div
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: idx === 5 ? sageColor : accentFill,
                      }}
                      className="h-full transition-all"
                    />
                  </div>
                  <div className="w-24 text-right font-mono text-xs tabular-nums">
                    <span className="font-medium">{step.count.toLocaleString()}</span>
                    {!step.exceedsBaseline && (
                      <span className="opacity-50 ml-1">({step.pctOfVisits}%)</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Tier Mix, Payment Channels & Audience Geography */}
        <section className={`lg:col-span-5 rounded-xl border p-5 flex flex-col justify-between gap-5 ${panelClass}`}>
          <div>
            <h2
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
              className="text-xl font-medium mb-3"
            >
              Tier Mix & Paywall Hooks
            </h2>
            <div className={`divide-y ${hairlineDivide}`}>
              {metrics.tierMix.map((t) => (
                <div key={t.tier} className="py-2 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-medium">{t.label}</span>
                    <span className="opacity-55 ml-2">{t.priceRangeLabel}</span>
                  </div>
                  <div className="font-mono tabular-nums">
                    <span>{t.count}</span>
                    <span className="opacity-55 ml-1.5">({t.sharePct}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`pt-4 border-t ${hairlineBorder} space-y-2.5`}>
            <div className="flex items-center justify-between text-xs">
              <span className="opacity-65">Audience Region Split</span>
              <span className="font-mono tabular-nums">
                PH {metrics.phAudienceSharePct}% · INTL {metrics.intlAudienceSharePct}%
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="opacity-65">Devices (M / D / T)</span>
              <span className="font-mono tabular-nums">
                {analytics.devices.mobile} · {analytics.devices.desktop} · {analytics.devices.tablet}
              </span>
            </div>
            {channelBreakdown.length > 0 && (
              <div className="pt-2 space-y-1">
                <div className="text-[11px] uppercase tracking-[0.06em] opacity-55">
                  Revenue by Channel
                </div>
                {channelBreakdown.slice(0, 4).map(([ch, stats]) => (
                  <div key={ch} className="flex items-center justify-between text-xs tabular-nums">
                    <span className="opacity-80">{CHANNEL_NAMES[ch] || ch}</span>
                    <span className="font-mono opacity-75">
                      {stats.count} keys · ~${stats.estUsd.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {(topTriggers.length > 0 || topReferrers.length > 0) && (
              <div className="pt-2 space-y-1">
                <div className="text-[11px] uppercase tracking-[0.06em] opacity-55">
                  Top Triggers & Referrers
                </div>
                <div className="text-xs opacity-75 leading-relaxed">
                  {[
                    ...topTriggers.slice(0, 2).map(([k, v]) => `${formatLabel(k)} (${v})`),
                    ...topReferrers.slice(0, 2).map(([k, v]) => `${formatLabel(k)} (${v})`),
                  ].join(' · ')}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Buyer / Viral Growth Projection Sandbox (Explicitly separated from live actuals) */}
      <section
        data-testid="revenue-projection-sandbox"
        className={`rounded-xl border p-5 ${panelClass}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pb-4 border-b border-current/10">
          <div>
            <h2
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
              className="text-xl font-medium"
            >
              Scale & Revenue Simulator
            </h2>
            <p className="text-xs opacity-65 mt-0.5">
              Projection Sandbox using live PH (₱49 / ₱99 / ₱199) & INTL ($2.99 / $4.99 / $8.99) pricing — separate from recorded revenue.
            </p>
          </div>
          <div className="flex gap-2">
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
                className={`px-2.5 py-1 rounded-md border text-[11px] font-medium transition-colors cursor-pointer ${hairlineBorder} hover:bg-current/5`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 items-center">
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="opacity-75">Daily Visitors</span>
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
                <span className="opacity-75">Paywall → Paid Conv.</span>
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
                <span className="opacity-75">Studio Open Rate</span>
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
                <span className="opacity-75">PH Buyer Share (PPP)</span>
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
                <span className="opacity-75">Couture Upgrade Intent (Studio → Paywall)</span>
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

          <div className={`lg:col-span-5 rounded-lg border ${hairlineBorder} overflow-hidden`}>
            <div className={`grid grid-cols-2 gap-px ${gridHairlineBg}`}>
              <div className={`p-3.5 ${cellBgClass}`}>
                <div className="text-[11px] uppercase tracking-[0.06em] opacity-60">
                  Proj. Monthly Net
                </div>
                <div
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  className="text-2xl font-medium mt-1 tabular-nums"
                  data-testid="sim-monthly-net-usd"
                >
                  ${projection.monthlyCombinedNetUsd.toLocaleString()}
                </div>
                <div className="text-[11px] opacity-60 mt-0.5 tabular-nums">
                  ~₱{Math.round(projection.monthlyCombinedNetPhp).toLocaleString()}
                </div>
              </div>

              <div className={`p-3.5 ${cellBgClass}`}>
                <div className="text-[11px] uppercase tracking-[0.06em] opacity-60">
                  Annual Run Rate
                </div>
                <div
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  className="text-2xl font-medium mt-1 tabular-nums"
                >
                  ${projection.annualNetUsd.toLocaleString()}
                </div>
                <div className="text-[11px] opacity-60 mt-0.5 tabular-nums">
                  Est. net after fees
                </div>
              </div>

              <div className={`p-3.5 ${cellBgClass}`}>
                <div className="text-[11px] uppercase tracking-[0.06em] opacity-60">
                  Monthly Orders
                </div>
                <div
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  className="text-2xl font-medium mt-1 tabular-nums"
                >
                  {projection.monthlyPaidOrders.toLocaleString()}
                </div>
                <div className="text-[11px] opacity-60 mt-0.5 tabular-nums">
                  {projection.phOrders} PH · {projection.intlOrders} INTL
                </div>
              </div>

              <div className={`p-3.5 ${cellBgClass}`}>
                <div className="text-[11px] uppercase tracking-[0.06em] opacity-60">
                  Blended AOV
                </div>
                <div
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  className="text-2xl font-medium mt-1 tabular-nums"
                >
                  ${projection.blendedOrderUsd.toFixed(2)}
                </div>
                <div className="text-[11px] opacity-60 mt-0.5 tabular-nums">
                  30% 1x · 50% 7d · 20% 30d
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
