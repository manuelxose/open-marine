export interface ParsedWaypoint {
  name?: string;
  desc?: string;
  lat: number;
  lon: number;
  ele?: number;
  time?: string;
}

export interface ParsedRoute {
  name?: string;
  desc?: string;
  points: ParsedWaypoint[];
}

export interface ParsedTrack {
  name?: string;
  points: ParsedWaypoint[];
}

export interface GpxParseResult {
  waypoints: ParsedWaypoint[];
  routes: ParsedRoute[];
  tracks: ParsedTrack[];
}

export class GpxParser {
  static parse(xml: string): GpxParseResult {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    
    const errorNode = doc.querySelector('parsererror');
    if (errorNode) {
        throw new Error('Invalid GPX XML format');
    }

    const waypoints: ParsedWaypoint[] = [];
    const routes: ParsedRoute[] = [];
    const tracks: ParsedTrack[] = [];

    // Parse Waypoints
    const wpts = doc.getElementsByTagName('wpt');
    for (let i = 0; i < wpts.length; i++) {
        const point = this.parsePoint(wpts[i]);
        if (point) {
            waypoints.push(point);
        }
    }

    // Parse Routes
    const rtes = doc.getElementsByTagName('rte');
    for (let i = 0; i < rtes.length; i++) {
        const rte = rtes[i];
        const name = this.getChildText(rte, 'name');
        const desc = this.getChildText(rte, 'desc');
        const points: ParsedWaypoint[] = [];
        const rtepts = rte.getElementsByTagName('rtept');
        for (let j = 0; j < rtepts.length; j++) {
            const point = this.parsePoint(rtepts[j]);
            if (point) {
                points.push(point);
            }
        }
        routes.push({ name, desc, points });
    }

    // Parse Tracks (Simplified flat track)
    const trks = doc.getElementsByTagName('trk');
    for (let i = 0; i < trks.length; i++) {
        const trk = trks[i];
        const name = this.getChildText(trk, 'name');
        const points: ParsedWaypoint[] = [];
        const trksegs = trk.getElementsByTagName('trkseg');
        for (let j = 0; j < trksegs.length; j++) {
            const trkpts = trksegs[j].getElementsByTagName('trkpt');
            for (let k = 0; k < trkpts.length; k++) {
                 const point = this.parsePoint(trkpts[k]);
                 if (point) {
                     points.push(point);
                 }
            }
        }
        tracks.push({ name, points });
    }

    return { waypoints, routes, tracks };
  }

  private static parsePoint(el: Element): ParsedWaypoint | null {
      const rawLat = el.getAttribute('lat');
      const rawLon = el.getAttribute('lon');
      const lat = rawLat !== null ? parseFloat(rawLat) : NaN;
      const lon = rawLon !== null ? parseFloat(rawLon) : NaN;
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
          return null;
      }
      const eleStr = this.getChildText(el, 'ele');
      const time = this.getChildText(el, 'time');
      const name = this.getChildText(el, 'name');
      const desc = this.getChildText(el, 'desc');

      return {
          lat,
          lon,
          ele: eleStr ? parseFloat(eleStr) : undefined,
          time,
          name,
          desc
      };
  }

  private static getChildText(parent: Element, tagName: string): string | undefined {
      const child = parent.getElementsByTagName(tagName)[0];
      return child?.textContent || undefined;
  }
}
