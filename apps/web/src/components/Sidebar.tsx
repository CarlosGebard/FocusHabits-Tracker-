import React from "react";

type Props<Tab extends string> = {
  tabs: readonly Tab[];
  activeTab: Tab;
  open: boolean;
  onClose: () => void;
  onSelect: (tab: Tab) => void;
};

export function Sidebar<Tab extends string>({
  tabs,
  activeTab,
  open,
  onClose,
  onSelect,
}: Props<Tab>) {
  return (
    <>
      <div className={`sidebar-overlay ${open ? "open" : ""}`} onClick={onClose} />
      <aside className={`sidebar-drawer ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="sidebar-drawer-header">
          <div className="control-label">Sections</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="sidebar-drawer-body">
          {tabs.map((item) => (
            <button
              key={item}
              className={`sidebar-btn ${activeTab === item ? "active" : ""}`}
              onClick={() => {
                onSelect(item);
                onClose();
              }}
            >
              {item}
            </button>
          ))}
        </div>
      </aside>
    </>
  );
}
