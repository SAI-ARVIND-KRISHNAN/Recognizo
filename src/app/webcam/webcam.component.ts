import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { FaceApiService } from '../face/face-api.service';
import { setFaceData } from '../store/face.actions';
import {
  selectTopEmotion,
  selectAverageAge,
  selectDominantAgeGroup,
  selectFPS,
  selectCurrentFaces,
  selectFaceProfiles
} from '../store/face.selectors';

@Component({
  standalone: true,
  selector: 'app-webcam',
  imports: [CommonModule],
  templateUrl: './webcam.component.html',
  styleUrls: ['./webcam.component.css']
})
export class WebcamComponent implements AfterViewInit, OnDestroy {
  @ViewChild('video', { static: true }) videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas', { static: true }) canvasElement!: ElementRef<HTMLCanvasElement>;

  videoStream: MediaStream | null = null;
  detectionInterval: any;

  private faceService = inject(FaceApiService);
  private store = inject(Store);

  averageAge$ = this.store.select(selectAverageAge);
  topEmotion$ = this.store.select(selectTopEmotion);
  dominantAgeGroup$ = this.store.select(selectDominantAgeGroup);
  fps$ = this.store.select(selectFPS);
  faceCount$ = this.store.select(selectCurrentFaces);
  profiles$ = this.store.select(selectFaceProfiles);
  currentFaces$ = this.store.select(selectCurrentFaces);

  async ngAfterViewInit() {
    await this.faceService.loadModels();
    //this.startCamera();
  }

  async startCamera() {
    try {
      this.videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = this.videoElement.nativeElement;
      const canvas = this.canvasElement.nativeElement;

      video.srcObject = this.videoStream;

      video.onloadedmetadata = () => {
        video.play();
        const { videoWidth: width, videoHeight: height } = video;
        canvas.width = width;
        canvas.height = height;

        this.detectionInterval = setInterval(async () => {
          const results = await this.faceService.detect(video);
          const resized = this.faceService.resizeResults(results, { width, height });
          const withIds = this.faceService.assignFaceIds(resized);

          this.faceService.drawDetections(canvas, withIds);

          if (withIds.length > 0) {
            const detections = withIds.map((face: any) => ({
              age: Math.round(face.age),
              gender: face.gender,
              genderConfidence: face.genderProbability,
              emotion: this.getTopExpression(face.expressions),
              faceId: face.faceId
            }));

            this.store.dispatch(setFaceData({
              detections,
              timestamp: Date.now()
            }));
          }
        }, 200);
      };
    } catch (err) {
      console.error('Error accessing webcam:', err);
    }
  }

  async onImageUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
  
    const file = input.files[0];
    const img = new Image();
    img.onload = async () => {
      const detections = await this.faceService.detectStatic(img);
      const withIds = this.faceService.assignFaceIds(detections);
  
      const results = withIds.map((face: any) => ({
        age: Math.round(face.age),
        gender: face.gender,
        genderConfidence: face.genderProbability,
        emotion: this.getTopExpression(face.expressions),
        faceId: face.faceId
      }));
  
      this.store.dispatch(setFaceData({
        detections: results,
        timestamp: Date.now()
      }));
    };
  
    const reader = new FileReader();
    reader.onload = e => {
      if (e.target && e.target.result) {
        img.src = e.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  }
  

  getTopExpression(expressions: { [key: string]: number }): string {
    return Object.entries(expressions)
      .sort((a, b) => b[1] - a[1])[0][0];
  }

  stopCamera() {
    clearInterval(this.detectionInterval);
    if (this.videoStream) {
      this.videoStream.getTracks().forEach(track => track.stop());
      this.videoElement.nativeElement.srcObject = null;
    }

    const ctx = this.canvasElement.nativeElement.getContext('2d');
    ctx?.clearRect(0, 0, this.canvasElement.nativeElement.width, this.canvasElement.nativeElement.height);
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }
}
