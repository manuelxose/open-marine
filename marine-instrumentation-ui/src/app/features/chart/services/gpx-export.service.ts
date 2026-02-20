import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { WaypointService, type Waypoint } from './waypoint.service';
import { RouteService } from './route.service';

/**
 * Generates GPX 1.1 XML from waypoints and routes, and triggers browser download.
 */
@Injectable({ providedIn: 'root' })
export class GpxExportService {
  private readonly waypointService = inject(WaypointService);
  private readonly routeService = inject(RouteService);

  /** Export all waypoints as a GPX file */
  async exportWaypoints(): Promise<void> {
    const waypoints = await firstValueFrom(this.waypointService.waypoints$);
    const gpx = this.buildGpx(waypoints, []);
    this.download(gpx, 'open-marine-waypoints.gpx');
  }

  /** Export a route (ordered waypoints) as a GPX file */
  async exportRoute(): Promise<void> {
    const [waypoints, order] = await Promise.all([
      firstValueFrom(this.waypointService.waypoints$),
      firstValueFrom(this.routeService.order$),
    ]);

    // Build route waypoints in order
    const waypointMap = new Map(waypoints.map(w => [w.id, w]));
    const routeWaypoints = order
      .map(id => waypointMap.get(id))
      .filter((w): w is Waypoint => w !== undefined);

    const gpx = this.buildGpx(waypoints, routeWaypoints);
    this.download(gpx, 'open-marine-route.gpx');
  }

  private buildGpx(waypoints: Waypoint[], routePoints: Waypoint[]): string {
    const now = new Date().toISOString();
    const lines: string[] = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<gpx version="1.1" creator="Open Marine" xmlns="http://www.topografix.com/GPX/1/1"',
      '  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
      '  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">',
      `  <metadata>`,
      `    <name>Open Marine Export</name>`,
      `    <time>${now}</time>`,
      `  </metadata>`,
    ];

    // Waypoints
    for (const wp of waypoints) {
      lines.push(`  <wpt lat="${wp.lat}" lon="${wp.lon}">`);
      lines.push(`    <name>${this.escapeXml(wp.name)}</name>`);
      if (wp.createdAt) {
        lines.push(`    <time>${new Date(wp.createdAt).toISOString()}</time>`);
      }
      lines.push(`  </wpt>`);
    }

    // Route
    if (routePoints.length > 0) {
      lines.push(`  <rte>`);
      lines.push(`    <name>Route</name>`);
      for (const rp of routePoints) {
        lines.push(`    <rtept lat="${rp.lat}" lon="${rp.lon}">`);
        lines.push(`      <name>${this.escapeXml(rp.name)}</name>`);
        lines.push(`    </rtept>`);
      }
      lines.push(`  </rte>`);
    }

    lines.push('</gpx>');
    return lines.join('\n');
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private download(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
