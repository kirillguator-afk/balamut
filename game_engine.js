/**
 * Ядро игры Дурак
 */
const RANKS = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];

class DurakEngine {
    constructor() {
        this.deck = [];
        this.trump = null;
        this.hand = [];
        this.opponentCardCount = 0;
        this.table = []; // Array of { attack: card, defense: card | null }
        this.myTurn = false;
        this.role = 'attacker'; // attacker | defender
    }

    initDeck() {
        this.deck = [];
        SUITS.forEach(suit => {
            RANKS.forEach((rank, index) => {
                this.deck.push({ suit, rank, power: index });
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

    canBeat(attackCard, defenseCard) {
        // Если масти одинаковые, бьет та что выше по рангу
        if (attackCard.suit === defenseCard.suit) {
            return defenseCard.power > attackCard.power;
        }
        // Если защитная карта - козырь, а атакующая - нет
        if (defenseCard.suit === this.trump.suit && attackCard.suit !== this.trump.suit) {
            return true;
        }
        return false;
    }

    getSuitSymbol(suit) {
        const symbols = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
        return symbols[suit];
    }

    createCardUI(card, isBack = false) {
        const el = document.createElement('div');
        el.className = `card ${isBack ? 'back' : ''}`;
        
        if (!isBack && card) {
            const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
            el.classList.add(isRed ? 'red' : 'black');
            el.innerHTML = `
                <div class="card-suit suit-tl">${this.getSuitSymbol(card.suit)}</div>
                <div class="card-val">${card.rank}</div>
                <div class="card-suit suit-br">${this.getSuitSymbol(card.suit)}</div>
            `;
            el.dataset.rank = card.rank;
            el.dataset.suit = card.suit;
        }
        return el;
    }
}

const Game = new DurakEngine();