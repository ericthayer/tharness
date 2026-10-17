import { test } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server.js";
import { flattenTokens } from "../src/tokens.js";

async function connect(): Promise<Client> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await createServer().connect(serverTransport);
  const client = new Client({ name: "test", version: "0.0.0" });
  await client.connect(clientTransport);
  return client;
}

test("flattenTokens inherits group $type and resolves aliases", () => {
  const tokens = flattenTokens({
    color: { $type: "color", base: { $value: "#000" }, alias: { $value: "{color.base}" }, loop: { $value: "{color.loop}" } },
  });
  assert.equal(tokens.get("color.base")?.type, "color");
  assert.equal(tokens.get("color.alias")?.resolvedValue, "#000");
  assert.equal(tokens.get("color.loop")?.resolvedValue, null);
});

test("lists the two tools and the tokens resource", async () => {
  const client = await connect();
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), ["get_token", "list_tokens"]);
  const { resources } = await client.listResources();
  assert.deepEqual(resources.map((r) => r.uri), ["tokens://all"]);
});

test("get_token resolves an alias", async () => {
  const client = await connect();
  const result = await client.callTool({ name: "get_token", arguments: { name: "color.primary" } });
  const data = result.structuredContent as { found: boolean; token: { resolvedValue: string } };
  assert.equal(data.found, true);
  assert.equal(data.token.resolvedValue, "#1F2937");
});

test("get_token reports a miss without erroring", async () => {
  const client = await connect();
  const result = await client.callTool({ name: "get_token", arguments: { name: "nope" } });
  assert.deepEqual(result.structuredContent, { found: false, token: null });
});

test("list_tokens filters by prefix and type", async () => {
  const client = await connect();
  const byPrefix = await client.callTool({ name: "list_tokens", arguments: { prefix: "space" } });
  assert.deepEqual((byPrefix.structuredContent as { names: string[] }).names, ["space.1", "space.2", "space.4"]);
  const byType = await client.callTool({ name: "list_tokens", arguments: { type: "fontFamily" } });
  assert.deepEqual((byType.structuredContent as { names: string[] }).names, ["font.family.sans"]);
});
