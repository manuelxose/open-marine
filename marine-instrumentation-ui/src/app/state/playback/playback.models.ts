export type PlaybackStatus = 'idle' | 'loading' | 'ready' | 'playing' | 'paused';

export interface PlaybackEvent {
  time: number;
  type: 'alarm' | 'waypoint' | 'note';
  label: string;
}

export interface PlaybackState {
  status: PlaybackStatus;
  currentTime: number;
  startTime: number;
  endTime: number;
  speed: number;
  events: PlaybackEvent[];
}

export interface PlaybackLoadRequest {
  paths: string[];
  startTime: number;
  endTime: number;
}

export const PLAYBACK_POSITION_LAT_PATH = 'navigation.position.latitude';
export const PLAYBACK_POSITION_LON_PATH = 'navigation.position.longitude';
