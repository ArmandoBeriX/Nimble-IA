import TopNav from './TopNav';
import LeftMenu from './LeftMenu';
import { JSXElement, Show, createMemo } from 'solid-js';
import { store } from '../app';

export default function Layout(props: { children: JSXElement }) {
  const isMenuOpen = store.watchSession("isMenuOpen");
  const globalSearchValue = store.watchValue("globalSearchValue", "")

  return (
    <div class="min-h-screen bg-gray-50 flex flex-col">
      {/* TopNav fijo */}
      <TopNav />

      {/* Contenedor principal flex que contiene LeftMenu y contenido */}
      <div class="flex flex-1">
        {/* LeftMenu - ocupa espacio en el flujo normal */}
        <div class={`transition-all duration-300 ease-in-out ${isMenuOpen() ? 'w-64' : 'w-0 md:w-12'
          }`}>
          <LeftMenu />
        </div>

        {/* Contenido principal - se expande automáticamente */}
        <main class={`
          flex-1 transition-all duration-300 ease-in-out
          overflow-auto
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