// UserMenu.tsx
import { createSignal, onCleanup, onMount, Show } from "solid-js";
import type { Component } from "solid-js";
import { UserItem } from "../../constants/table-defs";
import UserAvatar from "../../components/ui/imagen/UserAvatar";
import openProfile from "./Profile";
import RecordButtonAction from "../../components/record/RecordButtonAction";
import Icon from "../../components/ui/icon/Icon";
import Button from "../../components/ui/Button";
import { store } from "../../app";
import { renderLabelToString } from "../../components/utils/FormatInterpreter";

type UserMenuProps = {
  user: UserItem | null;
  onLogout: () => void;
  class?: string;
};

export const UserMenu: Component<UserMenuProps> = (props) => {
  const [open, setOpen] = createSignal(false);
  let menuRef: HTMLDivElement | undefined;
  let buttonRef: HTMLButtonElement | undefined;

  const toggle = () => setOpen((v) => !v);
  const close = () => setOpen(false);

  function handleOutside(e: MouseEvent) {
    if (!menuRef || !buttonRef) return;
    const target = e.target as Node;
    if (menuRef.contains(target) || buttonRef.contains(target)) return;
    close();
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === "Escape") close();
  }

  function userName(user: UserItem) {
    const table = store.getTable('users')!
    return renderLabelToString(table.formatSelected, user)
  }

  onMount(() => {
    document.addEventListener("click", handleOutside);
    document.addEventListener("keydown", handleKey);
  });

  onCleanup(() => {
    document.removeEventListener("click", handleOutside);
    document.removeEventListener("keydown", handleKey);
  });

  return (
    <Show when={props.user}>
      <div class={`relative inline-flex items-center gap-3 ${props.class ?? ""}`}>
        {/* Avatar + basic info button */}
        <button
          ref={buttonRef}
          aria-haspopup="true"
          aria-expanded={open()}
          class="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          onClick={toggle}
        >
          <div class="relative">
            <UserAvatar user={props.user!} size="sm" />
            <span class="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border-2 border-white"></span>
          </div>

          <div class="hidden md:flex flex-col items-start leading-tight min-w-0">
            <span class="text-sm font-semibold text-gray-900 truncate max-w-[160px]">
              {userName(props.user!)}
            </span>

            <span class="text-[11px] text-gray-500 truncate max-w-[180px]">
              {props.user!.email}
            </span>
          </div>

          <svg class="w-4 h-4 ml-1 text-gray-500 hidden md:inline" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clip-rule="evenodd" />
          </svg>
        </button>

        {/* Optional quick logout button for small screens (like en tu code original) */}
        <div class="md:hidden">
          <button
            class="border rounded-md px-2 py-1 text-sm"
            onClick={() => {
              props.onLogout();
              close();
            }}
          >
            Cerrar sesión
          </button>
        </div>

        {/* Context menu */}
        <div
          ref={menuRef}
          role="menu"
          aria-orientation="vertical"
          aria-label="User menu"
          class={`origin-top-right absolute right-0 top-full mt-1 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-[60] transform transition-all ${open() ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
            }`}
        >
          <div class="py-2">
            <RecordButtonAction action="show" tableIdentifier="users" id={props.user?.id}
              buttonProps={{ size: "sm", shape: "square", fullWidth: true, onClick: close }}>
              <span class="w-full text-left flex items-center gap-2">
                <Icon name="user" /> Perfil
              </span>
            </RecordButtonAction>

            <Button variant="ghost" size="sm" shape="square" fullWidth={true} onClick={() => {
              window.location.href = "/preferences";
              close();
            }}>
              <span class="w-full text-left flex items-center gap-2">
                <Icon name="fav" /> Preferencias
              </span>
            </Button>

            <Show when={props.user?.isAdmin}>
              <Button variant="ghost" size="sm" shape="square" fullWidth={true} onClick={() => {
                window.location.href = "/admin";
                close();
              }}>
                <span class="w-full text-left flex items-center gap-2">
                  <Icon name="settings" /> Administración
                </span>
              </Button>
            </Show>

            <div class="border-t my-1"></div>

            <Button variant="ghost" size="sm" shape="square" fullWidth={true} onClick={() => {
              props.onLogout();
              close();
            }}>
              <span class="w-full text-left flex items-center gap-2 text-red-800">
                <Icon name="arrow-right" stroke="currentColor" /> Cerrar sesión
              </span>
            </Button>
          </div>
        </div>
      </div>
    </Show>
  );
};

export default UserMenu;