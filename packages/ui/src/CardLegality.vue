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
</script>

<template>
  <section class="legality" :aria-labelledby="headingId">
    <h2 :id="headingId" class="heading">Legality</h2>
    <dl class="rows">
      <div v-for="row in rows" :key="row.format" class="row">
        <dt class="format">{{ row.format }}</dt>
        <dd class="verdict">
          <span class="status" :data-status="row.status">{{ row.label }}</span>
          <span v-if="row.note" class="note">{{ row.note }}</span>
          <a
            v-if="row.banList"
            class="link"
            :href="row.banList.href"
            :aria-label="`${row.format} ban list`"
            @click="follow($event, row.banList.href)"
            >{{ row.banList.label }}</a
          >
          <a v-if="row.source" class="link" :href="row.source.href" rel="noopener">{{ row.source.label }}</a>
        </dd>
      </div>
    </dl>
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

.rows {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: 0 var(--rk-space-4);
  align-items: start;
  margin: 0;
}

.row {
  display: contents;
}

.format {
  display: flex;
  align-items: center;
  min-height: var(--rk-control-height-sm);
  font-size: var(--rk-font-size-sm);
}

.verdict {
  display: flex;
  flex-wrap: wrap;
  gap: var(--rk-space-1) var(--rk-space-3);
  align-items: center;
  min-height: var(--rk-control-height-sm);
  margin: 0;
}

.status {
  min-width: 7rem;
  padding: 0 var(--rk-space-2);
  border: var(--rk-border-width) solid var(--rk-glass-edge);
  border-radius: var(--rk-radius-sm);
  font-size: var(--rk-font-size-sm);
  text-align: center;
}

.status[data-status="banned"] {
  border-color: var(--rk-color-danger-border);
  background: var(--rk-color-danger-surface);
  color: var(--rk-color-danger-text);
}

.status[data-status="upcoming"] {
  border-color: var(--rk-color-warning-border);
  background: var(--rk-color-warning-surface);
  color: var(--rk-color-warning-text);
}

.note,
.link {
  color: var(--rk-color-text-muted);
  font-size: var(--rk-font-size-sm);
}

.link {
  display: inline-flex;
  align-items: center;
  min-height: var(--rk-control-height-sm);
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
