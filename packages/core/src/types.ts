import { z } from 'zod';

export const AccountProvider = z.enum(['outlook', 'gmail', 'icloud']);
export type AccountProvider = z.infer<typeof AccountProvider>;

export const Account = z.object({
  id: z.string(),
  provider: AccountProvider,
  displayName: z.string(),
  emailAddress: z.string().email(),
  createdAt: z.string().datetime(),
});
export type Account = z.infer<typeof Account>;

export const EmailAddress = z.object({
  name: z.string().optional(),
  address: z.string().email(),
});
export type EmailAddress = z.infer<typeof EmailAddress>;

export const Mailbox = z.object({
  id: z.string(),
  accountId: z.string(),
  name: z.string(),
  role: z
    .enum(['inbox', 'sent', 'drafts', 'trash', 'archive', 'spam', 'other'])
    .default('other'),
  unreadCount: z.number().int().nonnegative().default(0),
  totalCount: z.number().int().nonnegative().default(0),
});
export type Mailbox = z.infer<typeof Mailbox>;

export const Message = z.object({
  id: z.string(),
  accountId: z.string(),
  mailboxId: z.string(),
  threadId: z.string().optional(),
  from: EmailAddress,
  to: z.array(EmailAddress).default([]),
  cc: z.array(EmailAddress).default([]),
  bcc: z.array(EmailAddress).default([]),
  subject: z.string().default(''),
  snippet: z.string().default(''),
  bodyText: z.string().optional(),
  bodyHtml: z.string().optional(),
  receivedAt: z.string().datetime(),
  isRead: z.boolean().default(false),
  isFlagged: z.boolean().default(false),
  hasAttachments: z.boolean().default(false),
});
export type Message = z.infer<typeof Message>;

export const DraftMessage = Message.pick({
  to: true,
  cc: true,
  bcc: true,
  subject: true,
  bodyText: true,
  bodyHtml: true,
}).extend({
  accountId: z.string(),
  inReplyToId: z.string().optional(),
});
export type DraftMessage = z.infer<typeof DraftMessage>;
