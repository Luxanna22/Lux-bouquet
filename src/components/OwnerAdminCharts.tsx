import React, { useMemo } from 'react';
import { FunnelStepMetric, OwnerDailySeriesPoint } from '../lib/ownerAnalytics';

// ============================================================================
// SHARED SVG CURVE HELPERS
// ============================================================================

interface Point {
  x: number;
  y: number;
}

/**
 * Generates a smooth monotone-like cubic Bezier SVG path clamped within [minY, maxY]
 * so curves never overshoot below the chart baseline or above the plot ceiling.
 */
function buildSmoothPath(points: Point[], minY: number, maxY: number): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  const clamp = (v: number) => Math.max(minY, Math.min(maxY, v));
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = clamp(p1.y + (p2.y - p0.y) / 6);
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = clamp(p2.y - (p3.y - p1.y) / 6);

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return d;
}

function buildAreaPath(points: Point[], baselineY: number, minY: number, maxY: number): string {
  if (points.length < 2) return '';
  const line = buildSmoothPath(points, minY, maxY);
  const last = points[points.length - 1];
  const first = points[0];
  return `${line} L ${last.x.toFixed(1)} ${baselineY.toFixed(1)} L ${first.x.toFixed(1)} ${baselineY.toFixed(1)} Z`;
}

function formatShortDate(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate.slice(-2);
  const monthIdx = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (!Number.isFinite(monthIdx) || monthIdx < 0 || monthIdx > 11 || !Number.isFinite(day)) {
    return isoDate.slice(-5);
  }
  return `${months[monthIdx]} ${day}`;
}

function formatCompactTick(value: number, isCurrency = false): string {
  if (isCurrency) {
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
    if (value >= 10) return `$${Math.round(value)}`;
    if (value > 0) return `$${value.toFixed(1)}`;
    return '$0';
  }
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(Math.round(value));
}

// ============================================================================
// 1. MINI SPARKLINE (64x22 SVG for Hero KPI Cards)
// ============================================================================

export interface MiniSparklineProps {
  values: number[];
  color: string;
  id: string;
  width?: number;
  height?: number;
  className?: string;
}

export const MiniSparkline: React.FC<MiniSparklineProps> = ({
  values,
  color,
  id,
  width = 64,
  height = 22,
  className = '',
}) => {
  const padX = 2;
  const padY = 3;
  const maxVal = Math.max(0, ...values);

  if (values.length < 2 || maxVal <= 0) {
    const midY = height - 4;
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={`shrink-0 overflow-visible ${className}`}
        aria-hidden="true"
      >
        <line
          x1={padX}
          y1={midY}
          x2={width - padX}
          y2={midY}
          stroke={color}
          strokeOpacity="0.28"
          strokeWidth="1.25"
          strokeDasharray="2 2.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  const plotW = width - padX * 2;
  const plotH = height - padY * 2;
  const stepX = plotW / (values.length - 1);

  const pts: Point[] = values.map((v, i) => ({
    x: padX + i * stepX,
    y: padY + plotH - (Math.max(0, v) / maxVal) * plotH,
  }));

  const linePath = buildSmoothPath(pts, padY, height - padY);
  const areaPath = buildAreaPath(pts, height - padY, padY, height - padY);
  const lastPt = pts[pts.length - 1];
  const gradId = `spark-grad-${id}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`shrink-0 overflow-visible ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.24" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastPt.x} cy={lastPt.y} r="2.2" fill={color} />
    </svg>
  );
};

// ============================================================================
// 2. TRAJECTORY AREA CHART (Responsive 14-Day Smooth Area + Line Chart)
// ============================================================================

export interface TrajectoryAreaChartProps {
  data: OwnerDailySeriesPoint[];
  mode: 'traffic' | 'revenue';
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  isDarkMode: boolean;
  phpPerUsd?: number;
}

export const TrajectoryAreaChart: React.FC<TrajectoryAreaChartProps> = ({
  data,
  mode,
  selectedDate,
  onSelectDate,
  isDarkMode,
  phpPerUsd = 56,
}) => {
  const palette = useMemo(
    () => ({
      primary: isDarkMode ? '#E6B89C' : '#6E4434',
      terracotta: isDarkMode ? '#C9967B' : '#B4846C',
      sage: isDarkMode ? '#8AB89A' : '#5E8568',
      grid: isDarkMode ? '#5E4E49' : '#DECBB9',
      ink: isDarkMode ? '#FBF6F1' : '#2A201D',
      muted: isDarkMode ? '#D8C7BE' : '#6E5D54',
      surface: isDarkMode ? '#352C29' : '#FFFDF9',
    }),
    [isDarkMode]
  );

  const svgW = 720;
  const svgH = 216;
  const padL = 44;
  const padR = 16;
  const padT = 16;
  const padB = 30;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;
  const baselineY = padT + plotH;

  const computed = useMemo(() => {
    const count = data.length;
    if (count === 0) {
      return null;
    }

    const dailyUsd = data.map(
      (d) => (d.revenueUsdCents || 0) / 100 + (d.revenuePhpCentavos || 0) / 100 / phpPerUsd
    );

    const maxPrimary =
      mode === 'traffic'
        ? Math.max(
            4,
            ...data.map((d) => Math.max(d.visits, d.bouquetsSealed, d.recipientUnwraps))
          )
        : Math.max(5, ...dailyUsd);

    const maxUnlocks = Math.max(2, ...data.map((d) => d.passUnlocks || 0));

    const xFor = (i: number) =>
      count === 1 ? padL + plotW / 2 : padL + (i / (count - 1)) * plotW;

    const yForPrimary = (v: number) => baselineY - (Math.max(0, v) / maxPrimary) * plotH;
    const yForUnlocks = (v: number) => baselineY - (Math.max(0, v) / maxUnlocks) * (plotH * 0.85);

    const visitsPts: Point[] = data.map((d, i) => ({ x: xFor(i), y: yForPrimary(d.visits) }));
    const sealedPts: Point[] = data.map((d, i) => ({ x: xFor(i), y: yForPrimary(d.bouquetsSealed) }));
    const unwrapsPts: Point[] = data.map((d, i) => ({
      x: xFor(i),
      y: yForPrimary(d.recipientUnwraps),
    }));

    const revenuePts: Point[] = dailyUsd.map((usd, i) => ({ x: xFor(i), y: yForPrimary(usd) }));
    const unlocksPts: Point[] = data.map((d, i) => ({
      x: xFor(i),
      y: yForUnlocks(d.passUnlocks),
    }));

    const yTicks = [0, 0.333, 0.666, 1].map((ratio) => ({
      y: baselineY - ratio * plotH,
      label: formatCompactTick(maxPrimary * ratio, mode === 'revenue'),
    }));

    const activeIdx = Math.max(
      0,
      selectedDate ? data.findIndex((d) => d.date === selectedDate) : count - 1
    );

    return {
      count,
      xFor,
      visitsPts,
      sealedPts,
      unwrapsPts,
      revenuePts,
      unlocksPts,
      yTicks,
      activeIdx: activeIdx === -1 ? count - 1 : activeIdx,
      colWidth: count > 1 ? plotW / (count - 1) : plotW,
    };
  }, [data, mode, phpPerUsd, selectedDate, baselineY, plotH, plotW]);

  if (!computed) {
    return (
      <div className="h-44 flex items-center justify-center text-xs opacity-60">
        No daily telemetry recorded yet.
      </div>
    );
  }

  const { activeIdx } = computed;
  const activeX = computed.xFor(activeIdx);

  return (
    <div className="space-y-3">
      {/* Compact Legend */}
      <div className="flex flex-wrap items-center gap-4 text-[11px]">
        {mode === 'traffic' ? (
          <>
            <span className="inline-flex items-center gap-2 opacity-85">
              <span
                className="w-3.5 h-[2px] rounded-full inline-block"
                style={{ backgroundColor: palette.terracotta }}
              />
              Visits
            </span>
            <span className="inline-flex items-center gap-2 opacity-85">
              <span
                className="w-3.5 h-[2px] rounded-full inline-block"
                style={{ backgroundColor: palette.primary }}
              />
              Sealed
            </span>
            <span className="inline-flex items-center gap-2 opacity-85">
              <span
                className="w-3.5 h-[2px] rounded-full inline-block"
                style={{ backgroundColor: palette.sage }}
              />
              Unwraps
            </span>
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-2 opacity-85">
              <span
                className="w-3.5 h-[2px] rounded-full inline-block"
                style={{ backgroundColor: palette.primary }}
              />
              Gross USD Equiv.
            </span>
            <span className="inline-flex items-center gap-2 opacity-85">
              <span
                className="w-3.5 h-[2px] rounded-full inline-block border-b border-dashed"
                style={{ borderColor: palette.sage }}
              />
              Pass Unlocks
            </span>
          </>
        )}
      </div>

      {/* Responsive SVG Plot */}
      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="w-full h-auto block select-none"
          role="img"
          aria-label={
            mode === 'traffic'
              ? '14-day traffic, sealed bouquets, and recipient unwraps chart'
              : '14-day gross revenue and pass unlocks chart'
          }
        >
          <defs>
            <linearGradient id="traj-primary-fill" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={mode === 'traffic' ? palette.terracotta : palette.primary}
                stopOpacity={isDarkMode ? '0.26' : '0.2'}
              />
              <stop
                offset="100%"
                stopColor={mode === 'traffic' ? palette.terracotta : palette.primary}
                stopOpacity="0.01"
              />
            </linearGradient>
            <linearGradient id="traj-secondary-fill" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={palette.primary}
                stopOpacity={isDarkMode ? '0.16' : '0.12'}
              />
              <stop offset="100%" stopColor={palette.primary} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Horizontal Dashed Gridlines + Y-axis labels */}
          {computed.yTicks.map((tick, idx) => (
            <g key={idx}>
              <line
                x1={padL}
                y1={tick.y}
                x2={svgW - padR}
                y2={tick.y}
                stroke={palette.grid}
                strokeOpacity={idx === 0 ? '0.85' : '0.45'}
                strokeWidth="1"
                strokeDasharray={idx === 0 ? undefined : '3 4'}
              />
              <text
                x={padL - 8}
                y={tick.y + 3.5}
                textAnchor="end"
                fontSize="10"
                fill={palette.muted}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {tick.label}
              </text>
            </g>
          ))}

          {/* Curves & Area Fills */}
          {mode === 'traffic' ? (
            <>
              <path
                d={buildAreaPath(computed.visitsPts, baselineY, padT, baselineY)}
                fill="url(#traj-primary-fill)"
              />
              <path
                d={buildAreaPath(computed.sealedPts, baselineY, padT, baselineY)}
                fill="url(#traj-secondary-fill)"
              />
              <path
                d={buildSmoothPath(computed.visitsPts, padT, baselineY)}
                fill="none"
                stroke={palette.terracotta}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={buildSmoothPath(computed.sealedPts, padT, baselineY)}
                fill="none"
                stroke={palette.primary}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={buildSmoothPath(computed.unwrapsPts, padT, baselineY)}
                fill="none"
                stroke={palette.sage}
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          ) : (
            <>
              <path
                d={buildAreaPath(computed.revenuePts, baselineY, padT, baselineY)}
                fill="url(#traj-primary-fill)"
              />
              <path
                d={buildSmoothPath(computed.revenuePts, padT, baselineY)}
                fill="none"
                stroke={palette.primary}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={buildSmoothPath(computed.unlocksPts, padT, baselineY)}
                fill="none"
                stroke={palette.sage}
                strokeWidth="1.75"
                strokeDasharray="4 3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

          {/* Active Day Vertical Crosshair */}
          <line
            x1={activeX}
            y1={padT - 2}
            x2={activeX}
            y2={baselineY}
            stroke={palette.primary}
            strokeOpacity="0.45"
            strokeWidth="1"
            strokeDasharray="3 3"
          />

          {/* Active Day Dots */}
          {mode === 'traffic' ? (
            <>
              <circle
                cx={computed.visitsPts[activeIdx].x}
                cy={computed.visitsPts[activeIdx].y}
                r="4"
                fill={palette.surface}
                stroke={palette.terracotta}
                strokeWidth="2"
              />
              <circle
                cx={computed.sealedPts[activeIdx].x}
                cy={computed.sealedPts[activeIdx].y}
                r="4"
                fill={palette.surface}
                stroke={palette.primary}
                strokeWidth="2"
              />
              <circle
                cx={computed.unwrapsPts[activeIdx].x}
                cy={computed.unwrapsPts[activeIdx].y}
                r="3.5"
                fill={palette.surface}
                stroke={palette.sage}
                strokeWidth="2"
              />
            </>
          ) : (
            <>
              <circle
                cx={computed.revenuePts[activeIdx].x}
                cy={computed.revenuePts[activeIdx].y}
                r="4.2"
                fill={palette.surface}
                stroke={palette.primary}
                strokeWidth="2.2"
              />
              <circle
                cx={computed.unlocksPts[activeIdx].x}
                cy={computed.unlocksPts[activeIdx].y}
                r="3.5"
                fill={palette.surface}
                stroke={palette.sage}
                strokeWidth="2"
              />
            </>
          )}

          {/* X-Axis Date Labels (show every 2nd tick + last day for crisp readability) */}
          {data.map((day, idx) => {
            const isSelected = idx === activeIdx;
            const showLabel =
              idx === 0 ||
              idx === data.length - 1 ||
              idx % 2 === 0 ||
              isSelected;
            if (!showLabel) return null;
            return (
              <text
                key={`label-${day.date}`}
                x={computed.xFor(idx)}
                y={svgH - 8}
                textAnchor={
                  idx === 0 ? 'start' : idx === data.length - 1 ? 'end' : 'middle'
                }
                fontSize="10"
                fontWeight={isSelected ? '600' : '400'}
                fill={isSelected ? palette.ink : palette.muted}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {formatShortDate(day.date)}
              </text>
            );
          })}

          {/* Interactive Column Hit Targets */}
          {data.map((day, idx) => {
            const cx = computed.xFor(idx);
            const hitX = Math.max(padL, cx - computed.colWidth / 2);
            const hitW = Math.min(svgW - padR - hitX, computed.colWidth);
            return (
              <rect
                key={`hit-${day.date}`}
                x={hitX}
                y={padT}
                width={Math.max(12, hitW)}
                height={plotH + padB}
                fill="transparent"
                className="cursor-pointer outline-none"
                tabIndex={0}
                role="button"
                aria-label={`Inspect ${day.date}`}
                onMouseEnter={() => onSelectDate(day.date)}
                onFocus={() => onSelectDate(day.date)}
                onClick={() => onSelectDate(day.date)}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
};

// ============================================================================
// 3. FUNNEL BAR CHART (Visual Tapered Conversion Funnel)
// ============================================================================

export interface FunnelBarChartProps {
  steps: FunnelStepMetric[];
  isDarkMode: boolean;
}

export const FunnelBarChart: React.FC<FunnelBarChartProps> = ({ steps, isDarkMode }) => {
  const baselineCount = steps[0]?.count || 0;
  const trackBg = isDarkMode ? 'bg-[#2B2321]' : 'bg-[#FAF4EE]';
  const trackBorder = isDarkMode ? 'border-[#5E4E49]/55' : 'border-[#DECBB9]/80';

  const getStageColor = (idx: number, total: number) => {
    if (idx === total - 1) return isDarkMode ? '#8AB89A' : '#5E8568'; // Paid Passes (Sage)
    if (idx === 0) return isDarkMode ? '#C9967B' : '#B4846C'; // Visits (Terracotta)
    if (idx === 1 || idx === 2) return isDarkMode ? '#D9A88C' : '#8D5E4A';
    return isDarkMode ? '#E6B89C' : '#6E4434'; // Paywall / Checkout (Primary)
  };

  return (
    <div className="space-y-3">
      {steps.map((step, idx) => {
        const widthPct = step.exceedsBaseline
          ? 100
          : baselineCount > 0
          ? Math.max(
              step.count > 0 ? 5 : 0,
              Math.min(100, Math.round((step.count / baselineCount) * 100))
            )
          : step.count > 0
          ? 100
          : 0;

        const barColor = getStageColor(idx, steps.length);
        const stepNote =
          idx === 0
            ? 'Baseline'
            : step.exceedsBaseline
            ? 'Cumulative'
            : `${step.stepConversionPct}% from prev`;

        return (
          <div key={step.id} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <div className="flex items-baseline gap-2 min-w-0">
                <span className="font-medium truncate">{step.label}</span>
                <span className="text-[11px] opacity-55 tabular-nums shrink-0">{stepNote}</span>
              </div>
              <div className="font-mono text-xs tabular-nums shrink-0">
                <span className="font-medium">{step.count.toLocaleString()}</span>
                {!step.exceedsBaseline && (
                  <span className="opacity-55 ml-1.5">{step.pctOfVisits}%</span>
                )}
              </div>
            </div>

            <div
              className={`h-3 w-full rounded-full border border-dashed ${trackBg} ${trackBorder} p-[2px] flex items-center`}
            >
              <div
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: barColor,
                }}
                className="h-full rounded-full transition-all duration-300"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ============================================================================
// 4. DONUT BREAKDOWN CHART (SVG Ring + Center Numeral + Tidy Side Legend)
// ============================================================================

export interface DonutSegment {
  id: string;
  label: string;
  value: number;
  color: string;
  sublabel?: string;
}

export interface DonutBreakdownChartProps {
  segments: DonutSegment[];
  centerValue: string | number;
  centerLabel: string;
  isDarkMode: boolean;
  size?: number;
}

export const DonutBreakdownChart: React.FC<DonutBreakdownChartProps> = ({
  segments,
  centerValue,
  centerLabel,
  isDarkMode,
  size = 112,
}) => {
  const strokeWidth = 11;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, seg) => sum + Math.max(0, seg.value), 0);
  const emptyStroke = isDarkMode ? '#5E4E49' : '#DECBB9';

  const nonZeroCount = segments.filter((s) => s.value > 0).length;
  const gapPx = nonZeroCount > 1 ? 3 : 0;

  let cumulativeOffset = 0;
  const arcs = segments.map((seg) => {
    const val = Math.max(0, seg.value);
    const pct = total > 0 ? val / total : 0;
    const rawLen = pct * circumference;
    const drawLen = rawLen > gapPx ? rawLen - gapPx : rawLen;
    const offset = -cumulativeOffset;
    cumulativeOffset += rawLen;
    return {
      ...seg,
      pct: Math.round(pct * 100),
      drawLen,
      offset,
    };
  });

  return (
    <div className="flex items-center gap-4 sm:gap-5">
      {/* SVG Ring */}
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="block -rotate-90"
          role="img"
          aria-label={`${centerLabel}: ${centerValue}`}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={emptyStroke}
            strokeOpacity={total > 0 ? '0.28' : '0.65'}
            strokeWidth={strokeWidth}
            strokeDasharray={total > 0 ? undefined : '4 4'}
          />
          {total > 0 &&
            arcs.map((arc) =>
              arc.value > 0 ? (
                <circle
                  key={arc.id}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${arc.drawLen} ${circumference}`}
                  strokeDashoffset={arc.offset}
                  strokeLinecap="butt"
                />
              ) : null
            )}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
          <span
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            className="text-2xl font-medium leading-none tabular-nums"
          >
            {centerValue}
          </span>
          <span className="text-[10px] opacity-60 mt-1 leading-tight">{centerLabel}</span>
        </div>
      </div>

      {/* Tidy Side Legend */}
      <div className="flex-1 min-w-0 space-y-2">
        {arcs.map((arc) => (
          <div key={arc.id} className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: arc.color }}
              />
              <div className="min-w-0">
                <div className="font-medium truncate leading-tight">{arc.label}</div>
                {arc.sublabel && (
                  <div className="text-[10px] opacity-55 truncate leading-tight">
                    {arc.sublabel}
                  </div>
                )}
              </div>
            </div>
            <div className="font-mono text-xs tabular-nums shrink-0 text-right">
              <span className="font-medium">{arc.value.toLocaleString()}</span>
              <span className="opacity-55 ml-1.5">{arc.pct}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
