import {inject, Injectable} from '@angular/core';
import {catchError, from, Observable} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {AssetsService} from '../../core/services/assets/assets.service';
import {filter, map} from 'rxjs/operators';
import {ComlinkWorkerInterface, ModelRegistry, TranslationResponse} from '@sign-mt/browsermt';
import {environment} from '../../../environments/environment';

type TranslationDirection = 'spoken-to-signed' | 'signed-to-spoken';

@Injectable({
  providedIn: 'root',
})
export class SignWritingTranslationService {
  private http = inject(HttpClient);
  private assets = inject(AssetsService);

  worker: ComlinkWorkerInterface;

  loadedModel: string;

  async initWorker() {
    if (this.worker) {
      return;
    }
    const {createBergamotWorker} = await import(/* webpackChunkName: "@sign-mt/browsermt" */ '@sign-mt/browsermt');
    this.worker = createBergamotWorker('/browsermt/worker.js');

    await this.worker.importBergamotWorker('bergamot-translator-worker.js', 'bergamot-translator-worker.wasm');
  }

  async createModelRegistry(modelPath: string) {
    const modelRegistry = {};
    const modelFiles = await this.assets.getDirectory(modelPath);
    for (const [name, path] of modelFiles.entries()) {
      const fileType = name.split('.').shift();
      modelRegistry[fileType] = {name: path, size: 0, estimatedCompressedSize: 0, modelType: 'prod'};
    }
    return modelRegistry;
  }

  async loadOfflineModel(direction: TranslationDirection, fromLang: string, toLang: string) {
    const modelName = `${fromLang}${toLang}`;
    if (this.loadedModel === modelName) {
      return;
    }

    const modelPath = `models/browsermt/${direction}/${fromLang}-${toLang}/`;
    const state = this.assets.stat(modelPath);
    if (!state.exists) {
      throw new Error(`Model '${modelPath}' not found locally`);
    }

    const modelRegistry = {[modelName]: await this.createModelRegistry(modelPath)} as ModelRegistry;

    await this.initWorker();
    await this.worker.loadModel(fromLang, toLang, modelRegistry);
    this.loadedModel = modelName;
  }

  async translateOffline(
    direction: TranslationDirection,
    text: string,
    fromLang: string,
    toLang: string
  ): Promise<TranslationResponse> {
    await this.loadOfflineModel(direction, fromLang, toLang);

    let translations = await this.worker.translate(fromLang, toLang, [text], [{isHtml: false}]);
    if (typeof translations[0] === 'string') {
      translations = translations.map((t: any) => ({text: t}));
    }

    translations = translations.map(({text}) => ({text: this.postProcessSignWriting(text)}));

    return translations[0];
  }

  translateOnline(
    direction: TranslationDirection,
    text: string,
    sentences: string[],
    fromLang: string,
    toLang: string
  ): Observable<TranslationResponse> {
    // TODO use the new API (when bergamot model is trained)
    // const query = new URLSearchParams({from: fromLang, to: toLang, text});
    // return this.http.get<TranslationResponse>(`https://sign.mt/api/${direction}?${query}`);'

    const url = `${environment.signMtBase}/spoken_text_to_signwriting`;
    const body = {
      data: {
        texts: sentences.map(s => s.trim()),
        spoken_language: fromLang,
        signed_language: toLang,
      },
    };

    interface SpokenToSignWritingResponse {
      result: {
        input: string[];
        output: string[];
      };
    }

    return from(
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch signwriting');
          return res.json();
        })
        .then((res: SpokenToSignWritingResponse) => ({text: res.result.output.join(' ')}))
    );
  }

  translateSpokenToSignWriting(
    text: string,
    sentences: string[],
    spokenLanguage: string,
    signedLanguage: string
  ): Observable<TranslationResponse> {
    const direction: TranslationDirection = 'spoken-to-signed';
    const offlineSpecific = () => {
      const newText = `${this.preProcessSpokenText(text)}`;
      return from(this.translateOffline(direction, newText, spokenLanguage, signedLanguage));
    };

    const offlineGeneric = () => {
      const newText = `$${spokenLanguage} $${signedLanguage} ${this.preProcessSpokenText(text)}`;
      return from(this.translateOffline(direction, newText, 'spoken', 'signed'));
    };

    const online = () => this.translateOnline(direction, text, sentences, spokenLanguage, signedLanguage);

    return offlineSpecific().pipe(
      catchError(offlineGeneric),
      filter(() => !('navigator' in globalThis) || navigator.onLine),
      catchError(online)
    );
  }

  preProcessSpokenText(text: string) {
    return text.replace('\n', ' ');
  }

  postProcessSignWriting(text: string) {
    // remove all tokens that start with a $
    text = text.replace(/\$[^\s]+/g, '');

    // space signs correctly
    text = text.replace(/ /g, '');
    text = text.replace(/(\d)M/g, '$1 M');

    return text;
  }
}
