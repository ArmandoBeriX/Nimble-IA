// src/hooks/useModal.ts
import { modalStore } from '../lib/modal-store';

// Hook que siempre retorna la misma instancia del store
export function useModal() {
  return modalStore;
}

export type { ModalProps, ModalState } from '../lib/modal-store';