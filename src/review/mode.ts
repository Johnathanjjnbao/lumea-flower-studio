// Vite replaces MODE at build time. Only an explicitly requested review build on
// loopback may expose fixtures; the ordinary production build can never opt in
// through a URL parameter, localStorage value, or stale browser session.
const reviewBuild = import.meta.env?.MODE === "review";
export const reviewMode = reviewBuild
  && typeof window !== "undefined"
  && (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost");

export function assertLiveBackendAllowed() {
  if (reviewBuild) throw new Error("REVIEW_MODE_LIVE_BACKEND_DISABLED");
}
