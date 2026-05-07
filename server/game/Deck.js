const SUITS = ['diamonds', 'spades', 'hearts', 'clubs'];
const VALUES = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];

class Deck {
  constructor() {
    this.cards = [];
    this.reset();
  }

  reset() {
    this.cards = [];
    for (const suit of SUITS) {
      for (const value of VALUES) {
        this.cards.push({ suit, value });
      }
    }
  }

  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  deal(num) {
    const dealt = [];
    for (let i = 0; i < num; i++) {
      dealt.push(this.cards.pop());
    }
    return dealt;
  }
}

module.exports = { Deck, SUITS, VALUES };
