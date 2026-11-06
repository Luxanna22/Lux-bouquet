import React from 'react';
import { FlowerType } from '../../types/bouquet';

// ============================================================================
// MODULE 2: flowers/ — 11 INLINE SVG BOTANICAL COMPONENTS
// ============================================================================

export interface FlowerSVGProps {
  petalColor: string;
  centerColor: string;
}

/** 1. Rose SVG Component */
export const RoseSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => (
  <g>
    {/* Stem & Leaves */}
    <path d="M0,18 Q-4,85 0,155" stroke="#15803d" strokeWidth="6" fill="none" strokeLinecap="round" />
    <path d="M-2,75 C-28,65 -34,42 -12,48 C-4,52 -2,66 -2,75 Z" fill="#22c55e" />
    <path d="M2,95 C28,85 34,62 12,68 C4,72 2,86 2,95 Z" fill="#16a34a" />
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
export const TulipSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => (
  <g>
    {/* Stem & Long Clasping Leaf */}
    <path d="M0,22 Q3,90 0,160" stroke="#16a34a" strokeWidth="6.5" fill="none" strokeLinecap="round" />
    <path d="M-2,135 C-32,85 -26,35 -8,18 C-12,62 -8,100 -2,135 Z" fill="#22c55e" />
    <path d="M2,140 C30,90 28,42 10,24 C12,65 8,105 2,140 Z" fill="#15803d" />
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
export const LilySVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => {
  const angles = [0, 60, 120, 180, 240, 300];
  return (
    <g>
      <path d="M0,22 Q-3,90 0,160" stroke="#15803d" strokeWidth="5.5" fill="none" strokeLinecap="round" />
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
export const PeonySVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => (
  <g>
    <path d="M0,25 Q2,90 0,155" stroke="#15803d" strokeWidth="6" fill="none" strokeLinecap="round" />
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
export const LavenderSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => (
  <g>
    {/* 3 Graceful Stems */}
    <path d="M0,150 Q-12,60 -18,-55" stroke="#4d7c0f" strokeWidth="3.5" fill="none" strokeLinecap="round" />
    <path d="M0,150 Q0,50 0,-70" stroke="#65a30d" strokeWidth="4" fill="none" strokeLinecap="round" />
    <path d="M0,150 Q12,60 18,-50" stroke="#4d7c0f" strokeWidth="3.5" fill="none" strokeLinecap="round" />
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
export const HydrangeaSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => {
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
      <path d="M0,25 Q0,95 0,160" stroke="#15803d" strokeWidth="6.5" fill="none" strokeLinecap="round" />
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
export const BabysBreathSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => {
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
        <path d="M0,150 L0,-62" />
        <path d="M0,65 Q-18,10 -34,-42" />
        <path d="M0,65 Q18,10 35,-40" />
        <path d="M0,25 Q-14,-20 -18,-58" />
        <path d="M0,25 Q14,-20 20,-56" />
        <path d="M0,45 Q-18,15 -26,-20" />
        <path d="M0,45 Q18,15 28,-14" />
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
export const EucalyptusSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => {
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
      <path d="M0,150 Q-4,45 0,-60" stroke={centerColor} strokeWidth="3.5" fill="none" strokeLinecap="round" />
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
export const OrchidSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => (
  <g>
    {/* Graceful arching orchid stem & aerial bud */}
    <path d="M0,155 C-6,85 -10,10 6,-62" stroke="#15803d" strokeWidth="4.8" fill="none" strokeLinecap="round" />
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
export const RanunculusSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => {
  const ring1 = [0, 40, 80, 120, 160, 200, 240, 280, 320];
  const ring2 = [20, 65, 110, 155, 200, 245, 290, 335];
  const ring3 = [0, 51, 102, 153, 204, 255, 306];
  const ring4 = [25, 85, 145, 205, 265, 325];
  return (
    <g>
      <path d="M0,22 Q-3,88 0,155" stroke="#16a34a" strokeWidth="5.8" fill="none" strokeLinecap="round" />
      <path d="M-2,82 C-28,70 -30,48 -10,54 Z" fill="#22c55e" />
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
export const AnemoneSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => {
  const petals = [0, 45, 90, 135, 180, 225, 270, 315];
  const stamens = Array.from({ length: 16 }, (_, i) => i * 22.5);
  return (
    <g>
      <path d="M0,22 Q3,90 0,156" stroke="#15803d" strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M-2,65 C-28,55 -30,36 -10,44 Z" fill="#16a34a" />
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
export const WaxflowerSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => {
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
        <path d="M0,150 L0,-56" />
        <path d="M0,45 Q-16,0 -26,-38" />
        <path d="M0,45 Q16,0 26,-34" />
        <path d="M0,65 Q-12,25 -16,-12" />
        <path d="M0,65 Q12,25 18,-8" />
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

export const FlowerRenderer: React.FC<{ type: FlowerType } & FlowerSVGProps> = ({
  type,
  petalColor,
  centerColor
}) => {
  switch (type) {
    case 'rose':
      return <RoseSVG petalColor={petalColor} centerColor={centerColor} />;
    case 'tulip':
      return <TulipSVG petalColor={petalColor} centerColor={centerColor} />;
    case 'sunflower':
      return <SunflowerSVG petalColor={petalColor} centerColor={centerColor} />;
    case 'daisy':
      return <DaisySVG petalColor={petalColor} centerColor={centerColor} />;
    case 'lily':
      return <LilySVG petalColor={petalColor} centerColor={centerColor} />;
    case 'peony':
      return <PeonySVG petalColor={petalColor} centerColor={centerColor} />;
    case 'orchid':
      return <OrchidSVG petalColor={petalColor} centerColor={centerColor} />;
    case 'carnation':
      return <CarnationSVG petalColor={petalColor} centerColor={centerColor} />;
    case 'ranunculus':
      return <RanunculusSVG petalColor={petalColor} centerColor={centerColor} />;
    case 'anemone':
      return <AnemoneSVG petalColor={petalColor} centerColor={centerColor} />;
    case 'dahlia':
      return <DahliaSVG petalColor={petalColor} centerColor={centerColor} />;
    case 'iris':
      return <IrisSVG petalColor={petalColor} centerColor={centerColor} />;
    case 'camellia':
      return <CamelliaSVG petalColor={petalColor} centerColor={centerColor} />;
    case 'lotus':
      return <LotusSVG petalColor={petalColor} centerColor={centerColor} />;
    case 'lavender':
      return <LavenderSVG petalColor={petalColor} centerColor={centerColor} />;
    case 'hydrangea':
      return <HydrangeaSVG petalColor={petalColor} centerColor={centerColor} />;
    case 'babysBreath':
      return <BabysBreathSVG petalColor={petalColor} centerColor={centerColor} />;
    case 'eucalyptus':
      return <EucalyptusSVG petalColor={petalColor} centerColor={centerColor} />;
    case 'fern':
      return <FernSVG petalColor={petalColor} centerColor={centerColor} />;
    case 'cherryBlossom':
      return <CherryBlossomSVG petalColor={petalColor} centerColor={centerColor} />;
    case 'waxflower':
      return <WaxflowerSVG petalColor={petalColor} centerColor={centerColor} />;
    case 'billyButtons':
      return <BillyButtonsSVG petalColor={petalColor} centerColor={centerColor} />;
    case 'oliveBranch':
      return <OliveBranchSVG petalColor={petalColor} centerColor={centerColor} />;
    case 'monstera':
      return <MonsteraSVG petalColor={petalColor} centerColor={centerColor} />;
  }
};

