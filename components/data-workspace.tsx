"use client";

import { useEffect, useState } from "react";

/** Keep the demo mounted after its first visit so switching sources keeps its state. */
export default function DataWorkspace({ active, src }: { active: boolean; src: string }) {
  const [opened, setOpened] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (active) setOpened(true);
  }, [active]);

  if (!opened) return null;

  return <section className="data-workspace-frame" aria-label="Demo data workspace" aria-busy={!loaded}>
    {!loaded && <p className="data-workspace-loading" role="status">Opening data workspace…</p>}
    <iframe
      src={src}
      title="Data workspace — tables, structure, connections and latest changes"
      onLoad={() => setLoaded(true)}
      allow="clipboard-write"
    />
  </section>;
}
