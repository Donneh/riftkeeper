<script setup lang="ts">
import CardLegality from "./CardLegality.vue";
import CardRulesNotes from "./CardRulesNotes.vue";
import CardText from "./CardText.vue";
import type { CardInfoContent } from "./card-detail.ts";
import GlassPanel from "./GlassPanel.vue";
import GlyphText from "./GlyphText.vue";
import { isPlainLeftClick } from "./link-click.ts";
import RiftboundGlyph from "./RiftboundGlyph.vue";

defineProps<{ card: CardInfoContent }>();

const emit = defineEmits<{ navigate: [href: string] }>();

function follow(event: MouseEvent, href: string) {
  if (!isPlainLeftClick(event)) return;
  event.preventDefault();
  emit("navigate", href);
}
</script>

<template>
  <GlassPanel class="info">
    <hgroup class="section head">
      <p class="kicker">
        <a
          v-for="item in card.kicker"
          :key="item.href"
          class="kicker-item"
          :href="item.href"
          @click="follow($event, item.href)"
        >
          <GlyphText :parts="item.parts" />
        </a>
      </p>
      <h1 class="name">{{ card.name }}</h1>
      <p v-if="card.subtitle" class="subtitle">{{ card.subtitle }}</p>
    </hgroup>

    <dl v-if="card.stats.length > 0" class="section stats">
      <div v-for="stat in card.stats" :key="stat.label" class="stat">
        <dt class="stat-label">{{ stat.label }}</dt>
        <dd class="stat-value">
          <RiftboundGlyph v-if="stat.glyph" class="stat-glyph" :name="stat.glyph" decorative />
          <span :class="{ 'visually-hidden': !stat.valueShown }">{{ stat.value }}</span>
        </dd>
      </div>
    </dl>

    <div v-if="card.rules.length > 0" class="section rules">
      <CardText v-for="(text, index) in card.rules" :key="index" :text="text" />
      <p v-if="card.textCaption" class="text-caption">{{ card.textCaption }}</p>
    </div>

    <CardLegality
      v-if="card.legality"
      class="section"
      :rows="card.legality"
      @navigate="(href) => emit('navigate', href)"
    />

    <CardRulesNotes v-if="card.notes.length > 0" class="section" :notes="card.notes" />
  </GlassPanel>
</template>

<style scoped>
.info {
  display: grid;
}

.section {
  display: grid;
  gap: var(--rk-space-3);
  padding: var(--rk-space-5) var(--rk-space-6);
}

.section + .section {
  border-top: var(--rk-border-width) solid var(--rk-glass-edge);
}

.head {
  gap: var(--rk-space-2);
  margin: 0;
  padding-top: var(--rk-space-6);
}

.kicker {
  display: var(--rk-detail-kicker, flex);
  flex-wrap: wrap;
  gap: 0 var(--rk-space-3);
  margin: calc((1lh - var(--rk-control-height-sm)) / 2) 0;
  color: var(--rk-color-text-muted);
  font: var(--rk-font-size-xs) var(--rk-font-family-mono);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.kicker-item {
  display: inline-flex;
  align-items: center;
  min-height: var(--rk-control-height-sm);
  color: inherit;
  text-decoration: underline;
  text-decoration-color: transparent;
  text-underline-offset: 0.25em;
  transition:
    color var(--rk-duration-fast) ease,
    text-decoration-color var(--rk-duration-fast) ease;
}

@media (hover: hover) {
  .kicker-item:hover {
    color: var(--rk-color-text);
    text-decoration-color: var(--rk-color-domain-strong);
  }
}

.kicker-item:focus-visible {
  outline: var(--rk-focus-width) solid var(--rk-color-accent);
  outline-offset: 2px;
  border-radius: var(--rk-radius-sm);
}

.kicker-item :deep(.glyph) {
  font-size: 1.3em;
}

.name {
  margin: 0;
  font: var(--rk-font-weight-bold) clamp(1.5rem, 3.5vw, 2rem) / 1 var(--rk-font-family);
  letter-spacing: var(--rk-letter-spacing-display);
  overflow-wrap: anywhere;
  text-wrap: balance;
}

.subtitle {
  margin: 0;
  color: var(--rk-color-text-muted);
  font-size: var(--rk-font-size-lg);
}

.stats {
  grid-template-columns: repeat(auto-fit, minmax(5rem, 1fr));
  gap: 0;
  margin: 0;
  padding-block: var(--rk-space-4);
}

.stat {
  display: grid;
  justify-items: center;
  gap: var(--rk-space-1);
}

.stat + .stat {
  border-left: var(--rk-border-width) solid var(--rk-glass-edge);
}

.stat-label {
  order: 1;
  color: var(--rk-color-text-muted);
  font: var(--rk-font-size-xs) var(--rk-font-family-mono);
}

.stat-value {
  display: flex;
  gap: var(--rk-space-2);
  align-items: center;
  margin: 0;
  font: var(--rk-font-weight-bold) 1.75rem / 1 var(--rk-font-family);
}

.stat-glyph {
  margin: 0;
}

.rules {
  background: color-mix(in srgb, var(--rk-color-domain) 8%, transparent);
  font-size: var(--rk-font-size-body);
}

.text-caption {
  margin: 0;
  color: var(--rk-color-text-muted);
  font-size: var(--rk-font-size-sm);
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

@media (max-width: 47.99rem) {
  .section {
    padding-inline: var(--rk-space-4);
  }
}
</style>
