import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Lock,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  ArrowLeft,
  Flower2,
  Ticket,
  BarChart3,
  Shield,
  Link2,
  KeyRound,
  Moon,
  Sun,
} from 'lucide-react';
import {
  OwnerAnalyticsSummary,
  TesterVoucherLedgerItem,
  createInitialAnalyticsSummary,
  buildTesterMagicInviteUrl,
} from '../lib/ownerAnalytics';
import { computeRecipientSlideBloomState } from '../lib/dofParallax';
import {
  getSavedVaultBouquets,
  fetchStudioGlobalStats,
  StudioGlobalStats,
} from '../lib/firebase';
import { decodeBouquetFromHash } from '../lib/shareAndExport';
import { BrandLogoMark } from './BrandLogoMark';

interface StealthGateAndOwnerConsoleProps {
  gateSlug: string;
  deviceTokenHash: string;
  isDarkMode: boolean;
  onToggleDarkMode?: () => void;
  onExitToStudio: () => void;
  onToast: (msg: string) => void;
}

type ConsoleTab = 'web_funnel' | 'vouchers' | 'botanicals' | 'security_stream';

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

  // Authenticated Owner Session state
  const [adminSessionToken, setAdminSessionToken] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('lux_owner_session_token_v1');
    } catch {
      return null;
    }
  });
  const [activeTab, setActiveTab] = useState<ConsoleTab>('web_funnel');
  const [analytics, setAnalytics] = useState<OwnerAnalyticsSummary>(() =>
    createInitialAnalyticsSummary()
  );
  const [liveFirestoreStats, setLiveFirestoreStats] = useState<StudioGlobalStats | null>(null);
  const [testerVouchers, setTesterVouchers] = useState<TesterVoucherLedgerItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Tester Voucher Generator form state
  const [voucherLabel, setVoucherLabel] = useState('');
  const [voucherDurationHours, setVoucherDurationHours] = useState<number>(48);
  const [voucherDailyCap, setVoucherDailyCap] = useState<number>(10);
  const [voucherRetentionDays, setVoucherRetentionDays] = useState<30 | 90>(30);
  const [isMintingVoucher, setIsMintingVoucher] = useState(false);
  const [newlyMintedVoucher, setNewlyMintedVoucher] = useState<TesterVoucherLedgerItem | null>(
    null
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Owner PIN rotation state
  const [newOwnerPin, setNewOwnerPin] = useState('');
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);

  // Fetch real Firestore global stats if available
  useEffect(() => {
    let active = true;
    fetchStudioGlobalStats()
      .then((stats) => {
        if (active && stats) setLiveFirestoreStats(stats);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [adminSessionToken]);

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
        } else if (res.status === 401) {
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
    nextVouchers?: TesterVoucherLedgerItem[]
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
      animatePeonyBloomAndUnlock(data.adminSessionToken, data.analytics, data.testerVouchers);
    } catch {
      setGateError('Could not verify passphrase.');
      setIsVerifyingPin(false);
    }
  };

  const handleMintTesterVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminSessionToken) return;
    setIsMintingVoucher(true);

    try {
      const res = await fetch('/api/payments/verify-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mint_tester_voucher',
          adminSessionToken,
          deviceTokenHash,
          label: voucherLabel.trim() || 'Tester Invite',
          durationHours: voucherDurationHours,
          dailyCap: voucherDailyCap,
          retentionDays: voucherRetentionDays,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setNewlyMintedVoucher(data.voucher);
        if (data.analytics) setAnalytics(data.analytics);
        if (Array.isArray(data.testerVouchers)) setTesterVouchers(data.testerVouchers);
        setVoucherLabel('');
        onToast(`Created key for ${data.voucher.label}`);
      } else {
        onToast(data.message || 'Could not create voucher.');
      }
    } catch {
      onToast('Network error while creating voucher.');
    } finally {
      setIsMintingVoucher(false);
    }
  };

  const handleRevokeVoucher = async (passKey: string) => {
    if (!adminSessionToken) return;
    try {
      const res = await fetch('/api/payments/verify-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'revoke_tester_voucher',
          adminSessionToken,
          deviceTokenHash,
          passKey,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        if (data.analytics) setAnalytics(data.analytics);
        if (Array.isArray(data.testerVouchers)) setTesterVouchers(data.testerVouchers);
        if (newlyMintedVoucher?.passKey === passKey) {
          setNewlyMintedVoucher(null);
        }
        onToast(`Revoked ${passKey}`);
      }
    } catch {
      onToast('Could not revoke voucher.');
    }
  };

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
  // VIEW 1: RECIPIENT FLOWER BLOOM LOCK SCREEN (Matches Recipient Unwrap UI)
  // ============================================================================
  if (!adminSessionToken) {
    return (
      <div
        data-testid="stealth-bouquet-gate-screen"
        className={`relative h-[100dvh] w-full flex flex-col items-center justify-center p-5 sm:p-6 overflow-hidden transition-colors duration-500 ${
          isDarkMode ? 'bg-[#2B2321] text-[#F5EBE6]' : 'bg-[#FAF5F0] text-[#2C2523]'
        }`}
      >
        {/* 2 Blurred Foreground Petals (DOF Framing matching Recipient Entrance) */}
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

        {/* LIVING WATERCOLOR & COLORED BOTANICAL LINEART BLOOMING PEONY */}
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
              <radialGradient id="rg-gate-petal-blush" cx="50%" cy="68%" r="65%">
                <stop offset="0%" stopColor={isDarkMode ? '#D97B93' : '#F29BB4'} stopOpacity="0.42" />
                <stop offset="55%" stopColor={isDarkMode ? '#E69DB0' : '#F9C4D4'} stopOpacity="0.26" />
                <stop offset="100%" stopColor={isDarkMode ? '#F5D0DA' : '#FFF5F8'} stopOpacity="0.06" />
              </radialGradient>
              <radialGradient id="rg-gate-petal-peach" cx="50%" cy="62%" r="62%">
                <stop offset="0%" stopColor={isDarkMode ? '#D87E6C' : '#EE9682'} stopOpacity="0.46" />
                <stop offset="60%" stopColor={isDarkMode ? '#E6A896' : '#F8C5B8'} stopOpacity="0.28" />
                <stop offset="100%" stopColor={isDarkMode ? '#F5DCD4' : '#FFF7F4'} stopOpacity="0.08" />
              </radialGradient>
              <radialGradient id="rg-gate-leaf-sage" cx="30%" cy="50%" r="70%">
                <stop offset="0%" stopColor={isDarkMode ? '#688B72' : '#7FA388'} stopOpacity="0.38" />
                <stop offset="70%" stopColor={isDarkMode ? '#88AB91' : '#A6C4AD'} stopOpacity="0.22" />
                <stop offset="100%" stopColor={isDarkMode ? '#A6C4AD' : '#DCEAD9'} stopOpacity="0.05" />
              </radialGradient>
              <radialGradient id="rg-gate-center-gold" cx="50%" cy="50%" r="55%">
                <stop offset="0%" stopColor={isDarkMode ? '#E8B86B' : '#F0C068'} stopOpacity="0.58" />
                <stop offset="65%" stopColor={isDarkMode ? '#DF9B6D' : '#F2A679'} stopOpacity="0.28" />
                <stop offset="100%" stopColor="#FFFDF9" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Ambient watercolor halo */}
            <ellipse
              cx="260"
              cy="170"
              rx={165 + recipientBloom.progress * 55}
              ry={105 + recipientBloom.progress * 32}
              fill="url(#rg-gate-petal-blush)"
            />

            {/* LEFT & RIGHT WATERCOLOR SAGE LEAF SPRIGS */}
            <g
              stroke={isDarkMode ? '#8CAE95' : '#587860'}
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <g
                style={{
                  transformOrigin: '260px 175px',
                  transform: `translateX(${(-recipientBloom.progress * 36).toFixed(1)}px) rotate(${(-14 - recipientBloom.progress * 20).toFixed(2)}deg) scale(${recipientBloom.leafScale})`,
                }}
              >
                <path
                  d="M210,175 C150,168 92,150 34,122"
                  fill="none"
                  strokeDasharray="240"
                  strokeDashoffset={Math.round(240 * (1 - (0.35 + recipientBloom.progress * 0.65)))}
                />
                <path
                  d="M158,164 C132,134 92,126 68,136 C94,158 130,168 158,164 Z"
                  fill="url(#rg-gate-leaf-sage)"
                />
                <path
                  d="M154,163 C126,146 96,138 74,136"
                  fill="none"
                  strokeWidth="0.85"
                  opacity="0.7"
                />
                <path
                  d="M128,156 C96,174 62,182 32,170 C58,150 96,148 128,156 Z"
                  fill="url(#rg-gate-leaf-sage)"
                />
                <path
                  d="M102,146 C78,120 48,112 22,120 C46,140 76,148 102,146 Z"
                  fill="url(#rg-gate-leaf-sage)"
                />
                <circle cx="48" cy="112" r="3.5" fill={isDarkMode ? '#E49B85' : '#EA907A'} opacity="0.65" />
                <circle cx="24" cy="144" r="3" fill={isDarkMode ? '#E8B86B' : '#E8B258'} opacity="0.65" />
              </g>

              <g
                style={{
                  transformOrigin: '260px 175px',
                  transform: `translateX(${(recipientBloom.progress * 36).toFixed(1)}px) rotate(${(14 + recipientBloom.progress * 20).toFixed(2)}deg) scale(${recipientBloom.leafScale})`,
                }}
              >
                <path
                  d="M310,175 C370,168 428,150 486,122"
                  fill="none"
                  strokeDasharray="240"
                  strokeDashoffset={Math.round(240 * (1 - (0.35 + recipientBloom.progress * 0.65)))}
                />
                <path
                  d="M362,164 C388,134 428,126 452,136 C426,158 390,168 362,164 Z"
                  fill="url(#rg-gate-leaf-sage)"
                />
                <path
                  d="M366,163 C394,146 424,138 446,136"
                  fill="none"
                  strokeWidth="0.85"
                  opacity="0.7"
                />
                <path
                  d="M392,156 C424,174 458,182 488,170 C462,150 424,148 392,156 Z"
                  fill="url(#rg-gate-leaf-sage)"
                />
                <path
                  d="M418,146 C442,120 472,112 498,120 C474,140 444,148 418,146 Z"
                  fill="url(#rg-gate-leaf-sage)"
                />
                <circle cx="472" cy="112" r="3.5" fill={isDarkMode ? '#E49B85' : '#EA907A'} opacity="0.65" />
                <circle cx="496" cy="144" r="3" fill={isDarkMode ? '#E8B86B' : '#E8B258'} opacity="0.65" />
              </g>
            </g>

            {/* CENTRAL WATERCOLOR & INK PEONY BLOOM */}
            <g transform="translate(260, 170)">
              {[0, 45, 90, 135, 180, 225, 270, 315].map((baseAngle, idx) => {
                const spreadOffset = (idx % 2 === 0 ? 1 : -1) * recipientBloom.outerRotateDeg * 0.45;
                const petalReachY = -8 - recipientBloom.progress * 26;
                return (
                  <g
                    key={`outer-wc-${baseAngle}`}
                    transform={`rotate(${(baseAngle + spreadOffset).toFixed(2)}) translate(0, ${petalReachY.toFixed(1)}) scale(${recipientBloom.outerScale})`}
                  >
                    <path
                      d="M0,0 C-44,-28 -58,-86 -26,-122 C-10,-136 10,-136 26,-122 C58,-86 44,-28 0,0 Z"
                      fill="url(#rg-gate-petal-blush)"
                      stroke={isDarkMode ? '#D98B9E' : '#B55D72'}
                      strokeWidth="1.2"
                      strokeOpacity={0.55 + recipientBloom.progress * 0.35}
                    />
                    <path
                      d="M-16,-116 C-6,-124 6,-118 16,-116"
                      fill="none"
                      stroke={isDarkMode ? '#F2B8C6' : '#9E475C'}
                      strokeWidth="0.9"
                      strokeOpacity="0.55"
                    />
                    <path
                      d="M0,-12 C-8,-48 -6,-84 0,-112 M0,-20 C8,-52 14,-78 18,-100 M0,-20 C-8,-52 -14,-78 -18,-100"
                      fill="none"
                      stroke={isDarkMode ? '#E69DB0' : '#B55D72'}
                      strokeWidth="0.75"
                      strokeOpacity={0.28 + recipientBloom.progress * 0.3}
                    />
                  </g>
                );
              })}

              {[22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((baseAngle, idx) => {
                const spreadOffset = (idx % 2 === 0 ? -1 : 1) * recipientBloom.midRotateDeg * 0.5;
                const petalReachY = -4 - recipientBloom.progress * 18;
                return (
                  <g
                    key={`mid-wc-${baseAngle}`}
                    transform={`rotate(${(baseAngle + spreadOffset).toFixed(2)}) translate(0, ${petalReachY.toFixed(1)}) scale(${recipientBloom.midScale})`}
                  >
                    <path
                      d="M0,0 C-34,-22 -42,-68 -18,-96 C-6,-108 6,-108 18,-96 C42,-68 34,-22 0,0 Z"
                      fill="url(#rg-gate-petal-peach)"
                      stroke={isDarkMode ? '#E29888' : '#B85B48'}
                      strokeWidth="1.15"
                      strokeOpacity={0.6 + recipientBloom.progress * 0.35}
                    />
                    <path
                      d="M0,-10 C-5,-38 -4,-66 0,-86 M0,-16 C6,-42 10,-62 13,-78"
                      fill="none"
                      stroke={isDarkMode ? '#E6A896' : '#B85B48'}
                      strokeWidth="0.7"
                      strokeOpacity="0.35"
                    />
                  </g>
                );
              })}

              {[0, 60, 120, 180, 240, 300].map((baseAngle, idx) => {
                const closedCupOffset = (1 - recipientBloom.progress) * (idx % 2 === 0 ? -18 : 18);
                const openOffset = recipientBloom.innerRotateDeg * 0.35;
                const petalReachY = -2 - recipientBloom.progress * 10;
                return (
                  <g
                    key={`inner-wc-${baseAngle}`}
                    transform={`rotate(${(baseAngle + closedCupOffset + openOffset).toFixed(2)}) translate(0, ${petalReachY.toFixed(1)}) scale(${recipientBloom.innerScale})`}
                  >
                    <path
                      d="M0,4 C-24,-14 -30,-48 -10,-68 C-2,-76 2,-76 10,-68 C30,-48 24,-14 0,4 Z"
                      fill="url(#rg-gate-petal-peach)"
                      stroke={isDarkMode ? '#ECA898' : '#A84A38'}
                      strokeWidth="1.1"
                      strokeOpacity="0.82"
                    />
                  </g>
                );
              })}

              {/* Golden Watercolor Heart & Botanical Stamens */}
              <g
                style={{
                  transform: `scale(${(0.32 + recipientBloom.progress * 0.88).toFixed(3)})`,
                  opacity: Number((0.25 + recipientBloom.progress * 0.75).toFixed(3)),
                }}
              >
                <circle cx="0" cy="0" r="34" fill="url(#rg-gate-center-gold)" />
                {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg, i) => (
                  <g key={`stamen-${deg}`} transform={`rotate(${deg})`}>
                    <line
                      x1="0"
                      y1="-4"
                      x2="0"
                      y2={i % 2 === 0 ? '-24' : '-18'}
                      stroke={isDarkMode ? '#F0C37B' : '#B87A28'}
                      strokeWidth="1.1"
                      strokeDasharray="28"
                      strokeDashoffset={Math.round(recipientBloom.stamenDashOffset * 0.25)}
                    />
                    <circle
                      cx="0"
                      cy={i % 2 === 0 ? -25 : -19}
                      r="2.2"
                      fill={isDarkMode ? '#F7D794' : '#D99330'}
                    />
                  </g>
                ))}
                <circle
                  cx="0"
                  cy="0"
                  r="6.5"
                  fill={isDarkMode ? '#E59882' : '#D4725C'}
                  fillOpacity="0.65"
                  stroke={isDarkMode ? '#F7D794' : '#B87A28'}
                  strokeWidth="1"
                />
              </g>
            </g>
          </svg>
        </div>

        {/* FOREGROUND CONTENT LOCKUP (Exact Recipient Layout) */}
        <div
          className={`relative z-10 max-w-md w-full text-center flex flex-col items-center transition-all duration-300 ease-out ${
            isBloomUnfurling
              ? 'opacity-0 scale-95 translate-y-2 pointer-events-none'
              : 'opacity-100 scale-100 translate-y-0'
          }`}
        >
          {/* Thin Rope Lace & Scallop Bow Ornament */}
          <div aria-hidden="true" className="mb-3 sm:mb-4 flex items-center justify-center">
            <svg
              viewBox="0 0 220 24"
              className={`w-44 sm:w-52 h-6 overflow-visible ${
                isDarkMode ? 'text-[#E6B89C]/75' : 'text-[#8C624C]/75'
              }`}
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M 8,12 C 36,9 66,14 96,12" strokeWidth="1.15" />
              <path d="M 8,12 C 36,15 66,10 96,12" strokeWidth="0.75" strokeDasharray="2 3" opacity="0.75" />
              <path d="M 124,12 C 154,14 184,9 212,12" strokeWidth="1.15" />
              <path d="M 124,12 C 154,10 184,15 212,12" strokeWidth="0.75" strokeDasharray="2 3" opacity="0.75" />
              <path d="M 110,12 C 102,4 91,5 93,12 C 95,18 104,16 110,12 Z" strokeWidth="1.2" />
              <path d="M 110,12 C 118,4 129,5 127,12 C 125,18 116,16 110,12 Z" strokeWidth="1.2" />
              <path d="M 108,13 C 104,18 100,21 96,22" strokeWidth="1.05" />
              <path d="M 112,13 C 116,18 120,21 124,22" strokeWidth="1.05" />
              <circle cx="110" cy="12" r="2" fill="currentColor" />
            </svg>
          </div>

          {/* Dedication Title Lockup */}
          <div className="mb-6 sm:mb-8 px-2">
            <span
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
              className={`block italic text-xl sm:text-2xl leading-none mb-1 ${
                isDarkMode ? 'text-[#E6B89C]' : 'text-[#7A5442]'
              }`}
            >
              For
            </span>
            <h1
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
              className="text-[46px] sm:text-[62px] md:text-[74px] font-normal tracking-[-0.02em] leading-[0.98]"
            >
              You
            </h1>
            <p
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
              className={`mt-2.5 sm:mt-3 italic text-base sm:text-lg tracking-wide ${
                isDarkMode ? 'text-[#D8C7BF]' : 'text-[#6E5D55]'
              }`}
            >
              Someone sent you a bouquet
            </p>
          </div>

          {/* Minimal Inline Pill Passcode Form (Matches Recipient Passcode Lock) */}
          <form onSubmit={handleUnlockGate} className="w-full max-w-xs flex flex-col items-center gap-2">
            <div
              className={`w-full flex items-center p-1 rounded-full border border-dashed transition-colors ${
                isDarkMode
                  ? 'bg-[#352C29]/92 border-[#66554F] focus-within:border-[#E6B89C]'
                  : 'bg-[#FFFDF9]/92 border-[#D8C3B0] focus-within:border-[#6E4434]'
              } shadow-md backdrop-blur-md`}
            >
              <Lock className="w-3.5 h-3.5 ml-3 opacity-45 shrink-0" />
              <input
                data-testid="stealth-gate-pin-input"
                type="password"
                value={pinInput}
                disabled={gateLockedOut || isVerifyingPin}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  if (gateError) setGateError(null);
                  if (!isBloomUnfurling) {
                    setBloomProgress(Math.min(0.35, e.target.value.length * 0.08));
                  }
                }}
                placeholder="Secret passphrase..."
                aria-label="Secret passphrase"
                autoFocus
                className="flex-1 bg-transparent px-2.5 py-2 text-xs focus:outline-none min-w-0"
              />
              <button
                data-testid="stealth-gate-unwrap-btn"
                type="submit"
                disabled={gateLockedOut || isVerifyingPin}
                className={`px-4 py-2 rounded-full text-xs font-medium transition-all cursor-pointer shrink-0 disabled:opacity-50 ${
                  isDarkMode
                    ? 'bg-[#E6B89C] text-[#231C18] hover:bg-[#F0C8AE]'
                    : 'bg-[#6E4434] text-[#FFFDF9] hover:bg-[#593527]'
                }`}
              >
                {isVerifyingPin ? '...' : 'Unlock'}
              </button>
            </div>

            {gateError && (
              <span
                data-testid="stealth-gate-error"
                className="text-xs text-rose-600 dark:text-rose-400 font-medium mt-1"
              >
                {gateError}
              </span>
            )}
          </form>

          <button
            type="button"
            onClick={onExitToStudio}
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
            className="mt-7 italic text-sm opacity-55 hover:opacity-90 transition-opacity cursor-pointer"
          >
            Return to the flower studio
          </button>
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
  const topReferrers = topSortedEntries(realAnalytics.referrers, 5);
  const maxDailyTraffic = Math.max(
    1,
    ...realAnalytics.dailySeries.map((d) =>
      Math.max(d.visits, d.bouquetsSealed, d.recipientUnwraps)
    )
  );
  const estimatedRevenueUsd =
    realAnalytics.revenueUsdCents / 100 + realAnalytics.revenuePhpCentavos / 100 / 56;

  const navItems: Array<{
    id: ConsoleTab;
    testId: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }> = [
    {
      id: 'web_funnel',
      testId: 'owner-tab-web_funnel',
      label: 'Overview',
      icon: BarChart3,
    },
    {
      id: 'vouchers',
      testId: 'owner-tab-vouchers',
      label: 'Tester Keys',
      icon: Ticket,
      count: testerVouchers.length || undefined,
    },
    {
      id: 'botanicals',
      testId: 'owner-tab-botanicals',
      label: 'Botanicals',
      icon: Flower2,
    },
    {
      id: 'security_stream',
      testId: 'owner-tab-security_stream',
      label: 'Security',
      icon: Shield,
    },
  ];

  const cardSurface = isDarkMode
    ? 'bg-[#352C29]/90 border-[#5E4E49]'
    : 'bg-[#FFFDF9]/95 border-[#DECBB9]';

  const subtleSurface = isDarkMode
    ? 'bg-[#2B2321]/70 border-[#5E4E49]'
    : 'bg-[#FAF4EE]/75 border-[#E6D5C5]';

  return (
    <div
      data-testid="owner-analytics-console"
      className={`h-[100dvh] w-full flex flex-col md:flex-row overflow-hidden transition-colors duration-300 ${
        isDarkMode ? 'bg-[#2B2321] text-[#F5EBE6]' : 'bg-[#FAF4EE] text-[#2C2523]'
      }`}
    >
      {/* DESKTOP & TABLET SIDEBAR */}
      <aside
        className={`hidden md:flex md:w-52 lg:w-56 shrink-0 flex-col justify-between p-5 border-r border-dashed ${
          isDarkMode ? 'bg-[#352C29]/80 border-[#5E4E49]' : 'bg-[#FFFDF9]/85 border-[#DECBB9]'
        }`}
      >
        <div className="space-y-6">
          {/* Brand Lockup */}
          <div className="flex items-center gap-2.5 px-1">
            <div
              className={`w-8 h-8 rounded-full border border-dashed flex items-center justify-center shrink-0 ${
                isDarkMode ? 'border-[#E6B89C]/45 bg-[#2B2321]' : 'border-[#8C624C]/35 bg-[#FAF4EE]'
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

          {/* Side Navigation Pills */}
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
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-medium transition-all cursor-pointer ${
                    active
                      ? isDarkMode
                        ? 'bg-[#E6B89C] text-[#231C18] shadow-sm'
                        : 'bg-[#6E4434] text-[#FFFDF9] shadow-sm'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </span>
                  {item.count !== undefined && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                        active
                          ? isDarkMode
                            ? 'bg-[#231C18]/15 text-[#231C18]'
                            : 'bg-[#FFFDF9]/20 text-[#FFFDF9]'
                          : isDarkMode
                          ? 'bg-[#2B2321] text-[#E6B89C]'
                          : 'bg-[#FAF4EE] text-[#6E4434]'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="space-y-1.5 pt-4 border-t border-dashed border-[#DECBB9]/60 dark:border-[#5E4E49]/60">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => adminSessionToken && fetchConsoleData(adminSessionToken)}
              title="Refresh data"
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full border border-dashed text-xs transition-all cursor-pointer ${
                isDarkMode
                  ? 'border-[#5E4E49] hover:border-[#E6B89C]/60'
                  : 'border-[#DECBB9] hover:border-[#6E4434]/60'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Sync</span>
            </button>
            {onToggleDarkMode && (
              <button
                type="button"
                onClick={onToggleDarkMode}
                title="Toggle theme"
                className={`p-2 rounded-full border border-dashed transition-all cursor-pointer ${
                  isDarkMode
                    ? 'border-[#5E4E49] hover:border-[#E6B89C]/60'
                    : 'border-[#DECBB9] hover:border-[#6E4434]/60'
                }`}
              >
                {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
          <button
            data-testid="owner-console-exit-btn"
            type="button"
            onClick={onExitToStudio}
            className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
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
        className={`md:hidden h-13 px-4 border-b border-dashed flex items-center justify-between shrink-0 ${
          isDarkMode ? 'bg-[#352C29]/90 border-[#5E4E49]' : 'bg-[#FFFDF9]/90 border-[#DECBB9]'
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
            className={`p-1.5 rounded-full border border-dashed cursor-pointer ${
              isDarkMode ? 'border-[#5E4E49]' : 'border-[#DECBB9]'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          {onToggleDarkMode && (
            <button
              type="button"
              onClick={onToggleDarkMode}
              aria-label="Theme"
              className={`p-1.5 rounded-full border border-dashed cursor-pointer ${
                isDarkMode ? 'border-[#5E4E49]' : 'border-[#DECBB9]'
              }`}
            >
              {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          )}
          <button
            type="button"
            onClick={onExitToStudio}
            className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer ${
              isDarkMode ? 'bg-[#E6B89C] text-[#231C18]' : 'bg-[#6E4434] text-[#FFFDF9]'
            }`}
          >
            Studio
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20 md:pb-8">
        <div className="max-w-4xl mx-auto space-y-5">
          {/* ================================================================
              TAB 1: OVERVIEW (Real Traffic, Funnel & Activity)
          ================================================================ */}
          {activeTab === 'web_funnel' && (
            <div className="space-y-5 animate-[fadeIn_180ms_ease-out]">
              <div className="flex items-baseline justify-between">
                <h1
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  className="text-2xl sm:text-3xl font-normal"
                >
                  Studio Overview
                </h1>
                <span
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  className="text-sm italic opacity-60"
                >
                  Live studio metrics
                </span>
              </div>

              {/* 4 Clean Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  {
                    title: 'Visitors',
                    value: realAnalytics.webVisits.toLocaleString(),
                    note: `${realAnalytics.uniqueVisitors.toLocaleString()} unique`,
                  },
                  {
                    title: 'Bouquets Sealed',
                    value: realAnalytics.bouquetsCreated.toLocaleString(),
                    note: `${realAnalytics.coutureBouquetsCreated.toLocaleString()} with keepsakes`,
                  },
                  {
                    title: 'Recipient Unwraps',
                    value: realAnalytics.recipientUnwraps.toLocaleString(),
                    note: `${realAnalytics.reactionsSent.toLocaleString()} replies sent`,
                  },
                  {
                    title: 'Active Passes',
                    value: (
                      realAnalytics.passesIssued.single +
                      realAnalytics.passesIssued.pass_7d +
                      realAnalytics.passesIssued.pass_30d +
                      realAnalytics.passesIssued.tester
                    ).toLocaleString(),
                    note:
                      estimatedRevenueUsd > 0
                        ? `$${estimatedRevenueUsd.toFixed(2)} est.`
                        : `${testerVouchers.length} tester keys`,
                  },
                ].map((metric) => (
                  <div
                    key={metric.title}
                    className={`rounded-2xl border border-dashed p-4 ${cardSurface}`}
                  >
                    <div
                      style={{ fontFamily: "'Cormorant Garamond', serif" }}
                      className="text-base italic opacity-75"
                    >
                      {metric.title}
                    </div>
                    <div
                      style={{ fontFamily: "'Cormorant Garamond', serif" }}
                      className="text-3xl sm:text-4xl font-medium mt-1 leading-none"
                    >
                      {metric.value}
                    </div>
                    <div className="text-[11px] opacity-55 mt-2">{metric.note}</div>
                  </div>
                ))}
              </div>

              {/* 14-Day Activity Chart + Audience Split */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className={`lg:col-span-2 rounded-2xl border border-dashed p-5 ${cardSurface}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h2
                      style={{ fontFamily: "'Cormorant Garamond', serif" }}
                      className="text-xl font-medium"
                    >
                      14-Day Activity
                    </h2>
                    <div className="flex items-center gap-3 text-[11px] opacity-70">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#C88A70]" />
                        Visits
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#6E4434] dark:bg-[#E6B89C]" />
                        Sealed
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#7A9A82]" />
                        Unwraps
                      </span>
                    </div>
                  </div>

                  <div className="h-36 flex items-end gap-1.5 pt-2">
                    {realAnalytics.dailySeries.map((day) => {
                      const visitH = Math.round((day.visits / maxDailyTraffic) * 100);
                      const createH = Math.round((day.bouquetsSealed / maxDailyTraffic) * 100);
                      const openH = Math.round((day.recipientUnwraps / maxDailyTraffic) * 100);
                      const hasAny =
                        day.visits > 0 || day.bouquetsSealed > 0 || day.recipientUnwraps > 0;
                      return (
                        <div
                          key={day.date}
                          className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end"
                          title={`${day.date}: ${day.visits} visits · ${day.bouquetsSealed} sealed · ${day.recipientUnwraps} unwraps`}
                        >
                          <div className="w-full flex items-end justify-center gap-[2px] h-28">
                            {hasAny ? (
                              <>
                                <div
                                  style={{ height: `${Math.max(visitH, day.visits > 0 ? 8 : 2)}%` }}
                                  className="w-1.5 rounded-t-full bg-[#C88A70]/75 transition-all"
                                />
                                <div
                                  style={{
                                    height: `${Math.max(createH, day.bouquetsSealed > 0 ? 8 : 2)}%`,
                                  }}
                                  className="w-1.5 rounded-t-full bg-[#6E4434] dark:bg-[#E6B89C] transition-all"
                                />
                                <div
                                  style={{
                                    height: `${Math.max(openH, day.recipientUnwraps > 0 ? 8 : 2)}%`,
                                  }}
                                  className="w-1.5 rounded-t-full bg-[#7A9A82] transition-all"
                                />
                              </>
                            ) : (
                              <div className="w-full h-[2px] rounded-full bg-current opacity-10" />
                            )}
                          </div>
                          <span className="text-[10px] opacity-45 font-mono">
                            {day.date.slice(8)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Devices & Sources */}
                <div className={`rounded-2xl border border-dashed p-5 flex flex-col justify-between ${cardSurface}`}>
                  <div>
                    <h2
                      style={{ fontFamily: "'Cormorant Garamond', serif" }}
                      className="text-xl font-medium mb-3"
                    >
                      Devices & Sources
                    </h2>
                    <div className="grid grid-cols-3 gap-2 text-center mb-4">
                      {[
                        { label: 'Mobile', count: realAnalytics.devices.mobile },
                        { label: 'Desktop', count: realAnalytics.devices.desktop },
                        { label: 'Tablet', count: realAnalytics.devices.tablet },
                      ].map((d) => (
                        <div key={d.label} className={`rounded-xl border border-dashed p-2.5 ${subtleSurface}`}>
                          <div
                            style={{ fontFamily: "'Cormorant Garamond', serif" }}
                            className="text-xl font-medium leading-none"
                          >
                            {d.count}
                          </div>
                          <div className="text-[11px] opacity-60 mt-1">{d.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div
                      style={{ fontFamily: "'Cormorant Garamond', serif" }}
                      className="text-sm italic opacity-65"
                    >
                      Entry Channels
                    </div>
                    {topReferrers.length > 0 ? (
                      topReferrers.map(([ref, count]) => (
                        <div key={ref} className="flex items-center justify-between text-xs">
                          <span className="opacity-80 truncate">{formatLabel(ref)}</span>
                          <span className="font-mono opacity-65">{count}</span>
                        </div>
                      ))
                    ) : (
                      <div
                        style={{ fontFamily: "'Cormorant Garamond', serif" }}
                        className="text-sm italic opacity-45"
                      >
                        Recorded as visitors arrive
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              TAB 2: TESTER KEYS (1-Device Locked Expiring Vouchers)
          ================================================================ */}
          {activeTab === 'vouchers' && (
            <div className="space-y-5 animate-[fadeIn_180ms_ease-out]">
              <div className="flex items-baseline justify-between">
                <h1
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  className="text-2xl sm:text-3xl font-normal"
                >
                  Tester Keys
                </h1>
                <span
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  className="text-sm italic opacity-60"
                >
                  Bound to the first claiming device
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {/* Create Key Form */}
                <form
                  onSubmit={handleMintTesterVoucher}
                  className={`lg:col-span-5 rounded-2xl border border-dashed p-5 space-y-4 ${cardSurface}`}
                >
                  <h2
                    style={{ fontFamily: "'Cormorant Garamond', serif" }}
                    className="text-xl font-medium"
                  >
                    New Tester Invite
                  </h2>

                  <div>
                    <label className="block text-xs opacity-70 mb-1.5">Friend or Tester Name</label>
                    <input
                      data-testid="tester-voucher-label-input"
                      type="text"
                      value={voucherLabel}
                      onChange={(e) => setVoucherLabel(e.target.value)}
                      placeholder="e.g. Sophia"
                      maxLength={32}
                      className={`w-full px-3.5 py-2 rounded-xl border border-dashed text-xs focus:outline-none ${
                        isDarkMode
                          ? 'bg-[#2B2321]/90 border-[#5E4E49] focus:border-[#E6B89C]'
                          : 'bg-[#FAF4EE]/80 border-[#DECBB9] focus:border-[#6E4434]'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs opacity-70 mb-1.5">Duration</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { hours: 2, label: '2h' },
                        { hours: 24, label: '24h' },
                        { hours: 48, label: '48h' },
                        { hours: 168, label: '7d' },
                      ].map((opt) => (
                        <button
                          key={opt.hours}
                          type="button"
                          onClick={() => setVoucherDurationHours(opt.hours)}
                          className={`py-1.5 rounded-xl border border-dashed text-xs font-medium transition-all cursor-pointer ${
                            voucherDurationHours === opt.hours
                              ? isDarkMode
                                ? 'bg-[#E6B89C] text-[#231C18] border-transparent'
                                : 'bg-[#6E4434] text-[#FFFDF9] border-transparent'
                              : 'opacity-70 hover:opacity-100 border-current/20'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs opacity-70 mb-1.5">Daily Limit</label>
                      <div className="grid grid-cols-3 gap-1">
                        {[5, 10, 20].map((cap) => (
                          <button
                            key={cap}
                            type="button"
                            onClick={() => setVoucherDailyCap(cap)}
                            className={`py-1.5 rounded-xl border border-dashed text-xs font-medium transition-all cursor-pointer ${
                              voucherDailyCap === cap
                                ? isDarkMode
                                  ? 'bg-[#E6B89C] text-[#231C18] border-transparent'
                                  : 'bg-[#6E4434] text-[#FFFDF9] border-transparent'
                                : 'opacity-70 hover:opacity-100 border-current/20'
                            }`}
                          >
                            {cap}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs opacity-70 mb-1.5">Keepsake Storage</label>
                      <div className="grid grid-cols-2 gap-1">
                        {([30, 90] as const).map((days) => (
                          <button
                            key={days}
                            type="button"
                            onClick={() => setVoucherRetentionDays(days)}
                            className={`py-1.5 rounded-xl border border-dashed text-xs font-medium transition-all cursor-pointer ${
                              voucherRetentionDays === days
                                ? isDarkMode
                                  ? 'bg-[#E6B89C] text-[#231C18] border-transparent'
                                  : 'bg-[#6E4434] text-[#FFFDF9] border-transparent'
                                : 'opacity-70 hover:opacity-100 border-current/20'
                            }`}
                          >
                            {days}d
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    data-testid="mint-tester-voucher-btn"
                    type="submit"
                    disabled={isMintingVoucher}
                    className={`w-full py-2.5 rounded-full text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 ${
                      isDarkMode
                        ? 'bg-[#E6B89C] text-[#231C18] hover:bg-[#F0C8AE]'
                        : 'bg-[#6E4434] text-[#FFFDF9] hover:bg-[#593527]'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isMintingVoucher ? 'Creating...' : 'Create Tester Key'}</span>
                  </button>

                  {newlyMintedVoucher && (
                    <div
                      data-testid="newly-minted-voucher-card"
                      className={`rounded-xl border border-dashed p-3.5 space-y-2.5 ${subtleSurface}`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          style={{ fontFamily: "'Cormorant Garamond', serif" }}
                          className="text-base font-medium"
                        >
                          {newlyMintedVoucher.label}
                        </span>
                        <span className="font-mono text-xs opacity-80">
                          {newlyMintedVoucher.passKey}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          data-testid="copy-magic-link-btn"
                          type="button"
                          onClick={() =>
                            copyText(
                              buildTesterMagicInviteUrl(newlyMintedVoucher.passKey),
                              `magic-${newlyMintedVoucher.passKey}`,
                              'Invite link copied'
                            )
                          }
                          className={`py-2 px-3 rounded-full text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer ${
                            isDarkMode
                              ? 'bg-[#E6B89C] text-[#231C18]'
                              : 'bg-[#6E4434] text-[#FFFDF9]'
                          }`}
                        >
                          {copiedId === `magic-${newlyMintedVoucher.passKey}` ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Link2 className="w-3.5 h-3.5" />
                          )}
                          <span>Copy Link</span>
                        </button>
                        <button
                          data-testid="copy-voucher-key-btn"
                          type="button"
                          onClick={() =>
                            copyText(
                              newlyMintedVoucher.passKey,
                              `key-${newlyMintedVoucher.passKey}`,
                              'Key copied'
                            )
                          }
                          className={`py-2 px-3 rounded-full border border-dashed text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer ${
                            isDarkMode ? 'border-[#5E4E49]' : 'border-[#DECBB9]'
                          }`}
                        >
                          {copiedId === `key-${newlyMintedVoucher.passKey}` ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>Copy Key</span>
                        </button>
                      </div>
                    </div>
                  )}
                </form>

                {/* Issued Keys List */}
                <div className={`lg:col-span-7 rounded-2xl border border-dashed p-5 ${cardSurface}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h2
                      style={{ fontFamily: "'Cormorant Garamond', serif" }}
                      className="text-xl font-medium"
                    >
                      Issued Keys
                    </h2>
                    <span className="text-xs opacity-55">{testerVouchers.length} total</span>
                  </div>

                  {testerVouchers.length === 0 ? (
                    <div
                      style={{ fontFamily: "'Cormorant Garamond', serif" }}
                      className="py-12 text-center italic text-base opacity-55"
                    >
                      No tester keys issued yet.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                      {testerVouchers.map((v) => {
                        const isExpired =
                          v.status === 'expired' ||
                          new Date(v.expiresAt).getTime() <= Date.now();
                        const isRevoked = v.status === 'revoked';
                        const statusLabel = isRevoked
                          ? 'Revoked'
                          : isExpired
                          ? 'Expired'
                          : v.status === 'claimed'
                          ? 'Device Bound'
                          : 'Unclaimed';

                        return (
                          <div
                            key={v.passKey}
                            className={`rounded-xl border border-dashed p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${subtleSurface}`}
                          >
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                                  className="text-base font-medium"
                                >
                                  {v.label}
                                </span>
                                <span className="text-[11px] px-2 py-0.5 rounded-full border border-dashed border-current/25 opacity-75">
                                  {statusLabel}
                                </span>
                              </div>
                              <div className="text-xs opacity-65 flex items-center gap-2 flex-wrap">
                                <span className="font-mono">{v.passKey}</span>
                                <span>·</span>
                                <span>{v.durationHours}h</span>
                                <span>·</span>
                                <span>
                                  {v.bouquetsCreated}/{v.dailyCap} bouquets
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {!isRevoked && !isExpired && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      copyText(
                                        buildTesterMagicInviteUrl(v.passKey),
                                        `row-link-${v.passKey}`,
                                        'Invite link copied'
                                      )
                                    }
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 cursor-pointer ${
                                      isDarkMode
                                        ? 'bg-[#E6B89C] text-[#231C18]'
                                        : 'bg-[#6E4434] text-[#FFFDF9]'
                                    }`}
                                  >
                                    {copiedId === `row-link-${v.passKey}` ? (
                                      <Check className="w-3 h-3" />
                                    ) : (
                                      <Link2 className="w-3 h-3" />
                                    )}
                                    <span>Link</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRevokeVoucher(v.passKey)}
                                    title="Revoke key"
                                    className="p-1.5 rounded-full border border-dashed border-rose-500/35 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================
              TAB 3: BOTANICALS (Real Flower, Wrap, Ribbon & Scene Selections)
          ================================================================ */}
          {activeTab === 'botanicals' && (
            <div className="space-y-5 animate-[fadeIn_180ms_ease-out]">
              <div className="flex items-baseline justify-between">
                <h1
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  className="text-2xl sm:text-3xl font-normal"
                >
                  Botanicals & Styling
                </h1>
                <span
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  className="text-sm italic opacity-60"
                >
                  Real selections from sealed bouquets
                </span>
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
                    <div
                      key={group.title}
                      className={`rounded-2xl border border-dashed p-5 ${cardSurface}`}
                    >
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
                                  <span className="font-mono opacity-60">{count}</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-current/10 overflow-hidden">
                                  <div
                                    style={{ width: `${pct}%` }}
                                    className="h-full rounded-full bg-[#6E4434] dark:bg-[#E6B89C]"
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

          {/* ================================================================
              TAB 4: SECURITY & PASSPHRASE
          ================================================================ */}
          {activeTab === 'security_stream' && (
            <div className="space-y-5 animate-[fadeIn_180ms_ease-out]">
              <div className="flex items-baseline justify-between">
                <h1
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  className="text-2xl sm:text-3xl font-normal"
                >
                  Security & Passphrase
                </h1>
                <span
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  className="text-sm italic opacity-60"
                >
                  Gate protection & live event log
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
                {/* Passphrase & Protection Summary */}
                <div className={`lg:col-span-5 rounded-2xl border border-dashed p-5 space-y-4 ${cardSurface}`}>
                  <h2
                    style={{ fontFamily: "'Cormorant Garamond', serif" }}
                    className="text-xl font-medium"
                  >
                    Gate Passphrase
                  </h2>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className={`rounded-xl border border-dashed p-3 ${subtleSurface}`}>
                      <div
                        style={{ fontFamily: "'Cormorant Garamond', serif" }}
                        className="text-2xl font-medium leading-none"
                      >
                        {realAnalytics.blockedShareAttempts}
                      </div>
                      <div className="text-[11px] opacity-60 mt-1">Blocked Forwards</div>
                    </div>
                    <div className={`rounded-xl border border-dashed p-3 ${subtleSurface}`}>
                      <div
                        style={{ fontFamily: "'Cormorant Garamond', serif" }}
                        className="text-2xl font-medium leading-none"
                      >
                        {realAnalytics.blockedPinAttempts}
                      </div>
                      <div className="text-[11px] opacity-60 mt-1">Blocked PIN Tries</div>
                    </div>
                  </div>

                  <form onSubmit={handleUpdateOwnerPin} className="space-y-2.5 pt-1">
                    <label className="block text-xs opacity-70">
                      Update Passphrase (or set <span className="font-mono">OWNER_ADMIN_PIN</span> in Vercel)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="password"
                        value={newOwnerPin}
                        onChange={(e) => setNewOwnerPin(e.target.value)}
                        placeholder="New passphrase..."
                        minLength={4}
                        maxLength={32}
                        className={`flex-1 px-3.5 py-2 rounded-full border border-dashed text-xs focus:outline-none ${
                          isDarkMode
                            ? 'bg-[#2B2321]/90 border-[#5E4E49] focus:border-[#E6B89C]'
                            : 'bg-[#FAF4EE]/80 border-[#DECBB9] focus:border-[#6E4434]'
                        }`}
                      />
                      <button
                        type="submit"
                        disabled={isUpdatingPin || newOwnerPin.trim().length < 4}
                        className={`px-4 py-2 rounded-full text-xs font-medium cursor-pointer disabled:opacity-45 flex items-center gap-1.5 ${
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

                {/* Live Activity Log */}
                <div className={`lg:col-span-7 rounded-2xl border border-dashed p-5 ${cardSurface}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h2
                      style={{ fontFamily: "'Cormorant Garamond', serif" }}
                      className="text-xl font-medium"
                    >
                      Recent Activity
                    </h2>
                    <span className="text-xs opacity-55">
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
                    <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                      {realAnalytics.recentEvents.slice(0, 20).map((ev) => (
                        <div
                          key={ev.id}
                          className={`rounded-xl border border-dashed p-3 flex items-center justify-between gap-3 text-xs ${subtleSurface}`}
                        >
                          <span className="truncate opacity-85">{ev.summary}</span>
                          <span className="text-[11px] font-mono opacity-50 shrink-0">
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
        className={`md:hidden fixed bottom-0 inset-x-0 h-14 border-t border-dashed grid grid-cols-4 z-20 backdrop-blur-md ${
          isDarkMode ? 'bg-[#352C29]/95 border-[#5E4E49]' : 'bg-[#FFFDF9]/95 border-[#DECBB9]'
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
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
