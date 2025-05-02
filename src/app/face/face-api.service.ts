import { Injectable } from '@angular/core';
import * as faceapi from '@vladmandic/face-api';

@Injectable({
  providedIn: 'root'
})
export class FaceApiService {
  private modelsLoaded = false;

  async loadModels(): Promise<void> {
    if (this.modelsLoaded) return;

    const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    ]);

    this.modelsLoaded = true;
    console.log('✅ Models loaded from CDN (vladmandic)');
  }
  

  async detect(video: HTMLVideoElement) {
    return await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions()
      .withAgeAndGender();
  }

  resizeResults(results: any, dims: { width: number; height: number }) {
    return faceapi.resizeResults(results, dims);
  }

  drawDetections(canvas: HTMLCanvasElement, resizedResults: any) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    faceapi.draw.drawDetections(canvas, resizedResults);
    faceapi.draw.drawFaceExpressions(canvas, resizedResults);
    faceapi.draw.drawFaceLandmarks(canvas, resizedResults);

    resizedResults.forEach((result: any) => {
      const { age, gender, genderProbability } = result;
      const { x, y } = result.detection.box;

      ctx.font = '14px Arial';
      ctx.fillStyle = '#00ff00';
      ctx.fillText(
        `${gender} (${Math.round(genderProbability * 100)}%) | Age: ${Math.round(age)}`,
        x,
        y - 10
      );
    });
  }
}
