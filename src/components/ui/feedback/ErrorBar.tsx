// components/ui/feedback/ErrorBar.tsx
import { Show, createEffect, onCleanup } from 'solid-js';
import type { Accessor } from 'solid-js';
import { MaybeSignal, unwrapSignal } from '../../../hooks/useRecords';

export type ErrorBarProps = {
  /** Error a mostrar (Error object, string, o signal) */
  error: MaybeSignal<Error | string | null | undefined>;
  /** Texto de prefijo opcional */
  prefix?: string;
  /** Si mostrar icono */
  showIcon?: boolean;
  /** Callback cuando se cierra */
  onClose?: () => void;
  /** Auto-cerrar después de ms (0 = no auto-cerrar) */
  autoClose?: number;
  /** Clases adicionales */
  class?: string;
};

/**
 * Barra horizontal para mostrar errores
 */
export default function ErrorBar(props: ErrorBarProps) {
  let autoCloseTimeout: NodeJS.Timeout | undefined;

  // Obtener el error actual
  const getError = () => {
    const err = unwrapSignal(props.error);
    if (!err) return null;
    
    if (typeof err === 'string') return err;
    if (err instanceof Error) return err.message;
    return String(err);
  };

  const errorMessage = getError();
  const hasError = !!errorMessage;

  // Auto-cerrar si está configurado
  createEffect(() => {
    if (props.autoClose && props.autoClose > 0 && hasError) {
      clearTimeout(autoCloseTimeout);
      autoCloseTimeout = setTimeout(() => {
        props.onClose?.();
      }, props.autoClose);
    }
  });

  // Cleanup
  onCleanup(() => {
    if (autoCloseTimeout) {
      clearTimeout(autoCloseTimeout);
    }
  });

  const handleClose = () => {
    props.onClose?.();
  };

  return (
    <Show when={hasError}>
      <div
        class={`flex items-center justify-between px-4 py-3 bg-red-50 border-l-4 border-red-500 text-red-700 ${
          props.class || ''
        }`}
        role="alert"
        aria-live="assertive"
      >
        <div class="flex items-center gap-3 flex-1 min-w-0">
          {props.showIcon !== false && (
            <svg
              class="w-5 h-5 text-red-500 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clip-rule="evenodd"
              />
            </svg>
          )}
          
          <div class="flex-1 min-w-0">
            <Show when={props.prefix}>
              <span class="font-semibold mr-2">{props.prefix}</span>
            </Show>
            <span class="truncate">{errorMessage}</span>
          </div>
        </div>

        <Show when={props.onClose}>
          <button
            type="button"
            onClick={handleClose}
            class="ml-4 text-red-500 hover:text-red-700 focus:outline-none focus:text-red-700 flex-shrink-0"
            aria-label="Cerrar error"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
        </Show>
      </div>
    </Show>
  );
}