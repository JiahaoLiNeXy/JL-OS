import OpenAI from "openai";
import { portfolioProjects } from "../../src/content/generated/portfolio-data";

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type ChatRequest = {
  messages?: ChatMessage[];
  intent?: "hire" | "collaborate" | "curious" | "none";
  timelineYear?: number;
  openedProjects?: string[];
  activeProject?: {
    slug: string;
    title: string;
    summary: string;
  } | null;
};

function getProjectSummary(slug: string): string | null {
  const project = portfolioProjects.find((entry) => entry.slug === slug);
  if (!project) return null;
  return `${project.title.en} (${project.categoryLabel.en}, ${project.publishYear}): ${project.summary.en}`;
}

function buildIntentContext(intent: ChatRequest["intent"]) {
  switch (intent) {
    case "hire":
      return "The visitor explicitly said they may want to hire Jiahao. Lead with the strongest product, software, and systems-thinking evidence first.";
    case "collaborate":
      return "The visitor explicitly said they may want to build with Jiahao. Lead with breadth, process, and how cross-disciplinary work comes together.";
    case "curious":
      return "The visitor said they are curious. Lead with what is distinctive, memorable, and personally revealing rather than pitching.";
    default:
      return "No explicit visitor intent has been set yet.";
  }
}

export function buildSystemPrompt(body: ChatRequest) {
  const openedProjectSummaries = (body.openedProjects ?? [])
    .map((slug) => getProjectSummary(slug))
    .filter((value): value is string => Boolean(value))
    .slice(0, 6);

  const featuredProjects = ["dinder", "anyhome", "booky", "calligraphy-museum", "photography"]
    .map((slug) => getProjectSummary(slug))
    .filter((value): value is string => Boolean(value));

  return [
    "You are Jiahao Li, speaking in first person.",
    "Tone: warm, thoughtful, concise, direct. Never sound like a generic chatbot or third-person assistant.",
    "Background: Jiahao Li is a multidisciplinary designer working across architecture, interiors, branding, software, photography, web, and industrial design.",
    "Current work: Dinder is the current flagship software project and should be treated as active, important work.",
    "Design philosophy: care about meaningful work, humane experiences, clarity, spatial and interface narrative, and making thoughtful things that feel alive.",
    buildIntentContext(body.intent),
    `Current timeline position: ${body.timelineYear ?? 2026}.`,
    body.activeProject
      ? `Current active project in view: ${body.activeProject.title}. ${body.activeProject.summary}`
      : "There is no single active project in focus right now.",
    openedProjectSummaries.length
      ? `Projects the visitor has already opened this session:\n- ${openedProjectSummaries.join("\n- ")}`
      : "The visitor has not opened any project windows yet.",
    "Key project summaries to draw from:",
    ...featuredProjects.map((summary) => `- ${summary}`),
    "Behavior rules:",
    "- Answer as yourself, in first person.",
    "- Keep answers compact by default, but still specific.",
    "- If the visitor asks what to look at, recommend concrete projects based on intent.",
    "- If the visitor asks about hiring or collaboration, explain your fit using real project evidence.",
    "- If the visitor asks about process, explain how you think and make tradeoffs across disciplines.",
    "- Do not invent education, clients, or achievements that are not supported by the provided project context.",
  ].join("\n");
}

export function parseChatMessages(body: ChatRequest | null | undefined): ChatMessage[] {
  return Array.isArray(body?.messages)
    ? body.messages.filter(
        (message): message is ChatMessage =>
          Boolean(message) &&
          typeof message.content === "string" &&
          (message.role === "user" || message.role === "assistant" || message.role === "system"),
      )
    : [];
}

export async function generateJLChatReply(body: ChatRequest): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing");
  }

  const messages = parseChatMessages(body);
  if (!messages.length) {
    throw new Error("messages are required");
  }

  const model = process.env.OPENAI_MODEL || "gpt-5.4";
  const client = new OpenAI({ apiKey });

  const response = await client.responses.create({
    model,
    reasoning: { effort: "low" },
    instructions: buildSystemPrompt(body),
    input: messages.map((message) => ({
      role: message.role === "system" ? "developer" : message.role,
      content: message.content,
    })),
  });

  const reply = response.output_text?.trim();
  if (!reply) {
    throw new Error("model returned an empty response");
  }

  return reply;
}
