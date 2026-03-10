import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clippy.AI — Social Media Command Center",
  description:
    "AI-powered content production, mass publishing, and lead generation for modern marketing teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body className="antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
