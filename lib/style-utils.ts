// CSS generation utilities for ElementStyles — used in both builder and public renderer

import type {
  ElementStyles,
  BackgroundConfig,
  GradientConfig,
  BorderConfig,
  ShadowConfig,
  TextStyleConfig,
  AnimationConfig,
} from "@/types/funnel";

// ─── Gradient ─────────────────────────────────────────────────────────────────

export function buildGradientCSS(g: GradientConfig): string {
  const stops = g.stops.map((s) => `${s.color} ${s.position}%`).join(", ");
  switch (g.type) {
    case "linear":
      return `linear-gradient(${g.angle ?? 135}deg, ${stops})`;
    case "radial":
      return `radial-gradient(circle, ${stops})`;
    case "conic":
      return `conic-gradient(${stops})`;
    default:
      return `linear-gradient(135deg, ${stops})`;
  }
}

// ─── Background ───────────────────────────────────────────────────────────────

export function buildBackgroundStyle(
  bg: BackgroundConfig | undefined,
  defaultBg?: string
): React.CSSProperties {
  const css: React.CSSProperties = {};
  if (!bg || bg.type === "none") {
    if (defaultBg) css.backgroundColor = defaultBg;
    return css;
  }
  if (bg.type === "solid" && bg.color) {
    css.backgroundColor = bg.color;
  } else if (bg.type === "gradient" && bg.gradient) {
    css.background = buildGradientCSS(bg.gradient);
  } else if (bg.type === "image" && bg.image) {
    const img = bg.image;
    css.backgroundImage = `url(${img.url})`;
    css.backgroundSize = img.size;
    css.backgroundPosition = img.position;
    css.backgroundRepeat = img.repeat;
    if (img.fixed) css.backgroundAttachment = "fixed";
  } else {
    if (defaultBg) css.backgroundColor = defaultBg;
  }
  return css;
}

// ─── Border ───────────────────────────────────────────────────────────────────

export function buildBorderStyle(
  border: BorderConfig | undefined
): React.CSSProperties {
  if (!border || border.width === 0) return {};
  const css: React.CSSProperties = {
    border: `${border.width}px ${border.style} ${border.color}`,
  };
  if (border.radiusUniform !== undefined) {
    css.borderRadius = `${border.radiusUniform}px`;
  } else if (
    border.radiusTL !== undefined ||
    border.radiusTR !== undefined ||
    border.radiusBR !== undefined ||
    border.radiusBL !== undefined
  ) {
    css.borderRadius = `${border.radiusTL ?? 0}px ${border.radiusTR ?? 0}px ${border.radiusBR ?? 0}px ${border.radiusBL ?? 0}px`;
  }
  return css;
}

// ─── Shadows ──────────────────────────────────────────────────────────────────

export function buildShadowStyle(
  shadows: ShadowConfig[] | undefined
): React.CSSProperties {
  if (!shadows?.length) return {};
  return {
    boxShadow: shadows
      .map(
        (s) =>
          `${s.inset ? "inset " : ""}${s.x}px ${s.y}px ${s.blur}px ${s.spread}px ${s.color}`
      )
      .join(", "),
  };
}

// ─── Text styles ──────────────────────────────────────────────────────────────

export function buildTextStyle(
  text: TextStyleConfig | undefined
): React.CSSProperties {
  if (!text) return {};
  const css: React.CSSProperties = {};
  if (text.fontFamily) css.fontFamily = `'${text.fontFamily}', sans-serif`;
  if (text.fontSize) css.fontSize = `${text.fontSize}px`;
  if (text.fontWeight) css.fontWeight = text.fontWeight;
  if (text.lineHeight) css.lineHeight = text.lineHeight;
  if (text.letterSpacing) css.letterSpacing = `${text.letterSpacing}px`;
  if (text.textTransform) css.textTransform = text.textTransform;
  if (text.textDecoration) css.textDecoration = text.textDecoration;
  if (text.textShadow) {
    const ts = text.textShadow;
    css.textShadow = `${ts.x}px ${ts.y}px ${ts.blur}px ${ts.color}`;
  }
  if (text.gradientText) {
    css.background = buildGradientCSS(text.gradientText);
    (css as Record<string, unknown>).WebkitBackgroundClip = "text";
    (css as Record<string, unknown>).WebkitTextFillColor = "transparent";
    css.backgroundClip = "text";
  } else if (text.color) {
    css.color = text.color;
  }
  return css;
}

// ─── Full element wrapper styles ──────────────────────────────────────────────

export function buildWrapperStyle(styles: ElementStyles | undefined): React.CSSProperties {
  if (!styles) return {};
  const css: React.CSSProperties = {
    ...buildBackgroundStyle(styles.background),
    ...buildBorderStyle(styles.border),
    ...buildShadowStyle(styles.shadows),
  };
  if (styles.opacity !== undefined && styles.opacity < 1) {
    css.opacity = styles.opacity;
  }
  if (styles.rotation) {
    css.transform = `rotate(${styles.rotation}deg)`;
  }
  if (styles.padding) {
    const p = styles.padding;
    css.padding = `${p.top}px ${p.right}px ${p.bottom}px ${p.left}px`;
  }
  return css;
}

// ─── Animation data attributes (for IntersectionObserver on public page) ──────

export function buildAnimationAttrs(
  animation: AnimationConfig | undefined
): Record<string, string> {
  if (!animation || animation.type === "none") return {};
  return {
    "data-animate": animation.type,
    "data-animate-duration": String(animation.duration),
    "data-animate-delay": String(animation.delay),
    "data-animate-easing": animation.easing,
  };
}

// ─── Collect fonts used in blocks (for Google Fonts loading) ─────────────────

export function collectFontsFromStyles(
  styles: ElementStyles | undefined
): Set<string> {
  const fonts = new Set<string>();
  if (styles?.text?.fontFamily) fonts.add(styles.text.fontFamily);
  return fonts;
}

// ─── Preset gradients ─────────────────────────────────────────────────────────

export const GRADIENT_PRESETS: Array<{
  name: string;
  gradient: GradientConfig;
}> = [
  {
    name: "Sunset",
    gradient: { type: "linear", angle: 135, stops: [{ color: "#f093fb", position: 0 }, { color: "#f5576c", position: 100 }] },
  },
  {
    name: "Ocean",
    gradient: { type: "linear", angle: 135, stops: [{ color: "#667eea", position: 0 }, { color: "#764ba2", position: 100 }] },
  },
  {
    name: "Forest",
    gradient: { type: "linear", angle: 135, stops: [{ color: "#11998e", position: 0 }, { color: "#38ef7d", position: 100 }] },
  },
  {
    name: "Midnight",
    gradient: { type: "linear", angle: 135, stops: [{ color: "#0f0c29", position: 0 }, { color: "#302b63", position: 50 }, { color: "#24243e", position: 100 }] },
  },
  {
    name: "Fire",
    gradient: { type: "linear", angle: 135, stops: [{ color: "#f12711", position: 0 }, { color: "#f5af19", position: 100 }] },
  },
  {
    name: "Arctic",
    gradient: { type: "linear", angle: 135, stops: [{ color: "#74ebd5", position: 0 }, { color: "#acb6e5", position: 100 }] },
  },
  {
    name: "Noir",
    gradient: { type: "linear", angle: 160, stops: [{ color: "#141e30", position: 0 }, { color: "#243b55", position: 100 }] },
  },
  {
    name: "Royal",
    gradient: { type: "linear", angle: 135, stops: [{ color: "#3a1c71", position: 0 }, { color: "#d76d77", position: 50 }, { color: "#ffaf7b", position: 100 }] },
  },
  {
    name: "Candy",
    gradient: { type: "linear", angle: 135, stops: [{ color: "#fc5c7d", position: 0 }, { color: "#6a82fb", position: 100 }] },
  },
  {
    name: "Emerald",
    gradient: { type: "linear", angle: 135, stops: [{ color: "#348f50", position: 0 }, { color: "#56b4d3", position: 100 }] },
  },
];

// ─── Preset shadows ───────────────────────────────────────────────────────────

export const SHADOW_PRESETS: Array<{ name: string; shadows: ShadowConfig[] }> = [
  {
    name: "Subtle",
    shadows: [{ x: 0, y: 1, blur: 3, spread: 0, color: "rgba(0,0,0,0.10)", inset: false }],
  },
  {
    name: "Soft",
    shadows: [{ x: 0, y: 4, blur: 12, spread: 0, color: "rgba(0,0,0,0.15)", inset: false }],
  },
  {
    name: "Heavy",
    shadows: [{ x: 0, y: 8, blur: 30, spread: 0, color: "rgba(0,0,0,0.25)", inset: false }],
  },
  {
    name: "Glow",
    shadows: [{ x: 0, y: 0, blur: 30, spread: 0, color: "rgba(59,130,246,0.35)", inset: false }],
  },
  {
    name: "Neon",
    shadows: [
      { x: 0, y: 0, blur: 10, spread: 0, color: "#3b82f6", inset: false },
      { x: 0, y: 0, blur: 40, spread: 0, color: "rgba(59,130,246,0.25)", inset: false },
    ],
  },
  {
    name: "Inner",
    shadows: [{ x: 0, y: 2, blur: 4, spread: 0, color: "rgba(0,0,0,0.20)", inset: true }],
  },
];

// ─── Font list ────────────────────────────────────────────────────────────────

export const FONT_GROUPS: Array<{ label: string; fonts: string[] }> = [
  {
    label: "Sans Serif",
    fonts: ["Inter", "DM Sans", "Plus Jakarta Sans", "Space Grotesk", "Outfit", "Sora", "Manrope"],
  },
  {
    label: "Serif",
    fonts: ["Playfair Display", "Libre Baskerville", "DM Serif Display", "Lora", "Merriweather"],
  },
  {
    label: "Display",
    fonts: ["Bebas Neue", "Oswald", "Anton", "Righteous"],
  },
  {
    label: "Monospace",
    fonts: ["JetBrains Mono", "Fira Code", "Source Code Pro"],
  },
];

export const ALL_FONTS = FONT_GROUPS.flatMap((g) => g.fonts);

// Build a Google Fonts URL for a set of font names
export function buildGoogleFontsUrl(fonts: string[]): string {
  if (!fonts.length) return "";
  const families = fonts
    .map((f) => `family=${f.replace(/ /g, "+")}:wght@400;500;600;700;800;900`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}
