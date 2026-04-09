export function createResearchRouteKey() {
  return `research-${Date.now()}`;
}

export function getResearchRouteKey(pathname = window.location.pathname) {
  const path = pathname.replace(/^\/+|\/+$/g, "");

  if (!path) {
    return "home";
  }

  return path.replace(/\//g, "-");
}

export function navigateToNewResearchRoute() {
  const routeKey = createResearchRouteKey();

  window.history.pushState({ routeKey }, "", `/research/${routeKey}`);
  window.dispatchEvent(
    new CustomEvent("research:navigate", {
      detail: { routeKey },
    }),
  );

  return routeKey;
}
