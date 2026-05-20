# lenny.md — context handoff for the next Claude session

You are picking up `syte` (originally named `feedfixer` until v0.5.0), a browser extension the user is iterating on. This file gives you everything you need to skip the 5-hour ramp-up that the previous Claude went through.

---

## 1. What this is

A Chrome/Edge extension (Manifest V3) that filters YouTube Shorts in real time. Each new active Short triggers a Claude API call that classifies it as `Junk` or `Stay`. Junk shorts are silently auto-skipped; Stay shorts are watched once, then auto-advanced when they end.

The user's framing, in his own words from the kickoff:
> *"if your going to doom scroll you might as well scroll on important things. most people want good feeds but they cant achieve good feeds because they like watching other interesting content."*

So the value prop is **disciplined doomscrolling**: you can't trust YouTube's algorithm, and you can't trust yourself to manually filter mid-session, so the extension does it for you with a strictness setting that **locks once you start scrolling** to prevent in-the-moment loosening.

---

## 2. Repo state — current branch

GitHub: <https://github.com/mkiran2010/syte> (private; renamed from `feedfixer` at v0.5.0)

Active branch: **`predictor`** (off `expansion`). Predictor is where the lookahead / next-reel pre-scoring work is happening. `expansion` was where multi-platform support landed.

Platform status as of the last working session:
- **YouTube Shorts** — working. URL polling + oEmbed metadata + Chrome on-device LanguageModel verdict + auto-skip via `#navigation-button-down`.
- **Instagram Reels** — mostly working. URL polling on `/reels/{shortcode}/`, DOM-scraped caption + author (viewport-center video → tightly-scoped container heuristic), auto-skip via `aria-label` selector chain.
- **TikTok** — sidelined. Stub adapter exists at [src/content/tiktok.ts](src/content/tiktok.ts) but FYP videoId extraction is unreliable. See coming_soon.md.

**Confirm current branch with `git status` before assuming.**

---

## 3. Architecture

```
┌─ content script (per platform) ─┐    ┌─ service worker ──────────────────┐
│ youtube / instagram / tiktok    │    │                                    │
│                                 │    │                                    │
│ detect platform → start watcher │    │                                    │
│ poll for new active reel:       │    │                                    │
│   YT: URL /shorts/{id}          │    │                                    │
│   IG: URL /reels/{shortcode}    │    │                                    │
│   TT: DOM-scraped link          │    │                                    │
│                                 │    │                                    │
│ on new reel:                    │    │ score-reel (YT, has oEmbed):       │
│  - attach end-watcher (YT only) │    │   fetch youtube.com/oembed → meta  │
│  - send score-reel ────────────▶│ ── │   call window.LanguageModel        │
│  OR send score-meta ───────────▶│ ── │ score-meta (IG/TT, no oEmbed):     │
│  (when caption + author already │    │   uses caller-supplied meta        │
│   came from DOM)                │    │   call window.LanguageModel        │
│                                 │    │                                    │
│                          ◀──── verdict ──────                             │
│ if Junk + autoSkip:             │    │ also: append to local log,         │
│   click platform's next button  │    │ POST to Supabase if uploadEnabled  │
└─────────────────────────────────┘    └────────────────────────────────────┘
                                            │
                                            ▼
                                     ┌─ popup ──────┐
                                     │ slider / lock │
                                     │ verdict card  │
                                     │ auto toggle   │
                                     └───────────────┘
```

Scoring is fully on-device via Chrome's built-in `window.LanguageModel` (Gemini Nano, Chrome 138+). No network calls for scoring; only oEmbed (YouTube metadata) and Supabase (anonymous verdict log) leave the browser.

Key contracts:

- **`chrome.runtime.sendMessage(msg)`** — content script → SW. The `send()` helper in `src/shared/messages.ts` is the single typed wrapper. Two scoring messages: `score-reel` (videoId only — SW fetches oEmbed) for YouTube; `score-meta` (videoId + title + channel + platform) for everything else.
- **`chrome.storage.local`** — `Settings`, install ID, verdict log (persistent, survives browser restart).
- **`chrome.storage.session`** — `SessionLock`, `lastVerdict`, `lastError` (cleared on browser restart).

---

## 4. File map

```
src/
├── background/
│   ├── service-worker.ts   # message router, lock state, verdict storage, log + upload
│   ├── scorer.ts           # oembed fetch + on-device LanguageModel call (stateless per call)
│   └── upload.ts           # fire-and-forget POST to Supabase
├── content/
│   ├── index.ts            # platform router — picks the right watcher
│   ├── platforms.ts        # detectPlatform() from window.location.hostname
│   ├── shorts.ts           # YouTube watcher
│   ├── instagram.ts        # Instagram watcher (DOM-scraped meta)
│   └── tiktok.ts           # TikTok watcher (sidelined — FYP videoId broken)
├── shared/
│   ├── messages.ts         # Msg / Reply types + send() helper, VerdictLogEntry
│   ├── settings.ts         # chrome.storage.local helpers
│   ├── types.ts            # Settings, ScoredReel, SessionLock, DEFAULT_*
│   ├── install-id.ts       # persistent UUID per install (anonymous Supabase key)
│   ├── verdict-log.ts      # local rolling log (1000 entries cap)
│   ├── reel-url.ts         # buildReelUrl(platform, videoId) → canonical URL
│   └── supabase-config.ts  # SUPABASE_URL + publishable key
└── ui/
    ├── popup.html / popup.tsx     # slider, lock, verdict card, auto-skip toggle
    ├── options.html / options.tsx # mode toggle, stages, custom rule, upload opt-out
    └── styles.css                  # purple/black theme, Outfit font from Google Fonts

manifest.json   # MV3, host_perms for youtube/instagram/tiktok/x + Supabase
package.json    # vite + crxjs + react. NO Anthropic SDK (we're fully on-device).
vite.config.ts  # crxjs handles HTML entries via manifest. Don't add rollupOptions.input
                # (it conflicts with crxjs html plugin and 400s the build).

research/
├── lookahead.md      # plan for pre-scoring next reels — ACTIVELY being implemented on predictor branch
├── platforms.md      # per-platform DOM notes (TikTok worklist still open)
└── data-collection.md # supabase schema notes
```

---

## 5. Workflow

### Build & install
```sh
npm install
npm run build
# → dist/ contains the loadable extension
```

In Chrome: `chrome://extensions` → Developer mode → Load unpacked → `dist/`.

### After ANY code change — three-step sequence (CRITICAL)
1. `npm run build` (Chrome doesn't auto-build)
2. `chrome://extensions` → Syte → **circular reload icon ↻** on the card (Chrome doesn't auto-reload from disk)
3. **Reload the YouTube tab itself** (Ctrl+R on the tab — content script in old tabs gets orphaned otherwise)

Skip any of these → user reports "nothing happens" → 30 minutes of debugging. **Always state all three steps** when telling the user to test.

### Dev mode
`npm run dev` runs Vite with HMR. Useful for popup/options work. Content scripts still need a tab reload.

---

## 6. Known gotchas (real ones from this session)

1. **"Could not establish connection / Extension context invalidated."** → content script in target tab is orphaned after extension reload. User must reload the tab. This was the #1 cause of "nothing works" reports — every code change requires the **two-step**: reload the extension card AND reload the open tab. The orphaned content script will spam this error on every action; we don't currently detect this and stop polling, which is a known noise problem.

2. **Chrome on-device LanguageModel session reuse is a trap.** A reused `LanguageModel` session accumulates conversation history and the classification gradually corrupts. **Always create a fresh session per call** with `await LanguageModel.create({...})` and `session.destroy()` in a finally. Stateless wins.

3. **`window.ytInitialData` requires the main world.** Content scripts run in an isolated world, so `window.ytInitialData` is `undefined`. We use the public oEmbed endpoint instead — auth-free for YouTube, gives title + author_name only.

4. **No window-level helpers from content scripts.** Isolated-world content scripts can't expose functions to `window` for the page console. We use `Ctrl+Shift+S` keyboard listeners (Instagram + TikTok) for manual debug skip.

5. **YouTube Shorts URL = source of truth for videoId.** `/shorts/{11-char-id}` always reflects the active reel. URL polling every 500ms is more reliable than DOM mutation observers on `[is-active]`.

6. **Instagram URL also works** — `/reels/{shortcode}/` updates as you scroll. Polling pattern same as YouTube.

7. **TikTok URL does NOT update on FYP scroll** — `/foryou` stays at root `/`. Need DOM-walk fallback to find the active video's `<a href="/@user/video/{id}">`. Currently broken on FYP. See `src/content/tiktok.ts`.

8. **Skip primitives per platform** (selector chains in code, all with keydown ArrowDown fallback):
   - **YouTube:** `#navigation-button-down button` first.
   - **Instagram:** `button[aria-label*="Next" i]` and similar.
   - **TikTok:** `[class*="DivFeedNavigationContainer"]` last button (TUX class names rotate but the container fragment stays).

9. **Auto-advance on Stay (YouTube only) must attach IMMEDIATELY on reel change, not after the verdict.** Attach a `setInterval(200ms)` end-watcher the moment a new reel is detected. Detect loop via `currentTime < lastTime - 1` or `duration - currentTime < 0.3`. Detach on URL change.

10. **Cold-start is ~15s on the first reel of a session** — that's `LanguageModel.create()` warming up Gemini Nano. Pre-warming on `/shorts/` page load is in `coming_soon.md` (#4).

11. **Vite + crxjs config:** Do NOT put HTML entries in `rollupOptions.input`. crxjs picks them up from the manifest. Doubling them up breaks the html plugin.

12. **package.json self-reference:** A linter keeps adding `"syte": "file:"` to dependencies. **Leave it alone.** Don't remove it — it comes back.

13. **Lock state is in `chrome.storage.session`** — auto-clears on browser restart but persists across SW unloads. Slider in popup and stage editors in options are disabled when locked.

14. **Custom instruction mode bypasses the stage system entirely.** When `useCustomInstruction === true`, scorer uses `customInstruction` text directly. UI must hide/show the right controls.

15. **Extension context invalidated noise** — when the SW dies, the orphaned content script keeps trying `sendMessage` on every reel change and prints stack traces. Open backlog item: detect once, log a single "extension was reloaded — refresh tab" line, then stop polling.

---

## 7. User preferences (READ THIS FIRST)

### Git
- **Username:** `mkiran2010`
- **Email:** `mkiran678fn@gmail.com` — NOT the Berkeley email that appears in conversation context.
- **Commit message style:** Conventional Commits prefix (`fix:`, `feat:`, `refactor:`, `chore:`) + terse single-line description. **No body paragraphs.** No "what / why" rambles. Example: `fix: manual scroll functionality, fallback to synthetic ArrowDown`
- **NO `Co-Authored-By` line.** User explicitly asked Claude not to be listed.
- Pass identity inline: `git -c user.name="mkiran2010" -c user.email="mkiran678fn@gmail.com" commit -m "..."`. Never modify the global git config.

### Communication style
- Action over speculation. He gets frustrated by long debug-loop chains where Claude asks for diagnostic info repeatedly without making progress.
- One-letter answers ("a", "b") are valid responses to multiple-choice questions — interpret literally and proceed.
- He'll often dump 3–5 distinct requests in a single message. Address them all in the same turn; don't rabbit-hole on the first one.
- He sends screenshots inline (paste files into the project dir). Read them with the Read tool — they're useful debugging signal.
- He'll sometimes "stage" changes himself in git before asking you to commit. Run `git status` before assuming there's nothing staged.

### What works
- Plans presented as clear options with one decision per question (use AskUserQuestion or simple "A / B / C" prose).
- Brief upfront context, then bullet lists of what changed and what to do next.
- Explicit step-by-step "do this exact sequence" when telling him to test (the reload-extension-then-reload-tab trifecta especially).

### What doesn't
- Long diagnostic checklists with 4+ "tell me what you see" items. He'll bail.
- Asking him to open the SW console to read errors. He sometimes does, sometimes won't. Surface errors in the popup UI banner instead — that's what the red "Last error:" card is for.
- Offering to do things you can't do ("let me load the extension for you" — you can't drive Chrome).

---

## 8. Roadmap / future ambitions

See `coming_soon.md` for the prioritized backlog. Highlights:

### Active on this branch (predictor)
- **Lookahead scoring** (`research/lookahead.md`): pre-score the next 1–2 reels in the DOM queue while the user watches the current one. Eliminates the visible auto-skip jump. SW-side verdict cache + content-script sibling extraction. This is the headline v2 feature.

### Sidelined for now
- **TikTok adapter.** Stub at [src/content/tiktok.ts](src/content/tiktok.ts) works on profile pages (`/@user/video/X`) but breaks on FYP because TikTok's URL stays at `/` and the DOM-walk to find the videoId via `a[href*="/video/"]` returned nothing in the last test. Will need to investigate the FYP DOM (likely a `data-*` attribute or the `__UNIVERSAL_DATA_FOR_REHYDRATION__` JSON blob). Coming soon, not blocking.

### After lookahead lands
- **Pre-warm Gemini Nano** on `/shorts/` page load — fixes the 15s cold-start on the first reel.
- **Channel allowlist / blocklist** — pin trusted channels (skip the LLM, always Stay), instant verdict.
- **"Wrong call?" feedback button** in the popup recent-reels list — feeds a corrections table.
- **Web Store publication.** See `PUBLISHING.md`. Pre-flight blockers: icons, privacy policy URL, screenshots, detailed description.

### Explicitly NOT roadmap
- Don't reintroduce the homepage tile filter. The v0.1.0 attempt did this and it was a failure. Shorts/Reels are the only surfaces that matter.
- Don't add screen-time pause / focus-mode features yet — adjacent but out of scope.
- Mobile native apps are not in reach without jailbreak (see iOS feasibility note from the predictor session). Mobile-web in Safari with a Foundation Models bridge is the only realistic iOS path; deferred.

---

## 9. The skill ecosystem you have access to

You have the `claude-api` skill (Anthropic SDK / API patterns), the `update-config` skill (settings.json), and others. The `claude-api` skill was actively used in this project for prompt caching and the raw-fetch migration. If you need to migrate models or add features like batch scoring or compaction, invoke it.

The user has Anthropic API credentials and is on Berkeley email auth. He'll occasionally complain about API spending — Haiku 4.5 with prompt caching is the cost-conscious default and is set as the default model in `DEFAULT_SETTINGS`.

---

## 10. First moves when you pick up

1. `git status` — confirm current branch.
2. `git log --oneline -10` — see recent commits.
3. Read this file (which you just did).
4. Read `README.md` and `PATCHNOTES.md` on whatever branch you're on.
5. Ask the user what they want to work on next. Don't assume from this file — it's a snapshot, not a TODO.
6. When the user describes a bug, your first instinct should be: "did you reload the extension AND the YouTube tab?" 9 times out of 10 that's it.

Good luck. Be terse, be direct, ship working code.
