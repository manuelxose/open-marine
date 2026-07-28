import { test } from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { CommandApi, type AutopilotCommands } from "../app/command-api.js";
import { Logger } from "../app/logger.js";

const commands = (ok: boolean): AutopilotCommands => ({
  setMode: () => undefined,
  engage: () => ({ ok: true }),
  disengage: () => undefined,
  setTargetRad: () => undefined,
  dodgeRad: () => undefined,
  clearFault: () => undefined,
  getStatus: () => ({ state: "standby", mode: "compass", engaged: false, fault: "none" }),
  getTuning: () => ({
    kp: 1,
    ki: 0,
    kd: 0,
    deadbandDeg: 1,
    rudderLimitDeg: 35,
    pwmMin: 0.15,
    pwmMax: 1,
    currentLimitA: 10,
    voltageCutoff: 11.5,
  }),
    setTuning: (_partial) => commands(ok).getTuning(),
  emergencyStop: () => undefined,
  driveTest: () => ({ ok: true }),
  resetSimulation: () => ok ? { ok: true } : { ok: false, reason: "simulation reset requires AP_MOTOR_BACKEND=sim" },
});

test("POST /sim/reset returns 409 when simulation reset is unavailable", async () => {
  const api = new CommandApi(0, commands(false), new Logger("test", "error"));
  await api.start();
  const server = (api as unknown as { server: { address(): AddressInfo } }).server;
  const { port } = server.address();
  try {
    const response = await fetch(`http://127.0.0.1:${port}/sim/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        origin: { latitude: 42.24, longitude: -8.72 },
        cruiseSpeedKt: 5,
        trueWindDirDeg: 45,
        trueWindSpeedKt: 12,
      }),
    });
    assert.equal(response.status, 409);
  } finally {
    await api.stop();
  }
});
