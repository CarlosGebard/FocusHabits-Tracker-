import React from "react";
import { Playlist } from "../lib/api";

type Props = {
  playlists: Playlist[];
  onDownloadPlaylist: (playlistId: number) => void;
  onPlayOffline: (playlistId: number) => void;
};

export function PlaylistsView({ playlists, onDownloadPlaylist, onPlayOffline }: Props) {
  return (
    <section className="chat-content">
      <div className="card">
        <h3>Playlists</h3>
        {playlists.length === 0 && <p className="chat-subtitle">No playlists yet.</p>}
        {playlists.map((playlist) => (
          <div key={playlist.id} className="row" style={{ marginBottom: 12 }}>
            <div>
              <strong>{playlist.name}</strong>
              <div className="chat-subtitle">{playlist.items.length} tracks</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" onClick={() => onDownloadPlaylist(playlist.id)}>
                Download
              </button>
              <button className="btn btn-ghost" onClick={() => onPlayOffline(playlist.id)}>
                Play offline
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
