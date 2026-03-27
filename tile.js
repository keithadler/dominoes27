/**
 * @file tile.js — Domino tile model and set utilities.
 * @author Keith Adler
 * @copyright 2026 Keith Adler. MIT License.
 *
 * Defines the {@link Tile} class representing a single domino (two pip
 * values 0–6), plus helpers to create a standard double-6 set and shuffle it.
 *
 * No external dependencies.
 */

/**
 * A single domino tile with two pip values.
 *
 * Tiles are unordered — [2|5] and [5|2] are considered equal.
 */
class Tile {
  /**
   * @param {number} a - Pip value on side A (0–6).
   * @param {number} b - Pip value on side B (0–6).
   */
  constructor(a, b) {
    this.a = a;
    this.b = b;
  }

  /** @returns {boolean} True if both sides have the same value. */
  get isDouble() { return this.a === this.b; }

  /** @returns {number} Total pip count (a + b). */
  get pips() { return this.a + this.b; }

  /**
   * Check whether this tile contains a given pip value.
   * @param {number} n - Pip value to look for.
   * @returns {boolean}
   */
  has(n) { return this.a === n || this.b === n; }

  /**
   * Given one matching side, return the value on the opposite side.
   * @param {number} n - The known side value.
   * @returns {number} The other side's pip value.
   */
  otherSide(n) { return this.a === n ? this.b : this.a; }

  /**
   * Tile equality (order-independent).
   * @param {Tile} t
   * @returns {boolean}
   */
  equals(t) { return (this.a === t.a && this.b === t.b) || (this.a === t.b && this.b === t.a); }

  /** @returns {string} Human-readable representation, e.g. `[3|5]`. */
  toString() { return `[${this.a}|${this.b}]`; }
}

/**
 * Create a standard double-6 domino set (28 tiles).
 * @returns {Tile[]}
 */
function createSet() {
  const tiles = [];
  for (let a = 0; a <= 6; a++)
    for (let b = a; b <= 6; b++)
      tiles.push(new Tile(a, b));
  return tiles;
}

/**
 * Fisher-Yates in-place shuffle.
 * @param {Array} arr - Array to shuffle.
 * @returns {Array} The same array, shuffled.
 */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
