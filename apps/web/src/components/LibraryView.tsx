import React from "react";
import { Track } from "../lib/api";
import { formatDuration } from "../lib/format";

type Props = {
  tracks: Track[];
  onPlay: (trackId: number) => void;
  onDownloadHint: (trackId: number) => void;
  onRefresh: () => void;
  onScan: () => void;
  onRepairDownloads: () => void;
};

export function LibraryView({
  tracks,
  onPlay,
  onDownloadHint,
  onRefresh,
  onScan,
  onRepairDownloads,
}: Props) {
  return (
    <section className="chat-content">
      <div className="card">
        <div className="control-block" style={{ marginBottom: 16 }}>
          <div className="control-label">Actions</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn" onClick={onRefresh}>
              Refresh
            </button>
            <button className="btn btn-ghost" onClick={onScan}>
              Scan library
            </button>
            <button className="btn btn-ghost" onClick={onRepairDownloads}>
              Repair downloads
            </button>
          </div>
        </div>
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
