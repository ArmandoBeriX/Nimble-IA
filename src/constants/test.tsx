import FormatList from "../components/fields/field-formats/List/FormatListEdit";
import FormatRelation from "../components/fields/field-formats/Relation/FormatRelationEdit";
import FormatString from "../components/fields/field-formats/String/FormatStringEdit";
import FieldInput from "../components/fields/FieldEdit";
import FieldSet from "../components/fields/RecordSet";
import { TableField } from "../types/schema";

// Ejemplo de configuración de TableFields variados
export const tableFieldsExample: Partial<TableField>[] = [
  {
    identifier: "firstname",
    name: "Nombre",
    fieldFormat: "string",
    isRequired: true,
    isEditable: true,
    storeData: {
      placeholder: "Escriba el nombre...",
    },
  },
  {
    identifier: "description",
    name: "Descripcion",
    fieldFormat: "text",
    isRequired: true,
    isEditable: true,
    storeData: {
      placeholder: "Escriba descripcion...",
    },
  },
  {
    identifier: "attachment",
    name: "File",
    fieldFormat: "attachment",
    relationTableIdentifier: "",
    relationQuery: {},
    multiple: false,
    isRequired: false,
    isEditable: true,
    storeData: {
      placeholder: "Seleccione un usuario...",
    },
  },
  {
    identifier: "time",
    name: "Hora",
    fieldFormat: "time",
    relationTableIdentifier: "",
    relationQuery: {},
    multiple: false,
    isRequired: false,
    isEditable: true,
    storeData: {
      placeholder: "Seleccione un usuario...",
    },
  },
  {
    identifier: "datetime",
    name: "Date time",
    fieldFormat: "datetime",
    relationTableIdentifier: "",
    relationQuery: {},
    multiple: false,
    isRequired: true,
    isEditable: true,
    storeData: {
      placeholder: "Seleccione un usuario...",
    },
  },
  {
    identifier: "date",
    name: "Date",
    fieldFormat: "date",
    relationTableIdentifier: "",
    relationQuery: {},
    multiple: false,
    isRequired: false,
    isEditable: true,
    storeData: {
      placeholder: "Seleccione un usuario...",
    },
  },
  // 1. Relación básica (no múltiple, sin creación)
  {
    identifier: "bool",
    name: "Boleano",
    fieldFormat: "bool",
    relationTableIdentifier: "",
    relationQuery: {},
    multiple: false,
    isRequired: true,
    isEditable: true,
    storeData: {
      placeholder: "Seleccione un usuario...",
    },
  },

  // 2. Relación múltiple (selección múltiple, sin creación)
  {
    identifier: "float",
    name: "Float 2",
    fieldFormat: "float",
    relationTableIdentifier: "",
    relationQuery: {},
    multiple: false,
    isRequired: true,
    isEditable: true,
    storeData: {
      placeholder: "Seleccione varios usuarios...",
    },
  },

  // 3. Relación con quickPick (muestra los tres primeros ordenados por 'name')
  {
    identifier: "int",
    name: "Numerico 3",
    fieldFormat: "int",
    relationTableIdentifier: "users",
    relationQuery: {},
    multiple: false,
    isRequired: false,
    storeData: {
      placeholder: "Seleccione un revisor...",
      min: 0, max: 100, range: true, step: 5
    },
    default: '5'
  },

  // 4. Relación con groupBy (agrupar opciones por 'role')
  {
    identifier: "manager_id",
    name: "Manager",
    fieldFormat: "relation",
    relationTableIdentifier: "users",
    relationQuery: {},
    multiple: false,
    isRequired: false,
    storeData: {
      placeholder: "Seleccione un manager...",
      groupBy: "role",
    },
  },

  // 5. Relación con createable (abrirá modal al crear un usuario nuevo)
  {
    identifier: "author_id",
    name: "Autor",
    fieldFormat: "relation",
    relationTableIdentifier: "users",
    relationQuery: {},
    multiple: false,
    isRequired: true,
    storeData: {
      placeholder: "Seleccione o cree un autor...",
      createable: true,
    },
  },

  // 6. Relación múltiple con createable y quickPick
  {
    identifier: "contributors",
    name: "Contribuidores",
    fieldFormat: "relation",
    relationTableIdentifier: "users",
    relationQuery: {},
    multiple: true,
    isRequired: false,
    storeData: {
      placeholder: "Seleccione o cree contribuidores...",
      createable: true,
      quickPick: "username",
    },
  },

  // 7. Campo no relacional (select con valores fijos)
  {
    identifier: "status",
    name: "Estado",
    fieldFormat: 'list',
    multiple: false,
    isRequired: true,
    isEditable: true,
    default: 1,
    storeData: {
      placeholder: "Seleccione un estado...",
      quickPick: 'on',
      posibleValues: {
        1: { label: "Abierto", position: 0 },
        2: { label: "En progreso", position: 1 },
        3: { label: "Cerrado", position: 2 },
      },
    },
  },

  // 8. Campo no relacional con createable (añadir valores nuevos)
  {
    identifier: "tag",
    name: "Etiqueta",
    fieldFormat: 'list',
    multiple: true,
    isRequired: true,
    isEditable: true,
    storeData: {
      placeholder: "Añada etiquetas...",
      createable: true,
      quickPick: 'on',
      posibleValues: {
        1: { label: "Importante", position: 0 },
        2: { label: "Opcional", position: 1 },
      },
      currentId: 2,
    },
  },

  // 9. Campo no editable (para probar condición isEditable === false)
  {
    identifier: "readonly_field",
    name: "Campo solo lectura",
    fieldFormat: 'list',
    isEditable: false,
    storeData: {
      placeholder: "No editable",
    },
  },

  // 10. Campo relacional opcional (nullable permitido)
  {
    identifier: "approver_id",
    name: "Aprobador (opcional)",
    fieldFormat: "relation",
    relationTableIdentifier: "users",
    relationQuery: {},
    isRequired: false,
    multiple: false,
    storeData: {
      placeholder: "Seleccione (opcional)...",
    },
  },
];

import { For } from "solid-js";
import RecordButtonCreate from "../components/record/RecordButtonCreate";
import TableList from "../sections/TableList";
import createFormController from "../components/fields/form-controller";

export default function DemoSelects() {
  const formController = createFormController();
  return (
    <>

      <TableList tableIdentifier="users" defaultColumns={['firstname','lastname','email','status']} limit={2} />

      <RecordButtonCreate tableIdentifier="icons" buttonProps={{text: "Crear Icono"}}/>

      <div style={{ display: "flex", 'flex-direction': "column", gap: "16px", width: "400px" }}>
        <For each={tableFieldsExample}>
          {(field) => (
            <div>
              <FieldInput field={field} />
            </div>
          )}
        </For>
      </div>
    </>
  );
}
