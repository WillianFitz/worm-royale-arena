import { Worm, WormSegment } from './types';

export interface MultiplayerCallbacks {
  onWelcome: (playerId: string, players: RemotePlayerState[]) => void;
  onPlayerJoined: (playerId: string) => void;
  onPlayerLeft: (playerId: string) => void;
  onGameState: (players: RemotePlayerState[]) => void;
  onPlayerDied: (playerId: string, segments: WormSegment[], color: string) => void;
  onConnected: () => void;
  onDisconnected: () => void;
  onError: (error: string) => void;
}

export interface RemotePlayerState {
  id: string;
  name: string;
  x: number;
  y: number;
  angle: number;
  segments: { x: number; y: number }[];
  color: string;
  glowColor: string;
  score: number;
  isBoosting: boolean;
  alive: boolean;
}

export class MultiplayerClient {
  private ws: WebSocket | null = null;
  private callbacks: MultiplayerCallbacks;
  private serverUrl: string;
  private playerId: string = '';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: number | null = null;
  private updateThrottle = 0;

  constructor(serverUrl: string, callbacks: MultiplayerCallbacks) {
    this.serverUrl = serverUrl;
    this.callbacks = callbacks;
  }

  connect(room: string = 'default') {
    const wsUrl = this.serverUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    this.ws = new WebSocket(`${wsUrl}/ws?room=${room}`);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.callbacks.onConnected();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    };

    this.ws.onclose = () => {
      this.callbacks.onDisconnected();
      this.tryReconnect(room);
    };

    this.ws.onerror = () => {
      this.callbacks.onError('Connection error');
    };
  }

  private tryReconnect(room: string) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
    this.reconnectTimer = window.setTimeout(() => this.connect(room), delay);
  }

  private handleMessage(data: any) {
    switch (data.type) {
      case 'welcome':
        this.playerId = data.playerId;
        this.callbacks.onWelcome(data.playerId, data.players || []);
        break;
      case 'player_joined':
        this.callbacks.onPlayerJoined(data.playerId);
        break;
      case 'player_left':
        this.callbacks.onPlayerLeft(data.playerId);
        break;
      case 'game_state':
        this.callbacks.onGameState(data.players || []);
        break;
      case 'player_died':
        this.callbacks.onPlayerDied(data.playerId, data.segments, data.color);
        break;
    }
  }

  getPlayerId(): string {
    return this.playerId;
  }

  sendJoin(worm: Worm) {
    this.send({
      type: 'join',
      name: worm.name,
      x: worm.segments[0]?.x || 0,
      y: worm.segments[0]?.y || 0,
      angle: worm.angle,
      segments: worm.segments,
      color: worm.color,
      glowColor: worm.glowColor,
    });
  }

  sendUpdate(worm: Worm) {
    // Throttle updates to ~20/s (every 3 frames at 60fps)
    this.updateThrottle++;
    if (this.updateThrottle % 3 !== 0) return;

    this.send({
      type: 'update',
      x: worm.segments[0]?.x || 0,
      y: worm.segments[0]?.y || 0,
      angle: worm.angle,
      segments: worm.segments.filter((_, i) => i % 2 === 0), // Send every other segment to reduce bandwidth
      isBoosting: worm.isBoosting,
      score: worm.score,
    });
  }

  sendDied() {
    this.send({ type: 'died' });
  }

  sendRespawn(worm: Worm) {
    this.send({
      type: 'respawn',
      x: worm.segments[0]?.x || 0,
      y: worm.segments[0]?.y || 0,
      segments: worm.segments,
    });
  }

  private send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
