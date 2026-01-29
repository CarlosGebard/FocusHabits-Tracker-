import React, { useEffect, useState } from "react";
import { Track } from "../lib/api";
import { isTrackDownloaded } from "../lib/db";

type DownloadStatus = {
  playlistId: number;
  total: number;
  done: number;
  error?: string;
};

type Props = {
  tracks: Track[];
  downloadStatus: DownloadStatus | null;
};

export function DownloadsView({ tracks, downloadStatus }: Props) {
  return (
    <section className="chat-content">
      <div className="card">
        <h3>Downloads</h3>
        {downloadStatus && (
          <div className="chat-subtitle">
            Downloading playlist {downloadStatus.playlistId}: {downloadStatus.done}/{downloadStatus.total}
            {downloadStatus.error && <span className="error"> {downloadStatus.error}</span>}
          </div>
        )}
        <p className="chat-subtitle">
          Downloads are stored in IndexedDB. If iOS clears storage, use Repair downloads.
        </p>
        <div style={{ marginTop: 12 }}>
          {tracks.map((track) => (
            <div key={track.id} className="row" style={{ marginBottom: 12 }}>
              <div>
                <strong>{track.title}</strong>
                <div className="chat-subtitle">{track.artist || "Unknown artist"}</div>
              </div>
              <div className="badge">
                <DownloadBadge trackId={track.id} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DownloadBadge({ trackId }: { trackId: number }) {
  const [downloaded, setDownloaded] = useState(false);
  useEffect(() => {
    isTrackDownloaded(trackId).then(setDownloaded);
  }, [trackId]);
  return <span>{downloaded ? "Downloaded" : "Not downloaded"}</span>;
}
