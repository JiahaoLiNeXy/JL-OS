import { useDeferredValue, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MagnifyingGlass, ArrowRight } from "@phosphor-icons/react";
import { useSpotlightStore } from "@/stores/useSpotlightStore";
import { useLaunchApp } from "@/hooks/useLaunchApp";
import { useLanguageStore } from "@/stores/useLanguageStore";
import { portfolioProjects } from "@/content/generated/portfolio-data";
import { appRegistry } from "@/config/appRegistry";
import { matchesProjectQuery, textForLocale } from "@/portfolio/helpers";
import type { AppId } from "@/config/appRegistry";

type SpotlightEntry = {
  id: string;
  type: "project" | "app";
  title: string;
  subtitle: string;
  action: () => void;
};

const UTILITY_APP_IDS: AppId[] = [
  "videos",
  "soundboard",
  "ipod",
  "internet-explorer",
  "terminal",
  "minesweeper",
  "control-panels",
  "admin",
  "calendar",
  "contacts",
  "applet-viewer",
];

export function PortfolioSpotlightSearch() {
  const { isOpen, query, selectedIndex, setQuery, setSelectedIndex, reset } = useSpotlightStore();
  const deferredQuery = useDeferredValue(query);
  const language = useLanguageStore((state) => state.current);
  const launchApp = useLaunchApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const results = useMemo<SpotlightEntry[]>(() => {
    const trimmed = deferredQuery.trim();
    if (!trimmed) {
      return [
        {
          id: "project-dinder",
          type: "project",
          title: language === "zh" ? "Dinder" : "Dinder",
          subtitle: language === "zh" ? "旗舰软件案例" : "flagship software case study",
          action: () =>
            launchApp("finder", {
              initialData: { mode: "project", projectSlug: "dinder" },
              multiWindow: true,
            }),
        },
        {
          id: "project-photography",
          type: "project",
          title: language === "zh" ? "Photography" : "Photography",
          subtitle: language === "zh" ? "摄影实践 2019-present" : "photography practice, 2019-present",
          action: () =>
            launchApp("finder", {
              initialData: { mode: "project", projectSlug: "photography" },
              multiWindow: true,
            }),
        },
        {
          id: "app-projects",
          type: "app",
          title: language === "zh" ? "Projects" : "Projects",
          subtitle: language === "zh" ? "打开项目浏览器" : "open the project browser",
          action: () => launchApp("finder", { initialData: { mode: "browser" }, multiWindow: true }),
        },
        {
          id: "app-talk",
          type: "app",
          title: language === "zh" ? "Talk to JL" : "Talk to JL",
          subtitle: language === "zh" ? "开始一段对话" : "start a conversation",
          action: () => launchApp("chats"),
        },
      ];
    }

    const projectResults = portfolioProjects
      .filter((project) => matchesProjectQuery(project, trimmed, language))
      .slice(0, 8)
      .map<SpotlightEntry>((project) => ({
        id: `project-${project.slug}`,
        type: "project",
        title: textForLocale(project.title, language),
        subtitle: `${textForLocale(project.categoryLabel, language)} · ${project.publishYear}`,
        action: () =>
          launchApp("finder", {
            initialData: { mode: "project", projectSlug: project.slug },
            multiWindow: true,
          }),
      }));

    const appResults = UTILITY_APP_IDS.filter((appId) => {
      const app = appRegistry[appId];
      const haystack = `${app.name} ${app.description}`.toLowerCase();
      return haystack.includes(trimmed.toLowerCase());
    }).map<SpotlightEntry>((appId) => ({
      id: `app-${appId}`,
      type: "app",
      title: appRegistry[appId].name,
      subtitle: appRegistry[appId].description,
      action: () => launchApp(appId),
    }));

    return [...projectResults, ...appResults].slice(0, 12);
  }, [deferredQuery, language, launchApp]);

  useEffect(() => {
    if (!isOpen) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(id);
  }, [isOpen]);

  useEffect(() => {
    const selected = listRef.current?.querySelector<HTMLElement>(`[data-spotlight-index="${selectedIndex}"]`);
    selected?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        reset();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex(Math.min(selectedIndex + 1, results.length - 1));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex(Math.max(selectedIndex - 1, 0));
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        results[selectedIndex]?.action();
        reset();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, reset, results, selectedIndex, setSelectedIndex]);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-[9500] bg-black/30 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={reset}
        >
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="mx-auto mt-16 w-[calc(100vw-24px)] max-w-[620px] overflow-hidden rounded-[28px] border border-white/10 bg-[rgba(12,15,22,0.9)] text-white shadow-[0_30px_120px_rgba(0,0,0,0.5)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
              <MagnifyingGlass className="h-5 w-5 text-white/55" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={language === "zh" ? "搜索项目 标签 地点 或工具应用" : "search projects, tags, places, or utility apps"}
                className="h-8 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-white/35"
              />
            </div>
            <div ref={listRef} className="max-h-[70vh] overflow-auto p-3">
              {results.length ? (
                <div className="space-y-2">
                  {results.map((result, index) => (
                    <button
                      key={result.id}
                      data-spotlight-index={index}
                      type="button"
                      onMouseEnter={() => setSelectedIndex(index)}
                      onClick={() => {
                        result.action();
                        reset();
                      }}
                      className={`flex w-full items-center justify-between rounded-[18px] px-4 py-3 text-left transition ${
                        index === selectedIndex ? "bg-white/12" : "bg-white/[0.04] hover:bg-white/[0.08]"
                      }`}
                    >
                      <div>
                        <div className="text-[14px] font-medium text-white">{result.title}</div>
                        <div className="mt-1 text-[12px] text-white/55">{result.subtitle}</div>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-white/35">
                        <span>{result.type}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-8 text-center text-[13px] text-white/45">
                  {language === "zh" ? "没有匹配结果" : "no matching results"}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
