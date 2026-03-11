import { Component, createSignal, createMemo, For, Show, onMount, onCleanup, Accessor, Setter } from "solid-js";
import { TableField, FilterInput } from "../../types/schema";
import Icon from "../../components/ui/icon/Icon";
import Button from "../../components/ui/Button";
import WithTooltip from "../ui/tooltip/WithTooltip";
import FilterSelectorButton from "../utils/FilterSelector"; // Cambiado el import

import {
  DragDropProvider,
  DragDropSensors,
  DragOverlay,
  SortableProvider,
  createSortable,
  createDroppable,
  closestCenter,
  transformStyle,
  type DragEvent as DndDragEvent,
} from "@thisbeyond/solid-dnd";

// Tipos para los elementos del formulario
export type FormElementType = 'field' | 'box' | 'divider';

export interface BaseFormElement {
  id: string;
  type: FormElementType;
  width: string; // Clases de Tailwind para el ancho
}

export interface FieldElement extends BaseFormElement {
  type: 'field';
  field: TableField;
  filters?: FilterInput;
}

export interface BoxElement extends BaseFormElement {
  type: 'box';
  name?: string;
  children: FormElement[];
}

export interface DividerElement extends BaseFormElement {
  type: 'divider';
  thickness?: 'thin' | 'medium' | 'thick';
}

export type FormElement = FieldElement | BoxElement | DividerElement;

// Props del componente principal
interface FormVisualizerProps {
  tableIdentifier: string;
  initialElements?: FormElement[];
  onElementsChange?: (elements: FormElement[]) => void;
  availableFields: TableField[];
  showAvailableFields?: boolean;
}

// Sistema de columnas responsivas simplificado
const widthOptions = [
  { value: 'w-full', label: 'Completo (1 columna)' },
  { value: 'w-full md:w-1/2', label: '1/2 (2 columnas en tablet)' },
  { value: 'w-full md:w-1/3', label: '1/3 (3 columnas en laptop)' },
  { value: 'w-full md:w-1/4', label: '1/4 (4 columnas en desktop)' },
];

// Componente para visualizar un elemento de campo
const FieldElementView: Component<{
  element: FieldElement;
  onRemove: () => void;
  onUpdate: (updates: Partial<FieldElement>) => void;
  tableIdentifier: string;
  filters: Accessor<FilterInput>;
  setFilters: Setter<FilterInput>;
  isSelected: boolean;
  onSelect: () => void;
  isActiveDraggable?: boolean;
  isInsideBox?: boolean;
}> = (props) => {
  const sortable = createSortable(`element-${props.element.id}`);

  // Manejar clic para selección
  const handleClick = (e: MouseEvent) => {
    if (!(e.target as HTMLElement).closest('button, select, input')) {
      props.onSelect();
    }
  };

  return (
    <div
      ref={sortable.ref}
      style={transformStyle(sortable.transform)}
      onClick={handleClick}
      class={`
        ${props.element.width}
        ${props.isInsideBox ? 'h-full' : ''}
        ${sortable.isActiveDraggable ? 'opacity-30 scale-95' : ''}
        ${sortable.isActiveDroppable ? 'border-indigo-400 bg-indigo-50' : ''}
      `}
    >
      <div class={`
        relative p-4 rounded-lg border-2 transition-all duration-200 h-full
        ${props.isSelected ? 'border-blue-400 bg-blue-50 shadow-sm ring-2 ring-blue-200 ring-offset-1' : 'border-gray-200 bg-white hover:border-gray-300'}
      `}>
        {/* Handle de arrastre */}
        <div
          class="absolute left-2 top-2 cursor-grab active:cursor-grabbing z-10"
          {...sortable.dragActivators}
        >
          <Icon name="drag" class="w-4 h-4 text-gray-400 hover:text-gray-600" />
        </div>

        {/* Botón para eliminar */}
        <div class="absolute right-2 top-2">
          <WithTooltip tooltip="Eliminar campo (o presiona Delete)">
            <Button
              variant="ghost"
              size="xs"
              onClick={props.onRemove}
              class="p-1 h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <Icon name="trash" class="w-3 h-3" />
            </Button>
          </WithTooltip>
        </div>

        {/* Contenido del campo */}
        <div class="ml-6">
          <div class="flex items-center justify-between mb-2">
            <div class="flex-1">
              <div class="font-medium text-gray-900 text-sm">
                {props.element.field.name}
              </div>
              {props.element.field.description && (
                <div class="text-xs text-gray-500 mt-1">
                  {props.element.field.description}
                </div>
              )}
            </div>
            <div class="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
              {props.element.field.fieldFormat || 'text'}
            </div>
          </div>

          {/* Controles */}
          <div class="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-200">
            {/* Selector de ancho */}
            <div class="flex-1 min-w-[10rem]">
              <label class="block text-xs font-medium text-gray-700 mb-1">
                Ancho:
              </label>
              <select
                value={props.element.width}
                onChange={(e) => props.onUpdate({ width: e.currentTarget.value })}
                class="w-full text-xs border border-gray-300 rounded px-2 py-1 bg-white"
              >
                <For each={widthOptions}>
                  {(option) => (
                    <option value={option.value}>{option.label}</option>
                  )}
                </For>
              </select>
            </div>
          </div>

          {/* Filtros */}
          <div class="mt-3 pt-3 border-t border-gray-200">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <label class="block text-xs font-medium text-gray-700">
                  Filtros:
                </label>
                <Show when={props.element.filters && Object.keys(props.element.filters).length > 0}>
                  <span class="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                    {Object.keys(props.element.filters!).length} filtro(s)
                  </span>
                </Show>
              </div>
              <FilterSelectorButton
                tableIdentifier={props.tableIdentifier}
                filters={() => props.element.filters || {}}
                setFilters={(filters) => props.onUpdate({ filters })}
                buttonProps={{
                  size: "xs",
                  variant: "outline",
                  text: "Agregar filtros",
                  showBadge: false,
                }}
              />
            </div>
            
            <Show when={props.element.filters && Object.keys(props.element.filters).length > 0}>
              <div class="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                <div class="font-medium mb-1">Filtros aplicados:</div>
                <For each={Object.entries(props.element.filters!)}>
                  {([key, value]) => (
                    <div class="flex items-center gap-1">
                      <span class="font-medium">{key}:</span>
                      <span class="text-gray-700">{JSON.stringify(value)}</span>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente para visualizar un Box
const BoxElementView: Component<{
  element: BoxElement;
  onRemove: () => void;
  onUpdate: (updates: Partial<BoxElement>) => void;
  childrenElements: FormElement[];
  isSelected: boolean;
  onSelect: () => void;
  isActiveDraggable?: boolean;
}> = (props) => {
  const sortable = createSortable(`element-${props.element.id}`);
  const droppable = createDroppable(`box-${props.element.id}`);

  // Estado local para el nombre del box
  const [localName, setLocalName] = createSignal(props.element.name || '');

  // Actualizar el nombre cuando cambie el elemento
  const handleNameBlur = () => {
    if (localName() !== props.element.name) {
      props.onUpdate({ name: localName() });
    }
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      (e.currentTarget as HTMLInputElement).blur();
    }
  };

  // Manejar clic para selección
  const handleClick = (e: MouseEvent) => {
    if (!(e.target as HTMLElement).closest('button, select, input')) {
      props.onSelect();
    }
  };

  return (
    <div
      ref={sortable.ref}
      style={transformStyle(sortable.transform)}
      onClick={handleClick}
      class={`${props.element.width} ${sortable.isActiveDraggable ? 'opacity-30' : ''}`}
    >
      <div
        ref={droppable.ref}
        class={`
          p-4 rounded-lg border-2 transition-all duration-200
          ${props.isSelected ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-200 ring-offset-1' : 'border-gray-200 bg-white'}
          ${droppable.isActiveDroppable ? 'border-dashed border-blue-400 bg-blue-50/50' : ''}
        `}
      >
        {/* Header con handle y controles */}
        <Show when={props.element.name || localName()}>
          <div class="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
            <div class="flex items-center gap-2 flex-1">
              {/* Handle de arrastre */}
              <div
                class="cursor-grab active:cursor-grabbing z-10"
                {...sortable.dragActivators}
              >
                <Icon name="drag" class="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </div>

              {/* Nombre del Box */}
              <input
                type="text"
                value={localName()}
                onInput={(e) => setLocalName(e.currentTarget.value)}
                onBlur={handleNameBlur}
                onKeyPress={handleKeyPress}
                placeholder="Nombre del contenedor"
                class="text-sm font-medium text-gray-900 bg-transparent border-none outline-none flex-1"
              />
            </div>

            <div class="flex items-center gap-2">
              {/* Selector de ancho */}
              <select
                value={props.element.width}
                onChange={(e) => props.onUpdate({ width: e.currentTarget.value })}
                class="text-xs border border-gray-300 rounded px-2 py-1 bg-white min-w-[8rem]"
              >
                <For each={widthOptions}>
                  {(option) => (
                    <option value={option.value}>{option.label}</option>
                  )}
                </For>
              </select>

              {/* Botón para eliminar */}
              <WithTooltip tooltip="Eliminar contenedor (o presiona Delete)">
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={props.onRemove}
                  class="p-1 h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Icon name="trash" class="w-3 h-3" />
                </Button>
              </WithTooltip>
            </div>
          </div>
        </Show>

        {/* Área para elementos dentro del Box */}
        <div class={props.element.name || localName() ? '' : 'pt-2'}>
          <Show 
            when={props.childrenElements.length > 0}
            fallback={
              <div class="text-sm text-gray-400 italic p-6 text-center border-2 border-dashed border-gray-300 rounded-lg">
                Arrastra elementos aquí
              </div>
            }
          >
            <div class="flex flex-wrap gap-4 -mx-1">
              <For each={props.childrenElements}>
                {(child, index) => {
                  const isSelected = false; // Para elementos dentro del box, no permitimos selección individual
                  
                  if (child.type === 'field') {
                    return (
                      <div class={`${child.width} px-1`}>
                        <FieldElementView
                          element={child as FieldElement}
                          onRemove={() => {}}
                          onUpdate={() => {}}
                          tableIdentifier=""
                          filters={() => ({})}
                          setFilters={() => {}}
                          isSelected={isSelected}
                          onSelect={() => {}}
                          isInsideBox={true}
                        />
                      </div>
                    );
                  } else if (child.type === 'divider') {
                    return (
                      <div class={`${child.width} px-1`}>
                        <DividerElementView
                          element={child as DividerElement}
                          onRemove={() => {}}
                          onUpdate={() => {}}
                          isSelected={isSelected}
                          onSelect={() => {}}
                        />
                      </div>
                    );
                  }
                  return null;
                }}
              </For>
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
};

// Componente para visualizar un Divider
const DividerElementView: Component<{
  element: DividerElement;
  onRemove: () => void;
  onUpdate: (updates: Partial<DividerElement>) => void;
  isSelected: boolean;
  onSelect: () => void;
  isActiveDraggable?: boolean;
}> = (props) => {
  const sortable = createSortable(`element-${props.element.id}`);

  const thicknessClasses = {
    thin: 'h-px',
    medium: 'h-0.5',
    thick: 'h-1',
  };

  // Manejar clic para selección
  const handleClick = (e: MouseEvent) => {
    if (!(e.target as HTMLElement).closest('button, select, input')) {
      props.onSelect();
    }
  };

  return (
    <div
      ref={sortable.ref}
      style={transformStyle(sortable.transform)}
      onClick={handleClick}
      class={`${props.element.width} ${sortable.isActiveDraggable ? 'opacity-30' : ''}`}
    >
      <div class={`
        p-4 rounded-lg border-2 transition-all duration-200
        ${props.isSelected ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-200 ring-offset-1' : 'border-gray-200 bg-white'}
      `}>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            {/* Handle de arrastre */}
            <div
              class="cursor-grab active:cursor-grabbing"
              {...sortable.dragActivators}
            >
              <Icon name="drag" class="w-4 h-4 text-gray-400 hover:text-gray-600" />
            </div>

            <div class="text-sm font-medium text-gray-700">Divisor</div>
          </div>

          <div class="flex items-center gap-2">
            {/* Controles del divisor */}
            <WithTooltip tooltip="Grosor">
              <select
                value={props.element.thickness || 'thin'}
                onChange={(e) => props.onUpdate({ thickness: e.currentTarget.value as any })}
                class="text-xs border border-gray-300 rounded px-2 py-1 bg-white min-w-[6rem]"
              >
                <option value="thin">Delgado</option>
                <option value="medium">Medio</option>
                <option value="thick">Grueso</option>
              </select>
            </WithTooltip>

            <WithTooltip tooltip="Ancho">
              <select
                value={props.element.width}
                onChange={(e) => props.onUpdate({ width: e.currentTarget.value })}
                class="text-xs border border-gray-300 rounded px-2 py-1 bg-white min-w-[8rem]"
              >
                <For each={widthOptions}>
                  {(option) => (
                    <option value={option.value}>{option.label}</option>
                  )}
                </For>
              </select>
            </WithTooltip>

            {/* Botón para eliminar */}
            <WithTooltip tooltip="Eliminar divisor (o presiona Delete)">
              <Button
                variant="ghost"
                size="xs"
                onClick={props.onRemove}
                class="p-1 h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Icon name="trash" class="w-3 h-3" />
              </Button>
            </WithTooltip>
          </div>
        </div>

        {/* Línea del divisor */}
        <div class="mt-2">
          <div
            class={`
              ${thicknessClasses[props.element.thickness || 'thin']}
              bg-gray-300 rounded-full
            `}
          />
        </div>
      </div>
    </div>
  );
};

// Componente principal
const FormVisualizer: Component<FormVisualizerProps> = (props) => {
  const [elements, setElements] = createSignal<FormElement[]>(props.initialElements || []);
  const [activeDraggable, setActiveDraggable] = createSignal<any>(null);
  const [selectedBoxId, setSelectedBoxId] = createSignal<string | null>(null);
  const [selectedElementId, setSelectedElementId] = createSignal<string | null>(null);
  const [filters, setFilters] = createSignal<FilterInput>({});

  // Función para generar IDs únicos
  const generateId = () => `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Obtener todos los campos insertados (incluyendo los de dentro de boxes)
  const getAllInsertedFields = createMemo(() => {
    const insertedFields: TableField[] = [];
    
    function traverse(elements: FormElement[]) {
      for (const el of elements) {
        if (el.type === 'field') {
          insertedFields.push(el.field);
        } else if (el.type === 'box') {
          traverse(el.children);
        }
      }
    }
    
    traverse(elements());
    return insertedFields;
  });

  // Obtener campos disponibles (no insertados)
  const availableFields = createMemo(() => {
    const insertedFieldIds = new Set(getAllInsertedFields().map(f => f.id));
    return props.availableFields.filter(field => !insertedFieldIds.has(field.id));
  });

  // Contar campos insertados
  const insertedFieldsCount = createMemo(() => getAllInsertedFields().length);

  // Manejar tecla Delete
  onMount(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElementId()) {
        e.preventDefault();
        removeElement(selectedElementId()!);
        setSelectedElementId(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    onCleanup(() => {
      document.removeEventListener('keydown', handleKeyDown);
    });
  });

  // Función para agregar un campo
  const addField = (field: TableField) => {
    const newElement: FieldElement = {
      id: generateId(),
      type: 'field',
      field,
      width: 'w-full md:w-1/2',
    };

    if (selectedBoxId()) {
      // Agregar al box seleccionado
      const boxId = selectedBoxId();
      setElements(prev => 
        prev.map(el => {
          if (el.id === boxId && el.type === 'box') {
            const box = { ...el } as BoxElement;
            box.children = [...box.children, newElement];
            return box;
          }
          return el;
        })
      );
    } else {
      // Agregar al nivel principal
      setElements(prev => [...prev, newElement]);
    }

    // Seleccionar el nuevo elemento
    setSelectedElementId(newElement.id);
    setSelectedBoxId(null);

    // Notificar al padre
    if (props.onElementsChange) {
      props.onElementsChange(elements());
    }
  };

  // Función para agregar un box
  const addBox = () => {
    const newElement: BoxElement = {
      id: generateId(),
      type: 'box',
      width: 'w-full',
      name: 'Nuevo Contenedor',
      children: [],
    };

    setElements(prev => [...prev, newElement]);
    setSelectedBoxId(newElement.id);
    setSelectedElementId(newElement.id);
    
    if (props.onElementsChange) {
      props.onElementsChange(elements());
    }
  };

  // Función para agregar un divisor
  const addDivider = () => {
    const newElement: DividerElement = {
      id: generateId(),
      type: 'divider',
      width: 'w-full',
      thickness: 'thin',
    };

    setElements(prev => [...prev, newElement]);
    setSelectedElementId(newElement.id);
    
    if (props.onElementsChange) {
      props.onElementsChange(elements());
    }
  };

  // Función para actualizar un elemento
  const updateElement = (id: string, updates: Partial<FormElement>) => {
    const updatedElements = updateElementInTree(elements(), id, updates);
    setElements(updatedElements);
    
    if (props.onElementsChange) {
      props.onElementsChange(updatedElements);
    }
  };

  // Función recursiva para actualizar un elemento en el árbol
  const updateElementInTree = (elements: FormElement[], id: string, updates: Partial<FormElement>): FormElement[] => {
    return elements.map(el => {
      if (el.id === id) {
        return { ...el, ...updates };
      }
      if (el.type === 'box') {
        return {
          ...el,
          children: updateElementInTree(el.children, id, updates)
        };
      }
      return el;
    });
  };

  // Función para eliminar un elemento
  const removeElement = (id: string) => {
    const updatedElements = removeElementFromTree(elements(), id);
    setElements(updatedElements);
    setSelectedElementId(null);
    
    // Si el elemento eliminado era un box seleccionado, limpiar la selección
    if (selectedBoxId() === id) {
      setSelectedBoxId(null);
    }
    
    if (props.onElementsChange) {
      props.onElementsChange(updatedElements);
    }
  };

  // Función recursiva para eliminar un elemento del árbol
  const removeElementFromTree = (elements: FormElement[], id: string): FormElement[] => {
    return elements
      .filter(el => el.id !== id)
      .map(el => {
        if (el.type === 'box') {
          return {
            ...el,
            children: removeElementFromTree(el.children, id)
          };
        }
        return el;
      });
  };

  // Eliminar todos los elementos seleccionados
  const removeSelectedElements = () => {
    if (selectedElementId()) {
      removeElement(selectedElementId()!);
    }
  };

  // Manejar selección de elemento
  const handleSelectElement = (id: string) => {
    setSelectedElementId(id);
    // Si no es un box, limpiar la selección de box
    const element = findElementById(elements(), id);
    if (element && element.type !== 'box') {
      setSelectedBoxId(null);
    } else if (element && element.type === 'box') {
      setSelectedBoxId(id);
    }
  };

  // Buscar elemento por ID
  const findElementById = (elements: FormElement[], id: string): FormElement | null => {
    for (const el of elements) {
      if (el.id === id) return el;
      if (el.type === 'box') {
        const found = findElementById(el.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // Encontrar el contenedor de un elemento y su índice
  const findElementContainer = (elements: FormElement[], id: string): { container: FormElement[], containerId: string | null, index: number } | null => {
    // Buscar en nivel principal
    const mainIndex = elements.findIndex(el => el.id === id);
    if (mainIndex !== -1) {
      return { container: elements, containerId: null, index: mainIndex };
    }
    
    // Buscar en boxes
    for (const el of elements) {
      if (el.type === 'box') {
        const childIndex = el.children.findIndex(child => child.id === id);
        if (childIndex !== -1) {
          return { container: el.children, containerId: el.id, index: childIndex };
        }
        const result = findElementContainer(el.children, id);
        if (result) return result;
      }
    }
    
    return null;
  };

  // Manejar drag & drop
  const handleDragStart = (event: DndDragEvent) => {
    setActiveDraggable(event.draggable);
  };

  const handleDragEnd = async (event: DndDragEvent) => {
    setActiveDraggable(null);
    
    const { draggable, droppable } = event;
    if (!draggable || !droppable) return;

    const draggedId = String(draggable.id).replace('element-', '');
    const droppableId = String(droppable.id);

    // Buscar el elemento arrastrado
    const draggedElement = findElementById(elements(), draggedId);
    if (!draggedElement) return;

    // Si se suelta en un box
    if (droppableId.startsWith('box-')) {
      const targetBoxId = droppableId.replace('box-', '');
      
      // Verificar que no sea el mismo box
      if (draggedElement.id === targetBoxId) return;
      
      // 1. Remover el elemento de su ubicación actual
      const elementsWithoutDragged = removeElementFromTree(elements(), draggedId);
      
      // 2. Agregar el elemento al box objetivo
      const updatedElements = addElementToBox(elementsWithoutDragged, targetBoxId, draggedElement);
      setElements(updatedElements);
      
      // 3. Actualizar selección
      setSelectedElementId(draggedId);
      setSelectedBoxId(targetBoxId);
      
      if (props.onElementsChange) {
        props.onElementsChange(updatedElements);
      }
    } else {
      // Reordenar en el mismo nivel o mover entre niveles
      const targetElementId = droppableId.replace('element-', '');
      
      // Encontrar contenedores de origen y destino
      const sourceContainer = findElementContainer(elements(), draggedId);
      const targetContainer = findElementContainer(elements(), targetElementId);
      
      if (!sourceContainer || !targetContainer) return;
      
      // Si están en el mismo contenedor, reordenar
      if (sourceContainer.containerId === targetContainer.containerId) {
        const container = [...sourceContainer.container];
        const [removed] = container.splice(sourceContainer.index, 1);
        container.splice(targetContainer.index, 0, removed);
        
        // Actualizar elementos
        if (sourceContainer.containerId === null) {
          // Nivel principal
          setElements([...container]);
        } else {
          // Dentro de un box
          const updatedElements = updateBoxChildren(elements(), sourceContainer.containerId, container);
          setElements(updatedElements);
        }
      } else {
        // Mover entre contenedores diferentes
        // 1. Remover de origen
        const elementsWithoutDragged = removeElementFromTree(elements(), draggedId);
        
        // 2. Insertar en destino
        const targetIndex = targetContainer.index;
        let updatedElements: FormElement[];
        
        if (targetContainer.containerId === null) {
          // Mover al nivel principal
          const newElements = [...targetContainer.container];
          newElements.splice(targetIndex, 0, draggedElement);
          updatedElements = newElements;
        } else {
          // Mover a otro box
          updatedElements = insertElementInBox(elementsWithoutDragged, targetContainer.containerId, draggedElement, targetIndex);
        }
        
        setElements(updatedElements);
      }
      
      if (props.onElementsChange) {
        props.onElementsChange(elements());
      }
    }
  };

  // Agregar elemento a un box
  const addElementToBox = (elements: FormElement[], boxId: string, element: FormElement): FormElement[] => {
    return elements.map(el => {
      if (el.id === boxId && el.type === 'box') {
        return {
          ...el,
          children: [...el.children, element]
        };
      }
      if (el.type === 'box') {
        return {
          ...el,
          children: addElementToBox(el.children, boxId, element)
        };
      }
      return el;
    });
  };

  // Insertar elemento en un box en una posición específica
  const insertElementInBox = (elements: FormElement[], boxId: string, element: FormElement, index: number): FormElement[] => {
    return elements.map(el => {
      if (el.id === boxId && el.type === 'box') {
        const newChildren = [...el.children];
        newChildren.splice(index, 0, element);
        return { ...el, children: newChildren };
      }
      if (el.type === 'box') {
        return { ...el, children: insertElementInBox(el.children, boxId, element, index) };
      }
      return el;
    });
  };

  // Actualizar hijos de un box
  const updateBoxChildren = (elements: FormElement[], boxId: string, children: FormElement[]): FormElement[] => {
    return elements.map(el => {
      if (el.id === boxId && el.type === 'box') {
        return { ...el, children };
      }
      if (el.type === 'box') {
        return { ...el, children: updateBoxChildren(el.children, boxId, children) };
      }
      return el;
    });
  };

  // Renderizar un elemento
  const renderElement = (element: FormElement) => {
    const isSelected = selectedElementId() === element.id;
    
    const commonProps = {
      onRemove: () => removeElement(element.id),
      onUpdate: (updates: Partial<FormElement>) => updateElement(element.id, updates),
      isSelected,
      onSelect: () => handleSelectElement(element.id),
      isActiveDraggable: activeDraggable()?.id === `element-${element.id}`,
    };

    switch (element.type) {
      case 'field':
        return (
          <div class={`${element.width} px-1`}>
            <FieldElementView
              {...commonProps}
              element={element}
              tableIdentifier={props.tableIdentifier}
              filters={filters}
              setFilters={setFilters}
            />
          </div>
        );
      
      case 'box':
        return (
          <div class={`${element.width} px-1`}>
            <BoxElementView
              {...commonProps}
              element={element}
              childrenElements={element.children}
            />
          </div>
        );
      
      case 'divider':
        return (
          <div class={`${element.width} px-1`}>
            <DividerElementView
              {...commonProps}
              element={element}
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  // Obtener IDs de todos los elementos de nivel superior para SortableProvider
  const topLevelIds = createMemo(() => 
    elements().map(el => `element-${el.id}`)
  );

  return (
    <div class="flex flex-col lg:flex-row gap-6 p-4">
      {/* Panel izquierdo: Campos disponibles */}
      <Show when={props.showAvailableFields !== false}>
        <div class="lg:w-1/4 space-y-4">
          <div class="bg-white border border-gray-200 rounded-lg p-4">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-gray-900">
                Campos Disponibles
              </h3>
              <span class="text-sm text-gray-500">
                {availableFields().length} de {props.availableFields.length}
              </span>
            </div>
            
            <div class="space-y-2 max-h-[400px] overflow-y-auto">
              <For each={availableFields()}>
                {(field) => (
                  <div
                    class="p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => addField(field)}
                  >
                    <div class="flex items-center justify-between">
                      <div>
                        <div class="font-medium text-gray-900 text-sm">
                          {field.name}
                        </div>
                        <div class="text-xs text-gray-500 mt-1">
                          {field.description || field.name}
                        </div>
                      </div>
                      <Icon name="add" class="w-4 h-4 text-gray-400" />
                    </div>
                    <div class="mt-2 text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded inline-block">
                      {field.fieldFormat || 'text'}
                    </div>
                  </div>
                )}
              </For>
              
              <Show when={availableFields().length === 0}>
                <div class="p-4 text-center text-gray-400">
                  <Icon name="check_circle" class="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p class="text-sm">Todos los campos han sido insertados</p>
                </div>
              </Show>
            </div>
          </div>

          {/* Elementos estructurales */}
          <div class="bg-white border border-gray-200 rounded-lg p-4">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">
              Elementos Estructurales
            </h3>
            
            <div class="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={addBox}
                class="flex-col gap-2 h-20"
              >
                <Icon name="square" class="w-6 h-6" />
                <span class="text-xs">Agregar Box</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={addDivider}
                class="flex-col gap-2 h-20"
              >
                <Icon name="minus" class="w-6 h-6" />
                <span class="text-xs">Agregar Divisor</span>
              </Button>
            </div>
          </div>

          {/* Box seleccionado */}
          <Show when={selectedBoxId()}>
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div class="flex items-center justify-between mb-2">
                <h4 class="font-medium text-blue-900">Box Seleccionado</h4>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setSelectedBoxId(null)}
                >
                  <Icon name="close" class="w-4 h-4" />
                </Button>
              </div>
              <p class="text-sm text-blue-700">
                Los campos se agregarán dentro del box seleccionado.
              </p>
            </div>
          </Show>

          {/* Botón para quitar elementos seleccionados */}
          <Show when={selectedElementId()}>
            <div class="bg-white border border-gray-200 rounded-lg p-4">
              <Button
                variant="danger"
                onClick={removeSelectedElements}
                class="w-full"
              >
                <Icon name="trash" class="w-4 h-4 mr-2" />
                Eliminar elemento seleccionado
              </Button>
              <p class="text-xs text-gray-500 mt-2">
                O presiona la tecla Delete/Backspace
              </p>
            </div>
          </Show>
        </div>
      </Show>

      {/* Panel derecho: Área de diseño */}
      <div class={`${props.showAvailableFields !== false ? 'lg:w-3/4' : 'w-full'}`}>
        <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h3 class="text-lg font-semibold text-gray-900">
                Vista Previa del Formulario
              </h3>
              <p class="text-sm text-gray-600 mt-1">
                Arrastra y suelta para reorganizar. Haz clic en un elemento para seleccionarlo.
              </p>
            </div>
            
            <div class="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setElements([]);
                  setSelectedElementId(null);
                  setSelectedBoxId(null);
                }}
                class="text-red-600 hover:text-red-700"
              >
                <Icon name="trash" class="w-4 h-4 mr-1" />
                Limpiar todo
              </Button>
              
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  console.log('Guardar diseño:', elements());
                  alert('Diseño guardado en consola');
                }}
              >
                <Icon name="save" class="w-4 h-4 mr-1" />
                Guardar diseño
              </Button>
            </div>
          </div>

          <DragDropProvider
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            collisionDetector={closestCenter}
          >
            <DragDropSensors />
            
            {/* SortableProvider para elementos de nivel superior */}
            <SortableProvider ids={topLevelIds()}>
              <div class="flex flex-wrap gap-4 -mx-1">
                <Show
                  when={elements().length > 0}
                  fallback={
                    <div class="w-full text-center p-12 border-2 border-dashed border-gray-300 rounded-lg">
                      <Icon name="layout" class="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p class="text-gray-500 mb-2">
                        No hay elementos en el formulario
                      </p>
                      <p class="text-sm text-gray-400">
                        Agrega campos desde el panel izquierdo o crea elementos estructurales
                      </p>
                    </div>
                  }
                >
                  <For each={elements()}>
                    {(element) => renderElement(element)}
                  </For>
                </Show>
              </div>
            </SortableProvider>

            <DragOverlay>
              <Show when={activeDraggable()}>
                <div class="bg-white border border-gray-300 rounded-lg shadow-lg p-4 opacity-90">
                  <div class="font-medium text-gray-900">
                    {activeDraggable()?.id.replace('element-', '')}
                  </div>
                </div>
              </Show>
            </DragOverlay>
          </DragDropProvider>
        </div>

        {/* Resumen del diseño */}
        <div class="mt-4 bg-white border border-gray-200 rounded-lg p-4">
          <h4 class="font-medium text-gray-900 mb-3">Resumen del Diseño</h4>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div class="p-3 bg-gray-50 rounded">
              <div class="font-medium">Campos Insertados:</div>
              <div class="text-2xl font-bold text-gray-900">
                {insertedFieldsCount()} / {props.availableFields.length}
              </div>
              <div class="text-xs text-gray-500 mt-1">
                {props.availableFields.length - insertedFieldsCount()} campos disponibles
              </div>
            </div>
            
            <div class="p-3 bg-gray-50 rounded">
              <div class="font-medium">Boxes:</div>
              <div class="text-2xl font-bold text-blue-600">
                {elements().filter(el => el.type === 'box').length}
              </div>
            </div>
            
            <div class="p-3 bg-gray-50 rounded">
              <div class="font-medium">Divisores:</div>
              <div class="text-2xl font-bold text-green-600">
                {elements().filter(el => el.type === 'divider').length}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormVisualizer;