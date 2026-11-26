<script setup lang="ts">
import type { CardOrientation } from "./card-summary.ts";

defineProps<{ imageUrl: string; srcset: string; orientation: CardOrientation; x: number; y: number }>();
</script>

<template>
  <img
    class="preview"
    :class="orientation"
    :src="imageUrl"
    :srcset="srcset"
    sizes="18rem"
    alt=""
    aria-hidden="true"
    :style="{ left: `${x}px`, top: `${y}px` }"
  />
</template>

<style scoped>
.preview {
  position: fixed;
  z-index: 30;
  width: 16rem;
  border-radius: var(--rk-radius-lg);
  box-shadow: 0 16px 40px var(--rk-glass-shadow);
  pointer-events: none;
}

.landscape {
  width: 22rem;
}

@media (hover: none) {
  .preview {
    display: none;
  }
}
</style>
