import express from 'express';
import Database from 'better-sqlite3';
import cors from 'cors';
import path from 'path';

const app = express();
const port = process.env.PORT || 8080;
const mbtilesPath = process.env.MBTILES_PATH || path.join(__dirname, '../data/chart.mbtiles');

app.use(cors());

let db: Database.Database;

try {
  db = new Database(mbtilesPath, { readonly: true });
  console.log(`Connected to MBTiles: ${mbtilesPath}`);
} catch (err) {
  console.error(`Failed to open MBTiles file: ${mbtilesPath}`);
}

app.get('/tiles/:z/:x/:y.png', (req, res) => {
  const { z, x, y } = req.params;
  
  // MBTiles uses TMS orientation (y is flipped from XYZ)
  const zoom = parseInt(z, 10);
  const column = parseInt(x, 10);
  const rowXYZ = parseInt(y, 10);
  const rowTMS = Math.pow(2, zoom) - 1 - rowXYZ;

  try {
    const row = db.prepare('SELECT tile_data FROM tiles WHERE zoom_level = ? AND tile_column = ? AND tile_row = ?')
      .get(zoom, column, rowTMS) as { tile_data: Buffer } | undefined;

    if (row && row.tile_data) {
      res.contentType('image/png');
      res.send(row.tile_data);
    } else {
      res.status(404).send('Tile not found');
    }
  } catch (err) {
    res.status(500).send('Error fetching tile');
  }
});

app.get('/metadata', (req, res) => {
  try {
    const rows = db.prepare('SELECT name, value FROM metadata').all() as { name: string, value: string }[];
    const metadata = rows.reduce((acc, row) => {
      acc[row.name] = row.value;
      return acc;
    }, {} as any);
    res.json(metadata);
  } catch (err) {
    res.status(500).send('Error fetching metadata');
  }
});

app.listen(port, () => {
  console.log(`Tile server listening at http://localhost:${port}`);
  console.log(`Tiles available at http://localhost:${port}/tiles/{z}/{x}/{y}.png`);
});
