/**
 * METRO DURAK - P2P Sync & Interaction (v2.5)
 */
const durak = {
    gameState: {
        deck: [],
        hand: [],
        oppHandCount: 0,
        table: [], // [{atk, def}]
        trump: null,
        isMyTurn: false,
        isDefender: false,
        bet: 0
    },

    init() {
        this.setupDragAndDrop();
        window.addEventListener('metro_p2p_data', (e) => this.handleData(e.detail));
        
        document.getElementById('btn-dk-take').onclick = () => this.takeCards();
        document.getElementById('btn-dk-done').onclick = () => this.doneTurn();
    },

    // --- GAME ACTIONS ---
    
    startP2PGame(bet) {
        if (app.balance < bet) return app.notify("Недостаточно средств", "error");
        
        this.gameState.bet = bet;
        this.createDeck();
        
        // Раздача
        const myHand = this.gameState.deck.splice(0, 6);
        const oppHand = this.gameState.deck.splice(0, 6);
        
        this.gameState.hand = myHand;
        this.gameState.oppHandCount = 6;
        this.gameState.isMyTurn = true;
        this.gameState.isDefender = false;

        p2p.send('DK_INIT', {
            deck: this.gameState.deck,
            trump: this.gameState.trump,
            hand: oppHand,
            bet: bet
        });

        app.switchView('durak');
        this.render();
    },

    createDeck() {
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        const ranks = ['6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        this.gameState.deck = [];
        suits.forEach(s => {
            ranks.forEach((r, i) => {
                this.gameState.deck.push({ suit: s, rank: r, power: i });
            });
        });
        utils.shuffle(this.gameState.deck);
        this.gameState.trump = this.gameState.deck[0];
    },

    handleData(data) {
        const p = data.payload;
        switch(data.type) {
            case 'DK_INIT':
                this.gameState.deck = p.deck;
                this.gameState.trump = p.trump;
                this.gameState.hand = p.hand;
                this.gameState.oppHandCount = 6;
                this.gameState.isMyTurn = false;
                this.gameState.isDefender = true;
                this.gameState.bet = p.bet;
                app.switchView('durak');
                this.render();
                break;

            case 'DK_ATTACK':
                this.gameState.table.push({ atk: p.card, def: null });
                this.gameState.oppHandCount--;
                this.gameState.isMyTurn = true;
                utils.playSound('card');
                this.render();
                break;

            case 'DK_DEFEND':
                const slot = this.gameState.table.find(s => s.atk.suit === p.targetSuit && s.atk.rank === p.targetRank);
                if (slot) slot.def = p.card;
                this.gameState.oppHandCount--;
                this.gameState.isMyTurn = true;
                utils.playSound('card');
                this.render();
                break;
                
            case 'DK_DONE':
                this.gameState.table = [];
                this.gameState.isMyTurn = this.gameState.isDefender;
                this.gameState.isDefender = !this.gameState.isDefender;
                this.drawCards();
                this.render();
                break;
        }
    },

    // --- UI & INTERACTIONS ---

    render() {
        // Trump
        const trumpEl = document.getElementById('dk-trump');
        trumpEl.innerHTML = utils.getSuitIcon(this.gameState.trump.suit);
        trumpEl.style.color = ['hearts','diamonds'].includes(this.gameState.trump.suit) ? 'var(--metro-red)' : '#fff';
        
        // Deck
        document.getElementById('dk-deck-count').innerText = this.gameState.deck.length;

        // Table
        const tableEl = document.getElementById('dk-table');
        tableEl.innerHTML = '';
        this.gameState.table.forEach(slot => {
            const wrap = document.createElement('div');
            wrap.className = 'dk-slot';
            wrap.appendChild(this.createCardUI(slot.atk));
            if (slot.def) {
                const defEl = this.createCardUI(slot.def);
                defEl.classList.add('defense-card');
                wrap.appendChild(defEl);
            }
            tableEl.appendChild(wrap);
        });

        // Hand
        const handEl = document.getElementById('dk-hand');
        handEl.innerHTML = '';
        this.gameState.hand.sort((a,b) => a.power - b.power).forEach(card => {
            handEl.appendChild(this.createCardUI(card));
        });

        // Actions
        const hasUnresolved = this.gameState.table.some(s => !s.def);
        document.getElementById('btn-dk-take').classList.toggle('hidden', !this.gameState.isDefender || !hasUnresolved);
        document.getElementById('btn-dk-done').classList.toggle('hidden', this.gameState.isDefender || hasUnresolved || this.gameState.table.length === 0);
        
        document.getElementById('opp-status').innerText = this.gameState.isMyTurn ? "Ход противника" : "Ваш ход";
    },

    createCardUI(card) {
        const div = document.createElement('div');
        div.className = `card ${['hearts', 'diamonds'].includes(card.suit) ? 'red' : 'black'}`;
        div.innerHTML = `
            <div class="card-suit-mini suit-tl">${utils.getSuitIcon(card.suit)}</div>
            <div class="card-val">${card.rank}</div>
            <div class="card-suit-mini suit-br">${utils.getSuitIcon(card.suit)}</div>
        `;
        div.dataset.suit = card.suit;
        div.dataset.rank = card.rank;
        return div;
    },

    setupDragAndDrop() {
        let active = null;
        let startPos = { x: 0, y: 0 };

        document.addEventListener('touchstart', (e) => {
            const card = e.target.closest('#dk-hand .card');
            if (card && this.gameState.isMyTurn) {
                active = card;
                active.classList.add('dragging');
                const touch = e.touches[0];
                startPos = { x: touch.clientX, y: touch.clientY };
                app.haptic('impact', 'light');
            }
        }, { passive: false });

        document.addEventListener('touchmove', (e) => {
            if (!active) return;
            const touch = e.touches[0];
            active.style.transform = `translate(${touch.clientX - startPos.x}px, ${touch.clientY - startPos.y}px) rotate(5deg) scale(1.1)`;
        }, { passive: false });

        document.addEventListener('touchend', (e) => {
            if (!active) return;
            const touch = e.changedTouches[0];
            const dropZone = document.getElementById('dk-field').getBoundingClientRect();

            if (touch.clientY < dropZone.bottom && touch.clientY > dropZone.top) {
                this.tryPlayCard(active.dataset.suit, active.dataset.rank);
            }

            active.classList.remove('dragging');
            active.style.transform = '';
            active = null;
        });
    },

    tryPlayCard(suit, rank) {
        const cardIndex = this.gameState.hand.findIndex(c => c.suit === suit && c.rank === rank);
        const card = this.gameState.hand[cardIndex];

        if (this.gameState.isDefender) {
            const target = this.gameState.table.find(s => !s.def);
            if (target && this.canBeat(target.atk, card)) {
                target.def = card;
                this.gameState.hand.splice(cardIndex, 1);
                this.gameState.isMyTurn = false;
                p2p.send('DK_DEFEND', { card, targetSuit: target.atk.suit, targetRank: target.atk.rank });
                utils.playSound('card');
            }
        } else {
            if (this.canAttack(card)) {
                this.gameState.table.push({ atk: card, def: null });
                this.gameState.hand.splice(cardIndex, 1);
                this.gameState.isMyTurn = false;
                p2p.send('DK_ATTACK', { card });
                utils.playSound('card');
            }
        }
        this.render();
    },

    canBeat(atk, def) {
        if (def.suit === atk.suit) return def.power > atk.power;
        return def.suit === this.gameState.trump.suit;
    },

    canAttack(card) {
        if (this.gameState.table.length === 0) return true;
        const ranks = this.gameState.table.flatMap(s => [s.atk.rank, s.def?.rank]).filter(Boolean);
        return ranks.includes(card.rank);
    },

    drawCards() {
        // Логика добора из колоды (синхронно у обоих)
        while(this.gameState.hand.length < 6 && this.gameState.deck.length > 0) {
            this.gameState.hand.push(this.gameState.deck.pop());
        }
    }
};

durak.init();