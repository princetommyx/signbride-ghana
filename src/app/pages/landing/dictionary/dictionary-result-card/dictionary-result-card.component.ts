import {Component, Input, Output, EventEmitter, CUSTOM_ELEMENTS_SCHEMA} from '@angular/core';
import {CommonModule} from '@angular/common';

@Component({
  selector: 'app-dictionary-result-card',
  standalone: true,
  imports: [CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // For swiper
  templateUrl: './dictionary-result-card.component.html',
  styleUrls: ['./dictionary-result-card.component.scss'],
})
export class DictionaryResultCardComponent {
  @Input() sign!: any;
  @Output() openFullPage = new EventEmitter<number>();

  // Expose this for the template to determine if it should render a carousel
  get hasMultipleImages(): boolean {
    return this.sign?.images && this.sign.images.length > 1;
  }

  get displayImage(): string | null {
    if (this.hasMultipleImages) {
      return null;
    }
    return this.sign?.image || null;
  }
}
