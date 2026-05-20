import { send } from "../shared/messages";

// TikTok video URLs: /@username/video/{19-digit-id}
const VIDEO_ID_RE = /\/video\/(\d{15,25})/;

/**
 * Extract the active video's ID. Two paths:
 *  - If we're on /@user/video/{id}, take it from the URL.
 *  - On the FYP (URL stays "/"), walk from the active <video> to its card
 *    container and pull the ID from the embedded /video/{id} link.
 */
function currentVideoId(): string | null {
  const urlMatch = VIDEO_ID_RE.exec(window.location.pathname);
  if (urlMatch) return urlMatch[1];
  const video = findActiveVideo();
  if (!video) return null;
  const scope = findVideoContainer(video) ?? video.parentElement;
  if (!scope) return null;
  const link = scope.querySelector<HTMLAnchorElement>('a[href*="/video/"]');
  if (!link) return null;
  const m = link.getAttribute("href")?.match(VIDEO_ID_RE);
  return m ? m[1] : null;
}

/**
 * Try every known way to advance the TikTok feed by one.
 * Returns the selector / method that succeeded, or null if none did.
 */
export function skipTikTokReel(): string | null {
  // Current TikTok layout: aside > DivFeedNavigationContainer > [up wrapper, down wrapper] > button.
  // Class hashes rotate, so target by class-name fragment + structural position.
  const navContainer = document.querySelector('[class*="DivFeedNavigationContainer"]');
  if (navContainer) {
    const buttons = navContainer.querySelectorAll<HTMLButtonElement>("button");
    if (buttons.length >= 2) {
      buttons[buttons.length - 1].click();
      return "DivFeedNavigationContainer:last-button";
    }
  }
  // Fallbacks if TikTok renames the container or adds aria-labels back.
  const selectors = [
    'button[data-e2e="arrow-down"]',
    'button[aria-label="Next video"]',
    'button[aria-label*="Next" i]',
    'button[aria-label*="below" i]',
    'button[aria-label*="down" i]',
    '[class*="AsideOneColumnSidebar"] button.action-item:last-of-type',
  ];
  for (const sel of selectors) {
    const el = document.querySelector<HTMLElement>(sel);
    if (!el) continue;
    el.click();
    return sel;
  }
  // Last resort: ArrowDown keypress (TikTok's own handler usually blocks this).
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

/** Find the <video> closest to the viewport center. That's the active video. */
function findActiveVideo(): HTMLVideoElement | null {
  const videos = Array.from(document.querySelectorAll<HTMLVideoElement>("video"));
  if (videos.length === 0) return null;
  const viewportCenter = window.innerHeight / 2;
  let best: HTMLVideoElement | null = null;
  let bestDistance = Infinity;
  for (const v of videos) {
    const rect = v.getBoundingClientRect();
    if (rect.height === 0 || rect.bottom < 0 || rect.top > window.innerHeight) continue;
    const center = rect.top + rect.height / 2;
    const distance = Math.abs(center - viewportCenter);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = v;
    }
  }
  return best;
}

/**
 * Walk up from the active video to the tightest container that holds one video card.
 * Heuristic: container is taller than half the viewport but narrower than 800px,
 * and contains a profile/username link.
 */
function findVideoContainer(video: HTMLVideoElement): HTMLElement | null {
  let cur: HTMLElement | null = video.parentElement;
  while (cur && cur !== document.body) {
    const r = cur.getBoundingClientRect();
    const tallEnough = r.height > window.innerHeight * 0.5;
    const notTooWide = r.width < 800;
    const hasUsernameLink = !!cur.querySelector('a[href^="/@"]');
    if (tallEnough && notTooWide && hasUsernameLink) return cur;
    cur = cur.parentElement;
  }
  return null;
}

/** Extract caption + author. Prefers TikTok's data-e2e markers, falls back to scoped container. */
function extractActiveVideoMeta(): { title: string; channel: string } | null {
  const video = findActiveVideo();
  if (!video) return null;
  const container = findVideoContainer(video);

  // Author: prefer data-e2e markers, fall back to container's first @-link.
  let channel = "(unknown)";
  const authorEl =
    document.querySelector<HTMLElement>('[data-e2e="browse-username"]') ??
    document.querySelector<HTMLElement>('[data-e2e="video-author-uniqueid"]') ??
    container?.querySelector<HTMLAnchorElement>('a[href^="/@"]') ??
    null;
  if (authorEl) {
    const text = (authorEl.innerText || authorEl.textContent || "").trim();
    if (text) {
      channel = text.startsWith("@") ? text : `@${text}`;
    } else if (authorEl instanceof HTMLAnchorElement) {
      const m = authorEl.getAttribute("href")?.match(/^\/@([^/]+)/);
      if (m) channel = `@${m[1]}`;
    }
  }

  // Caption: prefer data-e2e desc markers.
  let title = "";
  const descEl =
    document.querySelector<HTMLElement>('[data-e2e="browse-video-desc"]') ??
    document.querySelector<HTMLElement>('[data-e2e="video-desc"]') ??
    null;
  if (descEl) {
    title = (descEl.innerText || descEl.textContent || "").trim();
  }

  // Fallback: scan container spans for the longest plausible caption.
  if (!title && container) {
    const candidates: string[] = [];
    for (const el of container.querySelectorAll<HTMLElement>('span, h1, h2, [dir="auto"]')) {
      const text = (el.innerText || "").trim();
      if (text.length < 5 || text.length > 500) continue;
      if (/^@\w+$/.test(text)) continue;
      if (/^\d+(\.\d+)?[KkMm]?$/.test(text)) continue;
      if (/^(follow|like|comment|share|save|more|sound|view|reply|for you|following)$/i.test(text)) continue;
      candidates.push(text);
    }
    candidates.sort((a, b) => b.length - a.length);
    title = candidates[0] ?? "";
  }

  if (!title) title = "(no caption)";
  return { title, channel };
}

const scoredIds = new Set<string>();
let lastTriggeredId: string | null = null;
let triggerTimer: ReturnType<typeof setTimeout> | null = null;

async function triggerScore(videoId: string): Promise<void> {
  if (scoredIds.has(videoId)) return;
  const meta = extractActiveVideoMeta();
  if (!meta) {
    console.warn(`[syte] no metadata extractable for ${videoId} — skipping score`);
    return;
  }
  console.log(`[syte] scoring tiktok ${videoId}: "${meta.title.slice(0, 60)}" / ${meta.channel}`);
  let reply;
  try {
    reply = await send({
      kind: "score-meta",
      videoId,
      title: meta.title,
      channel: meta.channel,
      platform: "tiktok",
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
  if (verdict === "Junk" && reply.autoSkipEnabled && currentVideoId() === videoId) {
    const method = skipTikTokReel();
    console.log(`[syte] auto-skipped junk ${videoId} via ${method}`);
  }
}

function checkForNewActiveVideo(): void {
  const id = currentVideoId();
  if (!id) return;
  if (id === lastTriggeredId) return;
  console.log(`[syte] new active tiktok video: ${id}`);
  lastTriggeredId = id;
  if (triggerTimer) clearTimeout(triggerTimer);
  triggerTimer = setTimeout(() => {
    triggerTimer = null;
    void triggerScore(id);
  }, 400); // TikTok DOM takes a moment to settle on a new video
}

export function startTikTokWatcher(): void {
  checkForNewActiveVideo();
  window.addEventListener("popstate", checkForNewActiveVideo);
  setInterval(checkForNewActiveVideo, 500);
}
