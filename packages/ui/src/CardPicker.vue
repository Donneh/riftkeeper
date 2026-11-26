<script setup lang="ts">
import { useId } from "vue";
import CardImage from "./CardImage.vue";
import { domainGlyph, type PickerCard } from "./deck-builder.ts";
import type { Domain } from "./domain.ts";
import RiftboundGlyph from "./RiftboundGlyph.vue";

withDefaults(
  defineProps<{ heading: string; lede: string; cards: readonly PickerCard[]; filters?: readonly Domain[] }>(),
  { filters: () => [] },
);
const filter = defineModel<Domain | null>("filter", { default: null });
const emit = defineEmits<{ pick: [id: string] }>();

const headingId = useId();
const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);
</script>

<template>
  <section class="picker" :aria-labelledby="headingId">
    <div class="bar">
      <h2 :id="headingId" class="heading">{{ heading }}</h2>
      <slot name="actions" />
    </div>
    <p class="lede">{{ lede }}</p>
    <fieldset v-if="filters.length > 0" class="filters">
      <legend class="sr-only">Show legends of a domain</legend>
      <button
        v-for="domain in filters"
        :key="domain"
        type="button"
        class="filter"
        :aria-pressed="filter === domain"
        @click="filter = filter === domain ? null : domain"
      >
        <RiftboundGlyph :name="domainGlyph(domain)" decorative />{{ capitalize(domain) }}
      </button>
    </fieldset>
    <slot />
    <ul class="grid" :aria-label="heading">
      <li v-for="card in cards" :key="card.id">
        <button type="button" class="card" :aria-pressed="card.selected" @click="emit('pick', card.id)">
          <CardImage
            class="frame"
            :name="card.name"
            :image-url="card.imageUrl"
            :srcset="card.srcset"
            sizes="(min-width: 64rem) 10rem, 45vw"
            :orientation="card.orientation"
          />
          <span class="name">{{ card.name }}</span>
          <span class="detail">
            <RiftboundGlyph v-for="domain in card.domains" :key="domain" :name="domainGlyph(domain)" decorative />
            {{ card.detail }}
          </span>
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.picker {
  display: flex;
  flex-direction: column;
  gap: var(--rk-space-4);
}

.bar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--rk-space-3);
  align-items: center;
  justify-content: space-between;
}

.heading {
  margin: 0;
  font-size: var(--rk-font-size-lg);
}

.lede {
  margin: 0;
  max-width: 44rem;
  color: var(--rk-color-text-muted);
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--rk-space-2);
  margin: 0;
  padding: 0;
  border: 0;
}

.filter {
  display: inline-flex;
  gap: var(--rk-space-1);
  align-items: center;
  min-height: var(--rk-control-height-sm);
  padding: 0 var(--rk-space-3);
  border: var(--rk-border-width) solid var(--rk-color-border);
  border-radius: var(--rk-radius-control);
  background: var(--rk-color-surface);
  color: var(--rk-color-text);
  font: var(--rk-font-size-sm) var(--rk-font-family);
  cursor: pointer;
}

.filter[aria-pressed="true"] {
  border-color: var(--rk-color-accent);
  background: var(--rk-color-surface-muted);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(9rem, calc(50% - var(--rk-space-2))), 1fr));
  gap: var(--rk-space-5) var(--rk-space-4);
  margin: 0;
  padding: 0;
  list-style: none;
}

.card {
  display: flex;
  flex-direction: column;
  gap: var(--rk-space-1);
  width: 100%;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.frame {
  transition: transform var(--rk-duration-fast) ease-out;
}

@media (hover: hover) {
  .card:hover .frame {
    transform: translateY(calc(-1 * var(--rk-space-1)));
  }
}

.card[aria-pressed="true"] .frame {
  outline: 3px solid var(--rk-color-accent);
  outline-offset: 3px;
}

.card:focus-visible {
  outline: none;
}

.card:focus-visible .frame {
  outline: var(--rk-focus-width) solid var(--rk-color-accent);
  outline-offset: var(--rk-focus-width);
}

.name {
  margin-top: var(--rk-space-1);
  font-size: var(--rk-font-size-md);
  font-weight: var(--rk-font-weight-bold);
}

.detail {
  color: var(--rk-color-text-muted);
  font: var(--rk-font-size-xs) var(--rk-font-family-mono);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .frame {
    transition: none;
  }
}
</style>
