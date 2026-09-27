"use client";

import { useEffect, useState } from "react";
import { fetchHealth } from "./api";

export type ApiStatus = "checking" | "ready" | "no-agents" | "offline";

export type ApiHealth = {
  status: ApiStatus;
  agents: boolean;
};

const RETRIES = 15;
const GAP_MS = 4000;

export function useApiHealth(): ApiHealth {
  const [state, setState] = useState<ApiHealth>({ status: "checking", agents: false });

  useEffect(() => {
    let cancelled = false;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const ping = async () => {
      try {
        const health = await fetchHealth();
        if (cancelled) return;
        setState({ status: health.agents ? "ready" : "no-agents", agents: health.agents });
      } catch {
        if (cancelled) return;
        attempt += 1;
        if (attempt >= RETRIES) {
          setState({ status: "offline", agents: false });
          return;
        }
        setState({ status: "checking", agents: false });
        timer = setTimeout(ping, GAP_MS);
      }
    };

    ping();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return state;
}
