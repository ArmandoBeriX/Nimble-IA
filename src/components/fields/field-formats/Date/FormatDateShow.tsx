// FormatDateShow.tsx
import { Show, createMemo } from "solid-js";
import { FieldShowProps } from "../../FieldShow";

const parseToDate = (v: any): Date | null => {
  if (v == null || v === "") return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

const humanizeWithOptions = (d: Date | null, locale = "es-ES", fieldFormat: string = "date") => {
  if (!d) return "";
  try {
    const opts: Intl.DateTimeFormatOptions = fieldFormat === "time" 
      ? { hour: "2-digit", minute: "2-digit", hour12: true }
      : fieldFormat === "datetime"
      ? { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }
      : { day: "numeric", month: "short", year: "numeric" };
    
    return new Intl.DateTimeFormat(locale, opts).format(d);
  } catch {
    return d.toLocaleString();
  }
};

export default function FormatDateShow(props: FieldShowProps) {
  const field = props.field;
  const value = () => props.record?.[field.identifier!] ?? field.default ?? null;
  const fieldFormat = (field.fieldFormat ?? "date") as "date" | "datetime" | "time";
  
  const formattedValue = createMemo(() => {
    const dateValue = parseToDate(value());
    return dateValue ? humanizeWithOptions(dateValue, field.storeData?.locale ?? "es-ES", fieldFormat) : "";
  });

  const showValue = () => (
    <Show when={formattedValue()} fallback={<span class="text-gray-400">—</span>}>
      <span class="text-gray-800">{formattedValue()}</span>
    </Show>
  );

  if (props.onlyValue) return showValue();

  return (
    <div class="form-group field-date-show">
      <label class="field-label" title={field.description}>{field.name}</label>
      <div class="field-value">{showValue()}</div>
    </div>
  );
}