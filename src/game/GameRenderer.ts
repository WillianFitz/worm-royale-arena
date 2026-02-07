import { GameState, Worm, Candy } from './types';
import { GAME_CONFIG } from './constants';
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
    this.drawBoundary(state.camera);
    this.drawCandies(state.candies, state.camera);
    this.drawWorms(state.worms, state.camera);
    this.drawMinimap(state);
    this.drawUI(state);
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

  private drawBoundary(camera: { x: number; y: number }) {
    const boundaryX = -camera.x;
    const boundaryY = -camera.y;
    
    // Outer glow
    this.ctx.strokeStyle = '#ff3366';
    this.ctx.lineWidth = 8;
    this.ctx.shadowColor = '#ff3366';
    this.ctx.shadowBlur = 30;
    
    this.ctx.strokeRect(
      boundaryX,
      boundaryY,
      GAME_CONFIG.MAP_SIZE,
      GAME_CONFIG.MAP_SIZE
    );
    
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
      
      // Different candy types based on index
      const candyType = index % 4;
      
      if (candyType === 0) {
        // Wrapped candy
        this.drawWrappedCandy(candy.size, candy.color, rotation);
      } else if (candyType === 1) {
        // Lollipop
        this.drawLollipop(candy.size, candy.color, rotation);
      } else if (candyType === 2) {
        // Star candy
        this.drawStarCandy(candy.size, candy.color, rotation);
      } else {
        // Round candy with swirl
        this.drawSwirlCandy(candy.size, candy.color, rotation);
      }
      
      this.ctx.restore();
    });
  }

  private drawWrappedCandy(size: number, color: string, rotation: number) {
    this.ctx.rotate(rotation * 0.3);
    
    // Glow
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 15;
    
    // Wrapper ends
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
    
    // Main candy body
    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, size * 1.2, size * 0.7, 0, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    this.ctx.fill();
    
    // Stripe
    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, size * 0.4, size * 0.7, 0, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    this.ctx.fill();
    
    // Highlight
    this.ctx.beginPath();
    this.ctx.ellipse(-size * 0.4, -size * 0.2, size * 0.3, size * 0.15, -0.3, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.fill();
    
    this.ctx.shadowBlur = 0;
  }

  private drawLollipop(size: number, color: string, rotation: number) {
    // Glow
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 12;
    
    // Stick
    this.ctx.strokeStyle = '#e8dcc8';
    this.ctx.lineWidth = size * 0.25;
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(0, size * 0.5);
    this.ctx.lineTo(0, size * 2);
    this.ctx.stroke();
    
    // Candy circle
    this.ctx.beginPath();
    this.ctx.arc(0, 0, size, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    this.ctx.fill();
    
    // Swirl pattern
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.lineWidth = size * 0.2;
    this.ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const angle = rotation + i * Math.PI * 0.7;
      const r = size * (0.3 + i * 0.2);
      this.ctx.arc(0, 0, r, angle, angle + Math.PI * 0.5);
    }
    this.ctx.stroke();
    
    // Shine
    this.ctx.beginPath();
    this.ctx.arc(-size * 0.3, -size * 0.3, size * 0.25, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.fill();
    
    this.ctx.shadowBlur = 0;
  }

  private drawStarCandy(size: number, color: string, rotation: number) {
    this.ctx.rotate(rotation * 0.5);
    
    // Glow
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 15;
    
    // Star shape
    this.ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
      const outerX = Math.cos(angle) * size * 1.3;
      const outerY = Math.sin(angle) * size * 1.3;
      const innerAngle = angle + Math.PI / 5;
      const innerX = Math.cos(innerAngle) * size * 0.5;
      const innerY = Math.sin(innerAngle) * size * 0.5;
      
      if (i === 0) {
        this.ctx.moveTo(outerX, outerY);
      } else {
        this.ctx.lineTo(outerX, outerY);
      }
      this.ctx.lineTo(innerX, innerY);
    }
    this.ctx.closePath();
    this.ctx.fillStyle = color;
    this.ctx.fill();
    
    // Inner glow
    this.ctx.beginPath();
    this.ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.fill();
    
    // Sparkle
    this.ctx.beginPath();
    this.ctx.arc(-size * 0.2, -size * 0.3, size * 0.15, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    this.ctx.fill();
    
    this.ctx.shadowBlur = 0;
  }

  private drawSwirlCandy(size: number, color: string, rotation: number) {
    // Glow
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 15;
    
    // Base circle
    this.ctx.beginPath();
    this.ctx.arc(0, 0, size, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    this.ctx.fill();
    
    // Swirl pattern
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
    
    // Highlight
    this.ctx.beginPath();
    this.ctx.arc(-size * 0.3, -size * 0.3, size * 0.2, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.fill();
    
    this.ctx.shadowBlur = 0;
  }

  private drawWorms(worms: Worm[], camera: { x: number; y: number }) {
    const sortedWorms = [...worms].sort((a, b) => (a.isPlayer ? 1 : 0) - (b.isPlayer ? 1 : 0));
    sortedWorms.forEach(worm => {
      this.drawWorm(worm, camera);
    });
  }

  private drawWorm(worm: Worm, camera: { x: number; y: number }) {
    if (worm.segments.length === 0) return;
    
    const baseRadius = getWormRadius(worm);
    
    // Draw body segments from tail to head
    for (let i = worm.segments.length - 1; i >= 0; i--) {
      const segment = worm.segments[i];
      const screenX = segment.x - camera.x;
      const screenY = segment.y - camera.y;
      
      if (screenX < -100 || screenX > this.width + 100 ||
          screenY < -100 || screenY > this.height + 100) continue;

      // Segment gets smaller towards tail
      const t = 1 - i / worm.segments.length;
      const segmentRadius = baseRadius * (0.4 + t * 0.6);
      
      // Outer glow
      this.ctx.shadowColor = worm.glowColor;
      this.ctx.shadowBlur = worm.isPlayer ? 20 : 12;
      
      // Main body gradient
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
      
      // Shine highlight
      if (i % 2 === 0) {
        this.ctx.beginPath();
        this.ctx.ellipse(
          screenX - segmentRadius * 0.3,
          screenY - segmentRadius * 0.3,
          segmentRadius * 0.4,
          segmentRadius * 0.25,
          -Math.PI / 4,
          0, Math.PI * 2
        );
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        this.ctx.fill();
      }
      
      // Pattern dots on body
      if (i % 4 === 0 && i > 0) {
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY, segmentRadius * 0.25, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.fill();
      }
      
      this.ctx.shadowBlur = 0;
    }

    // Draw face on head
    const head = worm.segments[0];
    const screenX = head.x - camera.x;
    const screenY = head.y - camera.y;
    
    if (screenX >= -100 && screenX <= this.width + 100 &&
        screenY >= -100 && screenY <= this.height + 100) {
      this.drawFace(screenX, screenY, baseRadius, worm.angle, worm.isBoosting, worm.color);
    }
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
    
    // Eye whites with gradient
    const eyeGradient = this.ctx.createRadialGradient(
      leftEyeX - eyeRadius * 0.2, leftEyeY - eyeRadius * 0.2, 0,
      leftEyeX, leftEyeY, eyeRadius
    );
    eyeGradient.addColorStop(0, '#ffffff');
    eyeGradient.addColorStop(1, '#e8e8e8');
    
    // Eye shadow
    this.ctx.beginPath();
    this.ctx.arc(leftEyeX, leftEyeY + 1, eyeRadius, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(rightEyeX, rightEyeY + 1, eyeRadius, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Eyes
    this.ctx.beginPath();
    this.ctx.arc(leftEyeX, leftEyeY, eyeRadius, 0, Math.PI * 2);
    this.ctx.fillStyle = eyeGradient;
    this.ctx.fill();
    
    const eyeGradient2 = this.ctx.createRadialGradient(
      rightEyeX - eyeRadius * 0.2, rightEyeY - eyeRadius * 0.2, 0,
      rightEyeX, rightEyeY, eyeRadius
    );
    eyeGradient2.addColorStop(0, '#ffffff');
    eyeGradient2.addColorStop(1, '#e8e8e8');
    
    this.ctx.beginPath();
    this.ctx.arc(rightEyeX, rightEyeY, eyeRadius, 0, Math.PI * 2);
    this.ctx.fillStyle = eyeGradient2;
    this.ctx.fill();
    
    // Pupils looking forward
    const pupilOffsetX = Math.cos(angle) * pupilRadius * 0.5;
    const pupilOffsetY = Math.sin(angle) * pupilRadius * 0.5;
    
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.beginPath();
    this.ctx.arc(leftEyeX + pupilOffsetX, leftEyeY + pupilOffsetY, pupilRadius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(rightEyeX + pupilOffsetX, rightEyeY + pupilOffsetY, pupilRadius, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Eye shine
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(leftEyeX + pupilOffsetX - pupilRadius * 0.3, leftEyeY + pupilOffsetY - pupilRadius * 0.3, pupilRadius * 0.35, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(rightEyeX + pupilOffsetX - pupilRadius * 0.3, rightEyeY + pupilOffsetY - pupilRadius * 0.3, pupilRadius * 0.35, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Smile
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
    
    // Blush when boosting
    if (isBoosting) {
      this.ctx.fillStyle = 'rgba(255, 120, 150, 0.5)';
      this.ctx.beginPath();
      this.ctx.ellipse(
        leftEyeX + Math.cos(perpAngle) * eyeRadius * 0.8,
        leftEyeY + Math.sin(perpAngle) * eyeRadius * 0.8 + eyeRadius * 0.5,
        eyeRadius * 0.5, eyeRadius * 0.3, 0, 0, Math.PI * 2
      );
      this.ctx.fill();
      this.ctx.beginPath();
      this.ctx.ellipse(
        rightEyeX - Math.cos(perpAngle) * eyeRadius * 0.8,
        rightEyeY - Math.sin(perpAngle) * eyeRadius * 0.8 + eyeRadius * 0.5,
        eyeRadius * 0.5, eyeRadius * 0.3, 0, 0, Math.PI * 2
      );
      this.ctx.fill();
    }
  }

  private drawMinimap(state: GameState) {
    const minimapSize = 150;
    const minimapX = this.width - minimapSize - 20;
    const minimapY = this.height - minimapSize - 20;
    const scale = minimapSize / GAME_CONFIG.MAP_SIZE;
    
    // Background with rounded corners
    this.ctx.beginPath();
    this.ctx.roundRect(minimapX - 5, minimapY - 5, minimapSize + 10, minimapSize + 10, 10);
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    this.ctx.fill();
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    // Draw worms
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
    
    // Camera view
    const viewX = minimapX + state.camera.x * scale;
    const viewY = minimapY + state.camera.y * scale;
    const viewW = this.width * scale;
    const viewH = this.height * scale;
    
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(viewX, viewY, viewW, viewH);
  }

  private drawUI(state: GameState) {
    const player = state.worms.find(w => w.isPlayer);
    
    // UI Background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.beginPath();
    this.ctx.roundRect(10, 10, 180, 100, 10);
    this.ctx.fill();
    
    // Score
    this.ctx.font = 'bold 22px "Segoe UI", system-ui, sans-serif';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`🐛 Tamanho: ${player?.segments.length || 0}`, 25, 42);
    
    // Rank
    this.ctx.font = '18px "Segoe UI", system-ui, sans-serif';
    this.ctx.fillStyle = '#ffd700';
    this.ctx.fillText(`🏆 Rank: #${state.playerRank}/${state.worms.length}`, 25, 70);
    
    // Boost indicator
    if (player?.isBoosting) {
      this.ctx.fillStyle = '#ff6b6b';
      this.ctx.font = 'bold 16px "Segoe UI", system-ui, sans-serif';
      this.ctx.fillText('🔥 TURBO!', 25, 95);
    }
    
    // Instructions
    this.ctx.font = '14px "Segoe UI", system-ui, sans-serif';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('🖱️ Mouse para mover | 👆 Clique para acelerar', this.width / 2, this.height - 20);

    // Game over
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
