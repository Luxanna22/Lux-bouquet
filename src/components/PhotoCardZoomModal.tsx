import React, { useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { BouquetItem, PhotoFrameStyle } from '../types/bouquet';

export interface PhotoCardZoomModalProps {
  item: BouquetItem | null;
  allPhotoItems?: BouquetItem[];
  isDarkMode?: boolean;
  onClose: () => void;
  onSelectPhoto?: (itemId: string) => void;
}

const PressedFlowerPlaceholder: React.FC<{ accentColor: string }> = ({ accentColor }) => (
  <svg
    viewBox="0 0 120 120"
    className="w-full h-full block"
    aria-hidden="true"
  >
    <rect x="0" y="0" width="120" height="120" fill="#F5EBE1" />
    <circle cx="86" cy="34" r="13" fill={accentColor} opacity="0.32" />
    <path
      d="M0,94 Q42,67 82,91 T120,86 L120,120 L0,120 Z"
      fill="#DECBB9"
      opacity="0.7"
    />
    <g transform="translate(60, 58)">
      <line x1="0" y1="5" x2="0" y2="30" stroke="#7D6B60" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M0,18 Q-11,13 -13,19 Q-8,24 0,18 Z M0,22 Q11,17 13,23 Q8,28 0,22 Z"
        fill="#84A98C"
        opacity="0.75"
      />
      <circle cx="0" cy="-2" r="6.5" fill={accentColor} opacity="0.65" />
      <circle cx="-7.5" cy="3" r="5.8" fill={accentColor} opacity="0.5" />
      <circle cx="7.5" cy="3" r="5.8" fill={accentColor} opacity="0.5" />
      <circle cx="-5" cy="10" r="5.8" fill={accentColor} opacity="0.55" />
      <circle cx="5" cy="10" r="5.8" fill={accentColor} opacity="0.55" />
      <circle cx="0" cy="4" r="3.6" fill="#FFFDF9" />
    </g>
  </svg>
);

export const PhotoCardZoomModal: React.FC<PhotoCardZoomModalProps> = ({
  item,
  allPhotoItems = [],
  isDarkMode = false,
  onClose,
  onSelectPhoto,
}) => {
  const photoList = allPhotoItems.length > 0 ? allPhotoItems : item ? [item] : [];
  const activeIndex = item ? photoList.findIndex((p) => p.id === item.id) : -1;
  const hasMultiple = photoList.length > 1 && Boolean(onSelectPhoto);

  useEffect(() => {
    if (!item) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (hasMultiple && onSelectPhoto && activeIndex >= 0) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          const prevIdx = (activeIndex - 1 + photoList.length) % photoList.length;
          onSelectPhoto(photoList[prevIdx].id);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          const nextIdx = (activeIndex + 1) % photoList.length;
          onSelectPhoto(photoList[nextIdx].id);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [item, onClose, hasMultiple, onSelectPhoto, activeIndex, photoList]);

  if (!item) return null;

  const style: PhotoFrameStyle = item.photoStyle || 'polaroid';
  const frameColor = item.petalColor || '#FFFDF9';
  const accentColor = item.centerColor || '#E11D48';
  const rawCaption = item.photoCaption !== undefined ? item.photoCaption : 'Sweet Memory';
  const caption = rawCaption.trim();
  const hasImage = Boolean(item.photoDataUrl);
  const clipId = `zoom-photo-clip-${item.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const handleStep = (delta: number) => {
    if (!hasMultiple || !onSelectPhoto || activeIndex < 0) return;
    const nextIdx = (activeIndex + delta + photoList.length) % photoList.length;
    onSelectPhoto(photoList[nextIdx].id);
  };

  const renderPhotoMedia = (className = 'w-full h-full object-cover block') =>
    hasImage ? (
      <img
        src={item.photoDataUrl}
        alt={caption || 'Attached keepsake photo'}
        className={className}
        draggable={false}
      />
    ) : (
      <PressedFlowerPlaceholder accentColor={accentColor} />
    );

  const renderStyledCard = () => {
    // 0. FRAMELESS DIRECT PHOTO
    if (style === 'raw') {
      return (
        <div
          data-testid="photo-zoom-card"
          data-photo-style="raw"
          className="relative max-w-[min(90vw,440px)] max-h-[74vh] flex items-center justify-center"
        >
          {hasImage ? (
            <img
              src={item.photoDataUrl}
              alt={caption || 'Attached photo'}
              draggable={false}
              className="max-w-full max-h-[74vh] w-auto h-auto rounded-2xl shadow-[0_24px_64px_rgba(24,18,15,0.45)] object-contain block"
            />
          ) : (
            <div className="w-72 h-72 sm:w-80 sm:h-80 rounded-2xl overflow-hidden border border-dashed border-[#B4846C]/70 shadow-2xl">
              <PressedFlowerPlaceholder accentColor={accentColor} />
            </div>
          )}
        </div>
      );
    }

    // 1. INSTANT POLAROID WITH WASHI TAPE & HANDWRITTEN CAPTION
    if (style === 'polaroid') {
      return (
        <div
          data-testid="photo-zoom-card"
          data-photo-style="polaroid"
          className="relative w-[min(86vw,360px)] rounded-xl pt-5 px-5 pb-6 shadow-[0_24px_64px_rgba(24,18,15,0.42)]"
          style={{
            backgroundColor: frameColor,
            border: '2px solid #D6C7B8',
          }}
        >
          {/* Diagonal Washi Tape Strip at Top */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-3.5 left-1/2 -translate-x-1/2 -rotate-6 w-28 h-8 rounded-[3px] shadow-xs"
            style={{
              backgroundColor: accentColor,
              opacity: 0.8,
              border: '1px solid rgba(255,253,249,0.75)',
            }}
          />
          <div
            className="w-full aspect-[70/66] rounded-[4px] overflow-hidden"
            style={{ border: '1.5px solid #E5D7C8' }}
          >
            {renderPhotoMedia()}
          </div>
          <div
            className="mt-4 min-h-[2.25rem] flex items-center justify-center text-center text-2xl sm:text-[26px] font-semibold leading-snug break-words px-1"
            style={{
              fontFamily: "'Caveat', 'Cormorant Garamond', cursive",
              color: '#2A201D',
            }}
          >
            {caption || '\u00A0'}
          </div>
        </div>
      );
    }

    // 2. PERFORATED POSTAGE STAMP KEEPSAKE
    if (style === 'stamp') {
      return (
        <div
          data-testid="photo-zoom-card"
          data-photo-style="stamp"
          className="relative w-[min(86vw,356px)] rounded-2xl p-3 shadow-[0_24px_64px_rgba(24,18,15,0.42)]"
          style={{
            backgroundColor: frameColor,
            border: `4px dashed ${accentColor}`,
          }}
        >
          <div
            className="relative rounded-lg p-3"
            style={{
              backgroundColor: frameColor,
              border: `1.5px solid ${accentColor}80`,
            }}
          >
            <div className="relative w-full aspect-[66/78] rounded-[4px] overflow-hidden">
              {renderPhotoMedia()}
              {/* Postmark Cancellation Waves Overlay */}
              <svg
                viewBox="0 0 100 100"
                className="pointer-events-none absolute top-2 right-2 w-20 h-20 opacity-80"
                aria-hidden="true"
              >
                <g stroke={accentColor} strokeWidth="2.1" fill="none">
                  <circle cx="64" cy="30" r="18" />
                  <path d="M22,26 Q40,20 58,26 T96,26 M22,36 Q40,30 58,36 T96,36" />
                </g>
              </svg>
              {caption && (
                <div className="pointer-events-none absolute inset-x-4 bottom-3 flex justify-center">
                  <div
                    className="px-4 py-1 rounded-full text-sm sm:text-base font-semibold tracking-wide text-center shadow-xs max-w-full truncate"
                    style={{
                      backgroundColor: frameColor,
                      opacity: 0.94,
                      color: '#2A201D',
                      fontFamily: "'Cormorant Garamond', Georgia, serif",
                    }}
                  >
                    {caption}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // 3. OVAL RIBBON CAMEO LOCKET
    if (style === 'cameo') {
      return (
        <div
          data-testid="photo-zoom-card"
          data-photo-style="cameo"
          className="relative w-[min(84vw,340px)] pt-6 pb-5 flex flex-col items-center"
        >
          {/* Petite Top Ribbon Bow */}
          <svg
            viewBox="-30 -24 60 28"
            className="pointer-events-none w-28 h-12 -mb-4 z-10 overflow-visible"
            aria-hidden="true"
          >
            <path
              d="M-3,-6 C-20,-20 -26,2 -4,-1 Z M3,-6 C20,-20 26,2 4,-1 Z"
              fill={accentColor}
              stroke="#FFFDF9"
              strokeWidth="1.4"
            />
            <circle cx="0" cy="-4" r="3.4" fill={accentColor} stroke="#FFFDF9" strokeWidth="1.2" />
          </svg>

          {/* Oval Cameo Medallion */}
          <div
            className="relative w-full aspect-[41/50] rounded-[50%] p-3 shadow-[0_24px_64px_rgba(24,18,15,0.44)] flex items-center justify-center"
            style={{
              backgroundColor: frameColor,
              border: `3px solid ${accentColor}`,
            }}
          >
            <div
              className="w-full h-full rounded-[50%] p-2.5 flex items-center justify-center"
              style={{
                border: `1.5px dashed ${accentColor}BF`,
              }}
            >
              <div
                className="w-full h-full rounded-[50%] overflow-hidden"
                style={{ border: '2px solid #FFFDF9' }}
              >
                {renderPhotoMedia()}
              </div>
            </div>
          </div>

          {/* Bottom Cameo Caption Plaque */}
          {caption && (
            <div
              className="-mt-5 z-10 px-5 py-1.5 rounded-full text-base sm:text-lg font-semibold tracking-wide shadow-md max-w-[88%] text-center truncate"
              style={{
                backgroundColor: frameColor,
                border: `1.5px solid ${accentColor}`,
                color: '#2A201D',
                fontFamily: "'Cormorant Garamond', Georgia, serif",
              }}
            >
              {caption}
            </div>
          )}
        </div>
      );
    }

    // 4. VINTAGE 35MM FILM FRAME
    if (style === 'film') {
      const sprocketCount = 7;
      return (
        <div
          data-testid="photo-zoom-card"
          data-photo-style="film"
          className="relative w-[min(88vw,372px)] rounded-xl py-4 px-2.5 shadow-[0_24px_64px_rgba(24,18,15,0.44)]"
          style={{
            backgroundColor: frameColor,
            border: `2.5px solid ${accentColor}`,
          }}
        >
          <div className="flex items-stretch gap-2.5">
            {/* Left Sprocket Holes */}
            <div className="flex flex-col justify-between py-1 shrink-0" aria-hidden="true">
              {Array.from({ length: sprocketCount }).map((_, idx) => (
                <span
                  key={`l-${idx}`}
                  className="w-3.5 h-4 rounded-[2px] block"
                  style={{ backgroundColor: '#FFFDF9', opacity: 0.9 }}
                />
              ))}
            </div>

            {/* Film Photo Frame */}
            <div className="flex-1 min-w-0">
              <div
                className="w-full aspect-[62/66] rounded-[3px] overflow-hidden"
                style={{ border: `1.5px solid ${accentColor}99` }}
              >
                {renderPhotoMedia()}
              </div>
              <div
                className="mt-3 text-center text-xs sm:text-sm font-semibold tracking-[0.14em] uppercase truncate px-1"
                style={{
                  color: accentColor,
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}
              >
                {caption || 'KODAK · 24'}
              </div>
            </div>

            {/* Right Sprocket Holes */}
            <div className="flex flex-col justify-between py-1 shrink-0" aria-hidden="true">
              {Array.from({ length: sprocketCount }).map((_, idx) => (
                <span
                  key={`r-${idx}`}
                  className="w-3.5 h-4 rounded-[2px] block"
                  style={{ backgroundColor: '#FFFDF9', opacity: 0.9 }}
                />
              ))}
            </div>
          </div>
        </div>
      );
    }

    // 5. PRESSED BOTANICAL SPECIMEN PLAQUE (OCTAGONAL HERBARIUM FRAME)
    if (style === 'pressed') {
      return (
        <div
          data-testid="photo-zoom-card"
          data-photo-style="pressed"
          className="relative w-[min(86vw,356px)] aspect-[84/98] drop-shadow-[0_24px_48px_rgba(24,18,15,0.45)]"
        >
          <svg viewBox="-46 -52 92 106" className="w-full h-full block">
            <defs>
              <clipPath id={clipId}>
                <polygon points="-27,-42 27,-42 36,-33 36,33 27,42 -27,42 -36,33 -36,-33" />
              </clipPath>
            </defs>
            <polygon
              points="-31,-48 31,-48 42,-37 42,39 31,50 -31,50 -42,39 -42,-37"
              fill={frameColor}
              stroke={accentColor}
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {hasImage ? (
              <image
                href={item.photoDataUrl}
                x="-36"
                y="-42"
                width="72"
                height="84"
                preserveAspectRatio="xMidYMid slice"
                clipPath={`url(#${clipId})`}
              />
            ) : (
              <g clipPath={`url(#${clipId})`}>
                <rect x="-36" y="-42" width="72" height="84" fill="#F5EBE1" />
                <circle cx="16" cy="-18" r="8" fill={accentColor} opacity="0.32" />
                <path d="M-36,24 Q-10,5 13,22 T36,18 L36,42 L-36,42 Z" fill="#DECBB9" opacity="0.7" />
              </g>
            )}
            <polygon
              points="-27,-42 27,-42 36,-33 36,33 27,42 -27,42 -36,33 -36,-33"
              fill="none"
              stroke={accentColor}
              strokeWidth="1"
              opacity="0.72"
            />
            {/* Corner Herbarium Brass Mounting Clips */}
            <path
              d="M-36,-29 L-23,-42 M23,-42 L36,-29 M-36,29 L-23,42 M23,42 L36,29"
              stroke={accentColor}
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          {caption && (
            <div className="pointer-events-none absolute inset-x-10 bottom-[13%] flex justify-center">
              <div
                className="px-4 py-1 rounded-md text-sm sm:text-base font-semibold text-center shadow-xs max-w-full truncate"
                style={{
                  backgroundColor: frameColor,
                  opacity: 0.94,
                  color: '#2A201D',
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                }}
              >
                {caption}
              </div>
            </div>
          )}
        </div>
      );
    }

    // 6. ATELIER ARCHED PORTRAIT CARD WITH WAX SEAL
    return (
      <div
        data-testid="photo-zoom-card"
        data-photo-style="arch"
        className="relative w-[min(84vw,346px)] rounded-t-[999px] rounded-b-2xl pt-4 px-4 pb-5 shadow-[0_24px_64px_rgba(24,18,15,0.44)]"
        style={{
          backgroundColor: frameColor,
          border: `2.5px solid ${accentColor}`,
        }}
      >
        <div
          className="w-full aspect-[68/78] rounded-t-[999px] rounded-b-md overflow-hidden p-1.5"
          style={{
            border: `1.5px dashed ${accentColor}B3`,
          }}
        >
          <div className="w-full h-full rounded-t-[999px] rounded-b-sm overflow-hidden">
            {renderPhotoMedia()}
          </div>
        </div>
        <div className="mt-3.5 px-2 flex items-center justify-center gap-3">
          {/* Petite Wax Seal on Arch Base */}
          <span
            aria-hidden="true"
            className="w-6 h-6 rounded-full shrink-0 shadow-xs"
            style={{
              backgroundColor: accentColor,
              border: '2px solid #FFFDF9',
            }}
          />
          {caption && (
            <span
              className="text-lg sm:text-xl font-semibold tracking-wide truncate"
              style={{
                color: '#2A201D',
                fontFamily: "'Cormorant Garamond', Georgia, serif",
              }}
            >
              {caption}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={caption ? `Photo keepsake: ${caption}` : 'Photo keepsake'}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card-zoom-modal relative flex flex-col items-center max-w-full max-h-[90vh]"
      >
        {/* Clean Floating Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close photo"
          className={`absolute -top-3 -right-3 z-20 w-9 h-9 rounded-full border border-dashed flex items-center justify-center shadow-lg transition active:scale-95 cursor-pointer ${
            isDarkMode
              ? 'bg-[#352C29] border-[#5E4E49] text-[#FBF6F1] hover:bg-[#443834]'
              : 'bg-[#FFFDF9] border-[#DECBB9] text-[#2A201D] hover:bg-[#FAF4EE]'
          }`}
        >
          <X className="w-4 h-4" />
        </button>

        {/* The Exact Photocard Design */}
        {renderStyledCard()}

        {/* Minimal Footer Controls (Multi-photo navigation if 2+ photos, plus subtle Close button) */}
        <div className="mt-4 flex items-center justify-center gap-2.5">
          {hasMultiple && (
            <div
              className={`inline-flex items-center gap-1 px-1.5 py-1 rounded-full border border-dashed backdrop-blur-md shadow-md ${
                isDarkMode
                  ? 'bg-[#352C29]/95 border-[#5E4E49] text-[#FBF6F1]'
                  : 'bg-[#FFFDF9]/95 border-[#DECBB9] text-[#2A201D]'
              }`}
            >
              <button
                type="button"
                onClick={() => handleStep(-1)}
                aria-label="Previous photo"
                className={`w-7 h-7 rounded-full flex items-center justify-center transition active:scale-95 cursor-pointer ${
                  isDarkMode ? 'hover:bg-[#463A36]' : 'hover:bg-[#FAF4EE]'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 text-xs font-medium tabular-nums">
                {activeIndex + 1} / {photoList.length}
              </span>
              <button
                type="button"
                onClick={() => handleStep(1)}
                aria-label="Next photo"
                className={`w-7 h-7 rounded-full flex items-center justify-center transition active:scale-95 cursor-pointer ${
                  isDarkMode ? 'hover:bg-[#463A36]' : 'hover:bg-[#FAF4EE]'
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-1.5 rounded-full text-xs font-medium border border-dashed shadow-md transition active:scale-95 cursor-pointer ${
              isDarkMode
                ? 'bg-[#352C29]/95 border-[#5E4E49] text-[#FBF6F1] hover:bg-[#463A36]'
                : 'bg-[#FFFDF9]/95 border-[#DECBB9] text-[#2A201D] hover:bg-[#FAF4EE]'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
