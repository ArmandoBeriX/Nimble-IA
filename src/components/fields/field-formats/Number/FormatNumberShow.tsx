// FormatNumberShow.tsx
import { Show } from "solid-js";
import { FieldShowProps } from "../../FieldShow";

export default function FormatNumberShow(props: FieldShowProps) {
  const field = props.field;
  const rawValue = props.record?.[field.identifier!] ?? field.default;
  
  const isFloat = field.fieldFormat === "float";
  
  const formatNumber = () => {
    if (rawValue === null || rawValue === undefined || rawValue === "") return "";
    
    const num = Number(rawValue);
    if (isNaN(num)) return String(rawValue);
    
    // Configuración de formato desde storeData
    const locale = field.storeData?.locale || "es-ES";
    const minimumFractionDigits = isFloat ? (field.storeData?.decimals || 2) : 0;
    const maximumFractionDigits = isFloat ? (field.storeData?.decimals || 2) : 0;
    
    const formatter = new Intl.NumberFormat(locale, {
      minimumFractionDigits,
      maximumFractionDigits,
    });
    
    return formatter.format(num);
  };

  const formattedValue = formatNumber();

  const ShowValue = () => (
    <Show 
      when={formattedValue} 
      fallback={<span class="text-gray-400">—</span>}
    >
      <span class="text-gray-800 font-mono">{formattedValue}</span>
    </Show>
  );

  if (props.onlyValue) return <ShowValue />;

  return (
    <div class="form-group field-number-show">
      <label class="field-label" title={field.description}>
        {field.name}
      </label>
      <div class="field-value">
        <ShowValue />
      </div>
    </div>
  );
}