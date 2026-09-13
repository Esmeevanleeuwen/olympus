"use client";
import { useRef, useState } from "react";
import { useWorkspaceAccess } from "@olympus/workspace-ui/access";
import { FEATURES, PLATFORMS, type FeatureAccess } from "@olympus/workspace-ui/model";
import { suiteClient } from "../lib/suite-client";

export default function PlatformFeatures() {
  const access = useWorkspaceAccess();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState("");
  const [message, setMessage] = useState("");
  const locked = useRef(false);
  async function signIn(event: React.FormEvent) {
    event.preventDefault(); setPending("login"); setMessage("");
    try {
      const { error } = await suiteClient.auth.signInWithPassword({ email, password });
      setPassword("");
      if (error) setMessage("Inloggen is niet gelukt. Controleer je Meridian-accountgegevens.");
    } finally { setPending(""); }
  }
  async function toggle(row: FeatureAccess) {
    if (locked.current) return;
    locked.current = true; setPending(`${row.platform_id}:${row.feature_id}`); setMessage("");
    try {
      const { data, error } = await suiteClient.from("suite_feature_access").update({ enabled: !row.enabled })
        .eq("platform_id", row.platform_id).eq("feature_id", row.feature_id).eq("revision", row.revision).select("revision");
      if (error) setMessage("Wijzigen is geweigerd. Alleen de eigenaar kan platformfuncties aanpassen.");
      else if (!data?.length) setMessage("De instelling is ondertussen gewijzigd. Controleer de nieuwe stand en probeer opnieuw.");
      else setMessage(`Opgeslagen voor ${row.platform_id === "meridian" ? "Meridian" : "Olympus"}. Open werkruimtes nemen dit binnen 20 seconden over.`);
      await access.refresh();
    } finally { locked.current = false; setPending(""); }
  }
  return <section className="platform-features" aria-labelledby="platform-features-title">
    <div className="panel-heading"><div><span className="eyebrow">GEDEELDE ONDERDELEN</span><h2 id="platform-features-title">Platformfuncties</h2><p>Bepaal welke functies Olympus en Meridian mogen gebruiken.</p></div><button className="button" onClick={() => void access.refresh()}>Vernieuwen</button></div>
    {!access.userId ? <form className="feature-login" onSubmit={signIn}><p>Log in met je Meridian-eigenaarsaccount om de schakelaars te beheren.</p><label>E-mailadres<input type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} /></label><label>Wachtwoord<input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} /></label><button className="button primary" disabled={!!pending}>Inloggen</button></form>
      : <div className="feature-session"><span>{access.owner ? "Ingelogd als eigenaar" : "Je account heeft geen rechten om platformfuncties te wijzigen."}</span><button className="button" onClick={async () => { const { error } = await suiteClient.auth.signOut({ scope: "local" }); if (error) setMessage("Uitloggen is niet gelukt. Probeer opnieuw."); }}>Uitloggen</button></div>}
    {access.error && <p className="feature-message" role="alert">{access.error}</p>}
    {!access.ready && <p role="status">Instellingen laden…</p>}
    <div className="feature-table-wrap"><table className="feature-table"><thead><tr><th>Functie</th>{PLATFORMS.map(platform => <th key={platform}>{platform === "olympus" ? "Olympus" : "Meridian"}</th>)}</tr></thead><tbody>{FEATURES.map(feature => <tr key={feature.id}><th scope="row"><strong>{feature.title}</strong><p>{feature.description}</p></th>{PLATFORMS.map(platform => {
      const row = access.rows.find(item => item.platform_id === platform && item.feature_id === feature.id);
      return <td key={platform}>{row ? <label className="switch-control"><input type="checkbox" role="switch" aria-label={`${feature.title} voor ${platform === "olympus" ? "Olympus" : "Meridian"}`} checked={row.enabled} disabled={!access.owner || !!pending} onChange={() => void toggle(row)} /><span className="switch-track" aria-hidden="true"><span /></span><span>{row.enabled ? "Aan" : "Uit"}</span></label> : <span className="muted">Nog niet aangesloten</span>}</td>;
    })}</tr>)}</tbody></table></div>
    <p className="feature-message" role="status">{message}</p>
    <div className="feature-help"><h3>Een nieuwe functie toevoegen</h3><p>Een functie wordt eerst gebouwd en aangesloten op de gedeelde basis. Daarna verschijnt hier de schakelaar per platform. Aan- en uitzetten kan vervolgens zonder een nieuwe code-update.</p><p>Iedereen houdt zijn eigen vormgeving, menu en gebruikersrechten. Persoonlijke sidebarvoorkeuren worden per account en platform bewaard.</p></div>
  </section>;
}
