import { createEffect, onCleanup, onMount, Show, createSignal } from "solid-js";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";

export interface DatePickerMultipleProps {
  value: string[];
  onChange: (values: string[]) => void;
  onInput?: (values: string[]) => void;
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
  inputMode?: "text" | "tel" | "numeric";
  ref?: (el: HTMLInputElement) => void;
  // nuevo: permite saber si el campo es requerido para mostrar/ocultar botones Limpiar
  isRequired?: boolean;
}

const DatePickerMultiple = (props: DatePickerMultipleProps) => {
  let inputEl: HTMLInputElement | undefined;
  let fpInstance: flatpickr.Instance | null = null;
  let isSyncing = false;
  // Track last synced value to avoid redundant setDate calls
  let lastSyncedKey = "";

  const [isFocused, setIsFocused] = createSignal(false);

  const valueKey = (arr: string[]) => (arr ?? []).join(",");
  const valueToDisplay = (arr: string[]) => (arr ?? []).join(", ");
  const displayToArray = (s: string) => (s ?? "").split(",").map((v) => v.trim()).filter(Boolean);

  // Helper to safely set fpInstance date without retriggering onChange handlers
  const setFpDatesFromProps = (arr: string[]) => {
    if (!fpInstance) return;
    try {
      isSyncing = true;
      if (arr && arr.length) {
        fpInstance.setDate(arr, false);
        if (inputEl) inputEl.value = valueToDisplay(arr);
      } else {
        fpInstance.clear();
        if (inputEl) inputEl.value = "";
      }
      lastSyncedKey = valueKey(arr ?? []);
    } catch {
      // ignore flatpickr errors on partial values
    } finally {
      isSyncing = false;
    }
  };

  const maybeSyncExternal = () => {
    // Keep parity with parent props.value (used when user opens picker)
    const incoming = props.value ?? [];
    const key = valueKey(incoming);
    if (key === lastSyncedKey) return;
    // If input is focused, skip to avoid interrupting user
    if (document.activeElement === inputEl) return;
    // Prevent syncing partial values (flatpickr can throw on short strings)
    const minLengthForFormat: Record<string, number> = { date: 10, datetime: 16, time: 5 };
    const minLen = minLengthForFormat[props.fieldFormat] ?? 5;
    if (incoming.some(v => v.length < minLen)) return;
    setFpDatesFromProps(incoming);
  };

  onMount(() => {
    if (!inputEl) return;

    const options: flatpickr.Options.Options = {
      dateFormat: props.dateFormat,
      allowInput: true,
      mode: "multiple",
      clickOpens: false, // we'll control opening with the icon
      onChange: (_dates, _dateStr) => {
        if (isSyncing) return;
        // flatpickr updates inputEl.value automatically, but keep consistent
        const arr = displayToArray(inputEl?.value ?? "");
        props.onChange(arr);
      },
      onClose: () => props.onBlur?.(),
      onOpen: () => {
        // sync before opening
        maybeSyncExternal();
      },
      onReady: () => {
        if (!fpInstance) return;

        // add "Limpiar" button inside the picker if allowed
        if (!props.isRequired) {
          const clearBtn = document.createElement("button");
          clearBtn.type = "button";
          clearBtn.textContent = "Limpiar";
          clearBtn.className = "w-full mt-2 py-1 rounded bg-gray-200 text-sm text-gray-700";
          clearBtn.addEventListener("click", () => {
            try {
              if (inputEl) inputEl.value = "";
              props.onInput?.([]);
              props.onChange?.([]);
            } catch {}
            fpInstance?.close();
          });
          fpInstance.calendarContainer?.appendChild(clearBtn);
        }
      },
    };

    if (props.fieldFormat === "datetime") {
      Object.assign(options, { enableTime: true, time_24hr: true });
    } else if (props.fieldFormat === "time") {
      Object.assign(options, { enableTime: true, noCalendar: true, time_24hr: true });
    }

    if (props.minDate) (options as any).minDate = props.minDate;
    if (props.maxDate) (options as any).maxDate = props.maxDate;

    (options as any).appendTo = document.body;

    fpInstance = flatpickr(inputEl, options);

    // Seed initial value
    try {
      isSyncing = true;
      if (props.value?.length) {
        fpInstance.setDate(props.value, false);
        if (inputEl) inputEl.value = valueToDisplay(props.value);
      } else {
        fpInstance.clear();
        if (inputEl) inputEl.value = "";
      }
      lastSyncedKey = valueKey(props.value ?? []);
    } finally {
      isSyncing = false;
    }
  });

  const minLengthForFormat: Record<string, number> = {
    date: 10,
    datetime: 16,
    time: 5,
  };

  createEffect(() => {
    if (!fpInstance) return;

    try { fpInstance.set("minDate", props.minDate); } catch {}
    try { fpInstance.set("maxDate", props.maxDate); } catch {}

    if (document.activeElement === inputEl) return;

    const incoming = props.value ?? [];
    const key = valueKey(incoming);
    if (key === lastSyncedKey) return;

    // Skip partial entries
    const minLen = minLengthForFormat[props.fieldFormat] ?? 5;
    if (incoming.some(v => v.length < minLen)) return;

    setFpDatesFromProps(incoming);
  });

  const allowedKeys: Record<string, RegExp> = {
    date: /[\d\-\/,]/,
    datetime: /[\d\-\/ :,]/,
    time: /[\d:,]/,
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    if (k.length === 1 && !allowedKeys[props.fieldFormat].test(k)) { e.preventDefault(); return; }
    const nav = ["Backspace","Delete","ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End","Tab","Enter"];
    if (k.length > 1 && !nav.includes(k)) e.preventDefault();
  };

  const sanitizePatterns: Record<string, RegExp> = {
    date: /[^\d\-\/,]/g,
    datetime: /[^\d\-\/ :T,]/g,
    time: /[^\d:,]/g,
  };

  const onPaste = (e: ClipboardEvent) => {
    const txt = e.clipboardData?.getData("text") ?? "";
    const sanitized = txt.replace(sanitizePatterns[props.fieldFormat], "");
    if (sanitized === txt) return;
    e.preventDefault();
    const el = inputEl!;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const newVal = el.value.slice(0, start) + sanitized + el.value.slice(end);
    el.value = newVal;
    el.setSelectionRange(start + sanitized.length, start + sanitized.length);
    props.onInput?.(displayToArray(newVal));
  };

  onCleanup(() => { try { fpInstance?.destroy(); } catch {} });

  // placeholder text fallback (keeps same behaviour as other picker)
  const placeholderText = () => props.placeholder ?? (props.fieldFormat === "datetime" ? "2000-01-01 00:00" : (props.fieldFormat === "time" ? "00:00" : "2000-01-01"));

  // helper for classes similar to other components
  const inputCls = () =>
    [
      "form-input",
      props.hasError ? "error" : "",
      props.modified ? "modified" : "",
      props.class ?? "",
    ].filter(Boolean).join(" ");

  // calendar/clock svg
  const iconSVG =
    props.fieldFormat === "time"
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;

  // open/close handler for icon (keeps sync with external props)
  const togglePicker = (e?: MouseEvent) => {
    e?.preventDefault();
    maybeSyncExternal();
    if (fpInstance?.isOpen) fpInstance.close();
    else {
      // open in next tick to avoid blur races
      requestAnimationFrame(() => {
        inputEl?.focus();
        fpInstance?.open();
      });
    }
  };

  return (
    <div class="w-full">
      {/* floating legend centered above the input line */}
      <div class="relative">
        <div class="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-1 text-xs text-gray-500 select-none pointer-events-none">
          {placeholderText()}
        </div>

        <div class="relative flex items-center">
          <input
            ref={el => { inputEl = el; props.ref?.(el); }}
            type="text"
            id={props.id}
            value={props.value?.length ? valueToDisplay(props.value) : ""}
            placeholder={props.placeholder}
            inputMode={props.inputMode}
            disabled={props.disabled}
            class={`${inputCls()} w-full pr-20`}
            style={{ width: "100%" }}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            onInput={e => {
              const v = (e.target as HTMLInputElement).value;
              props.onInput?.(displayToArray(v));
            }}
            onFocus={() => { setIsFocused(true); props.onFocus?.(); }}
            onBlur={() => { setIsFocused(false); props.onBlur?.(); }}
            onKeyUp={props.onKeyUp}
            onClick={props.onClick}
          />

          {/* Clear button (visible only if !isRequired). Placed left of the calendar icon (right-10) */}
          <Show when={!props.isRequired}>
            <button
              type="button"
              class="absolute right-10 top-1/2 transform -translate-y-1/2 text-sm px-2 py-1 rounded hover:bg-gray-100 focus:outline-none"
              title="Limpiar"
              onClick={() => {
                try {
                  if (inputEl) inputEl.value = "";
                  props.onInput?.([]);
                  props.onChange?.([]);
                } catch {}
                if (fpInstance?.isOpen) fpInstance.close();
              }}
            >
              ✕
            </button>
          </Show>

          {/* Calendar / clock icon */}
          <button
            type="button"
            tabIndex={-1}
            disabled={props.disabled}
            class="absolute right-2 top-1/2 transform -translate-y-1/2 bg-transparent border-none cursor-pointer text-gray-400 p-0"
            onMouseDown={(e) => {
              // prevent blur and toggle
              e.preventDefault();
              togglePicker(e as MouseEvent);
            }}
            innerHTML={iconSVG}
          />
        </div>
      </div>
    </div>
  );
};

export default DatePickerMultiple;