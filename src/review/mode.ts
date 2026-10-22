// Both demo modes are build-time choices. The hosted build has one exact Pages
// project path; it cannot turn the separate production Pages project into a demo.
const mode = import.meta.env?.MODE;
export const reviewBuild = mode === "review" || mode === "review-hosted" || mode === "review-cloudflare";
const base = import.meta.env?.BASE_URL ?? "/";
const baseWithoutSlash = base.endsWith("/") ? base.slice(0, -1) : base;

export const reviewMode = reviewBuild && typeof window !== "undefined" && (() => {
  const { hostname, pathname, protocol } = window.location;
  const onExpectedPath = pathname === baseWithoutSlash || pathname.startsWith(`${baseWithoutSlash}/`);
  const loopback = hostname === "127.0.0.1" || hostname === "localhost";
  return onExpectedPath && (mode === "review"
    ? loopback
    : mode === "review-cloudflare"
      ? loopback || (protocol === "https:" && hostname === import.meta.env.VITE_REVIEW_HOSTNAME)
      : loopback || (hostname === "johnathanjjnbao.github.io" && protocol === "https:"));
})();

export function assertLiveBackendAllowed() {
  if (reviewBuild) throw new Error("REVIEW_MODE_LIVE_BACKEND_DISABLED");
}
