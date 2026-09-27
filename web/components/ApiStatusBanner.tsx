import type { ApiHealth } from "@/lib/health";

export function ApiStatusBanner({
  health,
  chatLabel = "Chat",
}: {
  health: ApiHealth;
  chatLabel?: string;
}) {
  if (health.status === "ready") return null;

  const text =
    health.status === "no-agents"
      ? `${chatLabel} is off until OPENAI_API_KEY is set on the API host (Render). Convert and lessons still work.`
      : health.status === "offline"
        ? "Can't reach the API. If convert just worked, wait a few seconds and refresh."
        : "The API sleeps on free hosting. The first chat can take about 30 seconds — it is not broken.";

  return <p className="mt-3 rounded-xl bg-gold/20 px-3 py-2 text-sm">{text}</p>;
}
