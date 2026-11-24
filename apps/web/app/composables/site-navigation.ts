import { suggest } from "@riftkeeper/search/suggest";
import type { NavLink } from "@riftkeeper/ui";

export function useSiteNavigation(currentHref: string | null = "/") {
  const links: NavLink[] = [
    { label: "Cards", href: "/", current: currentHref === "/" },
    { label: "Deck", href: "/deck", current: currentHref === "/deck" },
    { label: "Random", href: "/random", current: currentHref === "/random" },
  ];
  const query = ref("");
  const caret = ref(0);
  const suggestions = computed(() => suggest(query.value, caret.value));

  function navigate(href: string) {
    return navigateTo(href);
  }

  function search(text: string) {
    return navigateTo({ path: "/", query: text ? { q: text } : {} });
  }

  return { links, query, caret, suggestions, navigate, search };
}
