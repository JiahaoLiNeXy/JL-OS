import {
  disabledAppIds,
  isActiveAppId,
  type AppId,
} from "./appRegistryData";
import type {
  AppProps,
  BaseApp,
  ControlPanelsInitialData,
  InternetExplorerInitialData,
  IpodInitialData,
  VideosInitialData,
} from "@/apps/base/types";
import type { AppletViewerInitialData } from "@/apps/applet-viewer";
import { createLazyComponent } from "./lazyAppComponent";
import { WindowFrame } from "@/components/layout/WindowFrame";

export type { AppId };

export interface WindowSize {
  width: number;
  height: number;
}

export interface WindowConstraints {
  minSize?: WindowSize;
  maxSize?: WindowSize;
  defaultSize: WindowSize;
  mobileDefaultSize?: WindowSize;
  /** If true, mobile height will be set to window.innerWidth (square) */
  mobileSquare?: boolean;
}

// Default window constraints for any app not specified
const defaultWindowConstraints: WindowConstraints = {
  defaultSize: { width: 730, height: 475 },
  minSize: { width: 300, height: 200 },
};

function LegacyUnavailableApp({
  isWindowOpen,
  onClose,
  isForeground,
  skipInitialSound,
  instanceId,
  title,
}: AppProps) {
  if (!isWindowOpen) return null;

  return (
    <WindowFrame
      title={title ?? "Unavailable App"}
      onClose={onClose}
      isForeground={isForeground}
      appId="finder"
      skipInitialSound={skipInitialSound}
      instanceId={instanceId}
    >
      <div className="flex h-full items-center justify-center bg-[#eef1f4] p-8 text-center text-[14px] text-black/70">
        This app has been removed from the JL OS portfolio build.
      </div>
    </WindowFrame>
  );
}

// ============================================================================
// LAZY-LOADED APP COMPONENTS
// ============================================================================

// Critical apps (load immediately for perceived performance)
import { PortfolioProjectsApp } from "@/portfolio/apps/PortfolioProjectsApp";

// Lazy-loaded apps (loaded on-demand when opened)
// Each uses a cache key to maintain stable references across HMR
const LazyInternetExplorerApp = createLazyComponent<InternetExplorerInitialData>(
  () => import("@/apps/internet-explorer/components/InternetExplorerAppComponent").then(m => ({ default: m.InternetExplorerAppComponent })),
  "internet-explorer"
);

const LazyChatsApp = createLazyComponent<unknown>(
  () => import("@/portfolio/apps/TalkToJLApp").then(m => ({ default: m.TalkToJLApp })),
  "chats"
);

const LazyControlPanelsApp = createLazyComponent<ControlPanelsInitialData>(
  () => import("@/apps/control-panels/components/ControlPanelsAppComponent").then(m => ({ default: m.ControlPanelsAppComponent })),
  "control-panels"
);

const LazyMinesweeperApp = createLazyComponent<unknown>(
  () => import("@/apps/minesweeper/components/MinesweeperAppComponent").then(m => ({ default: m.MinesweeperAppComponent })),
  "minesweeper"
);

const LazySoundboardApp = createLazyComponent<unknown>(
  () => import("@/apps/soundboard/components/SoundboardAppComponent").then(m => ({ default: m.SoundboardAppComponent })),
  "soundboard"
);

const LazyVideosApp = createLazyComponent<VideosInitialData>(
  () => import("@/apps/videos/components/VideosAppComponent").then(m => ({ default: m.VideosAppComponent })),
  "videos"
);

const LazyIpodApp = createLazyComponent<IpodInitialData>(
  () => import("@/apps/ipod/components/IpodAppComponent").then(m => ({ default: m.IpodAppComponent })),
  "ipod"
);

const LazyTerminalApp = createLazyComponent<unknown>(
  () => import("@/apps/terminal/components/TerminalAppComponent").then(m => ({ default: m.TerminalAppComponent })),
  "terminal"
);

const LazyAppletViewerApp = createLazyComponent<AppletViewerInitialData>(
  () => import("@/portfolio/apps/AppletUtilityStoreApp").then(m => ({ default: m.AppletUtilityStoreApp })),
  "applet-viewer"
);

const LazyAdminApp = createLazyComponent<unknown>(
  () => import("@/apps/admin/components/AdminAppComponent").then(m => ({ default: m.AdminAppComponent })),
  "admin"
);

const LazyStickiesApp = createLazyComponent<unknown>(
  () => import("@/portfolio/apps/PortfolioNotesApp").then(m => ({ default: m.PortfolioNotesApp })),
  "stickies"
);

const LazyCalendarApp = createLazyComponent<unknown>(
  () => import("@/apps/calendar/components/CalendarAppComponent").then(m => ({ default: m.CalendarAppComponent })),
  "calendar"
);

const LazyContactsApp = createLazyComponent<unknown>(
  () => import("@/apps/contacts/components/ContactsAppComponent").then(m => ({ default: m.ContactsAppComponent })),
  "contacts"
);

// ============================================================================
// APP METADATA (loaded eagerly - small, isolated from components)
// Import from metadata.ts files to avoid eager loading of components
// ============================================================================

import { appMetadata as finderMetadata, helpItems as finderHelpItems } from "@/apps/finder/metadata";
import { appMetadata as soundboardMetadata, helpItems as soundboardHelpItems } from "@/apps/soundboard/metadata";
import { appMetadata as internetExplorerMetadata, helpItems as internetExplorerHelpItems } from "@/apps/internet-explorer/metadata";
import { appMetadata as chatsMetadata, helpItems as chatsHelpItems } from "@/apps/chats/metadata";
import { appMetadata as minesweeperMetadata, helpItems as minesweeperHelpItems } from "@/apps/minesweeper";
import { appMetadata as videosMetadata, helpItems as videosHelpItems } from "@/apps/videos/metadata";
import { appMetadata as ipodMetadata, helpItems as ipodHelpItems } from "@/apps/ipod/metadata";
import { appMetadata as terminalMetadata, helpItems as terminalHelpItems } from "@/apps/terminal";
import { appMetadata as appletViewerMetadata, helpItems as appletViewerHelpItems } from "@/apps/applet-viewer";
import { appMetadata as controlPanelsMetadata, helpItems as controlPanelsHelpItems } from "@/apps/control-panels";
import { appMetadata as adminMetadata, helpItems as adminHelpItems } from "@/apps/admin/metadata";
import { appMetadata as stickiesMetadata, helpItems as stickiesHelpItems } from "@/apps/stickies";
import { appMetadata as calendarMetadata, helpItems as calendarHelpItems } from "@/apps/calendar/metadata";
import { appMetadata as contactsMetadata, helpItems as contactsHelpItems } from "@/apps/contacts";

// ============================================================================
// APP REGISTRY
// ============================================================================

// Registry of all available apps with their window configurations
const activeAppRegistry = {
  ["finder"]: {
    id: "finder",
    name: "Finder",
    icon: { type: "image", src: "/icons/mac.png" },
    description: "Browse and manage files",
    component: PortfolioProjectsApp,
    helpItems: finderHelpItems,
    metadata: finderMetadata,
    windowConfig: {
      defaultSize: { width: 860, height: 860 },
      minSize: { width: 640, height: 600 },
    } as WindowConstraints,
  },
  ["soundboard"]: {
    id: "soundboard",
    name: "Soundboard",
    icon: { type: "image", src: soundboardMetadata.icon },
    description: "Play sound effects",
    component: LazySoundboardApp,
    helpItems: soundboardHelpItems,
    metadata: soundboardMetadata,
    windowConfig: {
      defaultSize: { width: 650, height: 475 },
      minSize: { width: 550, height: 375 },
    } as WindowConstraints,
  },
  ["internet-explorer"]: {
    id: "internet-explorer",
    name: "Internet Explorer",
    icon: { type: "image", src: internetExplorerMetadata.icon },
    description: "Browse the web",
    component: LazyInternetExplorerApp,
    helpItems: internetExplorerHelpItems,
    metadata: internetExplorerMetadata,
    windowConfig: {
      defaultSize: { width: 730, height: 600 },
      minSize: { width: 400, height: 300 },
    } as WindowConstraints,
  } as BaseApp<InternetExplorerInitialData> & { windowConfig: WindowConstraints },
  ["chats"]: {
    id: "chats",
    name: "Chats",
    icon: { type: "image", src: chatsMetadata.icon },
    description: "Chat with AI",
    component: LazyChatsApp,
    helpItems: chatsHelpItems,
    metadata: chatsMetadata,
    windowConfig: {
      defaultSize: { width: 560, height: 360 },
      minSize: { width: 300, height: 320 },
    } as WindowConstraints,
  },
  ["minesweeper"]: {
    id: "minesweeper",
    name: "Minesweeper",
    icon: { type: "image", src: minesweeperMetadata!.icon },
    description: "Classic puzzle game",
    component: LazyMinesweeperApp,
    helpItems: minesweeperHelpItems,
    metadata: minesweeperMetadata,
    windowConfig: {
      defaultSize: { width: 305, height: 400 },
      minSize: { width: 305, height: 400 },
      maxSize: { width: 305, height: 400 },
    } as WindowConstraints,
  },
  ["videos"]: {
    id: "videos",
    name: "Videos",
    icon: { type: "image", src: videosMetadata.icon },
    description: "Watch videos",
    component: LazyVideosApp,
    helpItems: videosHelpItems,
    metadata: videosMetadata,
    windowConfig: {
      defaultSize: { width: 400, height: 420 },
      minSize: { width: 400, height: 340 },
    } as WindowConstraints,
  } as BaseApp<VideosInitialData> & { windowConfig: WindowConstraints },
  ["ipod"]: {
    id: "ipod",
    name: "iPod",
    icon: { type: "image", src: ipodMetadata.icon },
    description: "Music player",
    component: LazyIpodApp,
    helpItems: ipodHelpItems,
    metadata: ipodMetadata,
    windowConfig: {
      defaultSize: { width: 300, height: 480 },
      minSize: { width: 300, height: 480 },
    } as WindowConstraints,
  } as BaseApp<IpodInitialData> & { windowConfig: WindowConstraints },
  ["terminal"]: {
    id: "terminal",
    name: "Terminal",
    icon: { type: "image", src: terminalMetadata!.icon },
    description: "Command line interface",
    component: LazyTerminalApp,
    helpItems: terminalHelpItems,
    metadata: terminalMetadata,
    windowConfig: {
      defaultSize: { width: 600, height: 400 },
      minSize: { width: 400, height: 300 },
    } as WindowConstraints,
  },
  ["applet-viewer"]: {
    id: "applet-viewer",
    name: "Applet Store",
    icon: { type: "image", src: appletViewerMetadata.icon },
    description: "View and run applets",
    component: LazyAppletViewerApp,
    helpItems: appletViewerHelpItems,
    metadata: appletViewerMetadata,
    windowConfig: {
      defaultSize: { width: 320, height: 450 },
      minSize: { width: 300, height: 200 },
    } as WindowConstraints,
  } as BaseApp<AppletViewerInitialData> & { windowConfig: WindowConstraints },
  ["control-panels"]: {
    id: "control-panels",
    name: "Control Panels",
    icon: { type: "image", src: controlPanelsMetadata.icon },
    description: "System settings",
    component: LazyControlPanelsApp,
    helpItems: controlPanelsHelpItems,
    metadata: controlPanelsMetadata,
    windowConfig: {
      defaultSize: { width: 400, height: 415 },
      minSize: { width: 400, height: 415 },
      maxSize: { width: 560, height: 600 },
    } as WindowConstraints,
  } as BaseApp<ControlPanelsInitialData> & { windowConfig: WindowConstraints },
  ["admin"]: {
    id: "admin",
    name: "Admin",
    icon: { type: "image", src: adminMetadata.icon },
    description: "System administration panel",
    component: LazyAdminApp,
    helpItems: adminHelpItems,
    metadata: adminMetadata,
    adminOnly: true, // Only visible to admin user (ryo)
    windowConfig: {
      defaultSize: { width: 800, height: 500 },
      minSize: { width: 600, height: 400 },
    } as WindowConstraints,
  },
  ["stickies"]: {
    id: "stickies",
    name: "Stickies",
    icon: { type: "image", src: stickiesMetadata.icon },
    description: "Sticky notes for quick reminders",
    component: LazyStickiesApp,
    helpItems: stickiesHelpItems,
    metadata: stickiesMetadata,
    windowConfig: {
      defaultSize: { width: 500, height: 400 },
      minSize: { width: 300, height: 250 },
    } as WindowConstraints,
  },
  ["calendar"]: {
    id: "calendar",
    name: "Calendar",
    icon: { type: "image", src: calendarMetadata.icon },
    description: "Calendar with events",
    component: LazyCalendarApp,
    helpItems: calendarHelpItems,
    metadata: calendarMetadata,
    windowConfig: {
      defaultSize: { width: 700, height: 520 },
      minSize: { width: 300, height: 380 },
    } as WindowConstraints,
  },
  ["contacts"]: {
    id: "contacts",
    name: "Contacts",
    icon: { type: "image", src: contactsMetadata.icon },
    description: "Address book with vCard import",
    component: LazyContactsApp,
    helpItems: contactsHelpItems,
    metadata: contactsMetadata,
    windowConfig: {
      defaultSize: { width: 820, height: 560 },
      minSize: { width: 360, height: 420 },
    } as WindowConstraints,
  },
} as const;

const disabledAppRegistry = Object.fromEntries(
  disabledAppIds.map((id) => [
    id,
    {
      id,
      name:
        id === "textedit"
          ? "TextEdit"
          : id === "photo-booth"
            ? "Photo Booth"
            : id === "pc"
              ? "PC"
              : id
                  .split("-")
                  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                  .join(" "),
      icon: {
        type: "image" as const,
        src:
          id === "infinite-mac"
            ? "/icons/default/infinite-mac.png"
            : id === "photo-booth"
              ? "/icons/default/photo-booth.png"
              : id === "dashboard"
                ? "/icons/default/dashboard.png"
                : id === "candybar"
                  ? "/icons/default/candybar.png"
                  : `/icons/default/${id}.png`,
      },
      description: "Unavailable in JL OS portfolio build",
      component: LegacyUnavailableApp,
      helpItems: [],
      metadata: undefined,
      windowConfig: defaultWindowConstraints,
      disabled: true,
    },
  ]),
) as unknown as Record<
  (typeof disabledAppIds)[number],
  BaseApp & { windowConfig: WindowConstraints; disabled: true }
>;

export const appRegistry = {
  ...activeAppRegistry,
  ...disabledAppRegistry,
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Helper function to get app icon path
export const getAppIconPath = (appId: AppId): string => {
  const app = appRegistry[appId];
  if (typeof app.icon === "string") {
    return app.icon;
  }
  return app.icon.src;
};

// Helper function to get all apps except Finder
// Pass isAdmin=true to include admin-only apps
export const getNonFinderApps = (isAdmin: boolean = false): Array<{
  name: string;
  icon: string;
  id: AppId;
}> => {
  return Object.entries(appRegistry)
    .filter(([id, app]) => {
      if (!isActiveAppId(id as AppId)) return false;
      if (id === "finder") return false;
      // Filter out admin-only apps for non-admin users
      if ((app as { adminOnly?: boolean }).adminOnly && !isAdmin) return false;
      return true;
    })
    .map(([id, app]) => ({
      name: app.name,
      icon: getAppIconPath(id as AppId),
      id: id as AppId,
    }));
};

// Helper function to get app metadata
export const getAppMetadata = (appId: AppId) => {
  return appRegistry[appId].metadata;
};

// Helper function to get app component
export const getAppComponent = (appId: AppId) => {
  return appRegistry[appId].component;
};

// Helper function to get window configuration
export const getWindowConfig = (appId: AppId): WindowConstraints => {
  return appRegistry[appId].windowConfig || defaultWindowConstraints;
};

// Helper function to get mobile window size
export const getMobileWindowSize = (appId: AppId): WindowSize => {
  const config = getWindowConfig(appId);
  if (config.mobileDefaultSize) {
    return config.mobileDefaultSize;
  }
  // Square aspect ratio: height = width
  if (config.mobileSquare) {
    return {
      width: window.innerWidth,
      height: window.innerWidth,
    };
  }
  return {
    width: window.innerWidth,
    height: config.defaultSize.height,
  };
};
