// components/Game/GameLobby.jsx - Game mode selection screen (dashboard)
// Demonstrates High Cohesion: this component's only job is presenting game mode
// choices and letting the user navigate to the right game or competition.
// Demonstrates Event-Driven: each mode card's onClick triggers React Router navigation.
// Demonstrates Low Coupling: imports GAME_MODES config so UI reflects mode changes
// automatically without touching this component.

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { GAME_MODES } from "../../config/gameModes";

export default function GameLobby() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeGuide, setActiveGuide] = useState(null);

  const openGuide = (e, mode) => {
    e.stopPropagation();
    setActiveGuide(mode);
  };

  const closeGuide = () => setActiveGuide(null);

  return (
    <div className="lobby-container">
      {/* Hero welcome banner */}
      <div className="lobby-hero">
        <span className="lobby-hero-deco">♥</span>
        <span className="lobby-hero-deco">♡</span>
        <div className="lobby-hero-icon">🎮</div>
        <h1 className="lobby-title">
          Welcome back{user ? `, ${user.username}` : ""}!
        </h1>
        <p className="lobby-subtitle">
          Choose your game mode and start earning points ♥
        </p>
      </div>

      <p className="lobby-section-label">🎯 Game Modes</p>

      <div className="mode-grid">
        {Object.values(GAME_MODES).map((mode) => (
          // Event-Driven: onClick event navigates to the selected game mode route
          <div
            key={mode.id}
            className="mode-card"
            role="button"
            tabIndex={0}
            style={{ "--mode-accent": mode.accent, "--mode-glow": mode.glow }}
            onClick={() => navigate(`/game/${mode.id}`)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ")
                navigate(`/game/${mode.id}`);
            }}
          >
            {/* How-to-play info button */}
            <button
              className="mode-info-btn"
              title="How to play"
              onClick={(e) => openGuide(e, mode)}
            >
              ?
            </button>

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
          </div>
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

      {/* How-to-play popup */}
      {activeGuide && (
        <div className="guide-overlay" onClick={closeGuide}>
          <div
            className="guide-modal"
            style={{
              "--guide-accent": activeGuide.accent,
              "--guide-glow": activeGuide.glow,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button className="guide-close" onClick={closeGuide}>
              ×
            </button>

            {/* Header */}
            <div className="guide-header">
              <span className="guide-emoji">{activeGuide.emoji}</span>
              <div>
                <h2 className="guide-title">{activeGuide.label}</h2>
                <p className="guide-subtitle">How to play</p>
              </div>
            </div>

            {/* Steps */}
            <ol className="guide-steps">
              {activeGuide.howToPlay.map((step, i) => (
                <li key={i} className="guide-step">
                  <span className="guide-step-num">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>

            {/* Scoring */}
            <div className="guide-scoring">
              <span className="guide-scoring-label">🏆 Scoring</span>
              <span>{activeGuide.scoring}</span>
            </div>

            {/* Play CTA */}
            <button
              className="guide-play-btn"
              style={{
                background: `linear-gradient(135deg, ${activeGuide.accent}, #ff7eb3)`,
              }}
              onClick={() => {
                closeGuide();
                navigate(`/game/${activeGuide.id}`);
              }}
            >
              Play {activeGuide.label} ♥
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
