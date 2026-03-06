// FormatRelationShow.tsx
import { For, Show } from "solid-js";
import { store } from "../../../../app";
import { renderLabelFromTemplate } from "../../../utils/FormatInterpreter";
import { FieldShowProps } from "../../FieldShow";

export default function FormatRelationShow(props: FieldShowProps) {
  const field = props.field;
  const rawValue = props.record?.[field.identifier!] ?? field.default;

  // Obtener configuración de la tabla relacionada
  const resolvedTableIdentifier = store.resolveTableIdentifier(field.relationTableIdentifier, props.record);

  const relTable = store.getTable(resolvedTableIdentifier);
  const simpleLabelKey = relTable?.tableFields
    ?.find(tf => tf.fieldFormat === "string")?.identifier;
  const formatSelection = (relTable && relTable.formatSelection) ?? `{${simpleLabelKey}}`;

  // Determinar si es múltiple
  const isMultiple = field.multiple || false;

  // Obtener objetos relacionados
  const getRelatedObjects = () => {
    if (!rawValue) return [];
    if (Array.isArray(rawValue)) return rawValue;
    return [rawValue];
  };

  const relatedObjects = getRelatedObjects();

  // Formatear cada objeto
  const formatObject = (obj: any) => {
    if (typeof obj === "string" || typeof obj === "number") {
      return String(obj);
    }

    if (obj && typeof obj === "object") {
      try {
        return renderLabelFromTemplate(formatSelection as any, obj);
      } catch {
        // Only use simpleLabelKey as an index when it's a defined string and present on the object
        if (typeof simpleLabelKey === "string" && simpleLabelKey in obj) {
          return obj[simpleLabelKey];
        }
        return (obj as any).id ?? "—";
      }
    }

    return "—";
  };

  const ShowValue = () => (
    <Show
      when={relatedObjects.length > 0}
      fallback={<span class="text-gray-400">—</span>}
    >
      <Show
        when={isMultiple}
        fallback={
          <span class="text-gray-800">{formatObject(relatedObjects[0])}</span>
        }
      >
        <div class="flex flex-wrap gap-1">
          <For each={relatedObjects}>
            {(obj) => (
              <span class="inline-flex items-center px-2 py-1 rounded-md bg-purple-100 text-purple-800 text-sm">
                {formatObject(obj)}
              </span>
            )}
          </For>
        </div>
      </Show>
    </Show>
  );

  if (props.onlyValue) return <ShowValue />;

  return (
    <div class="form-group field-relation-show">
      <label class="field-label" title={field.description}>
        {field.name}
      </label>
      <div class="field-value">
        <ShowValue />
      </div>
    </div>
  );
}