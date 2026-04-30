import {Injectable} from '@angular/core';
import {Action, State, StateContext} from '@ngxs/store';
import {SetSetting} from './settings.actions';

export type PoseViewerSetting = 'pose' | 'avatar' | 'person';

export interface SettingsStateModel {
  receiveVideo: boolean;

  detectSign: boolean;

  animatePose: boolean;

  drawVideo: boolean;
  drawPose: boolean;
  drawSignWriting: boolean;

  appearance: string;

  poseViewer: PoseViewerSetting;

  theme: 'light' | 'dark' | 'system';

  fontSize: 'small' | 'medium' | 'large';
  highContrast: boolean;
  hapticFeedback: boolean;
  vibrateOnSign: boolean;
  visualAlerts: boolean;
  notifications: boolean;
}

const initialState: SettingsStateModel = {
  receiveVideo: false,

  detectSign: false,

  animatePose: true,

  drawVideo: true,
  drawPose: true,
  drawSignWriting: false,

  poseViewer: 'pose', // Always use skeleton as default

  appearance: '#ffffff',

  theme: 'light',

  fontSize: 'medium',
  highContrast: false,
  hapticFeedback: true,
  vibrateOnSign: true,
  visualAlerts: true,
  notifications: true,
};

@Injectable()
@State<SettingsStateModel>({
  name: 'settings',
  defaults: JSON.parse(globalThis.localStorage?.getItem('app-settings') || 'null') || initialState,
})
export class SettingsState {
  @Action(SetSetting)
  setSetting({patchState, getState}: StateContext<SettingsStateModel>, {setting, value}: SetSetting): void {
    patchState({[setting]: value});
    globalThis.localStorage?.setItem('app-settings', JSON.stringify(getState()));
  }
}
