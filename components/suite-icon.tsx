import * as React from "react";
export default function SuiteIcon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    note: <><path d="M8 5H4v16h16V11"/><path d="m9 15 1-4L19 2l3 3-9 9z"/></>,
    box: <><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 12h8m-4-4v8"/></>,
    library: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M14 17h7m-3.5-3.5v7"/></>,
    database: <><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0"/></>,
    code: <path d="m8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18"/>,
    bolt: <path d="m14 2-9 12h7l-2 8 9-12h-7z"/>,
    close: <path d="m6 6 12 12M6 18 18 6"/>,
    up: <path d="m6 15 6-6 6 6"/>, down: <path d="m6 9 6 6 6-6"/>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.box}</svg>;
}
