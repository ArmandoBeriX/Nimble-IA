import { createSignal, For, Accessor, Setter, onMount, createEffect, JSX, Show } from "solid-js";
import { TableField } from "../../types/schema";
import Button from "../ui/Button";
import { createStore } from "solid-js/store";
import { modalStore } from "../../lib/modal-store";
import "./ColumnSelector.css";

interface DragItem {
  id: string;
  source: "available" | "selected";
  index?: number;
}

// Componente de contenido del modal (separado)
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
  const [availableItems, setAvailableItems] = createStore<TableField[]>([]);
  const [selectedItems, setSelectedItems] = createStore<TableField[]>([]);
  const [dropIndex, setDropIndex] = createSignal<number | null>(null);


  // Inicializar listas
  onMount(() => {
    updateLists();
  });

  const updateLists = () => {
    const selectedIds = new Set(props.visibleColumns());

    // Separar items seleccionados y disponibles
    const selected: (TableField | undefined)[] = [];
    const available: TableField[] = [];

    props.availableFields.forEach(field => {
      if (selectedIds.has(field.identifier)) {
        // Mantener el orden de visibleColumns
        const index = props.visibleColumns().indexOf(field.identifier);
        selected[index] = field;
      } else {
        available.push(field);
      }
    });

    // Filtrar undefined y aplicar búsqueda
    setSelectedItems(selected.filter((f): f is TableField => f !== undefined));
    setAvailableItems(available.filter(field =>
      field.name.toLowerCase().includes(search().toLowerCase()) ||
      field.identifier.toLowerCase().includes(search().toLowerCase())
    ));
  };

  // Actualizar cuando cambian las props o la búsqueda
  createEffect(() => {
    updateLists();
  });

  const isFrozen = (id: string) => props.frozenColumns?.includes(id) || false;

  // DRAG & DROP HANDLERS
  const handleDragStart = (e: DragEvent, item: TableField, source: "available" | "selected") => {
    if (!e.dataTransfer) return;

    const dragItem: DragItem = {
      id: item.identifier,
      source,
      index: source === "selected" ?
        selectedItems.findIndex(f => f.identifier === item.identifier) :
        availableItems.findIndex(f => f.identifier === item.identifier)
    };

    setDragging(dragItem);
    e.dataTransfer.setData("text/plain", JSON.stringify(dragItem));
    e.dataTransfer.effectAllowed = "move";

    // Feedback visual
    const target = e.currentTarget as HTMLElement;
    target.classList.add("dragging");
  };

  const handleDragEnd = (e: DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.classList.remove("dragging");
    setDragging(null);
  };

  const handleDragOver = (e: DragEvent, targetList: "available" | "selected") => {
    e.preventDefault();
    if (!e.dataTransfer) return;

    e.dataTransfer.dropEffect = "move";

    // Feedback visual
    const container = e.currentTarget as HTMLElement;
    container.classList.add("drag-over");
  };

  const handleItemDragOver = (e: DragEvent, index: number) => {
    e.preventDefault();
    setDropIndex(index);
  };

  const handleDragLeave = (e: DragEvent) => {
    const container = e.currentTarget as HTMLElement;
    container.classList.remove("drag-over");
  };

  const handleDrop = (e: DragEvent, targetList: "available" | "selected") => {
    e.preventDefault();
    const container = e.currentTarget as HTMLElement;
    container.classList.remove("drag-over");

    if (!dragging()) return;

    const dragItem = dragging()!;

    // Mover entre listas
    if (dragItem.source !== targetList) {
      if (targetList === "selected") {
        addToSelected(dragItem.id);
      } else {
        if (!isFrozen(dragItem.id)) {
          removeFromSelected(dragItem.id);
        }
      }
    } else {
      // Reordenar dentro de la misma lista (solo para seleccionados)
      if (targetList === "selected") {
        const children = Array.from(container.children);
        let targetIndex = -1;

        // Encontrar el índice del elemento sobre el que se soltó
        for (let i = 0; i < children.length; i++) {
          const child = children[i] as HTMLElement;
          const rect = child.getBoundingClientRect();
          const mouseY = e.clientY;

          // Si el mouse está en la mitad superior del elemento
          if (mouseY <= rect.top + rect.height / 2) {
            targetIndex = i;
            break;
          }
        }

        // Si no encontramos, poner al final
        if (targetIndex === -1) {
          targetIndex = children.length;
        }

        if (dragItem.index !== undefined && dragItem.index !== targetIndex) {
          moveSelectedItem(dragItem.index, targetIndex);
        }
      }
    }
    setDropIndex(null);
  };

  // CRUD OPERATIONS
  const addToSelected = (fieldId: string) => {
    const field = props.availableFields.find(f => f.identifier === fieldId);
    if (!field || props.visibleColumns().includes(fieldId)) return;

    props.setVisibleColumns(prev => [...prev, fieldId]);
    updateLists();
  };

  const removeFromSelected = (fieldId: string) => {
    if (isFrozen(fieldId)) return;

    props.setVisibleColumns(prev => prev.filter(id => id !== fieldId));
    updateLists();
  };

  const moveSelectedItem = (fromIndex: number, toIndex: number) => {
    const frozenCount = props.frozenColumns?.length || 0;

    // Ajustar índices para respetar columnas frozen
    if (fromIndex < frozenCount || toIndex < frozenCount) {
      return;
    }

    const newColumns = [...props.visibleColumns()];
    const [moved] = newColumns.splice(fromIndex, 1);
    newColumns.splice(toIndex, 0, moved);
    props.setVisibleColumns(newColumns);
    updateLists();
  };

  const moveUp = (index: number) => {
    if (index <= (props.frozenColumns?.length || 0)) return;
    moveSelectedItem(index, index - 1);
  };

  const moveDown = (index: number) => {
    if (index >= props.visibleColumns().length - 1) return;
    moveSelectedItem(index, index + 1);
  };

  const moveToTop = (index: number) => {
    const frozenCount = props.frozenColumns?.length || 0;
    if (index <= frozenCount) return;
    moveSelectedItem(index, frozenCount);
  };

  const moveToBottom = (index: number) => {
    if (index >= props.visibleColumns().length - 1) return;
    moveSelectedItem(index, props.visibleColumns().length - 1);
  };

  return (

    <div class="columns-container">
      {/* COLUMNAS DISPONIBLES */}
      <div class="column-list available-columns">
        <div class="list-header">
          <h4>Available Columns</h4>
          <input
            type="text"
            placeholder="Search columns..."
            value={search()}
            onInput={(e) => setSearch(e.currentTarget.value)}
            class="search-input"
          />
        </div>

        <div
          class="list-container"
          onDragOver={(e) => handleDragOver(e, "available")}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, "available")}
        >
          <For each={availableItems}>
            {(field, index) => (
              <div
                class={`column-item ${dropIndex() === index() ? "drop-target" : ""}`}
                onDragOver={(e) => handleItemDragOver(e, index())}
                draggable={true}
                onDragStart={(e) => handleDragStart(e as DragEvent, field, "available")}
                onDragEnd={handleDragEnd}
              >
                <span class="drag-handle">⋮⋮</span>
                <span class="column-name">{field.name || field.identifier}</span>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => addToSelected(field.identifier)}
                  class="add-btn"
                >
                  +
                </Button>
              </div>
            )}
          </For>
          {availableItems.length === 0 && (
            <div class="empty-state">No columns available</div>
          )}
        </div>
      </div>

      {/* COLUMNAS SELECCIONADAS */}
      <div class="column-list selected-columns">
        <div class="list-header">
          <h4>Selected Columns ({selectedItems.length})</h4>
          <div class="list-subtitle">Drag to reorder or use buttons</div>
        </div>

        <div
          class="list-container"
          onDragOver={(e) => handleDragOver(e, "selected")}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, "selected")}
        >
          <For each={selectedItems}>
            {(field, index) => {
              const frozen = isFrozen(field.identifier);
              return (
                <div
                  class={`column-item ${frozen ? "frozen" : ""}`}
                  draggable={!frozen}
                  onDragStart={(e) => !frozen && handleDragStart(e as DragEvent, field, "selected")}
                  onDragEnd={handleDragEnd}
                >
                  <span class="drag-handle">⋮⋮</span>
                  <span class="column-name">
                    {field.name || field.identifier}
                    {frozen && <span class="frozen-badge">Frozen</span>}
                  </span>

                  <div class="column-actions">
                    <div class="move-buttons">
                      <Button
                        size="xs"
                        variant="ghost"
                        disabled={frozen || index() <= (props.frozenColumns?.length || 0)}
                        onClick={() => moveUp(index())}
                        title="Move up"
                      >
                        ↑
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        disabled={frozen || index() >= selectedItems.length - 1}
                        onClick={() => moveDown(index())}
                        title="Move down"
                      >
                        ↓
                      </Button>
                    </div>

                    <div class="jump-buttons">
                      <Button
                        size="xs"
                        variant="ghost"
                        disabled={frozen || index() <= (props.frozenColumns?.length || 0)}
                        onClick={() => moveToTop(index())}
                        title="Move to top"
                      >
                        ⇈
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        disabled={frozen || index() >= selectedItems.length - 1}
                        onClick={() => moveToBottom(index())}
                        title="Move to bottom"
                      >
                        ⇊
                      </Button>
                    </div>

                    {!frozen && (
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => removeFromSelected(field.identifier)}
                        title="Remove column"
                        class="remove-btn"
                      >
                        ×
                      </Button>
                    )}
                  </div>
                </div>
              );
            }}
          </For>
          {selectedItems.length === 0 && (
            <div class="empty-state">No columns selected</div>
          )}
        </div>
      </div>
    </div>
  );
}

// Componente principal que renderiza el botón
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
      [...(props.frozenColumns || []), ...(props.defaultColumns || [])]
        .reverse().map((item, i) => [item, i])
    ).keys()
  ).reverse();

  const openColumnModal = () => {
    const modalId = modalStore.openModal({
      size: "lg",
      bodyStyle: { padding: '0px' },
      title: "Manage Columns",
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
          <Show when={props.defaultColumns?.length || 0 > 0}>
            <div class="footer-left">
              <Button
                title="Restablecer columnas predeterminadas"
                variant="ghost"
                onClick={() => props.setVisibleColumns(defaultColumns)}
              >
                Restablecer
              </Button>
            </div>
          </Show>

          <Button
            variant="primary"
            onClick={() => modalStore.closeModal(modalId)}
          >
            Done
          </Button>
        </>
      ),
    });
  };

  const buttonProps = props.buttonProps || {};

  return (
    <Button
      onClick={openColumnModal}
      variant={buttonProps.variant || "outline"}
      size={buttonProps.size || "sm"}
      {...buttonProps}
    >
      <Show when={buttonProps.icon} fallback={null}>
        {buttonProps.icon}
      </Show>
      {buttonProps.text || "Columnas"}
    </Button>
  );
}