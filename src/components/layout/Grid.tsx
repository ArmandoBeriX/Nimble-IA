// src/components/layout/Grid.tsx
import { JSX, mergeProps } from 'solid-js';

interface GridProps {
  children?: JSX.Element;
  columns?: string;
  gap?: string;
  designer?: boolean;
  onPropsUpdate?: (props: any) => void;
}

export default function Grid(props: GridProps) {
  const merged = mergeProps({
    columns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '10px'
  }, props);

  const style = () => ({
    display: 'grid',
    'grid-template-columns': merged.columns,
    gap: merged.gap,
    minHeight: merged.designer ? '50px' : 'auto'
  });

  if (merged.designer) {
    return (
      <div style={style()} class="designer-grid">
        {merged.children}
        <div class="designer-overlay">
          <button onClick={() => merged.onPropsUpdate?.({
            columns: prompt('Columns', merged.columns) || merged.columns,
            gap: prompt('Gap', merged.gap) || merged.gap
          })}>Editar Grid</button>
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