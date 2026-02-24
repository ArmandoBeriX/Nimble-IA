// src/pages/admin/schema/EntityRelation.tsx
import { TableDef } from '../../../types/schema';

interface EntityRelationProps {
  from: TableDef;
  to: TableDef;
  fieldName: string;
}

export default function EntityRelation(props: EntityRelationProps) {
  // Calcular posiciones de inicio y fin (centro superior de cada nodo)
  const getConnectionPoints = () => {
    const fromX = (props.from.posx || 0) + 120; // ancho del nodo 240/2
    const fromY = (props.from.posy || 0) + 24;  // altura del header ~48/2? mejor usar offset fijo
    const toX = (props.to.posx || 0) + 120;
    const toY = (props.to.posy || 0) + 24;

    return { fromX, fromY, toX, toY };
  };

  const points = getConnectionPoints();

  // Punto medio para el label
  const midX = (points.fromX + points.toX) / 2;
  const midY = (points.fromY + points.toY) / 2;

  // Crear path con una pequeña curva para mejor visualización
  const createPath = () => {
    const dx = points.toX - points.fromX;
    const dy = points.toY - points.fromY;
    
    // Si los nodos están muy separados, usar curva suave
    const offset = Math.min(60, Math.abs(dx) * 0.2);
    const ctrl1X = points.fromX + dx * 0.25;
    const ctrl1Y = points.fromY;
    const ctrl2X = points.toX - dx * 0.25;
    const ctrl2Y = points.toY;

    return `M ${points.fromX} ${points.fromY} C ${ctrl1X} ${ctrl1Y}, ${ctrl2X} ${ctrl2Y}, ${points.toX} ${points.toY}`;
  };

  return (
    <g>
      {/* Línea de relación (curva) */}
      <path
        d={createPath()}
        stroke="#6B7280"
        stroke-width="1.5"
        fill="none"
        marker-end="url(#arrowhead)"
        class="transition-all duration-200"
      />
      
      {/* Línea de fondo para hover más fácil */}
      <path
        d={createPath()}
        stroke="transparent"
        stroke-width="10"
        fill="none"
        class="cursor-pointer hover:stroke-blue-200 transition-all duration-200"
      >
        <title>{props.fieldName}</title>
      </path>

      {/* Label con el nombre del campo */}
      <g transform={`translate(${midX}, ${midY})`}>
        <rect
          x="-32"
          y="-10"
          width="64"
          height="20"
          rx="4"
          fill="white"
          stroke="#6B7280"
          stroke-width="1"
          class="drop-shadow-sm"
        />
        <text
          x="0"
          y="4"
          text-anchor="middle"
          class="text-[10px] fill-gray-700 font-medium select-none"
        >
          {props.fieldName.length > 12 ? props.fieldName.substring(0, 10) + '…' : props.fieldName}
        </text>
      </g>
    </g>
  );
}