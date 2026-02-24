import { createSignal, createEffect, createMemo, onMount, onCleanup, Show } from "solid-js";
import type { JSX } from "solid-js";
import { FieldProps } from "../../FieldEdit";
import { store } from "../../../../app";
import DatePicker from "./DatePicker";
import DatePickerMultiple from "./DatePickerMultiple";

/** Helpers */
const isTimeString = (s: string) => /^\d{1,2}:\d{2}(:\d{2})?$/.test(String(s ?? "").trim());
const pad2 = (n: number) => (n < 10 ? "0" + n : String(n));

/**
 * parseToDate:
 * - Si recibe datetime o fecha devuelve Date apropiado.
 * - Si recibe solo time (HH:mm or HH:mm:ss) devuelve Date con hoy y esa hora.
 * - Si no parseable -> null
 */
const parseToDate = (v: string | Date | null | undefined): Date | null => {
  if (v == null || v === "") return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;

  const s = String(v).trim();

  // time-only (HH:mm or HH:mm:ss)
  if (isTimeString(s)) {
    const parts = s.split(":").map(Number);
    const now = new Date();
    const d = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      parts[0] ?? 0,
      parts[1] ?? 0,
      parts[2] ?? 0
    );
    return isNaN(d.getTime()) ? null : d;
  }

  // Normalize T to space, remove trailing Z when present for Date ctor to handle offset correctly
  const normalized = s.replace(/T/, " ").replace(/Z$/, "");
  // Try to match YYYY-MM-DD or YYYY/MM/DD with optional time
  const m = normalized.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    const hh = Number(m[4] ?? 0);
    const mm = Number(m[5] ?? 0);
    const ss = Number(m[6] ?? 0);
    const date = new Date(y, mo, d, hh, mm, ss);
    return isNaN(date.getTime()) ? null : date;
  }

  // Fallback: try Date constructor (handles many ISO forms)
  const d1 = new Date(s);
  if (!isNaN(d1.getTime())) return d1;

  // Last attempt: replace '-' with '/' to help Safari-like parsing
  const d2 = new Date(s.replace(/-/g, "/"));
  return isNaN(d2.getTime()) ? null : d2;
};

const minutesOfDay = (d: Date) => d.getHours() * 60 + d.getMinutes();

const humanizeWithOptions = (
  d: Date | null,
  locale = "es-ES",
  long = false,
  fieldFormat: "date" | "datetime" | "time" = "date"
) => {
  if (!d) return "";

  try {
    if (fieldFormat === "time") {
      const raw = d.toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      return raw.replace(/\s*a\.? ?m\.?/i, " AM").replace(/\s*p\.? ?m\.?/i, " PM");
    }

    if (fieldFormat === "datetime") {
      const opts: Intl.DateTimeFormatOptions = long
        ? {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }
        : {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          };

      const fmt = new Intl.DateTimeFormat(locale, opts);
      const raw = fmt.format(d);
      return raw
        .replace(/\./g, "")
        .replace(/\s*a\.? ?m\.?/i, " AM")
        .replace(/\s*p\.? ?m\.?/i, " PM");
    }

    const opts: Intl.DateTimeFormatOptions = long
      ? { weekday: "long", day: "numeric", month: "long", year: "numeric" }
      : { day: "numeric", month: "short", year: "numeric" };

    const fmt = new Intl.DateTimeFormat(locale, opts);
    const raw = fmt.format(d);
    const cleaned = raw.replace(/\./g, "");
    return cleaned[0]?.toUpperCase() + cleaned.slice(1);
  } catch {
    if (fieldFormat === "time")
      return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12: true });
    if (fieldFormat === "datetime") return d.toLocaleString(locale, { hour12: true });
    return d.toLocaleDateString(locale);
  }
};

/** Equality helpers */
const arrEquals = (a?: string[], b?: string[]) => {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
};

/** Component */
export default function FormatDateEdit(props: FieldProps) {
  const isFieldForm = props.isFieldForm ?? true;

  if (isFieldForm && props.field.isEditable === false) {
    return <></>;
  }

  const fid = `${props.field.tableIdentifier}-${props.field.identifier}-date`;
  const isMultiple = !!props.field.multiple;

  // Obtener valor inicial (session, record o default). Si multiple, normalizar a string[]
  const getInitialRaw = createMemo(() => {
    const sessionKey = 'val_' + (props.record?.id ?? props.field.tableIdentifier) + '_' + props.field.identifier;
    const sessionValue = store.watchSession(sessionKey)();
    const rec = props.record?.[props.field.identifier!];
    const def = props.field.default;

    const raw = sessionValue ?? (rec ?? def ?? (isMultiple ? [] : ""));

    if (isMultiple) {
      // Si viene array ya, devolver array de strings
      if (Array.isArray(raw)) return raw.map((x) => (x == null ? "" : String(x)));
      // Si viene null/"" -> []
      if (raw == null || raw === "") return [];
      // Si viene string (por compatibilidad) -> intentar parse; preferir split por coma si existe
      const s = String(raw);
      if (s.includes(",")) return s.split(",").map((x) => x.trim()).filter(Boolean);
      // single string -> single-element array
      return [s];
    } else {
      // single value -> string
      return raw == null ? "" : String(raw);
    }
  });

  // Signals
  const [value, setValue] = createSignal<string | string[]>(getInitialRaw());
  const [errors, setErrors] = createSignal<string[]>([]);
  const [modifiedFlag, setModifiedFlag] = createSignal<boolean>(false);
  const [isFocus, setIsFocus] = createSignal<boolean>(false);
  const [cursorPos, setCursorPos] = createSignal<number>(0);

  // Field format & placeholder
  const fieldFormat = (props.field.fieldFormat ?? "date") as "date" | "datetime" | "time";
  const fpFormat =
    props.field.storeData?.format ?? (fieldFormat === "datetime" ? "Y-m-d H:i" : fieldFormat === "time" ? "H:i" : "Y-m-d");
  const placeholder = fieldFormat === "datetime" ? "aaaa-mm-dd hh:mm" : fieldFormat === "time" ? "hh:mm" : "aaaa-mm-dd";

  // Min / Max
  const minRaw = createMemo(() => props.field.storeData?.min ?? props.field.storeData?.minDate ?? null);
  const maxRaw = createMemo(() => props.field.storeData?.max ?? props.field.storeData?.maxDate ?? null);
  const minDate = createMemo(() => parseToDate(minRaw() ?? null));
  const maxDate = createMemo(() => parseToDate(maxRaw() ?? null));

  // Width chars
  const widthChars = (() => {
    if (fieldFormat === "time") return 8;
    if (fieldFormat === "datetime") return 19;
    return 14;
  })();

  let inputEl: HTMLInputElement | undefined;
  let isReady = false;

  // setValueAndCache: almacena array o string en session según isMultiple
  const setValueAndCache = (val: string | string[]) => {
    const sessionKey = 'val_' + (props.record?.id ?? props.field.tableIdentifier) + '_' + props.field.identifier;

    // If multiple and val is array
    if (isMultiple) {
      const arr = Array.isArray(val) ? val.map((x) => (x == null ? "" : String(x))) : [];
      const current = Array.isArray(value()) ? (value() as string[]) : [];
      if (arrEquals(arr, current)) {
        // refresh TTL only
        store.setSession(sessionKey, arr, 250, 8 * 60 * 60 * 1000);
        return;
      }
      setValue(arr);
      store.setSession(sessionKey, arr, 250, 8 * 60 * 60 * 1000);
      return;
    }

    // Single
    const s = val == null ? "" : String(val);
    if (String(value() ?? "") === s) {
      store.setSession(sessionKey, s, 250, 8 * 60 * 60 * 1000);
      return;
    }
    setValue(s);
    store.setSession(sessionKey, s, 250, 8 * 60 * 60 * 1000);
  };

  // Validación (single o multiple)
  const validate = async (): Promise<boolean> => {
    if (!isReady) {
      isReady = true;
      return true;
    }
    const errs: string[] = [];

    if (isMultiple) {
      const arr = (value() as string[]) ?? [];
      if (props.field.isRequired && (!arr || arr.length === 0)) {
        errs.push("Es requerido");
        setErrors(errs);
        return false;
      }
      for (const v of arr) {
        if (!v) continue;
        const d = parseToDate(v);
        if (!d) {
          errs.push(`Fecha inválida: ${v}`);
          continue;
        }
        if (isFieldForm) {
          const minD = minDate();
          const maxD = maxDate();
          if (fieldFormat === "time") {
            if (minD) {
              if (minutesOfDay(d) < minutesOfDay(minD)) errs.push(`Hora anterior a ${pad2(minD.getHours())}:${pad2(minD.getMinutes())}`);
            }
            if (maxD) {
              if (minutesOfDay(d) > minutesOfDay(maxD)) errs.push(`Hora posterior a ${pad2(maxD.getHours())}:${pad2(maxD.getMinutes())}`);
            }
          } else {
            if (minD && d.getTime() < minD.getTime()) {
              const dateStr = minD.toISOString().slice(0, fieldFormat === "datetime" ? 16 : 10).replace("T", " ");
              errs.push(`${fieldFormat === "datetime" ? "Fecha/hora" : "Fecha"} anterior a ${dateStr}`);
            }
            if (maxD && d.getTime() > maxD.getTime()) {
              const dateStr = maxD.toISOString().slice(0, fieldFormat === "datetime" ? 16 : 10).replace("T", " ");
              errs.push(`${fieldFormat === "datetime" ? "Fecha/hora" : "Fecha"} posterior a ${dateStr}`);
            }
          }
        }
      }
    } else {
      const v = String(value() ?? "").trim();
      if (props.field.isRequired && (!v || v.length === 0)) {
        errs.push("Es requerido");
        setErrors(errs);
        return false;
      }
      if (v) {
        const d = parseToDate(v);
        if (!d) {
          if (fieldFormat === "time") errs.push("Hora inválida (HH:MM)");
          else if (fieldFormat === "datetime") errs.push("Fecha/Hora inválida (YYYY-MM-DD HH:MM)");
          else errs.push("Fecha inválida (YYYY-MM-DD)");
          setErrors(errs);
          return false;
        }

        if (isFieldForm) {
          const minD = minDate();
          const maxD = maxDate();
          if (fieldFormat === "time") {
            if (minD && minutesOfDay(d) < minutesOfDay(minD)) errs.push(`Hora anterior a ${pad2(minD.getHours())}:${pad2(minD.getMinutes())}`);
            if (maxD && minutesOfDay(d) > minutesOfDay(maxD)) errs.push(`Hora posterior a ${pad2(maxD.getHours())}:${pad2(maxD.getMinutes())}`);
          } else {
            if (minD && d.getTime() < minD.getTime()) {
              const dateStr = minD.toISOString().slice(0, fieldFormat === "datetime" ? 16 : 10).replace("T", " ");
              errs.push(`${fieldFormat === "datetime" ? "Fecha/hora" : "Fecha"} anterior a ${dateStr}`);
            }
            if (maxD && d.getTime() > maxD.getTime()) {
              const dateStr = maxD.toISOString().slice(0, fieldFormat === "datetime" ? 16 : 10).replace("T", " ");
              errs.push(`${fieldFormat === "datetime" ? "Fecha/hora" : "Fecha"} posterior a ${dateStr}`);
            }
          }
        }
      }
    }

    setErrors(errs);
    return errs.length === 0;
  };

  // Clear
  const onClear = () => {
    if (isMultiple) {
      setValueAndCache([]);
      props.onInput?.([]);
      setErrors([]);
      setModifiedFlag(false);
    } else {
      setValueAndCache("");
      props.onInput?.("");
      setErrors([]);
      setModifiedFlag(false);
    }
  };

  // Humanize
  const human = () => {
    if (isMultiple) {
      const arr = (value() as string[]) ?? [];
      if (!arr || arr.length === 0) return "";
      return arr
        .map((v) => {
          const d = parseToDate(v);
          return d ? humanizeWithOptions(d, props.field.storeData?.locale ?? "es-ES", false, fieldFormat) : v;
        })
        .join("; ");
    } else {
      const d = parseToDate(String(value() ?? ""));
      if (!d) return "";
      const containerWidth = inputEl?.parentElement?.parentElement?.clientWidth ?? widthChars * 8;
      const useLong = containerWidth > 160;
      return humanizeWithOptions(d, props.field.storeData?.locale ?? "es-ES", useLong, fieldFormat);
    }
  };

  const showClear = () => {
    if (isMultiple) return !props.field.isRequired && !!((value() as string[])?.length);
    return !props.field.isRequired && !!String(value())?.length;
  };

  // Placeholder helpers (same as before)
  function getGroupsWithRanges(placeholder: string) {
    const groups: { text: string; start: number; end: number; isSeparator: boolean }[] = [];
    let index = 0;
    for (const part of placeholder.split(/([^\w:]+)/)) {
      const start = index;
      const end = start + part.length;
      groups.push({
        text: part,
        start,
        end,
        isSeparator: /[^\w:]/.test(part),
      });
      index = end;
    }
    return groups;
  }

  function getHighlightedPlaceholder(placeholder: string, cursorPos: number): string {
    const groups = getGroupsWithRanges(placeholder);
    return groups
      .map((g) => {
        if (!g.isSeparator && cursorPos >= g.start && cursorPos <= g.end) {
          return `<b>${g.text}</b>`;
        }
        return g.text;
      })
      .join("");
  }

  // Handlers: focus / blur / keyup
  const handleFocus = async () => {
    setCursorPos(inputEl!.selectionEnd ?? inputEl!.value.length);
    setIsFocus(true);
    props.onFocus?.();
  };

  const handleBlur = async () => {
    setIsFocus(false);
    if (isMultiple) {
      // normalize items
      const arr = (value() as string[]) ?? [];
      const norm = arr.map((x) => String(x).replace(/\s{2,}/g, " ").trim()).filter(Boolean);
      setValueAndCache(norm);
      props.onInput?.(norm);
    } else {
      let v = String(value() ?? "");
      if (v) {
        if (fieldFormat === "time") {
          v = v.replace(/[:]{2,}/g, ":").trim();
        } else {
          v = v.replace(/[-\/]{2,}/g, "-").trim();
          v = v.replace(/\s{2,}/g, " ").trim();
        }
        setValueAndCache(v);
        props.onInput?.(v);
      }
    }
    await validate();
    props.onBlur?.();
  };

  const handleKeyUp = (e: Event) => {
    setCursorPos(inputEl!.selectionEnd ?? inputEl!.value.length);
    // props.onKeyUp?.(e);
  };

  // Debounce / change handlers
  let onInputTimeout: NodeJS.Timeout | null = null;

  // Single handlers
  const handleInputSingle = (val: string) => {
    if (val === (value() as string)) return;
    setValueAndCache(val);
    setModifiedFlag(val !== String(getInitialRaw()));
    props.onInput?.(val);
    if (onInputTimeout) clearTimeout(onInputTimeout);
    const captured = val;
    onInputTimeout = setTimeout(() => {
      if (captured !== (value() as string)) return;
      props.onChange?.(captured);
    }, 250);
  };

  const handleChangeSingle = (val: string) => {
    if (val === (value() as string)) return;
    if (onInputTimeout) clearTimeout(onInputTimeout);
    setValueAndCache(val);
    setModifiedFlag(val !== String(getInitialRaw()));
    props.onChange?.(val);
    validate();
  };

  // Multiple handlers
  const handleInputMultiple = (vals: string[]) => {
    const current = (value() as string[]) ?? [];
    if (arrEquals(current, vals)) return;
    setValueAndCache(vals);
    setModifiedFlag(!arrEquals(vals, (getInitialRaw() as string[])));
    props.onInput?.(vals);
    if (onInputTimeout) clearTimeout(onInputTimeout);
    const captured = vals.slice();
    onInputTimeout = setTimeout(() => {
      if (!arrEquals(captured, (value() as string[]))) return;
      props.onChange?.(captured);
    }, 250);
  };

  const handleChangeMultiple = (vals: string[]) => {
    const current = (value() as string[]) ?? [];
    if (arrEquals(current, vals)) return;
    if (onInputTimeout) clearTimeout(onInputTimeout);
    setValueAndCache(vals);
    setModifiedFlag(!arrEquals(vals, (getInitialRaw() as string[])));
    props.onChange?.(vals);
    validate();
  };

  // inputMode
  const inputMode = fieldFormat === "time" ? "tel" : "numeric";

  // Controller setup
  onMount(() => {
    const ctrl = props.controller;
    if (!ctrl) return;

    ctrl.target = inputEl;
    ctrl.validate = validate;
    ctrl.getValue = () => {
      return isMultiple ? ((value() as string[]) ?? []) : String(value() ?? "");
    };
    ctrl.reset = () => {
      const sessionKey = 'val_' + (props.record?.id ?? props.field.tableIdentifier) + '_' + props.field.identifier;
      store.deleteSession(sessionKey);
      const init = getInitialRaw();
      if (isMultiple) setValueAndCache(Array.isArray(init) ? (init as string[]) : []);
      else setValueAndCache(String(init ?? ""));
      setErrors([]);
      setModifiedFlag(false);
    };
  });

  onCleanup(() => {
    if (props.controller) {
      delete props.controller.validate;
      delete props.controller.getValue;
      delete props.controller.reset;
    }
  });

  // Sincronizar cambios externos (session/record) -> señal interna sin disparar onChange
  createEffect(() => {
    const raw = getInitialRaw();
    if (isMultiple) {
      const arr = Array.isArray(raw) ? (raw as string[]).map(String) : [];
      const curr = (value() as string[]) ?? [];
      if (!arrEquals(curr, arr)) {
        setValue(arr);
      }
    } else {
      const s = String(raw ?? "");
      if (String(value() ?? "") !== s) {
        setValue(s);
      }
    }
  });

  // DatePicker content chooser
  const DatePickerContent = () =>
    isMultiple ? (
      <DatePickerMultiple
        ref={(el: HTMLInputElement) => {
          // DatePickerMultiple uses the ref to expose input element
          inputEl = el;
        }}
        id={fid}
        value={(value() as string[]) ?? []}
        onChange={(vals: string[]) => handleChangeMultiple(vals)}
        onInput={(vals: string[]) => handleInputMultiple(vals)}
        dateFormat={fpFormat}
        fieldFormat={fieldFormat === "time" ? "date" : (fieldFormat as "date" | "datetime")}
        minDate={minDate() ?? undefined}
        maxDate={maxDate() ?? undefined}
        hasError={errors().length > 0}
        modified={modifiedFlag()}
        inputMode={inputMode as any}
        class={errors().length ? "error" : ""}
      />
    ) : (
      <DatePicker
        ref={(el) => {
          inputEl = el;
        }}
        id={fid}
        value={String(value() ?? "")}
        onChange={(v: string) => handleChangeSingle(v)}
        onInput={(v: string) => handleInputSingle(v)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyUp={handleKeyUp}
        onClick={handleKeyUp}
        placeholder={placeholder}
        dateFormat={fpFormat}
        fieldFormat={fieldFormat}
        minDate={minDate() ?? undefined}
        maxDate={maxDate() ?? undefined}
        hasError={errors().length > 0}
        modified={modifiedFlag()}
        inputMode={inputMode}
        class={errors().length ? "error" : ""}
      />
    );

  // Render
  if (isFieldForm) {
    return (
      <div class="form-group field-date">
        <label for={fid} class="field-label" title={props.field.description}>
          {props.field.name}
          {props.field.isRequired && <span class="required-asterisk"> *</span>}
        </label>

        <div class={`input-container ${modifiedFlag() ? "modified" : ""}`} style={{ display: "flex", "align-items": "center", gap: "8px" }}>
          <div style={{ position: "relative", display: "inline-block" }}>
            {DatePickerContent()}

            <Show when={isFocus()}>
              <span class="absolute input-header-hint" innerHTML={getHighlightedPlaceholder(placeholder, cursorPos())}></span>
            </Show>

            <Show when={showClear()}>
              <button
                type="button"
                class="input-clear absolute inset-y-0 right-2 flex items-center text-xs text-gray-400 transition-colors hover:text-red-500"
                title="Limpiar"
                onClick={onClear}
              >
                ✕
              </button>
            </Show>
          </div>

          <div class="date-humanized" aria-hidden="true" style={{ color: "#6b7280", "font-size": "0.95rem", "white-space": "nowrap" }}>
            <i>{human() || <span style={{ color: "#c4c4c4" }}></span>}</i>
          </div>
        </div>

        <Show when={errors().length > 0}>
          <div class="field-error">{errors().join(". ")}</div>
        </Show>
      </div>
    );
  } else {
    return (
      <div title={errors().length > 0 ? errors().join(". ") : undefined}>
        {DatePickerContent()}
      </div>
    );
  }
}
