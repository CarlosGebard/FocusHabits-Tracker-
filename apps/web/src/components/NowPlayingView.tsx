import React from "react";
import { Track } from "../lib/api";

type Props = {
  currentTrack: Track | null;
  shuffle: boolean;
  repeat: "off" | "one" | "all";
  onPrev: () => void;
  onPlay: (trackId: number) => void;
  onPause: () => void;
  onNext: () => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
};

export function NowPlayingView({
  currentTrack,
  shuffle,
  repeat,
  onPrev,
  onPlay,
  onPause,
  onNext,
  onToggleShuffle,
  onCycleRepeat,
}: Props) {
  return (
    <section className="chat-content">
      <div className="card">
        <h3>Now Playing</h3>
        {currentTrack ? (
          <>
            <div className="chat-subtitle">
              {currentTrack.artist || "Unknown artist"} • {currentTrack.album || "Unknown album"}
            </div>
            <div style={{ margin: "12px 0" }}>
              <strong>{currentTrack.title}</strong>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button className="btn btn-ghost" onClick={onPrev}>
                Prev
              </button>
              <button className="btn" onClick={() => onPlay(currentTrack.id)}>
                Play
              </button>
              <button className="btn btn-ghost" onClick={onPause}>
                Pause
              </button>
              <button className="btn btn-ghost" onClick={onNext}>
                Next
              </button>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button className={`btn btn-ghost ${shuffle ? "active" : ""}`} onClick={onToggleShuffle}>
                Shuffle
              </button>
              <button className="btn btn-ghost" onClick={onCycleRepeat}>
                Repeat: {repeat}
              </button>
            </div>
          </>
        ) : (
          <p className="chat-subtitle">Select a track to start playback.</p>
        )}
      </div>
    </section>
  );
}
