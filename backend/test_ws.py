import asyncio
from websockets.asyncio.client import connect


async def main():
    async with connect("ws://127.0.0.1:8000/ws") as ws:
        print("Connected")

        async for message in ws:
            print(message)


asyncio.run(main())