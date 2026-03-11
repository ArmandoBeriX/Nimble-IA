import { For, createSignal, Show, createEffect } from "solid-js";
import { useRecordQuery } from "../../../hooks/useRecords";
import FormDesigner from "./FormDesigner";
import { FormItem } from "../../../constants/table-defs";
import RecordButtonAction from "../../../components/record/RecordButtonAction";
import MultipleListsWithSignals from "./MultipleListsExample";

export default function FormsPage() {
  const { data: formsData, loading, error } = useRecordQuery<FormItem>("forms", {});

  const [selectedFormId, setSelectedFormId] = createSignal<string | null>(null);

  let designerRef: HTMLDivElement | undefined;

  // scroll suave cuando cambia el form seleccionado
  createEffect(() => {
    if (selectedFormId() && designerRef) {
      // pequeño timeout para asegurar que el DOM ya renderizó
      requestAnimationFrame(() => {
        designerRef?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
  });

  // Si se elimina un form desde fuera (delete action), limpiamos selectedFormId
  createEffect(() => {
    const list = formsData ?? [];
    if (selectedFormId()) {
      const exists = list.some((f) => f.id === selectedFormId());
      if (!exists) setSelectedFormId(null);
    }
  });

  return (
    <div class="flex flex-col gap-6">

      <MultipleListsWithSignals />

      {/* LISTA DE FORMS */}
      <div class="p-3">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-lg font-semibold">Forms</h3>

          <div class="flex items-center gap-2">
            {/* Botón crear nuevo form */}
            <RecordButtonAction
              tableIdentifier="forms"
              action="create"
              buttonProps={{ variant: "primary" }}
              initialValues={{ name: "Nuevo form" }}
            >
              <span class="px-3 py-1 inline-flex items-center gap-2">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                <span>Nuevo</span>
              </span>
            </RecordButtonAction>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <Show
            when={(formsData ?? []).length > 0}
            fallback={
              <div class="p-4 border rounded-md bg-white text-sm text-gray-600">
                No hay forms aún.
                <div class="mt-3">
                  <RecordButtonAction
                    tableIdentifier="forms"
                    action="create"
                    buttonProps={{ variant: "primary" }}
                    initialValues={{ name: "Nuevo form" }}
                  >
                    <span class="px-3 py-1 inline-flex items-center gap-2">Crear primero</span>
                  </RecordButtonAction>
                </div>
              </div>
            }
          >
            <For each={formsData ?? []}>
              {(form) => {
                const selected = () => selectedFormId() === form.id;

                return (
                  <div class={`flex items-center justify-between p-2 rounded border transition ${
                    selected() ? "bg-blue-50 border-blue-400" : "bg-white hover:bg-gray-50"
                  }`}>
                    <button
                      class="text-left flex-1"
                      onClick={() => setSelectedFormId(form.id)}
                    >
                      <div class="font-medium">{form.name}</div>
                      <div class="text-xs text-gray-500">{form.description}</div>
                    </button>

                    <div class="flex items-center gap-2 ml-4">
                      {/* Editar */}
                      <RecordButtonAction
                        tableIdentifier="forms"
                        action="update"
                        id={form.id}
                        buttonProps={{ variant: "ghost" }}
                      >
                        <span class="px-2 py-1 text-sm">Editar</span>
                      </RecordButtonAction>

                      {/* Eliminar */}
                      <RecordButtonAction
                        tableIdentifier="forms"
                        action="delete"
                        id={form.id}
                        buttonProps={{ variant: "danger" }}
                        modalProps={{ title: "Confirmar eliminación" }}
                      >
                        <span class="px-2 py-1 text-sm">Eliminar</span>
                      </RecordButtonAction>
                    </div>
                  </div>
                );
              }}
            </For>
          </Show>
        </div>

        {loading() && (
          <div class="text-sm text-gray-500 mt-2">Cargando…</div>
        )}
        {error() && (
          <div class="text-sm text-red-500 mt-2">Error al cargar forms</div>
        )}
      </div>

      {/* DISEÑADOR */}
      <Show when={selectedFormId()}>
        <div ref={designerRef} class="border-t pt-6">
          <FormDesigner form_id={selectedFormId()!} />
        </div>
      </Show>
    </div>
  );
}
