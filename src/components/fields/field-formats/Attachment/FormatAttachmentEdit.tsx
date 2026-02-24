// FormatAttachment.tsx
import { createSignal, createMemo, createEffect, onCleanup, For, Show, onMount } from "solid-js";
import { FieldProps } from "../../FieldEdit";
import { store } from "../../../../app";

/**
 * Nota:
 * - Este componente no realiza upload automático al servidor.
 * - Cuando el usuario pulsa "Aceptar" se llamará props.onInput?.(acceptedFiles)
 *   donde acceptedFiles es Array<File | { url: string, name: string }> según el caso.
 * - Si tu flujo requiere subir inmediatamente, adapta el handler de `onAccept`
 *   para ejecutar el upload y pasar la URL resultante a props.onInput.
 */

export function FormatAttachmentEdit(props: FieldProps) {
  if (props.field.isEditable === false) return <></>;

  // Initial value puede ser array de URLs o null/undefined
  const initialRaw = createMemo(() => {
    const sessionValue = store.watchSession('val_' + (props.record?.id ?? props.field.tableIdentifier) + '_' + props.field.identifier)();
    return sessionValue ?? props.record?.[props.field.identifier!] ?? props.field.default ?? null
  });

  // stagedFiles -> archivos que el usuario ha seleccionado y aún NO ha confirmado
  const [stagedFiles, setStagedFiles] = createSignal<Array<File | { url: string; name: string }>>(
    Array.isArray(initialRaw()) ? (initialRaw() as any) : []
  );
  const setStaggedFilesAndCache = (files: Array<File | { url: string; name: string }>) => {
    setStagedFiles(files);
    store.setSession('val_' + (props.record?.id ?? props.field.tableIdentifier) + '_' + props.field.identifier, files)
  };
  // committedFiles -> archivos confirmados (lo que se considera el valor actual del campo)
  const [committedFiles, setCommittedFiles] = createSignal<Array<File | { url: string; name: string }>>(
    Array.isArray(initialRaw()) ? (initialRaw() as any) : []
  );

  const [errors, setErrors] = createSignal<string[]>([]);
  const fieldId = `${props.field.tableIdentifier}-${props.field.identifier}-attach`;

  // preview object URLs for File objects (revoke on cleanup)
  const objectUrlMap = new Map<File, string>();
  onCleanup(() => {
    objectUrlMap.forEach((url) => URL.revokeObjectURL(url));
    objectUrlMap.clear();
  });

  const makePreviewUrl = (f: File | { url: string; name: string }) => {
    if ("url" in f) return f.url;
    if (objectUrlMap.has(f)) return objectUrlMap.get(f)!;
    const u = URL.createObjectURL(f);
    objectUrlMap.set(f, u);
    return u;
  };

  // Cuando se selecciona por input[type=file] o por drop
  const handleFilesSelection = (files: FileList | File[]) => {
    const arr = Array.from(files).map((f) => f);
    setStaggedFilesAndCache([...stagedFiles(), ...arr]);
  };

  // eliminar un archivo del staging
  const removeStaged = (index: number) => {
    const arr = stagedFiles().slice();
    arr.splice(index, 1);
    setStaggedFilesAndCache(arr);
  };

  // Aceptar -> confirmar stagedFiles como valor real y llamar props.onInput
  const onAccept = async () => {
    // Validación previa (ejemplo: tamaño máximo, tipos permitidos etc.)
    const errs: string[] = [];
    // ejemplo simple: si el campo es requerido y no hay archivos
    if (props.field.isRequired && stagedFiles().length === 0 && committedFiles().length === 0) {
      errs.push("Es requerido");
    }
    // aquí podrías agregar checks de tipo/size usando props.field.storeData
    if (errs.length) {
      setErrors(errs);
      return;
    }

    // Confirmar: en este componente asumimos que el valor final es un array de File | {url,name}
    setCommittedFiles(stagedFiles().slice());
    setErrors([]);
    props.onInput?.(stagedFiles().slice());
    props.onChange?.(stagedFiles().slice());
  };

  // Cancelar -> revertir staged al committed (descarta cambios)
  const onCancel = () => {
    setStaggedFilesAndCache(committedFiles().slice());
    setErrors([]);
  };

  // Clear completo
  const onClearAll = () => {
    setStaggedFilesAndCache([]);
    setCommittedFiles([]);
    setErrors([]);
    props.onInput?.([]);
    props.onChange?.([]);
  };

  // Drag & drop handlers
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    if (!e.dataTransfer) return;
    const files = e.dataTransfer.files;
    if (files && files.length) handleFilesSelection(files);
  };
  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  let inputEl: HTMLInputElement;
  // controller bindings
  onMount(() => {
    const ctrl = props.controller;
    if (!ctrl) return;
    ctrl.target = inputEl;
    ctrl.validate = async() => {
      const errs: string[] = [];
      if (props.field.isRequired && (stagedFiles().length === 0 && committedFiles().length === 0)) {
        errs.push("Es requerido");
      }
      setErrors(errs);
      return errs.length === 0;
    };
    ctrl.getValue = () => committedFiles();
    ctrl.reset = () => {
      store.deleteSession('val_' + (props.record?.id ?? props.field.tableIdentifier) + '_' + props.field.identifier)
      const init = initialRaw();
      const arr = Array.isArray(init) ? (init as any) : [];
      setStaggedFilesAndCache(arr);
      setCommittedFiles(arr);
      setErrors([]);
    };
  });

  // Si el record cambia desde afuera (p.e. reload), actualizar valores
  createEffect(() => {
    const v = initialRaw();
    if (Array.isArray(v)) {
      setStaggedFilesAndCache(v as any);
      setCommittedFiles(v as any);
    }
  });

  return (
    <div class="form-group field-attachment">
      <label for={fieldId} class="field-label" title={props.field.description}>
        {props.field.name}
        {props.field.isRequired && <span class="required-asterisk"> *</span>}
      </label>

      <div
        id={fieldId}
        class="attachment-dropzone"
        onDrop={(e) => onDrop(e)}
        onDragOver={(e) => onDragOver(e)}
        style={{
          border: "1px dashed #d1d5db",
          padding: "8px",
          "border-radius": "6px",
          display: "flex",
          "flex-direction": "column",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", "align-items": "center", gap: "8px" }}>
          <input
            ref={el => inputEl = el}
            type="file"
            multiple
            id={`${fieldId}-input`}
            class="hidden"
            onChange={(ev) => {
              const files = (ev.target as HTMLInputElement).files;
              if (files) handleFilesSelection(files);
            }}
          />
          <label for={`${fieldId}-input`} class="btn" style={{ cursor: "pointer", padding: "6px 10px", "background-color": "#efefef", "border-radius": "4px" }}>
            Seleccionar archivos
          </label>

          <button type="button" class="btn" onClick={onClearAll} style={{ padding: "6px 10px", "border-radius": "4px" }}>
            Limpiar todo
          </button>

          <div style={{ 'margin-left': "auto", "font-size": "0.85rem", color: "#6b7280" }}>
            <i>{stagedFiles().length} archivo(s) en staging</i>
          </div>
        </div>

        <Show when={stagedFiles().length > 0}>
          <div class="attachments-list" style={{ display: "flex", gap: "8px", "flex-wrap": "wrap" }}>
            <For each={stagedFiles()}>
              {(f: any, i) => (
                <div class="attachment-item" style={{ border: "1px solid #e5e7eb", padding: "6px", "border-radius": "6px", width: "160px" }}>
                  <div style={{ "font-size": "0.85rem", "font-weight": "600", overflow: "hidden", "text-overflow": "ellipsis", "white-space": "nowrap" }}>
                    {"name" in f ? f.name : f.url}
                  </div>

                  <Show when={(f as File).type?.startsWith?.("image")}>
                    <img src={makePreviewUrl(f)} alt="preview" style={{ width: "100%", height: "90px", "object-fit": "cover", "margin-top": "6px", "border-radius": "4px" }} />
                  </Show>

                  <div style={{ display: "flex", gap: "6px", "margin-top": "6px", "justify-content": "space-between" }}>
                    <button type="button" class="btn" onClick={() => removeStaged(i())} style={{ padding: "4px 8px", "font-size": "0.8rem" }}>
                      Eliminar
                    </button>
                    <div style={{ "font-size": "0.75rem", color: "#6b7280", "align-self": "center" }}>
                      <Show when={"size" in f} fallback={<span>{(f as any).url ? "URL" : ""}</span>}>
                        <span>{Math.round(((f as File).size ?? 0) / 1024)} KB</span>
                      </Show>
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>

        {/* Controles "Aceptar / Cancelar" */}
        <div style={{ display: "flex", gap: "8px", "justify-content": "flex-end", "margin-top": "6px" }}>
          <button
            type="button"
            class="btn-secondary"
            onClick={onCancel}
            style={{ padding: "6px 10px", "border-radius": "6px", border: "1px solid #cbd5e1" }}
          >
            Cancelar
          </button>

          <button
            type="button"
            class="btn-primary"
            onClick={onAccept}
            style={{ padding: "6px 10px", "border-radius": "6px", background: "#3b82f6", color: "white", border: "none" }}
          >
            Aceptar
          </button>
        </div>

        <Show when={errors().length > 0}>
          <div class="field-error" style={{ color: "#dc2626", "font-size": "0.9rem" }}>{errors().join(". ")}</div>
        </Show>
      </div>
    </div>
  );
}

export default FormatAttachmentEdit;
