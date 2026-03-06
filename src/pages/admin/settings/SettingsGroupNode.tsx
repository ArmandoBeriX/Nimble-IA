import { Component, For, Show } from "solid-js";
import { GroupNode } from "./treeUtils";
import RecordButtonAction from "../../../components/record/RecordButtonAction";
import Icon from "../../../components/ui/icon/Icon";
import SettingsItem from "./SettingsItem";

import { createDroppable, SortableProvider } from "@thisbeyond/solid-dnd";

interface SettingsGroupNodeProps {
  node: GroupNode;
  depth?: number;
}

const SettingsGroupNode: Component<SettingsGroupNodeProps> = (props) => {
  const depth = props.depth ?? 0;
  const { node } = props;

  const droppable = createDroppable(`group-${node.group.id}`);
  const isUngrouped = () => node.group.id === "ungrouped";

  return (
    <div class="mb-6" style={{ "margin-left": `${depth * 24}px` }}>
      <div
        ref={droppable.ref}
        class={`
          bg-white border rounded-lg shadow-sm p-4 transition-all duration-200
          ${droppable.isActiveDroppable ? 'ring-2 ring-dashed ring-indigo-300 bg-indigo-50/50' : 'ring-0'}
        `}
      >
        <header class="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <h3 class="text-lg font-semibold text-gray-900">
                {node.group.name}
              </h3>
              {isUngrouped() && (
                <span class="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  Sin grupo
                </span>
              )}
            </div>
            <Show when={node.group.description}>
              <p class="text-sm text-gray-600 mt-1">{node.group.description}</p>
            </Show>
          </div>

          <div class="flex items-center gap-2">
            <RecordButtonAction
              tableIdentifier="settings"
              action="create"
              initialValues={{
                setting_group_id: isUngrouped() ? null : node.group.id,
                position: node.settings.length
              }}
            >

              <Icon name="add" class="w-4 h-4" />
              <span class="hidden sm:block">Nueva Configuración</span>

            </RecordButtonAction>
          </div>
        </header>

        <SortableProvider ids={node.settings.map(s => `setting-${s.id}`)}>
          <div class="space-y-3">
            <For each={node.settings}>
              {(setting) => (
                <SettingsItem setting={setting} />
              )}
            </For>

            <Show when={node.settings.length === 0}>
              <div class="text-sm text-gray-400 italic p-6 text-center border-2 border-dashed border-gray-300 rounded-lg">
                Arrastra settings aquí o crea uno nuevo
              </div>
            </Show>
          </div>
        </SortableProvider>
      </div>

      <Show when={node.children && node.children.length > 0}>
        <div class="mt-4">
          <For each={node.children}>
            {(child) => (
              <SettingsGroupNode
                node={child}
                depth={0}
              />
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};

export default SettingsGroupNode;