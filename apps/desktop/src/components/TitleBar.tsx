import { useEffect, useRef } from 'react';
import { Inbox, Search, Settings, Sparkles } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext.tsx';

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  onOpenSettings: () => void;
  aiOpen: boolean;
  onToggleAi: () => void;
}

export function TitleBar(props: Props) {
  const { search, onSearchChange, onOpenSettings, aiOpen, onToggleAi } = props;
  const { theme } = useTheme();
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div
      className="h-10 flex items-center gap-3 px-4 shrink-0"
      style={{ background: theme.panel, borderBottom: `1px solid ${theme.border}` }}
      data-tauri-drag-region
    >
      {/* Tauri already renders native window controls on macOS — spacer to avoid overlap */}
      <div className="w-16" />

      <div className="flex items-center gap-2">
        <span
          className="w-6 h-6 rounded-md flex items-center justify-center"
          style={{ background: theme.accent }}
        >
          <Inbox size={14} color={theme.accentContrast} />
        </span>
        <span className="text-[13px] font-semibold tracking-tight" style={{ color: theme.text }}>
          AegisMail
        </span>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded border tabular-nums"
          style={{
            color: theme.textDim,
            background: theme.panelAlt,
            borderColor: theme.border,
          }}
        >
          v0.1 · AGPL-3.0
        </span>
      </div>

      <div className="flex-1" />

      <div className="relative w-80 max-w-full">
        <Search
          size={13}
          className="absolute left-2.5 top-1/2 -translate-y-1/2"
          style={{ color: theme.textDim }}
        />
        <input
          ref={searchRef}
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search mail… (⌘K)"
          className="w-full rounded-md pl-7 pr-3 py-1.5 text-xs outline-none border"
          style={{
            background: theme.panelAlt,
            borderColor: theme.border,
            color: theme.text,
          }}
        />
      </div>

      <button
        type="button"
        onClick={onOpenSettings}
        className="p-1 rounded"
        style={{ color: theme.textDim }}
        title="Settings"
      >
        <Settings size={16} />
      </button>

      <button
        type="button"
        onClick={onToggleAi}
        className="flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium"
        style={{
          background: aiOpen ? theme.accent : 'transparent',
          color: aiOpen ? theme.accentContrast : theme.textDim,
          borderColor: aiOpen ? theme.accent : theme.border,
        }}
      >
        <Sparkles size={12} /> AI
      </button>
    </div>
  );
}
