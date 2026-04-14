import { AppManager } from "./apps/base/AppManager";
import { appRegistry } from "./config/appRegistry";
import { useEffect, useState, useMemo } from "react";
import { applyDisplayMode } from "./utils/displayMode";
import { Toaster } from "./components/ui/sonner";
import { useAppStoreShallow, useDisplaySettingsStoreShallow } from "@/stores/helpers";
import { BootScreen } from "./components/dialogs/BootScreen";
import { getNextBootMessage, clearNextBootMessage, isBootDebugMode } from "./utils/bootMessage";
import { AnyApp } from "./apps/base/types";
import { useThemeStore } from "./stores/useThemeStore";
import { useIsMobile } from "./hooks/useIsMobile";
import { useOffline } from "./hooks/useOffline";
import { useTranslation } from "react-i18next";
import { ScreenSaverOverlay } from "./components/screensavers/ScreenSaverOverlay";
import { useBackgroundChatNotifications } from "./hooks/useBackgroundChatNotifications";
import { DesktopErrorBoundary } from "@/components/errors/ErrorBoundaries";
import { useAutoCloudSync } from "@/hooks/useAutoCloudSync";
import { AirDropListener } from "@/components/AirDropListener";
import { useFilesStore } from "@/stores/useFilesStore";
import { ReactScanDebug } from "@/components/ReactScanDebug";
import { CoverPage } from "@/portfolio/components/CoverPage";
import { PortfolioDesktop } from "@/portfolio/components/PortfolioDesktop";
import { PortfolioMenuBar } from "@/portfolio/components/PortfolioMenuBar";
import { PortfolioDock } from "@/portfolio/components/PortfolioDock";
import { usePortfolioStore } from "@/portfolio/store";

// Convert registry to array
const apps: AnyApp[] = Object.values(appRegistry);

// Wrapper that adapts PortfolioDesktop to the Desktop component interface
function PortfolioDesktopWrapper() {
  return <PortfolioDesktop />;
}

export function App() {
  const { t } = useTranslation();
  const { isFirstBoot, setHasBooted } = useAppStoreShallow(
    (state) => ({
      isFirstBoot: state.isFirstBoot,
      setHasBooted: state.setHasBooted,
    })
  );
  const displayMode = useDisplaySettingsStoreShallow((state) => state.displayMode);
  const currentTheme = useThemeStore((state) => state.current);
  const isMobile = useIsMobile();
  // Initialize offline detection
  useOffline();
  useBackgroundChatNotifications();
  useAutoCloudSync();

  // Consume pending project after cover transition completes
  const isCoverVisible = usePortfolioStore((state) => state.isCoverVisible);
  const consumePendingProject = usePortfolioStore((state) => state.consumePendingProject);

  useEffect(() => {
    if (isCoverVisible) return;
    const slug = consumePendingProject();
    if (slug) {
      // Small delay to let the desktop render first
      const timer = window.setTimeout(() => {
        import("@/utils/appEventBus").then(({ requestAppLaunch }) => {
          requestAppLaunch({
            appId: "finder",
            initialData: { mode: "project", projectSlug: slug },
          });
        });
      }, 400);
      return () => window.clearTimeout(timer);
    }
  }, [isCoverVisible, consumePendingProject]);

  // Determine toast position and offset based on theme and device
  const toastConfig = useMemo(() => {
    const isWindowsTheme = currentTheme === "xp" || currentTheme === "win98";
    const dockHeight = currentTheme === "macosx" ? 56 : 0;
    const taskbarHeight = isWindowsTheme ? 30 : 0;
    
    // Mobile: always show at bottom-center with dock/taskbar and safe area clearance
    if (isMobile) {
      const bottomOffset = dockHeight + taskbarHeight + 16;
      return {
        position: "bottom-center" as const,
        offset: `calc(env(safe-area-inset-bottom, 0px) + ${bottomOffset}px)`,
      };
    }

    if (isWindowsTheme) {
      // Windows themes: bottom-right with taskbar clearance (30px + padding)
      return {
        position: "bottom-right" as const,
        offset: `calc(env(safe-area-inset-bottom, 0px) + 42px)`,
      };
    } else {
      // macOS themes: top-right with menubar clearance
      const menuBarHeight = currentTheme === "system7" ? 30 : 25;
      return {
        position: "top-right" as const,
        offset: `${menuBarHeight + 12}px`,
      };
    }
  }, [currentTheme, isMobile]);

  const [bootScreenMessage, setBootScreenMessage] = useState<string | null>(
    null
  );
  const [showBootScreen, setShowBootScreen] = useState(false);
  const [bootDebugMode, setBootDebugMode] = useState(false);

  useEffect(() => {
    applyDisplayMode(displayMode);
  }, [displayMode]);

  useEffect(() => {
    Promise.resolve(
      useFilesStore.getState().syncRootDirectoriesFromDefaults()
    ).catch((err) => {
      console.error("Root directory sync failed on app mount", err);
    });
  }, []);

  useEffect(() => {
    // Only show boot screen for system operations (reset/restore/format/debug)
    const persistedMessage = getNextBootMessage();
    if (persistedMessage) {
      setBootScreenMessage(persistedMessage);
      setBootDebugMode(isBootDebugMode());
      setShowBootScreen(true);
    }

    // Set first boot flag without showing boot screen
    if (isFirstBoot) {
      setHasBooted();
    }
  }, [isFirstBoot, setHasBooted]);

  // Desktop download toast removed — not applicable to JL OS portfolio

  if (showBootScreen) {
    return (
      <BootScreen
        isOpen={true}
        onOpenChange={() => {}}
        title={bootScreenMessage || t("common.system.systemRestoring")}
        debugMode={bootDebugMode}
        onBootComplete={() => {
          clearNextBootMessage();
          setShowBootScreen(false);
        }}
      />
    );
  }

  return (
    <>
      <ReactScanDebug />
      <DesktopErrorBoundary>
        <AppManager
          apps={apps}
          customDesktop={PortfolioDesktopWrapper}
          customMenuBar={PortfolioMenuBar}
          customDock={PortfolioDock}
        />
      </DesktopErrorBoundary>
      <CoverPage />
      <Toaster position={toastConfig.position} offset={toastConfig.offset} />
      <AirDropListener />
      <ScreenSaverOverlay />
    </>
  );
}
