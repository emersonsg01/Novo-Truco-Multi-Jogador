const { Deck, VALUES } = require('./Deck');

const MANILHA_SUIT_POWER = {
  'diamonds': 1, // Ouros
  'spades': 2,   // Espadas
  'hearts': 3,   // Copas
  'clubs': 4     // Paus (ZAP)
};

class TrucoGame {
  constructor(roomId, isSinglePlayer = false) {
    this.roomId = roomId;
    this.players = []; 
    this.deck = new Deck();
    this.vira = null;
    this.manilhaValue = null;
    this.currentTurnIndex = 0;
    this.handValue = 1; 
    this.roundWinnerIndex = -1;
    this.trickCards = []; 
    this.tricks = []; 
    this.state = 'waiting'; 
    this.trucoRequesterIndex = -1;
    this.dealerIndex = 0;
    this.isSinglePlayer = isSinglePlayer;
  }

  addPlayer(id, name) {
    if (this.players.length < 2) {
      this.players.push({
        id,
        name,
        score: 0,
        hand: [],
        playedCards: [],
        wins: 0,
        ready: false
      });
      return true;
    }
    return false;
  }

  removePlayer(id) {
    this.players = this.players.filter(p => p.id !== id);
  }

  setPlayerReady(id) {
    const player = this.players.find(p => p.id === id);
    if (player) player.ready = true;
    
    if (this.players.length === 2 && this.players.every(p => p.ready)) {
      this.startHand();
    }
  }

  startHand() {
    this.state = 'playing';
    this.deck.reset();
    this.deck.shuffle();
    this.vira = this.deck.deal(1)[0];
    this.setManilha();
    
    this.players.forEach(p => {
      p.hand = this.deck.deal(3);
      p.playedCards = [];
      p.wins = 0;
    });

    this.trickCards = [];
    this.tricks = [];
    this.handValue = 1;
    this.trucoRequesterIndex = -1;
    this.currentTurnIndex = (this.dealerIndex + 1) % 2;
  }

  setManilha() {
    const viraIndex = VALUES.indexOf(this.vira.value);
    const manilhaIndex = (viraIndex + 1) % VALUES.length;
    this.manilhaValue = VALUES[manilhaIndex];
  }

  getCardPower(card) {
    if (card.value === this.manilhaValue) {
      return 100 + MANILHA_SUIT_POWER[card.suit];
    }
    return VALUES.indexOf(card.value);
  }

  playCard(playerId, cardIndex) {
    if (this.state !== 'playing') return false;
    const playerIdx = this.players.findIndex(p => p.id === playerId);
    if (playerIdx !== this.currentTurnIndex) return false;

    // Se as cartas do turno anterior ainda estão na mesa, limpe-as
    if (this.trickCards.length === 2) {
      this.trickCards = [];
    }

    const player = this.players[playerIdx];
    if (cardIndex < 0 || cardIndex >= player.hand.length) return false;

    const card = player.hand.splice(cardIndex, 1)[0];
    player.playedCards.push(card);
    this.trickCards.push({ playerId, card });

    let action = 'next_turn';

    if (this.trickCards.length === 2) {
      const result = this.resolveTrick();
      if (result === 'hand_finished') {
        action = 'hand_finished';
      } else {
        action = 'trick_finished';
      }
    } else {
      this.currentTurnIndex = (this.currentTurnIndex + 1) % 2;
    }

    return action;
  }

  resolveTrick() {
    const p1Card = this.trickCards[0].card;
    const p2Card = this.trickCards[1].card;
    
    const power1 = this.getCardPower(p1Card);
    const power2 = this.getCardPower(p2Card);

    let winnerIdx = -1;
    if (power1 > power2) {
      winnerIdx = this.players.findIndex(p => p.id === this.trickCards[0].playerId);
    } else if (power2 > power1) {
      winnerIdx = this.players.findIndex(p => p.id === this.trickCards[1].playerId);
    } 
    
    if (winnerIdx === -1) {
        winnerIdx = this.players.findIndex(p => p.id === this.trickCards[0].playerId);
    }

    this.players[winnerIdx].wins += 1;
    this.tricks.push(winnerIdx);
    
    if (this.players[winnerIdx].wins === 2 || this.tricks.length === 3) {
      this.resolveHand(winnerIdx);
      return 'hand_finished';
    } else {
      this.currentTurnIndex = winnerIdx;
      return 'trick_finished';
    }
  }

  resolveHand(winnerIdx) {
    this.players[winnerIdx].score += this.handValue;
    this.dealerIndex = (this.dealerIndex + 1) % 2;
    
    if (this.players[winnerIdx].score >= 12) {
      this.state = 'finished';
      this.roundWinnerIndex = winnerIdx;
    } else {
      this.state = 'hand_finished'; 
      // Será mudado para 'waiting' depois de um tempo no servidor
    }
  }

  prepareNextHand() {
    this.state = 'waiting';
    this.players.forEach(p => p.ready = false);
  }

  requestTruco(playerId) {
    if (this.state !== 'playing') return false;
    const playerIdx = this.players.findIndex(p => p.id === playerId);
    if (playerIdx === this.trucoRequesterIndex) return false;

    if (this.handValue === 1) this.handValue = 3;
    else if (this.handValue === 3) this.handValue = 6;
    else if (this.handValue === 6) this.handValue = 9;
    else if (this.handValue === 9) this.handValue = 12;
    else return false;

    this.trucoRequesterIndex = playerIdx;
    this.state = 'truco_requested';
    return true;
  }

  respondTruco(playerId, response) {
    if (this.state !== 'truco_requested') return false;
    const playerIdx = this.players.findIndex(p => p.id === playerId);
    if (playerIdx === this.trucoRequesterIndex) return false;

    if (response === 'accept') {
      this.state = 'playing';
      return 'accepted';
    } else if (response === 'reject') {
      const winnerIdx = this.trucoRequesterIndex;
      let prevValue = this.handValue === 3 ? 1 : this.handValue === 6 ? 3 : this.handValue === 9 ? 6 : 9;
      this.players[winnerIdx].score += prevValue;
      
      this.dealerIndex = (this.dealerIndex + 1) % 2;
      if (this.players[winnerIdx].score >= 12) {
        this.state = 'finished';
        this.roundWinnerIndex = winnerIdx;
      } else {
        this.state = 'hand_finished';
      }
      return 'rejected';
    } else if (response === 'raise') {
        this.requestTruco(playerId);
        return 'raised';
    }
    return false;
  }

  getStateForPlayer(playerId) {
    return {
      roomId: this.roomId,
      state: this.state,
      handValue: this.handValue,
      vira: this.vira,
      manilhaValue: this.manilhaValue,
      currentTurnIndex: this.currentTurnIndex,
      trucoRequesterIndex: this.trucoRequesterIndex,
      trickCards: this.trickCards,
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        score: p.score,
        wins: p.wins,
        playedCards: p.playedCards,
        ready: p.ready,
        isMe: p.id === playerId,
        hand: p.id === playerId || this.state === 'finished' || this.state === 'hand_finished' ? p.hand : Array(p.hand.length).fill(null)
      }))
    };
  }
}

module.exports = { TrucoGame };
