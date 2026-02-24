// src/pages/admin/schema/EntityFormModal.tsx
import { createSignal, Show, onMount } from 'solid-js';
import { TableDef } from '../../../types/schema';
import Modal from '../../../components/modal/Modal';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/ui/icon/Icon';

interface EntityFormModalProps {
  table: TableDef | null;
  onSave: (data: Partial<TableDef>) => void;
  onClose: () => void;
}

export default function EntityFormModal(props: EntityFormModalProps) {
  const [name, setName] = createSignal(props.table?.name || '');
  const [namePlural, setNamePlural] = createSignal(props.table?.namePlural || '');
  const [identifier, setIdentifier] = createSignal(props.table?.identifier || '');
  const [icon, setIcon] = createSignal(props.table?.icon || '');
  const [description, setDescription] = createSignal(props.table?.description || '');
  const [errors, setErrors] = createSignal<Record<string, string>>({});

  // Auto-generar identifier desde name
  const handleNameChange = (value: string) => {
    setName(value);
    
    // Solo auto-generar si es nueva entidad
    if (!props.table) {
      const sanitized = value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remover acentos
        .replace(/[^a-z0-9]+/g, '_')      // Reemplazar no alfanuméricos con _
        .replace(/^_+|_+$/g, '');         // Remover _ al inicio y final
      
      setIdentifier(sanitized);
    }
    
    // Auto-generar plural simple si está vacío
    if (!namePlural()) {
      setNamePlural(value + 's');
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!name().trim()) {
      newErrors.name = 'El nombre es requerido';
    }

    if (!namePlural().trim()) {
      newErrors.namePlural = 'El nombre plural es requerido';
    }

    if (!identifier().trim()) {
      newErrors.identifier = 'El identificador es requerido';
    } else if (!/^[a-z][a-z0-9_]*$/.test(identifier())) {
      newErrors.identifier = 'El identificador debe comenzar con letra minúscula y solo contener letras, números y guiones bajos';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: Event) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const data: Partial<TableDef> = {
      name: name().trim(),
      namePlural: namePlural().trim(),
      identifier: identifier().trim(),
      icon: icon().trim() || undefined,
      description: description().trim() || undefined,
    };

    props.onSave(data);
  };

  return (
    <Modal
      id="entity-form-modal"
      isOpen={true}
      zIndex={1000}
      onClose={props.onClose}
      title={props.table ? 'Editar Entidad' : 'Nueva Entidad'}
      size="md"
    >
      <form onSubmit={handleSubmit} class="space-y-4">
        {/* Nombre */}
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Nombre (singular) *
          </label>
          <input
            type="text"
            value={name()}
            onInput={(e) => handleNameChange(e.currentTarget.value)}
            class={`
              w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2
              ${errors().name ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}
            `}
            placeholder="Usuario"
            autofocus
          />
          <Show when={errors().name}>
            <p class="text-sm text-red-600 mt-1">{errors().name}</p>
          </Show>
          <p class="text-xs text-gray-500 mt-1">
            Nombre singular de la entidad
          </p>
        </div>

        {/* Nombre plural */}
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Nombre (plural) *
          </label>
          <input
            type="text"
            value={namePlural()}
            onInput={(e) => setNamePlural(e.currentTarget.value)}
            class={`
              w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2
              ${errors().namePlural ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}
            `}
            placeholder="Usuarios"
          />
          <Show when={errors().namePlural}>
            <p class="text-sm text-red-600 mt-1">{errors().namePlural}</p>
          </Show>
          <p class="text-xs text-gray-500 mt-1">
            Nombre plural de la entidad
          </p>
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
            `}
            placeholder="usuarios"
            disabled={!!props.table} // No permitir editar en modo edición
            readOnly={!!props.table}
          />
          <Show when={errors().identifier}>
            <p class="text-sm text-red-600 mt-1">{errors().identifier}</p>
          </Show>
          <p class="text-xs text-gray-500 mt-1">
            Identificador único en la base de datos (snake_case)
            {props.table && ' - No se puede modificar'}
          </p>
        </div>

        {/* Icono */}
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Icono
          </label>
          <div class="flex items-center gap-2">
            <Show when={icon()}>
              <div class="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-lg border border-gray-300">
                <Icon name={icon()} class="w-6 h-6 text-gray-700" />
              </div>
            </Show>
            <input
              type="text"
              value={icon()}
              onInput={(e) => setIcon(e.currentTarget.value)}
              class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="person, database, table..."
            />
          </div>
          <p class="text-xs text-gray-500 mt-1">
            Nombre del icono de Material Icons
          </p>
        </div>

        {/* Descripción */}
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Descripción
          </label>
          <textarea
            value={description()}
            onInput={(e) => setDescription(e.currentTarget.value)}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Descripción de la entidad..."
            rows="3"
          />
          <p class="text-xs text-gray-500 mt-1">
            Descripción opcional de la entidad
          </p>
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
            <Icon name="save" size={18} />
            {props.table ? 'Guardar Cambios' : 'Crear Entidad'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}