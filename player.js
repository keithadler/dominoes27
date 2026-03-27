/**
 * @file player.js — Player model for All Fives Dominoes.
 *
 * Lightweight data class representing a human or AI player.
 * Holds the player's hand, cumulative score, and identity info.
 *
 * @dependency tile.js (hand contains {@link Tile} instances)
 */

/**
 * Represents a single player (human or AI) in the game.
 */
class Player {
  /**
   * @param {string}  name    - Display name.
   * @param {boolean} isHuman - True for the local human player.
   * @param {number}  index   - Seat index (0–3).
   */
  constructor(name, isHuman, index) {
    this.name = name;
    this.isHuman = isHuman;
    this.index = index;
    /** @type {Tile[]} */
    this.hand = [];
    /** @type {number} Cumulative score across rounds. */
    this.score = 0;
  }

  /** @returns {number} Sum of all pip values in hand (used for end-of-round scoring). */
  get handPips() { return this.hand.reduce((s, t) => s + t.pips, 0); }
}
