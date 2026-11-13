import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Sparkles,
  RefreshCw,
  ArrowLeft,
  Flower2,
  Ticket,
  BarChart3,
  Shield,
  KeyRound,
  Moon,
  Sun,
} from 'lucide-react';
import {
  OwnerAnalyticsSummary,
  PaidPassLedgerItem,
  TesterVoucherLedgerItem,
  createInitialAnalyticsSummary,
} from '../lib/ownerAnalytics';
import { computeRecipientSlideBloomState } from '../lib/dofParallax';
import {
  getSavedVaultBouquets,
  fetchStudioGlobalStats,
  StudioGlobalStats,
} from '../lib/firebase';
import { decodeBouquetFromHash } from '../lib/shareAndExport';
import { BrandLogoMark } from './BrandLogoMark';
import { OwnerOverviewSection } from './OwnerOverviewSection';
import { OwnerKeysSection } from './OwnerKeysSection';
import { OwnerAiAdvisorPanel } from './OwnerAiAdvisorPanel';

interface StealthGateAndOwnerConsoleProps {
  gateSlug: string;
  deviceTokenHash: string;
  isDarkMode: boolean;
  onToggleDarkMode?: () => void;
  onExitToStudio: () => void;
  onToast: (msg: string) => void;
}

type ConsoleTab = 'web_funnel' | 'vouchers' | 'ai_advisor' | 'botanicals' | 'security_stream';

const PRETTY_LABELS: Record<string, string> = {
  rose: 'Red Rose',
  peony: 'Blush Peony',
  tulip: 'French Tulip',
  lily: 'Stargazer Lily',
  sunflower: 'Golden Sunflower',
  orchid: 'Phalaenopsis Orchid',
  hydrangea: 'Cloud Hydrangea',
  lavender: 'English Lavender',
  dahlia: 'Cafe au Lait Dahlia',
  ranunculus: 'Persian Ranunculus',
  anemone: 'Poppy Anemone',
  camellia: 'Japonica Camellia',
  freesia: 'Sweet Freesia',
  daisy: 'Chamomile Daisy',
  gardenia: 'Ivory Gardenia',
  cherryBlossom: 'Sakura Branch',
  celestialRose: 'Celestial Rose',
  crystalOrchid: 'Crystal Orchid',
  luminaPeony: 'Starlight Peony',
  callalily: 'Calla Lily',
  kraft: 'Kraft Paper',
  linen: 'Raw Linen',
  velvet: 'Plush Velvet',
  silk_organza: 'Silk Organza',
  celadon: 'Celadon Tissue',
  noir: 'Noir Matte',
  newsprint: 'Editorial Print',
  burlap: 'Woven Jute',
  satin: 'Double Satin',
  twine: 'Botanical Twine',
  silk: 'Frayed Chiffon',
  velvet_ribbon: 'Velvet Ribbon',
  lace: 'Vintage Lace',
  organza: 'Sheer Organza',
  pearl: 'Pearl Cord',
  gold_thread: 'Gilded Thread',
  parchment: 'Warm Parchment',
  golden_hour: 'Golden Hour',
  midnight_velvet: 'Midnight Velvet',
  misty_conservatory: 'Misty Conservatory',
  blush_atelier: 'Blush Atelier',
  sage_courtyard: 'Sage Courtyard',
  moonlit_terrace: 'Moonlit Terrace',
  pressed_herbarium: 'Pressed Herbarium',
  vinyl: 'Vinyl Record',
  mixtape: 'Cassette Tape',
  musicbox: 'Music Box',
  plushie: 'Voice Plushie',
  locket: 'Heart Locket',
  polaroid: 'Classic Polaroid',
  film_strip: '35mm Film Strip',
  vintage_stamp: 'Postage Stamp',
  wax_frame: 'Wax-Sealed Frame',
  botanical_press: 'Pressed Specimen',
  cameo_locket: 'Oval Cameo',
  none: 'Instant Unwrap',
  passcode: 'Secret Passcode',
  countdown: 'Time Capsule',
  time_capsule: 'Time Capsule',
  direct: 'Direct Link',
  recipient_viral: 'Shared Bouquet',
  social: 'Social Share',
  tester_magic_link: 'Tester Invite',
  qr_scan: 'QR Card Scan',
  search: 'Organic Search',
};

function formatLabel(raw: string): string {
  if (!raw) return 'Other';
  if (PRETTY_LABELS[raw]) return PRETTY_LABELS[raw].trim();
  return raw
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function topSortedEntries(map: Record<string, number> | undefined, max = 6): Array<[string, number]> {
  if (!map) return [];
  return Object.entries(map)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max);
}

export const StealthGateAndOwnerConsole: React.FC<StealthGateAndOwnerConsoleProps> = ({
  gateSlug,
  deviceTokenHash,
  isDarkMode,
  onToggleDarkMode,
  onExitToStudio,
  onToast,
}) => {
  // Stealth Gate lock state & bloom animation
  const [pinInput, setPinInput] = useState('');
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);
  const [gateLockedOut, setGateLockedOut] = useState(false);
  const [bloomProgress, setBloomProgress] = useState(0);
  const [isBloomUnfurling, setIsBloomUnfurling] = useState(false);

  // Authenticated Owner Session state (Console UI only renders when BOTH adminSessionToken AND isServerVerified are true, preventing F12 sessionStorage bypass)
  const [adminSessionToken, setAdminSessionToken] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('lux_owner_session_token_v1');
    } catch {
      return null;
    }
  });
  const [isServerVerified, setIsServerVerified] = useState(false);
  const [activeTab, setActiveTab] = useState<ConsoleTab>('web_funnel');
  const [analytics, setAnalytics] = useState<OwnerAnalyticsSummary>(() =>
    createInitialAnalyticsSummary()
  );
  const [liveFirestoreStats, setLiveFirestoreStats] = useState<StudioGlobalStats | null>(null);
  const [testerVouchers, setTesterVouchers] = useState<TesterVoucherLedgerItem[]>([]);
  const [paidPasses, setPaidPasses] = useState<PaidPassLedgerItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Owner PIN rotation & income testing/reset state
  const [newOwnerPin, setNewOwnerPin] = useState('');
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);
  const [isTogglingIncomePause, setIsTogglingIncomePause] = useState(false);
  const [isResettingIncome, setIsResettingIncome] = useState(false);
  const [isClearingKeys, setIsClearingKeys] = useState(false);

  // Verify the encrypted per-visit gateSlug with the server on mount; if forged or tampered in F12, exit immediately
  useEffect(() => {
    let active = true;
    fetch('/api/payments/verify-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'verify_gate_slug',
        gateSlug,
        deviceTokenHash,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (active && (!data || !data.valid)) {
          setIsServerVerified(false);
          setAdminSessionToken(null);
          try {
            sessionStorage.removeItem('lux_owner_session_token_v1');
          } catch {
            // Ignore storage errors
          }
          onExitToStudio();
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [gateSlug, deviceTokenHash, onExitToStudio]);

  // Fetch real Firestore global stats only after server-verified unlock
  useEffect(() => {
    if (!adminSessionToken || !isServerVerified) return;
    let active = true;
    fetchStudioGlobalStats()
      .then((stats) => {
        if (active && stats) setLiveFirestoreStats(stats);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [adminSessionToken, isServerVerified]);

  // Merge real server telemetry, real Firestore stats, and real locally saved bouquets on device
  const realAnalytics = useMemo<OwnerAnalyticsSummary>(() => {
    const merged: OwnerAnalyticsSummary = {
      ...analytics,
      devices: { ...analytics.devices },
      osBrowsers: { ...analytics.osBrowsers },
      regions: { ...analytics.regions },
      referrers: { ...analytics.referrers },
      passesIssued: { ...analytics.passesIssued },
      shareChannels: { ...analytics.shareChannels },
      flowers: { ...(analytics.flowers || {}) },
      wraps: { ...(analytics.wraps || {}) },
      ribbons: { ...(analytics.ribbons || {}) },
      environments: { ...(analytics.environments || {}) },
      voiceStyles: { ...(analytics.voiceStyles || {}) },
      photoStyles: { ...(analytics.photoStyles || {}) },
      lockModes: { ...(analytics.lockModes || {}) },
      paywallTriggers: { ...(analytics.paywallTriggers || {}) },
      dailySeries: (analytics.dailySeries || []).map((d) => ({ ...d })),
      recentEvents: [...(analytics.recentEvents || [])],
    };

    // Inspect real bouquets saved in the local device vault so botanical counts reflect real user creations
    const localVault = getSavedVaultBouquets();
    const serverFlowerSum = Object.values(merged.flowers).reduce(
      (a: number, b: number) => a + b,
      0
    );
    if (localVault.length > 0 && serverFlowerSum === 0) {
      let decodedCoutureCount = 0;
      let decodedVoiceCount = 0;
      for (const item of localVault) {
        if (item.isPremium) decodedCoutureCount += 1;
        if (item.hasVoice) decodedVoiceCount += 1;
        if (item.lockMode) {
          merged.lockModes[item.lockMode] = (merged.lockModes[item.lockMode] || 0) + 1;
        }
        const rawPayload = item.draftPayload || item.shareUrl || '';
        const hashIdx = rawPayload.indexOf('#');
        const encodedPart = hashIdx >= 0 ? rawPayload.slice(hashIdx + 1) : rawPayload;
        const decoded = encodedPart ? decodeBouquetFromHash(encodedPart) : null;
        if (!decoded) continue;

        if (Array.isArray(decoded.items)) {
          for (const fl of decoded.items) {
            if (fl?.type) {
              merged.flowers[fl.type] = (merged.flowers[fl.type] || 0) + 1;
            }
          }
        }
        if (decoded.wrapStyle) {
          merged.wraps[decoded.wrapStyle] = (merged.wraps[decoded.wrapStyle] || 0) + 1;
        }
        if (decoded.ribbonStyle) {
          merged.ribbons[decoded.ribbonStyle] = (merged.ribbons[decoded.ribbonStyle] || 0) + 1;
        }
        if (decoded.environment) {
          merged.environments[decoded.environment] =
            (merged.environments[decoded.environment] || 0) + 1;
        }
        if (decoded.voice?.visibleOnStage && decoded.voice.style) {
          merged.voiceStyles[decoded.voice.style] =
            (merged.voiceStyles[decoded.voice.style] || 0) + 1;
        }
      }
      merged.bouquetsCreated = Math.max(merged.bouquetsCreated, localVault.length);
      merged.coutureBouquetsCreated = Math.max(merged.coutureBouquetsCreated, decodedCoutureCount);
      merged.voiceNotesRecorded = Math.max(merged.voiceNotesRecorded, decodedVoiceCount);
    }

    // Reconcile with real Firestore counters (stripping the 1284/3910/742/964 initial baseline if present)
    if (liveFirestoreStats) {
      const realFsCreated = Math.max(
        0,
        liveFirestoreStats.bouquetsCreated >= 1284
          ? liveFirestoreStats.bouquetsCreated - 1284
          : liveFirestoreStats.bouquetsCreated
      );
      const realFsOpened = Math.max(
        0,
        liveFirestoreStats.bouquetsOpened >= 3910
          ? liveFirestoreStats.bouquetsOpened - 3910
          : liveFirestoreStats.bouquetsOpened
      );
      const realFsVoice = Math.max(
        0,
        liveFirestoreStats.voiceNotesRecorded >= 742
          ? liveFirestoreStats.voiceNotesRecorded - 742
          : liveFirestoreStats.voiceNotesRecorded
      );
      const realFsReactions = Math.max(
        0,
        liveFirestoreStats.reactionsSent >= 964
          ? liveFirestoreStats.reactionsSent - 964
          : liveFirestoreStats.reactionsSent
      );
      merged.bouquetsCreated = Math.max(merged.bouquetsCreated, realFsCreated);
      merged.recipientUnwraps = Math.max(merged.recipientUnwraps, realFsOpened);
      merged.voiceNotesRecorded = Math.max(merged.voiceNotesRecorded, realFsVoice);
      merged.reactionsSent = Math.max(merged.reactionsSent, realFsReactions);
    }

    return merged;
  }, [analytics, liveFirestoreStats]);

  const fetchConsoleData = useCallback(
    async (token: string) => {
      setIsRefreshing(true);
      try {
        const res = await fetch('/api/payments/verify-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'fetch_owner_console',
            adminSessionToken: token,
            deviceTokenHash,
          }),
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          if (data.analytics) setAnalytics(data.analytics);
          if (Array.isArray(data.testerVouchers)) setTesterVouchers(data.testerVouchers);
          if (Array.isArray(data.paidPasses)) setPaidPasses(data.paidPasses);
          setIsServerVerified(true);
        } else if (res.status === 401 || data.unauthorized || !data.ok) {
          setIsServerVerified(false);
          setAdminSessionToken(null);
          try {
            sessionStorage.removeItem('lux_owner_session_token_v1');
          } catch {
            // Ignore storage errors
          }
        }
      } catch {
        // Keep current state on network hiccup
      } finally {
        setIsRefreshing(false);
      }
    },
    [deviceTokenHash]
  );

  useEffect(() => {
    if (adminSessionToken) {
      fetchConsoleData(adminSessionToken);
    }
  }, [adminSessionToken, fetchConsoleData]);

  // Smoothly animate the watercolor peony bloom before revealing the console
  const animatePeonyBloomAndUnlock = (
    token: string,
    nextAnalytics?: OwnerAnalyticsSummary,
    nextVouchers?: TesterVoucherLedgerItem[],
    nextPaidPasses?: PaidPassLedgerItem[]
  ) => {
    const start = performance.now();
    const duration = 380;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setBloomProgress(eased);
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        setIsBloomUnfurling(true);
        window.setTimeout(() => {
          if (nextAnalytics) setAnalytics(nextAnalytics);
          if (Array.isArray(nextVouchers)) setTesterVouchers(nextVouchers);
          if (Array.isArray(nextPaidPasses)) setPaidPasses(nextPaidPasses);
          setIsServerVerified(true);
          setAdminSessionToken(token);
          try {
            sessionStorage.setItem('lux_owner_session_token_v1', token);
          } catch {
            // Ignore storage error
          }
        }, 220);
      }
    };
    requestAnimationFrame(step);
  };

  const handleUnlockGate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedPin = pinInput.trim();
    if (!trimmedPin) {
      setGateError('Enter your passphrase to unwrap.');
      return;
    }

    setIsVerifyingPin(true);
    setGateError(null);

    try {
      const res = await fetch('/api/payments/verify-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unlock_owner_console',
          gateSlug,
          pin: trimmedPin,
          deviceTokenHash,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setGateLockedOut(Boolean(data.locked));
        setGateError(data.message || 'Incorrect passphrase.');
        setIsVerifyingPin(false);
        return;
      }

      setPinInput('');
      setIsVerifyingPin(false);
      animatePeonyBloomAndUnlock(
        data.adminSessionToken,
        data.analytics,
        data.testerVouchers,
        data.paidPasses
      );
    } catch {
      setGateError('Could not verify passphrase.');
      setIsVerifyingPin(false);
    }
  };

  const handleSyncKeysResponse = useCallback(
    (data: {
      analytics?: unknown;
      testerVouchers?: TesterVoucherLedgerItem[];
      paidPasses?: PaidPassLedgerItem[];
    }) => {
      if (data.analytics) setAnalytics(data.analytics as OwnerAnalyticsSummary);
      if (Array.isArray(data.testerVouchers)) setTesterVouchers(data.testerVouchers);
      if (Array.isArray(data.paidPasses)) setPaidPasses(data.paidPasses);
    },
    []
  );

  const handleUpdateOwnerPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminSessionToken || newOwnerPin.trim().length < 4) return;
    setIsUpdatingPin(true);
    try {
      const res = await fetch('/api/payments/verify-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_owner_pin',
          adminSessionToken,
          deviceTokenHash,
          newPin: newOwnerPin.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setNewOwnerPin('');
        onToast('Passphrase updated.');
      } else {
        onToast(data.message || 'Could not update passphrase.');
      }
    } catch {
      onToast('Network error updating passphrase.');
    } finally {
      setIsUpdatingPin(false);
    }
  };

  const handleToggleIncomePause = async (nextPaused: boolean) => {
    if (!adminSessionToken) return;
    setIsTogglingIncomePause(true);
    try {
      const res = await fetch('/api/payments/verify-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_income_pause',
          adminSessionToken,
          deviceTokenHash,
          paused: nextPaused,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        handleSyncKeysResponse(data);
        onToast(
          nextPaused
            ? 'Live income paused for webhook testing.'
            : 'Live income counting resumed.'
        );
      } else {
        onToast(data.message || 'Could not update income mode.');
      }
    } catch {
      onToast('Network error updating income mode.');
    } finally {
      setIsTogglingIncomePause(false);
    }
  };

  const handleResetIncome = async (purgeTestAndRevoked = true) => {
    if (!adminSessionToken) return;
    setIsResettingIncome(true);
    try {
      const res = await fetch('/api/payments/verify-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_owner_income',
          adminSessionToken,
          deviceTokenHash,
          purgeTestAndRevoked,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        handleSyncKeysResponse(data);
        onToast('Dashboard income reset to $0.00.');
      } else {
        onToast(data.message || 'Could not reset income.');
      }
    } catch {
      onToast('Network error resetting dashboard income.');
    } finally {
      setIsResettingIncome(false);
    }
  };

  const handleClearTestAndRevoked = async () => {
    if (!adminSessionToken) return;
    setIsClearingKeys(true);
    try {
      const res = await fetch('/api/payments/verify-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clear_test_and_revoked_keys',
          adminSessionToken,
          deviceTokenHash,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        handleSyncKeysResponse(data);
        const removed = Number(data.removedCount || 0);
        onToast(
          removed > 0
            ? `Cleared ${removed} test/revoked key${removed === 1 ? '' : 's'}.`
            : 'No test or revoked keys to clear.'
        );
      } else {
        onToast(data.message || 'Could not clear keys.');
      }
    } catch {
      onToast('Network error clearing test & revoked keys.');
    } finally {
      setIsClearingKeys(false);
    }
  };

  const copyText = (text: string, id: string, toastLabel: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    onToast(toastLabel);
    setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2200);
  };

  const recipientBloom = useMemo(
    () => computeRecipientSlideBloomState(bloomProgress),
    [bloomProgress]
  );

  // ============================================================================
  // VIEW 1: LITERAL COPY OF RECIPIENT BOUQUET OPENING UI/UX (From BouquetStudioApp.tsx)
  // ============================================================================
  if (!adminSessionToken || !isServerVerified) {
    return (
      <div
        data-testid="stealth-bouquet-gate-screen"
        className={`relative h-[100dvh] w-full flex flex-col items-center justify-center p-5 sm:p-6 overflow-hidden transition-all duration-300 ease-out ${
          isBloomUnfurling
            ? 'opacity-0 scale-[1.03] pointer-events-none'
            : 'opacity-100 scale-100'
        } ${
          isDarkMode ? 'bg-[#2B2321] text-[#F5EBE6]' : 'bg-[#FAF5F0] text-[#2C2523]'
        }`}
      >
        {/* 2 Blurred Foreground Petals (DOF Framing matching Landing Page Hero) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-8 sm:-left-12 md:-left-16 top-[10%] w-64 h-44 sm:w-84 sm:h-60 md:w-96 md:h-68"
          style={{
            filter: 'blur(15px)',
            opacity: Number(((isDarkMode ? 0.38 : 0.55) * (1 - recipientBloom.progress)).toFixed(3)),
            transform: `translate3d(${(-recipientBloom.progress * 180).toFixed(1)}px, ${(recipientBloom.progress * 55).toFixed(1)}px, 0) rotate(-10deg) scale(1.08)`,
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
          className="pointer-events-none absolute -right-10 sm:-right-14 md:-right-16 top-[11%] w-60 h-44 sm:w-80 sm:h-56 md:w-96 md:h-68"
          style={{
            filter: 'blur(15px)',
            opacity: Number(((isDarkMode ? 0.32 : 0.48) * (1 - recipientBloom.progress)).toFixed(3)),
            transform: `translate3d(${(recipientBloom.progress * 190).toFixed(1)}px, ${(recipientBloom.progress * 40).toFixed(1)}px, 0) rotate(-6deg) scale(1.12)`,
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

        {/* LIVING WATERCOLOR & COLORED BOTANICAL LINEART BLOOMING PEONY (Exact Recipient SVG) */}
        <div
          aria-hidden="true"
          data-testid="recipient-entrance-bloom"
          data-bloom-progress={recipientBloom.progress}
          className={`pointer-events-none select-none absolute left-1/2 top-1/2 z-0 w-[410px] sm:w-[680px] md:w-[780px] h-[280px] sm:h-[450px] md:h-[520px] transition-all duration-300 ease-out ${
            isBloomUnfurling
              ? '-translate-x-1/2 -translate-y-[50%] scale-[1.42] opacity-0'
              : '-translate-x-1/2 -translate-y-[50%] scale-100'
          }`}
          style={{ opacity: isBloomUnfurling ? 0 : isDarkMode ? 0.8 : 0.95 }}
        >
          <svg viewBox="0 0 520 340" className="w-full h-full overflow-visible">
            <defs>
              <radialGradient id="rg-wc-petal-blush" cx="50%" cy="35%" r="65%">
                <stop offset="0%" stopColor={isDarkMode ? '#F4A6BE' : '#FCE4EC'} stopOpacity={isDarkMode ? '0.36' : '0.72'} />
                <stop offset="55%" stopColor={isDarkMode ? '#D9829B' : '#F8BBD0'} stopOpacity={isDarkMode ? '0.24' : '0.44'} />
                <stop offset="100%" stopColor={isDarkMode ? '#8E4A5E' : '#F48FB1'} stopOpacity="0.04" />
              </radialGradient>
              <radialGradient id="rg-wc-petal-peach" cx="50%" cy="30%" r="65%">
                <stop offset="0%" stopColor={isDarkMode ? '#F7C5A8' : '#FFF0E6'} stopOpacity={isDarkMode ? '0.38' : '0.74'} />
                <stop offset="60%" stopColor={isDarkMode ? '#E09878' : '#FCD5CE'} stopOpacity={isDarkMode ? '0.22' : '0.46'} />
                <stop offset="100%" stopColor={isDarkMode ? '#9A5B42' : '#F9B4AB'} stopOpacity="0.03" />
              </radialGradient>
              <radialGradient id="rg-wc-leaf-sage" cx="50%" cy="50%" r="60%">
                <stop offset="0%" stopColor={isDarkMode ? '#86B898' : '#E2F2E8'} stopOpacity={isDarkMode ? '0.30' : '0.66'} />
                <stop offset="70%" stopColor={isDarkMode ? '#5E8E70' : '#C5E3D0'} stopOpacity={isDarkMode ? '0.16' : '0.34'} />
                <stop offset="100%" stopColor="#6B9B7C" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="rg-wc-center-gold" cx="50%" cy="50%" r="55%">
                <stop offset="0%" stopColor="#FDE68A" stopOpacity={isDarkMode ? '0.48' : '0.78'} />
                <stop offset="65%" stopColor="#F59E0B" stopOpacity={isDarkMode ? '0.20' : '0.28'} />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* 1. Botanical Sage Leaf Sprigs & Dashed Rope Tendrils */}
            <g
              transform={`translate(260, 170) scale(${recipientBloom.leafScale}, ${recipientBloom.leafScale})`}
            >
              <path
                d="M -55,10 C -115,-28 -175,-18 -212,18 C -170,48 -110,44 -55,10 Z"
                fill="url(#rg-wc-leaf-sage)"
                stroke={isDarkMode ? '#8AB89A' : '#7AA387'}
                strokeWidth="1.2"
                strokeOpacity={isDarkMode ? '0.55' : '0.65'}
              />
              <path
                d="M -60,10 Q -135,4 -198,17 M -115,7 L -138,-6 M -145,10 L -168,0 M -125,11 L -148,24"
                fill="none"
                stroke={isDarkMode ? '#8AB89A' : '#6A9478'}
                strokeWidth="0.9"
                strokeLinecap="round"
                strokeOpacity={isDarkMode ? '0.48' : '0.56'}
              />
              <path
                d="M -75,-18 C -128,-58 -168,-54 -194,-32"
                fill="none"
                stroke={isDarkMode ? '#D8A48F' : '#C28C7A'}
                strokeWidth="1.05"
                strokeDasharray="3 3"
                strokeDashoffset={recipientBloom.stamenDashOffset}
                strokeLinecap="round"
                strokeOpacity="0.58"
              />
              <path
                d="M -194,-32 C -210,-46 -222,-32 -206,-22 C -196,-16 -190,-24 -194,-32 Z"
                fill="url(#rg-wc-petal-blush)"
                stroke={isDarkMode ? '#E49EB3' : '#C97A90'}
                strokeWidth="1.1"
              />

              <path
                d="M 55,10 C 115,-28 175,-18 212,18 C 170,48 110,44 55,10 Z"
                fill="url(#rg-wc-leaf-sage)"
                stroke={isDarkMode ? '#8AB89A' : '#7AA387'}
                strokeWidth="1.2"
                strokeOpacity={isDarkMode ? '0.55' : '0.65'}
              />
              <path
                d="M 60,10 Q 135,4 198,17 M 115,7 L 138,-6 M 145,10 L 168,0 M 125,11 L 148,24"
                fill="none"
                stroke={isDarkMode ? '#8AB89A' : '#6A9478'}
                strokeWidth="0.9"
                strokeLinecap="round"
                strokeOpacity={isDarkMode ? '0.48' : '0.56'}
              />
              <path
                d="M 75,-18 C 128,-58 168,-54 194,-32"
                fill="none"
                stroke={isDarkMode ? '#D8A48F' : '#C28C7A'}
                strokeWidth="1.05"
                strokeDasharray="3 3"
                strokeDashoffset={recipientBloom.stamenDashOffset}
                strokeLinecap="round"
                strokeOpacity="0.58"
              />
              <path
                d="M 194,-32 C 210,-46 222,-32 206,-22 C 196,-16 190,-24 194,-32 Z"
                fill="url(#rg-wc-petal-blush)"
                stroke={isDarkMode ? '#E49EB3' : '#C97A90'}
                strokeWidth="1.1"
              />
            </g>

            {/* 2. Outer Ring of 8 Watercolor Peony Petals */}
            <g
              transform={`translate(260, 170) rotate(${recipientBloom.outerRotateDeg}) scale(${recipientBloom.outerScale})`}
            >
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                <g key={`rg-outer-${angle}`} transform={`rotate(${angle})`}>
                  <path
                    d="M 0,0 C -38,-34 -52,-98 0,-126 C 52,-98 38,-34 0,0 Z"
                    fill="url(#rg-wc-petal-blush)"
                    stroke={isDarkMode ? '#E5A3B7' : '#CD7E95'}
                    strokeWidth="1.2"
                    strokeOpacity={isDarkMode ? '0.56' : '0.66'}
                  />
                  <path
                    d="M 0,-14 Q -12,-62 -6,-106 M 0,-18 Q 12,-62 6,-106 M 0,-10 L 0,-114"
                    fill="none"
                    stroke={isDarkMode ? '#DF9BB0' : '#C67B91'}
                    strokeWidth="0.7"
                    strokeLinecap="round"
                    strokeOpacity={isDarkMode ? '0.38' : '0.44'}
                  />
                </g>
              ))}
            </g>

            {/* 3. Middle Ring of 8 Peach-Blush Cupped Petals */}
            <g
              transform={`translate(260, 170) rotate(${recipientBloom.midRotateDeg}) scale(${recipientBloom.midScale})`}
            >
              {[22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((angle) => (
                <g key={`rg-mid-${angle}`} transform={`rotate(${angle})`}>
                  <path
                    d="M 0,0 C -28,-26 -38,-74 0,-94 C 38,-74 28,-26 0,0 Z"
                    fill="url(#rg-wc-petal-peach)"
                    stroke={isDarkMode ? '#E8B298' : '#C88A74'}
                    strokeWidth="1.1"
                    strokeOpacity={isDarkMode ? '0.58' : '0.68'}
                  />
                  <path
                    d="M 0,-12 Q -8,-48 -3,-78 M 0,-12 Q 8,-48 3,-78"
                    fill="none"
                    stroke={isDarkMode ? '#E2A88B' : '#B87B65'}
                    strokeWidth="0.65"
                    strokeLinecap="round"
                    strokeOpacity="0.42"
                  />
                </g>
              ))}
            </g>

            {/* 4. Inner Corolla & Golden Botanical Stamens */}
            <g
              transform={`translate(260, 170) rotate(${recipientBloom.innerRotateDeg}) scale(${recipientBloom.innerScale})`}
            >
              {[0, 60, 120, 180, 240, 300].map((angle) => (
                <path
                  key={`rg-inner-${angle}`}
                  transform={`rotate(${angle})`}
                  d="M 0,0 C -18,-16 -22,-46 0,-58 C 22,-46 18,-16 0,0 Z"
                  fill="url(#rg-wc-petal-blush)"
                  stroke={isDarkMode ? '#F0B6C8' : '#C4748B'}
                  strokeWidth="1.05"
                  strokeOpacity="0.62"
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
                    strokeWidth="1"
                    strokeOpacity="0.58"
                    strokeLinecap="round"
                  />
                  <circle
                    cx="0"
                    cy="-21.5"
                    r="2"
                    fill={isDarkMode ? '#FDE68A' : '#F59E0B'}
                    fillOpacity="0.72"
                  />
                </g>
              ))}
              <circle
                cx="0"
                cy="0"
                r="6.5"
                fill={isDarkMode ? '#FDE68A' : '#FEF3C7'}
                stroke={isDarkMode ? '#F59E0B' : '#D97706'}
                strokeWidth="1.05"
                strokeOpacity="0.68"
              />
            </g>
          </svg>
        </div>

        {/* FOREGROUND CONTENT LOCKUP (Exact Recipient Entrance Layout) */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 max-w-xl w-full mx-auto text-center flex flex-col items-center px-3"
        >
          {/* Delicate Thin Rope Lace & Scallop Bow Ornament Above Dedication */}
          <div className="mb-3 sm:mb-4 opacity-85" aria-hidden="true">
            <svg viewBox="0 0 220 24" className="w-36 sm:w-44 h-5 overflow-visible">
              <line
                x1="14"
                y1="12"
                x2="86"
                y2="12"
                stroke={isDarkMode ? '#8C766C' : '#C8B09E'}
                strokeWidth="1.1"
                strokeDasharray="2.5 3"
                strokeLinecap="round"
              />
              <line
                x1="134"
                y1="12"
                x2="206"
                y2="12"
                stroke={isDarkMode ? '#8C766C' : '#C8B09E'}
                strokeWidth="1.1"
                strokeDasharray="2.5 3"
                strokeLinecap="round"
              />
              <path
                d="M 110,12 C 100,4 92,8 97,13 C 100,16 106,14 110,12 Z M 110,12 C 120,4 128,8 123,13 C 120,16 114,14 110,12 Z"
                fill="none"
                stroke={isDarkMode ? '#E6B89C' : '#A6725C'}
                strokeWidth="1.25"
              />
              <path
                d="M 110,12 Q 104,18 100,21 M 110,12 Q 116,18 120,21"
                fill="none"
                stroke={isDarkMode ? '#E6B89C' : '#A6725C'}
                strokeWidth="1.1"
                strokeLinecap="round"
              />
              <circle cx="110" cy="12" r="1.8" fill={isDarkMode ? '#E6B89C' : '#A6725C'} />
            </svg>
          </div>

          {/* Minimal Editorial Dedication Lockup Over the Living Peony Bloom */}
          <h2
            className="mx-auto leading-[0.98] tracking-[-0.02em]"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            <span
              className={`block text-2xl sm:text-3xl italic font-normal mb-1 ${
                isDarkMode ? 'text-[#DFCFC6]' : 'text-[#6E594E]'
              }`}
            >
              For
            </span>
            <span
              className={`block text-[46px] sm:text-[62px] md:text-[74px] font-semibold tracking-[-0.02em] leading-[0.98] ${
                isDarkMode ? 'text-[#FBF6F1]' : 'text-[#1F1815]'
              }`}
            >
              You
            </span>
          </h2>

          <p
            data-testid="recipient-surprise-subtitle"
            className={`mt-3 sm:mt-4 text-lg sm:text-xl italic font-normal ${
              isDarkMode ? 'text-[#E5D6CE]' : 'text-[#5C473C]'
            }`}
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            Someone sent you a bouquet
          </p>

          {/* MODE 2: SECRET HINT LOCK (Exact Recipient Inline Pill Input + Wax Seal Submit) */}
          <form
            onSubmit={handleUnlockGate}
            onClick={(e) => e.stopPropagation()}
            className="mt-6 sm:mt-7 w-full max-w-xs flex flex-col items-center space-y-2.5"
          >
            <p
              className={`text-lg sm:text-xl italic font-normal leading-snug px-2 ${
                isDarkMode ? 'text-[#F0DFD6]' : 'text-[#4A3B33]'
              }`}
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              “Our special secret”
            </p>

            <div
              className={`w-full flex items-center p-1 rounded-full border border-dashed shadow-[0_10px_28px_rgba(35,28,24,0.07)] backdrop-blur-md ${
                isDarkMode
                  ? 'bg-[#352C29]/92 border-[#66554F]'
                  : 'bg-[#FFFDF9]/92 border-[#D8C3B0]'
              }`}
            >
              <input
                data-testid="stealth-gate-pin-input"
                type="password"
                value={pinInput}
                disabled={gateLockedOut || isVerifyingPin}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  if (gateError) setGateError(null);
                }}
                placeholder="Secret answer..."
                aria-label="Secret answer to unlock bouquet"
                autoFocus
                className={`flex-1 min-w-0 bg-transparent px-4 py-2 text-xs sm:text-sm focus:outline-none ${
                  isDarkMode
                    ? 'text-[#FBF6F1] placeholder:text-[#9A877B]'
                    : 'text-[#231C18] placeholder:text-[#9A877B]'
                }`}
              />
              <button
                data-testid="stealth-gate-unwrap-btn"
                type="submit"
                disabled={gateLockedOut || isVerifyingPin}
                className={`px-4 py-2 rounded-full text-xs font-medium shrink-0 transition active:scale-95 cursor-pointer disabled:opacity-50 ${
                  isDarkMode
                    ? 'bg-[#9A6550] text-white hover:bg-[#875642]'
                    : 'bg-[#7A4B3A] text-white hover:bg-[#633B2C]'
                }`}
              >
                {isVerifyingPin ? '...' : 'Unlock'}
              </button>
            </div>

            {gateError && (
              <p
                data-testid="stealth-gate-error"
                className="text-xs text-rose-600 dark:text-rose-300 font-medium"
              >
                {gateError}
              </p>
            )}
          </form>
        </div>
      </div>
    );
  }

  // ============================================================================
  // VIEW 2: MINIMAL LUXURY SIDE-PANEL ATELIER CONSOLE
  // ============================================================================
  const topFlowers = topSortedEntries(realAnalytics.flowers, 6);
  const topWraps = topSortedEntries(realAnalytics.wraps, 5);
  const topRibbons = topSortedEntries(realAnalytics.ribbons, 5);
  const topEnvironments = topSortedEntries(realAnalytics.environments, 5);

  const navItems: Array<{
    id: ConsoleTab;
    testId: string;
    label: string;
    mobileLabel: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }> = [
    {
      id: 'web_funnel',
      testId: 'owner-tab-web_funnel',
      label: 'Overview',
      mobileLabel: 'Overview',
      icon: BarChart3,
    },
    {
      id: 'vouchers',
      testId: 'owner-tab-vouchers',
      label: 'Keys & Passes',
      mobileLabel: 'Keys',
      icon: Ticket,
      count: paidPasses.length + testerVouchers.length || undefined,
    },
    {
      id: 'ai_advisor',
      testId: 'owner-tab-ai_advisor',
      label: 'AI Advisor',
      mobileLabel: 'Advisor',
      icon: Sparkles,
    },
    {
      id: 'botanicals',
      testId: 'owner-tab-botanicals',
      label: 'Botanicals',
      mobileLabel: 'Flora',
      icon: Flower2,
    },
    {
      id: 'security_stream',
      testId: 'owner-tab-security_stream',
      label: 'Security',
      mobileLabel: 'Vault',
      icon: Shield,
    },
  ];

  const cardSurface = isDarkMode
    ? 'bg-[#352C29] border-[#5E4E49]/80'
    : 'bg-[#FFFDF9] border-[#DECBB9]';

  const hairlineBorder = isDarkMode ? 'border-[#5E4E49]/70' : 'border-[#DECBB9]/85';
  const hairlineDivide = isDarkMode ? 'divide-[#5E4E49]/70' : 'divide-[#DECBB9]/85';
  const gridHairlineBg = isDarkMode ? 'bg-[#5E4E49]/65' : 'bg-[#DECBB9]/85';
  const cellBgClass = isDarkMode ? 'bg-[#352C29]' : 'bg-[#FFFDF9]';

  return (
    <div
      data-testid="owner-analytics-console"
      className={`h-[100dvh] w-full flex flex-col md:flex-row overflow-hidden transition-colors duration-300 ${
        isDarkMode ? 'bg-[#2B2321] text-[#F5EBE6]' : 'bg-[#FAF4EE] text-[#2C2523]'
      }`}
    >
      {/* DESKTOP & TABLET SIDEBAR */}
      <aside
        className={`hidden md:flex md:w-52 lg:w-56 shrink-0 flex-col justify-between p-5 border-r ${
          isDarkMode ? 'bg-[#352C29]/90 border-[#5E4E49]/80' : 'bg-[#FFFDF9] border-[#DECBB9]'
        }`}
      >
        <div className="space-y-6">
          {/* Brand Lockup */}
          <div className="flex items-center gap-2.5 px-1">
            <div
              className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${
                isDarkMode ? 'border-[#E6B89C]/40 bg-[#2B2321]' : 'border-[#8C624C]/30 bg-[#FAF4EE]'
              }`}
            >
              <BrandLogoMark className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
                className="text-lg font-medium leading-tight truncate"
              >
                Send A Bouquet
              </div>
              <div
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
                className="text-xs italic opacity-60 leading-none"
              >
                Atelier Console
              </div>
            </div>
          </div>

          {/* Side Navigation */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  data-testid={item.testId}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    active
                      ? isDarkMode
                        ? 'bg-[#E6B89C] text-[#231C18]'
                        : 'bg-[#6E4434] text-[#FFFDF9]'
                      : 'opacity-70 hover:opacity-100 hover:bg-current/5'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </span>
                  {item.count !== undefined && (
                    <span className="text-[11px] font-mono tabular-nums opacity-75">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className={`space-y-1.5 pt-4 border-t ${hairlineBorder}`}>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => adminSessionToken && fetchConsoleData(adminSessionToken)}
              title="Refresh data"
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs transition-colors cursor-pointer ${hairlineBorder} hover:bg-current/5`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Sync</span>
            </button>
            {onToggleDarkMode && (
              <button
                type="button"
                onClick={onToggleDarkMode}
                title="Toggle theme"
                aria-label="Toggle theme"
                className={`p-2 rounded-lg border transition-colors cursor-pointer ${hairlineBorder} hover:bg-current/5`}
              >
                {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
          <button
            data-testid="owner-console-exit-btn"
            type="button"
            onClick={onExitToStudio}
            className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              isDarkMode
                ? 'text-[#E6B89C] hover:bg-[#2B2321]'
                : 'text-[#6E4434] hover:bg-[#FAF4EE]'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Studio</span>
          </button>
        </div>
      </aside>

      {/* MOBILE TOP BAR */}
      <header
        className={`md:hidden h-13 px-4 border-b flex items-center justify-between shrink-0 ${
          isDarkMode ? 'bg-[#352C29] border-[#5E4E49]/80' : 'bg-[#FFFDF9] border-[#DECBB9]'
        }`}
      >
        <div className="flex items-center gap-2">
          <BrandLogoMark className="w-4 h-4" />
          <span
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
            className="text-lg font-medium"
          >
            Atelier Console
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => adminSessionToken && fetchConsoleData(adminSessionToken)}
            aria-label="Sync"
            className={`p-1.5 rounded-lg border cursor-pointer ${hairlineBorder}`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          {onToggleDarkMode && (
            <button
              type="button"
              onClick={onToggleDarkMode}
              aria-label="Toggle theme"
              className={`p-1.5 rounded-lg border cursor-pointer ${hairlineBorder}`}
            >
              {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          )}
          <button
            type="button"
            onClick={onExitToStudio}
            className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer ${
              isDarkMode ? 'bg-[#E6B89C] text-[#231C18]' : 'bg-[#6E4434] text-[#FFFDF9]'
            }`}
          >
            Studio
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20 md:pb-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* TAB 1: REVENUE & FUNNEL OVERVIEW */}
          {activeTab === 'web_funnel' && (
            <OwnerOverviewSection
              analytics={realAnalytics}
              paidPasses={paidPasses}
              testerCount={testerVouchers.length}
              isDarkMode={isDarkMode}
              formatLabel={formatLabel}
              isTogglingIncomePause={isTogglingIncomePause}
              isResettingIncome={isResettingIncome}
              onToggleIncomePause={handleToggleIncomePause}
              onResetIncome={handleResetIncome}
            />
          )}

          {/* TAB 2: PAID KEYS & TESTER VOUCHERS */}
          {activeTab === 'vouchers' && (
            <OwnerKeysSection
              adminSessionToken={adminSessionToken}
              deviceTokenHash={deviceTokenHash}
              isDarkMode={isDarkMode}
              paidPasses={paidPasses}
              testerVouchers={testerVouchers}
              copiedId={copiedId}
              onCopyText={copyText}
              onSyncResponse={handleSyncKeysResponse}
              onToast={onToast}
              incomePausedForTesting={Boolean(realAnalytics.incomePausedForTesting)}
              isClearingKeys={isClearingKeys}
              onClearTestAndRevoked={handleClearTestAndRevoked}
            />
          )}

          {/* TAB 3: ADMIN-ONLY AI ANALYTICS ADVISOR (kept mounted while verified so chat persists across tab switches) */}
          <div className={activeTab === 'ai_advisor' ? 'block' : 'hidden'}>
            <OwnerAiAdvisorPanel
              adminSessionToken={adminSessionToken}
              deviceTokenHash={deviceTokenHash}
              isDarkMode={isDarkMode}
            />
          </div>

          {/* TAB 4: BOTANICALS & STYLING */}
          {activeTab === 'botanicals' && (
            <div className="space-y-5 animate-[fadeIn_180ms_ease-out]">
              <div className="flex items-baseline justify-between">
                <h1
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  className="text-2xl sm:text-3xl font-normal"
                >
                  Botanicals & Styling
                </h1>
                <span className="text-xs opacity-60">Real selections from sealed bouquets</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { title: 'Most Loved Blooms', items: topFlowers },
                  { title: 'Wrapping Papers', items: topWraps },
                  { title: 'Ribbon Trim', items: topRibbons },
                  { title: 'Atmosphere Scenes', items: topEnvironments },
                ].map((group) => {
                  const maxVal = Math.max(1, ...(group.items.map(([, c]) => c) || [1]));
                  return (
                    <div key={group.title} className={`rounded-xl border p-5 ${cardSurface}`}>
                      <h2
                        style={{ fontFamily: "'Cormorant Garamond', serif" }}
                        className="text-xl font-medium mb-3"
                      >
                        {group.title}
                      </h2>

                      {group.items.length === 0 ? (
                        <div
                          style={{ fontFamily: "'Cormorant Garamond', serif" }}
                          className="py-6 text-center italic text-sm opacity-50"
                        >
                          Recorded as bouquets are sealed
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {group.items.map(([id, count]) => {
                            const pct = Math.max(8, Math.round((count / maxVal) * 100));
                            return (
                              <div key={id} className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span>{formatLabel(id)}</span>
                                  <span className="font-mono tabular-nums opacity-65">{count}</span>
                                </div>
                                <div className="h-1.5 rounded-sm bg-current/10 overflow-hidden">
                                  <div
                                    style={{ width: `${pct}%` }}
                                    className="h-full bg-[#6E4434] dark:bg-[#E6B89C]"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: SECURITY & PASSPHRASE */}
          {activeTab === 'security_stream' && (
            <div className="space-y-5 animate-[fadeIn_180ms_ease-out]">
              <div className="flex items-baseline justify-between">
                <h1
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  className="text-2xl sm:text-3xl font-normal"
                >
                  Security & Passphrase
                </h1>
                <span className="text-xs opacity-60">Gate protection & live event log</span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                <div className={`lg:col-span-5 rounded-xl border p-5 space-y-4 ${cardSurface}`}>
                  <h2
                    style={{ fontFamily: "'Cormorant Garamond', serif" }}
                    className="text-xl font-medium"
                  >
                    Gate Passphrase
                  </h2>

                  <div className={`border ${hairlineBorder} rounded-lg overflow-hidden`}>
                    <div className={`grid grid-cols-2 gap-px ${gridHairlineBg}`}>
                      <div className={`p-3 ${cellBgClass}`}>
                        <div
                          style={{ fontFamily: "'Cormorant Garamond', serif" }}
                          className="text-2xl font-medium leading-none tabular-nums"
                        >
                          {realAnalytics.blockedShareAttempts}
                        </div>
                        <div className="text-[11px] opacity-60 mt-1">Blocked Forwards</div>
                      </div>
                      <div className={`p-3 ${cellBgClass}`}>
                        <div
                          style={{ fontFamily: "'Cormorant Garamond', serif" }}
                          className="text-2xl font-medium leading-none tabular-nums"
                        >
                          {realAnalytics.blockedPinAttempts}
                        </div>
                        <div className="text-[11px] opacity-60 mt-1">Blocked PIN Tries</div>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleUpdateOwnerPin} className="space-y-2.5 pt-1">
                    <label htmlFor="owner-new-pin-input" className="block text-xs opacity-70">
                      Update Passphrase (or set <span className="font-mono">OWNER_ADMIN_PIN</span> in Vercel)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="owner-new-pin-input"
                        type="password"
                        value={newOwnerPin}
                        onChange={(e) => setNewOwnerPin(e.target.value)}
                        placeholder="New passphrase..."
                        minLength={4}
                        maxLength={32}
                        className={`flex-1 min-w-0 px-3.5 py-2 rounded-lg border text-xs focus:outline-none ${
                          isDarkMode
                            ? 'bg-[#2B2321] border-[#5E4E49] focus:border-[#E6B89C]'
                            : 'bg-[#FAF4EE] border-[#DECBB9] focus:border-[#6E4434]'
                        }`}
                      />
                      <button
                        type="submit"
                        disabled={isUpdatingPin || newOwnerPin.trim().length < 4}
                        className={`px-4 py-2 rounded-lg text-xs font-medium cursor-pointer disabled:opacity-45 flex items-center gap-1.5 shrink-0 ${
                          isDarkMode
                            ? 'bg-[#E6B89C] text-[#231C18]'
                            : 'bg-[#6E4434] text-[#FFFDF9]'
                        }`}
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Save</span>
                      </button>
                    </div>
                  </form>
                </div>

                <div className={`lg:col-span-7 rounded-xl border p-5 ${cardSurface}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h2
                      style={{ fontFamily: "'Cormorant Garamond', serif" }}
                      className="text-xl font-medium"
                    >
                      Recent Activity
                    </h2>
                    <span className="text-xs opacity-60 tabular-nums">
                      {realAnalytics.recentEvents.length} events
                    </span>
                  </div>

                  {realAnalytics.recentEvents.length === 0 ? (
                    <div
                      style={{ fontFamily: "'Cormorant Garamond', serif" }}
                      className="py-10 text-center italic text-base opacity-50"
                    >
                      No activity recorded in this session yet.
                    </div>
                  ) : (
                    <div className={`divide-y ${hairlineDivide} max-h-[360px] overflow-y-auto`}>
                      {realAnalytics.recentEvents.slice(0, 20).map((ev) => (
                        <div
                          key={ev.id}
                          className="py-2.5 flex items-center justify-between gap-3 text-xs"
                        >
                          <span className="truncate opacity-85">{ev.summary}</span>
                          <span className="text-[11px] font-mono tabular-nums opacity-55 shrink-0">
                            {new Date(ev.ts).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MOBILE BOTTOM NAVIGATION DOCK */}
      <nav
        className={`md:hidden fixed bottom-0 inset-x-0 h-14 border-t grid grid-cols-5 z-20 ${
          isDarkMode ? 'bg-[#352C29] border-[#5E4E49]/80' : 'bg-[#FFFDF9] border-[#DECBB9]'
        }`}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors cursor-pointer ${
                active
                  ? isDarkMode
                    ? 'text-[#E6B89C]'
                    : 'text-[#6E4434]'
                  : 'opacity-55'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.mobileLabel}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
