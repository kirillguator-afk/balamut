/**
 * Логика игры "Дурак"
 */
const CARD_SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const CARD_VALUES = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

class DurakGame {
    constructor() {
        this.deck = [];
        this.playerHand = [];
        this.opponentHandCount = 0;
        this.trump = null;
        this.table = []; // { attack: card, defense: card }
    }

    createDeck() {
        this.deck = [];
        for (const suit of CARD_SUITS) {
            for (const value of CARD_VALUES) {
                this.deck.push({ suit, value });
            }
        }
        this.shuffle();
    }

    shuffle() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    getSuitIcon(suit) {
        switch(suit) {
            case 'hearts': return '♥️';
            case 'diamonds': return '♦️';
            case 'clubs': return '♣️';
            case 'spades': return '♠️';
        }
    }

    createCardElement(card, isBack = false) {
        const div = document.createElement('div');
        div.className = `card ${isBack ? 'back' : ''} ${card ? (['hearts', 'diamonds'].includes(card.suit) ? 'red' : 'black') : ''}`;
        
        if (!isBack && card) {
            div.innerHTML = `
                <div class="card-suit suit-top">${this.getSuitIcon(card.suit)}</div>
                <div class="card-value">${card.value}</div>
                <div class="card-suit suit-bottom">${this.getSuitIcon(card.suit)}</div>
            `;
            div.dataset.suit = card.suit;
            div.dataset.value = card.value;
        }
        return div;
    }
}

const GameCore = new DurakGame();