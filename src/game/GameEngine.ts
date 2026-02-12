import { GameState, Worm, Candy, Vector2D, MapZone } from './types';
import { GAME_CONFIG, ABILITY_CONFIG, ZONE_CONFIG } from './constants';
import {
  createWorm,
  createCandy,
  createMapZones,
  createDefaultAbilities,
  checkCandyCollision,
  checkWormCollision,
  lerpAngle,
  normalizeAngle,
  getDistance,
  getWormRadius,
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
  private portalCooldowns: Map<string, number> = new Map();

  constructor(canvasWidth: number, canvasHeight: number, playerName?: string) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.playerName = playerName || 'Jogador';
    this.state = this.initializeGame();
  }

  private initializeGame(): GameState {
    const worms: Worm[] = [];
    worms.push(createWorm(true, 0, this.playerName));

    const botCount = this.multiplayerMode
      ? Math.max(5, GAME_CONFIG.WORM_COUNT - this.remotePlayers.size)
      : GAME_CONFIG.WORM_COUNT - 1;

    for (let i = 1; i <= botCount; i++) {
      worms.push(createWorm(false, i));
    }

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
      mapZones: createMapZones(),
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
        const segments = p.segments.length > 0 ? p.segments : [{ x: p.x, y: p.y }];
        this.remoteTargets.set(p.id, { segments, angle: p.angle });
      }
    }
    this.syncRemoteWormsToState();
  }

  private syncRemoteWormsToState() {
    const activeRemoteIds = new Set(Array.from(this.remotePlayers.keys()).map(id => `remote_${id}`));
    this.state.worms = this.state.worms.filter(w => !w.id.startsWith('remote_') || activeRemoteIds.has(w.id));

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
          abilities: [],
          isInvisible: false,
          isGhost: false,
          hasShield: false,
          speedMultiplier: 1,
          buffTimer: 0,
          buffType: null,
        };
        this.state.worms.push(remoteWorm);
      } else {
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

  activateAbility(index: number) {
    const player = this.state.worms.find(w => w.isPlayer);
    if (!player || index < 0 || index >= player.abilities.length) return;
    const ability = player.abilities[index];
    if (ability.cooldown > 0 || ability.active) return;
    ability.active = true;
    ability.duration = ability.maxDuration;
    ability.cooldown = ability.maxCooldown;
  }

  getState(): GameState {
    return this.state;
  }

  isGameOver(): boolean {
    return this.state.gameOver;
  }

  update(): void {
    if (this.state.gameOver) return;

    this.updateAbilities();
    this.updatePlayer();
    this.updateAI();
    this.updateWorms();
    this.updateMapZones();
    this.checkCollisions();
    this.updateCamera();
    this.spawnCandies();
    this.updateRanking();
  }

  private updateAbilities(): void {
    this.state.worms.forEach(worm => {
      if (worm.abilities.length === 0) return;

      worm.isInvisible = false;
      worm.isGhost = false;
      worm.hasShield = false;
      let dashActive = false;

      worm.abilities.forEach(ability => {
        if (ability.cooldown > 0 && !ability.active) {
          ability.cooldown--;
        }

        if (ability.active) {
          ability.duration--;
          if (ability.duration <= 0) {
            ability.active = false;
          } else {
            switch (ability.type) {
              case 'dash':
                dashActive = true;
                break;
              case 'invisible':
                worm.isInvisible = true;
                break;
              case 'ghost':
                worm.isGhost = true;
                break;
              case 'shield':
                worm.hasShield = true;
                break;
            }
          }
        }
      });

      if (dashActive) {
        worm.speedMultiplier = ABILITY_CONFIG.dash.speedMultiplier;
      } else if (worm.buffType !== 'speed') {
        worm.speedMultiplier = 1;
      }
    });
  }

  private updateMapZones(): void {
    // Decrease portal cooldowns
    for (const [id, cd] of this.portalCooldowns) {
      if (cd <= 0) this.portalCooldowns.delete(id);
      else this.portalCooldowns.set(id, cd - 1);
    }

    this.state.worms.forEach(worm => {
      if (worm.segments.length === 0) return;
      const head = worm.segments[0];

      // Reset buff if timer expired
      if (worm.buffTimer > 0) {
        worm.buffTimer--;
        if (worm.buffTimer <= 0) {
          worm.buffType = null;
          if (!worm.abilities.some(a => a.type === 'dash' && a.active)) {
            worm.speedMultiplier = 1;
          }
        }
      }

      this.state.mapZones.forEach(zone => {
        const dist = getDistance(head, zone);
        if (dist > zone.radius) return;

        switch (zone.type) {
          case 'speed':
            worm.buffType = 'speed';
            worm.buffTimer = 30;
            if (!worm.abilities.some(a => a.type === 'dash' && a.active)) {
              worm.speedMultiplier = ZONE_CONFIG.speed.speedMultiplier;
            }
            break;

          case 'mass':
            if (Math.random() < 0.02 && worm.segments.length < GAME_CONFIG.MAX_SEGMENTS) {
              const tail = worm.segments[worm.segments.length - 1];
              worm.segments.push({ ...tail });
              worm.segments.push({ ...tail });
            }
            break;

          case 'blackhole': {
            const angle = Math.atan2(zone.y - head.y, zone.x - head.x);
            const force = ZONE_CONFIG.blackhole.pullForce * (1 - dist / zone.radius);
            head.x += Math.cos(angle) * force;
            head.y += Math.sin(angle) * force;
            break;
          }

          case 'toxic':
            if (Math.random() < ZONE_CONFIG.toxic.shrinkRate && worm.segments.length > GAME_CONFIG.INITIAL_SEGMENTS) {
              worm.segments.pop();
            }
            break;

          case 'portal': {
            if (dist < zone.radius * 0.5 && zone.linkedPortalId) {
              // Check cooldown
              if (this.portalCooldowns.has(zone.id)) break;
              const linked = this.state.mapZones.find(z => z.id === zone.linkedPortalId);
              if (linked) {
                const offsetX = head.x - zone.x;
                const offsetY = head.y - zone.y;
                head.x = linked.x + offsetX;
                head.y = linked.y + offsetY;
                // Set cooldown on both portals
                this.portalCooldowns.set(zone.id, 120);
                this.portalCooldowns.set(linked.id, 120);
              }
            }
            break;
          }
        }
      });

      // Shield repel effect
      if (worm.hasShield) {
        this.state.worms.forEach(other => {
          if (other.id === worm.id || other.segments.length === 0) return;
          const otherHead = other.segments[0];
          const dist = getDistance(head, otherHead);
          if (dist < ABILITY_CONFIG.shield.repelRadius) {
            const angle = Math.atan2(otherHead.y - head.y, otherHead.x - head.x);
            const force = ABILITY_CONFIG.shield.repelForce * (1 - dist / ABILITY_CONFIG.shield.repelRadius);
            otherHead.x += Math.cos(angle) * force;
            otherHead.y += Math.sin(angle) * force;
          }
        });
      }
    });
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
      player.speed = GAME_CONFIG.BOOST_SPEED * player.speedMultiplier;
      if (Math.random() < 0.05 && player.segments.length > GAME_CONFIG.INITIAL_SEGMENTS) {
        const lastSegment = player.segments.pop();
        if (lastSegment) {
          this.state.candies.push({
            id: Math.random().toString(36).substr(2, 9),
            x: lastSegment.x, y: lastSegment.y,
            color: player.color, size: 5, value: 1,
          });
        }
      }
    } else {
      player.speed = GAME_CONFIG.BASE_SPEED * player.speedMultiplier;
    }
  }

  private updateAI(): void {
    this.state.worms.forEach(worm => {
      if (worm.isPlayer || worm.segments.length === 0 || worm.id.startsWith('remote_')) return;

      worm.aiTimer++;
      const head = worm.segments[0];
      const nearBoundary = head.x < 200 || head.x > GAME_CONFIG.MAP_SIZE - 200 ||
                          head.y < 200 || head.y > GAME_CONFIG.MAP_SIZE - 200;

      if (worm.aiTimer >= GAME_CONFIG.AI_DIRECTION_CHANGE_INTERVAL || nearBoundary) {
        worm.aiTimer = 0;

        if (nearBoundary) {
          const cx = GAME_CONFIG.MAP_SIZE / 2;
          const cy = GAME_CONFIG.MAP_SIZE / 2;
          worm.targetAngle = Math.atan2(cy - head.y, cx - head.x);
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
      worm.speed = (worm.isBoosting ? GAME_CONFIG.BOOST_SPEED : GAME_CONFIG.BASE_SPEED) * worm.speedMultiplier;

      if (worm.isBoosting && Math.random() < 0.1) {
        const lastSegment = worm.segments.pop();
        if (lastSegment) {
          this.state.candies.push({
            id: Math.random().toString(36).substr(2, 9),
            x: lastSegment.x, y: lastSegment.y,
            color: worm.color, size: 4, value: 1,
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
      if (dist < minDist) { minDist = dist; nearest = candy; }
    }
    return nearest;
  }

  private updateWorms(): void {
    this.state.worms.forEach(worm => {
      if (worm.segments.length === 0) return;

      if (worm.id.startsWith('remote_')) {
        const remoteId = worm.id.replace('remote_', '');
        const target = this.remoteTargets.get(remoteId);
        if (target && target.segments.length > 0) {
          worm.angle = lerpAngle(worm.angle, target.angle, 0.15);
          const lerpFactor = 0.2;
          for (let i = 0; i < worm.segments.length; i++) {
            const targetSeg = target.segments[Math.min(i, target.segments.length - 1)];
            worm.segments[i].x += (targetSeg.x - worm.segments[i].x) * lerpFactor;
            worm.segments[i].y += (targetSeg.y - worm.segments[i].y) * lerpFactor;
          }
          if (worm.segments.length < target.segments.length) {
            const last = worm.segments[worm.segments.length - 1];
            while (worm.segments.length < target.segments.length) worm.segments.push({ ...last });
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
            for (let i = 0; i < candy.value; i++) worm.segments.push({ ...tail });
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
          // Shield protects from death
          if (worm.hasShield) continue;

          worm.segments.forEach((seg, idx) => {
            if (idx % 2 === 0) {
              this.state.candies.push({
                id: Math.random().toString(36).substr(2, 9),
                x: seg.x + (Math.random() - 0.5) * 20,
                y: seg.y + (Math.random() - 0.5) * 20,
                color: worm.color, size: 6, value: 2,
              });
            }
          });

          if (worm.isPlayer) {
            this.state.gameOver = true;
            this.onPlayerDied?.();
          } else if (!worm.id.startsWith('remote_')) {
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
