// components/Icon/IconLoader.tsx
import { createSignal, createEffect, For } from 'solid-js';
import { useRecordQuery } from '../../../hooks/useRecords';

// Store global para defaults de iconos
const iconDefaults = new Map<string, { fill?: string; stroke?: string }>();

// Exportar función para obtener los valores por defecto de un icono
export function getIconDefaults(name: string): { fill?: string; stroke?: string } | undefined {
  const iconId = `icon--${name}`;
  return iconDefaults.get(iconId);
}

interface IconRecord {
  name: string;
  svg_content: string;
  fill?: string;
  stroke?: string;
}

export default function IconLoader() {
  const { data: iconsData } = useRecordQuery<IconRecord>('icons');
  const [icons, setIcons] = createSignal<IconRecord[]>([]);

  // Sincronizar iconos cuando cambian los datos
  createEffect(() => {
    const iconsList = iconsData();
    if (!iconsList) return;

    setIcons(iconsList);

    // Actualizar el mapa global de defaults
    iconDefaults.clear();
    iconsList.forEach(icon => {
      if (icon.name) {
        const iconId = `icon--${icon.name}`;
        iconDefaults.set(iconId, {
          fill: icon.fill,
          stroke: icon.stroke
        });
      }
    });
  });

  // Renderizar el sprite de iconos
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="icon--sprite"
      style={{
        position: 'absolute',
        width: 0,
        height: 0,
        overflow: 'hidden',
        'pointer-events': 'none',
        visibility: 'hidden'
      }}
      aria-hidden="true"
    >
      <defs>
        <For each={icons()}>
          {(icon) => {
            if (!icon.name || !icon.svg_content) return null;

            const iconId = `icon--${icon.name}`;
            const attributes: Record<string, string> = {
              id: iconId,
              viewBox: '0 0 24 24',
              'stroke-linecap': 'round',
              'stroke-linejoin': 'round'
            };

            // Agregar fill y stroke por defecto si existen
            if (icon.fill) attributes.fill = icon.fill || 'transparent';
            if (icon.stroke) attributes.stroke = icon.stroke || '#0033ff';
            
            return (
              <symbol {...attributes} innerHTML={icon.svg_content} />
            );
          }}
        </For>
      </defs>
    </svg>
  );
}