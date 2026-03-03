// components/Competitions/CompetitionRoom.jsx - Live competition play + standings
//
// Demonstrates EVENT-DRIVEN PROGRAMMING:
//   - Polling with setInterval fires a 'fetch competition' event every 3 seconds
//   - Status transitions (waiting → active → completed) trigger UI state changes
//   - onComplete callback from GameBoard fires when the player finishes
//
// Demonstrates LOW COUPLING:
//   - This component doesn't know HOW GameBoard works — it just passes props + callback
//   - Competition data fetching is isolated to API calls, not embedded in UI logic
//
// Demonstrates INTEROPERABILITY:
//   - Uses REST polling to sync competition state across multiple clients
//   - All data exchanged as JSON between React frontend and Express backend
//
// Demonstrates VIRTUAL IDENTITY:
//   - Creator is identified via competition.createdBy matched to user context
//   - Each player can only submit once (server enforces this)

import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { GAME_MODES } from "../../config/gameModes";
import GameBoard from "../Game/GameBoard";
import api from "../../services/api";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function CompetitionRoom() {
  const { code } = useParams();
  const { user } = useAuth();
  const [comp, setComp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState("loading"); // 'loading' | 'waiting' | 'playing' | 'done'
  const [starting, setStarting] = useState(false);

  // Finds the current user's participant entry in the competition
  const myEntry = comp?.participants.find((p) => p.userId === user?.userId);
  const hasSubmitted = myEntry?.completedAt != null;
  const isCreator = comp?.createdBy === user?.userId;
  const modeConfig = comp ? GAME_MODES[comp.mode] || GAME_MODES.classic : null;

  // ── Fetch competition state (used for initial load + polling) ──────────
  const fetchComp = useCallback(async () => {
    try {
      const res = await api.get(`/competitions/${code}`);
      setComp(res.data);
      // Derive phase from competition status + user submission state
      if (res.data.status === "waiting") {
        setPhase("waiting");
      } else if (res.data.status === "active") {
        const me = res.data.participants.find((p) => p.userId === user?.userId);
        setPhase(me?.completedAt ? "done" : "playing");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load competition.");
    } finally {
      setLoading(false);
    }
  }, [code, user?.userId]);

  // Initial load + join
  useEffect(() => {
    const init = async () => {
      try {
        // Auto-join when landing on this page
        await api.post(`/competitions/${code}/join`);
      } catch {
        // Ignore if already joined
      }
      await fetchComp();
    };
    init();
  }, [code, fetchComp]);

  // ── Polling: re-fetches every 3s while waiting or watching standings ──
  // This is an example of event-driven timing: the interval fires an event
  // that updates the component's state, causing a reactive re-render.
  useEffect(() => {
    if (phase === "playing") return; // Don't poll during active game
    const interval = setInterval(fetchComp, 3000);
    return () => clearInterval(interval); // Cleanup: unsubscribe from timer event
  }, [phase, fetchComp]);

  // ── Creator starts the competition ────────────────────────────────────
  const handleStart = async () => {
    setStarting(true);
    try {
      await api.post(`/competitions/${code}/start`);
      await fetchComp();
    } catch (err) {
      setError(err.response?.data?.error || "Could not start competition.");
    } finally {
      setStarting(false);
    }
  };

  // ── GameBoard calls this when the player finishes their game ──────────
  // This is the onComplete event fired by the GameBoard component.
  const handleGameComplete = async (score, questionsAnswered) => {
    try {
      await api.post(`/competitions/${code}/submit`, {
        score,
        questionsAnswered,
      });
    } catch {
      // Score submit failure is non-fatal — local game state is preserved
    }
    setPhase("done");
    fetchComp(); // Refresh standings immediately
  };

  // ── Sorted standings (completed players first, by score) ─────────────
  const standings =
    comp?.participants
      .filter((p) => p.completedAt != null)
      .sort((a, b) => b.score - a.score) || [];

  const waiting = comp?.participants.filter((p) => p.completedAt == null) || [];

  if (loading) return <div className="loading">Loading competition…</div>;
  if (error && !comp)
    return (
      <div className="auth-container">
        <div className="auth-card">
          <p className="error-msg">{error}</p>
          <Link to="/competitions" className="btn-primary">
            Back
          </Link>
        </div>
      </div>
    );

  return (
    <div className="room-container">
      {/* ── Back to competitions list ── */}
      <Link to="/competitions" className="back-btn">
        ← Back to Competitions
      </Link>
      {/* ── Competition header ── */}
      <div className="room-header" style={{ borderColor: modeConfig?.accent }}>
        <div>
          <h2 style={{ color: modeConfig?.accent }}>
            {modeConfig?.emoji} {comp.name}
          </h2>
          <p className="room-meta">
            Mode: <strong>{modeConfig?.label}</strong> · Questions:{" "}
            <strong>{comp.maxQuestions}</strong> · Code:{" "}
            <strong className="room-code">{comp.code}</strong>
          </p>
        </div>
        <span className={`room-status ${comp.status}`}>
          {comp.status === "waiting" ? "⏳ Waiting" : "🟢 Active"}
        </span>
      </div>

      {error && <p className="error-msg">{error}</p>}

      {/* ═══ WAITING PHASE ═══ */}
      {phase === "waiting" && (
        <div className="room-waiting">
          <h3>Players in Room</h3>
          <ul className="player-list">
            {comp.participants.map((p) => (
              <li key={p.userId}>
                👤 {p.username}
                {p.userId === comp.createdBy && (
                  <span className="badge-host">Host</span>
                )}
                {p.userId === user?.userId && (
                  <span className="badge-you">You</span>
                )}
              </li>
            ))}
          </ul>
          <p className="room-hint">
            Share code <strong>{comp.code}</strong> with friends to invite them.
          </p>
          {isCreator ? (
            <button
              onClick={handleStart}
              disabled={starting}
              className="btn-primary btn-large"
              style={{ background: modeConfig?.accent }}
            >
              {starting ? "Starting…" : "▶ Start Competition"}
            </button>
          ) : (
            <p className="room-waiting-msg">
              ⏳ Waiting for the host to start…
            </p>
          )}
        </div>
      )}

      {/* ═══ PLAYING PHASE — render the GameBoard ═══ */}
      {phase === "playing" && (
        <GameBoard
          mode={comp.mode}
          maxQuestions={comp.maxQuestions}
          onComplete={handleGameComplete}
        />
      )}

      {/* ═══ DONE PHASE — show standings ═══ */}
      {phase === "done" && (
        <div className="room-done">
          <p className="save-confirm">✓ Your score has been submitted!</p>

          <div className="standings">
            <h3>🏆 Standings</h3>

            {standings.length > 0 && (
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th>Score</th>
                    <th>Questions</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((p, i) => (
                    <tr
                      key={p.userId}
                      className={
                        i < 3
                          ? ["rank-gold", "rank-silver", "rank-bronze"][i]
                          : ""
                      }
                    >
                      <td>{MEDALS[i] || i + 1}</td>
                      <td>
                        {p.username}
                        {p.userId === user?.userId && (
                          <span className="badge-you">You</span>
                        )}
                      </td>
                      <td>
                        <strong>{p.score}</strong>
                      </td>
                      <td>{p.questionsAnswered}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {waiting.length > 0 && (
              <p className="room-hint">
                ⏳ Still playing: {waiting.map((p) => p.username).join(", ")}
              </p>
            )}
          </div>

          <div className="gameover-actions">
            <Link
              to="/game"
              className="btn-primary btn-link"
              style={{ background: modeConfig?.accent }}
            >
              Play More
            </Link>
            <Link to="/competitions" className="btn-secondary btn-link">
              New Competition
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
