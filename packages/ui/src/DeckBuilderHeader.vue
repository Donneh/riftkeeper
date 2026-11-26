<script setup lang="ts">
import CardImage from "./CardImage.vue";
import { type BuilderCard, domainGlyph } from "./deck-builder.ts";
import RiftboundGlyph from "./RiftboundGlyph.vue";

defineProps<{
  legend: BuilderCard | null;
  champion: BuilderCard | null;
  count: number | null;
  size: number;
  status: string;
}>();
const name = defineModel<string>("name", { required: true });
const emit = defineEmits<{ legend: []; champion: [] }>();
</script>

<template>
  <header class="header">
    <div class="identity">
      <button type="button" class="slot" :aria-label="legend ? `Change legend ${legend.name}` : 'Pick a legend'" @click="emit('legend')">
        <CardImage v-if="legend" :name="legend.name" :image-url="legend.imageUrl" :srcset="legend.srcset" sizes="4rem" orientation="portrait" />
        <span v-else class="empty">Legend</span>
      </button>
      <button
        type="button"
        class="slot"
        :disabled="!legend"
        :aria-label="champion ? `Change champion ${champion.name}` : 'Choose a champion'"
        @click="emit('champion')"
      >
        <CardImage v-if="champion" :name="champion.name" :image-url="champion.imageUrl" :srcset="champion.srcset" sizes="4rem" orientation="portrait" />
        <span v-else class="empty">Champion<br />optional</span>
      </button>
    </div>
    <div class="title">
      <label class="sr-only" for="deck-name">Deck name</label>
      <input id="deck-name" v-model="name" class="name" autocomplete="off" spellcheck="false" />
      <p class="meta">
        <template v-if="legend">
          <RiftboundGlyph v-for="domain in legend.domains" :key="domain" :name="domainGlyph(domain)" decorative />
          {{ legend.name }}<template v-if="champion"> · {{ champion.name }}</template> ·
        </template>
        <span class="status">{{ status }}</span>
      </p>
    </div>
    <p v-if="count !== null" class="count" :aria-label="`${count} of ${size} main deck cards`">
      {{ count }}<small>/{{ size }}</small>
    </p>
  </header>
</template>

<style scoped>
.header {
  display: flex;
  flex-wrap: wrap;
  gap: var(--rk-space-4);
  align-items: center;
}

.identity {
  display: flex;
  flex-shrink: 0;
  gap: var(--rk-space-2);
}

.slot {
  width: 3.5rem;
  padding: 0;
  border: 0;
  border-radius: var(--rk-radius-lg);
  background: none;
  color: var(--rk-color-text-muted);
  cursor: pointer;
}

.slot:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.slot:focus-visible {
  outline: var(--rk-focus-width) solid var(--rk-color-accent);
  outline-offset: var(--rk-focus-width);
}

.empty {
  display: grid;
  place-items: center;
  aspect-ratio: 63 / 88;
  border: var(--rk-border-width) dashed var(--rk-color-border);
  border-radius: var(--rk-radius-lg);
  font-size: 0.6875rem;
  line-height: 1.2;
  text-align: center;
}

.title {
  display: flex;
  flex: 1;
  flex-basis: 12rem;
  flex-direction: column;
  gap: var(--rk-space-1);
  min-width: 0;
}

.name {
  width: 100%;
  padding: 0;
  border: 0;
  border-bottom: var(--rk-border-width) dashed transparent;
  background: none;
  color: var(--rk-color-text);
  font: var(--rk-font-weight-bold) var(--rk-font-size-display) var(--rk-font-family);
  letter-spacing: var(--rk-letter-spacing-display);
  line-height: var(--rk-line-height-tight);
  outline: none;
}

@media (max-width: 40rem) {
  .name {
    font-size: var(--rk-font-size-lg);
  }
}

.name:hover,
.name:focus {
  border-bottom-color: var(--rk-color-border);
}

.meta {
  margin: 0;
  color: var(--rk-color-text-muted);
  font-size: var(--rk-font-size-sm);
}

.status {
  font: var(--rk-font-size-xs) var(--rk-font-family-mono);
}

.count {
  flex-shrink: 0;
  margin: 0;
  font: var(--rk-font-size-display) var(--rk-font-family-mono);
  letter-spacing: var(--rk-letter-spacing-display);
  line-height: 1;
}

.count small {
  color: var(--rk-color-text-muted);
  font-size: var(--rk-font-size-md);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
