<script setup lang="ts">
import { useId } from "vue";
import type { LegalityRow } from "./card-detail.ts";
import { isPlainLeftClick } from "./link-click.ts";

defineProps<{ rows: readonly LegalityRow[] }>();

const emit = defineEmits<{ navigate: [href: string] }>();

function follow(event: MouseEvent, href: string) {
  if (!isPlainLeftClick(event)) return;
  event.preventDefault();
  emit("navigate", href);
}

const headingId = useId();

const hasDetails = (row: LegalityRow) => Boolean(row.note || row.banList || row.source);
</script>

<template>
  <section class="legality" :aria-labelledby="headingId">
    <h2 :id="headingId" class="heading">Legality</h2>
    <dl class="chips">
      <div v-for="row in rows" :key="row.format" class="chip" :data-status="row.status">
        <dt class="format">{{ row.format }}</dt>
        <dd class="status">{{ row.label }}</dd>
      </div>
    </dl>
    <ul v-if="rows.some(hasDetails)" class="details">
      <li v-for="row in rows.filter(hasDetails)" :key="row.format" class="detail">
        <span class="detail-format">{{ row.format }}:</span>
        <span v-if="row.note">{{ row.note }}</span>
        <a
          v-if="row.banList"
          class="link"
          :href="row.banList.href"
          :aria-label="`${row.format} ban list`"
          @click="follow($event, row.banList.href)"
          >{{ row.banList.label }}</a
        >
        <a v-if="row.source" class="link" :href="row.source.href" rel="noopener">{{ row.source.label }}</a>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.legality {
  display: grid;
  gap: var(--rk-space-3);
}

.heading {
  margin: 0;
  color: var(--rk-color-text-muted);
  font: var(--rk-font-weight-regular) var(--rk-font-size-xs) var(--rk-font-family-mono);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--rk-space-2);
  margin: 0;
}

.chip {
  display: inline-flex;
  gap: var(--rk-space-2);
  align-items: center;
  min-height: var(--rk-control-height-sm);
  padding: 0 var(--rk-space-3);
  border: var(--rk-border-width) solid var(--rk-glass-edge);
  border-radius: var(--rk-radius-sm);
  font-size: var(--rk-font-size-sm);
}

.chip::before {
  content: "✓" / "";
}

.chip[data-status="banned"] {
  border-color: var(--rk-color-danger-border);
  background: var(--rk-color-danger-surface);
  color: var(--rk-color-danger-text);
}

.chip[data-status="banned"]::before {
  content: "✕" / "";
}

.chip[data-status="upcoming"] {
  border-color: var(--rk-color-warning-border);
  background: var(--rk-color-warning-surface);
  color: var(--rk-color-warning-text);
}

.chip[data-status="upcoming"]::before {
  content: "!" / "";
}

.format {
  color: var(--rk-color-text-muted);
}

.chip:not([data-status="legal"]) .format {
  color: inherit;
}

.status {
  margin: 0;
}

.details {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}

.detail {
  display: flex;
  min-height: var(--rk-control-height-sm);
  flex-wrap: wrap;
  gap: 0 var(--rk-space-2);
  align-items: center;
  color: var(--rk-color-text-muted);
  font-size: var(--rk-font-size-sm);
}

.detail-format {
  color: var(--rk-color-text);
}

.link {
  display: inline-flex;
  align-items: center;
  min-height: var(--rk-control-height-sm);
  color: inherit;
  text-decoration: underline;
  text-decoration-color: var(--rk-color-border);
  text-underline-offset: 0.25em;
  transition: text-decoration-color var(--rk-duration-fast) ease;
}

@media (hover: hover) {
  .link:hover {
    color: var(--rk-color-text);
    text-decoration-color: var(--rk-color-domain-strong);
  }
}

.link:focus-visible {
  outline: var(--rk-focus-width) solid var(--rk-color-accent);
  outline-offset: 2px;
  border-radius: var(--rk-radius-sm);
}
</style>
