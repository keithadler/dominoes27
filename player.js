// ============================================================
// ALL FIVES DOMINOES — Player
// ============================================================

class Player {
  constructor(name, isHuman, index) {
    this.name = name;
    this.isHuman = isHuman;
    this.index = index;
    this.hand = [];
    this.score = 0;
  }
  get handPips() { return this.hand.reduce((s, t) => s + t.pips, 0); }
}
