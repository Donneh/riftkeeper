<script setup lang="ts">
import type { QuerySuggestion } from "./query-suggestion.ts";

defineProps<{
  id: string;
  label: string;
  suggestions: readonly QuerySuggestion[];
  hint: string | null;
  active: number;
}>();

const emit = defineEmits<{ apply: [suggestion: QuerySuggestion] }>();
</script>

<template>
  <div class="popover">
    <p v-if="hint" :id="`${id}-hint`" class="hint">{{ hint }}</p>
    <div
      v-if="suggestions.length > 0"
      :id="`${id}-suggestions`"
      class="options"
      role="listbox"
      :aria-label="`${label} suggestions`"
    >
      <div
        v-for="(suggestion, index) in suggestions"
        :id="`${id}-option-${index}`"
        :key="suggestion.label"
        class="option"
        :class="{ active: index === active }"
        role="option"
        tabindex="-1"
        :aria-selected="index === active"
        @mousedown.prevent
        @click="emit('apply', suggestion)"
        @keydown.enter="emit('apply', suggestion)"
      >
        <span class="option-label">{{ suggestion.label }}</span>
        <span v-if="suggestion.detail" class="option-detail">{{ suggestion.detail }}</span>
      </div>
    </div>
    <p v-if="suggestions.length > 0" class="keys" aria-hidden="true">Tab completes · ↑↓ choose · Esc closes</p>
  </div>
</template>

<style scoped>
.popover {
  position: absolute;
  top: calc(100% + var(--rk-space-1));
  right: 0;
  left: 0;
  max-height: 20rem;
  padding: var(--rk-space-1);
  overflow-y: auto;
  border: var(--rk-border-width) solid var(--rk-color-border);
  border-radius: var(--rk-radius-lg);
  background: var(--rk-color-surface);
  box-shadow: 0 12px 40px var(--rk-glass-shadow);
  font-family: var(--rk-font-family-mono);
  font-size: var(--rk-font-size-xs);
  font-variant-ligatures: none;
}

.hint {
  margin: 0;
  padding: var(--rk-space-2) var(--rk-space-3);
  color: var(--rk-color-text-muted);
  overflow-wrap: anywhere;
}

.options {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 13rem), 1fr));
}

.option {
  display: flex;
  gap: var(--rk-space-3);
  align-items: baseline;
  min-height: var(--rk-control-height-sm);
  align-content: center;
  flex-wrap: wrap;
  padding: var(--rk-space-1) var(--rk-space-3);
  border-radius: var(--rk-radius-md);
  color: var(--rk-color-text);
  cursor: pointer;
}

.option.active {
  background: var(--rk-color-surface-muted);
}

@media (hover: hover) {
  .option:hover {
    background: var(--rk-color-surface-muted);
  }
}

.option-label {
  font-size: var(--rk-font-size-sm);
}

.option-detail {
  color: var(--rk-color-text-muted);
}

.keys {
  display: none;
  margin: 0;
  padding: var(--rk-space-2) var(--rk-space-3) var(--rk-space-1);
  border-top: var(--rk-border-width) solid var(--rk-color-border);
  color: var(--rk-color-text-muted);
}

@media (hover: hover) and (pointer: fine) {
  .keys {
    display: block;
  }
}
</style>
