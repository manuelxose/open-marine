import path from 'node:path';
import fsSync from 'node:fs';

const usage = [
  'Usage:',
  '  npm run convert:s57 -- --input <chart.000> --output <chart.mbtiles> [--dry-run]',
  '',
  'The real conversion requires ogr2ogr and tippecanoe on PATH.',
  'Encrypted S-63/oeSENC charts are not supported.',
].join('\n');

const args = parseArgs(process.argv.slice(2));

const commands = [
  `ogr2ogr -f GeoJSON <workdir>/depth_areas-DEPARE.geojson ${quote(args.input)} DEPARE`,
  `ogr2ogr -f GeoJSON <workdir>/depth_contours-DEPCNT.geojson ${quote(args.input)} DEPCNT`,
  `ogr2ogr -f GeoJSON <workdir>/soundings-SOUNDG.geojson ${quote(args.input)} SOUNDG`,
  `ogr2ogr -f GeoJSON <workdir>/buoys-BOYLAT.geojson ${quote(args.input)} BOYLAT`,
  `ogr2ogr -f GeoJSON <workdir>/hazards-WRECKS.geojson ${quote(args.input)} WRECKS`,
  `ogr2ogr -f GeoJSON <workdir>/anchorages-ACHARE.geojson ${quote(args.input)} ACHARE`,
  `ogr2ogr -f GeoJSON <workdir>/lights-LIGHTS.geojson ${quote(args.input)} LIGHTS`,
  `ogr2ogr -f GeoJSON <workdir>/land-LNDARE.geojson ${quote(args.input)} LNDARE`,
  `ogr2ogr -f GeoJSON <workdir>/shoreline-COALNE.geojson ${quote(args.input)} COALNE`,
  `tippecanoe -o ${quote(args.output)} --force --no-tile-compression --minimum-zoom=4 --maximum-zoom=16 <workdir>/*.geojson`,
];

if (args.dryRun) {
  console.log(commands.join('\n'));
} else {
  console.error('Use POST /charts/import/s57 for managed S-57 conversion jobs, or run with --dry-run to inspect commands.');
  process.exitCode = 1;
}

function parseArgs(argv: string[]): { input: string; output: string; dryRun: boolean } {
  const values = new Map<string, string | boolean>();
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key?.startsWith('--')) {
      throw new Error(usage);
    }
    if (key === '--dry-run') {
      values.set(key, true);
      continue;
    }
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for ${key}\n\n${usage}`);
    }
    values.set(key, value);
    index += 1;
  }

  const input = path.resolve(readRequired(values, '--input'));
  const output = path.resolve(readRequired(values, '--output'));
  if (!fsSync.existsSync(input)) {
    throw new Error(`Input file not found: ${input}`);
  }
  if (path.extname(output).toLowerCase() !== '.mbtiles') {
    throw new Error('Output file must end with .mbtiles');
  }

  return {
    input,
    output,
    dryRun: values.get('--dry-run') === true,
  };
}

function readRequired(values: Map<string, string | boolean>, key: string): string {
  const value = values.get(key);
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Missing ${key}\n\n${usage}`);
  }
  return value;
}

function quote(value: string): string {
  return /\s/.test(value) ? `"${value.replaceAll('"', '\\"')}"` : value;
}
