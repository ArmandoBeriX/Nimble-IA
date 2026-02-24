// src/components/RecordModal/RecordModal.tsx
import { createSignal, createEffect, onMount, Show, For, createMemo, JSX } from 'solid-js';
import { modalStore } from '../../lib/modal-store';
import { TableField, FieldFormat, TableRecord } from '../../types/schema';
import { useModal } from '../../hooks/useModal';
import { store } from '../../app';
import FieldInput, { createFieldController } from '../fields/FieldEdit';
import { DEFAULT_FIELDS } from '../../lib/db';

interface RecordModalProps {
  tableIdentifier: string;
  id?: string | string[]; // Si es string, edición simple; si es string[], edición múltiple; si no hay, inserción
  onSave?: (savedIds: string[]) => void;
  onClose?: () => void;
  setTitle?: (text: string | JSX.Element) => void;
  setFooter?: (text: JSX.Element) => void;
}

export function RecordModal(props: RecordModalProps) {
  const modals = useModal();
  const [records, setRecords] = createSignal<TableRecord[]>([]);
  const [isLoading, setIsLoading] = createSignal(false);
  const [isSaving, setIsSaving] = createSignal(false);
  const [currentRecordIndex, setCurrentRecordIndex] = createSignal(0);

  // Obtener campos de la tabla
  const tableFields = createMemo(() => {
    return store.getTableFieldsFor(props.tableIdentifier).filter(field =>
      field.isEditable !== false &&
      field.isVisible !== false &&
      !DEFAULT_FIELDS.includes(field.identifier)
    );
  });

  // Determinar el modo de operación
  const mode = createMemo(() => {
    if (!props.id) return 'insert';
    if (Array.isArray(props.id) && props.id.length > 1) return 'edit-multiple';
    return 'edit-single';
  });

  // Título del modal basado en el modo
  const modalTitle = createMemo(() => {
    const table = store.getTable(props.tableIdentifier);
    const tableName = table?.name || props.tableIdentifier;

    switch (mode()) {
      case 'insert':
        return `Agregar nuevo registro a ${tableName}`;
      case 'edit-single':
        return `Editar registro de ${tableName}`;
      case 'edit-multiple':
        return `Editando ${props.id?.length || 0} registros de ${tableName}`;
      default:
        return tableName;
    }
  });

  // Actualizar título cuando cambie
  createEffect(() => {
    if (props.setTitle) {
      props.setTitle(modalTitle());
    }
  });

  // Crear un registro vacío con valores por defecto
  const createEmptyRecord = (): TableRecord => {
    const record: TableRecord = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      syncStatus: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Aplicar valores por defecto de los campos
    tableFields().forEach(field => {
      if (field.default !== null && field.default !== undefined) {
        record[field.identifier] = field.default;
      }
    });

    return record;
  };

  // Cargar datos existentes para edición
  createEffect(async () => {
    if (mode().startsWith('edit')) {
      setIsLoading(true);
      try {
        const ids = Array.isArray(props.id) ? props.id : [props.id!];
        const existingRecords = await store.query(props.tableIdentifier, { id: ids });

        if (existingRecords.length === 0) {
          console.warn('No se encontraron registros con los IDs proporcionados');
          props.onClose?.();
          return;
        }

        setRecords(existingRecords);
      } catch (error) {
        console.error('Error cargando registros:', error);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Modo inserción: crear un registro vacío
      setRecords([createEmptyRecord()]);
    }
  });

  // Manejar cambios en los campos
  const handleFieldChange = (fieldIdentifier: string, value: any, recordIndex: number = 0) => {
    setRecords(prev => {
      const newRecords = [...prev];
      newRecords[recordIndex] = {
        ...newRecords[recordIndex],
        [fieldIdentifier]: value,
        updatedAt: new Date().toISOString()
      };
      return newRecords;
    });
  };

  // Guardar registros
  const handleSave = async () => {
    setIsSaving(true);
    try {
      let savedIds: string[] = [];

      if (mode() === 'insert') {
        savedIds = await store.insert(props.tableIdentifier, records());
      } else {
        await store.update(props.tableIdentifier, records());
        savedIds = records().map(r => r.id!).filter(Boolean);
      }

      // Mostrar toast de éxito
      if (typeof window !== 'undefined' && (window as any).toast) {
        const count = savedIds.length;
        (window as any).toast.success(
          mode() === 'insert'
            ? `Registro${count > 1 ? 's' : ''} creado${count > 1 ? 's' : ''} exitosamente`
            : `Registro${count > 1 ? 's' : ''} actualizado${count > 1 ? 's' : ''} exitosamente`
        );
      }

      props.onSave?.(savedIds);
      props.onClose?.();

    } catch (error) {
      console.error('Error guardando registros:', error);
      if (typeof window !== 'undefined' && (window as any).toast) {
        (window as any).toast.error('Error al guardar los registros');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Actualizar footer cuando cambie el estado
  createEffect(() => {
    if (props.setFooter) {
      props.setFooter(
        <>
          <div class="record-modal-footer-info">
            <Show when={mode() === 'insert' && records().length > 1}>
              {records().length} registros listos para crear
            </Show>
          </div>
          <div class="record-modal-footer-actions">
            <button
              class="btn btn-secondary"
              onClick={props.onClose}
              disabled={isSaving()}
            >
              Cancelar
            </button>
            <button
              class="btn btn-primary"
              onClick={handleSave}
              disabled={isSaving() || isLoading()}
            >
              <Show when={isSaving()} fallback={
                <Show when={mode() === 'insert'} fallback="Guardar cambios">
                  <Show when={records().length > 1} fallback="Crear registro">
                    Crear {records().length} registros
                  </Show>
                </Show>
              }>
                Guardando...
              </Show>
            </button>
          </div>
        </>
      );
    }
  });

  // Agregar otro registro (solo en modo inserción múltiple)
  const addAnotherRecord = () => {
    setRecords(prev => [...prev, createEmptyRecord()]);
    setCurrentRecordIndex(records().length);
  };

  // Eliminar registro de la lista (solo en modo inserción múltiple)
  const removeRecord = (index: number) => {
    if (records().length <= 1) return;

    setRecords(prev => prev.filter((_, i) => i !== index));
    if (currentRecordIndex() >= index) {
      setCurrentRecordIndex(Math.max(0, currentRecordIndex() - 1));
    }
  };

  // Navegación entre registros (solo en modo múltiple)
  const goToRecord = (index: number) => {
    setCurrentRecordIndex(index);
  };

  return (
    // Contenedor simple sin estilos de altura/scroll
    <div class="record-modal">
      <Show when={!isLoading()} fallback={
        <div class="record-modal-loading">
          <div class="loading-text">Cargando...</div>
        </div>
      }>
        {/* Navegación para múltiples registros */}
        <Show when={mode() === 'edit-multiple' || (mode() === 'insert' && records().length > 1)}>
          <div class="record-modal-navigation">
            <div class="record-modal-navigation-buttons">
              <For each={records()}>
                {(_, index) => (
                  <button
                    type="button"
                    class={`record-modal-nav-button ${currentRecordIndex() === index() ? 'record-modal-nav-button-active' : ''}`}
                    onClick={() => goToRecord(index())}
                    disabled={isSaving()}
                  >
                    {index() + 1}
                  </button>
                )}
              </For>
              <Show when={mode() === 'insert'}>
                <button
                  type="button"
                  class="record-modal-add-button"
                  onClick={addAnotherRecord}
                  disabled={isSaving()}
                >
                  + Agregar
                </button>
              </Show>
            </div>
          </div>
        </Show>

        {/* Contenido principal SIN contenedores de scroll */}
        <div class="record-modal-content">
          {/* Indicador de registro actual */}
          <Show when={mode() === 'edit-multiple' || (mode() === 'insert' && records().length > 1)}>
            <div class="record-modal-current-indicator">
              <div class="record-modal-current-indicator-content">
                <span class="record-modal-current-text">
                  Editando registro {currentRecordIndex() + 1} de {records().length}
                </span>
                <Show when={mode() === 'insert' && records().length > 1}>
                  <button
                    type="button"
                    class="record-modal-remove-button"
                    onClick={() => removeRecord(currentRecordIndex())}
                    disabled={isSaving()}
                  >
                    Eliminar este registro
                  </button>
                </Show>
              </div>
            </div>
          </Show>

          {/* Formulario */}
          <div class="record-modal-fields grid grid-cols-1 md:grid-cols-2 gap-4">
            <For each={tableFields()}>
              {(field) => (
                <FieldInput
                  field={field}
                  record={records()[currentRecordIndex()]}
                  controller={createFieldController()}
                  onChange={(value: any) => handleFieldChange(field.identifier, value, currentRecordIndex())}
                />
              )}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
}

// Hook para usar el RecordModal (sin cambios)
export function useRecordModal() {
  const modals = useModal();

  const openRecordModal = (props: RecordModalProps & { onSave?: (savedIds: string[]) => void }) => {
    const [title, setTitle] = createSignal<string | JSX.Element>('');
    const [footer, setFooter] = createSignal<JSX.Element>();

    const modalId = modals.openModal({
      title: title,
      footer: footer,
      size: 'lg',
      children: () => (
        <RecordModal
          tableIdentifier={props.tableIdentifier}
          id={props.id}
          onSave={props.onSave}
          onClose={() => modals.closeModal(modalId)}
          setTitle={setTitle}
          setFooter={setFooter}
        />
      )
    });

    return modalId;
  };

  return { openRecordModal };
}