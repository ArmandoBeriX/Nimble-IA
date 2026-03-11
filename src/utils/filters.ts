// src/utils/filters.ts

import { TableField } from "../types/schema";

export function applySearchAndFilters<T extends Record<string, any>>(
  data: T[] = [],
  searchQuery: string | null | undefined,
  filters: Record<string, any> | null | undefined,
  tableFields?: TableField[]
): T[] {
  let res = (data || []).slice();

  if (searchQuery && searchQuery.toString().trim().length > 0 && tableFields) {
    const q = searchQuery.toString().trim().toLowerCase();
    const stringFields = tableFields.filter(f => f.fieldFormat === 'string').map(f => f.identifier);
    if (stringFields.length > 0) {
      res = res.filter(item => {
        for (const fi of stringFields) {
          const v = item?.[fi];
          if (v != null && String(v).toLowerCase().includes(q)) return true;
        }
        return false;
      });
    }
  }

  if (filters && tableFields) {
    for (const [field, value] of Object.entries(filters)) {
      if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) continue;
      const fieldDef = tableFields.find(f => f.identifier === field);
      if (!fieldDef) continue;

      res = res.filter(item => {
        const val = item?.[field];
        switch (fieldDef.fieldFormat) {
          case 'string':
            return String(val ?? '').toLowerCase().includes(String(value).toLowerCase());
          case 'bool':
            if (typeof value === 'boolean') return !!val === value;
            if (value === 'true') return !!val === true;
            if (value === 'false') return !!val === false;
            return true;
          case 'int':
          case 'float':
            const num = Number(value);
            if (Number.isFinite(num)) return Number(val) === num;
            return false;
          case 'date':
            if (!val) return false;
            return new Date(val).toISOString().slice(0,10) === new Date(value).toISOString().slice(0,10);
          case 'relation':
            if (Array.isArray(val)) return val.includes(value);
            return val === value;
          default:
            return true;
        }
      });
    }
  }

  return res;
}
