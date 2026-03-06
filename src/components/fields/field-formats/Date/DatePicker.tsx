import { createEffect, onCleanup, onMount } from 'solid-js';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.css';

export interface DatePickerProps {
  // Valor y cambio
  value: string;
  onChange: (value: string) => void;
  onInput?: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyUp?: (e: Event) => void;
  onClick?: (e: Event) => void;

  // Configuración
  placeholder?: string;
  dateFormat: string;
  fieldFormat: 'date' | 'datetime' | 'time';
  minDate?: Date;
  maxDate?: Date;
  
  // Estado visual
  disabled?: boolean;
  hasError?: boolean;
  modified?: boolean;
  class?: string;
  id?: string;
  inputMode?: "text" | "tel" | "numeric";
  
  // Referencia del input
  ref?: (el: HTMLInputElement) => void;
}

const DatePicker = (props: DatePickerProps) => {
  let inputEl: HTMLInputElement | undefined;
  let fpInstance: flatpickr.Instance | null = null;

  // Inicializar flatpickr
  onMount(() => {
    if (!inputEl) return;

    const options: flatpickr.Options.Options = {
      dateFormat: props.dateFormat,
      allowInput: true,
      defaultDate: props.value || undefined,
      onChange: (dates, str) => {
        props.onChange(str);
      },
      onClose: () => {
        props.onBlur?.();
      },
      onReady: () => {
        if (!fpInstance) return;

        // Agregar botón "Aceptar" si es time o datetime
        if (props.fieldFormat === 'time' || props.fieldFormat === 'datetime') {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.textContent = 'Aceptar';
          btn.style.cssText = `
            display: block;
            width: 100%;
            margin-top: 5px;
            padding: 4px 0;
            background-color: #3b82f6;
            color: white;
            border: none;
            border-radius: 3px;
            cursor: pointer;
          `;
          btn.addEventListener('click', () => {
            fpInstance?.close();
          });

          const calendarEl = fpInstance.calendarContainer;
          if (calendarEl) {
            calendarEl.appendChild(btn);
          }
        }
      },
    };

    // Configurar según el tipo de campo
    if (props.fieldFormat === 'datetime') {
      (options as any).enableTime = true;
      (options as any).time_24hr = true;
    } else if (props.fieldFormat === 'time') {
      (options as any).enableTime = true;
      (options as any).noCalendar = true;
      (options as any).time_24hr = true;
    } else {
      options.enableTime = false;
      options.noCalendar = false;
    }

    // Configurar min/max
    if (props.minDate) (options as any).minDate = props.minDate;
    if (props.maxDate) (options as any).maxDate = props.maxDate;

    fpInstance = flatpickr(inputEl, options);
  });

  // Sincronizar cambios en props
  createEffect(() => {
    if (!fpInstance) return;

    // Sincronizar min/max
    try {
      fpInstance.set('minDate', props.minDate);
      fpInstance.set('maxDate', props.maxDate);
    } catch {}

    // Sincronizar valor (solo si no está enfocado)
    if (document.activeElement !== inputEl) {
      try {
        if (props.value) {
          fpInstance.setDate(props.value, false);
        } else {
          fpInstance.clear();
        }
      } catch {}
    }
  });

  // Manejar eventos de teclado
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;

    // Definir caracteres permitidos según el formato
    let allowedSingle: RegExp;
    if (props.fieldFormat === 'time') {
      allowedSingle = /[\d:]/;
    } else if (props.fieldFormat === 'datetime') {
      allowedSingle = /[\d\-\/ :]/;
    } else {
      allowedSingle = /[\d\-\/]/;
    }

    if (k.length === 1) {
      if (!allowedSingle.test(k)) {
        e.preventDefault();
      }
      return;
    }

    // Permitir teclas de navegación
    if (
      k === 'Backspace' ||
      k === 'Delete' ||
      k === 'ArrowLeft' ||
      k === 'ArrowRight' ||
      k === 'ArrowUp' ||
      k === 'ArrowDown' ||
      k === 'Home' ||
      k === 'End' ||
      k === 'Tab' ||
      k === 'Enter'
    ) {
      return;
    }
    e.preventDefault();
  };

  // Manejar pegado
  const onPaste = (e: ClipboardEvent) => {
    const txt = e.clipboardData?.getData('text') || '';
    let sanitized = txt;

    // Sanitizar según el tipo
    if (props.fieldFormat === 'time') {
      sanitized = txt.replace(/[^\d:]/g, '');
    } else if (props.fieldFormat === 'datetime') {
      sanitized = txt.replace(/[^\d\-\/ :T]/g, '');
    } else {
      sanitized = txt.replace(/[^\d\-\/]/g, '');
    }

    if (sanitized !== txt) {
      e.preventDefault();
      const el = inputEl!;
      const start = el.selectionStart || 0;
      const end = el.selectionEnd || 0;
      const newVal = el.value.slice(0, start) + sanitized + el.value.slice(end);
      el.value = newVal;
      const pos = start + sanitized.length;
      el.setSelectionRange(pos, pos);
      props.onInput?.(newVal);
    }
  };

  // Limpiar
  onCleanup(() => {
    try {
      fpInstance?.destroy();
    } catch {}
  });

  return (
    <input
      ref={(el) => {
        inputEl = el;
        if (props.ref) props.ref(el);
      }}
      type="text"
      class={`form-input ${props.hasError ? 'error' : ''} ${props.modified ? 'modified' : ''} ${props.class || ''}`}
      id={props.id}
      placeholder={props.placeholder}
      value={props.value}
      inputMode={props.inputMode}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      onInput={(e) => props.onInput?.((e.target as HTMLInputElement).value)}
      onFocus={props.onFocus}
      onBlur={props.onBlur}
      onKeyUp={props.onKeyUp}
      onClick={props.onClick}
      disabled={props.disabled}
      style={{ width: '100%' }}
    />
  );
};

export default DatePicker;