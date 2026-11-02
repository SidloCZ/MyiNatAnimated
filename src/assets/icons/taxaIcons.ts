import { InatTaxon } from '../../types/inat';

export interface TaxonVisual {
  key: string;
  label: string;
  color: string;
  svgPath: string;
}

export const INAT_COLORS = {
  green: '#74ac00',
  blue: '#1e88e5',
  orange: '#ff7f00',
  pink: '#ff4081',
  brown: '#795548',
  purple: '#9c27b0',
  gray: '#9e9e9e',
};

// 24x24 viewBox SVG path definitions (minimalist, clean single paths)
export const SVG_PATHS = {
  // Iconic Taxa
  plantae: 'M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4 21h4l.65-2.61C10.03 18.79 11 19 12 19c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 14c-1.15 0-2.22-.31-3.15-.85L12 11.5l3.15 4.65c-.93.54-2 .85-3.15.85zm5.13-2.69L13.5 8.77V5.13C16.63 5.92 19 8.68 19 12c0 .82-.16 1.6-.44 2.31h-1.43z',
  insecta: 'M19 10h-2.14A6.98 6.98 0 0 0 15 5.58V3h-2v2.09c-.32-.05-.66-.09-1-.09s-.68.04-1 .09V3H9v2.58A6.98 6.98 0 0 0 7.14 10H5v2h2.03c-.02.33-.03.66-.03 1s.01.67.03 1H5v2h2.14A6.98 6.98 0 0 0 9 20.42V21h2v-1.09c.32.05.66.09 1 .09s.68-.04 1-.09V21h2v-.58a6.98 6.98 0 0 0 2-4.42h2v-2h-2.03c.02-.33.03-.66.03-1s-.01-.67-.03-1H19v-2zm-5 6h-4v-6h4v6z',
  aves: 'M21 5c-1.11.35-2.33.07-3.18-.72-.64-.6-1.52-.95-2.45-.95-2.04 0-3.69 1.65-3.69 3.69 0 .42.07.82.2 1.19C8.36 8.35 5.3 10.98 4.23 14.5c1.47-.64 3.12-.66 4.67-.04.42-1.39 1.4-2.5 2.7-3.05-.18.66-.19 1.36-.02 2.05L12 18l3.5-3c1.66-1.42 2.5-3.53 2.24-5.69l1.92-1.08c.84-.47 1.34-1.38 1.34-2.34V5h-.01z',
  fungi: 'M12 2C6.48 2 2 6.48 2 12c0 1.1.9 2 2 2h4v6c0 1.1.9 2 2 2h4c1.1 0 2-.9 2-2v-6h4c1.1 0 2-.9 2-2 0-5.52-4.48-10-10-10zm-2 18v-6h4v6h-4z',
  mammalia: 'M12 13c-2.21 0-4 1.79-4 4 0 1.66 1.34 3 3 3h2c1.66 0 3-1.34 3-3 0-2.21-1.79-4-4-4zm-5.5-2c1.38 0 2.5-1.12 2.5-2.5S7.88 6 6.5 6 4 7.12 4 8.5 5.12 11 6.5 11zm11 0c1.38 0 2.5-1.12 2.5-2.5S18.88 6 17.5 6 15 7.12 15 8.5s1.12 2.5 2.5 2.5zM12 9c1.38 0 2.5-1.12 2.5-2.5S13.38 4 12 4s-2.5 1.12-2.5 2.5S10.62 9 12 9z',
  reptilia: 'M13.5 2c-1.1 0-2 .9-2 2 0 .74.4 1.38 1 1.72v2.34C9.5 8.5 7.27 10.3 6.4 12.8L3 14v2l3.05-.61c.42 2.2 1.95 3.98 4 4.67V22h2v-2.07c2.61-.4 4.67-2.46 5.07-5.07L20 15v-2l-2.8-.56c-.6-1.73-1.84-3.13-3.45-3.92V5.72c.6-.34 1-.98 1-1.72 0-1.1-.9-2-2-2z',
  amphibia: 'M18.5 4c-1.38 0-2.5 1.12-2.5 2.5 0 .39.09.76.25 1.09C14.86 8.35 13.5 10 12 10s-2.86-1.65-4.25-2.41c.16-.33.25-.7.25-1.09C8 5.12 6.88 4 5.5 4S3 5.12 3 6.5c0 1.25.92 2.29 2.13 2.47C6.18 11.23 8.87 13 12 13s5.82-1.77 6.87-4.03c1.21-.18 2.13-1.22 2.13-2.47 0-1.38-1.12-2.5-2.5-2.5zM7.5 14.5c-2.2 1-3.5 3.1-3.5 5.5H6c0-1.7.9-3.2 2.4-3.9l-.9-1.6zm9 0l-.9 1.6c1.5.7 2.4 2.2 2.4 3.9h2c0-2.4-1.3-4.5-3.5-5.5z',
  arachnida: 'M12 2a4 4 0 0 0-4 4c0 1.25.58 2.37 1.48 3.1A6.98 6.98 0 0 0 6 15l-3-1v2l2.67.89c-.44 1.34-.67 2.76-.67 4.22h2c0-1.35.25-2.65.71-3.86L10 18.5V21h4v-2.5l2.29-1.25c.46 1.21.71 2.51.71 3.86h2c0-1.46-.23-2.88-.67-4.22L21 16v-2l-3 1a6.98 6.98 0 0 0-3.48-5.9A4.004 4.004 0 0 0 16 6a4 4 0 0 0-4-4zm0 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2z',
  mollusca: 'M12 3C7.03 3 3 7.03 3 12c0 3.87 2.45 7.17 5.9 8.44L8 22h8l-.9-1.56C18.55 19.17 21 15.87 21 12c0-4.97-4.03-9-9-9zm0 4c2.76 0 5 2.24 5 5 0 2.21-1.43 4.08-3.43 4.74l-.57-1.71C14.2 14.67 15 13.43 15 12c0-1.66-1.34-3-3-3s-3 1.34-3 3c0 1.43.8 2.67 2 3.03l-.57 1.71C8.43 16.08 7 14.21 7 12c0-2.76 2.24-5 5-5z',
  actinopterygii: 'M21 12c-4-4-9-6-15-5l-3-3v16l3-3c6 1 11-1 15-5zm-14.5.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
  chromista: 'M12 2C9.5 5 7 9 7 14c0 3 2.5 6 5 8 2.5-2 5-5 5-8 0-5-2.5-9-5-12zm0 16c-1.5-1.5-3-3.5-3-6 0-3 1.5-5.5 3-7.5 1.5 2 3 4.5 3 7.5 0 2.5-1.5 4.5-3 6z',
  protozoa: 'M12 4c-4.42 0-8 3.58-8 8 0 2.21.9 4.21 2.34 5.66L5 20h4l.8-1.2c.7.13 1.44.2 2.2.2 4.42 0 8-3.58 8-8s-3.58-8-8-8zm-2 6c.83 0 1.5.67 1.5 1.5S10.83 13 10 13s-1.5-.67-1.5-1.5S9.17 10 10 10zm4 4c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5z',
  animalia: 'M12 2a5 5 0 0 0-5 5c0 1.95 1.12 3.63 2.75 4.47C6.12 12.63 3 15.82 3 20h18c0-4.18-3.12-7.37-6.75-8.53C15.88 10.63 17 8.95 17 7a5 5 0 0 0-5-5zm0 2c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3z',
  unknown: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 16h-2v-2h2v2zm1.07-7.75l-.9.92C12.45 11.9 12 12.5 12 14h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z',

  // Most numerous orders (Arthropoda & specialized insects)
  lepidoptera: 'M12 10c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1s1-.45 1-1v-6c0-.55-.45-1-1-1zm-1.5-6.5C8 3 3 5 3 10c0 3.5 3 6 7 6.5V14c-2.5-.5-4.5-2-4.5-4 0-2.5 3-3.8 5-4.5V3.5zm3 0V5.5c2 .7 5 2 5 4.5 0 2-2 3.5-4.5 4v2.5c4-.5 7-3 7-6.5 0-5-5-7-7.5-6.5z',
  coleoptera: 'M12 3a4 4 0 0 0-4 4v1h8V7a4 4 0 0 0-4-4zm-5 7v7c0 2.76 2.24 5 5 5v-12H7zm10 0h-4v12c2.76 0 5-2.24 5-5v-7z',
  hymenoptera: 'M12 2c-1.1 0-2 .9-2 2 0 .4.1.7.3 1L7 6v2l2.5-.5L9 10H6v2h3.2l.8 3-2 1v2l3.5-1.5.5 3.5h2l.5-3.5 3.5 1.5v-2l-2-1 .8-3H20v-2h-3l-.5-2.5 2.5.5V6l-3.3-1c.2-.3.3-.6.3-1 0-1.1-.9-2-2-2z',
  odonata: 'M11 2h2v7h-2V2zm-9 6h7v2H2V8zm13 0h7v2h-7V8zm-8 4h6v10h-2v-8H9v-2zm-6 2h5v1.5H3V14zm13 0h5v1.5h-5V14z',
  diptera: 'M12 4c-1.66 0-3 1.34-3 3v2h6V7c0-1.66-1.34-3-3-3zm-6 7l2 1 1-1v7c0 1.66 1.34 3 3 3s3-1.34 3-3v-7l1 1 2-1-3-4H9l-3 4z',
  hemiptera: 'M12 3L6 7v6c0 4.5 3.5 8 6 8s6-3.5 6-8V7l-6-4zm0 3.2L16 9l-4 3-4-3 4-2.8zM8 11.5l3.5 2.6v4.6C9.6 17.5 8 15.3 8 13v-1.5zm8 0V13c0 2.3-1.6 4.5-3.5 5.7v-4.6L16 11.5z',
  araneae: 'M12 2a3.5 3.5 0 0 0-3.5 3.5c0 1.1.5 2.1 1.3 2.7A6.5 6.5 0 0 0 6 14.5l-3-1v2l2.5.8C5.2 17.5 5 18.7 5 20h2c0-1.2.2-2.3.6-3.3L10 18v3h4v-3l2.4-1.3c.4 1 .6 2.1.6 3.3h2c0-1.3-.2-2.5-.5-3.7L21 15.5v-2l-3 1A6.5 6.5 0 0 0 14.2 8.2c.8-.6 1.3-1.6 1.3-2.7A3.5 3.5 0 0 0 12 2z',

  // Dopamine Visuals: Star, Comment, Spark, Ring
  star: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
  comment: 'M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z',
  spark: 'M12 2L14 9L21 11L14 13L12 20L10 13L3 11L10 9Z'
};

// Map known order names to their SVG keys
const ORDER_MAP: Record<string, keyof typeof SVG_PATHS> = {
  lepidoptera: 'lepidoptera',
  coleoptera: 'coleoptera',
  hymenoptera: 'hymenoptera',
  odonata: 'odonata',
  diptera: 'diptera',
  hemiptera: 'hemiptera',
  araneae: 'araneae',
};

export function getTaxonVisuals(iconicName?: string, taxon?: InatTaxon): TaxonVisual {
  const normIconic = (iconicName || taxon?.iconic_taxon_name || '').toLowerCase();
  
  // Check if taxon rank is order or has order ancestors
  let orderKey: keyof typeof SVG_PATHS | undefined;
  if (taxon) {
    const taxonNameLower = (taxon.name || '').toLowerCase();
    if (ORDER_MAP[taxonNameLower]) {
      orderKey = ORDER_MAP[taxonNameLower];
    }
  }

  // Determine iconic taxon color and default path
  switch (normIconic) {
    case 'plantae':
      return {
        key: 'plantae',
        label: 'Rostliny',
        color: INAT_COLORS.green,
        svgPath: SVG_PATHS.plantae
      };

    case 'insecta':
      return {
        key: orderKey || 'insecta',
        label: 'Hmyz',
        color: INAT_COLORS.orange,
        svgPath: orderKey ? SVG_PATHS[orderKey] : SVG_PATHS.insecta
      };

    case 'arachnida':
      return {
        key: orderKey || 'arachnida',
        label: 'Pavoukovci',
        color: INAT_COLORS.orange,
        svgPath: orderKey ? SVG_PATHS[orderKey] : SVG_PATHS.arachnida
      };

    case 'mollusca':
      return {
        key: 'mollusca',
        label: 'Měkkýši',
        color: INAT_COLORS.orange,
        svgPath: SVG_PATHS.mollusca
      };

    case 'aves':
      return {
        key: 'aves',
        label: 'Ptáci',
        color: INAT_COLORS.blue,
        svgPath: SVG_PATHS.aves
      };

    case 'mammalia':
      return {
        key: 'mammalia',
        label: 'Savci',
        color: INAT_COLORS.blue,
        svgPath: SVG_PATHS.mammalia
      };

    case 'reptilia':
      return {
        key: 'reptilia',
        label: 'Plazi',
        color: INAT_COLORS.blue,
        svgPath: SVG_PATHS.reptilia
      };

    case 'amphibia':
      return {
        key: 'amphibia',
        label: 'Obojživelníci',
        color: INAT_COLORS.blue,
        svgPath: SVG_PATHS.amphibia
      };

    case 'actinopterygii':
      return {
        key: 'actinopterygii',
        label: 'Paprskoploutví',
        color: INAT_COLORS.blue,
        svgPath: SVG_PATHS.actinopterygii
      };

    case 'animalia':
      return {
        key: 'animalia',
        label: 'Ostatní živočichové',
        color: INAT_COLORS.blue,
        svgPath: SVG_PATHS.animalia
      };

    case 'fungi':
      return {
        key: 'fungi',
        label: 'Houby',
        color: INAT_COLORS.pink,
        svgPath: SVG_PATHS.fungi
      };

    case 'chromista':
      return {
        key: 'chromista',
        label: 'Chromista',
        color: INAT_COLORS.brown,
        svgPath: SVG_PATHS.chromista
      };

    case 'protozoa':
      return {
        key: 'protozoa',
        label: 'Prvoci',
        color: INAT_COLORS.purple,
        svgPath: SVG_PATHS.protozoa
      };

    default:
      return {
        key: 'unknown',
        label: 'Neznámý taxon',
        color: INAT_COLORS.gray,
        svgPath: SVG_PATHS.unknown
      };
  }
}

