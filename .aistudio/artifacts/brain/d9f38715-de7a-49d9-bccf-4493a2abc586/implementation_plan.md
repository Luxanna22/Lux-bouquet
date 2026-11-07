# Persistent Voice & Bouquet Storage + On-Canvas Card & Keepsake Resizing

This update introduces a persistent Firebase Firestore database so shared bouquets, short links, greeting cards, and recorded voice keepsakes reliably load for any recipient across devices and Vercel serverless instances, alongside intuitive on-canvas dragging and corner-handle resizing for both the greeting card and voice keepsake.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and UX choices were confirmed during clarification:

- **Confirmed Decision 1 — Database Provider**: **Firebase Firestore** will serve as the primary persistent database for shared bouquets, short codes, greeting card messages, and recorded voice audio, ensuring zero data loss across Vercel serverless invocations and AI Studio previews.
- **Confirmed Decision 2 — Card & Voice Keepsake Resize Controls**: **On-canvas drag and corner resize handle only**. Selecting either the greeting card or the voice keepsake on the main bouquet stage reveals a tactile selection ring with a bottom-right corner resize handle, without cluttering the sidebars with extra scale sliders.

---

## 1. Overview & Core Concept

- **What It Does**:
  1. **Cross-Device Voice & Bouquet Persistence**: When a creator generates a share link for their bouquet, the complete bouquet snapshot—including all floral layers, custom colors, greeting card text, and the authentic recorded voice audio—is saved to a structured Firebase Firestore collection indexed by its 7-character short code. When a recipient opens the link on any phone or desktop browser, the app retrieves the complete bouquet and voice recording directly from Firestore.
  2. **Effortless On-Canvas Card & Voice Keepsake Manipulation**: Both the greeting card (including the default unopened "Sealed Letter" envelope and all open card themes) and the voice keepsake (Mixtape, Vintage Horn Gramophone Vinyl, Voice Plushie, Ballerina Floral Music Box, Heart Locket) can be freely clicked/tapped, dragged anywhere on the bouquet canvas, and smoothly resized via a dedicated corner drag handle.
- **Target Audience / Persona**: Creators crafting personalized floral gifts with recorded voice messages, and recipients opening shared links on mobile or desktop devices.
- **Key Value**: Eliminates the URL-length truncation bug that previously stripped voice audio from external shorteners (`is.gd`) and ephemeral serverless memory, while giving creators complete spatial freedom over the size and placement of their card and voice keepsake.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Manipulating the Card & Voice Keepsake on Canvas**:
     - Tapping or clicking the greeting card or voice keepsake selects it as the active canvas object and displays a soft dashed terracotta selection frame around its bounds with a prominent circular bottom-right resize handle (`44×44px` minimum touch target).
     - Dragging anywhere inside the card or voice keepsake body smoothly translates its `(x, y)` coordinates across the canvas.
     - Dragging the bottom-right corner handle radially scales the card (`0.45×` to `1.45×`) or voice keepsake (`0.50×` to `1.55×`) in real time with `cubic-bezier(0.16, 1, 0.3, 1)` responsiveness.
  2. **Sharing & Saving to Firestore**:
     - Clicking **Share** generates a unique 7-character short code (`[A-Za-z0-9]{7}`), writes the structured bouquet document and voice recording into Firestore (`shared_bouquets/{code}`), and copies the clean share URL (`https://<domain>/{code}`) to the clipboard.
  3. **Recipient Opening & Playing Voice**:
     - When a recipient visits `/{code}`, the app resolves the document directly from Firestore (with seamless fallback to the serverless `/api/shorten` endpoint and URL hash if offline), renders the exact card and voice keepsake positions and scales, and lets the recipient tap the clean Play icon to hear the creator's recorded voice immediately.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Warm botanical atelier with tactile paper and vintage keepsake textures.
  - *Color Palette & Mood*: Dominant warm alabaster canvas (`#FBF7F2` light / `#161215` dark), structural parchment surfaces (`#F3ECE4`), and romantic terracotta rose accents (`#A86454` / `#E11D48`) following the 60-30-10 rule.
  - *Typography & Hierarchy*: Editorial serif headings (`Cormorant Garamond`) paired with clean geometric sans UI controls (`Plus Jakarta Sans`) and handwritten script (`Caveat`) for personal card notes.
  - *Component Styling & Layout*: Full-viewport interactive bouquet stage with floating glassmorphic toolbars (`backdrop-blur-md`) and generous `44×44px` minimum touch hitboxes for all canvas gizmos.
- **Interactive Feedback & Motion**:
  - Real-time pointer tracking during drag and corner-handle resize operations with zero layout thrashing (compositor-friendly SVG `transform="translate(x, y) scale(s)"`).
  - Clear saving state in the Share modal while the bouquet and voice recording are persisted to Firestore.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Direct Firestore Persistence with Multi-Tier Fallback**
  - *Chosen Approach*: Store shared bouquets in a dedicated `shared_bouquets` Firestore collection keyed by the 7-character `code`, storing both the structured bouquet metadata and the compressed WebM/Opus base64 voice recording (which typically ranges from 15 KB to 120 KB, well within Firestore's 1 MB document limit). Also synchronize the Firestore REST API in the `/api/shorten` serverless handler so server-side redirects on Vercel resolve from the exact same Firestore database.
  - *Why*: Previously, `is.gd` URL shortening stripped the voice audio payload whenever the serialized URL exceeded 3,200 characters, and Vercel serverless memory (`/tmp`) wiped short codes across cold starts. Firestore guarantees instant, durable persistence across both AI Studio and Vercel deployments.
  - *Alternatives Considered*: Storing audio only in URL query parameters (fails due to browser and URL-shortener length limits) or local disk storage (fails on stateless serverless platforms like Vercel).

- **Decision 2: Unified On-Canvas Selection & Corner Resize Gizmo**
  - *Chosen Approach*: Extend the canvas selection and gizmo system so that selecting the greeting card or voice keepsake renders a bounding ring and a bottom-right corner resize handle directly on the SVG canvas, matching the intuitive direct-manipulation feel of the floral elements.
  - *Why*: Keeps the editing workflow spatial and immediate on both touchscreens and desktop mice without adding extra sliders or tabs to the sidebar.
  - *Alternatives Considered*: Sidebar range sliders (rejected per user preference for on-canvas drag and corner resize handle only).

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Bouquet Studio Application                       │
├───────────────────────────────────┬─────────────────────────────────────┤
│       Interactive Canvas          │      Persistence & Share Layer      │
│  ┌─────────────────────────────┐  │  ┌───────────────────────────────┐  │
│  │      BouquetStage SVG       │  │  │     Share & Export Engine     │  │
│  │  • Floral Layers & Wrapper  │  │  │  • 7-char Short Code Gen      │  │
│  │  • Draggable/Resizable Card │  │  │  • Firestore Document Writer  │  │
│  │  • Draggable/Resizable Voice│  │  │  • Multi-Tier Link Resolver   │  │
│  └──────────────┬──────────────┘  │  └───────────────┬───────────────┘  │
│                 │                 │                  │                  │
│                 ▼                 │                  ▼                  │
│  ┌─────────────────────────────┐  │  ┌───────────────────────────────┐  │
│  │   Unified Gizmo Controller  │  │  │      Firebase Firestore       │  │
│  │  • Selection Ring Overlay   │  │  │  Collection: shared_bouquets  │  │
│  │  • 44px Touch Hit Targets   │  │  │  • code (Doc ID)              │  │
│  │  • Move (x, y) & Scale (s)  │  │  │  • payload (Compact Snapshot) │  │
│  └─────────────────────────────┘  │  │  • voiceAudioDataUrl          │  │
│                                   │  │  • cardScale / voiceScale     │  │
│                                   │  │  • createdAt                  │  │
│                                   │  └───────────────────────────────┘  │
└───────────────────────────────────┴─────────────────────────────────────┘
```

- **Data Model & State**:
  - **Firestore Collection (`shared_bouquets/{code}`)**:
    - `code` (`string`, 7 chars matching `^[A-Za-z0-9]{7}$`): Unique short link identifier.
    - `payload` (`string`, max 250,000 chars): Full serialized bouquet snapshot string (including floral items, wrapper, ribbon, card text, positions, and scales).
    - `voiceAudioDataUrl` (`string`, optional, max 750,000 chars): Base64-encoded WebM/Opus audio data URL recorded by the creator.
    - `voiceStyle` (`string`, optional): Selected keepsake style (`mixtape`, `vinyl`, `plushie`, `musicbox`, `locket`).
    - `voiceTitle` (`string`, optional): Custom title for the voice keepsake.
    - `voiceDurationSec` (`number`, optional): Recording duration in seconds.
    - `createdAt` (`timestamp`): Server timestamp of when the bouquet was shared.
  - **Canvas State Extensions**:
    - `GreetingCardData.scale`: Number (`0.45` to `1.45`, default `0.75`) persisted in store and share snapshots.
    - `VoiceKeepsakeData.scale`: Number (`0.50` to `1.55`, default `0.85`) persisted in store and share snapshots.

- **Interactive Component & State Mapping**:
  - **Card & Voice Selection**: Clicking/tapping the card sets `activeCanvasObject = 'card'` (opening the Card editor or Color detector as appropriate) and renders the card selection ring + corner resize gizmo. Clicking/tapping the voice keepsake sets `activeCanvasObject = 'voice'` and renders the voice selection ring + corner resize gizmo.
  - **Drag & Resize Pointer Loop**:
    - `move-card` / `move-voice`: Updates `(x, y)` clamped safely within the SVG stage bounds (`60..540`, `70..650`).
    - `resize-card` / `resize-voice`: Computes radial distance from the card/voice center `(x, y)` to the current pointer SVG position and updates `card.scale` or `voice.scale` smoothly.
  - **Share & Recipient Hydration Flow**:
    - On Share: Writes the document to `shared_bouquets/{code}` via the Firebase client SDK AND posts to `/api/shorten` (which also reads/writes Firestore REST API using the project config so Vercel serverless redirects work out of the box).
    - On Recipient Visit (`/{code}` or `?s={code}`): Queries `shared_bouquets/{code}` from Firestore first, rehydrates the full bouquet snapshot and `voiceAudioDataUrl`, and renders the recipient view with immediate one-tap voice playback.
