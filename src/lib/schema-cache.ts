// src/lib/schema-cache.ts
import Dexie from "dexie";
import { liveQuery } from "dexie";
import { createSignal, type Accessor, onCleanup } from "solid-js";
import type { TableDef, TableField } from "../types/schema";

const META_KEY = "schema";

// const TableDefinitionsMetaTable: TableDef = {
//   id: 'table_defs',
//   name: "Tabla",
//   namePlural: "Tablas",
//   identifier: 'table_defs',
//   formatSelection: '{icon|icon} {namePlural??name}',
//   formatSelected: '{icon|icon} {namePlural??name}',
//   description: "Definiciones de tablas",
// }

// const TableFieldMetaTable: TableDef = {
//   id: 'table_fields',
//   name: 'Campo',
//   namePlural: 'Campos',
//   identifier: 'table_fields',
//   formatSelection: '{fieldFormat|icon} {name}',
//   formatSelected: '{fieldFormat|icon} {name}',
//   description: 'Definiciones de campos de tablas',
// }

export type SettingEntry = {
  get: Accessor<any>;
  set: (v: any) => void;
  unsub?: () => void;
};

export class SchemaCache {
  private db: Dexie;
  private metaSubUnsub: (() => void) | null = null;

  public getTableDefs!: Accessor<TableDef[]>;
  public setTableDefs!: (v: TableDef[]) => void;
  private getTableFields!: Accessor<TableField[]>;
  private setTableFields!: (v: TableField[]) => void;

  private tablesById = new Map<string, TableDef>();
  private tablesByIdentifier = new Map<string, TableDef>();
  private fieldsById = new Map<string, TableField>();
  private fieldsByIdentifier = new Map<string, TableField>();
  private tableFieldsMap = new Map<string, TableField[]>();

  // cache para settings reactivas
  private sessionMap = new Map<string, SettingEntry>();
  private valueMap = new Map<string, SettingEntry>();
  // Mapa para almacenar los timeouts por nombre
  private sessionDebounceMap = new Map<string, NodeJS.Timeout>();
  private sessionDurationMap = new Map<string, NodeJS.Timeout>();
  private valueDebounceMap = new Map<string, NodeJS.Timeout>();
  private valueDurationMap = new Map<string, NodeJS.Timeout>();
  private valueExpiryMap = new Map<string, number>(); // name -> timestamp de expiración

  // Propiedades para esperar a que el schema esté listo
  private schemaReadyPromise: Promise<void>;
  private schemaReadyResolve!: () => void;
  private hasLoadedSchema = false;
  private schemaLoadTimeout: NodeJS.Timeout | null = null;

  constructor(params: { dbOrManager: Dexie | any }) {
    const { dbOrManager } = params;
    this.db = typeof dbOrManager?.dbInstance === "function"
      ? dbOrManager.dbInstance()
      : (dbOrManager as Dexie);

    const [gTables, sTables] = createSignal<TableDef[]>([]);
    const [gFields, sFields] = createSignal<TableField[]>([]);
    this.getTableDefs = gTables; this.setTableDefs = sTables;
    this.getTableFields = gFields; this.setTableFields = sFields;

    // Crear promesa que se resolverá cuando el schema esté cargado
    this.schemaReadyPromise = new Promise((resolve) => {
      this.schemaReadyResolve = resolve;
    });

    // Configurar timeout de seguridad para la carga del schema
    this.schemaLoadTimeout = setTimeout(() => {
      if (!this.hasLoadedSchema) {
        console.warn('SchemaCache: timeout cargando schema, forzando resolución');
        this.markSchemaAsReady();
      }
    }, 5000); // 5 segundos máximo

    // init watcher y purga inicial de expirados
    this.initWatcher()
      .then(() => this.purgeExpiredSessions())
      .catch(e => console.error("SchemaCache:initWatcher:", e));
  }

  // Método para esperar a que el schema esté cargado
  async waitForSchemaReady(): Promise<void> {
    return this.schemaReadyPromise;
  }

  // Verificar si el schema ya está cargado
  isSchemaReady(): boolean {
    return this.hasLoadedSchema;
  }

  // Método para marcar el schema como listo (por si acaso)
  private markSchemaAsReady(): void {
    if (!this.hasLoadedSchema) {
      this.hasLoadedSchema = true;
      if (this.schemaReadyResolve) {
        this.schemaReadyResolve();
      }
      if (this.schemaLoadTimeout) {
        clearTimeout(this.schemaLoadTimeout);
        this.schemaLoadTimeout = null;
      }
    }
  }

  // === Accessores reactivos ===
  get tableDefs(): Accessor<TableDef[]> { return this.getTableDefs; }
  get tableFields(): Accessor<TableField[]> { return this.getTableFields; }

  // === Getters directos ===
  getTable(key: string): TableDef | undefined {
    // if (key === 'table_defs')
    //   return TableDefinitionsMetaTable;
    // if (key?.startsWith('table_fields'))
    //   return TableFieldMetaTable;
    return this.tablesById.get(key) ?? this.tablesByIdentifier.get(key);
  }

  getTables(): Record<string, TableDef> {
    const result: Record<string, TableDef> = {};
    for (const [key, table] of this.tablesByIdentifier.entries()) {
      result[key] = table;
    }
    return result;
  }

  // Si key es identifier hay que proporcionar tableKey
  getField(key: string, tableKey?: string): TableField | undefined {
    const field = this.fieldsById.get(key)
    if (field)
      return field
    else {
      const tableIdentifier = this.getTable(tableKey ?? '')?.identifier ?? ''
      if (!tableIdentifier) throw new Error('tableIdentifier is required')
      return this.fieldsByIdentifier.get(tableIdentifier + '-' + key);
    }
  }

  getTableFieldsFor(key: string): TableField[] {
    const tableIdentifier = this.getTable(key)?.identifier || ''
    return (this.tableFieldsMap.get(tableIdentifier || '') ?? []).sort((a, b) => (a.position || 0) - (b.position || 0));
  }

  stop() {
    if (this.metaSubUnsub) {
      try { this.metaSubUnsub(); } catch { }
      this.metaSubUnsub = null;
    }

    // Limpiar timeout de seguridad
    if (this.schemaLoadTimeout) {
      clearTimeout(this.schemaLoadTimeout);
      this.schemaLoadTimeout = null;
    }

    // cleanup session watchers
    for (const [, entry] of this.sessionMap) {
      try { entry.unsub?.(); } catch { }
    }
    this.sessionMap.clear();

    // Limpiar value watchers
    for (const [, entry] of this.valueMap) {
      try {
        entry.unsub?.();
      } catch { }
    }
    this.valueMap.clear();

    // Limpiar debounces de values
    for (const timeout of this.valueDebounceMap.values()) {
      clearTimeout(timeout);
    }
    this.valueDebounceMap.clear();

    // Limpiar expiraciones programadas de values
    for (const timeout of this.valueDurationMap.values()) {
      clearTimeout(timeout);
    }
    this.valueDurationMap.clear();

    // Limpiar registro de expiraciones
    this.valueExpiryMap.clear();
  }

  // === Watcher global de schema ===
  private async initWatcher() {
    const observable = liveQuery(async () => {
      const meta = await (this.db as any).table("meta").get(META_KEY);
      return meta ?? null;
    });

    const sub = observable.subscribe({
      next: (metaRow: any) => {
        const tableDefs: TableDef[] = (metaRow?.tableDefs ?? []) as TableDef[];
        const tableFields: TableField[] = (metaRow?.tableFields ?? []) as TableField[];
        this.applySchema(tableDefs, tableFields);
      },
      error: (err) => console.error("SchemaCache.liveQuery error", err),
    });

    this.metaSubUnsub = () => { try { sub.unsubscribe(); } catch { } };

    const metaInit = await (this.db as any).table("meta").get(META_KEY);
    if (metaInit) {
      this.applySchema(metaInit.tableDefs ?? [], metaInit.tableFields ?? []);
    } else {
      // Si no hay meta data, aún así marcamos el schema como listo (vacío)
      console.warn('SchemaCache: No se encontraron metadatos, schema vacío');
      this.markSchemaAsReady();
    }
  }

  private applySchema(tableDefs: TableDef[], tableFields: TableField[]) {
    this.setTableDefs(tableDefs);
    this.setTableFields(tableFields);

    this.tablesById.clear(); this.tablesByIdentifier.clear();
    for (const t of tableDefs) {
      if (t.id) this.tablesById.set(t.id, t);
      if (t.identifier) this.tablesByIdentifier.set(t.identifier, t);
    }

    this.fieldsById.clear(); this.fieldsByIdentifier.clear(); this.tableFieldsMap.clear();
    for (const f of tableFields) {
      if (f.id) this.fieldsById.set(f.id, f);
      if (f.identifier) this.fieldsByIdentifier.set(f.tableIdentifier + '-' + f.identifier, f);
      const arr = this.tableFieldsMap.get(f.tableIdentifier) ?? [];
      arr.push(f);
      this.tableFieldsMap.set(f.tableIdentifier, arr);
    }

    // Marcar que el schema se ha cargado
    this.markSchemaAsReady();

    console.log(`SchemaCache: Schema cargado con ${tableDefs.length} tablas y ${tableFields.length} campos`);
  }

  // === Watcher específico de tabla ===
  observeTable<T = any>(key: string, onChange: (rows: T[]) => void) {
    if (!key || !onChange) return;

    const tableIdentifier = this.getTable(key)
    const table = (this.db as any).table(tableIdentifier);
    if (!table) {
      console.warn("observeTable: tabla no encontrada", tableIdentifier);
      return;
    }

    const observable = liveQuery(async () => {
      return await table.toArray();
    });

    const sub = observable.subscribe({
      next: (rows) => onChange(rows as T[]),
      error: (err) => console.error(`observeTable[${tableIdentifier}] error`, err),
    });

    return () => { try { sub.unsubscribe(); } catch { } };
  }

  // =========================
  // Settings reactivo por nombre
  // =========================


  /**
   * watchValue(name) -> Accessor<any>
   * - devuelve un Accessor reactivo con el valor de settings[name]
   * - usa liveQuery por clave y cache interna
   */
  watchValue(name: string, default_on_undefined?: any): Accessor<any> {
    if (!name) {
      const [g] = createSignal(undefined);
      return g;
    }

    const existing = this.valueMap.get(name);
    if (existing) return existing.get;

    const [get, set] = createSignal<any>(default_on_undefined);

    const entry: SettingEntry = {
      get,
      set,
    };

    this.valueMap.set(name, entry);

    return get;
  }

  /**
   * setValue(name, value) -> Promise<void>
   * - guarda en IndexedDB y actualiza cache local (set signal) inmediatamente.
   * - wait es debounce (ms)
   * - duration (ms): 0 => indefinido; >0 => expiracion en Date.now() + duration
   */
  setValue(name: string, value: any, wait: number = 0, duration: number = 0): void {
    if (!name) return;

    // Verificar si hay un debounce activo para este nombre
    if (this.valueDebounceMap.has(name)) {
      clearTimeout(this.valueDebounceMap.get(name));
      this.valueDebounceMap.delete(name);
    }

    // Si wait es 0, establecer inmediatamente
    if (wait <= 0) {
      this.applyValueChange(name, value, duration);
      return;
    }

    // Aplicar debounce
    const timeoutId = setTimeout(() => {
      this.applyValueChange(name, value, duration);
      this.valueDebounceMap.delete(name);
    }, wait);

    this.valueDebounceMap.set(name, timeoutId);
  }

  private applyValueChange(name: string, value: any, duration: number = 0): void {
    // Actualizar o crear la entrada
    const entry = this.valueMap.get(name);
    if (entry) {
      entry.set(value);
    } else {
      const [get, set] = createSignal<any>(value);
      this.valueMap.set(name, { get, set, unsub: undefined });
    }

    // Manejar expiración si duration > 0
    if (duration > 0) {
      const expiryTime = Date.now() + duration;
      this.valueExpiryMap.set(name, expiryTime);

      // Limpiar timeout de expiración anterior si existe
      if (this.valueDurationMap.has(name)) {
        clearTimeout(this.valueDurationMap.get(name));
      }

      // Programar eliminación automática
      const durationTimeoutId = setTimeout(() => {
        this.deleteValue(name);
      }, duration);

      this.valueDurationMap.set(name, durationTimeoutId);
    } else {
      // Si no hay duration, limpiar posibles expiraciones anteriores
      this.valueExpiryMap.delete(name);
      if (this.valueDurationMap.has(name)) {
        clearTimeout(this.valueDurationMap.get(name));
        this.valueDurationMap.delete(name);
      }
    }
  }

  /**
 * deleteValue(name) -> void
 * - Elimina el valor de la memoria
 * - Limpia debounces y expiraciones
 */
  deleteValue(name: string): void {
    if (!name) return;

    // Limpiar debounce si existe
    if (this.valueDebounceMap.has(name)) {
      clearTimeout(this.valueDebounceMap.get(name));
      this.valueDebounceMap.delete(name);
    }

    // Limpiar timeout de expiración si existe
    if (this.valueDurationMap.has(name)) {
      clearTimeout(this.valueDurationMap.get(name));
      this.valueDurationMap.delete(name);
    }

    // Limpiar registro de expiración
    this.valueExpiryMap.delete(name);

    // Actualizar signal a undefined
    const entry = this.valueMap.get(name);
    if (entry) {
      entry.set(undefined);
      this.valueMap.delete(name);
    }
  }

  // =========================
  // Session reactivo por nombre
  // =========================

  /**
   * watchSession(name) -> Accessor<any>
   * - devuelve un Accessor reactivo con el valor de session[name]
   * - usa liveQuery por clave y cache interna
   * - si la fila expiró, se elimina y devuelve undefined
   */
  watchSession(name: string, default_on_undefined?: any): Accessor<any> {
    if (!name) {
      const [g] = createSignal(undefined);
      return g;
    }

    const existing = this.sessionMap.get(name);
    if (existing) return existing.get;

    const [get, set] = createSignal<any>(default_on_undefined);

    const table = (this.db as any).table("session");

    // liveQuery: devuelve valor sólo si no expiró; si expiró, borra y devuelve undefined
    const observable = liveQuery(async () => {
      try {
        const row = await table.get(name);
        if (!row) return undefined;

        const expiresAt: number | null | undefined = row.expiresAt ?? null;
        if (expiresAt && Date.now() >= expiresAt) {
          // ya expiró: eliminar la fila y devolver undefined
          try { await table.delete(name); } catch (e) { /* ignore */ }
          return undefined;
        }

        return row.value;
      } catch (e) {
        console.error("SchemaCache.watchSession liveQuery inner error", e);
        return undefined;
      }
    });

    const sub = observable.subscribe({
      next: (val: any) => set(val),
      error: (err) => console.error("SchemaCache.watchSession liveQuery error", err),
    });

    // establecer inicial si existe (sincrónico-ish)
    (async () => {
      try {
        const row = await table.get(name);
        if (!row) {
          set(undefined);
          return;
        }
        const expiresAt: number | null | undefined = row.expiresAt ?? null;
        if (expiresAt && Date.now() >= expiresAt) {
          try { await table.delete(name); } catch { }
          set(undefined);
        } else {
          set(row.value);
        }
      } catch (e) {
        // ignore
      }
    })();

    const entry: SettingEntry = {
      get,
      set,
      unsub: () => { try { sub.unsubscribe(); } catch { } },
    };

    this.sessionMap.set(name, entry);

    return get;
  }

  /**
   * setSession(name, value) -> Promise<void>
   * - guarda en IndexedDB y actualiza cache local (set signal) inmediatamente.
   * - wait es debounce (ms)
   * - duration (ms): 0 => indefinido; >0 => expiracion en Date.now() + duration
   */
  async setSession(name: string, value: any, wait: number = 200, duration: number = 0): Promise<void> {
    if (!name) return;

    // Limpiar timeout anterior si existe para este nombre
    if (this.sessionDebounceMap.has(name)) {
      clearTimeout(this.sessionDebounceMap.get(name));
      this.sessionDebounceMap.delete(name);
    }

    // Actualizar cache en memoria de inmediato (optimista)
    const entry = this.sessionMap.get(name);
    if (entry) {
      entry.set(value);
    } else {
      const [g, s] = createSignal<any>(value);
      this.sessionMap.set(name, { get: g, set: s, unsub: undefined });
    }

    // Calcular expiresAt
    const expiresAt = duration && duration > 0 ? Date.now() + duration : null;

    // Crear nuevo timeout para escribir en DB (debounce)
    const debounceTimeoutId = setTimeout(async () => {
      try {
        await (this.db as any).table("session").put({ name, value, expiresAt });
      } catch (e) {
        console.warn("SchemaCache.setSession: put failed", e);
        // nothing else; cache ya fue actualizada arriba
      } finally {
        if (this.sessionDurationMap.has(name)) {
          clearTimeout(this.sessionDurationMap.get(name));
          this.sessionDurationMap.delete(name);
        }
        if (duration > 0) {
          const durationTimeoutId = setTimeout(async () => {
            await this.deleteSession(name)
          }, duration)
          this.sessionDurationMap.set(name, durationTimeoutId);
        }
      }
    }, wait);

    this.sessionDebounceMap.set(name, debounceTimeoutId);
  }

  /**
   * deleteSession(name) -> Promise<void>
   * - elimina la fila y actualiza cache local
   */
  async deleteSession(name: string): Promise<void> {
    if (!name) return;
    try {
      await (this.db as any).table("session").delete(name);
    } catch (e) {
      console.warn("SchemaCache.deleteSession failed", e);
    }
    const entry = this.sessionMap.get(name);
    if (entry) {
      entry.set(undefined);
      try { entry.unsub?.(); } catch { }
      this.sessionMap.delete(name);
    }
  }

  /**
   * clearAllSession() -> Promise<void>
   * - limpia todas las entradas de session (útil para logout)
   */
  async clearAllSession(): Promise<void> {
    try {
      await (this.db as any).table("session").clear();
    } catch (e) {
      console.warn("SchemaCache.clearAllSession failed", e);
    }

    // Limpiar todas las entradas del cache de session
    for (const [name, entry] of this.sessionMap.entries()) {
      entry.set(undefined);
      try { entry.unsub?.(); } catch { }
      this.sessionMap.delete(name);
    }
  }

  /**
   * getAllSession() -> Promise<Record<string, any>>
   * - obtiene todas las entradas de session como un objeto
   * - elimina filas expiradas antes de devolver el resultado
   */
  async getAllSession(): Promise<Record<string, any>> {
    try {
      const table = (this.db as any).table("session");
      const allEntries = await table.toArray();
      const result: Record<string, any> = {};
      for (const entry of allEntries) {
        const expiresAt: number | null | undefined = entry.expiresAt ?? null;
        if (expiresAt && Date.now() >= expiresAt) {
          // eliminar expirado
          try { await table.delete(entry.name); } catch { }
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

  /**
   * purgeExpiredSessions()
   * - busca en la tabla "session" todas las filas expiradas y las borra.
   * - llamada en init para limpiar basura (no obliga a que watchSession haya sido invocado).
   */
  private async purgeExpiredSessions(): Promise<void> {
    try {
      const table = (this.db as any).table("session");
      const all = await table.toArray();
      const now = Date.now();
      for (const row of all) {
        const expiresAt: number | null | undefined = row.expiresAt ?? null;
        if (expiresAt && now >= expiresAt) {
          try { await table.delete(row.name); } catch (e) { /* ignore */ }
          // si existe cache reactiva, actualizamos
          const entry = this.sessionMap.get(row.name);
          if (entry) {
            entry.set(undefined);
            try { entry.unsub?.(); } catch { }
            this.sessionMap.delete(row.name);
          }
        }
      }
    } catch (e) {
      console.warn("SchemaCache.purgeExpiredSessions failed", e);
    }
  }
}