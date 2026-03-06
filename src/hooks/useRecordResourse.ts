// src/hooks/useRecordsResource.ts
import { createResource, onCleanup, createEffect } from 'solid-js';
import { store } from '../app';
import { FilterInput, TableRecord } from '../types/schema';
import { IncludeRelProps, MaybeSignal, unwrapSignal } from './useRecords';
import { createStore } from 'solid-js/store';

interface QueryOptions {
  order?: Array<[string, 'ASC' | 'DESC']>;
  page?: number;
  limit?: number;
}

/**
 * useRecordsResource
 * - Utiliza createResource para la carga inicial y refetch manual.
 * - Se suscribe a cambios en tiempo real mediante store.subscribeToQuery.
 * - Actualiza el recurso vía mutate cuando llegan nuevos datos (incluyendo includes resueltos progresivamente).
 * - Los parámetros pueden ser valores fijos o señales (Accessor).
 */
export function useRecordsResource<T = TableRecord>(
  tableId: string,
  filters?: MaybeSignal<FilterInput | undefined>,
  options?: MaybeSignal<QueryOptions | undefined>,
  includes?: IncludeRelProps
) {
  // Señal que fuerza un refetch cuando cambian los parámetros
  const [paramsVersion, setParamsVersion] = createStore({ version: 0 });

  // Memoizamos los parámetros actuales para detectar cambios
  const currentFilters = () => unwrapSignal(filters);
  const currentOptions = () => unwrapSignal(options);

  // Función fetch que usa store.query (solo datos base, sin includes)
  const fetcher = async () => {
    const f = currentFilters();
    const o = currentOptions();
    return (await store.query(tableId, f, o)) as T[];
  };

  // Creamos el recurso; la fuente es paramsVersion.version, que incrementamos al cambiar parámetros
  const [data, { mutate, refetch }] = createResource(
    () => paramsVersion.version,
    fetcher
  );

  // Efecto para suscribirse a cambios en tiempo real
  createEffect(() => {
    const f = currentFilters();
    const o = currentOptions();
    const normalizedFilters = f ? store.normalizeFilters(f, tableId) : {};

    // Suscripción inteligente que resuelve includes progresivamente
    const unsubscribe = store.subscribeToQuery(
      tableId,
      normalizedFilters,
      o ?? {},
      (newData: T[]) => {
        // Actualiza el recurso con los nuevos datos (ya con includes resueltos)
        mutate(newData);
      },
      includes
    );

    onCleanup(() => {
      unsubscribe();
    });
  });

  // Cuando cambian los parámetros (filters u options), incrementamos la versión para forzar refetch
  createEffect(() => {
    // Serializamos para detectar cambios profundos
    const serialized = JSON.stringify({
      f: currentFilters(),
      o: currentOptions(),
    });
    // Incrementamos versión para que createResource refetchee
    setParamsVersion('version', (v: number) => v + 1);
  });

  return {
    data,               // Accessor<T[]> (recurso)
    loading: data.loading,
    error: data.error,
    refetch,            // Función para recargar manualmente
  };
}