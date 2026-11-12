import React from 'react';
import { FlowerSVGProps } from './FlowerRenderer';

// ============================================================================
// EXTENDED BOTANICALS, COUTURE BLOOMS, 'OTHERS' ACCENTS & 'SEASONAL' DESIGNS
// ============================================================================

/** 37. Garden Cosmos (Pleated saucer petals with radial creases) */
export const CosmosSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor, hideStem }) => {
  const angles = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <g>
      {!hideStem && (
        <>
          <path d="M0,18 Q-3,85 0,152" stroke="#16a34a" strokeWidth="4.2" fill="none" strokeLinecap="round" />
          <path d="M-2,68 Q-22,56 -28,42 M-10,60 Q-18,46 -14,36" stroke="#22c55e" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M2,88 Q22,76 28,62 M10,80 Q18,66 14,56" stroke="#22c55e" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </>
      )}
      {angles.map((deg) => (
        <g key={`cos-${deg}`} transform={`rotate(${deg})`}>
          <path
            d="M0,-6 C-13,-16 -17,-38 -8,-44 C-4,-42 -2,-45 0,-43 C2,-45 4,-42 8,-44 C17,-38 13,-16 0,-6 Z"
            fill={petalColor}
            stroke="#ffffff"
            strokeWidth="0.9"
            strokeOpacity="0.45"
          />
          <line x1="-3" y1="-12" x2="-5" y2="-36" stroke={centerColor} strokeWidth="0.8" opacity="0.45" />
          <line x1="3" y1="-12" x2="5" y2="-36" stroke={centerColor} strokeWidth="0.8" opacity="0.45" />
        </g>
      ))}
      <circle cx="0" cy="0" r="12" fill={centerColor} stroke="#ca8a04" strokeWidth="1.4" />
      <circle cx="-3" cy="-3" r="4" fill="#ffffff" opacity="0.35" />
    </g>
  );
};

/** 38. Empress Magnolia (Sculpted porcelain-ivory goblet on architectural woody twig) */
export const MagnoliaSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor, hideStem }) => (
  <g>
    {!hideStem && (
      <>
        <path d="M0,22 Q-5,88 2,154" stroke="#5c4033" strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M-2,64 Q-22,52 -30,38" stroke="#5c4033" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <ellipse cx="-30" cy="36" rx="8" ry="5" transform="rotate(-30 -30 36)" fill="#84a98c" />
      </>
    )}
    {/* Back Tepals */}
    <path d="M0,12 C-24,-8 -26,-44 0,-54 C26,-44 24,-8 0,12 Z" fill={petalColor} stroke={centerColor} strokeWidth="1.1" strokeOpacity="0.35" />
    <path d="M-4,14 C-38,2 -42,-34 -18,-46 C-4,-32 -2,-4 -4,14 Z" fill={petalColor} opacity="0.94" />
    <path d="M4,14 C38,2 42,-34 18,-46 C4,-32 2,-4 4,14 Z" fill={petalColor} opacity="0.94" />
    {/* Rose-Magenta Base Flush */}
    <ellipse cx="0" cy="-2" rx="18" ry="16" fill={centerColor} opacity="0.38" />
    {/* Front Cupping Tepals */}
    <path
      d="M0,18 C-28,14 -30,-24 -12,-38 C-2,-22 -2,4 0,18 Z"
      fill={petalColor}
      stroke="#ffffff"
      strokeWidth="1.2"
    />
    <path
      d="M0,18 C28,14 30,-24 12,-38 C2,-22 2,4 0,18 Z"
      fill={petalColor}
      stroke="#ffffff"
      strokeWidth="1.2"
    />
    <path
      d="M0,20 C-16,12 -16,-22 0,-34 C16,-22 16,12 0,20 Z"
      fill={petalColor}
      stroke={centerColor}
      strokeWidth="1.1"
      strokeOpacity="0.5"
    />
    {/* Fuzzy Calyx Base */}
    <path d="M-11,16 Q0,26 11,16 Q0,21 -11,16 Z" fill="#6b705c" />
  </g>
);

/** 39. Tropical Hibiscus (Ruffled 5-petal island bloom with long golden stamen style) */
export const HibiscusSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor, hideStem }) => {
  const angles = [0, 72, 144, 216, 288];
  return (
    <g>
      {!hideStem && (
        <>
          <path d="M0,20 Q4,86 0,152" stroke="#15803d" strokeWidth="5.5" fill="none" strokeLinecap="round" />
          <path d="M2,78 C28,68 34,46 14,50 C4,54 2,68 2,78 Z" fill="#16a34a" />
        </>
      )}
      {angles.map((deg) => (
        <g key={`hib-${deg}`} transform={`rotate(${deg})`}>
          <path
            d="M0,0 C-22,-10 -28,-38 -8,-46 C0,-49 8,-49 14,-44 C26,-34 18,-10 0,0 Z"
            fill={petalColor}
            stroke="#ffffff"
            strokeWidth="1"
            strokeOpacity="0.4"
          />
          <path d="M0,-6 Q-4,-24 -2,-36 M0,-6 Q5,-22 6,-34" stroke={centerColor} strokeWidth="0.9" fill="none" opacity="0.45" />
        </g>
      ))}
      <circle cx="0" cy="0" r="11" fill="#be123c" opacity="0.55" />
      {/* Protruding Stamen Column */}
      <path d="M0,0 Q8,-18 16,-34" stroke={petalColor} strokeWidth="3.2" fill="none" strokeLinecap="round" />
      {[
        { x: 10, y: -22 },
        { x: 15, y: -26 },
        { x: 12, y: -30 },
        { x: 18, y: -32 },
        { x: 16, y: -36 },
      ].map((p, i) => (
        <circle key={`hst-${i}`} cx={p.x} cy={p.y} r="2.6" fill={centerColor} stroke="#ffffff" strokeWidth="0.6" />
      ))}
    </g>
  );
};

/** 40. Queen Zinnia (Multi-tiered geometric dahlia-zinnia rosette with golden floret crown) */
export const ZinniaSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor, hideStem }) => {
  const outer = Array.from({ length: 16 }, (_, i) => i * 22.5);
  const inner = Array.from({ length: 12 }, (_, i) => i * 30 + 15);
  return (
    <g>
      {!hideStem && (
        <path d="M0,22 Q-2,88 0,152" stroke="#15803d" strokeWidth="5.8" fill="none" strokeLinecap="round" />
      )}
      {outer.map((deg) => (
        <rect
          key={`zo-${deg}`}
          x="-7"
          y="-44"
          width="14"
          height="28"
          rx="7"
          fill={petalColor}
          stroke="#ffffff"
          strokeWidth="0.8"
          strokeOpacity="0.4"
          transform={`rotate(${deg})`}
        />
      ))}
      {inner.map((deg) => (
        <rect
          key={`zi-${deg}`}
          x="-6"
          y="-32"
          width="12"
          height="22"
          rx="6"
          fill={petalColor}
          stroke={centerColor}
          strokeWidth="0.9"
          strokeOpacity="0.55"
          transform={`rotate(${deg})`}
        />
      ))}
      <circle cx="0" cy="0" r="13" fill="#78350f" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
        <circle
          key={`zf-${deg}`}
          cx="0"
          cy="-12"
          r="2.8"
          fill={centerColor}
          transform={`rotate(${deg})`}
        />
      ))}
      <circle cx="0" cy="0" r="6" fill={centerColor} />
    </g>
  );
};

/** 41. Velvet Marigold (Lush ruffled saffron-and-amber pompon) */
export const MarigoldSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor, hideStem }) => {
  const rings = [
    { count: 14, r: 28, pr: 13, color: petalColor },
    { count: 10, r: 19, pr: 11, color: centerColor },
    { count: 7, r: 10, pr: 9, color: petalColor },
  ];
  return (
    <g>
      {!hideStem && (
        <>
          <path d="M0,20 Q3,88 0,152" stroke="#15803d" strokeWidth="5.5" fill="none" strokeLinecap="round" />
          <path d="M-3,76 L-24,62 M-10,71 L-20,56 M3,92 L24,78" stroke="#16a34a" strokeWidth="2.4" strokeLinecap="round" />
        </>
      )}
      {rings.map((ring, rIdx) =>
        Array.from({ length: ring.count }, (_, i) => (i * 360) / ring.count + rIdx * 14).map((deg) => (
          <circle
            key={`mg-${rIdx}-${deg}`}
            cx="0"
            cy={-ring.r}
            r={ring.pr}
            fill={ring.color}
            stroke="#ffffff"
            strokeWidth="0.9"
            strokeOpacity="0.45"
            transform={`rotate(${deg})`}
          />
        ))
      )}
      <circle cx="0" cy="0" r="7" fill={centerColor} stroke="#ffffff" strokeWidth="1" strokeOpacity="0.5" />
    </g>
  );
};

/** 42. Morning Glory Trumpet (Pentagonal azure funnel with glowing 5-point star throat) */
export const MorningGlorySVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor, hideStem }) => {
  const starAngles = [0, 72, 144, 216, 288];
  return (
    <g>
      {!hideStem && (
        <>
          <path d="M0,18 Q-5,84 0,150" stroke="#16a34a" strokeWidth="4.5" fill="none" strokeLinecap="round" />
          <path d="M2,56 C18,48 22,34 12,30 C6,28 8,40 16,38" stroke="#22c55e" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </>
      )}
      {/* Pentagonal Ruffled Trumpet Rim */}
      <circle cx="0" cy="-4" r="38" fill={petalColor} stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.6" />
      {starAngles.map((deg) => (
        <g key={`mg-ray-${deg}`} transform={`translate(0, -4) rotate(${deg})`}>
          <circle cx="0" cy="-26" r="17" fill={petalColor} />
          <path d="M0,0 L-5,-34 L0,-39 L5,-34 Z" fill={centerColor} opacity="0.88" />
        </g>
      ))}
      <circle cx="0" cy="-4" r="13" fill={centerColor} />
      <circle cx="0" cy="-4" r="5.5" fill="#fde047" />
    </g>
  );
};

/** 43. Island Plumeria / Frangipani (5 overlapping pinwheel petals with sunlit golden core) */
export const PlumeriaSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor, hideStem }) => {
  const angles = [0, 72, 144, 216, 288];
  return (
    <g>
      {!hideStem && (
        <path d="M0,18 Q-2,84 0,148" stroke="#15803d" strokeWidth="5.2" fill="none" strokeLinecap="round" />
      )}
      {angles.map((deg) => (
        <g key={`plu-${deg}`} transform={`rotate(${deg})`}>
          <path
            d="M0,0 C-6,-14 -4,-40 10,-42 C24,-44 26,-18 6,0 Z"
            fill={petalColor}
            stroke="#e2e8f0"
            strokeWidth="0.9"
          />
          <path
            d="M0,0 C-2,-10 0,-22 8,-24 C14,-25 14,-12 4,0 Z"
            fill={centerColor}
            opacity="0.78"
          />
        </g>
      ))}
      <circle cx="0" cy="0" r="6" fill={centerColor} />
    </g>
  );
};

/** 44. Forget-Me-Not Spray (Branching cluster of dainty sky-blue 5-petal blooms) */
export const ForgetMeNotSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor, hideStem }) => {
  const blooms = [
    { x: 0, y: -48, s: 0.95 },
    { x: -24, y: -32, s: 0.9 },
    { x: 24, y: -30, s: 0.9 },
    { x: -14, y: -12, s: 0.85 },
    { x: 16, y: -10, s: 0.85 },
  ];
  return (
    <g>
      {!hideStem && (
        <path d="M0,12 Q-3,82 0,150" stroke="#16a34a" strokeWidth="4" fill="none" strokeLinecap="round" />
      )}
      <path d="M0,12 L0,-48 M0,-6 L-24,-32 M0,-8 L24,-30 M0,6 L-14,-12 M0,4 L16,-10" stroke="#22c55e" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      {blooms.map((b, idx) => (
        <g key={`fmn-${idx}`} transform={`translate(${b.x}, ${b.y}) scale(${b.s})`}>
          {[0, 72, 144, 216, 288].map((deg) => (
            <circle
              key={deg}
              cx="0"
              cy="-10"
              r="7.5"
              fill={petalColor}
              stroke="#ffffff"
              strokeWidth="0.7"
              strokeOpacity="0.5"
              transform={`rotate(${deg})`}
            />
          ))}
          <circle cx="0" cy="0" r="5" fill="#ffffff" />
          <circle cx="0" cy="0" r="3.2" fill={centerColor} />
        </g>
      ))}
    </g>
  );
};

/** 45. Lily of the Valley / Muguet (Sweeping emerald leaf & arching raceme of porcelain bells) */
export const LilyOfTheValleySVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor, hideStem }) => {
  const bells = [
    { x: -4, y: 2, rot: -20, s: 1.0 },
    { x: -10, y: -14, rot: -24, s: 0.95 },
    { x: -14, y: -30, rot: -28, s: 0.9 },
    { x: -12, y: -46, rot: -20, s: 0.82 },
    { x: -4, y: -58, rot: -10, s: 0.75 },
  ];
  return (
    <g>
      {!hideStem && (
        <path d="M4,150 Q2,80 4,18" stroke="#15803d" strokeWidth="4.2" fill="none" strokeLinecap="round" />
      )}
      {/* Clasping Broad Leaf Blade */}
      <path d="M6,32 C34,2 38,-42 16,-62 C4,-36 2,-2 6,32 Z" fill={centerColor} opacity="0.85" />
      {/* Arching Bell Stem */}
      <path d="M4,20 C-14,-8 -20,-42 -2,-64" stroke="#16a34a" strokeWidth="2.8" fill="none" strokeLinecap="round" />
      {bells.map((b, idx) => (
        <g key={`lotv-${idx}`} transform={`translate(${b.x}, ${b.y}) rotate(${b.rot}) scale(${b.s})`}>
          <path d="M0,-8 Q-8,-6 -10,0" stroke="#22c55e" strokeWidth="1.5" fill="none" />
          <path
            d="M-10,0 C-19,2 -20,16 -14,20 L-10,17 L-7,20 C-1,16 -2,2 -10,0 Z"
            fill={petalColor}
            stroke="#e2e8f0"
            strokeWidth="0.9"
          />
          <circle cx="-10" cy="18" r="2" fill="#fde047" />
        </g>
      ))}
    </g>
  );
};

/** 46. Larkspur Delphinium (Tall tapering sapphire floral spire) */
export const DelphiniumSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor, hideStem }) => {
  const florets = [
    { x: -12, y: 8, s: 1.0 },
    { x: 12, y: 4, s: 1.0 },
    { x: -10, y: -14, s: 0.92 },
    { x: 10, y: -18, s: 0.92 },
    { x: -8, y: -34, s: 0.82 },
    { x: 8, y: -38, s: 0.82 },
    { x: 0, y: -54, s: 0.74 },
  ];
  return (
    <g>
      {!hideStem && (
        <path d="M0,152 Q-2,84 0,18" stroke="#15803d" strokeWidth="4.8" fill="none" strokeLinecap="round" />
      )}
      <line x1="0" y1="22" x2="0" y2="-62" stroke="#16a34a" strokeWidth="3.2" strokeLinecap="round" />
      {florets.map((f, idx) => (
        <g key={`del-${idx}`} transform={`translate(${f.x}, ${f.y}) scale(${f.s})`}>
          {[0, 72, 144, 216, 288].map((deg) => (
            <ellipse
              key={deg}
              cx="0"
              cy="-9"
              rx="6"
              ry="10"
              fill={petalColor}
              stroke="#ffffff"
              strokeWidth="0.6"
              strokeOpacity="0.4"
              transform={`rotate(${deg})`}
            />
          ))}
          <circle cx="0" cy="0" r="4.5" fill={centerColor} />
          <circle cx="0" cy="0" r="2" fill="#fde047" />
        </g>
      ))}
    </g>
  );
};

// ============================================================================
// 5 NEW COUTURE (PREMIUM) FLOWERS
// ============================================================================

/** 47. Opaline Silk Gardenia (Couture spiral ivory rosette with glossy emerald leaves & gold dew) */
export const AuroraGardeniaSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor, hideStem }) => (
  <g>
    {!hideStem && (
      <path d="M0,22 Q-3,88 0,152" stroke="#14532d" strokeWidth="5.8" fill="none" strokeLinecap="round" />
    )}
    {/* Glossy Dark Emerald Couture Leaves Framing the Bloom */}
    {[45, 135, 225, 315].map((deg) => (
      <path
        key={`ag-leaf-${deg}`}
        d="M0,0 C-14,-18 -12,-46 0,-54 C12,-46 14,-18 0,0 Z"
        fill="#065f46"
        stroke={centerColor}
        strokeWidth="0.9"
        transform={`rotate(${deg})`}
      />
    ))}
    {/* Outer Silk Petals */}
    {[0, 60, 120, 180, 240, 300].map((deg) => (
      <path
        key={`ag-out-${deg}`}
        d="M0,0 C-18,-12 -20,-38 0,-42 C20,-38 18,-12 0,0 Z"
        fill={petalColor}
        stroke={centerColor}
        strokeWidth="1"
        strokeOpacity="0.65"
        transform={`rotate(${deg})`}
      />
    ))}
    {/* Mid Spiral Rosette */}
    {[30, 90, 150, 210, 270, 330].map((deg) => (
      <path
        key={`ag-mid-${deg}`}
        d="M0,0 C-14,-8 -15,-28 0,-30 C15,-28 14,-8 0,0 Z"
        fill={petalColor}
        stroke={centerColor}
        strokeWidth="1.1"
        transform={`rotate(${deg})`}
      />
    ))}
    {/* Inner Swirl Heart & 24k Gold Dewdrops */}
    <circle cx="0" cy="0" r="12" fill={petalColor} stroke={centerColor} strokeWidth="1.4" />
    <path d="M-6,-2 C-2,-9 8,-7 6,2 C4,9 -7,8 -8,0" fill="none" stroke={centerColor} strokeWidth="2.2" strokeLinecap="round" />
    <g fill="#FFFDF9" stroke={centerColor} strokeWidth="0.6">
      <circle cx="-26" cy="-24" r="2.8" />
      <circle cx="28" cy="-20" r="2.5" />
      <path d="M0,-48 L1.4,-43.4 L6,-42 L1.4,-40.6 L0,-36 L-1.4,-40.6 L-6,-42 L-1.4,-43.4 Z" fill={centerColor} />
    </g>
  </g>
);

/** 48. Noir Baccara Velvet Rose (Couture deep burgundy-noir rose with 24k gold gilded edges) */
export const VelvetBaccaraSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor, hideStem }) => (
  <g>
    {!hideStem && (
      <>
        <path d="M0,20 Q-4,88 0,154" stroke="#14532d" strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M-2,76 C-28,66 -32,44 -12,50 C-4,54 -2,68 -2,76 Z" fill="#064e3b" stroke={centerColor} strokeWidth="0.8" />
        <path d="M2,94 C28,84 32,62 12,68 C4,72 2,86 2,94 Z" fill="#064e3b" stroke={centerColor} strokeWidth="0.8" />
      </>
    )}
    {/* Velvet Outer Cup with 24k Gold Rim */}
    {[0, 72, 144, 216, 288].map((deg) => (
      <path
        key={`vb-out-${deg}`}
        d="M0,0 C-22,-14 -24,-40 0,-42 C24,-40 22,-14 0,0 Z"
        fill={petalColor}
        stroke={centerColor}
        strokeWidth="1.4"
        transform={`rotate(${deg})`}
      />
    ))}
    {/* Inner Pointed Baccara Folds */}
    {[36, 108, 180, 252, 324].map((deg) => (
      <path
        key={`vb-in-${deg}`}
        d="M0,0 C-15,-10 -16,-28 0,-31 C16,-28 15,-10 0,0 Z"
        fill={petalColor}
        stroke={centerColor}
        strokeWidth="1.3"
        transform={`rotate(${deg})`}
      />
    ))}
    <circle cx="0" cy="0" r="13" fill={petalColor} stroke={centerColor} strokeWidth="1.5" />
    <path d="M-6,0 C-4,-8 6,-8 6,0 C6,6 -4,7 -5,1" fill="none" stroke={centerColor} strokeWidth="2.4" strokeLinecap="round" />
    {/* Gold Dust Glints */}
    <circle cx="-22" cy="-26" r="1.8" fill={centerColor} />
    <circle cx="24" cy="-22" r="1.8" fill={centerColor} />
    <circle cx="0" cy="-36" r="2" fill="#FFFDF9" />
  </g>
);

/** 49. Crown Imperial Bell (Couture Fritillaria with royal hanging bells, pearl drops & leaf crown) */
export const ImperialFritillariaSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor, hideStem }) => (
  <g>
    {!hideStem && (
      <path d="M0,18 Q-2,86 0,152" stroke="#15803d" strokeWidth="6" fill="none" strokeLinecap="round" />
    )}
    {/* Tufted Emerald Crown Above the Bells */}
    <g fill="#16a34a" stroke={centerColor} strokeWidth="0.6">
      <path d="M0,-32 C-8,-48 -4,-62 0,-68 C4,-62 8,-48 0,-32 Z" />
      <path d="M-2,-30 C-18,-44 -24,-56 -16,-62 C-8,-54 -4,-40 -2,-30 Z" />
      <path d="M2,-30 C18,-44 24,-56 16,-62 C8,-54 4,-40 2,-30 Z" />
      <path d="M-4,-28 C-26,-36 -36,-44 -30,-50 C-18,-44 -8,-34 -4,-28 Z" />
      <path d="M4,-28 C26,-36 36,-44 30,-50 C18,-44 8,-34 4,-28 Z" />
    </g>
    {/* Trio of Nodding Royal Bell Blossoms */}
    {[
      { x: -20, y: -24, rot: 22 },
      { x: 20, y: -24, rot: -22 },
      { x: 0, y: -26, rot: 0 },
    ].map((b, idx) => (
      <g key={`frit-${idx}`} transform={`translate(${b.x}, ${b.y}) rotate(${b.rot})`}>
        <path
          d="M0,0 C-14,4 -18,26 -12,38 L-4,34 L0,39 L4,34 L12,38 C18,26 14,4 0,0 Z"
          fill={petalColor}
          stroke={centerColor}
          strokeWidth="1.2"
        />
        {/* Hanging Pearl Nectar Drops */}
        <line x1="-5" y1="35" x2="-5" y2="43" stroke={centerColor} strokeWidth="1.1" />
        <line x1="0" y1="37" x2="0" y2="46" stroke={centerColor} strokeWidth="1.1" />
        <line x1="5" y1="35" x2="5" y2="43" stroke={centerColor} strokeWidth="1.1" />
        <circle cx="-5" cy="44" r="2.2" fill="#FFFDF9" />
        <circle cx="0" cy="47" r="2.5" fill={centerColor} />
        <circle cx="5" cy="44" r="2.2" fill="#FFFDF9" />
      </g>
    ))}
  </g>
);

/** 50. Juliet English Cabbage Rose (Couture quartered hundred-petal rosette) */
export const JulietAustinRoseSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor, hideStem }) => (
  <g>
    {!hideStem && (
      <>
        <path d="M0,22 Q3,88 0,154" stroke="#15803d" strokeWidth="6" fill="none" strokeLinecap="round" />
        <path d="M-2,76 C-26,64 -30,44 -10,50 C-4,54 -2,68 -2,76 Z" fill="#22c55e" />
      </>
    )}
    {/* Outer Cupped Guard Petals */}
    {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
      <circle
        key={`jr-out-${deg}`}
        cx="0"
        cy="-22"
        r="20"
        fill={petalColor}
        stroke="#ffffff"
        strokeWidth="1"
        strokeOpacity="0.55"
        transform={`rotate(${deg})`}
      />
    ))}
    <circle cx="0" cy="0" r="30" fill={petalColor} stroke="#ffffff" strokeWidth="1.2" strokeOpacity="0.6" />
    {/* Four Quartered Inner Chambers (Classic English Austin Rose Geometry) */}
    {[
      { x: -9, y: -9 },
      { x: 9, y: -9 },
      { x: -9, y: 9 },
      { x: 9, y: 9 },
    ].map((q, idx) => (
      <g key={`jr-q-${idx}`} transform={`translate(${q.x}, ${q.y})`}>
        <circle cx="0" cy="0" r="11" fill={centerColor} opacity="0.65" stroke="#fffdf9" strokeWidth="1" />
        <path
          d="M-6,-2 C-3,-8 6,-7 5,1 C4,7 -5,6 -6,0"
          fill="none"
          stroke="#fffdf9"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </g>
    ))}
    <circle cx="0" cy="0" r="4" fill="#fde047" />
  </g>
);

/** 51. Silver Dollar Moonwort / Lunaria (Couture translucent mother-of-pearl seed coins) */
export const LunariaHonestySVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor, hideStem }) => {
  const coins = [
    { x: -20, y: 4, rx: 13, ry: 16, rot: -24 },
    { x: 20, y: -4, rx: 13, ry: 16, rot: 24 },
    { x: -18, y: -28, rx: 12, ry: 15, rot: -20 },
    { x: 18, y: -34, rx: 12, ry: 15, rot: 20 },
    { x: 0, y: -56, rx: 11, ry: 14, rot: 0 },
  ];
  return (
    <g>
      <path
        d={hideStem ? 'M0,18 L0,-46' : 'M0,152 Q-3,64 0,-46'}
        stroke={centerColor}
        strokeWidth="2.8"
        fill="none"
        strokeLinecap="round"
      />
      {coins.map((c, idx) => (
        <g key={`lun-${idx}`} transform={`translate(${c.x}, ${c.y}) rotate(${c.rot})`}>
          <ellipse
            cx="0"
            cy="0"
            rx={c.rx}
            ry={c.ry}
            fill={petalColor}
            fillOpacity="0.82"
            stroke={centerColor}
            strokeWidth="1.3"
          />
          <ellipse cx="-3" cy="-4" rx={c.rx * 0.45} ry={c.ry * 0.45} fill="#ffffff" opacity="0.65" />
          <circle cx="2" cy="3" r="2.2" fill={centerColor} opacity="0.6" />
        </g>
      ))}
    </g>
  );
};

// ============================================================================
// 10 'OTHERS' CATEGORY DESIGNS (BUTTERFLIES, HEARTS, SPARKLES, ROMANTICS & FUN)
// ============================================================================

/** 52. Swallowtail Butterfly (Filigree winged flutter) */
export const MonarchButterflySVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => (
  <g transform="translate(0, -10)">
    {/* Upper Wings */}
    <path
      d="M0,-2 C-18,-36 -48,-32 -44,-6 C-41,10 -18,10 0,2 Z"
      fill={petalColor}
      stroke={centerColor}
      strokeWidth="1.8"
    />
    <path
      d="M0,-2 C18,-36 48,-32 44,-6 C41,10 18,10 0,2 Z"
      fill={petalColor}
      stroke={centerColor}
      strokeWidth="1.8"
    />
    {/* Lower Swallowtail Wings */}
    <path
      d="M0,2 C-22,6 -36,26 -24,36 L-18,44 L-13,35 C-6,32 -2,16 0,2 Z"
      fill={petalColor}
      stroke={centerColor}
      strokeWidth="1.6"
    />
    <path
      d="M0,2 C22,6 36,26 24,36 L18,44 L13,35 C6,32 2,16 0,2 Z"
      fill={petalColor}
      stroke={centerColor}
      strokeWidth="1.6"
    />
    {/* Wing Filigree Veins & Pearl Spots */}
    <path d="M-4,-2 Q-22,-16 -34,-14 M4,-2 Q22,-16 34,-14 M-4,4 Q-16,18 -20,28 M4,4 Q16,18 20,28" stroke={centerColor} strokeWidth="1.2" fill="none" />
    <circle cx="-32" cy="-12" r="3.5" fill="#FFFDF9" />
    <circle cx="32" cy="-12" r="3.5" fill="#FFFDF9" />
    <circle cx="-20" cy="22" r="2.8" fill={centerColor} />
    <circle cx="20" cy="22" r="2.8" fill={centerColor} />
    {/* Body & Curled Antennae */}
    <ellipse cx="0" cy="4" rx="3.2" ry="16" fill="#292524" />
    <path d="M-1,-11 Q-8,-24 -14,-22 M1,-11 Q8,-24 14,-22" stroke="#292524" strokeWidth="1.4" fill="none" strokeLinecap="round" />
  </g>
);

/** 53. Blue Morpho Butterfly (Iridescent azure wings & stardust sparkles) */
export const CrystalButterflySVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => (
  <g transform="translate(0, -10)">
    {/* Dark Velvet Scalloped Outer Frame */}
    <path
      d="M0,-4 C-22,-38 -50,-30 -46,-2 C-42,14 -32,32 -14,34 C-4,35 0,16 0,4 C0,16 4,35 14,34 C32,32 42,14 46,-2 C50,-30 22,-38 0,-4 Z"
      fill={centerColor}
    />
    {/* Inner Iridescent Morpho Wings */}
    <path
      d="M-2,-2 C-18,-30 -41,-24 -38,-2 C-35,12 -26,26 -12,27 C-5,27 -2,12 -2,-2 Z"
      fill={petalColor}
      stroke="#ffffff"
      strokeWidth="1"
      strokeOpacity="0.65"
    />
    <path
      d="M2,-2 C18,-30 41,-24 38,-2 C35,12 26,26 12,27 C5,27 2,12 2,-2 Z"
      fill={petalColor}
      stroke="#ffffff"
      strokeWidth="1"
      strokeOpacity="0.65"
    />
    {/* Margin Pearl Dots & Sparkles */}
    <g fill="#ffffff">
      <circle cx="-41" cy="-8" r="1.8" />
      <circle cx="-39" cy="2" r="1.8" />
      <circle cx="41" cy="-8" r="1.8" />
      <circle cx="39" cy="2" r="1.8" />
      <path d="M0,-32 L1.5,-27.5 L6,-26 L1.5,-24.5 L0,-20 L-1.5,-24.5 L-6,-26 L-1.5,-27.5 Z" />
    </g>
    <ellipse cx="0" cy="4" rx="2.8" ry="14" fill="#1e293b" />
  </g>
);

/** 54. Puffed Velvet Heart (Quilted 3D satin heart charm with golden bow) */
export const VelvetHeartPickSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => (
  <g transform="translate(0, -12)">
    <path
      d="M0,32 C-6,26 -38,4 -38,-16 C-38,-32 -22,-40 -8,-30 C-3,-26 0,-20 0,-20 C0,-20 3,-26 8,-30 C22,-40 38,-32 38,-16 C38,4 6,26 0,32 Z"
      fill={petalColor}
      stroke={centerColor}
      strokeWidth="2"
    />
    {/* 3D Specular Sheen & Quilted Stitching */}
    <path d="M-26,-20 C-26,-28 -16,-30 -10,-24" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.55" />
    <path d="M-18,-26 L18,10 M18,-26 L-18,10" stroke="#ffffff" strokeWidth="0.9" strokeDasharray="3 3" opacity="0.45" />
    {/* Dainty Top Bow & Pearl Clasp */}
    <path d="M0,-20 C-14,-30 -16,-12 -2,-16 Z M0,-20 C14,-30 16,-12 2,-16 Z" fill={centerColor} />
    <circle cx="0" cy="-18" r="3.5" fill="#FFFDF9" stroke={centerColor} strokeWidth="1.2" />
  </g>
);

/** 55. Interlocked Twin Hearts (Linked rose enamel & 24k gold filigree hearts) */
export const DoubleHeartCharmSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => (
  <g transform="translate(0, -10)">
    {/* Left Solid Enamel Heart */}
    <g transform="translate(-12, 0) rotate(-14)">
      <path
        d="M0,24 C-5,18 -28,2 -28,-12 C-28,-24 -16,-30 -6,-22 C-2,-19 0,-14 0,-14 C0,-14 2,-19 6,-22 C16,-30 28,-24 28,-12 C28,2 5,18 0,24 Z"
        fill={petalColor}
        stroke="#FFFDF9"
        strokeWidth="1.5"
      />
      <path d="M-18,-15 C-18,-21 -11,-22 -7,-18" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.6" />
    </g>
    {/* Right Interlocked Open Gold Filigree Heart */}
    <g transform="translate(14, 4) rotate(14)">
      <path
        d="M0,24 C-5,18 -28,2 -28,-12 C-28,-24 -16,-30 -6,-22 C-2,-19 0,-14 0,-14 C0,-14 2,-19 6,-22 C16,-30 28,-24 28,-12 C28,2 5,18 0,24 Z"
        fill="none"
        stroke={centerColor}
        strokeWidth="4"
      />
      <circle cx="18" cy="-16" r="3" fill="#FFFDF9" />
    </g>
  </g>
);

/** 56. Celestial Sparkles (Trio of twinkling 8-point starbursts & pearl halos) */
export const StarburstSparkleSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => (
  <g transform="translate(0, -12)">
    <circle cx="0" cy="0" r="28" fill={petalColor} opacity="0.18" />
    {/* Main Central 8-Point Starburst */}
    <path
      d="M0,-36 L4,-10 L30,-14 L10,-2 L36,0 L10,4 L26,24 L4,10 L0,36 L-4,10 L-26,24 L-10,4 L-36,0 L-10,-2 L-30,-14 L-4,-10 Z"
      fill={petalColor}
      stroke={centerColor}
      strokeWidth="1.2"
    />
    <circle cx="0" cy="0" r="5" fill={centerColor} />
    {/* Companion Twin Stars & Orbiting Pearls */}
    <path
      d="M-28,-28 L-26,-21 L-19,-19 L-26,-17 L-28,-10 L-30,-17 L-37,-19 L-30,-21 Z"
      fill={centerColor}
    />
    <path
      d="M28,-24 L30,-17 L37,-15 L30,-13 L28,-6 L26,-13 L19,-15 L26,-17 Z"
      fill={centerColor}
    />
    <circle cx="-24" cy="22" r="3.5" fill={centerColor} />
    <circle cx="26" cy="20" r="3" fill={petalColor} />
  </g>
);

/** 57. Cupid's Gilded Arrow (Heart-tipped golden arrow & swan feathers) */
export const CupidArrowPickSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => (
  <g transform="translate(0, -10) rotate(-32)">
    {/* Fletched Feathers */}
    <path d="M-38,-2 L-48,-12 L-32,-12 L-24,-2 Z" fill="#FFFDF9" stroke={centerColor} strokeWidth="1.2" />
    <path d="M-38,2 L-48,12 L-32,12 L-24,2 Z" fill="#FFFDF9" stroke={centerColor} strokeWidth="1.2" />
    <path d="M-26,-2 L-36,-11 L-22,-11 L-14,-2 Z" fill={petalColor} opacity="0.85" />
    <path d="M-26,2 L-36,11 L-22,11 L-14,2 Z" fill={petalColor} opacity="0.85" />
    {/* Golden Shaft */}
    <line x1="-42" y1="0" x2="30" y2="0" stroke={centerColor} strokeWidth="4" strokeLinecap="round" />
    {/* Ruby Heart Arrowhead */}
    <path
      d="M44,0 C38,-4 24,-18 16,-14 C10,-11 12,-3 18,0 C12,3 10,11 16,14 C24,18 38,4 44,0 Z"
      fill={petalColor}
      stroke="#FFFDF9"
      strokeWidth="1.4"
    />
    {/* Ribbon Tie in Middle */}
    <circle cx="-4" cy="0" r="4.5" fill={petalColor} stroke="#FFFDF9" strokeWidth="1.2" />
    <path d="M-4,3 Q-10,16 -18,20 M-2,3 Q4,16 10,22" stroke={petalColor} strokeWidth="2.4" fill="none" strokeLinecap="round" />
  </g>
);

/** 58. Porcelain Lovebird (Sculpted white dove carrying a wax-sealed love note) */
export const LovebirdPerchSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => (
  <g transform="translate(0, -12)">
    {/* Raised Back Wing */}
    <path
      d="M-6,-4 C-22,-32 -4,-44 12,-24 C16,-18 10,-6 -6,-4 Z"
      fill={petalColor}
      stroke={centerColor}
      strokeWidth="1.2"
    />
    {/* Dove Body, Tail & Head */}
    <path
      d="M-36,10 L-18,4 C-12,-8 4,-12 16,-10 C26,-8 30,2 22,10 C12,20 -8,20 -18,12 L-32,20 Z"
      fill={petalColor}
      stroke="#cbd5e1"
      strokeWidth="1.2"
    />
    {/* Raised Front Wing */}
    <path
      d="M-4,2 C-28,-18 -20,-38 2,-20 C8,-14 6,-2 -4,2 Z"
      fill={petalColor}
      stroke="#94a3b8"
      strokeWidth="1.2"
    />
    {/* Eye, Rosy Cheek & Beak */}
    <circle cx="20" cy="-3" r="2" fill="#1e293b" />
    <circle cx="17" cy="1" r="3" fill={centerColor} opacity="0.55" />
    <polygon points="27,-3 34,-1 27,2" fill="#f59e0b" />
    {/* Dangling Miniature Love Letter in Beak */}
    <g transform="translate(31, 10) rotate(12)">
      <rect x="-10" y="-7" width="20" height="14" rx="2" fill="#FFFDF9" stroke={centerColor} strokeWidth="1.2" />
      <path d="M-9,-6 L0,2 L9,-6" fill="none" stroke={centerColor} strokeWidth="1.1" />
      <circle cx="0" cy="1" r="2.8" fill="#e11d48" />
    </g>
  </g>
);

/** 59. Royal Wax Seal Medallion (Deckle wax seal embossed with heart crest & silk ribbons) */
export const WaxSealCrestSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => (
  <g transform="translate(0, -10)">
    {/* Trailing Silk Ribbons Behind Seal */}
    <path d="M-8,12 L-24,38 L-16,35 L-12,42 L0,16 Z" fill={centerColor} />
    <path d="M8,12 L24,38 L16,35 L12,42 L0,16 Z" fill={centerColor} opacity="0.9" />
    {/* Organic Scalloped Wax Outer Rim */}
    <circle cx="0" cy="-2" r="26" fill={petalColor} stroke={centerColor} strokeWidth="1.8" strokeDasharray="10 3" />
    <circle cx="0" cy="-2" r="24" fill={petalColor} />
    {/* Recessed Inner Ring */}
    <circle cx="0" cy="-2" r="18" fill={petalColor} stroke={centerColor} strokeWidth="1.6" />
    {/* Embossed Gold Heart Crest */}
    <path
      d="M0,9 C-3,6 -12,-2 -12,-8 C-12,-14 -6,-16 -2,-12 C0,-10 0,-8 0,-8 C0,-8 0,-10 2,-12 C6,-16 12,-14 12,-8 C12,-2 3,6 0,9 Z"
      fill={centerColor}
    />
  </g>
);

/** 60. Firefly Fairy Lights (Looping copper wire strung with warm glowing micro-bulbs) */
export const FairyLightGarlandSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => {
  const bulbs = [
    { x: -34, y: 12 },
    { x: -20, y: -14 },
    { x: 0, y: 4 },
    { x: 20, y: -18 },
    { x: 34, y: 10 },
    { x: 0, y: -34 },
  ];
  return (
    <g transform="translate(0, -8)">
      <path
        d="M-38,18 C-30,-24 -10,-24 0,4 C10,28 30,-28 38,14 M-20,-14 Q0,-46 20,-18"
        fill="none"
        stroke={centerColor}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {bulbs.map((b, idx) => (
        <g key={`fl-${idx}`} transform={`translate(${b.x}, ${b.y})`}>
          <circle cx="0" cy="0" r="11" fill={petalColor} opacity="0.32" />
          <circle cx="0" cy="0" r="5.5" fill={petalColor} stroke={centerColor} strokeWidth="1" />
          <circle cx="-1.5" cy="-1.5" r="2" fill="#ffffff" />
        </g>
      ))}
    </g>
  );
};

/** 61. Coquette Organza Bow Charm (Fluttering double-loop bow with pearl drop) */
export const RibbonBowPickSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => (
  <g transform="translate(0, -10)">
    {/* Long Fluttering Streamer Tails */}
    <path
      d="M-4,0 Q-22,22 -28,44 L-18,40 L-12,46 Q-8,22 0,4 Z"
      fill={petalColor}
      stroke={centerColor}
      strokeWidth="1"
      strokeOpacity="0.45"
    />
    <path
      d="M4,0 Q22,22 28,44 L18,40 L12,46 Q8,22 0,4 Z"
      fill={petalColor}
      stroke={centerColor}
      strokeWidth="1"
      strokeOpacity="0.45"
    />
    {/* Billowy Coquette Bow Loops */}
    <path
      d="M0,-2 C-28,-32 -44,-4 -32,10 C-22,20 -6,6 0,0 Z"
      fill={petalColor}
      stroke="#ffffff"
      strokeWidth="1.4"
    />
    <path
      d="M0,-2 C28,-32 44,-4 32,10 C22,20 6,6 0,0 Z"
      fill={petalColor}
      stroke="#ffffff"
      strokeWidth="1.4"
    />
    {/* Inner Crease Lines */}
    <path d="M-6,-2 Q-20,-10 -24,0 M6,-2 Q20,-10 24,0" stroke={centerColor} strokeWidth="1.4" fill="none" opacity="0.6" />
    {/* Center Knot & Hanging Pearl Drop */}
    <rect x="-7" y="-8" width="14" height="14" rx="5" fill={centerColor} stroke="#ffffff" strokeWidth="1.2" />
    <circle cx="0" cy="13" r="4.5" fill="#FFFDF9" stroke="#fde047" strokeWidth="1.2" />
  </g>
);

// ============================================================================
// 12 'SEASONAL' DESIGNS (CHRISTMAS & WINTER HOLIDAY WONDERLAND)
// ============================================================================

/** 62. Velvet Poinsettia Star (Crimson Yuletide star bracts & golden cyathia berries) */
export const PoinsettiaSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor, hideStem }) => {
  const outer = [0, 60, 120, 180, 240, 300];
  const inner = [30, 90, 150, 210, 270, 330];
  return (
    <g>
      {!hideStem && (
        <path d="M0,22 Q-3,88 0,152" stroke="#14532d" strokeWidth="5.8" fill="none" strokeLinecap="round" />
      )}
      {/* 3 Deep Emerald Lower Leaves */}
      {[40, 160, 280].map((deg) => (
        <path
          key={`poi-g-${deg}`}
          d="M0,0 C-14,-16 -12,-38 0,-46 C12,-38 14,-16 0,0 Z"
          fill="#15803d"
          transform={`rotate(${deg})`}
        />
      ))}
      {/* Outer Pointed Crimson Bracts */}
      {outer.map((deg) => (
        <g key={`poi-o-${deg}`} transform={`rotate(${deg})`}>
          <path
            d="M0,0 C-15,-14 -16,-36 0,-48 C16,-36 15,-14 0,0 Z"
            fill={petalColor}
            stroke="#ffffff"
            strokeWidth="0.7"
            strokeOpacity="0.35"
          />
          <line x1="0" y1="-4" x2="0" y2="-40" stroke="#7f1d1d" strokeWidth="1" opacity="0.55" />
        </g>
      ))}
      {/* Inner Star Bracts */}
      {inner.map((deg) => (
        <path
          key={`poi-i-${deg}`}
          d="M0,0 C-11,-10 -12,-26 0,-35 C12,-26 11,-10 0,0 Z"
          fill={petalColor}
          stroke={centerColor}
          strokeWidth="0.9"
          strokeOpacity="0.55"
          transform={`rotate(${deg})`}
        />
      ))}
      {/* Golden-Green Cyathia Berry Cluster */}
      {[
        { x: 0, y: 0 },
        { x: -6, y: -5 },
        { x: 6, y: -5 },
        { x: -5, y: 5 },
        { x: 5, y: 5 },
      ].map((c, idx) => (
        <circle key={`poi-c-${idx}`} cx={c.x} cy={c.y} r="4.2" fill={centerColor} stroke="#15803d" strokeWidth="1.2" />
      ))}
    </g>
  );
};

/** 63. Variegated Holly & Winter Berries (Prickly emerald leaves & glossy red berry cluster) */
export const HollyBerriesSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor, hideStem }) => (
  <g>
    {!hideStem && (
      <path d="M0,18 Q-2,84 0,148" stroke="#5c4033" strokeWidth="4.8" fill="none" strokeLinecap="round" />
    )}
    {/* 3 Scalloped Spiny Holly Leaves */}
    {[-42, 42, 180].map((deg, idx) => (
      <g key={`hol-${idx}`} transform={`translate(0, -10) rotate(${deg})`}>
        <path
          d="M0,0 C-10,-8 -18,-10 -14,-18 C-8,-22 -16,-30 -10,-36 C-4,-38 -2,-44 0,-48 C2,-44 4,-38 10,-36 C16,-30 8,-22 14,-18 C18,-10 10,-8 0,0 Z"
          fill={centerColor}
          stroke="#fef3c7"
          strokeWidth="1.5"
        />
        <line x1="0" y1="-2" x2="0" y2="-40" stroke="#fef3c7" strokeWidth="1.1" opacity="0.7" />
      </g>
    ))}
    {/* Trio of Glossy Scarlet Winter Berries */}
    {[
      { x: -9, y: -6, r: 8.5 },
      { x: 9, y: -6, r: 8.5 },
      { x: 0, y: -16, r: 9.5 },
    ].map((b, idx) => (
      <g key={`hb-${idx}`} transform={`translate(${b.x}, ${b.y})`}>
        <circle cx="0" cy="0" r={b.r} fill={petalColor} stroke="#7f1d1d" strokeWidth="1" />
        <circle cx={-b.r * 0.3} cy={-b.r * 0.3} r={b.r * 0.28} fill="#ffffff" opacity="0.8" />
      </g>
    ))}
  </g>
);

/** 64. Kissing Mistletoe Bough (Paired sage leaves, snow-pearl berries & crimson ribbon tie) */
export const MistletoeBoughSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor, hideStem }) => (
  <g>
    {!hideStem && (
      <path d="M0,16 Q2,84 0,148" stroke="#15803d" strokeWidth="4.2" fill="none" strokeLinecap="round" />
    )}
    {/* Branching Stems */}
    <path d="M0,14 L0,-34 M0,-4 L-22,-28 M0,-4 L22,-28" stroke="#166534" strokeWidth="2.8" fill="none" strokeLinecap="round" />
    {/* Paired Rounded Mistletoe Paddle Leaves */}
    {[
      { x: -22, y: -28, rot: -35 },
      { x: -12, y: -32, rot: 10 },
      { x: 22, y: -28, rot: 35 },
      { x: 12, y: -32, rot: -10 },
      { x: -8, y: -36, rot: -22 },
      { x: 8, y: -36, rot: 22 },
    ].map((l, idx) => (
      <ellipse
        key={`mt-l-${idx}`}
        cx={l.x}
        cy={l.y}
        rx="7.5"
        ry="16"
        transform={`rotate(${l.rot} ${l.x} ${l.y})`}
        fill={centerColor}
        stroke="#15803d"
        strokeWidth="1"
      />
    ))}
    {/* Lustrous Snow-Pearl Berries */}
    {[
      { x: 0, y: -22 },
      { x: -7, y: -15 },
      { x: 7, y: -15 },
      { x: -16, y: -20 },
      { x: 16, y: -20 },
    ].map((p, idx) => (
      <g key={`mt-p-${idx}`} transform={`translate(${p.x}, ${p.y})`}>
        <circle cx="0" cy="0" r="6" fill={petalColor} stroke="#cbd5e1" strokeWidth="1" />
        <circle cx="-2" cy="-2" r="2" fill="#ffffff" />
      </g>
    ))}
    {/* Festive Crimson Ribbon Tie */}
    <path d="M0,6 C-14,-4 -16,14 -2,10 Z M0,6 C14,-4 16,14 2,10 Z" fill="#e11d48" />
    <circle cx="0" cy="7" r="3.2" fill="#fde047" />
  </g>
);

/** 65. Noel Striped Amaryllis (Candy-striped holiday lily trumpet) */
export const AmaryllisSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor, hideStem }) => {
  const angles = [0, 60, 120, 180, 240, 300];
  return (
    <g>
      {!hideStem && (
        <path d="M0,22 Q-2,88 0,154" stroke="#15803d" strokeWidth="6.5" fill="none" strokeLinecap="round" />
      )}
      {angles.map((deg) => (
        <g key={`ama-${deg}`} transform={`rotate(${deg})`}>
          <path
            d="M0,0 C-18,-14 -20,-42 0,-52 C20,-42 18,-14 0,0 Z"
            fill={petalColor}
            stroke={centerColor}
            strokeWidth="1.4"
          />
          {/* Candy-Cane White Central Rib & Feathering */}
          <path d="M0,-4 L-4,-38 L0,-44 L4,-38 Z" fill={centerColor} opacity="0.9" />
        </g>
      ))}
      <circle cx="0" cy="0" r="7" fill="#84cc16" />
      {[30, 90, 150, 210, 270, 330].map((deg) => (
        <g key={`ama-st-${deg}`} transform={`rotate(${deg})`}>
          <line x1="0" y1="0" x2="0" y2="-20" stroke={centerColor} strokeWidth="1.5" />
          <ellipse cx="0" cy="-21" rx="3" ry="1.8" fill="#fde047" />
        </g>
      ))}
    </g>
  );
};

/** 66. Christmas Snow Rose / Hellebore (Porcelain winter rose with golden nectary crown) */
export const HelleboreSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor, hideStem }) => {
  const angles = [0, 72, 144, 216, 288];
  return (
    <g>
      {!hideStem && (
        <path d="M0,20 Q3,86 0,150" stroke="#15803d" strokeWidth="5" fill="none" strokeLinecap="round" />
      )}
      {angles.map((deg) => (
        <path
          key={`hel-${deg}`}
          d="M0,0 C-22,-10 -24,-38 0,-42 C24,-38 22,-10 0,0 Z"
          fill={petalColor}
          stroke="#fbcfe8"
          strokeWidth="1.2"
          transform={`rotate(${deg})`}
        />
      ))}
      {/* Lime Pistil Disk & Ring of Golden Nectaries */}
      <circle cx="0" cy="0" r="13" fill={centerColor} opacity="0.35" />
      {Array.from({ length: 12 }, (_, i) => i * 30).map((deg) => (
        <circle
          key={`hel-st-${deg}`}
          cx="0"
          cy="-11"
          r="2.4"
          fill={centerColor}
          stroke="#ca8a04"
          strokeWidth="0.6"
          transform={`rotate(${deg})`}
        />
      ))}
      <circle cx="0" cy="0" r="6" fill="#86efac" stroke="#15803d" strokeWidth="1" />
    </g>
  );
};

/** 67. Snow-Dusted Pinecone & Fir Needles (Layered woody cone scales with frost & evergreen boughs) */
export const FrostedPineconeSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor, hideStem }) => {
  const rows = [
    { y: 12, xs: [-12, 0, 12], s: 1.0 },
    { y: 0, xs: [-16, -5, 5, 16], s: 1.0 },
    { y: -12, xs: [-14, 0, 14], s: 0.94 },
    { y: -24, xs: [-10, 0, 10], s: 0.85 },
    { y: -34, xs: [-5, 5], s: 0.75 },
    { y: -42, xs: [0], s: 0.7 },
  ];
  return (
    <g>
      {!hideStem && (
        <path d="M0,22 Q-2,86 0,148" stroke="#5c4033" strokeWidth="5" fill="none" strokeLinecap="round" />
      )}
      {/* Noble Fir Evergreen Needles Behind Pinecone */}
      <g stroke={centerColor} strokeWidth="2.4" strokeLinecap="round">
        <path d="M0,10 L-34,-12 M-14,0 L-32,-2 M-20,-4 L-28,-18" />
        <path d="M0,10 L34,-12 M14,0 L32,-2 M20,-4 L28,-18" />
        <path d="M0,4 L-26,-34 M0,4 L26,-34" />
      </g>
      {/* Layered Woody Scales with Snow-Frosted Tips */}
      {rows.map((row, rIdx) =>
        row.xs.map((x, cIdx) => (
          <g key={`pc-${rIdx}-${cIdx}`} transform={`translate(${x}, ${row.y}) scale(${row.s})`}>
            <path
              d="M0,8 C-9,6 -10,-6 0,-10 C10,-6 9,6 0,8 Z"
              fill={petalColor}
              stroke="#451a03"
              strokeWidth="1"
            />
            <path d="M-6,-4 Q0,-9 6,-4" stroke="#FFFDF9" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          </g>
        ))
      )}
    </g>
  );
};

/** 68. Crystal Filigree Snowflake (6-point dendritic ice crystal with diamond facets) */
export const CrystalSnowflakeSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => {
  const axes = [0, 60, 120, 180, 240, 300];
  return (
    <g transform="translate(0, -10)">
      <circle cx="0" cy="0" r="32" fill={petalColor} opacity="0.25" />
      {axes.map((deg) => (
        <g key={`sf-${deg}`} transform={`rotate(${deg})`}>
          <line x1="0" y1="0" x2="0" y2="-38" stroke={centerColor} strokeWidth="2.6" strokeLinecap="round" />
          <path d="M0,-14 L-9,-22 M0,-14 L9,-22 M0,-25 L-11,-33 M0,-25 L11,-33" stroke={petalColor} strokeWidth="2.4" strokeLinecap="round" />
          <polygon points="0,-42 -4,-36 0,-30 4,-36" fill="#ffffff" stroke={centerColor} strokeWidth="1" />
        </g>
      ))}
      <polygon points="0,-10 9,-5 9,5 0,10 -9,5 -9,-5" fill="#ffffff" stroke={centerColor} strokeWidth="1.6" />
      <circle cx="0" cy="0" r="3.5" fill={centerColor} />
    </g>
  );
};

/** 69. Peppermint Candy Cane Charm (Striped hooked cane with festive holly bow) */
export const CandyCanePickSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => (
  <g transform="translate(4, -10) rotate(-10)">
    {/* White Peppermint Cane Base */}
    <path
      d="M4,34 L4,-18 A14,14 0 0,0 -24,-18 L-24,-8"
      fill="none"
      stroke={centerColor}
      strokeWidth="12"
      strokeLinecap="round"
    />
    {/* Barber-Pole Peppermint Stripes */}
    <path
      d="M4,34 L4,-18 A14,14 0 0,0 -24,-18 L-24,-8"
      fill="none"
      stroke={petalColor}
      strokeWidth="12"
      strokeLinecap="butt"
      strokeDasharray="8 9"
    />
    {/* Festive Green & Gold Bow at Waist */}
    <path d="M4,6 C-10,-4 -12,16 2,10 Z M4,6 C18,-4 20,16 6,10 Z" fill="#16a34a" stroke="#ffffff" strokeWidth="1" />
    <circle cx="4" cy="8" r="3.8" fill="#fde047" />
  </g>
);

/** 70. Heirloom Glass Bauble Ornament (Spherical blown-glass ornament with gilded starburst & brass cap) */
export const GlassOrnamentSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => (
  <g transform="translate(0, -8)">
    {/* Brass Hanging Ring & Scalloped Cap */}
    <circle cx="0" cy="-40" r="5" fill="none" stroke={centerColor} strokeWidth="2" />
    <rect x="-8" y="-35" width="16" height="9" rx="2" fill={centerColor} stroke="#b45309" strokeWidth="1" />
    {/* Spherical Glass Bauble */}
    <circle cx="0" cy="-2" r="28" fill={petalColor} stroke={centerColor} strokeWidth="1.8" />
    {/* Gilded Equatorial Band & Mid-Century Starburst */}
    <path d="M-27,-2 Q0,8 27,-2" fill="none" stroke={centerColor} strokeWidth="1.6" strokeDasharray="4 3" />
    <path
      d="M0,-20 L3,-6 L17,-2 L3,2 L0,16 L-3,2 L-17,-2 L-3,-6 Z"
      fill={centerColor}
    />
    <circle cx="0" cy="-2" r="3" fill="#ffffff" />
    {/* Specular Glass Highlight */}
    <path d="M-18,-16 A20,20 0 0,1 -6,-24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.65" />
  </g>
);

/** 71. Iced Gingerbread Heart Cookie (Spiced gingerbread heart piped with royal icing lace) */
export const GingerbreadHeartSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => (
  <g transform="translate(0, -12)">
    <path
      d="M0,32 C-6,26 -38,4 -38,-16 C-38,-32 -22,-40 -8,-30 C-3,-26 0,-20 0,-20 C0,-20 3,-26 8,-30 C22,-40 38,-32 38,-16 C38,4 6,26 0,32 Z"
      fill={petalColor}
      stroke="#78350f"
      strokeWidth="2"
    />
    {/* Piped White Royal Icing Scallop Border */}
    <path
      d="M0,24 C-5,19 -30,1 -30,-14 C-30,-25 -18,-31 -7,-23 C-2,-19 0,-14 0,-14 C0,-14 2,-19 7,-23 C18,-31 30,-25 30,-14 C30,1 5,19 0,24 Z"
      fill="none"
      stroke={centerColor}
      strokeWidth="2.8"
      strokeDasharray="5 3"
      strokeLinecap="round"
    />
    {/* Sugar Heart & Holly Icing Dot */}
    <circle cx="0" cy="-6" r="4" fill="#ef4444" />
    <circle cx="-6" cy="-9" r="2.2" fill="#22c55e" />
    <circle cx="6" cy="-9" r="2.2" fill="#22c55e" />
  </g>
);

/** 72. Gilded Jingle Sleigh Bells (Twin brass sleigh bells with pine needles & crimson velvet bow) */
export const SleighBellsPickSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => (
  <g transform="translate(0, -10)">
    {/* Pine Sprig Backing */}
    <path d="M0,-14 L-28,-28 M0,-14 L28,-28 M0,-14 L-22,-36 M0,-14 L22,-36" stroke="#15803d" strokeWidth="2.8" strokeLinecap="round" />
    {/* Left & Right Golden Sleigh Bells */}
    {[
      { x: -15, y: 8, rot: 14 },
      { x: 15, y: 8, rot: -14 },
    ].map((b, idx) => (
      <g key={`sb-${idx}`} transform={`translate(${b.x}, ${b.y}) rotate(${b.rot})`}>
        <circle cx="0" cy="0" r="16" fill={petalColor} stroke="#b45309" strokeWidth="1.6" />
        <path d="M-15,0 Q0,6 15,0" fill="none" stroke="#b45309" strokeWidth="1.4" />
        <circle cx="-4" cy="6" r="3" fill="#451a03" />
        <circle cx="5" cy="5" r="2.2" fill="#451a03" />
        <line x1="-4" y1="6" x2="5" y2="5" stroke="#451a03" strokeWidth="2.2" />
        <circle cx="-5" cy="-6" r="3.5" fill="#ffffff" opacity="0.65" />
      </g>
    ))}
    {/* Crimson Velvet Top Bow */}
    <path d="M0,-10 C-20,-26 -24,2 -2,-4 Z M0,-10 C20,-26 24,2 2,-4 Z" fill={centerColor} stroke="#ffffff" strokeWidth="1" />
    <circle cx="0" cy="-7" r="4.5" fill={petalColor} stroke="#ffffff" strokeWidth="1" />
  </g>
);

/** 73. Spiced Dried Blood-Orange, Cinnamon & Star Anise Pick */
export const CinnamonStarAniseSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor, hideStem }) => (
  <g>
    {!hideStem && (
      <path d="M0,18 Q-2,84 0,148" stroke="#78350f" strokeWidth="4.5" fill="none" strokeLinecap="round" />
    )}
    {/* Twin Crossed Cinnamon Sticks */}
    <rect x="-6" y="-44" width="7" height="58" rx="3.5" transform="rotate(-24)" fill={centerColor} stroke="#451a03" strokeWidth="1" />
    <rect x="-1" y="-44" width="7" height="58" rx="3.5" transform="rotate(18)" fill={centerColor} stroke="#451a03" strokeWidth="1" />
    {/* Translucent Dried Citrus Wheel */}
    <circle cx="0" cy="-10" r="24" fill={petalColor} stroke="#fdba74" strokeWidth="2.8" />
    {Array.from({ length: 8 }, (_, i) => i * 45).map((deg) => (
      <path
        key={`cit-${deg}`}
        d="M0,-10 L-5,-29 A20,20 0 0,1 5,-29 Z"
        fill="#9a3412"
        opacity="0.45"
        transform={`rotate(${deg} 0 -10)`}
      />
    ))}
    <circle cx="0" cy="-10" r="3.5" fill="#fef3c7" />
    {/* 8-Point Star Anise Pod Perched on Rim */}
    <g transform="translate(14, 4)">
      {Array.from({ length: 8 }, (_, i) => i * 45).map((deg) => (
        <ellipse
          key={`sa-${deg}`}
          cx="0"
          cy="-8"
          rx="3"
          ry="8"
          fill={centerColor}
          stroke="#fde68a"
          strokeWidth="0.6"
          transform={`rotate(${deg})`}
        />
      ))}
      <circle cx="0" cy="0" r="3" fill="#fde68a" />
    </g>
  </g>
);

// ============================================================================
// PART D: 8 NEW 'OTHERS' PETS, CELESTIAL & ROMANTIC GIFT KEEPSAKES
// ============================================================================

/** 74. Sitting Dog (Loyal puppy companion with satin bow collar) */
export const SittingDogSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => (
  <g transform="translate(0, -6)">
    {/* Wagging Curved Tail */}
    <path
      d="M20,18 C36,14 42,-2 33,-10 C28,-14 24,-4 25,8"
      fill="none"
      stroke={petalColor}
      strokeWidth="6.5"
      strokeLinecap="round"
    />
    {/* Seated Body & Hind Legs */}
    <ellipse cx="-16" cy="22" rx="11" ry="13" fill={petalColor} stroke="#78350f" strokeWidth="1.2" opacity="0.92" />
    <ellipse cx="16" cy="22" rx="11" ry="13" fill={petalColor} stroke="#78350f" strokeWidth="1.2" opacity="0.92" />
    <path
      d="M-19,28 C-21,6 -15,-8 0,-8 C15,-8 21,6 19,28 C14,34 -14,34 -19,28 Z"
      fill={petalColor}
      stroke="#78350f"
      strokeWidth="1.3"
    />
    {/* Soft Cream Chest Patch */}
    <ellipse cx="0" cy="12" rx="10.5" ry="13" fill="#fffbeb" opacity="0.92" />
    {/* Front Paws */}
    <ellipse cx="-8" cy="30" rx="6.5" ry="4.5" fill="#fffbeb" stroke="#78350f" strokeWidth="1.1" />
    <ellipse cx="8" cy="30" rx="6.5" ry="4.5" fill="#fffbeb" stroke="#78350f" strokeWidth="1.1" />
    <ellipse cx="-18" cy="31" rx="6" ry="4" fill={petalColor} stroke="#78350f" strokeWidth="1.1" />
    <ellipse cx="18" cy="31" rx="6" ry="4" fill={petalColor} stroke="#78350f" strokeWidth="1.1" />
    {/* Satin Collar & Bow + Golden Heart Tag */}
    <path
      d="M-14,-4 Q0,2 14,-4"
      fill="none"
      stroke={centerColor}
      strokeWidth="4.5"
      strokeLinecap="round"
    />
    <path
      d="M0,-2 C-10,-8 -12,2 -2,0 Z M0,-2 C10,-8 12,2 2,0 Z"
      fill={centerColor}
      stroke="#ffffff"
      strokeWidth="0.9"
    />
    <circle cx="0" cy="3.5" r="3.2" fill="#fbbf24" stroke="#ffffff" strokeWidth="0.8" />
    {/* Floppy Puppy Ears */}
    <path
      d="M-15,-34 C-29,-32 -33,-12 -23,-6 C-17,-3 -14,-14 -14,-26 Z"
      fill={petalColor}
      stroke="#78350f"
      strokeWidth="1.3"
    />
    <path
      d="M15,-34 C29,-32 33,-12 23,-6 C17,-3 14,-14 14,-26 Z"
      fill={petalColor}
      stroke="#78350f"
      strokeWidth="1.3"
    />
    {/* Rounded Puppy Head */}
    <circle cx="0" cy="-21" r="18.5" fill={petalColor} stroke="#78350f" strokeWidth="1.3" />
    {/* Cream Muzzle & Forehead Blaze */}
    <ellipse cx="0" cy="-15" rx="10.5" ry="8" fill="#fffbeb" />
    <path d="M0,-35 C-3,-28 -2,-22 0,-18 C2,-22 3,-28 0,-35 Z" fill="#fffbeb" opacity="0.85" />
    {/* Expressive Eyes & Brow Dots */}
    <circle cx="-6.8" cy="-23" r="2.8" fill="#1c1917" />
    <circle cx="-7.6" cy="-24" r="1" fill="#ffffff" />
    <circle cx="6.8" cy="-23" r="2.8" fill="#1c1917" />
    <circle cx="6.0" cy="-24" r="1" fill="#ffffff" />
    <ellipse cx="-11" cy="-18" rx="3" ry="1.6" fill="#fda4af" opacity="0.65" />
    <ellipse cx="11" cy="-18" rx="3" ry="1.6" fill="#fda4af" opacity="0.65" />
    {/* Cute Nose, Smile & Pink Tongue */}
    <ellipse cx="0" cy="-17.5" rx="4" ry="2.8" fill="#292524" />
    <path d="M-4,-13 Q0,-10 0,-14.5 Q0,-10 4,-13" fill="none" stroke="#451a03" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M-2.2,-11.5 Q0,-6.5 2.2,-11.5 Z" fill="#fb7185" />
  </g>
);

/** 75. Lovely Cats (Twin cuddling kittens with intertwined heart tails) */
export const LovelyCatsSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => (
  <g transform="translate(0, -6)">
    {/* Intertwined Tails Forming a Heart Shape Behind/Beside Them */}
    <path
      d="M-22,24 C-42,8 -38,-18 -20,-12"
      fill="none"
      stroke={petalColor}
      strokeWidth="4.8"
      strokeLinecap="round"
    />
    <path
      d="M22,24 C42,8 38,-18 20,-12"
      fill="none"
      stroke={centerColor}
      strokeWidth="4.8"
      strokeLinecap="round"
    />
    {/* Left Kitten (Petal Color Coat) */}
    <g transform="translate(-12, 2)">
      <path
        d="M-13,26 C-15,6 -10,-6 0,-6 C10,-6 14,6 12,26 Z"
        fill={petalColor}
        stroke="#7c2d12"
        strokeWidth="1.2"
      />
      <ellipse cx="0" cy="12" rx="7" ry="10" fill="#fffdf9" opacity="0.78" />
      {/* Pointed Cat Ears */}
      <polygon points="-12,-22 -14,-37 -3,-27" fill={petalColor} stroke="#7c2d12" strokeWidth="1.2" strokeLinejoin="round" />
      <polygon points="-10,-24 -12,-33 -5,-27" fill="#fda4af" opacity="0.8" />
      <polygon points="10,-22 13,-37 2,-27" fill={petalColor} stroke="#7c2d12" strokeWidth="1.2" strokeLinejoin="round" />
      <polygon points="8,-24 11,-33 4,-27" fill="#fda4af" opacity="0.8" />
      {/* Head tilted lovingly right */}
      <circle cx="0" cy="-17" r="13.5" fill={petalColor} stroke="#7c2d12" strokeWidth="1.2" />
      {/* Happy Closed Arc Eyes & Whiskers */}
      <path d="M-7,-18 Q-4.5,-21 -2,-18 M3,-18 Q5.5,-21 8,-18" fill="none" stroke="#292524" strokeWidth="1.3" strokeLinecap="round" />
      <polygon points="-1.8,-14 1.8,-14 0,-11.8" fill="#fb7185" />
      <path d="M-3,-10.5 Q0,-8.5 0,-12 Q0,-8.5 3,-10.5" fill="none" stroke="#451a03" strokeWidth="1" strokeLinecap="round" />
      <path d="M-9,-14 L-17,-15 M-9,-12 L-17,-11" stroke="#7c2d12" strokeWidth="0.8" strokeLinecap="round" opacity="0.7" />
      {/* Neck Collar */}
      <path d="M-9,-5 Q0,-1 9,-5" fill="none" stroke="#e11d48" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="0" cy="-2" r="2.2" fill="#fbbf24" />
    </g>
    {/* Right Kitten (Center Color Coat) Nuzzling Left Kitten */}
    <g transform="translate(12, 4)">
      <path
        d="M-12,24 C-14,6 -9,-6 0,-6 C10,-6 14,6 13,24 Z"
        fill={centerColor}
        stroke="#78716c"
        strokeWidth="1.2"
      />
      {/* Pointed Cat Ears */}
      <polygon points="-10,-21 -12,-35 -2,-26" fill={centerColor} stroke="#78716c" strokeWidth="1.2" strokeLinejoin="round" />
      <polygon points="-8,-23 -10,-31 -4,-26" fill="#fda4af" opacity="0.8" />
      <polygon points="11,-21 14,-35 3,-26" fill={centerColor} stroke="#78716c" strokeWidth="1.2" strokeLinejoin="round" />
      <polygon points="9,-23 12,-31 5,-26" fill="#fda4af" opacity="0.8" />
      <circle cx="0" cy="-16" r="13" fill={centerColor} stroke="#78716c" strokeWidth="1.2" />
      <path d="M-7,-17 Q-4.5,-20 -2,-17 M2.5,-17 Q5,-20 7.5,-17" fill="none" stroke="#292524" strokeWidth="1.3" strokeLinecap="round" />
      <polygon points="-1.8,-13 1.8,-13 0,-10.8" fill="#fb7185" />
      <path d="M-3,-9.5 Q0,-7.5 0,-11 Q0,-7.5 3,-9.5" fill="none" stroke="#57534e" strokeWidth="1" strokeLinecap="round" />
      <path d="M9,-13 L17,-14 M9,-11 L17,-10" stroke="#78716c" strokeWidth="0.8" strokeLinecap="round" opacity="0.7" />
      <path d="M-8.5,-4.5 Q0,-1 8.5,-4.5" fill="none" stroke="#f472b6" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="0" cy="-1.8" r="2.1" fill="#fbbf24" />
    </g>
    {/* Floating Love Heart Above the Cuddling Pair */}
    <path
      d="M0,-35 C-4,-41 -12,-38 -12,-31 C-12,-25 0,-19 0,-15 C0,-19 12,-25 12,-31 C12,-38 4,-41 0,-35 Z"
      fill="#f43f5e"
      stroke="#ffffff"
      strokeWidth="1.2"
    />
  </g>
);

/** 76. Crescent Moon (Gilded crescent moon with starry filigree) */
export const CrescentMoonSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => (
  <g transform="translate(0, -8)">
    {/* Soft Outer Celestial Halo */}
    <circle cx="-2" cy="-8" r="40" fill={petalColor} opacity="0.16" />
    {/* Sculpted Crescent Moon Body */}
    <path
      d="M14,-44 C-16,-44 -38,-20 -38,8 C-38,36 -14,52 16,44 C-4,40 -16,24 -16,4 C-16,-16 -2,-34 14,-44 Z"
      fill={petalColor}
      stroke={centerColor}
      strokeWidth="2"
      strokeLinejoin="round"
    />
    {/* Inner Dashed Gold Filigree Contour */}
    <path
      d="M6,-36 C-16,-32 -30,-14 -30,8 C-30,28 -14,42 6,40"
      fill="none"
      stroke={centerColor}
      strokeWidth="1.2"
      strokeDasharray="3 2.5"
      opacity="0.8"
    />
    {/* Serene Sleeping Moon Profile Accent & Rosy Cheek */}
    <path d="M-22,-2 Q-17,2 -12,-2" fill="none" stroke="#92400e" strokeWidth="1.4" strokeLinecap="round" />
    <ellipse cx="-20" cy="5" rx="3.8" ry="2.2" fill="#fda4af" opacity="0.65" />
    {/* Hanging Star Charm Dangling from Upper Horn */}
    <line x1="12" y1="-42" x2="12" y2="-18" stroke={centerColor} strokeWidth="1.2" strokeDasharray="2 2" />
    <path
      d="M12,-27 L14.5,-20.5 L21,-18 L14.5,-15.5 L12,-9 L9.5,-15.5 L3,-18 L9.5,-20.5 Z"
      fill={centerColor}
      stroke="#ffffff"
      strokeWidth="0.9"
    />
    {/* Companion Twinkling Stars */}
    <path
      d="M24,6 L25.5,11 L30.5,12.5 L25.5,14 L24,19 L22.5,14 L17.5,12.5 L22.5,11 Z"
      fill={petalColor}
      stroke={centerColor}
      strokeWidth="0.9"
    />
    <circle cx="2" cy="-2" r="2.2" fill="#ffffff" />
    <circle cx="26" cy="-12" r="2" fill={centerColor} />
  </g>
);

/** 77. Radiant Sun (Ornate golden sunburst medallion with alternating rays) */
export const RadiantSunSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => (
  <g>
    <g transform="translate(0, -8)">
      {/* Warm Solar Corona Glow */}
      <circle cx="0" cy="0" r="44" fill={petalColor} opacity="0.18" />
      {/* 8 Flame/Wavy Secondary Rays (Rotated 22.5 deg) */}
      {Array.from({ length: 8 }, (_, i) => i * 45 + 22.5).map((deg) => (
        <path
          key={`sun-wavy-${deg}`}
          d="M-4,-20 Q-6,-32 0,-42 Q6,-32 4,-20 Z"
          fill={centerColor}
          opacity="0.88"
          transform={`rotate(${deg})`}
        />
      ))}
      {/* 8 Primary Faceted Sunbeams */}
      {Array.from({ length: 8 }, (_, i) => i * 45).map((deg) => (
        <g key={`sun-ray-${deg}`} transform={`rotate(${deg})`}>
          <polygon
            points="0,-46 -6,-21 6,-21"
            fill={petalColor}
            stroke={centerColor}
            strokeWidth="1.1"
            strokeLinejoin="round"
          />
          <line x1="0" y1="-22" x2="0" y2="-42" stroke="#ffffff" strokeWidth="0.9" opacity="0.7" />
        </g>
      ))}
      {/* Central Sun Disc */}
      <circle cx="0" cy="0" r="22" fill={petalColor} stroke={centerColor} strokeWidth="2.2" />
      <circle
        cx="0"
        cy="0"
        r="17.5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.2"
        strokeDasharray="3 2.5"
        opacity="0.85"
      />
      {/* Serene Warm Face Details */}
      <path d="M-9,-3 Q-6,-7 -3,-3 M3,-3 Q6,-7 9,-3" fill="none" stroke="#9a3412" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M-5,4 Q0,8.5 5,4" fill="none" stroke="#9a3412" strokeWidth="1.5" strokeLinecap="round" />
      <ellipse cx="-10" cy="2" rx="3.2" ry="1.8" fill={centerColor} opacity="0.45" />
      <ellipse cx="10" cy="2" rx="3.2" ry="1.8" fill={centerColor} opacity="0.45" />
    </g>
  </g>
);

/** 78. Celestial Wishing Star (Faceted 5-point star with shooting stardust trail) */
export const CelestialStarSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => (
  <g>
    <g transform="translate(0, -10)">
      {/* Sweeping Stardust Trail Arcs */}
      <path
        d="M-38,26 C-24,34 8,32 28,14"
        fill="none"
        stroke={centerColor}
        strokeWidth="2.2"
        strokeDasharray="4 3"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d="M-32,34 C-14,40 16,36 36,20"
        fill="none"
        stroke={petalColor}
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.75"
      />
      {/* Main 5-Point Dimensional Star */}
      <polygon
        points="0,-40 10.5,-13 39,-11 16.5,7 24,35 0,19 -24,35 -16.5,7 -39,-11 -10.5,-13"
        fill={petalColor}
        stroke={centerColor}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Inner Faceted Bevel Highlights */}
      <polygon
        points="0,-32 7,-10 29,-9 12,5 17,26 0,14 -17,26 -12,5 -29,-9 -7,-10"
        fill="#ffffff"
        opacity="0.35"
      />
      <line x1="0" y1="-38" x2="0" y2="18" stroke={centerColor} strokeWidth="1" opacity="0.55" />
      <line x1="-36" y1="-10" x2="15" y2="6" stroke={centerColor} strokeWidth="1" opacity="0.55" />
      <line x1="36" y1="-10" x2="-15" y2="6" stroke={centerColor} strokeWidth="1" opacity="0.55" />
      {/* Center Gem Medallion */}
      <circle cx="0" cy="0" r="6.5" fill="#ffffff" stroke={centerColor} strokeWidth="1.5" />
      {/* Companion Sparkles */}
      <circle cx="-28" cy="20" r="3" fill={petalColor} stroke="#ffffff" strokeWidth="0.8" />
      <circle cx="28" cy="-24" r="2.6" fill={centerColor} />
    </g>
  </g>
);

/** 79. Dreamy Clouds (Soft billowy cumulus clouds with silver/pastel lining & sparkles) */
export const DreamyCloudsSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => (
  <g>
    <g transform="translate(0, -8)">
      {/* Back Companion Cloud Puff (Center Color Tint) */}
      <path
        d="M-30,10 C-42,10 -46,-2 -36,-8 C-36,-20 -20,-26 -10,-18 C-2,-28 16,-26 22,-14 C34,-16 44,-6 40,6 C40,12 30,14 18,14 Z"
        fill={centerColor}
        opacity="0.65"
        transform="translate(8, -10)"
      />
      {/* Main Front Billowy Cloud */}
      <path
        d="M-32,18 C-44,18 -50,8 -44,-2 C-42,-12 -30,-16 -22,-12 C-18,-26 -2,-32 10,-22 C18,-30 34,-26 36,-12 C46,-10 50,2 44,12 C40,18 32,18 24,18 Z"
        fill={petalColor}
        stroke={centerColor}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Inner Soft Highlight Puff Curves */}
      <path
        d="M-28,6 C-26,-4 -16,-8 -8,-2 M-6,-10 C2,-20 16,-18 20,-6 M16,2 C24,-4 34,0 34,8"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.9"
      />
      {/* Delicate Hanging Star & Dewdrop Below Cloud */}
      <line x1="-14" y1="18" x2="-14" y2="30" stroke={centerColor} strokeWidth="1.2" strokeDasharray="2 2" />
      <circle cx="-14" cy="33" r="3" fill={centerColor} />
      <line x1="12" y1="18" x2="12" y2="28" stroke="#fbbf24" strokeWidth="1.2" strokeDasharray="2 2" />
      <polygon points="12,26 14,31 19,33 14,35 12,40 10,35 5,33 10,31" fill="#fde047" stroke="#f59e0b" strokeWidth="0.7" />
    </g>
  </g>
);

/** 80. Box of Chocolates (Heart-shaped velvet bonbon box with assorted truffles & bow) */
export const ChocolateBoxSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => (
  <g>
    <g transform="translate(0, -8)">
      {/* Outer Velvet Heart Box Rim */}
      <path
        d="M0,-24 C-14,-44 -46,-34 -46,-6 C-46,20 -14,34 0,48 C14,34 46,20 46,-6 C46,-34 14,-44 0,-24 Z"
        fill={petalColor}
        stroke="#fbbf24"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* Gold Foil Inner Box Tray */}
      <path
        d="M0,-18 C-12,-35 -38,-27 -38,-5 C-38,16 -11,28 0,40 C11,28 38,16 38,-5 C38,-27 12,-35 0,-18 Z"
        fill="#fef3c7"
        stroke="#d97706"
        strokeWidth="1.3"
      />
      {/* 5 Artisan Chocolate Truffles in Paper Cups */}
      {/* Top-Left Swirl Bonbon */}
      <g transform="translate(-17, -9)">
        <circle cx="0" cy="0" r="9.5" fill="#fffdf9" stroke="#d97706" strokeWidth="0.9" strokeDasharray="2 1.5" />
        <circle cx="0" cy="0" r="7.5" fill={centerColor} />
        <path d="M-4,-2 Q0,-5 4,-2 M-4,2 Q0,5 4,2" fill="none" stroke="#fde68a" strokeWidth="1.1" strokeLinecap="round" />
      </g>
      {/* Top-Right White Chocolate Heart Truffle */}
      <g transform="translate(17, -9)">
        <circle cx="0" cy="0" r="9.5" fill="#fffdf9" stroke="#d97706" strokeWidth="0.9" strokeDasharray="2 1.5" />
        <circle cx="0" cy="0" r="7.5" fill="#fffbeb" stroke={centerColor} strokeWidth="1" />
        <path d="M0,-3 C-2,-6 -6,-4 -6,-1 C-6,2 0,5 0,6 C0,5 6,2 6,-1 C6,-4 2,-6 0,-3 Z" fill={petalColor} />
      </g>
      {/* Center Square Praline */}
      <g transform="translate(0, 4)">
        <circle cx="0" cy="0" r="10" fill="#fffdf9" stroke="#d97706" strokeWidth="0.9" strokeDasharray="2 1.5" />
        <rect x="-6.5" y="-6.5" width="13" height="13" rx="3" fill={centerColor} stroke="#a16207" strokeWidth="0.9" />
        <line x1="-5" y1="-5" x2="5" y2="5" stroke="#fda4af" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="-5" y1="5" x2="5" y2="-5" stroke="#fda4af" strokeWidth="1.2" strokeLinecap="round" />
      </g>
      {/* Lower-Left Milk Chocolate Dome */}
      <g transform="translate(-14, 14)">
        <circle cx="0" cy="0" r="8.2" fill="#fffdf9" stroke="#d97706" strokeWidth="0.8" strokeDasharray="2 1.5" />
        <circle cx="0" cy="0" r="6.4" fill="#92400e" />
        <circle cx="0" cy="0" r="2" fill="#fbbf24" />
      </g>
      {/* Lower-Right Dark Truffle */}
      <g transform="translate(14, 14)">
        <circle cx="0" cy="0" r="8.2" fill="#fffdf9" stroke="#d97706" strokeWidth="0.8" strokeDasharray="2 1.5" />
        <circle cx="0" cy="0" r="6.4" fill={centerColor} />
        <path d="M-3,0 L3,0 M0,-3 L0,3" stroke="#ffffff" strokeWidth="1.1" strokeLinecap="round" />
      </g>
      {/* Decorative Satin Bow on Top Cleft */}
      <path
        d="M0,-23 C-12,-34 -16,-18 -2,-20 Z M0,-23 C12,-34 16,-18 2,-20 Z"
        fill="#fbbf24"
        stroke="#ffffff"
        strokeWidth="0.9"
      />
      <circle cx="0" cy="-21.5" r="2.8" fill="#f59e0b" stroke="#ffffff" strokeWidth="0.8" />
    </g>
  </g>
);

/** 81. Ring in a Box (Open velvet jewelry box with sparkling diamond solitaire ring) */
export const RingInBoxSVG: React.FC<FlowerSVGProps> = ({ petalColor, centerColor }) => (
  <g>
    <g transform="translate(0, -6)">
      {/* Upper Hinged Open Velvet Lid */}
      <path
        d="M-30,-8 L-26,-34 C-24,-42 24,-42 26,-34 L30,-8 Z"
        fill={petalColor}
        stroke={centerColor}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* Cream Satin Lid Interior Lining */}
      <path
        d="M-24,-10 L-21,-30 C-19,-36 19,-36 21,-30 L24,-10 Z"
        fill="#fffdf9"
        stroke="#fde68a"
        strokeWidth="1"
      />
      {/* Velvet Cushion Slot Base */}
      <ellipse cx="0" cy="-6" rx="31" ry="9" fill="#fffbeb" stroke={centerColor} strokeWidth="1.4" />
      <path d="M-20,-6 Q0,-2 20,-6" fill="none" stroke="#d6d3d1" strokeWidth="2.2" strokeLinecap="round" />

      {/* Golden Ring Band Rising from Velvet Slot */}
      <path
        d="M-13,-5 A13,13 0 1,1 13,-5"
        fill="none"
        stroke={centerColor}
        strokeWidth="4.2"
        strokeLinecap="round"
      />
      <path
        d="M-13,-5 A13,13 0 1,1 13,-5"
        fill="none"
        stroke="#fef08a"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      {/* Prong Setting & Brilliant Cut Diamond Solitaire */}
      <polygon
        points="-5,-17 5,-17 9,-24 5,-29 -5,-29 -9,-24"
        fill="#e0f2fe"
        stroke="#38bdf8"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <polygon points="-5,-29 5,-29 0,-17" fill="#ffffff" opacity="0.92" />
      <line x1="-9" y1="-24" x2="9" y2="-24" stroke="#7dd3fc" strokeWidth="0.9" />
      {/* Diamond Sparkle Rays */}
      <path
        d="M0,-43 L1.5,-37 L7,-35.5 L1.5,-34 L0,-28 L-1.5,-34 L-7,-35.5 L-1.5,-37 Z"
        fill="#ffffff"
        stroke={centerColor}
        strokeWidth="0.7"
      />
      <circle cx="-14" cy="-26" r="1.8" fill="#ffffff" />
      <circle cx="14" cy="-26" r="1.8" fill="#ffffff" />

      {/* Lower Velvet Ring Box Base */}
      <path
        d="M-32,-6 L32,-6 L27,26 C26,32 -26,32 -27,26 Z"
        fill={petalColor}
        stroke={centerColor}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* Gold Clasp & Trim on Front of Box */}
      <path d="M-30,2 Q0,8 30,2" fill="none" stroke={centerColor} strokeWidth="1.4" opacity="0.85" />
      <rect x="-6" y="1" width="12" height="6" rx="3" fill={centerColor} stroke="#ffffff" strokeWidth="0.8" />
    </g>
  </g>
);

