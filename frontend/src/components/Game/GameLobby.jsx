// components/Game/GameLobby.jsx - Game mode selection screen
// Demonstrates High Cohesion: this component's only job is presenting game mode
// choices and letting the user navigate to the right game or competition.
// Demonstrates Event-Driven: each mode card's onClick triggers React Router navigation.
// Demonstrates Low Coupling: imports GAME_MODES config so UI reflects mode changes
// automatically without touching this component.

import { useNavigate, Link } from "react-router-dom";
import { GAME_MODES } from "../../config/gameModes";

export default function GameLobby() {
  const navigate = useNavigate();

  return (
    <div className="lobby-container">
      <h2 className="lobby-title">♥ Choose Your Game Mode</h2>
      <p className="lobby-subtitle">
        Each mode has a different aura, rules and scoring system.
      </p>

      <div className="mode-grid">
        {Object.values(GAME_MODES).map((mode) => (
          // Event-Driven: onClick event navigates to the selected game mode route
          <button
            key={mode.id}
            className="mode-card"
            style={{ "--mode-accent": mode.accent, "--mode-glow": mode.glow }}
            onClick={() => navigate(`/game/${mode.id}`)}
          >
            <span className="mode-emoji">{mode.emoji}</span>
            <h3 className="mode-name">{mode.label}</h3>
            <p className="mode-desc">{mode.description}</p>
            <p className="mode-scoring">{mode.scoring}</p>
            {mode.lives > 0 && (
              <p className="mode-tag">
                {"❤️".repeat(mode.lives)} {mode.lives} Lives
              </p>
            )}
            {mode.timeLimit > 0 && (
              <p className="mode-tag">⏱ {mode.timeLimit}s per question</p>
            )}
          </button>
        ))}
      </div>

      <div className="lobby-competition">
        <h3>⚔️ Compete with Friends</h3>
        <p>
          Create a private room, share the code, and race for the top score.
        </p>
        <Link to="/competitions" className="btn-primary btn-large">
          Go to Competitions
        </Link>
      </div>
    </div>
  );
}
