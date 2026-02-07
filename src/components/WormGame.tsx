import { useRef, useEffect, useCallback, useState } from 'react';
import { GameEngine } from '@/game/GameEngine';
import { GameRenderer } from '@/game/GameRenderer';

const WormGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameEngineRef = useRef<GameEngine | null>(null);
  const gameRendererRef = useRef<GameRenderer | null>(null);
  const animationFrameRef = useRef<number>(0);
  const [isReady, setIsReady] = useState(false);

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

    // Initialize
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    gameEngineRef.current = new GameEngine(canvas.width, canvas.height);
    gameRendererRef.current = new GameRenderer(ctx, canvas.width, canvas.height);
    setIsReady(true);

    // Event listeners
    window.addEventListener('resize', handleResize);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);

    // Prevent context menu
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Game loop
    const gameLoop = () => {
      gameEngineRef.current?.update();
      const state = gameEngineRef.current?.getState();
      if (state) {
        gameRendererRef.current?.render(state);
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
    };
  }, [handleResize, handleMouseMove, handleMouseDown, handleMouseUp, handleTouchMove, handleTouchStart, handleTouchEnd]);

  return (
    <div className="game-container">
      <canvas
        ref={canvasRef}
        className="game-canvas"
      />
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
