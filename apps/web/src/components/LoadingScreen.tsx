import React from "react";

export function LoadingScreen() {
  return (
    <div className="app-shell">
      <main className="chat-body">
        <div className="chat-main">
          <div className="card">
            <h3>Loading...</h3>
            <p className="chat-subtitle">Checking session.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
