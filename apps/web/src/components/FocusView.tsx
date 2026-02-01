import React, { useEffect, useMemo, useRef, useState } from "react";
import { api, FocusSession } from "../lib/api";

const MIN_MINUTES = 0;
const MAX_MINUTES = 120;
const STEP_MINUTES = 5;
const DEFAULT_MINUTES = 0;

type Props = {
  onStatus: (message: string) => void;
};

function buildOptions() {
  const options: number[] = [];
  for (let value = MIN_MINUTES; value <= MAX_MINUTES; value += STEP_MINUTES) {
    options.push(value);
  }
  return options;
}

function formatCountdown(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function formatMinutesLabel(minutes: number) {
  const totalSeconds = minutes * 60;
  return formatCountdown(totalSeconds);
}

function remainingSecondsFor(session: FocusSession, now: Date) {
  const started = new Date(session.started_at).getTime();
  const pausedSeconds = session.paused_seconds || 0;
  const pauseStart = session.paused_at ? new Date(session.paused_at).getTime() : null;
  const effectiveNow = pauseStart && session.status === "paused" ? pauseStart : now.getTime();
  const elapsed = Math.floor((effectiveNow - started) / 1000) - pausedSeconds;
  return session.duration_seconds - Math.max(0, elapsed);
}

export function FocusView({ onStatus }: Props) {
  const options = useMemo(buildOptions, []);
  const [selectedMinutes, setSelectedMinutes] = useState(DEFAULT_MINUTES);
  const [activeSession, setActiveSession] = useState<FocusSession | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [history, setHistory] = useState<FocusSession[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const tickingRef = useRef<number | null>(null);
  const pollRef = useRef<number | null>(null);
  const pollInFlightRef = useRef(false);
  const hadActiveRef = useRef(false);
  const completingRef = useRef(false);
  const dialProgress = (selectedMinutes - MIN_MINUTES) / (MAX_MINUTES - MIN_MINUTES);
  // Keep the knob aligned with the progress stroke (full 360deg sweep).
  const dialAngle = dialProgress * 360;
  const dialRadians = (dialAngle * Math.PI) / 180;
  const dialRadius = 90;
  const dialCenter = 110;
  const dialX = dialCenter + dialRadius * Math.cos(dialRadians);
  const dialY = dialCenter + dialRadius * Math.sin(dialRadians);

  useEffect(() => {
    refresh();
    pollRef.current = window.setInterval(() => {
      pollActive();
    }, 5000);
    return () => {
      if (tickingRef.current) {
        window.clearInterval(tickingRef.current);
      }
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (tickingRef.current) {
      window.clearInterval(tickingRef.current);
      tickingRef.current = null;
    }

    if (activeSession && activeSession.status === "running") {
      tickingRef.current = window.setInterval(() => {
        setRemainingSeconds(remainingSecondsFor(activeSession, new Date()));
      }, 1000);
    }

    if (activeSession) {
      setRemainingSeconds(remainingSecondsFor(activeSession, new Date()));
    } else {
      setRemainingSeconds(null);
    }
  }, [activeSession]);

  useEffect(() => {
    if (!activeSession || activeSession.status !== "running") return;
    if (remainingSeconds !== null && remainingSeconds <= 0 && !completingRef.current) {
      completingRef.current = true;
      api
        .focusComplete(activeSession.id)
        .then((session) => {
          setActiveSession(session);
          onStatus("Focus session completed.");
          refreshHistory();
        })
        .catch((err) => setError((err as Error).message))
        .finally(() => {
          completingRef.current = false;
        });
    }
  }, [activeSession, remainingSeconds, onStatus]);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const [active, sessions] = await Promise.all([api.focusActive(), api.focusSessions(20, 0)]);
      setActiveSession(active);
      hadActiveRef.current = Boolean(active);
      setHistory(sessions.items);
      setHistoryTotal(sessions.total);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function pollActive() {
    if (pollInFlightRef.current) return;
    pollInFlightRef.current = true;
    try {
      const active = await api.focusActive();
      setActiveSession(active);
      if (active) {
        hadActiveRef.current = true;
      }
      if (!active && hadActiveRef.current) {
        hadActiveRef.current = false;
        await refreshHistory();
      }
    } catch {
      // Avoid noisy errors during background polling.
    } finally {
      pollInFlightRef.current = false;
    }
  }

  async function refreshHistory() {
    const sessions = await api.focusSessions(20, 0);
    setHistory(sessions.items);
    setHistoryTotal(sessions.total);
  }

  async function handleStart() {
    setLoading(true);
    setError("");
    try {
      const session = await api.focusStart(selectedMinutes * 60);
      setActiveSession(session);
      onStatus("Focus session started.");
      await refreshHistory();
    } catch (err) {
      const message = (err as Error).message || "Failed to start focus session.";
      if (message.includes("Active session exists")) {
        const active = await api.focusActive();
        setActiveSession(active);
        onStatus("Ya hay una sesión activa en otro dispositivo.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handlePause() {
    if (!activeSession) return;
    setLoading(true);
    setError("");
    try {
      const session = await api.focusPause(activeSession.id);
      setActiveSession(session);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResume() {
    if (!activeSession) return;
    setLoading(true);
    setError("");
    try {
      const session = await api.focusResume(activeSession.id);
      setActiveSession(session);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (!activeSession) return;
    setLoading(true);
    setError("");
    try {
      const session = await api.focusCancel(activeSession.id);
      setActiveSession(session);
      onStatus("Focus session canceled.");
      await refreshHistory();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const summary = useMemo(() => {
    const today = new Date();
    const todayKey = today.toDateString();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 6);
    let todayMinutes = 0;
    let weekMinutes = 0;

    for (const session of history) {
      if (session.status !== "completed") continue;
      const started = new Date(session.started_at);
      const minutes = Math.round(session.duration_seconds / 60);
      if (started.toDateString() === todayKey) {
        todayMinutes += minutes;
      }
      if (started >= weekAgo && started <= today) {
        weekMinutes += minutes;
      }
    }

    return { todayMinutes, weekMinutes };
  }, [history]);

  return (
    <section className="chat-content">
      <div className="card focus-card">
        <div className="focus-header">
          <div>
            <h3>Focus</h3>
            <div className="chat-subtitle">Set a session and stay locked in.</div>
          </div>
          <div className="focus-summary">
            <div>
              <div className="focus-summary-label">Today</div>
              <div className="focus-summary-value">{summary.todayMinutes} min</div>
            </div>
            <div>
              <div className="focus-summary-label">7 days</div>
              <div className="focus-summary-value">{summary.weekMinutes} min</div>
            </div>
          </div>
        </div>

        <div className="focus-grid">
          <div className="focus-picker">
            <div className="focus-picker-label">Duration</div>
            <div className="focus-dial">
              <svg viewBox="0 0 220 220" className="focus-dial-svg" aria-hidden="true">
                <circle className="focus-dial-track" cx="110" cy="110" r="90" />
                <circle
                  className="focus-dial-progress"
                  cx="110"
                  cy="110"
                  r="90"
                  style={{
                    strokeDasharray: `${2 * Math.PI * 90}`,
                    strokeDashoffset: `${2 * Math.PI * 90 * (1 - dialProgress)}`,
                  }}
                />
                <circle className="focus-dial-knob" cx={dialX} cy={dialY} r="9" />
              </svg>
              <div className="focus-dial-time">{formatMinutesLabel(selectedMinutes)}</div>
              <div className="focus-dial-caption">minutes</div>
            </div>
            <input
              className="focus-range"
              type="range"
              min={MIN_MINUTES}
              max={MAX_MINUTES}
              step={STEP_MINUTES}
              value={selectedMinutes}
              onChange={(event) => setSelectedMinutes(Number(event.target.value))}
            />
            {!activeSession || activeSession.status === "completed" || activeSession.status === "canceled" ? (
              <button className="btn focus-start" onClick={handleStart} disabled={loading}>
                Start
              </button>
            ) : (
              <div className="focus-actions">
                {activeSession.status === "running" ? (
                  <button className="btn btn-ghost" onClick={handlePause} disabled={loading}>
                    Pause
                  </button>
                ) : (
                  <button className="btn btn-ghost" onClick={handleResume} disabled={loading}>
                    Resume
                  </button>
                )}
                <button className="btn" onClick={handleCancel} disabled={loading}>
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="focus-timer">
            <div className="focus-timer-label">Countdown</div>
            <div className="focus-timer-value">
              {remainingSeconds !== null ? formatCountdown(remainingSeconds) : "--:--"}
            </div>
            {activeSession && (
              <div className="chat-subtitle">
                Status: {activeSession.status} · Started{" "}
                {new Date(activeSession.started_at).toLocaleTimeString()}
                {activeSession.ended_at && ` · Ended ${new Date(activeSession.ended_at).toLocaleTimeString()}`}
              </div>
            )}
            {error && <div className="chat-subtitle">{error}</div>}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="focus-history-header">
          <h3>Focus history</h3>
          <div className="chat-subtitle">
            Showing {history.length} of {historyTotal}
          </div>
        </div>
        {history.length === 0 ? (
          <p className="chat-subtitle">No sessions yet.</p>
        ) : (
          <div className="focus-history-list">
            {history.map((session) => (
              <div key={session.id} className="row">
                <div>
                  <strong>{Math.round(session.duration_seconds / 60)} min</strong>
                  <div className="chat-subtitle">
                    {new Date(session.started_at).toLocaleString()} · {session.status}
                  </div>
                </div>
                <div className={`status-pill status-${session.status}`}>{session.status}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
