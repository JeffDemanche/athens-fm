import { Analytics } from "@vercel/analytics/react";
import { matchPath, useLocation } from "react-router-dom";

/** Route templates used for dashboard rollup (avoid per-room URL fragmentation). */
const ROUTE_PATTERNS = [
  "/rooms/:roomId/host",
  "/rooms/:roomId",
  "/",
] as const;

function resolveRoute(pathname: string): string {
  for (const pattern of ROUTE_PATTERNS) {
    if (matchPath({ path: pattern, end: true }, pathname)) {
      return pattern;
    }
  }
  return pathname;
}

/** Must render inside `BrowserRouter` so location changes fire pageviews. */
export function VercelAnalytics() {
  const { pathname } = useLocation();
  const route = resolveRoute(pathname);

  return <Analytics route={route} path={pathname} />;
}
