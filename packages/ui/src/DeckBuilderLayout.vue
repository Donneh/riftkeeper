<script setup lang="ts">
defineProps<{ searchLabel?: string; statsLabel?: string }>();
</script>

<template>
  <div class="builder">
    <section class="panel search" :aria-label="searchLabel ?? 'Find cards'">
      <slot name="search" />
    </section>
    <div class="canvas">
      <slot />
    </div>
    <aside class="panel stats" :aria-label="statsLabel ?? 'Deck stats'">
      <slot name="stats" />
    </aside>
  </div>
</template>

<style scoped>
.builder {
  --rk-builder-top: 3.5rem;

  display: grid;
  grid-template-areas: "canvas" "search" "stats";
  gap: var(--rk-space-6);
  min-width: 0;
}

.search {
  grid-area: search;
}

.canvas {
  grid-area: canvas;
  min-width: 0;
}

.stats {
  grid-area: stats;
}

.panel {
  min-width: 0;
}

@media (min-width: 64rem) {
  .builder {
    grid-template-areas: "search canvas stats";
    grid-template-columns: 20rem minmax(0, 1fr) 17rem;
    align-items: start;
  }

  .panel {
    position: sticky;
    top: calc(var(--rk-builder-top) + var(--rk-space-4));
    max-height: calc(100vh - var(--rk-builder-top) - var(--rk-space-8));
    overflow: auto;
    overscroll-behavior: contain;
    scrollbar-width: thin;
  }

  .search {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
}

@media (min-width: 90rem) {
  .builder {
    grid-template-columns: 22rem minmax(0, 1fr) 19rem;
  }
}
</style>
