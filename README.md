# ssid-mcp

MCP server for [ssid.ai](https://ssid.ai) — a MAC-address (OUI) vendor lookup and
router default-login directory. (ssid.ai is the branded tool at that domain, not the
generic "SSID" WiFi-network-name term.)

## Install

Add to any MCP-capable host (Claude Desktop, Cursor, etc.):

```json
{
  "mcpServers": {
    "ssid": { "command": "npx", "args": ["-y", "ssid-mcp"] }
  }
}
```

## Tools

- **`lookup_mac(mac)`** → vendor, OUI, `kind` (universal / randomized / multicast /
  invalid), `randomized` flag, confidence and the source.

```
lookup_mac("F4:F5:E8:11:22:33")
→ { "vendor": { "organization": "Google, Inc." }, "kind": "universal", "randomized": false, ... }
```

- **`submit_correction(slug, field, proposedValue, sourceUrl)`** → propose a fix to a
  router model's default login IP, username, password, credential type, or reset
  steps. Requires an official manufacturer `sourceUrl` — never applied automatically,
  queued for verification against that source. The contribution loop is open to
  agents on the same terms as humans.

```
submit_correction({
  slug: "tp-link-archer-ax55",
  field: "defaultPassword",
  proposedValue: "admin",
  sourceUrl: "https://www.tp-link.com/us/support/faq/..."
})
→ { "ok": true, "status": "pending" }
```

## What else ssid.ai covers

Beyond MAC/OUI lookup, ssid.ai maintains a router default-login directory — default
gateway IP, admin username/password (or the honest "no universal default" answer),
and factory-reset steps per model, each cited to the manufacturer's own
documentation: https://ssid.ai/routers. The same data rolls up into a live
Router Default-Credential Compliance Index: https://ssid.ai/compliance — a citable
stat, updated continuously, on how much of the consumer router market still ships a
universal default password (the pattern the UK PSTI Act and EU RED now prohibit).

Full machine-readable manifest (tools, directory, API, data reports):
https://ssid.ai/llms.txt

## Auth

The free tier needs no key. To raise limits, set `SSID_API_KEY` (get one at
https://ssid.ai/api-docs). Point at a different base with `SSID_API_BASE`.

MAC/OUI data compiled from the IEEE OUI registry; router-login data is
manufacturer-cited. ssid.ai adds freshness, randomized-MAC detection and a stable,
SLA-backed feed.
