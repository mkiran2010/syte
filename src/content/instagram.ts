import { send } from "../shared/messages";

const REEL_ID_RE = /^\/reels?\/([A-Za-z0-9_-]+)/;

function currentReelId(): string | null {
  const m = REEL_ID_RE.exec(window.location.pathname);
  return m ? m[1] : null;
}

/**
 * Try every known way to advance the Instagram Reels feed by one.
 * Returns the selector / method that succeeded, or null if none did.
 */
export function skipInstagramReel(): string | null {
  const selectors = [
    'button[aria-label="Next"]',
    'button[aria-label*="Next" i]',
    '[role="button"][aria-label*="Next" i]',
    'svg[aria-label*="Next" i]',
    'button[aria-label*="below" i]',
    'button[aria-label*="down" i]',
  ];
  for (const sel of selectors) {
    const el = document.querySelector<HTMLElement>(sel);
    if (!el) continue;
    const target = el.tagName.toLowerCase() === "svg"
      ? (el.closest("button, [role='button'], a") as HTMLElement | null) ?? el
      : el;
    target.click();
    return sel;
  }
  // Fallback: ArrowDown
  const ev = new KeyboardEvent("keydown", {
    key: "ArrowDown",
    code: "ArrowDown",
    keyCode: 40,
    which: 40,
    bubbles: true,
    cancelable: true,
    composed: true,
  });
  if (document.body.dispatchEvent(ev)) {
    document.dispatchEvent(ev);
    return "keydown";
  }
  return null;
}

/**
 * Extract caption + author handle from the active Reel's DOM.
 * Instagram doesn't have a public oEmbed, so we scrape what's visible.
 */
function extractActiveReelMeta(): { title: string; channel: string } | null {
  // Find the article that contains the currently-playing video.
  // Heuristic: the only video element actively playing.
  const videos = Array.from(document.querySelectorAll<HTMLVideoElement>("video"));
  const active = videos.find((v) => !v.paused) ?? videos[0];
  if (!active) return null;

  const article = active.closest("article") ?? active.closest("section") ?? active.parentElement;
  if (!article) return null;

  // Author: first profile link inside the article (href like "/<username>/")
  const profileLink = article.querySelector<HTMLAnchorElement>('a[href^="/"]');
  let channel = "(unknown)";
  if (profileLink) {
    const m = profileLink.getAttribute("href")?.match(/^\/([^/]+)\//);
    if (m) channel = `@${m[1]}`;
  }

  // Caption: heuristic — collect visible text nodes inside the article, prefer
  // longer spans/divs that aren't button labels.
  const candidates = Array.from(
    article.querySelectorAll<HTMLElement>("h1, h2, h3, span, div"),
  )
    .map((el) => (el.innerText || "").trim())
    .filter((t) => t.length > 5 && t.length < 500)
    .filter((t) => !/^(follow|like|comment|share|save|more|remix)$/i.test(t));
  // Prefer the longest non-numeric string
  candidates.sort((a, b) => b.length - a.length);
  const title = candidates[0] ?? "(no caption)";

  return { title, channel };
}

const scoredIds = new Set<string>();
let lastTriggeredId: string | null = null;
let triggerTimer: ReturnType<typeof setTimeout> | null = null;

async function triggerScore(videoId: string): Promise<void> {
  if (scoredIds.has(videoId)) return;
  const meta = extractActiveReelMeta();
  if (!meta) {
    console.warn(`[syte] no metadata extractable for ${videoId} — skipping score`);
    return;
  }
  console.log(`[syte] scoring instagram ${videoId}: "${meta.title.slice(0, 60)}" / ${meta.channel}`);
  let reply;
  try {
    reply = await send({
      kind: "score-meta",
      videoId,
      title: meta.title,
      channel: meta.channel,
      platform: "instagram",
    });
  } catch (err) {
    console.error(`[syte] score-meta failed for ${videoId}:`, err);
    return;
  }
  if (reply.kind !== "verdict") {
    console.warn(`[syte] unexpected reply for ${videoId}:`, reply);
    return;
  }
  scoredIds.add(videoId);
  const { verdict } = reply.result;
  console.log(`[syte] ${videoId} → ${verdict}`);
  if (verdict === "Junk" && reply.autoSkipEnabled && currentReelId() === videoId) {
    const method = skipInstagramReel();
    console.log(`[syte] auto-skipped junk ${videoId} via ${method}`);
  }
}

function checkForNewActiveReel(): void {
  const id = currentReelId();
  if (!id) return;
  if (id === lastTriggeredId) return;
  console.log(`[syte] new active instagram reel: ${id}`);
  lastTriggeredId = id;
  if (triggerTimer) clearTimeout(triggerTimer);
  triggerTimer = setTimeout(() => {
    triggerTimer = null;
    void triggerScore(id);
  }, 400); // Insta DOM takes a moment to settle on a new reel
}

export function startInstagramWatcher(): void {
  checkForNewActiveReel();
  window.addEventListener("popstate", checkForNewActiveReel);
  setInterval(checkForNewActiveReel, 500);
}
