// FormatString.tsx
import { createSignal, createEffect, onCleanup, Show, createMemo, onMount } from "solid-js";
import { FieldProps } from "../../FieldEdit";
import { store } from "../../../../app";
import { createSimpleHash } from "../../../../lib/utils/utils";

/**
 * FieldNumber con soporte opcional de range slider:
 * - Si props.field.storeData.range === true y existen min y max, se muestra un <input type="range"> a la derecha.
 * - mover el range actualiza el input numérico y viceversa.
 * - storeData.step se usa como step del range; si no existe, step = 1 (por requisito).
 * - Si field.fieldFormat === 'float' el input acepta decimales; en otro caso exige enteros.
 */

export default function FormatNumberEdit(props: FieldProps) {
  const isFieldForm = props.isFieldForm ?? true

  if (isFieldForm && props.field.isEditable === false) {
    return <></>;
  }

  // --- inicial
  const initialRawValue = (): string => {
    const sessionValue = store.watchSession('val_' + (props.record?.id ?? props.field.tableIdentifier ?? createSimpleHash(props.record)) + '_' + props.field.identifier)()
    const v = sessionValue ?? props.record?.[props.field.identifier!] ?? props.field.default;
    if (v === null || typeof v === "undefined" || v === "") return "";
    return String(v);
  };

  const [inputValue, setInputValue] = createSignal<string>(initialRawValue());
  const setInputValueAndCache = (val: string) => {
    setInputValue(val);
    store.setSession('val_' + (props.record?.id ?? props.field.tableIdentifier ?? createSimpleHash(props.record)) + '_' + props.field.identifier, val, 250, 8 * 60 * 60 * 1000) // El submit tambien lo limpia
  }
  const [sliderValue, setSliderValue] = createSignal<string>(""); // sincronizado con input cuando hay range
  const [isFocused, setIsFocused] = createSignal(false);
  const [errors, setErrors] = createSignal<string[]>([]);
  const [isModified, setIsModified] = createSignal(false);

  const isFloat = createMemo(() => props.field.fieldFormat === "float");

  const fieldName = createMemo(() =>
    `${props.field.tableIdentifier}.${props.field.identifier}`
  );

  const fieldId = createMemo(() =>
    fieldName().replace(/\./g, "-")
  );

  // helpers para min/max (pueden venir como string)
  const minValue = createMemo(() => {
    const m = props.field.storeData?.min;
    if (m === undefined || m === null) return null;
    const n = Number(m);
    return Number.isNaN(n) ? null : n;
  });
  const maxValue = createMemo(() => {
    const m = props.field.storeData?.max;
    if (m === undefined || m === null) return null;
    const n = Number(m);
    return Number.isNaN(n) ? null : n;
  });

  const hasRange = createMemo(() => {
    return !!props.field.storeData?.range && minValue() !== null && maxValue() !== null;
  });

  const rangeStep = createMemo(() => {
    const s = props.field.storeData?.step;
    const n = Number(s);
    return (!Number.isNaN(n) && s !== undefined && s !== null) ? n : 1;
  });

  // parsea input a número o null
  const parseNumber = (s: string): number | null => {
    if (s === null || s === undefined) return null;
    const trimmed = String(s).trim();
    if (trimmed === "") return null;
    // permitir coma decimal transformando a punto
    const normalized = trimmed.replace(",", ".");
    const n = Number(normalized);
    if (Number.isNaN(n)) return null;
    return n;
  };

  // formatea número a string preservando decimales tal cual (no forzamos precisión)
  const formatNumberToString = (n: number | null) => {
    if (n === null) return "";
    return String(n);
  };

  // validación principal
  const validateField = async (newValue?: string): Promise<boolean> => {
    const s = typeof newValue !== "undefined" ? newValue : inputValue();
    const errs: string[] = [];

    const parsed = parseNumber(s);

    // requerido
    if (props.field.isRequired && (parsed === null)) {
      errs.push("Es requerido");
    }

    // parseo
    if (s !== "" && parsed === null) {
      errs.push("Valor numérico inválido");
    }

    // entero vs float
    if (parsed !== null && !isFloat()) {
      if (!Number.isInteger(parsed)) errs.push("Debe ser un número entero");
    }

    if (isFieldForm) {
      // min / max
      const min = minValue();
      const max = maxValue();
      if (parsed !== null && min !== null && parsed < min) {
        errs.push(`Mínimo ${min}`);
      }
      if (parsed !== null && max !== null && parsed > max) {
        errs.push(`Máximo ${max}`);
      }
    }

    setErrors(errs);
    setIsModified(inputValue() !== initialRawValue());
    return errs.length === 0;
  };

  // sincronización inicial del slider (si aplica)
  const initializeSlider = () => {
    if (!hasRange()) return;
    const parsed = parseNumber(inputValue());
    if (parsed !== null) {
      setSliderValue(String(parsed));
    } else {
      // si no hay valor inicial, situamos slider en min
      const min = minValue()!;
      setSliderValue(String(min));
      // no tocar inputValue en este punto (dejamos vacío si no había valor)
    }
  };

  // inicial
  initializeSlider();

  // manejadores
  let onInputTimeout: NodeJS.Timeout | null = null;
  const handleInput = (event: Event) => {
    const val = (event.target as HTMLInputElement).value;
    setInputValueAndCache(val);
    const parsed = parseNumber(val);

    // sincronizar slider sólo si parsed != null y hay range
    if (hasRange() && parsed !== null) {
      // clamp entre min/max
      const min = minValue()!;
      const max = maxValue()!;
      let v = parsed;
      if (v < min) v = min;
      if (v > max) v = max;
      setSliderValue(String(v));
    }

    // emitir número (o null) al padre
    props.onInput?.(parsed);
    if (onInputTimeout) clearTimeout(onInputTimeout);
    onInputTimeout = setTimeout(()=>{
      props.onChange?.(parsed)
    }, 400)
    void validateField(val);
  };

  const handleRangeInput = (event: Event) => {
    const val = (event.target as HTMLInputElement).value;
    // range siempre produce string de número; lo ponemos en input y emitimos
    setSliderValue(val);
    setInputValueAndCache(val); // mantiene mismo formato (no sustituimos por toFixed)
    const parsed = parseNumber(val);
    props.onInput?.(parsed);
    void validateField(val);
  };

  const handleBlur = (event: FocusEvent) => {
    setIsFocused(false);
    props.onBlur?.(event);
    void validateField();
  };

  const handleFocus = (event: FocusEvent) => {
    setIsFocused(true);
    props.onFocus?.(event);
  };

  // cuando cambia inputValue desde fuera (p. ej. reset), sincronizar slider
  createEffect(() => {
    const parsed = parseNumber(inputValue());
    if (hasRange()) {
      if (parsed !== null) {
        // clamp
        const min = minValue()!;
        const max = maxValue()!;
        let v = parsed;
        if (v < min) v = min;
        if (v > max) v = max;
        // evitar bucles: solo set si difiere
        if (String(v) !== sliderValue()) setSliderValue(String(v));
      } else {
        // no parsed -> no forzamos slider a empty; preferimos mantener slider en min
        if (!sliderValue()) {
          const min = minValue()!;
          setSliderValue(String(min));
        }
      }
    }
  });

  let inputEl: HTMLInputElement;
  // binding controller
  onMount(() => {
    const ctrl = props.controller;
    if (!ctrl) return;
    ctrl.target = inputEl;
    ctrl.validate = (opts?: any) => validateField();
    ctrl.getValue = () => {
      return parseNumber(inputValue());
    };
    ctrl.reset = () => {
      store.deleteSession('val_' + (props.record?.id ?? props.field.tableIdentifier ?? createSimpleHash(props.record)) + '_' + props.field.identifier)
      const init = initialRawValue();
      setInputValueAndCache(init);
      // recalcular slider
      if (hasRange()) {
        const parsed = parseNumber(init);
        if (parsed !== null) setSliderValue(String(parsed));
        else setSliderValue(String(minValue() ?? 0));
      }
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

  // clases del input
  const inputClass = () => {
    let cls = "form-input";
    if (errors().length > 0) cls += " error";
    if (isModified()) cls += " modified";
    cls += isFloat() ? " field-float" : " field-int";
    if (hasRange()) cls += " input-with-range";
    return cls;
  };

  // atributos del input numérico
  const stepAttr = () => (isFloat() ? "any" : "1");
  const inputModeAttr = () => (isFloat() ? "decimal" : "numeric");
  const minAttr = () => {
    const m = minValue();
    return m !== null ? String(m) : undefined;
  };
  const maxAttr = () => {
    const m = maxValue();
    return m !== null ? String(m) : undefined;
  };

  // atributos del range
  const rangeMinAttr = () => (minValue() !== null ? String(minValue()!) : undefined);
  const rangeMaxAttr = () => (maxValue() !== null ? String(maxValue()!) : undefined);
  const rangeStepAttr = () => String(rangeStep());

  const NumberContent = () =>
    <div class="input-container" style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
      {/* input numérico a la izquierda */}
      <input
        ref={el => inputEl = el}
        id={fieldId()}
        name={fieldName()}
        class={inputClass()}
        placeholder={props.field.storeData?.placeholder ?? ""}
        required={props.field.isRequired}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onInput={handleInput}
        type="number"
        inputMode={inputModeAttr()}
        step={stepAttr()}
        min={minAttr()}
        max={maxAttr()}
        value={inputValue()}
        style={{ 'flex': hasRange() ? '1 1 60%' : '1 1 100%' }}
      />

      {/* range slider a la derecha (opcional) */}
      <Show when={hasRange()}>
        <input
          type="range"
          aria-label={`${props.field.name} (rango)`}
          min={rangeMinAttr()}
          max={rangeMaxAttr()}
          step={rangeStepAttr()}
          value={sliderValue()}
          onInput={handleRangeInput}
          style={{ width: '220px' }}
        />
      </Show>
    </div>

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
        </label>

        <NumberContent />

        <Show when={errors().length > 0}>
          <div class="field-error">
            {errors().join(". ")}
          </div>
        </Show>
      </div>
    );
  } else {
    return <div title={errors().length > 0 ? errors().join(". ") : undefined}>
      <NumberContent />
    </div>
  }

}