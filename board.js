// ============================================================
// ALL FIVES DOMINOES — Board
// ============================================================

class Board {
  constructor() {
    this.tiles = [];
    this.spinner = null;
    this.spinnerIndex = -1;
    // Open ends: value is the pip value for matching, isDouble for scoring
    this.leftEnd = -1;
    this.leftIsDouble = false;
    this.rightEnd = -1;
    this.rightIsDouble = false;
    this.spinnerNorth = -1;
    this.spinnerNorthIsDouble = false;
    this.spinnerSouth = -1;
    this.spinnerSouthIsDouble = false;
    this.spinnerNorthOpen = false;
    this.spinnerSouthOpen = false;
    this.hasLeftOfSpinner = false;
    this.hasRightOfSpinner = false;
    this.placed = [];
  }

  get isEmpty() { return this.tiles.length === 0; }

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

  getOpenValues() {
    return this.getOpenEnds().map(e => e.value);
  }

  // Scoring value for an end: doubles count both sides
  _endScoreValue(value, isDouble) {
    return isDouble ? value * 2 : value;
  }

  getEndSum() {
    if (this.isEmpty) return 0;
    // Special: if only the spinner is on the board, count both sides
    if (this.tiles.length === 1 && this.spinner) {
      return this.spinner.a + this.spinner.b;
    }
    const ends = this.getOpenEnds();
    return ends.reduce((s, e) => s + this._endScoreValue(e.value, e.isDouble), 0);
  }

  // Return breakdown string for display
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

  getScore() {
    const sum = this.getEndSum();
    return sum % 5 === 0 ? sum : 0;
  }

  canPlay(tile) {
    if (this.isEmpty) return true;
    const vals = this.getOpenValues();
    return vals.some(v => tile.has(v));
  }

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
