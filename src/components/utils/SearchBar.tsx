import { Accessor, Setter, createSignal, onCleanup } from "solid-js";
import { FilterInput, TableField } from "../../types/schema";
import Icon from "../ui/icon/Icon";

interface SearchBarProps {
  availableFields: Array<TableField | string>;
  searchFilters: Accessor<FilterInput>;
  setSearchFilters: Setter<FilterInput>;
  placeholder?: string;
  debounceDelay?: number;
  onInputRef?: (input: HTMLInputElement) => void;
  class?: string;
  style?: string;
}

export function SearchBar(props: SearchBarProps) {
  const delay = () => props.debounceDelay ?? 200;

  const searchableFields = (): string[] => {
    if (props.availableFields.length === 0) return [];
    return typeof props.availableFields[0] === "object"
      ? (props.availableFields as TableField[]).filter(f => f.isSearchable).map(f => f.identifier)
      : (props.availableFields as string[]);
  };

  const getCurrentValue = () => {
    const entry = Object.values(props.searchFilters()).find(f => f.or === "search");
    return entry?.v ?? "";
  };

  const buildSearchFilter = (value: string): FilterInput => {
    const trimmed = value.trim();
    const fields = searchableFields();
    if (!trimmed || !fields.length) return {};
    return {
      [fields.join("+")]: { op: "~~~", v: trimmed, or: "search" },
    };
  };

  const [pendingValue, setPendingValue] = createSignal(getCurrentValue());
  let timer: number | undefined;

  const onInput = (value: string) => {
    setPendingValue(value);
    if (timer) clearTimeout(timer);
    timer = window.setTimeout(() => {
      props.setSearchFilters(() => buildSearchFilter(value));
      timer = undefined;
    }, delay());
  };

  onCleanup(() => { if (timer) clearTimeout(timer); });

  const isDisabled = () => searchableFields().length === 0;
  const placeholder = () =>
    isDisabled()
      ? "No hay campos de búsqueda"
      : (props.placeholder ?? "Buscar…");

  return (
    <div class={`relative flex items-center ${props.class ?? ""}`}>
      <input
        ref={el => props.onInputRef?.(el)}
        type="search"
        placeholder={placeholder()}
        disabled={isDisabled()}
        value={pendingValue()}
        onInput={e => onInput(e.currentTarget.value)}
        style={props.style}
        class={[
          "w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-sm",
          "placeholder:text-gray-400 transition-all duration-150",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
          "disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed",
        ].join(" ")}
      />
      {/* Search icon — hidden when there's text (input[type=search] adds its own clear) */}
      <span class="pointer-events-none absolute left-2.5 text-gray-400">
        <Icon name="search" size={14} stroke="currentColor" />
      </span>
    </div>
  );
}