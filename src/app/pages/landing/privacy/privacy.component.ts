import {Component} from '@angular/core';
import {IonIcon} from '@ionic/angular/standalone';
import {addIcons} from 'ionicons';
import {
  shieldCheckmarkOutline,
  textOutline,
  videocamOutline,
  statsChartOutline,
  hardwareChipOutline,
  lockClosedOutline,
  cloudOutline,
  mailOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-privacy',
  templateUrl: './privacy.component.html',
  styleUrls: ['./privacy.component.scss'],
  imports: [IonIcon],
})
export class PrivacyComponent {
  constructor() {
    addIcons({
      shieldCheckmarkOutline,
      textOutline,
      videocamOutline,
      statsChartOutline,
      hardwareChipOutline,
      lockClosedOutline,
      cloudOutline,
      mailOutline
    });
  }
}
