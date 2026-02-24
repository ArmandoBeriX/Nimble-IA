import { JSXElement } from "solid-js";
import RecordButtonCreate from "./RecordButtonCreate";
import RecordButtonDelete from "./RecordButtonDelete";
import RecordButtonShow from "./RecordButtonShow";
import RecordButtonUpdate from "./RecordButtonUpdate";
import { ButtonProps } from '../ui/Button';
import { ModalProps } from "../../lib/modal-store";

export default function RecordButtonAction(props: {
  tableIdentifier: string;
  action: 'create' | 'show' | 'update' | 'delete' | 'bulk_delete' | 'bulk_update';
  id?: string;
  children?: string | JSXElement;
  buttonProps?: ButtonProps;
  modalProps?: Partial<ModalProps>;
  initialValues?: Record<string, any>;
}) {
  if (['show', 'update', 'delete', 'bulk_update', 'bulk_delete'].indexOf(props.action) !== -1 && props.id === undefined) {
    throw new Error("RecordButtonAction: 'id' prop is required for 'show', 'update' and 'delete' actions");
  }
  const properties = {
    ...props,
    modalProps: { ...props.modalProps, resizable: props.tableIdentifier },
  }
  if (props.action === 'show') {
    return (
      <RecordButtonShow {...properties} id={props.id!} />
    );
  } else if (props.action === 'update') {
    return (
      <RecordButtonUpdate {...properties} id={props.id!} />
    );
  } else if (props.action === 'delete') {
    return (
      <RecordButtonDelete {...properties} id={props.id!} />
    );
  } else if (props.action === 'create') {
    return (
      <RecordButtonCreate {...properties} initialValues={props.initialValues} />
    );
  } else if (props.action === 'bulk_update') {
    return (
      <RecordButtonUpdate {...properties} id={props.id!} />
    );
  } else if (props.action === 'bulk_delete') {
    return (
      <RecordButtonDelete {...properties} id={props.id!} />
    );
  } else {
    return null;
  }
}