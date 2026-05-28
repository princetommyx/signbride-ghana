import { importProvidersFrom } from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {axe, toHaveNoViolations} from 'jasmine-axe';

import {HumanPoseViewerComponent} from './human-pose-viewer.component';
import {provideStore, NgxsModule} from '@ngxs/store';
import {SettingsState} from '../../../../modules/settings/settings.state';
import {ngxsConfig} from '../../../../app.config';
import {AppTranslocoTestingModule} from '../../../../core/modules/transloco/transloco-testing.module';
import {provideIonicAngular} from '@ionic/angular/standalone';

describe('HumanPoseViewerComponent', () => {
  let component: HumanPoseViewerComponent;
  let fixture: ComponentFixture<HumanPoseViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppTranslocoTestingModule, HumanPoseViewerComponent],
      providers: [provideIonicAngular(), importProvidersFrom(NgxsModule.forRoot([SettingsState], ngxsConfig))],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(HumanPoseViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should pass accessibility test', async () => {
    jasmine.addMatchers(toHaveNoViolations);
    const a11y = await axe(fixture.nativeElement);
    expect(a11y).toHaveNoViolations();
  });
});
