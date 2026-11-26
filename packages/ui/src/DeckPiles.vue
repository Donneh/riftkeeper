<script setup lang="ts">
import { useId } from "vue";
import CardImage from "./CardImage.vue";
import { PILE_GROUPINGS, type PileCard, type PileGroup, type PileGrouping } from "./deck-builder.ts";
import ToggleGroup from "./ToggleGroup.vue";

defineProps<{ groups: readonly PileGroup[] }>();
const grouping = defineModel<PileGrouping>("grouping", { required: true });
const emit = defineEmits<{ add: [id: string]; remove: [id: string] }>();

const headingId = useId();
const GROUPINGS = PILE_GROUPINGS.map((value) => ({ value, label: value === "cost" ? "By energy" : "By type" }));

const label = (card: PileCard) =>
  card.champion
    ? `${card.name}, chosen champion`
    : `${card.count} × ${card.name}${card.opening ? `, ${card.opening} in opening hand` : ""}`;
</script>

<template>
  <section class="piles" :aria-labelledby="headingId">
    <div class="bar">
      <h2 :id="headingId" class="heading">Main deck</h2>
      <ToggleGroup v-model="grouping" label="Group the deck" :options="GROUPINGS" />
      <p class="legend">On each card: copies · chance in opening hand</p>
    </div>
    <div class="groups" :class="grouping">
      <section v-for="group in groups" :key="group.label" class="group" :aria-label="`${group.label}: ${group.count}`">
        <h3 class="group-head">
          <span>{{ group.label }}</span><span class="group-count">{{ group.count || "" }}</span>
        </h3>
        <ul class="pile" :aria-label="group.label">
          <li v-for="card in group.cards" :key="card.id" class="card" :aria-label="label(card)">
            <CardImage
              :name="card.name"
              :image-url="card.imageUrl"
              :srcset="card.srcset"
              sizes="(min-width: 64rem) 9rem, 25vw"
              :orientation="card.orientation"
            />
            <span class="tag count" aria-hidden="true">{{ card.champion ? "★" : `${card.count}×` }}</span>
            <span v-if="card.opening" class="tag odds" aria-hidden="true">{{ card.opening }}</span>
            <span v-if="!card.champion" class="controls">
              <button type="button" :aria-label="`Remove ${card.name}`" @click="emit('remove', card.id)">−</button>
              <button type="button" :aria-label="`Add ${card.name}`" :disabled="!card.canAdd" @click="emit('add', card.id)">+</button>
            </span>
          </li>
          <li v-if="group.cards.length === 0 && grouping === 'cost'" class="placeholder" aria-hidden="true" />
        </ul>
      </section>
    </div>
    <slot />
  </section>
</template>

<style scoped>
.piles {
  display: flex;
  flex-direction: column;
  gap: var(--rk-space-3);
}

.bar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--rk-space-3);
  align-items: center;
}

.heading {
  margin: 0;
  color: var(--rk-color-text-muted);
  font: var(--rk-font-size-xs) var(--rk-font-family-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.legend {
  margin: 0 0 0 auto;
  color: var(--rk-color-text-muted);
  font-size: var(--rk-font-size-xs);
}

.groups {
  display: grid;
  gap: var(--rk-space-4) var(--rk-space-3);
  align-items: start;
}

.groups.cost {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.groups.type {
  grid-template-columns: minmax(0, 1fr);
}


@media (min-width: 48rem) {
  .groups.cost {
    grid-template-columns: repeat(8, minmax(0, 1fr));
  }
}

.group-head {
  display: flex;
  justify-content: space-between;
  margin: 0 0 var(--rk-space-2);
  padding-bottom: var(--rk-space-1);
  border-bottom: var(--rk-border-width) solid var(--rk-color-border);
  font: var(--rk-font-weight-medium) var(--rk-font-size-xs) var(--rk-font-family-mono);
}

.group-count {
  color: var(--rk-color-text-muted);
}

.pile {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.type .pile {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(6.5rem, 1fr));
  gap: var(--rk-space-2);
}

.card {
  position: relative;
  transition: transform var(--rk-duration-fast) ease-out;
}

.cost .card + .card {
  margin-top: -105%;
}

.card :deep(.frame) {
  box-shadow: 0 -2px 6px rgb(0 0 0 / 0.25);
}

@media (hover: hover) {
  .card:hover {
    z-index: 2;
    transform: translateY(calc(-1 * var(--rk-space-2)));
  }
}

.card:focus-within {
  z-index: 2;
}

.tag {
  position: absolute;
  top: 6%;
  padding: 1px 5px;
  border-radius: var(--rk-radius-sm);
  background: rgb(12 10 9 / 0.85);
  color: #fbf9f6;
  font: 0.6875rem var(--rk-font-family-mono);
}

.tag.count {
  left: 5%;
  background: var(--rk-color-accent);
  color: var(--rk-color-on-accent);
}

.tag.odds {
  right: 5%;
}

.controls {
  position: absolute;
  top: 18%;
  left: 50%;
  display: flex;
  overflow: hidden;
  border-radius: var(--rk-radius-control);
  background: rgb(12 10 9 / 0.88);
  opacity: 0;
  transform: translateX(-50%);
  transition: opacity var(--rk-duration-fast) ease;
}

.type .controls {
  top: auto;
  bottom: 8%;
}

.card:hover .controls,
.card:focus-within .controls {
  opacity: 1;
}

@media (hover: none) {
  .controls {
    opacity: 1;
  }
}

.controls button {
  display: grid;
  place-items: center;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  border: 0;
  background: none;
  color: #fbf9f6;
  font: var(--rk-font-size-sm) var(--rk-font-family-mono);
  cursor: pointer;
}

.controls button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.controls button:hover:not(:disabled) {
  background: rgb(255 255 255 / 0.18);
}

.controls button:focus-visible {
  outline: var(--rk-focus-width) solid #fbf9f6;
  outline-offset: -2px;
}

.placeholder {
  aspect-ratio: 63 / 88;
  border: var(--rk-border-width) dashed var(--rk-color-border);
  border-radius: var(--rk-radius-lg);
}

@media (prefers-reduced-motion: reduce) {
  .card,
  .controls {
    transition: none;
  }
}
</style>
