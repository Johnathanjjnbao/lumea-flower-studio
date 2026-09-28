export function resolveHomepageTarget(target: string | null, localizePath: (path: string) => string) {
  if (!target) return "#top";
  return target.startsWith("/") ? localizePath(target) : target;
}
