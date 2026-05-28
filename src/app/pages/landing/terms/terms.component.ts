import {Component} from '@angular/core';
import {IonIcon} from '@ionic/angular/standalone';
import {addIcons} from 'ionicons';
import {
  heartOutline,
  briefcaseOutline,
  mailOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-terms',
  templateUrl: './terms.component.html',
  styleUrls: ['./terms.component.scss'],
  imports: [IonIcon],
})
export class TermsComponent {
  constructor() {
    addIcons({
      heartOutline,
      briefcaseOutline,
      mailOutline
    });
  }
}
