/**
 * AegisMail synthesises stable IDs for IMAP mailboxes and messages so the
 * rest of the app can treat them as opaque strings.
 *
 *   mailboxId  = "{accountId}::{path}"
 *   messageId  = "{accountId}::{path}::{uid}"
 *
 * "::" is used because colons, slashes and dots all appear in IMAP paths
 * ("INBOX.Sub/folder:weird") and we want a separator that realistically
 * won't.
 */
const SEP = '::';

export function makeMailboxId(accountId: string, path: string): string {
  return `${accountId}${SEP}${path}`;
}

export function parseMailboxId(
  mailboxId: string,
): { accountId: string; path: string } | null {
  const idx = mailboxId.indexOf(SEP);
  if (idx < 0) return null;
  return {
    accountId: mailboxId.slice(0, idx),
    path: mailboxId.slice(idx + SEP.length),
  };
}

export function makeMessageId(accountId: string, path: string, uid: number): string {
  return `${accountId}${SEP}${path}${SEP}${uid}`;
}

export function parseMessageId(
  messageId: string,
): { accountId: string; path: string; uid: number } | null {
  const lastSep = messageId.lastIndexOf(SEP);
  if (lastSep < 0) return null;
  const uidStr = messageId.slice(lastSep + SEP.length);
  const uid = Number.parseInt(uidStr, 10);
  if (!Number.isFinite(uid) || uid <= 0) return null;

  const left = messageId.slice(0, lastSep);
  const firstSep = left.indexOf(SEP);
  if (firstSep < 0) return null;

  return {
    accountId: left.slice(0, firstSep),
    path: left.slice(firstSep + SEP.length),
    uid,
  };
}
