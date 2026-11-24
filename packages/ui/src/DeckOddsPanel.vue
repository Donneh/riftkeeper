<script setup lang="ts">
import { useId } from "vue";
import CardImage from "./CardImage.vue";
import type { DeckHandCard, DeckOdds } from "./deck-report.ts";

defineProps<{ odds: DeckOdds; hand: readonly DeckHandCard[] | null }>();
const emit = defineEmits<{ draw: [] }>();

const headingId = useId();
const handId = useId();
</script>

<template>
  <section class="odds" :aria-labelledby="headingId">
    <h2 :id="headingId" class="heading">Opening hand</h2>
    <p class="summary">
      You draw {{ odds.openingSize }} of the {{ odds.deckSize }} cards left after your chosen champion, and see
      {{ odds.byTurnCards }} by your turn {{ odds.turn }} draw. {{ odds.cheapPlay }}
    </p>
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th scope="col">Card</th>
            <th scope="col" class="number">Copies</th>
            <th scope="col" class="number">Opening hand</th>
            <th scope="col" class="number">By turn {{ odds.turn }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in odds.rows" :key="row.name">
            <th scope="row" class="name">{{ row.name }}</th>
            <td class="number">{{ row.copies }}</td>
            <td class="number">{{ row.opening }}</td>
            <td class="number">{{ row.byTurn }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="hand-bar">
      <button class="draw" type="button" :aria-controls="handId" @click="emit('draw')">
        {{ hand ? "Draw another hand" : "Draw a sample hand" }}
      </button>
      <p class="note">Before any mulligan.</p>
    </div>
    <ul :id="handId" class="hand" aria-label="Sample hand" aria-live="polite">
      <li v-for="(card, index) in hand ?? []" :key="`${index}-${card.name}`" class="hand-card">
        <CardImage
          :name="card.name"
          :image-url="card.imageUrl"
          :srcset="card.srcset"
          orientation="portrait"
          sizes="(min-width: 40rem) 10rem, 22vw"
          loading="eager"
        />
      </li>
    </ul>
  </section>
</template>

<style scoped>
.odds {
  display: grid;
  gap: var(--rk-space-3);
  min-width: 0;
}

.heading {
  margin: 0;
  color: var(--rk-color-text-muted);
  font: var(--rk-font-weight-regular) var(--rk-font-size-xs) var(--rk-font-family-mono);
}

.summary,
.note {
  margin: 0;
  color: var(--rk-color-text-muted);
  font-size: var(--rk-font-size-sm);
}

.table-wrap {
  max-height: 22rem;
  overflow: auto;
  border: var(--rk-border-width) solid var(--rk-color-border);
  border-radius: var(--rk-radius-lg);
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--rk-font-size-sm);
}

th,
td {
  padding: var(--rk-space-2) var(--rk-space-2);
  border-bottom: var(--rk-border-width) solid var(--rk-color-border);
  text-align: left;
}

thead th {
  position: sticky;
  top: 0;
  background: var(--rk-color-surface-muted);
  color: var(--rk-color-text-muted);
  font: var(--rk-font-weight-regular) var(--rk-font-size-xs) var(--rk-font-family-mono);
}

thead .number {
  white-space: normal;
}

.name {
  min-width: 7rem;
  font-weight: var(--rk-font-weight-regular);
}

.number {
  font-family: var(--rk-font-family-mono);
  font-variant-numeric: tabular-nums;
  text-align: right;
  white-space: nowrap;
}

.hand-bar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--rk-space-3);
  align-items: center;
}

.draw {
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
  .draw:hover {
    border-color: var(--rk-color-accent);
  }
}

.draw:focus-visible {
  outline: var(--rk-focus-width) solid var(--rk-color-accent);
  outline-offset: 2px;
}

.hand {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 10rem));
  gap: var(--rk-space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.hand:empty {
  display: none;
}
</style>
