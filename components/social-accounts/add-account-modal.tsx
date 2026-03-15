"use client";

import React from "react";
import { Modal } from "@/components/ui/modal";
import { useWorkspace } from "@/lib/workspace-context";

interface AddAccountModalProps {
  open: boolean;
  onClose: () => void;
}

// Instagram gradient SVG icon
function InstagramIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <defs>
        <linearGradient id="ig-grad" x1="0" y1="28" x2="28" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f09433" />
          <stop offset="25%" stopColor="#e6683c" />
          <stop offset="50%" stopColor="#dc2743" />
          <stop offset="75%" stopColor="#cc2366" />
          <stop offset="100%" stopColor="#bc1888" />
        </linearGradient>
      </defs>
      <rect width="28" height="28" rx="7" fill="url(#ig-grad)" />
      <rect x="7" y="7" width="14" height="14" rx="4" stroke="white" strokeWidth="1.8" fill="none" />
      <circle cx="14" cy="14" r="3.5" stroke="white" strokeWidth="1.8" fill="none" />
      <circle cx="20.5" cy="7.5" r="1.2" fill="white" />
    </svg>
  );
}

// TikTok icon
function TikTokIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="7" fill="#010101" />
      <path
        d="M19.5 7.5C19.5 7.5 19.5 9.5 21.5 10.5V12.5C21.5 12.5 19.75 12.5 18.5 11.5V17.5C18.5 20.26 16.26 22.5 13.5 22.5C10.74 22.5 8.5 20.26 8.5 17.5C8.5 14.74 10.74 12.5 13.5 12.5C13.67 12.5 13.83 12.51 14 12.53V14.57C13.83 14.54 13.67 14.52 13.5 14.52C11.85 14.52 10.52 15.85 10.52 17.5C10.52 19.15 11.85 20.48 13.5 20.48C15.15 20.48 16.48 19.15 16.48 17.5V5.5H18.5C18.5 5.5 18.5 7.5 19.5 7.5Z"
        fill="white"
      />
      <path
        d="M19.5 7.5C19.5 7.5 19.5 9.5 21.5 10.5V12.5C21.5 12.5 19.75 12.5 18.5 11.5V17.5C18.5 20.26 16.26 22.5 13.5 22.5C10.74 22.5 8.5 20.26 8.5 17.5C8.5 14.74 10.74 12.5 13.5 12.5C13.67 12.5 13.83 12.51 14 12.53V14.57C13.83 14.54 13.67 14.52 13.5 14.52C11.85 14.52 10.52 15.85 10.52 17.5C10.52 19.15 11.85 20.48 13.5 20.48C15.15 20.48 16.48 19.15 16.48 17.5V5.5H18.5C18.5 5.5 18.5 7.5 19.5 7.5Z"
        fill="#69C9D0"
        fillOpacity="0.4"
      />
    </svg>
  );
}

export function AddAccountModal({ open, onClose }: AddAccountModalProps) {
  const { workspace } = useWorkspace();

  const connectInstagram = () => {
    if (!workspace) return;
    window.location.href = `/api/auth/instagram?workspaceId=${workspace.id}`;
  };

  const connectTikTok = () => {
    if (!workspace) return;
    window.location.href = `/api/auth/tiktok?workspaceId=${workspace.id}`;
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Connect account"
      description="Choose a platform to connect via OAuth. Your credentials are never stored — only encrypted tokens."
      size="sm"
    >
      <div className="space-y-3 pt-1">
        {/* Instagram */}
        <button
          onClick={connectInstagram}
          disabled={!workspace}
          className="w-full flex items-center gap-4 rounded-[--radius-lg] border border-[--border-subtle] bg-[--bg-base] hover:bg-[--bg-elevated] hover:border-[--border-default] transition-all duration-150 p-4 text-left group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="shrink-0">
            <InstagramIcon size={40} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[--text-primary] group-hover:text-white transition-colors">
              Connect Instagram
            </p>
            <p className="text-xs text-[--text-secondary] mt-0.5 leading-relaxed">
              Business &amp; Creator accounts via Facebook Login
            </p>
          </div>
          <svg
            className="shrink-0 text-[--text-tertiary] group-hover:text-[--text-secondary] transition-colors"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L10 8 6.22 4.28a.75.75 0 010-1.06z" />
          </svg>
        </button>

        {/* TikTok */}
        <button
          onClick={connectTikTok}
          disabled={!workspace}
          className="w-full flex items-center gap-4 rounded-[--radius-lg] border border-[--border-subtle] bg-[--bg-base] hover:bg-[--bg-elevated] hover:border-[--border-default] transition-all duration-150 p-4 text-left group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="shrink-0">
            <TikTokIcon size={40} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[--text-primary] group-hover:text-white transition-colors">
              Connect TikTok
            </p>
            <p className="text-xs text-[--text-secondary] mt-0.5 leading-relaxed">
              Personal &amp; Business accounts via TikTok Login
            </p>
          </div>
          <svg
            className="shrink-0 text-[--text-tertiary] group-hover:text-[--text-secondary] transition-colors"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L10 8 6.22 4.28a.75.75 0 010-1.06z" />
          </svg>
        </button>

        <p className="text-center text-xs text-[--text-tertiary] pt-1">
          You&apos;ll be redirected to the platform to authorize access. Tokens are AES-256 encrypted at rest.
        </p>
      </div>
    </Modal>
  );
}
