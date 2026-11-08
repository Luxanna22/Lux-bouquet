import React, { useEffect, useState, useCallback } from 'react';
import {
  X,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  Eye,
  Mic,
  Lock,
  Clock,
  KeyRound,
  Heart,
  Sparkles,
  RefreshCw,
  MessageSquareHeart,
} from 'lucide-react';
import { SavedVaultBouquet, RECIPIENT_REACTIONS } from '../types/bouquet';
import {
  getSavedVaultBouquets,
  removeBouquetFromLocalVault,
  fetchSharedBouquetFromFirestore,
  SharedBouquetRecord,
} from '../lib/firebase';

interface BouquetVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BouquetVaultModal: React.FC<BouquetVaultModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [vaultItems, setVaultItems] = useState<SavedVaultBouquet[]>([]);
  const [liveStatusMap, setLiveStatusMap] = useState<Record<string, SharedBouquetRecord>>({});
  const [isLoadingLive, setIsLoadingLive] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const loadVaultAndSyncLive = useCallback(async () => {
    const items = getSavedVaultBouquets();
    setVaultItems(items);
    if (items.length === 0) return;

    setIsLoadingLive(true);
    try {
      const results = await Promise.all(
        items.map(async (item) => {
          const record = await fetchSharedBouquetFromFirestore(item.code);
          return { code: item.code, record };
        })
      );
      const nextMap: Record<string, SharedBouquetRecord> = {};
      for (const { code, record } of results) {
        if (record) {
          nextMap[code] = record;
        }
      }
      setLiveStatusMap(nextMap);
    } catch {
      // Best-effort sync
    } finally {
      setIsLoadingLive(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadVaultAndSyncLive();
    }
  }, [isOpen, loadVaultAndSyncLive]);

  if (!isOpen) return null;

  const handleCopyUrl = async (code: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // Fallback
    }
  };

  const handleRemoveItem = (code: string) => {
    const next = removeBouquetFromLocalVault(code);
    setVaultItems(next);
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#2c2520]/45 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[86vh] flex flex-col bg-[#fdfbf7] border border-[#e6dcd2] rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#f7f2eb] border-b border-[#e6dcd2]">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#a35c6a]" />
              <span className="text-[11px] uppercase tracking-[0.22em] text-[#7a6b63] font-semibold">
                Account-Free Keepsake History
              </span>
            </div>
            <h2
              className="text-2xl text-[#2b221e] mt-0.5"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              My Sent Bouquets &amp; Open Receipts
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadVaultAndSyncLive}
              disabled={isLoadingLive}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#5c4e46] bg-[#efe7dc] hover:bg-[#e5dacb] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh live open receipts and reactions"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLive ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-[#7a6b63] hover:text-[#2b221e] hover:bg-[#efe7dc] rounded-lg transition-colors cursor-pointer"
              aria-label="Close My Bouquets"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="px-4 py-3 rounded-xl bg-[#f5efe6] border border-[#e6dcd2] text-xs text-[#695a52] flex items-center justify-between gap-3">
            <span>
              Saved privately in your browser with zero login required. Open receipts, voice listens, and recipient thank-you notes update live.
            </span>
          </div>

          {vaultItems.length === 0 ? (
            <div className="text-center py-12 px-4 border border-dashed border-[#dfd4c8] rounded-2xl bg-[#faf6f0]/60">
              <Heart className="w-8 h-8 text-[#c297a0] mx-auto mb-3 stroke-[1.5]" />
              <h3
                className="text-xl text-[#2b221e] mb-1"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                No bouquets saved in this browser yet
              </h3>
              <p className="text-xs text-[#7a6b63] max-w-md mx-auto leading-relaxed">
                Whenever you generate or copy a gift link in the studio, it will automatically appear here so you can track when your recipient unwraps it or leaves a reply.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {vaultItems.map((item) => {
                const live = liveStatusMap[item.code];
                const openCount = live?.openCount ?? 0;
                const voicePlayCount = live?.voicePlayCount ?? 0;
                const reactionId = live?.reaction ?? '';
                const recipientReply = live?.recipientReply ?? '';
                const matchedReaction = RECIPIENT_REACTIONS.find((r) => r.id === reactionId);

                return (
                  <div
                    key={item.code}
                    className="p-4 rounded-xl bg-white border border-[#e6dcd2] shadow-xs hover:border-[#d4c3b4] transition-all space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3
                            className="text-lg font-semibold text-[#2b221e]"
                            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                          >
                            For {item.recipientName || item.to || 'Someone Special'}
                          </h3>
                          {item.flowerCount ? (
                            <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#f5efe6] text-[#6e5d53] border border-[#e6dcd2]">
                              {item.flowerCount} stems
                            </span>
                          ) : null}
                          {item.lockMode === 'countdown' && (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-[#fdf2f4] text-[#9e4758] border border-[#f2d5db]">
                              <Clock className="w-3 h-3" />
                              Time-Capsule Lock
                            </span>
                          )}
                          {item.lockMode === 'passcode' && (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-[#f5f0ff] text-[#63489a] border border-[#dfd5f7]">
                              <KeyRound className="w-3 h-3" />
                              Secret Question Lock
                            </span>
                          )}
                          {(!item.lockMode || item.lockMode === 'none') && (
                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-[#eef6f0] text-[#3b6e4c] border border-[#cfe6d6]">
                              <Lock className="w-3 h-3" />
                              Ready to Unwrap
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#8a7970] mt-0.5">
                          Created {formatDate(item.createdAt)} · Code <span className="font-mono text-[#5c4e46]">{item.code}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopyUrl(item.code, item.shareUrl)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-[#f5efe6] hover:bg-[#ebe1d4] text-[#3d312b] rounded-lg transition-colors cursor-pointer"
                        >
                          {copiedCode === item.code ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#3b6e4c]" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Link</span>
                            </>
                          )}
                        </button>
                        <a
                          href={item.shareUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-[#2b221e] hover:bg-[#3f322d] text-[#fdfbf7] rounded-lg transition-colors"
                          title="Open gift link"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.code)}
                          className="p-1.5 text-[#9c8b80] hover:text-[#b94a48] hover:bg-[#fdf2f2] rounded-lg transition-colors cursor-pointer"
                          title="Remove from browser history"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Live Receipts Row */}
                    <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#f0e8df] text-xs">
                      <div className="inline-flex items-center gap-1.5 text-[#5c4e46]">
                        <Eye className="w-3.5 h-3.5 text-[#a35c6a]" />
                        <span>
                          Unwrapped <strong className="font-semibold text-[#2b221e]">{openCount}</strong>{' '}
                          {openCount === 1 ? 'time' : 'times'}
                        </span>
                      </div>

                      <div className="inline-flex items-center gap-1.5 text-[#5c4e46]">
                        <Mic className="w-3.5 h-3.5 text-[#a35c6a]" />
                        <span>
                          Voice played <strong className="font-semibold text-[#2b221e]">{voicePlayCount}</strong>{' '}
                          {voicePlayCount === 1 ? 'time' : 'times'}
                        </span>
                      </div>

                      {matchedReaction && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#fdf2f4] border border-[#f2d5db] text-[#9e4758] font-medium">
                          <span>{matchedReaction.symbol}</span>
                          <span>{matchedReaction.label}</span>
                        </div>
                      )}
                    </div>

                    {/* Recipient Reply Note if present */}
                    {recipientReply && (
                      <div className="p-3 rounded-lg bg-[#faf5ef] border border-[#eadfd4] text-xs text-[#3d312b] flex items-start gap-2.5">
                        <MessageSquareHeart className="w-4 h-4 text-[#a35c6a] shrink-0 mt-0.5" />
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-[#8a7970] font-semibold mb-0.5">
                            Recipient’s Note {live?.repliedAt ? `· ${formatDate(live.repliedAt)}` : ''}
                          </div>
                          <p className="italic text-[#2b221e] leading-relaxed">“{recipientReply}”</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
