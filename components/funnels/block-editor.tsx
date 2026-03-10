"use client";

import React from "react";
import { ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BLOCK_LABELS, BLOCK_ICONS, type Block, type BlockType } from "@/types/funnel";
import type {
  HeroData, TextData, ImageData, VideoData, FormData,
  CTAData, FeaturesData, TestimonialData, DividerData, SpacerData,
} from "@/types/funnel";
import { cn } from "@/lib/utils";

interface BlockEditorProps {
  block: Block;
  index: number;
  total: number;
  onChange: (id: string, data: Record<string, unknown>) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onDelete: (id: string) => void;
}

// ─── Shared field components ──────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-[--text-tertiary] uppercase tracking-wide mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full rounded-[--radius-sm] bg-[--bg-input] border border-[--border-subtle] px-2.5 py-1.5 text-sm text-[--text-primary] placeholder:text-[--text-tertiary] focus:outline-none focus:border-[--accent] transition-colors";
const textareaCls = `${inputCls} resize-none`;

function Input({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={inputCls}
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={textareaCls}
    />
  );
}

function SelectField({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputCls}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function Toggle({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div
        onClick={() => onChange(!checked)}
        className={cn(
          "relative w-8 h-4 rounded-full transition-colors",
          checked ? "bg-[--accent]" : "bg-[--bg-elevated] border border-[--border-subtle]"
        )}
      >
        <div className={cn(
          "absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5"
        )} />
      </div>
      <span className="text-sm text-[--text-primary]">{label}</span>
    </label>
  );
}

// ─── Per-block editor panels ───────────────────────────────────────────────────

function HeroEditor({ data, onChange }: { data: HeroData; onChange: (d: HeroData) => void }) {
  const set = <K extends keyof HeroData>(k: K, v: HeroData[K]) => onChange({ ...data, [k]: v });
  return (
    <div className="space-y-3">
      <Field label="Headline"><Textarea value={data.headline} onChange={(v) => set("headline", v)} rows={2} /></Field>
      <Field label="Subheadline"><Textarea value={data.subheadline} onChange={(v) => set("subheadline", v)} /></Field>
      <Field label="CTA Text"><Input value={data.ctaText} onChange={(v) => set("ctaText", v)} placeholder="Get Started Free" /></Field>
      <Field label="CTA Link/Anchor"><Input value={data.ctaAnchor} onChange={(v) => set("ctaAnchor", v)} placeholder="#form" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Background">
          <input type="color" value={data.bgColor} onChange={(e) => set("bgColor", e.target.value)}
            className="w-full h-8 rounded-[--radius-sm] border border-[--border-subtle] cursor-pointer bg-transparent" />
        </Field>
        <Field label="Text Color">
          <input type="color" value={data.textColor} onChange={(e) => set("textColor", e.target.value)}
            className="w-full h-8 rounded-[--radius-sm] border border-[--border-subtle] cursor-pointer bg-transparent" />
        </Field>
      </div>
    </div>
  );
}

function TextEditor({ data, onChange }: { data: TextData; onChange: (d: TextData) => void }) {
  const set = <K extends keyof TextData>(k: K, v: TextData[K]) => onChange({ ...data, [k]: v });
  return (
    <div className="space-y-3">
      <Field label="Content"><Textarea value={data.content} onChange={(v) => set("content", v)} rows={5} /></Field>
      <Field label="Alignment">
        <SelectField value={data.align} onChange={(v) => set("align", v as TextData["align"])}
          options={[{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }]} />
      </Field>
      <Field label="Font Size">
        <SelectField value={data.size} onChange={(v) => set("size", v as TextData["size"])}
          options={[{ value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" }]} />
      </Field>
    </div>
  );
}

function ImageEditor({ data, onChange }: { data: ImageData; onChange: (d: ImageData) => void }) {
  const set = <K extends keyof ImageData>(k: K, v: ImageData[K]) => onChange({ ...data, [k]: v });
  return (
    <div className="space-y-3">
      <Field label="Image URL"><Input value={data.url} onChange={(v) => set("url", v)} placeholder="https://…" /></Field>
      <Field label="Alt Text"><Input value={data.alt} onChange={(v) => set("alt", v)} placeholder="Description of image" /></Field>
      <Field label="Caption"><Input value={data.caption} onChange={(v) => set("caption", v)} placeholder="Optional caption…" /></Field>
      <Toggle label="Rounded corners" checked={data.rounded} onChange={(v) => set("rounded", v)} />
    </div>
  );
}

function VideoEditor({ data, onChange }: { data: VideoData; onChange: (d: VideoData) => void }) {
  const set = <K extends keyof VideoData>(k: K, v: VideoData[K]) => onChange({ ...data, [k]: v });
  return (
    <div className="space-y-3">
      <Field label="Video URL">
        <Input value={data.url} onChange={(v) => set("url", v)} placeholder="YouTube, Vimeo, or .mp4 URL" />
      </Field>
      <Field label="Title"><Input value={data.title} onChange={(v) => set("title", v)} placeholder="Watch This" /></Field>
    </div>
  );
}

function FormEditor({ data, onChange }: { data: FormData; onChange: (d: FormData) => void }) {
  const set = <K extends keyof FormData>(k: K, v: FormData[K]) => onChange({ ...data, [k]: v });
  return (
    <div className="space-y-3">
      <Field label="Section Title"><Input value={data.title} onChange={(v) => set("title", v)} /></Field>
      <Field label="Description"><Textarea value={data.description} onChange={(v) => set("description", v)} rows={2} /></Field>
      <div className="space-y-2">
        <p className="text-[11px] font-medium text-[--text-tertiary] uppercase tracking-wide">Fields</p>
        <Toggle label="Name field" checked={data.showName} onChange={(v) => set("showName", v)} />
        <Toggle label="Email field" checked={data.showEmail} onChange={(v) => set("showEmail", v)} />
        <Toggle label="Phone field" checked={data.showPhone} onChange={(v) => set("showPhone", v)} />
      </div>
      <Field label="Submit Button Text"><Input value={data.submitText} onChange={(v) => set("submitText", v)} /></Field>
      <Field label="Success Message"><Input value={data.successMessage} onChange={(v) => set("successMessage", v)} /></Field>
    </div>
  );
}

function CTAEditor({ data, onChange }: { data: CTAData; onChange: (d: CTAData) => void }) {
  const set = <K extends keyof CTAData>(k: K, v: CTAData[K]) => onChange({ ...data, [k]: v });
  return (
    <div className="space-y-3">
      <Field label="Button Text"><Input value={data.text} onChange={(v) => set("text", v)} /></Field>
      <Field label="URL"><Input value={data.url} onChange={(v) => set("url", v)} placeholder="https://… or #form" /></Field>
      <Field label="Style">
        <SelectField value={data.style} onChange={(v) => set("style", v as CTAData["style"])}
          options={[{ value: "primary", label: "Primary" }, { value: "secondary", label: "Secondary" }, { value: "outline", label: "Outline" }]} />
      </Field>
      <Field label="Alignment">
        <SelectField value={data.align} onChange={(v) => set("align", v as CTAData["align"])}
          options={[{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }]} />
      </Field>
      <Field label="Size">
        <SelectField value={data.size} onChange={(v) => set("size", v as CTAData["size"])}
          options={[{ value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" }]} />
      </Field>
    </div>
  );
}

function FeaturesEditor({ data, onChange }: { data: FeaturesData; onChange: (d: FeaturesData) => void }) {
  const updateCol = (i: number, key: string, value: string) => {
    const cols = [...data.columns];
    cols[i] = { ...cols[i], [key]: value };
    onChange({ ...data, columns: cols });
  };

  return (
    <div className="space-y-3">
      <Field label="Section Title">
        <Input value={data.title} onChange={(v) => onChange({ ...data, title: v })} />
      </Field>
      {data.columns.map((col, i) => (
        <div key={i} className="rounded-[--radius-sm] border border-[--border-subtle] bg-[--bg-elevated] p-3 space-y-2">
          <p className="text-[11px] font-semibold text-[--text-tertiary]">Column {i + 1}</p>
          <Field label="Icon (emoji)"><Input value={col.icon} onChange={(v) => updateCol(i, "icon", v)} placeholder="⚡" /></Field>
          <Field label="Title"><Input value={col.title} onChange={(v) => updateCol(i, "title", v)} /></Field>
          <Field label="Description"><Textarea value={col.description} onChange={(v) => updateCol(i, "description", v)} rows={2} /></Field>
        </div>
      ))}
    </div>
  );
}

function TestimonialEditor({ data, onChange }: { data: TestimonialData; onChange: (d: TestimonialData) => void }) {
  const set = <K extends keyof TestimonialData>(k: K, v: TestimonialData[K]) => onChange({ ...data, [k]: v });
  return (
    <div className="space-y-3">
      <Field label="Quote"><Textarea value={data.quote} onChange={(v) => set("quote", v)} rows={3} /></Field>
      <Field label="Author Name"><Input value={data.author} onChange={(v) => set("author", v)} /></Field>
      <Field label="Role / Company"><Input value={data.role} onChange={(v) => set("role", v)} /></Field>
      <Field label="Avatar URL"><Input value={data.avatarUrl} onChange={(v) => set("avatarUrl", v)} placeholder="https://…" /></Field>
    </div>
  );
}

function DividerEditor({ data, onChange }: { data: DividerData; onChange: (d: DividerData) => void }) {
  return (
    <Field label="Style">
      <SelectField value={data.style} onChange={(v) => onChange({ style: v as DividerData["style"] })}
        options={[{ value: "solid", label: "Solid" }, { value: "dashed", label: "Dashed" }]} />
    </Field>
  );
}

function SpacerEditor({ data, onChange }: { data: SpacerData; onChange: (d: SpacerData) => void }) {
  return (
    <Field label="Height">
      <SelectField value={data.height} onChange={(v) => onChange({ height: v as SpacerData["height"] })}
        options={[
          { value: "xs", label: "Extra Small (16px)" },
          { value: "sm", label: "Small (32px)" },
          { value: "md", label: "Medium (64px)" },
          { value: "lg", label: "Large (96px)" },
          { value: "xl", label: "Extra Large (128px)" },
        ]} />
    </Field>
  );
}

function renderDataEditor(block: Block, onChange: (d: Record<string, unknown>) => void) {
  const d = block.data as unknown;
  const wrap = <T,>(Comp: React.ComponentType<{ data: T; onChange: (d: T) => void }>, data: T) => (
    <Comp data={data} onChange={(v) => onChange(v as Record<string, unknown>)} />
  );

  switch (block.type as BlockType) {
    case "hero":        return wrap(HeroEditor, d as HeroData);
    case "text":        return wrap(TextEditor, d as TextData);
    case "image":       return wrap(ImageEditor, d as ImageData);
    case "video":       return wrap(VideoEditor, d as VideoData);
    case "form":        return wrap(FormEditor, d as FormData);
    case "cta":         return wrap(CTAEditor, d as CTAData);
    case "features":    return wrap(FeaturesEditor, d as FeaturesData);
    case "testimonial": return wrap(TestimonialEditor, d as TestimonialData);
    case "divider":     return wrap(DividerEditor, d as DividerData);
    case "spacer":      return wrap(SpacerEditor, d as SpacerData);
    default:            return null;
  }
}

// ─── Main BlockEditor ──────────────────────────────────────────────────────────

export function BlockEditor({ block, index, total, onChange, onMoveUp, onMoveDown, onDelete }: BlockEditorProps) {
  return (
    <div className="rounded-[--radius-lg] bg-[--bg-card] border border-[--border-subtle] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-[--bg-elevated] border-b border-[--border-subtle]">
        <span className="text-base">{BLOCK_ICONS[block.type as BlockType]}</span>
        <span className="text-sm font-semibold text-[--text-primary] flex-1">
          {BLOCK_LABELS[block.type as BlockType]}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => onMoveUp(block.id)}
            disabled={index === 0}
            className="h-7 w-7 flex items-center justify-center rounded-[--radius-sm] text-[--text-tertiary] hover:text-[--text-primary] hover:bg-[rgba(255,255,255,0.06)] disabled:opacity-30 transition-all"
          >
            <ChevronUp size={14} />
          </button>
          <button
            onClick={() => onMoveDown(block.id)}
            disabled={index === total - 1}
            className="h-7 w-7 flex items-center justify-center rounded-[--radius-sm] text-[--text-tertiary] hover:text-[--text-primary] hover:bg-[rgba(255,255,255,0.06)] disabled:opacity-30 transition-all"
          >
            <ChevronDown size={14} />
          </button>
          <button
            onClick={() => onDelete(block.id)}
            className="h-7 w-7 flex items-center justify-center rounded-[--radius-sm] text-[--text-tertiary] hover:text-[--status-error] hover:bg-[--status-error-muted] transition-all ml-1"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Fields */}
      <div className="p-4">
        {renderDataEditor(block, (data) => onChange(block.id, data))}
      </div>
    </div>
  );
}
