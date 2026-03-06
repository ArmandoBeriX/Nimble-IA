// components/TabNav.tsx
import {
  For,
  Show,
  createMemo,
  createEffect,
  createSignal,
  onCleanup,
  onMount
} from 'solid-js';
import { A, useLocation } from '@solidjs/router';
import Icon from './ui/icon/Icon';
import { InterfaceItem } from '../constants/table-defs';
import { store } from '../app';
import { useRecordQuery, MaybeSignal, unwrapSignal } from '../hooks/useRecords';

export type TabNavProps = {
  /** InterfaceItems para mostrar como tabs - en el orden proporcionado */
  items: MaybeSignal<InterfaceItem[]>;
  /** Variante de diseño */
  variant?: 'default' | 'pills' | 'underline' | 'segmented' | 'compact';
  /** Si se ajusta al ancho disponible */
  fullWidth?: boolean;
  /** Clases CSS adicionales */
  class?: string;
  /** Callback cuando se hace click en un tab */
  onTabClick?: (item: InterfaceItem) => void;
  /** Si mostrar iconos */
  showIcons?: boolean;
  /** Si mostrar descripción como tooltip */
  showTooltips?: boolean;
  /** Scroll automático al tab activo */
  autoScrollToActive?: boolean;
};

/**
 * Componente de navegación horizontal tipo tabs para InterfaceItems
 * Mantiene el orden exacto del array proporcionado
 */
export default function TabNav(props: TabNavProps) {
  const [items, setItems] = createSignal(unwrapSignal(props.items));

  createEffect(() =>
    setItems(unwrapSignal(props.items).map(item => { return { ...item, isActive: isTabActive(item) } }))
  )

  const location = useLocation();

  // Usar createMemo para reaccionar automáticamente a cambios en la ruta
  const currentPath = createMemo(() => location.pathname);

  // Referencias para scroll
  let containerRef: HTMLDivElement | undefined;
  let resizeObserver: ResizeObserver | null = null;

  // Estados para scroll responsive
  const [canScrollLeft, setCanScrollLeft] = createSignal(false);
  const [canScrollRight, setCanScrollRight] = createSignal(false);

  // Determinar si un tab está activo
  const isTabActive = (item: InterfaceItem): boolean => {
    const itemPath = item.route || `/${item.name.toLowerCase().replace(/\s+/g, '-')}`;

    // Si la ruta actual empieza con el path del item
    return currentPath().startsWith(itemPath);
  };

  // Encontrar el tab activo actual
  const activeTab = createMemo(() => {
    return items().find(item => isTabActive(item));
  });

  // Scroll helpers
  const checkScroll = () => {
    if (!containerRef) return;

    const { scrollLeft, scrollWidth, clientWidth } = containerRef;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth);
  };

  const scrollLeft = () => {
    if (containerRef) {
      containerRef.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (containerRef) {
      containerRef.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  // Setup responsive
  onMount(() => {
    if (containerRef) {
      resizeObserver = new ResizeObserver(() => {
        checkScroll();
      });

      resizeObserver.observe(containerRef);
      containerRef.addEventListener('scroll', checkScroll);

      // Calcular inicialmente
      setTimeout(checkScroll, 100);
    }

    // Scroll al tab activo si está configurado
    if (props.autoScrollToActive && containerRef && activeTab()) {
      setTimeout(() => {
        const activeElement = containerRef?.querySelector('[data-active="true"]');
        if (activeElement) {
          activeElement.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center'
          });
        }
      }, 200);
    }
  });

  onCleanup(() => {
    if (resizeObserver) {
      resizeObserver.disconnect();
    }
    if (containerRef) {
      containerRef.removeEventListener('scroll', checkScroll);
    }
  });

  // Clases CSS según variant
  const getContainerClasses = () => {
    const base = 'flex items-center';
    const fullWidth = props.fullWidth ? 'w-full' : '';

    return `${base} ${fullWidth} ${props.class || ''}`;
  };

  const getTabClasses = (item: InterfaceItem, isActive: boolean) => {
    const base = 'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0';

    switch (props.variant) {
      case 'pills':
        return `${base} ${isActive
          ? 'bg-blue-100 text-blue-700 rounded-full border border-blue-200'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full'}`;

      case 'underline':
        return `${base} ${isActive
          ? 'text-blue-600 border-b-2 border-blue-600'
          : 'text-gray-600 hover:text-gray-900 hover:border-b-2 hover:border-gray-300'}`;

      case 'segmented':
        return `${base} ${isActive
          ? 'bg-white text-gray-900 rounded-lg shadow-sm border border-gray-200'
          : 'text-gray-600 hover:text-gray-900 rounded-lg'}`;

      case 'compact':
        return `${base} ${isActive
          ? 'bg-blue-50 text-blue-600 rounded-lg px-3 py-1.5'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg px-3 py-1.5'}`;

      default:
        return `${base} ${isActive
          ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`;
    }
  };

  // Para debuggear si es necesario
  createEffect(() => {
    console.log('Ruta actual:', currentPath());
    console.log('Tab activo:', activeTab()?.name);
  });

  return (
    <div class="relative">
      {/* Botones de scroll */}
      <Show when={canScrollLeft()}>
        <button
          onClick={scrollLeft}
          class="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full w-8 h-8 flex items-center justify-center shadow-sm hover:bg-white hover:shadow transition-all"
          aria-label="Scroll izquierda"
        >
          <Icon name="chevrons-left" size={16} class="text-gray-600" />
        </button>
      </Show>

      <Show when={canScrollRight()}>
        <button
          onClick={scrollRight}
          class="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full w-8 h-8 flex items-center justify-center shadow-sm hover:bg-white hover:shadow transition-all"
          aria-label="Scroll derecha"
        >
          <Icon name="chevrons-right" size={16} class="text-gray-600" />
        </button>
      </Show>

      {/* Contenedor de tabs con scroll */}
      <div
        ref={containerRef}
        class="overflow-x-auto scrollbar-hide"
        style={{
          'scrollbar-width': 'none',
          '-ms-overflow-style': 'none',
          'scroll-padding': '0 3rem'
        }}
      >
        <div class={getContainerClasses()}>
          <For each={items()}>
            {(item) => {
              const isActive = item.isActive;

              return (
                <A
                  href={item.route || '/'}
                  class={getTabClasses(item, isActive)}
                  onClick={() => props.onTabClick?.(item)}
                  title={props.showTooltips ? item.description : undefined}
                  activeClass=""
                  data-active={isActive}
                  data-tab-id={item.id}
                >
                  {props.showIcons && item.icon && (
                    <Icon
                      name={item.icon}
                      size={18}
                      class={isActive ? 'text-current' : 'text-gray-400'}
                    />
                  )}

                  <span class={isActive ? 'font-semibold' : 'font-medium'}>
                    {item.name}
                  </span>

                  {/* Indicador de persistencia */}
                  {item.persistant && (
                    <span
                      class="ml-1 text-gray-400"
                      title="Interfaz persistente"
                    >
                      <Icon name="bookmarked" size={12} />
                    </span>
                  )}
                </A>
              );
            }}
          </For>
        </div>
      </div>
    </div>
  );
}