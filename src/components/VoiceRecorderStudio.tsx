import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  RotateCcw,
  Eye,
  EyeOff,
  Palette,
  Volume2,
  X,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import {
  VOICE_KEEPSAKE_CATALOG,
  VoiceKeepsakeData,
} from '../types/bouquet';
import { MiniVoiceKeepsakeSVG } from './MiniThumbnails';
import { BouquetVoiceKeepsakeSVG } from './BouquetStage';
import { musicBox } from '../lib/shareAndExport';

export interface VoiceRecorderStudioProps {
  voice: VoiceKeepsakeData;
  isDarkMode?: boolean;
  isVoicePlaying: boolean;
  onTogglePlayVoice: () => void;
  onStopVoice: () => void;
  onUpdateVoice: (patch: Partial<VoiceKeepsakeData>) => void;
  onOpenVoiceColors?: () => void;
  onTriggerToast?: (msg: string) => void;
}

const MAX_RECORD_SECONDS = 30;

function formatDuration(sec: number): string {
  const safe = Math.max(0, Math.round(sec || 0));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const VoiceRecorderStudio: React.FC<VoiceRecorderStudioProps> = ({
  voice,
  isDarkMode = false,
  isVoicePlaying,
  onTogglePlayVoice,
  onStopVoice,
  onUpdateVoice,
  onOpenVoiceColors,
  onTriggerToast,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>(() =>
    voice.audioDataUrl ? 'saved' : 'idle'
  );
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const [waveBars, setWaveBars] = useState<number[]>(() =>
    Array.from({ length: 18 }, (_, i) => 20 + ((i * 13) % 35))
  );

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordStartMsRef = useRef<number>(0);
  const timerIntervalRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const saveTimerRef = useRef<number | null>(null);

  const keepsakeMeta =
    VOICE_KEEPSAKE_CATALOG.find((k) => k.id === voice.style) || VOICE_KEEPSAKE_CATALOG[0];

  useEffect(() => {
    if (!voice.audioDataUrl && saveState === 'saved') {
      setSaveState('idle');
    } else if (voice.audioDataUrl && saveState === 'idle') {
      setSaveState('saved');
    }
  }, [voice.audioDataUrl, saveState]);

  const cleanupRecordingResources = useCallback(() => {
    if (timerIntervalRef.current !== null) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupRecordingResources();
      if (saveTimerRef.current !== null) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [cleanupRecordingResources]);

  // Animate waveform bars gently during playback
  useEffect(() => {
    if (!isVoicePlaying || isRecording) return;
    const id = window.setInterval(() => {
      setWaveBars((prev) =>
        prev.map((_, idx) => 22 + Math.round(Math.abs(Math.sin(Date.now() / 180 + idx * 0.7)) * 68))
      );
    }, 110);
    return () => clearInterval(id);
  }, [isVoicePlaying, isRecording]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore stop error
      }
    }
    setIsRecording(false);
  }, []);

  const startRecording = async () => {
    setMicError(null);
    onStopVoice();
    musicBox.stop();

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setMicError('Microphone recording is not supported in this browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      // Choose compact supported mimeType so shared links stay fast and lightweight
      const candidateTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
      ];
      let chosenMime = '';
      if (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function') {
        for (const t of candidateTypes) {
          if (MediaRecorder.isTypeSupported(t)) {
            chosenMime = t;
            break;
          }
        }
      }

      const recorderOptions: MediaRecorderOptions = chosenMime
        ? { mimeType: chosenMime, audioBitsPerSecond: 20000 }
        : { audioBitsPerSecond: 20000 };

      const recorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = recorder;
      recordStartMsRef.current = Date.now();
      setRecordSeconds(0);
      setSaveState('idle');
      setIsRecording(true);

      // Live Web Audio Analyser for real-time microphone waveform visualization
      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          const aCtx = new AudioCtx();
          audioCtxRef.current = aCtx;
          const source = aCtx.createMediaStreamSource(stream);
          const analyser = aCtx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);
          const dataArray = new Uint8Array(analyser.frequencyBinCount);

          const updateWave = () => {
            analyser.getByteFrequencyData(dataArray);
            const nextBars = Array.from({ length: 18 }, (_, i) => {
              const val = dataArray[i % dataArray.length] || 0;
              return Math.max(14, Math.min(96, Math.round((val / 255) * 95)));
            });
            setWaveBars(nextBars);
            animFrameRef.current = requestAnimationFrame(updateWave);
          };
          animFrameRef.current = requestAnimationFrame(updateWave);
        }
      } catch {
        // Fallback waveform animation if AudioContext fails
      }

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const elapsedSec = Math.max(
          1,
          Math.min(MAX_RECORD_SECONDS, Math.round((Date.now() - recordStartMsRef.current) / 1000))
        );
        cleanupRecordingResources();
        setIsRecording(false);

        const blob = new Blob(audioChunksRef.current, {
          type: chosenMime || recorder.mimeType || 'audio/webm',
        });
        if (blob.size === 0) return;

        setSaveState('saving');
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = typeof reader.result === 'string' ? reader.result : null;
          if (dataUrl) {
            onUpdateVoice({
              audioDataUrl: dataUrl,
              durationSec: elapsedSec,
              visibleOnStage: true,
            });
            if (saveTimerRef.current !== null) {
              clearTimeout(saveTimerRef.current);
            }
            saveTimerRef.current = window.setTimeout(() => {
              setSaveState('saved');
              onTriggerToast?.(`Voice saved automatically (${elapsedSec}s)`);
            }, 520);
          } else {
            setSaveState('idle');
          }
        };
        reader.readAsDataURL(blob);
      };

      recorder.start(250);

      timerIntervalRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordStartMsRef.current) / 1000);
        setRecordSeconds(elapsed);
        if (elapsed >= MAX_RECORD_SECONDS) {
          stopRecording();
        }
      }, 250);
    } catch {
      cleanupRecordingResources();
      setIsRecording(false);
      setMicError('Microphone access was blocked or unavailable. Please allow microphone access to record your voice.');
    }
  };

  return (
    <div className="space-y-3" role="region" aria-label="Voice Keepsake Studio">
      {/* Top Row: Active Keepsake Preview + Visible/Hidden Toggle */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-stone-50 dark:bg-[#141211] border border-stone-200/80 dark:border-stone-700 flex items-center justify-center shrink-0">
            <MiniVoiceKeepsakeSVG
              styleType={voice.style}
              primaryColor={voice.primaryColor}
              accentColor={voice.accentColor}
            />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-[#1C1917] dark:text-stone-100 truncate">
              {keepsakeMeta.label}
            </div>
            <div className="text-[10px] text-stone-500 dark:text-stone-400 truncate">
              {saveState === 'saving'
                ? 'Saving voice automatically...'
                : voice.audioDataUrl
                ? `Saved (${formatDuration(voice.durationSec)}) · Auto-saved`
                : 'Record a romantic voice note'}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onUpdateVoice({ visibleOnStage: !voice.visibleOnStage })}
          title={voice.visibleOnStage ? 'Hide voice keepsake' : 'Show voice keepsake on bouquet'}
          aria-label={voice.visibleOnStage ? 'Hide voice keepsake' : 'Show voice keepsake on bouquet'}
          className={`px-2.5 py-1 rounded-full border text-[11px] font-medium flex items-center gap-1 shrink-0 transition ${
            !voice.visibleOnStage
              ? 'bg-rose-50 border-rose-200 text-rose-500 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-400'
              : isDarkMode
              ? 'border-stone-700 bg-[#292524] text-stone-300'
              : 'border-stone-200 bg-stone-50 text-stone-600'
          }`}
        >
          {voice.visibleOnStage ? (
            <>
              <Eye className="w-3.5 h-3.5" />
              <span>Shown</span>
            </>
          ) : (
            <>
              <EyeOff className="w-3.5 h-3.5" />
              <span>Hidden</span>
            </>
          )}
        </button>
      </div>

      {/* Interactive Voice Recorder Deck */}
      <div
        className={`rounded-2xl p-3 border space-y-2.5 transition ${
          isRecording
            ? 'bg-rose-50/70 dark:bg-rose-950/25 border-rose-300 dark:border-rose-800/80'
            : isDarkMode
            ? 'bg-[#141211] border-stone-800'
            : 'bg-stone-50/90 border-stone-200/80'
        }`}
      >
        {/* Top Deck Status + Timer */}
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 font-medium" aria-live="polite">
            {isRecording ? (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span className="text-rose-600 dark:text-rose-400 font-semibold">
                  Recording voice...
                </span>
              </>
            ) : saveState === 'saving' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                  Saving...
                </span>
              </>
            ) : isVoicePlaying ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-[#B4846C] animate-pulse" />
                <span className="text-[#B4846C] font-semibold">Playing keepsake...</span>
              </>
            ) : voice.audioDataUrl ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Saved</span>
              </>
            ) : (
              <span className="text-stone-500 dark:text-stone-400">Up to 30 seconds</span>
            )}
          </div>

          <span className="font-mono tabular-nums text-stone-500 dark:text-stone-400">
            {isRecording
              ? `${formatDuration(recordSeconds)} / 0:30`
              : voice.audioDataUrl
              ? formatDuration(voice.durationSec || 1)
              : '0:00 / 0:30'}
          </span>
        </div>

        {/* 18-Bar Audio Waveform Visualizer */}
        <div
          className="h-11 px-2 rounded-xl bg-white/80 dark:bg-[#1E1C1A] border border-stone-200/60 dark:border-stone-800 flex items-center justify-between gap-1 overflow-hidden"
          aria-hidden="true"
        >
          {waveBars.map((heightPct, idx) => {
            const activeBar = isRecording || isVoicePlaying || Boolean(voice.audioDataUrl);
            return (
              <span
                key={idx}
                className="flex-1 rounded-full transition-all duration-100"
                style={{
                  height: `${activeBar ? heightPct : 22}%`,
                  backgroundColor: isRecording
                    ? '#e11d48'
                    : isVoicePlaying
                    ? voice.primaryColor
                    : voice.audioDataUrl
                    ? '#B4846C'
                    : isDarkMode
                    ? '#3f3f46'
                    : '#d6d3d1',
                }}
              />
            );
          })}
        </div>

        {/* Primary Recording / Playback Controls */}
        {isRecording ? (
          <button
            type="button"
            onClick={stopRecording}
            className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm active:scale-98 transition"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Stop Recording</span>
          </button>
        ) : voice.audioDataUrl ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onTogglePlayVoice}
              className="flex-1 py-2 px-3 rounded-xl bg-[#1C1917] hover:bg-[#292524] text-white dark:bg-white dark:text-[#1C1917] text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs active:scale-98 transition"
            >
              {isVoicePlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Play Voice</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={startRecording}
              title="Re-record voice"
              aria-label="Re-record voice"
              className={`py-2 px-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-1 transition active:scale-95 ${
                isDarkMode
                  ? 'border-stone-700 bg-[#292524] hover:bg-stone-800 text-stone-200'
                  : 'border-stone-200 bg-white hover:bg-stone-100 text-stone-700'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#B4846C]" />
              <span>Redo</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onStopVoice();
                onUpdateVoice({ audioDataUrl: null, durationSec: 0 });
                onTriggerToast?.('Removed recorded voice');
              }}
              title="Delete voice recording"
              aria-label="Delete voice recording"
              className={`p-2 rounded-xl border transition active:scale-95 ${
                isDarkMode
                  ? 'border-stone-700 bg-[#292524] hover:bg-red-950/50 text-stone-400 hover:text-red-400'
                  : 'border-stone-200 bg-white hover:bg-red-50 text-stone-500 hover:text-red-600'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={startRecording}
            className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-b from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm active:scale-98 transition"
          >
            <Mic className="w-4 h-4" />
            <span>Record Voice</span>
          </button>
        )}

        {micError && (
          <p className="text-[11px] text-rose-600 dark:text-rose-400 leading-snug">
            {micError}
          </p>
        )}
      </div>

      {/* Custom Keepsake Title Input + Quick Color Button */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
            Keepsake Label
          </span>
          {onOpenVoiceColors && (
            <button
              type="button"
              onClick={onOpenVoiceColors}
              className="text-[11px] font-medium text-[#B4846C] hover:underline flex items-center gap-1"
            >
              <Palette className="w-3 h-3" />
              <span>Edit Colors</span>
            </button>
          )}
        </div>
        <input
          type="text"
          maxLength={22}
          value={voice.title}
          onChange={(e) => onUpdateVoice({ title: e.target.value, visibleOnStage: true })}
          placeholder={keepsakeMeta.defaultTitle}
          aria-label="Voice keepsake label"
          className="w-full px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-[#141211] text-sm focus:outline-none focus:border-[#B4846C]"
          style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '15px' }}
        />
      </div>
    </div>
  );
};

/**
 * Interactive Recipient Voice Keepsake Player Modal (Opens when clicking the Mixtape/Vinyl/Plushie/Music Box/Locket in Gift Mode)
 */
export const VoiceKeepsakePlayerModal: React.FC<{
  voice: VoiceKeepsakeData;
  isDarkMode?: boolean;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onClose: () => void;
}> = ({ voice, isDarkMode = false, isPlaying, onTogglePlay, onClose }) => {
  const keepsakeMeta =
    VOICE_KEEPSAKE_CATALOG.find((k) => k.id === voice.style) || VOICE_KEEPSAKE_CATALOG[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Voice Keepsake Player"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`card-zoom-modal w-full max-w-sm rounded-3xl p-6 shadow-2xl border relative text-center ${
          isDarkMode
            ? 'bg-[#1E1C1A] border-stone-800 text-stone-100'
            : 'bg-white border-stone-200/90 text-[#1C1917]'
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close voice player"
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-500 dark:text-stone-300 transition"
        >
          <X className="w-4 h-4" />
        </button>

        <span className="text-[11px] uppercase tracking-widest font-semibold text-[#B4846C] block">
          {keepsakeMeta.label}
        </span>
        <h3
          className="text-2xl font-semibold mt-0.5"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          {voice.title || keepsakeMeta.defaultTitle}
        </h3>

        {/* Large Interactive Keepsake Illustration */}
        <div className="my-4 mx-auto w-48 h-40 flex items-center justify-center">
          <svg viewBox="-80 -65 160 130" className="w-full h-full drop-shadow-md">
            <BouquetVoiceKeepsakeSVG voice={voice} isPlaying={isPlaying} />
          </svg>
        </div>

        {voice.audioDataUrl ? (
          <div className="flex items-center justify-center pt-1">
            <button
              type="button"
              onClick={onTogglePlay}
              aria-label={isPlaying ? 'Pause voice' : 'Play voice'}
              title={isPlaying ? 'Pause voice' : 'Play voice'}
              className="w-12 h-12 rounded-full bg-[#1C1917] hover:bg-[#292524] text-white dark:bg-white dark:text-[#1C1917] flex items-center justify-center shadow-md active:scale-95 transition"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>
          </div>
        ) : (
          <p className="text-xs text-stone-500 dark:text-stone-400">
            A romantic keepsake attached to your bouquet.
          </p>
        )}
      </div>
    </div>
  );
};
