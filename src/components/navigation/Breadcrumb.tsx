// src/components/navigation/Breadcrumb.tsx
import { For, mergeProps } from 'solid-js';

interface BreadcrumbProps {
  items?: Array<{ label: string; path: string }>;
  designer?: boolean;
  onPropsUpdate?: (props: any) => void;
}

export default function Breadcrumb(props: BreadcrumbProps) {
  const merged = mergeProps({
    items: [{ label: 'Inicio', path: '/' }]
  }, props);

  if (merged.designer) {
    return (
      <nav class="breadcrumb-designer">
        <For each={merged.items}>
          {(item, index) => (
            <>
              <span
                onClick={() => {
                  const newLabel = prompt('Label', item.label);
                  const newPath = prompt('Path', item.path);
                  if (newLabel && newPath) {
                    const newItems = [...merged.items];
                    newItems[index()] = { label: newLabel, path: newPath };
                    merged.onPropsUpdate?.({ items: newItems });
                  }
                }}
              >
                {item.label}
              </span>
              {index() < merged.items.length - 1 && ' / '}
            </>
          )}
        </For>
      </nav>
    );
  }

  return (
    <nav class="breadcrumb">
      <For each={merged.items}>
        {(item, index) => (
          <>
            <a href={item.path}>{item.label}</a>
            {index() < merged.items.length - 1 && ' / '}
          </>
        )}
      </For>
    </nav>
  );
}