<script setup lang="ts">
import { useId } from "vue";
import CardImage from "./CardImage.vue";
import { DECK_VIEWS, type DeckLine, type DeckSection, type DeckView } from "./deck-report.ts";
import { isPlainLeftClick } from "./link-click.ts";

defineProps<{ sections: readonly DeckSection[]; view: DeckView }>();
const emit = defineEmits<{ navigate: [href: string]; view: [view: DeckView] }>();

const headingId = useId();

const VIEW_LABELS: Record<DeckView, string> = { list: "List", images: "Images", stacks: "Stacks" };
const STATUS_LABELS: Record<DeckLine["status"], string> = { ok: "", problem: ", problem", upcoming: ", ban coming" };

function follow(event: MouseEvent, href: string | null) {
  if (href === null || !isPlainLeftClick(event)) return;
  event.preventDefault();
  emit("navigate", href);
}

const label = (line: DeckLine) => `${line.count} × ${line.name}${STATUS_LABELS[line.status]}`;
</script>

<template>
  <section class="deck" :aria-labelledby="headingId">
    <div class="bar">
      <h2 :id="headingId" class="heading">Deck</h2>
      <fieldset class="views">
        <legend class="sr-only">Deck view</legend>
        <button
          v-for="option in DECK_VIEWS"
          :key="option"
          type="button"
          class="view"
          :aria-pressed="view === option"
          @click="emit('view', option)"
        >
          {{ VIEW_LABELS[option] }}
        </button>
      </fieldset>
    </div>

    <div class="sections" :class="view">
      <section v-for="section in sections" :key="section.title" class="section">
        <h3 class="section-title">
          <span>{{ section.title }}</span><span class="section-count">{{ section.count }}</span>
        </h3>

        <ul v-if="view === 'list'" class="lines" :aria-label="section.title">
          <li v-for="(line, index) in section.lines" :key="index" class="line" :data-status="line.status">
            <span class="count">{{ line.count }}</span>
            <span class="name-cell">
              <a v-if="line.href" class="name link" :href="line.href" @click="follow($event, line.href)">{{
                line.name
              }}</a>
              <span v-else class="name">{{ line.name }}</span>
              <span v-if="line.cheaper" class="cheaper">{{ line.cheaper }}</span>
            </span>
            <span class="code">{{ line.code }}</span>
            <span class="price">{{ line.price ?? "–" }}</span>
          </li>
        </ul>

        <ul v-else class="cards" :class="view" :aria-label="section.title">
          <li
            v-for="(line, index) in section.lines"
            :key="index"
            class="card"
            :class="line.orientation"
            :data-status="line.status"
          >
            <a
              class="card-link"
              :href="line.href ?? undefined"
              :aria-label="label(line)"
              @click="follow($event, line.href)"
            >
              <CardImage
                :name="line.name"
                :image-url="line.imageUrl"
                :orientation="line.orientation"
                :srcset="line.srcset"
                sizes="(min-width: 40rem) 10rem, 30vw"
              />
              <span class="badge" aria-hidden="true">×{{ line.count }}</span>
              <span v-if="line.status !== 'ok'" class="mark" aria-hidden="true">{{
                line.status === "problem" ? "✕" : "!"
              }}</span>
            </a>
          </li>
        </ul>
      </section>
    </div>
  </section>
</template>

<style scoped>
.deck {
  display: grid;
  gap: var(--rk-space-3);
  min-width: 0;
}

.bar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--rk-space-2);
  align-items: center;
  justify-content: space-between;
}

.heading {
  margin: 0;
  color: var(--rk-color-text-muted);
  font: var(--rk-font-weight-regular) var(--rk-font-size-xs) var(--rk-font-family-mono);
}

.views {
  display: inline-grid;
  grid-template-columns: repeat(3, auto);
  gap: var(--rk-space-1);
  margin: 0;
  padding: var(--rk-space-1);
  border: var(--rk-border-width) solid var(--rk-color-border);
  border-radius: var(--rk-radius-md);
  background: var(--rk-color-surface-muted);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.view {
  min-height: calc(var(--rk-control-height-sm) - 2 * var(--rk-space-1));
  padding: 0 var(--rk-space-3);
  border: 0;
  border-radius: var(--rk-radius-sm);
  background: none;
  color: var(--rk-color-text-muted);
  font: var(--rk-font-size-xs) var(--rk-font-family-detail);
  cursor: pointer;
}

.view[aria-pressed="true"] {
  background: var(--rk-color-surface);
  box-shadow: 0 0 0 var(--rk-border-width) var(--rk-color-border);
  color: var(--rk-color-text);
}

.view:focus-visible {
  outline: var(--rk-focus-width) solid var(--rk-color-accent);
  outline-offset: 1px;
}

.sections.list {
  column-gap: var(--rk-space-8);
  columns: 18rem;
}

.sections.images {
  display: flex;
  flex-wrap: wrap;
  gap: var(--rk-space-6) var(--rk-space-8);
}

.sections.images .section {
  flex: 0 1 auto;
  max-width: 100%;
}

.sections.stacks {
  display: grid;
  gap: var(--rk-space-6);
}

.sections.stacks {
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 10rem), 1fr));
  align-items: start;
}

.section {
  display: grid;
  align-content: start;
  gap: var(--rk-space-1);
  min-width: 0;
  margin-bottom: var(--rk-space-5);
  break-inside: avoid;
}

.sections.images .section,
.sections.stacks .section {
  margin-bottom: 0;
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
  grid-template-columns: 2ch minmax(0, 1fr) auto auto;
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

.name-cell {
  display: grid;
  min-width: 0;
}

.name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cheaper {
  color: var(--rk-color-text-muted);
  font: var(--rk-font-size-xs) var(--rk-font-family-mono);
}

.count,
.code,
.price {
  color: var(--rk-color-text-muted);
  font-family: var(--rk-font-family-mono);
  font-size: var(--rk-font-size-xs);
  font-variant-numeric: tabular-nums;
}

.price {
  min-width: 6ch;
  text-align: right;
}

.cards {
  margin: 0;
  padding: 0;
  list-style: none;
}

.cards.images {
  --card-width: clamp(6rem, calc((100vw - 2 * var(--rk-gutter) - 2 * var(--rk-space-3)) / 3), 8.5rem);

  display: flex;
  flex-wrap: wrap;
  gap: var(--rk-space-3);
}

.cards.images .card {
  width: var(--card-width);
}

.cards.images .card.landscape {
  width: calc(2 * var(--card-width) + var(--rk-space-3));
}

.cards.stacks {
  display: grid;
}

.cards.stacks .card + .card {
  margin-top: -118%;
}

.cards.stacks .card.landscape + .card,
.cards.stacks .card + .card.landscape {
  margin-top: -52%;
}

.cards.stacks .card {
  transition: transform var(--rk-duration-fast) ease;
}

@media (hover: hover) {
  .cards.stacks .card:hover ~ .card {
    transform: translateY(70%);
  }

  .cards.stacks .card.landscape:hover ~ .card {
    transform: translateY(45%);
  }
}

.cards.stacks .card:focus-within ~ .card {
  transform: translateY(70%);
}

.card {
  position: relative;
  min-width: 0;
}

.card-link {
  position: relative;
  display: block;
  border-radius: var(--rk-radius-card);
  color: inherit;
}

.card-link:focus-visible {
  outline: var(--rk-focus-width) solid var(--rk-color-accent);
  outline-offset: 2px;
}

.cards.stacks .card-link {
  box-shadow: 0 -2px 8px rgb(0 0 0 / 0.35);
}

.badge,
.mark {
  position: absolute;
  top: 6%;
  display: grid;
  place-items: center;
  min-width: 1.75rem;
  height: 1.5rem;
  padding: 0 var(--rk-space-1);
  border-radius: var(--rk-radius-md);
  font: var(--rk-font-weight-bold) var(--rk-font-size-xs) var(--rk-font-family-mono);
}

.cards.stacks .badge,
.cards.stacks .mark {
  top: 3%;
}

.badge {
  right: 6%;
  background: rgb(12 10 9 / 0.85);
  color: #f5f0e8;
}

.mark {
  left: 6%;
  min-width: 1.5rem;
}

.card[data-status="problem"] .mark {
  background: var(--rk-color-danger-text);
  color: var(--rk-color-danger-surface);
}

.card[data-status="upcoming"] .mark {
  background: var(--rk-color-warning-border);
  color: #1c1917;
}

.card[data-status="problem"] .card-link {
  outline: 2px solid var(--rk-color-danger-border);
  outline-offset: 1px;
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
