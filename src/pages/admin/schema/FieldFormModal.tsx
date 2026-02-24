// src/pages/admin/schema/FieldFormModal.tsx
import { createSignal, Show, For } from 'solid-js';
import { TableDef, FieldFormat, FieldFormatLabels } from '../../../types/schema';
import { store } from '../../../app';
import Modal from '../../../components/modal/Modal';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/ui/icon/Icon';

interface FieldFormModalProps {
  table: TableDef;
  field?: any | null;
  onSave: (data: any) => void;
  onClose: () => void;
}

export default function FieldFormModal(props: FieldFormModalProps) {
  const [name, setName] = createSignal(props.field?.name || '');
  const [identifier, setIdentifier] = createSignal(props.field?.identifier || '');
  const [fieldFormat, setFieldFormat] = createSignal<FieldFormat>(props.field?.fieldFormat || FieldFormat.STRING);
  const [description, setDescription] = createSignal(props.field?.description || '');
  const [isRequired, setIsRequired] = createSignal(props.field?.isRequired || false);
  const [isUnique, setIsUnique] = createSignal(props.field?.isUnique || false);
  const [isSearchable, setIsSearchable] = createSignal(props.field?.isSearchable || false);
  const [isFilter, setIsFilter] = createSignal(props.field?.isFilter || false);
  const [multiple, setMultiple] = createSignal(props.field?.multiple || false);
  const [relationTableIdentifier, setRelationTableIdentifier] = createSignal(props.field?.relationTableIdentifier || '');
  const [errors, setErrors] = createSignal<Record<string, string>>({});

  // Obtener todas las tablas disponibles para relaciones
  const availableTables = () => {
    return store.tableDefs().filter(t => t.identifier !== props.table.identifier);
  };

  // Auto-generar identifier desde name
  const handleNameChange = (value: string) => {
    setName(value);
    
    const sanitized = value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    
    setIdentifier(sanitized);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!name().trim()) {
      newErrors.name = 'El nombre es requerido';
    }

    if (!identifier().trim()) {
      newErrors.identifier = 'El identificador es requerido';
    } else if (!/^[a-z][a-z0-9_]*$/.test(identifier())) {
      newErrors.identifier = 'El identificador debe comenzar con letra y solo contener letras, números y guiones bajos';
    }

    // Validar que el identifier no exista ya en esta tabla (excepto si estamos editando)
    const existingFields = store.getTableFieldsFor(props.table.identifier);
    const isDuplicate = existingFields.some(f => 
      f.identifier === identifier() && f.id !== props.field?.id
    );
    if (isDuplicate) {
      newErrors.identifier = 'Ya existe un campo con este identificador';
    }

    if (fieldFormat() === FieldFormat.RELATION && !relationTableIdentifier()) {
      newErrors.relationTableIdentifier = 'Debes seleccionar una tabla relacionada';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const data: any = {
      name: name().trim(),
      identifier: identifier().trim(),
      fieldFormat: fieldFormat(),
      description: description().trim() || undefined,
      isRequired: isRequired(),
      isUnique: isUnique(),
      isSearchable: isSearchable(),
      isFilter: isFilter(),
      multiple: multiple(),
      isVisible: true,
      isEditable: true,
    };

    if (fieldFormat() === FieldFormat.RELATION) {
      data.relationTableIdentifier = relationTableIdentifier();
    }

    props.onSave(data);
  };

  // Opciones de tipos de campo agrupadas
  const fieldTypeGroups = () => [
    {
      label: 'Texto',
      types: [
        { value: FieldFormat.STRING, label: FieldFormatLabels[FieldFormat.STRING], icon: 'text_fields' },
        { value: FieldFormat.TEXT, label: FieldFormatLabels[FieldFormat.TEXT], icon: 'notes' },
      ]
    },
    {
      label: 'Números',
      types: [
        { value: FieldFormat.INT, label: FieldFormatLabels[FieldFormat.INT], icon: 'tag' },
        { value: FieldFormat.FLOAT, label: FieldFormatLabels[FieldFormat.FLOAT], icon: 'decimal' },
      ]
    },
    {
      label: 'Fecha y Hora',
      types: [
        { value: FieldFormat.DATE, label: FieldFormatLabels[FieldFormat.DATE], icon: 'event' },
        { value: FieldFormat.TIME, label: FieldFormatLabels[FieldFormat.TIME], icon: 'schedule' },
        { value: FieldFormat.DATETIME, label: FieldFormatLabels[FieldFormat.DATETIME], icon: 'calendar_today' },
      ]
    },
    {
      label: 'Otros',
      types: [
        { value: FieldFormat.BOOL, label: FieldFormatLabels[FieldFormat.BOOL], icon: 'toggle_on' },
        { value: FieldFormat.RELATION, label: FieldFormatLabels[FieldFormat.RELATION], icon: 'link' },
        { value: FieldFormat.LIST, label: FieldFormatLabels[FieldFormat.LIST], icon: 'list' },
        { value: FieldFormat.ATTACHMENT, label: FieldFormatLabels[FieldFormat.ATTACHMENT], icon: 'attach_file' },
        { value: FieldFormat.JSON, label: FieldFormatLabels[FieldFormat.JSON], icon: 'code' },
      ]
    }
  ];

  return (
    <Modal
      id="field-form-modal"
      isOpen={true}
      zIndex={1000}
      onClose={props.onClose}
      title={props.field ? `Editar campo: ${props.field.name}` : `Agregar campo a ${props.table.name}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} class="space-y-4">
        {/* Nombre */}
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Nombre del campo *
          </label>
          <input
            type="text"
            value={name()}
            onInput={(e) => handleNameChange(e.currentTarget.value)}
            class={`
              w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2
              ${errors().name ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}
            `}
            placeholder="Email, Nombre, Edad..."
            autofocus
          />
          <Show when={errors().name}>
            <p class="text-sm text-red-600 mt-1">{errors().name}</p>
          </Show>
        </div>

        {/* Identificador */}
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Identificador *
          </label>
          <input
            type="text"
            value={identifier()}
            onInput={(e) => setIdentifier(e.currentTarget.value)}
            class={`
              w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 font-mono text-sm
              ${errors().identifier ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}
              ${props.field ? 'bg-gray-100 cursor-not-allowed' : ''}
            `}
            placeholder="email, nombre, edad..."
            disabled={!!props.field}
          />
          <Show when={errors().identifier}>
            <p class="text-sm text-red-600 mt-1">{errors().identifier}</p>
          </Show>
          <Show when={props.field}>
            <p class="text-xs text-gray-500 mt-1">
              El identificador no se puede modificar en campos existentes
            </p>
          </Show>
        </div>

        {/* Tipo de campo */}
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Tipo de campo *
          </label>
          <div class="space-y-3">
            <For each={fieldTypeGroups()}>
              {(group) => (
                <div>
                  <p class="text-xs font-medium text-gray-500 mb-2">{group.label}</p>
                  <div class="grid grid-cols-2 gap-2">
                    <For each={group.types}>
                      {(type) => (
                        <button
                          type="button"
                          onClick={() => setFieldFormat(type.value)}
                          class={`
                            flex items-center gap-2 px-3 py-2 border rounded-lg transition-all
                            ${fieldFormat() === type.value
                              ? 'bg-blue-50 border-blue-500 text-blue-700'
                              : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                            }
                          `}
                        >
                          <Icon name={type.icon} class="w-4 h-4" />
                          <span class="text-sm font-medium">{type.label}</span>
                        </button>
                      )}
                    </For>
                  </div>
                </div>
              )}
            </For>
          </div>
        </div>

        {/* Tabla relacionada (solo para tipo RELATION) */}
        <Show when={fieldFormat() === FieldFormat.RELATION}>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Tabla relacionada *
            </label>
            <select
              value={relationTableIdentifier()}
              onInput={(e) => setRelationTableIdentifier(e.currentTarget.value)}
              class={`
                w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2
                ${errors().relationTableIdentifier ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}
              `}
            >
              <option value="">Seleccionar tabla...</option>
              <For each={availableTables()}>
                {(table) => (
                  <option value={table.identifier}>
                    {table.name} ({table.identifier})
                  </option>
                )}
              </For>
            </select>
            <Show when={errors().relationTableIdentifier}>
              <p class="text-sm text-red-600 mt-1">{errors().relationTableIdentifier}</p>
            </Show>
          </div>
        </Show>

        {/* Descripción */}
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Descripción
          </label>
          <textarea
            value={description()}
            onInput={(e) => setDescription(e.currentTarget.value)}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Descripción del campo..."
            rows="2"
          />
        </div>

        {/* Opciones */}
        <div class="space-y-2 pt-2 border-t border-gray-200">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isRequired()}
              onChange={(e) => setIsRequired(e.currentTarget.checked)}
              class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700">Campo requerido</span>
          </label>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isUnique()}
              onChange={(e) => setIsUnique(e.currentTarget.checked)}
              class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700">Valor único</span>
          </label>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isSearchable()}
              onChange={(e) => setIsSearchable(e.currentTarget.checked)}
              class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700">Búsqueda habilitada</span>
          </label>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isFilter()}
              onChange={(e) => setIsFilter(e.currentTarget.checked)}
              class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700">Filtro habilitado</span>
          </label>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={multiple()}
              onChange={(e) => setMultiple(e.currentTarget.checked)}
              class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700">Múltiples valores</span>
          </label>
        </div>

        {/* Botones */}
        <div class="flex justify-end gap-2 pt-4 border-t border-gray-200">
          <Button
            variant="ghost"
            onClick={props.onClose}
            type="button"
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            type="submit"
          >
            <Icon name={props.field ? "save" : "add"} size={18} />
            {props.field ? 'Guardar Cambios' : 'Agregar Campo'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
