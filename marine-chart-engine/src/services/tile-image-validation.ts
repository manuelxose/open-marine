const MIN_TILE_BYTES = 32;

export const isValidTileImage = (contentType: string, data: Buffer): boolean => {
  if (data.length < MIN_TILE_BYTES) return false;
  const type = contentType.toLowerCase();
  if (type.includes('image/png')) {
    return data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (type.includes('image/jpeg')) {
    return data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  }
  if (type.includes('image/webp')) {
    return data.subarray(0, 4).toString('ascii') === 'RIFF' && data.subarray(8, 12).toString('ascii') === 'WEBP';
  }
  return false;
};
