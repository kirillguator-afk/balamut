/**
 * Главный контроллер приложения
 */
const UI = {
    loader: document.getElementById('loader'),
    main: document.getElementById('main-app'),
    screens: {
        welcome: document.getElementById('screen-welcome'),
        game: document.getElementById('screen-game')
    },
    modal: document.getElementById('modal-container'),
    modalContent: document.getElementById('modal-content'),
    playerHand: document.getElementById('player-hand'),
    opponentHand: document.getElementById('opponent-hand'),
    trumpCard: document.getElementById('trump-card')
};

// Initialization
window.addEventListener('DOMContentLoaded', async () => {
    // Simulate loading
    setTimeout(async () => {
        UI.loader.classList.add('opacity-0');
        setTimeout(() => {
            UI.loader.style.display = 'none';
            UI.main.classList.remove('hidden');
        }, 1000);

        await P2P.init();
    }, 2000);
});

// Create Game Logic
document.getElementById('btn-create-game').addEventListener('click', () => {
    showModal(`
        <div class="text-center">
            <h4 class="text-xl font-bold text-yellow-500 mb-4">СОЗДАНИЕ СТОЛА</h4>
            <div class="mb-6">
                <label class="block text-xs text-zinc-500 mb-2 uppercase">Ставка (RUB)</label>
                <input type="number" id="bet-input" value="100" class="w-full bg-black border border-white/10 rounded-lg p-3 text-center text-xl font-mono focus:border-yellow-500 outline-none">
            </div>
            <button id="btn-confirm-create" class="w-full py-3 bg-yellow-500 text-black font-bold rounded-lg mb-3">ОПУБЛИКОВАТЬ В TG</button>
            <p class="text-[10px] text-zinc-600">ID: ${P2P.myId}</p>
        </div>
    `);

    document.getElementById('btn-confirm-create').onclick = async () => {
        const bet = document.getElementById('bet-input').value;
        document.getElementById('btn-confirm-create').disabled = true;
        document.getElementById('btn-confirm-create').innerText = 'ПУБЛИКАЦИЯ...';
        
        await TelegramAPI.publishGame(P2P.myId, bet);
        
        UI.modalContent.innerHTML = `
            <div class="text-center py-8">
                <div class="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <h4 class="text-lg font-bold">ОЖИДАНИЕ ИГРОКА</h4>
                <p class="text-sm text-zinc-400 mt-2">Ваше приглашение отправлено в канал METRO CASH</p>
            </div>
        `;
    };
});

// Join Game Logic
document.getElementById('btn-join-modal').addEventListener('click', () => {
    showModal(`
        <div class="text-center">
            <h4 class="text-xl font-bold text-white mb-4">ПОДКЛЮЧЕНИЕ</h4>
            <input type="text" id="join-id-input" placeholder="Введите ID комнаты" class="w-full bg-black border border-white/10 rounded-lg p-3 text-center mb-4 focus:border-blue-500 outline-none">
            <button id="btn-confirm-join" class="w-full py-3 bg-white text-black font-bold rounded-lg">ВОЙТИ В ИГРУ</button>
        </div>
    `);

    document.getElementById('btn-confirm-join').onclick = () => {
        const id = document.getElementById('join-id-input').value;
        if (id) {
            P2P.connect(id);
            showModal(`<div class="text-center py-8"><p>Подключение к ${id}...</p></div>`);
        }
    };
});

// Modal Helper
function showModal(html) {
    UI.modalContent.innerHTML = html;
    UI.modal.classList.remove('hidden');
    UI.modal.classList.add('flex');
}

window.onclick = (e) => {
    if (e.target == UI.modal) UI.modal.classList.add('hidden');
};

// Game Start Handler
window.onGameStart = () => {
    UI.modal.classList.add('hidden');
    UI.screens.welcome.classList.add('hidden');
    UI.screens.game.classList.remove('hidden');
    
    // Инициализация колоды хостом
    initGameBoard();
};

window.onOpponentJoined = () => {
    // Вызывается у хоста, когда кто-то подключился
    window.onGameStart();
    P2P.send('GAME_INIT', { msg: 'Ready to play' });
};

function initGameBoard() {
    GameCore.createDeck();
    
    // Отрисовка козыря
    const trump = GameCore.deck[0];
    UI.trumpCard.innerHTML = '';
    UI.trumpCard.appendChild(GameCore.createCardElement(trump));

    // Раздача (визуальная)
    for(let i=0; i<6; i++) {
        const card = GameCore.deck.pop();
        const cardEl = GameCore.createCardElement(card);
        cardEl.style.animationDelay = `${i * 0.1}s`;
        cardEl.classList.add('animate-draw');
        UI.playerHand.appendChild(cardEl);

        const oppCard = GameCore.createCardElement(null, true);
        UI.opponentHand.appendChild(oppCard);
    }

    document.getElementById('cards-count').innerText = GameCore.deck.length;
}

// P2P Message Handling
P2P.onMessage((data) => {
    switch(data.type) {
        case 'GAME_INIT':
            console.log('Game initialized by host');
            break;
        case 'CARD_PLAYED':
            // Logic for showing opponent's card
            break;
    }
});