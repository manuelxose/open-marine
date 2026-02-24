import { Injectable } from '@angular/core';
import { AlarmSeverity } from '../../state/alarms/alarm.models';

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private audioContext: AudioContext | null = null;
  private activeSource: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private soundBuffers = new Map<string, AudioBuffer>();
  private isEnabled = false;

  // Map severity to sound file
  private readonly SOUND_FILES: Record<AlarmSeverity, string> = {
    [AlarmSeverity.Info]: '',
    [AlarmSeverity.Warning]: 'assets/sounds/alarm-warning.wav',
    [AlarmSeverity.Critical]: 'assets/sounds/alarm-critical.wav',
    [AlarmSeverity.Emergency]: 'assets/sounds/alarm-mob.wav'
  };

  constructor() {
    this.initAudioContext();
  }

  /**
   * Initialize AudioContext. Calling this on user interaction unlocks audio.
   */
  public async initAudioContext(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
      this.gainNode.gain.value = 0.8; // Default volume
    }

    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        this.isEnabled = true;
        console.log('AudioContext resumed successfully');
      } catch (err) {
        console.warn('AudioContext resume failed (user interaction needed)', err);
      }
    } else {
      this.isEnabled = true;
    }

    // Preload sounds
    this.preloadSounds();
  }

  public playAlarm(severity: AlarmSeverity): void {
    if (!this.isEnabled) {
      // Try to resume if not enabled
      this.initAudioContext().catch(() => {});
    }

    if (this.activeSource) {
      this.stop(); // Stop current before playing new
    }

    const soundUrl = this.SOUND_FILES[severity];
    if (!soundUrl) return;

    this.playSound(soundUrl, true); // Loop alarms by default
  }

  public stop(): void {
    if (this.activeSource) {
      try {
        this.activeSource.stop();
        this.activeSource.disconnect();
      } catch (e) {
        // Ignore if already stopped
      }
      this.activeSource = null;
    }
  }

  public setVolume(volume: number): void {
    if (this.gainNode) {
      // Clamp between 0 and 1
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  private async preloadSounds(): Promise<void> {
    const urls = Object.values(this.SOUND_FILES);
    for (const url of urls) {
      if (!this.soundBuffers.has(url)) {
        try {
          const buffer = await this.fetchAudioBuffer(url);
          if (buffer) {
            this.soundBuffers.set(url, buffer);
          }
        } catch (err) {
          console.error(`Failed to load sound: ${url}`, err);
        }
      }
    }
  }

  private async playSound(url: string, loop: boolean = false): Promise<void> {
    if (!this.audioContext || !this.gainNode) return;

    let buffer = this.soundBuffers.get(url);
    if (!buffer) {
      try {
        buffer = await this.fetchAudioBuffer(url);
        if (buffer) this.soundBuffers.set(url, buffer);
      } catch (err) {
        console.error(`Could not play sound ${url}`, err);
        return;
      }
    }

    if (!buffer) return;

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;
    source.connect(this.gainNode);
    source.start(0);
    this.activeSource = source;
  }

  private async fetchAudioBuffer(url: string): Promise<AudioBuffer | undefined> {
    if (!this.audioContext) return undefined;
    
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      return await this.audioContext.decodeAudioData(arrayBuffer);
    } catch (err) {
      throw new Error(`Fetch error for ${url}: ${err}`);
    }
  }
}
