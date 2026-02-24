// TimeAgo.tsx
import { createSignal, onCleanup, onMount } from "solid-js";

/**
 * formatTimeAgo:
 *  - acepta Date | string | number
 *  - si number -> lo interpretamos como segundos (no ms)
 *  - devuelve texto en español; si <5s => "justo ahora"; si <60s => "hace X segundos"
 */

export function formatTimeAgo(dateLike: string | number | Date | undefined | null): string {
  if (!dateLike && dateLike !== 0) return "";
  let d: Date;
  if (typeof dateLike === "number") {
    // asumimos que el número representa segundos (coincide con evaluateExpression que usa segundos)
    d = new Date(dateLike * 1000);
  } else {
    d = new Date(dateLike as any);
  }
  if (Number.isNaN(d.getTime())) return String(dateLike);

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 5) return "justo ahora";
  if (diffSec < 60) return `hace ${diffSec} ${diffSec === 1 ? "segundo" : "segundos"}`;
  if (diffMin === 1) return "hace 1 minuto";
  if (diffMin < 60) return `hace ${diffMin} minutos`;
  if (diffHour === 1) return "hace 1 hora";
  if (diffHour < 24) return `hace ${diffHour} horas`;
  if (diffDay === 1) return "hace 1 día";
  if (diffDay < 7) return `hace ${diffDay} días`;
  if (diffWeek < 5) return `hace ${diffWeek} ${diffWeek === 1 ? "semana" : "semanas"}`;
  if (diffMonth < 12) return `hace ${diffMonth} ${diffMonth === 1 ? "mes" : "meses"}`;
  return diffYear === 1 ? "hace 1 año" : `hace ${diffYear} años`;
}

export default function TimeAgo(props: { date: string | number | Date }) {
  const [label, setLabel] = createSignal(formatTimeAgo(props.date));
  let intervalId: number | undefined;

  const tick = () => {
    setLabel(formatTimeAgo(props.date));
  };

  onMount(() => {
    // actualizar cada segundo si la fecha está a menos de 1 minuto para mostrar segundos,
    // sino cada 60s es suficiente
    const d = typeof props.date === "number" ? new Date((props.date as number) * 1000) : new Date(props.date as any);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
    const interval = diffSec < 60 ? 1000 : 60 * 1000;
    intervalId = window.setInterval(tick, interval);
  });

  onCleanup(() => {
    if (intervalId) window.clearInterval(intervalId);
  });

  return <span>{label()}</span>;
}
