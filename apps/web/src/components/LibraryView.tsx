import React from "react";
import { Track } from "../lib/api";
import { formatDuration } from "../lib/format";

type Props = {
  tracks: Track[];
  onPlay: (trackId: number) => void;
  onDownloadHint: (trackId: number) => void;
};

export function LibraryView({ tracks, onPlay, onDownloadHint }: Props) {
  return (
    <section className="chat-content">
      <div className="card">
        <h3>Library</h3>
        {tracks.length === 0 && <p className="chat-subtitle">No tracks yet.</p>}
        {tracks.map((track) => (
          <div key={track.id} className="row" style={{ marginBottom: 12 }}>
            <div>
              <strong>{track.title}</strong>
              <div className="chat-subtitle">
                {track.artist || "Unknown artist"} • {formatDuration(track.duration_ms)}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" onClick={() => onPlay(track.id)}>
                Play
              </button>
              <button className="btn btn-ghost" onClick={() => onDownloadHint(track.id)}>
                Download
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
