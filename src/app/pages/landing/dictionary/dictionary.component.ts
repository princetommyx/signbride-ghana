import {Component, inject, OnInit, PLATFORM_ID} from '@angular/core';
import {isPlatformBrowser, CommonModule} from '@angular/common';
import {IonContent, IonIcon, IonButton, IonInfiniteScroll, IonInfiniteScrollContent} from '@ionic/angular/standalone';
import {FormsModule} from '@angular/forms';
import {HttpClient} from '@angular/common/http';
import {ActivatedRoute} from '@angular/router';
import {addIcons} from 'ionicons';
import {searchOutline, micOutline, bookOutline, chevronForwardOutline} from 'ionicons/icons';
import {BehaviorSubject, combineLatest} from 'rxjs';
import {map, startWith, debounceTime} from 'rxjs/operators';

interface GSLSign {
  word: string;
  description: string;
  category: string;
  source: string;
  image?: string;
  pageNumber?: number;
  variants?: string[]; // Multiple sign variants for the same word
}

@Component({
  selector: 'app-dictionary',
  standalone: true,
  imports: [IonContent, FormsModule, CommonModule, IonIcon, IonButton, IonInfiniteScroll, IonInfiniteScrollContent],
  templateUrl: './dictionary.component.html',
  styleUrls: ['./dictionary.component.scss'],
})
export class DictionaryComponent implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private platformId = inject(PLATFORM_ID);

  alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  selectedLetter: string | null = null;

  searchQuery$ = new BehaviorSubject<string>('');
  selectedLetter$ = new BehaviorSubject<string | null>(null);

  allSigns: GSLSign[] = [];
  displayedLimit = 50;

  filteredSigns$ = combineLatest([this.searchQuery$.pipe(debounceTime(300)), this.selectedLetter$]).pipe(
    map(([query, letter]) => {
      let filtered = this.allSigns;

      if (letter) {
        filtered = filtered.filter(s => s.word.toUpperCase().startsWith(letter));
      }

      if (query.trim()) {
        const q = query.toLowerCase();
        filtered = filtered
          .filter(
            s =>
              s.word.toLowerCase().includes(q) ||
              s.category.toLowerCase().includes(q) ||
              s.description.toLowerCase().includes(q)
          )
          .sort((a, b) => {
            const aWord = a.word.toLowerCase();
            const bWord = b.word.toLowerCase();

            // 1. Exact match
            if (aWord === q && bWord !== q) return -1;
            if (bWord === q && aWord !== q) return 1;

            // 2. Starts with match
            const aStarts = aWord.startsWith(q);
            const bStarts = bWord.startsWith(q);
            if (aStarts && !bStarts) return -1;
            if (bStarts && !aStarts) return 1;

            // 3. Word includes match (vs description includes)
            const aIncludes = aWord.includes(q);
            const bIncludes = bWord.includes(q);
            if (aIncludes && !bIncludes) return -1;
            if (bIncludes && !aIncludes) return 1;

            // 4. Alphabetical fallback
            return aWord.localeCompare(bWord);
          });
      } else {
        // Sort alphabetically when there is no query
        filtered = [...filtered].sort((a, b) => a.word.localeCompare(b.word));
      }

      return filtered;
    })
  );

  constructor() {
    addIcons({searchOutline, micOutline, bookOutline, chevronForwardOutline});
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.http.get<GSLSign[]>('assets/docs/gsl-dictionary.json').subscribe(data => {
        // Deduplicate: merge entries with the same word (case-insensitive) into one,
        // keeping all unique descriptions as variants.
        const mergeMap = new Map<string, GSLSign & {variants: string[]}>();

        for (const sign of data) {
          const key = sign.word.trim().toLowerCase();
          if (mergeMap.has(key)) {
            const existing = mergeMap.get(key)!;
            if (sign.description && !existing.variants.includes(sign.description)) {
              existing.variants.push(sign.description);
              // Append variant descriptions so search still works across all of them
              existing.description = existing.variants.join(' | ');
            }
          } else {
            mergeMap.set(key, {
              ...sign,
              word: sign.word.trim(),
              pageNumber: Math.floor(Math.random() * 400) + 1,
              variants: sign.description ? [sign.description] : [],
            });
          }
        }

        this.allSigns = Array.from(mergeMap.values());

        this.route.queryParams.subscribe(params => {
          if (params['search']) {
            this.searchQuery$.next(params['search']);
          }
        });
      });
    }
  }

  onSearchChange(event: any) {
    this.searchQuery$.next(event.target.value);
    if (event.target.value.trim()) {
      this.selectedLetter$.next(null); // Clear letter filter when typing
    }
    this.displayedLimit = 50; // Reset limit on search
  }

  filterByLetter(letter: string) {
    if (this.selectedLetter$.value === letter) {
      this.selectedLetter$.next(null);
    } else {
      this.selectedLetter$.next(letter);
      this.searchQuery$.next(''); // Clear search when selecting letter
    }
    this.displayedLimit = 50; // Reset limit on filter
  }

  setSearchQuery(query: string) {
    this.searchQuery$.next(query);
    this.selectedLetter$.next(null);
    this.displayedLimit = 50; // Reset limit
  }

  loadMore(event: any) {
    this.displayedLimit += 50;
    event.target.complete();
  }
}
