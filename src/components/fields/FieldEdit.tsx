import { createEffect } from "solid-js";
import { MaybeSignal } from "../../hooks/useRecords";
import { TableField } from "../../types/schema";
import FormatAttachmentEdit from "./field-formats/Attachment/FormatAttachmentEdit";
import FormatBoolEdit from "./field-formats/Bool/FormatBoolEdit";
import FormatDateEdit from "./field-formats/Date/FormatDateEdit";
import FormatListEdit from "./field-formats/List/FormatListEdit";
import FormatNumberEdit from "./field-formats/Number/FormatNumberEdit";
import FormatRelationEdit from "./field-formats/Relation/FormatRelationEdit";
import FormatStringEdit from "./field-formats/String/FormatStringEdit";
import FormatTextEdit from "./field-formats/Text/FormatTextEdit";
import createFormController from "./form-controller";
import FormatJsonEdit from "./field-formats/Json/FormatJsonEdit";

export type FieldController = {
  target?: HTMLElement | null;
  validate?: (options?: object) => Promise<boolean>;
  getValue?: () => any;
  reset?: (value?: any) => void;
};

export interface FieldProps {
  field: Partial<TableField>;
  record?: any;
  value?: MaybeSignal<any>;
  controller?: FieldController;
  onInput?: (value: any) => void;
  onChange?: (value: any) => void;
  onBlur?: (event?: FocusEvent) => void;
  onFocus?: (event?: FocusEvent) => void;
  isFieldForm?: boolean; // default: true.Indica si se renderizara como campo de un fieldForm (en un contenedor con el label e indicadores) o solo el campo sin esto.
  isOptionDisabled?: (value: any) => boolean; // Para ser usado en los de tipo List o Relation
}

// Crear controller vacío para que los campos lo muten
export const createFieldController = (): FieldController => {
  return {
    validate: async () => true, // Los campos sobreescribirán esto
    getValue: () => undefined, // Los campos sobreescribirán esto
    reset: () => { } // Los campos sobreescribirán esto
  };
};

export default function FieldEdit(props: FieldProps) {
  if (!props.field.isEditable) {
    return <></>;
  }

  const FieldContent = (fieldProps: FieldProps) => {
    switch (props.field.fieldFormat) {
      case 'list':
        return <FormatListEdit {...fieldProps} />
      case 'relation':
        return <FormatRelationEdit {...fieldProps} />
      case 'string':
        return <FormatStringEdit {...fieldProps} />
      case 'text':
        return <FormatTextEdit {...fieldProps} />
      case 'int':
      case 'float':
        return <FormatNumberEdit {...fieldProps} />
      case 'bool':
        return <FormatBoolEdit {...fieldProps} />
      case 'date':
      case 'datetime':
      case 'time':
        return <FormatDateEdit {...fieldProps} />
      case 'attachment':
        return <FormatAttachmentEdit {...fieldProps} />
      case 'json':
        return <FormatJsonEdit {...fieldProps} />
      default:
        return <FormatStringEdit {...fieldProps} />
    }
  }

  if (typeof props.value === 'function') {
    const controller = createFormController()
    createEffect(()=>{
      controller.reset(props.value());
    })
    return <FieldContent {...props} record={{[props.field.identifier!]: props.value()}} controller={controller} />
  } else
    return <FieldContent {...props} />
}
