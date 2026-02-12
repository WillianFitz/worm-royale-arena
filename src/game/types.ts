export interface Vector2D {
  x: number;
  y: number;
}

export interface WormSegment {
  x: number;
  y: number;
}

export type AbilityType = 'dash' | 'invisible' | 'ghost' | 'shield';

export interface AbilityState {
  type: AbilityType;
  cooldown: number;       // remaining cooldown in frames
  maxCooldown: number;    // total cooldown frames
  duration: number;       // remaining active duration in frames
  maxDuration: number;    // total active duration frames
  active: boolean;
  key: string;            // keyboard key label
}

export interface Worm {
  id: string;
  name: string;
  segments: WormSegment[];
  color: string;
  glowColor: string;
  angle: number;
  speed: number;
  isBoosting: boolean;
  score: number;
  isPlayer: boolean;
  targetAngle: number;
  aiTimer: number;
  // Ability state
  abilities: AbilityState[];
  isInvisible: boolean;
  isGhost: boolean;
  hasShield: boolean;
  speedMultiplier: number;
  // Buff state
  buffTimer: number;
  buffType: MapZoneType | null;
}

export type MapZoneType = 'speed' | 'mass' | 'blackhole' | 'toxic' | 'portal';

export interface MapZone {
  id: string;
  x: number;
  y: number;
  radius: number;
  type: MapZoneType;
  linkedPortalId?: string; // for portal pairs
  pulsePhase: number;      // for animation
}

export interface Candy {
  id: string;
  x: number;
  y: number;
  color: string;
  size: number;
  value: number;
}

export interface GameState {
  worms: Worm[];
  candies: Candy[];
  camera: Vector2D;
  mapSize: number;
  gameOver: boolean;
  playerRank: number;
  mapZones: MapZone[];
}
