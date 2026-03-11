// src/lib/schema-cache.ts
import Dexie, { liveQuery } from "dexie";
import { createMemo, createRoot, createSignal, type Accessor, type Setter } from "solid-js";
import type { TableDef, TableField } from "../types/schema";

/* ─────────────────────────── Types ─────────────────────────── */

export type SettingEntry = {
  get: Accessor<any>;
  set: (v: any) => void;
  unsub?: () => void;
};

/* ─────────────────────────── SchemaCache ─────────────────────────── */

/**
 * SchemaCache — schema watching + session/value reactive storage.
 *
 * Startup sequence (managed by RecordsManagerSingleton):
 *   1. Constructor: creates signals/memos inside createRoot (no warnings).
 *      Does NOT start liveQuery yet. Does NOT resolve schemaReadyPromise.
 *   2. Singleton calls applySchema(defs, fields) with data read directly
 *      from Dexie after migrateSchema/openQuick. This resolves
 *      schemaReadyPromise immediately with real data.
 *   3. Singleton calls startWatching() to begin liveQuery subscriptions
 *      for subsequent reactive updates (admin schema changes, etc.).
 *
 * Why this order matters:
 *   On first run, liveQuery fires its first callback with [] (DB was empty
 *   at subscription time, even if migrateSchema already wrote data).
 *   Resolving schemaReadyPromise on an empty liveQuery callback would let
 *   preloadSettings and useRecords effects run against an empty schema.
 *   The eager applySchema call bypasses this race condition entirely.
 */
export class SchemaCache {
  private db: Dexie;

  // ── Source signals ───────────────────────────────────────────────
  // Assigned inside createRoot() callback — TS can't verify, hence !
  private readonly _tableDefs!: Accessor<TableDef[]>;
  private readonly _setTableDefs!: Setter<TableDef[]>;
  private readonly _tableFields!: Accessor<TableField[]>;
  private readonly _setTableFields!: Setter<TableField[]>;

  // ── Derived maps (createMemo) ────────────────────────────────────
  private readonly _tablesById!: Accessor<Map<string, TableDef>>;
  private readonly _tablesByIdentifier!: Accessor<Map<string, TableDef>>;
  private readonly _fieldsById!: Accessor<Map<string, TableField>>;
  private readonly _fieldsByIdentifier!: Accessor<Map<string, TableField>>;
  private readonly _tableFieldsMap!: Accessor<Map<string, TableField[]>>;

  // ── Schema ready ─────────────────────────────────────────────────
  private _schemaReadyResolve!: () => void;
  private _schemaLoaded = false;
  readonly schemaReadyPromise!: Promise<void>;

  // ── createRoot dispose (prevents memory leaks) ───────────────────
  private _disposeRoot!: () => void;

  // ── liveQuery cleanup ────────────────────────────────────────────
  private _unsubDefs: (() => void) | null = null;
  private _unsubFields: (() => void) | null = null;

  // ── Session / Value storage ──────────────────────────────────────
  private sessionMap = new Map<string, SettingEntry>();
  private sessionDebounceMap = new Map<string, ReturnType<typeof setTimeout>>();
  private sessionDurationMap = new Map<string, ReturnType<typeof setTimeout>>();

  private valueMap = new Map<string, SettingEntry>();
  private valueDebounceMap = new Map<string, ReturnType<typeof setTimeout>>();
  private valueDurationMap = new Map<string, ReturnType<typeof setTimeout>>();
  private valueExpiryMap = new Map<string, number>();

  constructor(params: { dbOrManager: Dexie | any }) {
    const { dbOrManager } = params;
    this.db =
      typeof dbOrManager?.dbInstance === "function"
        ? dbOrManager.dbInstance()
        : (dbOrManager as Dexie);

    this.schemaReadyPromise = new Promise<void>((resolve) => {
      this._schemaReadyResolve = resolve;
    });

    // ── All reactive primitives MUST live inside createRoot ──────────
    //
    // SchemaCache is instantiated inside an async callback (after several
    // awaits). At that point SolidJS's reactive owner has been lost — async
    // cuts the owner chain. Without createRoot every createSignal/createMemo
    // logs "computations created outside a createRoot will never be disposed"
    // and leaks memory. createRoot creates an explicit owner; we store the
    // dispose fn and call it in stop().
    //
    // TypeScript can't see assignments inside the createRoot callback, hence
    // the `!` on the property declarations and the cast below.
    const self = this as any;

    self._disposeRoot = createRoot((dispose) => {
      const [getTables, setTables]   = createSignal<TableDef[]>([]);
      const [getFields, setFields]   = createSignal<TableField[]>([]);

      self._tableDefs       = getTables;
      self._setTableDefs    = setTables;
      self._tableFields     = getFields;
      self._setTableFields  = setFields;

      self._tablesById = createMemo(() => {
        const m = new Map<string, TableDef>();
        for (const t of getTables()) if (t.id) m.set(t.id, t);
        return m;
      });

      self._tablesByIdentifier = createMemo(() => {
        const m = new Map<string, TableDef>();
        for (const t of getTables()) if (t.identifier) m.set(t.identifier, t);
        return m;
      });

      self._fieldsById = createMemo(() => {
        const m = new Map<string, TableField>();
        for (const f of getFields()) if (f.id) m.set(f.id, f);
        return m;
      });

      self._fieldsByIdentifier = createMemo(() => {
        const m = new Map<string, TableField>();
        for (const f of getFields()) {
          if (f.identifier && f.tableIdentifier)
            m.set(`${f.tableIdentifier}-${f.identifier}`, f);
        }
        return m;
      });

      self._tableFieldsMap = createMemo(() => {
        const m = new Map<string, TableField[]>();
        for (const f of getFields()) {
          const arr = m.get(f.tableIdentifier) ?? [];
          arr.push(f);
          m.set(f.tableIdentifier, arr);
        }
        return m;
      });

      return dispose;
    });

    // Purge stale sessions on startup (non-blocking)
    this._purgeExpiredSessions().catch((e) =>
      console.warn("SchemaCache: purgeExpiredSessions error", e)
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // Called by RecordsManagerSingleton after migration/openQuick
  // ═══════════════════════════════════════════════════════════════

  /**
   * Push a known-good set of defs+fields into the cache and resolve
   * schemaReadyPromise. Called once by the singleton with data read
   * directly from Dexie (not from liveQuery) so there's no race condition
   * with the first liveQuery callback returning empty arrays.
   */
  applySchema(defs: TableDef[], fields: TableField[]): void {
    this._setTableDefs(defs);
    this._setTableFields(fields);

    if (!this._schemaLoaded) {
      this._schemaLoaded = true;
      this._schemaReadyResolve();
      console.log(
        `SchemaCache: ready — ${defs.length} tables, ${fields.length} fields`
      );
    }
  }

  /**
   * Start liveQuery on the meta table for reactive schema updates after
   * the initial eager load. Fires whenever any admin changes the schema.
   * Uses the same meta.get('schema') source as migrateSchema writes to.
   */
  startWatching(): void {
    if (this._unsubDefs || this._unsubFields) return; // already watching

    const metaTable = () => (this.db as any).table("meta");

    const sub = liveQuery<{ tableDefs?: any[]; tableFields?: any[] } | undefined>(
      () => metaTable().get("schema")
    ).subscribe({
      next: (meta) => {
        this._setTableDefs(Array.isArray(meta?.tableDefs)   ? meta!.tableDefs   : []);
        this._setTableFields(Array.isArray(meta?.tableFields) ? meta!.tableFields : []);
      },
      error: (err) => console.error("SchemaCache: meta liveQuery error", err),
    });

    // Reuse _unsubDefs slot for the single subscription (there's only one now)
    this._unsubDefs = () => { try { sub.unsubscribe(); } catch {} };
  }

  // ═══════════════════════════════════════════════════════════════
  // Public schema API
  // ═══════════════════════════════════════════════════════════════

  async waitForSchemaReady(): Promise<void> {
    return this.schemaReadyPromise;
  }

  isSchemaReady(): boolean {
    return this._schemaLoaded;
  }

  get tableDefs(): Accessor<TableDef[]> {
    return this._tableDefs;
  }

  get tableFields(): Accessor<TableField[]> {
    return this._tableFields;
  }

  getTable(key: string): TableDef | undefined {
    return this._tablesById().get(key) ?? this._tablesByIdentifier().get(key);
  }

  getTables(): Record<string, TableDef> {
    const result: Record<string, TableDef> = {};
    for (const [key, table] of this._tablesByIdentifier().entries()) {
      result[key] = table;
    }
    return result;
  }

  getField(key: string, tableKey?: string): TableField | undefined {
    const byId = this._fieldsById().get(key);
    if (byId) return byId;

    const tableIdentifier = this.getTable(tableKey ?? "")?.identifier ?? "";
    if (!tableIdentifier)
      throw new Error(`getField: tableKey required to resolve identifier "${key}"`);
    return this._fieldsByIdentifier().get(`${tableIdentifier}-${key}`);
  }

  getTableFieldsFor(key: string): TableField[] {
    const tableIdentifier = this.getTable(key)?.identifier ?? "";
    return (this._tableFieldsMap().get(tableIdentifier) ?? []).sort(
      (a, b) => (a.position ?? 0) - (b.position ?? 0)
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // observeTable — liveQuery for arbitrary tables (unchanged)
  // ═══════════════════════════════════════════════════════════════

  observeTable<T = any>(key: string, onChange: (rows: T[]) => void) {
    if (!key || !onChange) return;

    const tableIdentifier = this.getTable(key)?.identifier;
    if (!tableIdentifier) {
      console.warn("observeTable: table not found for key", key);
      return;
    }

    const dexieTable = (this.db as any).table(tableIdentifier);
    if (!dexieTable) {
      console.warn("observeTable: Dexie table not found", tableIdentifier);
      return;
    }

    const sub = liveQuery(() => dexieTable.toArray()).subscribe({
      next:  (rows) => onChange(rows as T[]),
      error: (err)  => console.error(`observeTable[${tableIdentifier}] error`, err),
    });

    return () => { try { sub.unsubscribe(); } catch {} };
  }

  // ═══════════════════════════════════════════════════════════════
  // Cleanup
  // ═══════════════════════════════════════════════════════════════

  stop() {
    this._unsubDefs?.();
    this._unsubFields?.();
    this._unsubDefs   = null;
    this._unsubFields = null;

    this._disposeRoot(); // disposes all createMemo / createSignal in the root

    for (const [, e] of this.sessionMap) { try { e.unsub?.(); } catch {} }
    this.sessionMap.clear();
    for (const t of this.sessionDebounceMap.values()) clearTimeout(t);
    this.sessionDebounceMap.clear();
    for (const t of this.sessionDurationMap.values()) clearTimeout(t);
    this.sessionDurationMap.clear();

    for (const [, e] of this.valueMap) { try { e.unsub?.(); } catch {} }
    this.valueMap.clear();
    for (const t of this.valueDebounceMap.values()) clearTimeout(t);
    this.valueDebounceMap.clear();
    for (const t of this.valueDurationMap.values()) clearTimeout(t);
    this.valueDurationMap.clear();
    this.valueExpiryMap.clear();
  }

  // ═══════════════════════════════════════════════════════════════
  // Value API — in-memory reactive store (unchanged)
  // ═══════════════════════════════════════════════════════════════

  watchValue(name: string, defaultValue?: any): Accessor<any> {
    if (!name) { const [g] = createSignal(undefined); return g; }
    const existing = this.valueMap.get(name);
    if (existing) return existing.get;
    const [get, set] = createSignal<any>(defaultValue);
    this.valueMap.set(name, { get, set });
    return get;
  }

  setValue(name: string, value: any, wait = 0, duration = 0): void {
    if (!name) return;
    if (this.valueDebounceMap.has(name)) {
      clearTimeout(this.valueDebounceMap.get(name));
      this.valueDebounceMap.delete(name);
    }
    if (wait <= 0) { this._applyValueChange(name, value, duration); return; }
    this.valueDebounceMap.set(name, setTimeout(() => {
      this._applyValueChange(name, value, duration);
      this.valueDebounceMap.delete(name);
    }, wait));
  }

  private _applyValueChange(name: string, value: any, duration = 0): void {
    const entry = this.valueMap.get(name);
    if (entry) { entry.set(value); }
    else { const [get, set] = createSignal<any>(value); this.valueMap.set(name, { get, set }); }

    if (duration > 0) {
      this.valueExpiryMap.set(name, Date.now() + duration);
      if (this.valueDurationMap.has(name)) clearTimeout(this.valueDurationMap.get(name));
      this.valueDurationMap.set(name, setTimeout(() => this.deleteValue(name), duration));
    } else {
      this.valueExpiryMap.delete(name);
      if (this.valueDurationMap.has(name)) {
        clearTimeout(this.valueDurationMap.get(name));
        this.valueDurationMap.delete(name);
      }
    }
  }

  deleteValue(name: string): void {
    if (!name) return;
    if (this.valueDebounceMap.has(name)) { clearTimeout(this.valueDebounceMap.get(name)); this.valueDebounceMap.delete(name); }
    if (this.valueDurationMap.has(name)) { clearTimeout(this.valueDurationMap.get(name)); this.valueDurationMap.delete(name); }
    this.valueExpiryMap.delete(name);
    const entry = this.valueMap.get(name);
    if (entry) { entry.set(undefined); this.valueMap.delete(name); }
  }

  // ═══════════════════════════════════════════════════════════════
  // Session API — IndexedDB-backed reactive store (unchanged)
  // ═══════════════════════════════════════════════════════════════

  watchSession(name: string, defaultValue?: any): Accessor<any> {
    if (!name) { const [g] = createSignal(undefined); return g; }
    const existing = this.sessionMap.get(name);
    if (existing) return existing.get;

    const [get, set] = createSignal<any>(defaultValue);
    const table = (this.db as any).table("session");

    const sub = liveQuery(async () => {
      try {
        const row = await table.get(name);
        if (!row) return undefined;
        if (row.expiresAt && Date.now() >= row.expiresAt) {
          try { await table.delete(name); } catch {}
          return undefined;
        }
        return row.value;
      } catch (e) {
        console.error("SchemaCache.watchSession liveQuery error", e);
        return undefined;
      }
    }).subscribe({
      next:  (val: any) => set(val),
      error: (err)      => console.error("SchemaCache.watchSession subscribe error", err),
    });

    this.sessionMap.set(name, {
      get, set,
      unsub: () => { try { sub.unsubscribe(); } catch {} },
    });

    // Optimistic seed from IndexedDB
    (async () => {
      try {
        const row = await table.get(name);
        if (!row) { set(undefined); return; }
        if (row.expiresAt && Date.now() >= row.expiresAt) {
          try { await table.delete(name); } catch {}
          set(undefined);
        } else {
          set(row.value);
        }
      } catch {}
    })();
    
    return get;
  }

  async setSession(name: string, value: any, wait = 200, duration = 0): Promise<void> {
    if (!name) return;

    if (this.sessionDebounceMap.has(name)) {
      clearTimeout(this.sessionDebounceMap.get(name));
      this.sessionDebounceMap.delete(name);
    }

    const entry = this.sessionMap.get(name);
    if (entry) { entry.set(value); }
    else { const [g, s] = createSignal<any>(value); this.sessionMap.set(name, { get: g, set: s }); }

    const expiresAt = duration > 0 ? Date.now() + duration : null;

    this.sessionDebounceMap.set(name, setTimeout(async () => {
      try {
        await (this.db as any).table("session").put({ name, value, expiresAt });
      } catch (e) {
        console.warn("SchemaCache.setSession: put failed", e);
      } finally {
        if (this.sessionDurationMap.has(name)) {
          clearTimeout(this.sessionDurationMap.get(name));
          this.sessionDurationMap.delete(name);
        }
        if (duration > 0) {
          this.sessionDurationMap.set(name, setTimeout(() => this.deleteSession(name), duration));
        }
      }
    }, wait));
  }

  async deleteSession(name: string): Promise<void> {
    if (!name) return;
    try { await (this.db as any).table("session").delete(name); } catch (e) {
      console.warn("SchemaCache.deleteSession failed", e);
    }
    const entry = this.sessionMap.get(name);
    if (entry) {
      entry.set(undefined);
      try { entry.unsub?.(); } catch {}
      this.sessionMap.delete(name);
    }
  }

  async clearAllSession(): Promise<void> {
    try { await (this.db as any).table("session").clear(); } catch (e) {
      console.warn("SchemaCache.clearAllSession failed", e);
    }
    for (const [, e] of this.sessionMap) { e.set(undefined); try { e.unsub?.(); } catch {} }
    this.sessionMap.clear();
  }

  async getAllSession(): Promise<Record<string, any>> {
    try {
      const table  = (this.db as any).table("session");
      const result: Record<string, any> = {};
      for (const entry of await table.toArray()) {
        if (entry.expiresAt && Date.now() >= entry.expiresAt) {
          try { await table.delete(entry.name); } catch {}
        } else {
          result[entry.name] = entry.value;
        }
      }
      return result;
    } catch (e) {
      console.warn("SchemaCache.getAllSession failed", e);
      return {};
    }
  }

  private async _purgeExpiredSessions(): Promise<void> {
    try {
      const table = (this.db as any).table("session");
      const now   = Date.now();
      for (const row of await table.toArray()) {
        if (row.expiresAt && now >= row.expiresAt) {
          try { await table.delete(row.name); } catch {}
          const entry = this.sessionMap.get(row.name);
          if (entry) {
            entry.set(undefined);
            try { entry.unsub?.(); } catch {}
            this.sessionMap.delete(row.name);
          }
        }
      }
    } catch (e) {
      console.warn("SchemaCache.purgeExpiredSessions failed", e);
    }
  }
}