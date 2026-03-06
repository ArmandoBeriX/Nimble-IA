// src/lib/db.ts
import Dexie from "dexie";
import { TableDef, TableField } from "../types/schema";

/* Meta que guardamos en la tabla 'meta' */
type StoredSchemaMeta = {
  k: "schema";
  version: number;
  tableDefs: TableDef[];
  tableFields: TableField[];
  savedAt: string;
};

export const DB_NAME = "NimbleAI";
const META_KEY = "schema";
export const DEFAULT_FIELDS = ["id", "authorId", "createdAt", "updatedAt", "syncStatus"];
const DEFAULT_FIELDS_LABELS: Record<string, string> = { id: "ID", authorId: "Autor", createdAt: "Creado", updatedAt: "Actualizado", syncStatus: "Sincronización" };

// Claves para localStorage
const LS_SCHEMA_KEY = (dbName: string) => `nimbleai_schema_${dbName}`;
const LS_VERSION_KEY = (dbName: string) => `nimbleai_schema_version_${dbName}`;
const LS_INITIALIZED_KEY = (dbName: string) => `nimbleai_initialized_${dbName}`;

/* Utility: arma definiciones de stores para Dexie a partir de tableSpec */
function buildStoresFromSpec(tableSpec: TableDef[]): Record<string, string> {
  const stores: Record<string, string> = {};

  for (const t of tableSpec) {
    const fieldsForTable = (t.tableFields ?? []);

    const parts = [...DEFAULT_FIELDS];

    for (const f of fieldsForTable) {
      if (f.isFilter || f.isUnique) {
        let token = "";
        if (f.isUnique) token += "&";
        else if (f.multiple) token += "*";
        if (f.isUnique && f.uniqueKeys && f.uniqueKeys.length > 0) {
          token += `[${[f.identifier, ...new Set([...f.uniqueKeys])].join('+')}]`;
        } else {
          token += f.identifier;
        }
        parts.push(token);
      }
    }

    const uniq = parts.filter((v, i, a) => a.indexOf(v) === i);
    stores[t.identifier] = uniq.join(",");
  }

  Object.assign(stores, {
    meta: "k",
    session: "name",
  })

  return stores;
}

/* Decide si hace falta migración comparando prev meta y next tableSpec */
function needsMigrationFromSpec(prev?: StoredSchemaMeta, nextSpec?: TableDef[]): boolean {
  if (!prev) return true;

  const nextTables = nextSpec ?? [];
  const nextFields = (nextSpec ?? []).flatMap(t => t.tableFields ?? []);

  const prevTablesById = new Map(prev.tableDefs.map((t) => [t.id, t]));
  const prevFieldsById = new Map(prev.tableFields.map((f) => [f.id, f]));

  for (const nt of nextTables) {
    const pt = prevTablesById.get(nt.id);
    if (!pt) return true;
    if (pt.identifier !== nt.identifier) return true;
  }

  for (const nf of nextFields) {
    const pf = prevFieldsById.get(nf.id);
    if (!pf) {
      if (nf.isFilter || nf.isUnique) return true;
      continue;
    }

    if (
      Boolean(pf.isFilter) !== Boolean(nf.isFilter) ||
      Boolean(pf.isUnique) !== Boolean(nf.isUnique) ||
      Boolean(pf.multiple) !== Boolean(nf.multiple)
    ) {
      return true;
    }

    if ((pf.isFilter || nf.isFilter) && pf.identifier !== nf.identifier) {
      return true;
    }
  }

  return false;
}

/* Construye mapeos necesarios para la migración de datos desde prev -> nextSpec:
   - tableRenames: oldIdentifier -> newIdentifier (por table.id)
   - fieldRenamesByTable: Map(newTableIdentifier -> [{ oldId, oldIdentifier, newIdentifier }])
*/
function buildMigrationMappingsFromSpec(prev?: StoredSchemaMeta, nextSpec?: TableDef[]) {
  const tableRenames: { oldName: string; newName: string }[] = [];
  const fieldRenamesByTable = new Map<
    string,
    { oldId: string; oldIdentifier: string; newIdentifier: string }[]
  >();

  if (!prev) return { tableRenames, fieldRenamesByTable };

  const nextTables = nextSpec ?? [];
  const nextFields = nextTables.flatMap(t => t.tableFields ?? []);

  const prevTablesById = new Map(prev.tableDefs.map((t) => [t.id, t]));
  const nextTablesById = new Map(nextTables.map((t) => [t.id, t]));

  // tablas que cambiaron de identifier (mapeo old->new)
  for (const pt of prev.tableDefs) {
    const nt = nextTablesById.get(pt.id);
    if (nt && pt.identifier !== nt.identifier) {
      tableRenames.push({ oldName: pt.identifier, newName: nt.identifier });
    }
  }

  // campos prev -> next (por id). Determinar tabla destino considerando renames.
  const prevFieldsById = new Map(prev.tableFields.map((f) => [f.id, f]));
  const nextFieldsById = new Map(nextFields.map((f) => [f.id, f]));

  for (const [fid, pf] of prevFieldsById.entries()) {
    const nf = nextFieldsById.get(fid);
    if (!nf) continue;

    // encuentra la tabla prev y la tabla next correspondiente
    const prevTable = prev.tableDefs.find((t) => t.identifier === pf.tableIdentifier);
    // nextTable puede encontrarse por id si la tabla existía, o por identifier en nf
    const nextTable = nextTables.find((t) => t.id === (prevTable?.id ?? "")) ?? nextTables.find((t) => t.identifier === nf.tableIdentifier);

    const targetTableIdentifier = nextTable ? nextTable.identifier : nf.tableIdentifier;

    if (
      pf.identifier !== nf.identifier ||
      pf.tableIdentifier !== nf.tableIdentifier ||
      tableRenames.find((r) => r.oldName === pf.tableIdentifier)
    ) {
      const arr = fieldRenamesByTable.get(targetTableIdentifier) ?? [];
      arr.push({
        oldId: fid,
        oldIdentifier: pf.identifier,
        newIdentifier: nf.identifier,
      });
      fieldRenamesByTable.set(targetTableIdentifier, arr);
    }
  }

  return { tableRenames, fieldRenamesByTable };
}

export class NimbleDBManager {
  private name = DB_NAME;
  private db?: Dexie;
  private currentVersion = 1;

  // Agregar estáticos para el singleton y caché
  private static instances = new Map<string, NimbleDBManager>();
  private static schemaCache = new Map<string, {
    version: number;
    tableDefs: TableDef[];
    tableFields: TableField[];
    hash: string;
  }>();
  private migrationPromise?: Promise<{ migrated: boolean; newVersion?: number }>;

  constructor(name?: string) {
    if (name) this.name = name;
    this.loadSchemaFromLocalStorage();
  }

  // Método estático para obtener instancia singleton
  public static async getInstance(name?: string): Promise<NimbleDBManager> {
    const dbName = name || DB_NAME;

    if (!this.instances.has(dbName)) {
      const instance = new NimbleDBManager(dbName);
      this.instances.set(dbName, instance);
    }

    return this.instances.get(dbName)!;
  }

  // Cargar esquema desde localStorage
  private loadSchemaFromLocalStorage(): void {
    try {
      const schemaData = localStorage.getItem(LS_SCHEMA_KEY(this.name));
      const version = localStorage.getItem(LS_VERSION_KEY(this.name));

      if (schemaData && version) {
        const parsed = JSON.parse(schemaData);
        NimbleDBManager.schemaCache.set(this.name, {
          ...parsed,
          version: parseInt(version)
        });
      }
    } catch (error) {
      console.warn('Error loading schema from localStorage:', error);
      this.clearLocalStorageCache();
    }
  }

  // Guardar esquema en localStorage
  private saveSchemaToLocalStorage(version: number, tableDefs: TableDef[], tableFields: TableField[]): void {
    try {
      const schemaHash = this.generateSchemaHash(tableDefs, tableFields);
      const schemaData = {
        tableDefs,
        tableFields,
        hash: schemaHash
      };

      localStorage.setItem(LS_SCHEMA_KEY(this.name), JSON.stringify(schemaData));
      localStorage.setItem(LS_VERSION_KEY(this.name), version.toString());
      localStorage.setItem(LS_INITIALIZED_KEY(this.name), 'true');

      NimbleDBManager.schemaCache.set(this.name, {
        version,
        tableDefs,
        tableFields,
        hash: schemaHash
      });
    } catch (error) {
      console.warn('Error saving schema to localStorage:', error);
    }
  }

  // Limpiar caché de localStorage
  private clearLocalStorageCache(): void {
    localStorage.removeItem(LS_SCHEMA_KEY(this.name));
    localStorage.removeItem(LS_VERSION_KEY(this.name));
    localStorage.removeItem(LS_INITIALIZED_KEY(this.name));
    NimbleDBManager.schemaCache.delete(this.name);
  }

  // Generar hash del esquema para comparaciones rápidas
  private generateSchemaHash(tableDefs: TableDef[], tableFields: TableField[]): string {
    const data = {
      tables: tableDefs.map(t => ({
        id: t.id,
        identifier: t.identifier,
        fields: (t.tableFields || []).map(f => ({
          id: f.id,
          identifier: f.identifier,
          isFilter: f.isFilter,
          isUnique: f.isUnique,
          multiple: f.multiple
        })).sort((a, b) => a.id.localeCompare(b.id))
      })).sort((a, b) => a.id.localeCompare(b.id))
    };

    return JSON.stringify(data);
  }

  // Verificar si el esquema ya está en caché y es actual
  private hasCurrentSchemaInCache(tableSpec: TableDef[]): boolean {
    const cached = NimbleDBManager.schemaCache.get(this.name);
    if (!cached) return false;

    // Verificar si ya está inicializada la base de datos
    const isInitialized = localStorage.getItem(LS_INITIALIZED_KEY(this.name)) === 'true';
    if (!isInitialized) return false;

    // Generar hash del nuevo esquema y comparar
    const normalizedSpec = this.normalizeTableFields(tableSpec);
    const newHash = this.generateSchemaHash(normalizedSpec, []);

    return cached.hash === newHash;
  }

  private async openBaseIfNeeded(): Promise<void> {
    if (this.db && (this.db as any).isOpen()) return;

    this.db = new Dexie(this.name);
    this.db.version(1).stores({
      meta: "k",
      session: "name",
    });
    await this.db.open();

    // Solo consultar meta si no está en caché
    const cached = NimbleDBManager.schemaCache.get(this.name);

    if (!cached) {
      const metaTable = (this.db as any).table("meta");
      const meta = (await metaTable.get(META_KEY)) as StoredSchemaMeta | undefined;
      if (meta?.version) {
        this.currentVersion = meta.version;
        // Guardar en caché
        this.saveSchemaToLocalStorage(meta.version, meta.tableDefs, meta.tableFields);
      }
    } else {
      this.currentVersion = cached.version;
    }
  }

  public async getStoredSchema(): Promise<StoredSchemaMeta | undefined> {
    await this.openBaseIfNeeded();

    // Si tenemos caché, devolver desde allí
    const cached = NimbleDBManager.schemaCache.get(this.name);
    if (cached) {
      return {
        k: META_KEY,
        version: cached.version,
        tableDefs: cached.tableDefs,
        tableFields: cached.tableFields,
        savedAt: new Date().toISOString()
      };
    }

    const metaTable = (this.db as any).table("meta");
    return (await metaTable.get(META_KEY)) as StoredSchemaMeta | undefined;
  }

  public async migrateSchema(tableSpec: TableDef[]): Promise<{ migrated: boolean; newVersion?: number }> {
    // Verificar caché primero (optimización rápida)
    if (this.hasCurrentSchemaInCache(tableSpec)) {
      console.log('Using cached schema - no migration needed');
      await this.openBaseIfNeeded(); // Solo abrir la conexión
      return { migrated: false };
    }

    // Si ya hay una migración en curso, esperarla
    if (this.migrationPromise) {
      return this.migrationPromise;
    }

    tableSpec = this.normalizeTableFields(tableSpec);

    await this.openBaseIfNeeded();

    // Verificar caché primero
    const cached = NimbleDBManager.schemaCache.get(this.name);
    if (cached) {
      const prevFromCache: StoredSchemaMeta = {
        k: META_KEY,
        version: cached.version,
        tableDefs: cached.tableDefs,
        tableFields: cached.tableFields,
        savedAt: new Date().toISOString()
      };

      if (!needsMigrationFromSpec(prevFromCache, tableSpec)) {
        // Actualizar caché si es necesario (por cambios menores)
        const newHash = this.generateSchemaHash(tableSpec, []);
        if (cached.hash !== newHash) {
          this.saveSchemaToLocalStorage(cached.version, tableSpec, cached.tableFields);
        }
        return { migrated: false };
      }
    }

    const prev = await this.getStoredSchema();

    if (!needsMigrationFromSpec(prev, tableSpec)) {
      // Guardar en caché si no está
      if (prev && !cached) {
        this.saveSchemaToLocalStorage(prev.version, prev.tableDefs, prev.tableFields);
      }
      return { migrated: false };
    }

    // Construir stores y mappings antes de cerrar
    const stores = buildStoresFromSpec(tableSpec);

    const { tableRenames, fieldRenamesByTable } = buildMigrationMappingsFromSpec(prev, tableSpec);

    // Cerrar DB actual
    if (this.db && (this.db as any).isOpen()) {
      await this.db.close();
      this.db = undefined;
    }

    const newVersion = (prev?.version ?? this.currentVersion) + 1;
    const db = new Dexie(this.name);

    // Declarar stores para la nueva versión y pasar upgrade handler
    db.version(newVersion).stores(stores).upgrade(async (tx) => {
      // Para cada mapeo de tabla antigua -> tabla nueva, copiar registros
      for (const rename of tableRenames) {
        try {
          const oldTable = tx.table(rename.oldName);
          const newTable = tx.table(rename.newName);

          // Forzar existencia
          await oldTable.toCollection().modify(() => { });

          // Iterar y copiar
          await oldTable.toCollection().each(async (record: any) => {
            const transformed = { ...record };

            const fieldRenames = fieldRenamesByTable.get(rename.newName) ?? [];
            for (const fr of fieldRenames) {
              if (Object.prototype.hasOwnProperty.call(transformed, fr.oldIdentifier)) {
                transformed[fr.newIdentifier] = transformed[fr.oldIdentifier];
                delete transformed[fr.oldIdentifier];
              }
            }

            try {
              await newTable.put(transformed);
            } catch (err: any) {
              if (err?.name === "ConstraintError") {
                try {
                  const existing = await newTable.get(record.id);
                  const merged = { ...(existing ?? {}), ...transformed };
                  await newTable.put(merged);
                } catch {
                  // ignore
                }
              }
            }
          });
        } catch {
          continue;
        }
      }

      // Para tablas que mantienen mismo identifier pero tienen campos renombrados,
      // aplicar renombrado en su propia store.
      for (const [tableIdentifier, renames] of fieldRenamesByTable.entries()) {
        const table = tx.table(tableIdentifier);
        await table.toCollection().each(async (record: any) => {
          let changed = false;
          const transformed = { ...record };
          for (const fr of renames) {
            if (Object.prototype.hasOwnProperty.call(transformed, fr.oldIdentifier)) {
              transformed[fr.newIdentifier] = transformed[fr.oldIdentifier];
              delete transformed[fr.oldIdentifier];
              changed = true;
            }
          }
          if (changed) {
            try {
              await table.put(transformed);
            } catch {
              // ignore per-record errors
            }
          }
        });
      }

      // Nota: IndexedDB eliminará object stores antiguas que no estén declaradas.
    });

    // Abrir DB con el upgrade aplicado
    await db.open();

    // Guardar nuevo meta (guardamos tableDefs + tableFields separadas como antes)
    const metaTable = (db as any).table("meta");

    // Construir tableFields final incluyendo índices por defecto si faltan
    const baseFields = tableSpec.flatMap(t => t.tableFields ?? []);
    const augmentedFields: TableField[] = [...baseFields];

    for (const t of tableSpec) {
      for (const col of DEFAULT_FIELDS) {
        // Si ya existe field con ese identifier en esa tabla, saltar
        const exists = augmentedFields.find(f => f.tableIdentifier === t.identifier && f.identifier === col);
        if (exists) continue;

        // Generar id consistente pero único
        const genId = `__meta_${t.identifier}_${col}`;
        const fieldFormat = col === "createdAt" || col === "updatedAt" ? "datetime" : (col === "syncStatus" ? "int" : "relation");
        const tf: TableField = {
          id: genId,
          identifier: col,
          name: DEFAULT_FIELDS_LABELS[col] ?? col,
          tableIdentifier: t.identifier,
          fieldFormat,
          relationTableIdentifier: col === "authorId" ? "users" : undefined,
          isFilter: true,
          isUnique: false,
          multiple: false,
          isEditable: false,
          isVisible: true,
          history: false,
          storeData: {},
          relationQuery: {},
          default: null,
          position: -1,
        };
        augmentedFields.push(tf);
      }
    }

    const metaPayload: StoredSchemaMeta = {
      k: META_KEY,
      version: newVersion,
      tableDefs: tableSpec,
      tableFields: augmentedFields,
      savedAt: new Date().toISOString(),
    };
    await metaTable.put(metaPayload);

    this.db = db;
    this.currentVersion = newVersion;

    // Guardar en caché de localStorage
    this.saveSchemaToLocalStorage(newVersion, tableSpec, augmentedFields);

    // Limpiar la promesa de migración
    this.migrationPromise = undefined;

    return { migrated: true, newVersion };
  }

  // Método para verificar rápidamente si la base de datos está inicializada
  public isInitialized(): boolean {
    return localStorage.getItem(LS_INITIALIZED_KEY(this.name)) === 'true';
  }

  // Método para abrir rápidamente sin verificar migración (para uso en app.tsx)
  public async openQuick(): Promise<void> {
    if (this.db && (this.db as any).isOpen()) return;

    // Si sabemos que ya está inicializada, abrir directamente
    if (this.isInitialized()) {
      this.db = new Dexie(this.name);
      const cached = NimbleDBManager.schemaCache.get(this.name);
      const version = cached?.version ?? 1
      const stores = {
        meta: "k",
        session: "name",
      }
      if (cached) {
        // Recrear stores desde caché
        Object.assign(stores, buildStoresFromSpec(cached.tableDefs))
      }
      this.db.version(version).stores(stores);

      await this.db.open();
      this.currentVersion = version;
    } else {
      // Si no está inicializada, usar el flujo normal
      await this.openBaseIfNeeded();
    }
  }

  public dbInstance(): Dexie {
    if (!this.db) throw new Error("DB no abierta. Llama a migrateSchema o openBaseIfNeeded antes.");
    return this.db;
  }

  private normalizeTableFields(tableSpec: TableDef[]): TableDef[] {
    return tableSpec.map((t) => ({
      ...t,
      tableFields: (t.tableFields ?? []).map((f, idx) => ({
        isSearchable: false,
        isFilter: false,
        isUnique: false,
        multiple: false,
        isEditable: true,
        isVisible: true,
        history: true,
        storeData: {},
        relationQuery: {},
        default: null,
        position: idx,
        ...f,
      })),
    }));
  }

  // Método para limpiar toda la base de datos (útil para testing o reset)
  public async clearDatabase(): Promise<void> {
    if (this.db && (this.db as any).isOpen()) {
      await this.db.delete();
      this.db = undefined;
    }
    this.clearLocalStorageCache();
  }
}