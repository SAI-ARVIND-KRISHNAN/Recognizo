import { createReducer, on } from '@ngrx/store';
import { setFaceData, resetFaceState } from './face.actions';

export interface FaceDetection {
  timestamp: number;
  age: number;
  gender: string;
  genderConfidence: number;
  emotion: string;
  faceId: string;
}

export interface FaceLogEntry {
  timestamp: number;
  age: number;
  gender: string;
  genderConfidence: number;
  emotion: string;
}

export interface FaceProfile {
  faceId: string;
  logs: FaceLogEntry[];
  appearances: number;
  firstSeen: number;
  lastSeen: number;
  avgAge: number;
  gender: string;
  emotionCounts: Record<string, number>;
  confidence: number;
  lastEmotion: string;
}

export interface EmotionTrend {
  [emotion: string]: number;
}

export interface AgeDistribution {
  teens: number;
  adults: number;
  seniors: number;
}

export interface FaceState {
  current: FaceDetection[];
  history: FaceDetection[];
  emotionTrend: EmotionTrend;
  ageDistribution: AgeDistribution;
  fps: number;
  lastFrameTimestamp: number | null;
  profiles: Record<string, FaceProfile>;
}

export const initialState: FaceState = {
  current: [],
  history: [],
  emotionTrend: {},
  ageDistribution: {
    teens: 0,
    adults: 0,
    seniors: 0
  },
  fps: 0,
  lastFrameTimestamp: null,
  profiles: {}
};

function updateAgeGroup(distribution: AgeDistribution, age: number): AgeDistribution {
  const clone = { ...distribution };
  if (age < 20) clone.teens++;
  else if (age < 50) clone.adults++;
  else clone.seniors++;
  return clone;
}

function updateEmotionTrend(trend: EmotionTrend, emotion: string): EmotionTrend {
  return {
    ...trend,
    [emotion]: (trend[emotion] || 0) + 1
  };
}

export const faceReducer = createReducer(
  initialState,

  on(setFaceData, (state, action) => {
    const now = action.timestamp ?? Date.now();

    const detections = action.detections.map(d => ({
      ...d,
      timestamp: now
    }));

    const newHistory = [...state.history, ...detections].slice(-100);

    let emotionTrend = { ...state.emotionTrend };
    let ageDistribution = { ...state.ageDistribution };
    let profiles = { ...state.profiles };

    for (const d of detections) {
      emotionTrend = updateEmotionTrend(emotionTrend, d.emotion);
      ageDistribution = updateAgeGroup(ageDistribution, d.age);

      const existing = profiles[d.faceId];

      const log: FaceLogEntry = {
        timestamp: now,
        age: d.age,
        gender: d.gender,
        genderConfidence: d.genderConfidence,
        emotion: d.emotion
      };

      if (existing) {
        const totalAge = existing.avgAge * existing.appearances + d.age;
        const newCount = existing.appearances + 1;

        profiles[d.faceId] = {
          ...existing,
          logs: [...existing.logs, log].slice(-20),
          appearances: newCount,
          lastSeen: now,
          avgAge: Math.round(totalAge / newCount),
          emotionCounts: {
            ...existing.emotionCounts,
            [d.emotion]: (existing.emotionCounts[d.emotion] || 0) + 1
          },
          confidence: d.genderConfidence,
          lastEmotion: d.emotion
        };
      } else {
        profiles[d.faceId] = {
          faceId: d.faceId,
          logs: [log],
          appearances: 1,
          firstSeen: now,
          lastSeen: now,
          avgAge: d.age,
          gender: d.gender,
          emotionCounts: { [d.emotion]: 1 },
          confidence: d.genderConfidence,
          lastEmotion: d.emotion
        };
      }
    }

    const fps = state.lastFrameTimestamp
      ? Math.round(1000 / (now - state.lastFrameTimestamp))
      : 0;

    return {
      ...state,
      current: detections,
      history: newHistory,
      emotionTrend,
      ageDistribution,
      profiles,
      fps,
      lastFrameTimestamp: now
    };
  }),

  on(resetFaceState, () => initialState)
);