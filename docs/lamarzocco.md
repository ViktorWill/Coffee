# La Marzocco integration

Machine control for the Linea Mini R: read status, turn the machine on/off, and
set the coffee boiler target temperature per bean.

## Status

**Verified end to end against a real Linea Mini R** (2026-10-05): registration,
sign-in, request signing, dashboard parsing, and the temperature write path
(93 → 94 → 93, confirmed on the machine).

What real hardware taught us, beyond what mocks could:

- **Commands take ~4–6 seconds to apply.** The REST call only queues them. The
  UI polls until the machine reports the change rather than re-reading once;
  a single short delay reports stale state and looks like the command was ignored.
- **The boiler's real range is 80–100 °C**, wider than the 85–96 fallback. Always
  prefer the machine's own `targetTemperatureMin/Max`.
- **There is no live boiler temperature.** `CMCoffeeBoiler` exposes the setpoint
  and a coarse `status` (`Ready`/`HeatingUp`/…), so `currentTemperature` is
  always null on this model.
- **Shot history IS available — but not where you'd expect.** The dashboard is
  misleading here: it reports `shotCounterSupported: false` and a null
  `lastCoffee` even though `/things/{serial}/stats/LAST_COFFEE/1?days=N` returns
  full history (time, extraction seconds, target temperature, validity). Don't
  trust those two dashboard fields as a capability check.
- **Shots carry no yield.** `doseValue` is null without a paired brew-by-weight
  scale, so grams come from the user.

`GET /api/machine?raw=1` still dumps the unparsed dashboard if the shape ever
needs re-checking.

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
| `LM_OWNER_USER_ID` | **Required.** SWA principal id(s) allowed to control the machine; comma-separated |
| `LM_SERIAL` | Optional; only needed with multiple machines |
| `LM_MOCK` | `1` to use the built-in mock instead of real hardware |

### Why `LM_OWNER_USER_ID` is required

`staticwebapp.config.json` protects `/api/*` with the built-in `authenticated`
role, which Static Web Apps grants to **anyone** who signs in with any configured
provider — not just you. Without an owner check, any GitHub user who found the URL
could switch on the machine and change its boiler temperature.

Credential lookup therefore fails closed: no `LM_OWNER_USER_ID`, no credentials,
and the UI simply hides the controls.

Find your id by signing in to the deployed app and visiting `/.auth/me` — it's
`clientPrincipal.userId`. **It differs per login provider**, so if you sign in
with both GitHub and Microsoft, collect both and list them comma-separated:

```
LM_OWNER_USER_ID=<github-id>,<microsoft-id>
```

Otherwise signing in with the "wrong" provider silently shows no controls.

Set `LM_OWNER_USER_ID=local-dev` in `api/local.settings.json` for local development.

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
| `GET` | `/api/machine/shots` | — (`?days=N`, 1–90, default 14) |
| `POST` | `/api/machine/power` | `{ "enabled": boolean }` |
| `POST` | `/api/machine/temperature` | `{ "targetTemperature": number }` |

## Importing brews

`/api/machine/shots` returns what the machine recorded — when a shot ran and for
how long — but not which bean, grind or yield. The import dialog therefore asks
for the bean explicitly and takes grind and yield by hand; nothing is inferred.

Imported extractions keep the machine's own timestamp rather than the moment they
were logged, so the history reflects when shots were actually pulled. Imported
shot times are recorded under `<user>:imported-shot-times` so the same shot isn't
offered twice, and the dialog renders nothing until that list has loaded —
otherwise already-logged shots flash up briefly and can be double-logged.

Temperature is validated against the machine's own reported min/max, falling back
to a conservative 85–96°C when the dashboard hasn't been read.

## Caveats

- Unofficial API — La Marzocco can change or break it without notice. Failures
  should degrade gracefully; Bean Sheet is still a coffee log without it.
- Auth needs a real account password; there are no scoped API keys or OAuth.
- Machine must be onboarded in the La Marzocco Home app (WiFi + added to the
  account) before it appears via the API.
