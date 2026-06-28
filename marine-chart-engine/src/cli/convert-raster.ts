import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';

type TileFormat = 'png' | 'jpeg' | 'webp';
type Resampling = 'nearest' | 'average' | 'bilinear' | 'cubic';

type ConvertArgs = {
  input: string;
  output: string;
  tileFormat: TileFormat;
  quality?: number;
  resampling: Resampling;
  overviewLevels: number[];
  skipOverviews: boolean;
  dryRun: boolean;
};

type Command = {
  command: string;
  args: string[];
};

const usage = [
  'Usage:',
  '  npm run convert:raster -- --input <chart.tif|chart.kap> --output <chart.mbtiles> [options]',
  '',
  'Options:',
  '  --tile-format png|jpeg|webp   Default: png',
  '  --quality <1-100>             JPEG/WEBP quality when supported by GDAL',
  '  --resampling nearest|average|bilinear|cubic   Default: average',
  '  --overview-levels 2,4,8,16     Default: 2,4,8,16',
  '  --skip-overviews',
  '  --dry-run',
].join('\n');

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const commands = buildCommands(args);

  if (args.dryRun) {
    for (const command of commands) {
      console.log(formatCommand(command));
    }
    return;
  }

  await assertToolAvailable('gdal_translate');
  if (!args.skipOverviews) {
    await assertToolAvailable('gdaladdo');
  }

  await fs.mkdir(path.dirname(args.output), { recursive: true });
  for (const command of commands) {
    console.log(formatCommand(command));
    await run(command);
  }

  console.log(`Created ${path.relative(process.cwd(), args.output)}`);
}

function buildCommands(args: ConvertArgs): Command[] {
  const translateArgs = [
    '-of',
    'MBTILES',
    '-co',
    `TILE_FORMAT=${args.tileFormat.toUpperCase()}`,
  ];

  if (args.quality !== undefined && args.tileFormat !== 'png') {
    translateArgs.push('-co', `QUALITY=${args.quality}`);
  }

  translateArgs.push(args.input, args.output);

  const commands: Command[] = [
    {
      command: 'gdal_translate',
      args: translateArgs,
    },
  ];

  if (!args.skipOverviews) {
    commands.push({
      command: 'gdaladdo',
      args: ['-r', args.resampling, args.output, ...args.overviewLevels.map(String)],
    });
  }

  return commands;
}

function parseArgs(argv: string[]): ConvertArgs {
  const values = new Map<string, string | boolean>();
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key?.startsWith('--')) {
      throw new Error(usage);
    }
    if (key === '--dry-run' || key === '--skip-overviews') {
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

  const tileFormat = readEnum(values, '--tile-format', ['png', 'jpeg', 'webp'], 'png');
  const quality = readOptionalInteger(values, '--quality');
  if (quality !== undefined && (quality < 1 || quality > 100)) {
    throw new Error('--quality must be between 1 and 100');
  }

  return {
    input,
    output,
    tileFormat,
    quality,
    resampling: readEnum(values, '--resampling', ['nearest', 'average', 'bilinear', 'cubic'], 'average'),
    overviewLevels: readOverviewLevels(readOptional(values, '--overview-levels') ?? '2,4,8,16'),
    skipOverviews: values.get('--skip-overviews') === true,
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

function readOptional(values: Map<string, string | boolean>, key: string): string | undefined {
  const value = values.get(key);
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readEnum<const T extends string>(
  values: Map<string, string | boolean>,
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const value = readOptional(values, key);
  if (!value) {
    return fallback;
  }
  if (!allowed.includes(value as T)) {
    throw new Error(`${key} must be one of: ${allowed.join(', ')}`);
  }
  return value as T;
}

function readOptionalInteger(values: Map<string, string | boolean>, key: string): number | undefined {
  const value = readOptional(values, key);
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${key} must be an integer`);
  }
  return parsed;
}

function readOverviewLevels(value: string): number[] {
  const levels = value.split(',').map((part) => Number.parseInt(part.trim(), 10));
  if (levels.length === 0 || levels.some((level) => !Number.isInteger(level) || level < 2)) {
    throw new Error('--overview-levels must be a comma-separated list of integers >= 2');
  }
  return levels;
}

async function assertToolAvailable(command: string): Promise<void> {
  try {
    await run({ command, args: ['--version'] }, { silent: true });
  } catch {
    throw new Error(`${command} was not found. Install GDAL and ensure ${command} is on PATH.`);
  }
}

function run(command: Command, options: { silent?: boolean } = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command.command, command.args, {
      stdio: options.silent ? 'ignore' : 'inherit',
      shell: process.platform === 'win32',
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command.command} exited with code ${code ?? 'unknown'}`));
    });
  });
}

function formatCommand(command: Command): string {
  return [command.command, ...command.args.map(quoteArg)].join(' ');
}

function quoteArg(value: string): string {
  return /\s/.test(value) ? `"${value.replaceAll('"', '\\"')}"` : value;
}
