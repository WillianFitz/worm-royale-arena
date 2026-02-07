import { GameState, Worm, Candy } from './types';
import { GAME_CONFIG } from './constants';
import { getWormRadius } from './utils';

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;

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
    this.ctx.fillStyle = '#0a0a0f';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    this.drawGrid(state.camera);
    this.drawBoundary(state.camera);
    this.drawCandies(state.candies, state.camera);
    this.drawWorms(state.worms, state.camera);
    this.drawMinimap(state);
    this.drawUI(state);
  }

  private drawGrid(camera: { x: number; y: number }) {
    const gridSize = 50;
    const offsetX = -camera.x % gridSize;
    const offsetY = -camera.y % gridSize;

    this.ctx.strokeStyle = '#1a1a2e';
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
    
    this.ctx.strokeStyle = '#ff4444';
    this.ctx.lineWidth = 4;
    this.ctx.shadowColor = '#ff4444';
    this.ctx.shadowBlur = 20;
    
    this.ctx.strokeRect(
      boundaryX,
      boundaryY,
      GAME_CONFIG.MAP_SIZE,
      GAME_CONFIG.MAP_SIZE
    );
    
    this.ctx.shadowBlur = 0;
  }

  private drawCandies(candies: Candy[], camera: { x: number; y: number }) {
    candies.forEach(candy => {
      const screenX = candy.x - camera.x;
      const screenY = candy.y - camera.y;
      
      if (screenX < -50 || screenX > this.width + 50 ||
          screenY < -50 || screenY > this.height + 50) return;

      // Glow effect
      this.ctx.shadowColor = candy.color;
      this.ctx.shadowBlur = 15;
      
      // Draw candy
      this.ctx.beginPath();
      this.ctx.arc(screenX, screenY, candy.size, 0, Math.PI * 2);
      this.ctx.fillStyle = candy.color;
      this.ctx.fill();
      
      // Inner highlight
      this.ctx.beginPath();
      this.ctx.arc(screenX - candy.size * 0.3, screenY - candy.size * 0.3, candy.size * 0.3, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      this.ctx.fill();
      
      this.ctx.shadowBlur = 0;
    });
  }

  private drawWorms(worms: Worm[], camera: { x: number; y: number }) {
    // Sort so player is drawn last (on top)
    const sortedWorms = [...worms].sort((a, b) => (a.isPlayer ? 1 : 0) - (b.isPlayer ? 1 : 0));
    
    sortedWorms.forEach(worm => {
      this.drawWorm(worm, camera);
    });
  }

  private drawWorm(worm: Worm, camera: { x: number; y: number }) {
    const radius = getWormRadius(worm);
    
    // Draw body segments from tail to head
    for (let i = worm.segments.length - 1; i >= 0; i--) {
      const segment = worm.segments[i];
      const screenX = segment.x - camera.x;
      const screenY = segment.y - camera.y;
      
      if (screenX < -100 || screenX > this.width + 100 ||
          screenY < -100 || screenY > this.height + 100) continue;

      const segmentRadius = radius * (0.6 + (1 - i / worm.segments.length) * 0.4);
      
      // Glow
      this.ctx.shadowColor = worm.glowColor;
      this.ctx.shadowBlur = 15;
      
      // Body segment
      this.ctx.beginPath();
      this.ctx.arc(screenX, screenY, segmentRadius, 0, Math.PI * 2);
      this.ctx.fillStyle = worm.color;
      this.ctx.fill();
      
      // Stripe pattern
      if (i % 3 === 0) {
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY, segmentRadius * 0.7, 0, Math.PI * 2);
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.fill();
      }
      
      this.ctx.shadowBlur = 0;
    }

    // Draw face on head
    if (worm.segments.length > 0) {
      const head = worm.segments[0];
      const screenX = head.x - camera.x;
      const screenY = head.y - camera.y;
      
      if (screenX >= -100 && screenX <= this.width + 100 &&
          screenY >= -100 && screenY <= this.height + 100) {
        this.drawFace(screenX, screenY, radius, worm.angle, worm.isBoosting);
      }
    }
  }

  private drawFace(x: number, y: number, radius: number, angle: number, isBoosting: boolean) {
    const eyeOffset = radius * 0.4;
    const eyeRadius = radius * 0.25;
    const pupilRadius = radius * 0.12;
    
    // Calculate eye positions based on angle
    const perpAngle = angle + Math.PI / 2;
    const leftEyeX = x + Math.cos(angle) * radius * 0.3 + Math.cos(perpAngle) * eyeOffset;
    const leftEyeY = y + Math.sin(angle) * radius * 0.3 + Math.sin(perpAngle) * eyeOffset;
    const rightEyeX = x + Math.cos(angle) * radius * 0.3 - Math.cos(perpAngle) * eyeOffset;
    const rightEyeY = y + Math.sin(angle) * radius * 0.3 - Math.sin(perpAngle) * eyeOffset;
    
    // Eyes (white)
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(leftEyeX, leftEyeY, eyeRadius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(rightEyeX, rightEyeY, eyeRadius, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Pupils (look forward)
    const pupilOffsetX = Math.cos(angle) * pupilRadius * 0.3;
    const pupilOffsetY = Math.sin(angle) * pupilRadius * 0.3;
    
    this.ctx.fillStyle = '#000000';
    this.ctx.beginPath();
    this.ctx.arc(leftEyeX + pupilOffsetX, leftEyeY + pupilOffsetY, pupilRadius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(rightEyeX + pupilOffsetX, rightEyeY + pupilOffsetY, pupilRadius, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Smile
    const smileX = x + Math.cos(angle) * radius * 0.1;
    const smileY = y + Math.sin(angle) * radius * 0.1;
    const smileRadius = radius * 0.4;
    
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(smileX, smileY, smileRadius, 0.2, Math.PI - 0.2);
    this.ctx.stroke();
    
    // Blush when boosting
    if (isBoosting) {
      this.ctx.fillStyle = 'rgba(255, 100, 100, 0.4)';
      this.ctx.beginPath();
      this.ctx.arc(leftEyeX + Math.cos(perpAngle) * eyeRadius, leftEyeY + Math.sin(perpAngle) * eyeRadius, eyeRadius * 0.6, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.beginPath();
      this.ctx.arc(rightEyeX - Math.cos(perpAngle) * eyeRadius, rightEyeY - Math.sin(perpAngle) * eyeRadius, eyeRadius * 0.6, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawMinimap(state: GameState) {
    const minimapSize = 150;
    const minimapX = this.width - minimapSize - 20;
    const minimapY = this.height - minimapSize - 20;
    const scale = minimapSize / GAME_CONFIG.MAP_SIZE;
    
    // Background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(minimapX, minimapY, minimapSize, minimapSize);
    
    // Border
    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(minimapX, minimapY, minimapSize, minimapSize);
    
    // Draw worms on minimap
    state.worms.forEach(worm => {
      if (worm.segments.length === 0) return;
      const head = worm.segments[0];
      const dotX = minimapX + head.x * scale;
      const dotY = minimapY + head.y * scale;
      
      this.ctx.beginPath();
      this.ctx.arc(dotX, dotY, worm.isPlayer ? 4 : 2, 0, Math.PI * 2);
      this.ctx.fillStyle = worm.isPlayer ? '#ffffff' : worm.color;
      this.ctx.fill();
    });
    
    // Camera view rectangle
    const viewX = minimapX + state.camera.x * scale;
    const viewY = minimapY + state.camera.y * scale;
    const viewW = this.width * scale;
    const viewH = this.height * scale;
    
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(viewX, viewY, viewW, viewH);
  }

  private drawUI(state: GameState) {
    const player = state.worms.find(w => w.isPlayer);
    
    // Score
    this.ctx.font = 'bold 24px sans-serif';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`Tamanho: ${player?.segments.length || 0}`, 20, 40);
    
    // Rank
    this.ctx.fillText(`Rank: #${state.playerRank}/${state.worms.length}`, 20, 70);
    
    // Boost indicator
    if (player?.isBoosting) {
      this.ctx.fillStyle = '#ff6b6b';
      this.ctx.fillText('🔥 TURBO!', 20, 100);
    }
    
    // Instructions
    this.ctx.font = '14px sans-serif';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.fillText('Mouse para mover | Clique para acelerar', 20, this.height - 20);

    // Game over
    if (state.gameOver) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      this.ctx.fillRect(0, 0, this.width, this.height);
      
      this.ctx.font = 'bold 48px sans-serif';
      this.ctx.fillStyle = '#ff6b6b';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('GAME OVER!', this.width / 2, this.height / 2 - 40);
      
      this.ctx.font = '24px sans-serif';
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillText(`Tamanho final: ${player?.segments.length || 0}`, this.width / 2, this.height / 2 + 10);
      this.ctx.fillText(`Posição: #${state.playerRank}`, this.width / 2, this.height / 2 + 50);
      
      this.ctx.font = '18px sans-serif';
      this.ctx.fillStyle = '#4ECDC4';
      this.ctx.fillText('Clique para jogar novamente', this.width / 2, this.height / 2 + 100);
    }
  }
}
