// FormatBool.tsx
import { createSignal, createEffect, onCleanup, createMemo, onMount } from "solid-js";
import { FieldProps } from "../../FieldEdit";
import { store } from "../../../../app";
import { error } from "console";
import { createSimpleHash } from "../../../../lib/utils/utils";
import WithTooltip from "../../../ui/tooltip/WithTooltip";

/**
 * FormatBool
 * - usa .form-group.field-bool para estilos específicos (no rompe tu CSS global)
 * - mantiene .input-container .modified para que tu CSS :has(.modified) funcione
 * - label (for=) a la izquierda, switch a la derecha
 * - Enter/Space funcionan cuando el input tiene foco por tab
 */

export function FormatBoolEdit(props: FieldProps) {
  const field = props.field;
  const isFieldForm = props.isFieldForm ?? true

  if (isFieldForm && !field.isEditable)
    return <></>;

  const switchId = `${field.tableIdentifier}-${field.identifier}-switch`;

  // initialValue monitoreando props para que cambie cuando props.record cambie
  const getInitialValue = (): 0 | 1 => {
    const sessionValue = store.watchSession('val_' + (props.record?.id ?? props.field.tableIdentifier ?? createSimpleHash(props.record)) + '_' + props.field.identifier)()
    const raw = sessionValue ?? props.record?.[field.identifier!] ?? field.default;
    const parse = () => {
      if (raw === null || typeof raw === "undefined" || raw === "") return false;
      if (typeof raw === "boolean") return raw;
      if (typeof raw === "number") return raw > 0;
      if (typeof raw === "string") {
        const lc = raw.trim().toLowerCase();
        if (lc === "true" || lc === "1" || lc === "on") return true;
      }
      return false;
    }
    return parse() ? 1 : 0
  };

  const initialValue = getInitialValue()

  const [checked, setChecked] = createSignal<0 | 1>(initialValue);
  const setCheckedAndCache = (val: 0 | 1) => {
    setChecked(val);
    store.setSession('val_' + (props.record?.id ?? props.field.tableIdentifier ?? createSimpleHash(props.record)) + '_' + props.field.identifier, val, 250, 8 * 60 * 60 * 1000) // El submit tambien lo limpia
  }
  const [errors, setErrors] = createSignal<string[]>([]);
  const isDisabled = createMemo(() => !!field.storeData?.disabled);
  const isRequired = createMemo(() => !!field.isRequired);

  // referencia al input DOM (para indeterminate)
  let inputEl: HTMLInputElement | undefined;

  // sincronizar DOM checked/indeterminate según signal
  createEffect(() => {
    if (!inputEl) return;
    const val = checked();
    inputEl.indeterminate = val === null;
    inputEl.checked = val === 1;
    inputEl.setAttribute("aria-checked", val === null ? "mixed" : (val ? "true" : "false"));
  });

  // calcular modified comparando con initialValue
  const isModified = createMemo(() => checked() !== initialValue);

  // emitir cambio al padre
  const emitChange = (v: 0 | 1) => {
    setCheckedAndCache(v);
    props.onInput?.(v);
    props.onChange?.(v);
    validate();
  };

  // manejador nativo: click/space ya tocan el checkbox; usamos onInput para sincronizar
  const onInputChange = (e: Event) => {
    if (isDisabled()) return;
    const el = e.currentTarget as HTMLInputElement;
    // si estaba indeterminate, click deja un boolean; el valor es el booleano actual de checked
    const next = el.checked ? 1 : 0;
    emitChange(next);
  };

  // Queremos que Enter también togglee cuando el input está enfocado por tab.
  const onKeyDown = (e: KeyboardEvent) => {
    if (isDisabled()) return;
    if (e.key === "Enter") {
      e.preventDefault();
      const cur = checked();
      const next = (cur === null ? true : !cur) ? 1 : 0;
      emitChange(next);
      // sincronizamos DOM
      if (inputEl) {
        inputEl.checked = next === 1;
        inputEl.indeterminate = next === null;
      }
    }
    // Space se deja al comportamiento nativo (no interferimos)
  };

  // validación simple: required -> no puede ser null
  const validate = async (): Promise<boolean> => {
    const errs: string[] = [];
    if (isFieldForm && isRequired() && !checked()) errs.push("Es requerido");
    setErrors(errs);
    return errs.length === 0;
  };

  // controller binding
  onMount(() => {
    const ctrl = props.controller;
    if (!ctrl) return;
    ctrl.target = inputEl;
    ctrl.validate = validate;
    ctrl.getValue = () => checked()
    ctrl.reset = (val?: any) => {
      store.deleteSession('val_' + (props.record?.id ?? props.field.tableIdentifier ?? createSimpleHash(props.record)) + '_' + props.field.identifier)
      const init = val ?? getInitialValue();
      setCheckedAndCache(init);
      setErrors([]);
    };
  });

  onCleanup(() => {
    if (props.controller) {
      delete props.controller.validate;
      delete props.controller.getValue;
      delete props.controller.reset;
    }
  });

  const BoolContent = () =>
    <div class={`input-container ${isModified() ? "modified" : ""} ${errors().length > 0 ? 'error' : ''}`}>
      <label class={`switch ${isDisabled() ? "disabled" : ""}`} style={{ margin: 0, display: "flex" }}>
        <input
          id={switchId}
          ref={(el) => { inputEl = el as HTMLInputElement; }}
          type="checkbox"
          role="switch"
          aria-checked={checked() === null ? "mixed" : (checked() ? "true" : "false")}
          disabled={isDisabled()}
          onInput={onInputChange}
          onKeyDown={(e) => onKeyDown(e as KeyboardEvent)}
          class="switch-input"
        />
        <span class="switch-track" aria-hidden="true">
          <span class="switch-knob" />
        </span>
      </label>
    </div>

  if (isFieldForm) {
    return (
      <div class="form-group field-bool">
        {/* label a la izquierda (hace focus/toggle por for=) */}
        <WithTooltip tooltip={props.field.description}>
          <label for={switchId} class="field-label">
            {props.field.name}
            {props.field.isRequired && <span class="required-asterisk"> *</span>}
          </label>
        </WithTooltip>

        {errors().length > 0 && (
          <div class="field-error">
            {errors().join(". ")}
          </div>
        )}

        {/* input-container recoge la clase .modified para que tu CSS :has(.modified) lo detecte */}
        <BoolContent />
      </div>
    );
  } else {
    return <div class="field-bool" title={errors().length > 0 ? errors().join(". ") : undefined}>
      <BoolContent />
    </div>
  }

}

export default FormatBoolEdit;
