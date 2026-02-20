const WebSocket = require('ws');
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Mock Signal K Server');
});

const wss = new WebSocket.Server({ server, path: '/signalk/v1/stream' });

wss.on('connection', (ws) => {
  console.log('Client connected');
  
  // Send Hello
  ws.send(JSON.stringify({
    name: "Mock Server",
    version: "1.0.0",
    self: "vessels.self",
    roles: ["master", "main"],
    timestamp: new Date().toISOString()
  }));

  // Send updates
  let lat = 42.2406;
  let lon = -8.7207;
  let heading = 1.4;
  let sog = 5.4;
  let tickCount = 0;

  // Alarm scenario timing (at 5 Hz → tick 125 = 25s, tick 250 = 50s, etc.)
  // Shallow water: ticks 125-175 (25s-35s) — depth drops to 1.5-3.0m
  // Low battery: ticks 250-300 (50s-60s) — voltage drops to 10.8-11.3V
  // GPS lost: ticks 325-500 (65s-100s, 35s gap) — no position sent, exceeds 30s threshold
  // Cycle repeats every 500 ticks (100s)
  const CYCLE_LEN = 500;

  const interval = setInterval(() => {
    const now = new Date().toISOString();
    const dt = 0.2;
    tickCount++;
    const phase = tickCount % CYCLE_LEN;

    heading += (Math.random() - 0.5) * 0.02;
    if (heading < 0) heading += Math.PI * 2;
    if (heading > Math.PI * 2) heading -= Math.PI * 2;

    const distance = sog * dt;
    const metersPerDegLat = 111320;
    const metersPerDegLon = metersPerDegLat * Math.cos((lat * Math.PI) / 180);
    lat += (Math.cos(heading) * distance) / metersPerDegLat;
    lon += (Math.sin(heading) * distance) / metersPerDegLon;

    // Determine current depth (shallow alarm scenario)
    const isShallow = phase >= 125 && phase < 175;
    const depth = isShallow
      ? 1.5 + Math.random() * 1.5    // 1.5-3.0m → triggers shallow alarm (threshold 3.0m)
      : 10 + Math.random() * 2;       // 10-12m (normal)

    // Determine battery voltage (low-battery alarm scenario)
    const isLowBattery = phase >= 250 && phase < 300;
    const voltage = isLowBattery
      ? 10.8 + Math.random() * 0.5    // 10.8-11.3V → triggers low battery alarm (threshold 11.6V)
      : 12.4 + Math.random() * 0.3;   // 12.4-12.7V (normal)

    // GPS lost scenario: skip position data for 35 seconds (exceeds 30s threshold)
    const isGpsLost = phase >= 325;

    const updates = [];

    if (!isGpsLost) {
      updates.push({
        path: 'navigation.position',
        value: { latitude: lat, longitude: lon }
      });
    }

    updates.push(
      {
        path: 'navigation.speedOverGround',
        value: sog + (Math.random() - 0.5) * 0.3
      },
      {
        path: 'navigation.courseOverGroundTrue',
        value: heading + (Math.random() - 0.5) * 0.02
      },
      {
        path: 'navigation.headingTrue',
        value: heading
      },
      {
        path: 'environment.depth.belowTransducer',
        value: depth
      },
      {
        path: 'electrical.batteries.house.voltage',
        value: voltage
      }
    );

    const msg = {
      context: 'vessels.self',
      updates: [
        {
          timestamp: now,
          source: { label: 'mock' },
          values: updates
        }
      ]
    };

    ws.send(JSON.stringify(msg));
  }, 200); // 5Hz

  ws.on('close', () => {
    clearInterval(interval);
    console.log('Client disconnected');
  });
});

server.listen(3000, () => {
  console.log('Mock Signal K Server running on port 3000');
  console.log('Alarm scenarios on 100s cycle:');
  console.log('  25s-35s : Shallow water (depth 1.5-3.0m)');
  console.log('  50s-60s : Low battery (10.8-11.3V)');
  console.log('  65s-100s: GPS lost (no position data, triggers at ~95s)');
});
