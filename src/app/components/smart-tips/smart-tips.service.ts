import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../../environments/environment';
import {catchError, map, Observable, of, shareReplay} from 'rxjs';

export interface GSLTip {
  word: string;
  tip: string;
}

const LOCAL_GSL_DICT: Record<string, string> = {
  hello: 'Open palm facing out, move it slightly side to side near your forehead.',
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

  getTipsForText(text: string): Observable<GSLTip[]> {
    if (!text) return of([]);
    if (this.cache.has(text)) return of(this.cache.get(text)!);

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
          const tips = this.parseTips(jsonText, text);
          this.cache.set(text, tips);
          return tips;
        }),
        catchError(error => {
          console.error('Smart Tips API failed', error);
          const fallback = this.fallbackTips(text);
          this.cache.set(text, fallback);
          return of(fallback);
        }),
        shareReplay(1)
      );
  }

  private parseTips(rawText: unknown, text: string): GSLTip[] {
    if (typeof rawText !== 'string' || !rawText.trim()) {
      return this.fallbackTips(text);
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
      return this.fallbackTips(text);
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

  private fallbackTips(text: string): GSLTip[] {
    return text
      .trim()
      .split(/\s+/)
      .map(word => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
      .filter(Boolean)
      .map(word => {
        const normalized = word.toLowerCase();
        return {
          word: normalized,
          tip: LOCAL_GSL_DICT[normalized] ?? `Follow the avatar's hand shape and motion carefully for "${normalized}".`,
        };
      });
  }
}
