import { store } from "../../app";
import { TableField } from "../../types/schema"
import FieldShow from "./FieldShow";

type FieldsShowProps = {
  tableIdentifier: string;
  record: any;
  fields?: Partial<TableField>[];
}

export default function RecordDetails(props: FieldsShowProps) {

  if (!props.fields)
    props.fields = store.getTableFieldsFor(props.tableIdentifier);

  return (
    <div class="record-show">
      {props.fields.map((field) => (
        <FieldShow
          field={field}
          record={props.record}
        />
      ))}
    </div>
  );
}