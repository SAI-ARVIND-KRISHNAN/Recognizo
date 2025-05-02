import { Injectable } from '@angular/core';
import * as faceapi from '@vladmandic/face-api';

@Injectable({
  providedIn: 'root'
})
export class FaceApiService {
  private modelsLoaded = false;
  private labeledDescriptors: faceapi.LabeledFaceDescriptors[] = [];
  private faceMatcher?: faceapi.FaceMatcher;

  async loadModels(): Promise<void> {
    if (this.modelsLoaded) return;

    const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);

    this.modelsLoaded = true;
    console.log('Models loaded from CDN (vladmandic)');
  }

  async detect(video: HTMLVideoElement) {
    return await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions()
      .withAgeAndGender()
      .withFaceDescriptors();
  }

  async detectStatic(image: HTMLImageElement) {
    return await faceapi
      .detectAllFaces(image, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions()
      .withAgeAndGender()
      .withFaceDescriptors();
  }
  

  assignFaceIds(detections: any[]): any[] {
    if (!this.faceMatcher && this.labeledDescriptors.length > 0) {
      this.faceMatcher = new faceapi.FaceMatcher(this.labeledDescriptors, 0.5);
    }

    return detections.map((det) => {
      let faceId = '';

      if (this.faceMatcher) {
        const bestMatch = this.faceMatcher.findBestMatch(det.descriptor);
        faceId = bestMatch.label !== 'unknown' ? bestMatch.label : '';
      }

      if (!faceId) {
        faceId = `face-${Date.now()}`;
        const newDescriptor = new faceapi.LabeledFaceDescriptors(faceId, [det.descriptor]);
        this.labeledDescriptors.push(newDescriptor);
        this.faceMatcher = new faceapi.FaceMatcher(this.labeledDescriptors, 0.5);
      }

      return { ...det, faceId };
    });
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
      const { age, gender, genderProbability, faceId } = result;
      const { x, y, width } = result.detection.box;

      const label = `${faceId} | ${gender} (${Math.round(genderProbability * 100)}%) | Age: ${Math.round(age)}`;

      ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(x, y - 24, ctx.measureText(label).width + 10, 20);

      ctx.fillStyle = 'white';
      ctx.fillText(label, x + 5, y - 10);
    });
  }
}
