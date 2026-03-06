
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function createSimpleHash(input: unknown): string {
  // Serializar cualquier tipo de input
  let str: string;

  if (input === null) {
    str = 'null';
  } else if (input === undefined) {
    str = 'undefined';
  } else if (typeof input === 'object') {
    // Ordenar keys para consistencia
    str = JSON.stringify(input, Object.keys(input || {}).sort());
  } else {
    str = String(input);
  }

  // Algoritmo de hash simple pero efectivo
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convertir a 32-bit integer
  }

  // Retornar como hexadecimal
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function isObject(item: any) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

export function mergeById<T = any>(target: T, source: T): T {
  // Si source es undefined, mantener target
  if (source === undefined) return target;
  // Si target es undefined, usar source
  if (target === undefined) return source;

  // Ambos son objetos
  if (isObject(target) && isObject(source)) {
    const _target = target as object;
    const _source = source as object;
    // Si ambos tienen id y son diferentes, reemplazar target por source
    if ('id' in _target && 'id' in _source && _target.id !== _source.id) {
      return source;
    }
    // En cualquier otro caso (mismo id o al menos uno sin id), fusionar propiedades
    const result = { ..._target } as any;
    for (const key in source) {
      result[key] = mergeById(result[key], _source[key as keyof typeof _source]);
    }
    return result as T;
  }

  // Ambos son arrays
  if (Array.isArray(target) && Array.isArray(source)) {
    // Mapa de elementos de target por id para búsqueda rápida
    const targetMap = new Map();
    target.forEach(item => {
      if (isObject(item) && 'id' in item) {
        targetMap.set(item.id, item);
      }
    });

    // Construir nuevo array recorriendo source
    const result = [];
    for (const sourceItem of source) {
      if (isObject(sourceItem) && 'id' in sourceItem) {
        const targetItem = targetMap.get(sourceItem.id);
        if (targetItem !== undefined) {
          // Coincide id: fusionar recursivamente
          result.push(mergeById(targetItem, sourceItem));
        } else {
          // Nuevo elemento sin correspondencia
          result.push(sourceItem);
        }
      } else {
        // Elemento sin id: se añade tal cual
        result.push(sourceItem);
      }
    }
    return result as T;
  }

  // Para cualquier otro tipo (primitivos, etc.), reemplazar con source
  return source;
}