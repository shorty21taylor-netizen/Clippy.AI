"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Building2,
  UserPlus,
  Sparkles,
  ArrowRight,
  Check,
  X,
  Plus,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepDot({
  step,
  current,
  label,
}: {
  step: number;
  current: number;
  label: string;
}) {
  const done = step < current;
  const active = step === current;

  return (
    <div className="flex items-center gap-2">
      <div
        className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
          done
            ? "bg-[--status-success] text-white"
            : active
              ? "bg-[--accent] text-white"
              : "bg-[--bg-elevated] text-[--text-tertiary] border border-[--border-subtle]"
        }`}
      >
        {done ? <Check size={13} /> : step}
      </div>
      <span
        className={`text-xs font-medium hidden sm:block ${
          active ? "text-[--text-primary]" : "text-[--text-tertiary]"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function StepConnector({ done }: { done: boolean }) {
  return (
    <div className="flex-1 h-px mx-2 bg-[--border-subtle] relative overflow-hidden">
      <motion.div
        initial={{ width: "0%" }}
        animate={{ width: done ? "100%" : "0%" }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="absolute inset-y-0 left-0 bg-[--status-success]"
      />
    </div>
  );
}

// ─── Step 1: Name your workspace ──────────────────────────────────────────────

function Step1({
  onNext,
}: {
  onNext: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Workspace name is required.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Something went wrong.");
        return;
      }

      onNext(name.trim());
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-[--radius-md] bg-[--accent-muted] flex items-center justify-center">
          <Building2 size={20} className="text-[--accent]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[--text-primary] tracking-[-0.02em]">
            Name your workspace
          </h2>
          <p className="text-sm text-[--text-secondary]">
            This is your team&apos;s home — you can change it later.
          </p>
        </div>
      </div>

      <Input
        label="Workspace name"
        placeholder="e.g., Acme Marketing, My Agency"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={error}
        autoFocus
        maxLength={64}
      />

      <Button
        type="submit"
        size="lg"
        loading={loading}
        className="w-full"
      >
        Continue
        <ArrowRight size={16} />
      </Button>
    </form>
  );
}

// ─── Step 2: Invite team members ──────────────────────────────────────────────

function Step2({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  const [emails, setEmails] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const addEmail = () => {
    const e = input.trim().toLowerCase();
    if (e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && !emails.includes(e)) {
      setEmails((prev) => [...prev, e]);
      setInput("");
    }
  };

  const removeEmail = (email: string) =>
    setEmails((prev) => prev.filter((e) => e !== email));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addEmail();
    }
  };

  const handleInvite = async () => {
    if (emails.length === 0) {
      onSkip();
      return;
    }
    setLoading(true);
    // Invitations are advisory at this stage — we just proceed
    // Real invite emails would be sent here in production
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-[--radius-md] bg-[--status-success-muted] flex items-center justify-center">
          <UserPlus size={20} className="text-[--status-success]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[--text-primary] tracking-[-0.02em]">
            Invite your team
          </h2>
          <p className="text-sm text-[--text-secondary]">
            Optional — you can always do this later from Settings.
          </p>
        </div>
      </div>

      {/* Email input */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-[--text-secondary] uppercase tracking-wide">
          Team member emails
        </label>
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="colleague@company.com"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 h-10 rounded-[--radius-md] bg-[--bg-input] px-3.5 text-sm text-[--text-primary] border border-[--border-subtle] placeholder:text-[--text-placeholder] focus:outline-none focus:border-[--accent] transition-colors"
          />
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={addEmail}
          >
            <Plus size={16} />
          </Button>
        </div>
        <p className="text-xs text-[--text-tertiary]">
          Press Enter or comma to add multiple emails
        </p>
      </div>

      {/* Email chips */}
      {emails.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {emails.map((email) => (
            <span
              key={email}
              className="inline-flex items-center gap-1.5 rounded-full bg-[--bg-elevated] border border-[--border-subtle] px-3 py-1 text-xs text-[--text-secondary]"
            >
              {email}
              <button
                onClick={() => removeEmail(email)}
                className="text-[--text-tertiary] hover:text-[--text-secondary]"
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          variant="secondary"
          size="lg"
          onClick={onSkip}
          className="flex-1"
        >
          Skip for now
        </Button>
        <Button
          size="lg"
          loading={loading}
          onClick={handleInvite}
          className="flex-1"
        >
          {emails.length > 0 ? "Send invites" : "Continue"}
          <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}

// ─── Step 3: Confirm plan ─────────────────────────────────────────────────────

function Step3({ onFinish }: { onFinish: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    onFinish();
  };

  const PLANS = [
    {
      name: "Free",
      price: "$0",
      desc: "For individuals getting started",
      features: [
        "5 social accounts",
        "10 AI content pieces/mo",
        "1 funnel",
        "Basic analytics",
      ],
      current: true,
    },
    {
      name: "Pro",
      price: "$49/mo",
      desc: "For growing teams and agencies",
      features: [
        "100 accounts per platform",
        "Unlimited AI content",
        "Unlimited funnels",
        "Advanced analytics",
        "Priority support",
      ],
      current: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-10 w-10 rounded-[--radius-md] bg-[--accent-muted] flex items-center justify-center">
          <Sparkles size={20} className="text-[--accent]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-[--text-primary] tracking-[-0.02em]">
            Choose your plan
          </h2>
          <p className="text-sm text-[--text-secondary]">
            You&apos;re starting on Free. Upgrade anytime from Settings.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-[--radius-lg] border p-4 transition-all duration-150 ${
              plan.current
                ? "border-[--accent] bg-[--accent-muted]"
                : "border-[--border-subtle] bg-[--bg-elevated]"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-[--text-primary]">
                {plan.name}
              </span>
              {plan.current && (
                <span className="text-[10px] font-bold text-[--accent] uppercase tracking-wide">
                  Current
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-[--text-primary] tracking-[-0.02em]">
              {plan.price}
            </p>
            <p className="text-xs text-[--text-secondary] mb-3">{plan.desc}</p>
            <ul className="space-y-1.5">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-xs text-[--text-secondary]">
                  <Check size={11} className="text-[--status-success] shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <Button
        size="lg"
        onClick={handleStart}
        loading={loading}
        className="w-full"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Setting up your workspace...
          </>
        ) : (
          <>
            Launch my workspace
            <Sparkles size={16} />
          </>
        )}
      </Button>
    </div>
  );
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Workspace" },
  { label: "Team" },
  { label: "Plan" },
];

export function OnboardingWizard() {
  const [step, setStep] = useState(1);
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[--bg-base] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-[10px] bg-[--accent] flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="font-semibold text-lg text-[--text-primary]">
              Clippy.AI
            </span>
          </div>
          <p className="text-[--text-secondary] text-sm">
            Let&apos;s get your workspace set up — it takes less than 2 minutes.
          </p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center mb-8 px-2">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.label}>
              <StepDot step={i + 1} current={step} label={s.label} />
              {i < STEPS.length - 1 && <StepConnector done={step > i + 1} />}
            </React.Fragment>
          ))}
        </div>

        {/* Card */}
        <div className="rounded-[--radius-xl] bg-[--bg-card] border border-[--border-subtle] shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            >
              {step === 1 && (
                <Step1 onNext={() => setStep(2)} />
              )}
              {step === 2 && (
                <Step2
                  onNext={() => setStep(3)}
                  onSkip={() => setStep(3)}
                />
              )}
              {step === 3 && (
                <Step3 onFinish={() => router.push("/dashboard")} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="text-center text-xs text-[--text-tertiary] mt-6">
          Step {step} of {STEPS.length}
        </p>
      </div>
    </div>
  );
}
