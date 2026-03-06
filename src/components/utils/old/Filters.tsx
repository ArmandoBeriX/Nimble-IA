import { Component, For, Show } from 'solid-js';
import { TableField } from '../../../types/schema';

const FiltersControl: Component<{ fields?: TableField[]; context?: any }> = (props) => {
  const ctx = props.context ?? {};
  const { helpers, fields: ctxFields } = ctx;

  if (!helpers) {
    console.warn('FiltersControl: helpers no disponibles en el contexto');
    return null;
  }

  const allFields = props.fields ?? ctxFields ?? [];

  // YA NO ES NECESARIO llamar recomputeView() manualmente
  // El sistema reactivo actualiza automáticamente los datos

  function update(fieldId: string, val: any) {
    const current = helpers.filters();
    const next = { ...current };

    // Normalizar el valor vacío
    if (val === '' || val == null) {
      delete next[fieldId];
    } else {
      // Por defecto operador "="
      next[fieldId] = { op: '=', v: val };
    }

    // Esto activará automáticamente la actualización reactiva
    helpers.setFilters(next);

    // YA NO llamar: recomputeView() - ES AUTOMÁTICO
  }

  function getValue(fieldId: string) {
    const f = helpers.filters()?.[fieldId];
    return f ? f.v ?? '' : '';
  }

  return (
    <div class="flex flex-wrap gap-3 mb-2">
      <For each={allFields.filter((f: TableField) => f.isFilter || f.isUnique)}>
        {(field) => (
          <div class="flex items-center gap-2">
            <label class="text-sm text-gray-600">{field.name}</label>

            <Show when={field.fieldFormat === 'string'}>
              <input
                class="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-400"
                value={getValue(field.identifier)}
                onInput={(e) => update(field.identifier, (e.target as HTMLInputElement).value)}
                placeholder={`Filtrar ${field.name}`}
              />
            </Show>

            <Show when={field.fieldFormat === 'bool'}>
              <select
                class="px-2 py-1 border border-gray-300 rounded text-sm bg-white focus:ring-1 focus:ring-blue-400"
                value={getValue(field.identifier)}
                onChange={(e) => update(field.identifier, (e.target as HTMLSelectElement).value)}
              >
                <option value="">Todos</option>
                <option value="true">Sí</option>
                <option value="false">No</option>
              </select>
            </Show>

            <Show when={field.fieldFormat === 'int' || field.fieldFormat === 'float'}>
              <input
                type="number"
                class="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-400"
                value={getValue(field.identifier)}
                onInput={(e) => update(field.identifier, (e.target as HTMLInputElement).value)}
              />
            </Show>

            <Show when={field.fieldFormat === 'date'}>
              <input
                type="date"
                class="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-blue-400"
                value={getValue(field.identifier)}
                onInput={(e) => update(field.identifier, (e.target as HTMLInputElement).value)}
              />
            </Show>
          </div>
        )}
      </For>
    </div>
  );
};

export default FiltersControl;