import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../../environments/environment';
import {catchError, map, Observable, of, shareReplay} from 'rxjs';

export interface GSLTip {
  word: string;
  tip: string;
}

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

    const prompt = `
      You are an expert instructor in Ghana Sign Language (GSL). 
      For the following English text, provide a highly descriptive signing tip for each word as it is performed by a 3D avatar.
      Focus on synchronized guidance:
      1. Handshape & Orientation: Specify exactly how the hands should look.
      2. Precise Movement: Describe the path the hands take.
      3. Timing: Mention if the sign is quick, slow, or repetitive.
      
      Format the response as a JSON array of objects with "word" and "tip" fields.
      Keep each tip concise but informative, suitable for a "live" UI overlay.
      
      Text: "${text}"
    `;

    return this.http
      .post<any>(this.apiUrl, {
        contents: [{parts: [{text: prompt}]}],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      })
      .pipe(
        map(response => {
          try {
            const jsonText = response.candidates[0].content.parts[0].text;
            const tips = JSON.parse(jsonText) as GSLTip[];
            this.cache.set(text, tips);
            return tips;
          } catch (e) {
            console.error('Failed to parse tips', e);
            return [];
          }
        }),
        catchError(() => of([])),
        shareReplay(1)
      );
  }
}
