// FormatAttachmentShow.tsx
import { For, Show, createMemo } from "solid-js";
import { FieldShowProps } from "../../FieldShow";

export default function FormatAttachmentShow(props: FieldShowProps) {
  const field = props.field;
  const rawValue = () => props.record?.[field.identifier!] ?? field.default;
  
  const files = createMemo(() => {
    const val = rawValue();
    if (!val) return [];
    if (Array.isArray(val)) return val;
    return [val];
  });
  
  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);

  const getFileName = (file: any) => {
    if (typeof file === "string") return file.split("/").pop() || file;
    if (file && typeof file === "object") return file.name || file.url?.split("/").pop() || "Archivo";
    return "Archivo";
  };

  const getFileUrl = (file: any) => {
    if (typeof file === "string") return file;
    if (file && typeof file === "object") return file.url || "";
    return "";
  };

  const showValue = () => (
    <Show 
      when={files().length > 0} 
      fallback={<span class="text-gray-400">—</span>}
    >
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        <For each={files()}>
          {(file) => {
            const url = getFileUrl(file);
            const name = getFileName(file);
            const isImg = isImage(url);
            
            return (
              <div class="border rounded-lg p-2">
                <Show when={isImg && url}>
                  <img src={url} alt={name} class="w-full h-32 object-cover rounded-md mb-2" />
                </Show>
                <div class="text-sm truncate" title={name}>{name}</div>
                <Show when={url}>
                  <a href={url} target="_blank" rel="noopener noreferrer" class="text-xs text-blue-600 hover:underline mt-1 inline-block">
                    Ver archivo
                  </a>
                </Show>
              </div>
            );
          }}
        </For>
      </div>
    </Show>
  );

  if (props.onlyValue) return showValue();

  return (
    <div class="form-group field-attachment-show">
      <label class="field-label" title={field.description}>{field.name}</label>
      <div class="field-value">{showValue()}</div>
    </div>
  );
}