export class EmodnetProxyService {
  constructor(private readonly cacheDir: string) {}

  async getRasterTile(_z: number, _x: number, _y: number): Promise<Buffer | null> {
    void this.cacheDir;
    return null;
  }
}
