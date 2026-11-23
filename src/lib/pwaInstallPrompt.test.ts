import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PWA_MOBILE_INSTALL_SEEN_KEY,
  hasSeenMobilePWAInstallPrompt,
  isIOSDeviceContext,
  isIOSSafariContext,
  isMobileDeviceContext,
  isStandaloneDisplayMode,
  markMobilePWAInstallPromptSeen,
  resolveMobilePWAInstallMode,
  type StorageLike,
} from './pwaInstallPrompt';

function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}

test('detects mobile vs desktop devices accurately including iPadOS', () => {
  const androidChromeUA =
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';
  const iPhoneSafariUA =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
  const iPhoneChromeUA =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.0.0 Mobile/15E148 Safari/604.1';
  const macDesktopUA =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

  assert.equal(isMobileDeviceContext({ userAgent: androidChromeUA }), true);
  assert.equal(isIOSDeviceContext({ userAgent: androidChromeUA }), false);

  assert.equal(isMobileDeviceContext({ userAgent: iPhoneSafariUA }), true);
  assert.equal(isIOSDeviceContext({ userAgent: iPhoneSafariUA }), true);
  assert.equal(isIOSSafariContext({ userAgent: iPhoneSafariUA }), true);

  assert.equal(isIOSDeviceContext({ userAgent: iPhoneChromeUA }), true);
  assert.equal(isIOSSafariContext({ userAgent: iPhoneChromeUA }), false);

  // Desktop Mac with no touch points -> not mobile
  assert.equal(
    isMobileDeviceContext({
      userAgent: macDesktopUA,
      platform: 'MacIntel',
      maxTouchPoints: 0,
      coarseSmallViewport: false,
    }),
    false
  );

  // iPadOS reporting MacIntel with multi-touch -> mobile iOS
  assert.equal(
    isMobileDeviceContext({
      userAgent: macDesktopUA,
      platform: 'MacIntel',
      maxTouchPoints: 5,
    }),
    true
  );
  assert.equal(
    isIOSDeviceContext({
      userAgent: macDesktopUA,
      platform: 'MacIntel',
      maxTouchPoints: 5,
    }),
    true
  );
});

test('detects installed standalone PWA contexts across Android and iOS', () => {
  assert.equal(isStandaloneDisplayMode({}), false);
  assert.equal(isStandaloneDisplayMode({ matchMediaStandalone: true }), true);
  assert.equal(isStandaloneDisplayMode({ navigatorStandalone: true }), true);
  assert.equal(
    isStandaloneDisplayMode({ referrer: 'android-app://online.sendabouquet.twa' }),
    true
  );
});

test('persists one-time prompt visibility safely in storage', () => {
  const storage = createMemoryStorage();
  assert.equal(hasSeenMobilePWAInstallPrompt(storage), false);

  const saved = markMobilePWAInstallPromptSeen('shown', storage);
  assert.equal(saved, true);
  assert.equal(hasSeenMobilePWAInstallPrompt(storage), true);
  assert.ok(storage.getItem(PWA_MOBILE_INSTALL_SEEN_KEY)?.startsWith('shown:'));

  // Gracefully handles restricted storage errors without throwing
  const throwingStorage: StorageLike = {
    getItem: () => {
      throw new Error('Access to storage is not allowed from this context');
    },
    setItem: () => {
      throw new Error('Access to storage is not allowed from this context');
    },
  };
  assert.equal(hasSeenMobilePWAInstallPrompt(throwingStorage), false);
  assert.equal(markMobilePWAInstallPromptSeen('dismissed', throwingStorage), false);
});

test('resolves install mode strictly for one-time eligible mobile visitors', () => {
  // Desktop with beforeinstallprompt -> never shown
  assert.equal(
    resolveMobilePWAInstallMode({
      isMobile: false,
      isInstalled: false,
      isInstallable: true,
      isIOS: false,
      hasSeenBefore: false,
      isSuppressedView: false,
    }),
    null
  );

  // Android mobile with beforeinstallprompt -> native install flow
  assert.equal(
    resolveMobilePWAInstallMode({
      isMobile: true,
      isInstalled: false,
      isInstallable: true,
      isIOS: false,
      hasSeenBefore: false,
      isSuppressedView: false,
    }),
    'native'
  );

  // iOS Safari mobile without beforeinstallprompt -> iOS guided flow
  assert.equal(
    resolveMobilePWAInstallMode({
      isMobile: true,
      isInstalled: false,
      isInstallable: false,
      isIOS: true,
      hasSeenBefore: false,
      isSuppressedView: false,
    }),
    'ios'
  );

  // Already shown once -> never shown again
  assert.equal(
    resolveMobilePWAInstallMode({
      isMobile: true,
      isInstalled: false,
      isInstallable: true,
      isIOS: false,
      hasSeenBefore: true,
      isSuppressedView: false,
    }),
    null
  );

  // Already running as installed standalone PWA -> never shown
  assert.equal(
    resolveMobilePWAInstallMode({
      isMobile: true,
      isInstalled: true,
      isInstallable: true,
      isIOS: false,
      hasSeenBefore: false,
      isSuppressedView: false,
    }),
    null
  );

  // Suppressed on recipient gift reveal / preview / admin views -> waits until eligible
  assert.equal(
    resolveMobilePWAInstallMode({
      isMobile: true,
      isInstalled: false,
      isInstallable: true,
      isIOS: false,
      hasSeenBefore: false,
      isSuppressedView: true,
    }),
    null
  );
});
