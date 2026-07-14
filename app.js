/**
 * METRO CASH Controller - УПРАВЛЕНИЕ ЛИНИЯМИ И ЛОГИКОЙ
 */
const app = {
    balance: 5000,
    currentBet: 100,
    isHost: false,
    activeLines: [],

    async init() {
        this.loadBalance();
        this.setupListeners();
        await Network.init();
        
        // Проверка входа по ссылке (принятие вызова)
        const roomId = window.location.hash.substring(1);
        if (roomId && roomId.length > 5) {
            this.notify("Подключение к линии " + roomId.substring(0,4), "info");
            setTimeout(() => Network.connect(roomId), 1000);
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
        el.className = `${colors[type]} text-white px-4 py-3 rounded shadow-2xl text-xs font-bold animate-in flex items-center justify-between mb-2`;
        el.innerHTML = `<span>${text}</span><div class="ml-4 w-2 h-2 rounded-full bg-current opacity-50"></div>`;
        container.appendChild(el);
        setTimeout(() => el.remove(), 4000);
    },

    setupListeners() {
        // Кнопка создания игры
        const createBtn = document.getElementById('create-game-btn');
        createBtn.addEventListener('click', async () => {
            const custom = document.getElementById('custom-bet').value;
            if (custom) this.currentBet = parseInt(custom);
            
            if (this.balance < this.currentBet) {
                this.notify("НЕДОСТАТОЧНО СРЕДСТВ", "error");
                return;
            }

            createBtn.disabled = true;
            createBtn.innerText = "ПУБЛИКАЦИЯ...";

            this.isHost = true;
            const success = await TelegramAPI.publishGame(Network.id, this.currentBet);
            
            if (success) {
                this.notify("ЛИНИЯ ОТКРЫТА В КАНАЛЕ", "success");
                this.addLocalLine(Network.id, this.currentBet);
            } else {
                this.notify("ОШИБКА ПУБЛИКАЦИИ", "error");
                createBtn.disabled = false;
                createBtn.innerText = "Опубликовать Вызов";
            }
        });

        window.addEventListener('p2p_connected', () => {
            this.notify("ТУННЕЛЬ УСТАНОВЛЕН", "success");
            this.startGame();
        });

        window.addEventListener('p2p_data', (e) => this.handleNetworkData(e.detail));
    },

    addLocalLine(id, bet) {
        this.activeLines.push({ id, bet, time: new Date().toLocaleTimeString() });
        this.renderLobby();
    },

    renderLobby() {
        const listEl = document.getElementById('game-list');
        if (this.activeLines.length === 0) {
            listEl.innerHTML = `<div class="text-center py-10 text-gray-600 italic text-sm">Нет активных линий. Создайте свою!</div>`;
            return;
        }

        listEl.innerHTML = this.activeLines.map(line => `
            <div class="bg-zinc-900/50 border border-white/5 p-4 rounded-xl flex justify-between items-center animate-in">
                <div>
                    <div class="text-[10px] text-red-500 font-bold uppercase tracking-widest">LIVE STATION</div>
                    <div class="font-mono text-lg">${line.bet} ₽</div>
                </div>
                <div class="text-right">
                    <div class="text-[10px] text-gray-500 uppercase">${line.time}</div>
                    <div class="text-xs text-green-500">ОЖИДАНИЕ...</div>
                </div>
            </div>
        `).join('');
    },

    startGame() {
        document.getElementById('lobby').classList.add('hidden');
        document.getElementById('game-table').classList.remove('hidden');
        Game.reset();
        
        if (this.isHost) {
            Game.initDeck();
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
        // (Логика из предыдущей версии остается неизменной для игрового цикла)
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
            // ... остальные кейсы
        }
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
    }
};

function setBet(val) {
    document.querySelectorAll('.bet-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    app.currentBet = val;
    document.getElementById('custom-bet').value = val;
}

app.init();