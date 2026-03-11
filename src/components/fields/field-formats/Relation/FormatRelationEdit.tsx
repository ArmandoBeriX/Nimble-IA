import { createMemo, createSignal, onCleanup, onMount } from "solid-js";
import { FieldProps } from "../../FieldEdit";
import RelationSelect from "./RelationSelect";
import { renderLabelFromTemplate, renderLabelToString } from '../../../utils/FormatInterpreter';
import { fuzzySort } from "@thisbeyond/solid-select";
import { store } from "../../../../app";
import Icon from "../../../ui/icon/Icon";
import { createSimpleHash } from "../../../../lib/utils/utils";
import WithTooltip from "../../../ui/tooltip/WithTooltip";

const FormatRelationEdit = (props: FieldProps) => {
  const field = props.field;
  const record = props.record;
  const isFieldForm = props.isFieldForm ?? true;

  if (isFieldForm && !field.isEditable) {
    return <></>;
  }

  const resolvedTableIdentifier = store.resolveTableIdentifier(field.relationTableIdentifier, props.record);
  const resolvedQuery = store.resolveQuery(field.relationQuery, props.record);
  const relTable = store.getTable(resolvedTableIdentifier)!;

  // Obtener el campo de etiqueta simple
  const simpleLabelKey = relTable?.tableFields
    ?.find(tf => tf.fieldFormat === "string")?.identifier;

  const formatSelection = (relTable && relTable.formatSelection) ?? `{${simpleLabelKey}}`;
  const formatSelected = (relTable && relTable.formatSelected) ?? formatSelection;
  const formatSelectedMultiple = (relTable && relTable.formatSelectedMultiple) ?? formatSelected;

  // Clave de almacenamiento: si relationKey está definido, se usa en lugar de 'id'
  const storageKey = field.relationKey || 'id';

  // Helper para normalizar a valores de la clave de almacenamiento (id o relationKey)
  const normalizeToIds = (value: any): any => {
    if (!value) return field.multiple ? [] : null;

    const extractId = (item: any) => {
      if (!item) return null;
      const raw = item[storageKey] ?? item;
      // Si raw es un objeto, intentar obtener su id, si no, convertirlo a string
      if (raw && typeof raw === 'object') {
        return raw.id ?? String(raw);
      }
      return raw;
    };

    if (field.multiple) {
      if (!Array.isArray(value)) return [];
      return value.map(v => extractId(v)).filter(id => id != null);
    }
    return extractId(value);
  };

  // Helper para convertir valores de clave (id o relationKey) a objetos completos
  const idsToObjects = async (keys: any): Promise<any> => {
    if (!keys) return field.multiple ? [] : null;

    const keyArray = field.multiple
      ? (Array.isArray(keys) ? keys : [keys])
      : [keys];

    const normalizedKeys = keyArray
      .map(k => typeof k === 'object' && k !== null ? k[storageKey] : k)
      .filter(Boolean);

    if (normalizedKeys.length === 0) return field.multiple ? [] : null;

    // Consulta usando la clave de almacenamiento (id o relationKey)
    const objects = await store.query(resolvedTableIdentifier, { [storageKey]: normalizedKeys });

    // Reordenar para que coincida con el orden de las claves originales
    if (field.multiple) {
      const objMap = new Map(objects.map(obj => [obj[storageKey], obj]));
      return normalizedKeys.map(key => objMap.get(key)).filter(obj => obj !== undefined);
    } else {
      return objects?.[0] ?? null;
    }
  };

  // Crear opciones simples
  const toOption = (rec: any, idx = 0) => {
    const icon = relTable?.icon ? <Icon name={relTable.icon} size={16} /> : <></>;
    if (!rec) return null;
    if (rec.value && rec.label && rec.id !== undefined) return rec; // ya es opción formateada

    // Usar storageKey como identificador de la opción
    const optionId = rec[storageKey] ?? rec.id ?? `idx-${idx}`;
    const text = formatSelection
      ? renderLabelFromTemplate(formatSelection, rec, icon)
      : rec.label ?? String(optionId);

    return {
      id: optionId, // ← ahora coincide con el valor guardado
      text,
      value: rec,
      position: rec.position ?? idx,
      hasIcon: !!relTable?.icon,
    };
  };

  // Estado
  const [options, setOptions] = createSignal<Array<any>>([]);
  const [selectedValues, setSelectedValues] = createSignal<any>(field.multiple ? [] : null);
  const [errors, setErrors] = createSignal<Array<string>>([]);
  const [modified, setModified] = createSignal(false);
  const [isInitialized, setIsInitialized] = createSignal(false);

  // Obtener valor inicial

  const getInitialValue = async () => {
    const sessionKey = `val_${props.record?.id ?? createSimpleHash(props.record) ?? props.field.tableIdentifier}_${props.field.identifier}`;
    const sessionValue = store.watchSession(sessionKey)();
    const rawValue = sessionValue ?? record?.[field.identifier!] ?? field.default ?? (field.multiple ? [] : null);

    return rawValue;
  };

  const makeInitialSelected = async (val?: string[]) => {
    const rawValue = val ?? await getInitialValue();
    const objects = await idsToObjects(rawValue);

    if (field.multiple) {
      if (!Array.isArray(objects)) return [];
      return objects.map((obj: any, idx: number) => toOption(obj, idx)).filter(Boolean);
    } else {
      if (!objects) return null;
      return toOption(objects, 0);
    }
  };

  // Construir consulta de búsqueda
  const buildSearchQuery = (input: string) => {
    if (!input) return resolvedQuery;

    const searchableFields = relTable?.tableFields
      ?.filter(tf => tf.isSearchable)
      ?.map(tf => {
        if (tf.fieldFormat === "relation") {
          const relatedFields = store.getTableFieldsFor(tf.tableIdentifier!);
          const searchField = relatedFields?.find(f => f.isSearchable);
          return searchField ? `${tf.tableIdentifier}.${searchField.identifier}` : "id";
        }
        return tf.identifier!;
      }) ?? [];

    if (searchableFields.length === 0) return resolvedQuery;

    return {
      ...(resolvedQuery || {}),
      [searchableFields.join("+")]: { op: "~~~", v: input, or: "search" }
    };
  };

  // Cargar opciones
  let searchTimeout: number | undefined;
  let lastSearch = "";

  const loadOptions = async (input = "") => {
    try {
      const query = buildSearchQuery(input);
      const tableId = resolvedTableIdentifier;
      const opts: any = { limit: 10 };
      if (simpleLabelKey) opts.order = [[simpleLabelKey!, "ASC"]];

      const q = await store.query(tableId, query, opts);
      const mapped = (q ?? []).map((r: any, i: number) => toOption(r, i)).filter(Boolean);
      setOptions(mapped);
      return mapped;
    } catch (e) {
      console.error("Error cargando opciones de relación:", e);
      setOptions([]);
      return [];
    }
  };

  const scheduleSearch = (inputValue: string) => {
    if (inputValue === lastSearch) return;
    lastSearch = inputValue;
    if (searchTimeout) window.clearTimeout(searchTimeout);
    searchTimeout = window.setTimeout(() => {
      loadOptions(inputValue);
    }, 300);
  };

  // Validación
  const validate = async (): Promise<boolean> => {
    const errs: string[] = [];
    const sel = selectedValues();
    const currentIds = normalizeToIds(
      field.multiple
        ? sel?.map((s: any) => s?.value ?? s) ?? []
        : sel?.value ?? sel
    );

    if (field.isRequired) {
      if (field.multiple) {
        if (!Array.isArray(currentIds) || currentIds.length === 0) errs.push("Es requerido");
      } else {
        if (!currentIds) errs.push("Es requerido");
      }
    }

    setErrors(errs);

    // Calcular si hubo modificación
    const initialValue = await getInitialValue();
    const initialIds = normalizeToIds(initialValue);
    setModified(JSON.stringify(initialIds) !== JSON.stringify(currentIds));

    return errs.length === 0;
  };

  // Manejo de cambios
  const setSelectedValuesAndCache = (val: any) => {
    setSelectedValues(val);
    const keys = normalizeToIds(val);

    const sessionKey = `val_${props.record?.id ?? createSimpleHash(props.record) ?? props.field.tableIdentifier}_${props.field.identifier}`;

    if (Array.isArray(keys) ? keys.length === 0 : !keys) {
      store.deleteSession(sessionKey);
    } else {
      store.setSession(
        sessionKey,
        keys,
        250,
        8 * 60 * 60 * 1000
      );
    }
  };

  const handleChange = (selected: any | any[]) => {
    setSelectedValuesAndCache(selected);

    if (!isInitialized()) return;

    const keysPayload = normalizeToIds(
      field.multiple
        ? selected?.map((s: any) => s?.value ?? s) ?? []
        : selected?.value ?? selected
    );

    // Calcular modificación
    getInitialValue().then(initialValue => {
      const initialKeys = normalizeToIds(initialValue);
      setModified(JSON.stringify(initialKeys) !== JSON.stringify(keysPayload));
    });

    setErrors([]);

    // Agregar nuevas opciones a la lista si no existen
    if (field.multiple) {
      const lastValue = selected[selected.length - 1];
      if (lastValue && !options().some((o) => o.id === lastValue.id)) {
        setOptions([...options(), lastValue].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)));
      }
    } else if (selected && !options().some((o) => o.id === selected.id)) {
      setOptions([...options(), selected].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)));
    }

    try {
      props.onChange?.(keysPayload);
    } catch (e) {
      console.error("Error in onChange:", e);
      props.onChange?.(keysPayload);
    }
  };

  // Funciones personalizadas para el select
  const filterable = (inputValue: string) => {
    scheduleSearch(inputValue);

    return options().map(o => ({ ...o, label: o.text }));
  };

  const createable = undefined; // Eliminada si no se usa

  const extractText = (value: any) => {
    if (!value) return "";
    const rec = value.value ?? value;
    if (formatSelection) {
      return renderLabelToString(formatSelection, rec);
    }
    return value.label ?? "";
  };

  const disable = (value: any) => {
    if (field.multiple) {
      return selectedValues().some((s: any) => s?.id === value?.id);
    }
    const sel = selectedValues();
    return sel ? sel.id === value?.id : false;
  };

  // Obtener opciones para quick pick
  const quickPickOptions = createMemo(() => {
    const icon = <></> // const icon = relTable?.icon ? <Icon name={relTable.icon} size={16} /> : <></>;
    return options()
      .filter((option) => {
        return field.multiple
          ? !selectedValues().some((s: any) => s.id === option.id)
          : !(selectedValues()?.id === option?.id);
      })
      .slice(0, 3)
      .map((option) => ({
        ...option,
        text: renderLabelFromTemplate(formatSelectedMultiple, option.value, icon),
      }))
  }
  );

  const handleQuickPickClick = (option: any) => {
    const current = selectedValues();
    let newValue;

    if (field.multiple) {
      newValue = [...current, option];
    } else {
      newValue = option;
    }

    setSelectedValuesAndCache(newValue);
    const keysPayload = normalizeToIds(newValue);

    getInitialValue().then(initialValue => {
      const initialKeys = normalizeToIds(initialValue);
      setModified(JSON.stringify(initialKeys) !== JSON.stringify(keysPayload));
    });

    props.onChange?.(keysPayload);
  };

  // Inicialización
  let inputEl: HTMLInputElement;

  onMount(async () => {
    const initialSelected = await makeInitialSelected();
    setSelectedValues(initialSelected);
    await loadOptions("");
    setIsInitialized(true);

    const ctrl = props.controller;
    if (!ctrl) return;

    ctrl.target = inputEl;
    ctrl.validate = validate;
    ctrl.getValue = () => {
      const sel = selectedValues();
      return normalizeToIds(
        field.multiple
          ? sel?.map((s: any) => s?.value ?? s) ?? []
          : sel?.value ?? sel
      );
    };
    ctrl.reset = (val?: any) => {
      const sessionKey = `val_${props.record?.id ?? createSimpleHash(props.record) ?? props.field.tableIdentifier}_${props.field.identifier}`;
      store.deleteSession(sessionKey);
      makeInitialSelected(val ?? undefined).then((initial: any) => {
        setSelectedValues(initial);
      });
      setErrors([]);
      setModified(false);
    };
  });

  onCleanup(() => {
    if (searchTimeout) window.clearTimeout(searchTimeout);
    if (props.controller) {
      delete props.controller.validate;
      delete props.controller.getValue;
      delete props.controller.reset;
    }
  });

  const fieldName = createMemo(() => `${props.field.tableIdentifier}.${props.field.identifier}`);
  const fieldId = createMemo(() => fieldName().replace(/\./g, "-"));

  const RelationSelectContent = () => (
    <RelationSelect
      ref={(el) => (inputEl = el)}
      multiple={field.multiple}
      value={selectedValues()}
      onChange={handleChange}
      options={options()}
      placeholder={field.storeData?.placeholder || ""}
      emptyPlaceholder={"No hay resultados"}
      formatSelection={formatSelection}
      formatSelected={formatSelected}
      formatSelectedMultiple={formatSelectedMultiple}
      icon={relTable?.icon}
      filterable={filterable}
      createable={createable}
      extractText={extractText}
      disable={disable}
      showClearButton={true}
      quickPickOptions={field.storeData?.quickPick ? quickPickOptions() : undefined}
      onQuickPickClick={handleQuickPickClick}
      hasError={errors().length > 0}
      modified={modified()}
      class={errors().length ? "error" : ""}
    />
  );

  if (isFieldForm) {
    return (
      <div class="form-group relative">
        <WithTooltip tooltip={props.field.description}>
          <label for={fieldId()} class="field-label">
            {props.field.name}
            {props.field.isRequired && <span class="required-asterisk"> *</span>}
          </label>
        </WithTooltip>

        <div class="input-container">
          <RelationSelectContent />

          {errors().length > 0 && (
            <div data-invalid class="field-error">
              {errors().join(". ")}
            </div>
          )}
        </div>
      </div>
    );
  } else {
    return (
      <div
        title={errors().length > 0 ? errors().join(". ") : undefined}
        style={{ width: "100%" }}
      >
        <RelationSelectContent />
      </div>
    );
  }
};

export default FormatRelationEdit;