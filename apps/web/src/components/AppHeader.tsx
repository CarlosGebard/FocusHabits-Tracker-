import React from "react";
import { User } from "../lib/api";

type Props<Tab extends string> = {
  currentView: Tab;
  currentUser: User;
  status: string;
  onLogout: () => void;
  onOpenSidebar: () => void;
};

export function AppHeader<Tab extends string>({
  currentView,
  currentUser,
  status,
  onLogout,
  onOpenSidebar,
}: Props<Tab>) {
  return (
    <header className="chat-header">
      <div className="chat-header-inner">
        <div className="chat-title-row">
          <div className="chat-title-group">
            <button className="btn btn-ghost btn-sm" onClick={onOpenSidebar}>
              Menu
            </button>
            <div>
              <div className="chat-title">{currentView}</div>
            </div>
            <div className="status-pill">{status || "Ready"}</div>
          </div>
          <div className="account-block">
            <div className="control-label">Account</div>
            <div className="chat-subtitle">{currentUser.username}</div>
            <div style={{ marginTop: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={onLogout}>
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
