// InitialLoad.tsx - Versión corregida
import { createSignal, JSXElement, onMount } from "solid-js"
import { store } from "../app"
import { iconsSeed, interfacesSeed, menuItemsSeed, usersSeed } from "../constants/seed-users"
import { wait } from "../lib/utils/utils"

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
  lookupKey: string,
  relationKeys?: Record<string, string>,
): Promise<void> {
  if (!specItems || specItems.length === 0) return

  // Obtener valores de la lookupKey del spec
  const lookupValues = specItems.map(item => item[lookupKey]).filter(Boolean)
  if (lookupValues.length === 0) return

  // Buscar elementos existentes por la lookupKey
  const existingItems = await store.query(tableIdentifier, {
    [lookupKey]: { op: "=", v: lookupValues }
  })

  // Crear mapa de elementos existentes por lookupKey
  const existingItemsMap = new Map()
  existingItems.forEach(item => {
    existingItemsMap.set(item[lookupKey], item)
  })

  // Preparar datos de relaciones si existen
  const relationMaps: Record<string, Map<string, string>> = {}
  
  if (relationKeys) {
    // Para cada campo de relación, construir un mapa de referencia -> id
    for (const [localField, remoteLookupField] of Object.entries(relationKeys)) {
      // Obtener información del campo para saber a qué tabla se refiere
      const fieldDef = store.getField(localField, tableIdentifier)
      if (!fieldDef?.relationTableIdentifier) {
        console.warn(`Campo ${localField} en tabla ${tableIdentifier} no es una relación válida`)
        continue
      }

      // Obtener todos los valores únicos de referencia de los specItems
      const remoteValues = specItems
        .map(item => item[localField])
        .filter(Boolean)
        .filter((v, i, a) => a.indexOf(v) === i) // valores únicos

      if (remoteValues.length === 0) continue

      // Buscar los registros en la tabla relacionada
      const remoteRecords = await store.query(fieldDef.relationTableIdentifier, {
        [remoteLookupField]: { op: "=", v: remoteValues }
      })

      // Crear mapa: valor_de_referencia -> id_del_registro_relacionado
      const map = new Map<string, string>()
      remoteRecords.forEach(record => {
        const refValue = record[remoteLookupField]
        if (refValue) {
          map.set(String(refValue), String(record.id))
        }
      })
      
      relationMaps[localField] = map
    }
  }

  const newItems = []
  const updateItems = []

  // Procesar cada item del spec
  for (const specItem of specItems) {
    const lookupValue = specItem[lookupKey]

    // Si no tiene lookupKey, saltar
    if (!lookupValue) continue

    // Transformar relaciones antes de cualquier operación
    const processedItem = { ...specItem }
    
    // Reemplazar referencias con IDs reales
    if (relationKeys) {
      for (const [localField] of Object.entries(relationKeys)) {
        const relationMap = relationMaps[localField]
        if (relationMap && processedItem[localField]) {
          const refValue = processedItem[localField]
          const relatedId = relationMap.get(String(refValue))
          
          if (relatedId) {
            processedItem[localField] = relatedId
          } else {
            console.warn(`No se encontró registro relacionado para ${localField}=${refValue} en tabla ${tableIdentifier}`)
            // Opcional: eliminar el campo si no se encuentra la relación
            delete processedItem[localField]
          }
        }
      }
    }

    const existingItem = existingItemsMap.get(lookupValue)

    if (!existingItem) {
      // Nuevo item - insertar
      newItems.push(processedItem)
    } else {
      // Item existente - preparar update con merge
      const mergedItem = {
        ...existingItem,  // Mantener todos los campos existentes
        ...processedItem, // Sobrescribir con valores procesados del spec
        id: existingItem.id  // Asegurar que el ID del update es el existente
      }
      updateItems.push(mergedItem)
    }
  }

  // Ejecutar operaciones
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
      await upsertFromSpec("icons", iconsSeed, "name")
      await upsertFromSpec("users", usersSeed, "username")
      await upsertFromSpec("interfaces", interfacesSeed, "route")
      await wait(100);
      // Ahora las tablas con relaciones (dependen de interfaces)
      await upsertFromSpec("menu_items", menuItemsSeed, "identifier", { 
        interface_id: "route",
        parent_id: "identifier",
      })
      
      console.log("Carga inicial completada exitosamente")
    } catch (error) {
      console.error("Error en carga inicial:", error)
    } finally {
      // await wait(3000) // Para pruebas
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