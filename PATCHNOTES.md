# Syte — Patch Notes

## v0.3.0 — Cross-platform + Supabase analytics

Expanded scoring beyond YouTube Shorts to **Instagram Reels** and **TikTok**, and started shipping verdicts to Supabase for offline analysis.

### What works

- **Instagram Reels** — full parity with the YouTube flow. Detects the viewport-center reel, extracts caption + author from the DOM, sends `score-meta` to the service worker, and auto-skips when the verdict comes back as `Junk`. Ctrl+Shift+S still works as a manual fallback.
- **TikTok (per-video pages)** — `/@user/video/{id}` URLs work end-to-end: metadata extraction, scoring, and auto-skip all behave.
- **Supabase verdict export** — every verdict (junk/stay) is uploaded with `install_id`, `video_id`, `title`, `channel`, `verdict`, `level`, `custom_rule`, `scored_at`, `platform`, and `reel_url`. Fire-and-forget; upload failures never block scoring. Lets us analyze junk-vs-stay distributions across platforms.

### What's in progress

- **TikTok FYP (`/foryou`)** — auto-skip is unreliable here. The down-arrow button's class hashes and DOM position rotate while the feed scrolls, so the click target is hard to time and track. Manual Ctrl+Shift+S sometimes hits, sometimes doesn't. We currently target `[class*="DivFeedNavigationContainer"]` with positional fallbacks, but TikTok re-renders the container faster than we can lock onto it. Per-video pages stay stable, so those are the supported surface for now.



Removed everything that wasn't reliably working. Kept only the manual-skip feature, which is verified working end-to-end.

### What works

- **Manual Skip Short button** — popup button advances the current YouTube Short. Three fallback methods (nav-button click → synthetic ArrowDown → scrollIntoView), reports which one succeeded.
- **Active-tab detection** — button is enabled only on `youtube.com/shorts/*`, greyed out elsewhere. Auto-refreshes every second.
- **Build pipeline** — `npm install && npm run build` produces a clean `dist/` ready to load as an unpacked extension.

### What was removed

The following all shipped in v0.1.0 but never worked reliably end-to-end and was burning time. Removed entirely from `main`:

- Claude API scoring (Anthropic SDK, prompt caching, batched scorer)
- IndexedDB score cache, rubric versioning
- Token-bucket controller, junk-percentage slider, threshold logic
- Service worker, message router
- Homepage tile observer, hide/pending CSS states
- Options page (rubric editor, API key, model selector)
- Stats counters, debug toggle, error banner

If we want any of this back, it's in git history (`v0.1.0` tag the previous initial commit).

### Next: `metadata-analysis` branch

The next experiment lives on a branch, not main. Plan:

- On every new active Short, extract metadata from `window.ytInitialData` (title, channel, description, view count, tags)
- Send to Claude with a "junk vs stay" tool definition
- If Claude calls `skip_short`, run the proven `skipCurrentShort()` from this baseline
- Trigger automatically on every reel change via MutationObserver on `[is-active]`

Main stays clean. If the branch works, merge. If not, throw it away without polluting `main` again.
