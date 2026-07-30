# La Marzocco integration

Machine control for the Linea Mini R: read status, turn the machine on/off, and
set the coffee boiler target temperature per bean.

## Status

Verified against the live API: installation-key registration, sign-in, and
request signing all work. **Not yet verified against real hardware** — the
machine was not on the account when this was built, so the dashboard widget
parsing in `service.ts` (`normalizeDashboard`) is a best-effort read of
pylamarzocco's models and needs checking on day one. Use `GET /api/machine?raw=1`
to dump the unparsed dashboard and compare.

## How it works

La Marzocco has no public API. This talks to the same undocumented endpoint their
mobile app uses (`lion.lamarzocco.io/api/customer-app`), following
[pylamarzocco](https://github.com/zweckj/pylamarzocco). The auth layer is ported
to TypeScript in `src/lib/lamarzocco/auth.ts` so the API stays on one runtime.

Every request must be signed — unsigned requests are rejected with `412`, including
the sign-in call itself. `scripts/verify-auth.mjs` checks the port against golden
vectors from the Python reference; run it after touching `auth.ts`:

```bash
npm run build && npm run verify:auth
```

Commands are **accepted**, not confirmed. The REST call returns a command id and
real confirmation only arrives over a websocket we don't subscribe to, so the UI
re-reads status after each write rather than assuming success.

## Setup

Register an installation key once (every run registers another client):

```bash
cd api && npm run build
LM_USERNAME=you@example.com LM_PASSWORD='...' npm run lm:register
```

Then set on the Static Web App (or `api/local.settings.json` for local dev):

| Setting | Notes |
|---|---|
| `LM_USERNAME` | La Marzocco Home login |
| `LM_PASSWORD` | La Marzocco Home password |
| `LM_INSTALLATION_KEY` | JSON printed by `lm:register` — contains a private key |
| `LM_SERIAL` | Optional; only needed with multiple machines |
| `LM_MOCK` | `1` to use the built-in mock instead of real hardware |

Credentials are read via `config.ts` and never written to Cosmos — they unlock a
heating appliance, and the KV store is user-writable data.

## Development without hardware

Set `LM_MOCK=1`. The mock is stateful in-process, so power and temperature
changes are reflected on the next read and the full UI flow can be exercised.
The UI shows a `MOCK` badge whenever it's active.

## Multi-user

Currently single-tenant: one set of credentials in app settings. `CredentialStore`
in `config.ts` is the seam — implement a store that reads a per-user secret from
Key Vault keyed by the SWA principal id, and nothing else needs to change.

## Endpoints

| Method | Route | Body |
|---|---|---|
| `GET` | `/api/machine` | — (`?raw=1` includes the raw dashboard) |
| `POST` | `/api/machine/power` | `{ "enabled": boolean }` |
| `POST` | `/api/machine/temperature` | `{ "targetTemperature": number }` |

Temperature is validated against the machine's own reported min/max, falling back
to a conservative 85–96°C when the dashboard hasn't been read.

## Caveats

- Unofficial API — La Marzocco can change or break it without notice. Failures
  should degrade gracefully; Bean Sheet is still a coffee log without it.
- Auth needs a real account password; there are no scoped API keys or OAuth.
- Machine must be onboarded in the La Marzocco Home app (WiFi + added to the
  account) before it appears via the API.
