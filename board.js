/**
 * @file board.js — Board state for All Fives Dominoes.
 *
 * Tracks the line of play, open ends, the spinner (first double played),
 * and scoring (multiples of 5 from the sum of open ends).
 *
 * Key concept: the spinner is the first double placed on the board.
 * Once tiles exist on both sides of the spinner, its north and south
 * arms open up, giving up to 4 playable ends.
 *
 * @dependency tile.js ({@link Tile})
 */

/**
 * Represents the domino board — the line of play and all open ends.
 */
class Board {
  constructor() {
    /** @type {Tile[]} All tiles placed on the board, in order. */
    this.tiles = [];
    /** @type {Tile|null} The first double played (spinner). */
    this.spinner = null;
    /** @type {number} Index of the spinner in `this.tiles`, or -1. */
    this.spinnerIndex = -1;

    // Open-end tracking: pip value at each end + whether it's a double
    // (doubles count both sides for scoring).
    this.leftEnd = -1;
    this.leftIsDouble = false;
    this.rightEnd = -1;
    this.rightIsDouble = false;
    this.spinnerNorth = -1;
    this.spinnerNorthIsDouble = false;
    this.spinnerSouth = -1;
    this.spinnerSouthIsDouble = false;

    /** @type {boolean} North arm of spinner is playable. */
    this.spinnerNorthOpen = false;
    /** @type {boolean} South arm of spinner is playable. */
    this.spinnerSouthOpen = false;

    /** @type {boolean} At least one tile has been placed left of the spinner. */
    this.hasLeftOfSpinner = false;
    /** @type {boolean} At least one tile has been placed right of the spinner. */
    this.hasRightOfSpinner = false;

    /** @type {Array} Visual placement data (used by renderer). */
    this.placed = [];
  }

  /**
   * Create a shallow clone of a board (game state only, no visual data).
   * Useful for AI simulation without mutating the real board.
   * @param {Board} board
   * @returns {Board}
   */
  static clone(board) {
    const b = new Board();
    b.tiles = [...board.tiles];
    b.spinner = board.spinner;
    b.spinnerIndex = board.spinnerIndex;
    b.leftEnd = board.leftEnd;
    b.leftIsDouble = board.leftIsDouble;
    b.rightEnd = board.rightEnd;
    b.rightIsDouble = board.rightIsDouble;
    b.spinnerNorth = board.spinnerNorth;
    b.spinnerNorthIsDouble = board.spinnerNorthIsDouble;
    b.spinnerSouth = board.spinnerSouth;
    b.spinnerSouthIsDouble = board.spinnerSouthIsDouble;
    b.spinnerNorthOpen = board.spinnerNorthOpen;
    b.spinnerSouthOpen = board.spinnerSouthOpen;
    b.hasLeftOfSpinner = board.hasLeftOfSpinner;
    b.hasRightOfSpinner = board.hasRightOfSpinner;
    return b;
  }

  /** @returns {boolean} True when no tiles have been played yet. */
  get isEmpty() { return this.tiles.length === 0; }

  /**
   * Get all currently open (playable) ends of the board.
   * @returns {{end: string, value: number, isDouble: boolean}[]}
   *   Each entry has the end name ('left'|'right'|'north'|'south'),
   *   the pip value to match against, and whether it's a double.
   */
  getOpenEnds() {
    if (this.isEmpty) return [];
    const ends = [];
    ends.push({ end: 'left', value: this.leftEnd, isDouble: this.leftIsDouble });
    ends.push({ end: 'right', value: this.rightEnd, isDouble: this.rightIsDouble });
    if (this.spinner && this.spinnerNorthOpen) {
      ends.push({ end: 'north', value: this.spinnerNorth, isDouble: this.spinnerNorthIsDouble });
    }
    if (this.spinner && this.spinnerSouthOpen) {
      ends.push({ end: 'south', value: this.spinnerSouth, isDouble: this.spinnerSouthIsDouble });
    }
    return ends;
  }

  /**
   * Get just the pip values of all open ends.
   * @returns {number[]}
   */
  getOpenValues() {
    return this.getOpenEnds().map(e => e.value);
  }

  /**
   * Scoring value for a single end — doubles count both sides.
   * @param {number}  value    - Pip value at the end.
   * @param {boolean} isDouble - Whether the end tile is a double.
   * @returns {number}
   * @private
   */
  _endScoreValue(value, isDouble) {
    return isDouble ? value * 2 : value;
  }

  /**
   * Sum of all open ends (used for scoring checks).
   * Special case: if only the spinner is on the board, count both sides.
   * @returns {number}
   */
  getEndSum() {
    if (this.isEmpty) return 0;
    // Special: if only the spinner is on the board, count both sides
    if (this.tiles.length === 1 && this.spinner) {
      return this.spinner.a + this.spinner.b;
    }
    const ends = this.getOpenEnds();
    return ends.reduce((s, e) => s + this._endScoreValue(e.value, e.isDouble), 0);
  }

  /**
   * Human-readable breakdown of the end sum, e.g. `"3 + (5+5) + 2"`.
   * @returns {string}
   */
  getEndSumBreakdown() {
    if (this.isEmpty) return '';
    if (this.tiles.length === 1 && this.spinner) {
      return `${this.spinner.a}+${this.spinner.b}`;
    }
    const ends = this.getOpenEnds();
    return ends.map(e => {
      if (e.isDouble) return `(${e.value}+${e.value})`;
      return `${e.value}`;
    }).join(' + ');
  }

  /**
   * Score for the current board state.
   * @returns {number} The end sum if it's a multiple of 5, otherwise 0.
   */
  getScore() {
    const sum = this.getEndSum();
    return sum % 5 === 0 ? sum : 0;
  }

  /**
   * Check whether a tile can be played on any open end.
   * @param {Tile} tile
   * @returns {boolean}
   */
  canPlay(tile) {
    if (this.isEmpty) return true;
    const vals = this.getOpenValues();
    return vals.some(v => tile.has(v));
  }

  /**
   * Get all valid placements for a tile on the current board.
   * @param {Tile} tile
   * @returns {{end: string, matchValue?: number}[]}
   *   Each placement specifies which end to play on and which pip value matches.
   */
  getValidPlacements(tile) {
    if (this.isEmpty) return [{ end: 'first' }];
    const ends = this.getOpenEnds();
    const placements = [];
    const seen = new Set();
    for (const e of ends) {
      if (tile.has(e.value)) {
        const key = e.end + ':' + e.value;
        if (!seen.has(key)) {
          seen.add(key);
          placements.push({ end: e.end, matchValue: e.value });
        }
      }
    }
    return placements;
  }

  /**
   * Place a tile on the board at the given end.
   *
   * Handles first-tile placement, spinner creation, and opening the
   * spinner's north/south arms once both left and right sides have tiles.
   *
   * @param {Tile} tile
   * @param {{end: string, matchValue?: number}} placement
   */
  placeTile(tile, placement) {
    this.tiles.push(tile);

    if (placement.end === 'first') {
      if (tile.isDouble) {
        this.spinner = tile;
        this.spinnerIndex = 0;
        this.leftEnd = tile.a;
        this.leftIsDouble = true;
        this.rightEnd = tile.a;
        this.rightIsDouble = true;
        this.spinnerNorth = tile.a;
        this.spinnerNorthIsDouble = false;
        this.spinnerSouth = tile.a;
        this.spinnerSouthIsDouble = false;
        this.spinnerNorthOpen = false;
        this.spinnerSouthOpen = false;
      } else {
        this.leftEnd = tile.a;
        this.leftIsDouble = false;
        this.rightEnd = tile.b;
        this.rightIsDouble = false;
      }
      return;
    }

    const mv = placement.matchValue;
    const isNewSpinner = !this.spinner && tile.isDouble;

    if (placement.end === 'left') {
      if (isNewSpinner) {
        this.spinner = tile;
        this.spinnerIndex = this.tiles.length - 1;
        this.leftEnd = tile.a;
        this.leftIsDouble = true;
        this.spinnerNorth = tile.a;
        this.spinnerNorthIsDouble = false;
        this.spinnerSouth = tile.a;
        this.spinnerSouthIsDouble = false;
        this.spinnerNorthOpen = false;
        this.spinnerSouthOpen = false;
        this.hasRightOfSpinner = true;
        this.hasLeftOfSpinner = false;
      } else {
        this.leftEnd = tile.otherSide(mv);
        this.leftIsDouble = tile.isDouble;
        if (this.spinner) this.hasLeftOfSpinner = true;
      }
    } else if (placement.end === 'right') {
      if (isNewSpinner) {
        this.spinner = tile;
        this.spinnerIndex = this.tiles.length - 1;
        this.rightEnd = tile.a;
        this.rightIsDouble = true;
        this.spinnerNorth = tile.a;
        this.spinnerNorthIsDouble = false;
        this.spinnerSouth = tile.a;
        this.spinnerSouthIsDouble = false;
        this.spinnerNorthOpen = false;
        this.spinnerSouthOpen = false;
        this.hasLeftOfSpinner = true;
        this.hasRightOfSpinner = false;
      } else {
        this.rightEnd = tile.otherSide(mv);
        this.rightIsDouble = tile.isDouble;
        if (this.spinner) this.hasRightOfSpinner = true;
      }
    } else if (placement.end === 'north') {
      this.spinnerNorth = tile.otherSide(mv);
      this.spinnerNorthIsDouble = tile.isDouble;
    } else if (placement.end === 'south') {
      this.spinnerSouth = tile.otherSide(mv);
      this.spinnerSouthIsDouble = tile.isDouble;
    }

    // Open spinner arms once both left and right of spinner have tiles
    if (this.spinner && this.hasLeftOfSpinner && this.hasRightOfSpinner) {
      this.spinnerNorthOpen = true;
      this.spinnerSouthOpen = true;
    }
  }
}
