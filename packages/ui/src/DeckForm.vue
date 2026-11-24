<script setup lang="ts">
import { useId } from "vue";

withDefaults(defineProps<{ busy?: boolean }>(), { busy: false });

const text = defineModel<string>({ default: "" });
const partner = defineModel<string>("partner", { default: "" });
const emit = defineEmits<{ check: [deck: { text: string; partner: string }] }>();

const inputId = useId();
const hintId = useId();
const partnerId = useId();

function submit() {
  const value = text.value.trim();
  if (value) emit("check", { text: value, partner: partner.value.trim() });
}
</script>

<template>
  <form class="deck-form rk-glass" @submit.prevent="submit">
    <label class="label" :for="inputId">Deck code or list</label>
    <textarea
      :id="inputId"
      v-model="text"
      class="input"
      rows="6"
      spellcheck="false"
      autocomplete="off"
      :aria-describedby="hintId"
      placeholder="CMAAAAAAAAAACAQ…  or  Legend: 1 Loose Cannon …"
      @keydown.enter.ctrl.prevent="submit"
      @keydown.enter.meta.prevent="submit"
    />
    <p :id="hintId" class="hint">
      Paste a Piltover Archive deck code, or a list with one card per line, such as “3 Discipline”, under Legend,
      Champion, Main Deck, Battlefields, Runes and Sideboard headings.
    </p>
    <label class="label" :for="partnerId">2v2 partner's deck code or list (optional)</label>
    <textarea
      :id="partnerId"
      v-model="partner"
      class="input partner"
      rows="2"
      spellcheck="false"
      autocomplete="off"
      placeholder="Checks that you don't share a legend or a battlefield"
      @keydown.enter.ctrl.prevent="submit"
      @keydown.enter.meta.prevent="submit"
    />
    <button class="submit" type="submit" :disabled="busy || !text.trim()">Check deck</button>
  </form>
</template>

<style scoped>
.deck-form {
  display: grid;
  gap: var(--rk-space-3);
  padding: var(--rk-space-4);
  border-radius: var(--rk-radius-card);
}

.label {
  color: var(--rk-color-text-muted);
  font: var(--rk-font-weight-regular) var(--rk-font-size-xs) var(--rk-font-family-mono);
}

.input {
  width: 100%;
  min-height: 8rem;
  padding: var(--rk-space-3);
  border: var(--rk-border-width) solid var(--rk-color-border);
  border-radius: var(--rk-radius-control);
  background: var(--rk-color-surface);
  color: var(--rk-color-text);
  font: var(--rk-font-size-input) / var(--rk-line-height) var(--rk-font-family-mono);
  resize: vertical;
}

.input.partner {
  min-height: 3.5rem;
}

.input:focus-visible {
  border-color: var(--rk-color-accent);
  outline: var(--rk-focus-width) solid var(--rk-color-focus-ring);
}

.hint {
  margin: 0;
  color: var(--rk-color-text-muted);
  font-size: var(--rk-font-size-sm);
}

.submit {
  justify-self: start;
  min-height: var(--rk-control-height-sm);
  padding: 0 var(--rk-space-5);
  border: var(--rk-border-width) solid var(--rk-color-accent);
  border-radius: var(--rk-radius-control);
  background: var(--rk-color-accent);
  color: var(--rk-color-on-accent);
  font: var(--rk-font-weight-medium) var(--rk-font-size-sm) var(--rk-font-family-mono);
  cursor: pointer;
}

.submit:disabled {
  opacity: 0.5;
  cursor: default;
}

.submit:focus-visible {
  outline: var(--rk-focus-width) solid var(--rk-color-accent);
  outline-offset: 2px;
}
</style>
