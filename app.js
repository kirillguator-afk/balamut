/**
 * Главный контроллер METRO CASH
 */
const App = {
    async init() {
        // Убираем лоадер с задержкой для красоты
        setTimeout(() => {
            document.getElementById('loader').classList.add('opacity-0');
            setTimeout(() => {
                document.getElementById('loader').style.display = 'none';
                const main = document.getElementById('main-app');
                main.classList.remove('hidden');
                setTimeout(() => main.classList.add('opacity-100'), 50);
            }, 700);
        }, 1200);

        await Network.init();

        // Если в URL есть ID — подключаемся сразу
        const hashId = window.location.hash.replace('#', '');
        if (hashId && hashId.length > 5) {
            Network.connect(hashId);
        }

        this.bindUI();
    },

    bindUI() {
        document.getElementById('btn-create-game').onclick = () => this.showCreateMenu();
        
        window.addEventListener('p2p_ready', () => {
            document.getElementById('screen-welcome').classList.add('hidden');
            document.getElementById('modal-container').classList.add('hidden');
            document.getElementById('screen-game').classList.remove('hidden');
            
            if (Network.isHost) {
                Game.createDeck();
                this.initialDeal();
                this.syncGame();
            }
        });

        window.addEventListener('p2p_data', (e) => this.handlePacket(e.detail));
        document.getElementById('btn-game-action').onclick = () => this.onAction();
    },

    showCreateMenu() {
        const modal = document.getElementById('modal-container');
        const content = document.getElementById('modal-content');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        content.innerHTML = `
            <div class="text-center">
                <h2 class="text-2xl font-bold text-yellow-500 mb-6 font-['Orbitron']">НОВЫЙ СТОЛ</h2>
                <div class="bg-black/40 border border-white/5 rounded-2xl p-6 mb-6">
                    <p class="text-[10px] text-zinc-500 uppercase mb-2 font-mono">Станция ID</p>
                    <code class="text-white text-lg tracking-widest">${Network.id}</code>
                </div>
                <button id="pub-tg" class="w-full py-4 bg-yellow-500 text-black font-bold rounded-xl mb-4">ОПУБЛИКОВАТЬ В КАНАЛ</button>
                <div class="text-[10px] text-zinc-500 font-mono animate-pulse">ОЖИДАНИЕ ПАССАЖИРА...</div>
            </div>
        `;

        document.getElementById('pub-tg').onclick = async () => {
            const btn = document.getElementById('pub-tg');
            btn.disabled = true;
            btn.innerText = "ОТПРАВЛЕНО";
            await TelegramAPI.publishGame(Network.id, 500);
        };
    },

    initialDeal() {
        // Хост раздает 6 карт себе
        for(let i=0; i<6; i++) Game.hand.push(Game.deck.pop());
        Game.myTurn = true;
        this.renderTable();
    },

    renderTable() {
        const hand = document.getElementById('player-hand');
        hand.innerHTML = '';
        Game.hand.forEach((card, idx) => {
            const el = Game.createCardUI(card);
            el.style.marginLeft = idx === 0 ? '0' : '-60px';
            el.onclick = () => this.playCard(idx);
            hand.appendChild(el);
        });

        const trump = document.getElementById('trump-slot');
        trump.innerHTML = '';
        if (Game.trump) trump.appendChild(Game.createCardUI(Game.trump));

        document.getElementById('deck-count-badge').innerText = Game.deck.length;
        document.getElementById('current-action').innerText = Game.myTurn ? "ВАШ ХОД" : "ХОД ПРОТИВНИКА";
        
        // Рендер стола
        const table = document.getElementById('table-cards');
        table.innerHTML = '';
        Game.table.forEach(pair => {
            const wrap = document.createElement('div');
            wrap.className = 'relative w-24 h-36';
            const att = Game.createCardUI(pair.attack);
            att.className += ' absolute inset-0 scale-75';
            wrap.appendChild(att);
            if (pair.defense) {
                const def = Game.createCardUI(pair.defense);
                def.className += ' absolute inset-0 scale-75 translate-x-4 translate-y-4 z-10';
                wrap.appendChild(def);
            }
            table.appendChild(wrap);
        });
    },

    playCard(idx) {
        if (!Game.myTurn) return;
        const card = Game.hand[idx];
        
        if (!Game.isDefender) {
            // Атака
            Game.table.push({ attack: card, defense: null });
            Game.hand.splice(idx, 1);
            Network.send('MOVE', { card });
            Game.myTurn = false;
        } else {
            // Защита
            const last = Game.table[Game.table.length - 1];
            if (last && !last.defense && Game.canBeat(last.attack, card)) {
                last.defense = card;
                Game.hand.splice(idx, 1);
                Network.send('DEFEND', { card });
                Game.myTurn = false;
            }
        }
        this.renderTable();
    },

    onAction() {
        if (!Game.myTurn) return;
        if (Game.isDefender) {
            Network.send('TAKE', {});
            // Логика взятия
        } else {
            Network.send('BITO', {});
            Game.table = [];
            Game.myTurn = false;
        }
        this.renderTable();
    },

    syncGame() {
        Network.send('SYNC', {
            deck: Game.deck,
            trump: Game.trump
        });
    },

    handlePacket(p) {
        if (p.type === 'SYNC') {
            Game.deck = p.payload.deck;
            Game.trump = p.payload.trump;
            Game.isDefender = true;
            for(let i=0; i<6; i++) Game.hand.push(Game.deck.pop());
            this.renderTable();
        }
        if (p.type === 'MOVE') {
            Game.table.push({ attack: p.payload.card, defense: null });
            Game.myTurn = true;
            this.renderTable();
        }
        if (p.type === 'DEFEND') {
            Game.table[Game.table.length-1].defense = p.payload.card;
            Game.myTurn = true;
            this.renderTable();
        }
        if (p.type === 'BITO') {
            Game.table = [];
            Game.myTurn = true;
            Game.isDefender = false;
            this.renderTable();
        }
    }
};

App.init();