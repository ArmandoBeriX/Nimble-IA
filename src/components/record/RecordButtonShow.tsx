import { JSXElement, createSignal } from "solid-js";
import { ModalProps, modalStore } from "../../lib/modal-store";
import Button, { ButtonProps } from "../ui/Button";
import { store } from "../../app";
import FieldsShow from "../fields/RecordDetails";
import RecordSkeletonLoader from "./RecordSkeletonLoader";
import Icon from "../ui/icon/Icon";
import WithTooltip from "../ui/tooltip/WithTooltip";

export default function RecordButtonShow(props: {
  tableIdentifier: string;
  id: string;
  children?: string | JSXElement;
  buttonProps?: ButtonProps;
  modalProps?: Partial<ModalProps>;
}): JSXElement {
  const recordName =
    store.getTable(props.tableIdentifier)?.name || props.tableIdentifier;

  const [loading, setLoading] = createSignal(false); // loading del botón

  const openShowRecord = async () => {
    // Abrimos modal inmediatamente con "Cargando..."
    const modalId = modalStore.openModal({
      ...props.modalProps,
      title: `${recordName}`,
      children: () => <RecordSkeletonLoader tableIdentifier={props.tableIdentifier} />,
      footer: () => (
        <Button
          variant="secondary"
          onClick={() => modalStore.closeModal(modalId)}
          disabled={loading()}
        >
          Cerrar
        </Button>
      ),
    });

    try {
      setLoading(true);
      const record = (await store.query(props.tableIdentifier, { id: props.id }))?.[0];
      if (!record) throw new Error("Record not found");

      // Actualizamos modal con FieldsShow y footer activo
      modalStore.updateModal(modalId, {
        children: () => <FieldsShow record={record} tableIdentifier={props.tableIdentifier} />,
        footer: () => (
          <Button
            variant="secondary"
            onClick={() => modalStore.closeModal(modalId)}
          >
            Cerrar
          </Button>
        ),
      });
    } catch (e) {
      console.error("Failed to load record", e);
      modalStore.closeModal(modalId);
    } finally {
      setLoading(false);
    }
  };

  return (
    <WithTooltip tooltip={`Ver ${recordName}`} contentClass={props.buttonProps?.fullWidth ? 'w-full' : ''}>
      <Button
        {...props.buttonProps}
        size="sm"
        variant="ghost"
        onClick={(e)=>{props.buttonProps?.onClick?.(e); openShowRecord();}}
        loading={loading()}
        disabled={loading()}
      >
        {props.children || props.buttonProps?.text || <div title="Ver"><Icon name="eye" /></div>}
      </Button>
    </WithTooltip>
  );
}
