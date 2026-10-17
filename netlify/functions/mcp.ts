import type { Config } from "@netlify/functions";
import { handleMcpRequest } from "../../src/http.js";

export default (req: Request): Promise<Response> => handleMcpRequest(req, process.env.MCP_TOKEN);

export const config: Config = {
  path: "/mcp",
  rateLimit: { windowSize: 60, windowLimit: 100, aggregateBy: ["ip"] },
};
