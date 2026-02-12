import { Vector2D, Worm, WormSegment, Candy, AbilityState, MapZone } from './types';
import { GAME_CONFIG, WORM_COLORS, CANDY_COLORS, ABILITY_CONFIG, ZONE_CONFIG } from './constants';

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

const AI_NAMES = [
  'Cobra Rei', 'Serpentina', 'Viper', 'Anaconda', 'Python',
  'Naja', 'Mamba', 'Cascavel', 'Jibóia', 'Sucuri',
  'Coral', 'Dragão', 'Basilisco', 'Hydra', 'Ouroboros',
  'Serpente', 'Jararaca', 'Titanoboa', 'Medusa', 'Apophis',
];

export function createDefaultAbilities(): AbilityState[] {
  return [
    {
      type: 'dash',
      cooldown: 0,
      maxCooldown: ABILITY_CONFIG.dash.cooldown,
      duration: 0,
      maxDuration: ABILITY_CONFIG.dash.duration,
      active: false,
      key: ABILITY_CONFIG.dash.key,
    },
    {
      type: 'invisible',
      cooldown: 0,
      maxCooldown: ABILITY_CONFIG.invisible.cooldown,
      duration: 0,
      maxDuration: ABILITY_CONFIG.invisible.duration,
      active: false,
      key: ABILITY_CONFIG.invisible.key,
    },
    {
      type: 'ghost',
      cooldown: 0,
      maxCooldown: ABILITY_CONFIG.ghost.cooldown,
      duration: 0,
      maxDuration: ABILITY_CONFIG.ghost.duration,
      active: false,
      key: ABILITY_CONFIG.ghost.key,
    },
    {
      type: 'shield',
      cooldown: 0,
      maxCooldown: ABILITY_CONFIG.shield.cooldown,
      duration: 0,
      maxDuration: ABILITY_CONFIG.shield.duration,
      active: false,
      key: ABILITY_CONFIG.shield.key,
    },
  ];
}

export function createWorm(isPlayer: boolean, index: number, playerName?: string): Worm {
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
    name: isPlayer ? (playerName || 'Jogador') : AI_NAMES[index % AI_NAMES.length],
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
    abilities: isPlayer ? createDefaultAbilities() : [],
    isInvisible: false,
    isGhost: false,
    hasShield: false,
    speedMultiplier: 1,
    buffTimer: 0,
    buffType: null,
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
  // Ghost worms pass through everything
  if (worm1.isGhost) return false;
  
  const head = worm1.segments[0];
  const worm1Radius = getWormRadius(worm1);
  
  for (let i = 3; i < worm2.segments.length; i++) {
    const segment = worm2.segments[i];
    const segmentRadius = getWormRadius(worm2) * 0.8;
    if (getDistance(head, segment) < worm1Radius + segmentRadius - 4) {
      return true;
    }
  }
  
  return false;
}

export function createMapZones(): MapZone[] {
  const zones: MapZone[] = [];
  const mapSize = GAME_CONFIG.MAP_SIZE;
  const margin = 300;

  const randPos = () => Math.random() * (mapSize - margin * 2) + margin;

  // Speed zones
  for (let i = 0; i < ZONE_CONFIG.speed.count; i++) {
    zones.push({
      id: generateId(), x: randPos(), y: randPos(),
      radius: ZONE_CONFIG.speed.radius, type: 'speed', pulsePhase: Math.random() * Math.PI * 2,
    });
  }

  // Mass zones
  for (let i = 0; i < ZONE_CONFIG.mass.count; i++) {
    zones.push({
      id: generateId(), x: randPos(), y: randPos(),
      radius: ZONE_CONFIG.mass.radius, type: 'mass', pulsePhase: Math.random() * Math.PI * 2,
    });
  }

  // Black holes
  for (let i = 0; i < ZONE_CONFIG.blackhole.count; i++) {
    zones.push({
      id: generateId(), x: randPos(), y: randPos(),
      radius: ZONE_CONFIG.blackhole.radius, type: 'blackhole', pulsePhase: Math.random() * Math.PI * 2,
    });
  }

  // Toxic zones
  for (let i = 0; i < ZONE_CONFIG.toxic.count; i++) {
    zones.push({
      id: generateId(), x: randPos(), y: randPos(),
      radius: ZONE_CONFIG.toxic.radius, type: 'toxic', pulsePhase: Math.random() * Math.PI * 2,
    });
  }

  // Portal pairs
  const portalCount = ZONE_CONFIG.portal.count;
  for (let i = 0; i < portalCount; i += 2) {
    const id1 = generateId();
    const id2 = generateId();
    zones.push({
      id: id1, x: randPos(), y: randPos(),
      radius: ZONE_CONFIG.portal.radius, type: 'portal',
      linkedPortalId: id2, pulsePhase: Math.random() * Math.PI * 2,
    });
    zones.push({
      id: id2, x: randPos(), y: randPos(),
      radius: ZONE_CONFIG.portal.radius, type: 'portal',
      linkedPortalId: id1, pulsePhase: Math.random() * Math.PI * 2,
    });
  }

  return zones;
}
