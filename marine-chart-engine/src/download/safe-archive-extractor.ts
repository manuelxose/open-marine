import path from 'node:path';
import { ProcessRunnerService } from '../services/process-runner.service.js';

export interface SafeExtractOptions {
  /** Maximum number of entries allowed in the archive. */
  maxEntries?: number;
  /** Maximum total uncompressed size allowed, in bytes. */
  maxTotalBytes?: number;
}

const DEFAULT_MAX_ENTRIES = 10_000;
const DEFAULT_MAX_TOTAL_BYTES = 4 * 1024 * 1024 * 1024; // 4 GB

/**
 * Extracts a ZIP archive after validating it against zip-slip path traversal and
 * resource-exhaustion (entry count / total uncompressed size). Listing is done
 * with `unzip` in zipinfo mode before any file is written to disk.
 */
export class SafeArchiveExtractor {
  private readonly runner = new ProcessRunnerService();

  async extractZip(zipPath: string, extractDir: string, options: SafeExtractOptions = {}): Promise<void> {
    const maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
    const maxTotalBytes = options.maxTotalBytes ?? DEFAULT_MAX_TOTAL_BYTES;

    const names = await this.listEntries(zipPath);
    if (names.length > maxEntries) {
      throw new Error(`Archive rejected: ${names.length} entries exceeds limit of ${maxEntries}`);
    }

    const resolvedRoot = path.resolve(extractDir);
    for (const name of names) {
      assertSafeEntry(name, resolvedRoot);
    }

    const totalBytes = await this.totalUncompressedBytes(zipPath);
    if (totalBytes !== null && totalBytes > maxTotalBytes) {
      throw new Error(
        `Archive rejected: uncompressed size ${totalBytes} bytes exceeds limit of ${maxTotalBytes} bytes`,
      );
    }

    await this.runner.run({
      command: 'unzip',
      args: ['-o', zipPath, '-d', extractDir],
    });
  }

  /** List archive entry names (one per line) using `unzip -Z1`. */
  private async listEntries(zipPath: string): Promise<string[]> {
    const output = await this.runner.capture({ command: 'unzip', args: ['-Z1', zipPath] });
    return output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  /** Parse total uncompressed bytes from `unzip -Zt` summary, or null if unknown. */
  private async totalUncompressedBytes(zipPath: string): Promise<number | null> {
    const output = await this.runner.capture({ command: 'unzip', args: ['-Zt', zipPath] });
    const match = output.match(/(\d+)\s+bytes uncompressed/i);
    if (!match || match[1] === undefined) {
      return null;
    }
    const value = Number.parseInt(match[1], 10);
    return Number.isFinite(value) ? value : null;
  }
}

/**
 * Reject absolute paths, parent-directory traversal, and any entry that resolves
 * outside the extraction root.
 */
export function assertSafeEntry(entryName: string, resolvedRoot: string): void {
  const normalized = entryName.replace(/\\/g, '/');

  if (path.isAbsolute(normalized) || /^[a-zA-Z]:[\\/]/.test(normalized)) {
    throw new Error(`Unsafe archive entry (absolute path): ${entryName}`);
  }

  const segments = normalized.split('/');
  if (segments.includes('..')) {
    throw new Error(`Unsafe archive entry (path traversal): ${entryName}`);
  }

  const target = path.resolve(resolvedRoot, normalized);
  const rootWithSep = resolvedRoot.endsWith(path.sep) ? resolvedRoot : resolvedRoot + path.sep;
  if (target !== resolvedRoot && !target.startsWith(rootWithSep)) {
    throw new Error(`Unsafe archive entry (escapes extraction directory): ${entryName}`);
  }
}
