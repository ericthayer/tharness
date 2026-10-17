import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { TOKENS, type Token } from "./tokens.js";

export const SERVER_NAME = "agent-gateway";
export const SERVER_VERSION = "0.1.0";

const tokenShape = {
  name: z.string(),
  type: z.string().nullable(),
  value: z.unknown(),
  resolvedValue: z.unknown(),
  description: z.string().nullable(),
};

function asResult<T extends Record<string, unknown>>(data: T) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data) }], structuredContent: data };
}

/** Builds the gateway. Both entry points (remote HTTP and local stdio) share this factory. */
export function createServer(tokens: ReadonlyMap<string, Token> = TOKENS): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

  server.registerTool(
    "get_token",
    {
      title: "Get design token",
      description: "Return one design token by dot-path name (e.g. color.primary), with aliases resolved.",
      inputSchema: { name: z.string().min(1) },
      outputSchema: { found: z.boolean(), token: z.object(tokenShape).nullable() },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ name }) => {
      const token = tokens.get(name) ?? null;
      return asResult({ found: token !== null, token });
    },
  );

  server.registerTool(
    "list_tokens",
    {
      title: "List design tokens",
      description: "List token names, optionally filtered by a dot-path prefix (e.g. color) and/or DTCG $type.",
      inputSchema: { prefix: z.string().optional(), type: z.string().optional() },
      outputSchema: { count: z.number(), names: z.array(z.string()) },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ prefix, type }) => {
      const names = [...tokens.values()]
        .filter((t) => !prefix || t.name === prefix || t.name.startsWith(`${prefix}.`))
        .filter((t) => !type || t.type === type)
        .map((t) => t.name)
        .sort();
      return asResult({ count: names.length, names });
    },
  );

  server.registerResource(
    "tokens",
    "tokens://all",
    { title: "All design tokens", description: "Flattened token map with aliases resolved", mimeType: "application/json" },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(Object.fromEntries(tokens)) }],
    }),
  );

  return server;
}
