// src/lib/records-manager.ts
import Dexie from "dexie";
import { liveQuery } from "dexie";
import { createSignal, type Accessor } from "solid-js";
import { FieldFormat, type FieldFilter, type FilterInput, type NormalizedFilters, type RawRecordFilter, type TableField, type TableRecord } from '../types/schema';
import { SchemaCache, SettingEntry } from "./schema-cache";
import { SettingItem, UserItem } from "../constants/table-defs";
import { IncludeRelProps, unwrapSignal } from "../hooks/useRecords";

export function parseRelationField(fieldIdentifier: string) {
  return fieldIdentifier.replace(/_id$/, '');
}

function isRawRecordFilter(x: any): x is RawRecordFilter {
  return x && typeof x === "object" && "op" in x;
}

function prepareFilters(filters: NormalizedFilters): NormalizedFilters {
  for (const k of Object.keys(filters)) if (filters[k].v === undefined && !["*", "!*"].includes(filters[k].op)) delete filters[k];
  if (filters['id'] && filters['id'].op === '=') {
    const idFilter = filters['id'];
    const syncFilter = filters['syncStatus'] ?? { op: '!=', v: 3 };
    filters = { id: idFilter, syncStatus: syncFilter };
  } else {
    if (!filters['syncStatus']) filters['syncStatus'] = { op: '!=', v: 3 };
  }
  return filters
}

function parseSingleValueByFieldFormat(field: TableField, value: any): any {
  if (value === undefined || value === null) return value;
  switch (field.fieldFormat) {
    case "int":
    case "float":
    case "list":
      return Number(value);
    case "bool":
      return (value === "true" || value == "1" || value === "on" || value === true) ? 1 : 0;
    case "date": return new Date(value).toISOString();
    default: return value;
  }
}

/* ---------- RecordsManager OPTIMIZADO ---------- */
export class RecordsManager {
  public db: Dexie;
  public schema: SchemaCache;

  private CACHE_TTL = 1000 * 60 * 5; // 5 minutos
  private GC_INTERVAL = 1000 * 60; // 60 segundos

  private tableSubs = new Map<string, { unsub: () => void }>();
  private cachedUser: any = null;

  // Cache de IDs
  private idCache = new Map<string, { ids: string[]; ts: number }>();
  private countCache = new Map<string, { count: number; ts: number }>();

  // Trackeo de subscriptions para memory management
  private activeSubscriptions = new Set<() => void>();
  private gcHandle?: any;

  // Timers
  private watchTimers = new Map<number, Accessor<number>>();

  private settingsMap = new Map<string, SettingEntry>();
  private settingsDebounceMap = new Map<string, NodeJS.Timeout>();

  // Logger mejorado
  private logger = {
    debug: (msg: string, ...args: any[]) => {
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[RecordsManager] ${msg}`, ...args);
      }
    },
    info: (msg: string, ...args: any[]) => {
      console.info(`[RecordsManager] ${msg}`, ...args);
    },
    warn: (msg: string, ...args: any[]) => {
      console.warn(`[RecordsManager] ${msg}`, ...args);
    },
    error: (msg: string, ...args: any[]) => {
      console.error(`[RecordsManager] ${msg}`, ...args);
    }
  };

  constructor(dbOrManager: Dexie | any) {
    this.db = typeof dbOrManager?.dbInstance === "function" ? dbOrManager.dbInstance() : (dbOrManager as Dexie);
    this.schema = new SchemaCache({ dbOrManager: this.db }); // Object.assign(this, new SchemaCache({ dbOrManager: this.db }))
    this.initUserCache().catch(e => this.logger.error("initUserCache error:", e));
    this.startGc();
  }

  normalizeFilters(input?: FilterInput, table?: string): NormalizedFilters {
    if (!input) return {};
    let out: NormalizedFilters = {};

    if (!Array.isArray(input) && typeof input === "object" && !isRawRecordFilter(input)) {
      for (const k of Object.keys(input)) {
        const val = (input as any)[k];
        if (val && typeof val === "object" && "op" in val) out[k] = { op: (val as any).op, v: this.parseValueByFieldFormat(k, (val as any).v, table), or: (val as any).or };
        else out[k] = { op: "=", v: this.parseValueByFieldFormat(k, val, table) };
      }
      for (const k of Object.keys(out)) if (out[k].v === undefined && !["*", "!*"].includes(out[k].op)) delete out[k];
    } else {

      const arr = Array.isArray(input) ? input : [input as any];
      for (const el of arr) {
        if (isRawRecordFilter(el)) {
          if (!el.field) continue;
          out[String(el.field)] = { op: el.op, v: this.parseValueByFieldFormat(el.field, el.v, table), or: el.or };
        } else if (typeof el === "object") {
          for (const k of Object.keys(el)) {
            const v = (el as any)[k];
            if (v && typeof v === "object" && "op" in v) out[k] = { op: (v as any).op, v: this.parseValueByFieldFormat(k, (v as any).v, table), or: (v as any).or };
            else out[k] = { op: "=", v: this.parseValueByFieldFormat(k, v, table) };
          }
        }
      }
    }

    return out;
  }
  
  /* Predicate en memoria OPTIMIZADO - Pre-normalización */
  private buildPredicate(filters: NormalizedFilters, table?: string) {
    const norm = (s: any) => (s == null ? "" : String(s).normalize?.("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() ?? String(s)).trim();
    return (row: any) => {
      const ors: Record<string | number, boolean> = {};
      for (const [field, f] of Object.entries(filters)) {
        const val = field.split('+').map(sf => row?.[sf]).join(' ');
        const rawVals = (Array.isArray(f.v) ? f.v : (f.v === undefined ? [] : [f.v])).map(v => this.parseValueByFieldFormat(field, v, table));
        const orKey = f.or ?? '';
        let evaluation: boolean = false;
        if (!(orKey in ors)) ors[orKey] = false;

        switch (f.op) {
          case "*": if (!val) { if (!orKey) return false; } else ors[orKey] = true; break;
          case "!*": if (val) { if (!orKey) return false; } else ors[orKey] = true; break;
          case "=":
            if (rawVals.length === 0) { if (val) { if (!orKey) return false; } else ors[orKey] = true; break; }
            if (rawVals.length === 1) {
              const w = rawVals[0];
              if (Array.isArray(val)) { if (!val.includes(w)) { if (!orKey) return false; } else ors[orKey] = true; } else if (val !== w) { if (!orKey) return false; } else ors[orKey] = true;
            } else {
              if (!rawVals.some(w => Array.isArray(val) ? val.includes(w) : val === w)) { if (!orKey) return false; } else ors[orKey] = true;
            }
            break;
          case "!=":
            if (rawVals.length === 0) { if (!val) { if (!orKey) return false; } else ors[orKey] = true; break; }
            if (rawVals.length === 1) {
              const w = rawVals[0];
              if (Array.isArray(val)) { if (val.includes(w)) { if (!orKey) return false; } else ors[orKey] = true; } else if (val === w) { if (!orKey) return false; } else ors[orKey] = true;
            } else {
              if (rawVals.some(w => Array.isArray(val) ? val.includes(w) : val === w)) { if (!orKey) return false; } else ors[orKey] = true;
            }
            break;
          case ">": if (!(val > rawVals[0])) { if (!orKey) return false; } else ors[orKey] = true; break;
          case "<": if (!(val < rawVals[0])) { if (!orKey) return false; } else ors[orKey] = true; break;
          case ">=": if (!(val >= rawVals[0])) { if (!orKey) return false; } else ors[orKey] = true; break;
          case "<=": if (!(val <= rawVals[0])) { if (!orKey) return false; } else ors[orKey] = true; break;
          case "<=>":
            if (!Array.isArray(rawVals) || rawVals.length < 2) { if (!orKey) return false; else break; }
            if (!(val >= rawVals[0] && val <= rawVals[1])) { if (!orKey) return false; } else ors[orKey] = true;
            break;
          case "~":
            if (!rawVals[0]) { if (!orKey) return false; else break; }
            if (!String(val ?? "").includes(String(rawVals[0]))) { if (!orKey) return false; } else ors[orKey] = true;
            break;
          case "~~":
            if (!rawVals[0]) { if (!orKey) return false; else break; }
            if (!String(val ?? "").toLowerCase().includes(String(rawVals[0]).toLowerCase())) { if (!orKey) return false; } else ors[orKey] = true;
            break;
          case "!~~~":
          case "~~~":
            if (!rawVals[0]) { if (!orKey) return false; else break; }
            evaluation = norm(rawVals[0]).split(' ').every(v => norm(val).includes(norm(v)))
            evaluation = f.op === "!~~~" ? !evaluation : evaluation
            if (!evaluation) { if (!orKey) return false; } else ors[orKey] = true;
            break;
          case "starts":
            if (!rawVals[0]) { if (!orKey) return false; else break; }
            if (!(val).startsWith(rawVals[0])) { if (!orKey) return false; } else ors[orKey] = true;
            break;
          case "ends":
            if (!rawVals[0]) { if (!orKey) return false; else break; }
            if (!(val).endsWith(rawVals[0])) { if (!orKey) return false; } else ors[orKey] = true;
            break;
          default: return false;
        }
      }
      delete ors[''];
      if (Object.keys(ors).length === 0) return true;
      return Object.values(ors).every(v => v);
    };
  }

  private extractDottedFieldRelations(tableId: string, dottedField: string): { baseTable: string; relationPath: string[]; targetField: string } | null {
    const segments = dottedField.split('.');
    if (segments.length < 2) return null;

    let currentTable = tableId;
    const relationPath: string[] = [];

    // Reconstruir el camino de relaciones
    for (let i = 0; i < segments.length - 1; i++) {
      const fieldName = segments[i];
      const fields = this.getTableFieldsFor(currentTable);
      const fieldMeta = fields.find(f => f.identifier === fieldName);

      if (!fieldMeta || !fieldMeta.relationTableIdentifier) {
        return null;
      }

      relationPath.push(fieldMeta.relationTableIdentifier);
      currentTable = fieldMeta.relationTableIdentifier;
    }

    return {
      baseTable: tableId,
      relationPath,
      targetField: segments[segments.length - 1]
    };
  }

  private getDottedFieldValue(record: any, dottedField: string): any {
    const segments = dottedField.split('.');
    let value = record;

    for (const segment of segments) {
      if (value === null || value === undefined) return undefined;
      value = value[segment];
    }

    return value;
  }

  // Memory management mejorado
  private trackSubscription(unsub: () => void) {
    this.activeSubscriptions.add(unsub);
    return unsub;
  }

  private untrackSubscription(unsub: () => void) {
    this.activeSubscriptions.delete(unsub);
  }

  /* Parseo por formato de campo */
  parseValueByFieldFormat(field: string | TableField, value: any, table?: string): any {
    if (typeof field === "string") {
      field = this.getField(field, table) as TableField;
      if (!field) return value;
    }
    if (value === undefined || value === null) return value;
    if (Array.isArray(value)) return value.map(v => parseSingleValueByFieldFormat(field, v));
    return parseSingleValueByFieldFormat(field, value);
  }

  destroy() {
    this.logger.debug("Destroying RecordsManager...");
    this.stopGc();

    // Limpiar todas las subscriptions activas
    this.activeSubscriptions.forEach(unsub => {
      try {
        unsub();
      } catch (e) {
        this.logger.warn("Error cleaning subscription:", e);
      }
    });
    this.activeSubscriptions.clear();

    // Limpiar caches
    this.idCache.clear();
    this.countCache.clear();
    this.totalCache.clear();

    // Limpiar table subscriptions
    this.tableSubs.forEach((sub, table) => {
      try {
        sub.unsub();
      } catch (e) {
        this.logger.warn(`Error cleaning table subscription for ${table}:`, e);
      }
    });
    this.tableSubs.clear();

    this.logger.debug("RecordsManager destroyed");
  }

  private startGc() {
    if (this.gcHandle) return;
    this.gcHandle = setInterval(() => this.runGc(), this.GC_INTERVAL);
    this.logger.debug("GC started");
  }

  private stopGc() {
    if (!this.gcHandle) return;
    clearInterval(this.gcHandle);
    this.gcHandle = undefined;
    this.logger.debug("GC stopped");
  }

  private runGc() {
    const now = Date.now();
    let expiredEntries = 0;

    // Limpiar ID cache expirado
    for (const [k, v] of Array.from(this.idCache.entries())) {
      if (now - v.ts > this.CACHE_TTL) {
        this.idCache.delete(k);
        expiredEntries++;
      }
    }

    // Limpiar count cache expirado
    for (const [k, v] of Array.from(this.countCache.entries())) {
      if (now - v.ts > this.CACHE_TTL) {
        this.countCache.delete(k);
        expiredEntries++;
      }
    }

    // Limpiar total cache expirado
    for (const [k, v] of Array.from(this.totalCache.entries())) {
      if (now - v.ts > this.CACHE_TTL) {
        this.totalCache.delete(k);
        expiredEntries++;
      }
    }

    if (expiredEntries > 0) {
      this.logger.debug(`GC cleaned ${expiredEntries} expired cache entries`);
    }
  }

  private touchIdCache(key: string) {
    const e = this.idCache.get(key);
    if (e) {
      e.ts = Date.now();
      this.logger.debug(`Touched ID cache: ${key}`);
    }
  }

  private touchCountCache(key: string) {
    const e = this.countCache.get(key);
    if (e) {
      e.ts = Date.now();
      this.logger.debug(`Touched count cache: ${key}`);
    }
  }

  private async initUserCache() {
    try {
      // Usar watchSession en lugar de consultar directamente la tabla
      const userSession = this.schema?.watchSession("user");

      // Si tenemos un schema cache con session support, usar eso
      if (userSession && this.schema) {
        // El valor se actualizará automáticamente cuando cambie
        this.cachedUser = userSession();
        this.logger.debug("User cache initialized from session");
      } else {
        // Fallback al método antiguo
        const sessionTbl = this.db.table("session");
        const row = await sessionTbl.get("user");
        if (row?.value) {
          this.cachedUser = row.value;
          this.logger.debug("User cache initialized (fallback)");
        }
      }
    } catch (e) {
      this.logger.error("initUserCache error:", e);
    }
  }

  async addFieldPosibleValueOption(field: Partial<TableField>, input: string): Promise<Partial<TableField>> {
    if (field.fieldFormat === 'list') {
      const currentId = field.storeData?.currentId || 0
      field.storeData ||= {}
      field.storeData.posibleValues ||= {}
      field.storeData.posibleValues[currentId + 1] = { label: input, position: currentId + 1 }
      field.storeData.currentId = currentId + 1
      // Persistir solo los cambios en storeData.posibleValues y currentId y marcar syncStatus=2
      try {
        if (field.id) {
          await this.updateFieldPossibleValues(String(field.id), field.storeData.posibleValues, field.storeData.currentId);
        } else {
          this.logger.warn('addFieldPosibleValueOption: field.id ausente, cambios solo en memoria');
        }
      } catch (e) {
        this.logger.error('Error persisting possible values for field:', e);
      }
    }
    return field;
  }

  /**
   * updateFieldPossibleValues
   * - actualiza únicamente storeData.posibleValues y storeData.currentId
   *   para el field identificado por fieldId dentro del meta (clave 'schema')
   * - marca el campo con syncStatus = 2 y actualiza updatedAt
   */
  async updateFieldPossibleValues(fieldId: string, posibleValues: Record<string, any>, currentId: number) {
    try {
      const metaTable = (this.db as any).table('meta');
      const meta = await metaTable.get('schema');
      if (!meta) throw new Error('Meta (schema) no encontrado en DB');

      const tableFields: any[] = Array.isArray(meta.tableFields) ? meta.tableFields : [];
      let changed = false;

      for (let i = 0; i < tableFields.length; i++) {
        const f = tableFields[i];
        if (!f) continue;
        if (String(f.id) === String(fieldId) || String(f.identifier) === String(fieldId)) {
          f.storeData = f.storeData || {};
          f.storeData.posibleValues = posibleValues;
          f.storeData.currentId = currentId;
          f.syncStatus = 2;
          f.updatedAt = new Date().toISOString();
          tableFields[i] = f;
          changed = true;
          break;
        }
      }

      if (!changed) {
        this.logger.warn(`updateFieldPossibleValues: field ${fieldId} no encontrado en meta.tableFields`);
        return;
      }

      const newMeta = { ...meta, tableFields };
      await metaTable.put(newMeta);
      this.logger.debug(`Persisted posibleValues for field ${fieldId} (currentId=${currentId}) and marked syncStatus=2`);
    } catch (e) {
      this.logger.error('updateFieldPossibleValues error:', e);
      throw e;
    }
  }

  async setUser(user: any): Promise<void> {
    try {
      await this.setSession("user", user);
      this.logger.debug("User session updated via SchemaCache");

      this.cachedUser = user;
    } catch (e) {
      this.logger.error("setUser error:", e);
      throw e;
    }
  }

  getUser(): UserItem | null { return this.cachedUser; }

  watchTimer(ms: number): Accessor<number> {
    if (!this.watchTimers.has(ms)) {
      const [timer, setTimer] = createSignal<number>(0)
      setInterval(() => setTimer(v => v + 1), ms)
      this.watchTimers.set(ms, timer)
    }
    return this.watchTimers.get(ms)!
  }

  async logout(): Promise<void> {
    try {
      await this.clearAllSession();
      this.cachedUser = null;
      this.logger.debug("User logged out, session cleared");
    } catch (e) {
      this.logger.error("logout error:", e);
      throw e;
    }
  }

  watchQuery(queryFn: () => Promise<any[]>, setData: (v: any[]) => void) {
    const obs = liveQuery(() => queryFn());

    const sub = obs.subscribe({
      next: (rows) => setData(rows),
      error: (e) => console.error("watchQuery error:", e),
    });

    const unsubscribe = () => sub.unsubscribe();
    return unsubscribe;
  }

  watchTable(tableIdentifier: string, setData: (v: any[]) => void) {
    if (!tableIdentifier || typeof setData !== 'function') {
      this.logger.warn("watchTable called with invalid parameters");
      return () => { };
    }

    const tbl = this.db.table(tableIdentifier);
    const obs = liveQuery(() => tbl.toArray());

    const sub = obs.subscribe({
      next: (rows: any[]) => {
        this.logger.debug(`watchTable ${tableIdentifier} received ${rows.length} rows`);
        setData(rows);
      },
      error: (e) => this.logger.error(`watchTable.observe error for ${tableIdentifier}:`, e),
    });

    const unsubscribe = () => {
      try {
        this.untrackSubscription(unsubscribe);
        sub.unsubscribe();
        this.logger.debug(`watchTable unsubscribed for ${tableIdentifier}`);
      } catch (e) {
        this.logger.warn(`Error unsubscribing watchTable for ${tableIdentifier}:`, e);
      }
    };

    this.trackSubscription(unsubscribe);
    this.logger.debug(`watchTable subscribed for ${tableIdentifier}`);
    return unsubscribe;
  }

  /* ---------- Helpers de Cache Mejorados ---------- */
  private idCacheKey(table: string, field: string, op: string, v: any) {
    return `${table}::${field}::${op}::${JSON.stringify(v === undefined ? null : v)}`;
  }

  public clearIdsCache(table?: string, field?: string) {
    let cleared = 0;

    if (!table && !field) {
      cleared = this.idCache.size;
      this.idCache.clear();
    } else {
      for (const k of Array.from(this.idCache.keys())) {
        const parts = k.split("::");
        const matchTable = table ? parts[0] === table : true;
        const matchField = field ? parts[1] === field : true;
        if (matchTable && matchField) {
          this.idCache.delete(k);
          cleared++;
        }
      }
    }

    this.logger.debug(`Cleared ${cleared} ID cache entries for table: ${table || 'all'}, field: ${field || 'all'}`);
  }

  private countCacheKey(table: string, filters?: NormalizedFilters) {
    const cf = this.canonicalizeFilters(filters);
    return `${table}::count::${cf}`;
  }

  public clearCountsCache(table?: string) {
    let cleared = 0;

    if (!table) {
      cleared = this.countCache.size;
      this.countCache.clear();
    } else {
      for (const k of Array.from(this.countCache.keys())) {
        if (k.startsWith(`${table}::count::`)) {
          this.countCache.delete(k);
          cleared++;
        }
      }
    }

    this.logger.debug(`Cleared ${cleared} count cache entries for table: ${table || 'all'}`);
  }

  private canonicalizeFilters(filters?: NormalizedFilters): string {
    if (!filters || Object.keys(filters).length === 0) return "[]";
    const copy = Object.keys(filters).map(k => ({
      field: k,
      op: filters[k].op,
      v: filters[k].v
    })).sort((a, b) => (a.field + a.op).localeCompare(b.field + b.op));
    return JSON.stringify(copy);
  }

  /* Cache Invalidation Mejorada */
  private ensureTableInvalidationWatch(table: string) {
    if (this.tableSubs.has(table)) return;

    const tbl = this.db.table(table);
    const obs = liveQuery(async () => await tbl.count());

    const sub = obs.subscribe({
      next: () => {
        this.logger.debug(`Table ${table} changed, invalidating caches`);
        this.clearIdsCache(table);
        this.clearCountsCache(table);
      },
      error: (e) => this.logger.error(`Table watch error for ${table}:`, e)
    });

    const unsub = () => {
      try {
        sub.unsubscribe();
        this.tableSubs.delete(table);
        this.logger.debug(`Table invalidation watch removed for ${table}`);
      } catch (e) {
        this.logger.warn(`Error unsubscribing table watch for ${table}:`, e);
      }
    };

    this.tableSubs.set(table, { unsub });
    this.logger.debug(`Table invalidation watch established for ${table}`);
  }

  /* ---------- Dotted Filters PARALELIZADOS ---------- */
  private async resolveSingleDottedFilter(rootTable: string, filterField: string, filter: FieldFilter): Promise<string[]> {
    if (!this.schema) throw new Error("SchemaCache requerido para dotted filters");

    const segments = String(filterField).split(".");
    if (segments.length < 2) return [];

    let curTable = rootTable;
    type Step = { parentTable: string; fkField: string; childTable: string };
    const chain: Step[] = [];

    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i];
      const fields = this.getTableFieldsFor(curTable);
      const cf = fields.find(f => f.identifier === seg);
      if (!cf || !cf.relationTableIdentifier) {
        throw new Error(`Cannot resolve relation segment '${seg}' on table '${curTable}'`);
      }
      const childTable = cf.relationTableIdentifier;
      chain.push({ parentTable: curTable, fkField: seg, childTable });
      curTable = childTable;
    }

    const leafTable = curTable;
    const leafField = segments[segments.length - 1];

    const leafFilterRaw: RawRecordFilter = { field: leafField, op: filter.op, v: filter.v };

    this.logger.debug(`Resolving dotted filter: ${filterField} -> ${leafTable}.${leafField}`);
    const leafRows = await this.query(leafTable, leafFilterRaw);
    let ids = new Set<string>(leafRows.map(r => String(r.id)));

    for (let i = chain.length - 1; i >= 0; i--) {
      const step = chain[i];
      if (ids.size === 0) return [];
      const parentMatches = await this.query(step.parentTable, { [step.fkField]: Array.from(ids) });
      ids = new Set(parentMatches.map(r => String(r.id)));
    }

    this.logger.debug(`Dotted filter ${filterField} resolved to ${ids.size} IDs`);
    return Array.from(ids);
  }

  private async preprocessDottedFilters(table: string, filters: NormalizedFilters): Promise<NormalizedFilters> {
    const dottedKeys = Object.keys(filters).filter(k => k.includes("."));
    if (dottedKeys.length === 0) return filters;

    this.logger.debug(`Processing ${dottedKeys.length} dotted filters in parallel for table ${table}`);

    // PARALELIZACIÓN: Procesar todos los dotted filters simultáneamente
    // TODO: Que se implemente el or para los dotted files.
    const dottedPromises = dottedKeys.map(async (key) => {
      try {
        const ids = await this.resolveSingleDottedFilter(table, key, filters[key]);
        return { key, ids, success: true };
      } catch (error) {
        this.logger.error(`Failed to resolve dotted filter ${key}:`, error);
        return { key, ids: [] as string[], success: false, error };
      }
    });

    const dottedResults = await Promise.all(dottedPromises);

    // Verificar si alguno falló
    const failedFilters = dottedResults.filter(r => !r.success);
    if (failedFilters.length > 0) {
      const errorDetails = failedFilters.map(f => `${f.key}: ${f.error}`).join('; ');
      throw new Error(`Dotted filters failed: ${errorDetails}`);
    }

    // Aplicar intersección de resultados
    let idsIntersection: string[] | null = null;
    for (const result of dottedResults) {
      if (idsIntersection === null) {
        idsIntersection = result.ids;
      } else {
        idsIntersection = idsIntersection.filter(id => result.ids.includes(id));
      }
    }

    let or;
    const remaining: NormalizedFilters = {};
    for (const k of Object.keys(filters)) {
      if (!k.includes(".")) remaining[k] = filters[k];
      else or = filters[k]?.or
    }

    if (idsIntersection && idsIntersection.length > 0) {
      remaining["id"] = { op: "=", v: idsIntersection, or };
    } else {
      remaining["id"] = { op: "=", v: [], or }; // No matches
    }

    this.logger.debug(`Dotted filters processed. Remaining filters: ${Object.keys(remaining).length}, Matched IDs: ${idsIntersection?.length || 0}`);
    return remaining;
  }

  /* ---------- fetchIdsForSingleFilter con MEJOR MANEJO DE ERRORES ---------- */
  private async fetchIdsForSingleFilter(table: string, field: string, filter: { op: FieldFilter["op"]; v?: any }): Promise<string[]> {
    const key = this.idCacheKey(table, field, filter.op as string, filter.v);
    const cached = this.idCache.get(key);

    if (cached) {
      this.touchIdCache(key);
      this.logger.debug(`ID cache hit for ${key}: ${cached.ids.length} IDs`);
      return cached.ids;
    }

    this.logger.debug(`ID cache miss for ${key}, querying database...`);
    const t = (this.db as any).table(table);
    if (!this.schema) throw new Error("SchemaCache requerido para usar índices");

    const fldMeta = this.getTableFieldsFor(table).find(f => f.identifier === field);
    if (!fldMeta) throw new Error(`Índice/metadata no encontrada para ${table}.${field}`);

    let ids: string[] = [];

    filter.op = !filter.v ? filter.op === '=' ? '!*' : filter.op === '!=' ? '*' : filter.op : filter.op
    try {
      if (filter.op === "=") {
        const val = filter.v;
        if (Array.isArray(val)) {
          const parsed = this.parseValueByFieldFormat(fldMeta, val, table);
          ids = await t.where(field).anyOf(parsed).primaryKeys();
        } else {
          const parsed = this.parseValueByFieldFormat(fldMeta, val, table);
          ids = await t.where(field).equals(parsed).primaryKeys();
        }
      } else if (filter.op === "!=") {
        const bad = Array.isArray(filter.v) ? filter.v : [filter.v];
        const parsed = this.parseValueByFieldFormat(fldMeta, bad, table);
        ids = await t.where(field).noneOf(parsed).primaryKeys();
      } else if (filter.op === "*") {
        ids = await t.where(field).notEqual([null, undefined, '']).primaryKeys();
      } else if (filter.op === "!*") {
        const allKeys = await t.toCollection().primaryKeys();
        const present = await t.where(field).notEqual([null, undefined, '']).primaryKeys();
        const presentSet = new Set((present as any[]).map(String));
        ids = (allKeys as any[]).map(String).filter(k => !presentSet.has(k));
      } else if (filter.op === ">" || filter.op === ">=" || filter.op === "<" || filter.op === "<=") {
        const parsed = this.parseValueByFieldFormat(fldMeta, filter.v, table);
        if (filter.op === ">") ids = (await t.where(field).above(parsed).primaryKeys()).map(String);
        else if (filter.op === ">=") ids = (await t.where(field).aboveOrEqual(parsed).primaryKeys()).map(String);
        else if (filter.op === "<") ids = (await t.where(field).below(parsed).primaryKeys()).map(String);
        else ids = (await t.where(field).belowOrEqual(parsed).primaryKeys()).map(String);
      } else if (filter.op === "<=>") {
        const arr = Array.isArray(filter.v) ? filter.v : [];
        if (arr.length < 2) throw new Error("Between (<=>) requiere un arreglo de dos valores");
        const low = this.parseValueByFieldFormat(fldMeta, arr[0], table);
        const high = this.parseValueByFieldFormat(fldMeta, arr[1], table);
        ids = await t.where(field).between(low, high, true, true).primaryKeys();
      } else {
        throw new Error(`Operador no soportado en fetchIdsForSingleFilter: ${filter.op}`);
      }

      ids = Array.from(new Set((ids || [])));
      this.idCache.set(key, { ids, ts: Date.now() });
      this.logger.debug(`Fetched ${ids.length} IDs for ${key}`);

    } catch (error) {
      this.logger.error(`Error in fetchIdsForSingleFilter for ${key}:`, error);
      throw error; // Re-lanzar para manejo superior
    }

    return ids;
  }

  /**
   * getIdsByFilters con MEJOR MANEJO DE ERRORES
   */
  public async getIdsByFilters(table: string, filters: NormalizedFilters): Promise<{ remainingFilters: NormalizedFilters; ids: string[] | null }> {
    if (!filters || Object.keys(filters).length === 0) {
      this.logger.debug(`No filters provided for table ${table}`);
      return { remainingFilters: {}, ids: null };
    }

    this.logger.debug(`Processing ${Object.keys(filters).length} filters for table ${table}`);
    const supportedOps = new Set(["=", "!=", "*", "!*", ">", ">=", "<", "<=", "<=>"]);
    const remaining: NormalizedFilters = {};
    const toProcess: NormalizedFilters = {};

    for (const k of Object.keys(filters)) {
      if (supportedOps.has(filters[k].op)) toProcess[k] = filters[k];
      else remaining[k] = filters[k];
    }

    if (Object.keys(toProcess).length === 0) {
      this.logger.debug(`No index-supported filters for table ${table}`);
      return { remainingFilters: remaining, ids: null };
    }

    const groups = new Map<string | number, Array<{ field: string; filter: FieldFilter }>>();
    let i = 0
    for (const [field, f] of Object.entries(toProcess)) {
      const orKey = f.or ?? `_${i++}_`;
      const arr = groups.get(orKey) ?? [];
      arr.push({ field, filter: f });
      groups.set(orKey, arr);
    }

    this.logger.debug(`Processing ${groups.size} filter groups for table ${table}`);

    // MANEJO DE ERRORES MEJORADO: Si un filtro falla, toda la operación falla
    const groupPromises: Array<Promise<[string | number | '', Set<string>]>> = [];

    for (const [orKey, fls] of groups.entries()) {
      const p = (async (): Promise<[string | number | '', Set<string>]> => {
        try {
          const sets = await Promise.all(
            fls.map(f => this.fetchIdsForSingleFilter(table, f.field, { op: f.filter.op, v: f.filter.v }))
          );

          const union = new Set<string>();
          for (const arr of sets) {
            for (const id of arr) union.add(String(id));
          }

          this.logger.debug(`Filter group ${orKey} resolved to ${union.size} IDs`);
          return [orKey, union];

        } catch (error) {
          this.logger.error(`Filter group ${orKey} failed:`, error);
          // ALERTA AL USUARIO y re-lanzar error
          //alert(`Error en filtro: No se pudo procesar el filtro para ${fls.map(f => f.field).join(', ')}. Detalles: ${error}`);
          delete localStorage['nimbleai_initialized_' + this.db.name]
          // window.location.reload();

          throw new Error(`Filter group ${orKey} failed: ${error}`);
        }
      })();
      groupPromises.push(p);
    }

    try {
      const groupResults = await Promise.all(groupPromises);

      let finalSet: Set<string> | null = null;
      for (const [, s] of groupResults) {
        if (finalSet === null) finalSet = new Set(s);
        else finalSet = new Set(Array.from(finalSet).filter((id: any) => s.has(id)));
      }

      const resultIds = finalSet ? Array.from(finalSet) : [];
      this.logger.debug(`Filter processing completed. Final IDs: ${resultIds.length}, Remaining filters: ${Object.keys(remaining).length}`);

      return { remainingFilters: remaining, ids: resultIds };

    } catch (error) {
      this.logger.error(`getIdsByFilters failed for table ${table}:`, error);
      throw error; // Propagar el error
    }
  }

  /* ---------- Métodos CRUD (sin cambios mayores) ---------- */
  private applyOrderAndPagination(rows: any[], order?: Array<[string, 'ASC' | 'DESC']>, page: number = 1, limit?: number) {
    if (order && order.length > 0) {
      rows.sort((a: any, b: any) => {
        for (const [field, dir] of order) {
          const va = a?.[field];
          const vb = b?.[field];
          if (va === vb) continue;
          const na = typeof va === 'number';
          const nb = typeof vb === 'number';
          if (na && nb) return dir === 'ASC' ? (va - vb) : (vb - va);
          const sa = va === undefined || va === null ? '' : String(va);
          const sb = vb === undefined || vb === null ? '' : String(vb);
          const cmp = sa.localeCompare(sb);
          if (cmp !== 0) return dir === 'ASC' ? cmp : -cmp;
        }
        return 0;
      });
    }
    if (limit && limit > 0) {
      const p = page && page > 0 ? page : 1;
      const start = (p - 1) * limit;
      return rows.slice(start, start + limit);
    }
    return rows;
  }

  async insert(table: string, records: any): Promise<string[]> {
    this.ensureTableInvalidationWatch(table);
    const t = this.db.table(table);

    const arr = Array.isArray(records) ? records.slice() : [records];
    const now = new Date().toISOString();
    const user = this.getUser();

    for (const r of arr) {
      if (!r.id) r.id = (typeof crypto !== "undefined" && (crypto as any).randomUUID) ? (crypto as any).randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      r.createdAt = r.createdAt ?? now;
      r.updatedAt = now;
      r.authorId = r.authorId ?? user?.id ?? null;
      r.syncStatus = r.syncStatus ?? 1;
    }

    // Parse elements necesarios: Booleanos para que se guarden como 0 o 1 para que funcionen los filtros en IndexDB
    const fields = this.getTableFieldsFor(table) // Parsear booleanos.
    fields.filter(f => f.fieldFormat == FieldFormat.BOOL).forEach(field => {
      for (const r of arr) {
        r[field.identifier] = this.parseValueByFieldFormat(field, r[field.identifier], table)
      }
    })

    await t.bulkPut(arr);

    // Trackear cambios y notificar
    this.trackFieldChanges(table, arr, 'insert');
    this.clearIdsCache(table);
    this.clearCountsCache(table);
    await this.notifySubscriptions(table);

    this.logger.debug(`Inserted ${arr.length} records into ${table}`);
    return arr.map((r: any) => String(r.id));
  }

  async update(table: string, records: any, key: string = 'id'): Promise<void> {
    this.ensureTableInvalidationWatch(table);
    const t = this.db.table(table);

    const arr = Array.isArray(records) ? records.slice() : [records];
    if (!arr.length) return;

    // Parseo de booleanos
    const fields = this.getTableFieldsFor(table);
    fields
      .filter(f => f.fieldFormat === FieldFormat.BOOL)
      .forEach(field => {
        for (const r of arr) {
          if (r && r.hasOwnProperty(field.identifier)) {
            r[field.identifier] = this.parseValueByFieldFormat(
              field,
              r[field.identifier],
              table
            );
          }
        }
      });

    const patches = new Map<string, any>(); // id -> patch
    const ids: string[] = [];

    if (key === 'id') {
      // 🔹 Camino rápido (PK)
      for (const item of arr) {
        if (!item || typeof item !== 'object' || item.id == null) {
          throw new Error(`update: cada elemento debe contener 'id'`);
        }

        const id = String(item.id);
        const { id: _id, ...patch } = item;

        patches.set(id, patch);
        ids.push(id);
      }
    } else {
      // 🔸 Key alternativa (índice único)
      const keys = arr.map(r => r?.[key]).filter(v => v != null);

      if (!keys.length) {
        throw new Error(`update: no se encontró la clave '${key}' en los records`);
      }

      // Resolver IDs reales
      const existing = await t.where(key).anyOf(keys).toArray();

      if (!existing.length) return;

      const byKey = new Map<any, any>();
      for (const r of existing) byKey.set(r[key], r);

      for (const item of arr) {
        const k = item[key];
        const found = byKey.get(k);
        if (!found) continue;

        const { [key]: _k, id, ...patch } = item;
        patches.set(String(id), patch);
        ids.push(String(id));
      }
    }

    if (!ids.length) return;

    await t.where('id').anyOf(ids).modify((obj: any) => {
      const p = patches.get(String(obj.id));
      if (p) Object.assign(obj, p);
    });

    // Tracking y notificaciones
    this.trackFieldChanges(table, arr, 'update');
    this.clearIdsCache(table);
    this.clearCountsCache(table);
    await this.notifySubscriptions(table);

    this.logger.debug(`Updated ${ids.length} records in ${table}`);
  }


  async delete(table: string, ids: string | number | Array<string | number>, force = false) {
    this.ensureTableInvalidationWatch(table);
    const t = this.db.table(table);

    const idArr = Array.isArray(ids) ? ids.map(String) : [String(ids)];
    if (idArr.length === 0) return;

    const now = new Date().toISOString();

    const rows = await t.where("id").anyOf(idArr).toArray();

    // dividir los registros según syncStatus
    const forceIds = rows.filter(r => [1, 2].includes(Number(r.syncStatus))).map(r => r.id);
    const softIds = rows.filter(r => ![1, 2].includes(Number(r.syncStatus))).map(r => r.id);

    // eliminación forzada explícita o por syncStatus
    if (force) {
      await t.where("id").anyOf(idArr).delete();
      this.logger.debug(`Force deleted ${idArr.length} records from ${table}`);
    } else {
      if (forceIds.length > 0) {
        await t.where("id").anyOf(forceIds).delete();
        this.logger.debug(`Force deleted ${forceIds.length} records (syncStatus 1–2) from ${table}`);
      }
      await t.where("id").anyOf(softIds).modify({ syncStatus: 3, updatedAt: now });
      this.logger.debug(`Soft deleted ${softIds.length} records from ${table}`);
    }
    // Trackear cambios y notificar
    this.trackFieldChanges(table, rows, 'delete');
    this.clearIdsCache(table);
    this.clearCountsCache(table);
    await this.notifySubscriptions(table);
  }


  async query(table: string, rawFilters?: FilterInput, options?: { order?: Array<[string, 'ASC' | 'DESC']>; page?: number; limit?: number }): Promise<TableRecord[]> {
    if (table === 'table_defs')
      return Object.values(this.getTables())
    if (table.startsWith('table_fields')) {
      return this.getTableFieldsFor(table.replace('table_fields.', ''))
    }

    const t = this.db.table(table);
    this.ensureTableInvalidationWatch(table);

    let filters = prepareFilters(this.normalizeFilters(rawFilters, table));

    this.logger.debug(`Querying table ${table} with ${Object.keys(filters).length} filters`);

    if (Object.keys(filters).some(k => k.includes(".") && !k.includes('+'))) {
      filters = await this.preprocessDottedFilters(table, filters);
    }

    const { remainingFilters, ids } = await this.getIdsByFilters(table, filters);

    let collection: any;
    if (ids !== null) {
      if (ids.length === 0) {
        this.logger.debug(`Query for ${table} returned 0 records (empty ID set)`);
        return [];
      }
      collection = t.where("id").anyOf(ids);
    } else {
      collection = t.toCollection();
    }

    // const dottedRemaining = Object.keys(remainingFilters).filter(k => k.includes('.'))
    // if (dottedRemaining.length > 0) {
    //   // Obtener elementos.
    //   dottedRemaining.forEach(dottedK => {
    //     collection.map() // TODO: Implementa aqui claves dotted donde el valor sera el de la relacion a la que apuntan.
    //   })
    // }

    let rows: any[] = [];
    if (Object.keys(remainingFilters).length > 0) {
      const pred = this.buildPredicate(remainingFilters, table);
      rows = await collection.filter(pred as any).toArray();
    } else {
      rows = await collection.toArray();
    }

    const final = this.applyOrderAndPagination(rows, options?.order, options?.page, options?.limit);
    this.logger.debug(`Query for ${table} returned ${final.length} records`);
    return final;
  }

  async count(table: string, rawFilters?: FilterInput): Promise<number> {
    this.ensureTableInvalidationWatch(table);

    const filters = prepareFilters(this.normalizeFilters(rawFilters, table));

    const key = this.countCacheKey(table, filters);
    const cached = this.countCache.get(key);
    if (cached) {
      this.touchCountCache(key);
      this.logger.debug(`Count cache hit for ${table}: ${cached.count}`);
      return cached.count;
    }

    this.logger.debug(`Counting records in ${table} with ${Object.keys(filters).length} filters`);
    const { remainingFilters, ids } = await this.getIdsByFilters(table, filters);
    const t = this.db.table(table);

    let cnt = 0;
    if (ids !== null) {
      if (ids.length === 0) cnt = 0;
      else if (Object.keys(remainingFilters).length === 0) cnt = ids.length;
      else {
        const pred = this.buildPredicate(remainingFilters, table);
        const rows = await t.where("id").anyOf(ids).filter(pred as any).toArray();
        cnt = rows.length;
      }
    } else {
      if (Object.keys(remainingFilters).length === 0) {
        cnt = await t.count();
      } else {
        const pred = this.buildPredicate(remainingFilters, table);
        const all = await t.toCollection().toArray();
        cnt = all.filter(pred).length;
      }
    }

    this.countCache.set(key, { count: cnt, ts: Date.now() });
    this.logger.debug(`Count for ${table}: ${cnt} records`);
    return cnt;
  }

  // Sistema de suscripciones inteligentes por tableId + filters
  private querySubscriptions = new Map<
    string,
    {
      filters: NormalizedFilters;
      options: any;
      callback: (data: any[]) => void;
      unsubscribe: () => void;
      currentIds: Set<string>;
    }[]
  >();

  // Track de campos modificados en operaciones recientes
  private recentFieldChanges = new Map<string, Set<string>>();

  /**
   * subscribeToQuery - Suscripción inteligente a cambios de datos
   */
  subscribeToQuery(
    tableId: string,
    rawFilters: FilterInput,
    options: any,
    callback: (data: any[]) => void,
    includes?: IncludeRelProps,
  ): () => void {
    const table = (this.db as any).table(tableId);
    const filters = prepareFilters(this.normalizeFilters(rawFilters, tableId))
    const subscriptionKey = `${tableId}:${this.canonicalizeFilters(filters)}:${JSON.stringify(options)}`;

    // Función wrapper que actualiza currentIds cuando se reciben nuevos datos
    const callbackWithIds = (data: TableRecord[]) => {
      // Actualizar el Set de IDs actuales
      subscription.currentIds = new Set(data.map(item => String(item.id)));
      callbackWithIncludes(data, includes)
      callback(data);
    };

    const callbackWithIncludes = (data: TableRecord[], includes?: IncludeRelProps, relChains: string[] = []) => {
      for (const [key, relProps] of Object.entries(includes || {})) {
        const field = this.getField(relProps.foreignKey || key, relProps.tableSource || tableId)
        if (field) {
          const subFilter = { ...unwrapSignal(relProps.filters), id: data.map(d => d[key]) }
          const relField = parseRelationField(key)
          this.query(field.relationTableIdentifier!, subFilter, unwrapSignal(relProps.options)).then((subdata) => {
            const subdataById = new Map(subdata.map(u => [u.id, u]))
            for (const item of data) {
              let consulted = item
              for (const k of relChains) {
                if (typeof consulted === "object")
                  consulted = consulted?.[k]
                else
                  break
              }
              consulted[relField] = subdataById.get(item[key])
            }
            relChains.push(relField)
            callbackWithIncludes(data, relProps.includes, relChains)
            callback(data);
          })
        }
      }
    }

    // Ejecutar query inicial
    this.query(tableId, filters, options).then(callbackWithIds);
    // Ejecutar subQueries inicial

    // Crear observable para cambios en la tabla
    const observable = liveQuery(async () => {
      return await table.count();
    });

    const sub = observable.subscribe({
      next: async () => {
        // Cuando hay cambios en la tabla, verificar si afectan nuestra query
        const shouldRefresh = await this.shouldRefreshQuery(
          tableId,
          filters,
          options,
          subscription.currentIds // 👈 Pasar currentIds
        );
        if (shouldRefresh) {
          const data = await this.query(tableId, filters, options);
          callbackWithIds(data); // 👈 Esto actualizará currentIds automáticamente
          // Ejecutar subQueries
        }
      },
      error: (e) => this.logger.error(`subscribeToQuery error for ${tableId}:`, e)
    });

    const subscription = {
      filters,
      options,
      callback: callbackWithIds, // 👈 Usar el wrapper
      unsubscribe: () => {
        try {
          sub.unsubscribe();
          this.logger.debug(`Unsubscribed from query: ${subscriptionKey}`);
        } catch (e) {
          this.logger.warn(`Error unsubscribing from query: ${subscriptionKey}`, e);
        }
      },
      currentIds: new Set<string>() // 👈 Inicialmente vacío
    };

    // Guardar suscripción
    const tableSubs = this.querySubscriptions.get(tableId) || [];
    tableSubs.push(subscription);
    this.querySubscriptions.set(tableId, tableSubs);

    this.logger.debug(`New query subscription: ${subscriptionKey}`);

    // Retornar función para desuscribirse
    return () => {
      subscription.unsubscribe();
      const tableSubs = this.querySubscriptions.get(tableId) || [];
      const filtered = tableSubs.filter(sub => sub !== subscription);
      if (filtered.length === 0) {
        this.querySubscriptions.delete(tableId);
      } else {
        this.querySubscriptions.set(tableId, filtered);
      }
    };
  }

  /**
   * shouldRefreshQuery - Determina si los cambios recientes afectan esta query
   */
  private async shouldRefreshQuery(
    tableId: string,
    filters: NormalizedFilters,
    options: any,
    currentIds: Set<string> // 👈 Recibimos currentIds directamente
  ): Promise<boolean> {
    const changedFields = this.recentFieldChanges.get(tableId);

    // Si no hay cambios recientes, no refrescar
    if (!changedFields || changedFields.size === 0) {
      return false;
    }

    // Si hay cambios generales ('*'), siempre refrescar
    if (changedFields.has('*')) {
      this.logger.debug(`Refreshing query for ${tableId} due to general changes (*)`);
      return true;
    }

    // Verificar campos directos en filtros
    const filterFields = new Set(Object.keys(filters));
    const orderFields = new Set((options?.order || []).map(([field]: [string, any]) => field));

    // Verificar si algún campo cambiado está en los filtros u ordenamiento
    for (const changedField of changedFields) {
      if (filterFields.has(changedField) || orderFields.has(changedField)) {
        this.logger.debug(`Refreshing query for ${tableId} due to changed field in filters: ${changedField}`);
        return true;
      }
    }

    // 👈 VERIFICACIÓN RÁPIDA: Si hay IDs cambiados que están en currentIds
    const changedIds = this.extractChangedIds(changedFields);
    if (changedIds.size > 0 && this.hasIntersection(changedIds, currentIds)) {
      this.logger.debug(`Refreshing query for ${tableId} due to ${changedIds.size} changed IDs in current results`);
      return true;
    }

    // Verificar campos dotted en filtros
    const dottedFilters = Object.keys(filters).filter(k => k.includes('.'));
    if (dottedFilters.length > 0) {
      for (const dottedField of dottedFilters) {
        if (await this.isDottedFieldAffected(tableId, dottedField, changedFields)) {
          this.logger.debug(`Refreshing query for ${tableId} due to dotted field: ${dottedField}`);
          return true;
        }
      }
    }

    this.logger.debug(`No need to refresh query for ${tableId} - changed fields don't affect current filters`);
    return false;
  }

  subscribeToCount(
    tableId: string,
    rawFilters: FilterInput,
    callback: (count: number) => void
  ): () => void {
    const filters = prepareFilters(this.normalizeFilters(rawFilters, tableId));
    const subscriptionKey = `${tableId}:count:${this.canonicalizeFilters(filters)}`;

    // Ejecutar count inicial
    this.count(tableId, filters).then(callback);

    const table = (this.db as any).table(tableId);

    const observable = liveQuery(async () => {
      // Solo observar cambios en la tabla
      return await table.count();
    });

    const sub = observable.subscribe({
      next: async () => {
        const count = await this.count(tableId, filters);
        callback(count);
      },
      error: (e) =>
        this.logger.error(`subscribeToCount error for ${tableId}:`, e),
    });

    this.logger.debug(`New count subscription: ${subscriptionKey}`);

    return () => {
      try {
        sub.unsubscribe();
        this.logger.debug(`Unsubscribed from count: ${subscriptionKey}`);
      } catch (e) {
        this.logger.warn(`Error unsubscribing from count: ${subscriptionKey}`, e);
      }
    };
  }

  private totalCache = new Map<string, { total: number; ts: number }>();

  /**
 * total - Calcula la suma de un campo numérico
 */
  async total(table: string, fieldId: string, rawFilters?: FilterInput): Promise<number> {
    this.ensureTableInvalidationWatch(table);

    const filters = prepareFilters(this.normalizeFilters(rawFilters, table));
    const key = this.totalCacheKey(table, fieldId, filters);

    const cached = this.totalCache.get(key);
    if (cached) {
      this.touchTotalCache(key);
      this.logger.debug(`Total cache hit for ${table}.${fieldId}: ${cached.total}`);
      return cached.total;
    }

    this.logger.debug(`Calculating total for ${table}.${fieldId} with ${Object.keys(filters).length} filters`);

    // Usar la misma lógica que query para obtener los registros filtrados
    const { remainingFilters, ids } = await this.getIdsByFilters(table, filters);
    const t = this.db.table(table);

    let rows: any[] = [];
    if (ids !== null) {
      if (ids.length === 0) {
        rows = [];
      } else {
        const collection = t.where("id").anyOf(ids);
        if (Object.keys(remainingFilters).length > 0) {
          const pred = this.buildPredicate(remainingFilters, table);
          rows = await collection.filter(pred as any).toArray();
        } else {
          rows = await collection.toArray();
        }
      }
    } else {
      const collection = t.toCollection();
      if (Object.keys(remainingFilters).length > 0) {
        const pred = this.buildPredicate(remainingFilters, table);
        rows = await collection.filter(pred as any).toArray();
      } else {
        rows = await collection.toArray();
      }
    }

    // Calcular la suma del campo especificado
    let total = 0;
    for (const row of rows) {
      const value = row[fieldId];
      if (typeof value === 'number' && !isNaN(value)) {
        total += value;
      } else if (value !== null && value !== undefined) {
        // Intentar convertir a número si es posible
        const num = Number(value);
        if (!isNaN(num)) {
          total += num;
        }
      }
    }

    this.totalCache.set(key, { total, ts: Date.now() });
    this.logger.debug(`Total for ${table}.${fieldId}: ${total} (from ${rows.length} rows)`);
    return total;
  }

  /**
   * subscribeToTotal - Suscripción reactiva a la suma de un campo
   */
  subscribeToTotal(
    tableId: string,
    fieldId: string,
    rawFilters: FilterInput,
    callback: (total: number) => void
  ): () => void {
    const filters = prepareFilters(this.normalizeFilters(rawFilters, tableId));
    const subscriptionKey = `${tableId}:total:${fieldId}:${this.canonicalizeFilters(filters)}`;

    // Total inicial
    this.total(tableId, fieldId, filters).then(callback);

    const table = (this.db as any).table(tableId);

    // Observable SOLO para detectar cambios
    const observable = liveQuery(async () => {
      return await table.count();
    });

    let lastTotal: number | null = null;

    const update = async () => {
      const t = await this.total(tableId, fieldId, filters);
      if (t !== lastTotal) {
        lastTotal = t;
        callback(t);
      }
    };

    const sub = observable.subscribe({
      next: update,
      error: (e) =>
        this.logger.error(
          `subscribeToTotal error for ${tableId}.${fieldId}:`,
          e
        ),
    });

    this.logger.debug(`New total subscription: ${subscriptionKey}`);

    return () => {
      try {
        sub.unsubscribe();
        this.logger.debug(`Unsubscribed from total: ${subscriptionKey}`);
      } catch (e) {
        this.logger.warn(
          `Error unsubscribing from total: ${subscriptionKey}`,
          e
        );
      }
    };
  }

  private totalCacheKey(table: string, fieldId: string, filters?: NormalizedFilters): string {
    const cf = this.canonicalizeFilters(filters);
    return `${table}::total::${fieldId}::${cf}`;
  }

  private touchTotalCache(key: string) {
    const e = this.totalCache.get(key);
    if (e) {
      e.ts = Date.now();
      this.logger.debug(`Touched total cache: ${key}`);
    }
  }

  public clearTotalsCache(table?: string, fieldId?: string) {
    let cleared = 0;

    if (!table && !fieldId) {
      cleared = this.totalCache.size;
      this.totalCache.clear();
    } else {
      for (const k of Array.from(this.totalCache.keys())) {
        const parts = k.split("::");
        const matchTable = table ? parts[0] === table : true;
        const matchField = fieldId ? parts[2] === fieldId : true;
        if (matchTable && matchField) {
          this.totalCache.delete(k);
          cleared++;
        }
      }
    }

    this.logger.debug(`Cleared ${cleared} total cache entries for table: ${table || 'all'}, field: ${fieldId || 'all'}`);
  }

  /**
 * extractChangedIds - Extrae IDs de los campos cambiados (formato: "id:12345")
 */
  private extractChangedIds(changedFields: Set<string>): Set<string> {
    const ids = new Set<string>();
    for (const field of changedFields) {
      if (field.startsWith('id:')) {
        ids.add(field.replace('id:', ''));
      }
    }
    return ids;
  }

  /**
   * hasIntersection - Verifica si dos Sets tienen intersección (MUY RÁPIDO)
   */
  private hasIntersection(setA: Set<string>, setB: Set<string>): boolean {
    // Si alguno está vacío, no hay intersección
    if (setA.size === 0 || setB.size === 0) return false;

    // Buscar el Set más pequeño para optimizar
    const [smallerSet, largerSet] = setA.size <= setB.size ? [setA, setB] : [setB, setA];

    // Verificar intersección
    for (const item of smallerSet) {
      if (largerSet.has(item)) {
        return true;
      }
    }
    return false;
  }

  /**
   * isDottedFieldAffected - Verifica si un campo dotted está afectado por los cambios
   */
  private async isDottedFieldAffected(
    tableId: string,
    dottedField: string,
    changedFields: Set<string>
  ): Promise<boolean> {
    const relationInfo = this.extractDottedFieldRelations(tableId, dottedField);
    if (!relationInfo) return false;

    const { relationPath, targetField } = relationInfo;

    // Verificar si el campo target cambió en alguna tabla relacionada
    for (const relationTable of relationPath) {
      const relationChanges = this.recentFieldChanges.get(relationTable);
      if (relationChanges && relationChanges.has(targetField)) {
        return true;
      }
    }

    // Verificar si el campo de relación cambió en la tabla base
    const relationField = dottedField.split('.')[0];
    if (changedFields.has(relationField) || changedFields.has(`${relationField}.*`)) {
      return true;
    }

    return false;
  }

  /**
   * trackFieldChanges - Registrar campos modificados en operaciones
   */
  private trackFieldChanges(tableId: string, records: any[], operation: 'insert' | 'update' | 'delete') {
    const changedFields = this.recentFieldChanges.get(tableId) || new Set<string>();

    if (operation === 'update') {
      // Para update, trackear todos los campos modificados Y los IDs específicos
      records.forEach(record => {
        if (record.id) {
          // Marcar el ID específico que cambió
          changedFields.add(`id:${record.id}`);
        }

        Object.keys(record).forEach(field => {
          if (field !== 'id') {
            changedFields.add(field);

            // Si el campo es una relación, también trackear potenciales cambios en campos dotted
            const fieldMeta = this.getTableFieldsFor(tableId).find(f => f.identifier === field);
            if (fieldMeta && fieldMeta.relationTableIdentifier) {
              // Marcar que esta relación podría afectar filtros dotted
              changedFields.add(`${field}.*`);
            }

          }
        });
      });
    } else if (operation === 'insert' || operation === 'delete') {
      // Para insert/delete, considerar que todos los campos podrían estar afectados
      changedFields.add('*');

      // También trackear IDs específicos para inserts y deletes
      records.forEach(record => {
        if (record.id) {
          changedFields.add(`id:${record.id}`);
        }
      });

      // También marcar todas las relaciones como potencialmente afectadas

      const tableFields = this.getTableFieldsFor(tableId);
      tableFields.forEach(field => {
        if (field.relationTableIdentifier) {
          changedFields.add(`${field.identifier}.*`);
        }
      });

    }

    this.recentFieldChanges.set(tableId, changedFields);

    // Notificar cambios en tablas relacionadas para filtros dotted
    this.notifyRelatedTableChanges(tableId, records, operation);

    this.logger.debug(`Tracked ${changedFields.size} field changes for ${tableId} (operation: ${operation})`);

    // Limpiar después de un tiempo (5 segundos)
    setTimeout(() => {
      const currentChanges = this.recentFieldChanges.get(tableId);
      if (currentChanges === changedFields) {
        this.recentFieldChanges.delete(tableId);
        this.logger.debug(`Cleared field change tracking for ${tableId}`);
      }
    }, 5000);
  }

  private async notifySubscriptions(tableId: string) {
    const subscriptions = this.querySubscriptions.get(tableId) || [];

    if (subscriptions.length === 0) return;

    this.logger.debug(`Notifying ${subscriptions.length} subscriptions for ${tableId}`);

    // Notificar cada suscripción en paralelo
    const notifications = subscriptions.map(async (sub) => {
      try {
        const shouldRefresh = await this.shouldRefreshQuery(
          tableId,
          sub.filters,
          sub.options,
          sub.currentIds // 👈 Pasar currentIds
        );
        if (shouldRefresh) {
          const data = await this.query(tableId, sub.filters, sub.options);
          sub.callback(data); // 👈 Esto actualizará sub.currentIds automáticamente
        }
      } catch (error) {
        this.logger.error(`Error notifying subscription for ${tableId}:`, error);
      }
    });

    await Promise.all(notifications);
  }

  private notifyRelatedTableChanges(tableId: string, records: any[], operation: 'insert' | 'update' | 'delete') {
    // Obtener todas las suscripciones que podrían estar afectadas por cambios en esta tabla
    for (const [subscriptionTableId, subscriptions] of this.querySubscriptions.entries()) {
      if (subscriptionTableId === tableId) continue;

      // Verificar si alguna suscripción tiene filtros dotted que referencian esta tabla
      for (const subscription of subscriptions) {
        const hasRelevantDottedFilter = Object.keys(subscription.filters).some(filterField => {
          if (!filterField.includes('.')) return false;

          const relationInfo = this.extractDottedFieldRelations(subscriptionTableId, filterField);
          if (!relationInfo) return false;

          // Verificar si el camino de relaciones incluye la tabla modificada
          return relationInfo.relationPath.includes(tableId) ||
            (relationInfo.baseTable === tableId && filterField.startsWith(tableId));
        });

        if (hasRelevantDottedFilter) {
          this.logger.debug(`Table ${tableId} changes may affect dotted filters in ${subscriptionTableId} subscription`);

          // Forzar refresco de esta suscripción
          this.refreshSubscription(subscriptionTableId, subscription).catch(e =>
            this.logger.error(`Error refreshing subscription for ${subscriptionTableId}:`, e)
          );
        }
      }
    }
  }

  private async refreshSubscription(tableId: string, subscription: any) {
    try {
      const shouldRefresh = await this.shouldRefreshQuery(
        tableId,
        subscription.filters,
        subscription.options,
        subscription.currentIds // 👈 Pasar currentIds
      );
      if (shouldRefresh) {
        const data = await this.query(tableId, subscription.filters, subscription.options);
        subscription.callback(data); // 👈 Esto actualizará currentIds
        this.logger.debug(`Refreshed subscription for ${tableId} due to related table changes`);
      }
    } catch (error) {
      this.logger.error(`Error refreshing subscription for ${tableId}:`, error);
    }
  }

  /**
   * getFieldDependencies - Obtiene dependencias de campos para una query
   */
  private getFieldDependencies(tableId: string, filters: NormalizedFilters, options: any): Set<string> {
    const dependencies = new Set<string>();

    // Agregar campos directos de filtros
    Object.keys(filters).forEach(field => {
      dependencies.add(field);

      // Para campos dotted, agregar dependencias de relaciones
      if (field.includes('.')) {
        const segments = field.split('.');
        let currentTable = tableId;

        for (let i = 0; i < segments.length - 1; i++) {
          const segment = segments[i];
          dependencies.add(segment);

          const fieldMeta = this.getTableFieldsFor(currentTable)
            .find(f => f.identifier === segment);

          if (fieldMeta && fieldMeta.relationTableIdentifier) {
            currentTable = fieldMeta.relationTableIdentifier;
            // Agregar la tabla relacionada como dependencia
            dependencies.add(`${currentTable}.${segments.slice(i + 1).join('.')}`);
          } else {
            break;
          }
        }
      }
    });

    // Agregar campos de ordenamiento
    (options?.order || []).forEach(([field]: [string, any]) => {
      dependencies.add(field);
    });

    return dependencies;
  }


  watchSetting(key: string, default_on_undefined?: any): Accessor<any> {
    if (!key) {
      const [g] = createSignal(undefined);
      return g;
    }

    const cached = this.settingsMap.get(key);
    if (cached) return cached.get;

    // fallback (caso raro)
    const [get, set] = createSignal<any>(default_on_undefined);
    this.settingsMap.set(key, { get, set });

    return get;
  }


  async setSetting(key: string, value: any, wait = 200, props?: Partial<SettingItem>): Promise<void> {
    if (!key) return;

    // cancelar debounce previo
    const prev = this.settingsDebounceMap.get(key);
    if (prev) {
      clearTimeout(prev);
      this.settingsDebounceMap.delete(key);
    }

    const timeoutId = setTimeout(async () => {
      try {
        // query devuelve array; usamos el primero
        const rows: TableRecord[] = await this.query("settings", { key });
        const existing = (rows && rows[0]) ? rows[0] : undefined;

        if (existing) {
          // update requiere id
          await this.update("settings", { ...props, id: existing.id, value });
        } else {
          // insertamos un registro mínimo respetando el nuevo formato
          const newRow: Partial<TableRecord> = {
            name: key,
            default: null,
            fieldFormat: 'string',
            description: null,
            setting_group_id: null,
            position: 0,
            ...props,
            key,
            value
          };
          await this.insert("settings", newRow);
        }
      } catch (e) {
        console.warn("SchemaCache.setSetting: store write failed", e);
      }

      // actualizar cache en memoria inmediatamente
      const entry = this.settingsMap.get(key);
      if (entry) {
        entry.set(value);
      } else {
        const [g, s] = createSignal<any>(value);
        this.settingsMap.set(key, { get: g, set: s });
      }

      this.settingsDebounceMap.delete(key);
    }, wait);

    this.settingsDebounceMap.set(key, timeoutId);
  }

  async deleteSetting(key: string): Promise<void> {
    if (!key) return;

    try {
      const rows: TableRecord[] = await this.query("settings", { key });
      const row = (rows && rows[0]) ? rows[0] : undefined;
      if (row) {
        await this.delete("settings", row.id!);
      }
    } catch (e) {
      console.warn("SchemaCache.deleteSetting failed", e);
    }

    const entry = this.settingsMap.get(key);
    if (entry) {
      entry.set(undefined);
      try { entry.unsub?.(); } catch { }
      this.settingsMap.delete(key);
    }
  }

  /**
 * preloadSettings()
 * - Carga todos los settings existentes
 * - Inicializa el cache reactivo
 * - Evita flash de UI
 */
  async preloadSettings(): Promise<void> {
    const table = "settings";

    try {
      const rows: TableRecord[] = await this.query(table);

      for (const row of rows) {
        if (!row?.key) continue;

        // si ya existe, no lo pisamos
        if (this.settingsMap.has(row.key)) continue;

        const initialValue =
          row.value !== undefined ? row.value : row.default;

        const [get, set] = createSignal<any>(initialValue);

        this.settingsMap.set(row.key, {
          get,
          set,
          unsub: undefined, // aún no hay liveQuery
        });
      }
    } catch (e) {
      console.warn("SchemaCache.preloadSettings failed", e);
    }
  }

  // === Accesos directos a SchemaCache desde RecordsManager ===

  /**
   * Espera a que el schema esté cargado
   */
  async waitForSchemaReady(): Promise<void> {
    return this.schema.waitForSchemaReady();
  }

  /**
   * Verifica si el schema ya está cargado
   */
  isSchemaReady(): boolean {
    return this.schema.isSchemaReady();
  }

  /**
   * Obtiene Accessor reactivo de las definiciones de tabla
   */
  get tableDefs() {
    return this.schema.tableDefs;
  }

  /**
   * Obtiene Accessor reactivo de todos los campos
   */
  get tableFields() {
    return this.schema.tableFields;
  }

  /**
   * Obtiene una tabla por su clave (id o identifier)
   */
  getTable(key: string) {
    return this.schema.getTable(key);
  }

  /**
   * Obtiene todas las tablas como objeto
   */
  getTables() {
    return this.schema.getTables();
  }

  /**
   * Obtiene un campo por su clave
   */
  getField(key: string, tableKey?: string) {
    return this.schema.getField(key, tableKey);
  }

  /**
   * Obtiene campos de una tabla específica
   */
  getTableFieldsFor(key: string) {
    return this.schema.getTableFieldsFor(key);
  }

  /**
   * Observa una tabla para cambios
   */
  observeTable<T = any>(key: string, onChange: (rows: T[]) => void) {
    return this.schema.observeTable<T>(key, onChange);
  }

  /**
   * Observa un valor reactivo
   */
  watchValue(name: string, default_on_undefined?: any) {
    return this.schema.watchValue(name, default_on_undefined);
  }

  /**
   * Establece un valor reactivo
   */
  setValue(name: string, value: any, wait: number = 0, duration: number = 0) {
    return this.schema.setValue(name, value, wait, duration);
  }

  /**
   * Elimina un valor reactivo
   */
  deleteValue(name: string) {
    return this.schema.deleteValue(name);
  }

  /**
   * Observa una sesión reactiva
   */
  watchSession(name: string, default_on_undefined?: any) {
    return this.schema.watchSession(name, default_on_undefined);
  }

  /**
   * Establece una sesión reactiva
   */
  async setSession(name: string, value: any, wait: number = 200, duration: number = 0) {
    return this.schema.setSession(name, value, wait, duration);
  }

  /**
   * Elimina una sesión reactiva
   */
  async deleteSession(name: string) {
    return this.schema.deleteSession(name);
  }

  /**
   * Limpia todas las sesiones
   */
  async clearAllSession() {
    return this.schema.clearAllSession();
  }

  /**
   * Obtiene todas las sesiones
   */
  async getAllSession() {
    return this.schema.getAllSession();
  }

  stop() {
    // cleanup settings watchers
    for (const [, entry] of this.settingsMap) {
      try { entry.unsub?.(); } catch { }
    }
    this.settingsMap.clear();
  }
}
