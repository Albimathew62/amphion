import { useRef, useState } from "react";
import { api } from "../lib/api";
import type { AppSettings, CsvImportResult } from "../lib/types";
import Icon from "../components/Icon";
import { ACCENTS, useSettings } from "../store/settings";

const QUALITIES: { value: AppSettings["audioQuality"]; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "low", label: "Normal" },
  { value: "high", label: "High" },
  { value: "highest", label: "Very High" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3.5 text-xs font-semibold uppercase tracking-[0.1em] text-primary">
        {title}
      </h2>
      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl">
        {children}
      </div>
    </section>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="relative h-6 w-[42px] shrink-0 rounded-full transition-colors"
      style={{ background: on ? "var(--color-primary)" : "#333" }}
    >
      <span
        className="absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white transition-all"
        style={{ left: on ? 21 : 3 }}
      />
    </button>
  );
}

function ToggleRow({
  label,
  desc,
  on,
  onToggle,
  last,
}: {
  label: string;
  desc: string;
  on: boolean;
  onToggle: () => void;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between px-[18px] py-[15px] ${last ? "" : "border-b border-outline-variant"}`}
    >
      <div>
        <div className="text-sm text-on-surface">{label}</div>
        <div className="mt-0.5 text-xs text-on-surface-variant/70">{desc}</div>
      </div>
      <Toggle on={on} onClick={onToggle} />
    </div>
  );
}

export default function Settings() {
  const s = useSettings();
  const [importUrl, setImportUrl] = useState("");
  const [importState, setImportState] = useState<"idle" | "importing" | "done" | "error">(
    "idle",
  );
  const [importMessage, setImportMessage] = useState("");
  const [historyCleared, setHistoryCleared] = useState(false);

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvName, setCsvName] = useState("");
  const [csvState, setCsvState] = useState<"idle" | "importing" | "done" | "error">("idle");
  const [csvMessage, setCsvMessage] = useState("");
  const [csvResult, setCsvResult] = useState<CsvImportResult | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const runImport = async () => {
    if (!importUrl.trim()) return;
    setImportState("importing");
    setImportMessage("");
    try {
      const result = await api.importPlaylist(importUrl.trim());
      setImportState("done");
      setImportMessage(`Imported "${result.name}" (${result.songCount} songs)`);
      setImportUrl("");
    } catch (e) {
      setImportState("error");
      setImportMessage(
        e instanceof Error && e.message.includes("502")
          ? "Couldn't fetch that playlist. Some curated playlists need login."
          : "Import failed. Check the URL and try again.",
      );
    }
  };

  const pickCsvFile = (file: File | null) => {
    setCsvFile(file);
    setCsvResult(null);
    setCsvState("idle");
    if (file) setCsvName(file.name.replace(/\.csv$/i, ""));
  };

  const runCsvImport = async () => {
    if (!csvFile || !csvName.trim()) return;
    setCsvState("importing");
    setCsvMessage("");
    setCsvResult(null);
    try {
      const result = await api.importPlaylistCsv(csvFile, csvName.trim());
      setCsvState("done");
      setCsvResult(result);
      setCsvMessage(`Imported ${result.success} of ${result.total} into "${result.playlist.name}"`);
      setCsvFile(null);
      setCsvName("");
      if (csvInputRef.current) csvInputRef.current.value = "";
    } catch {
      setCsvState("error");
      setCsvMessage("Import failed. Check the file and try again.");
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-9 py-9">
      <h1 className="mb-8 text-2xl font-bold">Settings</h1>

      <Section title="Account">
        <div className="flex items-center gap-4 p-4">
          <img src="/logo-mark.png" alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
          <div className="flex-1">
            <div className="text-[15px] font-medium text-on-surface">Amphion</div>
            <div className="text-xs text-on-surface-variant/70">
              Local library · unauthenticated
            </div>
          </div>
        </div>
      </Section>

      <Section title="Playback">
        <ToggleRow
          label="Crossfade"
          desc="Blend the end of one track into the next"
          on={s.crossfade}
          onToggle={() => s.setCrossfade(!s.crossfade)}
        />
        {s.crossfade && (
          <div className="flex items-center gap-3 border-b border-outline-variant px-[18px] py-[15px]">
            <span className="w-24 text-sm text-on-surface-variant">Duration</span>
            <input
              type="range"
              min={1}
              max={12}
              step={1}
              value={s.crossfadeSec}
              onChange={(e) => s.setCrossfadeSec(Number(e.target.value))}
              className="flex-1"
            />
            <span className="w-10 text-right text-sm tabular-nums text-on-surface">
              {s.crossfadeSec}s
            </span>
          </div>
        )}
        <ToggleRow
          label="Gapless playback"
          desc="No silence between tracks"
          on={s.gapless}
          onToggle={() => s.setGapless(!s.gapless)}
        />
        <ToggleRow
          label="Autoplay"
          desc="Fill an up-next queue with similar songs (radio)"
          on={s.autoplay}
          onToggle={() => s.setAutoplay(!s.autoplay)}
        />
        <ToggleRow
          label="Normalize volume"
          desc="Level loud tracks toward a consistent loudness"
          on={s.normalize}
          onToggle={() => s.setNormalize(!s.normalize)}
          last
        />
      </Section>

      <Section title="Audio quality">
        <div className="flex items-center justify-between p-[18px]">
          <div>
            <div className="text-sm text-on-surface">Streaming quality</div>
            <div className="mt-0.5 text-xs text-on-surface-variant/70">
              Higher quality uses more data
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUALITIES.map((q) => (
              <button
                key={q.value}
                onClick={() => s.setAudioQuality(q.value)}
                className={`rounded-lg px-3 py-[7px] text-[12.5px] font-medium ${
                  s.audioQuality === q.value
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-highest text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section title="Library">
        <div className="p-4">
          <div className="mb-1 text-sm font-medium text-on-surface">Import playlist</div>
          <p className="mb-3 text-xs text-on-surface-variant/70">
            Paste a YouTube Music playlist link to save it into your library.
          </p>
          <div className="flex gap-2">
            <input
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void runImport()}
              placeholder="https://music.youtube.com/playlist?list=…"
              className="h-10 min-w-0 flex-1 rounded-full bg-surface-container-highest px-4 text-sm outline-none placeholder:text-on-surface-variant/50 focus:ring-1 focus:ring-outline"
            />
            <button
              onClick={() => void runImport()}
              disabled={importState === "importing" || !importUrl.trim()}
              className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-on-primary disabled:opacity-40"
            >
              {importState === "importing" ? (
                <Icon name="progress_activity" size={18} className="animate-spin" />
              ) : (
                <Icon name="playlist_add" size={18} />
              )}
              Import
            </button>
          </div>
          {importMessage && (
            <p
              className={`mt-2 text-xs ${importState === "error" ? "text-error" : "text-primary"}`}
            >
              {importMessage}
            </p>
          )}

          <div className="my-4 h-px bg-outline-variant" />

          <div className="mb-1 text-sm font-medium text-on-surface">Import from CSV</div>
          <p className="mb-3 text-xs text-on-surface-variant/70">
            Import a playlist exported as CSV (Title/Artist columns). Each row is matched
            against YouTube Music.
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => pickCsvFile(e.target.files?.[0] ?? null)}
              className="h-10 min-w-0 flex-1 rounded-full bg-surface-container-highest px-4 text-xs leading-10 text-on-surface-variant outline-none file:mr-3 file:h-10 file:-ml-4 file:rounded-l-full file:border-0 file:bg-surface-container-high file:px-4 file:text-xs file:text-on-surface"
            />
            <input
              value={csvName}
              onChange={(e) => setCsvName(e.target.value)}
              placeholder="Playlist name"
              className="h-10 w-40 min-w-0 rounded-full bg-surface-container-highest px-4 text-sm outline-none placeholder:text-on-surface-variant/50 focus:ring-1 focus:ring-outline"
            />
            <button
              onClick={() => void runCsvImport()}
              disabled={csvState === "importing" || !csvFile || !csvName.trim()}
              className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-on-primary disabled:opacity-40"
            >
              {csvState === "importing" ? (
                <Icon name="progress_activity" size={18} className="animate-spin" />
              ) : (
                <Icon name="playlist_add" size={18} />
              )}
              Import
            </button>
          </div>
          {csvMessage && (
            <p className={`mt-2 text-xs ${csvState === "error" ? "text-error" : "text-primary"}`}>
              {csvMessage}
            </p>
          )}
          {csvResult && csvResult.failed > 0 && (
            <details className="mt-2 text-xs text-on-surface-variant/70">
              <summary className="cursor-pointer">
                {csvResult.failed} song{csvResult.failed === 1 ? "" : "s"} not found
              </summary>
              <ul className="mt-1 list-disc pl-4">
                {csvResult.failedTitles.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </Section>

      <Section title="Appearance">
        <div className="flex items-center justify-between border-b border-outline-variant px-[18px] py-[15px]">
          <div className="text-sm text-on-surface">Theme</div>
          <div className="text-sm text-on-surface-variant">Dark</div>
        </div>
        <div className="flex items-center justify-between px-[18px] py-[15px]">
          <div className="text-sm text-on-surface">Accent color</div>
          <div className="flex gap-2.5">
            {ACCENTS.map((a) => (
              <button
                key={a.hex}
                onClick={() => s.setAccent(a.hex)}
                className="h-6 w-6 rounded-full"
                style={{
                  background: a.hex,
                  boxShadow:
                    s.accent === a.hex
                      ? `0 0 0 2px #0d0d0d, 0 0 0 4px ${a.hex}`
                      : "none",
                }}
                title={a.hex}
              />
            ))}
          </div>
        </div>
      </Section>

      <Section title="Privacy">
        <button
          onClick={() => {
            void api.clearSearchHistory().then(() => setHistoryCleared(true));
          }}
          className="flex w-full items-center gap-3 p-4 text-left text-sm hover:bg-surface-container-high"
        >
          <Icon name="delete_history" size={20} className="text-on-surface-variant" />
          <span className="flex-1">Clear search history</span>
          {historyCleared && <Icon name="check" size={18} className="text-primary" />}
        </button>
      </Section>

      <Section title="About">
        <div className="p-4 text-sm">
          <img src="/logo-mark.png" alt="Amphion" className="mb-3 h-12 w-12 rounded-full object-cover" />
          <div className="font-semibold text-on-surface">Amphion for Windows</div>
          <p className="mt-1 text-xs text-on-surface-variant/70">
            Desktop reimplementation inspired by the Velune Android app. Powered by
            ytmusicapi, yt-dlp and lrclib.net. Streams are fetched fresh per session and
            never stored, except songs you download.
          </p>
        </div>
      </Section>
    </div>
  );
}
