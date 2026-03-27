// ============================================================
// ALL FIVES DOMINOES — Tile, Set & Shuffle
// ============================================================

class Tile {
  constructor(a, b) {
    this.a = a;
    this.b = b;
  }
  get isDouble() { return this.a === this.b; }
  get pips() { return this.a + this.b; }
  has(n) { return this.a === n || this.b === n; }
  otherSide(n) { return this.a === n ? this.b : this.a; }
  equals(t) { return (this.a === t.a && this.b === t.b) || (this.a === t.b && this.b === t.a); }
  toString() { return `[${this.a}|${this.b}]`; }
}

function createSet() {
  const tiles = [];
  for (let a = 0; a <= 6; a++)
    for (let b = a; b <= 6; b++)
      tiles.push(new Tile(a, b));
  return tiles;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
