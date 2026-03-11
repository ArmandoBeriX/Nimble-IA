// ColorPicker.tsx
import { createMemo, Show, Accessor, JSXElement } from "solid-js";
import Button from "../../../ui/Button";

interface ColorPickerProps {
  value: Accessor<string>;
  onChange: (val: string) => void;
  disabled?: boolean;
  children?: JSXElement; 
}

// ── Helpers ────────────────────────────────────────────────────────────────
const alphaToHex = (a: number) =>
  Math.round(Math.max(0, Math.min(1, a)) * 255)
    .toString(16).padStart(2, '0');

const hexAlphaToRatio = (h: string) =>
  parseInt(h, 16) / 255;

const classify = (v: string) => {
  const t = v.trim();
  if (!t) return 'empty';
  if (/^#[0-9a-fA-F]{6}$/.test(t)) return 'hex6';
  if (/^#[0-9a-fA-F]{8}$/.test(t)) return 'hex8';
  return 'other'; 
};

const CHECKERBOARD_BG = 'repeating-conic-gradient(#ccc 0% 25%, white 0% 50%)';

export default function ColorPicker(props: ColorPickerProps) {
  const val = () => props.value()?.trim() ?? '';
  const kind = createMemo(() => classify(val()));
  const isHex = createMemo(() => kind() === 'hex6' || kind() === 'hex8');
  const isEmpty = createMemo(() => kind() === 'empty');

  const alpha = createMemo(() => {
    const v = val();
    if (kind() === 'hex8') return hexAlphaToRatio(v.slice(7, 9));
    const match = v.match(/transparent\s+(\d+)%\)/);
    if (match) return (100 - parseInt(match[1])) / 100;
    return 1;
  });

  const hexBase = createMemo(() => isHex() ? val().slice(0, 7) : '#000000');

  const handlePicker = (e: InputEvent) => {
    const hex = (e.target as HTMLInputElement).value;
    updateColor(hex, alpha());
  };

  const handleAlpha = (e: InputEvent) => {
    const a = parseFloat((e.target as HTMLInputElement).value);
    if (isHex()) {
      updateColor(hexBase(), a);
    } else {
      // Limpiamos color-mix previo para obtener la base limpia (var, etc)
      const base = val().replace(/^color-mix\(in srgb, (.*), transparent.*$/, '$1');
      if (a >= 1) {
        props.onChange(base);
      } else {
        // No enviamos el string "transparent" puro para no perder la base del color
        const percentage = Math.round((1 - a) * 100);
        props.onChange(`color-mix(in srgb, ${base}, transparent ${percentage}%)`);
      }
    }
  };

  const updateColor = (baseHex: string, a: number) => {
    // Si a es 0, enviamos hex con alpha 00 para mantener el color base
    props.onChange(a >= 1 ? baseHex : baseHex + alphaToHex(a));
  };

  return (
    <div class="flex flex-col gap-1">
      <div class="flex gap-1 items-center">
        <div class="flex-1 min-w-0 font-mono">
          {props.children}
        </div>

        <div
          title={val() || 'Sin color'}
          class="relative w-7 h-7 flex-shrink-0 rounded border border-gray-300 overflow-hidden"
          style={{ 
            background: CHECKERBOARD_BG, 
            'background-size': '8px 8px' 
          }}
        >
          {/* Muestra en vivo cualquier valor que entre por props.value() */}
          <div 
            class="absolute inset-0" 
            style={{ background: val() || 'transparent' }} 
          />
          
          <input
            type="color"
            value={hexBase()}
            onInput={handlePicker}
            disabled={props.disabled}
            class="absolute inset-0 w-full h-full opacity-0 cursor-pointer p-0 border-none scale-150"
          />
        </div>

        <Show when={!isEmpty()}>
          <Button 
            variant="ghost" size="xs" 
            disabled={props.disabled}
            onClick={() => props.onChange('')} 
          >
            ×
          </Button>
        </Show>
      </div>

      <Show when={!isEmpty()}>
        <div class="flex gap-1.5 items-center mt-0.5 px-0.5">
          <div 
            class="relative flex-1 h-3.5 rounded-full border border-gray-200"
            style={{ 
              background: CHECKERBOARD_BG, 
              'background-size': '8px 8px' 
            }}
          >
            <div 
              class="absolute inset-0 rounded-full"
              style={{ 
                background: `linear-gradient(to right, transparent, ${isHex() ? hexBase() : '#666'})` 
              }} 
            />

            {/* Contenedor del Knob con margen lateral para que no se corte */}
            <div class="absolute inset-x-1.5 inset-y-0 pointer-events-none">
              <div 
                class="absolute top-1/2 w-3 h-3 bg-white border border-gray-600 rounded-full shadow-sm"
                style={{ 
                  left: `${alpha() * 100}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              />
            </div>

            <input
              type="range" min="0" max="1" step="0.01"
              value={alpha()}
              onInput={handleAlpha}
              disabled={props.disabled}
              class="absolute inset-0 w-full h-full opacity-0 cursor-pointer m-0 z-20"
            />
          </div>

          <span class="text-[0.7rem] text-gray-600 min-w-[2.4rem] text-right font-bold font-mono">
            {Math.round(alpha() * 100)}%
          </span>
        </div>
      </Show>
    </div>
  );
}