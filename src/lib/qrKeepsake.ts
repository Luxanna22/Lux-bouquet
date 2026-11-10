import QRCode from 'qrcode';

export type QrThemeId = 'espresso' | 'rose' | 'sage' | 'midnight';
export type QrModuleStyle = 'dots' | 'diamonds' | 'soft';

export interface QrThemePalette {
  id: QrThemeId;
  label: string;
  swatchHex: string;
  cardBg: string;
  borderHex: string;
  inkHex: string;
  accentHex: string;
  eyeOuterHex: string;
  eyeInnerHex: string;
  isDark: boolean;
}

export const QR_THEME_CATALOG: QrThemePalette[] = [
  {
    id: 'espresso',
    label: 'Espresso',
    swatchHex: '#6E4434',
    cardBg: '#FFFDF9',
    borderHex: '#DECBB9',
    inkHex: '#6E4434',
    accentHex: '#B4846C',
    eyeOuterHex: '#6E4434',
    eyeInnerHex: '#B4846C',
    isDark: false,
  },
  {
    id: 'rose',
    label: 'Blush Rose',
    swatchHex: '#9F3E52',
    cardBg: '#FFF9FB',
    borderHex: '#EBCAD4',
    inkHex: '#8E3547',
    accentHex: '#D97F93',
    eyeOuterHex: '#8E3547',
    eyeInnerHex: '#D97F93',
    isDark: false,
  },
  {
    id: 'sage',
    label: 'Sage Leaf',
    swatchHex: '#3E6250',
    cardBg: '#F8FBF9',
    borderHex: '#C8DDD0',
    inkHex: '#355645',
    accentHex: '#6E9882',
    eyeOuterHex: '#355645',
    eyeInnerHex: '#6E9882',
    isDark: false,
  },
  {
    id: 'midnight',
    label: 'Velvet Gold',
    swatchHex: '#2B2321',
    cardBg: '#2B2321',
    borderHex: '#66554F',
    inkHex: '#E6B89C',
    accentHex: '#B4846C',
    eyeOuterHex: '#E6B89C',
    eyeInnerHex: '#D49B7E',
    isDark: true,
  },
];

export const QR_STYLE_CATALOG: { id: QrModuleStyle; label: string }[] = [
  { id: 'dots', label: 'Soft Dots' },
  { id: 'diamonds', label: 'Petals' },
  { id: 'soft', label: 'Rounded' },
];

export interface BotanicalQrCell {
  row: number;
  col: number;
  isDark: boolean;
}

export interface BotanicalQrMatrix {
  size: number;
  cells: BotanicalQrCell[];
  finderOrigins: { row: number; col: number }[];
  logoCenterRatio: number;
}

/**
 * Checks whether a (row, col) cell belongs to one of the three 7x7 finder patterns
 * or their 1-module separator border.
 */
export function isFinderPatternRegion(row: number, col: number, size: number): boolean {
  // Top-left 8x8
  if (row <= 7 && col <= 7) return true;
  // Top-right 8x8
  if (row <= 7 && col >= size - 8) return true;
  // Bottom-left 8x8
  if (row >= size - 8 && col <= 7) return true;
  return false;
}

/**
 * Checks whether a (row, col) cell falls inside the central logo medallion quiet zone.
 * With ECC Level 'H' (30% error recovery), clearing a ~21% central zone keeps the QR
 * code rapidly scannable by standard phone cameras while framing the center logo cleanly.
 */
export function isCenterLogoMedallionZone(row: number, col: number, size: number): boolean {
  const center = (size - 1) / 2;
  const maxRadius = size * 0.118;
  const dr = row - center;
  const dc = col - center;
  return Math.hypot(dr, dc) <= maxRadius;
}

/**
 * Generates a deterministic QR matrix with ECC Level 'H' for a bouquet gift link,
 * filtering out the 3 finder eyes (rendered custom) and the central logo medallion.
 */
export function computeBotanicalQrMatrix(url: string): BotanicalQrMatrix {
  const safeUrl = (url || 'https://sendabouquet.com').trim();
  const qr = QRCode.create(safeUrl, { errorCorrectionLevel: 'H' });
  const size = qr.modules.size;
  const cells: BotanicalQrCell[] = [];

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (isFinderPatternRegion(row, col, size)) continue;
      if (isCenterLogoMedallionZone(row, col, size)) continue;
      const isDark = Boolean(qr.modules.get(row, col));
      if (isDark) {
        cells.push({ row, col, isDark: true });
      }
    }
  }

  return {
    size,
    cells,
    finderOrigins: [
      { row: 0, col: 0 },
      { row: 0, col: size - 7 },
      { row: size - 7, col: 0 },
    ],
    logoCenterRatio: 0.22,
  };
}

/**
 * Rasterizes the live SVG QR keepsake into a crisp square PNG and downloads it.
 */
export async function downloadBotanicalQrSvgAsPng(
  svgElement: SVGSVGElement,
  filename = 'bouquet-qr-keepsake.png',
  sizePx = 1024
): Promise<void> {
  const serializer = new XMLSerializer();
  let svgString = serializer.serializeToString(svgElement);
  if (!svgString.includes('xmlns="http://www.w3.org/2000/svg"')) {
    svgString = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const objectUrl = URL.createObjectURL(svgBlob);

  try {
    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = sizePx;
          canvas.height = sizePx;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context unavailable'));
            return;
          }
          ctx.drawImage(img, 0, 0, sizePx, sizePx);
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Could not encode QR PNG'));
              return;
            }
            const dlUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = dlUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(dlUrl), 1500);
            resolve();
          }, 'image/png');
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('Failed to load QR SVG image'));
      img.src = objectUrl;
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
