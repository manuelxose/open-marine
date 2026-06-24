# Raspberry connection

## Current addresses

The Raspberry is reachable through two network paths:

| Path | Address | Status |
| --- | --- | --- |
| Wi-Fi / LAN | `192.168.1.43` | SSH, UI, and Signal K reachable |
| Direct cable | `192.168.137.2` | SSH, UI, and Signal K reachable when DHCP helper is running |

Detected Raspberry MAC addresses:

- Cable: `88:a2:9e:6a:73:e1`
- Wi-Fi / LAN: `88:a2:9e:6a:73:e2`

## Browser URLs

Signal K is currently available at:

- LAN: `http://192.168.1.43:3000/signalk`
- Cable: `http://192.168.137.2:3000/signalk`

Signal K API is available at:

- LAN: `http://192.168.1.43:3000/signalk/v1/api/`
- Cable: `http://192.168.137.2:3000/signalk/v1/api/`

The Angular UI is served by the `omi-ui.service` systemd service on port `4200`:

- LAN: `http://192.168.1.43:4200/`
- Cable: `http://192.168.137.2:4200/`

Running services on the Raspberry:

| Service | Purpose |
| --- | --- |
| `signalk` Docker container | Signal K server on port `3000` |
| `omi-gps.service` | GPS publisher to local Signal K |
| `omi-imu.service` | IMU publisher to local Signal K |
| `omi-ais.service` | AIS-catcher (RTL-SDR) -> UDP `10110` -> Signal K AIS targets |
| `omi-ui.service` | Compiled Angular UI on port `4200` |

## SSH

VS Code Remote SSH uses `C:\Users\Admin\.ssh\config`. These hosts are configured:

```sshconfig
Host omi-raspberry-lan
    HostName 192.168.1.43
    User manu
    Port 22
    StrictHostKeyChecking accept-new

Host omi-raspberry-cable
    HostName 192.168.137.2
    User manu
    Port 22
    StrictHostKeyChecking accept-new
```

Connect from PowerShell:

```powershell
ssh omi-raspberry-lan
ssh omi-raspberry-cable
```

VS Code:

1. Run `Remote-SSH: Connect to Host...`
2. Select `omi-raspberry-lan` when on the same LAN.
3. Select `omi-raspberry-cable` when using the direct cable.

This PC's public key (`C:\Users\Admin\.ssh\id_ed25519.pub`) is already installed in `~/.ssh/authorized_keys` on the Raspberry, so `ssh omi-raspberry-lan` connects without a password. If a new PC needs access, append its public key the same way:

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "<contents of id_ed25519.pub>" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

The local ignored file `config/omi.env` stores the current Raspberry connection details for scripts. Do not commit passwords to tracked files.

## Raspberry service checks

Run these commands after connecting by SSH:

```bash
systemctl status omi-ui.service
systemctl status omi-gps.service
systemctl status omi-imu.service
systemctl status omi-ais.service
docker ps --filter name=signalk
```

Restart a service if needed:

```bash
sudo systemctl restart omi-ui.service
sudo systemctl restart omi-ais.service
```

`omi-ais.service` runs `scripts/start-ais.sh`, which launches AIS-catcher against the RTL-SDR
dongle and streams NMEA0183 over UDP to `127.0.0.1:10110` (tunable via `AIS_PPM`, `AIS_GAIN`,
`AIS_HOST`, `AIS_PORT` in `config/omi.env`). Signal K's `ais-catcher-udp` piped provider listens
on that port and turns the AIS sentences into vessel targets under
`/signalk/v1/api/vessels`.

## Direct cable DHCP

If the direct cable address disappears, set Ethernet to `192.168.137.1/24` and run the DHCP helper:

```powershell
New-NetIPAddress -InterfaceAlias "Ethernet" -IPAddress 192.168.137.1 -PrefixLength 24
$env:OMI_DHCP_DURATION_SECONDS="3600"
python scripts/raspberry-dhcp-probe.py
```

The helper offers `192.168.137.2` to the Raspberry.

To return Ethernet to DHCP:

```powershell
Remove-NetIPAddress -InterfaceAlias "Ethernet" -IPAddress 192.168.137.1 -Confirm:$false
Set-NetIPInterface -InterfaceAlias "Ethernet" -AddressFamily IPv4 -Dhcp Enabled
```
