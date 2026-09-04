#!/usr/bin/env node
/**
 * ssid-mcp — standalone, publishable MCP server for agent hosts.
 *
 * Unlike the in-repo mcp/server.ts (which reads the local DB), this package calls the
 * HOSTED public API (https://ssid.ai/api/v1/*) so `npx -y ssid-mcp` works with zero local
 * data. Four tools:
 *
 *   get_router_defaults      manufacturer-cited factory login for a router model (read)
 *   check_router_compliance  does the model still ship a universal default password (read)
 *   lookup_mac               MAC/OUI → vendor, with randomized-address detection (read)
 *   submit_correction        propose a fix, queued for verification — never auto-applied (write)
 *
 * No API key needed for the free tier; set SSID_API_KEY to raise limits.
 */
import { createRequire } from "node:module";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE = (process.env.SSID_API_BASE || "https://ssid.ai").replace(/\/+$/, "");
const API_KEY = process.env.SSID_API_KEY || "";

// One version, read from package.json: the McpServer handshake, the User-Agent, and npm all
// agree. (0.2.0 shipped with the handshake hardcoded at "0.1.0".) The User-Agent is what lets
// ssid.ai bucket a call as `source = mcp` — it is the instrument behind the package's own
// success metric, so every outbound request goes through api() below.
const { version: VERSION } = createRequire(import.meta.url)("./package.json");
const UA = `ssid-mcp/${VERSION}`;
const TIMEOUT_MS = 10_000;

/** Every fetch the package makes. Sets the UA, the key, JSON accept, and a hard 10 s timeout. */
async function api(path, init = {}) {
  const headers = { "user-agent": UA, accept: "application/json", ...(init.headers ?? {}) };
  if (API_KEY) headers.authorization = `Bearer ${API_KEY}`;
  return fetch(`${BASE}${path}`, { ...init, headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
}

/** Read a JSON body without ever throwing — a non-JSON error page becomes {}. */
async function body(res) {
  return res.json().catch(() => ({}));
}

/** Tool result helpers. Errors are next actions, never stack traces. */
const ok = (data) => ({ content: [{ type: "text", text: JSON.stringify(data, null, 2) }] });
const fail = (text) => ({ content: [{ type: "text", text }], isError: true });

/** `rateLimit: {limit, remaining, tier}` from the response headers, so a metered caller can pace itself. */
function rateLimit(res) {
  const num = (v) => (v === null || v === "unlimited" ? v : Number(v));
  return {
    limit: num(res.headers.get("x-ratelimit-limit")),
    remaining: num(res.headers.get("x-ratelimit-remaining")),
    tier: res.headers.get("x-ssid-tier"),
  };
}

/** Text for a 404 from either device endpoint. The count is live (from the API), not a claim. */
function notFoundText(what, data) {
  const size = data?.directorySize ? ` (${data.directorySize} models)` : "";
  return `Not found: no router "${what}" in the ssid.ai directory${size}. Try the slug from ssid.ai/routers, or submit_correction is not for adding models.`;
}

/** Text for a 429: the API's own `upgrade` line and `support` address, verbatim. */
function rateLimitedText(data) {
  const parts = [`Rate limited by ssid.ai (${data?.reason ?? "limit"}, tier ${data?.tier ?? "anonymous"})`];
  if (data?.upgrade) parts.push(data.upgrade);
  if (data?.support) parts.push(`Support: ${data.support}`);
  return parts.join(". ");
}

/**
 * Fetch one device record by slug, or by brand+model through the resolve endpoint. Returns
 * `{ data, res }` on 200, or `{ error }` (a ready tool result) on anything else. Never throws.
 */
async function fetchDevice({ slug, brand, model }) {
  let res;
  try {
    if (slug) {
      res = await api(`/api/v1/device/${encodeURIComponent(slug)}`);
    } else {
      const q = new URLSearchParams({ brand, model });
      // The UA comment marks the resolve path so ssid.ai can report the resolve share of
      // router calls (a resolve-heavy ratio means brand+model matching is failing). The
      // product token stays `ssid-mcp/<version>`, which is what buckets the call as mcp.
      res = await api(`/api/v1/device?${q}`, { headers: { "user-agent": `${UA} (resolve)` } });
    }
  } catch (e) {
    return { error: fail(`ssid.ai unreachable: ${e?.cause?.code ?? e?.message ?? "fetch failed"}`) };
  }
  const what = slug ?? `${brand} ${model}`;
  if (res.status === 404) return { error: fail(notFoundText(what, await body(res))) };
  if (res.status === 409) {
    const data = await body(res);
    const list = (data.candidates ?? []).map((c) => `  ${c.slug}  (${c.model})`).join("\n");
    return {
      error: fail(`ambiguous: "${what}" matches ${data.candidates?.length ?? 0} models in the ssid.ai directory. Retry with one slug:\n${list}`),
    };
  }
  if (res.status === 429) return { error: fail(rateLimitedText(await body(res))) };
  if (!res.ok) return { error: fail(`ssid.ai API error ${res.status} for ${what}`) };
  return { data: await body(res), res };
}

async function lookup(mac) {
  const res = await api(`/api/v1/lookup?mac=${encodeURIComponent(mac)}`);
  if (!res.ok) throw new Error(`SSID API error ${res.status}`);
  return res.json();
}

async function submitCorrection({ slug, field, proposedValue, sourceUrl }) {
  const res = await api(`/api/corrections`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ slug, field, proposedValue, sourceUrl }),
  });
  const data = await body(res);
  if (!res.ok || data.ok === false) {
    throw new Error(
      data.error || `Correction rejected (HTTP ${res.status}) — check field name and that sourceUrl is an official https page.`,
    );
  }
  return data;
}

/** Compliance verdict rule (PRD §6.2): the credential type IS the verdict. */
const COMPLIANCE_BASIS =
  "Manufacturer-cited credential type. 'static' means a universal default password, the pattern prohibited for consumer connectable products under UK PSTI (in force April 2024) and targeted by the EU CRA. This is a documentation reading, not a legal determination.";

function verdictFor(credType) {
  if (credType === "static") return { verdict: "non-compliant", regime: "fail", universal: true };
  if (credType === "set-on-setup" || credType === "label-unique" || credType === "app-only") {
    return { verdict: "compliant", regime: "pass", universal: false };
  }
  return { verdict: "unknown", regime: "unknown", universal: null };
}

const SLUG = z
  .string()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9-]+$/, "ssid.ai slugs are lowercase letters, digits and hyphens");

async function main() {
  const server = new McpServer({ name: "ssid", version: VERSION });

  server.registerTool(
    "get_router_defaults",
    {
      title: "Router factory login (manufacturer-cited)",
      description:
        "Default gateway IP, admin username and password (or the fact that there is none), credential type and factory-reset steps for a router or gateway model, each cited to the manufacturer's own documentation with the source URL. Pass the ssid.ai slug, or brand plus model. Use after lookup_mac identifies the vendor, or whenever a user asks for a router's default login, factory password, gateway address or reset procedure. Covers the 409-model ssid.ai directory; no listing or wildcard search.",
      inputSchema: {
        slug: SLUG.optional().describe("ssid.ai router slug, e.g. tp-link-archer-ax55 (from ssid.ai/routers/<slug>)"),
        brand: z.string().min(2).max(80).optional().describe("Manufacturer, e.g. TP-Link, Netgear, ASUS"),
        model: z.string().min(2).max(80).optional().describe("Model as printed on the device, e.g. Archer AX55"),
      },
    },
    async ({ slug, brand, model }) => {
      // slug XOR (brand AND model) — checked before any network call.
      const mixed = Boolean(slug) && Boolean(brand || model);
      const incomplete = !slug && !(brand && model);
      if (mixed || incomplete) return fail("Pass slug, or brand and model, not both.");
      const r = await fetchDevice({ slug, brand, model });
      if (r.error) return r.error;
      return ok({ ...r.data, rateLimit: rateLimit(r.res) });
    },
  );

  server.registerTool(
    "check_router_compliance",
    {
      title: "Universal default password check (UK PSTI / EU CRA pattern)",
      description:
        "Whether a router model still ships a universal default password, the pattern prohibited for consumer connectable products under the UK PSTI Act and targeted by the EU Cyber Resilience Act, based on the manufacturer-cited credential type, with the ssid.ai Router Compliance Index totals for context. Pass the ssid.ai slug (get it from get_router_defaults). Documentation reading, not legal advice.",
      inputSchema: { slug: SLUG.describe("ssid.ai router slug") },
    },
    async ({ slug }) => {
      // The device call is the metered one (it counts toward the rail metric); the index feed
      // is public and cached, and its absence must not take the per-device verdict down with it.
      const r = await fetchDevice({ slug });
      if (r.error) return r.error;
      const d = r.data;
      const v = verdictFor(d.credType);

      let index = null;
      let indexError;
      try {
        const feed = await api("/compliance/data.json");
        if (feed.ok) {
          const ci = await body(feed);
          const brandRow = (ci.byBrand ?? []).find((b) => b.brand === d.brand) ?? null;
          index = {
            total: ci.total ?? null,
            compliantPct: ci.compliantPct ?? null,
            staticCount: ci.byCredType?.static ?? null,
            generatedAt: ci.generatedAt ?? null,
            brand: brandRow ? { total: brandRow.total, staticCount: brandRow.staticCount, clean: brandRow.clean } : null,
          };
        } else {
          indexError = String(feed.status);
        }
      } catch (e) {
        indexError = e?.cause?.code ?? e?.message ?? "fetch failed";
      }

      return ok({
        slug: d.slug,
        brand: d.brand,
        model: d.modelName ?? d.model,
        credType: d.credType,
        credTypeMeaning: d.credTypeMeaning,
        universalDefaultPassword: v.universal,
        verdict: v.verdict,
        regimes: { uk_psti_2022: v.regime, eu_cra: v.regime },
        basis: COMPLIANCE_BASIS,
        source: d.source ?? null,
        index,
        ...(indexError ? { indexError } : {}),
        url: "https://ssid.ai/compliance",
        rateLimit: rateLimit(r.res),
      });
    },
  );

  server.registerTool(
    "lookup_mac",
    {
      title: "MAC / OUI vendor lookup",
      description:
        "Identify the manufacturer (vendor) behind a MAC address from its OUI, and detect randomized/private (locally-administered) addresses used by modern phones. Returns vendor, OUI, kind, randomized flag, confidence and the source. For the router's factory login, call get_router_defaults next.",
      inputSchema: { mac: z.string().describe("A MAC address in any format, e.g. F4:F5:E8:11:22:33") },
    },
    async ({ mac }) => {
      try {
        return ok(await lookup(mac));
      } catch (e) {
        return fail(`Lookup failed: ${e.message}`);
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
        return ok(await submitCorrection(input));
      } catch (e) {
        return fail(`Submission failed: ${e.message}`);
      }
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[ssid-mcp ${VERSION}] ready on stdio`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
