// FormatBoolShow.tsx
import { Show, createMemo } from "solid-js";
import { FieldShowProps } from "../../FieldShow";

export default function FormatBoolShow(props: FieldShowProps) {
  const field = props.field;
  
  // ✅ Accessor para rastrear cambios en el record
  const value = () => props.record?.[field.identifier!] ?? field.default ?? null;
  
  const booleanValue = createMemo(() => {
    const v = value();
    if (v === null || typeof v === "undefined") return null;
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v !== 0;
    if (typeof v === "string") {
      const lc = v.trim().toLowerCase();
      return lc === "true" || lc === "1" || lc === "on";
    }
    return false;
  });

  const iconClass = () => {
    if (booleanValue() === true) return "text-green-500";
    if (booleanValue() === false) return "text-red-400";
    return "text-gray-400";
  };

  const showValue = () => (
    <Show 
      when={booleanValue() !== null} 
      fallback={<span class="text-gray-400">—</span>}
    >
      <div class={`inline-flex items-center gap-2 ${iconClass()}`}>
        <div class={`w-2 h-2 rounded-full ${booleanValue() ? 'bg-green-500' : 'bg-red-400'}`} />
        <span>{booleanValue() ? "Sí" : "No"}</span>
      </div>
    </Show>
  );

  if (props.onlyValue) return showValue();

  return (
    <div class="form-group field-bool-show">
      <label class="field-label" title={field.description}>
        {field.name}
      </label>
      <div class="field-value">
        {showValue()}
      </div>
    </div>
  );
}