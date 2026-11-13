import React, { useEffect, useState } from 'react';
import {
  X,
  ExternalLink,
  Copy,
  Trash2,
  Check,
} from 'lucide-react';
import { SavedVaultBouquet } from '../types/bouquet';
import {
  getSavedVaultBouquets,
  removeBouquetFromLocalVault,
  removeBouquetFromFirestoreAndGarland,
  fetchSharedBouquetFromFirestore,
  SharedBouquetRecord,
} from '../lib/firebase';

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
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const refreshVault = async () => {
    const list = getSavedVaultBouquets();
    setVault(list);
    if (list.length === 0) return;

    const results: Record<string, SharedBouquetRecord> = {};
    await Promise.all(
      list.slice(0, 12).map(async (item) => {
        try {
          const rec = await fetchSharedBouquetFromFirestore(item.code);
          if (rec) {
            results[item.code] = rec;
          }
        } catch {
          // Ignore individual fetch errors
        }
      })
    );
    setLiveReceipts((prev) => ({ ...prev, ...results }));
  };

  useEffect(() => {
    if (isOpen) {
      refreshVault();
    }
  }, [isOpen]);

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
    const next = removeBouquetFromLocalVault(code);
    setVault(next);
    removeBouquetFromFirestoreAndGarland(code).catch(() => {});
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Saved Bouquets"
      onClick={onClose}
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
          className={`px-5 sm:px-6 pt-5 pb-4 border-b border-dashed flex items-start justify-between gap-3 shrink-0 ${
            isDarkMode
              ? 'border-[#4E403B]'
              : 'border-[#EADFD4] dark:border-[#4E403B]'
          }`}
        >
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
              Drafts &amp; keepsakes saved on this device
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
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
              onClick={onClose}
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
                Whenever you save or share a bouquet in the studio, it will rest here so you can revisit or copy its link anytime.
              </p>
            </div>
          ) : (
            vault.map((entry) => {
              const isCopied = copiedCode === entry.code;
              const live = liveReceipts[entry.code];
              const openCount = live?.openCount ?? 0;
              const voicePlays = live?.voicePlayCount ?? 0;
              const recipientDisplay = entry.to || entry.recipientName || 'Someone Special';
              const senderDisplay = entry.from || entry.senderName || 'Yours Always';

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
                      {live?.recipientReply && (
                        <p
                          className={`text-sm italic mt-1 line-clamp-2 ${
                            isDarkMode
                              ? 'text-[#DFD1C8]'
                              : 'text-[#5C493F] dark:text-[#DFD1C8]'
                          }`}
                          style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                        >
                          Reply: &ldquo;{live.recipientReply}&rdquo;
                        </p>
                      )}
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
                        title="Remove from saved bouquets"
                        aria-label={`Remove bouquet for ${recipientDisplay}`}
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
                            onClose();
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
                                onClose();
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
