<script setup lang="ts">
import { AppShell, DeckForm, DeckReport, SiteFooter, SiteNavbar, StatusMessage } from "@riftkeeper/ui";
import { useTheme } from "~/composables/theme";
import { checkDeck, deckReport } from "~/utils/deck-check";
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

watch(outcome, (value) => {
  if (value?.kind !== "deck" || !input.value) return;
  const coded = codedInput(input.value, value.check);
  if (coded === null) return;
  draft.value = coded.code ?? "";
  partnerDraft.value = coded.partner ?? "";
  navigateTo({ query: deckQuery(coded) }, { replace: true });
});

const title = computed(() => {
  if (input.value === null) return "Check a deck";
  if (status.value === "pending" || !outcome.value) return "Checking the deck";
  if (outcome.value.kind === "deck") return report.value?.title ?? "Deck";
  return outcome.value.kind === "invalid" ? "Deck could not be read" : "Could not check the deck";
});
useHead(() => ({ title: `${title.value} · Riftkeeper` }));

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
    <DeckReport v-else-if="report" :report="report" @navigate="navigate" @copy="copy" />
    <template #footer>
      <SiteFooter :notice="RIOT_NOTICE" />
    </template>
  </AppShell>
</template>
