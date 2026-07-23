import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { PATHS } from '@omi/marine-data-contract';
import { Observable, catchError, distinctUntilChanged, map, of, shareReplay, startWith, switchMap, timer } from 'rxjs';
import { APP_ENVIRONMENT } from '../../core/config/app-environment.token';
import { DatapointStoreService } from '../../state/datapoints/datapoint-store.service';
import { isPositionValue } from '../../state/datapoints/datapoint.selectors';

const VIGO = { latitude: 42.2406, longitude: -8.7207, name: 'Vigo' } as const;
const REFRESH_MS = 15 * 60 * 1000;

export type WeatherCondition = 'clear' | 'partly-cloudy' | 'cloudy' | 'fog' | 'rain' | 'storm' | 'snow';

export interface WeatherHour {
  time: string;
  temperature: number;
  pressure: number;
  precipitationProbability: number;
  weatherCode: number;
  condition: WeatherCondition;
  isDay: boolean;
}

export interface WeatherDay {
  date: string;
  weatherCode: number;
  condition: WeatherCondition;
  temperatureMax: number;
  temperatureMin: number;
  precipitationProbability: number;
  windSpeedMax: number;
}

export interface LiveWeather {
  location: string;
  usingGps: boolean;
  latitude: number;
  longitude: number;
  updatedAt: number;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  pressure: number;
  cloudCover: number;
  weatherCode: number;
  condition: WeatherCondition;
  conditionLabel: string;
  isDay: boolean;
  windSpeed: number;
  windDirection: number;
  windGust: number;
  hourly: WeatherHour[];
  daily: WeatherDay[];
}

interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    pressure_msl: number;
    cloud_cover: number;
    weather_code: number;
    is_day: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    pressure_msl: number[];
    precipitation_probability: number[];
    weather_code: number[];
    is_day: number[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    wind_speed_10m_max: number[];
  };
}

@Injectable({ providedIn: 'root' })
export class WeatherApiService {
  private readonly http = inject(HttpClient);
  private readonly env = inject(APP_ENVIRONMENT);
  private readonly store = inject(DatapointStoreService);

  private readonly location$ = this.store.observe<unknown>(PATHS.navigation.position).pipe(
    map((point) => {
      if (point && isPositionValue(point.value)) {
        return {
          latitude: point.value.latitude,
          longitude: point.value.longitude,
          name: 'GPS position',
          usingGps: true,
        };
      }
      return { ...VIGO, usingGps: false };
    }),
    startWith({ ...VIGO, usingGps: false }),
    distinctUntilChanged((a, b) =>
      a.usingGps === b.usingGps &&
      Math.abs(a.latitude - b.latitude) < 0.02 &&
      Math.abs(a.longitude - b.longitude) < 0.02,
    ),
  );

  readonly weather$: Observable<LiveWeather | null> = this.location$.pipe(
    switchMap((location) => timer(0, REFRESH_MS).pipe(
      switchMap(() => this.fetchWeather(location).pipe(catchError(() => of(null)))),
    )),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  private fetchWeather(location: { latitude: number; longitude: number; name: string; usingGps: boolean }): Observable<LiveWeather> {
    const params = new HttpParams()
      .set('latitude', location.latitude)
      .set('longitude', location.longitude)
      .set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,is_day,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m')
      .set('hourly', 'temperature_2m,pressure_msl,precipitation_probability,weather_code,is_day')
      .set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max')
      .set('forecast_days', 7)
      .set('forecast_hours', 7 * 24)
      .set('past_hours', 12)
      .set('wind_speed_unit', 'kn')
      .set('timezone', 'auto');

    return this.http.get<OpenMeteoResponse>(this.env.weatherApiUrl, { params }).pipe(
      map((response) => {
        const hourly = response.hourly.time.map((time, index) => ({
          time,
          temperature: response.hourly.temperature_2m[index] ?? 0,
          pressure: response.hourly.pressure_msl[index] ?? 0,
          precipitationProbability: response.hourly.precipitation_probability[index] ?? 0,
          weatherCode: response.hourly.weather_code[index] ?? 0,
          condition: weatherCondition(response.hourly.weather_code[index] ?? 0),
          isDay: (response.hourly.is_day[index] ?? 1) === 1,
        }));
        const condition = weatherCondition(response.current.weather_code);
        const daily = response.daily.time.map((date, index) => ({
          date,
          weatherCode: response.daily.weather_code[index] ?? 0,
          condition: weatherCondition(response.daily.weather_code[index] ?? 0),
          temperatureMax: response.daily.temperature_2m_max[index] ?? 0,
          temperatureMin: response.daily.temperature_2m_min[index] ?? 0,
          precipitationProbability: response.daily.precipitation_probability_max[index] ?? 0,
          windSpeedMax: response.daily.wind_speed_10m_max[index] ?? 0,
        }));
        return {
          location: location.name,
          usingGps: location.usingGps,
          latitude: response.latitude,
          longitude: response.longitude,
          updatedAt: Date.parse(response.current.time),
          temperature: response.current.temperature_2m,
          apparentTemperature: response.current.apparent_temperature,
          humidity: response.current.relative_humidity_2m,
          pressure: response.current.pressure_msl,
          cloudCover: response.current.cloud_cover,
          weatherCode: response.current.weather_code,
          condition,
          conditionLabel: weatherLabel(response.current.weather_code),
          isDay: response.current.is_day === 1,
          windSpeed: response.current.wind_speed_10m,
          windDirection: response.current.wind_direction_10m,
          windGust: response.current.wind_gusts_10m,
          hourly,
          daily,
        };
      }),
    );
  }
}

export function weatherCondition(code: number): WeatherCondition {
  if (code === 0) return 'clear';
  if (code <= 2) return 'partly-cloudy';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 71 && code <= 77) return 'snow';
  if (code >= 95) return 'storm';
  return 'rain';
}

export function weatherLabel(code: number): string {
  if (code === 0) return 'Clear sky';
  if (code === 1) return 'Mainly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 51 && code <= 57) return 'Drizzle';
  if (code >= 61 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Rain showers';
  if (code >= 85 && code <= 86) return 'Snow showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Mixed weather';
}
