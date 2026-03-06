import { Accessor, Setter, createMemo, Show } from "solid-js";
import { FilterInput } from "../../types/schema";
import { useRecordCount } from "../../hooks/useRecords";

export default function Pagination(props: {
  tableIdentifier: string;
  filters: Accessor<FilterInput>;

  page: Accessor<number>;
  setPage: Setter<number>;

  limit: Accessor<number>;
  setLimit: Setter<number>;
}) {
  const { count: totalCount } = useRecordCount(
    props.tableIdentifier,
    props.filters
  );

  const totalPages = createMemo(() => {
    const total = Number(totalCount() ?? 0);
    const limit = Math.max(1, Number(props.limit()));
    return Math.max(1, Math.ceil(total / limit));
  });

  const currentPage = createMemo(() =>
    Math.min(Math.max(1, props.page()), totalPages())
  );

  const goToPage = (page: number) => {
    props.setPage(Math.min(Math.max(1, page), totalPages()));
  };

  const changeLimit = (newLimit: number) => {
    props.setLimit(newLimit);
    props.setPage(1); // reset lógico
  };

  const limitOptions = [10, 20, 50, 100];

  return (
    <Show when={totalPages() > 1}>
      <div
        class="pagination"
        style={{
          display: "flex",
          gap: "8px",
          "align-items": "center",
          padding: "8px 0",
          "justify-content": "space-between"
        }}
      >
        <style>{`
          .pag-btn {
            padding: 6px 10px;
            border: 1px solid #ccc;
            background: #fff;
            border-radius: 6px;
            cursor: pointer;
          }
          .pag-btn:disabled {
            opacity: 0.5;
            cursor: default;
          }
          .limit-select {
            padding: 6px 10px;
            border-radius: 6px;
            border: 1px solid #ccc;
          }
        `}</style>

        {/* Navegación */}
        <div style={{ display: "flex", gap: "6px", "align-items": "center" }}>
          <button
            class="pag-btn"
            disabled={currentPage() === 1}
            onClick={() => goToPage(1)}
          >
            «
          </button>

          <button
            class="pag-btn"
            disabled={currentPage() === 1}
            onClick={() => goToPage(currentPage() - 1)}
          >
            ‹
          </button>

          <div style={{ padding: "6px 10px", "min-width": "80px", "text-align": "center" }}>
            {currentPage()} / {totalPages()}
          </div>

          <button
            class="pag-btn"
            disabled={currentPage() === totalPages()}
            onClick={() => goToPage(currentPage() + 1)}
          >
            ›
          </button>

          <button
            class="pag-btn"
            disabled={currentPage() === totalPages()}
            onClick={() => goToPage(totalPages())}
          >
            »
          </button>
        </div>

        {/* Selector de límite */}
        <div style={{ display: "flex", gap: "6px", "align-items": "center" }}>
          <span style={{ "font-size": "13px" }}>Items:</span>
          <select
            class="limit-select"
            value={String(props.limit())}
            onChange={e => changeLimit(Number(e.currentTarget.value))}
          >
            {limitOptions.map(opt => (
              <option value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>
    </Show>
  );
}
