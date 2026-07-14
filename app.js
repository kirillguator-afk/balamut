/**
 * METRO CASH - Production Controller (v2.6)
 */
const app = {
    balance: 5000,
    tg: window.Telegram.WebApp,
    currentView: 'hub',
    user: { name: 'Player', id: 0 },
    // ТГ Конфиг
    botToken: '8575086263:AAG74PmRjUT8ExtDkC_kOxfYfmss2BG0C_A',
    channelId: '-1005458983067',

    init() {
        this.tg.expand();
        this.tg.ready();

        if (this.tg.initDataUnsafe?.user) {
            this.user.name = this.tg.initDataUnsafe.user.first_name;
            this.user.id = this.tg.initDataUnsafe.user.id;
            document.getElementById('user-name').innerText = this.user.name;
        }

        const saved = localStorage.getItem(`metro_balance_${this.user.id}`);
        if (saved) this.balance = parseFloat(saved);
        this.updateUI();

        p2p.init();
        this.tg.BackButton.onClick(() => this.switchView('hub'));
        
        this.refreshLobbies();
        this.notify("Metro Cash: Системы онлайн", "success");
    },

    updateUI() {
        document.getElementById('user-balance').innerText = `${Math.floor(this.balance).toLocaleString()} ₽`;
        localStorage.setItem(`metro_balance_${this.user.id}`, this.balance);
    },

    switchView(viewId) {
        if (this.currentView === viewId) return;
        const oldView = document.getElementById(`view-${this.currentView}`);
        const newView = document.getElementById(`view-${viewId}`);

        oldView.classList.remove('active');
        setTimeout(() => oldView.classList.add('hidden'), 500);

        newView.classList.remove('hidden');
        setTimeout(() => newView.classList.add('active'), 50);

        this.currentView = viewId;
        this.currentView === 'hub' ? this.tg.BackButton.hide() : this.tg.BackButton.show();
        this.haptic('impact', 'light');
    },

    notify(text, type = 'info') {
        const container = document.getElementById('notif-container');
        const el = document.createElement('div');
        const border = { info: 'border-blue-500', error: 'border-red-500', success: 'border-emerald-500' }[type];

        el.className = `glass-panel border-l-4 ${border} text-white px-5 py-4 rounded-2xl shadow-2xl text-[10px] font-black tracking-widest animate-in pointer-events-auto`;
        el.innerText = text.toUpperCase();
        container.appendChild(el);
        setTimeout(() => {
            el.style.opacity = '0';
            el.style.transform = 'translateX(20px)';
            setTimeout(() => el.remove(), 500);
        }, 4000);
    },

    haptic(type, style) {
        try {
            if (type === 'impact') this.tg.HapticFeedback.impactOccurred(style);
            if (type === 'notif') this.tg.HapticFeedback.notificationOccurred(style);
        } catch(e) {}
    },

    toggleWallet() {
        const modal = document.getElementById('modal-wallet');
        modal.classList.toggle('hidden');
    },

    reqRefill(amount) {
        this.balance += amount;
        this.updateUI();
        this.haptic('notif', 'success');
        this.notify(`Баланс +${amount} ₽`, 'success');
        this.toggleWallet();
        utils.spawnCoins();
    },

    /**
     * Создает лобби и отправляет в ТГ
     */
    async createLobby(mode) {
        if (!p2p.myId) return this.notify("Сеть не готова", "error");
        const bet = parseInt(prompt("Введите ставку (RUB):", "100"));
        if (!bet || bet < 10) return this.notify("Некорректная ставка", "error");
        if (this.balance < bet) return this.notify("Недостаточно средств", "error");

        this.notify("Публикация линии...", "info");
        
        const gameUrl = `https://t.me/share/url?url=https://metro-cash.app/%23${p2p.myId}`;
        const text = encodeURIComponent(
            `🔴 НОВАЯ ЛИНИЯ: ${mode}\n` +
            `💰 Ставка: ${bet} ₽\n` +
            `👤 Игрок: ${this.user.name}\n` +
            `🆔 Станция: ${p2p.myId.substring(0,8)}`
        );

        try {
            // Отправка через Bot API в канал
            await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: this.channelId,
                    text: `🔴 <b>НОВАЯ ЛИНИЯ: ${mode}</b>\n💰 Ставка: <b>${bet} ₽</b>\n👤 Игрок: ${this.user.name}\n\n<i>Нажми кнопку ниже, чтобы войти!</i>`,
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [[{ text: "🕹 ИГРАТЬ", url: `https://t.me/metro_cash_bot/app?startapp=${p2p.myId}` }]]
                    }
                })
            });

            this.notify("Линия опубликована!", "success");
            
            // Если Дурак - настраиваем движок
            if (mode === 'DURAK') {
                durak.gameState.bet = bet;
                this.balance -= bet;
                this.updateUI();
                this.notify("Ожидание оппонента...", "info");
            }
        } catch(e) {
            this.notify("Ошибка публикации", "error");
        }
    },

    refreshLobbies() {
        const list = document.getElementById('lobby-list');
        // Мок-данные для примера, в реальности тут должен быть fetch из вашей БД или парсинг канала
        const mocks = [{ mode: 'DURAK', bet: 100, host: 'Metro Agent', id: 'SYSTEM' }];
        list.innerHTML = mocks.map(l => `
            <div class="glass-panel p-4 rounded-2xl flex justify-between items-center metro-btn opacity-50">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center">🃏</div>
                    <div>
                        <div class="text-xs font-black uppercase">${l.host}</div>
                        <div class="text-[9px] text-zinc-500 font-bold">DURAK | 1x1</div>
                    </div>
                </div>
                <div class="text-emerald-500 font-bold">${l.bet} ₽</div>
            </div>
        `).join('');
    }
};

window.onload = () => app.init();