import { GameState, Worm, Candy, MapZone } from './types';
import { GAME_CONFIG, ZONE_CONFIG } from './constants';
import { getWormRadius } from './utils';

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private time: number = 0;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
  }

  updateSize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  render(state: GameState) {
    this.time += 0.02;
    this.ctx.fillStyle = '#0a0a12';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.drawGrid(state.camera);
    this.drawMapZones(state.mapZones, state.camera);
    this.drawBoundary(state.camera);
    this.drawCandies(state.candies, state.camera);
    this.drawWorms(state.worms, state.camera);
    this.drawNames(state.worms, state.camera);
    this.drawMinimap(state);
    this.drawLeaderboard(state);
    this.drawUI(state);
    this.drawAbilityBar(state);
  }

  private drawGrid(camera: { x: number; y: number }) {
    const gridSize = 60;
    const offsetX = -camera.x % gridSize;
    const offsetY = -camera.y % gridSize;

    this.ctx.strokeStyle = 'rgba(40, 40, 60, 0.5)';
    this.ctx.lineWidth = 1;

    for (let x = offsetX; x < this.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.height);
      this.ctx.stroke();
    }

    for (let y = offsetY; y < this.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }
  }

  private drawMapZones(zones: MapZone[], camera: { x: number; y: number }) {
    zones.forEach(zone => {
      const sx = zone.x - camera.x;
      const sy = zone.y - camera.y;

      // Cull offscreen
      if (sx < -zone.radius * 2 || sx > this.width + zone.radius * 2 ||
          sy < -zone.radius * 2 || sy > this.height + zone.radius * 2) return;

      const pulse = Math.sin(this.time * 2 + zone.pulsePhase) * 0.15 + 0.85;
      const r = zone.radius * pulse;

      const config = ZONE_CONFIG[zone.type];
      const color = config.color;

      this.ctx.save();

      if (zone.type === 'blackhole') {
        // Swirling black hole
        const grad = this.ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
        grad.addColorStop(0, 'rgba(0,0,0,0.9)');
        grad.addColorStop(0.5, color + '40');
        grad.addColorStop(0.8, color + '15');
        grad.addColorStop(1, 'transparent');
        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.arc(sx, sy, r, 0, Math.PI * 2);
        this.ctx.fill();

        // Spiral lines
        this.ctx.strokeStyle = color + '60';
        this.ctx.lineWidth = 2;
        for (let arm = 0; arm < 3; arm++) {
          this.ctx.beginPath();
          for (let t = 0; t < Math.PI * 4; t += 0.1) {
            const spiralR = (t / (Math.PI * 4)) * r * 0.9;
            const angle = t + this.time * 3 + arm * (Math.PI * 2 / 3);
            const px = sx + Math.cos(angle) * spiralR;
            const py = sy + Math.sin(angle) * spiralR;
            if (t === 0) this.ctx.moveTo(px, py);
            else this.ctx.lineTo(px, py);
          }
          this.ctx.stroke();
        }

        // Center glow
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = 20;
        this.ctx.beginPath();
        this.ctx.arc(sx, sy, 8, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();
        this.ctx.shadowBlur = 0;

      } else if (zone.type === 'portal') {
        // Rotating ring
        const grad = this.ctx.createRadialGradient(sx, sy, r * 0.3, sx, sy, r);
        grad.addColorStop(0, color + '50');
        grad.addColorStop(0.6, color + '20');
        grad.addColorStop(1, 'transparent');
        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.arc(sx, sy, r, 0, Math.PI * 2);
        this.ctx.fill();

        // Ring
        this.ctx.strokeStyle = color + 'AA';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([8, 6]);
        this.ctx.beginPath();
        this.ctx.arc(sx, sy, r * 0.7, this.time * 2, this.time * 2 + Math.PI * 1.5);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Icon
        this.ctx.font = `${r * 0.5}px sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = color;
        this.ctx.fillText('🌀', sx, sy);

      } else if (zone.type === 'toxic') {
        const grad = this.ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
        grad.addColorStop(0, color + '30');
        grad.addColorStop(0.7, color + '15');
        grad.addColorStop(1, 'transparent');
        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.arc(sx, sy, r, 0, Math.PI * 2);
        this.ctx.fill();

        // Bubbles
        for (let b = 0; b < 5; b++) {
          const bAngle = this.time * 1.5 + b * 1.3;
          const bDist = (Math.sin(this.time + b) * 0.3 + 0.5) * r;
          const bx = sx + Math.cos(bAngle) * bDist;
          const by = sy + Math.sin(bAngle) * bDist;
          this.ctx.beginPath();
          this.ctx.arc(bx, by, 4 + Math.sin(this.time + b) * 2, 0, Math.PI * 2);
          this.ctx.fillStyle = color + '50';
          this.ctx.fill();
        }

        // Icon
        this.ctx.font = `${r * 0.3}px sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = color + 'AA';
        this.ctx.fillText('☠️', sx, sy);

      } else {
        // Speed / Mass zone - simple glow ring
        const grad = this.ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
        grad.addColorStop(0, color + '20');
        grad.addColorStop(0.6, color + '10');
        grad.addColorStop(1, 'transparent');
        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.arc(sx, sy, r, 0, Math.PI * 2);
        this.ctx.fill();

        // Border ring
        this.ctx.strokeStyle = color + '60';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.arc(sx, sy, r, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Icon
        const icon = zone.type === 'speed' ? '⚡' : '💪';
        this.ctx.font = `${r * 0.35}px sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = color;
        this.ctx.fillText(icon, sx, sy);
      }

      this.ctx.restore();
    });
  }

  private drawBoundary(camera: { x: number; y: number }) {
    const boundaryX = -camera.x;
    const boundaryY = -camera.y;

    this.ctx.strokeStyle = '#ff3366';
    this.ctx.lineWidth = 8;
    this.ctx.shadowColor = '#ff3366';
    this.ctx.shadowBlur = 30;
    this.ctx.strokeRect(boundaryX, boundaryY, GAME_CONFIG.MAP_SIZE, GAME_CONFIG.MAP_SIZE);
    this.ctx.shadowBlur = 0;
  }

  private drawCandies(candies: Candy[], camera: { x: number; y: number }) {
    candies.forEach((candy, index) => {
      const screenX = candy.x - camera.x;
      const screenY = candy.y - camera.y;

      if (screenX < -50 || screenX > this.width + 50 ||
          screenY < -50 || screenY > this.height + 50) return;

      const bounce = Math.sin(this.time * 3 + index) * 2;
      const rotation = this.time + index * 0.5;

      this.ctx.save();
      this.ctx.translate(screenX, screenY + bounce);

      const candyType = index % 4;
      if (candyType === 0) this.drawWrappedCandy(candy.size, candy.color, rotation);
      else if (candyType === 1) this.drawLollipop(candy.size, candy.color, rotation);
      else if (candyType === 2) this.drawStarCandy(candy.size, candy.color, rotation);
      else this.drawSwirlCandy(candy.size, candy.color, rotation);

      this.ctx.restore();
    });
  }

  private drawWrappedCandy(size: number, color: string, rotation: number) {
    this.ctx.rotate(rotation * 0.3);
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 15;

    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.moveTo(-size * 1.8, 0);
    this.ctx.lineTo(-size * 1.2, -size * 0.4);
    this.ctx.lineTo(-size * 1.2, size * 0.4);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.moveTo(size * 1.8, 0);
    this.ctx.lineTo(size * 1.2, -size * 0.4);
    this.ctx.lineTo(size * 1.2, size * 0.4);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, size * 1.2, size * 0.7, 0, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, size * 0.4, size * 0.7, 0, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.ellipse(-size * 0.4, -size * 0.2, size * 0.3, size * 0.15, -0.3, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.fill();

    this.ctx.shadowBlur = 0;
  }

  private drawLollipop(size: number, color: string, rotation: number) {
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 12;

    this.ctx.strokeStyle = '#e8dcc8';
    this.ctx.lineWidth = size * 0.25;
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(0, size * 0.5);
    this.ctx.lineTo(0, size * 2);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.arc(0, 0, size, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.lineWidth = size * 0.2;
    this.ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const angle = rotation + i * Math.PI * 0.7;
      const r = size * (0.3 + i * 0.2);
      this.ctx.arc(0, 0, r, angle, angle + Math.PI * 0.5);
    }
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.arc(-size * 0.3, -size * 0.3, size * 0.25, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.fill();

    this.ctx.shadowBlur = 0;
  }

  private drawStarCandy(size: number, color: string, rotation: number) {
    this.ctx.rotate(rotation * 0.5);
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 15;

    this.ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
      const outerX = Math.cos(angle) * size * 1.3;
      const outerY = Math.sin(angle) * size * 1.3;
      const innerAngle = angle + Math.PI / 5;
      const innerX = Math.cos(innerAngle) * size * 0.5;
      const innerY = Math.sin(innerAngle) * size * 0.5;
      if (i === 0) this.ctx.moveTo(outerX, outerY);
      else this.ctx.lineTo(outerX, outerY);
      this.ctx.lineTo(innerX, innerY);
    }
    this.ctx.closePath();
    this.ctx.fillStyle = color;
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.arc(-size * 0.2, -size * 0.3, size * 0.15, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.fill();

    this.ctx.shadowBlur = 0;
  }

  private drawSwirlCandy(size: number, color: string, rotation: number) {
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 15;

    this.ctx.beginPath();
    this.ctx.arc(0, 0, size, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    this.ctx.fill();

    this.ctx.save();
    this.ctx.rotate(rotation);
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.lineWidth = size * 0.3;
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();
    for (let a = 0; a < Math.PI * 1.5; a += 0.1) {
      const r = (a / (Math.PI * 1.5)) * size * 0.8;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (a === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }
    this.ctx.stroke();
    this.ctx.restore();

    this.ctx.beginPath();
    this.ctx.arc(-size * 0.3, -size * 0.3, size * 0.2, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.fill();

    this.ctx.shadowBlur = 0;
  }

  private drawWorms(worms: Worm[], camera: { x: number; y: number }) {
    const sortedWorms = [...worms].sort((a, b) => (a.isPlayer ? 1 : 0) - (b.isPlayer ? 1 : 0));
    sortedWorms.forEach(worm => this.drawWorm(worm, camera));
  }

  private drawWorm(worm: Worm, camera: { x: number; y: number }) {
    if (worm.segments.length === 0) return;

    // Invisible worms: very faint for non-player
    const isInvis = worm.isInvisible && !worm.isPlayer;
    if (isInvis) this.ctx.globalAlpha = 0.08;
    else if (worm.isInvisible && worm.isPlayer) this.ctx.globalAlpha = 0.35;

    // Ghost visual
    if (worm.isGhost) this.ctx.globalAlpha = Math.min(this.ctx.globalAlpha, 0.4);

    const baseRadius = getWormRadius(worm);

    for (let i = worm.segments.length - 1; i >= 0; i--) {
      const segment = worm.segments[i];
      const screenX = segment.x - camera.x;
      const screenY = segment.y - camera.y;

      if (screenX < -100 || screenX > this.width + 100 ||
          screenY < -100 || screenY > this.height + 100) continue;

      const t = 1 - i / worm.segments.length;
      const segmentRadius = baseRadius * (0.4 + t * 0.6);

      this.ctx.shadowColor = worm.isGhost ? '#00ffff80' : worm.glowColor;
      this.ctx.shadowBlur = worm.isPlayer ? 20 : 12;

      const gradient = this.ctx.createRadialGradient(
        screenX - segmentRadius * 0.3, screenY - segmentRadius * 0.3, 0,
        screenX, screenY, segmentRadius
      );
      gradient.addColorStop(0, this.lightenColor(worm.color, 40));
      gradient.addColorStop(0.5, worm.color);
      gradient.addColorStop(1, this.darkenColor(worm.color, 30));

      this.ctx.beginPath();
      this.ctx.arc(screenX, screenY, segmentRadius, 0, Math.PI * 2);
      this.ctx.fillStyle = gradient;
      this.ctx.fill();

      if (i % 2 === 0) {
        this.ctx.beginPath();
        this.ctx.ellipse(screenX - segmentRadius * 0.3, screenY - segmentRadius * 0.3,
          segmentRadius * 0.4, segmentRadius * 0.25, -Math.PI / 4, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        this.ctx.fill();
      }

      if (i % 4 === 0 && i > 0) {
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY, segmentRadius * 0.25, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.fill();
      }

      this.ctx.shadowBlur = 0;
    }

    // Shield ring
    if (worm.hasShield) {
      const head = worm.segments[0];
      const hx = head.x - camera.x;
      const hy = head.y - camera.y;
      this.ctx.beginPath();
      this.ctx.arc(hx, hy, baseRadius + 20, 0, Math.PI * 2);
      this.ctx.strokeStyle = '#00e5ff';
      this.ctx.lineWidth = 3;
      this.ctx.shadowColor = '#00e5ff';
      this.ctx.shadowBlur = 25;
      this.ctx.stroke();
      this.ctx.shadowBlur = 0;

      // Electric arcs
      for (let a = 0; a < 6; a++) {
        const angle = this.time * 5 + a * Math.PI / 3;
        const r1 = baseRadius + 18;
        const r2 = baseRadius + 30 + Math.sin(this.time * 10 + a) * 8;
        this.ctx.beginPath();
        this.ctx.moveTo(hx + Math.cos(angle) * r1, hy + Math.sin(angle) * r1);
        this.ctx.lineTo(hx + Math.cos(angle + 0.15) * r2, hy + Math.sin(angle + 0.15) * r2);
        this.ctx.strokeStyle = '#00e5ffAA';
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();
      }
    }

    const head = worm.segments[0];
    const screenX = head.x - camera.x;
    const screenY = head.y - camera.y;

    if (screenX >= -100 && screenX <= this.width + 100 &&
        screenY >= -100 && screenY <= this.height + 100) {
      this.drawFace(screenX, screenY, baseRadius, worm.angle, worm.isBoosting, worm.color);
    }

    // Reset alpha
    this.ctx.globalAlpha = 1;
  }

  private lightenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, (num >> 16) + percent);
    const g = Math.min(255, ((num >> 8) & 0x00FF) + percent);
    const b = Math.min(255, (num & 0x0000FF) + percent);
    return `rgb(${r}, ${g}, ${b})`;
  }

  private darkenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) - percent);
    const g = Math.max(0, ((num >> 8) & 0x00FF) - percent);
    const b = Math.max(0, (num & 0x0000FF) - percent);
    return `rgb(${r}, ${g}, ${b})`;
  }

  private drawFace(x: number, y: number, radius: number, angle: number, isBoosting: boolean, color: string) {
    const eyeOffset = radius * 0.35;
    const eyeRadius = radius * 0.28;
    const pupilRadius = radius * 0.14;

    const perpAngle = angle + Math.PI / 2;
    const forwardOffset = radius * 0.2;

    const leftEyeX = x + Math.cos(angle) * forwardOffset + Math.cos(perpAngle) * eyeOffset;
    const leftEyeY = y + Math.sin(angle) * forwardOffset + Math.sin(perpAngle) * eyeOffset;
    const rightEyeX = x + Math.cos(angle) * forwardOffset - Math.cos(perpAngle) * eyeOffset;
    const rightEyeY = y + Math.sin(angle) * forwardOffset - Math.sin(perpAngle) * eyeOffset;

    const eyeGradient = this.ctx.createRadialGradient(
      leftEyeX - eyeRadius * 0.2, leftEyeY - eyeRadius * 0.2, 0,
      leftEyeX, leftEyeY, eyeRadius);
    eyeGradient.addColorStop(0, '#ffffff');
    eyeGradient.addColorStop(1, '#e8e8e8');

    this.ctx.beginPath();
    this.ctx.arc(leftEyeX, leftEyeY + 1, eyeRadius, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(rightEyeX, rightEyeY + 1, eyeRadius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.arc(leftEyeX, leftEyeY, eyeRadius, 0, Math.PI * 2);
    this.ctx.fillStyle = eyeGradient;
    this.ctx.fill();

    const eyeGradient2 = this.ctx.createRadialGradient(
      rightEyeX - eyeRadius * 0.2, rightEyeY - eyeRadius * 0.2, 0,
      rightEyeX, rightEyeY, eyeRadius);
    eyeGradient2.addColorStop(0, '#ffffff');
    eyeGradient2.addColorStop(1, '#e8e8e8');

    this.ctx.beginPath();
    this.ctx.arc(rightEyeX, rightEyeY, eyeRadius, 0, Math.PI * 2);
    this.ctx.fillStyle = eyeGradient2;
    this.ctx.fill();

    const pupilOffsetX = Math.cos(angle) * pupilRadius * 0.5;
    const pupilOffsetY = Math.sin(angle) * pupilRadius * 0.5;

    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.beginPath();
    this.ctx.arc(leftEyeX + pupilOffsetX, leftEyeY + pupilOffsetY, pupilRadius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(rightEyeX + pupilOffsetX, rightEyeY + pupilOffsetY, pupilRadius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(leftEyeX + pupilOffsetX - pupilRadius * 0.3, leftEyeY + pupilOffsetY - pupilRadius * 0.3, pupilRadius * 0.35, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(rightEyeX + pupilOffsetX - pupilRadius * 0.3, rightEyeY + pupilOffsetY - pupilRadius * 0.3, pupilRadius * 0.35, 0, Math.PI * 2);
    this.ctx.fill();

    const smileX = x + Math.cos(angle) * radius * 0.15;
    const smileY = y + Math.sin(angle) * radius * 0.15;
    this.ctx.save();
    this.ctx.translate(smileX, smileY);
    this.ctx.rotate(angle);
    this.ctx.strokeStyle = '#2d2d44';
    this.ctx.lineWidth = 2.5;
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();
    this.ctx.arc(0, radius * 0.1, radius * 0.3, 0.3, Math.PI - 0.3);
    this.ctx.stroke();
    this.ctx.restore();

    if (isBoosting) {
      this.ctx.fillStyle = 'rgba(255, 120, 150, 0.5)';
      this.ctx.beginPath();
      this.ctx.ellipse(
        leftEyeX + Math.cos(perpAngle) * eyeRadius * 0.8,
        leftEyeY + Math.sin(perpAngle) * eyeRadius * 0.8 + eyeRadius * 0.5,
        eyeRadius * 0.5, eyeRadius * 0.3, 0, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.beginPath();
      this.ctx.ellipse(
        rightEyeX - Math.cos(perpAngle) * eyeRadius * 0.8,
        rightEyeY - Math.sin(perpAngle) * eyeRadius * 0.8 + eyeRadius * 0.5,
        eyeRadius * 0.5, eyeRadius * 0.3, 0, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawMinimap(state: GameState) {
    const minimapSize = 150;
    const minimapX = this.width - minimapSize - 20;
    const minimapY = this.height - minimapSize - 20;
    const scale = minimapSize / GAME_CONFIG.MAP_SIZE;

    this.ctx.beginPath();
    this.ctx.roundRect(minimapX - 5, minimapY - 5, minimapSize + 10, minimapSize + 10, 10);
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    this.ctx.fill();
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // Draw zones on minimap
    state.mapZones.forEach(zone => {
      const zx = minimapX + zone.x * scale;
      const zy = minimapY + zone.y * scale;
      const zr = Math.max(3, zone.radius * scale);
      this.ctx.beginPath();
      this.ctx.arc(zx, zy, zr, 0, Math.PI * 2);
      this.ctx.fillStyle = ZONE_CONFIG[zone.type].color + '40';
      this.ctx.fill();
    });

    state.worms.forEach(worm => {
      if (worm.segments.length === 0) return;
      const head = worm.segments[0];
      const dotX = minimapX + head.x * scale;
      const dotY = minimapY + head.y * scale;

      this.ctx.beginPath();
      this.ctx.arc(dotX, dotY, worm.isPlayer ? 5 : 3, 0, Math.PI * 2);
      this.ctx.fillStyle = worm.isPlayer ? '#ffffff' : worm.color;
      this.ctx.fill();

      if (worm.isPlayer) {
        this.ctx.strokeStyle = worm.color;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
      }
    });

    const viewX = minimapX + state.camera.x * scale;
    const viewY = minimapY + state.camera.y * scale;
    const viewW = this.width * scale;
    const viewH = this.height * scale;
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(viewX, viewY, viewW, viewH);
  }

  private drawNames(worms: Worm[], camera: { x: number; y: number }) {
    worms.forEach(worm => {
      if (worm.segments.length === 0) return;
      if (worm.isInvisible && !worm.isPlayer) return; // hide name when invisible

      const head = worm.segments[0];
      const screenX = head.x - camera.x;
      const screenY = head.y - camera.y;

      if (screenX < -100 || screenX > this.width + 100 ||
          screenY < -100 || screenY > this.height + 100) return;

      const radius = getWormRadius(worm);
      const nameY = screenY - radius - 15;

      this.ctx.font = 'bold 13px "Segoe UI", system-ui, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
      this.ctx.fillText(worm.name, screenX + 1, nameY + 1);
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillText(worm.name, screenX, nameY);

      this.ctx.font = '10px "Segoe UI", system-ui, sans-serif';
      this.ctx.fillStyle = 'rgba(255,255,255,0.6)';
      this.ctx.fillText(`${worm.segments.length}`, screenX, nameY + 13);
    });
  }

  private drawLeaderboard(state: GameState) {
    const sorted = [...state.worms]
      .filter(w => w.segments.length > 0)
      .sort((a, b) => b.segments.length - a.segments.length)
      .slice(0, 10);

    const lbWidth = 180;
    const lbX = this.width - lbWidth - 15;
    const lbY = 10;
    const rowHeight = 24;
    const headerHeight = 32;
    const totalHeight = headerHeight + sorted.length * rowHeight + 8;

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.ctx.beginPath();
    this.ctx.roundRect(lbX, lbY, lbWidth, totalHeight, 10);
    this.ctx.fill();

    this.ctx.font = 'bold 14px "Segoe UI", system-ui, sans-serif';
    this.ctx.fillStyle = '#ffd700';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('🏆 Ranking', lbX + lbWidth / 2, lbY + 22);

    const player = state.worms.find(w => w.isPlayer);
    sorted.forEach((worm, i) => {
      const y = lbY + headerHeight + i * rowHeight + 16;
      const isMe = worm.id === player?.id;

      if (isMe) {
        this.ctx.fillStyle = 'rgba(78, 205, 196, 0.15)';
        this.ctx.fillRect(lbX + 4, y - 14, lbWidth - 8, rowHeight);
      }

      this.ctx.font = 'bold 12px "Segoe UI", system-ui, sans-serif';
      this.ctx.textAlign = 'left';
      this.ctx.fillStyle = i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'rgba(255,255,255,0.7)';
      this.ctx.fillText(`${i + 1}.`, lbX + 10, y);

      this.ctx.beginPath();
      this.ctx.arc(lbX + 30, y - 4, 4, 0, Math.PI * 2);
      this.ctx.fillStyle = worm.color;
      this.ctx.fill();

      this.ctx.font = `${isMe ? 'bold' : 'normal'} 12px "Segoe UI", system-ui, sans-serif`;
      this.ctx.fillStyle = isMe ? '#4ECDC4' : '#ffffff';
      this.ctx.textAlign = 'left';
      const displayName = worm.name.length > 10 ? worm.name.slice(0, 10) + '…' : worm.name;
      this.ctx.fillText(displayName, lbX + 40, y);

      this.ctx.textAlign = 'right';
      this.ctx.fillStyle = 'rgba(255,255,255,0.6)';
      this.ctx.font = '11px "Segoe UI", system-ui, sans-serif';
      this.ctx.fillText(`${worm.segments.length}`, lbX + lbWidth - 10, y);
    });
  }

  private drawAbilityBar(state: GameState) {
    const player = state.worms.find(w => w.isPlayer);
    if (!player || player.abilities.length === 0) return;

    const barWidth = 240;
    const barHeight = 52;
    const barX = (this.width - barWidth) / 2;
    const barY = this.height - barHeight - 15;
    const slotSize = 44;
    const gap = 12;
    const totalW = player.abilities.length * slotSize + (player.abilities.length - 1) * gap;
    const startX = barX + (barWidth - totalW) / 2;

    // Background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    this.ctx.beginPath();
    this.ctx.roundRect(barX - 8, barY - 4, barWidth + 16, barHeight + 8, 12);
    this.ctx.fill();

    const icons = ['💨', '👻', '🌀', '⚡'];
    const labels = ['Dash', 'Invis', 'Ghost', 'Shield'];
    const colors = ['#00e5ff', '#aa96da', '#7c4dff', '#76ff03'];

    player.abilities.forEach((ability, i) => {
      const sx = startX + i * (slotSize + gap);
      const sy = barY;

      // Slot background
      const isReady = ability.cooldown <= 0 && !ability.active;
      const slotColor = ability.active ? colors[i] + '50' : isReady ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.4)';
      this.ctx.fillStyle = slotColor;
      this.ctx.beginPath();
      this.ctx.roundRect(sx, sy, slotSize, slotSize, 8);
      this.ctx.fill();

      // Border
      this.ctx.strokeStyle = ability.active ? colors[i] : isReady ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)';
      this.ctx.lineWidth = ability.active ? 2 : 1;
      this.ctx.beginPath();
      this.ctx.roundRect(sx, sy, slotSize, slotSize, 8);
      this.ctx.stroke();

      // Cooldown overlay
      if (ability.cooldown > 0 && !ability.active) {
        const cdPercent = ability.cooldown / ability.maxCooldown;
        this.ctx.fillStyle = 'rgba(0,0,0,0.6)';
        this.ctx.beginPath();
        this.ctx.roundRect(sx, sy, slotSize, slotSize * cdPercent, 8);
        this.ctx.fill();

        // Cooldown text
        const cdSeconds = Math.ceil(ability.cooldown / 60);
        this.ctx.font = 'bold 14px sans-serif';
        this.ctx.fillStyle = 'rgba(255,255,255,0.7)';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(`${cdSeconds}s`, sx + slotSize / 2, sy + slotSize / 2 + 6);
      }

      // Icon
      this.ctx.font = '20px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(icons[i], sx + slotSize / 2, sy + slotSize / 2 - 4);

      // Key label
      this.ctx.font = 'bold 10px sans-serif';
      this.ctx.fillStyle = isReady ? '#fff' : 'rgba(255,255,255,0.4)';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'bottom';
      this.ctx.fillText(ability.key, sx + slotSize / 2, sy - 2);

      // Active glow
      if (ability.active) {
        this.ctx.shadowColor = colors[i];
        this.ctx.shadowBlur = 15;
        this.ctx.beginPath();
        this.ctx.roundRect(sx, sy, slotSize, slotSize, 8);
        this.ctx.strokeStyle = colors[i];
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;
      }
    });

    // Reset text baseline
    this.ctx.textBaseline = 'alphabetic';
  }

  private drawUI(state: GameState) {
    const player = state.worms.find(w => w.isPlayer);

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.beginPath();
    this.ctx.roundRect(10, 10, 180, 100, 10);
    this.ctx.fill();

    this.ctx.font = 'bold 22px "Segoe UI", system-ui, sans-serif';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`🐛 Tamanho: ${player?.segments.length || 0}`, 25, 42);

    this.ctx.font = '18px "Segoe UI", system-ui, sans-serif';
    this.ctx.fillStyle = '#ffd700';
    this.ctx.fillText(`🏆 Rank: #${state.playerRank}/${state.worms.length}`, 25, 70);

    if (player?.isBoosting) {
      this.ctx.fillStyle = '#ff6b6b';
      this.ctx.font = 'bold 16px "Segoe UI", system-ui, sans-serif';
      this.ctx.fillText('🔥 TURBO!', 25, 95);
    }

    // Active ability indicators
    if (player) {
      let indicatorY = 95;
      if (player.isGhost) {
        this.ctx.fillStyle = '#7c4dff';
        this.ctx.font = 'bold 14px sans-serif';
        this.ctx.fillText('👻 FANTASMA', 25, indicatorY);
        indicatorY += 18;
      }
      if (player.isInvisible) {
        this.ctx.fillStyle = '#aa96da';
        this.ctx.font = 'bold 14px sans-serif';
        this.ctx.fillText('🫥 INVISÍVEL', 25, indicatorY);
        indicatorY += 18;
      }
      if (player.hasShield) {
        this.ctx.fillStyle = '#76ff03';
        this.ctx.font = 'bold 14px sans-serif';
        this.ctx.fillText('⚡ CAMPO', 25, indicatorY);
      }
    }

    this.ctx.font = '14px "Segoe UI", system-ui, sans-serif';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('🖱️ Mouse para mover | 👆 Clique para acelerar | 1-4 Habilidades', this.width / 2, this.height - 75);

    if (state.gameOver) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      this.ctx.fillRect(0, 0, this.width, this.height);

      this.ctx.font = 'bold 56px "Segoe UI", system-ui, sans-serif';
      this.ctx.fillStyle = '#ff6b6b';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('💀 GAME OVER!', this.width / 2, this.height / 2 - 50);

      this.ctx.font = '28px "Segoe UI", system-ui, sans-serif';
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillText(`Tamanho final: ${player?.segments.length || 0}`, this.width / 2, this.height / 2 + 10);

      this.ctx.fillStyle = '#ffd700';
      this.ctx.fillText(`Posição: #${state.playerRank}`, this.width / 2, this.height / 2 + 50);

      this.ctx.font = '20px "Segoe UI", system-ui, sans-serif';
      this.ctx.fillStyle = '#4ECDC4';
      this.ctx.fillText('🔄 Clique para jogar novamente', this.width / 2, this.height / 2 + 110);
    }
  }
}
