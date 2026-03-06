// src/components/Modal/Modal.tsx
import { JSX, createEffect, createSignal, onCleanup, onMount, children as resolveChildren } from "solid-js";
import { Portal } from "solid-js/web";
import { store } from "../../app";
import Icon from "../ui/icon/Icon";

export type ModalSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface BaseModalProps {
  id: string;
  title: any;
  children: any;
  footer?: any;
  size?: ModalSize;
  onClose?: () => void;
  onConfirm?: () => void;
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
}

export interface ModalState extends BaseModalProps {
  isOpen: boolean;
  zIndex: number;
}

interface ModalComponentProps extends ModalState {
  onClose: () => void;
  variant?: "normal" | "blur";
  style?: JSX.CSSProperties;
  bodyStyle?: JSX.CSSProperties;
  overlayTransparent?: boolean;
  /**
   * draggable: 'header' | 'header-footer' | false
   * por defecto 'header-footer'
   */
  draggable?: "header" | "header-footer" | false;
  resizable?: string; // id para persistencia
}

export default function Modal(props: ModalComponentProps) {
  let dialogRef: HTMLDivElement | undefined;
  const resolvedChildren = resolveChildren(() => props.children);

  const uid = `modal-${Math.random().toString(36).slice(2, 9)}`;
  const titleId = `${uid}-title`;
  const bodyId = `${uid}-body`;

  const sizeClasses: Record<ModalSize, string> = {
    xs: "modal-size-xs",
    sm: "modal-size-sm",
    md: "modal-size-md",
    lg: "modal-size-lg",
    xl: "modal-size-xl",
  };

  const sizeToWidth: Record<ModalSize, number> = {
    xs: 400,
    sm: 500,
    md: 600,
    lg: 800,
    xl: 1000
  };

  // Señal para el ancho del modal
  const defaultWidth = sizeToWidth[props.size || 'md'];
  const [modalWidth, setModalWidth] = createSignal(defaultWidth);

  // Variables para el resize
  let resizeMode: 'left' | 'right' | null = null;
  let startResizeX = 0;
  let startResizeWidth = 0;
  let isResizing = false;

  // Función para iniciar el resize
  const startResize = (e: PointerEvent, mode: 'left' | 'right') => {
    if (!props.resizable || !dialogRef) return;

    // Detener todo inmediatamente
    e.stopPropagation();
    e.stopImmediatePropagation();
    e.preventDefault();

    isResizing = true;
    resizeMode = mode;
    startResizeX = e.clientX;
    startResizeWidth = modalWidth();

    // Usar capture phase para asegurar que capturamos el evento
    window.addEventListener('pointermove', handleResizeMove, true);
    window.addEventListener('pointerup', stopResize, true);
    window.addEventListener('pointercancel', stopResize, true);

    // Deshabilitar transición durante el resize
    dialogRef.style.transition = 'none';
    dialogRef.classList.add('resizing');
  };

  // Función para manejar el movimiento del resize
  const handleResizeMove = (e: PointerEvent) => {
    if (!isResizing || !resizeMode || !dialogRef) return;

    e.stopPropagation();
    e.preventDefault();

    const deltaX = 2 * (e.clientX - startResizeX);
    let newWidth = startResizeWidth;

    // Calcular nuevo ancho según el borde arrastrado
    if (resizeMode === 'right') {
      newWidth = startResizeWidth + deltaX;
    } else if (resizeMode === 'left') {
      newWidth = startResizeWidth - deltaX;
    }

    // Limitar el ancho (igual que el input range)
    newWidth = Math.max(300, Math.min(1200, newWidth));

    // Solo actualizamos la variable, el modal se redibujará automáticamente
    setModalWidth(Math.round(newWidth));
  };

  // Función para detener el resize
  const stopResize = (e: PointerEvent) => {
    if (!isResizing) return;

    // Detener todo inmediatamente
    e.stopPropagation();
    e.stopImmediatePropagation();
    e.preventDefault();

    // Restaurar transición
    if (dialogRef) {
      dialogRef.style.transition = 'width 0.2s';
      dialogRef.classList.remove('resizing');
    }

    // Guardar el ancho final (igual que hacía el input)
    if (props.resizable && resizeMode) {
      store.setSession(props.resizable, modalWidth().toString());
    }

    // Remover listeners con capture phase
    window.removeEventListener('pointermove', handleResizeMove, true);
    window.removeEventListener('pointerup', stopResize, true);
    window.removeEventListener('pointercancel', stopResize, true);

    isResizing = false;
    resizeMode = null;

    // IMPORTANTE: También prevenir el evento de clic que podría generarse después
    setTimeout(() => {
      isResizing = false;
    }, 10);
  };

  // Handler especial para el overlay click que verifica si estamos resizing
  const handleOverlayClick = (e: MouseEvent) => {
    if (!props.isOpen || isResizing) return;
    if (props.closeOnOverlayClick ?? true) props.onClose();
    e.stopPropagation();
  };

  const variantClass = props.variant === "blur" ? "modal-variant-blur" : "modal-variant-normal";
  const overlayTransparentClass = props.overlayTransparent ? "transparent" : "";

  // Focus management etc (igual que antes)
  let previouslyFocused: Element | null = null;
  const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function getFocusableElements(container: HTMLElement | null) {
    if (!container) return [] as HTMLElement[];
    return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)) as HTMLElement[];
  }

  function focusFirstElement() {
    const list = getFocusableElements(dialogRef ?? null);
    if (list.length) {
      list[0].focus();
      return;
    }
    dialogRef?.focus();
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (!props.isOpen) return;
    if (e.key === "Escape" && (props.closeOnEsc ?? true)) {
      e.preventDefault();
      e.stopPropagation();
      props.onClose();
      return;
    }

    if (e.key === "Tab") {
      const focusables = getFocusableElements(dialogRef ?? null);
      if (focusables.length === 0) {
        e.preventDefault();
        dialogRef?.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && (active === first || active === dialogRef)) {
        e.preventDefault();
        last.focus();
      }
    }
  }

  function stopPropagation(e: Event) {
    // No detener si estamos resizing
    if (isResizing) {
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (e instanceof PointerEvent) {
        e.preventDefault();
      }
    } else {
      e.stopPropagation();
    }
  }

  // Lock scroll & focus management
  createEffect(() => {
    if (props.isOpen) {
      previouslyFocused = document.activeElement;
      document.body.style.overflow = "hidden";
      setTimeout(() => {
        if (dialogRef) {
          dialogRef.setAttribute("tabindex", "-1");
          focusFirstElement();
        }
      }, 0);
      document.addEventListener("keydown", handleKeyDown, true);
    } else {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.body.style.overflow = "";
      try {
        (previouslyFocused as HTMLElement | null)?.focus?.();
      } catch { }
      // reset transform when closed so next open starts centered
      if (dialogRef) dialogRef.style.transform = "";
    }
  });

  onCleanup(() => {
    // Limpiar todos los listeners de resize
    window.removeEventListener('pointermove', handleResizeMove, true);
    window.removeEventListener('pointerup', stopResize, true);
    window.removeEventListener('pointercancel', stopResize, true);

    document.removeEventListener("keydown", handleKeyDown, true);
    document.body.style.overflow = "";
  });

  /* ------------------------------
     DRAG IMPLEMENTATION
     ------------------------------ */
  // props.draggable default
  const draggableMode = props.draggable ?? "header-footer";

  // drag state
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let currentY = 0;
  let dragging = false;
  let potentialDrag = false;
  let pointerId: number | null = null;
  const DRAG_THRESHOLD = 6; // px before we consider it an actual drag

  // Helper: detect interactive elements to avoid blocking them
  const INTERACTIVE_SELECTOR = "button, [role='button'], a, input, textarea, select, label, .no-drag, svg";

  function isInteractiveTarget(target: EventTarget | null) {
    if (!(target instanceof Element)) return false;
    return !!target.closest(INTERACTIVE_SELECTOR);
  }

  // Handler start - evitar si estamos resizing
  const onPointerDownForDrag = (e: PointerEvent) => {
    if (!dialogRef || isResizing) return;
    // Only allow drag if mode includes the clicked handle
    // ensure the down occurred on a drag-handle and not on interactive element
    const el = e.target as Element | null;
    const isInHeader = !!el?.closest?.(".modal-header");
    const isInFooter = !!el?.closest?.(".modal-footer");
    const handleAllowed =
      (draggableMode === "header" && isInHeader) ||
      (draggableMode === "header-footer" && (isInHeader || isInFooter));
    if (!handleAllowed) return;

    // If event target is interactive (close button, link, input...), do not start drag
    if (isInteractiveTarget(el)) {
      return;
    }

    // mark potential drag, store initial coords but do not start dragging yet
    potentialDrag = true;
    pointerId = e.pointerId ?? null;
    startX = e.clientX - currentX;
    startY = e.clientY - currentY;

    // capture pointer to the dialog so we get move/up
    try {
      (e.target as Element & { setPointerCapture?: (id: number) => void }).setPointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onPointerMoveForDrag = (e: PointerEvent) => {
    if (!potentialDrag && !dragging) return;
    if (!dialogRef) return;

    // if we haven't started dragging, check threshold
    const dx = e.clientX - (startX + currentX);
    const dy = e.clientY - (startY + currentY);
    const movedDistance = Math.hypot(e.clientX - (startX + currentX), e.clientY - (startY + currentY));

    if (!dragging) {
      // start drag only if distance exceeds threshold
      if (movedDistance >= DRAG_THRESHOLD) {
        dragging = true;
        // add class so css can disable selection
        dialogRef.classList.add("dragging");
        // set pointer capture if not already
        try {
          dialogRef.setPointerCapture(pointerId ?? e.pointerId);
        } catch { }
      } else {
        return; // don't update position yet
      }
    }

    // calculate new position relative to start
    currentX = e.clientX - startX;
    currentY = e.clientY - startY;

    // soft limits (prevent completely off-screen)
    const hedgeX = Math.max(window.innerWidth * 0.4, 200); // allow move but not too far
    const hedgeY = Math.max(window.innerHeight * 0.4, 120);
    currentX = Math.max(-hedgeX, Math.min(hedgeX, currentX));
    currentY = Math.max(-hedgeY, Math.min(hedgeY, currentY));

    dialogRef.style.transform = `translate(${currentX}px, ${currentY}px)`;
  };

  const onPointerUpForDrag = (e: PointerEvent) => {
    if (!potentialDrag && !dragging) return;
    potentialDrag = false;
    // release pointer capture
    try {
      (e.target as Element & { releasePointerCapture?: (id: number) => void }).releasePointerCapture?.(e.pointerId);
      dialogRef?.releasePointerCapture?.(e.pointerId);
    } catch { }
    // if we were dragging, keep translated position
    if (dragging && dialogRef) {
      dialogRef.classList.remove("dragging");
    }
    dragging = false;
    pointerId = null;
  };

  // Double click on header restores position (centers)
  const onHeaderDblClick = (e: Event) => {
    const me = e as MouseEvent;
    if (isInteractiveTarget(me.target)) return;

    currentX = 0;
    currentY = 0;
    dialogRef!.style.transform = "";
  };

  // Add/remove listeners when modal mounts/unmounts
  createEffect(() => {
    if (props.isOpen && dialogRef) {
      // pointer handling on the dialog (we listen capture on dialog for pointerdown to detect drag handles)
      dialogRef.addEventListener("pointerdown", onPointerDownForDrag);
      window.addEventListener("pointermove", onPointerMoveForDrag);
      window.addEventListener("pointerup", onPointerUpForDrag);
      // dblclick on header
      const header = dialogRef.querySelector<HTMLElement>(".modal-header");
      header?.addEventListener("dblclick", onHeaderDblClick);
    } else {
      // cleanup
      dialogRef?.removeEventListener("pointerdown", onPointerDownForDrag);
      window.removeEventListener("pointermove", onPointerMoveForDrag);
      window.removeEventListener("pointerup", onPointerUpForDrag);
      const header = dialogRef?.querySelector<HTMLElement>(".modal-header");
      header?.removeEventListener("dblclick", onHeaderDblClick);
      // reset flags
      potentialDrag = false;
      dragging = false;
    }
  });

  onMount(() => {
    if (props.resizable) {
      const savedWidth = store.watchSession(props.resizable)()
      if (savedWidth) {
        const width = parseInt(savedWidth, 10);
        if (width >= 300 && width <= 1200) {
          setModalWidth(width);
        }
      }
    }
  });

  onCleanup(() => {
    dialogRef?.removeEventListener("pointerdown", onPointerDownForDrag);
    window.removeEventListener("pointermove", onPointerMoveForDrag);
    window.removeEventListener("pointerup", onPointerUpForDrag);
    const header = dialogRef?.querySelector(".modal-header");
    header?.removeEventListener("dblclick", onHeaderDblClick);
  });

  /* ------------------------------
     RENDER
     ------------------------------ */
  return (
    <>
      {props.isOpen && (
        <Portal>
          <div
            class={`modal-overlay ${variantClass} ${overlayTransparentClass}`}
            style={{ "z-index": String(props.zIndex ?? 1000) }}
            role="presentation"
            onClick={handleOverlayClick}
          >
            <div class="modal-container">
              <div
                ref={(el) => (dialogRef = el as HTMLDivElement)}
                class={`modal-content ${sizeClasses[props.size ?? "md"]}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby={props.title ? titleId : undefined}
                aria-describedby={bodyId}
                onClick={stopPropagation}
                onPointerDown={stopPropagation}
                tabIndex={-1}
                style={{
                  "z-index": String((props.zIndex ?? 1000) + 1),
                  "width": `${modalWidth()}px`,
                  "max-width": '95vw',
                  "transition": 'width 0.2s',
                  ...(props.style || {})
                }}
              >
                {/* Handles de resize solo si resizable tiene valor */}
                {props.resizable && (
                  <>
                    <div
                      class="modal-resize-handle modal-resize-handle-left"
                      onPointerDown={(e) => startResize(e, 'left')}
                    />
                    <div
                      class="modal-resize-handle modal-resize-handle-right"
                      onPointerDown={(e) => startResize(e, 'right')}
                    />
                  </>
                )}

                {/* Header sin controles de resize */}
                <header class="modal-header modal-drag-handle" aria-hidden={false}>
                  <h2 id={titleId} class="modal-title">
                    {typeof props.title === "function" ? props.title() : props.title || ""}
                  </h2>

                  {props.resizable && modalWidth() !== defaultWidth && (
                    <div class="modal-resize-controls">
                      <button
                        type="button"
                        class="modal-reset-button"
                        onClick={() => {
                          setModalWidth(defaultWidth);
                          store.deleteSession(props.resizable!);
                        }}
                        title="Restaurar tamaño por defecto"
                      >
                        ↺
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    class="modal-close-button"
                    aria-label="Cerrar"
                    onClick={() => props.onClose()}
                  >
                    <Icon name="x" stroke="currentColor" />
                  </button>
                </header>

                {/* Body */}
                <div id={bodyId} class="modal-body" style={props.bodyStyle}>
                  <div class="modal-body-content" style={props.style}>
                    {resolvedChildren()}
                  </div>
                </div>

                {/* Footer: lo marcamos drag-handle si existe */}
                <footer class={`modal-footer ${draggableMode ? "modal-drag-handle" : ""}`}>
                  {props.footer ? (
                    typeof props.footer === "function" ? props.footer() : props.footer
                  ) : props.onConfirm ? (
                    <div class="modal-footer-actions">
                      <button type="button" class="btn btn-secondary" onClick={() => props.onClose?.()}>
                        Cancelar
                      </button>
                      <button type="button" class="btn btn-primary" onClick={() => props.onConfirm?.()}>
                        Confirmar
                      </button>
                    </div>
                  ) : null}
                </footer>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}