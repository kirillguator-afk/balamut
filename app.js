/**
 * Глобальный контроллер METRO CASH (v2.2 Smart Reconnect)
 */
const app = {
    balance: 5000,
    currentBet: 100,
    isHost: false,
    activeLines: [],
    isReady: false,
    joinRetries: 0,

    async init() {
        this.loadBalance();
        this.setupListeners();
        
        try {
            const id = await Network.init();
            if (id) {
                this.isReady = true;
                this.updateNetworkStatus(id);
                this.checkUrlHash();
            }
        } catch (e) {
            console.error("METRO_APP: Ошибка старта.");
        }

        this.renderLobby();
    },

    checkUrlHash() {
        const roomId = window.location.hash.substring(1);
        if (roomId && roomId.length > 5) {
            this.attemptToJoin(roomId);
        }
    },

    /**
     * Умная попытка входа: если peer-unavailable, пробуем снова.
     * Это решает проблему, когда один игрок зашел быстрее, чем сервер PeerJS обновил базу.
     */
    attemptToJoin(roomId) {
        if (this.joinRetries > 15) {
            this.notify("СТАНЦИЯ НЕ ОТВЕЧАЕТ", "error");
            this.joinRetries = 0;
            return;
        }

        this.notify(`ПОИСК СТАНЦИИ (${this.joinRetries + 1}/15)...`, "info");
        Network.connect(roomId);

        // Если через 3 секунды соединение не открылось - пробуем снова
        setTimeout(() => {
            if (!Network.conn || !Network.conn.open) {
                this.joinRetries++;
                this.attemptToJoin(roomId);
            } else {
                this.joinRetries = 0;
                this.notify("СВЯЗЬ УСТАНОВЛЕНА", "success");
            }
        }, 3000);
    },

    updateNetworkStatus(id) {
        const el = document.getElementById('peer-status');
        if (el) {
            el.innerText = `ID: ${id.substring(0,8).toUpperCase()}`;
            el.className = "text-[8px] text-green-500 font-mono tracking-tighter uppercase";
        }
        const btn = document.getElementById('create-game-btn');
        if (btn) {
            btn.disabled = false;
            btn.classList.remove('opacity-50');
        }
    },

    loadBalance() {
        const saved = localStorage.getItem('metro_balance');
        if (saved) this.balance = parseFloat(saved);
        this.updateUI();
    },

    updateUI() {
        const el = document.getElementById('user-balance');
        if (el) el.innerText = `${this.balance.toFixed(0)} ₽`;
    },

    notify(text, type = 'info') {
        const container = document.getElementById('notif-container');
        if(!container) return;
        const el = document.createElement('div');
        const colors = {
            info: 'bg-zinc-800 border-l-4 border-blue-500',
            error: 'bg-zinc-800 border-l-4 border-red-500',
            success: 'bg-zinc-800 border-l-4 border-green-500'
        };
        el.className = `${colors[type]} text-white px-4 py-3 rounded shadow-2xl text-[10px] font-bold animate-in flex items-center mb-2 pointer-events-auto uppercase tracking-tighter`;
        el.innerHTML = text;
        container.appendChild(el);
        setTimeout(() => { if(el) el.remove(); }, 3500);
    },

    setupListeners() {
        const createBtn = document.getElementById('create-game-btn');
        if (createBtn) {
            createBtn.addEventListener('click', async () => {
                if (!this.isReady) return;
                
                const val = document.getElementById('custom-bet').value;
                if (val) this.currentBet = parseInt(val);
                
                if (this.balance < this.currentBet) {
                    this.notify("НЕДОСТАТОЧНО СРЕДСТВ", "error");
                    return;
                }

                this.isHost = true;
                createBtn.disabled = true;
                createBtn.innerText = "ПУБЛИКАЦИЯ...";

                const success = await TelegramAPI.publishGame(Network.id, this.currentBet);
                
                if (success) {
                    this.notify("ОФФЕР ОТПРАВЛЕН", "success");
                    this.addLocalLine(Network.id, this.currentBet);
                    createBtn.innerText = "ОЖИДАНИЕ...";
                } else {
                    createBtn.disabled = false;
                    createBtn.innerText = "Опубликовать";
                }
            });
        }

        window.addEventListener('p2p_connected', () => this.startGame());
        window.addEventListener('p2p_data', (e) => this.handleNetworkData(e.detail));
        
        document.getElementById('take-btn').onclick = () => this.playerTake();
        document.getElementById('done-btn').onclick = () => this.playerDone();
    },

    startGame() {
        document.getElementById('lobby').classList.add('hidden');
        document.getElementById('game-table').classList.remove('hidden');
        Game.reset();
        
        this.balance -= this.currentBet;
        this.updateUI();
        localStorage.setItem('metro_balance', this.balance);

        if (this.isHost) {
            Game.initDeck();
            const p1Hand = Game.deck.splice(-6);
            const p2Hand = Game.deck.splice(-6);
            Game.hand = p1Hand;
            Game.oppCardsCount = 6;
            Game.isMyTurn = true;
            Game.isDefender = false;

            Network.send('GAME_INIT', {
                deck: Game.deck,
                trump: Game.trump,
                hand: p2Hand,
                bet: this.currentBet,
                isDefender: true
            });
            this.renderGame();
        }
    },

    handleNetworkData(data) {
        switch(data.type) {
            case 'GAME_INIT':
                Game.deck = data.payload.deck;
                Game.trump = data.payload.trump;
                Game.hand = data.payload.hand;
                Game.isMyTurn = !data.payload.isDefender;
                Game.isDefender = data.payload.isDefender;
                Game.oppCardsCount = 6;
                this.currentBet = data.payload.bet;
                this.renderGame();
                break;
            case 'ATTACK':
                Game.table.push({ attack: data.payload.card, defense: null });
                Game.oppCardsCount--;
                Game.isMyTurn = true;
                this.renderGame();
                break;
            case 'DEFENSE':
                const pair = Game.table.find(p => !p.defense);
                if (pair) pair.defense = data.payload.card;
                Game.oppCardsCount--;
                Game.isMyTurn = true;
                this.renderGame();
                break;
            case 'DONE':
                Game.table = [];
                this.drawPhase();
                break;
            case 'TAKE':
                const allCards = Game.table.flatMap(p => [p.attack, p.defense]).filter(Boolean);
                Game.oppCardsCount += allCards.length;
                Game.table = [];
                this.drawPhase();
                break;
            case 'DRAW':
                Game.hand.push(...data.payload.newCards);
                Game.deck = data.payload.deckLeft;
                Game.isMyTurn = data.payload.yourTurn;
                Game.isDefender = data.payload.yourDefend;
                Game.oppCardsCount = data.payload.oppCount;
                this.renderGame();
                break;
        }
    },

    drawPhase() {
        if (!this.isHost) return;
        while (Game.hand.length < 6 && Game.deck.length > 0) Game.hand.push(Game.deck.pop());
        const clientNewCards = [];
        while (clientNewCards.length + (Game.oppCardsCount) < 6 && Game.deck.length > 0) clientNewCards.push(Game.deck.pop());
        
        Game.isDefender = !Game.isDefender;
        Game.isMyTurn = !Game.isDefender;

        Network.send('DRAW', {
            newCards: clientNewCards,
            deckLeft: Game.deck,
            yourTurn: Game.isDefender,
            yourDefend: !Game.isDefender,
            oppCount: Game.hand.length
        });
        this.renderGame();
    },

    handleCardClick(card, index) {
        if (!Game.isMyTurn) return;
        if (!Game.isDefender) {
            if (Game.canAttack(card)) {
                Game.hand.splice(index, 1);
                Game.table.push({ attack: card, defense: null });
                Game.isMyTurn = false;
                Network.send('ATTACK', { card });
                this.renderGame();
            }
        } else {
            const toDefend = Game.table.find(p => !p.defense);
            if (toDefend && Game.canDefend(toDefend.attack, card)) {
                Game.hand.splice(index, 1);
                toDefend.defense = card;
                Game.isMyTurn = false;
                Network.send('DEFENSE', { card });
                this.renderGame();
            }
        }
    },

    playerTake() {
        const cards = Game.table.flatMap(p => [p.attack, p.defense]).filter(Boolean);
        Game.hand.push(...cards);
        Game.table = [];
        Game.isMyTurn = false;
        Network.send('TAKE', {});
        if (this.isHost) this.drawPhase();
    },

    playerDone() {
        Game.table = [];
        Game.isMyTurn = false;
        Network.send('DONE', {});
        if (this.isHost) this.drawPhase();
    },

    renderGame() {
        const handEl = document.getElementById('player-hand');
        if(!handEl) return;
        handEl.innerHTML = '';
        Game.hand.sort((a,b) => a.power - b.power).forEach((card, index) => {
            const el = Game.createCardElement(card, false, () => this.handleCardClick(card, index));
            handEl.appendChild(el);
        });

        const tableEl = document.getElementById('table-cards');
        tableEl.innerHTML = '';
        Game.table.forEach(pair => {
            const wrap = document.createElement('div');
            wrap.className = 'card-pair';
            wrap.appendChild(Game.createCardElement(pair.attack));
            if (pair.defense) {
                const def = Game.createCardElement(pair.defense);
                def.classList.add('defense-card');
                wrap.appendChild(def);
            }
            tableEl.appendChild(wrap);
        });

        document.getElementById('opp-cards-count').innerText = `ПРОТИВНИК: ${Game.oppCardsCount} КАРТ`;
        document.getElementById('cards-left').innerText = Game.deck.length;
        document.getElementById('trump-indicator').innerText = Game.getSuitIcon(Game.trump.suit);
        document.getElementById('trump-indicator').style.color = ['hearts', 'diamonds'].includes(Game.trump.suit) ? '#ef4444' : '#fff';

        const hasUnbeaten = Game.table.some(p => !p.defense);
        document.getElementById('take-btn').classList.toggle('hidden', !Game.isDefender || Game.table.length === 0 || !hasUnbeaten);
        document.getElementById('done-btn').classList.toggle('hidden', Game.isDefender || Game.table.length === 0 || hasUnbeaten);

        const statusText = Game.isMyTurn ? "ВАШ ХОД" : "ЖДЕМ ХОД";
        this.notify(statusText, Game.isMyTurn ? "success" : "info");
    },

    addLocalLine(id, bet) {
        this.activeLines.push({ id, bet, time: new Date().toLocaleTimeString() });
        this.renderLobby();
    },

    renderLobby() {
        const listEl = document.getElementById('game-list');
        if (!listEl) return;
        if (this.activeLines.length === 0) {
            listEl.innerHTML = `<div class="text-center py-10 text-zinc-600 italic text-xs uppercase tracking-widest">Нет активных станций</div>`;
            return;
        }
        listEl.innerHTML = this.activeLines.map(line => `
            <div class="bg-zinc-900 border border-white/5 p-4 rounded-2xl flex justify-between items-center animate-in">
                <div>
                    <div class="text-[9px] text-red-500 font-bold uppercase mb-1">Live Станция</div>
                    <div class="font-mono text-xl">${line.bet} ₽</div>
                </div>
                <div class="text-right">
                    <div class="text-[10px] text-zinc-500 mb-1">${line.time}</div>
                    <div class="text-[10px] text-green-500 animate-pulse font-bold uppercase">В поиске...</div>
                </div>
            </div>
        `).join('');
    }
};

function setBet(val) {
    document.querySelectorAll('.bet-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    app.currentBet = val;
    const input = document.getElementById('custom-bet');
    if(input) input.value = val;
}

app.init();