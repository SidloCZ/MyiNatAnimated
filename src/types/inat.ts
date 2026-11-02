export interface InatUser {
  id: number;
  login: string;
  name?: string;
  icon?: string;
}

export interface InatTaxon {
  id: number;
  name: string;
  rank: string;
  rank_level?: number;
  common_name?: {
    name: string;
  };
  preferred_common_name?: string;
  iconic_taxon_name?: string;
  ancestor_ids?: number[];
  default_photo?: {
    id: number;
    square_url?: string;
    medium_url?: string;
    url?: string;
    attribution?: string;
  };
}

export interface InatPhoto {
  id: number;
  url: string;
  medium_url?: string;
  attribution?: string;
}

export interface InatObservation {
  id: number;
  uuid: string;
  observed_on: string;
  observed_on_string?: string;
  time_observed_at?: string;
  created_at: string;
  location?: string; // "lat,lng"
  geojson?: {
    type: string;
    coordinates: [number, number]; // [lng, lat]
  };
  faves_count: number;
  comments_count: number;
  identifications_count: number;
  quality_grade: 'casual' | 'needs_id' | 'research';
  taxon?: InatTaxon;
  photos: InatPhoto[];
  place_guess?: string;
  description?: string;
}

export interface InatApiResponse {
  total_results: number;
  page: number;
  per_page: number;
  results: InatObservation[];
}

export interface HighlightItem {
  observation: InatObservation;
  score: number;
  isCustomSelected?: boolean;
}

