import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { PortfolioCategory, VisitorIntent } from "@/content/types";
import { PORTFOLIO_CATEGORIES, PORTFOLIO_PRESENT_YEAR, PORTFOLIO_START_YEAR } from "./helpers";

const COVER_SEEN_KEY = "jl-os-cover-seen";
let coverFinishTimeoutId: number | null = null;

export interface VisitorLocation {
  lat: number;
  lng: number;
}

export interface PortfolioSelectionLocation {
  lat: number;
  lng: number;
}

export interface GuestbookEntry {
  id: string;
  lat: number;
  lng: number;
  createdAt: string;
  message: string;
}

interface PortfolioStoreState {
  isCoverVisible: boolean;
  isEntering: boolean;
  timelineVisible: boolean;
  filterPanelOpen: boolean;
  selectedCategories: PortfolioCategory[];
  yearRange: [number, number];
  timelineYear: number;
  intent: VisitorIntent;
  openedProjects: string[];
  activeProjectSlug: string | null;
  pendingProjectSlug: string | null;
  lastSelectedProjectSlug: string | null;
  lastSelectedProjectLocation: PortfolioSelectionLocation | null;
  mapCenter: { lat: number; lng: number };
  mapZoom: number;
  worldResetNonce: number;
  futureModalOpen: boolean;
  visitorLocation: VisitorLocation | null;
  geolocationRequested: boolean;
  geolocationFlightPlayed: boolean;
  visitorHelloSent: boolean;
  guestbookEntries: GuestbookEntry[];
  coordinatesLabel: string;
  hasSeenCoverInSession: boolean;
  setCoordinatesLabel: (label: string) => void;
  beginEnterTransition: () => void;
  finishEnterTransition: () => void;
  showCover: () => void;
  toggleTimelineVisible: () => void;
  setFilterPanelOpen: (open: boolean) => void;
  toggleCategory: (category: PortfolioCategory) => void;
  setSelectedCategories: (categories: PortfolioCategory[]) => void;
  setAllCategories: () => void;
  setYearRange: (range: [number, number]) => void;
  setTimelineYear: (year: number) => void;
  setIntent: (intent: VisitorIntent) => void;
  setFutureModalOpen: (open: boolean) => void;
  setActiveProject: (slug: string | null) => void;
  addOpenedProject: (slug: string) => void;
  queueProjectOpen: (slug: string | null) => void;
  consumePendingProject: () => string | null;
  setLastSelectedProject: (slug: string, location: PortfolioSelectionLocation) => void;
  requestWorldReset: () => void;
  setMapCameraState: (center: { lat: number; lng: number }, zoom: number) => void;
  setVisitorLocation: (location: VisitorLocation | null) => void;
  markGeolocationRequested: () => void;
  markGeolocationFlightPlayed: () => void;
  recordVisitorHello: (location: VisitorLocation) => void;
}

function getInitialCoverVisibility(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.sessionStorage.getItem(COVER_SEEN_KEY) !== "true";
  } catch {
    return true;
  }
}

export const usePortfolioStore = create<PortfolioStoreState>()(
  persist(
    (set, get) => ({
      isCoverVisible: getInitialCoverVisibility(),
      isEntering: false,
      timelineVisible: true,
      filterPanelOpen: false,
      selectedCategories: [...PORTFOLIO_CATEGORIES],
      yearRange: [PORTFOLIO_START_YEAR, PORTFOLIO_PRESENT_YEAR],
      timelineYear: PORTFOLIO_PRESENT_YEAR,
      intent: "none",
      openedProjects: [],
      activeProjectSlug: null,
      pendingProjectSlug: null,
      lastSelectedProjectSlug: null,
      lastSelectedProjectLocation: null,
      mapCenter: { lat: 22, lng: -25 },
      mapZoom: 0.75,
      worldResetNonce: 0,
      futureModalOpen: false,
      visitorLocation: null,
      geolocationRequested: false,
      geolocationFlightPlayed: false,
      visitorHelloSent: false,
      guestbookEntries: [],
      coordinatesLabel: "22.0° N, 25.0° W",
      hasSeenCoverInSession: !getInitialCoverVisibility(),
      setCoordinatesLabel: (label) => set({ coordinatesLabel: label }),
      beginEnterTransition: () => {
        if (get().isEntering) return;
        if (coverFinishTimeoutId !== null) {
          window.clearTimeout(coverFinishTimeoutId);
        }
        set({ isEntering: true });
        if (typeof window !== "undefined") {
          coverFinishTimeoutId = window.setTimeout(() => {
            get().finishEnterTransition();
          }, 1900);
        }
      },
      finishEnterTransition: () => {
        if (coverFinishTimeoutId !== null) {
          window.clearTimeout(coverFinishTimeoutId);
          coverFinishTimeoutId = null;
        }
        try {
          window.sessionStorage.setItem(COVER_SEEN_KEY, "true");
        } catch {
          // noop
        }
        set({
          isCoverVisible: false,
          isEntering: false,
          hasSeenCoverInSession: true,
        });
      },
      showCover: () => {
        if (coverFinishTimeoutId !== null) {
          window.clearTimeout(coverFinishTimeoutId);
          coverFinishTimeoutId = null;
        }
        set({
          isCoverVisible: true,
          isEntering: false,
          filterPanelOpen: false,
          futureModalOpen: false,
        });
      },
      toggleTimelineVisible: () => set((state) => ({ timelineVisible: !state.timelineVisible })),
      setFilterPanelOpen: (open) => set({ filterPanelOpen: open }),
      toggleCategory: (category) =>
        set((state) => {
          const exists = state.selectedCategories.includes(category);
          const selectedCategories = exists
            ? state.selectedCategories.filter((item) => item !== category)
            : [...state.selectedCategories, category];
          return {
            selectedCategories: selectedCategories.length
              ? selectedCategories
              : [...PORTFOLIO_CATEGORIES],
          };
        }),
      setSelectedCategories: (categories) =>
        set({
          selectedCategories: categories.length ? [...categories] : [...PORTFOLIO_CATEGORIES],
        }),
      setAllCategories: () => set({ selectedCategories: [...PORTFOLIO_CATEGORIES] }),
      setYearRange: (range) => set({ yearRange: range }),
      setTimelineYear: (year) =>
        set({
          timelineYear: year,
          futureModalOpen: year >= 3000,
        }),
      setIntent: (intent) => set({ intent }),
      setFutureModalOpen: (open) => set({ futureModalOpen: open }),
      setActiveProject: (slug) => set({ activeProjectSlug: slug }),
      addOpenedProject: (slug) =>
        set((state) => ({
          openedProjects: [slug, ...state.openedProjects.filter((item) => item !== slug)].slice(0, 12),
          activeProjectSlug: slug,
        })),
      queueProjectOpen: (slug) => set({ pendingProjectSlug: slug }),
      consumePendingProject: () => {
        const slug = get().pendingProjectSlug;
        if (slug) {
          set({ pendingProjectSlug: null });
        }
        return slug;
      },
      setLastSelectedProject: (slug, location) =>
        set({
          lastSelectedProjectSlug: slug,
          lastSelectedProjectLocation: location,
        }),
      requestWorldReset: () =>
        set((state) => ({
          worldResetNonce: state.worldResetNonce + 1,
        })),
      setMapCameraState: (center, zoom) => set({ mapCenter: center, mapZoom: zoom }),
      setVisitorLocation: (location) => set({ visitorLocation: location }),
      markGeolocationRequested: () => set({ geolocationRequested: true }),
      markGeolocationFlightPlayed: () => set({ geolocationFlightPlayed: true }),
      recordVisitorHello: (location) =>
        set((state) => ({
          visitorHelloSent: true,
          guestbookEntries: [
            {
              id: `hello-${Date.now()}`,
              lat: location.lat,
              lng: location.lng,
              createdAt: new Date().toISOString(),
              message: "Say Hello to JL!",
            },
            ...state.guestbookEntries,
          ].slice(0, 50),
        })),
    }),
    {
      name: "jl-os-portfolio",
      partialize: (state) => ({
        selectedCategories: state.selectedCategories,
        yearRange: state.yearRange,
        timelineYear: state.timelineYear,
        intent: state.intent,
        openedProjects: state.openedProjects,
        visitorHelloSent: state.visitorHelloSent,
        guestbookEntries: state.guestbookEntries,
      }),
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
