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
        howToPlay: [
            'A heart puzzle image is shown on screen.',
            'Count the number of hearts in the image.',
            'Click the correct number from the answer buttons.',
            'Answer faster to earn a speed bonus (up to +50 pts).',
            'No time limit — take your time and aim for accuracy!',
            'The game continues until you choose to stop.',
        ],
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
        howToPlay: [
            'A heart puzzle image is shown on screen.',
            'You have exactly 10 seconds to answer each question.',
            'Click the correct number before the timer runs out.',
            'Running out of time counts as a wrong answer.',
            'The faster you answer, the bigger the speed bonus (up to +100 pts).',
            'Complete all 10 questions to finish the round.',
        ],
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
        howToPlay: [
            'You start with 3 lives (❤️❤️❤️).',
            'A heart puzzle image is shown — count and click the right number.',
            'A wrong answer costs you one life.',
            'Lose all 3 lives and the game ends.',
            'No time limit — stay calm and be accurate.',
            'How many questions can you answer before you run out of lives?',
        ],
    },
    memory: {
        id: 'memory',
        label: 'Memory Blindfold',
        emoji: '🫀',
        accent: '#ff4d8d',          // Hot pink
        glow: 'rgba(255,77,141,0.18)',
        description: 'Hearts flash on the board — memorise their spots, then click 20% of the positions blindfolded!',
        scoring: '50–120 pts per correct click · 8 rounds · Gets harder each round',
        timeLimit: 0,
        lives: 0,
        defaultMaxQ: 8,
        isMemoryGame: true,         // Rendered by MemoryGame, not GameBoard
        howToPlay: [
            'Hearts briefly flash on a blank board — watch carefully!',
            'After they disappear, the board goes dark (blindfolded).',
            'Click where you remember the hearts were.',
            'You need to find 20% of the heart positions to pass each round.',
            'Each of the 8 rounds shows more hearts and gives less time to memorise.',
            'Score more by clicking correct spots quickly and accurately.',
        ],
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
