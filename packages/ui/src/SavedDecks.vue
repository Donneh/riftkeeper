<script setup lang="ts">
import type { SavedDeckSummary } from "./deck-builder.ts";
import { isPlainLeftClick } from "./link-click.ts";

defineProps<{ decks: readonly SavedDeckSummary[]; current: string | null }>();
const emit = defineEmits<{ navigate: [href: string]; remove: [id: string] }>();

function follow(event: MouseEvent, href: string) {
  if (!isPlainLeftClick(event)) return;
  event.preventDefault();
  emit("navigate", href);
}
</script>

<template>
  <details v-if="decks.length > 0" class="saved">
    <summary>My decks ({{ decks.length }})</summary>
    <ul class="list" aria-label="Saved decks">
      <li v-for="deck in decks" :key="deck.id" class="deck">
        <a :href="deck.href" :aria-current="deck.id === current ? 'page' : undefined" @click="follow($event, deck.href)">
          <span class="name">{{ deck.name }}</span>
          <span class="meta">{{ deck.legend ?? "No legend" }} · {{ deck.updated }}</span>
        </a>
        <button type="button" class="remove" :aria-label="`Delete ${deck.name}`" @click="emit('remove', deck.id)">×</button>
      </li>
    </ul>
  </details>
</template>

<style scoped>
.saved {
  font-size: var(--rk-font-size-sm);
}

summary {
  color: var(--rk-color-text-muted);
  font-family: var(--rk-font-family-mono);
  font-size: var(--rk-font-size-xs);
  cursor: pointer;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: var(--rk-space-2) 0 0;
  padding: 0;
  list-style: none;
}

.deck {
  display: flex;
  align-items: center;
  gap: var(--rk-space-2);
}

a {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  padding: var(--rk-space-1) var(--rk-space-2);
  border-radius: var(--rk-radius-md);
  color: inherit;
  text-decoration: none;
}

a:hover,
a[aria-current="page"] {
  background: var(--rk-color-surface-muted);
}

.name {
  font-weight: var(--rk-font-weight-medium);
}

.meta {
  color: var(--rk-color-text-muted);
  font-size: var(--rk-font-size-xs);
}

.remove {
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  border: 0;
  border-radius: var(--rk-radius-control);
  background: none;
  color: var(--rk-color-text-muted);
  cursor: pointer;
}

.remove:hover {
  background: var(--rk-color-surface-muted);
  color: var(--rk-color-text);
}
</style>
