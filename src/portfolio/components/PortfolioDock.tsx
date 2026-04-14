import { useEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useLaunchApp } from "@/hooks/useLaunchApp";
import { usePortfolioStore } from "@/portfolio/store";
import { useAppStore } from "@/stores/useAppStore";
import { useLanguageStore } from "@/stores/useLanguageStore";
import { useIsPhone } from "@/hooks/useIsPhone";
import type { LaunchOriginRect } from "@/stores/useAppStore";
import { HeaderTimeline } from "@/portfolio/components/PortfolioMenuBar";

const MAX_SCALE = 2.3;
const DISTANCE = 140;
const BASE_BUTTON_SIZE = 48;

type ClassicDockIconVariant = "globe" | "folder" | "notes" | "timeline" | "photo" | "talk" | "generic";

type ClassicDockIconSpec = {
  variant: ClassicDockIconVariant;
  asset?: string;
  assetScale?: string;
};

type PortfolioDockItem = {
  id: string;
  label: { en: string; zh: string };
  // New portfolio dock entries must use this classic skeuomorphic icon contract.
  icon: ClassicDockIconSpec;
  active?: boolean;
  onClick: (origin?: LaunchOriginRect) => void;
};


function ClassicTimelineGlyph() {
  return (
    <div
      className="pointer-events-none relative flex h-[78%] w-[78%] flex-col overflow-hidden rounded-[18px] border"
      style={{
        borderColor: "rgba(73, 81, 103, 0.55)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(247,249,252,0.98) 20%, rgba(234,238,245,0.98) 100%)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.92), inset 0 -8px 12px rgba(116, 127, 151, 0.16), 0 8px 14px rgba(55, 64, 85, 0.16)",
      }}
    >
      <div
        className="flex h-[28%] items-center justify-center text-[10px] font-semibold uppercase tracking-[0.28em] text-white"
        style={{
          background: "linear-gradient(180deg, #ef8f81 0%, #c54e3f 100%)",
          textShadow: "0 1px 1px rgba(84, 17, 9, 0.35)",
        }}
      >
        Time
      </div>
      <div className="flex flex-1 flex-col items-center justify-center">
        <span className="text-[19px] font-black tracking-[-0.08em] text-[#2c3444]">∞</span>
        <span className="mt-[-2px] text-[8px] uppercase tracking-[0.26em] text-[#7c879b]">Years</span>
      </div>
    </div>
  );
}

function ClassicGlobeGlyph() {
  return (
    <svg
      viewBox="0 0 80 80"
      xmlns="http://www.w3.org/2000/svg"
      className="pointer-events-none select-none"
      style={{ width: "90%", height: "90%", filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.28))" }}
    >
      <defs>
        <radialGradient id="globeOcean" cx="38%" cy="34%" r="62%">
          <stop offset="0%" stopColor="#6ec6f5" />
          <stop offset="45%" stopColor="#2f8fce" />
          <stop offset="100%" stopColor="#0d4f82" />
        </radialGradient>
        <radialGradient id="globeGloss" cx="36%" cy="24%" r="46%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.72)" />
          <stop offset="60%" stopColor="rgba(255,255,255,0.10)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        <radialGradient id="globeShade" cx="72%" cy="76%" r="50%">
          <stop offset="0%" stopColor="rgba(4,28,58,0.38)" />
          <stop offset="100%" stopColor="rgba(4,28,58,0)" />
        </radialGradient>
        <clipPath id="globeCircle">
          <circle cx="40" cy="40" r="36" />
        </clipPath>
      </defs>

      {/* Ocean base */}
      <circle cx="40" cy="40" r="36" fill="url(#globeOcean)" />

      {/* Continents */}
      <g clipPath="url(#globeCircle)" fill="rgba(80,168,62,0.88)" stroke="rgba(40,100,28,0.22)" strokeWidth="0.4">
        {/* North America */}
        <path d="M14,22 Q16,18 21,17 Q26,16 28,20 Q32,23 30,28 Q28,33 24,35 Q19,37 16,33 Q12,29 14,22 Z" />
        {/* South America */}
        <path d="M22,37 Q26,35 28,39 Q30,44 28,50 Q26,56 22,57 Q18,56 17,51 Q16,45 19,40 Z" />
        {/* Europe */}
        <path d="M38,18 Q42,16 45,18 Q48,20 47,24 Q45,27 42,27 Q38,26 37,22 Z" />
        {/* Africa */}
        <path d="M38,28 Q43,27 46,31 Q49,36 47,44 Q45,51 41,53 Q37,53 35,48 Q33,42 34,36 Q35,30 38,28 Z" />
        {/* Asia */}
        <path d="M48,16 Q54,14 60,17 Q66,21 65,28 Q63,34 57,35 Q51,35 47,31 Q44,26 46,21 Z" />
        {/* Australia */}
        <path d="M58,44 Q63,42 66,46 Q68,50 65,54 Q61,57 57,54 Q54,50 56,46 Z" />
      </g>

      {/* Latitude lines */}
      <g clipPath="url(#globeCircle)" stroke="rgba(255,255,255,0.18)" strokeWidth="0.6" fill="none">
        <ellipse cx="40" cy="40" rx="36" ry="10" />
        <ellipse cx="40" cy="40" rx="36" ry="23" />
        <ellipse cx="40" cy="40" rx="36" ry="34" />
      </g>

      {/* Longitude lines */}
      <g clipPath="url(#globeCircle)" stroke="rgba(255,255,255,0.14)" strokeWidth="0.6" fill="none">
        <line x1="40" y1="4" x2="40" y2="76" />
        <path d="M40,4 Q56,40 40,76" />
        <path d="M40,4 Q24,40 40,76" />
        <path d="M40,4 Q66,40 40,76" />
        <path d="M40,4 Q14,40 40,76" />
      </g>

      {/* Shadow overlay */}
      <circle cx="40" cy="40" r="36" fill="url(#globeShade)" />

      {/* Gloss highlight */}
      <circle cx="40" cy="40" r="36" fill="url(#globeGloss)" />

      {/* Rim */}
      <circle cx="40" cy="40" r="35.5" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
    </svg>
  );
}

function ClassicDockFace({ icon }: { icon: ClassicDockIconSpec }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      {icon.variant === "timeline" ? (
        <ClassicTimelineGlyph />
      ) : icon.variant === "globe" ? (
        <ClassicGlobeGlyph />
      ) : icon.asset ? (
        <img
          src={icon.asset}
          alt=""
          className="pointer-events-none select-none object-contain"
          draggable={false}
          style={{
            width: icon.assetScale ?? "82%",
            height: icon.assetScale ?? "82%",
            imageRendering: "-webkit-optimize-contrast",
            filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.30))",
          }}
        />
      ) : null}
    </div>
  );
}

function getFinderMode(initialData: unknown) {
  if (!initialData || typeof initialData !== "object") {
    return { mode: null, projectSlug: null };
  }
  const data = initialData as { mode?: string; projectSlug?: string };
  return {
    mode: data.mode ?? null,
    projectSlug: data.projectSlug ?? null,
  };
}

function DockIcon({
  item,
  mouseX,
  magnifyEnabled,
  isHovered,
  onHover,
  onLeave,
}: {
  item: PortfolioDockItem;
  mouseX: MotionValue<number>;
  magnifyEnabled: boolean;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const targetSize = useMotionValue(BASE_BUTTON_SIZE);
  const distanceCalc = useTransform(mouseX, (value) => {
    const bounds = wrapperRef.current?.getBoundingClientRect();
    if (!bounds || !Number.isFinite(value)) return Infinity;
    return value - (bounds.left + bounds.width / 2);
  });

  useEffect(() => {
    if (!magnifyEnabled) {
      targetSize.set(BASE_BUTTON_SIZE);
    }
  }, [magnifyEnabled, targetSize]);

  useEffect(() => {
    const unsubscribe = distanceCalc.on("change", (distance) => {
      if (!magnifyEnabled || !Number.isFinite(distance)) {
        targetSize.set(BASE_BUTTON_SIZE);
        return;
      }
      const absDistance = Math.abs(distance);
      if (absDistance > DISTANCE) {
        targetSize.set(BASE_BUTTON_SIZE);
        return;
      }
      const t = 1 - absDistance / DISTANCE;
      targetSize.set(BASE_BUTTON_SIZE + t * (Math.round(BASE_BUTTON_SIZE * MAX_SCALE) - BASE_BUTTON_SIZE));
    });

    return () => unsubscribe();
  }, [distanceCalc, magnifyEnabled, targetSize]);

  const size = useSpring(targetSize, {
    mass: 0.15,
    stiffness: 160,
    damping: 18,
  });

  return (
    <motion.div
      ref={wrapperRef}
      layout
      className="relative flex-shrink-0"
      style={{
        width: size,
        height: size,
        marginLeft: 4,
        marginRight: 4,
        transformOrigin: "bottom center",
      }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <AnimatePresence>
        {isHovered ? (
          <motion.div
            initial={{ opacity: 0, y: 8, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 5, x: "-50%" }}
            className="pointer-events-none absolute bottom-full left-1/2 mb-3 whitespace-nowrap rounded-full bg-neutral-800 px-3 py-1 text-sm font-medium text-white/90 shadow-xl"
          >
          {item.label.en}
            <div
              className="absolute left-1/2 top-full h-[5px] w-[10px] -translate-x-1/2 bg-neutral-800"
              style={{ clipPath: "polygon(50% 100%, 0% 0%, 100% 0%)" }}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <button
        type="button"
        aria-label={item.label.en}
        className="relative flex h-full w-full items-end justify-center"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          item.onClick({
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height,
          });
        }}
      >
        <ClassicDockFace icon={item.icon} />
        {item.active ? (
          <span
            aria-hidden
            className="absolute"
            style={{
              bottom: -3,
              width: 0,
              height: 0,
              borderLeft: "4px solid transparent",
              borderRight: "4px solid transparent",
              borderBottom: "4px solid #000",
            }}
          />
        ) : null}
      </button>
    </motion.div>
  );
}

export function PortfolioDock() {
  const launchApp = useLaunchApp();
  const language = useLanguageStore((state) => state.current);
  const instances = useAppStore((state) => state.instances);
  const requestWorldReset = usePortfolioStore((state) => state.requestWorldReset);
  const timelineVisible = usePortfolioStore((state) => state.timelineVisible);
  const toggleTimelineVisible = usePortfolioStore((state) => state.toggleTimelineVisible);
  const isCoverVisible = usePortfolioStore((state) => state.isCoverVisible);
  const isEntering = usePortfolioStore((state) => state.isEntering);
  const mouseX = useMotionValue(Infinity);
  const isPhone = useIsPhone();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const hiddenByCover = isCoverVisible && !isEntering;
  const dockRef = useRef<HTMLDivElement | null>(null);
  const [dockWidth, setDockWidth] = useState<number | null>(null);

  useEffect(() => {
    const el = dockRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setDockWidth(el.offsetWidth);
    });
    observer.observe(el);
    setDockWidth(el.offsetWidth);
    return () => observer.disconnect();
  }, []);

  const finderInstances = useMemo(
    () =>
      Object.values(instances)
        .filter((instance) => instance.appId === "finder" && instance.isOpen)
        .map((instance) => getFinderMode(instance.initialData)),
    [instances],
  );

  const isProjectsActive = finderInstances.some(
    (instance) => instance.mode === "browser" || (instance.mode === "project" && instance.projectSlug !== "photography"),
  );
  const isPhotographyActive = finderInstances.some(
    (instance) => instance.mode === "project" && instance.projectSlug === "photography",
  );
  const openAppIds = new Set(
    Object.values(instances)
      .filter((instance) => instance.isOpen)
      .map((instance) => instance.appId),
  );

  const items: PortfolioDockItem[] = [
    {
      id: "world",
      label: { en: "World", zh: "地球" },
      icon: {
        variant: "globe",
      },
      onClick: () => requestWorldReset(),
    },
    {
      id: "projects",
      label: { en: "Projects", zh: "项目" },
      icon: {
        variant: "folder",
        asset: "/icons/macosx/folder.png",
        assetScale: "84%",
      },
      active: isProjectsActive,
      onClick: (launchOrigin) =>
        launchApp("finder", {
          initialData: { mode: "browser" },
          multiWindow: true,
          launchOrigin,
        }),
    },
    {
      id: "notes",
      label: { en: "Notes", zh: "笔记" },
      icon: {
        variant: "notes",
        asset: "/icons/macosx/stickies.png",
        assetScale: "80%",
      },
      active: openAppIds.has("stickies"),
      onClick: (launchOrigin) =>
        launchApp("stickies", {
          launchOrigin,
        }),
    },
    {
      id: "timeline",
      label: { en: "Timeline", zh: "时间轴" },
      icon: {
        variant: "timeline",
      },
      active: timelineVisible,
      onClick: () => toggleTimelineVisible(),
    },
    {
      id: "photography",
      label: { en: "Photography", zh: "摄影" },
      icon: {
        variant: "photo",
        asset: "/icons/macosx/photo-booth.png",
        assetScale: "82%",
      },
      active: isPhotographyActive,
      onClick: (launchOrigin) =>
        launchApp("finder", {
          initialData: { mode: "project", projectSlug: "photography" },
          multiWindow: true,
          launchOrigin,
        }),
    },
    {
      id: "talk",
      label: { en: "Talk to JL", zh: "和我聊聊" },
      icon: {
        variant: "talk",
        asset: "/icons/macosx/contacts.png",
        assetScale: "80%",
      },
      active: openAppIds.has("chats"),
      onClick: (launchOrigin) =>
        launchApp("chats", {
          launchOrigin,
        }),
    },
  ];

  return (
    <div
      className={`fixed inset-x-0 z-[9000] transition duration-[1180ms] ease-[cubic-bezier(0.22,0.8,0.18,1)] ${hiddenByCover ? "pointer-events-none translate-y-[160%] opacity-0" : "pointer-events-none translate-y-0 opacity-100"}`}
      style={{
        bottom: 0,
        transitionDelay: hiddenByCover ? "0ms" : isEntering ? "560ms" : "0ms",
      }}
    >
      <div
        className="flex w-full flex-col items-center"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {/* Timeline above dock */}
        {!isPhone && timelineVisible ? (
          <div
            className="pointer-events-auto mb-1"
            style={{ width: dockWidth ?? undefined }}
          >
            <HeaderTimeline />
          </div>
        ) : null}

        <motion.div
          ref={dockRef}
          className="inline-flex items-end"
          initial={false}
          onMouseLeave={() => {
            if (!isPhone) {
              mouseX.set(Infinity);
              setHoveredId(null);
            }
          }}
          onMouseMove={(event) => {
            if (!isPhone) {
              mouseX.set(event.clientX);
            }
          }}
          style={{
            pointerEvents: "auto",
            background: "rgba(248, 248, 248, 0.75)",
            backgroundImage: "var(--os-pinstripe-menubar)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
            height: 64,
            padding: "6px 4px 4px",
            maxWidth: "min(92vw, 720px)",
            borderRadius: 0,
          }}
        >
          {items.map((item) => (
            <DockIcon
              key={item.id}
              item={{
                ...item,
                label: language === "zh" ? { en: item.label.zh, zh: item.label.zh } : item.label,
              }}
              mouseX={mouseX}
              magnifyEnabled={!isPhone}
              isHovered={hoveredId === item.id && !isPhone}
              onHover={() => setHoveredId(item.id)}
              onLeave={() => setHoveredId((current) => (current === item.id ? null : current))}
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
}
