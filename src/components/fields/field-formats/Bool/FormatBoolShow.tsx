// FormatBoolShow.tsx
import { Show } from "solid-js";
import { FieldShowProps } from "../../FieldShow";

export default function FormatBoolShow(props: FieldShowProps) {
  const field = props.field;
  const value = props.record?.[field.identifier!] ?? field.default ?? null;
  
  // Convertir valor a booleano para mostrar
  const getBooleanValue = () => {
    if (value === null || typeof value === "undefined") return null;
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") {
      const lc = value.trim().toLowerCase();
      return lc === "true" || lc === "1" || lc === "on";
    }
    return false;
  };

  const booleanValue = getBooleanValue();
  const iconClass = () => {
    if (booleanValue === true) return "text-green-500";
    if (booleanValue === false) return "text-red-400";
    return "text-gray-400";
  };

  const ShowValue = () => (
    <Show 
      when={booleanValue !== null} 
      fallback={<span class="text-gray-400">—</span>}
    >
      <div class={`inline-flex items-center gap-2 ${iconClass()}`}>
        <div class={`w-2 h-2 rounded-full ${booleanValue ? 'bg-green-500' : 'bg-red-400'}`} />
        <span>{booleanValue ? "Sí" : "No"}</span>
      </div>
    </Show>
  );

  if (props.onlyValue) return <ShowValue />;

  return (
    <div class="form-group field-bool-show">
      <label class="field-label" title={field.description}>
        {field.name}
      </label>
      <div class="field-value">
        <ShowValue />
      </div>
    </div>
  );
}