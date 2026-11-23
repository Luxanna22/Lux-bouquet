import React, { useEffect, useRef, useState } from 'react';
import { Download, PlusSquare, Share, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  hasSeenMobilePWAInstallPrompt,
  markMobilePWAInstallPromptSeen,
  resolveMobilePWAInstallMode,
  type MobilePWAInstallMode,
} from '../lib/pwaInstallPrompt';

interface MobilePWAInstallToastProps {
  isDarkMode: boolean;
  /** Suppress on gift recipient views, preview overlays, or admin console */
  isSuppressed?: boolean;
  /** Where to anchor the floating toast so it stays clear of page toolbars */
  placement?: 'top' | 'bottom';
  /** Avoid visual collision when a transient status toast is already visible at top */
  hasActiveStatusToast?: boolean;
  onToast?: (msg: string) => void;
}

const SHOW_DELAY_MS = 2200;
const AUTO_DISMISS_MS = 14000;

export const MobilePWAInstallToast: React.FC<MobilePWAInstallToastProps> = ({
  isDarkMode,
  isSuppressed = false,
  placement = 'bottom',
  hasActiveStatusToast = false,
  onToast,
}) => {
  const { isInstallable, isInstalled, isMobile, isIOS, isIOSSafari, install } = usePWAInstall();
  const [hasSeenBefore, setHasSeenBefore] = useState<boolean>(() => hasSeenMobilePWAInstallPrompt());
  const [activeMode, setActiveMode] = useState<MobilePWAInstallMode>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const autoHideTimerRef = useRef<number | null>(null);

  const eligibleMode = resolveMobilePWAInstallMode({
    isMobile,
    isInstalled,
    isInstallable,
    isIOS,
    hasSeenBefore,
    isSuppressedView: isSuppressed,
  });

  // Reveal gently once after initial page settle, then persist so it only ever shows once.
  useEffect(() => {
    if (!eligibleMode || activeMode) return;

    const timer = window.setTimeout(() => {
      if (hasSeenMobilePWAInstallPrompt()) {
        setHasSeenBefore(true);
        return;
      }
      markMobilePWAInstallPromptSeen('shown');
      setHasSeenBefore(true);
      setActiveMode(eligibleMode);
    }, SHOW_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [eligibleMode, activeMode]);

  // If the app finishes installing or enters a suppressed view while visible, close cleanly.
  useEffect(() => {
    if (isInstalled || isSuppressed) {
      setActiveMode(null);
      setShowIOSGuide(false);
    }
  }, [isInstalled, isSuppressed]);

  // Auto-hide after a calm window so the toast stays completely non-invasive even if ignored.
  useEffect(() => {
    if (autoHideTimerRef.current !== null) {
      window.clearTimeout(autoHideTimerRef.current);
      autoHideTimerRef.current = null;
    }

    if (!activeMode || showIOSGuide || isInstalling) return;

    autoHideTimerRef.current = window.setTimeout(() => {
      setActiveMode(null);
    }, AUTO_DISMISS_MS);

    return () => {
      if (autoHideTimerRef.current !== null) {
        window.clearTimeout(autoHideTimerRef.current);
        autoHideTimerRef.current = null;
      }
    };
  }, [activeMode, showIOSGuide, isInstalling]);

  const handleDismiss = () => {
    markMobilePWAInstallPromptSeen('dismissed');
    setHasSeenBefore(true);
    setActiveMode(null);
    setShowIOSGuide(false);
  };

  const handleInstallAction = async () => {
    if (activeMode === 'ios') {
      setShowIOSGuide(true);
      return;
    }

    if (isInstalling) return;
    setIsInstalling(true);
    const result = await install();
    setIsInstalling(false);

    if (result === 'accepted') {
      markMobilePWAInstallPromptSeen('installed');
      setActiveMode(null);
      onToast?.('SendBouquet added to your home screen');
    } else {
      markMobilePWAInstallPromptSeen('dismissed');
      setActiveMode(null);
    }
  };

  if (isInstalled || (!activeMode && !showIOSGuide)) {
    return null;
  }

  const positionClass =
    placement === 'top'
      ? 'top-[58px]'
      : 'bottom-[max(14px,env(safe-area-inset-bottom))]';

  // If a transient top status pill is showing while anchored at top, gently tuck out of the way.
  const collisionClass =
    placement === 'top' && hasActiveStatusToast
      ? 'opacity-0 -translate-y-2 pointer-events-none'
      : 'opacity-100 translate-y-0';

  return (
    <>
      {activeMode && !showIOSGuide && (
        <div
          role="region"
          aria-label="Install Send A Bouquet app"
          className={`fixed left-1/2 -translate-x-1/2 z-[55] w-[calc(100%-24px)] max-w-[356px] pointer-events-none transition-all duration-300 ease-out ${positionClass} ${collisionClass}`}
        >
          <div
            className={`pointer-events-auto flex items-center gap-2.5 rounded-2xl border px-3 py-2 backdrop-blur-md shadow-[0_10px_28px_rgba(35,28,24,0.14)] sab-pwa-toast-enter ${
              isDarkMode
                ? 'bg-[#352C29]/95 border-[#554742] text-[#FBF6F1]'
                : 'bg-[#FFFDF9]/96 border-[#E8DBD0] text-[#231C18]'
            }`}
          >
            <img
              src="/pwa-192x192.png"
              alt="Send A Bouquet icon"
              width={32}
              height={32}
              className={`w-8 h-8 rounded-xl shrink-0 object-cover border ${
                isDarkMode ? 'border-[#5A4B45]' : 'border-[#EFE4DA]'
              }`}
            />

            <div className="min-w-0 flex-1 leading-tight">
              <p className="text-[12px] font-semibold tracking-[-0.01em] truncate">
                Install Send A Bouquet
              </p>
              <p
                className={`text-[11px] truncate mt-0.5 ${
                  isDarkMode ? 'text-[#CDBCB3]' : 'text-[#78685E]'
                }`}
              >
                {activeMode === 'ios'
                  ? 'Save to your home screen'
                  : 'Quick home screen access'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleInstallAction}
              disabled={isInstalling}
              className={`shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold transition active:scale-95 cursor-pointer disabled:opacity-60 ${
                isDarkMode
                  ? 'bg-[#E6B89C] text-[#231C18] hover:bg-[#efc6ad]'
                  : 'bg-[#6E4434] text-[#FFFDF9] hover:bg-[#5c3729]'
              }`}
            >
              {activeMode === 'ios' ? (
                <>
                  <Share className="w-3 h-3" />
                  <span>Add</span>
                </>
              ) : (
                <>
                  <Download className="w-3 h-3" />
                  <span>{isInstalling ? 'Opening…' : 'Install'}</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss install suggestion"
              className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition cursor-pointer ${
                isDarkMode
                  ? 'text-[#B5A399] hover:bg-white/10 hover:text-[#FBF6F1]'
                  : 'text-[#8C7A6F] hover:bg-black/5 hover:text-[#231C18]'
              }`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {showIOSGuide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-pwa-guide-title"
          onClick={handleDismiss}
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 backdrop-blur-[2px] p-3 pb-[max(16px,env(safe-area-inset-bottom))]"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-sm rounded-3xl border p-4 shadow-2xl sab-pwa-toast-enter ${
              isDarkMode
                ? 'bg-[#2C2421] border-[#4E423E] text-[#FBF6F1]'
                : 'bg-[#FFFDF9] border-[#E8DBD0] text-[#231C18]'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src="/pwa-192x192.png"
                  alt="Send A Bouquet"
                  width={36}
                  height={36}
                  className={`w-9 h-9 rounded-xl shrink-0 border ${
                    isDarkMode ? 'border-[#554742]' : 'border-[#EFE4DA]'
                  }`}
                />
                <div className="min-w-0">
                  <h3
                    id="ios-pwa-guide-title"
                    className="text-sm font-semibold tracking-[-0.01em]"
                  >
                    Add Send A Bouquet
                  </h3>
                  <p
                    className={`text-[11px] ${
                      isDarkMode ? 'text-[#C6B5AC]' : 'text-[#7A6A60]'
                    }`}
                  >
                    {isIOSSafari
                      ? 'Install right from Safari in 2 taps'
                      : 'Open in Safari or use the Share menu'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Close install instructions"
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 cursor-pointer ${
                  isDarkMode
                    ? 'text-[#C6B5AC] hover:bg-white/10'
                    : 'text-[#7A6A60] hover:bg-black/5'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <ol
              className={`mt-3.5 space-y-2.5 text-xs ${
                isDarkMode ? 'text-[#E7DCD5]' : 'text-[#443831]'
              }`}
            >
              <li className="flex items-center gap-2.5">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    isDarkMode ? 'bg-[#3F3430] text-[#E6B89C]' : 'bg-[#F5ECE4] text-[#6E4434]'
                  }`}
                >
                  <Share className="w-3.5 h-3.5" />
                </span>
                <span>
                  Tap the <strong>Share</strong> icon in your browser toolbar.
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    isDarkMode ? 'bg-[#3F3430] text-[#E6B89C]' : 'bg-[#F5ECE4] text-[#6E4434]'
                  }`}
                >
                  <PlusSquare className="w-3.5 h-3.5" />
                </span>
                <span>
                  Scroll down and tap <strong>Add to Home Screen</strong>.
                </span>
              </li>
            </ol>

            <button
              type="button"
              onClick={handleDismiss}
              className={`mt-4 w-full rounded-full py-2 text-xs font-semibold transition cursor-pointer ${
                isDarkMode
                  ? 'bg-[#E6B89C] text-[#231C18] hover:bg-[#efc6ad]'
                  : 'bg-[#6E4434] text-[#FFFDF9] hover:bg-[#5c3729]'
              }`}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
