import { createMemo } from 'solid-js';
import { TableDef } from '../../../types/schema';

const HEADER_HEIGHT = 48;
const DOT_R = 3.5;

interface EntityRelationProps {
  from: TableDef;
  to: TableDef;
  fromFieldIndex: number;
  isMultiple: boolean;
  fromWidth: number;
  toWidth: number;
  // Y del centro de cada field relativo al top del contenedor de fields (debajo del header)
  fromFieldPositions: number[];
  isHovered: boolean;
  onNavigateToRelation: (tableId: string) => void;
  onHoverStart: (x: number, y: number) => void;
  onHoverEnd: () => void;
}

export default function EntityRelation(props: EntityRelationProps) {
  const color = () => (props.isHovered ? '#3B82F6' : '#9CA3AF');
  const sw = () => (props.isHovered ? 2 : 1.5);

  const getFromY = () => {
    const tableY = props.from.posy || 0;
    const measured = props.fromFieldPositions[props.fromFieldIndex];
    if (measured !== undefined) {
      return tableY + HEADER_HEIGHT + measured;
    }
    const FIELD_HEIGHT = 24;
    return tableY + HEADER_HEIGHT + props.fromFieldIndex * FIELD_HEIGHT + FIELD_HEIGHT / 2;
  };

  const points = createMemo(() => {
    const fromW = props.fromWidth;
    const toW = props.toWidth;
    const fromTableX = props.from.posx || 0;
    const fromTableY = props.from.posy || 0;
    const toTableX = props.to.posx || 0;
    const toTableY = props.to.posy || 0;
    const self = props.from.id === props.to.id;

    const fromY = getFromY();
    const toHeaderCenterY = toTableY + HEADER_HEIGHT / 2;

    // --- Auto-relación ---
    if (self) {
      // Sale por la derecha del campo, entra por arriba-derecha del header
      return {
        fromX: fromTableX + fromW,
        fromY,
        toX: fromTableX + fromW * 0.75,
        toY: fromTableY,
        entryDir: 'top' as const,
        exitDir: 'right' as const,
        fromBelow: false,
      };
    }

    // Decidir si la salida es por la derecha o izquierda
    // según qué lado está más cerca del destino
    const fromCenterX = fromTableX + fromW / 2;
    const toCenterX = toTableX + toW / 2;
    const exitRight = toCenterX >= fromCenterX;

    const fromX = exitRight ? fromTableX + fromW : fromTableX;

    // ¿El campo origen está por debajo del header destino?
    const fromBelow = fromY > toHeaderCenterY + 10;

    if (fromBelow) {
      // Si viene de abajo → solo izquierda/derecha del header (nunca top)
      const toX = exitRight ? toTableX : toTableX + toW;
      return {
        fromX,
        fromY,
        toX,
        toY: toHeaderCenterY,
        entryDir: exitRight ? ('right' as const) : ('left' as const),
        exitDir: exitRight ? ('right' as const) : ('left' as const),
        fromBelow: true,
      };
    }

    // Viene de arriba o del mismo nivel
    // Si están muy alineados horizontalmente y el destino está claramente debajo → entrada por top
    const dx = Math.abs(toCenterX - fromCenterX);
    const dy = toTableY - fromY;
    const useTop = dy > 60 && dx < 150;

    if (useTop) {
      return {
        fromX: fromTableX + fromW / 2, // sale del centro horizontal (única excepción visual)
        fromY,
        toX: toTableX + toW / 2,
        toY: toTableY,
        entryDir: 'top' as const,
        exitDir: 'center' as const,
        fromBelow: false,
      };
    }

    // Entrada lateral al header
    const toX = exitRight ? toTableX : toTableX + toW;
    return {
      fromX,
      fromY,
      toX,
      toY: toHeaderCenterY,
      entryDir: exitRight ? ('right' as const) : ('left' as const),
      exitDir: exitRight ? ('right' as const) : ('left' as const),
      fromBelow: false,
    };
  });

  const path = createMemo(() => {
    const { fromX, fromY, toX, toY, entryDir, exitDir, fromBelow } = points();

    // Auto-relación
    if (props.from.id === props.to.id) {
      const ox = 85;
      return `M ${fromX} ${fromY} C ${fromX + ox} ${fromY}, ${fromX + ox} ${toY - ox}, ${toX} ${toY}`;
    }

    if (entryDir === 'top') {
      const bend = 60;
      return `M ${fromX} ${fromY} C ${fromX} ${fromY + bend}, ${toX} ${toY - bend}, ${toX} ${toY}`;
    }

    const dir = exitDir === 'right' ? 1 : -1;

    if (fromBelow) {
      // Viene de abajo: arco amplio para que no quede detrás del nodo
      const c1x = fromX + dir * 100;
      const c2x = toX - dir * 50;
      const c2y = toY + 60;
      return `M ${fromX} ${fromY} C ${c1x} ${fromY}, ${c2x} ${c2y}, ${toX} ${toY}`;
    }

    const bend = 60;
    const c1x = fromX + dir * bend;
    const c2x = toX - dir * bend;
    return `M ${fromX} ${fromY} C ${c1x} ${fromY}, ${c2x} ${toY}, ${toX} ${toY}`;
  });

  const crowFoot = createMemo(() => {
    if (!props.isMultiple) return [];
    const { toX, toY, entryDir } = points();
    const len = 9;
    const spread = 5;

    if (entryDir === 'top') {
      return [
        `M ${toX} ${toY} L ${toX - spread} ${toY - len}`,
        `M ${toX} ${toY} L ${toX + spread} ${toY - len}`,
      ];
    }

    const dir = entryDir === 'right' ? -1 : 1;
    return [
      `M ${toX} ${toY} L ${toX + dir * len} ${toY - spread}`,
      `M ${toX} ${toY} L ${toX + dir * len} ${toY + spread}`,
    ];
  });

  return (
    <g>
      {/* Área hover invisible */}
      <path
        d={path()}
        stroke="transparent"
        stroke-width="12"
        fill="none"
        class="cursor-pointer"
        onClick={(e) => props.onNavigateToRelation(props.from.id)}
        onMouseEnter={(e) => props.onHoverStart(e.clientX, e.clientY)}
        onMouseMove={(e) => props.onHoverStart(e.clientX, e.clientY)}
        onMouseLeave={() => props.onHoverEnd()}
      />

      {/* Línea principal */}
      <path
        d={path()}
        stroke={color()}
        stroke-width={sw()}
        fill="none"
        pointer-events="none"
        style={{ transition: 'stroke 0.15s, stroke-width 0.15s' }}
      />

      {/* Bolita origen */}
      <circle
        cx={points().fromX}
        cy={points().fromY}
        r={DOT_R}
        fill="white"
        stroke={color()}
        stroke-width={sw()}
        pointer-events="none"
        style={{ transition: 'stroke 0.15s' }}
      />

      {/* Bolita destino */}
      <circle
        cx={points().toX}
        cy={points().toY}
        r={DOT_R}
        fill="white"
        stroke={color()}
        stroke-width={sw()}
        pointer-events="none"
        style={{ transition: 'stroke 0.15s' }}
      />

      {/* Crow's foot si es múltiple */}
      {crowFoot().map((d) => (
        <path
          d={d}
          stroke={color()}
          stroke-width={sw()}
          stroke-linecap="round"
          pointer-events="none"
          style={{ transition: 'stroke 0.15s' }}
        />
      ))}
    </g>
  );
}
