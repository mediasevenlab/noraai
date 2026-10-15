#!/usr/bin/env python3
"""Forward docker-bridge connections to office services bound on 127.0.0.1.

Speech listens on 18150 and search on 18151. Those sockets are not reachable
from the nutrition containers, so this process binds the same ports on the
docker bridge addresses only.
"""

import socket
import subprocess
import threading
import time

PORTS = (18150, 18151)


def bridge_ips():
    output = subprocess.check_output(["ip", "-4", "-o", "addr", "show"], text=True)
    ips = []
    for line in output.splitlines():
        parts = line.split()
        if "inet" not in parts:
            continue
        iface = parts[1]
        if iface != "docker0" and not iface.startswith("br-"):
            continue
        address = parts[parts.index("inet") + 1].split("/")[0]
        if address.startswith("127."):
            continue
        ips.append(address)
    return ips


def pipe(source, target):
    try:
        while True:
            data = source.recv(65536)
            if not data:
                break
            target.sendall(data)
    except OSError:
        pass
    finally:
        for sock in (source, target):
            try:
                sock.close()
            except OSError:
                pass


def serve(sock, port):
    while True:
        client, _address = sock.accept()
        try:
            remote = socket.create_connection(("127.0.0.1", port), timeout=10)
        except OSError:
            client.close()
            continue
        remote.settimeout(None)
        client.settimeout(None)
        threading.Thread(target=pipe, args=(client, remote), daemon=True).start()
        threading.Thread(target=pipe, args=(remote, client), daemon=True).start()


def listen(ip, port):
    sock = socket.socket()
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.bind((ip, port))
    sock.listen(32)
    threading.Thread(target=serve, args=(sock, port), daemon=True).start()


def main():
    started = set()
    while True:
        for ip in bridge_ips():
            for port in PORTS:
                key = (ip, port)
                if key in started:
                    continue
                try:
                    listen(ip, port)
                except OSError as error:
                    print(f"skip {ip}:{port} {error}", flush=True)
                    continue
                started.add(key)
                print(f"forward {ip}:{port} -> 127.0.0.1:{port}", flush=True)
        time.sleep(30)


if __name__ == "__main__":
    main()
