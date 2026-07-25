import React, { useState, useRef, useEffect, useCallback } from 'react';

const AppMenu = ({
  tab,
  onNavigate,
  onGlobalLookup,
  onFocusSearch,
  onLinkedInSearch,
  onOpenUrl,
  onClearFilters,
  onLinkedInImport,
  onConferenceImport,
  onLinkedInUpdate,
  onPaste,
  onCopy,
  onPageForward,
  onPageBackward,
}) => {
  const [openMenu, setOpenMenu] = useState(null);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenu(null);
      }
    };
    if (openMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenu]);

  // Close menu on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && openMenu) {
        setOpenMenu(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openMenu]);

  const handleMenuClick = (menuName) => {
    setOpenMenu(openMenu === menuName ? null : menuName);
  };

  const executeAction = useCallback((action, isDisabled) => {
    if (isDisabled) return;
    setOpenMenu(null);
    // Small delay to let menu close before action
    setTimeout(() => action(), 0);
  }, []);

  const isGridTab = tab === 'contacts' || tab === 'activities' || tab === 'content';
  const isContactsTab = tab === 'contacts';
  const hasUrlColumn = tab === 'contacts' || tab === 'content';

  return (
    <div className="app-menu-bar" ref={menuRef}>
      {/* Navigate Menu */}
      <div className="app-menu-container">
        <button
          className={`app-menu-trigger ${openMenu === 'navigate' ? 'open' : ''}`}
          onClick={() => handleMenuClick('navigate')}
        >
          Navigate
        </button>
        {openMenu === 'navigate' && (
          <div className="app-menu-dropdown">
            <MenuItem
              label="Activities"
              shortcut="Alt+A"
              onClick={() => executeAction(() => onNavigate('activities'))}
            />
            <MenuItem
              label="Contacts"
              shortcut="Alt+C"
              onClick={() => executeAction(() => onNavigate('contacts'))}
            />
            <MenuItem
              label="Content"
              shortcut="Alt+N"
              onClick={() => executeAction(() => onNavigate('content'))}
            />
            <MenuItem
              label="Filter"
              shortcut="Alt+F"
              onClick={() => executeAction(() => onNavigate('filter'))}
            />
            <MenuItem
              label="Reports"
              shortcut="Alt+R"
              onClick={() => executeAction(() => onNavigate('reports'))}
            />
            <div className="app-menu-divider" />
            <MenuItem
              label="Navigate tab left"
              shortcut="Alt+↑"
              onClick={() => executeAction(() => {
                const tabs = ['activities', 'contacts', 'content', 'filter', 'reports'];
                const idx = tabs.indexOf(tab);
                if (idx > 0) onNavigate(tabs[idx - 1]);
              })}
            />
            <MenuItem
              label="Navigate tab right"
              shortcut="Alt+↓"
              onClick={() => executeAction(() => {
                const tabs = ['activities', 'contacts', 'content', 'filter', 'reports'];
                const idx = tabs.indexOf(tab);
                if (idx < tabs.length - 1) onNavigate(tabs[idx + 1]);
              })}
            />
            <div className="app-menu-divider" />
            <MenuItem
              label="Page forward"
              shortcut="Shift+Alt+→"
              disabled={!isGridTab}
              onClick={() => executeAction(onPageForward, !isGridTab)}
            />
            <MenuItem
              label="Page backward"
              shortcut="Shift+Alt+←"
              disabled={!isGridTab}
              onClick={() => executeAction(onPageBackward, !isGridTab)}
            />
          </div>
        )}
      </div>

      {/* Utilities Menu */}
      <div className="app-menu-container">
        <button
          className={`app-menu-trigger ${openMenu === 'utilities' ? 'open' : ''}`}
          onClick={() => handleMenuClick('utilities')}
        >
          Utilities
        </button>
        {openMenu === 'utilities' && (
          <div className="app-menu-dropdown">
            <div className="app-menu-section-header">View Data</div>
            <MenuItem
              label="Global Lookup"
              shortcut="Alt+G"
              onClick={() => executeAction(onGlobalLookup)}
              indent
            />
            <MenuItem
              label="Focus Search"
              shortcut="Alt+S"
              onClick={() => executeAction(onFocusSearch)}
              indent
            />
            <MenuItem
              label="LinkedIn search via Google"
              shortcut="Alt+L"
              disabled={!isContactsTab}
              onClick={() => executeAction(onLinkedInSearch, !isContactsTab)}
              indent
            />
            <MenuItem
              label="Open URL in new tab"
              shortcut="Alt+U"
              disabled={!hasUrlColumn}
              onClick={() => executeAction(onOpenUrl, !hasUrlColumn)}
              indent
            />
            <MenuItem
              label="Clear all filters"
              shortcut="Alt+X"
              onClick={() => executeAction(onClearFilters)}
              indent
            />
            <div className="app-menu-divider" />
            <div className="app-menu-section-header">Insert / Edit Data</div>
            <MenuItem
              label="LinkedIn Import"
              shortcut="Alt+I"
              onClick={() => executeAction(onLinkedInImport)}
              indent
            />
            <MenuItem
              label="Conference Import"
              shortcut="Alt+K"
              onClick={() => executeAction(onConferenceImport)}
              indent
            />
            <MenuItem
              label="Update record"
              shortcut="Alt+D"
              disabled={!isContactsTab}
              onClick={() => executeAction(onLinkedInUpdate, !isContactsTab)}
              indent
            />
            <MenuItem
              label="Paste data"
              shortcut="Ctrl+Shift+V"
              disabled={!isContactsTab}
              onClick={() => executeAction(onPaste, !isContactsTab)}
              indent
            />
            <MenuItem
              label="Copy data"
              shortcut="Ctrl+C"
              disabled={!isGridTab}
              onClick={() => executeAction(onCopy, !isGridTab)}
              indent
            />
          </div>
        )}
      </div>
    </div>
  );
};

const MenuItem = ({ label, shortcut, onClick, disabled, indent }) => {
  return (
    <div
      className={`app-menu-item ${disabled ? 'disabled' : ''} ${indent ? 'indent' : ''}`}
      onClick={onClick}
    >
      <span className="app-menu-item-label">{label}</span>
      <span className="app-menu-item-shortcut">{shortcut}</span>
    </div>
  );
};

export default AppMenu;
