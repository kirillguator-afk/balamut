/**
 * Движок игры "Дурак"
 */
class DurakEngine {
    constructor() {
        this.deck = [];
        this.trump = null;
        this.hand = [];
        this.table = []; // {attack, defense}
        this.myTurn = false;
        this.isDefender = false;
        this.ranks = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        this.suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    }

    createDeck() {
        this.deck = [];
        this.suits.forEach(s => {
            this.ranks.forEach((r, i) => {
                this.deck.push({ suit: s, rank: r, power: i });
            });
        });
        this.shuffle();
        this.trump = this.deck[0];
    }

    shuffle() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    canBeat(attack, defense) {
        if (defense.suit === attack.suit) {
            return defense.power > attack.power;
        }
        return defense.suit === this.trump.suit;
    }

    getSuitIcon(suit) {
        const icons = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
        return icons[suit];
    }

    createCardUI(card, hidden = false) {
        const el = document.createElement('div');
        el.className = `card ${hidden ? 'back' : ''}`;
        if (!hidden && card) {
            const isRed = ['hearts', 'diamonds'].includes(card.suit);
            el.classList.add(isRed ? 'red' : 'black');
            el.innerHTML = `
                <div class="card-suit suit-tl">${this.getSuitIcon(card.suit)}</div>
                <div class="card-val">${card.rank}</div>
                <div class="card-suit suit-br">${this.getSuitIcon(card.suit)}</div>
            `;
        }
        return el;
    }
}

const Game = new DurakEngine();