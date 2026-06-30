import { spawn } from 'node:child_process';

export type ExternalCommand = {
  command: string;
  args: string[];
};

export class ProcessRunnerService {
  async assertToolAvailable(command: string): Promise<void> {
    try {
      await this.run({ command, args: ['--version'] }, { silent: true });
    } catch {
      throw new Error(`${command} was not found on PATH`);
    }
  }

  run(command: ExternalCommand, options: { silent?: boolean } = {}): Promise<void> {
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

  /**
   * Run a command and resolve with its captured stdout.
   */
  capture(command: ExternalCommand): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = spawn(command.command, command.args, {
        stdio: ['ignore', 'pipe', 'ignore'],
        shell: process.platform === 'win32',
      });

      let stdout = '';
      child.stdout?.on('data', (chunk) => {
        stdout += chunk.toString();
      });
      child.on('error', reject);
      child.on('exit', (code) => {
        if (code === 0) {
          resolve(stdout);
          return;
        }
        reject(new Error(`${command.command} exited with code ${code ?? 'unknown'}`));
      });
    });
  }
}
