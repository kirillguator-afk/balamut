/**
 * METRO CASH Controller - FIXED VERSION
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
        
        // Ждем инициализации сети
        const id = await Network.init();
        if (id) {
            this.isReady = true;
            document.getElementById('create-game-btn').disabled = false;
            document.getElementById('create-game-btn').classList.remove('opacity-50');
            this.notify("ТУННЕЛЬ УСТАНОВЛЕН", "success");
        }
        
        const roomId = window.location.hash.substring(1);
        if (roomId && roomId.length > 5) {
            this.notify("ПОДКЛЮЧЕНИЕ К СТАНЦИИ...", "info");
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
        el.className = `${colors[type]} text-white px-4 py-3 rounded shadow-2xl text-xs font-bold animate-in flex items-center justify-between mb-2 pointer-events-auto`;
        el.innerHTML = `<span>${text}</span>`;
        container.appendChild(el);
        setTimeout(() => el.remove(), 4000);
    },

    setupListeners() {
        const createBtn = document.getElementById('create-game-btn');
        // Изначально выключаем кнопку, пока PeerJS не даст ID
        createBtn.disabled = true;
        createBtn.classList.add('opacity-50');

        createBtn.addEventListener('click', async () => {
            if (!this.isReady) {
                this.notify("СЕТЬ ЕЩЕ НЕ ГОТОВА", "error");
                return;
            }

            const custom = document.getElementById('custom-bet').value;
            if (custom) this.currentBet = parseInt(custom);
            
            if (this.balance < this.currentBet) {
                this.notify("НЕДОСТАТОЧНО СРЕДСТВ", "error");
                return;
            }

            createBtn.disabled = true;
            const originalText = createBtn.innerHTML;
            createBtn.innerText = "СВЯЗЬ С КАНАЛОМ...";

            this.isHost = true;
            const success = await TelegramAPI.publishGame(Network.id, this.currentBet);
            
            if (success) {
                this.notify("ЛИНИЯ ОТКРЫТА В КАНАЛЕ", "success");
                this.addLocalLine(Network.id, this.currentBet);
                createBtn.innerText = "В ОЖИДАНИИ ИГРОКА...";
            } else {
                this.notify("ОШИБКА ПУБЛИКАЦИИ", "error");
                createBtn.disabled = false;
                createBtn.innerHTML = originalText;
            }
        });

        window.addEventListener('p2p_connected', () => {
            this.startGame();
        });
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
            <div class="bg-zinc-900/80 border border-red-500/20 p-4 rounded-xl flex justify-between items-center animate-in shadow-lg">
                <div>
                    <div class="text-[10px] text-red-500 font-bold uppercase tracking-widest">ВАША СТАНЦИЯ</div>
                    <div class="font-mono text-lg">${line.bet} ₽</div>
                </div>
                <div class="flex flex-col items-end">
                    <span class="inline-flex h-2 w-2 rounded-full bg-green-500 animate-ping mb-1"></span>
                    <div class="text-[9px] text-gray-400 font-mono">${line.id.substring(0,8)}</div>
                </div>
            </div>
        `).join('');
    },

    startGame() {
        document.getElementById('lobby').classList.add('hidden');
        document.getElementById('game-table').classList.remove('hidden');
        this.notify("ИГРА НАЧИНАЕТСЯ", "success");
        // Инициализация Game...
    }
};

function setBet(val) {
    document.querySelectorAll('.bet-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    app.currentBet = val;
    document.getElementById('custom-bet').value = val;
}

app.init();