#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolRequest,
} from '@modelcontextprotocol/sdk/types.js';
import { login } from './client.js';
import { TOOLS, callTool } from './tools.js';

const server = new Server(
  { name: 'claudio', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req: CallToolRequest) => {
  const { name, arguments: args } = req.params;
  try {
    const result = await callTool(name, (args ?? {}) as Record<string, unknown>);
    return { content: [{ type: 'text', text: result }] };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: 'text', text: `Erro: ${msg}` }],
      isError: true,
    };
  }
});

async function main() {
  try {
    await login();
  } catch (err) {
    process.stderr.write(`[claudio-mcp] Falha na autenticação: ${(err as Error).message}\n`);
    process.exit(1);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write('[claudio-mcp] Servidor iniciado.\n');
}

main().catch((err) => {
  process.stderr.write(`[claudio-mcp] Erro fatal: ${err}\n`);
  process.exit(1);
});
