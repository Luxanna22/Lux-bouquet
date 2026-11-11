import React, { useId } from 'react';

interface BrandLogoMarkProps {
  className?: string;
  isDarkMode?: boolean;
  /**
   * 'mark' (default): balanced proportions for navbar icons, buttons, and compact badges.
   * 'crest': wide botanical crest showcasing the full sage leaves and arched dashed tendrils with buds.
   */
  variant?: 'mark' | 'crest';
}

/**
 * Official "Send A Bouquet" Hand-Drawn Botanical Lineart & Translucent Watercolor Logo.
 * Pure inline SVG (zero external image files) rendering:
 * - Two symmetrical sage botanical leaves with delicate veins
 * - Two arched dashed tendrils tipped with dainty blush oval buds
 * - Three concentric rings of translucent blush, warm peach, and rose-pink veined petals
 * - Twelve radiating golden stamen filaments with pollen dots around a warm golden center
 */
export const BrandLogoMark: React.FC<BrandLogoMarkProps> = React.memo(
  ({ className = 'w-8 h-8', isDarkMode = false, variant = 'mark' }) => {
    const uid = useId().replace(/:/g, '');
    const blushGradId = `brand-blush-${uid}`;
    const peachGradId = `brand-peach-${uid}`;
    const leafGradId = `brand-leaf-${uid}`;
    const goldGradId = `brand-gold-${uid}`;

    const isCrest = variant === 'crest';

    return (
      <svg
        viewBox={isCrest ? '26 28 468 284' : '42 32 436 276'}
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
              stopOpacity={isDarkMode ? '0.42' : '0.82'}
            />
            <stop
              offset="58%"
              stopColor={isDarkMode ? '#D9829B' : '#F8BBD0'}
              stopOpacity={isDarkMode ? '0.28' : '0.52'}
            />
            <stop
              offset="100%"
              stopColor={isDarkMode ? '#8E4A5E' : '#F48FB1'}
              stopOpacity={isDarkMode ? '0.10' : '0.16'}
            />
          </radialGradient>

          <radialGradient id={peachGradId} cx="50%" cy="30%" r="65%">
            <stop
              offset="0%"
              stopColor={isDarkMode ? '#F7C5A8' : '#FFF0E6'}
              stopOpacity={isDarkMode ? '0.44' : '0.84'}
            />
            <stop
              offset="62%"
              stopColor={isDarkMode ? '#E09878' : '#FCD5CE'}
              stopOpacity={isDarkMode ? '0.28' : '0.54'}
            />
            <stop
              offset="100%"
              stopColor={isDarkMode ? '#9A5B42' : '#F9B4AB'}
              stopOpacity={isDarkMode ? '0.10' : '0.16'}
            />
          </radialGradient>

          <radialGradient id={leafGradId} cx="50%" cy="50%" r="62%">
            <stop
              offset="0%"
              stopColor={isDarkMode ? '#86B898' : '#E2F2E8'}
              stopOpacity={isDarkMode ? '0.36' : '0.78'}
            />
            <stop
              offset="72%"
              stopColor={isDarkMode ? '#5E8E70' : '#C5E3D0'}
              stopOpacity={isDarkMode ? '0.22' : '0.44'}
            />
            <stop offset="100%" stopColor="#6B9B7C" stopOpacity="0.08" />
          </radialGradient>

          <radialGradient id={goldGradId} cx="50%" cy="50%" r="55%">
            <stop
              offset="0%"
              stopColor="#FDE68A"
              stopOpacity={isDarkMode ? '0.55' : '0.85'}
            />
            <stop
              offset="65%"
              stopColor="#F59E0B"
              stopOpacity={isDarkMode ? '0.22' : '0.32'}
            />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. Symmetrical Sage Botanical Leaves & Arched Dashed Tendrils with Buds */}
        <g transform="translate(260, 170)">
          {/* Left Sage Leaf & Veins */}
          <path
            d="M -55,10 C -115,-28 -175,-18 -212,18 C -170,48 -110,44 -55,10 Z"
            fill={`url(#${leafGradId})`}
            stroke={isDarkMode ? '#8AB89A' : '#7AA387'}
            strokeWidth="2.1"
            strokeOpacity={isDarkMode ? '0.72' : '0.78'}
          />
          <path
            d="M -60,10 Q -135,4 -198,17 M -115,7 L -138,-6 M -145,10 L -168,0 M -125,11 L -148,24"
            fill="none"
            stroke={isDarkMode ? '#8AB89A' : '#6A9478'}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeOpacity={isDarkMode ? '0.62' : '0.68'}
          />
          {/* Left Arched Dashed Tendril & Blush Bud */}
          <path
            d="M -75,-18 C -128,-58 -168,-54 -194,-32"
            fill="none"
            stroke={isDarkMode ? '#D8A48F' : '#C28C7A'}
            strokeWidth="1.8"
            strokeDasharray="4.5 4.5"
            strokeLinecap="round"
            strokeOpacity="0.72"
          />
          <path
            d="M -194,-32 C -210,-46 -222,-32 -206,-22 C -196,-16 -190,-24 -194,-32 Z"
            fill={`url(#${blushGradId})`}
            stroke={isDarkMode ? '#E49EB3' : '#C97A90'}
            strokeWidth="1.9"
          />

          {/* Right Sage Leaf & Veins */}
          <path
            d="M 55,10 C 115,-28 175,-18 212,18 C 170,48 110,44 55,10 Z"
            fill={`url(#${leafGradId})`}
            stroke={isDarkMode ? '#8AB89A' : '#7AA387'}
            strokeWidth="2.1"
            strokeOpacity={isDarkMode ? '0.72' : '0.78'}
          />
          <path
            d="M 60,10 Q 135,4 198,17 M 115,7 L 138,-6 M 145,10 L 168,0 M 125,11 L 148,24"
            fill="none"
            stroke={isDarkMode ? '#8AB89A' : '#6A9478'}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeOpacity={isDarkMode ? '0.62' : '0.68'}
          />
          {/* Right Arched Dashed Tendril & Blush Bud */}
          <path
            d="M 75,-18 C 128,-58 168,-54 194,-32"
            fill="none"
            stroke={isDarkMode ? '#D8A48F' : '#C28C7A'}
            strokeWidth="1.8"
            strokeDasharray="4.5 4.5"
            strokeLinecap="round"
            strokeOpacity="0.72"
          />
          <path
            d="M 194,-32 C 210,-46 222,-32 206,-22 C 196,-16 190,-24 194,-32 Z"
            fill={`url(#${blushGradId})`}
            stroke={isDarkMode ? '#E49EB3' : '#C97A90'}
            strokeWidth="1.9"
          />
        </g>

        {/* 2. Outer Ring of 8 Blush Petals with Delicate Botanical Veins */}
        <g transform="translate(260, 170)">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
            <g key={`outer-${angle}`} transform={`rotate(${angle})`}>
              <path
                d="M 0,0 C -38,-34 -52,-98 0,-126 C 52,-98 38,-34 0,0 Z"
                fill={`url(#${blushGradId})`}
                stroke={isDarkMode ? '#E5A3B7' : '#CD7E95'}
                strokeWidth="2.1"
                strokeOpacity={isDarkMode ? '0.72' : '0.82'}
              />
              <path
                d="M 0,-14 Q -12,-62 -6,-106 M 0,-18 Q 12,-62 6,-106 M 0,-10 L 0,-114"
                fill="none"
                stroke={isDarkMode ? '#DF9BB0' : '#C67B91'}
                strokeWidth="1.15"
                strokeLinecap="round"
                strokeOpacity={isDarkMode ? '0.45' : '0.52'}
              />
            </g>
          ))}
        </g>

        {/* 3. Middle Ring of 8 Warm Peach-Blush Cupped Petals */}
        <g transform="translate(260, 170)">
          {[22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((angle) => (
            <g key={`mid-${angle}`} transform={`rotate(${angle})`}>
              <path
                d="M 0,0 C -28,-26 -38,-74 0,-94 C 38,-74 28,-26 0,0 Z"
                fill={`url(#${peachGradId})`}
                stroke={isDarkMode ? '#E8B298' : '#C88A74'}
                strokeWidth="1.9"
                strokeOpacity={isDarkMode ? '0.74' : '0.84'}
              />
              <path
                d="M 0,-12 Q -8,-48 -3,-78 M 0,-12 Q 8,-48 3,-78"
                fill="none"
                stroke={isDarkMode ? '#E2A88B' : '#B87B65'}
                strokeWidth="1.05"
                strokeLinecap="round"
                strokeOpacity="0.48"
              />
            </g>
          ))}
        </g>

        {/* 4. Inner Corolla of 6 Rose Petals & 12 Golden Botanical Stamens */}
        <g transform="translate(260, 170)">
          {[0, 60, 120, 180, 240, 300].map((angle) => (
            <path
              key={`inner-${angle}`}
              transform={`rotate(${angle})`}
              d="M 0,0 C -18,-16 -22,-46 0,-58 C 22,-46 18,-16 0,0 Z"
              fill={`url(#${blushGradId})`}
              stroke={isDarkMode ? '#F0B6C8' : '#C4748B'}
              strokeWidth="1.8"
              strokeOpacity="0.78"
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
                strokeWidth="1.6"
                strokeOpacity="0.72"
                strokeLinecap="round"
              />
              <circle
                cx="0"
                cy="-21.5"
                r="2.4"
                fill={isDarkMode ? '#FDE68A' : '#F59E0B'}
                fillOpacity="0.85"
              />
            </g>
          ))}

          <circle
            cx="0"
            cy="0"
            r="7.2"
            fill={isDarkMode ? '#FDE68A' : '#FEF3C7'}
            stroke={isDarkMode ? '#F59E0B' : '#D97706'}
            strokeWidth="1.8"
          />
        </g>
      </svg>
    );
  }
);
