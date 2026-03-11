// UserAvatar.tsx
import { createMemo } from "solid-js";
import type { Component } from "solid-js";

export type UserItem = {
  id?: string | number;
  username?: string | null;
  email?: string | null;
  avatarUrl?: string | null; // opcional, si lo tienes puede preferirse
  isAdmin?: boolean;
};

type UserAvatarProps = {
  user: UserItem;
  size?: "sm" | "md" | "lg";
  class?: string;
};

const sizeMap = {
  sm: { px: 8, text: "text-sm" }, // 32px
  md: { px: 10, text: "text-base" }, // 40px
  lg: { px: 14, text: "text-lg" }, // 56px
};

function initialsFrom(user: UserItem) {
  const name = user.username || user.email || "";
  if (!name) return "?";
  // intentar username, si no usar parte antes de @
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  if (name.includes("@")) return name.split("@")[0].slice(0, 2).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function stringToHue(str = "") {
  // hash simple para determinismo
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h) % 360;
}

const UserAvatar: Component<UserAvatarProps> = (props) => {
  const size = props.size ?? "md";
  const pxClass = createMemo(() => {
    const s = sizeMap[size];
    return `inline-flex items-center justify-center rounded-full w-[${s.px}px] h-[${s.px}px] ${s.text}`;
  });

  const initials = createMemo(() => initialsFrom(props.user));
  const hue = createMemo(() => stringToHue((props.user.email || props.user.username) ?? ""));

  // si viene avatarUrl, lo usamos; si no, renderizamos circle con iniciales
  return (
    <div class={`select-none ${props.class ?? ""}`}>
      {props.user?.avatarUrl ? (
        <img
          src={props.user.avatarUrl}
          alt={props.user.username ?? props.user.email ?? "User avatar"}
          class={`rounded-full object-cover ${size === "sm" ? "w-8 h-8" : size === "md" ? "w-10 h-10" : "w-14 h-14"}`}
          onError={(e) => {
            // fallback a iniciales si la imagen falla
            (e.currentTarget as HTMLImageElement).style.display = "none";
            const parent = e.currentTarget.parentElement;
            if (parent) parent.querySelector(".avatar-fallback")?.classList.remove("hidden");
          }}
        />
      ) : null}

      {/* fallback initials (hidden only if avatarUrl exists and loaded) */}
      <div
        class={`avatar-fallback ${props.user?.avatarUrl ? "hidden" : ""} rounded-full flex items-center justify-center font-semibold text-white`}
        style={{
          width: size === "sm" ? "32px" : size === "md" ? "40px" : "56px",
          height: size === "sm" ? "32px" : size === "md" ? "40px" : "56px",
          "background-color": `hsl(${hue()}, 70%, 40%)`,
        }}
        aria-hidden="true"
      >
        <span class="text-sm md:text-base lg:text-lg">{initials()}</span>
      </div>
    </div>
  );
};

export default UserAvatar;