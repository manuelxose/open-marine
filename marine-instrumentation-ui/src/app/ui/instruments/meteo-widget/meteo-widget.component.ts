import { ChangeDetectionStrategy, Component, ElementRef, HostBinding, Input, ViewChild, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import type { HistoryPoint } from '../../../state/datapoints/datapoint.models';
import { WeatherApiService, type WeatherDay, type WeatherHour } from '../../../data-access/weather/weather-api.service';
import { GbInstrumentBezelComponent } from '../../../shared/components/gb-instrument-bezel/gb-instrument-bezel.component';
import { SparklineComponent } from '../../../shared/components/sparkline/sparkline.component';

@Component({
  selector: 'app-meteo-widget',
  standalone: true,
  imports: [CommonModule, GbInstrumentBezelComponent, SparklineComponent],
  templateUrl: './meteo-widget.component.html',
  styleUrls: ['./meteo-widget.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MeteoWidgetComponent {
  private readonly weatherApi = inject(WeatherApiService);

  @Input() variant: 'widget' | 'map' = 'widget';
  @HostBinding('class.map-variant') get mapVariant(): boolean { return this.variant === 'map'; }
  @ViewChild('hourlyStrip') private hourlyStrip?: ElementRef<HTMLElement>;

  readonly selectedDayIndex = signal(0);

  readonly weather = toSignal(this.weatherApi.weather$, { initialValue: undefined });
  readonly loading = computed(() => this.weather() === undefined);
  readonly unavailable = computed(() => this.weather() === null);

  readonly temperatureHistory = computed<HistoryPoint[]>(() =>
    this.forecast().map((hour) => ({
      timestamp: Date.parse(hour.time),
      value: hour.temperature,
    })),
  );

  readonly pressureHistory = computed<HistoryPoint[]>(() =>
    this.forecast().map((hour) => ({
      timestamp: Date.parse(hour.time),
      value: hour.pressure,
    })),
  );

  readonly dailyForecast = computed<WeatherDay[]>(() => this.weather()?.daily ?? []);
  readonly selectedDay = computed<WeatherDay | undefined>(() => this.dailyForecast()[this.selectedDayIndex()]);

  readonly forecast = computed<WeatherHour[]>(() => {
    const selectedDate = this.selectedDay()?.date;
    if (!selectedDate) return [];
    const now = Date.now();
    const hourly = this.weather()?.hourly ?? [];

    // "Today" is intentionally a rolling 24-hour outlook. At 23:00 it therefore
    // continues with 00:00, 01:00, etc. from tomorrow without changing tabs.
    if (this.selectedDayIndex() === 0) {
      return hourly
        .filter((hour) => Date.parse(hour.time) >= now - 30 * 60 * 1000)
        .slice(0, 24);
    }

    // Remaining tabs represent complete calendar days in the API timezone.
    return hourly.filter((hour) => hour.time.startsWith(selectedDate)).slice(0, 24);
  });

  readonly pressureTrend = computed(() => {
    const hours = this.forecast();
    const first = hours[0]?.pressure;
    const last = hours[Math.min(3, hours.length - 1)]?.pressure;
    return first === undefined || last === undefined ? 0 : last - first;
  });

  cardinal(degrees: number): string {
    const points = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return points[Math.round(degrees / 45) % 8] ?? '---';
  }

  hourLabel(value: string): string {
    return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
  }

  dayLabel(value: string): string {
    return new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric' }).format(
      new Date(`${value}T12:00:00`),
    );
  }

  daySelectorLabel(index: number, value: string): string {
    if (index === 0) return 'Today';
    if (index === 1) return 'Tomorrow';
    return this.dayLabel(value);
  }

  selectDay(index: number): void {
    this.selectedDayIndex.set(index);
    queueMicrotask(() => this.hourlyStrip?.nativeElement.scrollTo({ left: 0, behavior: 'smooth' }));
  }

  scrollStrip(strip: HTMLElement, direction: -1 | 1): void {
    strip.scrollBy({ left: direction * Math.max(240, strip.clientWidth * 0.75), behavior: 'smooth' });
  }

  scrollStripWithWheel(event: WheelEvent, strip: HTMLElement): void {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    event.preventDefault();
    strip.scrollLeft += event.deltaY;
  }
}
