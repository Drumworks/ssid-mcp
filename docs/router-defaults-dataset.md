# Router default-credential dataset

The reference dataset behind [ssid.ai](https://ssid.ai)'s router default-login
directory: 550 router, gateway, mesh and access-point models, each credential type
cited to the manufacturer's own documentation. This document exists to be a citable,
structured reference on its own, independent of the live site.

**Source of truth (live, re-computed continuously):** https://ssid.ai/compliance/data.json
**Generated for this snapshot:** 2026-10-31 · **Re-verify before citing a number older than a few weeks.**

This file is generated from the feed above, not maintained by hand. If it disagrees with
the feed, the feed is right and this snapshot is stale.

## Headline number

**67% (371 of 550)** of the router models ssid.ai tracks no longer ship a
universal default password, the pattern the UK [PSTI Act](https://www.gov.uk/government/publications/the-product-security-and-telecommunications-infrastructure-psti-act-2022)
(in force since April 2024) and the EU [Radio Equipment Directive / Cyber Resilience Act](https://digital-strategy.ec.europa.eu/en/policies/cyber-resilience-act)
now prohibit for new consumer connectable products.

## How the 550 models log in

| Credential type | Models | Share | What it means |
|---|---|---|---|
| Set at first setup | 141 | 26% | No default exists; the owner creates a password during setup |
| Unique password on device label | 177 | 32% | Printed on a sticker on the unit, unique per device |
| App-only admin (no web login) | 53 | 10% | Managed entirely from the manufacturer's mobile app |
| **Universal default (the risky pattern)** | **179** | **33%** | One password shared across every unit of that model |

A model with no password listed is covered, not missing. The label says why there is no
value to list.

## Brands still shipping a universal default (worst first)

| Brand | Models tracked | Still shipping a default | Share |
|---|---|---|---|
| Netgear | 40 | 16 | 40% |
| Peplink | 10 | 10 | 100% |
| Linksys | 16 | 9 | 56% |
| D-Link | 14 | 8 | 57% |
| DrayTek | 8 | 8 | 100% |
| Ubiquiti | 14 | 6 | 43% |
| Zyxel | 11 | 6 | 55% |
| Netgate | 6 | 6 | 100% |
| TP-Link | 43 | 4 | 9% |
| Belkin | 4 | 4 | 100% |
| ARRIS | 6 | 3 | 50% |
| Zain | 4 | 3 | 75% |
| Hitron | 3 | 3 | 100% |
| Cisco | 3 | 3 | 100% |
| Araknis Networks | 3 | 3 | 100% |

Full per-brand breakdown (198 brands): https://ssid.ai/compliance/data.json ·
per-brand pages with model-level detail: `/routers/brand/{brand}`, live example:
https://ssid.ai/routers/brand/tp-link

## Brands with zero universal defaults

116 tracked brands ship no universal default across every model we track: each one
either forces a setup password, prints a unique one on the label, or is app-managed only.
By models tracked: AVM (16), Grandstream (9), Tenda (7), Keenetic (6), Verizon (6), eero (5), Honor (5), Vodafone (5), Claro Brasil (4), Deutsche Telekom (4), Firewalla (4), GL.iNet (4), Synology (4), AT&T (3), Devolo (3), and 101 more. Full list in the live feed above.

## Every value is cited

Each model's default, or the honest "no universal default" answer, links to the
manufacturer's own support page, user manual or knowledge-base article, never an
aggregator's guess. A credential field with no manufacturer citation does not publish.
See any `/routers/{brand-model}` page for the citation on a specific model and its
verification history (every time we have re-checked it, oldest first). Live example:
https://ssid.ai/routers/tp-link-archer-ax55

## Reuse

Facts are uncopyrightable. Free to cite with attribution to ssid.ai; see
https://ssid.ai/api-docs for commercial redistribution terms. The whole router table is
also published as an open dataset under CC BY 4.0 including commercial use:
https://github.com/Drumworks/router-default-passwords

Query the live JSON feed directly rather than scraping the HTML pages.

## Programmatic access

- Full compliance feed: `GET https://ssid.ai/compliance/data.json`
- Per-model record: `GET /api/v1/device/{slug}`, live example:
  https://ssid.ai/api/v1/device/tp-link-archer-ax55
- Resolve by brand and model: `GET /api/v1/device?brand={brand}&model={model}`
- MCP server (this repo): `get_router_defaults`, `check_router_compliance`,
  `lookup_mac` and `submit_correction`. See the [main README](../README.md).

## Direct answers built on this dataset

- Which router brands and models are covered, live: https://ssid.ai/answers/router-brands-and-models-covered
- What to check before trusting a router credential database: https://ssid.ai/answers/how-to-vet-a-router-password-database
- The best tool for looking up a router default login: https://ssid.ai/answers/best-router-default-password-lookup
- All direct answers: https://ssid.ai/answers
