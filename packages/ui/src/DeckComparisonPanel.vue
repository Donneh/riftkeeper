<script setup lang="ts">
import { ref, useId } from "vue";
import type { DeckComparison } from "./deck-report.ts";
import { isPlainLeftClick } from "./link-click.ts";

defineProps<{ comparison: DeckComparison | null }>();
const emit = defineEmits<{ compare: [code: string]; clear: []; navigate: [href: string] }>();

const headingId = useId();
const inputId = useId();
const code = ref("");

function submit() {
  const value = code.value.trim();
  if (value) emit("compare", value);
}

function follow(event: MouseEvent, href: string) {
  if (!isPlainLeftClick(event)) return;
  event.preventDefault();
  emit("navigate", href);
}
</script>

<template>
  <section class="comparison" :aria-labelledby="headingId">
    <h2 :id="headingId" class="heading">Compare</h2>
    <template v-if="comparison">
      <p class="summary">
        What this deck changes from
        <a class="link other" :href="comparison.href" @click="follow($event, comparison.href)">{{ comparison.title }}</a>
        <button class="clear" type="button" @click="emit('clear')">Stop comparing</button>
      </p>
      <p v-if="comparison.sections.length === 0" class="summary">The two decks have the same cards.</p>
      <div v-else class="sections">
        <section v-for="section in comparison.sections" :key="section.title" class="section">
          <h3 class="section-title">{{ section.title }}</h3>
          <ul class="lines" :aria-label="`${section.title} changes`">
            <li v-for="line in section.lines" :key="line.name" class="line" :data-direction="line.direction">
              <span class="change">{{ line.change }}</span>
              <a class="link" :href="line.href" @click="follow($event, line.href)">{{ line.name }}</a>
              <span class="detail">{{ line.detail }}</span>
            </li>
          </ul>
        </section>
      </div>
    </template>
    <form v-else class="form" @submit.prevent="submit">
      <label class="label" :for="inputId">Compare with another deck code, such as last month's list or a tournament winner</label>
      <div class="row">
        <input :id="inputId" v-model="code" class="input" spellcheck="false" autocomplete="off" />
        <button class="submit" type="submit" :disabled="!code.trim()">Compare</button>
      </div>
    </form>
  </section>
</template>

<style scoped>
.comparison {
  display: grid;
  gap: var(--rk-space-3);
  min-width: 0;
}

.heading {
  margin: 0;
  color: var(--rk-color-text-muted);
  font: var(--rk-font-weight-regular) var(--rk-font-size-xs) var(--rk-font-family-mono);
}

.summary,
.label {
  display: flex;
  flex-wrap: wrap;
  gap: 0 var(--rk-space-2);
  align-items: center;
  margin: 0;
  color: var(--rk-color-text-muted);
  font-size: var(--rk-font-size-sm);
}

.other {
  color: var(--rk-color-text);
  font-weight: var(--rk-font-weight-bold);
}

.form {
  display: grid;
  gap: var(--rk-space-2);
}

.row {
  display: flex;
  gap: var(--rk-space-2);
}

.input {
  flex: 1;
  min-width: 0;
  min-height: var(--rk-control-height-sm);
  padding: 0 var(--rk-space-3);
  border: var(--rk-border-width) solid var(--rk-color-border);
  border-radius: var(--rk-radius-control);
  background: var(--rk-color-surface);
  color: var(--rk-color-text);
  font: var(--rk-font-size-input) var(--rk-font-family-mono);
}

.input:focus-visible {
  border-color: var(--rk-color-accent);
  outline: var(--rk-focus-width) solid var(--rk-color-focus-ring);
}

.submit,
.clear {
  min-height: var(--rk-control-height-sm);
  padding: 0 var(--rk-space-4);
  border: var(--rk-border-width) solid var(--rk-color-border);
  border-radius: var(--rk-radius-control);
  background: var(--rk-color-surface);
  color: var(--rk-color-text);
  font: var(--rk-font-weight-medium) var(--rk-font-size-sm) var(--rk-font-family-mono);
  cursor: pointer;
}

.submit:disabled {
  opacity: 0.5;
  cursor: default;
}

.submit:focus-visible,
.clear:focus-visible {
  outline: var(--rk-focus-width) solid var(--rk-color-accent);
  outline-offset: 2px;
}

.sections {
  display: grid;
  gap: var(--rk-space-4) var(--rk-space-8);
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 18rem), 1fr));
}

.section-title {
  margin: 0 0 var(--rk-space-1);
  padding-bottom: var(--rk-space-1);
  border-bottom: var(--rk-border-width) solid var(--rk-color-border);
  font-size: var(--rk-font-size-md);
}

.lines {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}

.line {
  display: grid;
  grid-template-columns: 3.5ch minmax(0, 1fr) auto;
  gap: var(--rk-space-2);
  align-items: center;
  min-height: var(--rk-control-height-sm);
  font-size: var(--rk-font-size-sm);
}

.change {
  font: var(--rk-font-weight-bold) var(--rk-font-size-sm) var(--rk-font-family-mono);
}

.line[data-direction="added"] .change {
  color: var(--rk-color-domain-calm);
}

.line[data-direction="removed"] .change {
  color: var(--rk-color-danger-text);
}

.detail {
  color: var(--rk-color-text-muted);
  font: var(--rk-font-size-xs) var(--rk-font-family-mono);
}

.link {
  color: inherit;
  text-decoration: underline;
  text-decoration-color: var(--rk-color-border);
  text-underline-offset: 0.25em;
}

.link:focus-visible {
  outline: var(--rk-focus-width) solid var(--rk-color-accent);
  outline-offset: 2px;
}
</style>
