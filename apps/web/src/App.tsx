import React, { useEffect, useMemo, useRef, useState } from "react";
import { api, Playlist, PlaylistManifest, Track, User, streamUrl } from "./lib/api";
import { AppHeader } from "./components/AppHeader";
import { AuthScreen } from "./components/AuthScreen";
import { DownloadsView } from "./components/DownloadsView";
import { LibraryView } from "./components/LibraryView";
import { LoadingScreen } from "./components/LoadingScreen";
import { FocusView } from "./components/FocusView";
import { NowPlayingView } from "./components/NowPlayingView";
import { PlaylistsView } from "./components/PlaylistsView";
import { MiniPlayer } from "./components/MiniPlayer";
import { Sidebar } from "./components/Sidebar";
import {
  getPlaybackState,
  getPlaylist,
  getTrack,
  isTrackDownloaded,
  savePlaybackState,
  savePlaylist,
  saveTrack,
} from "./lib/db";
import { sha256Blob } from "./lib/crypto";

const TABS = ["Library", "Playlists", "Now Playing", "Downloads", "Focus"] as const;

type Tab = (typeof TABS)[number];

type DownloadStatus = {
  playlistId: number;
  total: number;
  done: number;
  error?: string;
};

export default function App() {
  const [tab, setTab] = useState<Tab>("Library");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [currentTrackId, setCurrentTrackId] = useState<number | null>(null);
  const [queue, setQueue] = useState<number[]>([]);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<"off" | "one" | "all">("off");
  const [positionMs, setPositionMs] = useState(0);
  const [status, setStatus] = useState<string>("");
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentTrack = useMemo(
    () => tracks.find((track) => track.id === currentTrackId) || null,
    [tracks, currentTrackId]
  );

  useEffect(() => {
    bootstrap();
  }, []);

  useEffect(() => {
    if (currentTrack) {
      if ("mediaSession" in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentTrack.title,
          artist: currentTrack.artist || "",
          album: currentTrack.album || "",
        });
      }
    }
  }, [currentTrack]);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  async function bootstrap() {
    try {
      // llama al endpoint /me para verificar si la sesion es valida
      const user = await api.me();
      setCurrentUser(user);
      await Promise.all([loadData(), loadPlaybackState()]);
    } catch (err) {
      setCurrentUser(null);
    } finally {
      setAuthChecked(true);
    }
  }

  async function loadPlaybackState() {
    const stored = await getPlaybackState();
    if (stored) {
      setCurrentTrackId(stored.last_track_id ?? null);
      setPositionMs(stored.position_ms ?? 0);
      setQueue(stored.queue ?? []);
      setShuffle(Boolean(stored.shuffle));
      setRepeat((stored.repeat as "off" | "one" | "all") || "off");
    }
  }

  async function loadData() {
    try {
      const [tracksData, playlistsData] = await Promise.all([api.tracks(), api.playlists()]);
      setTracks(tracksData);
      setPlaylists(playlistsData);
      setStatus("");
    } catch (err) {
      setStatus((err as Error).message || "Failed to load data.");
    }
  }

  async function handleAuthSubmit(event: React.FormEvent) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError("");
    try {
      const user = await api.login(authUsername, authPassword);
      setCurrentUser(user);
      await Promise.all([loadData(), loadPlaybackState()]);
    } catch (err) {
      setAuthError((err as Error).message || "Authentication failed.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleLogout() {
    try {
      await api.logout();
    } finally {
      setCurrentUser(null);
      setTracks([]);
      setPlaylists([]);
    }
  }

  async function handlePlay(trackId: number) {
    setCurrentTrackId(trackId);
    if (!queue.length) {
      setQueue(tracks.map((track) => track.id));
    }
    const url = await resolveTrackUrl(trackId);
    setAudioUrl(url);
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.currentTime = positionMs / 1000;
      await audioRef.current.play();
    }
  }

  async function resolveTrackUrl(trackId: number) {
    const stored = await getTrack(trackId);
    if (stored?.blob) {
      return URL.createObjectURL(stored.blob);
    }
    return streamUrl(trackId);
  }

  function handlePause() {
    audioRef.current?.pause();
  }

  async function handleNext() {
    if (!queue.length) return;
    const currentIndex = queue.indexOf(currentTrackId ?? -1);
    const nextIndex = shuffle
      ? Math.floor(Math.random() * queue.length)
      : (currentIndex + 1) % queue.length;
    const nextId = queue[nextIndex];
    if (nextId) {
      await handlePlay(nextId);
    }
  }

  async function handlePrev() {
    if (!queue.length) return;
    const currentIndex = queue.indexOf(currentTrackId ?? -1);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : 0;
    const prevId = queue[prevIndex];
    if (prevId) {
      await handlePlay(prevId);
    }
  }

  async function handleEnded() {
    if (repeat === "one") {
      await handlePlay(currentTrackId ?? 0);
      return;
    }
    if (repeat === "all") {
      await handleNext();
      return;
    }
  }

  async function handleTimeUpdate() {
    if (!audioRef.current) return;
    const current = Math.floor(audioRef.current.currentTime * 1000);
    setPositionMs(current);
    await savePlaybackState({
      last_track_id: currentTrackId,
      position_ms: current,
      queue,
      shuffle,
      repeat,
    });
  }

  async function downloadPlaylist(playlistId: number) {
    setDownloadStatus({ playlistId, total: 0, done: 0 });
    try {
      const manifest = await api.playlistManifest(playlistId);
      await savePlaylist({
        id: manifest.playlist_id,
        name: manifest.name,
        track_ids: manifest.tracks.map((track) => track.id),
        updated_at: manifest.updated_at,
      });

      setDownloadStatus({ playlistId, total: manifest.tracks.length, done: 0 });
      let done = 0;
      for (const track of manifest.tracks) {
        const stored = await getTrack(track.id);
        if (!stored || stored.sha256 !== track.sha256) {
          const resp = await fetch(track.download_url, { credentials: "include" });
          if (!resp.ok) {
            throw new Error(`Failed to download ${track.title}`);
          }
          const blob = await resp.blob();
          const hash = await sha256Blob(blob);
          if (hash !== track.sha256) {
            throw new Error(`Hash mismatch for ${track.title}`);
          }
          await saveTrack({
            id: track.id,
            blob,
            mime: track.mime,
            sha256: track.sha256,
            size: track.size_bytes,
          });
        }
        done += 1;
        setDownloadStatus({ playlistId, total: manifest.tracks.length, done });
      }
      setStatus("Playlist downloaded.");
    } catch (err) {
      setDownloadStatus((prev) => (prev ? { ...prev, error: (err as Error).message } : prev));
    }
  }

  async function repairDownloads() {
    setStatus("Repairing downloads...");
    for (const playlist of playlists) {
      const manifest = await api.playlistManifest(playlist.id);
      await repairManifest(manifest);
    }
    setStatus("Repair complete.");
  }

  async function repairManifest(manifest: PlaylistManifest) {
    for (const track of manifest.tracks) {
      const stored = await getTrack(track.id);
      if (!stored) {
        await downloadPlaylist(manifest.playlist_id);
        return;
      }
      const hash = await sha256Blob(stored.blob);
      if (hash !== track.sha256) {
        await downloadPlaylist(manifest.playlist_id);
        return;
      }
    }
  }

  if (!authChecked) {
    return <LoadingScreen />;
  }

  if (!currentUser) {
    return (
      <AuthScreen
        username={authUsername}
        password={authPassword}
        error={authError}
        busy={authBusy}
        onUsernameChange={setAuthUsername}
        onPasswordChange={setAuthPassword}
        onSubmit={handleAuthSubmit}
      />
    );
  }

  return (
    <div className="app-shell">
      <AppHeader
        currentView={tab}
        currentUser={currentUser}
        status={status}
        onLogout={handleLogout}
        onOpenSidebar={() => setSidebarOpen(true)}
      />

      <Sidebar
        tabs={TABS}
        activeTab={tab}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelect={setTab}
      />

      <main className="chat-body">
        <div className="chat-main">
          {tab === "Library" && (
            <LibraryView
              tracks={tracks}
              onPlay={handlePlay}
              onDownloadHint={async (trackId) => {
                const downloaded = await isTrackDownloaded(trackId);
                setStatus(downloaded ? "Already downloaded" : "Use playlist download");
              }}
              onRefresh={loadData}
              onScan={() => api.scanTracks().then(loadData)}
              onRepairDownloads={repairDownloads}
            />
          )}

          {tab === "Playlists" && (
            <PlaylistsView
              playlists={playlists}
              onDownloadPlaylist={downloadPlaylist}
              onPlayOffline={async (playlistId) => {
                const stored = await getPlaylist(playlistId);
                if (stored?.track_ids?.length) {
                  setQueue(stored.track_ids);
                  await handlePlay(stored.track_ids[0]);
                }
              }}
            />
          )}

          {tab === "Now Playing" && (
            <NowPlayingView
              currentTrack={currentTrack}
              shuffle={shuffle}
              repeat={repeat}
              onPrev={handlePrev}
              onPlay={handlePlay}
              onPause={handlePause}
              onNext={handleNext}
              onToggleShuffle={() => setShuffle(!shuffle)}
              onCycleRepeat={() =>
                setRepeat(repeat === "off" ? "one" : repeat === "one" ? "all" : "off")
              }
            />
          )}

          {tab === "Downloads" && <DownloadsView tracks={tracks} downloadStatus={downloadStatus} />}

          {tab === "Focus" && <FocusView onStatus={setStatus} />}
        </div>
      </main>
      <MiniPlayer
        currentTrack={currentTrack}
        audioRef={audioRef}
        onPrev={handlePrev}
        onPlay={handlePlay}
        onPause={handlePause}
        onNext={handleNext}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      />
    </div>
  );
}
