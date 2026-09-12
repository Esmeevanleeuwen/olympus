import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "./erd.css";
import "./data-workspace.css";
export const metadata: Metadata = {
  title: "Olympus — Workspace",
  description: "A minimal, modular design preview for Olympus.",
  robots: { index: false, follow: false }
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
