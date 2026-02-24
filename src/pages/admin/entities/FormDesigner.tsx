// src/components/FormDesigner.tsx
import {
  DragDropProvider,
  DragDropSensors,
  DragOverlay,
  createDraggable,
  createDroppable,
  closestCenter,
} from "@thisbeyond/solid-dnd";
import { For, createEffect, Show } from "solid-js";
import { createStore } from "solid-js/store";
import { useRecordQuery } from "../../../hooks/useRecords";
import { store } from "../../../app";
import Icon from "../../../components/ui/icon/Icon";
import { FieldFormatLabels } from "../../../types/schema";
import RecordButtonAction from "../../../components/record/RecordButtonAction";
import FilterSelectorButton from "../../../components/utils/FilterSelector";
import { FormItemItem } from "../../../constants/table-defs";

export default function FormDesigner(props: { form_id: string | null }) {
  const table = store.getTable?.("form_items");
  const { data: formItemsData, loading, error } = useRecordQuery<FormItemItem>(
    "form_items",
    { form_id: props.form_id },
    {},
  );

  const buildContainersMap = (arr: FormItemItem[] = []) => {
    const map: Record<string, string[]> = { root: [] };
    arr.forEach((it) => {
      if (it.type === "container") map[`container-${it.id}`] = [];
    });
    arr.forEach((it) => {
      const parentKey = it.parent_id ? `container-${it.parent_id}` : "root";
      if (!map[parentKey]) map[parentKey] = [];
      map[parentKey].push(it.id);
    });
    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => {
        const ia = arr.find((x) => x.id === a);
        const ib = arr.find((x) => x.id === b);
        return (ia?.position ?? 0) - (ib?.position ?? 0);
      });
    });
    return map;
  };

  const [containers, setContainers] = createStore<Record<string, string[]>>(buildContainersMap([]));

  // Mantener containers sincronizado con el accessor
  createEffect(() => {
    const data = formItemsData() ?? [];
    setContainers(buildContainersMap(data));
  });

  const getItem = (id: string) => (formItemsData() ?? []).find((i) => i.id === id)!;
  const getContainerIdFor = (id: string) => {
    const it = getItem(id);
    return it?.parent_id ? `container-${it.parent_id}` : "root";
  };

  // Reordena y persiste en backend: crea array de updates y llama store.update
  async function reorderAndPersist(draggedId: string, targetContainerId: string, targetItemId?: string | null) {
    const all = formItemsData() ?? [];

    // Construir lista actual del target
    const currentTargetList = (containers[targetContainerId] ?? []).slice();
    // si dragged proviene del mismo container, quítalo primero
    const draggedFrom = getContainerIdFor(draggedId);
    const fromList = (containers[draggedFrom] ?? []).filter((x) => x !== draggedId);

    // Build the new target list:
    const filteredTarget = currentTargetList.filter((x) => x !== draggedId);
    let insertIndex = filteredTarget.length;
    if (targetItemId) {
      const idx = filteredTarget.findIndex((x) => x === targetItemId);
      insertIndex = idx >= 0 ? idx : filteredTarget.length;
    }
    filteredTarget.splice(insertIndex, 0, draggedId);

    // Generate updates for the target container items (positions and parent_id)
    const updates: Array<Partial<FormItemItem> & { id: string }> = [];

    // helper to push updates for a list into a given container id
    const pushUpdatesFor = (list: string[], containerId: string) => {
      for (let i = 0; i < list.length; i++) {
        const id = list[i];
        const desiredPos = i + 1; // posiciones 1..N (ajusta si prefieres empezar en 0)
        const current = all.find((x) => x.id === id);
        const currentParent = current?.parent_id ?? null;
        const desiredParent = containerId === "root" ? null : containerId.replace(/^container-/, "");
        if (!current) continue;
        if ((current.position ?? -1) !== desiredPos || currentParent !== desiredParent) {
          updates.push({
            id,
            position: desiredPos,
            parent_id: desiredParent,
          });
        }
      }
    };

    // items in source container after removal
    pushUpdatesFor(fromList, draggedFrom);

    // items in target container after insertion
    pushUpdatesFor(filteredTarget, targetContainerId);

    if (updates.length === 0) return;

    try {
      await store.update("form_items", updates, "id");
      // store.update should refresh formItemsData via hook
    } catch (err) {
      console.error("Error persisting reorder updates", err);
      // fallback: recompute UI-only containers so user sees change (optimistic could be added)
      setContainers((prev) => ({ ...prev }));
    }
  }

  // mover lógica en UI (no persist) — usada para mostrar cambio mientras arrastras
  function moveLocal(draggableId: string, droppableId?: string, indexHint?: number) {
    const from = getContainerIdFor(draggableId);
    const to = droppableId ?? "root";
    if (!containers[from]) return;
    const fromList = containers[from].filter((x) => x !== draggableId);
    const toList = [...(containers[to] ?? [])];
    const index = typeof indexHint === "number" ? indexHint : toList.length;
    toList.splice(index, 0, draggableId);
    setContainers(from, () => fromList);
    setContainers(to, () => toList);
  }

  // drag handlers
  const onDragOver = ({ draggable, droppable }: any) => {
    if (!draggable) return;
    if (!droppable) return;
    const targetId = droppable.id;
    if (targetId.startsWith("container-") || targetId === "root") {
      moveLocal(draggable.id, targetId);
    } else {
      const targetContainer = getContainerIdFor(targetId);
      const index = (containers[targetContainer] ?? []).indexOf(targetId);
      moveLocal(draggable.id, targetContainer, index);
    }
  };

  const onDragEnd = async ({ draggable, droppable }: any) => {
    if (!draggable) return;
    if (!droppable) {
      // drop fuera -> mover al root y persistir
      try {
        await reorderAndPersist(draggable.id, "root", null);
      } catch (e) {
        console.error(e);
      }
      return;
    }
    const targetId = droppable.id;
    if (targetId.startsWith("container-") || targetId === "root") {
      try {
        await reorderAndPersist(draggable.id, targetId, null);
      } catch (e) {
        console.error(e);
      }
    } else {
      const targetContainer = getContainerIdFor(targetId);
      const index = (containers[targetContainer] ?? []).indexOf(targetId);
      try {
        await reorderAndPersist(draggable.id, targetContainer, targetId);
      } catch (e) {
        console.error(e);
      }
    }
  };

  // actualizar tamaño (persist)
  const changeSize = async (id: string, newSize: number) => {
    try {
      await store.update("form_items", [{ id, size: newSize }], "id");
    } catch (err) {
      console.error("changeSize error", err);
    }
  };

  // actualizar filtros (persist)
  const updateFilters = async (id: string, filters: any) => {
    try {
      await store.update("form_items", [{ id, filters }], "id");
    } catch (err) {
      console.error("updateFilters error", err);
    }
  };

  // create action initialValues factory (creates a new form_item)
  // Use RecordButtonAction UI to create so the backend hook refreshes the list automatically
  const createInitialForContainer = (parentId?: string | null): Partial<FormItemItem> => ({
    form_id: props.form_id!,
    parent_id: parentId ?? null,
    type: "field",
    size: 2,
    position: (containers[parentId ? `container-${parentId}` : "root"]?.length ?? 0) + 1,
  });

  // Render helpers: responsive class
  const responsiveClassForSize = (size?: number) => {
    const s = size ?? 2;
    const lg = Math.max(1, Math.min(4, s));
    const md = Math.max(1, Math.min(2, s));
    return `col-span-${lg} md:col-span-${md} col-span-1`;
  };

  // root droppable action en scope
  const droppable = (el: HTMLElement) => {
    const a = createDroppable("root");
    return a(el);
  };

  // Item component
  const Item = (props: { id: string }) => {
    const item = () => getItem(props.id);
    const droppableForChildrenId = () => `container-${item()?.id}`;

    const draggable = (el: HTMLElement) => {
      const a = createDraggable(props.id);
      return a(el);
    };

    const droppableChildren = (el: HTMLElement) => {
      const a = createDroppable(droppableForChildrenId());
      return a(el);
    };

    return (
      <div use:draggable={draggable} class={`p-3 border rounded bg-white ${responsiveClassForSize(item()?.size)}`}>
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-2">
            <div class="cursor-grab">
              <Icon name="drag" />
            </div>

            <div>
              <div class="font-medium text-sm">
                {console.log(JSON.stringify(item())) + ''}
                {item()?.type === "field"
                  ? (store.getField?.(item()?.field_id ?? "")?.name ?? "Campo")
                  : item()?.type === "container"
                  ? "Contenedor"
                  : "Divider"}
              </div>
              <div class="text-xs text-gray-500">
                {item()?.type === "field"
                  ? FieldFormatLabels[store.getField?.(item()?.field_id ?? "")?.fieldFormat ?? "text"] ?? "Campo"
                  : item()?.type}
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <select
              class="text-xs border px-2 py-1 rounded"
              value={item()?.size}
              onInput={(e) => changeSize(item()!.id, Number((e.target as HTMLSelectElement).value))}
            >
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>

            <FilterSelectorButton
              tableIdentifier={"form_items"}
              filters={item()?.filters}
              setFilters={(f: any) => updateFilters(item()!.id, f)}
            />

            {/* Edit: modal/update via RecordButtonAction */}
            <RecordButtonAction tableIdentifier="form_items" action="update" id={item()?.id}>
              <button class="px-2 py-1 text-sm">Editar</button>
            </RecordButtonAction>

            {/* Delete: use RecordButtonAction so backend removes and hook refreshes */}
            <RecordButtonAction
              tableIdentifier="form_items"
              action="delete"
              id={item()?.id}
              buttonProps={{ variant: "danger" }}
              modalProps={{ title: "Confirmar eliminación" }}
            >
              <button class="px-2 py-1 text-sm">Eliminar</button>
            </RecordButtonAction>
          </div>
        </div>

        {/* If container, render its children droppable area. If empty, show placeholder + create button */}
        <Show when={item()?.type === "container"}>
          <div class="mt-3 p-2 border rounded bg-gray-50">
            <div use:droppable={droppableChildren} class="min-h-12 flex flex-col gap-3">
              <Show when={(containers[droppableForChildrenId()] ?? []).length > 0} fallback={
                <div class="p-3 text-sm text-gray-500 italic flex items-center justify-between">
                  <span>Contenedor vacío.</span>
                  <RecordButtonAction
                    tableIdentifier="form_items"
                    action="create"
                    initialValues={createInitialForContainer(item()?.id)}
                    buttonProps={{ variant: "primary" }}
                  >
                    <span class="px-3 py-1 text-sm">Agregar</span>
                  </RecordButtonAction>
                </div>
              }>
                <For each={containers[droppableForChildrenId()] ?? []}>
                  {(childId) => <Item id={childId} />}
                </For>
              </Show>
            </div>
          </div>
        </Show>
      </div>
    );
  };

  return (
    <div class="p-3">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-lg font-semibold">Form Designer</h3>

        <div class="flex items-center gap-2">
          {/* Crear nuevo item en root */}
          <RecordButtonAction
            tableIdentifier="form_items"
            action="create"
            initialValues={createInitialForContainer(null)}
            buttonProps={{ variant: "primary" }}
          >
            <span class="px-3 py-1 inline-flex items-center gap-2">Agregar item</span>
          </RecordButtonAction>
        </div>
      </div>

      <DragDropProvider onDragOver={onDragOver} onDragEnd={onDragEnd} collisionDetector={closestCenter}>
        <DragDropSensors />

        <div use:droppable={droppable} class="grid lg:grid-cols-4 md:grid-cols-2 grid-cols-1 gap-4">
          <Show when={(containers["root"] ?? []).length > 0} fallback={
            <div class="p-6 border rounded-md bg-white text-sm text-gray-600 flex items-center justify-between">
              <div>No hay items en este formulario.</div>
              <RecordButtonAction
                tableIdentifier="form_items"
                action="create"
                initialValues={createInitialForContainer(null)}
                buttonProps={{ variant: "primary" }}
              >
                <span class="px-3 py-1">Agregar primero</span>
              </RecordButtonAction>
            </div>
          }>
            <For each={containers["root"] ?? []}>{(id) => <Item id={id} />}</For>
          </Show>
        </div>

        <DragOverlay>
          {(draggable: any) => {
            return (
              <div class="p-2 bg-white border rounded shadow">
                {draggable?.id ?? "arrastrando"}
              </div>
            );
          }}
        </DragOverlay>
      </DragDropProvider>

      <Show when={loading()}>
        <div class="text-sm text-gray-500 mt-2">Cargando items...</div>
      </Show>
      <Show when={error()}>
        <div class="text-sm text-red-500 mt-2">Error al cargar items</div>
      </Show>
    </div>
  );
}
