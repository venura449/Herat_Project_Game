// components/Game/Leaderboard.jsx - Public leaderboard
// Demonstrates Event-Driven: useEffect fires on component mount event,
// triggering the async data fetch. This is the React event-driven lifecycle.
// Demonstrates Interoperability: data is fetched from the backend REST API,
// which retrieved it from MongoDB - three systems interoperating via JSON/HTTP.

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";

const MEDALS = ["🥇", "🥈", "🥉"];
const RANK_CLASSES = ["rank-gold", "rank-silver", "rank-bronze"];

const TABS = [
  { key: "all", label: "🌐 All Modes" },
  { key: "classic", label: "♥ Classic" },
  { key: "blitz", label: "⚡ Blitz" },
  { key: "survival", label: "💀 Survival" },
  { key: "memory", label: "🫀 Memory" },
];

export default function Leaderboard() {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeMode, setActiveMode] = useState("all");

  // Re-fetch whenever the active tab changes
  useEffect(() => {
    setLoading(true);
    setError("");
    const url =
      activeMode === "all"
        ? "/scores/leaderboard"
        : `/scores/leaderboard?mode=${activeMode}`;
    api
      .get(url)
      .then((res) => setScores(res.data))
      .catch(() => setError("Failed to load leaderboard. Please refresh."))
      .finally(() => setLoading(false));
  }, [activeMode]);

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-header">
        <h2>🏆 Leaderboard</h2>
        <Link to="/game" className="btn-primary">
          Play Now
        </Link>
      </div>

      {/* Mode filter tabs */}
      <div className="lb-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`lb-tab${activeMode === tab.key ? " lb-tab-active" : ""}`}
            onClick={() => setActiveMode(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && <p className="loading">Loading leaderboard…</p>}
      {error && <p className="error-msg">{error}</p>}

      {!loading && !error && scores.length === 0 && (
        <p className="empty-msg">No scores yet — be the first to play!</p>
      )}

      {scores.length > 0 && (
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Score</th>
              <th>Questions</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((s, i) => (
              <tr key={i} className={RANK_CLASSES[i] || ""}>
                <td>{MEDALS[i] || i + 1}</td>
                <td>{s.username}</td>
                <td>
                  <strong>{s.score}</strong>
                </td>
                <td>{s.questionsAnswered}</td>
                <td>{new Date(s.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
