export interface VideoMeta {
  videoId: string;
  title: string;
  channel: string;
}

export type Verdict = "Junk" | "Stay";

export interface ScoredReel {
  videoId: string;
  verdict: Verdict;
  reason: string;
  scoredAt: number;
}

export interface Settings {
  apiKey: string;
  model: string;
  rubric: string;
  autoSkipEnabled: boolean;
}

export const DEFAULT_RUBRIC = `You are classifying a single YouTube Short as either "Junk" or "Stay" based on title and channel name.

"Junk" — strong negative signal. Examples:
- Three or more emojis in the title (😂😂😂, 🔥🔥🔥, 💀💀💀)
- Hashtag spam (#funny #lol #fyp #foryou stacked together)
- One-word emotional bait ("HILARIOUS", "INSANE", "CRAZY", "WAIT FOR IT")
- "POV", "When you", "Me when", "Tag a friend who…"
- Sigma/alpha/grindset bait, gym-rage edits, motivational shouting
- Prank, reaction, gossip, drama, "exposing", street interviews
- Clickbait punctuation (?!?!, →→→, ALL CAPS titles)
- Generic comedy with no specific topic ("funny moment", "lmao", "lol")
- Cute-animal compilation with no original commentary

"Stay" — substantive content. Examples:
- Teaches a real skill (cooking technique, code, music theory, language)
- Original analysis or commentary on a specific topic
- Documentary, news, science, history, journalism
- Genuine creative work (original music, art, well-made comedy with a setup/punchline)
- Hobbyist depth (woodworking, sports analysis, hardware reviews, board games)
- Educational explainer

When the title is just emojis, generic praise, or you cannot identify a substantive topic, classify as "Junk". When uncertain between the two, lean "Junk" — the user wants a strict filter and a missed Junk is worse than a missed Stay.`;

export const DEFAULT_SETTINGS: Settings = {
  apiKey: "",
  model: "claude-haiku-4-5",
  rubric: DEFAULT_RUBRIC,
  autoSkipEnabled: true,
};
