// models/Competition.js - Competition data model (High Cohesion: only handles competition data)
// Low Coupling: routes call this model's methods without touching the DB directly.
// A competition ties together: a game mode, a join code, participants and their scores.

const { getDB } = require('../db');

// Generates a random 6-character uppercase code (avoids confusing chars like 0/O, 1/I)
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

const CompetitionModel = {
  /**
   * Creates a new competition and auto-joins the creator as first participant.
   * @param {string} name       - Display name of the competition
   * @param {string} mode       - Game mode: 'classic' | 'blitz' | 'survival'
   * @param {number} maxQuestions - Question limit per player (5, 10, 15, 20)
   * @param {string} userId     - Creator's userId
   * @param {string} username   - Creator's username
   */
  async create(name, mode, maxQuestions, userId, username) {
    // Keep retrying until we find a unique code (collision probability is very low)
    let code;
    let attempts = 0;
    do {
      code = generateCode();
      const existing = await getDB().collection('competitions').findOne({ code });
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    const doc = {
      code,
      name,
      mode,
      maxQuestions,
      createdBy: userId,
      creatorName: username,
      createdAt: new Date(),
      status: 'waiting', // 'waiting' | 'active'
      participants: [
        // Creator is automatically the first participant
        { userId, username, score: null, questionsAnswered: null, completedAt: null },
      ],
    };

    await getDB().collection('competitions').insertOne(doc);
    return doc;
  },

  /** Find a competition by its join code */
  async findByCode(code) {
    return getDB().collection('competitions').findOne({ code: code.toUpperCase() });
  },

  /**
   * Add a player to the participants list.
   * Uses $addToSet equivalent pattern: only adds if userId not already present.
   */
  async join(code, userId, username) {
    const comp = await this.findByCode(code);
    if (!comp) return null;

    const alreadyJoined = comp.participants.some(p => p.userId === userId);
    if (!alreadyJoined) {
      await getDB().collection('competitions').updateOne(
        { code: code.toUpperCase() },
        { $push: { participants: { userId, username, score: null, questionsAnswered: null, completedAt: null } } }
      );
    }

    return this.findByCode(code);
  },

  /**
   * Creator starts the competition — changes status from 'waiting' to 'active'.
   * Only the creator can call this.
   */
  async start(code, userId) {
    const result = await getDB().collection('competitions').updateOne(
      { code: code.toUpperCase(), createdBy: userId, status: 'waiting' },
      { $set: { status: 'active' } }
    );
    return result.modifiedCount === 1;
  },

  /**
   * Record a player's final score in the competition.
   * Marks the participant's score and completedAt, saving their result.
   */
  async submitScore(code, userId, score, questionsAnswered) {
    await getDB().collection('competitions').updateOne(
      { code: code.toUpperCase(), 'participants.userId': userId },
      {
        $set: {
          'participants.$.score': score,
          'participants.$.questionsAnswered': questionsAnswered,
          'participants.$.completedAt': new Date(),
        },
      }
    );
    return this.findByCode(code);
  },
};

module.exports = CompetitionModel;
