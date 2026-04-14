import { startTransition, useEffect, useRef, useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { Slider } from "@/components/ui/slider";
import { usePortfolioStore } from "@/portfolio/store";
import { PORTFOLIO_PRESENT_YEAR, PORTFOLIO_START_YEAR } from "@/portfolio/helpers";
import { useLanguageStore } from "@/stores/useLanguageStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { useAppStoreShallow } from "@/stores/helpers";
import { useLaunchApp } from "@/hooks/useLaunchApp";
import { useIsPhone } from "@/hooks/useIsPhone";
import { toggleSpotlightSearch } from "@/utils/appEventBus";
import {
  PORTFOLIO_CATEGORY_GROUPS,
  categoriesMatchGroup,
  textForLocale,
} from "@/portfolio/helpers";

const FUTURE_TIMELINE_YEARS = [2027, 2028, 2029, 2030, 2035, 2040, 2050, 2075, 2100] as const;
const TIMELINE_YEARS = [
  ...Array.from({ length: PORTFOLIO_PRESENT_YEAR - PORTFOLIO_START_YEAR + 1 }, (_, index) => PORTFOLIO_START_YEAR + index),
  ...FUTURE_TIMELINE_YEARS,
];
const TIMELINE_MAX_INDEX = TIMELINE_YEARS.length - 1;

function yearToTimelineIndex(year: number): number {
  const exactIndex = TIMELINE_YEARS.indexOf(Math.round(year));
  if (exactIndex >= 0) return exactIndex;

  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;
  TIMELINE_YEARS.forEach((candidate, index) => {
    const distance = Math.abs(candidate - year);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });
  return closestIndex;
}

function formatClock(date: Date, language: "en" | "zh"): string {
  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function HeaderTimeline() {
  const isPhone = useIsPhone();
  const timelineVisible = usePortfolioStore((state) => state.timelineVisible);
  const timelineYear = usePortfolioStore((state) => state.timelineYear);
  const setTimelineYear = usePortfolioStore((state) => state.setTimelineYear);
  const timelineIndex = yearToTimelineIndex(timelineYear);
  const handlePercent = TIMELINE_MAX_INDEX === 0 ? 0 : (timelineIndex / TIMELINE_MAX_INDEX) * 100;

  const [bubbleVisible, setBubbleVisible] = useState(true);
  const hideTimerRef = useRef<number | null>(null);

  // Auto-hide bubble after 2 s of inactivity; show on change
  useEffect(() => {
    setBubbleVisible(true);
    if (hideTimerRef.current !== null) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => setBubbleVisible(false), 2000);
    return () => {
      if (hideTimerRef.current !== null) clearTimeout(hideTimerRef.current);
    };
  }, [timelineYear]);

  if (!timelineVisible) {
    return null;
  }

  return (
    <div className={isPhone ? "border-t border-black/10 px-3 py-1" : "w-full overflow-visible"}>
      <div className={`mx-auto w-full overflow-visible ${isPhone ? "max-w-[360px]" : "max-w-[620px]"}`}>
        {/* end-year labels + slider row */}
        <div className="relative flex items-center gap-2 overflow-visible">
          <span
            className="shrink-0 text-[13px] tabular-nums"
            style={{ fontFamily: '"Instrument Serif", serif', color: "rgb(0,0,0)" }}
          >
            {PORTFOLIO_START_YEAR}
          </span>

          <div className="relative flex-1 overflow-visible px-1">
            <Slider
              value={[timelineIndex]}
              min={0}
              max={TIMELINE_MAX_INDEX}
              step={1}
            className="h-[20px]"
              onValueChange={(value) => {
                startTransition(() => {
                  const nextIndex = Math.max(0, Math.min(TIMELINE_MAX_INDEX, Math.round(value[0] ?? yearToTimelineIndex(PORTFOLIO_PRESENT_YEAR))));
                  setTimelineYear(TIMELINE_YEARS[nextIndex] ?? PORTFOLIO_PRESENT_YEAR);
                });
              }}
            />
            {/* floating year bubble — 2 px below the slider */}
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 transition-opacity duration-300"
              style={{
                left: `${handlePercent}%`,
                top: "calc(100% + 2px)",
                opacity: bubbleVisible ? 1 : 0,
              }}
            >
              <div className="rounded-full border border-black/10 bg-[rgba(250,248,242,0.96)] px-3 py-1 text-[13px] leading-none shadow-[0_6px_16px_rgba(0,0,0,0.10)]" style={{ color: "rgb(0,0,0)" }}>
                <span style={{ fontFamily: '"Instrument Serif", serif' }}>{TIMELINE_YEARS[timelineIndex]}</span>
              </div>
            </div>
          </div>

          <span
            className="shrink-0 text-[13px] tabular-nums"
            style={{ fontFamily: '"Instrument Serif", serif', color: "rgb(0,0,0)" }}
          >
            2100
          </span>
        </div>
      </div>
    </div>
  );
}

export function PortfolioMenuBar() {
  const launchApp = useLaunchApp();
  const currentTheme = useThemeStore((state) => state.current);
  const language = useLanguageStore((state) => state.current);
  const coordinatesLabel = usePortfolioStore((state) => state.coordinatesLabel);
  const timelineVisible = usePortfolioStore((state) => state.timelineVisible);
  const selectedCategories = usePortfolioStore((state) => state.selectedCategories);
  const setSelectedCategories = usePortfolioStore((state) => state.setSelectedCategories);
  const setAllCategories = usePortfolioStore((state) => state.setAllCategories);
  const isCoverVisible = usePortfolioStore((state) => state.isCoverVisible);
  const isEntering = usePortfolioStore((state) => state.isEntering);
  const exposeMode = useAppStoreShallow((s) => s.exposeMode);
  const isPhone = useIsPhone();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const isMacTheme = currentTheme === "macosx";
  const hiddenByCover = isCoverVisible && !isEntering;

  return (
    <div
      className={`fixed left-0 right-0 top-0 transition duration-[1080ms] ease-[cubic-bezier(0.22,0.8,0.18,1)] ${hiddenByCover ? "-translate-y-[140%] opacity-0" : "translate-y-0 opacity-100"} ${exposeMode ? "z-[9997]" : "z-[10002]"}`}
      style={{
        background: isMacTheme ? "rgba(248, 248, 248, 0.85)" : "var(--os-color-menubar-bg)",
        backgroundImage: isMacTheme ? "var(--os-pinstripe-menubar)" : undefined,
        backdropFilter: isMacTheme ? "blur(20px)" : undefined,
        WebkitBackdropFilter: isMacTheme ? "blur(20px)" : undefined,
        boxShadow: isMacTheme ? "0 2px 8px rgba(0, 0, 0, 0.15)" : undefined,
        borderBottom: "var(--os-metrics-border-width) solid var(--os-color-menubar-border)",
        color: "var(--os-color-menubar-text)",
        fontFamily: "var(--os-font-ui)",
        fontSize: "13px",
        transitionDelay: hiddenByCover ? "0ms" : isEntering ? "420ms" : "0ms",
      }}
    >
      <div className="relative flex min-h-[22px] items-stretch px-0">
        <div
          className={`z-10 flex min-w-0 items-stretch ${isPhone ? "flex-1 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" : "shrink-0"}`}
        >
          <button
            type="button"
            onClick={() => launchApp("applet-viewer")}
            className={`sticky left-0 z-20 flex shrink-0 items-center leading-none transition-colors hover:bg-black/8 ${isPhone ? "px-2.5" : "px-3"}`}
            style={{
              color: isMacTheme ? "rgb(0,0,0)" : "var(--os-color-menubar-text)",
              // Keep transparent so sticky doesn't paint a dark block in non-mac themes.
              background: "transparent",
            }}
            aria-label="Apple Menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 384 512"
              fill="currentColor"
              style={{
                width: isPhone ? 13 : 12,
                height: isPhone ? 17 : 16,
                display: "block",
              }}
            >
              <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() =>
              launchApp("finder", {
                initialData: { mode: "browser" },
                multiWindow: true,
              })
            }
            className={`flex items-center font-semibold text-black/90 transition-colors hover:bg-black/8 ${isPhone ? "px-2.5 text-[12px]" : "px-3 text-[13px]"}`}
          >
            Finder
          </button>
          <button
            type="button"
            onClick={() => setAllCategories()}
            className={`flex items-center text-black/78 transition-colors hover:bg-black/8 ${isPhone ? "px-2.5 text-[12px]" : "px-3 text-[13px]"}`}
          >
            all
          </button>
          {PORTFOLIO_CATEGORY_GROUPS.map((group) => {
            const active = categoriesMatchGroup(selectedCategories, group.categories);
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => setSelectedCategories(group.categories)}
                className={`flex items-center transition-colors hover:bg-black/8 ${isPhone ? "px-2.5 text-[12px]" : "px-3 text-[13px]"} ${active ? "font-semibold text-black" : "text-black/78"}`}
              >
                {textForLocale(group.label, language)}
              </button>
            );
          })}
        </div>

        <div className="flex-1" />

        <div className={`z-10 ml-auto flex shrink-0 items-center gap-3 text-[12px] ${isPhone ? "hidden" : ""}`}>
          {!isPhone ? <span className="text-black/58">{coordinatesLabel}</span> : null}
          <span className="text-black/72">{formatClock(now, language === "zh" ? "zh" : "en")}</span>
          <button
            type="button"
            onClick={() => toggleSpotlightSearch()}
            className="flex h-5 w-5 items-center justify-center rounded-full transition hover:bg-black/8"
            aria-label={language === "zh" ? "搜索" : "Search"}
          >
            <MagnifyingGlass className="h-3.5 w-3.5" weight="bold" />
          </button>
        </div>
      </div>

      {isPhone && timelineVisible ? <HeaderTimeline /> : null}
    </div>
  );
}

export { HeaderTimeline };
