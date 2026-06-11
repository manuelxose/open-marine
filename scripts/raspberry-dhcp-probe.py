import os
import socket
import struct
import time

SERVER_IP = os.environ.get("OMI_DHCP_SERVER_IP", "192.168.137.1")
OFFER_IP = os.environ.get("OMI_DHCP_OFFER_IP", "192.168.137.2")
LEASE_SECONDS = int(os.environ.get("OMI_DHCP_LEASE_SECONDS", "3600"))
DURATION_SECONDS = int(os.environ.get("OMI_DHCP_DURATION_SECONDS", "3600"))

END = 255
MSG_TYPE = 53
SERVER_ID = 54
LEASE = 51
SUBNET = 1
ROUTER = 3
DNS = 6


def ip_bytes(ip):
    return socket.inet_aton(ip)


def parse_options(data):
    opts = {}
    i = 240
    while i < len(data):
        code = data[i]
        if code == END:
            break
        if code == 0:
            i += 1
            continue
        length = data[i + 1]
        opts[code] = data[i + 2 : i + 2 + length]
        i += 2 + length
    return opts


def option(code, value):
    return bytes([code, len(value)]) + value


def build_reply(request, msg_type):
    packet = bytearray(240)
    packet[0] = 2
    packet[1] = 1
    packet[2] = 6
    packet[4:8] = request[4:8]
    packet[10:12] = request[10:12]
    packet[16:20] = ip_bytes(OFFER_IP)
    packet[20:24] = ip_bytes(SERVER_IP)
    packet[28:44] = request[28:44]
    packet[236:240] = b"\x63\x82\x53\x63"
    opts = b"".join(
        [
            option(MSG_TYPE, bytes([msg_type])),
            option(SERVER_ID, ip_bytes(SERVER_IP)),
            option(LEASE, struct.pack("!I", LEASE_SECONDS)),
            option(SUBNET, ip_bytes("255.255.255.0")),
            option(ROUTER, ip_bytes(SERVER_IP)),
            option(DNS, ip_bytes("1.1.1.1")),
            bytes([END]),
        ]
    )
    return bytes(packet) + opts


def mac_from_request(data):
    return ":".join(f"{b:02x}" for b in data[28:34])


def send_reply(sock, payload):
    for target in ["255.255.255.255", f"{SERVER_IP.rsplit('.', 1)[0]}.255", OFFER_IP]:
        try:
            sock.sendto(payload, (target, 68))
            print(f"reply sent to {target}", flush=True)
            return
        except OSError as exc:
            print(f"reply to {target} failed: {exc}", flush=True)


sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
sock.bind(("0.0.0.0", 67))
sock.settimeout(0.5)
deadline = time.time() + DURATION_SECONDS

print(f"DHCP probe listening; offering {OFFER_IP} via {SERVER_IP}", flush=True)

while time.time() < deadline:
    try:
        data, _ = sock.recvfrom(4096)
    except socket.timeout:
        continue
    if len(data) < 240 or data[236:240] != b"\x63\x82\x53\x63":
        continue

    opts = parse_options(data)
    kind = opts.get(MSG_TYPE, b"\x00")[0]
    mac = mac_from_request(data)
    if kind == 1:
        print(f"DISCOVER from {mac}", flush=True)
        send_reply(sock, build_reply(data, 2))
    elif kind == 3:
        print(f"REQUEST from {mac}", flush=True)
        send_reply(sock, build_reply(data, 5))

print("DHCP probe finished", flush=True)
