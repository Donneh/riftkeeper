<script setup lang="ts">
import { ref, useId } from "vue";
import CardText from "./CardText.vue";
import type { DeckReportContent } from "./deck-report.ts";
import { isPlainLeftClick } from "./link-click.ts";

defineProps<{ report: DeckReportContent }>();
const emit = defineEmits<{ navigate: [href: string]; copy: [code: string] }>();

const verdictsId = useId();
const deckId = useId();
const errataId = useId();
const copied = ref(false);

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
      </p>
      <button v-if="report.code" class="copy" type="button" @click="copy(report.code)">
        {{ copied ? "Deck code copied" : "Copy deck code" }}
      </button>
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

    <section class="deck" :aria-labelledby="deckId">
      <h2 :id="deckId" class="heading">Deck</h2>
      <div class="sections">
        <section v-for="section in report.sections" :key="section.title" class="section">
          <h3 class="section-title">
            <span>{{ section.title }}</span><span class="section-count">{{ section.count }}</span>
          </h3>
          <ul class="lines" :aria-label="section.title">
            <li v-for="(line, index) in section.lines" :key="index" class="line" :data-status="line.status">
              <span class="count">{{ line.count }}</span>
              <a v-if="line.href" class="name link" :href="line.href" @click="follow($event, line.href)">{{
                line.name
              }}</a>
              <span v-else class="name">{{ line.name }}</span>
              <span class="code">{{ line.code }}</span>
            </li>
          </ul>
        </section>
      </div>
    </section>

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
.deck,
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

.sections {
  column-gap: var(--rk-space-8);
  columns: 18rem;
}

.section {
  display: grid;
  align-content: start;
  gap: var(--rk-space-1);
  min-width: 0;
  margin-bottom: var(--rk-space-5);
  break-inside: avoid;
}

.section-title {
  display: flex;
  justify-content: space-between;
  gap: var(--rk-space-2);
  margin: 0 0 var(--rk-space-1);
  padding-bottom: var(--rk-space-1);
  border-bottom: var(--rk-border-width) solid var(--rk-color-border);
  font-size: var(--rk-font-size-md);
}

.section-count {
  color: var(--rk-color-text-muted);
  font: var(--rk-font-weight-regular) var(--rk-font-size-xs) var(--rk-font-family-mono);
}

.lines {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}

.line {
  display: grid;
  grid-template-columns: 2ch minmax(0, 1fr) auto;
  gap: var(--rk-space-2);
  align-items: center;
  min-height: var(--rk-control-height-sm);
  font-size: var(--rk-font-size-sm);
}

.line[data-status="problem"] {
  color: var(--rk-color-danger-text);
}

.line[data-status="upcoming"] {
  color: var(--rk-color-warning-text);
}

.line[data-status="problem"] .name::after {
  content: " ✕" / " problem";
}

.line[data-status="upcoming"] .name::after {
  content: " !" / " ban coming";
}

.count,
.code {
  color: var(--rk-color-text-muted);
  font-family: var(--rk-font-family-mono);
  font-size: var(--rk-font-size-xs);
  font-variant-numeric: tabular-nums;
}

.name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
