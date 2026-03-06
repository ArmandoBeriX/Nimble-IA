// src/components/fields/field-formats/List/FormatListEdit.tsx
import {
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  For,
  Show,
} from "solid-js";
import {
  createOptions,
  fuzzySort,
  Select,
  fuzzyHighlight,
} from "@thisbeyond/solid-select";
import type { FieldProps } from "../../FieldEdit";
import { store } from "../../../../app";
import Button from "../../../ui/Button";
import Icon from "../../../ui/icon/Icon";
import { createSimpleHash } from "../../../../lib/utils/utils";

/* ----------------------------- Tipos ----------------------------- */

export type SelectValue = {
  id: number | string;
  label: string;
  position: number;
  icon?: string; // 👈 nuevo campo opcional
};

/* ------------------------- FormatListEdit ------------------------ */

const FormatListEdit = (props: FieldProps) => {
  const field = props.field;
  const record = props.record;
  const isFieldForm = props.isFieldForm ?? true;

  if (isFieldForm && field.isEditable === false) {
    return <></>;
  }

  // Crear valores
  const createValue = (
    label: string,
    position: number,
    id?: number | string,
    icon?: string
  ): SelectValue => {
    id = id ?? (field.storeData?.currentId ?? 0) + 1;
    return { id, label, position, icon };
  };

  // Cargar candidatos desde posibleValues — extrae icon si existe
  const loadCandidates = (): SelectValue[] => {
    const candidates: SelectValue[] = [];
    const posibleValues = field.storeData?.posibleValues ?? {};

    if (Array.isArray(posibleValues)) {
      posibleValues.forEach((v: any, index: number) => {
        if (typeof v === "object" && v !== null) {
          candidates.push(createValue(String(v.label ?? v), index, index, v.icon));
        } else {
          candidates.push(createValue(String(v), index, index));
        }
      });
    } else {
      Object.keys(posibleValues).forEach((k: string, index: number) => {
        const p = (posibleValues as any)[k];
        if (typeof p === "object" && p !== null) {
          const label = String(p.label ?? p);
          const position = p.position ?? index;
          candidates.push(createValue(label, position, k, p.icon));
        } else {
          candidates.push(createValue(String(p), index, k));
        }
      });
    }

    return candidates.sort((a, b) => a.position - b.position);
  };

  // Tipos para resultados
  type ListResult = string | number | (number | string)[] | null;

  // Estado
  const [options, setOptions] = createSignal<SelectValue[]>(loadCandidates());
  const [selectedValues, setSelectedValues] = createSignal<SelectValue | SelectValue[] | null>(
    field.multiple ? [] : null
  );
  const [errors, setErrors] = createSignal<string[]>([]);
  const [modified, setModified] = createSignal(false);
  let isReady = false;

  // Helper para convertir IDs a objetos
  const idsToObjects = (ids: ListResult): SelectValue | SelectValue[] | null => {
    if (ids === null || ids === undefined) {
      return field.multiple ? [] : null;
    }
    const idsArray = Array.isArray(ids) ? ids : [ids];
    const found = options().filter((opt) =>
      idsArray.map((id) => String(id)).includes(String(opt.id))
    );
    return field.multiple ? found : found[0] || null;
  };

  // Helper para convertir objetos a IDs
  const objectsToIds = (objects: SelectValue | SelectValue[] | null): ListResult => {
    if (!objects) return null;
    const arr = Array.isArray(objects) ? objects : [objects];
    return field.multiple ? arr.map((o) => o.id) : arr[0]?.id || null;
  };

  // Obtener valor inicial
  const getInitialValue = () => {
    const sessionValue = store.watchSession(
      `val_${props.record?.id ?? createSimpleHash(props.record) ?? props.field.tableIdentifier}_${props.field.identifier}`
    )();
    const rawValue = sessionValue ?? record?.[field.identifier!] ?? field.default;
    return idsToObjects(rawValue as ListResult);
  };

  // Inicializar valores
  const initialValue = getInitialValue();
  if (initialValue !== selectedValues()) {
    setSelectedValues(initialValue);
  }

  // Manejar cambios
  const handleChange = (selectedObjects: SelectValue | SelectValue[] | null) => {
    if (!isReady) {
      isReady = true;
      return;
    }

    const processedValue = field.multiple
      ? Array.isArray(selectedObjects)
        ? selectedObjects
        : []
      : selectedObjects;

    setSelectedValues(processedValue);

    const idsToStore = objectsToIds(processedValue);
    store.setSession(
      `val_${props.record?.id ?? createSimpleHash(props.record) ?? props.field.tableIdentifier}_${props.field.identifier}`,
      idsToStore,
      250,
      8 * 60 * 60 * 1000
    );

    const initialIds = objectsToIds(getInitialValue());
    setModified(JSON.stringify(initialIds) !== JSON.stringify(idsToStore));

    if (isFieldForm && field.isRequired) {
      if (Array.isArray(processedValue)) {
        setErrors(processedValue.length === 0 ? ["Es requerido"] : []);
      } else {
        setErrors(!processedValue ? ["Es requerido"] : []);
      }
    } else {
      setErrors([]);
    }

    if (field.storeData?.createable) {
      const values = Array.isArray(processedValue) ? processedValue : [processedValue];
      values.forEach((val) => {
        if (val && !options().some((o) => String(o.id) === String(val.id))) {
          setOptions((prev) =>
            [...prev, val].sort((a, b) => a.position - b.position)
          );
          store.addFieldPosibleValueOption(field, val.label).then((updatedField) => {
            props.field = updatedField;
          });
        }
      });
    }

    props.onChange?.(idsToStore);
  };

  // Función createable
  const handleCreateable = (inputValue: string, exists: boolean): SelectValue | undefined => {
    if (!isFieldForm || exists || !field.storeData?.createable) return;
    return createValue(inputValue, options().length);
  };

  // Quick pick options
  const quickPickOptions = createMemo(() => {
    const current = selectedValues();
    if (field.multiple) {
      const currentArray = (current as SelectValue[]) ?? [];
      return options()
        .filter((opt) => !currentArray.some((v) => String(v.id) === String(opt.id)))
        .slice(0, 3);
    } else {
      const currentId = (current as SelectValue)?.id;
      return options()
        .filter((opt) => String(opt.id) !== String(currentId))
        .slice(0, 3);
    }
  });

  const handleQuickPickClick = (option: SelectValue) => {
    const current = selectedValues();
    if (field.multiple) {
      const currentArray = (current as SelectValue[]) ?? [];
      handleChange([...currentArray, option]);
    } else {
      handleChange(option);
    }
  };

  // Validación
  const validate = async (): Promise<boolean> => {
    if (!isReady) {
      isReady = true;
      return true;
    }
    const sel = selectedValues();
    const errs: string[] = [];
    if (field.isRequired) {
      if (field.multiple) {
        const arr = sel as SelectValue[];
        if (!Array.isArray(arr) || arr.length === 0) errs.push("Es requerido");
      } else {
        if (!sel) errs.push("Es requerido");
      }
    }
    setErrors(errs);
    return errs.length === 0;
  };

  // Inicialización del controlador
  let inputEl: HTMLInputElement | undefined;

  onMount(() => {
    const ctrl = props.controller;
    if (!ctrl) return;
    ctrl.target = inputEl;
    ctrl.validate = validate;
    ctrl.getValue = () => objectsToIds(selectedValues());
    ctrl.reset = () => {
      store.deleteSession(
        `val_${props.record?.id ?? createSimpleHash(props.record) ?? props.field.tableIdentifier}_${props.field.identifier}`
      );
      setSelectedValues(getInitialValue());
      setErrors([]);
      setModified(false);
    };
  });

  onCleanup(() => {
    if (props.controller) {
      delete props.controller.validate;
      delete props.controller.getValue;
      delete props.controller.reset;
    }
  });

  const fieldName = createMemo(() => `${props.field.tableIdentifier}.${props.field.identifier}`);
  const fieldId = createMemo(() => fieldName().replace(/\./g, "-"));

  // Renderizado de cada opción — muestra icono si existe
  const format = (value: SelectValue, type: string, meta: any) => (
    <div class="flex items-center gap-1.5">
      <Show when={value.icon}>
        <Icon name={value.icon!} size={14} class="flex-shrink-0 text-gray-500" />
      </Show>
      <span>{meta.highlight ?? value.label}</span>
    </div>
  );

  // Configuración de opciones
  const selectProps = createOptions(options(), {
    format,
    filterable: true,
    createable: handleCreateable,
    extractText: (value: any) => value.label || String(value.id || ""),
    disable: (value) => {
      const current = selectedValues();
      if (Array.isArray(current)) {
        return current?.some((v) => String(v.id) === String(value.id)) || false;
      } else {
        return String(current?.id) === String(value.id);
      }
    },
  });

  const hasValue = () => {
    const current = selectedValues();
    if (field.multiple) {
      return Array.isArray(current) && current.length > 0;
    }
    return !!current;
  };

  const handleClear = (e: MouseEvent) => {
    e.stopPropagation();
    handleChange(field.multiple ? [] : null);
  };

  const inputClass = () => {
    const baseClass = "form-input w-full";
    const modifiedClass = modified() ? "modified" : "";
    const errorClass = errors().length > 0 ? "error" : "";
    return [baseClass, modifiedClass, errorClass].filter(Boolean).join(" ");
  };

  const emptyPlaceholder = () =>
    field.storeData?.createable ? `Crear ${""}` : "No hay resultados";

  const ListSelectContent = () => (
    <div class="w-full">
      <div class="solid-select relative">
        <Select
          ref={(el) => (inputEl = el)}
          multiple={field.multiple}
          initialValue={selectedValues()}
          class={inputClass()}
          onChange={handleChange}
          placeholder={field.storeData?.placeholder || ""}
          emptyPlaceholder={emptyPlaceholder()}
          {...selectProps}
          isOptionDisabled={props.isOptionDisabled}
        />

        <Show when={hasValue()}>
          <button
            type="button"
            title={field.multiple ? "Limpiar valores" : "Limpiar valor"}
            onClick={handleClear}
            class="clear-button absolute inset-y-0 right-2 flex items-center text-xs text-gray-400 transition-colors hover:text-red-500"
          >
            ✕
          </button>
        </Show>
      </div>

      <Show when={field.storeData?.quickPick ? quickPickOptions() : undefined}>
        <div class="flex text-sm items-center mt-2 gap-2">
          <i style="color: #888">Quick pick:</i>
          <For each={quickPickOptions()}>
            {(option) => (
              <Button
                size="xs"
                variant="secondary"
                onClick={() => handleQuickPickClick(option)}
                class="inline-flex items-center gap-1"
              >
                <Show when={option.icon}>
                  <Icon name={option.icon!} size={12} />
                </Show>
                {option.label}
              </Button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );

  if (isFieldForm) {
    return (
      <div class="form-group relative">
        <label for={fieldId()} class="field-label" title={props.field.description}>
          {props.field.name}
          {props.field.isRequired && <span class="required-asterisk"> *</span>}
        </label>
        <ListSelectContent />
        {errors().length > 0 && (
          <div data-invalid class="field-error">
            {errors().join(". ")}
          </div>
        )}
        <div class="input-container"></div>
      </div>
    );
  }

  return (
    <div
      title={errors().length > 0 ? errors().join(". ") : undefined}
      style={{ width: "100%" }}
    >
      <ListSelectContent />
    </div>
  );
};

export default FormatListEdit;