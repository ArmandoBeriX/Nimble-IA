import { FieldFormat, FieldFormatLabels, FilterInput, TableDef, TableRecord } from '../types/schema';
import { TableField } from '../types/schema';

// Icono
export type IconItem = TableRecord & {
  name: string;
  svg_content: string;
  description: string;
  fill: string;
  stroke: string;
};

// Usuario
export type UserItem = TableRecord & {
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
export type JournalItem = TableRecord & {
  tableIdentifier: string;
  recordId: string;
  notes: string;
};

// Detalle de Historial
export type JournalDetailItem = TableRecord & {
  journalId: string;
  tableFieldId: string;
  value: string;
};

// Interfaz
export type InterfaceItem = TableRecord & {
  id: string;
  persistant: boolean;
  name: string;
  icon: string;
  description: string;
  route: string;
  config: Record<string, any> | string;
};

// Ítem de Menú
export type MenuItem = TableRecord & {
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
export type NavItem = TableRecord & {
  name: string;
  identifier: string;
  icon: string;
  description: string;
  interface_id: string | null;
  position: number;
};

export type SettingGroupItem = TableRecord & {
  name: string;
  description?: string;
}

export type SettingItem = TableRecord & {
  name: string;
  key: string;
  fieldFormat: FieldFormat;
  description?: string;
  setting_group_id: string;
  value?: string;
  default?: string;
  position?: number;
}

export type FormItem = TableRecord & {
  name: string;
  tableIdentifier: string;
  description?: string;
}

export type FormItemItem = TableRecord & {
  form_id: string;
  type: 'container' | 'field' | 'divider';
  field_id?: string | null;
  parent_id?: string | null;
  size?: 1 | 2 | 3 | 4;
  filters?: FilterInput;
  position?: number;
}

// ─── Agrupaciones de color ────────────────────────────────────────────────────
// 🔵 Azul    (#3b82f6) — Esquema / Meta:     table_defs, table_fields
// 🟢 Verde   (#22c55e) — Usuarios:            users
// 🟡 Ámbar   (#f59e0b) — Auditoría:           journals, journal_details
// 🟣 Púrpura (#06b6d4) — Navegación / UI:     interfaces, menu_items, icons
// 🟠 Naranja (#f97316) — Configuración:       setting_groups, settings
// 🩵 Teal    (#14b8a6) — Formularios:         forms, form_items
// ─────────────────────────────────────────────────────────────────────────────

// ─── Distribución en canvas (ancho=243, gap_x=30, gap_y=50) ──────────────────
// Altura = 43 + (n_campos × 29)
//   table_defs      col0  x=0     y=0    h=362  (11 campos)
//   journals        col0  x=0     y=412  h=130  ( 3 campos)
//   journal_details col0  x=0     y=592  h=130  ( 3 campos)
//   table_fields    col1  x=273   y=0    h=565  (18 campos)
//   users           col2  x=546   y=0    h=420  (13 campos)
//   icons           col2  x=546   y=470  h=188  ( 5 campos)
//   interfaces      col3  x=819   y=0    h=217  ( 6 campos)
//   menu_items      col3  x=819   y=267  h=275  ( 8 campos)
//   setting_groups  col4  x=1092  y=0    h=130  ( 3 campos)
//   settings        col4  x=1092  y=180  h=391  (12 campos)
//   forms           col5  x=1365  y=0    h=130  ( 3 campos)
//   form_items      col5  x=1365  y=180  h=246  ( 7 campos)
// ─────────────────────────────────────────────────────────────────────────────

export const TablesSpec: TableDef[] = [
  {
    color: '#3b82f6',
    posx: 0,
    posy: 0,
    icon: 'table',
    id: crypto.randomUUID(),
    identifier: 'table_defs',
    description: 'Metadatos de todas las tablas del sistema. Cada registro representa una entidad de datos, incluyendo su nombre, ícono, formatos de visualización y posición en el diagrama de esquema.',
    name: 'Tabla',
    namePlural: 'Tablas',
    formatSelection: `{icon|icon} {namePlural??name}`,
    formatSelected: `{icon|icon} {namePlural??name}`,
    tableFields: [
      {
        id: crypto.randomUUID(),
        tableIdentifier: 'table_defs',
        identifier: 'icon',
        name: 'Ícono',
        description: 'Ícono representativo de la tabla, seleccionado desde el catálogo de iconos SVG del sistema.',
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
      {
        id: crypto.randomUUID(), tableIdentifier: 'table_defs', identifier: 'identifier', name: 'Identificador',
        description: 'Clave única en formato snake_case que identifica la tabla en el código y en las relaciones (ej: "menu_items").',
        fieldFormat: FieldFormat.STRING, multiple: false, isRequired: true, isUnique: true, isFilter: true, isEditable: true, isSearchable: true
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'table_defs', identifier: 'name', name: 'Nombre',
        description: 'Nombre singular en lenguaje natural para mostrar en la interfaz (ej: "Menú de navegación").',
        fieldFormat: FieldFormat.STRING, multiple: false, isRequired: true, isUnique: true, isFilter: true, isEditable: true, isSearchable: true
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'table_defs', identifier: 'namePlural', name: 'Nombre Plural',
        description: 'Forma plural del nombre de la tabla para listados y encabezados (ej: "Menús de navegación").',
        fieldFormat: FieldFormat.STRING, multiple: false, isUnique: false, isFilter: true, isEditable: true, isSearchable: true
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'table_defs', identifier: 'description', name: 'Descripción',
        description: 'Descripción detallada del propósito y contenido de la tabla.',
        fieldFormat: FieldFormat.TEXT, multiple: false, isEditable: true, isSearchable: true
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'table_defs', identifier: 'color', name: 'Color',
        description: 'Color que va a tener la tabla para mejorar la identificación visual en el diagrama de esquema',
        fieldFormat: FieldFormat.STRING, multiple: false, isEditable: true, isSearchable: false, storeData: { type: 'color' }
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'table_defs', identifier: 'formatSelection', name: 'Formato Selección',
        description: 'Plantilla que define cómo se muestra un registro en listas desplegables. Soporta expresiones como {campo|modificador}.',
        fieldFormat: FieldFormat.STRING, multiple: false, isEditable: true, default: `{icon|icon} {name}`
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'table_defs', identifier: 'formatSelected', name: 'Formato Seleccionado',
        description: 'Plantilla que define cómo se muestra un registro ya seleccionado en un selector de valor único.',
        fieldFormat: FieldFormat.STRING, multiple: false, isEditable: true, default: `{icon|icon} {name}`
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'table_defs', identifier: 'formatSelectedMultiple', name: 'Formato Seleccionado Múltiple',
        description: 'Plantilla que define cómo se muestra cada ítem en un selector de valores múltiples.',
        fieldFormat: FieldFormat.STRING, multiple: false, isEditable: true, default: `{icon|icon} {name}`
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'table_defs', identifier: 'posx', name: 'Posición X',
        description: 'Coordenada horizontal (en píxeles) de la tabla en el diagrama visual de esquema.',
        fieldFormat: FieldFormat.FLOAT, multiple: false, isEditable: true, default: 0
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'table_defs', identifier: 'posy', name: 'Posición Y',
        description: 'Coordenada vertical (en píxeles) de la tabla en el diagrama visual de esquema.',
        fieldFormat: FieldFormat.FLOAT, multiple: false, isEditable: true, default: 0
      },
    ]
  },
  {
    color: '#3b82f6',
    posx: 273,
    posy: 0,
    id: crypto.randomUUID(),
    identifier: 'table_fields',
    description: 'Define los campos (columnas) que componen cada tabla del sistema. Incluye el tipo de dato, validaciones, visibilidad, comportamiento de búsqueda y relaciones con otras tablas.',
    name: 'Campo de Tabla',
    namePlural: 'Campos de Tablas',
    icon: 'table-field',
    formatSelection: `{fieldFormat|icon} {name}`,
    formatSelected: `{fieldFormat|icon} {name}`,
    tableFields: [
      {
        id: crypto.randomUUID(), tableIdentifier: 'table_fields', identifier: 'name', name: 'Nombre',
        description: 'Etiqueta legible del campo que se muestra al usuario en formularios y listados.',
        fieldFormat: FieldFormat.STRING, multiple: false, isRequired: true, isUnique: false, isFilter: true, isEditable: true, isSearchable: true
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'table_fields', identifier: 'identifier', name: 'Identificador',
        description: 'Nombre técnico del campo en formato camelCase o snake_case, único dentro de su tabla (ej: "firstName").',
        fieldFormat: FieldFormat.STRING, multiple: false, isRequired: true, isUnique: true, uniqueKeys: ['tableIdentifier'], isFilter: true, isEditable: true, isSearchable: true
      },
      {
        id: crypto.randomUUID(),
        tableIdentifier: 'table_fields',
        identifier: 'tableIdentifier',
        name: 'Tabla',
        description: 'Tabla a la que pertenece este campo.',
        fieldFormat: FieldFormat.RELATION,
        relationKey: 'identifier',
        relationTableIdentifier: 'table_defs',
        multiple: false,
        isRequired: true,
        isFilter: true,
        isEditable: true
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'table_fields', identifier: 'description', name: 'Descripción',
        description: 'Texto explicativo sobre el propósito del campo, visible como ayuda contextual en la interfaz.',
        fieldFormat: FieldFormat.TEXT, multiple: false, isEditable: true
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'table_fields', identifier: 'fieldFormat', name: 'Formato',
        description: 'Tipo de dato del campo (texto, número, booleano, relación, lista, JSON, etc.). Determina el componente de edición y las reglas de validación.',
        fieldFormat: FieldFormat.LIST, storeData: { posibleValues: Object.fromEntries(Object.entries(FieldFormatLabels).map(([key, label], index) => [key, { icon: key, label, position: index }])), placeholder: 'Selecciona un formato' }, multiple: false, default: FieldFormat.STRING, isFilter: true, isEditable: true
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'table_fields', identifier: 'relationQuery', name: 'Filtro de Relación',
        description: 'Filtro JSON que restringe los registros disponibles en un campo de tipo RELATION, permitiendo relaciones contextuales dinámicas.',
        fieldFormat: FieldFormat.JSON, multiple: false, isEditable: true, storeData: {jsonFormat: 'filter'}
      },
      {
        id: crypto.randomUUID(),
        tableIdentifier: 'table_fields',
        identifier: 'relationTableIdentifier',
        name: 'Tabla Relacionada',
        description: 'Tabla de destino para campos de tipo RELATION. Define de qué tabla provienen los registros seleccionables. Soporta referencias dinámicas mediante la sintaxis {campo}.',
        fieldFormat: FieldFormat.RELATION,
        relationKey: 'identifier',
        relationTableIdentifier: 'table_defs',
        multiple: false,
        isEditable: true
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'table_fields', identifier: 'isFilter', name: 'Es Filtro',
        description: 'Indica si este campo puede usarse para filtrar registros en vistas de listado.',
        fieldFormat: FieldFormat.BOOL, multiple: false, isEditable: true, default: false
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'table_fields', identifier: 'isUnique', name: 'Es Único',
        description: 'Indica que el valor de este campo no puede repetirse entre registros de la misma tabla.',
        fieldFormat: FieldFormat.BOOL, multiple: false, isEditable: true, default: false
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'table_fields', identifier: 'uniqueKeys', name: 'Claves Únicas',
        description: 'Lista de campos adicionales que forman un índice único compuesto junto con este campo.',
        fieldFormat: FieldFormat.RELATION, multiple: true, relationKey: 'identifier', relationTableIdentifier: 'table_fields', relationQuery: { tableIdentifier: { op: '=', v: '{tableIdentifier}' } }, isEditable: true, default: []
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'table_fields', identifier: 'isSearchable', name: 'Es Buscable',
        description: 'Indica si el campo se incluye en la búsqueda de texto libre sobre la tabla.',
        fieldFormat: FieldFormat.BOOL, multiple: false, isEditable: true, default: false
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'table_fields', identifier: 'multiple', name: 'Es Múltiple',
        description: 'Permite almacenar múltiples valores en este campo (por ejemplo, varias relaciones o etiquetas).',
        fieldFormat: FieldFormat.BOOL, multiple: false, isEditable: true, default: false
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'table_fields', identifier: 'isRequired', name: 'Es Requerido',
        description: 'Indica que el campo debe tener un valor para poder guardar el registro.',
        fieldFormat: FieldFormat.BOOL, multiple: false, isEditable: true, default: false
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'table_fields', identifier: 'isVisible', name: 'Es Visible',
        description: 'Controla si el campo se muestra en la interfaz. Los campos ocultos (ej: contraseñas, claves API) siguen existiendo en base de datos.',
        fieldFormat: FieldFormat.BOOL, multiple: false, isEditable: true, default: true
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'table_fields', identifier: 'isEditable', name: 'Es Editable',
        description: 'Indica si el usuario puede modificar el valor del campo. Los campos no editables son de solo lectura en la interfaz.',
        fieldFormat: FieldFormat.BOOL, multiple: false, isEditable: true, default: true
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'table_fields', identifier: 'history', name: 'Diario',
        description: 'Cuando está activo, cualquier cambio en este campo queda registrado en el diario de auditoría.',
        fieldFormat: FieldFormat.BOOL, multiple: false, isEditable: true, default: true
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'table_fields', identifier: 'default', name: 'Por Defecto',
        description: 'Valor que se asigna automáticamente al campo cuando se crea un nuevo registro.',
        fieldFormat: FieldFormat.STRING, isFilter: false, isEditable: true
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'table_fields', identifier: 'position', name: 'Posición',
        description: 'Orden numérico del ítem dentro de su nivel jerárquico. Valores menores aparecen primero.',
        fieldFormat: FieldFormat.INT, multiple: false, default: 1, isRequired: false, isFilter: false, isEditable: true
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'table_fields', identifier: 'storeData', name: 'Configuración',
        description: 'Configuración adicional del campo en formato JSON. Según el tipo puede incluir: valores posibles de una lista, tipo de input HTML, placeholder, opciones de color, etc.',
        fieldFormat: FieldFormat.JSON, isEditable: true
      },
    ]
  },
  {
    color: '#22c55e',
    posx: 546,
    posy: 0,
    icon: 'user',
    id: crypto.randomUUID(),
    identifier: 'users',
    description: 'Registro de todos los usuarios del sistema. Almacena credenciales de acceso, estado de la cuenta, claves API y metadatos de sesión para control de autenticación y auditoría.',
    name: 'Usuario',
    namePlural: 'Usuarios',
    formatSelection: `{firstname} {lastname} - {username}`,
    formatSelected: `{firstname} {lastname}`,
    tableFields: [
      {
        id: crypto.randomUUID(), tableIdentifier: 'users', identifier: 'status', name: 'Status',
        description: 'Estado actual de la cuenta: Inactivo (0) no puede acceder, Activo (1) tiene acceso normal, Bloqueado (2) ha sido suspendido.',
        fieldFormat: FieldFormat.LIST, multiple: false, default: 0, storeData: { posibleValues: { 0: { label: 'Inactivo' }, 1: { label: 'Activo' }, 2: { label: 'Bloqueado' } } }, isRequired: true, isFilter: true, isEditable: true
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'users', identifier: 'admin', name: 'Admin',
        description: 'Indica si el usuario tiene privilegios de administrador con acceso total a la configuración del sistema.',
        fieldFormat: FieldFormat.BOOL, multiple: false, default: 'false', isFilter: true, isEditable: true
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'users', identifier: 'firstname', name: 'Firstname',
        description: 'Nombre de pila del usuario, utilizado en saludos y visualización amigable.',
        fieldFormat: FieldFormat.STRING, multiple: false, isRequired: true, isFilter: true, isEditable: true, isSearchable: true
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'users', identifier: 'lastname', name: 'Lastname',
        description: 'Apellido del usuario.',
        fieldFormat: FieldFormat.STRING, multiple: false, default: '', isFilter: true, isEditable: true, isSearchable: true
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'users', identifier: 'username', name: 'Username',
        description: 'Nombre de usuario único utilizado para iniciar sesión en el sistema.',
        fieldFormat: FieldFormat.STRING, multiple: false, isRequired: true, isUnique: true, isEditable: true, isSearchable: true
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'users', identifier: 'email', name: 'Email',
        description: 'Dirección de correo electrónico única del usuario. Usada para notificaciones y recuperación de contraseña.',
        fieldFormat: FieldFormat.STRING, multiple: false, storeData: { type: 'email' }, isRequired: true, isUnique: true, isEditable: true
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'users', identifier: 'password', name: 'Password',
        description: 'Contraseña del usuario almacenada de forma segura (hash). No visible en la interfaz.',
        fieldFormat: FieldFormat.STRING, multiple: false, isEditable: true, isVisible: false
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'users', identifier: 'apiKey', name: 'ApiKey',
        description: 'Clave de acceso a la API REST generada para el usuario. Permite autenticación programática sin contraseña.',
        fieldFormat: FieldFormat.STRING, multiple: false, isEditable: false, isVisible: false, default: null, history: false
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'users', identifier: 'apiKeyExpiresAt', name: 'apiKeyExpiresAt',
        description: 'Fecha y hora de expiración de la clave API. Pasada esta fecha la clave deja de ser válida.',
        fieldFormat: FieldFormat.DATETIME, multiple: false, isEditable: false, isVisible: false, default: null, history: false
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'users', identifier: 'apiKeyLastUsed', name: 'ApiKeyLastUsed',
        description: 'Registro del último uso de la clave API. Útil para detectar claves inactivas o monitorear el uso.',
        fieldFormat: FieldFormat.DATETIME, multiple: false, isEditable: false, default: null, history: false
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'users', identifier: 'conectedOn', name: 'ConectedOn',
        description: 'Fecha y hora del último inicio de sesión exitoso del usuario.',
        fieldFormat: FieldFormat.DATETIME, multiple: false, isFilter: true, isEditable: false, default: null, history: false
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'users', identifier: 'lastLogoutAt', name: 'LastLogoutAt',
        description: 'Fecha y hora del último cierre de sesión del usuario.',
        fieldFormat: FieldFormat.DATETIME, multiple: false, isEditable: false, default: null, history: false
      },
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
    color: '#f59e0b',
    posx: 0,
    posy: 412,
    id: crypto.randomUUID(),
    identifier: 'journals',
    description: 'Registro de auditoría que almacena cada evento de modificación sobre registros del sistema. Indica qué tabla y qué registro fue afectado, junto con notas opcionales del cambio.',
    name: 'Diario',
    namePlural: 'Diarios',
    icon: 'journal',
    tableFields: [
      {
        id: crypto.randomUUID(),
        tableIdentifier: 'journals',
        identifier: 'tableIdentifier',
        name: 'Tabla',
        description: 'Tabla del sistema sobre la que se realizó la modificación registrada.',
        fieldFormat: FieldFormat.RELATION,
        relationKey: 'identifier',
        relationTableIdentifier: 'table_defs',
        multiple: false,
        default: '',
        isFilter: true,
        isEditable: false
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'journals', identifier: 'recordId', name: 'Registro',
        description: 'Identificador del registro afectado. La tabla de destino se resuelve dinámicamente a partir del campo tableIdentifier, permitiendo auditar cualquier entidad del sistema.',
        fieldFormat: FieldFormat.RELATION, relationTableIdentifier: '{tableIdentifier}', multiple: false, default: '', isFilter: true, isEditable: false
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'journals', identifier: 'notes', name: 'Notas',
        description: 'Comentario libre que el usuario puede añadir para describir el motivo o contexto del cambio realizado.',
        fieldFormat: FieldFormat.TEXT, multiple: false, isRequired: false, isFilter: false, isEditable: true
      },
    ] as TableField[]
  },
  {
    color: '#f59e0b',
    posx: 0,
    posy: 592,
    id: crypto.randomUUID(),
    identifier: 'journal_details',
    description: 'Detalle campo a campo de cada entrada del diario de auditoría. Registra el valor almacenado en cada campo afectado en el momento del cambio.',
    name: 'Detalles de Diario',
    namePlural: 'Detalles de Diarios',
    icon: 'journal-detail',
    tableFields: [
      {
        id: crypto.randomUUID(), tableIdentifier: 'journal_details', identifier: 'journalId', name: 'Diario',
        description: 'Entrada del diario de auditoría a la que pertenece este detalle.',
        fieldFormat: FieldFormat.RELATION, relationTableIdentifier: 'journals', multiple: false, isRequired: true, default: '', isFilter: true, isEditable: false
      },
      {
        id: crypto.randomUUID(),
        tableIdentifier: 'journal_details',
        identifier: 'tableFieldIdentifier',
        name: 'Campo',
        description: 'Campo de la tabla que fue modificado en el evento de auditoría.',
        fieldFormat: FieldFormat.RELATION,
        relationKey: 'identifier',
        relationTableIdentifier: 'table_fields',
        multiple: false,
        isRequired: true,
        default: '',
        isFilter: true,
        isEditable: false
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'journal_details', identifier: 'value', name: 'Valor',
        description: 'Valor del campo en el momento del evento, serializado como texto. Permite reconstruir el estado anterior del registro.',
        fieldFormat: FieldFormat.TEXT, multiple: false, isRequired: false, default: '', isFilter: false, isEditable: false
      },
    ]
  },
  {
    color: '#06b6d4',
    posx: 819,
    posy: 0,
    id: crypto.randomUUID(),
    identifier: 'interfaces',
    description: 'Define las pantallas o vistas que conforman la aplicación. Cada interfaz tiene una ruta única, un ícono y una configuración JSON que describe su comportamiento y componentes.',
    name: 'Interfaz',
    namePlural: 'Interfaces',
    icon: 'web-interface',
    formatSelection: `{icon|icon} {name}`,
    tableFields: [
      {
        id: crypto.randomUUID(), tableIdentifier: 'interfaces', identifier: 'persistant', name: 'Persistente',
        description: 'No puede ser borrado',
        fieldFormat: FieldFormat.BOOL, multiple: false, default: 'false', isRequired: false, isFilter: true, isVisible: true, isEditable: false, isSearchable: false
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'interfaces', identifier: 'name', name: 'Nombre',
        description: 'Nombre descriptivo de la interfaz, visible en el selector de pantallas y en los ítems de menú asociados.',
        fieldFormat: FieldFormat.STRING, multiple: false, default: '', isRequired: true, isFilter: true, isEditable: true, isSearchable: true
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'interfaces', identifier: 'route', name: 'Ruta',
        description: 'Ruta URL única de la interfaz dentro de la aplicación (ej: "/usuarios" o "/configuracion/general").',
        fieldFormat: FieldFormat.STRING, multiple: false, default: '', isRequired: true, isFilter: true, isUnique: true, isEditable: true, isSearchable: true
      },
      {
        id: crypto.randomUUID(),
        tableIdentifier: 'interfaces',
        identifier: 'icon',
        name: 'Ícono',
        description: 'Ícono que representa visualmente la interfaz en el menú de navegación y en selectores.',
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
      {
        id: crypto.randomUUID(), tableIdentifier: 'interfaces', identifier: 'description', name: 'Descripción',
        description: 'Descripción del propósito y contenido de la interfaz.',
        fieldFormat: FieldFormat.TEXT, multiple: false, default: '', isRequired: false, isFilter: false, isUnique: false, isEditable: true
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'interfaces', identifier: 'config', name: 'Configuración',
        description: 'Configuración estructurada en JSON que define los componentes, comportamientos y parámetros específicos de esta interfaz (widgets, tablas visibles, acciones disponibles, etc.).',
        fieldFormat: FieldFormat.JSON, multiple: false, isRequired: false, default: '', isFilter: false, isEditable: true
      },
    ]
  },
  {
    color: '#06b6d4',
    posx: 819,
    posy: 267,
    id: crypto.randomUUID(),
    identifier: 'menu_items',
    description: 'Elementos de navegación de la aplicación. Puede representar tanto entradas del menú lateral jerárquico como accesos directos en la barra superior. Cada ítem puede vincularse a una interfaz y agruparse bajo un padre.',
    name: 'Menú de navegación',
    namePlural: 'Menús de navegación',
    icon: 'nav-menu',
    formatSelection: `{icon??interface_id.icon|icon} {name}`,
    tableFields: [
      {
        id: crypto.randomUUID(), tableIdentifier: 'menu_items', identifier: 'name', name: 'Nombre',
        description: 'Texto visible del ítem en el menú de navegación.',
        fieldFormat: FieldFormat.STRING, multiple: false, default: '', isRequired: true, isFilter: true, isEditable: true, isSearchable: true
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'menu_items', identifier: 'identifier', name: 'Identificador',
        description: 'Clave única del ítem de menú usada para referencias internas y lógica de permisos.',
        fieldFormat: FieldFormat.STRING, multiple: false, default: '', isRequired: true, isFilter: true, isUnique: true, isEditable: true, isSearchable: true
      },
      {
        id: crypto.randomUUID(),
        tableIdentifier: 'menu_items',
        identifier: 'icon',
        name: 'Ícono',
        description: 'Ícono del ítem de menú. Si no se especifica, se hereda el ícono de la interfaz vinculada.',
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
      {
        id: crypto.randomUUID(), tableIdentifier: 'menu_items', identifier: 'description', name: 'Descripción',
        description: 'Texto complementario que describe el destino o función del ítem, puede mostrarse como tooltip.',
        fieldFormat: FieldFormat.TEXT, multiple: false, default: '', isRequired: false, isFilter: true, isUnique: false, isEditable: true, isSearchable: true
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'menu_items', identifier: 'interface_id', name: 'Interfáz',
        description: 'Interfaz a la que navega el usuario al hacer clic en este ítem de menú.',
        fieldFormat: FieldFormat.RELATION, relationTableIdentifier: 'interfaces', multiple: false, default: '', isRequired: false, isFilter: true, isEditable: true
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'menu_items', identifier: 'parent_id', name: 'Padre',
        description: 'Ítem de menú padre que contiene a este ítem, permitiendo estructuras de menú anidadas en árbol.',
        fieldFormat: FieldFormat.RELATION, relationTableIdentifier: 'menu_items', multiple: false, isRequired: false, default: '', isFilter: true, isEditable: true
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'menu_items', identifier: 'is_fast_link', name: 'Enlace Rápido',
        description: "Declarar como enlace rápido hace que aparezca en la barra superior de navegacón.",
        fieldFormat: FieldFormat.BOOL, multiple: false, isRequired: false, default: 'false', isFilter: true, isEditable: true
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'menu_items', identifier: 'position', name: 'Posición',
        description: 'Orden numérico del ítem dentro de su nivel jerárquico. Valores menores aparecen primero.',
        fieldFormat: FieldFormat.INT, multiple: false, default: 1, isRequired: false, isFilter: false, isEditable: true
      },
    ]
  },
  {
    color: '#f97316',
    posx: 1092,
    posy: 0,
    id: crypto.randomUUID(),
    identifier: 'setting_groups',
    description: 'Agrupa configuraciones relacionadas bajo una categoría común (ej: "Correo", "Apariencia", "Seguridad"). Soporta jerarquía mediante el campo padre.',
    name: 'Configuración Grupo',
    namePlural: 'Configuraciones Grupos',
    icon: 'settings-group',
    formatSelection: `{name}`,
    formatSelected: `{name}`,
    formatSelectedMultiple: `{name}`,
    tableFields: [
      {
        id: crypto.randomUUID(), tableIdentifier: 'setting_groups', identifier: 'name', name: 'Nombre',
        description: 'Nombre descriptivo del grupo de configuración (ej: "Correo electrónico", "Apariencia").',
        fieldFormat: FieldFormat.STRING, multiple: false, default: '', isRequired: true, isFilter: true, isUnique: true, isEditable: true, isSearchable: true
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'setting_groups', identifier: 'description', name: 'Descripción',
        description: 'Descripción del tipo de configuraciones que engloba este grupo.',
        fieldFormat: FieldFormat.TEXT, multiple: false, default: '', isRequired: false, isFilter: false, isUnique: false, isEditable: true
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'setting_groups', identifier: 'parent_id', name: 'Padre',
        description: 'Grupo padre para crear una jerarquía de categorías de configuración (ej: "Notificaciones" → "Correo electrónico").',
        fieldFormat: FieldFormat.RELATION, relationTableIdentifier: 'setting_groups', multiple: false, default: '', isRequired: false, isFilter: false, isUnique: false, isEditable: true
      },
    ]
  },
  {
    color: '#f97316',
    posx: 1092,
    posy: 180,
    id: crypto.randomUUID(),
    identifier: 'settings',
    description: 'Parámetros de configuración global de la aplicación. Cada ajuste tiene un identificador único (key), un tipo de dato, y puede tener un valor actual y uno por defecto. Se organizan en grupos.',
    name: 'Configuración',
    namePlural: 'Configuraciones',
    icon: 'settings',
    formatSelection: `{setting_group_id.name|truncate:25} - {name}`,
    formatSelected: `{setting_group_id.name|truncate:25} - {name}`,
    formatSelectedMultiple: `{name}`,
    tableFields: [
      {
        id: crypto.randomUUID(), tableIdentifier: 'settings', identifier: 'name', name: 'Nombre',
        description: 'Nombre legible del parámetro de configuración (ej: "Dirección de correo remitente").',
        fieldFormat: FieldFormat.STRING, multiple: false, default: '', isRequired: true, isFilter: true, isUnique: false, isEditable: true, isSearchable: true
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'settings', identifier: 'key', name: 'Identificador',
        description: 'Clave única en formato snake_case usada para leer este valor desde el código (ej: "mail_sender_address").',
        fieldFormat: FieldFormat.STRING, multiple: false, default: '', isRequired: true, isFilter: true, isUnique: true, isEditable: true, isSearchable: true
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'settings', identifier: 'fieldFormat', name: 'Tipo de Campo',
        description: 'Tipo de dato del valor de configuración. Define el componente de edición que se mostrará al usuario.',
        fieldFormat: FieldFormat.LIST, storeData: {
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
        description: 'Cuando el tipo de campo es RELATION, indica la tabla de la que provienen los valores seleccionables.',
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
      {
        id: crypto.randomUUID(), tableIdentifier: 'settings', identifier: 'storeData', name: 'Configuración',
        description: 'Configuración adicional en JSON (ej: valores posibles para LIST, formato para DATE, etc.).',
        fieldFormat: FieldFormat.JSON, multiple: false, default: '', isRequired: false, isFilter: false, isUnique: false, isEditable: true
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'settings', identifier: 'multiple', name: 'Múltiples valores',
        description: 'Permite que esta configuración almacene múltiples valores simultáneamente.',
        fieldFormat: FieldFormat.BOOL, multiple: false, default: '', isRequired: false, isFilter: false, isUnique: false, isEditable: true
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'settings', identifier: 'placeholder', name: 'Placeholder',
        description: 'Texto de ayuda que se muestra en el campo de edición cuando no hay ningún valor ingresado.',
        fieldFormat: FieldFormat.STRING, multiple: false, default: '', isRequired: false, isFilter: false, isUnique: false, isEditable: true
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'settings', identifier: 'description', name: 'Descripción',
        description: 'Explicación del efecto de este parámetro, visible como ayuda al editar la configuración.',
        fieldFormat: FieldFormat.TEXT, multiple: false, default: '', isRequired: false, isFilter: false, isUnique: false, isEditable: true, isSearchable: true
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'settings', identifier: 'setting_group_id', name: 'Grupo',
        description: 'Grupo de configuración al que pertenece este parámetro.',
        fieldFormat: FieldFormat.RELATION, relationTableIdentifier: 'setting_groups', multiple: false, default: '', isRequired: true, isFilter: true, isUnique: false, isEditable: true
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'settings', identifier: 'value', name: 'Valor',
        description: 'Valor actualmente activo del parámetro. Si está vacío, se utiliza el valor por defecto.',
        fieldFormat: FieldFormat.TEXT, multiple: false, default: '', isRequired: false, isFilter: false, isUnique: false, isEditable: true
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'settings', identifier: 'default', name: 'Por defecto',
        description: 'Valor de respaldo usado cuando no se ha definido un valor activo. Garantiza el funcionamiento del sistema tras la instalación.',
        fieldFormat: FieldFormat.TEXT, multiple: false, default: '', isRequired: false, isFilter: false, isUnique: false, isEditable: true
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'settings', identifier: 'position', name: 'Posición',
        description: 'Orden de aparición del parámetro dentro de su grupo de configuración.',
        fieldFormat: FieldFormat.INT, multiple: false, default: 1, isRequired: false, isFilter: false, isEditable: true
      },
    ]
  },
  {
    color: '#06b6d4',
    posx: 819,
    posy: 600,
    id: crypto.randomUUID(),
    identifier: 'icons',
    description: 'Catálogo de íconos SVG del sistema. Cada ícono almacena su contenido vectorial, colores de relleno y trazo, y puede ser referenciado por tablas, menús e interfaces.',
    name: 'Icono',
    icon: 'icon',
    namePlural: 'Iconos',
    formatSelection: `{name|icon} {name}`,
    formatSelected: `{name|icon} {name}`,
    formatSelectedMultiple: `{name|icon}`,
    tableFields: [
      {
        id: crypto.randomUUID(), tableIdentifier: 'icons', identifier: 'name', name: 'Nombre',
        description: 'Identificador único del ícono en formato kebab-case (ej: "arrow-right", "user-circle"). Se usa como referencia en todo el sistema.',
        fieldFormat: FieldFormat.STRING, multiple: false, default: '', isRequired: true, isFilter: true, isUnique: true, isEditable: true, isSearchable: true
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'icons', identifier: 'svg_content', name: 'SVG Content',
        description: 'Contenido interno del SVG (rutas <path>, formas <circle>, etc.) sin incluir la etiqueta <svg> raíz. Se renderiza dentro de un viewport estándar de 24×24.',
        fieldFormat: FieldFormat.TEXT, multiple: false,
        default: '<path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"/>\n<path d="M9 12h6"/>\n<path d="M12 9v6"/>',
        isRequired: true, isFilter: false, isUnique: false, isEditable: true, isSearchable: false
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'icons', identifier: 'description', name: 'Descripción',
        description: 'Descripción del ícono y los contextos en los que se recomienda usarlo.',
        fieldFormat: FieldFormat.TEXT, multiple: false, default: '', isRequired: false, isFilter: false, isUnique: false, isEditable: true
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'icons', identifier: 'fill', name: 'Relleno',
        description: 'Color de relleno del ícono en formato hexadecimal. Si está vacío se aplica "transparent".',
        fieldFormat: FieldFormat.STRING, storeData: { type: 'color', placeholder: 'transparent' }, multiple: false, default: '', isRequired: false, isFilter: false, isUnique: false, isEditable: true
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'icons', identifier: 'stroke', name: 'Trazo',
        description: 'Color del trazo (contorno) del ícono en formato hexadecimal. Define el color de las líneas del vector.',
        fieldFormat: FieldFormat.STRING, storeData: { type: 'color', placeholder: '#0033ff' }, multiple: false, default: '', isRequired: false, isFilter: false, isUnique: false, isEditable: true
      },
    ]
  },
  {
    color: '#14b8a6',
    posx: 1365,
    posy: 0,
    id: crypto.randomUUID(),
    identifier: 'forms',
    description: 'Define la estructura de un formulario reutilizable vinculado a una tabla. El formulario agrupa y organiza los campos a mostrar en pantallas de creación y edición de registros.',
    name: 'Formulario',
    namePlural: 'Formularios',
    icon: 'form',
    formatSelection: `{name}`,
    formatSelected: `{name}`,
    formatSelectedMultiple: `{name}`,
    tableFields: [
      {
        id: crypto.randomUUID(), tableIdentifier: 'forms', identifier: 'name', name: 'Nombre',
        description: 'Nombre identificativo del formulario (ej: "Alta de Usuario", "Edición de Producto").',
        fieldFormat: FieldFormat.STRING, multiple: false, default: '', isRequired: true, isFilter: true, isUnique: true, isEditable: true, isSearchable: true
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'forms', identifier: 'description', name: 'Descripción',
        description: 'Descripción del propósito del formulario y el contexto en el que se utiliza.',
        fieldFormat: FieldFormat.TEXT, multiple: false, default: '', isRequired: false, isFilter: false, isUnique: false, isEditable: true
      },
      {
        id: crypto.randomUUID(),
        tableIdentifier: 'forms',
        identifier: 'tableIdentifier',
        name: 'Tabla Relacionada',
        description: 'Tabla cuyos registros edita o crea este formulario. Define el origen de los campos disponibles.',
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
    color: '#14b8a6',
    posx: 1365,
    posy: 180,
    id: crypto.randomUUID(),
    identifier: 'form_items',
    description: 'Elementos individuales que componen un formulario. Pueden ser campos de datos, contenedores de layout o divisores visuales. Soporta anidamiento mediante padre/hijo y visibilidad condicional.',
    name: 'Elemento de Formulario',
    namePlural: 'Elementos de Formularios',
    icon: 'form-item',
    formatSelection: `{name}`,
    formatSelected: `{name}`,
    formatSelectedMultiple: `{name}`,
    tableFields: [
      {
        id: crypto.randomUUID(), tableIdentifier: 'form_items', identifier: 'form_id', name: 'Formulario',
        description: 'Formulario al que pertenece este elemento.',
        fieldFormat: FieldFormat.RELATION, relationTableIdentifier: 'forms', multiple: false, default: '', isRequired: true, isFilter: true, isUnique: false, isEditable: true
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'form_items', identifier: 'type', name: 'Tipo',
        description: '"container" agrupa otros elementos en una fila, "field" muestra un campo editable, "divider" inserta una línea horizontal separadora.',
        fieldFormat: FieldFormat.LIST, multiple: false, default: '', storeData: { posibleValues: { container: { label: 'Contenedor', position: 0 }, field: { label: 'Campo', position: 1 }, divider: { label: 'Divisor Horizontal', position: 2 } } }, isRequired: true, isFilter: true, isUnique: false, isEditable: true, isSearchable: false
      },
      {
        id: crypto.randomUUID(),
        tableIdentifier: 'form_items',
        identifier: 'field_identifier',
        name: 'Campo',
        description: 'Campo de la tabla asociada que este elemento representa. Solo aplica cuando el tipo es "field". Filtrado automáticamente a los campos de la tabla del formulario padre.',
        fieldFormat: FieldFormat.RELATION,
        relationKey: 'identifier',
        relationTableIdentifier: 'table_fields',
        relationQuery: { tableIdentifier: { op: '=', v: '{form_id.tableIdentifier}' } },
        multiple: false,
        default: '',
        isRequired: false,
        isFilter: true,
        isUnique: false,
        isEditable: true
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'form_items', identifier: 'parent_id', name: 'Padre',
        description: 'Elemento contenedor padre dentro del mismo formulario, usado para anidar campos dentro de un "container".',
        fieldFormat: FieldFormat.RELATION, relationTableIdentifier: 'form_items', multiple: false, default: '', isRequired: false, isFilter: false, isUnique: false, isEditable: true
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'form_items', identifier: 'size', name: 'Ancho',
        description: 'Ancho del elemento como fracción del formulario: 25% (1), 50% (2), 75% (3) o 100% (4).',
        fieldFormat: FieldFormat.LIST, storeData: { posibleValues: { 1: { label: '25%' }, 2: { label: '50%' }, 3: { label: '75%' }, 4: { label: '100%' }, } }, multiple: false, default: '2', isRequired: false, isFilter: false, isUnique: false, isEditable: true
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'form_items', identifier: 'filters', name: 'Condición',
        description: 'Filtro JSON de visibilidad dinámica: el elemento solo se muestra cuando los valores del formulario cumplen esta condición.',
        fieldFormat: FieldFormat.JSON, multiple: false, isRequired: false, isFilter: false, isUnique: false, isEditable: true, storeData: {jsonFormat: 'filter'}
      },
      {
        id: crypto.randomUUID(), tableIdentifier: 'form_items', identifier: 'position', name: 'Posición',
        description: 'Orden de renderizado del elemento dentro de su nivel jerárquico en el formulario.',
        fieldFormat: FieldFormat.INT, multiple: false, default: 0, isRequired: false, isFilter: false, isEditable: true
      },
    ]
  },
]

// TODO: Hacer que en el relationTableIdentifier, haya un campo que indique la dependencia (none, nullable, destroy)