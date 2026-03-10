import React from "react";

interface PlatformIconProps {
  platform: "INSTAGRAM" | "TIKTOK" | "YOUTUBE";
  size?: number;
}

export function PlatformIcon({ platform, size = 16 }: PlatformIconProps) {
  if (platform === "INSTAGRAM") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-label="Instagram"
      >
        <defs>
          <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f09433" />
            <stop offset="25%" stopColor="#e6683c" />
            <stop offset="50%" stopColor="#dc2743" />
            <stop offset="75%" stopColor="#cc2366" />
            <stop offset="100%" stopColor="#bc1888" />
          </linearGradient>
        </defs>
        <rect width="24" height="24" rx="6" fill="url(#ig-grad)" />
        <path
          d="M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z"
          stroke="white"
          strokeWidth="1.5"
          fill="none"
        />
        <circle cx="16" cy="8" r="1" fill="white" />
        <rect
          x="4"
          y="4"
          width="16"
          height="16"
          rx="4"
          stroke="white"
          strokeWidth="1.5"
          fill="none"
        />
      </svg>
    );
  }

  if (platform === "TIKTOK") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-label="TikTok"
      >
        <rect width="24" height="24" rx="6" fill="#010101" />
        <path
          d="M17 8.5c-1.1 0-2-.9-2-2V4h-2.5v11c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2c.18 0 .35.02.5.06V10.5A4.5 4.5 0 007 15a4.5 4.5 0 004.5 4.5A4.5 4.5 0 0016 15V9.5c.78.5 1.7.8 2.68.8V7.8A2.8 2.8 0 0117 8.5z"
          fill="white"
        />
      </svg>
    );
  }

  // YOUTUBE
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="YouTube"
    >
      <rect width="24" height="24" rx="6" fill="#FF0000" />
      <path
        d="M19.5 8.5s-.2-1.3-.8-1.9c-.7-.8-1.6-.8-2-.8C14.5 5.7 12 5.7 12 5.7s-2.5 0-4.7.1c-.4 0-1.3 0-2 .8-.6.6-.8 1.9-.8 1.9S4.3 10 4.3 11.5v1.4c0 1.4.2 2.9.2 2.9s.2 1.3.8 1.9c.7.8 1.7.7 2.1.8C8.7 18.7 12 18.7 12 18.7s2.5 0 4.7-.2c.4 0 1.3 0 2-.8.6-.6.8-1.9.8-1.9s.2-1.4.2-2.9v-1.4C19.7 10 19.5 8.5 19.5 8.5z"
        fill="white"
        opacity=".1"
      />
      <path d="M10 9.5v5l4.5-2.5L10 9.5z" fill="white" />
    </svg>
  );
}

export const PLATFORM_LABELS: Record<string, string> = {
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
  YOUTUBE: "YouTube",
};

export const PLATFORM_COLORS: Record<string, string> = {
  INSTAGRAM: "#E1306C",
  TIKTOK: "#69C9D0",
  YOUTUBE: "#FF0000",
};
