import { TableField } from "../../types/schema";
import FormatAttachmentShow from "./field-formats/Attachment/FormatAttachmentShow";
import FormatBoolShow from "./field-formats/Bool/FormatBoolShow";
import FormatDateShow from "./field-formats/Date/FormatDateShow";
import FormatListShow from "./field-formats/List/FormatListShow";
import FormatNumberShow from "./field-formats/Number/FormatNumberShow";
import FormatRelationShow from "./field-formats/Relation/FormatRelationShow";
import FormatStringShow from "./field-formats/String/FormatStringShow";
import FormatTextShow from "./field-formats/Text/FormatTextShow";

export type FieldController = {
  target?: HTMLElement | null;
  validate?: (options?: object) => Promise<boolean>;
  getValue?: () => any;
  reset?: () => void;
};

export interface FieldProps {
  field: Partial<TableField>;
  record?: any;
  controller?: FieldController;
  onInput?: (value: any) => void;
  onChange?: (value: any) => void;
  onBlur?: (event: FocusEvent) => void;
  onFocus?: (event: FocusEvent) => void;
}

export interface FieldShowProps {
  field: Partial<TableField>;
  record: any;
  onlyValue?: boolean
}

// Crear controller vacío para que los campos lo muten
export const createFieldController = (): FieldController => {
  return {
    validate: async () => true, // Los campos sobreescribirán esto
    getValue: () => undefined, // Los campos sobreescribirán esto
    reset: () => { } // Los campos sobreescribirán esto
  };
};

export default function FieldShow(props: FieldShowProps) {
  if (props.field.isVisible === false) {
    return <></>;
  }
  switch (props.field.fieldFormat) {
    case 'list':
      return <FormatListShow {...props} />
    case 'relation':
      return <FormatRelationShow {...props} />
    case 'string':
      return <FormatStringShow {...props} />
    case 'text':
      return <FormatTextShow {...props} />
    case 'int':
    case 'float':
      return <FormatNumberShow {...props} />
    case 'bool':
      return <FormatBoolShow {...props} />
    case 'date':
    case 'datetime':
    case 'time':
      return <FormatDateShow {...props} />
    case 'attachment':
      return <FormatAttachmentShow {...props} />
    default:
      return <FormatStringShow {...props} />
  }
}
