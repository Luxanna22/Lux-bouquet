import React from 'react';
import {
  CardTheme,
  RibbonStyle,
  VoiceKeepsakeStyle,
  typeWrapStyle,
  StarterTemplate,
  getCardThemePalette,
} from '../types/bouquet';

// ============================================================================
// MODULE 5B: MINIATURE SVG THUMBNAILS FOR COMPACT MOBILE CAROUSEL
// ============================================================================

export const MiniWrapConeSVG: React.FC<{
  styleType: typeWrapStyle;
  color: string;
  ribbon: string;
}> = ({ styleType, ribbon }) => (
  <svg viewBox="0 0 64 64" className="w-12 h-12">
    {/* 1. ORIGAMI KRAFT (Ref #1: Layered taupe sleeve + mid cuff + pleated lower base + white twine) */}
    {styleType === 'kraft' && (
      <g>
        <path d="M14,14 Q32,19 50,14 L44,36 L20,36 Z" fill="#C8B9AE" />
        <path d="M11,17 L14,14 L22,36 L18,36 Z" fill="#B3A296" />
        <path d="M53,17 L50,14 L42,36 L46,36 Z" fill="#B3A296" />
        <path d="M18,31 Q32,34 46,31 L41,43 L23,43 Z" fill="#CEC0B5" stroke="#E5DDD5" strokeWidth="0.7" />
        <path d="M20,31 L23,43 L19,42 Z" fill="#B3A296" />
        <path d="M44,31 L41,43 L45,42 Z" fill="#B3A296" />
        <path d="M23,42 L41,42 L39,56 L25,56 Z" fill="#C4B4A8" />
        <path d="M27,42 L26,56 M37,42 L38,56 M32,42 L32,56" stroke="#A69385" strokeWidth="1.2" />
        <path d="M22,42 Q32,44 42,42" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M31,42 C27,39 27,45 31,43 M33,42 C37,39 37,45 33,43" fill="none" stroke="#FFFFFF" strokeWidth="1.6" />
        <path d="M31,43 L29,55 M33,43 L35,55" stroke="#FFFFFF" strokeWidth="1.3" strokeLinecap="round" />
      </g>
    )}

    {/* 2. BUTTERFLY PETAL (Sculpted 4-wing Korean butterfly wrap + translucent inner silk tissue + ribbon bow) */}
    {styleType === 'tissue' && (
      <g>
        {/* Frosted Inner Silk Tissue Crown */}
        <path
          d="M32,39 C24,25 19,14 26,12 C29.5,11 31.2,16 32,20 C32.8,16 34.5,11 38,12 C45,14 40,25 32,39 Z"
          fill="#FFFDF9"
          stroke="#FBCFE8"
          strokeWidth="0.8"
        />
        {/* Upper Left & Right Sweeping Butterfly Forewings */}
        <path
          d="M32,40 C20,36 9,27 8,18 C7.5,12 14,10 20,13 C25,15.5 29,21 32,27 Z"
          fill="#FFC4D0"
          stroke="#FFFFFF"
          strokeWidth="0.9"
        />
        <path
          d="M32,40 C44,36 55,27 56,18 C56.5,12 50,10 44,13 C39,15.5 35,21 32,27 Z"
          fill="#FFD4DF"
          stroke="#FFFFFF"
          strokeWidth="0.9"
        />
        {/* Lower Flared Butterfly Hindwings */}
        <path
          d="M25,41 C16,44 13,51 16.5,55 C19.5,58 25,55.5 28,50 L32,42 Z"
          fill="#F9A8B8"
          stroke="#FFFFFF"
          strokeWidth="0.8"
        />
        <path
          d="M39,41 C48,44 51,51 47.5,55 C44.5,58 39,55.5 36,50 L32,42 Z"
          fill="#FFC4D0"
          stroke="#FFFFFF"
          strokeWidth="0.8"
        />
        {/* Front Crossover Petal Fold & Pleated Center Tail */}
        <path
          d="M25,41 L39,41 L37,56 Q32,58 27,56 Z"
          fill="#FFE4EC"
          stroke="#FFFFFF"
          strokeWidth="0.8"
        />
        <path
          d="M13,27 C13,34 19,39 25,42 L33,42 C28,36 21,29 16,26 C14,25 13,25.5 13,27 Z"
          fill="#FFCAD6"
          stroke="#FFFFFF"
          strokeWidth="0.8"
        />
        <path
          d="M51,27 C51,34 45,39 39,42 L31,42 C36,36 43,29 48,26 C50,25 51,25.5 51,27 Z"
          fill="#FFD8E2"
          stroke="#FFFFFF"
          strokeWidth="0.8"
        />
        {/* Ribbon Tie & Bow at Cinched Butterfly Waist */}
        <path d="M24,41.5 Q32,44 40,41.5" fill="none" stroke={ribbon || '#E11D48'} strokeWidth="2" strokeLinecap="round" />
        <path d="M31,41.5 C26,38 25,44 31,42.5 M33,41.5 C38,38 39,44 33,42.5" fill="none" stroke={ribbon || '#E11D48'} strokeWidth="1.5" />
        <path d="M31,42.5 L28.5,54 M33,42.5 L35.5,54" stroke={ribbon || '#E11D48'} strokeWidth="1.3" strokeLinecap="round" />
      </g>
    )}

    {/* 3. TULIP ORGANZA (Ref #3: Concave chalice lilac veil + parabolic curves + lilac ribbon) */}
    {styleType === 'chalice' && (
      <g>
        <path d="M12,14 Q32,19 52,14 Q47,33 41,43 L23,43 Q17,33 12,14 Z" fill="#EFE3F6" />
        <path d="M15,16 Q26,23 29,41 M49,16 Q38,23 35,41" fill="none" stroke="#D8B4FE" strokeWidth="1.2" opacity="0.8" />
        <path d="M17,31 Q32,37 47,31 L41,43 L23,43 Z" fill="#E5D0F2" />
        <path d="M23,43 L41,43 L40,56 L24,56 Z" fill="#EBD9F7" />
        <path d="M22,42 Q32,44 42,42" fill="none" stroke="#C084FC" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M31,43 L28,56 M33,43 L36,56" stroke="#A855F7" strokeWidth="1.8" strokeLinecap="round" />
      </g>
    )}

    {/* 4. WICKER BASKET (Arched rattan handle + braided rim + cross-hatched basket) */}
    {styleType === 'basket' && (
      <g>
        <path d="M18,32 C18,10 46,10 46,32" fill="none" stroke="#A47549" strokeWidth="3.2" />
        <ellipse cx="32" cy="32" rx="16" ry="4.5" fill="#5C3A1E" />
        <path d="M16,32 L48,32 L42,51 Q32,54 22,51 Z" fill="#C89B6E" stroke="#8B5E34" strokeWidth="1.2" />
        <path d="M18,38 Q32,40 46,38 M20,44 Q32,46 44,44" fill="none" stroke="#8B5E34" strokeWidth="1.1" />
        <path d="M15,32 Q32,36 49,32" fill="none" stroke="#DFB78C" strokeWidth="3.5" strokeLinecap="round" />
        <rect x="22" y="50" width="20" height="3.5" rx="1.5" fill="#7C512B" />
      </g>
    )}

    {/* 5. PARISIAN SCRIPT (Asymmetric high-back vintage newspaper cone + editorial lines + raffia tie) */}
    {styleType === 'vintage' && (
      <g>
        <path d="M32,50 L14,22 Q24,11 36,11 Q46,11 50,21 Z" fill="#EBE0CE" stroke="#CBB99F" strokeWidth="1" />
        <path d="M15,24 L32,42 L26,55 L20,42 Z" fill="#E2D3BC" />
        <path d="M49,22 L31,42 L38,55 L44,41 Z" fill="#F5EFE4" stroke="#D5C5AE" strokeWidth="0.8" />
        <path d="M26,16 L38,16 M24,19 L40,19 M34,34 L42,31 M33,37 L41,34" stroke="#9E8C74" strokeWidth="1.1" />
        <path d="M24,43 Q32,45 40,43" fill="none" stroke="#B4846C" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="32" cy="44" r="2.2" fill="#8C5E47" />
      </g>
    )}

    {/* 6. EYELET LACE (Scalloped bridal lace collar + pleated blush skirt + pearl bow) */}
    {styleType === 'lace' && (
      <g>
        <path
          d="M32,48 L12,22 Q16,16 22,19 Q27,14 32,18 Q37,14 42,19 Q48,16 52,22 Z"
          fill="#FFFFFF"
          stroke="#F472B6"
          strokeWidth="1"
        />
        <path d="M18,28 L32,40 L46,28 L39,55 Q32,57 25,55 Z" fill="#FCE7F3" />
        <path d="M24,33 L27,55 M32,38 L32,56 M40,33 L37,55" stroke="#F472B6" strokeWidth="0.9" opacity="0.45" />
        <path d="M17,28 Q22,33 27,29 Q32,34 37,29 Q42,33 47,28 L42,37 Q32,41 22,37 Z" fill="#FFFFFF" stroke="#F9A8D4" strokeWidth="0.9" />
        <rect x="24" y="42" width="16" height="3.5" rx="1.7" fill={ribbon} />
        <circle cx="32" cy="43.7" r="2.5" fill="#FFF1F2" stroke="#F472B6" strokeWidth="0.8" />
      </g>
    )}

    {/* 7. STARLIT NOIR (Midnight navy couture cone + gold foil trim & stars) */}
    {styleType === 'celestial' && (
      <g>
        <path d="M32,48 L12,20 L20,15 L26,18 L32,13 L38,18 L44,15 L52,20 Z" fill="#1E293B" stroke="#F59E0B" strokeWidth="1.2" />
        <path d="M15,23 L32,41 L26,55 L20,42 Z" fill="#0F172A" stroke="#FBBF24" strokeWidth="0.9" />
        <path d="M49,23 L32,41 L38,55 L44,42 Z" fill="#1E293B" stroke="#FBBF24" strokeWidth="0.9" />
        <path d="M22,36 L32,42 L42,36 L38,55 Q32,57 26,55 Z" fill="#1E293B" stroke="#F59E0B" strokeWidth="0.9" />
        <circle cx="28" cy="46" r="1.4" fill="#FBBF24" />
        <circle cx="36" cy="49" r="1.6" fill="#FBBF24" />
        <circle cx="33" cy="39" r="1.3" fill="#FDE68A" />
        <rect x="25" y="42" width="14" height="3.8" rx="1.9" fill="#F59E0B" />
      </g>
    )}

    {/* 8. CERAMIC VASE (Fluted stoneware amphora vessel with twin ear handles) */}
    {styleType === 'vase' && (
      <g>
        <circle cx="24" cy="18" r="5" fill="#FDA4AF" />
        <circle cx="40" cy="18" r="5" fill="#FBCFE8" />
        <circle cx="32" cy="15" r="6" fill="#F43F5E" />
        <path d="M22,31 C15,30 15,41 21,42 M42,31 C49,30 49,41 43,42" fill="none" stroke="#CBB9A8" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M21,26 L43,26 C41,32 46,40 40,53 L24,53 C18,40 23,32 21,26 Z" fill="#EAE0D5" stroke="#B5A495" strokeWidth="1.2" />
        <path d="M27,28 L27,52 M32,28 L32,52 M37,28 L37,52" stroke="#C4B2A0" strokeWidth="1.1" />
        <rect x="19" y="24" width="26" height="3.5" rx="1.7" fill="#F5EFEA" stroke="#B5A495" strokeWidth="1" />
        <rect x="23" y="52" width="18" height="3.5" rx="1.5" fill="#B4846C" />
      </g>
    )}

    {/* 9. HAND-TIED PLAIN (Natural gathered stems with satin bow) */}
    {styleType === 'plain' && (
      <g>
        <path d="M27,20 L23,52 M32,18 L32,54 M37,20 L41,52" stroke="#16a34a" strokeWidth="3.2" strokeLinecap="round" />
        <circle cx="25" cy="18" r="6" fill="#fda4af" />
        <circle cx="39" cy="18" r="6" fill="#fbcfe8" />
        <circle cx="32" cy="15" r="7" fill="#f43f5e" />
        <rect x="25" y="34" width="14" height="5" rx="2.5" fill={ribbon} />
        <path d="M30,36 L24,46 M34,36 L40,46" stroke={ribbon} strokeWidth="2.5" strokeLinecap="round" />
      </g>
    )}

    {/* 10. VELVET HATBOX (Cylindrical Parisian velvet box with gold foil rim & floral dome) */}
    {styleType === 'hatbox' && (
      <g>
        <circle cx="23" cy="20" r="6.5" fill="#fbcfe8" />
        <circle cx="41" cy="20" r="6.5" fill="#fda4af" />
        <circle cx="32" cy="17" r="7.5" fill="#f43f5e" />
        <rect x="17" y="25" width="30" height="28" rx="3" fill="#9F1239" stroke="#F59E0B" strokeWidth="1.2" />
        <rect x="16" y="25" width="32" height="5" rx="1.5" fill="#881337" stroke="#FBBF24" strokeWidth="1" />
        <rect x="23" y="35" width="18" height="10" rx="2" fill="#FFFDF9" stroke="#F59E0B" strokeWidth="0.9" />
        <line x1="27" y1="40" x2="37" y2="40" stroke="#9F1239" strokeWidth="1.2" />
      </g>
    )}

    {/* 11. GLASS CLOCHE (Crystal bell jar with connected finial, specular reflection & turned pedestal) */}
    {styleType === 'cloche' && (
      <g>
        {/* Connected Crystal Finial Knob */}
        <ellipse cx="32" cy="12" rx="4.2" ry="1.4" fill="#CBD5E1" />
        <circle cx="32" cy="9.2" r="3" fill="#F1F5F9" stroke="#94A3B8" strokeWidth="1.1" />
        {/* True Semicircular Bell Jar Dome */}
        <path
          d="M16,47 L16,28 A16,16 0 0,1 48,28 L48,47 Z"
          fill="#E0F2FE"
          fillOpacity="0.48"
          stroke="#94A3B8"
          strokeWidth="1.3"
        />
        {/* Inner Blooms & Gathered Stems */}
        <path d="M27,31 Q30,39 32,42 L29,46 M32,29 L32,46 M37,31 Q34,39 32,42 L35,46" stroke="#15803d" strokeWidth="1.7" fill="none" strokeLinecap="round" />
        <circle cx="26.5" cy="28.5" r="5" fill="#fda4af" />
        <circle cx="37.5" cy="28.5" r="5" fill="#fbcfe8" />
        <circle cx="32" cy="24.5" r="6" fill="#e11d48" />
        {/* Ribbon Knot on Stems & Moss Cushion */}
        <ellipse cx="32" cy="46.5" rx="12" ry="2.2" fill="#3F624D" opacity="0.85" />
        <rect x="29" y="40.5" width="6" height="2.4" rx="1.2" fill={ribbon || '#e11d48'} />
        {/* Specular Glass Highlight Arc */}
        <path
          d="M19,44 L19,28 A13,13 0 0,1 29,15.5"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.85"
        />
        {/* Turned Wood & Brass Pedestal Base */}
        <ellipse cx="32" cy="47.5" rx="17.5" ry="2.5" fill="#8B5E34" stroke="#5C3A1E" strokeWidth="0.9" />
        <path d="M14.5,47.5 L49.5,47.5 L47.5,53.5 Q32,55.5 16.5,53.5 Z" fill="#78350F" stroke="#451A03" strokeWidth="1" />
        <rect x="27" y="49.5" width="10" height="2.6" rx="0.8" fill="#FDE68A" stroke="#B45309" strokeWidth="0.6" />
      </g>
    )}

    {/* 12. KOREAN MESH (Layered frosted tulle mesh wrap with architectural pleats) */}
    {styleType === 'koreanmesh' && (
      <g>
        <path d="M32,46 L10,16 Q22,10 32,20 Q42,10 54,16 Z" fill="#F3E8FF" stroke="#C084FC" strokeWidth="1" strokeDasharray="2 1.5" />
        <path d="M14,22 L32,43 L24,55 L18,41 Z" fill="#E9D5FF" opacity="0.85" />
        <path d="M50,22 L32,43 L40,55 L46,41 Z" fill="#E9D5FF" opacity="0.85" />
        <path d="M22,38 L42,38 L39,55 L25,55 Z" fill="#FAF5FF" stroke="#D8B4FE" strokeWidth="1" />
        <path d="M22,42 Q32,45 42,42" fill="none" stroke={ribbon} strokeWidth="2.5" strokeLinecap="round" />
      </g>
    )}
  </svg>
);

export const MiniTemplateBouquetSVG: React.FC<{
  wrapColor: string;
  ribbonColor: string;
  bloomColors: string[];
}> = ({ wrapColor, ribbonColor, bloomColors }) => (
  <svg viewBox="0 0 64 64" className="w-11 h-11">
    <path d="M32,52 L15,25 Q32,18 49,25 Z" fill={wrapColor} />
    <circle cx="23" cy="24" r="7.5" fill={bloomColors[1] || '#fbcfe8'} />
    <circle cx="41" cy="24" r="7.5" fill={bloomColors[2] || '#fda4af'} />
    <circle cx="32" cy="19" r="8.5" fill={bloomColors[0] || '#f43f5e'} />
    <circle cx="32" cy="19" r="3" fill="#fde047" />
    <path d="M21,34 L32,41 L43,34 L37,54 Q32,56 27,54 Z" fill={wrapColor} stroke="#ffffff" strokeWidth="0.7" />
    <rect x="26" y="42" width="12" height="4" rx="2" fill={ribbonColor} />
  </svg>
);

export const MiniRibbonBowSVG: React.FC<{ hex: string; styleType?: RibbonStyle }> = ({
  hex,
  styleType = 'satin'
}) => {
  const isLight = ['#ffffff', '#fef3c7', '#fbcfe8', '#fde68a', '#e2e8f0'].includes(hex.toLowerCase());
  const strokeCol = isLight ? '#94a3b8' : '#ffffff';

  if (styleType === 'lace') {
    return (
      <svg viewBox="0 0 64 64" className="w-11 h-11">
        {/* Scalloped floral lace collar & bow */}
        <path
          d="M14,28 Q20,23 26,28 Q32,23 38,28 Q44,23 50,28 L48,36 Q42,41 36,36 Q32,41 28,36 Q22,41 16,36 Z"
          fill="#ffffff"
          stroke={hex}
          strokeWidth="1.3"
        />
        <circle cx="22" cy="32" r="1.4" fill={hex} />
        <circle cx="32" cy="32" r="1.4" fill={hex} />
        <circle cx="42" cy="32" r="1.4" fill={hex} />
        <path d="M29,35 L23,52 M35,35 L41,52" stroke={hex} strokeWidth="2.4" strokeLinecap="round" strokeDasharray="2 1.5" />
        <path d="M30,32 C18,22 16,38 29,35 Z" fill="#ffffff" stroke={hex} strokeWidth="1.3" />
        <path d="M34,32 C46,22 48,38 35,35 Z" fill="#ffffff" stroke={hex} strokeWidth="1.3" />
        <circle cx="32" cy="33" r="3.5" fill="#fffdf9" stroke={hex} strokeWidth="1.2" />
      </svg>
    );
  }

  if (styleType === 'corset') {
    return (
      <svg viewBox="0 0 64 64" className="w-11 h-11">
        {/* Crisscross corset lacing */}
        <path d="M20,18 L44,27 M44,18 L20,27 M21,27 L43,36 M43,27 L21,36" stroke={hex} strokeWidth="2" strokeLinecap="round" />
        <circle cx="20" cy="18" r="1.6" fill="#fef3c7" stroke={hex} strokeWidth="1" />
        <circle cx="44" cy="18" r="1.6" fill="#fef3c7" stroke={hex} strokeWidth="1" />
        <circle cx="20" cy="27" r="1.6" fill="#fef3c7" stroke={hex} strokeWidth="1" />
        <circle cx="44" cy="27" r="1.6" fill="#fef3c7" stroke={hex} strokeWidth="1" />
        <path d="M20,37 Q32,40 44,37" fill="none" stroke={hex} strokeWidth="2.5" strokeLinecap="round" />
        <path d="M30,38 C20,31 19,44 30,40 Z" fill={hex} />
        <path d="M34,38 C44,31 45,44 34,40 Z" fill={hex} />
        <path d="M30,40 L25,53 M34,40 L39,53" stroke={hex} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (styleType === 'double') {
    return (
      <svg viewBox="0 0 64 64" className="w-11 h-11">
        {/* Layered double butterfly rosette */}
        <path d="M27,34 L18,52 L24,50 L30,35 Z" fill={hex} opacity="0.8" />
        <path d="M37,34 L46,52 L40,50 L34,35 Z" fill={hex} opacity="0.8" />
        <path d="M30,30 C11,14 9,40 28,35 Z" fill={hex} opacity="0.65" />
        <path d="M34,30 C53,14 55,40 36,35 Z" fill={hex} opacity="0.65" />
        <path d="M30,31 C17,21 16,37 29,34 Z" fill={hex} stroke={strokeCol} strokeWidth="0.8" />
        <path d="M34,31 C47,21 48,37 35,34 Z" fill={hex} stroke={strokeCol} strokeWidth="0.8" />
        <circle cx="32" cy="32" r="4" fill={hex} stroke="#fde68a" strokeWidth="1.2" />
      </svg>
    );
  }

  if (styleType === 'waxCord') {
    return (
      <svg viewBox="0 0 64 64" className="w-11 h-11">
        {/* Botanical twine & embossed wax seal */}
        <path d="M16,28 Q32,32 48,28 M17,32 Q32,36 47,32 M18,36 Q32,40 46,36" fill="none" stroke="#b4846c" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M29,36 L22,52 M35,36 L42,52" stroke="#b4846c" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="32" cy="34" r="7.5" fill={hex} stroke="#ffffff" strokeWidth="1" />
        <circle cx="32" cy="34" r="5" fill="none" stroke="#fde68a" strokeWidth="0.9" strokeDasharray="2 1.5" />
      </svg>
    );
  }

  if (styleType === 'organza') {
    return (
      <svg viewBox="0 0 64 64" className="w-11 h-11">
        {/* Sheer floating organza sash */}
        <path d="M28,33 C20,44 14,50 18,55 C23,52 27,44 31,34 Z" fill={hex} fillOpacity="0.45" stroke={hex} strokeWidth="1" />
        <path d="M36,33 C44,44 50,50 46,55 C41,52 37,44 33,34 Z" fill={hex} fillOpacity="0.45" stroke={hex} strokeWidth="1" />
        <path d="M30,30 C10,12 10,44 29,34 Z" fill={hex} fillOpacity="0.4" stroke={hex} strokeWidth="1.2" />
        <path d="M34,30 C54,12 54,44 35,34 Z" fill={hex} fillOpacity="0.4" stroke={hex} strokeWidth="1.2" />
        <ellipse cx="32" cy="32" rx="4" ry="3.5" fill={hex} fillOpacity="0.75" stroke="#ffffff" strokeWidth="0.9" />
      </svg>
    );
  }

  if (styleType === 'velvet') {
    return (
      <svg viewBox="0 0 64 64" className="w-11 h-11">
        {/* Velvet ribbon with pearl & cameo brooch */}
        <rect x="16" y="28" width="32" height="6" rx="3" fill={hex} />
        <path d="M28,34 L21,52 L27,50 L31,34 Z" fill={hex} />
        <path d="M36,34 L43,52 L37,50 L33,34 Z" fill={hex} />
        <ellipse cx="32" cy="31" rx="6.5" ry="7.5" fill="#fde68a" stroke="#b45309" strokeWidth="1" />
        <ellipse cx="32" cy="31" rx="4.5" ry="5.5" fill="#fffdf9" />
        <circle cx="32" cy="42" r="2.2" fill="#fffdf9" stroke="#cbd5e1" strokeWidth="0.7" />
      </svg>
    );
  }

  if (styleType === 'chiffon') {
    return (
      <svg viewBox="0 0 64 64" className="w-11 h-11">
        {/* Raw-edge frayed silk chiffon drape */}
        <path d="M16,28 Q32,33 48,28" fill="none" stroke={hex} strokeWidth="5" strokeLinecap="round" opacity="0.75" />
        <path d="M29,31 C22,42 18,52 24,56 C28,51 30,40 32,32 Z" fill={hex} fillOpacity="0.65" stroke={strokeCol} strokeWidth="0.8" strokeDasharray="2 1" />
        <path d="M35,31 C42,42 46,52 40,56 C36,51 34,40 32,32 Z" fill={hex} fillOpacity="0.65" stroke={strokeCol} strokeWidth="0.8" strokeDasharray="2 1" />
        <ellipse cx="32" cy="30" rx="5.5" ry="4" fill={hex} stroke={strokeCol} strokeWidth="0.9" />
      </svg>
    );
  }

  if (styleType === 'goldchain') {
    return (
      <svg viewBox="0 0 64 64" className="w-11 h-11">
        {/* Golden link chain & hanging heart charm */}
        <path d="M15,27 Q32,34 49,27" fill="none" stroke="#F59E0B" strokeWidth="2.8" strokeDasharray="4 2" strokeLinecap="round" />
        <path d="M17,31 Q32,39 47,31" fill="none" stroke="#FBBF24" strokeWidth="2" strokeDasharray="3 2" strokeLinecap="round" />
        <line x1="32" y1="33" x2="32" y2="41" stroke="#F59E0B" strokeWidth="1.8" />
        <path d="M32,50 C25,45 25,39 29,39 C31,39 32,41 32,41 C32,41 33,39 35,39 C39,39 39,45 32,50 Z" fill={hex} stroke="#FDE68A" strokeWidth="1.2" />
      </svg>
    );
  }

  if (styleType === 'raffia') {
    return (
      <svg viewBox="0 0 64 64" className="w-11 h-11">
        {/* Woven natural raffia knot & dried sprig */}
        <path d="M15,29 Q32,32 49,29 M16,32 Q32,35 48,32" fill="none" stroke="#D6B38E" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M31,32 L18,50 M31,32 L23,53 M33,32 L46,50 M33,32 L41,53" stroke="#C89B6E" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="32" cy="31" r="4.5" fill={hex} stroke="#FFFDF9" strokeWidth="1" />
        <circle cx="28" cy="24" r="1.8" fill="#FFFDF9" />
        <circle cx="36" cy="23" r="1.8" fill="#FFFDF9" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 64 64" className="w-10 h-10">
      <path d="M29,33 Q24,44 20,52 L25,51 Q28,43 31,34 Z" fill={hex} />
      <path d="M35,33 Q40,44 44,52 L39,51 Q36,43 33,34 Z" fill={hex} />
      <path
        d="M30,31 C16,20 14,38 28,34 Z"
        fill={hex}
        stroke="#cbd5e1"
        strokeWidth="0.8"
      />
      <path
        d="M34,31 C48,20 50,38 36,34 Z"
        fill={hex}
        stroke="#cbd5e1"
        strokeWidth="0.8"
      />
      <rect x="28.5" y="27.5" width="7" height="8" rx="3" fill={hex} stroke="#ffffff" strokeWidth="0.8" />
    </svg>
  );
};

export const MiniCardShapeSVG: React.FC<{
  theme: CardTheme;
  customBg?: string;
  customAccent?: string;
}> = ({ theme, customBg, customAccent }) => {
  const pal = getCardThemePalette(theme, customBg, customAccent);
  if (theme === 'sealed') {
    return (
      <svg viewBox="0 0 64 48" className="w-11 h-8">
        {/* Unopened Wax-Sealed Envelope */}
        <rect
          x="8"
          y="9"
          width="48"
          height="31"
          rx="4"
          fill={pal.bg}
          stroke={pal.border}
          strokeWidth="1.6"
        />
        {/* Bottom & Side Envelope Folds */}
        <path
          d="M9,39 L32,24 L55,39"
          fill="none"
          stroke={pal.border}
          strokeWidth="1.1"
          opacity="0.55"
        />
        {/* Top Closed Triangular Flap */}
        <path
          d="M8,10 L32,27 L56,10 Z"
          fill={pal.bg}
          stroke={pal.border}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Embossed Heart Wax Seal in Center */}
        <circle cx="32" cy="26" r="5.5" fill={pal.seal} stroke="#ffffff" strokeWidth="0.9" />
        <path
          d="M32,24.5 C30.5,22.8 28.2,24 29.5,26.2 L32,28.5 L34.5,26.2 C35.8,24 33.5,22.8 32,24.5 Z"
          fill="#ffffff"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 48" className="w-11 h-8">
      {theme === 'blush' ? (
        <path
          d="M8,10 Q14,6 20,10 Q26,6 32,10 Q38,6 44,10 Q50,6 56,10 L56,38 Q50,42 44,38 Q38,42 32,38 Q26,42 20,38 Q14,42 8,38 Z"
          fill={pal.bg}
          stroke={pal.border}
          strokeWidth="1.6"
        />
      ) : theme === 'lavender' ? (
        <path
          d="M10,40 L10,20 C10,9 22,5 32,5 C42,5 54,9 54,20 L54,40 Z"
          fill={pal.bg}
          stroke={pal.border}
          strokeWidth="1.6"
        />
      ) : theme === 'sage' ? (
        <polygon
          points="14,7 50,7 57,14 57,34 50,41 14,41 7,34 7,14"
          fill={pal.bg}
          stroke={pal.border}
          strokeWidth="1.6"
        />
      ) : theme === 'sky' ? (
        <path
          d="M9,9 C20,6 44,6 55,9 C53,19 53,29 55,39 C44,42 20,42 9,39 C11,29 11,19 9,9 Z"
          fill={pal.bg}
          stroke={pal.border}
          strokeWidth="1.6"
        />
      ) : theme === 'terracotta' ? (
        <polygon
          points="7,9 57,9 51,24 57,39 7,39 13,24"
          fill={pal.bg}
          stroke={pal.border}
          strokeWidth="1.6"
        />
      ) : theme === 'midnight' ? (
        <path
          d="M14,8 L50,8 A6,6 0 0 0 56,14 L56,34 A6,6 0 0 0 50,40 L14,40 A6,6 0 0 0 8,34 L8,14 A6,6 0 0 0 14,8 Z"
          fill={pal.bg}
          stroke={pal.border}
          strokeWidth="1.6"
        />
      ) : (
        <rect
          x="7"
          y="8"
          width="50"
          height="32"
          rx="6"
          fill={pal.bg}
          stroke={pal.border}
          strokeWidth="1.6"
        />
      )}
      <circle cx="19" cy="20" r="3.5" fill={pal.seal} />
      <line x1="26" y1="19" x2="46" y2="19" stroke={pal.title} strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
      <line x1="16" y1="27" x2="48" y2="27" stroke={pal.body} strokeWidth="1.3" strokeLinecap="round" opacity="0.45" />
      <line x1="16" y1="32" x2="39" y2="32" stroke={pal.body} strokeWidth="1.3" strokeLinecap="round" opacity="0.35" />
    </svg>
  );
};

export const MiniVoiceKeepsakeSVG: React.FC<{
  styleType: VoiceKeepsakeStyle;
  primaryColor?: string;
  accentColor?: string;
}> = ({ styleType, primaryColor = '#f43f5e', accentColor = '#fef3c7' }) => {
  if (styleType === 'vinyl') {
    return (
      <svg viewBox="0 0 64 64" className="w-11 h-11">
        {/* Vintage Horn Gramophone Vinyl Player */}
        {/* Curved Brass Horn Support Arm */}
        <path
          d="M21,36 Q18,22 28,17"
          fill="none"
          stroke={accentColor}
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        {/* Scalloped Antique Brass Morning-Glory Horn */}
        <path
          d="M26,18 C22,9 32,3 38,8 C44,4 52,11 48,18 C53,23 47,31 39,28 C33,31 25,25 26,18 Z"
          fill={accentColor}
          stroke="#92400e"
          strokeWidth="1.2"
        />
        <circle cx="34" cy="19" r="3.8" fill="#451a03" stroke="#fef08a" strokeWidth="0.9" />
        {/* Turntable Vinyl Platter */}
        <ellipse cx="32" cy="37" rx="18" ry="4.5" fill="#18181b" stroke="#52525b" strokeWidth="1" />
        <ellipse cx="32" cy="37" rx="7" ry="1.8" fill="#ffffff" />
        {/* Wooden Gramophone Cabinet Base */}
        <polygon
          points="14,39 30,42 30,55 14,51"
          fill={primaryColor}
          stroke="#451a03"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <polygon
          points="30,42 50,39 50,52 30,55"
          fill={primaryColor}
          stroke="#451a03"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {/* Side Rosette Grille & Front Brass Plaque */}
        <circle cx="22" cy="47" r="4" fill="none" stroke={accentColor} strokeWidth="1.1" />
        <rect x="34" y="44" width="12" height="6" rx="1" fill={accentColor} />
        {/* Stepped Base Molding */}
        <path d="M12,51 L30,56 L52,52" fill="none" stroke={accentColor} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (styleType === 'plushie') {
    return (
      <svg viewBox="0 0 64 64" className="w-11 h-11">
        {/* Cute Teddy Plushie holding a Voice Heart */}
        <circle cx="20" cy="18" r="6.5" fill={primaryColor} />
        <circle cx="20" cy="18" r="3.5" fill="#fde68a" opacity="0.7" />
        <circle cx="44" cy="18" r="6.5" fill={primaryColor} />
        <circle cx="44" cy="18" r="3.5" fill="#fde68a" opacity="0.7" />
        <ellipse cx="32" cy="44" rx="14" ry="12" fill={primaryColor} />
        <circle cx="32" cy="27" r="12.5" fill={primaryColor} />
        <ellipse cx="32" cy="30" rx="5.5" ry="4" fill="#fffbeb" />
        <circle cx="27.5" cy="25" r="1.6" fill="#292524" />
        <circle cx="36.5" cy="25" r="1.6" fill="#292524" />
        <ellipse cx="32" cy="28.8" rx="2" ry="1.4" fill="#451a03" />
        {/* Heart speaker badge */}
        <path
          d="M32,40 C28,35 21,38 25,45 L32,51 L39,45 C43,38 36,35 32,40 Z"
          fill={accentColor}
          stroke="#ffffff"
          strokeWidth="1.2"
        />
      </svg>
    );
  }

  if (styleType === 'musicbox') {
    return (
      <svg viewBox="0 0 64 64" className="w-11 h-11">
        {/* Vintage Ballerina Floral Music Box */}
        {/* Open Hinged Mirror Lid on Top Right */}
        <polygon
          points="33,30 40,10 56,12 49,31"
          fill={primaryColor}
          stroke="#d97706"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <polygon points="36,28 41.5,13 52.5,14.5 47,29" fill="#fef9c3" />
        {/* Ballerina Figurine & Tutu on Golden Pedestal */}
        <ellipse cx="29" cy="31" rx="6.5" ry="2" fill="#f59e0b" stroke="#b45309" strokeWidth="0.8" />
        <line x1="29" y1="22" x2="29" y2="30" stroke="#fdba74" strokeWidth="1.8" strokeLinecap="round" />
        <ellipse cx="29" cy="24" rx="6" ry="2.4" fill={primaryColor} stroke="#ffffff" strokeWidth="0.7" />
        <circle cx="29" cy="16.5" r="2.5" fill="#fde68a" />
        <path d="M29,19 C25,16 25,12 28,11 M29,19 L35,21" fill="none" stroke="#fdba74" strokeWidth="1.3" strokeLinecap="round" />
        {/* Rococo Music Box Cabinet & Floral Panels */}
        <polygon
          points="10,33 32,37 32,53 10,48"
          fill={primaryColor}
          stroke="#d97706"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <polygon
          points="32,37 52,33 52,48 32,53"
          fill={primaryColor}
          stroke="#d97706"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <polygon points="13,36 29,39 29,49 13,45" fill="#fffbeb" />
        <polygon points="35,39 49,36 49,45 35,49" fill="#fffbeb" />
        {/* Tiny Painted Pink Roses on Panels */}
        <circle cx="20" cy="42" r="2.2" fill="#fb7185" />
        <circle cx="23" cy="44" r="1.8" fill="#f43f5e" />
        <circle cx="42" cy="42" r="2.2" fill="#fb7185" />
        {/* Cabriole Scalloped Gold Base */}
        <path
          d="M9,48 Q20,52 32,56 Q43,52 53,48"
          fill="none"
          stroke={accentColor}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (styleType === 'locket') {
    return (
      <svg viewBox="0 0 64 64" className="w-11 h-11">
        {/* Golden Heart Voice Locket */}
        <path d="M24,10 Q32,20 40,10" fill="none" stroke="#d97706" strokeWidth="1.8" strokeDasharray="2 1.5" />
        <circle cx="32" cy="17" r="3" fill="none" stroke="#d97706" strokeWidth="1.8" />
        <path
          d="M32,25 C22,14 9,23 17,37 L32,51 L47,37 C55,23 42,14 32,25 Z"
          fill={primaryColor}
          stroke="#ffffff"
          strokeWidth="1.4"
        />
        <path
          d="M32,29 C26,22 18,27 23,36 L32,44 L41,36 C46,27 38,22 32,29 Z"
          fill={accentColor}
        />
        <line x1="27" y1="35" x2="27" y2="39" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="32" y1="32" x2="32" y2="41" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="37" y1="35" x2="37" y2="39" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }

  // Default: 'mixtape' (Retro Love Mixtape Cassette)
  return (
    <svg viewBox="0 0 64 64" className="w-11 h-11">
      <rect x="8" y="16" width="48" height="32" rx="5" fill={primaryColor} stroke="#ffffff" strokeWidth="1.2" />
      <rect x="13" y="20" width="38" height="17" rx="2.5" fill={accentColor} />
      <rect x="18" y="24" width="28" height="9" rx="4.5" fill="#1e293b" />
      <circle cx="23.5" cy="28.5" r="3" fill="#f8fafc" />
      <circle cx="40.5" cy="28.5" r="3" fill="#f8fafc" />
      <path d="M18,48 L22,41 L42,41 L46,48 Z" fill="#0f172a" opacity="0.35" />
    </svg>
  );
};


