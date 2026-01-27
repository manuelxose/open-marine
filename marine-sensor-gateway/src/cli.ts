import { StubSensorGateway } from "./gateway.js";

const gateway = new StubSensorGateway();

console.info("[gateway] stub running. No adapters are enabled yet.");
void gateway.start();

const keepAliveTimer = setInterval(() => undefined, 60_000);

const shutdown = async (): Promise<void> => {
  clearInterval(keepAliveTimer);
  await gateway.stop();
  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown();
});

process.on("SIGTERM", () => {
  void shutdown();
});
