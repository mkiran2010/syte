import { skipInstagramReel, startInstagramWatcher } from "./instagram";
import { detectPlatform } from "./platforms";
import { startReelWatcher } from "./shorts";

const platform = detectPlatform();
console.log(`[syte] content script loaded on ${window.location.pathname} — platform: ${platform}`);

switch (platform) {
  case "youtube":
    startReelWatcher();
    break;
  case "instagram":
    startInstagramWatcher();
    // Keep Ctrl+Shift+S for manual debugging in case the auto-loop misfires
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === "S" || e.key === "s")) {
        e.preventDefault();
        const result = skipInstagramReel();
        console.log(`[syte] manual instagram skip: ${result === null ? "null" : `"${result}"`}`);
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
