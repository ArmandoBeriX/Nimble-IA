import { JSXElement, Show, createSignal, onCleanup } from "solid-js";
import { ModalProps, modalStore } from "../../lib/modal-store";
import Button, { ButtonProps } from "../ui/Button";
import { store } from "../../app";
import { recordDysplay } from '../utils/FormatInterpreter';
import Icon from "../ui/icon/Icon";
import WithTooltip from "../ui/tooltip/Tooltip";

export default function RecordButtonDelete(props: {
  tableIdentifier: string;
  id: string;
  children?: string | JSXElement;
  skipConfirmation?: boolean;
  buttonProps?: ButtonProps;
  modalProps?: Partial<ModalProps>;
}): JSXElement {
  const table = store.getTable(props.tableIdentifier)
  const tableName = table?.name || props.tableIdentifier;
  let mounted = true
  const [dysplay, setDysplay] = createSignal<(() => string | JSXElement)>(() => props.id);

  store.query(props.tableIdentifier, { id: props.id }).then((records) => {
    if (mounted && records && records.length > 0) {
      const rec = records[0];
      if (table) {
        setDysplay(() => () => recordDysplay(table, rec))
      }
    }
  });

  const skipKey = `skip_delete_confirmation_${props.tableIdentifier}`;

  const skipConfirm = store.watchSession(skipKey);

  const [loading, setLoading] = createSignal(false);

  const doDelete = async () => {
    try {
      setLoading(true);
      await store.delete(props.tableIdentifier, props.id);
    } finally {
      setLoading(false);
    }
  };

  onCleanup(() => {
    mounted = false
  })

  const openDeleteRecord = () => {
    // ✅ si la sesión indica no confirmar → eliminar directo
    if (skipConfirm()) {
      void doDelete();
      return;
    }

    let remember = props.skipConfirmation ?? false;

    const modalId = modalStore.openModal({
      ...props.modalProps,
      size: "sm",
      title: `Confirmar Eliminar`,
      children: () => (
        <>
          <p>¿Está seguro de eliminar este {tableName.toLowerCase()}?:</p>
          <strong class="flex py-3">{dysplay()()}</strong>
        </>
      ),
      footer: () => (
        <>
          <div class="footer-left">
            <label class="checkbox-gohst">
              <input
                type="checkbox"
                onChange={(e) => (remember = e.currentTarget.checked)}
              />
              Saltar confirmación por 3 minutos
            </label>
          </div>

          <Button
            variant="secondary"
            onClick={() => modalStore.closeModal(modalId)}
            disabled={loading()}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            loading={loading()}
            disabled={loading()}
            onClick={async () => {
              if (remember) {
                await store.setSession(
                  skipKey,
                  true,
                  0,
                  3 * 60 * 1000
                );
              }

              await doDelete();
              modalStore.closeModal(modalId);
            }}
          >
            Eliminar
          </Button>
        </>
      ),
    });
  };

  return (
    <WithTooltip tooltip={<>Eliminar {tableName}{skipConfirm() ? <span class="text-red-400">{" (sin confirmación)"}</span> : ""}</>}>
      <Button
        hasConfirm={!skipConfirm()}
        size="sm"
        variant="ghost"
        onClick={openDeleteRecord}
        loading={loading()}
        disabled={loading()}
        {...props.buttonProps}
      >
        {props.children || props.buttonProps?.text || <Icon name="del" stroke="darkred" />}
      </Button>
    </WithTooltip>
  );
}
