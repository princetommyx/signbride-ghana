import {AfterViewInit, Component, CUSTOM_ELEMENTS_SCHEMA, EventEmitter, inject, Input, Output} from '@angular/core';
import {BasePoseViewerComponent} from '../pose-viewer.component';
import {fromEvent} from 'rxjs';
import {takeUntil, tap} from 'rxjs/operators';
import {AnimationComponent} from '../../../../components/animation/animation.component';
import {AnimatePose} from '../../../../modules/animation/animation.actions';

@Component({
  selector: 'app-avatar-pose-viewer',
  templateUrl: './avatar-pose-viewer.component.html',
  styleUrls: ['./avatar-pose-viewer.component.scss'],
  imports: [AnimationComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AvatarPoseViewerComponent extends BasePoseViewerComponent implements AfterViewInit {
  @Input() src: string;
  @Output() diagnosticMessage = new EventEmitter<string>();

  effectiveFps: number = 1;
  poseData: any = null;

  ngAfterViewInit(): void {
    const poseEl = this.poseEl().nativeElement;
    this.emitDiagnostic('Avatar pose viewer initialized');

    fromEvent(poseEl, 'firstRender$')
      .pipe(
        tap(async () => {
          try {
            this.poseData = await poseEl.getPose();
            this.effectiveFps = this.poseData.body.fps;
            this.playback.updateTiming(poseEl.currentTime, poseEl.duration);
            this.emitDiagnostic('Pose data loaded, fps=' + this.effectiveFps);
          } catch (e) {
            this.emitDiagnostic('Failed to load pose data: ' + (e as Error).message);
            console.error('Failed to load pose data', e);
          }
        }),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe();

    fromEvent(poseEl, 'render$')
      .pipe(
        tap(() => {
          try {
            this.playback.updateTiming(poseEl.currentTime, poseEl.duration);
            this.animateFrame();
          } catch (e) {
            this.emitDiagnostic('Animation frame failed: ' + (e as Error).message);
            console.error('Animation frame failed', e);
          }
        }),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe();
  }

  animateFrame() {
    if (!this.poseData) return;

    const poseEl = this.poseEl().nativeElement;
    const frameIdx = Math.floor(poseEl.currentTime * this.effectiveFps);
    const frame = this.poseData.body.data[frameIdx];

    if (!frame) {
      this.emitDiagnostic(`Frame not found at index ${frameIdx}`);
      return;
    }

    const person = frame[0];
    if (!person) {
      this.emitDiagnostic('No person data found in current frame');
      return;
    }

    const components = this.poseData.header.components;
    const landmarks = person;

    const getLandmarks = (name: string) => {
      const component = components.find(c => c.name.toLowerCase() === name.toLowerCase());
      if (!component) return [];
      const start = components.slice(0, components.indexOf(component)).reduce((acc, c) => acc + c.points.length, 0);
      return landmarks.slice(start, start + component.points.length).map(l => {
        if (!l) return {x: 0, y: 0, z: 0};
        return {
          x: l[0],
          y: l[1],
          z: l[2],
        };
      });
    };

    const estimatedPose = {
      poseLandmarks: getLandmarks('POSE_LANDMARKS'),
      faceLandmarks: getLandmarks('FACE_LANDMARKS'),
      leftHandLandmarks: getLandmarks('LEFT_HAND_LANDMARKS'),
      rightHandLandmarks: getLandmarks('RIGHT_HAND_LANDMARKS'),
      image: {width: this.poseData.header.width, height: this.poseData.header.height} as any,
    };

    this.store.dispatch(new AnimatePose(estimatedPose));
  }

  private emitDiagnostic(message: string): void {
    this.diagnosticMessage.emit(message);
  }
}
