#!/usr/bin/env node
/**
 * ssid-mcp — standalone, publishable MCP server for agent hosts.
 *
 * Unlike the in-repo mcp/server.ts (which reads the local DB), this package calls
 * the HOSTED public API (https://ssid.ai/api/v1/lookup) so `npx -y ssid-mcp` works
 * with zero local data. Two tools: lookup_mac (read) and submit_correction (write,
 * queued for human/compile-engine verification — never auto-applied). No API key
 * needed for the free tier; set SSID_API_KEY to raise limits.
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

async function submitCorrection({ slug, field, proposedValue, sourceUrl }) {
  const res = await fetch(`${BASE}/api/corrections`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ slug, field, proposedValue, sourceUrl }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(
      data.error || `Correction rejected (HTTP ${res.status}) — check field name and that sourceUrl is an official https page.`,
    );
  }
  return data;
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

  server.registerTool(
    "submit_correction",
    {
      title: "Propose a router default-login correction",
      description:
        "Propose a fix to a router model's default gateway IP, username, password, credential type, or reset steps on ssid.ai. Requires an official manufacturer source URL (never an aggregator/forum). Queued for verification — never applied automatically. Use the router's slug from ssid.ai/routers/<slug>.",
      inputSchema: {
        slug: z.string().describe("The router's ssid.ai slug, e.g. 'tp-link-archer-ax55'"),
        field: z
          .enum(["defaultGatewayIp", "defaultUsername", "defaultPassword", "credType", "resetSteps"])
          .describe("Which field is wrong"),
        proposedValue: z.string().max(500).describe("The correct value, per the cited source"),
        sourceUrl: z.string().url().describe("Official https manufacturer source confirming the correct value"),
      },
    },
    async (input) => {
      try {
        const data = await submitCorrection(input);
        return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
      } catch (e) {
        return { content: [{ type: "text", text: `Submission failed: ${e.message}` }], isError: true };
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
