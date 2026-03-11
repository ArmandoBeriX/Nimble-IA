import { SettingItemField } from "./treeUtils";
import { store } from "../../../app";

export async function reorderAndPersist(
  draggedId: string,
  targetGroupId: string,
  targetItemId: string | null,
  insertPosition: 'before' | 'after',
  currentSettings: SettingItemField[],
  findGroupNode: (groupId: string) => any
) {
  const UNGROUPED_ID = "ungrouped";

  // Convertir "ungrouped" a null para la base de datos
  const dbGroupId = targetGroupId === UNGROUPED_ID ? null : targetGroupId;

  const groupNode = findGroupNode(targetGroupId);
  let currentList: SettingItemField[] = [];

  if (groupNode) {
    currentList = [...groupNode.settings];
  } else {
    // Para el grupo "ungrouped" o grupos no encontrados
    currentList = currentSettings.filter(s => {
      const groupId = s.setting_group?.id ?? s.setting_group_id;
      if (targetGroupId === UNGROUPED_ID) {
        return !groupId || groupId === UNGROUPED_ID;
      }
      return groupId === targetGroupId;
    });
    currentList.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }

  const draggedObj = currentSettings.find(s => s.id === draggedId);
  if (!draggedObj) {
    console.warn("Dragged object not found in settings list", draggedId);
    return;
  }

  // Filtrar el elemento arrastrado de la lista actual
  const filtered = currentList.filter(s => s.id !== draggedId);
  let insertIndex = filtered.length;

  if (targetItemId) {
    const idx = filtered.findIndex(s => s.id === targetItemId);
    if (idx >= 0) {
      // Ajustar índice según insertPosition
      insertIndex = insertPosition === 'before' ? idx : idx + 1;
    } else {
      insertIndex = filtered.length;
    }
  }

  // Insertar en la nueva posición
  filtered.splice(insertIndex, 0, draggedObj);

  // Calcular actualizaciones necesarias
  const updates: Array<{ id: string; position: number; setting_group_id?: string | null }> = [];

  for (let i = 0; i < filtered.length; i++) {
    const s = filtered[i];
    const newPos = i;
    const currentGroupId = s.setting_group?.id ?? s.setting_group_id ?? null;

    // Solo actualizar si cambió la posición o el grupo
    const positionChanged = (s.position ?? -1) !== newPos;
    const groupChanged = currentGroupId !== dbGroupId;

    if (positionChanged || groupChanged) {
      updates.push({
        id: s.id!,
        position: newPos,
        setting_group_id: dbGroupId,
      });
    }
  }

  if (updates.length === 0) return;

  try {
    // Actualizar todos los settings afectados en una sola operación
    await store.update('settings', updates, 'id');
  } catch (err) {
    console.error("Error persisting reorder updates", err);
    throw err;
  }
}

// Función auxiliar para determinar si insertar antes o después
export function calculateInsertPosition(
  draggableY: number,
  droppableRect: DOMRect,
  threshold: number = 0.5
): 'before' | 'after' {
  const droppableCenterY = droppableRect.top + droppableRect.height * threshold;
  return draggableY > droppableCenterY ? 'after' : 'before';
}