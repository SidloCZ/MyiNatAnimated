import { InatObservation } from './inat';

export interface CameraKeyframe {
  t: number; // Animation time in seconds
  center: [number, number]; // [lng, lat]
  zoom: number;
  pitch: number;
  bearing: number;
}

export interface ObsEvent {
  id: number;
  t: number; // Animation time when observation triggers (seconds)
  observation: InatObservation;
  coordinates: [number, number]; // [lng, lat]
  iconicTaxon: string;
  orderName?: string;
  color: string;
  favesCount: number;
  commentsCount: number;
  isHighlight: boolean;
}

export interface SoundCue {
  t: number; // Trigger time (seconds)
  type: 'pop' | 'star' | 'bubble' | 'highlight' | 'whoosh';
  pitchFrequency?: number;
  gain?: number;
}

export interface TimelineData {
  duration: number; // Total length in seconds
  realStartDate: string;
  realEndDate: string;
  events: ObsEvent[];
  cameraKeyframes: CameraKeyframe[];
  soundCues: SoundCue[];
  stats: {
    totalObservations: number;
    totalSpecies: number;
    totalPhotos: number;
    totalFaves: number;
    totalComments: number;
  };
}

