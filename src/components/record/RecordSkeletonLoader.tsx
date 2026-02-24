import { JSXElement, For } from "solid-js";
import { store } from "../../app";
import type { TableField } from "../../types/schema";
import "./record-skeleton.css";

export default function RecordSkeletonLoader(props: {
  tableIdentifier: string;
}): JSXElement {
  const fields: TableField[] = store.getTableFieldsFor(props.tableIdentifier) || [];

  return (
    <div class="skeleton-container field-form">
      <For each={fields}>
        {(field) => {
          const t = field.fieldFormat;
          return (
            <div class="form-group skeleton-form-group field-{t}">
              {/* <label class="field-label skeleton-label">{field.name || field.identifier}</label> */}
              <label class="field-label">{field.name || field.identifier}</label>
              <div class="input-container">
                {t === "text" ? (
                  <div class="skeleton-textarea" />
                ) : t === "attachment" ? (
                  <div class="skeleton-attachment">
                    <div class="skeleton-attach-row">
                      <div class="skeleton-btn small" />
                      <div class="skeleton-btn small" />
                      <div class="skeleton-meta" />
                    </div>
                    <div class="skeleton-attach-actions">
                      <div class="skeleton-btn" />
                      <div class="skeleton-btn" />
                    </div>
                  </div>
                ) : t === "date" || t === "datetime" || t === "time" ? (
                  <div class="skeleton-input short" />
                ) : t === "bool" ? (
                  <div class="skeleton-switch" />
                ) : t === "relation" || t === "list" ? (
                  <div class="skeleton-select" />
                ) : t === "int" || t === "float" ? (
                  <div style={{ display: "flex", gap: "8px", "align-items": "center" }}>
                    <div class="skeleton-input" style={{ "flex": "1" }} />
                    <div class="skeleton-range" />
                  </div>
                ) : (
                  // default string / input
                  <div class="skeleton-input" />
                )}
              </div>
            </div>
          );
        }}
      </For>
    </div>
  );
}
