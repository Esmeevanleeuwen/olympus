import type { Metadata } from "next";
import type { ReactNode } from "react";
import SidebarShell from "../components/sidebar-shell";
import ScratchpadShell from "../components/scratchpad-shell";
import "./globals.css";
import "./sidebar-shell.css";
import "./scratchpad-shell.css";

export const metadata: Metadata = {
  title: "Olympus — Workspace",
  description: "A minimal, modular design preview for Olympus.",
  robots: { index: false, follow: false }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}<SidebarShell/><ScratchpadShell/></body></html>;
}
