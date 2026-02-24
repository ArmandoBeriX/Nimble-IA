// TableList.tsx
import { store } from "../app";
import {
  createSignal,
  createMemo,
  createEffect,
  onCleanup,
  For,
  Show,
  Accessor,
} from "solid-js";
import { ColumnSelectorButton } from "../components/utils/ColumnSelector";
import { SearchBar } from "../components/utils/SearchBar";
import { useRecordQuery, useRecordCount, useRecordTotal, IncludeRelProps } from "../hooks/useRecords";
import { FilterInput, TableField } from "../types/schema";
import Pagination from "../components/utils/Pagination";
import RecordButtonAction from "../components/record/RecordButtonAction";
import Button from "../components/ui/Button";
import FilterSelectorButton from "../components/utils/FilterSelector";
import SkeletonLoader from "../components/skeleton-loader/SkeletonLoader";
import RecordDetails from "../components/fields/RecordDetails";
import FieldShow from "../components/fields/FieldShow";

/* --------------------------
   Tipos
   -------------------------- */
type FooterOp = "count" | "sum" | "average";

export type ContainerRef =
  | HTMLElement
  | Window
  | (() => HTMLElement | null)
  | Accessor<HTMLElement | null>
  | null | undefined;

export type TableProps = {
  tableIdentifier: string;
  filters?: FilterInput;
  order?: Array<[string, "ASC" | "DESC"]>;
  includes?: IncludeRelProps
  page?: number;
  limit?: number;
  frozenColumns?: string[]; // obligatorias
  defaultColumns?: string[]; // predeterminadas
  footer?: Record<string, FooterOp>;
  actions?: Array<"show" | "edit" | "delete">;
  withSearch?: boolean;
  withFilters?: boolean;
  editableColumns?: boolean;
  withCreate?: boolean;
  autoLoadOnScroll?: boolean; // default: true
  showPagination?: boolean; // default: true
  containerRef?: ContainerRef; // preferido a querySelector
  requireFocusToAutoLoad?: boolean; // default: true
  skeletonLoad?: number; // filas esqueleto, por defecto toma limit
};

/* --------------------------
   Helpers
   -------------------------- */
function renderCell(row: any, col: string, fields: TableField[]) {
  return "NO IMPLEMENTED"
}

/* --------------------------
   Componente
   -------------------------- */
export default function TableList(props: TableProps) {
  if (!props.tableIdentifier) {
    throw new Error("tableIdentifier is required");
  }

  /* --------------------------
     Schema / Campos
     -------------------------- */
  const tableFields = createMemo<TableField[]>(
    () => store.getTableFieldsFor(props.tableIdentifier) ?? []
  );
  const availableIds = createMemo(() => new Set(tableFields().map((f) => f.identifier)));

  /* --------------------------
     Defaults reactivos
     -------------------------- */
  const autoLoadOnScroll = () => props.autoLoadOnScroll ?? true;
  const showPagination = () => props.showPagination ?? true;
  const requireFocusToAutoLoad = () => props.requireFocusToAutoLoad ?? true;

  const [page, setPage] = createSignal<number>(props.page ?? 1);
  const [limit, setLimit] = createSignal<number>(props.limit ?? 20);

  const defaultColumns = createMemo<string[]>(() =>
    (props.defaultColumns && props.defaultColumns.length > 0)
      ? props.defaultColumns.filter((c) => availableIds().has(c))
      : tableFields().map((f) => f.identifier)
  );

  /* --------------------------
     Visible columns (signal)
     -------------------------- */
  const visibleColumnsInitial = () => {
    const requested = defaultColumns();
    const frozen = (props.frozenColumns ?? []).filter((f) => availableIds().has(f));
    const withoutFrozen = requested.filter((c) => !frozen.includes(c));
    return [...frozen, ...withoutFrozen];
  };
  const [visibleColumns, setVisibleColumns] = createSignal<string[]>(visibleColumnsInitial());
  createEffect(() => {
    setVisibleColumns(visibleColumnsInitial());
  });

  const columnFields = createMemo(() => {
    const fields = tableFields(); // Array de objetos
    const visible = visibleColumns(); // Array de strings con identificadores

    // Crear un mapa para acceso rápido por identifier
    const fieldsMap = new Map();
    fields.forEach(field => fieldsMap.set(field.identifier, field));

    // Filtrar y ordenar según visibleColumns
    return visible
      .map(identifier => fieldsMap.get(identifier))
      .filter(Boolean); // Filtrar null/undefined en caso de que haya identificadores no encontrados
  });
  /* --------------------------
     Column selector UI state
     -------------------------- */
  const [openColumnSelector, setOpenColumnSelector] = createSignal<boolean>(false);

  /* --------------------------
     Selección de filas
     -------------------------- */
  const [selectedItems, setSelectedItems] = createSignal<Set<string>>(new Set());
  const toggleSelect = (id: string) =>
    setSelectedItems((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });

  /* --------------------------
     Filters & Search
     -------------------------- */
  const [filters, setFilters] = createSignal<FilterInput>(props.filters ?? {});
  const [searchFilters, setSearchFilters] = createSignal<FilterInput>({});
  const [combinedFilters, setCombinedFilters] = createSignal<FilterInput>({});

  createEffect(() => {
    const f = filters() ?? {};
    const s = searchFilters() ?? {};
    setCombinedFilters({ ...f, ...s });
  });

  createEffect(() => {
    console.debug("[DEBUG] combinedFilters changed ->", combinedFilters());
  });

  /* --------------------------
     Query options / hooks de datos
     -------------------------- */
  const order = () => props.order ?? [];
  const queryOptions = createMemo(() => ({ order: order(), page: page(), limit: limit() }));

  const { data: rows, loading, refresh } = useRecordQuery(
    props.tableIdentifier,
    combinedFilters,
    queryOptions
  );

  const [loadingWait, setLoadingWait] = createSignal(''); // Esto es para que no se ponga loading la seccion cada vez que modifico cualquier cosita, sino despues de un timeout si no se termina de cargar.
  let loadingWaitTimeout: NodeJS.Timeout | null = null;
  createEffect(() => {
    setLoadingWait(loading());
    if (loadingWaitTimeout) clearTimeout(loadingWaitTimeout)
    loadingWaitTimeout = setTimeout(() => {
      setLoadingWait('')
    }, 250)
  })

  const { count: totalCount } = useRecordCount(props.tableIdentifier, combinedFilters);

  /* --------------------------
     Footer totals
     -------------------------- */
  const footerCols = Object.keys(props.footer ?? {});
  type TotalHookResult = { total: Accessor<number | null> } | null;
  const footerTotalsMap: Record<string, TotalHookResult> = {};
  for (const col of footerCols) {
    const op = props.footer![col];
    if (op === "sum" || op === "average") {
      footerTotalsMap[col] = useRecordTotal(props.tableIdentifier, col, combinedFilters);
    } else {
      footerTotalsMap[col] = null;
    }
  }
  const footerValues = createMemo(() => {
    const res: Record<string, number | string> = {};
    const totalRows = Number(totalCount() ?? 0);
    for (const col of footerCols) {
      const op = props.footer![col];
      if (op === "count") res[col] = totalRows;
      else if (op === "sum") {
        const hook = footerTotalsMap[col];
        res[col] = hook ? Number(hook.total() ?? 0) : "-";
      } else if (op === "average") {
        const hook = footerTotalsMap[col];
        const sum = hook ? Number(hook.total() ?? 0) : 0;
        res[col] = totalRows > 0 ? sum / totalRows : 0;
      }
    }
    return res;
  });

  /* --------------------------
     Helper current page ids
     -------------------------- */
  const currentPageIds = createMemo(() =>
    (rows() ?? []).map((r: any) => String(r.id ?? r.ID ?? r._id ?? r.uuid ?? r.id))
  );

  const toggleSelectAllOnPage = () => {
    const ids = currentPageIds();
    setSelectedItems((prev) => {
      const s = new Set(prev);
      if (ids.length > 0 && ids.every((id) => s.has(id))) ids.forEach((id) => s.delete(id));
      else ids.forEach((id) => s.add(id));
      return s;
    });
  };

  const onDelete = async (id: string) => {
    if (!confirm("Confirm delete?")) return;
    await store.delete(props.tableIdentifier, id);
    refresh();
  };

  /* --------------------------
     Skeleton load (reactivo)
     -------------------------- */
  const skeletonLoad = createMemo(() => {
    if (typeof props.skeletonLoad === "number") return props.skeletonLoad;
    const lim = limit() ?? 0;
    return lim > 0 ? lim : 0;
  });

  /* --------------------------
     Infinite scroll via IntersectionObserver
     -------------------------- */
  let localContentRef: HTMLElement | null = null;
  let sentinelEl: HTMLElement | null = null;
  let io: IntersectionObserver | null = null;
  const nearBottomMargin = 120; // px rootMargin

  // Resolver containerRef flexible (HTMLElement | Window | accessor | null)
  function resolveContainer(ref: ContainerRef): HTMLElement | Window | null {
    if (!ref) return null;
    try {
      // Solid accessor or function returning HTMLElement
      if (typeof ref === "function") {
        const maybe = (ref as () => HTMLElement | null)();
        if (maybe) return maybe;
      }
      // Direct HTMLElement
      if ((ref as any) instanceof HTMLElement) return ref as HTMLElement;
      // Window
      if ((ref as any) === window) return window;
    } catch {
      // ignore
    }
    return null;
  }

  // isLastPage helper
  const isLastPage = () => {
    const total = Number(totalCount() ?? 0);
    const lim = Math.max(1, limit());
    const tp = Math.max(1, Math.ceil(total / lim));
    return page() >= tp;
  };

  // Setup IntersectionObserver: observa 'sentinelEl' dentro del root resuelto
  createEffect(() => {
    // Si no hay window / IO no hacemos nada (SSR safe)
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") return;

    // Si no queremos autoLoad on scroll, desconectamos y nos vamos
    if (!autoLoadOnScroll()) {
      if (io) {
        io.disconnect();
        io = null;
      }
      return;
    }

    // Resuelve root: props.containerRef -> localContentRef -> null (viewport)
    const resolved = resolveContainer(props.containerRef) ?? localContentRef ?? null;
    const rootForIO = resolved instanceof HTMLElement ? resolved : null;

    // cleanup previo
    if (io) {
      try {
        io.disconnect();
      } catch {
        /* ignore */
      }
      io = null;
    }

    io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            // requireFocusToAutoLoad checks
            if (requireFocusToAutoLoad()) {
              const active = document.activeElement;
              const focusedInside =
                rootForIO
                  ? active && rootForIO.contains(active)
                  : document.hasFocus();
              if (!focusedInside) {
                return;
              }
            }

            // Solo avanzar si no está cargando y no es la última página
            if (!loading() && !isLastPage()) {
              setPage((p) => p + 1);
            }
          }
        }
      },
      {
        root: rootForIO,
        rootMargin: `${nearBottomMargin}px`,
        threshold: 0.01,
      }
    );

    if (sentinelEl) {
      try {
        io.observe(sentinelEl);
      } catch {
        // ignore
      }
    }

    onCleanup(() => {
      if (io) {
        try {
          io.disconnect();
        } catch {
          /* ignore */
        }
        io = null;
      }
    });
  });

  // Cleanup final on unmount
  onCleanup(() => {
    if (io) {
      try {
        io.disconnect();
      } catch {
        /* ignore */
      }
      io = null;
    }
  });

  /* --------------------------
     Reset page cuando cambian filters / tableIdentifier
     -------------------------- */
  const [prevFilterStr, setPrevFilterStr] = createSignal<string>("");
  createEffect(() => {
    const str = JSON.stringify({ f: combinedFilters(), tid: props.tableIdentifier });
    if (str !== prevFilterStr()) {
      setPage(1);
      setPrevFilterStr(str);
    }
  });

  function availableAction(action: string) {
    return ((props.actions ?? ["show", "edit", "delete"]) as string[]).includes(action);
  }

  /* --------------------------
     Render
     -------------------------- */
  const rowsArray = () => rows() ?? [];
  const hasItems = () => (!loading() || loadingWait()) && rowsArray().length > 0;

  return (
    <div class="table-wrap">
      <div class="table-toolbar">
        <Show when={props.withSearch ?? true}>
          <SearchBar
            availableFields={tableFields()}
            searchFilters={searchFilters}
            setSearchFilters={setSearchFilters}
            placeholder="Buscar…"
            debounceDelay={200}
          />
        </Show>

        <Show when={props.withFilters ?? true}>
          <FilterSelectorButton
            tableIdentifier={props.tableIdentifier}
            filters={filters}
            setFilters={setFilters}
          />
        </Show>

        <Show when={props.editableColumns ?? true}>
          <ColumnSelectorButton
            availableFields={tableFields()}
            visibleColumns={visibleColumns}
            setVisibleColumns={setVisibleColumns}
            frozenColumns={props.frozenColumns}
            defaultColumns={defaultColumns()}
          />
        </Show>

        <Show when={props.withCreate ?? true}>
          <RecordButtonAction action="create" tableIdentifier={props.tableIdentifier} />
        </Show>

        <div style={{ flex: 1 }} />

        <div>
          <strong>{totalCount()?.toString() ?? "-"}</strong> items
        </div>
      </div>

      <div
        class="table-content"
        role="region"
        aria-label={`Table ${props.tableIdentifier}`}
        tabindex={0}
        ref={(el) => (localContentRef = el)}
      >
        <table class="table" role="table" aria-label="data table">
          <thead>
            <tr>
              <th class="sticky-left">
                <input
                  type="checkbox"
                  class="checkbox"
                  onInput={() => toggleSelectAllOnPage()}
                  checked={
                    currentPageIds().length > 0 &&
                    currentPageIds().every((id) => selectedItems().has(id))
                  }
                />
              </th>

              <For each={visibleColumns()}>
                {(col) => {
                  const field = tableFields().find((f) => f.identifier === col);
                  return <th>{field?.name ?? col}</th>;
                }}
              </For>

              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            <Show
              when={!loading() || loadingWait()}
              fallback={
                skeletonLoad() > 0 ? (
                  <SkeletonLoader display="row" count={skeletonLoad()} items={[{ class: 'sticky-left' }, { repeat: visibleColumns().length + 1 }]} />
                ) : (
                  <tr>
                    <td colSpan={(visibleColumns().length ?? 0) + 2}>Cargando...</td>
                  </tr>
                )
              }
            >
              <Show when={hasItems()} fallback={
                // EMPTY STATE: cuando no hay items (y no está cargando)
                <tr class="empty-row">
                  <td colSpan={(visibleColumns().length ?? 0) + 2}>
                    <div class="empty-state" style="max-width: 90vw; position: sticky; left: 1vw;">
                      <h3>No hay items</h3>
                      <p>No se encontraron registros que coincidan con los filtros.</p>
                      <div style={{ "margin-top": "8px" }}>
                        {/* <Button onClick={() => { setPage(1); refresh(); }}>
                          Reintentar
                        </Button> */}
                        <Show when={props.withCreate ?? true}>
                          <RecordButtonAction action="create" tableIdentifier={props.tableIdentifier}>
                            Crear nuevo
                          </RecordButtonAction>
                        </Show>
                      </div>
                    </div>
                  </td>
                </tr>
              }>
                <For each={rowsArray()}>
                  {(row: any) => {
                    const id = String(row.id ?? row.ID ?? row._id ?? row.uuid ?? row.id);
                    return (
                      <tr>
                        <td class="sticky-left">
                          <input
                            type="checkbox"
                            class="checkbox"
                            checked={selectedItems().has(id)}
                            onInput={() => toggleSelect(id)}
                          />
                        </td>

                        <For each={columnFields()}>
                          {(colField) =>
                            <td><FieldShow field={colField} record={row} onlyValue={true} /></td>
                          }
                        </For>

                        <td>
                          <div class="actions">
                            <Show when={availableAction("show")}>
                              <RecordButtonAction action="show" tableIdentifier={props.tableIdentifier} id={id} />
                            </Show>
                            <Show when={availableAction("edit")}>
                              <RecordButtonAction action="update" tableIdentifier={props.tableIdentifier} id={id} />
                            </Show>
                            <Show when={availableAction("delete")}>
                              <RecordButtonAction action="delete" tableIdentifier={props.tableIdentifier} id={id} />
                            </Show>
                          </div>
                        </td>
                      </tr>
                    );
                  }}
                </For>
              </Show>
            </Show>
          </tbody>

          <Show when={props.footer && Object.keys(props.footer).length > 0}>
            <tfoot class="table-footer">
              <tr>
                <td class="sticky-left"> </td>
                <For each={visibleColumns()}>
                  {(col) => {
                    const val = props.footer && props.footer[col] ? footerValues()[col] ?? "-" : "";
                    return <td>{val !== "" ? val : null}</td>;
                  }}
                </For>
                <td></td>
              </tr>
            </tfoot>
          </Show>
        </table>

        {/* Sentinel para IntersectionObserver (para cargar más) */}
        <div ref={(el) => (sentinelEl = el)} style={{ width: "100%", height: "1px" }} aria-hidden="true" />
      </div>

      <Show when={showPagination()}>
        <Pagination
          tableIdentifier={props.tableIdentifier}
          filters={combinedFilters}
          page={page}
          setPage={setPage}
          limit={limit}
          setLimit={setLimit}
        />
      </Show>
    </div>
  );
}
