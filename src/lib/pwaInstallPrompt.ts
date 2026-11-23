export const PWA_MOBILE_INSTALL_SEEN_KEY = 'sab_pwa_mobile_install_prompt_v1';

export type MobilePWAInstallPromptStatus = 'shown' | 'dismissed' | 'installed';
export type MobilePWAInstallMode = 'native' | 'ios' | null;

export interface DeviceDetectionInput {
  userAgent: string;
  platform?: string;
  maxTouchPoints?: number;
  coarseSmallViewport?: boolean;
}

export interface StandaloneDetectionInput {
  matchMediaStandalone?: boolean;
  matchMediaFullscreen?: boolean;
  matchMediaMinimalUi?: boolean;
  navigatorStandalone?: boolean;
  referrer?: string;
}

export interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export function isIOSDeviceContext({
  userAgent,
  platform = '',
  maxTouchPoints = 0,
}: Pick<DeviceDetectionInput, 'userAgent' | 'platform' | 'maxTouchPoints'>): boolean {
  const ua = userAgent || '';
  if (/iphone|ipad|ipod/i.test(ua)) return true;
  // iPadOS 13+ reports Macintosh in UA with MacIntel platform and touch points
  if (platform === 'MacIntel' && maxTouchPoints > 1) return true;
  return false;
}

export function isIOSSafariContext(
  input: Pick<DeviceDetectionInput, 'userAgent' | 'platform' | 'maxTouchPoints'>
): boolean {
  if (!isIOSDeviceContext(input)) return false;
  const ua = input.userAgent || '';
  const isOtherIOSBrowser = /crios|fxios|edgios|opios|duckduckgo|fban|fbav|instagram|line\//i.test(ua);
  return /safari/i.test(ua) && !isOtherIOSBrowser;
}

export function isMobileDeviceContext({
  userAgent,
  platform = '',
  maxTouchPoints = 0,
  coarseSmallViewport = false,
}: DeviceDetectionInput): boolean {
  if (isIOSDeviceContext({ userAgent, platform, maxTouchPoints })) return true;
  const ua = userAgent || '';
  if (/android|mobile|iemobile|opera mini|blackberry|webos|silk/i.test(ua)) {
    return true;
  }
  return Boolean(coarseSmallViewport);
}

export function isStandaloneDisplayMode({
  matchMediaStandalone = false,
  matchMediaFullscreen = false,
  matchMediaMinimalUi = false,
  navigatorStandalone = false,
  referrer = '',
}: StandaloneDetectionInput): boolean {
  if (matchMediaStandalone || matchMediaFullscreen || matchMediaMinimalUi) {
    return true;
  }
  if (navigatorStandalone === true) {
    return true;
  }
  if (typeof referrer === 'string' && referrer.startsWith('android-app://')) {
    return true;
  }
  return false;
}

export function getBrowserStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function hasSeenMobilePWAInstallPrompt(storage: StorageLike | null = getBrowserStorage()): boolean {
  if (!storage) return false;
  try {
    return Boolean(storage.getItem(PWA_MOBILE_INSTALL_SEEN_KEY));
  } catch {
    return false;
  }
}

export function markMobilePWAInstallPromptSeen(
  status: MobilePWAInstallPromptStatus,
  storage: StorageLike | null = getBrowserStorage()
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(PWA_MOBILE_INSTALL_SEEN_KEY, `${status}:${Date.now()}`);
    return true;
  } catch {
    return false;
  }
}

export function resolveMobilePWAInstallMode(params: {
  isMobile: boolean;
  isInstalled: boolean;
  isInstallable: boolean;
  isIOS: boolean;
  hasSeenBefore: boolean;
  isSuppressedView: boolean;
}): MobilePWAInstallMode {
  const { isMobile, isInstalled, isInstallable, isIOS, hasSeenBefore, isSuppressedView } = params;
  if (!isMobile || isInstalled || hasSeenBefore || isSuppressedView) {
    return null;
  }
  if (isInstallable) {
    return 'native';
  }
  if (isIOS) {
    return 'ios';
  }
  return null;
}
