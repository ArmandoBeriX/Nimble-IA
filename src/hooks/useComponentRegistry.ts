// src/hooks/useComponentRegistry.ts
import { createMemo } from 'solid-js';
import { componentRegistry, getComponentsByCategory } from '../lib/component-registry';

export function useComponentRegistry() {
  const categories = createMemo(() => getComponentsByCategory());
  
  const getComponent = (type: string) => componentRegistry[type];
  
  const hasComponent = (type: string) => type in componentRegistry;
  
  const getAvailableComponents = () => {
    return Object.entries(componentRegistry)
      .filter(([_, config]) => config.designer !== false)
      .map(([type, config]) => ({
        type,
        ...config
      }));
  };

  return {
    categories,
    getComponent,
    hasComponent,
    getAvailableComponents,
    registry: componentRegistry
  };
}