export interface Vector2D {
  x: number;
  y: number;
}

export interface WormSegment {
  x: number;
  y: number;
}

export interface Worm {
  id: string;
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
}
