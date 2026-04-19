import { z } from 'zod';

export const ImapAccountConfig = z.object({
  host: z.string().min(1),
  port: z.number().int().positive().default(993),
  secure: z.boolean().default(true),
  username: z.string().min(1),
  smtp: z
    .object({
      host: z.string().min(1),
      port: z.number().int().positive().default(465),
      secure: z.boolean().default(true),
    })
    .optional(),
});
export type ImapAccountConfig = z.infer<typeof ImapAccountConfig>;

export interface ImapCredentials {
  username: string;
  password: string;
}

export const ICLOUD_IMAP: Pick<ImapAccountConfig, 'host' | 'port' | 'secure'> = {
  host: 'imap.mail.me.com',
  port: 993,
  secure: true,
};

export const ICLOUD_SMTP = {
  host: 'smtp.mail.me.com',
  port: 587,
  secure: false,
} as const;

export const FASTMAIL_IMAP: Pick<ImapAccountConfig, 'host' | 'port' | 'secure'> = {
  host: 'imap.fastmail.com',
  port: 993,
  secure: true,
};
