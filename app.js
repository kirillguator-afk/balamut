/**
 * Глобальный контроллер METRO CASH
 */
const app = {
    balance: 5000,
    currentBet: 100,
    isHost: false,
    activeLines: [],
    isReady: false,

    async init() {
        this.loadBalance();
        this.setupListeners();
        
        const id = await Network.init();
        if (id) {
            this.isReady = true;
            const btn = document.getElementById('create-game-btn');
            btn.disabled = false;
            btn.classList.remove('opacity-50');
            document.getElementById('peer-status').innerText = `ID: ${id.substring(0,8)}`;
            document.getElementById('peer-status').classList.add('text-green-500');
        }
        
        const roomId = window.location.hash.substring(1);
        if (roomId && roomId.length > 5) {
            this.notify("ВХОД В ТУННЕЛЬ...", "info");
            Network.connect(roomId);
        }

        this.renderLobby();
    },

    loadBalance() {
        const saved = localStorage.getItem('metro_balance');
        if (saved) this.balance = parseFloat(saved);
        this.updateUI();
    },

    updateUI() {
        document.getElementById('user-balance').innerText = `${this.balance.toFixed(0)} ₽`;
    },

    notify(text, type = 'info') {
        const container = document.getElementById('notif-container');
        const el = document.createElement('div');
        const colors = {
            info: 'bg-zinc-800 border-l-4 border-blue-500',
            error: 'bg-zinc-800 border-l-4 border-red-500',
            success: 'bg-zinc-800 border-l-4 border-green-500'
        };
        el.className = `${colors[type]} text-white px-4 py-3 rounded shadow-2xl text-[10px] font-bold animate-in flex items-center mb-2 pointer-events-auto uppercase tracking-tighter`;
        el.innerHTML = text;
        container.appendChild(el);
        setTimeout(() => el.remove(), 4000);
    },

    setupListeners() {
        document.getElementById('create-game-btn').addEventListener('click', async () => {
            const custom = document.getElementById('custom-bet').value;
            if (custom) this.currentBet = parseInt(custom);
            
            if (this.balance < this.currentBet) {
                this.notify("НЕДОСТАТОЧНО СРЕДСТВ", "error");
                return;
            }

            this.isHost = true;
            const success = await TelegramAPI.publishGame(Network.id, this.currentBet);
            if (success) {
                this.notify("ОФФЕР ОТПРАВЛЕН В КАНАЛ", "success");
                this.addLocalLine(Network.id, this.currentBet);
                document.getElementById('create-game-btn').innerText = "ОЖИДАНИЕ ИГРОКА...";
                document.getElementById('create-game-btn').disabled = true;
            }
        });

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
        console.log("Network In:", data.type, data.payload);
        
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

    // Логика добора карт (Хост управляет колодой)
    drawPhase() {
        if (!this.isHost) return;

        // Добор хоста
        while (Game.hand.length < 6 && Game.deck.length > 0) {
            Game.hand.push(Game.deck.pop());
        }

        // Добор клиента
        const clientNewCards = [];
        while (clientNewCards.length + (Game.oppCardsCount) < 6 && Game.deck.length > 0) {
            clientNewCards.push(Game.deck.pop());
        }

        // Кто ходит следующим? 
        // Если был "Бито" - ход переходит. Если "Взял" - остается.
        // Для простоты в прототипе: переключаем роли
        Game.isDefender = !Game.isDefender;
        Game.isMyTurn = !Game.isDefender;

        Network.send('DRAW', {
            newCards: clientNewCards,
            deckLeft: Game.deck,
            yourTurn: Game.isDefender, // Для него инверсия
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

        document.getElementById('opp-cards-count').innerText = `КАРТ У ПРОТИВНИКА: ${Game.oppCardsCount}`;
        document.getElementById('cards-left').innerText = Game.deck.length;
        document.getElementById('trump-indicator').innerText = Game.getSuitIcon(Game.trump.suit);
        document.getElementById('trump-indicator').style.color = ['hearts', 'diamonds'].includes(Game.trump.suit) ? '#ef4444' : '#fff';

        // Buttons
        const hasUnbeaten = Game.table.some(p => !p.defense);
        document.getElementById('take-btn').classList.toggle('hidden', !Game.isDefender || Game.table.length === 0 || !hasUnbeaten);
        document.getElementById('done-btn').classList.toggle('hidden', Game.isDefender || Game.table.length === 0 || hasUnbeaten);

        // Turn indicator
        const statusText = Game.isMyTurn ? "ВАШ ХОД" : "ХОД ПРОТИВНИКА";
        this.notify(statusText, Game.isMyTurn ? "success" : "info");
    },

    addLocalLine(id, bet) {
        this.activeLines.push({ id, bet, time: new Date().toLocaleTimeString() });
        this.renderLobby();
    },

    renderLobby() {
        const listEl = document.getElementById('game-list');
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
                    <div class="text-[10px] text-green-500 animate-pulse font-bold">ОЖИДАНИЕ...</div>
                </div>
            </div>
        `).join('');
    }
};

function setBet(val) {
    document.querySelectorAll('.bet-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    app.currentBet = val;
    document.getElementById('custom-bet').value = val;
}

app.init();