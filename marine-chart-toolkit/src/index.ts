import { Command } from 'commander';
import * as path from 'path';
import { MBTilesGenerator } from './mbtiles.js';

const program = new Command();

program
  .name('marine-chart-toolkit')
  .description('CLI to process nautical charts into tiles')
  .version('1.0.0');

program
  .command('import')
  .description('Import a georeferenced raster chart (GeoTIFF) and generate MBTiles')
  .argument('<input>', 'Path to input GeoTIFF file')
  .option('-o, --output <path>', 'Output MBTiles file path', 'chart.mbtiles')
  .option('--min-zoom <zoom>', 'Minimum zoom level', '0')
  .option('--max-zoom <zoom>', 'Maximum zoom level', '18')
  .action((input, options) => {
    console.log(`Importing: ${input}`);
    console.log(`Options:`, options);
    
    const generator = new MBTilesGenerator(options.output);
    generator.init();
    
    // In a real implementation, we would use gdal-next or similar to read GeoTIFF.
    // Here we provide the structure and metadata generation.
    generator.setMetadata({
      name: path.basename(input, path.extname(input)),
      type: 'baselayer',
      version: '1',
      description: 'Nautical chart imported via marine-chart-toolkit',
      format: 'png',
      minzoom: options.minZoom,
      maxzoom: options.maxZoom,
      bounds: '-180,-85,180,85', // Placeholder bounds
    });

    console.log(`Successfully generated ${options.output}`);
    generator.close();
  });

program.parse();
