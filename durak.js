/**
 * METRO DURAK - Game Logic & Drag-and-Drop
 */
const durak = {
    deck: [],
    hand: [],
    table: [],
    trump: null,
    isMyTurn: false,
    
    ranks: ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'],
    suits: ['hearts', 'diamonds', 'clubs', 'spades'],

    init() {
        // Drag and drop implementation for mobile
        this.setupInteractions();
    },

    createDeck() {
        this.deck = [];
        this.suits.forEach(s => {
            this.ranks.forEach((r, i) => {
                this.deck.push({ suit: s, rank: r, power: i });
            });
        });
        this.shuffle(this.deck);
        this.trump = this.deck[0];
    },

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    },

    createCardUI(card, isBack = false) {
        const div = document.createElement('div');
        div.className = `card ${isBack ? 'back' : (['hearts', 'diamonds'].includes(card.suit) ? 'red' : 'black')}`;
        if (!isBack) {
            div.innerHTML = `
                <div class="card-suit-mini suit-tl">${utils.getSuitIcon(card.suit)}</div>
                <div class="card-val">${card.rank}</div>
                <div class="card-suit-mini suit-br">${utils.getSuitIcon(card.suit)}</div>
            `;
            div.dataset.suit = card.suit;
            div.dataset.rank = card.rank;
        }
        return div;
    },

    setupInteractions() {
        let activeCard = null;
        let startX, startY;

        document.addEventListener('touchstart', (e) => {
            const el = e.target.closest('.card');
            if (el && el.parentElement.id === 'dk-hand') {
                activeCard = el;
                activeCard.classList.add('dragging');
                const touch = e.touches[0];
                startX = touch.clientX - activeCard.offsetLeft;
                startY = touch.clientY - activeCard.offsetTop;
                app.haptic('impact', 'light');
            }
        });

        document.addEventListener('touchmove', (e) => {
            if (!activeCard) return;
            e.preventDefault();
            const touch = e.touches[0];
            activeCard.style.position = 'fixed';
            activeCard.style.left = (touch.clientX - (activeCard.offsetWidth/2)) + 'px';
            activeCard.style.top = (touch.clientY - (activeCard.offsetHeight/2)) + 'px';
        });

        document.addEventListener('touchend', (e) => {
            if (!activeCard) return;
            
            const field = document.getElementById('dk-field');
            const rect = field.getBoundingClientRect();
            const touch = e.changedTouches[0];

            if (touch.clientY < rect.bottom && touch.clientY > rect.top) {
                this.playCard(activeCard);
            } else {
                activeCard.style.position = '';
                activeCard.style.left = '';
                activeCard.style.top = '';
            }
            
            activeCard.classList.remove('dragging');
            activeCard = null;
        });
    },

    playCard(el) {
        // Validation and P2P sync would go here
        const field = document.getElementById('dk-table');
        el.style.position = '';
        el.style.left = '';
        el.style.top = '';
        field.appendChild(el);
        utils.playSound('card');
        app.haptic('impact', 'medium');
    }
};

durak.init();