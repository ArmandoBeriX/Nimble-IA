// RecordSet.tsx
import { store } from "../../app";
import { TableField } from "../../types/schema";
import FieldEdit from "./FieldEdit";
import type { FormController } from "./form-controller";

type RecordSetProps = {
  tableIdentifier: string;
  formController: FormController;
  fields?: Partial<TableField>[];
  record?: any;
  onChange?: (updatedRecord: any) => void;
};

export default function RecordSet(props: RecordSetProps) {

  const fields =
    props.fields ??
    store.getTableFieldsFor(props.tableIdentifier);

  const handleFieldChange = (fieldIdentifier: string, value: any) => {
    props.onChange?.({
      ...props.record,
      [fieldIdentifier]: value
    });
  };

  return (
    <div class="field-form">
      {fields.map((field) => {
        const controller = props.formController.registerField(field.identifier!);

        return (
          <FieldEdit
            field={field}
            record={props.record}
            controller={controller}
            onChange={(value) =>
              handleFieldChange(field.identifier!, value)
            }
          />
        );
      })}
    </div>
  );
}
