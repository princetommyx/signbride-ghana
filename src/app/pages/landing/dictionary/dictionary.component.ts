import {Component, inject, OnInit, PLATFORM_ID, CUSTOM_ELEMENTS_SCHEMA} from '@angular/core';
import {isPlatformBrowser, CommonModule} from '@angular/common';
import {IonContent, IonIcon, IonButton, IonInfiniteScroll, IonInfiniteScrollContent} from '@ionic/angular/standalone';
import {FormsModule} from '@angular/forms';
import {HttpClient} from '@angular/common/http';
import {ActivatedRoute, Router} from '@angular/router';
import {addIcons} from 'ionicons';
import {
  searchOutline,
  micOutline,
  bookOutline,
  chevronForwardOutline,
  closeOutline,
  informationCircleOutline,
  linkOutline,
  pricetagsOutline,
  videocamOutline,
} from 'ionicons/icons';
import {BehaviorSubject, combineLatest} from 'rxjs';
import {map, startWith, debounceTime} from 'rxjs/operators';
import Fuse from 'fuse.js';

import {DictionaryResultCardComponent} from './dictionary-result-card/dictionary-result-card.component';

export interface GSLSign {
  word: string;
  description: string;
  image?: string;
  images?: string[];
  page?: number;
  letter?: string;
  aliases?: string[];
  tags?: string[];
  align?: 'left' | 'right' | 'full';
}

@Component({
  selector: 'app-dictionary',
  standalone: true,
  imports: [
    IonContent,
    FormsModule,
    CommonModule,
    IonIcon,
    IonButton,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    DictionaryResultCardComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './dictionary.component.html',
  styleUrls: ['./dictionary.component.scss'],
})
export class DictionaryComponent implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  selectedLetter: string | null = null;

  searchQuery$ = new BehaviorSubject<string>('');
  selectedLetter$ = new BehaviorSubject<string | null>(null);

  allSigns: GSLSign[] = [];
  displayedLimit = 50;
  fuse!: Fuse<GSLSign>;

  fullPageModalOpen = false;
  fullPagePdfSrc = '';
  selectedSign: GSLSign | null = null;

  filteredSigns$ = combineLatest([this.searchQuery$.pipe(debounceTime(150)), this.selectedLetter$]).pipe(
    map(([query, letter]) => {
      let filtered = this.allSigns;

      if (letter) {
        filtered = filtered.filter(s => s.word.toUpperCase().startsWith(letter));
      }

      if (query.trim()) {
        const results = this.fuse.search(query);
        filtered = results.map(r => r.item);

        // Exact match first priority is handled by Fuse.js sorting + weighted keys,
        // but we can explicitly bump exact matches to the very top.
        const exactMatchIndex = filtered.findIndex(s => s.word.toLowerCase() === query.trim().toLowerCase());
        if (exactMatchIndex > 0) {
          const exactMatch = filtered.splice(exactMatchIndex, 1)[0];
          filtered.unshift(exactMatch);
        }
      } else {
        // Sort alphabetically when there is no query
        filtered = [...filtered].sort((a, b) => a.word.localeCompare(b.word));
      }

      return filtered;
    })
  );

  constructor() {
    addIcons({
      searchOutline,
      micOutline,
      bookOutline,
      chevronForwardOutline,
      closeOutline,
      informationCircleOutline,
      linkOutline,
      pricetagsOutline,
      videocamOutline,
    });
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.http.get<GSLSign[]>('assets/data/gsl_dictionary.json').subscribe({
        next: data => {
          this.allSigns = data;
          this.initFuse();

          this.route.queryParams.subscribe(params => {
            if (params['search']) {
              this.searchQuery$.next(params['search']);
            }
          });
        },
        error: err => {
          console.error('Could not load dictionary data. Have you run the extraction script?', err);
        },
      });
    }
  }

  initFuse() {
    this.fuse = new Fuse(this.allSigns, {
      keys: [
        {name: 'word', weight: 3},
        {name: 'aliases', weight: 2},
        {name: 'tags', weight: 1.5},
        {name: 'description', weight: 1},
      ],
      threshold: 0.3,
      includeScore: true,
      ignoreLocation: true,
    });
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

  openPage(sign: any) {
    this.selectedSign = sign;
    this.fullPageModalOpen = true;
  }

  closePage() {
    this.fullPageModalOpen = false;
    this.selectedSign = null;
  }

  searchAlias(alias: string) {
    this.searchQuery$.next(alias);
    this.selectedLetter$.next(null);
    this.closePage();
  }

  practiceSign(word: string) {
    this.closePage();
    this.router.navigate(['/translate'], {queryParams: {search: word}});
  }
}
