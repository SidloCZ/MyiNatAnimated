import { TimelineData, ObsEvent } from '../types/timeline';
import { PreloadedSprites } from './spriteAtlas';
import { getPlaybackStatsAtTime } from './timelineBuilder';
import { Language, formatLocalizedDate, translations } from '../i18n/translations';

export interface DopamineRenderOptions {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  timeline: TimelineData;
  t: number;
  project: (coord: [number, number]) => { x: number; y: number };
  sprites?: PreloadedSprites;
  isExport?: boolean;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  uiScale?: number;
  locale?: Language;
}

export function renderDopamineFrame(options: DopamineRenderOptions) {
  const { ctx, width, height, timeline, t, project, sprites, isExport } = options;

  if (!isExport) {
    ctx.clearRect(0, 0, width, height);
  }

  const pastEvents: ObsEvent[] = [];
  let activeHighlight: ObsEvent | null = null;
  let activeHighlightProgress = 0;

  for (const ev of timeline.events) {
    if (ev.t <= t) {
      pastEvents.push(ev);

      if (ev.isHighlight && t >= ev.t && t <= ev.t + 2.0) {
        activeHighlight = ev;
        activeHighlightProgress = (t - ev.t) / 2.0;
      }
    }
  }

  // 1. Draw glowing trajectory trail between recent points
  if (pastEvents.length > 1) {
    const trailWindow = Math.min(pastEvents.length, 30);
    const startIdx = pastEvents.length - trailWindow;

    ctx.save();
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = startIdx; i < pastEvents.length - 1; i++) {
      const p1 = project(pastEvents[i].coordinates);
      const p2 = project(pastEvents[i + 1].coordinates);

      const ageRatio = (i - startIdx) / trailWindow; // 0 to 1
      ctx.strokeStyle = `rgba(255, 255, 255, ${ageRatio * 0.45})`;

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 2. Draw clean observation markers (without neon glow or shockwaves)
  for (let i = 0; i < pastEvents.length; i++) {
    const ev = pastEvents[i];
    const pt = project(ev.coordinates);

    // Skip if offscreen
    if (pt.x < -40 || pt.x > width + 40 || pt.y < -40 || pt.y > height + 40) {
      continue;
    }

    const age = t - ev.t;

    // Dot on map - clean, crisp cartographic marker
    ctx.save();
    const isNew = age < 0.25;
    const baseRadius = ev.isHighlight ? 5.5 : 4.0;
    const radius = isNew ? baseRadius * 1.25 : baseRadius;

    ctx.beginPath();
    ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = ev.color;
    ctx.fill();

    // Crisp white outline
    ctx.lineWidth = ev.isHighlight ? 2.0 : 1.2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.restore();

    // 3. Flying SVG taxon icon (first 0.85s, throttled to avoid clutter)
    if (sprites && ev.shouldFlyIcon !== false && age >= 0 && age < 0.85) {
      const progress = age / 0.85;
      const direction = (ev.id % 2 === 0 ? 1 : -1);
      const iconX = pt.x + direction * (progress * 42);
      const iconY = pt.y - Math.sin(progress * Math.PI) * 32 - progress * 15;
      const iconOpacity = 1 - Math.pow(progress, 1.8);
      const iconSize = 24 * (0.6 + 0.4 * Math.sin(progress * Math.PI * 0.8));

      const taxonCanvas = sprites.taxa.get(ev.iconicTaxon.toLowerCase()) || sprites.taxa.get('unknown');
      if (taxonCanvas) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, iconOpacity);
        ctx.drawImage(taxonCanvas, iconX - iconSize / 2, iconY - iconSize / 2, iconSize, iconSize);
        ctx.restore();
      }
    }

    // 4. Flying SVG star for likes (from 0.08s to 0.95s)
    if (sprites && ev.favesCount > 0 && age >= 0.08 && age < 0.95) {
      const progress = (age - 0.08) / 0.87;
      const starX = pt.x + 16 + progress * 24;
      const starY = pt.y - progress * 42;
      const starOpacity = 1 - progress;
      const starSize = 20 * (1 - progress * 0.3);

      ctx.save();
      ctx.globalAlpha = Math.max(0, starOpacity);
      ctx.drawImage(sprites.star, starX - starSize / 2, starY - starSize / 2, starSize, starSize);
      ctx.restore();
    }

    // 5. Flying SVG comment bubble (from 0.12s to 0.98s)
    if (sprites && ev.commentsCount > 0 && age >= 0.12 && age < 0.98) {
      const progress = (age - 0.12) / 0.86;
      const bubbleX = pt.x - 16 - progress * 24;
      const bubbleY = pt.y - progress * 38;
      const bubbleOpacity = 1 - progress;
      const bubbleSize = 20 * (1 - progress * 0.3);

      ctx.save();
      ctx.globalAlpha = Math.max(0, bubbleOpacity);
      ctx.drawImage(sprites.comment, bubbleX - bubbleSize / 2, bubbleY - bubbleSize / 2, bubbleSize, bubbleSize);
      ctx.restore();
    }
  }

  // Calculate adaptive UI scale and margins based on export aspect ratio
  let uiScale = options.uiScale || 1.0;
  let topMargin = 24;
  let bottomMargin = 50;

  if (options.isExport) {
    if (options.aspectRatio === '9:16') {
      uiScale = options.uiScale || 3.0; // 3x for vertical videos (Reels/TikTok)
      topMargin = 110;                   // Keep distance from top status bar
      bottomMargin = 200;                // Keep distance from bottom caption / action buttons
    } else if (options.aspectRatio === '1:1') {
      uiScale = options.uiScale || 2.0; // 2x for square posts
      topMargin = 44;
      bottomMargin = 76;
    } else {
      uiScale = options.uiScale || 2.0; // 2x for standard 16:9 videos
      topMargin = 36;
      bottomMargin = 64;
    }
  }

  const locale = options.locale || 'en';

  // 6. Highlight card popup overlay
  if (activeHighlight) {
    drawHighlightCard(
      ctx,
      width,
      height,
      activeHighlight,
      activeHighlightProgress,
      sprites,
      uiScale,
      bottomMargin,
      locale
    );
  }

  // 7. Embedded HUD on export (date ticker and dynamic observation/species counters)
  if (options.isExport) {
    const stats = getPlaybackStatsAtTime(timeline.events, t);
    drawExportHud(
      ctx,
      width,
      height,
      stats.dateStr,
      stats.obsCount,
      timeline.stats.totalObservations,
      stats.speciesCount,
      uiScale,
      topMargin,
      locale
    );
  }
}

function drawExportHud(
  ctx: CanvasRenderingContext2D,
  width: number,
  _height: number,
  dateStr: string,
  obsCount: number,
  totalObs: number,
  speciesCount: number,
  uiScale = 1.0,
  padY = 24,
  locale: Language = 'en'
) {
  const padX = 24 * (uiScale >= 2.5 ? 1.4 : 1.0);
  const formattedDate = formatLocalizedDate(dateStr, locale);

  ctx.save();
  const hudW = Math.min(320 * uiScale, width - padX * 2);
  const hudH = 58 * uiScale;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1.5 * uiScale;

  roundRect(ctx, padX, padY, hudW, hudH, 12 * uiScale);
  ctx.fill();
  ctx.stroke();

  // Date
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(16 * uiScale)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.fillText(formattedDate || 'iNaturalist', padX + 16 * uiScale, padY + 25 * uiScale);

  // Live counters below
  ctx.fillStyle = '#94a3b8';
  ctx.font = `${Math.round(12 * uiScale)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  const obsLabel = translations[locale].hudObsLabel;
  ctx.fillText(obsLabel, padX + 16 * uiScale, padY + 45 * uiScale);

  const obsLabelWidth = ctx.measureText(obsLabel).width;
  ctx.fillStyle = '#74ac00';
  ctx.font = `bold ${Math.round(12 * uiScale)}px monospace`;
  const obsText = `${obsCount} / ${totalObs}`;
  ctx.fillText(obsText, padX + 16 * uiScale + obsLabelWidth + 6 * uiScale, padY + 45 * uiScale);

  const obsTextWidth = ctx.measureText(obsText).width;
  const speciesX = padX + 16 * uiScale + obsLabelWidth + obsTextWidth + 14 * uiScale;

  ctx.fillStyle = '#94a3b8';
  ctx.font = `${Math.round(12 * uiScale)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  const speciesLabel = translations[locale].hudSpeciesLabel;
  ctx.fillText(speciesLabel, speciesX, padY + 45 * uiScale);

  const speciesLabelWidth = ctx.measureText(speciesLabel).width;
  ctx.fillStyle = '#22d3ee';
  ctx.font = `bold ${Math.round(12 * uiScale)}px monospace`;
  ctx.fillText(`${speciesCount}`, speciesX + speciesLabelWidth + 5 * uiScale, padY + 45 * uiScale);

  ctx.restore();
}

function drawHighlightCard(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  event: ObsEvent,
  progress: number,
  sprites?: PreloadedSprites,
  uiScale = 1.0,
  bottomMargin = 50,
  locale: Language = 'en'
) {
  // Entrance and exit fade/slide
  let slideY = 0;
  let opacity = 1;
  if (progress < 0.15) {
    const p = progress / 0.15;
    slideY = (1 - p) * 30 * uiScale;
    opacity = p;
  } else if (progress > 0.85) {
    const p = (progress - 0.85) / 0.15;
    slideY = p * 20 * uiScale;
    opacity = 1 - p;
  }

  const cardW = Math.min(370 * uiScale, width - 40);
  const cardH = 115 * uiScale;
  const cardX = (width - cardW) / 2;
  const cardY = height - cardH - bottomMargin + slideY;

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, opacity));

  // Frosted dark background
  ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 1.5 * uiScale;

  roundRect(ctx, cardX, cardY, cardW, cardH, 14 * uiScale);
  ctx.fill();
  ctx.stroke();

  // Photo thumbnail on the left
  const photoSize = 90 * uiScale;
  const photoX = cardX + 12 * uiScale;
  const photoY = cardY + 12 * uiScale;

  const photoImg = sprites?.photos.get(event.id);
  const hasPhoto = !!photoImg && (photoImg.naturalWidth > 0 || photoImg.width > 0);

  if (hasPhoto && photoImg) {
    ctx.save();
    roundRect(ctx, photoX, photoY, photoSize, photoSize, 10 * uiScale);
    ctx.clip();
    drawImageCover(ctx, photoImg, photoX, photoY, photoSize, photoSize);
    ctx.restore();
  } else {
    // Fallback colored taxon box
    ctx.save();
    ctx.fillStyle = event.color;
    roundRect(ctx, photoX, photoY, photoSize, photoSize, 10 * uiScale);
    ctx.fill();
    ctx.restore();
  }

  // Text details on the right
  const textX = photoX + photoSize + 14 * uiScale;
  const textMaxW = cardW - (photoSize + 36 * uiScale);

  // Common name
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(15 * uiScale)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  const commonName = event.observation.taxon?.preferred_common_name || event.observation.taxon?.name || translations[locale].fallbackObservation;
  ctx.fillText(truncateText(ctx, commonName, textMaxW), textX, cardY + 28 * uiScale);

  // Scientific name in ITALICS (taxonomic rule!)
  if (event.observation.taxon?.name) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = `italic ${Math.round(13 * uiScale)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillText(truncateText(ctx, event.observation.taxon.name, textMaxW), textX, cardY + 48 * uiScale);
  }

  // Date and place
  ctx.fillStyle = '#64748b';
  ctx.font = `${Math.round(11 * uiScale)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  const dateStr = formatLocalizedDate(event.observation.observed_on || '', locale);
  const placeStr = event.observation.place_guess ? ` · ${event.observation.place_guess}` : '';
  ctx.fillText(truncateText(ctx, `${dateStr}${placeStr}`, textMaxW), textX, cardY + 68 * uiScale);

  // Badges: faves & comments with clean SVG sprites
  let badgeX = textX;
  const iconSize = 14 * uiScale;
  if (sprites && event.favesCount > 0) {
    ctx.drawImage(sprites.star, badgeX, cardY + 82 * uiScale, iconSize, iconSize);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = `bold ${Math.round(11 * uiScale)}px sans-serif`;
    ctx.fillText(`${event.favesCount}`, badgeX + 18 * uiScale, cardY + 93 * uiScale);
    badgeX += 45 * uiScale;
  }

  if (sprites && event.commentsCount > 0) {
    ctx.drawImage(sprites.comment, badgeX, cardY + 82 * uiScale, iconSize, iconSize);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = `bold ${Math.round(11 * uiScale)}px sans-serif`;
    ctx.fillText(`${event.commentsCount}`, badgeX + 18 * uiScale, cardY + 93 * uiScale);
  }

  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 1 && ctx.measureText(truncated + '…').width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '…';
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const imgW = img.naturalWidth || img.width;
  const imgH = img.naturalHeight || img.height;
  if (!imgW || !imgH) {
    ctx.drawImage(img, x, y, w, h);
    return;
  }
  const imgRatio = imgW / imgH;
  const targetRatio = w / h;

  let sx = 0;
  let sy = 0;
  let sw = imgW;
  let sh = imgH;

  if (imgRatio > targetRatio) {
    sw = imgH * targetRatio;
    sx = (imgW - sw) / 2;
  } else {
    sh = imgW / targetRatio;
    sy = (imgH - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

