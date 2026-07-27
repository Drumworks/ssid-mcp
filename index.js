#!/usr/bin/env node
/**
 * ssid-mcp — standalone, publishable MCP server for agent hosts.
 *
 * Unlike the in-repo mcp/server.ts (which reads the local DB), this package calls
 * the HOSTED public API (https://ssid.ai/api/v1/lookup) so `npx -y ssid-mcp` works
 * with zero local data. One tool: lookup_mac. No API key needed for the free tier;
 * set SSID_API_KEY to raise limits.
 *
 * NOT YET PUBLISHED — publishing to npm + the MCP registries (growth G1) is gated on
 * the G19 paid-agent validation and the 6201 license. This is publish-ready.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE = process.env.SSID_API_BASE || "https://ssid.ai";
const API_KEY = process.env.SSID_API_KEY || "";

async function lookup(mac) {
  const url = `${BASE}/api/v1/lookup?mac=${encodeURIComponent(mac)}`;
  const headers = API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {};
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`SSID API error ${res.status}`);
  return res.json();
}

async function main() {
  const server = new McpServer({ name: "ssid", version: "0.1.0" });

  server.registerTool(
    "lookup_mac",
    {
      title: "MAC / OUI vendor lookup",
      description:
        "Identify the manufacturer (vendor) behind a MAC address from its OUI, and detect randomized/private (locally-administered) addresses used by modern phones. Returns vendor, OUI, kind, randomized flag, confidence and the source.",
      inputSchema: { mac: z.string().describe("A MAC address in any format, e.g. F4:F5:E8:11:22:33") },
    },
    async ({ mac }) => {
      try {
        const data = await lookup(mac);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: "text", text: `Lookup failed: ${e.message}` }], isError: true };
      }
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[ssid-mcp] ready on stdio");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
