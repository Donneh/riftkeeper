<script setup lang="ts">
import { ref, useId, watch } from "vue";
import type { PricingContent } from "./card-detail.ts";
import PriceSparkline from "./PriceSparkline.vue";

const props = defineProps<{ pricing: PricingContent }>();

const headingId = useId();
const shown = ref(0);

watch(
  () => props.pricing.finishes.length,
  (count) => {
    if (shown.value >= count) shown.value = 0;
  },
);
</script>

<template>
  <section class="pricing" :aria-labelledby="headingId">
    <div class="top">
      <h2 :id="headingId" class="heading">Market price</h2>
      <fieldset v-if="pricing.finishes.length > 1" class="switch">
        <legend class="visually-hidden">Finish</legend>
        <button
          v-for="(finish, index) in pricing.finishes"
          :key="finish.finish"
          type="button"
          class="option"
          :aria-pressed="index === shown"
          @click="shown = index"
        >
          {{ finish.finish }}
        </button>
      </fieldset>
    </div>
    <div v-for="(finish, index) in pricing.finishes" v-show="index === shown" :key="finish.finish" class="finish">
      <p class="value">
        <span class="finish-name" :class="{ 'visually-hidden': pricing.finishes.length > 1 }">{{ finish.finish }}</span>
        <strong v-if="finish.market" class="market">{{ finish.market }}</strong>
        <span v-if="finish.trend" class="change" aria-hidden="true">{{ finish.trend.change }}</span>
        <span v-if="finish.trend" class="period" aria-hidden="true">{{ finish.trend.period }}</span>
      </p>
      <PriceSparkline v-if="finish.trend" class="chart" :days="finish.trend.days" :label="finish.trend.description" />
      <dl v-if="finish.range.length > 0" class="range">
        <div v-for="figure in finish.range" :key="figure.label" class="figure">
          <dt class="figure-label">{{ figure.label }}</dt>
          <dd class="figure-amount">{{ figure.amount }}</dd>
        </div>
      </dl>
    </div>
    <p class="attribution">{{ pricing.attribution }}</p>
  </section>
</template>

<style scoped>
.pricing {
  display: grid;
  gap: var(--rk-space-2);
}

.top {
  display: flex;
  flex-wrap: wrap;
  gap: var(--rk-space-2);
  align-items: center;
  justify-content: space-between;
  min-height: var(--rk-control-height-sm);
}

.heading {
  margin: 0;
  color: var(--rk-color-text-muted);
  font: var(--rk-font-weight-regular) var(--rk-font-size-xs) var(--rk-font-family-mono);
}

.switch {
  display: inline-flex;
  gap: 2px;
  min-inline-size: 0;
  margin: 0;
  padding: 2px;
  border: var(--rk-border-width) solid var(--rk-glass-edge);
  border-radius: 999px;
}

.option {
  min-height: calc(var(--rk-control-height-sm) - 2 * var(--rk-border-width) - 4px);
  padding: 0 var(--rk-space-3);
  border: 0;
  border-radius: 999px;
  background: none;
  color: var(--rk-color-text-muted);
  font: inherit;
  font-size: var(--rk-font-size-xs);
  cursor: pointer;
  transition:
    background-color var(--rk-duration-fast) ease,
    color var(--rk-duration-fast) ease;
}

@media (hover: hover) {
  .option:hover {
    color: var(--rk-color-text);
  }
}

.option[aria-pressed="true"] {
  background: color-mix(in srgb, var(--rk-color-domain) 14%, transparent);
  color: var(--rk-color-text);
}

.option:focus-visible {
  outline: var(--rk-focus-width) solid var(--rk-color-accent);
  outline-offset: 2px;
}

.finish {
  display: grid;
  gap: var(--rk-space-2);
}

.value {
  display: flex;
  flex-wrap: wrap;
  gap: var(--rk-space-1) var(--rk-space-2);
  align-items: baseline;
  margin: 0;
}

.finish-name {
  color: var(--rk-color-text-muted);
  font-size: var(--rk-font-size-sm);
}

.market {
  font: var(--rk-font-weight-bold) 1.75rem / 1 var(--rk-font-family);
  font-variant-numeric: tabular-nums;
}

.change {
  font-size: var(--rk-font-size-sm);
  font-weight: var(--rk-font-weight-bold);
  font-variant-numeric: tabular-nums;
}

.period {
  color: var(--rk-color-text-muted);
  font: var(--rk-font-size-xs) var(--rk-font-family-mono);
}

.pricing .chart {
  width: 100%;
  height: 3.5rem;
  margin-top: var(--rk-space-2);
  border-bottom: var(--rk-border-width) dashed var(--rk-glass-edge);
}

.range {
  display: flex;
  justify-content: space-between;
  gap: var(--rk-space-4);
  margin: 0;
}

.figure {
  display: flex;
  gap: var(--rk-space-1);
  align-items: baseline;
}

.figure-label {
  color: var(--rk-color-text-muted);
  font: var(--rk-font-size-xs) var(--rk-font-family-mono);
}

.figure-amount {
  margin: 0;
  font-size: var(--rk-font-size-sm);
  font-variant-numeric: tabular-nums;
}

.attribution {
  margin: 0;
  color: var(--rk-color-text-muted);
  font-size: var(--rk-font-size-xs);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
