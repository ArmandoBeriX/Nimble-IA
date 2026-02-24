// components/Icon/Icon.tsx
import { createMemo, JSXElement } from 'solid-js';
import { getIconDefaults } from './IconLoader';

interface IconProps {
  name: string;
  children?: JSXElement;
  size?: number | string;
  fill?: string;
  stroke?: string;
  rotate?: number;
  mirror?: boolean | 'h' | 'v' | 'vh';
  class?: string;
  style?: Record<string, string>;
  viewBox?: string;
}

export default function Icon(props: IconProps) {
  const defaults = getIconDefaults(props.name);

  const finalFill = createMemo(() => props.fill || defaults?.fill);
  const finalStroke = createMemo(() => props.stroke || defaults?.stroke);
  
  const mirror = props.mirror == true ? 'h' : props.mirror;
  const transform = createMemo(() => {
    const transforms = [];

    if (props.rotate) {
      transforms.push(`rotate(${props.rotate}deg)`);
    }

    if (mirror) {
      if (mirror.includes('h')) {
        transforms.push('scaleX(-1)');
      }
      if (mirror.includes('v')) {
        transforms.push('scaleY(-1)');
      }
    }

    return transforms.length > 0 ? transforms.join(' ') : undefined;
  });

  const iconId = `icon--${props.name}`;

  return (
    <svg
      width={props.size ?? 18}
      height={props.size ?? 18}
      class={`icon ${props.class || ''}`}
      style={{
        fill: finalFill(),
        stroke: finalStroke(),
        transform: transform(),
        ...props.style
      }}
      viewBox={props.viewBox}
      aria-hidden="true"
    > 
      {props.children ? props.children : <use href={`#${iconId}`} />}
    </svg>
  );
}