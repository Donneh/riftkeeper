<script setup lang="ts">
import type { PricedCard } from "@riftkeeper/cards/prices";
import { suggest } from "@riftkeeper/search/suggest";
import {
  AppShell,
  type BuilderLegality,
  type BuilderScope,
  BuilderSearch,
  BuilderStats,
  CardPicker,
  DeckBuilderExtras,
  DeckBuilderHeader,
  DeckBuilderLayout,
  type DeckHandCard,
  DeckPiles,
  type Domain,
  domainScope,
  type PileGrouping,
  SavedDecks,
  SiteFooter,
  SiteNavbar,
  StatusMessage,
} from "@riftkeeper/ui";
import { browserStorage, useTheme } from "~/composables/theme";
import { builderCard, builderResult, pickerCard, pileGroups, statsContent } from "~/utils/builder-view";
import { fetchAllCards, fetchCardPage } from "~/utils/card-search";
import {
  BATTLEFIELD_COUNT,
  type BuilderDeck,
  battlefieldsQuery,
  championsQuery,
  DEFAULT_DECK_NAME,
  deckList,
  defaultPrinting,
  emptyDeck,
  fromCheckedDeck,
  isChampionOf,
  legalCardsQuery,
  MAIN_DECK_SIZE,
  mainCount,
  RUNE_DECK_SIZE,
  withBattlefield,
  withCard,
  withChampion,
  withLegend,
  withoutBattlefield,
  withoutCard,
  withRunes,
} from "~/utils/deck-builder";
import { checkDeck, handCards } from "~/utils/deck-check";
import { sampleHand } from "~/utils/deck-odds";
import { localDeckStore, type StoredDeck } from "~/utils/deck-store";
import { RIOT_NOTICE } from "~/utils/riot-notice";

type Stage = "legend" | "champion" | "build";

const SEARCH_DELAY_MS = 250;
const CHECK_DELAY_MS = 600;
const DOMAINS: readonly Domain[] = ["fury", "calm", "mind", "body", "chaos", "order"];
const EXAMPLES = ["type:unit cost:<=2", "ability:draw", "might:>=4", "type:spell"];

const route = useRoute();
const theme = useTheme();
const { apiBase } = useRuntimeConfig().public;
const {
  links: navLinks,
  query: navQuery,
  caret: navCaret,
  suggestions: navSuggestions,
  navigate,
  search: navSearch,
} = useSiteNavigation("/build");
const store = localDeckStore(browserStorage);

const deck = ref<BuilderDeck>(emptyDeck());
const deckId = ref<string>("");
const stage = ref<Stage>("legend");
const loadError = ref<string | null>(null);
const loading = ref(true);
const savedDecks = ref<readonly StoredDeck[]>([]);

const { data: legends, status: legendStatus, refresh: refreshLegends } = useLazyAsyncData("builder-legends", () =>
  fetchAllCards(apiBase, "type:legend"),
);
const legendFilter = ref<Domain | null>(null);
const legendCards = computed(() =>
  (legends.value ?? [])
    .filter((legend) => legendFilter.value === null || legend.domains.includes(legendFilter.value))
    .toSorted((a, b) => a.name.localeCompare(b.name))
    .map((legend) => pickerCard(legend, legend.id === deck.value.legend?.id, legend.tags.join(", "))),
);

const champions = ref<readonly PricedCard[]>([]);
watch(
  () => deck.value.legend?.id,
  async () => {
    const legend = deck.value.legend;
    const query = legend === null ? null : championsQuery(legend);
    champions.value = query === null ? [] : ((await fetchAllCards(apiBase, query)) ?? []);
  },
);
const championCards = computed(() =>
  champions.value
    .filter((card) => deck.value.legend !== null && isChampionOf(card, deck.value.legend))
    .map((card) => pickerCard(card, card.id === deck.value.champion?.id, cardDetailText(card))),
);
const cardDetailText = (card: PricedCard) => `${card.energyCost ?? "–"} energy · ${card.might ?? "–"} might`;

const scope = ref<BuilderScope>("cards");
const query = ref("");
const caret = ref(0);
const querySuggestions = computed(() => suggest(query.value, caret.value));
const results = ref<readonly PricedCard[]>([]);
const resultTotal = ref<number | null>(null);
const resultPage = ref(1);
const resultHasMore = ref(false);
const resultWarnings = ref<readonly { readonly message: string }[]>([]);
const resultError = ref<string | null>(null);
const resultLoading = ref(false);
let searchRun = 0;
let searchTimer: ReturnType<typeof setTimeout> | undefined;

function fullQuery() {
  const legend = deck.value.legend;
  if (scope.value === "battlefields") return battlefieldsQuery(query.value);
  return legend === null ? null : legalCardsQuery(legend, query.value);
}

async function runSearch(page = 1) {
  const text = fullQuery();
  if (text === null) return;
  const run = ++searchRun;
  resultLoading.value = true;
  const outcome = await fetchCardPage(apiBase, text, page);
  if (run !== searchRun) return;
  resultLoading.value = false;
  if (outcome.kind === "error") {
    resultError.value = outcome.message;
    return;
  }
  resultError.value = null;
  results.value = page === 1 ? outcome.cards : [...results.value, ...outcome.cards];
  resultTotal.value = outcome.total;
  resultPage.value = page;
  resultHasMore.value = outcome.hasMore;
  resultWarnings.value = outcome.warnings;
}

watch([query, scope, () => deck.value.legend?.id], ([, nextScope], previous) => {
  clearTimeout(searchTimer);
  const immediate = previous === undefined || nextScope !== previous[1];
  if (immediate) resultTotal.value = null;
  searchTimer = setTimeout(() => runSearch(), immediate ? 0 : SEARCH_DELAY_MS);
});

const resultRows = computed(() =>
  results.value.map((card) => builderResult(deck.value, card, scope.value === "battlefields")),
);
const findCard = (id: string) =>
  [...results.value, ...deck.value.main.map(({ card }) => card), ...deck.value.battlefields].find((card) => card.id === id);

function add(id: string) {
  const card = findCard(id);
  if (!card) return;
  deck.value = card.type === "battlefield" ? withBattlefield(deck.value, card) : withCard(deck.value, card);
}

function remove(id: string) {
  const card = findCard(id);
  if (!card) return;
  deck.value = card.type === "battlefield" ? withoutBattlefield(deck.value, card) : withoutCard(deck.value, card);
}

function pickLegend(id: string) {
  const legend = legends.value?.find((card) => card.id === id);
  if (!legend) return;
  deck.value = withLegend(deck.value, legend);
  stage.value = championsQuery(legend) === null ? "build" : "champion";
}

function pickChampion(id: string | null) {
  deck.value = withChampion(deck.value, champions.value.find((card) => card.id === id) ?? null);
  stage.value = "build";
}

function findBattlefields() {
  scope.value = "battlefields";
  query.value = "";
}

const grouping = ref<PileGrouping>("cost");
const groups = computed(() => pileGroups(deck.value, grouping.value));
const stats = computed(() => statsContent(deck.value));
const runes = computed(() =>
  Object.entries(deck.value.runes).map(([domain, count]) => ({ domain: domain as Domain, count: count ?? 0 })),
);
const hand = ref<DeckHandCard[] | null>(null);

function draw() {
  hand.value = handCards(
    sampleHand(deck.value.main).map(({ card, count }) => ({ card, count, printing: defaultPrinting(card) })),
  );
}

const legality = ref<BuilderLegality>({ kind: "checking" });
let checkTimer: ReturnType<typeof setTimeout> | undefined;
let checkRun = 0;
watch(
  () => deckList(deck.value),
  (list) => {
    clearTimeout(checkTimer);
    hand.value = null;
    if (deck.value.legend === null) {
      legality.value = { kind: "checked", problems: ["Pick a legend."] };
      return;
    }
    legality.value = { kind: "checking" };
    const run = ++checkRun;
    checkTimer = setTimeout(async () => {
      const outcome = await checkDeck(apiBase, { list });
      if (run !== checkRun) return;
      if (outcome.kind !== "deck") legality.value = { kind: "error", message: outcome.message };
      else {
        const standard = outcome.check.formats.find((verdict) => verdict.format === "standard");
        legality.value = { kind: "checked", problems: standard?.problems.map(({ message }) => message) ?? [] };
      }
    }, CHECK_DELAY_MS);
  },
  { immediate: true },
);

const saveStatus = ref("Not saved yet");
watch(
  deck,
  async (value) => {
    if (loading.value || value.legend === null) return;
    await store.save({ id: deckId.value, name: value.name, legend: value.legend.name, list: deckList(value) });
    saveStatus.value = "Saved on this device";
    savedDecks.value = await store.list();
    if (route.query.id !== deckId.value) navigateTo({ query: { id: deckId.value } }, { replace: true });
  },
  { deep: true },
);

const UPDATED = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });
const savedSummaries = computed(() =>
  savedDecks.value.map((saved) => ({
    id: saved.id,
    name: saved.name,
    legend: saved.legend,
    updated: UPDATED.format(Date.parse(saved.updatedAt)),
    href: `/build?id=${encodeURIComponent(saved.id)}`,
  })),
);

async function load(id: unknown) {
  loading.value = true;
  loadError.value = null;
  hand.value = null;
  savedDecks.value = await store.list();
  const saved = typeof id === "string" ? await store.get(id) : null;
  deckId.value = saved?.id ?? crypto.randomUUID();
  if (saved === null) {
    deck.value = emptyDeck();
    stage.value = "legend";
    saveStatus.value = "Not saved yet";
  } else {
    const outcome = await checkDeck(apiBase, { list: saved.list });
    if (outcome.kind === "deck") {
      deck.value = fromCheckedDeck(outcome.check.deck, saved.name);
      stage.value = deck.value.legend === null ? "legend" : "build";
      saveStatus.value = "Saved on this device";
    } else loadError.value = outcome.message;
  }
  await nextTick();
  loading.value = false;
}

onMounted(() => load(route.query.id));
watch(
  () => route.query.id,
  (id) => {
    if (id !== deckId.value) load(id);
  },
);

async function removeSaved(id: string) {
  await store.remove(id);
  savedDecks.value = await store.list();
  if (id === deckId.value) navigateTo({ query: {} });
}

function startNew() {
  navigateTo({ query: {} });
  load(undefined);
}

function copyList() {
  return navigator.clipboard?.writeText(deckList(deck.value));
}

function openChecker() {
  return navigateTo({ path: "/deck", query: { list: deckList(deck.value) } });
}

const name = computed({
  get: () => deck.value.name,
  set: (value: string) => {
    deck.value = { ...deck.value, name: value || DEFAULT_DECK_NAME };
  },
});

const scopeAttrs = computed(() => (deck.value.legend ? domainScope(deck.value.legend.domains) : {}));
useHead(() => ({
  title: `${deck.value.legend ? deck.value.name : "Build a deck"} · Riftkeeper`,
  meta: [
    {
      name: "description",
      content: "Build a Riftbound deck: pick a legend and champion, then search the cards it can play, with live odds.",
    },
  ],
}));
</script>

<template>
  <AppShell title="Build a deck" class="build" v-bind="scopeAttrs">
    <template #header>
      <SiteNavbar
        v-model="navQuery"
        v-model:theme="theme"
        :links="navLinks"
        :suggestions="navSuggestions.suggestions"
        :hint="navSuggestions.hint"
        @caret="navCaret = $event"
        @search="navSearch"
        @navigate="navigate"
      />
    </template>
    <StatusMessage
      v-if="loadError"
      kind="error"
      title="Could not open the deck"
      :detail="loadError"
      action="Try again"
      @action="load(route.query.id)"
    />
    <DeckBuilderLayout v-else>
      <template #search>
        <BuilderSearch
          v-if="deck.legend"
          v-model="query"
          v-model:scope="scope"
          :domains="deck.legend.domains"
          :results="resultRows"
          :total="resultTotal"
          :loading="resultLoading"
          :error="resultError"
          :warnings="resultWarnings"
          :has-more="resultHasMore"
          :examples="EXAMPLES"
          :suggestions="querySuggestions.suggestions"
          :hint="querySuggestions.hint"
          @caret="caret = $event"
          @add="add"
          @remove="remove"
          @more="runSearch(resultPage + 1)"
          @retry="runSearch(1)"
        />
        <p v-else class="hint">Pick a legend first. Search then shows only the cards your deck can play.</p>
        <SavedDecks :decks="savedSummaries" :current="deckId" class="saved" @navigate="navigate" @remove="removeSaved" />
      </template>

      <div class="canvas">
        <DeckBuilderHeader
          v-model:name="name"
          :legend="deck.legend && builderCard(deck.legend)"
          :champion="deck.champion && builderCard(deck.champion)"
          :count="stage === 'build' && deck.legend ? mainCount(deck) : null"
          :size="MAIN_DECK_SIZE"
          :status="saveStatus"
          @legend="stage = 'legend'"
          @champion="stage = 'champion'"
        />
        <template v-if="loading" />
        <template v-else-if="stage === 'legend'">
          <StatusMessage v-if="legendStatus === 'pending' || legendStatus === 'idle'" kind="loading" title="Loading legends" />
          <StatusMessage
            v-else-if="!legends"
            kind="error"
            title="Could not load the legends"
            action="Try again"
            @action="refreshLegends"
          />
          <CardPicker
            v-else
            v-model:filter="legendFilter"
            heading="Pick your legend"
            :lede="`Your legend sets the deck's domains.${deck.legend ? ' Cards that don’t fit a new legend leave the deck.' : ''}`"
            :cards="legendCards"
            :filters="DOMAINS"
            @pick="pickLegend"
          />
        </template>
        <CardPicker
          v-else-if="stage === 'champion' && deck.legend"
          heading="Choose your champion"
          :lede="`Optional. Champion units named ${deck.legend.tags.join(', ')} match ${deck.legend.name}. The chosen one starts outside the deck and counts toward its ${MAIN_DECK_SIZE}.`"
          :cards="championCards"
          @pick="pickChampion"
        >
          <template #actions>
            <button type="button" class="skip" @click="pickChampion(null)">Skip for now</button>
          </template>
        </CardPicker>
        <template v-else-if="deck.legend">
          <DeckPiles v-model:grouping="grouping" :groups="groups" @add="add" @remove="remove" />
          <DeckBuilderExtras
            :battlefields="deck.battlefields.map((card) => builderCard(card))"
            :battlefield-count="BATTLEFIELD_COUNT"
            :runes="runes"
            :rune-count="RUNE_DECK_SIZE"
            @remove-battlefield="remove"
            @find-battlefields="findBattlefields"
            @runes="(domain, count) => (deck = withRunes(deck, domain, count))"
            @copy="copyList"
            @check="openChecker"
            @reset="startNew"
          />
        </template>
      </div>

      <template #stats>
        <BuilderStats :stats="stats" :legality="legality" :hand="hand" @draw="draw" />
      </template>
    </DeckBuilderLayout>
    <template #footer>
      <SiteFooter :notice="RIOT_NOTICE" />
    </template>
  </AppShell>
</template>

<style scoped>
.build :deep(.main),
.build :deep(.end) {
  max-width: 100rem;
}

.canvas {
  display: flex;
  flex-direction: column;
  gap: var(--rk-space-6);
}

.hint {
  margin: 0;
  padding: var(--rk-space-4);
  border: var(--rk-border-width) dashed var(--rk-color-border);
  border-radius: var(--rk-radius-lg);
  color: var(--rk-color-text-muted);
  font-size: var(--rk-font-size-sm);
}

.saved {
  margin-top: var(--rk-space-3);
}

.skip {
  min-height: var(--rk-control-height-sm);
  padding: 0 var(--rk-space-3);
  border: var(--rk-border-width) solid var(--rk-color-border);
  border-radius: var(--rk-radius-control);
  background: var(--rk-color-surface);
  color: var(--rk-color-text);
  font: var(--rk-font-weight-medium) var(--rk-font-size-sm) var(--rk-font-family);
  cursor: pointer;
}
</style>
