// routes/RecordModalDemo.tsx
import { createSignal } from "solid-js";
import { useModal } from "../hooks/useModal";
import { useRecordModal } from "../components/record/RecordModal-old";
import { store } from "../app";
import { RecordModal } from "../components/record/RecordModal";
import Button from "../components/ui/Button";

// registros de ejemplo (simulan lo que hay en la DB)
const sampleOne = { id: 1, name: "Interface A", description: "Primera interfaz", active: true };
const sampleTwo = { id: 2, name: "Interface B", description: "Segunda interfaz", active: false };

export default function RecordModalDemo() {
  // flags para controlar apertura de cada modal
  const [openCreate, setOpenCreate] = createSignal(true);
  const [openEdit, setOpenEdit] = createSignal(false);
  const [openBulk, setOpenBulk] = createSignal(false);

  // handler común para after save
  function handleSaved(result: any) {
    console.log("onSaved result:", result);
    // aquí puedes recargar lista, mostrar toast, etc.
  }

  return (
    <div class="p-6 space-y-4">
      <h2 class="text-xl font-semibold">Demo RecordModal</h2>

      <div class="flex gap-2">
        <Button onClick={() => setOpenCreate(true)}>Crear nuevo</Button>
        <Button onClick={() => setOpenEdit(true)}>Editar registro (id=1)</Button>
        <Button onClick={() => setOpenBulk(true)}>Editar múltiple (id=1,2)</Button>
      </div>

      {/* Crear */}
      <RecordModal
        tableIdentifier="interfaces"
        open={openCreate()}
        onOpenChange={(v) => setOpenCreate(v)}
        title="Crear Interface"
        submitLabel="Crear"
        onSaved={(r) => handleSaved(r)}
      />

      {/* Editar single */}
      <RecordModal
        tableIdentifier="interfaces"
        record={sampleOne}
        open={openEdit()}
        onOpenChange={(v) => setOpenEdit(v)}
        title="Editar Interface"
        submitLabel="Guardar"
        onSaved={(r) => handleSaved(r)}
      />

      {/* Edición múltiple */}
      <RecordModal
        tableIdentifier="interfaces"
        record={[sampleOne, sampleTwo]}
        open={openBulk()}
        onOpenChange={(v) => setOpenBulk(v)}
        title="Edición múltiple — Interfaces"
        submitLabel="Aplicar cambios"
        onSaved={(r) => handleSaved(r)}
      />
    </div>
  );
}

export function MyComponent() {
  const { openRecordModal } = useRecordModal();

  // Abrir modal para crear un nuevo registro
  const handleCreate = () => {
    openRecordModal({
      tableIdentifier: 'users',
      onSave: (savedIds: string[]) => {
        console.log('Registros creados:', savedIds);
        // Aquí puedes actualizar tu UI
      }
    });
  };

  // Abrir modal para editar un registro existente
  const handleEdit = async (id?: string) => {
    const users = await(store.query('users',{},{limit: 1})) || []
    openRecordModal({
      tableIdentifier: 'users',
      id: id || users[0].id,
      onSave: (savedIds: string[]) => {
        console.log('Registro actualizado:', savedIds);
        // Actualizar UI
      }
    });
  };

  // Abrir modal para editar múltiples registros
  const handleEditMultiple = (ids: string[]) => {
    openRecordModal({
      tableIdentifier: 'users',
      id: ids,
      onSave: (savedIds: string[]) => {
        console.log('Registros actualizados:', savedIds);
        // Actualizar UI
      }
    });
  };

  return (
    <div>
      <button onClick={handleCreate} class="btn btn-primary">
        Crear Usuario
      </button>
      
      <button onClick={() => handleEdit()} class="btn btn-secondary">
        Editar Usuario
      </button>
      
      <button onClick={() => handleEditMultiple(['user-123', 'user-456'])} class="btn btn-secondary">
        Editar Múltiples
      </button>
    </div>
  );
}

export function ExampleModals() {
  const modals = useModal();

  const openExampleModal = () => {
    console.log('🖱️ Click en botón - Abriendo modal...');
    
    const modalId = modals.openModal({
      title: 'Mi Modal de Ejemplo',
      size: 'lg',
      children: (
        <div class="space-y-4">
          <p class="text-gray-600 dark:text-gray-300">
            ¡Este modal debería funcionar ahora! 🎉
          </p>
          <div class="form-group">
            <label for="example-input">Campo de ejemplo</label>
            <input 
              id="example-input" 
              type="text" 
              class="form-input" 
              placeholder="Escribe algo..."
            />
          </div>
        </div>
      ),
      footer: (
        <>
          <button 
            class="btn btn-secondary"
            onClick={() => modals.closeModal(modalId)}
          >
            Cancelar
          </button>
          <button 
            class="btn btn-primary"
            onClick={() => {
              console.log('✅ Modal aceptado');
              modals.closeModal(modalId);
            }}
          >
            Aceptar
          </button>
        </>
      )
    });
    
    console.log('📋 Modal ID retornado:', modalId);
    console.log('🔍 Estado actual de modales:', modals.modals().length);
  };

  const openMultipleModals = () => {
    console.log('🖱️ Abriendo múltiples modales...');
    
    const modal1Id = modals.openModal({
      title: 'Modal 1',
      size: 'sm',
      children: <p>Primer modal</p>,
      footer: (
        <button 
          class="btn btn-primary" 
          onClick={() => modals.closeModal(modal1Id)}
        >
          Cerrar Este
        </button>
      )
    });

    setTimeout(() => {
      modals.openModal({
        title: 'Modal 2',
        size: 'md',
        children: <p>Segundo modal - Se abrió después de 300ms</p>,
        footer: (
          <button 
            class="btn btn-primary" 
            onClick={() => modals.closeModal(modals.modals()[modals.modals().length - 1]?.id)}
          >
            Cerrar Este
          </button>
        )
      });
    }, 300);
  };

  return (
    <div class="p-8">
      <div class="space-y-4">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
          Sistema de Modales Corregido ✅
        </h1>
        
        <div class="flex space-x-4 flex-wrap gap-2">
          <button 
            class="btn btn-primary"
            onClick={openExampleModal}
          >
            Abrir Modal Simple
          </button>
          
          <button 
            class="btn btn-secondary"
            onClick={openMultipleModals}
          >
            Abrir Múltiples Modales
          </button>
          
          <button 
            class="btn btn-danger"
            onClick={() => modals.closeAllModals()}
          >
            Cerrar Todos
          </button>
        </div>

        {/* Panel de información en tiempo real */}
        <div class="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded">
          <p class="text-sm text-gray-600 dark:text-gray-300">
            <strong>Modales abiertos:</strong> {modals.modals().length}
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Revisa la consola para ver los logs de debug
          </p>
        </div>
      </div>
    </div>
  );
}