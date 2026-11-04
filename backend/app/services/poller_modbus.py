"""Polls MV110 modules behind an MKON gateway and stores the readings.

Modules are found by address: on start every address in MODBUS_UNITS is
tried, afterwards one not-yet-found address is tried per cycle, so a module
added to the line later shows up without a restart.

Every connected input of a module becomes a device. Inputs reported as
"sensor disabled" are skipped until they report something else.
"""

import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import select

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.device import Device
from app.models.measurement import Measurement
from app.services import alarms, modbus, runtime_settings
from app.services.websocket_manager import manager


log = logging.getLogger("poller.modbus")


class Poller:

    def __init__(self):

        self.client = modbus.ModbusTcpClient(
            settings.MODBUS_HOST,
            settings.MODBUS_PORT,
            settings.MODBUS_TIMEOUT_SECONDS,
        )

        self.units = settings.modbus_units_list

        # Modules that answered at least once. A module that goes silent
        # stays here: its devices are shown as "no link", not forgotten.
        self.known: set[int] = set()

        # Known modules currently not answering, to log changes only.
        self.silent: set[int] = set()

        self.full_scan_done = False
        self.gateway_ok = True
        self._next_probe = 0

        # How long the last cycle took, to tell whether the chosen
        # interval is actually achievable on this line.
        self.last_cycle_seconds = 0.0
        self.slow_logged = False

    async def run(self):

        log.info(
            "Polling MV110 via %s:%s, addresses %s",
            settings.MODBUS_HOST,
            settings.MODBUS_PORT,
            settings.MODBUS_UNITS,
        )

        if not self.units:
            log.error("MODBUS_UNITS %r has no addresses in 2..247", settings.MODBUS_UNITS)

        while True:

            started = asyncio.get_running_loop().time()

            try:
                await self.cycle()

            except Exception:
                # Never let the loop die: a lost gateway or a bad reply must
                # not stop polling until the container restarts.
                log.exception("Poll cycle failed")

            self.last_cycle_seconds = (
                asyncio.get_running_loop().time() - started
            )

            await asyncio.sleep(await self.interval())

    async def interval(self) -> float:
        """Interval for the next wait, read fresh so the dashboard's
        setting takes effect without a restart.

        A cycle that outruns the interval is worth knowing about: the line
        cannot go faster than it does, whatever is chosen.
        """

        seconds = await runtime_settings.current_poll_interval()

        if self.last_cycle_seconds > seconds and not self.slow_logged:
            log.warning(
                "A poll takes %.1f s, longer than the %s s interval",
                self.last_cycle_seconds, seconds,
            )
            self.slow_logged = True

        elif self.last_cycle_seconds <= seconds:
            self.slow_logged = False

        return seconds

    async def cycle(self):

        try:

            if not self.full_scan_done:
                await self.full_scan()

            else:
                for unit in sorted(self.known):
                    await self.poll(unit)

                await self.probe_next()

        except modbus.GatewayUnreachable as error:

            if self.gateway_ok:
                log.warning("Gateway unreachable: %s", error)
                self.gateway_ok = False

            await self.mark_no_link(self.known)
            return

        if not self.gateway_ok:
            log.info("Gateway reachable again")
            self.gateway_ok = True

    async def full_scan(self):

        found = []

        for unit in self.units:
            if await self.poll(unit, probing=True):
                found.append(unit)

        self.full_scan_done = True

        log.info("Scan finished, modules at addresses: %s", found or "none")

    async def probe_next(self):

        unknown = [u for u in self.units if u not in self.known]

        if not unknown:
            return

        unit = unknown[self._next_probe % len(unknown)]
        self._next_probe += 1

        await self.poll(unit, probing=True)

    async def poll(self, unit: int, probing: bool = False) -> bool:
        """Reads one module and stores the result. True if it answered.

        When probing an address nobody is known at, silence is the normal
        answer and is not logged. GatewayUnreachable propagates to cycle().
        """

        try:
            registers = await self.client.read_holding_registers(
                unit, 0, modbus.REGISTER_COUNT
            )

        except modbus.GatewayUnreachable:
            # Not this module's fault: handled once for all in cycle().
            raise

        except modbus.ModbusError as error:
            if not probing:
                if unit not in self.silent:
                    log.warning("Unit %s stopped answering: %s", unit, error)
                    self.silent.add(unit)
                await self.mark_no_link({unit})
            return False

        if unit not in self.known:
            log.info("Found MV110 at address %s", unit)
            self.known.add(unit)

        if unit in self.silent:
            log.info("Unit %s answers again", unit)
            self.silent.discard(unit)

        await self.store(unit, modbus.decode_channels(registers))

        return True

    async def store(self, unit: int, channels):

        now = datetime.now(timezone.utc)
        events = []
        readings = []

        async with AsyncSessionLocal() as db:

            existing = {
                device.channel: device
                for device in (
                    await db.execute(select(Device).where(Device.unit == unit))
                ).scalars()
            }

            for channel, status, temperature in channels:

                device = existing.get(channel)

                if device is None:

                    if status == "disabled":
                        continue

                    device = Device(
                        # Placeholder names: rename to the chamber via
                        # PATCH /devices/{id}.
                        name=f"Sensor {unit}.{channel}",
                        location=f"MV110 #{unit}",
                        address=unit * 100 + channel,
                        unit=unit,
                        channel=channel,
                        status=status,
                        min_temp=settings.DEFAULT_MIN_TEMP,
                        max_temp=settings.DEFAULT_MAX_TEMP,
                    )
                    db.add(device)
                    await db.flush()

                    log.info(
                        "New sensor: unit %s input %s (device %s)",
                        unit, channel, device.id,
                    )

                if device.status != status:
                    log.info(
                        "Unit %s input %s: %s -> %s",
                        unit, channel, device.status, status,
                    )
                    device.status = status

                if temperature is not None:
                    temperature = round(temperature, 2)
                    db.add(
                        Measurement(
                            device_id=device.id,
                            temperature=temperature,
                            created_at=now,
                        )
                    )

                readings.append((device, status, temperature))

            alarm_by_device = await alarms.sync(db, readings, now)

            for device, status, temperature in readings:
                events.append(
                    {
                        "device_id": device.id,
                        "temperature": temperature,
                        "status": status,
                        "alarm": alarm_by_device.get(device.id),
                        "timestamp": now.isoformat(),
                    }
                )

            await db.commit()

        for event in events:
            await manager.broadcast(event)

    async def mark_no_link(self, units: set[int]):

        if not units:
            return

        now = datetime.now(timezone.utc)

        async with AsyncSessionLocal() as db:

            devices = (
                await db.execute(select(Device).where(Device.unit.in_(units)))
            ).scalars().all()

            for device in devices:
                device.status = modbus.STATUS_NO_LINK

            alarm_by_device = await alarms.sync(
                db,
                [(device, modbus.STATUS_NO_LINK, None) for device in devices],
                now,
            )

            await db.commit()

        for device in devices:
            await manager.broadcast(
                {
                    "device_id": device.id,
                    "temperature": None,
                    "status": modbus.STATUS_NO_LINK,
                    "alarm": alarm_by_device.get(device.id),
                    "timestamp": now.isoformat(),
                }
            )


async def run():

    await Poller().run()
