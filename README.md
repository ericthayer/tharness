# Agent Gateway

One MCP server that serves design-system data to any agentic host. Remote hosts (cloud sessions, Copilot, Claude Code, anything that takes an MCP URL) use the Streamable HTTP endpoint; local-only hosts run the same server over stdio.

| Piece | File | Notes |
| --- | --- | --- |
| Server factory | `src/server.ts` | Registers tools and resources. Shared by both entry points |
| Token source | `src/tokens.ts`, `data/tokens.json` | W3C DTCG tokens, flattened to dot paths, aliases resolved |
| HTTP handler | `src/http.ts` | Stateless, JSON responses, constant-time bearer auth. Web `Request`/`Response`, so it ports to Workers, Deno or Bun |
| Remote entry | `netlify/functions/mcp.ts` | Mounts the handler at `/mcp` with a per-IP rate limit |
| Local entry | `src/stdio.ts` | Same factory over stdio |

## Tools and resources

| Name | Kind | Purpose |
| --- | --- | --- |
| `get_token` | tool | One token by name (`color.primary`), with its resolved value |
| `list_tokens` | tool | Token names, filtered by `prefix` and/or DTCG `type` |
| `tokens://all` | resource | The whole flattened token map |

`data/tokens.json` holds placeholder tokens. Replace it with your design system's DTCG export.

## Develop

```sh
npm install
npm test          # in-memory MCP client + HTTP handler tests
npm run typecheck
npm run inspect   # MCP Inspector against the stdio server
```

## Deploy (Netlify)

1. Link the repo to a Netlify site.
2. Set `MCP_TOKEN` as an environment variable (a long random string). Never commit it. With no token set, every request gets a 401.
3. Deploy. The endpoint is `https://<site>/mcp`.

Constraints: stateless only (GET/SSE return 405, no memory between requests), and clients must send `Accept: application/json, text/event-stream`. Conforming MCP clients already do.

## Connect a host

| Host | How |
| --- | --- |
| Claude Code | `claude mcp add --transport http agent-gateway https://<site>/mcp --header "Authorization: Bearer <token>"` |
| VS Code Copilot | `.vscode/mcp.json`: `{ "servers": { "agent-gateway": { "type": "http", "url": "https://<site>/mcp", "headers": { "Authorization": "Bearer ${input:mcp-token}" } } }, "inputs": [{ "id": "mcp-token", "type": "promptString", "password": true, "description": "Gateway token" }] }` |
| Local stdio hosts | command `npx tsx src/stdio.ts` (or `node dist/src/stdio.js` after `npm run build`) |
| claude.ai custom connectors | Expect OAuth or no auth, not a static bearer header. Needs an OAuth layer before it works here |

## Next

- Swap in the real token source.
- Add `get_component_contract` and `validate_against_system` once there is a component manifest to serve.
- Add `skills/` and a build script that emits per-host manifests and `AGENTS.md`.
