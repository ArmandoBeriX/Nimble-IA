import { Accessor, Setter, createSignal, onCleanup } from "solid-js";
import { FilterInput, TableField } from "../../types/schema";
import Icon from "../ui/icon/Icon";

export function SearchBar(props: {
  availableFields: Array<TableField | string>;
  searchFilters: Accessor<FilterInput>;
  setSearchFilters: Setter<FilterInput>;
  placeholder?: string;
  debounceDelay?: number;
  onInputRef?: (input: HTMLInputElement) => void;
  class?: string;
  style?: string;
}) {
  const delay = () => props.debounceDelay ?? 200;

  const searchableFields = () => {
    if (typeof props.availableFields[0] === "object") {
      return (props.availableFields as TableField[])
        .filter(f => f.isSearchable)
        .map(f => f.identifier);
    } else {
      return props.availableFields as string[]
    }
  }

  const getCurrentValue = () => {
    const filters = props.searchFilters();
    const entry = Object.values(filters).find(f => f.or === "search");
    return entry?.v ?? "";
  };

  const normalizeSearchFilters = (value: string): FilterInput => {
    const trimmed = value.trim();

    if (!trimmed) return {};

    const fields = searchableFields();
    if (!fields.length) return {};

    // const withDotted = fields.filter(f => f.includes('.'))
    // const withoutDotted = fields.filter(f => !f.includes('.'))
    // const searchFilter = {
    //   [withoutDotted.join("+")]: {
    //     op: "~~~",
    //     v: trimmed,
    //     or: "search"
    //   }
    // };

    // withDotted.forEach((f) => {
    //   searchFilter[f] = { op: "~~~", v: trimmed, or: "search" };
    // })

    const searchFilter = {
      [fields.join("+")]: {
        op: "~~~",
        v: trimmed,
        or: "search"
      }
    };

    return searchFilter;
  };

  // estado local SOLO para debounce
  const [pendingValue, setPendingValue] = createSignal(getCurrentValue());
  let timer: number | undefined;

  const flush = (value: string) => {
    props.setSearchFilters(() => normalizeSearchFilters(value));
  };

  const onInput = (value: string) => {
    setPendingValue(value);

    if (timer) clearTimeout(timer);

    timer = window.setTimeout(() => {
      flush(value);
      timer = undefined;
    }, delay());
  };

  // limpieza correcta
  onCleanup(() => {
    if (timer) clearTimeout(timer);
  });

  return (
    <div class={"search-bar " + (props?.class ?? '')}>
      <input
        ref={(el) => {
          if (props.onInputRef) {
            props.onInputRef(el);
          }
        }}
        type="search"
        class="search-input"
        placeholder={
          searchableFields().length > 0
            ? props.placeholder ?? "Buscar…"
            : "No hay campos de búsqueda"
        }
        disabled={searchableFields().length === 0}
        value={pendingValue()}
        onInput={e => onInput(e.currentTarget.value)}
        style={props.style}
      />
      {(pendingValue()) ? null : <Icon name="search" stroke="#808080" />}
    </div>
  );
}
