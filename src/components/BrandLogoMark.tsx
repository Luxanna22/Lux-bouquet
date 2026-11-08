import React from 'react';

interface BrandLogoMarkProps {
  className?: string;
  isDarkMode?: boolean;
}

/**
 * Official "Send A Bouquet" Minimal Blooming Botanical Lineart Logo
 * Inspired by the hero blooming flower lineart, simplified for crisp clarity at small sizes.
 */
export const BrandLogoMark: React.FC<BrandLogoMarkProps> = React.memo(
  ({ className = 'w-8 h-8', isDarkMode = false }) => {
    const outerStroke = isDarkMode ? '#E5A3B7' : '#C87A90';
    const innerStroke = isDarkMode ? '#E8B298' : '#C88A74';
    const outerFill = isDarkMode ? 'rgba(244, 166, 190, 0.26)' : 'rgba(252, 228, 236, 0.78)';
    const innerFill = isDarkMode ? 'rgba(247, 197, 168, 0.32)' : 'rgba(255, 240, 230, 0.9)';
    const leafStroke = isDarkMode ? '#8AB89A' : '#6A9478';
    const leafFill = isDarkMode ? 'rgba(134, 184, 152, 0.22)' : 'rgba(226, 242, 232, 0.65)';

    return (
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 select-none overflow-visible ${className}`}
        aria-hidden="true"
      >
        {/* Minimal Side Botanical Leaf Sprigs */}
        <path
          d="M 18,35 C 9,30 6,22 13,19 C 19,17 23,24 24,31"
          fill={leafFill}
          stroke={leafStroke}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 46,35 C 55,30 58,22 51,19 C 45,17 41,24 40,31"
          fill={leafFill}
          stroke={leafStroke}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Simplified Blooming Botanical Lineart Rosette */}
        <g transform="translate(32, 32)">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
            <g key={`outer-${angle}`} transform={`rotate(${angle})`}>
              <path
                d="M 0,0 C -8.5,-7.5 -11.5,-21.5 0,-26.5 C 11.5,-21.5 8.5,-7.5 0,0 Z"
                fill={outerFill}
                stroke={outerStroke}
                strokeWidth="1.45"
                strokeLinejoin="round"
              />
              <path
                d="M 0,-5 L 0,-20"
                stroke={outerStroke}
                strokeWidth="0.85"
                strokeLinecap="round"
                strokeOpacity="0.5"
              />
            </g>
          ))}

          {[22.5, 112.5, 202.5, 292.5].map((angle) => (
            <g key={`inner-${angle}`} transform={`rotate(${angle})`}>
              <path
                d="M 0,0 C -6,-5 -8,-14.5 0,-17.5 C 8,-14.5 6,-5 0,0 Z"
                fill={innerFill}
                stroke={innerStroke}
                strokeWidth="1.3"
                strokeLinejoin="round"
              />
            </g>
          ))}

          {/* Warm Golden Stamen Center */}
          <circle
            cx="0"
            cy="0"
            r="4.5"
            fill={isDarkMode ? '#FDE68A' : '#FEF3C7'}
            stroke={isDarkMode ? '#F59E0B' : '#D97706'}
            strokeWidth="1.35"
          />
          <circle
            cx="0"
            cy="0"
            r="1.7"
            fill={isDarkMode ? '#F59E0B' : '#D97706'}
          />
        </g>
      </svg>
    );
  }
);
