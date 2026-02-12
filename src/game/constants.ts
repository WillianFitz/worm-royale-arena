export const GAME_CONFIG = {
  MAP_SIZE: 4000,
  INITIAL_SEGMENTS: 10,
  MAX_SEGMENTS: 200,
  BASE_SPEED: 2,
  BOOST_SPEED: 4,
  SEGMENT_DISTANCE: 8,
  WORM_BASE_RADIUS: 12,
  CANDY_COUNT: 300,
  WORM_COUNT: 20,
  CANDY_RESPAWN_RATE: 0.02,
  AI_DIRECTION_CHANGE_INTERVAL: 60,
  GROWTH_RATE: 0.3,
};

export const ABILITY_CONFIG = {
  dash: {
    cooldown: 300,   // ~5s at 60fps
    duration: 12,    // short burst
    speedMultiplier: 5,
    key: '1',
  },
  invisible: {
    cooldown: 600,   // ~10s
    duration: 180,   // ~3s
    key: '2',
  },
  ghost: {
    cooldown: 480,   // ~8s
    duration: 60,    // ~1s
    key: '3',
  },
  shield: {
    cooldown: 720,   // ~12s
    duration: 120,   // ~2s
    repelRadius: 120,
    repelForce: 3,
    key: '4',
  },
};

export const ZONE_CONFIG = {
  speed: { radius: 120, color: '#00e5ff', speedMultiplier: 1.6, count: 4 },
  mass: { radius: 100, color: '#76ff03', massBonus: 2, count: 3 },
  blackhole: { radius: 150, color: '#7c4dff', pullForce: 0.8, count: 2 },
  toxic: { radius: 130, color: '#ff1744', shrinkRate: 0.03, count: 3 },
  portal: { radius: 60, color: '#ffab00', count: 4 }, // always even (pairs)
};

export const WORM_COLORS = [
  { main: '#FF6B6B', glow: '#FF6B6B80' },
  { main: '#4ECDC4', glow: '#4ECDC480' },
  { main: '#FFE66D', glow: '#FFE66D80' },
  { main: '#95E1D3', glow: '#95E1D380' },
  { main: '#F38181', glow: '#F3818180' },
  { main: '#AA96DA', glow: '#AA96DA80' },
  { main: '#FCBAD3', glow: '#FCBAD380' },
  { main: '#A8D8EA', glow: '#A8D8EA80' },
  { main: '#FF9F43', glow: '#FF9F4380' },
  { main: '#6BCB77', glow: '#6BCB7780' },
  { main: '#E056FD', glow: '#E056FD80' },
  { main: '#686DE0', glow: '#686DE080' },
  { main: '#F9CA24', glow: '#F9CA2480' },
  { main: '#EB4D4B', glow: '#EB4D4B80' },
  { main: '#7ED6DF', glow: '#7ED6DF80' },
  { main: '#DDA0DD', glow: '#DDA0DD80' },
  { main: '#98D8C8', glow: '#98D8C880' },
  { main: '#F7DC6F', glow: '#F7DC6F80' },
  { main: '#BB8FCE', glow: '#BB8FCE80' },
  { main: '#F1948A', glow: '#F1948A80' },
];

export const CANDY_COLORS = [
  '#FF6B6B', '#FFE66D', '#4ECDC4', '#95E1D3', '#F38181',
  '#AA96DA', '#FCBAD3', '#A8D8EA', '#FF9F43', '#6BCB77',
];
