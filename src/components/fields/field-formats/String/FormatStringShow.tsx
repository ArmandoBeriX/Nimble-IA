// FormatStringShow.tsx
import { Show } from "solid-js";
import Icon from "../../../ui/icon/Icon";
import { FieldShowProps } from "../../FieldShow";
import WithTooltip from "../../../ui/tooltip/WithTooltip";

export default function FormatStringShow(props: FieldShowProps) {
  const field = props.field;

  // ✅ Función → SolidJS rastrea el acceso al store dentro de contextos reactivos
  const value = () => props.record?.[field.identifier!] ?? field.default ?? "";

  const fieldType = field.storeData?.type || 'text';

  // ✅ Función pura, sin llamarla todavía — se llamará dentro de JSX reactivo
  const formatValue = () => {
    const strValue = String(value() || ""); // ✅ value() en vez de value

    if (!strValue) return "";

    switch (fieldType) {
      case 'email':
        return (
          <a href={`mailto:${strValue}`} class="text-blue-600 hover:text-blue-800 hover:underline">
            {strValue}
          </a>
        );
      case 'url': {
        const url = strValue.startsWith('http') ? strValue : `https://${strValue}`;
        return (
          <a href={url} target="_blank" rel="noopener noreferrer"
            class="text-blue-600 hover:text-blue-800 hover:underline">
            {strValue}
          </a>
        );
      }
      case 'tel':
        return (
          <a href={`tel:${strValue}`} class="text-blue-600 hover:text-blue-800 hover:underline">
            {strValue}
          </a>
        );
      case 'password':
        return "••••••••";
      case 'color': {
        const isVariable = strValue?.trim().includes('var(');
        return (
          <div class="flex items-center gap-2">
            <WithTooltip tooltip={strValue}>
              <div
                class="relative w-6 h-6 rounded border border-gray-300 shadow-sm flex-shrink-0"
                style={{
                  "background-image": "repeating-conic-gradient(#e5e7eb 0% 25%, white 0% 50%)",
                  "background-size": "8px 8px",
                }}
              >
                <div class="absolute inset-0 rounded" style={{ background: strValue }} />
                <Show when={isVariable}>
                  <div class="absolute top-0 right-0 w-2.5 h-2.5 bg-blue-500 border-2 border-white rounded-full shadow-sm" />
                </Show>
              </div>
            </WithTooltip>
          </div>
        );
      }
      default:
        return strValue;
    }
  };

  // ✅ Llamada como función plana, no como <ShowValue /> — evita desmontaje/remontaje
  const showValue = () => (
    <Show
      when={value() !== null && value() !== "" && value() !== undefined}
      fallback={<span class="text-gray-400">—</span>}
    >
      {/* ✅ formatValue() se evalúa aquí dentro del contexto reactivo del Show */}
      <span class="text-gray-800">{formatValue()}</span>
    </Show>
  );

  if (props.onlyValue) return <>{showValue()}</>;

  return (
    <div class="form-group field-string-show">
      <WithTooltip tooltip={field.description}>
        <label class="field-label">{field.name}</label>
      </WithTooltip>
      <div class="field-value">
        {showValue()}
      </div>
    </div>
  );
}