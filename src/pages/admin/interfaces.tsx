// src/pages/DesignerPage.tsx
import { createSignal, onMount } from 'solid-js';

export default function InterfacesPage() {
  const [loaded, setLoaded] = createSignal(false);

  onMount(() => {
    // Pequeño delay para asegurar que todo esté cargado
    setTimeout(() => setLoaded(true), 100);
  });

  return (
    <div class="designer-page">
      <div class="page-header">
        <h1>Diseñador de Interfaces</h1>
        <p>Crea y diseña interfaces personalizadas para tu aplicación</p>
      </div>
      
      <div class="page-content">
        {loaded() && "Hay que diseñarlo"}
      </div>
    </div>
  );
}