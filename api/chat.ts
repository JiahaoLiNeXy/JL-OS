import type { VercelRequest, VercelResponse } from "@vercel/node";
import { generateJLChatReply, type ChatRequest } from "./_utils/jl-chat.js";

export const runtime = "nodejs";
export const maxDuration = 30;

function setJsonHeaders(res: VercelResponse) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
}

function parseBody(req: VercelRequest): ChatRequest {
  const rawBody = req.body;

  if (!rawBody) {
    return {};
  }

  if (typeof rawBody === "string") {
    return JSON.parse(rawBody) as ChatRequest;
  }

  if (Buffer.isBuffer(rawBody)) {
    return JSON.parse(rawBody.toString("utf8")) as ChatRequest;
  }

  return rawBody as ChatRequest;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  setJsonHeaders(res);

  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "OPTIONS, POST");
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "OPTIONS, POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  let body: ChatRequest;
  try {
    body = parseBody(req);
  } catch {
    res.status(400).json({ error: "Invalid JSON body" });
    return;
  }

  try {
    const reply = await generateJLChatReply(body);
    res.status(200).json({ reply });
  } catch (error) {
    const message = error instanceof Error ? error.message : "chat request failed";
    const statusCode =
      message === "OPENAI_API_KEY is missing"
        ? 503
        : message === "messages are required" || message === "Invalid JSON body"
          ? 400
          : 500;

    res.status(statusCode).json({ error: message });
  }
}
