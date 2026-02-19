export function formatSpeed(mps: number | null | undefined, unit: 'kn' | 'm/s' | 'km/h' = 'kn'): { value: string; unit: string } {
  if (mps === null || mps === undefined || !Number.isFinite(mps)) return { value: '--', unit };
  
  let val = mps;
  if (unit === 'kn') val = mps * 1.94384;
  else if (unit === 'km/h') val = mps * 3.6;
  
  return { value: val.toFixed(1), unit };
}

export function formatAngleDegrees(radians: number | null | undefined): { value: string; unit: string } {
  if (radians === null || radians === undefined || !Number.isFinite(radians)) return { value: '--', unit: '°' };
  let degrees = (radians * 180) / Math.PI;
  // Normalize to 0-360
  degrees = degrees % 360;
  if (degrees < 0) degrees += 360;
  return { value: degrees.toFixed(0).padStart(3, '0'), unit: '°' };
}

export function formatDepth(meters: number | null | undefined, unit: 'm' | 'ft' = 'm'): { value: string; unit: string } {
  if (meters === null || meters === undefined || !Number.isFinite(meters)) return { value: '--', unit };
  
  let val = meters;
  if (unit === 'ft') val = meters * 3.28084;

  return { value: val.toFixed(1), unit };
}

export function formatVoltage(volts: number | null | undefined): { value: string; unit: string } {
  if (volts === null || volts === undefined || !Number.isFinite(volts)) return { value: '--', unit: 'V' };
  return { value: volts.toFixed(1), unit: 'V' };
}

export function formatCurrent(amps: number | null | undefined): { value: string; unit: string } {
  if (amps === null || amps === undefined || !Number.isFinite(amps)) return { value: '--', unit: 'A' };
  return { value: amps.toFixed(1), unit: 'A' };
}

export function formatPower(watts: number | null | undefined): { value: string; unit: string } {
  if (watts === null || watts === undefined || !Number.isFinite(watts)) return { value: '--', unit: 'W' };
  const abs = Math.abs(watts);
  if (abs >= 1000) {
    return { value: (watts / 1000).toFixed(1), unit: 'kW' };
  }
  return { value: watts.toFixed(0), unit: 'W' };
}

export function formatCoordinate(value: number | null | undefined, type: 'lat' | 'lon'): string {
  if (value === null || value === undefined) return '--';
  const abs = Math.abs(value);
  const deg = Math.floor(abs);
  const min = (abs - deg) * 60;
  let dir = '';
  if (type === 'lat') dir = value >= 0 ? 'N' : 'S';
  if (type === 'lon') dir = value >= 0 ? 'E' : 'W';
  // ddd°mm.mmm'
  return `${deg.toString().padStart(type === 'lon' ? 3 : 2, '0')}° ${min.toFixed(3)}' ${dir}`;
}

export function formatNumber(value: number | null | undefined, fraction = 0): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '--';
  return value.toFixed(fraction);
}

export function formatDistance(meters: number | null | undefined, unit: 'nm' | 'm' | 'km' = 'nm'): { value: string; unit: string } {
  if (meters === null || meters === undefined || !Number.isFinite(meters)) return { value: '--', unit };

  let val = meters;
  if (unit === 'nm') {
    val = meters / 1852;
    // Show 2 decimals if < 10, else 1
    return { value: val.toFixed(val < 10 ? 2 : 1), unit: 'NM' };
  } else if (unit === 'km') {
    val = meters / 1000;
    return { value: val.toFixed(1), unit: 'km' };
  }
  
  return { value: val.toFixed(0), unit: 'm' };
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return '--:--';
  
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    // or just HH:mm if space is tight, but seconds can be useful
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
