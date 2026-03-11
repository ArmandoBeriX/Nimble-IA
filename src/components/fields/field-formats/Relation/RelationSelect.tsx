// RelationSelect.tsx
import { createOptions, Select, fuzzyHighlight, fuzzySort } from "@thisbeyond/solid-select";
import { For, Show, createMemo } from "solid-js";
import Button from "../../../ui/Button";
import { renderLabelFromTemplate, renderLabelToString } from "../../../utils/FormatInterpreter";
import Icon from "../../../ui/icon/Icon";

export interface BaseRelationSelectProps {
  // Configuración básica
  multiple?: boolean;
  placeholder?: string;
  emptyPlaceholder?: string;
  disabled?: boolean;
  required?: boolean;

  // Valores y opciones
  value: any;
  onChange: (value: any) => void;
  options: Array<any>;

  // Configuración de formato
  formatSelection?: string;
  formatSelected?: string;
  formatSelectedMultiple?: string;
  icon?: string;

  // Funciones personalizadas
  filterable?: (inputValue: string) => any[];
  createable?: (inputValue: string, exists: boolean) => any;
  extractText?: (value: any) => string;
  disable?: (value: any) => boolean;

  // UI
  showClearButton?: boolean;
  quickPickOptions?: Array<any>;
  onQuickPickClick?: (option: any) => void;

  // Estado visual
  hasError?: boolean;
  modified?: boolean;
  class?: string;

  // Referencias
  ref?: (el: HTMLInputElement) => void;
}

export default function RelationSelect(props: BaseRelationSelectProps) {
  // Función para formatear opciones - mejorada
  const format = (value: any, type: string, meta: any) => {
    let icon = value?.hasIcon && props.icon ? <Icon name={props.icon} size={16} /> : <></>;
    const rec = value?.value ?? value ?? {};
    
    const templateToUse = type === 'label' 
      ? (value?.template || props.formatSelection) 
      : props.formatSelected;

    let rendered: any;
    
    if (templateToUse) {
      if (templateToUse.includes('|icon'))
        icon = null
      rendered = renderLabelFromTemplate(templateToUse, rec, icon);
    } else {
      rendered = value?.text ?? "—";
    }

    // Si hay highlighting (de fuzzySort), aplicarlo al texto
    if (meta.highlight && typeof rendered === "string") {
      return (
        <>
          {icon}
          <span>{meta.highlight}</span>
        </>
      );
    }

    return (
      <>
        {icon}
        {typeof rendered === "string" ? rendered : rendered}
      </>
    );
  };

  // Función de filtro por defecto - simplificada
  const defaultFilterable = (inputValue: string) => {
    try {
      // Usar fuzzySort directamente sobre options (que ya tienen text como string)
      return fuzzySort(inputValue, props.options, "text").map((result) => ({
        ...result.item,
        label: format(result.item, "label", {
          highlight: fuzzyHighlight(result, (match: string) => <b>{match}</b>),
        }),
      }));
    } catch (e) {
      // Fallback simple
      return props.options
        .filter(opt => 
          opt.text?.toLowerCase().includes(inputValue.toLowerCase()) ||
          opt.label?.toLowerCase().includes(inputValue.toLowerCase())
        )
        .map(o => ({ 
          ...o, 
          label: o.text || o.label 
        }));
    }
  };

  // Opciones para el select - con mejor manejo de errores
  const propsOptions = createOptions(() => props.options, {
    format,
    filterable: props.filterable || defaultFilterable,
    createable: props.createable,
    extractText: props.extractText || ((value: any) => {
      if (!value) return "";
      // Usar renderLabelToString para obtener texto plano
      const rec = value.value ?? value;
      if (props.formatSelection) {
        return renderLabelToString(props.formatSelection, rec);
      }
      return value.text || value.label || "";
    }),
    disable: props.disable,
  });

  // Determinar si hay valor seleccionado
  const hasValue = createMemo(() => {
    if (props.multiple) {
      return Array.isArray(props.value) && props.value.length > 0;
    }
    return !!props.value;
  });

  // Manejar limpieza
  const handleClear = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (props.multiple) {
      props.onChange([]);
    } else {
      props.onChange(null);
    }
  };

  // Calcular clases
  const inputClass = createMemo(() => {
    const base = 'form-input w-full';
    const modified = props.modified ? 'modified' : '';
    const error = props.hasError ? 'error' : '';
    const custom = props.class || '';

    return [base, modified, error, custom].filter(Boolean).join(' ');
  });

  return (
    <div style="width: 100%; position: relative;">
      <div class="solid-select">
        <Select
          ref={props.ref}
          class={inputClass()}
          multiple={props.multiple}
          initialValue={props.value}
          onChange={props.onChange}
          emptyPlaceholder={props.emptyPlaceholder || "No hay resultados"}
          placeholder={props.placeholder || ''}
          disabled={props.disabled}
          {...propsOptions}
          
        />
        <Show when={props.showClearButton !== false && hasValue()}>
          <button
            type="button"
            title={props.multiple ? 'Limpiar valores' : 'Limpiar valor'}
            onClick={handleClear}
            class="clear-button absolute inset-y-0 right-2 flex items-center text-xs text-gray-400 transition-colors hover:text-red-500"
            style="z-index: 10;"
          >
            ✕
          </button>
        </Show>
      </div>

      <Show when={props.quickPickOptions && props.quickPickOptions.length > 0}>
        <div class="flex text-sm items-center mt-2 gap-1">
          <span class="text-gray-500 text-xs">Quick pick:</span>
          <For each={props.quickPickOptions}>
            {(option) => (
              <Button
                size='xs'
                variant="secondary"
                onClick={() => props.onQuickPickClick?.(option)}
                class="px-2 py-1"
              >
                {option.text}
              </Button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};