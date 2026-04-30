import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../../environments/environment';
import {catchError, map, Observable, of, shareReplay, switchMap} from 'rxjs';

export interface GSLTip {
  word: string;
  tip: string;
}

interface GSLDictionaryEntry {
  word: string;
  description: string;
  category: string;
  source: string;
  image?: string;
}

const LOCAL_GSL_DICT: Record<string, string> = {
  hello: 'Open palm facing out, move it slightly side to side near your forehead.',
  hi: 'Wave one hand back and forth at shoulder height for a casual greeting.',
  greetings: 'Open palm moves outward from the chin or chest in a friendly greeting motion.',
  good: 'Hold an open palm near the chest and move it outward with a slight nodding motion.',
  morning: 'Place the fingertips of one hand near the cheek and move your hand upward and forward.',
  day: 'Open hand starts at the forehead and moves down slightly to indicate daytime.',
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

@Injectable({
  providedIn: 'root',
})
export class SmartTipsService {
  private http = inject(HttpClient);
  private apiKey = environment.geminiApiKey;
  private apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`;

  private cache = new Map<string, GSLTip[]>();

  private dictionary$ = this.http.get<GSLDictionaryEntry[]>('assets/docs/gsl-dictionary.json').pipe(
    map(entries =>
      entries.reduce((map, entry) => {
        map.set(entry.word.toLowerCase(), entry.description);
        return map;
      }, new Map<string, string>())
    ),
    catchError(error => {
      console.error('Could not load dictionary for smart tips', error);
      return of(new Map<string, string>());
    }),
    shareReplay(1)
  );

  getTipsForText(text: string): Observable<GSLTip[]> {
    if (!text) return of([]);
    if (this.cache.has(text)) return of(this.cache.get(text)!);

    return this.dictionary$.pipe(
      switchMap(dictionary => {
        const prompt = `Text: "${text}"`;
        const systemInstruction = `
      You are an expert instructor in Ghana Sign Language (GSL). 
      For the following English text, provide a highly descriptive signing tip for each word as it is performed by a 3D avatar.
      Focus on synchronized guidance:
      1. Handshape & Orientation: Specify exactly how the hands should look.
      2. Precise Movement: Describe the path the hands take.
      3. Timing: Mention if the sign is quick, slow, or repetitive.

      Format the response as a JSON array of objects with "word" and "tip" fields.
      Keep each tip concise but informative, suitable for a "live" UI overlay.
    `;

        return this.http
          .post<any>(this.apiUrl, {
            systemInstruction: {
              parts: [{text: systemInstruction}],
            },
            contents: [{role: 'user', parts: [{text: prompt}]}],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2,
              maxOutputTokens: 400,
            },
          })
          .pipe(
            map(response => {
              const jsonText = response?.candidates?.[0]?.content?.parts?.[0]?.text;
              const tips = this.parseTips(jsonText, text, dictionary);
              this.cache.set(text, tips);
              return tips;
            }),
            catchError(error => {
              console.error('Smart Tips API failed', error);
              const fallback = this.fallbackTips(text, dictionary);
              this.cache.set(text, fallback);
              return of(fallback);
            })
          );
      })
    );
  }

  private parseTips(rawText: unknown, text: string, dictionary: Map<string, string>): GSLTip[] {
    if (typeof rawText !== 'string' || !rawText.trim()) {
      return this.fallbackTips(text, dictionary);
    }

    const trimmed = rawText.trim();

    try {
      return JSON.parse(trimmed) as GSLTip[];
    } catch (err) {
      const jsonBlock = this.extractJsonBlock(trimmed);
      if (jsonBlock) {
        try {
          return JSON.parse(jsonBlock) as GSLTip[];
        } catch (jsonError) {
          console.error('Failed to parse JSON block for smart tips', jsonError, jsonBlock);
        }
      }
      console.error('Failed to parse tips', err, trimmed);
      return this.fallbackTips(text, dictionary);
    }
  }

  private extractJsonBlock(text: string): string | null {
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start === -1 || end === -1 || end <= start) {
      return null;
    }
    return text.slice(start, end + 1);
  }

  private fallbackTips(text: string, dictionary: Map<string, string>): GSLTip[] {
    return text
      .trim()
      .split(/\s+/)
      .map(word => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
      .filter(Boolean)
      .map(word => word.toLowerCase())
      .map(normalized => ({
        word: normalized,
        tip: LOCAL_GSL_DICT[normalized] ?? dictionary.get(normalized),
      }))
      .filter(entry => !!entry.tip) as GSLTip[];
  }
}
