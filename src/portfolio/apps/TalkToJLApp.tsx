import { useMemo, useState, useEffect } from "react";
import type { FormEvent } from "react";
import { WindowFrame } from "@/components/layout/WindowFrame";
import type { AppProps } from "@/apps/base/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePortfolioStore } from "@/portfolio/store";
import { useTalkToJLStore } from "@/portfolio/useTalkToJLStore";
import { portfolioProjects } from "@/content/generated/portfolio-data";
import { useLanguageStore } from "@/stores/useLanguageStore";

type TalkToJLInitialData = {
  prefillMessage?: string;
  autoSend?: boolean;
};

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function TalkToJLApp({
  onClose,
  isWindowOpen,
  isForeground = true,
  skipInitialSound,
  instanceId,
  initialData,
}: AppProps<unknown>) {
  const parsedInitialData = (initialData as TalkToJLInitialData | undefined) ?? {};
  const language = useLanguageStore((state) => state.current);
  const messages = useTalkToJLStore((state) => state.messages);
  const addMessage = useTalkToJLStore((state) => state.addMessage);
  const openedProjects = usePortfolioStore((state) => state.openedProjects);
  const activeProjectSlug = usePortfolioStore((state) => state.activeProjectSlug);
  const intent = usePortfolioStore((state) => state.intent);
  const timelineYear = usePortfolioStore((state) => state.timelineYear);
  const [input, setInput] = useState(parsedInitialData.prefillMessage ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeProject = useMemo(
    () =>
      activeProjectSlug
        ? portfolioProjects.find((project) => project.slug === activeProjectSlug)
        : null,
    [activeProjectSlug],
  );

  useEffect(() => {
    if (parsedInitialData.prefillMessage && parsedInitialData.autoSend) {
      const prefillMessage = parsedInitialData.prefillMessage;
      void (async () => {
        await handleSubmitInternal(prefillMessage);
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmitInternal(content: string) {
    const trimmed = content.trim();
    if (!trimmed || isLoading) return;

    setError(null);
    const nextUserMessage = {
      id: createMessageId(),
      role: "user" as const,
      content: trimmed,
    };
    addMessage(nextUserMessage);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, nextUserMessage].map((message) => ({
            role: message.role,
            content: message.content,
          })),
          intent,
          timelineYear,
          openedProjects,
          activeProject: activeProject
            ? {
                slug: activeProject.slug,
                title: activeProject.title.en,
                summary: activeProject.summary.en,
              }
            : null,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "chat request failed");
      }

      addMessage({
        id: createMessageId(),
        role: "assistant",
        content: payload.reply,
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "chat request failed");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await handleSubmitInternal(input);
  }

  if (!isWindowOpen) return null;

  return (
    <WindowFrame
      title={language === "zh" ? "Talk to JL" : "Talk to JL"}
      onClose={onClose}
      isForeground={isForeground}
      appId="chats"
      skipInitialSound={skipInitialSound}
      instanceId={instanceId}
    >
      <div className="flex h-full flex-col bg-[#f5f3ef]">
        <div className="border-b border-black/10 px-5 py-4">
          <div className="text-[11px] uppercase tracking-[0.16em] text-black/45">
            {intent === "none" ? "conversation" : `intent · ${intent}`}
          </div>
          <div className="mt-1 text-[13px] text-black/62">
            {activeProject
              ? `context: ${activeProject.title.en}`
              : language === "zh"
                ? "你可以直接问项目 设计思路 或合作方式"
                : "ask about projects, design thinking, or how we might work together"}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-5 py-5">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={message.role === "assistant" ? "max-w-[88%]" : "ml-auto max-w-[82%]"}
              >
                <div
                  className={
                    message.role === "assistant"
                      ? "rounded-[18px] rounded-tl-[6px] bg-white px-4 py-3 text-[14px] leading-7 text-black shadow-[0_10px_26px_rgba(0,0,0,0.05)]"
                      : "rounded-[18px] rounded-tr-[6px] bg-black px-4 py-3 text-[14px] leading-7 text-white"
                  }
                >
                  {message.content}
                </div>
              </div>
            ))}
            {isLoading ? (
              <div className="max-w-[88%] rounded-[18px] rounded-tl-[6px] bg-white px-4 py-3 text-[14px] text-black/50 shadow-[0_10px_26px_rgba(0,0,0,0.05)]">
                thinking...
              </div>
            ) : null}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="border-t border-black/10 bg-white/70 px-4 py-4">
          {error ? <div className="mb-3 text-[12px] text-red-600">{error}</div> : null}
          <div className="flex items-center gap-3">
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={language === "zh" ? "问我项目 合作 或 Dinder" : "ask about projects, collaboration, or dinder"}
              className="h-11 rounded-full border-black/10 bg-white"
            />
            <Button type="submit" className="rounded-full px-5" disabled={isLoading || !input.trim()}>
              Send
            </Button>
          </div>
        </form>
      </div>
    </WindowFrame>
  );
}
