/**
 * Улучшенный движок игры "Дурак"
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
        this.oppCardsCount = 0;
    }

    initDeck() {
        this.deck = [];
        this.suits.forEach(s => {
            this.ranks.forEach((r, i) => {
                this.deck.push({ suit: s, rank: r, power: i });
            });
        });
        this.shuffle();
        this.trump = this.deck[0]; // Последняя карта - козырь
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

    createCardElement(card, isBack = false, onClick = null) {
        const div = document.createElement('div');
        div.className = `card animate-in ${isBack ? 'back' : (['hearts', 'diamonds'].includes(card.suit) ? 'red' : 'black')}`;
        
        if (!isBack) {
            div.innerHTML = `
                <div class="card-suit suit-tl">${this.getSuitIcon(card.suit)}</div>
                <div class="card-val">${card.rank}</div>
                <div class="card-suit suit-br">${this.getSuitIcon(card.suit)}</div>
            `;
            if (onClick) div.onclick = onClick;
        } else {
            div.innerHTML = `<div class="w-full h-full flex items-center justify-center opacity-20 text-[40px]">M</div>`;
        }
        return div;
    }

    canAttack(card) {
        if (!this.isMyTurn || this.isDefender) return false;
        if (this.table.length >= 6) return false;
        if (this.table.length === 0) return true;
        
        const ranksOnTable = new Set();
        this.table.forEach(pair => {
            ranksOnTable.add(pair.attack.rank);
            if (pair.defense) ranksOnTable.add(pair.defense.rank);
        });
        return ranksOnTable.has(card.rank);
    }

    canDefend(attackCard, defenseCard) {
        if (!this.isDefender || !this.isMyTurn) return false;
        
        // Обычный бой (та же масть, выше ранг)
        if (defenseCard.suit === attackCard.suit) {
            return defenseCard.power > attackCard.power;
        }
        
        // Бой козырем
        return defenseCard.suit === this.trump.suit;
    }
}

const Game = new DurakEngine();