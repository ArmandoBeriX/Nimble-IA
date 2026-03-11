// FormatTextEdit.tsx
import { createSignal, createEffect, onCleanup, Show, createMemo, onMount } from "solid-js";
import { FieldProps } from "../../FieldEdit";
import { store } from "../../../../app";
import { createSimpleHash } from "../../../../lib/utils/utils";
import WithTooltip from "../../../ui/tooltip/WithTooltip";

export function FormatTextEdit(props: FieldProps) {
  const isFieldForm = props.isFieldForm ?? true;
  if (isFieldForm && !props.field.isEditable) return <></>;

  const sessionKey = () =>
    `val_${props.record?.id ?? props.field.tableIdentifier ?? createSimpleHash(props.record)}_${props.field.identifier}`;

  const initialRawValue = createMemo(() => {
    const v = store.watchSession(sessionKey())() ?? props.record?.[props.field.identifier!] ?? props.field.default ?? "";
    return v === null || v === undefined ? "" : String(v);
  });

  const [value, setValue] = createSignal<string>(initialRawValue());
  const [isFocused, setIsFocused] = createSignal(false);
  const [errors, setErrors] = createSignal<string[]>([]);
  const [isModified, setIsModified] = createSignal(false);

  const setValueAndCache = (val: string) => {
    setValue(val);
    store.setSession(sessionKey(), val, 250, 8 * 60 * 60 * 1000);
  };

  const rows = createMemo(() => {
    const r = props.field.storeData?.rows || 3;
    const n = typeof r === "number" ? r : Number(r);
    return Number.isFinite(n) && n > 0 ? Math.max(1, Math.floor(n)) : 4;
  });

  const minLen = createMemo(() => { const n = Number(props.field.storeData?.min); return isNaN(n) ? NaN : n; });
  const maxLen = createMemo(() => { const n = Number(props.field.storeData?.max); return isNaN(n) ? NaN : n; });
  const pattern = createMemo(() => props.field.storeData?.regexp);
  const patternError = createMemo(() => props.field.storeData?.regexpError ?? "Formato inválido");

  createEffect(() => setIsModified(value() !== initialRawValue()));

  const lengthInfo = createMemo(() => {
    if (!isFocused()) return null;
    const min = minLen(), max = maxLen(), cur = value().length;
    if (isNaN(min) && isNaN(max)) return null;
    return `${cur}${isNaN(max) ? "" : `/${max}`}`;
  });

  const validateLength = (v: string) => {
    const min = minLen(), max = maxLen();
    if (!isNaN(min) && v.length < min) return `Mínimo ${min} caracteres requeridos`;
    if (!isNaN(max) && v.length > max) return `Máximo ${max} caracteres permitidos`;
    return null;
  };

  const validateRegex = (v: string) => {
    const rx = pattern();
    if (!rx) return true;
    try { return new RegExp(rx).test(v); }
    catch { return true; }
  };

  const validateField = async (newValue?: string): Promise<boolean> => {
    const current = newValue !== undefined ? newValue : value();
    const errs: string[] = [];
    if (props.field.isRequired && !current?.length) errs.push("Es requerido");
    if (isFieldForm) {
      const lErr = validateLength(current);
      if (lErr) errs.push(lErr);
      if (!validateRegex(current)) errs.push(patternError());
    }
    setErrors(errs);
    setIsModified(current !== initialRawValue());
    return errs.length === 0;
  };

  let onChangeTimeout: ReturnType<typeof setTimeout> | null = null;

  const handleInput = (e: InputEvent) => {
    const v = (e.target as HTMLTextAreaElement).value;
    setValueAndCache(v);
    props.onInput?.(v);
    if (onChangeTimeout) clearTimeout(onChangeTimeout);
    onChangeTimeout = setTimeout(() => props.onChange?.(v), ["", " "].includes(e.data ?? "") ? 50 : 1000);
    void validateField(v);
  };

  const handleBlur = (e: FocusEvent) => { setIsFocused(false); props.onBlur?.(e); void validateField(); };
  const handleFocus = (e: FocusEvent) => { setIsFocused(true); props.onFocus?.(e); };

  let inputEl!: HTMLTextAreaElement;
  const textareaId = `${props.field.tableIdentifier}-${props.field.identifier}-textarea`;

  onMount(() => {
    const ctrl = props.controller;
    if (!ctrl) return;
    ctrl.target = inputEl as any;
    ctrl.validate = () => validateField();
    ctrl.getValue = () => value();
    ctrl.reset = (val?: any) => {
      store.deleteSession(sessionKey());
      setValueAndCache(val ?? initialRawValue());
      setErrors([]);
      setIsModified(false);
    };
  });

  onCleanup(() => {
    if (props.controller) { delete props.controller.validate; delete props.controller.getValue; delete props.controller.reset; }
    if (onChangeTimeout) clearTimeout(onChangeTimeout);
  });

  const textareaClass = () => [
    "form-input",
    errors().length > 0 ? "error" : "",
    isModified() ? "modified" : "",
  ].filter(Boolean).join(" ");

  // ⚠️ FIX: called as {textareaJSX()} NOT as <TextContent /> 
  // A capitalized component defined inside the parent is recreated by SolidJS
  // on every render, unmounting the real DOM node and losing focus on each keystroke.
  const textareaJSX = () => (
    <div class="input-container">
      <textarea
        ref={el => (inputEl = el)}
        id={textareaId}
        class={textareaClass()}
        rows={rows()}
        placeholder={props.field.storeData?.placeholder ?? ""}
        value={value()}
        onInput={handleInput}
        onChange={props.onChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    </div>
  );

  if (isFieldForm) {
    return (
      <div class="form-group field-text">
        <WithTooltip tooltip={props.field.description}>
          <label for={textareaId} class="field-label">
            {props.field.name}
            {props.field.isRequired && <span class="required-asterisk"> *</span>}
            <Show when={lengthInfo()}>
              <span class="length-info"> ({lengthInfo()})</span>
            </Show>
          </label>
        </WithTooltip>
        {textareaJSX()}
        <Show when={errors().length > 0}>
          <div class="field-error">{errors().join(". ")}</div>
        </Show>
      </div>
    );
  }

  return (
    <div title={errors().length > 0 ? errors().join(". ") : undefined}>
      {textareaJSX()}
    </div>
  );
}

export default FormatTextEdit;
