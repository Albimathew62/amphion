import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { HistoryItem } from "../lib/types";
import Icon from "../components/Icon";
import SongListRow from "../components/SongListRow";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function History() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api
      .getHistory()
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const queue = items.map((i) => i.song);

  return (
    <div className="mx-auto max-w-4xl px-9 py-9">
      <h1 className="mb-1 text-2xl font-bold">History</h1>
      <p className="mb-6 text-sm text-on-surface-variant">
        Everything you've played recently
      </p>
      {loaded && items.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-on-surface-variant">
          <Icon name="history" size={48} className="opacity-40" />
          <p className="text-sm">Nothing played yet.</p>
        </div>
      )}
      <div className="space-y-0.5">
        {items.map((item, i) => (
          <SongListRow
            key={`${item.song.videoId}-${i}`}
            song={item.song}
            queue={queue}
            trailing={timeAgo(item.playedAt)}
          />
        ))}
      </div>
    </div>
  );
}
