import {
  type ComponentType,
  type CSSProperties,
  type MutableRefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "framer-motion";
import {
  DeviceMobile,
  EnvelopeSimple,
  GithubLogo,
  InstagramLogo,
  LinkedinLogo,
  XLogo,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { coverLinks } from "@/content/generated/portfolio-data";
import { usePortfolioStore } from "@/portfolio/store";
import { useLanguageStore } from "@/stores/useLanguageStore";
import { useIsMobile } from "@/hooks/useIsMobile";

const VERBS = [
  "handmake",
  "brainstorm",
  "craft",
  "make",
  "rethink",
  "build",
  "design",
  "refine",
  "vibe",
  "explore",
  "iterate",
];

const ADJECTIVES = [
  "meaningful",
  "users need",
  "intuitive",
  "humane",
  "thoughtful",
  "wonderful",
  "different",
  "simple",
  "delightful",
  "alive",
  "lasting",
];

const COVER_BACKGROUND = "#f7f4ef";

// Products being built — each is underlined and navigates to its project page
const BUILDING_PRODUCTS: { slug: string; label: string }[] = [
  { slug: "dinder", label: "dinder" },
];

const VERB_INITIAL_INDEX = VERBS.indexOf("build");
const ADJECTIVE_INITIAL_INDEX = ADJECTIVES.indexOf("wonderful");
const IDLE_SPIN_INTERVAL_MS = 3000;
const BURST_SPIN_INTERVAL_MS = 82;
const STOP_BEFORE_ENTER_MS = 1000;
const REEL_REPEAT_COUNT = 200;
const OPACITY_BY_DISTANCE = [1, 0.66, 0.46, 0.24, 0.10, 0.03];
const VERB_BASE_POSITION = VERBS.length * Math.floor(REEL_REPEAT_COUNT / 2) + VERB_INITIAL_INDEX;
const ADJECTIVE_BASE_POSITION = ADJECTIVES.length * Math.floor(REEL_REPEAT_COUNT / 2) + ADJECTIVE_INITIAL_INDEX;

type SocialIconProps = {
  className?: string;
  style?: CSSProperties;
  weight?: "regular" | "bold" | "fill";
};

type SocialLink = {
  key: string;
  label: string;
  href: string;
  icon: ComponentType<SocialIconProps>;
  onClick?: () => Promise<void> | void;
};

type CoverTokenSet = {
  socialLeft: number;
  socialTop: number;
  socialFontSize: string;
  socialIconSize: number;
  socialGapX: number;
  socialGapY: number;
  identityLeft: number;
  identityFontSize: string;
  identityLineHeight: string;
  underlineOffset: number;
  ctaLeft: number;
  ctaBottom: number;
  ctaFontSize: string;
  localeFontSize: string;
  elevatedTextShadow: string;
  stagePaddingLeft: number;
  stagePaddingRight: number;
  stageGap: number;
  stageRight: number;
  stageTop: string;
  reelWidth: number;
  reelHeight: number;
  reelWordSize: string;
  reelWordWeight: number;
  reelRowPitch: number;
  centerWordSize: string;
  centerWordWeight: number;
  leverRight: number;
  edgeFadeHeight: number;
};

const LONGEST_REEL_LABEL = [...VERBS, ...ADJECTIVES].reduce((longest, word) =>
  word.length > longest.length ? word : longest,
);

const DESKTOP_TOKENS: CoverTokenSet = {
  socialLeft: 68,
  socialTop: 42,
  socialFontSize: "16px",
  socialIconSize: 16,
  socialGapX: 20,
  socialGapY: 10,
  identityLeft: 68,
  identityFontSize: "clamp(22px, 1.92vw, 28px)",
  identityLineHeight: "1.3",
  underlineOffset: 4,
  ctaLeft: 68,
  ctaBottom: 42,
  ctaFontSize: "clamp(22px, 1.92vw, 28px)",
  localeFontSize: "14px",
  elevatedTextShadow: "0 1px 0 rgba(255,255,255,0.96), 0 8px 24px rgba(0,0,0,0.14)",
  stagePaddingLeft: 0,
  stagePaddingRight: 0,
  stageGap: 16,
  stageRight: 0,
  stageTop: "50%",
  reelWidth: Math.max(300, LONGEST_REEL_LABEL.length * 26),
  reelHeight: 860,
  reelWordSize: "clamp(43px, 3.42vw, 62px)",
  reelWordWeight: 400,
  reelRowPitch: 94,
  centerWordSize: "clamp(53px, 3.9vw, 77px)",
  centerWordWeight: 400,
  leverRight: 68,
  edgeFadeHeight: 140,
};

const MOBILE_TOKENS: CoverTokenSet = {
  socialLeft: 24,
  socialTop: 24,
  socialFontSize: "13px",
  socialIconSize: 14,
  socialGapX: 14,
  socialGapY: 8,
  identityLeft: 24,
  identityFontSize: "clamp(16px, 4.4vw, 21px)",
  identityLineHeight: "1.28",
  underlineOffset: 3,
  ctaLeft: 24,
  ctaBottom: 24,
  ctaFontSize: "clamp(16px, 4.4vw, 21px)",
  localeFontSize: "13px",
  elevatedTextShadow: "0 1px 0 rgba(255,255,255,0.94), 0 5px 14px rgba(0,0,0,0.12)",
  stagePaddingLeft: 0,
  stagePaddingRight: 0,
  stageGap: 10,
  stageRight: 0,
  stageTop: "52%",
  reelWidth: Math.max(190, LONGEST_REEL_LABEL.length * 17),
  reelHeight: 220,
  reelWordSize: "clamp(41px, 8.9vw, 58px)",
  reelWordWeight: 400,
  reelRowPitch: 70,
  centerWordSize: "clamp(46px, 9.5vw, 65px)",
  centerWordWeight: 400,
  leverRight: 10,
  edgeFadeHeight: 52,
};

function normalizeExternalHref(href: string) {
  if (/^(mailto:|https?:\/\/)/i.test(href)) {
    return href;
  }
  return `https://${href}`;
}

function clearWindowTimer(timerRef: MutableRefObject<number | null>) {
  if (timerRef.current !== null) {
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }
}

function onTextAction(event: React.KeyboardEvent<HTMLElement>, action: () => void) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    action();
  }
}

function getForwardTarget(current: number, length: number, targetIndex: number) {
  let next = Math.floor(current / length) * length + targetIndex;
  if (next <= current) {
    next += length;
  }
  return next;
}

function getBackwardTarget(current: number, length: number, targetIndex: number) {
  let next = Math.ceil(current / length) * length + targetIndex;
  if (next >= current) {
    next -= length;
  }
  return next;
}

function ScrollingColumn({
  words,
  position,
  entering,
  bursting,
  direction,
  tokens,
}: {
  words: string[];
  position: number;
  entering: boolean;
  bursting: boolean;
  direction: "left" | "right";
  tokens: CoverTokenSet;
}) {
  const repeatedWords = useMemo(
    () => Array.from({ length: words.length * REEL_REPEAT_COUNT }, (_, index) => words[index % words.length] ?? ""),
    [words],
  );
  const centerOffset = tokens.reelHeight / 2 - tokens.reelRowPitch / 2;

  return (
    <motion.div
      animate={{
        scale: entering ? 1.18 : 1,
        x: entering ? (direction === "left" ? -118 : 118) : 0,
        y: entering ? -12 : 0,
        rotate: entering ? (direction === "left" ? -4 : 4) : 0,
        opacity: entering ? 0 : 1,
        filter: entering ? "blur(18px)" : "blur(0px)",
      }}
      transition={{ duration: 0.96, ease: [0.18, 0.82, 0.16, 1] }}
      className="relative"
      style={{
        height: tokens.reelHeight,
        width: tokens.reelWidth,
        WebkitMaskImage: `linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.24) 8%, rgba(0,0,0,0.88) 18%, rgba(0,0,0,1) 30%, rgba(0,0,0,1) 70%, rgba(0,0,0,0.88) 82%, rgba(0,0,0,0.24) 92%, transparent 100%)`,
        maskImage: `linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.24) 8%, rgba(0,0,0,0.88) 18%, rgba(0,0,0,1) 30%, rgba(0,0,0,1) 70%, rgba(0,0,0,0.88) 82%, rgba(0,0,0,0.24) 92%, transparent 100%)`,
      }}
    >
      <motion.div
        initial={false}
        animate={{ y: centerOffset - position * tokens.reelRowPitch }}
        transition={{
          duration: bursting ? 0.16 : 0.72,
          ease: bursting ? [0.26, 0.92, 0.3, 1] : [0.22, 0.61, 0.36, 1],
        }}
        className="absolute left-0 top-0 w-full"
      >
        {repeatedWords.map((word, index) => {
          const distance = Math.min(Math.abs(index - position), OPACITY_BY_DISTANCE.length - 1);
          const isCenter = index === position;

          return (
            <div
              key={`${word}-${index}`}
              className="flex items-center justify-center"
              style={{ height: tokens.reelRowPitch }}
            >
              <div
                className="cover-reel-word select-none whitespace-nowrap leading-[0.88]"
                style={{
                  fontFamily: '"Instrument Serif", serif',
                  fontWeight: tokens.reelWordWeight,
                  fontSize: tokens.reelWordSize,
                  opacity: OPACITY_BY_DISTANCE[distance],
                  transform: `scale(${isCenter ? 1 : 0.975})`,
                  color: isCenter ? "rgba(17, 17, 18, 0.98)" : "rgba(42, 42, 44, 0.9)",
                  filter: distance >= 4 ? "blur(0.5px)" : "none",
                  transition: bursting ? "none" : "opacity 0.28s ease, transform 0.28s ease, color 0.28s ease",
                }}
              >
                {word}
              </div>
            </div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}

function LeverControl({
  pulling,
  onActivate,
}: {
  pulling: boolean;
  onActivate: () => void;
}) {
  const leverTravel = 180;
  const activationThreshold = 120;
  const handleY = useMotionValue(0);
  // Pivot stays on track center (no horizontal shift); only rotate and lift the knob
  const leverTilt = useTransform(handleY, [0, leverTravel], [-45, 45]);
  const knobLift = useTransform(handleY, [0, leverTravel], [0, -4]);

  useEffect(() => {
    const controls = animate(handleY, pulling ? leverTravel : 0, {
      duration: pulling ? 0.18 : 0.34,
      ease: pulling ? [0.34, 1.56, 0.64, 1] : [0.22, 0.8, 0.18, 1],
    });
    return () => controls.stop();
  }, [handleY, pulling]);

  return (
    <div className="pointer-events-auto relative flex h-[308px] w-[140px] shrink-0 items-center justify-center">
      {/* Track — center at x=54px */}
      <div className="absolute left-[34px] top-[24px] h-[236px] w-[40px] rounded-[24px] border border-[rgba(124,111,94,0.24)] bg-[linear-gradient(180deg,rgba(246,241,233,0.98),rgba(221,211,194,0.94))] shadow-[inset_0_2px_1px_rgba(255,255,255,0.95),inset_0_-3px_8px_rgba(168,153,129,0.22),0_18px_42px_rgba(0,0,0,0.12)]">
        <div className="absolute inset-y-[20px] left-1/2 w-[9px] -translate-x-1/2 rounded-full bg-[linear-gradient(180deg,rgba(177,166,148,0.52),rgba(255,255,255,0.34))] shadow-[inset_0_2px_6px_rgba(0,0,0,0.12)]" />
      </div>
      {/* Lever arm — pivot at x=8px from arm left = x=54px in container = track center */}
      <motion.button
        type="button"
        aria-label="Enter JL OS"
        className="absolute left-[46px] top-[34px] z-10 h-[12px] w-[80px] cursor-grab rounded-full border border-[rgba(124,111,94,0.24)] bg-[linear-gradient(90deg,rgba(193,178,155,0.82),rgba(238,228,214,0.95))] shadow-[inset_0_1px_0_rgba(255,255,255,0.88),0_4px_12px_rgba(0,0,0,0.15)] active:cursor-grabbing"
        style={{
          y: handleY,
          rotate: leverTilt,
          transformOrigin: "8px 50%",
        }}
        whileTap={{ scale: 0.98 }}
        drag={pulling ? false : "y"}
        dragMomentum={false}
        dragElastic={0}
        dragConstraints={{ top: 0, bottom: leverTravel }}
        onDragEnd={() => {
          if (pulling) return;
          if (handleY.get() >= activationThreshold) {
            onActivate();
            return;
          }
          animate(handleY, 0, { duration: 0.28, ease: [0.22, 0.8, 0.18, 1] });
        }}
        onClick={() => {
          if (!pulling) onActivate();
        }}
      >
        <div className="relative h-full w-full overflow-visible">
          <motion.div
            className="absolute right-[-16px] top-1/2 flex h-[38px] w-[38px] -translate-y-1/2 items-center justify-center rounded-full border border-[rgba(124,111,94,0.24)] bg-[radial-gradient(circle_at_34%_28%,rgba(255,255,255,0.98),rgba(238,228,214,0.94)_56%,rgba(193,178,155,0.92)_100%)] shadow-[inset_0_2px_1px_rgba(255,255,255,0.94),0_12px_18px_rgba(0,0,0,0.18)]"
            style={{ y: knobLift }}
          />
        </div>
      </motion.button>
    </div>
  );
}

export function CoverPage() {
  const language = useLanguageStore((state) => state.current);
  const setLanguage = useLanguageStore((state) => state.setLanguage);
  const isMobile = useIsMobile(1320);
  const isCoverVisible = usePortfolioStore((state) => state.isCoverVisible);
  const isEntering = usePortfolioStore((state) => state.isEntering);
  const beginEnterTransition = usePortfolioStore((state) => state.beginEnterTransition);
  const queueProjectOpen = usePortfolioStore((state) => state.queueProjectOpen);
  const visitorLocation = usePortfolioStore((state) => state.visitorLocation);
  const tokens = isMobile ? MOBILE_TOKENS : DESKTOP_TOKENS;

  const [cityName, setCityName] = useState("new york");

  // Request geolocation as soon as the cover mounts so city resolves before the user interacts
  useEffect(() => {
    const store = usePortfolioStore.getState();
    if (store.geolocationRequested || !navigator.geolocation) return;
    store.markGeolocationRequested();
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        usePortfolioStore.getState().setVisitorLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {},
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  }, []);

  useEffect(() => {
    if (!visitorLocation) {
      setCityName("new york");
      return;
    }
    const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined;
    if (!token) return;
    const { lat, lng } = visitorLocation;
    fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=place&access_token=${token}`,
    )
      .then((r) => r.json())
      .then((data: { features?: { text?: string }[] }) => {
        const name = data?.features?.[0]?.text;
        if (name) setCityName(name.toLowerCase());
      })
      .catch(() => {/* keep default */});
  }, [visitorLocation]);

  const [resumeOpen, setResumeOpen] = useState(false);
  const [verbPosition, setVerbPosition] = useState(VERB_BASE_POSITION);
  const [adjectivePosition, setAdjectivePosition] = useState(ADJECTIVE_BASE_POSITION);
  const [isBursting, setIsBursting] = useState(false);
  const idleSpinTimerRef = useRef<number | null>(null);
  const burstSpinTimerRef = useRef<number | null>(null);
  const enterDelayRef = useRef<number | null>(null);

  const resetSelection = useCallback(() => {
    clearWindowTimer(idleSpinTimerRef);
    clearWindowTimer(burstSpinTimerRef);
    clearWindowTimer(enterDelayRef);
    setVerbPosition(VERB_BASE_POSITION);
    setAdjectivePosition(ADJECTIVE_BASE_POSITION);
    setResumeOpen(false);
    setIsBursting(false);
  }, []);

  useEffect(() => {
    if (isCoverVisible) {
      resetSelection();
    }
  }, [isCoverVisible, resetSelection]);

  useEffect(
    () => () => {
      clearWindowTimer(idleSpinTimerRef);
      clearWindowTimer(burstSpinTimerRef);
      clearWindowTimer(enterDelayRef);
    },
    [],
  );

  useEffect(() => {
    if (!isCoverVisible || isEntering || isBursting) return;

    idleSpinTimerRef.current = window.setInterval(() => {
      setVerbPosition((current) => current + 1);
      setAdjectivePosition((current) => current - 1);
    }, IDLE_SPIN_INTERVAL_MS);

    return () => clearWindowTimer(idleSpinTimerRef);
  }, [isBursting, isCoverVisible, isEntering]);

  const triggerLeverSequence = useCallback(
    (projectSlug?: string) => {
      if (isEntering || isBursting) return;

      if (projectSlug) {
        queueProjectOpen(projectSlug);
      }

      clearWindowTimer(idleSpinTimerRef);
      clearWindowTimer(burstSpinTimerRef);
      clearWindowTimer(enterDelayRef);
      setIsBursting(true);

      const burstSteps = 14 + Math.floor(Math.random() * 8);
      let spinCount = 0;

      burstSpinTimerRef.current = window.setInterval(() => {
        spinCount += 1;
        setVerbPosition((current) => current + 1);
        setAdjectivePosition((current) => current - 1);

        if (spinCount >= burstSteps) {
          clearWindowTimer(burstSpinTimerRef);
          const randomVerbIndex = Math.floor(Math.random() * VERBS.length);
          const randomAdjectiveIndex = Math.floor(Math.random() * ADJECTIVES.length);
          setVerbPosition((current) => getForwardTarget(current, VERBS.length, randomVerbIndex));
          setAdjectivePosition((current) => getBackwardTarget(current, ADJECTIVES.length, randomAdjectiveIndex));
          enterDelayRef.current = window.setTimeout(() => {
            beginEnterTransition();
          }, STOP_BEFORE_ENTER_MS);
        }
      }, BURST_SPIN_INTERVAL_MS);
    },
    [beginEnterTransition, isBursting, isEntering, queueProjectOpen],
  );

  const infoLinks = useMemo<SocialLink[]>(
    () => [
      {
        key: "instagram",
        label: "ig",
        href: normalizeExternalHref(coverLinks.instagram),
        icon: InstagramLogo,
      },
      {
        key: "email",
        label: "email",
        href: `mailto:${coverLinks.email}`,
        icon: EnvelopeSimple,
        onClick: async () => {
          try {
            await navigator.clipboard.writeText(coverLinks.email);
            toast("Email copied");
          } catch {
            toast("Email ready");
          }
        },
      },
      {
        key: "xiaohongshu",
        label: "xiaohongshu",
        href: normalizeExternalHref(coverLinks.xiaohongshu),
        icon: DeviceMobile,
      },
      {
        key: "x",
        label: "x",
        href: normalizeExternalHref(coverLinks.x),
        icon: XLogo,
      },
      {
        key: "github",
        label: "github",
        href: normalizeExternalHref(coverLinks.github),
        icon: GithubLogo,
      },
      {
        key: "linkedin",
        label: "linkedin",
        href: normalizeExternalHref(coverLinks.linkedin),
        icon: LinkedinLogo,
      },
    ],
    [],
  );

  if (!isCoverVisible) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1, backgroundColor: COVER_BACKGROUND }}
        animate={{
          backgroundColor: isEntering ? "rgba(10,14,24,1)" : COVER_BACKGROUND,
          opacity: isEntering ? 0 : 1,
        }}
        exit={{ opacity: 0 }}
        transition={{
          backgroundColor: { duration: 0.8, ease: [0.18, 0.82, 0.16, 1] },
          opacity: { duration: 0.58, ease: "easeInOut", delay: isEntering ? 0.56 : 0 },
        }}
        className={`cover-force-font fixed inset-0 z-[10080] overflow-hidden ${isEntering ? "pointer-events-none" : "pointer-events-auto"}`}
        style={
          {
            "--cover-social-size": tokens.socialFontSize,
            "--cover-identity-size": tokens.identityFontSize,
            "--cover-cta-size": tokens.ctaFontSize,
            "--cover-locale-size": tokens.localeFontSize,
            "--cover-reel-size": tokens.reelWordSize,
            "--cover-center-size": tokens.centerWordSize,
            "--cover-left-shadow": tokens.elevatedTextShadow,
          } as CSSProperties
        }
      >
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent_42%)]" />

        <motion.div
          className="relative h-full w-full"
          animate={{
            scale: isEntering ? 1.04 : 1,
            filter: isEntering ? "blur(3px)" : "blur(0px)",
          }}
          transition={{ duration: 0.9, ease: [0.18, 0.82, 0.16, 1] }}
        >
          <motion.div
            animate={{
              opacity: isEntering ? 0 : 1,
              y: isEntering ? -16 : 0,
              x: isEntering ? -24 : 0,
              filter: isEntering ? "blur(8px)" : "blur(0px)",
            }}
            transition={{ duration: 0.48, ease: "easeOut" }}
            className="absolute z-10"
            style={{
              left: tokens.socialLeft,
              top: tokens.socialTop,
              display: isMobile ? "none" : undefined,
              textShadow: tokens.elevatedTextShadow,
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="cover-social-grid grid grid-cols-3 tracking-[0.01em] text-black/68"
              style={{
                gap: `${tokens.socialGapY}px ${tokens.socialGapX}px`,
                fontSize: tokens.socialFontSize,
              }}
            >
              {infoLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <a
                    key={link.key}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    onClick={async (event) => {
                      event.stopPropagation();
                      await link.onClick?.();
                    }}
                    className="inline-flex items-center gap-1.5 whitespace-nowrap transition hover:text-black"
                  >
                    <Icon weight="regular" style={{ width: tokens.socialIconSize, height: tokens.socialIconSize }} />
                    <span>{link.label}</span>
                  </a>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            animate={{
              opacity: isEntering ? 0 : 1,
              y: isEntering ? -6 : 0,
              x: isEntering ? -34 : 0,
              scale: isEntering ? 1.08 : 1,
              filter: isEntering ? "blur(8px)" : "blur(0px)",
            }}
            transition={{ duration: 0.56, ease: "easeOut" }}
            className={isMobile ? "absolute top-10 z-10" : "absolute top-1/2 z-10 -translate-y-1/2"}
            style={{ left: tokens.identityLeft, textShadow: tokens.elevatedTextShadow }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="cover-identity-block space-y-[2px] text-black/92"
              style={{
                fontFamily: '"Instrument Serif", serif',
                fontSize: tokens.identityFontSize,
                lineHeight: tokens.identityLineHeight,
              }}
            >
              <div className="cover-identity-text">Jiahao Li</div>
              <div
                role="button"
                tabIndex={0}
                className="cover-identity-text cursor-pointer"
                onClick={(event) => {
                  event.stopPropagation();
                  triggerLeverSequence();
                }}
                onKeyDown={(event) => onTextAction(event, () => triggerLeverSequence())}
              >
                is currently in{" "}
                <span
                  className="underline decoration-[0.8px]"
                  style={{ textUnderlineOffset: `${tokens.underlineOffset}px` }}
                >
                  {cityName}
                </span>
              </div>
              <div className="cover-identity-text">
                is building{" "}
                {BUILDING_PRODUCTS.map((product, index) => (
                  <span key={product.slug}>
                    {index > 0 ? ", " : ""}
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(event) => {
                        event.stopPropagation();
                        triggerLeverSequence(product.slug);
                      }}
                      onKeyDown={(event) => onTextAction(event, () => triggerLeverSequence(product.slug))}
                      className="cursor-pointer underline decoration-[0.8px]"
                      style={{ textUnderlineOffset: `${tokens.underlineOffset}px` }}
                    >
                      {product.label}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div
            animate={{
              opacity: isEntering ? 0 : 1,
              y: isEntering ? 20 : 0,
              x: isEntering ? -18 : 0,
              filter: isEntering ? "blur(8px)" : "blur(0px)",
            }}
            transition={{ duration: 0.48, ease: "easeOut" }}
            className="absolute z-10"
            style={{
              left: tokens.ctaLeft,
              bottom: tokens.ctaBottom,
              textShadow: tokens.elevatedTextShadow,
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="space-y-3">
              {isMobile ? (
                <div
                  className="cover-social-grid grid grid-cols-3 tracking-[0.01em] text-black/68"
                  style={{ gap: `${tokens.socialGapY}px ${tokens.socialGapX}px`, fontSize: tokens.socialFontSize }}
                >
                  {infoLinks.map((link) => {
                    const Icon = link.icon;
                    return (
                      <a
                        key={link.key}
                        href={link.href}
                        target="_blank"
                        rel="noreferrer"
                        onClick={async (event) => { event.stopPropagation(); await link.onClick?.(); }}
                        className="inline-flex items-center gap-1.5 whitespace-nowrap transition hover:text-black"
                      >
                        <Icon weight="regular" style={{ width: tokens.socialIconSize, height: tokens.socialIconSize }} />
                        <span>{link.label}</span>
                      </a>
                    );
                  })}
                </div>
              ) : null}
              <span
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation();
                  setResumeOpen(true);
                }}
                onKeyDown={(event) => onTextAction(event, () => setResumeOpen(true))}
                className="cover-cta-link block cursor-pointer text-black/92 underline decoration-[0.8px]"
                style={{
                  fontFamily: '"Instrument Serif", serif',
                  fontSize: tokens.ctaFontSize,
                  textUnderlineOffset: `${tokens.underlineOffset}px`,
                }}
              >
                see resume
              </span>
              <div className="cover-locale-row flex items-center gap-4 text-black/72" style={{ fontSize: tokens.localeFontSize }}>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    void setLanguage("en");
                  }}
                  className={language === "en" ? "text-black" : "text-black/42"}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    void setLanguage("zh");
                  }}
                  className={language === "zh" ? "text-black" : "text-black/42"}
                >
                  中
                </button>
              </div>
            </div>
          </motion.div>

          <motion.div
            animate={{
              scale: isEntering ? 1.2 : 1,
              opacity: isEntering ? 0 : 1,
              y: isEntering ? -8 : 0,
              filter: isEntering ? "blur(14px)" : "blur(0px)",
            }}
            transition={{ duration: 0.98, ease: [0.16, 0.84, 0.16, 1] }}
            className="absolute inset-0 z-0 flex items-center justify-center"
          >
            {/* Mobile & medium screens: vertical stack + lever beside it */}
            {isMobile ? (
              <div className="flex items-center gap-5">
                <div className="flex flex-col items-center" style={{ gap: tokens.stageGap }}>
                  <ScrollingColumn
                    words={VERBS}
                    position={verbPosition}
                    entering={isEntering}
                    bursting={isBursting}
                    direction="left"
                    tokens={tokens}
                  />
                  <motion.div
                    animate={{
                      scale: isEntering ? 1.28 : 1,
                      opacity: isEntering ? 0 : 1,
                      y: isEntering ? -6 : 0,
                      filter: isEntering ? "blur(14px)" : "blur(0px)",
                    }}
                    transition={{ duration: 0.94, ease: [0.16, 0.84, 0.16, 1] }}
                    className="cover-center-word select-none text-center leading-none text-black"
                    style={{
                      fontFamily: '"Instrument Serif", serif',
                      fontWeight: tokens.centerWordWeight,
                      fontSize: tokens.centerWordSize,
                    }}
                  >
                    something
                  </motion.div>
                  <ScrollingColumn
                    words={ADJECTIVES}
                    position={adjectivePosition}
                    entering={isEntering}
                    bursting={isBursting}
                    direction="right"
                    tokens={tokens}
                  />
                </div>
                <motion.div
                  animate={{
                    opacity: isEntering ? 0 : 1,
                    x: isEntering ? 22 : 0,
                    y: isEntering ? 10 : 0,
                    rotate: isEntering ? 8 : 0,
                    filter: isEntering ? "blur(10px)" : "blur(0px)",
                  }}
                  transition={{ duration: 0.52, ease: [0.22, 0.8, 0.18, 1] }}
                >
                  <LeverControl pulling={isBursting || isEntering} onActivate={() => triggerLeverSequence()} />
                </motion.div>
              </div>
            ) : (
              <>
                {/* Desktop: reel centered in the viewport */}
                <div
                  className="absolute left-1/2"
                  style={{
                    top: tokens.stageTop,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <div className="flex items-center justify-center" style={{ gap: tokens.stageGap }}>
                    <ScrollingColumn
                      words={VERBS}
                      position={verbPosition}
                      entering={isEntering}
                      bursting={isBursting}
                      direction="left"
                      tokens={tokens}
                    />
                    <motion.div
                      animate={{
                        scale: isEntering ? 1.24 : 1,
                        opacity: isEntering ? 0 : 1,
                        y: isEntering ? -4 : 0,
                        filter: isEntering ? "blur(14px)" : "blur(0px)",
                      }}
                      transition={{ duration: 0.94, ease: [0.16, 0.84, 0.16, 1] }}
                      className="cover-center-word select-none text-center leading-none text-black"
                      style={{
                        fontFamily: '"Instrument Serif", serif',
                        fontWeight: tokens.centerWordWeight,
                        fontSize: tokens.centerWordSize,
                        marginLeft: 8,
                        marginRight: 8,
                      }}
                    >
                      something
                    </motion.div>
                    <ScrollingColumn
                      words={ADJECTIVES}
                      position={adjectivePosition}
                      entering={isEntering}
                      bursting={isBursting}
                      direction="right"
                      tokens={tokens}
                    />
                  </div>
                </div>
                {/* Lever — right-aligned, symmetric with the identity block (both 68px from edges) */}
                <motion.div
                  className="absolute top-1/2 -translate-y-1/2"
                  animate={{
                    opacity: isEntering ? 0 : 1,
                    x: isEntering ? 22 : 0,
                    y: isEntering ? 10 : 0,
                    rotate: isEntering ? 8 : 0,
                    filter: isEntering ? "blur(10px)" : "blur(0px)",
                  }}
                  transition={{ duration: 0.52, ease: [0.22, 0.8, 0.18, 1] }}
                  style={{ right: `${tokens.leverRight}px` }}
                >
                  <LeverControl pulling={isBursting || isEntering} onActivate={() => triggerLeverSequence()} />
                </motion.div>
              </>
            )}
          </motion.div>
        </motion.div>

        <AnimatePresence>
          {resumeOpen ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[10090] flex items-center justify-center bg-black/20 px-4"
              onClick={() => setResumeOpen(false)}
            >
              <motion.div
                initial={{ y: 12, opacity: 0, scale: 0.98 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 8, opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-[360px] rounded-[24px] border border-black/10 bg-white p-5 shadow-[0_24px_80px_rgba(0,0,0,0.24)]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="text-[11px] uppercase tracking-[0.18em] text-black/40">resume</div>
                <h3
                  className="mt-2 text-[32px] leading-none text-black"
                  style={{ fontFamily: '"Instrument Serif", serif' }}
                >
                  Coming soon
                </h3>
                <p className="mt-4 text-[14px] leading-7 text-black/65">
                  {language === "zh"
                    ? "简历会在后续版本补上。当前可以先通过项目窗口和 Talk to JL 了解我的工作。"
                    : "the resume will be rebuilt soon. for now, the project windows and Talk to JL are the best way to read the work."}
                </p>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
