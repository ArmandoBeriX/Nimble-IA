// FormatStringEdit.tsx
import { createSignal, createEffect, onCleanup, Show, createMemo, onMount } from "solid-js";
import { store } from "../../../../app";
import { FieldProps } from "../../FieldEdit";
import { createSimpleHash } from "../../../../lib/utils/utils";
import FormatRelationEdit from "../Relation/FormatRelationEdit";
import ColorPicker from "./ColorPicker";

export default function FormatStringEdit(props: FieldProps) {
  const isFieldForm = props.isFieldForm ?? true
  if (isFieldForm && props.field.isEditable === false) {
    return <></>;
  }

  const getInitialValue = () => {
    const sessionValue = store.watchSession('val_' + (props.record?.id ?? props.field.tableIdentifier ?? createSimpleHash(props.record)) + '_' + props.field.identifier)()

    return sessionValue ?? props.record?.[props.field.identifier!] ?? props.field.default ?? '';
  }
  const initialValue = getInitialValue();
  const [value, setValue] = createSignal<string>(initialValue);
  const setValueAndCache = (val: string) => {
    setValue(val);
    store.setSession('val_' + (props.record?.id ?? props.field.tableIdentifier ?? createSimpleHash(props.record)) + '_' + props.field.identifier, val, 250, 8 * 60 * 60 * 1000) // El submit tambien lo limpia
  }
  const [isFocused, setIsFocused] = createSignal(false);
  const [errors, setErrors] = createSignal<string[]>([]);
  const [isModified, setIsModified] = createSignal(false);
  const [isCheckingUnique, setIsCheckingUnique] = createSignal<boolean>(false);
  const [isValidPlacement, setIsValidPlacement] = createSignal<boolean>(false);
  let validationPending = true;

  const fieldName = createMemo(() =>
    `${props.field.tableIdentifier}.${props.field.identifier}`
  );

  const fieldId = createMemo(() =>
    fieldName().replace(/\./g, '-')
  );

  const fieldType = createMemo(() => {
    return props.field.storeData?.type || 'text';
  });

  const fieldConfig = createMemo(() => {
    const type = fieldType();
    const configs: any = {
      email: {
        inputType: 'email',
        placeholder: props.field.storeData?.placeholder || 'ejemplo@correo.com',
        pattern: props.field.storeData?.regexp || '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
        patternError: props.field.storeData?.regexpError || 'El formato de email no es válido',
        autocomplete: 'email'
      },
      tel: {
        inputType: 'tel',
        placeholder: props.field.storeData?.placeholder || '+34 123 456 789',
        pattern: props.field.storeData?.regexp || '^[+]?[\\d\\s\\-\\(\\)]+$',
        patternError: props.field.storeData?.regexpError || 'El formato de teléfono no es válido',
        autocomplete: 'tel'
      },
      url: {
        inputType: 'url',
        placeholder: props.field.storeData?.placeholder || 'https://ejemplo.com',
        pattern: props.field.storeData?.regexp || '^https?://.+\\..+',
        patternError: props.field.storeData?.regexpError || 'La URL debe comenzar con http:// o https://',
        autocomplete: 'url'
      },
      password: {
        inputType: 'password',
        placeholder: props.field.storeData?.placeholder || '••••••••',
        pattern: props.field.storeData?.regexp,
        patternError: props.field.storeData?.regexpError,
        autocomplete: 'new-password'
      },
      search: {
        inputType: 'search',
        placeholder: props.field.storeData?.placeholder || 'Buscar...',
        pattern: props.field.storeData?.regexp,
        patternError: props.field.storeData?.regexpError,
        autocomplete: 'off'
      },
      text: {
        inputType: 'text',
        placeholder: props.field.storeData?.placeholder,
        pattern: props.field.storeData?.regexp,
        patternError: props.field.storeData?.regexpError,
        autocomplete: 'on'
      },
      color: {
        pattern: "^#([0-9a-f]{6}|[0-9a-f]{8})$", //pattern: /^#([0-9a-f]{6}|[0-9a-f]{8})$/i,
        patternError: "Debe ser #rrggbbaa (ej: #ff0000 o #ff0000ff)",
      }
    };

    return configs[type] || configs.text;
  });

  // live-modified flag
  createEffect(() => {
    const currentValue = value();
    const originalValue = initialValue;
    setIsModified(currentValue !== originalValue);
  });

  // Checkmark placement control
  createEffect(() => {
    const currentValue = value();
    const currentErrors = errors();
    const currentIsCheckingUnique = isCheckingUnique();

    const hasContent = currentValue && currentValue.length > 0;
    const hasNoErrors = currentErrors.length === 0;
    const notChecking = !currentIsCheckingUnique;

    const shouldShowCheckmark = (!validationPending && hasContent && hasNoErrors && notChecking) as boolean;

    setIsValidPlacement(shouldShowCheckmark);
  });

  // helper: check uniqueness (usa recordsManager)
  const checkIsUnique = async (v: string) => {
    if (!props.field.isUnique || !v) return true;
    try {
      setIsCheckingUnique(true);
      const filters: any = {
        [props.field.identifier!]: { op: "=", v },
        syncStatus: { op: '*' }
      };
      if (props.field.uniqueKeys) {
        for (const uk of props.field.uniqueKeys) {
          filters[uk] = props.record?.[uk]
        }
      }
      if (props.record?.id) {
        filters['id'] = { op: '!=', v: props.record.id };
      }
      const conflict = await store.count(props.field.tableIdentifier!, filters);
      return conflict === 0;
    } catch (err) {
      console.error("Error checking uniqueness:", err);
      return true;
    } finally {
      setIsCheckingUnique(false);
    }
  };

  // regex validation helper
  const validateRegex = (v: string) => {
    if (!v) return true;

    const config = fieldConfig();

    if (props.field.storeData?.regexp) {
      try {
        const regex = new RegExp(props.field.storeData.regexp);
        return regex.test(v);
      } catch (err) {
        console.error("Invalid regex pattern:", err);
        return true;
      }
    }

    switch (fieldType()) {
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      case 'tel':
        return /^[+]?[\d\s\-\(\)]+$/.test(v) && v.replace(/\D/g, '').length >= 8;
      case 'url':
        return /^https?:\/\/.+\..+/.test(v);
      default:
        return true;
    }
  };

  const validateLength = (v: string) => {
    const min = props.field.storeData?.min ?? NaN;
    const max = props.field.storeData?.max ?? NaN;

    if (!isNaN(min) && v.length < min) {
      return `Mínimo ${min} caracteres requeridos`;
    }

    if (!isNaN(max) && v.length > max) {
      return `Máximo ${max} caracteres permitidos`;
    }

    return null;
  };

  let uniqueTimeout: ReturnType<typeof setTimeout> | undefined;
  let regexTimeout: ReturnType<typeof setTimeout> | undefined;

  // validateField con debounce opcional para checkIsUnique
  const validateField = async (newValue?: string, opts: { debounceUnique?: boolean } = { debounceUnique: true }): Promise<boolean> => {

    validationPending = true;
    const currentValue = typeof newValue !== 'undefined' ? newValue : value();
    const newErrors: string[] = [];

    // Requerido
    if (isFieldForm && props.field.isRequired && (!currentValue || currentValue.length === 0)) {
      newErrors.push('Es requerido');
    }

    if (isFieldForm) {
      // Longitud
      const lengthError = validateLength(currentValue);
      if (lengthError) newErrors.push(lengthError);

      // Regex / tipo
      if (!validateRegex(currentValue)) {
        const cfg = fieldConfig();
        const regexError = cfg.patternError || "Formato inválido";
        newErrors.push(regexError);
      }

      // Unicidad (async) con debounce opcional
      if (isFieldForm && props.field.isUnique && currentValue) {
        if (uniqueTimeout) {
          clearTimeout(uniqueTimeout);
          uniqueTimeout = undefined;
        }

        if (opts.debounceUnique ?? true) {
          setIsCheckingUnique(true);
          await new Promise<void>((resolve) => {
            uniqueTimeout = setTimeout(() => {
              uniqueTimeout = undefined;
              resolve();
            }, 220);
          });
        }

        const isUnique = await checkIsUnique(currentValue);
        if (!isUnique) newErrors.push('Ya está en uso');
      }
    }

    validationPending = false;
    setErrors(newErrors);

    return newErrors.length === 0;
  };

  let onInputTimeout: NodeJS.Timeout | null = null
  // Live handlers: input/blur/focus
  const handleInput = (event: InputEvent) => {
    const newValue = (event.target as HTMLInputElement).value;
    setValueAndCache(newValue);
    props.onInput?.(newValue);
    if (onInputTimeout) clearTimeout(onInputTimeout);
    onInputTimeout = setTimeout(() => {
      props.onChange?.(newValue)
    }, event.data === " " ? 50 : 250)
    void validateField(newValue);
  };

  const handleBlur = (event: FocusEvent) => {
    setIsFocused(false);
    props.onBlur?.(event);
    void validateField(value());
  };

  const handleFocus = (event: FocusEvent) => {
    setIsFocused(true);
    props.onFocus?.(event);
  };

  let inputEl!: HTMLInputElement;

  onMount(() => {
    const ctrl = props.controller;
    if (!ctrl) return;
    ctrl.target = inputEl;
    ctrl.validate = (opts: { debounceUnique?: boolean } = { debounceUnique: false }) => validateField(undefined, opts);
    ctrl.getValue = () => value();
    ctrl.reset = () => {
      store.deleteSession('val_' + (props.record?.id ?? props.field.tableIdentifier ?? createSimpleHash(props.record)) + '_' + props.field.identifier)
      setValueAndCache(getInitialValue());
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
    if (regexTimeout) clearTimeout(regexTimeout);
  });

  const inputClass = () => {
    let cls = "form-input";
    if (errors().length > 0) cls += " error";
    if (isModified()) cls += " modified";
    if (isCheckingUnique()) cls += " checking-unique";
    if (isValidPlacement()) cls += " input-with-check";
    cls += ` field-${fieldType()}`;
    return cls;
  };

  const lengthInfo = createMemo(() => {
    if (!isFocused()) return null;
    const min = props.field.storeData?.min ?? NaN;
    const max = props.field.storeData?.max ?? NaN;
    const currentLength = value().length;
    if (isNaN(min) && isNaN(max)) return null;
    let info = `${currentLength}`;
    if (!isNaN(max)) info += `/${max}`;
    return info;
  });

  const config = fieldConfig();

  const InputContainer = () =>
    <div class="input-container">
      <Show when={props.field.storeData?.type === 'color'} fallback={<InputElement />}>
        <ColorPicker value={value} setValue={setValue} />
      </Show>
    </div>

  const InputElement = () =>
    <input
      ref={el => inputEl = el}
      id={fieldId()}
      name={fieldName()}
      class={inputClass()}
      placeholder={config.placeholder}
      required={props.field.isRequired}
      onBlur={handleBlur}
      onFocus={handleFocus}
      onInput={handleInput}
      onChange={(v) => props.onChange?.(v)}
      type={config.inputType}
      autocomplete={config.autocomplete}
      pattern={config.pattern}
      value={value()}
    />

  if (isFieldForm) {
    return (
      <div class="form-group">
        <label
          for={fieldId()}
          class="field-label"
          title={props.field.description}
        >
          {props.field.name}
          {props.field.isRequired && <span class="required-asterisk"> *</span>}
          <Show when={lengthInfo()}>
            <span class="length-info">({lengthInfo()})</span>
          </Show>
        </label>

        <InputContainer />

        <Show when={errors().length > 0}>
          <div class="field-error">
            {errors().join('. ')}
          </div>
        </Show>
      </div>
    );
  } else {
    return <div title={errors().length > 0 ? errors().join(". ") : undefined} style="width: 100%">
      <InputContainer />
    </div>
  }

}