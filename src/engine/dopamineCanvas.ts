import { TimelineData, ObsEvent } from '../types/timeline';
import { PreloadedSprites } from './spriteAtlas';

export interface DopamineRenderOptions {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  timeline: TimelineData;
  t: number;
  project: (coord: [number, number]) => { x: number; y: number };
  sprites?: PreloadedSprites;
}

export function renderDopamineFrame(options: DopamineRenderOptions) {
  const { ctx, width, height, timeline, t, project, sprites } = options;

  ctx.clearRect(0, 0, width, height);

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

  // 2. Draw static dots & expanding shockwaves
  for (let i = 0; i < pastEvents.length; i++) {
    const ev = pastEvents[i];
    const pt = project(ev.coordinates);

    // Skip if offscreen
    if (pt.x < -40 || pt.x > width + 40 || pt.y < -40 || pt.y > height + 40) {
      continue;
    }

    const age = t - ev.t;

    // Expanding shockwave ring (first 0.8s)
    if (age >= 0 && age < 0.8) {
      const progress = age / 0.8;
      const ringRadius = 4 + progress * 28;
      const ringOpacity = (1 - progress) * 0.85;

      ctx.save();
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = ev.color;
      ctx.globalAlpha = ringOpacity;
      ctx.lineWidth = 2.0;
      ctx.stroke();
      ctx.restore();
    }

    // Dot on map
    ctx.save();
    const isNew = age < 0.3;
    const baseRadius = ev.isHighlight ? 6.5 : 4.0;
    const scale = isNew ? 1.0 + (0.3 - age) * 2.5 : 1.0;
    const radius = baseRadius * scale;

    // Outer glow
    ctx.shadowColor = ev.color;
    ctx.shadowBlur = ev.isHighlight ? 14 : 8;

    ctx.beginPath();
    ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = ev.color;
    ctx.fill();

    // White core center for high dopamine shine
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, Math.max(1, radius * 0.4), 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.restore();

    // 3. Flying SVG taxon icon (first 0.85s)
    if (sprites && age >= 0 && age < 0.85) {
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
        ctx.shadowColor = ev.color;
        ctx.shadowBlur = 6;
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
      ctx.shadowColor = '#ffb300';
      ctx.shadowBlur = 8;
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
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 8;
      ctx.drawImage(sprites.comment, bubbleX - bubbleSize / 2, bubbleY - bubbleSize / 2, bubbleSize, bubbleSize);
      ctx.restore();
    }
  }

  // 6. Highlight card popup overlay
  if (activeHighlight) {
    drawHighlightCard(ctx, width, height, activeHighlight, activeHighlightProgress, sprites);
  }
}

function drawHighlightCard(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  event: ObsEvent,
  progress: number,
  sprites?: PreloadedSprites
) {
  // Entrance and exit fade/slide
  let slideY = 0;
  let opacity = 1;
  if (progress < 0.15) {
    const p = progress / 0.15;
    slideY = (1 - p) * 30;
    opacity = p;
  } else if (progress > 0.85) {
    const p = (progress - 0.85) / 0.15;
    slideY = p * 20;
    opacity = 1 - p;
  }

  const cardW = Math.min(360, width - 40);
  const cardH = 110;
  const cardX = (width - cardW) / 2;
  const cardY = height - cardH - 50 + slideY;

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, opacity));

  // Frosted dark background
  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1.5;

  roundRect(ctx, cardX, cardY, cardW, cardH, 14);
  ctx.fill();
  ctx.stroke();

  // Photo thumbnail on the left
  const photoSize = 86;
  const photoX = cardX + 12;
  const photoY = cardY + 12;

  const photoImg = sprites?.photos.get(event.id);
  if (photoImg) {
    ctx.save();
    roundRect(ctx, photoX, photoY, photoSize, photoSize, 10);
    ctx.clip();
    ctx.drawImage(photoImg, photoX, photoY, photoSize, photoSize);
    ctx.restore();
  } else {
    // Fallback colored taxon box
    ctx.save();
    ctx.fillStyle = event.color;
    roundRect(ctx, photoX, photoY, photoSize, photoSize, 10);
    ctx.fill();
    ctx.restore();
  }

  // Text details on the right
  const textX = photoX + photoSize + 14;
  const textMaxW = cardW - (photoSize + 36);

  // Common name
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const commonName = event.observation.taxon?.preferred_common_name || event.observation.taxon?.name || 'Pozorování';
  ctx.fillText(truncateText(ctx, commonName, textMaxW), textX, cardY + 30);

  // Scientific name in ITALICS (taxonomic rule!)
  if (event.observation.taxon?.name) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'italic 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(truncateText(ctx, event.observation.taxon.name, textMaxW), textX, cardY + 48);
  }

  // Date and place
  ctx.fillStyle = '#64748b';
  ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const dateStr = event.observation.observed_on || '';
  const placeStr = event.observation.place_guess ? ` · ${event.observation.place_guess}` : '';
  ctx.fillText(truncateText(ctx, `${dateStr}${placeStr}`, textMaxW), textX, cardY + 68);

  // Badges: faves & comments with clean SVG sprites
  let badgeX = textX;
  if (sprites && event.favesCount > 0) {
    ctx.drawImage(sprites.star, badgeX, cardY + 80, 14, 14);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(`${event.favesCount}`, badgeX + 18, cardY + 91);
    badgeX += 45;
  }

  if (sprites && event.commentsCount > 0) {
    ctx.drawImage(sprites.comment, badgeX, cardY + 80, 14, 14);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(`${event.commentsCount}`, badgeX + 18, cardY + 91);
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

