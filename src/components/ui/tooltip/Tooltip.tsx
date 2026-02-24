// src/components/ui/tooltip/WithTooltip.tsx
import Tooltip from '@corvu/tooltip';
import type { JSX } from 'solid-js';
import type { Placement } from '@floating-ui/dom';

type WithTooltipProps = {
  children: JSX.Element;
  tooltip: JSX.Element | string;
  openDelay?: number;
  closeDelay?: number;
  contentClass?: string;
  placement?: Placement;
  hoverableContent?: boolean;
  ariaId?: string;
  forceMount?: boolean;
  tooltipClass?: string;
};

export default function WithTooltip(props: WithTooltipProps) {
  if (!props.tooltip) return <>{props.children}</>;
  const tooltipClass = props.tooltipClass ?? "rounded-md bg-gray-900 px-3 py-2 text-sm text-gray-100 shadow-lg leading-snug"
  return (
    <Tooltip
      placement={props.placement ?? 'top'}
      openDelay={props.openDelay ?? 300}
      closeDelay={props.closeDelay ?? 50}
      hoverableContent={props.hoverableContent ?? false}
      tooltipId={props.ariaId}
    >
      {/* Trigger neutro para evitar anidar botones/links */}
      <Tooltip.Trigger as='div' class={props.contentClass ?? "inline-block"}>
        {props.children}
      </Tooltip.Trigger>

      <Tooltip.Portal>
        <Tooltip.Content
          as="div"
          forceMount={props.forceMount}
          class="z-50 max-w-xs"
        >
          {/* {typeof props.tooltip === 'string' ? ( */}
            <div
              class={tooltipClass}
            >
              {props.tooltip}
            </div>
          {/* ) : (
            props.tooltip
          )} */}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip>
  );
}
