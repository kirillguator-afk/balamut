/**
 * METRO CASH - Main Application Controller (v2.5)
 */
const app = {
    balance: 1000,
    tg: window.Telegram.WebApp,
    currentView: 'hub',
    user: { name: 'Player', id: 0 },

    init() {
        this.tg.expand();
        this.tg.ready();
        this.tg.headerColor = '#030712';
        this.tg.backgroundColor = '#030712';

        // Load Data
        if (this.tg.initDataUnsafe?.user) {
            this.user.name = this.tg.initDataUnsafe.user.first_name;
            this.user.id = this.tg.initDataUnsafe.user.id;
            document.getElementById('user-name').innerText = this.user.name;
        }

        const saved = localStorage.getItem(`metro_balance_${this.user.id}`);
        if (saved) this.balance = parseFloat(saved);
        this.updateUI();

        // Sub-systems init
        p2p.init();
        
        // Listeners
        this.tg.BackButton.onClick(() => this.switchView('hub'));
        
        // Matchmaking simulation (Parsing TG)
        this.refreshLobbies();
        setInterval(() => this.refreshLobbies(), 30000);

        this.notify("Система METRO CASH активирована", "success");
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
        const border = {
            info: 'border-blue-500',
            error: 'border-red-500',
            success: 'border-emerald-500'
        }[type];

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
        this.haptic('impact', 'medium');
    },

    reqRefill(amount) {
        this.balance += amount;
        this.updateUI();
        this.haptic('notif', 'success');
        this.notify(`Баланс пополнен: +${amount} ₽`, 'success');
        this.toggleWallet();
        utils.spawnCoins();
        utils.playSound('bet');
    },

    async refreshLobbies() {
        const list = document.getElementById('lobby-list');
        // Simulated parsing of Telegram channel active offers
        const mockLobbies = [
            { mode: 'DURAK', bet: 500, host: 'Aleksey', id: 'TEST_ID_1' },
            { mode: 'BLACKJACK', bet: 1000, host: 'Dmitry', id: 'TEST_ID_2' }
        ];

        list.innerHTML = mockLobbies.map(lobby => `
            <div onclick="p2p.connect('${lobby.id}')" class="glass-panel p-4 rounded-2xl flex justify-between items-center metro-btn cursor-pointer">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-lg">
                        ${lobby.mode === 'DURAK' ? '🃏' : '🎰'}
                    </div>
                    <div>
                        <div class="text-xs font-black tracking-tighter uppercase">${lobby.host}</div>
                        <div class="text-[9px] text-zinc-500 font-bold uppercase">${lobby.mode} | P2P</div>
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-emerald-500 font-['Orbitron'] text-sm font-bold">${lobby.bet} ₽</div>
                    <div class="text-[8px] text-zinc-600 font-bold uppercase tracking-widest">Присоединиться</div>
                </div>
            </div>
        `).join('');
    }
};

window.onload = () => app.init();