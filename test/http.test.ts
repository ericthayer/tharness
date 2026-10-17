import { test } from "node:test";
import assert from "node:assert/strict";
import { handleMcpRequest } from "../src/http.js";

const TOKEN = "test-token";
const URL_ = "https://example.test/mcp";

function rpc(body: unknown, auth: string | null = `Bearer ${TOKEN}`): Request {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
  };
  if (auth) headers.authorization = auth;
  return new Request(URL_, { method: "POST", headers, body: JSON.stringify(body) });
}

const initialize = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "0" } },
};

test("rejects non-POST", async () => {
  const res = await handleMcpRequest(new Request(URL_), TOKEN);
  assert.equal(res.status, 405);
});

test("rejects missing, wrong, and unconfigured tokens", async () => {
  assert.equal((await handleMcpRequest(rpc(initialize, null), TOKEN)).status, 401);
  assert.equal((await handleMcpRequest(rpc(initialize, "Bearer wrong"), TOKEN)).status, 401);
  assert.equal((await handleMcpRequest(rpc(initialize), undefined)).status, 401);
});

test("initializes and calls a tool statelessly", async () => {
  const init = await handleMcpRequest(rpc(initialize), TOKEN);
  assert.equal(init.status, 200);
  const initBody = (await init.json()) as { result: { serverInfo: { name: string } } };
  assert.equal(initBody.result.serverInfo.name, "agent-gateway");

  const call = await handleMcpRequest(
    rpc({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "get_token", arguments: { name: "color.accent" } } }),
    TOKEN,
  );
  assert.equal(call.status, 200);
  const callBody = (await call.json()) as { result: { structuredContent: { token: { resolvedValue: string } } } };
  assert.equal(callBody.result.structuredContent.token.resolvedValue, "#2563EB");
});
