<script setup lang="ts" generic="T extends string">
defineProps<{ label: string; options: readonly { readonly value: T; readonly label: string }[] }>();
const selected = defineModel<T>({ required: true });
</script>

<template>
  <fieldset class="toggle">
    <legend class="sr-only">{{ label }}</legend>
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      :aria-pressed="selected === option.value"
      @click="selected = option.value"
    >
      {{ option.label }}
    </button>
  </fieldset>
</template>

<style scoped>
.toggle {
  display: inline-flex;
  min-width: 0;
  margin: 0;
  padding: 2px;
  border: var(--rk-border-width) solid var(--rk-color-border);
  border-radius: var(--rk-radius-md);
  background: var(--rk-color-surface-muted);
}

button {
  min-height: var(--rk-control-height-sm);
  padding: 0 var(--rk-space-3);
  border: 0;
  border-radius: var(--rk-radius-control);
  background: none;
  color: var(--rk-color-text-muted);
  font: var(--rk-font-weight-medium) var(--rk-font-size-sm) var(--rk-font-family);
  cursor: pointer;
}

button[aria-pressed="true"] {
  background: var(--rk-color-surface);
  color: var(--rk-color-text);
  box-shadow: 0 1px 2px var(--rk-glass-shadow);
}

@media (hover: hover) {
  button:hover {
    color: var(--rk-color-text);
  }
}

button:focus-visible {
  outline: var(--rk-focus-width) solid var(--rk-color-accent);
  outline-offset: 1px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
