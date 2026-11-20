import React, { useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Lock,
  Mic,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  X,
  AlertTriangle,
} from 'lucide-react';
import {
  AdminBouquetFilterStatus,
  AdminBouquetLogEntry,
  classifyAdminBouquetStatus,
  countAdminBouquetStatuses,
  extractShortCodeFromInput,
  filterAdminBouquetLog,
  formatBytesCompact,
} from '../lib/bouquetPersistence';

interface OwnerBouquetsSectionProps {
  adminSessionToken: string;
  deviceTokenHash: string;
  isDarkMode: boolean;
  bouquetLog: AdminBouquetLogEntry[];
  copiedId: string | null;
  formatLabel: (raw: string) => string;
  onCopyText: (text: string, id: string, toastLabel: string) => void;
  onSyncBouquetLog: (nextLog: AdminBouquetLogEntry[], nextAnalytics?: unknown) => void;
  onToast: (msg: string) => void;
}

interface LiveVerificationBanner {
  code: string;
  existsInFirestore: boolean;
  eternalLinkActive: boolean;
  inGarlandFeed: boolean;
  assetCount: number;
  missingAssetIds: string[];
  message: string;
}

const FILTER_TABS: Array<{ id: AdminBouquetFilterStatus; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'garland', label: 'On Garland' },
  { id: 'private', label: 'Private Only' },
  { id: 'expired_garland', label: 'Expired · Link Live' },
  { id: 'with_voice', label: 'Voice' },
  { id: 'with_photos', label: 'Photos' },
];

export const OwnerBouquetsSection: React.FC<OwnerBouquetsSectionProps> = ({
  adminSessionToken,
  deviceTokenHash,
  isDarkMode,
  bouquetLog,
  copiedId,
  formatLabel,
  onCopyText,
  onSyncBouquetLog,
  onToast,
}) => {
  const [filterStatus, setFilterStatus] = useState<AdminBouquetFilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [confirmDeleteCode, setConfirmDeleteCode] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const [isRefreshingLog, setIsRefreshingLog] = useState(false);
  const [busyCodes, setBusyCodes] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const [verifyInput, setVerifyInput] = useState('');
  const [isVerifyingLookup, setIsVerifyingLookup] = useState(false);
  const [verificationBanner, setVerificationBanner] = useState<LiveVerificationBanner | null>(null);

  const nowMs = Date.now();
  const statusCounts = useMemo(
    () => countAdminBouquetStatuses(bouquetLog, nowMs),
    [bouquetLog, nowMs]
  );
  const filteredEntries = useMemo(
    () =>
      filterAdminBouquetLog(
        bouquetLog,
        { status: filterStatus, search: searchQuery },
        nowMs
      ),
    [bouquetLog, filterStatus, searchQuery, nowMs]
  );

  const panelClass = isDarkMode
    ? 'bg-[#352C29] border-[#5E4E49]/80'
    : 'bg-[#FFFDF9] border-[#DECBB9]';
  const hairlineBorder = isDarkMode ? 'border-[#5E4E49]/70' : 'border-[#DECBB9]/85';
  const hairlineDivide = isDarkMode ? 'divide-[#5E4E49]/70' : 'divide-[#DECBB9]/85';
  const gridHairlineBg = isDarkMode ? 'bg-[#5E4E49]/65' : 'bg-[#DECBB9]/85';
  const cellBgClass = isDarkMode ? 'bg-[#352C29]' : 'bg-[#FFFDF9]';
  const inputClass = isDarkMode
    ? 'bg-[#2B2321] border-[#5E4E49] text-[#F5EBE6] placeholder:text-[#9A877B] focus:border-[#E6B89C]'
    : 'bg-[#FAF4EE] border-[#DECBB9] text-[#2C2523] placeholder:text-[#9A877B] focus:border-[#6E4434]';
  const primaryBtnClass = isDarkMode
    ? 'bg-[#E6B89C] text-[#231C18] hover:bg-[#F0C8AE]'
    : 'bg-[#6E4434] text-[#FFFDF9] hover:bg-[#593527]';

  const markCodeBusy = (code: string, busy: boolean) => {
    setBusyCodes((prev) => {
      const next = new Set(prev);
      if (busy) next.add(code);
      else next.delete(code);
      return next;
    });
  };

  const resolveShareHref = (entry: AdminBouquetLogEntry) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    if (entry.shareUrl && /^https?:\/\//i.test(entry.shareUrl)) {
      return entry.shareUrl;
    }
    return origin ? `${origin}/${entry.code}` : `/${entry.code}`;
  };

  const handleRefreshLog = async () => {
    if (!adminSessionToken) return;
    setIsRefreshingLog(true);
    try {
      const res = await fetch('/api/payments/verify-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'fetch_owner_bouquet_log',
          adminSessionToken,
          deviceTokenHash,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok && Array.isArray(data.bouquetLog)) {
        onSyncBouquetLog(data.bouquetLog);
        onToast(`Synced ${data.bouquetLog.length} logged bouquet${data.bouquetLog.length === 1 ? '' : 's'}.`);
      } else {
        onToast(data.message || 'Could not refresh bouquet log.');
      }
    } catch {
      onToast('Network error refreshing bouquet log.');
    } finally {
      setIsRefreshingLog(false);
    }
  };

  const handleVerifyCode = async (rawCode: string, fromLookupBar = false) => {
    if (!adminSessionToken) return;
    const cleanCode = extractShortCodeFromInput(rawCode) || rawCode.trim();
    if (!cleanCode) {
      onToast('Enter a bouquet short code or full link to verify.');
      return;
    }

    if (fromLookupBar) setIsVerifyingLookup(true);
    else markCodeBusy(cleanCode, true);

    try {
      const res = await fetch('/api/payments/verify-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_owner_bouquet',
          adminSessionToken,
          deviceTokenHash,
          code: cleanCode,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok && data.verification) {
        if (Array.isArray(data.bouquetLog)) {
          onSyncBouquetLog(data.bouquetLog);
        }
        setVerificationBanner({
          code: data.verification.code,
          existsInFirestore: Boolean(data.verification.existsInFirestore),
          eternalLinkActive: Boolean(data.verification.eternalLinkActive),
          inGarlandFeed: Boolean(data.verification.inGarlandFeed),
          assetCount: Number(data.verification.assetCount || 0),
          missingAssetIds: Array.isArray(data.verification.missingAssetIds)
            ? data.verification.missingAssetIds
            : [],
          message: String(data.verification.message || ''),
        });
        if (fromLookupBar) setVerifyInput('');
        onToast(
          data.verification.existsInFirestore
            ? `Verified /${data.verification.code} live in Firestore.`
            : `No Firestore record found for /${data.verification.code}.`
        );
      } else {
        onToast(data.message || 'Could not verify bouquet.');
      }
    } catch {
      onToast('Network error verifying bouquet.');
    } finally {
      if (fromLookupBar) setIsVerifyingLookup(false);
      else markCodeBusy(cleanCode, false);
    }
  };

  const handleToggleGarland = async (entry: AdminBouquetLogEntry) => {
    if (!adminSessionToken) return;
    const nextPinned = !entry.pinnedToGarland;
    markCodeBusy(entry.code, true);
    try {
      const res = await fetch('/api/payments/verify-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_owner_bouquet_garland',
          adminSessionToken,
          deviceTokenHash,
          code: entry.code,
          pinned: nextPinned,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        if (Array.isArray(data.bouquetLog)) {
          onSyncBouquetLog(data.bouquetLog);
        }
        onToast(
          nextPinned
            ? `Pinned /${entry.code} to Shared Creations.`
            : `Unpinned /${entry.code} from Garland (eternal link still live).`
        );
      } else {
        onToast(data.message || 'Could not update Garland visibility.');
      }
    } catch {
      onToast('Network error updating Garland visibility.');
    } finally {
      markCodeBusy(entry.code, false);
    }
  };

  const handleDeleteCodes = async (codes: string[], isBulk = false) => {
    if (!adminSessionToken || codes.length === 0) return;
    if (isBulk) setIsBulkDeleting(true);
    else codes.forEach((c) => markCodeBusy(c, true));

    try {
      const res = await fetch('/api/payments/verify-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_owner_bouquets',
          adminSessionToken,
          deviceTokenHash,
          codes,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        if (Array.isArray(data.bouquetLog)) {
          onSyncBouquetLog(data.bouquetLog, data.analytics);
        }
        setSelectedCodes((prev) => {
          const next = new Set(prev);
          codes.forEach((c) => next.delete(c));
          return next;
        });
        setConfirmDeleteCode(null);
        setConfirmBulkDelete(false);
        const count = Array.isArray(data.deletedCodes) ? data.deletedCodes.length : codes.length;
        onToast(
          `Permanently deleted ${count} bouquet${count === 1 ? '' : 's'} from Firestore & Garland.`
        );
      } else {
        onToast(data.message || 'Could not delete bouquet(s).');
      }
    } catch {
      onToast('Network error deleting bouquet(s).');
    } finally {
      if (isBulk) setIsBulkDeleting(false);
      else codes.forEach((c) => markCodeBusy(c, false));
    }
  };

  const toggleSelectCode = (code: string) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const allVisibleSelected =
    filteredEntries.length > 0 && filteredEntries.every((e) => selectedCodes.has(e.code));

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedCodes((prev) => {
        const next = new Set(prev);
        filteredEntries.forEach((e) => next.delete(e.code));
        return next;
      });
    } else {
      setSelectedCodes((prev) => {
        const next = new Set(prev);
        filteredEntries.forEach((e) => next.add(e.code));
        return next;
      });
    }
  };

  const formatDateShort = (iso?: string) => {
    if (!iso) return '—';
    const parsed = Date.parse(iso);
    if (!Number.isFinite(parsed)) return '—';
    return new Date(parsed).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div
      data-testid="owner-bouquets-section"
      className="space-y-5 animate-[fadeIn_180ms_ease-out]"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
            className="text-2xl sm:text-3xl font-normal"
          >
            Bouquet Archive &amp; Log
          </h1>
          <p className="text-xs opacity-65 mt-0.5">
            Every shared bouquet — Garland &amp; private — logged persistently with eternal links.
          </p>
        </div>
        <button
          type="button"
          data-testid="owner-bouquets-refresh-btn"
          onClick={handleRefreshLog}
          disabled={isRefreshingLog}
          className={`self-start sm:self-auto px-3 py-1.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 shrink-0 ${hairlineBorder} hover:bg-current/5`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingLog ? 'animate-spin' : ''}`} />
          <span>Sync Archive</span>
        </button>
      </div>

      {/* KPI Strip */}
      <div className={`border ${hairlineBorder} rounded-xl overflow-hidden`}>
        <div className={`grid grid-cols-2 xl:grid-cols-4 gap-px ${gridHairlineBg}`}>
          <div className={`p-4 ${cellBgClass}`}>
            <div
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
              className="text-2xl sm:text-3xl font-medium leading-none tabular-nums"
            >
              {statusCounts.all}
            </div>
            <div className="text-[11px] opacity-60 mt-1.5">Total Logged</div>
          </div>
          <div className={`p-4 ${cellBgClass}`}>
            <div
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
              className="text-2xl sm:text-3xl font-medium leading-none tabular-nums"
            >
              {statusCounts.garland}
            </div>
            <div className="text-[11px] opacity-60 mt-1.5">Live on Garland</div>
          </div>
          <div className={`p-4 ${cellBgClass}`}>
            <div
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
              className="text-2xl sm:text-3xl font-medium leading-none tabular-nums"
            >
              {statusCounts.private}
            </div>
            <div className="text-[11px] opacity-60 mt-1.5">Private · Not on Garland</div>
          </div>
          <div className={`p-4 ${cellBgClass}`}>
            <div
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
              className="text-2xl sm:text-3xl font-medium leading-none tabular-nums"
            >
              {statusCounts.expired_garland}
            </div>
            <div className="text-[11px] opacity-60 mt-1.5">Garland Expired · Link Live</div>
          </div>
        </div>
      </div>

      {/* Live Persistence Verifier & Legacy Code Importer */}
      <div className={`rounded-xl border p-4 sm:p-5 space-y-3 ${panelClass}`}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h2
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
              className="text-lg sm:text-xl font-medium"
            >
              Verify Eternal Persistence or Import Code
            </h2>
            <p className="text-xs opacity-60">
              Paste any bouquet short code or full URL to inspect its live Firestore record, photos, and voice assets.
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleVerifyCode(verifyInput, true);
          }}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
        >
          <input
            type="text"
            data-testid="owner-bouquet-verify-input"
            value={verifyInput}
            onChange={(e) => setVerifyInput(e.target.value)}
            placeholder="Paste bouquet code (e.g. Vu18KSuusq9133s) or full share URL..."
            aria-label="Bouquet code or URL to verify"
            className={`flex-1 min-w-0 px-3.5 py-2 rounded-lg border text-xs focus:outline-none ${inputClass}`}
          />
          <button
            type="submit"
            data-testid="owner-bouquet-verify-btn"
            disabled={isVerifyingLookup || !verifyInput.trim()}
            className={`px-4 py-2 rounded-lg text-xs font-medium inline-flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-45 shrink-0 ${primaryBtnClass}`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isVerifyingLookup ? 'Checking...' : 'Verify Live'}</span>
          </button>
        </form>

        {verificationBanner && (
          <div
            data-testid="owner-bouquet-verify-result"
            className={`rounded-lg border px-3.5 py-2.5 flex items-start justify-between gap-3 text-xs ${
              verificationBanner.existsInFirestore && verificationBanner.eternalLinkActive
                ? isDarkMode
                  ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-200'
                  : 'border-emerald-300 bg-emerald-50 text-emerald-900'
                : isDarkMode
                ? 'border-amber-500/40 bg-amber-950/30 text-amber-200'
                : 'border-amber-300 bg-amber-50 text-amber-900'
            }`}
          >
            <div className="flex items-start gap-2 min-w-0">
              {verificationBanner.existsInFirestore && verificationBanner.eternalLinkActive ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5 min-w-0">
                <div className="font-medium">
                  /{verificationBanner.code} —{' '}
                  {verificationBanner.existsInFirestore
                    ? verificationBanner.eternalLinkActive
                      ? 'Eternal Link Active'
                      : 'Incomplete Companion Assets'
                    : 'Not Found in Firestore'}
                </div>
                <div className="opacity-85">
                  {verificationBanner.message}
                  {verificationBanner.existsInFirestore && (
                    <span>
                      {' '}
                      · Garland: {verificationBanner.inGarlandFeed ? 'Pinned' : 'Not pinned'}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setVerificationBanner(null)}
              aria-label="Dismiss verification result"
              className="p-0.5 opacity-60 hover:opacity-100 cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Filter Tabs, Search & Bulk Delete Toolbar */}
      <div className={`rounded-xl border overflow-hidden ${panelClass}`}>
        <div className={`p-4 border-b space-y-3 ${hairlineBorder}`}>
          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {FILTER_TABS.map((tab) => {
              const active = filterStatus === tab.id;
              const count = statusCounts[tab.id];
              return (
                <button
                  key={tab.id}
                  type="button"
                  data-testid={`owner-bouquet-filter-${tab.id}`}
                  onClick={() => setFilterStatus(tab.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer ${
                    active
                      ? isDarkMode
                        ? 'bg-[#E6B89C] text-[#231C18]'
                        : 'bg-[#6E4434] text-[#FFFDF9]'
                      : isDarkMode
                      ? 'bg-[#2B2321] text-[#D7C7BE] hover:bg-[#3F3430]'
                      : 'bg-[#FAF4EE] text-[#5C4438] hover:bg-[#F2E6DA]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className="font-mono text-[11px] tabular-nums opacity-75">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Search & Bulk Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="relative flex-1 min-w-0">
              <Search className="w-3.5 h-3.5 opacity-50 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                data-testid="owner-bouquet-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by code, recipient, sender, note, wrap..."
                aria-label="Search logged bouquets"
                className={`w-full pl-8 pr-8 py-2 rounded-lg border text-xs focus:outline-none ${inputClass}`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-55 hover:opacity-100 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {filteredEntries.length > 0 && (
                <button
                  type="button"
                  data-testid="owner-bouquets-select-all-btn"
                  onClick={toggleSelectAllVisible}
                  className={`px-3 py-2 rounded-lg border text-xs font-medium transition cursor-pointer ${hairlineBorder} hover:bg-current/5`}
                >
                  {allVisibleSelected ? 'Deselect Visible' : 'Select Visible'}
                </button>
              )}

              {selectedCodes.size > 0 && !confirmBulkDelete && (
                <button
                  type="button"
                  data-testid="owner-bouquets-bulk-delete-btn"
                  onClick={() => setConfirmBulkDelete(true)}
                  className="px-3 py-2 rounded-lg bg-rose-700 text-white hover:bg-rose-800 text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Selected ({selectedCodes.size})</span>
                </button>
              )}

              {selectedCodes.size > 0 && confirmBulkDelete && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    data-testid="owner-bouquets-bulk-delete-confirm-btn"
                    disabled={isBulkDeleting}
                    onClick={() => handleDeleteCodes(Array.from(selectedCodes), true)}
                    className="px-3 py-2 rounded-lg bg-rose-700 text-white hover:bg-rose-800 text-xs font-medium transition cursor-pointer disabled:opacity-50"
                  >
                    {isBulkDeleting
                      ? 'Deleting...'
                      : `Confirm Delete (${selectedCodes.size})`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmBulkDelete(false)}
                    className={`px-2.5 py-2 rounded-lg border text-xs cursor-pointer ${hairlineBorder}`}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bouquet Archive List */}
        {filteredEntries.length === 0 ? (
          <div className="py-12 px-6 text-center space-y-1.5">
            <p
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
              className="text-xl italic opacity-65"
            >
              {bouquetLog.length === 0
                ? 'No bouquets logged yet'
                : 'No bouquets match this filter'}
            </p>
            <p className="text-xs opacity-50 max-w-md mx-auto">
              {bouquetLog.length === 0
                ? 'Every newly shared bouquet (whether pinned to Shared Creations or kept private) will be logged here automatically. You can also verify any older code above to import it.'
                : 'Try switching filter tabs or clearing your search query.'}
            </p>
          </div>
        ) : (
          <div className={`divide-y ${hairlineDivide}`}>
            {filteredEntries.map((entry) => {
              const displayClass = classifyAdminBouquetStatus(entry, nowMs);
              const isBusy = busyCodes.has(entry.code);
              const isSelected = selectedCodes.has(entry.code);
              const isCopied = copiedId === `bq-${entry.code}`;
              const isConfirmingDelete = confirmDeleteCode === entry.code;
              const openHref = resolveShareHref(entry);

              const statusText =
                displayClass === 'garland_live'
                  ? entry.isPremium
                    ? 'On Garland · Eternal'
                    : `On Garland · ${entry.retentionDays}d`
                  : displayClass === 'garland_expired'
                  ? 'Garland Expired · Link Live'
                  : 'Private · Link Live';

              const statusDotClass =
                displayClass === 'garland_live'
                  ? 'bg-emerald-500'
                  : displayClass === 'garland_expired'
                  ? 'bg-amber-500'
                  : 'bg-[#B4846C]';

              const assetSummaryParts: string[] = [];
              if (entry.flowerCount > 0) {
                assetSummaryParts.push(
                  `${entry.flowerCount} ${entry.flowerCount === 1 ? 'stem' : 'stems'}`
                );
              }
              if (entry.wrapStyle) assetSummaryParts.push(formatLabel(entry.wrapStyle));
              if (entry.ribbonStyle) assetSummaryParts.push(formatLabel(entry.ribbonStyle));
              if (entry.environment && entry.environment !== 'studio') {
                assetSummaryParts.push(formatLabel(entry.environment));
              }
              if (entry.payloadBytes > 0) {
                assetSummaryParts.push(formatBytesCompact(entry.payloadBytes + (entry.voiceBytes || 0)));
              }
              if (entry.assetIds && entry.assetIds.length > 0) {
                assetSummaryParts.push(`${entry.assetIds.length} overflow asset${entry.assetIds.length === 1 ? '' : 's'}`);
              }

              return (
                <div
                  key={entry.code}
                  data-testid={`owner-bouquet-row-${entry.code}`}
                  className={`p-4 transition-colors ${
                    isSelected
                      ? isDarkMode
                        ? 'bg-[#3F3430]/70'
                        : 'bg-[#FAF4EE]/85'
                      : 'hover:bg-current/[0.02]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Selection Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectCode(entry.code)}
                      aria-label={`Select bouquet ${entry.code}`}
                      className="mt-1 h-4 w-4 rounded accent-[#6E4434] cursor-pointer shrink-0"
                    />

                    {/* Main Details */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div className="flex items-baseline gap-2 flex-wrap min-w-0">
                          <span
                            style={{ fontFamily: "'Cormorant Garamond', serif" }}
                            className="text-lg font-medium leading-snug break-words"
                          >
                            For {entry.to || 'Someone Special'}
                          </span>
                          <span className="text-xs opacity-60 break-words">
                            from {entry.from || 'Yours'}
                          </span>
                          <code
                            className={`text-[11px] font-mono px-1.5 py-0.5 rounded break-all ${
                              isDarkMode ? 'bg-[#2B2321] text-[#E6B89C]' : 'bg-[#FAF4EE] text-[#6E4434]'
                            }`}
                          >
                            /{entry.code}
                          </code>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] opacity-65 shrink-0">
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            <span className={`w-1.5 h-1.5 rounded-full ${statusDotClass}`} />
                            <span>{statusText}</span>
                          </span>
                          <span>·</span>
                          <span className="tabular-nums">{formatDateShort(entry.createdAt)}</span>
                        </div>
                      </div>

                      {entry.noteExcerpt && (
                        <p
                          style={{ fontFamily: "'Cormorant Garamond', serif" }}
                          className="text-sm italic opacity-75 line-clamp-1"
                        >
                          &ldquo;{entry.noteExcerpt}&rdquo;
                        </p>
                      )}

                      {/* Compact Asset & Persistence Metadata Row */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] opacity-70">
                        {assetSummaryParts.length > 0 && (
                          <span>{assetSummaryParts.join(' · ')}</span>
                        )}
                        {entry.photoCount > 0 && (
                          <span className="inline-flex items-center gap-1 font-medium">
                            <ImageIcon className="w-3 h-3" />
                            <span>
                              {entry.photoCount} photo{entry.photoCount === 1 ? '' : 's'}
                            </span>
                          </span>
                        )}
                        {entry.hasVoice && (
                          <span className="inline-flex items-center gap-1 font-medium">
                            <Mic className="w-3 h-3" />
                            <span>Voice{entry.voiceStyle ? ` (${formatLabel(entry.voiceStyle)})` : ''}</span>
                          </span>
                        )}
                        {entry.lockMode !== 'none' && (
                          <span className="inline-flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            <span>{formatLabel(entry.lockMode)}</span>
                          </span>
                        )}
                        {entry.existsInFirestore === true && (
                          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-medium">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>
                              Firestore Live
                              {typeof entry.openCount === 'number' && entry.openCount > 0
                                ? ` · ${entry.openCount} ${entry.openCount === 1 ? 'open' : 'opens'}`
                                : ''}
                            </span>
                          </span>
                        )}
                        {entry.existsInFirestore === false && (
                          <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-300 font-medium">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Missing in Firestore</span>
                          </span>
                        )}
                      </div>

                      {/* Action Row */}
                      <div className="pt-1.5 flex flex-wrap items-center gap-1.5">
                        <a
                          href={openHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`px-2.5 py-1 rounded-md border text-[11px] font-medium inline-flex items-center gap-1 transition ${hairlineBorder} hover:bg-current/5`}
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Open</span>
                        </a>

                        <button
                          type="button"
                          onClick={() =>
                            onCopyText(openHref, `bq-${entry.code}`, `Copied /${entry.code}`)
                          }
                          className={`px-2.5 py-1 rounded-md border text-[11px] font-medium inline-flex items-center gap-1 transition cursor-pointer ${hairlineBorder} hover:bg-current/5`}
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-300" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy Link</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          data-testid={`owner-bouquet-verify-${entry.code}`}
                          disabled={isBusy}
                          onClick={() => handleVerifyCode(entry.code, false)}
                          className={`px-2.5 py-1 rounded-md border text-[11px] font-medium inline-flex items-center gap-1 transition cursor-pointer disabled:opacity-45 ${hairlineBorder} hover:bg-current/5`}
                        >
                          <ShieldCheck className="w-3 h-3" />
                          <span>Verify</span>
                        </button>

                        <button
                          type="button"
                          data-testid={`owner-bouquet-toggle-garland-${entry.code}`}
                          disabled={isBusy}
                          onClick={() => handleToggleGarland(entry)}
                          className={`px-2.5 py-1 rounded-md border text-[11px] font-medium inline-flex items-center gap-1 transition cursor-pointer disabled:opacity-45 ${hairlineBorder} hover:bg-current/5`}
                        >
                          {entry.pinnedToGarland ? (
                            <>
                              <EyeOff className="w-3 h-3" />
                              <span>Unpin Garland</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-3 h-3" />
                              <span>Pin to Garland</span>
                            </>
                          )}
                        </button>

                        {!isConfirmingDelete ? (
                          <button
                            type="button"
                            data-testid={`owner-bouquet-delete-${entry.code}`}
                            disabled={isBusy}
                            onClick={() => setConfirmDeleteCode(entry.code)}
                            className="px-2.5 py-1 rounded-md border border-rose-500/40 text-rose-700 dark:text-rose-300 hover:bg-rose-500/10 text-[11px] font-medium inline-flex items-center gap-1 transition cursor-pointer disabled:opacity-45"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              data-testid={`owner-bouquet-delete-confirm-${entry.code}`}
                              disabled={isBusy}
                              onClick={() => handleDeleteCodes([entry.code], false)}
                              className="px-2.5 py-1 rounded-md bg-rose-700 text-white hover:bg-rose-800 text-[11px] font-medium transition cursor-pointer disabled:opacity-45"
                            >
                              {isBusy ? 'Deleting...' : 'Confirm Delete'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteCode(null)}
                              className={`px-2 py-1 rounded-md border text-[11px] cursor-pointer ${hairlineBorder}`}
                            >
                              Cancel
                            </button>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
