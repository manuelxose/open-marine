import assert from "node:assert/strict";
import { test } from "node:test";
import { PATHS } from "@omi/marine-data-contract";
import { createWindGpsDemoScenario } from "./windGpsDemo.js";

test("wind-gps-demo is deterministic and publishes bounded Signal K data", () => {
  const scenarioA = createWindGpsDemoScenario();
  const scenarioB = createWindGpsDemoScenario();
  let stateA = scenarioA.init();
  let stateB = scenarioB.init();

  for (let index = 0; index < 120; index += 1) {
    const timestamp = new Date(1_700_000_000_000 + index * 1_000).toISOString();
    const resultA = scenarioA.tick(stateA, 1, timestamp);
    const resultB = scenarioB.tick(stateB, 1, timestamp);
    stateA = resultA.state;
    stateB = resultB.state;

    assert.deepEqual(resultA, resultB);
    const values = new Map(resultA.points.map((point) => [point.path, point.value]));
    const sog = values.get(PATHS.navigation.speedOverGround);
    const aws = values.get(PATHS.environment.wind.speedApparent);
    const tws = values.get(PATHS.environment.wind.speedTrue);
    const awa = values.get(PATHS.environment.wind.angleApparent);
    const twd = values.get(PATHS.environment.wind.angleTrueGround);

    assert.equal(typeof sog, "number");
    assert.equal(typeof aws, "number");
    assert.equal(typeof tws, "number");
    assert.ok((sog as number) >= 2.8 && (sog as number) <= 4.6);
    assert.ok((aws as number) >= 0);
    assert.ok((tws as number) >= 3.5 && (tws as number) <= 10.8);
    assert.ok((awa as number) >= 0 && (awa as number) < Math.PI * 2);
    assert.ok((twd as number) >= 0 && (twd as number) < Math.PI * 2);
  }
});
