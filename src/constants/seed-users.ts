import { InterfaceItem, MenuItem, NavItem, UserItem } from "./table-defs";

export const usersSeed: Partial<UserItem>[] = [
  { firstname: 'Juan Manuel', lastname: 'Ferreira Pérez', username: 'juan', email: 'juan@example.com', status: 1, password: '1234' },
  { firstname: 'María de la Caridad', lastname: 'Chávez Quesada', username: 'maria', email: 'maria@example.com', status: 1, password: '1234' },
  { firstname: 'Luis Gabriel', lastname: 'Hernández Pupo', username: 'luis', email: 'luis@example.com', status: 1, password: '1234' },
  { firstname: 'Ana María', lastname: 'Pupo Gracia', username: 'ana', email: 'ana@example.com', status: 1, password: '1234'  },
  { firstname: 'NimbleAI', lastname: 'Admin', username: 'nimbleai', email: 'nimbleai@admin.com', status: 1, admin: true, password: '1234' }
];

export const interfacesSeed: Partial<InterfaceItem>[] = [
  { persistant: true, name: 'Home', route: '/', icon: 'home', description: 'Pantalla de Bienvenida', config: {} },
  { persistant: true, name: 'Vistas', route: '/admin/interfaces', icon: 'web-interface', description: '', config: {} },
  // { persistant: true, name: 'Navegación', route: '/admin/navigation/menu-items/', icon: 'settings', description: '', config: {} },
  { persistant: true, name: 'Íconos', route: '/admin/navigation/icons', icon: 'icon', description: '', config: {} },
  { persistant: true, name: 'Menús de Navegación', route: '/admin/navigation/menu-items', icon: 'nav-menu', description: '', config: {} },
  { persistant: true, name: 'Esquema', route: '/admin/schema', icon: 'db-entity', description: '', config: {} },
  { persistant: true, name: 'Entidades', route: '/admin/entities', icon: 'table', description: '', config: {} },
  { persistant: true, name: 'Reglas', route: '/admin/rules', icon: 'workflows', description: '', config: {} },
  { persistant: true, name: 'Automatización', route: '/admin/automatization', icon: 'workflows', description: '', config: {} },
  { persistant: true, name: 'Notificaciones', route: '/admin/notifications', icon: 'notification', description: '', config: {} },
  { persistant: true, name: 'Asistente', route: '/admin/assistant', icon: 'humming', description: '', config: {} },
  { persistant: true, name: 'Usuarios', route: '/admin/users', icon: 'user', description: '', config: {} },
  { persistant: true, name: 'Configuración', route: '/admin/settings', icon: 'settings', description: '', config: {} },
];

export const menuItemsSeed: Partial<MenuItem>[] = [
  { name: 'Home', identifier: 'home', icon: 'home', description: 'Pantalla de Bienvenida', interface_id: '/', parent_id: '', is_fast_link: true, position: 1 },
  { name: 'Administrador', identifier: 'admin', icon: 'settings', description: 'Gestionar Configuración de la Aplicación', interface_id: '', parent_id: '', position: 3 },
  { name: 'Vistas', identifier: 'interfaces', icon: 'web-interface', description: 'Gestionar las interfaces de la aplicación', interface_id: '/admin/interfaces', parent_id: 'admin', is_fast_link: true, position: 3 },
  { name: 'Navegación', identifier: 'navigation', icon: 'nav-menu', description: 'Gestionar los elementos de navegación', interface_id: '/admin/navigation/menu-items', parent_id: 'admin', is_fast_link: true, position: 3 },
  { name: 'Esquema', identifier: 'schema', icon: 'db-entity', description: 'Gestionar el esquema de la base de datos', interface_id: '/admin/schema', parent_id: 'admin', position: 3 },
  { name: 'Entidades', identifier: 'entities', icon: 'table', description: 'Gestionar Entidades de las entidades', interface_id: '/admin/entities', parent_id: 'admin', position: 3 },
  { name: 'Reglas', identifier: 'organization_rules', icon: 'workflows', description: 'Configurar el asistente de IA', interface_id: '/admin/rules', parent_id: 'admin', position: 3 },
  { name: 'Automatización', identifier: 'automatization', icon: 'workflows', description: 'Gestionar automatización de procesos', interface_id: '/admin/automatization', parent_id: 'admin', position: 3 },
  { name: 'Notificaciones', identifier: 'notifications', icon: 'notification', description: 'Gestionar sistema de notificaciones', interface_id: '/admin/notifications', parent_id: 'admin', position: 3 },
  { name: 'Asistente', identifier: 'assistant', icon: 'humming', description: 'Gestionar el asistente de IA', interface_id: '/admin/assistant', parent_id: 'admin', position: 3 },
  { name: 'Usuarios', identifier: 'users', icon: 'user', description: 'Gestionar usuarios y permisos', interface_id: '/admin/users', parent_id: 'admin', position: 3 },
  { name: 'Configuración', identifier: 'settings', icon: 'settings', description: 'Configuración general de la aplicación', interface_id: '/admin/settings', parent_id: 'admin', position: 3 },
];

export const iconsSeed = [
  {
    name: 'home',
    svg_content: `
      <path d="M3 9l9 -7l9 7v11a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z"/>
      <path d="M9 22v-10h6v10"/>
    `,
    description: 'Inicio, Home, página principal o bienvenida',
    fill: '',
    stroke: ''
  },
  {
    name: 'menu',
    svg_content: `
      <path d="M4 6h16"/>
      <path d="M4 12h16"/>
      <path d="M4 18h16"/>
    `,
    description: 'Menú de tres líneas',
    fill: '',
    stroke: ''
  },
  {
    name: 'projects-redmine',
    svg_content: `
      <circle cx="8" cy="8" r="2.4" />
      <circle cx="16" cy="8" r="2.4" />
      <circle cx="12" cy="16" r="2.4" />
    `,
    description: 'Áreas o Proyectos',
    fill: '',
    stroke: ''
  },
  {
    name: 'x',
    svg_content: `
      <path d="M18 6L6 18"/>
      <path d="M6 6l12 12"/>
    `,
    description: 'X, cancelar, cerrar',
    fill: '',
    stroke: ''
  },
  {
    name: '3-bullets',
    svg_content: `
      <path d="M5 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/>
      <path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/>
      <path d="M19 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/>
    `,
    description: 'Tres puntos o viñetas',
    fill: '',
    stroke: ''
  },
  {
    name: 'add',
    svg_content: `
      <path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"/>
      <path d="M9 12h6"/>
      <path d="M12 9v6"/>
    `,
    description: 'Agregar o añadir',
    fill: '',
    stroke: ''
  },
  {
    name: 'drag',
    svg_content: `
    <path d="M7 4a1 1 0 110-2 1 1 0 010 2zm0 6a1 1 0 110-2 1 1 0 010 2zm0 6a1 1 0 110-2 1 1 0 010 2zM13 4a1 1 0 110-2 1 1 0 010 2zm0 6a1 1 0 110-2 1 1 0 010 2zm0 6a1 1 0 110-2 1 1 0 010 2z" />
    `,
    description: 'Agregar o añadir',
    fill: '',
    stroke: 'var(--color-gray-400)'
  },
  {
    name: 'bulk-add',
    svg_content: `
    <g class="text-gray-900>
      <path fill="var(--color-white)" d="M9 2a8 8 0 1 0 0 16a8 8 0 0 0 0 -16z"/>
      <path d="M9 6v8"/>
      <path d="M5 10h8"/>
      
      <path fill="var(--color-white)" d="M15 1a8 8 0 1 0 0 16a8 8 0 0 0 0 -16z"/>
      <path d="M15 5v8"/>
      <path d="M11 9h8"/>
      
      <path fill="var(--color-white)" d="M13 7a8 8 0 1 0 0 16a8 8 0 0 0 0 -16z"/>
      <path d="M13 11v8"/>
      <path d="M9 15h8"/>
    </g>
    `,
    description: 'Agregar o añadir múltiples',
    fill: '',
    stroke: ''
  },
  {
    name: 'angle-down',
    svg_content: `
      <path d="M6 9l6 6l6 -6"/>
    `,
    description: 'Flecha hacia abajo',
    fill: '',
    stroke: ''
  },
  {
    name: 'angle-left',
    svg_content: `
      <path d="M15 6l-6 6l6 6"/>
    `,
    description: 'Flecha hacia la izquierda',
    fill: '',
    stroke: ''
  },
  {
    name: 'web-interface',
    svg_content: `
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 8h18" />
      <circle cx="6" cy="6" r="0.8" />
      <circle cx="9" cy="6" r="0.8" />
      <circle cx="12" cy="6" r="0.8" />
  `,
    description: 'Interfaz web',
    fill: '',
    stroke: ''
  },
  {
    name: 'nav-menu',
    svg_content: `
    <path d="M4 6h16" />
    <path d="M4 12h16" />
    <path d="M4 18h16" />
  `,
    description: 'Menú de navegación',
    fill: '',
    stroke: ''
  },
  {
    name: 'journal',
    svg_content: `
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <path d="M8 8h6M8 12h8M8 16h8" />
  `,
    description: 'Diario de acciones',
    fill: '',
    stroke: ''
  },
  {
    name: 'journal-detail',
    svg_content: `
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <path d="M8 8h6M8 12h8M8 16h8" />
    <g stroke-width="1.2">
      <circle cx="17" cy="17" r="6" fill="var(--color-white)"/>
      <path d="M17 14.5v2.8l2 2"/>
    </g>
  `,
    description: 'Detalle de diario',
    fill: '',
    stroke: ''
  },
  {
    name: 'form',
    svg_content: `
      <rect x="3" y="3" width="18" height="18" rx="2" stroke-width="1.5" fill="none"/>
      <line x1="7" y1="8" x2="17" y2="8" stroke-width="1.5" stroke-linecap="round"/>
      <rect x="7" y="11" width="10" height="2" rx="1" stroke-width="1.2" fill="none"/>
      <rect x="7" y="15" width="10" height="2" rx="1" stroke-width="1.2" fill="none"/>
    `,
    description: 'Formulario',
    fill: '',
    stroke: ''
  },
  {
    name: 'form-item',
    svg_content: `
    <rect x="4" y="6" width="16" height="4" rx="1" />
    <circle cx="7" cy="15" r="2" />
    <rect x="12" y="13" width="6" height="4" rx="1" />
  `,
    description: 'Elementos de formulario',
    fill: '',
    stroke: ''
  },
  {
    name: 'table-field',
    svg_content: `
    <rect x="4" y="6" width="16" height="12" rx="2" />
    <path d="M8 10h8M8 14h5" />
  `,
    description: 'Campo de entidad',
    fill: '',
    stroke: ''
  },
  {
    name: 'settings-group',
    svg_content: `
        <path d="M3 3 L7 3 M3 3 L3 7" />
      <path d="M21 3 L17 3 M21 3 L21 7" />
      <path d="M3 21 L7 21 M3 21 L3 17" />
      <path d="M21 21 L17 21 M21 21 L21 17" />
      <path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z"/>
      <path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"/>
  `,
    description: 'Grupo de configuraciones',
    fill: '',
    stroke: ''
  },
  {
    name: 'icon',
    svg_content: `
      <rect x="4" y="4" width="6" height="6" rx="1.5" stroke-width="1.5" fill="none"/>
      
      <circle cx="17" cy="7" r="3" stroke-width="1.5" fill="none"/>
      
      <path d="M 7 14 L 10 19.5 L 4 19.5 Z" stroke-width="1.5" stroke-linejoin="round" fill="none"/>
      
      <path d="M 17 14 L 20 17 L 17 20 L 14 17 Z" stroke-width="1.5" stroke-linejoin="round" fill="none"/>
    `,
    description: 'Ícono estándar que representa íconos',
    fill: '',
    stroke: ''
  },
  {
    name: 'angle-right',
    svg_content: `
      <path d="M9 6l6 6l-6 6"/>
    `,
    description: 'Flecha hacia la derecha',
    fill: '',
    stroke: ''
  },
  {
    name: 'angle-up',
    svg_content: `
      <path d="M6 15l6 -6l6 6"/>
    `,
    description: 'Flecha hacia arriba',
    fill: '',
    stroke: ''
  },
  {
    name: 'application-gzip',
    svg_content: `
      <path d="M6 20.735a2 2 0 0 1 -1 -1.735v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2h-1"/>
      <path d="M11 17a2 2 0 0 1 2 2v2a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1v-2a2 2 0 0 1 2 -2z"/>
      <path d="M11 5l-1 0"/>
      <path d="M13 7l-1 0"/>
      <path d="M11 9l-1 0"/>
      <path d="M13 11l-1 0"/>
      <path d="M11 13l-1 0"/>
      <path d="M13 15l-1 0"/>
    `,
    description: 'Archivo comprimido GZIP',
    fill: '',
    stroke: ''
  },
  {
    name: 'application-javascript',
    svg_content: `
      <path d="M14 3v4a1 1 0 0 0 1 1h4"/>
      <path d="M3 15h3v4.5a1.5 1.5 0 0 1 -3 0"/>
      <path d="M9 20.25c0 .414 .336 .75 .75 .75h1.25a1 1 0 0 0 1 -1v-1a1 1 0 0 0 -1 -1h-1a1 1 0 0 1 -1 -1v-1a1 1 0 0 1 1 -1h1.25a.75 .75 0 0 1 .75 .75"/>
      <path d="M5 12v-7a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2h-1"/>
    `,
    description: 'Archivo JavaScript',
    fill: '',
    stroke: ''
  },
  {
    name: 'application-pdf',
    svg_content: `
      <path d="M14 3v4a1 1 0 0 0 1 1h4"/>
      <path d="M5 12v-7a2 2 0 0 1 2 -2h7l5 5v4"/>
      <path d="M5 18h1.5a1.5 1.5 0 0 0 0 -3h-1.5v6"/>
      <path d="M17 18h2"/>
      <path d="M20 15h-3v6"/>
      <path d="M11 15v6h1a2 2 0 0 0 2 -2v-2a2 2 0 0 0 -2 -2h-1z"/>
    `,
    description: 'Documento PDF',
    fill: '',
    stroke: ''
  },
  {
    name: 'application-zip',
    svg_content: `
      <path d="M14 3v4a1 1 0 0 0 1 1h4"/>
      <path d="M5 12v-7a2 2 0 0 1 2 -2h7l5 5v4"/>
      <path d="M16 18h1.5a1.5 1.5 0 0 0 0 -3h-1.5v6"/>
      <path d="M12 15v6"/>
      <path d="M5 15h3l-3 6h3"/>
    `,
    description: 'Archivo comprimido ZIP',
    fill: '',
    stroke: ''
  },
  {
    name: 'arrow-right',
    svg_content: `
      <path d="M4 9h8v-3.586a1 1 0 0 1 1.707 -.707l6.586 6.586a1 1 0 0 1 0 1.414l-6.586 6.586a1 1 0 0 1 -1.707 -.707v-3.586h-8a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1z"/>
    `,
    description: 'Flecha derecha con cuadro',
    fill: '',
    stroke: ''
  },
  {
    name: 'attachment',
    svg_content: `
      <path d="M15 7l-6.5 6.5a1.5 1.5 0 0 0 3 3l6.5 -6.5a3 3 0 0 0 -6 -6l-6.5 6.5a4.5 4.5 0 0 0 9 9l6.5 -6.5"/>
    `,
    description: 'Clip de adjuntar archivo',
    fill: '',
    stroke: ''
  },
  {
    name: 'bookmark-add',
    svg_content: `
      <path d="M12 17l-6 4v-14a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v5"/>
      <path d="M16 19h6"/>
      <path d="M19 16v6"/>
    `,
    description: 'Marcador con signo más',
    fill: '',
    stroke: ''
  },
  {
    name: 'bookmark-delete',
    svg_content: `
      <path d="M7.708 3.721a3.982 3.982 0 0 1 2.292 -.721h4a4 4 0 0 1 4 4v7m0 4v3l-6 -4l-6 4v-14c0 -.308 .035 -.609 .1 -.897"/>
      <path d="M3 3l18 18"/>
    `,
    description: 'Marcador eliminado o tachado',
    fill: '',
    stroke: ''
  },
  {
    name: 'bookmarked',
    svg_content: `
      <path d="M18 7v14l-6 -4l-6 4v-14a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4z"/>
    `,
    description: 'Marcador guardado',
    fill: '',
    stroke: ''
  },
  {
    name: 'bullet-end',
    svg_content: `
      <path d="M12 21a9 9 0 1 0 0 -18a9 9 0 0 0 0 18"/>
      <path d="M8 12l4 4"/>
      <path d="M8 12h8"/>
      <path d="M12 8l-4 4"/>
    `,
    description: 'Círculo con flechas de finalizar',
    fill: '',
    stroke: ''
  },
  {
    name: 'bullet-go',
    svg_content: `
      <path d="M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0 -18"/>
      <path d="M16 12l-4 -4"/>
      <path d="M16 12h-8"/>
      <path d="M12 16l4 -4"/>
    `,
    description: 'Círculo con flechas de comenzar',
    fill: '',
    stroke: ''
  },
  {
    name: 'bullet-go-end',
    svg_content: `
      <path d="M10.831 20.413l-5.375 -6.91c-.608 -.783 -.608 -2.223 0 -3l5.375 -6.911a1.457 1.457 0 0 1 2.338 0l5.375 6.91c.608 .783 .608 2.223 0 3l-5.375 6.911a1.457 1.457 0 0 1 -2.338 0z"/>
    `,
    description: 'Diamante con flechas de inicio/fin',
    fill: '',
    stroke: ''
  },
  {
    name: 'cancel',
    svg_content: `
      <path d="M9 14l-4 -4l4 -4"/>
      <path d="M5 10h11a4 4 0 1 1 0 8h-1"/>
    `,
    description: 'Cancelar o retroceder',
    fill: '',
    stroke: ''
  },
  {
    name: 'changeset',
    svg_content: `
      <path d="M7 8l-4 4l4 4"/>
      <path d="M17 8l4 4l-4 4"/>
      <path d="M14 4l-4 16"/>
    `,
    description: 'Conjunto de cambios',
    fill: '',
    stroke: ''
  },
  {
    name: 'checked',
    svg_content: `
      <path d="M5 12l5 5l10 -10"/>
    `,
    description: 'Check o verificación',
    fill: '',
    stroke: ''
  },
  {
    name: 'chevrons-left',
    svg_content: `
      <path d="M11 7l-5 5l5 5"/>
      <path d="M17 7l-5 5l5 5"/>
    `,
    description: 'Doble flecha izquierda',
    fill: '',
    stroke: ''
  },
  {
    name: 'chevrons-right',
    svg_content: `
      <path d="M7 7l5 5l-5 5"/>
      <path d="M13 7l5 5l-5 5"/>
    `,
    description: 'Doble flecha derecha',
    fill: '',
    stroke: ''
  },
  {
    name: 'circle-dot-filled',
    svg_content: `
      <path d="M17 3.34a10 10 0 1 1 -14.995 8.984l-.005 -.324l.005 -.324a10 10 0 0 1 14.995 -8.336zm-5 6.66a2 2 0 0 0 -1.977 1.697l-.018 .154l-.005 .149l.005 .15a2 2 0 1 0 1.995 -2.15z"/>
    `,
    description: 'Círculo con punto central',
    fill: '',
    stroke: ''
  },
  {
    name: 'circle-minus',
    svg_content: `
      <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"/>
      <path d="M9 12l6 0"/>
    `,
    description: 'Círculo con signo menos',
    fill: '',
    stroke: ''
  },
  {
    name: 'clear-query',
    svg_content: `
      <path d="M3 5a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-14z"/>
      <path d="M9 9l6 6m0 -6l-6 6"/>
    `,
    description: 'Limpiar búsqueda',
    fill: '',
    stroke: ''
  },
  {
    name: 'close',
    svg_content: `
      <path d="M3 5a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-14z"/>
      <path d="M9 9l6 6m0 -6l-6 6"/>
    `,
    description: 'Cerrar o eliminar',
    fill: '',
    stroke: ''
  },
  {
    name: 'comment',
    svg_content: `
      <path d="M8 9h8"/>
      <path d="M8 13h6"/>
      <path d="M18 4a3 3 0 0 1 3 3v8a3 3 0 0 1 -3 3h-5l-5 3v-3h-2a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3h12z"/>
    `,
    description: 'Comentario o burbuja de chat',
    fill: '',
    stroke: ''
  },
  {
    name: 'comments',
    svg_content: `
      <path d="M8 9h8"/>
      <path d="M8 13h6"/>
      <path d="M18 4a3 3 0 0 1 3 3v8a3 3 0 0 1 -3 3h-5l-5 3v-3h-2a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3h12z"/>
    `,
    description: 'Comentarios múltiples',
    fill: '',
    stroke: ''
  },
  {
    name: 'copy',
    svg_content: `
      <path d="M7 7m0 2.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667z"/>
      <path d="M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1"/>
    `,
    description: 'Copiar documento',
    fill: '',
    stroke: ''
  },
  {
    name: 'copy-link',
    svg_content: `
      <path d="M9 5h-2a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h3m9 -9v-5a2 2 0 0 0 -2 -2h-2"/>
      <path d="M13 17v-1a1 1 0 0 1 1 -1h1m3 0h1a1 1 0 0 1 1 1v1m0 3v1a1 1 0 0 1 -1 1h-1m-3 0h-1a1 1 0 0 1 -1 -1v-1"/>
      <path d="M9 3m0 2a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v0a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z"/>
    `,
    description: 'Copiar enlace',
    fill: '',
    stroke: ''
  },
  {
    name: 'custom-fields',
    svg_content: `
      <path d="M20 13v-4a2 2 0 0 0 -2 -2h-12a2 2 0 0 0 -2 2v5a2 2 0 0 0 2 2h6"/>
      <path d="M15 19l2 2l4 -4"/>
    `,
    description: 'Campos personalizados',
    fill: '',
    stroke: ''
  },
  {
    name: 'del',
    svg_content: `
      <path d="M4 7l16 0"/>
      <path d="M10 11l0 6"/>
      <path d="M14 11l0 6"/>
      <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12"/>
      <path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3"/>
    `,
    description: 'Eliminar o basura',
    fill: '',
    stroke: ''
  },
  {
    name: 'document',
    svg_content: `
      <path d="M14 3v4a1 1 0 0 0 1 1h4"/>
      <path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"/>
      <path d="M9 9l1 0"/>
      <path d="M9 13l6 0"/>
      <path d="M9 17l6 0"/>
    `,
    description: 'Documento con líneas de texto',
    fill: '',
    stroke: ''
  },
  {
    name: 'download',
    svg_content: `
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2"/>
      <path d="M7 11l5 5l5 -5"/>
      <path d="M12 4l0 12"/>
    `,
    description: 'Descargar',
    fill: '',
    stroke: ''
  },
  {
    name: 'edit',
    svg_content: `
      <path d="M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4"/>
      <path d="M13.5 6.5l4 4"/>
    `,
    description: 'Editar o lápiz',
    fill: '',
    stroke: ''
  },
  {
    name: 'email',
    svg_content: `
      <path d="M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10z"/>
      <path d="M3 7l9 6l9 -6"/>
    `,
    description: 'Correo electrónico',
    fill: '',
    stroke: ''
  },
  {
    name: 'email-disabled',
    svg_content: `
      <path d="M9 5h10a2 2 0 0 1 2 2v10m-2 2h-14a2 2 0 0 1 -2 -2v-10a2 2 0 0 1 2 -2"/>
      <path d="M3 7l9 6l.565 -.377m2.435 -1.623l6 -4"/>
      <path d="M3 3l18 18"/>
    `,
    description: 'Correo electrónico deshabilitado',
    fill: '',
    stroke: ''
  },
  {
    name: 'eye',
    svg_content: `
      <path d="M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"/>
      <path d="M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6"/>
  `,
    description: 'Ojo - Ver, visualizar, mostrar',
    fill: '',
    stroke: ''
  },
  {
    name: 'fav',
    svg_content: `
      <path d="M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z"/>
    `,
    description: 'Estrella favorita',
    fill: '#ffff00',
    stroke: '#888800'
  },
  {
    name: 'db-entity',
    svg_content: ` <rect x="6" y="4" width="12" height="16" rx="1"></rect>
      <path d="M6 8H18"></path>
      <rect x="6" y="4" width="12" height="4" fill-opacity="0.6"></rect>
      <circle cx="18" cy="14" r="1.5" stroke-width="2"></circle>
    `,
    description: 'Entidad de base de datos',
    fill: '',
    stroke: '',
  },
  {
    name: 'table',
    svg_content: `
      <rect x="3" y="4" width="18" height="16" rx="2"/>
      <path d="M3 11H21" stroke-width="1.5"/>
      <path d="M3 16H21" stroke-width="1.5"/>
      <path d="M8 4V20" stroke-width="1.5"/>
      <path d="M16 4V20" stroke-width="1.5"/>
      <rect x="3" y="4" width="18" height="2" rx="2" fill="currentColor"/>
    `,
    description: 'Tabla de datos',
    fill: '',
    stroke: '',
  },
  {
    name: 'column',
    svg_content: `
      <rect x="6" y="4" width="12" height="16" rx="1" stroke="currentColor" stroke-width="1.5"/>
      <path d="M6 8H18" stroke="currentColor" stroke-width="1.5"/>
      <rect x="7" y="5" width="10" height="3" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-width="1"/>
    `,
    description: 'Columna',
    fill: '',
    stroke: '',
  },
  {
    name: 'file',
    svg_content: `
      <path d="M14 3v4a1 1 0 0 0 1 1h4"/>
      <path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"/>
    `,
    description: 'Archivo genérico',
    fill: '',
    stroke: ''
  },
  {
    name: 'folder',
    svg_content: `
      <path d="M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2"/>
    `,
    description: 'Carpeta',
    fill: '',
    stroke: ''
  },
  {
    name: 'folder-open',
    svg_content: `
      <path d="M5 19l2.757 -7.351a1 1 0 0 1 .936 -.649h12.307a1 1 0 0 1 .986 1.164l-.996 5.211a2 2 0 0 1 -1.964 1.625h-14.026a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2h4l3 3h7a2 2 0 0 1 2 2v2"/>
    `,
    description: 'Carpeta abierta',
    fill: '',
    stroke: ''
  },
  {
    name: 'group',
    svg_content: `
      <path d="M10 13a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"/>
      <path d="M8 21v-1a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v1"/>
      <path d="M15 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"/>
      <path d="M17 10h2a2 2 0 0 1 2 2v1"/>
      <path d="M5 5a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"/>
      <path d="M3 13v-1a2 2 0 0 1 2 -2h2"/>
    `,
    description: 'Grupo de usuarios',
    fill: '',
    stroke: ''
  },
  {
    name: 'help',
    svg_content: `
      <circle cx="12" cy="12" r="9"/>
      <text x="12" y="17" text-anchor="middle" font-family="sans-serif" font-size="14">?</text>
    `,
    description: 'Ayuda o interrogación',
    fill: '',
    stroke: ''
  },
  {
    name: 'history',
    svg_content: `
      <path d="M12 8l0 4l2 2"/>
      <path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5"/>
    `,
    description: 'Historial o reloj',
    fill: '',
    stroke: ''
  },
  {
    name: 'image-gif',
    svg_content: `
      <path d="M14 3v4a1 1 0 0 0 1 1h4"/>
      <path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"/>
    `,
    description: 'Imagen GIF',
    fill: '',
    stroke: ''
  },
  {
    name: 'image-jpeg',
    svg_content: `
      <path d="M14 3v4a1 1 0 0 0 1 1h4"/>
      <path d="M5 12v-7a2 2 0 0 1 2 -2h7l5 5v4"/>
      <path d="M11 18h1.5a1.5 1.5 0 0 0 0 -3h-1.5v6"/>
      <path d="M20 15h-1a2 2 0 0 0 -2 2v2a2 2 0 0 0 2 2h1v-3"/>
      <path d="M5 15h3v4.5a1.5 1.5 0 0 1 -3 0"/>
    `,
    description: 'Imagen JPEG',
    fill: '',
    stroke: ''
  },
  {
    name: 'image-png',
    svg_content: `
      <path d="M14 3v4a1 1 0 0 0 1 1h4"/>
      <path d="M5 12v-7a2 2 0 0 1 2 -2h7l5 5v4"/>
      <path d="M20 15h-1a2 2 0 0 0 -2 2v2a2 2 0 0 0 2 2h1v-3"/>
      <path d="M5 18h1.5a1.5 1.5 0 0 0 0 -3h-1.5v6"/>
      <path d="M11 21v-6l3 6v-6"/>
    `,
    description: 'Imagen PNG',
    fill: '',
    stroke: ''
  },
  {
    name: 'image-tiff',
    svg_content: `
      <path d="M14 3v4a1 1 0 0 0 1 1h4"/>
      <path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"/>
    `,
    description: 'Imagen TIFF',
    fill: '',
    stroke: ''
  },
  {
    name: 'import',
    svg_content: `
      <path d="M4 6c0 1.657 3.582 3 8 3s8 -1.343 8 -3s-3.582 -3 -8 -3s-8 1.343 -8 3"/>
      <path d="M4 6v6c0 1.657 3.582 3 8 3c1.118 0 2.183 -.086 3.15 -.241"/>
      <path d="M20 12v-6"/>
      <path d="M4 12v6c0 1.657 3.582 3 8 3c.157 0 .312 -.002 .466 -.005"/>
      <path d="M16 19h6"/>
      <path d="M19 16l3 3l-3 3"/>
    `,
    description: 'Importar datos',
    fill: '',
    stroke: ''
  },
  {
    name: 'indexed',
    svg_content: `
      <rect x="10" y="2" width="4" height="4" rx="1"/>
      <rect x="2" y="14" width="4" height="4" rx="1"/>
      <rect x="10" y="14" width="4" height="4" rx="1"/>
      <rect x="18" y="14" width="4" height="4" rx="1"/>
      <path d="M12 6v8" stroke-width="2" fill="none"/>
      <path d="M4 16l6-8" stroke-width="2" fill="none"/>
      <path d="M20 16l-6-8" stroke-width="2" fill="none"/>
    `,
    description: 'Importar datos',
    fill: '',
    stroke: ''
  },
  {
    name: 'issue',
    svg_content: `
      <path d="M13 20l7 -7"/>
      <path d="M13 20v-6a1 1 0 0 1 1 -1h6v-7a2 2 0 0 0 -2 -2h-12a2 2 0 0 0 -2 2v12a2 2 0 0 0 2 2h7"/>
    `,
    description: 'Incidencia o issue',
    fill: '',
    stroke: ''
  },
  {
    name: 'issue-closed',
    svg_content: `
      <path d="M3 3m0 2a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z"/>
      <path d="M9 12l2 2l4 -4"/>
    `,
    description: 'Incidencia cerrada',
    fill: '',
    stroke: ''
  },
  {
    name: 'issue-edit',
    svg_content: `
      <path d="M7 7h-1a2 2 0 0 0 -2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2 -2v-1"/>
      <path d="M20.385 6.585a2.1 2.1 0 0 0 -2.97 -2.97l-8.415 8.385v3h3l8.385 -8.415z"/>
      <path d="M16 5l3 3"/>
    `,
    description: 'Editar incidencia',
    fill: '',
    stroke: ''
  },
  {
    name: 'issue-note',
    svg_content: `
      <path d="M8 9h8"/>
      <path d="M8 13h6"/>
      <path d="M12.01 18.594l-4.01 2.406v-3h-2a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v5.5"/>
      <path d="M16 19h6"/>
      <path d="M19 16v6"/>
    `,
    description: 'Nota de incidencia',
    fill: '',
    stroke: ''
  },
  {
    name: 'key',
    svg_content: `
      <path d="M16.555 3.843l3.602 3.602a2.877 2.877 0 0 1 0 4.069l-2.643 2.643a2.877 2.877 0 0 1 -4.069 0l-.301 -.301l-6.558 6.558a2 2 0 0 1 -1.239 .578l-.175 .008h-1.172a1 1 0 0 1 -.993 -.883l-.007 -.117v-1.172a2 2 0 0 1 .467 -1.284l.119 -.13l.414 -.414h2v-2h2v-2l2.144 -2.144l-.301 -.301a2.877 2.877 0 0 1 0 -4.069l2.643 -2.643a2.877 2.877 0 0 1 4.069 0z"/>
      <path d="M15 9h.01"/>
    `,
    description: 'Llave',
    fill: '',
    stroke: ''
  },
  {
    name: 'link',
    svg_content: `
      <path d="M9 15l6 -6"/>
      <path d="M11 6l.463 -.536a5 5 0 0 1 7.071 7.072l-.534 .464"/>
      <path d="M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463"/>
    `,
    description: 'Enlace',
    fill: '',
    stroke: ''
  },
  {
    name: 'link-break',
    svg_content: `
      <path d="M9 15l3 -3m2 -2l1 -1"/>
      <path d="M11 6l.463 -.536a5 5 0 0 1 7.071 7.072l-.534 .464"/>
      <path d="M3 3l18 18"/>
      <path d="M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463"/>
    `,
    description: 'Enlace roto',
    fill: '',
    stroke: ''
  },
  {
    name: 'list',
    svg_content: `
      <path d="M9 6l11 0"/>
      <path d="M9 12l11 0"/>
      <path d="M9 18l11 0"/>
      <path d="M5 6l0 .01"/>
      <path d="M5 12l0 .01"/>
      <path d="M5 18l0 .01"/>
    `,
    description: 'Lista',
    fill: '',
    stroke: ''
  },
  {
    name: 'lock',
    svg_content: `
      <path d="M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6z"/>
      <path d="M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0"/>
      <path d="M8 11v-4a4 4 0 1 1 8 0v4"/>
    `,
    description: 'Candado cerrado',
    fill: '',
    stroke: ''
  },
  {
    name: 'message',
    svg_content: `
      <path d="M8 9h8"/>
      <path d="M8 13h6"/>
      <path d="M18 4a3 3 0 0 1 3 3v8a3 3 0 0 1 -3 3h-5l-5 3v-3h-2a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3h12z"/>
    `,
    description: 'Mensaje',
    fill: '',
    stroke: ''
  },
  {
    name: 'move',
    svg_content: `
      <path d="M15 14l4 -4l-4 -4"/>
      <path d="M19 10h-11a4 4 0 1 0 0 8h1"/>
    `,
    description: 'Mover',
    fill: '',
    stroke: ''
  },
  {
    name: 'news',
    svg_content: `
      <path d="M16 6h3a1 1 0 0 1 1 1v11a2 2 0 0 1 -4 0v-13a1 1 0 0 0 -1 -1h-10a1 1 0 0 0 -1 1v12a3 3 0 0 0 3 3h11"/>
      <path d="M8 8l4 0"/>
      <path d="M8 12l4 0"/>
      <path d="M8 16l4 0"/>
    `,
    description: 'Noticias o artículo',
    fill: '',
    stroke: ''
  },
  {
    name: 'package',
    svg_content: `
      <path d="M12 3l8 4.5l0 9l-8 4.5l-8 -4.5l0 -9l8 -4.5"/>
      <path d="M12 12l8 -4.5"/>
      <path d="M12 12l0 9"/>
      <path d="M12 12l-8 -4.5"/>
      <path d="M16 5.25l-8 4.5"/>
    `,
    description: 'Paquete o caja',
    fill: '',
    stroke: ''
  },
  {
    name: 'plugins',
    svg_content: `
      <path d="M4 7h3a1 1 0 0 0 1 -1v-1a2 2 0 0 1 4 0v1a1 1 0 0 0 1 1h3a1 1 0 0 1 1 1v3a1 1 0 0 0 1 1h1a2 2 0 0 1 0 4h-1a1 1 0 0 0 -1 1v3a1 1 0 0 1 -1 1h-3a1 1 0 0 1 -1 -1v-1a2 2 0 0 0 -4 0v1a1 1 0 0 1 -1 1h-3a1 1 0 0 1 -1 -1v-3a1 1 0 0 1 1 -1h1a2 2 0 0 0 0 -4h-1a1 1 0 0 1 -1 -1v-3a1 1 0 0 1 1 -1"/>
    `,
    description: 'Plugins o extensiones',
    fill: '',
    stroke: ''
  },
  {
    name: 'project',
    svg_content: `
      <path d="M7 16.5l-5 -3l5 -3l5 3v5.5l-5 3z"/>
      <path d="M2 13.5v5.5l5 3"/>
      <path d="M7 16.545l5 -3.03"/>
      <path d="M17 16.5l-5 -3l5 -3l5 3v5.5l-5 3z"/>
      <path d="M12 19l5 3"/>
      <path d="M17 16.5l5 -3"/>
      <path d="M12 13.5v-5.5l-5 -3l5 -3l5 3v5.5"/>
      <path d="M7 5.03v5.455"/>
      <path d="M12 8l5 -3"/>
    `,
    description: 'Proyecto',
    fill: '',
    stroke: ''
  },
  {
    name: 'projects',
    svg_content: `
      <path d="M7 16.5l-5 -3l5 -3l5 3v5.5l-5 3z"/>
      <path d="M2 13.5v5.5l5 3"/>
      <path d="M7 16.545l5 -3.03"/>
      <path d="M17 16.5l-5 -3l5 -3l5 3v5.5l-5 3z"/>
      <path d="M12 19l5 3"/>
      <path d="M17 16.5l5 -3"/>
      <path d="M12 13.5v-5.5l-5 -3l5 -3l5 3v5.5"/>
      <path d="M7 5.03v5.455"/>
      <path d="M12 8l5 -3"/>
    `,
    description: 'Proyectos múltiples',
    fill: '',
    stroke: ''
  },
  {
    name: 'reload',
    svg_content: `
      <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4"/>
      <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4"/>
    `,
    description: 'Recargar o actualizar',
    fill: '',
    stroke: ''
  },
  {
    name: 'reorder',
    svg_content: `
      <path d="M4 10h16"/>
      <path d="M4 14h16"/>
      <path d="M9 18l3 3l3 -3"/>
      <path d="M9 6l3 -3l3 3"/>
    `,
    description: 'Reordenar',
    fill: '',
    stroke: ''
  },
  {
    name: 'reply',
    svg_content: `
      <path d="M21 14l-3 -3h-7a1 1 0 0 1 -1 -1v-6a1 1 0 0 1 1 -1h9a1 1 0 0 1 1 1v10"/>
      <path d="M14 15v2a1 1 0 0 1 -1 1h-7l-3 3v-10a1 1 0 0 1 1 -1h2"/>
    `,
    description: 'Responder',
    fill: '',
    stroke: ''
  },
  {
    name: 'roles',
    svg_content: `
      <path d="M12 21a12 12 0 0 1 -8.5 -15a12 12 0 0 0 8.5 -3a12 12 0 0 0 8.5 3c.568 1.933 .635 3.957 .223 5.89"/>
      <path d="M19.001 19m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>
      <path d="M19.001 15.5v1.5"/>
      <path d="M19.001 21v1.5"/>
      <path d="M22.032 17.25l-1.299 .75"/>
      <path d="M17.27 20l-1.3 .75"/>
      <path d="M15.97 17.25l1.3 .75"/>
      <path d="M20.733 20l1.3 .75"/>
    `,
    description: 'Roles o permisos',
    fill: '',
    stroke: ''
  },
  {
    name: 'save',
    svg_content: `
      <path d="M6 4h10l4 4v10a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2"/>
      <path d="M12 14m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>
      <path d="M14 4l0 4l-6 0l0 -4"/>
    `,
    description: 'Guardar',
    fill: '',
    stroke: ''
  },
  {
    name: 'search',
    svg_content: `
      <path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0"/>
      <path d="M21 21l-6 -6"/>
    `,
    description: 'Buscar o lupa',
    fill: '',
    stroke: ''
  },
  {
    name: 'server-authentication',
    svg_content: `
      <path d="M3 4m0 3a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v2a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3z"/>
      <path d="M3 12m0 3a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v2a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3z"/>
      <path d="M7 8l0 .01"/>
      <path d="M7 16l0 .01"/>
    `,
    description: 'Autenticación de servidor',
    fill: '',
    stroke: ''
  },
  {
    name: 'settings',
    svg_content: `
      <path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z"/>
      <path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"/>
    `,
    description: 'Configuración o ajustes',
    fill: '',
    stroke: ''
  },
  {
    name: 'stats',
    svg_content: `
      <path d="M3 13a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v6a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z"/>
      <path d="M15 9a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z"/>
      <path d="M9 5a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v14a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1z"/>
      <path d="M4 20h14"/>
    `,
    description: 'Estadísticas o gráfico de barras',
    fill: '',
    stroke: ''
  },
  {
    name: 'summary',
    svg_content: `
      <path d="M13 3l0 7l6 0l-8 11l0 -7l-6 0l8 -11"/>
    `,
    description: 'Resumen',
    fill: '',
    stroke: ''
  },
  {
    name: 'table-multiple',
    svg_content: `
      <path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4"/>
      <path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4"/>
    `,
    description: 'Tablas múltiples',
    fill: '',
    stroke: ''
  },
  {
    name: 'text-css',
    svg_content: `
      <path d="M14 3v4a1 1 0 0 0 1 1h4"/>
      <path d="M5 12v-7a2 2 0 0 1 2 -2h7l5 5v4"/>
      <path d="M8 16.5a1.5 1.5 0 0 0 -3 0v3a1.5 1.5 0 0 0 3 0"/>
      <path d="M11 20.25c0 .414 .336 .75 .75 .75h1.25a1 1 0 0 0 1 -1v-1a1 1 0 0 0 -1 -1h-1a1 1 0 0 1 -1 -1v-1a1 1 0 0 1 1 -1h1.25a.75 .75 0 0 1 .75 .75"/>
      <path d="M17 20.25c0 .414 .336 .75 .75 .75h1.25a1 1 0 0 0 1 -1v-1a1 1 0 0 0 -1 -1h-1a1 1 0 0 1 -1 -1v-1a1 1 0 0 1 1 -1h1.25a.75 .75 0 0 1 .75 .75"/>
    `,
    description: 'Archivo CSS',
    fill: '',
    stroke: ''
  },
  {
    name: 'text-html',
    svg_content: `
      <path d="M14 3v4a1 1 0 0 0 1 1h4"/>
      <path d="M5 12v-7a2 2 0 0 1 2 -2h7l5 5v4"/>
      <path d="M2 21v-6"/>
      <path d="M5 15v6"/>
      <path d="M2 18h3"/>
      <path d="M20 15v6h2"/>
      <path d="M13 21v-6l2 3l2 -3v6"/>
      <path d="M7.5 15h3"/>
      <path d="M9 15v6"/>
    `,
    description: 'Archivo HTML',
    fill: '',
    stroke: ''
  },
  {
    name: 'text-plain',
    svg_content: `
      <path d="M14 3v4a1 1 0 0 0 1 1h4"/>
      <path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"/>
      <path d="M9 9l1 0"/>
      <path d="M9 13l6 0"/>
      <path d="M9 17l6 0"/>
    `,
    description: 'Archivo de texto plano',
    fill: '',
    stroke: ''
  },
  {
    name: 'string',
    svg_content: `
      <text x="12" y="16" font-family="monospace" stroke-width="1" font-size="16" text-anchor="middle" dominant-baseline="middle">ab</text>
    `,
    description: 'Formato de campo: Cadena de caracteres',
    fill: '',
    stroke: ''
  },
  {
    name: 'text',
    svg_content: `
      <g transform="translate(12, 12)" stroke-width="2.5" fill="none">
        <path d="M-6 -6h12M-6 -2h12M-6 2h8M-6 6h6" transform="translate(0, -1)" />
      </g>
    `,
    description: 'Formato de campos: Párrafos de texto',
    fill: '',
    stroke: ''
  },
  {
    name: 'int',
    svg_content: `
      <text x="12" y="16" font-family="monospace" font-size="14" stroke-width="1.5" text-anchor="middle" dominant-baseline="middle">123</text>
    `,
    description: 'Formato de campo: Valor entero',
    fill: '',
    stroke: ''
  },
  {
    name: 'float',
    svg_content: `
      <text x="12" y="16" stroke-width="1.5" font-size="14" text-anchor="middle" dominant-baseline="middle">3.14</text>
    `,
    description: 'Formato de campo: Valor decimal (o flotante)',
    fill: '',
    stroke: ''
  },
  {
    name: 'bool',
    svg_content: `
      <rect x="3" y="6" width="18" height="12" rx="6"></rect>
      <circle cx="15.5" cy="12" r="4" fill="currentColor" ></circle>
    `,
    description: 'Formato de campo: Valor booleano: verdadero o falso',
    fill: '',
    stroke: ''
  },
  {
    name: 'list',
    svg_content: `
      <rect x="2" y="5" width="18" height="14" rx="3"></rect>
      <path d="M12 12l2 2l2 -2"></path>
    `,
    description: 'Formato de campo: Valor de una lista desplegable',
    fill: '',
    stroke: ''
  },
  {
    name: 'relation',
    svg_content: `
      <g transform="translate(12,12)" stroke-width="2" fill="none">
        <circle cx="-5" cy="0" r="3" />
        <circle cx="5" cy="0" r="3" />
        <path d="M-2 0h4" />
      </g>
    `,
    description: 'Formato de campo: Referencia a otro objeto',
    fill: '',
    stroke: ''
  },
  {
    name: 'attachment',
    svg_content: `
      <path d="M16 8v8a4 4 0 0 1 -8 0v-9a3 3 0 0 1 6 0v8a2 2 0 0 1 -4 0v-7" />
    `,
    description: 'Formato de campo: Archivo adjunto',
    fill: '',
    stroke: ''
  },
  {
    name: 'text-x-c',
    svg_content: `
      <path d="M14 3v4a1 1 0 0 0 1 1h4"/>
      <path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"/>
      <path d="M10 13l-1 2l1 2"/>
      <path d="M14 13l1 2l-1 2"/>
    `,
    description: 'Archivo C',
    fill: '',
    stroke: ''
  },
  {
    name: 'text-x-csharp',
    svg_content: `
      <path d="M10 9a3 3 0 0 0 -3 -3h-.5a3.5 3.5 0 0 0 -3.5 3.5v5a3.5 3.5 0 0 0 3.5 3.5h.5a3 3 0 0 0 3 -3"/>
      <path d="M16 7l-1 10"/>
      <path d="M20 7l-1 10"/>
      <path d="M14 10h7.5"/>
      <path d="M21 14h-7.5"/>
    `,
    description: 'Archivo C#',
    fill: '',
    stroke: ''
  },
  {
    name: 'text-x-java',
    svg_content: `
      <path d="M14 3v4a1 1 0 0 0 1 1h4"/>
      <path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"/>
      <path d="M10 13l-1 2l1 2"/>
      <path d="M14 13l1 2l-1 2"/>
    `,
    description: 'Archivo Java',
    fill: '',
    stroke: ''
  },
  {
    name: 'text-x-php',
    svg_content: `
      <path d="M14 3v4a1 1 0 0 0 1 1h4"/>
      <path d="M5 12v-7a2 2 0 0 1 2 -2h7l5 5v4"/>
      <path d="M5 18h1.5a1.5 1.5 0 0 0 0 -3h-1.5v6"/>
      <path d="M17 18h1.5a1.5 1.5 0 0 0 0 -3h-1.5v6"/>
      <path d="M11 21v-6"/>
      <path d="M14 15v6"/>
      <path d="M11 18h3"/>
    `,
    description: 'Archivo PHP',
    fill: '',
    stroke: ''
  },
  {
    name: 'text-x-ruby',
    svg_content: `
      <path d="M14 3v4a1 1 0 0 0 1 1h4"/>
      <path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"/>
      <path d="M10 13l-1 2l1 2"/>
      <path d="M14 13l1 2l-1 2"/>
    `,
    description: 'Archivo Ruby',
    fill: '',
    stroke: ''
  },
  {
    name: 'text-xml',
    svg_content: `
      <path d="M14 3v4a1 1 0 0 0 1 1h4"/>
      <path d="M5 12v-7a2 2 0 0 1 2 -2h7l5 5v4"/>
      <path d="M4 15l4 6"/>
      <path d="M4 21l4 -6"/>
      <path d="M19 15v6h3"/>
      <path d="M11 21v-6l2.5 3l2.5 -3v6"/>
    `,
    description: 'Archivo XML',
    fill: '',
    stroke: ''
  },
  {
    name: 'json',
    svg_content: `
      <text x="12" y="16" text-anchor="middle" font-size="16" font-family="monospace">{}</text>
    `,
    description: 'Formato de campo: Objeto JSON',
    fill: '',
    stroke: ''
  },
  {
    name: 'time',
    svg_content: `
      <path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"/>
      <path d="M12 7v5l3 3"/>
    `,
    description: 'Formato de campo: Tiempo o reloj',
    fill: '',
    stroke: ''
  },
  {
    name: 'date',
    svg_content: `
      <path d="M4 7h16"/>
      <path d="M7 3v4"/>
      <path d="M17 3v4"/>
      <rect x="4" y="5" width="16" height="16" rx="2"/>
      <path d="M8 11h3"/>
      <path d="M13 11h3"/>
      <path d="M8 15h3"/>
      <path d="M13 15h3"/>
    `,
    description: 'Formato de campo: Fecha o calendario',
    fill: '',
    stroke: ''
  },
  {
    name: 'datetime',
    svg_content: `
      <!-- Calendario -->
      <path d="M4 7h16"/>
      <path d="M7 3v4"/>
      <path d="M17 3v4"/>
      <rect x="4" y="5" width="16" height="16" rx="2"/>
      <g stroke-width="1.2">
        <circle cx="17" cy="17" r="6" fill="var(--color-white)"/>
        <path d="M17 14.5v2.8l2 2"/>
      </g>
    `,
    description: 'Formato de campo: Fecha y hora',
    fill: '',
    stroke: ''
  },
  {
    name: 'time-add',
    svg_content: `
      <path d="M20.984 12.535a9 9 0 1 0 -8.468 8.45"/>
      <path d="M16 19h6"/>
      <path d="M19 16v6"/>
      <path d="M12 7v5l3 3"/>
    `,
    description: 'Agregar tiempo',
    fill: '',
    stroke: ''
  },
  {
    name: 'toggle-minus',
    svg_content: `
      <path d="M9 12h6"/>
      <path d="M12 3c7.2 0 9 1.8 9 9s-1.8 9 -9 9s-9 -1.8 -9 -9s1.8 -9 9 -9z"/>
    `,
    description: 'Toggle menos',
    fill: '',
    stroke: ''
  },
  {
    name: 'toggle-plus',
    svg_content: `
      <path d="M12 3c7.2 0 9 1.8 9 9s-1.8 9 -9 9s-9 -1.8 -9 -9s1.8 -9 9 -9z"/>
      <path d="M15 12h-6"/>
      <path d="M12 9v6"/>
    `,
    description: 'Toggle más',
    fill: '',
    stroke: ''
  },
  {
    name: 'unique',
    svg_content: ` <circle cx="12" cy="12" r="10" stroke-width="2" fill="none"/>
      <text x="12" y="13" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="12">1</text>`,
    description: 'Candado abierto',
    fill: '',
    stroke: ''
  },
  {
    name: 'unlock',
    svg_content: `
      <path d="M5 11m0 2a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2z"/>
      <path d="M12 16m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/>
      <path d="M8 11v-5a4 4 0 0 1 8 0"/>
    `,
    description: 'Candado abierto',
    fill: '',
    stroke: ''
  },
  {
    name: 'user',
    svg_content: `
      <path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0"/>
      <path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"/>
    `,
    description: 'Usuario',
    fill: '',
    stroke: ''
  },
  {
    name: 'warning',
    svg_content: `
      <path d="M12 9v4"/>
      <path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0z"/>
      <path d="M12 16h.01"/>
    `,
    description: 'Advertencia o alerta',
    fill: '',
    stroke: ''
  },
  {
    name: 'error',
    svg_content: `
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    `,
    description: 'Error o defecto',
    fill: '',
    stroke: ''
  },
  {
    name: 'wiki-page',
    svg_content: `
      <path d="M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-11a1 1 0 0 1 -1 -1v-14a1 1 0 0 1 1 -1m3 0v18"/>
      <path d="M13 8l2 0"/>
      <path d="M13 12l2 0"/>
    `,
    description: 'Página wiki',
    fill: '',
    stroke: ''
  },
  {
    name: 'workflows',
    svg_content: `
      <path d="M6 14v-6a3 3 0 1 1 6 0v8a3 3 0 0 0 6 0v-6"/>
      <path d="M16 3m0 2a2 2 0 0 1 2 -2h0a2 2 0 0 1 2 2v3a2 2 0 0 1 -2 2h0a2 2 0 0 1 -2 -2z"/>
      <path d="M4 14m0 2a2 2 0 0 1 2 -2h0a2 2 0 0 1 2 2v3a2 2 0 0 1 -2 2h0a2 2 0 0 1 -2 -2z"/>
    `,
    description: 'Flujos de trabajo',
    fill: '',
    stroke: ''
  },
  {
    name: 'zoom-in',
    svg_content: `
      <path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0"/>
      <path d="M7 10l6 0"/>
      <path d="M10 7l0 6"/>
      <path d="M21 21l-6 -6"/>
    `,
    description: 'Zoom para acercar',
    fill: '',
    stroke: ''
  },
  {
    name: 'zoom-out',
    svg_content: `
      <path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0"/>
      <path d="M7 10l6 0"/>
      <path d="M21 21l-6 -6"/>
    `,
    description: 'Zoom para alejar',
    fill: '',
    stroke: ''
  },
  {
    name: 'notification',
    svg_content: `
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
    `,
    description: 'Notificación o campana',
    fill: '',
    stroke: ''
  },
  {
  name: 'humming',
  svg_content: '<g transform="scale(0.19, 0.2)" stroke-width="2"><path xmlns="http://www.w3.org/2000/svg" d="M23 27C18.9009 25.6989 4.83133 19.2863 1.35702 23.2673C-1.39133 26.4165 4.31816 35.2094 5.91407 38C13.1825 50.7094 25.9428 64.8992 40 70C33.5315 77.8404 2.84898 100.318 14.2599 114.176C18.198 118.958 27.3778 112.377 31 110.195C39.6046 105.013 46.1208 97.1347 55 92.3839C63.6174 87.7732 73.1771 86.9419 80.9138 80.4043C90.5883 72.2293 89.7869 59.5837 96.7623 50.0213C99.1411 46.7602 123.124 33.6373 122.456 32.7018C120.234 29.5902 109.987 33.5287 107 34.0767C99.1488 35.5168 91.7908 31.2615 84 32.3241C78.2757 33.1049 73.5375 38.6159 68 38.8139C61.2152 39.0566 12.7393 -2.65259 23 27M64 45C53.3675 42.0774 27.0063 31.7758 26 20C38.4719 23.9468 56.9182 33.7211 64 45M80 52C51.5944 74.1807 38.5948 29.132 8 33C7.06253 30.9465 6.46605 29.2054 6 27C30.6291 30.8321 56.1817 55.1465 80 52M16 38C13.936 38.7247 12.1955 38.9095 10 39C12.054 36.759 13.1594 37.0399 16 38M92 40L91 41L92 40M88 42C86.2218 42.9555 85.9786 42.7662 85 41L88 42M35 46C27.5772 48.5146 18.2344 47.6762 12 43C19.6737 40.4004 28.0173 42.4463 35 46M84 44C80.5775 48.2528 75.1819 48.6815 70 49C74.3939 46.1899 78.6652 43.2837 84 44M91 46C88.4787 49.7976 85.3415 50.9671 81 52C84.0344 49.3829 87.3516 47.6374 91 46M43 54C35.299 54.0304 26.4519 56.1972 20 51C27.2179 49.1735 37.5307 48.3092 43 54M48 56C52.0794 59.2678 55.9204 61.6424 61 63C57.9516 65.637 54.6845 67.3878 51 69C50.6919 64.3146 49.6501 60.896 47 57L48 56M47 63C40.0893 62.7549 33.3901 61.6909 27 59C33.377 55.0078 43.5183 55.9139 47 63M80 57C68.6211 72.6319 56.5833 76.4251 39 82C48.2824 71.7167 67.4004 62.7487 80 57M84 60C77.8963 78.3654 60.8792 83.1675 43 85C58.5644 76.5581 69.4973 70.8761 84 60M46 66L46 69C43.866 68.8508 42.0656 68.5541 40 68C42.0878 66.6451 43.5146 66.2712 46 66M50 89C46.7407 94.0354 42.0814 97.8787 37 101C39.609 95.0635 43.621 90.6737 50 89M39 91C34.3168 99.1457 29.1853 107.648 20 111C22.2557 100.988 30.0572 95.0583 39 91z"/></g>',
  description: 'Colibrí',
  fill: 'var(--icon-stroke)',
  stroke: 'transparent'
}
].map(i => { return { ...i, svg_content: i.svg_content.trim().replace(/\r\n/g, '\n') } });

