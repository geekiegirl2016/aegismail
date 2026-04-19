import type { Mailbox } from '@aegismail/core';

type Role = Mailbox['role'];

/**
 * Infer a cross-provider role for a mailbox. Prefer RFC 6154 special-use
 * flags; fall back to well-known English names.
 */
export function inferRole(
  path: string,
  specialUse: string | null | undefined,
): Role {
  switch (specialUse) {
    case '\\Inbox':
      return 'inbox';
    case '\\Sent':
      return 'sent';
    case '\\Drafts':
      return 'drafts';
    case '\\Trash':
      return 'trash';
    case '\\Archive':
      return 'archive';
    case '\\Junk':
      return 'spam';
    default:
      break;
  }

  const lower = path.toLowerCase();
  if (lower === 'inbox') return 'inbox';
  if (lower.includes('sent')) return 'sent';
  if (lower.includes('draft')) return 'drafts';
  if (lower.includes('trash') || lower.includes('bin') || lower.includes('deleted'))
    return 'trash';
  if (lower.includes('archive')) return 'archive';
  if (lower.includes('junk') || lower.includes('spam')) return 'spam';
  return 'other';
}
