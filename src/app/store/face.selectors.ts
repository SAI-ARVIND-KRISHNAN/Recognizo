import { createFeatureSelector, createSelector } from '@ngrx/store';
import { FaceState, FaceDetection } from './face.reducer';

export const selectFaceState = createFeatureSelector<FaceState>('face');

// Get most recent face (first in current array)
export const selectLatestFace = createSelector(
  selectFaceState,
  state => state.current[0] ?? null
);

// All currently detected faces in the frame
export const selectCurrentFaces = createSelector(
    selectFaceState,
    state => state.current
  );

// Average age from history
export const selectAverageAge = createSelector(
  selectFaceState,
  state => {
    if (state.history.length === 0) return 0;
    const totalAge = state.history.reduce((sum, d) => sum + d.age, 0);
    return Math.round(totalAge / state.history.length);
  }
);

// Most common emotion in history
export const selectTopEmotion = createSelector(
  selectFaceState,
  state => {
    const entries = Object.entries(state.emotionTrend);
    if (!entries.length) return 'unknown';
    return entries.sort((a, b) => b[1] - a[1])[0][0];
  }
);

// Most populated age group
export const selectDominantAgeGroup = createSelector(
  selectFaceState,
  state => {
    const groups = state.ageDistribution;
    const max = Math.max(groups.teens, groups.adults, groups.seniors);
    if (max === groups.teens) return 'Teens';
    if (max === groups.adults) return 'Adults';
    return 'Seniors';
  }
);

// Frames per second
export const selectFPS = createSelector(
  selectFaceState,
  state => state.fps
);

// Last 5 detection timestamps
export const selectLastDetectionTimestamps = createSelector(
  selectFaceState,
  state => state.history.slice(-5).map(d => d.timestamp)
);

// All face profiles
export const selectFaceProfiles = createSelector(
  selectFaceState,
  state => state.profiles
);
