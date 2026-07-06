import { useEffect, useState, type ReactNode } from "react";

const API = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000";
const POLL_MS = 400;
const TIMEOUT_MS = 30_000;

type Phase = "waiting" | "ready" | "timeout";

/**
 * Blocks the app until the backend sidecar answers `GET /health`. The frozen
 * PyInstaller backend can take a few seconds to start on first launch, so
 * without this the UI would fire requests into a dead socket and error out.
 */
export default function StartupGate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>("waiting");

  useEffect(() => {
    let cancelled = false;
    const start = Date.now();

    async function poll() {
      if (cancelled) return;
      try {
        const res = await fetch(`${API}/health`);
        if (res.ok) {
          if (!cancelled) setPhase("ready");
          return;
        }
      } catch {
        // backend not up yet
      }
      if (cancelled) return;
      if (Date.now() - start > TIMEOUT_MS) {
        setPhase("timeout");
        return;
      }
      setTimeout(poll, POLL_MS);
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, []);

  if (phase === "ready") return <>{children}</>;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1.5rem",
        background: "var(--color-surface, #0d0d0d)",
        color: "var(--color-on-surface, #ececec)",
        fontFamily: 'var(--font-sans, "Inter", system-ui, sans-serif)',
      }}
    >
      <img
        src="./logo-mark.png"
        alt="Amphion"
        width={72}
        height={72}
        style={{ borderRadius: 16, objectFit: "cover" }}
      />
      {phase === "waiting" ? (
        <>
          <div
            style={{
              width: 32,
              height: 32,
              border: "3px solid var(--color-outline-variant, #262626)",
              borderTopColor: "var(--color-primary, #7c6fe0)",
              borderRadius: "50%",
              animation: "amphion-spin 0.8s linear infinite",
            }}
          />
          <p style={{ color: "var(--color-on-surface-variant, #9a9a9a)" }}>
            Starting Amphion…
          </p>
        </>
      ) : (
        <div style={{ textAlign: "center", maxWidth: 360, padding: "0 1.5rem" }}>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>
            Couldn’t reach the Amphion engine
          </p>
          <p
            style={{
              color: "var(--color-on-surface-variant, #9a9a9a)",
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            The background service didn’t start. Try closing and reopening
            Amphion. If it keeps happening, another program may be using port
            8000.
          </p>
        </div>
      )}
      <style>{"@keyframes amphion-spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );
}
