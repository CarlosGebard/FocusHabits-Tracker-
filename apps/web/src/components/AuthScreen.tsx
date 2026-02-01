import React from "react";

type Props = {
  username: string;
  password: string;
  error: string;
  busy: boolean;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
};

export function AuthScreen({
  username,
  password,
  error,
  busy,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
}: Props) {
  return (
    <div className="app-shell">
      <header className="chat-header">
        <div className="chat-header-inner">
          <div className="chat-title-row">
            <div>
              <div className="chat-title">Personal App</div>
              <div className="chat-subtitle">Multi Purpose Personal App</div>
            </div>
            <div className="status-pill">Offline ready</div>
          </div>
        </div>
      </header>
      <main className="chat-body">
        <div className="chat-main">
          <div className="card">
            <h3>Sign in</h3>
            <form onSubmit={onSubmit}>
              <div className="control-block">
                <div className="control-label">Username</div>
                <input
                  className="select"
                  type="text"
                  value={username}
                  onChange={(event) => onUsernameChange(event.target.value)}
                  placeholder="your-username"
                  required
                />
              </div>
              <div className="control-block">
                <div className="control-label">Password</div>
                <input
                  className="select"
                  type="password"
                  value={password}
                  onChange={(event) => onPasswordChange(event.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              {error && <div className="chat-subtitle">{error}</div>}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button className="btn" type="submit" disabled={busy}>
                  Sign in
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
