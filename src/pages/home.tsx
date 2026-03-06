import { createSignal } from "solid-js";
import mainLogo from "../assets/main-logo.png";

export default function Home() {
  const [showDemo, setShowDemo] = createSignal(false);

  return (
    <section class="bg-white text-gray-800 p-6">
      <div class="max-w-6xl mx-auto">
        {/* Header / Hero */}
        <header class="flex items-center gap-6 mb-6">
          {/* Logo al inicio */}
          <img
            src={mainLogo}
            alt="Nimble AI - logo"
            class="h-24 w-auto"
          />

          <div>
            <h1 class="text-3xl md:text-4xl font-extrabold tracking-tight">
              Nimble AI
            </h1>
            <p class="mt-1 text-gray-500">
              La plataforma ágil para crear, organizar y entender datos — rápida,
              flexible y con inteligencia integrada.
            </p>

            <div class="mt-4 flex flex-wrap gap-3">
              <button
                class="px-4 py-2 rounded-md bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition"
                onClick={() => setShowDemo(true)}
              >
                Probar demo
              </button>

              <button
                class="px-4 py-2 rounded-md border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 transition"
                onClick={() =>
                  alert(
                    "Documentación: aquí iría el enlace a la doc (placeholder)."
                  )
                }
              >
                Ver características
              </button>
            </div>
          </div>
        </header>

        {/* Slogan / Pitch */}
        <section class="mb-6">
          <div class="rounded-lg border border-gray-100 p-6 bg-gradient-to-r from-white to-gray-50">
            <h2 class="text-2xl font-semibold mb-2">
              Tu espacio de trabajo digital — diseñado para moverse con rapidez
            </h2>
            <p class="text-gray-600">
              Diseña tus tablas como quieras, trabaja offline y deja que la IA
              haga el trabajo pesado: resúmenes, búsquedas inteligentes y
              transformaciones automáticas. Menos configuración, más resultados.
            </p>
          </div>
        </section>

        {/* Beneficios en estilo "propaganda ligera" */}
        <section class="grid md:grid-cols-4 gap-4 mb-6">
          <article class="p-4 rounded-lg bg-blue-50 border border-blue-100">
            <h3 class="text-lg font-bold">Diseño a tu medida</h3>
            <p class="text-gray-600 mt-2">
              Crea tablas y entidades exactamente como las necesitas. Sin límites,
              necesidad de despliegues. Tu información, tus reglas.
            </p>
          </article>

          <article class="p-4 rounded-lg bg-amber-50 border border-amber-100">
            <h3 class="text-lg font-bold">Trabaja con Libertad</h3>
            <p class="text-gray-600 mt-2">
              Online u offline, siempre tienes acceso. La sincronización automática mantiene todo actualizado cuando vuelves a conectarte.
            </p>
          </article>


          <article class="p-4 rounded-lg bg-emerald-50 border border-emerald-100">
            <h3 class="text-lg font-bold">Experiencia de Escritorio</h3>
            <p class="text-gray-600 mt-2">
              La potencia de un software de escritorio con la accesibilidad web.
              Intuitivo, rápido y muy eficiente.
            </p>
          </article>

          <article class="p-4 rounded-lg bg-emerald-50 border border-emerald-100">
            <h3 class="text-lg font-bold">Integración con IAs</h3>
            <p class="text-gray-600 mt-2">
              Asistentes inteligentes buscan, analizan y gestionan tus datos automáticamente.
              Deja que la IA haga el trabajo pesado por ti.
            </p>
          </article>

          <article class="p-4 rounded-lg bg-violet-50 border border-violet-100">
            <h3 class="text-lg font-bold">Para Todo Tipo de Negocios</h3>
            <p class="text-gray-600 mt-2">
              Gestión organizacional, investigación, proyectos creativos o desarrollo personal. 
              NimbleAI se adapta a ti.
            </p>
          </article>

          <article class="p-4 rounded-lg bg-violet-50 border border-violet-100">
            <h3 class="text-lg font-bold">Para Todo Tipo de Negocios</h3>
            <p class="text-gray-600 mt-2">
              Gestión organizacional, investigación, proyectos creativos o desarrollo personal. 
              NimbleAI se adapta a ti.
            </p>
          </article>

          <article class="p-4 rounded-lg bg-violet-50 border border-violet-100">
            <h3 class="text-lg font-bold">Creciendo Contigo</h3>
            <p class="text-gray-600 mt-2">
              Empieza pequeño y escala sin límites. Tu sistema evoluciona con tus necesidades, 
              escalando sin necesidad de implementar nuevos requerimientos.
            </p>
          </article>
        </section>

        {/* Ejemplo de prompt — estilo amigable */}
        <section class="mb-6">
          <div class="flex flex-col md:flex-row items-start gap-6">
            <div class="flex-1 rounded-lg border p-4 bg-white shadow-sm">
              <h4 class="font-semibold mb-2">Ejemplo rápido — pide a la IA</h4>
              <pre class="bg-gray-100 rounded p-3 text-sm text-gray-700">
                {`"Dame los 3 issues más críticos del último sprint y su impacto resumido en 2 líneas cada uno."`}
              </pre>
              <p class="text-gray-600 mt-2">
                Usa prompts sencillos. La IA entiende tu estructura y responde
                como si conociera tu base de datos.
              </p>
            </div>

            <aside class="w-full md:w-64 rounded-lg border p-4 bg-white text-sm text-gray-600 shadow-sm">
              <strong>¿Por qué Nimble AI?</strong>
              <p class="mt-2">
                Porque reduce el tiempo entre idea y resultado: menos fricción,
                más productividad.
              </p>
            </aside>
          </div>
        </section>

        {/* Panel demo o CTA dinámico */}
        {showDemo() && (
          <div class="rounded-lg border p-4 bg-blue-50 mb-6">
            <div class="flex items-start justify-between">
              <div>
                <h5 class="font-semibold">Demo rápida</h5>
                <p class="text-gray-700 mt-1">
                  Imagina: en segundos obtienes resúmenes accionables y vistas
                  sugeridas por la IA. Aquí iría una demo interactiva.
                </p>
              </div>
              <button
                class="text-gray-600 hover:text-gray-900"
                onClick={() => setShowDemo(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {/* Footer ligero/promocional */}
        <footer class="mt-6 text-center text-gray-500">
          <p>
            Nimble AI — Inteligencia que se adapta. Sencilla para usuarios, poderosa
            para equipos.
          </p>
        </footer>
      </div>
    </section>
  );
}
