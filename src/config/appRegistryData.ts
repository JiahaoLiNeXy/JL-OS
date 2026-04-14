/**
 * Lightweight app registry data - only IDs and names
 * This file can be imported without triggering heavy component loads
 * Used by stores that need basic app info during initialization
 */

export const appIds = [
  "finder",
  "soundboard",
  "internet-explorer",
  "chats",
  "minesweeper",
  "videos",
  "ipod",
  "terminal",
  "applet-viewer",
  "control-panels",
  "admin",
  "stickies",
  "calendar",
  "contacts",
] as const;

export const disabledAppIds = [
  "textedit",
  "paint",
  "pc",
  "photo-booth",
  "synth",
  "karaoke",
  "infinite-mac",
  "winamp",
  "dashboard",
  "candybar",
] as const;

export const allAppIds = [...appIds, ...disabledAppIds] as const;

export type ActiveAppId = (typeof appIds)[number];
export type DisabledAppId = (typeof disabledAppIds)[number];
export type AppId = ActiveAppId | DisabledAppId;

const activeAppIdLookup = new Set<string>(appIds);

export function isActiveAppId(appId: AppId): appId is ActiveAppId {
  return activeAppIdLookup.has(appId);
}

/** Minimal app data for stores that don't need full registry */
export interface AppBasicInfo {
  id: AppId;
  name: string;
}

/** App ID to name mapping - matches appRegistry names exactly */
export const appNames: Record<AppId, string> = {
  "finder": "Finder",
  "soundboard": "Soundboard",
  "internet-explorer": "Internet Explorer",
  "chats": "Chats",
  "minesweeper": "Minesweeper",
  "videos": "Videos",
  "ipod": "iPod",
  "terminal": "Terminal",
  "applet-viewer": "Applet Store",
  "control-panels": "Control Panels",
  "admin": "Admin",
  "stickies": "Stickies",
  "calendar": "Calendar",
  "contacts": "Contacts",
  "textedit": "TextEdit",
  "paint": "Paint",
  "pc": "PC",
  "photo-booth": "Photo Booth",
  "synth": "Synth",
  "karaoke": "Karaoke",
  "infinite-mac": "Infinite Mac",
  "winamp": "Winamp",
  "dashboard": "Dashboard",
  "candybar": "Candybar",
};

/** Get list of apps with basic info for stores */
export function getAppBasicInfoList(): AppBasicInfo[] {
  return appIds.map(id => ({ id, name: appNames[id] }));
}
