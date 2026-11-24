<script setup lang="ts">
import {
  AppShell,
  DeckForm,
  type DeckHandCard,
  DeckReport,
  type DeckView,
  isDeckView,
  SiteFooter,
  SiteNavbar,
  StatusMessage,
} from "@riftkeeper/ui";
import { browserStorage, useTheme } from "~/composables/theme";
import { checkDeck, deckReport, handCards } from "~/utils/deck-check";
import { sampleHand } from "~/utils/deck-odds";
import { codedInput, deckInput, deckQuery, typedInput } from "~/utils/deck-url";
import { RIOT_NOTICE } from "~/utils/riot-notice";

const route = useRoute();
const theme = useTheme();
const { apiBase } = useRuntimeConfig().public;
const {
  links: navLinks,
  query: navQuery,
  caret: navCaret,
  suggestions: navSuggestions,
  navigate,
  search,
} = useSiteNavigation("/deck");

const input = computed(() => deckInput(route.query));
const draft = ref(input.value?.code ?? input.value?.list ?? "");
const partnerDraft = ref(input.value?.partner ?? input.value?.partnerList ?? "");

const {
  data: outcome,
  status,
  refresh,
} = useLazyAsyncData(
  () => `deck:${JSON.stringify(input.value)}`,
  () => (input.value === null ? Promise.resolve(null) : checkDeck(apiBase, input.value)),
);

const report = computed(() =>
  status.value !== "pending" && outcome.value?.kind === "deck" ? deckReport(outcome.value.check) : null,
);

const VIEW_STORAGE_KEY = "riftkeeper-deck-view";
const view = ref<DeckView>("list");
const hand = ref<DeckHandCard[] | null>(null);

onMounted(() => {
  try {
    const stored = browserStorage().getItem(VIEW_STORAGE_KEY);
    if (isDeckView(stored)) view.value = stored;
  } catch {
    return;
  }
});

function chooseView(next: DeckView) {
  view.value = next;
  try {
    browserStorage().setItem(VIEW_STORAGE_KEY, next);
  } catch {
    return;
  }
}

function draw() {
  if (outcome.value?.kind === "deck") hand.value = handCards(sampleHand(outcome.value.check.deck.main));
}

function compare(code: string) {
  return navigateTo({ query: { ...route.query, vs: code } });
}

function clearComparison() {
  const { vs: _, ...rest } = route.query;
  return navigateTo({ query: rest });
}

function copyList(list: string) {
  return navigator.clipboard?.writeText(list);
}

watch(input, () => {
  hand.value = null;
});

watch(outcome, (value) => {
  if (value?.kind !== "deck" || !input.value) return;
  const coded = codedInput(input.value, value.check);
  if (coded === null) return;
  draft.value = coded.code ?? "";
  partnerDraft.value = coded.partner ?? "";
  navigateTo({ query: deckQuery(coded) }, { replace: true });
});

const title = computed(() => {
  if (input.value === null) return "Riftbound deck checker";
  if (status.value === "pending" || !outcome.value) return "Checking the deck";
  if (outcome.value.kind === "deck") return report.value?.title ?? "Deck";
  return outcome.value.kind === "invalid" ? "Deck could not be read" : "Could not check the deck";
});
useHead(() => ({
  title: `${title.value} · Riftkeeper`,
  meta: [
    {
      name: "description",
      content:
        "Paste a Riftbound deck code or list to check it for Standard and 2v2, with upcoming bans, errata, the TCGplayer price and its trend, opening-hand odds and a tournament list.",
    },
  ],
}));

function check({ text, partner }: { text: string; partner: string }) {
  return navigateTo({ query: deckQuery(typedInput(text, partner)) });
}

function copy(code: string) {
  const url = new URL(`/deck?d=${encodeURIComponent(code)}`, window.location.origin);
  return navigator.clipboard?.writeText(`${code}\n${url}`);
}
</script>

<template>
  <AppShell :title="report ? undefined : title">
    <template #header>
      <SiteNavbar
        v-model="navQuery"
        v-model:theme="theme"
        :links="navLinks"
        :suggestions="navSuggestions.suggestions"
        :hint="navSuggestions.hint"
        @caret="navCaret = $event"
        @search="search"
        @navigate="navigate"
      />
    </template>
    <DeckForm v-model="draft" v-model:partner="partnerDraft" :busy="status === 'pending'" @check="check" />
    <StatusMessage v-if="input !== null && (status === 'pending' || !outcome)" kind="loading" :title="title" />
    <StatusMessage
      v-else-if="outcome?.kind === 'invalid'"
      kind="empty"
      :title="title"
      :detail="outcome.message"
    />
    <StatusMessage
      v-else-if="outcome?.kind === 'error'"
      kind="error"
      :title="title"
      :detail="outcome.message"
      action="Try again"
      @action="refresh"
    />
    <DeckReport
      v-else-if="report"
      :report="report"
      :view="view"
      :hand="hand"
      @navigate="navigate"
      @copy="copy"
      @copy-list="copyList"
      @view="chooseView"
      @draw="draw"
      @compare="compare"
      @clear-comparison="clearComparison"
    />
    <template #footer>
      <SiteFooter :notice="RIOT_NOTICE" />
    </template>
  </AppShell>
</template>
