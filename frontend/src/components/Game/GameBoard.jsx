// components/Game/GameBoard.jsx - Multi-mode game component
//
// Demonstrates all four themes:
//
// 1. LOW COUPLING / HIGH COHESION
//    GameBoard is self-contained. Game mode rules are injected via the GAME_MODES
//    config (not hardcoded here). An optional onComplete callback allows it to
//    be embedded inside CompetitionRoom without GameBoard knowing about competitions.
//
// 2. EVENT-DRIVEN PROGRAMMING
//    - onClick events on answer buttons trigger submitAnswer()
//    - useEffect reacts to status changes (state change events)
//    - Blitz mode: setInterval countdown auto-submits when time hits 0
//    - submitAnswerRef pattern prevents stale-closure bugs in async callbacks
//
// 3. INTEROPERABILITY
//    Calls backend REST API (/api/game/question, /api/game/answer, /api/scores).
//    The backend proxies the external Heart Game API. JSON is the interchange format.
//
// 4. VIRTUAL IDENTITY
//    JWT cookie is sent automatically with every API request. The backend validates
//    identity before serving questions or accepting answers.

import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../services/api";
import { GAME_MODES, calcPoints } from "../../config/gameModes";
import { playDing, playBuzzer, playTick } from "../../utils/sounds";

const STATUS = {
  IDLE: "idle",
  LOADING: "loading",
  PLAYING: "playing",
  ANSWERED: "answered",
  GAMEOVER: "gameover",
};

/**
 * @param {string}   [mode]         - Override mode (used when embedded in CompetitionRoom)
 * @param {number}   [maxQuestions] - Question cap. 0 = unlimited. Overrides mode default.
 * @param {Function} [onComplete]   - Called with (score, questionsAnswered) on game end
 */
export default function GameBoard({
  mode: modeProp,
  maxQuestions: maxQProp,
  onComplete,
}) {
  const params = useParams();
  const modeKey = modeProp || params.mode || "classic";
  const config = GAME_MODES[modeKey] || GAME_MODES.classic;

  // maxQuestions: explicit prop > mode default (0 = unlimited)
  const maxQuestions = maxQProp !== undefined ? maxQProp : config.defaultMaxQ;

  const [status, setStatus] = useState(STATUS.IDLE);
  const [question, setQuestion] = useState(null);
  const [result, setResult] = useState(null);
  const [score, setScore] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [elapsed, setElapsed] = useState(0); // counts up while playing
  const [countdown, setCountdown] = useState(0); // counts down (blitz only)
  const [lives, setLives] = useState(config.lives || Infinity);
  const [error, setError] = useState("");
  const [scoreSaved, setScoreSaved] = useState(false);
  const [popups, setPopups] = useState([]); // floating +pts animations
  const [difficulty, setDifficulty] = useState(1); // classic mode level (1–5)

  const timerRef = useRef(null);
  const submittingRef = useRef(false); // prevents double-submission (e.g. button + blitz timeout)
  // Keep a stable ref to submitAnswer so the blitz interval can call it without stale closure
  const submitAnswerRef = useRef(null);
  const correctStreakRef = useRef(0); // tracks correct answers for difficulty progression

  // Reset lives when mode changes (e.g. navigating between modes)
  useEffect(() => {
    setLives(config.lives || Infinity);
  }, [config.lives]);

  // ── Elapsed timer: counts UP while playing ─────────────────────────────
  useEffect(() => {
    if (status === STATUS.PLAYING) {
      timerRef.current = setInterval(
        () => setElapsed((prev) => prev + 1),
        1000,
      );
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [status]);

  // ── Blitz countdown: counts DOWN, auto-submits -1 (wrong) at 0 ────────
  // The -1 answer will never match a valid solution (0–9), so it's always wrong.
  useEffect(() => {
    if (config.timeLimit === 0 || status !== STATUS.PLAYING) return;
    setCountdown(config.timeLimit);

    const interval = setInterval(() => {
      playTick();
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          submitAnswerRef.current?.(-1); // time's up — fire event
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
    // Re-runs when a new question arrives (status transitions LOADING → PLAYING)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, question]);

  // ── Fetch a new question ───────────────────────────────────────────────
  const fetchQuestion = async () => {
    setStatus(STATUS.LOADING);
    setResult(null);
    setError("");
    setElapsed(0);
    submittingRef.current = false;
    try {
      const res = await api.get("/game/question");
      setQuestion(res.data);
      setStatus(STATUS.PLAYING);
    } catch (err) {
      setError(
        err.response?.data?.error || "Failed to load question. Please retry.",
      );
      setStatus(STATUS.IDLE);
    }
  };

  // ── Submit answer ──────────────────────────────────────────────────────
  // Difficulty multipliers for Classic mode: Level 1 → 1×, up to Level 5 → 2×
  const DIFF_MULTIPLIERS = [0, 1.0, 1.2, 1.5, 1.8, 2.0];

  const submitAnswer = async (answer, e) => {
    if (status !== STATUS.PLAYING || submittingRef.current) return;
    submittingRef.current = true;
    setStatus(STATUS.LOADING);

    try {
      const res = await api.post("/game/answer", {
        questionId: question.questionId,
        answer,
      });
      const { correct, solution } = res.data;
      const basePoints = calcPoints(modeKey, correct, elapsed);
      // Apply difficulty multiplier in Classic mode
      const multiplier =
        modeKey === "classic" ? (DIFF_MULTIPLIERS[difficulty] ?? 1) : 1;
      const points = Math.round(basePoints * multiplier);

      // ── Sound effects ────────────────────────────────────────────────
      if (correct) playDing();
      else playBuzzer();

      // ── Difficulty progression (Classic only) ────────────────────────
      if (modeKey === "classic" && correct) {
        correctStreakRef.current += 1;
        if (correctStreakRef.current % 3 === 0 && difficulty < 5) {
          setDifficulty((d) => Math.min(5, d + 1));
        }
      }

      // ── Score pop-up ─────────────────────────────────────────────────
      if (correct && points > 0 && e) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top;
        const pid = Date.now() + Math.random();
        setPopups((prev) => [...prev, { id: pid, pts: points, x, y }]);
        setTimeout(
          () => setPopups((prev) => prev.filter((p) => p.id !== pid)),
          1200,
        );
      }

      const newScore = score + points;
      const newQA = questionsAnswered + 1;
      setResult({ correct, solution, points, userAnswer: answer });
      if (points > 0) setScore(newScore);
      setQuestionsAnswered(newQA);

      // ── Survival: deduct life on wrong answer ──────────────────────
      let newLives = lives;
      if (config.lives > 0 && !correct) {
        newLives = lives - 1;
        setLives(newLives);
      }

      // ── Determine if game should end ───────────────────────────────
      const livesExpired = config.lives > 0 && newLives <= 0;
      const maxReached = maxQuestions > 0 && newQA >= maxQuestions;

      if (livesExpired || maxReached) {
        // End immediately (pass state directly, bypassing stale closures)
        await endGame(newScore, newQA);
      } else {
        setStatus(STATUS.ANSWERED);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit answer.");
      setStatus(STATUS.ANSWERED);
      submittingRef.current = false;
    }
  };

  // Keep the ref current so the blitz interval can always call the latest version
  submitAnswerRef.current = submitAnswer;

  // ── Auto-advance to next question after showing result briefly ─────────
  useEffect(() => {
    if (status !== STATUS.ANSWERED) return;
    const t = setTimeout(() => fetchQuestion(), 1800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // ── End game and persist score ─────────────────────────────────────────
  const endGame = async (finalScore = score, finalQA = questionsAnswered) => {
    clearInterval(timerRef.current);
    setStatus(STATUS.GAMEOVER);

    if (finalQA > 0) {
      try {
        await api.post("/scores", {
          score: finalScore,
          questionsAnswered: finalQA,
          gameMode: modeKey,
        });
        setScoreSaved(true);
      } catch {
        setError("Could not save score to leaderboard.");
      }
    }
    // Notify parent (e.g. CompetitionRoom) that the game is complete
    onComplete?.(finalScore, finalQA);
  };

  // ── Restart (clears all state) ─────────────────────────────────────────
  const restart = () => {
    setStatus(STATUS.IDLE);
    setQuestion(null);
    setResult(null);
    setScore(0);
    setQuestionsAnswered(0);
    setElapsed(0);
    setCountdown(0);
    setLives(config.lives || Infinity);
    setError("");
    setScoreSaved(false);
    setPopups([]);
    setDifficulty(1);
    correctStreakRef.current = 0;
    submittingRef.current = false;
  };

  // ── Life/heart display (survival mode) ────────────────────────────────
  const renderLives = () => {
    if (config.lives === 0) return null;
    return (
      <span className="lives-display">
        {Array.from({ length: config.lives }).map((_, i) =>
          i < lives ? "❤️" : "🖤",
        )}
      </span>
    );
  };

  // ── Aura: inject CSS variables for theming ────────────────────────────
  const auraStyle = {
    "--accent": config.accent,
    "--glow": config.glow,
    boxShadow: `0 0 40px ${config.glow}`,
    borderColor: config.accent,
  };

  return (
    <div className="game-container" style={auraStyle}>
      {/* ── Back to lobby (standalone mode only) ── */}
      {!onComplete && (
        <Link to="/game" className="back-btn">
          ← Back to Lobby
        </Link>
      )}
      {/* ── Header ── */}
      <div className="game-header">
        <h2 style={{ color: config.accent }}>
          {config.emoji} {config.label}
          {modeKey === "classic" &&
            status !== STATUS.IDLE &&
            status !== STATUS.GAMEOVER && (
              <span className="difficulty-badge" data-level={difficulty}>
                Lv.{difficulty}
                {difficulty >= 4 ? " 🔥" : difficulty >= 2 ? " ✦" : ""}
              </span>
            )}
        </h2>
        <div className="game-stats">
          <span>
            Score: <strong>{score}</strong>
          </span>
          <span>
            Q:{" "}
            <strong>
              {questionsAnswered}
              {maxQuestions > 0 ? `/${maxQuestions}` : ""}
            </strong>
          </span>
          {renderLives()}
          {status === STATUS.PLAYING && config.timeLimit > 0 && (
            <span
              className={`countdown ${countdown <= 3 ? "countdown-danger" : ""}`}
              style={{ color: config.accent }}
            >
              ⏱ {countdown}s
            </span>
          )}
          {status === STATUS.PLAYING && config.timeLimit === 0 && (
            <span className={`timer ${elapsed > 20 ? "timer-warning" : ""}`}>
              ⏱ {elapsed}s
            </span>
          )}
        </div>
      </div>

      {error && <p className="error-msg">{error}</p>}

      {/* ── IDLE ── */}
      {status === STATUS.IDLE && (
        <div className="game-start">
          <p>{config.description}</p>
          <p className="score-hint">{config.scoring}</p>
          <button
            onClick={fetchQuestion}
            className="btn-primary btn-large"
            style={{ background: config.accent }}
          >
            Start Game
          </button>
        </div>
      )}

      {/* ── LOADING ── */}
      {status === STATUS.LOADING && <div className="loading">Loading…</div>}

      {/* ── PLAYING ── */}
      {status === STATUS.PLAYING && question && (
        <div className="question-area">
          <img
            src={question.imageUrl}
            alt="Heart game puzzle — find the missing number"
            className="puzzle-image"
            style={{ borderColor: config.accent }}
          />
          <p className="answer-prompt">Which number is missing?</p>
          <div className="answer-buttons">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={(e) => submitAnswer(num, e)}
                className="btn-answer"
                style={{ "--btn-hover": config.accent }}
              >
                {num}
              </button>
            ))}
          </div>
          {!onComplete && (
            <button onClick={() => endGame()} className="btn-secondary btn-end">
              End Game &amp; Save Score
            </button>
          )}
        </div>
      )}

      {/* ── ANSWERED ── */}
      {status === STATUS.ANSWERED && result && (
        <div className="result-area">
          <div
            className={`result-banner ${result.correct ? "result-correct" : "result-wrong"}`}
          >
            {result.correct
              ? `✓ Correct! +${result.points} pts`
              : `✗ Wrong — answer was ${result.solution}`}
          </div>
          <p className="result-next-hint">Next question in a moment…</p>
          {!onComplete && (
            <button onClick={() => endGame()} className="btn-secondary">
              End Game &amp; Save Score
            </button>
          )}
        </div>
      )}

      {/* ── GAMEOVER ── */}
      {status === STATUS.GAMEOVER && (
        <div className="gameover-screen">
          <h3>Game Over! 🎉</h3>
          <p>
            Final Score: <strong>{score}</strong>
          </p>
          <p>
            Questions Answered: <strong>{questionsAnswered}</strong>
          </p>
          {scoreSaved && (
            <p className="save-confirm">✓ Score saved to leaderboard!</p>
          )}
          {error && <p className="error-msg">{error}</p>}
          {/* Don't show restart/leaderboard when embedded inside a competition */}
          {!onComplete && (
            <div className="gameover-actions">
              <button
                onClick={restart}
                className="btn-primary"
                style={{ background: config.accent }}
              >
                Play Again
              </button>
              <Link to="/leaderboard" className="btn-secondary btn-link">
                Leaderboard
              </Link>
            </div>
          )}
        </div>
      )}
      {/* Floating +pts score popups */}
      {popups.map(({ id, pts, x, y }) => (
        <div
          key={id}
          className="score-popup"
          style={{ left: `${x}px`, top: `${y}px` }}
        >
          +{pts}
        </div>
      ))}
    </div>
  );
}
