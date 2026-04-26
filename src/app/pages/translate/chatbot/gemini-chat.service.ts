import {inject, Injectable, PLATFORM_ID} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';
import {HttpClient, HttpErrorResponse} from '@angular/common/http';
import {catchError, map, Observable, throwError} from 'rxjs';
import {environment} from '../../../../environments/environment';

export interface GeminiChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

export interface GeminiChatContext {
  spokenToSigned: boolean;
  spokenLanguage: string;
  signedLanguage: string;
  detectedLanguage?: string | null;
}

interface GeminiChatRequest {
  messages: GeminiChatMessage[];
  userMessage: string;
  context: GeminiChatContext;
}

const SYSTEM_PROMPT =
  'You are an expert, high-intelligence assistant for the Ghana Sign Language (GSL) translation app. ' +
  'You possess deep knowledge of GSL grammar, culture, and signs. ' +
  'Your goal is to provide instantaneous, clear, and actionable advice to help users bridge the gap between spoken language and GSL. ' +
  'When explaining a sign, focus on the 5 parameters: Handshape, Location, Movement, Orientation, and Non-manual markers (facial expressions). ' +
  'Always include a reference at the end of your response in this exact format: [See "Word" in Dictionary] ' +
  'if the word exists in the GSL context. Keep your tone encouraging and professional.';

@Injectable({providedIn: 'root'})
export class GeminiChatService {
  private http = inject(HttpClient);
  private allSigns: any[] = [];
  private isOffline = false;

  private platformId = inject(PLATFORM_ID);

  constructor() {
    this.loadLocalDictionary();
    if (isPlatformBrowser(this.platformId)) {
      window.addEventListener('online', () => (this.isOffline = false));
      window.addEventListener('offline', () => (this.isOffline = true));
      this.isOffline = !navigator.onLine;
    }
  }

  private loadLocalDictionary() {
    if (isPlatformBrowser(this.platformId)) {
      this.http.get<any[]>('assets/docs/gsl-dictionary.json').subscribe(data => {
        this.allSigns = data;
      });
    }
  }

  sendMessage(request: GeminiChatRequest): Observable<string> {
    if (this.isOffline) {
      return this.handleOfflineRequest(request);
    }
    const model = 'gemini-2.0-flash';
    const apiKey = environment.geminiApiKey;
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

    const systemPrompt = this.buildSystemPrompt(request.context);
    const contents = this.buildContents(request.messages, request.userMessage);

    return new Observable<string>(observer => {
      let fullReply = '';

      fetch(endpoint, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          systemInstruction: {parts: [{text: systemPrompt}]},
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800,
          },
        }),
      })
        .then(async response => {
          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `API Error: ${response.status}`);
          }

          const reader = response.body?.getReader();
          const decoder = new TextDecoder('utf-8');
          if (!reader) throw new Error('Failed to read response stream');

          let buffer = '';
          let done = false;
          while (!done) {
            const {value, done: readerDone} = await reader.read();
            done = readerDone;
            if (value) {
              buffer += decoder.decode(value, {stream: true});
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const dataStr = line.substring(6).trim();
                  if (!dataStr) continue;
                  try {
                    const data = JSON.parse(dataStr);
                    const candidate = data.candidates?.[0];
                    if (candidate?.finishReason === 'SAFETY') {
                      fullReply = 'I apologize, but I cannot answer that question due to safety filters.';
                      observer.next(fullReply);
                      observer.complete();
                      return;
                    }
                    const textChunk = candidate?.content?.parts?.[0]?.text;
                    if (textChunk) {
                      fullReply += textChunk;
                      observer.next(fullReply);
                    }
                  } catch (e) {
                    // Ignore JSON parse errors on partial chunks, though SSE usually sends complete JSON per data: line.
                  }
                }
              }
            }
          }
          observer.complete();
        })
        .catch(err => {
          console.error('Gemini API Error, falling back to local search:', err);
          this.handleOfflineRequest(request).subscribe({
            next: response => observer.next(response),
            error: offlineErr => observer.error(offlineErr),
            complete: () => observer.complete(),
          });
        });
    });
  }

  private handleOfflineRequest(request: GeminiChatRequest): Observable<string> {
    return new Observable<string>(observer => {
      const query = request.userMessage.toLowerCase();

      // 1. Check for FAQ matches
      const faq = this.getOfflineFAQ(query);
      if (faq) {
        observer.next(faq);
        observer.complete();
        return;
      }

      // 2. Search local dictionary
      const matches = this.allSigns
        .filter(s => s.word.toLowerCase().includes(query) || s.category.toLowerCase().includes(query))
        .slice(0, 3);

      if (matches.length > 0) {
        let response =
          "I'm having a bit of trouble connecting to my AI core, but I've found these relevant signs for you in our GSL dictionary:\n\n";
        matches.forEach(m => {
          response += `• **${m.word}**: ${m.description}\n`;
        });
        response += '\nFeel free to ask about another word!';
        observer.next(response);
      } else {
        observer.next(
          "I'm currently unable to reach my AI service, and I couldn't find an exact match for that in my local dictionary. Try searching for common words like 'Hello', 'Teacher', or 'Ghana'!"
        );
      }
      observer.complete();
    });
  }

  private getOfflineFAQ(query: string): string | null {
    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes('what is gsl') || lowerQuery.includes('ghana sign language')) {
      return 'Ghanaian Sign Language (GSL) is the primary language used by the Deaf community in Ghana. It has its own unique grammar and vocabulary, though it shares some historical roots with American Sign Language (ASL).';
    }
    if (lowerQuery.includes('who built') || lowerQuery.includes('creator')) {
      return 'This platform, SignBridge Ghana, was developed to bridge the communication gap between the Deaf and hearing communities in Ghana using AI and 3D technology.';
    }
    if (lowerQuery.includes('hi') || lowerQuery.includes('hello') || lowerQuery.includes('hey')) {
      return "Hello! I'm here to help you with Ghana Sign Language (GSL). You can ask me how to sign specific words or ask questions about the language!";
    }
    if (lowerQuery.includes('help')) {
      return "I can help you translate English to GSL or find specific signs in the dictionary. Since I'm offline, my answers are limited to local data. Try asking about a specific word!";
    }
    return null;
  }

  private buildSystemPrompt(context: GeminiChatContext): string {
    const mode = context.spokenToSigned ? 'spoken-to-signed' : 'signed-to-spoken';
    const detectedLanguage = context.detectedLanguage ? `Detected spoken language: ${context.detectedLanguage}.` : '';

    return [
      SYSTEM_PROMPT,
      `Current translate mode: ${mode}.`,
      `Spoken language: ${context.spokenLanguage}.`,
      `Signed language: ${context.signedLanguage}.`,
      detectedLanguage,
      'When the user asks for help, keep responses short, practical, and tailored to the current translate direction.',
    ]
      .filter(Boolean)
      .join(' ');
  }

  private buildContents(history: GeminiChatMessage[], userMessage: string): any[] {
    const contents = [];
    let lastRole: string | null = null;

    for (const message of history) {
      const role = message.role === 'assistant' ? 'model' : 'user';
      if (role === lastRole) continue;
      contents.push({
        role,
        parts: [{text: message.text}],
      });
      lastRole = role;
    }

    if (lastRole === 'user' && contents.length > 0) {
      contents[contents.length - 1].parts[0].text += `\n\n${userMessage}`;
    } else {
      contents.push({role: 'user', parts: [{text: userMessage}]});
    }

    return contents;
  }
}
