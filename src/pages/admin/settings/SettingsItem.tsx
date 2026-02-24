import { Component, Show } from "solid-js";
import FieldEdit from "../../../components/fields/FieldEdit";
import { SettingItemField } from "./treeUtils";
import Icon from "../../../components/ui/icon/Icon";
import WithTooltip from "../../../components/ui/tooltip/Tooltip";
import Button from "../../../components/ui/Button";
import RecordButtonAction from "../../../components/record/RecordButtonAction";

import { createSortable, transformStyle } from "@thisbeyond/solid-dnd";

interface SettingsItemProps {
  setting: SettingItemField;
}

const SettingsItem: Component<SettingsItemProps> = (props) => {
  const { setting } = props;
  const sortable = createSortable(`setting-${setting.id}`);

  const formatType = () => {
    const format = setting.fieldFormat || 'text';
    return format.charAt(0).toUpperCase() + format.slice(1);
  };

  return (
    <div
      ref={sortable.ref}
      style={transformStyle(sortable.transform)}
      class={`
        relative group py-2 px-4 rounded-lg border bg-white hover:shadow-sm transition-all duration-150
        ${sortable.isActiveDraggable ? 'opacity-30' : 'opacity-100'}
        ${sortable.isActiveDroppable ? 'border-indigo-300 border-2 bg-indigo-50/30' : 'border-gray-200'}
      `}
    >
      {/* Handle de arrastre */}
      <div
        class="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing z-20"
        {...sortable.dragActivators}
      >
        <Icon name="drag" class="w-4 h-4 text-gray-400 hover:text-gray-600" />
      </div>

      {/* Contenido principal */}
      <div class="ml-3">
        {/* Nombre */}
        <div class="flex items-start justify-between">
          <div class="flex-1">
            <Show when={setting.description} fallback={
              <div class="font-medium text-gray-900 text-sm">{setting.name}</div>
            }>
              <WithTooltip tooltip={setting.description}>
                <div class="inline-flex items-center gap-1">
                  <div class="font-medium text-gray-900 text-sm">{setting.name}</div>
                  <Icon name="help" class="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help" />
                </div>
              </WithTooltip>
            </Show>
          </div>
          <div class="flex items-center gap-1">
            <WithTooltip tooltip={<>Valor predeterminado: <em class="text-gray-400">{setting.default || '<ninguno>'}</em></>}>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setting.controller.reset?.()}
                class="p-1 h-6 w-6"
              >
                <Icon name="reload" class="w-3 h-3 hover:text-gray-600" />
              </Button>
            </WithTooltip>

            <RecordButtonAction tableIdentifier="settings" action="update" id={setting.id} buttonProps={{size: 'xs'}}>
              <Icon name="edit" class="w-3 h-3" />
            </RecordButtonAction>

             <RecordButtonAction tableIdentifier="settings" action="delete" id={setting.id} buttonProps={{size: 'xs'}}>
              <Icon name="del" class="w-3 h-3" stroke="#800000" />
            </RecordButtonAction>
          </div>
        </div>

        {/* Campo de edición */}
        <div class="pt-2 border-t border-gray-100">
          <FieldEdit
            controller={setting.controller}
            isFieldForm={false}
            field={setting.field}
          />
        </div>
      </div>
    </div>
  );
};

export default SettingsItem;