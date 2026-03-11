import { lazy } from 'solid-js';
import type { RouteDefinition } from '@solidjs/router';

import Home from './pages/home';
import Login from './pages/login';
import Preferences from './pages/preferences';

export const routes: RouteDefinition[] = [
  {
    path: '/',
    component: Home,
  },
  {
    path: '/login',
    component: Login,
  },
  {
    path: '/preferences',
    component: Preferences,
  },
  {
    path: '/admin',
    children: [
      {
        path: '/',
        component: lazy(() => import('./pages/admin/admin')),
      },
      {
        path: '/assistant',
        component: lazy(() => import('./pages/admin/assistant')),
      },
      {
        path: '/automatization',
        component: lazy(() => import('./pages/admin/automatization')),
      },
      {
        path: '/entities',
        component: lazy(() => import('./pages/admin/entities/FormPage')),
      },
      {
        path: '/interfaces',
        component: lazy(() => import('./pages/admin/interfaces')),
      },
      {
        path: '/navigation',
        component: lazy(() => import('./pages/admin/navigation/NavigationLayout')),
        children: [
          {
            path: '/',
            component: lazy(() => import('./pages/admin/navigation/menu-items')),
          },
          {
            path: '/menu-items',
            component: lazy(() => import('./pages/admin/navigation/menu-items')),
          },
          {
            path: '/icons',
            component: lazy(() => import('./pages/admin/navigation/icons')),
          },
        ]
      },
      {
        path: '/notifications',
        component: lazy(() => import('./pages/admin/notifications')),
      },
      {
        path: '/organization-rules',
        component: lazy(() => import('./pages/admin/organization-rules')),
      },
      {
        path: '/schema',
        component: lazy(() => import('./pages/admin/schema/SchemaLayout')),
      },
      {
        path: '/settings',
        component: lazy(() => import('./pages/admin/settings/SettingsPage')),
      },
      {
        path: '/users',
        component: lazy(() => import('./pages/admin/users')),
        // preload: DesignerData, // Si tienes datos para precargar, descomenta esta línea
      },
    ]
  },
  {
    path: '**',
    component: lazy(() => import('./errors/404')),
  },
];
