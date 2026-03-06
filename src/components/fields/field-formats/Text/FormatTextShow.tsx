// FormatTextShow.tsx
import { Show } from "solid-js";
import { FieldShowProps } from "../../FieldShow";

export default function FormatTextShow(props: FieldShowProps) {
  const field = props.field;
  const value = props.record?.[field.identifier!] ?? field.default ?? "";
  
  const formatText = (text: string) => {
    if (!text) return text;
    
    // Preservar saltos de línea
    const lines = text.split('\n');
    return lines.map((line, index) => (
      <span>
        {line}
        {index < lines.length - 1 && <br />}
      </span>
    ));
  };

  const formattedValue = formatText(String(value || ""));

  const ShowValue = () => (
    <Show 
      when={value !== null && value !== "" && value !== undefined} 
      fallback={<span class="text-gray-400">—</span>}
    >
      <div class="text-gray-800 whitespace-pre-line">
        {formattedValue}
      </div>
    </Show>
  );

  if (props.onlyValue) return <ShowValue />;

  return (
    <div class="form-group field-text-show">
      <label class="field-label" title={field.description}>
        {field.name}
      </label>
      <div class="field-value">
        <ShowValue />
      </div>
    </div>
  );
}