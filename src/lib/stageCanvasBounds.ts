import { BouquetPose, DEFAULT_BOUQUET_POSE, typeWrapStyle } from '../types/bouquet';

// Main SVG canvas viewBox: "-24 0 648 680" -> x in [-24, 624], y in [0, 680]
export const STAGE_VIEWBOX_MIN_X = -24;
export const STAGE_VIEWBOX_MAX_X = 624;
export const STAGE_VIEWBOX_MIN_Y = 0;
export const STAGE_VIEWBOX_MAX_Y = 680;

// Full-canvas draggable center bounds (matches the visible main canvas frame)
export const STAGE_DRAG_MIN_X = -16;
export const STAGE_DRAG_MAX_X = 616;
export const STAGE_DRAG_MIN_Y = 12;
export const STAGE_DRAG_MAX_Y = 668;

// Bouquet local transform pivot (matches BouquetStage.tsx bouquetTransform)
export const BOUQUET_POSE_PIVOT_X = 300;
export const BOUQUET_POSE_PIVOT_Y = 380;

export const ITEM_LOCAL_COORD_MIN = -1200;
export const ITEM_LOCAL_COORD_MAX = 1800;

/**
 * Forward transform: bouquet-local (x, y) -> main SVG canvas viewBox (x, y).
 * Mirrors SVG transform:
 *   translate(pose.x, pose.y) rotate(pose.rotation) scale(pose.scale) translate(-300, -380)
 */
export function bouquetLocalToSvgCoords(
  localX: number,
  localY: number,
  pose: BouquetPose = DEFAULT_BOUQUET_POSE
): { x: number; y: number } {
  const scale = pose.scale || 1;
  const rad = ((pose.rotation || 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const sx = (localX - BOUQUET_POSE_PIVOT_X) * scale;
  const sy = (localY - BOUQUET_POSE_PIVOT_Y) * scale;
  return {
    x: pose.x + sx * cos - sy * sin,
    y: pose.y + sx * sin + sy * cos,
  };
}

/**
 * Inverse transform: main SVG canvas viewBox (x, y) -> bouquet-local (x, y).
 */
export function svgToBouquetLocalCoords(
  svgX: number,
  svgY: number,
  pose: BouquetPose = DEFAULT_BOUQUET_POSE
): { x: number; y: number } {
  const scale = pose.scale || 1;
  const dx = (svgX - pose.x) / scale;
  const dy = (svgY - pose.y) / scale;
  const rad = ((-pose.rotation || 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: BOUQUET_POSE_PIVOT_X + dx * cos - dy * sin,
    y: BOUQUET_POSE_PIVOT_Y + dx * sin + dy * cos,
  };
}

/**
 * Clamps a bouquet-local drag coordinate against the FULL main SVG canvas frame
 * (`viewBox="-24 0 648 680"`) rather than a smaller wrapper-local box, so flowers
 * and accents can always be placed anywhere on the visible canvas regardless of
 * how the bouquet wrapper is scaled, shifted, or rotated.
 */
export function clampBouquetLocalPointToStage(
  localX: number,
  localY: number,
  pose: BouquetPose = DEFAULT_BOUQUET_POSE
): { x: number; y: number } {
  const svgPt = bouquetLocalToSvgCoords(localX, localY, pose);
  const clampedSvgX = Math.max(STAGE_DRAG_MIN_X, Math.min(STAGE_DRAG_MAX_X, svgPt.x));
  const clampedSvgY = Math.max(STAGE_DRAG_MIN_Y, Math.min(STAGE_DRAG_MAX_Y, svgPt.y));
  const backLocal = svgToBouquetLocalCoords(clampedSvgX, clampedSvgY, pose);
  return {
    x: Math.max(ITEM_LOCAL_COORD_MIN, Math.min(ITEM_LOCAL_COORD_MAX, Math.round(backLocal.x))),
    y: Math.max(ITEM_LOCAL_COORD_MIN, Math.min(ITEM_LOCAL_COORD_MAX, Math.round(backLocal.y))),
  };
}

/**
 * Keeps lower stems of flowers tucked *inside* a wrapper/vase/basket from poking
 * underneath the bottom edge of the wrapper — without ever clipping flower heads,
 * petals, or any bloom placed outside the wrapper footprint.
 */
export function computeWrapperTuckedStemLength(params: {
  itemX: number;
  itemY: number;
  itemScale: number;
  itemRotation: number;
  requestedStemLength: number;
  wrapStyle: typeWrapStyle;
  wrapperBottomClipY: number;
}): number {
  const {
    itemX,
    itemY,
    itemScale,
    itemRotation,
    requestedStemLength,
    wrapStyle,
    wrapperBottomClipY,
  } = params;

  if (wrapStyle === 'plain' || wrapStyle === 'cloche') {
    return requestedStemLength;
  }

  // Only trim stems for blooms sitting horizontally within the wrapper base footprint
  // and above the wrapper's bottom edge. Blooms placed elsewhere on the canvas render freely.
  if (itemX < 170 || itemX > 430 || itemY >= wrapperBottomClipY - 4) {
    return requestedStemLength;
  }

  const safeScale = Math.max(0.25, itemScale || 1);
  const cosRot = Math.cos(((itemRotation || 0) * Math.PI) / 180);
  // Stem pointing sideways or upward cannot extend beneath the wrapper bottom
  if (cosRot <= 0.15) {
    return requestedStemLength;
  }

  const stemOriginY = 20;
  const stemSpanPx = 148; // Standard botanical stem reaches local y ~= 168 at stemLength = 1
  const safeBottomY = wrapperBottomClipY - 6;
  const projectedBottomY =
    itemY + (stemOriginY + stemSpanPx * requestedStemLength) * cosRot * safeScale;

  if (projectedBottomY <= safeBottomY) {
    return requestedStemLength;
  }

  const availableLocalY = (safeBottomY - itemY) / (cosRot * safeScale);
  const maxStemRatio = Math.max(0, (availableLocalY - stemOriginY) / stemSpanPx);
  return Math.min(requestedStemLength, Number(maxStemRatio.toFixed(3)));
}
