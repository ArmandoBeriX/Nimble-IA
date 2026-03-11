import {
  createSignal, For, Accessor, Setter,
  onMount, createEffect, JSX, Show,
} from "solid-js";
import { TableField } from "../../types/schema";
import Button from "../ui/Button";
import WithTooltip from "../ui/tooltip/WithTooltip";
import { createStore } from "solid-js/store";
import { modalStore } from "../../lib/modal-store";

/* ─────────────────────────── Types ─────────────────────────── */

interface DragItem {
  id: string;
  source: "available" | "selected";
  index?: number;
}

/* ───────────────────── ColumnSelectorModal ───────────────────── */

function ColumnSelectorModal(props: {
  availableFields: TableField[];
  visibleColumns: Accessor<string[]>;
  setVisibleColumns: Setter<string[]>;
  frozenColumns?: string[];
  defaultColumns?: string[];
  onClose?: () => void;
}) {
  const [search, setSearch] = createSignal("");
  const [dragging, setDragging] = createSignal<DragItem | null>(null);
  const [dropIndex, setDropIndex] = createSignal<number | null>(null);
  const [availableItems, setAvailableItems] = createStore<TableField[]>([]);
  const [selectedItems, setSelectedItems] = createStore<TableField[]>([]);

  onMount(updateLists);
  createEffect(updateLists);

  function updateLists() {
    const selectedIds = new Set(props.visibleColumns());
    const selected: (TableField | undefined)[] = [];
    const available: TableField[] = [];

    props.availableFields.forEach(field => {
      if (selectedIds.has(field.identifier)) {
        selected[props.visibleColumns().indexOf(field.identifier)] = field;
      } else {
        available.push(field);
      }
    });

    setSelectedItems(selected.filter((f): f is TableField => f !== undefined));
    setAvailableItems(
      available.filter(f =>
        f.name.toLowerCase().includes(search().toLowerCase()) ||
        f.identifier.toLowerCase().includes(search().toLowerCase())
      )
    );
  }

  const isFrozen = (id: string) => props.frozenColumns?.includes(id) ?? false;

  /* ── Drag & Drop ── */

  const handleDragStart = (e: DragEvent, item: TableField, source: "available" | "selected") => {
    if (!e.dataTransfer) return;
    const dragItem: DragItem = {
      id: item.identifier,
      source,
      index: source === "selected"
        ? selectedItems.findIndex(f => f.identifier === item.identifier)
        : availableItems.findIndex(f => f.identifier === item.identifier),
    };
    setDragging(dragItem);
    e.dataTransfer.setData("text/plain", JSON.stringify(dragItem));
    e.dataTransfer.effectAllowed = "move";
    (e.currentTarget as HTMLElement).classList.add("opacity-50");
  };

  const handleDragEnd = (e: DragEvent) => {
    (e.currentTarget as HTMLElement).classList.remove("opacity-50");
    setDragging(null);
    setDropIndex(null);
  };

  const handleDrop = (e: DragEvent, targetList: "available" | "selected") => {
    e.preventDefault();
    if (!dragging()) return;
    const drag = dragging()!;

    if (drag.source !== targetList) {
      if (targetList === "selected") addToSelected(drag.id);
      else if (!isFrozen(drag.id)) removeFromSelected(drag.id);
    } else if (targetList === "selected") {
      const children = Array.from((e.currentTarget as HTMLElement).children);
      let targetIdx = children.length;
      for (let i = 0; i < children.length; i++) {
        const rect = children[i].getBoundingClientRect();
        if (e.clientY <= rect.top + rect.height / 2) { targetIdx = i; break; }
      }
      if (drag.index !== undefined && drag.index !== targetIdx) {
        moveSelectedItem(drag.index, targetIdx);
      }
    }

    setDropIndex(null);
  };

  /* ── CRUD ── */

  const addToSelected = (fieldId: string) => {
    if (props.visibleColumns().includes(fieldId)) return;
    props.setVisibleColumns(prev => [...prev, fieldId]);
  };

  const removeFromSelected = (fieldId: string) => {
    if (isFrozen(fieldId)) return;
    props.setVisibleColumns(prev => prev.filter(id => id !== fieldId));
  };

  const moveSelectedItem = (from: number, to: number) => {
    const frozenCount = props.frozenColumns?.length ?? 0;
    if (from < frozenCount || to < frozenCount) return;
    const cols = [...props.visibleColumns()];
    const [moved] = cols.splice(from, 1);
    cols.splice(to, 0, moved);
    props.setVisibleColumns(cols);
  };

  const frozenCount = () => props.frozenColumns?.length ?? 0;

  const moveUp = (i: number) => i > frozenCount() && moveSelectedItem(i, i - 1);
  const moveDown = (i: number) => i < props.visibleColumns().length - 1 && moveSelectedItem(i, i + 1);
  const moveToTop = (i: number) => i > frozenCount() && moveSelectedItem(i, frozenCount());
  const moveToBottom = (i: number) => i < props.visibleColumns().length - 1 && moveSelectedItem(i, props.visibleColumns().length - 1);

  /* ── Shared classes ── */

  const columnItemBase = "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors";

  return (
    <div class="grid grid-cols-2 divide-x divide-gray-100 h-[500px]">

      {/* ── Available ── */}
      <div class="flex flex-col overflow-hidden p-3 gap-2">
        <div class="flex flex-col gap-1.5">
          <h4 class="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Columnas disponibles
          </h4>
          <input
            type="text"
            placeholder="Buscar…"
            value={search()}
            onInput={e => setSearch(e.currentTarget.value)}
            class={[
              "w-full rounded-md border border-gray-200 px-2.5 py-1.5 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
            ].join(" ")}
          />
        </div>

        <div
          class="flex-1 overflow-y-auto space-y-0.5"
          onDragOver={e => e.preventDefault()}
          onDrop={e => handleDrop(e, "available")}
        >
          <For each={availableItems} fallback={
            <p class="py-6 text-center text-xs text-gray-400">Sin columnas disponibles</p>
          }>
            {(field, index) => (
              <div
                class={`${columnItemBase} cursor-grab bg-white hover:bg-gray-50 group border border-transparent hover:border-gray-200`}
                draggable={true}
                onDragStart={e => handleDragStart(e as DragEvent, field, "available")}
                onDragEnd={handleDragEnd}
                onDragOver={e => { e.preventDefault(); setDropIndex(index()); }}
              >
                <span class="text-gray-300 select-none text-xs">⋮⋮</span>
                <span class="flex-1 truncate text-gray-700">{field.name || field.identifier}</span>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => addToSelected(field.identifier)}
                  class="opacity-0 group-hover:opacity-100 text-blue-600 hover:text-blue-700"
                  ariaLabel="Agregar columna"
                >
                  +
                </Button>
              </div>
            )}
          </For>
        </div>
      </div>

      {/* ── Selected ── */}
      <div class="flex flex-col overflow-hidden p-3 gap-2">
        <div class="flex items-baseline justify-between">
          <h4 class="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Columnas seleccionadas
          </h4>
          <span class="text-xs text-gray-400">{selectedItems.length} col.</span>
        </div>
        <p class="text-xs text-gray-400 -mt-1">Arrastra para reordenar</p>

        <div
          class="flex-1 overflow-y-auto space-y-0.5"
          onDragOver={e => e.preventDefault()}
          onDrop={e => handleDrop(e, "selected")}
        >
          <For each={selectedItems} fallback={
            <p class="py-6 text-center text-xs text-gray-400">Ninguna columna seleccionada</p>
          }>
            {(field, index) => {
              const frozen = isFrozen(field.identifier);
              const isFirst = () => index() <= frozenCount();
              const isLast = () => index() >= selectedItems.length - 1;

              return (
                <div
                  class={[
                    columnItemBase,
                    frozen
                      ? "bg-gray-50 text-gray-400 cursor-default"
                      : "bg-white hover:bg-gray-50 cursor-grab group border border-transparent hover:border-gray-200",
                    dropIndex() === index() ? "border-blue-400 bg-blue-50" : "",
                  ].join(" ")}
                  draggable={!frozen}
                  onDragStart={e => !frozen && handleDragStart(e as DragEvent, field, "selected")}
                  onDragEnd={handleDragEnd}
                  onDragOver={e => { e.preventDefault(); setDropIndex(index()); }}
                >
                  <span class="text-gray-300 select-none text-xs">⋮⋮</span>

                  <span class="flex-1 truncate text-sm text-gray-700">
                    {field.name || field.identifier}
                  </span>

                  {frozen && (
                    <span class="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] text-gray-500 font-medium">
                      Fijo
                    </span>
                  )}

                  {!frozen && (
                    <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <WithTooltip tooltip="Subir">
                        <Button size="xs" variant="ghost" disabled={isFirst()} onClick={() => moveUp(index())}>↑</Button>
                      </WithTooltip>
                      <WithTooltip tooltip="Bajar">
                        <Button size="xs" variant="ghost" disabled={isLast()} onClick={() => moveDown(index())}>↓</Button>
                      </WithTooltip>
                      <WithTooltip tooltip="Al inicio">
                        <Button size="xs" variant="ghost" disabled={isFirst()} onClick={() => moveToTop(index())}>⇈</Button>
                      </WithTooltip>
                      <WithTooltip tooltip="Al final">
                        <Button size="xs" variant="ghost" disabled={isLast()} onClick={() => moveToBottom(index())}>⇊</Button>
                      </WithTooltip>
                      <WithTooltip tooltip="Quitar columna">
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => removeFromSelected(field.identifier)}
                          class="text-red-400 hover:text-red-600"
                        >
                          ×
                        </Button>
                      </WithTooltip>
                    </div>
                  )}
                </div>
              );
            }}
          </For>
        </div>
      </div>

    </div>
  );
}

/* ─────────────────── ColumnSelectorButton ─────────────────── */

export function ColumnSelectorButton(props: {
  availableFields: TableField[];
  visibleColumns: Accessor<string[]>;
  setVisibleColumns: Setter<string[]>;
  frozenColumns?: string[];
  defaultColumns?: string[];
  buttonProps?: {
    variant?: "primary" | "secondary" | "danger" | "success" | "warning" | "ghost" | "outline";
    size?: "xs" | "sm" | "md" | "lg" | "xl";
    text?: string;
    icon?: JSX.Element;
  };
}) {
  const defaultColumns = Array.from(
    new Map(
      [...(props.frozenColumns ?? []), ...(props.defaultColumns ?? [])]
        .reverse()
        .map((item, i) => [item, i])
    ).keys()
  ).reverse();

  const openColumnModal = () => {
    const modalId = modalStore.openModal({
      size: "lg",
      bodyStyle: { padding: "0px" },
      title: "Gestionar columnas",
      children: () => (
        <ColumnSelectorModal
          availableFields={props.availableFields}
          visibleColumns={props.visibleColumns}
          setVisibleColumns={props.setVisibleColumns}
          frozenColumns={props.frozenColumns}
          defaultColumns={defaultColumns}
        />
      ),
      footer: () => (
        <>
          <Show when={(props.defaultColumns?.length ?? 0) > 0}>
            <div class="flex-1">
              <Button
                variant="ghost"
                onClick={() => props.setVisibleColumns(defaultColumns)}
                title="Restablecer columnas predeterminadas"
              >
                Restablecer
              </Button>
            </div>
          </Show>
          <Button variant="primary" onClick={() => modalStore.closeModal(modalId)}>
            Listo
          </Button>
        </>
      ),
    });
  };

  const bp = props.buttonProps ?? {};

  return (
    <Button
      onClick={openColumnModal}
      variant={bp.variant ?? "outline"}
      size={bp.size ?? "sm"}
    >
      <Show when={bp.icon}>{bp.icon}</Show>
      {bp.text ?? "Columnas"}
    </Button>
  );
}