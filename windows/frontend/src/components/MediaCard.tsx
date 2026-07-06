import { useNavigate } from "react-router-dom";
import type { BrowseItem } from "../lib/types";
import { browseItemToSong } from "../lib/types";
import { usePlayer } from "../store/player";
import Icon from "./Icon";
import Thumbnail from "./Thumbnail";

export default function MediaCard({ item }: { item: BrowseItem }) {
  const playSong = usePlayer((s) => s.playSong);
  const navigate = useNavigate();

  const handleClick = () => {
    const song = browseItemToSong(item);
    if ((item.type === "song" || item.type === "video") && song) {
      void playSong(song);
    } else if (item.type === "artist" && item.browseId) {
      navigate(`/artist/${item.browseId}`);
    } else if (item.type === "album" && item.browseId) {
      navigate(`/album/${item.browseId}`);
    } else if (item.playlistId || item.browseId) {
      navigate(`/playlist/${item.playlistId ?? item.browseId}`);
    } else if (song) {
      void playSong(song);
    }
  };

  const round = item.type === "artist";

  return (
    <button
      onClick={handleClick}
      className="group w-40 shrink-0 scale-100 rounded-xl p-3 text-left transition-all duration-200 ease-out hover:scale-[1.03] hover:bg-surface-container hover:elevate-2"
    >
      <div
        className={`relative mb-2 aspect-square w-full overflow-hidden bg-surface-container-high ring-1 ring-white/5 ${
          round ? "rounded-full" : "rounded-lg"
        }`}
      >
        <Thumbnail
          src={item.thumbnailUrl}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          icon={round ? "person" : "music_note"}
          iconSize={36}
          iconClassName="text-on-surface-variant/50"
        />
        {(item.type === "song" || item.type === "video") && (
          <div className="absolute inset-0 hidden items-center justify-center bg-black/40 group-hover:flex">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-black elevate-glow">
              <Icon name="play_arrow" filled size={26} />
            </div>
          </div>
        )}
      </div>
      <div className={`truncate text-[15px] font-semibold ${round ? "text-center" : ""}`}>
        {item.title}
      </div>
      {item.subtitle && (
        <div
          className={`truncate text-xs text-on-surface-variant ${round ? "text-center" : ""}`}
        >
          {item.subtitle}
        </div>
      )}
    </button>
  );
}
