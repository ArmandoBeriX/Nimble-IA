import { JSXElement, createSignal } from "solid-js";
import { ModalProps, modalStore } from "../../lib/modal-store";
import Button, { ButtonProps } from "../ui/Button";
import { store } from "../../app";
import RecordSet from "../fields/RecordSet";
import createFormController from "../fields/form-controller";
import Icon from "../ui/icon/Icon";
import WithTooltip from "../ui/tooltip/WithTooltip";

export default function RecordButtonCreate(props: {
  tableIdentifier: string;
  children?: string | JSXElement;
  buttonProps?: ButtonProps;
  modalProps?: Partial<ModalProps>;
  initialValues?: Record<string, any> | (() => Record<string, any>);
}): JSXElement {
  const initialValues = typeof props.initialValues === 'function' ? props.initialValues?.() : props.initialValues || {};
  const recordName = store.getTable(props.tableIdentifier)?.name || props.tableIdentifier;

  const rememberKey = `remember_create_form_${props.tableIdentifier}`;

  const [loading, setLoading] = createSignal(false);

  const openCreateRecord = () => {
    const formController = createFormController();

    const rememberSession = store.watchSession(rememberKey);
    const [remember, setRemember] = createSignal<boolean>(!!rememberSession());

    let modalId: string;
    modalId = modalStore.openModal({
      ...props.modalProps,
      size: "md",
      closeOnOverlayClick: false,
      title: `Añadir ${recordName}`,
      children: () => (
        <RecordSet tableIdentifier={props.tableIdentifier} formController={formController} record={initialValues} />
      ),
      footer: () => (
        <>
          {/* Izquierda */}
          <div class="footer-left">
            <label class="checkbox-gohst">
              <input
                type="checkbox"
                checked={remember()}
                disabled={loading()}
                onChange={(e) =>
                  store.setSession(
                    rememberKey,
                    e.currentTarget.checked,
                  ).then(() => setRemember(e.currentTarget.checked))
                }
              />
              <span style="color: #808080" title="Al abrir un nuevo formulario recordará estos valores">
                Recordar formulario
              </span>
            </label>

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
                  const valid = await formController.validate();
                  if (!valid) return;

                  await store.insert(
                    props.tableIdentifier,
                    formController.getValues()
                  );

                  if (!remember()) {
                    formController.reset();
                  }

                  modalStore.closeModal(modalId);
                } catch (e) {
                  console.error("Create record failed", e);
                } finally {
                  setLoading(false);
                }
              }}
            >
              Crear
            </Button>
          </div>
        </>
      ),
    });
  };

  return (
    <WithTooltip tooltip={`Añadir ${recordName}`}>
      <Button
        size="sm"
        variant="ghost"
        onClick={openCreateRecord}
        loading={loading()}
        disabled={loading()}
        {...props.buttonProps}
      >
        {props.children || props.buttonProps?.text || <Icon name="add" />}
      </Button>
    </WithTooltip>
  );
}