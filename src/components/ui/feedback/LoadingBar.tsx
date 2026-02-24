// components/ui/feedback/LoadingBar.tsx
import { Show, createEffect, onCleanup } from 'solid-js';
import { MaybeSignal, unwrapSignal } from '../../../hooks/useRecords';

export type LoadingBarProps = {
  /** Estado de loading (boolean o signal) */
  loading: MaybeSignal<string>;
  /** Texto de prefijo opcional */
  prefix?: string;
  /** Texto de sufijo opcional */
  suffix?: string;
  /** Tiempo de demora antes de mostrar */
  delay?: number;
  /** Si mostrar spinner */
  showSpinner?: boolean;
  /** Si es un loading de página completa */
  fullPage?: boolean;
  /** Si es inline */
  inline?: boolean;
  /** Clases adicionales */
  class?: string;
  /** Color del spinner */
  spinnerColor?: string;
};

/**
 * Barra/indicador de loading
 */
export default function LoadingBar(props: LoadingBarProps) {
  const isLoading = () => unwrapSignal(props.loading);

  props.suffix ??= isLoading();

  // Para fullPage, prevenir scroll
  createEffect(() => {
    if (props.fullPage && isLoading()) {
      document.body.style.overflow = 'hidden';
    } else if (props.fullPage) {
      document.body.style.overflow = '';
    }
  });

  onCleanup(() => {
    if (props.fullPage) {
      document.body.style.overflow = '';
    }
  });

  // Para inline loading
  if (props.inline) {
    return (
      <Show when={isLoading()}>
        <div class={`inline-flex items-center gap-2 ${props.class || ''}`}>
          {props.showSpinner !== false && (
            <Spinner size="sm" color={props.spinnerColor} />
          )}
          <Show when={props.prefix || props.suffix}>
            <span class="text-sm text-gray-600 whitespace-nowrap">
              {props.prefix && <span>{props.prefix}</span>}
              {props.suffix && <span>{props.suffix}</span>}
            </span>
          </Show>
        </div>
      </Show>
    );
  }

  return (
    <Show when={isLoading()}>
      <div
        class={`flex items-center justify-center gap-3 ${
          props.fullPage
            ? 'fixed inset-0 bg-white/80 backdrop-blur-sm z-50'
            : 'px-4 py-3 bg-blue-50 border-l-4 border-blue-500'
        } ${props.class || ''}`}
        role="status"
        aria-live="polite"
      >
        {props.showSpinner !== false && (
          <Spinner size={props.fullPage ? 'lg' : 'md'} color={props.spinnerColor} />
        )}
        
        <div class="flex items-center gap-2">
          <Show when={props.prefix}>
            <span class="font-medium text-blue-700">{props.prefix}</span>
          </Show>
          
          {/* <span class={`${props.fullPage ? 'text-gray-700' : 'text-blue-600'}`}>
            Cargando...
          </span> */}
          
          <Show when={props.suffix}>
            <span class="text-blue-600 opacity-75">{props.suffix}</span>
          </Show>
        </div>
      </div>
    </Show>
  );
}

// Componente Spinner interno
function Spinner(props: { size?: 'sm' | 'md' | 'lg'; color?: string }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div
      class={`${sizeClasses[props.size || 'md']} animate-spin`}
      style={{ color: props.color }}
    >
      <svg class="w-full h-full" fill="none" viewBox="0 0 24 24">
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
        />
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
}