import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  X,
  ExternalLink,
  Copy,
  Trash2,
  Check,
  RefreshCw,
  Heart,
} from 'lucide-react';
import { RECIPIENT_REACTIONS, SavedVaultBouquet } from '../types/bouquet';
import {
  getSavedVaultBouquets,
  removeBouquetFromLocalVault,
  fetchSharedBouquetFromFirestore,
  SharedBouquetRecord,
} from '../lib/firebase';

const SEEN_REPLIES_STORAGE_KEY = 'sab_seen_replies_v1';

type VaultFilterTab = 'all' | 'replies' | 'sent' | 'drafts';

function loadSeenRepliesMap(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(SEEN_REPLIES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveSeenRepliesMap(map: Record<string, string>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SEEN_REPLIES_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage errors
  }
}

function resolveReactionLabel(reactionId?: string): string {
  if (!reactionId) return 'Replied';
  const match = RECIPIENT_REACTIONS.find((r) => r.id === reactionId);
  return match ? match.label : 'Replied';
}

interface BouquetVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenGiftUrl?: (url: string) => void;
  onSaveCurrentDraft?: () => void;
  onResumeDraft?: (draftPayload: string, sourceCode?: string, isDraft?: boolean) => void;
  isDarkMode?: boolean;
}

export const BouquetVaultModal: React.FC<BouquetVaultModalProps> = ({
  isOpen,
  onClose,
  onOpenGiftUrl,
  onSaveCurrentDraft,
  onResumeDraft,
  isDarkMode = false,
}) => {
  const [vault, setVault] = useState<SavedVaultBouquet[]>([]);
  const [liveReceipts, setLiveReceipts] = useState<Record<string, SharedBouquetRecord>>({});
  const [seenReplies, setSeenReplies] = useState<Record<string, string>>(() =>
    loadSeenRepliesMap()
  );
  const [activeFilter, setActiveFilter] = useState<VaultFilterTab>('all');
  const [isCheckingReplies, setIsCheckingReplies] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const refreshVault = useCallback(async () => {
    const list = getSavedVaultBouquets();
    setVault(list);
    const sharedItems = list.filter((item) => !item.isDraft && !item.code.startsWith('draft_'));
    if (sharedItems.length === 0) return;

    setIsCheckingReplies(true);
    try {
      const results: Record<string, SharedBouquetRecord> = {};
      await Promise.all(
        sharedItems.slice(0, 20).map(async (item) => {
          try {
            const rec = await fetchSharedBouquetFromFirestore(item.code, { fresh: true });
            if (rec) {
              results[item.code] = rec;
            }
          } catch {
            // Ignore individual fetch errors
          }
        })
      );
      setLiveReceipts((prev) => ({ ...prev, ...results }));
    } finally {
      setIsCheckingReplies(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSeenReplies(loadSeenRepliesMap());
      refreshVault();
    }
  }, [isOpen, refreshVault]);

  const markVisibleRepliesSeen = useCallback(() => {
    const next = { ...loadSeenRepliesMap() };
    let changed = false;
    for (const [code, rec] of Object.entries(liveReceipts)) {
      if (rec && (rec.recipientReply || rec.reaction)) {
        const stamp = rec.repliedAt || rec.recipientReply || rec.reaction || 'seen';
        if (next[code] !== stamp) {
          next[code] = stamp;
          changed = true;
        }
      }
    }
    if (changed) {
      saveSeenRepliesMap(next);
      setSeenReplies(next);
    }
  }, [liveReceipts]);

  const handleClose = useCallback(() => {
    markVisibleRepliesSeen();
    onClose();
  }, [markVisibleRepliesSeen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, handleClose]);

  const replyCount = useMemo(
    () =>
      vault.filter((entry) => {
        const live = liveReceipts[entry.code];
        return Boolean(!entry.isDraft && (live?.recipientReply || live?.reaction));
      }).length,
    [vault, liveReceipts]
  );

  const unreadReplyCount = useMemo(
    () =>
      vault.filter((entry) => {
        const live = liveReceipts[entry.code];
        if (entry.isDraft || (!live?.recipientReply && !live?.reaction)) return false;
        const stamp = live.repliedAt || live.recipientReply || live.reaction || 'seen';
        return seenReplies[entry.code] !== stamp;
      }).length,
    [vault, liveReceipts, seenReplies]
  );

  const filteredVault = useMemo(() => {
    if (activeFilter === 'replies') {
      return vault.filter((entry) => {
        const live = liveReceipts[entry.code];
        return Boolean(!entry.isDraft && (live?.recipientReply || live?.reaction));
      });
    }
    if (activeFilter === 'sent') {
      return vault.filter((entry) => !entry.isDraft);
    }
    if (activeFilter === 'drafts') {
      return vault.filter((entry) => Boolean(entry.isDraft));
    }
    return vault;
  }, [vault, liveReceipts, activeFilter]);

  if (!isOpen) return null;

  const handleCopy = (entry: SavedVaultBouquet) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(entry.shareUrl).catch(() => {});
    }
    setCopiedCode(entry.code);
    window.setTimeout(() => {
      setCopiedCode((prev) => (prev === entry.code ? null : prev));
    }, 2000);
  };

  const handleDelete = (code: string) => {
    // Only remove from this device's local history — never delete shared_bouquets/{code} from cloud,
    // so eternal recipient links always stay live forever.
    const next = removeBouquetFromLocalVault(code);
    setVault(next);
  };

  const formatShortDate = (iso?: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const formatReplyTime = (iso?: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Saved Bouquets"
      onClick={handleClose}
      className="fixed inset-0 z-50 bg-black/45 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg rounded-[26px] border border-dashed shadow-[0_24px_60px_rgba(28,20,16,0.18)] relative max-h-[85vh] flex flex-col overflow-hidden transition-colors ${
          isDarkMode
            ? 'bg-[#352C29] border-[#5E4E49] text-[#FBF6F1]'
            : 'bg-[#FFFDF9] border-[#DECBB9] text-[#2A201D] dark:bg-[#352C29] dark:border-[#5E4E49] dark:text-[#FBF6F1]'
        }`}
      >
        {/* Minimal Luxury Header */}
        <div
          className={`px-5 sm:px-6 pt-5 pb-3.5 border-b border-dashed shrink-0 space-y-3 ${
            isDarkMode
              ? 'border-[#4E403B]'
              : 'border-[#EADFD4] dark:border-[#4E403B]'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2
                className="text-2xl sm:text-[26px] font-medium tracking-tight leading-tight"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                Saved Bouquets
              </h2>
              <p
                className={`text-xs mt-0.5 ${
                  isDarkMode
                    ? 'text-[#C8B6AC]'
                    : 'text-[#8C7A70] dark:text-[#C8B6AC]'
                }`}
              >
                Drafts, sent keepsakes &amp; replies from your recipients
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {vault.some((v) => !v.isDraft) && (
                <button
                  type="button"
                  onClick={() => refreshVault()}
                  disabled={isCheckingReplies}
                  title="Check for new recipient replies"
                  aria-label="Check for new recipient replies"
                  className={`w-8 h-8 rounded-full border border-dashed flex items-center justify-center transition cursor-pointer disabled:opacity-50 ${
                    isDarkMode
                      ? 'border-[#5E4E49] text-[#C8B6AC] hover:text-[#FBF6F1] hover:bg-[#463A36]'
                      : 'border-[#DECBB9] text-[#7D6B60] hover:text-[#2A201D] hover:bg-[#FAF4EE]'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingReplies ? 'animate-spin' : ''}`} />
                </button>
              )}
              {onSaveCurrentDraft && (
                <button
                  type="button"
                  data-testid="vault-save-current-draft-btn"
                  onClick={() => {
                    onSaveCurrentDraft();
                    refreshVault();
                  }}
                  className={`px-3 py-1.5 rounded-full border border-dashed text-[11px] font-medium transition cursor-pointer ${
                    isDarkMode
                      ? 'border-[#E6B89C]/70 bg-[#E6B89C]/15 text-[#F0C8B0] hover:bg-[#E6B89C]/25'
                      : 'border-[#B4846C] bg-[#FAF4EE] text-[#6E4434] hover:bg-[#F3E9DF]'
                  }`}
                >
                  + Save Draft
                </button>
              )}
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close saved bouquets"
                className={`w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer ${
                  isDarkMode
                    ? 'text-[#C8B6AC] hover:text-[#FBF6F1] hover:bg-[#463A36]'
                    : 'text-[#8C7A70] hover:text-[#2A201D] hover:bg-[#F5EDE4] dark:text-[#C8B6AC] dark:hover:text-[#FBF6F1] dark:hover:bg-[#463A36]'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quiet Filter Bar (lets sender jump straight to Replies) */}
          {vault.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {(
                [
                  { id: 'all', label: `All (${vault.length})` },
                  {
                    id: 'replies',
                    label: replyCount > 0 ? `Replies (${replyCount})` : 'Replies',
                    hasUnread: unreadReplyCount > 0,
                  },
                  { id: 'sent', label: 'Sent' },
                  { id: 'drafts', label: 'Drafts' },
                ] as Array<{ id: VaultFilterTab; label: string; hasUnread?: boolean }>
              ).map((tab) => {
                const active = activeFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    data-testid={`vault-filter-${tab.id}`}
                    onClick={() => setActiveFilter(tab.id)}
                    className={`px-3 py-1 rounded-full text-[11px] font-medium inline-flex items-center gap-1.5 transition cursor-pointer ${
                      active
                        ? isDarkMode
                          ? 'bg-[#E6B89C] text-[#231C18]'
                          : 'bg-[#6E4434] text-[#FFFDF9]'
                        : isDarkMode
                        ? 'border border-dashed border-[#5E4E49] text-[#D8C7BE] hover:bg-[#423632]'
                        : 'border border-dashed border-[#DECBB9] text-[#6E5D54] hover:bg-[#FAF4EE]'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.hasUnread && (
                      <span
                        aria-label="Unread replies"
                        className="w-1.5 h-1.5 rounded-full bg-[#9E4757] inline-block"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1">
          {vault.length === 0 ? (
            <div
              className={`py-10 px-5 text-center rounded-2xl border border-dashed ${
                isDarkMode
                  ? 'border-[#4E403B] bg-[#2D2421]/60'
                  : 'border-[#E6D6C7] bg-[#FAF4EE]/55 dark:border-[#4E403B] dark:bg-[#2D2421]/60'
              }`}
            >
              <svg
                viewBox="0 0 48 48"
                className="w-9 h-9 mx-auto mb-2.5 opacity-75"
                fill="none"
              >
                <circle
                  cx="24"
                  cy="20"
                  r="4"
                  fill="#FDE68A"
                  stroke="#B4846C"
                  strokeWidth="1.2"
                />
                <ellipse
                  cx="24"
                  cy="11"
                  rx="4"
                  ry="6"
                  fill="#FCE4EC"
                  stroke="#B4846C"
                  strokeWidth="1.1"
                />
                <ellipse
                  cx="24"
                  cy="29"
                  rx="4"
                  ry="6"
                  fill="#FCE4EC"
                  stroke="#B4846C"
                  strokeWidth="1.1"
                />
                <ellipse
                  cx="15"
                  cy="20"
                  rx="6"
                  ry="4"
                  fill="#FCE4EC"
                  stroke="#B4846C"
                  strokeWidth="1.1"
                />
                <ellipse
                  cx="33"
                  cy="20"
                  rx="6"
                  ry="4"
                  fill="#FCE4EC"
                  stroke="#B4846C"
                  strokeWidth="1.1"
                />
                <path
                  d="M 24,35 L 24,44"
                  stroke="#7AA387"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
              <p
                className="text-lg font-medium"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                No saved bouquets yet
              </p>
              <p
                className={`text-xs mt-1 max-w-xs mx-auto leading-relaxed ${
                  isDarkMode
                    ? 'text-[#B8A59B]'
                    : 'text-[#8C7A70] dark:text-[#B8A59B]'
                }`}
              >
                Whenever you save or share a bouquet in the studio, it will rest here so you can revisit its link and read replies anytime.
              </p>
            </div>
          ) : filteredVault.length === 0 ? (
            <div
              className={`py-8 px-5 text-center rounded-2xl border border-dashed ${
                isDarkMode
                  ? 'border-[#4E403B] bg-[#2D2421]/60'
                  : 'border-[#E6D6C7] bg-[#FAF4EE]/55'
              }`}
            >
              <p
                className="text-lg font-medium"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                {activeFilter === 'replies'
                  ? 'No recipient replies yet'
                  : activeFilter === 'drafts'
                  ? 'No saved drafts'
                  : 'No sent bouquets yet'}
              </p>
              <p
                className={`text-xs mt-1 max-w-xs mx-auto leading-relaxed ${
                  isDarkMode ? 'text-[#B8A59B]' : 'text-[#8C7A70]'
                }`}
              >
                {activeFilter === 'replies'
                  ? 'When someone opens your bouquet link and writes a note back, their reply will appear right here.'
                  : 'Switch to All to see your other saved arrangements.'}
              </p>
            </div>
          ) : (
            filteredVault.map((entry) => {
              const isCopied = copiedCode === entry.code;
              const live = liveReceipts[entry.code];
              const openCount = live?.openCount ?? 0;
              const voicePlays = live?.voicePlayCount ?? 0;
              const recipientDisplay = entry.to || entry.recipientName || 'Someone Special';
              const senderDisplay = entry.from || entry.senderName || 'Yours Always';
              const hasReplyOrReaction = Boolean(
                !entry.isDraft && (live?.recipientReply || live?.reaction)
              );
              const replyStamp =
                live?.repliedAt || live?.recipientReply || live?.reaction || 'seen';
              const isUnreadReply =
                hasReplyOrReaction && seenReplies[entry.code] !== replyStamp;

              const statusParts: string[] = [];
              if (entry.flowerCount) {
                statusParts.push(`${entry.flowerCount} stems`);
              }
              if (entry.isDraft) {
                statusParts.push('Saved draft');
              } else if (openCount > 0) {
                statusParts.push(`Unwrapped ${openCount}×`);
              } else if (entry.lockMode === 'countdown') {
                statusParts.push('Date lock');
              } else if (entry.lockMode === 'passcode') {
                statusParts.push('Secret hint');
              } else {
                statusParts.push('Ready to unwrap');
              }
              if (voicePlays > 0) {
                statusParts.push(`Voice played ${voicePlays}×`);
              }

              const candidatePayloads = [
                live?.payload,
                entry.draftPayload,
                typeof window !== 'undefined'
                  ? localStorage.getItem(`bq_short_${entry.code}`) || ''
                  : '',
                entry.shareUrl && entry.shareUrl.includes('#') ? entry.shareUrl : '',
              ].filter((p): p is string => Boolean(p && p.trim().length > 3));
              const resolvedDraftPayload =
                candidatePayloads.sort((a, b) => b.length - a.length)[0] || '';

              return (
                <div
                  key={entry.code}
                  className={`p-4 rounded-2xl border border-dashed transition-colors ${
                    isDarkMode
                      ? 'border-[#544540] bg-[#2D2421]/80 hover:border-[#6E5B54]'
                      : 'border-[#E2D1C1] bg-[#FAF4EE]/60 hover:border-[#CFAF97] dark:border-[#544540] dark:bg-[#2D2421]/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <h3
                          className="text-lg font-medium tracking-tight truncate"
                          style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                        >
                          For {recipientDisplay}
                        </h3>
                        <span
                          className={`text-[11px] ${
                            isDarkMode
                              ? 'text-[#B09D93]'
                              : 'text-[#9A877B] dark:text-[#B09D93]'
                          }`}
                        >
                          · From {senderDisplay}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`text-[11px] ${
                          isDarkMode
                            ? 'text-[#A69288]'
                            : 'text-[#9A877B] dark:text-[#A69288]'
                        }`}
                      >
                        {formatShortDate(entry.createdAt)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDelete(entry.code)}
                        title={
                          entry.isDraft
                            ? 'Delete saved draft from this device'
                            : 'Remove from this device (shared link stays live forever)'
                        }
                        aria-label={`Remove bouquet for ${recipientDisplay} from this device`}
                        className={`p-1 rounded-full transition cursor-pointer ${
                          isDarkMode
                            ? 'text-[#A69288] hover:text-rose-300 hover:bg-[#3F332F]'
                            : 'text-[#A69288] hover:text-rose-600 hover:bg-[#F2E6DA] dark:hover:text-rose-300 dark:hover:bg-[#3F332F]'
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Tactile Wax-Sealed Recipient Reply Postcard */}
                  {hasReplyOrReaction && (
                    <div
                      data-testid={`vault-reply-card-${entry.code}`}
                      className={`mt-3 rounded-xl border border-dashed px-3.5 py-2.5 ${
                        isDarkMode
                          ? 'bg-[#352C29] border-[#6A564F]'
                          : 'bg-[#FFFDF9] border-[#DECBB9]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="inline-flex items-center gap-1.5 font-medium">
                          <Heart className="w-3 h-3 text-[#9E4757] fill-[#9E4757]/25 shrink-0" />
                          <span>{resolveReactionLabel(live?.reaction)}</span>
                          {isUnreadReply && (
                            <span
                              className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-medium ${
                                isDarkMode
                                  ? 'bg-[#9E4757]/30 text-[#F4C2CC]'
                                  : 'bg-[#9E4757]/12 text-[#9E4757]'
                              }`}
                            >
                              New
                            </span>
                          )}
                        </span>
                        {live?.repliedAt && (
                          <span
                            className={`text-[10.5px] shrink-0 ${
                              isDarkMode ? 'text-[#B09D93]' : 'text-[#8C7A70]'
                            }`}
                          >
                            {formatReplyTime(live.repliedAt)}
                          </span>
                        )}
                      </div>

                      {live?.recipientReply && (
                        <p
                          className={`mt-1.5 text-lg sm:text-[19px] leading-snug break-words whitespace-pre-wrap ${
                            isDarkMode ? 'text-[#F5EBE6]' : 'text-[#2A201D]'
                          }`}
                          style={{ fontFamily: "'Caveat', 'Cormorant Garamond', cursive" }}
                        >
                          &ldquo;{live.recipientReply}&rdquo;
                        </p>
                      )}
                    </div>
                  )}

                  {/* Quiet single-line status + clean actions */}
                  <div
                    className={`mt-3 pt-2.5 border-t border-dashed flex flex-wrap items-center justify-between gap-2 ${
                      isDarkMode
                        ? 'border-[#463935]'
                        : 'border-[#E8D9CB] dark:border-[#463935]'
                    }`}
                  >
                    <span
                      className={`text-[11px] ${
                        isDarkMode
                          ? 'text-[#C2B0A6]'
                          : 'text-[#7D6B60] dark:text-[#C2B0A6]'
                      }`}
                    >
                      {statusParts.join(' · ')}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {onResumeDraft && (resolvedDraftPayload || entry.code) && (
                        <button
                          type="button"
                          data-testid={`resume-draft-${entry.code}`}
                          onClick={() => {
                            onResumeDraft(resolvedDraftPayload, entry.code, Boolean(entry.isDraft));
                            handleClose();
                          }}
                          className={`px-3 py-1 rounded-full text-[11px] font-medium inline-flex items-center gap-1 transition cursor-pointer ${
                            entry.isDraft
                              ? isDarkMode
                                ? 'bg-[#E6B89C] text-[#231C18] hover:bg-[#F0C8B0]'
                                : 'bg-[#6E4434] text-[#FFFDF9] hover:bg-[#5B3729]'
                              : isDarkMode
                              ? 'border border-dashed border-[#66554F] bg-[#3B302C] text-[#FBF6F1] hover:bg-[#473A35]'
                              : 'border border-dashed border-[#D5BFA9] bg-[#FFFDF9] text-[#5C4438] hover:bg-[#F5EBE1]'
                          }`}
                        >
                          <span>{entry.isDraft ? 'Resume Draft' : 'Edit Draft'}</span>
                        </button>
                      )}

                      {!entry.isDraft && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleCopy(entry)}
                            className={`px-3 py-1 rounded-full border border-dashed text-[11px] font-medium inline-flex items-center gap-1 transition cursor-pointer ${
                              isCopied
                                ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                : isDarkMode
                                ? 'border-[#66554F] bg-[#3B302C] text-[#FBF6F1] hover:bg-[#473A35]'
                                : 'border-[#D5BFA9] bg-[#FFFDF9] text-[#5C4438] hover:bg-[#F5EBE1] dark:border-[#66554F] dark:bg-[#3B302C] dark:text-[#FBF6F1]'
                            }`}
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy Link</span>
                              </>
                            )}
                          </button>

                          <a
                            href={entry.shareUrl}
                            onClick={(e) => {
                              if (onOpenGiftUrl) {
                                e.preventDefault();
                                onOpenGiftUrl(entry.shareUrl);
                                handleClose();
                              }
                            }}
                            className={`px-3 py-1 rounded-full text-[11px] font-medium inline-flex items-center gap-1 transition cursor-pointer ${
                              isDarkMode
                                ? 'bg-[#E6B89C] text-[#231C18] hover:bg-[#F0C8B0]'
                                : 'bg-[#6E4434] text-[#FFFDF9] hover:bg-[#5B3729] dark:bg-[#E6B89C] dark:text-[#231C18]'
                            }`}
                          >
                            <span>Open</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
