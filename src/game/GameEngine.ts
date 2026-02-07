import { GameState, Worm, Candy, Vector2D } from './types';
import { GAME_CONFIG } from './constants';
import {
  createWorm,
  createCandy,
  checkCandyCollision,
  checkWormCollision,
  lerpAngle,
  normalizeAngle,
  getDistance,
} from './utils';

export class GameEngine {
  private state: GameState;
  private mousePosition: Vector2D = { x: 0, y: 0 };
  private isMouseDown: boolean = false;
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.state = this.initializeGame();
  }

  private initializeGame(): GameState {
    const worms: Worm[] = [];
    
    // Create player worm first
    worms.push(createWorm(true, 0));
    
    // Create AI worms
    for (let i = 1; i < GAME_CONFIG.WORM_COUNT; i++) {
      worms.push(createWorm(false, i));
    }

    // Create candies
    const candies: Candy[] = [];
    for (let i = 0; i < GAME_CONFIG.CANDY_COUNT; i++) {
      candies.push(createCandy());
    }

    const player = worms[0];
    
    return {
      worms,
      candies,
      camera: {
        x: player.segments[0].x - this.canvasWidth / 2,
        y: player.segments[0].y - this.canvasHeight / 2,
      },
      mapSize: GAME_CONFIG.MAP_SIZE,
      gameOver: false,
      playerRank: GAME_CONFIG.WORM_COUNT,
    };
  }

  reset() {
    this.state = this.initializeGame();
  }

  updateCanvasSize(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  setMousePosition(x: number, y: number) {
    this.mousePosition = { x, y };
  }

  setMouseDown(isDown: boolean) {
    this.isMouseDown = isDown;
  }

  getState(): GameState {
    return this.state;
  }

  isGameOver(): boolean {
    return this.state.gameOver;
  }

  update(): void {
    if (this.state.gameOver) return;

    this.updatePlayer();
    this.updateAI();
    this.updateWorms();
    this.checkCollisions();
    this.updateCamera();
    this.spawnCandies();
    this.updateRanking();
  }

  private updatePlayer(): void {
    const player = this.state.worms.find(w => w.isPlayer);
    if (!player || player.segments.length === 0) return;

    const head = player.segments[0];
    const screenX = head.x - this.state.camera.x;
    const screenY = head.y - this.state.camera.y;

    // Calculate target angle towards mouse
    const dx = this.mousePosition.x - screenX;
    const dy = this.mousePosition.y - screenY;
    player.targetAngle = Math.atan2(dy, dx);

    // Boost when mouse is down
    player.isBoosting = this.isMouseDown && player.segments.length > GAME_CONFIG.INITIAL_SEGMENTS;
    
    if (player.isBoosting) {
      player.speed = GAME_CONFIG.BOOST_SPEED;
      // Lose segments while boosting
      if (Math.random() < 0.05 && player.segments.length > GAME_CONFIG.INITIAL_SEGMENTS) {
        const lastSegment = player.segments.pop();
        if (lastSegment) {
          // Drop candy where segment was
          this.state.candies.push({
            id: Math.random().toString(36).substr(2, 9),
            x: lastSegment.x,
            y: lastSegment.y,
            color: player.color,
            size: 5,
            value: 1,
          });
        }
      }
    } else {
      player.speed = GAME_CONFIG.BASE_SPEED;
    }
  }

  private updateAI(): void {
    this.state.worms.forEach(worm => {
      if (worm.isPlayer || worm.segments.length === 0) return;

      worm.aiTimer++;

      // Change direction periodically or when near boundary
      const head = worm.segments[0];
      const nearBoundary = head.x < 200 || head.x > GAME_CONFIG.MAP_SIZE - 200 ||
                          head.y < 200 || head.y > GAME_CONFIG.MAP_SIZE - 200;

      if (worm.aiTimer >= GAME_CONFIG.AI_DIRECTION_CHANGE_INTERVAL || nearBoundary) {
        worm.aiTimer = 0;
        
        if (nearBoundary) {
          // Turn towards center
          const centerX = GAME_CONFIG.MAP_SIZE / 2;
          const centerY = GAME_CONFIG.MAP_SIZE / 2;
          worm.targetAngle = Math.atan2(centerY - head.y, centerX - head.x);
        } else {
          // Random direction or chase nearby candy
          const nearbyCandy = this.findNearestCandy(head);
          if (nearbyCandy && Math.random() > 0.3) {
            worm.targetAngle = Math.atan2(nearbyCandy.y - head.y, nearbyCandy.x - head.x);
          } else {
            worm.targetAngle = worm.angle + (Math.random() - 0.5) * Math.PI * 0.5;
          }
        }
      }

      // Occasionally boost
      worm.isBoosting = Math.random() < 0.01 && worm.segments.length > GAME_CONFIG.INITIAL_SEGMENTS + 5;
      worm.speed = worm.isBoosting ? GAME_CONFIG.BOOST_SPEED : GAME_CONFIG.BASE_SPEED;

      if (worm.isBoosting && Math.random() < 0.1) {
        const lastSegment = worm.segments.pop();
        if (lastSegment) {
          this.state.candies.push({
            id: Math.random().toString(36).substr(2, 9),
            x: lastSegment.x,
            y: lastSegment.y,
            color: worm.color,
            size: 4,
            value: 1,
          });
        }
      }
    });
  }

  private findNearestCandy(position: Vector2D): Candy | null {
    let nearest: Candy | null = null;
    let minDist = 300;

    for (const candy of this.state.candies) {
      const dist = getDistance(position, candy);
      if (dist < minDist) {
        minDist = dist;
        nearest = candy;
      }
    }

    return nearest;
  }

  private updateWorms(): void {
    this.state.worms.forEach(worm => {
      if (worm.segments.length === 0) return;

      // Smoothly rotate towards target
      worm.angle = lerpAngle(worm.angle, worm.targetAngle, 0.08);
      worm.angle = normalizeAngle(worm.angle);

      // Move head
      const head = worm.segments[0];
      const newHead = {
        x: head.x + Math.cos(worm.angle) * worm.speed,
        y: head.y + Math.sin(worm.angle) * worm.speed,
      };

      // Boundary check
      newHead.x = Math.max(10, Math.min(GAME_CONFIG.MAP_SIZE - 10, newHead.x));
      newHead.y = Math.max(10, Math.min(GAME_CONFIG.MAP_SIZE - 10, newHead.y));

      // Move body (each segment follows the one in front)
      for (let i = worm.segments.length - 1; i > 0; i--) {
        const current = worm.segments[i];
        const target = worm.segments[i - 1];
        const dist = getDistance(current, target);
        
        if (dist > GAME_CONFIG.SEGMENT_DISTANCE) {
          const angle = Math.atan2(target.y - current.y, target.x - current.x);
          current.x += Math.cos(angle) * (dist - GAME_CONFIG.SEGMENT_DISTANCE);
          current.y += Math.sin(angle) * (dist - GAME_CONFIG.SEGMENT_DISTANCE);
        }
      }

      worm.segments[0] = newHead;
    });
  }

  private checkCollisions(): void {
    // Candy collection
    this.state.worms.forEach(worm => {
      if (worm.segments.length === 0) return;

      this.state.candies = this.state.candies.filter(candy => {
        if (checkCandyCollision(worm, candy)) {
          worm.score += candy.value;
          
          // Grow worm
          if (worm.segments.length < GAME_CONFIG.MAX_SEGMENTS) {
            const tail = worm.segments[worm.segments.length - 1];
            for (let i = 0; i < candy.value; i++) {
              worm.segments.push({ ...tail });
            }
          }
          
          return false;
        }
        return true;
      });
    });

    // Worm vs Worm collision
    const player = this.state.worms.find(w => w.isPlayer);
    
    for (let i = 0; i < this.state.worms.length; i++) {
      const worm = this.state.worms[i];
      if (worm.segments.length === 0) continue;

      for (let j = 0; j < this.state.worms.length; j++) {
        if (i === j) continue;
        const other = this.state.worms[j];
        if (other.segments.length === 0) continue;

        if (checkWormCollision(worm, other)) {
          // Worm dies, drop candies
          worm.segments.forEach((seg, idx) => {
            if (idx % 2 === 0) {
              this.state.candies.push({
                id: Math.random().toString(36).substr(2, 9),
                x: seg.x + (Math.random() - 0.5) * 20,
                y: seg.y + (Math.random() - 0.5) * 20,
                color: worm.color,
                size: 6,
                value: 2,
              });
            }
          });
          
          if (worm.isPlayer) {
            this.state.gameOver = true;
          } else {
            // Respawn AI
            const newWorm = createWorm(false, i);
            this.state.worms[i] = newWorm;
          }
          break;
        }
      }
    }
  }

  private updateCamera(): void {
    const player = this.state.worms.find(w => w.isPlayer);
    if (!player || player.segments.length === 0) return;

    const head = player.segments[0];
    const targetX = head.x - this.canvasWidth / 2;
    const targetY = head.y - this.canvasHeight / 2;

    // Smooth camera follow
    this.state.camera.x += (targetX - this.state.camera.x) * 0.1;
    this.state.camera.y += (targetY - this.state.camera.y) * 0.1;
  }

  private spawnCandies(): void {
    if (this.state.candies.length < GAME_CONFIG.CANDY_COUNT && Math.random() < GAME_CONFIG.CANDY_RESPAWN_RATE) {
      this.state.candies.push(createCandy());
    }
  }

  private updateRanking(): void {
    const sorted = [...this.state.worms]
      .filter(w => w.segments.length > 0)
      .sort((a, b) => b.segments.length - a.segments.length);
    
    const player = this.state.worms.find(w => w.isPlayer);
    if (player) {
      this.state.playerRank = sorted.findIndex(w => w.id === player.id) + 1;
    }
  }
}
