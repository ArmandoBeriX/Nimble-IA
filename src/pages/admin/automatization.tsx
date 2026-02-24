
export default function AutomatizationPage() {

  return <>
    <div class="min-h-screen flex items-center justify-center p-8">
      <div class="text-center">
        <h1 class="text-4xl md:text-6xl font-black text-gray-900 mb-4">
          Gestión de Automatización
        </h1>
        <p class="text-lg md:text-xl italic text-gray-500">
          Esto trata de implementar la gestión de automatizaciones dentro de la aplicación, como flujos de trabajo automáticos, integraciones con terceros, y reglas de automatización personalizadas
        </p>
      </div>
    </div>

    <ExampleFormVisualizerUsage></ExampleFormVisualizerUsage>
  </>
}




import { Component, Show } from "solid-js";
import FormVisualizer, { FormElement } from "../../components/fields/FormVisualizer";
import { useTableFields } from "../../components/fields/useTableFields";
import Icon from "../../components/ui/icon/Icon";

const ExampleFormVisualizerUsage: Component = () => {
  const { fields, loading, error } = useTableFields("users");

  const handleElementsChange = (elements: FormElement[]) => {
    console.log("Formulario actualizado:", elements);
    // Aquí puedes guardar los elementos en tu base de datos o estado
  };

  return (
    <div class="p-6">
      <h1 class="text-2xl font-bold text-gray-900 mb-6">
        Diseñador de Formularios
      </h1>
      
      <Show when={loading()}>
        <div class="p-8 text-center text-gray-500">
          <Icon name="loading" class="w-8 h-8 animate-spin mx-auto mb-2" />
          <div>Cargando campos...</div>
        </div>
      </Show>
      
      <Show when={error()}>
        <div class="p-4 text-sm text-red-600 bg-red-50 rounded-md">
          <div class="font-medium">Error cargando campos</div>
          <div class="text-xs text-gray-600 mt-1">
            {error()?.message}
          </div>
        </div>
      </Show>
      
      <Show when={!loading() && !error()}>
        <FormVisualizer
          tableIdentifier="users"
          availableFields={fields()}
          onElementsChange={handleElementsChange}
          initialElements={[
            // Ejemplo de elementos iniciales
            {
              id: "box-1",
              type: "box",
              width: "w-full",
              title: "Información Personal",
              backgroundColor: "bg-blue-50",
              borderColor: "border-blue-200",
              children: []
            }
          ]}
        />
      </Show>
    </div>
  );
};