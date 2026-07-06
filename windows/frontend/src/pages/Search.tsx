import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import type {
  BrowseItem,
  SearchHistoryEntry,
  SearchSection,
  Song,
} from "../lib/types";
import { browseItemToSong } from "../lib/types";
import Chip from "../components/Chip";
import Icon from "../components/Icon";
import MediaCard from "../components/MediaCard";
import SectionHeader from "../components/SectionHeader";
import SongListRow from "../components/SongListRow";

const FILTERS = [
  { value: "", label: "All" },
  { value: "songs", label: "Songs" },
  { value: "videos", label: "Videos" },
  { value: "albums", label: "Albums" },
  { value: "artists", label: "Artists" },
  { value: "community_playlists", label: "Playlists" },
];

const SECTION_FILTER: Record<string, string> = {
  Songs: "songs",
  Videos: "videos",
  Albums: "albums",
  Artists: "artists",
  "Community playlists": "community_playlists",
  Playlists: "community_playlists",
};

function songsFrom(items: BrowseItem[]): Song[] {
  return items.map(browseItemToSong).filter((s): s is Song => s !== null);
}

const GENRES: { name: string; grad: string }[] = [
  { name: "Pop", grad: "linear-gradient(135deg,#e8564a,#a02b6a)" },
  { name: "Hip-Hop", grad: "linear-gradient(135deg,#f2a04e,#8a4522)" },
  { name: "Chill", grad: "linear-gradient(135deg,#5ea9e8,#243a7a)" },
  { name: "Focus", grad: "linear-gradient(135deg,#5ee8b0,#227a5a)" },
  { name: "Workout", grad: "linear-gradient(135deg,#e85e6a,#7a2231)" },
  { name: "Rock", grad: "linear-gradient(135deg,#8a8a9a,#3a3a4a)" },
  { name: "Electronic", grad: "linear-gradient(135deg,#8a7ce8,#3a2b7a)" },
  { name: "R&B", grad: "linear-gradient(135deg,#e85ea9,#7a2255)" },
  { name: "Indie", grad: "linear-gradient(135deg,#e8c14e,#8a6a22)" },
];

export default function Search() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [filter, setFilter] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [history, setHistory] = useState<SearchHistoryEntry[]>([]);
  const [sections, setSections] = useState<SearchSection[]>([]);
  const [flatResults, setFlatResults] = useState<BrowseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<number>();
  const inputRef = useRef<HTMLInputElement>(null);

  const loadHistory = useCallback(() => {
    api.getSearchHistory().then(setHistory).catch(() => {});
  }, []);

  useEffect(loadHistory, [loadHistory]);

  // Debounced suggestions while typing
  useEffect(() => {
    window.clearTimeout(debounceRef.current);
    if (!query.trim() || query === submitted) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = window.setTimeout(() => {
      api
        .getSuggestions(query)
        .then((s) => {
          setSuggestions(s);
          setShowSuggestions(true);
        })
        .catch(() => setSuggestions([]));
    }, 300);
    return () => window.clearTimeout(debounceRef.current);
  }, [query, submitted]);

  const runSearch = useCallback(
    (q: string, f: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;
      setSubmitted(trimmed);
      setShowSuggestions(false);
      setLoading(true);
      api.addSearchHistory(trimmed).catch(() => {});
      if (!f) {
        api
          .searchSummary(trimmed)
          .then((r) => {
            setSections(r.sections);
            setFlatResults([]);
          })
          .catch(() => setSections([]))
          .finally(() => {
            setLoading(false);
            loadHistory();
          });
      } else {
        api
          .search(trimmed, f)
          .then((r) => {
            setFlatResults(r);
            setSections([]);
          })
          .catch(() => setFlatResults([]))
          .finally(() => {
            setLoading(false);
            loadHistory();
          });
      }
    },
    [loadHistory],
  );

  const submit = (q: string) => {
    setQuery(q);
    runSearch(q, filter);
  };

  const changeFilter = (f: string) => {
    setFilter(f);
    if (submitted) runSearch(submitted, f);
  };

  const idle = !submitted && !loading;

  return (
    <div className="mx-auto max-w-5xl px-9 py-9">
      {/* Search input + suggestions */}
      <div className="relative mb-4 max-w-xl">
        <div className="flex h-12 items-center gap-3 rounded-full bg-surface-container px-5 focus-within:ring-1 focus-within:ring-outline">
          <Icon name="search" size={22} className="text-on-surface-variant" />
          <input
            ref={inputRef}
            autoFocus
            spellCheck={false}
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit(query);
              if (e.key === "Escape") setShowSuggestions(false);
            }}
            onFocus={() => suggestions.length && setShowSuggestions(true)}
            onBlur={() => window.setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="Search songs, albums, artists"
            className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-on-surface-variant/60"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setSubmitted("");
                setSections([]);
                setFlatResults([]);
                inputRef.current?.focus();
              }}
              className="text-on-surface-variant hover:text-on-surface"
            >
              <Icon name="close" size={20} />
            </button>
          )}
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute inset-x-0 top-14 z-30 overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface-container-high py-1 shadow-xl">
            {suggestions.map((s) => (
              <button
                key={s}
                onMouseDown={() => submit(s)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-surface-container-highest"
              >
                <Icon name="search" size={18} className="text-on-surface-variant" />
                <span className="flex-1 truncate">{s}</span>
                <Icon
                  name="north_west"
                  size={16}
                  className="text-on-surface-variant/60"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filter chips */}
      <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <Chip
            key={f.value}
            label={f.label}
            selected={filter === f.value}
            onClick={() => changeFilter(f.value)}
          />
        ))}
      </div>

      {/* Idle: search history */}
      {idle && (
        <div className="max-w-xl">
          {history.length > 0 && (
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-on-surface-variant">
                Recent searches
              </h2>
              <button
                onClick={() => {
                  void api.clearSearchHistory().then(loadHistory);
                }}
                className="text-xs text-primary hover:underline"
              >
                Clear all
              </button>
            </div>
          )}
          {history.map((h) => (
            <div
              key={h.id}
              className="group flex h-12 items-center gap-3 rounded-lg px-2 hover:bg-surface-container"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <Icon name="history" size={18} className="text-primary" />
              </div>
              <button
                onClick={() => submit(h.query)}
                className="min-w-0 flex-1 truncate text-left text-sm"
              >
                {h.query}
              </button>
              <button
                onClick={() =>
                  void api.deleteSearchHistoryItem(h.id).then(loadHistory)
                }
                className="hidden h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high group-hover:flex"
                title="Remove"
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Idle: browse all genres */}
      {idle && (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-semibold">Browse all</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {GENRES.map((g) => (
              <button
                key={g.name}
                onClick={() => submit(g.name)}
                className="relative h-[104px] overflow-hidden rounded-xl p-4 text-left transition-transform hover:scale-[1.02]"
                style={{ background: g.grad }}
              >
                <span className="relative z-10 text-lg font-semibold text-white">
                  {g.name}
                </span>
                <div className="absolute -bottom-3.5 -right-3.5 h-[72px] w-[72px] rotate-[25deg] rounded-lg bg-black/25" />
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-3 text-on-surface-variant">
          <Icon name="progress_activity" size={20} className="animate-spin" />
          <span className="text-sm">Searching…</span>
        </div>
      )}

      {/* All: grouped sections */}
      {!loading && !filter && sections.length > 0 && (
        <div className="space-y-8">
          {sections.map((section) => {
            const sectionSongs = songsFrom(section.items);
            const isSongSection = sectionSongs.length === section.items.length;
            const mappedFilter = SECTION_FILTER[section.title];
            return (
              <section key={section.title}>
                <SectionHeader
                  title={section.title}
                  onMore={mappedFilter ? () => changeFilter(mappedFilter) : undefined}
                />
                {isSongSection ? (
                  <div className="space-y-0.5">
                    {section.items.slice(0, 5).map((item, i) => {
                      const song = browseItemToSong(item);
                      return song ? (
                        <SongListRow
                          key={`${item.videoId}-${i}`}
                          song={song}
                          queue={sectionSongs}
                        />
                      ) : null;
                    })}
                  </div>
                ) : (
                  <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
                    {section.items.map((item, i) => (
                      <MediaCard
                        key={`${item.browseId ?? item.playlistId ?? item.videoId ?? i}`}
                        item={item}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* Filtered: flat list */}
      {!loading && filter && flatResults.length > 0 && (
        <div>
          {["songs", "videos"].includes(filter) ? (
            <div className="max-w-3xl space-y-0.5">
              {flatResults.map((item, i) => {
                const song = browseItemToSong(item);
                return song ? (
                  <SongListRow
                    key={`${item.videoId}-${i}`}
                    song={song}
                    queue={songsFrom(flatResults)}
                  />
                ) : null;
              })}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {flatResults.map((item, i) => (
                <MediaCard
                  key={`${item.browseId ?? item.playlistId ?? i}`}
                  item={item}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && submitted && sections.length === 0 && flatResults.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-on-surface-variant">
          <Icon name="search_off" size={48} className="opacity-50" />
          <p className="text-sm">No results for "{submitted}"</p>
        </div>
      )}
    </div>
  );
}
