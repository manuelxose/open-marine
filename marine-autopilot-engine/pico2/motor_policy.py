"""Pure safety policy shared by the Pico firmware and host-side tests."""

VALID_PROFILES = (
    "bench-led",
    "bench-motor",
    "motor-commissioning",
    "hil-motor",
    "production",
)

BENCH_MOTOR_DEFAULT_MAX_DRIVE = 0.10
BENCH_MOTOR_ABSOLUTE_MAX_DRIVE = 0.20
BENCH_MOTOR_MAX_MOTION_MS = 1_000
BENCH_MOTOR_MIN_PAUSE_MS = 2_000
BENCH_MOTOR_WATCHDOG_MS = 450

PROFILE_MAX_MOTION_MS = {
    "bench-motor": BENCH_MOTOR_MAX_MOTION_MS,
    "motor-commissioning": 1_000,
    "hil-motor": 30_000,
}


def requires_current_sensor(profile):
    return profile in ("motor-commissioning", "hil-motor", "production")


def requires_estop(profile):
    return profile in ("motor-commissioning", "hil-motor", "production")


def profile_drive_limit(profile, configured_bench_limit=BENCH_MOTOR_DEFAULT_MAX_DRIVE):
    if profile == "bench-motor":
        return min(
            BENCH_MOTOR_ABSOLUTE_MAX_DRIVE,
            max(0.0, float(configured_bench_limit)),
        )
    if profile in ("motor-commissioning", "hil-motor"):
        return 0.10
    return 1.0


def profile_watchdog_ms(profile, default_ms=500):
    return BENCH_MOTOR_WATCHDOG_MS if profile == "bench-motor" else default_ms


def heartbeat_is_fresh(elapsed_ms, timeout_ms):
    return elapsed_ms <= timeout_ms


def direction_level(drive):
    return 1 if drive >= 0 else 0


def sensor_value(value, precision=2):
    if value is None:
        return "unavailable"
    return ("{:.%df}" % precision).format(value)
