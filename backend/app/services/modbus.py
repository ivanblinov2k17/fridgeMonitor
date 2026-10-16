"""Modbus TCP client and MV110-224.8A register decoding.

Standard library only, on purpose: the factory server builds images with
whatever it can reach, and the protocol needed here is one function code.
The same decoding was checked on the real module with tools/mv110_probe.py.
"""

import asyncio
import itertools
import struct


# The MKON gateway answers with these when the device behind it is silent:
# 10 - no path to the target, 11 - target failed to respond.
GATEWAY_NO_RESPONSE = {10, 11}


class ModbusError(Exception):
    pass


class GatewayUnreachable(ModbusError):
    """No TCP connection to the gateway itself."""


class DeviceTimeout(ModbusError):
    """Connected, but no reply came within the timeout."""


class ModbusException(ModbusError):
    """The gateway or the device answered with a Modbus exception."""

    def __init__(self, code: int):
        super().__init__(f"Modbus exception {code}")
        self.code = code

    @property
    def no_response(self) -> bool:
        return self.code in GATEWAY_NO_RESPONSE


class ModbusTcpClient:
    """One persistent connection to a gateway, requests strictly in turn.

    Requests are serialised with a lock: the gateway has one RS-485 line
    behind it, so parallel requests would only queue up there anyway.
    """

    def __init__(self, host: str, port: int = 502, timeout: float = 2.0):
        self.host = host
        self.port = port
        self.timeout = timeout

        self._reader: asyncio.StreamReader | None = None
        self._writer: asyncio.StreamWriter | None = None
        self._lock = asyncio.Lock()
        self._transactions = itertools.cycle(range(1, 0x10000))

    async def close(self):

        writer, self._reader, self._writer = self._writer, None, None

        if writer is None:
            return

        writer.close()

        try:
            await writer.wait_closed()
        except OSError:
            pass

    async def _connect(self):

        try:
            self._reader, self._writer = await asyncio.wait_for(
                asyncio.open_connection(self.host, self.port),
                self.timeout,
            )
        except (OSError, asyncio.TimeoutError) as error:
            raise GatewayUnreachable(
                f"cannot connect to {self.host}:{self.port}: {error!r}"
            ) from error

    async def read_holding_registers(
        self, unit: int, start: int, count: int
    ) -> list[int]:

        async with self._lock:

            if self._writer is None:
                await self._connect()

            transaction = next(self._transactions)

            pdu = struct.pack(">BHH", 3, start, count)
            header = struct.pack(">HHHB", transaction, 0, len(pdu) + 1, unit)

            try:
                self._writer.write(header + pdu)
                await self._writer.drain()

                function, body = await asyncio.wait_for(
                    self._receive(transaction), self.timeout
                )

            except asyncio.TimeoutError as error:
                # A late reply would arrive on this connection and be taken
                # for the answer to the next request, so start over.
                await self.close()
                raise DeviceTimeout(
                    f"unit {unit} did not answer in {self.timeout} s"
                ) from error

            except (OSError, asyncio.IncompleteReadError) as error:
                await self.close()
                raise GatewayUnreachable(
                    f"connection to {self.host}:{self.port} lost: {error!r}"
                ) from error

        if function & 0x80:
            raise ModbusException(body[0] if body else 0)

        byte_count = body[0]
        data = body[1:1 + byte_count]

        if len(data) != count * 2:
            raise ModbusError(f"expected {count * 2} bytes, got {len(data)}")

        return list(struct.unpack(f">{count}H", data))

    async def _receive(self, transaction: int) -> tuple[int, bytes]:

        while True:

            header = await self._reader.readexactly(7)

            reply_transaction, protocol, length, _ = struct.unpack(
                ">HHHB", header
            )

            payload = await self._reader.readexactly(length - 1)

            # Anything else is a stale reply to an earlier request.
            if reply_transaction == transaction and protocol == 0:
                return payload[0], payload[1:]


# ---- MV110-224.8A ----------------------------------------------------------

CHANNELS = 8

# Six registers per input: decimal point, integer value, status, cycle time,
# then the value as Float32 with the high word first.
REGISTERS_PER_CHANNEL = 6
OFFSET_STATUS = 2
OFFSET_FLOAT = 4

REGISTER_COUNT = CHANNELS * REGISTERS_PER_CHANNEL


# Status register codes, as short keys the API and frontend agree on.
# On a fault the module keeps the last good value in the result registers,
# so the number is only meaningful when the status is "ok".
STATUS_KEYS = {
    0x0000: "ok",
    0xF000: "invalid",
    0xF006: "not_ready",
    0xF007: "disabled",
    0xF008: "cold_junction",
    0xF009: "cold_junction",
    0xF00A: "too_high",
    0xF00B: "too_low",
    0xF00C: "short_circuit",
    0xF00D: "open_circuit",
    0xF00E: "adc_failure",
    0xF00F: "calibration",
}

# Set by the poller, not by the module: the module itself did not answer.
STATUS_NO_LINK = "no_link"


def decode_channels(
    registers: list[int],
) -> list[tuple[int, str, float | None]]:
    """(channel, status key, temperature or None) for channels 1..8."""

    result = []

    for channel in range(1, CHANNELS + 1):

        base = (channel - 1) * REGISTERS_PER_CHANNEL

        code = registers[base + OFFSET_STATUS]
        status = STATUS_KEYS.get(code, "unknown")

        temperature = None

        if status == "ok":
            high = registers[base + OFFSET_FLOAT]
            low = registers[base + OFFSET_FLOAT + 1]
            temperature = struct.unpack(">f", struct.pack(">HH", high, low))[0]

        result.append((channel, status, temperature))

    return result
