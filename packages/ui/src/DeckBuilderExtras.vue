<script setup lang="ts">
import CardImage from "./CardImage.vue";
import { type BuilderCard, type BuilderRunes, domainGlyph } from "./deck-builder.ts";
import RiftboundGlyph from "./RiftboundGlyph.vue";

defineProps<{
  battlefields: readonly BuilderCard[];
  battlefieldCount: number;
  runes: readonly BuilderRunes[];
  runeCount: number;
}>();
const emit = defineEmits<{
  removeBattlefield: [id: string];
  findBattlefields: [];
  runes: [domain: BuilderRunes["domain"], count: number];
  reset: [];
  copy: [];
  check: [];
}>();

const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);
</script>

<template>
  <div class="extras">
    <section class="part" aria-labelledby="builder-battlefields">
      <h2 id="builder-battlefields" class="heading">Battlefields · {{ battlefields.length }}/{{ battlefieldCount }}</h2>
      <ul class="fields" aria-label="Battlefields">
        <li v-for="card in battlefields" :key="card.id">
          <button type="button" class="field" :aria-label="`Remove ${card.name}`" @click="emit('removeBattlefield', card.id)">
            <CardImage :name="card.name" :image-url="card.imageUrl" :srcset="card.srcset" sizes="12rem" orientation="landscape" />
            <span class="field-name">{{ card.name }}</span>
          </button>
        </li>
        <li v-for="index in battlefieldCount - battlefields.length" :key="`empty-${index}`">
          <button type="button" class="empty" @click="emit('findBattlefields')">+ Battlefield</button>
        </li>
      </ul>
    </section>
    <section class="part" aria-labelledby="builder-runes">
      <h2 id="builder-runes" class="heading">Runes · {{ runeCount }}</h2>
      <div v-for="rune in runes" :key="rune.domain" class="rune">
        <RiftboundGlyph :name="domainGlyph(rune.domain)" decorative />
        <input
          type="range"
          min="0"
          :max="runeCount"
          :value="rune.count"
          :disabled="runes.length < 2"
          :aria-label="`${capitalize(rune.domain)} runes`"
          @input="emit('runes', rune.domain, Number(($event.target as HTMLInputElement).value))"
        />
        <span class="number">{{ rune.count }}</span>
      </div>
      <div class="actions">
        <button type="button" class="action primary" @click="emit('check')">Open in checker</button>
        <button type="button" class="action" @click="emit('copy')">Copy list</button>
        <button type="button" class="action" @click="emit('reset')">New deck</button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.extras {
  display: grid;
  gap: var(--rk-space-6);
  padding-top: var(--rk-space-4);
  border-top: var(--rk-border-width) solid var(--rk-color-border);
}

@media (min-width: 48rem) {
  .extras {
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  }
}

.part {
  display: flex;
  flex-direction: column;
  gap: var(--rk-space-2);
  min-width: 0;
}

.heading {
  margin: 0;
  color: var(--rk-color-text-muted);
  font: var(--rk-font-weight-regular) var(--rk-font-size-xs) var(--rk-font-family-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.fields {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--rk-space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.field,
.empty {
  width: 100%;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.field-name {
  display: block;
  overflow: hidden;
  margin-top: var(--rk-space-1);
  font-size: var(--rk-font-size-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty {
  display: grid;
  place-items: center;
  aspect-ratio: 88 / 63;
  border: var(--rk-border-width) dashed var(--rk-color-border);
  border-radius: var(--rk-radius-lg);
  color: var(--rk-color-text-muted);
  font-size: var(--rk-font-size-sm);
}

.field:focus-visible,
.empty:focus-visible,
.action:focus-visible {
  outline: var(--rk-focus-width) solid var(--rk-color-accent);
  outline-offset: var(--rk-focus-width);
}

.rune {
  display: grid;
  grid-template-columns: auto 1fr 1.5rem;
  gap: var(--rk-space-2);
  align-items: center;
}

.rune input {
  width: 100%;
  accent-color: var(--rk-color-accent);
}

.number {
  font-family: var(--rk-font-family-mono);
  text-align: right;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--rk-space-2);
  margin-top: var(--rk-space-3);
}

.action {
  min-height: var(--rk-control-height-sm);
  padding: 0 var(--rk-space-3);
  border: var(--rk-border-width) solid var(--rk-color-border);
  border-radius: var(--rk-radius-control);
  background: var(--rk-color-surface);
  color: var(--rk-color-text);
  font: var(--rk-font-weight-medium) var(--rk-font-size-sm) var(--rk-font-family);
  cursor: pointer;
}

.action.primary {
  border-color: var(--rk-color-accent);
  background: var(--rk-color-accent);
  color: var(--rk-color-on-accent);
}
</style>
