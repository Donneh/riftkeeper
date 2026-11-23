import { computed, nextTick, type Ref, ref, type ShallowRef, useId, watch } from "vue";
import type { QuerySuggestion } from "./query-suggestion.ts";

export function useQuerySuggestions(
  query: Ref<string>,
  input: Readonly<ShallowRef<HTMLInputElement | null>>,
  props: { readonly suggestions: readonly QuerySuggestion[]; readonly hint: string | null },
  emitCaret: (position: number) => void,
) {
  const id = useId();
  const focused = ref(false);
  const dismissed = ref(false);
  const active = ref(-1);

  const open = computed(
    () => focused.value && !dismissed.value && (props.suggestions.length > 0 || props.hint !== null),
  );
  const inputAttrs = computed(() => ({
    "aria-autocomplete": "list" as const,
    "aria-controls": open.value && props.suggestions.length > 0 ? `${id}-suggestions` : undefined,
    "aria-activedescendant": open.value && active.value >= 0 ? `${id}-option-${active.value}` : undefined,
    "aria-describedby": open.value && props.hint ? `${id}-hint` : undefined,
  }));

  watch(
    () => props.suggestions,
    () => {
      active.value = -1;
    },
  );

  function reportCaret() {
    emitCaret(input.value?.selectionStart ?? query.value.length);
  }

  function typed() {
    dismissed.value = false;
    reportCaret();
  }

  function focus() {
    focused.value = true;
    reportCaret();
  }

  function blur() {
    focused.value = false;
  }

  function dismiss() {
    dismissed.value = true;
  }

  async function apply(suggestion: QuerySuggestion) {
    const { start, end } = suggestion.span;
    const caret = start + suggestion.text.length;
    query.value = query.value.slice(0, start) + suggestion.text + query.value.slice(end);
    dismissed.value = false;
    await nextTick();
    input.value?.setSelectionRange(caret, caret);
    emitCaret(caret);
  }

  function move(step: number) {
    const count = props.suggestions.length;
    if (count === 0) return;
    dismissed.value = false;
    active.value = active.value < 0 && step < 0 ? count - 1 : (active.value + step + count) % count;
  }

  function keydown(event: KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (props.suggestions.length === 0) return;
      event.preventDefault();
      move(event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === "Escape" && open.value) {
      event.preventDefault();
      dismiss();
    } else if (event.key === "Tab" && !event.shiftKey && open.value && props.suggestions.length > 0) {
      event.preventDefault();
      void apply(props.suggestions[Math.max(active.value, 0)] as QuerySuggestion);
    } else if (event.key === "Enter" && open.value && active.value >= 0) {
      event.preventDefault();
      void apply(props.suggestions[active.value] as QuerySuggestion);
    }
  }

  return { id, open, active, inputAttrs, reportCaret, typed, focus, blur, dismiss, apply, keydown };
}
