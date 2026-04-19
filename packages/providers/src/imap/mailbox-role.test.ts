import { describe, it, expect } from 'vitest';
import { inferRole } from './mailbox-role.ts';

describe('inferRole', () => {
  it('prefers RFC 6154 special-use flags', () => {
    expect(inferRole('Whatever', '\\Inbox')).toBe('inbox');
    expect(inferRole('Whatever', '\\Sent')).toBe('sent');
    expect(inferRole('Whatever', '\\Drafts')).toBe('drafts');
    expect(inferRole('Whatever', '\\Trash')).toBe('trash');
    expect(inferRole('Whatever', '\\Archive')).toBe('archive');
    expect(inferRole('Whatever', '\\Junk')).toBe('spam');
  });

  it('falls back to path matching case-insensitively', () => {
    expect(inferRole('INBOX', undefined)).toBe('inbox');
    expect(inferRole('Sent Messages', null)).toBe('sent');
    expect(inferRole('Drafts', undefined)).toBe('drafts');
    expect(inferRole('Deleted Messages', undefined)).toBe('trash');
    expect(inferRole('Archive/2024', undefined)).toBe('archive');
    expect(inferRole('Junk', undefined)).toBe('spam');
  });

  it('returns "other" for unknown paths', () => {
    expect(inferRole('Projects/Alpha', undefined)).toBe('other');
    expect(inferRole('[Gmail]/Important', undefined)).toBe('other');
  });
});
