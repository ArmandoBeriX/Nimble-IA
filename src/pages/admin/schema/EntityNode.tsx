import { createSignal, For, Show } from 'solid-js';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/ui/icon/Icon';
import WithTooltip from '../../../components/ui/tooltip/Tooltip';
import { FieldFormatLabels, TableDef, TableField } from '../../../types/schema';
import { store } from '../../../app';

interface EntityNodeProps {
  table: TableDef;
  fields: TableField[];
  onEdit: () => void;
  onDelete: () => void;
  onAddField: () => void;
  onEditField: (field: TableField) => void;
  onDeleteField: (fieldId: string) => void;
  onNavigateToRelation?: (tableId: string) => void;
  isDragging?: boolean;
  isSearchResult?: boolean;
  isCurrentSearchResult?: boolean;
}

export default function EntityNode(props: EntityNodeProps) {
  const [showActions, setShowActions] = createSignal(false);

  const getFieldFormat = (field: TableField) => {
    if (field.identifier === 'id') {
      return 'Llave primaria';
    }
    return FieldFormatLabels[field.fieldFormat];
  };

  const getFieldIcon = (field: TableField): string => {
    const format = field.fieldFormat;
    if (field.identifier === 'id') {
      return 'key';
    }
    if (field.fieldFormat === 'relation' || field.relationTableIdentifier)
      return store.getTable(field.relationTableIdentifier!)?.icon || 'db-entity';

    const icons: Record<string, string> = {
      string: 'format-string',
      text: 'format-text',
      date: 'format-date',
      time: 'format-time',
      datetime: 'format-datetime',
      int: 'format-int',
      float: 'format-float',
      bool: 'format-bool',
      relation: 'format-relation',
      list: 'format-list',
      attachment: 'format-attachment',
      json: 'format-json',
    };

    return icons[format] || 'help';
  };

  const FieldFormatContent = (props: { field: TableField }) => {
    const field = props.field;
    const ft = store.getTable(field.relationTableIdentifier!);
    const tooltip = ft
      ? ft?.namePlural || ft?.name || 'Desconocida'
      : getFieldFormat(field);

    return (
      <div class="text-gray-600">
        <WithTooltip tooltip={tooltip}>
          <Icon name={getFieldIcon(field)} class="w-3.5 h-3.5" />
        </WithTooltip>
      </div>
    );
  };

  return (
    <div
      class="absolute"
      style={{
        left: `${props.table.posx || 0}px`,
        top: `${props.table.posy || 0}px`,
        'z-index': props.isDragging ? '1000' : '1',
      }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div
        class={`
          bg-white rounded-lg shadow-lg border-2 
          ${
            props.isDragging
              ? 'border-blue-500 shadow-2xl'
              : props.isCurrentSearchResult
              ? 'border-yellow-500 ring-6 ring-yellow-200'
              : props.isSearchResult
              ? 'border-yellow-500 ring-2 ring-yellow-200'
              : 'border-gray-300'
          }
          transition-all duration-200
          min-w-[240px] max-w-[320px]
        `}
      >
        {/* Header */}
        <div class="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-2 rounded-t-lg select-none">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 flex-1 min-w-0">
              <Icon name={props.table.icon || 'db-entity'} class="w-4 h-4 flex-shrink-0" stroke="white" />
              <div class="flex-1 min-w-0">
                <WithTooltip tooltip={props.table.description}>
                  <h3 class="font-semibold text-sm truncate">
                    {props.table.namePlural || props.table.name}
                  </h3>
                </WithTooltip>
                <p class="text-[10px] text-blue-100 truncate">
                  {props.table.identifier}
                </p>
              </div>
            </div>

            <div class="flex items-center gap-1 ml-2">
              <WithTooltip tooltip="Editar entidad">
                <button
                  class="p-1 hover:bg-blue-500 rounded transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    props.onEdit();
                  }}
                >
                  <Icon name="edit" class="w-3.5 h-3.5 text-white" stroke="white" />
                </button>
              </WithTooltip>
              <WithTooltip tooltip="Eliminar entidad">
                <button
                  class="p-1 hover:bg-red-500 rounded transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    props.onDelete();
                  }}
                >
                  <Icon name="del" class="w-3.5 h-3.5 text-white" stroke="white" />
                </button>
              </WithTooltip>
            </div>
          </div>
        </div>

        <div class="h-px bg-gray-200"></div>

        {/* Fields */}
        <div class="divide-y divide-gray-100">
          <For each={props.fields}>
            {(field) => {
              const relationTable = store.getTable(field.relationTableIdentifier!);

              return (
                <div
                  class="px-2 py-1 hover:bg-gray-50 transition-colors group relative cursor-pointer"
                  onDblClick={(e) => {
                    e.stopPropagation();
                    props.onEditField(field);
                  }}
                >
                  <div class="flex items-start gap-1.5">
                    <FieldFormatContent field={field} />

                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-1 flex-wrap">
                        <WithTooltip tooltip={field.description}>
                          <span class="font-medium text-sm text-gray-900 truncate">
                            {field.name}
                          </span>
                        </WithTooltip>

                        <Show when={field.isRequired}>
                          <WithTooltip tooltip="Campo obligatorio">
                            <span class="ml-0.5 text-sm font-medium text-red-700 rounded">
                              *
                            </span>
                          </WithTooltip>
                        </Show>

                        <Show when={field.multiple}>
                          <WithTooltip tooltip="Múltiples valores">
                            <span>[ ]</span>
                          </WithTooltip>
                        </Show>

                        <div class="flex items-center gap-1">
                          <Show when={field.isUnique}>
                            <WithTooltip tooltip="Valor único e indexado">
                              <Icon name="unique" class="w-3.5 h-3.5 text-green-600" />
                            </WithTooltip>
                          </Show>

                          <Show when={field.isFilter && !field.isUnique}>
                            <WithTooltip tooltip="Indexado">
                              <Icon name="indexed" class="w-3.5 h-3.5 text-green-600" />
                            </WithTooltip>
                          </Show>

                          <Show when={field.isSearchable}>
                            <WithTooltip tooltip="Busqueda rápida">
                              <Icon name="search" class="w-3.5 h-3.5 text-green-600" />
                            </WithTooltip>
                          </Show>

                          <Show when={relationTable}>
                            <WithTooltip
                              tooltip={`Ir a ${
                                relationTable?.namePlural ||
                                relationTable?.name ||
                                field.relationTableIdentifier
                              }`}
                            >
                              <Button
                                variant="ghost"
                                size="xs"
                                class="py-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  props.onNavigateToRelation?.(
                                    field.relationTableIdentifier!
                                  );
                                }}
                              >
                                →
                              </Button>
                            </WithTooltip>
                          </Show>
                        </div>
                      </div>
                    </div>

                    {/* Field actions */}
                    <div class="field-actions flex items-center hidden group-hover:block absolute right-[-64px] shadow-md top-1 bg-white/80 backdrop-blur-sm rounded-md px-1">
                      <WithTooltip tooltip="Editar campo">
                        <Button
                          variant="ghost"
                          size="xs"
                          class="py-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            props.onEditField(field);
                          }}
                        >
                          <Icon size="12" name="edit" />
                        </Button>
                      </WithTooltip>

                      <WithTooltip tooltip="Eliminar campo">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            props.onDeleteField(field.id);
                          }}
                        >
                          <Icon size="12" name="close" stroke="#880000" />
                        </Button>
                      </WithTooltip>
                    </div>
                  </div>
                </div>
              );
            }}
          </For>
        </div>

        <Show when={showActions()}>
          <div class="border-t border-gray-200 px-3 py-1.5 transition-opacity duration-200 opacity-100">
            <button
              class="w-full text-left px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors flex items-center gap-1 font-medium"
              onClick={props.onAddField}
            >
              <Icon name="add" class="w-3.5 h-3.5" />
              Agregar campo
            </button>
          </div>
        </Show>

        <div class="bg-gray-50 px-3 py-1 rounded-b-lg border-t border-gray-200">
          <p class="text-[10px] text-gray-500 text-center">
            {props.fields.length} {props.fields.length === 1 ? 'campo' : 'campos'}
          </p>
        </div>
      </div>
    </div>
  );
}
