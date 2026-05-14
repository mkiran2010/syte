/**
 * Instagram Reels skip primitive. Tries multiple selectors for the visible
 * down-arrow button. Returns which selector worked, or null if none did.
 */
export function skipInstagramReel(): string | null {
  const selectors = [
    // Most likely (Insta typically uses aria-label="Next")
    'button[aria-label="Next"]',
    'button[aria-label*="Next" i]',
    // Sometimes the clickable parent is a div with role=button
    '[role="button"][aria-label*="Next" i]',
    // Insta wraps SVGs in clickable parents — try the parent of an aria-labelled svg
    'svg[aria-label*="Next" i]',
    // Below-the-fold variants
    'button[aria-label*="below" i]',
    'button[aria-label*="down" i]',
  ];

  for (const sel of selectors) {
    const el = document.querySelector<HTMLElement>(sel);
    if (!el) continue;
    // For SVGs, walk up to the nearest clickable ancestor
    const target = el.tagName.toLowerCase() === "svg"
      ? (el.closest("button, [role='button'], a") as HTMLElement | null) ?? el
      : el;
    target.click();
    return sel;
  }

  // Fallback 1: keyboard arrow down on the active video element or document body
  const video = document.querySelector<HTMLVideoElement>("video");
  const target = video ?? document.body;
  const ev = new KeyboardEvent("keydown", {
    key: "ArrowDown",
    code: "ArrowDown",
    keyCode: 40,
    which: 40,
    bubbles: true,
    cancelable: true,
    composed: true,
  });
  if (target.dispatchEvent(ev)) {
    document.dispatchEvent(ev);
    return "keydown";
  }

  return null;
}
