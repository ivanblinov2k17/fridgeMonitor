"""Ищет адрес модуля МВ110 на линии RS-485 за шлюзом МКОН.

Перебирает адреса устройств и по каждому пробует прочитать один регистр.
Шлюз на адрес, где никто не отвечает, возвращает ошибку Modbus 11,
а модуль на своём адресе отвечает данными.

    python mv110_scan.py 192.168.1.31
    python mv110_scan.py 192.168.1.31 --from 2 --to 247

Зависимостей нет, работает на Python 3.8 и новее. Скрипт самостоятельный:
mv110_probe.py для него не нужен.
"""

import argparse
import socket
import struct
import sys


GATEWAY_NO_ANSWER = {10, 11}


def probe(host, port, unit, timeout):
    """Возвращает ("ok", None), ("exception", код) или ("timeout", None).

    OSError при подключении пробрасывается наружу: если до шлюза не
    достучаться, перебирать адреса бессмысленно.
    """

    sock = socket.create_connection((host, port), timeout=timeout)

    try:
        sock.settimeout(timeout)

        pdu = struct.pack(">BHH", 3, 0, 1)
        header = struct.pack(">HHHB", unit, 0, len(pdu) + 1, unit)

        sock.sendall(header + pdu)

        try:
            reply = recv_exactly(sock, 7)
            _, _, length, _ = struct.unpack(">HHHB", reply)
            body = recv_exactly(sock, length - 1)
        except socket.timeout:
            return "timeout", None

        if body[0] & 0x80:
            return "exception", body[1] if len(body) > 1 else 0

        return "ok", None

    finally:
        sock.close()


def recv_exactly(sock, n):

    data = b""

    while len(data) < n:

        chunk = sock.recv(n - len(data))

        if not chunk:
            raise socket.timeout("соединение закрыто")

        data += chunk

    return data


def main():

    parser = argparse.ArgumentParser(
        description="Поиск адреса МВ110 за шлюзом МКОН"
    )

    parser.add_argument("host", help="IP-адрес шлюза МКОН")
    parser.add_argument("--port", type=int, default=502)
    parser.add_argument("--from", dest="first", type=int, default=2)
    parser.add_argument("--to", dest="last", type=int, default=32)
    parser.add_argument("--timeout", type=float, default=2.0)

    args = parser.parse_args()

    if args.first < 2:
        print("Адрес 1 занят шлюзом, начинаю с 2", file=sys.stderr)
        args.first = 2

    print(
        f"Перебираю адреса {args.first}..{args.last} "
        f"через {args.host}:{args.port}\n"
    )

    found = []
    other = []
    silent = 0

    for unit in range(args.first, args.last + 1):

        try:
            result, code = probe(args.host, args.port, unit, args.timeout)

        except OSError as error:
            print(
                f"\nНет связи со шлюзом {args.host}:{args.port} - {error}\n"
                "Проверьте ping и IP-адрес компьютера.",
                file=sys.stderr,
            )
            return 1

        if result == "ok":
            print(f"  адрес {unit:>3}: ОТВЕТИЛ")
            found.append(unit)

        elif result == "exception" and code not in GATEWAY_NO_ANSWER:
            # Устройство на этом адресе есть, но запрос ему не понравился.
            print(f"  адрес {unit:>3}: есть устройство, ошибка Modbus {code}")
            other.append((unit, code))

        else:
            silent += 1
            print(f"  адрес {unit:>3}: нет ответа", end="\r")

    print(" " * 40)
    print("Итог:")

    if found:
        print("  модуль отвечает на адресе: " + ", ".join(map(str, found)))
        print(
            f"\nДальше: python mv110_probe.py {args.host} --unit {found[0]}"
        )

    if other:
        for unit, code in other:
            print(f"  на адресе {unit} есть устройство (ошибка Modbus {code})")

    if not found and not other:
        print(
            f"  ни один адрес из {args.first}..{args.last} не ответил.\n"
            "  Проверьте скорость, чётность и протокол Modbus RTU в МКОН и\n"
            "  МВ110, полярность A/B и питание модуля. Можно расширить\n"
            "  диапазон: --to 247"
        )
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
