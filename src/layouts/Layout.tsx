import TopNav from './TopNav';
import LeftMenu from './LeftMenu';
import { JSXElement, Show, createEffect } from 'solid-js';
import { store } from '../app';
import { useLocation, useNavigate } from '@solidjs/router';

export default function Layout(props: { children: JSXElement }) {
  const isMenuOpen = store.watchSession("isMenuOpen");
  const globalSearchValue = store.watchValue("globalSearchValue", "")
  const user = store.watchSession("user");
  const isLoggedIn = () => Boolean(user());
  const location = useLocation();
  const navigate = useNavigate();

  createEffect(() => {
    const currentPath = location.pathname;
    const isAdmin = Boolean(user()?.admin);
    if (currentPath.startsWith('/admin') && !isAdmin) {
      navigate('/');
    }
  });

  return (
    <div class="min-h-screen bg-gray-50 flex flex-col">
      {/* TopNav fijo */}
      <TopNav />

      {/* Contenedor principal flex que contiene LeftMenu y contenido */}
      <div class="flex flex-1">
        {/* LeftMenu - ocupa espacio en el flujo normal */}
        <div class={`transition-all duration-300 ease-in-out ${isLoggedIn() && isMenuOpen() ? 'w-64' : 'w-0 md:w-12'
          }`}>
          <Show when={isLoggedIn()}>
            <LeftMenu />
          </Show>
        </div>

        {/* Contenido principal - se expande automáticamente */}
        <main class={`
          flex-1 transition-all duration-300 ease-in-out
          overflow-auto h-[calc(100vh-48px)]
        `}>
          <div class="min-h-full">
            <div class={globalSearchValue() ? 'hidden' : ''}>
              {props.children}
            </div>
            <Show when={globalSearchValue()} >
              <div class="p-16 flex w-full items-center justify-center">
                TODO: Implementar busqueda general: {globalSearchValue()}
              </div>
            </Show>
          </div>
        </main>
      </div>
    </div>
  );
}