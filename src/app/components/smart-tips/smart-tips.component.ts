import {Component, inject, Input} from '@angular/core';
import {AsyncPipe, CommonModule} from '@angular/common';
import {Store} from '@ngxs/store';
import {combineLatest, Observable, of} from 'rxjs';
import {distinctUntilChanged, map, switchMap} from 'rxjs/operators';
import {IonCard, IonCardContent, IonCardHeader, IonCardTitle} from '@ionic/angular/standalone';
import {PosePlaybackService} from '../../pages/translate/pose-viewers/pose-playback.service';
import {SmartTipsService} from './smart-tips.service';

const LOCAL_GSL_DICT: Record<string, string> = {
  hello: 'Open palm facing out, move it slightly side to side near your forehead.',
  hi: 'Wave one hand back and forth at shoulder height for a casual greeting.',
  greetings: 'Open palm moves outward from the chin or chest in a friendly greeting motion.',
  good: 'Hold an open palm near the chest and move it outward with a slight nodding motion.',
  morning: 'Place the fingertips of one hand near the cheek and move your hand upward and forward.',
  day: 'Open hand starts at the forehead and moves down slightly to indicate daytime.',
  'good morning': 'Start with “good” near the chest, then move the hand from the cheek outward for “morning.”',
  how: 'Hold both hands in loose fists with knuckles together and twist them slightly outward.',
  where: 'Hold one hand open and shake it side to side as if asking for location.',
  will: 'Point forward with one hand while moving slightly in the direction of future action.',
  go: 'Move an open hand outward in the direction you are indicating.',
  come: 'Pull an open hand toward your body in a gentle motion.',
  now: 'Place both flat hands together and move them down slightly to indicate the present moment.',
  mine: 'Point to your chest with an open hand to show possession.',
  my: 'Touch your chest with an open hand to indicate that something belongs to you.',
  are: 'Use a flat hand moving slightly forward while looking at the person you are asking.',
  you: 'Point your index finger directly at the person you are addressing.',
  doing: 'Move both hands forward with palms up as if showing ongoing action.',
  'how are you': 'Sign “how” with both hands, then point to the person to ask “you.”',
  'are you': 'Sign “are” while looking at the person, then point for “you.”',
  thanks: 'Touch your chin with your fingertips and move your hand forward and down.',
  ghana: 'Index finger moves in a small circle near the forehead.',
  please: 'Place your open palm on your chest and move it in a circular motion.',
  yes: 'Make a fist and nod it up and down like a head nodding.',
  no: 'Bring index and middle fingers together with the thumb, like a mouth closing.',
  mother: 'Tap your chin repeatedly with an open thumb (5-handshape).',
  father: 'Tap your forehead repeatedly with an open thumb (5-handshape).',
  water: 'Index finger of a "W" handshape tapping the chin.',
  food: 'Bring fingers together and touch your mouth repetitively.',
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
  if (length <= 0) return -1;
  if (!Number.isFinite(currentTime) || !Number.isFinite(duration) || duration <= 0) return 0;
  const clamped = Math.min(Math.max(currentTime, 0), duration);
  const ratio = clamped / duration;
  const idx = Math.floor(ratio * length);
  return Math.min(Math.max(idx, 0), length - 1);
}

@Component({
  selector: 'app-smart-tips',
  templateUrl: './smart-tips.component.html',
  styleUrls: ['./smart-tips.component.scss'],
  standalone: true,
  imports: [IonCard, IonCardHeader, IonCardTitle, IonCardContent, AsyncPipe, CommonModule],
})
export class SmartTipsComponent {
  private store = inject(Store);
  private playback = inject(PosePlaybackService);
  private tipsService = inject(SmartTipsService);

  /** When true, renders as a compact one-line pill bar (for mobile footer) */
  @Input() compact = false;

  private text$: Observable<string> = this.store.select(state => {
    const normalized = state.translate?.normalizedSpokenLanguageText;
    const raw = state.translate?.spokenLanguageText;
    return (normalized ?? raw ?? '') as string;
  });

  // Fetch tips from Gemini for the entire text
  private aiTips$ = this.text$.pipe(
    distinctUntilChanged(),
    switchMap(text => this.tipsService.getTipsForText(text)),
    map(tips => {
      const dict: Record<string, string> = {};
      tips.forEach(t => (dict[t.word.toLowerCase()] = t.tip));
      return dict;
    })
  );

  readonly message$ = combineLatest([
    this.text$.pipe(map(tokenizeWords)),
    this.playback.currentTime$,
    this.playback.duration$,
    this.aiTips$,
  ]).pipe(
    map(([words, currentTime, duration, aiTips]) => {
      const idx = indexFromTiming(currentTime, duration, words.length);
      if (idx < 0 || !words[idx]) return null;

      const word = words[idx];
      const phraseCandidates: string[] = [];
      if (idx > 0) phraseCandidates.push(`${words[idx - 1]} ${word}`);
      if (idx > 1) phraseCandidates.push(`${words[idx - 2]} ${words[idx - 1]} ${word}`);

      const exactTip = aiTips[word] ?? LOCAL_GSL_DICT[word];
      const phraseTip = phraseCandidates
        .map(candidate => ({candidate, tip: aiTips[candidate] ?? LOCAL_GSL_DICT[candidate]}))
        .find(entry => !!entry.tip);

      const tip = exactTip || phraseTip?.tip || `Follow the avatar's hand shape and motion carefully for "${word}".`;
      const displayWord = phraseTip?.candidate ?? word;

      return {word: displayWord, tip};
    }),
    distinctUntilChanged((a, b) => a?.word === b?.word && a?.tip === b?.tip)
  );
}
