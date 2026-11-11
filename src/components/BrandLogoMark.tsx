import React, { useId } from 'react';

interface BrandLogoMarkProps {
  className?: string;
  isDarkMode?: boolean;
  /**
   * 'mark' (default) or 'crest': renders the full-scale central botanical blossom without side leaves or antennae so the flower is bold and legible at any size.
   */
  variant?: 'mark' | 'crest';
}

/**
 * Official "Send A Bouquet" Hand-Drawn Botanical Lineart & Translucent Watercolor Flower Logo.
 * Pure inline SVG (zero external image files) rendering:
 * - Three concentric rings of translucent blush, warm peach, and rose-pink veined petals
 * - Twelve radiating golden stamen filaments with pollen dots around a warm golden center
 */
export const BrandLogoMark: React.FC<BrandLogoMarkProps> = React.memo(
  ({ className = 'w-8 h-8', isDarkMode = false }) => {
    const uid = useId().replace(/:/g, '');
    const blushGradId = `brand-blush-${uid}`;
    const peachGradId = `brand-peach-${uid}`;
    const goldGradId = `brand-gold-${uid}`;

    return (
      <svg
        viewBox="128 38 264 264"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 select-none overflow-visible ${className}`}
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={blushGradId} cx="50%" cy="35%" r="65%">
            <stop
              offset="0%"
              stopColor={isDarkMode ? '#F4A6BE' : '#FCE4EC'}
              stopOpacity={isDarkMode ? '0.52' : '0.88'}
            />
            <stop
              offset="58%"
              stopColor={isDarkMode ? '#D9829B' : '#F8BBD0'}
              stopOpacity={isDarkMode ? '0.34' : '0.58'}
            />
            <stop
              offset="100%"
              stopColor={isDarkMode ? '#8E4A5E' : '#F48FB1'}
              stopOpacity={isDarkMode ? '0.14' : '0.22'}
            />
          </radialGradient>

          <radialGradient id={peachGradId} cx="50%" cy="30%" r="65%">
            <stop
              offset="0%"
              stopColor={isDarkMode ? '#F7C5A8' : '#FFF0E6'}
              stopOpacity={isDarkMode ? '0.54' : '0.90'}
            />
            <stop
              offset="62%"
              stopColor={isDarkMode ? '#E09878' : '#FCD5CE'}
              stopOpacity={isDarkMode ? '0.34' : '0.60'}
            />
            <stop
              offset="100%"
              stopColor={isDarkMode ? '#9A5B42' : '#F9B4AB'}
              stopOpacity={isDarkMode ? '0.14' : '0.22'}
            />
          </radialGradient>

          <radialGradient id={goldGradId} cx="50%" cy="50%" r="55%">
            <stop
              offset="0%"
              stopColor="#FDE68A"
              stopOpacity={isDarkMode ? '0.65' : '0.92'}
            />
            <stop
              offset="65%"
              stopColor="#F59E0B"
              stopOpacity={isDarkMode ? '0.28' : '0.38'}
            />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. Outer Ring of 8 Blush Petals with Delicate Botanical Veins */}
        <g transform="translate(260, 170)">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
            <g key={`outer-${angle}`} transform={`rotate(${angle})`}>
              <path
                d="M 0,0 C -38,-34 -52,-98 0,-126 C 52,-98 38,-34 0,0 Z"
                fill={`url(#${blushGradId})`}
                stroke={isDarkMode ? '#E5A3B7' : '#CD7E95'}
                strokeWidth="2.4"
                strokeOpacity={isDarkMode ? '0.80' : '0.88'}
              />
              <path
                d="M 0,-14 Q -12,-62 -6,-106 M 0,-18 Q 12,-62 6,-106 M 0,-10 L 0,-114"
                fill="none"
                stroke={isDarkMode ? '#DF9BB0' : '#C67B91'}
                strokeWidth="1.35"
                strokeLinecap="round"
                strokeOpacity={isDarkMode ? '0.52' : '0.58'}
              />
            </g>
          ))}
        </g>

        {/* 2. Middle Ring of 8 Warm Peach-Blush Cupped Petals */}
        <g transform="translate(260, 170)">
          {[22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((angle) => (
            <g key={`mid-${angle}`} transform={`rotate(${angle})`}>
              <path
                d="M 0,0 C -28,-26 -38,-74 0,-94 C 38,-74 28,-26 0,0 Z"
                fill={`url(#${peachGradId})`}
                stroke={isDarkMode ? '#E8B298' : '#C88A74'}
                strokeWidth="2.2"
                strokeOpacity={isDarkMode ? '0.82' : '0.88'}
              />
              <path
                d="M 0,-12 Q -8,-48 -3,-78 M 0,-12 Q 8,-48 3,-78"
                fill="none"
                stroke={isDarkMode ? '#E2A88B' : '#B87B65'}
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeOpacity="0.54"
              />
            </g>
          ))}
        </g>

        {/* 3. Inner Corolla of 6 Rose Petals & 12 Golden Botanical Stamens */}
        <g transform="translate(260, 170)">
          {[0, 60, 120, 180, 240, 300].map((angle) => (
            <path
              key={`inner-${angle}`}
              transform={`rotate(${angle})`}
              d="M 0,0 C -18,-16 -22,-46 0,-58 C 22,-46 18,-16 0,0 Z"
              fill={`url(#${blushGradId})`}
              stroke={isDarkMode ? '#F0B6C8' : '#C4748B'}
              strokeWidth="2.1"
              strokeOpacity="0.86"
            />
          ))}

          <circle cx="0" cy="0" r="24" fill={`url(#${goldGradId})`} />

          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
            <g key={`stamen-${deg}`} transform={`rotate(${deg})`}>
              <line
                x1="0"
                y1="-4"
                x2="0"
                y2="-20"
                stroke={isDarkMode ? '#FCD34D' : '#D97706'}
                strokeWidth="1.8"
                strokeOpacity="0.80"
                strokeLinecap="round"
              />
              <circle
                cx="0"
                cy="-21.5"
                r="2.6"
                fill={isDarkMode ? '#FDE68A' : '#F59E0B'}
                fillOpacity="0.90"
              />
            </g>
          ))}

          <circle
            cx="0"
            cy="0"
            r="7.8"
            fill={isDarkMode ? '#FDE68A' : '#FEF3C7'}
            stroke={isDarkMode ? '#F59E0B' : '#D97706'}
            strokeWidth="2.0"
          />
        </g>
      </svg>
    );
  }
);
