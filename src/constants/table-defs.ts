import { FieldFormat, FieldFormatLabels, FilterInput, TableDef, TableRecord } from '../types/schema';
import { TableField } from '../types/schema';

type PartialTableRecord = Omit<TableRecord, 'id'>
// Icono
export type IconItem = PartialTableRecord & {
  name: string;
  svg_content: string;
  description: string;
  fill: string;
  stroke: string;
};

// Usuario
export type UserItem = PartialTableRecord & {
  status: 0 | 1 | 2; // 0: Inactivo, 1: Activo, 2: Bloqueado
  admin: boolean;
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  password: string;
  apiKey: string | null;
  apiKeyExpiresAt: string | null;
  apiKeyLastUsed: string | null;
  conectedOn: string | null;
  lastLogoutAt: string | null;
  test_icon: string;
};

// Historial
export type JournalItem = PartialTableRecord & {
  tableIdentifier: string;
  recordId: string;
  notes: string;
};

// Detalle de Historial
export type JournalDetailItem = PartialTableRecord & {
  journalId: string;
  tableFieldId: string;
  value: string;
};

// Interfaz
export type InterfaceItem = PartialTableRecord & {
  persistant: boolean;
  name: string;
  icon: string;
  description: string;
  route: string;
  config: Record<string, any> | string;
};

// Ítem de Menú
export type MenuItem = PartialTableRecord & {
  name: string;
  identifier: string;
  icon: string;
  description: string;
  is_fast_link?: boolean;
  interface_id: string | null;
  parent_id: string | null;
  position: number;
};

// Ítem de Navegación
export type NavItem = PartialTableRecord & {
  name: string;
  identifier: string;
  icon: string;
  description: string;
  interface_id: string | null;
  position: number;
};

export type SettingGroupItem = PartialTableRecord & {
  name: string;
  description?: string;
}

export type SettingItem = PartialTableRecord & {
  name: string;
  key: string;
  fieldFormat: FieldFormat;
  description?: string;
  setting_group_id: string;
  value?: string;
  default?: string;
  position?: number;
}

export type FormItem = PartialTableRecord & {
  name: string;
  tableIdentifier: string;
  description?: string;
}

export type FormItemItem = PartialTableRecord & {
  form_id: string;
  type: 'container' | 'field' | 'divider';
  field_id?: string | null;
  parent_id?: string | null;
  size?: 1 | 2 | 3 | 4;
  filters?: FilterInput;
  position?: number;
}

export const TablesSpec: TableDef[] = [
  {
    icon: 'table',
    id: crypto.randomUUID(),
    identifier: 'table_defs',
    description: 'Definiciones de las Tablas',
    name: 'Tabla',
    namePlural: 'Tablas',
    formatSelection: `{icon|icon} {name}`,
    formatSelected: `{icon|icon} {name}`,
    tableFields: [
      { 
        id: crypto.randomUUID(), 
        tableIdentifier: 'table_defs', 
        identifier: 'icon', 
        name: 'Ícono', 
        fieldFormat: FieldFormat.RELATION, 
        relationKey: 'name',
        relationTableIdentifier: 'icons', 
        multiple: false, 
        default: 'table', 
        isRequired: false, 
        isFilter: false, 
        isUnique: false, 
        isEditable: true 
      },
      { id: crypto.randomUUID(), tableIdentifier: 'table_defs', identifier: 'identifier', name: 'Identificador', fieldFormat: FieldFormat.STRING, multiple: false, isRequired: true, isUnique: true, isFilter: true, isEditable: true, isSearchable: true },
      { id: crypto.randomUUID(), tableIdentifier: 'table_defs', identifier: 'name', name: 'Nombre', fieldFormat: FieldFormat.STRING, multiple: false, isRequired: true, isUnique: true, isFilter: true, isEditable: true, isSearchable: true },
      { id: crypto.randomUUID(), tableIdentifier: 'table_defs', identifier: 'namePlural', name: 'Nombre Plural', fieldFormat: FieldFormat.STRING, multiple: false, isUnique: true, isFilter: true, isEditable: true, isSearchable: true },
      { id: crypto.randomUUID(), tableIdentifier: 'table_defs', identifier: 'description', name: 'Descripción', fieldFormat: FieldFormat.TEXT, multiple: false, isEditable: true, isSearchable: true },
      { id: crypto.randomUUID(), tableIdentifier: 'table_defs', identifier: 'formatSelection', name: 'Formato Selección', fieldFormat: FieldFormat.STRING, multiple: false, isEditable: true, default: `{icon|icon} {name}` },
      { id: crypto.randomUUID(), tableIdentifier: 'table_defs', identifier: 'formatSelected', name: 'Formato Seleccionado', fieldFormat: FieldFormat.STRING, multiple: false, isEditable: true, default: `{icon|icon} {name}` },
      { id: crypto.randomUUID(), tableIdentifier: 'table_defs', identifier: 'formatSelectedMultiple', name: 'Formato Seleccionado Múltiple', fieldFormat: FieldFormat.STRING, multiple: false, isEditable: true, default: `{icon|icon} {name}` },
      { id: crypto.randomUUID(), tableIdentifier: 'table_defs', identifier: 'posx', name: 'Posición X', fieldFormat: FieldFormat.FLOAT, multiple: false, isEditable: true, default: 0 },
      { id: crypto.randomUUID(), tableIdentifier: 'table_defs', identifier: 'posy', name: 'Posición Y', fieldFormat: FieldFormat.FLOAT, multiple: false, isEditable: true, default: 0 },
    ]
  },
  {
    id: crypto.randomUUID(),
    identifier: 'table_fields',
    description: 'Definiciones de campos de una tabla',
    name: 'Campo de Tabla',
    namePlural: 'Campos de Tablas',
    icon: 'table-field',
    formatSelection: `format-{fieldFormat|icon} {name}`,
    formatSelected: `format-{fieldFormat|icon} {name}`,
    tableFields: [
      { id: crypto.randomUUID(), tableIdentifier: 'table_fields', identifier: 'name', name: 'Nombre', fieldFormat: FieldFormat.STRING, multiple: false, isRequired: true, isUnique: true, isFilter: true, isEditable: true, isSearchable: true },
      { id: crypto.randomUUID(), tableIdentifier: 'table_fields', identifier: 'identifier', name: 'Identificador', fieldFormat: FieldFormat.STRING, multiple: false, isRequired: true, isUnique: true, isFilter: true, isEditable: true, isSearchable: true },
      { 
        id: crypto.randomUUID(), 
        tableIdentifier: 'table_fields', 
        identifier: 'tableIdentifier', 
        name: 'Identificador de Tabla', 
        fieldFormat: FieldFormat.RELATION, 
        relationKey: 'identifier',
        relationTableIdentifier: 'table_defs', 
        multiple: false, 
        isRequired: true, 
        isFilter: true, 
        isEditable: true 
      },
      { id: crypto.randomUUID(), tableIdentifier: 'table_fields', identifier: 'description', name: 'Descripción', fieldFormat: FieldFormat.TEXT, multiple: false, isEditable: true },
      { id: crypto.randomUUID(), tableIdentifier: 'table_fields', identifier: 'fieldFormat', name: 'Formato', fieldFormat: FieldFormat.LIST, storeData: {posibleValues: Object.fromEntries(Object.entries(FieldFormatLabels).map(([key, label], index) => [key, { label, position: index }])), placeholder: 'Selecciona un formato'}, multiple: false, default: FieldFormat.STRING, isFilter: true, isEditable: true },
      { id: crypto.randomUUID(), tableIdentifier: 'table_fields', identifier: 'relationQuery', name: 'Filtro de Relación', fieldFormat: FieldFormat.JSON, multiple: false, isEditable: true },
      { 
        id: crypto.randomUUID(), 
        tableIdentifier: 'table_fields', 
        identifier: 'relationTableIdentifier', 
        name: 'Tabla Relacionada', 
        fieldFormat: FieldFormat.RELATION, 
        relationKey: 'identifier',
        relationTableIdentifier: 'table_defs', 
        multiple: false, 
        isEditable: true 
      },
      { id: crypto.randomUUID(), tableIdentifier: 'table_fields', identifier: 'isFilter', name: 'Es Filtro', fieldFormat: FieldFormat.BOOL, multiple: false, isEditable: true, default: false },
      { id: crypto.randomUUID(), tableIdentifier: 'table_fields', identifier: 'isUnique', name: 'Es Único', fieldFormat: FieldFormat.BOOL, multiple: false, isEditable: true, default: false },
      { id: crypto.randomUUID(), tableIdentifier: 'table_fields', identifier: 'isSearchable', name: 'Es Buscable', fieldFormat: FieldFormat.BOOL, multiple: false, isEditable: true, default: false },
      { id: crypto.randomUUID(), tableIdentifier: 'table_fields', identifier: 'multiple', name: 'Es Múltiple', fieldFormat: FieldFormat.BOOL, multiple: false, isEditable: true, default: false },
      { id: crypto.randomUUID(), tableIdentifier: 'table_fields', identifier: 'isRequired', name: 'Es Requerido', fieldFormat: FieldFormat.BOOL, multiple: false, isEditable: true, default: false },
      { id: crypto.randomUUID(), tableIdentifier: 'table_fields', identifier: 'isVisible', name: 'Es Visible', fieldFormat: FieldFormat.BOOL, multiple: false, isEditable: true, default: true },
      { id: crypto.randomUUID(), tableIdentifier: 'table_fields', identifier: 'isEditable', name: 'Es Editable', fieldFormat: FieldFormat.BOOL, multiple: false, isEditable: true, default: true },
      { id: crypto.randomUUID(), tableIdentifier: 'table_fields', identifier: 'history', name: 'Diario', fieldFormat: FieldFormat.BOOL, multiple: false, isEditable: true, default: true },
      { id: crypto.randomUUID(), tableIdentifier: 'table_fields', identifier: 'default', name: 'Por Defecto', fieldFormat: FieldFormat.STRING, isFilter: false, isEditable: true },
      { id: crypto.randomUUID(), tableIdentifier: 'table_fields', identifier: 'storeData', name: 'Data', fieldFormat: FieldFormat.JSON, isEditable: true },
    ]
  }, {
    icon: 'user',
    id: crypto.randomUUID(),
    identifier: 'users',
    description: 'Tabla para los usuarios del sistema',
    name: 'Usuario',
    namePlural: 'Usuarios',
    formatSelection: `{firstname} {lastname} - {username}`,
    formatSelected: `{firstname} {lastname}`,
    tableFields: [
      { id: crypto.randomUUID(), tableIdentifier: 'users', identifier: 'status', name: 'Status', fieldFormat: FieldFormat.LIST, multiple: false, default: 0, storeData: { posibleValues: { 0: { label: 'Inactivo' }, 1: { label: 'Activo' }, 2: { label: 'Bloqueado' } } }, isRequired: true, isFilter: true, isEditable: true },
      { id: crypto.randomUUID(), tableIdentifier: 'users', identifier: 'admin', name: 'Admin', fieldFormat: FieldFormat.BOOL, multiple: false, default: 'false', isFilter: true, isEditable: true },
      { id: crypto.randomUUID(), tableIdentifier: 'users', identifier: 'firstname', name: 'Firstname', fieldFormat: FieldFormat.STRING, multiple: false, isRequired: true, isFilter: true, isEditable: true, isSearchable: true },
      { id: crypto.randomUUID(), tableIdentifier: 'users', identifier: 'lastname', name: 'Lastname', fieldFormat: FieldFormat.STRING, multiple: false, default: '', isFilter: true, isEditable: true, isSearchable: true },
      { id: crypto.randomUUID(), tableIdentifier: 'users', identifier: 'username', name: 'Username', fieldFormat: FieldFormat.STRING, multiple: false, isRequired: true, isUnique: true, isEditable: true, isSearchable: true },
      { id: crypto.randomUUID(), tableIdentifier: 'users', identifier: 'email', name: 'Email', fieldFormat: FieldFormat.STRING, multiple: false, storeData: { type: 'email' }, isRequired: true, isUnique: true, isEditable: true },
      { id: crypto.randomUUID(), tableIdentifier: 'users', identifier: 'password', name: 'Password', fieldFormat: FieldFormat.STRING, multiple: false, isEditable: true, isVisible: false },
      { id: crypto.randomUUID(), tableIdentifier: 'users', identifier: 'apiKey', name: 'ApiKey', fieldFormat: FieldFormat.STRING, multiple: false, isEditable: false, isVisible: false, default: null, history: false },
      { id: crypto.randomUUID(), tableIdentifier: 'users', identifier: 'apiKeyExpiresAt', name: 'apiKeyExpiresAt', fieldFormat: FieldFormat.DATETIME, multiple: false, isEditable: false, isVisible: false, default: null, history: false },
      { id: crypto.randomUUID(), tableIdentifier: 'users', identifier: 'apiKeyLastUsed', name: 'ApiKeyLastUsed', fieldFormat: FieldFormat.DATETIME, multiple: false, isEditable: false, default: null, history: false },
      { id: crypto.randomUUID(), tableIdentifier: 'users', identifier: 'conectedOn', name: 'ConectedOn', fieldFormat: FieldFormat.DATETIME, multiple: false, isFilter: true, isEditable: false, default: null, history: false },
      { id: crypto.randomUUID(), tableIdentifier: 'users', identifier: 'lastLogoutAt', name: 'LastLogoutAt', fieldFormat: FieldFormat.DATETIME, multiple: false, isEditable: false, default: null, history: false },
      { 
        id: crypto.randomUUID(), 
        tableIdentifier: 'users', 
        identifier: 'test_icon', 
        name: 'Test Icon', 
        fieldFormat: FieldFormat.RELATION, 
        relationKey: 'name',
        relationTableIdentifier: 'icons', 
        multiple: false, 
        default: '', 
        isFilter: false, 
        isEditable: true, 
        isSearchable: false 
      },
    ]
  },
  {
    id: crypto.randomUUID(),
    identifier: 'journals',
    description: 'Tabla para el monitoreo de modificaciones',
    name: 'Diario',
    namePlural: 'Diarios',
    icon: 'journal',
    tableFields: [
      { 
        id: crypto.randomUUID(), 
        tableIdentifier: 'journals', 
        identifier: 'tableIdentifier', 
        name: 'Tabla', 
        fieldFormat: FieldFormat.RELATION, 
        relationKey: 'identifier',
        relationTableIdentifier: 'table_defs', 
        multiple: false, 
        default: '', 
        isFilter: true, 
        isEditable: false 
      },
      { id: crypto.randomUUID(), tableIdentifier: 'journals', identifier: 'recordId', name: 'Registro', fieldFormat: FieldFormat.RELATION, multiple: false, default: '', isFilter: true, isEditable: false },
      { id: crypto.randomUUID(), tableIdentifier: 'journals', identifier: 'notes', name: 'Notas', fieldFormat: FieldFormat.TEXT, multiple: false, isRequired: false, isFilter: false, isEditable: true },

    ] as TableField[]
  },
  {
    id: crypto.randomUUID(),
    identifier: 'journal_details',
    description: 'Tabla que indica los detalles de modificaciones',
    name: 'Detalles de Diario',
    namePlural: 'Detalles de Diarios',
    icon: 'journal-detail',
    tableFields: [
      { id: crypto.randomUUID(), tableIdentifier: 'journal_details', identifier: 'journalId', name: 'Diario', fieldFormat: FieldFormat.RELATION, relationTableIdentifier: 'journals', multiple: false, isRequired: true, default: '', isFilter: true, isEditable: false },
      { 
        id: crypto.randomUUID(), 
        tableIdentifier: 'journal_details', 
        identifier: 'tableFieldIdentifier', 
        name: 'Campo', 
        fieldFormat: FieldFormat.RELATION, 
        relationKey: 'identifier',
        relationTableIdentifier: 'table_fields', 
        multiple: false, 
        isRequired: true, 
        default: '', 
        isFilter: true, 
        isEditable: false 
      },
      { id: crypto.randomUUID(), tableIdentifier: 'journal_details', identifier: 'value', name: 'Valor', fieldFormat: FieldFormat.TEXT, multiple: false, isRequired: false, default: '', isFilter: false, isEditable: false },

    ]
  }, {
    id: crypto.randomUUID(),
    identifier: 'interfaces',
    description: 'Tabla para diseñar interfaces',
    name: 'Interfaz',
    namePlural: 'Interfaces',
    icon: 'web-interface',
    formatSelection: `{icon|icon} {name}`,
    tableFields: [
      { id: crypto.randomUUID(), tableIdentifier: 'interfaces', identifier: 'persistant', name: 'Persistente', description: 'No puede ser borrado', fieldFormat: FieldFormat.BOOL, multiple: false, default: 'false', isRequired: false, isFilter: true, isVisible: true, isEditable: false, isSearchable: false },
      { id: crypto.randomUUID(), tableIdentifier: 'interfaces', identifier: 'name', name: 'Nombre', fieldFormat: FieldFormat.STRING, multiple: false, default: '', isRequired: true, isFilter: true, isEditable: true, isSearchable: true },
      { id: crypto.randomUUID(), tableIdentifier: 'interfaces', identifier: 'route', name: 'Ruta', fieldFormat: FieldFormat.STRING, multiple: false, default: '', isRequired: true, isFilter: true, isUnique: true, isEditable: true, isSearchable: true },
      { 
        id: crypto.randomUUID(), 
        tableIdentifier: 'interfaces', 
        identifier: 'icon', 
        name: 'Ícono', 
        fieldFormat: FieldFormat.RELATION, 
        relationKey: 'name',
        relationTableIdentifier: 'icons', 
        multiple: false, 
        default: 'menu', 
        isRequired: false, 
        isFilter: false, 
        isUnique: false, 
        isEditable: true 
      },
      { id: crypto.randomUUID(), tableIdentifier: 'interfaces', identifier: 'description', name: 'Descripción', fieldFormat: FieldFormat.TEXT, multiple: false, default: '', isRequired: false, isFilter: false, isUnique: false, isEditable: true },
      { id: crypto.randomUUID(), tableIdentifier: 'interfaces', identifier: 'config', name: 'Configuración', fieldFormat: FieldFormat.JSON, multiple: false, isRequired: false, default: '', isFilter: false, isEditable: true },

    ]
  }, {
    id: crypto.randomUUID(),
    identifier: 'menu_items',
    description: 'Elementos de navegación. Incluye tanto los enlaces del menú lateral como barra superior.',
    name: 'Menú de navegación',
    namePlural: 'Menús de navegación',
    icon: 'nav-menu',
    formatSelection: `{icon??interface_id.icon|icon} {name}`,
    tableFields: [
      { id: crypto.randomUUID(), tableIdentifier: 'menu_items', identifier: 'name', name: 'Nombre', fieldFormat: FieldFormat.STRING, multiple: false, default: '', isRequired: true, isFilter: true, isEditable: true, isSearchable: true },
      { id: crypto.randomUUID(), tableIdentifier: 'menu_items', identifier: 'identifier', name: 'Identificador', fieldFormat: FieldFormat.STRING, multiple: false, default: '', isRequired: true, isFilter: true, isUnique: true, isEditable: true, isSearchable: true },
      { 
        id: crypto.randomUUID(), 
        tableIdentifier: 'menu_items', 
        identifier: 'icon', 
        name: 'Ícono', 
        fieldFormat: FieldFormat.RELATION, 
        relationKey: 'name',
        relationTableIdentifier: 'icons', 
        multiple: false, 
        default: '', 
        isRequired: false, 
        isFilter: false, 
        isUnique: false, 
        isEditable: true 
      },
      { id: crypto.randomUUID(), tableIdentifier: 'menu_items', identifier: 'description', name: 'Descripción', fieldFormat: FieldFormat.TEXT, multiple: false, default: '', isRequired: false, isFilter: true, isUnique: false, isEditable: true, isSearchable: true },
      { id: crypto.randomUUID(), tableIdentifier: 'menu_items', identifier: 'interface_id', name: 'Interfáz', fieldFormat: FieldFormat.RELATION, relationTableIdentifier: 'interfaces', multiple: false, default: '', isRequired: false, isFilter: true, isEditable: true },
      { id: crypto.randomUUID(), tableIdentifier: 'menu_items', identifier: 'parent_id', name: 'Padre', fieldFormat: FieldFormat.RELATION, relationTableIdentifier: 'menu_items', multiple: false, isRequired: false, default: '', isFilter: true, isEditable: true },
      { id: crypto.randomUUID(), tableIdentifier: 'menu_items', identifier: 'is_fast_link', name: 'Enlace Rápido', description: "Declarar como enlace rápido hace que aparezca en la barra superior de navegacón.", fieldFormat: FieldFormat.BOOL, multiple: false, isRequired: false, default: 'false', isFilter: true, isEditable: true },
      { id: crypto.randomUUID(), tableIdentifier: 'menu_items', identifier: 'position', name: 'Posición', fieldFormat: FieldFormat.INT, multiple: false, default: 1, isRequired: false, isFilter: false, isEditable: true },
    ]
  },
  {
    id: crypto.randomUUID(),
    identifier: 'setting_groups',
    description: 'Agrupación de la configuración general de la aplicación',
    name: 'Configuración Grupo',
    namePlural: 'Configuraciones Grupos',
    icon: 'settings-group',
    formatSelection: `{name}`,
    formatSelected: `{name}`,
    formatSelectedMultiple: `{name}`,
    tableFields: [
      { id: crypto.randomUUID(), tableIdentifier: 'setting_groups', identifier: 'name', name: 'Nombre', fieldFormat: FieldFormat.STRING, multiple: false, default: '', isRequired: true, isFilter: true, isUnique: true, isEditable: true, isSearchable: true },
      { id: crypto.randomUUID(), tableIdentifier: 'setting_groups', identifier: 'description', name: 'Descripción', fieldFormat: FieldFormat.TEXT, multiple: false, default: '', isRequired: false, isFilter: false, isUnique: false, isEditable: true },
      { id: crypto.randomUUID(), tableIdentifier: 'setting_groups', identifier: 'parent_id', name: 'Padre', fieldFormat: FieldFormat.RELATION, relationTableIdentifier: 'setting_groups', multiple: false, default: '', isRequired: false, isFilter: false, isUnique: false, isEditable: true },
    ]
  },
  {
    id: crypto.randomUUID(),
    identifier: 'settings',
    description: 'Configuración general de la aplicación',
    name: 'Configuración',
    namePlural: 'Configuraciones',
    icon: 'settings',
    formatSelection: `{setting_group_id.name|truncate:25} - {name}`,
    formatSelected: `{setting_group_id.name|truncate:25} - {name}`,
    formatSelectedMultiple: `{name}`,
    tableFields: [
      { id: crypto.randomUUID(), tableIdentifier: 'settings', identifier: 'name', name: 'Nombre', fieldFormat: FieldFormat.STRING, multiple: false, default: '', isRequired: true, isFilter: true, isUnique: false, isEditable: true, isSearchable: true },
      { id: crypto.randomUUID(), tableIdentifier: 'settings', identifier: 'key', name: 'Identificador', fieldFormat: FieldFormat.STRING, multiple: false, default: '', isRequired: true, isFilter: true, isUnique: true, isEditable: true, isSearchable: true },
      {
        id: crypto.randomUUID(), tableIdentifier: 'settings', identifier: 'fieldFormat', name: 'Tipo de Campo', fieldFormat: FieldFormat.LIST, storeData: {
          posibleValues: Object.fromEntries(
            Object.entries(FieldFormatLabels).map(([key, value]) => [key, { label: value }])
          )
        }, multiple: false, default: '', isRequired: true, isFilter: true, isEditable: true
      },
      { 
        id: crypto.randomUUID(), 
        tableIdentifier: 'settings', 
        identifier: 'relationTableIdentifier', 
        name: 'Tabla Relacionada', 
        fieldFormat: FieldFormat.RELATION, 
        relationKey: 'identifier',
        relationTableIdentifier: 'table_defs', 
        multiple: false, 
        default: '', 
        isRequired: false, 
        isFilter: false, 
        isUnique: false, 
        isEditable: true 
      },
      { id: crypto.randomUUID(), tableIdentifier: 'settings', identifier: 'storeData', name: 'Datos Personalizados', fieldFormat: FieldFormat.JSON, multiple: false, default: '', isRequired: false, isFilter: false, isUnique: false, isEditable: true },
      { id: crypto.randomUUID(), tableIdentifier: 'settings', identifier: 'multiple', name: 'Múltiples valores', fieldFormat: FieldFormat.BOOL, multiple: false, default: '', isRequired: false, isFilter: false, isUnique: false, isEditable: true },
      { id: crypto.randomUUID(), tableIdentifier: 'settings', identifier: 'placeholder', name: 'Placeholder', fieldFormat: FieldFormat.STRING, multiple: false, default: '', isRequired: false, isFilter: false, isUnique: false, isEditable: true },
      { id: crypto.randomUUID(), tableIdentifier: 'settings', identifier: 'description', name: 'Descripción', fieldFormat: FieldFormat.TEXT, multiple: false, default: '', isRequired: false, isFilter: false, isUnique: false, isEditable: true, isSearchable: true },
      { id: crypto.randomUUID(), tableIdentifier: 'settings', identifier: 'setting_group_id', name: 'Grupo', fieldFormat: FieldFormat.RELATION, relationTableIdentifier: 'setting_groups', multiple: false, default: '', isRequired: true, isFilter: true, isUnique: false, isEditable: true },
      { id: crypto.randomUUID(), tableIdentifier: 'settings', identifier: 'value', name: 'Valor', fieldFormat: FieldFormat.TEXT, multiple: false, default: '', isRequired: false, isFilter: false, isUnique: false, isEditable: true },
      { id: crypto.randomUUID(), tableIdentifier: 'settings', identifier: 'default', name: 'Por defecto', fieldFormat: FieldFormat.TEXT, multiple: false, default: '', isRequired: false, isFilter: false, isUnique: false, isEditable: true },
      { id: crypto.randomUUID(), tableIdentifier: 'settings', identifier: 'position', name: 'Posición', fieldFormat: FieldFormat.INT, multiple: false, default: 1, isRequired: false, isFilter: false, isEditable: true },
    ]
  },
  {
    id: crypto.randomUUID(),
    identifier: 'icons',
    description: 'Tabla de iconos SVG',
    name: 'Icono',
    icon: 'icon',
    namePlural: 'Iconos',
    formatSelection: `{name|icon} {name}`,
    formatSelected: `{name|icon} {name}`,
    formatSelectedMultiple: `{name|icon}`,
    tableFields: [
      { id: crypto.randomUUID(), tableIdentifier: 'icons', identifier: 'name', name: 'Nombre', fieldFormat: FieldFormat.STRING, multiple: false, default: '', isRequired: true, isFilter: true, isUnique: true, isEditable: true, isSearchable: true },
      {
        id: crypto.randomUUID(), tableIdentifier: 'icons', identifier: 'svg_content', name: 'SVG Content', fieldFormat: FieldFormat.TEXT, multiple: false,
        default: '<path d="M14 3v4a1 1 0 0 0 1 1h4"/>\n<path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"/>',
        isRequired: true, isFilter: false, isUnique: false, isEditable: true, isSearchable: false
      },
      { id: crypto.randomUUID(), tableIdentifier: 'icons', identifier: 'description', name: 'Descripción', fieldFormat: FieldFormat.TEXT, multiple: false, default: '', isRequired: false, isFilter: false, isUnique: false, isEditable: true },
      { id: crypto.randomUUID(), tableIdentifier: 'icons', identifier: 'fill', name: 'Relleno', fieldFormat: FieldFormat.STRING, storeData: { type: 'color', placeholder: 'transparent' }, multiple: false, default: '', isRequired: false, isFilter: false, isUnique: false, isEditable: true },
      { id: crypto.randomUUID(), tableIdentifier: 'icons', identifier: 'stroke', name: 'Trazo', fieldFormat: FieldFormat.STRING, storeData: { type: 'color', placeholder: '#0033ff' }, multiple: false, default: '', isRequired: false, isFilter: false, isUnique: false, isEditable: true },
    ]
  },
  {
    id: crypto.randomUUID(),
    identifier: 'forms',
    description: 'Estructura de Formulario',
    name: 'Formulario',
    namePlural: 'Formularios',
    icon: 'form',
    formatSelection: `{name}`,
    formatSelected: `{name}`,
    formatSelectedMultiple: `{name}`,
    tableFields: [
      { id: crypto.randomUUID(), tableIdentifier: 'forms', identifier: 'name', name: 'Nombre', fieldFormat: FieldFormat.STRING, multiple: false, default: '', isRequired: true, isFilter: true, isUnique: true, isEditable: true, isSearchable: true },
      { id: crypto.randomUUID(), tableIdentifier: 'forms', identifier: 'description', name: 'Descripción', fieldFormat: FieldFormat.TEXT, multiple: false, default: '', isRequired: false, isFilter: false, isUnique: false, isEditable: true },
      { 
        id: crypto.randomUUID(), 
        tableIdentifier: 'forms', 
        identifier: 'tableIdentifier', 
        name: 'Tabla Relacionada', 
        fieldFormat: FieldFormat.RELATION, 
        relationKey: 'identifier',
        relationTableIdentifier: 'table_defs', 
        multiple: false, 
        default: '', 
        isRequired: false, 
        isFilter: false, 
        isUnique: false, 
        isEditable: true 
      },
    ]
  },
  {
    id: crypto.randomUUID(),
    identifier: 'form_items',
    description: 'Elemento de Formulario',
    name: 'Elemento de Formulario',
    namePlural: 'Elementos de Formularios',
    icon: 'form-item',
    formatSelection: `{name}`,
    formatSelected: `{name}`,
    formatSelectedMultiple: `{name}`,
    tableFields: [
      { id: crypto.randomUUID(), tableIdentifier: 'form_items', identifier: 'form_id', name: 'Formulario', fieldFormat: FieldFormat.RELATION, relationTableIdentifier: 'forms', multiple: false, default: '', isRequired: true, isFilter: true, isUnique: false, isEditable: true },
      { id: crypto.randomUUID(), tableIdentifier: 'form_items', identifier: 'type', name: 'Tipo', fieldFormat: FieldFormat.LIST, multiple: false, default: '', storeData: { posibleValues: { container: { label: 'Contenedor', position: 0 }, field: { label: 'Campo', position: 1 }, divider: { label: 'Divisor Horizontal', position: 2 } } }, isRequired: true, isFilter: true, isUnique: false, isEditable: true, isSearchable: false },
      { 
        id: crypto.randomUUID(), 
        tableIdentifier: 'form_items', 
        identifier: 'field_identifier', 
        name: 'Campo', 
        fieldFormat: FieldFormat.RELATION, 
        relationKey: 'identifier',
        relationTableIdentifier: 'table_fields', 
        relationQuery: {tableIdentifier: {op: '=', v: '{form_id.tableIdentifier}'}}, 
        multiple: false, 
        default: '', 
        isRequired: false, 
        isFilter: true, 
        isUnique: false, 
        isEditable: true 
      },
      { id: crypto.randomUUID(), tableIdentifier: 'form_items', identifier: 'parent_id', name: 'Padre', fieldFormat: FieldFormat.RELATION, relationTableIdentifier: 'form_items', multiple: false, default: '', isRequired: false, isFilter: false, isUnique: false, isEditable: true },
      { id: crypto.randomUUID(), tableIdentifier: 'form_items', identifier: 'size', name: 'Ancho', fieldFormat: FieldFormat.LIST, storeData: { posibleValues: { 1: { label: '25%' }, 2: { label: '50%' }, 3: { label: '75%' }, 4: { label: '100%' }, } }, multiple: false, default: '2', isRequired: false, isFilter: false, isUnique: false, isEditable: true },
      { id: crypto.randomUUID(), tableIdentifier: 'form_items', identifier: 'filters', name: 'Condición', fieldFormat: FieldFormat.JSON, multiple: false, isRequired: false, isFilter: false, isUnique: false, isEditable: true },
      { id: crypto.randomUUID(), tableIdentifier: 'form_items', identifier: 'position', name: 'Posición', fieldFormat: FieldFormat.INT, multiple: false, default: 0, isRequired: false, isFilter: false, isEditable: true },
    ]
  },

]

// TODO: Hacer que en el relationTableIdentifier, haya un campo que indique la dependencia (none, nullable, destroy)