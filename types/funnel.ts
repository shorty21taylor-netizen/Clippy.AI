// Shared funnel block types — used by the builder, public renderer, and API

export type BlockType =
  | "hero"
  | "text"
  | "image"
  | "video"
  | "form"
  | "cta"
  | "features"
  | "testimonial"
  | "divider"
  | "spacer";

export interface Block {
  id: string;
  type: BlockType;
  data: Record<string, unknown>;
}

// ─── Block data shapes ────────────────────────────────────────────────────────

export interface HeroData {
  headline: string;
  subheadline: string;
  ctaText: string;
  ctaAnchor: string; // "#form" scrolls to form block
  bgColor: string;
  textColor: string;
}

export interface TextData {
  content: string;
  align: "left" | "center" | "right";
  size: "sm" | "md" | "lg";
}

export interface ImageData {
  url: string;
  alt: string;
  caption: string;
  rounded: boolean;
}

export interface VideoData {
  url: string; // YouTube or direct .mp4
  title: string;
}

export interface FormData {
  title: string;
  description: string;
  showName: boolean;
  showEmail: boolean;
  showPhone: boolean;
  submitText: string;
  successMessage: string;
}

export interface CTAData {
  text: string;
  url: string;
  style: "primary" | "secondary" | "outline";
  align: "left" | "center" | "right";
  size: "sm" | "md" | "lg";
}

export interface FeaturesData {
  title: string;
  columns: Array<{ icon: string; title: string; description: string }>;
}

export interface TestimonialData {
  quote: string;
  author: string;
  role: string;
  avatarUrl: string;
}

export interface DividerData {
  style: "solid" | "dashed";
}

export interface SpacerData {
  height: "xs" | "sm" | "md" | "lg" | "xl";
}

// Default data for each block type
export const BLOCK_DEFAULTS: Record<BlockType, Record<string, unknown>> = {
  hero: {
    headline: "Your Compelling Headline",
    subheadline:
      "A brief description that explains your offer and why visitors should act now.",
    ctaText: "Get Started Free",
    ctaAnchor: "#form",
    bgColor: "#0f0f0f",
    textColor: "#ffffff",
  } satisfies HeroData,

  text: {
    content:
      "Add your content here. You can write multiple paragraphs to explain your offer, tell your story, or provide value to your visitors.",
    align: "left",
    size: "md",
  } satisfies TextData,

  image: {
    url: "",
    alt: "",
    caption: "",
    rounded: true,
  } satisfies ImageData,

  video: {
    url: "",
    title: "Watch This",
  } satisfies VideoData,

  form: {
    title: "Get Started Today",
    description: "Fill out the form and we'll be in touch shortly.",
    showName: true,
    showEmail: true,
    showPhone: false,
    submitText: "Submit",
    successMessage: "🎉 Thank you! We'll be in touch soon.",
  } satisfies FormData,

  cta: {
    text: "Click Here →",
    url: "#",
    style: "primary",
    align: "center",
    size: "md",
  } satisfies CTAData,

  features: {
    title: "Why Choose Us",
    columns: [
      { icon: "⚡", title: "Lightning Fast", description: "Get results in record time with our optimized system." },
      { icon: "🔒", title: "Fully Secure", description: "Enterprise-grade security keeps your data safe." },
      { icon: "📈", title: "Scales With You", description: "From 10 to 10,000 customers — we grow with you." },
    ],
  } satisfies FeaturesData,

  testimonial: {
    quote: "This completely transformed our business. We saw a 3x increase in leads within the first month.",
    author: "Sarah Johnson",
    role: "CEO, Acme Corp",
    avatarUrl: "",
  } satisfies TestimonialData,

  divider: { style: "solid" } satisfies DividerData,

  spacer: { height: "md" } satisfies SpacerData,
};

export const BLOCK_LABELS: Record<BlockType, string> = {
  hero: "Hero",
  text: "Text",
  image: "Image",
  video: "Video",
  form: "Lead Form",
  cta: "CTA Button",
  features: "Features",
  testimonial: "Testimonial",
  divider: "Divider",
  spacer: "Spacer",
};

export const BLOCK_ICONS: Record<BlockType, string> = {
  hero: "🎯",
  text: "📝",
  image: "🖼",
  video: "🎬",
  form: "📋",
  cta: "🔥",
  features: "⭐",
  testimonial: "💬",
  divider: "➖",
  spacer: "↕",
};

// Generate a random block ID
export function newBlockId(): string {
  return Math.random().toString(36).slice(2, 10);
}
