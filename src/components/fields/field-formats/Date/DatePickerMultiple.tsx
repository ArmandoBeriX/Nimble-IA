import { createEffect, onCleanup, onMount } from 'solid-js';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.css';

export interface DatePickerMultipleProps {
  value: string[];                       // array of strings (formatted according to dateFormat)
  onChange: (values: string[]) => void;  // called when user changes selection
  onInput?: (values: string[]) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyUp?: (e: Event) => void;
  onClick?: (e: Event) => void;

  placeholder?: string;
  dateFormat: string;
  fieldFormat: 'date' | 'datetime' | 'time';
  minDate?: Date;
  maxDate?: Date;

  disabled?: boolean;
  hasError?: boolean;
  modified?: boolean;
  class?: string;
  id?: string;
  inputMode?: "text" | "tel" | "numeric";

  ref?: (el: HTMLInputElement) => void;
  // optional: allow duplicates? for now false
}

const DatePickerMultiple = (props: DatePickerMultipleProps) => {
  let inputEl: HTMLInputElement | undefined;
  let fpInstance: flatpickr.Instance | null = null;
  let isSyncing = false;

  // Helper: convert incoming value array to input string (flatpickr shows dateStr)
  const valueToInputString = (arr: string[]) => (arr && arr.length ? arr.join(', ') : '');

  onMount(() => {
    if (!inputEl) return;

    const options: flatpickr.Options.Options = {
      dateFormat: props.dateFormat,
      allowInput: true,
      mode: 'multiple',
      // Note: don't set defaultDate here in controlled component
      onChange: (_dates, dateStr) => {
        if (isSyncing) return;
        // flatpickr gives us both dates and dateStr; use dates formatted as flatpickr would
        // We will read the inputEl.value to keep consistent formatting with flatpickr UI
        const input = inputEl?.value ?? dateStr;
        // split by comma, trimming whitespace
        const arr = input.split(',').map(s => s.trim()).filter(Boolean);
        props.onChange(arr);
      },
      onClose: () => {
        props.onBlur?.();
      },
      onReady: () => {
        if (!fpInstance) return;
        // No accept button for multiple by default; leave as-is.
      },
    };

    // Configurar según el tipo de campo
    if (props.fieldFormat === 'datetime') {
      Object.assign(options, {
        enableTime: true,
        time_24hr: true,
      });
    } else if (props.fieldFormat === 'time') {
      Object.assign(options, {
        enableTime: true,
        noCalendar: true,
        time_24hr: true,
      });
    } else {
      options.enableTime = false;
      options.noCalendar = false;
    }

    if (props.minDate) (options as any).minDate = props.minDate;
    if (props.maxDate) (options as any).maxDate = props.maxDate;

    fpInstance = flatpickr(inputEl, options);

    // Initialize the input text so it matches props.value from start
    try {
      isSyncing = true;
      if (props.value && props.value.length) {
        fpInstance.setDate(props.value, false);
      } else {
        fpInstance.clear();
      }
    } finally {
      isSyncing = false;
    }
  });

  createEffect(() => {
    if (!fpInstance) return;

    try {
      fpInstance.set('minDate', props.minDate);
      fpInstance.set('maxDate', props.maxDate);
    } catch {}

    // if focused, don't clobber user's edit
    if (document.activeElement === inputEl) return;

    try {
      isSyncing = true;
      if (props.value && props.value.length) {
        // setDate accepts array of date strings or Date objects
        fpInstance.setDate(props.value, false);
        // ensure input shows the same join format
        if (inputEl) inputEl.value = valueToInputString(props.value);
      } else {
        fpInstance.clear();
      }
    } finally {
      isSyncing = false;
    }
  });

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    let allowed: RegExp;

    if (props.fieldFormat === 'time') allowed = /[\d:]/;
    else if (props.fieldFormat === 'datetime') allowed = /[\d\-\/ :]/;
    else allowed = /[\d\-\/]/;

    if (k.length === 1 && !allowed.test(k)) {
      e.preventDefault();
      return;
    }

    const allowedKeys = [
      'Backspace', 'Delete',
      'ArrowLeft', 'ArrowRight',
      'ArrowUp', 'ArrowDown',
      'Home', 'End', 'Tab', 'Enter'
    ];

    if (!allowedKeys.includes(k)) e.preventDefault();
  };

  const onPaste = (e: ClipboardEvent) => {
    const txt = e.clipboardData?.getData('text') ?? '';
    let sanitized = txt;
    if (props.fieldFormat === 'time') sanitized = txt.replace(/[^\d:]/g, '');
    else if (props.fieldFormat === 'datetime') sanitized = txt.replace(/[^\d\-\/ :T]/g, '');
    else sanitized = txt.replace(/[^\d\-\/,]/g, ''); // allow commas for multiple
    if (sanitized !== txt) {
      e.preventDefault();
      const el = inputEl!;
      const start = el.selectionStart ?? 0;
      const end = el.selectionEnd ?? 0;
      const val = el.value.slice(0, start) + sanitized + el.value.slice(end);
      el.value = val;
      const pos = start + sanitized.length;
      el.setSelectionRange(pos, pos);
      // notify parent as array
      const arr = val.split(',').map(s => s.trim()).filter(Boolean);
      props.onInput?.(arr);
    }
  };

  onCleanup(() => {
    try {
      fpInstance?.destroy();
    } catch {}
  });

  return (
    <input
      ref={(el) => {
        inputEl = el;
        props.ref?.(el);
      }}
      type="text"
      id={props.id}
      value={props.value && props.value.length ? props.value.join(', ') : ''}
      placeholder={props.placeholder}
      inputMode={props.inputMode}
      disabled={props.disabled}
      class={`form-input ${props.hasError ? 'error' : ''} ${props.modified ? 'modified' : ''} ${props.class ?? ''}`}
      style={{ width: '100%' }}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      onInput={(e) => {
        // convert to array and forward as "input" (user typing)
        const v = (e.target as HTMLInputElement).value;
        const arr = v.split(',').map(s => s.trim()).filter(Boolean);
        props.onInput?.(arr);
      }}
      onFocus={props.onFocus}
      onBlur={props.onBlur}
      onKeyUp={props.onKeyUp}
      onClick={props.onClick}
    />
  );
};

export default DatePickerMultiple;
