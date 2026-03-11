// src/components/filters/FilterSelectorButton.tsx
import { For, Show, createMemo, untrack, JSX, JSXElement } from "solid-js";
import { createStore, produce, reconcile } from "solid-js/store";
import Button from "../ui/Button";
import { modalStore } from "../../lib/modal-store";
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

/* ------------------ Helpers: operadores y defaults ------------------ */

const getField = (field: string, table: string): TableField =>
  store.getField(field, table)!;

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
        { value: "starts", label: "Comienza con" },
        { value: "ends", label: "Termina con" },
        { value: "*", label: "Cualquiera" },
        { value: "!*", label: "En blanco" },
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
        { value: "!*", label: "Ninguno" },
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
        { value: "!*", label: "Ninguna fecha" },
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
        { value: "!*", label: "Ninguno" },
      ];
    default:
      return [
        { value: "=", label: "Igual a" },
        { value: "!=", label: "Distinto a" },
        { value: "*", label: "Cualquiera" },
        { value: "!*", label: "Ninguno" },
      ];
  }
};

const getOperatorLabel = (field: string, table: string, targetOp: string): string =>
  getOperatorsForField(field, table).find((op) => op.value === targetOp)?.label || "";

const getDefaultValueForField = (field: string, table: string): any => {
  const { fieldFormat, default: def } = getField(field, table)!;
  if (def !== undefined) return def;
  switch (fieldFormat) {
    case "int":
    case "float":   return 0;
    case "bool":    return true;
    case "date":    return new Date().toISOString().split("T")[0];
    case "datetime": return new Date().toISOString().slice(0, 16);
    case "time":    return new Date().toLocaleTimeString("en-US", { hour12: false });
    case "relation":
    case "list":    return [];
    default:        return "";
  }
};

const getDefaultOperatorForField = (field: string, table: string): RawRecordFilter["op"] => {
  const { fieldFormat } = getField(field, table)!;
  switch (fieldFormat) {
    case "string":
    case "text":    return "~~~";
    default:        return "=";
  }
};

const isBetweenOperator = (op: RawRecordFilter["op"]) => op === "<=>";

/* ------------------ FilterSelectorModal ------------------ */

function FilterSelectorModal(props: {
  filterFormId: string;
  tableIdentifier: string;
  // Store proxy + setter pasados desde FilterSelectorButton
  modalFilters: FilterInput;
  setModalFilters: (fn: any, ...args: any[]) => void;
  formController: FormController;
}) {
  const table = store.getTable(props.tableIdentifier)!;

  const filtrableFields = createMemo(() =>
    (store.getTableFieldsFor(table.identifier) || [])
      .filter((f) => f.isFilter || f.isUnique)
      .sort((a, b) => (a.position || 0) - (b.position || 0))
  );

  // ── Mutaciones granulares del store ────────────────────────────────────
  //
  // updateFilterValue escribe SOLO modalFilters[key].v
  // → Object.keys(modalFilters) NO cambia
  // → <For> NO re-ejecuta ninguna fila
  // → el Format component que tiene el foco NO se desmonta → foco conservado ✓

  const updateFilterValue = (key: string, val: any) =>
    props.setModalFilters(key, "v", val);

  const updateFilterOp = (key: string, op: RawRecordFilter["op"]) =>
    props.setModalFilters(
      produce((s: FilterInput) => {
        (s as any)[key] = { ...(s as any)[key], op, v: getDefaultValueForField(key, props.tableIdentifier) };
      })
    );

  const addFilter = (fieldId: string) =>
    props.setModalFilters(
      produce((s: FilterInput) => {
        (s as any)[fieldId] = {
          field: fieldId,
          op: getDefaultOperatorForField(fieldId, props.tableIdentifier),
          v: getDefaultValueForField(fieldId, props.tableIdentifier),
        };
      })
    );

  const removeFilter = (key: string) => {
    delete props.formController.fieldControllers[key];
    props.setModalFilters(
      produce((s: FilterInput) => { delete (s as any)[key]; })
    );
  };

  // ── renderValueInput ────────────────────────────────────────────────────
  //
  // Esta función se llama UNA SOLA VEZ por fila, cuando la fila monta.
  // El truco está en cómo se llama desde el JSX (ver más abajo):
  //   • el op se lee fuera (tracking → re-llama solo cuando op cambia)
  //   • el v se lee dentro de untrack() → NO tracking → no re-llama al tipear
  //
  // Resultado: cambiar op → re-monta el input de valor (correcto, puede ser
  // un componente diferente). Tipear en el input → solo updateFilterValue →
  // escritura granular al store → NINGÚN componente se desmonta → foco OK.

  const renderValueInput = (key: string, op: RawRecordFilter["op"]) => {
    // Leer v sin tracking: el valor inicial para montar el componente.
    // Las actualizaciones posteriores las maneja el componente internamente
    // y las escribe de vuelta vía onInput → updateFilterValue.
    const initialV = untrack(() => (props.modalFilters as any)[key]?.v);

    const fieldBase = getField(key, props.tableIdentifier)!;
    const field = { ...fieldBase };

    if (field.identifier === "id") {
      field.relationTableIdentifier = table.identifier;
      field.fieldFormat = "relation";
    }
    field.default = initialV;
    field.isRequired = true;

    if (op === "*" || op === "!*") {
      return (
        <div class="flex items-center px-2 py-1.5 text-sm italic text-gray-500">
          {getOperatorLabel(field.identifier, field.tableIdentifier, op)}
        </div>
      );
    }

    const record = { id: props.filterFormId + "field", [field.identifier]: initialV };
    const storeData = {
      ...field.storeData,
      placeholder: `Seleccione ${field.identifier === "id" ? table.namePlural || table.name : field.name}...`,
    };
    delete storeData["quickPick"];
    delete storeData["createable"];

    const controller = props.formController.registerField(field.identifier);
    const filterProps = {
      record,
      isFieldForm: false as const,
      controller,
      onInput: (val: any) => updateFilterValue(key, val),
    };

    switch (field.fieldFormat) {
      case "date":
      case "datetime":
      case "time":
        if (isBetweenOperator(op)) {
          const initialArr = Array.isArray(initialV) ? initialV : [null, null];
          return (
            <div class="flex items-center gap-2 w-full">
              <FormatDateEdit
                {...filterProps}
                field={{ ...field }}
                record={{ ...record, [field.identifier]: initialArr[0] }}
                onInput={(val) => {
                  const cur = untrack(() => (props.modalFilters as any)[key]?.v);
                  const arr = Array.isArray(cur) ? [...cur] : [null, null];
                  arr[0] = val;
                  updateFilterValue(key, arr);
                }}
              />
              <span class="text-xs text-gray-400 shrink-0">a</span>
              <FormatDateEdit
                {...filterProps}
                field={{ ...field }}
                record={{ ...record, [field.identifier]: initialArr[1] }}
                onInput={(val) => {
                  const cur = untrack(() => (props.modalFilters as any)[key]?.v);
                  const arr = Array.isArray(cur) ? [...cur] : [null, null];
                  arr[1] = val;
                  updateFilterValue(key, arr);
                }}
              />
            </div>
          );
        }
        return <FormatDateEdit {...filterProps} field={{ ...field }} />;

      case "list":
        return <FormatListEdit {...filterProps} field={{ ...field, multiple: true, storeData }} />;

      case "relation":
        return <FormatRelationEdit {...filterProps} field={{ ...field, multiple: true, storeData }} />;

      case "bool":
        return <FormatBoolEdit {...filterProps} field={{ ...field }} />;

      case "int":
      case "float":
        if (isBetweenOperator(op)) {
          const initialArr = Array.isArray(initialV) ? initialV : [null, null];
          return (
            <div class="flex items-center gap-2 w-full">
              <FormatNumberEdit
                {...filterProps}
                field={{ ...field, storeData: { placeholder: "min" } }}
                record={{ ...record, [field.identifier]: initialArr[0] }}
                onInput={(val) => {
                  const cur = untrack(() => (props.modalFilters as any)[key]?.v);
                  const arr = Array.isArray(cur) ? [...cur] : [null, null];
                  arr[0] = val;
                  updateFilterValue(key, arr);
                }}
              />
              <span class="text-xs text-gray-400 shrink-0">a</span>
              <FormatNumberEdit
                {...filterProps}
                field={{ ...field, storeData: { placeholder: "max" } }}
                record={{ ...record, [field.identifier]: initialArr[1] }}
                onInput={(val) => {
                  const cur = untrack(() => (props.modalFilters as any)[key]?.v);
                  const arr = Array.isArray(cur) ? [...cur] : [null, null];
                  arr[1] = val;
                  updateFilterValue(key, arr);
                }}
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

  // ── Field picker ────────────────────────────────────────────────────────
  const fieldController = createFieldController();
  const posibleValues: Record<string, { label: string | (() => JSXElement); position?: number }> = {};
  filtrableFields().forEach((field, index) => {
    posibleValues[field.identifier] = { label: field.name, position: index };
  });
  const filterFieldProps: Partial<TableField> = {
    multiple: false,
    name: table.name,
    identifier: table.identifier,
    fieldFormat: "list",
    default: undefined,
    storeData: { posibleValues, placeholder: "Añadir filtro..." },
  };

  return (
    <div class="flex flex-col gap-4 p-4 min-w-0">

      {/* Selector de campos */}
      <div class="flex flex-col gap-1">
        <label class="text-xs font-medium uppercase tracking-wide text-gray-500">Añadir filtro</label>
        <FormatListEdit
          field={filterFieldProps as TableField}
          record={{ id: props.filterFormId }}
          onChange={(value) => {
            if (value) {
              addFilter(value);
              setTimeout(() => fieldController.reset?.(null), 300);
            }
          }}
          isFieldForm={false}
          controller={fieldController}
          isOptionDisabled={(option: any) =>
            Object.prototype.hasOwnProperty.call(props.modalFilters, option.id ?? option.value?.id)
          }
        />
        <Show when={filtrableFields().length === 0}>
          <p class="mt-1 text-xs text-gray-400">No hay campos filtrables en esta tabla.</p>
        </Show>
      </div>

      <hr class="border-gray-100" />

      {/* Lista de filtros activos */}
      <div class="flex flex-col gap-2">
        <Show
          when={Object.keys(props.modalFilters).length > 0}
          fallback={<p class="py-4 text-center text-sm text-gray-400">Sin filtros aplicados. Selecciona un campo arriba.</p>}
        >
          {/* Header */}
          <div class="grid grid-cols-[auto_1fr_1fr_2fr] items-center gap-2 px-1">
            <button
              onClick={() => props.setModalFilters(reconcile({}))}
              class="flex h-6 w-6 items-center justify-center rounded text-xs text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
              title="Limpiar Todos"
            >✕</button>
            <span class="text-xs font-semibold uppercase tracking-wide text-gray-400">Campo</span>
            <span class="text-xs font-semibold uppercase tracking-wide text-gray-400">Operador</span>
            <span class="text-xs font-semibold uppercase tracking-wide text-gray-400">Valor</span>
          </div>

          {/* For itera sobre CLAVES — escribir .v no cambia claves → filas no se desmontan → foco OK */}
          <For each={Object.keys(props.modalFilters)}>
            {(key) => (
              <div class="grid grid-cols-[auto_1fr_1fr_2fr] items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-2 py-1.5 hover:border-gray-200 transition-colors">

                <button
                  onClick={() => removeFilter(key)}
                  class="flex h-6 w-6 items-center justify-center rounded text-xs text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                  title="Eliminar filtro"
                >✕</button>

                <span class="truncate text-sm font-medium text-gray-700">
                  {getField(key, props.tableIdentifier).name}
                </span>

                <select
                  value={(props.modalFilters as any)[key]?.op}
                  onChange={(e) => updateFilterOp(key, e.currentTarget.value as RawRecordFilter["op"])}
                  class="w-full rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
                >
                  <For each={getOperatorsForField(key, props.tableIdentifier)}>
                    {(operator) => <option value={operator.value}>{operator.label}</option>}
                  </For>
                </select>

                <div class="min-w-0">
                  {/* op tracked → re-monta al cambiar operador ✓
                      untrack en renderValueInput → no re-monta al tipear ✓ */}
                  {(() => {
                    const op = (props.modalFilters as any)[key]?.op as RawRecordFilter["op"];
                    return untrack(() => renderValueInput(key, op));
                  })()}
                </div>
              </div>
            )}
          </For>
        </Show>
      </div>
    </div>
  );
}

/* ------------------ FilterSelectorButton ------------------ */

export default function FilterSelectorButton(props: {
  tableIdentifier: string;
  filters: () => FilterInput;
  setFilters: (v: FilterInput) => void;
  buttonProps?: {
    variant?: "primary" | "secondary" | "danger" | "success" | "warning" | "ghost" | "outline";
    size?: "xs" | "sm" | "md" | "lg" | "xl";
    text?: string;
    icon?: JSX.Element;
    showBadge?: boolean;
  };
}) {
  const filterFormId = crypto.randomUUID();

  // createStore en lugar de createSignal:
  // Las escrituras granulares (setModalFilters(key, "v", val)) no invalidan
  // las claves del store → <For> no re-ejecuta filas existentes → no hay
  // desmonte de componentes mientras se tipea → foco conservado.
  const [modalFilters, setModalFilters] = createStore<FilterInput>(
    JSON.parse(JSON.stringify(props.filters()))
  );

  const filterCount = () => Object.keys(modalFilters).length;

  const controllers: FieldController[] = [];
  const formController = createFormController();

  const validateAndSaveFilters = (callback?: () => void) => {
    formController.validate().then((valid) => {
      if (valid) {
        props.setFilters(JSON.parse(JSON.stringify(modalFilters)));
        callback?.();
      }
    });
  };

  const openFilterModal = () => {
    // Sincronizar el store con los filtros aplicados actuales al abrir
    setModalFilters(reconcile(JSON.parse(JSON.stringify(props.filters()))));

    const modalId = modalStore.openModal({
      resizable: "filters",
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
          <div class="flex-1">
            <Button
              variant="ghost"
              onClick={() => setModalFilters(reconcile({}))}
              disabled={!filterCount()}
            >
              Limpiar
            </Button>
          </div>
          <div class="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setModalFilters(reconcile(JSON.parse(JSON.stringify(props.filters()))));
                controllers.map((c) => c.reset?.());
                modalStore.closeModal(modalId);
              }}
            >
              Cancelar
            </Button>
            <Button variant="primary" onClick={() => validateAndSaveFilters()}>
              Aplicar
            </Button>
            <Button variant="primary" onClick={() => validateAndSaveFilters(() => modalStore.closeModal(modalId))}>
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
      class="relative"
    >
      <Show when={buttonProps.icon}>{buttonProps.icon}</Show>
      <span class="inline-flex items-center gap-1.5">
        {buttonProps.text || "Filtros"}
        <Show when={showBadge && filterCount() > 0}>
          <span class="inline-flex items-center justify-center rounded-full bg-blue-500 text-white text-xs font-semibold w-4 h-4">
            {filterCount()}
          </span>
        </Show>
      </span>
    </Button>
  );
}