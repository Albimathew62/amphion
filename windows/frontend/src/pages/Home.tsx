import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { BrowseItem, HomeSection, Song } from "../lib/types";
import { browseItemToSong } from "../lib/types";
import CompactTrackCard from "../components/CompactTrackCard";
import Icon from "../components/Icon";
import MediaCard from "../components/MediaCard";
import SectionHeader from "../components/SectionHeader";

// A section renders as a compact track grid only when every item is a
// playable song/video (has a videoId) — albums/artists/playlists keep the
// large-square carousel below.
function songsFrom(items: BrowseItem[]): Song[] | null {
  const songs = items.map(browseItemToSong);
  return songs.every((s): s is Song => s !== null) ? (songs as Song[]) : null;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function songToItem(s: Song): BrowseItem {
  return {
    type: "song",
    videoId: s.videoId,
    title: s.title,
    subtitle: s.artist,
    thumbnailUrl: s.thumbnailUrl,
    duration: s.duration,
  };
}

function SkeletonRow() {
  return (
    <div className="mb-8">
      <div className="mb-3 h-6 w-48 animate-pulse rounded bg-surface-container-high" />
      <div className="flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="w-36 shrink-0 p-2.5">
            <div className="mb-2 aspect-square animate-pulse rounded-lg bg-surface-container-high" />
            <div className="h-3.5 w-24 animate-pulse rounded bg-surface-container-high" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [recent, setRecent] = useState<BrowseItem[]>([]);
  const [recommended, setRecommended] = useState<Song[]>([]);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    api
      .getHome()
      .then((s) => {
        setSections(s);
        setStatus("ok");
      })
      .catch(() => setStatus("error"));
    api
      .getHistory(20)
      .then((h) => {
        const seen = new Set<string>();
        const items: BrowseItem[] = [];
        for (const it of h) {
          if (seen.has(it.song.videoId)) continue;
          seen.add(it.song.videoId);
          items.push(songToItem(it.song));
          if (items.length >= 10) break;
        }
        setRecent(items);

        // "Recommended for you": real radio/similar-tracks data seeded from
        // the most recently played song (the anonymous home feed itself
        // only returns playlist/album shelves, no song-only sections).
        const seed = h[0]?.song;
        if (seed) {
          api
            .getRadioQueue(seed.videoId)
            .then((r) =>
              setRecommended(r.items.filter((s) => s.videoId !== seed.videoId).slice(0, 9)),
            )
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-9 py-9">
      <div className="mb-8 flex items-baseline justify-between">
        <h1 className="text-[30px] font-semibold tracking-tight">{greeting()}</h1>
      </div>

      {status === "loading" && (
        <>
          <SkeletonRow />
          <SkeletonRow />
        </>
      )}
      {status === "error" && (
        <div className="flex flex-col items-center gap-3 py-16 text-on-surface-variant">
          <Icon name="cloud_off" size={48} className="opacity-50" />
          <p className="text-sm">
            Couldn't load your feed. Is the backend running on port 8000?
          </p>
        </div>
      )}

      {recent.length > 0 && (
        <section className="mb-8">
          <SectionHeader title="Recently played" />
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
            {recent.map((item, j) => (
              <MediaCard key={`recent-${item.videoId}-${j}`} item={item} />
            ))}
          </div>
        </section>
      )}

      {recommended.length > 0 && (
        <section className="mb-8">
          <SectionHeader title="Recommended for you" />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {recommended.map((song, j) => (
              <CompactTrackCard key={`${song.videoId}-${j}`} song={song} queue={recommended} />
            ))}
          </div>
        </section>
      )}

      <div className="space-y-8">
        {sections.map((section, i) => {
          const songs = songsFrom(section.items);
          return (
            <section key={i}>
              <SectionHeader title={section.title} />
              {songs ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {songs.map((song, j) => (
                    <CompactTrackCard key={`${song.videoId}-${j}`} song={song} queue={songs} />
                  ))}
                </div>
              ) : (
                <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
                  {section.items.map((item, j) => (
                    <MediaCard
                      key={`${item.videoId ?? item.browseId ?? item.playlistId ?? j}`}
                      item={item}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
