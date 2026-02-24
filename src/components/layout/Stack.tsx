// src/components/layout/Stack.tsx
import { JSX, mergeProps } from 'solid-js';

interface StackProps {
  children?: JSX.Element;
  direction?: 'vertical' | 'horizontal';
  gap?: string;
  align?: 'stretch' | 'center' | 'start' | 'end';
  designer?: boolean;
  onPropsUpdate?: (props: any) => void;
}

export default function Stack(props: StackProps) {
  const merged = mergeProps({
    direction: 'vertical',
    gap: '10px',
    align: 'stretch'
  }, props);

  const style = (): JSX.CSSProperties => ({
    'display': 'flex',
    'flex-direction': merged.direction === 'vertical' ? 'column' : 'row',
    'gap': merged.gap,
    'align-items':
      merged.align === 'start' ? 'flex-start' :
      merged.align === 'end' ? 'flex-end' :
      merged.align,
    'min-height': merged.designer ? '50px' : 'auto'
  });

  if (merged.designer) {
    return (
      <div style={style()} class="designer-stack">
        {merged.children}
        <div class="designer-overlay">
          <button onClick={() => {
            const direction = prompt('Direction (vertical/horizontal)', merged.direction);
            if (direction === 'vertical' || direction === 'horizontal') {
              merged.onPropsUpdate?.({
                direction,
                gap: prompt('Gap', merged.gap) || merged.gap,
                align: prompt('Align (stretch/center/start/end)', merged.align) || merged.align
              });
            }
          }}>Editar Stack</button>
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