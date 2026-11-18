import React, { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import type { BouquetLockConfig, BouquetPasscodeType } from '../types/bouquet';
import type { RecipientSlideBloomState } from '../lib/dofParallax';
import {
  DEFAULT_PIN_HINT,
  DEFAULT_WORD_HINT,
  sanitizeSecretPinInput,
  sanitizeSecretWordInput,
} from '../lib/lockUtils';
import {
  DeliveryPreludeScene,
  getDeliverySceneTimings,
} from '../lib/deliveryPrelude';

interface CountdownParts {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
}

export interface RecipientDeliveryPreludeProps {
  scene: DeliveryPreludeScene;
  onSceneChange: (next: DeliveryPreludeScene) => void;
  onTouchWaxSeal: () => void;
  onSkipToThreshold: () => void;
  onReplayPrelude: () => void;
  isReducedMotion: boolean;
  isDarkMode: boolean;
  isPreviewMode: boolean;
  isResolvingShortCode: boolean;
  isEntranceUnfurling: boolean;
  recipientName: string;
  recipientBloom: RecipientSlideBloomState;
  entranceSlideProgress: number;
  isDraggingEntranceSlider: boolean;
  onBack: () => void;
  // Lock & Countdown props
  lock?: BouquetLockConfig;
  isCountdownLocked: boolean;
  countdownParts: CountdownParts;
  countdownTargetMs: number | null;
  isPasscodeLocked: boolean;
  effectivePasscodeType: BouquetPasscodeType;
  passcodeAttempt: string;
  passcodeFeedback: 'idle' | 'error' | 'success';
  passcodeError: string | null;
  passcodeShakeKey: number;
  isPinFocused: boolean;
  isWordFocused: boolean;
  onSetIsPinFocused: (focused: boolean) => void;
  onSetIsWordFocused: (focused: boolean) => void;
  onPasscodeAttemptChange: (next: string) => void;
  onResetPasscodeFeedback: () => void;
  onTriggerPasscodeVerification: (candidate: string) => void;
  onSubmitPasscodeForm: (e?: React.FormEvent) => void;
  onClearPinErrorTimer: () => void;
  pinInputRef: React.MutableRefObject<HTMLInputElement | null>;
  // Slide & Unwrap handlers
  isGiftCurrentlyLocked: boolean;
  onUnwrapForceBypass: () => void;
  onGlideSlideToOpen: (startFrom?: number, forceBypassLock?: boolean) => void;
  onGlideSlideReset?: (startFrom?: number) => void;
  onSetEntranceSlideProgress: (ratio: number) => void;
  onSetIsDraggingEntranceSlider: (dragging: boolean) => void;
  onCancelEntranceSlideRaf: () => void;
  renderCoutureSealIcon: (className?: string) => React.ReactNode;
}

/**
 * Pure SVG group for the Crimson Botanical Wax Seal centered around (0, 0)
 * (radius ~33px) so it can be embedded directly in SVG coordinate space or standalone.
 */
const CrimsonWaxSealGroup: React.FC<{
  splitSide?: 'whole' | 'left' | 'right';
  idSuffix?: string;
}> = ({ splitSide = 'whole', idSuffix = 'main' }) => {
  const gradId = `sab-wax-crimson-${idSuffix}`;
  const wellId = `sab-wax-well-${idSuffix}`;
  const clipId =
    splitSide === 'left'
      ? `sab-wax-left-${idSuffix}`
      : splitSide === 'right'
      ? `sab-wax-right-${idSuffix}`
      : undefined;

  return (
    <g>
      <defs>
        <radialGradient id={gradId} cx="36%" cy="30%" r="68%">
          <stop offset="0%" stopColor="#BD5B6C" />
          <stop offset="52%" stopColor="#9E4757" />
          <stop offset="100%" stopColor="#6D2936" />
        </radialGradient>
        <radialGradient id={wellId} cx="45%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#823242" />
          <stop offset="100%" stopColor="#AA4F60" />
        </radialGradient>
        {splitSide === 'left' && (
          <clipPath id={clipId}>
            <path d="M -42,-42 L 2,-42 L -3,-13 L 3,5 L -2,21 L 2,42 L -42,42 Z" />
          </clipPath>
        )}
        {splitSide === 'right' && (
          <clipPath id={clipId}>
            <path d="M 2,-42 L 42,-42 L 42,42 L 2,42 L -2,21 L 3,5 L -3,-13 Z" />
          </clipPath>
        )}
      </defs>
      <g clipPath={clipId ? `url(#${clipId})` : undefined}>
        {/* Organic molten wax outer rim */}
        <path
          d="M 0,-32.5 C 9.5,-34 19,-30 25.5,-23 C 32,-16 34.5,-6.5 33,3.5 C 31.5,13 27.5,22.5 19.5,28 C 11.5,33.5 1,34.5 -8.5,32.5 C -18,30.5 -26.5,24.5 -30.5,15.5 C -34.5,6.5 -34,-4.5 -29.5,-13.5 C -25,-22.5 -17.5,-29 -8.5,-31.5 C -5.5,-32.2 -2.8,-32.2 0,-32.5 Z"
          fill={`url(#${gradId})`}
          stroke="#59202B"
          strokeWidth="0.9"
        />
        {/* Inner stamped recess */}
        <circle
          cx="0"
          cy="0"
          r="22.5"
          fill={`url(#${wellId})`}
          stroke="#D78A98"
          strokeWidth="0.9"
          strokeOpacity="0.65"
        />
        {/* Tailor-perforated ring */}
        <circle
          cx="0"
          cy="0"
          r="19"
          fill="none"
          stroke="#FDE68A"
          strokeWidth="0.75"
          strokeDasharray="2.2 2"
          opacity="0.72"
        />
        {/* Embossed botanical sprig & heart emblem */}
        <path
          d="M 0,11 L 0,-9 M 0,3 C -6,0 -9,-4 -8,-8 C -4,-7 -1,-3 0,3 Z M 0,0 C 6,-3 9,-7 8,-11 C 4,-10 1,-6 0,0 Z"
          fill="#F9E8EC"
          fillOpacity="0.88"
          stroke="#F9E8EC"
          strokeWidth="1.05"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 0,-11.5 C -2,-14 -5.5,-12.5 -3.8,-9.2 L 0,-5.5 L 3.8,-9.2 C 5.5,-12.5 2,-14 0,-11.5 Z"
          fill="#FFFDF9"
          opacity="0.94"
        />
      </g>
    </g>
  );
};

const CrimsonWaxSealMedallion: React.FC<{ className?: string }> = ({
  className = 'w-11 h-11',
}) => (
  <svg viewBox="-38 -38 76 76" className={`${className} overflow-visible`}>
    <CrimsonWaxSealGroup splitSide="whole" idSuffix="medallion" />
  </svg>
);

export const RecipientDeliveryPrelude: React.FC<RecipientDeliveryPreludeProps> = ({
  scene,
  onSceneChange,
  onTouchWaxSeal,
  onSkipToThreshold,
  onReplayPrelude,
  isReducedMotion,
  isDarkMode,
  isPreviewMode,
  isResolvingShortCode,
  isEntranceUnfurling,
  recipientName,
  recipientBloom,
  entranceSlideProgress,
  isDraggingEntranceSlider,
  onBack,
  lock,
  isCountdownLocked,
  countdownParts,
  countdownTargetMs,
  isPasscodeLocked,
  effectivePasscodeType,
  passcodeAttempt,
  passcodeFeedback,
  passcodeError,
  passcodeShakeKey,
  isPinFocused,
  isWordFocused,
  onSetIsPinFocused,
  onSetIsWordFocused,
  onPasscodeAttemptChange,
  onResetPasscodeFeedback,
  onTriggerPasscodeVerification,
  onSubmitPasscodeForm,
  onClearPinErrorTimer,
  pinInputRef,
  isGiftCurrentlyLocked,
  onUnwrapForceBypass,
  onGlideSlideToOpen,
  onGlideSlideReset,
  onSetEntranceSlideProgress,
  onSetIsDraggingEntranceSlider,
  onCancelEntranceSlideRaf,
  renderCoutureSealIcon,
}) => {
  const sliderTrackRef = useRef<HTMLDivElement | null>(null);
  const sliderDragStartXRef = useRef<number | null>(null);

  // Automatic scene progression from Scene 2 (seal_break) -> Scene 3 (ribbon) -> Scene 4 (threshold)
  useEffect(() => {
    const timings = getDeliverySceneTimings(isReducedMotion);
    if (scene === 'seal_break') {
      const t = window.setTimeout(() => {
        onSceneChange('ribbon');
      }, timings.sealBreakMs);
      return () => window.clearTimeout(t);
    }
    if (scene === 'ribbon') {
      const t = window.setTimeout(() => {
        onSceneChange('threshold');
      }, timings.ribbonMs);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [scene, isReducedMotion, onSceneChange]);

  const isCandlelightStage = scene === 'arrival' || scene === 'seal_break';
  const showBloomStage = scene === 'ribbon' || scene === 'threshold';
  const isThresholdInteractive = scene === 'threshold' && !isEntranceUnfurling;
  const timings = getDeliverySceneTimings(isReducedMotion);

  const backdropClass = isCandlelightStage
    ? 'bg-[#1D1614] text-[#FBF6F1]'
    : isDarkMode
    ? 'bg-[#2B2321] text-[#FBF6F1]'
    : 'bg-[#FDF9F5] text-[#231C18]';

  const laceStroke = isDarkMode ? '#8C766C' : '#C8B09E';
  const laceAccent = isDarkMode ? '#E6B89C' : '#9E4757';

  // Hold the warm veil briefly while the luminous bloom wash swells, then cross-dissolve smoothly
  const dialogDissolveDelayMs = isEntranceUnfurling && !isReducedMotion ? 80 : 0;
  const dialogDissolveDurationMs = isEntranceUnfurling
    ? Math.max(280, timings.unfurlMs - dialogDissolveDelayMs)
    : 900;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bouquet Gift Entrance"
      data-delivery-scene={scene}
      style={{
        opacity: isEntranceUnfurling ? 0 : 1,
        transition: `background-color 900ms cubic-bezier(0.22, 1, 0.36, 1), color 900ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${dialogDissolveDurationMs}ms cubic-bezier(0.33, 1, 0.68, 1) ${dialogDissolveDelayMs}ms`,
      }}
      className={`absolute inset-0 z-40 overflow-hidden select-none ${
        isEntranceUnfurling ? 'pointer-events-none' : ''
      } ${backdropClass}`}
    >
      <style>{`
        @keyframes sab-fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes sab-envelope-arrive {
          0% {
            opacity: 0;
            transform: translate3d(0, -28px, 0) rotate(-1.8deg) scale3d(0.95, 0.95, 1);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) rotate(-0.35deg) scale3d(1, 1, 1);
          }
        }
        @keyframes sab-envelope-breathe {
          0%, 100% {
            transform: translate3d(0, 0, 0) rotate(-0.35deg);
          }
          50% {
            transform: translate3d(0, -4px, 0) rotate(0.35deg);
          }
        }
        @keyframes sab-wax-pulse {
          0% {
            transform: scale3d(0.92, 0.92, 1);
            opacity: 0.58;
          }
          75% {
            transform: scale3d(1.42, 1.42, 1);
            opacity: 0;
          }
          100% {
            transform: scale3d(1.45, 1.45, 1);
            opacity: 0;
          }
        }
        @keyframes sab-front-flap-lift {
          0% {
            transform: scaleY(1);
            opacity: 1;
          }
          95% {
            transform: scaleY(0.02);
            opacity: 1;
          }
          100% {
            transform: scaleY(0);
            opacity: 0;
          }
        }
        @keyframes sab-back-flap-unfold {
          0% {
            transform: scaleY(0.02);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          100% {
            transform: scaleY(1);
            opacity: 1;
          }
        }
        @keyframes sab-seal-left-crack {
          0% {
            transform: translate3d(180px, 204px, 0) rotate(0deg);
            opacity: 1;
          }
          42% {
            transform: translate3d(168px, 207px, 0) rotate(-13deg);
            opacity: 0.95;
          }
          100% {
            transform: translate3d(156px, 222px, 0) rotate(-23deg);
            opacity: 0;
          }
        }
        @keyframes sab-seal-right-crack {
          0% {
            transform: translate3d(180px, 204px, 0) rotate(0deg);
            opacity: 1;
          }
          42% {
            transform: translate3d(192px, 202px, 0) rotate(13deg);
            opacity: 0.95;
          }
          100% {
            transform: translate3d(204px, 220px, 0) rotate(23deg);
            opacity: 0;
          }
        }
        @keyframes sab-paper-slide-up {
          0% {
            transform: translate3d(0, 68px, 0);
          }
          100% {
            transform: translate3d(0, 0, 0);
          }
        }
        @keyframes sab-open-envelope-story {
          0% {
            opacity: 1;
            transform: translate3d(0, -56px, 0) scale3d(1, 1, 1);
          }
          36% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale3d(1, 1, 1);
          }
          78% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale3d(1, 1, 1);
          }
          100% {
            opacity: 0;
            transform: translate3d(0, -8px, 0) scale3d(0.97, 0.97, 1);
          }
        }
        @keyframes sab-separated-note-phase {
          0% {
            opacity: 0;
            transform: translate3d(0, 6px, 0);
          }
          14% {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
          82% {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
          100% {
            opacity: 0;
            transform: translate3d(0, -8px, 0);
          }
        }
        @keyframes sab-handwrite-wipe {
          0% {
            clip-path: inset(-25% 100% -30% 0%);
            opacity: 0.25;
          }
          12% {
            opacity: 1;
          }
          100% {
            clip-path: inset(-25% 0% -30% 0%);
            opacity: 1;
          }
        }
        @keyframes sab-ink-flourish-draw {
          0% {
            stroke-dashoffset: 100;
            opacity: 0;
          }
          15% {
            opacity: 0.78;
          }
          100% {
            stroke-dashoffset: 0;
            opacity: 0.78;
          }
        }
        @keyframes sab-camera-push-bloom {
          0% {
            opacity: 0;
            transform: scale3d(0.86, 0.86, 1);
          }
          100% {
            opacity: 1;
            transform: scale3d(1, 1, 1);
          }
        }
        @keyframes sab-lace-unspool {
          0% {
            clip-path: inset(-30% 48% -30% 48%);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          100% {
            clip-path: inset(-30% 0% -30% 0%);
            opacity: 1;
          }
        }
        @keyframes sab-name-unfurl {
          0% {
            opacity: 0;
            transform: translate3d(0, 12px, 0);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        @keyframes sab-petal-drift-a {
          0% {
            opacity: 0;
            transform: translate3d(-90px, -55px, 0) rotate(-24deg) scale3d(0.8, 0.8, 1);
          }
          22% {
            opacity: 0.78;
          }
          85% {
            opacity: 0.55;
          }
          100% {
            opacity: 0;
            transform: translate3d(110px, 75px, 0) rotate(28deg) scale3d(1.04, 1.04, 1);
          }
        }
        @keyframes sab-petal-drift-b {
          0% {
            opacity: 0;
            transform: translate3d(105px, -65px, 0) rotate(20deg) scale3d(0.75, 0.75, 1);
          }
          25% {
            opacity: 0.72;
          }
          85% {
            opacity: 0.48;
          }
          100% {
            opacity: 0;
            transform: translate3d(-100px, 85px, 0) rotate(-28deg) scale3d(1, 1, 1);
          }
        }
        @keyframes sab-wax-stamp-press {
          0% {
            opacity: 0;
            transform: scale3d(1.38, 1.38, 1) rotate(-10deg);
          }
          65% {
            opacity: 1;
            transform: scale3d(0.96, 0.96, 1) rotate(2deg);
          }
          100% {
            opacity: 1;
            transform: scale3d(1, 1, 1) rotate(0deg);
          }
        }
        @keyframes sab-bloom-light-wash {
          0% {
            opacity: 0;
            transform: scale3d(0.94, 0.94, 1);
          }
          28% {
            opacity: 0.58;
            transform: scale3d(1.04, 1.04, 1);
          }
          100% {
            opacity: 0;
            transform: scale3d(1.22, 1.22, 1);
          }
        }
      `}</style>

      {/* =====================================================================
          TOP NAVIGATION WHISPERS: Floating Overlays (Zero Impact on Centering)
          ===================================================================== */}
      <div
        style={{
          top: 'max(0.75rem, env(safe-area-inset-top))',
          opacity: isEntranceUnfurling ? 0 : 1,
          transition: 'opacity 420ms ease-out',
        }}
        className="absolute left-3 sm:left-6 z-30"
      >
        <button
          type="button"
          onClick={onBack}
          data-testid="gift-entrance-back-btn"
          className={`min-h-[36px] px-3.5 py-1.5 rounded-full border border-dashed text-xs font-medium inline-flex items-center gap-1.5 backdrop-blur-md transition cursor-pointer ${
            isCandlelightStage || isDarkMode
              ? 'bg-[#352C29]/85 border-[#5E4E49] text-[#FBF6F1] hover:bg-[#423734]'
              : 'bg-[#FFFDF9]/90 border-[#DECBB9] text-[#4A382E] hover:bg-[#FAF4EE]'
          }`}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>{isPreviewMode ? 'Back to Studio' : 'Back'}</span>
        </button>
      </div>

      {!isResolvingShortCode && !isEntranceUnfurling && (
        <div
          style={{ top: 'max(0.75rem, env(safe-area-inset-top))' }}
          className="absolute right-3 sm:right-6 z-30"
        >
          {scene !== 'threshold' ? (
            <button
              type="button"
              onClick={onSkipToThreshold}
              data-testid="delivery-skip-btn"
              className={`min-h-[36px] px-3 py-1.5 text-xs font-normal tracking-wide transition cursor-pointer underline decoration-dashed underline-offset-4 ${
                isCandlelightStage || isDarkMode
                  ? 'text-[#D8C7BE]/80 hover:text-[#FBF6F1]'
                  : 'text-[#7D6B60]/85 hover:text-[#231C18]'
              }`}
            >
              Skip
            </button>
          ) : passcodeFeedback !== 'success' ? (
            <button
              type="button"
              onClick={onReplayPrelude}
              data-testid="delivery-replay-btn"
              aria-label="Replay delivery prelude"
              style={{ animation: 'sab-fade-in 380ms ease-out both' }}
              className={`min-h-[36px] px-3 py-1.5 text-xs font-normal tracking-wide inline-flex items-center gap-1.5 transition cursor-pointer underline decoration-dashed underline-offset-4 ${
                isDarkMode
                  ? 'text-[#D8C7BE]/85 hover:text-[#FBF6F1]'
                  : 'text-[#7D6B60]/85 hover:text-[#231C18]'
              }`}
            >
              <RotateCcw className="w-3 h-3 opacity-80" />
              <span>Replay</span>
            </button>
          ) : null}
        </div>
      )}

      {/* =====================================================================
          CANDLELIGHT AMBIENCE (Scenes 1 & 2 — Dead-Center Radial Glow)
          ===================================================================== */}
      {isCandlelightStage && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-700"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, rgba(230, 184, 156, 0.20) 0%, rgba(158, 71, 87, 0.11) 34%, rgba(24, 18, 16, 0.96) 78%)',
          }}
        />
      )}

      {/* =====================================================================
          SCENES 3, 4 & 5 AMBIENT BOTANICAL BACKDROP
          Strictly Dead-Center (50% / 50%) & Pure GPU Transforms (Zero Shifts!)
          ===================================================================== */}
      {showBloomStage && (
        <>
          {/* Seamless Dead-Center Radial Aura */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute w-[460px] sm:w-[920px] h-[460px] sm:h-[700px] rounded-full z-0"
            style={{
              left: '50%',
              top: '50%',
              transform: `translate3d(-50%, -50%, 0) scale3d(${recipientBloom.auraScale}, ${recipientBloom.auraScale}, 1)`,
              opacity: isEntranceUnfurling ? 0 : 1,
              transition: isDraggingEntranceSlider
                ? 'opacity 600ms ease-out'
                : `transform ${isEntranceUnfurling ? timings.unfurlMs : 520}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${timings.unfurlMs}ms ease-out`,
              background: isDarkMode
                ? 'radial-gradient(closest-side at 50% 50%, rgba(164, 96, 116, 0.30) 0%, rgba(112, 82, 126, 0.14) 52%, rgba(43, 35, 33, 0) 100%)'
                : 'radial-gradient(closest-side at 50% 50%, rgba(250, 210, 225, 0.72) 0%, rgba(235, 220, 250, 0.36) 52%, rgba(253, 249, 245, 0) 100%)',
            }}
          />

          {/* Scene 3 Drifting Botanical Petals */}
          {scene === 'ribbon' && !isReducedMotion && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
            >
              <svg
                viewBox="0 0 64 44"
                style={{
                  animation: `sab-petal-drift-a ${timings.ribbonMs}ms ease-in-out forwards`,
                }}
                className="absolute left-[14%] sm:left-[26%] top-[34%] w-8 sm:w-12 h-auto"
              >
                <path
                  d="M 6,34 C 14,12 36,6 58,8 C 56,26 42,38 22,38 C 14,38 9,36 6,34 Z"
                  fill={isDarkMode ? '#E598B0' : '#F7B5CA'}
                  fillOpacity="0.72"
                />
              </svg>
              <svg
                viewBox="0 0 64 44"
                style={{
                  animation: `sab-petal-drift-b ${timings.ribbonMs}ms ease-in-out 180ms forwards`,
                }}
                className="absolute right-[14%] sm:right-[24%] top-[38%] w-7 sm:w-11 h-auto"
              >
                <path
                  d="M 6,34 C 14,12 36,6 58,8 C 56,26 42,38 22,38 C 14,38 9,36 6,34 Z"
                  fill={isDarkMode ? '#E8AE98' : '#F9C4B4'}
                  fillOpacity="0.68"
                />
              </svg>
            </div>
          )}

          {/* Two Out-of-Focus Wind-Swept Side-Profile Depth-of-Field Petals */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-14 sm:-left-14 md:-left-16 bottom-[2%] w-44 h-32 sm:w-76 sm:h-52 md:w-92 md:h-64 z-0"
            style={{
              filter: 'blur(13px)',
              opacity: Number(
                ((isDarkMode ? 0.36 : 0.52) * (1 - recipientBloom.progress)).toFixed(3)
              ),
              transform: `translate3d(${(-recipientBloom.progress * 180).toFixed(1)}px, ${(
                recipientBloom.progress * 55
              ).toFixed(1)}px, 0) rotate(-10deg) scale3d(1.08, 1.08, 1)`,
            }}
          >
            <svg viewBox="0 0 220 150" className="w-full h-full overflow-visible">
              <path
                d="M 18,128 C 48,72 112,48 194,16 C 206,62 184,116 128,134 C 82,146 42,138 18,128 Z"
                fill={isDarkMode ? '#E28BA6' : '#F6B0C8'}
                fillOpacity="0.74"
              />
              <path
                d="M 28,122 Q 112,92 184,26"
                fill="none"
                stroke={isDarkMode ? '#FAD2DF' : '#FFF7FA'}
                strokeWidth="2.4"
                strokeOpacity="0.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-14 sm:-right-14 md:-right-16 top-[10%] w-48 h-34 sm:w-80 sm:h-56 md:w-96 md:h-68 z-0"
            style={{
              filter: 'blur(15px)',
              opacity: Number(
                ((isDarkMode ? 0.3 : 0.46) * (1 - recipientBloom.progress)).toFixed(3)
              ),
              transform: `translate3d(${(recipientBloom.progress * 190).toFixed(1)}px, ${(
                recipientBloom.progress * 40
              ).toFixed(1)}px, 0) rotate(-6deg) scale3d(1.12, 1.12, 1)`,
            }}
          >
            <svg viewBox="0 0 220 150" className="w-full h-full overflow-visible">
              <path
                d="M 18,128 C 48,72 112,48 194,16 C 206,62 184,116 128,134 C 82,146 42,138 18,128 Z"
                fill={isDarkMode ? '#E49B85' : '#F8BCAE'}
                fillOpacity="0.68"
              />
              <path
                d="M 28,122 Q 112,92 184,26"
                fill="none"
                stroke={isDarkMode ? '#FDE2D6' : '#FFFDF9'}
                strokeWidth="2.4"
                strokeOpacity="0.45"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* LIVING WATERCOLOR PEONY
              1) Outer anchor: Permanently locked at exact dead center (50%, 50%) — NEVER shifts!
              2) Entrance wrapper: Runs camera-push once on mount and stays untouched across scenes.
              3) Unfurl wrapper: Pure inline `transform: scale3d(...)` + `opacity` transition (zero Tailwind v4 `scale-*` snap!). */}
          <div
            aria-hidden="true"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate3d(-50%, -50%, 0)',
            }}
            className="pointer-events-none select-none absolute z-0 w-[min(92vw,420px)] sm:w-[600px] lg:w-[720px] aspect-[520/340]"
          >
            <div
              style={{
                animation: !isReducedMotion
                  ? 'sab-camera-push-bloom 1200ms cubic-bezier(0.16, 1, 0.3, 1) both'
                  : undefined,
              }}
              className="w-full h-full"
            >
              <div
                data-testid="recipient-entrance-bloom"
                data-bloom-progress={recipientBloom.progress}
                style={{
                  transform: isEntranceUnfurling
                    ? 'scale3d(1.22, 1.22, 1)'
                    : 'scale3d(1, 1, 1)',
                  opacity: isEntranceUnfurling ? 0 : isDarkMode ? 0.78 : 0.92,
                  transition: isReducedMotion
                    ? 'opacity 400ms ease-out'
                    : `transform ${
                        isEntranceUnfurling ? timings.unfurlMs : 600
                      }ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${
                        isEntranceUnfurling ? Math.round(timings.unfurlMs * 0.88) : 600
                      }ms cubic-bezier(0.22, 1, 0.36, 1)`,
                }}
                className="relative w-full h-full will-change-[transform,opacity]"
              >
                <svg viewBox="-260 -170 520 340" className="w-full h-full overflow-visible">
                  <defs>
                    <radialGradient id="rg-wc-petal-blush" cx="50%" cy="35%" r="65%">
                      <stop
                        offset="0%"
                        stopColor={isDarkMode ? '#F4A6BE' : '#FCE4EC'}
                        stopOpacity={isDarkMode ? '0.34' : '0.68'}
                      />
                      <stop
                        offset="55%"
                        stopColor={isDarkMode ? '#D9829B' : '#F8BBD0'}
                        stopOpacity={isDarkMode ? '0.22' : '0.40'}
                      />
                      <stop
                        offset="100%"
                        stopColor={isDarkMode ? '#8E4A5E' : '#F48FB1'}
                        stopOpacity="0.04"
                      />
                    </radialGradient>
                    <radialGradient id="rg-wc-petal-peach" cx="50%" cy="30%" r="65%">
                      <stop
                        offset="0%"
                        stopColor={isDarkMode ? '#F7C5A8' : '#FFF0E6'}
                        stopOpacity={isDarkMode ? '0.34' : '0.68'}
                      />
                      <stop
                        offset="60%"
                        stopColor={isDarkMode ? '#E09878' : '#FCD5CE'}
                        stopOpacity={isDarkMode ? '0.20' : '0.40'}
                      />
                      <stop
                        offset="100%"
                        stopColor={isDarkMode ? '#9A5B42' : '#F9B4AB'}
                        stopOpacity="0.04"
                      />
                    </radialGradient>
                    <radialGradient id="rg-wc-leaf-sage" cx="50%" cy="50%" r="60%">
                      <stop
                        offset="0%"
                        stopColor={isDarkMode ? '#86B898' : '#E2F2E8'}
                        stopOpacity={isDarkMode ? '0.26' : '0.58'}
                      />
                      <stop
                        offset="70%"
                        stopColor={isDarkMode ? '#5E8E70' : '#C5E3D0'}
                        stopOpacity={isDarkMode ? '0.14' : '0.28'}
                      />
                      <stop offset="100%" stopColor="#6B9B7C" stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="rg-wc-center-gold" cx="50%" cy="50%" r="55%">
                      <stop
                        offset="0%"
                        stopColor="#FDE68A"
                        stopOpacity={isDarkMode ? '0.40' : '0.64'}
                      />
                      <stop
                        offset="65%"
                        stopColor="#F59E0B"
                        stopOpacity={isDarkMode ? '0.15' : '0.22'}
                      />
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* 1. Botanical Sage Watercolor Leaves */}
                  <g transform={`scale(${recipientBloom.leafScale}, ${recipientBloom.leafScale})`}>
                    <path
                      d="M -55,10 C -115,-28 -175,-18 -212,18 C -170,48 -110,44 -55,10 Z"
                      fill="url(#rg-wc-leaf-sage)"
                      stroke={isDarkMode ? '#8AB89A' : '#7AA387'}
                      strokeWidth="1.15"
                      strokeOpacity={isDarkMode ? '0.52' : '0.62'}
                    />
                    <path
                      d="M -60,10 Q -135,4 -198,17 M -115,7 L -138,-6 M -145,10 L -168,0 M -125,11 L -148,24"
                      fill="none"
                      stroke={isDarkMode ? '#8AB89A' : '#6A9478'}
                      strokeWidth="0.85"
                      strokeLinecap="round"
                      strokeOpacity={isDarkMode ? '0.44' : '0.52'}
                    />
                    <path
                      d="M 55,10 C 115,-28 175,-18 212,18 C 170,48 110,44 55,10 Z"
                      fill="url(#rg-wc-leaf-sage)"
                      stroke={isDarkMode ? '#8AB89A' : '#7AA387'}
                      strokeWidth="1.15"
                      strokeOpacity={isDarkMode ? '0.52' : '0.62'}
                    />
                    <path
                      d="M 60,10 Q 135,4 198,17 M 115,7 L 138,-6 M 145,10 L 168,0 M 125,11 L 148,24"
                      fill="none"
                      stroke={isDarkMode ? '#8AB89A' : '#6A9478'}
                      strokeWidth="0.85"
                      strokeLinecap="round"
                      strokeOpacity={isDarkMode ? '0.44' : '0.52'}
                    />
                  </g>

                  {/* 2. Outer Ring of 8 Watercolor Peony Petals */}
                  <g
                    transform={`rotate(${recipientBloom.outerRotateDeg}) scale(${recipientBloom.outerScale})`}
                  >
                    {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                      <g key={`rg-outer-${angle}`} transform={`rotate(${angle})`}>
                        <path
                          d="M 0,0 C -38,-34 -52,-98 0,-126 C 52,-98 38,-34 0,0 Z"
                          fill="url(#rg-wc-petal-blush)"
                          stroke={isDarkMode ? '#E5A3B7' : '#CD7E95'}
                          strokeWidth="1.15"
                          strokeOpacity={isDarkMode ? '0.54' : '0.64'}
                        />
                        <path
                          d="M 0,-14 Q -12,-62 -6,-106 M 0,-18 Q 12,-62 6,-106 M 0,-10 L 0,-114"
                          fill="none"
                          stroke={isDarkMode ? '#DF9BB0' : '#C67B91'}
                          strokeWidth="0.65"
                          strokeLinecap="round"
                          strokeOpacity={isDarkMode ? '0.35' : '0.42'}
                        />
                      </g>
                    ))}
                  </g>

                  {/* 3. Middle Ring of 8 Peach-Blush Cupped Petals */}
                  <g
                    transform={`rotate(${recipientBloom.midRotateDeg}) scale(${recipientBloom.midScale})`}
                  >
                    {[22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((angle) => (
                      <g key={`rg-mid-${angle}`} transform={`rotate(${angle})`}>
                        <path
                          d="M 0,0 C -28,-26 -38,-74 0,-94 C 38,-74 28,-26 0,0 Z"
                          fill="url(#rg-wc-petal-peach)"
                          stroke={isDarkMode ? '#E8B298' : '#C88A74'}
                          strokeWidth="1.05"
                          strokeOpacity={isDarkMode ? '0.56' : '0.66'}
                        />
                        <path
                          d="M 0,-12 Q -8,-48 -3,-78 M 0,-12 Q 8,-48 3,-78"
                          fill="none"
                          stroke={isDarkMode ? '#E2A88B' : '#B87B65'}
                          strokeWidth="0.6"
                          strokeLinecap="round"
                          strokeOpacity="0.4"
                        />
                      </g>
                    ))}
                  </g>

                  {/* 4. Inner Corolla & Golden Botanical Stamens */}
                  <g
                    transform={`rotate(${recipientBloom.innerRotateDeg}) scale(${recipientBloom.innerScale})`}
                  >
                    {[0, 60, 120, 180, 240, 300].map((angle) => (
                      <path
                        key={`rg-inner-${angle}`}
                        transform={`rotate(${angle})`}
                        d="M 0,0 C -18,-16 -22,-46 0,-58 C 22,-46 18,-16 0,0 Z"
                        fill="url(#rg-wc-petal-blush)"
                        stroke={isDarkMode ? '#F0B6C8' : '#C4748B'}
                        strokeWidth="1"
                        strokeOpacity="0.6"
                      />
                    ))}
                    <circle cx="0" cy="0" r="24" fill="url(#rg-wc-center-gold)" />
                    {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
                      <g key={`rg-stamen-${deg}`} transform={`rotate(${deg})`}>
                        <line
                          x1="0"
                          y1="-4"
                          x2="0"
                          y2="-20"
                          stroke={isDarkMode ? '#FCD34D' : '#D97706'}
                          strokeWidth="0.95"
                          strokeOpacity="0.55"
                          strokeLinecap="round"
                        />
                        <circle
                          cx="0"
                          cy="-21.5"
                          r="1.9"
                          fill={isDarkMode ? '#FDE68A' : '#F59E0B'}
                          fillOpacity="0.7"
                        />
                      </g>
                    ))}
                    <circle
                      cx="0"
                      cy="0"
                      r="6"
                      fill={isDarkMode ? '#FDE68A' : '#FEF3C7'}
                      stroke={isDarkMode ? '#F59E0B' : '#D97706'}
                      strokeWidth="1"
                      strokeOpacity="0.65"
                    />
                  </g>
                </svg>

                {/* 5. Soft Readability Veil Centered Over the Heart of the Peony */}
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background: isDarkMode
                      ? 'radial-gradient(ellipse 50% 44% at 50% 52%, rgba(43, 35, 33, 0.78) 0%, rgba(43, 35, 33, 0.42) 58%, rgba(43, 35, 33, 0) 100%)'
                      : 'radial-gradient(ellipse 50% 44% at 50% 52%, rgba(253, 249, 245, 0.82) 0%, rgba(253, 249, 245, 0.46) 58%, rgba(253, 249, 245, 0) 100%)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Scene 5 Warm Luminous Bloom Wash */}
          {isEntranceUnfurling && (
            <div
              aria-hidden="true"
              data-testid="delivery-bloom-light-wash"
              style={{
                animation: `sab-bloom-light-wash ${timings.unfurlMs}ms ease-out forwards`,
                background: isDarkMode
                  ? 'radial-gradient(circle at 50% 50%, rgba(240, 200, 176, 0.34) 0%, rgba(158, 71, 87, 0.16) 42%, rgba(43, 35, 33, 0) 76%)'
                  : 'radial-gradient(circle at 50% 50%, rgba(255, 253, 249, 0.72) 0%, rgba(252, 228, 236, 0.44) 44%, rgba(253, 249, 245, 0) 78%)',
              }}
              className="pointer-events-none absolute inset-0 z-30"
            />
          )}
        </>
      )}

      {/* =====================================================================
          DEAD-CENTER VIEWPORT STAGE (Symmetric Padding Across Browser Nav & Taskbar)
          ===================================================================== */}
      <div className="relative z-10 h-full w-full overflow-y-auto overflow-x-hidden no-scrollbar">
        <div className="min-h-full w-full grid place-items-center py-14 px-4 sm:px-8 box-border">
          {/* =================================================================
              SCENE 1: ARRIVAL — Dead-Centered Cotton Envelope & Crimson Wax Seal
              Shares exact pocket coordinates (y=112..278 in 360x284) with Scene 2
              so tapping the wax seal opens in-place with zero jump!
              ================================================================= */}
          {scene === 'arrival' && (
            <div
              style={{ transform: 'translate3d(0, -38px, 0)' }}
              className="relative z-10 flex flex-col items-center justify-center text-center w-full"
            >
              <div
                style={{
                  animation: isReducedMotion
                    ? 'sab-fade-in 420ms ease-out both'
                    : 'sab-envelope-arrive 1.2s cubic-bezier(0.16, 1, 0.3, 1) both',
                }}
                className="w-[min(88vw,320px)] sm:w-[368px] md:w-[396px]"
              >
                <button
                  type="button"
                  data-testid="delivery-wax-seal-btn"
                  disabled={isResolvingShortCode}
                  onClick={onTouchWaxSeal}
                  aria-label="Touch the crimson wax seal to open your delivery"
                  style={{
                    animation: isReducedMotion
                      ? undefined
                      : 'sab-envelope-breathe 4.4s ease-in-out 1.2s infinite',
                  }}
                  className="group relative block w-full focus:outline-none disabled:cursor-wait cursor-pointer"
                >
                  <svg
                    viewBox="0 0 360 284"
                    className="w-full h-auto drop-shadow-[0_24px_48px_rgba(0,0,0,0.48)] overflow-visible transition-transform duration-300 group-hover:scale-[1.015] group-active:scale-[0.99]"
                  >
                    <defs>
                      <linearGradient id="sab-arr-cotton" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#FFFDF9" />
                        <stop offset="100%" stopColor="#F5ECE1" />
                      </linearGradient>
                      <linearGradient id="sab-arr-flap" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#FFFDF9" />
                        <stop offset="100%" stopColor="#EFE3D5" />
                      </linearGradient>
                      <radialGradient id="sab-arr-glow" cx="50%" cy="68%" r="54%">
                        <stop offset="0%" stopColor="#F5C6A5" stopOpacity="0.24" />
                        <stop offset="100%" stopColor="#F5C6A5" stopOpacity="0" />
                      </radialGradient>
                    </defs>

                    {/* Soft candlelight halo centered behind envelope */}
                    <ellipse cx="180" cy="196" rx="175" ry="96" fill="url(#sab-arr-glow)" />

                    {/* Envelope Base Body (y = 112..278, matching Scene 2) */}
                    <rect
                      x="20"
                      y="112"
                      width="320"
                      height="166"
                      rx="12"
                      fill="url(#sab-arr-cotton)"
                      stroke="#E2D1C1"
                      strokeWidth="1.2"
                    />

                    {/* Left, Right & Bottom Pocket Folds */}
                    <path
                      d="M 21,116 L 156,200 L 21,274 Z"
                      fill="#FAF3EB"
                      stroke="#E6D6C6"
                      strokeWidth="0.95"
                    />
                    <path
                      d="M 339,116 L 204,200 L 339,274 Z"
                      fill="#FAF3EB"
                      stroke="#E6D6C6"
                      strokeWidth="0.95"
                    />
                    <path
                      d="M 22,277 L 180,180 L 338,277 Z"
                      fill="#F4EAE0"
                      stroke="#DFCBB8"
                      strokeWidth="1"
                    />
                    <line
                      x1="38"
                      y1="269"
                      x2="322"
                      y2="269"
                      stroke="#D5C0AC"
                      strokeWidth="0.95"
                      strokeDasharray="3.5 3"
                    />

                    {/* Closed Top Triangular Flap */}
                    <path
                      d="M 21,113 L 180,214 L 339,113 Z"
                      fill="url(#sab-arr-flap)"
                      stroke="#DECBB9"
                      strokeWidth="1.15"
                    />
                    <path
                      d="M 36,116 L 180,205 L 324,116"
                      fill="none"
                      stroke="#D8C3B0"
                      strokeWidth="0.9"
                      strokeDasharray="3 3"
                    />

                    {/* Pulsing Crimson Botanical Wax Seal Anchored at Clasp (180, 204) */}
                    <g transform="translate(180, 204)">
                      {!isReducedMotion && !isResolvingShortCode && (
                        <>
                          <circle
                            cx="0"
                            cy="0"
                            r="33"
                            fill="#9E4757"
                            fillOpacity="0.22"
                            stroke="#E6B89C"
                            strokeWidth="1.2"
                            strokeOpacity="0.6"
                            style={{
                              transformBox: 'fill-box',
                              transformOrigin: 'center',
                              animation: 'sab-wax-pulse 2.6s ease-out infinite',
                            }}
                          />
                          <circle
                            cx="0"
                            cy="0"
                            r="33"
                            fill="none"
                            stroke="#FDE68A"
                            strokeWidth="1"
                            strokeOpacity="0.4"
                            style={{
                              transformBox: 'fill-box',
                              transformOrigin: 'center',
                              animation: 'sab-wax-pulse 2.6s ease-out 1.15s infinite',
                            }}
                          />
                        </>
                      )}
                      <g className="transition-transform duration-300 group-hover:scale-105">
                        <CrimsonWaxSealGroup splitSide="whole" idSuffix="arrival" />
                      </g>
                    </g>
                  </svg>
                </button>
              </div>

              {isResolvingShortCode ? (
                <div data-testid="recipient-resolving-indicator" className="mt-3.5">
                  <p
                    className="text-lg sm:text-xl italic font-normal text-[#DFCFC6]/90 animate-pulse"
                    style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                  >
                    Preparing bouquet…
                  </p>
                </div>
              ) : (
                <p
                  className="mt-3.5 text-base sm:text-lg italic font-normal tracking-wide text-[#E6D6C7]/85"
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                >
                  Tap the wax seal
                </p>
              )}
            </div>
          )}

          {/* =================================================================
              SCENE 2: THE SEAL BREAKS — Two Dead-Center Story Beats:
              Beat A (0..2.18s): Pure graphic opened envelope — card glides up
                                 with ALREADY-WRITTEN static scribble lines inside.
              Beat B (2.22..4.85s): Separated 2-tier poetic serif title card
                                    writes across the candlelight screen.
              ================================================================= */}
          {scene === 'seal_break' && (
            <div className="relative z-10 grid place-items-center w-full">
              {/* BEAT A: Pure Graphic Opened Envelope + Rising Pre-Written Card (Col 1, Row 1) */}
              {!isReducedMotion && (
                <div
                  aria-hidden="true"
                  style={{
                    gridArea: '1 / 1',
                    animation:
                      'sab-open-envelope-story 2180ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
                  }}
                  className="w-[min(88vw,320px)] sm:w-[368px] md:w-[396px] pointer-events-none"
                >
                  <svg
                    viewBox="0 0 360 284"
                    className="w-full h-auto drop-shadow-[0_24px_48px_rgba(0,0,0,0.46)] overflow-visible"
                  >
                    <defs>
                      <linearGradient id="sab-open-interior" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#EAD9C8" />
                        <stop offset="100%" stopColor="#DEC8B3" />
                      </linearGradient>
                      <linearGradient id="sab-open-paper" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#FFFDF9" />
                        <stop offset="70%" stopColor="#FFFDF9" />
                        <stop offset="100%" stopColor="#F9F1E7" />
                      </linearGradient>
                      <linearGradient id="sab-open-back-flap" x1="0%" y1="100%" x2="0%" y2="0%">
                        <stop offset="0%" stopColor="#EAD9C8" />
                        <stop offset="100%" stopColor="#FFFDF9" />
                      </linearGradient>
                      {/* Clips the letter card strictly within the envelope's side & bottom walls */}
                      <clipPath id="sab-pocket-interior-clip">
                        <rect x="24" y="4" width="312" height="270" rx="8" />
                      </clipPath>
                      {/* Clips front pocket folds neatly to the rounded envelope silhouette */}
                      <clipPath id="sab-envelope-body-clip">
                        <rect x="20" y="112" width="320" height="166" rx="12" />
                      </clipPath>
                    </defs>

                    {/* LAYER 1 (BACKMOST): Open Top Flap & Seamless Back Pocket Lining */}
                    <path
                      d="M 20,112 L 20,266 A 12,12 0 0 0 32,278 L 328,278 A 12,12 0 0 0 340,266 L 340,112 Z"
                      fill="url(#sab-open-interior)"
                    />
                    <g
                      style={{
                        transformBox: 'fill-box',
                        transformOrigin: '50% 100%',
                        animation:
                          'sab-back-flap-unfold 400ms cubic-bezier(0.22, 1, 0.36, 1) 260ms both',
                      }}
                    >
                      <path
                        d="M 20,113 L 180,12 L 340,113"
                        fill="url(#sab-open-back-flap)"
                        stroke="#DECBB9"
                        strokeWidth="1.15"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M 38,110 L 180,22 L 322,110"
                        fill="none"
                        stroke="#D8C3B0"
                        strokeWidth="0.9"
                        strokeDasharray="3 3"
                      />
                    </g>

                    {/* LAYER 2 (MIDDLE — INSIDE THE POCKET): Cotton Card with Static Pre-Written Ink Scribbles */}
                    <g clipPath="url(#sab-pocket-interior-clip)">
                      <g
                        style={{
                          animation:
                            'sab-paper-slide-up 820ms cubic-bezier(0.22, 1, 0.36, 1) 460ms both',
                        }}
                      >
                        <rect
                          x="44"
                          y="48"
                          width="272"
                          height="196"
                          rx="8"
                          fill="url(#sab-open-paper)"
                          stroke="#E2D1C1"
                          strokeWidth="1.1"
                        />
                        <rect
                          x="52"
                          y="56"
                          width="256"
                          height="180"
                          rx="5"
                          fill="none"
                          stroke="#DECBB9"
                          strokeWidth="0.9"
                          strokeDasharray="3.2 2.8"
                        />
                        {/* Tiny Letterpress Heart Emblem Printed on the Stationery */}
                        <path
                          d="M 180,69.5 C 178.4,67.5 175.6,68.8 177.1,71.3 L 180,74.1 L 182.9,71.3 C 184.4,68.8 181.6,67.5 180,69.5 Z"
                          fill="#B4846C"
                          opacity="0.62"
                        />

                        {/* Static Pre-Written Fountain-Pen Scribbles (Already part of the paper — NO animation!) */}
                        <g data-testid="delivery-envelope-static-scribble" opacity="0.58">
                          {/* Salutation scribble (left-aligned, e.g. "My dearest,") */}
                          <path
                            d="M 76,84 C 82,79 86,86 92,83 C 98,80 103,86 110,83 C 114,81 118,85 123,84"
                            fill="none"
                            stroke="#6E5649"
                            strokeWidth="1.25"
                            strokeLinecap="round"
                          />
                          {/* Body line 1 */}
                          <path
                            d="M 76,99 C 86,94 94,102 104,98 C 114,94 123,102 134,98 C 145,94 154,102 166,98 C 178,94 188,102 200,98 C 212,94 222,101 234,98 C 246,95 258,101 274,97"
                            fill="none"
                            stroke="#7D6559"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                          />
                          {/* Body line 2 */}
                          <path
                            d="M 76,113 C 87,109 96,116 108,112 C 120,108 130,116 142,112 C 154,108 165,116 178,112 C 190,108 202,115 214,112 C 226,109 238,115 256,111"
                            fill="none"
                            stroke="#7D6559"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                          />
                          {/* Body line 3 + warm sign-off flourish */}
                          <path
                            d="M 76,127 C 86,123 95,130 107,126 C 118,122 128,129 140,126 C 150,123 160,129 172,126"
                            fill="none"
                            stroke="#8C7365"
                            strokeWidth="1.15"
                            strokeLinecap="round"
                          />
                          <path
                            d="M 218,136 C 226,131 233,139 242,135 C 250,131 258,137 268,133"
                            fill="none"
                            stroke="#9E4757"
                            strokeWidth="1.15"
                            strokeLinecap="round"
                            opacity="0.8"
                          />
                        </g>
                      </g>
                    </g>

                    {/* LAYER 3 (FRONT POCKET FOLDS ONLY — Zero Top Horizontal Stroke Across y=112!) */}
                    <g clipPath="url(#sab-envelope-body-clip)">
                      <path
                        d="M 20,112 L 156,200 L 20,278 Z"
                        fill="#FAF3EB"
                        stroke="#E4D4C3"
                        strokeWidth="1"
                      />
                      <path
                        d="M 340,112 L 204,200 L 340,278 Z"
                        fill="#FAF3EB"
                        stroke="#E4D4C3"
                        strokeWidth="1"
                      />
                      <path
                        d="M 20,278 L 180,180 L 340,278 Z"
                        fill="#F4EAE0"
                        stroke="#DFCBB8"
                        strokeWidth="1.05"
                      />
                      <line
                        x1="38"
                        y1="269"
                        x2="322"
                        y2="269"
                        stroke="#D5C0AC"
                        strokeWidth="0.95"
                        strokeDasharray="3.5 3"
                      />
                    </g>

                    {/* Open-Top U-Shaped Outer Envelope Rim (Sides & Bottom ONLY — Never Crosses the Paper!) */}
                    <path
                      d="M 20,112 L 20,266 A 12,12 0 0 0 32,278 L 328,278 A 12,12 0 0 0 340,266 L 340,112"
                      fill="none"
                      stroke="#E2D1C1"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />

                    {/* LAYER 4: Initial Closed Flap Lifting + Parting Crimson Wax Seal Halves */}
                    <g
                      style={{
                        transformBox: 'fill-box',
                        transformOrigin: '50% 0%',
                        animation: 'sab-front-flap-lift 290ms ease-in forwards',
                      }}
                    >
                      <path
                        d="M 21,113 L 180,214 L 339,113 Z"
                        fill="#F7EFE6"
                        stroke="#DECBB9"
                        strokeWidth="1.15"
                      />
                    </g>
                    <g
                      style={{
                        animation:
                          'sab-seal-left-crack 780ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
                      }}
                    >
                      <CrimsonWaxSealGroup splitSide="left" idSuffix="breakL" />
                    </g>
                    <g
                      style={{
                        animation:
                          'sab-seal-right-crack 780ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
                      }}
                    >
                      <CrimsonWaxSealGroup splitSide="right" idSuffix="breakR" />
                    </g>
                  </svg>
                </div>
              )}

              {/* BEAT B: Separated 2-Tier Editorial Note Dead Center in Candlelight (Col 1, Row 1)
                  Intentional line break & contrast prevents orphan "you." on every viewport! */}
              <div
                style={{
                  gridArea: '1 / 1',
                  animation: isReducedMotion
                    ? 'sab-fade-in 500ms ease-out both'
                    : `sab-separated-note-phase ${
                        timings.sealBreakMs - 2200
                      }ms cubic-bezier(0.22, 1, 0.36, 1) 2200ms both`,
                }}
                className="flex flex-col items-center justify-center text-center px-4 max-w-[94vw]"
              >
                <p
                  data-testid="delivery-handwritten-line"
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                  className="flex flex-col items-center justify-center drop-shadow-[0_6px_22px_rgba(0,0,0,0.45)]"
                >
                  <span
                    style={{
                      animation: isReducedMotion
                        ? undefined
                        : 'sab-handwrite-wipe 860ms cubic-bezier(0.22, 1, 0.36, 1) 2280ms both',
                    }}
                    className="block text-[clamp(1.15rem,3.6vw,1.5rem)] font-normal tracking-[0.04em] text-[#D8C7BE]/90 whitespace-nowrap mb-1 sm:mb-1.5"
                  >
                    Someone has been
                  </span>{' '}
                  <span
                    style={{
                      animation: isReducedMotion
                        ? undefined
                        : 'sab-handwrite-wipe 1020ms cubic-bezier(0.22, 1, 0.36, 1) 2760ms both',
                    }}
                    className="block text-[clamp(2.05rem,7.5vw,3.45rem)] italic font-medium leading-[1.06] tracking-[-0.01em] text-[#FBF6F1] whitespace-nowrap"
                  >
                    thinking of you.
                  </span>
                </p>

                <svg
                  aria-hidden="true"
                  viewBox="0 0 180 18"
                  className="mt-3 sm:mt-3.5 w-28 sm:w-36 h-4 overflow-visible"
                >
                  <path
                    d="M 16,10 Q 90,3 164,10"
                    fill="none"
                    stroke="#E6B89C"
                    strokeWidth="1.15"
                    strokeLinecap="round"
                    pathLength={100}
                    strokeDasharray="100"
                    style={{
                      animation: isReducedMotion
                        ? 'sab-fade-in 400ms ease-out 250ms both'
                        : 'sab-ink-flourish-draw 540ms ease-out 3560ms both',
                    }}
                  />
                </svg>
              </div>
            </div>
          )}

          {/* =================================================================
              SCENES 3 & 4 FOREGROUND: ZERO-REFLOW TRANSFORM CHOREOGRAPHY
              Both Dedication & Unlock Ritual remain mounted across `ribbon` and
              `threshold` so transitioning never pops layout or moves the flower!
              ================================================================= */}
          {showBloomStage && (
            <>
              {isResolvingShortCode ? (
                <div
                  data-testid="recipient-resolving-indicator"
                  className="relative z-10 text-center px-3"
                >
                  <p
                    className={`text-lg sm:text-xl italic font-normal animate-pulse ${
                      isDarkMode ? 'text-[#DFCFC6]' : 'text-[#6E594E]'
                    }`}
                    style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                  >
                    Preparing bouquet…
                  </p>
                </div>
              ) : (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    opacity: isEntranceUnfurling ? 0 : 1,
                    transform: isEntranceUnfurling
                      ? 'translate3d(0, -14px, 0) scale3d(0.985, 0.985, 1)'
                      : 'translate3d(0, 0, 0) scale3d(1, 1, 1)',
                    transition: isReducedMotion
                      ? 'opacity 320ms ease-out'
                      : 'opacity 640ms cubic-bezier(0.22, 1, 0.36, 1), transform 680ms cubic-bezier(0.22, 1, 0.36, 1)',
                  }}
                  className="relative z-10 max-w-xl w-full mx-auto text-center flex flex-col items-center px-2 sm:px-4 will-change-[transform,opacity]"
                >
                  {/* DEDICATION GROUP: Sits visually dead-center in `ribbon` via GPU translate3d,
                      then glides smoothly to `0` as the Unlock Ritual rises underneath! */}
                  <div
                    style={{
                      transform:
                        scene === 'ribbon' && !isReducedMotion
                          ? 'translate3d(0, 34px, 0)'
                          : 'translate3d(0, 0, 0)',
                      transition: isReducedMotion
                        ? undefined
                        : 'transform 950ms cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                    className="flex flex-col items-center will-change-transform"
                  >
                    {/* Editorial Dedication Lockup (Sender Kept Unnamed for Surprise) */}
                    <h2
                      className="mx-auto max-w-[92vw] sm:max-w-lg leading-[1.02] tracking-[-0.02em]"
                      style={{
                        fontFamily: "'Cormorant Garamond', Georgia, serif",
                        animation: !isReducedMotion
                          ? 'sab-name-unfurl 1.05s cubic-bezier(0.16, 1, 0.3, 1) 120ms both'
                          : undefined,
                      }}
                    >
                      <span
                        className={`block text-lg sm:text-2xl md:text-[26px] italic font-normal mb-1 ${
                          isDarkMode ? 'text-[#DFCFC6]' : 'text-[#6E594E]'
                        }`}
                      >
                        For
                      </span>
                      <span
                        className={`block text-[clamp(2.25rem,9vw,4.45rem)] font-semibold tracking-[-0.02em] leading-[1.02] break-words ${
                          isDarkMode ? 'text-[#FBF6F1]' : 'text-[#1F1815]'
                        }`}
                      >
                        {recipientName || 'You'}
                      </span>
                    </h2>

                    {/* Signature Braided Silk & Lace Bow Divider — Placed Right Below For [Name]! */}
                    <div
                      aria-hidden="true"
                      data-testid="delivery-ribbon-divider"
                      style={{
                        animation: !isReducedMotion
                          ? `sab-lace-unspool ${Math.round(
                              timings.ribbonMs * 0.68
                            )}ms cubic-bezier(0.22, 1, 0.36, 1) 260ms both`
                          : undefined,
                      }}
                      className="mt-2.5 sm:mt-3.5 mb-2 sm:mb-2.5 flex items-center justify-center opacity-90"
                    >
                      <svg
                        viewBox="0 0 420 34"
                        className="w-48 sm:w-60 md:w-68 h-5.5 sm:h-6.5 overflow-visible"
                      >
                        <path
                          d="M 10,17 Q 55,11 100,17 T 182,17"
                          fill="none"
                          stroke={laceStroke}
                          strokeWidth="1.05"
                          strokeLinecap="round"
                        />
                        <path
                          d="M 10,17 Q 55,23 100,17 T 182,17"
                          fill="none"
                          stroke={laceStroke}
                          strokeWidth="0.9"
                          strokeDasharray="2.5 2.5"
                          strokeLinecap="round"
                        />
                        <path
                          d="M 238,17 Q 280,11 325,17 T 410,17"
                          fill="none"
                          stroke={laceStroke}
                          strokeWidth="1.05"
                          strokeLinecap="round"
                        />
                        <path
                          d="M 238,17 Q 280,23 325,17 T 410,17"
                          fill="none"
                          stroke={laceStroke}
                          strokeWidth="0.9"
                          strokeDasharray="2.5 2.5"
                          strokeLinecap="round"
                        />
                        <path
                          d="M 210,17 C 194,5 182,11 190,19 C 195,23 204,20 210,17 Z"
                          fill="none"
                          stroke={laceAccent}
                          strokeWidth="1.3"
                        />
                        <path
                          d="M 210,17 C 226,5 238,11 230,19 C 225,23 216,20 210,17 Z"
                          fill="none"
                          stroke={laceAccent}
                          strokeWidth="1.3"
                        />
                        <path
                          d="M 210,17 Q 202,25 195,30 M 210,17 Q 218,25 225,30"
                          fill="none"
                          stroke={laceAccent}
                          strokeWidth="1.15"
                          strokeLinecap="round"
                        />
                        <circle cx="210" cy="17" r="2.2" fill={laceAccent} />
                      </svg>
                    </div>

                    <p
                      data-testid="recipient-surprise-subtitle"
                      className={`text-[15px] sm:text-lg md:text-xl italic font-normal ${
                        isDarkMode ? 'text-[#E5D6CE]' : 'text-[#5C473C]'
                      }`}
                      style={{
                        fontFamily: "'Cormorant Garamond', Georgia, serif",
                        animation: !isReducedMotion
                          ? 'sab-name-unfurl 1s cubic-bezier(0.16, 1, 0.3, 1) 520ms both'
                          : undefined,
                      }}
                    >
                      Someone sent you a bouquet
                    </p>
                  </div>

                  {/* ===========================================================
                      SCENE 4: THE THRESHOLD — Always Mounted During Bloom Stage
                      Reveals via Pure GPU Opacity + Translate3d (Zero Pop!)
                      =========================================================== */}
                  <div
                    aria-hidden={!isThresholdInteractive}
                    style={{
                      opacity: scene === 'threshold' ? 1 : 0,
                      transform:
                        scene === 'threshold'
                          ? 'translate3d(0, 0, 0) scale3d(1, 1, 1)'
                          : 'translate3d(0, 18px, 0) scale3d(0.98, 0.98, 1)',
                      transition: isReducedMotion
                        ? 'opacity 280ms ease-out'
                        : 'opacity 880ms cubic-bezier(0.16, 1, 0.3, 1), transform 950ms cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                    className={`w-full flex flex-col items-center will-change-[transform,opacity] ${
                      isThresholdInteractive ? 'pointer-events-auto' : 'pointer-events-none'
                    }`}
                  >
                    {isCountdownLocked ? (
                      /* MODE 1: SEALED ENVELOPE POSTMARK COUNTDOWN LOCK */
                      <div
                        className="mt-5 sm:mt-6 max-w-full flex flex-col items-center space-y-2.5 sm:space-y-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div
                          className={`relative max-w-[92vw] inline-flex items-center gap-2.5 sm:gap-5 px-4 sm:px-6 py-3 sm:py-3.5 rounded-2xl border border-dashed backdrop-blur-md shadow-[0_12px_30px_rgba(35,28,24,0.07)] ${
                            isDarkMode
                              ? 'bg-[#352C29]/92 border-[#5E4E49]'
                              : 'bg-[#FFFDF9]/94 border-[#D8C3B0]'
                          }`}
                        >
                          <div className="shrink-0 flex items-center justify-center">
                            <svg
                              viewBox="0 0 44 44"
                              className="w-8 h-8 sm:w-10 sm:h-10 overflow-visible"
                            >
                              <circle
                                cx="22"
                                cy="22"
                                r="19"
                                fill="none"
                                stroke={isDarkMode ? '#E6B89C' : '#9E4757'}
                                strokeWidth="1.1"
                                strokeDasharray="2.5 2"
                                opacity="0.78"
                              />
                              <circle
                                cx="22"
                                cy="22"
                                r="14"
                                fill="none"
                                stroke={isDarkMode ? '#C8B6AC' : '#B4846C'}
                                strokeWidth="0.85"
                                opacity="0.65"
                              />
                              <path
                                d="M 22,19 C 19.8,16.2 16,17.8 18,21.6 L 22,25.6 L 26,21.6 C 28,17.8 24.2,16.2 22,19 Z"
                                fill={isDarkMode ? '#E6B89C' : '#9E4757'}
                                opacity="0.9"
                              />
                            </svg>
                          </div>

                          <div className="flex items-center gap-2 sm:gap-4">
                            {[
                              { label: 'd', val: countdownParts.days },
                              { label: 'h', val: countdownParts.hours },
                              { label: 'm', val: countdownParts.minutes },
                              { label: 's', val: countdownParts.seconds },
                            ].map((unit, idx) => (
                              <React.Fragment key={unit.label}>
                                {idx > 0 && (
                                  <span
                                    aria-hidden="true"
                                    className={`text-xs sm:text-sm ${
                                      isDarkMode ? 'text-[#7E6B62]' : 'text-[#C8B4A4]'
                                    }`}
                                  >
                                    ·
                                  </span>
                                )}
                                <div className="flex items-baseline gap-0.5 tabular-nums">
                                  <span
                                    className={`text-xl sm:text-3xl font-semibold ${
                                      isDarkMode ? 'text-[#F0C2AE]' : 'text-[#6E4434]'
                                    }`}
                                    style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                                  >
                                    {unit.val}
                                  </span>
                                  <span
                                    className={`text-[11px] sm:text-xs italic ${
                                      isDarkMode ? 'text-[#B8A59B]' : 'text-[#8C7A70]'
                                    }`}
                                    style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                                  >
                                    {unit.label}
                                  </span>
                                </div>
                              </React.Fragment>
                            ))}
                          </div>
                        </div>

                        <p
                          className={`text-xs sm:text-sm italic px-2 ${
                            isDarkMode ? 'text-[#C8B6AC]' : 'text-[#7D6B60]'
                          }`}
                          style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                        >
                          Sealed until{' '}
                          {countdownTargetMs
                            ? new Date(countdownTargetMs).toLocaleString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              })
                            : 'soon'}
                        </p>

                        {isPreviewMode && (
                          <button
                            type="button"
                            tabIndex={isThresholdInteractive ? 0 : -1}
                            onClick={(e) => {
                              e.stopPropagation();
                              onUnwrapForceBypass();
                            }}
                            className={`mt-1 px-4 py-1.5 rounded-full border border-dashed text-xs font-medium transition cursor-pointer ${
                              isDarkMode
                                ? 'border-[#5E4E49] bg-[#352C29]/80 text-[#E6D6C7] hover:bg-[#423632]'
                                : 'border-[#DECBB9] bg-white/80 text-[#5C4438] hover:bg-[#FAF4EE]'
                            }`}
                          >
                            Sender Preview: Test Unwrap
                          </button>
                        )}
                      </div>
                    ) : isPasscodeLocked ||
                      (lock?.mode === 'passcode' &&
                        Boolean(lock.passcodeAnswer && lock.passcodeAnswer.trim().length > 0) &&
                        (passcodeFeedback === 'success' || isEntranceUnfurling)) ? (
                      /* MODE 2: SECRET HINT LOCK WITH ZERO-SHIFT WAX-SEAL STAMP */
                      <form
                        onSubmit={onSubmitPasscodeForm}
                        onClick={(e) => e.stopPropagation()}
                        className="relative mt-5 sm:mt-6 w-full max-w-[min(88vw,320px)] flex flex-col items-center space-y-2.5 sm:space-y-3"
                      >
                        <p
                          className={`text-base sm:text-xl italic font-normal leading-snug px-2 ${
                            isDarkMode ? 'text-[#F0DFD6]' : 'text-[#4A3B33]'
                          }`}
                          style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                        >
                          “
                          {lock?.questionPrompt ||
                            (effectivePasscodeType === 'pin'
                              ? DEFAULT_PIN_HINT
                              : DEFAULT_WORD_HINT)}
                          ”
                        </p>

                        <p
                          data-testid="recipient-passcode-format-hint"
                          className={`text-[11px] tracking-wide ${
                            isDarkMode ? 'text-[#C8B6AC]' : 'text-[#7D6B60]'
                          }`}
                        >
                          {effectivePasscodeType === 'pin'
                            ? '4-digit numerical PIN'
                            : 'Secret word · case-insensitive'}
                        </p>

                        {effectivePasscodeType === 'pin' ? (
                          <div className="w-full flex flex-col items-center">
                            <div
                              data-testid="recipient-pin-grid"
                              data-lock-state={passcodeFeedback}
                              onClick={() => isThresholdInteractive && pinInputRef.current?.focus()}
                              className="relative w-full max-w-[248px] sm:max-w-[256px]"
                            >
                              <input
                                ref={pinInputRef}
                                type="text"
                                tabIndex={isThresholdInteractive ? 0 : -1}
                                data-testid="recipient-passcode-input"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={4}
                                autoComplete="one-time-code"
                                readOnly={passcodeFeedback === 'success' || !isThresholdInteractive}
                                value={passcodeAttempt}
                                onFocus={() => onSetIsPinFocused(true)}
                                onBlur={() => onSetIsPinFocused(false)}
                                onChange={(e) => {
                                  if (passcodeFeedback === 'success' || !isThresholdInteractive) {
                                    return;
                                  }
                                  onClearPinErrorTimer();
                                  const next = sanitizeSecretPinInput(e.target.value);
                                  onPasscodeAttemptChange(next);
                                  if (next.length < 4) {
                                    onResetPasscodeFeedback();
                                  } else if (next.length === 4) {
                                    onTriggerPasscodeVerification(next);
                                  }
                                }}
                                aria-label="4-digit PIN to unlock bouquet"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                              />

                              <div
                                key={
                                  passcodeFeedback === 'error'
                                    ? `pin-shake-${passcodeShakeKey}`
                                    : 'pin-idle'
                                }
                                className={`grid grid-cols-4 gap-2 sm:gap-3 ${
                                  passcodeFeedback === 'error'
                                    ? 'animate-[sab-lock-shake_0.42s_ease-in-out]'
                                    : passcodeFeedback === 'success'
                                    ? 'animate-[sab-unlock-glow_0.45s_ease-out]'
                                    : ''
                                }`}
                              >
                                {[0, 1, 2, 3].map((idx) => {
                                  const char = passcodeAttempt[idx] || '';
                                  const isActiveSquare =
                                    passcodeFeedback === 'idle' &&
                                    isPinFocused &&
                                    idx === Math.min(passcodeAttempt.length, 3);
                                  const isFilled = char.length > 0;

                                  const squareStyleClass =
                                    passcodeFeedback === 'success'
                                      ? isDarkMode
                                        ? 'border-solid border-[#E6B89C] bg-[#3E322E]/95 text-[#FBF6F1] shadow-[0_10px_28px_rgba(0,0,0,0.28)]'
                                        : 'border-solid border-[#B4846C] bg-[#FFF8F4]/95 text-[#5C3A2E] shadow-[0_10px_28px_rgba(122,75,58,0.14)]'
                                      : passcodeFeedback === 'error'
                                      ? isDarkMode
                                        ? 'border-solid border-rose-400 bg-rose-950/60 text-rose-200 shadow-[0_0_14px_rgba(251,113,133,0.3)]'
                                        : 'border-solid border-rose-500 bg-rose-50/95 text-rose-700 shadow-[0_0_14px_rgba(244,63,94,0.24)]'
                                      : isActiveSquare
                                      ? isDarkMode
                                        ? 'border-solid border-[#E6B89C] bg-[#3E332F]/95 text-[#FBF6F1] shadow-[0_0_0_3px_rgba(230,184,156,0.22),0_10px_24px_rgba(0,0,0,0.2)]'
                                        : 'border-solid border-[#A86B53] bg-[#FFFDF9]/95 text-[#231C18] shadow-[0_0_0_3px_rgba(168,107,83,0.18),0_10px_24px_rgba(35,28,24,0.08)]'
                                      : isFilled
                                      ? isDarkMode
                                        ? 'border-solid border-[#9B8277] bg-[#3A302C]/95 text-[#FBF6F1] shadow-[0_8px_20px_rgba(0,0,0,0.18)]'
                                        : 'border-solid border-[#C4A690] bg-[#FFFDF9]/95 text-[#231C18] shadow-[0_8px_20px_rgba(35,28,24,0.06)]'
                                      : isDarkMode
                                      ? 'border-dashed border-[#66554F] bg-[#352C29]/90 text-[#8C7A70] shadow-[0_8px_20px_rgba(0,0,0,0.14)]'
                                      : 'border-dashed border-[#D8C3B0] bg-[#FFFDF9]/90 text-[#B8A59B] shadow-[0_8px_20px_rgba(35,28,24,0.05)]';

                                  return (
                                    <div
                                      key={idx}
                                      data-testid={`recipient-pin-square-${idx}`}
                                      style={{
                                        transform:
                                          passcodeFeedback === 'success' || isActiveSquare
                                            ? 'scale3d(1.03, 1.03, 1)'
                                            : 'scale3d(1, 1, 1)',
                                      }}
                                      className={`relative aspect-square h-[52px] sm:h-[58px] w-full rounded-2xl border-[1.5px] backdrop-blur-md flex items-center justify-center transition-[border-color,background-color,box-shadow,transform] duration-200 select-none ${squareStyleClass}`}
                                    >
                                      {isFilled ? (
                                        <span
                                          key={`pin-digit-${idx}-${char}`}
                                          className="inline-block text-2xl sm:text-[26px] font-semibold leading-none animate-[sab-pin-pop_0.24s_cubic-bezier(0.22,1,0.36,1)]"
                                          style={{
                                            fontFamily: "'Cormorant Garamond', Georgia, serif",
                                          }}
                                        >
                                          {char}
                                        </span>
                                      ) : isActiveSquare ? (
                                        <span
                                          aria-hidden="true"
                                          className={`w-[2px] h-5 rounded-full animate-[sab-caret-blink_1s_ease-in-out_infinite] ${
                                            isDarkMode ? 'bg-[#E6B89C]' : 'bg-[#A86B53]'
                                          }`}
                                        />
                                      ) : (
                                        <span
                                          aria-hidden="true"
                                          className="w-1.5 h-1.5 rounded-full bg-current opacity-40"
                                        />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div
                            key={
                              passcodeFeedback === 'error'
                                ? `word-shake-${passcodeShakeKey}`
                                : 'word-idle'
                            }
                            data-testid="recipient-word-box"
                            data-lock-state={passcodeFeedback}
                            className={`relative w-full ${
                              passcodeFeedback === 'error'
                                ? 'animate-[sab-lock-shake_0.42s_ease-in-out]'
                                : passcodeFeedback === 'success'
                                ? 'animate-[sab-unlock-glow_0.45s_ease-out]'
                                : ''
                            }`}
                          >
                            <div
                              className={`relative w-full flex items-center p-1 rounded-full border backdrop-blur-md transition-[border-color,background-color,box-shadow] duration-200 ${
                                passcodeFeedback === 'success'
                                  ? isDarkMode
                                    ? 'border-solid border-[#E6B89C] bg-[#3E322E]/95 shadow-[0_10px_28px_rgba(0,0,0,0.28)]'
                                    : 'border-solid border-[#B4846C] bg-[#FFF8F4]/95 shadow-[0_10px_28px_rgba(122,75,58,0.14)]'
                                  : passcodeFeedback === 'error'
                                  ? isDarkMode
                                    ? 'border-solid border-rose-400 bg-rose-950/55 shadow-[0_0_16px_rgba(251,113,133,0.3)]'
                                    : 'border-solid border-rose-500 bg-rose-50/95 shadow-[0_0_16px_rgba(244,63,94,0.24)]'
                                  : isWordFocused
                                  ? isDarkMode
                                    ? 'border-solid border-[#E6B89C] bg-[#352C29]/95 shadow-[0_0_0_3px_rgba(230,184,156,0.18),0_10px_28px_rgba(0,0,0,0.22)]'
                                    : 'border-solid border-[#A86B53] bg-[#FFFDF9]/95 shadow-[0_0_0_3px_rgba(168,107,83,0.15),0_10px_28px_rgba(35,28,24,0.08)]'
                                  : isDarkMode
                                  ? 'border-dashed border-[#66554F] bg-[#352C29]/92 shadow-[0_10px_28px_rgba(35,28,24,0.07)]'
                                  : 'border-dashed border-[#D8C3B0] bg-[#FFFDF9]/92 shadow-[0_10px_28px_rgba(35,28,24,0.07)]'
                              }`}
                            >
                              <span
                                aria-hidden="true"
                                className={`pl-3 pr-1 transition-colors duration-300 ${
                                  passcodeFeedback === 'success'
                                    ? isDarkMode
                                      ? 'text-[#E6B89C]'
                                    : 'text-[#8A4B38]'
                                    : passcodeFeedback === 'error'
                                    ? 'text-rose-500 dark:text-rose-400'
                                    : passcodeAttempt.length > 0
                                    ? isDarkMode
                                      ? 'text-[#E6B89C]'
                                      : 'text-[#A86B53]'
                                    : isDarkMode
                                    ? 'text-[#9A877B]'
                                    : 'text-[#B8A59B]'
                                }`}
                              >
                                {renderCoutureSealIcon('w-3.5 h-3.5')}
                              </span>
                              <input
                                type="text"
                                tabIndex={isThresholdInteractive ? 0 : -1}
                                data-testid="recipient-passcode-input"
                                inputMode="text"
                                maxLength={40}
                                autoComplete="off"
                                readOnly={passcodeFeedback === 'success' || !isThresholdInteractive}
                                value={passcodeAttempt}
                                onFocus={() => onSetIsWordFocused(true)}
                                onBlur={() => onSetIsWordFocused(false)}
                                onChange={(e) => {
                                  if (passcodeFeedback === 'success' || !isThresholdInteractive) {
                                    return;
                                  }
                                  const next =
                                    lock?.passcodeType === 'word'
                                      ? sanitizeSecretWordInput(e.target.value)
                                      : e.target.value;
                                  onPasscodeAttemptChange(next);
                                  onResetPasscodeFeedback();
                                }}
                                placeholder="Secret word..."
                                aria-label="Secret word to unlock bouquet"
                                className={`flex-1 min-w-0 bg-transparent px-2.5 py-2 text-xs sm:text-sm focus:outline-none ${
                                  isDarkMode
                                    ? 'text-[#FBF6F1] placeholder:text-[#9A877B]'
                                    : 'text-[#231C18] placeholder:text-[#9A877B]'
                                }`}
                              />
                              <button
                                type="submit"
                                tabIndex={isThresholdInteractive ? 0 : -1}
                                data-testid="recipient-passcode-submit"
                                disabled={passcodeFeedback === 'success' || !isThresholdInteractive}
                                className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium shrink-0 transition-[background-color,transform] duration-200 active:scale-95 cursor-pointer ${
                                  isDarkMode
                                    ? 'bg-[#9A6550] text-white hover:bg-[#875642]'
                                    : 'bg-[#7A4B3A] text-white hover:bg-[#633B2C]'
                                }`}
                              >
                                {passcodeFeedback === 'success' ? (
                                  <>
                                    {renderCoutureSealIcon(
                                      'w-3.5 h-3.5 animate-[sab-bloom-seal-open_0.45s_ease-out]'
                                    )}
                                    <span>Blooming...</span>
                                  </>
                                ) : (
                                  <span>Unlock</span>
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        {passcodeError && (
                          <p
                            data-testid="recipient-passcode-error"
                            className="text-xs text-rose-600 dark:text-rose-300 font-medium"
                          >
                            {passcodeError}
                          </p>
                        )}

                        {isPreviewMode && passcodeFeedback !== 'success' && (
                          <button
                            type="button"
                            tabIndex={isThresholdInteractive ? 0 : -1}
                            onClick={onUnwrapForceBypass}
                            className={`pt-0.5 text-[11px] underline decoration-dashed underline-offset-4 transition cursor-pointer ${
                              isDarkMode
                                ? 'text-[#C8B6AC] hover:text-[#FBF6F1]'
                                : 'text-[#8C7A70] hover:text-[#231C18]'
                            }`}
                          >
                            Preview bloom without answer
                          </button>
                        )}
                      </form>
                    ) : (
                      /* MODE 3: TACTILE SILK RIBBON & WAX-SEAL SLIDE TO OPEN */
                      <div className="mt-6 sm:mt-7 flex flex-col items-center">
                        <div
                          ref={sliderTrackRef}
                          data-testid="recipient-slide-track"
                          role="button"
                          tabIndex={isThresholdInteractive ? 0 : -1}
                          aria-label="Slide to open bouquet"
                          onKeyDown={(e) => {
                            if (!isThresholdInteractive) return;
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onGlideSlideToOpen(entranceSlideProgress);
                            }
                          }}
                          onPointerDown={(e) => {
                            if (
                              !isThresholdInteractive ||
                              isEntranceUnfurling ||
                              isGiftCurrentlyLocked ||
                              isResolvingShortCode
                            ) {
                              return;
                            }
                            e.stopPropagation();
                            onCancelEntranceSlideRaf();
                            e.currentTarget.setPointerCapture(e.pointerId);
                            sliderDragStartXRef.current = e.clientX;
                            onSetIsDraggingEntranceSlider(true);
                          }}
                          onPointerMove={(e) => {
                            if (!isDraggingEntranceSlider || !sliderTrackRef.current) return;
                            const rect = sliderTrackRef.current.getBoundingClientRect();
                            const thumbDiameter = 42;
                            const maxTravel = Math.max(1, rect.width - thumbDiameter - 12);
                            const offsetFromLeft = e.clientX - rect.left - thumbDiameter / 2 - 6;
                            const ratio = Math.max(0, Math.min(1, offsetFromLeft / maxTravel));
                            onSetEntranceSlideProgress(ratio);
                          }}
                          onPointerUp={(e) => {
                            if (!isDraggingEntranceSlider) return;
                            onSetIsDraggingEntranceSlider(false);
                            const dragDistance =
                              sliderDragStartXRef.current !== null
                                ? Math.abs(e.clientX - sliderDragStartXRef.current)
                                : 0;
                            sliderDragStartXRef.current = null;

                            if (entranceSlideProgress >= 0.72 || dragDistance < 8) {
                              onGlideSlideToOpen(entranceSlideProgress);
                            } else if (onGlideSlideReset) {
                              onGlideSlideReset(entranceSlideProgress);
                            } else {
                              onSetEntranceSlideProgress(0);
                            }
                          }}
                          onPointerCancel={() => {
                            onSetIsDraggingEntranceSlider(false);
                            sliderDragStartXRef.current = null;
                            if (onGlideSlideReset) {
                              onGlideSlideReset(entranceSlideProgress);
                            } else {
                              onSetEntranceSlideProgress(0);
                            }
                          }}
                          className={`relative w-[min(84vw,272px)] sm:w-[288px] h-[50px] sm:h-[54px] rounded-full border border-dashed flex items-center select-none touch-none cursor-grab active:cursor-grabbing shadow-[0_12px_32px_rgba(35,28,24,0.08)] backdrop-blur-md overflow-hidden ${
                            isDarkMode
                              ? 'bg-[#352C29]/92 border-[#6A5750]'
                              : 'bg-[#FFFDF9]/92 border-[#D5BCA8]'
                          }`}
                        >
                          {/* Soft Blush/Terracotta Ribbon Trail Behind the Wax-Seal Thumb */}
                          <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-y-1.5 left-1.5 rounded-full transition-none"
                            style={{
                              width: `calc(40px + ${entranceSlideProgress} * (100% - 52px))`,
                              background: isDarkMode
                                ? 'linear-gradient(90deg, rgba(158, 71, 87, 0.34) 0%, rgba(230, 184, 156, 0.42) 100%)'
                                : 'linear-gradient(90deg, rgba(248, 187, 208, 0.46) 0%, rgba(180, 132, 108, 0.30) 100%)',
                            }}
                          />

                          {/* Centered Editorial Prompt ("Slide to open") */}
                          <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0 pl-8 flex items-center justify-center gap-1.5 text-xs sm:text-[13px] font-medium tracking-wide"
                            style={{
                              opacity: Math.max(0, 1 - entranceSlideProgress * 1.45),
                            }}
                          >
                            <span className={isDarkMode ? 'text-[#F0DFD6]' : 'text-[#5C4438]'}>
                              Slide to open
                            </span>
                            <ChevronRight
                              className={`w-3.5 h-3.5 ${
                                isDarkMode ? 'text-[#E6B89C]' : 'text-[#9A6B56]'
                              }`}
                            />
                          </div>

                          {/* Draggable Crimson Botanical Wax-Seal Thumb (Pure GPU transform!) */}
                          <div
                            data-testid="recipient-slide-thumb"
                            style={{
                              left: `calc(6px + ${entranceSlideProgress} * (100% - 46px))`,
                              transform: isDraggingEntranceSlider
                                ? 'translate3d(0, -50%, 0) scale3d(1.06, 1.06, 1)'
                                : 'translate3d(0, -50%, 0) scale3d(1, 1, 1)',
                            }}
                            className={`absolute top-1/2 z-10 w-9.5 sm:w-10 h-9.5 sm:h-10 rounded-full flex items-center justify-center shrink-0 shadow-[0_6px_16px_rgba(122,75,58,0.28)] transition-transform duration-150 ${
                              isDarkMode ? 'bg-[#9A6550] text-white' : 'bg-[#7A4B3A] text-white'
                            }`}
                          >
                            <span className="w-7 h-7 rounded-full bg-[#9E4757] border border-[#FFFDF9]/50 flex items-center justify-center">
                              <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 overflow-visible">
                                <circle
                                  cx="10"
                                  cy="10"
                                  r="7.5"
                                  fill="none"
                                  stroke="#FDE68A"
                                  strokeWidth="0.9"
                                  strokeDasharray="2 1.6"
                                  opacity="0.85"
                                />
                                <path
                                  d="M10,7.8 C8.2,5.8 5.4,7.3 7,10.2 L10,13.2 L13,10.2 C14.6,7.3 11.8,5.8 10,7.8 Z"
                                  fill="#FFFDF9"
                                />
                              </svg>
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Zero-Height Floating Wax-Seal Stamp Anchor for Passcode Unlock
                        (Replay now lives cleanly in the top-right Skip slot; zero height = zero shift!) */}
                    {passcodeFeedback === 'success' && (
                      <div className="relative h-0 w-full flex justify-center overflow-visible pointer-events-none">
                        <div
                          data-testid="delivery-passcode-wax-stamp"
                          style={{
                            animation:
                              'sab-wax-stamp-press 0.42s cubic-bezier(0.22, 1, 0.36, 1) forwards',
                          }}
                          className="absolute top-3 flex items-center justify-center"
                        >
                          <CrimsonWaxSealMedallion className="w-11 h-11 drop-shadow-[0_6px_14px_rgba(122,40,56,0.35)]" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
