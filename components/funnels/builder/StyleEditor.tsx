"use client";

import React, { useState, useCallback } from "react";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import type {
  ElementStyles,
  BackgroundConfig,
  GradientConfig,
  GradientStop,
  BorderConfig,
  ShadowConfig,
  TextStyleConfig,
  AnimationConfig,
  AnimationType,
} from "@/types/funnel";
import {
  GRADIENT_PRESETS,
  SHADOW_PRESETS,
  FONT_GROUPS,
  buildGradientCSS,
} from "@/lib/style-utils";

// ─── Shared input primitives ──────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  label: {
    fontSize: "11px",
    fontWeight: 600,
    color: "#71717a",
    display: "block",
    marginBottom: "5px",
    letterSpacing: "0.01em",
  },
  input: {
    width: "100%",
    height: "32px",
    background: "#27272a",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "6px",
    padding: "0 8px",
    color: "#fafafa",
    fontSize: "12px",
    fontFamily: "'Inter', sans-serif",
    outline: "none",
  },
  row: { display: "flex", gap: "8px", alignItems: "center" },
  section: { marginBottom: "20px" },
};

function Label({ children }: { children: React.ReactNode }) {
  return <label style={S.label}>{children}</label>;
}

function SInput({
  value,
  onChange,
  type = "text",
  placeholder,
  min,
  max,
  step,
  style,
}: {
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  style?: React.CSSProperties;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...S.input, ...style }}
    />
  );
}

function SSelect({
  value,
  onChange,
  children,
  style,
}: {
  value: string | number;
  onChange: (v: string) => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        ...S.input,
        appearance: "none",
        cursor: "pointer",
        paddingRight: "28px",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 8px center",
        ...style,
      }}
    >
      {children}
    </select>
  );
}

function ColorSwatch({
  color,
  onChange,
  label,
}: {
  color: string;
  onChange: (c: string) => void;
  label?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <label style={{ position: "relative", cursor: "pointer", flexShrink: 0 }}>
        <div
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "6px",
            background: color || "#000",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        />
        <input
          type="color"
          value={color || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }}
        />
      </label>
      <SInput
        value={color}
        onChange={onChange}
        placeholder="#000000"
        style={{ flex: 1 }}
      />
      {label && <span style={{ fontSize: "11px", color: "#71717a", flexShrink: 0 }}>{label}</span>}
    </div>
  );
}

function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = "",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}) {
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <Label>{label}</Label>
        <span style={{ fontSize: "11px", color: "#a1a1aa" }}>
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "#3b82f6" }}
      />
    </div>
  );
}

function SectionHeader({
  title,
  open,
  onToggle,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        padding: "8px 0",
        background: "none",
        border: "none",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        cursor: "pointer",
        color: "#fafafa",
        fontSize: "12px",
        fontWeight: 600,
        marginBottom: open ? "12px" : "0",
        letterSpacing: "0.02em",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {title}
      <ChevronDown
        size={14}
        style={{
          color: "#71717a",
          transform: open ? "rotate(0deg)" : "rotate(-90deg)",
          transition: "transform 150ms",
        }}
      />
    </button>
  );
}

// ─── Gradient Editor ──────────────────────────────────────────────────────────

function GradientEditor({
  gradient,
  onChange,
}: {
  gradient: GradientConfig;
  onChange: (g: GradientConfig) => void;
}) {
  const addStop = () => {
    const newStop: GradientStop = { color: "#ffffff", position: 50 };
    onChange({ ...gradient, stops: [...gradient.stops, newStop] });
  };

  const updateStop = (i: number, stop: Partial<GradientStop>) => {
    const stops = gradient.stops.map((s, idx) =>
      idx === i ? { ...s, ...stop } : s
    );
    onChange({ ...gradient, stops });
  };

  const removeStop = (i: number) => {
    if (gradient.stops.length <= 2) return;
    onChange({ ...gradient, stops: gradient.stops.filter((_, idx) => idx !== i) });
  };

  // Preview CSS
  const previewCss = buildGradientCSS(gradient);

  return (
    <div>
      {/* Gradient Preview */}
      <div
        style={{
          height: "32px",
          borderRadius: "6px",
          background: previewCss,
          marginBottom: "10px",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      />

      {/* Type + Angle */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
        <div style={{ flex: 1 }}>
          <Label>Type</Label>
          <SSelect
            value={gradient.type}
            onChange={(v) => onChange({ ...gradient, type: v as GradientConfig["type"] })}
          >
            <option value="linear">Linear</option>
            <option value="radial">Radial</option>
            <option value="conic">Conic</option>
          </SSelect>
        </div>
        {gradient.type === "linear" && (
          <div style={{ width: "70px" }}>
            <Label>Angle</Label>
            <SInput
              type="number"
              value={gradient.angle ?? 135}
              onChange={(v) => onChange({ ...gradient, angle: Number(v) })}
              min={0}
              max={360}
            />
          </div>
        )}
      </div>

      {/* Color Stops */}
      <Label>Color Stops</Label>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "8px" }}>
        {gradient.stops.map((stop, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <label style={{ position: "relative", cursor: "pointer", flexShrink: 0 }}>
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "4px",
                  background: stop.color,
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              />
              <input
                type="color"
                value={stop.color}
                onChange={(e) => updateStop(i, { color: e.target.value })}
                style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }}
              />
            </label>
            <SInput
              value={stop.color}
              onChange={(v) => updateStop(i, { color: v })}
              style={{ flex: 1 }}
            />
            <SInput
              type="number"
              value={stop.position}
              onChange={(v) => updateStop(i, { position: Number(v) })}
              min={0}
              max={100}
              style={{ width: "50px" }}
            />
            <span style={{ fontSize: "10px", color: "#52525b" }}>%</span>
            <button
              onClick={() => removeStop(i)}
              disabled={gradient.stops.length <= 2}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: gradient.stops.length <= 2 ? "#3f3f46" : "#ef4444",
                padding: "2px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={addStop}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "6px",
          padding: "4px 8px",
          color: "#a1a1aa",
          fontSize: "11px",
          cursor: "pointer",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <Plus size={11} /> Add Stop
      </button>
    </div>
  );
}

// ─── Gradient Presets ─────────────────────────────────────────────────────────

function GradientPresets({
  onSelect,
}: {
  onSelect: (g: GradientConfig) => void;
}) {
  return (
    <div>
      <Label>Presets</Label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "4px" }}>
        {GRADIENT_PRESETS.map((p) => (
          <button
            key={p.name}
            title={p.name}
            onClick={() => onSelect(p.gradient)}
            style={{
              height: "28px",
              borderRadius: "4px",
              background: buildGradientCSS(p.gradient),
              border: "1px solid rgba(255,255,255,0.08)",
              cursor: "pointer",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Background Section ───────────────────────────────────────────────────────

const DEFAULT_GRADIENT: GradientConfig = {
  type: "linear",
  angle: 135,
  stops: [
    { color: "#667eea", position: 0 },
    { color: "#764ba2", position: 100 },
  ],
};

function BackgroundSection({
  bg,
  onChange,
}: {
  bg: BackgroundConfig | undefined;
  onChange: (bg: BackgroundConfig) => void;
}) {
  const type = bg?.type ?? "none";

  const set = (patch: Partial<BackgroundConfig>) =>
    onChange({ type: "none", ...bg, ...patch } as BackgroundConfig);

  return (
    <div style={S.section}>
      <Label>Type</Label>
      <div style={{ display: "flex", gap: "4px", marginBottom: "12px" }}>
        {(["none", "solid", "gradient", "image"] as const).map((t) => (
          <button
            key={t}
            onClick={() => set({ type: t })}
            style={{
              flex: 1,
              height: "28px",
              borderRadius: "5px",
              background: type === t ? "#3b82f6" : "rgba(255,255,255,0.04)",
              border: `1px solid ${type === t ? "#3b82f6" : "rgba(255,255,255,0.08)"}`,
              color: type === t ? "#fff" : "#71717a",
              fontSize: "11px",
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              textTransform: "capitalize",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {type === "solid" && (
        <div>
          <Label>Color</Label>
          <ColorSwatch
            color={bg?.color ?? "#ffffff"}
            onChange={(c) => set({ color: c })}
          />
        </div>
      )}

      {type === "gradient" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <GradientPresets
            onSelect={(g) => set({ gradient: g })}
          />
          <GradientEditor
            gradient={bg?.gradient ?? DEFAULT_GRADIENT}
            onChange={(g) => set({ gradient: g })}
          />
        </div>
      )}

      {type === "image" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div>
            <Label>Image URL</Label>
            <SInput
              value={bg?.image?.url ?? ""}
              onChange={(v) => set({ image: { url: v, size: "cover", position: "center", repeat: "no-repeat", fixed: false, ...bg?.image } })}
              placeholder="https://..."
            />
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <div style={{ flex: 1 }}>
              <Label>Size</Label>
              <SSelect
                value={bg?.image?.size ?? "cover"}
                onChange={(v) => { const img = { url: "", size: "cover" as const, position: "center", repeat: "no-repeat" as const, fixed: false, ...bg?.image }; set({ image: { ...img, size: v as "cover" | "contain" | "auto" } }); }}
              >
                <option value="cover">Cover</option>
                <option value="contain">Contain</option>
                <option value="auto">Auto</option>
              </SSelect>
            </div>
            <div style={{ flex: 1 }}>
              <Label>Position</Label>
              <SSelect
                value={bg?.image?.position ?? "center"}
                onChange={(v) => { const img = { url: "", size: "cover" as const, position: "center", repeat: "no-repeat" as const, fixed: false, ...bg?.image }; set({ image: { ...img, position: v } }); }}
              >
                <option value="center">Center</option>
                <option value="top">Top</option>
                <option value="bottom">Bottom</option>
                <option value="left">Left</option>
                <option value="right">Right</option>
              </SSelect>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              id="bg-fixed"
              checked={bg?.image?.fixed ?? false}
              onChange={(e) => { const img = { url: "", size: "cover" as const, position: "center", repeat: "no-repeat" as const, fixed: false, ...bg?.image }; set({ image: { ...img, fixed: e.target.checked } }); }}
              style={{ accentColor: "#3b82f6" }}
            />
            <label htmlFor="bg-fixed" style={{ fontSize: "12px", color: "#a1a1aa", cursor: "pointer" }}>
              Fixed (parallax)
            </label>
          </div>
        </div>
      )}

      {type !== "none" && (
        <div style={{ marginTop: "12px", padding: "10px", background: "rgba(255,255,255,0.02)", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.06)" }}>
          <Label>Overlay</Label>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <ColorSwatch
              color={bg?.overlay?.color ?? "#000000"}
              onChange={(c) => set({ overlay: { color: c, opacity: bg?.overlay?.opacity ?? 0.4 } })}
            />
          </div>
          <div style={{ marginTop: "8px" }}>
            <Slider
              label="Opacity"
              value={Math.round((bg?.overlay?.opacity ?? 0) * 100)}
              onChange={(v) => set({ overlay: { color: bg?.overlay?.color ?? "#000000", opacity: v / 100 } })}
              min={0}
              max={100}
              unit="%"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Typography Section ───────────────────────────────────────────────────────

const TEXT_SHADOW_PRESETS = [
  { name: "None", value: null },
  { name: "Soft", value: { x: 0, y: 2, blur: 4, color: "rgba(0,0,0,0.4)" } },
  { name: "Hard", value: { x: 2, y: 2, blur: 0, color: "rgba(0,0,0,0.8)" } },
  { name: "Glow", value: { x: 0, y: 0, blur: 12, color: "rgba(59,130,246,0.8)" } },
  { name: "Neon", value: { x: 0, y: 0, blur: 20, color: "rgba(168,85,247,0.9)" } },
];

function TypographySection({
  text,
  onChange,
}: {
  text: TextStyleConfig | undefined;
  onChange: (t: TextStyleConfig) => void;
}) {
  const set = (patch: Partial<TextStyleConfig>) =>
    onChange({ ...text, ...patch });

  const [gradientText, setGradientTextEnabled] = useState(!!text?.gradientText);

  return (
    <div style={S.section}>
      {/* Font Family */}
      <div style={{ marginBottom: "10px" }}>
        <Label>Font Family</Label>
        <SSelect
          value={text?.fontFamily ?? ""}
          onChange={(v) => set({ fontFamily: v || undefined })}
        >
          <option value="">Default</option>
          {FONT_GROUPS.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.fonts.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </optgroup>
          ))}
        </SSelect>
      </div>

      {/* Size + Weight row */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
        <div style={{ flex: 1 }}>
          <Label>Size (px)</Label>
          <SInput
            type="number"
            value={text?.fontSize ?? ""}
            onChange={(v) => set({ fontSize: v ? Number(v) : undefined })}
            placeholder="inherit"
            min={8}
            max={200}
          />
        </div>
        <div style={{ flex: 1 }}>
          <Label>Weight</Label>
          <SSelect
            value={text?.fontWeight ?? ""}
            onChange={(v) => set({ fontWeight: v ? Number(v) : undefined })}
          >
            <option value="">Default</option>
            <option value="300">Light 300</option>
            <option value="400">Regular 400</option>
            <option value="500">Medium 500</option>
            <option value="600">SemiBold 600</option>
            <option value="700">Bold 700</option>
            <option value="800">ExtraBold 800</option>
            <option value="900">Black 900</option>
          </SSelect>
        </div>
      </div>

      {/* Line height + Letter spacing */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
        <div style={{ flex: 1 }}>
          <Label>Line Height</Label>
          <SInput
            type="number"
            value={text?.lineHeight ?? ""}
            onChange={(v) => set({ lineHeight: v ? Number(v) : undefined })}
            placeholder="1.5"
            min={0.8}
            max={3}
            step={0.05}
          />
        </div>
        <div style={{ flex: 1 }}>
          <Label>Spacing (px)</Label>
          <SInput
            type="number"
            value={text?.letterSpacing ?? ""}
            onChange={(v) => set({ letterSpacing: v ? Number(v) : undefined })}
            placeholder="0"
            min={-5}
            max={20}
            step={0.5}
          />
        </div>
      </div>

      {/* Transform + Decoration */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "10px" }}>
        <div style={{ flex: 1 }}>
          <Label>Transform</Label>
          <SSelect
            value={text?.textTransform ?? "none"}
            onChange={(v) => set({ textTransform: v as TextStyleConfig["textTransform"] })}
          >
            <option value="none">None</option>
            <option value="uppercase">UPPERCASE</option>
            <option value="lowercase">lowercase</option>
            <option value="capitalize">Capitalize</option>
          </SSelect>
        </div>
        <div style={{ flex: 1 }}>
          <Label>Decoration</Label>
          <SSelect
            value={text?.textDecoration ?? "none"}
            onChange={(v) => set({ textDecoration: v as TextStyleConfig["textDecoration"] })}
          >
            <option value="none">None</option>
            <option value="underline">Underline</option>
            <option value="line-through">Strikethrough</option>
          </SSelect>
        </div>
      </div>

      {/* Color / Gradient Text toggle */}
      <div style={{ marginBottom: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
          <Label>Text Color</Label>
          <button
            onClick={() => {
              const next = !gradientText;
              setGradientTextEnabled(next);
              if (!next) {
                set({ gradientText: undefined });
              } else {
                set({ gradientText: DEFAULT_GRADIENT, color: undefined });
              }
            }}
            style={{
              fontSize: "10px",
              background: gradientText ? "#3b82f6" : "rgba(255,255,255,0.06)",
              border: "none",
              borderRadius: "4px",
              color: gradientText ? "#fff" : "#71717a",
              padding: "2px 6px",
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Gradient
          </button>
        </div>

        {gradientText ? (
          <div>
            <GradientPresets onSelect={(g) => set({ gradientText: g })} />
            <div style={{ marginTop: "8px" }}>
              <GradientEditor
                gradient={text?.gradientText ?? DEFAULT_GRADIENT}
                onChange={(g) => set({ gradientText: g })}
              />
            </div>
          </div>
        ) : (
          <ColorSwatch
            color={text?.color ?? "#000000"}
            onChange={(c) => set({ color: c })}
          />
        )}
      </div>

      {/* Text Shadow */}
      <div>
        <Label>Text Shadow</Label>
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "8px" }}>
          {TEXT_SHADOW_PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => set({ textShadow: p.value ?? undefined })}
              style={{
                height: "24px",
                padding: "0 8px",
                borderRadius: "4px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#a1a1aa",
                fontSize: "10px",
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {p.name}
            </button>
          ))}
        </div>
        {text?.textShadow && (
          <div style={{ display: "flex", gap: "6px" }}>
            <div style={{ flex: 1 }}>
              <Label>X</Label>
              <SInput type="number" value={text.textShadow.x} onChange={(v) => set({ textShadow: { ...text.textShadow!, x: Number(v) } })} />
            </div>
            <div style={{ flex: 1 }}>
              <Label>Y</Label>
              <SInput type="number" value={text.textShadow.y} onChange={(v) => set({ textShadow: { ...text.textShadow!, y: Number(v) } })} />
            </div>
            <div style={{ flex: 1 }}>
              <Label>Blur</Label>
              <SInput type="number" value={text.textShadow.blur} onChange={(v) => set({ textShadow: { ...text.textShadow!, blur: Number(v) } })} min={0} />
            </div>
            <div style={{ flex: 1 }}>
              <Label>Color</Label>
              <label style={{ position: "relative", cursor: "pointer" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "6px", background: text.textShadow.color, border: "1px solid rgba(255,255,255,0.12)" }} />
                <input type="color" value={text.textShadow.color} onChange={(e) => set({ textShadow: { ...text.textShadow!, color: e.target.value } })} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }} />
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Effects (Shadow, Border, Opacity, Rotation) ──────────────────────────────

const DEFAULT_SHADOW: ShadowConfig = { x: 0, y: 4, blur: 12, spread: 0, color: "rgba(0,0,0,0.15)", inset: false };
const DEFAULT_BORDER: BorderConfig = { width: 1, style: "solid", color: "#e4e4e7", radiusUniform: 0 };

function ShadowEditor({
  shadows,
  onChange,
}: {
  shadows: ShadowConfig[];
  onChange: (s: ShadowConfig[]) => void;
}) {
  const updateShadow = (i: number, patch: Partial<ShadowConfig>) => {
    onChange(shadows.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  };
  const removeShadow = (i: number) => {
    onChange(shadows.filter((_, idx) => idx !== i));
  };

  return (
    <div>
      {/* Presets */}
      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "10px" }}>
        {SHADOW_PRESETS.map((p) => (
          <button
            key={p.name}
            onClick={() => onChange(p.shadows)}
            style={{
              height: "24px",
              padding: "0 8px",
              borderRadius: "4px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#a1a1aa",
              fontSize: "10px",
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {p.name}
          </button>
        ))}
        {shadows.length > 0 && (
          <button
            onClick={() => onChange([])}
            style={{
              height: "24px",
              padding: "0 8px",
              borderRadius: "4px",
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.2)",
              color: "#f87171",
              fontSize: "10px",
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Shadow list */}
      {shadows.map((shadow, i) => (
        <div
          key={i}
          style={{
            marginBottom: "10px",
            padding: "10px",
            background: "rgba(255,255,255,0.02)",
            borderRadius: "6px",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "11px", color: "#71717a" }}>Shadow {i + 1}</span>
            <button
              onClick={() => removeShadow(i)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: "2px" }}
            >
              <Trash2 size={12} />
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "6px", marginBottom: "8px" }}>
            {(["x", "y", "blur", "spread"] as const).map((prop) => (
              <div key={prop}>
                <Label>{prop.toUpperCase()}</Label>
                <SInput
                  type="number"
                  value={shadow[prop]}
                  onChange={(v) => updateShadow(i, { [prop]: Number(v) })}
                />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <Label>Color</Label>
              <ColorSwatch
                color={shadow.color}
                onChange={(c) => updateShadow(i, { color: c })}
              />
            </div>
            <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: "4px", marginTop: "18px" }}>
              <input
                type="checkbox"
                id={`inset-${i}`}
                checked={shadow.inset}
                onChange={(e) => updateShadow(i, { inset: e.target.checked })}
                style={{ accentColor: "#3b82f6" }}
              />
              <label htmlFor={`inset-${i}`} style={{ fontSize: "11px", color: "#a1a1aa", cursor: "pointer" }}>
                Inset
              </label>
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={() => onChange([...shadows, { ...DEFAULT_SHADOW }])}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "6px",
          padding: "4px 8px",
          color: "#a1a1aa",
          fontSize: "11px",
          cursor: "pointer",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <Plus size={11} /> Add Shadow
      </button>
    </div>
  );
}

function BorderSection({
  border,
  onChange,
}: {
  border: BorderConfig | undefined;
  onChange: (b: BorderConfig | undefined) => void;
}) {
  const enabled = !!border && border.width > 0;

  const set = (patch: Partial<BorderConfig>) =>
    onChange({ ...DEFAULT_BORDER, ...border, ...patch });

  return (
    <div style={S.section}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
        <Label>Border</Label>
        <button
          onClick={() => onChange(enabled ? undefined : { ...DEFAULT_BORDER })}
          style={{
            width: "34px",
            height: "18px",
            borderRadius: "9px",
            background: enabled ? "#3b82f6" : "rgba(255,255,255,0.12)",
            border: "none",
            cursor: "pointer",
            position: "relative",
            transition: "background 150ms",
          }}
        >
          <div
            style={{
              width: "14px",
              height: "14px",
              borderRadius: "50%",
              background: "#fff",
              position: "absolute",
              top: "2px",
              left: enabled ? "18px" : "2px",
              transition: "left 150ms",
            }}
          />
        </button>
      </div>

      {enabled && (
        <div>
          <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
            <div style={{ flex: 1 }}>
              <Label>Width (px)</Label>
              <SInput
                type="number"
                value={border!.width}
                onChange={(v) => set({ width: Number(v) })}
                min={0}
                max={20}
              />
            </div>
            <div style={{ flex: 1 }}>
              <Label>Style</Label>
              <SSelect
                value={border!.style}
                onChange={(v) => set({ style: v as BorderConfig["style"] })}
              >
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </SSelect>
            </div>
          </div>
          <div style={{ marginBottom: "8px" }}>
            <Label>Color</Label>
            <ColorSwatch
              color={border!.color}
              onChange={(c) => set({ color: c })}
            />
          </div>
          <div>
            <Label>Radius (px)</Label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "6px" }}>
              {(["radiusTL", "radiusTR", "radiusBR", "radiusBL"] as const).map((k) => (
                <div key={k}>
                  <Label>{k.replace("radius", "").replace("TL", "↖").replace("TR", "↗").replace("BR", "↘").replace("BL", "↙")}</Label>
                  <SInput
                    type="number"
                    value={border![k] ?? border!.radiusUniform ?? 0}
                    onChange={(v) => set({ [k]: Number(v), radiusUniform: undefined })}
                    min={0}
                    max={200}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EffectsSection({
  styles,
  onChange,
}: {
  styles: ElementStyles;
  onChange: (patch: Partial<ElementStyles>) => void;
}) {
  return (
    <div style={S.section}>
      {/* Opacity */}
      <Slider
        label="Opacity"
        value={Math.round((styles.opacity ?? 1) * 100)}
        onChange={(v) => onChange({ opacity: v / 100 })}
        min={0}
        max={100}
        unit="%"
      />

      {/* Rotation */}
      <Slider
        label="Rotation"
        value={styles.rotation ?? 0}
        onChange={(v) => onChange({ rotation: v })}
        min={-180}
        max={180}
        unit="°"
      />

      {/* Padding */}
      <div style={{ marginBottom: "10px" }}>
        <Label>Padding (px)</Label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "6px" }}>
          {(["top", "right", "bottom", "left"] as const).map((side) => (
            <div key={side}>
              <Label>{side[0].toUpperCase()}</Label>
              <SInput
                type="number"
                value={styles.padding?.[side] ?? 0}
                onChange={(v) =>
                  onChange({
                    padding: {
                      top: 0, right: 0, bottom: 0, left: 0,
                      ...styles.padding,
                      [side]: Number(v),
                    },
                  })
                }
                min={0}
                max={200}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Animation Section ────────────────────────────────────────────────────────

const ANIMATION_TYPES: Array<{ value: AnimationType; label: string }> = [
  { value: "none", label: "None" },
  { value: "fade-in", label: "Fade In" },
  { value: "fade-in-up", label: "Fade In Up" },
  { value: "fade-in-down", label: "Fade In Down" },
  { value: "fade-in-left", label: "Fade In Left" },
  { value: "fade-in-right", label: "Fade In Right" },
  { value: "slide-in-up", label: "Slide In Up" },
  { value: "zoom-in", label: "Zoom In" },
  { value: "bounce-in", label: "Bounce In" },
];

const DEFAULT_ANIMATION: AnimationConfig = {
  type: "fade-in-up",
  duration: 600,
  delay: 0,
  easing: "ease-out",
};

function AnimationSection({
  animation,
  onChange,
}: {
  animation: AnimationConfig | undefined;
  onChange: (a: AnimationConfig | undefined) => void;
}) {
  const type = animation?.type ?? "none";

  const set = (patch: Partial<AnimationConfig>) =>
    onChange({ ...DEFAULT_ANIMATION, ...animation, ...patch });

  return (
    <div style={S.section}>
      <div style={{ marginBottom: "10px" }}>
        <Label>Entrance Animation</Label>
        <SSelect value={type} onChange={(v) => {
          if (v === "none") onChange(undefined);
          else set({ type: v as AnimationType });
        }}>
          {ANIMATION_TYPES.map((a) => (
            <option key={a.value} value={a.value}>{a.label}</option>
          ))}
        </SSelect>
      </div>

      {type !== "none" && (
        <>
          <Slider
            label="Duration"
            value={animation?.duration ?? 600}
            onChange={(v) => set({ duration: v })}
            min={100}
            max={2000}
            step={50}
            unit="ms"
          />
          <Slider
            label="Delay"
            value={animation?.delay ?? 0}
            onChange={(v) => set({ delay: v })}
            min={0}
            max={2000}
            step={50}
            unit="ms"
          />
          <div>
            <Label>Easing</Label>
            <SSelect
              value={animation?.easing ?? "ease-out"}
              onChange={(v) => set({ easing: v as AnimationConfig["easing"] })}
            >
              <option value="ease">Ease</option>
              <option value="ease-in">Ease In</option>
              <option value="ease-out">Ease Out</option>
              <option value="ease-in-out">Ease In Out</option>
            </SSelect>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main StyleEditor ─────────────────────────────────────────────────────────

interface StyleEditorProps {
  styles: ElementStyles;
  onChange: (patch: Partial<ElementStyles>) => void;
}

export function StyleEditor({ styles, onChange }: StyleEditorProps) {
  const [openSections, setOpenSections] = useState({
    background: true,
    typography: false,
    effects: false,
    shadow: false,
    border: false,
    animation: false,
  });

  const toggle = (key: keyof typeof openSections) =>
    setOpenSections((s) => ({ ...s, [key]: !s[key] }));

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column", gap: "2px" }}>
      {/* Background */}
      <div>
        <SectionHeader title="Background" open={openSections.background} onToggle={() => toggle("background")} />
        {openSections.background && (
          <BackgroundSection
            bg={styles.background}
            onChange={(bg) => onChange({ background: bg })}
          />
        )}
      </div>

      {/* Typography */}
      <div>
        <SectionHeader title="Typography" open={openSections.typography} onToggle={() => toggle("typography")} />
        {openSections.typography && (
          <TypographySection
            text={styles.text}
            onChange={(t) => onChange({ text: t })}
          />
        )}
      </div>

      {/* Effects (opacity, rotation, padding) */}
      <div>
        <SectionHeader title="Effects" open={openSections.effects} onToggle={() => toggle("effects")} />
        {openSections.effects && (
          <EffectsSection
            styles={styles}
            onChange={onChange}
          />
        )}
      </div>

      {/* Box Shadow */}
      <div>
        <SectionHeader title="Box Shadow" open={openSections.shadow} onToggle={() => toggle("shadow")} />
        {openSections.shadow && (
          <ShadowEditor
            shadows={styles.shadows ?? []}
            onChange={(s) => onChange({ shadows: s })}
          />
        )}
      </div>

      {/* Border */}
      <div>
        <SectionHeader title="Border" open={openSections.border} onToggle={() => toggle("border")} />
        {openSections.border && (
          <BorderSection
            border={styles.border}
            onChange={(b) => onChange({ border: b ?? undefined })}
          />
        )}
      </div>

      {/* Animation */}
      <div>
        <SectionHeader title="Animation" open={openSections.animation} onToggle={() => toggle("animation")} />
        {openSections.animation && (
          <AnimationSection
            animation={styles.animation}
            onChange={(a) => onChange({ animation: a })}
          />
        )}
      </div>
    </div>
  );
}
