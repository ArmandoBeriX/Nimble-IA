// SettingsPage.tsx
import { Component, createSignal, createMemo, Show, For } from "solid-js";
import { useRecordQuery } from "../../../hooks/useRecords";
import { SettingGroupItem, SettingItem } from "../../../constants/table-defs";
import RecordButtonAction from "../../../components/record/RecordButtonAction";
import Icon from "../../../components/ui/icon/Icon";
import { SearchBar } from "../../../components/utils/SearchBar";
import { FilterInput, TableField } from "../../../types/schema";
import FieldEdit from "../../../components/fields/FieldEdit";
import createFormController, { FormController } from "../../../components/fields/form-controller";
import Button from "../../../components/ui/Button";
import WithTooltip from "../../../components/ui/tooltip/WithTooltip";
import { store } from "../../../app";

type SettingItemField = SettingItem & {
  field: Omit<TableField, 'id'>
  controller: FormController
}

interface GroupNode {
  group: SettingGroupItem;
  settings: SettingItemField[];
  children: GroupNode[];
}

/** buildSettingsGroupTree, pruneTreeKeepMatches: idénticos a los tuyos (los dejo tal cual) */
function buildSettingsGroupTree(settings: SettingItemField[], groups: SettingGroupItem[]): GroupNode[] {
  const groupMap = new Map<string, GroupNode>();
  const UNGROUPED_ID = "ungrouped";

  for (const g of groups) {
    if (!groupMap.has(g.id)) {
      groupMap.set(g.id, {
        group: g,
        settings: [],
        children: [],
      });
    }
  }

  for (const setting of settings) {
    const gid = setting.setting_group?.id ?? setting.setting_group_id ?? UNGROUPED_ID;
    if (!groupMap.has(gid)) {
      groupMap.set(gid, {
        group: {
          id: gid,
          name: gid === UNGROUPED_ID ? "Sin grupo" : `Grupo ${gid}`,
          description: gid === UNGROUPED_ID ? "Settings sin grupo asignado" : "",
          parent_id: null,
        } as SettingGroupItem,
        settings: [],
        children: [],
      });
    }
  }

  for (const setting of settings) {
    const gid = setting.setting_group?.id ?? setting.setting_group_id ?? UNGROUPED_ID;
    const node = groupMap.get(gid)!;
    setting.field = { ...setting, tableIdentifier: 'settings', identifier: setting.key }
    node.settings.push(setting);
  }

  const roots: GroupNode[] = [];

  for (const node of groupMap.values()) {
    const parentId = node.group.parent_id ?? null;
    if (parentId && groupMap.has(parentId)) {
      groupMap.get(parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  for (const node of groupMap.values()) {
    node.settings.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }

  return roots;
}

function pruneTreeKeepMatches(nodes: GroupNode[]): GroupNode[] {
  const out: GroupNode[] = [];

  for (const node of nodes) {
    const prunedChildren = pruneTreeKeepMatches(node.children);
    const hasSettings = (node.settings && node.settings.length > 0);
    if (hasSettings || prunedChildren.length > 0) {
      out.push({
        group: node.group,
        settings: node.settings,
        children: prunedChildren,
      });
    }
  }

  return out;
}

const SettingsPage: Component = () => {
  const [searchFilters, setSearchFilters] = createSignal<FilterInput>({});
  const filterFields = ["name", "key", "setting_group.name"];

  const formController = createFormController()

  const [saveStatus, setSaveStatus] = createSignal(0); // 0 = idle, 1 = changes, 2 = saving, 3 = error;
  const saveAllSettings = () => async () => {
    setSaveStatus(2)
    try {
      const allValues = formController.getValues();
      const updates = Object.entries(allValues).map(([key, value]) => ({
        key,
        value,
      }));

      await store.update('settings', updates, 'key')
      setSaveStatus(0)
    } catch (err) {
      console.error("Error guardando todos los settings", err);
      setSaveStatus(3)
    }
  };

  const {
    data: settings,
    loading: loadingSettings,
    error: errorSettings,
  } = useRecordQuery<SettingItemField>(
    "settings",
    searchFilters(),
    { order: [["position", "ASC"]] },
    { setting_group_id: {} }
  );

  const {
    data: groups,
    loading: loadingGroups,
    error: errorGroups,
  } = useRecordQuery<SettingGroupItem>("setting_groups", {}, { order: [["name", "ASC"]] });

  const hasFilters = () => {
    const f = searchFilters() ?? {};
    return Object.keys(f).length > 0;
  };

  const nodes = createMemo(() => {
    if (loadingGroups() || loadingSettings()) return [];
    if (errorGroups() || errorSettings()) return [];
    const s = settings() ?? [];
    const g = groups() ?? [];
    const built = buildSettingsGroupTree(s, g);
    if (!hasFilters()) return built;
    return pruneTreeKeepMatches(built);
  });

  // Drag state
  const [draggedSettingId, setDraggedSettingId] = createSignal<string | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = createSignal<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = createSignal<string | null>(null);

  // Contador para manejar enter/leave anidados en grupos
  const groupEnterCounts = new Map<string, number>();

  // Wrapper para update puntual
  const updateSetting = async (id: string, patch: Partial<SettingItemField>) => {
    try {
      await store.update('settings', [{ id, ...patch }], 'id');
    } catch (err) {
      console.error("updateSetting error", err);
      throw err;
    }
  };

  // Helpers drag'n'drop
  const onDragStart = (e: DragEvent, settingId: string) => {
    setDraggedSettingId(settingId);
    if (e.dataTransfer) {
      e.dataTransfer.setData("text/plain", settingId);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.dropEffect = 'move';
      const img = new Image();
      img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
      e.dataTransfer.setDragImage(img, 0, 0);
    }
  };

  const resetDragState = () => {
    setDraggedSettingId(null);
    setDragOverGroupId(null);
    setDragOverItemId(null);
    groupEnterCounts.clear();
  };

  const onDragEnd = () => {
    resetDragState();
  };

  // Group enter/leave (evita parpadeos con elementos hijos)
  const onDragEnterGroup = (e: DragEvent, groupId: string) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    const prev = groupEnterCounts.get(groupId) ?? 0;
    groupEnterCounts.set(groupId, prev + 1);
    setDragOverGroupId(groupId);
    setDragOverItemId(null);
  };

  const onDragLeaveGroup = (e: DragEvent, groupId: string) => {
    e.preventDefault();
    const prev = groupEnterCounts.get(groupId) ?? 0;
    const next = Math.max(0, prev - 1);
    if (next === 0) {
      groupEnterCounts.delete(groupId);
      if (dragOverGroupId() === groupId) setDragOverGroupId(null);
    } else {
      groupEnterCounts.set(groupId, next);
    }
  };

  const onDragOverGroup = (e: DragEvent, groupId: string) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    // keep visual state: (we usually set it on enter, but keep it here too)
    setDragOverGroupId(groupId);
    setDragOverItemId(null);
  };

  const findGroupNode = (groupId: string | undefined): GroupNode | undefined => {
    if (!groupId) return undefined;
    const rootNodes = nodes();
    const findRec = (arr: GroupNode[]): GroupNode | undefined => {
      for (const n of arr) {
        if (n.group.id === groupId) return n;
        const c = findRec(n.children);
        if (c) return c;
      }
      return undefined;
    };
    return findRec(rootNodes);
  };

  const reorderAndPersist = async (draggedId: string, targetGroupId: string, targetItemId?: string | null) => {
    const groupNode = findGroupNode(targetGroupId);
    let currentList: SettingItemField[] = [];
    if (groupNode) {
      currentList = [...groupNode.settings];
    } else {
      currentList = (settings() ?? []).filter(s => (s.setting_group?.id ?? s.setting_group_id ?? "ungrouped") === targetGroupId);
      currentList.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    }

    const allSettings = settings() ?? [];
    const draggedObj = allSettings.find(s => s.id === draggedId);
    if (!draggedObj) {
      console.warn("Dragged object not found in settings list", draggedId);
      return;
    }

    const filtered = currentList.filter(s => s.id !== draggedId);
    let insertIndex = filtered.length;
    if (targetItemId) {
      const idx = filtered.findIndex(s => s.id === targetItemId);
      insertIndex = idx >= 0 ? idx : filtered.length;
    }

    filtered.splice(insertIndex, 0, { ...draggedObj, setting_group_id: targetGroupId } as SettingItemField);

    const updates: Array<{ id: string; position?: number; setting_group_id?: string | null }> = [];
    for (let i = 0; i < filtered.length; i++) {
      const s = filtered[i];
      const newPos = i;
      const wantsGroupId = targetGroupId;
      if ((s.position ?? -1) !== newPos || (s.setting_group?.id ?? s.setting_group_id ?? null) !== wantsGroupId) {
        updates.push({
          id: s.id!,
          position: newPos,
          setting_group_id: wantsGroupId,
        });
      }
    }

    if (updates.length === 0) return;

    try {
      await store.update('settings', updates, 'id');
    } catch (err) {
      console.error("Error persisting reorder updates", err);
      throw err;
    }
  };

  const onDropOnGroup = async (e: DragEvent, targetGroupId: string) => {
    e.preventDefault();
    const draggedId = draggedSettingId() ?? e.dataTransfer?.getData("text/plain") ?? null;
    if (!draggedId) {
      resetDragState();
      return;
    }

    try {
      await reorderAndPersist(draggedId, targetGroupId, null);
    } catch (err) {
      console.error("onDropOnGroup error", err);
    } finally {
      resetDragState();
    }
  };

  const onDragOverItem = (e: DragEvent, groupId: string | undefined, itemId: string) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    if (!groupId) return;
    setDragOverGroupId(groupId);
    setDragOverItemId(itemId);
  };

  const onDropOnItem = async (e: DragEvent, targetGroupId: string | undefined, targetItemId: string) => {
    // Important: stop propagation so parent group drop doesn't also run
    e.preventDefault();
    e.stopPropagation();
    const draggedId = draggedSettingId() ?? e.dataTransfer?.getData("text/plain") ?? null;
    if (!draggedId) {
      resetDragState();
      return;
    }
    if (!targetGroupId) {
      resetDragState();
      return;
    }
    if (draggedId === targetItemId) {
      resetDragState();
      return;
    }

    try {
      await reorderAndPersist(draggedId, targetGroupId, targetItemId);
    } catch (err) {
      console.error("onDropOnItem error", err);
    } finally {
      resetDragState();
    }
  };

  // Renderer
  const GroupNodeView: Component<{ node: GroupNode; depth?: number }> = (props) => {
    const depth = props.depth ?? 0;
    const node = props.node;
    const isDragOverGroup = () => dragOverGroupId() === node.group.id;

    return (
      <div class="mb-4" style={{ "padding-left": `${depth * 16}px` }}>
        <section
          class={
            "bg-white border rounded-lg shadow-sm p-4 transition-colors " +
            (isDragOverGroup() ? "ring-2 ring-dashed ring-indigo-300" : "ring-0")
          }
          onDragEnter={(e) => onDragEnterGroup(e as DragEvent, node.group.id!)}
          onDragLeave={(e) => onDragLeaveGroup(e as DragEvent, node.group.id!)}
          onDragOver={(e) => onDragOverGroup(e as DragEvent, node.group.id!)}
          onDrop={(e) => onDropOnGroup(e as DragEvent, node.group.id!)}
        >
          <header class="flex items-center justify-between mb-3">
            <div>
              <h3 class="text-lg font-semibold">{node.group.name}</h3>
              <p class="text-xs text-gray-500">{node.group.description}</p>
            </div>

            <div class="flex items-center gap-2">
              <RecordButtonAction
                tableIdentifier="settings"
                action="create"
                initialValues={{ setting_group_id: node.group.id }}
              >
                <div class="flex items-center gap-2 px-3 py-1 border rounded-md hover:bg-gray-50">
                  <Icon name="add" />
                  <span class="text-sm">Nuevo setting</span>
                </div>
              </RecordButtonAction>
            </div>
          </header>

          <ul class="space-y-2">
            <For each={node.settings}>
              {(s) => {
                const isDragged = () => draggedSettingId() === s.id;
                const isDragOverItem = () => dragOverItemId() === s.id;
                const controller = formController.registerField(s.key)
                return (
                  <li
                    class={
                      "relative flex items-center justify-between p-3 rounded-md border bg-white " +
                      (isDragged() ? "opacity-50" : "") +
                      (isDragOverItem() ? "z-10" : "")
                    }
                    draggable
                    onDragStart={(e) => onDragStart(e as DragEvent, s.id!)}
                    onDragEnd={() => onDragEnd()}
                    onDragOver={(e) => onDragOverItem(e as DragEvent, s.setting_group?.id, s.id!)}
                    onDrop={(e) => onDropOnItem(e as DragEvent, s.setting_group?.id, s.id!)}
                    role="button"
                    aria-grabbed={isDragged() ? "true" : "false"}
                  >
                    <Show when={isDragOverItem()}>
                      <div class="absolute -top-1 left-2 right-2 h-0.5 bg-indigo-500"></div>
                    </Show>

                    <div class="flex items-center gap-3">
                      <span class="cursor-grab select-none p-2">
                        <Icon name="drag" />
                      </span>

                      <div>
                        <div class="text-sm font-medium">{s.name}</div>
                        <div class="text-xs text-gray-500">{s.key} • {s.fieldFormat}</div>
                      </div>

                      <div>
                        <FieldEdit controller={controller} isFieldForm={false} field={s.field} />
                      </div>
                    </div>

                    <div class="flex items-center gap-1">
                      <WithTooltip tooltip={<>Valor predeterminado: <em class="text-gray-400">{s.default || '<ninguno>'}</em></>}>
                        <Button variant="ghost" size="sm" onClick={() => controller.reset?.()}>
                          <Icon name="reload" class="hover:text-gray-600 cursor-pointer" />
                        </Button>
                      </WithTooltip>

                      <RecordButtonAction tableIdentifier="settings" action="update" id={s.id}>
                        <Icon name="edit" />
                      </RecordButtonAction>
                    </div>
                  </li>
                );
              }}
            </For>

            <Show when={node.settings.length === 0}>
              <li class="text-sm text-gray-400 italic p-2">No hay settings en este grupo.</li>
            </Show>
          </ul>
        </section>

        <For each={node.children}>
          {(child) => <GroupNodeView node={child} depth={(depth ?? 0) + 1} />}
        </For>
      </div>
    );
  };

  return (
    <div class="p-6">
      <div class="mb-4">
        <h1 class="text-2xl font-bold">Configuración</h1>
        <p class="text-sm text-gray-500">Ajustes generales de la aplicación</p>
      </div>

      <div class="flex items-center justify-between mb-6">
        <div>
          <SearchBar availableFields={filterFields} searchFilters={searchFilters} setSearchFilters={setSearchFilters} />
        </div>

        <div>
          <WithTooltip tooltip="Guardar todos los cambios realizados">
            <Button disabled={saveStatus() === 0} loading={saveStatus() === 1} onClick={saveAllSettings()} variant="primary">
              <Icon name="save" />
              <span>Guardar</span>
            </Button>
          </WithTooltip>
        </div>

        <div>
          <RecordButtonAction tableIdentifier="setting_groups" action="create" buttonProps={{ variant: "primary" }}>
            <Icon name="add" />
            <span>Nuevo grupo</span>
          </RecordButtonAction>
        </div>
      </div>

      <Show when={loadingSettings() || loadingGroups()}>
        <div class="p-4 text-sm text-gray-500">Cargando configuración...</div>
      </Show>

      <Show when={errorSettings() || errorGroups()}>
        <div class="p-4 text-sm text-red-600">Error cargando settings o grupos. Revisa la consola o la API.</div>
        <div class="text-xs text-gray-600">{errorSettings()?.message ?? errorGroups()?.message}</div>
      </Show>

      <div class="space-y-4">
        <For each={nodes()}>
          {(node) => <GroupNodeView node={node} depth={0} />}
        </For>
      </div>
    </div>
  );
};

export default SettingsPage;
