import {Output, Mp4OutputFormat, BufferTarget, VideoSampleSource, VideoSample, QUALITY_HIGH} from 'mediabunny';

export function getMediaSourceClass(): typeof MediaSource {
  if ('ManagedMediaSource' in window) {
    return window.ManagedMediaSource as any;
  }
  if ('MediaSource' in window) {
    return MediaSource;
  }
  if ('WebKitMediaSource' in window) {
    return window['WebKitMediaSource'] as any;
  }

  console.warn('Neither ManagedMediaSource nor MediaSource are supported on this device');

  return null;
}

export class PlayableVideoEncoder {
  output: Output;
  bitmapSource: VideoSampleSource;

  width: number;
  height: number;
  fps: number;

  frameIndex = 0;

  constructor(
    private image: ImageBitmap,
    fps: number
  ) {
    this.fps = fps;
  }

  static isSupported() {
    return 'VideoEncoder' in globalThis;
  }

  async init() {
    // H264 only supports even sized frames
    this.width = this.image.width + (this.image.width % 2);
    this.height = this.image.height + (this.image.height % 2);

    // Create bitmap source (H264/AVC codec for maximum compatibility)
    this.bitmapSource = new VideoSampleSource({
      codec: 'avc',
      bitrate: QUALITY_HIGH,
    });

    // Create the output
    this.output = new Output({
      format: new Mp4OutputFormat({
        fastStart: 'in-memory',
      }),
      target: new BufferTarget(),
    });

    // Add video track
    this.output.addVideoTrack(this.bitmapSource);

    // Start the output
    await this.output.start();
  }

  async addFrame(image: ImageBitmap) {
    if (!this.bitmapSource || this.output.target['finalized']) {
      return;
    }

    const timestamp = this.frameIndex / this.fps;
    const duration = 1 / this.fps;

    // Resize image to even dimensions if needed (H264 requirement)
    let resizedImage = image;
    if (image.width !== this.width || image.height !== this.height) {
      resizedImage = await createImageBitmap(image, {
        resizeWidth: this.width,
        resizeHeight: this.height,
        resizeQuality: 'high',
      });
    }

    const sample = new VideoSample(resizedImage, {
      timestamp,
      duration,
    });

    try {
      await this.bitmapSource.add(sample);
    } catch (e) {
      console.warn('Could not add frame to video encoder', e);
    }

    // Clean up resized image if we created a new one
    if (resizedImage !== image) {
      resizedImage.close();
    }

    this.frameIndex++;
  }

  async finalize() {
    if (!this.bitmapSource || this.output.target['finalized']) {
      return null;
    }

    this.bitmapSource.close();
    await this.output.finalize();
    this.output.target['finalized'] = true;

    const buffer = (this.output.target as any).buffer as ArrayBuffer;
    return new Blob([buffer], {type: 'video/mp4'});
  }

  close() {
    if (this.bitmapSource) {
      try {
        this.bitmapSource.close();
      } catch (e) {
        // already closed
      }
      delete this.bitmapSource;
    }
    if (this.output) {
      delete this.output;
    }
  }
}
