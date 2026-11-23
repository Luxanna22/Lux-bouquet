import { useCallback, useEffect, useState } from 'react';
import {
  isIOSDeviceContext,
  isIOSSafariContext,
  isMobileDeviceContext,
  isStandaloneDisplayMode,
} from '../lib/pwaInstallPrompt';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

// Capture `beforeinstallprompt` as early as possible (even before React mounts)
// so we never miss the browser's install prompt event on Android mobile browsers.
let capturedDeferredPrompt: BeforeInstallPromptEvent | null = null;
const promptSubscribers = new Set<(event: BeforeInstallPromptEvent | null) => void>();

function notifyPromptSubscribers(event: BeforeInstallPromptEvent | null) {
  capturedDeferredPrompt = event;
  promptSubscribers.forEach((listener) => listener(event));
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event: Event) => {
    event.preventDefault();
    notifyPromptSubscribers(event as BeforeInstallPromptEvent);
  });

  window.addEventListener('appinstalled', () => {
    notifyPromptSubscribers(null);
  });
}

function readEnvironmentFlags() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      isInstalled: false,
      isMobile: false,
      isIOS: false,
      isIOSSafari: false,
    };
  }

  const nav = navigator as Navigator & { standalone?: boolean };
  const matchMediaSafe = (query: string) => {
    try {
      return typeof window.matchMedia === 'function' && window.matchMedia(query).matches;
    } catch {
      return false;
    }
  };

  const deviceInput = {
    userAgent: nav.userAgent || '',
    platform: nav.platform || '',
    maxTouchPoints: nav.maxTouchPoints || 0,
    coarseSmallViewport: matchMediaSafe('(max-width: 767px) and (pointer: coarse)'),
  };

  return {
    isInstalled: isStandaloneDisplayMode({
      matchMediaStandalone: matchMediaSafe('(display-mode: standalone)'),
      matchMediaFullscreen: matchMediaSafe('(display-mode: fullscreen)'),
      matchMediaMinimalUi: matchMediaSafe('(display-mode: minimal-ui)'),
      navigatorStandalone: nav.standalone === true,
      referrer: typeof document !== 'undefined' ? document.referrer : '',
    }),
    isMobile: isMobileDeviceContext(deviceInput),
    isIOS: isIOSDeviceContext(deviceInput),
    isIOSSafari: isIOSSafariContext(deviceInput),
  };
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => capturedDeferredPrompt
  );
  const [envFlags, setEnvFlags] = useState(() => readEnvironmentFlags());

  useEffect(() => {
    setEnvFlags(readEnvironmentFlags());
    setDeferredPrompt(capturedDeferredPrompt);

    const handlePromptChange = (event: BeforeInstallPromptEvent | null) => {
      setDeferredPrompt(event);
    };
    promptSubscribers.add(handlePromptChange);

    const handleAppInstalled = () => {
      setEnvFlags((prev) => ({ ...prev, isInstalled: true }));
      setDeferredPrompt(null);
    };

    const standaloneQuery =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(display-mode: standalone)')
        : null;

    const handleDisplayModeChange = () => {
      setEnvFlags(readEnvironmentFlags());
    };

    window.addEventListener('appinstalled', handleAppInstalled);
    standaloneQuery?.addEventListener?.('change', handleDisplayModeChange);

    return () => {
      promptSubscribers.delete(handlePromptChange);
      window.removeEventListener('appinstalled', handleAppInstalled);
      standaloneQuery?.removeEventListener?.('change', handleDisplayModeChange);
    };
  }, []);

  const install = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    const promptEvent = deferredPrompt || capturedDeferredPrompt;
    if (!promptEvent) return 'unavailable';
    try {
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      notifyPromptSubscribers(null);
      if (outcome === 'accepted') {
        setEnvFlags((prev) => ({ ...prev, isInstalled: true }));
        return 'accepted';
      }
      return 'dismissed';
    } catch {
      notifyPromptSubscribers(null);
      return 'unavailable';
    }
  }, [deferredPrompt]);

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled: envFlags.isInstalled,
    isMobile: envFlags.isMobile,
    isIOS: envFlags.isIOS,
    isIOSSafari: envFlags.isIOSSafari,
    install,
  };
}
