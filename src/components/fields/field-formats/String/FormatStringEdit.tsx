import { createSignal, createEffect, onCleanup, Show, createMemo, onMount } from "solid-js";
import { store } from "../../../../app";
import { FieldProps } from "../../FieldEdit";
import { createSimpleHash } from "../../../../lib/utils/utils";
import ColorPicker from "./ColorPicker";
import WithTooltip from "../../../ui/tooltip/WithTooltip";

export default function FormatStringEdit(props: FieldProps) {
  const isFieldForm = props.isFieldForm ?? true;
  if (isFieldForm && !props.field.isEditable) return <></>;

  // ── Cache key ──────────────────────────────────────────────────────────
  const cacheKey = () =>
    'val_' +
    (props.record?.id ?? props.field.tableIdentifier ?? createSimpleHash(props.record)) +
    '_' + props.field.identifier;

  const getInitialValue = (): string =>
    store.watchSession(cacheKey())() ??
    props.record?.[props.field.identifier!] ??
    props.field.default ??
    '';

  const initialValue = getInitialValue();

  // ── State ──────────────────────────────────────────────────────────────
  // `value` is for validation state, modified-flag and length counter ONLY.
  // It is NEVER written back to the DOM (input is uncontrolled).
  const [value, setValue] = createSignal<string>(initialValue);
  const [isFocused, setIsFocused] = createSignal(false);
  const [errors, setErrors] = createSignal<string[]>([]);
  const [isModified, setIsModified] = createSignal(false);
  const [isCheckingUnique, setIsCheckingUnique] = createSignal(false);
  const [showCheckmark, setShowCheckmark] = createSignal(false);
  let validationPending = true;

  let inputEl!: HTMLInputElement;

  const setValueAndCache = (val: string) => {
    setValue(val);
    store.setSession(cacheKey(), val, 250, 8 * 60 * 60 * 1000);
  };

  // ── Field config (memos — only recompute when field definition changes) ─
  const fieldName = createMemo(() => `${props.field.tableIdentifier}.${props.field.identifier}`);
  const fieldId = createMemo(() => fieldName().replace(/\./g, '-'));
  const fieldType = createMemo(() => props.field.storeData?.type || 'text');

  const fieldConfig = createMemo(() => {
    const sd = props.field.storeData ?? {};
    const cfgs: Record<string, any> = {
      email: { inputType: 'email', placeholder: sd.placeholder || 'ejemplo@correo.com', pattern: sd.regexp || '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$', patternError: sd.regexpError || 'El formato de email no es válido', autocomplete: 'email' },
      tel: { inputType: 'tel', placeholder: sd.placeholder || '+34 123 456 789', pattern: sd.regexp || '^[+]?[\\d\\s\\-\\(\\)]+$', patternError: sd.regexpError || 'El formato de teléfono no es válido', autocomplete: 'tel' },
      url: { inputType: 'url', placeholder: sd.placeholder || 'https://ejemplo.com', pattern: sd.regexp || '^https?://.+\\..+', patternError: sd.regexpError || 'La URL debe comenzar con http:// o https://', autocomplete: 'url' },
      password: { inputType: 'password', placeholder: sd.placeholder || '••••••••', pattern: sd.regexp, patternError: sd.regexpError, autocomplete: 'new-password' },
      search: { inputType: 'search', placeholder: sd.placeholder || 'Buscar...', pattern: sd.regexp, patternError: sd.regexpError, autocomplete: 'off' },
      color: { inputType: 'text', placeholder: sd.placeholder, pattern: '^#([0-9a-f]{6}|[0-9a-f]{8})$', patternError: 'Debe ser #rrggbbaa (ej: #ff0000 o #ff0000ff)', autocomplete: 'off' },
      text: { inputType: 'text', placeholder: sd.placeholder, pattern: sd.regexp, patternError: sd.regexpError, autocomplete: 'on' },
    };
    return cfgs[fieldType()] ?? cfgs.text;
  });

  // Only show checkmark when the field has meaningful validation (regex or uniqueness).
  // For a plain text field with no constraints, a green checkmark adds no information.
  const hasValidationFeedback = createMemo(() =>
    !!(props.field.storeData?.regexp || props.field.isUnique)
  );

  // ── Derived class (memo — only recalculates when validation state changes) ─
  //
  // CRITICAL: this is a createMemo, not a plain function.
  // In SolidJS, plain functions called inside JSX expressions re-create DOM nodes
  // when any signal they read changes. A memo only propagates when its *output*
  // changes, and attribute bindings like class={inputClass()} update only the
  // attribute on the existing DOM node — the <input> is never recreated.
  const inputClass = createMemo(() => {
    let cls = 'form-input';
    if (errors().length > 0) cls += ' error';
    if (isModified()) cls += ' modified';
    if (isCheckingUnique()) cls += ' checking-unique';
    if (showCheckmark()) cls += ' input-with-check';
    return cls + ` field-${fieldType()}`;
  });

  const lengthInfo = createMemo(() => {
    if (!isFocused()) return null;
    const min = props.field.storeData?.min ?? NaN;
    const max = props.field.storeData?.max ?? NaN;
    if (isNaN(min) && isNaN(max)) return null;
    return isNaN(max) ? `${value().length}` : `${value().length}/${max}`;
  });

  // ── Reactive side-effects ──────────────────────────────────────────────
  createEffect(() => setIsModified(value() !== initialValue));

  createEffect(() => {
    setShowCheckmark(
      hasValidationFeedback() &&
      !validationPending &&
      value().length > 0 &&
      errors().length === 0 &&
      !isCheckingUnique()
    );
  });

  // ── Validation ─────────────────────────────────────────────────────────
  const validateRegex = (v: string): boolean => {
    if (!v) return true;
    if (props.field.storeData?.regexp) {
      try { return new RegExp(props.field.storeData.regexp).test(v); } catch { return true; }
    }
    switch (fieldType()) {
      case 'email': return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      case 'tel': return /^[+]?[\d\s\-\(\)]+$/.test(v) && v.replace(/\D/g, '').length >= 8;
      case 'url': return /^https?:\/\/.+\..+/.test(v);
      default: return true;
    }
  };

  const validateLength = (v: string): string | null => {
    const min = props.field.storeData?.min ?? NaN;
    const max = props.field.storeData?.max ?? NaN;
    if (!isNaN(min) && v.length < min) return `Mínimo ${min} caracteres requeridos`;
    if (!isNaN(max) && v.length > max) return `Máximo ${max} caracteres permitidos`;
    return null;
  };

  let uniqueTimeout: ReturnType<typeof setTimeout> | undefined;

  const validateField = async (
    newValue?: string,
    opts: { debounceUnique?: boolean } = { debounceUnique: true }
  ): Promise<boolean> => {
    validationPending = true;
    const v = newValue ?? value();
    const errs: string[] = [];

    if (isFieldForm && props.field.isRequired && v.length === 0)
      errs.push('Es requerido');

    if (isFieldForm) {
      const lenErr = validateLength(v);
      if (lenErr) errs.push(lenErr);
      if (!validateRegex(v)) errs.push(fieldConfig().patternError || 'Formato inválido');

      if (props.field.isUnique && v) {
        if (uniqueTimeout) { clearTimeout(uniqueTimeout); uniqueTimeout = undefined; }
        if (opts.debounceUnique ?? true) {
          setIsCheckingUnique(true);
          await new Promise<void>((res) => {
            uniqueTimeout = setTimeout(() => { uniqueTimeout = undefined; res(); }, 220);
          });
        }
        try {
          setIsCheckingUnique(true);
          const filters: any = {
            [props.field.identifier!]: { op: '=', v },
            syncStatus: { op: '*' },
          };
          if (props.field.uniqueKeys)
            for (const uk of props.field.uniqueKeys) filters[uk] = props.record?.[uk];
          if (props.record?.id) filters['id'] = { op: '!=', v: props.record.id };
          const conflict = await store.count(props.field.tableIdentifier!, filters);
          if (conflict !== 0) errs.push('Ya está en uso');
        } catch (err) {
          console.error('Error checking uniqueness:', err);
        } finally {
          setIsCheckingUnique(false);
        }
      }
    }

    validationPending = false;
    setErrors(errs);
    return errs.length === 0;
  };

  // ── Event handlers ─────────────────────────────────────────────────────
  let onInputTimeout: ReturnType<typeof setTimeout> | null = null;

  const handleInput = (e: InputEvent) => {
    // Read the new value from the DOM — never write back.
    // The input is uncontrolled: SolidJS never runs input.value = x after mount.
    const newValue = (e.target as HTMLInputElement).value;
    setValueAndCache(newValue);
    props.onInput?.(newValue);
    if (onInputTimeout) clearTimeout(onInputTimeout);
    onInputTimeout = setTimeout(
      () => props.onChange?.(newValue),
      e.data === ' ' ? 50 : 250
    );
    void validateField(newValue);
  };

  const handleBlur = (e: FocusEvent) => {
    setIsFocused(false);
    props.onBlur?.(e);
    void validateField(value());
  };

  const handleFocus = (e: FocusEvent) => {
    setIsFocused(true);
    props.onFocus?.(e);
  };

  // ── Controller ─────────────────────────────────────────────────────────
  onMount(() => {
    // inputEl siempre se asigna ahora — el <input text> se renderiza en todos
    // los casos (incluyendo color, donde vive dentro del ColorPicker como children).
    inputEl.value = initialValue;

    const ctrl = props.controller;
    if (!ctrl) return;
    ctrl.target = inputEl;
    ctrl.validate = (opts = { debounceUnique: false }) => validateField(undefined, opts);
    ctrl.getValue = () => value();
    ctrl.reset = (val?: any) => {
      store.deleteSession(cacheKey());
      const v = val ?? getInitialValue();
      inputEl.value = v;
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
    if (uniqueTimeout) clearTimeout(uniqueTimeout);
    if (onInputTimeout) clearTimeout(onInputTimeout);
  });

  // ── JSX ────────────────────────────────────────────────────────────────
  //
  // The <input> is placed DIRECTLY in the return JSX, not inside a helper function.
  //
  // If we wrapped it in inputElementJSX() and called {inputElementJSX()} in JSX,
  // SolidJS would track every signal read inside (including inputClass()) and
  // re-run the function on each keystroke — creating a new <input> DOM node and
  // replacing the old one → focus lost → lag.
  //
  // With the input directly in the JSX tree:
  //   • class={inputClass()} creates a fine-grained effect that only updates the
  //     class attribute on the existing DOM node — no remounting, no lag.
  //   • All other attributes are stable (don't read user-changing signals).
  //
  // The <Show> for ColorPicker is fine: its `when` condition only changes when
  // the field type changes (not while typing), so the <input> stays mounted.

  const cfg = fieldConfig(); // snapshot once — field config doesn't change while typing
  const isColor = props.field.storeData?.type === 'color';

  // El <input type="text"> se renderiza SIEMPRE — esto garantiza:
  //   1. inputEl ref siempre se asigna (el controller siempre funciona)
  //   2. Para campos color: el usuario puede escribir hex o var(--token)
  //   3. Para campos normales: es el input principal
  //
  // Para color, el input se pasa como children a <ColorPicker> para integrarlo
  // en su UI. ColorPicker llama a onChange (= setValueAndCache) para que el
  // valor persista correctamente en el session cache — no solo en el signal.
  const textInput = (
    <input
      ref={(el) => { inputEl = el; }}
      id={fieldId()}
      name={fieldName()}
      class={inputClass()}
      placeholder={isColor ? (cfg.placeholder || '#rrggbb o var(--token)') : cfg.placeholder}
      required={props.field.isRequired}
      type="text"
      autocomplete={isColor ? 'off' : cfg.autocomplete}
      onInput={handleInput}
      onBlur={handleBlur}
      onFocus={handleFocus}
      onChange={(e) => props.onChange?.((e.target as HTMLInputElement).value)}
    />
  );

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
          <Show
            when={isColor}
            fallback={textInput}
          >
            {/* Para color: el text input vive DENTRO del ColorPicker como children.
                onChange usa setValueAndCache para persistir en session cache. */}
            <ColorPicker
              value={value}
              onChange={(val) => {
                inputEl.value = val
                handleInput({ target: inputEl } as any);
              }}
            >
              {textInput}
            </ColorPicker>
          </Show>
        </div>

        <Show when={errors().length > 0}>
          <div class="field-error">{errors().join('. ')}</div>
        </Show>
      </div>
    );
  }

  return (
    <div title={errors().length > 0 ? errors().join('. ') : undefined} style="width:100%">
      <div class="input-container">
        <Show
          when={isColor}
          fallback={textInput}
        >
          <ColorPicker
            value={value}
            onChange={(val) => {
              inputEl.value = val
              handleInput({ target: inputEl } as any);
            }}
          >
          </ColorPicker>
        </Show>
      </div>
    </div>
  );
}