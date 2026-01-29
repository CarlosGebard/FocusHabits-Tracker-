import React from "react";

type Props<Tab extends string> = {
  tabs: readonly Tab[];
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
};

export function AppHeader<Tab extends string>({ tabs, activeTab, onTabChange }: Props<Tab>) {
  return (
    <header className="chat-header">
      <div className="chat-header-inner">
        <div className="chat-title-row">
          <div>
            <div className="chat-title">Personal App</div>
            <div className="chat-subtitle">Personal audio library</div>
          </div>
          <div className="status-pill">Offline ready</div>
        </div>
        <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
          {tabs.map((item) => (
            <button
              key={item}
              className={`segmented-btn ${activeTab === item ? "active" : ""}`}
              onClick={() => onTabChange(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
