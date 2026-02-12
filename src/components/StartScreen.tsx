import { useState } from 'react';
import type { HallOfFameEntry } from './WormGame';

interface StartScreenProps {
  onPlay: (name: string) => void;
  hallOfFame: HallOfFameEntry[];
}

const StartScreen = ({ onPlay, hallOfFame }: StartScreenProps) => {
  const [name, setName] = useState(() => {
    return localStorage.getItem('worm_player_name') || '';
  });
  const [showHall, setShowHall] = useState(false);

  const handlePlay = () => {
    const playerName = name.trim() || 'Jogador';
    localStorage.setItem('worm_player_name', playerName);
    onPlay(playerName);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handlePlay();
  };

  return (
    <div className="start-screen">
      <div className="start-screen__content">
        <h1 className="start-screen__title">🐛 Worm Royale</h1>
        <p className="start-screen__subtitle">Coma, cresça e domine a arena!</p>

        <div className="start-screen__input-group">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 15))}
            onKeyDown={handleKeyDown}
            placeholder="Seu nome..."
            className="start-screen__input"
            maxLength={15}
            autoFocus
          />
        </div>

        <button onClick={handlePlay} className="start-screen__button">
          ▶ Jogar
        </button>

        <div className="start-screen__controls">
          <div className="start-screen__control">
            <span className="start-screen__key">🖱️</span>
            <span>Mouse para mover</span>
          </div>
          <div className="start-screen__control">
            <span className="start-screen__key">👆</span>
            <span>Clique para acelerar</span>
          </div>
        </div>

        {/* Hall of Fame Toggle Button - always visible */}
        <button
          onClick={() => setShowHall(!showHall)}
          className="hall-of-fame__toggle"
        >
          🏆 {showHall ? 'Fechar' : 'Sensações do Momento'}
        </button>

        {/* Hall of Fame Panel */}
        {showHall && (
          <div className="hall-of-fame">
            <h2 className="hall-of-fame__title">🏆 Hall da Fama</h2>
            {hallOfFame.length > 0 ? (
              <div className="hall-of-fame__list">
                {hallOfFame.map((entry, i) => (
                  <div key={i} className="hall-of-fame__entry">
                    <span className="hall-of-fame__rank">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                    </span>
                    <span
                      className="hall-of-fame__dot"
                      style={{ background: entry.color }}
                    />
                    <span className="hall-of-fame__name">{entry.name}</span>
                    <span className="hall-of-fame__score">{entry.score} pts</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="hall-of-fame__empty">
                Nenhum recorde ainda. Seja o primeiro! 🎯
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StartScreen;
