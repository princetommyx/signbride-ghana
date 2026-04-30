import {inject, Injectable} from '@angular/core';
import {Action, NgxsOnInit, State, StateContext, Store} from '@ngxs/store';
import {AnimationService} from './animation.service';
import {filter, first, tap} from 'rxjs/operators';
import {EstimatedPose} from '../pose/pose.state';
import {AnimatePose} from './animation.actions';
import {Observable} from 'rxjs';

export interface AnimationStateModel {
  tracks: {[key: string]: [number, number, number, number][]};
}

const initialState: AnimationStateModel = {
  tracks: null,
};

@Injectable()
@State<AnimationStateModel>({
  name: 'animation',
  defaults: initialState,
})
export class AnimationState implements NgxsOnInit {
  private store = inject(Store);
  private animation = inject(AnimationService);

  pose$!: Observable<EstimatedPose>;

  constructor() {
    this.pose$ = this.store.select<EstimatedPose>(state => state.pose.pose);
  }

  ngxsOnInit({dispatch}: StateContext<any>): void {
    this.pose$
      .pipe(
        filter(Boolean),
        first(),
        tap(() => {
          this.animation.loadModel();
        })
      )
      .subscribe();

    this.pose$
      .pipe(
        filter(Boolean),
        tap((pose: EstimatedPose) => dispatch(new AnimatePose(pose)))
      )
      .subscribe();
  }

  @Action(AnimatePose)
  async animatePose({getState, patchState}: StateContext<AnimationStateModel>, {pose}: AnimatePose): Promise<void> {
    await this.animation.loadModel();
    const tracks = this.animation.estimate([pose]);
    patchState({tracks});
  }
}
