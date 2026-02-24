// FormatText.tsx
import { createSignal, createEffect, onCleanup, Show, createMemo, onMount } from "solid-js";
import { FieldProps } from "../../FieldEdit";
import { store } from "../../../../app";

/**
 * FormatText - textarea control
 *
 * Reglas:
 * - inicializa desde props.record[field.identifier] o field.default
 * - usa field.storeData.min / .max para longitud mínima/máxima
 * - usa field.storeData.regexp / regexpError para validar formato (opcional)
 * - muestra longitud cuando está enfocado (length-info)
 * - controller.validate/getValue/reset
 */

export function FormatTextEdit(props: FieldProps) {
  const isFieldForm = props.isFieldForm ?? true
  if (isFieldForm && props.field.isEditable === false) {
    return <></>;
  }

  const initialRawValue = createMemo(() => {
    const sessionValue = store.watchSession('val_' + (props.record?.id ?? props.field.tableIdentifier) + '_' + props.field.identifier)()
    const v = sessionValue ?? props.record?.[props.field.identifier!] ?? props.field.default ?? "";
    return v === null || typeof v === "undefined" ? "" : String(v);
  });

  const [value, setValue] = createSignal<string>(initialRawValue());
  const setValueAndCache = (val: string) => {
    setValue(val);
    store.setSession('val_' + (props.record?.id ?? props.field.tableIdentifier) + '_' + props.field.identifier, val, 250, 8 * 60 * 60 * 1000) // El submit tambien lo limpia
  }
  const [isFocused, setIsFocused] = createSignal(false);
  const [errors, setErrors] = createSignal<string[]>([]);
  const [isModified, setIsModified] = createSignal(false);

  // rows por storeData (opcional)
  const rows = createMemo(() => {
    const r = props.field.storeData?.rows || 3;
    const n = typeof r === "number" ? r : (r ? Number(r) : NaN);
    return Number.isFinite(n) && n > 0 ? Math.max(1, Math.floor(n)) : 4;
  });

  // helpers min/max length
  const minLen = createMemo(() => {
    const m = props.field.storeData?.min;
    if (m === undefined || m === null) return NaN;
    const n = Number(m);
    return Number.isNaN(n) ? NaN : n;
  });
  const maxLen = createMemo(() => {
    const m = props.field.storeData?.max;
    if (m === undefined || m === null) return NaN;
    const n = Number(m);
    return Number.isNaN(n) ? NaN : n;
  });

  // pattern/regexp from storeData (optional)
  const pattern = createMemo(() => props.field.storeData?.regexp);
  const patternError = createMemo(() => props.field.storeData?.regexpError ?? "Formato inválido");

  // live modified flag: compara con initialRawValue()
  createEffect(() => {
    setIsModified(value() !== initialRawValue());
  });

  // length info (cuando enfocado)
  const lengthInfo = createMemo(() => {
    if (!isFocused()) return null;
    const min = minLen();
    const max = maxLen();
    const cur = value().length;
    if (Number.isNaN(min) && Number.isNaN(max)) return null;
    let s = `${cur}`;
    if (!Number.isNaN(max)) s += `/${max}`;
    return s;
  });

  // validaciones
  const validateLength = (v: string) => {
    const min = minLen();
    const max = maxLen();
    if (!Number.isNaN(min) && v.length < min) return `Mínimo ${min} caracteres requeridos`;
    if (!Number.isNaN(max) && v.length > max) return `Máximo ${max} caracteres permitidos`;
    return null;
  };

  const validateRegex = (v: string) => {
    const rx = pattern();
    if (!rx) return true;
    try {
      const regex = new RegExp(rx);
      return regex.test(v);
    } catch (err) {
      // patrón inválido -> no bloquear validación
      // eslint-disable-next-line no-console
      console.error("Regex inválido en field.storeData.regexp:", err);
      return true;
    }
  };

  // validateField público
  const validateField = async (newValue?: string): Promise<boolean> => {
    const current = typeof newValue !== "undefined" ? newValue : value();
    const newErrors: string[] = [];

    // requerido
    if (props.field.isRequired && (!current || current.length === 0)) {
      newErrors.push("Es requerido");
    }

    if (isFieldForm) {
      // length
      const lErr = validateLength(current);
      if (lErr) newErrors.push(lErr);

      // regex
      if (!validateRegex(current)) {
        newErrors.push(patternError());
      }
    }

    setErrors(newErrors);
    setIsModified(current !== initialRawValue());
    return newErrors.length === 0;
  };

  let onChangeTimeout: NodeJS.Timeout | null = null;
  // handlers
  const handleInput = (e: InputEvent) => {
    const v = (e.target as HTMLTextAreaElement).value;
    setValueAndCache(v);
    props.onInput?.(v);
    if (onChangeTimeout) 
      clearTimeout(onChangeTimeout)
    onChangeTimeout = setTimeout(() => {
      props.onChange?.(v)
    }, [""," "].includes(e.data || "") ? 50 : 1000)
    // validación en vivo (no async)
    void validateField(v);
  };

  const handleBlur = (e: FocusEvent) => {
    setIsFocused(false);
    props.onBlur?.(e);
    void validateField();
  };

  const handleFocus = (e: FocusEvent) => {
    setIsFocused(true);
    props.onFocus?.(e);
  };

  let inputEl: HTMLTextAreaElement;
  // controller binding
  onMount(() => {
    const ctrl = props.controller;
    if (!ctrl) return;
    ctrl.target = inputEl;
    ctrl.validate = (opts?: any) => validateField();
    ctrl.getValue = () => value();
    ctrl.reset = () => {
      store.deleteSession('val_' + (props.record?.id ?? props.field.tableIdentifier) + '_' + props.field.identifier)
      setValueAndCache(initialRawValue());
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

  // input class (aplica .error a textarea si hay errores)
  const textareaClass = () => {
    let cls = "form-input";
    if (errors().length > 0) cls += " error";
    if (isModified()) cls += " modified";
    return cls;
  };

  const placeholder = props.field.storeData?.placeholder ?? "";

  const TextContent = () =>
    <div class="input-container">
      <textarea
        ref={el => inputEl = el}
        id={`${props.field.tableIdentifier}-${props.field.identifier}-textarea`}
        class={textareaClass()}
        rows={rows()}
        placeholder={placeholder}
        value={value()}
        onInput={handleInput}
        onChange={props.onChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    </div>

  if (isFieldForm) {
    return (
      <div class="form-group field-text">
        <label for={`${props.field.tableIdentifier}-${props.field.identifier}-textarea`} class="field-label" title={props.field.description}>
          {props.field.name}
          {props.field.isRequired && <span class="required-asterisk"> *</span>}
          <Show when={lengthInfo()}>
            <span class="length-info">({lengthInfo()})</span>
          </Show>
        </label>

        <TextContent />

        <Show when={errors().length > 0}>
          <div class="field-error">
            {errors().join(". ")}
          </div>
        </Show>
      </div>
    );
  } else {
    return <div title={errors().length > 0 ? errors().join(". ") : undefined}>
      <TextContent />
    </div>
  }
}

export default FormatTextEdit;
