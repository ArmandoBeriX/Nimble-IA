// src/stores/modal-store.ts
import { createRoot, createSignal, JSX, JSXElement } from "solid-js";

export type ModalSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface ModalProps {
  title: string | (() => JSXElement);
  children: string | (() => JSXElement);
  footer?: () => JSXElement;
  resizable?: string;
  size?: ModalSize;
  onClose?: () => void;
  onConfirm?: () => void;
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  bodyStyle?: JSX.CSSProperties;
}

export interface ModalState extends ModalProps {
  id: string;
  isOpen: boolean;
  zIndex: number;
}

function createModalStore() {
  const [modals, setModals] = createSignal<ModalState[]>([]);
  let nextZIndex = 1000;

  // ID seguro y síncrono (funciona fuera de createRoot)
  const createId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);

  const openModal = (props: ModalProps): string => {
    const id = createId();
    const zIndex = nextZIndex++;
    const newModal: ModalState = {
      ...props,
      id,
      isOpen: true,
      zIndex,
      closeOnOverlayClick: props.closeOnOverlayClick ?? true,
      closeOnEsc: props.closeOnEsc ?? true,
    };
    setModals(prev => [newModal, ...prev]);
    return id;
  };

  const closeModal = (id: string) => {
    const modal = modals().find(m => m.id === id);
    modal?.onClose?.();
    setModals(prev => prev.filter(m => m.id !== id));
  };

  const closeAllModals = () => {
    modals().forEach(m => m.onClose?.());
    setModals([]);
  };

  const updateModal = (id: string, updates: Partial<Omit<ModalProps, "id">>) => {
    setModals(prev => prev.map(m => (m.id === id ? { ...m, ...updates } : m)));
  };

  return {
    modals,
    openModal,
    closeModal,
    closeAllModals,
    updateModal,
  };
}

// IMPORTANT: crear el store dentro de un root para que Solid gestione las computations
export const modalStore = createRoot(createModalStore);