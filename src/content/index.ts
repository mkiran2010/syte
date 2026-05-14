import { skipInstagramReel } from "./instagram";
import { detectPlatform } from "./platforms";
import { startReelWatcher } from "./shorts";

const platform = detectPlatform();
console.log(`[syte] content script loaded on ${window.location.pathname} — platform: ${platform}`);

switch (platform) {
  case "youtube":
    startReelWatcher();
    break;
  case "instagram":
    // Expose the skip primitive on window so we can verify it from devtools.
    // Run window.syteInstagramSkip() in the page console while watching a Reel.
    (window as unknown as { syteInstagramSkip: () => string | null }).syteInstagramSkip = skipInstagramReel;
    console.log(
      "[syte] instagram detected — to test the skip button, run window.syteInstagramSkip() in this console while watching a Reel.",
    );
    break;
  case "tiktok":
  case "x":
    console.log(
      `[syte] platform "${platform}" detected but not yet implemented — see research/platforms.md.`,
    );
    break;
  case "unknown":
    break;
}
