import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

export const mailToolDefinitions = [
  {
    name: 'mail.list_accounts',
    description: 'List connected mail accounts across all providers.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'mail.search',
    description: 'Search messages across one or more accounts.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Free-text search query.' },
        accountId: {
          type: 'string',
          description: 'Optional: restrict to a single account.',
        },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 25 },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  {
    name: 'mail.get_message',
    description: 'Fetch a single message by id.',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string' },
        messageId: { type: 'string' },
      },
      required: ['accountId', 'messageId'],
      additionalProperties: false,
    },
  },
  {
    name: 'mail.send',
    description: 'Send a new message from a given account.',
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string' },
        to: { type: 'array', items: { type: 'string' }, minItems: 1 },
        cc: { type: 'array', items: { type: 'string' } },
        bcc: { type: 'array', items: { type: 'string' } },
        subject: { type: 'string' },
        bodyText: { type: 'string' },
      },
      required: ['accountId', 'to', 'subject'],
      additionalProperties: false,
    },
  },
] as const;

export function registerMailTools(server: Server): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: mailToolDefinitions.map((t) => ({ ...t })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    return {
      content: [
        {
          type: 'text',
          text: `Tool "${req.params.name}" is not yet implemented.`,
        },
      ],
      isError: true,
    };
  });
}
