import type { AppProps } from "@/apps/base/types";
import { WindowFrame } from "@/components/layout/WindowFrame";
import { appRegistry } from "@/config/appRegistry";
import { useLaunchApp } from "@/hooks/useLaunchApp";
import { useLanguageStore } from "@/stores/useLanguageStore";
import { getTranslatedAppName } from "@/utils/i18n";

const UTILITY_APP_IDS = [
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
] as const;

export function AppletUtilityStoreApp({
  onClose,
  isWindowOpen,
  isForeground = true,
  skipInitialSound,
  instanceId,
}: AppProps) {
  const launchApp = useLaunchApp();
  const language = useLanguageStore((state) => state.current);

  if (!isWindowOpen) return null;

  return (
    <WindowFrame
      title={language === "zh" ? "工具应用" : "Utility Apps"}
      onClose={onClose}
      isForeground={isForeground}
      appId="applet-viewer"
      skipInitialSound={skipInitialSound}
      instanceId={instanceId}
    >
      <div className="h-full overflow-auto bg-[#eef1f4] p-5">
        <div className="grid gap-4">
          {UTILITY_APP_IDS.map((appId) => {
            const app = appRegistry[appId];
            const icon = typeof app.icon === "string" ? app.icon : app.icon.src;
            return (
              <button
                key={appId}
                type="button"
                onClick={() => launchApp(appId)}
                className="flex items-center gap-4 rounded-[16px] border border-black/10 bg-white/80 px-4 py-4 text-left shadow-[0_14px_30px_rgba(0,0,0,0.05)] transition hover:-translate-y-0.5"
              >
                <img src={icon} alt="" className="h-12 w-12 rounded-[12px]" />
                <div>
                  <div className="text-[15px] font-semibold text-black">
                    {getTranslatedAppName(appId)}
                  </div>
                  <div className="mt-1 text-[13px] text-black/60">{app.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </WindowFrame>
  );
}
