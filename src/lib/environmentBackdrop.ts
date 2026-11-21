import type { CanvasEnvironment } from '../types/bouquet';

export interface EnvironmentPageBackdrop {
  /** Atmospheric page background matching the bouquet's selected environment */
  pageBackground: string;
  /** Solid fallback color matching the atmospheric backdrop */
  pageBaseColor: string;
  /** Crisp outer hairline border so the rounded bouquet canvas square stays clearly visible */
  canvasBorderColor: string;
  /** Subtle inner rim stroke rendered inside the SVG canvas square */
  canvasInnerHighlight: string;
  /** GPU-free CSS box-shadow elevating the canvas square above the blended backdrop */
  canvasShadow: string;
  /** True when the environment itself is inherently dark/nocturnal (even in light UI mode) */
  isDarkEnvironment: boolean;
}

const LIGHT_SHADOW =
  '0 22px 54px -20px rgba(34, 24, 18, 0.18), 0 6px 20px -8px rgba(34, 24, 18, 0.10)';
const DARK_SHADOW =
  '0 26px 64px -18px rgba(0, 0, 0, 0.52), 0 8px 24px -8px rgba(0, 0, 0, 0.36)';

const LIGHT_BACKDROPS: Record<CanvasEnvironment, EnvironmentPageBackdrop> = {
  studio: {
    pageBackground:
      'radial-gradient(circle at 50% 42%, #F5EFE7 0%, #ECE3D7 58%, #E2D6C6 100%)',
    pageBaseColor: '#ECE3D7',
    canvasBorderColor: 'rgba(180, 132, 108, 0.30)',
    canvasInnerHighlight: 'rgba(255, 255, 255, 0.72)',
    canvasShadow: LIGHT_SHADOW,
    isDarkEnvironment: false,
  },
  paper: {
    pageBackground:
      'radial-gradient(circle at 50% 42%, #F2E7D8 0%, #E7D8C5 58%, #DAC7B0 100%)',
    pageBaseColor: '#E7D8C5',
    canvasBorderColor: 'rgba(164, 128, 98, 0.38)',
    canvasInnerHighlight: 'rgba(255, 252, 246, 0.70)',
    canvasShadow: LIGHT_SHADOW,
    isDarkEnvironment: false,
  },
  meadow: {
    pageBackground:
      'radial-gradient(circle at 50% 38%, #EBF4E7 0%, #D9E9D5 58%, #C6DDC0 100%)',
    pageBaseColor: '#D9E9D5',
    canvasBorderColor: 'rgba(105, 146, 112, 0.38)',
    canvasInnerHighlight: 'rgba(255, 255, 255, 0.68)',
    canvasShadow: LIGHT_SHADOW,
    isDarkEnvironment: false,
  },
  sunlit: {
    pageBackground:
      'radial-gradient(circle at 46% 36%, #FDF5DF 0%, #F5E5BF 58%, #EBD49E 100%)',
    pageBaseColor: '#F5E5BF',
    canvasBorderColor: 'rgba(202, 145, 56, 0.36)',
    canvasInnerHighlight: 'rgba(255, 253, 245, 0.78)',
    canvasShadow: LIGHT_SHADOW,
    isDarkEnvironment: false,
  },
  linen: {
    pageBackground:
      'radial-gradient(circle at 50% 44%, #ECE0D1 0%, #DFCEBC 58%, #D1BCA5 100%)',
    pageBaseColor: '#DFCEBC',
    canvasBorderColor: 'rgba(162, 126, 98, 0.38)',
    canvasInnerHighlight: 'rgba(255, 250, 244, 0.65)',
    canvasShadow: LIGHT_SHADOW,
    isDarkEnvironment: false,
  },
  blushSilk: {
    pageBackground:
      'radial-gradient(circle at 50% 42%, #FBE6EE 0%, #F4D2E0 58%, #EBBCD0 100%)',
    pageBaseColor: '#F4D2E0',
    canvasBorderColor: 'rgba(212, 118, 158, 0.38)',
    canvasInnerHighlight: 'rgba(255, 250, 252, 0.75)',
    canvasShadow: LIGHT_SHADOW,
    isDarkEnvironment: false,
  },
  botanicalArch: {
    pageBackground:
      'radial-gradient(circle at 50% 40%, #E0F2E8 0%, #CBE7D8 58%, #B5DBC6 100%)',
    pageBaseColor: '#CBE7D8',
    canvasBorderColor: 'rgba(54, 154, 112, 0.36)',
    canvasInnerHighlight: 'rgba(255, 255, 255, 0.72)',
    canvasShadow: LIGHT_SHADOW,
    isDarkEnvironment: false,
  },
  nordicSnow: {
    pageBackground:
      'radial-gradient(circle at 50% 38%, #E0EEFD 0%, #C9E0FA 58%, #B2D0F4 100%)',
    pageBaseColor: '#C9E0FA',
    canvasBorderColor: 'rgba(84, 146, 224, 0.38)',
    canvasInnerHighlight: 'rgba(255, 255, 255, 0.80)',
    canvasShadow: LIGHT_SHADOW,
    isDarkEnvironment: false,
  },
  starlit: {
    pageBackground:
      'radial-gradient(circle at 50% 34%, #251B42 0%, #16112B 58%, #0C081B 100%)',
    pageBaseColor: '#16112B',
    canvasBorderColor: 'rgba(253, 230, 138, 0.34)',
    canvasInnerHighlight: 'rgba(253, 230, 138, 0.22)',
    canvasShadow: DARK_SHADOW,
    isDarkEnvironment: true,
  },
  aurora: {
    pageBackground:
      'linear-gradient(135deg, #F8D6E4 0%, #F5E3B3 50%, #CDD8FA 100%)',
    pageBaseColor: '#F5E3B3',
    canvasBorderColor: 'rgba(204, 132, 34, 0.36)',
    canvasInnerHighlight: 'rgba(255, 255, 255, 0.74)',
    canvasShadow: LIGHT_SHADOW,
    isDarkEnvironment: false,
  },
  velvetSalon: {
    pageBackground:
      'radial-gradient(circle at 50% 42%, #3D1423 0%, #230A14 58%, #120409 100%)',
    pageBaseColor: '#230A14',
    canvasBorderColor: 'rgba(253, 230, 138, 0.36)',
    canvasInnerHighlight: 'rgba(251, 191, 36, 0.22)',
    canvasShadow: DARK_SHADOW,
    isDarkEnvironment: true,
  },
  opalMist: {
    pageBackground:
      'linear-gradient(135deg, #F9E6D2 0%, #F2D3E6 48%, #C8E3F6 100%)',
    pageBaseColor: '#F2D3E6',
    canvasBorderColor: 'rgba(196, 138, 76, 0.34)',
    canvasInnerHighlight: 'rgba(255, 255, 255, 0.78)',
    canvasShadow: LIGHT_SHADOW,
    isDarkEnvironment: false,
  },
  crystalPalace: {
    pageBackground:
      'radial-gradient(circle at 50% 38%, #FCF0C8 0%, #F3DC9A 58%, #E6C772 100%)',
    pageBaseColor: '#F3DC9A',
    canvasBorderColor: 'rgba(176, 118, 22, 0.38)',
    canvasInnerHighlight: 'rgba(255, 253, 240, 0.76)',
    canvasShadow: LIGHT_SHADOW,
    isDarkEnvironment: false,
  },
  midnightNoel: {
    pageBackground:
      'radial-gradient(circle at 50% 38%, #103224 0%, #0A2117 58%, #05130D 100%)',
    pageBaseColor: '#0A2117',
    canvasBorderColor: 'rgba(253, 230, 138, 0.32)',
    canvasInnerHighlight: 'rgba(167, 243, 208, 0.18)',
    canvasShadow: DARK_SHADOW,
    isDarkEnvironment: true,
  },
  champagneSilk: {
    pageBackground:
      'radial-gradient(circle at 50% 42%, #FBF5E9 0%, #F1E4CD 58%, #E4D0B0 100%)',
    pageBaseColor: '#F1E4CD',
    canvasBorderColor: 'rgba(186, 146, 92, 0.38)',
    canvasInnerHighlight: 'rgba(255, 253, 246, 0.78)',
    canvasShadow: LIGHT_SHADOW,
    isDarkEnvironment: false,
  },
  terracottaWall: {
    pageBackground:
      'radial-gradient(circle at 46% 38%, #F2DFD1 0%, #E3C3AE 58%, #D1A68C 100%)',
    pageBaseColor: '#E3C3AE',
    canvasBorderColor: 'rgba(166, 96, 68, 0.36)',
    canvasInnerHighlight: 'rgba(255, 248, 242, 0.68)',
    canvasShadow: LIGHT_SHADOW,
    isDarkEnvironment: false,
  },
  lavenderSilk: {
    pageBackground:
      'radial-gradient(circle at 50% 40%, #F3EBFC 0%, #E3D3F7 58%, #D0B8EE 100%)',
    pageBaseColor: '#E3D3F7',
    canvasBorderColor: 'rgba(139, 92, 246, 0.36)',
    canvasInnerHighlight: 'rgba(255, 252, 255, 0.78)',
    canvasShadow: LIGHT_SHADOW,
    isDarkEnvironment: false,
  },
  parisBalcony: {
    pageBackground:
      'linear-gradient(155deg, #F5DCE4 0%, #ECD5E8 48%, #D4DBF0 100%)',
    pageBaseColor: '#ECD5E8',
    canvasBorderColor: 'rgba(134, 114, 156, 0.38)',
    canvasInnerHighlight: 'rgba(255, 250, 252, 0.72)',
    canvasShadow: LIGHT_SHADOW,
    isDarkEnvironment: false,
  },
  sakuraBreeze: {
    pageBackground:
      'radial-gradient(circle at 44% 34%, #FFF3F6 0%, #FCE1EA 58%, #F5CAD9 100%)',
    pageBaseColor: '#FCE1EA',
    canvasBorderColor: 'rgba(219, 112, 147, 0.36)',
    canvasInnerHighlight: 'rgba(255, 255, 255, 0.80)',
    canvasShadow: LIGHT_SHADOW,
    isDarkEnvironment: false,
  },
};

const DARK_BACKDROPS: Record<CanvasEnvironment, EnvironmentPageBackdrop> = {
  studio: {
    pageBackground:
      'radial-gradient(circle at 50% 42%, #2D2421 0%, #221B19 58%, #181311 100%)',
    pageBaseColor: '#221B19',
    canvasBorderColor: 'rgba(222, 203, 185, 0.22)',
    canvasInnerHighlight: 'rgba(255, 245, 235, 0.12)',
    canvasShadow: DARK_SHADOW,
    isDarkEnvironment: true,
  },
  paper: {
    pageBackground:
      'radial-gradient(circle at 50% 42%, #302622 0%, #241C19 58%, #1A1412 100%)',
    pageBaseColor: '#241C19',
    canvasBorderColor: 'rgba(202, 174, 152, 0.26)',
    canvasInnerHighlight: 'rgba(255, 245, 235, 0.12)',
    canvasShadow: DARK_SHADOW,
    isDarkEnvironment: true,
  },
  meadow: {
    pageBackground:
      'radial-gradient(circle at 50% 40%, #202A23 0%, #17201A 58%, #101712 100%)',
    pageBaseColor: '#17201A',
    canvasBorderColor: 'rgba(134, 176, 144, 0.28)',
    canvasInnerHighlight: 'rgba(212, 238, 218, 0.12)',
    canvasShadow: DARK_SHADOW,
    isDarkEnvironment: true,
  },
  sunlit: {
    pageBackground:
      'radial-gradient(circle at 46% 36%, #31271D 0%, #241C15 58%, #19130E 100%)',
    pageBaseColor: '#241C15',
    canvasBorderColor: 'rgba(253, 230, 138, 0.24)',
    canvasInnerHighlight: 'rgba(254, 243, 199, 0.14)',
    canvasShadow: DARK_SHADOW,
    isDarkEnvironment: true,
  },
  linen: {
    pageBackground:
      'radial-gradient(circle at 50% 44%, #2A211D 0%, #1F1815 58%, #16110F 100%)',
    pageBaseColor: '#1F1815',
    canvasBorderColor: 'rgba(198, 168, 148, 0.25)',
    canvasInnerHighlight: 'rgba(255, 245, 235, 0.11)',
    canvasShadow: DARK_SHADOW,
    isDarkEnvironment: true,
  },
  blushSilk: {
    pageBackground:
      'radial-gradient(circle at 50% 42%, #2D1B22 0%, #201319 58%, #160C11 100%)',
    pageBaseColor: '#201319',
    canvasBorderColor: 'rgba(244, 140, 186, 0.28)',
    canvasInnerHighlight: 'rgba(252, 231, 243, 0.12)',
    canvasShadow: DARK_SHADOW,
    isDarkEnvironment: true,
  },
  botanicalArch: {
    pageBackground:
      'radial-gradient(circle at 50% 40%, #15221B 0%, #0F1914 58%, #0A110E 100%)',
    pageBaseColor: '#0F1914',
    canvasBorderColor: 'rgba(110, 231, 183, 0.28)',
    canvasInnerHighlight: 'rgba(167, 243, 208, 0.14)',
    canvasShadow: DARK_SHADOW,
    isDarkEnvironment: true,
  },
  nordicSnow: {
    pageBackground:
      'radial-gradient(circle at 50% 38%, #172236 0%, #101829 58%, #0A101C 100%)',
    pageBaseColor: '#101829',
    canvasBorderColor: 'rgba(147, 197, 253, 0.28)',
    canvasInnerHighlight: 'rgba(219, 234, 254, 0.14)',
    canvasShadow: DARK_SHADOW,
    isDarkEnvironment: true,
  },
  starlit: LIGHT_BACKDROPS.starlit,
  aurora: {
    pageBackground:
      'linear-gradient(135deg, #231322 0%, #271C14 50%, #14192D 100%)',
    pageBaseColor: '#231322',
    canvasBorderColor: 'rgba(251, 191, 36, 0.28)',
    canvasInnerHighlight: 'rgba(253, 230, 138, 0.14)',
    canvasShadow: DARK_SHADOW,
    isDarkEnvironment: true,
  },
  velvetSalon: LIGHT_BACKDROPS.velvetSalon,
  opalMist: {
    pageBackground:
      'linear-gradient(135deg, #181D25 0%, #211922 50%, #131E25 100%)',
    pageBaseColor: '#181D25',
    canvasBorderColor: 'rgba(186, 230, 253, 0.26)',
    canvasInnerHighlight: 'rgba(224, 242, 254, 0.13)',
    canvasShadow: DARK_SHADOW,
    isDarkEnvironment: true,
  },
  crystalPalace: {
    pageBackground:
      'radial-gradient(circle at 50% 38%, #29221A 0%, #1D1711 58%, #120E0A 100%)',
    pageBaseColor: '#1D1711',
    canvasBorderColor: 'rgba(245, 184, 58, 0.30)',
    canvasInnerHighlight: 'rgba(254, 243, 199, 0.14)',
    canvasShadow: DARK_SHADOW,
    isDarkEnvironment: true,
  },
  midnightNoel: LIGHT_BACKDROPS.midnightNoel,
  champagneSilk: {
    pageBackground:
      'radial-gradient(circle at 50% 42%, #2E261C 0%, #221C14 58%, #17120D 100%)',
    pageBaseColor: '#221C14',
    canvasBorderColor: 'rgba(224, 192, 138, 0.28)',
    canvasInnerHighlight: 'rgba(254, 243, 199, 0.14)',
    canvasShadow: DARK_SHADOW,
    isDarkEnvironment: true,
  },
  terracottaWall: {
    pageBackground:
      'radial-gradient(circle at 48% 40%, #302019 0%, #231611 58%, #180E0B 100%)',
    pageBaseColor: '#231611',
    canvasBorderColor: 'rgba(214, 148, 116, 0.28)',
    canvasInnerHighlight: 'rgba(255, 236, 224, 0.12)',
    canvasShadow: DARK_SHADOW,
    isDarkEnvironment: true,
  },
  lavenderSilk: {
    pageBackground:
      'radial-gradient(circle at 50% 40%, #261D35 0%, #1B1427 58%, #120D1B 100%)',
    pageBaseColor: '#1B1427',
    canvasBorderColor: 'rgba(196, 181, 253, 0.30)',
    canvasInnerHighlight: 'rgba(237, 233, 254, 0.15)',
    canvasShadow: DARK_SHADOW,
    isDarkEnvironment: true,
  },
  parisBalcony: {
    pageBackground:
      'linear-gradient(155deg, #271E2E 0%, #1E1829 52%, #151424 100%)',
    pageBaseColor: '#1E1829',
    canvasBorderColor: 'rgba(216, 180, 212, 0.28)',
    canvasInnerHighlight: 'rgba(253, 230, 138, 0.14)',
    canvasShadow: DARK_SHADOW,
    isDarkEnvironment: true,
  },
  sakuraBreeze: {
    pageBackground:
      'radial-gradient(circle at 46% 36%, #311D25 0%, #23141B 58%, #170C11 100%)',
    pageBaseColor: '#23141B',
    canvasBorderColor: 'rgba(249, 168, 212, 0.30)',
    canvasInnerHighlight: 'rgba(255, 241, 246, 0.14)',
    canvasShadow: DARK_SHADOW,
    isDarkEnvironment: true,
  },
};

export function getEnvironmentPageBackdrop(
  environment: CanvasEnvironment | undefined,
  isDarkMode: boolean
): EnvironmentPageBackdrop {
  const env: CanvasEnvironment = environment || 'studio';
  const table = isDarkMode ? DARK_BACKDROPS : LIGHT_BACKDROPS;
  return table[env] || table.studio;
}
