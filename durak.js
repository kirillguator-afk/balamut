/**
 * METRO DURAK - Master Game Engine (v2.6 Full Sync)
 */
const durak = {
    gameState: {
        deck: [],
        hand: [],
        oppHandCount: 0,
        table: [],
        trump: null,
        isMyTurn: false,
        isDefender: false,
        bet: 0
    },

    init() {
        this.setupDragAndDrop();
        window.addEventListener('metro_p2p_data', (e) => this.handleData(e.detail));
        
        const takeBtn = document.getElementById('btn-dk-take');
        const doneBtn = document.getElementById('btn-dk-done');
        if(takeBtn) takeBtn.onclick = () => this.takeCards();
        if(doneBtn) doneBtn.onclick = () => this.doneTurn();
    },

    startP2PGame(bet) {
        if (app.balance < bet) return app.notify("Недостаточно средств", "error");
        
        this.gameState.bet = bet;
        this.createDeck();
        
        // Host deals
        const myHand = this.gameState.deck.splice(-6);
        const oppHand = this.gameState.deck.splice(-6);
        
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
                
            case 'DK_SYNC':
                this.gameState.table = [];
                this.gameState.hand.push(...(p.newCards || []));
                this.gameState.deck = p.deck;
                this.gameState.oppHandCount = p.oppCount;
                this.gameState.isMyTurn = p.yourTurn;
                this.gameState.isDefender = p.yourDefend;
                this.render();
                this.checkGameOver();
                break;

            case 'DK_WIN':
                this.endGame(false);
                break;
        }
    },

    takeCards() {
        const allCards = this.gameState.table.flatMap(s => [s.atk, s.def]).filter(Boolean);
        this.gameState.hand.push(...allCards);
        this.gameState.table = [];
        this.gameState.isMyTurn = false;
        
        if (p2p.isHost) {
            this.syncRound(false); // Ходит все еще атакующий
        } else {
            p2p.send('DK_TAKE_REQ', {});
        }
    },

    doneTurn() {
        this.gameState.table = [];
        this.gameState.isMyTurn = false;
        
        if (p2p.isHost) {
            this.syncRound(true); // Переход хода
        } else {
            p2p.send('DK_DONE_REQ', {});
        }
    },

    // Только Хост распределяет карты
    syncRound(transferTurn) {
        if (!p2p.isHost) return;

        // Добор хоста
        while(this.gameState.hand.length < 6 && this.gameState.deck.length > 0) {
            this.gameState.hand.push(this.gameState.deck.pop());
        }

        // Добор клиента (моделируем сколько ему надо)
        const clientNeed = 6 - this.gameState.oppHandCount;
        const clientCards = [];
        for(let i=0; i < clientNeed; i++) {
            if(this.gameState.deck.length > 0) clientCards.push(this.gameState.deck.pop());
        }

        if (transferTurn) {
            this.gameState.isDefender = !this.gameState.isDefender;
        }
        this.gameState.isMyTurn = !this.gameState.isDefender;

        p2p.send('DK_SYNC', {
            deck: this.gameState.deck,
            newCards: clientCards,
            oppCount: this.gameState.hand.length,
            yourTurn: this.gameState.isDefender,
            yourDefend: !this.gameState.isDefender
        });
        
        this.render();
        this.checkGameOver();
    },

    checkGameOver() {
        if (this.gameState.deck.length === 0 && this.gameState.hand.length === 0) {
            this.endGame(true);
            p2p.send('DK_WIN', {});
        }
    },

    endGame(isWinner) {
        if (isWinner) {
            app.balance += this.gameState.bet * 2;
            app.notify("ПОБЕДА! ВЫ ЗАБРАЛИ КУШ", "success");
            utils.spawnCoins();
        } else {
            app.notify("ВЫ ПРОИГРАЛИ. ПОВЕЗЕТ В СЛЕДУЮЩИЙ РАЗ", "error");
        }
        app.updateUI();
        setTimeout(() => app.switchView('hub'), 4000);
    },

    render() {
        const trumpEl = document.getElementById('dk-trump');
        if (this.gameState.trump) {
            trumpEl.innerHTML = utils.getSuitIcon(this.gameState.trump.suit);
            trumpEl.style.color = ['hearts','diamonds'].includes(this.gameState.trump.suit) ? 'var(--metro-red)' : '#fff';
        }
        
        document.getElementById('dk-deck-count').innerText = this.gameState.deck.length;

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

        const handEl = document.getElementById('dk-hand');
        handEl.innerHTML = '';
        this.gameState.hand.sort((a,b) => a.power - b.power).forEach(card => {
            handEl.appendChild(this.createCardUI(card));
        });

        const hasUnresolved = this.gameState.table.some(s => !s.def);
        const takeBtn = document.getElementById('btn-dk-take');
        const doneBtn = document.getElementById('btn-dk-done');
        
        if(takeBtn) takeBtn.classList.toggle('hidden', !this.gameState.isDefender || this.gameState.table.length === 0 || !hasUnresolved);
        if(doneBtn) doneBtn.classList.toggle('hidden', this.gameState.isDefender || hasUnresolved || this.gameState.table.length === 0);
        
        document.getElementById('opp-status').innerText = this.gameState.isMyTurn ? "ВАШ ХОД" : "ОЖИДАНИЕ ХОДА";
        document.getElementById('opp-status').className = `text-[10px] font-black uppercase tracking-widest ${this.gameState.isMyTurn ? 'text-emerald-500' : 'text-zinc-500'}`;
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
                const rect = active.getBoundingClientRect();
                startPos = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
                app.haptic('impact', 'light');
            }
        }, { passive: false });

        document.addEventListener('touchmove', (e) => {
            if (!active) return;
            e.preventDefault();
            const touch = e.touches[0];
            active.style.position = 'fixed';
            active.style.left = (touch.clientX - startPos.x) + 'px';
            active.style.top = (touch.clientY - startPos.y) + 'px';
            active.style.transform = `rotate(5deg) scale(1.1)`;
        }, { passive: false });

        document.addEventListener('touchend', (e) => {
            if (!active) return;
            const touch = e.changedTouches[0];
            const field = document.getElementById('dk-field').getBoundingClientRect();

            if (touch.clientY < field.bottom && touch.clientY > field.top) {
                this.tryPlayCard(active.dataset.suit, active.dataset.rank);
            }

            active.classList.remove('dragging');
            active.style.position = '';
            active.style.left = '';
            active.style.top = '';
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
        if (this.gameState.table.length >= 6) return false;
        const ranks = this.gameState.table.flatMap(s => [s.atk.rank, s.def?.rank]).filter(Boolean);
        return ranks.includes(card.rank);
    }
};

durak.init();