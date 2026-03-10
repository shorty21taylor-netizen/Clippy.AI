export type ContentPlatform = "INSTAGRAM" | "TIKTOK" | "YOUTUBE";

const SYSTEM = `You are a world-class social media content strategist and copywriter.
Generate platform-optimized content from the user's raw input.
Always output ONLY the structured content using the exact section tags provided.
Do not add any other commentary, preamble, or explanation outside the tags.`;

const SHARED_RULES = `
Rules:
- Write in an authentic, conversational voice
- Never be generic — be specific and compelling
- Output only the tagged sections, nothing else`;

export function buildPrompt(platform: ContentPlatform, rawInput: string): {
  system: string;
  user: string;
} {
  const platformSection = PLATFORM_PROMPTS[platform];

  const user = `Generate ${platform} content from this input:

---
${rawInput.trim()}
---

Output format — use EXACTLY these tags:

${platformSection.tags}
${SHARED_RULES}`;

  return { system: SYSTEM, user };
}

const PLATFORM_PROMPTS: Record<ContentPlatform, { tags: string }> = {
  INSTAGRAM: {
    tags: `[HOOK]
Write a single punchy opening line (max 15 words) that stops the scroll. No hashtags here.
[/HOOK]

[CAPTION]
Full Instagram caption. Engaging, authentic, 150-300 words. Use emojis naturally. Start with the hook. Build story or value. End with a soft CTA prompt before the hashtags break.
[/CAPTION]

[HASHTAGS]
Exactly 28 relevant hashtags — mix of niche-specific (15), mid-tier (8), and broad (5). Space-separated. Include the # symbol.
[/HASHTAGS]

[CTA]
One strong call to action sentence (save, share, follow, comment). 1-2 sentences max.
[/CTA]

[SCRIPT]
Instagram Reels script, spoken at a natural pace fits 45-60 seconds. Conversational, direct-to-camera feel. Include [B-ROLL] cues in brackets where relevant.
[/SCRIPT]`,
  },

  TIKTOK: {
    tags: `[HOOK]
The first 2-3 seconds (what you say or show on screen immediately). Must create curiosity, shock, or a bold claim. Max 12 words spoken.
[/HOOK]

[CAPTION]
TikTok caption: max 150 characters. Punchy, uses line breaks, ends with a question or CTA. Include 3-5 inline hashtags.
[/CAPTION]

[HASHTAGS]
8-10 trending and relevant hashtags. Mix of viral (#fyp, #foryou) and niche-specific. Space-separated.
[/HASHTAGS]

[CTA]
Simple, direct one-line CTA (follow, duet, comment your answer, etc.)
[/CTA]

[SCRIPT]
Full TikTok script, 30-60 seconds spoken. Fast-paced, punchy. Use [TEXT OVERLAY] cues for on-screen text. Use [CUT] to indicate edit points. Conversational and trend-aware.
[/SCRIPT]`,
  },

  YOUTUBE: {
    tags: `[HOOK]
First 15-second intro script — the words you say to hook viewers and stop them from clicking away. Create curiosity or state a bold promise.
[/HOOK]

[CAPTION]
Full YouTube description: SEO-optimized, 200-300 words. Opens with a paragraph summarizing the video. Include "Timestamps:" placeholder section. Add subscribe CTA. End with 3 relevant links placeholders.
[/CAPTION]

[HASHTAGS]
15 SEO-optimized tags/keywords. Mix of short (2-3 words) and long-tail (4-6 words). Space-separated. No # symbol — these go in the Tags field.
[/HASHTAGS]

[CTA]
End-screen script: 20-30 second outro asking viewers to subscribe and watch the next video. Mention the subscribe bell.
[/CTA]

[SCRIPT]
Condensed video outline / talking points. 5-8 key sections with 2-3 bullet points each. Not a word-for-word script — a structured roadmap.
[/SCRIPT]

[YOUTUBE_TITLE]
SEO-optimized YouTube title. 55-65 characters. Use curiosity, numbers, or clear value. No clickbait — deliver on what you promise.
[/YOUTUBE_TITLE]

[THUMBNAIL_TEXT]
Bold thumbnail overlay text. 3-6 words MAX. ALL CAPS. High contrast. Should work with a face/action shot background.
[/THUMBNAIL_TEXT]`,
  },
};
