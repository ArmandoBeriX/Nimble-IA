// FormatListShow.tsx
import { For, Show } from "solid-js";
import { FieldShowProps } from "../../FieldShow";

export default function FormatListShow(props: FieldShowProps) {
  const field = props.field;
  const rawValue = props.record?.[field.identifier!] ?? field.default;
  
  const posibleValues = field.storeData?.posibleValues || {};
  
  // Convertir rawValue a array de IDs
  const getSelectedIds = () => {
    if (rawValue === null || rawValue === undefined) return [];
    if (Array.isArray(rawValue)) return rawValue;
    if (field.multiple) return [rawValue];
    return [rawValue];
  };

  const selectedIds = getSelectedIds();
  
  // Obtener etiquetas de los valores seleccionados
  const getLabels = () => {
    if (Array.isArray(posibleValues)) {
      return selectedIds
        .map(id => {
          const index = Number(id);
          if (!isNaN(index) && posibleValues[index]) {
            return posibleValues[index];
          }
          return null;
        })
        .filter(Boolean);
    } else {
      return selectedIds
        .map(id => {
          const option = posibleValues[id];
          return option?.label || option || null;
        })
        .filter(Boolean);
    }
  };

  const labels = getLabels();

  const ShowValue = () => (
    <Show 
      when={labels.length > 0} 
      fallback={<span class="text-gray-400">—</span>}
    >
      <div class="flex flex-wrap gap-1">
        <For each={labels}>
          {(label) => (
            <span class="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-sm">
              {label}
            </span>
          )}
        </For>
      </div>
    </Show>
  );

  if (props.onlyValue) return <ShowValue />;

  return (
    <div class="form-group field-list-show">
      <label class="field-label" title={field.description}>
        {field.name}
      </label>
      <div class="field-value">
        <ShowValue />
      </div>
    </div>
  );
}