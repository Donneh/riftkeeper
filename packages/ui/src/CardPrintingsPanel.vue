<script setup lang="ts">
import CardPricing from "./CardPricing.vue";
import type { PricingContent, PrintingSummary } from "./card-detail.ts";
import GlassPanel from "./GlassPanel.vue";
import PrintingList from "./PrintingList.vue";

defineProps<{ printings: readonly PrintingSummary[]; selected: string; pricing: PricingContent | null }>();

const emit = defineEmits<{ select: [id: string] }>();
</script>

<template>
  <GlassPanel class="printings-panel">
    <PrintingList
      class="section"
      :printings="printings"
      :selected="selected"
      @select="(id: string) => emit('select', id)"
    />
    <CardPricing v-if="pricing" class="section" :pricing="pricing" />
  </GlassPanel>
</template>

<style scoped>
.printings-panel {
  display: grid;
}

.section {
  padding: var(--rk-space-5) var(--rk-space-6);
}

.section + .section {
  border-top: var(--rk-border-width) solid var(--rk-glass-edge);
}

@media (max-width: 47.99rem) {
  .section {
    padding-inline: var(--rk-space-4);
  }
}
</style>
