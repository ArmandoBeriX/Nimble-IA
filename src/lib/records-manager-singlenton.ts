import { TablesSpec } from "../constants/table-defs";
import { NimbleDBManager } from "./db";
import { RecordsManager } from "./records-manager";

// records-manager-singleton.ts
export class RecordsManagerSingleton {
  private static instance: RecordsManager | null = null;
  private static initializationPromise: Promise<RecordsManager> | null = null;

  static async getInstance(): Promise<RecordsManager> {
    // Si ya tenemos una instancia, devolverla
    if (this.instance) {
      return this.instance;
    }

    // Si hay una inicialización en curso, esperarla
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Iniciar la inicialización
    this.initializationPromise = (async () => {
      try {
        const dbManager = await NimbleDBManager.getInstance();
        
        // Verificar si ya está inicializado
        if (dbManager.isInitialized()) {
          console.log('Database already initialized, opening quickly...');
          await dbManager.openQuick();
        } else {
          console.log('Initializing database for the first time...');
          await dbManager.migrateSchema(TablesSpec); // TODO: Esto debería tomarse del NestJS API server. Por ahora está local
        }
        
        this.instance = new RecordsManager(dbManager);
        
        // ESPERAR A QUE EL SCHEMA ESTÉ REALMENTE CARGADO
        await this.instance.waitForSchemaReady();
        
        console.log('NimbleAI DataBase Ready');
        return this.instance;
      } catch (error) {
        // Si hay error, limpiar la promesa para permitir reintento
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