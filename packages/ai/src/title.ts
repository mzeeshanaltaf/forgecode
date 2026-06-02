import { generateText, type UIMessage } from "ai";
import { resolveTitleModel } from "./provider";

const MAX_WORDS = 10;
const MAX_CHARS = 80;

/** Joins the text parts of a UIMessage into a single trimmed string. */
function textOf(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join(" ")
    .trim();
}

/**
 * Normalizes a model-produced title: strips wrapping quotes, collapses
 * whitespace, drops a trailing period, and caps to {@link MAX_WORDS} words /
 * {@link MAX_CHARS} chars so a misbehaving model can't store something huge.
 */
function sanitize(raw: string): string {
  let title = raw.trim().replace(/\s+/g, " ");
  title = title.replace(/^["'`]+|["'`]+$/g, "").trim();
  title = title.replace(/\.+$/, "").trim();
  const words = title.split(" ");
  if (words.length > MAX_WORDS) title = words.slice(0, MAX_WORDS).join(" ");
  if (title.length > MAX_CHARS) title = title.slice(0, MAX_CHARS).trim();
  return title;
}

/**
 * Generates a short (≤ 10 words) session title from the user's first message.
 * Returns null when the message has no usable text. Throws if the model call
 * fails — callers run this fire-and-forget and swallow errors.
 */
export async function generateSessionTitle(message: UIMessage): Promise<string | null> {
  const text = textOf(message);
  if (!text) return null;

  const { text: raw } = await generateText({
    model: resolveTitleModel(),
    prompt: [
      "Write a concise title summarizing the following request.",
      "Rules: at most 10 words, plain text only, no surrounding quotes, no trailing punctuation.",
      "Respond with the title only — nothing else.",
      "",
      "Request:",
      text,
    ].join("\n"),
  });

  return sanitize(raw) || null;
}
