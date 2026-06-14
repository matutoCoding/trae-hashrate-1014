declare module 'meyda' {
  export interface MeydaAnalyzerOptions {
    audioContext: AudioContext;
    source: AudioNode;
    bufferSize: number;
    hopSize?: number;
    featureExtractors: string[];
    callback?: (features: any) => void;
    startImmediately?: boolean;
  }

  export class MeydaAnalyzer {
    constructor(options: MeydaAnalyzerOptions);
    start(): void;
    stop(): void;
    get(feature: string): any;
    setSource(source: AudioNode): void;
    setChannel(channel: number): void;
  }

  export const features: string[];
}
