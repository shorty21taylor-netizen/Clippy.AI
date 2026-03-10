import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-[--bg-base] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-3">
            <div className="h-9 w-9 rounded-[12px] bg-[--accent] flex items-center justify-center">
              <span className="text-white font-bold">C</span>
            </div>
            <span className="font-bold text-xl text-[--text-primary] tracking-[-0.02em]">
              Clippy.AI
            </span>
          </div>
          <p className="text-[--text-secondary] text-sm">
            Create your account — free forever to start
          </p>
        </div>

        <SignUp
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "bg-[#141416] border border-[rgba(255,255,255,0.06)] shadow-[0_8px_32px_rgba(0,0,0,0.5)] rounded-[20px]",
              headerTitle: "text-[--text-primary] font-semibold",
              headerSubtitle: "text-[--text-secondary]",
              socialButtonsBlockButton:
                "bg-[#1a1a1c] border border-[rgba(255,255,255,0.1)] text-[--text-primary] hover:bg-[#1f1f22] rounded-[12px]",
              formFieldInput:
                "bg-[#1c1c1e] border-[rgba(255,255,255,0.06)] text-[--text-primary] rounded-[12px]",
              formButtonPrimary:
                "bg-[#3b82f6] hover:bg-[#2563eb] rounded-[12px] font-medium",
              footerActionLink: "text-[#3b82f6]",
              dividerLine: "bg-[rgba(255,255,255,0.06)]",
              dividerText: "text-[--text-tertiary]",
            },
          }}
        />
      </div>
    </div>
  );
}
