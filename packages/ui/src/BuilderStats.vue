<script setup lang="ts">
import { useId } from "vue";
import CardImage from "./CardImage.vue";
import type { BuilderBar, BuilderLegality, BuilderStatsContent } from "./deck-builder.ts";
import { domainGlyph } from "./deck-builder.ts";
import type { DeckHandCard } from "./deck-report.ts";
import RiftboundGlyph from "./RiftboundGlyph.vue";

const props = defineProps<{
  stats: BuilderStatsContent;
  legality: BuilderLegality;
  hand: readonly DeckHandCard[] | null;
}>();
const emit = defineEmits<{ draw: [] }>();

const handId = useId();
const width = (bar: BuilderBar) => `${(bar.count / Math.max(1, props.stats.total)) * 100}%`;
const curveMax = () => Math.max(1, ...props.stats.curve);
const curveLabel = (index: number) => (index === props.stats.curve.length - 1 ? `${index}+` : `${index}`);
</script>

<template>
  <div class="stats">
    <section class="block">
      <dl class="figures">
        <div><dt>main deck</dt><dd>{{ stats.count }}</dd></div>
        <div><dt>avg energy</dt><dd>{{ stats.averageCost }}</dd></div>
        <div><dt>TCGplayer market</dt><dd>{{ stats.price }}</dd></div>
        <div><dt>signature</dt><dd>{{ stats.signatures }}</dd></div>
      </dl>
      <p v-if="legality.kind === 'checking'" class="note">Checking legality…</p>
      <p v-else-if="legality.kind === 'error'" class="problem">{{ legality.message }}</p>
      <p v-else-if="legality.problems.length === 0" class="legal">✓ Legal in Standard</p>
      <ul v-else class="problems" aria-label="Problems">
        <li v-for="problem in legality.problems" :key="problem">{{ problem }}</li>
      </ul>
    </section>

    <section class="block" aria-label="Energy curve">
      <h3 class="heading">Energy curve</h3>
      <ol class="curve">
        <li v-for="(count, index) in stats.curve" :key="index" :aria-label="`${count} cards costing ${curveLabel(index)}`">
          <span class="value">{{ count || "" }}</span>
          <span class="bar" :style="{ height: `${(count / curveMax()) * 100}%` }" :class="{ empty: count === 0 }" />
          <span class="cost">{{ curveLabel(index) }}</span>
        </li>
      </ol>
    </section>

    <section v-for="[title, bars] in ([['Types', stats.types], ['Domains', stats.domains]] as const)" :key="title" class="block">
      <h3 class="heading">{{ title }}</h3>
      <ul class="bars" :aria-label="title">
        <li v-for="bar in bars" :key="bar.label" class="row">
          <span class="label"><RiftboundGlyph v-if="bar.domain" :name="domainGlyph(bar.domain)" decorative />{{ bar.label }}</span>
          <span class="track"><span class="fill" :style="{ width: width(bar), background: bar.domain ? `var(--rk-color-domain-${bar.domain})` : undefined }" /></span>
          <span class="number">{{ bar.count }}</span>
        </li>
      </ul>
    </section>

    <section class="block">
      <h3 class="heading">Opening hand</h3>
      <p class="note">{{ stats.drawSummary }}</p>
      <dl class="figures">
        <div><dt>a play costing ≤2 in hand</dt><dd>{{ stats.cheapOpening }}</dd></div>
        <div><dt>…by turn 3</dt><dd>{{ stats.cheapByTurn }}</dd></div>
      </dl>
    </section>

    <section class="block">
      <h3 class="heading">Sample hand</h3>
      <button class="draw" type="button" :aria-controls="handId" :disabled="!stats.canDraw" @click="emit('draw')">
        {{ hand ? "Draw another hand" : "Draw a sample hand" }}
      </button>
      <ul :id="handId" class="hand" aria-label="Sample hand" aria-live="polite">
        <li v-for="(card, index) in hand ?? []" :key="`${index}-${card.name}`">
          <CardImage :name="card.name" :image-url="card.imageUrl" :srcset="card.srcset" sizes="5rem" orientation="portrait" loading="eager" />
        </li>
      </ul>
      <p class="note">Before any mulligan.</p>
    </section>
  </div>
</template>

<style scoped>
.stats {
  display: flex;
  flex-direction: column;
  gap: var(--rk-space-5);
}

.block {
  display: flex;
  flex-direction: column;
  gap: var(--rk-space-2);
}

.heading {
  margin: 0;
  color: var(--rk-color-text-muted);
  font: var(--rk-font-weight-regular) var(--rk-font-size-xs) var(--rk-font-family-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.figures {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--rk-space-3);
  margin: 0;
}

.figures div {
  display: flex;
  flex-direction: column-reverse;
}

.figures dt {
  color: var(--rk-color-text-muted);
  font-size: var(--rk-font-size-xs);
}

.figures dd {
  margin: 0;
  font: var(--rk-font-weight-medium) var(--rk-font-size-lg) var(--rk-font-family-mono);
}

.note {
  margin: 0;
  color: var(--rk-color-text-muted);
  font-size: var(--rk-font-size-sm);
}

.legal {
  margin: 0;
  color: var(--rk-color-domain-calm);
  font-size: var(--rk-font-size-sm);
}

.problem,
.problems {
  margin: 0;
  color: var(--rk-color-warning-text);
  font-size: var(--rk-font-size-sm);
}

.problems {
  padding-left: var(--rk-space-4);
}

.curve {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: var(--rk-space-1);
  height: 6rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.curve li {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: stretch;
  min-height: 0;
  font: 0.6875rem var(--rk-font-family-mono);
  text-align: center;
}

.bar {
  min-height: 2px;
  border-radius: 2px 2px 0 0;
  background: var(--rk-color-accent);
}

.bar.empty {
  opacity: 0.2;
}

.cost {
  color: var(--rk-color-text-muted);
}

.bars {
  display: flex;
  flex-direction: column;
  gap: var(--rk-space-1);
  margin: 0;
  padding: 0;
  list-style: none;
  font: var(--rk-font-size-xs) var(--rk-font-family-mono);
}

.row {
  display: grid;
  grid-template-columns: 5rem 1fr 1.75rem;
  gap: var(--rk-space-2);
  align-items: center;
}

.label {
  display: inline-flex;
  gap: var(--rk-space-1);
  align-items: center;
}

.track {
  height: 6px;
  overflow: hidden;
  border-radius: 3px;
  background: var(--rk-color-surface-muted);
}

.fill {
  display: block;
  height: 100%;
  background: var(--rk-color-accent);
}

.number {
  text-align: right;
}

.draw {
  align-self: flex-start;
  min-height: var(--rk-control-height-sm);
  padding: 0 var(--rk-space-4);
  border: var(--rk-border-width) solid var(--rk-color-border);
  border-radius: var(--rk-radius-control);
  background: var(--rk-color-surface);
  color: var(--rk-color-text);
  font: var(--rk-font-weight-medium) var(--rk-font-size-sm) var(--rk-font-family-mono);
  cursor: pointer;
}

.draw:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.draw:focus-visible {
  outline: var(--rk-focus-width) solid var(--rk-color-accent);
  outline-offset: var(--rk-focus-width);
}

.hand {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--rk-space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>
