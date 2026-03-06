import { createSignal, For, Show, createEffect, createMemo, onCleanup } from 'solid-js';
import { createStore } from 'solid-js/store';
import { store } from '../../../app';
import { TableDef, TableField } from '../../../types/schema';
import EntityNode from './EntityNode';
import EntityRelation from './EntityRelation';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/ui/icon/Icon';
import { DEFAULT_FIELDS } from '../../../lib/db';
import { useRecordQuery } from '../../../hooks/useRecords';
import RecordButtonAction from '../../../components/record/RecordButtonAction';
import { toast } from '../../../lib/toast';
import WithTooltip from '../../../components/ui/tooltip/Tooltip';

const DRAG_THRESHOLD = 4; // píxeles mínimos para considerar que es un drag real

interface HoveredRelation {
  fromId: string;
  toId: string;
  x: number;
  y: number;
  label: string;
}

export default function SchemaPage() {
  const { data: dbTables, loading, error } = useRecordQuery<TableDef>(
    'table_defs',
    {},
    { order: [['position', 'ASC']] },
    {
      tableFields: {
        foreignKey: 'tableIdentifier',
        tableSource: 'table_fields',
        options: { order: [['position', 'ASC']] }
      }
    }
  );

  const [tables, setTables] = createStore<{ items: TableDef[] }>({ items: [] });
  const [nodeWidths, setNodeWidths] = createStore<Record<string, number>>({});
  const [fieldPositions, setFieldPositions] = createStore<Record<string, number[]>>({});
  const [hoveredRelation, setHoveredRelation] = createSignal<HoveredRelation | null>(null);

  const [draggedTable, setDraggedTable] = createSignal<string | null>(null);
  const [zoom, setZoom] = createSignal(1);
  const [pan, setPan] = createSignal({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = createSignal(false);
  const [isDraggingEntity, setIsDraggingEntity] = createSignal(false);
  const [panStart, setPanStart] = createSignal({ x: 0, y: 0 });
  const [dragEntityId, setDragEntityId] = createSignal<string | null>(null);
  const [dragStartPos, setDragStartPos] = createSignal({ x: 0, y: 0 });
  const [showMoreMenu, setShowMoreMenu] = createSignal(false);

  // Estado "pendiente": mousedown ocurrió pero aún no hay movimiento suficiente
  let pendingEntityId: string | null = null;
  let pendingPan = false;
  let pendingStartX = 0;
  let pendingStartY = 0;

  const [searchTerm, setSearchTerm] = createSignal('');
  const [searchResults, setSearchResults] = createSignal<string[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = createSignal(-1);
  const [highlightedTableId, setHighlightedTableId] = createSignal<string | null>(null);

  let searchTimeout: ReturnType<typeof setTimeout> | undefined;
  let highlightTimeout: ReturnType<typeof setTimeout> | undefined;
  let canvasRef: HTMLDivElement | undefined;

  createEffect(() => {
    setTables('items', dbTables || []);
  });

  createEffect(() => {
    const term = searchTerm();
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => performSearch(term), 250);
    return () => clearTimeout(searchTimeout);
  });

  const performSearch = (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      setCurrentSearchIndex(-1);
      return;
    }
    const lowerTerm = term.toLowerCase();
    const results = tables.items
      .filter(t =>
        t.name.toLowerCase().includes(lowerTerm) ||
        (t.namePlural && t.namePlural.toLowerCase().includes(lowerTerm))
      )
      .map(t => t.id);
    setSearchResults(results);
    setCurrentSearchIndex(results.length > 0 ? 0 : -1);
    if (results.length > 0) goToTable(results[0]);
  };

  const goToTable = (tableId: string) => {
    const table = tables.items.find(t => t.id === tableId || t.identifier === tableId);
    if (!table || !canvasRef) return;

    clearTimeout(highlightTimeout);
    setHighlightedTableId(table.id);
    highlightTimeout = setTimeout(() => setHighlightedTableId(null), 1200);

    const rect = canvasRef.getBoundingClientRect();
    setPan({
      x: rect.width / 2 - (table.posx || 0) * zoom(),
      y: rect.height / 4 - (table.posy || 0) * zoom(),
    });
  };

  const goToPrevResult = () => {
    const results = searchResults();
    if (!results.length) return;
    const newIndex = (currentSearchIndex() - 1 + results.length) % results.length;
    setCurrentSearchIndex(newIndex);
    goToTable(results[newIndex]);
  };

  const goToNextResult = () => {
    const results = searchResults();
    if (!results.length) return;
    const newIndex = (currentSearchIndex() + 1) % results.length;
    setCurrentSearchIndex(newIndex);
    goToTable(results[newIndex]);
  };

  const handleZoomIn = () => setZoom(Math.min(zoom() * 1.2, 3));
  const handleZoomOut = () => setZoom(Math.max(zoom() / 1.2, 0.3));
  const handleZoomReset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

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
    setZoom(newZoom);
    setPan({ x: mouseX - worldX * newZoom, y: mouseY - worldY * newZoom });
  };

  const getEntityFromTarget = (target: EventTarget | null): string | null => {
    if (!target || !(target instanceof Element)) return null;
    return target.closest('[data-entity-id]')?.getAttribute('data-entity-id') || null;
  };

  const handleMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    const entityId = getEntityFromTarget(e.target);

    // Solo guardamos estado pendiente — NO activamos drag/pan todavía
    pendingStartX = e.clientX;
    pendingStartY = e.clientY;

    if (entityId) {
      pendingEntityId = entityId;
      pendingPan = false;
    } else {
      pendingEntityId = null;
      pendingPan = true;
      // Preparamos panStart por si acaso se activa después
      setPanStart({ x: e.clientX - pan().x, y: e.clientY - pan().y });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    const dx = e.clientX - pendingStartX;
    const dy = e.clientY - pendingStartY;
    const moved = Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD;

    // Activar panning si hay movimiento suficiente
    if (pendingPan && !isPanning() && moved) {
      setIsPanning(true);
    }

    // Activar drag de entidad si hay movimiento suficiente
    if (pendingEntityId && !isDraggingEntity() && moved) {
      setIsDraggingEntity(true);
      setDragEntityId(pendingEntityId);
      setDragStartPos({ x: e.clientX, y: e.clientY });
      setDraggedTable(pendingEntityId);
    }

    if (isPanning()) {
      setPan({ x: e.clientX - panStart().x, y: e.clientY - panStart().y });
    } else if (isDraggingEntity() && dragEntityId()) {
      const deltaX = (e.clientX - dragStartPos().x) / zoom();
      const deltaY = (e.clientY - dragStartPos().y) / zoom();
      setDragStartPos({ x: e.clientX, y: e.clientY });
      const t = tables.items.find(t => t.id === dragEntityId())!;
      const idx = tables.items.indexOf(t);
      setTables('items', idx, {
        posx: (t.posx || 0) + deltaX,
        posy: (t.posy || 0) + deltaY,
      });
    }
  };

  const handleMouseUp = async () => {
    // Limpiar pendientes
    pendingEntityId = null;
    pendingPan = false;

    if (isDraggingEntity() && dragEntityId()) {
      const tableId = dragEntityId();
      const table = tables.items.find(t => t.id === tableId)!;
      const dbTable = await store.query('table_defs', { id: tableId }).then(res => res[0]);
      if (table && (Math.abs(table.posx! - dbTable.posx) > 0.5 || Math.abs(table.posy! - dbTable.posy) > 0.5)) {
        await store.update('table_defs', {
          id: table.id,
          posx: Math.round(table.posx!),
          posy: Math.round(table.posy!),
        });
      }
    }

    setIsPanning(false);
    setIsDraggingEntity(false);
    setDraggedTable(null);
    setDragEntityId(null);
  };

  // Touch
  const handleTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      const t = e.touches[0];
      pendingStartX = t.clientX;
      pendingStartY = t.clientY;
      const entityId = getEntityFromTarget(t.target);
      if (entityId) {
        pendingEntityId = entityId;
        pendingPan = false;
      } else {
        pendingEntityId = null;
        pendingPan = true;
        setPanStart({ x: t.clientX - pan().x, y: t.clientY - pan().y });
      }
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    const dx = t.clientX - pendingStartX;
    const dy = t.clientY - pendingStartY;
    const moved = Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD;

    if (pendingPan && !isPanning() && moved) setIsPanning(true);
    if (pendingEntityId && !isDraggingEntity() && moved) {
      setIsDraggingEntity(true);
      setDragEntityId(pendingEntityId);
      setDragStartPos({ x: t.clientX, y: t.clientY });
      setDraggedTable(pendingEntityId);
    }

    if (isPanning()) {
      setPan({ x: t.clientX - panStart().x, y: t.clientY - panStart().y });
    } else if (isDraggingEntity() && dragEntityId()) {
      const deltaX = (t.clientX - dragStartPos().x) / zoom();
      const deltaY = (t.clientY - dragStartPos().y) / zoom();
      setDragStartPos({ x: t.clientX, y: t.clientY });
      const tbl = tables.items.find(tb => tb.id === dragEntityId())!;
      const idx = tables.items.indexOf(tbl);
      setTables('items', idx, {
        posx: (tbl.posx || 0) + deltaX,
        posy: (tbl.posy || 0) + deltaY,
      });
    }
  };

  const handleTouchEnd = (e: TouchEvent) => { e.preventDefault(); handleMouseUp(); };

  const handleChangeSchema = async () => {
    try {
      const [freshTables, freshFields] = await Promise.all([
        store.query<TableDef>('table_defs', {}, { order: [['position', 'ASC']] }),
        store.query<TableField>('table_fields', {})
      ]);
      const fieldsByTable = new Map<string, TableField[]>();
      freshFields.forEach((field: TableField) => {
        const list = fieldsByTable.get(field.tableIdentifier) || [];
        list.push(field);
        fieldsByTable.set(field.tableIdentifier, list);
      });
      const tablesWithFields = freshTables.map((table: TableDef) => ({
        ...table,
        tableFields: fieldsByTable.get(table.identifier) || []
      }));
      await store.dbManager.migrateSchema(tablesWithFields);
    } catch (err) {
      console.error('Error al migrar el esquema:', err);
    }
  };

  const handleAutoLayout = async () => {
    const list = tables.items;
    const cols = Math.ceil(Math.sqrt(list.length));
    const spacing = 350;
    await store.update('table_defs', list.map((table, i) => ({
      id: table.id,
      posx: (i % cols) * spacing + 50 + Math.floor(i / cols) * 15,
      posy: Math.floor(i / cols) * spacing + 50,
    })));
  };

  const handleRepairDatabase = async () => {
    if (!confirm('Esto eliminará la base de datos local (IndexedDB) y recargará la página. ¿Deseas continuar?')) return;
    const dbName = store.db?.name || 'NimbleAI';
    try { store.db?.close?.(); } catch (e) { console.warn(e); }
    try {
      localStorage.removeItem(`nimbleai_schema_${dbName}`);
      localStorage.removeItem(`nimbleai_schema_version_${dbName}`);
      localStorage.removeItem(`nimbleai_initialized_${dbName}`);
    } catch (e) { console.warn(e); }

    const deleted = await new Promise<boolean>((resolve) => {
      try {
        const req = indexedDB.deleteDatabase(dbName);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
        req.onblocked = () => resolve(false);
      } catch { resolve(false); }
    });

    if (deleted) {
      toast.success('BD reparada. Recargando...');
      setTimeout(() => window.location.reload(), 200);
    } else {
      toast.error('No se pudo reparar automáticamente la BD. Cierra otras pestañas y reintenta.');
    }
  };

  const visibleFields = (table: TableDef) =>
    (table.tableFields || []).filter(f => !DEFAULT_FIELDS.includes(f.identifier));

  const getRelations = () => {
    const relations: Array<{
      from: TableDef;
      to: TableDef;
      fromFieldIndex: number;
      isMultiple: boolean;
      label: string;
    }> = [];

    tables.items.forEach(table => {
      const visible = visibleFields(table);
      visible.forEach((field, idx) => {
        if (field.identifier === 'authorId') return;
        if (field.fieldFormat === 'relation' && field.relationTableIdentifier) {
          const targetTable = tables.items.find(t => t.identifier === field.relationTableIdentifier);
          if (targetTable) {
            const label = field.multiple
              ? `${table.name} tiene muchos ${field.name} (${targetTable.namePlural || targetTable.name})`
              : `${table.name} tiene ${field.name} (${targetTable.name})`;
            relations.push({
              from: table,
              to: targetTable,
              fromFieldIndex: idx,
              isMultiple: !!field.multiple,
              label,
            });
          }
        }
      });
    });

    return relations;
  };

  return (
    <div class="h-[calc(100vh-4rem)] flex flex-col bg-gray-50">
      {/* Barra de herramientas */}
      <div class="bg-white border-b border-gray-200 px-3 py-2 flex items-center justify-between shadow-sm">
        <div class="flex items-center gap-2">
          <Icon name="project" class="w-5 h-5 text-blue-600" />
          <h1 class="text-lg font-bold text-gray-900">Esquema</h1>
          <span class="text-xs text-gray-500">
            ({tables.items.length} {tables.items.length === 1 ? 'entidad' : 'entidades'})
          </span>
        </div>

        {/* Buscador */}
        <div class="flex-1 flex justify-center px-4">
          <div class="relative w-full max-w-md">
            <Icon name="search" class="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar entidad por nombre..."
              class="w-full pl-8 pr-16 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm()}
              onInput={(e) => setSearchTerm(e.currentTarget.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); goToNextResult(); } }}
            />
            <div class="absolute right-1 top-1/2 transform -translate-y-1/2 flex items-center gap-1 bg-gray-50 rounded-md px-1">
              <Show when={searchTerm()}>
                <WithTooltip tooltip="Limpiar búsqueda">
                  <Button variant="light" size="xs" onClick={() => { setSearchTerm(''); setSearchResults([]); setCurrentSearchIndex(0); }}>
                    <Icon name="x" size={14} />
                  </Button>
                </WithTooltip>
              </Show>
              <Show when={searchResults().length > 0 || searchTerm()}>
                <span class="text-xs text-gray-600 min-w-[3rem] text-center">
                  {currentSearchIndex() + 1}/{searchResults().length}
                </span>
                <Button variant="light" size="xs" onClick={goToPrevResult} class="p-0.5!" disabled={searchResults().length === 0}>
                  <Icon name="angle-left" size={14} />
                </Button>
                <Button variant="light" size="xs" onClick={goToNextResult} class="p-0.5!" disabled={searchResults().length === 0}>
                  <Icon name="angle-right" size={14} />
                </Button>
              </Show>
            </div>
          </div>
        </div>

        {/* Controles */}
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

          <RecordButtonAction
            tableIdentifier="table_defs"
            action="create"
            modalProps={{ onConfirm: handleChangeSchema }}
            buttonProps={{ variant: 'outline' }}
            initialValues={() => {
              let centerX = 100, centerY = 100;
              if (canvasRef) {
                const rect = canvasRef.getBoundingClientRect();
                centerX = (rect.width / 2 - pan().x) / zoom();
                centerY = (rect.height / 2 - pan().y) / zoom();
              }
              return { posx: centerX, posy: centerY };
            }}
          />

          <div class="relative">
            <Button variant="light" size="sm" class="px-2 py-1.5" onClick={() => setShowMoreMenu(!showMoreMenu())}>
              <Icon name="3-bullets" size={18} class="text-gray-700" />
            </Button>
            <Show when={showMoreMenu()}>
              <div class="absolute right-0 top-[calc(100%+0.5rem)] z-20 w-40 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
                <Button variant="light" size="sm" class="w-full justify-start mb-1" onClick={handleRepairDatabase}>
                  Reparar BD
                </Button>
                <Button variant="light" size="sm" class="w-full justify-start" onClick={() => setShowMoreMenu(false)}>
                  Botón B
                </Button>
              </div>
            </Show>
          </div>
        </div>
      </div>

      {/* Canvas */}
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
          cursor: (isPanning() || isDraggingEntity()) ? 'grabbing' : 'grab',
          'background-image': 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
          'background-size': '20px 20px',
        }}
      >
        {/* Mundo transformado */}
        <div
          class="absolute inset-0"
          style={{
            transform: `translate(${pan().x}px, ${pan().y}px) scale(${zoom()})`,
            'transform-origin': '0 0',
            // La transición se desactiva SOLO cuando ya está dragging/panning activo,
            // no en el mousedown — así goToTable siempre anima suavemente
            transition: (isPanning() || isDraggingEntity()) ? 'none' : 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
        >
          {/* SVG relaciones */}
          <svg
            class="absolute inset-0"
            style={{ width: '100%', height: '100%', overflow: 'visible', 'pointer-events': 'none' }}
          >
            <g style={{ 'pointer-events': 'all' }}>
              <For each={getRelations()}>
                {(relation) => (
                  <EntityRelation
                    from={relation.from}
                    to={relation.to}
                    fromFieldIndex={relation.fromFieldIndex}
                    isMultiple={relation.isMultiple}
                    fromWidth={nodeWidths[relation.from.id] || 240}
                    toWidth={nodeWidths[relation.to.id] || 240}
                    fromFieldPositions={fieldPositions[relation.from.id] || []}
                    isHovered={
                      hoveredRelation()?.fromId === relation.from.id &&
                      hoveredRelation()?.toId === relation.to.id
                    }
                    onNavigateToRelation={goToTable}
                    onHoverStart={(x, y) =>
                      setHoveredRelation({
                        fromId: relation.from.id,
                        toId: relation.to.id,
                        x,
                        y,
                        label: relation.label,
                      })
                    }
                    onHoverEnd={() => setHoveredRelation(null)}
                  />
                )}
              </For>
            </g>
          </svg>

          {/* Nodos */}
          <For each={tables.items}>
            {(table) => {
              let nodeRef: HTMLDivElement | undefined;
              const tableFields = createMemo(() => visibleFields(table));

              createEffect(() => {
                if (!nodeRef) return;
                const observer = new ResizeObserver(([entry]) => {
                  setNodeWidths(table.id, entry.contentRect.width);
                });
                observer.observe(nodeRef);
                onCleanup(() => observer.disconnect());
              });

              const isRelationHighlighted = createMemo(() => {
                const h = hoveredRelation();
                return !!h && (h.fromId === table.id || h.toId === table.id);
              });

              return (
                <div ref={nodeRef} data-entity-id={table.id} style={{ display: 'contents' }}>
                  <EntityNode
                    table={table}
                    fields={tableFields()}
                    onChange={() => handleChangeSchema()}
                    onNavigateToRelation={goToTable}
                    onFieldPositionsChange={(positions) => setFieldPositions(table.id, positions)}
                    isDragging={draggedTable() === table.id}
                    isHighlighted={highlightedTableId() === table.id}
                    isRelationHighlighted={isRelationHighlighted()}
                    isSearchResult={searchResults().includes(table.id)}
                    isCurrentSearchResult={searchResults()[currentSearchIndex()] === table.id}
                  />
                </div>
              );
            }}
          </For>
        </div>

        {/* Tooltip de relación — fuera del div transformado */}
        <Show when={hoveredRelation()}>
          {(rel) => {
            const canvasRect = canvasRef?.getBoundingClientRect();
            if (!canvasRect) return null;
            const x = rel().x - canvasRect.left;
            const y = rel().y - canvasRect.top;
            return (
              <div
                class="absolute z-50 pointer-events-none"
                style={{ left: `${x}px`, top: `${y - 44}px`, transform: 'translateX(-50%)' }}
              >
                <div class="rounded-md bg-gray-900 px-3 py-1.5 text-sm text-gray-100 shadow-lg whitespace-nowrap">
                  {rel().label}
                </div>
                <div
                  class="mx-auto w-0 h-0"
                  style={{
                    'border-left': '5px solid transparent',
                    'border-right': '5px solid transparent',
                    'border-top': '5px solid #111827',
                    width: 'fit-content',
                  }}
                />
              </div>
            );
          }}
        </Show>

        {/* Sin entidades */}
        <Show when={tables.items.length === 0}>
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div class="text-center bg-white/80 p-6 rounded-lg shadow-sm pointer-events-auto">
              {loading() ? (
                <div class="flex flex-col items-center gap-3">
                  <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
                  <span class="text-sm text-gray-600">{loading()}</span>
                </div>
              ) : (
                <>
                  <Icon name="folder" class="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h3 class="text-base font-medium text-gray-700 mb-1">No hay entidades</h3>
                </>
              )}
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
}
