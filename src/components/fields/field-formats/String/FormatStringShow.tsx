// FormatStringShow.tsx
import { Show } from "solid-js";
import Icon from "../../../ui/icon/Icon";
import { FieldShowProps } from "../../FieldShow";

export default function FormatStringShow(props: FieldShowProps) {
  const field = props.field;
  const value = props.record?.[field.identifier!] ?? field.default ?? "";
  
  const fieldType = field.storeData?.type || 'text';
  
  const formatValue = () => {
    const strValue = String(value || "");
    
    if (!strValue) return "";
    
    switch (fieldType) {
      case 'email':
        return (
          <a 
            href={`mailto:${strValue}`} 
            class="text-blue-600 hover:text-blue-800 hover:underline"
          >
            {strValue}
          </a>
        );
      case 'url':
        // Asegurar que tenga protocolo
        const url = strValue.startsWith('http') ? strValue : `https://${strValue}`;
        return (
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer"
            class="text-blue-600 hover:text-blue-800 hover:underline"
          >
            {strValue}
          </a>
        );
      case 'tel':
        return (
          <a 
            href={`tel:${strValue}`} 
            class="text-blue-600 hover:text-blue-800 hover:underline"
          >
            {strValue}
          </a>
        );
      case 'password':
        return "••••••••";
      case 'color':
        return (
          <div class="flex items-center gap-2">
            <div 
              class="w-6 h-6 rounded border border-gray-300"
              style={{ background: strValue }}
              title={strValue}
            />
            <span class="text-gray-800">{strValue}</span>
          </div>
        );
      case 'icon':
        return (
          <div class="flex items-center gap-2">
            <Icon
              name={strValue} 
              fill={field.storeData?.fill || null}
              stroke={field.storeData?.stroke || null}
            />
            <span class="text-gray-800">{strValue}</span>
          </div>
        );
      default:
        return strValue;
    }
  };

  const formattedValue = formatValue();

  const ShowValue = () => (
    <Show 
      when={value !== null && value !== "" && value !== undefined} 
      fallback={<span class="text-gray-400">—</span>}
    >
      <span class="text-gray-800">{formattedValue}</span>
    </Show>
  );

  if (props.onlyValue) return <ShowValue />;

  return (
    <div class="form-group field-string-show">
      <label class="field-label" title={field.description}>
        {field.name}
      </label>
      <div class="field-value">
        <ShowValue />
      </div>
    </div>
  );
}