import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-[--bg-base] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2.5 mb-4">
            <div
              className="h-9 w-9 rounded-[12px] flex items-center justify-center"
              style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow-indigo)" }}
            >
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="font-semibold text-xl text-[--text-primary] tracking-[-0.025em]">
              Clippy.AI
            </span>
          </div>
          <p className="text-[--text-secondary] text-[15px]">
            Create your account — free forever to start
          </p>
        </div>

        <SignUp
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "bg-[--bg-card] border border-[--border-subtle] shadow-[var(--shadow-card)] rounded-[24px]",
              headerTitle: "text-[--text-primary] font-semibold tracking-[-0.02em]",
              headerSubtitle: "text-[--text-secondary]",
              socialButtonsBlockButton:
                "bg-[--bg-input] border border-[--border-subtle] text-[--text-primary] hover:bg-[rgba(0,0,0,0.04)] rounded-[12px] transition-colors",
              formFieldInput:
                "bg-[--bg-input] border-[--border-subtle] text-[--text-primary] rounded-[12px] focus:border-[--accent]",
              formFieldLabel: "text-[--text-secondary] font-medium",
              formButtonPrimary:
                "bg-[--accent] hover:bg-[--accent-hover] rounded-[var(--radius-pill)] font-medium transition-colors",
              footerActionLink: "text-[--accent] hover:text-[--accent-hover]",
              dividerLine: "bg-[--border-subtle]",
              dividerText: "text-[--text-tertiary]",
            },
          }}
        />
      </div>
    </div>
  );
}
