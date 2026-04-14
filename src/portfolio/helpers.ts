import type {
  LocalizedText,
  PortfolioCategory,
  ProjectDisplay,
  ProjectYearMode,
  VisitorIntent,
} from "@/content/types";
import { portfolioProjects } from "@/content/generated/portfolio-data";
import type { LanguageCode } from "@/stores/useLanguageStore";

export const PORTFOLIO_CATEGORIES: PortfolioCategory[] = [
  "Architecture",
  "Interior",
  "Software",
  "Branding",
  "Photography",
  "Web",
  "Industrial",
];

export type PortfolioCategoryGroupId = "space" | "product" | "marketing" | "photography";

export const PORTFOLIO_CATEGORY_GROUPS: Array<{
  id: PortfolioCategoryGroupId;
  label: LocalizedText;
  categories: PortfolioCategory[];
}> = [
  {
    id: "space",
    label: { en: "space", zh: "space" },
    categories: ["Architecture", "Interior"],
  },
  {
    id: "product",
    label: { en: "product", zh: "product" },
    categories: ["Software", "Industrial"],
  },
  {
    id: "marketing",
    label: { en: "marketing", zh: "marketing" },
    categories: ["Branding", "Web"],
  },
  {
    id: "photography",
    label: { en: "photography", zh: "photography" },
    categories: ["Photography"],
  },
];

export const PORTFOLIO_PRESENT_YEAR = 2026;
export const PORTFOLIO_START_YEAR = 1997;

export function getPortfolioLocale(language: LanguageCode): "en" | "zh" {
  return language === "zh" ? "zh" : "en";
}

export function categoriesMatchGroup(
  selectedCategories: PortfolioCategory[],
  categories: PortfolioCategory[],
): boolean {
  if (selectedCategories.length !== categories.length) return false;
  const selected = new Set(selectedCategories);
  return categories.every((category) => selected.has(category));
}

export function getCategoryGroupId(category: PortfolioCategory): PortfolioCategoryGroupId {
  if (category === "Architecture" || category === "Interior") {
    return "space";
  }
  if (category === "Software" || category === "Industrial") {
    return "product";
  }
  if (category === "Branding" || category === "Web") {
    return "marketing";
  }
  return "photography";
}

export function getCategoryGroupLabel(
  category: PortfolioCategory,
  language: LanguageCode,
): string {
  const group = PORTFOLIO_CATEGORY_GROUPS.find((item) => item.id === getCategoryGroupId(category));
  return textForLocale(group?.label ?? getCategoryGroupId(category), language);
}

export function textForLocale(
  value: LocalizedText | string | undefined,
  language: LanguageCode,
): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value[getPortfolioLocale(language)] ?? value.en;
}

export function getProjectBySlug(slug: string): ProjectDisplay | undefined {
  return portfolioProjects.find((project) => project.slug === slug);
}

export function getProjectYearRange(yearMode: ProjectYearMode): [number, number] {
  if (yearMode.type === "point") {
    return [yearMode.year, yearMode.year];
  }
  return [yearMode.start, PORTFOLIO_PRESENT_YEAR];
}

export function getVisibleProjects(options: {
  categories: PortfolioCategory[];
  yearRange: [number, number];
  timelineYear: number;
}): ProjectDisplay[] {
  const { categories, timelineYear } = options;
  return portfolioProjects.filter((project) => {
    if (!categories.includes(project.category)) {
      return false;
    }
    const [startYear] = getProjectYearRange(project.yearMode);
    return startYear <= timelineYear;
  });
}

export function matchesProjectQuery(
  project: ProjectDisplay,
  query: string,
  language: LanguageCode,
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const fields = [
    textForLocale(project.title, language),
    textForLocale(project.subtitle, language),
    textForLocale(project.summary, language),
    textForLocale(project.location.text, language),
    ...project.tags,
    ...project.roles,
    ...project.tools,
  ];

  return fields.some((field) => field.toLowerCase().includes(normalized));
}

export function getIntentProjectIds(intent: VisitorIntent): string[] {
  switch (intent) {
    case "hire":
      return ["dinder", "anyhome", "booky", "jw-jeju-e-brochure"];
    case "collaborate":
      return [
        "calligraphy-museum",
        "yixing-tao-museum",
        "dinder",
        "wave-glasses",
        "cloud-chair",
      ];
    case "curious":
      return ["photography", "wave-glasses", "truth-perfume", "micro-island-beijing"];
    default:
      return [];
  }
}

export function getPinEmphasis(project: ProjectDisplay, intent: VisitorIntent): {
  opacity: number;
  scale: number;
  color: string;
} {
  if (intent === "none") {
    return { opacity: 1, scale: 1, color: "#ff4d5a" };
  }

  const highlighted = getIntentProjectIds(intent).includes(project.slug);
  if (highlighted) {
    return {
      opacity: 1,
      scale: 1.15,
      color: intent === "hire" ? "#ff3b30" : intent === "collaborate" ? "#ff6b35" : "#ff7b54",
    };
  }

  return {
    opacity: 0.6,
    scale: 0.92,
    color: "#d96a72",
  };
}

export function getTimelineDisplayLabel(year: number): string {
  return String(Math.round(year));
}

export function getClosestProjectCenter(projects: ProjectDisplay[]): { lat: number; lng: number } | null {
  if (!projects.length) return null;

  const total = projects.reduce(
    (acc, project) => {
      acc.lat += project.location.lat;
      acc.lng += project.location.lng;
      return acc;
    },
    { lat: 0, lng: 0 },
  );

  return {
    lat: total.lat / projects.length,
    lng: total.lng / projects.length,
  };
}
