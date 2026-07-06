import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import Icon from "./Icon";
import { api } from "../lib/api";
import type { LocalPlaylist } from "../lib/types";

const links = [
  { to: "/", label: "Home", icon: "home", end: true },
  { to: "/search", label: "Search", icon: "search", end: false },
  { to: "/library", label: "Your Library", icon: "library_music", end: false },
  { to: "/liked", label: "Liked Songs", icon: "favorite", end: false },
  { to: "/history", label: "History", icon: "history", end: false },
];

export default function Sidebar() {
  const [playlists, setPlaylists] = useState<LocalPlaylist[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.getPlaylists().then(setPlaylists).catch(() => {});
  }, []);

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-white/5 bg-black/40 backdrop-blur-2xl">
      <div
        className="cursor-pointer px-6 pb-6 pt-6"
        onClick={() => navigate("/")}
      >
        <div className="text-2xl font-bold tracking-[0.14em] text-on-surface">
          AMPHION
        </div>
        <div className="mt-1.5 text-[10.5px] uppercase tracking-[0.24em] text-on-surface-variant/70">
          Music, uncompromised
        </div>
      </div>

      <nav className="flex flex-col gap-0.5 px-3">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `flex items-center gap-3.5 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary/12 text-on-surface"
                  : "text-on-surface-variant hover:text-on-surface"
              }`
            }
            style={({ isActive }) =>
              isActive
                ? { borderLeft: "3px solid var(--color-primary)", paddingLeft: 9 }
                : { borderLeft: "3px solid transparent", paddingLeft: 9 }
            }
          >
            {({ isActive }) => (
              <>
                <Icon name={link.icon} filled={isActive} size={19} />
                {link.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mx-6 my-4 h-px bg-outline-variant" />

      <div className="px-6 text-[11px] font-medium uppercase tracking-wider text-on-surface-variant/70">
        Your Playlists
      </div>
      <div className="mt-3 flex flex-1 flex-col gap-px overflow-y-auto px-3">
        {playlists.map((p) => (
          <button
            key={p.id}
            onClick={() => navigate(`/library?playlist=${p.id}`)}
            className="truncate rounded-md px-3 py-2 text-left text-[13.5px] text-on-surface-variant hover:text-on-surface"
          >
            {p.name}
          </button>
        ))}
        {playlists.length === 0 && (
          <div className="px-3 py-1 text-xs text-on-surface-variant/50">
            No playlists yet
          </div>
        )}
      </div>

      <NavLink
        to="/settings"
        className="mt-2 flex items-center gap-3 border-t border-outline-variant px-5 py-3.5 hover:bg-white/[0.03]"
      >
        {({ isActive }) => (
          <>
            <img
              src="/logo-mark.png"
              alt=""
              className="h-9 w-9 shrink-0 rounded-full object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-medium text-on-surface">
                Amphion
              </div>
              <div className="text-[11px] text-on-surface-variant/70">
                Local library
              </div>
            </div>
            <Icon
              name="settings"
              size={18}
              className={isActive ? "text-primary" : "text-on-surface-variant"}
            />
          </>
        )}
      </NavLink>
    </aside>
  );
}
