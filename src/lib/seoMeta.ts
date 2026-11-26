// ============================================================================
// SEO & DYNAMIC METADATA MANAGER (`https://www.sendabouquet.online/`)
// ============================================================================

import {
  ENVIRONMENT_CATALOG,
  FLOWER_CATALOG,
  PHOTO_FRAME_CATALOG,
  RIBBON_STYLE_CATALOG,
  VOICE_KEEPSAKE_CATALOG,
  WRAPPER_CATALOG,
} from '../types/bouquet';

export type SeoPageMode = 'landing' | 'studio' | 'garland' | 'gift' | 'admin';

const CANONICAL_ORIGIN = 'https://www.sendabouquet.online';

export interface LiveStudioCatalogCounts {
  /** Focal blooms + botanical fillers/foliage (!isOther && !isSeasonal), currently 51 */
  botanicalStemCount: number;
  /** Focal flower blooms (!isFoliage && !isFiller && !isOther && !isSeasonal), currently 33 */
  focalBloomCount: number;
  /** Botanical fillers & foliage, currently 18 */
  fillerStemCount: number;
  /** Whimsical, romantic & celestial accent picks (isOther), currently 20 */
  otherAccentCount: number;
  /** Seasonal catalog designs (isSeasonal), currently 12 */
  seasonalCount: number;
  /** Total items in FLOWER_CATALOG, currently 83 */
  totalCatalogCount: number;
  /** Wrapper styles in WRAPPER_CATALOG, currently 12 */
  wrapperCount: number;
  /** Ribbon styles in RIBBON_STYLE_CATALOG, currently 12 */
  ribbonCount: number;
  /** Voice keepsakes in VOICE_KEEPSAKE_CATALOG, currently 10 */
  voiceKeepsakeCount: number;
  /** Photo frames in PHOTO_FRAME_CATALOG, currently 6 */
  photoFrameCount: number;
  /** Background environments in ENVIRONMENT_CATALOG, currently 14 */
  environmentCount: number;
}

/**
 * Computes live catalog counts directly from FLOWER_CATALOG and studio catalogs
 * so UI copy, meta descriptions, and JSON-LD structured data never drift out of sync.
 */
export function getLiveStudioCatalogCounts(): LiveStudioCatalogCounts {
  const focalBloomCount = FLOWER_CATALOG.filter(
    (f) => !f.isFoliage && !f.isFiller && !f.isOther && !f.isSeasonal
  ).length;
  const fillerStemCount = FLOWER_CATALOG.filter(
    (f) => Boolean(f.isFoliage || f.isFiller) && !f.isOther && !f.isSeasonal
  ).length;
  const otherAccentCount = FLOWER_CATALOG.filter((f) => Boolean(f.isOther)).length;
  const seasonalCount = FLOWER_CATALOG.filter((f) => Boolean(f.isSeasonal)).length;

  return {
    botanicalStemCount: focalBloomCount + fillerStemCount,
    focalBloomCount,
    fillerStemCount,
    otherAccentCount,
    seasonalCount,
    totalCatalogCount: FLOWER_CATALOG.length,
    wrapperCount: WRAPPER_CATALOG.length,
    ribbonCount: RIBBON_STYLE_CATALOG.length,
    voiceKeepsakeCount: VOICE_KEEPSAKE_CATALOG.length,
    photoFrameCount: PHOTO_FRAME_CATALOG.length,
    environmentCount: ENVIRONMENT_CATALOG.length,
  };
}

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

  if (raw === '/studio' || raw === '/create' || raw === '/create-bouquet') return 'studio';
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

export function buildLiveSchemaJsonLd(counts = getLiveStudioCatalogCounts()) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${CANONICAL_ORIGIN}/#website`,
        url: `${CANONICAL_ORIGIN}/`,
        name: 'Send A Bouquet',
        alternateName: [
          'Send A Bouquet Online',
          'Digital Flower Bouquet Studio',
          'Virtual Flower Bouquet Maker',
        ],
        description: `Craft and send a custom digital flower bouquet online with ${counts.botanicalStemCount} botanical stems, couture wraps, ribbons, photo frames, a handwritten letter, and a recorded voice keepsake.`,
        inLanguage: 'en',
        hasPart: [
          { '@id': `${CANONICAL_ORIGIN}/studio#sitelink` },
          { '@id': `${CANONICAL_ORIGIN}/garland#sitelink` },
          { '@id': `${CANONICAL_ORIGIN}/#how-it-works-sitelink` },
          { '@id': `${CANONICAL_ORIGIN}/#faq-sitelink` },
        ],
        potentialAction: [
          {
            '@type': 'CreateAction',
            name: 'Create a Bouquet',
            target: `${CANONICAL_ORIGIN}/studio`,
          },
          {
            '@type': 'SearchAction',
            target: {
              '@type': 'EntryPoint',
              urlTemplate: `${CANONICAL_ORIGIN}/garland?q={search_term_string}`,
            },
            'query-input': 'required name=search_term_string',
          },
        ],
      },
      {
        '@type': 'SiteNavigationElement',
        '@id': `${CANONICAL_ORIGIN}/studio#sitelink`,
        position: 1,
        name: 'Create a Bouquet',
        description: `Arrange ${counts.botanicalStemCount} botanical stems, couture wraps, ribbons, photo frames, a handwritten letter, and a voice keepsake.`,
        url: `${CANONICAL_ORIGIN}/studio`,
      },
      {
        '@type': 'SiteNavigationElement',
        '@id': `${CANONICAL_ORIGIN}/garland#sitelink`,
        position: 2,
        name: 'Shared Creations',
        description: 'Explore custom digital flower bouquets and floral keepsakes on the Lace Garland.',
        url: `${CANONICAL_ORIGIN}/garland`,
      },
      {
        '@type': 'SiteNavigationElement',
        '@id': `${CANONICAL_ORIGIN}/#how-it-works-sitelink`,
        position: 3,
        name: 'How It Works',
        description: `Pick & wrap ${counts.botanicalStemCount} botanical stems, record a voice keepsake, and send an instant gift link or QR code.`,
        url: `${CANONICAL_ORIGIN}/#how-it-works`,
      },
      {
        '@type': 'SiteNavigationElement',
        '@id': `${CANONICAL_ORIGIN}/#faq-sitelink`,
        position: 4,
        name: 'FAQ',
        description: 'Frequently asked questions about free bouquets, Couture passes, voice notes, and secret locks.',
        url: `${CANONICAL_ORIGIN}/#faq`,
      },
      {
        '@type': 'WebApplication',
        '@id': `${CANONICAL_ORIGIN}/#webapp`,
        name: 'Send A Bouquet',
        url: `${CANONICAL_ORIGIN}/`,
        applicationCategory: 'LifestyleApplication',
        applicationSubCategory: 'Digital Greeting & Virtual Flower Studio',
        operatingSystem: 'All',
        browserRequirements: 'Requires HTML5 and JavaScript',
        isAccessibleForFree: true,
        image: `${CANONICAL_ORIGIN}/og-preview.png`,
        description:
          'Interactive digital flower studio where anyone can arrange custom botanical bouquets, wrap them in kraft parchment or velvet hatboxes, attach Polaroid photo frames, write a handwritten card note, and record a voice keepsake to share via gift link or QR code.',
        featureList: [
          `${counts.botanicalStemCount} customizable botanical flower stems and foliage fillers (${counts.totalCatalogCount} total studio items including keepsake picks and seasonal designs)`,
          `${counts.wrapperCount} couture wrapping styles including Kraft Paper, Velvet Hatbox, Glass Cloche, and Korean Cloud Mesh`,
          `${counts.ribbonCount} bespoke ribbon styles including Satin Bow, Eyelet Lace, Akoya Pearl, and Gold Chain`,
          'Handwritten letterpress greeting card with wax seal unwrapping',
          `${counts.voiceKeepsakeCount} recorded voice keepsakes including Mixtape, Vinyl Record, Plushie, Music Box, and Heart Locket`,
          `${counts.photoFrameCount} personal photo frames including Polaroid, Postage Stamp, Cameo, 35mm Film, and Herbarium`,
          'Time-Capsule Countdown Lock and Secret Question Lock for surprise reveals',
          'Shareable gift links and custom botanical QR codes',
        ],
        offers: [
          {
            '@type': 'Offer',
            name: 'Free Digital Bouquet Studio',
            price: '0.00',
            priceCurrency: 'USD',
            availability: 'https://schema.org/InStock',
            description:
              'Craft and share unlimited digital flower bouquets with signature stems, wraps, ribbons, and a 560-character handwritten card note for free.',
          },
          {
            '@type': 'Offer',
            name: 'Couture Bouquet Unlock & Studio Pass',
            price: '1.99',
            priceCurrency: 'USD',
            availability: 'https://schema.org/InStock',
            description:
              'Unlock couture blooms, luxury wraps, photo frames, recorded voice keepsakes, 1,500-character letters, 90-day or eternal gallery showcase, and permanent recipient gift links.',
          },
        ],
      },
      {
        '@type': 'HowTo',
        '@id': `${CANONICAL_ORIGIN}/#howto`,
        name: 'How to Craft and Send a Digital Flower Bouquet Online',
        description:
          'Create a custom virtual flower bouquet with a handwritten card and voice note in three simple steps.',
        step: [
          {
            '@type': 'HowToStep',
            position: 1,
            name: 'Arrange Your Stems',
            text: `Pick from ${counts.botanicalStemCount} signature and couture botanical stems, recolor petals, and position each flower on the interactive botanical stage.`,
          },
          {
            '@type': 'HowToStep',
            position: 2,
            name: 'Wrap & Record a Keepsake',
            text: 'Dress your bouquet in kraft paper, silk tissue, a velvet hatbox, or a glass cloche, write a heartfelt card note, and record a personal voice message or attach photo frames.',
          },
          {
            '@type': 'HowToStep',
            position: 3,
            name: 'Seal & Send the Surprise',
            text: 'Seal your bouquet with a wax stamp to generate a shareable gift link or botanical QR code, with an optional countdown timer or secret question lock.',
          },
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': `${CANONICAL_ORIGIN}/#faq`,
        mainEntity: [
          {
            '@type': 'Question',
            name: 'Is it free to craft and share bouquets?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes! You can arrange and share unlimited classic digital and virtual bouquets with signature flowers, wraps, ribbons, and a handwritten card note completely for free. Every recipient gift link stays active permanently, while free bouquets appear in the Shared Creations gallery for 30 days.',
            },
          },
          {
            '@type': 'Question',
            name: 'What comes with a Couture Pass or Single Bouquet unlock?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Unlocking a Single Bouquet ($1.99 for 1 premium bouquet), 7-Day Pass ($3.99 for unlimited bouquets over 7 days), or 30-Day Pass ($6.99 for unlimited bouquets over 30 days) gives you glimmering luxury blooms, couture wraps & ribbons, photocards, voice keepsakes, longer 1,500-character notes, high-resolution PNG downloads, 90-day Shared Creations gallery visibility (or eternal showcase on 30-Day Pass), and permanent recipient gift links.',
            },
          },
          {
            '@type': 'Question',
            name: 'Can I add photos and a recorded voice message?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes! You can upload personal photos into Polaroid, Postage, Cameo, 35mm Film, or Herbarium frames—either tucked inside the bouquet or floating freely—and record your voice into a Mixtape, Vinyl, Plushie, Music Box, or Locket.',
            },
          },
          {
            '@type': 'Question',
            name: 'How do gift links, QR codes, and secret locks work?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'When you seal a bouquet, you receive a shareable link and a customizable botanical QR code with our floral emblem in the center. You can also lock the reveal behind a live date countdown or a secret question.',
            },
          },
          {
            '@type': 'Question',
            name: 'Do I need an account to save drafts or use my pass?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'No account or login is ever required. Your saved bouquets live privately on your device, and your portable BLOOM-XXXX-XXXX pass key can be restored anytime across devices.',
            },
          },
        ],
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${CANONICAL_ORIGIN}/#breadcrumbs`,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Send A Bouquet',
            item: `${CANONICAL_ORIGIN}/`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Create a Bouquet',
            item: `${CANONICAL_ORIGIN}/studio`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: 'Shared Creations',
            item: `${CANONICAL_ORIGIN}/garland`,
          },
        ],
      },
    ],
  };
}

export function syncDocumentSeoMeta(options: {
  mode: SeoPageMode;
  recipientName?: string;
}): void {
  if (typeof document === 'undefined') return;

  const counts = getLiveStudioCatalogCounts();

  let title = 'Send A Bouquet — Craft & Send a Custom Digital Flower Bouquet Online';
  let description = `Craft and send a custom digital flower bouquet online for free. Arrange ${counts.botanicalStemCount} botanical stems, couture wraps, ribbons, photo frames, a handwritten greeting card, and a recorded voice keepsake—sealed into a shareable gift link or QR code.`;
  let canonicalUrl = `${CANONICAL_ORIGIN}/`;
  let robots = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
  let ogImageUrl = `${CANONICAL_ORIGIN}/og-preview.png`;
  let ogImageHeight = '1260';

  switch (options.mode) {
    case 'studio':
      title = 'Create a Bouquet — Custom Digital Flower Studio | Send A Bouquet';
      description = `Arrange ${counts.botanicalStemCount} botanical flower stems, choose kraft paper or velvet hatbox wrapping, attach Polaroid photo frames, write a handwritten card note, and record a voice keepsake.`;
      canonicalUrl = `${CANONICAL_ORIGIN}/studio`;
      break;
    case 'garland':
      title = 'Shared Creations — On the Lace Garland | Send A Bouquet';
      description =
        'Explore custom digital flower bouquets, handwritten notes, and floral keepsakes arranged and shared by visitors on the Lace Garland.';
      canonicalUrl = `${CANONICAL_ORIGIN}/garland`;
      break;
    case 'gift': {
      title = 'Someone sent you a bouquet';
      description = 'Tap to unwrap.';
      canonicalUrl =
        typeof window !== 'undefined' && window.location.pathname && window.location.pathname !== '/'
          ? `${CANONICAL_ORIGIN}${window.location.pathname}`
          : `${CANONICAL_ORIGIN}/`;
      ogImageUrl = `${CANONICAL_ORIGIN}/og-gift-bloom.png`;
      ogImageHeight = '630';
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
  setMetaAttr('meta[property="og:image"]', 'content', ogImageUrl);
  setMetaAttr('meta[property="og:image:secure_url"]', 'content', ogImageUrl);
  setMetaAttr('meta[property="og:image:height"]', 'content', ogImageHeight);
  setMetaAttr('meta[name="twitter:title"]', 'content', title);
  setMetaAttr('meta[name="twitter:description"]', 'content', description);
  setMetaAttr('meta[name="twitter:url"]', 'content', canonicalUrl);
  setMetaAttr('meta[name="twitter:image"]', 'content', ogImageUrl);

  // Dynamically synchronize the Schema.org JSON-LD script in <head> with live catalog counts
  const schemaScript =
    document.getElementById('schema-json-ld') ||
    document.querySelector('script[type="application/ld+json"]');
  if (schemaScript) {
    schemaScript.textContent = JSON.stringify(buildLiveSchemaJsonLd(counts));
  }
}


