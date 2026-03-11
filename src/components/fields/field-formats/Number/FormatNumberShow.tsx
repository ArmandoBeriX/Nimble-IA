// FormatNumberShow.tsx
import { Show, createMemo } from "solid-js";
import { FieldShowProps } from "../../FieldShow";

export default function FormatNumberShow(props: FieldShowProps) {
  const field = props.field;
  const rawValue = () => props.record?.[field.identifier!] ?? field.default;
  const isFloat = field.fieldFormat === "float";
  
  const formattedValue = createMemo(() => {
    const val = rawValue();
    if (val === null || val === undefined || val === "") return "";
    const num = Number(val);
    if (isNaN(num)) return String(val);
    
    const locale = field.storeData?.locale || "es-ES";
    const decimals = field.storeData?.decimals ?? (isFloat ? 2 : 0);
    
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  });

  const showValue = () => (
    <Show when={formattedValue()} fallback={<span class="text-gray-400">—</span>}>
      <span class="text-gray-800 font-mono">{formattedValue()}</span>
    </Show>
  );

  if (props.onlyValue) return showValue();

  return (
    <div class="form-group field-number-show">
      <label class="field-label" title={field.description}>{field.name}</label>
      <div class="field-value">{showValue()}</div>
    </div>
  );
}