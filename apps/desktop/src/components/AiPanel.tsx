import { Sparkles, X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext.tsx';

interface Props {
  onClose: () => void;
}

export function AiPanel({ onClose }: Props) {
  const { theme } = useTheme();

  return (
    <aside
      className="w-[380px] shrink-0 flex flex-col"
      style={{ background: theme.panel, borderLeft: `1px solid ${theme.border}` }}
    >
      <div
        className="px-4 py-3.5 flex items-center gap-2.5"
        style={{ borderBottom: `1px solid ${theme.border}` }}
      >
        <span
          className="w-6 h-6 rounded-md flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${theme.accent}, #EC4899)`,
          }}
        >
          <Sparkles size={13} color="#FFFFFF" />
        </span>
        <div className="flex-1">
          <div className="text-[13px] font-bold" style={{ color: theme.text }}>
            AI Assistant
          </div>
          <div className="text-[10px]" style={{ color: theme.textDim }}>
            via MCP · cross-account
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{ color: theme.textDim }}
          aria-label="Close AI panel"
        >
          <X size={14} />
        </button>
      </div>

      <div
        className="flex-1 overflow-y-auto p-4 flex flex-col gap-3"
        style={{ color: theme.text }}
      >
        <div
          className="p-3 rounded-lg text-[12.5px] leading-relaxed"
          style={{
            background: theme.panelAlt,
            border: `1px dashed ${theme.border}`,
          }}
        >
          <div className="font-semibold mb-1.5">Coming in the next session.</div>
          <p style={{ color: theme.textDim }}>
            The MCP stdio server already exists and exposes four tools:{' '}
            <code>mail_list_accounts</code>, <code>mail_list_mailboxes</code>,{' '}
            <code>mail_list_messages</code>, <code>mail_get_message</code>. Today
            you can point Claude Desktop at it via the config in{' '}
            <code>packages/mcp/README.md</code> and chat with your mail from
            there.
          </p>
          <p className="mt-2" style={{ color: theme.textDim }}>
            An in-app chat that calls those same tools is Phase 10 — it needs an
            Anthropic API key flow (stored in the Keychain, refreshable, with
            streaming), which is substantial enough to deserve its own session
            rather than a half-baked one here.
          </p>
        </div>

        <div className="text-[11px]" style={{ color: theme.textDim }}>
          Planned capabilities:
        </div>
        <ul
          className="text-[12px] space-y-1.5 list-disc pl-5"
          style={{ color: theme.text }}
        >
          <li>"Summarise this thread"</li>
          <li>"What needs my attention today?"</li>
          <li>"Draft a reply to Hannah about phase 3"</li>
          <li>"Show me emails awaiting my reply"</li>
          <li>Message classification into smart groups</li>
        </ul>
      </div>
    </aside>
  );
}
