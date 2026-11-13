import React, { useState } from 'react';
import { Sparkles, Copy, Check, Link2, Trash2, KeyRound } from 'lucide-react';
import {
  PaidPassChannel,
  PaidPassLedgerItem,
  TesterVoucherLedgerItem,
  buildPaidPassClaimUrl,
  buildTesterMagicInviteUrl,
} from '../lib/ownerAnalytics';
import { PricingRegion, StudioPassTier } from '../lib/monetization';

interface OwnerKeysSectionProps {
  adminSessionToken: string;
  deviceTokenHash: string;
  isDarkMode: boolean;
  paidPasses: PaidPassLedgerItem[];
  testerVouchers: TesterVoucherLedgerItem[];
  copiedId: string | null;
  onCopyText: (text: string, id: string, toastLabel: string) => void;
  onSyncResponse: (data: {
    analytics?: unknown;
    testerVouchers?: TesterVoucherLedgerItem[];
    paidPasses?: PaidPassLedgerItem[];
  }) => void;
  onToast: (msg: string) => void;
  incomePausedForTesting?: boolean;
  isClearingKeys?: boolean;
  onClearTestAndRevoked?: () => void;
}

const PAID_TIER_OPTIONS: Array<{
  tier: StudioPassTier;
  label: string;
  phPrice: string;
  intlPrice: string;
  detail: string;
}> = [
  {
    tier: 'single',
    label: 'Single Bouquet',
    phPrice: '₱49',
    intlPrice: '$2.99',
    detail: '1 arrangement · 90d',
  },
  {
    tier: 'pass_7d',
    label: '7-Day Pass',
    phPrice: '₱99',
    intlPrice: '$4.99',
    detail: 'Unlimited 7d · 90d',
  },
  {
    tier: 'pass_30d',
    label: '30-Day Eternal',
    phPrice: '₱199',
    intlPrice: '$8.99',
    detail: 'Unlimited 30d · Never expires',
  },
];

const CHANNEL_OPTIONS: Array<{ id: PaidPassChannel; label: string }> = [
  { id: 'manual_gcash', label: 'GCash Manual' },
  { id: 'manual_maya', label: 'Maya Manual' },
  { id: 'manual_bank', label: 'Bank Transfer' },
  { id: 'kofi', label: 'Ko-fi Direct' },
  { id: 'other', label: 'Other' },
];

const CHANNEL_LABELS: Record<string, string> = {
  manual_gcash: 'GCash Manual',
  manual_maya: 'Maya Manual',
  manual_bank: 'Bank Transfer',
  kofi: 'Ko-fi Direct',
  sikatpay: 'SikatPay',
  sikatpay_test: 'SikatPay Test',
  bayadgate: 'BayadGate',
  paymongo: 'PayMongo',
  other: 'Other',
};

export const OwnerKeysSection: React.FC<OwnerKeysSectionProps> = ({
  adminSessionToken,
  deviceTokenHash,
  isDarkMode,
  paidPasses,
  testerVouchers,
  copiedId,
  onCopyText,
  onSyncResponse,
  onToast,
  incomePausedForTesting = false,
  isClearingKeys = false,
  onClearTestAndRevoked,
}) => {
  const [keyMode, setKeyMode] = useState<'paid' | 'tester'>('paid');

  // Paid Key Generator form state
  const [paidTier, setPaidTier] = useState<StudioPassTier>('pass_7d');
  const [paidRegion, setPaidRegion] = useState<PricingRegion>('PH');
  const [paidChannel, setPaidChannel] = useState<PaidPassChannel>('manual_gcash');
  const [paidLabel, setPaidLabel] = useState('');
  const [isMintingPaid, setIsMintingPaid] = useState(false);
  const [newlyMintedPaid, setNewlyMintedPaid] = useState<PaidPassLedgerItem | null>(null);

  // Tester Voucher Generator form state
  const [voucherLabel, setVoucherLabel] = useState('');
  const [voucherDurationHours, setVoucherDurationHours] = useState<number>(48);
  const [voucherDailyCap, setVoucherDailyCap] = useState<number>(10);
  const [voucherRetentionDays, setVoucherRetentionDays] = useState<30 | 90>(30);
  const [isMintingVoucher, setIsMintingVoucher] = useState(false);
  const [newlyMintedVoucher, setNewlyMintedVoucher] = useState<TesterVoucherLedgerItem | null>(
    null
  );

  const panelClass = isDarkMode
    ? 'bg-[#352C29] border-[#5E4E49]/80'
    : 'bg-[#FFFDF9] border-[#DECBB9]';
  const hairlineBorder = isDarkMode ? 'border-[#5E4E49]/70' : 'border-[#DECBB9]/85';
  const hairlineDivide = isDarkMode ? 'divide-[#5E4E49]/70' : 'divide-[#DECBB9]/85';
  const inputClass = isDarkMode
    ? 'bg-[#2B2321] border-[#5E4E49] text-[#F5EBE6] placeholder:text-[#9A877B] focus:border-[#E6B89C]'
    : 'bg-[#FAF4EE] border-[#DECBB9] text-[#2C2523] placeholder:text-[#9A877B] focus:border-[#6E4434]';
  const primaryBtnClass = isDarkMode
    ? 'bg-[#E6B89C] text-[#231C18] hover:bg-[#F0C8AE]'
    : 'bg-[#6E4434] text-[#FFFDF9] hover:bg-[#593527]';

  const handleMintPaidPass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminSessionToken) return;
    setIsMintingPaid(true);
    try {
      const res = await fetch('/api/payments/verify-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mint_paid_pass',
          adminSessionToken,
          deviceTokenHash,
          tier: paidTier,
          region: paidRegion,
          channel: paidChannel,
          label: paidLabel.trim() || 'Direct Buyer',
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setNewlyMintedPaid(data.paidPass);
        onSyncResponse({
          analytics: data.analytics,
          testerVouchers: data.testerVouchers,
          paidPasses: data.paidPasses,
        });
        setPaidLabel('');
        onToast(`Issued ${data.paidPass?.passKey || 'Paid Key'}`);
      } else {
        onToast(data.message || 'Could not generate paid key.');
      }
    } catch {
      onToast('Network error generating paid key.');
    } finally {
      setIsMintingPaid(false);
    }
  };

  const handleRevokePaidPass = async (passKey: string) => {
    if (!adminSessionToken) return;
    try {
      const res = await fetch('/api/payments/verify-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'revoke_paid_pass',
          adminSessionToken,
          deviceTokenHash,
          passKey,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        onSyncResponse({
          analytics: data.analytics,
          testerVouchers: data.testerVouchers,
          paidPasses: data.paidPasses,
        });
        if (newlyMintedPaid?.passKey === passKey) {
          setNewlyMintedPaid(null);
        }
        onToast(`Revoked ${passKey}`);
      } else {
        onToast(data.message || 'Could not revoke paid key.');
      }
    } catch {
      onToast('Could not revoke paid key.');
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
        onSyncResponse({
          analytics: data.analytics,
          testerVouchers: data.testerVouchers,
        });
        setVoucherLabel('');
        onToast(`Created tester key for ${data.voucher.label}`);
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
        onSyncResponse({
          analytics: data.analytics,
          testerVouchers: data.testerVouchers,
        });
        if (newlyMintedVoucher?.passKey === passKey) {
          setNewlyMintedVoucher(null);
        }
        onToast(`Revoked ${passKey}`);
      }
    } catch {
      onToast('Could not revoke voucher.');
    }
  };

  return (
    <div className="space-y-5 animate-[fadeIn_180ms_ease-out]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
            className="text-2xl sm:text-3xl font-normal"
          >
            Keys & Passes
          </h1>
          <p className="text-xs opacity-60">
            Generate paid BLOOM keys for direct buyers or expiring 1-device tester invites.
          </p>
        </div>

        {/* Mode Switcher */}
        <div
          className={`inline-flex rounded-lg border p-0.5 text-xs self-start sm:self-auto ${hairlineBorder}`}
          role="tablist"
          aria-label="Key generator type"
        >
          <button
            data-testid="keys-subtab-paid"
            type="button"
            role="tab"
            aria-selected={keyMode === 'paid'}
            onClick={() => setKeyMode('paid')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer tabular-nums ${
              keyMode === 'paid'
                ? `${primaryBtnClass} font-medium`
                : 'opacity-70 hover:opacity-100'
            }`}
          >
            Paid Keys ({paidPasses.length})
          </button>
          <button
            data-testid="keys-subtab-tester"
            type="button"
            role="tab"
            aria-selected={keyMode === 'tester'}
            onClick={() => setKeyMode('tester')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer tabular-nums ${
              keyMode === 'tester'
                ? `${primaryBtnClass} font-medium`
                : 'opacity-70 hover:opacity-100'
            }`}
          >
            Tester Keys ({testerVouchers.length})
          </button>
        </div>
      </div>

      {keyMode === 'paid' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Paid Key Mint Form */}
          <form
            onSubmit={handleMintPaidPass}
            className={`lg:col-span-5 rounded-xl border p-5 space-y-4 ${panelClass}`}
          >
            <div className="flex items-center justify-between">
              <h2
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
                className="text-xl font-medium"
              >
                Generate Paid Key
              </h2>
              <span className="text-[11px] opacity-60">
                {incomePausedForTesting ? 'Paused (marked Test)' : 'Recorded in live revenue'}
              </span>
            </div>

            <div>
              <label className="block text-xs opacity-70 mb-1.5">Pass Tier</label>
              <div className={`divide-y ${hairlineDivide} border ${hairlineBorder} rounded-lg overflow-hidden`}>
                {PAID_TIER_OPTIONS.map((opt) => {
                  const selected = paidTier === opt.tier;
                  const priceStr = paidRegion === 'PH' ? opt.phPrice : opt.intlPrice;
                  return (
                    <button
                      key={opt.tier}
                      data-testid={`paid-tier-option-${opt.tier}`}
                      type="button"
                      onClick={() => setPaidTier(opt.tier)}
                      className={`w-full px-3.5 py-2.5 flex items-center justify-between text-left text-xs transition-colors cursor-pointer ${
                        selected ? primaryBtnClass : 'hover:bg-current/5'
                      }`}
                    >
                      <div>
                        <div className="font-medium">{opt.label}</div>
                        <div className="text-[11px] opacity-75">{opt.detail}</div>
                      </div>
                      <span className="font-mono font-medium tabular-nums">{priceStr}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs opacity-70 mb-1.5">Pricing Region</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['PH', 'INTL'] as const).map((reg) => (
                    <button
                      key={reg}
                      data-testid={`paid-region-${reg}`}
                      type="button"
                      onClick={() => setPaidRegion(reg)}
                      className={`py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                        paidRegion === reg
                          ? `${primaryBtnClass} border-transparent`
                          : `${hairlineBorder} opacity-75 hover:opacity-100`
                      }`}
                    >
                      {reg === 'PH' ? 'PH (₱)' : 'INTL ($)'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="paid-channel-select" className="block text-xs opacity-70 mb-1.5">
                  Payment Channel
                </label>
                <select
                  id="paid-channel-select"
                  value={paidChannel}
                  onChange={(e) => setPaidChannel(e.target.value as PaidPassChannel)}
                  className={`w-full px-3 py-2 rounded-lg border text-xs focus:outline-none ${inputClass}`}
                >
                  {CHANNEL_OPTIONS.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="paid-buyer-note-input" className="block text-xs opacity-70 mb-1.5">
                Buyer Name or Receipt Reference
              </label>
              <input
                id="paid-buyer-note-input"
                data-testid="paid-pass-label-input"
                type="text"
                value={paidLabel}
                onChange={(e) => setPaidLabel(e.target.value)}
                placeholder="e.g. Bianca · GCash #4821"
                maxLength={32}
                className={`w-full px-3.5 py-2 rounded-lg border text-xs focus:outline-none ${inputClass}`}
              />
            </div>

            <button
              data-testid="mint-paid-pass-btn"
              type="submit"
              disabled={isMintingPaid}
              className={`w-full py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 ${primaryBtnClass}`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{isMintingPaid ? 'Issuing Key...' : 'Generate Paid Key'}</span>
            </button>

            {newlyMintedPaid && (
              <div
                data-testid="newly-minted-paid-card"
                className={`pt-4 border-t ${hairlineBorder} space-y-2.5`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{newlyMintedPaid.label}</span>
                  <span className="font-mono font-semibold tabular-nums">
                    {newlyMintedPaid.passKey}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    data-testid="copy-paid-key-btn"
                    type="button"
                    onClick={() =>
                      onCopyText(
                        newlyMintedPaid.passKey,
                        `paid-key-${newlyMintedPaid.passKey}`,
                        'Paid key copied'
                      )
                    }
                    className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer ${primaryBtnClass}`}
                  >
                    {copiedId === `paid-key-${newlyMintedPaid.passKey}` ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>Copy Key</span>
                  </button>
                  <button
                    data-testid="copy-paid-claim-link-btn"
                    type="button"
                    onClick={() =>
                      onCopyText(
                        buildPaidPassClaimUrl(newlyMintedPaid.passKey),
                        `paid-link-${newlyMintedPaid.passKey}`,
                        'Claim link copied'
                      )
                    }
                    className={`py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer ${hairlineBorder} hover:bg-current/5`}
                  >
                    {copiedId === `paid-link-${newlyMintedPaid.passKey}` ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Link2 className="w-3.5 h-3.5" />
                    )}
                    <span>Copy Claim Link</span>
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* Paid Keys Ledger (Clean 1px hairline list — zero nested card boxes or metadata pills) */}
          <div className={`lg:col-span-7 rounded-xl border p-5 ${panelClass}`}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-baseline gap-2.5">
                <h2
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  className="text-xl font-medium"
                >
                  Issued Paid Keys
                </h2>
                <span className="text-xs opacity-60 tabular-nums">{paidPasses.length} keys</span>
              </div>
              {(() => {
                const clearableCount = paidPasses.filter(
                  (p) =>
                    p.status === 'revoked' ||
                    p.isTest ||
                    p.channel === 'sikatpay_test' ||
                    p.archivedFromIncome
                ).length;
                if (clearableCount === 0 || !onClearTestAndRevoked) return null;
                return (
                  <button
                    data-testid="clear-test-revoked-keys-btn"
                    type="button"
                    disabled={isClearingKeys}
                    onClick={onClearTestAndRevoked}
                    className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 ${hairlineBorder} hover:bg-current/5`}
                  >
                    {isClearingKeys
                      ? 'Clearing...'
                      : `Clear Test & Revoked (${clearableCount})`}
                  </button>
                );
              })()}
            </div>

            {paidPasses.length === 0 ? (
              <div
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
                className="py-12 text-center italic text-base opacity-55"
              >
                No paid keys issued yet. Generate one on the left for GCash or direct buyers.
              </div>
            ) : (
              <div className={`divide-y ${hairlineDivide} max-h-[460px] overflow-y-auto`}>
                {paidPasses.map((p) => {
                  const isRevoked = p.status === 'revoked';
                  const isExpired =
                    p.status === 'expired' || new Date(p.expiresAt).getTime() <= Date.now();
                  const statusLabel = isRevoked
                    ? 'Revoked'
                    : isExpired
                    ? 'Expired'
                    : p.status === 'claimed'
                    ? 'Claimed'
                    : 'Unclaimed';
                  const priceLabel =
                    p.currency === 'PHP'
                      ? `₱${(p.amountMinor / 100).toFixed(0)}`
                      : `$${(p.amountMinor / 100).toFixed(2)}`;
                  const tierName =
                    p.tier === 'pass_30d'
                      ? '30-Day Eternal'
                      : p.tier === 'pass_7d'
                      ? '7-Day Pass'
                      : 'Single';

                  return (
                    <div
                      key={p.passKey}
                      data-testid={`paid-pass-row-${p.passKey}`}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-sm font-medium">{p.label}</span>
                          <span
                            className={`text-xs font-medium ${
                              isRevoked
                                ? 'text-rose-600 dark:text-rose-400'
                                : isExpired
                                ? 'opacity-50'
                                : p.status === 'claimed'
                                ? 'text-[#5A7F64] dark:text-[#8AB89A]'
                                : 'opacity-75'
                            }`}
                          >
                            · {statusLabel}
                          </span>
                          {(p.isTest || p.channel === 'sikatpay_test') && (
                            <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                              · Test
                            </span>
                          )}
                        </div>
                        <div className="text-xs opacity-65 font-mono tabular-nums flex items-center gap-2 flex-wrap">
                          <span>{p.passKey}</span>
                          <span>·</span>
                          <span className="font-sans">
                            {tierName} ({priceLabel})
                          </span>
                          <span>·</span>
                          <span className="font-sans">
                            {CHANNEL_LABELS[p.channel] || p.channel}
                          </span>
                          {p.bouquetsCreated > 0 && (
                            <>
                              <span>·</span>
                              <span className="font-sans">{p.bouquetsCreated} sealed</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {!isRevoked && !isExpired && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                onCopyText(p.passKey, `row-paid-key-${p.passKey}`, 'Key copied')
                              }
                              className={`px-2.5 py-1 rounded-md border text-xs font-medium flex items-center gap-1 cursor-pointer ${hairlineBorder} hover:bg-current/5`}
                            >
                              {copiedId === `row-paid-key-${p.passKey}` ? (
                                <Check className="w-3 h-3" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              <span>Key</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onCopyText(
                                  buildPaidPassClaimUrl(p.passKey),
                                  `row-paid-link-${p.passKey}`,
                                  'Claim link copied'
                                )
                              }
                              className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 cursor-pointer ${primaryBtnClass}`}
                            >
                              {copiedId === `row-paid-link-${p.passKey}` ? (
                                <Check className="w-3 h-3" />
                              ) : (
                                <Link2 className="w-3 h-3" />
                              )}
                              <span>Link</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRevokePaidPass(p.passKey)}
                              aria-label={`Revoke paid key ${p.passKey}`}
                              title="Revoke paid key"
                              className="p-1.5 rounded-md border border-rose-500/35 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
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
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Tester Key Mint Form (Preserves existing data-testid contracts) */}
          <form
            onSubmit={handleMintTesterVoucher}
            className={`lg:col-span-5 rounded-xl border p-5 space-y-4 ${panelClass}`}
          >
            <div className="flex items-center justify-between">
              <h2
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
                className="text-xl font-medium"
              >
                New Tester Invite
              </h2>
              <span className="text-[11px] opacity-60">Locked to 1st claiming device</span>
            </div>

            <div>
              <label htmlFor="tester-name-input" className="block text-xs opacity-70 mb-1.5">
                Friend or Tester Name
              </label>
              <input
                id="tester-name-input"
                data-testid="tester-voucher-label-input"
                type="text"
                value={voucherLabel}
                onChange={(e) => setVoucherLabel(e.target.value)}
                placeholder="e.g. Sophia"
                maxLength={32}
                className={`w-full px-3.5 py-2 rounded-lg border text-xs focus:outline-none ${inputClass}`}
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
                    className={`py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer tabular-nums ${
                      voucherDurationHours === opt.hours
                        ? `${primaryBtnClass} border-transparent`
                        : `${hairlineBorder} opacity-75 hover:opacity-100`
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
                      className={`py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer tabular-nums ${
                        voucherDailyCap === cap
                          ? `${primaryBtnClass} border-transparent`
                          : `${hairlineBorder} opacity-75 hover:opacity-100`
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
                      className={`py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer tabular-nums ${
                        voucherRetentionDays === days
                          ? `${primaryBtnClass} border-transparent`
                          : `${hairlineBorder} opacity-75 hover:opacity-100`
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
              className={`w-full py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 ${primaryBtnClass}`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isMintingVoucher ? 'Creating...' : 'Create Tester Key'}</span>
            </button>

            {newlyMintedVoucher && (
              <div
                data-testid="newly-minted-voucher-card"
                className={`pt-4 border-t ${hairlineBorder} space-y-2.5`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{newlyMintedVoucher.label}</span>
                  <span className="font-mono font-semibold tabular-nums">
                    {newlyMintedVoucher.passKey}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    data-testid="copy-magic-link-btn"
                    type="button"
                    onClick={() =>
                      onCopyText(
                        buildTesterMagicInviteUrl(newlyMintedVoucher.passKey),
                        `magic-${newlyMintedVoucher.passKey}`,
                        'Invite link copied'
                      )
                    }
                    className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer ${primaryBtnClass}`}
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
                      onCopyText(
                        newlyMintedVoucher.passKey,
                        `key-${newlyMintedVoucher.passKey}`,
                        'Key copied'
                      )
                    }
                    className={`py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer ${hairlineBorder} hover:bg-current/5`}
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

          {/* Issued Tester Vouchers List */}
          <div className={`lg:col-span-7 rounded-xl border p-5 ${panelClass}`}>
            <div className="flex items-center justify-between mb-3">
              <h2
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
                className="text-xl font-medium"
              >
                Issued Tester Keys
              </h2>
              <span className="text-xs opacity-60 tabular-nums">{testerVouchers.length} total</span>
            </div>

            {testerVouchers.length === 0 ? (
              <div
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
                className="py-12 text-center italic text-base opacity-55"
              >
                No tester keys issued yet.
              </div>
            ) : (
              <div className={`divide-y ${hairlineDivide} max-h-[420px] overflow-y-auto`}>
                {testerVouchers.map((v) => {
                  const isExpired =
                    v.status === 'expired' || new Date(v.expiresAt).getTime() <= Date.now();
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
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-sm font-medium">{v.label}</span>
                          <span
                            className={`text-xs font-medium ${
                              isRevoked
                                ? 'text-rose-600 dark:text-rose-400'
                                : isExpired
                                ? 'opacity-50'
                                : v.status === 'claimed'
                                ? 'text-[#5A7F64] dark:text-[#8AB89A]'
                                : 'opacity-75'
                            }`}
                          >
                            · {statusLabel}
                          </span>
                        </div>
                        <div className="text-xs opacity-65 font-mono tabular-nums flex items-center gap-2 flex-wrap">
                          <span>{v.passKey}</span>
                          <span>·</span>
                          <span className="font-sans">{v.durationHours}h</span>
                          <span>·</span>
                          <span className="font-sans">
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
                                onCopyText(
                                  buildTesterMagicInviteUrl(v.passKey),
                                  `row-link-${v.passKey}`,
                                  'Invite link copied'
                                )
                              }
                              className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1 cursor-pointer ${primaryBtnClass}`}
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
                              aria-label={`Revoke tester key ${v.passKey}`}
                              title="Revoke key"
                              className="p-1.5 rounded-md border border-rose-500/35 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
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
      )}
    </div>
  );
};
