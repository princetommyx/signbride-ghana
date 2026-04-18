import {Component, inject} from '@angular/core';
import {AsyncPipe} from '@angular/common';
import {Store} from '@ngxs/store';
import {combineLatest, Observable} from 'rxjs';
import {distinctUntilChanged, map} from 'rxjs/operators';
import {IonCard, IonCardContent, IonCardHeader, IonCardTitle} from '@ionic/angular/standalone';
import {PosePlaybackService} from '../../pages/translate/pose-viewers/pose-playback.service';

const TIP_DICTIONARY: Record<string, string> = {
  hello: 'Wave your hand side to side.',
  thanks: 'Bring your fingertips from your chin outward.',
  please: 'Rub your palm in a circular motion on your chest.',
};

function tokenizeWords(text: string): string[] {
  return (text || '')
    .trim()
    .split(/\s+/)
    .map(t => t.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter(Boolean)
    .map(t => t.toLowerCase());
}

function indexFromTiming(currentTime: number, duration: number, length: number): number {
  if (length <= 0) {
    return -1;
  }

  // If timing isn't available yet, still show *something* (first token)
  // so users can see the overlay working.
  if (!Number.isFinite(currentTime) || !Number.isFinite(duration) || duration <= 0) {
    return 0;
  }

  const clamped = Math.min(Math.max(currentTime, 0), duration);
  const ratio = clamped / duration;
  const idx = Math.floor(ratio * length);
  return Math.min(Math.max(idx, 0), length - 1);
}

@Component({
  selector: 'app-smart-tips',
  templateUrl: './smart-tips.component.html',
  styleUrls: ['./smart-tips.component.scss'],
  imports: [IonCard, IonCardHeader, IonCardTitle, IonCardContent, AsyncPipe],
})
export class SmartTipsComponent {
  private store = inject(Store);
  private playback = inject(PosePlaybackService);

  private text$: Observable<string> = this.store.select(state => {
    const normalized = state.translate?.normalizedSpokenLanguageText;
    const raw = state.translate?.spokenLanguageText;
    return (normalized ?? raw ?? '') as string;
  });

  readonly currentWord$: Observable<string | null> = combineLatest([
    this.text$.pipe(map(tokenizeWords)),
    this.playback.currentTime$,
    this.playback.duration$,
  ]).pipe(
    map(([words, currentTime, duration]) => {
      const idx = indexFromTiming(currentTime, duration, words.length);
      return idx >= 0 ? words[idx] : null;
    }),
    distinctUntilChanged()
  );

  readonly tip$: Observable<string | null> = this.currentWord$.pipe(
    map(word => (word ? (TIP_DICTIONARY[word] ?? null) : null)),
    distinctUntilChanged()
  );

  readonly message$ = combineLatest([this.currentWord$, this.tip$]).pipe(
    map(([word, tip]) => {
      if (!word) {
        return null;
      }

      return {
        word,
        tip: tip ?? 'No tip available for this sign yet.',
      };
    }),
    distinctUntilChanged((a, b) => a?.word === b?.word && a?.tip === b?.tip)
  );
}
