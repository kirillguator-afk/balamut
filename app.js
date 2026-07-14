/**
 * Main Controller
 */
const App = {
    state: {
        balance: 2450,
        bet: 100
    },

    init() {
        this.bindEvents();
        this.simulateLobby();
        
        // Loader sequence
        setTimeout(() => {
            document.getElementById('loader').classList.add('opacity-0');
            setTimeout(() => {
                document.getElementById('loader').style.display = 'none';
                document.getElementById('main-app').classList.remove('hidden');
                setTimeout(() => document.getElementById('main-app').classList.add('opacity-100'), 50);
            }, 1000);
        }, 2000);

        Network.init();
    },

    bindEvents() {
        // Create Game
        document.getElementById('btn-create-game').onclick = () => this.showCreateModal();

        // P2P Events
        window.addEventListener('p2p_connected', () => this.startGame());
        window.addEventListener('p2p_data', (e) => this.handleNetworkData(e.detail));
    },

    showCreateModal() {
        const modal = document.getElementById('modal-container');
        const content = document.getElementById('modal-content');
        
        content.innerHTML = `
            <h2 class="text-2xl font-['Orbitron'] font-bold text-yellow-500 mb-6">НОВЫЙ СТОЛ</h2>
            <div class="space-y-4 mb-8">
                <div>
                    <label class="text-[10px] uppercase text-zinc-500 font-bold mb-1 block">Ставка (RUB)</label>
                    <input type="number" id="bet-val" value="100" class="w-full bg-black border border-white/10 rounded-xl p-4 text-xl font-mono outline-none focus:border-yellow-500/50">
                </div>
            </div>
            <button id="confirm-publish" class="w-full py-4 bg-yellow-500 text-black font-bold rounded-xl active:scale-95 transition-all">ОПУБЛИКОВАТЬ В TG</button>
        `;
        
        modal.classList.remove('hidden');
        modal.classList.add('flex');

        document.getElementById('confirm-publish').onclick = async () => {
            this.state.bet = document.getElementById('bet-val').value;
            const btn = document.getElementById('confirm-publish');
            btn.disabled = true;
            btn.innerText = "ПУБЛИКАЦИЯ...";
            
            await TelegramAPI.publishGame(Network.id, this.state.bet);
            
            content.innerHTML = `
                <div class="text-center py-10">
                    <div class="metro-loader justify-center mb-8">
                        <div class="circle"></div><div class="circle"></div><div class="circle"></div>
                    </div>
                    <h3 class="text-xl font-bold mb-2">ОЖИДАНИЕ ИГРОКА</h3>
                    <p class="text-zinc-500 text-sm">Ваш стол опубликован в канале.<br>Не закрывайте страницу.</p>
                    <div class="mt-6 p-3 bg-black/50 rounded font-mono text-[10px] text-zinc-400">ID: ${Network.id}</div>
                </div>
            `;
        };
    },

    simulateLobby() {
        const list = document.getElementById('server-list');
        // Моковые данные (в идеале тянутся из API/TG)
        const mockServers = [
            { id: '4a1b...', bet: 500, players: '1/2' },
            { id: '9f2c...', bet: 1000, players: '1/2' },
            { id: '2d4e...', bet: 100, players: '1/2' }
        ];

        setTimeout(() => {
            list.innerHTML = '';
            mockServers.forEach(srv => {
                const item = document.createElement('div');
                item.className = "bg-white/5 border border-white/5 p-4 rounded-xl flex items-center justify-between hover:bg-white/10 transition-all cursor-pointer group";
                item.innerHTML = `
                    <div>
                        <div class="text-[10px] text-zinc-500 font-mono">${srv.id}</div>
                        <div class="text-lg font-bold text-green-400">${srv.bet} ₽</div>
                    </div>
                    <button class="px-4 py-2 bg-zinc-800 group-hover:bg-yellow-500 group-hover:text-black rounded-lg text-xs font-bold transition-all">ВХОД</button>
                `;
                item.onclick = () => {
                    // В реальности здесь будет реальный ID из TG
                    alert("Для подключения используйте прямую ссылку из Telegram канала.");
                };
                list.appendChild(item);
            });
        }, 1500);
    },

    startGame() {
        document.getElementById('modal-container').classList.add('hidden');
        document.getElementById('screen-welcome').classList.add('hidden');
        document.getElementById('screen-game').classList.remove('hidden');
        
        if (Network.isHost) {
            Game.initDeck();
            this.distributeCards();
            this.syncGameState();
        }
    },

    distributeCards() {
        // Визуальная раздача 6 карт
        for(let i=0; i<6; i++) {
            Game.hand.push(Game.deck.pop());
        }
        this.renderPlayerHand();
        this.renderDeck();
    },

    renderPlayerHand() {
        const container = document.getElementById('player-hand');
        container.innerHTML = '';
        Game.hand.forEach((card, index) => {
            const cardEl = Game.createCardUI(card);
            cardEl.style.zIndex = index;
            cardEl.style.marginLeft = index === 0 ? '0' : '-40px';
            cardEl.onclick = () => this.tryPlayCard(card, index);
            container.appendChild(cardEl);
        });
    },

    renderDeck() {
        document.getElementById('deck-count').innerText = Game.deck.length;
        const trumpSlot = document.getElementById('trump-slot');
        trumpSlot.innerHTML = '';
        if (Game.trump) {
            const trumpEl = Game.createCardUI(Game.trump);
            trumpEl.classList.add('scale-75', 'rotate-90');
            trumpSlot.appendChild(trumpEl);
        }
    },

    tryPlayCard(card, index) {
        console.log("Playing card:", card);
        // Здесь будет логика проверки возможности хода
        // И отправка через Network.send('MOVE', card);
    },

    syncGameState() {
        Network.send('SYNC', {
            deck: Game.deck,
            trump: Game.trump,
            turn: Game.myTurn
        });
    },

    handleNetworkData(data) {
        console.log("NET DATA:", data);
        if (data.type === 'SYNC') {
            Game.deck = data.payload.deck;
            Game.trump = data.payload.trump;
            this.distributeCards();
        }
    }
};

App.init();