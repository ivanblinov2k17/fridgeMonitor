"""Читает температуры из модуля ОВЕН МВ110-224.8А через шлюз МКОН.

Диагностика связи и проверка расшифровки регистров на живом железе.
Зависимостей нет: только стандартная библиотека, ставить ничего не нужно.

    python mv110_probe.py 192.168.1.99 --unit 16
    python mv110_probe.py 192.168.1.99 --unit 16 --watch

Адрес (--unit) - это адрес МВ110 в сети RS-485, а не адрес шлюза.
МКОН передаёт его без изменений. Адрес 1 занят самим шлюзом и для
модуля использоваться не может.
"""

import argparse
import socket
import struct
import sys
import time


# На каждый вход отведено 6 регистров, смещения внутри блока канала.
REGISTERS_PER_CHANNEL = 6

OFFSET_STATUS = 2
OFFSET_FLOAT = 4

CHANNELS = 8


# Коды исключительных ситуаций из регистра статуса.
STATUS = {
    0x0000: "норма",
    0xF000: "значение заведомо неверно",
    0xF006: "данные не готовы",
    0xF007: "датчик отключен",
    0xF008: "велика температура свободных концов ТП",
    0xF009: "мала температура свободных концов ТП",
    0xF00A: "измеренное значение слишком велико",
    0xF00B: "измеренное значение слишком мало",
    0xF00C: "короткое замыкание датчика",
    0xF00D: "обрыв датчика",
    0xF00E: "отсутствие связи с АЦП",
    0xF00F: "некорректный калибровочный коэффициент",
}

# Эти коды означают, что датчик неисправен, а не что в камере жарко.
SENSOR_FAULTS = {0xF007, 0xF00C, 0xF00D, 0xF00E}


class ModbusError(Exception):
    pass


def read_registers(sock, unit, start, count, function=3):
    """Читает count регистров начиная с start по Modbus TCP."""

    transaction = 1

    pdu = struct.pack(">BHH", function, start, count)

    # MBAP: id транзакции, id протокола (0), длина, адрес устройства.
    header = struct.pack(">HHHB", transaction, 0, len(pdu) + 1, unit)

    sock.sendall(header + pdu)

    reply_header = recv_exactly(sock, 7)

    _, protocol, length, reply_unit = struct.unpack(">HHHB", reply_header)

    if protocol != 0:
        raise ModbusError(f"не Modbus TCP в ответе (protocol id {protocol})")

    body = recv_exactly(sock, length - 1)

    reply_function = body[0]

    if reply_function & 0x80:
        code = body[1] if len(body) > 1 else 0
        raise ModbusError(
            f"устройство вернуло ошибку Modbus, код {code}"
            + (" - неверный адрес устройства или регистра" if code in (2, 3) else "")
        )

    byte_count = body[1]

    data = body[2:2 + byte_count]

    if len(data) != count * 2:
        raise ModbusError(
            f"пришло {len(data)} байт вместо {count * 2}"
        )

    return [
        struct.unpack(">H", data[i:i + 2])[0]
        for i in range(0, len(data), 2)
    ]


def recv_exactly(sock, n):

    chunks = []
    got = 0

    while got < n:

        chunk = sock.recv(n - got)

        if not chunk:
            raise ModbusError("соединение закрыто на середине ответа")

        chunks.append(chunk)
        got += len(chunk)

    return b"".join(chunks)


def decode_channel(registers, channel):
    """Достаёт статус и температуру одного канала (1..8) из блока регистров.

    Float32 лежит в двух регистрах, старшее слово в регистре с меньшим
    номером.
    """

    base = (channel - 1) * REGISTERS_PER_CHANNEL

    status = registers[base + OFFSET_STATUS]

    high = registers[base + OFFSET_FLOAT]
    low = registers[base + OFFSET_FLOAT + 1]

    temperature = struct.unpack(">f", struct.pack(">HH", high, low))[0]

    return status, temperature


def describe(status):

    return STATUS.get(status, f"неизвестный код 0x{status:04X}")


def print_table(registers):

    print(f"{'канал':>6}  {'температура':>12}  статус")
    print("-" * 56)

    for channel in range(1, CHANNELS + 1):

        status, temperature = decode_channel(registers, channel)

        if status == 0:
            value = f"{temperature:8.2f} °C"
        elif status in SENSOR_FAULTS:
            # Регистры хранят последнее удачное измерение, так что число
            # здесь старое и показывать его как текущее нельзя.
            value = "   — "
        else:
            value = f"({temperature:7.2f})"

        print(f"{channel:>6}  {value:>12}  {describe(status)}")

    print()


def main():

    parser = argparse.ArgumentParser(
        description="Чтение температур из МВ110-224.8А через МКОН"
    )

    parser.add_argument("host", help="IP-адрес шлюза МКОН")
    parser.add_argument("--port", type=int, default=502)
    parser.add_argument(
        "--unit",
        type=int,
        required=True,
        help="адрес МВ110 в сети RS-485 (не 1 - он занят шлюзом)",
    )
    parser.add_argument("--timeout", type=float, default=5.0)
    parser.add_argument(
        "--watch",
        action="store_true",
        help="опрашивать непрерывно, раз в --interval секунд",
    )
    parser.add_argument("--interval", type=float, default=5.0)

    args = parser.parse_args()

    if args.unit == 1:
        print(
            "Адрес 1 зарезервирован за самим МКОН - запросы к нему уйдут во\n"
            "внутренние регистры шлюза, а не в модуль. Нужен адрес МВ110.",
            file=sys.stderr,
        )
        return 2

    total = CHANNELS * REGISTERS_PER_CHANNEL

    print(
        f"Подключаюсь к {args.host}:{args.port}, "
        f"адрес устройства {args.unit}, читаю {total} регистров\n"
    )

    while True:

        try:
            with socket.create_connection(
                (args.host, args.port), timeout=args.timeout
            ) as sock:

                sock.settimeout(args.timeout)

                started = time.monotonic()

                registers = read_registers(sock, args.unit, 0, total)

                elapsed = (time.monotonic() - started) * 1000

            print(f"ответ за {elapsed:.0f} мс")

            print_table(registers)

        except ModbusError as error:
            print(f"Ошибка обмена: {error}", file=sys.stderr)

        except OSError as error:
            print(f"Нет связи с {args.host}:{args.port} - {error}", file=sys.stderr)

        if not args.watch:
            break

        time.sleep(args.interval)

    return 0


if __name__ == "__main__":
    sys.exit(main())
