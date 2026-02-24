// userRecords.ts
import { createSignal, onMount, onCleanup, Accessor, createEffect, createMemo } from 'solid-js';
import { store } from '../app';
import { FilterInput, TableRecord } from '../types/schema';

interface QueryOptions {
  order?: Array<[string, 'ASC' | 'DESC']>;
  page?: number;
  limit?: number;
}

export type MaybeSignal<T> = T | Accessor<T>;

export function unwrapSignal<T>(value: MaybeSignal<T>): T {
  return typeof value === 'function' ? (value as Accessor<T>)() : value;
}

function getLoadingLabel(tableId: string) {
  const schemaTable = store.getTable(tableId)
  return `Cargando ${schemaTable?.namePlural || schemaTable?.name || tableId}...`
}

/* ------------------------------------------------------------------
   useRecordQuery
------------------------------------------------------------------- */
export type IncludeRelProps = Record<string, {
  foreignKey?: string; // Relation Field Identifier
  tableSource?: string; // Relation Table Identifier
  filters?: MaybeSignal<FilterInput | undefined>;
  options?: MaybeSignal<QueryOptions | undefined>;
  includes?: IncludeRelProps;
}>

export function useRecordQuery<T = TableRecord>(
  tableId: string,
  filters?: MaybeSignal<FilterInput | undefined>,
  options?: MaybeSignal<QueryOptions | undefined>,
  includes?: IncludeRelProps
): {
  data: Accessor<T[]>;
  loading: Accessor<string>;
  error: Accessor<Error | null>;
  refresh: () => Promise<void>;
} {
  const [data, setData] = createSignal<T[]>([]);
  const [loading, setLoading] = createSignal(getLoadingLabel(tableId));
  const [error, setError] = createSignal<Error | null>(null);

  let unsubscribe: (() => void) | null = null;
  let version = 0;

  createEffect(() => {
    const currentVersion = ++version;

    const rawFilters = unwrapSignal(filters);
    const currentOptions = unwrapSignal(options);

    const normalizedFilters = rawFilters
      ? store.normalizeFilters(rawFilters, tableId)
      : {};

    // cleanup previo
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }

    setLoading(getLoadingLabel(tableId));
    setError(null);

    // suscripción reactiva
    unsubscribe = store.subscribeToQuery(
      tableId,
      normalizedFilters,
      currentOptions ?? {},
      (rows: T[]) => {
        if (currentVersion !== version) return;
        // aqui deberia agregarce el manejo de includes // Cada row que tenga include debe agregarce por ejemplo si es report_id, seria report: {data: Accesor, loading: Accessor, error: Accessor}, y dentro de data seria la misma historia recursiva
        // Aqui deberia darcele a rows metodos que devuelvan el valor que debe ser cacheado arriba.
        setData(rows);
        setLoading('');
      },
      includes
    );

    // carga inicial async (protegida)
    (async () => {
      try {
        const initial = await store.query(tableId, rawFilters, currentOptions);
        if (currentVersion === version) {
          setData(initial as T[]);
        }
      } catch (err) {
        if (currentVersion === version) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        setLoading('')
      }
    })();

    onCleanup(() => {
      version++;
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    });
  });

  const refresh = async () => {
    try {
      setLoading(getLoadingLabel(tableId));
      const rawFilters = unwrapSignal(filters);
      const currentOptions = unwrapSignal(options);
      const result = await store.query(tableId, rawFilters, currentOptions);
      setData(result as T[]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading('')
    }
  };

  return { data, loading, error, refresh };
}

/* ------------------------------------------------------------------
   useRecordCount
------------------------------------------------------------------- */
export function useRecordCount(
  tableId: string,
  filters?: MaybeSignal<FilterInput | undefined>
): {
  count: Accessor<number>;
  loading: Accessor<string>;
  error: Accessor<Error | null>;
  refresh: () => Promise<void>;
} {
  const [count, setCount] = createSignal(0);
  const [loading, setLoading] = createSignal(getLoadingLabel(tableId));
  const [error, setError] = createSignal<Error | null>(null);

  let unsubscribe: (() => void) | null = null;
  let version = 0;

  createEffect(() => {
    const currentVersion = ++version;

    const rawFilters = unwrapSignal(filters);
    const normalizedFilters = rawFilters
      ? store.normalizeFilters(rawFilters, tableId)
      : {};

    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }

    setLoading(getLoadingLabel(tableId));
    setError(null);

    unsubscribe = store.subscribeToCount(
      tableId,
      normalizedFilters,
      (newCount: number) => {
        if (currentVersion !== version) return;
        setCount(newCount);
        setLoading('')
      }
    );

    // carga inicial async (protegida)
    (async () => {
      try {
        const initial = await store.count(tableId, rawFilters);
        if (currentVersion === version) {
          setCount(initial);
        }
      } catch (err) {
        if (currentVersion === version) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        setLoading('');
      }
    })();

    // unsubscribe = sub.stop;
    // setCount(sub.data());
    // setLoading('')

    onCleanup(() => {
      version++;
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    });
  });

  const refresh = async () => {
    try {
      setLoading(getLoadingLabel(tableId));
      const rawFilters = unwrapSignal(filters);
      const c = await store.count(tableId, rawFilters);
      setCount(c);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading('')
    }
  };

  return { count, loading, error, refresh };
}

/* ------------------------------------------------------------------
   useRecordTotal
------------------------------------------------------------------- */
export function useRecordTotal(
  tableId: string,
  fieldId: string,
  filters?: MaybeSignal<FilterInput | undefined>
): {
  total: Accessor<number>;
  loading: Accessor<string>;
  error: Accessor<Error | null>;
  refresh: () => Promise<void>;
} {
  const [total, setTotal] = createSignal(0);
  const [loading, setLoading] = createSignal(getLoadingLabel(tableId));
  const [error, setError] = createSignal<Error | null>(null);

  let unsubscribe: (() => void) | null = null;
  let version = 0;

  createEffect(() => {
    const currentVersion = ++version;

    const rawFilters = unwrapSignal(filters);
    const normalizedFilters = rawFilters
      ? store.normalizeFilters(rawFilters, tableId)
      : {};

    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }

    setLoading(getLoadingLabel(tableId));
    setError(null);

    unsubscribe = store.subscribeToTotal(
      tableId,
      fieldId,
      normalizedFilters,
      (newTotal: number) => {
        if (currentVersion !== version) return;
        setTotal(newTotal);
        setLoading('')
      }
    );

    // carga inicial async (protegida)
    (async () => {
      try {
        const initial = await store.total(tableId, fieldId, rawFilters);
        if (currentVersion === version) {
          setTotal(initial);
        }
      } catch (err) {
        if (currentVersion === version) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        setLoading('')
      }
    })();


    onCleanup(() => {
      version++;
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    });
  });

  const refresh = async () => {
    try {
      setLoading(getLoadingLabel(tableId));
      const rawFilters = unwrapSignal(filters);
      const t = await store.total(tableId, fieldId, rawFilters);
      setTotal(t);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading('')
    }
  };

  return { total, loading, error, refresh };
}

