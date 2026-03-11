import { createSignal, For, Show, createEffect, onCleanup } from 'solid-js';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/ui/icon/Icon';
import WithTooltip from '../../../components/ui/tooltip/WithTooltip';
import { FieldFormat, FieldFormatLabels, TableDef, TableField } from '../../../types/schema';
import { store } from '../../../app';
import RecordButtonAction from '../../../components/record/RecordButtonAction';

export const TABLE_DEFAULT_COLOR = '#6B7280'; // Gray-500

interface EntityNodeProps {
  table: TableDef;
  fields: TableField[];
  onChange: () => void;
  onNavigateToRelation?: (tableId: string) => void;
  onFieldPositionsChange?: (positions: number[]) => void;
  isHighlighted?: boolean;
  isRelationHighlighted?: boolean;
  isDragging?: boolean;
  isSearchResult?: boolean;
  isCurrentSearchResult?: boolean;
}

export default function EntityNode(props: EntityNodeProps) {
  const [showActions, setShowActions] = createSignal(false);
  let fieldsContainerRef: HTMLDivElement | undefined;

  // Medir posición Y del centro de cada field relativo al top del contenedor de fields
  createEffect(() => {
    if (!fieldsContainerRef || !props.onFieldPositionsChange) return;

    const measure = () => {
      const containerRect = fieldsContainerRef!.getBoundingClientRect();
      const positions = Array.from(fieldsContainerRef!.children).map((child) => {
        const rect = child.getBoundingClientRect();
        return rect.top - containerRect.top + rect.height / 2;
      });
      props.onFieldPositionsChange!(positions);
    };

    const observer = new ResizeObserver(measure);
    observer.observe(fieldsContainerRef!);
    measure();
    onCleanup(() => observer.disconnect());
  });

  const getFieldFormat = (field: TableField) => {
    if (field.identifier === 'id') return 'Llave primaria';
    return FieldFormatLabels[field.fieldFormat];
  };

  const getFieldIcon = (field: TableField): string => {
    if (field.identifier === 'id') return 'key';
    if (field.fieldFormat === 'relation' || field.relationTableIdentifier)
      return store.getTable(field.relationTableIdentifier!)?.icon || 'db-entity';
    return field.fieldFormat || 'help';
  };

  const borderClass = () => {
    if (props.isHighlighted) return 'border-yellow-400 shadow-yellow-300 shadow-lg';
    if (props.isDragging) return 'border-blue-500 shadow-2xl';
    if (props.isRelationHighlighted) return 'border-blue-400 ring-2 ring-blue-200 shadow-blue-200 shadow-lg';
    if (props.isCurrentSearchResult) return 'border-yellow-500 ring-6 ring-yellow-200';
    if (props.isSearchResult) return 'border-yellow-500 ring-2 ring-yellow-200';
    return 'border-gray-300';
  };

  const FieldFormatContent = (fieldProps: { field: TableField }) => {
    const field = fieldProps.field;
    const ft = store.getTable(field.relationTableIdentifier!);
    const tooltip = ft
      ? (field.multiple ? ft?.namePlural || ft?.name : ft?.name) || 'Desconocida'
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
          ${borderClass()}
          transition-all duration-200
          min-w-[240px] max-w-[320px]
          opacity-80 hover:opacity-100
        `}
      >
        {/* Header */}
        <div class="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-2 rounded-t-lg select-none" style={{ background: `linear-gradient(90deg, ${props.table.color || TABLE_DEFAULT_COLOR} 0%, ${props.table.color || TABLE_DEFAULT_COLOR}80 100%)` }}>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 flex-1 min-w-0">
              <Icon name={props.table.icon || 'db-entity'} class="w-4 h-4 flex-shrink-0" stroke="white" />
              <div class="flex-1 min-w-0">
                <WithTooltip
                  tooltip={
                    <div class="flex flex-col gap-1">
                      <div class="font-semibold text-sm leading-tight">
                        {props.table.namePlural || props.table.name}
                      </div>

                      <div class="h-px w-full bg-current opacity-20"></div>

                      <div class="text-[10px] opacity-70 truncate font-mono">
                        {props.table.identifier}
                      </div>

                      <div class="text-xs opacity-80 leading-snug">
                        {props.table.description}
                      </div>
                    </div>
                  }
                >
                  <h3 class="font-semibold text-sm truncate">
                    {props.table.namePlural || props.table.name}
                  </h3>
                </WithTooltip>
              </div>
            </div>

            <div class="flex items-center gap-1 ml-2">
              <RecordButtonAction
                tableIdentifier="table_defs"
                action="update"
                id={props.table.id}
                modalProps={{ onConfirm: props.onChange }}
                buttonProps={{
                  variant: 'ghost',
                  size: 'xs',
                  class: 'text-white hover:text-black',
                  style: { padding: '2px' },
                }}
              />
              <RecordButtonAction
                tableIdentifier="table_defs"
                action="delete"
                id={props.table.id}
                modalProps={{ onConfirm: props.onChange }}
                buttonProps={{
                  variant: 'ghost',
                  size: 'xs',
                  class: 'text-red',
                  style: { padding: '2px' },
                }}
              />
            </div>
          </div>
        </div>

        <div class="h-px bg-gray-200" />

        {/* Fields */}
        <div ref={fieldsContainerRef} class="divide-y divide-gray-100">
          <For each={props.fields}>
            {(field) => {
              const relationTable = store.getTable(field.relationTableIdentifier!);

              return (
                <div
                  class="px-2 py-0.5 hover:bg-gray-50 transition-colors group relative cursor-pointer"
                  onDblClick={(e) => {
                    e.stopPropagation();
                    props.onChange();
                  }}
                >
                  <div class="flex items-start gap-1.5">
                    <FieldFormatContent field={field} />

                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-1 flex-wrap">
                        <WithTooltip tooltip={
                          <div class="flex flex-col gap-1">
                            <div class="font-semibold text-sm leading-tight">
                              {field.name}
                            </div>

                            <div class="h-px w-full bg-current opacity-20"></div>

                            <div class="text-[10px] opacity-70 truncate font-mono">
                              {field.identifier}
                            </div>

                            <div class="text-xs opacity-80 leading-snug">
                              {field.description}
                            </div>
                          </div>
                        }>
                          <span
                            class={
                              'text-sm text-gray-900 truncate' +
                              (field.fieldFormat === FieldFormat.RELATION ? ' font-medium' : ' font-normal')
                            }
                            style={field.fieldFormat === FieldFormat.RELATION ? { color: (relationTable?.color || TABLE_DEFAULT_COLOR), 'text-shadow': '0 0 1px var(--color-white)' } : {}}
                          >
                            {field.name}
                          </span>
                        </WithTooltip>

                        <Show when={field.isRequired}>
                          <WithTooltip tooltip="Campo obligatorio">
                            <span class="ml-0.5 text-sm font-medium text-red-700 rounded">*</span>
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
                            <WithTooltip tooltip="Búsqueda rápida">
                              <Icon name="search" class="w-3.5 h-3.5 text-green-600" />
                            </WithTooltip>
                          </Show>

                          <Show when={relationTable}>
                            <WithTooltip
                              tooltip={`Ir a ${relationTable?.namePlural ||
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
                                  props.onNavigateToRelation?.(field.relationTableIdentifier!);
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
                    <div class="field-actions z-50 flex items-center hidden group-hover:block absolute right-[-48px] shadow-md top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm rounded-md px-1">
                      <RecordButtonAction
                        tableIdentifier="table_fields"
                        action="update"
                        id={field.id}
                        modalProps={{ onConfirm: props.onChange }}
                        buttonProps={{ variant: 'ghost', size: 'xs', style: { padding: '2px' } }}
                      />
                      <RecordButtonAction
                        tableIdentifier="table_fields"
                        action="delete"
                        id={field.id}
                        modalProps={{ onConfirm: props.onChange }}
                        buttonProps={{ variant: 'ghost', size: 'xs', class: 'text-red', style: { padding: '2px' } }}
                      />
                    </div>
                  </div>
                </div>
              );
            }}
          </For>
        </div>

        <div class="group relative bg-gray-50 px-3 py-1 rounded-b-lg border-t border-gray-200">
          <p class="text-[10px] text-gray-500 text-center">
            {props.fields.length} {props.fields.length === 1 ? 'campo' : 'campos'}
          </p>

          {/* Field add */}
          <div class="field-actions z-50 flex items-center opacity-0 group-hover:opacity-100 transition-all duration-300 absolute right-[-32px] shadow-md top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm rounded-md px-1">
            <RecordButtonAction
              tableIdentifier="table_fields"
              action="create"
              modalProps={{ onConfirm: props.onChange }}
              buttonProps={{
                variant: 'ghost',
                size: 'xs',
                class: 'w-full justify-start hover:text-blue-600 hover:bg-transparent text-gray-500 px-1',
              }}
              initialValues={{ tableIdentifier: props.table.identifier }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
