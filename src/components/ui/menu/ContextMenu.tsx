import { createSignal, JSX, Show, createEffect, onCleanup, For } from 'solid-js';
import { A } from '@solidjs/router';
import Icon from '../icon/Icon';

export interface ContextMenuItem {
  label: string;
  icon?: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  danger?: boolean;
}

export interface ContextMenuProps {
  trigger: JSX.Element;
  items: ContextMenuItem[];
  position?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
}

export default function ContextMenu(props: ContextMenuProps) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [menuRef, setMenuRef] = createSignal<HTMLDivElement>();
  const [triggerRef, setTriggerRef] = createSignal<HTMLDivElement>();

  const toggleMenu = () => setIsOpen(!isOpen());
  const closeMenu = () => setIsOpen(false);

  // Cerrar menú al hacer clic fuera
  createEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const menu = menuRef();
      const trigger = triggerRef();
      if (
        isOpen() && 
        menu && 
        !menu.contains(event.target as Node) &&
        trigger &&
        !trigger.contains(event.target as Node)
      ) {
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    onCleanup(() => document.removeEventListener('mousedown', handleClickOutside));
  });

  // Cerrar menú al presionar Escape
  createEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen()) {
        closeMenu();
      }
    };

    document.addEventListener('keydown', handleEscape);
    onCleanup(() => document.removeEventListener('keydown', handleEscape));
  });

  const positionClasses = () => {
    const vertical = props.position === 'top' ? 'bottom-full mb-2' : 
                    props.position === 'bottom' ? 'top-full mt-2' :
                    '';
    
    const horizontal = props.align === 'start' ? 'left-0' :
                      props.align === 'center' ? 'left-1/2 transform -translate-x-1/2' :
                      props.align === 'end' ? 'right-0' :
                      '';
    
    return `${vertical} ${horizontal}`;
  };

  const renderMenuItem = (item: ContextMenuItem, index: number) => {
    const baseClass = `flex items-center space-x-3 px-4 py-3 text-sm transition-colors ${
      item.disabled 
        ? 'text-gray-400 cursor-not-allowed' 
        : item.danger
        ? 'text-red-600 hover:bg-red-50'
        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
    }`;

    if (item.href) {
      return (
        <A
          href={item.href}
          class={baseClass}
          onClick={() => {
            if (item.onClick) item.onClick();
            closeMenu();
          }}
        >
          {item.icon && <Icon name={item.icon} size={16} />}
          <span>{item.label}</span>
        </A>
      );
    }

    return (
      <button
        class={`${baseClass} w-full text-left`}
        onClick={() => {
          if (!item.disabled && item.onClick) {
            item.onClick();
            closeMenu();
          }
        }}
        disabled={item.disabled}
      >
        {item.icon && <Icon name={item.icon} size={16} />}
        <span>{item.label}</span>
      </button>
    );
  };

  return (
    <div class="relative inline-block">
      <div 
        ref={setTriggerRef}
        onClick={toggleMenu}
        class="cursor-pointer"
      >
        {props.trigger}
      </div>

      <Show when={isOpen()}>
        <div
          ref={setMenuRef}
          class={`absolute z-50 min-w-[200px] bg-white rounded-lg shadow-lg border border-gray-200 py-2 ${positionClasses()}`}
        >
          <For each={props.items}>
            {(item, index) => (
              <>
                {renderMenuItem(item, index())}
                {index() < props.items.length - 1 && (
                  <div class="border-t border-gray-100 my-1" />
                )}
              </>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}