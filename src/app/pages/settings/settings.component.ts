import {Component, inject, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {Store} from '@ngxs/store';
import {Observable} from 'rxjs';
import {takeUntil, tap} from 'rxjs/operators';
import {SettingsStateModel} from '../../modules/settings/settings.state';
import {SetSetting} from '../../modules/settings/settings.actions';
import {BaseComponent} from '../../components/base/base.component';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonList,
  IonItem,
  IonLabel,
  IonToggle,
  IonSelect,
  IonSelectOption,
  IonIcon,
  IonButton,
} from '@ionic/angular/standalone';
import {addIcons} from 'ionicons';
import {
  accessibilityOutline,
  colorPaletteOutline,
  notificationsOutline,
  megaphoneOutline,
  informationCircleOutline,
} from 'ionicons/icons';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonList,
    IonItem,
    IonLabel,
    IonToggle,
    IonSelect,
    IonSelectOption,
    IonIcon,
    IonButton,
  ],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent extends BaseComponent implements OnInit {
  private store = inject(Store);

  settings$!: Observable<SettingsStateModel>;
  currentSettings!: SettingsStateModel;

  constructor() {
    super();
    this.settings$ = this.store.select<SettingsStateModel>(state => state.settings);
    addIcons({
      accessibilityOutline,
      colorPaletteOutline,
      notificationsOutline,
      megaphoneOutline,
      informationCircleOutline,
    });
  }

  ngOnInit() {
    this.settings$
      .pipe(
        tap(settings => {
          this.currentSettings = settings;
          this.applyAccessibilityChanges(settings);
        }),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe();
  }

  updateSetting(setting: keyof SettingsStateModel, value: any) {
    this.store.dispatch(new SetSetting(setting, value));
  }

  applyAccessibilityChanges(settings: SettingsStateModel) {
    // Apply font size scale
    const scale = settings.fontSize === 'small' ? '0.9' : settings.fontSize === 'large' ? '1.25' : '1.0';
    document.documentElement.style.setProperty('--app-font-scale', scale);

    // Apply high contrast
    if (settings.highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
  }
}
