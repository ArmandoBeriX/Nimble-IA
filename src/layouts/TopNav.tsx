import { store } from '../app';
import { createSignal, For, Show, createEffect, onCleanup } from 'solid-js';
import { useRecordQuery } from '../hooks/useRecords';
import { FilterInput, RawRecordFilter, TableRecord } from '../types/schema';
import Button from '../components/ui/Button';
import Icon from '../components/ui/icon/Icon';
import { A } from '@solidjs/router';
import { SearchBar } from '../components/utils/SearchBar';
import ContextMenu from '../components/ui/menu/ContextMenu';
import logo from '../assets/nav-logo.png';
import UserMenu from './modules/UserMenu';
import RecordButtonAction from '../components/record/RecordButtonAction';

type NavItem = TableRecord & {
  name: string;
  identifier: string;
  icon?: string;
  description?: string;
  interface_id?: string;
}

const QUERY_KEY = "q";

export default function TopNav() {
  const isMenuOpen = store.watchSession("isMenuOpen");
  const currentView = store.watchValue("currentView");
  const { data: navItems, loading, error } = useRecordQuery<NavItem>("menu_items",
    { is_fast_link: true },
    { order: [['position', 'ASC']] },
    { interface_id: {} });
  const user = store.watchSession("user");
  const isAdmin = () => Boolean(user()?.admin);
  const isLoggedIn = () => Boolean(user());
  const [globalSearchFilters, setGlobalSearchFilters] = createSignal<FilterInput>({});
  const [isMobile, setIsMobile] = createSignal(false);
  const [visibleNavItems, setVisibleNavItems] = createSignal<NavItem[]>([]);
  const [hiddenNavItems, setHiddenNavItems] = createSignal<NavItem[]>([]);
  const [navContainerRef, setNavContainerRef] = createSignal<HTMLDivElement>();
  const [navItemsContainerRef, setNavItemsContainerRef] = createSignal<HTMLDivElement>();

  createEffect(() => {
    const filter = globalSearchFilters()[QUERY_KEY as keyof FilterInput] as RawRecordFilter
    store.setValue("globalSearchValue", filter?.v, 300);
  })

  const handleMenuToggle = () => {
    store.setSession("isMenuOpen", !isMenuOpen());
  };

  const handleNavItemSelect = (id: string) => {
    store.setValue("currentView", id);
  };

  const openUserContextMenu = () => {
    // Implementar lógica del menú contextual del usuario
  };

  // Detectar tamaño de pantalla
  createEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    onCleanup(() => window.removeEventListener('resize', checkMobile));
  });

  // Calcular elementos visibles en la navegación - optimizado
  createEffect(() => {
    const items = (navItems || []).filter((item) => {
      const route = item.interface?.route ?? item.identifier ?? '';
      return isAdmin() || !route.startsWith('/admin');
    });
    if (isMobile()) {
      // En móvil, mostrar máximo 3 elementos, el resto en menú de 3 puntos
      const maxVisible = 3;
      setVisibleNavItems(items.slice(0, maxVisible));
      setHiddenNavItems(items.slice(maxVisible));
    }
  });

  // Efecto específico para desktop con ResizeObserver
  createEffect(() => {
    if (isMobile()) return;

    const items = (navItems || []).filter((item) => {
      const route = item.interface?.route ?? item.identifier ?? '';
      return isAdmin() || !route.startsWith('/admin');
    });
    const container = navContainerRef();
    const itemsContainer = navItemsContainerRef();

    if (!container || !itemsContainer || items.length === 0) {
      setVisibleNavItems(items);
      setHiddenNavItems([]);
      return;
    }

    const calculateVisibleItems = () => {
      const containerWidth = container.offsetWidth;
      const availableWidth = containerWidth - 100; // Reservar espacio para botón de 3 puntos y márgenes

      // Medir el ancho total de todos los items
      const itemElements = itemsContainer.children;
      let totalWidth = 0;
      const visibleIndices: number[] = [];

      for (let i = 0; i < itemElements.length; i++) {
        const element = itemElements[i] as HTMLElement;
        const itemWidth = element.offsetWidth + 8; // +8px para el espacio entre items
        if (totalWidth + itemWidth <= availableWidth) {
          totalWidth += itemWidth;
          visibleIndices.push(i);
        } else {
          break;
        }
      }

      // Si no cabe ninguno, mostrar al menos 1
      if (visibleIndices.length === 0 && items.length > 0) {
        visibleIndices.push(0);
      }

      const visible = items.filter((_, index) => visibleIndices.includes(index));
      const hidden = items.filter((_, index) => !visibleIndices.includes(index));

      setVisibleNavItems(visible);
      setHiddenNavItems(hidden);
    };

    // Usar ResizeObserver para detectar cambios en el tamaño del contenedor
    const resizeObserver = new ResizeObserver(() => {
      calculateVisibleItems();
    });

    resizeObserver.observe(container);
    // También observar cambios en los items individuales
    for (const child of itemsContainer.children) {
      resizeObserver.observe(child);
    }

    // Calcular inicialmente
    setTimeout(calculateVisibleItems, 0);

    onCleanup(() => {
      resizeObserver.disconnect();
    });
  });

  const syncStatus = store.watchSession("syncStatus")

  // Componente reutilizable para el título y estado online
  const renderBrandSection = () => (
    <div class="flex items-center">
      <img
        src={logo}
        alt="NimbleAI"
        class="h-8 w-auto object-contain"
        loading="lazy" // Carga diferida
        decoding="async" // Decodificación asíncrona
      />
      <div class="ml-2 flex items-center">

        {(syncStatus() == 1 ?
          <>
            <span class="h-2.5 w-2.5 rounded-full bg-yellow-500 animate-pulse mr-1"></span>
            <span class="text-xs text-gray-500 ml-1">Sync</span>
          </> :
          syncStatus() == 2 ?
            <>
              <span class="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse mr-1"></span>
              <span class="text-xs text-gray-500 ml-1">Online</span>
            </> :
            <>
              <span class="h-2.5 w-2.5 rounded-full bg-red-500"></span>
              <span class="text-xs text-gray-500 ml-1">Offline</span>
            </>)
        }

      </div>
    </div>
  );

  // Componente reutilizable para los botones de usuario
  const renderUserButtons = () => (
    <Show when={!user()}>
      <div class="flex items-center">
        <A href="/login">
          <Button variant="outline" size="sm">Iniciar sesión</Button>
        </A>
      </div>
    </Show>
  );

  // Componente reutilizable para la sección del usuario logueado
  const renderLoggedUser = () => (
    <UserMenu
      user={user()}
      onLogout={() => store.logout()}
    />
  );

  // Componente reutilizable para el botón de menú
  const renderMenuToggle = () => (
    <button
      class="p-1.5 rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-colors"
      onClick={handleMenuToggle}
      aria-label="Toggle menu"
    >
      <div class="w-5 h-5 flex items-center justify-center">
        {isMenuOpen() ? (
          <Icon name="x" />
        ) : (
          <Icon name="menu" />
        )}
      </div>
    </button>
  );

  // Componente reutilizable para la navegación desktop
  const renderDesktopNavigation = () => (
    <div
      ref={setNavContainerRef}
      class="hidden md:flex items-center justify-center flex-1 min-w-0 px-4"
    >
      <div
        ref={setNavItemsContainerRef}
        class="flex items-center space-x-1"
      >
        <For each={visibleNavItems()}>
          {(item) => (
            <A
              href={item.interface?.route ?? item.identifier}
              onClick={(e) => handleNavItemSelect(item.interface?.route ?? item.identifier)}
              class={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs transition-all duration-200 flex-shrink-0 ${currentView() === (item.interface?.route ?? item.identifier)
                ? 'bg-white shadow-sm text-blue-600 border border-gray-200'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              title={item.description}
            >
              {(item.interface?.icon ?? item.icon) && (
                <div class={`${currentView() === (item.interface?.route ?? item.identifier) ? 'text-blue-600' : 'text-gray-500'}`}>
                  <Icon name={item.interface?.icon ?? item.icon} size={16} />
                </div>
              )}
              <span class={`text-sm font-medium whitespace-nowrap ${currentView() === item.identifier ? 'font-semibold' : 'font-normal'}`}>
                {item.name}
              </span>
            </A>
          )}
        </For>

        {/* Menú de 3 puntos para elementos ocultos */}
        <Show when={hiddenNavItems().length > 0}>
          <ContextMenu
            trigger={
              <button class="flex items-center px-2 py-1.5 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-900 flex-shrink-0">
                <Icon name="3-bullets" size={16} />
              </button>
            }
            items={hiddenNavItems().map(item => ({
              label: item.name,
              icon: item.interface?.icon ?? item.icon,
              onClick: () => handleNavItemSelect(item.interface?.route ?? item.identifier),
              href: item.interface?.route ?? item.identifier
            }))}
            position="bottom"
          />
        </Show>

        <Show when={loading()}>
          <div class="flex items-center space-x-2 px-3 py-1.5 flex-shrink-0">
            <div class="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400"></div>
            <span class="text-xs text-gray-500">Cargando...</span>
          </div>
        </Show>
        <Show when={error()}>
          <div class="px-3 py-1.5 text-red-500 text-xs flex-shrink-0">
            Error cargando enlaces
          </div>
        </Show>
      </div>
    </div>
  );

  // Componente reutilizable para iconos de acciones
  const renderActionIcons = () => (
    <div class="flex items-center space-x-1">
      <button class="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
        <Icon name="notification" size={18} />
      </button>
      <button class="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
        <Icon name="settings" size={18} />
      </button>
    </div>
  );

  // Navegación móvil con menú de 3 puntos
  const renderMobileNavigation = () => (
    <div class="flex items-center space-x-1">
      <For each={visibleNavItems()}>
        {(item) => (
          <A
            href={item.identifier}
            onClick={(e) => handleNavItemSelect(item.identifier)}
            class={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs flex-shrink-0 ${currentView() === item.identifier
              ? 'bg-blue-50 text-blue-600 border border-blue-200'
              : 'text-gray-700 hover:bg-gray-100'
              }`}
          >
            {item.icon && <Icon name={item.icon} size={12} />}
            <span class="whitespace-nowrap">{item.name}</span>
          </A>
        )}
      </For>

      <Show when={hiddenNavItems().length > 0}>
        <ContextMenu
          trigger={
            <button class="flex items-center px-2 py-1 rounded-full text-xs text-gray-500 hover:bg-gray-100 flex-shrink-0">
              <Icon name="3-bullets" size={12} />
            </button>
          }
          items={hiddenNavItems().map(item => ({
            label: item.name,
            icon: item.icon,
            onClick: () => handleNavItemSelect(item.identifier),
            href: item.identifier
          }))}
          position="bottom"
        />
      </Show>
    </div>
  );

  // Renderizado principal
  return (
    <>
      {/* Versión móvil */}
      <Show when={isMobile()}>
        <div class="md:hidden fixed top-0 left-0 right-0 z-50">
          {/* Primera fila móvil: Título, Online y Login/Usuario */}
          <div class="h-12 bg-white border-b border-gray-200 shadow-sm px-3 flex items-center justify-between">
            <div class="flex items-center space-x-2">
              {renderMenuToggle()}
              {renderBrandSection()}
            </div>

            <div class="flex items-center space-x-2">
              {renderUserButtons()}
              {renderLoggedUser()}
            </div>
          </div>

          {/* Segunda fila móvil: Buscar, Navegación y Acciones */}
          <div class="h-10 bg-white border-b border-gray-200 shadow-sm px-3 flex items-center justify-between">
            <div class="flex-1 flex items-center space-x-2">
              <div class="flex-1 min-w-0">
                <Show
                  when={isLoggedIn()}
                  fallback={<div class="text-xs text-gray-400 px-2">Inicia sesión para ver navegación y búsqueda</div>}
                >
                  <SearchBar
                    availableFields={[QUERY_KEY]}
                    searchFilters={globalSearchFilters}
                    setSearchFilters={setGlobalSearchFilters}
                    placeholder="Buscar en todo…"
                    debounceDelay={300}
                  />
                </Show>
              </div>
              <Show when={isLoggedIn()}>
                <div class="flex items-center space-x-1">
                  {/* {renderMobileNavigation()} */}
                  {renderActionIcons()}
                </div>
              </Show>
            </div>
          </div>
        </div>
      </Show>

      {/* Versión desktop */}
      <Show when={!isMobile()}>
        <nav class="hidden md:flex fixed top-0 left-0 right-0 h-12 bg-white border-b border-gray-200 shadow-sm z-50">
          <div class="h-full px-4 flex items-center justify-between w-full">
            {/* Sección izquierda: Menú y Marca */}
            <div class="flex items-center space-x-2">
              {renderMenuToggle()}
              {renderBrandSection()}
            </div>

            {/* Sección central: Navegación dinámica */}
            <Show when={isLoggedIn()} fallback={<div class="hidden md:flex flex-1"></div>}>
              {renderDesktopNavigation()}
            </Show>

            {/* Sección derecha: Buscar, Acciones y Usuario */}
            <div class="flex items-center space-x-2">
              <Show when={isLoggedIn()}>
                <SearchBar
                  availableFields={['q']}
                  searchFilters={globalSearchFilters}
                  setSearchFilters={setGlobalSearchFilters}
                  placeholder="Buscar en todo…"
                  debounceDelay={300}
                  style="width: 120px"
                />
                {renderActionIcons()}
                <div class="border-l border-gray-300 h-5"></div>
              </Show>
              {renderUserButtons()}
              {renderLoggedUser()}
            </div>
          </div>
        </nav>
      </Show>

      {/* Espacio para evitar que el contenido quede oculto bajo el navbar fijo */}
      <div class={isMobile() ? 'h-22' : 'h-12'}></div>
    </>
  );
}