"""OMI Pico 2 safety bridge for LED, commissioning, and production profiles."""

import sys
import time
import uselect
from machine import ADC, Pin, PWM

import config

PWM_PIN = 15
DIR_PIN = 14
ESTOP_PIN = 13
CURRENT_PIN = 26
PWM_HZ = 20_000
WATCHDOG_MS = 500
TELEMETRY_MS = 250
PROFILE_MAX_MOTION_MS = {
    "motor-commissioning": 1_000,
    "hil-motor": 30_000,
}
VALID_PROFILES = ("bench-led", "motor-commissioning", "hil-motor", "production")

profile = config.PROFILE
direction = Pin(DIR_PIN, Pin.OUT, value=0)
pwm = PWM(Pin(PWM_PIN))
pwm.freq(PWM_HZ)
pwm.duty_u16(0)
estop_input = Pin(ESTOP_PIN, Pin.IN, Pin.PULL_UP)
current_adc = ADC(CURRENT_PIN)
poll = uselect.poll()
poll.register(sys.stdin, uselect.POLLIN)

enabled = False
drive = 0.0
heartbeat_at = None
motion_started_at = None
last_telemetry_at = time.ticks_ms()
fault = None


def estop_open():
    return estop_input.value() != 0


def estop_active():
    # NC auxiliary contact: GP13 tied to GND is safe. Pull-up means an open
    # contact, broken wire, or pressed E-stop and must therefore stop output.
    return bool(config.ESTOP_CONFIGURED and estop_open())


def current_volts():
    return current_adc.read_u16() * 3.3 / 65535


def current_amps():
    if not config.CURRENT_SENSOR_CONFIGURED:
        return None
    volts = current_volts()
    return abs((volts - config.CURRENT_ZERO_VOLTS) / config.CURRENT_VOLTS_PER_AMP)


def hardware_safety_ready():
    return (
        config.ESTOP_CONFIGURED
        and config.CURRENT_SENSOR_CONFIGURED
        and config.CURRENT_VOLTS_PER_AMP > 0
        and config.CURRENT_LIMIT_AMPS > 0
    )


def stop_output():
    global enabled, drive, motion_started_at
    pwm.duty_u16(0)
    direction.value(0)
    enabled = False
    drive = 0.0
    motion_started_at = None


def latch_fault(reason):
    global fault
    stop_output()
    if fault is None:
        fault = reason
        print("F,{}".format(reason))


def heartbeat_fresh():
    return heartbeat_at is not None and time.ticks_diff(
        time.ticks_ms(), heartbeat_at
    ) <= WATCHDOG_MS


def safety_reason():
    amps = current_amps()
    if profile not in VALID_PROFILES:
        return "invalid-profile"
    if profile != "bench-led" and not hardware_safety_ready():
        return "safety-not-configured"
    if estop_active():
        return "estop"
    if amps is not None and amps > config.CURRENT_LIMIT_AMPS:
        return "overcurrent"
    return None


def apply_output():
    reason = safety_reason()
    if reason:
        latch_fault(reason)
        return
    if fault or not enabled or not heartbeat_fresh():
        pwm.duty_u16(0)
        return
    limit = 0.10 if profile in ("motor-commissioning", "hil-motor") else 1.0
    duty = min(limit, abs(drive))
    direction.value(1 if drive >= 0 else 0)
    pwm.duty_u16(round(duty * 65535))


def print_status():
    amps = current_amps()
    print(
        "R,pico2,profile={},pwm={},dir={},enabled={},drive={:.3f},"
        "heartbeat={},estop={},estop_raw={},current={},current_v={:.4f},ready={},fault={}".format(
            profile,
            PWM_PIN,
            DIR_PIN,
            int(enabled),
            drive,
            int(heartbeat_fresh()),
            int(estop_active()),
            int(estop_open()),
            "" if amps is None else "{:.2f}".format(amps),
            current_volts(),
            int(True if profile == "bench-led" else hardware_safety_ready()),
            fault or "",
        )
    )


def handle_frame(line):
    global enabled, drive, heartbeat_at, fault, motion_started_at
    parts = [part.strip() for part in line.split(",")]
    kind = parts[0] if parts else ""

    if kind == "H" and len(parts) == 1:
        heartbeat_at = time.ticks_ms()
        apply_output()
        return
    if kind == "X" and len(parts) == 1:
        stop_output()
        return
    if kind == "A" and len(parts) == 1:
        stop_output()
        reason = safety_reason()
        if reason:
            latch_fault(reason)
        else:
            fault = None
            print("R,rearmed")
        return
    if kind == "P" and len(parts) == 1:
        print_status()
        return
    if kind == "V" and len(parts) == 1:
        print("R,adc,current_v={:.4f}".format(current_volts()))
        return
    if kind == "C" and len(parts) == 4:
        requested_drive = float(parts[2])
        requested_enable = parts[3] == "1"
        if not -1.0 <= requested_drive <= 1.0 or parts[3] not in ("0", "1"):
            raise ValueError("invalid-command")
        if profile in ("motor-commissioning", "hil-motor") and abs(requested_drive) > 0.10:
            latch_fault("{}-limit".format(profile))
            return
        if requested_enable and abs(requested_drive) > 0 and motion_started_at is None:
            motion_started_at = time.ticks_ms()
        if not requested_enable or requested_drive == 0:
            motion_started_at = None
        drive = requested_drive
        enabled = requested_enable
        apply_output()
        return
    raise ValueError("invalid-frame")


stop_output()
if profile not in VALID_PROFILES:
    latch_fault("invalid-profile")
print("R,ready,pico2,profile={},watchdog_ms={}".format(profile, WATCHDOG_MS))

try:
    while True:
        now = time.ticks_ms()
        if poll.poll(10):
            frame = sys.stdin.readline().strip()
            is_protocol_frame = (
                frame in ("H", "X", "A", "P", "V") or frame.startswith("C,")
            )
            if (
                frame
                and is_protocol_frame
                and all(ord(character) >= 32 for character in frame)
            ):
                try:
                    handle_frame(frame)
                except (ValueError, TypeError, ZeroDivisionError):
                    latch_fault("invalid-command")

        if enabled and not heartbeat_fresh():
            latch_fault("heartbeat-timeout")
        max_motion_ms = PROFILE_MAX_MOTION_MS.get(profile)
        if (
            max_motion_ms is not None
            and motion_started_at is not None
            and time.ticks_diff(now, motion_started_at) > max_motion_ms
        ):
            latch_fault("{}-timeout".format(profile))
        reason = safety_reason()
        if reason and (enabled or profile != "bench-led"):
            latch_fault(reason)
        if time.ticks_diff(now, last_telemetry_at) >= TELEMETRY_MS:
            last_telemetry_at = now
            amps = current_amps()
            print("T,,{}".format("" if amps is None else "{:.2f}".format(amps)))
except BaseException:
    stop_output()
    raise
