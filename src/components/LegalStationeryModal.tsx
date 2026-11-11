import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { BrandLogoMark } from './BrandLogoMark';
import { OFFICIAL_STUDIO_EMAIL } from '../lib/contactService';

interface LegalStationeryModalProps {
  activeTab: 'terms' | 'privacy' | null;
  isDarkMode: boolean;
  onSelectTab: (tab: 'terms' | 'privacy') => void;
  onClose: () => void;
}

const TERMS_SECTIONS = [
  {
    num: '01',
    title: 'Personal Floral Studio & Gifting',
    body: 'Send A Bouquet (sendabouquet.online) is an independent digital floral studio created for crafting and sharing personal flower arrangements, handwritten notes, photocards, and voice keepsakes with loved ones.',
  },
  {
    num: '02',
    title: 'Free Studio & Couture Passes',
    body: 'Anyone can craft and share unlimited classic bouquets for free (including 30-day gift links and local device drafts). Optional Couture Unlocks—Single Bouquet ($2.99), 7-Day Pass ($4.99), and 30-Day Eternal Pass ($8.99)—unlock glimmering couture blooms, luxury wraps and ribbons, photo keepsakes, voice notes, 260-character card notes, high-resolution PNG downloads, and extended 90-day or never-expiring gift links.',
  },
  {
    num: '03',
    title: 'Bloom Keys & Fair Use',
    body: '7-Day and 30-Day Passes issue a personal BLOOM-XXXX-XXXX Pass Key with no account required. Each Pass Key is bound to your primary device (with one device transfer allowance and one active session at a time) and may not be publicly shared or resold. Single Bouquet unlocks bind strictly to one sealed bouquet.',
  },
  {
    num: '04',
    title: 'Photos, Voice Notes & Acceptable Use',
    body: 'You retain ownership of any personal photos, voice recordings, and messages you attach to a bouquet. By sealing a bouquet, you confirm that your content is respectful, lawful, and does not infringe on others’ rights. You may optionally choose whether to display a sealed bouquet on the public Shared Creations lace garland (view-only).',
  },
  {
    num: '05',
    title: 'Payments & Order Support',
    body: 'Orders are processed securely through Ko-fi Shop (PayPal & major cards). Because digital passes and high-resolution downloads unlock immediately upon verification, completed unlocks are generally non-refundable, though I am always happy to help resolve any order or key issue at hello@sendabouquet.online.',
  },
];

const PRIVACY_SECTIONS = [
  {
    num: '01',
    title: 'Zero-Account Privacy by Design',
    body: 'You never need to create an account, password, or public profile to craft, save, or unwrap a bouquet on Send A Bouquet.',
  },
  {
    num: '02',
    title: 'Local Drafts & Device Storage',
    body: 'Your unfinished drafts, Saved Bouquets vault history, theme preference, and active Pass Key are stored locally in your browser on your own device. Clearing your browser data removes local drafts unless you have sealed them into a gift link.',
  },
  {
    num: '03',
    title: 'Shared Gift Links, Photos & Voice Keepsakes',
    body: 'When you seal a bouquet, its arrangement data, card note, attached photos, and optional voice recording are stored in our cloud database solely to deliver your gift via its unique short link (sendabouquet.online/<code>). Free links expire automatically after 30 days, Single and 7-Day Pass links after 90 days, and 30-Day Eternal Pass links are preserved indefinitely.',
  },
  {
    num: '04',
    title: 'Checkout Verification & Contact Notes',
    body: 'When you unlock a pass via Ko-fi Shop, our payment processor handles all card and payment details directly—we never see or store your payment card numbers. We only use the checkout email address you enter to verify your receipt and issue your Pass Key. Notes sent through our Contact stationery form are delivered to hello@sendabouquet.online solely to reply to you.',
  },
  {
    num: '05',
    title: 'Deleting a Shared Bouquet or Data Request',
    body: 'If you ever wish to remove a shared bouquet link, photo, voice recording, or contact note early, simply write to hello@sendabouquet.online with your gift link or details and I will promptly remove it.',
  },
];

export const LegalStationeryModal: React.FC<LegalStationeryModalProps> = ({
  activeTab,
  isDarkMode,
  onSelectTab,
  onClose,
}) => {
  if (!activeTab) return null;

  const sections = activeTab === 'terms' ? TERMS_SECTIONS : PRIVACY_SECTIONS;

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={activeTab === 'terms' ? 'Terms of Use' : 'Privacy Policy'}
      data-testid="legal-stationery-modal"
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-xl rounded-[26px] border border-dashed p-5 sm:p-7 shadow-[0_24px_60px_rgba(28,20,16,0.22)] relative text-left max-h-[86dvh] flex flex-col transition-colors ${
          isDarkMode
            ? 'bg-[#352C29] border-[#5E4E49] text-[#FBF6F1]'
            : 'bg-[#FFFDF9] border-[#DECBB9] text-[#231C18]'
        }`}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close legal dialog"
          className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition cursor-pointer ${
            isDarkMode
              ? 'text-[#C8B6AC] hover:text-[#FBF6F1] hover:bg-[#463A36]'
              : 'text-[#8C7A70] hover:text-[#231C18] hover:bg-[#F5EDE4]'
          }`}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Stationery Header with Drawn Botanical Flower & Tab Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-dashed border-[#DECBB9]/70 dark:border-[#544540] pr-8">
          <div className="flex items-center gap-2.5">
            <BrandLogoMark
              isDarkMode={isDarkMode}
              className="w-8 h-8 shrink-0"
            />
            <div>
              <h3
                className="text-2xl sm:text-[26px] font-semibold tracking-tight leading-none"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                {activeTab === 'terms' ? 'Terms of Use' : 'Privacy Policy'}
              </h3>
              <p
                className={`text-[11px] mt-1 ${
                  isDarkMode ? 'text-[#C8B6AC]' : 'text-[#7D6B60]'
                }`}
              >
                Send A Bouquet · Effective &amp; Updated {new Date().getFullYear()}
              </p>
            </div>
          </div>

          {/* Segmented Stationery Tab Switcher */}
          <div
            className={`inline-flex items-center p-0.5 rounded-full border border-dashed text-[11px] font-medium self-start sm:self-auto ${
              isDarkMode
                ? 'bg-[#2B2321] border-[#544540]'
                : 'bg-[#FAF4EE] border-[#DECBB9]'
            }`}
          >
            <button
              type="button"
              data-testid="legal-tab-terms"
              onClick={() => onSelectTab('terms')}
              className={`px-3.5 py-1 rounded-full transition cursor-pointer ${
                activeTab === 'terms'
                  ? isDarkMode
                    ? 'bg-[#E6B89C] text-[#231C18]'
                    : 'bg-[#6E4434] text-[#FFFDF9]'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              Terms
            </button>
            <button
              type="button"
              data-testid="legal-tab-privacy"
              onClick={() => onSelectTab('privacy')}
              className={`px-3.5 py-1 rounded-full transition cursor-pointer ${
                activeTab === 'privacy'
                  ? isDarkMode
                    ? 'bg-[#E6B89C] text-[#231C18]'
                    : 'bg-[#6E4434] text-[#FFFDF9]'
                  : 'opacity-70 hover:opacity-100'
              }`}
            >
              Privacy
            </button>
          </div>
        </div>

        {/* Scrollable Numbered Stationery Sections */}
        <div className="mt-4 space-y-2.5 overflow-y-auto pr-1 flex-1">
          {sections.map((sec) => (
            <div
              key={sec.num}
              className={`p-3.5 rounded-2xl border border-dashed transition-colors ${
                isDarkMode
                  ? 'bg-[#2B2321]/75 border-[#544540]'
                  : 'bg-[#FAF4EE]/80 border-[#E2D1C1]'
              }`}
            >
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-sm italic font-medium shrink-0 ${
                    isDarkMode ? 'text-[#E6B89C]' : 'text-[#8A5A44]'
                  }`}
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                >
                  {sec.num}
                </span>
                <h4
                  className="text-base sm:text-[17px] font-semibold leading-snug"
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                >
                  {sec.title}
                </h4>
              </div>
              <p
                className={`mt-1 text-xs leading-relaxed pl-5 ${
                  isDarkMode ? 'text-[#D8C7BE]' : 'text-[#5C4A40]'
                }`}
              >
                {sec.body}
              </p>
            </div>
          ))}
        </div>

        {/* Footer Contact & Close Bar */}
        <div className="mt-4 pt-3.5 border-t border-dashed border-[#DECBB9]/70 dark:border-[#544540] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <p
            className={`text-[11.5px] ${
              isDarkMode ? 'text-[#C8B6AC]' : 'text-[#7D6B60]'
            }`}
          >
            Questions or requests? Write anytime to{' '}
            <a
              href={`mailto:${OFFICIAL_STUDIO_EMAIL}`}
              className={`underline decoration-dashed underline-offset-2 font-medium ${
                isDarkMode ? 'text-[#E6B89C]' : 'text-[#6E4434]'
              }`}
            >
              {OFFICIAL_STUDIO_EMAIL}
            </a>
          </p>
          <button
            type="button"
            onClick={onClose}
            className={`px-5 py-2 rounded-full text-xs font-medium transition cursor-pointer self-end sm:self-auto ${
              isDarkMode
                ? 'bg-[#E6B89C] text-[#231C18] hover:bg-[#F0C8B0]'
                : 'bg-[#6E4434] text-[#FFFDF9] hover:bg-[#5B3729]'
            }`}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
};
