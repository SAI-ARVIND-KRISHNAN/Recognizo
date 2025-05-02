import { createAction, props } from '@ngrx/store';

export interface FaceDetectionPayload {
  age: number;
  gender: string;
  genderConfidence: number;
  emotion: string;
  faceId: string;
}

export const setFaceData = createAction(
  '[Face] Set Face Data',
  props<{
    detections: FaceDetectionPayload[];
    timestamp?: number;
  }>()
);

export const resetFaceState = createAction('[Face] Reset State');