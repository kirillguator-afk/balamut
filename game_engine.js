/**
 * Движок игры "Дурак" P2P
 */
class DurakEngine {
    constructor() {
        this.ranks = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        this.suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        this.reset();
    }

    reset() {
        this.deck = [];
        this.trump = null;
        this.hand = [];
        this.table = []; // {attack: card, defense: card | null}
        this.isMyTurn = false;
        this.isDefender = false;
        this.gameState = 'LOBBY'; // LOBBY, PLAYING, ENDED
    }

    initDeck() {
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

    getSuitIcon(suit) {
        const icons = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
        return icons[suit];
    }

    createCardElement(card, isBack = false) {
        const div = document.createElement('div');
        div.className = `card ${isBack ? 'back' : (['hearts', 'diamonds'].includes(card.suit) ? 'red' : 'black')}`;
        if (!isBack) {
            div.innerHTML = `
                <div class="card-suit suit-tl">${this.getSuitIcon(card.suit)}</div>
                <div class="card-val">${card.rank}</div>
                <div class="card-suit suit-br">${this.getSuitIcon(card.suit)}</div>
            `;
            div.dataset.suit = card.suit;
            div.dataset.rank = card.rank;
        }
        return div;
    }

    canAttack(card) {
        if (!this.isMyTurn || this.isDefender) return false;
        if (this.table.length === 0) return true;
        // Можно подкидывать только те ранги, что уже есть на столе
        const ranksOnTable = new Set();
        this.table.forEach(pair => {
            ranksOnTable.add(pair.attack.rank);
            if (pair.defense) ranksOnTable.add(pair.defense.rank);
        });
        return ranksOnTable.has(card.rank);
    }

    canDefend(attackCard, defenseCard) {
        if (!this.isDefender) return false;
        if (defenseCard.suit === attackCard.suit) {
            return defenseCard.power > attackCard.power;
        }
        return defenseCard.suit === this.trump.suit;
    }

    isGameOver() {
        return this.deck.length === 0 && (this.hand.length === 0);
    }
}

const Game = new DurakEngine();