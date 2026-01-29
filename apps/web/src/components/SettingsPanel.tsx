import React from "react";
import { User } from "../lib/api";

type Props = {
  currentUser: User;
  status: string;
  onLogout: () => void;
  onRefresh: () => void;
  onScan: () => void;
  onRepairDownloads: () => void;
};

export function SettingsPanel({
  currentUser,
  status,
  onLogout,
  onRefresh,
  onScan,
  onRepairDownloads,
}: Props) {
  return (
    <div className="chat-settings card">
      <div className="chat-settings-inner">
        <div className="control-block">
          <div className="control-label">Account</div>
          <div className="chat-subtitle">{currentUser.username}</div>
          <div style={{ marginTop: 8 }}>
            <button className="btn btn-ghost" onClick={onLogout}>
              Sign out
            </button>
          </div>
        </div>
        <div className="control-block">
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
        <div className="control-block">
          <div className="control-label">Status</div>
          <div className="chat-subtitle">{status || "Ready"}</div>
        </div>
      </div>
    </div>
  );
}
