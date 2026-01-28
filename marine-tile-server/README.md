# Marine Tile Server

Lightweight server to serve MBTiles as standard XYZ tile endpoints.

## Installation

```bash
cd marine-tile-server
npm install
npm run build
```

## Running

### Local

```bash
MBTILES_PATH=../data/my-chart.mbtiles npm start
```

### Docker

```bash
docker build -t marine-tile-server .
docker run -p 8080:8080 -v /path/to/charts:/app/data marine-tile-server
```

## Endpoints

- `GET /tiles/{z}/{x}/{y}.png`: Serve a specific tile.
- `GET /metadata`: Fetch MBTiles metadata JSON.

## Configuration
- `PORT`: Port to listen on (default 8080).
- `MBTILES_PATH`: Path to the MBTiles file to serve.
