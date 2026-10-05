"""
La Marzocco connection spike.

Goal: prove we can (a) authenticate, (b) read machine state, (c) set the coffee
boiler target temperature — before building any of it into Bean Sheet.

Read-only by default. Anything that changes machine state requires an explicit
subcommand.

Credentials come from the environment (or a local .env file) and are never
printed. The installation key is generated once and cached in installation_key.json.

Usage:
    python lm_spike.py status              # read-only: auth + dump state
    python lm_spike.py set-temp 94.5       # WRITE: set coffee boiler target
    python lm_spike.py power on|off        # WRITE: turn machine on/off
"""

import asyncio
import json
import os
import sys
import uuid
from pathlib import Path

from pylamarzocco import LaMarzoccoCloudClient
from pylamarzocco.util import InstallationKey, generate_installation_key

HERE = Path(__file__).parent
KEY_FILE = HERE / "installation_key.json"
ENV_FILE = HERE / ".env"


def load_env() -> None:
    """Minimal .env loader so credentials stay in a file, not in shell history."""
    if not ENV_FILE.exists():
        return
    for line in ENV_FILE.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def get_credentials() -> tuple[str, str]:
    load_env()
    username = os.environ.get("LM_USERNAME", "")
    password = os.environ.get("LM_PASSWORD", "")
    if not username or not password or password.startswith("PUT_YOUR"):
        sys.exit(
            "Missing credentials.\n"
            f"Edit {ENV_FILE} and set LM_USERNAME and LM_PASSWORD to your\n"
            "La Marzocco Home app login, then re-run."
        )
    return username, password


def load_or_create_installation_key() -> tuple[InstallationKey, bool]:
    """Return (key, is_new). A new key needs to be registered with the cloud once."""
    if KEY_FILE.exists():
        return InstallationKey.from_json(KEY_FILE.read_text()), False
    key = generate_installation_key(str(uuid.uuid4()))
    KEY_FILE.write_text(key.to_json())
    KEY_FILE.chmod(0o600)
    return key, True


def describe(obj, indent: int = 0) -> str:
    """Best-effort readable dump of a mashumaro model."""
    for attr in ("to_dict", "__dict__"):
        try:
            data = getattr(obj, attr)() if attr == "to_dict" else vars(obj)
            return json.dumps(data, indent=2, default=str)[: 4000 + indent]
        except Exception:
            continue
    return repr(obj)


async def connect() -> tuple[LaMarzoccoCloudClient, str]:
    """Authenticate and resolve the machine serial. Returns (client, serial)."""
    username, password = get_credentials()
    key, is_new = load_or_create_installation_key()

    client = LaMarzoccoCloudClient(
        username=username, password=password, installation_key=key
    )

    if is_new:
        print("→ New installation key generated; registering with La Marzocco cloud…")
        await client.async_register_client()
        print("  registered.")
    else:
        print(f"→ Reusing installation key from {KEY_FILE.name}")

    print("→ Authenticating…")
    await client.async_get_access_token()
    print("  authenticated.")

    print("→ Listing devices on the account…")
    things = await client.list_things()
    if not things:
        sys.exit("No devices found on this account.")

    for thing in things:
        print(f"  • {getattr(thing, 'name', '?')} "
              f"({getattr(thing, 'type', '?')}) serial={getattr(thing, 'serial_number', '?')}")

    serial = os.environ.get("LM_SERIAL") or getattr(things[0], "serial_number", None)
    if not serial:
        sys.exit("Could not determine a serial number.")
    print(f"→ Using serial: {serial}")
    return client, serial


async def cmd_status() -> None:
    client, serial = await connect()

    print("\n=== DASHBOARD ===")
    try:
        print(describe(await client.get_thing_dashboard(serial)))
    except Exception as exc:
        print(f"  failed: {type(exc).__name__}: {exc}")

    print("\n=== SETTINGS ===")
    try:
        print(describe(await client.get_thing_settings(serial)))
    except Exception as exc:
        print(f"  failed: {type(exc).__name__}: {exc}")

    print("\n=== LAST COFFEE (7d) ===")
    try:
        print(describe(await client.get_thing_last_coffee(serial, 7)))
    except Exception as exc:
        print(f"  failed: {type(exc).__name__}: {exc}")


async def cmd_set_temp(target: float) -> None:
    if not 80.0 <= target <= 100.0:
        sys.exit(f"Refusing to set {target}°C — outside the sane 80–100°C range.")
    client, serial = await connect()
    print(f"\n→ Setting coffee boiler target temperature to {target}°C…")
    ok = await client.set_coffee_target_temperature(serial, target)
    print(f"  result: {ok}")


async def cmd_power(on: bool) -> None:
    client, serial = await connect()
    print(f"\n→ Turning machine {'ON' if on else 'OFF'}…")
    ok = await client.set_power(serial, on)
    print(f"  result: {ok}")


def main() -> None:
    args = sys.argv[1:] or ["status"]
    cmd = args[0]

    if cmd == "status":
        asyncio.run(cmd_status())
    elif cmd == "set-temp":
        if len(args) < 2:
            sys.exit("usage: lm_spike.py set-temp <celsius>")
        asyncio.run(cmd_set_temp(float(args[1])))
    elif cmd == "power":
        if len(args) < 2 or args[1] not in ("on", "off"):
            sys.exit("usage: lm_spike.py power on|off")
        asyncio.run(cmd_power(args[1] == "on"))
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
