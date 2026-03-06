// src/components/filters/FilterSelectorButton.tsx
import { For, Show, createSignal, Accessor, Setter, createMemo, JSX, JSXElement } from "solid-js";
import Button from "../ui/Button";
import { modalStore } from "../../lib/modal-store";
import "./FilterSelector.css";
import type { FilterInput, TableField, RawRecordFilter } from "../../types/schema";
import { store } from "../../app";
import FormatListEdit from "../fields/field-formats/List/FormatListEdit";
import FormatRelationEdit from "../fields/field-formats/Relation/FormatRelationEdit";
import FormatBoolEdit from "../fields/field-formats/Bool/FormatBoolEdit";
import FormatNumberEdit from "../fields/field-formats/Number/FormatNumberEdit";
import FormatStringEdit from "../fields/field-formats/String/FormatStringEdit";
import FormatDateEdit from "../fields/field-formats/Date/FormatDateEdit";
import { createFieldController, FieldController } from "../fields/FieldEdit";
import createFormController, { FormController } from "../fields/form-controller";

/**
 * Estructura interna para mantener filtros en el UI
 */
type FilterItem = {
  id: string;
  fieldIdentifier: string;
  field: TableField;
  op: RawRecordFilter["op"];
  v?: any;
  or?: number | string | undefined;
};

/* ------------------ Helpers: operadores y defaults ------------------ */
const getField = (field: string, table: string): TableField => {
  return store.getField(field, table)!
}

const getOperatorsForField = (field: string, table: string): Array<{ value: RawRecordFilter["op"]; label: string }> => {
  const { fieldFormat } = getField(field, table);

  switch (fieldFormat) {
    case "string":
    case "text":
      return [
        { value: "=", label: "Igual a" },
        { value: "!=", label: "Diferente de" },
        { value: "~~~", label: "Contiene" },
        { value: "!~~~", label: "No contiene" },
        { value: "starts", label: "Comienza con" }, // TODO: en el server falta agregar los filtros para !~~~, ends, starts
        { value: "ends", label: "Termina con" },
        { value: "*", label: "Cualquiera" },
        { value: "!*", label: "En blanco" }
      ];
    case "int":
    case "float":
      return [
        { value: "=", label: "Igual a" },
        { value: "!=", label: "Distinto a" },
        { value: ">", label: "Mayor que" },
        { value: "<", label: "Menor que" },
        { value: ">=", label: "Mayor o igual" },
        { value: "<=", label: "Menor o igual" },
        { value: "<=>", label: "Entre" },
        { value: "*", label: "Cualquiera" },
        { value: "!*", label: "Ninguno" }
      ];
    case "date":
    case "time":
    case "datetime":
      return [
        { value: "=", label: "Igual a" },
        { value: "!=", label: "Distinto a" },
        { value: ">", label: "Después de" },
        { value: "<", label: "Antes de" },
        { value: ">=", label: "En o después" },
        { value: "<=", label: "En o antes" },
        { value: "<=>", label: "Entre" },
        { value: "*", label: "Cualquier fecha" },
        { value: "!*", label: "Ninguna fecha" }
      ];
    case "bool":
      return [
        { value: "=", label: "Igual a" },
        { value: "!=", label: "Distinto a" },
      ];
    case "relation":
    case "list":
      return [
        { value: "=", label: "Incluye" },
        { value: "!=", label: "Excluye" },
        { value: "*", label: "Cualquiera" },
        { value: "!*", label: "Ninguno" }
      ];

    default:
      return [
        { value: "=", label: "Igual a" },
        { value: "!=", label: "Distinto a" },
        { value: "*", label: "Cualquiera" },
        { value: "!*", label: "Ninguno" }
      ];
  }
};

const getOperatorLabel = (field: string, table: string, targetOp: string): string => {
  return getOperatorsForField(field, table).find((op) => op.value === targetOp)?.label || ""
}

const getDefaultValueForField = (field: string, table: string): any => {
  const { fieldFormat, default: def } = getField(field, table)!;
  if (def !== undefined) return def;
  switch (fieldFormat) {
    case "int":
    case "float":
      return 0;
    case "bool":
      return true;
    case "date":
      return new Date().toISOString().split("T")[0];
    case "datetime":
      return new Date().toISOString().slice(0, 16);
    case "time":
      return new Date().toLocaleTimeString("en-US", { hour12: false });
    case "relation":
    case "list":
      return []
    default:
      return "";
  }
};

const getDefaultOperatorForField = (field: string, table: string): RawRecordFilter["op"] => {
  const { fieldFormat } = getField(field, table)!;

  switch (fieldFormat) {
    case "string":
    case "text":
      return "~~~"; // contains
    case "int":
    case "float":
      return "=";
    case "date":
    case "time":
    case "datetime":
      return "=";
    case "bool":
      return "=";
    case "relation":
    case "list":
      return "=";
    default:
      return "=";
  }
};

const isBetweenOperator = (op: RawRecordFilter["op"]): boolean => {
  return op === "<=>";
};

/* ------------------ Componente del Modal ------------------ */

function FilterSelectorModal(props: {
  filterFormId: string;
  tableIdentifier: string;
  modalFilters: Accessor<FilterInput>;
  setModalFilters: Setter<FilterInput>;
  formController: FormController;
}) {
  // Obtener todos los campos de la tabla filtrados por isFilter o isUnique
  const table = store.getTable(props.tableIdentifier)!
  const filtrableFields = createMemo(() => {
    const fields = store.getTableFieldsFor(table.identifier) || [];
    return fields
      .filter(field => field.isFilter || field.isUnique)
      .sort((a, b) => (a.position || 0) - (b.position || 0));
  });
  const [modalFilters, setModalFilters] = [props.modalFilters,
  props.setModalFilters];

  // Actualizar filtro
  const updateFilter = (filter: RawRecordFilter) => {
    const field = filter.field as keyof FilterInput;
    setModalFilters((prev: FilterInput) => {
      return {
        ...prev,
        [field]: filter
      };
    });
  };

  // Eliminar filtro
  const removeFilter = (key: string) => {
    delete props.formController.fieldControllers[key]
    setModalFilters((prev: FilterInput) => {
      const { [key as keyof FilterInput]: removed, ...rest } = prev;
      return rest;
    });
  };

  const generateDefaultFilter = (field: string) => {
    const filter =
    {
      field,
      op: getDefaultOperatorForField(field, props.tableIdentifier),
      v: getDefaultValueForField(field, props.tableIdentifier),
    }
    return filter
  }

  // Renderizar input según tipo de campo
  const renderValueInput = (filter: RawRecordFilter) => {
    const { field: identifier, op, v } = filter;
    const field = getField(identifier!, props.tableIdentifier)!

    if (field.identifier === "id") {
      field.relationTableIdentifier = table.identifier;
      field.fieldFormat = "relation";
    }

    field.default = filter.v;
    field.isRequired = true;

    // Para operadores que no requieren valor
    if (op === "*" || op === "!*") {
      return <div class="no-value-required">{getOperatorLabel(field.identifier, field.tableIdentifier, op)}</div>;
    }

    const record = { id: props.filterFormId + 'field', [field.identifier]: filter.v };
    const fieldFormat = field.fieldFormat
    let storeData = { ...field.storeData, placeholder: `Seleccione ${field.identifier === "id" ? table.namePlural || table.name : field.name}...` }

    const controller = props.formController.registerField(field.identifier)
    const filterProps = {
      record,
      isFieldForm: false,
      controller,
      onInput: (val: any) => updateFilter({ ...filter, v: val })
    }
    delete storeData["quickPick"]
    delete storeData["createable"]
    switch (fieldFormat) {
      case "date":
      case "datetime":
      case "time":
        if (isBetweenOperator(op)) {
          filter.v = Array.isArray(filter.v) ? filter.v : [null, null];
          return (
            <div class="between-inputs">
              <FormatDateEdit
                {...filterProps}
                field={{ ...field }}
                record={{ ...record, [field.identifier]: filter.v[0] }}
                onInput={(val) => { filter.v[0] = val; filterProps.onInput(filter.v) }}
              />
              <span class="between-separator">a</span>
              <FormatDateEdit
                {...filterProps}
                field={{ ...field }}
                record={{ ...record, [field.identifier]: filter.v[1] }}
                onInput={(val) => { filter.v[1] = val; filterProps.onInput(filter.v) }}
              />
            </div>
          );
        }
        return (
          <FormatDateEdit
            {...filterProps}
            field={{ ...field }}
          />
        );

      case "list":
        return <FormatListEdit
          {...filterProps}
          field={{ ...field, multiple: true, storeData: storeData }}
        />

      case "relation":
        return <FormatRelationEdit
          {...filterProps}
          field={{ ...field, multiple: true, storeData: storeData }}
        />

      case "bool":
        return <FormatBoolEdit
          {...filterProps}
          field={{ ...field }}
        />

      case "int":
      case "float":
        if (isBetweenOperator(op)) {
          filter.v = Array.isArray(filter.v) ? filter.v : [null, null];
          return (
            <div class="between-inputs">
              <FormatNumberEdit
                {...filterProps}
                field={{ ...field, storeData: { placeholder: "min" } }}
                record={{ ...record, [field.identifier]: filter.v[0] }}
                onInput={(val) => { filter.v[0] = val; filterProps.onInput(filter.v) }}
              />
              <span class="between-separator">a</span>
              <FormatNumberEdit
                {...filterProps}
                field={{ ...field, storeData: { placeholder: "max" } }}
                record={{ ...record, [field.identifier]: filter.v[1] }}
                onInput={(val) => { filter.v[1] = val; filterProps.onInput(filter.v) }}
              />
            </div>
          );
        }
        return (
          <FormatNumberEdit
            {...filterProps}
            field={{ ...field, storeData: { ...storeData, placeholder: field.storeData?.placeholder || getOperatorLabel(field.identifier, field.tableIdentifier, op) } }}
          />
        );

      default:
        return (
          <FormatStringEdit
            {...filterProps}
            field={{ ...field, storeData: { ...storeData, placeholder: field.storeData?.placeholder || getOperatorLabel(field.identifier, field.tableIdentifier, op) } }}
          />
        );
    }
  };

  const posibleValues: { [key: string]: { label: string | (() => JSXElement); position?: number } } = {}
  filtrableFields().forEach((field, index) => (
    posibleValues[field.identifier] = { label: field.name, position: index }
  ))

  const filterFieldProps: Partial<TableField> = {
    multiple: false,
    name: table.name,
    identifier: table.identifier,
    fieldFormat: "list",
    default: undefined,
    storeData: {
      posibleValues: posibleValues,
      placeholder: "Añadir filtro..."
    },
  }

  const fieldController = createFieldController()

  return (
    <div class="filter-selector-modal">
      {/* Selector de campos */}
      <div class="field-selector-section">
        <div>
          <FormatListEdit
            field={filterFieldProps}
            record={{ id: props.filterFormId }}
            onChange={(value) => {
              if (value) {
                updateFilter(generateDefaultFilter(value));
                setTimeout(function () { fieldController.reset!(null), 300 })
              }
            }}
            isFieldForm={false}
            controller={fieldController}

            isOptionDisabled={(option: any) => {
              return modalFilters().hasOwnProperty(option.id ?? option.value.id)
            }}
          />
        </div>
        <Show when={filtrableFields().length === 0}>
          <p class="no-filterable-fields">
            No hay campos filtrables en esta tabla
          </p>
        </Show>
      </div>

      {/* Línea divisoria */}
      <hr class="divider" />

      {/* Lista de filtros activos - DISEÑO DE FILA */}
      <div class="filters-list filters-row-layout">
        <Show
          when={Object.keys(modalFilters()).length > 0}
          fallback={
            <div class="no-filters">
              No hay filtros aplicados.
            </div>
          }
        >
          <div class="filter-row">
            {/* Botón de eliminar todos */}
            <div class="filter-cell remove-cell">
              <button onClick={() => setModalFilters({})} class="remove-filter-button" title="Limpiar Todos">✕</button>
            </div>

            {/* Nombre del campo */}
            <div class="filter-cell field-cell">
              <span class="filter-head">Campo a Filtrar</span>
            </div>

            {/* Selector de operador */}
            <div class="filter-cell operator-cell">
              <span class="filter-head">Operador</span>
            </div>

            {/* Campo de valor */}
            <div class="filter-cell value-cell">
              <span class="filter-head">Valor</span>
            </div>
          </div>
          <For each={Object.entries(modalFilters())}>
            {([key, filter]) => (
              <div class="filter-row">
                {/* Botón de eliminar */}
                <div class="filter-cell remove-cell">
                  <button
                    onClick={() => removeFilter(key)}
                    class="remove-filter-button"
                    title="Eliminar filtro"
                  >
                    ✕
                  </button>
                </div>

                {/* Nombre del campo */}
                <div class="filter-cell field-cell">
                  <span class="filter-title">{getField(key, props.tableIdentifier).name}</span>
                </div>

                {/* Selector de operador */}
                <div class="filter-cell operator-cell">
                  <select
                    value={filter.op}
                    onChange={(e) => updateFilter({
                      field: key,
                      op: e.currentTarget.value as RawRecordFilter["op"],
                      v: props.formController.getValues?.()[key] // Resetear valor al cambiar operador
                    })}
                    class="form-select"
                  >
                    <For each={getOperatorsForField(key, props.tableIdentifier)}>
                      {(operator) => (
                        <option value={operator.value}>
                          {operator.label}
                        </option>
                      )}
                    </For>
                  </select>
                </div>

                {/* Campo de valor */}
                <div class="filter-cell value-cell">
                  {renderValueInput(filter)}
                </div>
              </div>
            )}
          </For>
        </Show>
      </div>
    </div>
  );
}

/* ------------------ Componente principal ------------------ */

export default function FilterSelectorButton(props: {
  tableIdentifier: string;
  filters: Accessor<FilterInput>;
  setFilters: Setter<FilterInput>;
  buttonProps?: {
    variant?: "primary" | "secondary" | "danger" | "success" | "warning" | "ghost" | "outline";
    size?: "xs" | "sm" | "md" | "lg" | "xl";
    text?: string;
    icon?: JSX.Element;
    showBadge?: boolean;
  };
}) {

  const filterFormId = crypto.randomUUID()

  const [modalFilters, setModalFilters] = createSignal<FilterInput>(JSON.parse(JSON.stringify(props.filters())));

  // Contar filtros activos
  const filterCount = createMemo(() => {
    const filters = modalFilters() || {};
    return Object.keys(filters).length;
  });

  const controllers: FieldController[] = [];
  const formController = createFormController();

  const validateAndSaveFilters = (callback?: Function) => {
    formController.validate().then(valid => {
      if (valid) {
        props.setFilters(JSON.parse(JSON.stringify(modalFilters())))
        if (callback) callback()
      }
    })
  }

  const openFilterModal = () => {
    const modalId = modalStore.openModal({
      resizable: "filters", // id para la persistencia del resizable
      title: "Gestionar Filtros",
      children: () => (
        <FilterSelectorModal
          filterFormId={filterFormId}
          tableIdentifier={props.tableIdentifier}
          modalFilters={modalFilters}
          setModalFilters={setModalFilters}
          formController={formController}
        />
      ),
      footer: () => (
        <>
          <div class="footer-left">
            <Button
              variant="ghost"
              onClick={() => {
                setModalFilters({});
              }}
              disabled={!filterCount()}
            >
              Limpiar
            </Button>
          </div>
          <div class="footer-right">
            <Button
              variant="ghost"
              onClick={() => {
                setModalFilters(JSON.parse(JSON.stringify(props.filters())))
                controllers.map(c => c.reset && c.reset())
                modalStore.closeModal(modalId)
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                // Aplicar filtros
                validateAndSaveFilters()
              }}
            >
              Aplicar
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                // Aplicar filtros
                validateAndSaveFilters(
                  () => { modalStore.closeModal(modalId) }
                )
              }}
            >
              Aceptar
            </Button>
          </div>
        </>
      ),
      size: "md",
    });
  };

  const buttonProps = props.buttonProps || {};
  const showBadge = buttonProps.showBadge !== false;

  return (
    <Button
      onClick={openFilterModal}
      variant={buttonProps.variant || "outline"}
      size={buttonProps.size || "sm"}
      class="filter-selector-button relative"
    >
      <Show when={buttonProps.icon}>{buttonProps.icon}</Show>
      <span class="button-text">
        {buttonProps.text || "Filtros"}
        <Show when={showBadge && filterCount() > 0}>
          <span class="filter-badge">{filterCount()}</span>
        </Show>
      </span>
    </Button>
  );
}
// TODO: hay un problema cuando se cambia el value no actualiza filtros, pero si cuando cambio el operador (en el list, y quisas el relation).
// TODO: EL datepicker y los campos de text tienen problemas, mientras escribo una letra se pierde el foco. Hay que ver como solucionarlo.