/**
 * METRO CASH - Core Application Controller
 */
const app = {
    balance: 1000,
    tg: window.Telegram.WebApp,
    currentView: 'hub',
    
    init() {
        this.tg.expand();
        this.tg.ready();
        
        // Load Balance
        const saved = localStorage.getItem('metro_rub_balance');
        if (saved) this.balance = parseFloat(saved);
        this.updateUI();
        
        // Set User Info
        if (this.tg.initDataUnsafe?.user) {
            document.getElementById('user-name').innerText = this.tg.initDataUnsafe.user.first_name;
            // Avatar fallback logic could be here
        }

        // Initialize Net
        p2p.init();
        
        // Haptic check
        this.haptic('impact', 'medium');
        
        // Handle Back Button
        this.tg.BackButton.onClick(() => {
            if (this.currentView !== 'hub') this.switchView('hub');
        });
    },

    updateUI() {
        document.getElementById('user-balance').innerText = `${this.balance.toLocaleString()} ₽`;
        localStorage.setItem('metro_rub_balance', this.balance);
    },

    switchView(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(`view-${viewId}`).classList.remove('hidden');
        setTimeout(() => {
            document.getElementById(`view-${viewId}`).classList.add('active');
            // Hide other views after transition
            document.querySelectorAll('.view:not(.active)').forEach(v => v.classList.add('hidden'));
        }, 50);

        this.currentView = viewId;
        if (viewId === 'hub') {
            this.tg.BackButton.hide();
        } else {
            this.tg.BackButton.show();
        }
        this.haptic('impact', 'light');
    },

    notify(text, type = 'info') {
        const container = document.getElementById('notif-container');
        const el = document.createElement('div');
        const colors = {
            info: 'bg-zinc-800 border-l-4 border-blue-500',
            error: 'bg-zinc-800 border-l-4 border-red-500',
            success: 'bg-emerald-900 border-l-4 border-emerald-500'
        };
        el.className = `${colors[type]} text-white px-4 py-3 rounded-xl shadow-2xl text-[10px] font-bold animate-in flex items-center justify-between pointer-events-auto`;
        el.innerHTML = `<span>${text.toUpperCase()}</span>`;
        container.appendChild(el);
        setTimeout(() => el.remove(), 3500);
    },

    haptic(type, style) {
        if (this.tg.HapticFeedback) {
            if (type === 'impact') this.tg.HapticFeedback.impactOccurred(style);
            if (type === 'notif') this.tg.HapticFeedback.notificationOccurred(style);
        }
    },

    toggleWallet() {
        const modal = document.getElementById('modal-wallet');
        modal.classList.toggle('hidden');
    },

    reqRefill(amount) {
        this.haptic('notif', 'success');
        this.balance += amount; // Simulation
        this.updateUI();
        this.notify(`БАЛАНС ПОПОЛНЕН НА ${amount} ₽`, 'success');
        this.toggleWallet();
        utils.spawnCoins();
    }
};

window.onload = () => app.init();