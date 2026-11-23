<script setup lang="ts">
import { useTemplateRef } from "vue";
import QuerySuggestionList from "./QuerySuggestionList.vue";
import type { QuerySuggestion } from "./query-suggestion.ts";
import { useQuerySuggestions } from "./query-suggestions.ts";

const props = withDefaults(
  defineProps<{
    label?: string;
    placeholder?: string;
    name?: string;
    prompt?: string;
    suggestions?: readonly QuerySuggestion[];
    hint?: string | null;
  }>(),
  {
    label: "Search cards",
    placeholder: "",
    name: "q",
    prompt: "›",
    suggestions: () => [],
    hint: null,
  },
);

const query = defineModel<string>({ required: true });
const emit = defineEmits<{ submit: [query: string]; caret: [position: number] }>();

const input = useTemplateRef<HTMLInputElement>("input");
const suggesting = useQuerySuggestions(query, input, props, (position) => emit("caret", position));
const { open, active, inputAttrs } = suggesting;

function submit() {
  suggesting.dismiss();
  emit("submit", query.value.trim());
}
</script>

<template>
  <form class="search" role="search" @submit.prevent="submit">
    <label class="field">
      <span class="label">{{ label }}</span>
      <span class="prompt" aria-hidden="true">{{ prompt }}</span>
      <input
        ref="input"
        v-model="query"
        class="input"
        :name="name"
        type="search"
        :placeholder="placeholder"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        v-bind="inputAttrs"
        @input="suggesting.typed"
        @click="suggesting.reportCaret"
        @keyup="suggesting.reportCaret"
        @keydown="suggesting.keydown"
        @focus="suggesting.focus"
        @blur="suggesting.blur"
      />
    </label>
    <button class="button" type="submit">Search</button>
    <QuerySuggestionList
      v-if="open"
      :id="suggesting.id"
      :label="label"
      :suggestions="suggestions"
      :hint="hint"
      :active="active"
      @apply="suggesting.apply"
    />
  </form>
</template>

<style scoped>
.search {
  position: relative;
  z-index: 2;
  display: flex;
  gap: var(--rk-space-1);
  padding: var(--rk-space-1);
  border: var(--rk-border-width) solid var(--rk-color-border);
  border-radius: var(--rk-radius-lg);
  background: var(--rk-color-surface);
  transition:
    border-color var(--rk-duration-fast) ease,
    box-shadow var(--rk-duration-fast) ease;
}

.search:focus-within {
  border-color: var(--rk-color-accent);
  box-shadow: 0 0 0 3px var(--rk-color-focus-ring);
}

@media (hover: hover) {
  .search:hover {
    border-color: var(--rk-color-accent);
  }
}

.field {
  display: flex;
  flex: 1;
  align-items: center;
  min-width: 0;
  cursor: text;
}

.label {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.prompt {
  padding-inline: var(--rk-space-2) var(--rk-space-1);
  color: var(--rk-color-accent);
  font-family: var(--rk-font-family-mono);
  font-size: var(--rk-font-size-prompt);
  line-height: 1;
}

.input {
  flex: 1;
  min-width: 0;
  min-height: var(--rk-control-height-sm);
  padding: 0 var(--rk-space-2);
  border: none;
  background: transparent;
  color: var(--rk-color-text);
  font-family: var(--rk-font-family-mono);
  font-size: var(--rk-font-size-input);
  font-variant-ligatures: none;
  outline: none;
}

.input::placeholder {
  color: var(--rk-color-text-muted);
}

.input::-webkit-search-cancel-button {
  appearance: none;
}

.button {
  flex-shrink: 0;
  padding: 0 var(--rk-space-4);
  border: var(--rk-border-width) solid var(--rk-color-text);
  border-radius: var(--rk-radius-md);
  background: var(--rk-color-text);
  color: var(--rk-color-background);
  font: var(--rk-font-weight-medium) var(--rk-font-size-sm) var(--rk-font-family-mono);
  cursor: pointer;
  transition:
    background-color var(--rk-duration-fast) ease,
    border-color var(--rk-duration-fast) ease,
    color var(--rk-duration-fast) ease;
}

@media (hover: hover) {
  .button:hover {
    border-color: var(--rk-color-accent);
    background: var(--rk-color-accent);
    color: var(--rk-color-on-accent);
  }
}

.button:active {
  border-color: var(--rk-color-accent);
  background: var(--rk-color-accent);
  color: var(--rk-color-on-accent);
}

.button:focus-visible {
  outline: var(--rk-focus-width) solid var(--rk-color-accent);
  outline-offset: var(--rk-focus-width);
}
</style>
