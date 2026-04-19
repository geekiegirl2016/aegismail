import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import type { Message } from '@aegismail/core';
import type { AegisApiClient } from './client.ts';

const Args = {
  listAccounts: z.object({}).strict(),
  listMailboxes: z.object({ accountId: z.string().min(1) }).strict(),
  listMessages: z
    .object({
      accountId: z.string().min(1),
      mailboxId: z.string().min(1),
      limit: z.number().int().min(1).max(100).optional(),
      pageToken: z.string().optional(),
    })
    .strict(),
  getMessage: z
    .object({
      accountId: z.string().min(1),
      messageId: z.string().min(1),
    })
    .strict(),
};

export const mailToolDefinitions = [
  {
    name: 'mail_list_accounts',
    description:
      'List all mail accounts the user has connected in AegisMail. Returns account id, provider, display name, and email address.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'mail_list_mailboxes',
    description:
      'List mailboxes (folders) for a given account. Use this to find the INBOX id before listing messages.',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'Account id from mail_list_accounts.' },
      },
      required: ['accountId'],
      additionalProperties: false,
    },
  },
  {
    name: 'mail_list_messages',
    description:
      'List recent messages in a mailbox, newest first. Returns envelope-level metadata (from, subject, date, read/unread) without message bodies. Use mail_get_message to read a full message.',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string' },
        mailboxId: {
          type: 'string',
          description: 'Mailbox id from mail_list_mailboxes.',
        },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          default: 25,
          description: 'Max messages to return.',
        },
        pageToken: {
          type: 'string',
          description: 'Opaque cursor from a previous response for the next page.',
        },
      },
      required: ['accountId', 'mailboxId'],
      additionalProperties: false,
    },
  },
  {
    name: 'mail_get_message',
    description:
      'Fetch one full message by id, including the plain-text body and sender/recipient details.',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string' },
        messageId: {
          type: 'string',
          description: 'Message id from mail_list_messages.',
        },
      },
      required: ['accountId', 'messageId'],
      additionalProperties: false,
    },
  },
] as const;

function jsonResult(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
  };
}

function errorResult(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return {
    content: [{ type: 'text' as const, text: `Error: ${message}` }],
    isError: true,
  };
}

/**
 * Trim a Message for Claude: bodies can be huge, and for LLM consumption
 * plain text is almost always preferable to HTML. We truncate to keep
 * tool responses compact.
 */
function trimMessage(m: Message, maxBody = 16_000): Message {
  const trimmed = { ...m };
  if (trimmed.bodyHtml) {
    delete (trimmed as Partial<Message>).bodyHtml;
  }
  if (trimmed.bodyText && trimmed.bodyText.length > maxBody) {
    trimmed.bodyText = `${trimmed.bodyText.slice(0, maxBody)}\n\n[truncated]`;
  }
  return trimmed;
}

export function registerMailTools(server: Server, client: AegisApiClient): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: mailToolDefinitions.map((t) => ({ ...t })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: rawArgs } = req.params;
    try {
      switch (name) {
        case 'mail_list_accounts': {
          Args.listAccounts.parse(rawArgs ?? {});
          const accounts = await client.listAccounts();
          return jsonResult({ accounts });
        }
        case 'mail_list_mailboxes': {
          const args = Args.listMailboxes.parse(rawArgs);
          const mailboxes = await client.listMailboxes(args.accountId);
          return jsonResult({ mailboxes });
        }
        case 'mail_list_messages': {
          const args = Args.listMessages.parse(rawArgs);
          const { limit, pageToken, ...rest } = args;
          const options: { limit?: number; pageToken?: string } = {};
          if (limit !== undefined) options.limit = limit;
          if (pageToken !== undefined) options.pageToken = pageToken;
          const result = await client.listMessages(rest.accountId, rest.mailboxId, options);
          // Strip bodies in list view (they're empty anyway, but be defensive).
          const compact = result.messages.map((m) => {
            const { bodyHtml: _h, bodyText: _t, ...keep } = m;
            return keep;
          });
          return jsonResult({
            messages: compact,
            nextPageToken: result.nextPageToken,
          });
        }
        case 'mail_get_message': {
          const args = Args.getMessage.parse(rawArgs);
          const message = await client.getMessage(args.accountId, args.messageId);
          return jsonResult({ message: trimMessage(message) });
        }
        default:
          return errorResult(`Unknown tool: ${name}`);
      }
    } catch (err) {
      return errorResult(err);
    }
  });
}
