import { For, JSXElement } from "solid-js";

type SkeletonLoaderProps = {
  display?: 'item' | 'box' | 'row'; // B
  items: {
    format?: string;
    class?: string;
    repeat?: number;
  }[];
  count?: number;
}

export default function SkeletonLoader(props: SkeletonLoaderProps): JSXElement {
  return <>
    <For each={new Array(props.count ?? 1).fill('')}>
      {() => {
        switch (props.display ?? 'item') {
          case 'row': {
            return <tr class="skeleton-row">
              <For each={props.items}>
                {(item) => (
                  <td class={item.class ?? ''}>
                    <div class={'skeleton ' + item.format ? item.format?.split(' ').map(s => 'skeleton-'+s).join(' ') : ''} />
                  </td>
                )}
              </For>
            </tr>
          }
          default: {
            return <div class="skeleton-item">
              <For each={props.items}>
                {(item) => (
                  <For each={new Array(item.repeat ?? 1).fill('')}>
                    {() => (
                      <div class={item.class ?? ''}>
                        <div class={'skeleton ' + item.format ? `skeleton-${item.format}` : ''} />
                      </div>
                    )}
                  </For>
                )}
              </For>
            </div>
          }
        }
      }}
    </For>
  </>
}