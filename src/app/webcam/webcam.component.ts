import {
    Component,
    ElementRef,
    ViewChild,
    AfterViewInit,
    OnDestroy
  } from '@angular/core';
  import { CommonModule } from '@angular/common';
  import { FaceApiService } from '../face/face-api.service';
  
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
  
    constructor(private faceService: FaceApiService) {}
  
    async ngAfterViewInit() {
      await this.faceService.loadModels();
      this.startCamera();
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
            this.faceService.drawDetections(canvas, resized);
          }, 200); // Run detection every 200ms (~5 fps)
        };
      } catch (err) {
        console.error('Error accessing webcam:', err);
      }
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
  