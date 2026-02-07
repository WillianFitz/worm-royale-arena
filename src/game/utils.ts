import { Vector2D, Worm, WormSegment, Candy } from './types';
import { GAME_CONFIG, WORM_COLORS, CANDY_COLORS } from './constants';

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export function getDistance(a: Vector2D, b: Vector2D): number {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

export function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpAngle(a: number, b: number, t: number): number {
  const diff = normalizeAngle(b - a);
  return a + diff * t;
}

export function createWorm(isPlayer: boolean, index: number): Worm {
  const colorIndex = index % WORM_COLORS.length;
  const startX = Math.random() * (GAME_CONFIG.MAP_SIZE - 400) + 200;
  const startY = Math.random() * (GAME_CONFIG.MAP_SIZE - 400) + 200;
  const startAngle = Math.random() * Math.PI * 2;

  const segments: WormSegment[] = [];
  for (let i = 0; i < GAME_CONFIG.INITIAL_SEGMENTS; i++) {
    segments.push({
      x: startX - Math.cos(startAngle) * i * GAME_CONFIG.SEGMENT_DISTANCE,
      y: startY - Math.sin(startAngle) * i * GAME_CONFIG.SEGMENT_DISTANCE,
    });
  }

  return {
    id: generateId(),
    segments,
    color: WORM_COLORS[colorIndex].main,
    glowColor: WORM_COLORS[colorIndex].glow,
    angle: startAngle,
    speed: GAME_CONFIG.BASE_SPEED,
    isBoosting: false,
    score: 0,
    isPlayer,
    targetAngle: startAngle,
    aiTimer: 0,
  };
}

export function createCandy(): Candy {
  const colorIndex = Math.floor(Math.random() * CANDY_COLORS.length);
  const size = Math.random() * 6 + 6;
  
  return {
    id: generateId(),
    x: Math.random() * (GAME_CONFIG.MAP_SIZE - 100) + 50,
    y: Math.random() * (GAME_CONFIG.MAP_SIZE - 100) + 50,
    color: CANDY_COLORS[colorIndex],
    size,
    value: Math.floor(size / 2),
  };
}

export function getWormRadius(worm: Worm): number {
  const baseRadius = GAME_CONFIG.WORM_BASE_RADIUS;
  const growthFactor = Math.min(worm.segments.length / GAME_CONFIG.INITIAL_SEGMENTS, 3);
  return baseRadius * (0.8 + growthFactor * 0.2);
}

export function checkCandyCollision(worm: Worm, candy: Candy): boolean {
  const head = worm.segments[0];
  const wormRadius = getWormRadius(worm);
  return getDistance(head, candy) < wormRadius + candy.size;
}

export function checkWormCollision(worm1: Worm, worm2: Worm): boolean {
  if (worm1.id === worm2.id) return false;
  
  const head = worm1.segments[0];
  const worm1Radius = getWormRadius(worm1);
  
  // Check collision with body segments (skip first few to avoid self-collision issues)
  for (let i = 3; i < worm2.segments.length; i++) {
    const segment = worm2.segments[i];
    const segmentRadius = getWormRadius(worm2) * 0.8;
    if (getDistance(head, segment) < worm1Radius + segmentRadius - 4) {
      return true;
    }
  }
  
  return false;
}
