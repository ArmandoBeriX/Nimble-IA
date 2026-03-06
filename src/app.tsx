// app.tsx
import { JSX, onMount, Suspense, type Component, createSignal } from 'solid-js';
import { A, useLocation } from '@solidjs/router';
import { RecordsManager } from './lib/records-manager';
import { ToastRoot } from './lib/toast';
import { RecordsManagerSingleton } from './lib/records-manager-singlenton';
import ModalRenderer from './components/modal/ModalRender';
import IconLoader from './components/ui/icon/IconLoader';
import { DB_NAME } from './lib/db';
import Layout from './layouts/Layout';
import InitialLoad from './components/InitialLoad';

export let store: RecordsManager;

const App: Component<{ children: JSX.Element }> = (props) => {
  const location = useLocation();
  const [ready, setReady] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  onMount(async () => {
    try {
      // Usar el singleton
      store = await RecordsManagerSingleton.getInstance();
      await store.preloadSettings()
      // setTimeout(() => {
      setReady(true);
      // }, 10)
    } catch (error) {
      console.error('Error loading database:', error);
      delete localStorage['nimbleai_initialized_' + DB_NAME]
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  });

  return (
    <>
      <ModalRenderer />
      <ToastRoot />

      {error() ? (
        <div class="p-4 text-center text-red-600">
          Error: {error()}. Please refresh the page.
        </div>
      ) : ready() ? (
        <>
          <IconLoader />

          <div id="app">
            <Layout>
              <InitialLoad /> 
              <Suspense fallback={<div class="p-4 text-center text-gray-600">Loading content...</div>}>
                {props.children}
              </Suspense>
            </Layout>
          </div>
        </>
      ) : (
        <div class="p-4 text-center text-gray-600">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-2"></div>
          <div>Cargando base de datos...</div>
        </div>
      )}
    </>
  );
};

export default App;