"use client";

import React, { useState, useCallback } from "react";
import {
  ChevronDown,
  X,
  Plus,
  Trash2,
  GripVertical,
} from "lucide-react";
import { useBuilder } from "./context";
import { StyleEditor } from "./StyleEditor";
import { BLOCK_LABELS } from "@/types/funnel";
import type {
  Block,
  HeroData,
  TextData,
  ImageData,
  VideoData,
  FormData,
  CTAData,
  FeaturesData,
  TestimonialData,
  DividerData,
  SpacerData,
  ElementStyles,
} from "@/types/funnel";

// ─── Shared styled input components ──────────────────────────────────────────

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  height: "34px",
  background: "#27272a",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "7px",
  padding: "0 10px",
  color: "#fafafa",
  fontSize: "13px",
  fontFamily: "'Inter', sans-serif",
  outline: "none",
  transition: "border-color 150ms, box-shadow 150ms",
};

const TEXTAREA_STYLE: React.CSSProperties = {
  ...INPUT_STYLE,
  height: "auto",
  padding: "8px 10px",
  resize: "vertical",
  minHeight: "72px",
  lineHeight: 1.5,
};

const LABEL_STYLE: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  color: "#71717a",
  display: "block",
  marginBottom: "5px",
  fontFamily: "'Inter', sans-serif",
  letterSpacing: "0.01em",
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: "12px" }}>
      <label style={LABEL_STYLE}>{label}</label>
      {children}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={INPUT_STYLE}
      onFocus={(e) => {
        (e.target as HTMLInputElement).style.borderColor = "rgba(59,130,246,0.6)";
        (e.target as HTMLInputElement).style.boxShadow =
          "0 0 0 3px rgba(59,130,246,0.08)";
      }}
      onBlur={(e) => {
        (e.target as HTMLInputElement).style.borderColor =
          "rgba(255,255,255,0.08)";
        (e.target as HTMLInputElement).style.boxShadow = "none";
      }}
    />
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={TEXTAREA_STYLE}
      onFocus={(e) => {
        (e.target as HTMLTextAreaElement).style.borderColor =
          "rgba(59,130,246,0.6)";
        (e.target as HTMLTextAreaElement).style.boxShadow =
          "0 0 0 3px rgba(59,130,246,0.08)";
      }}
      onBlur={(e) => {
        (e.target as HTMLTextAreaElement).style.borderColor =
          "rgba(255,255,255,0.08)";
        (e.target as HTMLTextAreaElement).style.boxShadow = "none";
      }}
    />
  );
}

function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          ...INPUT_STYLE,
          paddingRight: "30px",
          appearance: "none",
          cursor: "pointer",
        }}
        onFocus={(e) => {
          (e.target as HTMLSelectElement).style.borderColor =
            "rgba(59,130,246,0.6)";
          (e.target as HTMLSelectElement).style.boxShadow =
            "0 0 0 3px rgba(59,130,246,0.08)";
        }}
        onBlur={(e) => {
          (e.target as HTMLSelectElement).style.borderColor =
            "rgba(255,255,255,0.08)";
          (e.target as HTMLSelectElement).style.boxShadow = "none";
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} style={{ background: "#27272a" }}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={13}
        style={{
          position: "absolute",
          right: "10px",
          top: "50%",
          transform: "translateY(-50%)",
          color: "#71717a",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "10px",
      }}
    >
      <span
        style={{
          fontSize: "13px",
          color: "#a1a1aa",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {label}
      </span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          width: "38px",
          height: "22px",
          borderRadius: "11px",
          background: checked ? "#3b82f6" : "rgba(255,255,255,0.1)",
          border: "none",
          cursor: "pointer",
          position: "relative",
          transition: "background 200ms",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: "3px",
            left: checked ? "18px" : "3px",
            width: "16px",
            height: "16px",
            borderRadius: "50%",
            background: "#fff",
            transition: "left 200ms",
            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
          }}
        />
      </button>
    </div>
  );
}

function SegmentedControl({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div
      style={{
        display: "flex",
        background: "rgba(255,255,255,0.04)",
        borderRadius: "7px",
        padding: "3px",
        border: "1px solid rgba(255,255,255,0.06)",
        gap: "2px",
      }}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              flex: 1,
              padding: "4px 8px",
              borderRadius: "5px",
              border: "none",
              background: active ? "rgba(59,130,246,0.2)" : "transparent",
              color: active ? "#60a5fa" : "#71717a",
              fontSize: "12px",
              fontFamily: "'Inter', sans-serif",
              fontWeight: active ? 600 : 400,
              cursor: "pointer",
              transition: "all 150ms",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function ColorInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        marginBottom: "10px",
      }}
    >
      <div style={{ position: "relative", flexShrink: 0 }}>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            position: "absolute",
            opacity: 0,
            inset: 0,
            width: "100%",
            height: "100%",
            cursor: "pointer",
            border: "none",
            padding: 0,
          }}
        />
        <div
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "6px",
            background: value,
            border: "2px solid rgba(255,255,255,0.12)",
            cursor: "pointer",
          }}
        />
      </div>
      <span style={{ fontSize: "13px", color: "#a1a1aa", fontFamily: "'Inter', sans-serif", flex: 1 }}>
        {label}
      </span>
      <span style={{ fontSize: "11px", color: "#52525b", fontFamily: "monospace" }}>
        {value}
      </span>
    </div>
  );
}

// ─── Collapsible section ──────────────────────────────────────────────────────

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          padding: "12px 16px",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#fafafa",
          fontSize: "13px",
          fontWeight: 600,
          fontFamily: "'Inter', sans-serif",
          transition: "background 150ms",
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.background =
            "rgba(255,255,255,0.02)")
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.background = "none")
        }
      >
        {title}
        <ChevronDown
          size={14}
          style={{
            color: "#71717a",
            transform: open ? "rotate(0deg)" : "rotate(-90deg)",
            transition: "transform 200ms",
          }}
        />
      </button>

      {open && (
        <div style={{ padding: "0 16px 16px" }}>{children}</div>
      )}
    </div>
  );
}

// ─── Per-block editors ────────────────────────────────────────────────────────

function HeroEditor({ data, onChange }: { data: HeroData; onChange: (d: Partial<HeroData>) => void }) {
  return (
    <>
      <Section title="Content">
        <Field label="Headline">
          <TextInput value={data.headline} onChange={(v) => onChange({ headline: v })} placeholder="Your headline" />
        </Field>
        <Field label="Subheadline">
          <TextArea value={data.subheadline} onChange={(v) => onChange({ subheadline: v })} placeholder="Supporting text" />
        </Field>
        <Field label="CTA Button Text">
          <TextInput value={data.ctaText} onChange={(v) => onChange({ ctaText: v })} placeholder="Get Started" />
        </Field>
        <Field label="CTA Link / Anchor">
          <TextInput value={data.ctaAnchor} onChange={(v) => onChange({ ctaAnchor: v })} placeholder="#form" />
        </Field>
      </Section>
      <Section title="Style" defaultOpen={false}>
        <ColorInput value={data.bgColor} onChange={(v) => onChange({ bgColor: v })} label="Background" />
        <ColorInput value={data.textColor} onChange={(v) => onChange({ textColor: v })} label="Text" />
      </Section>
    </>
  );
}

function TextEditor({ data, onChange }: { data: TextData; onChange: (d: Partial<TextData>) => void }) {
  return (
    <>
      <Section title="Content">
        <Field label="Text">
          <TextArea value={data.content} onChange={(v) => onChange({ content: v })} rows={6} placeholder="Your text…" />
        </Field>
      </Section>
      <Section title="Style" defaultOpen={false}>
        <Field label="Alignment">
          <SegmentedControl
            value={data.align}
            onChange={(v) => onChange({ align: v as TextData["align"] })}
            options={[{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }]}
          />
        </Field>
        <Field label="Size">
          <SegmentedControl
            value={data.size}
            onChange={(v) => onChange({ size: v as TextData["size"] })}
            options={[{ value: "sm", label: "SM" }, { value: "md", label: "MD" }, { value: "lg", label: "LG" }]}
          />
        </Field>
      </Section>
    </>
  );
}

function ImageEditor({ data, onChange }: { data: ImageData; onChange: (d: Partial<ImageData>) => void }) {
  return (
    <Section title="Content">
      <Field label="Image URL">
        <TextInput value={data.url} onChange={(v) => onChange({ url: v })} placeholder="https://…" />
      </Field>
      <Field label="Alt Text">
        <TextInput value={data.alt} onChange={(v) => onChange({ alt: v })} placeholder="Describe the image" />
      </Field>
      <Field label="Caption">
        <TextInput value={data.caption} onChange={(v) => onChange({ caption: v })} placeholder="Optional caption" />
      </Field>
      <Toggle checked={data.rounded} onChange={(v) => onChange({ rounded: v })} label="Rounded corners" />
    </Section>
  );
}

function VideoEditor({ data, onChange }: { data: VideoData; onChange: (d: Partial<VideoData>) => void }) {
  return (
    <Section title="Content">
      <Field label="Video URL">
        <TextInput value={data.url} onChange={(v) => onChange({ url: v })} placeholder="YouTube / Vimeo / .mp4 URL" />
      </Field>
      <Field label="Title">
        <TextInput value={data.title} onChange={(v) => onChange({ title: v })} placeholder="Watch This" />
      </Field>
    </Section>
  );
}

function FormEditor({ data, onChange }: { data: FormData; onChange: (d: Partial<FormData>) => void }) {
  return (
    <>
      <Section title="Content">
        <Field label="Title">
          <TextInput value={data.title} onChange={(v) => onChange({ title: v })} />
        </Field>
        <Field label="Description">
          <TextArea value={data.description} onChange={(v) => onChange({ description: v })} />
        </Field>
        <Field label="Submit Button Text">
          <TextInput value={data.submitText} onChange={(v) => onChange({ submitText: v })} placeholder="Submit" />
        </Field>
        <Field label="Success Message">
          <TextInput value={data.successMessage} onChange={(v) => onChange({ successMessage: v })} />
        </Field>
      </Section>
      <Section title="Fields" defaultOpen={false}>
        <Toggle checked={data.showName} onChange={(v) => onChange({ showName: v })} label="Name field" />
        <Toggle checked={data.showEmail} onChange={(v) => onChange({ showEmail: v })} label="Email field" />
        <Toggle checked={data.showPhone} onChange={(v) => onChange({ showPhone: v })} label="Phone field" />
      </Section>
    </>
  );
}

function CTAEditor({ data, onChange }: { data: CTAData; onChange: (d: Partial<CTAData>) => void }) {
  return (
    <>
      <Section title="Content">
        <Field label="Button Text">
          <TextInput value={data.text} onChange={(v) => onChange({ text: v })} placeholder="Click Here →" />
        </Field>
        <Field label="URL">
          <TextInput value={data.url} onChange={(v) => onChange({ url: v })} placeholder="https://… or #form" />
        </Field>
      </Section>
      <Section title="Style" defaultOpen={false}>
        <Field label="Variant">
          <SelectInput
            value={data.style}
            onChange={(v) => onChange({ style: v as CTAData["style"] })}
            options={[{ value: "primary", label: "Primary" }, { value: "secondary", label: "Secondary" }, { value: "outline", label: "Outline" }]}
          />
        </Field>
        <Field label="Size">
          <SegmentedControl
            value={data.size}
            onChange={(v) => onChange({ size: v as CTAData["size"] })}
            options={[{ value: "sm", label: "SM" }, { value: "md", label: "MD" }, { value: "lg", label: "LG" }]}
          />
        </Field>
        <Field label="Alignment">
          <SegmentedControl
            value={data.align}
            onChange={(v) => onChange({ align: v as CTAData["align"] })}
            options={[{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }]}
          />
        </Field>
      </Section>
    </>
  );
}

function FeaturesEditor({ data, onChange }: { data: FeaturesData; onChange: (d: Partial<FeaturesData>) => void }) {
  const updateColumn = (index: number, key: string, val: string) => {
    const updated = data.columns.map((col, i) =>
      i === index ? { ...col, [key]: val } : col
    );
    onChange({ columns: updated });
  };

  const addColumn = () => {
    onChange({ columns: [...data.columns, { icon: "✨", title: "Feature", description: "Description" }] });
  };

  const removeColumn = (index: number) => {
    onChange({ columns: data.columns.filter((_, i) => i !== index) });
  };

  return (
    <>
      <Section title="Content">
        <Field label="Section Title">
          <TextInput value={data.title} onChange={(v) => onChange({ title: v })} />
        </Field>
      </Section>
      <Section title="Columns" defaultOpen={true}>
        {data.columns.map((col, i) => (
          <div
            key={i}
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "8px",
              padding: "10px",
              marginBottom: "8px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#71717a", fontFamily: "'Inter', sans-serif" }}>
                Column {i + 1}
              </span>
              <button
                onClick={() => removeColumn(i)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: "2px" }}
              >
                <Trash2 size={12} />
              </button>
            </div>
            <Field label="Icon / Emoji">
              <TextInput value={col.icon} onChange={(v) => updateColumn(i, "icon", v)} placeholder="⚡" />
            </Field>
            <Field label="Title">
              <TextInput value={col.title} onChange={(v) => updateColumn(i, "title", v)} />
            </Field>
            <Field label="Description">
              <TextArea value={col.description} onChange={(v) => updateColumn(i, "description", v)} rows={2} />
            </Field>
          </div>
        ))}
        <button
          onClick={addColumn}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            width: "100%",
            padding: "8px",
            borderRadius: "7px",
            border: "1px dashed rgba(255,255,255,0.1)",
            background: "transparent",
            color: "#71717a",
            fontSize: "12px",
            fontFamily: "'Inter', sans-serif",
            cursor: "pointer",
            justifyContent: "center",
            transition: "all 150ms",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.borderColor = "rgba(59,130,246,0.3)";
            el.style.color = "#3b82f6";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLButtonElement;
            el.style.borderColor = "rgba(255,255,255,0.1)";
            el.style.color = "#71717a";
          }}
        >
          <Plus size={13} />
          Add column
        </button>
      </Section>
    </>
  );
}

function TestimonialEditor({ data, onChange }: { data: TestimonialData; onChange: (d: Partial<TestimonialData>) => void }) {
  return (
    <Section title="Content">
      <Field label="Quote">
        <TextArea value={data.quote} onChange={(v) => onChange({ quote: v })} rows={4} />
      </Field>
      <Field label="Author Name">
        <TextInput value={data.author} onChange={(v) => onChange({ author: v })} />
      </Field>
      <Field label="Role / Company">
        <TextInput value={data.role} onChange={(v) => onChange({ role: v })} placeholder="CEO, Acme Corp" />
      </Field>
      <Field label="Avatar URL">
        <TextInput value={data.avatarUrl} onChange={(v) => onChange({ avatarUrl: v })} placeholder="https://…" />
      </Field>
    </Section>
  );
}

function DividerEditor({ data, onChange }: { data: DividerData; onChange: (d: Partial<DividerData>) => void }) {
  return (
    <Section title="Style">
      <Field label="Line Style">
        <SegmentedControl
          value={data.style}
          onChange={(v) => onChange({ style: v as DividerData["style"] })}
          options={[{ value: "solid", label: "Solid" }, { value: "dashed", label: "Dashed" }]}
        />
      </Field>
    </Section>
  );
}

function SpacerEditor({ data, onChange }: { data: SpacerData; onChange: (d: Partial<SpacerData>) => void }) {
  return (
    <Section title="Size">
      <Field label="Height">
        <SelectInput
          value={data.height}
          onChange={(v) => onChange({ height: v as SpacerData["height"] })}
          options={[
            { value: "xs", label: "XS — 16px" },
            { value: "sm", label: "SM — 32px" },
            { value: "md", label: "MD — 64px" },
            { value: "lg", label: "LG — 96px" },
            { value: "xl", label: "XL — 128px" },
          ]}
        />
      </Field>
    </Section>
  );
}

// ─── Block inspector router ───────────────────────────────────────────────────

function BlockInspector({ block }: { block: Block }) {
  const { updateBlock, updateBlockStyles, selectBlock } = useBuilder();
  const [activeTab, setActiveTab] = useState<"content" | "style">("content");

  const onChange = useCallback(
    (partial: Record<string, unknown>) => {
      updateBlock(block.id, { ...block.data, ...partial });
    },
    [block, updateBlock]
  );

  const onStyleChange = useCallback(
    (patch: Partial<ElementStyles>) => {
      updateBlockStyles(block.id, { ...block.styles, ...patch });
    },
    [block, updateBlockStyles]
  );

  const d = block.data as Record<string, unknown>;

  return (
    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div
        style={{
          flexShrink: 0,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          position: "sticky",
          top: 0,
          background: "#18181b",
          zIndex: 5,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px 0" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "#fafafa", fontFamily: "'Inter', sans-serif" }}>
            {BLOCK_LABELS[block.type]}
          </span>
          <button
            onClick={() => selectBlock(null)}
            aria-label="Deselect"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#71717a",
              display: "flex",
              alignItems: "center",
              padding: "4px",
              borderRadius: "5px",
              transition: "background 150ms, color 150ms",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.background = "rgba(255,255,255,0.06)";
              el.style.color = "#fafafa";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.background = "none";
              el.style.color = "#71717a";
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Content / Style tabs */}
        <div style={{ display: "flex", padding: "6px 16px 0", gap: "2px" }}>
          {(["content", "style"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                height: "30px",
                background: "none",
                border: "none",
                borderBottom: `2px solid ${activeTab === tab ? "#3b82f6" : "transparent"}`,
                color: activeTab === tab ? "#60a5fa" : "#71717a",
                fontSize: "12px",
                fontWeight: activeTab === tab ? 600 : 400,
                cursor: "pointer",
                fontFamily: "'Inter', sans-serif",
                textTransform: "capitalize",
                transition: "color 150ms, border-color 150ms",
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "content" ? (
        <div style={{ flex: 1 }}>
          {block.type === "hero" && (
            <HeroEditor data={d as unknown as HeroData} onChange={onChange as (d: Partial<HeroData>) => void} />
          )}
          {block.type === "text" && (
            <TextEditor data={d as unknown as TextData} onChange={onChange as (d: Partial<TextData>) => void} />
          )}
          {block.type === "image" && (
            <ImageEditor data={d as unknown as ImageData} onChange={onChange as (d: Partial<ImageData>) => void} />
          )}
          {block.type === "video" && (
            <VideoEditor data={d as unknown as VideoData} onChange={onChange as (d: Partial<VideoData>) => void} />
          )}
          {block.type === "form" && (
            <FormEditor data={d as unknown as FormData} onChange={onChange as (d: Partial<FormData>) => void} />
          )}
          {block.type === "cta" && (
            <CTAEditor data={d as unknown as CTAData} onChange={onChange as (d: Partial<CTAData>) => void} />
          )}
          {block.type === "features" && (
            <FeaturesEditor data={d as unknown as FeaturesData} onChange={onChange as (d: Partial<FeaturesData>) => void} />
          )}
          {block.type === "testimonial" && (
            <TestimonialEditor data={d as unknown as TestimonialData} onChange={onChange as (d: Partial<TestimonialData>) => void} />
          )}
          {block.type === "divider" && (
            <DividerEditor data={d as unknown as DividerData} onChange={onChange as (d: Partial<DividerData>) => void} />
          )}
          {block.type === "spacer" && (
            <SpacerEditor data={d as unknown as SpacerData} onChange={onChange as (d: Partial<SpacerData>) => void} />
          )}
        </div>
      ) : (
        <div style={{ flex: 1, padding: "12px 16px" }}>
          <StyleEditor styles={block.styles ?? {}} onChange={onStyleChange} />
        </div>
      )}
    </div>
  );
}

// ─── Empty state when nothing is selected ────────────────────────────────────

function EmptyInspector() {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "12px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "16px",
          fontSize: "20px",
        }}
      >
        ↖
      </div>
      <p
        style={{
          fontSize: "13px",
          color: "#71717a",
          lineHeight: 1.6,
          margin: 0,
          fontFamily: "'Inter', sans-serif",
        }}
      >
        Select an element on the canvas to edit its properties
      </p>
    </div>
  );
}

// ─── Right panel ──────────────────────────────────────────────────────────────

export function RightPanel() {
  const { blocks, selectedBlockId } = useBuilder();
  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) ?? null;

  return (
    <aside
      style={{
        width: "300px",
        flexShrink: 0,
        background: "#18181b",
        borderLeft: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Panel header */}
      <div
        style={{
          padding: "12px 16px 10px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontWeight: 600,
            color: "#71717a",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {selectedBlock ? "Properties" : "Inspector"}
        </span>
      </div>

      {selectedBlock ? (
        <BlockInspector block={selectedBlock} />
      ) : (
        <EmptyInspector />
      )}
    </aside>
  );
}
