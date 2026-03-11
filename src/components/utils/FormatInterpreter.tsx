// formatInterpreter.tsx
import { createEffect, createSignal, JSX, JSXElement } from "solid-js";
import { formatTimeAgo } from "./TimeAgo";
import { TableDef } from "../../types/schema";
import { store } from "../../app";
import Icon from "../ui/icon/Icon";

/**
 * Intérprete de plantillas para 'labelKey' (separado).
 *
 * Soporta:
 *  - Tokens simples: {field}
 *  - Transformadores: {field|money}, {field|truncate:25|upper}, {field|icon:16,#0080ff,transparent} {icon??interface_id.icon|icon} etc.
 *  - Expresiones con + o -: {dueDate+3600|timeago}, {amount-1000|money}
 *  - Clases delante: [class-a class-b]{field|money} -> envolverá el valor en <span class="...">value</span>
 *
 * Exporta:
 *  - renderLabelFromTemplate(template, rec): JSX.Element (útil para render en Select)
 *  - renderLabelToString(template, rec): string (útil para búsquedas / fuzzySort / order text)
 *  - evaluateExpression(expr, rec): any (Date | number | string)
 *
 * NOTA: las transformaciones definidas aquí son deliberadamente limitadas y seguras (sin eval()).
 */

/* ---------- helpers ---------- */
const getPath = (obj: any, path: string) => {
  if (!obj || !path) return undefined;
  const alternatives = path.split('??')
  for (const alt_path of alternatives) {
    const parts = alt_path.split(".");
    let cur = obj;
    for (const p of parts) {
      if (cur === null || cur === undefined) {
        cur = undefined;
        break;
      }
      if (typeof cur !== 'object') {
        console.warn(`FormatInterpreter: '${cur}' is not an object to call '${p}'. Format: ${path}`)
        cur = undefined;
        break;
      }
      // Usar Object.prototype.hasOwnProperty.call para evitar errores con null
      if (!Object.prototype.hasOwnProperty.call(cur, p) && p.endsWith('_id')) {
        cur = cur[p.slice(0, -3)];
      } else {
        cur = cur[p];
      }
    }
    if (cur) return cur;
  }
  return undefined;
};

const numberWithThousandsSeparator = (n: number) => {
  try {
    return new Intl.NumberFormat().format(n);
  } catch {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
};

const isDateLike = (v: any) => {
  if (v instanceof Date) return true;
  if (typeof v === "string") {
    const t = Date.parse(v);
    return !Number.isNaN(t);
  }
  return false;
};

const toNumericForExpr = (val: any) => {
  if (val == null) return 0;
  if (val instanceof Date) return Math.floor(val.getTime() / 1000);
  if (typeof val === "string") {
    const t = Date.parse(val);
    if (!Number.isNaN(t)) return Math.floor(t / 1000);
    const n = Number(val);
    return Number.isNaN(n) ? 0 : n;
  }
  if (typeof val === "number") return val;
  return 0;
};

/* ---------- transformadores ---------- */
const transformers: Record<string, (...args: any[]) => any> = {
  truncate: (v: any, n = 25) => {
    if (v == null) return "";
    const s = String(v);
    const num = Number(n) || 25;
    return s.length > num ? s.slice(0, num) + "…" : s;
  },
  money: (v: any) => {
    if (v == null || v === "") return "";
    const n = Number(v);
    if (Number.isNaN(n)) return String(v);
    const abs = Math.abs(n);
    if (abs >= 1_000_000) {
      const val = n / 1_000_000;
      return `${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}M`;
    }
    if (abs >= 1_000) {
      const val = n / 1_000;
      return `${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}K`;
    }
    return numberWithThousandsSeparator(n);
  },
  num: (v: any) => {
    const n = Number(v);
    if (Number.isNaN(n)) return String(v ?? "");
    return numberWithThousandsSeparator(n);
  },
  upper: (v: any) => (v == null ? "" : String(v).toUpperCase()),
  lower: (v: any) => (v == null ? "" : String(v).toLowerCase()),
  capitalize: (v: any) => {
    if (v == null) return "";
    const s = String(v);
    return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
  },
  date: (v: any, locale?: string) => {
    if (!v) return "";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    try {
      return d.toLocaleDateString(locale || undefined);
    } catch {
      return d.toISOString();
    }
  },
  timeago: (v: any) => timeAgo(v), // formatTimeAgo(v),
  duration: (v: any) => timeAgo(v), // formatTimeAgo(v), // alias
  icon: (v: string, ...arg) => () => <Icon name={v} size={arg[0]} stroke={arg[1]} fill={arg[2]} />,
};

function timeAgo(v: any) {
  const [timeAgo, setTimeAgo] = createSignal(formatTimeAgo(v))
  createEffect(() => {
    setTimeAgo(formatTimeAgo(v))
    store.watchTimer(15 * 1000)() // cada n segundos hace que se actualice.
  })
  return timeAgo
}

/* ---------- evaluación simple de expresiones (+ / -) ---------- */
export function evaluateExpression(expr: string, rec: any): any {
  // separa por + / - manteniéndolos
  const rawParts = expr.split(/([+-])/).map(p => p.trim()).filter(Boolean);
  if (rawParts.length === 0) return "";

  const getTermValue = (term: string) => {
    if (!term) return 0;
    const asNum = Number(term);
    if (!Number.isNaN(asNum)) return asNum;
    const p = getPath(rec, term);
    if (p == null) return 0;
    if (isDateLike(p)) {
      const dt = new Date(p);
      return Math.floor(dt.getTime() / 1000);
    }
    const pn = Number(p);
    if (!Number.isNaN(pn)) return pn;
    return 0;
  };

  let valueNumeric = getTermValue(rawParts[0]);
  const firstResolved = getPath(rec, rawParts[0]);
  let primaryIsDate = isDateLike(firstResolved);

  for (let i = 1; i < rawParts.length; i += 2) {
    const op = rawParts[i];
    const rhs = rawParts[i + 1] ?? "0";
    const rhsVal = getTermValue(rhs);
    if (op === "+") valueNumeric = (valueNumeric ?? 0) + rhsVal;
    else if (op === "-") valueNumeric = (valueNumeric ?? 0) - rhsVal;
  }

  if (primaryIsDate) {
    return new Date((valueNumeric ?? 0) * 1000);
  }
  return valueNumeric;
};

/* ---------- render a texto puro (útil para fuzzySearch) ---------- */
export function renderLabelToString(template: string | null | undefined, rec: any): string {
  if (!template) return "";
  // reemplazar tokens `[classes]{expr}` y `{expr}` por su valor string
  return template.replace(/(\[([^\]]+)\])?\{([^}]+)\}/g, (_, _cls, _clsText, token) => {
    const parts = token.split("|").map((p: string) => p.trim()).filter(Boolean);
    if (parts.length === 0) return "";
    let value: any;
    const expr = parts[0];
    if (/[+\-]/.test(expr)) value = evaluateExpression(expr, rec);
    else value = getPath(rec, expr);

    for (let i = 1; i < parts.length; i++) {
      const fnRaw = parts[i];
      const [fnName, argRaw] = fnRaw.split(":").map((s: string) => s.trim());
      const args: any[] = [];
      if (argRaw !== undefined && argRaw.length > 0) {
        args.push(...argRaw.split(",").map((a: string) => a.trim()));
      }
      const fn = transformers[fnName];
      if (fn) {
        try {
          if (value instanceof Date && (fnName === "money" || fnName === "num")) {
            value = fn(Math.floor(value.getTime() / 1000), ...args);
          } else value = fn(value, ...args);
        } catch (e: any) {
          console.warn(`transformer ${fnName} fallo`, e.message);
          // swallow
        }
      }
    }

    if (value == null) return "";
    if (typeof value === "object") {
      try { return JSON.stringify(value); } catch { return String(value); }
    }
    return String(value);
  });
};

/** Visualiza un objeto JSX del Record basado en el formatSelection de la tabla */
export function recordDysplayString(table: Partial<TableDef>, record: any, format?: string): string {
  const template = format ?? table.formatSelection ?? `{${store.getTableFieldsFor(table.identifier!).find(t => t.fieldFormat === 'string')?.identifier}}`;
  const rendered = renderLabelToString(template, record)
  return rendered
};

/** Visualiza un objeto JSX del Record basado en el formatSelection de la tabla */
export function recordDysplay(table: Partial<TableDef>, record: any, format?: string): JSXElement {
  const icon = table?.icon && !table.formatSelection?.includes('|icon') ? <Icon name={table?.icon} /> : <></>;

  const template = format ?? table.formatSelection ?? `{${store.getTableFieldsFor(table.identifier!).find(t => t.fieldFormat === 'string')?.identifier}}`;
  const rendered = renderLabelFromTemplate(template, record, icon)
  return <span style="display: flex; align-items: center; gap: 0.25rem;">
    {rendered}
  </span>
};

/* ---------- render a JSX (mantiene spans con clases si hay) ---------- */
export function renderLabelFromTemplate(template: string | null | undefined, rec: any, icon?: JSX.Element): JSX.Element {
  if (template?.includes('|icon'))
    icon = null;
  if (!template) return "";
  const nodes: Array<JSX.Element | string> = [];
  if (icon) {
    nodes.push(icon)
  }
  let lastIndex = 0;
  const re = /(\[([^\]]+)\])?\{([^}]+)\}/g; // grupo 2 = clases, grupo 3 = token
  let m: RegExpExecArray | null;

  while ((m = re.exec(template)) !== null) {
    const fullStart = m.index;
    const fullEnd = re.lastIndex;
    // texto anterior
    if (fullStart > lastIndex) {
      nodes.push(template.slice(lastIndex, fullStart));
    }
    lastIndex = fullEnd;

    const cls = m[2]; // string de clases o undefined
    const token = m[3];

    // calcular valor (igual que en renderLabelToString, pero usando transformadores)
    const parts = token.split("|").map(p => p.trim()).filter(Boolean);
    if (parts.length === 0) {
      nodes.push(<span class={cls ?? undefined}></span>);
      continue;
    }

    let value: any;
    const expr = parts[0];
    if (/[+\-]/.test(expr)) value = evaluateExpression(expr, rec);
    else value = getPath(rec, expr);

    for (let i = 1; i < parts.length; i++) {
      const fnRaw = parts[i];
      const [fnName, argRaw] = fnRaw.split(":").map(s => s.trim());
      const args: any[] = [];
      if (argRaw !== undefined && argRaw.length > 0) args.push(...argRaw.split(",").map(a => a.trim()));
      const fn = transformers[fnName];
      if (fn) {
        try {
          if (value instanceof Date && (fnName === "money" || fnName === "num")) {
            value = fn(Math.floor(value.getTime() / 1000), ...args);
          } else value = fn(value, ...args);
        } catch (e) {
          console.warn(`transformer ${fnName} fallo`, e);
        }
      }
    }

    const content = (value == null) ? "" : (typeof value === "function" ? value() : value);

    // si hay clases, envolver en span con esas clases; si no, push text
    if (cls) {
      nodes.push(<span class={cls}>{content}</span>);
    } else {
      nodes.push(content);
    }
  }

  // resto del string
  if (lastIndex < template.length) {
    nodes.push(template.slice(lastIndex));
  }

  // si es solo un string, devolver string para simplicidad; si hay nodos mixtos, devolver fragmento JSX
  if (nodes.length === 0) return "";
  if (nodes.every(n => typeof n === "string"))
    return <>{nodes.join("")}</>;
  return <div class="gap-0.5 inline-flex items-center">{nodes}</div>;
};
