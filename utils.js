/**
 * METRO UTILS - Audio & Visual Effects
 */
const utils = {
    audioCtx: null,

    getSuitIcon(suit) {
        const icons = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
        return icons[suit];
    },

    playSound(type) {
        if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        
        if (type === 'card') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(400, this.audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(200, this.audioCtx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.1);
            osc.start(); osc.stop(this.audioCtx.currentTime + 0.1);
        }

        if (type === 'bet') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(800, this.audioCtx.currentTime);
            gain.gain.setValueAtTime(0.05, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.05);
            osc.start(); osc.stop(this.audioCtx.currentTime + 0.05);
        }
    },

    spawnCoins() {
        const canvas = document.getElementById('coin-canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        const coins = [];
        for (let i = 0; i < 50; i++) {
            coins.push({
                x: Math.random() * canvas.width,
                y: -50 - Math.random() * 200,
                r: 5 + Math.random() * 10,
                s: 2 + Math.random() * 5,
                rot: Math.random() * Math.PI
            });
        }

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#fbbf24';
            let active = false;
            coins.forEach(c => {
                if (c.y < canvas.height) {
                    active = true;
                    c.y += c.s;
                    c.rot += 0.1;
                    ctx.save();
                    ctx.translate(c.x, c.y);
                    ctx.rotate(c.rot);
                    ctx.beginPath();
                    ctx.ellipse(0, 0, c.r, c.r/2, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
            });
            if (active) requestAnimationFrame(animate);
        }
        animate();
    }
};