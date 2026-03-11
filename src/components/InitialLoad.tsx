// InitialLoad.tsx - Versión corregida
import { createSignal, JSXElement, onMount } from "solid-js"
import { store } from "../app"
import { iconsSeed, interfacesSeed, menuItemsSeed, usersSeed } from "../constants/seed-users"
import { wait } from "../lib/utils/utils"
import { TableRecord } from "../types/schema"

/**
 * Función para upsert (insert/update) elementos en una tabla
 * @param tableIdentifier - Nombre de la tabla (ej: "menu_items")
 * @param specItems - Array de elementos del spec
 * @param lookupKey - Clave mediante la cual buscar (ej: "identifier")
 * @param relationKeys - Mapeo de campos de relación: { campo_local: "campo_referencia_en_tabla_relacionada" }
 */
async function upsertFromSpec(
  tableIdentifier: string,
  specItems: any[],
  lookupKeys: string, // puede ser "identifier" o "identifier+tableIdentifier"
  relationKeys?: Record<string, string>,
): Promise<void> {
  if (!specItems || specItems.length === 0) return

  const table = store.getTable(tableIdentifier)!
  
  // Dividir lookupKeys en campos individuales
  const lookupFields = lookupKeys.includes('+') ? lookupKeys.split('+') : [lookupKeys];

  // Generar mapa de claves compuestas para los specItems
  const specMap = new Map<string, any>();
  specItems.forEach(item => {
    // Verificar que todos los campos lookup tengan valor
    const hasAllValues = lookupFields.every(field => item[field] != null);
    if (!hasAllValues) return;
    
    const compositeKey = lookupFields.map(field => String(item[field])).join('|');
    specMap.set(compositeKey, item);
  });

  if (specMap.size === 0) return;

  // Obtener todos los registros existentes de la tabla (para datos iniciales es aceptable)
  const existingItems = await store.query(table.identifier, {});

  // Crear mapa de existentes por clave compuesta
  const existingMap = new Map<string, TableRecord>();
  existingItems.forEach(item => {
    const hasAllValues = lookupFields.every(field => item[field] != null);
    if (!hasAllValues) return;
    const compositeKey = lookupFields.map(field => String(item[field])).join('|');
    existingMap.set(compositeKey, item);
  });

  // Preparar datos de relaciones (sin cambios)
  const relationMaps: Record<string, Map<string, TableRecord>> = {}
  
  if (relationKeys) {
    for (const [localField, remoteLookupField] of Object.entries(relationKeys)) {
      const fieldDef = store.getField(localField, tableIdentifier)
      if (!fieldDef?.relationTableIdentifier) {
        console.warn(`Campo ${localField} en tabla ${tableIdentifier} no es una relación válida`)
        continue
      }

      const remoteValues = specItems
        .map(item => item[localField])
        .filter(Boolean)
        .filter((v, i, a) => a.indexOf(v) === i)

      if (remoteValues.length === 0) continue

      const remoteRecords = await store.query(fieldDef.relationTableIdentifier, {
        [remoteLookupField]: { op: "=", v: remoteValues }
      })

      const map = new Map<string, TableRecord>()
      remoteRecords.forEach(record => {
        const refValue = record[remoteLookupField]
        if (refValue) {
          map.set(String(refValue), record)
        }
      })
      
      relationMaps[localField] = map
    }
  }

  const newItems = []
  const updateItems = []

  // Procesar cada item del spec usando specMap
  for (const [compositeKey, specItem] of specMap.entries()) {
    // Transformar relaciones
    const processedItem = { ...specItem }
    
    if (relationKeys) {
      for (const [localField] of Object.entries(relationKeys)) {
        const field = store.getField(localField, tableIdentifier)
        const relationMap = relationMaps[localField]
        if (relationMap && processedItem[localField] != null) {
          const refValue = String(processedItem[localField])
          const relatedRecord = relationMap.get(refValue)
          
          if (relatedRecord) {
            processedItem[localField] = relatedRecord[field?.relationKey || 'id']
          } else {
            console.warn(`No se encontró registro relacionado para ${localField}=${refValue} en tabla ${tableIdentifier}`)
            delete processedItem[localField]
          }
        }
      }
    }

    const existingItem = existingMap.get(compositeKey)

    if (!existingItem) {
      newItems.push(processedItem)
    } else {
      const mergedItem = {
        ...existingItem,
        ...processedItem,
        id: existingItem.id
      }
      updateItems.push(mergedItem)
    }
  }

  if (newItems.length > 0) {
    await store.insert(tableIdentifier, newItems)
  }

  if (updateItems.length > 0) {
    await store.update(tableIdentifier, updateItems)
  }
}

export default function InitialLoad(): JSXElement {
  const [loading, setLoading] = createSignal(true)

  onMount(async () => {
    try {
      // Cargar en orden correcto: primero las tablas referenciadas
      await upsertFromSpec("table_defs", store.tableDefs(), "identifier")
      await upsertFromSpec("table_fields", store.tableFields(), "identifier+tableIdentifier", { 
        tableIdentifier: "identifier"  // tableIdentifier apunta a table_defs por el campo 'identifier'
      })
      await upsertFromSpec("icons", iconsSeed, "name")
      await upsertFromSpec("users", usersSeed, "username")
      await upsertFromSpec("interfaces", interfacesSeed, "route")
      await wait(100)
      
      // Ahora las tablas con relaciones (dependen de interfaces y de sí mismas)
      await upsertFromSpec("menu_items", menuItemsSeed, "identifier", { 
        interface_id: "route",   // interface_id en menu_items busca en interfaces por 'route'
        parent_id: "identifier", // parent_id busca en la misma tabla (menu_items) por 'identifier'
      })
      
      console.log("Carga inicial completada exitosamente")
    } catch (error) {
      console.error("Error en carga inicial:", error)
    } finally {
      setLoading(false)
    }
  })

  return <>
    {loading() ? <div class="w-full flex items-center justify-center">
      <div class="text-center">
        <div class="flex items-center justify-center space-x-2 p-2">
          <div class="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
          <p class="text-gray-600 text-lg font-medium">Cargando datos iniciales...</p>
        </div>
      </div>
    </div> : null}
  </>
}