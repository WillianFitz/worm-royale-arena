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
import { RemotePlayerState } from './MultiplayerClient';

export class GameEngine {
  private state: GameState;
  private mousePosition: Vector2D = { x: 0, y: 0 };
  private isMouseDown: boolean = false;
  private canvasWidth: number;
  private canvasHeight: number;
  private remotePlayers: Map<string, RemotePlayerState> = new Map();
  private remoteTargets: Map<string, { segments: { x: number; y: number }[]; angle: number }> = new Map();
  private localPlayerId: string = '';
  private multiplayerMode: boolean = false;
  private onPlayerDied: (() => void) | null = null;

  private playerName: string = 'Jogador';

  constructor(canvasWidth: number, canvasHeight: number, playerName?: string) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.playerName = playerName || 'Jogador';
    this.state = this.initializeGame();
  }

  private initializeGame(): GameState {
    const worms: Worm[] = [];
    
    // Create player worm first
    worms.push(createWorm(true, 0, this.playerName));
    
    // Create AI worms (fewer in multiplayer mode)
    const botCount = this.multiplayerMode 
      ? Math.max(5, GAME_CONFIG.WORM_COUNT - this.remotePlayers.size)
      : GAME_CONFIG.WORM_COUNT - 1;
    
    for (let i = 1; i <= botCount; i++) {
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

  enableMultiplayer(playerId: string, onDied: () => void) {
    this.multiplayerMode = true;
    this.localPlayerId = playerId;
    this.onPlayerDied = onDied;
  }

  updateRemotePlayers(players: RemotePlayerState[]) {
    this.remotePlayers.clear();
    for (const p of players) {
      if (p.id !== this.localPlayerId && p.alive) {
        this.remotePlayers.set(p.id, p);
        // Store target positions for interpolation
        const segments = p.segments.length > 0 ? p.segments : [{ x: p.x, y: p.y }];
        this.remoteTargets.set(p.id, { segments, angle: p.angle });
      }
    }
    this.syncRemoteWormsToState();
  }

  private syncRemoteWormsToState() {
    // Track existing remote worm IDs
    const existingRemoteIds = new Set<string>();
    this.state.worms.forEach(w => {
      if (w.id.startsWith('remote_')) existingRemoteIds.add(w.id);
    });

    // Remove remote worms that are no longer in the remote players list
    const activeRemoteIds = new Set(Array.from(this.remotePlayers.keys()).map(id => `remote_${id}`));
    this.state.worms = this.state.worms.filter(w => !w.id.startsWith('remote_') || activeRemoteIds.has(w.id));

    // Add new remote worms (don't replace existing ones - they'll interpolate)
    for (const [id, remote] of this.remotePlayers) {
      const wormId = `remote_${id}`;
      const existing = this.state.worms.find(w => w.id === wormId);
      
      if (!existing) {
        const segments = remote.segments.length > 0 ? remote.segments : [{ x: remote.x, y: remote.y }];
        const remoteWorm: Worm = {
          id: wormId,
          name: remote.name || 'Jogador',
          segments,
          color: remote.color || '#4ECDC4',
          glowColor: remote.glowColor || '#4ECDC480',
          angle: remote.angle,
          speed: GAME_CONFIG.BASE_SPEED,
          isBoosting: remote.isBoosting,
          score: remote.score,
          isPlayer: false,
          targetAngle: remote.angle,
          aiTimer: 0,
        };
        this.state.worms.push(remoteWorm);
      } else {
        // Update metadata but let interpolation handle positions
        existing.isBoosting = remote.isBoosting;
        existing.score = remote.score;
        existing.color = remote.color || existing.color;
        existing.glowColor = remote.glowColor || existing.glowColor;
        existing.name = remote.name || existing.name;
      }
    }
  }

  getPlayerWorm(): Worm | undefined {
    return this.state.worms.find(w => w.isPlayer);
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

    const dx = this.mousePosition.x - screenX;
    const dy = this.mousePosition.y - screenY;
    player.targetAngle = Math.atan2(dy, dx);

    player.isBoosting = this.isMouseDown && player.segments.length > GAME_CONFIG.INITIAL_SEGMENTS;
    
    if (player.isBoosting) {
      player.speed = GAME_CONFIG.BOOST_SPEED;
      if (Math.random() < 0.05 && player.segments.length > GAME_CONFIG.INITIAL_SEGMENTS) {
        const lastSegment = player.segments.pop();
        if (lastSegment) {
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
      // Skip player and remote worms (they're controlled externally)
      if (worm.isPlayer || worm.segments.length === 0 || worm.id.startsWith('remote_')) return;

      worm.aiTimer++;

      const head = worm.segments[0];
      const nearBoundary = head.x < 200 || head.x > GAME_CONFIG.MAP_SIZE - 200 ||
                          head.y < 200 || head.y > GAME_CONFIG.MAP_SIZE - 200;

      if (worm.aiTimer >= GAME_CONFIG.AI_DIRECTION_CHANGE_INTERVAL || nearBoundary) {
        worm.aiTimer = 0;
        
        if (nearBoundary) {
          const centerX = GAME_CONFIG.MAP_SIZE / 2;
          const centerY = GAME_CONFIG.MAP_SIZE / 2;
          worm.targetAngle = Math.atan2(centerY - head.y, centerX - head.x);
        } else {
          const nearbyCandy = this.findNearestCandy(head);
          if (nearbyCandy && Math.random() > 0.3) {
            worm.targetAngle = Math.atan2(nearbyCandy.y - head.y, nearbyCandy.x - head.x);
          } else {
            worm.targetAngle = worm.angle + (Math.random() - 0.5) * Math.PI * 0.5;
          }
        }
      }

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

      // Interpolate remote worms toward their target positions
      if (worm.id.startsWith('remote_')) {
        const remoteId = worm.id.replace('remote_', '');
        const target = this.remoteTargets.get(remoteId);
        if (target && target.segments.length > 0) {
          // Lerp angle
          worm.angle = lerpAngle(worm.angle, target.angle, 0.15);
          
          // Lerp each segment toward target
          const lerpFactor = 0.2;
          for (let i = 0; i < worm.segments.length; i++) {
            const targetSeg = target.segments[Math.min(i, target.segments.length - 1)];
            worm.segments[i].x += (targetSeg.x - worm.segments[i].x) * lerpFactor;
            worm.segments[i].y += (targetSeg.y - worm.segments[i].y) * lerpFactor;
          }
          
          // Adjust segment count to match target
          if (worm.segments.length < target.segments.length) {
            const last = worm.segments[worm.segments.length - 1];
            while (worm.segments.length < target.segments.length) {
              worm.segments.push({ ...last });
            }
          } else if (worm.segments.length > target.segments.length + 5) {
            worm.segments.length = target.segments.length;
          }
        }
        return;
      }

      worm.angle = lerpAngle(worm.angle, worm.targetAngle, 0.08);
      worm.angle = normalizeAngle(worm.angle);

      const head = worm.segments[0];
      const newHead = {
        x: head.x + Math.cos(worm.angle) * worm.speed,
        y: head.y + Math.sin(worm.angle) * worm.speed,
      };

      newHead.x = Math.max(10, Math.min(GAME_CONFIG.MAP_SIZE - 10, newHead.x));
      newHead.y = Math.max(10, Math.min(GAME_CONFIG.MAP_SIZE - 10, newHead.y));

      for (let i = worm.segments.length - 1; i > 0; i--) {
        const current = worm.segments[i];
        const tgt = worm.segments[i - 1];
        const dist = getDistance(current, tgt);
        
        if (dist > GAME_CONFIG.SEGMENT_DISTANCE) {
          const angle = Math.atan2(tgt.y - current.y, tgt.x - current.x);
          current.x += Math.cos(angle) * (dist - GAME_CONFIG.SEGMENT_DISTANCE);
          current.y += Math.sin(angle) * (dist - GAME_CONFIG.SEGMENT_DISTANCE);
        }
      }

      worm.segments[0] = newHead;
    });
  }

  private checkCollisions(): void {
    this.state.worms.forEach(worm => {
      if (worm.segments.length === 0) return;

      this.state.candies = this.state.candies.filter(candy => {
        if (checkCandyCollision(worm, candy)) {
          worm.score += candy.value;
          
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

    for (let i = 0; i < this.state.worms.length; i++) {
      const worm = this.state.worms[i];
      if (worm.segments.length === 0) continue;

      for (let j = 0; j < this.state.worms.length; j++) {
        if (i === j) continue;
        const other = this.state.worms[j];
        if (other.segments.length === 0) continue;

        if (checkWormCollision(worm, other)) {
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
            this.onPlayerDied?.();
          } else if (!worm.id.startsWith('remote_')) {
            // Respawn only local AI bots
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
