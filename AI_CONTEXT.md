# SEND A BOUQUET — AI CONTEXT, ARCHITECTURE & DESIGN CONSTITUTION

> **Purpose of this file**: Single-file compressed memory for AI agents & developers working on **Send A Bouquet** (`https://www.sendabouquet.online/`). Read this file first before making any UI/UX, architecture, or monetization changes.

---

## 1. BRAND PERSONALITY & STRICT DESIGN CONSTITUTION

### Core Aesthetic Identity
- **Vibe**: Parisian couture floristry meets fine letterpress stationery — **minimal, luxury, prestige, cute, and soft**.
- **Visual-First, Never Text-Heavy**: Show, don't lecture. Replace paragraphs, explainers, and multi-line helper text with clean visual cards, botanical line-art illustrations, and intuitive step flows.

### Strict Anti-Patterns (NEVER DO THESE)
1. **NO Unnecessary Eyebrow Labels**: Do not place small uppercase "eyebrow" text (`STEP 1`, `MOST POPULAR`, `WEEK ACCESS`, `COUTURE PASS`, etc.) above headings or inside cards. Let the title and visual speak for itself.
2. **NO Random Emojis**: Never scatter emojis (`✨`, `🌸`, `🎉`, `🔒`, `💎`, `🚀`) in headings, buttons, toasts, or body copy. Use custom fine-line botanical SVGs (`CoutureBloomSeal`, `BrandLogoMark`, line-art icons) or Lucide icons with `1.5px` stroke weight.
3. **NO Wall-of-Text Modals**: Never cram multiple workflows or long explanations into a single modal. Use progressive disclosure (e.g., 3-step horizontal stationery progress bars) or compact visual grids.
4. **NO Unorganized or Cluttered CTAs**: Every view/modal should have **1 clear primary action** and at most **1 quiet secondary action**. Never stack 3–4 competing buttons in a footer.
5. **NO Inconsistent Borders, Radii, or Colors**: Every modal, card, and input must strictly follow the warm parchment & espresso palette and dashed-stitching stationery language below.

### Typography System
- **Display / Headings / Botanical Titles**: `'Cormorant Garamond', Georgia, serif` (`font-medium` or `font-semibold`, tight tracking, graceful proportions).
- **UI Controls / Labels / Inputs**: `'Inter', system-ui, sans-serif` (`text-xs` / `11px`–`13px`, clean and legible).
- **Handwritten Greeting Card Notes**: `'Caveat', cursive` (used strictly on the greeting card note itself).
- **Monospace Keys (`BLOOM-XXXX-XXXX`)**: `font-mono tracking-wider`.

### Color Palette & Surface Tokens
- **Light Mode (Warm Cream Parchment)**:
  - Primary Surface: `#FFFDF9` / `#FAFAF8`
  - Secondary / Recessed Card Surface: `#FAF4EE`
  - Dashed Stationery Borders: `border-dashed border-[#DECBB9]` / `border-[#E2D1C1]`
  - Primary Espresso Ink: `#2A201D` / `#231C18`
  - Muted Warm Taupe Text: `#7D6B60` / `#8C7A70`
  - Primary Button Fill: `bg-[#6E4434] text-[#FFFDF9] hover:bg-[#5B3729]`
  - Warm Terracotta / Gold Accent: `#B4846C`
- **Dark Mode (Velvet Espresso)**:
  - Primary Surface: `#352C29` / `#2B2321`
  - Secondary / Recessed Card Surface: `#2D2421`
  - Dashed Stationery Borders: `border-dashed border-[#5E4E49]` / `border-[#544540]`
  - Primary Cream Ink: `#FBF6F1`
  - Muted Warm Text: `#C8B6AC` / `#A8968C`
  - Primary Button Fill: `bg-[#E6B89C] text-[#231C18] hover:bg-[#F0C8B0]`

---

## 2. PRODUCT & UX FLOWS

### A. Studio Workspace (`/src/components/BouquetStudioApp.tsx`)
- **31 Hand-Crafted SVG Botanicals** (`19` focal flowers + `12` foliage/fillers), `12` wrapper styles, `10` ribbon styles, `8` greeting card themes, `5` interactive voice keepsake styles (live mic recording only — no file upload), and `4` starter templates.
- **Top Header Bar**:
  - Left: Brand logo & wordmark (`Send A Bouquet` -> returns to editorial Landing Page).
  - Center Capsule: `Undo`, `Redo`, `Save Draft` (saves draft locally on device for any user), `Reset`.
  - Right Controls: `Premium` button (`[data-testid="studio-pass-header-btn"]`), `Saved Bouquets` vault button, Music Box toggle, Dark/Light theme toggle, and `Share` button.
- **Drafts vs. Shared Creations**:
  - **Any user** (free or paid) can save their draft on their own device (`Save Draft`) and resume/edit it inside `Saved Bouquets` (`BouquetVaultModal.tsx`).
  - **Shared Creations** on the public Lace Garland (and recipient gift links) are **strictly view-only** so strangers can never edit or overwrite someone else's sent bouquet.

### B. 3-Step "Send Your Bouquet" Modal (`BouquetStudioApp.tsx`)
- Inspired by clean step-by-step stationery progress (`1. Dedication` -> `2. Unwrap` -> `3. Seal Gift` -> `Ready`):
  1. **Step 1 (`Dedication`)**: `For`, `From`, and `Card Note` (`maxLength={22}`, `20`, `86` aligned with SVG tag rendering).
  2. **Step 2 (`Unwrap`)**: Choose `Anytime` (instant), `Date Lock` (countdown timer), or `Secret Hint` (passcode question & answer) **before** sealing so locks cannot be altered after payment.
  3. **Step 3 (`Seal Gift`)**: Shows gift link lifespan badge (`30 Days Free`, `90 Days`, or `Never Expires`), couture pieces used (if any), and two clean checkboxes:
     - `Display on Shared Creations lace` (optional)
     - `Confirm final design (resets studio after sealing)`
  4. **Sealed (`Ready`)**: Reveals the short gift link (`https://www.sendabouquet.online/<code>`) + `Copy Link` + `Save PNG` **only after** sealing (and after payment if couture items were used).
- **Anti-Exploit for Single Bouquet Tier**: Sealing a `Single Bouquet` (`₱49` / `$2.99`) binds strictly to that single `bouquetCode`, reveals the sealed link + PNG download, clears any reusable pass from storage, and resets the studio canvas when closed so a buyer cannot reuse a single-bouquet unlock for unlimited bouquets.

### C. "Unlock Premium" Modal (`/src/components/StudioCheckoutModal.tsx`)
- **3 Horizontal Visual Pass Cards (`grid-cols-3`)** with 1:1 minimal botanical line-art covers:
  1. **Single** (`/assets/kofi-shop/single-bouquet-lineart.jpg`): `₱49` (PH) / `$2.99` (INTL) — `1 bouquet + PNG · 90-day link`
  2. **7-Day Pass** (`/assets/kofi-shop/7-day-pass-lineart.jpg`): `₱99` (PH) / `$4.99` (INTL) — `Unlimited · 90-day links + Bloom Key`
  3. **30-Day Eternal** (`/assets/kofi-shop/30-day-eternal-lineart.jpg`): `₱199` (PH) / `$8.99` (INTL) — `Unlimited · Links never expire + Bloom Key`
- **Payment Methods by Region**:
  - **Philippines (`PH`)**: Shows **one** unified method: **`QR Ph · GCash · Maya`** (via PayMongo), with automatic fallback to Ko-fi Shop if `PAYMONGO_SECRET_KEY` is not set.
  - **International (`INTL`)**: Uses **Ko-fi Shop** (`https://ko-fi.com/luxinnamon`) direct item links (`/s/<code>`).

---

## 3. KO-FI SHOP & VERCEL MONETIZATION ARCHITECTURE (`/api/_lib/paymentHandler.js`)

### How Ko-fi Shop Verification Works (Zero Custom Backend Database Required beyond Firestore REST)
1. **Strict `Shop Order` Enforcement**:
   - Webhook endpoint: `POST https://www.sendabouquet.online/api/webhooks/kofi`
   - Rejects generic tips (`Donation`) and monthly subscriptions (`Subscription`). Only accepts `type === 'Shop Order'`.
2. **Tier Mapping via `direct_link_code`**:
   - Reads `shop_items[].direct_link_code` from the Ko-fi webhook and matches it against Vercel Environment Variables:
     - `KOFI_SHOP_SINGLE_CODE` -> `single`
     - `KOFI_SHOP_7D_CODE` -> `pass_7d`
     - `KOFI_SHOP_30D_CODE` -> `pass_30d`
     - `KOFI_SHOP_TEST_CODE` -> Universal `$0` test product code that unlocks **all 3 tiers** (`['single', 'pass_7d', 'pass_30d']`) simultaneously for testing.
3. **Email-Bound Deterministic Receipt Slot (`BLOOM-KSXX-XXXX`)**:
   - Uses `parsed.email` (the **email address typed into Ko-fi's checkout form**, case-insensitive, **not** `from_name`/nickname).
   - Computes `deriveKofiEmailTierSlotKey(buyerEmail, tier)` -> `BLOOM-KSXX-XXXX` and writes a signed receipt record to Firestore `studio_passes/BLOOM-KSXX-XXXX`.
   - When the user clicks **`Verify Email & Unlock`** in `StudioCheckoutModal`, the server checks `deriveKofiEmailTierSlotKey(buyerEmail, requestedTier)` so a `$2.99` Single Bouquet receipt can never unlock a 7-Day or 30-Day Pass, and can only be claimed once (`CLAIMED:<passKey>`).

### Required Vercel Environment Variables
```text
KOFI_VERIFICATION_TOKEN=<token from Ko-fi Webhooks settings>
KOFI_PAGE_URL=https://ko-fi.com/luxinnamon
KOFI_SHOP_TEST_CODE=<10-char code or URL for $0 test product>
KOFI_SHOP_SINGLE_CODE=<10-char code or URL for $2.99 Single Bouquet>
KOFI_SHOP_7D_CODE=<10-char code or URL for $4.99 7-Day Pass>
KOFI_SHOP_30D_CODE=<10-char code or URL for $8.99 30-Day Eternal Pass>
PASS_SIGNING_SECRET=<random secret string>
```

---

## 4. KEY FILES & TEST COMMANDS

### Key Files
- `/src/types/bouquet.ts` — Botanical, wrapper, ribbon, card, voice keepsake catalogs & data types.
- `/src/components/BouquetStudioApp.tsx` — Main Studio workspace, recipient unwrap stage, 3-step `Send Your Bouquet` modal, and device draft saving.
- `/src/components/StudioCheckoutModal.tsx` — 3-column horizontal `Unlock Premium` modal, PH/INTL PPP toggle, Ko-fi email verification, and Pass Key redemption.
- `/src/components/BouquetVaultModal.tsx` — Device-local `Saved Bouquets` modal (`+ Save Draft`, `Resume Draft`, `Copy Link`, open receipts).
- `/src/components/LandingPageView.tsx` — Editorial landing page with interactive single-strand catenary Lace Garland showcase.
- `/src/lib/monetization.ts` — Client-side pass verification, couture asset inspection, device token hashing, and retention policy helpers.
- `/api/_lib/paymentHandler.js` — Serverless checkout creation, PayMongo & Ko-fi Shop webhook verification, and Firestore REST persistence.

### Verification Commands (Must Pass Before Every Deploy)
1. **Unit & Responsive Suite**:
   `npx --yes tsx --test src/lib/monetization.test.ts src/lib/showcaseGallery.test.ts src/lib/dofParallax.test.ts && node test_responsive_studio.mjs`
   *(Note: Never leave `.env.example`, `DRAFT_firestore.rules`, or `security_spec.md` in the root directory, as `test_responsive_studio.mjs` enforces repo cleanliness).*
2. **TypeScript & Production Build**:
   `npm run build`
