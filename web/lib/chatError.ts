export const CHAT_LIMIT_MESSAGE =
  "Chat is paused because this demo hit its OpenAI usage limit. Photo convert and clay lessons still work. Try again later.";

export function friendlyChatError(raw: string): string {
  const blob = raw.toLowerCase();
  if (
    /insufficient_quota|exceeded your current quota|billing_not_active|monthly budget|usage limit|budget exceeded|spending limit/.test(
      blob,
    )
  ) {
    return CHAT_LIMIT_MESSAGE;
  }
  if (/ratelimit|rate_limit|rate limit|too many requests|error code: 429|\b429\b/.test(blob)) {
    return "Chat is temporarily rate-limited. Wait a minute and send again. Photo convert still works.";
  }
  if (blob.includes("openai_api_key") && blob.includes("chat is off")) {
    return raw;
  }
  if (raw.includes("Chat is paused") || raw.includes("Chat is temporarily")) {
    return raw;
  }
  return raw || "Chat failed. Photo convert and clay lessons still work.";
}
