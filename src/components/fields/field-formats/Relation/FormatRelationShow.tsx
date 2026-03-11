// FormatRelationShow.tsx
import { For, Show, createMemo, createResource, Suspense } from "solid-js";
import { store } from "../../../../app";
import { renderLabelFromTemplate } from "../../../utils/FormatInterpreter";
import { FieldShowProps } from "../../FieldShow";
import { wait } from "../../../../lib/utils/utils";

export default function FormatRelationShow(props: FieldShowProps) {
  const field = props.field;
  const table = store.getTable(field.tableIdentifier!)

  // 1. Acceso seguro al valor del record (Accessor reactivo)
  const rawValue = () => {
    // if (props.field.identifier === 'icon')
    
    const identifier = field.identifier || "";
    // Intentamos 'cliente' y luego 'cliente_id'
    let val = props.record?.[identifier.replace(/_id$/, "")];
    if (val === undefined) {
      val = props.record?.[identifier] ?? field.default;
    }
    return val;
  };

  // 2. ¿Necesitamos pedir datos? Solo si es un string/number (un ID)
  const idToFetch = createMemo(() => {
    const val = rawValue();
    if (val && (typeof val === "string" || typeof val === "number")) {
      return val;
    }
    return null;
  });

  // 3. El Recurso (No lo tocaremos fuera del Suspense para no bloquear al padre)
  const [fetchedData] = createResource(idToFetch, async (id) => {
    const tableId = field.relationTableIdentifier;
    if (!tableId) return null;
    return await store.query(tableId, { [field.relationKey || 'id']: id });
  });

  // 4. Configuración de la tabla relacionada (Memos seguros)
  const resolvedTableIdentifier = () => store.resolveTableIdentifier(field.relationTableIdentifier, props.record);
  const relTable = createMemo(() => store.getTable(resolvedTableIdentifier()));
  const simpleLabelKey = createMemo(() => relTable()?.tableFields?.find(tf => tf.fieldFormat === "string")?.identifier);
  const formatSelection = createMemo(() => (relTable()?.formatSelection) ?? `{${simpleLabelKey()}}`);

  const formatObject = (obj: any) => {
    if (!obj) return "—";
    if (typeof obj === "string" || typeof obj === "number") return String(obj);
    if (typeof obj === "object") {
      try {
        return renderLabelFromTemplate(formatSelection() as any, obj);
      } catch {
        const key = simpleLabelKey();
        if (typeof key === "string" && key in obj) return obj[key];
        return obj.id ?? obj.name ?? "—";
      }
    }
    return "—";
  };

  // 5. El "Contenido Real" encapsulado
  // Esta función SOLO se llama cuando el Suspense decide que puede renderizar
  const ListContent = () => {
  const table = relTable();
  const baseColor = () => table?.color || 'var(--color-cyan-600)'; // fallback a purple-500 si no hay color

  const objects = createMemo(() => {
    const val = rawValue();
    if (val && typeof val === "object") return Array.isArray(val) ? val : [val];
    const fetched = fetchedData();
    if (fetched) return Array.isArray(fetched) ? fetched : [fetched];
    return val ? [val] : [];
  });

  return (
    <div class="flex flex-wrap gap-1">
      <For each={objects()}>
        {(obj) => (
          <span
            style={{
              // Mezclamos el color base con transparente para el fondo general
              // Y creamos un degradado donde la derecha es un 20% más transparente que la izquierda
              "background-image": `linear-gradient(to right, 
                color-mix(in srgb, ${baseColor()}, transparent 75%), 
                color-mix(in srgb, ${baseColor()}, transparent 88%)
              )`,
              "border-color": `color-mix(in srgb, ${baseColor()}, transparent 60%)`,
              // El color del texto será el color base puro para que destaque
              "color": baseColor(),
              // Sombra blanca muy suave (glow) para asegurar legibilidad sobre cualquier fondo
              "text-shadow": "0px 0px 0.5px var(--color-black)",
              "-webkit-text-stroke-width": "0.2px",
              "-webkit-text-stroke-color": "var(--color-gray-700)"
            }}
            class="inline-flex items-center px-2 py-1 rounded-md text-sm border font-medium"
          >
            {formatObject(obj)}
          </span>
        )}
      </For>
    </div>
  );
};

  const showValue = () => (
    <Suspense 
      fallback={
        <div class="flex items-center gap-2 animate-pulse">
          <div class="h-6 w-28 bg-gray-200 rounded-md"></div>
        </div>
      }
    >
      <Show when={rawValue()} fallback={<span class="text-gray-400">—</span>}>
        <ListContent />
      </Show>
    </Suspense>
  );

  if (props.onlyValue) return showValue();

  return (
    <div class="form-group field-relation-show">
      <label class="field-label font-medium text-gray-700" title={field.description}>
        {field.name}
      </label>
      <div class="field-value mt-1">
        {showValue()}
      </div>
    </div>
  );
}