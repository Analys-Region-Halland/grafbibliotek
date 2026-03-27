import { useState, useEffect, useCallback } from "react";

export type Route =
  | { view: "dashboard" }
  | { view: "analys" }
  | { view: "artikel"; slug: string };

function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, "");
  if (!path || path === "/") return { view: "dashboard" };

  // #/analys/slug
  const artikelMatch = path.match(/^analys\/(.+)$/);
  if (artikelMatch) return { view: "artikel", slug: artikelMatch[1] };

  // #/analys
  if (path === "analys") return { view: "analys" };

  return { view: "dashboard" };
}

export function useHash() {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));

  useEffect(() => {
    const handler = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  const navigate = useCallback((path: string) => {
    window.location.hash = path;
  }, []);

  return { route, navigate };
}
