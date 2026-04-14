/**
 * Prepends Vite's BASE_URL to absolute paths.
 * Needed for GitHub Pages subpath deployments (e.g. /JL-OS/).
 */
export function withBase(path: string): string {
  if (!path.startsWith("/")) return path;
  const base = import.meta.env.BASE_URL ?? "/";
  return `${base.replace(/\/$/, "")}${path}`;
}
