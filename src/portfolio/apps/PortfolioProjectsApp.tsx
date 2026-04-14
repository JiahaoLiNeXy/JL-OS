import { useMemo, useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MapPin, CalendarDots, X } from "@phosphor-icons/react";
import { WindowFrame } from "@/components/layout/WindowFrame";
import type { AppProps } from "@/apps/base/types";
import { portfolioProjects } from "@/content/generated/portfolio-data";
import type { ProjectDisplay } from "@/content/types";
import { useLanguageStore } from "@/stores/useLanguageStore";
import { useLaunchApp } from "@/hooks/useLaunchApp";
import { usePortfolioStore } from "@/portfolio/store";
import {
  PORTFOLIO_CATEGORY_GROUPS,
  categoriesMatchGroup,
  matchesProjectQuery,
  textForLocale,
} from "@/portfolio/helpers";
import { cn } from "@/lib/utils";

type ProjectsInitialData = {
  mode?: "browser" | "project";
  projectSlug?: string;
  query?: string;
};

function ProjectCard({
  project,
  compact,
  onOpen,
}: {
  project: ProjectDisplay;
  compact: boolean;
  onOpen: () => void;
}) {
  const language = useLanguageStore((state) => state.current);
  const title = textForLocale(project.title, language);
  const subtitle = textForLocale(project.summary, language);
  const category = textForLocale(project.categoryLabel, language);
  const cover = project.media.find((media) => media.id === project.heroMediaId) ?? project.media[0];

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group text-left rounded-[14px] border border-black/10 bg-white/80 shadow-[0_18px_40px_rgba(0,0,0,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(0,0,0,0.12)]",
        compact ? "flex gap-4 p-3 items-center" : "overflow-hidden",
      )}
    >
      {cover ? (
        <div className={cn(compact ? "h-24 w-28 overflow-hidden rounded-[10px] shrink-0" : "aspect-[4/3] overflow-hidden")}>
          <img
            src={cover.file}
            alt={title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        </div>
      ) : null}
      <div className={cn(compact ? "min-w-0 flex-1" : "p-4")}>
        <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-black/45">
          <span>{category}</span>
          <span>{project.publishYear}</span>
        </div>
        <h3 className="mt-2 text-[18px] font-semibold leading-tight text-black">{title}</h3>
        <p className="mt-2 line-clamp-3 text-[13px] leading-6 text-black/65">{subtitle}</p>
      </div>
    </button>
  );
}

function ProjectsBrowserView({ initialQuery = "" }: { initialQuery?: string }) {
  const language = useLanguageStore((state) => state.current);
  const launchApp = useLaunchApp();
  const categories = usePortfolioStore((state) => state.selectedCategories);
  const setSelectedCategories = usePortfolioStore((state) => state.setSelectedCategories);
  const [query] = useState(initialQuery);

  const results = useMemo(() => {
    return portfolioProjects
      .filter((project) => categories.includes(project.category))
      .filter((project) => matchesProjectQuery(project, query, language))
      .sort((left, right) => right.publishYear - left.publishYear);
  }, [categories, language, query]);

  const groupSummary = useMemo(
    () =>
      PORTFOLIO_CATEGORY_GROUPS.map((group) => ({
        ...group,
        count: portfolioProjects.filter((project) => group.categories.includes(project.category)).length,
        active: categoriesMatchGroup(categories, group.categories),
      })),
    [categories],
  );

  return (
    <div className="h-full overflow-auto bg-[#eef1f5] text-black">
      <div className="flex flex-col">
        <div className="border-b border-black/10 bg-white/70 px-4 py-2">
          <div className="flex flex-wrap items-center gap-1">
            <span className="mr-2 text-[11px] uppercase tracking-[0.18em] text-black/40">Filter</span>
            {groupSummary.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => setSelectedCategories(group.categories)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] transition",
                  group.active ? "bg-black/[0.10] font-medium" : "bg-black/[0.04]",
                )}
              >
                <span>{textForLocale(group.label, language)}</span>
                <span className="text-[10px] text-black/40">{group.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1">
          <div className="px-5 py-5">
            {results.length ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {results.map((project) => (
                  <ProjectCard
                    key={project.slug}
                    project={project}
                    compact={false}
                    onOpen={() =>
                      launchApp("finder", {
                        initialData: { mode: "project", projectSlug: project.slug } satisfies ProjectsInitialData,
                        multiWindow: true,
                      })
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-[24px] border border-black/10 bg-white/80 p-8 shadow-[0_18px_40px_rgba(0,0,0,0.06)]">
                <div className="text-[11px] uppercase tracking-[0.18em] text-black/40">
                  {language === "zh" ? "文件夹" : "Folder"}
                </div>
                <h3 className="mt-2 text-[28px] leading-none text-black" style={{ fontFamily: '"Instrument Serif", serif' }}>
                  {initialQuery === "workflow"
                    ? language === "zh"
                      ? "Workflow"
                      : "Workflow"
                    : language === "zh"
                      ? "暂无结果"
                      : "No results"}
                </h3>
                <p className="mt-4 max-w-[560px] text-[14px] leading-7 text-black/65">
                  {initialQuery === "workflow"
                    ? language === "zh"
                      ? "workflow 文件夹目前作为独立入口保留在桌面。地图仍然只展示公开作品集项目。"
                      : "the workflow folder stays as a separate desktop entry for now. the globe still only shows the public portfolio set."
                    : language === "zh"
                      ? "当前筛选条件下没有匹配的项目。"
                      : "no projects matched the current filters."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectGallery({
  project,
  onLightbox,
}: {
  project: ProjectDisplay;
  onLightbox: (index: number) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {project.media.map((media, index) => (
        <button
          key={media.id}
          type="button"
          className="overflow-hidden rounded-[14px] bg-black/[0.04]"
          onClick={() => onLightbox(index)}
        >
          <img src={media.file} alt="" className="h-full w-full object-cover transition duration-300 hover:scale-[1.02]" />
        </button>
      ))}
    </div>
  );
}

function ProjectView({ project }: { project: ProjectDisplay }) {
  const language = useLanguageStore((state) => state.current);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const addOpenedProject = usePortfolioStore((state) => state.addOpenedProject);

  useEffect(() => {
    addOpenedProject(project.slug);
  }, [addOpenedProject, project.slug]);

  const hero = project.media.find((media) => media.id === project.heroMediaId) ?? project.media[0];
  const location = textForLocale(project.location.text, language);

  return (
    <div className="h-full overflow-auto bg-[#f3f1ec]">
      <div className="mx-auto max-w-[1120px] px-5 py-6 md:px-8 md:py-8">
        {hero ? (
          <div className="overflow-hidden rounded-[24px] bg-black">
            <img src={hero.file} alt={textForLocale(project.title, language)} className="h-auto w-full object-cover" />
          </div>
        ) : null}

        <div className="mt-6 space-y-6">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-black/45">
              {textForLocale(project.categoryLabel, language)} · {project.publishYear}
            </div>
            <h1 className="mt-2 text-[34px] font-semibold leading-tight text-black">
              {textForLocale(project.title, language)}
            </h1>
            <p className="mt-4 max-w-[860px] text-[16px] leading-8 text-black/70">{textForLocale(project.summary, language)}</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-[18px] border border-black/10 bg-white/70 p-5 shadow-[0_12px_30px_rgba(0,0,0,0.05)]">
              <div className="text-[11px] uppercase tracking-[0.16em] text-black/40">Core Question</div>
              <p className="mt-2 text-[15px] leading-7 text-black">{textForLocale(project.coreQuestion, language)}</p>
            </div>

            <div className="rounded-[18px] border border-black/10 bg-white/70 p-5 shadow-[0_12px_30px_rgba(0,0,0,0.05)]">
              <div className="grid gap-4 text-[13px] leading-6 text-black/70 md:grid-cols-2">
                <div className="flex items-start gap-2">
                  <MapPin className="mt-1 h-4 w-4 text-black/45" />
                  <span>{location}</span>
                </div>
                <div className="flex items-start gap-2">
                  <CalendarDots className="mt-1 h-4 w-4 text-black/45" />
                  <span>{project.publishYear}</span>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.16em] text-black/40">Role</div>
                  <p className="mt-1">{project.roles.join(", ")}</p>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.16em] text-black/40">Tools</div>
                  <p className="mt-1">{project.tools.join(", ")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-8">
          {project.sections.map((section) => (
            <section key={section.id} className="space-y-3">
              <div className="text-[12px] uppercase tracking-[0.18em] text-black/38">
                {textForLocale(section.title, language)}
              </div>
              <div className="rounded-[18px] border border-black/10 bg-white/70 p-5 shadow-[0_12px_30px_rgba(0,0,0,0.05)]">
                <div className="prose prose-neutral max-w-none text-[14px] leading-7">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {textForLocale(section.content, language)}
                  </ReactMarkdown>
                </div>
                {section.mediaRefs?.length ? (
                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {section.mediaRefs
                      .map((ref) => project.media.find((media) => media.id === ref))
                      .filter((media): media is NonNullable<typeof media> => Boolean(media))
                      .map((media) => (
                        <img key={media.id} src={media.file} alt="" className="rounded-[14px] border border-black/10" />
                      ))}
                  </div>
                ) : null}
              </div>
            </section>
          ))}
        </div>

        {project.media.length > 1 ? (
          <section className="mt-10">
            <div className="mb-4 text-[12px] uppercase tracking-[0.18em] text-black/38">
              {project.windowType === "gallery" ? "Gallery" : "Selected Media"}
            </div>
            <ProjectGallery project={project} onLightbox={setLightboxIndex} />
          </section>
        ) : null}
      </div>

      {lightboxIndex !== null ? (
        <div className="fixed inset-0 z-[12000] flex items-center justify-center bg-black/80 p-6" onClick={() => setLightboxIndex(null)}>
          <button
            type="button"
            className="absolute right-5 top-5 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white"
            onClick={() => setLightboxIndex(null)}
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={project.media[lightboxIndex]?.file}
            alt=""
            className="max-h-[88vh] max-w-[88vw] rounded-[18px] shadow-[0_30px_90px_rgba(0,0,0,0.45)]"
          />
        </div>
      ) : null}
    </div>
  );
}

export function PortfolioProjectsApp({
  onClose,
  isWindowOpen,
  isForeground = true,
  skipInitialSound,
  instanceId,
  initialData,
}: AppProps<unknown>) {
  if (!isWindowOpen) return null;

  const parsedInitialData = (initialData as ProjectsInitialData | undefined) ?? {};
  const mode = parsedInitialData.mode ?? "browser";
  const project =
    parsedInitialData.projectSlug
      ? portfolioProjects.find((item) => item.slug === parsedInitialData.projectSlug)
      : undefined;
  const title = project
    ? textForLocale(project.title, useLanguageStore.getState().current)
    : parsedInitialData.query === "workflow"
      ? "Workflow"
      : "Projects";

  return (
    <WindowFrame
      title={title}
      onClose={onClose}
      isForeground={isForeground}
      appId="finder"
      skipInitialSound={skipInitialSound}
      instanceId={instanceId}
    >
      {mode === "project" && project ? (
        <ProjectView project={project} />
      ) : (
        <ProjectsBrowserView initialQuery={parsedInitialData.query} />
      )}
    </WindowFrame>
  );
}
