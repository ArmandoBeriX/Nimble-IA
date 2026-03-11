// FormatListShow.tsx
import { For, Show, createMemo } from "solid-js";
import { FieldShowProps } from "../../FieldShow";
import Icon from "../../../ui/icon/Icon";

export default function FormatListShow(props: FieldShowProps) {
  const field = props.field;
  const rawValue = () => props.record?.[field.identifier!] ?? field.default;
  const posibleValues = field.storeData?.posibleValues || {};

  const selectedIds = createMemo(() => {
    const val = rawValue();
    if (val === null || val === undefined) return [];
    if (Array.isArray(val)) return val;
    return [val];
  });

  type OptionItem = { label: string; icon?: string };

  const options = createMemo((): OptionItem[] => {
    const ids = selectedIds();
    if (Array.isArray(posibleValues)) {
      return ids.map((id) => {
          const index = Number(id);
          if (!isNaN(index) && posibleValues[index] !== undefined) {
            const raw = posibleValues[index];
            if (typeof raw === "object" && raw !== null) {
              return { label: raw.label ?? String(raw), icon: raw.icon };
            }
            return { label: String(raw) };
          }
          return null;
        }).filter(Boolean) as OptionItem[];
    } else {
      return ids.map((id) => {
          const option = (posibleValues as any)[id];
          if (!option) return null;
          if (typeof option === "object") {
            return { label: option.label ?? String(option), icon: option.icon };
          }
          return { label: String(option) };
        }).filter(Boolean) as OptionItem[];
    }
  });

  const showValue = () => (
    <Show
      when={options().length > 0}
      fallback={<span class="text-gray-400">—</span>}
    >
      <div class="flex flex-wrap gap-1">
        <For each={options()}>
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

  if (props.onlyValue) return showValue();

  return (
    <div class="form-group field-list-show">
      <label class="field-label" title={field.description}>
        {field.name}
      </label>
      <div class="field-value">
        {showValue()}
      </div>
    </div>
  );
}