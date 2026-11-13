import React from 'react';
import { FlowerType } from '../../types/bouquet';
import {
  CosmosSVG,
  MagnoliaSVG,
  HibiscusSVG,
  ZinniaSVG,
  MarigoldSVG,
  MorningGlorySVG,
  PlumeriaSVG,
  ForgetMeNotSVG,
  LilyOfTheValleySVG,
  DelphiniumSVG,
  AuroraGardeniaSVG,
  VelvetBaccaraSVG,
  ImperialFritillariaSVG,
  JulietAustinRoseSVG,
  LunariaHonestySVG,
  MonarchButterflySVG,
  CrystalButterflySVG,
  VelvetHeartPickSVG,
  DoubleHeartCharmSVG,
  StarburstSparkleSVG,
  CupidArrowPickSVG,
  LovebirdPerchSVG,
  WaxSealCrestSVG,
  FairyLightGarlandSVG,
  RibbonBowPickSVG,
  SittingDogSVG,
  LovelyCatsSVG,
  CrescentMoonSVG,
  RadiantSunSVG,
  GildedSunburstSVG,
  SunbeamSuncatcherSVG,
  CelestialStarSVG,
  DreamyCloudsSVG,
  ChocolateBoxSVG,
  RingInBoxSVG,
  PoinsettiaSVG,
  HollyBerriesSVG,
  MistletoeBoughSVG,
  AmaryllisSVG,
  HelleboreSVG,
  FrostedPineconeSVG,
  CrystalSnowflakeSVG,
  CandyCanePickSVG,
  GlassOrnamentSVG,
  GingerbreadHeartSVG,
  SleighBellsPickSVG,
  CinnamonStarAniseSVG,
} from './ExtendedBotanicalsAndAccents';

// ============================================================================
// MODULE 2: flowers/ — 11 INLINE SVG BOTANICAL COMPONENTS
// ============================================================================

export interface FlowerSVGProps {
  petalColor: string;
  centerColor: string;
  hideStem?: boolean;
}

/** 1. Rose SVG Component */
export const RoseSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor, hideStem }) => (
  <g>
    {/* Stem & Leaves */}
    {!hideStem && (
      <>
        <path d="M0,18 Q-4,85 0,155" stroke="#15803d" strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M-2,75 C-28,65 -34,42 -12,48 C-4,52 -2,66 -2,75 Z" fill="#22c55e" />
        <path d="M2,95 C28,85 34,62 12,68 C4,72 2,86 2,95 Z" fill="#16a34a" />
      </>
    )}
    {/* Outer Petals */}
    <circle cx="-18" cy="-8" r="24" fill={petalColor} opacity="0.92" />
    <circle cx="18" cy="-8" r="24" fill={petalColor} opacity="0.92" />
    <circle cx="0" cy="-24" r="25" fill={petalColor} />
    <circle cx="-14" cy="12" r="23" fill={petalColor} />
    <circle cx="14" cy="12" r="23" fill={petalColor} />
    {/* Inner layered rose cup */}
    <circle cx="0" cy="0" r="26" fill={petalColor} stroke="#ffffff" strokeWidth="1" strokeOpacity="0.4" />
    <path
      d="M-18,-4 C-12,-22 12,-22 18,-4 C22,14 -14,20 -18,-4 Z"
      fill={centerColor}
      opacity="0.45"
    />
    <path
      d="M-12,-2 C-8,-14 10,-14 12,0 C14,10 -10,12 -12,-2 Z"
      fill={petalColor}
      stroke="#ffffff"
      strokeWidth="1.2"
      strokeOpacity="0.55"
    />
    {/* Spiral Rose Heart */}
    <path
      d="M0,0 C4,-6 10,-2 8,4 C6,10 -6,10 -8,2 C-10,-8 4,-14 12,-6"
      fill="none"
      stroke={centerColor}
      strokeWidth="3.2"
      strokeLinecap="round"
    />
  </g>
);

/** 2. Tulip SVG Component */
export const TulipSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor, hideStem }) => (
  <g>
    {/* Stem & Long Clasping Leaf */}
    {!hideStem && (
      <>
        <path d="M0,22 Q3,90 0,160" stroke="#16a34a" strokeWidth="6.5" fill="none" strokeLinecap="round" />
        <path d="M-2,135 C-32,85 -26,35 -8,18 C-12,62 -8,100 -2,135 Z" fill="#22c55e" />
        <path d="M2,140 C30,90 28,42 10,24 C12,65 8,105 2,140 Z" fill="#15803d" />
      </>
    )}
    {/* Back Center Petal & Peek of Golden Stamen */}
    <ellipse cx="0" cy="-18" rx="18" ry="30" fill={centerColor} opacity="0.85" />
    <ellipse cx="0" cy="-14" rx="20" ry="32" fill={petalColor} opacity="0.9" />
    {/* Left & Right Cupping Petals */}
    <path
      d="M0,25 C-34,22 -36,-22 -14,-42 C-2,-24 -2,6 0,25 Z"
      fill={petalColor}
      stroke="#ffffff"
      strokeWidth="1"
      strokeOpacity="0.3"
    />
    <path
      d="M0,25 C34,22 36,-22 14,-42 C2,-24 2,6 0,25 Z"
      fill={petalColor}
      stroke="#ffffff"
      strokeWidth="1"
      strokeOpacity="0.3"
    />
    {/* Front Central Fold */}
    <path
      d="M0,26 C-20,18 -20,-26 0,-40 C20,-26 20,18 0,26 Z"
      fill={petalColor}
      stroke={centerColor}
      strokeWidth="1.2"
      strokeOpacity="0.45"
    />
  </g>
);

/** 3. Sunflower SVG Component */
export const SunflowerSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => {
  const angles = Array.from({ length: 18 }, (_, i) => i * 20);
  return (
    <g>
      <path d="M0,25 Q-3,95 0,165" stroke="#15803d" strokeWidth="7.5" fill="none" strokeLinecap="round" />
      <path d="M-3,85 C-38,70 -40,42 -12,52 Z" fill="#16a34a" />
      {/* Back Ray Ring */}
      {angles.map((deg) => (
        <ellipse
          key={`b-${deg}`}
          cx="0"
          cy="-34"
          rx="8"
          ry="22"
          fill={petalColor}
          opacity="0.85"
          transform={`rotate(${deg + 10})`}
        />
      ))}
      {/* Front Ray Ring */}
      {angles.map((deg) => (
        <ellipse
          key={`f-${deg}`}
          cx="0"
          cy="-32"
          rx="7.5"
          ry="20"
          fill={petalColor}
          stroke="#ca8a04"
          strokeWidth="0.6"
          transform={`rotate(${deg})`}
        />
      ))}
      {/* Seed Disc */}
      <circle cx="0" cy="0" r="22" fill={centerColor} stroke="#d97706" strokeWidth="2.5" />
      {/* Fibonacci Seed Dots */}
      <g fill="#fde047" opacity="0.65">
        <circle cx="-8" cy="-6" r="2" />
        <circle cx="8" cy="-6" r="2" />
        <circle cx="0" cy="-12" r="2" />
        <circle cx="-12" cy="4" r="2" />
        <circle cx="12" cy="4" r="2" />
        <circle cx="0" cy="11" r="2" />
        <circle cx="-5" cy="4" r="2" />
        <circle cx="5" cy="4" r="2" />
        <circle cx="0" cy="-2" r="2.2" />
      </g>
    </g>
  );
};

/** 4. Daisy SVG Component */
export const DaisySVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => {
  const angles = Array.from({ length: 12 }, (_, i) => i * 30);
  return (
    <g>
      <path d="M0,18 Q4,80 0,145" stroke="#22c55e" strokeWidth="4.5" fill="none" strokeLinecap="round" />
      {angles.map((deg) => (
        <ellipse
          key={deg}
          cx="0"
          cy="-24"
          rx="7"
          ry="17"
          fill={petalColor}
          stroke="#e2e8f0"
          strokeWidth="0.8"
          transform={`rotate(${deg})`}
        />
      ))}
      <circle cx="0" cy="0" r="13" fill={centerColor} />
      <circle cx="-3" cy="-3" r="9" fill="#ffffff" opacity="0.22" />
    </g>
  );
};

/** 5. Stargazer Lily SVG Component */
export const LilySVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor, hideStem }) => {
  const angles = [0, 60, 120, 180, 240, 300];
  return (
    <g>
      {!hideStem && (
        <path d="M0,22 Q-3,90 0,160" stroke="#15803d" strokeWidth="5.5" fill="none" strokeLinecap="round" />
      )}
      {angles.map((deg) => (
        <g key={deg} transform={`rotate(${deg})`}>
          <path
            d="M0,0 C-15,-18 -14,-44 0,-56 C14,-44 15,-18 0,0 Z"
            fill={petalColor}
            stroke={centerColor}
            strokeWidth="1.2"
            strokeOpacity="0.4"
          />
          <path d="M0,-6 L0,-38" stroke={centerColor} strokeWidth="2" strokeLinecap="round" opacity="0.65" />
          <circle cx="-4" cy="-22" r="1.4" fill={centerColor} />
          <circle cx="4" cy="-25" r="1.4" fill={centerColor} />
          <circle cx="0" cy="-30" r="1.4" fill={centerColor} />
        </g>
      ))}
      {/* Prominent Anthers */}
      {angles.map((deg) => (
        <g key={`stamen-${deg}`} transform={`rotate(${deg + 30})`}>
          <path d="M0,0 Q3,-14 0,-22" stroke="#84cc16" strokeWidth="1.6" fill="none" />
          <ellipse cx="0" cy="-23" rx="3.5" ry="2" fill={centerColor} />
        </g>
      ))}
      <circle cx="0" cy="0" r="5" fill="#84cc16" />
    </g>
  );
};

/** 6. Lush Peony SVG Component */
export const PeonySVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor, hideStem }) => (
  <g>
    {!hideStem && (
      <path d="M0,25 Q2,90 0,155" stroke="#15803d" strokeWidth="6" fill="none" strokeLinecap="round" />
    )}
    {/* Outer Ruffled Cloud */}
    {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
      <circle
        key={`outer-${deg}`}
        cx="0"
        cy="-24"
        r="22"
        fill={petalColor}
        transform={`rotate(${deg})`}
      />
    ))}
    {/* Mid Ruffled Layer */}
    {[22, 82, 142, 202, 262, 322].map((deg) => (
      <circle
        key={`mid-${deg}`}
        cx="0"
        cy="-15"
        r="18"
        fill={centerColor}
        opacity="0.55"
        transform={`rotate(${deg})`}
      />
    ))}
    {/* Inner Ruffled Petals */}
    {[0, 72, 144, 216, 288].map((deg) => (
      <circle
        key={`in-${deg}`}
        cx="0"
        cy="-9"
        r="14"
        fill={petalColor}
        stroke="#ffffff"
        strokeWidth="1"
        strokeOpacity="0.5"
        transform={`rotate(${deg})`}
      />
    ))}
    <circle cx="0" cy="0" r="9" fill="#fde047" opacity="0.85" />
    <circle cx="0" cy="0" r="6" fill={centerColor} />
  </g>
);

/** 7. French Lavender Sprig SVG Component */
export const LavenderSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor, hideStem }) => (
  <g>
    {/* 3 Graceful Stems */}
    <path d={hideStem ? 'M0,26 Q-10,-10 -18,-55' : 'M0,150 Q-12,60 -18,-55'} stroke="#4d7c0f" strokeWidth="3.5" fill="none" strokeLinecap="round" />
    <path d={hideStem ? 'M0,26 L0,-70' : 'M0,150 Q0,50 0,-70'} stroke="#65a30d" strokeWidth="4" fill="none" strokeLinecap="round" />
    <path d={hideStem ? 'M0,26 Q10,-10 18,-50' : 'M0,150 Q12,60 18,-50'} stroke="#4d7c0f" strokeWidth="3.5" fill="none" strokeLinecap="round" />
    {/* Center Spike Florets */}
    {[-68, -54, -40, -26, -12, 2, 16].map((y, idx) => (
      <g key={`c-${idx}`} transform={`translate(0, ${y})`}>
        <ellipse cx="-5" cy="0" rx="5" ry="7" fill={petalColor} transform="rotate(-28 -5 0)" />
        <ellipse cx="5" cy="0" rx="5" ry="7" fill={petalColor} transform="rotate(28 5 0)" />
        <ellipse cx="0" cy="-3" rx="4.5" ry="6.5" fill={centerColor} opacity="0.75" />
      </g>
    ))}
    {/* Left Spike Florets */}
    {[-52, -38, -24, -10, 4].map((y, idx) => (
      <g key={`l-${idx}`} transform={`translate(-15, ${y}) rotate(-8)`}>
        <ellipse cx="-4" cy="0" rx="4.5" ry="6" fill={petalColor} transform="rotate(-25 -4 0)" />
        <ellipse cx="4" cy="0" rx="4.5" ry="6" fill={centerColor} opacity="0.8" transform="rotate(25 4 0)" />
      </g>
    ))}
    {/* Right Spike Florets */}
    {[-48, -34, -20, -6, 8].map((y, idx) => (
      <g key={`r-${idx}`} transform={`translate(15, ${y}) rotate(8)`}>
        <ellipse cx="-4" cy="0" rx="4.5" ry="6" fill={centerColor} opacity="0.8" transform="rotate(-25 -4 0)" />
        <ellipse cx="4" cy="0" rx="4.5" ry="6" fill={petalColor} transform="rotate(25 4 0)" />
      </g>
    ))}
  </g>
);

/** 8. Hydrangea Cluster SVG Component */
export const HydrangeaSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor, hideStem }) => {
  const florets = [
    { x: 0, y: -26 },
    { x: -24, y: -14 },
    { x: 24, y: -14 },
    { x: -26, y: 12 },
    { x: 26, y: 12 },
    { x: 0, y: 24 },
    { x: -12, y: -2 },
    { x: 12, y: -2 },
    { x: 0, y: 4 }
  ];
  return (
    <g>
      {!hideStem && (
        <path d="M0,25 Q0,95 0,160" stroke="#15803d" strokeWidth="6.5" fill="none" strokeLinecap="round" />
      )}
      <ellipse cx="-26" cy="36" rx="22" ry="12" fill="#16a34a" transform="rotate(-25 -26 36)" />
      <ellipse cx="26" cy="36" rx="22" ry="12" fill="#16a34a" transform="rotate(25 26 36)" />
      {florets.map((pos, idx) => (
        <g key={idx} transform={`translate(${pos.x}, ${pos.y})`}>
          <circle cx="0" cy="-9" r="9.5" fill={idx % 2 === 0 ? petalColor : centerColor} />
          <circle cx="0" cy="9" r="9.5" fill={idx % 2 === 0 ? petalColor : centerColor} />
          <circle cx="-9" cy="0" r="9.5" fill={petalColor} />
          <circle cx="9" cy="0" r="9.5" fill={petalColor} />
          <circle cx="0" cy="0" r="3" fill="#fef08a" />
        </g>
      ))}
    </g>
  );
};

/** 9. Baby's Breath Cloud Spray SVG Component */
export const BabysBreathSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor, hideStem }) => {
  const blossoms = [
    { x: -34, y: -42, r: 7 },
    { x: -18, y: -58, r: 6.5 },
    { x: 0, y: -64, r: 7.5 },
    { x: 20, y: -56, r: 6.5 },
    { x: 35, y: -40, r: 7 },
    { x: -26, y: -20, r: 6 },
    { x: -6, y: -34, r: 7 },
    { x: 14, y: -30, r: 6.5 },
    { x: 28, y: -14, r: 6 },
    { x: -14, y: -4, r: 5.5 },
    { x: 10, y: -6, r: 5.5 }
  ];
  return (
    <g>
      {/* Delicate Branching Stems */}
      <g stroke="#65a30d" strokeWidth="2" fill="none" strokeLinecap="round">
        <path d={hideStem ? 'M0,32 L0,-62' : 'M0,150 L0,-62'} />
        <path d={hideStem ? 'M0,32 Q-18,0 -34,-42' : 'M0,65 Q-18,10 -34,-42'} />
        <path d={hideStem ? 'M0,32 Q18,0 35,-40' : 'M0,65 Q18,10 35,-40'} />
        <path d="M0,25 Q-14,-20 -18,-58" />
        <path d="M0,25 Q14,-20 20,-56" />
        <path d="M0,28 Q-18,8 -26,-20" />
        <path d="M0,28 Q18,8 28,-14" />
      </g>
      {blossoms.map((b, i) => (
        <g key={i} transform={`translate(${b.x}, ${b.y})`}>
          <circle cx="-3" cy="-3" r={b.r * 0.65} fill={petalColor} />
          <circle cx="3" cy="-3" r={b.r * 0.65} fill={petalColor} />
          <circle cx="-3" cy="3" r={b.r * 0.65} fill={petalColor} />
          <circle cx="3" cy="3" r={b.r * 0.65} fill={petalColor} />
          <circle cx="0" cy="0" r={b.r * 0.4} fill={centerColor} />
        </g>
      ))}
    </g>
  );
};

/** 10. Silver Dollar Eucalyptus SVG Component */
export const EucalyptusSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor, hideStem }) => {
  const leaves = [
    { x: -18, y: 35, rx: 16, ry: 14, rot: -35 },
    { x: 18, y: 24, rx: 16, ry: 14, rot: 35 },
    { x: -20, y: 2, rx: 18, ry: 15, rot: -30 },
    { x: 20, y: -10, rx: 18, ry: 15, rot: 30 },
    { x: -17, y: -32, rx: 16, ry: 14, rot: -25 },
    { x: 17, y: -42, rx: 16, ry: 14, rot: 25 },
    { x: 0, y: -64, rx: 14, ry: 16, rot: 0 }
  ];
  return (
    <g>
      <path d={hideStem ? 'M0,42 Q-2,0 0,-60' : 'M0,150 Q-4,45 0,-60'} stroke={centerColor} strokeWidth="3.5" fill="none" strokeLinecap="round" />
      {leaves.map((lf, i) => (
        <g key={i} transform={`translate(${lf.x}, ${lf.y}) rotate(${lf.rot})`}>
          <ellipse
            cx="0"
            cy="0"
            rx={lf.rx}
            ry={lf.ry}
            fill={petalColor}
            stroke={centerColor}
            strokeWidth="1.2"
          />
          <path d={`M0,${lf.ry * 0.7} L0,${-lf.ry * 0.6}`} stroke={centerColor} strokeWidth="1" opacity="0.5" />
        </g>
      ))}
    </g>
  );
};

/** 11. Woodland Fern Frond SVG Component */
export const FernSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => {
  const pairs = [-60, -44, -28, -12, 4, 20, 36, 52];
  return (
    <g>
      <path d="M0,150 Q-6,40 0,-78" stroke={centerColor} strokeWidth="3.8" fill="none" strokeLinecap="round" />
      {pairs.map((y, idx) => {
        const w = 26 - Math.abs(idx - 3) * 2.6;
        return (
          <g key={y} transform={`translate(0, ${y})`}>
            <ellipse
              cx={-w * 0.75}
              cy="0"
              rx={w}
              ry="5.5"
              fill={petalColor}
              transform={`rotate(-28 ${-w * 0.75} 0)`}
            />
            <ellipse
              cx={w * 0.75}
              cy="0"
              rx={w}
              ry="5.5"
              fill={petalColor}
              transform={`rotate(28 ${w * 0.75} 0)`}
            />
          </g>
        );
      })}
      <ellipse cx="0" cy="-76" rx="5" ry="11" fill={petalColor} />
    </g>
  );
};

/** 12. Phalaenopsis Orchid SVG Component */
export const OrchidSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor, hideStem }) => (
  <g>
    {/* Graceful arching orchid stem & aerial bud */}
    <path d={hideStem ? 'M0,22 C-4,-5 -6,-25 6,-62' : 'M0,155 C-6,85 -10,10 6,-62'} stroke="#15803d" strokeWidth="4.8" fill="none" strokeLinecap="round" />
    <ellipse cx="6" cy="-64" rx="6" ry="9" fill={petalColor} stroke={centerColor} strokeWidth="1" />
    {/* Upper secondary bloom */}
    <g transform="translate(3, -38) scale(0.72) rotate(12)">
      <ellipse cx="0" cy="-18" rx="9" ry="18" fill={petalColor} opacity="0.92" />
      <ellipse cx="-12" cy="10" rx="8" ry="16" fill={petalColor} transform="rotate(35 -12 10)" />
      <ellipse cx="12" cy="10" rx="8" ry="16" fill={petalColor} transform="rotate(-35 12 10)" />
      <path d="M-4,0 C-34,-26 -38,20 -4,10 Z" fill={petalColor} stroke="#ffffff" strokeWidth="0.9" strokeOpacity="0.45" />
      <path d="M4,0 C34,-26 38,20 4,10 Z" fill={petalColor} stroke="#ffffff" strokeWidth="0.9" strokeOpacity="0.45" />
      <path d="M0,2 C-12,6 -10,22 0,24 C10,22 12,6 0,2 Z" fill={centerColor} />
      <circle cx="0" cy="4" r="3.5" fill="#fde047" />
    </g>
    {/* Primary winged Phalaenopsis bloom */}
    <g transform="translate(-3, 2) rotate(-6)">
      {/* Dorsal & Lateral Sepals */}
      <ellipse cx="0" cy="-22" rx="12" ry="22" fill={petalColor} opacity="0.92" />
      <ellipse cx="-15" cy="14" rx="10" ry="19" fill={petalColor} opacity="0.9" transform="rotate(38 -15 14)" />
      <ellipse cx="15" cy="14" rx="10" ry="19" fill={petalColor} opacity="0.9" transform="rotate(-38 15 14)" />
      {/* Wide Butterfly Lateral Petals */}
      <path
        d="M-3,-2 C-42,-30 -46,24 -4,12 Z"
        fill={petalColor}
        stroke="#ffffff"
        strokeWidth="1.2"
        strokeOpacity="0.5"
      />
      <path
        d="M3,-2 C42,-30 46,24 4,12 Z"
        fill={petalColor}
        stroke="#ffffff"
        strokeWidth="1.2"
        strokeOpacity="0.5"
      />
      {/* Sculpted Labellum (Lip) & Speckles */}
      <path
        d="M0,2 C-16,6 -14,26 0,29 C14,26 16,6 0,2 Z"
        fill={centerColor}
        stroke="#ffffff"
        strokeWidth="0.9"
        strokeOpacity="0.5"
      />
      <circle cx="-4" cy="12" r="1.4" fill="#fde047" />
      <circle cx="4" cy="12" r="1.4" fill="#fde047" />
      <circle cx="0" cy="17" r="1.4" fill="#fde047" />
      <circle cx="0" cy="3" r="4.5" fill="#fde047" stroke={centerColor} strokeWidth="1.2" />
    </g>
  </g>
);

/** 13. Ruffled Carnation SVG Component */
export const CarnationSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => {
  const outerAngles = [0, 36, 72, 108, 144, 180, 216, 252, 288, 324];
  const innerAngles = [18, 78, 138, 198, 258, 318];
  return (
    <g>
      {/* Slender blue-green carnation stem, nodes & linear leaves */}
      <path d="M0,20 Q2,88 0,156" stroke="#15803d" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M0,78 C-24,62 -32,38 -18,34 C-10,48 -4,64 0,78 Z" fill="#16a34a" />
      <path d="M0,96 C24,80 32,56 18,52 C10,66 4,82 0,96 Z" fill="#15803d" />
      {/* Outer Ruffled & Serrated Clove Petals */}
      {outerAngles.map((deg) => (
        <path
          key={`c-out-${deg}`}
          d="M0,0 L-11,-24 L-7,-28 L-3,-25 L0,-30 L3,-25 L7,-28 L11,-24 Z"
          fill={petalColor}
          stroke={centerColor}
          strokeWidth="0.9"
          strokeOpacity="0.45"
          transform={`rotate(${deg}) scale(1.18)`}
        />
      ))}
      {/* Mid Frilled Tier */}
      {innerAngles.map((deg) => (
        <path
          key={`c-mid-${deg}`}
          d="M0,0 L-10,-19 L-5,-23 L0,-19 L5,-23 L10,-19 Z"
          fill={centerColor}
          opacity="0.55"
          transform={`rotate(${deg}) scale(1.1)`}
        />
      ))}
      {/* Inner Ruffled Crown */}
      {innerAngles.map((deg) => (
        <path
          key={`c-in-${deg}`}
          d="M0,0 L-8,-14 L-4,-17 L0,-13 L4,-17 L8,-14 Z"
          fill={petalColor}
          stroke="#ffffff"
          strokeWidth="1"
          strokeOpacity="0.6"
          transform={`rotate(${deg + 30})`}
        />
      ))}
      {/* Swollen Green Calyx Cup at Base */}
      <path d="M-11,14 C-9,28 9,28 11,14 C7,10 -7,10 -11,14 Z" fill="#15803d" />
    </g>
  );
};

/** 14. Persian Ranunculus SVG Component */
export const RanunculusSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor, hideStem }) => {
  const ring1 = [0, 40, 80, 120, 160, 200, 240, 280, 320];
  const ring2 = [20, 65, 110, 155, 200, 245, 290, 335];
  const ring3 = [0, 51, 102, 153, 204, 255, 306];
  const ring4 = [25, 85, 145, 205, 265, 325];
  return (
    <g>
      {!hideStem && (
        <>
          <path d="M0,22 Q-3,88 0,155" stroke="#16a34a" strokeWidth="5.8" fill="none" strokeLinecap="round" />
          <path d="M-2,82 C-28,70 -30,48 -10,54 Z" fill="#22c55e" />
        </>
      )}
      {/* Outer Paper-Thin Cupped Whorl */}
      {ring1.map((deg) => (
        <ellipse
          key={`r1-${deg}`}
          cx="0"
          cy="-18"
          rx="16"
          ry="13"
          fill={petalColor}
          stroke="#ffffff"
          strokeWidth="0.9"
          strokeOpacity="0.45"
          transform={`rotate(${deg})`}
        />
      ))}
      {/* Second Concentric Spiral Whorl */}
      {ring2.map((deg) => (
        <ellipse
          key={`r2-${deg}`}
          cx="0"
          cy="-13"
          rx="13.5"
          ry="10.5"
          fill={centerColor}
          opacity="0.42"
          transform={`rotate(${deg})`}
        />
      ))}
      {ring2.map((deg) => (
        <ellipse
          key={`r2b-${deg}`}
          cx="0"
          cy="-12"
          rx="12.5"
          ry="9.5"
          fill={petalColor}
          stroke={centerColor}
          strokeWidth="0.8"
          strokeOpacity="0.4"
          transform={`rotate(${deg + 12})`}
        />
      ))}
      {/* Third Tight Inner Whorl */}
      {ring3.map((deg) => (
        <ellipse
          key={`r3-${deg}`}
          cx="0"
          cy="-7.5"
          rx="9.5"
          ry="7"
          fill={petalColor}
          stroke="#ffffff"
          strokeWidth="0.9"
          strokeOpacity="0.55"
          transform={`rotate(${deg})`}
        />
      ))}
      {/* Fourth Core Whorl */}
      {ring4.map((deg) => (
        <ellipse
          key={`r4-${deg}`}
          cx="0"
          cy="-4"
          rx="6"
          ry="4.5"
          fill={centerColor}
          opacity="0.75"
          transform={`rotate(${deg})`}
        />
      ))}
      <circle cx="0" cy="0" r="4.5" fill="#15803d" opacity="0.7" />
    </g>
  );
};

/** 15. Poppy Anemone SVG Component */
export const AnemoneSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor, hideStem }) => {
  const petals = [0, 45, 90, 135, 180, 225, 270, 315];
  const stamens = Array.from({ length: 16 }, (_, i) => i * 22.5);
  return (
    <g>
      {!hideStem && (
        <>
          <path d="M0,22 Q3,90 0,156" stroke="#15803d" strokeWidth="6" fill="none" strokeLinecap="round" />
          <path d="M-2,65 C-28,55 -30,36 -10,44 Z" fill="#16a34a" />
        </>
      )}
      {/* 8 Overlapping Rounded Velvet Petals */}
      {petals.map((deg, idx) => (
        <ellipse
          key={`an-p-${deg}`}
          cx="0"
          cy="-21"
          rx="15"
          ry="20"
          fill={petalColor}
          stroke="#cbd5e1"
          strokeWidth="0.8"
          strokeOpacity="0.55"
          opacity={idx % 2 === 0 ? 0.96 : 1}
          transform={`rotate(${deg})`}
        />
      ))}
      {/* Radiating Stamen Filament Ring */}
      {stamens.map((deg) => (
        <g key={`an-s-${deg}`} transform={`rotate(${deg})`}>
          <line x1="0" y1="0" x2="0" y2="-16" stroke={centerColor} strokeWidth="1.2" opacity="0.85" />
          <circle cx="0" cy="-16.5" r="1.8" fill={centerColor} />
        </g>
      ))}
      {/* Dramatic Dark Velvet Button Eye */}
      <circle cx="0" cy="0" r="10.5" fill={centerColor} stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.35" />
      <circle cx="-3" cy="-3" r="3.5" fill="#ffffff" opacity="0.22" />
    </g>
  );
};

/** 16. Pompon Dahlia SVG Component */
export const DahliaSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => {
  const outer = Array.from({ length: 16 }, (_, i) => i * 22.5);
  const mid = Array.from({ length: 12 }, (_, i) => i * 30 + 11);
  const inner = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <g>
      <path d="M0,24 Q-3,92 0,158" stroke="#15803d" strokeWidth="6.5" fill="none" strokeLinecap="round" />
      <path d="M2,88 C30,72 34,48 12,56 Z" fill="#16a34a" />
      {/* Outer Quilled Geometric Ring */}
      {outer.map((deg) => (
        <path
          key={`d-out-${deg}`}
          d="M0,0 C-9,-14 -8,-34 0,-40 C8,-34 9,-14 0,0 Z"
          fill={petalColor}
          stroke={centerColor}
          strokeWidth="0.8"
          strokeOpacity="0.45"
          transform={`rotate(${deg})`}
        />
      ))}
      {/* Mid Quilled Ring */}
      {mid.map((deg) => (
        <path
          key={`d-mid-${deg}`}
          d="M0,0 C-8,-12 -7,-25 0,-30 C7,-25 8,-12 0,0 Z"
          fill={centerColor}
          opacity="0.48"
          transform={`rotate(${deg})`}
        />
      ))}
      {mid.map((deg) => (
        <path
          key={`d-mid2-${deg}`}
          d="M0,0 C-7.5,-10 -6.5,-23 0,-27 C6.5,-23 7.5,-10 0,0 Z"
          fill={petalColor}
          stroke="#ffffff"
          strokeWidth="0.8"
          strokeOpacity="0.45"
          transform={`rotate(${deg + 15})`}
        />
      ))}
      {/* Inner Quilled Rosette */}
      {inner.map((deg) => (
        <path
          key={`d-in-${deg}`}
          d="M0,0 C-6,-7 -5,-15 0,-18 C5,-15 6,-7 0,0 Z"
          fill={centerColor}
          opacity="0.8"
          transform={`rotate(${deg})`}
        />
      ))}
      <circle cx="0" cy="0" r="5.5" fill="#fde047" opacity="0.9" />
    </g>
  );
};

/** 17. Bearded Iris SVG Component */
export const IrisSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => (
  <g>
    {/* Sword Leaf & Stem */}
    <path d="M0,20 L0,158" stroke="#15803d" strokeWidth="6" fill="none" strokeLinecap="round" />
    <path d="M-3,135 C-22,75 -20,20 -8,-10 C-6,45 -4,95 -3,135 Z" fill="#16a34a" />
    {/* 3 Upright Domed Standards */}
    <path
      d="M-2,-4 C-26,-16 -22,-48 -2,-52 C8,-38 4,-16 -2,-4 Z"
      fill={petalColor}
      opacity="0.88"
    />
    <path
      d="M2,-4 C26,-16 22,-48 2,-52 C-8,-38 -4,-16 2,-4 Z"
      fill={petalColor}
      opacity="0.88"
    />
    <path
      d="M0,-2 C-18,-20 -16,-54 0,-58 C16,-54 18,-20 0,-2 Z"
      fill={petalColor}
      stroke="#ffffff"
      strokeWidth="1"
      strokeOpacity="0.45"
    />
    {/* Left & Right Cascading Falls */}
    <path
      d="M-4,0 C-36,0 -44,28 -24,36 C-10,34 -4,14 -4,0 Z"
      fill={petalColor}
      stroke={centerColor}
      strokeWidth="1"
      strokeOpacity="0.5"
    />
    <path
      d="M4,0 C36,0 44,28 24,36 C10,34 4,14 4,0 Z"
      fill={petalColor}
      stroke={centerColor}
      strokeWidth="1"
      strokeOpacity="0.5"
    />
    {/* Central Cascading Fall + Golden Beard */}
    <path
      d="M0,0 C-22,8 -20,42 0,46 C20,42 22,8 0,0 Z"
      fill={petalColor}
      stroke="#ffffff"
      strokeWidth="1.1"
      strokeOpacity="0.5"
    />
    <ellipse cx="0" cy="14" rx="5" ry="11" fill={centerColor} />
    <ellipse cx="-16" cy="14" rx="3.5" ry="7" fill={centerColor} transform="rotate(42 -16 14)" />
    <ellipse cx="16" cy="14" rx="3.5" ry="7" fill={centerColor} transform="rotate(-42 16 14)" />
  </g>
);

/** 18. Japonica Camellia SVG Component */
export const CamelliaSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => {
  const outer = [0, 45, 90, 135, 180, 225, 270, 315];
  const mid = [22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5];
  const inner = [0, 60, 120, 180, 240, 300];
  return (
    <g>
      <path d="M0,22 Q-2,88 0,155" stroke="#14532d" strokeWidth="5.8" fill="none" strokeLinecap="round" />
      {/* Glossy Dark Camellia Leaves Framing Bloom */}
      <ellipse cx="-26" cy="20" rx="18" ry="10" fill="#15803d" transform="rotate(-28 -26 20)" />
      <ellipse cx="26" cy="20" rx="18" ry="10" fill="#15803d" transform="rotate(28 26 20)" />
      {/* Outer Porcelain Rosette */}
      {outer.map((deg) => (
        <ellipse
          key={`cam-o-${deg}`}
          cx="0"
          cy="-21"
          rx="13.5"
          ry="18"
          fill={petalColor}
          stroke="#ffffff"
          strokeWidth="0.9"
          strokeOpacity="0.45"
          transform={`rotate(${deg})`}
        />
      ))}
      {/* Middle Imbricated Tier */}
      {mid.map((deg) => (
        <ellipse
          key={`cam-m-${deg}`}
          cx="0"
          cy="-14"
          rx="10.5"
          ry="14"
          fill={petalColor}
          stroke="#ffffff"
          strokeWidth="1"
          strokeOpacity="0.55"
          transform={`rotate(${deg})`}
        />
      ))}
      {/* Inner Tier */}
      {inner.map((deg) => (
        <ellipse
          key={`cam-i-${deg}`}
          cx="0"
          cy="-8"
          rx="7.5"
          ry="10"
          fill={petalColor}
          stroke="#ffffff"
          strokeWidth="1"
          strokeOpacity="0.65"
          transform={`rotate(${deg})`}
        />
      ))}
      {/* Golden Stamen Crown */}
      <circle cx="0" cy="0" r="7" fill={centerColor} />
      <circle cx="-2.5" cy="-2" r="1.5" fill="#ffffff" opacity="0.6" />
      <circle cx="2.5" cy="-2" r="1.5" fill="#ffffff" opacity="0.6" />
      <circle cx="0" cy="2.5" r="1.5" fill="#ffffff" opacity="0.6" />
    </g>
  );
};

/** 19. Sacred Lotus SVG Component */
export const LotusSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => {
  const backAngles = [-68, -42, -18, 18, 42, 68];
  const frontAngles = [-52, -26, 0, 26, 52];
  return (
    <g>
      <path d="M0,20 Q2,88 0,158" stroke="#15803d" strokeWidth="6" fill="none" strokeLinecap="round" />
      {/* Back Tiered Pointed Lotus Petals */}
      {backAngles.map((deg) => (
        <path
          key={`lot-b-${deg}`}
          d="M0,12 C-14,-6 -12,-38 0,-52 C12,-38 14,-6 0,12 Z"
          fill={petalColor}
          opacity="0.85"
          transform={`rotate(${deg} 0 12)`}
        />
      ))}
      {/* Front Cupping Lotus Petals */}
      {frontAngles.map((deg) => (
        <path
          key={`lot-f-${deg}`}
          d="M0,14 C-15,-2 -13,-34 0,-46 C13,-34 15,-2 0,14 Z"
          fill={petalColor}
          stroke="#ffffff"
          strokeWidth="1.1"
          strokeOpacity="0.55"
          transform={`rotate(${deg} 0 14)`}
        />
      ))}
      {/* Golden Receptacle Seed Pod */}
      <ellipse cx="0" cy="2" rx="13" ry="8" fill={centerColor} />
      <circle cx="-5" cy="1" r="1.5" fill="#78350f" opacity="0.6" />
      <circle cx="0" cy="-1" r="1.5" fill="#78350f" opacity="0.6" />
      <circle cx="5" cy="1" r="1.5" fill="#78350f" opacity="0.6" />
      <circle cx="-2.5" cy="4" r="1.5" fill="#78350f" opacity="0.6" />
      <circle cx="2.5" cy="4" r="1.5" fill="#78350f" opacity="0.6" />
      {/* Front Central Cradle Petal */}
      <path
        d="M0,18 C-18,12 -16,-12 0,-22 C16,-12 18,12 0,18 Z"
        fill={petalColor}
        stroke="#ffffff"
        strokeWidth="1"
        strokeOpacity="0.6"
      />
    </g>
  );
};

/** 20. Sakura Cherry Blossom Branch (Filler) SVG Component */
export const CherryBlossomSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => {
  const blossoms = [
    { x: -24, y: -22, s: 0.88 },
    { x: 18, y: -38, s: 0.92 },
    { x: -6, y: -58, s: 0.78 },
    { x: 14, y: 4, s: 0.82 }
  ];
  return (
    <g>
      {/* Woody Branching Sakura Twig */}
      <g stroke="#573b26" strokeLinecap="round" fill="none">
        <path d="M0,152 Q-6,50 -4,-68" strokeWidth="4.2" />
        <path d="M-4,15 Q-18,-5 -28,-28" strokeWidth="3" />
        <path d="M-4,-10 Q14,-24 24,-44" strokeWidth="2.8" />
        <path d="M-2,32 Q10,18 18,2" strokeWidth="2.6" />
      </g>
      {/* Unopened Spring Sakura Buds */}
      <ellipse cx="-5" cy="-70" rx="4" ry="6.5" fill={centerColor} />
      <ellipse cx="-29" cy="-31" rx="3.5" ry="5.5" fill={centerColor} transform="rotate(-25 -29 -31)" />
      {/* 5-Petaled Notched Sakura Blossoms */}
      {blossoms.map((b, idx) => (
        <g key={idx} transform={`translate(${b.x}, ${b.y}) scale(${b.s})`}>
          {[0, 72, 144, 216, 288].map((deg) => (
            <path
              key={deg}
              d="M0,0 C-8,-6 -10,-18 -3,-20 L0,-16 L3,-20 C10,-18 8,-6 0,0 Z"
              fill={petalColor}
              stroke="#ffffff"
              strokeWidth="0.7"
              strokeOpacity="0.55"
              transform={`rotate(${deg})`}
            />
          ))}
          <circle cx="0" cy="0" r="3.5" fill={centerColor} />
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <circle
              key={`st-${deg}`}
              cx="0"
              cy="-6.5"
              r="1.1"
              fill={centerColor}
              transform={`rotate(${deg})`}
            />
          ))}
        </g>
      ))}
    </g>
  );
};

/** 21. Sweet Waxflower Spray (Filler) SVG Component */
export const WaxflowerSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor, hideStem }) => {
  const florets = [
    { x: -26, y: -38, s: 0.9 },
    { x: 0, y: -56, s: 1 },
    { x: 26, y: -34, s: 0.9 },
    { x: -16, y: -12, s: 0.85 },
    { x: 18, y: -8, s: 0.85 },
    { x: 0, y: -26, s: 0.95 }
  ];
  return (
    <g>
      {/* Woody Needle-Leaved Spray Stems */}
      <g stroke="#4d7c0f" strokeWidth="2.6" fill="none" strokeLinecap="round">
        <path d={hideStem ? 'M0,28 L0,-56' : 'M0,150 L0,-56'} />
        <path d={hideStem ? 'M0,26 Q-14,-4 -26,-38' : 'M0,45 Q-16,0 -26,-38'} />
        <path d={hideStem ? 'M0,26 Q14,-4 26,-34' : 'M0,45 Q16,0 26,-34'} />
        <path d={hideStem ? 'M0,28 Q-10,10 -16,-12' : 'M0,65 Q-12,25 -16,-12'} />
        <path d={hideStem ? 'M0,28 Q10,10 18,-8' : 'M0,65 Q12,25 18,-8'} />
        {/* Fine Pine-like Needles */}
        <path d="M-2,24 L-12,12 M2,20 L12,8 M-2,0 L-10,-12 M2,-4 L10,-16" strokeWidth="1.8" />
      </g>
      {/* Glossy Waxy Berry Buds */}
      <circle cx="-30" cy="-48" r="3.5" fill={centerColor} />
      <circle cx="30" cy="-44" r="3.5" fill={centerColor} />
      <circle cx="-10" cy="-64" r="3" fill={petalColor} stroke={centerColor} strokeWidth="1" />
      <circle cx="10" cy="-64" r="3" fill={petalColor} stroke={centerColor} strokeWidth="1" />
      {/* 5-Pointed Waxy Star Florets */}
      {florets.map((fl, i) => (
        <g key={i} transform={`translate(${fl.x}, ${fl.y}) scale(${fl.s})`}>
          {[0, 72, 144, 216, 288].map((deg) => (
            <ellipse
              key={deg}
              cx="0"
              cy="-8.5"
              rx="4.2"
              ry="7.5"
              fill={petalColor}
              transform={`rotate(${deg})`}
            />
          ))}
          <circle cx="0" cy="0" r="4.2" fill={centerColor} />
          <circle cx="-1" cy="-1" r="1.4" fill="#ffffff" opacity="0.5" />
        </g>
      ))}
    </g>
  );
};

/** 22. Billy Buttons / Craspedia Globes (Filler) SVG Component */
export const BillyButtonsSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => {
  const globes = [
    { x: -22, y: -28, r: 13 },
    { x: 0, y: -56, r: 15 },
    { x: 22, y: -20, r: 12.5 }
  ];
  return (
    <g>
      {/* Architectural Silvery-Green Unbranched Stems */}
      <path d="M0,152 Q-14,55 -22,-28" stroke="#65a30d" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M0,152 L0,-56" stroke="#4d7c0f" strokeWidth="3.8" fill="none" strokeLinecap="round" />
      <path d="M0,152 Q14,58 22,-20" stroke="#65a30d" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      {globes.map((g, idx) => (
        <g key={idx} transform={`translate(${g.x}, ${g.y})`}>
          <circle cx="0" cy="0" r={g.r} fill={petalColor} stroke={centerColor} strokeWidth="1.5" />
          {/* Textured Spherical Dimples */}
          <circle cx={-g.r * 0.35} cy={-g.r * 0.3} r="2" fill={centerColor} opacity="0.65" />
          <circle cx={g.r * 0.35} cy={-g.r * 0.3} r="2" fill={centerColor} opacity="0.65" />
          <circle cx="0" cy="0" r="2.2" fill={centerColor} opacity="0.65" />
          <circle cx={-g.r * 0.35} cy={g.r * 0.35} r="2" fill={centerColor} opacity="0.65" />
          <circle cx={g.r * 0.35} cy={g.r * 0.35} r="2" fill={centerColor} opacity="0.65" />
          <circle cx={-g.r * 0.25} cy={-g.r * 0.35} r={g.r * 0.45} fill="#ffffff" opacity="0.2" />
        </g>
      ))}
    </g>
  );
};

/** 23. Mediterranean Olive Branch (Filler/Foliage) SVG Component */
export const OliveBranchSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => {
  const nodes = [-52, -28, -4, 20, 44];
  return (
    <g>
      <path d="M0,152 Q-5,42 0,-72" stroke="#57534e" strokeWidth="3.6" fill="none" strokeLinecap="round" />
      {nodes.map((y, idx) => (
        <g key={y} transform={`translate(0, ${y})`}>
          {/* Left Lanceolate Leaf */}
          <path
            d="M-2,0 C-18,-6 -34,-18 -38,-28 C-24,-24 -8,-12 -2,0 Z"
            fill={petalColor}
            stroke={centerColor}
            strokeWidth="1"
          />
          {/* Right Lanceolate Leaf */}
          <path
            d="M2,-4 C18,-10 34,-22 38,-32 C24,-28 8,-16 2,-4 Z"
            fill={petalColor}
            stroke={centerColor}
            strokeWidth="1"
          />
          {/* Small Olive Fruit at Alternate Nodes */}
          {idx % 2 === 1 && (
            <ellipse
              cx={idx === 1 ? -10 : 10}
              cy="-6"
              rx="4.5"
              ry="6"
              fill={centerColor}
              transform={`rotate(${idx === 1 ? -20 : 20} ${idx === 1 ? -10 : 10} -6)`}
            />
          )}
        </g>
      ))}
      <path d="M0,-68 C-6,-82 0,-92 0,-96 C0,-92 6,-82 0,-68 Z" fill={petalColor} stroke={centerColor} strokeWidth="1" />
    </g>
  );
};

/** 24. Tropical Monstera Leaf (Filler/Foliage) SVG Component */
export const MonsteraSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => (
  <g>
    {/* Petiole Stem */}
    <path d="M0,152 Q-3,75 0,25" stroke={centerColor} strokeWidth="5" fill="none" strokeLinecap="round" />
    {/* Heart-Shaped Fenestrated Monstera Blade with Split Lobes */}
    <path
      d="M0,26
         C-22,26 -38,12 -40,-4
         L-14,-2
         L-42,-12
         C-44,-22 -42,-32 -36,-40
         L-12,-24
         L-32,-46
         C-24,-56 -12,-64 0,-68
         C12,-64 24,-56 32,-46
         L12,-24
         L36,-40
         C42,-32 44,-22 42,-12
         L14,-2
         L40,-4
         C38,12 22,26 0,26 Z"
      fill={petalColor}
      stroke={centerColor}
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    {/* Central Midrib & Lateral Veins */}
    <path d="M0,26 L0,-62" stroke={centerColor} strokeWidth="2.4" strokeLinecap="round" />
    <path d="M0,4 L-22,-6 M0,4 L22,-6 M0,-18 L-20,-30 M0,-18 L20,-30 M0,-38 L-12,-48 M0,-38 L12,-48" stroke={centerColor} strokeWidth="1.3" strokeLinecap="round" opacity="0.65" />
  </g>
);

/** 25. Sculptural Calla Lily SVG Component */
export const CallaLilySVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor, hideStem }) => (
  <g>
    {!hideStem && (
      <>
        <path d="M0,28 Q-3,92 0,160" stroke="#15803d" strokeWidth="6.5" fill="none" strokeLinecap="round" />
        <path d="M-2,115 C-28,78 -24,38 -8,22 C-10,58 -6,88 -2,115 Z" fill="#16a34a" />
      </>
    )}
    {/* Outer Sculptural Trumpet Spathe */}
    <path
      d="M0,32 C-28,16 -38,-22 -18,-48 C-6,-62 4,-66 8,-54 C24,-36 32,-8 16,18 C8,28 3,32 0,32 Z"
      fill={petalColor}
      stroke="#cbd5e1"
      strokeWidth="1.1"
    />
    {/* Inner Rolled Spathe Throat */}
    <ellipse cx="0" cy="-18" rx="14" ry="22" fill={petalColor} stroke="#94a3b8" strokeWidth="0.8" opacity="0.85" />
    {/* Golden Textured Spadix */}
    <path d="M0,4 L4,-38" stroke={centerColor} strokeWidth="6" strokeLinecap="round" />
    <path d="M0,4 L4,-38" stroke="#ca8a04" strokeWidth="2.2" strokeDasharray="1.5 2.5" strokeLinecap="round" />
    {/* Front Wrapping Lip */}
    <path
      d="M0,32 C-18,22 -22,-4 -6,-12 C6,-18 18,-2 0,32 Z"
      fill={petalColor}
      stroke="#ffffff"
      strokeWidth="1"
    />
  </g>
);

/** 26. Icelandic Silk Poppy SVG Component */
export const PoppySVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor, hideStem }) => (
  <g>
    {!hideStem && (
      <path d="M0,22 C-8,72 6,115 0,158" stroke="#4d7c0f" strokeWidth="5" fill="none" strokeLinecap="round" />
    )}
    {/* Back Crinkled Silk Petals */}
    <path
      d="M-6,-4 C-46,-28 -44,-54 -14,-48 C-4,-46 0,-28 -6,-4 Z"
      fill={petalColor}
      opacity="0.88"
    />
    <path
      d="M6,-4 C46,-28 44,-54 14,-48 C4,-46 0,-28 6,-4 Z"
      fill={petalColor}
      opacity="0.88"
    />
    <path
      d="M0,-6 C-28,-50 28,-50 0,-6 Z"
      fill={petalColor}
      stroke="#ffffff"
      strokeWidth="0.9"
      strokeOpacity="0.45"
    />
    {/* Ruffled Cup Petals */}
    <ellipse cx="-18" cy="2" rx="22" ry="18" fill={petalColor} transform="rotate(-16 -18 2)" />
    <ellipse cx="18" cy="2" rx="22" ry="18" fill={petalColor} transform="rotate(16 18 2)" />
    {/* Poppy Seed Pod & Golden Stamen Ring */}
    <circle cx="0" cy="-4" r="11" fill={centerColor} />
    <circle cx="0" cy="-4" r="6" fill="#365314" stroke="#ffffff" strokeWidth="0.8" />
    <path d="M-4,-4 L4,-4 M0,-8 L0,0 M-3,-7 L3,-1 M3,-7 L-3,-1" stroke="#bef264" strokeWidth="1" />
    {/* Front Crinkled Lower Petal */}
    <path
      d="M-28,6 C-18,26 18,26 28,6 C16,-4 -16,-4 -28,6 Z"
      fill={petalColor}
      stroke="#ffffff"
      strokeWidth="1"
      strokeOpacity="0.5"
    />
  </g>
);

/** 27. Fragrant Sweet Pea SVG Component */
export const SweetPeaSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor, hideStem }) => (
  <g>
    <path d={hideStem ? 'M0,24 Q-4,-10 0,-52' : 'M0,155 Q-6,65 0,-52'} stroke="#16a34a" strokeWidth="4.2" fill="none" strokeLinecap="round" />
    {/* Curling Botanical Tendril */}
    <path d="M2,28 C18,18 26,28 18,36 C12,42 8,32 14,28" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
    {[
      { x: -12, y: -44, s: 0.92, r: -14 },
      { x: 14, y: -22, s: 1.0, r: 16 },
      { x: -10, y: 2, s: 1.05, r: -10 }
    ].map((b, i) => (
      <g key={i} transform={`translate(${b.x}, ${b.y}) rotate(${b.r}) scale(${b.s})`}>
        {/* Banner Petal */}
        <path
          d="M0,4 C-24,-12 -18,-32 0,-26 C18,-32 24,-12 0,4 Z"
          fill={petalColor}
          stroke="#ffffff"
          strokeWidth="0.8"
          strokeOpacity="0.45"
        />
        {/* Wing Petals */}
        <ellipse cx="-9" cy="2" rx="10" ry="7" fill={centerColor} opacity="0.9" transform="rotate(-18 -9 2)" />
        <ellipse cx="9" cy="2" rx="10" ry="7" fill={centerColor} opacity="0.9" transform="rotate(18 9 2)" />
        <ellipse cx="0" cy="5" rx="6" ry="5" fill={petalColor} />
      </g>
    ))}
  </g>
);

/** 28. Bell Freesia Spray SVG Component */
export const FreesiaSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor, hideStem }) => (
  <g>
    {/* Arching Freesia Stem */}
    <path d={hideStem ? 'M-4,14 C-8,-6 4,-22 28,-42' : 'M0,155 C-8,75 -12,5 28,-42'} stroke="#15803d" strokeWidth="4.5" fill="none" strokeLinecap="round" />
    {!hideStem && (
      <path d="M-2,120 C-24,78 -22,42 -8,25" stroke="#22c55e" strokeWidth="4" fill="none" strokeLinecap="round" />
    )}
    {[
      { x: -6, y: -6, s: 1.05, r: -28 },
      { x: 6, y: -20, s: 0.95, r: -18 },
      { x: 18, y: -32, s: 0.82, r: -8 },
      { x: 28, y: -42, s: 0.62, r: 5 }
    ].map((f, idx) => (
      <g key={idx} transform={`translate(${f.x}, ${f.y}) rotate(${f.r}) scale(${f.s})`}>
        <path d="M0,10 C-14,0 -18,-18 -8,-24 C0,-20 8,-20 8,-24 C18,-18 14,0 0,10 Z" fill={petalColor} />
        <circle cx="-5" cy="-20" r="6" fill={petalColor} />
        <circle cx="5" cy="-20" r="6" fill={petalColor} />
        <circle cx="0" cy="-22" r="6.5" fill={petalColor} />
        <circle cx="0" cy="-12" r="4.5" fill={centerColor} opacity="0.85" />
      </g>
    ))}
  </g>
);

/** 29. Velvet Pampas Grass Plume (Filler) SVG Component */
export const PampasSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor, hideStem }) => (
  <g>
    {!hideStem && (
      <path d="M0,155 L0,10" stroke={centerColor} strokeWidth="3.8" strokeLinecap="round" />
    )}
    {/* Feathery Layered Plume */}
    <ellipse cx="0" cy="-32" rx="18" ry="48" fill={petalColor} opacity="0.55" />
    <ellipse cx="-5" cy="-28" rx="12" ry="42" fill={petalColor} opacity="0.75" transform="rotate(-6 -5 -28)" />
    <ellipse cx="5" cy="-28" rx="12" ry="42" fill={petalColor} opacity="0.75" transform="rotate(6 5 -28)" />
    <path
      d="M0,12 C-16,-8 -14,-56 0,-78 C14,-56 16,-8 0,12 Z"
      fill={petalColor}
      stroke="#ffffff"
      strokeWidth="0.9"
      strokeOpacity="0.6"
    />
    {/* Gossamer Feather Wisps */}
    <path
      d="M0,4 L-14,-14 M0,-10 L15,-28 M0,-24 L-13,-42 M0,-38 L12,-56 M0,-52 L-8,-68"
      stroke={centerColor}
      strokeWidth="1.1"
      strokeLinecap="round"
      opacity="0.45"
    />
  </g>
);

/** 30. Queen Anne's Lace Umbel (Filler) SVG Component */
export const QueenAnnesLaceSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor, hideStem }) => {
  const spokes = [-36, -22, -8, 8, 22, 36];
  return (
    <g>
      {!hideStem && (
        <path d="M0,152 Q-3,65 0,4" stroke="#16a34a" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      )}
      {spokes.map((x, idx) => {
        const y = -28 - (2.5 - Math.abs(idx - 2.5)) * 8;
        return (
          <g key={idx}>
            <line x1="0" y1="4" x2={x} y2={y} stroke={centerColor} strokeWidth="1.5" />
            <circle cx={x} cy={y} r="9" fill={petalColor} fillOpacity="0.88" />
            <circle cx={x - 3} cy={y - 2} r="3" fill="#ffffff" />
            <circle cx={x + 3} cy={y - 2} r="3" fill="#ffffff" />
            <circle cx={x} cy={y + 3} r="3" fill="#ffffff" />
          </g>
        );
      })}
      {/* Characteristic Tiny Ruby Center Floret of Queen Anne's Lace */}
      <circle cx="0" cy="-36" r="2.6" fill="#881337" />
    </g>
  );
};

/** 31. Feathered Astilbe Plume (Filler) SVG Component */
export const AstilbeSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor, hideStem }) => (
  <g>
    <path d={hideStem ? 'M0,12 L0,-68' : 'M0,152 L0,-68'} stroke={centerColor} strokeWidth="3" strokeLinecap="round" />
    {[
      { x: -16, y: -10, h: 28, a: -28 },
      { x: 16, y: -14, h: 28, a: 28 },
      { x: -12, y: -28, h: 24, a: -24 },
      { x: 12, y: -32, h: 24, a: 24 },
      { x: -8, y: -46, h: 18, a: -20 },
      { x: 8, y: -48, h: 18, a: 20 },
      { x: 0, y: -62, h: 22, a: 0 }
    ].map((b, idx) => (
      <g key={idx} transform={`translate(${b.x}, ${b.y}) rotate(${b.a})`}>
        <ellipse cx="0" cy="0" rx="5.5" ry={b.h / 2} fill={petalColor} opacity="0.88" />
        <circle cx="0" cy={-b.h / 3} r="2.5" fill="#ffffff" opacity="0.45" />
      </g>
    ))}
  </g>
);

/** 32. Gilded Celestial Rose (Luxury Shimmering Focal Bloom) */
export const CelestialRoseSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor, hideStem }) => (
  <g>
    {!hideStem && (
      <g>
        <path d="M0,152 Q-4,75 0,10" stroke="#15803d" strokeWidth="4.6" fill="none" strokeLinecap="round" />
        {/* 24k Gold-Edged Botanical Rose Leaves */}
        <path
          d="M-2,65 C-28,58 -36,42 -16,38 C-4,40 -1,54 -2,65 Z"
          fill="#16a34a"
          stroke="#FDE68A"
          strokeWidth="1.2"
        />
        <path
          d="M2,84 C28,77 36,61 16,57 C4,59 1,73 2,84 Z"
          fill="#16a34a"
          stroke="#FDE68A"
          strokeWidth="1.2"
        />
      </g>
    )}
    {/* Radiant Golden Starlight Halo Behind Bloom */}
    <circle cx="0" cy="-16" r="46" fill={centerColor} fillOpacity="0.16" />
    <circle
      cx="0"
      cy="-16"
      r="43"
      fill="none"
      stroke="#FDE68A"
      strokeWidth="1"
      strokeDasharray="3 3"
      opacity="0.7"
    />
    {/* Outer 6 Sculpted Velvet Petals with 24k Gold-Leaf Rim */}
    {[0, 60, 120, 180, 240, 300].map((deg) => (
      <g key={`cr-out-${deg}`} transform={`translate(0, -16) rotate(${deg})`}>
        <path
          d="M0,0 C-24,-10 -32,-38 0,-43 C32,-38 24,-10 0,0 Z"
          fill={petalColor}
          stroke="#FDE68A"
          strokeWidth="1.5"
        />
        <path
          d="M0,-6 Q-10,-24 -4,-36 M0,-6 Q10,-24 4,-36"
          fill="none"
          stroke="#FFFDF9"
          strokeWidth="0.9"
          opacity="0.55"
        />
      </g>
    ))}
    {/* Middle 6 Spiral Cupped Petals with Shimmering Highlight */}
    {[30, 90, 150, 210, 270, 330].map((deg) => (
      <g key={`cr-mid-${deg}`} transform={`translate(0, -16) rotate(${deg})`}>
        <path
          d="M0,0 C-18,-8 -24,-29 0,-33 C24,-29 18,-8 0,0 Z"
          fill={petalColor}
          fillOpacity="0.92"
          stroke="#FEF08A"
          strokeWidth="1.4"
        />
        <path
          d="M-10,-22 Q0,-28 10,-22"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.1"
          opacity="0.65"
        />
      </g>
    ))}
    {/* Inner Velvet Corolla */}
    {[0, 72, 144, 216, 288].map((deg) => (
      <path
        key={`cr-in-${deg}`}
        transform={`translate(0, -16) rotate(${deg})`}
        d="M0,0 C-12,-6 -15,-19 0,-22 C15,-19 12,-6 0,0 Z"
        fill={petalColor}
        stroke="#FDE047"
        strokeWidth="1.3"
      />
    ))}
    {/* Glowing 24k Gold Starburst Heart */}
    <circle cx="0" cy="-16" r="9.5" fill={centerColor} stroke="#FFFDF9" strokeWidth="1.2" />
    <path
      d="M0,-28 L2.4,-18.4 L12,-16 L2.4,-13.6 L0,-4 L-2.4,-13.6 L-12,-16 L-2.4,-18.4 Z"
      fill="#FFFDF9"
      opacity="0.92"
    />
    {/* Glimmering 4-Point Starlight Sparkles & Gold Dust Motes */}
    <g fill="#FEF08A" stroke="#F59E0B" strokeWidth="0.4">
      <path d="M-36,-46 L-34.5,-41.5 L-30,-40 L-34.5,-38.5 L-36,-34 L-37.5,-38.5 L-42,-40 L-37.5,-41.5 Z" />
      <path d="M37,-42 L38.3,-38.3 L42,-37 L38.3,-35.7 L37,-32 L35.7,-35.7 L32,-37 L35.7,-38.3 Z" />
      <path d="M0,-62 L1.2,-58.2 L5,-57 L1.2,-55.8 L0,-52 L-1.2,-55.8 L-5,-57 L-1.2,-58.2 Z" />
      <circle cx="-41" cy="-12" r="2.2" fill="#FFFDF9" />
      <circle cx="41" cy="-8" r="2.2" fill="#FFFDF9" />
      <circle cx="-24" cy="-54" r="1.8" fill="#FDE047" />
      <circle cx="25" cy="-53" r="1.8" fill="#FDE047" />
    </g>
  </g>
);

/** 33. Crystal Moonbow Orchid (Luxury Iridescent Prism Orchid) */
export const CrystalOrchidSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor, hideStem }) => (
  <g>
    {!hideStem && (
      <path d="M0,152 Q5,72 0,8" stroke="#0f766e" strokeWidth="4.4" fill="none" strokeLinecap="round" />
    )}
    {/* Iridescent Crystal Halo */}
    <circle cx="0" cy="-18" r="46" fill={petalColor} fillOpacity="0.18" />
    {/* Upper & Lateral Crystalline Sepals with Prism Facet Lines */}
    <path
      d="M0,-16 C-18,-36 -16,-62 0,-66 C16,-62 18,-36 0,-16 Z"
      fill={petalColor}
      stroke="#FFFDF9"
      strokeWidth="1.6"
    />
    <path
      d="M0,-14 C-16,4 -38,14 -42,2 C-44,-10 -22,-20 0,-14 Z"
      fill={petalColor}
      stroke="#FFFDF9"
      strokeWidth="1.5"
    />
    <path
      d="M0,-14 C16,4 38,14 42,2 C44,-10 22,-20 0,-14 Z"
      fill={petalColor}
      stroke="#FFFDF9"
      strokeWidth="1.5"
    />
    {/* Oversized Winged Phalaenopsis Petals with Opalescent Shimmer & Gold Rim */}
    <path
      d="M-2,-16 C-26,-44 -52,-36 -48,-12 C-45,8 -20,2 -2,-16 Z"
      fill={petalColor}
      stroke="#FDE68A"
      strokeWidth="1.6"
    />
    <path
      d="M2,-16 C26,-44 52,-36 48,-12 C45,8 20,2 2,-16 Z"
      fill={petalColor}
      stroke="#FDE68A"
      strokeWidth="1.6"
    />
    {/* Crystalline Prism Shimmer Facets Inside Wings */}
    <path
      d="M-8,-18 C-24,-34 -40,-28 -38,-14 C-36,-2 -20,-6 -8,-18 Z M8,-18 C24,-34 40,-28 38,-14 C36,-2 20,-6 8,-18 Z"
      fill="#FFFFFF"
      fillOpacity="0.48"
    />
    <path
      d="M0,-22 L0,-56 M-6,-18 L-38,-22 M6,-18 L38,-22"
      stroke="#FFFDF9"
      strokeWidth="1.2"
      strokeLinecap="round"
      opacity="0.8"
    />
    {/* Sculpted 24k Gold & Pearl Labellum (Lip) */}
    <path
      d="M0,-14 C-16,-12 -18,12 0,16 C18,12 16,-12 0,-14 Z"
      fill={centerColor}
      stroke="#FFFDF9"
      strokeWidth="1.5"
    />
    <circle cx="0" cy="-14" r="5.5" fill="#FFFDF9" stroke={centerColor} strokeWidth="1.4" />
    {/* Hanging Crystal Dew Drops & Diamond Sparkles */}
    <path d="M-28,6 C-31,12 -25,12 -28,6 Z M28,6 C25,12 31,12 28,6 Z" fill="#FFFDF9" />
    <g fill="#FFFDF9">
      <path d="M-38,-44 L-36.5,-39.5 L-32,-38 L-36.5,-36.5 L-38,-32 L-39.5,-36.5 L-44,-38 L-39.5,-39.5 Z" />
      <path d="M38,-44 L39.5,-39.5 L44,-38 L39.5,-36.5 L38,-32 L36.5,-36.5 L32,-38 L36.5,-39.5 Z" />
      <path d="M0,-1 L1.5,3.5 L6,5 L1.5,6.5 L0,11 L-1.5,6.5 L-6,5 L-1.5,3.5 Z" fill="#FEF08A" />
      <circle cx="-22" cy="-52" r="2" fill="#FEF08A" />
      <circle cx="22" cy="-52" r="2" fill="#FEF08A" />
    </g>
  </g>
);

/** 34. Lumina Starlight Peony (Luxury Multi-Layered Silk & Gold Peony) */
export const LuminaPeonySVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor, hideStem }) => (
  <g>
    {!hideStem && (
      <g>
        <path d="M0,152 Q-3,76 0,10" stroke="#15803d" strokeWidth="4.8" fill="none" strokeLinecap="round" />
        <path d="M-2,70 C-26,60 -32,44 -14,42 C-4,44 -1,58 -2,70 Z" fill="#16a34a" stroke="#FDE68A" strokeWidth="1.1" />
        <path d="M2,88 C26,78 32,62 14,60 C4,62 1,76 2,88 Z" fill="#16a34a" stroke="#FDE68A" strokeWidth="1.1" />
      </g>
    )}
    {/* Soft Luminous Champagne Halo */}
    <circle cx="0" cy="-18" r="47" fill={centerColor} fillOpacity="0.2" />
    {/* Outer Crown of 8 Ruffled Silk Peony Petals with Gold Filigree Edge */}
    {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
      <g key={`lp-out-${deg}`} transform={`translate(0, -18) rotate(${deg})`}>
        <path
          d="M0,0 C-22,-14 -28,-42 -8,-44 C0,-46 0,-42 8,-44 C28,-42 22,-14 0,0 Z"
          fill={petalColor}
          stroke="#FDE68A"
          strokeWidth="1.35"
        />
      </g>
    ))}
    {/* Middle Ring of 8 Pearl-Lined Ruffled Petals */}
    {[22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((deg) => (
      <g key={`lp-mid-${deg}`} transform={`translate(0, -18) rotate(${deg})`}>
        <path
          d="M0,0 C-16,-10 -20,-32 0,-35 C20,-32 16,-10 0,0 Z"
          fill={petalColor}
          stroke="#FFFDF9"
          strokeWidth="1.3"
        />
        <path d="M0,-8 L0,-28" stroke="#FFFDF9" strokeWidth="0.9" opacity="0.6" />
      </g>
    ))}
    {/* Inner Cupped Silk Petals */}
    {[0, 60, 120, 180, 240, 300].map((deg) => (
      <path
        key={`lp-in-${deg}`}
        transform={`translate(0, -18) rotate(${deg})`}
        d="M0,0 C-11,-7 -14,-22 0,-24 C14,-22 11,-7 0,0 Z"
        fill="#FFFDF9"
        fillOpacity="0.55"
        stroke={centerColor}
        strokeWidth="1.2"
      />
    ))}
    {/* Radiant Golden Stamen Crown */}
    <circle cx="0" cy="-18" r="12" fill={centerColor} stroke="#FFFDF9" strokeWidth="1.3" />
    {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
      <g key={`lp-st-${deg}`} transform={`translate(0, -18) rotate(${deg})`}>
        <line x1="0" y1="-4" x2="0" y2="-16" stroke="#F59E0B" strokeWidth="1.1" />
        <circle cx="0" cy="-17" r="1.8" fill="#FFFDF9" />
      </g>
    ))}
    {/* Twinkling Starlight Motes */}
    <g fill="#FFFDF9">
      <path d="M-36,-48 L-34.5,-43.5 L-30,-42 L-34.5,-40.5 L-36,-36 L-37.5,-40.5 L-42,-42 L-37.5,-43.5 Z" />
      <path d="M36,-48 L37.5,-43.5 L42,-42 L37.5,-40.5 L36,-36 L34.5,-40.5 L30,-42 L34.5,-43.5 Z" />
      <path d="M0,-24 L1.5,-19.5 L6,-18 L1.5,-16.5 L0,-12 L-1.5,-16.5 L-6,-18 L-1.5,-19.5 Z" />
      <circle cx="-42" cy="-18" r="2.2" fill="#FDE68A" />
      <circle cx="42" cy="-18" r="2.2" fill="#FDE68A" />
    </g>
  </g>
);

/** 35. 24k Gilded Maidenhair Fern (Luxury Metallic Champagne-Gold Foliage Filler) */
export const GildedFernSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor, hideStem }) => (
  <g>
    <path
      d={hideStem ? 'M0,18 Q-4,-24 0,-64' : 'M0,152 Q-6,48 0,-64'}
      stroke={centerColor}
      strokeWidth="3.2"
      fill="none"
      strokeLinecap="round"
    />
    {[
      { x: -3, y: 2, s: 1.05, side: -1 },
      { x: 2, y: -4, s: 1.05, side: 1 },
      { x: -3, y: -16, s: 0.96, side: -1 },
      { x: 2, y: -22, s: 0.96, side: 1 },
      { x: -2, y: -34, s: 0.85, side: -1 },
      { x: 2, y: -40, s: 0.85, side: 1 },
      { x: -1, y: -50, s: 0.72, side: -1 },
      { x: 1, y: -54, s: 0.72, side: 1 },
    ].map((p, idx) => (
      <g
        key={`gf-${idx}`}
        transform={`translate(${p.x}, ${p.y}) scale(${p.side * p.s}, ${p.s})`}
      >
        <path d="M0,0 Q12,-4 22,-12" stroke={centerColor} strokeWidth="1.4" fill="none" />
        {/* Fan-shaped Gilded Gingko/Maidenhair Leaflet with Metallic Gold Rim */}
        <path
          d="M12,-4 C16,-18 32,-20 34,-8 C31,-4 26,-6 24,-2 C20,2 14,0 12,-4 Z"
          fill={petalColor}
          stroke="#FFFDF9"
          strokeWidth="1.1"
        />
        <path
          d="M15,-5 L28,-12 M16,-4 L26,-6"
          stroke={centerColor}
          strokeWidth="0.8"
          opacity="0.65"
        />
      </g>
    ))}
    {/* Apex Gilded Fan Leaflet */}
    <path
      d="M0,-62 C-12,-76 12,-76 0,-62 Z"
      fill={petalColor}
      stroke="#FFFDF9"
      strokeWidth="1.2"
    />
    {/* Shimmering 24k Gold Sparkles Along the Frond */}
    <g fill="#FFFDF9">
      <path d="M-28,-30 L-26.8,-26.2 L-23,-25 L-26.8,-23.8 L-28,-20 L-29.2,-23.8 L-33,-25 L-29.2,-26.2 Z" />
      <path d="M28,-46 L29.2,-42.2 L33,-41 L29.2,-39.8 L28,-36 L26.8,-39.8 L23,-41 L26.8,-42.2 Z" />
      <circle cx="-22" cy="-54" r="2" fill="#FDE047" />
      <circle cx="24" cy="-16" r="2" fill="#FDE047" />
      <circle cx="0" cy="-74" r="2.2" fill="#FFFDF9" />
    </g>
  </g>
);

/** 36. Starlight Pearl Gypsophila Spray (Luxury Akoya Pearl & Diamond Filler) */
export const StarlightGypsophilaSVG: React.FC<FlowerSVGProps> = ({
  petalColor,
  centerColor,
  hideStem,
}) => {
  const pearls = [
    { x: -28, y: -22, r: 7.5 },
    { x: 28, y: -24, r: 7.5 },
    { x: -18, y: -42, r: 8.5 },
    { x: 20, y: -44, r: 8.5 },
    { x: 0, y: -32, r: 9 },
    { x: -26, y: -56, r: 6.5 },
    { x: 26, y: -58, r: 6.5 },
    { x: 0, y: -58, r: 8.5 },
  ];
  return (
    <g>
      {!hideStem && (
        <path
          d="M0,152 Q-3,70 0,8"
          stroke={centerColor}
          strokeWidth="3.2"
          fill="none"
          strokeLinecap="round"
        />
      )}
      {/* Fine Golden Filigree Branches */}
      <g stroke={centerColor} strokeWidth="1.5" fill="none" strokeLinecap="round">
        <path d="M0,8 Q-14,-8 -28,-22 M0,2 Q14,-10 28,-24" />
        <path d="M0,0 Q-10,-22 -18,-42 M0,-2 Q10,-24 20,-44" />
        <path d="M-12,-28 Q-20,-42 -26,-56 M12,-30 Q20,-44 26,-58" />
        <line x1="0" y1="8" x2="0" y2="-58" />
      </g>
      {/* Glowing Akoya Pearl Blossoms with Specular Sheen & Gold Halo */}
      {pearls.map((p, idx) => (
        <g key={`sg-${idx}`} transform={`translate(${p.x}, ${p.y})`}>
          <circle cx="0" cy="0" r={p.r + 3.5} fill={centerColor} fillOpacity="0.22" />
          <circle
            cx="0"
            cy="0"
            r={p.r}
            fill={petalColor}
            stroke={centerColor}
            strokeWidth="1.2"
          />
          <circle cx={-p.r * 0.32} cy={-p.r * 0.32} r={p.r * 0.34} fill="#FFFFFF" />
          <circle cx={p.r * 0.25} cy={p.r * 0.25} r={p.r * 0.16} fill={centerColor} />
        </g>
      ))}
      {/* Twinkling 4-Point Diamond Starlight Glints */}
      <g fill="#FFFDF9" stroke={centerColor} strokeWidth="0.35">
        <path d="M0,-72 L1.5,-66.5 L7,-65 L1.5,-63.5 L0,-58 L-1.5,-63.5 L-7,-65 L-1.5,-66.5 Z" />
        <path d="M-38,-38 L-36.8,-34.2 L-33,-33 L-36.8,-31.8 L-38,-28 L-39.2,-31.8 L-43,-33 L-39.2,-34.2 Z" />
        <path d="M38,-40 L39.2,-36.2 L43,-35 L39.2,-33.8 L38,-30 L36.8,-33.8 L33,-35 L36.8,-36.2 Z" />
      </g>
    </g>
  );
};

export const FlowerRenderer: React.FC<{ type: FlowerType } & FlowerSVGProps> = ({
  type,
  petalColor,
  centerColor,
  hideStem
}) => {
  switch (type) {
    case 'rose':
      return <RoseSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'tulip':
      return <TulipSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'sunflower':
      return <SunflowerSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'daisy':
      return <DaisySVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'lily':
      return <LilySVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'peony':
      return <PeonySVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'orchid':
      return <OrchidSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'carnation':
      return <CarnationSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'ranunculus':
      return <RanunculusSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'anemone':
      return <AnemoneSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'dahlia':
      return <DahliaSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'celestialRose':
      return <CelestialRoseSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'crystalOrchid':
      return <CrystalOrchidSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'luminaPeony':
      return <LuminaPeonySVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'iris':
      return <IrisSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'camellia':
      return <CamelliaSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'lotus':
      return <LotusSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'callalily':
      return <CallaLilySVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'poppy':
      return <PoppySVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'sweetpea':
      return <SweetPeaSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'freesia':
      return <FreesiaSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'lavender':
      return <LavenderSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'hydrangea':
      return <HydrangeaSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'babysBreath':
      return <BabysBreathSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'eucalyptus':
      return <EucalyptusSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'fern':
      return <FernSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'cherryBlossom':
      return <CherryBlossomSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'waxflower':
      return <WaxflowerSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'billyButtons':
      return <BillyButtonsSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'gildedFern':
      return <GildedFernSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'starlightGypsophila':
      return <StarlightGypsophilaSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'oliveBranch':
      return <OliveBranchSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'monstera':
      return <MonsteraSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'pampas':
      return <PampasSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'queenanneslace':
      return <QueenAnnesLaceSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'astilbe':
      return <AstilbeSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'cosmos':
      return <CosmosSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'magnolia':
      return <MagnoliaSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'hibiscus':
      return <HibiscusSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'zinnia':
      return <ZinniaSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'marigold':
      return <MarigoldSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'morningGlory':
      return <MorningGlorySVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'plumeria':
      return <PlumeriaSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'forgetMeNot':
      return <ForgetMeNotSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'lilyOfTheValley':
      return <LilyOfTheValleySVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'delphinium':
      return <DelphiniumSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'auroraGardenia':
      return <AuroraGardeniaSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'velvetBaccara':
      return <VelvetBaccaraSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'imperialFritillaria':
      return <ImperialFritillariaSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'julietAustinRose':
      return <JulietAustinRoseSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'lunariaHonesty':
      return <LunariaHonestySVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'monarchButterfly':
      return <MonarchButterflySVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'crystalButterfly':
      return <CrystalButterflySVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'velvetHeartPick':
      return <VelvetHeartPickSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'doubleHeartCharm':
      return <DoubleHeartCharmSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'starburstSparkle':
      return <StarburstSparkleSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'cupidArrowPick':
      return <CupidArrowPickSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'lovebirdPerch':
      return <LovebirdPerchSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'waxSealCrest':
      return <WaxSealCrestSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'fairyLightGarland':
      return <FairyLightGarlandSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'ribbonBowPick':
      return <RibbonBowPickSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'sittingDog':
      return <SittingDogSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'lovelyCats':
      return <LovelyCatsSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'moon':
      return <CrescentMoonSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'sun':
      return <RadiantSunSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'gildedSunburst':
      return <GildedSunburstSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'sunbeamSuncatcher':
      return <SunbeamSuncatcherSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'star':
      return <CelestialStarSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'clouds':
      return <DreamyCloudsSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'chocolates':
      return <ChocolateBoxSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'ringInABox':
      return <RingInBoxSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'poinsettia':
      return <PoinsettiaSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'hollyBerries':
      return <HollyBerriesSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'mistletoeBough':
      return <MistletoeBoughSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'amaryllis':
      return <AmaryllisSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'hellebore':
      return <HelleboreSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'frostedPinecone':
      return <FrostedPineconeSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'crystalSnowflake':
      return <CrystalSnowflakeSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'candyCanePick':
      return <CandyCanePickSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'glassOrnament':
      return <GlassOrnamentSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'gingerbreadHeart':
      return <GingerbreadHeartSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'sleighBellsPick':
      return <SleighBellsPickSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
    case 'cinnamonStarAnise':
      return <CinnamonStarAniseSVG petalColor={petalColor} centerColor={centerColor} hideStem={hideStem} />;
  }
};

