// useRecords.ts
import { createSignal, onCleanup, Accessor, createEffect } from 'solid-js';
import { store } from '../app';
import { FilterInput, TableRecord } from '../types/schema';
import { createStore, reconcile } from 'solid-js/store';

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
  const schemaTable = store.getTable(tableId);
  return `Cargando ${schemaTable?.namePlural || schemaTable?.name || tableId}...`;
}

/* ------------------------------------------------------------------
   IncludeRelProps
------------------------------------------------------------------- */
export type IncludeRelProps = Record<string, {
  foreignKey?: string;
  tableSource?: string;
  filters?: MaybeSignal<FilterInput | undefined>;
  options?: MaybeSignal<QueryOptions | undefined>;
  includes?: IncludeRelProps;
}>;

/* ------------------------------------------------------------------
   useRecordQuery
------------------------------------------------------------------- */
export function useRecordQuery<T extends TableRecord = TableRecord>(
  tableId: string,
  filters?: MaybeSignal<FilterInput | undefined>,
  options?: MaybeSignal<QueryOptions | undefined>,
  includes?: IncludeRelProps
): {
  data: T[];
  loading: Accessor<string>;
  error: Accessor<Error | null>;
  refresh: () => Promise<void>;
} {
  const [data, setData] = createStore<T[]>([]);
  const [loading, setLoading] = createSignal(getLoadingLabel(tableId));
  const [error, setError] = createSignal<Error | null>(null);

  let unsubscribe: (() => void) | null = null;
  let version = 0;

  createEffect(() => {
    const currentVersion = ++version;

    const rawFilters    = unwrapSignal(filters);
    const currentOptions = unwrapSignal(options);
    const normalizedFilters = rawFilters
      ? store.normalizeFilters(rawFilters, tableId)
      : {};

    if (unsubscribe) { unsubscribe(); unsubscribe = null; }

    setLoading(getLoadingLabel(tableId));
    setError(null);

    // Llamado por subscribeToQuery antes de cada re-fetch
    const onLoading = () => {
      if (currentVersion !== version) return;
      setLoading(getLoadingLabel(tableId));
    };

    // Llamado por subscribeToQuery cuando llegan datos nuevos
    const onData = (rows: (TableRecord)[]) => {
      if (currentVersion !== version) return;
      setData(reconcile(rows as T[], { key: 'id' }));
      setLoading('');
    };

    unsubscribe = store.subscribeToQuery(
      tableId,
      normalizedFilters,
      currentOptions ?? {},
      onData,
      includes,
      onLoading,
    );

    onCleanup(() => {
      version++;
      if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    });
  });

  const refresh = async () => {
    try {
      setLoading(getLoadingLabel(tableId));
      const rawFilters    = unwrapSignal(filters);
      const currentOptions = unwrapSignal(options);
      const result = await store.query<T>(tableId, rawFilters, currentOptions);
      setData(reconcile(result, { key: 'id' }));
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading('');
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
  const [count, setCount]   = createSignal(0);
  const [loading, setLoading] = createSignal(getLoadingLabel(tableId));
  const [error, setError]   = createSignal<Error | null>(null);

  let unsubscribe: (() => void) | null = null;
  let version = 0;

  createEffect(() => {
    const currentVersion = ++version;

    const rawFilters = unwrapSignal(filters);
    const normalizedFilters = rawFilters
      ? store.normalizeFilters(rawFilters, tableId)
      : {};

    if (unsubscribe) { unsubscribe(); unsubscribe = null; }

    setLoading(getLoadingLabel(tableId));
    setError(null);

    unsubscribe = store.subscribeToCount(
      tableId,
      normalizedFilters,
      (newCount: number) => {
        if (currentVersion !== version) return;
        setCount(newCount);
        setLoading('');
      }
    );

    onCleanup(() => {
      version++;
      if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    });
  });

  const refresh = async () => {
    try {
      setLoading(getLoadingLabel(tableId));
      const c = await store.count(tableId, unwrapSignal(filters));
      setCount(c);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading('');
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
  const [total, setTotal]   = createSignal(0);
  const [loading, setLoading] = createSignal(getLoadingLabel(tableId));
  const [error, setError]   = createSignal<Error | null>(null);

  let unsubscribe: (() => void) | null = null;
  let version = 0;

  createEffect(() => {
    const currentVersion = ++version;

    const rawFilters = unwrapSignal(filters);
    const normalizedFilters = rawFilters
      ? store.normalizeFilters(rawFilters, tableId)
      : {};

    if (unsubscribe) { unsubscribe(); unsubscribe = null; }

    setLoading(getLoadingLabel(tableId));
    setError(null);

    unsubscribe = store.subscribeToTotal(
      tableId,
      fieldId,
      normalizedFilters,
      (newTotal: number) => {
        if (currentVersion !== version) return;
        setTotal(newTotal);
        setLoading('');
      }
    );

    onCleanup(() => {
      version++;
      if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    });
  });

  const refresh = async () => {
    try {
      setLoading(getLoadingLabel(tableId));
      const t = await store.total(tableId, fieldId, unwrapSignal(filters));
      setTotal(t);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading('');
    }
  };

  return { total, loading, error, refresh };
}
