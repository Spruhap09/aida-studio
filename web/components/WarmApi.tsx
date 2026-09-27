"use client";

import { useEffect } from "react";
import { fetchHealth } from "@/lib/api";

/** Kick the sleeping API as soon as someone opens the site. */
export function WarmApi() {
  useEffect(() => {
    fetchHealth().catch(() => {
      /* wake attempt; pages retry on their own */
    });
  }, []);
  return null;
}
