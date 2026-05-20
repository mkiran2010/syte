# Syte website — Emergent prompt

Paste everything below the divider into Emergent (or any equivalent AI app-builder).

---

Build a one-page marketing site for **Syte**, a browser extension that filters short-form video feeds (YouTube Shorts, Instagram Reels, TikTok) using on-device AI. Every reel is classified as "Junk" or "Stay" by Chrome's built-in Gemini Nano model and Junk reels are auto-skipped. The product's pitch is **discipline you set once, that holds when you can't** — not a productivity app, not a screen-time blocker, but a personal algorithm that runs locally and keeps you honest.

The site exists to do three things, in order: communicate the product, convert visitors to install the Chrome extension, and build trust about the privacy story (nothing leaves the browser).

## Tech stack

- **Next.js 15 (App Router) + TypeScript + Tailwind v4**
- **React Three Fiber (`@react-three/fiber`) + Drei (`@react-three/drei`)** for the 3D scenes
- **Framer Motion** for 2D scroll animations and section transitions
- **GSAP ScrollTrigger** for orchestrating the cross-section camera moves in the 3D canvas (one shared canvas, scroll-driven)
- Deploy target: **Vercel**

## Design system — non-negotiable

- **Primary purple:** `#9D4EDD` — used for the logo glow, accent buttons, and 3D rim lighting
- **Background:** near-black `#0A0A0A`
- **Surface:** `#1A1A1A`
- **Text:** white `#FFFFFF` primary, `#A0A0A0` secondary
- **Font:** **Outfit** from Google Fonts (weights 400/500/600/700)
- **Mood:** dark, premium, slightly mysterious. Think Linear / Vercel / Apple's product pages — generous whitespace, gradient blooms, smooth physics-based motion. Never childish, never busy.
- **Logo glow:** the Syte mark is a purple parchment scroll with an upward chevron — it should always feel like it's emitting soft purple light against the dark background

## Assets to use

- `logo_with_text.png` — wordmark (scroll + "syte" text). Use in the nav (top-left) and footer.
- `public/icons/icon-128.png` — square mark, no text. Use as favicon and social card.
- 3D models: build all 3D objects programmatically with R3F primitives or import from Drei's library. Don't request external GLB files; if you need a phone model, use Drei's built-in or build one from boxes + rounded edges.

## The 3D experience — this is the headline of the site

There is **one persistent React Three Fiber canvas** that lives full-screen behind the page content and scrolls with the user. Sections fade in over it. The 3D scene tells a continuous story driven by scroll position.

### Hero (top of page) — "the captured phone"

A photorealistic phone floats in the center of the screen, slightly tilted, lit with soft purple from the upper-left and cool white from the upper-right. The phone's screen shows a vertical reel feed — TikTok-style with a video, caption, like/comment icons. The feed scrolls on its own at a steady pace, and as it does, individual reels get tagged with floating 3D labels:

- Most reels float by with a soft white "Stay" tag attached
- Roughly every 3rd reel gets a glowing purple **"Junk"** tag — and that reel **dissolves into purple particles** that drift upward and dissipate, while the next reel slides up to take its place

The dissolve effect is the hero moment. It should feel satisfying — like the phone is breathing out the bad content. Use shader-based particle dissolve, not a sprite sheet.

The Syte scroll-mark logo orbits slowly around the phone in 3D space, glowing purple, like a moon. The logo is recognizably the parchment-scroll-with-chevron mark.

**Above the phone:** the headline `"Your feed, on your terms."` in Outfit 700, 72px on desktop, with a smaller sub: `"Syte uses on-device AI to skip Shorts and Reels that don't match what you actually want to watch."` Below: a primary CTA `"Add to Chrome — free"` and a secondary text link `"How it works ↓"`.

### Section 2 (scroll down) — "the platforms"

As the user scrolls, the camera dollies around the phone. The phone's screen **morphs through three platforms in sequence** — YouTube Shorts (red play button watermark) → Instagram Reels (sunset gradient watermark) → TikTok (cyan/magenta watermark). Each transition is a smooth UI crossfade on the phone's screen, with the phone subtly rotating 90° between each so it feels like it's revealing different faces of itself.

Surrounding the phone, three holographic platform logos materialize in 3D space — recognizable shapes for YouTube/Instagram/TikTok — connected to the phone by glowing purple threads, suggesting "Syte sees them all."

Section text overlay: heading `"Wherever you scroll."` Sub: `"YouTube Shorts. Instagram Reels. TikTok. One filter, every feed."`

### Section 3 (scroll down) — "the rubric"

Camera pulls back. The phone shrinks and floats to the right side. On the left, a 3D **strictness slider** materializes — a horizontal bar with a glowing purple knob that animates from "Lenient" (left) to "Strict" (right) and back as a demo. As the slider moves, the rate of "Junk" tags appearing on the phone's reel feed visibly changes.

Heading: `"You set the rules."` Sub: `"Pick a strictness level from 1 to 10, or write your own filter in plain English. Lock it in and Syte holds the line."`

### Section 4 (scroll down) — "the privacy moment"

The camera pushes in dramatically. The 3D phone is replaced by a **glowing transparent cube** representing the user's browser. The Syte scroll-logo sits at the center of the cube, pulsing purple. Around the outside of the cube, dotted lines reach toward the cube but stop at its surface, blocked. Labels on the dotted lines: "OpenAI", "Anthropic", "Google", "Server". Inside the cube, the logo glows brighter and a small label says "all processing happens here."

Heading: `"Nothing leaves your browser."` Sub: `"Every reel is classified by your browser's built-in AI. We never see what you watch. There is no API key. There is no cloud."` 

This is the trust beat. Make it feel like a quiet declaration, not an ad.

### Section 5 (scroll down) — "the result"

The camera flies through a tunnel of dissolved-junk particles toward a clean, calm version of the phone — the same phone from the hero, but now its feed is full of "Stay" tags and the content shown is visibly higher-quality (educational diagrams, calm landscapes, code editors). The pace of scroll is slower. Lighting warms slightly.

Heading: `"What's left is what's worth watching."` Sub: `"Syte doesn't shame you. It just gives you back the feed you'd choose for yourself."`

### Footer — "install"

Camera pulls all the way back. The phone, the cube, the platforms — everything we've seen — all float together in a final composition behind a centered install button. Big primary CTA: `"Add Syte to Chrome — free"`. Below it: `"Open source · No account · No data collected"`. Tiny links: GitHub, Privacy Policy, Contact.

## 2D content layout

The 3D canvas runs behind everything. On top of it, scroll-snapped sections hold the headlines, sub-headlines, and CTA buttons described above. Use Framer Motion to fade text in/out as each section enters/exits the viewport. Keep text columns narrow (max 600px) so the 3D canvas remains visible on the sides.

The nav at the top: logo wordmark (`logo_with_text.png`) on the left, an `"Install"` button on the right. The nav is sticky, blurs the canvas behind it on scroll (`backdrop-blur-md`).

## Performance notes

- The 3D canvas is the centerpiece, but **graceful degradation matters**: if the user is on a low-power device or has `prefers-reduced-motion` set, fall back to static images of each scene with the same headlines. Use `useReducedMotion()` from Framer Motion.
- Lazy-load the R3F canvas after first paint. Show a static hero image (the `icon-128.png` glowing on dark) until the canvas is ready.
- Cap the canvas at 60fps and disable shadows on screens narrower than 1024px.

## Copy summary (plug these in literally)

- **Headline:** Your feed, on your terms.
- **Sub:** Syte uses on-device AI to skip Shorts and Reels that don't match what you actually want to watch.
- **CTA primary:** Add to Chrome — free
- **CTA secondary:** How it works ↓
- **Section 2:** Wherever you scroll. / YouTube Shorts. Instagram Reels. TikTok. One filter, every feed.
- **Section 3:** You set the rules. / Pick a strictness level from 1 to 10, or write your own filter in plain English. Lock it in and Syte holds the line.
- **Section 4:** Nothing leaves your browser. / Every reel is classified by your browser's built-in AI. We never see what you watch. There is no API key. There is no cloud.
- **Section 5:** What's left is what's worth watching. / Syte doesn't shame you. It just gives you back the feed you'd choose for yourself.
- **Footer CTA:** Add Syte to Chrome — free / Open source · No account · No data collected

## Deliverables expected

1. A working Next.js 15 app, ready to `vercel deploy`.
2. The single shared R3F canvas with all five 3D scenes wired to scroll position via GSAP ScrollTrigger or Framer Motion's `useScroll`.
3. Reduced-motion fallback for every 3D scene.
4. Mobile-responsive: on narrow viewports the 3D scenes simplify (fewer particles, no orbiting logo, no platform logo cluster) but remain present.
5. Outfit font wired through `next/font/google`.
6. SEO meta tags + Open Graph using the icon mark.
7. `/privacy` route rendering the existing privacy policy text.

Ship it dark, premium, and a little bit magical. The 3D should feel like the product itself — quietly powerful, calmly removing what doesn't belong.
