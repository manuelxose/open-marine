import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";
import type { SignalKPath } from "@omi/marine-data-contract";
import { TELEMETRY_PATHS, type TelemetryPoint } from "./telemetry";

@Injectable({
  providedIn: "root",
})
export class DataStoreService {
  private readonly subjects = new Map<SignalKPath, BehaviorSubject<TelemetryPoint | null>>();

  constructor() {
    TELEMETRY_PATHS.forEach((path) => {
      this.subjects.set(path, new BehaviorSubject<TelemetryPoint | null>(null));
    });
  }

  point$(path: SignalKPath): Observable<TelemetryPoint | null> {
    const subject = this.subjects.get(path);
    if (!subject) {
      throw new Error(`Unknown path: ${path}`);
    }
    return subject.asObservable();
  }

  setPoint(point: TelemetryPoint): void {
    const subject = this.subjects.get(point.path);
    if (!subject) {
      return;
    }
    subject.next(point);
  }
}
