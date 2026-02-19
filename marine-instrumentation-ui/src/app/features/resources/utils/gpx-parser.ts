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
        const wpt = wpts[i];
        if (!wpt) continue;
        const point = this.parsePoint(wpt);
        if (point) {
            waypoints.push(point);
        }
    }

    // Parse Routes
    const rtes = doc.getElementsByTagName('rte');
    for (let i = 0; i < rtes.length; i++) {
        const rte = rtes[i];
        if (!rte) continue;
        const name = this.getChildText(rte, 'name');
        const desc = this.getChildText(rte, 'desc');
        const points: ParsedWaypoint[] = [];
        const rtepts = rte.getElementsByTagName('rtept');
        for (let j = 0; j < rtepts.length; j++) {
            const rtept = rtepts[j];
            if (!rtept) continue;
            const point = this.parsePoint(rtept);
            if (point) {
                points.push(point);
            }
        }
        const route: ParsedRoute = { points };
        if (name !== undefined) route.name = name;
        if (desc !== undefined) route.desc = desc;
        routes.push(route);
    }

    // Parse Tracks (Simplified flat track)
    const trks = doc.getElementsByTagName('trk');
    for (let i = 0; i < trks.length; i++) {
        const trk = trks[i];
        if (!trk) continue;
        const name = this.getChildText(trk, 'name');
        const points: ParsedWaypoint[] = [];
        const trksegs = trk.getElementsByTagName('trkseg');
        for (let j = 0; j < trksegs.length; j++) {
            const trkseg = trksegs[j];
            if (!trkseg) continue;
            const trkpts = trkseg.getElementsByTagName('trkpt');
            for (let k = 0; k < trkpts.length; k++) {
                 const trkpt = trkpts[k];
                 if (!trkpt) continue;
                 const point = this.parsePoint(trkpt);
                 if (point) {
                     points.push(point);
                 }
            }
        }
        const track: ParsedTrack = { points };
        if (name !== undefined) track.name = name;
        tracks.push(track);
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

      const waypoint: ParsedWaypoint = { lat, lon };
      if (eleStr) {
          const ele = parseFloat(eleStr);
          if (Number.isFinite(ele)) {
              waypoint.ele = ele;
          }
      }
      if (time !== undefined) waypoint.time = time;
      if (name !== undefined) waypoint.name = name;
      if (desc !== undefined) waypoint.desc = desc;
      return waypoint;
  }

  private static getChildText(parent: Element, tagName: string): string | undefined {
      const child = parent.getElementsByTagName(tagName)[0];
      if (!child || child.textContent === null) return undefined;
      const text = child.textContent.trim();
      return text.length > 0 ? text : undefined;
  }
}
