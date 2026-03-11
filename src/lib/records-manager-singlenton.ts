// src/lib/records-manager-singleton.ts
import { TablesSpec } from "../constants/table-defs";
import { NimbleDBManager } from "./db";
import { RecordsManager } from "./records-manager";
import type { TableDef, TableField } from "../types/schema";

export class RecordsManagerSingleton {
  private static instance: RecordsManager | null = null;
  private static initializationPromise: Promise<RecordsManager> | null = null;

  static async getInstance(): Promise<RecordsManager> {
    if (this.instance) return this.instance;
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = (async () => {
      try {
        const dbManager = await NimbleDBManager.getInstance();

        if (dbManager.isInitialized()) {
          console.log("Database already initialized, opening quickly...");
          await dbManager.openQuick();
        } else {
          console.log("Initializing database for the first time...");
          await dbManager.migrateSchema(TablesSpec);
        }

        this.instance = new RecordsManager(dbManager);

        // ── Eager schema load from meta table ─────────────────────────────
        //
        // SchemaCache's liveQuery subscriptions fire their FIRST callback with
        // [] because IndexedDB snapshots the table at subscription time —
        // even if migrateSchema already wrote data moments ago.
        //
        // To avoid resolving schemaReadyPromise with empty data, we read the
        // schema directly from meta.get('schema') (same source migrateSchema
        // writes to), call applySchema() with the real data, then start the
        // liveQuery watchers for subsequent reactive updates.
        //
        // If meta doesn't exist yet (truly empty DB), applySchema([], []) still
        // resolves the promise so the app doesn't hang — it just has no schema,
        // which is the correct state for a brand-new database.

        const db = this.instance.db;
        let defs: TableDef[] = [];
        let fields: TableField[] = [];

        try {
          const meta = await (db as any).table("meta").get("schema");
          if (meta) {
            defs   = Array.isArray(meta.tableDefs)   ? meta.tableDefs   : [];
            fields = Array.isArray(meta.tableFields) ? meta.tableFields : [];
          }
        } catch (e) {
          console.warn("RecordsManagerSingleton: could not read meta schema, starting empty:", e);
        }

        this.instance.schema.applySchema(defs, fields);
        this.instance.schema.startWatching();

        console.log("NimbleAI DataBase Ready");
        return this.instance;
      } catch (error) {
        this.initializationPromise = null;
        this.instance = null;
        throw error;
      }
    })();

    return this.initializationPromise;
  }

  static clearInstance(): void {
    this.instance = null;
    this.initializationPromise = null;
  }
}