import { useState } from 'react';

interface StartScreenProps {
  onPlay: (name: string) => void;
}

const StartScreen = ({ onPlay }: StartScreenProps) => {
  const [name, setName] = useState(() => {
    return localStorage.getItem('worm_player_name') || '';
  });

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
      </div>
    </div>
  );
};

export default StartScreen;
