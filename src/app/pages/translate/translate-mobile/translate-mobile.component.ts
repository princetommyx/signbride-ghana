import {Component, inject} from '@angular/core';
import {TranslateDesktopComponent} from '../translate-desktop/translate-desktop.component';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonToolbar,
  IonMenu,
  IonMenuButton,
  IonMenuToggle,
  IonList,
  IonListHeader,
  IonItem,
  IonLabel,
  IonTitle,
} from '@ionic/angular/standalone';
import {SpokenLanguageInputComponent} from '../spoken-to-signed/spoken-language-input/spoken-language-input.component';
import {SignedLanguageOutputComponent} from '../spoken-to-signed/signed-language-output/signed-language-output.component';
import {SignedLanguageInputComponent} from '../signed-to-spoken/signed-language-input/signed-language-input.component';
import {LanguageSelectorsComponent} from '../language-selectors/language-selectors.component';
import {VideoModule} from '../../../components/video/video.module';
import {ChatbotWidgetComponent} from '../chatbot/chatbot-widget.component';
import {SmartTipsComponent} from '../../../components/smart-tips/smart-tips.component';
import {addIcons} from 'ionicons';
import {moon, sunny} from 'ionicons/icons';
import {Store} from '@ngxs/store';
import {SetSetting} from '../../../modules/settings/settings.actions';
import {AsyncPipe} from '@angular/common';
import {RouterLink} from '@angular/router';
import {TranslocoPipe} from '@jsverse/transloco';

@Component({
  selector: 'app-translate-mobile',
  templateUrl: './translate-mobile.component.html',
  styleUrls: ['./translate-mobile.component.scss'],
  imports: [
    IonContent,
    IonHeader,
    IonToolbar,
    IonFooter,
    IonButtons,
    IonButton,
    IonIcon,
    IonMenu,
    IonMenuButton,
    IonMenuToggle,
    IonList,
    IonListHeader,
    IonItem,
    IonLabel,
    IonTitle,
    SignedLanguageOutputComponent,
    SignedLanguageInputComponent,
    SpokenLanguageInputComponent,
    VideoModule,
    LanguageSelectorsComponent,
    ChatbotWidgetComponent,
    SmartTipsComponent,
    AsyncPipe,
    RouterLink,
    TranslocoPipe,
  ],
})
export class TranslateMobileComponent extends TranslateDesktopComponent {
  constructor() {
    super();
    addIcons({moon, sunny});
  }
}
