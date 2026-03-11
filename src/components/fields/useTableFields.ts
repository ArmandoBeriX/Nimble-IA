import { createSignal, createEffect } from "solid-js";
import { TableField } from "../../types/schema";
import { store } from "../../app";

export function useTableFields(tableIdentifier: string) {
  const [fields, setFields] = createSignal<TableField[]>([]);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<Error | null>(null);

  createEffect(() => {
    async function fetchFields() {
      setLoading(true);
      try {
        // Aquí asumimos que tienes una forma de obtener los campos de la tabla
        // Esto dependerá de tu implementación específica
        const tableDefinition = await store.getTable(tableIdentifier);
        if (tableDefinition && tableDefinition.tableFields) {
          setFields(tableDefinition.tableFields);
        }
      } catch (err) {
        setError(err as Error);
        console.error("Error fetching table fields:", err);
      } finally {
        setLoading(false);
      }
    }

    if (tableIdentifier) {
      fetchFields();
    }
  });

  return { fields, loading, error };
}