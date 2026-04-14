import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { X } from "@phosphor-icons/react";
import { FileIcon } from "@/apps/finder/components/FileIcon";
import { Button } from "@/components/ui/button";
import {
  PORTFOLIO_PRESENT_YEAR,
  getCategoryGroupLabel,
  getPinEmphasis,
  getVisibleProjects,
  textForLocale,
} from "@/portfolio/helpers";
import { usePortfolioStore } from "@/portfolio/store";
import { useLaunchApp } from "@/hooks/useLaunchApp";
import { useLanguageStore } from "@/stores/useLanguageStore";
import { getAppIconPath } from "@/config/appRegistry";

const INITIAL_CENTER: [number, number] = [-25, 22];
const INITIAL_ZOOM = 1.75;
const INITIAL_PITCH = 12;
const NEW_YORK: [number, number] = [-74.006, 40.7128];
const ROUTE_SOURCE_ID = "portfolio-route";
const ROUTE_LAYER_ID = "portfolio-route-line";
const TRAIL_SOURCE_ID = "portfolio-trail";
const TRAIL_LAYER_ID = "portfolio-trail-line";
const PINS_SOURCE_ID = "portfolio-pins";
const PINS_LAYER_ID = "portfolio-pins-circle";
const PINS_BORDER_LAYER_ID = "portfolio-pins-border";

function toCoordinatesLabel(lat: number, lng: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(1)}° ${latDir}, ${Math.abs(lng).toFixed(1)}° ${lngDir}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function bearingBetween(from: [number, number], to: [number, number]): number {
  const [lng1, lat1] = from.map((v) => (v * Math.PI) / 180) as [number, number];
  const [lng2, lat2] = to.map((v) => (v * Math.PI) / 180) as [number, number];
  const dLng = lng2 - lng1;
  const x = Math.sin(dLng) * Math.cos(lat2);
  const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (Math.atan2(x, y) * (180 / Math.PI) + 360) % 360;
}

function angularDistance(from: [number, number], to: [number, number]): number {
  const [lng1, lat1] = from.map((v) => (v * Math.PI) / 180) as [number, number];
  const [lng2, lat2] = to.map((v) => (v * Math.PI) / 180) as [number, number];
  const a = [Math.cos(lat1) * Math.cos(lng1), Math.cos(lat1) * Math.sin(lng1), Math.sin(lat1)];
  const b = [Math.cos(lat2) * Math.cos(lng2), Math.cos(lat2) * Math.sin(lng2), Math.sin(lat2)];
  return Math.acos(clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1));
}

function slerpGreatCircle(from: [number, number], to: [number, number], t: number): [number, number] {
  const [lng1, lat1] = from.map((value) => (value * Math.PI) / 180) as [number, number];
  const [lng2, lat2] = to.map((value) => (value * Math.PI) / 180) as [number, number];

  const a = [
    Math.cos(lat1) * Math.cos(lng1),
    Math.cos(lat1) * Math.sin(lng1),
    Math.sin(lat1),
  ] as const;
  const b = [
    Math.cos(lat2) * Math.cos(lng2),
    Math.cos(lat2) * Math.sin(lng2),
    Math.sin(lat2),
  ] as const;

  const omega = Math.acos(clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1));
  if (!Number.isFinite(omega) || omega === 0) {
    return to;
  }

  const sinOmega = Math.sin(omega);
  const scaleA = Math.sin((1 - t) * omega) / sinOmega;
  const scaleB = Math.sin(t * omega) / sinOmega;

  const x = scaleA * a[0] + scaleB * b[0];
  const y = scaleA * a[1] + scaleB * b[1];
  const z = scaleA * a[2] + scaleB * b[2];

  const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
  const lng = Math.atan2(y, x);
  return [(lng * 180) / Math.PI, (lat * 180) / Math.PI];
}

function ensureRouteLayers(map: mapboxgl.Map) {
  if (!map.getSource(ROUTE_SOURCE_ID)) {
    map.addSource(ROUTE_SOURCE_ID, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
  }
  if (!map.getLayer(ROUTE_LAYER_ID)) {
    map.addLayer({
      id: ROUTE_LAYER_ID,
      type: "line",
      source: ROUTE_SOURCE_ID,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": "rgba(255,255,255,0.62)",
        "line-width": 1.8,
        "line-dasharray": [3, 5],
      },
    });
  }
}

function setRouteLine(map: mapboxgl.Map, from: [number, number], to: [number, number]) {
  const source = map.getSource(ROUTE_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
  if (!source) return;
  const STEPS = 120;
  const coords: [number, number][] = Array.from({ length: STEPS + 1 }, (_, i) =>
    slerpGreatCircle(from, to, i / STEPS),
  );
  source.setData({
    type: "FeatureCollection",
    features: [{ type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: {} }],
  });
}

function clearRouteLine(map: mapboxgl.Map) {
  const source = map.getSource(ROUTE_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
  source?.setData({ type: "FeatureCollection", features: [] });
}

// Cubic ease-in-out: slow start, fast middle, slow stop
function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Shortest angular difference in [-180, 180]
function angleDiff(from: number, to: number): number {
  let diff = ((to - from) % 360 + 360) % 360;
  if (diff > 180) diff -= 360;
  return diff;
}

function ensureTrailLayer(map: mapboxgl.Map) {
  if (!map.getSource(TRAIL_SOURCE_ID)) {
    map.addSource(TRAIL_SOURCE_ID, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
  }
  if (!map.getLayer(TRAIL_LAYER_ID)) {
    map.addLayer({
      id: TRAIL_LAYER_ID,
      type: "line",
      source: TRAIL_SOURCE_ID,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": "rgba(255,255,255,0.92)",
        "line-width": 2.4,
      },
    });
  }
}

function updateTrailLine(
  map: mapboxgl.Map,
  from: [number, number],
  to: [number, number],
  rawT: number,
) {
  const source = map.getSource(TRAIL_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
  if (!source || rawT <= 0) return;
  const steps = Math.max(2, Math.round(rawT * 64));
  const coords: [number, number][] = Array.from({ length: steps + 1 }, (_, i) =>
    slerpGreatCircle(from, to, (i / steps) * rawT),
  );
  source.setData({
    type: "FeatureCollection",
    features: [
      { type: "Feature", geometry: { type: "LineString", coordinates: coords }, properties: {} },
    ],
  });
}

function clearTrailLine(map: mapboxgl.Map) {
  const source = map.getSource(TRAIL_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
  source?.setData({ type: "FeatureCollection", features: [] });
}

function createPlaneElement(bearing = 90) {
  // Plane SVG faces RIGHT (east). rotate(bearing - 90) to point in bearing direction.
  const SIZE = 56;

  const element = document.createElement("div");
  element.style.cssText = `width:${SIZE}px;height:${SIZE}px;pointer-events:none;display:flex;align-items:center;justify-content:center;`;

  const glyph = document.createElementNS("http://www.w3.org/2000/svg", "svg") as unknown as HTMLElement;
  glyph.setAttribute("viewBox", "0 0 100 100");
  glyph.setAttribute("width", String(SIZE));
  glyph.setAttribute("height", String(SIZE));
  glyph.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  glyph.style.filter =
    "drop-shadow(0 4px 10px rgba(0,0,0,0.80)) drop-shadow(0 0 4px rgba(0,0,0,0.90))";
  glyph.style.transformOrigin = "center center";
  glyph.style.transform = `rotate(${bearing - 90}deg)`;
  // No CSS transition — rAF loop handles smooth rotation
  glyph.style.display = "block";
  // Top-down 3D-style jet: nose points RIGHT (east).
  // Layering: wings first, then fuselage on top.
  glyph.innerHTML = `
  <defs>
    <radialGradient id="pg-b" cx="62%" cy="28%" r="62%" gradientUnits="objectBoundingBox">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="58%" stop-color="#dce6ee"/>
      <stop offset="100%" stop-color="#a4b8c8"/>
    </radialGradient>
  </defs>
  <!-- Upper main wing -->
  <path d="M46,47 L12,18 L30,47 Z" fill="rgba(238,246,252,0.95)"/>
  <!-- Lower main wing -->
  <path d="M46,53 L12,82 L30,53 Z" fill="rgba(218,232,242,0.93)"/>
  <!-- Upper rear stabilizer -->
  <path d="M23,48 L8,42 L17,48 Z" fill="rgba(232,242,249,0.90)"/>
  <!-- Lower rear stabilizer -->
  <path d="M23,52 L8,58 L17,52 Z" fill="rgba(212,226,236,0.88)"/>
  <!-- Fuselage (on top of wings for correct depth) -->
  <ellipse cx="52" cy="50" rx="34" ry="7.5" fill="url(#pg-b)"/>
  <!-- Cockpit highlight -->
  <ellipse cx="73" cy="48.6" rx="8" ry="2.6" fill="rgba(255,255,255,0.22)"/>
  <!-- Nose accent -->
  <circle cx="84" cy="50" r="2.8" fill="rgba(255,255,255,0.55)"/>`;

  element.appendChild(glyph);
  return { element, glyph };
}

function createVisitorHelloElement({
  onHello,
  sent,
}: {
  onHello: () => void;
  sent: boolean;
}) {
  const bubble = document.createElement("button");
  bubble.type = "button";
  bubble.textContent = sent ? "Hello sent to JL ✓" : "Say Hello to JL!";
  bubble.style.border = "0";
  bubble.style.borderRadius = "9999px";
  bubble.style.padding = "8px 14px";
  bubble.style.fontSize = "12px";
  bubble.style.fontWeight = "600";
  bubble.style.letterSpacing = "0.02em";
  bubble.style.color = sent ? "rgba(5,18,34,0.92)" : "rgba(255,255,255,0.98)";
  bubble.style.background = sent ? "rgba(248,245,236,0.92)" : "rgba(9,18,31,0.74)";
  bubble.style.boxShadow = "0 12px 30px rgba(0,0,0,0.24)";
  bubble.style.backdropFilter = "blur(12px)";
  bubble.style.cursor = sent ? "default" : "pointer";
  bubble.style.whiteSpace = "nowrap";

  bubble.addEventListener("click", (event: MouseEvent) => {
    event.stopPropagation();
    if (!sent) onHello();
  });

  return bubble;
}

function DesktopShortcuts() {
  const launchApp = useLaunchApp();
  const language = useLanguageStore((state) => state.current);

  const items = [
    {
      id: "projects",
      name: language === "zh" ? "Projects" : "Projects",
      icon: "/icons/directory.png",
      isDirectory: true,
      onOpen: () =>
        launchApp("finder", {
          initialData: { mode: "browser" },
          multiWindow: true,
        }),
    },
    {
      id: "workflow",
      name: language === "zh" ? "Workflow" : "Workflow",
      icon: "/icons/directory.png",
      isDirectory: true,
      onOpen: () =>
        launchApp("finder", {
          initialData: { mode: "browser", query: "workflow" },
          multiWindow: true,
        }),
    },
    {
      id: "app-store",
      name: language === "zh" ? "App Store" : "App Store",
      icon: getAppIconPath("applet-viewer"),
      isDirectory: false,
      onOpen: () => launchApp("applet-viewer"),
    },
  ] as const;

  return (
    <div className="pointer-events-auto absolute right-4 top-[54px] z-[2] flex flex-col items-center gap-5 md:right-5 md:top-[58px]">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-label={item.name}
          className="w-[92px] rounded-[12px] p-1 text-center"
          onDoubleClick={item.onOpen}
          onClick={item.onOpen}
        >
          <FileIcon
            name={item.name}
            isDirectory={item.isDirectory}
            icon={item.icon}
            size="large"
            context="desktop"
          />
        </button>
      ))}
    </div>
  );
}

function FutureIntentModal() {
  const language = useLanguageStore((state) => state.current);
  const setIntent = usePortfolioStore((state) => state.setIntent);
  const futureModalOpen = usePortfolioStore((state) => state.futureModalOpen);
  const setFutureModalOpen = usePortfolioStore((state) => state.setFutureModalOpen);
  const launchApp = useLaunchApp();

  if (!futureModalOpen) return null;

  const chooseIntent = (intent: "hire" | "collaborate" | "curious") => {
    setIntent(intent);
    setFutureModalOpen(false);
    const prefillMessage =
      intent === "hire"
        ? "I want to hire you. Show me the strongest projects to evaluate fit."
        : intent === "collaborate"
          ? "I want to build with you. Show me how you think across disciplines."
          : "I'm curious. What should I explore first?";

    launchApp("chats", {
      initialData: {
        prefillMessage,
      },
    });
  };

  return (
    <div className="pointer-events-auto absolute inset-0 z-[9300] flex items-center justify-center bg-black/26 px-4 backdrop-blur-sm">
      <div className="w-full max-w-[420px] rounded-[28px] border border-white/12 bg-[rgba(248,242,230,0.96)] p-6 text-black shadow-[0_30px_110px_rgba(0,0,0,0.42)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[12px] uppercase tracking-[0.18em] text-black/45">
              {language === "zh" ? "未来触发" : "future trigger"}
            </div>
            <h2 className="mt-2 text-[34px] leading-none" style={{ fontFamily: '"Instrument Serif", serif' }}>
              you reached the future
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setFutureModalOpen(false)}
            className="rounded-full px-2 py-1 text-[11px] uppercase tracking-[0.14em] text-black/40"
          >
            close
          </button>
        </div>
        <div className="mt-6 grid gap-3">
          <Button className="justify-start rounded-full bg-black px-5 py-6 text-left text-white" onClick={() => chooseIntent("collaborate")}>
            I want to build with you
          </Button>
          <Button className="justify-start rounded-full bg-black px-5 py-6 text-left text-white" onClick={() => chooseIntent("hire")}>
            I want to hire you
          </Button>
          <Button className="justify-start rounded-full bg-black px-5 py-6 text-left text-white" onClick={() => chooseIntent("curious")}>
            I'm just curious
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PortfolioDesktop() {
  const launchApp = useLaunchApp();
  const language = useLanguageStore((state) => state.current);
  const selectedCategories = usePortfolioStore((state) => state.selectedCategories);
  const yearRange = usePortfolioStore((state) => state.yearRange);
  const timelineYear = usePortfolioStore((state) => state.timelineYear);
  const intent = usePortfolioStore((state) => state.intent);
  const worldResetNonce = usePortfolioStore((state) => state.worldResetNonce);
  const setCoordinatesLabel = usePortfolioStore((state) => state.setCoordinatesLabel);
  const setMapCameraState = usePortfolioStore((state) => state.setMapCameraState);
  const isCoverVisible = usePortfolioStore((state) => state.isCoverVisible);
  const isEntering = usePortfolioStore((state) => state.isEntering);
  const visitorLocation = usePortfolioStore((state) => state.visitorLocation);
  const visitorHelloSent = usePortfolioStore((state) => state.visitorHelloSent);
  const recordVisitorHello = usePortfolioStore((state) => state.recordVisitorHello);
  const setLastSelectedProject = usePortfolioStore((state) => state.setLastSelectedProject);
  const showCover = usePortfolioStore((state) => state.showCover);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const styleReadyRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const visitorMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const visitorBubbleTimerRef = useRef<number | null>(null);
  const singlePlaneMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const singlePlaneGlyphRef = useRef<HTMLElement | null>(null);
  const singlePlaneFrameRef = useRef<number | null>(null);
  const planePositionRef = useRef<[number, number]>(NEW_YORK);
  const planeBearingRef = useRef(90);        // target bearing (instantaneous)
  const planeBearingDisplayRef = useRef(90); // smoothly interpolated display bearing
  const planeInitializedRef = useRef(false);

  const hoverPopupRef = useRef<mapboxgl.Popup | null>(null);
  const onProjectClickRef = useRef<((slug: string) => void) | null>(null);

  const visibleProjects = useMemo(
    () =>
      getVisibleProjects({
        categories: selectedCategories,
        yearRange,
        timelineYear,
      }),
    [selectedCategories, timelineYear, yearRange],
  );

  const futureProgress =
    timelineYear <= PORTFOLIO_PRESENT_YEAR
      ? 0
      : clamp((timelineYear - PORTFOLIO_PRESENT_YEAR) / (3000 - PORTFOLIO_PRESENT_YEAR), 0, 1);
  const hiddenByCover = isCoverVisible && !isEntering;

  const setPlaneBearing = (bearing: number) => {
    if (!Number.isFinite(bearing)) return;
    planeBearingRef.current = bearing;
    planeBearingDisplayRef.current = bearing; // immediate snap (arrow keys / init)
    if (singlePlaneGlyphRef.current) {
      singlePlaneGlyphRef.current.style.transform = `rotate(${bearing - 90}deg)`;
    }
  };

  const movePlane = (position: [number, number], bearing?: number) => {
    planePositionRef.current = position;
    singlePlaneMarkerRef.current?.setLngLat(position);
    if (typeof bearing === "number") {
      setPlaneBearing(bearing);
    }
  };

  const flyPlaneTo = (
    from: [number, number],
    to: [number, number],
    duration: number,
    onComplete?: () => void,
  ) => {
    if (singlePlaneFrameRef.current !== null) {
      window.cancelAnimationFrame(singlePlaneFrameRef.current);
      singlePlaneFrameRef.current = null;
    }

    const map = mapRef.current;
    if (map && styleReadyRef.current) setRouteLine(map, from, to);

    const start = performance.now();
    let lastTs = start;

    const animatePlane = (timestamp: number) => {
      // Time-delta for bearing smoothing (cap at 50ms to avoid huge jumps on tab-switch)
      const dt = Math.min(timestamp - lastTs, 50);
      lastTs = timestamp;

      // raw ∈ [0,1] drives the easing; eased ∈ [0,1] drives the position
      const raw = clamp((timestamp - start) / duration, 0, 1);
      const eased = easeInOut(raw);
      const pos = slerpGreatCircle(from, to, eased);

      // Bearing: compute tangent from raw-parametric look-ahead (path-only, no easing)
      const lookAheadRaw = Math.min(raw + 0.018, 0.995);
      const posRaw = slerpGreatCircle(from, to, raw);
      const nextPosRaw = slerpGreatCircle(from, to, lookAheadRaw);
      const targetB = bearingBetween(posRaw, nextPosRaw);
      if (Number.isFinite(targetB)) {
        planeBearingRef.current = targetB;
      }

      // Smooth bearing display: exponential lerp toward target, shortest-path rotation
      // tau=80ms → ~80% convergence in ~130ms — snappy but no sudden spin
      const alpha = 1 - Math.exp(-dt / 80);
      const diff = angleDiff(planeBearingDisplayRef.current, planeBearingRef.current);
      planeBearingDisplayRef.current =
        ((planeBearingDisplayRef.current + diff * alpha) % 360 + 360) % 360;
      if (singlePlaneGlyphRef.current) {
        singlePlaneGlyphRef.current.style.transform = `rotate(${planeBearingDisplayRef.current - 90}deg)`;
      }

      planePositionRef.current = pos;
      singlePlaneMarkerRef.current?.setLngLat(pos);

      // Progressive trail: bright solid line traces flown path
      if (map && styleReadyRef.current) updateTrailLine(map, from, to, raw);

      if (raw < 1) {
        singlePlaneFrameRef.current = window.requestAnimationFrame(animatePlane);
      } else {
        singlePlaneFrameRef.current = null;
        planePositionRef.current = to;
        singlePlaneMarkerRef.current?.setLngLat(to);
        window.setTimeout(() => {
          const m = mapRef.current;
          if (m && styleReadyRef.current) {
            clearRouteLine(m);
            clearTrailLine(m);
          }
        }, 1400);
        onComplete?.();
      }
    };

    singlePlaneFrameRef.current = window.requestAnimationFrame(animatePlane);
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
    if (!token) {
      setCoordinatesLabel("Mapbox token missing");
      return;
    }

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/standard",
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
      projection: "globe",
      pitch: INITIAL_PITCH,
      antialias: true,
      attributionControl: false,
    });
    mapRef.current = map;

    const updateCoordinates = () => {
      const center = map.getCenter();
      setCoordinatesLabel(toCoordinatesLabel(center.lat, center.lng));
      setMapCameraState({ lat: center.lat, lng: center.lng }, map.getZoom());
    };

    const configureStyle = () => {
      if (!map.isStyleLoaded()) return;
      styleReadyRef.current = true;
      setMapReady(true);
      map.setProjection({ name: "globe" });
      if ("setConfigProperty" in map) {
        try {
          map.setConfigProperty("basemap", "showPointOfInterestLabels", false);
          map.setConfigProperty("basemap", "showPlaceLabels", false);
          map.setConfigProperty("basemap", "showRoadLabels", false);
          map.setConfigProperty("basemap", "showTransitLabels", false);
        } catch {
          // noop
        }
      }

      const layers = map.getStyle().layers ?? [];
      layers.forEach((layer) => {
        if (layer.type === "symbol") {
          map.setLayoutProperty(layer.id, "visibility", "none");
        }
        if (
          layer.type === "line" &&
          (layer.id.includes("boundary") || layer.id.includes("admin") || layer.id.includes("border"))
        ) {
          try {
            map.setPaintProperty(layer.id, "line-color", "rgba(205, 210, 218, 0.55)");
            map.setPaintProperty(layer.id, "line-opacity", 0.65);
          } catch {
            // noop
          }
        }
      });

      ensureRouteLayers(map);
      ensureTrailLayer(map);
    };

    map.on("style.load", configureStyle);
    map.on("load", () => {
      configureStyle();
      updateCoordinates();
      // Request geolocation proactively so the cover page shows the correct city
      requestVisitorLocation();
    });
    map.on("move", updateCoordinates);

    const requestVisitorLocation = () => {
      if (usePortfolioStore.getState().geolocationRequested) return;
      usePortfolioStore.getState().markGeolocationRequested();
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (position) => {
          usePortfolioStore.getState().setVisitorLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          usePortfolioStore.getState().setVisitorLocation(null);
        },
        {
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 60_000,
        },
      );
    };

    if ("permissions" in navigator && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((permission) => {
          if (permission.state === "granted") {
            requestVisitorLocation();
          }
        })
        .catch(() => {
          // noop
        });
    }

    map.on("click", requestVisitorLocation);
    map.on("dragstart", requestVisitorLocation);

    return () => {
      styleReadyRef.current = false;
      setMapReady(false);
      hoverPopupRef.current?.remove();
      hoverPopupRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [setCoordinatesLabel, setMapCameraState]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !styleReadyRef.current) return;
    const resetCenter: [number, number] = visitorLocation
      ? [visitorLocation.lng, visitorLocation.lat]
      : INITIAL_CENTER;
    map.flyTo({
      center: resetCenter,
      zoom: INITIAL_ZOOM,
      pitch: INITIAL_PITCH,
      speed: 0.7,
    });
  }, [mapReady, visitorLocation, worldResetNonce]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !styleReadyRef.current || !isEntering) return;

    const targetCenter: [number, number] = visitorLocation
      ? [visitorLocation.lng, visitorLocation.lat]
      : INITIAL_CENTER;

    requestAnimationFrame(() => {
      map.resize();
      // Jump to the target center at a slightly smaller zoom (globe fully centered),
      // then ease in to final zoom. Avoid very low zoom values that cause the
      // globe to snap to an incorrect position.
      map.jumpTo({
        center: targetCenter,
        zoom: INITIAL_ZOOM - 0.55,
        pitch: 0,
        bearing: 0,
      });
      map.easeTo({
        center: targetCenter,
        zoom: INITIAL_ZOOM,
        pitch: INITIAL_PITCH,
        duration: 1680,
        easing: (t) => 1 - (1 - t) * (1 - t) * (1 - t),
      });
    });
  }, [isEntering, mapReady, visitorLocation]);

  // When dock "World" icon is clicked (worldResetNonce increments), fly the single plane home.
  const prevWorldResetNonceRef = useRef(worldResetNonce);
  useEffect(() => {
    if (worldResetNonce === prevWorldResetNonceRef.current) return;
    prevWorldResetNonceRef.current = worldResetNonce;
    const map = mapRef.current;
    if (!map || !mapReady || !singlePlaneMarkerRef.current) return;

    const homeTarget: [number, number] = visitorLocation
      ? [visitorLocation.lng, visitorLocation.lat]
      : NEW_YORK;
    const from = planePositionRef.current;
    const omega = angularDistance(from, homeTarget);
    const duration = clamp(omega * 2200, 800, 3800);
    flyPlaneTo(from, homeTarget, duration);
  }, [mapReady, visitorLocation, worldResetNonce]);

  // Always-fresh click handler so markers never capture stale closures
  onProjectClickRef.current = (slug: string) => {
    const map = mapRef.current;
    const project = visibleProjects.find((p) => p.slug === slug);
    if (!project || !map) return;

    const from = planePositionRef.current;
    const to: [number, number] = [project.location.lng, project.location.lat];
    const omega = angularDistance(from, to);
    const duration = clamp(omega * 2200, 700, 3600);
    flyPlaneTo(from, to, duration);

    setLastSelectedProject(project.slug, { lat: project.location.lat, lng: project.location.lng });

    map.easeTo({
      center: to,
      zoom: Math.max(map.getZoom(), 4.2),
      pitch: 18,
      duration: Math.min(duration * 0.85, 2800),
      easing: (t) => 1 - (1 - t) * (1 - t),
    });

    launchApp("finder", { initialData: { mode: "project", projectSlug: project.slug }, multiWindow: true });
  };

  // Sync native GeoJSON pin layer with visible projects
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !styleReadyRef.current) return;

    const features = visibleProjects.map((project) => {
      const emphasis = getPinEmphasis(project, intent);
      return {
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [project.location.lng, project.location.lat],
        },
        properties: {
          slug: project.slug,
          title: textForLocale(project.title, language),
          category: getCategoryGroupLabel(project.category, language),
          color: emphasis.color,
          opacity: emphasis.opacity,
          scale: emphasis.scale,
          cover: project.media[0]?.file ?? "",
        },
      };
    });

    const geojson: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features,
    };

    const source = map.getSource(PINS_SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData(geojson);
    } else {
      map.addSource(PINS_SOURCE_ID, { type: "geojson", data: geojson });

      map.addLayer({
        id: PINS_BORDER_LAYER_ID,
        type: "circle",
        source: PINS_SOURCE_ID,
        paint: {
          "circle-radius": ["*", 7.5, ["get", "scale"]],
          "circle-color": "rgba(255,244,236,0.96)",
          "circle-opacity": ["get", "opacity"],
          "circle-blur": 0.15,
          "circle-emissive-strength": 0.9,
        },
      });

      map.addLayer({
        id: PINS_LAYER_ID,
        type: "circle",
        source: PINS_SOURCE_ID,
        paint: {
          "circle-radius": ["*", 4.8, ["get", "scale"]],
          "circle-color": ["get", "color"],
          "circle-opacity": ["get", "opacity"],
          "circle-stroke-width": 1,
          "circle-stroke-color": "rgba(70,24,28,0.32)",
          "circle-blur": 0.02,
          "circle-emissive-strength": 1,
        },
      });

      map.on("mouseenter", PINS_LAYER_ID, (e) => {
        map.getCanvas().style.cursor = "pointer";
        const f = e.features?.[0];
        if (!f || !f.geometry || f.geometry.type !== "Point") return;
        const coords = f.geometry.coordinates.slice() as [number, number];
        const props = f.properties!;
        const title = props.title as string;
        const category = props.category as string;
        const color = props.color as string;
        const cover = props.cover as string;

        const imgHtml = cover
          ? `<img src="${cover}" alt="" style="width:200px;height:100px;object-fit:cover;display:block;border-radius:10px 10px 0 0;" onerror="this.style.display='none'" />`
          : "";

        const html = `<div style="width:200px;background:rgba(255,255,255,0.97);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-radius:10px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',system-ui,sans-serif;box-shadow:0 8px 32px rgba(0,0,0,0.22),0 2px 6px rgba(0,0,0,0.08);">
          ${imgHtml}
          <div style="padding:8px 12px 10px;">
            <div style="font-size:12.5px;font-weight:600;color:rgba(0,0,0,0.88);line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${title}</div>
            <div style="display:flex;align-items:center;gap:5px;margin-top:3px;">
              <span style="width:6px;height:6px;border-radius:50%;background:${color};flex-shrink:0;display:inline-block;"></span>
              <span style="font-size:10.5px;color:rgba(0,0,0,0.50);">${category}</span>
            </div>
          </div>
        </div>`;

        hoverPopupRef.current?.remove();
        hoverPopupRef.current = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 12,
          className: "portfolio-pin-popup",
          maxWidth: "none",
        })
          .setLngLat(coords)
          .setHTML(html)
          .addTo(map);
      });

      map.on("mouseleave", PINS_LAYER_ID, () => {
        map.getCanvas().style.cursor = "";
        hoverPopupRef.current?.remove();
        hoverPopupRef.current = null;
      });

      map.on("click", PINS_LAYER_ID, (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const slug = f.properties?.slug as string;
        if (slug) onProjectClickRef.current?.(slug);
      });
    }
  }, [intent, language, mapReady, visibleProjects]);

  // Initialize or update the single plane marker once map is ready.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !styleReadyRef.current) return;
    if (planeInitializedRef.current) return;
    planeInitializedRef.current = true;

    const startPos: [number, number] = visitorLocation
      ? [visitorLocation.lng, visitorLocation.lat]
      : NEW_YORK;
    planePositionRef.current = startPos;

    const { element, glyph } = createPlaneElement(90);
    element.style.display = "none"; // temporarily hidden
    singlePlaneGlyphRef.current = glyph;
    singlePlaneMarkerRef.current = new mapboxgl.Marker({ element, anchor: "center" })
      .setLngLat(startPos)
      .addTo(map);
  }, [mapReady, visitorLocation]);

  // Visitor "Say Hello to JL" marker at visitor's location.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !styleReadyRef.current) return;

    if (!visitorLocation) {
      if (visitorBubbleTimerRef.current !== null) {
        window.clearTimeout(visitorBubbleTimerRef.current);
        visitorBubbleTimerRef.current = null;
      }
      visitorMarkerRef.current?.remove();
      visitorMarkerRef.current = null;
      return;
    }

    const helloTarget: [number, number] = [visitorLocation.lng, visitorLocation.lat];
    visitorMarkerRef.current?.remove();
    visitorMarkerRef.current = new mapboxgl.Marker({
      element: createVisitorHelloElement({
        sent: visitorHelloSent,
        onHello: () => {
          recordVisitorHello(visitorLocation);
          // Fly the single plane to New York (JL's location).
          const from = planePositionRef.current;
          const to = NEW_YORK;
          const omega = angularDistance(from, to);
          const duration = clamp(omega * 2200, 800, 3800);
          flyPlaneTo(from, to, duration);

          map.easeTo({
            center: to,
            zoom: Math.max(map.getZoom(), 3.1),
            pitch: 14,
            duration: Math.min(duration * 0.85, 3000),
            easing: (t) => 1 - (1 - t) * (1 - t),
          });
        },
      }),
      anchor: "bottom",
    })
      .setLngLat(helloTarget)
      .addTo(map);

    if (visitorHelloSent) {
      if (visitorBubbleTimerRef.current !== null) {
        window.clearTimeout(visitorBubbleTimerRef.current);
      }
      visitorBubbleTimerRef.current = window.setTimeout(() => {
        visitorMarkerRef.current?.remove();
        visitorMarkerRef.current = null;
        visitorBubbleTimerRef.current = null;
      }, 2400);
    }

    return () => {
      if (visitorBubbleTimerRef.current !== null) {
        window.clearTimeout(visitorBubbleTimerRef.current);
        visitorBubbleTimerRef.current = null;
      }
    };
  }, [mapReady, recordVisitorHello, visitorHelloSent, visitorLocation]);

  // Arrow key movement: user can fly the plane around the globe.
  useEffect(() => {
    if (!mapReady) return;
    const STEP = 2.5; // degrees per keypress

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const [lng, lat] = planePositionRef.current;
      let newPos: [number, number] | null = null;

      if (e.key === "ArrowUp") newPos = [lng, Math.min(85, lat + STEP)];
      else if (e.key === "ArrowDown") newPos = [lng, Math.max(-85, lat - STEP)];
      else if (e.key === "ArrowLeft") newPos = [((lng - STEP + 540) % 360) - 180, lat];
      else if (e.key === "ArrowRight") newPos = [((lng + STEP + 180) % 360) - 180, lat];

      if (!newPos) return;
      e.preventDefault();

      if (singlePlaneFrameRef.current !== null) {
        window.cancelAnimationFrame(singlePlaneFrameRef.current);
        singlePlaneFrameRef.current = null;
      }

      const from = planePositionRef.current;
      const b = bearingBetween(from, newPos);
      movePlane(newPos, b);
      mapRef.current?.easeTo({ center: newPos, duration: 260 });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mapReady]);

  useEffect(() => {
    return () => {
      if (singlePlaneFrameRef.current !== null) {
        window.cancelAnimationFrame(singlePlaneFrameRef.current);
      }
      if (visitorBubbleTimerRef.current !== null) {
        window.clearTimeout(visitorBubbleTimerRef.current);
      }
    };
  }, []);

  return (
    <div
      className={`absolute inset-0 overflow-hidden bg-[#07111d] transition duration-[1500ms] ease-[cubic-bezier(0.16,0.9,0.16,1)] ${hiddenByCover ? "opacity-0 blur-[16px]" : "opacity-100 blur-0"}`}
      style={{
        transitionDelay: hiddenByCover ? "0ms" : isEntering ? "40ms" : "0ms",
      }}
    >
      <div
        className="absolute inset-0 transition duration-500"
        style={{
          filter: futureProgress
            ? `blur(${(0.8 + futureProgress * 1.2).toFixed(2)}px) saturate(${(1 - futureProgress * 0.18).toFixed(2)})`
            : "none",
        }}
      >
        <div ref={containerRef} className="h-full w-full" />
      </div>
      <DesktopShortcuts />

      <button
        type="button"
        onClick={showCover}
        aria-label={language === "zh" ? "退出到封面" : "Exit to cover"}
        className="pointer-events-auto absolute right-4 bottom-4 z-[9200] inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/14 bg-[rgba(7,16,28,0.48)] text-white/88 shadow-[0_12px_32px_rgba(0,0,0,0.24)] backdrop-blur-xl transition hover:bg-[rgba(7,16,28,0.62)] md:right-5 md:bottom-5"
      >
        <X className="h-4 w-4" weight="bold" />
      </button>

      {futureProgress > 0 ? (
        <div
          className="pointer-events-none absolute inset-x-0 top-1/2 z-[9200] -translate-y-1/2 text-center text-[26px] text-white"
          style={{
            opacity: 0.22 + futureProgress * 0.42,
            fontFamily: '"Instrument Serif", serif',
            fontStyle: "italic",
          }}
        >
          the map beyond here is unwritten
        </div>
      ) : null}
      <FutureIntentModal />

      {!import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ? (
        <div className="pointer-events-none absolute inset-0 z-[9200] flex items-center justify-center text-sm text-white/70">
          Mapbox token missing.
        </div>
      ) : null}
    </div>
  );
}
