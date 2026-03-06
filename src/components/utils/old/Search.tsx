import { createSignal, createEffect, onCleanup } from 'solid-js';

export function Search(props: { context?: Record<string, any> }) {
  const ctx = props.context ?? {};
  const { helpers } = ctx;

  if (!helpers) {
    console.error('Search.tsx: helpers no disponibles en el contexto');
    return null;
  }

  const [query, setQuery] = createSignal('');
  let timer: ReturnType<typeof setTimeout> | null = null;
  const DEBOUNCE_MS = 150;

  createEffect(() => {
    const q = String(query() ?? '').trim();
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => helpers.setSearchQuery(q), DEBOUNCE_MS);
  });

  onCleanup(() => { if (timer) clearTimeout(timer); });

  return (
    <input
      type="text"
      placeholder="Buscar..."
      value={helpers.searchQuery?.() ?? ''}
      onInput={(e) => setQuery(e.currentTarget.value)}
      class="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
    />
  );
}
