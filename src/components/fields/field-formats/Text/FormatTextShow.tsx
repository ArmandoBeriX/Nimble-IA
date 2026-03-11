// FormatTextShow.tsx
import { Show, createMemo, For } from "solid-js";
import { FieldShowProps } from "../../FieldShow";

export default function FormatTextShow(props: FieldShowProps) {
  const field = props.field;
  const value = () => props.record?.[field.identifier!] ?? field.default ?? "";
  
  const lines = createMemo(() => {
    const text = String(value() || "");
    return text ? text.split('\n') : [];
  });

  const showValue = () => (
    <Show 
      when={lines().length > 0} 
      fallback={<span class="text-gray-400">—</span>}
    >
      <div class="text-gray-800 whitespace-pre-line">
        <For each={lines()}>
          {(line, index) => (
            <>
              {line}
              {index() < lines().length - 1 && <br />}
            </>
          )}
        </For>
      </div>
    </Show>
  );

  if (props.onlyValue) return showValue();

  return (
    <div class="form-group field-text-show">
      <label class="field-label" title={field.description}>{field.name}</label>
      <div class="field-value">{showValue()}</div>
    </div>
  );
}