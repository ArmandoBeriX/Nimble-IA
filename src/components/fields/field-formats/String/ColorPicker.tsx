// ColorPicker.tsx
import { createMemo, Show, Accessor, Setter, JSXElement } from "solid-js";
import Button from "../../../ui/Button";

interface ColorPickerProps {
  value: Accessor<string>;
  setValue: Setter<string>;
  disabled?: boolean;
  children?: JSXElement;
}

// Hex FF a decimal 0-1
const hexToAlpha = (hexAlpha: string): number => {
  if (!hexAlpha || hexAlpha.length < 2) return 1;
  return parseInt(hexAlpha.padStart(2, '0'), 16) / 255;
};

const alphaToHex = (alpha: number): string => {
  return Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
};

export default function ColorPicker(props: ColorPickerProps) {
  // Memos para valores derivados
  const hexColor = createMemo(() => {
    const val = props.value();
    return val && val.length >= 7 ? val.slice(0, 7) : "#000000";
  });

  const alphaValue = createMemo(() => {
    const val = props.value();
    return val && val.length === 9 ? hexToAlpha(val.slice(7, 9)) : 1;
  });

  const hasValue = createMemo(() => {
    return !!props.value() && props.value().length > 0;
  });

  const handleColorChange = (e: InputEvent) => {
    const newColor = (e.target as HTMLInputElement).value; // Siempre viene como #rrggbb
    const currentVal = props.value();
    const currentAlpha = currentVal && currentVal.length === 9 ? 
      currentVal.slice(7, 9) : alphaToHex(alphaValue());
    
    // Si el alpha es 1 (ff), no lo agregamos
    if (currentAlpha === "ff") {
      props.setValue(newColor);
    } else {
      props.setValue(newColor + currentAlpha);
    }
  };

  const handleAlphaChange = (e: InputEvent) => {
    const newAlpha = parseFloat((e.target as HTMLInputElement).value);
    const colorHex = hexColor();
    
    if (newAlpha === 1) {
      props.setValue(colorHex);
    } else {
      props.setValue(colorHex + alphaToHex(newAlpha));
    }
  };

  const clearColor = () => {
    props.setValue("");
  };

  return (
    <div class="color-picker-container">
      {props.children}
      <div class="color-input-wrapper">
        <input
          type="color"
          value={hexColor()}
          onInput={handleColorChange}
          disabled={props.disabled}
          title="Seleccionar color"
          style={{ opacity: alphaValue() }}
        />
        <Show when={!hasValue()}>
          <div class="color-placeholder">Sin color</div>
        </Show>
      </div>

      <div class="alpha-slider-container">
        <div class="alpha-controls">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={alphaValue()}
            onInput={handleAlphaChange}
            disabled={props.disabled}
            title="Transparencia"
            style={{ background: `linear-gradient(to right, transparent, ${hexColor()})` }}
          />
          <span class="alpha-percentage">{Math.round(alphaValue() * 100)}%</span>
        </div>
      </div>

      <Button variant="ghost" size="xs" onClick={clearColor}><b title="Borrar color">×</b></Button>
    </div>
  );
}