import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import type { ArtistPage, Song } from "../lib/types";
import { browseItemToSong } from "../lib/types";
import { hqThumbnail } from "../lib/image";
import Icon from "../components/Icon";
import MediaCard from "../components/MediaCard";
import SectionHeader from "../components/SectionHeader";
import SongListRow from "../components/SongListRow";
import Thumbnail from "../components/Thumbnail";
import { usePlayer } from "../store/player";

export default function Artist() {
  const { id } = useParams<{ id: string }>();
  const [artist, setArtist] = useState<ArtistPage | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const playSong = usePlayer((s) => s.playSong);

  useEffect(() => {
    if (!id) return;
    setStatus("loading");
    setArtist(null);
    api
      .getArtist(id)
      .then((a) => {
        setArtist(a);
        setStatus("ok");
      })
      .catch(() => setStatus("error"));
  }, [id]);

  if (status === "loading")
    return (
      <div className="flex items-center gap-3 px-9 py-9 text-on-surface-variant">
        <Icon name="progress_activity" size={20} className="animate-spin" />
        <span className="text-sm">Loading artist…</span>
      </div>
    );
  if (status === "error" || !artist)
    return (
      <p className="px-9 py-9 text-on-surface-variant">Couldn't load this artist.</p>
    );

  const songSection = artist.sections.find((s) => s.title === "Songs");
  const topSongs: Song[] = (songSection?.items ?? [])
    .map(browseItemToSong)
    .filter((s): s is Song => s !== null);

  return (
    <div>
      <div
        className="flex items-center gap-6 px-9 pb-7 pt-11"
        style={{
          background:
            "linear-gradient(160deg,#3a2f6e 0%,#221d3f 55%,#0d0d0d 100%)",
        }}
      >
        <div className="h-40 w-40 shrink-0 overflow-hidden rounded-full bg-surface-container-high elevate-2">
          <Thumbnail
            src={hqThumbnail(artist.thumbnailUrl)}
            className="h-full w-full object-cover"
            icon="person"
            iconSize={48}
            iconClassName="text-white/40"
          />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-5xl font-bold text-white">{artist.title}</h1>
          {artist.description && (
            <p className="mt-2 line-clamp-2 max-w-2xl text-sm text-white/70">
              {artist.description}
            </p>
          )}
          {topSongs.length > 0 && (
            <button
              onClick={() => void playSong(topSongs[0], topSongs)}
              className="mt-4 flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-on-primary elevate-glow transition-transform hover:scale-105"
            >
              <Icon name="play_arrow" filled size={20} />
              Play
            </button>
          )}
        </div>
      </div>

      <div className="space-y-8 px-9 pb-10 pt-6">
        {artist.sections.map((section) =>
          section.title === "Songs" ? (
            <section key={section.title}>
              <SectionHeader title="Songs" />
              <div className="max-w-3xl space-y-0.5">
                {topSongs.slice(0, 5).map((song) => (
                  <SongListRow key={song.videoId} song={song} queue={topSongs} />
                ))}
              </div>
            </section>
          ) : (
            <section key={section.title}>
              <SectionHeader title={section.title} />
              <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
                {section.items.map((item, i) => (
                  <MediaCard
                    key={`${item.browseId ?? item.videoId ?? i}`}
                    item={item}
                  />
                ))}
              </div>
            </section>
          ),
        )}
      </div>
    </div>
  );
}
