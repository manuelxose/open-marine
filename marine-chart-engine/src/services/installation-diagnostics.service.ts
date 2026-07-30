import crypto from 'node:crypto';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export interface ToolDiagnostic {
  id: 'gdal_translate' | 'gdaladdo' | 'ogr2ogr' | 'tippecanoe' | 'osmium';
  available: boolean;
  purpose: string;
  requiredFor: string[];
}

export interface S63Diagnostic {
  installationId: string;
  hardwareId: string;
  userPermit: string | null;
  mode: 'pending-oem' | 'test' | 'production';
  ready: boolean;
  blockers: string[];
  secureStorage: string;
}

interface InstallationIdentity {
  version: 1;
  installationId: string;
  hardwareId: string;
  createdAt: string;
}

export class InstallationDiagnosticsService {
  constructor(
    private readonly dataDir: string,
    private readonly identityFile: string,
  ) {}

  async inspect(): Promise<{ tools: ToolDiagnostic[]; storage: object; s63: S63Diagnostic }> {
    const identity = await this.identity();
    const tools: ToolDiagnostic[] = [
      this.tool('gdal_translate', 'Raster conversion', ['GeoTIFF', 'KAP', 'MBAR']),
      this.tool('gdaladdo', 'Raster overviews', ['GeoTIFF', 'KAP', 'MBAR']),
      this.tool('ogr2ogr', 'S-57 feature conversion', ['S-57', 'decrypted S-63 cells']),
      this.tool('tippecanoe', 'Vector MBTiles generation', ['S-57', 'coastline', 'seamarks']),
      this.tool('osmium', 'Legal regional OSM extract filtering', ['OpenSeaMap seamarks']),
    ];
    const userPermit = normalizeUserPermit(process.env['CHART_ENGINE_S63_USERPERMIT']);
    const mode = process.env['CHART_ENGINE_S63_MODE'] === 'production'
      ? 'production'
      : process.env['CHART_ENGINE_S63_MODE'] === 'test'
        ? 'test'
        : 'pending-oem';
    const blockers: string[] = [];
    if (!userPermit) blockers.push('No compliant USERPERMIT is configured. Generate it with registered OEM credentials or official IHO test credentials.');
    if (mode === 'pending-oem') blockers.push('S-63 OEM/distributor registration is pending; production exchange sets cannot be processed.');
    if (!tools.find((tool) => tool.id === 'ogr2ogr')?.available) blockers.push('ogr2ogr is required after compliant S-63 decryption.');
    if (!tools.find((tool) => tool.id === 'tippecanoe')?.available) blockers.push('tippecanoe is required to build vector MBTiles.');
    const storageStats = fs.statfsSync(this.dataDir);
    return {
      tools,
      storage: {
        path: this.dataDir,
        totalBytes: Number(storageStats.blocks) * Number(storageStats.bsize),
        availableBytes: Number(storageStats.bavail) * Number(storageStats.bsize),
        writable: canWrite(this.dataDir),
        recommendedMedium: 'SSD or USB storage',
      },
      s63: {
        installationId: identity.installationId,
        hardwareId: identity.hardwareId,
        userPermit,
        mode,
        ready: blockers.length === 0,
        blockers,
        secureStorage: path.dirname(this.identityFile),
      },
    };
  }

  private async identity(): Promise<InstallationIdentity> {
    if (fs.existsSync(this.identityFile)) {
      const parsed = JSON.parse(fs.readFileSync(this.identityFile, 'utf8')) as InstallationIdentity;
      if (parsed.version === 1 && parsed.installationId && /^[A-Z0-9]{5}$/.test(parsed.hardwareId)) return parsed;
      throw new Error('Invalid S-63 installation identity');
    }
    const identity: InstallationIdentity = {
      version: 1,
      installationId: crypto.randomUUID(),
      hardwareId: randomHardwareId(),
      createdAt: new Date().toISOString(),
    };
    await fsPromises.mkdir(path.dirname(this.identityFile), { recursive: true });
    await fsPromises.writeFile(this.identityFile, `${JSON.stringify(identity, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
      flag: 'wx',
    });
    return identity;
  }

  private tool(id: ToolDiagnostic['id'], purpose: string, requiredFor: string[]): ToolDiagnostic {
    const result = spawnSync(id, ['--version'], {
      shell: false,
      windowsHide: true,
      stdio: 'ignore',
      timeout: 5_000,
    });
    return { id, available: result.status === 0, purpose, requiredFor };
  }
}

const randomHardwareId = (): string => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(5);
  return [...bytes].map((byte) => alphabet[byte! % alphabet.length]).join('');
};

const normalizeUserPermit = (value: string | undefined): string | null => {
  const permit = value?.trim().toUpperCase() ?? '';
  return /^[A-F0-9]{28}$/.test(permit) ? permit : null;
};

const canWrite = (directory: string): boolean => {
  try {
    fs.accessSync(directory, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
};
