import { createSignal, For, Show, onMount, createEffect, createMemo } from 'solid-js';
import { store } from '../../../app';
import { TableDef } from '../../../types/schema';
import EntityNode from './EntityNode';
import EntityRelation from './EntityRelation';
import EntityFormModal from './EntityFormModal';
import FieldFormModal from './FieldFormModal';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/ui/icon/Icon';
import { toast } from '../../../lib/toast';
import { DEFAULT_FIELDS } from '../../../lib/db';

export default function SchemaPage() {
  const [tables, setTables] = createSignal<TableDef[]>([]);
  const [selectedTable, setSelectedTable] = createSignal<TableDef | null>(null);
  const [draggedTable, setDraggedTable] = createSignal<string | null>(null);
  const [showEntityModal, setShowEntityModal] = createSignal(false);
  const [showFieldModal, setShowFieldModal] = createSignal(false);
  const [editingTable, setEditingTable] = createSignal<TableDef | null>(null);
  const [editingField, setEditingField] = createSignal<any | null>(null);
  const [zoom, setZoom] = createSignal(1);
  const [pan, setPan] = createSignal({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = createSignal(false);
  const [isDraggingEntity, setIsDraggingEntity] = createSignal(false);
  const [panStart, setPanStart] = createSignal({ x: 0, y: 0 });
  const [dragEntityId, setDragEntityId] = createSignal<string | null>(null);
  const [dragStartPos, setDragStartPos] = createSignal({ x: 0, y: 0 });

  // Estados para búsqueda
  const [searchTerm, setSearchTerm] = createSignal('');
  const [searchResults, setSearchResults] = createSignal<string[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = createSignal(-1);
  let searchTimeout: NodeJS.Timeout | undefined;

  let canvasRef: HTMLDivElement | undefined;

  // Cargar tablas desde el store reactivo
  createEffect(() => {
    const allTables = store.tableDefs() || [];
    setTables(allTables);
  });

  // Efecto de búsqueda con debounce
  createEffect(() => {
    const term = searchTerm();
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      performSearch(term);
    }, 250);
    return () => clearTimeout(searchTimeout);
  });

  // Función de búsqueda
  const performSearch = (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      setCurrentSearchIndex(-1);
      return;
    }
    const lowerTerm = term.toLowerCase();
    const results = tables()
      .filter(t => 
        t.name.toLowerCase().includes(lowerTerm) || 
        (t.namePlural && t.namePlural.toLowerCase().includes(lowerTerm))
      )
      .map(t => t.id);
    setSearchResults(results);
    setCurrentSearchIndex(results.length > 0 ? 0 : -1);
    if (results.length > 0) {
      goToTable(results[0]);
    }
  };

  // Centrar vista en una tabla
  const goToTable = (tableId: string) => {
    const table = tables().find(t => t.id === tableId ||  t.identifier === tableId);
    if (!table || !canvasRef) return;
    
    const rect = canvasRef.getBoundingClientRect();
    // Calcular nuevo pan para centrar la entidad
    const newPanX = rect.width / 2 - (table.posx || 0) * zoom();
    const newPanY = rect.height / 2 - (table.posy || 0) * zoom();
    
    setPan({ x: newPanX, y: newPanY });
  };

  // Navegación entre resultados
  const goToPrevResult = () => {
    const results = searchResults();
    if (results.length === 0) return;
    const newIndex = (currentSearchIndex() - 1 + results.length) % results.length;
    setCurrentSearchIndex(newIndex);
    goToTable(results[newIndex]);
  };

  const goToNextResult = () => {
    const results = searchResults();
    if (results.length === 0) return;
    const newIndex = (currentSearchIndex() + 1) % results.length;
    setCurrentSearchIndex(newIndex);
    goToTable(results[newIndex]);
  };

  // Funciones de zoom (sin cambios)
  const handleZoomIn = () => setZoom(Math.min(zoom() * 1.2, 3));
  const handleZoomOut = () => setZoom(Math.max(zoom() / 1.2, 0.3));
  const handleZoomReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Zoom con rueda del ratón (sin cambios)
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (!canvasRef) return;
    const rect = canvasRef.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldX = (mouseX - pan().x) / zoom();
    const worldY = (mouseY - pan().y) / zoom();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(Math.max(zoom() * delta, 0.3), 3);
    const newPan = {
      x: mouseX - worldX * newZoom,
      y: mouseY - worldY * newZoom
    };
    setZoom(newZoom);
    setPan(newPan);
  };

  // Manejo de arrastre (sin cambios)
  const getEntityFromTarget = (target: EventTarget | null): string | null => {
    if (!target || !(target instanceof Element)) return null;
    const entityEl = target.closest('[data-entity-id]');
    return entityEl?.getAttribute('data-entity-id') || null;
  };

  const handleDragStart = (clientX: number, clientY: number, target: EventTarget | null) => {
    const entityId = getEntityFromTarget(target);
    if (entityId) {
      setIsDraggingEntity(true);
      setDragEntityId(entityId);
      setDragStartPos({ x: clientX, y: clientY });
      setDraggedTable(entityId);
    } else {
      setIsPanning(true);
      setPanStart({ x: clientX - pan().x, y: clientY - pan().y });
    }
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (isPanning()) {
      setPan({
        x: clientX - panStart().x,
        y: clientY - panStart().y
      });
    } else if (isDraggingEntity() && dragEntityId()) {
      const deltaX = (clientX - dragStartPos().x) / zoom();
      const deltaY = (clientY - dragStartPos().y) / zoom();
      setDragStartPos({ x: clientX, y: clientY });
      setTables(prev => prev.map(t => {
        if (t.id === dragEntityId()) {
          return {
            ...t,
            posx: (t.posx || 0) + deltaX,
            posy: (t.posy || 0) + deltaY
          };
        }
        return t;
      }));
    }
  };

  const handleDragEnd = async () => {
    if (isDraggingEntity() && dragEntityId()) {
      const tableId = dragEntityId();
      const table = tables().find(t => t.id === tableId);
      if (table) {
        try {
          const allTables = store.tableDefs().map(t => 
            t.id === tableId ? { ...t, posx: table.posx, posy: table.posy } : t
          );
          await store.db.table('meta').put({
            k: 'schema',
            version: (await store.db.table('meta').get('schema'))?.version || 1,
            tableDefs: allTables,
            tableFields: store.tableFields(),
            savedAt: new Date().toISOString()
          });
        } catch (error) {
          console.error('Error guardando posición:', error);
        }
      }
    }
    setIsPanning(false);
    setIsDraggingEntity(false);
    setDraggedTable(null);
    setDragEntityId(null);
  };

  // Eventos de ratón (sin cambios)
  const handleMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX, e.clientY, e.target);
  };

  const handleMouseMove = (e: MouseEvent) => {
    handleDragMove(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    handleDragEnd();
  };

  // Eventos táctiles (sin cambios)
  const handleTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      handleDragStart(touch.clientX, touch.clientY, touch.target);
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1 && (isPanning() || isDraggingEntity())) {
      const touch = e.touches[0];
      handleDragMove(touch.clientX, touch.clientY);
    }
  };

  const handleTouchEnd = (e: TouchEvent) => {
    e.preventDefault();
    handleDragEnd();
  };

  // CRUD de entidades (sin cambios)
  const handleCreateEntity = () => {
    setEditingTable(null);
    setShowEntityModal(true);
  };

  const handleEditEntity = (table: TableDef) => {
    setEditingTable(table);
    setShowEntityModal(true);
  };

  const handleDeleteEntity = async (tableId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta entidad? Esta acción no se puede deshacer.')) {
      return;
    }
    try {
      const currentTables = store.tableDefs() || [];
      const updatedTables = currentTables.filter(t => t.id !== tableId);
      const currentFields = store.tableFields() || [];
      const table = currentTables.find(t => t.id === tableId);
      const updatedFields = table 
        ? currentFields.filter(f => f.tableIdentifier !== table.identifier)
        : currentFields;
      await store.db.table('meta').put({
        k: 'schema',
        version: (await store.db.table('meta').get('schema'))?.version || 1,
        tableDefs: updatedTables,
        tableFields: updatedFields,
        savedAt: new Date().toISOString()
      });
      toast.success('Entidad eliminada correctamente');
    } catch (error) {
      console.error('Error eliminando entidad:', error);
      toast.error('Error al eliminar la entidad');
    }
  };

  const handleSaveEntity = async (tableData: Partial<TableDef>) => {
    try {
      const allTables = store.tableDefs() || [];
      let updatedTables: TableDef[];
      if (editingTable()) {
        updatedTables = allTables.map(t => 
          t.id === editingTable()!.id ? { ...t, ...tableData } : t
        );
        toast.success('Entidad actualizada correctamente');
      } else {
        const newTable: TableDef = {
          id: `table_${Date.now()}`,
          name: tableData.name || '',
          namePlural: tableData.namePlural || '',
          identifier: tableData.identifier || '',
          icon: tableData.icon,
          description: tableData.description,
          tableFields: [],
          posx: 100,
          posy: 100,
          formatSelection: tableData.formatSelection,
          formatSelected: tableData.formatSelected,
        };
        updatedTables = [...allTables, newTable];
        toast.success('Entidad creada correctamente');
      }
      await store.db.table('meta').put({
        k: 'schema',
        version: (await store.db.table('meta').get('schema'))?.version || 1,
        tableDefs: updatedTables,
        tableFields: store.tableFields(),
        savedAt: new Date().toISOString()
      });
      setShowEntityModal(false);
      setEditingTable(null);
    } catch (error) {
      console.error('Error guardando entidad:', error);
      toast.error('Error al guardar la entidad');
    }
  };

  // Gestión de campos (sin cambios)
  const handleAddField = (table: TableDef) => {
    setSelectedTable(table);
    setEditingField(null);
    setShowFieldModal(true);
  };

  const handleEditField = (table: TableDef, field: any) => {
    setSelectedTable(table);
    setEditingField(field);
    setShowFieldModal(true);
  };

  const handleDeleteField = async (table: TableDef, fieldId: string) => {
    if (!confirm('¿Estás seguro de eliminar este campo? Esta acción no se puede deshacer.')) {
      return;
    }
    try {
      const allFields = store.tableFields().filter(f => f.id !== fieldId);
      await store.db.table('meta').put({
        k: 'schema',
        version: (await store.db.table('meta').get('schema'))?.version || 1,
        tableDefs: store.tableDefs(),
        tableFields: allFields,
        savedAt: new Date().toISOString()
      });
      toast.success('Campo eliminado correctamente');
    } catch (error) {
      console.error('Error eliminando campo:', error);
      toast.error('Error al eliminar el campo');
    }
  };

  const handleSaveField = async (fieldData: any) => {
    if (!selectedTable()) return;
    try {
      const table = selectedTable()!;
      let allFields = store.tableFields();
      if (editingField()) {
        allFields = allFields.map(f => 
          f.id === editingField().id 
            ? { ...f, ...fieldData, updatedAt: new Date().toISOString() }
            : f
        );
        toast.success('Campo actualizado correctamente');
      } else {
        const currentFields = store.getTableFieldsFor(table.identifier);
        const newField = {
          id: `field_${Date.now()}`,
          tableIdentifier: table.identifier,
          ...fieldData,
          position: currentFields.length,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        allFields = [...allFields, newField];
        toast.success('Campo agregado correctamente');
      }
      await store.db.table('meta').put({
        k: 'schema',
        version: (await store.db.table('meta').get('schema'))?.version || 1,
        tableDefs: store.tableDefs(),
        tableFields: allFields,
        savedAt: new Date().toISOString()
      });
      setShowFieldModal(false);
      setSelectedTable(null);
      setEditingField(null);
    } catch (error) {
      console.error('Error guardando campo:', error);
      toast.error('Error al guardar el campo');
    }
  };

  // Auto-layout (sin cambios)
  const handleAutoLayout = async () => {
    const tablesList = tables();
    const cols = Math.ceil(Math.sqrt(tablesList.length));
    const spacing = 350;
    const updatedTables = tablesList.map((table, index) => ({
      ...table,
      posx: (index % cols) * spacing + 50 + Math.floor(index / cols)*15,
      posy: Math.floor(index / cols) * spacing + 50
    }));
    setTables(updatedTables);
    try {
      await store.db.table('meta').put({
        k: 'schema',
        version: (await store.db.table('meta').get('schema'))?.version || 1,
        tableDefs: updatedTables,
        tableFields: store.tableFields(),
        savedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error guardando layout:', error);
    }
  };

  // Calcular relaciones entre tablas (ignorando authorID)
  const getRelations = () => {
    const relations: Array<{
      from: TableDef;
      to: TableDef;
      fieldName: string;
    }> = [];

    tables().forEach(table => {
      const fields = store.getTableFieldsFor(table.identifier);
      fields.forEach(field => {
        // Ignorar campos con identifier 'authorID'
        if (field.identifier === 'authorId') return;
        
        if (field.fieldFormat === 'relation' && field.relationTableIdentifier) {
          const targetTable = tables().find(
            t => t.identifier === field.relationTableIdentifier
          );
          if (targetTable) {
            relations.push({
              from: table,
              to: targetTable,
              fieldName: field.name
            });
          }
        }
      });
    });

    return relations;
  };

  return (
    <div class="h-[calc(100vh-4rem)] flex flex-col bg-gray-50">
      {/* Barra de herramientas con buscador */}
      <div class="bg-white border-b border-gray-200 px-3 py-2 flex items-center justify-between shadow-sm">
        <div class="flex items-center gap-2">
          <Icon name="project" class="w-5 h-5 text-blue-600" />
          <h1 class="text-lg font-bold text-gray-900">Esquema</h1>
          <span class="text-xs text-gray-500">
            ({tables().length} {tables().length === 1 ? 'entidad' : 'entidades'})
          </span>
        </div>

        {/* Buscador con contador y navegación */}
        <div class="flex-1 flex justify-center px-4">
          <div class="relative w-full max-w-md">
            <Icon name="search" class="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar entidad por nombre..."
              class="w-full pl-8 pr-12 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm()}
              onInput={(e) => setSearchTerm(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  goToNextResult();
                }
              }}
            />
            <Show when={searchResults().length > 0 || searchTerm()}>
              <div class="absolute right-1 top-1/2 transform -translate-y-1/2 flex items-center gap-1 bg-gray-50 rounded-md px-1">
                <span class="text-xs text-gray-600 min-w-[3rem] text-center">
                  {currentSearchIndex() + 1}/{searchResults().length}
                </span>
                <Button
                  variant="light"
                  size="xs"
                  onClick={goToPrevResult}
                  class="p-0.5!"
                  disabled={searchResults().length === 0}
                >
                  <Icon name="angle-left" size={14} />
                </Button>
                <Button
                  variant="light"
                  size="xs"
                  onClick={goToNextResult}
                  class="p-0.5!"
                  disabled={searchResults().length === 0}
                >
                  <Icon name="angle-right" size={14} />
                </Button>
              </div>
            </Show>
          </div>
        </div>

        {/* Controles de zoom y acciones */}
        <div class="flex items-center gap-1">
          <div class="flex items-center gap-1 border-r border-gray-200 pr-2 mr-2">
            <Button variant="light" size="sm" onClick={handleZoomOut} class="p-1.5">
              <Icon name="zoom-out" size={18} class="text-red-600" />
            </Button>
            <span class="text-xs font-medium text-gray-700 min-w-[3rem] text-center">
              {Math.round(zoom() * 100)}%
            </span>
            <Button variant="light" size="sm" onClick={handleZoomIn} class="p-1.5">
              <Icon name="zoom-in" size={18} class="text-green-600" />
            </Button>
            <Button variant="light" size="sm" onClick={handleZoomReset} class="p-1.5">
              <Icon name="reload" size={18} class="text-indigo-600" />
            </Button>
          </div>

          <Button variant="light" size="sm" onClick={handleAutoLayout} class="p-1.5">
            <Icon name="workflows" size={18} class="text-cyan-600" />
            <span class="hidden lg:inline ml-1">Auto</span>
          </Button>

          <Button variant="primary" size="sm" onClick={handleCreateEntity} class="px-2 py-1.5 text-sm">
            <Icon name="add" size={18} class="text-white" />
            <span class="hidden sm:inline ml-1">Nueva</span>
          </Button>
        </div>
      </div>

      {/* Canvas del diagrama */}
      <div
        ref={canvasRef}
        class="flex-1 overflow-hidden relative bg-gray-100 touch-none select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onWheel={handleWheel}
        style={{ 
          cursor: isPanning() ? 'grabbing' : (isDraggingEntity() ? 'grabbing' : 'grab'),
          'background-image': 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
          'background-size': '20px 20px'
        }}
      >
        <div
          class="absolute inset-0"
          style={{
            transform: `translate(${pan().x}px, ${pan().y}px) scale(${zoom()})`,
            'transform-origin': '0 0',
            transition: (isPanning() || isDraggingEntity()) ? 'none' : 'transform 0.1s ease-out'
          }}
        >
          {/* SVG para las relaciones */}
          <svg
            class="absolute inset-0 pointer-events-none"
            style={{
              width: '100%',
              height: '100%',
              overflow: 'visible'
            }}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3, 0 6"
                  fill="#6B7280"
                />
              </marker>
            </defs>
            <For each={getRelations()}>
              {(relation) => (
                <EntityRelation
                  from={relation.from}
                  to={relation.to}
                  fieldName={relation.fieldName}
                />
              )}
            </For>
          </svg>

          {/* Nodos de entidades */}
          <For each={tables()}>
            {(table) => {
              const tableFields = createMemo(() => 
                store.getTableFieldsFor(table.identifier).filter(field => !DEFAULT_FIELDS.includes(field.identifier))
              );
              
              return (
                <div data-entity-id={table.id} style={{ display: 'contents' }}>
                  <EntityNode
                    table={table}
                    fields={tableFields()}
                    onEdit={() => handleEditEntity(table)}
                    onDelete={() => handleDeleteEntity(table.id)}
                    onAddField={() => handleAddField(table)}
                    onEditField={(field) => handleEditField(table, field)}
                    onDeleteField={(fieldId) => handleDeleteField(table, fieldId)}
                    onNavigateToRelation={goToTable}
                    isDragging={draggedTable() === table.id}
                    isSearchResult={searchResults().includes(table.id)}
                    isCurrentSearchResult={searchResults()[currentSearchIndex()] === table.id}
                  />
                </div>
              );
            }}
          </For>
        </div>

        {/* Mensaje cuando no hay entidades */}
        <Show when={tables().length === 0}>
          {console.log(tables()) + ''}
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div class="text-center bg-white/80 p-6 rounded-lg shadow-sm pointer-events-auto">
              <Icon name="folder" class="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 class="text-base font-medium text-gray-700 mb-1">
                No hay entidades
              </h3>
              <p class="text-sm text-gray-500 mb-3">
                Comienza creando tu primera entidad
              </p>
              <Button onClick={handleCreateEntity} size="sm">
                <Icon name="add" size={16} />
                Crear Primera
              </Button>
            </div>
          </div>
        </Show>
      </div>

      {/* Modales (sin cambios) */}
      <Show when={showEntityModal()}>
        <EntityFormModal
          table={editingTable()}
          onSave={handleSaveEntity}
          onClose={() => {
            setShowEntityModal(false);
            setEditingTable(null);
          }}
        />
      </Show>

      <Show when={showFieldModal()}>
        <FieldFormModal
          table={selectedTable()!}
          field={editingField()}
          onSave={handleSaveField}
          onClose={() => {
            setShowFieldModal(false);
            setSelectedTable(null);
            setEditingField(null);
          }}
        />
      </Show>
    </div>
  );
}