<script setup lang="ts">
import type { CardOrientation } from "./card-summary.ts";

withDefaults(defineProps<{ orientation?: CardOrientation; busy?: boolean }>(), {
  orientation: "portrait",
  busy: false,
});
</script>

<template>
  <article class="detail" :class="orientation" :aria-busy="busy">
    <div class="side">
      <div class="art">
        <slot name="art" />
      </div>
      <div v-if="$slots.credits" class="credits">
        <slot name="credits" />
      </div>
    </div>
    <div class="main">
      <slot />
    </div>
    <div v-if="$slots.aside" class="aside">
      <slot name="aside" />
    </div>
  </article>
</template>

<style scoped>
.detail {
  --rk-detail-kicker: flex;
  --rk-detail-identity: none;

  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas: "art" "main" "aside" "credits";
  gap: var(--rk-space-5);
  align-items: start;
}

.side {
  display: contents;
}

.art {
  grid-area: art;
  justify-self: center;
  width: min(18rem, 80vw);
  filter: drop-shadow(0 24px 48px color-mix(in srgb, var(--rk-color-domain) 30%, transparent));
}

.landscape .art {
  width: 100%;
}

.credits {
  grid-area: credits;
}

.main {
  grid-area: main;
  min-width: 0;
}

.aside {
  grid-area: aside;
  min-width: 0;
}

@media (min-width: 48rem) {
  .portrait {
    --rk-detail-kicker: none;
    --rk-detail-identity: grid;

    grid-template-columns: minmax(0, 20rem) minmax(0, 1fr);
    grid-template-rows: auto 1fr;
    grid-template-areas: "side main" "aside main";
    gap: var(--rk-space-4);
  }

  .portrait .side {
    display: grid;
    grid-area: side;
    gap: var(--rk-space-5);
    min-width: 0;
  }

  .portrait .art,
  .portrait .credits {
    grid-area: auto;
  }

  .portrait .art {
    width: 100%;
  }
}

@media (min-width: 64rem) {
  .detail {
    --rk-detail-kicker: none;
    --rk-detail-identity: grid;

    grid-template-columns: minmax(0, 17rem) minmax(0, 1fr) minmax(0, 22rem);
    grid-template-rows: auto;
    grid-template-areas: "side main aside";
    gap: var(--rk-space-4);
  }

  .landscape {
    grid-template-columns: minmax(0, 22rem) minmax(0, 1fr) minmax(0, 20rem);
  }

  .side {
    display: grid;
    grid-area: side;
    gap: var(--rk-space-5);
    position: sticky;
    top: var(--rk-space-5);
    min-width: 0;
  }

  .art,
  .credits {
    grid-area: auto;
  }

  .art {
    width: 100%;
  }
}
</style>
