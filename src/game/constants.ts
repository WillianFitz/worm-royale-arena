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

export const WORM_COLORS = [
  { main: '#FF6B6B', glow: '#FF6B6B80' }, // Red
  { main: '#4ECDC4', glow: '#4ECDC480' }, // Teal
  { main: '#FFE66D', glow: '#FFE66D80' }, // Yellow
  { main: '#95E1D3', glow: '#95E1D380' }, // Mint
  { main: '#F38181', glow: '#F3818180' }, // Coral
  { main: '#AA96DA', glow: '#AA96DA80' }, // Purple
  { main: '#FCBAD3', glow: '#FCBAD380' }, // Pink
  { main: '#A8D8EA', glow: '#A8D8EA80' }, // Light Blue
  { main: '#FF9F43', glow: '#FF9F4380' }, // Orange
  { main: '#6BCB77', glow: '#6BCB7780' }, // Green
  { main: '#E056FD', glow: '#E056FD80' }, // Magenta
  { main: '#686DE0', glow: '#686DE080' }, // Indigo
  { main: '#F9CA24', glow: '#F9CA2480' }, // Gold
  { main: '#EB4D4B', glow: '#EB4D4B80' }, // Crimson
  { main: '#7ED6DF', glow: '#7ED6DF80' }, // Cyan
  { main: '#DDA0DD', glow: '#DDA0DD80' }, // Plum
  { main: '#98D8C8', glow: '#98D8C880' }, // Sea Green
  { main: '#F7DC6F', glow: '#F7DC6F80' }, // Lemon
  { main: '#BB8FCE', glow: '#BB8FCE80' }, // Lavender
  { main: '#F1948A', glow: '#F1948A80' }, // Salmon
];

export const CANDY_COLORS = [
  '#FF6B6B', '#FFE66D', '#4ECDC4', '#95E1D3', '#F38181',
  '#AA96DA', '#FCBAD3', '#A8D8EA', '#FF9F43', '#6BCB77',
];
