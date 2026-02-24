import { store } from '../app';
import { createSignal, For, Show, createMemo, onMount, createEffect } from 'solid-js';
import { useRecordQuery } from '../hooks/useRecords';
import { FilterInput, TableRecord } from '../types/schema';
import Icon from '../components/ui/icon/Icon';
import { A, useNavigate, useLocation } from '@solidjs/router';
import { InterfaceItem } from '../constants/table-defs';
import { SearchBar } from '../components/utils/SearchBar';
import WithTooltip from '../components/ui/tooltip/Tooltip';

type MenuItem = TableRecord & {
  id: string;
  level?: number;
  name: string;
  identifier: string;
  icon?: string;
  description?: string;
  interface_id?: string;
  parent_id?: string;
  position: number;
  is_expanded?: boolean;
  interface?: InterfaceItem;
  children?: MenuItem[];
  hidden?: boolean;
}

export default function LeftMenu() {
  const isMenuOpen = store.watchSession("isMenuOpen");
  const navigate = useNavigate();
  const location = useLocation();
  let searchInputRef: HTMLInputElement | undefined;
  let searchContainerRef: HTMLDivElement | undefined;

  const [searchFilters, setSearchFilters] = createSignal<FilterInput>({});

  const { data: allMenuItems, loading, error, refresh } = useRecordQuery<MenuItem>(
    "menu_items",
    {},
    { order: [['position', 'ASC']] },
    {
      interface_id: {}
    }
  );

  const { data: searchedMenuItems } = useRecordQuery<MenuItem>(
    "menu_items",
    searchFilters,
  );

  // Señal que guarda el estado de expansión por id
  const [expandedMap, setExpandedMap] = createSignal<Record<string, boolean>>({});

  // Construir jerarquía del menú
  const menuHierarchy = createMemo(() => {
    const items = allMenuItems() || [];
    const mapIds = new Map((searchedMenuItems() || []).map(m => [m.id, true]));
    const itemsByParent = new Map<string | null, MenuItem[]>();

    items.forEach(item => {
      const parentId = item.parent_id || null;
      if (!itemsByParent.has(parentId)) {
        itemsByParent.set(parentId, []);
      }
      itemsByParent.get(parentId)!.push(item);
    });

    const buildTree = (parentId: string | null, level = 0): MenuItem[] => {
      const children = itemsByParent.get(parentId) || [];
      return children
        .sort((a, b) => (a.position || 0) - (b.position || 0))
        .map(child => {
          return {
            ...child,
            level,
            hidden: !mapIds.has(child.id),
            children: buildTree(child.id!, level + 1),
          };
        });
    };

    return buildTree(null);
  });

  const anyChildIsVisible = (children: any) => {
    if (!children) return false;
    for (const child of children) {
      if (!child.hidden) return true;
      if (child.children && anyChildIsVisible(child.children)) return true;
    }
    return false;
  }

  // Inicializar expandedMap a partir de la data si viene is_expanded en los items
  createEffect(() => {
    const items = allMenuItems() || [];
    const initial: Record<string, boolean> = {};
    for (const it of items) {
      if (it.is_expanded) initial[it.id] = true;
    }
    // merge con lo que ya hubiera
    setExpandedMap(prev => ({ ...initial, ...prev }));
  });

  // Función para alternar expansión por id
  const toggleItemExpansion = (id: string, force?: boolean) => {
    setExpandedMap(prev => {
      const curr = { ...prev };
      curr[id] = force ?? !Boolean(curr[id]);
      return curr;
    });
  };

  // Buscar path desde la raíz hasta el item cuyo path coincide con location.pathname
  const findPathToItem = (tree: MenuItem[], predicate: (it: MenuItem) => boolean): string[] | null => {
    for (const node of tree) {
      if (predicate(node)) return [node.id];
      if (node.children && node.children.length > 0) {
        const res = findPathToItem(node.children, predicate);
        if (res) return [node.id, ...res];
      }
    }
    return null;
  };

  // Normalizar path del item para comparar con location.pathname
  const normalizePath = (raw?: string) => {
    if (!raw) return '';
    return raw.startsWith('/') ? raw : '/' + raw;
  };

  // Efecto: cuando cambia la ruta, expandir padres del item seleccionado
  createEffect(() => {
    const tree = menuHierarchy();
    const current = location.pathname;
    const pathIds = findPathToItem(tree, (it) => normalizePath(it.interface?.route ?? it.identifier) === current);
    if (pathIds && pathIds.length > 1) {
      // expandir todos menos el último (el último es el mismo item)
      setExpandedMap(prev => {
        const copy = { ...prev };
        for (const id of pathIds.slice(0, -1)) copy[id] = true;
        return copy;
      });
    }
  });

  // Efecto para enfocar el input de búsqueda cuando el menú se abre
  createEffect(() => {
    if (isMenuOpen()) {
      setTimeout(() => {
        const input = searchContainerRef?.querySelector('input');
        if (input) {
          (input as HTMLInputElement).focus();
        } else {
          searchInputRef?.focus();
        }
      }, 50);
    }
  });

  // Componente recursivo para renderizar items
  const MenuItemComponent = (props: { item: MenuItem; level?: number }) => {
    const level = props.level || 0;
    const item = props.item;

    // Obtener el estado de expansión desde expandedMap
    const isExpanded = () => {
      return Boolean(expandedMap()?.[item.id]) || (searchInputRef?.value && anyChildIsVisible(item.children));
    };

    const hasChildren = item.children && item.children.length > 0;

    // Determinar si está seleccionado comparando pathname
    const isSelected = () => {
      const itemPath = normalizePath(item.interface?.route ?? item.identifier);
      return location.pathname === itemPath;
    };

    const handleLinkClick = (e: Event, href?: string) => {
      if (href) {
        e.preventDefault();
        navigate(href);
        if (window.innerWidth < 768) {
          store.setSession("isMenuOpen", false);
        }
      }
    };

    // clases base y de seleccionado
    const baseClasses = `flex items-center space-x-1 px-2 py-1 w-full ${level === 0 ? 'font-medium' : 'font-normal'}`;
    const selectedClasses = isSelected() ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50';

    return (
      <div class={`w-full ${hasChildren && isExpanded() ? 'border-b' : ''} ${item.hidden && !anyChildIsVisible(item.children) ? 'hidden' : ''}`}>
        <div class={`flex items-center justify-between rounded-lg transition-colors`} style={{ 'padding-left': `${Math.min(level * 8, 80)}px` }}>
          {hasChildren ? (
            <button
              onClick={() => toggleItemExpansion(item.id)}
              class={`${baseClasses} ${selectedClasses} text-left`}
            >
              <div class="flex items-center space-x-1 flex-1">
                <div class={`w-5 h-5 flex items-center justify-center ${level === 0 ? 'text-gray-600' : 'text-gray-500'}`}>
                  <Icon name={item.interface?.icon ?? item.icon ?? 'menu'} />
                </div>
                <span class="truncate">{item.name}</span>
              </div>
              <div class="flex-shrink-0">
                <Icon viewBox="0 0 24 24" name="" stroke="currentColor" class={`w-4 h-4 transform transition-transform duration-200 ${isExpanded() ? 'rotate-90' : 'rotate-0'}`}>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </Icon>
              </div>
            </button>
          ) : (
            <div class={item.hidden ? 'hidden' : 'flex-1'}>
              <A
                href={item.interface?.route ?? item.identifier}
                onClick={(e) => handleLinkClick(e, item.interface?.route ?? item.identifier)}
                class={`${baseClasses} ${isSelected() ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                <div class={`w-5 h-5 flex items-center justify-center text-gray-500`}>
                  <Icon name={item.interface?.icon ?? item.icon ?? "menu"} />
                </div>
                <WithTooltip tooltip={item.description} placement="right" >
                  <span class="truncate">{item.name}</span>
                </WithTooltip>
              </A>
            </div>
          )}
        </div>

        {/* Renderizar hijos si está expandido */}
        <Show when={hasChildren && isExpanded()}>
          <div class="ml-2">
            <For each={item.children}>
              {(child) => <MenuItemComponent item={child} level={level + 1} />}
            </For>
          </div>
        </Show>
      </div >
    );
  };

  // Calcular clases del menú
  const menuClasses = createMemo(() => {
    const baseClasses = "h-[calc(100vh-4rem)] bg-white border-r border-gray-200 overflow-y-auto overflow-x-hidden transition-all duration-300 ease-in-out";
    if (isMenuOpen()) {
      return `${baseClasses} w-64`;
    } else {
      return `${baseClasses} w-0 md:w-12 opacity-0 md:opacity-100`;
    }
  });

  const handleToggleMenu = () => {
    store.setSession("isMenuOpen", true);
  };

  const handleSearchContainerRef = (el: HTMLDivElement) => {
    searchContainerRef = el;
  };

  const menuContent = createMemo(() => {
    if (!isMenuOpen()) {
      return (
        <div class="h-full flex flex-col items-center py-4 space-y-4">
          <button
            onClick={handleToggleMenu}
            class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title={"Buscar"}
          >
            <Icon name="search" size={20} />
          </button>
          <For each={menuHierarchy()}>
            {(item: MenuItem) => (
              <div class={item.hidden ? 'hidden' : ''}>
                <button
                  onClick={() => {
                    navigate(item.interface?.route ?? item.identifier);
                  }}
                  class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  title={item.name}
                >
                  {item.icon && <Icon name={item.icon} size={20} />}
                </button>
              </div>
            )}
          </For>
        </div>
      );
    }

    return (
      <div class="p-2">
        <div
          ref={handleSearchContainerRef}
          class="py-2"
        >
          <SearchBar
            availableFields={store.getTableFieldsFor("menu_items")}
            searchFilters={searchFilters}
            setSearchFilters={setSearchFilters}
            placeholder="Buscar…"
            debounceDelay={50}
            onInputRef={(input: HTMLInputElement) => {
              searchInputRef = input;
            }}
          />
        </div>

        <Show when={loading()}>
          <div class="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div class="flex items-center space-x-1 px-2 py-1">
                <div class="w-5 h-5 bg-gray-200 rounded animate-pulse"></div>
                <div class={`h-4 bg-gray-200 rounded animate-pulse ${i % 2 ? 'w-32' : 'w-24'}`}></div>
              </div>
            ))}
          </div>
        </Show>

        <Show when={error()}>
          <div class="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div class="flex items-center space-x-2 text-red-700">
              <Icon name="error" class="w-5 h-5" size="" stroke="currentColor" />
              <span class="text-sm">Error cargando menú</span>
              <span class="text-xs">{error()?.message}</span>
            </div>
          </div>
        </Show>

        <Show when={!loading() && !error()}>
          <nav class="space-y-1">
            <For each={menuHierarchy()}>
              {(item) => <MenuItemComponent item={item} />}
            </For>

            <Show when={menuHierarchy().length === 0}>
              <div class="p-2 text-center text-gray-500">
                <p class="text-sm">No hay resultados</p>
              </div>
            </Show>
          </nav>
        </Show>
      </div>
    );
  });

  return (
    <aside class={menuClasses()}>
      {menuContent()}
    </aside>
  );
}
