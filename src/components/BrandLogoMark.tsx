import React from 'react';

interface BrandLogoMarkProps {
  className?: string;
  isDarkMode?: boolean;
}

/**
 * Official "Send A Boquet" Luxury Minimal & Cute Emblem Logo
 * Matches /public/favicon.svg and adapts softly for light and warm dusk modes.
 */
export const BrandLogoMark: React.FC<BrandLogoMarkProps> = React.memo(
  ({ className = 'w-8 h-8', isDarkMode = false }) => {
    return (
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 select-none ${className}`}
        aria-hidden="true"
      >
        {/* Soft Cashmere-Blush Squircle Emblem */}
        <rect
          x="2"
          y="2"
          width="60"
          height="60"
          rx="18"
          fill={isDarkMode ? '#463935' : '#FAF2EC'}
          stroke={isDarkMode ? '#614F49' : '#E5D3C5'}
          strokeWidth="2"
        />
        <rect
          x="6"
          y="6"
          width="52"
          height="52"
          rx="14"
          stroke={isDarkMode ? '#745E57' : '#DCC6B6'}
          strokeWidth="1"
          strokeDasharray="2.5 2.5"
        />

        {/* Soft Watercolor Glow Behind Blooms */}
        <circle
          cx="32"
          cy="24"
          r="14"
          fill={isDarkMode ? '#7E4D5B' : '#FCE4EC'}
          opacity={isDarkMode ? '0.45' : '0.78'}
        />

        {/* Left & Right Sage Botanical Leaves */}
        <path
          d="M26 30C20 26 16 28 18 33C20 36 24 34 26 30Z"
          fill={isDarkMode ? '#7BA38A' : '#CFE3D4'}
          stroke={isDarkMode ? '#A3C9B0' : '#6B9078'}
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M38 30C44 26 48 28 46 33C44 36 40 34 38 30Z"
          fill={isDarkMode ? '#7BA38A' : '#CFE3D4'}
          stroke={isDarkMode ? '#A3C9B0' : '#6B9078'}
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Left & Right Soft Peach Side Buds */}
        <circle
          cx="23"
          cy="23"
          r="5.5"
          fill="#FCD5CE"
          stroke={isDarkMode ? '#E2A695' : '#B87A68'}
          strokeWidth="1.4"
        />
        <circle
          cx="41"
          cy="23"
          r="5.5"
          fill="#FCD5CE"
          stroke={isDarkMode ? '#E2A695' : '#B87A68'}
          strokeWidth="1.4"
        />

        {/* Center Blush Peony / Rose Bloom */}
        <circle
          cx="32"
          cy="19"
          r="7.5"
          fill="#F8BBD0"
          stroke={isDarkMode ? '#E495AE' : '#9E586A'}
          strokeWidth="1.5"
        />
        <path
          d="M29 18.5C29 16.8 30.3 15.5 32 15.5C33.7 15.5 35 16.8 35 18.5C35 20.5 32 22 32 22C32 22 29 20.5 29 18.5Z"
          fill="#FFFDF9"
          opacity="0.88"
        />
        <circle cx="32" cy="18.5" r="1.8" fill="#F6C868" />

        {/* Minimalist Couture Paper Wrap Cone */}
        <path
          d="M19 29L32 50L45 29Q38.5 32.5 32 32.5Q25.5 32.5 19 29Z"
          fill="#FFFDF9"
          stroke={isDarkMode ? '#C99B84' : '#7A4B3A'}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M23 31.5L32 47L41 31.5" fill="#F5E6DC" opacity="0.75" />

        {/* Dainty Terracotta-Rose Ribbon Bow at Waist */}
        <path
          d="M26.5 39.5Q32 41.2 37.5 39.5"
          stroke="#C85A6E"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M32 40.2C27.5 36.8 25.8 41.8 31.2 40.8M32 40.2C36.5 36.8 38.2 41.8 32.8 40.8"
          stroke="#C85A6E"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M31.2 40.8Q29.5 45.5 28 48.5M32.8 40.8Q34.5 45.5 36 48.5"
          stroke="#C85A6E"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <circle cx="32" cy="40.2" r="1.7" fill="#C85A6E" />
      </svg>
    );
  }
);
