// src/components/FormsList.tsx
import { For } from "solid-js";
import { useRecordQuery } from "../../../hooks/useRecords";

type FormItem = {
  id: string;
  name: string;
  tableIdentifier: string;
  description?: string;
  // resto de campos...
};

export default function FormsList(props: {
  onSelect: (form_id: string) => void;
  selectedId?: string | null;
}) {
  const { data: formsData, loading, error } = useRecordQuery<FormItem>("forms", {});

  return (
    <div class="p-3">
      <h3 class="text-lg font-semibold mb-2">Forms</h3>
      <div class="flex flex-col gap-2">
        <For each={formsData() ?? []}>
          {(form) => (
            <button
              class={`text-left p-2 rounded border ${
                props.selectedId === form.id ? "bg-blue-50 border-blue-300" : "bg-white"
              }`}
              onClick={() => props.onSelect(form.id)}
            >
              <div class="font-medium">{form.name}</div>
              <div class="text-xs text-gray-500">{form.description}</div>
            </button>
          )}
        </For>
      </div>
      {loading() && <div class="text-sm text-gray-500 mt-2">Cargando...</div>}
      {error() && <div class="text-sm text-red-500 mt-2">Error al cargar forms</div>}
    </div>
  );
}
