import { timingSafeEqual } from "node:crypto";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createServer } from "./server.js";

/** Constant-time bearer check. An unset or empty expected token rejects everything. */
export function isAuthorized(req: Request, expected: string | undefined): boolean {
  if (!expected) return false;
  const header = req.headers.get("authorization") ?? "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Stateless Streamable HTTP handler: one server and transport per request, JSON responses, no SSE.
 * Runtime-agnostic (Web Request/Response), so it runs on Netlify, Cloudflare Workers, Deno or Bun.
 */
export async function handleMcpRequest(req: Request, expectedToken: string | undefined): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } });
  }
  if (!isAuthorized(req, expectedToken)) {
    return new Response("Unauthorized", { status: 401, headers: { "WWW-Authenticate": "Bearer" } });
  }

  const server = createServer();
  // No sessionIdGenerator: the transport runs stateless, which serverless hosts require.
  const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true });
  await server.connect(transport);
  return transport.handleRequest(req);
}
