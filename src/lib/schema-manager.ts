import { TableDef } from "../types/schema";
import { NimbleDBManager } from "./db";

// En algún componente o servicio que gestione el esquema dinámico
export class SchemaManager {
  constructor(private dbManager: NimbleDBManager) {}
  
  async updateTableSchema(tableDefs: TableDef[]): Promise<void> {
    // Esto dispararía una migración
    await this.dbManager.migrateSchema(tableDefs);
  }
  
  async addNewTable(newTable: TableDef): Promise<void> {
    // Obtener el esquema actual
    const currentMeta = await this.dbManager.getStoredSchema();
    const currentTableDefs = currentMeta?.tableDefs || [];
    
    // Agregar nueva tabla
    const updatedTableDefs = [...currentTableDefs, newTable];
    
    // Esto dispararía migración
    await this.dbManager.migrateSchema(updatedTableDefs);
  }
  
  async modifyTable(tableId: string, updates: Partial<TableDef>): Promise<void> {
    const currentMeta = await this.dbManager.getStoredSchema();
    const currentTableDefs = currentMeta?.tableDefs || [];
    
    // Modificar tabla existente
    const updatedTableDefs = currentTableDefs.map(table => 
      table.id === tableId ? { ...table, ...updates } : table
    );
    
    // Esto dispararía migración
    await this.dbManager.migrateSchema(updatedTableDefs);
  }
}