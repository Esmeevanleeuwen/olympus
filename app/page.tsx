import Link from "next/link";
import Dashboard from "../components/dashboard";

export default function Page() {
  return <>
    <Dashboard dataWorkspaceUrl={`${process.env.GITHUB_PAGES === "true" ? "/olympus" : ""}/data-workspace/index.html?v=2`} />
    <Link
      href="/builder"
      aria-label="Open Builder Lab"
      style={{
        position: "fixed",
        right: 18,
        bottom: 18,
        zIndex: 30,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        minHeight: 38,
        padding: "8px 11px",
        border: "1px solid #4a435b",
        borderRadius: 8,
        background: "#282531",
        color: "#e2dcfb",
        boxShadow: "0 10px 34px rgba(0,0,0,.28)",
        fontSize: 11
      }}
    >
      Builder Lab
      <span style={{ fontSize: 8, letterSpacing: ".7px", color: "#b7aef5" }}>TEST</span>
    </Link>
  </>;
}
