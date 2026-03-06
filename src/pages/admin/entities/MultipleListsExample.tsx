// MultipleListsWithSignals.tsx
import {
  DragDropProvider,
  DragDropSensors,
  DragOverlay,
  SortableProvider,
  createSortable,
  createDroppable,
  closestCenter,
  type Draggable,
  type Droppable,
  type DragEvent,
  type CollisionDetector,
} from "@thisbeyond/solid-dnd";
import { batch, createMemo, createSignal, For, onCleanup } from "solid-js";
import { useRecordQuery } from '../../../hooks/useRecords';
import { MenuItem } from "../../../constants/table-defs";
import { FilterInput } from "../../../types/schema";
import { store } from "../../../app";

type Item = {
  id: string;
  name: string;
  position?: number;
  parent_id?: string | null;
};

type Container = {
  id: string;
  name: string;
  items: Item[];
};

// Nuevo tipo para manejar drop zones
type DropZone = {
  id: string;
  type: 'top' | 'center' | 'bottom';
  itemId?: string;
};

const SortableItem = (props: { 
  item: Item; 
  dropZones: DropZone[];
  onDropZoneHover?: (zone: DropZone | null) => void;
}) => {
  const sortable = createSortable(props.item.id);
  
  // Crear drop zones para este ítem
  const topZone = createDroppable(`${props.item.id}_top`);
  const centerZone = createDroppable(`${props.item.id}_center`);
  const bottomZone = createDroppable(`${props.item.id}_bottom`);
  
  return (
    <div class="relative">
      {/* Zona superior - para colocar antes del ítem */}
      <div
        use:topZone
        class="absolute top-0 left-0 right-0 h-3 bg-blue-100 opacity-0 hover:opacity-30 transition-opacity pointer-events-none"
        onMouseEnter={() => props.onDropZoneHover?.({ id: `${props.item.id}_top`, type: 'top', itemId: props.item.id })}
        onMouseLeave={() => props.onDropZoneHover?.(null)}
      />
      
      {/* Zona central - para hacer hijo */}
      <div
        use:centerZone
        class="absolute top-3 left-0 right-0 h-8 bg-green-100 opacity-0 hover:opacity-30 transition-opacity pointer-events-none"
        onMouseEnter={() => props.onDropZoneHover?.({ id: `${props.item.id}_center`, type: 'center', itemId: props.item.id })}
        onMouseLeave={() => props.onDropZoneHover?.(null)}
      />
      
      {/* Zona inferior - para colocar después del ítem */}
      <div
        use:bottomZone
        class="absolute bottom-0 left-0 right-0 h-3 bg-blue-100 opacity-0 hover:opacity-30 transition-opacity pointer-events-none"
        onMouseEnter={() => props.onDropZoneHover?.({ id: `${props.item.id}_bottom`, type: 'bottom', itemId: props.item.id })}
        onMouseLeave={() => props.onDropZoneHover?.(null)}
      />
      
      <div
        use:sortable
        class="flex items-center gap-3 bg-white rounded-md p-2 shadow-sm hover:shadow-md mt-3 mb-3"
        classList={{ 
          "opacity-50": sortable.isActiveDraggable,
          "border-2 border-green-500": props.dropZones.some(z => z.itemId === props.item.id && z.type === 'center'),
          "border-2 border-blue-500": props.dropZones.some(z => z.itemId === props.item.id && (z.type === 'top' || z.type === 'bottom')),
        }}
      >
        <div
          class="w-6 h-6 flex items-center justify-center rounded-sm bg-gray-200 text-gray-600 cursor-grab"
          data-sortable-handle
          aria-hidden
        >
          ☰
        </div>
        <div class="flex-1 text-sm text-gray-800">{props.item.name}</div>
      </div>
    </div>
  );
};

const Column = (props: { 
  container: Container;
  dropZones: DropZone[];
  onDropZoneHover?: (zone: DropZone | null) => void;
}) => {
  const droppable = createDroppable(props.container.id);
  
  return (
    <div
      use:droppable
      class="flex flex-col gap-3 bg-gray-50 rounded-lg p-4 w-80 min-h-[200px] shadow-inner"
      classList={{
        "border-2 border-dashed border-blue-400": props.dropZones.some(z => z.id === props.container.id),
      }}
    >
      <div class="font-semibold text-gray-700 mb-2">{props.container.name}</div>
      <SortableProvider ids={props.container.items.map((i) => i.id)}>
        <div class="flex flex-col gap-2">
          <For each={props.container.items}>
            {(item) => (
              <SortableItem 
                item={item} 
                dropZones={props.dropZones}
                onDropZoneHover={props.onDropZoneHover}
              />
            )}
          </For>
        </div>
      </SortableProvider>
      <div class="mt-auto text-xs text-gray-400">Arrastra aquí para añadir</div>
    </div>
  );
};

export default function MultipleListsWithSignals() {
  const { data: allMenuItems, loading, error, refresh } = useRecordQuery<MenuItem>(
    "menu_items",
    {},
    { order: [['position', 'ASC']] },
    { interface_id: {} }
  );
  
  const [searchFilters, setSearchFilters] = createSignal<FilterInput>({});
  const { data: searchedMenuItems } = useRecordQuery<MenuItem>(
    "menu_items",
    searchFilters,
  );

  const [expandedMap, setExpandedMap] = createSignal<Record<string, boolean>>({});
  const [hoveredDropZone, setHoveredDropZone] = createSignal<DropZone | null>(null);
  const [activeDropZones, setActiveDropZones] = createSignal<DropZone[]>([]);

  const menuHierarchy = createMemo(() => {
    const items = allMenuItems || [];
    const mapIds = new Map((searchedMenuItems || []).map(m => [m.id, true]));
    const itemsByParent = new Map<string | null, MenuItem[]>();

    items.forEach(item => {
      const parentId = item.parent_id || null;
      if (!itemsByParent.has(parentId)) {
        itemsByParent.set(parentId, []);
      }
      itemsByParent.get(parentId)!.push(item);
    });

    const buildTree = (parentId: string | null, level = 0): MenuItem[] => {
      const children = itemsByParent.get(parentId) || [];
      return children
        .sort((a, b) => (a.position || 0) - (b.position || 0))
        .map(child => ({
          ...child,
          level,
          hidden: !mapIds.has(child.id),
          children: buildTree(child.id!, level + 1),
        }));
    };

    return buildTree(null);
  });

  // Crear contenedores dinámicamente desde menuHierarchy
  const containers = createMemo<Container[]>(() => {
    const hierarchy = menuHierarchy();
    
    // Contenedor para items raíz (parent_id = null)
    const rootItems = hierarchy
      .filter(item => !item.hidden)
      .map(item => ({
        id: item.id!,
        name: item.name,
        position: item.position,
        parent_id: item.parent_id
      }));

    // Crear contenedores para cada ítem que tiene hijos
    const parentContainers = hierarchy
      .filter(item => item.children && item.children.length > 0)
      .map(parent => {
        const children = parent.children!
          .filter((child: MenuItem) => !child.hidden)
          .map((child: MenuItem) => ({
            id: child.id!,
            name: child.name,
            position: child.position,
            parent_id: child.parent_id
          }));

        return {
          id: `parent_${parent.id}`,
          name: `Hijos de ${parent.name}`,
          items: children
        };
      });

    return [
      {
        id: "root",
        name: "Items Principales",
        items: rootItems
      },
      ...parentContainers
    ];
  });

  const containerIds = () => containers().map((c) => c.id);

  const findContainerByItemId = (itemId: string) =>
    containers().find((c) => c.items.some((it) => it.id === itemId));

  const closestContainerOrItem: CollisionDetector = (
    draggable: Draggable,
    droppables: Droppable[],
    context
  ): Droppable | null => {
    // Si hay una zona activa hovered, priorizarla
    const hovered = hoveredDropZone();
    if (hovered && droppables.some(d => d.id === hovered.id)) {
      const droppable = droppables.find(d => d.id === hovered.id);
      if (droppable) return droppable;
    }

    // Lógica original para detectar contenedores
    const droppableContainers = droppables.filter((d) =>
      containerIds().includes(d.id as string)
    );

    const closestContainer = closestCenter(draggable, droppableContainers, context);
    if (!closestContainer) return null;

    const container = containers().find((c) => c.id === (closestContainer.id as string));
    if (!container) return closestContainer;

    // Buscar ítems dentro del contenedor (incluyendo sus zonas)
    const droppableItems = droppables.filter((d) => {
      const droppableId = d.id as string;
      // Verificar si es una zona de un ítem
      if (droppableId.includes('_')) {
        const [itemId] = droppableId.split('_');
        return container.items.some((it) => it.id === itemId);
      }
      // Verificar si es el ítem mismo
      return container.items.some((it) => it.id === droppableId);
    });

    const closestItem = closestCenter(draggable, droppableItems, context);

    return closestItem || closestContainer;
  };

  const move = async (draggable: Draggable, droppable: Droppable, onlyWhenChangingContainer = true) => {
    const dragId = draggable.id as string;
    const droppableId = droppable.id as string;

    // Determinar el tipo de drop basado en el ID
    let dropType: 'top' | 'center' | 'bottom' | 'container' = 'container';
    let targetItemId: string | undefined;
    let targetContainerId: string;

    if (droppableId.includes('_')) {
      // Es una zona de un ítem
      const [itemId, type] = droppableId.split('_');
      targetItemId = itemId;
      dropType = type as 'top' | 'center' | 'bottom';
    }

    const fromContainer = findContainerByItemId(dragId);
    
    if (dropType === 'container') {
      // Drop en un contenedor
      targetContainerId = droppableId;
    } else {
      // Drop en una zona de un ítem
      const targetItemContainer = findContainerByItemId(targetItemId!);
      if (!targetItemContainer) return;
      targetContainerId = targetItemContainer.id;
    }

    const toContainer = containers().find((c) => c.id === targetContainerId);
    if (!fromContainer || !toContainer) return;

    const fromId = fromContainer.id;
    const toId = toContainer.id;

    // Encontrar el ítem que se está moviendo
    const movedItem = fromContainer.items.find((it) => it.id === dragId);
    if (!movedItem) return;

    // Calcular nueva posición y parent_id según el tipo de drop
    let newPosition = 0;
    let newParentId: string | null = null;

    if (dropType === 'container') {
      // Drop en contenedor vacío
      newPosition = toContainer.items.length;
      if (toId === "root") {
        newParentId = null;
      } else if (toId.startsWith("parent_")) {
        newParentId = toId.replace('parent_', '');
      }
    } else {
      // Drop en una zona de un ítem
      const targetItem = toContainer.items.find(it => it.id === targetItemId);
      if (!targetItem) return;

      const targetIndex = toContainer.items.findIndex(it => it.id === targetItemId);
      
      switch (dropType) {
        case 'top':
          // Colocar antes del ítem objetivo
          newPosition = targetIndex;
          newParentId = targetItem.parent_id || (toId === "root" ? null : toId.replace('parent_', ''));
          break;
        case 'center':
          // Hacer hijo del ítem objetivo
          newParentId = targetItemId!;
          // Mover al contenedor de hijos del ítem objetivo
          const parentContainer = containers().find(c => c.id === `parent_${targetItemId}`);
          newPosition = parentContainer ? parentContainer.items.length : 0;
          targetContainerId = `parent_${targetItemId}`;
          break;
        case 'bottom':
          // Colocar después del ítem objetivo
          newPosition = targetIndex + 1;
          newParentId = targetItem.parent_id || (toId === "root" ? null : toId.replace('parent_', ''));
          break;
      }
    }

    // Actualizar el ítem arrastrado
    await store.update('menu_items', [{
      id: dragId,
      parent_id: newParentId,
      position: newPosition,
    }], 'id');

    // Actualizar posiciones de los demás items en el contenedor destino
    const finalContainer = containers().find(c => c.id === targetContainerId);
    if (finalContainer) {
      const itemsToUpdate = finalContainer.items
        .filter(item => item.id !== dragId)
        .map((item, index) => ({
          id: item.id,
          position: index >= newPosition ? index + 1 : index
        }));

      if (itemsToUpdate.length > 0) {
        await store.update('menu_items', itemsToUpdate, 'id');
      }
    }

    // Refrescar los datos
    refresh();
  };

  const onDragOver = (event: DragEvent) => {
    const { draggable, droppable } = event;
    if (draggable && droppable) {
      // Actualizar zonas activas visualmente
      const dropZoneId = droppable.id as string;
      const activeZones: DropZone[] = [];
      
      if (dropZoneId.includes('_')) {
        const [itemId, type] = dropZoneId.split('_');
        activeZones.push({ id: dropZoneId, type: type as 'top' | 'center' | 'bottom', itemId });
      } else {
        activeZones.push({ id: dropZoneId, type: 'center' });
      }
      
      setActiveDropZones(activeZones);
    }
  };

  const onDragEnd = async (event: DragEvent) => {
    const { draggable, droppable } = event;
    
    // Limpiar zonas activas
    setActiveDropZones([]);
    setHoveredDropZone(null);
    
    if (draggable && droppable) {
      await move(draggable, droppable, false);
    }
  };

  const onDragStart = () => {
    setActiveDropZones([]);
  };

  // Función para añadir nuevo ítem (ejemplo)
  const addNewItem = async (containerId: string) => {
    const container = containers().find(c => c.id === containerId);
    if (!container) return;

    const newItem = {
      name: `Nuevo Item ${Date.now().toString().slice(-3)}`,
      parent_id: containerId === "root" ? null : containerId.replace('parent_', ''),
      position: container.items.length
    };

    await store.update('menu_items', [newItem], 'id');
    refresh();
  };

  return (
    <div class="p-6">
      <DragDropProvider
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        collisionDetector={closestContainerOrItem}
      >
        <DragDropSensors />
        <div class="flex gap-6">
          <For each={containers()}>
            {(container) => (
              <Column 
                container={container} 
                dropZones={activeDropZones()}
                onDropZoneHover={setHoveredDropZone}
              />
            )}
          </For>
        </div>

        <DragOverlay>
          {(draggable) => (
            // <>{draggable?.node.cloneNode()}</>
            <div class="bg-white p-2 rounded-md shadow-lg text-sm">
              {JSON.stringify(draggable?.id)}
            </div>
          )}
        </DragOverlay>
      </DragDropProvider>

      <div class="mt-6 space-y-4">
        <div class="text-sm text-gray-600">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-4 h-4 bg-green-100"></div>
            <span>Zona central - Hacer hijo del ítem</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="w-4 h-4 bg-blue-100"></div>
            <span>Zonas superior/inferior - Colocar antes/después del ítem</span>
          </div>
        </div>
        
        <div class="text-sm text-gray-600">Funciones de ejemplo:</div>
        <div class="flex gap-2">
          <button
            class="px-3 py-1 bg-blue-600 text-white rounded"
            onClick={() => addNewItem("root")}
          >
            Añadir item a Root
          </button>
          <button
            class="px-3 py-1 bg-green-600 text-white rounded"
            onClick={() => refresh()}
          >
            Refrescar Datos
          </button>
        </div>
      </div>
    </div>
  );
}