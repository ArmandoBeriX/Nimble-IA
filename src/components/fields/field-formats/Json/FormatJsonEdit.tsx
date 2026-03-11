import { createSignal, createEffect, onCleanup, Show, createMemo, onMount } from "solid-js";
import { store } from "../../../../app";
import { FieldProps } from "../../FieldEdit";
import { createSimpleHash } from "../../../../lib/utils/utils";
import WithTooltip from "../../../ui/tooltip/WithTooltip";
import FilterSelectorButton from "../../../utils/FilterSelector";

export default function FormatJsonEdit(props: FieldProps) {
  const isFieldForm = props.isFieldForm ?? true;
  // Si no es editable y estamos en formulario, no renderizamos nada
  if (isFieldForm && !props.field.isEditable) return <></>;

  // --- Cache key (igual que en el original) ---
  const cacheKey = () =>
    'val_' +
    (props.record?.id ?? props.field.tableIdentifier ?? createSimpleHash(props.record)) +
    '_' + props.field.identifier;

  const getInitialValue = (): string => {
    const cached = store.watchSession(cacheKey())();
    if (cached !== undefined) return cached;
    const recordVal = props.record?.[props.field.identifier!];
    if (recordVal !== undefined && recordVal !== null) {
      // Si el valor en record es objeto, lo convertimos a string; si ya es string, lo dejamos.
      return typeof recordVal === 'string' ? recordVal : JSON.stringify(recordVal);
    }
    return props.field.default ?? '';
  };

  const initialValue = getInitialValue();

  // --- Estado ---
  const [value, setValue] = createSignal<string>(initialValue);
  const [isFocused, setIsFocused] = createSignal(false);
  const [errors, setErrors] = createSignal<string[]>([]);
  const [isModified, setIsModified] = createSignal(false);

  // Para el modo libre, podemos tener un flag de "formateado automático"
  const [autoFormat, setAutoFormat] = createSignal(false);

  // Referencia al elemento input/textarea (necesaria para el controlador)
  let inputEl!: HTMLTextAreaElement | HTMLInputElement;

  // Función para actualizar valor y caché
  const setValueAndCache = (val: string) => {
    setValue(val);
    store.setSession(cacheKey(), val, 250, 8 * 60 * 60 * 1000);
  };

  // --- Determinamos el tipo de editor ---
  // Si storeData.type === 'filter', usamos el botón selector; si no, editor JSON libre.
  const jsonFormat = createMemo(() => props.field.storeData?.jsonFormat || '');

  // Para el modo filter, necesitamos la tabla destino: prioridad a relationTableIdentifier
  const filterTableIdentifier = createMemo(() =>
    store.resolveTableIdentifier(props.field.relationTableIdentifier, props.record) || props.field.tableIdentifier!
  );

  // --- Información de campo para etiquetas (igual que antes) ---
  const fieldName = createMemo(() => `${props.field.tableIdentifier}.${props.field.identifier}`);
  const fieldId = createMemo(() => fieldName().replace(/\./g, '-'));

  // --- Clases CSS (similares a las originales) ---
  const inputClass = createMemo(() => {
    let cls = 'form-input';
    if (errors().length > 0) cls += ' error';
    if (isModified()) cls += ' modified';
    // Podríamos añadir una clase específica para json
    return cls + ' field-json';
  });

  // Longitud del texto (útil para el editor libre)
  const lengthInfo = createMemo(() => {
    if (!isFocused() || (jsonFormat() === 'filter')) return null;
    return `${value().length} caracteres`;
  });

  // --- Efectos reactivos ---
  createEffect(() => setIsModified(value() !== initialValue));

  // --- Validación ---
  const validateField = async (newValue?: string): Promise<boolean> => {
    const v = newValue ?? value();
    const errs: string[] = [];

    // Solo validamos en modo formulario
    if (isFieldForm) {
      // Requerido
      if (props.field.isRequired && v.length === 0) {
        errs.push('Este campo es requerido');
      }

      // Si es modo filter, la validación del filtro ya la hace internamente el botón,
      // pero podemos verificar que sea un JSON válido (por si acaso)
      if ((jsonFormat() === 'filter') && v) {
        try {
          JSON.parse(v);
        } catch {
          errs.push('El valor almacenado no es un JSON válido');
        }
      }

      // Si es modo libre, validamos JSON
      if (!(jsonFormat() === 'filter') && v) {
        try {
          JSON.parse(v);
        } catch {
          errs.push('JSON inválido');
        }
      }

      // Nota: No aplicamos validación de unicidad para JSON porque sería raro,
      // pero si el campo tiene isUnique, podríamos implementarlo. Por ahora lo omitimos.
    }

    setErrors(errs);
    return errs.length === 0;
  };

  // --- Event handlers para el modo libre ---
  const handleInput = (e: Event) => {
    const target = e.target as HTMLTextAreaElement;
    const newValue = target.value;
    setValueAndCache(newValue);
    props.onInput?.(newValue);
    // Pequeño debounce para onChange
    setTimeout(() => props.onChange?.(newValue), 250);
    void validateField(newValue);
  };

  const handleBlur = (e: FocusEvent) => {
    setIsFocused(false);
    props.onBlur?.(e);
    // Al perder el foco, podemos formatear el JSON si está activada la opción
    if (!(jsonFormat() === 'filter') && autoFormat()) {
      try {
        const parsed = JSON.parse(value());
        const formatted = JSON.stringify(parsed, null, 2);
        if (formatted !== value()) {
          setValueAndCache(formatted);
          if (inputEl) inputEl.value = formatted;
        }
      } catch {
        // No formateamos si no es válido
      }
    }
    void validateField();
  };

  const handleFocus = (e: FocusEvent) => {
    setIsFocused(true);
    props.onFocus?.(e);
  };

  // --- Controlador (igual que en el original) ---
  onMount(() => {
    // Asignar valor inicial al DOM
    if (inputEl) {
      inputEl.value = initialValue;
    }

    const ctrl = props.controller;
    if (!ctrl) return;
    ctrl.target = inputEl as any;
    ctrl.validate = () => validateField();
    ctrl.getValue = () => value();
    ctrl.reset = (val?: any) => {
      store.deleteSession(cacheKey());
      const v = val ?? getInitialValue();
      if (inputEl) inputEl.value = v;
      setValueAndCache(v);
      setErrors([]);
      setIsModified(false);
    };
  });

  onCleanup(() => {
    if (props.controller) {
      delete props.controller.validate;
      delete props.controller.getValue;
      delete props.controller.reset;
    }
  });

  // --- Renderizado del input según el modo ---
  const renderInput = () => {
    if ((jsonFormat() === 'filter')) {
      // Modo filtro: usamos un input oculto para mantener el valor y el botón selector
      return (
        <>
          <input
            type="hidden"
            ref={(el) => { inputEl = el; }}
            id={fieldId()}
            name={fieldName()}
            value={value()}
          />
          <FilterSelectorButton
            tableIdentifier={filterTableIdentifier()}
            filters={() => {
              try {
                return JSON.parse(value() || '{}');
              } catch {
                return {};
              }
            }}
            setFilters={(v) => {
              const str = JSON.stringify(v);
              // Actualizamos el input oculto, el signal y la caché
              if (inputEl) inputEl.value = str;
              setValueAndCache(str);
              props.onChange?.(str);
              void validateField(str);
            }}
            buttonProps={{
              variant: 'outline',
              size: 'sm',
              text: 'Editar filtros',
              showBadge: true,
            }}
          />
        </>
      );
    } else {
      // Modo libre: textarea con altura ajustable
      return (
        <textarea
          ref={(el) => { inputEl = el; }}
          id={fieldId()}
          name={fieldName()}
          class={`${inputClass()} json-textarea`}
          placeholder="Ingresa JSON válido"
          onInput={handleInput}
          onBlur={handleBlur}
          onFocus={handleFocus}
          rows={5} // puedes hacerlo ajustable o por defecto
        />
      );
    }
  };

  // --- JSX final (estructura similar al original) ---
  if (isFieldForm) {
    return (
      <div class="form-group">
        <WithTooltip tooltip={props.field.description}>
          <label for={fieldId()} class="field-label">
            {props.field.name}
            {props.field.isRequired && <span class="required-asterisk"> *</span>}
            <Show when={lengthInfo()}>
              <span class="length-info"> ({lengthInfo()})</span>
            </Show>
          </label>
        </WithTooltip>

        <div class="input-container">
          {renderInput()}
          {!(jsonFormat() === 'filter') && (
            <label class="auto-format-checkbox">
              <input
                type="checkbox"
                checked={autoFormat()}
                onChange={(e) => setAutoFormat(e.currentTarget.checked)}
              />
              Formatear al salir
            </label>
          )}
        </div>

        <Show when={errors().length > 0}>
          <div class="field-error">{errors().join('. ')}</div>
        </Show>
      </div>
    );
  }

  // Versión compacta (sin label, para usar dentro de tablas, etc.)
  return (
    <div title={errors().length > 0 ? errors().join('. ') : undefined} style="width:100%">
      <div class="input-container">
        {renderInput()}
      </div>
    </div>
  );
}