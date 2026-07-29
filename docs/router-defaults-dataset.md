# Router default-credential dataset

The reference dataset behind [ssid.ai](https://ssid.ai)'s router default-login
directory — 277 router and gateway models, each credential type cited to the
manufacturer's own documentation. This document exists to be a citable, structured
reference on its own, independent of the live site.

**Source of truth (live, re-computed continuously):** https://ssid.ai/compliance/data.json
**Generated for this snapshot:** 2026-07-29 · **Re-verify before citing a number older than a few weeks.**

## Headline number

**71% (196 of 277)** of the router models ssid.ai tracks no longer ship a universal
default password — the pattern the UK [PSTI Act](https://www.gov.uk/government/publications/the-product-security-and-telecommunications-infrastructure-psti-act-2022)
(in force since April 2024) and the EU [Radio Equipment Directive / Cyber Resilience Act](https://digital-strategy.ec.europa.eu/en/policies/cyber-resilience-act)
now prohibit for new consumer connectable products.

## How the 277 models log in

| Credential type | Models | Share | What it means |
|---|---|---|---|
| Set at first setup | 90 | 32% | No default exists — the owner creates a password during setup |
| Unique password on device label | 71 | 26% | Printed on a sticker on the unit, unique per device |
| App-only admin (no web login) | 35 | 13% | Managed entirely from the manufacturer's mobile app |
| **Universal default (the risky pattern)** | **81** | **29%** | One password shared across every unit of that model |

## Brands still shipping a universal default (worst first)

| Brand | Models tracked | Still shipping a default | Share |
|---|---|---|---|
| Netgear | 23 | 10 | 43% |
| Linksys | 10 | 9 | 90% |
| Peplink | 9 | 9 | 100% |
| DrayTek | 6 | 6 | 100% |
| Ubiquiti | 12 | 5 | 42% |
| Netgate | 5 | 5 | 100% |
| Zyxel | 9 | 4 | 44% |
| D-Link | 6 | 4 | 67% |
| Belkin | 4 | 4 | 100% |
| TP-Link | 28 | 3 | 11% |
| SaskTel | 4 | 2 | 50% |
| Buffalo | 2 | 2 | 100% |
| ASUS | 20 | 1 | 5% |

Full per-brand breakdown (84 brands): https://ssid.ai/compliance/data.json ·
per-brand pages with model-level detail: `https://ssid.ai/routers/brand/<brand>`

## Brands with zero universal defaults

26 tracked brands ship no universal default across every model we track — each one
either forces a setup password, prints a unique one on the label, or is app-managed
only. By models tracked: AVM (10), MikroTik (8), Tenda (7), Keenetic (5), eero (4),
Synology (4), GL.iNet (4), AT&T (3), Virgin Media (3), Deutsche Telekom (3),
Mercusys (3), Firewalla (3), Grandstream (3), Xiaomi (2), Huawei (2), and 11 more —
full list in the live feed above.

## Every value is cited

Each model's default (or the honest "no universal default" answer) links to the
manufacturer's own support page, user manual, or knowledge-base article — never an
aggregator's guess. See any `https://ssid.ai/routers/<brand-model>` page for the
citation on a specific model, and its verification history (every time we've
re-checked it, oldest first).

## Reuse

Facts are uncopyrightable. Free to cite with attribution to ssid.ai; see
https://ssid.ai/api-docs for commercial redistribution terms. Query the live JSON
feed directly rather than scraping the HTML pages.

## Programmatic access

- Full feed: `GET https://ssid.ai/compliance/data.json`
- Per-model: `GET https://ssid.ai/api/v1/device/<slug>`
- MCP server (this repo): `lookup_mac` / `submit_correction` tools — see the
  [main README](../README.md).
