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

  const interval = setInterval(() => {
    const now = new Date().toISOString();
    const dt = 0.2;

    heading += (Math.random() - 0.5) * 0.02;
    if (heading < 0) heading += Math.PI * 2;
    if (heading > Math.PI * 2) heading -= Math.PI * 2;

    const distance = sog * dt;
    const metersPerDegLat = 111320;
    const metersPerDegLon = metersPerDegLat * Math.cos((lat * Math.PI) / 180);
    lat += (Math.cos(heading) * distance) / metersPerDegLat;
    lon += (Math.sin(heading) * distance) / metersPerDegLon;

    const updates = [
      {
        path: 'navigation.position',
        value: { latitude: lat, longitude: lon }
      },
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
        value: 10 + Math.random() * 2
      }
    ];

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
});
