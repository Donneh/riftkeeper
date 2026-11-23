<script setup lang="ts">
import type { CardInfoContent } from "./card-detail.ts";
import GlyphText from "./GlyphText.vue";
import { isPlainLeftClick } from "./link-click.ts";

defineProps<{ card: CardInfoContent }>();

const emit = defineEmits<{ navigate: [href: string] }>();

function follow(event: MouseEvent, href: string) {
  if (!isPlainLeftClick(event)) return;
  event.preventDefault();
  emit("navigate", href);
}
</script>

<template>
  <div class="credits">
    <p v-if="card.kicker.length > 0" class="group identity">
      <a
        v-for="item in card.kicker"
        :key="item.href"
        class="identity-item"
        :href="item.href"
        @click="follow($event, item.href)"
      >
        <GlyphText :parts="item.parts" />
      </a>
    </p>
    <p v-if="card.legendSearch" class="group">
      <a class="link" :href="card.legendSearch.href" @click="follow($event, card.legendSearch.href)">{{
        card.legendSearch.label
      }}</a>
    </p>
    <div v-if="card.tags.length > 0 || card.artist" class="group">
      <ul v-if="card.tags.length > 0" class="tags" aria-label="Tags">
        <li v-for="tag in card.tags" :key="tag.href">
          <a class="tag" :href="tag.href" @click="follow($event, tag.href)">{{ tag.label }}</a>
        </li>
      </ul>
      <p v-if="card.artist" class="artist">
        Illustrated by
        <a class="link" :href="card.artist.href" @click="follow($event, card.artist.href)">{{ card.artist.label }}</a>
      </p>
    </div>
  </div>
</template>

<style scoped>
.credits {
  display: grid;
}

.group {
  display: grid;
  gap: var(--rk-space-3);
  margin: 0;
  padding-block: var(--rk-space-4);
}

.group:first-child {
  padding-top: 0;
}

.group:last-child {
  padding-bottom: 0;
}

.group:not(:last-child) {
  border-bottom: var(--rk-border-width) solid var(--rk-glass-edge);
}

.identity {
  display: var(--rk-detail-identity, none);
  grid-auto-flow: column;
  justify-content: start;
  gap: 0 var(--rk-space-3);
  color: var(--rk-color-text-muted);
  font: var(--rk-font-size-xs) var(--rk-font-family-mono);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.identity-item :deep(.glyph) {
  font-size: 1.3em;
}

.identity-item,
.link {
  display: inline-flex;
  align-items: center;
  justify-self: start;
  min-height: var(--rk-control-height-sm);
  color: inherit;
  text-decoration: underline;
  text-decoration-color: transparent;
  text-underline-offset: 0.25em;
  transition:
    color var(--rk-duration-fast) ease,
    text-decoration-color var(--rk-duration-fast) ease;
}

.link {
  color: var(--rk-color-text);
  text-decoration-color: var(--rk-color-border);
}

@media (hover: hover) {
  .identity-item:hover,
  .link:hover {
    color: var(--rk-color-text);
    text-decoration-color: var(--rk-color-domain-strong);
  }

  .tag:hover {
    border-color: var(--rk-color-domain-strong);
  }
}

.identity-item:focus-visible,
.link:focus-visible,
.tag:focus-visible {
  outline: var(--rk-focus-width) solid var(--rk-color-accent);
  outline-offset: 2px;
  border-radius: var(--rk-radius-sm);
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--rk-space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.tag {
  display: inline-flex;
  align-items: center;
  min-height: var(--rk-control-height-sm);
  padding: var(--rk-space-1) var(--rk-space-3);
  border: var(--rk-border-width) solid var(--rk-glass-edge);
  border-radius: 999px;
  color: var(--rk-color-text);
  font-size: var(--rk-font-size-sm);
  text-decoration: none;
  transition: border-color var(--rk-duration-fast) ease;
}

.artist {
  margin: 0;
  color: var(--rk-color-text-muted);
  font-size: var(--rk-font-size-sm);
}
</style>
