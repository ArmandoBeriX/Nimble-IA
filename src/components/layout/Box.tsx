// src/components/layout/Box.tsx
import { JSX, mergeProps } from 'solid-js';

interface BoxProps {
  children?: JSX.Element;
  padding?: string;
  border?: string;
  borderRadius?: string;
  designer?: boolean;
  onPropsUpdate?: (props: any) => void;
}

export default function Box(props: BoxProps) {
  const merged = mergeProps({
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px'
  }, props);

  const style = () => ({
    padding: merged.padding,
    border: merged.border,
    'border-radius': merged.borderRadius,
    minHeight: merged.designer ? '30px' : 'auto'
  });

  if (merged.designer) {
    return (
      <div style={style()} class="designer-box">
        {merged.children}
        <div class="designer-overlay">
          <button onClick={() => merged.onPropsUpdate?.({
            padding: prompt('Padding', merged.padding) || merged.padding,
            border: prompt('Border', merged.border) || merged.border,
            borderRadius: prompt('Border Radius', merged.borderRadius) || merged.borderRadius
          })}>Editar Box</button>
        </div>
      </div>
    );
  }

  return (
    <div style={style()}>
      {merged.children}
    </div>
  );
}