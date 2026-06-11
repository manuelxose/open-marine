import { AisGateway, loadAisConfig } from "./ais/index.js";
import { StubSensorGateway } from "./gateway.js";

const gateway = new StubSensorGateway();
const aisConfig = loadAisConfig();
const aisGateway = new AisGateway(aisConfig);

console.info("[gateway] stub running. No adapters are enabled yet.");
void gateway.start();
console.info(
  `[ais] forward mode ${aisConfig.forwardMode} to ${aisConfig.signalKHost}:${aisConfig.signalKPort}`,
);
aisGateway.start();

const keepAliveTimer = setInterval(() => undefined, 60_000);

const shutdown = async (): Promise<void> => {
  clearInterval(keepAliveTimer);
  await aisGateway.stop();
  await gateway.stop();
  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown();
});

process.on("SIGTERM", () => {
  void shutdown();
});
