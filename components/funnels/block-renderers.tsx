"use client";

import React, { useState } from "react";
import type {
  Block, HeroData, TextData, ImageData, VideoData,
  FormData, CTAData, FeaturesData, TestimonialData,
  DividerData, SpacerData,
} from "@/types/funnel";

// ─── Public Lead Form (used inside the form block on the public page) ─────────

interface PublicFormProps {
  data: FormData;
  slug: string;
}

export function PublicLeadForm({ data, slug }: PublicFormProps) {
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("loading");
    setErrorMsg("");
    try {
      const res = await fetch(`/api/f/${slug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        setErrorMsg(d.error ?? "Something went wrong.");
        setState("error");
      } else {
        setState("success");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setState("error");
    }
  };

  if (state === "success") {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-3">🎉</div>
        <p className="text-xl font-semibold text-gray-900">{data.successMessage}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
      {data.showName && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="Jane Doe"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>
      )}
      {data.showEmail && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            placeholder="jane@example.com"
            required
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>
      )}
      {data.showPhone && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
            placeholder="+1 (555) 000-0000"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>
      )}
      {(state === "error") && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {errorMsg}
        </p>
      )}
      <button
        type="submit"
        disabled={state === "loading"}
        className="w-full rounded-xl bg-indigo-600 px-6 py-3.5 text-base font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-all"
      >
        {state === "loading" ? "Submitting…" : data.submitText}
      </button>
    </form>
  );
}

// ─── Block renderers ──────────────────────────────────────────────────────────

function HeroBlock({ data }: { data: HeroData }) {
  return (
    <section
      className="py-24 px-6 text-center"
      style={{ backgroundColor: data.bgColor, color: data.textColor }}
    >
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-6">
          {data.headline}
        </h1>
        <p className="text-lg sm:text-xl opacity-80 mb-10 max-w-xl mx-auto leading-relaxed">
          {data.subheadline}
        </p>
        {data.ctaText && (
          <a
            href={data.ctaAnchor || "#form"}
            className="inline-block rounded-full bg-indigo-600 px-8 py-4 text-lg font-semibold text-white hover:bg-indigo-700 transition-colors shadow-lg"
          >
            {data.ctaText}
          </a>
        )}
      </div>
    </section>
  );
}

const TEXT_SIZE = { sm: "text-base", md: "text-lg", lg: "text-xl" };
const TEXT_ALIGN = { left: "text-left", center: "text-center", right: "text-right" };

function TextBlock({ data }: { data: TextData }) {
  return (
    <section className="py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <p
          className={`text-gray-700 leading-relaxed whitespace-pre-wrap ${TEXT_SIZE[data.size] ?? "text-lg"} ${TEXT_ALIGN[data.align] ?? "text-left"}`}
        >
          {data.content}
        </p>
      </div>
    </section>
  );
}

function ImageBlock({ data }: { data: ImageData }) {
  if (!data.url) return null;
  return (
    <section className="py-8 px-6">
      <div className="max-w-3xl mx-auto">
        <img
          src={data.url}
          alt={data.alt || ""}
          className={`w-full object-cover shadow-md ${data.rounded ? "rounded-2xl" : ""}`}
        />
        {data.caption && (
          <p className="mt-3 text-center text-sm text-gray-500 italic">{data.caption}</p>
        )}
      </div>
    </section>
  );
}

function getEmbedUrl(url: string): string {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return url;
}

function VideoBlock({ data }: { data: VideoData }) {
  if (!data.url) return null;
  const embedUrl = getEmbedUrl(data.url);
  return (
    <section className="py-8 px-6">
      <div className="max-w-3xl mx-auto">
        {data.title && (
          <h3 className="text-xl font-semibold text-gray-900 mb-4 text-center">
            {data.title}
          </h3>
        )}
        <div className="relative aspect-video rounded-2xl overflow-hidden shadow-lg bg-black">
          <iframe
            src={embedUrl}
            title={data.title || "Video"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>
      </div>
    </section>
  );
}

function FormBlock({ data, slug }: { data: FormData; slug: string }) {
  return (
    <section id="form" className="py-16 px-6 bg-gray-50">
      <div className="max-w-lg mx-auto text-center mb-8">
        {data.title && (
          <h2 className="text-3xl font-bold text-gray-900 mb-3">{data.title}</h2>
        )}
        {data.description && (
          <p className="text-gray-600 leading-relaxed">{data.description}</p>
        )}
      </div>
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-md p-8">
        <PublicLeadForm data={data} slug={slug} />
      </div>
    </section>
  );
}

const CTA_STYLES = {
  primary: "bg-indigo-600 text-white hover:bg-indigo-700",
  secondary: "bg-gray-900 text-white hover:bg-gray-800",
  outline: "border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50",
};

const CTA_SIZES = {
  sm: "px-5 py-2.5 text-sm",
  md: "px-7 py-3.5 text-base",
  lg: "px-9 py-4 text-lg",
};

function CTABlock({ data }: { data: CTAData }) {
  return (
    <section className={`py-10 px-6 flex justify-${data.align ?? "center"}`}>
      <a
        href={data.url || "#"}
        className={`inline-block rounded-full font-semibold transition-colors ${CTA_STYLES[data.style] ?? CTA_STYLES.primary} ${CTA_SIZES[data.size] ?? CTA_SIZES.md}`}
      >
        {data.text}
      </a>
    </section>
  );
}

function FeaturesBlock({ data }: { data: FeaturesData }) {
  return (
    <section className="py-16 px-6">
      <div className="max-w-5xl mx-auto">
        {data.title && (
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            {data.title}
          </h2>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {(data.columns ?? []).map((col, i) => (
            <div key={i} className="text-center">
              <div className="text-4xl mb-4">{col.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{col.title}</h3>
              <p className="text-gray-600 leading-relaxed">{col.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialBlock({ data }: { data: TestimonialData }) {
  return (
    <section className="py-12 px-6 bg-indigo-50">
      <div className="max-w-2xl mx-auto text-center">
        <p className="text-xl text-gray-800 italic leading-relaxed mb-6">
          &ldquo;{data.quote}&rdquo;
        </p>
        <div className="flex items-center justify-center gap-3">
          {data.avatarUrl ? (
            <img
              src={data.avatarUrl}
              alt={data.author}
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 font-bold">
              {data.author?.[0] ?? "?"}
            </div>
          )}
          <div className="text-left">
            <p className="font-semibold text-gray-900">{data.author}</p>
            {data.role && <p className="text-sm text-gray-500">{data.role}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}

function DividerBlock({ data }: { data: DividerData }) {
  return (
    <div className="py-2 px-6">
      <div
        className={`border-t border-gray-200 ${data.style === "dashed" ? "border-dashed" : "border-solid"}`}
      />
    </div>
  );
}

const SPACER_HEIGHT = { xs: "h-4", sm: "h-8", md: "h-16", lg: "h-24", xl: "h-32" };

function SpacerBlock({ data }: { data: SpacerData }) {
  return <div className={SPACER_HEIGHT[data.height] ?? "h-16"} />;
}

// ─── Master renderer ──────────────────────────────────────────────────────────

interface BlockRendererProps {
  block: Block;
  slug: string;
}

export function BlockRenderer({ block, slug }: BlockRendererProps) {
  const d = block.data as unknown;
  switch (block.type) {
    case "hero":        return <HeroBlock data={d as HeroData} />;
    case "text":        return <TextBlock data={d as TextData} />;
    case "image":       return <ImageBlock data={d as ImageData} />;
    case "video":       return <VideoBlock data={d as VideoData} />;
    case "form":        return <FormBlock data={d as FormData} slug={slug} />;
    case "cta":         return <CTABlock data={d as CTAData} />;
    case "features":    return <FeaturesBlock data={d as FeaturesData} />;
    case "testimonial": return <TestimonialBlock data={d as TestimonialData} />;
    case "divider":     return <DividerBlock data={d as DividerData} />;
    case "spacer":      return <SpacerBlock data={d as SpacerData} />;
    default:            return null;
  }
}
