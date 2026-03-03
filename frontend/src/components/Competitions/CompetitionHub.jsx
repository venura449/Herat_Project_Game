// components/Competitions/CompetitionHub.jsx - Create or join a competition
// Demonstrates Event-Driven Programming: form submit events trigger API calls
// and navigation to the competition room.
// Demonstrates Low Coupling: this component only knows about the competition API
// endpoint, not about how competitions are stored internally.

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../services/api";
import { GAME_MODES } from "../../config/gameModes";

export default function CompetitionHub() {
  const navigate = useNavigate();

  // ── Create form state ─────────────────────────────────────────────────
  const [createName, setCreateName] = useState("");
  const [createMode, setCreateMode] = useState("classic");
  // Memory Blindfold always runs 8 rounds; other modes use a chosen question count
  const MEMORY_ROUNDS = 8;
  const [createMaxQ, setCreateMaxQ] = useState(10);
  const isMemoryMode = createMode === "memory";
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // ── Join form state ───────────────────────────────────────────────────
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  // Event handler: create form submit
  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError("");
    setCreating(true);
    try {
      const res = await api.post("/competitions", {
        name: createName,
        mode: createMode,
        maxQuestions: isMemoryMode ? MEMORY_ROUNDS : createMaxQ,
      });
      navigate(`/competitions/${res.data.code}`);
    } catch (err) {
      setCreateError(
        err.response?.data?.error || "Failed to create competition.",
      );
      setCreating(false);
    }
  };

  // Event handler: join form submit
  const handleJoin = async (e) => {
    e.preventDefault();
    setJoinError("");
    if (!joinCode.trim()) return setJoinError("Enter a competition code.");
    setJoining(true);
    try {
      await api.post(`/competitions/${joinCode.trim().toUpperCase()}/join`);
      navigate(`/competitions/${joinCode.trim().toUpperCase()}`);
    } catch (err) {
      setJoinError(
        err.response?.data?.error || "Failed to join. Check the code.",
      );
      setJoining(false);
    }
  };

  return (
    <div className="hub-container">
      <Link to="/game" className="back-btn">
        ← Back to Lobby
      </Link>
      <h2 className="hub-title">⚔️ Competitions</h2>
      <p className="hub-subtitle">
        Create a private room or join one with a code.
      </p>

      <div className="hub-grid">
        {/* ── Create Competition ── */}
        <div className="hub-card">
          <h3>➕ Create a Room</h3>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label>Room Name</label>
              <input
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g. Friday Night Battle"
                required
              />
            </div>

            <div className="form-group">
              <label>Game Mode</label>
              <div className="mode-select-grid">
                {Object.values(GAME_MODES).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`mode-pill ${createMode === m.id ? "mode-pill-active" : ""}`}
                    style={
                      createMode === m.id
                        ? { borderColor: m.accent, color: m.accent }
                        : {}
                    }
                    onClick={() => setCreateMode(m.id)}
                  >
                    {m.emoji} {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Questions per Player</label>
              {isMemoryMode ? (
                <p className="hub-card-desc" style={{ marginBottom: 0 }}>
                  🫀 Memory Blindfold always runs <strong>8 rounds</strong>.
                </p>
              ) : (
                <div className="mode-select-grid">
                  {[5, 10, 15, 20].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`mode-pill ${
                        createMaxQ === n ? "mode-pill-active" : ""
                      }`}
                      onClick={() => setCreateMaxQ(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {createError && <p className="error-msg">{createError}</p>}

            <button
              type="submit"
              disabled={creating}
              className="btn-primary btn-full"
            >
              {creating ? "Creating…" : "Create Room"}
            </button>
          </form>
        </div>

        {/* ── Join Competition ── */}
        <div className="hub-card">
          <h3>🔑 Join a Room</h3>
          <p className="hub-card-desc">
            Got a code from a friend? Enter it below.
          </p>
          <form onSubmit={handleJoin}>
            <div className="form-group">
              <label>Competition Code</label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="e.g. ABC123"
                maxLength={6}
                style={{
                  letterSpacing: "0.3em",
                  fontSize: "1.3rem",
                  textAlign: "center",
                }}
                required
              />
            </div>
            {joinError && <p className="error-msg">{joinError}</p>}
            <button
              type="submit"
              disabled={joining}
              className="btn-primary btn-full"
            >
              {joining ? "Joining…" : "Join Room"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
