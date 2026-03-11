// src/lib/nimble-db.ts
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

const DB_NAME = "NimbleAI";
const META_KEY = "schema";
const DEFAULT_COLS = ["id", "authorId", "createdAt", "updatedAt", "syncStatus"];
const DEFAULT_COLS_LABELS: Record<string, string> = {id: "ID", authorId: "Autor", createdAt: "Creado", updatedAt: "Actualizado", syncStatus: "Sincronización" };

/* Utility: arma definiciones de stores para Dexie a partir de tableSpec */
function buildStoresFromSpec(tableSpec: TableDef[]): Record<string, string> {
  const stores: Record<string, string> = {};

  for (const t of tableSpec) {
    const fieldsForTable = (t.tableFields ?? []);

    const parts = [...DEFAULT_COLS];

    for (const f of fieldsForTable) {
      if (f.isFilter || f.isUnique) {
        let token = "";
        if (f.isUnique) token += "&";
        else if (f.multiple) token += "*";
        token += f.identifier;
        parts.push(token);
      }
    }

    const uniq = parts.filter((v, i, a) => a.indexOf(v) === i);
    stores[t.identifier] = uniq.join(",");
  }

  stores["settings"] = "name";
  stores["session"] = "name";
  stores["meta"] = "k";

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
    const nextTable = nextTables.find((t) => t.id === (prevTable?.id ?? "") ) ?? nextTables.find((t) => t.identifier === nf.tableIdentifier);

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

  constructor(name?: string) {
    if (name) this.name = name;
  }

  private async openBaseIfNeeded(): Promise<void> {
    if (this.db && (this.db as any).isOpen()) return;

    this.db = new Dexie(this.name);
    this.db.version(1).stores({
      meta: "k",
      settings: "name",
      session: "name",
    });
    await this.db.open();

    const metaTable = (this.db as any).table("meta");
    const meta = (await metaTable.get(META_KEY)) as StoredSchemaMeta | undefined;
    if (meta?.version) this.currentVersion = meta.version;
  }

  public async getStoredSchema(): Promise<StoredSchemaMeta | undefined> {
    await this.openBaseIfNeeded();
    const metaTable = (this.db as any).table("meta");
    return (await metaTable.get(META_KEY)) as StoredSchemaMeta | undefined;
  }

  /* migrateSchema ahora recibe tableSpec (array de TableDef con sus tableFields). */
  public async migrateSchema(tableSpec: TableDef[]): Promise<{ migrated: boolean; newVersion?: number }> {
    tableSpec = this.normalizeTableFields(tableSpec);

    await this.openBaseIfNeeded();
    const prev = await this.getStoredSchema();

    if (!needsMigrationFromSpec(prev, tableSpec)) {
      return { migrated: false };
    }

    // construir stores y mappings antes de cerrar
    const stores = buildStoresFromSpec(tableSpec);
    if (!stores["meta"]) stores["meta"] = "k";
    if (!stores["settings"]) stores["settings"] = "name";
    if (!stores["session"]) stores["session"] = "name";

    const { tableRenames, fieldRenamesByTable } = buildMigrationMappingsFromSpec(prev, tableSpec);

    // cerrar DB actual
    if (this.db && (this.db as any).isOpen()) {
      await this.db.close();
      this.db = undefined;
    }

    const newVersion = (prev?.version ?? this.currentVersion) + 1;
    const db = new Dexie(this.name);

    // declarar stores para la nueva versión y pasar upgrade handler
    db.version(newVersion).stores(stores).upgrade(async (tx) => {
      // Para cada mapeo de tabla antigua -> tabla nueva, copiar registros
      for (const rename of tableRenames) {
        try {
          const oldTable = tx.table(rename.oldName);
          const newTable = tx.table(rename.newName);

          // forzar existencia
          await oldTable.toCollection().modify(() => {});

          // iterar y copiar
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
      for (const col of DEFAULT_COLS) {
        // si ya existe field con ese identifier en esa tabla, saltar
        const exists = augmentedFields.find(f => f.tableIdentifier === t.identifier && f.identifier === col);
        if (exists) continue;

        // generar id consistente pero único
        const genId = `__meta_${t.identifier}_${col}`;
        const fieldFormat = col === "createdAt" || col === "updatedAt" ? "datetime" : (col === "syncStatus" ? "int" : "relation");
        const tf: TableField = {
          id: genId,
          identifier: col,
          name: DEFAULT_COLS_LABELS[col] ?? col,
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

    return { migrated: true, newVersion };
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
}
