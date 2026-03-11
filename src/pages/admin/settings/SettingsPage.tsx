import { Component, createSignal, createMemo, Show, For, onCleanup } from "solid-js";
import { useRecordQuery } from "../../../hooks/useRecords";
import { SettingGroupItem, SettingItem } from "../../../constants/table-defs";
import RecordButtonAction from "../../../components/record/RecordButtonAction";
import Icon from "../../../components/ui/icon/Icon";
import { SearchBar } from "../../../components/utils/SearchBar";
import { FilterInput, TableField } from "../../../types/schema";
import createFormController from "../../../components/fields/form-controller";
import Button from "../../../components/ui/Button";
import WithTooltip from "../../../components/ui/tooltip/WithTooltip";
import { store } from "../../../app";
import { buildSettingsGroupTree, pruneTreeKeepMatches, SettingItemField, GroupNode } from "./treeUtils";
import { calculateInsertPosition, reorderAndPersist } from "./dragDropUtils";
import SettingsGroupNode from "./SettingsGroupNode";

import {
  DragDropProvider,
  DragDropSensors,
  DragOverlay,
  closestCenter,
  type DragEvent as DndDragEvent,
} from "@thisbeyond/solid-dnd";

const SettingsPage: Component = () => {
  const [searchFilters, setSearchFilters] = createSignal<FilterInput>({});
  const filterFields = ["name", "key"];
  const [activeDraggable, setActiveDraggable] = createSignal<any>(null);

  const formController = createFormController();
  const [saveStatus, setSaveStatus] = createSignal(0);

  const saveAllSettings = async () => {
    setSaveStatus(2);
    try {
      const allValues = formController.getValues();
      const updates = Object.entries(allValues).map(([key, value]) => ({
        key,
        value,
      }));

      await store.update('settings', updates, 'key');
      setSaveStatus(0);
    } catch (err) {
      console.error("Error guardando todos los settings", err);
      setSaveStatus(3);
    }
  };

  const {
    data: settings,
    loading: loadingSettings,
    error: errorSettings,
  } = useRecordQuery<SettingItem>(
    "settings",
    searchFilters,
    { order: [["position", "ASC"]] },
    { setting_group_id: {} }
  );

  const {
    data: groups,
    loading: loadingGroups,
    error: errorGroups,
  } = useRecordQuery<SettingGroupItem>("setting_groups", {}, { order: [["name", "ASC"]] });

  // Preparar settings con controllers
  const settingsWithControllers = createMemo(() => {
    const s = settings ?? [];
    return s.map(setting => {
      const field: Omit<TableField, 'id'> = {
        identifier: setting.key,
        tableIdentifier: 'settings',
        ...setting
      };

      const controller = formController.registerField(setting.key);

      return {
        ...setting,
        field,
        controller,
      } as SettingItemField;
    });
  });

  const hasFilters = () => {
    const f = searchFilters() ?? {};
    for (const key in f) {
      const value = f[key as keyof FilterInput];
      if (value != null && value !== '') {
        return true;
      }
    }
    return false;
  };

  const nodes = createMemo(() => {
    if (loadingGroups() || loadingSettings()) return [];
    if (errorGroups() || errorSettings()) return [];

    const s = settingsWithControllers();
    const g = groups ?? [];

    const built = buildSettingsGroupTree(s, g);
    if (!hasFilters()) return built;
    return pruneTreeKeepMatches(built);
  });

  const findGroupNode = (groupId: string): GroupNode | undefined => {
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

  const handleDragStart = (event: DndDragEvent) => {
    setActiveDraggable(event.draggable);
  };

  // En la función handleDragEnd de SettingsPage.tsx, modifica el bloque else if:

  const handleDragEnd = async (event: DndDragEvent) => {
    setActiveDraggable(null);

    const { draggable, droppable } = event;
    if (!draggable || !droppable) return;

    const draggedId = String(draggable.id).replace('setting-', '');
    const droppableId = String(droppable.id);

    // Determinar si el drop target es un grupo o un item
    if (droppableId.startsWith('group-')) {
      const targetGroupId = droppableId.replace('group-', '');
      await reorderAndPersist(
        draggedId,
        targetGroupId,
        null,
        'before', // Cuando se suelta en un grupo, insertar al inicio
        settingsWithControllers(),
        findGroupNode
      );
    } else if (droppableId.startsWith('setting-')) {
      const targetItemId = droppableId.replace('setting-', '');
      const targetSetting = settingsWithControllers().find(s => s.id === targetItemId);

      if (!targetSetting) return;

      const targetGroupId = targetSetting.setting_group?.id ?? targetSetting.setting_group_id ?? "ungrouped";

      // Calcular posición de inserción
      let insertPosition: 'before' | 'after' = 'after';

      if (draggable.node && droppable.node) {
        const draggableRect = draggable.node.getBoundingClientRect();
        const droppableRect = droppable.node.getBoundingClientRect();

        insertPosition = calculateInsertPosition(
          draggableRect.top + draggableRect.height / 2, // Centro del elemento arrastrado
          droppableRect,
          0.5
        );
      }

      await reorderAndPersist(
        draggedId,
        targetGroupId,
        targetItemId,
        insertPosition,
        settingsWithControllers(),
        findGroupNode
      );
    }
  };

  // Cleanup
  onCleanup(() => {
    setActiveDraggable(null);
  });

  return (
    <div class="p-6">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Configuración</h1>
        <p class="text-sm text-gray-600">Ajustes generales de la aplicación. Arrastra y suelta para reorganizar.</p>
      </div>

      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div class="w-full sm:w-auto">
          <SearchBar
            availableFields={filterFields}
            searchFilters={searchFilters}
            setSearchFilters={setSearchFilters}
          />
        </div>

        <div class="flex items-center gap-3">
          <WithTooltip tooltip="Guardar todos los cambios realizados">
            <Button
              disabled={saveStatus() === 2 || saveStatus() === 3}
              loading={saveStatus() === 2}
              onClick={saveAllSettings}
              variant="primary"
              class="gap-2"
            >
              <Icon name="save" class="w-4 h-4" />
              <span class="hidden sm:block">Guardar cambios</span>
            </Button>
          </WithTooltip>

          <RecordButtonAction
            tableIdentifier="setting_groups"
            action="create"
            buttonProps={{ variant: "outline" }}
          >
            <Icon name="add" class="w-4 h-4" />
            <span class="hidden sm:block">Nuevo grupo</span>
          </RecordButtonAction>
        </div>
      </div>

      <Show when={loadingSettings() || loadingGroups()}>
        <div class="p-8 text-center text-gray-500">
          <Icon name="loading" class="w-8 h-8 animate-spin mx-auto mb-2" />
          <div>Cargando configuración...</div>
        </div>
      </Show>

      <Show when={errorSettings() || errorGroups()}>
        <div class="p-4 text-sm text-red-600 bg-red-50 rounded-md">
          <div class="font-medium">Error cargando settings o grupos</div>
          <div class="text-xs text-gray-600 mt-1">
            {errorSettings()?.message ?? errorGroups()?.message}
          </div>
        </div>
      </Show>

      <Show when={!loadingSettings() && !loadingGroups() && !errorSettings() && !errorGroups()}>
        <DragDropProvider
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          collisionDetector={closestCenter}
        >
          <DragDropSensors />
          <div class="space-y-6">
            <For each={nodes()}>
              {(node) => (
                <SettingsGroupNode
                  node={node!}
                  depth={0}
                />
              )}
            </For>
          </div>
          <DragOverlay>
            <Show when={activeDraggable()}>
              <div class="bg-white border border-gray-300 rounded-lg shadow-lg p-4 opacity-90">
                <div class="font-medium text-gray-900">
                  {settingsWithControllers().find(s => s.id === activeDraggable()?.id.replace('setting-', ''))?.name || "Setting"}
                </div>
              </div>
            </Show>
          </DragOverlay>
        </DragDropProvider>
      </Show>
    </div>
  );
};

export default SettingsPage;