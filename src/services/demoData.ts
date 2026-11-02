import { InatObservation } from '../types/inat';

export const DEMO_USER = 'prirodovedec_demo';

export const DEMO_OBSERVATIONS: InatObservation[] = [
  {
    id: 101,
    uuid: 'demo-101',
    observed_on: '2024-05-10',
    time_observed_at: '2024-05-10T10:15:00Z',
    created_at: '2024-05-10T10:15:00Z',
    geojson: { type: 'Point', coordinates: [16.6068, 49.1951] }, // Brno
    faves_count: 5,
    comments_count: 2,
    identifications_count: 3,
    quality_grade: 'research',
    place_guess: 'Brno, Kraví hora',
    taxon: {
      id: 54988,
      name: 'Lucanus cervus',
      rank: 'species',
      preferred_common_name: 'Roháč obecný',
      iconic_taxon_name: 'Insecta',
      default_photo: {
        id: 1,
        medium_url: 'https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?w=800&auto=format&fit=crop&q=80',
      }
    },
    photos: [
      {
        id: 1,
        url: 'https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?w=800&auto=format&fit=crop&q=80',
        medium_url: 'https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?w=800&auto=format&fit=crop&q=80'
      }
    ]
  },
  {
    id: 102,
    uuid: 'demo-102',
    observed_on: '2024-05-11',
    time_observed_at: '2024-05-11T14:30:00Z',
    created_at: '2024-05-11T14:30:00Z',
    geojson: { type: 'Point', coordinates: [16.6110, 49.1985] },
    faves_count: 2,
    comments_count: 0,
    identifications_count: 2,
    quality_grade: 'research',
    place_guess: 'Brno, Wilsonův les',
    taxon: {
      id: 53521,
      name: 'Anemone nemorosa',
      rank: 'species',
      preferred_common_name: 'Sasanka hajní',
      iconic_taxon_name: 'Plantae',
      default_photo: {
        id: 2,
        medium_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80'
      }
    },
    photos: [
      {
        id: 2,
        url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
        medium_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80'
      }
    ]
  },
  {
    id: 103,
    uuid: 'demo-103',
    observed_on: '2024-05-12',
    time_observed_at: '2024-05-12T09:00:00Z',
    created_at: '2024-05-12T09:00:00Z',
    geojson: { type: 'Point', coordinates: [16.6350, 49.2150] },
    faves_count: 1,
    comments_count: 1,
    identifications_count: 2,
    quality_grade: 'research',
    place_guess: 'Brno, Hády',
    taxon: {
      id: 60606,
      name: 'Papilio machaon',
      rank: 'species',
      preferred_common_name: 'Otakárek fenyklový',
      iconic_taxon_name: 'Insecta',
      default_photo: {
        id: 3,
        medium_url: 'https://images.unsplash.com/photo-1558980394-4c7c9299fe96?w=800&auto=format&fit=crop&q=80'
      }
    },
    photos: [
      {
        id: 3,
        url: 'https://images.unsplash.com/photo-1558980394-4c7c9299fe96?w=800&auto=format&fit=crop&q=80',
        medium_url: 'https://images.unsplash.com/photo-1558980394-4c7c9299fe96?w=800&auto=format&fit=crop&q=80'
      }
    ]
  },
  {
    id: 104,
    uuid: 'demo-104',
    observed_on: '2024-06-02',
    time_observed_at: '2024-06-02T11:20:00Z',
    created_at: '2024-06-02T11:20:00Z',
    geojson: { type: 'Point', coordinates: [16.6402, 48.8105] }, // Pálava
    faves_count: 8,
    comments_count: 4,
    identifications_count: 5,
    quality_grade: 'research',
    place_guess: 'Děvín, Pálava',
    taxon: {
      id: 82012,
      name: 'Lacerta viridis',
      rank: 'species',
      preferred_common_name: 'Ještěrka zelená',
      iconic_taxon_name: 'Reptilia',
      default_photo: {
        id: 4,
        medium_url: 'https://images.unsplash.com/photo-1508817628294-5a453fa0b8fb?w=800&auto=format&fit=crop&q=80'
      }
    },
    photos: [
      {
        id: 4,
        url: 'https://images.unsplash.com/photo-1508817628294-5a453fa0b8fb?w=800&auto=format&fit=crop&q=80',
        medium_url: 'https://images.unsplash.com/photo-1508817628294-5a453fa0b8fb?w=800&auto=format&fit=crop&q=80'
      }
    ]
  },
  {
    id: 105,
    uuid: 'demo-105',
    observed_on: '2024-06-03',
    time_observed_at: '2024-06-03T16:00:00Z',
    created_at: '2024-06-03T16:00:00Z',
    geojson: { type: 'Point', coordinates: [16.6520, 48.8050] },
    faves_count: 3,
    comments_count: 0,
    identifications_count: 2,
    quality_grade: 'research',
    place_guess: 'Klentnice, Sirotčí hrádek',
    taxon: {
      id: 59312,
      name: 'Stipa pennata',
      rank: 'species',
      preferred_common_name: 'Kavyl péřitý',
      iconic_taxon_name: 'Plantae',
      default_photo: {
        id: 5,
        medium_url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=80'
      }
    },
    photos: [
      {
        id: 5,
        url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=80',
        medium_url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=80'
      }
    ]
  },
  {
    id: 106,
    uuid: 'demo-106',
    observed_on: '2024-07-15',
    time_observed_at: '2024-07-15T08:45:00Z',
    created_at: '2024-07-15T08:45:00Z',
    geojson: { type: 'Point', coordinates: [14.4207, 50.0880] }, // Praha
    faves_count: 4,
    comments_count: 1,
    identifications_count: 3,
    quality_grade: 'research',
    place_guess: 'Praha, Stromovka',
    taxon: {
      id: 9812,
      name: 'Alcedo atthis',
      rank: 'species',
      preferred_common_name: 'Ledňáček říční',
      iconic_taxon_name: 'Aves',
      default_photo: {
        id: 6,
        medium_url: 'https://images.unsplash.com/photo-1555169062-013468b47731?w=800&auto=format&fit=crop&q=80'
      }
    },
    photos: [
      {
        id: 6,
        url: 'https://images.unsplash.com/photo-1555169062-013468b47731?w=800&auto=format&fit=crop&q=80',
        medium_url: 'https://images.unsplash.com/photo-1555169062-013468b47731?w=800&auto=format&fit=crop&q=80'
      }
    ]
  },
  {
    id: 107,
    uuid: 'demo-107',
    observed_on: '2024-07-16',
    time_observed_at: '2024-07-16T15:10:00Z',
    created_at: '2024-07-16T15:10:00Z',
    geojson: { type: 'Point', coordinates: [14.3900, 50.0820] },
    faves_count: 2,
    comments_count: 0,
    identifications_count: 2,
    quality_grade: 'research',
    place_guess: 'Praha, Petřín',
    taxon: {
      id: 48512,
      name: 'Formica rufa',
      rank: 'species',
      preferred_common_name: 'Mravenec lesní',
      iconic_taxon_name: 'Insecta',
      default_photo: {
        id: 7,
        medium_url: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&auto=format&fit=crop&q=80'
      }
    },
    photos: [
      {
        id: 7,
        url: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&auto=format&fit=crop&q=80',
        medium_url: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800&auto=format&fit=crop&q=80'
      }
    ]
  },
  {
    id: 108,
    uuid: 'demo-108',
    observed_on: '2024-09-20',
    time_observed_at: '2024-09-20T11:00:00Z',
    created_at: '2024-09-20T11:00:00Z',
    geojson: { type: 'Point', coordinates: [13.4833, 49.0333] }, // Šumava
    faves_count: 12,
    comments_count: 5,
    identifications_count: 6,
    quality_grade: 'research',
    place_guess: 'Modrava, Šumava',
    taxon: {
      id: 48333,
      name: 'Boletus edulis',
      rank: 'species',
      preferred_common_name: 'Hřib smrkový',
      iconic_taxon_name: 'Fungi',
      default_photo: {
        id: 8,
        medium_url: 'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?w=800&auto=format&fit=crop&q=80'
      }
    },
    photos: [
      {
        id: 8,
        url: 'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?w=800&auto=format&fit=crop&q=80',
        medium_url: 'https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?w=800&auto=format&fit=crop&q=80'
      }
    ]
  }
];

