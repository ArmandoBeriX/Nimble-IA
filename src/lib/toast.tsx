/* toast.tsx */
import { createSignal, createEffect, onMount, onCleanup, For, JSX } from "solid-js";

type ToastKind = "info" | "success" | "error";
type ToastItem = { id: string; kind: ToastKind; title?: string; html?: string; ttl?: number };

const uid = () => Math.random().toString(36).slice(2, 9);

export const toast = {
  _pushe: (item: Omit<ToastItem, "id">) => {
    const id = uid();
    _add({ id, ...item });
    return id;
  },
  show: (title: string, opts?: { html?: string; ttl?: number }) => toast._pushe({ kind: "info", title, html: opts?.html, ttl: opts?.ttl }),
  success: (title: string, opts?: { html?: string; ttl?: number }) => toast._pushe({ kind: "success", title, html: opts?.html, ttl: opts?.ttl }),
  error: (title: string, opts?: { html?: string; ttl?: number }) => toast._pushe({ kind: "error", title, html: opts?.html, ttl: opts?.ttl }),
  dismiss: (id: string) => _remove(id),
};

let _add: (t: ToastItem) => void = () => { };
let _remove: (id: string) => void = () => { };

/* ToastRoot: montar en raíz */
export function ToastRoot(props: { position?: "top-right" | "bottom-right" | "top-left" | "bottom-left" }) {
  const [items, setItems] = createSignal<ToastItem[]>([]);
  const position = props.position ?? "top-right";

  _add = (t: ToastItem) => {
    setItems((s) => [...s, t]);
    if (t.ttl !== 0) {
      const ttl = t.ttl ?? 4000;
      setTimeout(() => _remove(t.id), ttl);
    }
  };
  _remove = (id: string) => setItems((s) => s.filter(x => x.id !== id));

  // HINT mechanic
  let hintEl: HTMLDivElement | null = null;
  let activeTarget: Element | null = null;
  let hintHideTimer: any = null;
  let showDelayTimer: any = null;
  let touchTimer: any = null;
  const SHOW_DELAY = 200;
  const HINT_TTL = 5000;
  const LONG_TOUCH_MS = 600;

  function sanitizeHtml(s: string) {
    // simple sanitizer: allow a few tags. If necesitas más robusto, integra DOMPurify.
    return s.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  }

  function showHintFor(target: Element, html: string | null, text: string | null) {
    if (!hintEl) return;
    clearTimeout(hintHideTimer);
    activeTarget = target;

    // contenido
    if (html) hintEl.innerHTML = sanitizeHtml(html);
    else hintEl.textContent = text ?? "";

    // estilos protectores mínimos
    hintEl.style.maxWidth = '320px';
    hintEl.style.position = 'absolute';
    hintEl.style.whiteSpace = 'normal';

    // medir y posicionar con flip
    const rect = target.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const hintW = Math.min(120, viewportW - 16); // 8px margen ambos lados
    hintEl.style.width = `${hintW}px`;

    // colocamos centrado respecto al target (transform) y ajustamos top/left
    const centerX = rect.left + rect.width / 2 + window.scrollX;
    // prefer bottom
    let top = rect.bottom + 8 + window.scrollY;
    let placeAbove = false;
    // si no cabe abajo, intentar arriba
    if (top + hintEl.offsetHeight > window.scrollY + viewportH - 8) {
      placeAbove = true;
      top = rect.top - 8 - hintEl.offsetHeight + window.scrollY;
    }
    // si aun así sale fuera, clamp vertical
    top = Math.max(8 + window.scrollY, Math.min(top, window.scrollY + viewportH - 8 - hintEl.offsetHeight));

    // left centrado y clamp
    let left = centerX;
    left = Math.max(window.scrollX + 8 + hintW / 2, Math.min(left, window.scrollX + viewportW - 8 - hintW / 2));

    hintEl.style.left = `${left}px`;
    hintEl.style.top = `${top}px`;
    hintEl.style.transform = `translateX(-50%)`;
    hintEl.classList.add("nimble-hint-visible");

    hintHideTimer = setTimeout(() => hideHint(), HINT_TTL);
  }

  function hideHint() {
    if (!hintEl) return;
    hintEl.classList.remove("nimble-hint-visible");
    clearTimeout(hintHideTimer);
    activeTarget = null;
  }

  function attachDelegatedHandlers() {
    const doc = document;

    // pointerover/out (bubbling) to handle hover
    function onPointerOver(e: PointerEvent) {
      const el = (e.target as Element).closest && (e.target as Element).closest("[title],[data-hint]") as Element | null;
      if (!el) return;
      // take title to data-__title to prevent native tooltip
      const title = el.getAttribute("title");
      if (title) {
        el.setAttribute("data-nimble-title", title);
        el.removeAttribute("title");
      }
      // schedule show
      clearTimeout(showDelayTimer);
      showDelayTimer = setTimeout(() => {
        const html = el.getAttribute("data-hint");
        const text = el.getAttribute("data-nimble-title") ?? el.getAttribute("title");
        showHintFor(el, html ?? null, text ?? null);
      }, SHOW_DELAY);
    }

    function onPointerOut(e: PointerEvent) {
      const el = (e.target as Element).closest && (e.target as Element).closest("[data-nimble-title],[data-hint]") as Element | null;
      if (!el) return;
      clearTimeout(showDelayTimer);
      // restore title if we moved it
      const stored = el.getAttribute("data-nimble-title");
      if (stored) {
        el.setAttribute("title", stored);
        el.removeAttribute("data-nimble-title");
      }
      // delay hide slightly to allow moving into hint
      clearTimeout(hintHideTimer);
      hintHideTimer = setTimeout(() => hideHint(), 180);
    }

    // touch long press
    function onTouchStart(e: TouchEvent) {
      const el = (e.target as Element).closest && (e.target as Element).closest("[title],[data-hint]") as Element | null;
      if (!el) return;
      touchTimer = setTimeout(() => {
        const html = el.getAttribute("data-hint");
        const text = el.getAttribute("title") ?? el.getAttribute("data-nimble-title");
        showHintFor(el, html ?? null, text ?? null);
      }, LONG_TOUCH_MS);
    }
    function onTouchEnd(e: TouchEvent) {
      clearTimeout(touchTimer);
      // keep hint visible until user taps elsewhere or after TTL
    }

    doc.addEventListener("pointerover", onPointerOver);
    doc.addEventListener("pointerout", onPointerOut);
    doc.addEventListener("touchstart", onTouchStart, { passive: true });
    doc.addEventListener("touchend", onTouchEnd);

    // cleanup
    onCleanup(() => {
      doc.removeEventListener("pointerover", onPointerOver);
      doc.removeEventListener("pointerout", onPointerOut);
      doc.removeEventListener("touchstart", onTouchStart);
      doc.removeEventListener("touchend", onTouchEnd);
    });
  }

  onMount(() => {
    // create hint element
    hintEl = document.createElement("div");
    hintEl.className = "nimble-hint";
    // allow interaction in hint
    hintEl.addEventListener("pointerenter", () => clearTimeout(hintHideTimer));
    hintEl.addEventListener("pointerleave", () => {
      hintHideTimer = setTimeout(() => hideHint(), 300);
    });
    document.body.appendChild(hintEl);

    attachDelegatedHandlers();
  });

  onCleanup(() => {
    const el = document.querySelector(".nimble-hint");
    if (el) el.remove();
  });

  return (
    <>
      <div class={`nimble-toasts nimble-toasts--${position}`}>
        <For each={items()}>
          {(t) => (
            <div class={`nimble-toast nimble-toast--${t.kind}`} role="status" aria-live="polite">
              <div class="nimble-toast-body" innerHTML={t.html ? t.html : (t.title ?? "")} />
              <button class="nimble-toast-close" onClick={() => _remove(t.id)} aria-label="Cerrar">×</button>
            </div>
          )}
        </For>
      </div>
    </>
  );
}
