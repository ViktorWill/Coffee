# La Marzocco Python reference tool

An independent cross-check against [pylamarzocco](https://github.com/zweckj/pylamarzocco),
the reverse-engineered reference implementation our TypeScript client in
`api/src/lib/lamarzocco/` is ported from.

**Why keep this.** When the Linea Mini R is connected, the unverified part of the
integration is how the dashboard widgets are shaped for this model. pylamarzocco
parses the response into typed models, so running this alongside
`GET /api/machine?raw=1` shows what the data *should* look like versus what our
parser makes of it. That comparison is the fastest way to settle any
`normalizeDashboard` mismatch.

It is a development aid only — nothing in the app depends on it.

## Setup

Needs Python 3.11+ (3.14 was used originally; the system 3.9 on macOS is too old).

```bash
cd tools/lamarzocco
python3 -m venv .venv
.venv/bin/pip install pylamarzocco
```

Create `.env` here with your La Marzocco Home login. It is gitignored — do not
commit it, and do not reuse the app's production credentials if you can avoid it:

```
LM_USERNAME=you@example.com
LM_PASSWORD=your-password
# LM_SERIAL=   # only if the account has multiple machines
```

## Use

```bash
.venv/bin/python lm_spike.py status      # read-only: auth, list devices, dump state
.venv/bin/python lm_spike.py set-temp 94 # WRITE: set coffee boiler target
.venv/bin/python lm_spike.py power on    # WRITE: turn machine on/off
```

`status` is read-only and safe. The two write commands drive a real heating
appliance — `set-temp` is bounded to 80–100 °C as a sanity guard.

On first run it generates `installation_key.json` and registers it with
La Marzocco. That file is gitignored and contains a private key. Losing it is
harmless: delete it and a new one is registered on the next run.

## Known state

As of the last run the account authenticated successfully but `/things` returned
`[]` — the machine had not yet been added in the La Marzocco Home app. Once it is
onboarded (WiFi + added to the account), `status` should return the dashboard,
boiler temperatures and recent shot history.
