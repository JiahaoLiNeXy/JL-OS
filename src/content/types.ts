export type Locale = "en" | "zh";

export type LocalizedText = {
  en: string;
  zh: string;
};

export type PortfolioCategory =
  | "Architecture"
  | "Interior"
  | "Software"
  | "Branding"
  | "Photography"
  | "Web"
  | "Industrial";

export type ProjectWindowType =
  | "software-demo"
  | "architecture-3d"
  | "gallery"
  | "case-study"
  | "essay";

export type VisitorIntent = "hire" | "collaborate" | "curious" | "none";

export type ProjectYearMode =
  | { type: "point"; year: number }
  | { type: "range"; start: number; end: "present" };

export interface ProjectMedia {
  id: string;
  order: number;
  file: string;
  type: "render" | "image" | "video" | "interactive";
  caption?: LocalizedText;
}

export interface ProjectSection {
  id: string;
  title: LocalizedText;
  content: LocalizedText;
  mediaRefs?: string[];
}

export interface ProjectDisplay {
  projectId: string;
  slug: string;
  title: LocalizedText;
  subtitle: LocalizedText;
  summary: LocalizedText;
  category: PortfolioCategory;
  categoryLabel: LocalizedText;
  location: {
    text: LocalizedText;
    lat: number;
    lng: number;
  };
  publishYear: number;
  yearMode: ProjectYearMode;
  windowType: ProjectWindowType;
  coreQuestion: LocalizedText;
  audience: string[];
  tags: string[];
  roles: string[];
  tools: string[];
  media: ProjectMedia[];
  sections: ProjectSection[];
  heroMediaId?: string;
}

export interface CoverLinkConfig {
  instagram: string;
  email: string;
  xiaohongshu: string;
  x: string;
  github: string;
  linkedin: string;
  resume: string | null;
  dinderShortcut: string;
}
