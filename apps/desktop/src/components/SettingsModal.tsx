import { X, Palette, LayoutGrid, Keyboard } from 'lucide-react';
import { THEMES, type ThemeKey, type Density } from '../themes.ts';
import { useTheme } from '../contexts/ThemeContext.tsx';

interface Props {
  onClose: () => void;
}

const DENSITIES: Density[] = ['compact', 'comfortable', 'spacious'];

const SHORTCUTS: [string, string][] = [
  ['⌘K', 'Focus search'],
  ['E', 'Archive'],
  ['Del / Backspace', 'Move to Trash'],
  ['S', 'Flag / unflag'],
  ['⇧⌘U', 'Mark as unread'],
  ['⌘N', 'Compose (coming soon)'],
  ['⌘R', 'Reply (coming soon)'],
];

function SectionLabel({ children, icon: Icon }: { children: string; icon: typeof Palette }) {
  const { theme } = useTheme();
  return (
    <div
      className="flex items-center gap-1.5 text-[11px] font-bold tracking-widest mb-2.5"
      style={{ color: theme.textDim }}
    >
      <Icon size={12} />
      {children}
    </div>
  );
}

export function SettingsModal({ onClose }: Props) {
  const { theme, themeKey, setTheme, density, setDensity } = useTheme();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-[520px] max-w-[90vw] max-h-[80vh] overflow-y-auto rounded-xl p-6 border"
        style={{ background: theme.panel, borderColor: theme.border, color: theme.text }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            style={{ color: theme.textDim }}
            aria-label="Close settings"
          >
            <X size={16} />
          </button>
        </div>

        <section className="mb-6">
          <SectionLabel icon={Palette}>THEME</SectionLabel>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(THEMES) as ThemeKey[]).map((k) => {
              const t = THEMES[k];
              const active = themeKey === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTheme(k)}
                  className="p-2.5 rounded-lg text-left text-xs border-2"
                  style={{
                    background: t.bg,
                    borderColor: active ? t.accent : theme.border,
                    color: t.text,
                  }}
                >
                  <div className="flex gap-1 mb-1.5">
                    <span
                      className="w-3.5 h-3.5 rounded-sm"
                      style={{ background: t.accent }}
                    />
                    <span
                      className="w-3.5 h-3.5 rounded-sm border"
                      style={{ background: t.panel, borderColor: t.border }}
                    />
                    <span
                      className="w-3.5 h-3.5 rounded-sm"
                      style={{ background: t.panelAlt }}
                    />
                  </div>
                  {t.name}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mb-6">
          <SectionLabel icon={LayoutGrid}>DENSITY</SectionLabel>
          <div className="flex gap-2">
            {DENSITIES.map((d) => {
              const active = density === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDensity(d)}
                  className="flex-1 rounded-md px-3 py-2 text-xs capitalize border"
                  style={{
                    background: active ? theme.accent : theme.panelAlt,
                    color: active ? theme.accentContrast : theme.text,
                    borderColor: active ? theme.accent : theme.border,
                  }}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <SectionLabel icon={Keyboard}>SHORTCUTS</SectionLabel>
          <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-xs">
            {SHORTCUTS.map(([key, label]) => (
              <div
                key={key}
                className="col-span-2 grid grid-cols-subgrid items-center py-1.5"
                style={{ borderBottom: `1px solid ${theme.border}` }}
              >
                <dt>{label}</dt>
                <dd>
                  <kbd
                    className="text-[10px] px-1.5 py-0.5 rounded border font-mono"
                    style={{ background: theme.panelAlt, borderColor: theme.border }}
                  >
                    {key}
                  </kbd>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}
