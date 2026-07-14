/**
 * METRO BLACKJACK - Казино Движок
 */
const blackjack = {
    deck: [],
    playerHand: [],
    dealerHand: [],
    currentBet: 0,
    isPlaying: false,

    addBet(amount) {
        if (app.balance < amount) return app.notify("НЕДОСТАТОЧНО СРЕДСТВ", "error");
        this.currentBet += amount;
        app.balance -= amount;
        app.updateUI();
        app.haptic('impact', 'medium');
        utils.playSound('bet');
        document.getElementById('btn-bj-start').innerText = `РАЗДАТЬ (${this.currentBet} ₽)`;
    },

    clearBet() {
        app.balance += this.currentBet;
        this.currentBet = 0;
        app.updateUI();
        document.getElementById('btn-bj-start').innerText = `РАЗДАТЬ (0 ₽)`;
    },

    initDeck() {
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        this.deck = [];
        for (let i = 0; i < 4; i++) { // 4 decks
            suits.forEach(s => {
                ranks.forEach(r => {
                    let val = parseInt(r);
                    if (['J', 'Q', 'K'].includes(r)) val = 10;
                    if (r === 'A') val = 11;
                    this.deck.push({ suit: s, rank: r, val: val });
                });
            });
        }
        durak.shuffle(this.deck);
    },

    async start() {
        if (this.currentBet === 0) return app.notify("СДЕЛАЙТЕ СТАВКУ", "error");
        this.isPlaying = true;
        this.initDeck();
        this.playerHand = [this.deck.pop(), this.deck.pop()];
        this.dealerHand = [this.deck.pop(), this.deck.pop()];
        
        document.getElementById('bj-bet-controls').classList.add('hidden');
        document.getElementById('btn-bj-start').classList.add('hidden');
        document.getElementById('bj-play-controls').classList.remove('hidden');
        
        this.render();
        this.checkInitial();
    },

    render() {
        const pCont = document.getElementById('bj-player-cards');
        const dCont = document.getElementById('bj-dealer-cards');
        pCont.innerHTML = ''; dCont.innerHTML = '';

        this.playerHand.forEach(c => pCont.appendChild(durak.createCardUI(c)));
        
        this.dealerHand.forEach((c, i) => {
            if (i === 1 && this.isPlaying) {
                dCont.appendChild(durak.createCardUI(c, true));
            } else {
                dCont.appendChild(durak.createCardUI(c));
            }
        });

        document.getElementById('bj-player-score').innerText = this.getScore(this.playerHand);
        if (!this.isPlaying) {
            document.getElementById('bj-dealer-score').innerText = this.getScore(this.dealerHand);
        }
    },

    getScore(hand) {
        let score = hand.reduce((a, b) => a + b.val, 0);
        let aces = hand.filter(c => c.rank === 'A').length;
        while (score > 21 && aces > 0) {
            score -= 10;
            aces--;
        }
        return score;
    },

    async checkInitial() {
        if (this.getScore(this.playerHand) === 21) this.end(true, true);
    },

    async hit() {
        this.playerHand.push(this.deck.pop());
        utils.playSound('card');
        this.render();
        if (this.getScore(this.playerHand) > 21) this.end(false);
    },

    async stand() {
        this.isPlaying = false;
        this.render();
        // Dealer AI
        while (this.getScore(this.dealerHand) < 17) {
            await new Promise(r => setTimeout(r, 600));
            this.dealerHand.push(this.deck.pop());
            utils.playSound('card');
            this.render();
        }
        
        const p = this.getScore(this.playerHand);
        const d = this.getScore(this.dealerHand);
        
        if (d > 21 || p > d) this.end(true);
        else if (p === d) this.end('push');
        else this.end(false);
    },

    end(result, bj = false) {
        this.isPlaying = false;
        let msg = "";
        if (result === true) {
            const win = bj ? this.currentBet * 2.5 : this.currentBet * 2;
            app.balance += win;
            msg = bj ? "BLACKJACK! 🏆" : "ПОБЕДА! 💰";
            utils.spawnCoins();
            app.haptic('notif', 'success');
        } else if (result === 'push') {
            app.balance += this.currentBet;
            msg = "НИЧЬЯ 🤝";
        } else {
            msg = "ПЕРЕБОР 💀";
            app.haptic('notif', 'error');
        }

        document.getElementById('bj-msg').innerText = msg;
        app.updateUI();
        
        setTimeout(() => {
            this.currentBet = 0;
            document.getElementById('bj-msg').innerText = "Сделайте ставку";
            document.getElementById('bj-bet-controls').classList.remove('hidden');
            document.getElementById('btn-bj-start').classList.remove('hidden');
            document.getElementById('btn-bj-start').innerText = `РАЗДАТЬ (0 ₽)`;
            document.getElementById('bj-play-controls').classList.add('hidden');
            this.render();
        }, 3000);
    }
};

document.getElementById('btn-bj-start').onclick = () => blackjack.start();
document.getElementById('btn-bj-hit').onclick = () => blackjack.hit();
document.getElementById('btn-bj-stand').onclick = () => blackjack.stand();