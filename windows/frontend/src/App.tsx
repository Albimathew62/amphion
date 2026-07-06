import { Route, Routes } from "react-router-dom";
import StartupGate from "./components/StartupGate";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Search from "./pages/Search";
import Library from "./pages/Library";
import History from "./pages/History";
import Liked from "./pages/Liked";
import Playlist from "./pages/Playlist";
import Artist from "./pages/Artist";
import Album from "./pages/Album";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <StartupGate>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/library" element={<Library />} />
          <Route path="/liked" element={<Liked />} />
          <Route path="/history" element={<History />} />
          <Route path="/playlist/:id" element={<Playlist />} />
          <Route path="/artist/:id" element={<Artist />} />
          <Route path="/album/:id" element={<Album />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </StartupGate>
  );
}
