#!/usr/bin/env python3
"""Exclusive, fail-safe Raspberry-side CLI for the OMI Pico 2 bridge."""

import argparse
import fcntl
import glob
import json
import math
import os
from pathlib import Path
import signal
import sys
import time

import serial

DEVICE_GLOB = "/dev/serial/by-id/usb-MicroPython_Board_in_FS_mode_*-if00"
LOCK_PATH = "/tmp/omi-pico2-control.lock"
PID_PATH = "/tmp/omi-pico2-control.pid"
CALIBRATION_PATH = Path.home() / ".config" / "omi" / "pico2-current.json"
BENCH_PROFILE = "bench-motor"
BENCH_ABSOLUTE_MAX_DUTY = 20
BENCH_MAX_MILLISECONDS = 1_000
BENCH_MIN_PAUSE_SECONDS = 2.0


def resolve_device(requested):
    matches = [requested] if requested else sorted(glob.glob(DEVICE_GLOB))
    if len(matches) != 1:
        raise RuntimeError("Expected exactly one Pico 2, found {}".format(len(matches)))
    return matches[0]


def send(port, frame):
    port.write((frame + "\n").encode("ascii"))
    port.flush()


def best_effort_stop(port, attempts=3):
    for _attempt in range(attempts):
        try:
            send(port, "X")
        except (OSError, serial.SerialException):
            pass
        time.sleep(0.05)


def lines(port, seconds=0.35):
    deadline = time.monotonic() + seconds
    result = []
    while time.monotonic() < deadline:
        raw = port.readline()
        if raw:
            result.append(raw.decode("utf-8", errors="replace").strip())
    return result


def query(port):
    send(port, "P")
    response = lines(port)
    for line in response:
        if line.startswith(("R,", "F,")):
            print(line, flush=True)
    return response


def status_values(response):
    status = next((line for line in response if line.startswith("R,pico2,")), "")
    values = {}
    for item in status.split(",")[2:]:
        key, separator, value = item.partition("=")
        if separator:
            values[key] = value
    return status, values


def require_stopped(values):
    for key in ("enabled", "drive", "pwm_output"):
        if key not in values:
            raise RuntimeError("Pico status is missing {}: {}".format(key, values))
    if values.get("enabled") != "0":
        raise RuntimeError("Pico remains enabled: {}".format(values))
    drive = float(values["drive"])
    pwm_output = float(values["pwm_output"])
    if not math.isfinite(drive) or abs(drive) > 0:
        raise RuntimeError("Pico drive is not zero: {}".format(values))
    if not math.isfinite(pwm_output) or abs(pwm_output) > 0:
        raise RuntimeError("Pico PWM output is not zero: {}".format(values))


def require_bench_status(response, require_heartbeat=False):
    status, values = status_values(response)
    if values.get("profile") != BENCH_PROFILE:
        raise RuntimeError(
            "Refusing motor command: active profile is not bench-motor: {}".format(
                status
            )
        )
    if values.get("ready") != "1":
        raise RuntimeError("bench-motor is not ready: {}".format(status))
    if values.get("fault"):
        raise RuntimeError("bench-motor has a latched fault: {}".format(status))
    if values.get("current") != "unavailable":
        raise RuntimeError(
            "bench-motor must report current=unavailable: {}".format(status)
        )
    if require_heartbeat and values.get("heartbeat") != "1":
        raise RuntimeError("Pico heartbeat check failed: {}".format(status))
    return status, values


def bench_drive_value(direction_name, duty_percent):
    sign = 1 if direction_name == "starboard" else -1
    return sign * duty_percent / 100


def bench_warning(values, direction_name, duty_percent, milliseconds):
    print("BENCH MOTOR LIMITED TEST", flush=True)
    print("profile={}".format(values["profile"]), flush=True)
    print(
        "GPIO PWM={} DIR={}".format(values.get("pwm"), values.get("dir")),
        flush=True,
    )
    print("direction={}".format(direction_name), flush=True)
    print("duty={} percent".format(duty_percent), flush=True)
    print("duration={} ms".format(milliseconds), flush=True)
    print(
        "WARNING: no electronic current measurement or over-current cutoff is available.",
        flush=True,
    )
    if values.get("estop") == "not-configured":
        print(
            "WARNING: GP13 auxiliary E-stop is not configured; only the explicit confirmation and external power protection remain.",
            flush=True,
        )


def bench_preflight(port):
    initial = query(port)
    _status, values = require_bench_status(initial)
    require_stopped(values)
    max_duty = round(float(values.get("max_drive", "0")) * 100)
    if not 1 <= max_duty <= BENCH_ABSOLUTE_MAX_DUTY:
        raise RuntimeError("Invalid bench-motor maximum duty: {}%".format(max_duty))
    if values.get("estop") == "active":
        raise RuntimeError("GP13 E-stop is open/active")
    if values.get("estop") == "not-configured":
        print("WARNING: E-stop GP13 is not configured.", flush=True)
    send(port, "H")
    heartbeat_response = query(port)
    require_bench_status(heartbeat_response, require_heartbeat=True)
    best_effort_stop(port)
    final = query(port)
    _status, final_values = require_bench_status(final)
    require_stopped(final_values)
    print(
        "bench-motor preflight PASS; max duty={}%, current=unavailable, motor not moved.".format(
            max_duty
        ),
        flush=True,
    )
    return final_values


def bench_drive_for(port, direction_name, duty_percent, milliseconds):
    response = query(port)
    _status, values = require_bench_status(response)
    require_stopped(values)
    configured_max = float(values["max_drive"]) * 100
    if duty_percent > configured_max + 0.001:
        raise RuntimeError(
            "Duty {}% exceeds active bench-motor limit {:.0f}%".format(
                duty_percent, configured_max
            )
        )
    bench_warning(values, direction_name, duty_percent, milliseconds)
    drive = bench_drive_value(direction_name, duty_percent)
    rearm(port)
    deadline = time.monotonic() + milliseconds / 1000
    try:
        while time.monotonic() < deadline:
            send(port, "H")
            send(port, "C,0,{:.3f},1".format(drive))
            time.sleep(0.05)
    finally:
        best_effort_stop(port)
    time.sleep(0.15)
    stopped_response = query(port)
    _status, stopped_values = require_bench_status(stopped_response)
    require_stopped(stopped_values)
    print("Pulse complete; PWM=0 DIR=0.", flush=True)


def bench_direction_test(port):
    try:
        bench_stop(port)
        bench_drive_for(port, "starboard", 5, 800)
        time.sleep(3.0)
        bench_drive_for(port, "port", 5, 800)
    finally:
        best_effort_stop(port)
    bench_stop(port)


def bench_ramp(port, direction_name):
    try:
        for duty in (2, 4, 6, 8, 10):
            bench_drive_for(port, direction_name, duty, 800)
            time.sleep(BENCH_MIN_PAUSE_SECONDS)
    finally:
        best_effort_stop(port)
    bench_stop(port)


def bench_stop(port):
    best_effort_stop(port)
    time.sleep(0.15)
    response = query(port)
    _status, values = status_values(response)
    require_stopped(values)
    print("bench-motor STOP confirmed: enabled=0 drive=0 PWM=0 DIR=0.", flush=True)


def bench_watchdog_test(port):
    response = query(port)
    _status, values = require_bench_status(response)
    require_stopped(values)
    bench_warning(values, "starboard", 5, 1_000)
    rearm(port)
    send(port, "H")
    started = time.monotonic()
    send(port, "C,0,0.050,1")
    stopped_at = None
    saw_motion = False
    previous_timeout = getattr(port, "timeout", None)
    if previous_timeout is not None:
        port.timeout = 0.01
    try:
        while time.monotonic() - started <= 0.65:
            send(port, "P")
            for line in lines(port, 0.025):
                if line.startswith("R,pico2,"):
                    _status, current = status_values([line])
                    if (
                        current.get("enabled") == "1"
                        and float(current.get("pwm_output", "0")) > 0
                    ):
                        saw_motion = True
                    if (
                        saw_motion
                        and current.get("enabled") == "0"
                        and current.get("drive") == "0.000"
                        and current.get("pwm_output") == "0.000"
                    ):
                        stopped_at = time.monotonic()
                        break
            if stopped_at is not None:
                break
        if not saw_motion:
            raise RuntimeError("Watchdog test never observed active PWM")
        if stopped_at is None:
            raise RuntimeError("Watchdog did not stop PWM")
        elapsed_ms = (stopped_at - started) * 1000
        if elapsed_ms > 500:
            raise RuntimeError(
                "Watchdog FAIL: PWM stopped after {:.1f} ms".format(elapsed_ms)
            )
        print("Watchdog PASS: PWM stopped after {:.1f} ms.".format(elapsed_ms))
    finally:
        if previous_timeout is not None:
            port.timeout = previous_timeout
        best_effort_stop(port)
    bench_stop(port)


def load_calibration():
    try:
        return json.loads(CALIBRATION_PATH.read_text(encoding="utf-8"))
    except (FileNotFoundError, ValueError):
        return {}


def save_calibration(values):
    calibration = load_calibration()
    calibration.update(values)
    CALIBRATION_PATH.parent.mkdir(parents=True, exist_ok=True)
    CALIBRATION_PATH.write_text(
        json.dumps(calibration, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    print("Calibration saved: {}".format(CALIBRATION_PATH), flush=True)


def calibrate_current(port, volts_per_amp, limit_amps, sample_count):
    samples = []
    for _index in range(sample_count):
        send(port, "V")
        for line in lines(port, 0.08):
            if line.startswith("R,adc,current_v="):
                samples.append(float(line.rsplit("=", 1)[1]))
        time.sleep(0.02)
    if len(samples) < max(5, sample_count // 2):
        raise RuntimeError("Insufficient ADC samples: {}".format(len(samples)))
    zero = sum(samples) / len(samples)
    save_calibration(
        {
            "current_zero_volts": round(zero, 6),
            "current_volts_per_amp": volts_per_amp,
            "current_limit_amps": limit_amps,
            "current_samples": len(samples),
            "calibrated_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
    )
    print("Current zero calibrated at {:.4f} V".format(zero), flush=True)


def rearm(port):
    send(port, "A")
    response = lines(port, 0.2)
    if any(line.startswith("F,") for line in response):
        raise RuntimeError("Pico refused rearm: {}".format(response))


def drive_for(port, drive, seconds):
    deadline = time.monotonic() + seconds
    rearm(port)
    try:
        while time.monotonic() < deadline:
            send(port, "H")
            send(port, "C,0,{:.3f},1".format(drive))
            time.sleep(0.1)
    finally:
        send(port, "X")
        time.sleep(0.6)


def led_hold(port, duty):
    stopping = False

    def request_stop(_signum, _frame):
        nonlocal stopping
        stopping = True

    signal.signal(signal.SIGTERM, request_stop)
    signal.signal(signal.SIGINT, request_stop)
    rearm(port)
    print("LED HOLD {:.0f}% -- Ctrl+C to stop".format(duty * 100), flush=True)
    try:
        while not stopping:
            send(port, "H")
            send(port, "C,0,{:.3f},1".format(duty))
            time.sleep(0.1)
    finally:
        send(port, "X")
        time.sleep(0.6)
        print("PWM OFF", flush=True)


def fade(port, cycles, seconds):
    rearm(port)
    started = time.monotonic()
    duration = cycles * seconds
    try:
        while time.monotonic() - started < duration:
            phase = ((time.monotonic() - started) % seconds) / seconds
            duty = 1.0 - abs(2.0 * phase - 1.0)
            send(port, "H")
            send(port, "C,0,{:.3f},1".format(duty))
            time.sleep(0.04)
    finally:
        send(port, "X")
        time.sleep(0.6)
    print("Fade complete; PWM OFF")


def steps(port, seconds):
    rearm(port)
    try:
        for duty in (0, 0.10, 0.25, 0.50, 0.75, 1.0):
            print("PWM {:.0f}%".format(duty * 100), flush=True)
            deadline = time.monotonic() + seconds
            while time.monotonic() < deadline:
                send(port, "H")
                send(port, "C,0,{:.3f},1".format(duty))
                time.sleep(0.1)
    finally:
        send(port, "X")
        time.sleep(0.6)


def blink(port, count):
    rearm(port)
    try:
        for index in range(count):
            drive_for(port, 1.0, 0.5)
            time.sleep(0.5)
            print(index + 1, flush=True)
    finally:
        send(port, "X")


def motor_ramp(port, direction_name):
    sign = 1 if direction_name == "starboard" else -1
    rearm(port)
    try:
        for percent in (2, 4, 6, 8, 10):
            print("{} {}%".format(direction_name, percent), flush=True)
            drive_for(port, sign * percent / 100, 0.8)
            time.sleep(1.0)
    finally:
        send(port, "X")


def watchdog(port):
    rearm(port)
    send(port, "H")
    send(port, "C,0,1.0,1")
    time.sleep(0.8)
    query(port)


def safety_test(port, seconds):
    response = query(port)
    _status, values = status_values(response)
    if values.get("estop_raw") != "0":
        raise RuntimeError("E-stop NC input is not safe: GP13 must be tied to GND")
    print("NC E-stop safe state detected (GP13=GND).", flush=True)
    print("Activate the physical E-stop within {} seconds.".format(seconds), flush=True)
    deadline = time.monotonic() + seconds
    detected = False
    while time.monotonic() < deadline:
        send(port, "P")
        for line in lines(port, 0.15):
            if "estop_raw=1" in line or line.startswith("F,estop"):
                print(line)
                detected = True
                break
        if detected:
            break
        time.sleep(0.1)
    send(port, "X")
    if not detected:
        raise RuntimeError("E-stop was not detected")
    save_calibration(
        {
            "estop_verified": True,
            "estop_verified_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
    )


def current_test(port):
    samples = []
    faults = []
    deadline = time.monotonic() + 1.0
    rearm(port)
    try:
        while time.monotonic() < deadline:
            send(port, "H")
            send(port, "C,0,0.100,1")
            for line in lines(port, 0.08):
                if line.startswith("T,,") and line[3:]:
                    try:
                        samples.append(float(line[3:]))
                    except ValueError:
                        pass
                if line.startswith("F,"):
                    faults.append(line)
    finally:
        send(port, "X")
        time.sleep(0.6)
    if faults:
        raise RuntimeError("Current guard fault: {}".format(faults))
    if not samples:
        raise RuntimeError("No current telemetry received")
    print("Current telemetry OK; peak={:.2f} A".format(max(samples)))


def require_confirmation(args):
    test_commands = {"led-on", "fade", "steps", "blink", "watchdog-test"}
    motor_commands = {"motor-pulse", "motor-ramp", "safety-test", "current-test"}
    bench_commands = {
        "bench-pulse",
        "bench-direction-test",
        "bench-ramp",
        "bench-watchdog-test",
    }
    if args.command in test_commands and not args.confirm_no_driver:
        raise RuntimeError("Use --confirm-no-driver for LED tests")
    if args.command in motor_commands and not args.confirm_motor_safe:
        raise RuntimeError("Use --confirm-motor-safe after disconnecting the mechanical load")
    if args.command in bench_commands and not args.confirm_bench_motor:
        raise RuntimeError(
            "Use --confirm-bench-motor after checking the unloaded motor, fuse and wiring"
        )


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--device")
    parser.add_argument("--confirm-no-driver", action="store_true")
    parser.add_argument("--confirm-motor-safe", action="store_true")
    parser.add_argument("--confirm-bench-motor", action="store_true")
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("status")
    commands.add_parser("stop")
    preflight = commands.add_parser("preflight")
    preflight.add_argument(
        "--profile",
        choices=("motor-commissioning", "hil-motor", "production"),
        default="production",
    )
    calibration = commands.add_parser("calibrate-current")
    calibration.add_argument("--volts-per-amp", type=float, required=True)
    calibration.add_argument("--limit-amps", type=float, default=10.0)
    calibration.add_argument("--samples", type=int, default=30)

    hold = commands.add_parser("led-on")
    hold.add_argument("--duty", type=int, default=100)
    fade_cmd = commands.add_parser("fade")
    fade_cmd.add_argument("--cycles", type=int, default=3)
    fade_cmd.add_argument("--seconds", type=float, default=4)
    step_cmd = commands.add_parser("steps")
    step_cmd.add_argument("--seconds", type=float, default=2)
    blink_cmd = commands.add_parser("blink")
    blink_cmd.add_argument("--count", type=int, default=10)
    commands.add_parser("watchdog-test")

    pulse = commands.add_parser("motor-pulse")
    pulse.add_argument("direction", choices=("port", "starboard"))
    ramp = commands.add_parser("motor-ramp")
    ramp.add_argument("direction", choices=("port", "starboard"))
    safety = commands.add_parser("safety-test")
    safety.add_argument("--seconds", type=int, default=15)
    commands.add_parser("current-test")
    commands.add_parser("bench-preflight")
    bench_pulse = commands.add_parser("bench-pulse")
    bench_pulse.add_argument("direction", choices=("port", "starboard"))
    bench_pulse.add_argument("--duty", type=int, default=5)
    bench_pulse.add_argument("--milliseconds", type=int, default=800)
    commands.add_parser("bench-direction-test")
    bench_ramp_cmd = commands.add_parser("bench-ramp")
    bench_ramp_cmd.add_argument("direction", choices=("port", "starboard"))
    commands.add_parser("bench-stop")
    commands.add_parser("bench-watchdog-test")
    return parser.parse_args()


def validate(args):
    require_confirmation(args)
    if not 1 <= getattr(args, "duty", 1) <= 100:
        raise RuntimeError("duty must be 1..100")
    if not 1 <= getattr(args, "cycles", 1) <= 20:
        raise RuntimeError("cycles must be 1..20")
    if not 0.5 <= getattr(args, "seconds", 1) <= 30:
        raise RuntimeError("seconds must be 0.5..30")
    if args.command == "calibrate-current":
        if args.volts_per_amp <= 0:
            raise RuntimeError("volts-per-amp must be greater than zero")
        if not 0 < args.limit_amps <= 10:
            raise RuntimeError("initial current limit must be within 0..10 A")
        if not 10 <= args.samples <= 200:
            raise RuntimeError("samples must be 10..200")
    if args.command == "bench-pulse":
        if not 1 <= args.duty <= BENCH_ABSOLUTE_MAX_DUTY:
            raise RuntimeError("bench duty must be within 1..20 percent")
        if not 50 <= args.milliseconds <= BENCH_MAX_MILLISECONDS:
            raise RuntimeError("bench pulse must be within 50..1000 ms")


def stop_active_process():
    try:
        with open(PID_PATH, encoding="ascii") as pid_file:
            active_pid = int(pid_file.read().strip())
    except (FileNotFoundError, ValueError):
        return
    if active_pid == os.getpid():
        return
    try:
        os.kill(active_pid, signal.SIGTERM)
    except ProcessLookupError:
        return
    deadline = time.monotonic() + 2
    while time.monotonic() < deadline:
        try:
            os.kill(active_pid, 0)
        except ProcessLookupError:
            return
        time.sleep(0.05)


def run(port, args):
    if args.command in ("status", "preflight"):
        response = query(port)
        status, values = status_values(response)
        if not status:
            raise RuntimeError("Pico did not return a status frame")
        if args.command == "preflight":
            if values.get("profile") != args.profile or values.get("ready") != "1":
                raise RuntimeError("{} preflight failed: {}".format(args.profile, status))
    elif args.command == "stop":
        send(port, "X")
        time.sleep(0.6)
        query(port)
    elif args.command == "led-on":
        led_hold(port, args.duty / 100)
    elif args.command == "fade":
        fade(port, args.cycles, args.seconds)
    elif args.command == "steps":
        steps(port, args.seconds)
    elif args.command == "blink":
        blink(port, args.count)
    elif args.command == "watchdog-test":
        watchdog(port)
    elif args.command == "motor-pulse":
        drive_for(port, 0.10 if args.direction == "starboard" else -0.10, 1.0)
    elif args.command == "motor-ramp":
        motor_ramp(port, args.direction)
    elif args.command == "safety-test":
        safety_test(port, args.seconds)
    elif args.command == "current-test":
        current_test(port)
    elif args.command == "calibrate-current":
        calibrate_current(
            port, args.volts_per_amp, args.limit_amps, args.samples
        )
    elif args.command == "bench-preflight":
        bench_preflight(port)
    elif args.command == "bench-pulse":
        bench_drive_for(
            port, args.direction, args.duty, args.milliseconds
        )
    elif args.command == "bench-direction-test":
        bench_direction_test(port)
    elif args.command == "bench-ramp":
        bench_ramp(port, args.direction)
    elif args.command == "bench-stop":
        bench_stop(port)
    elif args.command == "bench-watchdog-test":
        bench_watchdog_test(port)


def main():
    args = parse_args()
    validate(args)
    if args.command in ("stop", "bench-stop"):
        stop_active_process()
    with open(LOCK_PATH, "w", encoding="ascii") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise RuntimeError("Another Pico 2 control process is active")
        lock.write(str(os.getpid()))
        lock.flush()
        with open(PID_PATH, "w", encoding="ascii") as pid:
            pid.write(str(os.getpid()))
        try:
            with serial.Serial(
                resolve_device(args.device), 115200, timeout=0.1, write_timeout=1
            ) as port:
                time.sleep(0.3)
                port.reset_input_buffer()
                run(port, args)
        finally:
            try:
                os.unlink(PID_PATH)
            except FileNotFoundError:
                pass


if __name__ == "__main__":
    try:
        main()
    except (OSError, RuntimeError, ValueError, serial.SerialException) as error:
        print("ERROR: {}".format(error), file=sys.stderr)
        raise SystemExit(1)
