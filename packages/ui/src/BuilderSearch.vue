<script setup lang="ts">
import { ref } from "vue";
import CardImage from "./CardImage.vue";
import CardPreview from "./CardPreview.vue";
import { type BuilderCard, type BuilderResult, type BuilderScope, domainGlyph } from "./deck-builder.ts";
import type { Domain } from "./domain.ts";
import InfiniteScrollSentinel from "./InfiniteScrollSentinel.vue";
import type { QuerySuggestion } from "./query-suggestion.ts";
import RiftboundGlyph from "./RiftboundGlyph.vue";
import SearchBar from "./SearchBar.vue";
import ToggleGroup from "./ToggleGroup.vue";
import WarningList from "./WarningList.vue";

withDefaults(
  defineProps<{
    domains: readonly Domain[];
    results: readonly BuilderResult[];
    total: number | null;
    loading: boolean;
    error: string | null;
    warnings?: readonly { readonly message: string }[];
    hasMore: boolean;
    examples: readonly string[];
    suggestions?: readonly QuerySuggestion[];
    hint?: string | null;
  }>(),
  { warnings: () => [], suggestions: () => [], hint: null },
);

const query = defineModel<string>({ required: true });
const scope = defineModel<BuilderScope>("scope", { required: true });
const emit = defineEmits<{
  add: [id: string];
  remove: [id: string];
  more: [];
  retry: [];
  caret: [position: number];
}>();

const SCOPES = [
  { value: "cards", label: "Cards" },
  { value: "battlefields", label: "Battlefields" },
] as const;

const preview = ref<{ card: BuilderCard; x: number; y: number } | null>(null);
const PREVIEW_WIDTH = 288;
const PREVIEW_HEIGHT = 400;

function showPreview(card: BuilderCard, event: PointerEvent) {
  if (event.pointerType !== "mouse") return;
  const x = event.clientX + 24 + PREVIEW_WIDTH > window.innerWidth ? event.clientX - PREVIEW_WIDTH : event.clientX + 24;
  const y = Math.max(8, Math.min(window.innerHeight - PREVIEW_HEIGHT, event.clientY - PREVIEW_HEIGHT / 2));
  preview.value = { card, x, y };
}
</script>

<template>
  <div class="panel">
    <div class="head">
      <ToggleGroup v-model="scope" label="Search for" :options="SCOPES" />
      <SearchBar
        v-model="query"
        :label="scope === 'cards' ? 'Search cards for this deck' : 'Search battlefields'"
        :placeholder="scope === 'cards' ? 'cost:<=2 ability:draw' : 'ability:draw'"
        :suggestions="suggestions"
        :hint="hint"
        @caret="emit('caret', $event)"
      />
      <p v-if="scope === 'cards'" class="scope">
        <span class="glyphs"><RiftboundGlyph v-for="domain in domains" :key="domain" :name="domainGlyph(domain)" decorative /></span>
        Only cards your legend can play
      </p>
      <p class="examples">
        <span>Try</span>
        <button v-for="example in examples" :key="example" type="button" @click="query = example">{{ example }}</button>
      </p>
      <WarningList :warnings="warnings" />
    </div>
    <div class="results" :aria-busy="loading">
      <p class="count" aria-live="polite">
        {{ error ? "Search failed" : total === null ? "Searching…" : `${total} ${scope === "cards" ? "legal cards" : "battlefields"}` }}
      </p>
      <p v-if="error" class="error">
        {{ error }} <button type="button" class="retry" @click="emit('retry')">Try again</button>
      </p>
      <ul class="rows" :aria-label="scope === 'cards' ? 'Cards you can add' : 'Battlefields'">
        <li
          v-for="card in results"
          :key="card.id"
          class="row"
          :class="{ blocked: !card.canAdd && card.count === 0 }"
          @pointermove="showPreview(card, $event)"
          @pointerleave="preview = null"
        >
          <CardImage class="thumb" :name="card.name" :image-url="card.imageUrl" :srcset="card.srcset" sizes="2.5rem" :orientation="card.orientation" />
          <span class="text">
            <span class="name">{{ card.name }}</span>
            <span class="detail">
              <RiftboundGlyph v-for="domain in card.domains" :key="domain" :name="domainGlyph(domain)" decorative />
              {{ card.detail }}
            </span>
          </span>
          <span class="stepper" :class="{ has: card.count > 0 }">
            <button type="button" :aria-label="`Remove ${card.name}`" :disabled="card.count === 0" @click="emit('remove', card.id)">−</button>
            <span class="value" :aria-label="`${card.count} in deck`">{{ card.count }}</span>
            <button type="button" :aria-label="`Add ${card.name}`" :disabled="!card.canAdd" @click="emit('add', card.id)">+</button>
          </span>
        </li>
      </ul>
      <InfiniteScrollSentinel v-if="hasMore && !loading" margin="0px 0px 400px 0px" @change="$event && emit('more')" />
      <p v-if="loading && results.length > 0" class="count">Loading more…</p>
    </div>
    <CardPreview
      v-if="preview"
      :image-url="preview.card.imageUrl"
      :srcset="preview.card.srcset"
      :orientation="preview.card.orientation"
      :x="preview.x"
      :y="preview.y"
    />
  </div>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  border: var(--rk-border-width) solid var(--rk-color-border);
  border-radius: var(--rk-radius-lg);
  background: var(--rk-color-surface);
}

.head {
  display: flex;
  flex-direction: column;
  gap: var(--rk-space-2);
  padding: var(--rk-space-3);
  border-bottom: var(--rk-border-width) solid var(--rk-color-border);
}

.scope,
.examples,
.count {
  margin: 0;
  color: var(--rk-color-text-muted);
  font: var(--rk-font-size-xs) var(--rk-font-family-mono);
  font-variant-ligatures: none;
}

.scope {
  display: flex;
  gap: var(--rk-space-2);
  align-items: center;
}

.examples {
  display: flex;
  flex-wrap: wrap;
  gap: var(--rk-space-1) var(--rk-space-3);
}

.examples button,
.retry {
  padding: 0;
  border: 0;
  background: none;
  color: var(--rk-color-text);
  font: inherit;
  font-variant-ligatures: none;
  text-decoration: underline dotted;
  text-underline-offset: 3px;
  cursor: pointer;
}

.results {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: var(--rk-space-2);
  scrollbar-width: thin;
}

.count {
  padding: var(--rk-space-1) var(--rk-space-2);
}

.error {
  margin: 0;
  padding: var(--rk-space-2);
  color: var(--rk-color-danger-text);
  font-size: var(--rk-font-size-sm);
}

.rows {
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  display: grid;
  grid-template-columns: 2.5rem minmax(0, 1fr) auto;
  gap: var(--rk-space-2);
  align-items: center;
  padding: var(--rk-space-1) var(--rk-space-2);
  border-radius: var(--rk-radius-md);
}

@media (hover: hover) {
  .row:hover {
    background: var(--rk-color-surface-muted);
  }
}

.row.blocked .thumb,
.row.blocked .text {
  opacity: 0.45;
}

.thumb {
  border-radius: var(--rk-radius-sm);
}

.thumb.landscape {
  aspect-ratio: 63 / 88;
}

.text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.name {
  overflow: hidden;
  font-size: var(--rk-font-size-sm);
  font-weight: var(--rk-font-weight-bold);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail {
  overflow: hidden;
  color: var(--rk-color-text-muted);
  font: var(--rk-font-size-xs) var(--rk-font-family-mono);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stepper {
  display: inline-flex;
  overflow: hidden;
  border: var(--rk-border-width) solid var(--rk-color-border);
  border-radius: var(--rk-radius-control);
  font: var(--rk-font-size-xs) var(--rk-font-family-mono);
}

.stepper button,
.stepper .value {
  display: grid;
  place-items: center;
  width: 1.75rem;
  min-height: var(--rk-control-height-sm);
}

.stepper button {
  padding: 0;
  border: 0;
  background: var(--rk-color-surface);
  color: var(--rk-color-text);
  font: inherit;
  cursor: pointer;
}

.stepper button:disabled {
  color: var(--rk-color-text-muted);
  opacity: 0.5;
  cursor: not-allowed;
}

@media (hover: hover) {
  .stepper button:not(:disabled):hover {
    background: var(--rk-color-surface-muted);
  }
}

.stepper button:focus-visible {
  outline: var(--rk-focus-width) solid var(--rk-color-accent);
  outline-offset: -2px;
}

.stepper .value {
  background: var(--rk-color-surface-muted);
}

.stepper.has .value {
  background: var(--rk-color-accent);
  color: var(--rk-color-on-accent);
}
</style>
