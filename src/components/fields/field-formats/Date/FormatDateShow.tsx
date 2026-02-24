// FormatDateShow.tsx
import { Show } from "solid-js";
import { FieldShowProps } from "../../FieldShow";

// Helper para formatear fechas (similar al de edición)
const parseToDate = (v: string | Date | null): Date | null => {
  if (v == null || v === "") return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

const humanizeWithOptions = (
  d: Date | null,
  locale = "es-ES",
  long = false,
  fieldFormat: "date" | "datetime" | "time" = "date"
) => {
  if (!d) return "";

  try {
    if (fieldFormat === "time") {
      return d.toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    }

    if (fieldFormat === "datetime") {
      const opts: Intl.DateTimeFormatOptions = long
        ? {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }
        : {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          };
      return d.toLocaleString(locale, opts);
    }

    // Solo fecha
    const opts: Intl.DateTimeFormatOptions = long
      ? { weekday: "long", day: "numeric", month: "long", year: "numeric" }
      : { day: "numeric", month: "short", year: "numeric" };
    
    const fmt = new Intl.DateTimeFormat(locale, opts);
    return fmt.format(d);
  } catch {
    if (fieldFormat === "time") return d.toLocaleTimeString(locale);
    if (fieldFormat === "datetime") return d.toLocaleString(locale);
    return d.toLocaleDateString(locale);
  }
};

export default function FormatDateShow(props: FieldShowProps) {
  const field = props.field;
  const value = props.record?.[field.identifier!] ?? field.default ?? null;
  
  // Determinar el formato del campo
  const fieldFormat = (field.fieldFormat ?? "date") as "date" | "datetime" | "time";
  
  const dateValue = parseToDate(value);
  const formattedValue = dateValue 
    ? humanizeWithOptions(dateValue, field.storeData?.locale ?? "es-ES", false, fieldFormat)
    : "";

  const ShowValue = () => (
    <Show 
      when={formattedValue} 
      fallback={<span class="text-gray-400">—</span>}
    >
      <span class="text-gray-800">{formattedValue}</span>
    </Show>
  );

  if (props.onlyValue) return <ShowValue />;

  return (
    <div class="form-group field-date-show">
      <label class="field-label" title={field.description}>
        {field.name}
      </label>
      <div class="field-value">
        <ShowValue />
      </div>
    </div>
  );
}