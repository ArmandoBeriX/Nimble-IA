// DatePicker.tsx
import { createSignal, onCleanup, onMount, Show } from "solid-js";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import Icon from "../../../ui/icon/Icon";

export interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  onInput?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyUp?: (e: Event) => void;
  onClick?: (e: Event) => void;
  placeholder?: string;
  dateFormat: string;
  fieldFormat: "date" | "datetime" | "time";
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  hasError?: boolean;
  modified?: boolean;
  class?: string;
  id?: string;
  ref?: (el: HTMLInputElement) => void;
  // nuevo: recibe si el campo es requerido para mostrar/ocultar botones limpiar
  isRequired?: boolean;
}

type Sec = {
  name: string;
  start: number;
  end: number;
  min: number;
  max: number;
  pad: number;
  wrap: boolean;
};

const SECTIONS: Record<string, Sec[]> = {
  date: [
    { name: "year", start: 0, end: 4, min: 1000, max: 9999, pad: 4, wrap: false },
    { name: "month", start: 5, end: 7, min: 1, max: 12, pad: 2, wrap: true },
    { name: "day", start: 8, end: 10, min: 1, max: 31, pad: 2, wrap: true },
  ],
  datetime: [
    { name: "year", start: 0, end: 4, min: 1000, max: 9999, pad: 4, wrap: false },
    { name: "month", start: 5, end: 7, min: 1, max: 12, pad: 2, wrap: true },
    { name: "day", start: 8, end: 10, min: 1, max: 31, pad: 2, wrap: true },
    { name: "hour", start: 11, end: 13, min: 0, max: 23, pad: 2, wrap: true },
    { name: "minute", start: 14, end: 16, min: 0, max: 59, pad: 2, wrap: true },
  ],
  time: [
    { name: "hour", start: 0, end: 2, min: 0, max: 23, pad: 2, wrap: true },
    { name: "minute", start: 3, end: 5, min: 0, max: 59, pad: 2, wrap: true },
  ],
};

const TEMPLATES: Record<string, string> = {
  date: "2000-01-01",
  datetime: "2000-01-01 00:00",
  time: "00:00",
};

const ERROR_LABELS: Record<string, string> = {
  date: "Fecha inválida",
  datetime: "Fecha y hora inválida",
  time: "Hora inválida",
};

const DatePicker = (props: DatePickerProps) => {
  let inputEl: HTMLInputElement | undefined;
  let fpInstance: flatpickr.Instance | null = null;
  let lastExternalValue = props.value;

  const [inputError, setInputError] = createSignal<string | null>(null);
  const [isFocused, setIsFocused] = createSignal(false);
  const [cursorPos, setCursorPos] = createSignal(0);

  let secIdx = 0;
  let digitBuffer = "";

  const secs = () => SECTIONS[props.fieldFormat] ?? SECTIONS.date;

  const baseStr = (): string =>
    inputEl && inputEl.value && inputEl.value.length >= TEMPLATES[props.fieldFormat].length
      ? inputEl.value
      : TEMPLATES[props.fieldFormat];

  const replaceSec = (idx: number, num: number, raw?: string): string => {
    const s = secs()[idx];
    const val = raw ?? String(Math.max(s.min, Math.min(s.max, num))).padStart(s.pad, "0");
    const base = baseStr();
    return base.slice(0, s.start) + val.slice(0, s.pad) + base.slice(s.end);
  };

  const readSec = (idx: number): number => {
    const s = secs()[idx];
    return parseInt(inputEl!.value.slice(s.start, s.end)) || s.min;
  };

  const selectSec = (idx: number) => {
    const ss = secs();
    idx = Math.max(0, Math.min(ss.length - 1, idx));
    secIdx = idx;
    digitBuffer = "";
    const s = ss[idx];
    requestAnimationFrame(() => {
      if (!inputEl) return;
      inputEl.focus();
      inputEl.setSelectionRange(s.start, s.end);
      setCursorPos(inputEl.selectionEnd ?? 0);
    });
  };

  const secForCursor = (pos: number): number => {
    const ss = secs();
    for (let i = 0; i < ss.length; i++) {
      if (pos < ss[i].end) return i;
    }
    return ss.length - 1;
  };

  const tryParse = (val: string): Date | null => {
    if (!fpInstance || !val) return null;
    try {
      const d = fpInstance.parseDate(val, props.dateFormat);
      return d && !isNaN(d.getTime()) ? d : null;
    } catch {
      return null;
    }
  };

  const emitIfValid = (val: string) => {
    const parsed = tryParse(val);
    if (parsed) {
      setInputError(null);
      const formatted = fpInstance!.formatDate(parsed, props.dateFormat);
      lastExternalValue = formatted;
      props.onInput?.(formatted);
      props.onChange(formatted);
    }
  };

  // placeholder text fallback
  const placeholderText = () => props.placeholder ?? TEMPLATES[props.fieldFormat];

  // placeholder highlighting util (copiado)
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

  onMount(() => {
    if (!inputEl) return;

    const options: flatpickr.Options.Options = {
      dateFormat: props.dateFormat,
      clickOpens: false,
      allowInput: true,
      defaultDate: props.value || undefined,
      onChange: (_dates, str) => {
        setInputError(null);
        lastExternalValue = str;
        inputEl!.value = str;
        props.onInput?.(str);
        props.onChange(str);
      },
      onClose: () => {
        if (inputEl!.value) selectSec(0);
        props.onBlur?.();
      },
      onReady: () => {
        if (!fpInstance) return;
        // añadir botón Aceptar para time/datetime
        if (props.fieldFormat === "time" || props.fieldFormat === "datetime") {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.textContent = "Aceptar";
          btn.className = "w-full mt-2 py-1 rounded bg-blue-600 text-white text-sm";
          btn.addEventListener("click", () => fpInstance?.close());
          fpInstance.calendarContainer?.appendChild(btn);
        }

        // añadir botón Limpiar al picker si el campo NO es requerido
        if (!props.isRequired) {
          const clearBtn = document.createElement("button");
          clearBtn.type = "button";
          clearBtn.textContent = "Limpiar";
          clearBtn.className = "w-full mt-2 py-1 rounded bg-gray-200 text-sm text-gray-700";
          clearBtn.addEventListener("click", () => {
            try {
              inputEl!.value = "";
              setInputError(null);
              props.onInput?.("");
              props.onChange?.("");
            } catch { }
            fpInstance?.close();
          });
          fpInstance.calendarContainer?.appendChild(clearBtn);
        }
      },
    };

    if (props.fieldFormat === "datetime") {
      (options as any).enableTime = true;
      (options as any).time_24hr = true;
    } else if (props.fieldFormat === "time") {
      (options as any).enableTime = true;
      (options as any).noCalendar = true;
      (options as any).time_24hr = true;
    }
    if (props.minDate) (options as any).minDate = props.minDate;
    if (props.maxDate) (options as any).maxDate = props.maxDate;

    (options as any).appendTo = document.body;

    fpInstance = flatpickr(inputEl, options);

    if (props.value) inputEl.value = props.value;
  });

  let prevPropsValue = props.value;
  const maybeSyncExternal = () => {
    const v = props.value;
    if (v === prevPropsValue) return;
    prevPropsValue = v;
    if (document.activeElement === inputEl) return;
    if (v) {
      try {
        fpInstance?.setDate(v, false);
      } catch { }
      if (inputEl) inputEl.value = v;
      lastExternalValue = v;
    } else {
      try {
        fpInstance?.clear();
      } catch { }
      if (inputEl) inputEl.value = "";
      lastExternalValue = "";
    }
    setInputError(null);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const ss = secs();
    const s = ss[secIdx];

    if (e.key >= "0" && e.key <= "9") {
      e.preventDefault();
      if (!inputEl!.value) {
        inputEl!.value = TEMPLATES[props.fieldFormat];
      }

      digitBuffer += e.key;
      const bufNum = parseInt(digitBuffer);

      const partial = digitBuffer.padStart(s.pad, "0").slice(-s.pad);
      inputEl!.value = replaceSec(secIdx, 0, partial);
      inputEl!.setSelectionRange(s.start, s.end);

      const advance = digitBuffer.length >= s.pad || bufNum * 10 > s.max;

      if (advance) {
        const clamped = Math.max(s.min, Math.min(s.max, bufNum));
        inputEl!.value = replaceSec(secIdx, clamped);
        emitIfValid(inputEl!.value);
        digitBuffer = "";
        if (secIdx < ss.length - 1) {
          selectSec(secIdx + 1);
        } else {
          inputEl!.setSelectionRange(s.start, s.end);
        }
      }
      return;
    }

    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        selectSec(secIdx - 1);
        break;

      case "ArrowRight":
        e.preventDefault();
        selectSec(secIdx + 1);
        break;

      case "Tab":
        if (!e.shiftKey && secIdx < ss.length - 1) {
          e.preventDefault();
          selectSec(secIdx + 1);
        } else if (e.shiftKey && secIdx > 0) {
          e.preventDefault();
          selectSec(secIdx - 1);
        }
        break;

      case "ArrowUp": {
        e.preventDefault();
        if (!inputEl!.value) inputEl!.value = TEMPLATES[props.fieldFormat];
        const cur = readSec(secIdx);
        const next = s.wrap ? (cur >= s.max ? s.min : cur + 1) : Math.min(cur + 1, s.max);
        inputEl!.value = replaceSec(secIdx, next);
        emitIfValid(inputEl!.value);
        inputEl!.setSelectionRange(s.start, s.end);
        break;
      }

      case "ArrowDown": {
        e.preventDefault();
        if (!inputEl!.value) inputEl!.value = TEMPLATES[props.fieldFormat];
        const cur = readSec(secIdx);
        const next = s.wrap ? (cur <= s.min ? s.max : cur - 1) : Math.max(cur - 1, s.min);
        inputEl!.value = replaceSec(secIdx, next);
        emitIfValid(inputEl!.value);
        inputEl!.setSelectionRange(s.start, s.end);
        break;
      }

      case "Backspace":
        e.preventDefault();
        if (digitBuffer.length > 0) {
          digitBuffer = digitBuffer.slice(0, -1);
          if (digitBuffer.length === 0 && secIdx > 0) selectSec(secIdx - 1);
        } else if (secIdx > 0) {
          selectSec(secIdx - 1);
        }
        break;

      case "Delete":
        e.preventDefault();
        digitBuffer = "";
        inputEl!.value = replaceSec(secIdx, s.min);
        inputEl!.setSelectionRange(s.start, s.end);
        break;

      case "Escape":
        fpInstance?.close();
        inputEl?.blur();
        break;
    }
  };

  const onClick = (e: MouseEvent) => {
    if (!inputEl?.value) return;
    setTimeout(() => {
      if (!inputEl) return;
      const pos = inputEl.selectionStart ?? 0;
      selectSec(secForCursor(pos));
      setCursorPos(pos);
    }, 0);
    props.onClick?.(e);
  };

  const onFocus = () => {
    if (inputEl?.value) {
      setTimeout(() => {
        if (!inputEl) return;
        const pos = inputEl.selectionStart ?? 0;
        selectSec(secForCursor(pos));
        setCursorPos(pos);
      }, 0);
    }
    setIsFocused(true);
    props.onFocus?.();
  };

  const onBlur = () => {
    digitBuffer = "";
    const val = inputEl?.value ?? "";
    if (val) {
      const parsed = tryParse(val);
      setInputError(parsed ? null : ERROR_LABELS[props.fieldFormat] || "Formato inválido");
    } else {
      setInputError(null);
    }
    setIsFocused(false);
    props.onBlur?.();
  };

  const onKeyUp = (e: Event) => {
    const pos = inputEl?.selectionEnd ?? 0;
    setCursorPos(pos);
    props.onKeyUp?.(e);
  };

  onCleanup(() => {
    try {
      fpInstance?.destroy();
    } catch { }
  });

  const inputCls = () =>
    [
      "form-input",
      props.hasError || inputError() ? "error" : "",
      props.modified ? "modified" : "",
      props.class ?? "",
    ]
      .filter(Boolean)
      .join(" ");

  // render
  return (
    <div class="w-full">
      {/* floating legend centered above the input line */}
      <div class="relative">
        <div class="absolute -translate-y-1/2 bg-white px-1 text-xs text-gray-500 select-none pointer-events-none truncate max-w-[calc(100%-12px)] left-1.5" style="z-index: 1;">
          {placeholderText()}
        </div>

        <div class="relative flex items-center">
          <input
            ref={(el) => {
              inputEl = el;
              props.ref?.(el);
            }}
            type="text"
            id={props.id}
            class={`${inputCls()} w-full pr-6!`} /* pr-20 deja sitio para botones */
            placeholder={props.placeholder ?? TEMPLATES[props.fieldFormat]}
            disabled={props.disabled}
            onKeyDown={onKeyDown}
            onFocus={onFocus}
            onBlur={onBlur}
            onClick={onClick}
            onKeyUp={onKeyUp}
          />

          <div>
            {/* Clear button (visible only if !isRequired). Se coloca a la izquierda del icono */}
            <Show when={!props.isRequired}>
              <button
                type="button"
                class="absolute right-7 top-1/2 transform -translate-y-1/2 text-sm p-0.5 rounded text-gray-400 hover:bg-gray-100 focus:outline-none"
                title="Limpiar"
                onClick={() => {
                  try {
                    inputEl!.value = "";
                    setInputError(null);
                    props.onInput?.("");
                    props.onChange("");
                  } catch { }
                  // si el calendario estaba abierto, cerrarlo
                  if (fpInstance?.isOpen) fpInstance.close();
                }}
              >
                <Icon name="x" stroke="currentColor" />
              </button>
            </Show>

            {/* Calendar / clock icon */}
            <button
              type="button"
              tabIndex={-1}
              disabled={props.disabled}
              class="absolute right-2 top-1/2 transform -translate-y-1/2 bg-transparent border-none cursor-pointer text-gray-400 p-0"
              onMouseDown={(e) => {
                e.preventDefault();
                maybeSyncExternal();
                if (fpInstance?.isOpen) {
                  fpInstance.close();
                } else {
                  requestAnimationFrame(() => {
                    inputEl?.focus();
                    fpInstance?.open();
                  });
                }
              }}
            // innerHTML={iconSVG}
            >
              <Icon name={props.fieldFormat} stroke="currentColor" />
            </button>
          </div>

        </div>
      </div>

      <Show when={inputError()}>
        <div class="field-error mt-1 text-sm">{inputError()}</div>
      </Show>
    </div>
  );
};

export default DatePicker;