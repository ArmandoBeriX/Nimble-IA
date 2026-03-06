// FormatListShow.tsx
import { For, Show } from "solid-js";
import { FieldShowProps } from "../../FieldShow";
import Icon from "../../../ui/icon/Icon";

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

  // Obtener opciones completas (label + icon) de los valores seleccionados
  type OptionItem = { label: string; icon?: string };

  const getOptions = (): OptionItem[] => {
    if (Array.isArray(posibleValues)) {
      return selectedIds
        .map((id) => {
          const index = Number(id);
          if (!isNaN(index) && posibleValues[index] !== undefined) {
            const raw = posibleValues[index];
            if (typeof raw === "object" && raw !== null) {
              return { label: raw.label ?? String(raw), icon: raw.icon };
            }
            return { label: String(raw) };
          }
          return null;
        })
        .filter(Boolean) as OptionItem[];
    } else {
      return selectedIds
        .map((id) => {
          const option = (posibleValues as any)[id];
          if (!option) return null;
          if (typeof option === "object") {
            return { label: option.label ?? String(option), icon: option.icon };
          }
          return { label: String(option) };
        })
        .filter(Boolean) as OptionItem[];
    }
  };

  const options = getOptions();

  const ShowValue = () => (
    <Show
      when={options.length > 0}
      fallback={<span class="text-gray-400">—</span>}
    >
      <div class="flex flex-wrap gap-1">
        <For each={options}>
          {(option) => (
            <span class="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-100 text-blue-800 text-sm">
              <Show when={option.icon}>
                <Icon name={option.icon!} size={14} />
              </Show>
              {option.label}
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