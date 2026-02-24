import { JSXElement, createMemo, createSignal } from "solid-js";
import { ModalProps, modalStore } from "../../lib/modal-store";
import Button, { ButtonProps } from "../ui/Button";
import { store } from "../../app";
import RecordSet from "../fields/RecordSet";
import RecordSkeletonLoader from "./RecordSkeletonLoader";
import createFormController from "../fields/form-controller";
import Icon from "../ui/icon/Icon";
import WithTooltip from "../ui/tooltip/Tooltip";
import { useRecordQuery } from "../../hooks/useRecords";

export default function RecordButtonUpdate(props: {
  tableIdentifier: string;
  id: string;
  children?: string | JSXElement;
  buttonProps?: ButtonProps;
  modalProps?: Partial<ModalProps>;
}): JSXElement {
  const recordName = store.getTable(props.tableIdentifier)?.name || props.tableIdentifier;

  const [loading, setLoading] = createSignal(false); // loading de botón
  const formController = createFormController();

  const openUpdateRecord = async () => {
    // Abrimos modal inmediatamente con "Cargando..."
    // TODO usar esqueleto de loading a partir de tableIdentifer.
    const modalId = modalStore.openModal({
      title: `Editar ${recordName}`,
      children: () => <RecordSkeletonLoader tableIdentifier={props.tableIdentifier} />,
      footer: () => (
        <Button variant="secondary" onClick={() => modalStore.closeModal(modalId)}>
          Cancelar
        </Button>
      ),
    });

    let errorEl: HTMLElement;
    const [errors, setErrors] = createSignal<Array<string>>([])
    try {
      // TODO, usar useRecordQuery, para que este actualizado por si cambia mientras estoy
      // Cargar record
      const firstLoad = (await store.query(props.tableIdentifier, { id: props.id }))?.[0];
      const {data} = useRecordQuery(props.tableIdentifier, { id: props.id })
      const record = createMemo(()=>{
        return data()?.[0] || firstLoad;
      })

      if (!record()) throw new Error("Record not found");

      // Actualizar modal con RecordSet y footer activo
      modalStore.updateModal(modalId, {
        ...props.modalProps,
        children: () => (
          <>
            <div ref={el => errorEl = el} style={{ display: errors().length === 0 ? "none" : "" }} class="flash error">{errors().join("\n")}</div>
            <RecordSet record={record()} tableIdentifier={props.tableIdentifier} formController={formController} />
          </>
        ),
        footer: () => (
          <>
            {/* Izquierda */}
            <div class="footer-left">
              <Button
                variant="ghost"
                disabled={loading()}
                onClick={() => formController.reset()}
              >
                Reset
              </Button>
            </div>

            {/* Derecha */}
            <div class="footer-right">
              <Button
                variant="secondary"
                disabled={loading()}
                onClick={() => modalStore.closeModal(modalId)}
              >
                Cancelar
              </Button>

              <Button
                loading={loading()}
                disabled={loading()}
                onClick={async () => {
                  setLoading(true);
                  try {
                    setErrors([])
                    const valid = await formController.validate();
                    if (!valid) return;

                    await store.update(props.tableIdentifier, {
                      ...formController.getValues(),
                      id: props.id,
                    });
                    formController.reset();
                    modalStore.closeModal(modalId);
                  } catch (e: any) {
                    setErrors([e.message])
                    errorEl.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                    console.error("Update record failed", e);
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                Guardar
              </Button>
            </div>
          </>
        ),
      });
    } catch (e) {
      console.error("Failed to load record", e);
      modalStore.closeModal(modalId);
    }
  };

  return (
    <WithTooltip tooltip={`Editar ${recordName}`}>
      <Button
        size="sm"
        variant="ghost"
        onClick={openUpdateRecord}
        loading={loading()}
        disabled={loading()}
        {...props.buttonProps}
      >
        {props.children || props.buttonProps?.text || <Icon name="edit" />}
      </Button>
    </WithTooltip>
  );
}
