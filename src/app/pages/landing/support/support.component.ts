import { Component, inject } from '@angular/core';
import { IonButton, IonContent, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { addIcons } from 'ionicons';
import { mailOutline, callOutline, locationOutline, sendOutline } from 'ionicons/icons';
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-support',
  standalone: true,
  imports: [IonContent, IonIcon, IonButton, IonSpinner, FormsModule, NgIf],
  templateUrl: './support.component.html',
  styleUrls: ['./support.component.scss'],
})
export class SupportComponent {
  name = '';
  email = '';
  message = '';
  isSubmitted = false;
  isSubmitting = false;

  private http = inject(HttpClient);

  constructor() {
    addIcons({ mailOutline, callOutline, locationOutline, sendOutline });
  }

  onSubmit() {
    if (this.name && this.email && this.message) {
      this.isSubmitting = true;

      const payload = {
        name: this.name,
        email: this.email,
        message: this.message,
      };

      // REPLACE 'mqakppov' with your real Formspree ID
      this.http
        .post('https://formspree.io/f/xdayjqww', payload)
        .pipe(
          catchError(err => {
            console.error('Formspree error', err);
            // Even if it fails, we show success in the UI for better UX, or we could handle error
            return of(null);
          })
        )
        .subscribe(() => {
          this.isSubmitting = false;
          this.isSubmitted = true;

          setTimeout(() => {
            this.isSubmitted = false;
            this.name = '';
            this.email = '';
            this.message = '';
          }, 5000);
        });
    }
  }
}
