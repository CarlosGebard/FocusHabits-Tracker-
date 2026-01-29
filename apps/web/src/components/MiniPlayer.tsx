import React from "react";
import { Track } from "../lib/api";

type Props = {
  currentTrack: Track | null;
  audioRef: React.RefObject<HTMLAudioElement>;
  onPrev: () => void;
  onPlay: (trackId: number) => void;
  onPause: () => void;
  onNext: () => void;
  onTimeUpdate: () => void;
  onEnded: () => void;
};

export function MiniPlayer({
  currentTrack,
  audioRef,
  onPrev,
  onPlay,
  onPause,
  onNext,
  onTimeUpdate,
  onEnded,
}: Props) {
  return (
    <div className="mini-player">
      <div className="mini-player-inner">
        <div className="mini-player-info">
          {currentTrack ? (
            <>
              <div className="mini-player-title">{currentTrack.title}</div>
              <div className="mini-player-subtitle">
                {currentTrack.artist || "Unknown artist"} • {currentTrack.album || "Unknown album"}
              </div>
            </>
          ) : (
            <>
              <div className="mini-player-title">No track selected</div>
              <div className="mini-player-subtitle">Choose a track to start playback.</div>
            </>
          )}
        </div>
        <div className="mini-player-controls">
          <button className="btn btn-ghost" onClick={onPrev} disabled={!currentTrack}>
            Prev
          </button>
          <button className="btn" onClick={() => currentTrack && onPlay(currentTrack.id)} disabled={!currentTrack}>
            Play
          </button>
          <button className="btn btn-ghost" onClick={onPause} disabled={!currentTrack}>
            Pause
          </button>
          <button className="btn btn-ghost" onClick={onNext} disabled={!currentTrack}>
            Next
          </button>
        </div>
        <div className="mini-player-audio">
          <audio ref={audioRef} controls onTimeUpdate={onTimeUpdate} onEnded={onEnded} />
        </div>
      </div>
    </div>
  );
}
