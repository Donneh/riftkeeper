<script setup lang="ts">
import { ref, useId, watch } from "vue";
import CardText from "./CardText.vue";
import DeckCards from "./DeckCards.vue";
import DeckComparisonPanel from "./DeckComparisonPanel.vue";
import DeckOddsPanel from "./DeckOddsPanel.vue";
import type { DeckHandCard, DeckReportContent, DeckView } from "./deck-report.ts";
import { isPlainLeftClick } from "./link-click.ts";
import PriceSparkline from "./PriceSparkline.vue";

const props = defineProps<{ report: DeckReportContent; view: DeckView; hand: readonly DeckHandCard[] | null }>();
const emit = defineEmits<{
  navigate: [href: string];
  copy: [code: string];
  "copy-list": [list: string];
  view: [view: DeckView];
  draw: [];
  compare: [code: string];
  "clear-comparison": [];
}>();

const verdictsId = useId();
const errataId = useId();
const listId = useId();
const copied = ref(false);
const listCopied = ref(false);

watch(
  () => props.report.code,
  () => {
    copied.value = false;
    listCopied.value = false;
  },
);

function copyList(list: string) {
  emit("copy-list", list);
  listCopied.value = true;
}

function follow(event: MouseEvent, href: string) {
  if (!isPlainLeftClick(event)) return;
  event.preventDefault();
  emit("navigate", href);
}

function copy(code: string) {
  emit("copy", code);
  copied.value = true;
}
</script>

<template>
  <article class="report">
    <header class="head">
      <h1 class="title">{{ report.title }}</h1>
      <p class="meta">
        <span>Checked {{ report.checkedOn }}</span>
        <span v-if="report.price">
          <span class="price">{{ report.price.total }}</span> {{ report.price.note }}
        </span>
        <span v-if="report.price?.cheapest">{{ report.price.cheapest }}</span>
      </p>
      <div v-if="report.price?.trend" class="trend">
        <span class="trend-change">{{ report.price.trend.change }}</span>
        <span class="trend-text">{{ report.price.trend.description }}</span>
        <PriceSparkline class="trend-line" :days="report.price.trend.days" label="Deck price" />
      </div>
      <div class="actions">
        <button v-if="report.code" class="copy" type="button" @click="copy(report.code)">
          {{ copied ? "Deck code copied" : "Copy deck code" }}
        </button>
        <button class="copy" type="button" @click="copyList(report.list)">
          {{ listCopied ? "Tournament list copied" : "Copy tournament list" }}
        </button>
      </div>
    </header>

    <section class="verdicts" :aria-labelledby="verdictsId">
      <h2 :id="verdictsId" class="heading">Legality</h2>
      <div class="verdict-list">
        <div v-for="verdict in report.verdicts" :key="verdict.format" class="verdict" :data-legal="verdict.legal">
          <p class="verdict-title">
            <span class="format">{{ verdict.format }}</span>
            <span class="status">{{ verdict.label }}</span>
          </p>
          <p v-if="verdict.note" class="verdict-note">{{ verdict.note }}</p>
          <ul v-if="verdict.problems.length > 0" class="items" :aria-label="`${verdict.format} problems`">
            <li v-for="(problem, index) in verdict.problems" :key="index">{{ problem }}</li>
          </ul>
          <ul v-if="verdict.upcoming.length > 0" class="items upcoming" :aria-label="`${verdict.format} upcoming bans`">
            <li v-for="(ban, index) in verdict.upcoming" :key="index">
              {{ ban.text }}
              <a class="link" :href="ban.source.href" rel="noopener">{{ ban.source.label }}</a>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <DeckCards
      :sections="report.sections"
      :view="view"
      @view="emit('view', $event)"
      @navigate="emit('navigate', $event)"
    />

    <DeckComparisonPanel
      :comparison="report.comparison"
      @compare="emit('compare', $event)"
      @clear="emit('clear-comparison')"
      @navigate="emit('navigate', $event)"
    />

    <DeckOddsPanel v-if="report.odds" :odds="report.odds" :hand="hand" @draw="emit('draw')" />

    <section v-if="report.errata.length > 0" class="errata" :aria-labelledby="errataId">
      <h2 :id="errataId" class="heading">Errata on cards in this deck</h2>
      <ol class="notes">
        <li v-for="(note, index) in report.errata" :key="index" class="note">
          <p class="note-meta">
            <a class="link note-name" :href="note.href" @click="follow($event, note.href)">{{ note.name }}</a>
            <a class="link" :href="note.source.href" rel="noopener">{{ note.source.label }}</a>
          </p>
          <p class="label">New text</p>
          <CardText :text="note.current" />
          <p class="label">Previous text</p>
          <CardText class="previous" :text="note.previous" />
        </li>
      </ol>
    </section>

    <details class="list">
      <summary class="list-summary">Tournament list</summary>
      <pre :id="listId" class="list-text">{{ report.list }}</pre>
    </details>
  </article>
</template>

<style scoped>
.report {
  display: grid;
  gap: var(--rk-space-8);
  min-width: 0;
}

.head {
  display: grid;
  gap: var(--rk-space-2);
  justify-items: start;
}

.title {
  margin: 0;
  font-size: var(--rk-font-size-display);
  line-height: var(--rk-line-height-tight);
  letter-spacing: var(--rk-letter-spacing-display);
  overflow-wrap: anywhere;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0 var(--rk-space-4);
  margin: 0;
  color: var(--rk-color-text-muted);
  font-size: var(--rk-font-size-sm);
  font-variant-numeric: tabular-nums;
}

.price {
  color: var(--rk-color-text);
  font-weight: var(--rk-font-weight-bold);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--rk-space-2);
}

.trend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--rk-space-1) var(--rk-space-3);
  align-items: center;
  font-size: var(--rk-font-size-sm);
}

.trend-change {
  font: var(--rk-font-weight-bold) var(--rk-font-size-sm) var(--rk-font-family-mono);
}

.trend-text {
  color: var(--rk-color-text-muted);
}

.trend-line {
  width: min(16rem, 100%);
}

.list-summary {
  min-height: var(--rk-control-height-sm);
  color: var(--rk-color-text-muted);
  font: var(--rk-font-size-xs) var(--rk-font-family-mono);
  cursor: pointer;
}

.list-text {
  margin: var(--rk-space-2) 0 0;
  padding: var(--rk-space-3);
  overflow-x: auto;
  border: var(--rk-border-width) solid var(--rk-color-border);
  border-radius: var(--rk-radius-lg);
  background: var(--rk-color-surface);
  font: var(--rk-font-size-xs) / var(--rk-line-height) var(--rk-font-family-mono);
  white-space: pre-wrap;
}

.copy {
  min-height: var(--rk-control-height-sm);
  padding: 0 var(--rk-space-4);
  border: var(--rk-border-width) solid var(--rk-color-border);
  border-radius: var(--rk-radius-control);
  background: var(--rk-color-surface);
  color: var(--rk-color-text);
  font: var(--rk-font-weight-medium) var(--rk-font-size-sm) var(--rk-font-family-mono);
  cursor: pointer;
}

@media (hover: hover) {
  .copy:hover {
    border-color: var(--rk-color-accent);
  }
}

.copy:focus-visible {
  outline: var(--rk-focus-width) solid var(--rk-color-accent);
  outline-offset: 2px;
}

.verdicts,
.errata {
  display: grid;
  gap: var(--rk-space-3);
  min-width: 0;
}

.heading,
.label {
  margin: 0;
  color: var(--rk-color-text-muted);
  font: var(--rk-font-weight-regular) var(--rk-font-size-xs) var(--rk-font-family-mono);
}

.verdict-list {
  display: grid;
  gap: var(--rk-space-3);
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr));
}

.verdict {
  display: grid;
  align-content: start;
  gap: var(--rk-space-2);
  padding: var(--rk-space-3) var(--rk-space-4);
  border: var(--rk-border-width) solid var(--rk-color-danger-border);
  border-radius: var(--rk-radius-lg);
  background: var(--rk-color-danger-surface);
  color: var(--rk-color-danger-text);
  overflow-wrap: anywhere;
}

.verdict[data-legal="true"] {
  border-color: var(--rk-glass-edge);
  background: var(--rk-color-surface);
  color: var(--rk-color-text);
}

.verdict-title {
  display: flex;
  gap: var(--rk-space-2);
  align-items: baseline;
  margin: 0;
  font-weight: var(--rk-font-weight-bold);
}

.verdict-title::before {
  content: "✕" / "";
}

.verdict[data-legal="true"] .verdict-title::before {
  content: "✓" / "";
}

.status {
  font-weight: var(--rk-font-weight-regular);
}

.verdict-note {
  margin: 0;
  font-size: var(--rk-font-size-sm);
  opacity: 0.8;
}

.items {
  display: grid;
  gap: var(--rk-space-1);
  margin: 0;
  padding-left: var(--rk-space-5);
  font-size: var(--rk-font-size-sm);
}

.items.upcoming {
  padding: var(--rk-space-2) var(--rk-space-3) var(--rk-space-2) var(--rk-space-6);
  border: var(--rk-border-width) solid var(--rk-color-warning-border);
  border-radius: var(--rk-radius-md);
  background: var(--rk-color-warning-surface);
  color: var(--rk-color-warning-text);
}

.notes {
  display: grid;
  gap: var(--rk-space-5);
  margin: 0;
  padding: 0;
  list-style: none;
}

.note {
  display: grid;
  gap: var(--rk-space-2);
}

.note-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0 var(--rk-space-3);
  align-items: center;
  margin: 0;
  color: var(--rk-color-text-muted);
  font-size: var(--rk-font-size-sm);
}

.note-name {
  color: var(--rk-color-text);
  font-weight: var(--rk-font-weight-bold);
}

.previous {
  color: var(--rk-color-text-muted);
}

.link {
  color: inherit;
  text-decoration: underline;
  text-decoration-color: var(--rk-color-border);
  text-underline-offset: 0.25em;
  transition: text-decoration-color var(--rk-duration-fast) ease;
}

@media (hover: hover) {
  .link:hover {
    text-decoration-color: var(--rk-color-domain-strong);
  }
}

.link:focus-visible {
  outline: var(--rk-focus-width) solid var(--rk-color-accent);
  outline-offset: 2px;
  border-radius: var(--rk-radius-sm);
}
</style>
