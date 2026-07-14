/**
 * METRO CASH Controller
 */
const app = {
    balance: 5000,
    currentBet: 100,
    isHost: false,

    async init() {
        this.loadBalance();
        this.setupListeners();
        await Network.init();
        
        // Авто-подключение если есть хеш
        const roomId = window.location.hash.substring(1);
        if (roomId && roomId.length > 5) {
            this.notify("Подключение к станции...", "info");
            Network.connect(roomId);
        }
    },

    loadBalance() {
        const saved = localStorage.getItem('metro_balance');
        if (saved) this.balance = parseFloat(saved);
        this.updateUI();
    },

    saveBalance() {
        localStorage.setItem('metro_balance', this.balance);
        this.updateUI();
    },

    updateUI() {
        document.getElementById('user-balance').innerText = `${this.balance.toFixed(2)} ₽`;
    },

    notify(text, type = 'info') {
        const container = document.getElementById('notif-container');
        const el = document.createElement('div');
        const colors = {
            info: 'bg-blue-600',
            error: 'bg-red-600',
            success: 'bg-green-600'
        };
        el.className = `${colors[type]} text-white px-4 py-2 rounded shadow-xl text-xs font-bold animate-in uppercase tracking-widest`;
        el.innerText = text;
        container.appendChild(el);
        setTimeout(() => el.remove(), 3000);
    },

    setupListeners() {
        // Создание игры
        document.getElementById('create-game-btn').addEventListener('click', () => {
            const custom = document.getElementById('custom-bet').value;
            if (custom) this.currentBet = parseInt(custom);
            
            if (this.balance < this.currentBet) {
                this.notify("Недостаточно средств", "error");
                return;
            }

            this.isHost = true;
            TelegramAPI.publishGame(Network.id, this.currentBet);
            this.notify("Вызов опубликован в канале!", "success");
        });

        // P2P События
        window.addEventListener('p2p_connected', () => {
            this.notify("Туннель установлен. Начало игры...", "success");
            this.startGame();
        });

        window.addEventListener('p2p_data', (e) => this.handleNetworkData(e.detail));

        // Игровые кнопки
        document.getElementById('take-btn').addEventListener('click', () => this.playerTake());
        document.getElementById('done-btn').addEventListener('click', () => this.playerDone());
    },

    startGame() {
        document.getElementById('lobby').classList.add('hidden');
        document.getElementById('game-table').classList.remove('hidden');
        Game.reset();
        
        if (this.isHost) {
            Game.initDeck();
            // Раздача
            const p1Hand = Game.deck.splice(0, 6);
            const p2Hand = Game.deck.splice(0, 6);
            Game.hand = p1Hand;
            Game.isMyTurn = true;
            Game.isDefender = false;

            Network.send('GAME_START', {
                deck: Game.deck,
                trump: Game.trump,
                hand: p2Hand,
                turn: false,
                isDefender: true,
                bet: this.currentBet
            });
            this.renderGame();
        }
    },

    handleNetworkData(data) {
        switch(data.type) {
            case 'GAME_START':
                Game.deck = data.payload.deck;
                Game.trump = data.payload.trump;
                Game.hand = data.payload.hand;
                Game.isMyTurn = data.payload.turn;
                Game.isDefender = data.payload.isDefender;
                this.currentBet = data.payload.bet;
                this.renderGame();
                break;
            
            case 'ATTACK':
                Game.table.push({ attack: data.payload.card, defense: null });
                Game.isMyTurn = true;
                this.renderGame();
                break;

            case 'DEFENSE':
                const pair = Game.table.find(p => !p.defense);
                if (pair) pair.defense = data.payload.card;
                Game.isMyTurn = true;
                this.renderGame();
                break;

            case 'DONE':
                Game.table = [];
                this.drawCards();
                Game.isMyTurn = !Game.isDefender;
                this.renderGame();
                break;
            
            case 'TAKE':
                // Оппонент забрал карты
                const allCards = Game.table.flatMap(p => [p.attack, p.defense]).filter(Boolean);
                // В реальной логике тут нужно передать эти карты в руку оппонента, 
                // но для прототипа просто чистим стол
                Game.table = [];
                this.drawCards();
                Game.isMyTurn = true; // Мы продолжаем ходить
                this.renderGame();
                break;
        }
    },

    drawCards() {
        if (!this.isHost) return; // Только хост управляет колодой
        // Логика добора...
    },

    renderGame() {
        const handEl = document.getElementById('player-hand');
        handEl.innerHTML = '';
        Game.hand.forEach((card, index) => {
            const el = Game.createCardElement(card);
            el.addEventListener('click', () => this.handleCardClick(card, index));
            handEl.appendChild(el);
        });

        const tableEl = document.getElementById('table-cards');
        tableEl.innerHTML = '';
        Game.table.forEach(pair => {
            const wrapper = document.createElement('div');
            wrapper.className = 'card-pair';
            wrapper.appendChild(Game.createCardElement(pair.attack));
            if (pair.defense) {
                const defEl = Game.createCardElement(pair.defense);
                defEl.classList.add('defense-card');
                wrapper.appendChild(defEl);
            }
            tableEl.appendChild(wrapper);
        });

        document.getElementById('trump-indicator').innerText = Game.getSuitIcon(Game.trump.suit);
        document.getElementById('cards-left').innerText = Game.deck.length;

        // UI Buttons
        const canTake = Game.isDefender && Game.table.length > 0 && Game.table.some(p => !p.defense);
        const canDone = !Game.isDefender && Game.table.length > 0 && Game.table.every(p => p.defense);
        
        document.getElementById('take-btn').classList.toggle('hidden', !canTake);
        document.getElementById('done-btn').classList.toggle('hidden', !canDone);
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
            const pairToDefend = Game.table.find(p => !p.defense);
            if (pairToDefend && Game.canDefend(pairToDefend.attack, card)) {
                Game.hand.splice(index, 1);
                pairToDefend.defense = card;
                Game.isMyTurn = false;
                Network.send('DEFENSE', { card });
                this.renderGame();
            }
        }
    },

    playerTake() {
        const tableCards = Game.table.flatMap(p => [p.attack, p.defense]).filter(Boolean);
        Game.hand.push(...tableCards);
        Game.table = [];
        Network.send('TAKE', {});
        this.renderGame();
    },

    playerDone() {
        Game.table = [];
        Network.send('DONE', {});
        this.renderGame();
    }
};

function setBet(val) {
    document.querySelectorAll('.bet-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    app.currentBet = val;
}

app.init();