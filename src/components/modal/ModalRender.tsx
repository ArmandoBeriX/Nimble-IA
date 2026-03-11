// src/components/Modal/ModalRenderer.tsx
import { For, Show } from "solid-js";
import { modalStore } from "../../lib/modal-store";
import Modal from "./Modal";
import "./modal.css";

export default function ModalRenderer() {
  const modals = modalStore.modals;
 
  return (
    <For each={modals()}>
      {(modal) => (
        <Show when={modal.isOpen} keyed>
          <Modal
            {...modal}
            onClose={() => modalStore.closeModal(modal.id)}
            style={{ "z-index": modal.zIndex }}
          >
            {/* Si children es función la ejecutamos aquí dentro del owner */}
            {typeof modal.children === "function" ? modal.children() : modal.children}
          </Modal>
        </Show>
      )}
    </For>
  );
}
