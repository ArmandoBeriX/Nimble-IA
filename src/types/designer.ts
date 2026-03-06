// src/types/designer.ts
import { Component } from 'solid-js';

export interface DesignerComponent {
  type: string;
  props?: Record<string, any>;
  children?: DesignerComponent[];
  id: string;
  parentId?: string;
}

export interface ComponentDefinition {
  type: string;
  name: string;
  category: string;
  icon?: string;
  defaultProps?: Record<string, any>;
  editForm?: (props: any, updateProps: (newProps: any) => void) => any;
}

export interface ComponentConfig {
  // Componente Solid.js
  component: Component<any>;
  // Metadatos para el diseñador
  name: string;
  category: string;
  icon?: string;
  description?: string;
  // Configuración por defecto
  defaultProps?: Record<string, any>;
  // Para evitar que aparezca en el diseñador
  designer?: boolean;
  // Formulario de edición personalizado
  editForm?: (props: any, updateProps: (newProps: any) => void) => any;
  // Valores permitidos para props (para selects)
  propOptions?: Record<string, Array<{ label: string; value: any }>>;
}

export type ComponentRegistry = Record<string, ComponentConfig>;