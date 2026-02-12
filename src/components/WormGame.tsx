import { useRef, useEffect, useCallback, useState } from 'react';
import { GameEngine } from '@/game/GameEngine';
import { GameRenderer } from '@/game/GameRenderer';
import { MultiplayerClient } from '@/game/MultiplayerClient';
import StartScreen from '@/components/StartScreen';

const WORKER_URL = 'https://worm-royale-backend.willian-fitzbr.workers.dev';

export interface HallOfFameEntry {
  name: string;
  score: number;
  color: string;
}

function loadHallOfFame(): HallOfFameEntry[] {
  try {
    return JSON.parse(localStorage.getItem('worm_hall_of_fame') || '[]');
  } catch { return []; }
}

function saveToHallOfFame(entry: HallOfFameEntry) {
  const hall = loadHallOfFame();
  hall.push(entry);
  hall.sort((a, b) => b.score - a.score);
  const top10 = hall.slice(0, 10);
  localStorage.setItem('worm_hall_of_fame', JSON.stringify(top10));
  return top10;
}

const WormGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameEngineRef = useRef<GameEngine | null>(null);
  const gameRendererRef = useRef<GameRenderer | null>(null);
  const multiplayerRef = useRef<MultiplayerClient | null>(null);
  const animationFrameRef = useRef<number>(0);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [playerCount, setPlayerCount] = useState(0);
  const [hallOfFame, setHallOfFame] = useState<HallOfFameEntry[]>(loadHallOfFame());

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gameEngineRef.current?.updateCanvasSize(canvas.width, canvas.height);
    gameRendererRef.current?.updateSize(canvas.width, canvas.height);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    gameEngineRef.current?.setMousePosition(e.clientX, e.clientY);
  }, []);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (e.button === 0) {
      if (gameEngineRef.current?.isGameOver()) {
        // Save score to hall of fame
        const player = gameEngineRef.current.getPlayerWorm();
        if (player) {
          const updated = saveToHallOfFame({ name: player.name, score: player.segments.length, color: player.color });
          setHallOfFame(updated);
        }
        gameEngineRef.current.reset();
        const newPlayer = gameEngineRef.current.getPlayerWorm();
        if (newPlayer) multiplayerRef.current?.sendRespawn(newPlayer);
      } else {
        gameEngineRef.current?.setMouseDown(true);
      }
    }
  }, []);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (e.button === 0) gameEngineRef.current?.setMouseDown(false);
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    gameEngineRef.current?.setMousePosition(touch.clientX, touch.clientY);
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    e.preventDefault();
    if (gameEngineRef.current?.isGameOver()) {
      const player = gameEngineRef.current.getPlayerWorm();
      if (player) {
        const updated = saveToHallOfFame({ name: player.name, score: player.segments.length, color: player.color });
        setHallOfFame(updated);
      }
      gameEngineRef.current.reset();
      const newPlayer = gameEngineRef.current.getPlayerWorm();
      if (newPlayer) multiplayerRef.current?.sendRespawn(newPlayer);
    } else {
      const touch = e.touches[0];
      gameEngineRef.current?.setMousePosition(touch.clientX, touch.clientY);
      gameEngineRef.current?.setMouseDown(true);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    gameEngineRef.current?.setMouseDown(false);
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const key = e.key;
    if (key >= '1' && key <= '4') {
      gameEngineRef.current?.activateAbility(parseInt(key) - 1);
    }
  }, []);

  const stopGame = useCallback(() => {
    // Save current score before exiting
    const player = gameEngineRef.current?.getPlayerWorm();
    if (player && player.segments.length > 10) {
      const updated = saveToHallOfFame({ name: player.name, score: player.segments.length, color: player.color });
      setHallOfFame(updated);
    }
    
    cleanupRef.current?.();
    cleanupRef.current = null;
    cancelAnimationFrame(animationFrameRef.current);
    // Send died notification so other players see us leave
    multiplayerRef.current?.sendDied();
    // Small delay to let the message send before closing
    setTimeout(() => {
      multiplayerRef.current?.disconnect();
      multiplayerRef.current = null;
    }, 100);

    gameEngineRef.current = null;
    gameRendererRef.current = null;
    setGameStarted(false);
    setConnectionStatus('connecting');
    setPlayerCount(0);
  }, []);

  const startGame = useCallback((playerName: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const engine = new GameEngine(canvas.width, canvas.height, playerName);
    gameEngineRef.current = engine;
    gameRendererRef.current = new GameRenderer(ctx, canvas.width, canvas.height);

    const mp = new MultiplayerClient(WORKER_URL, {
      onWelcome: (playerId, players) => {
        engine.enableMultiplayer(playerId, () => mp.sendDied());
        engine.updateRemotePlayers(players);
        const player = engine.getPlayerWorm();
        if (player) mp.sendJoin(player);
        setPlayerCount(players.filter(p => p.alive).length + 1);
      },
      onPlayerJoined: () => setPlayerCount(prev => prev + 1),
      onPlayerLeft: () => setPlayerCount(prev => Math.max(1, prev - 1)),
      onGameState: (players) => {
        // Only count alive players for player count
        const alivePlayers = players.filter(p => p.alive);
        engine.updateRemotePlayers(alivePlayers);
        setPlayerCount(alivePlayers.length + 1);
        // Track high scores from online players
        alivePlayers.forEach(p => {
          if (p.segments.length > 30) {
            const existing = loadHallOfFame();
            const alreadyTracked = existing.some(e => e.name === p.name && e.score >= p.segments.length);
            if (!alreadyTracked && p.segments.length > (existing[existing.length - 1]?.score || 0)) {
              const updated = saveToHallOfFame({ name: p.name, score: p.segments.length, color: p.color });
              setHallOfFame(updated);
            }
          }
        });
      },
      onPlayerDied: () => {},
      onConnected: () => setConnectionStatus('connected'),
      onDisconnected: () => setConnectionStatus('disconnected'),
      onError: (error) => {
        console.error('Multiplayer error:', error);
        setConnectionStatus('disconnected');
      },
    });

    multiplayerRef.current = mp;
    mp.connect();

    const contextMenuHandler = (e: Event) => e.preventDefault();

    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('contextmenu', contextMenuHandler);

    cleanupRef.current = () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('contextmenu', contextMenuHandler);
    };

    const gameLoop = () => {
      engine.update();
      const state = engine.getState();
      if (state) gameRendererRef.current?.render(state);
      const player = engine.getPlayerWorm();
      if (player && mp.isConnected()) mp.sendUpdate(player);
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoop();
    setGameStarted(true);
  }, [handleResize, handleMouseMove, handleMouseDown, handleMouseUp, handleTouchMove, handleTouchStart, handleTouchEnd, handleKeyDown]);

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
      cancelAnimationFrame(animationFrameRef.current);
      multiplayerRef.current?.disconnect();
    };
  }, []);

  if (!gameStarted) {
    return (
      <div className="game-container">
        <canvas ref={canvasRef} className="game-canvas" style={{ display: 'none' }} />
        <StartScreen onPlay={startGame} hallOfFame={hallOfFame} />
      </div>
    );
  }

  return (
    <div className="game-container">
      <canvas ref={canvasRef} className="game-canvas" />
      {/* Exit button */}
      <button
        onClick={stopGame}
        className="game-exit-button"
        title="Sair para o lobby"
      >
        ✕
      </button>
      {/* Connection status */}
      <div style={{
        position: 'fixed', top: 10, left: 10,
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(0,0,0,0.6)', padding: '6px 12px',
        borderRadius: 20, color: '#fff', fontSize: 13,
        fontFamily: 'sans-serif', zIndex: 100, pointerEvents: 'none',
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: connectionStatus === 'connected' ? '#6BCB77' :
                      connectionStatus === 'connecting' ? '#FFE66D' : '#FF6B6B',
        }} />
        <span>
          {connectionStatus === 'connected' ? `Online • ${playerCount} jogadores` :
           connectionStatus === 'connecting' ? 'Conectando...' : 'Offline'}
        </span>
      </div>
    </div>
  );
};

export default WormGame;
