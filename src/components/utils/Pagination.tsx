import { Accessor, Setter, createMemo, Show } from "solid-js";
import { FilterInput } from "../../types/schema";
import { useRecordCount } from "../../hooks/useRecords";
import Button from "../ui/Button";
import WithTooltip from "../ui/tooltip/WithTooltip";

interface PaginationProps {
  tableIdentifier: string;
  filters: Accessor<FilterInput>;
  page: Accessor<number>;
  setPage: Setter<number>;
  limit: Accessor<number>;
  setLimit: Setter<number>;
}

const LIMIT_OPTIONS = [10, 20, 50, 100];

export default function Pagination(props: PaginationProps) {
  const { count: totalCount } = useRecordCount(props.tableIdentifier, props.filters);

  const totalPages = createMemo(() => {
    const total = Number(totalCount() ?? 0);
    const limit = Math.max(1, Number(props.limit()));
    return Math.max(1, Math.ceil(total / limit));
  });

  const currentPage = createMemo(() =>
    Math.min(Math.max(1, props.page()), totalPages())
  );

  const goToPage = (page: number) =>
    props.setPage(Math.min(Math.max(1, page), totalPages()));

  const changeLimit = (newLimit: number) => {
    props.setLimit(newLimit);
    props.setPage(1);
  };

  const isFirst = () => currentPage() === 1;
  const isLast = () => currentPage() === totalPages();

  return (
    <Show when={totalPages() > 1}>
      <div class="flex items-center justify-between gap-2 py-2 text-sm text-gray-600">

        {/* Navigation */}
        <div class="flex items-center gap-1">
          <WithTooltip tooltip="Primera página">
            <Button variant="ghost" size="xs" disabled={isFirst()} onClick={() => goToPage(1)}>
              «
            </Button>
          </WithTooltip>
          <WithTooltip tooltip="Página anterior">
            <Button variant="ghost" size="xs" disabled={isFirst()} onClick={() => goToPage(currentPage() - 1)}>
              ‹
            </Button>
          </WithTooltip>

          <span class="min-w-[80px] text-center text-sm tabular-nums">
            {currentPage()} <span class="text-gray-400">/</span> {totalPages()}
          </span>

          <WithTooltip tooltip="Página siguiente">
            <Button variant="ghost" size="xs" disabled={isLast()} onClick={() => goToPage(currentPage() + 1)}>
              ›
            </Button>
          </WithTooltip>
          <WithTooltip tooltip="Última página">
            <Button variant="ghost" size="xs" disabled={isLast()} onClick={() => goToPage(totalPages())}>
              »
            </Button>
          </WithTooltip>
        </div>

        {/* Total info */}
        <span class="hidden text-xs text-gray-400 sm:block">
          {totalCount()} registros
        </span>

        {/* Limit selector */}
        <div class="flex items-center gap-1.5">
          <span class="text-xs text-gray-500">Por página:</span>
          <select
            value={String(props.limit())}
            onChange={e => changeLimit(Number(e.currentTarget.value))}
            class={[
              "rounded-md border border-gray-200 bg-white px-2 py-1 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
              "cursor-pointer transition-all duration-150",
            ].join(" ")}
          >
            {LIMIT_OPTIONS.map(opt => (
              <option value={opt}>{opt}</option>
            ))}
          </select>
        </div>

      </div>
    </Show>
  );
}