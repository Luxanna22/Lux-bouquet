// ============================================================================
// SEO & DYNAMIC METADATA MANAGER (`https://www.sendabouquet.online/`)
// ============================================================================

export type SeoPageMode = 'landing' | 'studio' | 'garland' | 'gift' | 'admin';

const CANONICAL_ORIGIN = 'https://www.sendabouquet.online';

export function detectInitialSeoRoute(pathname?: string): 'landing' | 'studio' | 'garland' {
  const raw = (
    pathname !== undefined
      ? pathname
      : typeof window !== 'undefined'
      ? window.location.pathname
      : '/'
  )
    .split('?')[0]
    .split('#')[0]
    .replace(/\/+$/, '')
    .toLowerCase();

  if (raw === '/studio') return 'studio';
  if (raw === '/garland' || raw === '/creations' || raw === '/showcase') return 'garland';
  return 'landing';
}

export function extractGarlandQueryParam(search?: string): string {
  const raw =
    search !== undefined
      ? search
      : typeof window !== 'undefined'
      ? window.location.search
      : '';
  if (!raw) return '';
  try {
    const params = new URLSearchParams(raw);
    return (params.get('q') || '').trim().slice(0, 64);
  } catch {
    return '';
  }
}

export function syncDocumentSeoMeta(options: {
  mode: SeoPageMode;
  recipientName?: string;
}): void {
  if (typeof document === 'undefined') return;

  let title = 'Send A Bouquet — Craft & Send a Custom Digital Flower Bouquet Online';
  let description =
    'Craft and send a custom digital flower bouquet online for free. Arrange 36 botanical stems, couture wraps, ribbons, photo frames, a handwritten greeting card, and a recorded voice keepsake—sealed into a shareable gift link or QR code.';
  let canonicalUrl = `${CANONICAL_ORIGIN}/`;
  let robots = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

  switch (options.mode) {
    case 'studio':
      title = 'Botanical Studio — Craft a Custom Digital Flower Bouquet | Send A Bouquet';
      description =
        'Arrange 36 botanical flower stems, choose kraft paper or velvet hatbox wrapping, attach Polaroid photo frames, write a handwritten card note, and record a voice keepsake.';
      canonicalUrl = `${CANONICAL_ORIGIN}/studio`;
      break;
    case 'garland':
      title = 'On the Lace Garland — Shared Digital Flower Bouquets | Send A Bouquet';
      description =
        'Explore custom digital flower bouquets, handwritten notes, and floral keepsakes arranged and shared by visitors on the Lace Garland.';
      canonicalUrl = `${CANONICAL_ORIGIN}/garland`;
      break;
    case 'gift': {
      const cleanRecipient = (options.recipientName || '').trim();
      title =
        cleanRecipient && cleanRecipient.toLowerCase() !== 'my dearest'
          ? `A Floral Keepsake For ${cleanRecipient} | Send A Bouquet`
          : 'A Sealed Floral Keepsake For You | Send A Bouquet';
      description =
        'Someone arranged a custom digital flower bouquet for you. Slide to unwrap your blooms, read your handwritten letter, and listen to your keepsake.';
      canonicalUrl = `${CANONICAL_ORIGIN}/`;
      // Personal shared bouquet links remain unindexed to protect recipient privacy and prevent duplicate thin pages
      robots = 'noindex, nofollow';
      break;
    }
    case 'admin':
      title = 'Send A Bouquet';
      robots = 'noindex, nofollow, noarchive';
      break;
    case 'landing':
    default:
      break;
  }

  document.title = title;

  const setMetaAttr = (selector: string, attr: string, value: string) => {
    const el = document.querySelector(selector);
    if (el) el.setAttribute(attr, value);
  };

  setMetaAttr('meta[name="description"]', 'content', description);
  setMetaAttr('meta[name="robots"]', 'content', robots);
  setMetaAttr('meta[name="googlebot"]', 'content', robots);
  setMetaAttr('link[rel="canonical"]', 'href', canonicalUrl);
  setMetaAttr('meta[property="og:title"]', 'content', title);
  setMetaAttr('meta[property="og:description"]', 'content', description);
  setMetaAttr('meta[property="og:url"]', 'content', canonicalUrl);
  setMetaAttr('meta[name="twitter:title"]', 'content', title);
  setMetaAttr('meta[name="twitter:description"]', 'content', description);
  setMetaAttr('meta[name="twitter:url"]', 'content', canonicalUrl);
}

