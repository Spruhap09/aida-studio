import type { ChatEvent } from "./types";

export async function readSse(
  response: Response,
  onEvent: (event: ChatEvent) => void,
): Promise<void> {
  if (!response.body) throw new Error("No stream");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      const line = chunk.split("\n").find((entry) => entry.startsWith("data: "));
      if (!line) continue;
      try {
        onEvent(JSON.parse(line.slice(6)) as ChatEvent);
      } catch {
        /* ignore malformed frames */
      }
    }
  }
}

export async function studioChat(body: {
  message: string;
  thread_id?: string | null;
  image_base64?: string | null;
  stitch_width: number;
  max_colors: number;
  aida_count: number;
}): Promise<Response> {
  const res = await fetch("/backend/studio/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text);
  }
  return res;
}

export async function studioResume(body: {
  thread_id: string;
  approved: boolean;
  max_colors?: number;
}): Promise<Response> {
  const res = await fetch("/backend/studio/resume", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res;
}
