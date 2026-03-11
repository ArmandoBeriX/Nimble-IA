/**
 * TableList.tsx
 *
 * Lista tabular reactiva. Conecta SearchBar, FilterSelector, ColumnSelector,
 * Pagination y RecordButtonAction con useRecordQuery / useRecordCount.
 *
 * Principios SolidJS aplicados:
 * - Ningún createEffect → setSignal para valores derivados (usar createMemo)
 * - Los resets de página usan on(..., { defer: true }) para no correr en mount
 * - `rows` (createStore array) se pasa directo a <For> sin cast intermedio
 * - Los accessors de opciones son funciones inline (() => ...) para que el
 *   createEffect interno de useRecordQuery las tracked correctamente
 * - Las columnas solo se resetean cuando cambia tableIdentifier, no en cada
 *   actualización de schema
 */

import {
  createSignal,
  createMemo,
  createEffect,
  on,
  onCleanup,
  For,
  Show,
} from "solid-js";
import { store } from "../app";
import { useRecordQuery, useRecordCount, useRecordTotal, IncludeRelProps } from "../hooks/useRecords";
import { FilterInput, TableField } from "../types/schema";
import { SearchBar } from "../components/utils/SearchBar";
import FilterSelectorButton from "../components/utils/FilterSelector";
import { ColumnSelectorButton } from "../components/utils/ColumnSelector";
import Pagination from "../components/utils/Pagination";
import RecordButtonAction from "../components/record/RecordButtonAction";
import SkeletonLoader from "../components/skeleton-loader/SkeletonLoader";
import FieldShow from "../components/fields/FieldShow";

/* ─────────────────────────────────────────────
   Tipos públicos
───────────────────────────────────────────── */

type FooterOp = "count" | "sum" | "average";

export type TableProps = {
  tableIdentifier: string;

  // Filtros base fijos (ej: para sub-tablas)
  filters?: FilterInput;
  order?: Array<[string, "ASC" | "DESC"]>;
  includes?: IncludeRelProps;

  // Paginación
  limit?: number;

  // Columnas
  frozenColumns?: string[];
  defaultColumns?: string[];

  // Footer
  footer?: Record<string, FooterOp>;

  // Acciones por fila
  actions?: Array<"show" | "edit" | "delete">;

  // Feature flags
  withSearch?: boolean;
  withFilters?: boolean;
  editableColumns?: boolean;
  withCreate?: boolean;
  showPagination?: boolean;
  autoLoadOnScroll?: boolean;

  // Scroll infinito
  containerRef?: HTMLElement | Window | (() => HTMLElement | null) | null;
  requireFocusToAutoLoad?: boolean;

  // Skeleton rows mientras carga por primera vez
  skeletonRows?: number;
};

/* ─────────────────────────────────────────────
   Componente
───────────────────────────────────────────── */

export default function TableList(props: TableProps) {
  // ── 1. Schema ────────────────────────────────────────────────────────────
  // getTableFieldsFor lee señales reactivas internas del SchemaCache,
  // por lo que este memo se recalcula cuando el schema cambia.
  const tableFields = createMemo<TableField[]>(() =>
    [...(store.getTableFieldsFor(props.tableIdentifier) ?? []), store.selfColumn(props.tableIdentifier)]
  );

  const fieldById = createMemo(() =>
    new Map(tableFields().map(f => [f.identifier, f]))
  );

  const availableIdSet = createMemo(() =>
    new Set(tableFields().map(f => f.identifier))
  );

  // ── 2. Columnas visibles ──────────────────────────────────────────────────
  // defaultColumns derivado del schema; sirve como fuente inicial
  const defaultCols = createMemo<string[]>(() => {
    if (props.defaultColumns?.length) {
      return props.defaultColumns.filter(c => availableIdSet().has(c));
    }
    return tableFields().map(f => f.identifier);
  });

  // Signal de columnas: se resetea SOLO cuando cambia el identificador de tabla.
  // Así el usuario puede reordenar/ocultar columnas sin que un update de schema
  // deshaga su selección.
  const [visibleColumns, setVisibleColumns] = createSignal<string[]>([]);

  createEffect(
    on(
      () => props.tableIdentifier,
      () => setVisibleColumns(defaultCols()),
    )
  );

  // Columnas ordenadas y filtradas (frozen primero)
  const columnFields = createMemo<TableField[]>(() => {
    const byId = fieldById();
    const available = availableIdSet();
    const frozen = (props.frozenColumns ?? []).filter(id => available.has(id));
    const visible = visibleColumns().filter(
      id => available.has(id) && !frozen.includes(id)
    );
    return [...frozen, ...visible]
      .map(id => byId.get(id))
      .filter((f): f is TableField => !!f);
  });

  // ── 3. Filtros ────────────────────────────────────────────────────────────
  const [userFilters, setUserFilters] = createSignal<FilterInput>({});
  const [searchFilters, setSearchFilters] = createSignal<FilterInput>({});

  // Fusiona filtros base (prop) + usuario + búsqueda
  const combinedFilters = createMemo<FilterInput>(() => ({
    ...props.filters,
    ...userFilters(),
    ...searchFilters(),
  }));

  // ── 4. Paginación ─────────────────────────────────────────────────────────
  const [page, setPage] = createSignal(1);
  const [limit, setLimit] = createSignal(props.limit ?? 20);

  // Resetear a página 1 cuando cambian filtros (defer: no corre en mount)
  createEffect(on(combinedFilters, () => setPage(1), { defer: true }));

  // ── 5. Datos ──────────────────────────────────────────────────────────────
  // Las opciones se pasan como accessor inline para que el createEffect interno
  // de useRecordQuery las tracked directamente.
  const { data: rows, loading } = useRecordQuery(
    props.tableIdentifier,
    combinedFilters,
    () => ({
      order: props.order ?? [],
      page: page(),
      limit: limit(),
    }),
    props.includes,
  );

  const { count: totalCount } = useRecordCount(props.tableIdentifier, combinedFilters);

  // ── 6. Skeleton con debounce visual ───────────────────────────────────────
  // Solo muestra skeleton si el loading lleva >150ms para evitar parpadeos
  const [showSkeleton, setShowSkeleton] = createSignal(false);
  let skeletonTimer: ReturnType<typeof setTimeout> | undefined;

  createEffect(() => {
    const isLoading = !!loading();
    if (isLoading) {
      if (!skeletonTimer) {
        skeletonTimer = setTimeout(() => {
          skeletonTimer = undefined;
          setShowSkeleton(true);
        }, 150);
      }
    } else {
      clearTimeout(skeletonTimer);
      skeletonTimer = undefined;
      setShowSkeleton(false);
    }
  });

  onCleanup(() => clearTimeout(skeletonTimer));

  // ── 7. Footer totals ──────────────────────────────────────────────────────
  // Los hooks se instancian una sola vez en el nivel del componente.
  const footerCols = Object.keys(props.footer ?? {});

  const footerHooks = Object.fromEntries(
    footerCols
      .filter(col => {
        const op = props.footer![col];
        return op === "sum" || op === "average";
      })
      .map(col => [col, useRecordTotal(props.tableIdentifier, col, combinedFilters)])
  );

  const footerValues = createMemo(() => {
    const total = Number(totalCount() ?? 0);
    return Object.fromEntries(
      footerCols.map(col => {
        const op = props.footer![col];
        if (op === "count") return [col, total];
        if (op === "sum") return [col, Number(footerHooks[col]?.total() ?? 0)];
        if (op === "average") return [col, total > 0 ? Number(footerHooks[col]?.total() ?? 0) / total : 0];
        return [col, "—"];
      })
    );
  });

  // ── 8. Selección de filas ─────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = createSignal<Set<string | number>>(new Set());

  // Selección total de la página actual — se calcula sobre el array del store
  const allPageSelected = createMemo(() => {
    if (!rows.length) return false;
    return rows.every(r => selectedIds().has(r.id as string | number));
  });

  const toggleRow = (id: string | number) =>
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allPageSelected()) {
        rows.forEach(r => next.delete(r.id as string | number));
      } else {
        rows.forEach(r => next.add(r.id as string | number));
      }
      return next;
    });

  // ── 9. Acciones ───────────────────────────────────────────────────────────
  const actions = createMemo(() => props.actions ?? ["show", "edit", "delete"]);

  // ── 10. Infinite scroll ───────────────────────────────────────────────────
  let scrollContainer: HTMLElement | null = null;
  let sentinel: HTMLElement | null = null;
  let observer: IntersectionObserver | null = null;

  const isLastPage = createMemo(() => {
    const total = Number(totalCount() ?? 0);
    return page() >= Math.ceil(total / Math.max(1, limit()));
  });

  const resolveScrollRoot = (): HTMLElement | null => {
    const ref = props.containerRef;
    if (!ref) return scrollContainer;
    if (typeof ref === "function") return ref() ?? scrollContainer;
    if (ref instanceof HTMLElement) return ref;
    return scrollContainer;
  };

  createEffect(() => {
    if (!(props.autoLoadOnScroll ?? true) || typeof IntersectionObserver === "undefined") {
      observer?.disconnect();
      observer = null;
      return;
    }

    observer?.disconnect();
    const root = resolveScrollRoot();

    observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          if (props.requireFocusToAutoLoad ?? true) {
            const hasFocus = root
              ? root.contains(document.activeElement)
              : document.hasFocus();
            if (!hasFocus) continue;
          }
          if (!loading() && !isLastPage()) setPage(p => p + 1);
        }
      },
      { root, rootMargin: "120px", threshold: 0.01 }
    );

    if (sentinel) observer.observe(sentinel);
    onCleanup(() => { observer?.disconnect(); observer = null; });
  });

  onCleanup(() => { observer?.disconnect(); observer = null; });

  // ── 11. Skeleton rows ─────────────────────────────────────────────────────
  const skeletonCount = createMemo(() => props.skeletonRows ?? limit());

  /* ──────────────────────────────────────────────
     Render
  ─────────────────────────────────────────────── */
  return (
    <div class="flex flex-col h-full min-h-0">

      {/* ── Toolbar ── */}
      <div class="flex flex-wrap items-center gap-2 my-2 px-1">
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
            filters={userFilters}
            setFilters={setUserFilters}
          />
        </Show>

        <Show when={props.editableColumns ?? true}>
          <ColumnSelectorButton
            availableFields={tableFields()}
            visibleColumns={visibleColumns}
            setVisibleColumns={setVisibleColumns}
            frozenColumns={props.frozenColumns}
            defaultColumns={defaultCols()}
          />
        </Show>

        {/* Spacer */}
        <div class="flex-1" />

        {/* Indicador de carga inline — no bloquea la tabla */}
        <Show when={loading()}>
          <span class="text-xs text-gray-400 animate-pulse select-none">
            {loading()}
          </span>
        </Show>

        {/* Contador total */}
        <span class="text-sm text-gray-500">
          <span class="font-semibold text-gray-800">
            {totalCount()?.toString() ?? "—"}
          </span>{" "}
          registros
        </span>

        <Show when={props.withCreate ?? true}>
          <RecordButtonAction action="create" tableIdentifier={props.tableIdentifier} />
        </Show>
      </div>

      {/* ── Tabla ── */}
      <div
        ref={el => (scrollContainer = el)}
        class="flex-1 min-h-0 overflow-auto rounded-lg border border-gray-200 bg-white"
        role="region"
        aria-label={`Tabla ${props.tableIdentifier}`}
        tabindex={0}
      >
        <table class="w-full text-sm text-left border-collapse">

          {/* Encabezado */}
          <thead class="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
            <tr class="text-xs uppercase text-gray-500">
              <th class="w-10 px-3 py-3 sticky left-0 bg-gray-50">
                <input
                  type="checkbox"
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={allPageSelected()}
                  onChange={toggleAll}
                  aria-label="Seleccionar todos"
                />
              </th>

              <For each={columnFields()}>
                {field => (
                  <th class="px-4 py-3 font-medium whitespace-nowrap">
                    {field.name}
                  </th>
                )}
              </For>

              <th class="px-4 py-3 font-medium text-right">
                Acciones
              </th>
            </tr>
          </thead>

          {/* Cuerpo */}
          <tbody class="divide-y divide-gray-100">

            {/* Skeleton — solo mientras carga y no hay datos previos */}
            <Show when={showSkeleton() && rows.length === 0}>
              <SkeletonLoader
                display="row"
                count={skeletonCount()}
                items={[
                  { class: "sticky left-0 w-10" },
                  { repeat: columnFields().length + 1 },
                ]}
              />
            </Show>

            {/* Empty state */}
            <Show when={!loading() && rows.length === 0}>
              <tr>
                <td
                  colSpan={columnFields().length + 2}
                  class="px-4 py-16 text-center"
                >
                  <div class="inline-flex flex-col items-center gap-3 max-w-xs">
                    <div class="text-4xl text-gray-300">📭</div>
                    <p class="text-sm text-gray-500">
                      No se encontraron registros.
                    </p>
                    <Show when={props.withCreate ?? true}>
                      <RecordButtonAction
                        action="create"
                        tableIdentifier={props.tableIdentifier}
                      >
                        Crear nuevo
                      </RecordButtonAction>
                    </Show>
                  </div>
                </td>
              </tr>
            </Show>

            {/* Filas — `rows` es un createStore array, For lo trackea fino */}
            <For each={rows}>
              {row => {
                const id = row.id as string | number;
                return (
                  <tr class="hover:bg-blue-50 transition-colors duration-100 group">

                    {/* Checkbox */}
                    <td class="w-10 px-3 py-2 sticky left-0 bg-white group-hover:bg-blue-50 transition-colors">
                      <input
                        type="checkbox"
                        class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={selectedIds().has(id)}
                        onChange={() => toggleRow(id)}
                        aria-label="Seleccionar fila"
                      />
                    </td>

                    {/* Celdas — cada FieldShow lee row.field reactivamente */}
                    <For each={columnFields()}>
                      {field => (
                        <td class="px-4 py-2 whitespace-nowrap max-w-[240px] truncate">
                          <FieldShow field={field} record={row} onlyValue />
                        </td>
                      )}
                    </For>

                    {/* Acciones por fila */}
                    <td class="px-4 py-2 text-right whitespace-nowrap">
                      <div class="inline-flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                        <Show when={actions().includes("show")}>
                          <RecordButtonAction
                            action="show" buttonProps={{size: "sm"}}
                            tableIdentifier={props.tableIdentifier}
                            id={String(id)}
                          />
                        </Show>
                        <Show when={actions().includes("edit")}>
                          <RecordButtonAction
                            action="update" buttonProps={{size: "sm"}}
                            tableIdentifier={props.tableIdentifier}
                            id={String(id)}
                          />
                        </Show>
                        <Show when={actions().includes("delete")}>
                          <RecordButtonAction
                            action="delete" buttonProps={{size: "sm"}}
                            tableIdentifier={props.tableIdentifier}
                            id={String(id)}
                          />
                        </Show>
                      </div>
                    </td>
                  </tr>
                );
              }}
            </For>
          </tbody>

          {/* Footer de totales */}
          <Show when={footerCols.length > 0}>
            <tfoot class="sticky bottom-0 bg-gray-50 border-t border-gray-200 text-sm font-medium text-gray-700">
              <tr>
                <td class="sticky left-0 bg-gray-50 px-3 py-2" />
                <For each={columnFields()}>
                  {field => (
                    <td class="px-4 py-2 tabular-nums">
                      {props.footer?.[field.identifier]
                        ? (footerValues()[field.identifier] ?? "—")
                        : null}
                    </td>
                  )}
                </For>
                <td class="px-4 py-2" />
              </tr>
            </tfoot>
          </Show>
        </table>

        {/* Sentinel para infinite scroll */}
        <div
          ref={el => (sentinel = el)}
          class="h-px w-full"
          aria-hidden="true"
        />
      </div>

      {/* Paginación */}
      <Show when={props.showPagination ?? true}>
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