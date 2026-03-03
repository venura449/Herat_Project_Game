// MemoryGame.jsx - Memory Blindfold game mode
//
// Gameplay:
//   1. [SHOWING]  Hearts appear on the board for a few seconds — memorise them!
//   2. [RECALL]   Hearts vanish. Click on exactly 20% of the positions.
//   3. [REVEAL]   Correct clicks turn green, misses turn red; hearts reappear.
//   4. Repeat for TOTAL_ROUNDS rounds (harder each round).
//
// Low Coupling: standalone component; only shared deps are the api client and App.css.
// Event-Driven: click events → handleClick; timer ticks → phase transition (SHOWING→RECALL).
// Virtual Identity: score is posted to /api/scores protected by JWT cookie.

import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";

// ── Constants ──────────────────────────────────────────────────────────────
const PHASE = {
  IDLE: "idle",
  SHOWING: "showing",
  RECALL: "recall",
  REVEAL: "reveal",
  GAMEOVER: "gameover",
};

const HIT_PX = 46; // pixel-radius for a "hit" (before pct conversion)
const TOTAL_ROUNDS = 8;

// ── Helpers ────────────────────────────────────────────────────────────────

/** Generate `count` heart positions (xPct, yPct in 0-100 range), spaced apart */
function makeHearts(count) {
  const hearts = [];
  for (let i = 0; i < count; i++) {
    let p,
      tries = 0;
    do {
      p = {
        xPct: 5 + Math.random() * 90,
        yPct: 5 + Math.random() * 90,
      };
      tries++;
    } while (
      tries < 60 &&
      hearts.some((h) => Math.hypot(h.xPct - p.xPct, h.yPct - p.yPct) < 11)
    );
    hearts.push(p);
  }
  return hearts;
}

/** Per-round configuration — gets harder each round */
function roundCfg(r) {
  const total = Math.min(8 + (r - 1) * 3, 28); // more hearts each round
  return {
    total,
    target: Math.max(1, Math.floor(total * 0.2)), // 20% of hearts to mark
    secs: Math.max(1.5, 3.5 - (r - 1) * 0.25), // shorter flash time
    pts: 50 + (r - 1) * 10, // more pts per hit later
  };
}

// ── Component ──────────────────────────────────────────────────────────────
/**
 * @param {Function} [onComplete] - Called with (score, rounds) when the game ends.
 *   When provided (e.g. inside CompetitionRoom), the component skips saving to
 *   /api/scores (the competition room handles submission) and hides the back button.
 */
export default function MemoryGame({ onComplete }) {
  const [phase, setPhase] = useState(PHASE.IDLE);
  const [round, setRound] = useState(1);
  const [hearts, setHearts] = useState([]);
  const [clicks, setClicks] = useState([]);
  const [clickResults, setClickResults] = useState([]); // true/false per click (REVEAL only)
  const [timeLeft, setTimeLeft] = useState(0);
  const [roundResult, setRoundResult] = useState({ hits: 0, pts: 0 });
  const [totalScore, setTotalScore] = useState(0);
  const [totalHits, setTotalHits] = useState(0);
  const [totalClicks, setTotalClicks] = useState(0);
  const [scoreSaved, setScoreSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  const timerRef = useRef(null);
  const areaRef = useRef(null);
  const evaluatingRef = useRef(false); // prevents double-evaluation on fast clicks
  // Accumulator ref avoids stale-closure issues when saving the final score
  const accRef = useRef({ score: 0, hits: 0, clicks: 0 });

  // Cleanup interval on unmount
  useEffect(() => () => clearInterval(timerRef.current), []);

  // ── Start / restart a round ──────────────────────────────────────────────
  const startRound = (r) => {
    clearInterval(timerRef.current);
    evaluatingRef.current = false;

    const cfg = roundCfg(r);
    setRound(r);
    setHearts(makeHearts(cfg.total));
    setClicks([]);
    setClickResults([]);
    setPhase(PHASE.SHOWING);

    let rem = cfg.secs;
    setTimeLeft(Math.ceil(rem));
    timerRef.current = setInterval(() => {
      rem -= 0.25;
      setTimeLeft(Math.ceil(Math.max(0, rem)));
      if (rem <= 0) {
        clearInterval(timerRef.current);
        setPhase(PHASE.RECALL);
      }
    }, 250);
  };

  // ── Handle a click on the play area ─────────────────────────────────────
  const handleClick = (e) => {
    if (phase !== PHASE.RECALL || evaluatingRef.current) return;
    const cfg = roundCfg(round);
    if (clicks.length >= cfg.target) return;

    const rect = areaRef.current.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;

    const newClicks = [...clicks, { xPct, yPct }];
    setClicks(newClicks);

    if (newClicks.length >= cfg.target) {
      evaluatingRef.current = true;
      evalRound(newClicks, hearts, cfg, rect);
    }
  };

  // ── Evaluate hits and transition to REVEAL ───────────────────────────────
  const evalRound = (finalClicks, currentHearts, cfg, rect) => {
    // Convert HIT_PX to percentage space so comparison works across screen sizes
    const hitX = (HIT_PX / rect.width) * 100;
    const hitY = (HIT_PX / rect.height) * 100;

    const results = finalClicks.map((c) =>
      currentHearts.some((h) => {
        const dx = (h.xPct - c.xPct) / hitX;
        const dy = (h.yPct - c.yPct) / hitY;
        return Math.hypot(dx, dy) <= 1; // within elliptic hit zone
      }),
    );

    const hits = results.filter(Boolean).length;
    const pts = hits * cfg.pts;

    // Update accumulators synchronously so endGame always reads fresh values
    accRef.current = {
      score: accRef.current.score + pts,
      hits: accRef.current.hits + hits,
      clicks: accRef.current.clicks + finalClicks.length,
    };

    setClickResults(results);
    setRoundResult({ hits, pts });
    setTotalScore(accRef.current.score);
    setTotalHits(accRef.current.hits);
    setTotalClicks(accRef.current.clicks);
    setPhase(PHASE.REVEAL);
  };

  // ── Next round / finish ──────────────────────────────────────────────────
  const doNextRound = () => {
    if (round >= TOTAL_ROUNDS) {
      doEndGame();
    } else {
      startRound(round + 1);
    }
  };

  const doEndGame = async () => {
    clearInterval(timerRef.current);
    setPhase(PHASE.GAMEOVER);
    const { score, clicks: totalC } = accRef.current;

    if (onComplete) {
      // Embedded in a competition — let CompetitionRoom handle submission
      onComplete(score, TOTAL_ROUNDS);
      return;
    }

    if (totalC > 0) {
      try {
        await api.post("/scores", {
          score,
          questionsAnswered: TOTAL_ROUNDS,
          gameMode: "memory",
        });
        setScoreSaved(true);
      } catch {
        setSaveError("Could not save score to leaderboard.");
      }
    }
  };

  // ── Full reset ───────────────────────────────────────────────────────────
  const restart = () => {
    clearInterval(timerRef.current);
    evaluatingRef.current = false;
    accRef.current = { score: 0, hits: 0, clicks: 0 };
    setPhase(PHASE.IDLE);
    setRound(1);
    setHearts([]);
    setClicks([]);
    setClickResults([]);
    setTotalScore(0);
    setTotalHits(0);
    setTotalClicks(0);
    setScoreSaved(false);
    setSaveError("");
  };

  // ── Derived state for render ─────────────────────────────────────────────
  const cfg = roundCfg(round);
  const isShowing = phase === PHASE.SHOWING;
  const isRecall = phase === PHASE.RECALL;
  const isReveal = phase === PHASE.REVEAL;
  const showArea = isShowing || isRecall || isReveal;

  const accent = "#ff4d8d";

  return (
    <div
      className="game-container memory-wrap"
      style={{
        boxShadow: `0 0 40px rgba(255,77,141,0.22)`,
        borderColor: accent,
      }}
    >
      {!onComplete && (
        <Link to="/game" className="back-btn">
          ← Back to Lobby
        </Link>
      )}

      {/* ── Header ── */}
      <div className="game-header">
        <h2 style={{ color: accent }}>🫀 Memory Blindfold</h2>
        <div className="game-stats">
          <span>
            Score: <strong>{totalScore}</strong>
          </span>
          <span>
            Round:{" "}
            <strong>
              {round}/{TOTAL_ROUNDS}
            </strong>
          </span>
          {isShowing && (
            <span className="countdown" style={{ color: accent }}>
              👁 {timeLeft}s
            </span>
          )}
        </div>
      </div>

      {/* ── IDLE ── */}
      {phase === PHASE.IDLE && (
        <div className="game-start">
          <p>Hearts flash on the board — memorise where they are!</p>
          <p>
            Then they vanish. Click on <strong>20% of the positions</strong>{" "}
            where hearts were hiding. 🫀
          </p>
          <p className="score-hint">
            50–120 pts per correct click · {TOTAL_ROUNDS} rounds · Flash time
            shrinks each round
          </p>
          <button
            className="btn-primary btn-large"
            style={{ background: accent }}
            onClick={() => startRound(1)}
          >
            Start Game
          </button>
        </div>
      )}

      {/* ── Play area (SHOWING / RECALL / REVEAL) ── */}
      {showArea && (
        <>
          {/* Phase instruction banner */}
          <p className="memory-instruction">
            {isShowing && (
              <>
                👁&nbsp;Memorise!&nbsp;
                <strong>{timeLeft}s</strong> remaining &nbsp;·&nbsp;
                <span style={{ color: "#a0a0c0" }}>
                  {cfg.total} hearts shown · you will mark {cfg.target}
                </span>
              </>
            )}
            {isRecall && (
              <>
                🙈&nbsp;Hearts hidden! Click&nbsp;
                <strong style={{ color: accent }}>
                  {cfg.target - clicks.length}
                </strong>
                &nbsp;more position
                {cfg.target - clicks.length !== 1 ? "s" : ""}
              </>
            )}
            {isReveal && (
              <span
                className={roundResult.hits > 0 ? "reveal-good" : "reveal-bad"}
              >
                {roundResult.hits}/{cfg.target} correct! +{roundResult.pts} pts
              </span>
            )}
          </p>

          {/* Board */}
          <div
            ref={areaRef}
            className={`memory-area${isRecall ? " memory-recall" : ""}`}
            onClick={handleClick}
          >
            {/* Subtle grid overlay for spatial reference */}
            <div className="memory-grid" aria-hidden="true" />

            {/* Hearts – hidden during RECALL */}
            {hearts.map((h, i) => (
              <span
                key={i}
                className={`mheart${isRecall ? " mheart-hidden" : ""}`}
                style={{ left: h.xPct + "%", top: h.yPct + "%" }}
                aria-hidden="true"
              >
                🫀
              </span>
            ))}

            {/* Click markers */}
            {clicks.map((c, i) => (
              <span
                key={"c" + i}
                className={`mclick ${
                  isReveal
                    ? clickResults[i]
                      ? "mclick-hit"
                      : "mclick-miss"
                    : "mclick-pending"
                }`}
                style={{ left: c.xPct + "%", top: c.yPct + "%" }}
                aria-hidden="true"
              />
            ))}
          </div>

          {/* REVEAL actions */}
          {isReveal && (
            <div className="memory-reveal-actions">
              <button
                className="btn-primary"
                style={{ background: accent }}
                onClick={doNextRound}
              >
                {round < TOTAL_ROUNDS ? "Next Round →" : "Finish Game"}
              </button>
            </div>
          )}
        </>
      )}

      {/* ── GAMEOVER ── */}
      {phase === PHASE.GAMEOVER && !onComplete && (
        <div className="gameover-screen">
          <h3>Game Over! 🎉</h3>
          <p>
            Final Score: <strong>{totalScore}</strong>
          </p>
          <p>
            Correct Clicks:{" "}
            <strong>
              {totalHits} / {totalClicks}
            </strong>
          </p>
          <p>
            Accuracy:{" "}
            <strong>
              {totalClicks > 0
                ? Math.round((totalHits / totalClicks) * 100)
                : 0}
              %
            </strong>
          </p>
          {scoreSaved && (
            <p className="save-confirm">✓ Score saved to leaderboard!</p>
          )}
          {saveError && <p className="error-msg">{saveError}</p>}
          <div className="gameover-actions">
            <button
              className="btn-primary"
              style={{ background: accent }}
              onClick={restart}
            >
              Play Again
            </button>
            <Link to="/leaderboard" className="btn-secondary btn-link">
              Leaderboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
