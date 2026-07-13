import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type HealthResponse = {
  ok: boolean;
  service: string;
  database: string;
  redis: string;
  timestamp: string;
};

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadHealth() {
      try {
        const response = await fetch("/api/health");
        if (!response.ok) {
          throw new Error(`Health check failed (${response.status})`);
        }
        const data = (await response.json()) as HealthResponse;
        if (!cancelled) {
          setHealth(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Request failed");
        }
      }
    }

    void loadHealth();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-6 py-16">
      <div className="space-y-3">
        <p className="text-sm font-medium tracking-[0.2em] text-muted-foreground uppercase">
          Athens FM
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          A democratic DJ
        </h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          Monorepo scaffold is live — Vite frontend talking to the Express API.
        </p>
      </div>

      <div className="space-y-3">
        <Button
          onClick={() => {
            window.location.reload();
          }}
        >
          Refresh status
        </Button>
        {health ? (
          <p className="text-sm text-muted-foreground">
            API: {health.service} · DB: {health.database} · Redis:{" "}
            {health.redis} · {health.timestamp}
          </p>
        ) : null}
        {error ? (
          <p className="text-sm text-destructive">
            API unreachable (start with `npm run dev`): {error}
          </p>
        ) : null}
      </div>
    </main>
  );
}
