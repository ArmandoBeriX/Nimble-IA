// components/ui/button.tsx
import { JSX, mergeProps } from "solid-js";

export interface ButtonProps {
  children?: JSX.Element;
  text?: string;
  variant?: "primary" | "secondary" | "light" | "dark" | "danger" | "success" | "warning" | "info" | "ghost" | "outline" | "link";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  shape?: "square" | "rounded" | "pill" | "circle";
  hasConfirm?: boolean;
  disabled?: boolean | string;
  loading?: boolean | string;
  fullWidth?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: (event: MouseEvent) => void;
  ariaLabel?: string;
  class?: string;
  classList?: Record<string, boolean>;
  [key: string]: any;
}

export default function Button(props: ButtonProps) {
  const merged = mergeProps(
    {
      variant: "primary" as const,
      size: "md" as const,
      shape: "rounded" as const,
      type: "button" as const,
      disabled: false,
      loading: false,
      hasConfirm: false,
      fullWidth: false,
    },
    props
  );

  // Clases base con cursor pointer y transiciones
  const baseClasses = "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer gap-1";

  // Variantes con efectos hover mejorados
  const variantClasses = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md active:bg-blue-800 focus:ring-blue-500",
    secondary: "bg-gray-600 text-white hover:bg-gray-700 hover:shadow-md active:bg-gray-800 focus:ring-gray-500",
    light: "bg-transparent text-gray-900 border border-gray-300 hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100 focus:ring-gray-300",
    dark: "bg-gray-900 text-white hover:bg-gray-800 hover:shadow-md active:bg-gray-950 focus:ring-gray-700",
    danger: "bg-red-600 text-white hover:bg-red-700 hover:shadow-md active:bg-red-800 focus:ring-red-500",
    success: "bg-green-600 text-white hover:bg-green-700 hover:shadow-md active:bg-green-800 focus:ring-green-500",
    warning: "bg-yellow-500 text-white hover:bg-yellow-600 hover:shadow-md active:bg-yellow-700 focus:ring-yellow-400",
    info: "bg-cyan-500 text-white hover:bg-cyan-600 hover:shadow-md active:bg-cyan-700 focus:ring-cyan-400",
    ghost: "bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200 focus:ring-gray-300",
    outline: "bg-transparent text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100 focus:ring-gray-300",
    link: "bg-transparent text-blue-600 hover:text-blue-800 hover:underline active:text-blue-900 p-0 focus:ring-blue-300",
  };

  // Tamaños
  const sizeClasses = {
    xs: "text-xs px-1 py-1 min-h-[24px]",
    sm: "text-sm px-2 py-1.5 min-h-[28px]",
    md: "text-sm px-3 py-2 min-h-[32px]",
    lg: "text-base px-4 py-2.5 min-h-[36px]",
    xl: "text-base px-5 py-3 min-h-[40px]",
  };

  // Tamaños para círculo
  const circleSizeClasses = {
    xs: "w-6 h-6 p-0",
    sm: "w-8 h-8 p-0",
    md: "w-10 h-10 p-0",
    lg: "w-12 h-12 p-0",
    xl: "w-14 h-14 p-0",
  };

  // Formas
  const shapeClasses = {
    square: "rounded",
    rounded: "rounded-lg",
    pill: "rounded-full",
    circle: "rounded-full aspect-square justify-center items-center",
  };

  // Construir clases finales
  const getButtonClasses = () => {
    let classes = baseClasses;
    
    // Variante
    classes += " " + variantClasses[merged.variant];
    
    // Tamaño (especial para circle)
    if (merged.shape === "circle") {
      classes += " " + circleSizeClasses[merged.size];
    } else {
      classes += " " + sizeClasses[merged.size];
    }
    
    // Forma
    classes += " " + shapeClasses[merged.shape];
    
    // Ancho completo
    if (merged.fullWidth && merged.shape !== "circle") {
      classes += " w-full";
    }
    
    // Confirmación
    if (merged.hasConfirm) {
      classes += " opacity-70 hover:opacity-100";
    }
    
    // Clases personalizadas
    if (merged.class) {
      classes += " " + merged.class;
    }
    
    return classes.replace(/\s+/g, " ").trim();
  };

  // Spinner de carga
  const Spinner = () => (
    <svg
      class="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );

  // Contenido del botón
  const renderContent = () => {
    if (merged.loading) {
      return (
        <div class="flex items-center justify-center">
          <Spinner />
          {merged.shape !== "circle" && (merged.children || merged.text || "Cargando...")}
        </div>
      );
    }

    return merged.children || merged.text;
  };

  return (
    <button
      type={merged.type}
      class={getButtonClasses()}
      disabled={!!(merged.disabled || merged.loading)}
      aria-label={merged.ariaLabel}
      aria-busy={!!merged.loading}
      onClick={merged.onClick}
      {...Object.entries(props).reduce((acc, [key, value]) => {
        if (![
          'children', 'text', 'variant', 'size', 'shape', 'hasConfirm', 
          'disabled', 'loading', 'fullWidth', 'type', 'onClick', 'ariaLabel',
          'class', 'classList'
        ].includes(key)) {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, any>)}
    >
      {renderContent()}
    </button>
  );
}