import { JSXElement } from "solid-js";

export interface RawRecordFilter {
  field?: string;
  op: "=" | "!=" | ">" | "<" | ">=" | "<=" | "~" | "~~" | "~~~" | "!~~~" | "starts" | "ends" | "<=>" | "*" | "!*";
  v?: any;
  or?: string | number;
}
export type FilterInput = Record<string, any> | RawRecordFilter | Array<RawRecordFilter | Record<string, any>>;

export interface FieldFilter {
  op: RawRecordFilter["op"];
  v?: any;
  or?: string | number;
}
export type NormalizedFilters = Record<string, FieldFilter>;

export type TableRecord = {
  id: string;
  authorId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  syncStatus?: number;
  [key: string]: any;
};

export type TableDef = {
  id: string; // id estable para comparar cambios
  name: string;
  namePlural: string;
  identifier: string; // nombre del store en IndexedDB
  icon?: string;
  description?: string;
  tableFields?: TableField[];
  formatSelection?: string | null;
  formatSelected?: string | null;
  formatSelectedMultiple?: string | null;
  posx?: number | null;
  posy?: number | null;
};

// Objeto original con los valores
export const FieldFormat = {
  STRING: 'string',
  TEXT: 'text',
  DATE: 'date',
  TIME: 'time',
  DATETIME: 'datetime',
  INT: 'int',
  FLOAT: 'float',
  BOOL: 'bool',
  RELATION: 'relation',
  LIST: 'list',
  ATTACHMENT: 'attachment',
  JSON: 'json',
} as const;

export type FieldFormat = typeof FieldFormat[keyof typeof FieldFormat];

// Objeto separado para los labels
export const FieldFormatLabels: Record<FieldFormat, string> = {
  [FieldFormat.STRING]: 'Texto corto',
  [FieldFormat.TEXT]: 'Texto largo',
  [FieldFormat.DATE]: 'Fecha',
  [FieldFormat.TIME]: 'Hora',
  [FieldFormat.DATETIME]: 'Fecha y Hora',
  [FieldFormat.INT]: 'Número entero',
  [FieldFormat.FLOAT]: 'Número decimal',
  [FieldFormat.BOOL]: 'Verdadero/Falso',
  [FieldFormat.RELATION]: 'Relación',
  [FieldFormat.LIST]: 'Lista',
  [FieldFormat.ATTACHMENT]: 'Archivo adjunto',
  [FieldFormat.JSON]: 'JSON',
};

// También puedes exportar el tipo de labels si lo necesitas
export type FieldFormatLabel = typeof FieldFormatLabels[FieldFormat];

export type TableField = {
  id: string; // id estable para comparar cambios
  name: string;
  identifier: string; // nombre del campo en el store
  tableIdentifier: string; // referencia al table.identifier
  fieldFormat: FieldFormat;
  relationQuery?: NormalizedFilters;
  relationTableIdentifier?: string;
  relationKey?: string;
  isFilter?: boolean;
  isUnique?: boolean;
  isSearchable?: boolean; // Solamente para string y relation, en el caso de relation, buscar por el primer campo string isSearchable.
  multiple?: boolean;
  isRequired?: boolean;
  description?: string;
  isVisible?: boolean;
  isEditable?: boolean;
  history?: boolean;
  default?: any;
  storeData?: { 
    posibleValues?: { [key: string]: { label: string | (()=>JSXElement); position?: number } }; // para list
    currentId?: number; // para list
    placeholder?: string;
    type?: 'email' | 'tel' | 'url' | 'password' | 'search' | 'text' | 'color'; // para string
    relationKey?: string;
    min?: number;  // para string/text/int/float
    max?: number;  // para string/text/int/float
    formatted?: boolean; // para text
    regexp?: string;     // para string
    regexpError?: string;// para string
    createable?: boolean; // para relation
    quickPick?: string;  // para relation
    groupBy?: string;    // para relation
    [key: string]: any; // para futuras expansiones
  };
  createdAt?: string;
  updatedAt?: string;
  position?: number;
  syncStatus?: number;
};

export type Journal = {
  id: number;
  tableIdentifier: string;
  recordId: string;
  notes?: string
  authorId?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  syncStatus?: number;
}

export type JournalValue = {
  id: number;
  journalId: number;
  tableFieldId: string;
  value?: any;
  authorId?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  syncStatus?: number;
}

export type Interface = {
  id: string;
  name: string;
  identfier: string;
  config?: any;
  authorId?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  syncStatus?: number;
}

export type InterfaceMenu = {
  id: string;
  name: string;
  identfier: string;
  interfaceId: string;
  parentId?: string | null;
  authorId?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  syncStatus?: number;
}

export type Settings = {
  id?: number;
  lastSyncOn: Date | null;
  // otras propiedades según necesites
};

// Interfaz para las tablas dinámicas
export interface DynamicTable {
  id: string;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: any;
}
// src/types/interfaces.ts

export type DynamicConfig = {
  type: string;
  props?: Record<string, any>;
  items?: string | any[] | ((context: Record<string, any>) => any[] | any);
  children?: DynamicConfig[];
};

export type InterfaceDef = {
  id?: string;
  name: string;
  identifier: string;
  description?: string;
  config: DynamicConfig[]; // el array jerárquico que guardará la vista
  createdAt?: string;
  updatedAt?: string;
};
