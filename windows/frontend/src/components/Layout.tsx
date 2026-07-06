import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import AmbientBackdrop from "./AmbientBackdrop";
import Sidebar from "./Sidebar";
import MiniPlayer from "./MiniPlayer";
import AudioEngine from "./AudioEngine";
import NowPlayingPanel from "./NowPlayingPanel";
import FullPlayer from "./player/FullPlayer";
import { useDownloads } from "../store/downloads";
import { useSettings } from "../store/settings";

export default function Layout() {
  const refreshDownloads = useDownloads((s) => s.refresh);
  const applyAccent = useSettings((s) => s.applyAccent);
  const loadServerSettings = useSettings((s) => s.loadServerSettings);

  useEffect(() => {
    applyAccent();
    void loadServerSettings();
    void refreshDownloads();
  }, [applyAccent, loadServerSettings, refreshDownloads]);

  return (
    <div className="relative flex h-screen flex-col text-on-surface">
      <AmbientBackdrop />
      <div className="relative z-10 flex min-h-0 flex-1">
        <Sidebar />
        <main
          className="min-w-0 flex-1 overflow-y-auto"
          style={{
            background:
              "radial-gradient(120% 60% at 50% 0%, rgba(22,19,31,0.5) 0%, rgba(13,13,13,0.2) 55%)",
          }}
        >
          <Outlet />
        </main>
        <NowPlayingPanel />
      </div>
      <div className="relative z-10">
        <MiniPlayer />
      </div>
      <FullPlayer />
      <AudioEngine />
    </div>
  );
}
