/**
 * Главный контроллер приложения METRO CASH
 */
const App = {
    async init() {
        // 1. Убираем лоадер
        setTimeout(() => {
            document.getElementById('loader').classList.add('opacity-0');
            setTimeout(() => {
                document.getElementById('loader').style.display = 'none';
                const main = document.getElementById('main-app');
                main.classList.remove('hidden');
                setTimeout(() => main.classList.add('opacity-100'), 50);
            }, 700);
        }, 1500);

        // 2. Инициализируем сеть
        await Network.init();

        // 3. Проверка авто-подключения (если в ссылке есть #ID)
        const targetId = window.location.hash.replace('#', '');
        if (targetId && targetId.length > 5) {
            Network.connect(targetId);
        }

        this.bindUI();
        this.renderFakeLobby();
    },

    bindUI() {
        document.getElementById('btn-create-game').onclick = () => this.createGame();
        
        window.addEventListener('game_start', () => {
            document.getElementById('screen-welcome').classList.add('hidden');
            document.getElementById('modal-container').classList.add('hidden');
            document.getElementById('screen-game').classList.remove('hidden');
            
            if (Network.isHost) {
                Game.createDeck();
                this.dealCards();
                this.sync();
            }
        });

        window.addEventListener('game_data', (e) => this.handleData(e.detail));

        document.getElementById('btn-game-action').onclick = () => this.handleMainAction();
    },

    createGame() {
        const modal = document.getElementById('modal-container');
        const content = document.getElementById('modal-content');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        content.innerHTML = `
            <div class="text-center">
                <h2 class="text-xl font-bold text-yellow-500 mb-4 tracking-widest">ОТКРЫТЫЙ ЭФИР</h2>
                <div class="py-6 border-y border-white/5 mb-6">
                    <p class="text-xs text-zinc-500 mb-2">ВАША СТАНЦИЯ:</p>
                    <code class="text-lg text-white bg-black px-4 py-2 rounded">${Network.id}</code>
                </div>
                <button id="send-to-tg" class="w-full py-4 bg-yellow-500 text-black font-bold rounded-xl mb-4">ОПУБЛИКОВАТЬ В TG</button>
                <p class="text-[10px] text-zinc-600">Ожидайте, пока кто-то подключится...</p>
            </div>
        `;

        document.getElementById('send-to-tg').onclick = async () => {
            document.getElementById('send-to-tg').innerText = "ОТПРАВЛЕНО";
            document.getElementById('send-to-tg').disabled = true;
            await TelegramAPI.publishGame(Network.id, 100);
        };
    },

    dealCards() {
        // Раздаем 6 карт себе
        for(let i=0; i<6; i++) Game.hand.push(Game.deck.pop());
        Game.myTurn = true;
        this.updateTable();
    },

    updateTable() {
        // Рендер руки
        const handEl = document.getElementById('player-hand');
        handEl.innerHTML = '';
        Game.hand.forEach((card, index) => {
            const el = Game.createCardUI(card);
            el.onclick = () => this.playCard(index);
            handEl.appendChild(el);
        });

        // Рендер козыря
        const trumpEl = document.getElementById('trump-slot');
        trumpEl.innerHTML = '';
        if (Game.trump) trumpEl.appendChild(Game.createCardUI(Game.trump));

        // Рендер стола
        const tableEl = document.getElementById('table-cards');
        tableEl.innerHTML = '';
        Game.table.forEach(pair => {
            const pairDiv = document.createElement('div');
            pairDiv.className = 'relative w-24 h-36';
            
            const att = Game.createCardUI(pair.attack);
            att.className += ' absolute inset-0';
            pairDiv.appendChild(att);

            if (pair.defense) {
                const def = Game.createCardUI(pair.defense);
                def.className += ' absolute inset-0 translate-x-4 translate-y-4 z-10';
                pairDiv.appendChild(def);
            }
            tableEl.appendChild(pairDiv);
        });

        document.getElementById('deck-count').innerText = Game.deck.length;
        document.getElementById('current-action').innerText = Game.myTurn ? "ВАШ ХОД" : "ХОД ПРОТИВНИКА";
        document.getElementById('btn-game-action').innerText = Game.isDefender ? "ВЗЯТЬ" : "БИТО";
    },

    playCard(index) {
        if (!Game.myTurn) return;
        
        const card = Game.hand[index];
        
        if (!Game.isDefender) {
            // Атака
            Game.hand.splice(index, 1);
            Game.table.push({ attack: card, defense: null });
            Network.send('MOVE', { attack: card });
            Game.myTurn = false;
        } else {
            // Защита: ищем последнюю небитую карту
            const lastPair = Game.table[Game.table.length - 1];
            if (lastPair && !lastPair.defense && Game.canBeat(lastPair.attack, card)) {
                Game.hand.splice(index, 1);
                lastPair.defense = card;
                Network.send('DEFEND', { defense: card });
                Game.myTurn = false;
            }
        }
        this.updateTable();
    },

    handleMainAction() {
        if (!Game.myTurn) return;
        if (Game.isDefender) {
            // Взять все карты
            Network.send('TAKE_ALL', {});
            this.endTurn(true);
        } else {
            // Бито
            Network.send('BITO', {});
            this.endTurn(false);
        }
    },

    endTurn(tookCards) {
        // Логика завершения хода и добора
        // В упрощенном тесте просто переключаем роли
        Game.isDefender = !Game.isDefender;
        this.updateTable();
    },

    sync() {
        Network.send('INIT', {
            deck: Game.deck,
            trump: Game.trump,
            turn: false
        });
    },

    handleData(data) {
        if (data.type === 'INIT') {
            Game.deck = data.payload.deck;
            Game.trump = data.payload.trump;
            Game.isDefender = true; // Кто зашел, тот защищается
            // Добор из общей колоды (которую хост прислал)
            for(let i=0; i<6; i++) Game.hand.push(Game.deck.pop());
            this.updateTable();
        }
        
        if (data.type === 'MOVE') {
            Game.table.push({ attack: data.payload.attack, defense: null });
            Game.myTurn = true;
            this.updateTable();
        }

        if (data.type === 'DEFEND') {
            Game.table[Game.table.length - 1].defense = data.payload.defense;
            Game.myTurn = true;
            this.updateTable();
        }

        if (data.type === 'BITO') {
            Game.table = [];
            Game.myTurn = true;
            Game.isDefender = false;
            this.updateTable();
        }
    },

    renderFakeLobby() {
        const list = document.getElementById('server-list');
        list.innerHTML = `
            <div class="p-3 bg-white/5 border border-white/5 rounded-lg flex justify-between items-center opacity-50">
                <div><p class="text-xs font-mono">system_test</p><p class="text-green-500 font-bold">500 ₽</p></div>
                <button disabled class="text-[10px] bg-zinc-800 px-3 py-1 rounded">FULL</button>
            </div>
            <p class="text-[9px] text-center text-zinc-600 mt-4 uppercase">Подключитесь по прямой ссылке друга</p>
        `;
    }
};

App.init();