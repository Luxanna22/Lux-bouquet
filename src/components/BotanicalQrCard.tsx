import React, { useMemo, useRef, useState } from 'react';
import { Check, Download } from 'lucide-react';
import {
  computeBotanicalQrMatrix,
  downloadBotanicalQrSvgAsPng,
  QR_STYLE_CATALOG,
  QR_THEME_CATALOG,
  QrModuleStyle,
  QrThemeId,
} from '../lib/qrKeepsake';

interface BotanicalQrCardProps {
  url: string;
  recipientName?: string;
  isDarkMode: boolean;
  onToast: (msg: string) => void;
}

export const BotanicalQrCard: React.FC<BotanicalQrCardProps> = ({
  url,
  recipientName,
  isDarkMode,
  onToast,
}) => {
  const [themeId, setThemeId] = useState<QrThemeId>(() =>
    isDarkMode ? 'midnight' : 'espresso'
  );
  const [moduleStyle, setModuleStyle] = useState<QrModuleStyle>('dots');
  const [isDownloading, setIsDownloading] = useState(false);
  const [justDownloaded, setJustDownloaded] = useState(false);

  const svgRef = useRef<SVGSVGElement | null>(null);

  const theme = useMemo(
    () => QR_THEME_CATALOG.find((t) => t.id === themeId) || QR_THEME_CATALOG[0],
    [themeId]
  );

  const qrMatrix = useMemo(() => computeBotanicalQrMatrix(url), [url]);

  const handleDownloadQrPng = async () => {
    if (!svgRef.current || isDownloading) return;
    setIsDownloading(true);
    try {
      const safeRecipient = (recipientName || 'keepsake')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      await downloadBotanicalQrSvgAsPng(
        svgRef.current,
        `bouquet-qr-${safeRecipient || 'gift'}.png`,
        1024
      );
      setJustDownloaded(true);
      onToast('QR image saved!');
      setTimeout(() => setJustDownloaded(false), 2000);
    } catch {
      onToast('Could not save QR image');
    } finally {
      setIsDownloading(false);
    }
  };

  // Layout geometry inside 280x280 SVG viewBox
  const qrPadding = 32;
  const qrAreaSize = 280 - qrPadding * 2; // 216
  const cellSize = qrAreaSize / qrMatrix.size;

  // BrandLogoMark colors adapted for the active QR palette
  const logoOuterStroke = theme.isDark ? '#E5A3B7' : '#C87A90';
  const logoInnerStroke = theme.isDark ? '#E8B298' : '#C88A74';
  const logoOuterFill = theme.isDark ? 'rgba(244, 166, 190, 0.26)' : 'rgba(252, 228, 236, 0.85)';
  const logoInnerFill = theme.isDark ? 'rgba(247, 197, 168, 0.34)' : 'rgba(255, 240, 230, 0.94)';
  const logoLeafStroke = theme.isDark ? '#8AB89A' : '#6A9478';
  const logoLeafFill = theme.isDark ? 'rgba(134, 184, 152, 0.24)' : 'rgba(226, 242, 232, 0.72)';

  return (
    <div
      data-testid="botanical-qr-keepsake-section"
      className={`p-3 rounded-2xl border border-dashed space-y-2.5 ${
        isDarkMode
          ? 'bg-[#2B2321]/75 border-[#544540]'
          : 'bg-[#FAF4EE]/65 border-[#E2D1C1]'
      }`}
    >
      {/* Square Graphic QR Card Container with Top-Left Download Icon */}
      <div className="relative mx-auto w-[196px] h-[196px] sm:w-[212px] sm:h-[212px] select-none">
        {/* Top-Left Download Icon Button */}
        <button
          type="button"
          data-testid="download-qr-top-left-btn"
          onClick={handleDownloadQrPng}
          disabled={isDownloading}
          aria-label="Download QR code image"
          title="Save QR Image"
          className={`absolute -top-2 -left-2 z-10 w-7.5 h-7.5 rounded-full border border-dashed flex items-center justify-center shadow-xs transition active:scale-90 cursor-pointer ${
            justDownloaded
              ? 'bg-emerald-600 border-emerald-600 text-white'
              : theme.isDark
              ? 'bg-[#352C29] border-[#7A655D] text-[#E6B89C] hover:bg-[#463A36]'
              : 'bg-[#FFFDF9] border-[#C8B29E] text-[#6E4434] hover:bg-[#FAF3EB]'
          }`}
        >
          {justDownloaded ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Bespoke Botanical Lineart QR SVG */}
        <svg
          ref={svgRef}
          viewBox="0 0 280 280"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full rounded-2xl shadow-[0_8px_24px_rgba(35,28,24,0.08)]"
          role="img"
          aria-label="Custom botanical QR code for your bouquet gift link"
        >
          {/* Card Background */}
          <rect
            x="2"
            y="2"
            width="276"
            height="276"
            rx="24"
            fill={theme.cardBg}
            stroke={theme.borderHex}
            strokeWidth="1.5"
          />

          {/* Inner Stitched Stationery Frame */}
          <rect
            x="11"
            y="11"
            width="258"
            height="258"
            rx="18"
            fill="none"
            stroke={theme.borderHex}
            strokeWidth="1.15"
            strokeDasharray="4 3"
          />

          {/* Delicate Botanical Corner Sprig Flourishes */}
          <g stroke={theme.accentHex} strokeWidth="1" fill="none" opacity="0.55" strokeLinecap="round">
            <path d="M 18,27 C 18,20 20,18 27,18" />
            <path d="M 253,18 C 260,18 262,20 262,27" />
            <path d="M 18,253 C 18,260 20,262 27,262" />
            <path d="M 253,262 C 260,262 262,260 262,253" />
          </g>

          {/* 3 Custom Soft Lineart Finder Eyes (Top-Left, Top-Right, Bottom-Left) */}
          {qrMatrix.finderOrigins.map((origin, idx) => {
            const fx = qrPadding + origin.col * cellSize;
            const fy = qrPadding + origin.row * cellSize;
            const outerSpan = 7 * cellSize;
            const innerOffset = 2 * cellSize;
            const innerSpan = 3 * cellSize;
            const centerCx = fx + 3.5 * cellSize;
            const centerCy = fy + 3.5 * cellSize;

            return (
              <g key={`finder-${idx}`}>
                {/* Outer Soft Rounded Frame */}
                <rect
                  x={fx + cellSize * 0.35}
                  y={fy + cellSize * 0.35}
                  width={outerSpan - cellSize * 0.7}
                  height={outerSpan - cellSize * 0.7}
                  rx={cellSize * 2.15}
                  fill="none"
                  stroke={theme.eyeOuterHex}
                  strokeWidth={cellSize * 0.88}
                />
                {/* Subtle Dashed Halo Ring Inside Finder */}
                <rect
                  x={fx + cellSize * 1.25}
                  y={fy + cellSize * 1.25}
                  width={outerSpan - cellSize * 2.5}
                  height={outerSpan - cellSize * 2.5}
                  rx={cellSize * 1.4}
                  fill="none"
                  stroke={theme.accentHex}
                  strokeWidth={cellSize * 0.18}
                  strokeDasharray={`${cellSize * 0.45} ${cellSize * 0.35}`}
                  opacity="0.55"
                />
                {/* Inner Botanical Core */}
                {moduleStyle === 'diamonds' ? (
                  <g transform={`translate(${centerCx}, ${centerCy})`}>
                    <rect
                      x={-innerSpan * 0.42}
                      y={-innerSpan * 0.42}
                      width={innerSpan * 0.84}
                      height={innerSpan * 0.84}
                      rx={cellSize * 0.65}
                      transform="rotate(45)"
                      fill={theme.eyeInnerHex}
                    />
                    <circle r={cellSize * 0.38} fill={theme.cardBg} />
                  </g>
                ) : (
                  <rect
                    x={fx + innerOffset}
                    y={fy + innerOffset}
                    width={innerSpan}
                    height={innerSpan}
                    rx={moduleStyle === 'dots' ? innerSpan / 2 : cellSize * 0.95}
                    fill={theme.eyeInnerHex}
                  />
                )}
              </g>
            );
          })}

          {/* QR Data Modules (Soft Dots, Petals/Diamonds, or Rounded Lineart) */}
          <g fill={theme.inkHex}>
            {qrMatrix.cells.map((cell) => {
              const cx = qrPadding + (cell.col + 0.5) * cellSize;
              const cy = qrPadding + (cell.row + 0.5) * cellSize;

              if (moduleStyle === 'dots') {
                return (
                  <circle
                    key={`${cell.row}-${cell.col}`}
                    cx={cx}
                    cy={cy}
                    r={cellSize * 0.43}
                  />
                );
              }

              if (moduleStyle === 'diamonds') {
                const r = cellSize * 0.52;
                return (
                  <path
                    key={`${cell.row}-${cell.col}`}
                    d={`M ${cx},${cy - r} Q ${cx + r * 0.28},${cy - r * 0.28} ${cx + r},${cy} Q ${cx + r * 0.28},${cy + r * 0.28} ${cx},${cy + r} Q ${cx - r * 0.28},${cy + r * 0.28} ${cx - r},${cy} Q ${cx - r * 0.28},${cy - r * 0.28} ${cx},${cy - r} Z`}
                  />
                );
              }

              const pad = cellSize * 0.08;
              const span = cellSize - pad * 2;
              return (
                <rect
                  key={`${cell.row}-${cell.col}`}
                  x={qrPadding + cell.col * cellSize + pad}
                  y={qrPadding + cell.row * cellSize + pad}
                  width={span}
                  height={span}
                  rx={cellSize * 0.32}
                />
              );
            })}
          </g>

          {/* Center Medallion with Official Send A Bouquet Flower Logo */}
          <g transform="translate(140, 140)">
            {/* Medallion Halo & Dashed Ring */}
            <circle
              cx="0"
              cy="0"
              r="26"
              fill={theme.cardBg}
              stroke={theme.borderHex}
              strokeWidth="1.2"
            />
            <circle
              cx="0"
              cy="0"
              r="22.5"
              fill="none"
              stroke={theme.accentHex}
              strokeWidth="1"
              strokeDasharray="3 2.2"
            />

            {/* Embedded BrandLogoMark Rosette */}
            <g transform="scale(0.66) translate(-32, -32)">
              <path
                d="M 18,35 C 9,30 6,22 13,19 C 19,17 23,24 24,31"
                fill={logoLeafFill}
                stroke={logoLeafStroke}
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M 46,35 C 55,30 58,22 51,19 C 45,17 41,24 40,31"
                fill={logoLeafFill}
                stroke={logoLeafStroke}
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <g transform="translate(32, 32)">
                {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                  <g key={`qr-logo-outer-${angle}`} transform={`rotate(${angle})`}>
                    <path
                      d="M 0,0 C -8.5,-7.5 -11.5,-21.5 0,-26.5 C 11.5,-21.5 8.5,-7.5 0,0 Z"
                      fill={logoOuterFill}
                      stroke={logoOuterStroke}
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M 0,-5 L 0,-20"
                      stroke={logoOuterStroke}
                      strokeWidth="0.9"
                      strokeLinecap="round"
                      strokeOpacity="0.5"
                    />
                  </g>
                ))}
                {[22.5, 112.5, 202.5, 292.5].map((angle) => (
                  <g key={`qr-logo-inner-${angle}`} transform={`rotate(${angle})`}>
                    <path
                      d="M 0,0 C -6,-5 -8,-14.5 0,-17.5 C 8,-14.5 6,-5 0,0 Z"
                      fill={logoInnerFill}
                      stroke={logoInnerStroke}
                      strokeWidth="1.35"
                      strokeLinejoin="round"
                    />
                  </g>
                ))}
                <circle
                  cx="0"
                  cy="0"
                  r="4.5"
                  fill={theme.isDark ? '#FDE68A' : '#FEF3C7'}
                  stroke={theme.isDark ? '#F59E0B' : '#D97706'}
                  strokeWidth="1.35"
                />
                <circle
                  cx="0"
                  cy="0"
                  r="1.7"
                  fill={theme.isDark ? '#F59E0B' : '#D97706'}
                />
              </g>
            </g>
          </g>
        </svg>
      </div>

      {/* Compact QR Customization Controls (Color Swatches + Soft Module Style Pills) */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
        {/* 4 Botanical Color Swatches */}
        <div className="flex items-center gap-1.5" aria-label="QR color theme">
          {QR_THEME_CATALOG.map((t) => {
            const active = t.id === themeId;
            return (
              <button
                key={t.id}
                type="button"
                data-testid={`qr-theme-${t.id}`}
                onClick={() => setThemeId(t.id)}
                title={t.label}
                aria-label={`QR color ${t.label}`}
                aria-pressed={active}
                className={`w-5.5 h-5.5 rounded-full border transition cursor-pointer flex items-center justify-center ${
                  active
                    ? 'scale-110 ring-2 ring-[#B4846C] border-white dark:border-[#231C18]'
                    : 'opacity-75 hover:opacity-100 border-[#DECBB9]'
                }`}
                style={{ backgroundColor: t.swatchHex }}
              />
            );
          })}
        </div>

        {/* 3 Pattern Style Pills */}
        <div
          className={`inline-flex items-center p-0.5 rounded-full border border-dashed text-[10.5px] font-medium ${
            isDarkMode
              ? 'bg-[#352C29] border-[#5E4E49]'
              : 'bg-[#FFFDF9] border-[#DECBB9]'
          }`}
        >
          {QR_STYLE_CATALOG.map((st) => {
            const active = st.id === moduleStyle;
            return (
              <button
                key={st.id}
                type="button"
                data-testid={`qr-style-${st.id}`}
                onClick={() => setModuleStyle(st.id)}
                className={`px-2 py-0.5 rounded-full transition cursor-pointer ${
                  active
                    ? isDarkMode
                      ? 'bg-[#E6B89C] text-[#231C18]'
                      : 'bg-[#6E4434] text-[#FFFDF9]'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                {st.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
