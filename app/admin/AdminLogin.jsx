"use client";
import { useEffect, useState } from "react";

const box = {
  maxWidth: 380, margin: "12vh auto 0", padding: 28, borderRadius: 12,
  background: "#0f1117", border: "1px solid #252840", color: "#e8eaf0",
  fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
};
const input = {
  width: "100%", boxSizing: "border-box", padding: "11px 13px", borderRadius: 8,
  border: "1px solid #252840", background: "#08090b", color: "#e8eaf0", fontSize: 14, marginTop: 6,
};
const button = {
  width: "100%", marginTop: 14, padding: "11px 13px", borderRadius: 8, border: "none",
  background: "#4a7bff", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer",
};

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState({ loading: true });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/admin").then(r => r.json()).then(s => {
      if (s.admin) window.location.replace("/?tab=admin");
      else setStatus(s);
    }).catch(() => setStatus({ enabled: true }));
  }, []);

  async function signIn(e) {
    e.preventDefault();
    setBusy(true); setError("");
    const res = await fetch("/api/admin", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) window.location.replace("/?tab=admin");
    else { setError(body.error || "Sign-in failed."); setBusy(false); setPassword(""); }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#08090b", padding: "0 16px" }}>
      <form style={box} onSubmit={signIn}>
        <div style={{ fontWeight: 800, fontSize: 20 }}>🏛 Agora staff sign-in</div>
        <div style={{ fontSize: 13, color: "#9aa0b4", margin: "6px 0 18px" }}>
          For election administrators only.
        </div>
        {status.loading ? (
          <div style={{ fontSize: 13, color: "#9aa0b4" }}>Checking…</div>
        ) : status.enabled === false ? (
          <div style={{ fontSize: 13, color: "#e2b45a" }}>
            Admin access is turned off. Set <code>ADMIN_PASSWORD</code> (12+ characters) in Vercel and redeploy.
          </div>
        ) : (
          <>
            <label style={{ fontSize: 12, fontWeight: 600 }}>
              Password
              <input type="password" autoComplete="current-password" autoFocus value={password}
                onChange={e => setPassword(e.target.value)} style={input} />
            </label>
            <button type="submit" disabled={busy || !password} style={{ ...button, opacity: busy || !password ? 0.6 : 1 }}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
            {error && <div style={{ color: "#f04060", fontSize: 13, marginTop: 10 }}>⚠ {error}</div>}
          </>
        )}
        <a href="/" style={{ display: "block", marginTop: 18, fontSize: 12, color: "#6b7080" }}>← Back to Agora</a>
      </form>
    </div>
  );
}
