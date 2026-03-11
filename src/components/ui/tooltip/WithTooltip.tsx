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
  const tooltipClass = props.tooltipClass ?? "rounded-md bg-gray-900 px-3 py-2 text-sm text-gray-100 opacity-90 shadow-lg leading-snug"
  return (
    <Tooltip
      placement={props.placement ?? 'top'}
      openDelay={props.openDelay ?? 400}
      closeDelay={props.closeDelay ?? 100}
      hoverableContent={props.hoverableContent ?? true}
      tooltipId={props.ariaId}
    >
      {/* Trigger neutro para evitar anidar botones/links */}
      <Tooltip.Trigger as='div' class={"inline-block " + (props.contentClass ?? "")}>
        {props.children}
      </Tooltip.Trigger>

      <Tooltip.Portal>
        <Tooltip.Content
          as="div"
          forceMount={props.forceMount}
          class="z-5000 max-w-xs"
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
