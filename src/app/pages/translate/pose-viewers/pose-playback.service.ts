import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';

/**
 * Shares pose-viewer playback timing (currentTime/duration) across components.
 *
 * This is used by UI overlays (e.g. Smart Tips) to react to playback progression.
 */
@Injectable({
  providedIn: 'root',
})
export class PosePlaybackService {
  private readonly currentTimeSubject = new BehaviorSubject<number>(0);
  readonly currentTime$ = this.currentTimeSubject.asObservable();

  private readonly durationSubject = new BehaviorSubject<number>(Number.NaN);
  readonly duration$ = this.durationSubject.asObservable();

  updateTiming(currentTimeSeconds: number, durationSeconds: number): void {
    if (Number.isFinite(durationSeconds) && durationSeconds > 0) {
      this.durationSubject.next(durationSeconds);
    }

    if (Number.isFinite(currentTimeSeconds) && currentTimeSeconds >= 0) {
      this.currentTimeSubject.next(currentTimeSeconds);
    }
  }

  reset(): void {
    this.currentTimeSubject.next(0);
    this.durationSubject.next(Number.NaN);
  }
}
