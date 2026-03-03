// config/gameModes.js - Centralised game mode definitions
// Low Coupling: GameBoard, GameLobby and CompetitionHub all import from here.
// Changing a mode's rules/theme only requires editing this one file.
// Each mode has a distinct visual "aura" (CSS accent + glow) and unique mechanics.

export const GAME_MODES = {
    classic: {
        id: 'classic',
        label: 'Classic',
        emoji: '♥',
        accent: '#e84393',          // Warm pink/red
        glow: 'rgba(232,67,147,0.18)',
        description: 'The original Heart Game. No time limit. Earn a speed bonus for quick answers.',
        scoring: '100 pts + up to 50 speed bonus per correct answer',
        timeLimit: 0,               // 0 = no auto-submit timer
        lives: 0,                   // 0 = unlimited lives
        defaultMaxQ: 0,             // 0 = unlimited questions
    },
    blitz: {
        id: 'blitz',
        label: 'Blitz',
        emoji: '⚡',
        accent: '#00d4ff',          // Electric cyan
        glow: 'rgba(0,212,255,0.18)',
        description: 'Just 10 seconds per question! Miss the clock and it counts as wrong.',
        scoring: '100 pts + up to 100 speed bonus per correct answer',
        timeLimit: 10,              // seconds before auto-wrong
        lives: 0,
        defaultMaxQ: 10,
    },
    survival: {
        id: 'survival',
        label: 'Survival',
        emoji: '💀',
        accent: '#ff6b1a',          // Fire orange
        glow: 'rgba(255,107,26,0.18)',
        description: 'Start with 3 lives. Every wrong answer costs one. How far can you go?',
        scoring: '150 pts per correct answer. Wrong = lose a life.',
        timeLimit: 0,
        lives: 3,
        defaultMaxQ: 0,
    },
};

/** Returns points earned for a given mode + outcome */
export function calcPoints(modeId, correct, elapsedSeconds) {
    switch (modeId) {
        case 'blitz':
            return correct ? 100 + Math.max(0, 100 - elapsedSeconds * 10) : 0;
        case 'survival':
            return correct ? 150 : 0;
        default: // classic
            return correct ? 100 + Math.max(0, 50 - elapsedSeconds * 2) : 0;
    }
}
