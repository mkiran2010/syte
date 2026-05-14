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
    console.log(
      "[syte] instagram detected — press Ctrl+Shift+S anywhere on this page to test the skip button. The result logs here.",
    );
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "S" || e.key === "s")) {
        e.preventDefault();
        const result = skipInstagramReel();
        console.log(`[syte] instagram skip result: ${result === null ? "null (no selector matched)" : `"${result}"`}`);
      }
    });
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
