import type { AppProps } from "@/apps/base/types";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { noteFragments } from "@/content/generated/portfolio-data";
import { useLanguageStore } from "@/stores/useLanguageStore";
import { textForLocale } from "@/portfolio/helpers";

export function PortfolioNotesApp({
  onClose,
  isWindowOpen,
  isForeground = true,
  skipInitialSound,
  instanceId,
}: AppProps) {
  const language = useLanguageStore((state) => state.current);

  if (!isWindowOpen) return null;

  return (
    <WindowFrame
      title="Notes"
      onClose={onClose}
      isForeground={isForeground}
      appId="stickies"
      skipInitialSound={skipInitialSound}
      instanceId={instanceId}
    >
      <div
        className="h-full overflow-auto px-6 py-6"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,244,189,1) 0%, rgba(248,233,162,1) 100%)",
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px)",
          backgroundSize: "100% 34px, 24px 24px",
        }}
      >
        <div className="mx-auto max-w-[760px]">
          <div className="text-[12px] uppercase tracking-[0.18em] text-black/45">notes</div>
          <h1
            className="mt-3 text-[38px] leading-none text-black"
            style={{ fontFamily: '"Instrument Serif", serif' }}
          >
            {language === "zh" ? "放大感知" : "amplify perception"}
          </h1>
          <div className="mt-8 space-y-10">
            {noteFragments.map((fragment) => (
              <article key={fragment.id} className="border-b border-black/10 pb-8 last:border-b-0">
                <h2
                  className="text-[28px] leading-tight text-black"
                  style={{ fontFamily: '"Instrument Serif", serif' }}
                >
                  {textForLocale(fragment.title, language)}
                </h2>
                <p className="mt-4 text-[15px] leading-8 text-black/80">
                  {textForLocale(fragment.content, language)}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </WindowFrame>
  );
}
