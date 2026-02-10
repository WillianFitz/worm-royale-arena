import { useRef, useEffect, useCallback, useState } from 'react';
import { GameEngine } from '@/game/GameEngine';
import { GameRenderer } from '@/game/GameRenderer';
import { MultiplayerClient } from '@/game/MultiplayerClient';

const WORKER_URL = 'https://worm-royale-backend.willian-fitzbr.workers.dev';

const WormGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameEngineRef = useRef<GameEngine | null>(null);
  const gameRendererRef = useRef<GameRenderer | null>(null);
  const multiplayerRef = useRef<MultiplayerClient | null>(null);
  const animationFrameRef = useRef<number>(0);
  const [isReady, setIsReady] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [playerCount, setPlayerCount] = useState(0);

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
        gameEngineRef.current.reset();
        // Re-join multiplayer
        const player = gameEngineRef.current.getPlayerWorm();
        if (player) {
          multiplayerRef.current?.sendRespawn(player);
        }
      } else {
        gameEngineRef.current?.setMouseDown(true);
      }
    }
  }, []);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (e.button === 0) {
      gameEngineRef.current?.setMouseDown(false);
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    gameEngineRef.current?.setMousePosition(touch.clientX, touch.clientY);
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    e.preventDefault();
    if (gameEngineRef.current?.isGameOver()) {
      gameEngineRef.current.reset();
      const player = gameEngineRef.current.getPlayerWorm();
      if (player) {
        multiplayerRef.current?.sendRespawn(player);
      }
    } else {
      const touch = e.touches[0];
      gameEngineRef.current?.setMousePosition(touch.clientX, touch.clientY);
      gameEngineRef.current?.setMouseDown(true);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    gameEngineRef.current?.setMouseDown(false);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const engine = new GameEngine(canvas.width, canvas.height);
    gameEngineRef.current = engine;
    gameRendererRef.current = new GameRenderer(ctx, canvas.width, canvas.height);

    // Setup multiplayer
    const mp = new MultiplayerClient(WORKER_URL, {
      onWelcome: (playerId, players) => {
        engine.enableMultiplayer(playerId, () => {
          mp.sendDied();
        });
        engine.updateRemotePlayers(players);
        // Send join with player worm data
        const player = engine.getPlayerWorm();
        if (player) {
          mp.sendJoin(player);
        }
        setPlayerCount(players.filter(p => p.alive).length + 1);
      },
      onPlayerJoined: () => {
        setPlayerCount(prev => prev + 1);
      },
      onPlayerLeft: (playerId) => {
        setPlayerCount(prev => Math.max(1, prev - 1));
      },
      onGameState: (players) => {
        engine.updateRemotePlayers(players);
        setPlayerCount(players.filter(p => p.alive).length + 1);
      },
      onPlayerDied: (playerId, segments, color) => {
        // Candies from dead remote player are already handled by server broadcast
      },
      onConnected: () => {
        setConnectionStatus('connected');
      },
      onDisconnected: () => {
        setConnectionStatus('disconnected');
      },
      onError: (error) => {
        console.error('Multiplayer error:', error);
        setConnectionStatus('disconnected');
      },
    });

    multiplayerRef.current = mp;
    mp.connect();
    setIsReady(true);

    // Event listeners
    window.addEventListener('resize', handleResize);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Game loop
    const gameLoop = () => {
      engine.update();
      const state = engine.getState();
      if (state) {
        gameRendererRef.current?.render(state);
      }
      // Send player position to server
      const player = engine.getPlayerWorm();
      if (player && mp.isConnected()) {
        mp.sendUpdate(player);
      }
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchend', handleTouchEnd);
      cancelAnimationFrame(animationFrameRef.current);
      mp.disconnect();
    };
  }, [handleResize, handleMouseMove, handleMouseDown, handleMouseUp, handleTouchMove, handleTouchStart, handleTouchEnd]);

  return (
    <div className="game-container">
      <canvas
        ref={canvasRef}
        className="game-canvas"
      />
      {/* Connection status indicator */}
      <div style={{
        position: 'fixed',
        top: 10,
        left: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'rgba(0,0,0,0.6)',
        padding: '6px 12px',
        borderRadius: 20,
        color: '#fff',
        fontSize: 13,
        fontFamily: 'sans-serif',
        zIndex: 100,
        pointerEvents: 'none',
      }}>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: connectionStatus === 'connected' ? '#6BCB77' : 
                      connectionStatus === 'connecting' ? '#FFE66D' : '#FF6B6B',
        }} />
        <span>
          {connectionStatus === 'connected' ? `Online • ${playerCount} jogadores` :
           connectionStatus === 'connecting' ? 'Conectando...' : 'Offline'}
        </span>
      </div>
      {!isReady && (
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Carregando...</p>
        </div>
      )}
    </div>
  );
};

export default WormGame;
