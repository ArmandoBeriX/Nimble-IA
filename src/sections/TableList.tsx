/**
 * TableList.tsx
 *
 * SISTEMA DE COLORES (CSS Variables + Tailwind)
 * ─────────────────────────────────────────────
 * Para dark/light sin tocar cada componente, añade esto a tu CSS global:
 *
 *   :root {
 *     --color-bg:          theme('colors.white');
 *     --color-bg-raised:   theme('colors.gray.50');
 *     --color-bg-hover:    theme('colors.blue.50');
 *     --color-border:      theme('colors.gray.200');
 *     --color-text:        theme('colors.gray.900');
 *     --color-text-muted:  theme('colors.gray.500');
 *     --color-primary:     theme('colors.blue.600');
 *     --color-primary-fg:  theme('colors.white');
 *   }
 *   [data-theme="dark"] {
 *     --color-bg:          theme('colors.gray.900');
 *     --color-bg-raised:   theme('colors.gray.800');
 *     --color-bg-hover:    theme('colors.blue.950');
 *     --color-border:      theme('colors.gray.700');
 *     --color-text:        theme('colors.gray.100');
 *     --color-text-muted:  theme('colors.gray.400');
 *     --color-primary:     theme('colors.blue.500');
 *     --color-primary-fg:  theme('colors.white');
 *   }
 *
 * Y en tailwind.config.js:
 *   theme: { extend: { colors: {
 *     bg:          'var(--color-bg)',
 *     'bg-raised': 'var(--color-bg-raised)',
 *     'bg-hover':  'var(--color-bg-hover)',
 *     border:      'var(--color-border)',
 *     primary:     'var(--color-primary)',
 *   }}}
 *
 * Mientras tanto el componente usa clases Tailwind estándar (blue/gray).
 * Cuando configures las variables, solo cambia las clases de color aquí
 * (e.g. `bg-white` → `bg-bg`, `gray-200` → `border-border`).
 */

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
import FilterSelectorButton from "../components/utils/FilterSelector";
import SkeletonLoader from "../components/skeleton-loader/SkeletonLoader";
import FieldShow from "../components/fields/FieldShow";

/* ─────────────────────────────────────────────
   Tipos
───────────────────────────────────────────── */
type FooterOp = "count" | "sum" | "average";

export type ContainerRef =
  | HTMLElement
  | Window
  | (() => HTMLElement | null)
  | Accessor<HTMLElement | null>
  | null
  | undefined;

export type TableProps = {
  tableIdentifier: string;
  filters?: FilterInput;
  order?: Array<[string, "ASC" | "DESC"]>;
  includes?: IncludeRelProps;
  page?: number;
  limit?: number;
  frozenColumns?: string[];
  defaultColumns?: string[];
  footer?: Record<string, FooterOp>;
  actions?: Array<"show" | "edit" | "delete">;
  withSearch?: boolean;
  withFilters?: boolean;
  editableColumns?: boolean;
  withCreate?: boolean;
  autoLoadOnScroll?: boolean;
  showPagination?: boolean;
  containerRef?: ContainerRef;
  requireFocusToAutoLoad?: boolean;
  skeletonLoad?: number;
};

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function resolveContainerRef(ref: ContainerRef): HTMLElement | Window | null {
  if (!ref) return null;
  try {
    if (typeof ref === "function") return (ref as () => HTMLElement | null)() ?? null;
    if (ref instanceof HTMLElement) return ref;
    if (ref === window) return window;
  } catch { }
  return null;
}

/* ─────────────────────────────────────────────
   Componente
───────────────────────────────────────────── */
export default function TableList(props: TableProps) {
  if (!props.tableIdentifier) throw new Error("tableIdentifier is required");

  /* ── Schema ──────────────────────────────── */
  const tableFields = createMemo<TableField[]>(
    () => store.getTableFieldsFor(props.tableIdentifier) ?? []
  );
  const availableIds = createMemo(() => new Set(tableFields().map(f => f.identifier)));

  /* ── Paginación ──────────────────────────── */
  const [page, setPage] = createSignal(props.page ?? 1);
  const [limit, setLimit] = createSignal(props.limit ?? 20);

  /* ── Columnas visibles ───────────────────── */
  const defaultColumns = createMemo<string[]>(() =>
    props.defaultColumns?.length
      ? props.defaultColumns.filter(c => availableIds().has(c))
      : tableFields().map(f => f.identifier)
  );

  const computeVisibleColumns = () => {
    const frozen = (props.frozenColumns ?? []).filter(f => availableIds().has(f));
    const rest = defaultColumns().filter(c => !frozen.includes(c));
    return [...frozen, ...rest];
  };

  const [visibleColumns, setVisibleColumns] = createSignal<string[]>(computeVisibleColumns());
  createEffect(() => setVisibleColumns(computeVisibleColumns()));

  const columnFields = createMemo(() => {
    const byId = new Map(tableFields().map(f => [f.identifier, f]));
    return visibleColumns().map(id => byId.get(id)).filter(Boolean) as TableField[];
  });

  /* ── Filtros y búsqueda ──────────────────── */
  const [userFilters, setUserFilters] = createSignal<FilterInput>(props.filters ?? {});
  const [searchFilters, setSearchFilters] = createSignal<FilterInput>({});

  // Filtros combinados (usuario + búsqueda + prop filters externos)
  const combinedFilters = createMemo<FilterInput>(() => ({
    ...(props.filters ?? {}),
    ...userFilters(),
    ...searchFilters(),
  }));

  // Reset página cuando cambian los filtros o la tabla
  createEffect(() => {
    combinedFilters();
    props.tableIdentifier;
    setPage(1);
  });

  /* ── Opciones de query ───────────────────── */
  const queryOptions = createMemo(() => ({
    order: props.order ?? [],
    page: page(),
    limit: limit(),
  }));

  /* ── Data hooks ──────────────────────────── */
  const { data: rows, loading, refresh } = useRecordQuery(
    props.tableIdentifier,
    combinedFilters,
    queryOptions,
    props.includes,
  );

  const { count: totalCount } = useRecordCount(props.tableIdentifier, combinedFilters);

  /* ── Loading con debounce visual ─────────── */
  // Evita que el skeleton parpadee en updates rápidos (ej: cada keystroke).
  // El skeleton solo aparece si loading lleva más de 200ms activo.
  const [showSkeleton, setShowSkeleton] = createSignal(false);
  let skeletonTimer: ReturnType<typeof setTimeout> | null = null;

  createEffect(() => {
    const isLoading = !!loading();
    if (isLoading) {
      if (skeletonTimer === null) {
        skeletonTimer = setTimeout(() => {
          skeletonTimer = null;
          setShowSkeleton(true);
        }, 200);
      }
    } else {
      if (skeletonTimer !== null) {
        clearTimeout(skeletonTimer);
        skeletonTimer = null;
      }
      setShowSkeleton(false);
    }
  });

  onCleanup(() => {
    if (skeletonTimer !== null) clearTimeout(skeletonTimer);
  });

  /* ── Footer totals ───────────────────────── */
  const footerCols = Object.keys(props.footer ?? {});
  const footerTotalsMap: Record<string, ReturnType<typeof useRecordTotal> | null> = {};
  for (const col of footerCols) {
    const op = props.footer![col];
    footerTotalsMap[col] = op === "sum" || op === "average"
      ? useRecordTotal(props.tableIdentifier, col, combinedFilters)
      : null;
  }

  const footerValues = createMemo(() => {
    const res: Record<string, number | string> = {};
    const total = Number(totalCount() ?? 0);
    for (const col of footerCols) {
      const op = props.footer![col];
      const hook = footerTotalsMap[col];
      if (op === "count") res[col] = total;
      else if (op === "sum") res[col] = hook ? Number(hook.total() ?? 0) : "-";
      else if (op === "average") res[col] = total > 0 ? Number(hook?.total() ?? 0) / total : 0;
    }
    return res;
  });

  /* ── Selección de filas ──────────────────── */
  const [selectedIds, setSelectedIds] = createSignal<Set<string>>(new Set());

  const rowIds = createMemo(() =>
    (rows as any[]).map(r => String(r.id))
  );

  const allPageSelected = createMemo(() => {
    const ids = rowIds();
    return ids.length > 0 && ids.every(id => selectedIds().has(id));
  });

  const toggleRow = (id: string) =>
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelectedIds(prev => {
      const ids = rowIds();
      const next = new Set(prev);
      if (allPageSelected()) ids.forEach(id => next.delete(id));
      else ids.forEach(id => next.add(id));
      return next;
    });

  /* ── Acciones ────────────────────────────── */
  const actions = createMemo(() =>
    props.actions ?? ["show", "edit", "delete"]
  );

  /* ── Infinite scroll ─────────────────────── */
  let localContainerRef: HTMLElement | null = null;
  let sentinelRef: HTMLElement | null = null;
  let observer: IntersectionObserver | null = null;

  const isLastPage = createMemo(() => {
    const total = Number(totalCount() ?? 0);
    const lim = Math.max(1, limit());
    return page() >= Math.max(1, Math.ceil(total / lim));
  });

  createEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    if (!(props.autoLoadOnScroll ?? true)) {
      observer?.disconnect();
      observer = null;
      return;
    }

    observer?.disconnect();

    const resolved = resolveContainerRef(props.containerRef) ?? localContainerRef;
    const root = resolved instanceof HTMLElement ? resolved : null;

    observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          if (props.requireFocusToAutoLoad ?? true) {
            const focused = root
              ? root.contains(document.activeElement)
              : document.hasFocus();
            if (!focused) continue;
          }
          if (!loading() && !isLastPage()) setPage(p => p + 1);
        }
      },
      { root, rootMargin: "120px", threshold: 0.01 }
    );

    if (sentinelRef) observer.observe(sentinelRef);

    onCleanup(() => { observer?.disconnect(); observer = null; });
  });

  onCleanup(() => { observer?.disconnect(); observer = null; });

  /* ── Skeleton count ──────────────────────── */
  const skeletonCount = createMemo(() =>
    typeof props.skeletonLoad === "number" ? props.skeletonLoad : limit()
  );

  /* ─────────────────────────────────────────────
     Render
  ───────────────────────────────────────────── */
  return (
    <div class="flex flex-col gap-2 h-full">

      {/* Toolbar */}
      <div class="flex flex-wrap items-center gap-2 px-1">
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
            defaultColumns={defaultColumns()}
          />
        </Show>

        <div class="flex-1" />

        {/* Loading indicator inline — no bloquea la tabla */}
        <Show when={loading()}>
          <span class="text-xs text-gray-500 animate-pulse">{loading()}</span>
        </Show>

        <span class="text-sm text-gray-500">
          <span class="font-semibold text-gray-800">{totalCount()?.toString() ?? "—"}</span> registros
        </span>

        <Show when={props.withCreate ?? true}>
          <RecordButtonAction action="create" tableIdentifier={props.tableIdentifier} />
        </Show>
      </div>

      {/* Tabla */}
      <div
        class="flex-1 overflow-auto rounded-lg border border-gray-200 bg-white"
        ref={el => (localContainerRef = el)}
        role="region"
        aria-label={`Tabla ${props.tableIdentifier}`}
        tabindex={0}
      >
        <table class="w-full text-sm text-left border-collapse">
          {/* Encabezado */}
          <thead class="sticky top-0 z-10 bg-gray-50 text-xs uppercase text-gray-500 border-b border-gray-200">
            <tr>
              <th class="w-10 px-3 py-3 sticky left-0 bg-gray-50">
                <input
                  type="checkbox"
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={allPageSelected()}
                  onChange={toggleAll}
                />
              </th>

              <For each={columnFields()}>
                {field => (
                  <th class="px-4 py-3 font-medium whitespace-nowrap">
                    {field.name}
                  </th>
                )}
              </For>

              <th class="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>

          {/* Cuerpo */}
          <tbody class="divide-y divide-gray-100">
            {/* Skeleton */}
            <Show when={showSkeleton() && (rows as any[]).length === 0}>
              <SkeletonLoader
                display="row"
                count={skeletonCount()}
                items={[
                  { class: "sticky left-0 w-10" },
                  { repeat: visibleColumns().length + 1 },
                ]}
              />
            </Show>

            {/* Empty state */}
            <Show when={!loading() && (rows as any[]).length === 0}>
              <tr>
                <td
                  colSpan={visibleColumns().length + 2}
                  class="px-4 py-16 text-center"
                >
                  <div class="inline-flex flex-col items-center gap-3 max-w-xs">
                    <div class="text-4xl text-gray-300">📭</div>
                    <p class="text-gray-500 text-sm">
                      No se encontraron registros que coincidan con los filtros.
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

            {/* Filas */}
            <For each={rows as any[]}>
              {row => {
                const id = String(row.id);
                return (
                  <tr class="hover:bg-blue-50 transition-colors duration-100 group">
                    {/* Checkbox */}
                    <td class="w-10 px-3 py-2 sticky left-0 bg-white group-hover:bg-blue-50 transition-colors">
                      <input
                        type="checkbox"
                        class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={selectedIds().has(id)}
                        onChange={() => toggleRow(id)}
                      />
                    </td>

                    {/* Celdas de datos */}
                    <For each={columnFields()}>
                      {field => (
                        <td class="px-4 py-2 whitespace-nowrap max-w-[240px] truncate">
                          <FieldShow field={field} record={row} onlyValue />
                        </td>
                      )}
                    </For>

                    {/* Acciones */}
                    <td class="px-4 py-2 text-right whitespace-nowrap">
                      <div class="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Show when={actions().includes("show")}>
                          <RecordButtonAction
                            action="show"
                            tableIdentifier={props.tableIdentifier}
                            id={id}
                          />
                        </Show>
                        <Show when={actions().includes("edit")}>
                          <RecordButtonAction
                            action="update"
                            tableIdentifier={props.tableIdentifier}
                            id={id}
                          />
                        </Show>
                        <Show when={actions().includes("delete")}>
                          <RecordButtonAction
                            action="delete"
                            tableIdentifier={props.tableIdentifier}
                            id={id}
                          />
                        </Show>
                      </div>
                    </td>
                  </tr>
                );
              }}
            </For>
          </tbody>

          {/* Footer */}
          <Show when={footerCols.length > 0}>
            <tfoot class="sticky bottom-0 bg-gray-50 border-t border-gray-200 text-sm font-medium text-gray-700">
              <tr>
                <td class="sticky left-0 bg-gray-50 px-3 py-2" />
                <For each={columnFields()}>
                  {field => (
                    <td class="px-4 py-2">
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
          ref={el => (sentinelRef = el)}
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
