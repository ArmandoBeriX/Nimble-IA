// src/components/navigation/Pagination.tsx
import { mergeProps } from 'solid-js';

interface PaginationProps {
  pageSize?: number;
  showSizeChanger?: boolean;
  designer?: boolean;
  onPropsUpdate?: (props: any) => void;
}

export default function Pagination(props: PaginationProps) {
  const merged = mergeProps({
    pageSize: 10,
    showSizeChanger: true
  }, props);

  if (merged.designer) {
    return (
      <div class="pagination-designer">
        [Paginación]
        <div class="designer-overlay">
          <button onClick={() => merged.onPropsUpdate?.({
            pageSize: parseInt(prompt('Page size', merged.pageSize.toString()) || merged.pageSize.toString()),
            showSizeChanger: confirm('Show size changer?')
          })}>Editar Paginación</button>
        </div>
      </div>
    );
  }

  return (
    <div class="pagination">
      {/* Implementación real de paginación */}
    </div>
  );
}