// src/components/navigation/Tabs.tsx
import { createSignal, For, JSX, mergeProps, Show } from 'solid-js';

interface TabsProps {
  tabs?: Array<{ label: string; content: any[] }>;
  activeTab?: number;
  designer?: boolean;
  onPropsUpdate?: (props: any) => void;
}

export default function Tabs(props: TabsProps) {
  const merged = mergeProps({
    tabs: [{ label: 'Pestaña 1', content: [] }],
    activeTab: 0
  }, props);

  const [activeTab, setActiveTab] = createSignal(merged.activeTab);

  if (merged.designer) {
    return (
      <div class="tabs-designer">
        <div class="tabs-header">
          <For each={merged.tabs}>
            {(tab, index) => (
              <button
                classList={{ active: activeTab() === index() }}
                onClick={() => setActiveTab(index())}
              >
                {tab.label}
              </button>
            )}
          </For>
        </div>
        <div class="tabs-content">
          <For each={merged.tabs}>
            {(tab, index) => (
              <Show when={activeTab() === index()}>
                <div class="tab-content">
                  {/* Renderizar el contenido de la pestaña */}
                  Contenido de {tab.label}
                </div>
              </Show>
            )}
          </For>
        </div>
        <div class="designer-overlay">
          <button onClick={() => {
            const newLabel = prompt('Nueva etiqueta para la pestaña', merged.tabs[activeTab()].label);
            if (newLabel) {
              const newTabs = [...merged.tabs];
              newTabs[activeTab()].label = newLabel;
              merged.onPropsUpdate?.({ tabs: newTabs });
            }
          }}>Editar Pestaña</button>
        </div>
      </div>
    );
  }

  return (
    <div class="tabs">
      <div class="tabs-header">
        <For each={merged.tabs}>
          {(tab, index) => (
            <button
              classList={{ active: activeTab() === index() }}
              onClick={() => setActiveTab(index())}
            >
              {tab.label}
            </button>
          )}
        </For>
      </div>
      <div class="tabs-content">
        <For each={merged.tabs}>
          {(tab, index) => (
            <Show when={activeTab() === index()}>
              <div class="tab-content">
                {/* Renderizar el contenido real */}
                {tab.content}
              </div>
            </Show>
          )}
        </For>
      </div>
    </div>
  );
}