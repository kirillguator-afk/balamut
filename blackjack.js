/**
 * METRO BLACKJACK - Казино Движок (v2.5)
 */
const blackjack = {
    deck: [],
    player: [],
    dealer: [],
    bet: 0,
    isPlaying: false,

    addBet(val) {
        if (this.isPlaying) return;
        if (app.balance < val) return app.notify("Недостаточно средств", "error");
        this.bet += val;
        app.balance -= val;
        app.updateUI();
        utils.playSound('bet');
        document.getElementById('btn-bj-start').innerText = `РАЗДАТЬ (${this.bet} ₽)`;
    },

    clearBet() {
        if (this.isPlaying) return;
        app.balance += this.bet;
        this.bet = 0;
        app.updateUI();
        document.getElementById('btn-bj-start').innerText = `РАЗДАТЬ (0 ₽)`;
    },

    start() {
        if (this.bet === 0) return app.notify("Сделайте ставку", "info");
        this.isPlaying = true;
        this.initDeck();
        this.player = [this.draw(), this.draw()];
        this.dealer = [this.draw(), this.draw()];
        
        document.getElementById('bj-bet-controls').classList.add('hidden');
        document.getElementById('bj-play-controls').classList.remove('hidden');
        document.getElementById('btn-bj-start').classList.add('hidden');
        
        this.render();
        if (this.getScore(this.player) === 21) this.stand();
    },

    initDeck() {
        const ranks = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
        const suits = ['hearts','diamonds','clubs','spades'];
        this.deck = [];
        // 4 колоды (Шуз)
        for(let i=0; i<4; i++) {
            suits.forEach(s => ranks.forEach(r => {
                let v = parseInt(r) || 10;
                if(r === 'A') v = 11;
                this.deck.push({ suit: s, rank: r, val: v });
            }));
        }
        utils.shuffle(this.deck);
    },

    draw() { return this.deck.pop(); },

    getScore(hand) {
        let s = hand.reduce((a,b) => a + b.val, 0);
        let aces = hand.filter(c => c.rank === 'A').length;
        while(s > 21 && aces > 0) { s -= 10; aces--; }
        return s;
    },

    hit() {
        this.player.push(this.draw());
        utils.playSound('card');
        this.render();
        if (this.getScore(this.player) > 21) this.end('lose');
    },

    async stand() {
        while(this.getScore(this.dealer) < 17) {
            this.dealer.push(this.draw());
            this.render();
            utils.playSound('card');
            await new Promise(r => setTimeout(r, 600));
        }
        
        const ps = this.getScore(this.player);
        const ds = this.getScore(this.dealer);
        
        if (ds > 21 || ps > ds) this.end('win');
        else if (ps < ds) this.end('lose');
        else this.end('push');
    },

    render() {
        const pC = document.getElementById('bj-player-cards');
        const dC = document.getElementById('bj-dealer-cards');
        pC.innerHTML = ''; dC.innerHTML = '';

        this.player.forEach(c => pC.appendChild(durak.createCardUI(c)));
        this.dealer.forEach((c, i) => {
            if (i === 1 && this.isPlaying) {
                const back = document.createElement('div');
                back.className = 'card back';
                dC.appendChild(back);
            } else {
                dC.appendChild(durak.createCardUI(c));
            }
        });

        document.getElementById('bj-player-score').innerText = this.getScore(this.player);
        document.getElementById('bj-dealer-score').innerText = this.isPlaying ? '?' : this.getScore(this.dealer);
    },

    end(res) {
        this.isPlaying = false;
        let m = "";
        if (res === 'win') {
            const payout = this.getScore(this.player) === 21 && this.player.length === 2 ? 2.5 : 2;
            app.balance += this.bet * payout;
            m = "WINNER! +"+(this.bet * payout);
            utils.spawnCoins();
        } else if (res === 'push') {
            app.balance += this.bet;
            m = "PUSH (RETURN)";
        } else {
            m = "DEALER WINS";
        }

        document.getElementById('bj-msg').innerText = m;
        app.updateUI();
        app.haptic('notif', res === 'win' ? 'success' : 'error');

        setTimeout(() => {
            this.bet = 0;
            this.player = []; this.dealer = [];
            document.getElementById('bj-msg').innerText = "Сделайте ставку";
            document.getElementById('bj-bet-controls').classList.remove('hidden');
            document.getElementById('bj-play-controls').classList.add('hidden');
            document.getElementById('btn-bj-start').classList.remove('hidden');
            document.getElementById('btn-bj-start').innerText = `РАЗДАТЬ (0 ₽)`;
            this.render();
        }, 3000);
    }
};

document.getElementById('btn-bj-hit').onclick = () => blackjack.hit();
document.getElementById('btn-bj-stand').onclick = () => blackjack.stand();
document.getElementById('btn-bj-start').onclick = () => blackjack.start();